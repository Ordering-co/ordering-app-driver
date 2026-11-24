package co.ordering.driver.location

import co.ordering.driver.location.FakeTransport.Companion.offline
import co.ordering.driver.location.FakeTransport.Companion.status
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder

/** The events lane of [LocationSender] / [EventSender], on a virtual clock and a scripted transport. */
class EventSenderTest {
    @get:Rule val tmp = TemporaryFolder()

    private val scheduler = ManualScheduler()
    private val transport = FakeTransport()
    private val listener = RecordingListener()
    private val events = RecordingEventsListener()
    private lateinit var queue: FileLocationQueue
    private lateinit var eventQueue: FileEventQueue

    private fun sender(config: Config = eventsConfig(), eventsSetup: Boolean = true): LocationSender {
        queue = FileLocationQueue(tmp.root, config.maxQueue)
        eventQueue = FileEventQueue(tmp.root)
        return LocationSender(
            config, transport, queue, MockPolicy(true), scheduler, listener,
            events = if (eventsSetup) EventsSetup(eventQueue, events) else null
        )
    }

    private fun LocationSender.started(): LocationSender {
        start(); scheduler.runPending(); return this
    }

    private fun LocationSender.rec(vararg numbers: Int) {
        numbers.forEach { record(ev(it)) }
        scheduler.runPending()
    }

    private fun eventRequests() = transport.requests.filter { it.url == EVENTS_URL }
    private fun positionRequests() = transport.requests.filter { it.url != EVENTS_URL }

    // ---- the request ----

    @Test fun oneEventIsPostedToTheEventsUrlWithTheContractsBody() {
        val s = sender().started()
        s.rec(1)
        val r = eventRequests().single()
        assertEquals(EVENTS_URL, r.url)
        assertEquals(
            """{"events":"[{\"uuid\":\"00000000-0000-4000-8000-000000000001\",\"event\":\"turn_off_gps\",\"occurred_at\":\"2026-11-19 00:00:01\",\"data\":{\"platform\":\"android\",\"app_state\":\"foreground\"}}]"}""",
            r.body
        )
        assertEquals(0, eventQueue.size)
        assertEquals(listOf(200 to 1), events.https.toList())
    }

    @Test fun theHeadersAreTheSameAsThePositionsRequests() {
        val config = eventsConfig(extraHeaders = mapOf("User-Agent" to "Driver/1 (test)", "X-Device-Id-X" to "device-xyz"))
        val s = sender(config).started()
        s.onFix(fix(1)); scheduler.runPending()
        s.rec(1)
        assertEquals(1, positionRequests().size)
        assertEquals(1, eventRequests().size)
        assertEquals(positionRequests().single().headers, eventRequests().single().headers)
        assertEquals("Bearer tok-1", eventRequests().single().headers["Authorization"])
        assertEquals("Driver/1 (test)", eventRequests().single().headers["User-Agent"])
        assertEquals("device-xyz", eventRequests().single().headers["X-Device-Id-X"])
    }

    @Test fun anEventRecordedAfterTheStopIsStillSent() {
        val s = sender().started()
        s.stop(); scheduler.runPending()
        s.rec(1)
        assertEquals(1, eventRequests().size) // the `tracking_stopped` of a stop reaches the API
    }

    @Test fun withoutAnEventsUrlNothingIsRecordedWrittenOrSent() {
        val s = sender(eventsConfig(eventsUrl = null)).started()
        s.rec(1, 2)
        assertEquals(0, transport.requests.size)
        assertEquals(0, eventQueue.size)
        assertFalse(java.io.File(tmp.root, FileEventQueue.FILE_NAME).exists())
        assertFalse(java.io.File(tmp.root, FileEventQueue.OWNER_FILE_NAME).exists())
    }

    @Test fun aSenderBuiltWithoutTheLaneIgnoresEvents() {
        val s = sender(eventsSetup = false).started()
        s.rec(1)
        assertEquals(0, transport.requests.size)
        assertEquals(0, s.queuedEvents)
    }

    @Test fun anEventsUrlThatIsNotHttpIsAConfigError() {
        try {
            eventsConfig(eventsUrl = "ftp://x/y")
            throw AssertionError("expected")
        } catch (e: ConfigException) {
            assertTrue(e.problems.single().startsWith("eventsUrl:"))
        }
    }

    @Test fun theEventsUrlSurvivesWithHeadersAndDefaultHeaders() {
        val c = eventsConfig()
        assertEquals(EVENTS_URL, c.withHeaders(mapOf("Authorization" to "Bearer new")).eventsUrl)
        assertEquals(EVENTS_URL, c.withDefaultHeaders(mapOf("User-Agent" to "x")).eventsUrl)
        assertEquals("http://localhost:8080/users/7/locations\n$EVENTS_URL", c.eventsOwner)
        assertEquals(null, eventsConfig(eventsUrl = null).eventsOwner)
    }

    // ---- batches ----

    @Test fun batchesOfAtMost100OldestFirst() {
        val s = sender()
        // Recorded while offline so that 250 are waiting, then the connection comes back.
        transport.default = offline
        s.started()
        (1..250).forEach { s.record(ev(it)) }
        scheduler.runPending()
        transport.requests.clear()
        transport.default = status(200)
        s.onConnectivityRestored()
        scheduler.runPending()
        val sizes = eventRequests().map { eventNames(it.body).size }
        assertEquals(listOf(100, 100, 50), sizes)
        assertEquals((1..250).toList(), eventRequests().flatMap { eventNumbers(it.body) })
        assertEquals(0, eventQueue.size)
    }

    @Test fun aBatchNeverHoldsMoreThan100EvenWhenTheyArriveInOneBurst() {
        transport.default = status(200)
        val s = sender().started()
        (1..230).forEach { s.record(ev(it)) }
        scheduler.runPending()
        assertTrue(eventRequests().all { eventNames(it.body).size <= 100 })
        assertEquals((1..230).toList(), eventRequests().flatMap { eventNumbers(it.body) })
    }

    // ---- statuses ----

    @Test fun networkErrorKeepsTheBatchAndRetriesWithTheBackoff() {
        transport.enqueue(offline, offline, offline, offline)
        val s = sender().started()
        s.rec(1)
        assertEquals(1, eventQueue.size)
        assertEquals(listOf(5000L), events.retries.map { it.first })
        scheduler.advance(5000)
        assertEquals(listOf(5000L, 15000L), events.retries.map { it.first })
        scheduler.advance(15000)
        assertEquals(listOf(5000L, 15000L, 60000L), events.retries.map { it.first })
        scheduler.advance(60000)
        assertEquals(listOf(5000L, 15000L, 60000L, 60000L), events.retries.map { it.first })
        scheduler.advance(60000) // the fifth attempt succeeds
        assertEquals(0, eventQueue.size)
        assertEquals(5, eventRequests().size)
        assertTrue("the retries carry the same event", eventRequests().all { eventNumbers(it.body) == listOf(1) })
    }

    private fun lane(dir: java.io.File, sched: ManualScheduler, t: FakeTransport, l: RecordingEventsListener): LocationSender =
        LocationSender(eventsConfig(), t, FileLocationQueue(dir), MockPolicy(true), sched, RecordingListener(), events = EventsSetup(FileEventQueue(dir), l))

    @Test fun serverErrorsAnd408And429AreKeptAndRetried() {
        for (code in listOf(500, 503, 408, 429)) {
            val sched = ManualScheduler()
            val t = FakeTransport().also { it.enqueue(status(code)) }
            val l = RecordingEventsListener()
            val s = lane(tmp.newFolder(), sched, t, l)
            s.start(); sched.runPending()
            s.record(ev(1)); sched.runPending()
            assertEquals("$code kept", 1, s.queuedEvents)
            assertEquals("$code retried with the backoff", listOf(Triple(5000L, code as Int?, 1)), l.retries.toList())
            sched.advance(5000)
            assertEquals("$code sent on the retry", 0, s.queuedEvents)
        }
    }

    @Test fun otherClientErrorsDropThatBatchWithOneLogLineAndNeverRetry() {
        for (code in listOf(400, 404, 422, 413, 301)) {
            val sched = ManualScheduler()
            val t = FakeTransport().also { it.enqueue(status(code)) }
            val l = RecordingEventsListener()
            val s = lane(tmp.newFolder(), sched, t, l)
            s.start(); sched.runPending()
            s.record(ev(1)); sched.runPending()
            assertEquals("$code dropped", 0, s.queuedEvents)
            assertEquals(listOf(1 to "http $code"), l.dropped.toList())
            assertEquals("$code never retried", 0, l.retries.size)
            sched.advance(120_000)
            assertEquals("$code sent once", 1, t.requests.size)
            // and the next event goes out normally
            s.record(ev(2)); sched.runPending()
            assertEquals(2, t.requests.size)
        }
    }

    @Test fun aDroppedBatchDoesNotTakeTheEventsRecordedAfterItWithIt() {
        val s = sender().started()
        transport.enqueue(status(422))
        s.record(ev(1)); s.record(ev(2)); s.record(ev(3))
        scheduler.runPending()
        assertEquals(0, eventQueue.size)
        val first = eventNumbers(eventRequests()[0].body)
        assertEquals((1..3).toList().filter { it !in first }, eventRequests().drop(1).flatMap { eventNumbers(it.body) })
    }

    @Test fun a401StopsTheLaneKeepsTheQueueAndReportsUnauthorizedOnce() {
        val s = sender().started()
        transport.default = status(401)
        s.rec(1)
        s.rec(2)
        s.rec(3)
        assertEquals(1, eventRequests().size) // stopped after the first answer
        assertEquals(3, eventQueue.size)
        assertEquals(listOf(StateKind.UNAUTHORIZED), listener.states.toList())
        scheduler.advance(300_000)
        assertEquals(1, eventRequests().size) // no retry
    }

    @Test fun a403DropsThatBatchWithTheLogLineAndTheLaneKeepsWorking() {
        val s = sender().started()
        transport.enqueue(status(403))
        s.rec(1)
        assertEquals(1, eventRequests().size)
        assertEquals(0, eventQueue.size) // dropped, not kept
        assertEquals(listOf(1 to "http 403"), events.dropped.toList())
        assertEquals(0, events.retries.size)
        // the next batch is sent, with the same headers, and accepted
        s.rec(2)
        assertEquals(2, eventRequests().size)
        assertEquals(listOf(2), eventNumbers(eventRequests().last().body))
        assertEquals(0, eventQueue.size)
        assertEquals(listOf(403 to 1, 200 to 1), events.https.toList())
        scheduler.advance(300_000)
        assertEquals(2, eventRequests().size) // never retried
    }

    @Test fun a403NeverReachesTheUnauthorizedListenerAndPositionsAreUnaffected() {
        val s = sender().started()
        transport.default = status(403) // the events endpoint refuses everything, every time
        s.rec(1)
        s.rec(2)
        s.rec(3)
        assertEquals(3, eventRequests().size) // each batch went out and was dropped; the lane never stopped
        assertEquals(0, eventQueue.size)
        assertEquals(emptyList<StateKind>(), listener.states.toList())
        assertFalse(s.state().unauthorized)
        transport.default = status(200)
        s.onFix(fix(1)); scheduler.runPending()
        assertEquals(1, positionRequests().size)
        assertEquals(0, s.state().queued)
        assertEquals(emptyList<StateKind>(), listener.states.toList())
    }

    @Test fun a403OnAFullBatchDropsTheWholeBatchAndTheNextOneGoesOut() {
        val s = sender()
        transport.default = offline
        s.started()
        (1..150).forEach { s.record(ev(it)) }
        scheduler.runPending()
        transport.requests.clear()
        transport.default = status(200)
        transport.enqueue(status(403)) // the first batch (100 events) is refused
        s.onConnectivityRestored(); scheduler.runPending()
        assertEquals(listOf(100 to "http 403"), events.dropped.toList())
        assertEquals(0, eventQueue.size)
        assertEquals(2, eventRequests().size)
        assertEquals(50, eventNumbers(eventRequests()[1].body).size) // the next batch is the other 50
        assertEquals(emptyList<StateKind>(), listener.states.toList())
    }

    @Test fun a403DoesNotLatchTheLaneSoALater401StillCounts() {
        val s = sender().started()
        transport.enqueue(status(403), status(401))
        s.rec(1)
        s.rec(2)
        assertEquals(listOf(StateKind.UNAUTHORIZED), listener.states.toList()) // only the 401 reported
        assertEquals(1, eventQueue.size) // the 401's batch is kept
    }

    @Test fun aPositionsRequestAnswering401WhileEventsArePendingReportsOnce() {
        val s = sender().started()
        transport.default = offline
        s.rec(1) // events pending: offline, a retry is scheduled
        assertEquals(1, eventQueue.size)
        transport.default = status(401)
        s.onFix(fix(1)); scheduler.runPending() // positions: 401
        assertEquals(listOf(StateKind.UNAUTHORIZED), listener.states.toList())
        assertTrue(s.state().unauthorized)
        scheduler.advance(300_000) // the events retry runs and is answered 401 as well
        assertEquals(listOf(StateKind.UNAUTHORIZED), listener.states.toList()) // still once
        assertEquals(1, eventQueue.size) // kept
    }

    @Test fun anEventsRequestAnswering401WhilePositionsArePendingReportsOnce() {
        val s = sender().started()
        transport.default = status(401)
        s.rec(1) // events: 401 first
        s.onFix(fix(1)); scheduler.runPending() // then the position: 401 as well
        assertEquals(listOf(StateKind.UNAUTHORIZED), listener.states.toList())
        assertEquals(1, eventQueue.size)
        assertEquals(1, s.state().queued) // the position is kept
    }

    @Test fun newHeadersResumeTheLaneAndTheQueuedEventsGoOutWithTheNewToken() {
        val s = sender().started()
        transport.default = status(401)
        s.rec(1, 2)
        transport.default = status(200)
        s.updateHeaders(mapOf("Authorization" to "Bearer tok-2")); scheduler.runPending()
        assertEquals(0, eventQueue.size)
        val last = eventRequests().last()
        assertEquals("Bearer tok-2", last.headers["Authorization"])
        assertEquals(listOf(1, 2), eventNumbers(last.body))
        // and a later 401 reports again (a new set of headers)
        transport.default = status(401)
        s.rec(3)
        assertEquals(listOf(StateKind.UNAUTHORIZED, StateKind.UNAUTHORIZED), listener.states.toList())
    }

    @Test fun theSameHeadersDoNotResumeALatchedLane() {
        val s = sender().started()
        transport.default = status(401)
        s.rec(1)
        val before = transport.requests.size
        s.updateHeaders(mapOf("Authorization" to "Bearer tok-1")); scheduler.runPending()
        assertEquals(before, transport.requests.size)
    }

    @Test fun aPositionsAnd401AndAnEventsAnd401ReportOnlyOnce() {
        val s = sender().started()
        transport.default = status(401)
        s.onFix(fix(1)); scheduler.runPending() // positions: 401
        s.rec(1) // events: 401
        assertEquals(listOf(StateKind.UNAUTHORIZED), listener.states.toList())
    }

    @Test fun anEventsRevocationAfterTheStopIsNotReportedToJavaScript() {
        val s = sender().started()
        s.stop(); scheduler.runPending()
        transport.default = status(401)
        s.rec(1)
        assertEquals(emptyList<StateKind>(), listener.states.toList())
        assertEquals(1, eventQueue.size)
    }

    // ---- positions first, connectivity ----

    @Test fun positionsGoFirstWhenBothArePending() {
        // Both queues hold work from a previous run; the start sends the position, then the events.
        val fq = FileLocationQueue(tmp.root).also { it.claim(eventsConfig().url); it.add(fix(1)) }
        val eq = FileEventQueue(tmp.root).also { it.claim(eventsConfig().eventsOwner!!); it.add(ev(1).toJson()); it.add(ev(2).toJson()) }
        val s = LocationSender(eventsConfig(), transport, fq, MockPolicy(true), scheduler, listener, events = EventsSetup(eq, events))
        s.start(); scheduler.runPending()
        assertEquals(listOf("/users/7/locations", "/tracking_events"), transport.requests.map { it.url.substringAfter("8080") })
    }

    @Test fun anEventDoesNotGoAheadOfAPositionThatIsAlreadyWaitingOnTheWorker() {
        val s = sender().started()
        s.onFix(fix(1)) // posted first
        s.record(ev(1)) // posted second
        scheduler.runPending()
        assertEquals(listOf("/users/7/locations", "/tracking_events"), transport.requests.map { it.url.substringAfter("8080") })
    }

    @Test fun aLongEventsQueueNeverHoldsAPositionBehindMoreThanOneBatch() {
        val s = sender()
        transport.default = offline
        s.started()
        (1..250).forEach { s.record(ev(it)) }
        scheduler.runPending()
        transport.requests.clear()
        transport.default = status(200)
        s.onConnectivityRestored()
        s.onFix(fix(5)) // arrives right behind the restore
        scheduler.runPending()
        val urls = transport.requests.map { if (it.url == EVENTS_URL) "E" else "P" }
        assertTrue(urls.toString(), urls.indexOf("P") <= 1)
    }

    @Test fun connectivityRestoredSendsTheEventsAtOnceAndResetsTheBackoff() {
        val s = sender().started()
        transport.default = offline
        s.rec(1)
        assertEquals(1, eventRequests().size)
        transport.default = status(200)
        s.onConnectivityRestored(); scheduler.runPending()
        assertEquals(2, eventRequests().size)
        assertEquals(0, eventQueue.size)
    }

    @Test fun flushSendsPendingEvents() {
        val s = sender().started()
        transport.default = offline
        s.rec(1)
        transport.default = status(200)
        s.flush(); scheduler.runPending()
        assertEquals(0, eventQueue.size)
    }

    @Test fun theMinimumPositionIntervalDoesNotGateTheEvents() {
        val s = sender(eventsConfig(minSendIntervalMs = 5000)).started()
        s.onFix(fix(1)); scheduler.runPending()
        s.onFix(fix(2)); scheduler.runPending() // deferred by the floor
        s.rec(1)
        assertEquals(1, eventRequests().size)
        assertEquals(1, positionRequests().size)
    }

    // ---- the queue and its owner ----

    @Test fun eventsLeftByAPreviousRunAreSentAtTheNextStart() {
        val eq = FileEventQueue(tmp.root).also { it.claim(eventsConfig().eventsOwner!!); it.add(ev(1).toJson()); it.add(ev(2).toJson()) }
        val s = LocationSender(eventsConfig(), transport, FileLocationQueue(tmp.root), MockPolicy(true), scheduler, listener, events = EventsSetup(eq, events))
        assertEquals(0, transport.requests.size)
        s.start(); scheduler.runPending()
        assertEquals(listOf(1, 2), eventNumbers(eventRequests().single().body))
    }

    @Test fun anotherDriversEventsAreClearedBeforeAnythingIsSent() {
        FileEventQueue(tmp.root).also { it.claim("http://localhost:8080/users/99/locations\n$EVENTS_URL"); it.add(ev(1).toJson()) }
        val s = sender().started() // driver 7
        assertEquals(0, eventQueue.size)
        assertEquals(0, eventRequests().size)
        s.rec(2)
        assertEquals(listOf(2), eventNumbers(eventRequests().single().body))
    }

    @Test fun configureWithAnotherDriverClearsTheEventsAndTheSameOneKeepsThem() {
        val s = sender().started()
        transport.default = offline
        s.rec(1, 2)
        s.updateConfig(eventsConfig(token = "tok-1")); scheduler.runPending()
        assertEquals("same driver keeps", 2, eventQueue.size)
        val other = Config(
            url = "http://localhost:8080/users/8/locations", headers = mapOf("Authorization" to "Bearer t8"),
            extras = mapOf("driver_id" to 8), eventsUrl = EVENTS_URL
        )
        s.updateConfig(other); scheduler.runPending()
        assertEquals("another driver clears", 0, eventQueue.size)
    }

    @Test fun theCapDropsTheOldestWithOneLogLine() {
        queue = FileLocationQueue(tmp.root)
        eventQueue = FileEventQueue(tmp.root, max = 5)
        val s = LocationSender(eventsConfig(), transport, queue, MockPolicy(true), scheduler, listener, events = EventsSetup(eventQueue, events))
        s.start(); scheduler.runPending()
        transport.default = offline
        (1..8).forEach { s.record(ev(it)) }
        scheduler.runPending()
        assertEquals(5, eventQueue.size)
        assertEquals(listOf(1 to "queue full", 1 to "queue full", 1 to "queue full"), events.dropped.toList())
        assertEquals(listOf(4, 5, 6, 7, 8), eventQueue.peekBatch(10).map { eventNumbers(it.json).single() })
    }

    @Test fun turningTheEventsUrlOffStopsSendingAndKeepsWhatIsOnDisk() {
        val s = sender().started()
        transport.default = offline
        s.rec(1)
        s.updateConfig(eventsConfig(eventsUrl = null)); scheduler.runPending()
        scheduler.advance(120_000)
        assertEquals("no retry once the recorder is off", 1, eventRequests().size)
        s.rec(2)
        assertEquals("nothing more is recorded", 1, eventQueue.size)
    }

    @Test fun turningTheEventsUrlOnWhileRunningSendsWhatWasWaiting() {
        val eq = FileEventQueue(tmp.root).also { it.claim(eventsConfig().eventsOwner!!); it.add(ev(1).toJson()) }
        val s = LocationSender(eventsConfig(eventsUrl = null), transport, FileLocationQueue(tmp.root), MockPolicy(true), scheduler, listener, events = EventsSetup(eq, events))
        s.start(); scheduler.runPending()
        assertEquals(0, eventRequests().size)
        s.updateConfig(eventsConfig()); scheduler.runPending()
        assertEquals(listOf(1), eventNumbers(eventRequests().single().body))
    }

    @Test fun anExceptionFromTheTransportBecomesANetworkError() {
        transport.onPost = { throw IllegalStateException("boom") }
        val s = sender().started()
        s.rec(1)
        assertEquals(1, eventQueue.size)
        assertEquals(listOf(5000L), events.retries.map { it.first })
    }

    @Test fun theListenerHearsEachEventAndRequest() {
        val s = sender().started()
        s.rec(1)
        assertEquals(listOf(EventNames.TURN_OFF_GPS to 1), events.recorded.toList())
        assertEquals(listOf(1 to 1), events.requests.toList())
    }
}
