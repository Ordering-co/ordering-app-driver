package co.ordering.driver.location

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import java.io.File

class FileLocationQueueTest {
    @get:Rule val tmp = TemporaryFolder()

    private fun drain(q: LocationQueue): List<LocationFix> {
        val out = ArrayList<LocationFix>()
        while (true) {
            out.add(q.peek() ?: break)
            q.removeFirst()
        }
        return out
    }

    private val queueFile get() = File(tmp.root, FileLocationQueue.FILE_NAME)

    @Test fun firstInFirstOut() {
        val q = FileLocationQueue(tmp.root)
        (1..5).forEach { q.add(fix(it)) }
        assertEquals(5, q.size)
        assertEquals((1..5).map { fix(it) }, drain(q))
        assertEquals(0, q.size)
        assertNull(q.peek())
        assertFalse(q.removeFirst())
    }

    @Test fun peekDoesNotRemove() {
        val q = FileLocationQueue(tmp.root)
        q.add(fix(1))
        assertEquals(fix(1), q.peek())
        assertEquals(fix(1), q.peek())
        assertEquals(1, q.size)
    }

    @Test fun boundDropsTheOldest() {
        val q = FileLocationQueue(tmp.root, maxQueue = 3)
        (1..7).forEach { q.add(fix(it)) }
        assertEquals(3, q.size)
        assertEquals(listOf(fix(5), fix(6), fix(7)), drain(q))
    }

    @Test fun loweringTheBoundTrimsTheOldest() {
        val q = FileLocationQueue(tmp.root, maxQueue = 10)
        (1..6).forEach { q.add(fix(it)) }
        q.setMaxQueue(2)
        assertEquals(listOf(fix(5), fix(6)), drain(q))
    }

    @Test fun survivesANewInstanceOverTheSameDirectory() {
        val a = FileLocationQueue(tmp.root)
        (1..4).forEach { a.add(fix(it, mock = it == 2)) }
        a.removeFirst()
        val b = FileLocationQueue(tmp.root)
        assertEquals(3, b.size)
        assertEquals(listOf(fix(2, mock = true), fix(3), fix(4)), drain(b))
        // and an emptied queue stays empty after a restart
        assertEquals(0, FileLocationQueue(tmp.root).size)
    }

    @Test fun keepsOptionalFieldsAndExactDoubles() {
        val f = LocationFix(19.43260800000001, -99.13320900000002, accuracy = null, speed = null, timestamp = 42L)
        FileLocationQueue(tmp.root).add(f)
        assertEquals(f, FileLocationQueue(tmp.root).peek())
    }

    @Test fun boundIsAppliedAtLoad() {
        val a = FileLocationQueue(tmp.root, maxQueue = 10)
        (1..6).forEach { a.add(fix(it)) }
        assertEquals(listOf(fix(5), fix(6)), drain(FileLocationQueue(tmp.root, maxQueue = 2)))
    }

    @Test fun aTruncatedLastLineIsIgnoredAndTheRestKept() {
        val a = FileLocationQueue(tmp.root)
        (1..3).forEach { a.add(fix(it)) }
        val bytes = queueFile.readBytes()
        queueFile.writeBytes(bytes.copyOf(bytes.size - 9)) // cut inside the last line
        assertEquals(listOf(fix(1), fix(2)), drain(FileLocationQueue(tmp.root)))
    }

    @Test fun truncationThenAppendThenRestartKeepsEverythingReadable() {
        val a = FileLocationQueue(tmp.root)
        (1..3).forEach { a.add(fix(it)) }
        val bytes = queueFile.readBytes()
        queueFile.writeBytes(bytes.copyOf(bytes.size - 5))
        val b = FileLocationQueue(tmp.root)
        b.add(fix(9))
        assertEquals(listOf(fix(1), fix(2), fix(9)), drain(FileLocationQueue(tmp.root)))
    }

    @Test fun garbageInTheMiddleSkipsOnlyThatLine() {
        val a = FileLocationQueue(tmp.root)
        (1..3).forEach { a.add(fix(it)) }
        val lines = queueFile.readText().split("\n").filter { it.isNotEmpty() }.toMutableList()
        lines[1] = "this is not\ta record"
        queueFile.writeText(lines.joinToString("\n") + "\n")
        assertEquals(listOf(fix(1), fix(3)), drain(FileLocationQueue(tmp.root)))
    }

    @Test fun aFlippedByteFailsTheChecksum() {
        val a = FileLocationQueue(tmp.root)
        (1..3).forEach { a.add(fix(it)) }
        val lines = queueFile.readText().split("\n").filter { it.isNotEmpty() }.toMutableList()
        lines[0] = lines[0].replaceFirst("10.001", "10.002")
        queueFile.writeText(lines.joinToString("\n") + "\n")
        assertEquals(listOf(fix(2), fix(3)), drain(FileLocationQueue(tmp.root)))
    }

    @Test fun binaryGarbageAndEmptyFilesNeverCrash() {
        queueFile.writeBytes(ByteArray(2048) { (it * 31 + 7).toByte() })
        assertEquals(0, FileLocationQueue(tmp.root).size)
        queueFile.writeBytes(ByteArray(0))
        assertEquals(0, FileLocationQueue(tmp.root).size)
        queueFile.writeText("\n\n\n")
        assertEquals(0, FileLocationQueue(tmp.root).size)
        // and it is usable afterwards
        val q = FileLocationQueue(tmp.root)
        q.add(fix(1))
        assertEquals(listOf(fix(1)), drain(FileLocationQueue(tmp.root)))
    }

    @Test fun outOfRangeCoordinatesInTheFileAreSkipped() {
        val bad = FileLocationQueue.encode(QueuedFix(1, LocationFix(95.0, 0.0, null, null, 1L)))
        val good = FileLocationQueue.encode(QueuedFix(2, fix(1)))
        queueFile.writeText("$bad\n$good\n")
        assertEquals(listOf(fix(1)), drain(FileLocationQueue(tmp.root)))
    }

    @Test fun missingDirectoryIsCreated() {
        val dir = File(tmp.root, "a/b")
        val q = FileLocationQueue(dir)
        q.add(fix(1))
        assertEquals(listOf(fix(1)), drain(FileLocationQueue(dir)))
    }

    @Test fun anUnwritableLocationDoesNotCrashAndTheQueueWorksInMemory() {
        val blocker = tmp.newFile("blocker") // a FILE where the directory should be
        val q = FileLocationQueue(File(blocker, "sub"))
        q.add(fix(1)); q.add(fix(2))
        assertEquals(2, q.size)
        assertEquals(listOf(fix(1), fix(2)), drain(q))
    }

    @Test fun clearEmptiesDisk() {
        val q = FileLocationQueue(tmp.root)
        (1..3).forEach { q.add(fix(it)) }
        q.clear()
        assertEquals(0, FileLocationQueue(tmp.root).size)
    }

    // ---- sequence numbers (latest wins) ----

    @Test fun sequencesIncreaseByQueueingOrderNotByTimestamp() {
        val q = FileLocationQueue(tmp.root)
        val a = q.add(fix(9))
        val b = q.add(fix(1)) // older timestamp, queued later: it is the newer entry
        assertTrue(b > a)
        assertEquals(b, q.peekLastEntry()!!.seq)
        assertEquals(fix(1), q.peekLastEntry()!!.fix)
        assertEquals(fix(9), q.peekFirstEntry()!!.fix)
    }

    @Test fun sequencesSurviveARestartAndKeepGrowing() {
        val a = FileLocationQueue(tmp.root)
        val s1 = a.add(fix(1)); val s2 = a.add(fix(2))
        val b = FileLocationQueue(tmp.root)
        assertEquals(listOf(s1, s2), listOf(b.peekFirstEntry()!!.seq, b.peekLastEntry()!!.seq))
        assertTrue(b.add(fix(3)) > s2)
    }

    @Test fun removeThroughRemovesOlderAndKeepsNewer() {
        val q = FileLocationQueue(tmp.root)
        val seqs = (1..5).map { q.add(fix(it)) }
        assertEquals(3, q.removeThrough(seqs[2]))
        assertEquals(listOf(fix(4), fix(5)), drain(FileLocationQueue(tmp.root)))
        assertEquals(0, q.removeThrough(0))
    }

    @Test fun removeTakesOnlyThatEntryAndPersists() {
        val q = FileLocationQueue(tmp.root)
        val seqs = (1..4).map { q.add(fix(it)) }
        assertTrue(q.remove(seqs[2]))
        assertFalse(q.remove(seqs[2]))
        assertFalse(q.remove(12345))
        assertEquals(listOf(fix(1), fix(2), fix(4)), drain(FileLocationQueue(tmp.root)))
    }

    @Test fun anOldFileWithoutSequencesStillLoadsInOrderAndIsMigrated() {
        queueFile.writeText((1..3).joinToString("") { FileLocationQueue.encodeLegacy(fix(it)) + "\n" })
        val q = FileLocationQueue(tmp.root)
        assertEquals(3, q.size)
        val first = q.peekFirstEntry()!!.seq
        assertTrue(q.peekLastEntry()!!.seq > first)
        assertTrue(q.add(fix(4)) > q.peekFirstEntry()!!.seq)
        assertEquals((1..4).map { fix(it) }, drain(FileLocationQueue(tmp.root)))
        // migrated: the file now has the new, 8-column format
        queueFile.writeText((1..2).joinToString("") { FileLocationQueue.encodeLegacy(fix(it)) + "\n" })
        FileLocationQueue(tmp.root)
        assertTrue(queueFile.readLines().all { it.split('\t').size == 8 })
    }

    @Test fun sequencesInAFileThatGoBackwardsAreRepairedToStayIncreasing() {
        queueFile.writeText(
            listOf(QueuedFix(10, fix(1)), QueuedFix(5, fix(2)), QueuedFix(5, fix(3)))
                .joinToString("") { FileLocationQueue.encode(it) + "\n" }
        )
        val q = FileLocationQueue(tmp.root)
        val seqs = ArrayList<Long>()
        while (q.size > 0) { seqs.add(q.peekFirstEntry()!!.seq); q.removeFirst() }
        assertEquals(seqs.sorted(), seqs)
        assertEquals(3, seqs.toSet().size)
    }

    @Test fun truncationKeepsSequencesOfTheReadableLines() {
        val a = FileLocationQueue(tmp.root)
        val seqs = (1..3).map { a.add(fix(it)) }
        val bytes = queueFile.readBytes()
        queueFile.writeBytes(bytes.copyOf(bytes.size - 9))
        val b = FileLocationQueue(tmp.root)
        assertEquals(seqs[1], b.peekLastEntry()!!.seq)
        assertTrue(b.add(fix(9)) > seqs[1])
    }
}
