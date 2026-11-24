package co.ordering.driver.location

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import java.io.File

/** The persisted queue belongs to the endpoint URL it was filled for. */
class OwnerTest {
    @get:Rule val tmp = TemporaryFolder()

    private val urlA = "http://localhost:8080/users/7/locations"
    private val urlB = "http://localhost:8080/users/8/locations"
    private val scheduler = ManualScheduler()
    private val transport = FakeTransport()

    private fun sender(url: String, latestWins: Boolean = false): Pair<LocationSender, FileLocationQueue> {
        val q = FileLocationQueue(tmp.root)
        val cfg = Config(url, mapOf("Authorization" to "Bearer t"), mapOf("driver_id" to 7), discardOlderOnSuccess = latestWins)
        return LocationSender(cfg, transport, q, MockPolicy(true), scheduler) to q
    }

    private fun LocationSender.go() { start(); scheduler.runPending() }

    @Test fun queueLevelClaim() {
        val q = FileLocationQueue(tmp.root)
        assertTrue(q.claim(urlA))            // first owner
        q.add(fix(1)); q.add(fix(2))
        assertFalse(q.claim(urlA))           // same: kept
        assertEquals(2, q.size)
        assertTrue(q.claim(urlB))            // other: cleared
        assertEquals(0, q.size)
        assertEquals(0, FileLocationQueue(tmp.root).size)
        assertFalse(FileLocationQueue(tmp.root).claim(urlB)) // owner persisted
    }

    @Test fun entriesWithNoRecordedOwnerAreNotTrusted() {
        // a queue file from before owners existed
        File(tmp.root, FileLocationQueue.FILE_NAME).writeText(FileLocationQueue.encodeLegacy(fix(1)) + "\n")
        val q = FileLocationQueue(tmp.root)
        assertEquals(1, q.size)
        q.claim(urlA)
        assertEquals(0, q.size)
    }

    @Test fun aNewSenderOverTheSameDirectoryWithAnotherUrlStartsEmptyAndSendsNothing() {
        val (a, qa) = sender(urlA)
        a.go()
        transport.default = FakeTransport.offline
        a.onFix(fix(1)); a.onFix(fix(2)); scheduler.runPending()
        assertEquals(2, qa.size)
        a.stop(); scheduler.runPending()      // the old process is gone
        transport.requests.clear()

        val (b, qb) = sender(urlB)           // after logout / login as another driver, or a restart
        assertEquals(0, qb.size)
        assertEquals(0, b.state().queued)
        b.go()
        b.flush(); b.onConnectivityRestored(); scheduler.advance(10 * 60_000)
        assertEquals(0, transport.requests.size)
        assertEquals(0, FileLocationQueue(tmp.root).size)
    }

    @Test fun aNewSenderOverTheSameDirectoryWithTheSameUrlKeepsAndSendsTheQueue() {
        val (a, _) = sender(urlA)
        a.go()
        transport.default = FakeTransport.offline
        a.onFix(fix(1)); a.onFix(fix(2)); scheduler.runPending()
        a.stop(); scheduler.runPending()      // the old process is gone
        transport.requests.clear()
        transport.default = FakeTransport.status(200)

        val (b, qb) = sender(urlA)
        assertEquals(2, qb.size)
        b.go()
        assertEquals(listOf(urlA, urlA), transport.requests.map { it.url })
        assertEquals(0, qb.size)
    }

    @Test fun updateConfigWithAnotherUrlClearsTheQueueAndSendsNothingOfTheOldOne() {
        val (s, q) = sender(urlA)
        s.go()
        transport.default = FakeTransport.offline
        s.onFix(fix(1)); s.onFix(fix(2)); scheduler.runPending()
        assertEquals(2, q.size)
        transport.requests.clear()
        transport.default = FakeTransport.status(200)

        s.updateConfig(Config(urlB, mapOf("Authorization" to "Bearer u"), mapOf("driver_id" to 8), discardOlderOnSuccess = false))
        scheduler.advance(10 * 60_000)       // also: the retry timer of the old queue is gone
        assertEquals(0, q.size)
        assertEquals(0, transport.requests.size)

        s.onFix(fix(3)); scheduler.runPending()
        assertEquals(listOf(urlB), transport.requests.map { it.url })
        assertTrue(transport.requests.single().body.endsWith("\"driver_id\":8}"))
    }

    @Test fun updateConfigWithTheSameUrlKeepsTheQueue() {
        val (s, q) = sender(urlA)
        s.go()
        transport.default = FakeTransport.offline
        s.onFix(fix(1)); scheduler.runPending()
        s.updateConfig(Config(urlA, mapOf("Authorization" to "Bearer t"), mapOf("driver_id" to 7), maxQueue = 50, discardOlderOnSuccess = false))
        scheduler.runPending()
        assertEquals(1, q.size)
    }

    @Test fun anotherDriverStartsFreshWithoutTheLastSentGuard() {
        val (s, _) = sender(urlA, latestWins = true)
        s.go()
        s.onFix(fix(9)); scheduler.runPending()          // sent: last sent = 9
        s.updateConfig(Config(urlB, mapOf("Authorization" to "Bearer u"), mapOf("driver_id" to 8))); scheduler.runPending()
        transport.requests.clear()
        s.onFix(fix(2)); scheduler.runPending()          // older than 9, but a different driver: accepted
        assertEquals(1, transport.requests.size)
        assertEquals(urlB, transport.requests[0].url)
    }
}
