package co.ordering.driver.location

import co.ordering.driver.location.FakeTransport.Companion.offline
import co.ordering.driver.location.FakeTransport.Companion.status
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder

/** `Config.minSendIntervalMs`: a floor between the START of two requests, on a virtual monotonic clock. */
class MinSendIntervalTest {
    @get:Rule val tmp = TemporaryFolder()

    private val scheduler = ManualScheduler()
    private val transport = FakeTransport()
    private val listener = RecordingListener()
    private lateinit var queue: FileLocationQueue
    private val t0 = scheduler.nowMillis()

    /** Virtual time (ms since the start of the test) at which each request STARTED. */
    private val startedAt = ArrayList<Long>()

    private fun sender(interval: Long, latestWins: Boolean = true): LocationSender {
        queue = FileLocationQueue(tmp.root)
        transport.onPost = { startedAt.add(scheduler.nowMillis() - t0) }
        return LocationSender(
            testConfig(discardOlderOnSuccess = latestWins, minSendIntervalMs = interval),
            transport, queue, MockPolicy(true), scheduler, listener
        )
    }

    private fun LocationSender.started(): LocationSender {
        start(); scheduler.runPending(); return this
    }

    private fun LocationSender.feed(n: Int) {
        onFix(fix(n)); scheduler.runPending()
    }

    /** n of each request's fix (lat = 10 + n / 1000). */
    private fun sent() = transport.requests.map { r ->
        Math.round((Regex("\"lat\":([-0-9.]+)").find(r.body)!!.groupValues[1].toDouble() - 10.0) * 1000).toInt()
    }

    @Test fun zeroIsTodaysBehaviourEveryFixGoesOutAtOnce() {
        val s = sender(0, latestWins = false).started()
        (1..3).forEach { s.feed(it) }
        assertEquals(listOf(1, 2, 3), sent())
        assertEquals(listOf(0L, 0L, 0L), startedAt)
        assertTrue(listener.deferred.isEmpty())
        assertEquals(0, scheduler.pendingDelayed())
    }

    @Test fun zeroInLatestWinsToo() {
        val s = sender(0).started()
        (1..3).forEach { s.feed(it) }
        assertEquals(listOf(1, 2, 3), sent())
        assertTrue(listener.deferred.isEmpty())
    }

    @Test fun theFirstRequestIsNeverDelayed() {
        val s = sender(1500).started()
        s.feed(1)
        assertEquals(listOf(1), sent())
        assertEquals(listOf(0L), startedAt)
    }

    @Test fun aClockThatWentBackWaitsAWholeIntervalAndNeverSendsEarly() {
        // The `elapsed < 0` branch of `intervalWaitMs`: the monotonic clock "cannot" go back, but if it did a negative elapsed
        // time must not read as "long ago" (an immediate request) nor as a huge wait.
        val s = sender(1500).started()
        s.feed(1)
        scheduler.skip(-10_000)
        s.feed(2)
        assertEquals("the second one is deferred, not sent", listOf(1), sent())
        assertEquals(listOf(1500L), listener.deferred.map { it.first })
        scheduler.advance(1499); assertEquals(listOf(1), sent())
        scheduler.advance(1); assertEquals(listOf(1, 2), sent())
    }

    @Test fun twoFixesInsideTheIntervalGiveOneRequestNowAndOneWithTheNewestAtTheInterval() {
        val s = sender(1500).started()
        s.feed(1)                       // t=0: sent
        scheduler.advance(300); s.feed(2)
        scheduler.advance(300); s.feed(3)   // t=600
        assertEquals(listOf(1), sent())     // nothing yet
        assertEquals(1, scheduler.pendingDelayed())
        assertEquals(listOf(1200L to 1), listener.deferred.toList()) // one wait, announced once (at fix 2, not again at fix 3)
        scheduler.advance(899)
        assertEquals(listOf(1), sent())
        scheduler.advance(1)               // t=1500: the timer fires, no new fix needed
        assertEquals(listOf(1, 3), sent()) // the newest, the older one (2) is not sent
        assertEquals(listOf(0L, 1500L), startedAt)
        assertEquals(0, queue.size)
        assertEquals(listOf(1), listener.discards.toList())
        assertEquals(0, scheduler.pendingDelayed())
    }

    @Test fun noPendingFixMeansNoRequest() {
        val s = sender(1500).started()
        s.feed(1)
        scheduler.advance(60_000)
        assertEquals(listOf(1), sent())
        assertEquals(0, scheduler.pendingDelayed())
        // and after the interval a new fix goes out at once
        s.feed(2)
        assertEquals(listOf(1, 2), sent())
        assertEquals(listOf(0L, 60_000L), startedAt)
    }

    @Test fun theIntervalCountsFromTheStartOfTheRequestNotFromItsEnd() {
        val s = sender(1500)
        transport.onPost = { startedAt.add(scheduler.nowMillis() - t0); scheduler.skip(1000) } // the request takes 1 s
        s.started()
        s.feed(1)                          // starts at 0, ends at 1000
        s.feed(2)                          // arrives at t=1000: 500 ms to wait, not 1500
        assertEquals(listOf(1), sent())
        scheduler.advance(499); assertEquals(listOf(1), sent())
        scheduler.advance(1)
        assertEquals(listOf(1, 2), sent())
        assertEquals(listOf(0L, 1500L), startedAt)
    }

    @Test fun anExactlyElapsedIntervalSendsAtOnce() {
        val s = sender(1500).started()
        s.feed(1)
        scheduler.advance(1500)
        s.feed(2)
        assertEquals(listOf(1, 2), sent())
        assertTrue(listener.deferred.isEmpty())
    }

    // ---- composing with what exists ----

    @Test fun aFailedRequestRetriesAtTheBackoffWhenThatIsLongerThanTheInterval() {
        val s = sender(1500).started()
        transport.default = offline
        s.feed(1)                              // t=0 fails, retry in 5 s
        assertEquals(listOf(5000L), listener.retries.map { it.first })
        scheduler.advance(4999); assertEquals(listOf(1), sent())
        transport.default = status(200)
        scheduler.advance(1)                   // t=5000
        assertEquals(listOf(1, 1), sent())
        assertEquals(listOf(0L, 5000L), startedAt)
        assertTrue(listener.deferred.isEmpty())
    }

    @Test fun aRetryRespectsTheIntervalWhenThatIsLongerThanTheBackoff() {
        val s = sender(20_000).started()
        transport.default = offline
        s.feed(1)                              // t=0 fails, retry in 5 s
        transport.default = status(200)
        scheduler.advance(5000)                // the retry timer fires: too soon, 15 s left
        assertEquals(listOf(1), sent())
        assertEquals(listOf(15_000L to 1), listener.deferred.toList())
        scheduler.advance(14_999); assertEquals(listOf(1), sent())
        scheduler.advance(1)
        assertEquals(listOf(1, 1), sent())
        assertEquals(listOf(0L, 20_000L), startedAt)
    }

    @Test fun aNewFixAfterAFailureRetriesAtOnceButNotBeforeTheInterval() {
        val s = sender(1500).started()
        transport.default = offline
        s.feed(1)                              // t=0 fails
        scheduler.advance(300)
        transport.default = status(200)
        s.feed(2)                              // today a new fix retries at once: here, at the interval
        assertEquals(listOf(1), sent())
        scheduler.advance(1200)
        assertEquals(listOf(1, 2), sent())     // the newest of that moment
        assertEquals(listOf(0L, 1500L), startedAt)
        assertEquals(0, queue.size)
    }

    @Test fun theFlushAfterAnOutageIsPacedByTheIntervalInFifoMode() {
        val s = sender(1500, latestWins = false).started()
        transport.default = offline
        s.feed(1); s.feed(2); s.feed(3); s.feed(4)      // all at t=0; only the first attempt is made, the rest wait
        assertEquals(4, queue.size)
        scheduler.advance(10 * 60_000)                  // long outage: retries every minute meanwhile
        transport.default = status(200)
        transport.requests.clear(); startedAt.clear()
        val restoredAt = scheduler.nowMillis() - t0
        s.onConnectivityRestored(); scheduler.runPending()
        scheduler.advance(10_000)
        assertEquals(listOf(1, 2, 3, 4), sent())        // the whole route, in order
        val spacing = startedAt.zipWithNext { a, b -> b - a }
        assertEquals(listOf(1500L, 1500L, 1500L), spacing) // never a burst
        assertTrue(startedAt.first() >= restoredAt - 1) // the first one at once (the last attempt was long ago)
        assertEquals(0, queue.size)
    }

    @Test fun theFlushAfterAnOutageInLatestWinsIsOneRequest() {
        val s = sender(1500).started()
        transport.default = offline
        (1..5).forEach { s.feed(it); scheduler.advance(200) }
        scheduler.advance(120_000)
        transport.default = status(200)
        transport.requests.clear()
        s.onConnectivityRestored(); scheduler.runPending()
        scheduler.advance(10_000)
        assertEquals(listOf(5), sent())
        assertEquals(0, queue.size)
    }

    @Test fun aFlushOrReconnectInsideTheIntervalWaitsForIt() {
        val s = sender(1500).started()
        s.feed(1)                                       // t=0, accepted
        transport.default = offline
        scheduler.advance(100); s.feed(2)               // deferred; then it is attempted at 1500 and fails
        scheduler.advance(1400)
        assertEquals(2, transport.requests.size)
        transport.default = status(200)
        scheduler.advance(200)                          // t=1700
        s.onConnectivityRestored(); scheduler.runPending() // 200 ms after the failed attempt: too soon
        assertEquals(2, transport.requests.size)
        s.flush(); scheduler.runPending()
        assertEquals(2, transport.requests.size)
        scheduler.advance(1300)                         // t=3000 = 1500 + 1500
        assertEquals(3, transport.requests.size)
        assertEquals(listOf(0L, 1500L, 3000L), startedAt)
    }

    @Test fun stopCancelsThePendingSendAndNothingGoesOutAfterIt() {
        val s = sender(1500).started()
        s.feed(1)
        scheduler.advance(200); s.feed(2)
        assertEquals(1, scheduler.pendingDelayed())
        s.stop(); scheduler.runPending()
        assertEquals(0, scheduler.pendingDelayed())     // the timer is cancelled
        scheduler.advance(60_000)
        assertEquals(listOf(1), sent())
        assertEquals(1, queue.size)                     // the fix is kept on disk, as stop() always did
    }

    @Test fun startAfterStopSendsWhatIsLeftRespectingTheFloorOfTheLastRequest() {
        val s = sender(1500).started()
        s.feed(1)
        scheduler.advance(200); s.feed(2)
        s.stop(); scheduler.runPending()
        scheduler.advance(300)                          // t=500
        s.start(); scheduler.runPending()
        assertEquals(listOf(1), sent())                 // 1000 ms still to wait
        scheduler.advance(1000)
        assertEquals(listOf(1, 2), sent())
        assertEquals(listOf(0L, 1500L), startedAt)
    }

    @Test fun aFixWhileStoppedIsIgnoredAndCreatesNoTimer() {
        val s = sender(1500).started()
        s.feed(1)
        s.stop(); scheduler.runPending()
        s.feed(2)
        assertEquals(0, scheduler.pendingDelayed())
        scheduler.advance(10_000)
        assertEquals(listOf(1), sent())
    }

    @Test fun a401StopsTheSendingAndCancelsTheTimer() {
        val s = sender(1500).started()
        transport.default = status(401)
        s.feed(1)
        assertEquals(listOf(StateKind.UNAUTHORIZED), listener.states.toList())
        s.feed(2)                                       // while unauthorized: queued, nothing deferred
        assertEquals(0, scheduler.pendingDelayed())
        scheduler.advance(60_000)
        assertEquals(listOf(1), sent())
    }

    @Test fun a401AfterAWaitCancelsTheWaitingTimer() {
        val s = sender(1500).started()
        s.feed(1)
        scheduler.advance(100); s.feed(2)
        assertEquals(1, scheduler.pendingDelayed())
        transport.default = status(401)
        scheduler.advance(1400)                         // the deferred request goes out and gets a 401
        assertEquals(listOf(1, 2), sent())
        assertEquals(0, scheduler.pendingDelayed())
        scheduler.advance(60_000)
        assertEquals(listOf(1, 2), sent())
    }

    @Test fun newHeadersAfterA401ResumeButStillRespectTheInterval() {
        val s = sender(1500).started()
        transport.default = status(401)
        s.feed(1)
        scheduler.advance(300)
        transport.default = status(200)
        s.updateHeaders(mapOf("Authorization" to "Bearer new")); scheduler.runPending()
        assertEquals(listOf(1), sent())
        scheduler.advance(1200)
        assertEquals(listOf(1, 1), sent())
        assertEquals(listOf(0L, 1500L), startedAt)
    }

    @Test fun anOtherFourXxDropsOnlyThatFixAndTheNextWaitsForTheInterval() {
        val s = sender(1500, latestWins = false).started()
        s.feed(1); s.feed(2)
        transport.enqueue(status(200))                  // fix 1 was sent already; enqueue the answer for 2
        scheduler.advance(0)
        assertEquals(listOf(1), sent())
        transport.default = status(422)
        scheduler.advance(1500)                         // fix 2 gets a 422: dropped
        s.feed(3)
        assertEquals(listOf(1, 2), sent())              // 3 waits: the 422 request started at 1500
        scheduler.advance(1500)
        assertEquals(listOf(1, 2, 3), sent())
        assertEquals(listOf(0L, 1500L, 3000L), startedAt)
    }

    @Test fun changingTheIntervalWhileWaitingReschedulesTheSend() {
        val s = sender(300_000).started()
        s.feed(1)
        scheduler.advance(100); s.feed(2)
        assertEquals(listOf(299_900L to 1), listener.deferred.toList())
        s.updateConfig(testConfig(discardOlderOnSuccess = true, minSendIntervalMs = 1500)); scheduler.runPending()
        assertEquals(listOf(1), sent())
        scheduler.advance(1400)                         // t=1500, not 300 000
        assertEquals(listOf(1, 2), sent())
    }

    @Test fun changingTheIntervalToZeroWhileWaitingSendsAtOnce() {
        val s = sender(300_000).started()
        s.feed(1)
        scheduler.advance(100); s.feed(2)
        s.updateConfig(testConfig(discardOlderOnSuccess = true, minSendIntervalMs = 0)); scheduler.runPending()
        assertEquals(listOf(1, 2), sent())
    }

    @Test fun reconfiguringWithTheSameIntervalDoesNotMoveTheTimer() {
        val s = sender(1500).started()
        s.feed(1)
        scheduler.advance(100); s.feed(2)
        repeat(5) { s.updateConfig(testConfig(discardOlderOnSuccess = true, minSendIntervalMs = 1500, token = "tok-$it")); scheduler.runPending() }
        assertEquals(listOf(1), sent())
        assertEquals(1, scheduler.pendingDelayed())
        assertEquals(1, listener.deferred.size)
        scheduler.advance(1400)
        assertEquals(listOf(1, 2), sent())
        assertEquals(listOf(0L, 1500L), startedAt)
    }

    @Test fun aFixOlderThanTheLastSentIsStillDroppedOnArrival() {
        val s = sender(1500).started()
        s.onFix(fix(5)); scheduler.runPending()
        s.onFix(fix(2)); scheduler.runPending()
        scheduler.advance(5000)
        assertEquals(listOf(5), sent())
        assertEquals(0, queue.size)
    }

    @Test fun theMaxQueueStillBoundsWhatWaits() {
        queue = FileLocationQueue(tmp.root, 3)
        transport.onPost = { startedAt.add(scheduler.nowMillis() - t0) }
        val s = LocationSender(testConfig(maxQueue = 3, discardOlderOnSuccess = true, minSendIntervalMs = 1500),
            transport, queue, MockPolicy(true), scheduler, listener).started()
        (1..10).forEach { s.feed(it) }
        assertEquals(3, queue.size) // 1 went out; of the rest only the newest three are kept
        scheduler.advance(1500)
        assertEquals(listOf(1, 10), sent())
    }
}
