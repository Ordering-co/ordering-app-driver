import XCTest
@testable import DriverLocationCore

/// `Config.minSendIntervalMs`: a floor between the START of two requests, on a virtual monotonic clock.
/// (Times are multiples of 0.25 s so the virtual `Date` arithmetic is exact.)
final class MinSendIntervalTests: XCTestCase {
    private func rig(interval: Int, latestWins: Bool = true, started: Bool = true) -> SenderRig {
        return SenderRig(config: makeConfig(discardOlderOnSuccess: latestWins, minSendIntervalMs: interval), started: started)
    }

    private func feed(_ rig: SenderRig, _ index: Int) { rig.submit(index) }

    func testZeroIsTodaysBehaviourEveryFixGoesOutAtOnce() {
        for latestWins in [false, true] {
            let rig = rig(interval: 0, latestWins: latestWins)
            (1...3).forEach { feed(rig, $0) }
            XCTAssertEqual(rig.transport.indices, [1, 2, 3])
            XCTAssertEqual(rig.scheduler.pendingDelays, [])
        }
    }

    func testTheFirstRequestIsNeverDelayed() {
        let rig = rig(interval: 1500)
        feed(rig, 1)
        XCTAssertEqual(rig.transport.indices, [1])
    }

    func testTwoFixesInsideTheIntervalGiveOneRequestNowAndOneWithTheNewestAtTheInterval() {
        let rig = rig(interval: 1500)
        let origin = rig.scheduler.now
        feed(rig, 1)                       // t=0: sent
        rig.advance(0.25); feed(rig, 2)
        rig.advance(0.25); feed(rig, 3)    // t=0.5
        XCTAssertEqual(rig.transport.indices, [1])
        XCTAssertEqual(rig.scheduler.pendingDelays, [1.25]) // one timer for the remaining wait
        rig.advance(0.75)
        XCTAssertEqual(rig.transport.indices, [1])
        rig.advance(0.25)                  // t=1.5: the timer fires, no new fix needed
        XCTAssertEqual(rig.transport.indices, [1, 3]) // the newest; 2 is never sent
        XCTAssertEqual(rig.startTimes(since: origin), [0, 1.5])
        XCTAssertEqual(rig.sender.state().queued, 0)
        XCTAssertEqual(rig.delegate.discards, [1])
        XCTAssertEqual(rig.scheduler.pendingDelays, [])
    }

    func testTheWaitIsAnnouncedOnceNotPerFix() {
        let rig = rig(interval: 1500)
        feed(rig, 1)
        rig.advance(0.25); feed(rig, 2); feed(rig, 3); feed(rig, 4)
        XCTAssertEqual(rig.delegate.deferred.count, 1)
        XCTAssertEqual(rig.delegate.deferred.first?.delay, 1.25)
        XCTAssertEqual(rig.delegate.deferred.first?.queued, 1)
    }

    func testNoPendingFixMeansNoRequestAndNoTimer() {
        let rig = rig(interval: 1500)
        feed(rig, 1)
        rig.advance(60)
        XCTAssertEqual(rig.transport.indices, [1])
        XCTAssertEqual(rig.scheduler.pendingDelays, [])
        feed(rig, 2)                       // after the interval: at once
        XCTAssertEqual(rig.transport.indices, [1, 2])
    }

    func testTheIntervalCountsFromTheStartOfTheRequestNotFromItsEnd() {
        let rig = rig(interval: 1500)
        let origin = rig.scheduler.now
        rig.transport.holdCompletions = true
        rig.sender.submit(makeFix(1)); rig.idle()      // starts at 0 ...
        rig.advance(1)                                 // ... and takes one second
        rig.transport.release(.response(status: 200)); rig.idle()
        rig.transport.holdCompletions = false
        feed(rig, 2)                                   // t=1: 0.5 s to wait, not 1.5
        XCTAssertEqual(rig.transport.indices, [1])
        rig.advance(0.25); XCTAssertEqual(rig.transport.indices, [1])
        rig.advance(0.25)
        XCTAssertEqual(rig.transport.indices, [1, 2])
        XCTAssertEqual(rig.startTimes(since: origin), [0, 1.5])
    }

    func testAnExactlyElapsedIntervalSendsAtOnce() {
        let rig = rig(interval: 1500)
        feed(rig, 1)
        rig.advance(1.5)
        feed(rig, 2)
        XCTAssertEqual(rig.transport.indices, [1, 2])
        XCTAssertTrue(rig.delegate.deferred.isEmpty)
    }

    // MARK: composing with what exists

    func testAFailedRequestRetriesAtTheBackoffWhenThatIsLongerThanTheInterval() {
        let rig = rig(interval: 1500)
        let origin = rig.scheduler.now
        rig.transport.fallback = .networkError("x")
        feed(rig, 1)
        XCTAssertEqual(rig.delegate.retries.map { $0.delay }, [5])
        rig.advance(4.75); XCTAssertEqual(rig.transport.indices, [1])
        rig.transport.fallback = .response(status: 200)
        rig.advance(0.25)
        XCTAssertEqual(rig.transport.indices, [1, 1])
        XCTAssertEqual(rig.startTimes(since: origin), [0, 5])
        XCTAssertTrue(rig.delegate.deferred.isEmpty)
    }

    func testARetryRespectsTheIntervalWhenThatIsLongerThanTheBackoff() {
        let rig = rig(interval: 20_000)
        let origin = rig.scheduler.now
        rig.transport.fallback = .networkError("x")
        feed(rig, 1)                       // fails; retry in 5 s
        rig.transport.fallback = .response(status: 200)
        rig.advance(5)                     // the retry timer fires: too soon, 15 s left
        XCTAssertEqual(rig.transport.indices, [1])
        XCTAssertEqual(rig.delegate.deferred.map { $0.delay }, [15])
        rig.advance(14.75); XCTAssertEqual(rig.transport.indices, [1])
        rig.advance(0.25)
        XCTAssertEqual(rig.transport.indices, [1, 1])
        XCTAssertEqual(rig.startTimes(since: origin), [0, 20])
    }

    func testANewFixAfterAFailureRetriesAtOnceButNotBeforeTheInterval() {
        let rig = rig(interval: 1500)
        let origin = rig.scheduler.now
        rig.transport.fallback = .networkError("x")
        feed(rig, 1)
        rig.advance(0.25)
        rig.transport.fallback = .response(status: 200)
        feed(rig, 2)                       // today a new fix retries at once: here, at the interval
        XCTAssertEqual(rig.transport.indices, [1])
        rig.advance(1.25)
        XCTAssertEqual(rig.transport.indices, [1, 2]) // the newest of that moment
        XCTAssertEqual(rig.startTimes(since: origin), [0, 1.5])
        XCTAssertEqual(rig.sender.state().queued, 0)
    }

    func testTheFlushAfterAnOutageIsPacedByTheIntervalInFifoMode() {
        let rig = rig(interval: 1500, latestWins: false)
        rig.transport.fallback = .networkError("x")
        (1...4).forEach { feed(rig, $0) }
        XCTAssertEqual(rig.sender.state().queued, 4)
        rig.advance(600)                                // a long outage, retries every minute meanwhile
        rig.transport.fallback = .response(status: 200)
        let before = rig.transport.requests.count
        let origin = rig.scheduler.now
        rig.sender.connectivityRestored(); rig.idle()
        rig.advance(10)
        XCTAssertEqual(Array(rig.transport.indices.dropFirst(before)), [1, 2, 3, 4])
        let times = Array(rig.startTimes(since: origin).dropFirst(before))
        XCTAssertEqual(zip(times.dropFirst(), times).map { $0 - $1 }, [1.5, 1.5, 1.5]) // never a burst
        XCTAssertEqual(rig.sender.state().queued, 0)
    }

    func testTheFlushAfterAnOutageInLatestWinsIsOneRequest() {
        let rig = rig(interval: 1500)
        rig.transport.fallback = .networkError("x")
        (1...5).forEach { feed(rig, $0); rig.advance(0.25) }
        rig.advance(120)
        rig.transport.fallback = .response(status: 200)
        let before = rig.transport.requests.count
        rig.sender.connectivityRestored(); rig.idle()
        rig.advance(10)
        XCTAssertEqual(Array(rig.transport.indices.dropFirst(before)), [5])
        XCTAssertEqual(rig.sender.state().queued, 0)
    }

    func testAFlushOrReconnectInsideTheIntervalWaitsForIt() {
        let rig = rig(interval: 1500)
        let origin = rig.scheduler.now
        feed(rig, 1)
        rig.transport.fallback = .networkError("x")
        rig.advance(0.25); feed(rig, 2)                 // deferred; attempted at 1.5 and fails
        rig.advance(1.25)
        XCTAssertEqual(rig.transport.requests.count, 2)
        rig.transport.fallback = .response(status: 200)
        rig.advance(0.25)                               // t=1.75, 0.25 after the failed attempt
        rig.sender.connectivityRestored(); rig.idle()
        rig.sender.flush(); rig.idle()
        XCTAssertEqual(rig.transport.requests.count, 2)
        rig.advance(1.25)                               // t=3 = 1.5 + 1.5
        XCTAssertEqual(rig.transport.requests.count, 3)
        XCTAssertEqual(rig.startTimes(since: origin), [0, 1.5, 3])
    }

    func testStopCancelsThePendingSendAndNothingGoesOutAfterIt() {
        let rig = rig(interval: 1500)
        feed(rig, 1)
        rig.advance(0.25); feed(rig, 2)
        XCTAssertEqual(rig.scheduler.pendingDelays.count, 1)
        rig.sender.stop(); rig.idle()
        XCTAssertEqual(rig.scheduler.pendingDelays, [])  // the timer is cancelled
        rig.advance(60)
        XCTAssertEqual(rig.transport.indices, [1])
        XCTAssertEqual(rig.sender.state().queued, 1)     // kept on disk, as stop() always did
    }

    func testStartAfterStopSendsWhatIsLeftRespectingTheFloorOfTheLastRequest() {
        let rig = rig(interval: 1500)
        let origin = rig.scheduler.now
        feed(rig, 1)
        rig.advance(0.25); feed(rig, 2)
        rig.sender.stop(); rig.idle()
        rig.advance(0.25)                               // t=0.5
        rig.sender.start(); rig.idle()
        XCTAssertEqual(rig.transport.indices, [1])
        rig.advance(1)
        XCTAssertEqual(rig.transport.indices, [1, 2])
        XCTAssertEqual(rig.startTimes(since: origin), [0, 1.5])
    }

    func testAFixWhileStoppedIsIgnoredAndCreatesNoTimer() {
        let rig = rig(interval: 1500)
        feed(rig, 1)
        rig.sender.stop(); rig.idle()
        feed(rig, 2)
        XCTAssertEqual(rig.scheduler.pendingDelays, [])
        rig.advance(10)
        XCTAssertEqual(rig.transport.indices, [1])
    }

    func testA401StopsTheSendingAndCancelsTheTimer() {
        let rig = rig(interval: 1500)
        rig.transport.fallback = .response(status: 401)
        feed(rig, 1)
        XCTAssertEqual(rig.delegate.states, [.unauthorized])
        feed(rig, 2)
        XCTAssertEqual(rig.scheduler.pendingDelays, [])
        rig.advance(60)
        XCTAssertEqual(rig.transport.indices, [1])
    }

    func testA401AfterAWaitCancelsTheWaitingTimer() {
        let rig = rig(interval: 1500)
        feed(rig, 1)
        rig.advance(0.25); feed(rig, 2)
        XCTAssertEqual(rig.scheduler.pendingDelays.count, 1)
        rig.transport.fallback = .response(status: 401)
        rig.advance(1.25)                               // the deferred request goes out and gets a 401
        XCTAssertEqual(rig.transport.indices, [1, 2])
        XCTAssertEqual(rig.scheduler.pendingDelays, [])
        rig.advance(60)
        XCTAssertEqual(rig.transport.indices, [1, 2])
    }

    func testNewHeadersAfterA401ResumeButStillRespectTheInterval() {
        let rig = rig(interval: 1500)
        let origin = rig.scheduler.now
        rig.transport.fallback = .response(status: 401)
        feed(rig, 1)
        rig.advance(0.5)
        rig.transport.fallback = .response(status: 200)
        rig.sender.updateHeaders(["Authorization": "Bearer new"]); rig.idle()
        XCTAssertEqual(rig.transport.indices, [1])
        rig.advance(1)
        XCTAssertEqual(rig.transport.indices, [1, 1])
        XCTAssertEqual(rig.startTimes(since: origin), [0, 1.5])
    }

    func testChangingTheIntervalWhileWaitingReschedulesTheSend() {
        let rig = rig(interval: 300_000)
        feed(rig, 1)
        rig.advance(0.25); feed(rig, 2)
        XCTAssertEqual(rig.delegate.deferred.map { $0.delay }, [299.75])
        rig.sender.configure(makeConfig(discardOlderOnSuccess: true, minSendIntervalMs: 1500)); rig.idle()
        XCTAssertEqual(rig.transport.indices, [1])
        rig.advance(1.25)                               // t=1.5, not 300
        XCTAssertEqual(rig.transport.indices, [1, 2])
    }

    func testChangingTheIntervalToZeroWhileWaitingSendsAtOnce() {
        let rig = rig(interval: 300_000)
        feed(rig, 1)
        rig.advance(0.25); feed(rig, 2)
        rig.sender.configure(makeConfig(discardOlderOnSuccess: true, minSendIntervalMs: 0)); rig.idle()
        XCTAssertEqual(rig.transport.indices, [1, 2])
    }

    func testReconfiguringWithTheSameIntervalDoesNotMoveTheTimer() {
        let rig = rig(interval: 1500)
        let origin = rig.scheduler.now
        feed(rig, 1)
        rig.advance(0.25); feed(rig, 2)
        for n in 0..<5 {
            rig.sender.configure(makeConfig(token: "tok-\(n)", discardOlderOnSuccess: true, minSendIntervalMs: 1500)); rig.idle()
        }
        XCTAssertEqual(rig.transport.indices, [1])
        XCTAssertEqual(rig.scheduler.pendingDelays.count, 1)
        XCTAssertEqual(rig.delegate.deferred.count, 1)
        rig.advance(1.25)
        XCTAssertEqual(rig.transport.indices, [1, 2])
        XCTAssertEqual(rig.startTimes(since: origin), [0, 1.5])
    }

    func testAFixOlderThanTheLastSentIsStillDroppedOnArrival() {
        let rig = rig(interval: 1500)
        rig.submit(5)
        rig.submit(2)
        rig.advance(5)
        XCTAssertEqual(rig.transport.indices, [5])
        XCTAssertEqual(rig.sender.state().queued, 0)
    }

    func testTheRealSchedulerClockIsMonotonic() {
        let scheduler = DispatchScheduler()
        let a = scheduler.monotonic
        let b = scheduler.monotonic
        XCTAssertGreaterThanOrEqual(b, a)
        XCTAssertGreaterThan(a, 0)
    }

    func testTheDefaultMonotonicClockFollowsTheSchedulersNow() {
        let scheduler = ManualScheduler()
        let a = scheduler.monotonic
        scheduler.now = scheduler.now.addingTimeInterval(2.5)
        XCTAssertEqual(scheduler.monotonic - a, 2.5, accuracy: 1e-6)
    }
}
