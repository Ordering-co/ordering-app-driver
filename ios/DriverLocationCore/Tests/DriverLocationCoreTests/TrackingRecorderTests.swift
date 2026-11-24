import XCTest
@testable import DriverLocationCore

private let OWNER = testURL + "\n" + eventsTestURL
private let T0: Int64 = 1_795_046_400_000 // 2026-11-19 00:00:00 UTC
private let ALWAYS = PermissionState(authorization: "always", precise: true)

/// One "process": a scheduler (its monotonic clock starts over), the wall clock the test can jump, the sink. The store outlives it.
private final class Rig {
    let sched = ManualScheduler()
    let store: RecorderStore
    private let base: Date
    private var offset: Int64 = 0
    var out: [TrackingEvent] = []
    var logs: [String] = []
    private var n = 0
    var rec: TrackingRecorder!

    var mono: Int64 { return Int64((sched.now.timeIntervalSince(base) * 1000).rounded()) }
    var wall: Int64 { return mono + offset }

    init(_ store: RecorderStore, wall: Int64 = T0, platform: String = "android", debounce: TimeInterval = 2, newUUID: Bool = false) {
        self.store = store
        base = sched.now
        offset = wall
        rec = TrackingRecorder(platform: platform, scheduler: sched, store: store, sink: { [unowned self] in self.out.append($0) },
                               post: { $0() }, wallClock: { [unowned self] in self.wall }, monotonicClock: { [unowned self] in self.mono },
                               newUUID: newUUID ? TrackingEvent.newUUID : { [unowned self] in self.n += 1; return "uuid-\(self.n)" },
                               debounce: debounce, onLog: { [unowned self] in self.logs.append($0) })
    }

    func jumpWall(_ ms: Int64) { offset += ms }
    func advance(_ ms: Int64) {
        let target = sched.now.addingTimeInterval(Double(ms) / 1000)
        while let work = sched.popDue(upTo: target) { work() }
        sched.now = target
    }
    var names: [String] { return out.map { $0.event } }
    func of(_ name: String) -> [TrackingEvent] { return out.filter { $0.event == name } }
    func clear() { out.removeAll() }
    func value(_ e: TrackingEvent, _ key: String) -> EventValue? { return e.data.first { $0.key == key }?.value }
    func keys(_ e: TrackingEvent) -> [String] { return e.data.map { $0.key } }
}

private func device(fg: Bool = true, gps: Bool = true, online: Bool = true, type: String = "wifi", saver: Bool = false,
                    permission: PermissionState = ALWAYS) -> DeviceSnapshot {
    return DeviceSnapshot(appForeground: fg, gpsOn: gps, online: online, networkType: type, batterySaver: saver, permission: permission)
}

private func started(_ store: RecorderStore = MemoryRecorderStore(), wall: Int64 = T0, reason: String = "available", d: DeviceSnapshot = device()) -> Rig {
    let r = Rig(store, wall: wall)
    r.rec.start(owner: OWNER, reason: reason, device: d)
    r.clear()
    return r
}

final class TrackingRecorderTests: XCTestCase {
    // MARK: - Started / stopped

    func testStartEmitsTrackingStartedWithTheReasonAndTheCommonData() {
        let r = Rig(MemoryRecorderStore())
        r.rec.start(owner: OWNER, reason: "login", device: device())
        let e = r.out[0]
        XCTAssertEqual(r.out.count, 1)
        XCTAssertEqual(e.event, "tracking_started")
        XCTAssertEqual(e.occurredAtMs, T0)
        XCTAssertNil(e.durationMs)
        XCTAssertEqual(e.data, [EventField("platform", "android"), EventField("app_state", "foreground"), EventField("reason", "login")])
        XCTAssertEqual(e.uuid, "uuid-1")
        XCTAssertTrue(r.rec.isActive)
    }

    func testAnUnknownOrMissingStartReasonIsAvailable() {
        let r = Rig(MemoryRecorderStore())
        r.rec.start(owner: OWNER, reason: "whatever", device: device())
        XCTAssertEqual(r.value(r.out[0], "reason"), .string("available"))
        let s = Rig(MemoryRecorderStore())
        s.rec.start(owner: OWNER, reason: nil, device: device())
        XCTAssertEqual(s.value(s.out[0], "reason"), .string("available"))
    }

    func testStopEmitsTrackingStoppedWithTheMonotonicDuration() {
        let r = started()
        r.advance(90_000)
        r.jumpWall(5_000) // the wall clock moved too: the duration is the monotonic one
        r.rec.stop(reason: "unavailable")
        let e = r.out[0]
        XCTAssertEqual(e.event, "tracking_stopped")
        XCTAssertEqual(e.durationMs, 90_000)
        XCTAssertEqual(r.value(e, "reason"), .string("unavailable"))
        XCTAssertEqual(e.occurredAtMs, T0 + 95_000)
        XCTAssertFalse(r.rec.isActive)
    }

    func testAnUnknownOrMissingStopReasonIsUnknown() {
        let r = started()
        r.rec.stop(reason: "nope")
        XCTAssertEqual(r.value(r.out[0], "reason"), .string("unknown"))
        let s = started()
        s.rec.stop(reason: nil)
        XCTAssertEqual(s.value(s.out[0], "reason"), .string("unknown"))
    }

    func testNothingIsRecordedBeforeTheStartOrAfterTheStop() {
        let r = Rig(MemoryRecorderStore())
        r.rec.gps(on: false); r.rec.connectivity(online: false, networkType: "wifi"); r.rec.batterySaver(on: true); r.rec.mock(provider: nil)
        r.rec.permission(PermissionState(authorization: "denied", precise: false)); r.rec.appForeground(false)
        r.advance(10_000)
        XCTAssertEqual(r.names, [])
        r.rec.start(owner: OWNER, reason: "available", device: device(fg: false)); r.clear()
        r.rec.stop(reason: "logout"); r.clear()
        r.rec.gps(on: false); r.rec.connectivity(online: false, networkType: "wifi"); r.rec.batterySaver(on: true); r.rec.mock(provider: nil)
        r.rec.appForeground(true); r.rec.stop(reason: "logout")
        r.advance(10_000)
        XCTAssertEqual(r.names, [])
    }

    func testASecondStartWhileRunningAndAStopWhenIdleChangeNothing() {
        let r = Rig(MemoryRecorderStore())
        r.rec.start(owner: OWNER, reason: "available", device: device()); r.rec.start(owner: OWNER, reason: "login", device: device())
        XCTAssertEqual(r.names, ["tracking_started"])
        let idle = Rig(MemoryRecorderStore())
        idle.rec.stop(reason: "logout")
        XCTAssertEqual(idle.names, [])
    }

    func testTheDataSaysBackgroundWhenTheAppIsInTheBackgroundAndThePlatformIsWrittenAsIs() {
        let r = Rig(MemoryRecorderStore(), platform: "ios")
        r.rec.start(owner: OWNER, reason: "available", device: device(fg: false))
        XCTAssertEqual(r.value(r.out[0], "app_state"), .string("background"))
        XCTAssertEqual(r.value(r.out[0], "platform"), .string("ios"))
    }

    // MARK: - The conditions: time, duration, debounce

    func testGpsOffAndOnAreStampedWhenDetectedAndTheDurationIsMonotonic() {
        let r = started()
        r.advance(10_000)
        r.rec.gps(on: false)
        XCTAssertEqual(r.names, [], "held for the debounce")
        r.advance(2_000)
        let off = r.out[0]
        XCTAssertEqual(r.out.count, 1)
        XCTAssertEqual(off.event, "turn_off_gps")
        XCTAssertEqual(off.occurredAtMs, T0 + 10_000, "detection time, not the debounce's end")
        XCTAssertNil(off.durationMs)
        r.clear()
        r.advance(180_000)
        r.rec.gps(on: true)
        r.jumpWall(60_000) // a wall clock correction while it waits does not change the duration
        r.advance(2_000)
        let on = r.out[0]
        XCTAssertEqual(on.event, "turn_on_gps")
        XCTAssertEqual(on.occurredAtMs, T0 + 192_000, "the detection's wall time")
        XCTAssertEqual(on.durationMs, 182_000, "from the opening's detection to the closing's")
    }

    func testAFlapInsideTheDebounceYieldsNoPair() {
        let r = started()
        r.rec.gps(on: false)
        r.advance(1_900)
        r.rec.gps(on: true)
        r.advance(10_000)
        XCTAssertEqual(r.names, [])
        // and the same for the closing side: off for good, then on and off again inside 2 s
        r.rec.gps(on: false); r.advance(2_000)
        XCTAssertEqual(r.names, ["turn_off_gps"])
        r.clear()
        r.rec.gps(on: true); r.advance(500)
        r.rec.gps(on: false); r.advance(10_000)
        XCTAssertEqual(r.names, [], "still off, no turn_on_gps")
        r.rec.gps(on: true); r.advance(2_000)
        XCTAssertEqual(r.names, ["turn_on_gps"])
    }

    func testRepeatedReadingsOfTheSameStateAreNoChange() {
        let r = started()
        r.rec.gps(on: true); r.rec.connectivity(online: true, networkType: "wifi"); r.rec.batterySaver(on: false); r.rec.appForeground(true)
        r.advance(10_000)
        XCTAssertEqual(r.names, [])
        r.rec.gps(on: false); r.rec.gps(on: false); r.rec.gps(on: false); r.advance(5_000)
        XCTAssertEqual(r.names, ["turn_off_gps"])
    }

    func testConnectivityLostAndRestoredCarryTheNetworkType() {
        let r = started(d: device(type: "wifi"))
        r.advance(1_000)
        r.rec.connectivity(online: false, networkType: "wifi"); r.advance(2_000)
        let off = r.out[0]
        XCTAssertEqual(off.event, "turn_off_mobile_data")
        XCTAssertEqual(r.value(off, "network_type"), .string("wifi"))
        XCTAssertEqual(off.occurredAtMs, T0 + 1_000)
        r.clear()
        r.advance(60_000)
        r.rec.connectivity(online: true, networkType: "cellular"); r.advance(2_000)
        let on = r.out[0]
        XCTAssertEqual(on.event, "turn_on_mobile_data")
        XCTAssertEqual(r.value(on, "network_type"), .string("cellular"))
        XCTAssertEqual(on.durationMs, 62_000)
        XCTAssertEqual(r.keys(on), ["platform", "app_state", "network_type"])
    }

    func testWifiToCellularInsideTheDebounceIsNotAnOutage() {
        let r = started()
        r.rec.connectivity(online: false, networkType: "wifi")
        r.advance(300)
        r.rec.connectivity(online: true, networkType: "cellular")
        r.advance(10_000)
        XCTAssertEqual(r.names, [])
    }

    func testBatterySaverOnAndOff() {
        let r = started()
        r.rec.batterySaver(on: true); r.advance(2_000)
        XCTAssertEqual(r.names, ["battery_saver_on"])
        r.clear()
        r.advance(30_000)
        r.rec.batterySaver(on: false); r.advance(2_000)
        XCTAssertEqual(r.out[0].event, "battery_saver_off")
        XCTAssertEqual(r.out[0].durationMs, 32_000)
    }

    func testBackgroundAndForegroundAndTheAppStateOfTheOtherEvents() {
        let r = started()
        r.rec.appForeground(false); r.advance(2_000)
        XCTAssertEqual(r.out[0].event, "set_app_in_background")
        XCTAssertEqual(r.value(r.out[0], "app_state"), .string("background"))
        r.clear()
        r.advance(8_000)
        r.rec.gps(on: false); r.advance(2_000)
        XCTAssertEqual(r.value(r.out[0], "app_state"), .string("background"), "a gps event while in the background says so")
        r.clear()
        r.advance(20_000)
        r.rec.appForeground(true); r.advance(2_000)
        XCTAssertEqual(r.out[0].event, "set_app_in_foreground")
        XCTAssertEqual(r.value(r.out[0], "app_state"), .string("foreground"))
        XCTAssertEqual(r.out[0].durationMs, 32_000)
    }

    func testAQuickBackgroundTripLikeARotationYieldsNothing() {
        let r = started()
        r.rec.appForeground(false); r.advance(700)
        r.rec.appForeground(true); r.advance(10_000)
        XCTAssertEqual(r.names, [])
    }

    func testAHeldChangeIsEmittedBeforeTheStopWithItsOwnTime() {
        let r = started()
        r.rec.gps(on: false); r.advance(500)
        r.rec.stop(reason: "logout"); r.advance(10_000)
        XCTAssertEqual(r.names, ["turn_off_gps", "tracking_stopped"])
        XCTAssertEqual(r.out[0].occurredAtMs, T0, "the time of the detection, not of the stop")
        XCTAssertEqual(r.out[1].occurredAtMs, T0 + 500)
    }

    func testAForegroundHeldAtTheStopIsEmittedBeforeItAndTheNextPairHasItsRealDuration() {
        let r = started()
        r.rec.appForeground(false); r.advance(2_000)
        XCTAssertEqual(r.names, ["set_app_in_background"])
        r.clear()
        r.advance(5_000)
        r.rec.appForeground(true); r.advance(1_000) // held; tracking stops inside the hold
        r.rec.stop(reason: "permission")
        XCTAssertEqual(r.names, ["set_app_in_foreground", "tracking_stopped"])
        XCTAssertEqual(r.out[0].occurredAtMs, T0 + 7_000)
        XCTAssertEqual(r.out[0].durationMs, 7_000)
        XCTAssertEqual(r.value(r.out[0], "app_state"), .string("foreground"))
        XCTAssertEqual(r.value(r.out[1], "reason"), .string("permission"))

        // Tracking resumes: the pair of the next trip is measured from its own opening, never across the lost event.
        r.clear()
        r.rec.start(owner: OWNER, reason: "permission", device: device())
        XCTAssertEqual(r.names, ["tracking_started"])
        r.clear()
        r.rec.appForeground(false); r.advance(2_000)
        r.advance(4_000)
        r.rec.appForeground(true); r.advance(2_000)
        XCTAssertEqual(r.names, ["set_app_in_background", "set_app_in_foreground"])
        XCTAssertEqual(r.out[1].durationMs, 6_000)
    }

    func testABackgroundThenAForegroundThenAStopInsideTheHoldKeepsTheLongDuration() {
        let r = started()
        r.rec.appForeground(false); r.advance(2_000); r.advance(58_000)
        r.clear()
        r.rec.appForeground(true); r.advance(1_500)
        r.rec.stop(reason: "unavailable")
        XCTAssertEqual(r.names, ["set_app_in_foreground", "tracking_stopped"])
        XCTAssertEqual(r.out[0].durationMs, 60_000)
        XCTAssertFalse(r.rec.isActive)
    }

    func testEveryHeldFamilyIsSettledAtTheStopOldestFirstEachWithItsOwnTime() {
        let r = started()
        r.rec.gps(on: false); r.advance(300)
        r.rec.connectivity(online: false, networkType: "cellular"); r.advance(300)
        r.rec.batterySaver(on: true); r.advance(300)
        r.rec.appForeground(false); r.advance(300)
        r.rec.stop(reason: "logout")
        XCTAssertEqual(r.names, ["turn_off_gps", "turn_off_mobile_data", "battery_saver_on", "set_app_in_background", "tracking_stopped"])
        XCTAssertEqual(r.out.map { $0.occurredAtMs }, [T0, T0 + 300, T0 + 600, T0 + 900, T0 + 1_200])
        XCTAssertEqual(r.value(r.out[1], "network_type"), .string("cellular"))
        XCTAssertEqual(r.value(r.out[3], "app_state"), .string("background"), "the event says where the app was when it happened")
        XCTAssertEqual(r.value(r.out[0], "app_state"), .string("foreground"))
    }

    func testTheClosingOfEveryFamilyHeldAtTheStopIsEmittedWithItsDuration() {
        let r = started()
        r.rec.gps(on: false); r.rec.connectivity(online: false, networkType: "wifi"); r.rec.batterySaver(on: true); r.advance(2_000)
        r.advance(10_000)
        r.clear()
        r.rec.gps(on: true); r.rec.connectivity(online: true, networkType: "cellular"); r.rec.batterySaver(on: false); r.advance(1_000)
        r.rec.stop(reason: "permission")
        XCTAssertEqual(r.names, ["turn_on_gps", "turn_on_mobile_data", "battery_saver_off", "tracking_stopped"])
        XCTAssertEqual(r.out.prefix(3).map { $0.durationMs }, [12_000, 12_000, 12_000])
        XCTAssertEqual(r.value(r.out[1], "network_type"), .string("cellular"))
    }

    func testAFlapInsideTheHoldThenAStopLeavesNoPairAndNoLostDuration() {
        let r = started()
        r.rec.appForeground(false); r.advance(500)
        r.rec.appForeground(true); r.advance(300) // back to what the server was told: no pair
        r.rec.gps(on: false); r.advance(200)
        r.rec.gps(on: true); r.advance(200)
        r.rec.stop(reason: "permission")
        XCTAssertEqual(r.names, ["tracking_stopped"])
        r.clear()
        r.rec.start(owner: OWNER, reason: "permission", device: device()); r.clear()
        r.rec.appForeground(false); r.advance(2_000); r.advance(3_000)
        r.rec.appForeground(true); r.advance(2_000)
        XCTAssertEqual(r.names, ["set_app_in_background", "set_app_in_foreground"])
        XCTAssertEqual(r.out[1].durationMs, 5_000)
    }

    func testAStartRightAfterAStopThatSettledAChangeClosesItWithTheRealDuration() {
        let r = started()
        r.rec.gps(on: false); r.advance(500)
        r.rec.stop(reason: "permission"); r.advance(1_500)
        r.rec.start(owner: OWNER, reason: "permission", device: device(gps: true))
        XCTAssertEqual(r.names, ["turn_off_gps", "tracking_stopped", "tracking_started", "turn_on_gps"])
        XCTAssertEqual(r.out[3].durationMs, 2_000)
    }

    // MARK: - Across a restart

    func testTheDurationAfterARestartIsTheDifferenceOfTheTwoWallTimes() {
        let store = MemoryRecorderStore()
        let first = started(store)
        first.advance(5_000)
        first.rec.gps(on: false); first.advance(2_000)
        XCTAssertEqual(first.names, ["turn_off_gps"])
        XCTAssertEqual(store.load().open, ["gps_off": T0 + 5_000])
        // The process died. 10 minutes later a new one starts with the location services on again.
        let second = Rig(store, wall: T0 + 600_000)
        second.rec.start(owner: OWNER, reason: "login", device: device(gps: true))
        XCTAssertEqual(second.names, ["tracking_stopped", "tracking_started", "turn_on_gps"])
        let on = second.of("turn_on_gps")[0]
        XCTAssertEqual(on.occurredAtMs, T0 + 600_000, "occurred at the start's time")
        XCTAssertEqual(on.durationMs, 595_000)
    }

    func testTheDurationAfterACleanStopAndARestartIsAlsoFromTheWallTimes() {
        let store = MemoryRecorderStore()
        let first = started(store, d: device(online: true))
        first.rec.connectivity(online: false, networkType: "cellular"); first.advance(2_000)
        first.rec.stop(reason: "logout")
        let second = Rig(store, wall: T0 + 120_000)
        second.rec.start(owner: OWNER, reason: "login", device: device(online: true, type: "wifi"))
        XCTAssertEqual(second.names, ["tracking_started", "turn_on_mobile_data"])
        XCTAssertEqual(second.of("turn_on_mobile_data")[0].durationMs, 120_000)
        XCTAssertEqual(second.value(second.of("turn_on_mobile_data")[0], "network_type"), .string("wifi"))
    }

    func testAStopAndStartInTheSameProcessUsesTheMonotonicClock() {
        let r = started()
        r.rec.gps(on: false); r.advance(2_000); r.clear()
        r.rec.stop(reason: "unavailable"); r.clear()
        r.advance(40_000)
        r.jumpWall(7_000)
        r.rec.start(owner: OWNER, reason: "available", device: device(gps: true))
        XCTAssertEqual(r.of("turn_on_gps")[0].durationMs, 42_000) // from the opening's detection to the start, monotonic
    }

    // MARK: - The system stop

    func testAnActiveFlagWithNoCleanStopMeansTheSystemStoppedItAtTheHeartbeat() {
        let store = MemoryRecorderStore()
        let first = started(store)
        first.advance(30_000)
        first.rec.heartbeat()
        first.advance(20_000)
        first.rec.heartbeat() // written (>= 15 s since the last write)
        XCTAssertEqual(store.load().heartbeatWall, T0 + 50_000)

        let second = Rig(store, wall: T0 + 900_000)
        second.rec.start(owner: OWNER, reason: "login", device: device())
        XCTAssertEqual(second.names, ["tracking_stopped", "tracking_started"])
        let stopped = second.out[0]
        XCTAssertEqual(second.value(stopped, "reason"), .string("system"))
        XCTAssertEqual(stopped.occurredAtMs, T0 + 50_000, "the last time the module was alive")
        XCTAssertEqual(stopped.durationMs, 50_000, "how long the session tracked")
        let started = second.out[1]
        XCTAssertEqual(second.value(started, "reason"), .string("restart"))
        XCTAssertEqual(started.occurredAtMs, T0 + 900_000)
        XCTAssertEqual(second.logs, ["tracking stopped by the system (no clean stop)"])
    }

    func testACleanStopLeavesNoOwedSystemStop() {
        let store = MemoryRecorderStore()
        let first = started(store)
        first.rec.stop(reason: "unavailable")
        XCTAssertFalse(store.load().active)
        let second = Rig(store, wall: T0 + 900_000)
        second.rec.start(owner: OWNER, reason: "available", device: device())
        XCTAssertEqual(second.names, ["tracking_started"])
        XCTAssertEqual(second.value(second.out[0], "reason"), .string("available"))
    }

    func testAnotherDriversSessionIsNotOursToReport() {
        let store = MemoryRecorderStore()
        let first = started(store)
        first.rec.gps(on: false); first.advance(2_000)
        let second = Rig(store, wall: T0 + 900_000)
        second.rec.start(owner: "https://x/users/99/locations\nhttps://x/tracking_events", reason: "login", device: device(gps: true))
        XCTAssertEqual(second.names, ["tracking_started"], "no system stop, no turn_on_gps from the other driver")
        XCTAssertEqual(store.load().open, [:])
    }

    private final class CountingStore: RecorderStore {
        var saves = 0
        var state = RecorderState()
        func load() -> RecorderState { return state }
        func save(_ state: RecorderState) { saves += 1; self.state = state }
    }

    func testTheHeartbeatIsWrittenAtMostEvery15SecondsAndEveryMinuteByTheTimer() {
        let store = CountingStore()
        let r = started(store)
        let base = store.saves
        for _ in 1...10 { r.advance(1_000); r.rec.heartbeat() }
        XCTAssertEqual(store.saves, base, "ten fixes inside 15 s write nothing")
        r.advance(6_000); r.rec.heartbeat()
        XCTAssertEqual(store.saves, base + 1, "one write after 15 s")
        XCTAssertEqual(store.state.heartbeatWall, T0 + 16_000)
        // the timer: no fix at all for a while, the heartbeat still advances
        r.advance(60_000)
        XCTAssertGreaterThanOrEqual(store.state.heartbeatWall!, T0 + 60_000)
        r.advance(60_000)
        XCTAssertGreaterThanOrEqual(store.state.heartbeatWall!, T0 + 120_000)
    }

    func testCancelEndsTheSessionWithoutAnEventAndWithoutAnOwedSystemStop() {
        let store = MemoryRecorderStore()
        let r = started(store)
        r.rec.gps(on: false); r.advance(500)
        r.rec.cancel(); r.advance(10_000)
        XCTAssertEqual(r.names, [])
        XCTAssertFalse(store.load().active)
        XCTAssertFalse(r.rec.isActive)
        let next = Rig(store, wall: T0 + 100_000)
        next.rec.start(owner: OWNER, reason: "available", device: device())
        XCTAssertEqual(next.names, ["tracking_started"])
    }

    // MARK: - What is true at the start

    func testBatterySaverAlreadyOnAtTheStartIsReportedOnceAtTheStartsTime() {
        let r = Rig(MemoryRecorderStore())
        r.rec.start(owner: OWNER, reason: "available", device: device(saver: true))
        XCTAssertEqual(r.names, ["tracking_started", "battery_saver_on"])
        XCTAssertEqual(r.out[1].occurredAtMs, T0)
        r.rec.stop(reason: "logout"); r.clear()
        r.advance(60_000)
        r.rec.start(owner: OWNER, reason: "available", device: device(saver: true))
        XCTAssertEqual(r.names, ["tracking_started"], "already recorded as on: nothing more")
    }

    func testLocationServicesOffAndNoConnectionAtTheStartAreReportedOnce() {
        let r = Rig(MemoryRecorderStore())
        r.rec.start(owner: OWNER, reason: "available", device: device(gps: false, online: false, type: "none"))
        XCTAssertEqual(r.names, ["tracking_started", "turn_off_gps", "turn_off_mobile_data"])
        XCTAssertEqual(r.value(r.of("turn_off_mobile_data")[0], "network_type"), .string("none"))
    }

    func testStartedInTheBackgroundIsNotAnEventButItsForegroundHasADuration() {
        let r = Rig(MemoryRecorderStore())
        r.rec.start(owner: OWNER, reason: "available", device: device(fg: false))
        XCTAssertEqual(r.names, ["tracking_started"])
        r.clear()
        r.advance(25_000)
        r.rec.appForeground(true); r.advance(2_000)
        XCTAssertEqual(r.out[0].event, "set_app_in_foreground")
        XCTAssertEqual(r.out[0].durationMs, 25_000)
    }

    // MARK: - Permission

    func testAChangedAuthorizationIsReportedFromTheLastOneSeen() {
        let first = started()
        first.rec.permission(PermissionState(authorization: "while_in_use", precise: true))
        let e = first.out[0]
        XCTAssertEqual(e.event, "location_permission_changed")
        XCTAssertEqual(first.keys(e), ["platform", "app_state", "from", "to", "precise_from", "precise_to"])
        XCTAssertEqual(first.value(e, "from"), .string("always"))
        XCTAssertEqual(first.value(e, "to"), .string("while_in_use"))
        XCTAssertEqual(first.value(e, "precise_from"), .bool(true))
        XCTAssertEqual(first.value(e, "precise_to"), .bool(true))
        first.clear()
        first.rec.permission(PermissionState(authorization: "while_in_use", precise: true))
        XCTAssertEqual(first.names, [], "the same again is no change")
        first.rec.permission(PermissionState(authorization: "while_in_use", precise: false))
        let precision = first.out[0]
        XCTAssertEqual(first.value(precision, "from"), .string("while_in_use"))
        XCTAssertEqual(first.value(precision, "to"), .string("while_in_use"))
        XCTAssertEqual(first.value(precision, "precise_from"), .bool(true))
        XCTAssertEqual(first.value(precision, "precise_to"), .bool(false))
    }

    func testFromAlwaysToWhileInUseTrackingKeepsRunningAndOnlyThePermissionEventIsRecorded() {
        let r = started()
        r.rec.permission(PermissionState(authorization: "while_in_use", precise: true)); r.advance(10_000)
        XCTAssertEqual(r.names, ["location_permission_changed"])
        XCTAssertTrue(r.rec.isActive, "the recorder session goes on")
        r.rec.gps(on: false); r.advance(2_000)
        XCTAssertEqual(r.names, ["location_permission_changed", "turn_off_gps"], "events still recorded with while in use")
    }

    func testFromWhileInUseToDeniedThePermissionEventThenTheStopForThePermission() {
        let r = started(d: device(permission: PermissionState(authorization: "while_in_use", precise: true)))
        r.rec.permission(PermissionState(authorization: "denied", precise: false))
        r.rec.stop(reason: "permission")
        XCTAssertEqual(r.names, ["location_permission_changed", "tracking_stopped"])
        XCTAssertEqual(r.value(r.out[0], "from"), .string("while_in_use"))
        XCTAssertEqual(r.value(r.out[0], "to"), .string("denied"))
        XCTAssertEqual(r.value(r.out[1], "reason"), .string("permission"))
        XCTAssertFalse(r.rec.isActive)
    }

    func testAStartWithWhileInUseIsAStartLikeAnyOtherAndReportsTheChangeFromTheLastAuthorization() {
        let fresh = Rig(MemoryRecorderStore())
        fresh.rec.start(owner: OWNER, reason: "login", device: device(permission: PermissionState(authorization: "while_in_use", precise: true)))
        XCTAssertEqual(fresh.names, ["tracking_started"]) // the first authorization seen is a baseline
        XCTAssertTrue(fresh.rec.isActive)

        let store = MemoryRecorderStore()
        let first = started(store)
        first.rec.stop(reason: "permission")
        let again = Rig(store, wall: T0 + 60_000)
        again.rec.start(owner: OWNER, reason: "permission", device: device(permission: PermissionState(authorization: "while_in_use", precise: true)))
        XCTAssertEqual(again.names, ["tracking_started", "location_permission_changed"])
        XCTAssertEqual(again.value(again.out[0], "reason"), .string("permission"))
        XCTAssertEqual(again.value(again.out[1], "from"), .string("always"))
        XCTAssertEqual(again.value(again.out[1], "to"), .string("while_in_use"))
    }

    func testAStartAfterAPermissionStopSaysPermissionAndAnOrphanedSessionStillSaysRestart() {
        let store = MemoryRecorderStore()
        let first = started(store)
        first.rec.stop(reason: "permission")
        let resumed = Rig(store, wall: T0 + 60_000)
        resumed.rec.start(owner: OWNER, reason: "permission", device: device())
        XCTAssertEqual(resumed.value(resumed.of("tracking_started")[0], "reason"), .string("permission"))
        // The process dies with the session open: the next start owes the system stop and says restart whatever JavaScript says.
        let after = Rig(store, wall: T0 + 120_000)
        after.rec.start(owner: OWNER, reason: "permission", device: device())
        XCTAssertEqual(after.names, ["tracking_stopped", "tracking_started"])
        XCTAssertEqual(after.value(after.out[0], "reason"), .string("system"))
        XCTAssertEqual(after.value(after.out[1], "reason"), .string("restart"))
    }

    func testAChangeThatHappenedWhileTheProcessWasDeadIsReportedAtTheNextStartAtTheDetectionTime() {
        let store = MemoryRecorderStore()
        let first = started(store)
        first.rec.stop(reason: "logout")
        let second = Rig(store, wall: T0 + 3_600_000)
        second.rec.start(owner: OWNER, reason: "login", device: device(permission: PermissionState(authorization: "denied", precise: false)))
        let e = second.of("location_permission_changed")[0]
        XCTAssertEqual(e.occurredAtMs, T0 + 3_600_000)
        XCTAssertEqual(second.value(e, "from"), .string("always"))
        XCTAssertEqual(second.value(e, "to"), .string("denied"))
        XCTAssertEqual(second.names, ["tracking_started", "location_permission_changed"])
    }

    func testTheFirstPermissionEverSeenIsABaselineNotAnEvent() {
        let r = Rig(MemoryRecorderStore())
        r.rec.start(owner: OWNER, reason: "available", device: device())
        XCTAssertEqual(r.names, ["tracking_started"])
    }

    func testCloseOrphanReportsTheOwedStopWithTheGivenReasonThenThePermissionChange() {
        let store = MemoryRecorderStore()
        let first = started(store)
        first.advance(20_000)
        first.rec.heartbeat()
        let second = Rig(store, wall: T0 + 500_000)
        second.rec.closeOrphan(owner: OWNER, reason: "permission", permission: PermissionState(authorization: "while_in_use", precise: true))
        XCTAssertEqual(second.names, ["tracking_stopped", "location_permission_changed"])
        let stopped = second.out[0]
        XCTAssertEqual(second.value(stopped, "reason"), .string("permission"))
        XCTAssertEqual(stopped.occurredAtMs, T0 + 20_000)
        XCTAssertEqual(stopped.durationMs, 20_000)
        XCTAssertEqual(second.out[1].occurredAtMs, T0 + 500_000)
        XCTAssertFalse(store.load().active)
        second.clear()
        second.rec.closeOrphan(owner: OWNER, reason: "permission", permission: PermissionState(authorization: "denied", precise: false))
        XCTAssertEqual(second.names, [], "a second call finds nothing to report")
    }

    func testCloseOrphanDoesNothingWithoutAnOrphanOrForAnotherOwnerOrWhileRunning() {
        let store = MemoryRecorderStore()
        let idle = Rig(store, wall: T0)
        idle.rec.closeOrphan(owner: OWNER, reason: "permission", permission: ALWAYS)
        XCTAssertEqual(idle.names, [])

        let first = started(store)
        let other = Rig(store, wall: T0 + 100_000)
        other.rec.closeOrphan(owner: "someone else", reason: "permission", permission: ALWAYS)
        XCTAssertEqual(other.names, [])
        XCTAssertTrue(store.load().active, "still owed to its owner")

        first.rec.closeOrphan(owner: OWNER, reason: "permission", permission: ALWAYS) // the session is running: not an orphan
        XCTAssertEqual(first.names, [])
    }

    // MARK: - Simulated location

    func testASimulatedLocationIsReportedOncePerSessionAndPerTenMinutes() {
        let r = started()
        r.rec.mock(provider: "fused")
        XCTAssertEqual(r.out[0].event, "mock_location_detected")
        XCTAssertEqual(r.value(r.out[0], "provider"), .string("fused"))
        r.clear()
        r.advance(60_000)
        r.rec.mock(provider: "fused")
        r.advance(539_000)
        r.rec.mock(provider: "gps")
        XCTAssertEqual(r.names, [], "inside the ten minutes")
        r.advance(2_000)
        r.rec.mock(provider: nil)
        XCTAssertEqual(r.out.count, 1)
        XCTAssertEqual(r.keys(r.out[0]), ["platform", "app_state"], "no provider key when the OS gives none")
        // a new session starts the count again
        r.clear()
        r.rec.stop(reason: "unavailable")
        r.rec.start(owner: OWNER, reason: "available", device: device()); r.clear()
        r.rec.mock(provider: "fused")
        XCTAssertEqual(r.names, ["mock_location_detected"])
    }

    // MARK: - Misc

    func testUuidsAreV4LowercaseAndDifferent() {
        let r = Rig(MemoryRecorderStore(), newUUID: true)
        r.rec.start(owner: OWNER, reason: "available", device: device())
        r.rec.stop(reason: "unknown")
        XCTAssertEqual(r.out.count, 2)
        let pattern = try! NSRegularExpression(pattern: "^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$")
        for e in r.out {
            XCTAssertEqual(e.uuid.count, 36)
            XCTAssertEqual(pattern.numberOfMatches(in: e.uuid, range: NSRange(e.uuid.startIndex..., in: e.uuid)), 1)
        }
        XCTAssertNotEqual(r.out[0].uuid, r.out[1].uuid)
    }

    func testTheFileStoreRoundTripsAndNeverHoldsAToken() throws {
        let dir = makeTempDirectory()
        let store = FileRecorderStore(directory: dir)
        let state = RecorderState(owner: OWNER, active: true, sessionStartWall: 5, heartbeatWall: 9,
                                  open: ["gps_off": 3, "offline": 4], permission: PermissionState(authorization: "always", precise: false))
        store.save(state)
        XCTAssertEqual(FileRecorderStore(directory: dir).load(), state)
        let text = try String(contentsOf: dir.appendingPathComponent(FileRecorderStore.fileName))
        XCTAssertFalse(text.contains("Bearer") || text.contains("Authorization"))
        try "garbage\u{0}\u{1}".write(to: dir.appendingPathComponent(FileRecorderStore.fileName), atomically: true, encoding: .utf8)
        XCTAssertEqual(FileRecorderStore(directory: dir).load(), RecorderState())
    }

    func testAnEndToEndRunFeedsTheSenderInOrder() {
        // recorder -> sender lane -> transport: the order and the shape of what leaves the phone
        let rig = SenderRig(config: eventsConfig())
        var n = 0
        let rec = TrackingRecorder(scheduler: rig.scheduler, store: MemoryRecorderStore(),
                                   sink: { rig.sender.recordOnWorker($0) }, post: { rig.sender.performOnWorker($0) },
                                   newUUID: { n += 1; return "uuid-\(n)" })
        rec.start(owner: eventsConfig().eventsOwner!, reason: "available", device: device())
        rig.idle()
        rec.gps(on: false); rig.idle()
        rig.advance(2)
        rec.stop(reason: "unavailable"); rig.idle()
        let bodies = rig.transport.eventRequests.map { $0.body }
        XCTAssertEqual(bodies.flatMap { eventNames($0) }, ["tracking_started", "turn_off_gps", "tracking_stopped"])
        XCTAssertTrue(bodies.allSatisfy { String(data: $0, encoding: .utf8)!.hasPrefix("{\"events\":\"[") })
    }
}
