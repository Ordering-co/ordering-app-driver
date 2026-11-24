package co.ordering.driver.location

import co.ordering.driver.location.FakeTransport.Companion.status
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder

/** `Retry-After` on a 429 (and 503): honoured when longer than the backoff, bounded to 5 minutes, on both lanes. */
class RetryAfterTest {
    @get:Rule val tmp = TemporaryFolder()

    private val scheduler = ManualScheduler()
    private val transport = FakeTransport()
    private val listener = RecordingListener()
    private val events = RecordingEventsListener()

    private fun sender(): LocationSender = LocationSender(
        eventsConfig(discardOlderOnSuccess = false), transport, FileLocationQueue(tmp.root), MockPolicy(true), scheduler, listener,
        events = EventsSetup(FileEventQueue(tmp.root), events)
    ).also { it.start(); scheduler.runPending() }

    @Test fun parsesPlainSecondsAndNothingElse() {
        assertEquals(120_000L, RetryAfter.parse("120"))
        assertEquals(0L, RetryAfter.parse(" 0 "))
        assertEquals(RetryAfter.MAX_MS, RetryAfter.parse("99999"))
        assertEquals(RetryAfter.MAX_MS, RetryAfter.parse("300"))
        assertNull(RetryAfter.parse(null))
        assertNull(RetryAfter.parse(""))
        assertNull(RetryAfter.parse("-5"))
        assertNull(RetryAfter.parse("1.5"))
        assertNull(RetryAfter.parse("Wed, 21 Oct 2026 07:28:00 GMT"))
        assertNull(RetryAfter.parse("9999999999999999999"))
    }

    @Test fun onlyA429Or503UsesIt() {
        assertEquals(30_000L, RetryAfter.delay(5_000, 429, 30_000))
        assertEquals(30_000L, RetryAfter.delay(5_000, 503, 30_000))
        assertEquals(5_000L, RetryAfter.delay(5_000, 500, 30_000))
        assertEquals(5_000L, RetryAfter.delay(5_000, null, 30_000))
        assertEquals(60_000L, RetryAfter.delay(60_000, 429, 10_000)) // the backoff when it is longer
        assertEquals(5_000L, RetryAfter.delay(5_000, 429, null))
    }

    @Test fun positionsWaitTheServersTimeOn429() {
        val s = sender()
        transport.enqueue(HttpResult.Response(429, 120_000L))
        s.onFix(fix(1)); scheduler.runPending()
        assertEquals(120_000L, listener.retries.single().first)
        scheduler.advance(119_999); assertEquals(1, transport.requests.size)
        scheduler.advance(1); assertEquals(2, transport.requests.size)
    }

    @Test fun positionsKeepTheBackoffWhenThereIsNoHeader() {
        val s = sender()
        transport.enqueue(status(429))
        s.onFix(fix(1)); scheduler.runPending()
        assertEquals(5_000L, listener.retries.single().first)
    }

    @Test fun eventsWaitTheServersTimeOn429() {
        val s = sender()
        transport.enqueue(HttpResult.Response(429, 45_000L))
        s.record(ev(1)); scheduler.runPending()
        assertEquals(45_000L, events.retries.single().first)
        scheduler.advance(44_999); assertEquals(1, transport.requests.size)
        scheduler.advance(1); assertEquals(2, transport.requests.size)
    }
}
