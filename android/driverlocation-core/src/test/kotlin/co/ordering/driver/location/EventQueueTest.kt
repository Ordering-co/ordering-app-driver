package co.ordering.driver.location

import java.io.File
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder

class EventQueueTest {
    @get:Rule val tmp = TemporaryFolder()

    private fun json(n: Int) = ev(n).toJson()

    @Test fun addsInOrderAndPeeksTheOldestBatch() {
        val q = FileEventQueue(tmp.root)
        (1..5).forEach { q.add(json(it)) }
        assertEquals(5, q.size)
        assertEquals(listOf(1, 2, 3), q.peekBatch(3).map { eventNumbers(it.json).single() })
        assertEquals(5, q.size) // peeking removes nothing
    }

    @Test fun removeThroughRemovesTheBatchAndKeepsTheNewer() {
        val q = FileEventQueue(tmp.root)
        (1..5).forEach { q.add(json(it)) }
        val batch = q.peekBatch(3)
        q.add(json(6)) // arrives while the batch is in flight
        assertEquals(3, q.removeThrough(batch.last().seq))
        assertEquals(listOf(4, 5, 6), q.peekBatch(10).map { eventNumbers(it.json).single() })
    }

    @Test fun survivesTheProcess() {
        val q = FileEventQueue(tmp.root)
        q.claim("owner-a")
        (1..3).forEach { q.add(json(it)) }
        val again = FileEventQueue(tmp.root)
        assertEquals(listOf(1, 2, 3), again.peekBatch(10).map { eventNumbers(it.json).single() })
        again.add(json(4))
        assertTrue("sequences keep growing", again.peekBatch(10).map { it.seq }.zipWithNext().all { (a, b) -> b > a })
        assertFalse(again.claim("owner-a")) // same owner: kept
        assertEquals(4, again.size)
    }

    @Test fun theCapDropsTheOldestAndSaysHowMany() {
        val q = FileEventQueue(tmp.root, max = 5)
        var dropped = 0
        (1..8).forEach { dropped += q.add(json(it)) }
        assertEquals(3, dropped)
        assertEquals(listOf(4, 5, 6, 7, 8), q.peekBatch(10).map { eventNumbers(it.json).single() })
        assertEquals(listOf(4, 5, 6, 7, 8), FileEventQueue(tmp.root, max = 5).peekBatch(10).map { eventNumbers(it.json).single() })
    }

    @Test fun theDefaultCapIs500() {
        assertEquals(500, FileEventQueue.DEFAULT_MAX_EVENTS)
        val q = FileEventQueue(tmp.root)
        var dropped = 0
        (1..503).forEach { dropped += q.add(json(it % 1000)) }
        assertEquals(3, dropped)
        assertEquals(500, q.size)
    }

    @Test fun anotherOwnerClearsTheQueueAndTheSameOwnerKeepsIt() {
        val q = FileEventQueue(tmp.root)
        assertTrue("an unowned queue is claimed", q.claim("driver-7"))
        q.add(json(1))
        assertFalse(q.claim("driver-7"))
        assertEquals(1, q.size)
        assertTrue(q.claim("driver-8"))
        assertEquals(0, q.size)
        assertEquals(0, FileEventQueue(tmp.root).size)
    }

    @Test fun entriesWithNoRecordedOwnerAreClearedAtTheFirstClaim() {
        FileEventQueue(tmp.root).add(json(1)) // a file with no owner file
        val q = FileEventQueue(tmp.root)
        assertEquals(1, q.size)
        assertTrue(q.claim("driver-7"))
        assertEquals(0, q.size)
    }

    @Test fun aGarbledOrTruncatedLineIsSkippedAndTheFileIsRewrittenClean() {
        val q = FileEventQueue(tmp.root)
        (1..3).forEach { q.add(json(it)) }
        val file = File(tmp.root, FileEventQueue.FILE_NAME)
        val lines = file.readText().trimEnd('\n').split('\n').toMutableList()
        lines[1] = lines[1].replace("turn_off", "turn_xxx") // fails its CRC
        file.writeText(lines.joinToString("\n") + "\n" + "7\t{\"uuid\":\"trunc") // and a half-written last line
        val loaded = FileEventQueue(tmp.root)
        assertEquals(listOf(1, 3), loaded.peekBatch(10).map { eventNumbers(it.json).single() })
        assertEquals(2, file.readText().trimEnd('\n').split('\n').size)
    }

    @Test fun theQueueHoldsNoTokenOrUrl() {
        val q = FileEventQueue(tmp.root)
        q.claim("http://localhost:8080/users/7/locations\nhttp://localhost:8080/tracking_events")
        q.add(json(1))
        val text = File(tmp.root, FileEventQueue.FILE_NAME).readText()
        assertFalse("Bearer" in text || "Authorization" in text || "localhost" in text)
    }

    @Test fun aRawTabOrBreakInAnEventIsRefused() {
        val q = FileEventQueue(tmp.root)
        try { q.add("{\"a\":\"x\ty\"}"); throw AssertionError("expected") } catch (_: IllegalArgumentException) {}
    }
}
