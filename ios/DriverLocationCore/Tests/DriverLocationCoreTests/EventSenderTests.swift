import XCTest
@testable import DriverLocationCore

final class EventSenderTests: XCTestCase {
    private let offline = TransportResult.networkError("NSURLErrorDomain/-1009")

    private func rig(config: Config? = eventsConfig(), started: Bool = true, directory: URL = makeTempDirectory(),
                     maxEvents: Int = EventQueue.defaultMaxEvents) -> SenderRig {
        return SenderRig(directory: directory, config: config, started: started, maxEvents: maxEvents)
    }

    // MARK: - The request

    func testOneEventIsPostedToTheEventsUrlWithTheContractsBody() throws {
        let r = rig()
        r.record(1)
        let request = try XCTUnwrap(r.transport.eventRequests.first)
        XCTAssertEqual(request.url.absoluteString, eventsTestURL)
        XCTAssertEqual(String(data: request.body, encoding: .utf8), EventJson.body([ev(1).toJson()]))
        XCTAssertEqual(eventObjects(request.body).count, 1)
        XCTAssertEqual(r.sender.queuedEvents, 0)
    }

    func testTheHeadersAreTheSameAsThePositionsRequests() throws {
        let r = rig(config: try eventsConfig().addingDefaultHeaders(["User-Agent": "App/1", "X-Device-Id-X": "dev"]))
        r.submit(1)
        r.record(1)
        XCTAssertEqual(r.transport.eventRequests.first?.headers, r.transport.positionRequests.first?.headers)
        XCTAssertEqual(r.transport.eventRequests.first?.headers["Authorization"], "Bearer secret-token")
        XCTAssertEqual(r.transport.eventRequests.first?.headers["User-Agent"], "App/1")
    }

    func testAnEventRecordedAfterTheStopIsStillSent() {
        let r = rig()
        r.sender.stop()
        r.idle()
        r.record(1)
        XCTAssertEqual(r.transport.eventRequests.count, 1)
    }

    func testWithoutAnEventsUrlNothingIsRecordedWrittenOrSent() {
        let dir = makeTempDirectory()
        let r = rig(config: makeConfig(), directory: dir)
        r.record(1, 2)
        XCTAssertEqual(r.transport.requests.count, 0)
        XCTAssertEqual(r.sender.queuedEvents, 0)
        XCTAssertFalse(FileManager.default.fileExists(atPath: dir.appendingPathComponent(EventQueue.fileName).path))
        XCTAssertFalse(FileManager.default.fileExists(atPath: dir.appendingPathComponent(EventQueue.ownerFileName).path))
    }

    func testAnEventsUrlThatIsNotHttpIsAConfigError() {
        XCTAssertThrowsError(try Config(url: testURL, headers: ["A": "b"], eventsUrl: "ftp://x/y")) {
            XCTAssertEqual($0 as? ConfigError, .invalidEventsURL)
        }
        XCTAssertThrowsError(try Config(url: testURL, headers: ["A": "b"], eventsUrl: "not a url"))
        XCTAssertNil(try Config(url: testURL, headers: ["A": "b"]).eventsOwner)
    }

    func testTheEventsUrlSurvivesWithHeadersAndDefaultHeaders() throws {
        let c = eventsConfig()
        XCTAssertEqual(try c.replacingHeaders(["A": "b"]).eventsUrl, c.eventsUrl)
        XCTAssertEqual(try c.addingDefaultHeaders(["User-Agent": "x"]).eventsUrl, c.eventsUrl)
        XCTAssertEqual(c.eventsOwner, testURL + "\n" + eventsTestURL)
    }

    // MARK: - Batches

    func testBatchesOfAtMost100OldestFirst() {
        let r = rig()
        r.transport.fallback = offline
        for n in 1...250 { r.sender.record(ev(n)) }
        r.idle()
        XCTAssertEqual(r.sender.queuedEvents, 250)
        let before = r.transport.eventRequests.count
        r.transport.fallback = .response(status: 200)
        r.sender.connectivityRestored()
        r.idle()
        let sent = Array(r.transport.eventRequests.dropFirst(before))
        XCTAssertEqual(sent.map { eventNumbers($0.body).count }, [100, 100, 50])
        XCTAssertEqual(sent.flatMap { eventNumbers($0.body) }, Array(1...250))
        XCTAssertEqual(r.sender.queuedEvents, 0)
    }

    // MARK: - Answers

    func testNetworkErrorKeepsTheBatchAndRetriesWithTheBackoff() {
        let r = rig()
        r.transport.fallback = offline
        r.record(1)
        XCTAssertEqual(r.sender.queuedEvents, 1)
        XCTAssertEqual(r.scheduler.pendingDelays, [5])
        r.fireRetry(); r.fireRetry(); r.fireRetry()
        XCTAssertEqual(r.events.retries.map { $0.delay }, [5, 15, 60, 60])
        XCTAssertTrue(r.events.retries.allSatisfy { $0.status == nil })
        r.transport.fallback = .response(status: 200)
        r.fireRetry()
        XCTAssertEqual(r.sender.queuedEvents, 0)
        XCTAssertEqual(eventNumbers(r.transport.eventRequests.last!.body), [1])
    }

    func testServerErrorsAnd408And429AreKeptAndRetried() {
        for status in [500, 503, 408, 429] {
            let r = rig()
            r.transport.fallback = .response(status: status)
            r.record(1)
            XCTAssertEqual(r.sender.queuedEvents, 1, "\(status)")
            XCTAssertEqual(r.events.retries.last?.status, status)
            XCTAssertEqual(r.events.dropped.count, 0)
            r.transport.fallback = .response(status: 200)
            r.fireRetry()
            XCTAssertEqual(r.sender.queuedEvents, 0, "\(status)")
        }
    }

    func testOtherClientErrorsDropThatBatchWithOneLogLineAndNeverRetry() {
        for status in [400, 404, 422, 301] {
            let r = rig()
            r.transport.fallback = .response(status: status)
            r.record(1)
            XCTAssertEqual(r.sender.queuedEvents, 0, "\(status)")
            XCTAssertEqual(r.events.dropped.count, 1)
            XCTAssertEqual(r.events.dropped.first?.count, 1)
            XCTAssertEqual(r.events.dropped.first?.why, "http \(status)")
            XCTAssertEqual(r.scheduler.pendingDelays, [])
            XCTAssertEqual(r.events.retries.count, 0)
        }
    }

    func testADroppedBatchDoesNotTakeTheEventsRecordedAfterItWithIt() {
        let r = rig()
        r.transport.enqueue(.response(status: 422))
        r.record(1)
        r.record(2)
        XCTAssertEqual(r.transport.eventRequests.map { eventNumbers($0.body) }, [[1], [2]])
    }

    // MARK: - Revoked session

    func testA401StopsTheLaneKeepsTheQueueAndReportsUnauthorizedOnce() {
        let r = rig()
        r.transport.fallback = .response(status: 401)
        r.record(1)
        r.record(2)
        r.record(3)
        XCTAssertEqual(r.delegate.states.filter { $0 == .unauthorized }.count, 1)
        XCTAssertEqual(r.transport.eventRequests.count, 1, "stopped after the first answer")
        XCTAssertEqual(r.sender.queuedEvents, 3)
        XCTAssertEqual(r.scheduler.pendingDelays, [])
    }

    func testA403DropsThatBatchWithTheLogLineAndTheLaneKeepsWorking() {
        let r = rig()
        r.transport.enqueue(.response(status: 403))
        r.record(1)
        XCTAssertEqual(r.transport.eventRequests.count, 1)
        XCTAssertEqual(r.sender.queuedEvents, 0, "dropped, not kept")
        XCTAssertEqual(r.events.dropped.count, 1)
        XCTAssertEqual(r.events.dropped.first?.count, 1)
        XCTAssertEqual(r.events.dropped.first?.why, "http 403")
        XCTAssertEqual(r.events.retries.count, 0)
        // the next batch is sent, with the same headers, and accepted
        r.record(2)
        XCTAssertEqual(r.transport.eventRequests.map { eventNumbers($0.body) }, [[1], [2]])
        XCTAssertEqual(r.sender.queuedEvents, 0)
        XCTAssertEqual(r.events.https.map { $0.status }, [403, 200])
        r.advance(300)
        XCTAssertEqual(r.transport.eventRequests.count, 2, "never retried")
    }

    func testA403NeverReachesTheUnauthorizedListenerNorTheRevokedHookAndPositionsAreUnaffected() {
        let r = rig()
        var hooks = 0
        r.sender.revokedHook = { hooks += 1 }
        r.transport.fallback = .response(status: 403) // the events endpoint refuses everything, every time
        r.record(1)
        r.record(2)
        r.record(3)
        XCTAssertEqual(r.transport.eventRequests.count, 3, "each batch went out and was dropped; the lane never stopped")
        XCTAssertEqual(r.sender.queuedEvents, 0)
        XCTAssertEqual(r.delegate.states.filter { $0 == .unauthorized }.count, 0)
        XCTAssertEqual(hooks, 0, "no session_revoked stop for a 403")
        r.transport.fallback = .response(status: 200)
        r.submit(1)
        XCTAssertEqual(r.transport.positionRequests.count, 1)
        XCTAssertEqual(r.sender.state().queued, 0)
        XCTAssertEqual(r.delegate.states.filter { $0 == .unauthorized }.count, 0)
    }

    func testA403OnAFullBatchDropsTheWholeBatchAndTheNextOneGoesOut() {
        let r = rig()
        r.transport.fallback = offline
        for n in 1...150 { r.sender.record(ev(n)) }
        r.idle()
        let before = r.transport.requests.count
        r.transport.fallback = .response(status: 200)
        r.transport.enqueue(.response(status: 403)) // the first batch (100 events) is refused
        r.sender.connectivityRestored()
        r.idle()
        let after = Array(r.transport.eventRequests.dropFirst(before))
        XCTAssertEqual(r.events.dropped.map { $0.why }, ["http 403"])
        XCTAssertEqual(r.events.dropped.first?.count, 100)
        XCTAssertEqual(after.count, 2)
        XCTAssertEqual(eventNumbers(after[1].body).count, 50)
        XCTAssertEqual(r.sender.queuedEvents, 0)
        XCTAssertEqual(r.delegate.states.filter { $0 == .unauthorized }.count, 0)
    }

    func testA403DoesNotLatchTheLaneSoALater401StillCounts() {
        let r = rig()
        var hooks = 0
        r.sender.revokedHook = { hooks += 1 }
        r.transport.enqueue(.response(status: 403), .response(status: 401))
        r.record(1)
        r.record(2)
        XCTAssertEqual(r.delegate.states.filter { $0 == .unauthorized }.count, 1, "only the 401 reported")
        XCTAssertEqual(hooks, 1)
        XCTAssertEqual(r.sender.queuedEvents, 1, "the 401's batch is kept")
    }

    func testAPositionsRequestAnswering401WhileEventsArePendingReportsOnce() {
        let r = rig()
        var hooks = 0
        r.sender.revokedHook = { hooks += 1 }
        r.transport.fallback = offline
        r.record(1) // events pending: offline, a retry is scheduled
        XCTAssertEqual(r.sender.queuedEvents, 1)
        r.transport.fallback = .response(status: 401)
        r.submit(1) // positions: 401
        XCTAssertEqual(r.delegate.states.filter { $0 == .unauthorized }.count, 1)
        r.advance(300) // the events retry runs and is answered 401 as well
        XCTAssertEqual(r.delegate.states.filter { $0 == .unauthorized }.count, 1, "still once")
        XCTAssertEqual(hooks, 1)
        XCTAssertEqual(r.sender.queuedEvents, 1, "kept")
    }

    func testAnEventsRequestAnswering401WhilePositionsArePendingReportsOnce() {
        let r = rig()
        r.transport.fallback = .response(status: 401)
        r.record(1) // events: 401 first
        r.submit(1) // then the position: 401 as well
        XCTAssertEqual(r.delegate.states.filter { $0 == .unauthorized }.count, 1)
        XCTAssertEqual(r.sender.queuedEvents, 1)
        XCTAssertEqual(r.sender.state().queued, 1, "the position is kept")
    }

    func testNewHeadersResumeTheLaneAndTheQueuedEventsGoOutWithTheNewToken() {
        let r = rig()
        r.transport.fallback = .response(status: 401)
        r.record(1, 2)
        r.transport.fallback = .response(status: 200)
        r.sender.updateHeaders(["Authorization": "Bearer fresh"])
        r.idle()
        let last = r.transport.eventRequests.last!
        XCTAssertEqual(last.headers["Authorization"], "Bearer fresh")
        XCTAssertEqual(eventNumbers(last.body), [1, 2])
        XCTAssertEqual(r.sender.queuedEvents, 0)
    }

    func testTheSameHeadersDoNotResumeALatchedLane() {
        let r = rig()
        r.transport.fallback = .response(status: 401)
        r.record(1)
        r.transport.fallback = .response(status: 200)
        r.sender.updateHeaders(["Authorization": "Bearer secret-token"])
        r.idle()
        XCTAssertEqual(r.transport.eventRequests.count, 1)
        XCTAssertEqual(r.sender.queuedEvents, 1)
    }

    func testAPositionsAnd401AndAnEventsAnd401ReportOnlyOnce() {
        let r = rig()
        r.transport.fallback = .response(status: 401)
        r.submit(1)
        r.record(1)
        XCTAssertEqual(r.delegate.states.filter { $0 == .unauthorized }.count, 1)
    }

    func testAnEventsRevocationAfterTheStopIsNotReportedToJavaScript() {
        let r = rig()
        r.sender.stop()
        r.idle()
        r.transport.fallback = .response(status: 401)
        r.record(1)
        XCTAssertEqual(r.delegate.states.filter { $0 == .unauthorized }.count, 0)
        XCTAssertEqual(r.sender.queuedEvents, 1)
    }

    func testTheRevokedHookRunsBeforeTheStateIsReportedAndOnce() {
        let r = rig()
        var order: [String] = []
        r.sender.revokedHook = { order.append("hook") }
        r.delegate.onStateHook = { _ in order.append("state") }
        r.transport.fallback = .response(status: 401)
        r.submit(1)
        r.record(1)
        XCTAssertEqual(order, ["hook", "state"])
    }

    // MARK: - Positions first

    func testPositionsGoFirstWhenBothArePending() {
        let r = rig()
        r.transport.fallback = offline
        r.submit(1)
        r.record(1)
        let before = r.transport.requests.count
        r.transport.fallback = .response(status: 200)
        r.sender.connectivityRestored()
        r.idle()
        let after = Array(r.transport.requests.dropFirst(before))
        XCTAssertEqual(after.first?.url.absoluteString, testURL)
        XCTAssertEqual(after.last?.url.absoluteString, eventsTestURL)
        XCTAssertEqual(after.count, 2)
    }

    func testAnEventWaitsForAPositionRequestInFlight() {
        let r = rig()
        r.transport.holdCompletions = true
        r.submit(1)
        r.record(1)
        XCTAssertEqual(r.transport.requests.map { $0.url.absoluteString }, [testURL])
        r.transport.release(.response(status: 200))
        r.idle()
        XCTAssertEqual(r.transport.requests.map { $0.url.absoluteString }, [testURL, eventsTestURL])
    }

    func testALongEventsQueueNeverHoldsAPositionBehindMoreThanOneBatch() {
        let r = rig()
        r.transport.fallback = offline
        for n in 1...250 { r.sender.record(ev(n)) }
        r.idle()
        r.transport.fallback = .response(status: 200)
        let before = r.transport.requests.count
        r.sender.connectivityRestored()
        r.sender.submit(makeFix(1)) // a position arrives right behind the restore
        r.idle()
        let after = Array(r.transport.requests.dropFirst(before)).map { $0.url.absoluteString }
        let firstPosition = after.firstIndex(of: testURL)!
        XCTAssertLessThanOrEqual(after[..<firstPosition].count, 1, "at most one events batch ahead of the position")
        XCTAssertEqual(r.sender.queuedEvents, 0)
    }

    // MARK: - Triggers

    func testConnectivityRestoredSendsTheEventsAtOnceAndResetsTheBackoff() {
        let r = rig()
        r.transport.fallback = offline
        r.record(1)
        r.fireRetry()
        XCTAssertEqual(r.events.retries.map { $0.delay }, [5, 15])
        r.transport.fallback = .response(status: 200)
        r.sender.connectivityRestored()
        r.idle()
        XCTAssertEqual(r.sender.queuedEvents, 0)
        r.transport.fallback = offline
        r.record(2)
        XCTAssertEqual(r.events.retries.last?.delay, 5, "the backoff started again")
    }

    func testFlushSendsPendingEventsAndKeepsTheBackoff() {
        let r = rig()
        r.transport.fallback = offline
        r.record(1)
        r.transport.fallback = .response(status: 200)
        r.sender.flush()
        r.idle()
        XCTAssertEqual(r.sender.queuedEvents, 0)
    }

    func testTheMinimumPositionIntervalDoesNotGateTheEvents() {
        let r = rig(config: eventsConfig(minSendIntervalMs: 5000))
        r.submit(1, 2)
        XCTAssertEqual(r.transport.positionRequests.count, 1, "the second position waits for the interval")
        r.record(1)
        XCTAssertEqual(r.transport.eventRequests.count, 1)
    }

    // MARK: - Owner, the previous run

    func testEventsLeftByAPreviousRunAreSentAtTheNextStart() {
        let dir = makeTempDirectory()
        let first = rig(directory: dir)
        first.transport.fallback = offline
        first.record(1, 2)
        let second = rig(directory: dir)
        XCTAssertEqual(second.transport.eventRequests.map { eventNumbers($0.body) }, [[1, 2]])
    }

    func testAnotherDriversEventsAreClearedBeforeAnythingIsSent() {
        let dir = makeTempDirectory()
        let first = rig(directory: dir)
        first.transport.fallback = offline
        first.record(1, 2)
        let second = rig(config: eventsConfig(url: "https://api.example.com/v1/en/project/users/99/locations"), directory: dir)
        XCTAssertEqual(second.transport.requests.count, 0)
        XCTAssertEqual(second.sender.queuedEvents, 0)
    }

    func testConfigureWithAnotherDriverClearsTheEventsAndTheSameOneKeepsThem() {
        let r = rig()
        r.transport.fallback = offline
        r.record(1)
        r.sender.configure(eventsConfig(token: "other-token"))
        r.idle()
        XCTAssertEqual(r.sender.queuedEvents, 1, "the same driver, a new token: kept")
        r.transport.fallback = .response(status: 200)
        r.sender.configure(eventsConfig(url: "https://api.example.com/v1/en/project/users/99/locations"))
        r.idle()
        XCTAssertEqual(r.sender.queuedEvents, 0)
        XCTAssertEqual(r.transport.eventRequests.filter { eventNumbers($0.body) == [1] }.count, 1 + 1, "the first try, the retry with the new token; nothing for the other driver")
    }

    func testTheCapDropsTheOldestWithOneLogLine() {
        let r = rig(maxEvents: 3)
        r.transport.fallback = offline
        r.record(1, 2, 3, 4, 5)
        XCTAssertEqual(r.sender.queuedEvents, 3)
        XCTAssertEqual(r.events.dropped.map { $0.why }, ["queue full", "queue full"])
        XCTAssertEqual(r.events.dropped.map { $0.count }, [1, 1])
        r.transport.fallback = .response(status: 200)
        r.sender.connectivityRestored()
        r.idle()
        XCTAssertEqual(eventNumbers(r.transport.eventRequests.last!.body), [3, 4, 5])
    }

    func testTurningTheEventsUrlOffStopsSendingAndKeepsWhatIsOnDisk() {
        let r = rig()
        r.transport.fallback = offline
        r.record(1)
        r.transport.fallback = .response(status: 200)
        r.sender.configure(eventsConfig(eventsUrl: nil))
        r.idle()
        r.record(2)
        XCTAssertEqual(r.sender.queuedEvents, 1)
        XCTAssertEqual(r.transport.eventRequests.count, 1, "only the first, failed, try")
    }

    func testTurningTheEventsUrlOnWhileRunningSendsWhatWasWaiting() {
        let r = rig(config: eventsConfig())
        r.transport.fallback = offline
        r.record(1)
        r.sender.configure(eventsConfig(eventsUrl: nil))
        r.idle()
        r.transport.fallback = .response(status: 200)
        r.sender.configure(eventsConfig())
        r.idle()
        XCTAssertEqual(r.sender.queuedEvents, 0)
    }

    func testTheListenerHearsEachEventAndRequest() {
        let r = rig()
        r.record(1)
        XCTAssertEqual(r.events.recorded.map { $0.event }, ["turn_off_gps"])
        XCTAssertEqual(r.events.requests.map { $0.count }, [1])
        XCTAssertEqual(r.events.https.map { $0.status }, [200])
    }

    func testTheBodyHoldsNoTokenAndTheQueueFileNeitherThanTheEventsThemselves() throws {
        let dir = makeTempDirectory()
        let r = rig(directory: dir)
        r.transport.fallback = offline
        r.record(1)
        let text = try String(contentsOf: dir.appendingPathComponent(EventQueue.fileName))
        XCTAssertFalse(text.contains("secret-token"))
    }
}
