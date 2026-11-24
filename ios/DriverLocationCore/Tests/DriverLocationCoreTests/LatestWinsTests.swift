import XCTest
@testable import DriverLocationCore

/// `discardOlderOnSuccess: true`: the newest queued fix is always the one attempted.
final class LatestWinsTests: XCTestCase {
    private func rig(directory: URL = makeTempDirectory(), maxQueue: Int = 500, started: Bool = true) -> SenderRig {
        return SenderRig(directory: directory, config: makeConfig(maxQueue: maxQueue, discardOlderOnSuccess: true), started: started)
    }

    func testFiveFixesQueuedOfflineThenOnlineSendExactlyOneRequestWithTheNewest() {
        let rig = rig()
        rig.transport.fallback = .networkError("x")
        (1...5).forEach { rig.sender.submit(makeFix($0)) }
        rig.idle()
        XCTAssertEqual(rig.sender.state().queued, 5)
        XCTAssertTrue(Set(rig.transport.indices).isSubset(of: [1, 2, 3, 4, 5]))
        let attempts = rig.transport.requests.count
        rig.transport.fallback = .response(status: 200)
        rig.sender.connectivityRestored(); rig.idle()
        XCTAssertEqual(rig.transport.requests.count, attempts + 1) // exactly one request
        XCTAssertEqual(rig.transport.indices.last, 5)              // the newest
        XCTAssertEqual(rig.sender.state().queued, 0)
        XCTAssertEqual(rig.scheduler.pendingDelays, [])
    }

    func testADiscardIsReportedOnceWithHowManyWereDropped() {
        let rig = rig()
        rig.transport.fallback = .networkError("x")
        (1...5).forEach { rig.sender.submit(makeFix($0)) }
        rig.idle()
        rig.transport.fallback = .response(status: 200)
        rig.sender.connectivityRestored(); rig.idle()
        XCTAssertEqual(rig.delegate.discards, [4]) // five queued, the newest sent: four older dropped
    }

    func testNoDiscardIsReportedWhenNothingOlderWasPending() {
        let rig = rig()
        for index in 1...3 { rig.submit(index) } // each one goes out alone
        XCTAssertEqual(rig.transport.indices, [1, 2, 3])
        XCTAssertTrue(rig.delegate.discards.isEmpty)
    }

    func testNoDiscardIsReportedWhenTheOptionIsOff() {
        let rig = SenderRig(config: makeConfig(discardOlderOnSuccess: false))
        rig.transport.fallback = .networkError("x")
        (1...3).forEach { rig.sender.submit(makeFix($0)) }
        rig.idle()
        rig.transport.fallback = .response(status: 200)
        rig.sender.connectivityRestored(); rig.idle()
        XCTAssertTrue(rig.delegate.discards.isEmpty)
    }

    func testANewerFixArrivingDuringARequestSurvivesTheSuccessAndIsSentNext() {
        let rig = rig()
        rig.transport.holdCompletions = true
        rig.submit(1)                       // in flight
        rig.submit(2, 3, 4)                 // newer, arrive during the request
        XCTAssertEqual(rig.transport.indices, [1])
        rig.transport.release(.response(status: 200)); rig.idle()
        XCTAssertEqual(rig.sender.state().queued, 3)        // 2, 3, 4 stay
        XCTAssertEqual(rig.transport.indices, [1, 4])       // the newest of them goes next
        rig.transport.release(.response(status: 200)); rig.idle()
        XCTAssertEqual(rig.sender.state().queued, 0)        // 2 and 3 are gone, never sent
        XCTAssertEqual(rig.transport.indices, [1, 4])
    }

    func testARetryAfter5xxSendsTheNewestOfThatMomentNotTheOneThatFailed() {
        let rig = rig()
        rig.transport.holdCompletions = true
        rig.submit(1)
        rig.submit(2)                                 // queued behind the in flight 1
        rig.transport.release(.response(status: 503)); rig.idle() // 1 fails; 2 is newest
        XCTAssertEqual(rig.transport.indices, [1])
        XCTAssertEqual(rig.scheduler.pendingDelays, [5])
        rig.transport.holdCompletions = false
        rig.fireRetry()
        XCTAssertEqual(rig.transport.indices, [1, 2])  // not 1 again
        XCTAssertEqual(rig.sender.state().queued, 0)
    }

    func testA4xxDropsOnlyThatFixAndTheNextNewestIsTried() {
        let rig = rig()
        rig.transport.fallback = .networkError("x")
        (1...3).forEach { rig.sender.submit(makeFix($0)) }
        rig.idle()
        let attempts = rig.transport.requests.count
        rig.transport.enqueue(.response(status: 422), .response(status: 200))
        rig.sender.connectivityRestored(); rig.idle()
        XCTAssertEqual(Array(rig.transport.indices.dropFirst(attempts)), [3, 2]) // 3 refused and dropped, 2 accepted
        XCTAssertEqual(rig.sender.state().queued, 0)                                // and 1 went with it
    }

    func testA4xxOnTheNewestKeepsTheOlderOnesQueuedUntilOneSucceeds() {
        let rig = rig()
        rig.transport.fallback = .networkError("x")
        (1...3).forEach { rig.sender.submit(makeFix($0)) }
        rig.idle()
        let attempts = rig.transport.requests.count
        rig.transport.enqueue(.response(status: 400), .response(status: 400), .networkError("x"))
        rig.sender.connectivityRestored(); rig.idle()
        XCTAssertEqual(Array(rig.transport.indices.dropFirst(attempts)), [3, 2, 1]) // each refused one is dropped alone
        XCTAssertEqual(rig.sender.state().queued, 1)                                 // 1 failed on the network: kept
    }

    func testRetryCasesKeepTheWholeQueue() {
        for status in [408, 429, 500, 503] {
            let rig = rig()
            rig.transport.enqueue(.response(status: status))
            rig.submit(1)
            XCTAssertEqual(rig.sender.state().queued, 1, "status \(status)")
            XCTAssertEqual(rig.scheduler.pendingDelays, [5], "status \(status)")
        }
    }

    func test401KeepsTheQueueAndResumesWithTheNewestAfterNewHeaders() {
        let rig = rig()
        rig.transport.enqueue(.response(status: 401))
        rig.submit(1, 2, 3)
        XCTAssertEqual(rig.transport.indices, [1])
        XCTAssertEqual(rig.sender.state().queued, 3)
        XCTAssertEqual(rig.delegate.states.filter { $0 == .unauthorized }.count, 1)
        rig.sender.updateHeaders(["Authorization": "Bearer new"]); rig.idle()
        XCTAssertEqual(rig.transport.indices, [1, 3])
        XCTAssertEqual(rig.sender.state().queued, 0)
    }

    func testANewInstanceOverTheSameDirectorySendsTheNewest() {
        let dir = makeTempDirectory()
        let first = rig(directory: dir)
        first.transport.fallback = .networkError("x")
        (1...4).forEach { first.sender.submit(makeFix($0)) }
        first.idle()
        let second = rig(directory: dir)
        XCTAssertEqual(second.transport.indices, [4])
        XCTAssertEqual(second.sender.state().queued, 0)
    }

    func testAFixOlderThanTheLastOneSentIsDroppedOnArrival() {
        let rig = rig()
        rig.submit(5)
        XCTAssertEqual(rig.transport.indices, [5])
        rig.submit(3)                                   // older than 5: never go back in time
        XCTAssertEqual(rig.transport.indices, [5])
        XCTAssertEqual(rig.sender.state().queued, 0)
        XCTAssertEqual(rig.delegate.accepted.map { $0.lat }, [0.005]) // not even reported as accepted
        rig.submit(6)
        XCTAssertEqual(rig.transport.indices, [5, 6])
    }

    func testTheLastSentSurvivesStopAndStart() {
        let rig = rig()
        rig.submit(5)
        rig.sender.stop(); rig.idle()
        rig.sender.start(); rig.idle()
        rig.submit(2)
        XCTAssertEqual(rig.transport.indices, [5])
        rig.submit(7)
        XCTAssertEqual(rig.transport.indices, [5, 7])
    }

    func testAnOlderFixIsKeptWhenNothingNewerWasSentYet() {
        let rig = rig()
        rig.transport.fallback = .networkError("x")
        rig.submit(5)
        rig.submit(3)               // 5 only failed: nothing was sent, so 3 is not "older than the last sent"
        XCTAssertEqual(rig.sender.state().queued, 2)
    }

    func testNothingSentFailsDoesNotMoveTheLastSent() {
        let rig = rig()
        rig.transport.enqueue(.response(status: 400))   // 5 refused: not a success
        rig.submit(5)
        rig.submit(3)
        XCTAssertEqual(rig.transport.indices, [5, 3])
    }

    func testSwitchingTheOptionAtRunTime() {
        let rig = rig()
        rig.transport.fallback = .networkError("x")
        (1...3).forEach { rig.sender.submit(makeFix($0)) }
        rig.idle()
        rig.sender.configure(makeConfig(discardOlderOnSuccess: false)); rig.idle()
        let attempts = rig.transport.requests.count
        rig.transport.fallback = .response(status: 200)
        rig.sender.flush(); rig.idle()
        XCTAssertEqual(Array(rig.transport.indices.dropFirst(attempts)), [1, 2, 3]) // FIFO now
        // And back.
        rig.transport.fallback = .networkError("x")
        (4...6).forEach { rig.sender.submit(makeFix($0)) }
        rig.idle()
        rig.sender.configure(makeConfig(discardOlderOnSuccess: true)); rig.idle()
        let attempts2 = rig.transport.requests.count
        rig.transport.fallback = .response(status: 200)
        rig.sender.flush(); rig.idle()
        XCTAssertEqual(Array(rig.transport.indices.dropFirst(attempts2)), [6])
        XCTAssertEqual(rig.sender.state().queued, 0)
    }

    func testTheBoundStillDropsTheOldest() {
        let rig = rig(maxQueue: 3)
        rig.transport.fallback = .networkError("x")
        (1...6).forEach { rig.sender.submit(makeFix($0)) }
        rig.idle()
        XCTAssertEqual(rig.sender.state().queued, 3)
        let attempts = rig.transport.requests.count
        rig.transport.fallback = .response(status: 200)
        rig.sender.flush(); rig.idle()
        XCTAssertEqual(Array(rig.transport.indices.dropFirst(attempts)), [6])
        XCTAssertEqual(rig.sender.state().queued, 0)
    }

    func testTheOrderIsTheArrivalOrderNotTheTimestampOrder() {
        // Debug-build style: a fix queued later but stamped earlier (nothing sent yet) is still "newest in the queue".
        let rig = rig()
        rig.transport.fallback = .networkError("x")
        rig.submit(9)
        rig.submit(2)
        let attempts = rig.transport.requests.count
        rig.transport.fallback = .response(status: 200)
        rig.sender.flush(); rig.idle()
        XCTAssertEqual(Array(rig.transport.indices.dropFirst(attempts)), [2])
        XCTAssertEqual(rig.sender.state().queued, 0)
    }

    // MARK: - Both modes

    func testConcurrencyHoldsInBothModes() {
        for latest in [false, true] {
            let rig = SenderRig(config: makeConfig(maxQueue: 5000, discardOlderOnSuccess: latest))
            rig.transport.answerOnBackgroundThread = true
            DispatchQueue.concurrentPerform(iterations: 8) { t in
                for i in 0..<100 { rig.sender.submit(makeFix(t * 1000 + i)) }
            }
            let deadline = Date().addingTimeInterval(10)
            while rig.sender.state().queued > 0 && Date() < deadline { usleep(1000) }
            rig.idle()
            let sent = rig.transport.indices
            XCTAssertEqual(rig.sender.state().queued, 0, "latest=\(latest)")
            XCTAssertEqual(Set(sent).count, sent.count, "nothing sent twice, latest=\(latest)")
            if latest {
                XCTAssertGreaterThan(sent.count, 0)
            } else {
                XCTAssertEqual(sent.count, 800)
            }
        }
    }

    func testInLatestWinsNothingOlderIsSentAfterSomethingNewer() {
        // Fixes arrive in strictly increasing timestamp order from several threads' point of view via one
        // serial feeder; after an outage the transport sees an increasing sequence, never a step back.
        let rig = SenderRig(config: makeConfig(maxQueue: 5000, discardOlderOnSuccess: true))
        rig.transport.answerOnBackgroundThread = true
        let counter = NSLock()
        var next = 1
        DispatchQueue.concurrentPerform(iterations: 8) { _ in
            for _ in 0..<100 {
                counter.lock()
                let i = next; next += 1
                rig.sender.submit(makeFix(i)) // submitted while holding the lock: arrival order == timestamp order
                counter.unlock()
            }
        }
        let deadline = Date().addingTimeInterval(10)
        while rig.sender.state().queued > 0 && Date() < deadline { usleep(1000) }
        rig.idle()
        let sent = rig.transport.indices
        XCTAssertEqual(sent, sent.sorted())
        XCTAssertEqual(Set(sent).count, sent.count)
        XCTAssertEqual(sent.last, 800)
    }

    func testFIFOModeStillSendsTheWholeRouteInOrder() {
        let rig = SenderRig(config: makeConfig(discardOlderOnSuccess: false))
        rig.transport.fallback = .networkError("x")
        (1...5).forEach { rig.sender.submit(makeFix($0)) }
        rig.idle()
        let attempts = rig.transport.requests.count
        rig.transport.fallback = .response(status: 200)
        rig.sender.flush(); rig.idle()
        XCTAssertEqual(Array(rig.transport.indices.dropFirst(attempts)), [1, 2, 3, 4, 5])
    }
}
