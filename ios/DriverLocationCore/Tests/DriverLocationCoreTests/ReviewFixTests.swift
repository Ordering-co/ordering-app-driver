import XCTest
@testable import DriverLocationCore

/// The fixes of the independent review of the native module (2026-11-19): D3, D4, R7, the clock that goes back, `Retry-After`.
final class ReviewFixTests: XCTestCase {
    private let offline = TransportResult.networkError("NSURLErrorDomain/-1009")

    // MARK: - D3: tracking_stopped is never left unsent after a stop

    /// A position request is in flight; the driver stops (the `tracking_stopped` is recorded meanwhile); the request ends with
    /// each outcome. The event must be sent at the end of the request whatever the outcome (but a latched 401).
    private func eventIsSentAfterAPositionRequestEndsWith(_ outcome: TransportResult, file: StaticString = #filePath, line: UInt = #line) {
        let r = SenderRig(config: eventsConfig())
        r.transport.holdCompletions = true
        r.submit(1)
        r.sender.stop()
        r.record(1) // appended during the in-flight request
        XCTAssertEqual(r.transport.eventRequests.count, 0, "waits for the position request", file: file, line: line)
        r.transport.holdCompletions = false
        r.transport.release(outcome)
        r.idle()
        XCTAssertEqual(r.transport.eventRequests.count, 1, "outcome \(outcome)", file: file, line: line)
        XCTAssertEqual(r.sender.queuedEvents, 0, file: file, line: line)
    }

    func testTheStopsEventIsSentWhenThePositionRequestFailsWithANetworkError() { eventIsSentAfterAPositionRequestEndsWith(offline) }
    func testTheStopsEventIsSentWhenThePositionRequestAnswers408() { eventIsSentAfterAPositionRequestEndsWith(.response(status: 408)) }
    func testTheStopsEventIsSentWhenThePositionRequestAnswers429() { eventIsSentAfterAPositionRequestEndsWith(.response(status: 429)) }
    func testTheStopsEventIsSentWhenThePositionRequestAnswers503() { eventIsSentAfterAPositionRequestEndsWith(.response(status: 503)) }
    func testTheStopsEventIsSentWhenThePositionRequestAnswers200() { eventIsSentAfterAPositionRequestEndsWith(.response(status: 200)) }
    func testTheStopsEventIsSentWhenThePositionRequestAnswers400() { eventIsSentAfterAPositionRequestEndsWith(.response(status: 400)) }

    func testALatched401KeepsTheEventsOnDiskNotSent() {
        let r = SenderRig(config: eventsConfig())
        r.transport.holdCompletions = true
        r.submit(1)
        r.record(1)
        r.transport.holdCompletions = false
        r.transport.release(.response(status: 401))
        r.idle()
        XCTAssertEqual(r.transport.eventRequests.count, 0, "a revoked session sends nothing more")
        XCTAssertEqual(r.sender.queuedEvents, 1)
    }

    // MARK: - D4: the start snapshot never reads a stale connectivity

    private final class Rig {
        let manager = FakeManager()
        let transport = FakeTransport()
        let scheduler = ManualScheduler()
        let connectivity = FakeConnectivity()
        let signals = Signals()
        let store = MemoryRecorderStore()
        let service: DriverLocationService

        final class Signals: DeviceSignalSource {
            var onAppForeground: ((Bool) -> Void)?
            var onBatterySaver: ((Bool) -> Void)?
            func start() -> (appForeground: Bool, batterySaver: Bool) { return (true, false) }
            func stop() {}
        }

        init() {
            service = DriverLocationService(queueDirectory: makeTempDirectory(), isReleaseBuild: false, manager: manager,
                                            transport: transport, connectivity: connectivity, scheduler: scheduler,
                                            signals: signals, recorderStore: store)
        }

        func idle() { service.sender.waitUntilIdle() }

        func advance(_ seconds: TimeInterval) {
            idle()
            let target = scheduler.now.addingTimeInterval(seconds)
            while let work = scheduler.popDue(upTo: target) { work(); idle() }
            scheduler.now = target
        }

        var names: [String] {
            idle()
            return transport.eventRequests.flatMap { eventNames($0.body) }
        }
    }

    func testASessionThatEndedOfflineAndRestartsOnWifiEmitsNoConnectionEvent() {
        let r = Rig()
        // Driver A's session ends offline.
        r.service.configure(eventsConfig(url: "https://api.example.com/v1/en/project/users/7/locations"))
        r.service.start(reason: "login")
        r.connectivity.deliver(online: false, type: "wifi")
        r.advance(2.5)
        r.service.stop(reason: "logout")
        // Driver B signs in on the same phone, now on Wi-Fi: the monitor starts again and knows nothing yet.
        r.service.configure(eventsConfig(url: "https://api.example.com/v1/en/project/users/9/locations"))
        r.service.start(reason: "login")
        r.connectivity.deliver(online: true, type: "wifi")
        r.advance(5)
        let names = r.names
        XCTAssertEqual(names.filter { $0 == "turn_off_mobile_data" }.count, 1, "only driver A's: \(names)")
        XCTAssertEqual(names.filter { $0 == "turn_on_mobile_data" }.count, 0, "nothing is closed two seconds after a false opening: \(names)")
    }

    func testNotKnownYetIsNotOfflineAndTheFirstRealReadingIsTheNews() {
        let r = Rig()
        r.service.configure(eventsConfig())
        r.service.start(reason: "login") // the monitor has said nothing yet
        r.advance(1)
        XCTAssertEqual(r.names, ["tracking_started"], "no connection event from an unknown state")
        r.connectivity.deliver(online: false, type: "cellular") // the first real reading: no connection
        r.advance(2.5)
        XCTAssertEqual(r.names, ["tracking_started", "turn_off_mobile_data"])
    }

    func testAReadingThatArrivesBetweenTheSnapshotAndTheStartIsNotLost() {
        let r = Rig()
        r.service.configure(eventsConfig())
        r.connectivity.scripted = [nil, (online: false, networkType: "none")] // the snapshot sees nothing; the next look sees "offline"
        r.service.start(reason: "login")
        r.advance(2.5)
        XCTAssertEqual(r.names, ["tracking_started", "turn_off_mobile_data"])
    }

    func testTheMonitorIsStartedBeforeTheRecorderTakesItsSnapshot() {
        let r = Rig()
        var order: [String] = []
        r.connectivity.scripted = []
        r.service.configure(eventsConfig())
        r.service.start(reason: "login")
        order.append("started=\(r.connectivity.started)")
        XCTAssertEqual(order, ["started=1"])
    }

    func testNetworkPathMonitorForgetsItsLastReadingWhenStopped() {
        let monitor = NetworkPathMonitor()
        monitor.start()
        let deadline = Date().addingTimeInterval(10)
        while monitor.current == nil && Date() < deadline { Thread.sleep(forTimeInterval: 0.05) }
        XCTAssertNotNil(monitor.current, "the system delivers a first reading")
        monitor.stop()
        XCTAssertNil(monitor.current, "after stop(): not known, not the old reading")
        monitor.start()
        XCTAssertNil(monitor.current, "and not known again right after start() either, until the first reading")
        monitor.stop()
    }

    // MARK: - R7: a debounce timer that fired cannot take the pending that replaced it

    func testATimerThatAlreadyFiredDoesNotEmitTheReplacementBeforeItsOwnWait() {
        let scheduler = ManualScheduler()
        var held: [() -> Void] = []
        var out: [TrackingEvent] = []
        let base = scheduler.now
        func mono() -> Int64 { Int64((scheduler.now.timeIntervalSince(base) * 1000).rounded()) }
        let recorder = TrackingRecorder(scheduler: scheduler, store: MemoryRecorderStore(), sink: { out.append($0) },
                                        post: { held.append($0) },
                                        wallClock: { 1_795_046_400_000 + mono() }, monotonicClock: { mono() },
                                        newUUID: { UUID().uuidString.lowercased() }, debounce: 2)
        func runHeld() { while !held.isEmpty { held.removeFirst()() } }
        let snapshot = DeviceSnapshot(appForeground: true, gpsOn: true, online: true, networkType: "wifi", batterySaver: false,
                                      permission: PermissionState(authorization: "always", precise: true))
        recorder.start(owner: "o", reason: "login", device: snapshot)
        runHeld()
        out.removeAll()

        recorder.connectivity(online: false, networkType: "wifi")   // pending A (offline), timer A
        runHeld()
        scheduler.now = scheduler.now.addingTimeInterval(2)
        let fireA = scheduler.popDue(upTo: scheduler.now)           // timer A fires: `fire(A)` is posted to the worker, not run yet
        fireA?()
        XCTAssertEqual(held.count, 1)
        let postedFireA = held.removeFirst()

        // Before the worker runs it, the condition flaps back and goes bad again: A is cancelled, B is created with its own wait.
        recorder.connectivity(online: true, networkType: "wifi"); runHeld()
        recorder.connectivity(online: false, networkType: "wifi"); runHeld()
        postedFireA()                                               // the old timer's task finally runs
        runHeld()
        XCTAssertEqual(out.map { $0.event }, [], "B still has its 2 s to wait")

        scheduler.now = scheduler.now.addingTimeInterval(2)
        while let work = scheduler.popDue(upTo: scheduler.now) { work() }
        runHeld()
        XCTAssertEqual(out.map { $0.event }, ["turn_off_mobile_data"], "after its own wait, once")
    }

    // MARK: - The interval, with a clock that goes back

    func testAClockThatWentBackWaitsOneWholeIntervalAndNeverSendsEarly() {
        let r = SenderRig(config: makeConfig(discardOlderOnSuccess: true, minSendIntervalMs: 1500))
        r.submit(1)
        r.scheduler.now = r.scheduler.now.addingTimeInterval(-10) // the monotonic clock "cannot" go back
        r.submit(2)
        XCTAssertEqual(r.transport.indices, [1], "deferred, not sent")
        XCTAssertEqual(r.delegate.deferred.map { $0.delay }, [1.5])
        r.advance(1.25); XCTAssertEqual(r.transport.indices, [1])
        r.advance(0.25); XCTAssertEqual(r.transport.indices, [1, 2], "one interval after the clock went back, not ten seconds")
    }

    // MARK: - Retry-After

    func testRetryAfterIsParsedAsPlainBoundedSeconds() {
        XCTAssertEqual(RetryAfter.parse("120"), 120)
        XCTAssertEqual(RetryAfter.parse(" 0 "), 0)
        XCTAssertEqual(RetryAfter.parse("99999"), 300)
        XCTAssertNil(RetryAfter.parse(nil))
        XCTAssertNil(RetryAfter.parse(""))
        XCTAssertNil(RetryAfter.parse("-5"))
        XCTAssertNil(RetryAfter.parse("1.5"))
        XCTAssertNil(RetryAfter.parse("Wed, 21 Oct 2026 07:28:00 GMT"))
        XCTAssertNil(RetryAfter.parse("9999999999999999999"))
        XCTAssertEqual(RetryAfter.delay(backoff: 5, status: 429, retryAfter: 30), 30)
        XCTAssertEqual(RetryAfter.delay(backoff: 5, status: 503, retryAfter: 30), 30)
        XCTAssertEqual(RetryAfter.delay(backoff: 5, status: 500, retryAfter: 30), 5)
        XCTAssertEqual(RetryAfter.delay(backoff: 60, status: 429, retryAfter: 10), 60)
        XCTAssertEqual(RetryAfter.delay(backoff: 5, status: nil, retryAfter: 30), 5)
    }

    func testPositionsWaitTheServersTimeOn429() {
        let r = SenderRig(config: makeConfig())
        r.transport.enqueue(.response(status: 429, retryAfter: 120))
        r.submit(1)
        XCTAssertEqual(r.delegate.retries.map { $0.delay }, [120])
        r.advance(119); XCTAssertEqual(r.transport.requests.count, 1)
        r.advance(1); XCTAssertEqual(r.transport.requests.count, 2)
    }

    func testPositionsKeepTheBackoffWithoutAHeader() {
        let r = SenderRig(config: makeConfig())
        r.transport.enqueue(.response(status: 429))
        r.submit(1)
        XCTAssertEqual(r.delegate.retries.map { $0.delay }, [5])
    }

    func testEventsWaitTheServersTimeOn429() {
        let r = SenderRig(config: eventsConfig())
        r.transport.enqueue(.response(status: 429, retryAfter: 45))
        r.record(1)
        XCTAssertEqual(r.events.retries.map { $0.delay }, [45])
        r.advance(44); XCTAssertEqual(r.transport.eventRequests.count, 1)
        r.advance(1); XCTAssertEqual(r.transport.eventRequests.count, 2)
    }

    func testTheTransportReadsRetryAfterFromTheAnswer() throws {
        final class Stub: URLProtocol {
            static var status = 429
            static var header: String?
            override class func canInit(with request: URLRequest) -> Bool { return true }
            override class func canonicalRequest(for request: URLRequest) -> URLRequest { return request }
            override func startLoading() {
                var fields: [String: String] = [:]
                if let h = Stub.header { fields["Retry-After"] = h }
                let response = HTTPURLResponse(url: request.url!, statusCode: Stub.status, httpVersion: "HTTP/1.1", headerFields: fields)!
                client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
                client?.urlProtocol(self, didLoad: Data())
                client?.urlProtocolDidFinishLoading(self)
            }
            override func stopLoading() {}
        }
        let transport = URLSessionTransport(protocolClasses: [Stub.self])
        func send(status: Int, header: String?) -> TransportResult {
            Stub.status = status; Stub.header = header
            let done = expectation(description: "answer \(status)")
            var result: TransportResult?
            transport.send(url: URL(string: "https://api.example.com/x")!, headers: [:], body: Data()) { result = $0; done.fulfill() }
            wait(for: [done], timeout: 5)
            return result!
        }
        XCTAssertEqual(send(status: 429, header: "90"), .response(status: 429, retryAfter: 90))
        XCTAssertEqual(send(status: 429, header: "99999"), .response(status: 429, retryAfter: 300))
        XCTAssertEqual(send(status: 503, header: "7"), .response(status: 503, retryAfter: 7))
        XCTAssertEqual(send(status: 500, header: "7"), .response(status: 500), "only a 429 / 503 reads it")
        XCTAssertEqual(send(status: 429, header: nil), .response(status: 429))
    }
}
