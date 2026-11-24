import Foundation

/// The whole core wired together: this is what the React Native TurboModule glue talks to.
///
/// `configure` -> `start` / `stop` -> `state()`; a second `configure` (a new token) replaces the
/// headers of the running sender without restarting the location updates.
///
/// The events recorder (docs/LOCATION_MODULE.md, "Tracking events") lives here: it starts with `start` when the configuration has an
/// events url, hears the connectivity monitor, the location tracker and the device signals (app state, Low Power Mode) while tracking,
/// feeds the sender's events lane, and stops with `stop`. A `stop` with no session running reports a session the process left without
/// a stop (`TrackingRecorder.closeOrphan`).
public final class DriverLocationService {
    public weak var delegate: LocationEventDelegate? {
        didSet { sender.delegate = delegate }
    }

    /// Hears the events lane (the log lines of the events).
    public weak var eventsListener: EventsListener? {
        didSet { sender.eventsListener = eventsListener }
    }

    public let sender: LocationSender
    public let tracker: LocationTracker
    public let recorder: TrackingRecorder
    private let manager: LocationManaging
    private let connectivity: ConnectivityMonitoring
    private let signals: DeviceSignalSource
    private let lock = NSLock()
    private var config: Config?
    /// `start` gave the recorder a session (the events url was set); only `stop` or `configure` without the url ends it.
    private var recorderStarted = false
    private var lastStartReason: String?

    /// - Parameters:
    ///   - queueDirectory: folder for the persisted queues and the recorder's state.
    ///   - isReleaseBuild: `true` in release builds (`#if DEBUG` decides in the app target): simulated fixes are dropped.
    ///   - onLog: the recorder's own log lines (`tracking stopped by the system (no clean stop)`).
    public init(queueDirectory: URL,
                isReleaseBuild: Bool,
                manager: LocationManaging,
                transport: HTTPTransport = URLSessionTransport(),
                connectivity: ConnectivityMonitoring = NetworkPathMonitor(),
                scheduler: Scheduler = DispatchScheduler(),
                signals: DeviceSignalSource = SystemDeviceSignals(),
                recorderStore: RecorderStore? = nil,
                onLog: @escaping (String) -> Void = { _ in }) {
        let sender = LocationSender(queueDirectory: queueDirectory, transport: transport, scheduler: scheduler,
                                    mockPolicy: MockPolicy(isReleaseBuild: isReleaseBuild))
        self.sender = sender
        self.manager = manager
        self.recorder = TrackingRecorder(scheduler: scheduler,
                                         store: recorderStore ?? FileRecorderStore(directory: queueDirectory),
                                         sink: { [weak sender] event in sender?.recordOnWorker(event) },
                                         post: { [weak sender] work in sender?.performOnWorker(work) },
                                         onLog: onLog)
        tracker = LocationTracker(manager: manager, sink: sender, now: { scheduler.now })
        tracker.signals = recorder
        self.connectivity = connectivity
        self.signals = signals
        connectivity.onRestored = { [weak sender] in
            sender?.delegate?.onNetworkRestored()
            sender?.connectivityRestored()
        }
        connectivity.onChange = { [weak self] online, type in
            self?.recorder.connectivity(online: online, networkType: type)
        }
        signals.onAppForeground = { [weak self] foreground in self?.recorder.appForeground(foreground) }
        signals.onBatterySaver = { [weak self] on in self?.recorder.batterySaver(on: on) }
        // A 401 ends the recorder's session before JavaScript hears about it.
        sender.revokedHook = { [weak self] in self?.recorder.stop(reason: TrackingReasons.sessionRevoked) }
    }

    @discardableResult
    public func configure(_ newConfig: Config) -> LocationState {
        lock.lock()
        config = newConfig
        let recording = recorderStarted
        let reason = lastStartReason
        lock.unlock()
        sender.configure(newConfig)
        if tracker.isRunning {
            tracker.updateDistanceFilter(newConfig.distanceFilter)
            // The project's switch changed while tracking runs: the recorder joins, or leaves without an event.
            if let owner = newConfig.eventsOwner, !recording {
                startRecorder(owner: owner, reason: reason)
            } else if newConfig.eventsOwner == nil, recording {
                lock.lock(); recorderStarted = false; lock.unlock()
                recorder.cancel()
                signals.stop()
            }
        }
        return sender.state()
    }

    /// No-op until `configure` was called. `reason` is the `tracking_started` reason (`available` | `schedule` | `login` | `restart`).
    @discardableResult
    public func start(reason: String? = nil) -> LocationState {
        lock.lock(); let current = config; lastStartReason = reason; let recording = recorderStarted; lock.unlock()
        guard let current = current else { return sender.state() }
        sender.start()
        connectivity.start() // before the recorder's snapshot reads it
        if let owner = current.eventsOwner, !recording { startRecorder(owner: owner, reason: reason) }
        tracker.start(distanceFilter: current.distanceFilter)
        return sender.state()
    }

    /// `reason` is the `tracking_stopped` reason (`unavailable` | `logout` | `schedule` | `permission` | `session_revoked` | `unknown`).
    /// With no session running it reports one the process left without a stop, with this reason.
    @discardableResult
    public func stop(reason: String? = nil) -> LocationState {
        tracker.stop()
        connectivity.stop()
        signals.stop()
        lock.lock()
        let owner = config?.eventsOwner
        let recording = recorderStarted
        recorderStarted = false
        lock.unlock()
        if let owner = owner {
            if recording {
                recorder.stop(reason: reason)
            } else {
                recorder.closeOrphan(owner: owner, reason: reason,
                                     permission: PermissionMapper.state(manager.authorization, precise: manager.preciseLocation))
            }
        }
        sender.stop()
        return sender.state()
    }

    public func state() -> LocationState { return sender.state() }

    public func flush() { sender.flush() }

    // MARK: - Recorder

    private func startRecorder(owner: String, reason: String?) {
        lock.lock(); recorderStarted = true; lock.unlock()
        let device = signals.start()
        // The monitor runs before the snapshot is taken (`start()` starts it first) and was cleared at the last stop, so `current` is
        // either this session's reading or nil ("not known yet": no connection event is made of it; the first real reading arrives
        // through `onChange` like any change).
        let path = connectivity.current
        recorder.start(owner: owner, reason: reason,
                       device: DeviceSnapshot(appForeground: device.appForeground,
                                              gpsOn: manager.servicesEnabled,
                                              online: path?.online,
                                              networkType: path?.networkType ?? "none",
                                              batterySaver: device.batterySaver,
                                              permission: PermissionMapper.state(manager.authorization, precise: manager.preciseLocation)))
        // A reading that arrived after the snapshot was taken but before the recorder's start was posted would be dropped (the
        // recorder is not active yet): say it again behind the start, which keeps the worker's order. Saying it twice changes nothing.
        if path == nil, let late = connectivity.current {
            recorder.connectivity(online: late.online, networkType: late.networkType)
        }
    }
}
