import XCTest
import CoreLocation
@testable import DriverLocationCore

final class FakeSignals: DeviceSignalSource {
    var onAppForeground: ((Bool) -> Void)?
    var onBatterySaver: ((Bool) -> Void)?
    var appForeground = true
    var batterySaver = false
    private(set) var started = 0
    private(set) var stopped = 0
    func start() -> (appForeground: Bool, batterySaver: Bool) { started += 1; return (appForeground, batterySaver) }
    func stop() { stopped += 1 }
}

/// The service with the events lane on: the recorder, the sender's lane and the detectors, all with fakes.
private final class Rig {
    let manager = FakeManager()
    let transport = FakeTransport()
    let scheduler = ManualScheduler()
    let connectivity = FakeConnectivity()
    let signals = FakeSignals()
    let delegate = RecordingDelegate()
    let store: MemoryRecorderStore
    let directory: URL
    let service: DriverLocationService
    var logs: [String] = []

    init(directory: URL = makeTempDirectory(), store: MemoryRecorderStore = MemoryRecorderStore()) {
        self.directory = directory
        self.store = store
        service = DriverLocationService(queueDirectory: directory, isReleaseBuild: false, manager: manager, transport: transport,
                                        connectivity: connectivity, scheduler: scheduler, signals: signals, recorderStore: store)
        service.delegate = delegate
    }

    func idle() { service.sender.waitUntilIdle() }

    func advance(_ seconds: TimeInterval) {
        idle() // what was posted to the worker has run, so its timers exist
        let target = scheduler.now.addingTimeInterval(seconds)
        while let work = scheduler.popDue(upTo: target) { work(); idle() }
        scheduler.now = target
    }

    /// Every event sent so far, in order, as (name, data as dictionary).
    var sent: [(name: String, data: [String: Any], occurredAt: String)] {
        idle()
        return transport.eventRequests.flatMap { request -> [(String, [String: Any], String)] in
            return eventObjects(request.body).map { ($0["event"] as! String, $0["data"] as! [String: Any], $0["occurred_at"] as! String) }
        }
    }

    var names: [String] { return sent.map { $0.name } }

    func raw(simulated: Bool = false) -> RawLocation {
        return RawLocation(lat: 1, lng: 2, horizontalAccuracy: 5, speed: 3, timestamp: scheduler.now, isSimulated: simulated)
    }
}

final class ServiceEventsTests: XCTestCase {
    func testStartRecordsTrackingStartedWithTheReasonAndSendsIt() {
        let r = Rig()
        r.service.configure(eventsConfig())
        r.service.start(reason: "login")
        XCTAssertEqual(r.names, ["tracking_started"])
        XCTAssertEqual(r.sent[0].data["reason"] as? String, "login")
        XCTAssertEqual(r.sent[0].data["platform"] as? String, "ios")
        XCTAssertEqual(r.sent[0].data["app_state"] as? String, "foreground")
        XCTAssertEqual(r.signals.started, 1)
    }

    func testWithoutAnEventsUrlTheRecorderNeverStarts() {
        let r = Rig()
        r.service.configure(makeConfig())
        r.service.start(reason: "login")
        r.service.stop(reason: "logout")
        r.idle()
        XCTAssertEqual(r.transport.eventRequests.count, 0)
        XCTAssertEqual(r.signals.started, 0, "the watchers that only serve the recorder are not registered")
        XCTAssertEqual(r.store.load(), RecorderState())
        XCTAssertFalse(FileManager.default.fileExists(atPath: r.directory.appendingPathComponent(EventQueue.fileName).path))
    }

    func testStopRecordsTheReasonAndRemovesTheWatchers() {
        let r = Rig()
        r.service.configure(eventsConfig())
        r.service.start(reason: "available")
        r.service.stop(reason: "unavailable")
        XCTAssertEqual(r.names, ["tracking_started", "tracking_stopped"])
        XCTAssertEqual(r.sent[1].data["reason"] as? String, "unavailable")
        XCTAssertEqual(r.signals.stopped, 1)
        XCTAssertEqual(r.connectivity.stopped, 1)
        XCTAssertFalse(r.store.load().active)
    }

    func testStartSnapshotComesFromTheDevice() {
        let r = Rig()
        r.manager.servicesEnabled = false
        r.manager.authorization = .authorizedWhenInUse
        r.manager.preciseLocation = false
        r.signals.batterySaver = true
        r.signals.appForeground = false
        r.connectivity.current = (false, "wifi")
        r.service.configure(eventsConfig())
        r.service.start(reason: "available")
        XCTAssertEqual(r.names, ["tracking_started", "turn_off_gps", "turn_off_mobile_data", "battery_saver_on"])
        XCTAssertEqual(r.sent[0].data["app_state"] as? String, "background")
        XCTAssertEqual(r.sent[2].data["network_type"] as? String, "wifi")
        XCTAssertEqual(r.store.load().permission, PermissionState(authorization: "while_in_use", precise: false))
    }

    func testAKillIsReportedAtTheNextStartAsASystemStopThenARestart() {
        let store = MemoryRecorderStore()
        let dir = makeTempDirectory()
        let first = Rig(directory: dir, store: store)
        first.service.configure(eventsConfig())
        first.service.start(reason: "available")
        first.idle()
        XCTAssertTrue(store.load().active)
        // the process dies: a new service over the same directory and store
        let second = Rig(directory: dir, store: store)
        second.scheduler.now = first.scheduler.now.addingTimeInterval(600)
        second.service.configure(eventsConfig())
        second.service.start(reason: "login")
        XCTAssertEqual(second.names, ["tracking_stopped", "tracking_started"])
        XCTAssertEqual(second.sent[0].data["reason"] as? String, "system")
        XCTAssertEqual(second.sent[1].data["reason"] as? String, "restart")
    }

    func testAStopWithNoSessionReportsTheOwedStopWithTheJavaScriptReason() {
        let store = MemoryRecorderStore()
        let dir = makeTempDirectory()
        let first = Rig(directory: dir, store: store)
        first.service.configure(eventsConfig())
        first.service.start(reason: "available")
        first.idle()
        let second = Rig(directory: dir, store: store)
        second.manager.authorization = .denied
        second.service.configure(eventsConfig())
        second.service.stop(reason: "permission") // nothing runs: the permission is gone, the driver is not tracked
        XCTAssertEqual(second.names, ["tracking_stopped", "location_permission_changed"])
        XCTAssertEqual(second.sent[0].data["reason"] as? String, "permission")
        XCTAssertEqual(second.sent[1].data["to"] as? String, "denied")
        XCTAssertEqual(second.sent[1].data["precise_to"] as? Bool, false)
        second.service.stop(reason: "permission") // JavaScript stops again and again: nothing more
        XCTAssertEqual(second.names.count, 2)
    }

    func testAStopWithNoSessionAndNothingOwedSaysNothing() {
        let r = Rig()
        r.service.configure(eventsConfig())
        r.service.stop(reason: "unavailable")
        XCTAssertEqual(r.names, [])
    }

    func testARevokedSessionRecordsTheStopBeforeJavaScriptHearsOfIt() {
        let r = Rig()
        r.service.configure(eventsConfig())
        r.service.start(reason: "available")
        r.idle()
        var heard: [String] = []
        r.delegate.onStateHook = { kind in
            if kind == .unauthorized { heard.append("unauthorized after \(r.transport.eventRequests.count) event requests") }
        }
        r.transport.enqueue(.response(status: 401)) // the next request: the position
        r.manager.eventHandler?.manager(didUpdate: [r.raw()])
        r.idle()
        XCTAssertEqual(r.delegate.states.filter { $0 == .unauthorized }.count, 1)
        XCTAssertEqual(heard.count, 1)
        XCTAssertEqual(r.names, ["tracking_started", "tracking_stopped"])
        XCTAssertEqual(r.sent[1].data["reason"] as? String, "session_revoked")
        // JavaScript logs out and stops: no second stop
        r.service.stop(reason: "logout")
        XCTAssertEqual(r.names.count, 2)
    }

    // MARK: - The detectors

    func testAppStateAndBatterySaverFlowToTheRecorderAndAreDebounced() {
        let r = Rig()
        r.service.configure(eventsConfig())
        r.service.start(reason: "available")
        r.signals.onAppForeground?(false)
        r.idle()
        XCTAssertEqual(r.names, ["tracking_started"])
        r.advance(2)
        r.signals.onBatterySaver?(true)
        r.advance(2)
        XCTAssertEqual(r.names, ["tracking_started", "set_app_in_background", "battery_saver_on"])
        XCTAssertEqual(r.sent[2].data["app_state"] as? String, "background")
        r.signals.onAppForeground?(true)
        r.advance(1)
        r.signals.onAppForeground?(false) // a flap
        r.advance(10)
        XCTAssertEqual(r.names.count, 3)
    }

    func testConnectivityChangesFlowToTheRecorder() {
        let r = Rig()
        r.service.configure(eventsConfig())
        r.service.start(reason: "available")
        r.connectivity.onChange?(true, "wifi")
        r.connectivity.onChange?(false, "wifi")
        r.advance(2)
        r.advance(60)
        r.connectivity.onChange?(true, "cellular")
        r.advance(2)
        XCTAssertEqual(r.names, ["tracking_started", "turn_off_mobile_data", "turn_on_mobile_data"])
        XCTAssertEqual(r.sent[1].data["network_type"] as? String, "wifi")
        XCTAssertEqual(r.sent[2].data["network_type"] as? String, "cellular")
    }

    func testServicesAndAuthorizationFlowFromTheLocationManager() {
        let r = Rig()
        r.service.configure(eventsConfig())
        r.service.start(reason: "available")
        r.manager.servicesEnabled = false
        r.manager.authorization = .authorizedWhenInUse
        r.manager.preciseLocation = false
        r.manager.eventHandler?.managerDidChangeAuthorization()
        r.advance(2)
        XCTAssertEqual(r.names, ["tracking_started", "location_permission_changed", "turn_off_gps"])
        let permission = r.sent[1].data
        XCTAssertEqual(permission["from"] as? String, "always")
        XCTAssertEqual(permission["to"] as? String, "while_in_use")
        XCTAssertEqual(permission["precise_from"] as? Bool, true)
        XCTAssertEqual(permission["precise_to"] as? Bool, false)
        r.manager.servicesEnabled = true
        r.manager.eventHandler?.managerDidChangeAuthorization()
        r.advance(2)
        XCTAssertEqual(r.names.last, "turn_on_gps")
    }

    func testWhileInUseStartsTracksAndSendsAndDeniedIsLeftToJavaScript() {
        // The owner's decision of 2026-11-19: "While Using" keeps tracking and sending for as long as the system delivers positions.
        let r = Rig()
        r.manager.authorization = .authorizedWhenInUse
        r.service.configure(eventsConfig())
        r.service.start(reason: "login")
        XCTAssertTrue(r.service.tracker.isRunning)
        XCTAssertEqual(r.manager.startCount, 1)
        r.manager.eventHandler?.manager(didUpdate: [r.raw()])
        r.idle()
        XCTAssertEqual(r.transport.requests.filter { $0.url.absoluteString == testURL }.count, 1, "a position is sent with While Using")

        // Always -> While Using while running: the permission event, tracking goes on.
        let upgraded = Rig()
        upgraded.service.configure(eventsConfig())
        upgraded.service.start(reason: "login")
        upgraded.manager.authorization = .authorizedWhenInUse
        upgraded.manager.eventHandler?.managerDidChangeAuthorization()
        upgraded.advance(2)
        XCTAssertEqual(upgraded.names, ["tracking_started", "location_permission_changed"])
        XCTAssertTrue(upgraded.service.tracker.isRunning)

        // Denied: the core records the change; the stop for the permission is JavaScript's (it says why).
        upgraded.manager.authorization = .denied
        upgraded.manager.eventHandler?.managerDidChangeAuthorization()
        upgraded.advance(2)
        XCTAssertEqual(upgraded.names, ["tracking_started", "location_permission_changed", "location_permission_changed"])
        upgraded.service.stop(reason: "permission")
        XCTAssertEqual(upgraded.names.last, "tracking_stopped")
        XCTAssertEqual(upgraded.sent.last?.data["reason"] as? String, "permission")
        XCTAssertFalse(upgraded.service.tracker.isRunning)
    }

    func testASimulatedFixIsReportedWhateverTheMockPolicyDoes() {
        for release in [true, false] {
            let manager = FakeManager()
            let transport = FakeTransport()
            let scheduler = ManualScheduler()
            let service = DriverLocationService(queueDirectory: makeTempDirectory(), isReleaseBuild: release, manager: manager, transport: transport,
                                                connectivity: FakeConnectivity(), scheduler: scheduler, signals: FakeSignals(),
                                                recorderStore: MemoryRecorderStore())
            service.configure(eventsConfig())
            service.start(reason: "available")
            manager.eventHandler?.manager(didUpdate: [RawLocation(lat: 1, lng: 2, horizontalAccuracy: 5, speed: 3, timestamp: scheduler.now, isSimulated: true)])
            service.sender.waitUntilIdle()
            let names = transport.eventRequests.flatMap { eventNames($0.body) }
            XCTAssertEqual(names, ["tracking_started", "mock_location_detected"], "release: \(release)")
        }
    }

    func testAFixIsTheHeartbeat() {
        let r = Rig()
        r.service.configure(eventsConfig())
        r.service.start(reason: "available")
        r.advance(30)
        r.manager.eventHandler?.manager(didUpdate: [r.raw()])
        r.idle()
        XCTAssertEqual(r.store.load().heartbeatWall, Int64((r.scheduler.now.timeIntervalSince1970 * 1000).rounded(.down)))
    }

    // MARK: - The switch

    func testTheProjectsSwitchTurnedOffWhileTrackingEndsTheSessionWithoutAnEvent() {
        let r = Rig()
        r.service.configure(eventsConfig())
        r.service.start(reason: "available")
        r.service.configure(eventsConfig(eventsUrl: nil))
        r.idle()
        XCTAssertEqual(r.signals.stopped, 1)
        XCTAssertFalse(r.store.load().active, "a later kill is not reported as a stop by the system")
        r.service.stop(reason: "logout")
        XCTAssertEqual(r.names, ["tracking_started"])
    }

    func testTheSwitchTurnedOnWhileTrackingStartsTheSessionWithTheLastReason() {
        let r = Rig()
        r.service.configure(makeConfig())
        r.service.start(reason: "schedule")
        XCTAssertEqual(r.names, [])
        r.service.configure(eventsConfig())
        XCTAssertEqual(r.names, ["tracking_started"])
        XCTAssertEqual(r.sent[0].data["reason"] as? String, "schedule")
    }

    func testAnOlderCallerWithNoReasonGetsAvailableAndUnknown() {
        let r = Rig()
        r.service.configure(eventsConfig())
        r.service.start()
        r.service.stop()
        XCTAssertEqual(r.sent.map { $0.data["reason"] as? String }, ["available", "unknown"])
    }
}

final class DetectorMappingTests: XCTestCase {
    func testNetworkTypeMapping() {
        XCTAssertEqual(NetworkTypeMapper.type(wifi: true, cellular: false), "wifi")
        XCTAssertEqual(NetworkTypeMapper.type(wifi: true, cellular: true), "wifi")
        XCTAssertEqual(NetworkTypeMapper.type(wifi: false, cellular: true), "cellular")
        XCTAssertEqual(NetworkTypeMapper.type(wifi: false, cellular: false), "other")
    }

    func testConnectivityTrackerReportsTheLastTypeWhenLostAndNoneWhenNeverUsable() {
        var t = ConnectivityTracker()
        XCTAssertNil(t.latest)
        let first = t.update(satisfied: false, usableType: "other")
        XCTAssertFalse(first.online)
        XCTAssertEqual(first.networkType, "none")
        XCTAssertEqual(t.update(satisfied: true, usableType: "wifi").networkType, "wifi")
        let lost = t.update(satisfied: false, usableType: "other")
        XCTAssertEqual(lost.networkType, "wifi", "the type lost")
        XCTAssertEqual(t.latest?.online, false)
        XCTAssertEqual(t.update(satisfied: true, usableType: "cellular").networkType, "cellular")
    }

    func testPermissionMapping() {
        XCTAssertEqual(PermissionMapper.state(.authorizedAlways, precise: true), PermissionState(authorization: "always", precise: true))
        XCTAssertEqual(PermissionMapper.state(.authorizedWhenInUse, precise: false), PermissionState(authorization: "while_in_use", precise: false))
        XCTAssertEqual(PermissionMapper.state(.denied, precise: true), PermissionState(authorization: "denied", precise: false))
        XCTAssertEqual(PermissionMapper.state(.restricted, precise: true), PermissionState(authorization: "restricted", precise: false))
        XCTAssertEqual(PermissionMapper.state(.notDetermined, precise: true), PermissionState(authorization: "not_determined", precise: false))
    }

    func testTheSystemSignalsRegisterOnceAndRemoveCleanly() {
        let signals = SystemDeviceSignals()
        var battery: [Bool] = []
        signals.onBatterySaver = { battery.append($0) }
        _ = signals.start(); _ = signals.start()
        NotificationCenter.default.post(name: .NSProcessInfoPowerStateDidChange, object: nil)
        XCTAssertEqual(battery.count, 1, "registered once")
        signals.stop(); signals.stop()
        NotificationCenter.default.post(name: .NSProcessInfoPowerStateDidChange, object: nil)
        XCTAssertEqual(battery.count, 1, "removed at the stop")
    }
}
