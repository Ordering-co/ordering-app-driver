import XCTest
@testable import DriverLocationCore

final class SenderTests: XCTestCase {
    // MARK: - Basics

    func testNothingIsSentWhenNotStarted() {
        let rig = SenderRig(started: false)
        rig.submit(1, 2)
        XCTAssertEqual(rig.transport.requests.count, 0)
        XCTAssertEqual(rig.sender.state().queued, 0)
        rig.sender.start(); rig.idle()
        XCTAssertEqual(rig.transport.requests.count, 0) // the earlier ones were ignored, not queued
        XCTAssertTrue(rig.sender.state().tracking)
        XCTAssertTrue(rig.delegate.accepted.isEmpty)
    }

    func testNothingIsSentAfterStop() {
        let rig = SenderRig()
        rig.submit(1)
        XCTAssertEqual(rig.transport.indices, [1])
        rig.sender.stop(); rig.idle()
        rig.submit(2, 3)
        XCTAssertEqual(rig.transport.indices, [1])
        XCTAssertFalse(rig.sender.state().tracking)
    }

    func testStopKeepsTheQueueAndTheNextStartSendsWhatIsLeft() {
        let dir = makeTempDirectory()
        let rig = SenderRig(directory: dir)
        rig.transport.fallback = .networkError("x")
        rig.submit(1, 2)
        rig.sender.stop(); rig.idle()
        XCTAssertEqual(rig.sender.state().queued, 2)
        XCTAssertEqual(LocationQueue(directory: dir, maxQueue: 10).count, 2) // on disk too
        rig.sender.submit(makeFix(3)); rig.idle()      // arrives while stopped: ignored, not queued
        XCTAssertEqual(rig.sender.state().queued, 2)
        rig.transport.fallback = .response(status: 200)
        let attempts = rig.transport.requests.count
        rig.sender.start(); rig.idle()
        XCTAssertEqual(Array(rig.transport.indices.dropFirst(attempts)), [1, 2])
        XCTAssertEqual(rig.sender.state().queued, 0)
    }

    func testNothingIsSentWhenNotConfigured() {
        let rig = SenderRig(config: nil)
        rig.submit(1)
        XCTAssertEqual(rig.transport.requests.count, 0)
        XCTAssertFalse(rig.sender.state().enabled)
    }

    func testAQueueLeftByAnEarlierRunIsSentOnlyOnStart() {
        let dir = makeTempDirectory()
        let offline = SenderRig(directory: dir)
        offline.transport.fallback = .networkError("x")
        offline.submit(1, 2)
        XCTAssertEqual(offline.sender.state().queued, 2)

        let rig = SenderRig(directory: dir, started: false)
        XCTAssertEqual(rig.sender.state().queued, 2)
        XCTAssertEqual(rig.transport.requests.count, 0)
        rig.sender.start(); rig.idle()
        XCTAssertEqual(rig.transport.indices, [1, 2])
        XCTAssertEqual(rig.sender.state().queued, 0)
    }

    func testTheRequestCarriesUrlHeadersAndTheCanonicalBody() {
        let rig = SenderRig()
        rig.submit(5)
        let request = rig.transport.requests[0]
        XCTAssertEqual(request.url.absoluteString, testURL)
        XCTAssertEqual(request.headers, ["Authorization": "Bearer secret-token"])
        XCTAssertEqual(String(data: request.body, encoding: .utf8),
                       #"{"location":{"lat":0.005,"lng":-122.5,"v":"1.0"},"driver_id":42}"#)
    }

    func testFixesAreSentInOrderOneRequestEach() {
        let rig = SenderRig()
        rig.submit(1, 2, 3, 4)
        XCTAssertEqual(rig.transport.indices, [1, 2, 3, 4])
        XCTAssertEqual(rig.sender.state().queued, 0)
        XCTAssertEqual(rig.delegate.http.count, 4)
        XCTAssertTrue(rig.delegate.http.allSatisfy { $0.success && $0.status == 200 })
    }

    func testOnlyOneRequestIsInFlightAtATime() {
        let rig = SenderRig()
        rig.transport.holdCompletions = true
        rig.submit(1, 2, 3)
        XCTAssertEqual(rig.transport.indices, [1])
        rig.transport.release(.response(status: 200)); rig.idle()
        XCTAssertEqual(rig.transport.indices, [1, 2])
        rig.transport.release(.response(status: 204)); rig.idle()
        rig.transport.release(.response(status: 201)); rig.idle()
        XCTAssertEqual(rig.transport.indices, [1, 2, 3])
        XCTAssertEqual(rig.sender.state().queued, 0)
    }

    func testSnapshot() {
        let rig = SenderRig()
        var state = rig.sender.state()
        XCTAssertTrue(state.enabled)
        XCTAssertTrue(state.tracking)
        XCTAssertNil(state.lastHttpStatus)
        XCTAssertNil(state.lastLocationAt)
        rig.transport.enqueue(.response(status: 503))
        rig.submit(1)
        state = rig.sender.state()
        XCTAssertEqual(state.queued, 1)
        XCTAssertEqual(state.lastHttpStatus, 503)
        XCTAssertEqual(state.lastLocationAt, rig.scheduler.now)
        XCTAssertEqual(state.authorization, .notDetermined)
        XCTAssertTrue(state.servicesEnabled)
    }

    // MARK: - Each kind of answer

    func test2xxRemovesAndGoesOn() {
        let rig = SenderRig()
        rig.transport.enqueue(.response(status: 200), .response(status: 201), .response(status: 299))
        rig.submit(1, 2, 3)
        XCTAssertEqual(rig.sender.state().queued, 0)
        XCTAssertEqual(rig.scheduler.pendingDelays, [])
        XCTAssertEqual(rig.sender.state().lastHttpStatus, 299)
    }

    func testNetworkErrorKeepsTheFixAndRetriesByTheBackoff() {
        let rig = SenderRig()
        rig.transport.fallback = .networkError("NSURLErrorDomain/-1009")
        rig.submit(1)
        XCTAssertEqual(rig.sender.state().queued, 1)
        XCTAssertNil(rig.sender.state().lastHttpStatus) // no answer, no status
        XCTAssertEqual(rig.scheduler.pendingDelays, [5])
        XCTAssertEqual(rig.fireRetry(), 5)
        XCTAssertEqual(rig.scheduler.pendingDelays, [15])
        XCTAssertEqual(rig.fireRetry(), 15)
        XCTAssertEqual(rig.fireRetry(), 60)
        XCTAssertEqual(rig.fireRetry(), 60)
        XCTAssertEqual(rig.scheduler.pendingDelays, [60])
        XCTAssertEqual(rig.transport.indices, [1, 1, 1, 1, 1]) // the same fix, five attempts
        XCTAssertEqual(rig.sender.state().queued, 1)
        XCTAssertTrue(rig.delegate.http.isEmpty) // a network error raises no onHttp
    }

    func test5xxKeepsTheFixAndRetriesByTheBackoff() {
        let rig = SenderRig()
        rig.transport.fallback = .response(status: 503)
        rig.submit(1)
        XCTAssertEqual(rig.scheduler.pendingDelays, [5])
        rig.fireRetry()
        XCTAssertEqual(rig.scheduler.pendingDelays, [15])
        XCTAssertEqual(rig.sender.state().queued, 1)
        XCTAssertEqual(rig.delegate.http.map { $0.status }, [503, 503])
        XCTAssertTrue(rig.delegate.http.allSatisfy { !$0.success })
    }

    func test408And429AreRetriedLikeA5xx() {
        for status in [408, 429, 500, 599] {
            let rig = SenderRig()
            rig.transport.enqueue(.response(status: status), .response(status: status))
            rig.submit(1, 2)
            XCTAssertEqual(rig.transport.indices, [1], "status \(status)")
            XCTAssertEqual(rig.sender.state().queued, 2, "status \(status)")
            XCTAssertEqual(rig.scheduler.pendingDelays, [5], "status \(status)")
            XCTAssertEqual(rig.fireRetry(), 5)
            XCTAssertEqual(rig.scheduler.pendingDelays, [15], "status \(status)")
            XCTAssertEqual(rig.fireRetry(), 15)       // answered 200 now: both go, in order
            XCTAssertEqual(rig.transport.indices, [1, 1, 1, 2], "status \(status)")
            XCTAssertEqual(rig.sender.state().queued, 0, "status \(status)")
            XCTAssertFalse(rig.delegate.states.contains(.unauthorized))
        }
    }

    func test1xxAnd3xxDropTheFixAndGoOn() {
        for status in [100, 301, 302, 304, 307, 308] {
            let rig = SenderRig()
            rig.transport.enqueue(.response(status: status))
            rig.submit(1, 2)
            XCTAssertEqual(rig.transport.indices, [1, 2], "status \(status)")
            XCTAssertEqual(rig.sender.state().queued, 0, "status \(status)")
            XCTAssertEqual(rig.scheduler.pendingDelays, [], "status \(status)")
        }
    }

    func testARetrySucceedsAndTheBackoffResets() {
        let rig = SenderRig()
        rig.transport.enqueue(.networkError("x"), .networkError("x"), .response(status: 200))
        rig.submit(1)
        rig.fireRetry()          // 5 s
        rig.fireRetry()          // 15 s, succeeds
        XCTAssertEqual(rig.sender.state().queued, 0)
        XCTAssertEqual(rig.scheduler.pendingDelays, [])
        rig.transport.enqueue(.networkError("x"))
        rig.submit(2)            // fails again: the sequence starts over at 5 s
        XCTAssertEqual(rig.scheduler.pendingDelays, [5])
    }

    func testOther4xxDropsThatFixAndGoesOn() {
        for status in [400, 403, 404, 405, 409, 410, 413, 422, 451, 499] {
            let rig = SenderRig()
            rig.transport.enqueue(.response(status: status))
            rig.submit(1, 2)
            XCTAssertEqual(rig.transport.indices, [1, 2], "status \(status)")
            XCTAssertEqual(rig.sender.state().queued, 0, "status \(status)")
            XCTAssertEqual(rig.scheduler.pendingDelays, [], "status \(status)")
            XCTAssertEqual(rig.delegate.http.first?.success, false)
            XCTAssertEqual(rig.delegate.http.first?.status, status)
            XCTAssertFalse(rig.delegate.states.contains(.unauthorized))
        }
    }

    func testA4xxInTheMiddleOfAQueueDropsOnlyThatFix() {
        let rig = SenderRig()
        rig.transport.fallback = .networkError("x")
        rig.submit(1, 2, 3)
        rig.transport.enqueue(.response(status: 200), .response(status: 400), .response(status: 200))
        rig.sender.connectivityRestored(); rig.idle()
        XCTAssertEqual(Array(rig.transport.indices.suffix(3)), [1, 2, 3])
        XCTAssertEqual(rig.sender.state().queued, 0)
    }

    // MARK: - 401

    func test401StopsKeepsTheQueueAndReportsOnce() {
        let rig = SenderRig()
        rig.transport.fallback = .response(status: 401)
        rig.submit(1, 2, 3)
        XCTAssertEqual(rig.transport.indices, [1])
        XCTAssertEqual(rig.sender.state().queued, 3)
        XCTAssertEqual(rig.delegate.states.filter { $0 == .unauthorized }.count, 1)
        XCTAssertEqual(rig.scheduler.pendingDelays, [])
        // More fixes, a flush and the network coming back send nothing and report nothing more.
        rig.submit(4, 5)
        rig.sender.flush(); rig.sender.connectivityRestored(); rig.idle()
        XCTAssertEqual(rig.transport.indices, [1])
        XCTAssertEqual(rig.sender.state().queued, 5)
        XCTAssertEqual(rig.delegate.states.filter { $0 == .unauthorized }.count, 1)
        XCTAssertEqual(rig.delegate.http.filter { $0.status == 401 }.count, 1)
        XCTAssertEqual(rig.sender.state().lastHttpStatus, 401)
    }

    func testResumesAfterNewHeadersInOrderWithTheNewToken() {
        let rig = SenderRig()
        rig.transport.enqueue(.response(status: 401))
        rig.submit(1, 2)
        XCTAssertEqual(rig.transport.indices, [1])
        rig.sender.updateHeaders(["Authorization": "Bearer new-token"]); rig.idle()
        XCTAssertEqual(rig.transport.indices, [1, 1, 2])
        XCTAssertEqual(rig.transport.requests[0].headers["Authorization"], "Bearer secret-token")
        XCTAssertEqual(rig.transport.requests[1].headers["Authorization"], "Bearer new-token")
        XCTAssertEqual(rig.transport.requests[2].headers["Authorization"], "Bearer new-token")
        XCTAssertEqual(rig.sender.state().queued, 0)
    }

    func testAnotherRevocationIsReportedAgainAfterResuming() {
        let rig = SenderRig()
        rig.transport.fallback = .response(status: 401)
        rig.submit(1)
        rig.sender.updateHeaders(["Authorization": "Bearer second"]); rig.idle()
        XCTAssertEqual(rig.delegate.states.filter { $0 == .unauthorized }.count, 2)
        XCTAssertEqual(rig.transport.requests.count, 2)
    }

    func testTheSameHeadersDoNotResume() {
        let rig = SenderRig()
        rig.transport.fallback = .response(status: 401)
        rig.submit(1)
        rig.sender.updateHeaders(["Authorization": "Bearer secret-token"]); rig.idle()
        XCTAssertEqual(rig.transport.requests.count, 1)
        XCTAssertEqual(rig.delegate.states.filter { $0 == .unauthorized }.count, 1)
    }

    func testReconfiguringWithANewTokenResumes() {
        let rig = SenderRig()
        rig.transport.enqueue(.response(status: 401))
        rig.submit(1)
        rig.sender.configure(makeConfig(token: "fresh")); rig.idle()
        XCTAssertEqual(rig.transport.requests.last?.headers["Authorization"], "Bearer fresh")
        XCTAssertEqual(rig.sender.state().queued, 0)
    }

    func testAnAnswerToTheOldTokenDoesNotLatchTheNewOne() {
        let rig = SenderRig()
        rig.transport.holdCompletions = true
        rig.submit(1)                                   // request with the old token is in flight
        rig.sender.updateHeaders(["Authorization": "Bearer new"]); rig.idle()
        rig.transport.release(.response(status: 401)); rig.idle() // the old one is refused
        XCTAssertFalse(rig.delegate.states.contains(.unauthorized))
        XCTAssertEqual(rig.transport.requests.count, 2) // retried with the new token
        XCTAssertEqual(rig.transport.requests[1].headers["Authorization"], "Bearer new")
        rig.transport.release(.response(status: 200)); rig.idle()
        XCTAssertEqual(rig.sender.state().queued, 0)
    }

    func testNewHeadersWhileBackingOffRetryAtOnce() {
        let rig = SenderRig()
        rig.transport.enqueue(.networkError("x"))
        rig.submit(1)
        XCTAssertEqual(rig.scheduler.pendingDelays, [5])
        rig.sender.updateHeaders(["Authorization": "Bearer other"]); rig.idle()
        XCTAssertEqual(rig.transport.requests.count, 2)
        XCTAssertEqual(rig.scheduler.pendingDelays, [])
    }

    // MARK: - Connectivity, new fixes

    func testConnectivityRestoredTriesAtOnceAndCancelsTheTimer() {
        let rig = SenderRig()
        rig.transport.enqueue(.networkError("x"))
        rig.submit(1)
        XCTAssertEqual(rig.scheduler.pendingDelays, [5])
        rig.sender.connectivityRestored(); rig.idle()
        XCTAssertEqual(rig.transport.indices, [1, 1])
        XCTAssertEqual(rig.sender.state().queued, 0)
        XCTAssertEqual(rig.scheduler.pendingDelays, [])
    }

    func testANewFixWhileBackingOffTriesAtOnce() {
        let rig = SenderRig()
        rig.transport.enqueue(.networkError("x"))
        rig.submit(1)
        rig.submit(2)
        XCTAssertEqual(rig.transport.indices, [1, 1, 2])
        XCTAssertEqual(rig.sender.state().queued, 0)
        XCTAssertEqual(rig.scheduler.pendingDelays, [])
    }

    func testFlushSendsTheQueueNow() {
        let rig = SenderRig()
        rig.transport.enqueue(.response(status: 500))
        rig.submit(1)
        rig.sender.flush(); rig.idle()
        XCTAssertEqual(rig.sender.state().queued, 0)
    }

    func testManyFixesWhileOfflineAreDeliveredInOrderAfterReconnecting() {
        let rig = SenderRig()
        rig.transport.fallback = .networkError("x")
        (1...60).forEach { rig.sender.submit(makeFix($0)) }
        rig.idle()
        XCTAssertEqual(rig.sender.state().queued, 60)
        let attemptsOffline = rig.transport.requests.count
        rig.transport.fallback = .response(status: 200)
        rig.sender.connectivityRestored(); rig.idle()
        XCTAssertEqual(rig.sender.state().queued, 0)
        let delivered = Array(rig.transport.indices.dropFirst(attemptsOffline))
        XCTAssertEqual(delivered, Array(1...60))
        XCTAssertEqual(rig.scheduler.pendingDelays, [])
    }

    func testTheBoundDropsTheOldestWhileOffline() {
        let rig = SenderRig(config: makeConfig(maxQueue: 3))
        rig.transport.fallback = .networkError("x")
        (1...6).forEach { rig.sender.submit(makeFix($0)) }
        rig.idle()
        XCTAssertEqual(rig.sender.state().queued, 3)
        let attempts = rig.transport.requests.count
        rig.transport.fallback = .response(status: 200)
        rig.sender.flush(); rig.idle()
        XCTAssertEqual(Array(rig.transport.indices.dropFirst(attempts)), [4, 5, 6])
    }

    func testStopCancelsTheRetryTimer() {
        let rig = SenderRig()
        rig.transport.fallback = .networkError("x")
        rig.submit(1)
        XCTAssertEqual(rig.scheduler.pendingDelays, [5])
        rig.sender.stop(); rig.idle()
        XCTAssertEqual(rig.scheduler.pendingDelays, [])
        let count = rig.transport.requests.count
        rig.sender.connectivityRestored(); rig.sender.flush(); rig.idle()
        XCTAssertEqual(rig.transport.requests.count, count)
        XCTAssertEqual(rig.sender.state().queued, 1) // kept for the next start
    }

    // MARK: - Persistence, ownership

    func testAFixQueuedBeforeAKillIsSentByTheNextInstance() {
        let dir = makeTempDirectory()
        let first = SenderRig(directory: dir)
        first.transport.fallback = .networkError("x")
        first.submit(1, 2, 3)
        let second = SenderRig(directory: dir)
        XCTAssertEqual(second.transport.indices, [1, 2, 3])
        XCTAssertEqual(second.sender.state().queued, 0)
    }

    func testAnotherEndpointClearsTheQueue() {
        let dir = makeTempDirectory()
        let first = SenderRig(directory: dir)
        first.transport.fallback = .networkError("x")
        first.submit(1, 2)
        let other = "https://api.example.com/v1/en/project/users/99/locations"
        let second = SenderRig(directory: dir, config: makeConfig(url: other))
        XCTAssertEqual(second.transport.requests.count, 0) // driver 42's positions are not sent as driver 99
        XCTAssertEqual(second.sender.state().queued, 0)
    }

    func testReconfiguringWithTheSameEndpointKeepsTheQueue() {
        let rig = SenderRig()
        rig.transport.fallback = .networkError("x")
        rig.submit(1)
        rig.sender.configure(makeConfig(token: "other")); rig.idle()
        XCTAssertEqual(rig.sender.state().queued, 1) // kept: the endpoint is the same
        XCTAssertGreaterThanOrEqual(rig.transport.requests.count, 2)
        XCTAssertEqual(rig.transport.requests.last?.headers["Authorization"], "Bearer other")
    }

    func testClearQueue() {
        let rig = SenderRig()
        rig.transport.fallback = .networkError("x")
        rig.submit(1, 2)
        rig.sender.clearQueue(); rig.idle()
        XCTAssertEqual(rig.sender.state().queued, 0)
    }

    // MARK: - What the delegate hears for the log lines

    func testTheDelegateHearsTheExactRequestBodyAndTheQueueSize() {
        let rig = SenderRig()
        rig.submit(1)
        XCTAssertEqual(rig.delegate.requests.map { $0.body }, [String(data: rig.transport.requests[0].body, encoding: .utf8)!])
        XCTAssertEqual(rig.delegate.requests.map { $0.queued }, [1])
    }

    func testARetryIsReportedWithItsDelayAndItsCause() {
        let rig = SenderRig()
        rig.transport.enqueue(.networkError("x"), .response(status: 503), .response(status: 429))
        rig.submit(1)
        rig.scheduler.fireNext(); rig.idle()
        rig.scheduler.fireNext(); rig.idle()
        XCTAssertEqual(rig.delegate.retries.map { $0.delay }, [5, 15, 60])
        XCTAssertEqual(rig.delegate.retries.map { $0.status }, [nil, 503, 429])
        XCTAssertEqual(rig.delegate.retries.map { $0.queued }, [1, 1, 1])
    }

    // MARK: - Mock policy and invalid fixes

    func testASimulatedFixIsDroppedInReleaseAndReported() {
        let rig = SenderRig(release: true)
        rig.sender.submit(makeFix(1, mock: true)); rig.idle()
        XCTAssertEqual(rig.transport.requests.count, 0)
        XCTAssertEqual(rig.sender.state().queued, 0)
        XCTAssertEqual(rig.delegate.states, [.mockRejected])
        XCTAssertTrue(rig.delegate.accepted.isEmpty)
        XCTAssertNil(rig.sender.state().lastLocationAt)
        rig.submit(2) // real fixes still go
        XCTAssertEqual(rig.transport.indices, [2])
    }

    func testASimulatedFixIsSentAsRealInDebugAndReportedAsSimulated() {
        let rig = SenderRig(release: false)
        rig.sender.submit(makeFix(1, mock: true)); rig.idle()
        XCTAssertEqual(rig.transport.requests.count, 1)
        let body = String(data: rig.transport.requests[0].body, encoding: .utf8)!
        XCTAssertFalse(body.contains("mock")) // sent as a real one: no `mock` key at all
        XCTAssertFalse(rig.delegate.states.contains(.mockRejected))
        XCTAssertEqual(rig.delegate.accepted.map { $0.mock }, [true]) // the event tells the truth
        XCTAssertEqual(rig.sender.state().queued, 0)
    }

    func testASimulatedFixIsDroppedInDebugWhenRejectMockIsOn() {
        let rig = SenderRig(release: false, config: makeConfig(rejectMock: true))
        rig.sender.submit(makeFix(1, mock: true)); rig.idle()
        XCTAssertEqual(rig.transport.requests.count, 0)
        XCTAssertEqual(rig.sender.state().queued, 0)
        XCTAssertEqual(rig.delegate.states, [.mockRejected])
        XCTAssertTrue(rig.delegate.accepted.isEmpty)
        rig.submit(2) // a real fix still goes
        XCTAssertEqual(rig.transport.indices, [2])
    }

    func testReleaseDropsASimulatedFixEvenWithRejectMockOff() {
        let rig = SenderRig(release: true, config: makeConfig(rejectMock: false))
        rig.sender.submit(makeFix(1, mock: true)); rig.idle()
        XCTAssertEqual(rig.transport.requests.count, 0)
        XCTAssertEqual(rig.delegate.states, [.mockRejected])
    }

    func testARealFixIsUnaffectedByRejectMock() {
        let rig = SenderRig(release: false, config: makeConfig(rejectMock: true))
        rig.submit(1)
        XCTAssertEqual(rig.transport.indices, [1])
        XCTAssertEqual(rig.delegate.accepted.map { $0.mock }, [false])
    }

    func testRejectMockCanBeSwitchedByALaterConfigure() {
        let rig = SenderRig(release: false, config: makeConfig(rejectMock: false))
        rig.sender.submit(makeFix(1, mock: true)); rig.idle()
        XCTAssertEqual(rig.transport.requests.count, 1)
        rig.sender.configure(makeConfig(rejectMock: true)); rig.idle()
        rig.sender.submit(makeFix(2, mock: true)); rig.idle()
        XCTAssertEqual(rig.transport.requests.count, 1) // dropped now
        XCTAssertEqual(rig.delegate.states, [.mockRejected])
        rig.sender.configure(makeConfig(rejectMock: false)); rig.idle()
        rig.sender.submit(makeFix(3, mock: true)); rig.idle()
        XCTAssertEqual(rig.transport.requests.count, 2)
    }

    func testInvalidFixesAreIgnored() {
        let rig = SenderRig()
        rig.sender.submit(LocationFix(lat: .nan, lng: 0, accuracy: 1, speed: nil, timestamp: Date(), mock: false))
        rig.sender.submit(LocationFix(lat: 95, lng: 0, accuracy: 1, speed: nil, timestamp: Date(), mock: false))
        rig.sender.submit(LocationFix(lat: 1, lng: 0, accuracy: -1, speed: nil, timestamp: Date(), mock: false))
        rig.idle()
        XCTAssertEqual(rig.transport.requests.count, 0)
        XCTAssertTrue(rig.delegate.accepted.isEmpty)
    }

    func testAcceptedLocationsAreReported() {
        let rig = SenderRig()
        rig.submit(1, 2)
        XCTAssertEqual(rig.delegate.accepted, [makeFix(1), makeFix(2)])
    }

    // MARK: - State events

    func testAuthorizationAndServicesEventsOnlyOnChange() {
        let rig = SenderRig()
        rig.sender.setAuthorization(.authorizedAlways)
        rig.sender.setAuthorization(.authorizedAlways)
        rig.sender.setAuthorization(.denied)
        rig.sender.setServicesEnabled(true)
        rig.sender.setServicesEnabled(false)
        rig.sender.setServicesEnabled(false)
        rig.sender.setServicesEnabled(true)
        rig.idle()
        XCTAssertEqual(rig.delegate.states, [.authorizationChanged, .authorizationChanged, .servicesDisabled, .servicesEnabled])
        XCTAssertEqual(rig.sender.state().authorization, .denied)
        XCTAssertTrue(rig.sender.state().servicesEnabled)
    }

    func testStateCanBeReadFromInsideACallback() {
        let rig = SenderRig()
        var seen: LocationState?
        rig.delegate.onStateHook = { _ in seen = rig.sender.state() }
        rig.sender.setAuthorization(.denied); rig.idle()
        XCTAssertEqual(seen?.authorization, .denied)
    }

    func testTokensNeverAppearInEventsOrStateDescriptions() {
        let rig = SenderRig()
        rig.transport.fallback = .networkError("NSURLErrorDomain/-1009")
        rig.submit(1)
        let dump = "\(rig.sender.state()) \(rig.delegate.http) \(rig.delegate.states)"
        XCTAssertFalse(dump.contains("secret-token"))
    }

    // MARK: - Concurrency

    func testFixesFromManyThreadsAreNeitherLostNorDuplicated() {
        let rig = SenderRig(config: makeConfig(maxQueue: 5000))
        let threads = 8, perThread = 100
        DispatchQueue.concurrentPerform(iterations: threads) { t in
            for i in 0..<perThread { rig.sender.submit(makeFix(t * 1000 + i)) }
        }
        rig.idle()
        let sent = rig.transport.indices
        XCTAssertEqual(sent.count, threads * perThread)
        XCTAssertEqual(Set(sent).count, threads * perThread)
        for t in 0..<threads { // per thread, the order of arrival is kept
            let mine = sent.filter { $0 / 1000 == t }
            XCTAssertEqual(mine, mine.sorted())
        }
        XCTAssertEqual(rig.sender.state().queued, 0)
    }

    func testConcurrentFixesFlushesAndStateReadsWhileOffline() {
        let rig = SenderRig(config: makeConfig(maxQueue: 5000))
        rig.transport.fallback = .networkError("x")
        DispatchQueue.concurrentPerform(iterations: 8) { t in
            for i in 0..<50 {
                rig.sender.submit(makeFix(t * 1000 + i))
                if i % 10 == 0 { rig.sender.connectivityRestored() }
                _ = rig.sender.state()
            }
        }
        rig.idle()
        XCTAssertEqual(rig.sender.state().queued, 400)
        rig.transport.fallback = .response(status: 200)
        let attempts = rig.transport.requests.count
        rig.sender.connectivityRestored(); rig.idle()
        let delivered = Array(rig.transport.indices.dropFirst(attempts))
        XCTAssertEqual(delivered.count, 400)
        XCTAssertEqual(Set(delivered).count, 400)
        for t in 0..<8 {
            let mine = delivered.filter { $0 / 1000 == t }
            XCTAssertEqual(mine, mine.sorted())
        }
    }

    func testTransportAnsweringFromAnotherThread() {
        let rig = SenderRig()
        rig.transport.answerOnBackgroundThread = true
        for i in 1...50 { rig.sender.submit(makeFix(i)) }
        let deadline = Date().addingTimeInterval(5)
        while rig.sender.state().queued > 0 && Date() < deadline { usleep(1000) }
        rig.idle()
        XCTAssertEqual(rig.sender.state().queued, 0)
        XCTAssertEqual(rig.transport.indices, Array(1...50))
    }
}
