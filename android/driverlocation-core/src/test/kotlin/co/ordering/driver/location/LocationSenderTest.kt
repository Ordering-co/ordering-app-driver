package co.ordering.driver.location

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import co.ordering.driver.location.FakeTransport.Companion.offline
import co.ordering.driver.location.FakeTransport.Companion.status

class LocationSenderTest {
    @get:Rule val tmp = TemporaryFolder()

    private val scheduler = ManualScheduler()
    private val transport = FakeTransport()
    private val listener = RecordingListener()
    private lateinit var queue: FileLocationQueue

    private fun sender(release: Boolean = true, config: Config = testConfig()): LocationSender {
        queue = FileLocationQueue(tmp.root, config.maxQueue)
        return LocationSender(config, transport, queue, MockPolicy(release), scheduler, listener)
    }

    private fun LocationSender.started(): LocationSender {
        start(); scheduler.runPending(); return this
    }

    private fun LocationSender.feed(vararg fixes: LocationFix) {
        fixes.forEach { onFix(it) }
        scheduler.runPending()
    }

    private fun sentLats() = transport.requests.map { r ->
        Regex("\"lat\":([-0-9.]+)").find(r.body)!!.groupValues[1].toDouble()
    }

    // ---- the request ----

    @Test fun oneRequestPerFixWithUrlHeadersAndTheExactBody() {
        val s = sender().started()
        s.feed(fix(1))
        assertEquals(1, transport.requests.size)
        val r = transport.requests[0]
        assertEquals("http://localhost:8080/users/7/locations", r.url)
        assertEquals("Bearer tok-1", r.headers["Authorization"])
        assertEquals(BodyBuilder.build(fix(1), mapOf("driver_id" to 7)), r.body)
        assertEquals("""{"location":{"lat":10.001,"lng":-20.001,"v":"1.0"},"driver_id":7}""", r.body)
    }

    @Test fun success2xxRemovesTheFixAndReports() {
        val s = sender().started()
        s.feed(fix(1))
        assertEquals(0, queue.size)
        assertEquals(listOf(true to 200), listener.https.toList())
        assertEquals(listOf(fix(1)), listener.accepted.toList())
        assertEquals(200, s.state().lastHttpStatus)
        assertEquals(fix(1).timestamp, s.state().lastLocationAt)
    }

    @Test fun every2xxCountsAsSuccess() {
        val s = sender().started()
        transport.enqueue(status(201), status(204))
        s.feed(fix(1), fix(2))
        assertEquals(0, queue.size)
    }

    // ---- not started ----

    @Test fun nothingIsSentNorQueuedWhenNotStarted() {
        val s = sender()
        s.feed(fix(1), fix(2))
        s.onConnectivityRestored(); s.flush(); scheduler.runPending()
        assertEquals(0, transport.requests.size)
        assertEquals(0, queue.size)
        assertFalse(s.state().tracking)
        assertTrue(listener.accepted.isEmpty())
    }

    @Test fun stopKeepsTheQueueAndSendsNothingMoreUntilStart() {
        val s = sender().started()
        transport.default = offline
        s.feed(fix(1))
        s.stop(); scheduler.runPending()
        assertEquals(1, queue.size)
        scheduler.advance(10 * 60_000)
        s.feed(fix(2))               // ignored: stopped
        s.onConnectivityRestored(); scheduler.runPending()
        assertEquals(1, transport.requests.size)
        assertEquals(1, queue.size)
        transport.default = status(200)
        s.started()
        assertEquals(0, queue.size)
        assertEquals(2, transport.requests.size)
    }

    @Test fun startSendsWhatAPreviousRunLeftOnDisk() {
        prefilledQueue(tmp.root, fix(1), fix(2))
        val s = sender()
        assertEquals(2, s.state().queued)
        s.started()
        assertEquals(listOf(10.001, 10.002), sentLats())
        assertEquals(0, s.state().queued)
    }

    // ---- retry: network error and 5xx ----

    @Test fun networkErrorKeepsTheFixAndRetriesWithTheBackoff() {
        val s = sender().started()
        transport.default = offline
        s.feed(fix(1))
        assertEquals(1, queue.size)
        assertTrue(listener.https.isEmpty()) // no answer, no onHttp
        scheduler.advance(4_999); assertEquals(1, transport.requests.size)
        scheduler.advance(1);     assertEquals(2, transport.requests.size)   // +5 s
        scheduler.advance(14_999); assertEquals(2, transport.requests.size)
        scheduler.advance(1);     assertEquals(3, transport.requests.size)   // +15 s
        scheduler.advance(60_000); assertEquals(4, transport.requests.size)  // +60 s
        scheduler.advance(60_000); assertEquals(5, transport.requests.size)  // +60 s again
        assertEquals(listOf(5_000L, 15_000L, 60_000L, 60_000L, 60_000L), scheduler.scheduledDelays)
        assertEquals(1, queue.size)
    }

    @Test fun backoffResetsAfterASuccess() {
        val s = sender().started()
        transport.enqueue(offline, offline)
        s.feed(fix(1))
        scheduler.advance(5_000)           // 2nd attempt fails -> next delay 15 s
        scheduler.advance(15_000)          // 3rd attempt succeeds
        assertEquals(0, queue.size)
        transport.enqueue(offline)
        s.feed(fix(2))                     // fails; delay must be 5 s again
        assertEquals(listOf(5_000L, 15_000L, 5_000L), scheduler.scheduledDelays)
    }

    @Test fun serverErrors5xxKeepTheFixAndRetry() {
        val s = sender().started()
        transport.enqueue(status(500), status(503))
        s.feed(fix(1))
        assertEquals(1, queue.size)
        assertEquals(listOf(false to 500), listener.https.toList())
        scheduler.advance(5_000)
        assertEquals(1, queue.size)
        scheduler.advance(15_000)
        assertEquals(0, queue.size)
        assertEquals(listOf(false to 500, false to 503, true to 200), listener.https.toList())
    }

    @Test fun aTimeoutOrARateLimitKeepsTheFixAndRetries() {
        val s = sender().started()
        transport.enqueue(status(408), status(429))
        s.feed(fix(1))
        assertEquals(1, queue.size)
        scheduler.advance(5_000)
        assertEquals(1, queue.size)
        scheduler.advance(15_000)
        assertEquals(0, queue.size)
        assertEquals(listOf(false to 408, false to 429, true to 200), listener.https.toList())
    }

    @Test fun aNewFixTriesAtOnceWithoutWaitingForTheTimer() {
        val s = sender().started()
        transport.enqueue(offline)
        s.feed(fix(1))
        assertEquals(1, transport.requests.size)
        s.feed(fix(2))                     // no clock movement
        assertEquals(listOf(10.001, 10.001, 10.002), sentLats())
        assertEquals(0, queue.size)
        assertEquals(0, scheduler.pendingDelayed()) // the pending retry was cancelled
    }

    @Test fun connectivityRestoredFlushesAtOnceAndResetsTheBackoff() {
        val s = sender().started()
        transport.default = offline
        s.feed(fix(1))
        scheduler.advance(5_000); scheduler.advance(15_000)     // 3 attempts so far, next delay would be 60 s
        transport.default = status(200)
        s.onConnectivityRestored(); scheduler.runPending()
        assertEquals(0, queue.size)
        transport.default = offline
        s.feed(fix(3))
        assertEquals(5_000L, scheduler.scheduledDelays.last())
    }

    @Test fun manyFixesWhileOfflineAreDeliveredInOrderAfterReconnecting() {
        val s = sender().started()
        transport.default = offline
        (1..50).forEach { s.feed(fix(it)) }
        assertEquals(50, queue.size)
        transport.requests.clear()
        transport.default = status(200)
        s.onConnectivityRestored(); scheduler.runPending()
        assertEquals((1..50).map { 10.0 + it / 1000.0 }, sentLats())
        assertEquals(0, queue.size)
    }

    @Test fun anErrorMidQueueStopsThereAndKeepsOrder() {
        val s = sender().started()
        transport.default = offline
        s.feed(fix(1), fix(2), fix(3))
        transport.requests.clear()
        transport.enqueue(status(200), offline)
        s.flush(); scheduler.runPending()
        assertEquals(listOf(10.001, 10.002), sentLats())
        assertEquals(2, queue.size)
        transport.default = status(200)
        transport.requests.clear()
        scheduler.advance(5_000)
        assertEquals(listOf(10.002, 10.003), sentLats())
    }

    @Test fun aQueueOverMaxQueueLosesTheOldestWhileOffline() {
        val s = sender(config = testConfig(maxQueue = 3)).started()
        transport.default = offline
        (1..6).forEach { s.feed(fix(it)) }
        assertEquals(3, queue.size)
        transport.requests.clear()
        transport.default = status(200)
        s.flush(); scheduler.runPending()
        assertEquals(listOf(10.004, 10.005, 10.006), sentLats())
    }

    @Test fun aRestartedProcessKeepsSendingWhatWasQueued() {
        val a = sender().started()
        transport.default = offline
        a.feed(fix(1), fix(2))
        // process killed: new queue, new sender over the same directory
        val s2 = sender()
        transport.default = status(200)
        transport.requests.clear()
        s2.started()
        assertEquals(listOf(10.001, 10.002), sentLats())
    }

    @Test fun aTransportThatThrowsIsTreatedAsANetworkError() {
        val throwing = object : HttpTransport {
            override fun post(url: String, headers: Map<String, String>, body: String): HttpResult =
                throw IllegalStateException("boom")
        }
        queue = FileLocationQueue(tmp.root)
        val s = LocationSender(testConfig(), throwing, queue, MockPolicy(true), scheduler, listener)
        s.started(); s.feed(fix(1))
        assertEquals(1, queue.size)
        assertEquals(1, scheduler.pendingDelayed())
    }

    // ---- other 4xx ----

    @Test fun otherClientErrorsDropThatFixAndGoOn() {
        val s = sender().started()
        transport.default = offline
        s.feed(fix(1), fix(2), fix(3))
        transport.requests.clear()
        transport.enqueue(status(400), status(422), status(200))
        s.flush(); scheduler.runPending()
        assertEquals(listOf(10.001, 10.002, 10.003), sentLats())
        assertEquals(0, queue.size)
        assertEquals(listOf(false to 400, false to 422, true to 200), listener.https.toList())
        assertTrue(listener.states.isEmpty())
        assertEquals(0, scheduler.pendingDelayed())
    }

    @Test fun aRedirectAnswerCannotBlockTheQueue() {
        val s = sender().started()
        transport.enqueue(status(302))
        s.feed(fix(1))
        assertEquals(0, queue.size)
    }

    // ---- 401 ----

    @Test fun unauthorizedStopsKeepsTheQueueAndIsReportedOnce() {
        val s = sender().started()
        transport.default = status(401)
        s.feed(fix(1))
        assertEquals(1, queue.size)
        assertEquals(listOf(StateKind.UNAUTHORIZED), listener.states.toList())
        assertTrue(s.state().unauthorized)
        // more fixes, flushes, connectivity events, time: nothing is sent, nothing reported again
        s.feed(fix(2), fix(3))
        s.flush(); s.onConnectivityRestored(); scheduler.advance(10 * 60_000)
        assertEquals(1, transport.requests.size)
        assertEquals(3, queue.size)
        assertEquals(listOf(StateKind.UNAUTHORIZED), listener.states.toList())
        assertEquals(listOf(false to 401), listener.https.toList())
        assertEquals(0, scheduler.pendingDelayed())
    }

    @Test fun newHeadersResumeInOrderAndTheNewTokenIsUsed() {
        val s = sender().started()
        transport.default = status(401)
        s.feed(fix(1), fix(2))
        transport.requests.clear()
        transport.default = status(200)
        s.updateHeaders(mapOf("Authorization" to "Bearer tok-2")); scheduler.runPending()
        assertEquals(listOf(10.001, 10.002), sentLats())
        assertTrue(transport.requests.all { it.headers["Authorization"] == "Bearer tok-2" })
        assertEquals(0, queue.size)
        assertFalse(s.state().unauthorized)
    }

    @Test fun aSecond401AfterNewHeadersIsReportedAgain() {
        val s = sender().started()
        transport.default = status(401)
        s.feed(fix(1))
        s.updateHeaders(mapOf("Authorization" to "Bearer tok-2")); scheduler.runPending()
        assertEquals(listOf(StateKind.UNAUTHORIZED, StateKind.UNAUTHORIZED), listener.states.toList())
        assertEquals(1, queue.size)
    }

    @Test fun theSameRejectedHeadersDoNotResume() {
        val s = sender().started()
        transport.default = status(401)
        s.feed(fix(1))
        s.updateHeaders(mapOf("Authorization" to "Bearer tok-1")); scheduler.runPending()
        assertEquals(1, transport.requests.size)
        assertTrue(s.state().unauthorized)
    }

    @Test fun updateHeadersWhileHealthyDoesNotSendOrRestartAnything() {
        val s = sender().started()
        s.updateHeaders(mapOf("Authorization" to "Bearer tok-9")); scheduler.runPending()
        assertEquals(0, transport.requests.size)
        assertTrue(s.state().tracking)
        s.feed(fix(1))
        assertEquals("Bearer tok-9", transport.requests.single().headers["Authorization"])
    }

    @Test fun updateHeadersRejectsInvalidValuesWithoutTouchingTheSender() {
        val s = sender().started()
        assertThrows(ConfigException::class.java) { s.updateHeaders(mapOf("Authorization" to "a\nb")) }
        s.feed(fix(1))
        assertEquals("Bearer tok-1", transport.requests.single().headers["Authorization"])
    }

    @Test fun updateConfigSwapsUrlExtrasAndBoundOnTheFly() {
        val s = sender().started()
        s.updateConfig(Config("http://other/x", mapOf("Authorization" to "Bearer tok-1"), mapOf("driver_id" to 8), maxQueue = 5))
        s.feed(fix(1))
        val r = transport.requests.single()
        assertEquals("http://other/x", r.url)
        assertTrue(r.body.endsWith("\"driver_id\":8}"))
        assertThrows(IllegalArgumentException::class.java) {
            s.updateConfig(Config("http://other/x", emptyMap(), mapOf("location" to "x")))
        }
    }

    // ---- logs (what the platform layer writes) ----

    @Test fun theListenerHearsTheExactRequestBodyAndTheQueueSize() {
        val s = sender().started()
        s.feed(fix(1))
        assertEquals(listOf(transport.requests.single().body to 1), listener.requests.toList())
    }

    @Test fun aRetryIsReportedWithItsDelayAndItsCause() {
        val s = sender().started()
        transport.enqueue(offline, status(503), status(429))
        s.feed(fix(1))
        scheduler.advance(5_000); scheduler.advance(15_000)
        assertEquals(
            listOf(Triple(5_000L, null, 1), Triple(15_000L, 503, 1), Triple(60_000L, 429, 1)),
            listener.retries.toList()
        )
    }

    // ---- mock ----

    @Test fun mockFixIsDroppedInReleaseAndReported() {
        val s = sender(release = true).started()
        s.feed(fix(1, mock = true), fix(2))
        assertEquals(listOf(10.002), sentLats())
        assertEquals(listOf(StateKind.MOCK_REJECTED), listener.states.toList())
        assertEquals(listOf(fix(2)), listener.accepted.toList())
        assertTrue(transport.requests.none { it.body.contains("mock") })
    }

    @Test fun mockFixIsDroppedBeforeTheQueueEvenWhenOffline() {
        val s = sender(release = true).started()
        transport.default = offline
        s.feed(fix(1, mock = true))
        assertEquals(0, queue.size)
        assertEquals(0, transport.requests.size)
    }

    @Test fun mockFixIsSentAsRealInDebugAndTheEventKeepsTheTruth() {
        val s = sender(release = false).started()
        s.feed(fix(1, mock = true))
        val body = transport.requests.single().body
        assertFalse(body.contains("mock")) // sent as a real one: no `mock` key at all
        assertTrue(listener.states.isEmpty())
        // What JavaScript hears about is the truth.
        assertEquals(listOf(fix(1, mock = true)), listener.accepted.toList())
        // And what is queued (a restart would resend it) is the real-looking one.
        assertEquals(0, queue.size)
    }

    @Test fun mockFixIsDroppedInDebugWithRejectMock() {
        val cfg = Config(testConfig().url, testConfig().headers, testConfig().extras, rejectMock = true)
        val s = sender(release = false, config = cfg).started()
        s.feed(fix(1, mock = true), fix(2))
        assertEquals(listOf(10.002), sentLats())
        assertEquals(listOf(StateKind.MOCK_REJECTED), listener.states.toList())
        assertEquals(listOf(fix(2)), listener.accepted.toList())
    }

    @Test fun rejectMockCanBeSwitchedWithUpdateConfig() {
        val s = sender(release = false).started()
        s.feed(fix(1, mock = true))
        assertEquals(1, transport.requests.size)
        s.updateConfig(Config(testConfig().url, testConfig().headers, testConfig().extras, rejectMock = true))
        scheduler.runPending()
        s.feed(fix(2, mock = true))
        assertEquals(1, transport.requests.size)
        assertEquals(listOf(StateKind.MOCK_REJECTED), listener.states.toList())
        s.updateConfig(testConfig())
        scheduler.runPending()
        s.feed(fix(3, mock = true))
        assertEquals(2, transport.requests.size)
    }

    @Test fun mockFixSentAsRealIsKeptAsRealWhenOffline() {
        val s = sender(release = false).started()
        transport.default = offline
        s.feed(fix(1, mock = true), fix(2))
        assertEquals(2, queue.size)
        assertTrue(queue.peekFirstEntry()!!.fix.mock == false)
    }

    @Test fun aRealFixIsNotAffectedByTheOption() {
        val cfg = Config(testConfig().url, testConfig().headers, testConfig().extras, rejectMock = true)
        val s = sender(release = false, config = cfg).started()
        s.feed(fix(1))
        assertEquals(1, transport.requests.size)
        assertTrue(listener.states.isEmpty())
    }

    @Test fun invalidCoordinatesAreIgnored() {
        val s = sender().started()
        s.feed(LocationFix(Double.NaN, 1.0, null, null, 1L), LocationFix(0.0, 200.0, null, null, 1L))
        assertEquals(0, transport.requests.size)
        assertEquals(0, queue.size)
    }

    // ---- state and listener safety ----

    @Test fun stateSnapshot() {
        val s = sender()
        assertEquals(SenderState(0, null, null, false, false), s.state())
        s.started()
        transport.default = offline
        s.feed(fix(1))
        assertEquals(SenderState(1, null, fix(1).timestamp, true, false), s.state())
        transport.default = status(500)
        s.flush(); scheduler.runPending()
        assertEquals(500, s.state().lastHttpStatus)
    }

    @Test fun aListenerThatThrowsDoesNotBreakSending() {
        queue = FileLocationQueue(tmp.root)
        val bad = object : SenderListener {
            override fun onHttp(success: Boolean, status: Int) = throw RuntimeException("listener bug")
            override fun onLocationAccepted(fix: LocationFix) = throw RuntimeException("listener bug")
        }
        val s = LocationSender(testConfig(), transport, queue, MockPolicy(true), scheduler, bad)
        s.started(); s.feed(fix(1), fix(2))
        assertEquals(2, transport.requests.size)
        assertEquals(0, queue.size)
    }

    @Test fun tokenNeverAppearsInStateOrConfigText() {
        val s = sender().started()
        s.feed(fix(1))
        assertFalse(s.state().toString().contains("tok-1"))
        assertFalse(testConfig().toString().contains("tok-1"))
    }
}
