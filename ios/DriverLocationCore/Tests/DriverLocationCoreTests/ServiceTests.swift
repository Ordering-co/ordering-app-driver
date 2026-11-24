import XCTest
@testable import DriverLocationCore

final class ConnectivityTests: XCTestCase {
    func testOnlyUnreachableToReachableIsARestoration() {
        var detector = PathTransitionDetector()
        XCTAssertFalse(detector.update(satisfied: true))   // the starting state
        XCTAssertFalse(detector.update(satisfied: true))
        XCTAssertFalse(detector.update(satisfied: false))
        XCTAssertFalse(detector.update(satisfied: false))
        XCTAssertTrue(detector.update(satisfied: true))
        XCTAssertFalse(detector.update(satisfied: true))
    }

    func testStartingOfflineThenComingOnlineIsARestoration() {
        var detector = PathTransitionDetector()
        XCTAssertFalse(detector.update(satisfied: false))
        XCTAssertTrue(detector.update(satisfied: true))
    }

    func testTheSystemMonitorStartsAndStopsCleanly() {
        let monitor = NetworkPathMonitor()
        monitor.start(); monitor.start()
        monitor.stop(); monitor.stop()
        monitor.start()
        monitor.stop()
    }
}

final class ServiceTests: XCTestCase {
    private func makeService(release: Bool = true) -> (DriverLocationService, FakeManager, FakeTransport, ManualScheduler, FakeConnectivity, RecordingDelegate) {
        let manager = FakeManager()
        let transport = FakeTransport()
        let scheduler = ManualScheduler()
        let connectivity = FakeConnectivity()
        let service = DriverLocationService(queueDirectory: makeTempDirectory(), isReleaseBuild: release,
                                            manager: manager, transport: transport,
                                            connectivity: connectivity, scheduler: scheduler)
        let delegate = RecordingDelegate()
        service.delegate = delegate
        return (service, manager, transport, scheduler, connectivity, delegate)
    }

    func testStartBeforeConfigureDoesNothing() {
        let (service, manager, _, _, connectivity, _) = makeService()
        let state = service.start()
        XCTAssertFalse(state.tracking)
        XCTAssertEqual(manager.startCount, 0)
        XCTAssertEqual(connectivity.started, 0)
    }

    func testConfigureStartStopWiring() {
        let (service, manager, transport, _, connectivity, _) = makeService()
        XCTAssertTrue(service.configure(makeConfig(distanceFilter: 40)).enabled)
        let started = service.start()
        XCTAssertTrue(started.tracking)
        XCTAssertEqual(manager.startCount, 1)
        XCTAssertEqual(manager.distanceFilter, 40)
        XCTAssertEqual(connectivity.started, 1)

        // A reading goes through the tracker, the sender and the transport.
        service.tracker.manager(didUpdate: [RawLocation(lat: 0.001, lng: -122.5, horizontalAccuracy: 5, speed: 1,
                                                        timestamp: service.sender.state().lastLocationAt ?? Date(timeIntervalSince1970: 1_700_000_000),
                                                        isSimulated: false)])
        service.sender.waitUntilIdle()
        XCTAssertEqual(transport.indices, [1])

        let stopped = service.stop()
        XCTAssertFalse(stopped.tracking)
        XCTAssertEqual(manager.stopCount, 1)
        XCTAssertEqual(connectivity.stopped, 1)
    }

    func testANewTokenSwapsTheHeadersWithoutRestartingTheLocationUpdates() {
        let (service, manager, transport, _, connectivity, delegate) = makeService()
        service.configure(makeConfig(token: "one"))
        service.start()
        transport.enqueue(.response(status: 401))
        service.sender.submit(makeFix(1)); service.sender.waitUntilIdle()
        XCTAssertEqual(delegate.states.filter { $0 == .unauthorized }.count, 1)

        service.configure(makeConfig(token: "two", distanceFilter: 60))
        service.sender.waitUntilIdle()

        XCTAssertEqual(manager.startCount, 1)   // never restarted
        XCTAssertEqual(manager.stopCount, 0)
        XCTAssertEqual(connectivity.started, 1)
        XCTAssertEqual(connectivity.stopped, 0)
        XCTAssertEqual(manager.distanceFilter, 60)
        XCTAssertEqual(transport.requests.last?.headers["Authorization"], "Bearer two")
        XCTAssertEqual(service.state().queued, 0)
        XCTAssertTrue(service.state().tracking)
    }

    func testTheDelegateIsToldWhenTheNetworkIsRestored() {
        let (service, _, _, _, connectivity, delegate) = makeService()
        service.configure(makeConfig())
        service.start()
        connectivity.onRestored?()
        service.sender.waitUntilIdle()
        XCTAssertEqual(delegate.networkRestored, 1)
    }

    func testConnectivityRestoredFlushesTheQueue() {
        let (service, _, transport, _, connectivity, _) = makeService()
        service.configure(makeConfig())
        service.start()
        transport.fallback = .networkError("x")
        service.sender.submit(makeFix(1)); service.sender.waitUntilIdle()
        XCTAssertEqual(service.state().queued, 1)
        transport.fallback = .response(status: 200)
        connectivity.onRestored?()
        service.sender.waitUntilIdle()
        XCTAssertEqual(service.state().queued, 0)
    }

    func testAuthorizationChangesReachTheDelegate() {
        let (service, manager, _, _, _, delegate) = makeService()
        service.configure(makeConfig())
        manager.authorization = .authorizedAlways
        service.start()
        manager.authorization = .denied
        manager.servicesEnabled = false
        service.tracker.managerDidChangeAuthorization()
        service.sender.waitUntilIdle()
        XCTAssertEqual(delegate.states, [.authorizationChanged, .authorizationChanged, .servicesDisabled])
        XCTAssertEqual(service.state().authorization, .denied)
        XCTAssertFalse(service.state().servicesEnabled)
    }

    func testASimulatedReadingIsRejectedInReleaseAndSentAsRealInDebug() {
        for release in [true, false] {
            let (service, _, transport, scheduler, _, delegate) = makeService(release: release)
            service.configure(makeConfig())
            service.start()
            service.tracker.manager(didUpdate: [RawLocation(lat: 0.001, lng: 1, horizontalAccuracy: 5, speed: 1,
                                                            timestamp: scheduler.now, isSimulated: true)])
            service.sender.waitUntilIdle()
            XCTAssertEqual(transport.requests.count, release ? 0 : 1)
            XCTAssertEqual(delegate.states.contains(.mockRejected), release)
            if !release {
                XCTAssertTrue(String(data: transport.requests[0].body, encoding: .utf8)!.contains("mock") == false)
                XCTAssertEqual(delegate.accepted.map { $0.mock }, [true])
            }
        }
    }
}
