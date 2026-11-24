package co.ordering.driver.location

import co.ordering.driver.location.FakeTransport.Companion.status
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder

/**
 * A 401 is the answer to the headers the request was SENT with. The worker blocks in the HTTP call, so a change of headers (or a
 * stop) made from another thread meanwhile is only applied behind it: the answer must not be taken for the new session's.
 * (iOS has `headersGeneration` for the same thing.)
 */
class StaleAnswerTest {
    @get:Rule val tmp = TemporaryFolder()

    private val scheduler = ManualScheduler()
    private val transport = FakeTransport()
    private val listener = RecordingListener()
    private val events = RecordingEventsListener()
    private lateinit var queue: FileLocationQueue
    private lateinit var eventQueue: FileEventQueue

    private fun sender(): LocationSender {
        queue = FileLocationQueue(tmp.root)
        eventQueue = FileEventQueue(tmp.root)
        return LocationSender(eventsConfig(discardOlderOnSuccess = false), transport, queue, MockPolicy(true), scheduler, listener,
            events = EventsSetup(eventQueue, events)).also { it.start(); scheduler.runPending() }
    }

    private fun auth(r: FakeTransport.Request) = r.headers["Authorization"]
    private fun positions() = transport.requests.filter { it.url != EVENTS_URL }
    private fun eventRequests() = transport.requests.filter { it.url == EVENTS_URL }

    // ---- Sequence B: a token refresh while a request with the old token is in flight ----

    @Test fun a401ToARequestMadeWithTheOldTokenDoesNotRevokeTheNewOneAndTheNewTokenIsTried() {
        val s = sender()
        var first = true
        transport.onPost = { r ->
            if (first && r.url != EVENTS_URL) {
                first = false
                s.updateHeaders(mapOf("Authorization" to "Bearer tok-2")) // JS `configure` with a fresh token, mid-request
                transport.enqueue(status(401)) // the old token's answer
            }
        }
        s.onFix(fix(1)); scheduler.runPending()
        assertEquals("nothing is reported", emptyList<StateKind>(), listener.states.toList())
        assertFalse(s.state().unauthorized)
        assertEquals(listOf("Bearer tok-1", "Bearer tok-2"), positions().map(::auth))
        assertEquals("the position went out with the new token", 0, queue.size)
    }

    @Test fun aStaleAnswerStillLetsTheNewTokenBe401dAndThatIsReported() {
        val s = sender()
        var first = true
        transport.onPost = { r ->
            if (first && r.url != EVENTS_URL) {
                first = false
                s.updateHeaders(mapOf("Authorization" to "Bearer tok-2"))
            }
        }
        transport.default = status(401) // both tokens are refused
        s.onFix(fix(1)); scheduler.runPending()
        assertEquals(listOf("Bearer tok-1", "Bearer tok-2"), positions().map(::auth))
        assertEquals(listOf(StateKind.UNAUTHORIZED), listener.states.toList()) // the real 401 of the current headers
        assertTrue(s.state().unauthorized)
    }

    @Test fun updateConfigIsTheSameAsUpdateHeaders() {
        val s = sender()
        var first = true
        transport.onPost = { r ->
            if (first && r.url != EVENTS_URL) {
                first = false
                s.updateConfig(eventsConfig(token = "tok-2", discardOlderOnSuccess = false))
                transport.enqueue(status(401))
            }
        }
        s.onFix(fix(1)); scheduler.runPending()
        assertEquals(emptyList<StateKind>(), listener.states.toList())
        assertEquals(listOf("Bearer tok-1", "Bearer tok-2"), positions().map(::auth))
    }

    @Test fun theEventsLaneDoesTheSameForAStaleBatch() {
        val s = sender()
        var first = true
        transport.onPost = { r ->
            if (first && r.url == EVENTS_URL) {
                first = false
                s.updateHeaders(mapOf("Authorization" to "Bearer tok-2"))
                transport.enqueue(status(401))
            }
        }
        s.record(ev(1)); scheduler.runPending()
        assertEquals(emptyList<StateKind>(), listener.states.toList())
        assertEquals(listOf("Bearer tok-1", "Bearer tok-2"), eventRequests().map(::auth))
        assertEquals(0, eventQueue.size)
    }

    // ---- Sequence A: a logout, then a new sign-in, while the old worker finishes a request ----

    @Test fun aSenderStoppedWhileARequestWasInFlightReportsNothingWhenItIs401() {
        val s = sender()
        transport.onPost = { r ->
            if (r.url != EVENTS_URL) {
                s.stop() // the logout
                transport.enqueue(status(401)) // the old token, revoked by the logout itself
            }
        }
        s.onFix(fix(1)); scheduler.runPending()
        assertEquals("a stopped sender tells nobody", emptyList<StateKind>(), listener.states.toList())
        assertFalse(s.state().unauthorized)
        assertEquals("the position is kept", 1, queue.size)
        assertEquals(1, positions().size)
    }

    @Test fun aStoppedSendersEventsAreNotReportedEither() {
        val s = sender()
        s.stop(); scheduler.runPending()
        transport.default = status(401)
        s.record(ev(1)) // the `tracking_stopped` of that stop, answered 401
        scheduler.runPending()
        assertEquals(emptyList<StateKind>(), listener.states.toList())
    }

    // ---- retire ----

    @Test fun aRetiredSenderSendsWhatIsQueuedButSetsNoTimerAfterwards() {
        val s = sender()
        transport.default = FakeTransport.offline
        s.retire()
        s.stop()
        s.record(ev(1)) // the last event: one attempt, which fails
        scheduler.runPending()
        assertEquals(1, eventRequests().size)
        assertEquals("no retry is left behind on the shared worker", 0, scheduler.pendingDelayed())
        assertEquals("the event waits on disk", 1, eventQueue.size)
    }
}
