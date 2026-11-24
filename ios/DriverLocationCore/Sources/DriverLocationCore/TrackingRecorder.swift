import Foundation

/// What the platform layer reads when tracking starts, so the recorder knows the state it begins in.
public struct DeviceSnapshot: Equatable {
    public var appForeground: Bool
    public var gpsOn: Bool
    /// Nil = not known yet (the connectivity monitor has not delivered its first reading): no connection event is made of it; the
    /// first real reading arrives through `connectivity(online:networkType:)` like any change.
    public var online: Bool?
    /// `cellular` | `wifi` | `other` | `none`: the type in use when online, the last one seen otherwise.
    public var networkType: String
    public var batterySaver: Bool
    public var permission: PermissionState

    public init(appForeground: Bool, gpsOn: Bool, online: Bool?, networkType: String, batterySaver: Bool, permission: PermissionState) {
        self.appForeground = appForeground
        self.gpsOn = gpsOn
        self.online = online
        self.networkType = networkType
        self.batterySaver = batterySaver
        self.permission = permission
    }
}

/// What the location adapter (`LocationTracker`) tells the recorder, each a small mapping from an OS signal.
public protocol TrackingSignalSink: AnyObject {
    /// Location Services switched on / off.
    func gps(on: Bool)
    /// The app's authorization or precision is now `permission`.
    func permission(_ permission: PermissionState)
    /// The OS marked a fix as simulated.
    func mock(provider: String?)
    /// The module is alive (a fix arrived).
    func heartbeat()
}

/// The events recorder (docs/LOCATION_MODULE.md, "Tracking events"): turns what the platform layer detects (a switch of the
/// location services, of the connection, of the battery saver, of the app's state or authorization, a simulated fix, a start or a
/// stop of tracking) into stamped `TrackingEvent`s and hands them to `sink`. It knows no iOS API: the platform layer maps each OS
/// signal to one call below. A port of the Kotlin `TrackingRecorder`; the rules are the same.
///
/// - **Only while tracking**: from `start` (its `tracking_started` included) to `stop` (its `tracking_stopped` included).
///   Detectors call it freely; outside a session the calls change nothing (but `appForeground(_:)` is always remembered).
/// - **Time**: `occurred_at` is the wall clock at detection; the debounce delays the event, not its time. `duration_ms` of a
///   closing event is measured with the monotonic clock when this process saw the condition open; otherwise (the process was
///   killed in between) from the two wall times, the opening one persisted in `store`.
/// - **Debounce**: a change of the four boolean conditions (location services, connection, battery saver, app in background) is
///   held `debounce` (2 s); the opposite change inside the window cancels both, so a flapping signal yields no pair.
///   Permission, mock and tracking events are not debounced. A `stop` settles what is held first (a held change that still differs
///   from the recorded state is emitted with its own time, before `tracking_stopped`), so every opening has its closing event and no
///   duration is measured across a lost one. `cancel` (the recorder switched off) emits nothing: the next `start` reconciles.
/// - **A stop by the system**: while a session lives the heartbeat and an "active" flag are persisted; if `start` finds the flag
///   still set it first emits `tracking_stopped` with reason `system` and `occurred_at` = the heartbeat, then `tracking_started`
///   with reason `restart`. A session of another owner is none of ours: nothing is emitted.
/// - **At the start**: a condition that is bad and not recorded as open (services off, no connection, battery saver on) opens at the
///   start's time; one recorded as open that is good now closes (the duration from the persisted opening); a changed authorization
///   is reported from the persisted one to the present. Starting in the background is remembered silently.
///
/// Every public method may be called from any thread: the work runs on the worker (`post`: the sender's serial queue), so events are
/// stored in order behind what was already queued.
public final class TrackingRecorder: TrackingSignalSink {
    /// A change that is undone inside this window yields no event.
    public static let debounce: TimeInterval = 2
    /// The module's life sign is refreshed at least this often while a session lives.
    public static let heartbeatEvery: TimeInterval = 60
    /// The heartbeat of a fix is written to disk at most this often (ms).
    public static let heartbeatSaveMs: Int64 = 15_000
    /// `mock_location_detected` at most once per this (ms), and once per session at least.
    public static let mockMinGapMs: Int64 = 600_000

    private enum Condition: String, CaseIterable {
        case gps = "gps_off"
        case offline = "offline"
        case battery = "battery_saver"
        case background = "background"

        var opening: String {
            switch self {
            case .gps: return EventNames.turnOffGps
            case .offline: return EventNames.turnOffMobileData
            case .battery: return EventNames.batterySaverOn
            case .background: return EventNames.setAppInBackground
            }
        }

        var closing: String {
            switch self {
            case .gps: return EventNames.turnOnGps
            case .offline: return EventNames.turnOnMobileData
            case .battery: return EventNames.batterySaverOff
            case .background: return EventNames.setAppInForeground
            }
        }
    }

    private struct Pending {
        let bad: Bool
        let wall: Int64
        let mono: Int64
        let appForeground: Bool
        let extra: [EventField]
        let timer: Cancellable
        /// Which `desire` made it: a timer that already fired and posted its `fire` before the pending was replaced must not take
        /// the replacement (which has its own wait still to run).
        let token: Int
    }

    private let platform: String
    private let scheduler: Scheduler
    private let store: RecorderStore
    private let sink: (TrackingEvent) -> Void
    private let post: (@escaping () -> Void) -> Void
    private let wallClock: () -> Int64
    private let monotonicClock: () -> Int64
    private let newUUID: () -> String
    private let debounceInterval: TimeInterval
    private let heartbeatInterval: TimeInterval
    private let onLog: (String) -> Void

    // Worker only.
    private var active = false
    private var state = RecorderState()
    private var appFg = true
    private var sessionStartMono: Int64 = 0
    private var openMono: [String: Int64] = [:]
    private var pending: [Condition: Pending] = [:]
    private var nextToken = 0
    private var mockLastMono: Int64?
    private var heartbeatTimer: Cancellable?
    private var lastHeartbeatSavedWall: Int64 = 0

    private let activeLock = NSLock()
    private var activeMirror = false

    /// True between `start` and `stop` (any thread; read after the call returned and the worker ran).
    public var isActive: Bool { activeLock.lock(); defer { activeLock.unlock() }; return activeMirror }

    /// - Parameters:
    ///   - sink: receives each event on the worker (`LocationSender.recordOnWorker`).
    ///   - post: runs a block on the worker (`LocationSender.performOnWorker`; a test passes `{ $0() }`).
    ///   - wallClock / monotonicClock: epoch ms and a monotonic ms clock; they default to the scheduler's.
    public init(platform: String = "ios", scheduler: Scheduler, store: RecorderStore,
                sink: @escaping (TrackingEvent) -> Void,
                post: @escaping (@escaping () -> Void) -> Void,
                wallClock: (() -> Int64)? = nil,
                monotonicClock: (() -> Int64)? = nil,
                newUUID: @escaping () -> String = TrackingEvent.newUUID,
                debounce: TimeInterval = TrackingRecorder.debounce,
                heartbeatEvery: TimeInterval = TrackingRecorder.heartbeatEvery,
                onLog: @escaping (String) -> Void = { _ in }) {
        self.platform = platform
        self.scheduler = scheduler
        self.store = store
        self.sink = sink
        self.post = post
        self.wallClock = wallClock ?? { [scheduler] in Int64((scheduler.now.timeIntervalSince1970 * 1000).rounded(.down)) }
        self.monotonicClock = monotonicClock ?? { [scheduler] in Int64((scheduler.monotonic * 1000).rounded(.down)) }
        self.newUUID = newUUID
        self.debounceInterval = debounce
        self.heartbeatInterval = heartbeatEvery
        self.onLog = onLog
    }

    // MARK: - Public API (any thread)

    /// Tracking started. `owner` is `Config.eventsOwner`; `reason` one of `TrackingReasons` (replaced by `restart` when a session of
    /// this owner was left without a stop).
    public func start(owner: String, reason: String?, device: DeviceSnapshot) {
        post { self.doStart(owner: owner, reason: reason, device: device) }
    }

    /// Tracking stopped; `reason` one of `TrackingReasons`. Ignored when no session is active.
    public func stop(reason: String?) {
        post { self.doStop(reason: reason) }
    }

    /// Events were switched off while the session lives (the project config): nothing more is recorded, no event is sent for it, the
    /// persisted "active" flag is cleared so a later kill is not reported as a stop by the system.
    public func cancel() {
        post { self.doCancel() }
    }

    /// A session of this `owner` was left without a stop (the process died) and nobody will `start` again now (the permission is gone,
    /// the driver is off shift): emits the owed `tracking_stopped` with reason `reason` (`system`, or `permission`) at the heartbeat's
    /// time, then the authorization change if `permission` differs from the persisted one. Nothing when there is no such session.
    public func closeOrphan(owner: String, reason: String?, permission: PermissionState?) {
        post { self.doCloseOrphan(owner: owner, reason: reason, permission: permission) }
    }

    /// The app came to the foreground (true) or left it (false). Always remembered; an event only while tracking.
    public func appForeground(_ foreground: Bool) {
        post {
            self.appFg = foreground
            if self.active { self.desire(.background, bad: !foreground) }
        }
    }

    public func gps(on: Bool) {
        post { if self.active { self.desire(.gps, bad: !on) } }
    }

    /// The connection came back (`online`, `networkType` the one in use) or was lost (`networkType` the one lost).
    public func connectivity(online: Bool, networkType: String) {
        post { if self.active { self.desire(.offline, bad: !online, extra: [EventField("network_type", networkType)]) } }
    }

    public func batterySaver(on: Bool) {
        post { if self.active { self.desire(.battery, bad: on) } }
    }

    public func permission(_ permission: PermissionState) {
        post { if self.active { self.doPermission(permission, wall: self.wallClock()) } }
    }

    public func mock(provider: String?) {
        post { if self.active { self.doMock(provider) } }
    }

    public func heartbeat() {
        post { if self.active { self.doHeartbeat(force: false) } }
    }

    // MARK: - Worker side

    private func setActive(_ value: Bool) {
        active = value
        activeLock.lock(); activeMirror = value; activeLock.unlock()
    }

    private func doStart(owner: String, reason: String?, device: DeviceSnapshot) {
        if active { return } // a second start while running changes nothing
        let wall = wallClock()
        let mono = monotonicClock()
        var saved = store.load()
        if saved.owner != owner {
            saved = RecorderState(owner: owner) // nothing of another driver's session is ours
            openMono.removeAll()
        }
        state = saved
        appFg = device.appForeground
        var startReason = TrackingReasons.startReason(reason)
        if state.active {
            // The last session never ended cleanly: the process was killed or terminated. It stopped when it was last alive.
            let last = state.heartbeatWall ?? state.sessionStartWall ?? wall
            let ran = state.sessionStartWall.map { max(0, last - $0) }
            emit(EventNames.trackingStopped, wall: min(last, wall), duration: ran, extra: [EventField("reason", TrackingReasons.system)], appForeground: appFg)
            onLog("tracking stopped by the system (no clean stop)")
            startReason = TrackingReasons.restart
        }
        state.active = true
        state.sessionStartWall = wall
        state.heartbeatWall = wall
        setActive(true)
        sessionStartMono = mono
        mockLastMono = nil
        lastHeartbeatSavedWall = wall
        persist()
        emit(EventNames.trackingStarted, wall: wall, duration: nil, extra: [EventField("reason", startReason)], appForeground: appFg)

        reconcile(.gps, bad: !device.gpsOn, wall: wall, mono: mono, extra: [])
        if let online = device.online {
            reconcile(.offline, bad: !online, wall: wall, mono: mono, extra: [EventField("network_type", device.networkType)])
        }
        reconcile(.battery, bad: device.batterySaver, wall: wall, mono: mono, extra: [])
        reconcileBackground(!device.appForeground, wall: wall, mono: mono)
        doPermission(device.permission, wall: wall)
        persist()
        scheduleHeartbeat()
    }

    private func doStop(reason: String?) {
        guard active else { return }
        let wall = wallClock()
        let mono = monotonicClock()
        // What is still held is settled first: dropping it would lose the opening or the closing of a pair and every later
        // duration would be measured across the lost event.
        settlePending()
        emit(EventNames.trackingStopped, wall: wall, duration: max(0, mono - sessionStartMono),
             extra: [EventField("reason", TrackingReasons.stopReason(reason))], appForeground: appFg)
        // The event is in the queue before the flag says "stopped cleanly".
        setActive(false)
        state.active = false
        state.heartbeatWall = wall
        persist()
    }

    private func doCancel() {
        guard active else { return }
        clearTimers()
        setActive(false)
        state.active = false
        persist()
    }

    private func doCloseOrphan(owner: String, reason: String?, permission: PermissionState?) {
        if active { return }
        let saved = store.load()
        guard saved.owner == owner, saved.active else { return }
        let wall = wallClock()
        let last = min(saved.heartbeatWall ?? saved.sessionStartWall ?? wall, wall)
        let ran = saved.sessionStartWall.map { max(0, last - $0) }
        state = saved
        emit(EventNames.trackingStopped, wall: last, duration: ran, extra: [EventField("reason", TrackingReasons.stopReason(reason))], appForeground: appFg)
        onLog("tracking stopped by the system (no clean stop), reported without a restart")
        state.active = false
        if let permission = permission { doPermission(permission, wall: wall, force: true) }
        persist()
    }

    private func clearTimers() {
        for p in pending.values { p.timer.cancel() }
        pending.removeAll()
        heartbeatTimer?.cancel()
        heartbeatTimer = nil
    }

    private func doPermission(_ now: PermissionState, wall: Int64, force: Bool = false) {
        let before = state.permission
        state.permission = now
        guard let previous = before, previous != now else {
            if before != now { persist() }
            return
        }
        guard active || force else { return }
        emit(EventNames.locationPermissionChanged, wall: wall, duration: nil, extra: [
            EventField("from", previous.authorization), EventField("to", now.authorization),
            EventField("precise_from", previous.precise), EventField("precise_to", now.precise)
        ], appForeground: appFg)
        persist()
    }

    private func doMock(_ provider: String?) {
        let mono = monotonicClock()
        if let last = mockLastMono, mono - last < TrackingRecorder.mockMinGapMs { return }
        mockLastMono = mono
        var extra: [EventField] = []
        if let provider = provider, !provider.isEmpty { extra.append(EventField("provider", provider)) }
        emit(EventNames.mockLocationDetected, wall: wallClock(), duration: nil, extra: extra, appForeground: appFg)
    }

    private func doHeartbeat(force: Bool) {
        let wall = wallClock()
        state.heartbeatWall = wall
        if force || wall - lastHeartbeatSavedWall >= TrackingRecorder.heartbeatSaveMs || wall < lastHeartbeatSavedWall {
            lastHeartbeatSavedWall = wall
            persist()
        }
    }

    private func scheduleHeartbeat() {
        heartbeatTimer?.cancel()
        heartbeatTimer = scheduler.schedule(after: heartbeatInterval) { [weak self] in
            guard let self = self else { return }
            self.post {
                self.heartbeatTimer = nil
                if self.active {
                    self.doHeartbeat(force: true)
                    self.scheduleHeartbeat()
                }
            }
        }
    }

    /// The end of a session settles every held change: one whose condition still differs from the last recorded state is emitted now
    /// with its own detection time and monotonic mark (oldest first, then in the order of `Condition`, so the queue keeps the order of the times); one that went back to
    /// the recorded state was cancelled by `desire` already (a flap: no pair).
    private func settlePending() {
        let order = Condition.allCases
        let held = pending.sorted { a, b in
            a.value.wall != b.value.wall ? a.value.wall < b.value.wall : order.firstIndex(of: a.key)! < order.firstIndex(of: b.key)!
        }
        clearTimers()
        for (c, p) in held where p.bad != (state.open[c.rawValue] != nil) {
            transition(c, bad: p.bad, wall: p.wall, mono: p.mono, extra: p.extra, appForeground: p.appForeground)
        }
    }

    // MARK: - Conditions

    /// The condition now reads `bad`. When a pending change says the same nothing changes; the opposite of the emitted state starts the wait.
    private func desire(_ c: Condition, bad: Bool, extra: [EventField] = []) {
        let isOpen = state.open[c.rawValue] != nil
        let waiting = pending[c]
        if bad == isOpen {
            // Back to what the server was told: whatever was waiting was a flap, no pair.
            if let waiting = waiting {
                waiting.timer.cancel()
                pending[c] = nil
            }
            return
        }
        if let waiting = waiting, waiting.bad == bad { return }
        waiting?.timer.cancel()
        nextToken += 1
        let token = nextToken
        let timer = scheduler.schedule(after: debounceInterval) { [weak self] in
            guard let self = self else { return }
            self.post { self.fire(c, token: token) }
        }
        pending[c] = Pending(bad: bad, wall: wallClock(), mono: monotonicClock(), appForeground: c == .background ? !bad : appFg,
                             extra: extra, timer: timer, token: token)
    }

    private func fire(_ c: Condition, token: Int) {
        guard let held = pending[c], held.token == token else { return } // replaced or settled since this timer fired
        guard let p = pending.removeValue(forKey: c), active else { return }
        transition(c, bad: p.bad, wall: p.wall, mono: p.mono, extra: p.extra, appForeground: p.appForeground)
    }

    private func transition(_ c: Condition, bad: Bool, wall: Int64, mono: Int64, extra: [EventField], appForeground: Bool) {
        var duration: Int64?
        if bad {
            state.open[c.rawValue] = wall
            openMono[c.rawValue] = mono
        } else {
            // The monotonic clock when this process saw it open; else the two wall times (the opening one persisted).
            if let opened = openMono.removeValue(forKey: c.rawValue) {
                duration = max(0, mono - opened)
            } else if let opened = state.open[c.rawValue] {
                duration = max(0, wall - opened)
            }
            state.open[c.rawValue] = nil
        }
        persist()
        emit(bad ? c.opening : c.closing, wall: wall, duration: duration, extra: extra, appForeground: appForeground)
    }

    private func reconcile(_ c: Condition, bad: Bool, wall: Int64, mono: Int64, extra: [EventField]) {
        let isOpen = state.open[c.rawValue] != nil
        if bad != isOpen { transition(c, bad: bad, wall: wall, mono: mono, extra: extra, appForeground: appFg) }
    }

    private func reconcileBackground(_ background: Bool, wall: Int64, mono: Int64) {
        let isOpen = state.open[Condition.background.rawValue] != nil
        if !background && isOpen {
            transition(.background, bad: false, wall: wall, mono: mono, extra: [], appForeground: true)
        } else if background && !isOpen {
            // Started in the background: no event (the state at the start is not one), but remembered so that the
            // `set_app_in_foreground` that follows has its duration.
            state.open[Condition.background.rawValue] = wall
            openMono[Condition.background.rawValue] = mono
        }
    }

    // MARK: - Output

    private func emit(_ name: String, wall: Int64, duration: Int64?, extra: [EventField], appForeground: Bool) {
        var data = [EventField("platform", platform), EventField("app_state", appForeground ? "foreground" : "background")]
        data.append(contentsOf: extra)
        sink(TrackingEvent(uuid: newUUID(), event: name, occurredAtMs: wall, durationMs: duration, data: data))
    }

    private func persist() {
        store.save(state)
    }
}
