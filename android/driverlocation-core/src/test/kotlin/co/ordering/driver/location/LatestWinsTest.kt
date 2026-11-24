package co.ordering.driver.location

import co.ordering.driver.location.FakeTransport.Companion.offline
import co.ordering.driver.location.FakeTransport.Companion.status
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder

/** `discardOlderOnSuccess = true`: the newest fix wins, older queued ones are discarded on success. */
class LatestWinsTest {
    @get:Rule val tmp = TemporaryFolder()

    private val scheduler = ManualScheduler()
    private val transport = FakeTransport()
    private val listener = RecordingListener()
    private lateinit var queue: FileLocationQueue

    private fun sender(latestWins: Boolean = true, maxQueue: Int = 500): LocationSender {
        queue = FileLocationQueue(tmp.root, maxQueue)
        return LocationSender(
            testConfig(maxQueue = maxQueue, discardOlderOnSuccess = latestWins),
            transport, queue, MockPolicy(true), scheduler, listener
        )
    }

    private fun LocationSender.started(): LocationSender {
        start(); scheduler.runPending(); return this
    }

    private fun LocationSender.feed(vararg fixes: LocationFix) {
        fixes.forEach { onFix(it) }
        scheduler.runPending()
    }

    /** n of each request's fix (lat = 10 + n / 1000). */
    private fun sent() = transport.requests.map { r ->
        Math.round((Regex("\"lat\":([-0-9.]+)").find(r.body)!!.groupValues[1].toDouble() - 10.0) * 1000).toInt()
    }

    @Test fun defaultOfConfigIsLatestWins() {
        assertTrue(Config("http://h/x", emptyMap()).discardOlderOnSuccess)
        assertTrue(Config("http://h/x", emptyMap()).withHeaders(mapOf("A" to "b")).discardOlderOnSuccess)
        assertFalse(Config("http://h/x", emptyMap(), discardOlderOnSuccess = false).withHeaders(emptyMap()).discardOlderOnSuccess)
    }

    @Test fun fiveFixesQueuedOfflineThenOnlineSendExactlyOneRequestWithTheNewest() {
        val s = sender().started()
        transport.default = offline
        (1..5).forEach { s.feed(fix(it)) }
        assertEquals(5, queue.size)
        transport.requests.clear()
        transport.default = status(200)
        s.onConnectivityRestored(); scheduler.runPending()
        assertEquals(listOf(5), sent())
        assertEquals(0, queue.size)
        assertEquals(listOf(true to 200), listener.https.takeLast(1))
    }

    @Test fun aDiscardIsReportedOnceWithHowManyWereDropped() {
        val s = sender().started()
        transport.default = offline
        (1..5).forEach { s.feed(fix(it)) }
        transport.default = status(200)
        s.onConnectivityRestored(); scheduler.runPending()
        assertEquals(listOf(4), listener.discards.toList()) // five queued, the newest sent: four older dropped
    }

    @Test fun noDiscardIsReportedWhenNothingOlderWasPending() {
        val s = sender().started()
        s.feed(fix(1), fix(2), fix(3)) // each one goes out alone
        assertEquals(listOf(1, 2, 3), sent())
        assertTrue(listener.discards.isEmpty())
    }

    @Test fun noDiscardIsReportedWhenTheOptionIsOff() {
        val s = sender(latestWins = false).started()
        transport.default = offline
        (1..3).forEach { s.feed(fix(it)) }
        transport.default = status(200)
        s.onConnectivityRestored(); scheduler.runPending()
        assertEquals(listOf(1, 2, 3), sent().takeLast(3))
        assertTrue(listener.discards.isEmpty())
    }

    @Test fun aNewerFixArrivingInFlightSurvivesTheSuccessAndIsSentNext() {
        val s = sender().started()
        transport.default = offline
        s.feed(fix(1), fix(2))
        transport.requests.clear()
        transport.default = status(200)
        var injected = false
        transport.onPost = {
            if (!injected) { injected = true; queue.add(fix(3)) } // arrives while fix 2 is in flight
        }
        s.flush(); scheduler.runPending()
        assertEquals(listOf(2, 3), sent())
        assertEquals(0, queue.size)
    }

    @Test fun whenTheNewerFixThenFailsOnlyItRemainsAndTheOlderOnesAreGone() {
        val s = sender().started()
        transport.default = offline
        s.feed(fix(1), fix(2))
        transport.requests.clear()
        var injected = false
        transport.onPost = {
            if (!injected) { injected = true; queue.add(fix(3)) }
        }
        transport.enqueue(status(200))     // fix 2 succeeds; the next request (fix 3) finds the network down
        transport.default = offline
        s.flush(); scheduler.runPending()
        assertEquals(listOf(2, 3), sent())
        assertEquals(1, queue.size)
        assertEquals(fix(3), queue.peek())
    }

    @Test fun aRetryAfter5xxSendsTheNewestFixOfThatMomentNotTheOneThatFailed() {
        val s = sender().started()
        transport.enqueue(status(500))
        s.feed(fix(1))
        assertEquals(listOf(1), sent())
        queue.add(fix(2)); queue.add(fix(3))          // arrive while waiting for the retry
        scheduler.advance(5_000)
        assertEquals(listOf(1, 3), sent())
        assertEquals(0, queue.size)
    }

    @Test fun everyRetryCaseKeepsTheQueue() {
        val s = sender().started()
        transport.enqueue(offline, status(500), status(408), status(429))
        s.feed(fix(1))
        assertEquals(1, queue.size)
        scheduler.advance(5_000); assertEquals(1, queue.size)
        scheduler.advance(15_000); assertEquals(1, queue.size)
        scheduler.advance(60_000); assertEquals(1, queue.size)
        scheduler.advance(60_000); assertEquals(0, queue.size)
        assertEquals(listOf(1, 1, 1, 1, 1), sent())
    }

    @Test fun aClientErrorDropsOnlyThatFixAndTheNextNewestIsTried() {
        val s = sender().started()
        transport.default = offline
        s.feed(fix(1), fix(2), fix(3))
        transport.requests.clear()
        transport.default = status(200)
        transport.enqueue(status(400), status(200))
        s.flush(); scheduler.runPending()
        assertEquals(listOf(3, 2), sent())
        assertEquals(0, queue.size)           // fix 2 succeeded, which discarded fix 1
        assertEquals(listOf(false to 400, true to 200), listener.https.takeLast(2))
    }

    @Test fun aClientErrorKeepsTheOlderFixesWhenNothingSucceedsAfterwards() {
        val s = sender().started()
        transport.default = offline
        s.feed(fix(1), fix(2), fix(3))
        transport.requests.clear()
        transport.enqueue(status(422), offline)
        s.flush(); scheduler.runPending()
        assertEquals(listOf(3, 2), sent())
        assertEquals(listOf(fix(1), fix(2)), listOf(queue.peekFirstEntry()!!.fix, queue.peekLastEntry()!!.fix))
        assertEquals(2, queue.size)
    }

    @Test fun aRestartedProcessSendsTheNewestOfWhatWasLeft() {
        prefilledQueue(tmp.root, fix(1), fix(2), fix(3))
        val s = sender()
        assertEquals(3, s.state().queued)
        s.started()
        assertEquals(listOf(3), sent())
        assertEquals(0, queue.size)
        assertEquals(0, FileLocationQueue(tmp.root).size)
    }

    @Test fun aFixOlderThanTheLastSentIsDroppedOnArrivalEvenAcrossStopAndStart() {
        val s = sender().started()
        s.feed(fix(5))
        assertEquals(listOf(5), sent())
        s.feed(fix(3))
        assertEquals(listOf(5), sent())
        assertEquals(0, queue.size)
        assertEquals(listOf(fix(5)), listener.accepted.toList())
        s.stop(); scheduler.runPending()
        s.started()
        s.feed(fix(4))
        assertEquals(listOf(5), sent())
        s.feed(fix(5))                      // same timestamp is not "older"
        s.feed(fix(6))
        assertEquals(listOf(5, 5, 6), sent())
    }

    @Test fun aFixOlderThanTheLastSentIsKeptWhenTheOptionIsOff() {
        val s = sender(latestWins = false).started()
        s.feed(fix(5), fix(3))
        assertEquals(listOf(5, 3), sent())
    }

    @Test fun orderIsBySequenceNotByTimestamp() {
        val s = sender().started()
        transport.default = offline
        s.feed(fix(5), fix(3))              // nothing sent yet: the later arrival is the newer one
        transport.requests.clear()
        transport.default = status(200)
        s.flush(); scheduler.runPending()
        assertEquals(listOf(3), sent())
        assertEquals(0, queue.size)
    }

    @Test fun unauthorizedKeepsEverythingAndResumesWithTheNewest() {
        val s = sender().started()
        transport.default = status(401)
        s.feed(fix(1), fix(2), fix(3))
        assertEquals(listOf(1), sent())     // stopped after the first 401 (fixes 2 and 3 only queued)
        assertEquals(3, queue.size)
        transport.requests.clear()
        transport.default = status(200)
        s.updateHeaders(mapOf("Authorization" to "Bearer tok-2")); scheduler.runPending()
        assertEquals(listOf(3), sent())
        assertEquals(0, queue.size)
    }

    @Test fun theBoundStillDropsTheOldest() {
        val s = sender(maxQueue = 3).started()
        transport.default = offline
        (1..6).forEach { s.feed(fix(it)) }
        assertEquals(3, queue.size)
        assertEquals(fix(4), queue.peek())
        transport.requests.clear()
        transport.default = status(200)
        s.flush(); scheduler.runPending()
        assertEquals(listOf(6), sent())
    }

    @Test fun updateConfigSwitchesTheOptionAtRunTime() {
        val s = sender(latestWins = false).started()
        transport.default = offline
        s.feed(fix(1), fix(2), fix(3))
        transport.requests.clear()
        transport.default = status(200)
        s.updateConfig(testConfig(discardOlderOnSuccess = true)); scheduler.runPending()
        s.flush(); scheduler.runPending()
        assertEquals(listOf(3), sent())
        assertEquals(0, queue.size)

        transport.default = offline
        s.feed(fix(4), fix(5), fix(6))
        s.updateConfig(testConfig(discardOlderOnSuccess = false)); scheduler.runPending()
        transport.requests.clear()
        transport.default = status(200)
        s.flush(); scheduler.runPending()
        assertEquals(listOf(4, 5, 6), sent())
    }
}
