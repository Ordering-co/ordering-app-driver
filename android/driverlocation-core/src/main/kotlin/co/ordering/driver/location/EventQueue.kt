package co.ordering.driver.location

import java.io.File
import java.io.FileOutputStream
import java.io.IOException
import java.util.ArrayDeque
import java.util.zip.CRC32

/** A stored event (its compact JSON, [TrackingEvent.toJson]) and the sequence number it got when it was queued. */
data class QueuedEvent(val seq: Long, val json: String)

/**
 * The persisted queue of tracking events: a small append-only file beside the positions' queue, FIFO, capped (the
 * OLDEST are dropped), never holding the token. Its events carry no url; the OWNER file beside it (`tracking-events.owner`) holds the
 * text the caller composes from the positions' url and the events url (no token), so another driver's queue is never sent.
 * Thread-safe.
 */
interface EventQueue {
    val size: Int

    /** Appends one event's JSON and returns how many OLDEST events the cap dropped to make room (usually 0). */
    fun add(json: String): Int

    /** The oldest [max] events, oldest first. Does not remove them. */
    fun peekBatch(max: Int): List<QueuedEvent>

    /** Removes every event whose sequence is <= [seq]; returns how many. Newer ones stay. */
    fun removeThrough(seq: Long): Int

    fun clear()

    /**
     * The queue belongs to one session: the owner text names the driver (the positions' url, which holds the user id)
     * and the endpoint. Same owner: nothing happens. Another owner, or entries with none recorded: the queue is
     * CLEARED first and [owner] is recorded, so one driver's events are never sent under another's token. Returns
     * true when the owner changed.
     */
    fun claim(owner: String): Boolean
}

/**
 * [EventQueue] in [dir], file `tracking-events.queue`: one line per event, tab separated `seq, json, crc32`. The JSON
 * never holds a raw tab or line break (they are escaped), so a line is one event. Appends are one line; removals and
 * cap drops rewrite the file through a temp file and a rename. A line that is truncated, garbled or fails its CRC
 * is skipped at load and the file is rewritten clean. A disk failure never throws to the caller: the queue goes on
 * in memory and the next change rewrites the file. The owner is stored beside it in `tracking-events.owner`.
 */
class FileEventQueue(private val dir: File, private val max: Int = DEFAULT_MAX_EVENTS) : EventQueue {
    private val file = File(dir, FILE_NAME)
    private val tmp = File(dir, "$FILE_NAME.tmp")
    private val ownerFile = File(dir, OWNER_FILE_NAME)
    private val ownerTmp = File(dir, "$OWNER_FILE_NAME.tmp")
    private val items = ArrayDeque<QueuedEvent>()
    private var nextSeq = 1L
    private var dirty = false
    private var owner: String? = null

    init {
        require(max >= 1) { "max must be >= 1" }
        load()
        owner = try {
            if (ownerFile.isFile) String(ownerFile.readBytes(), Charsets.UTF_8).takeIf { it.isNotEmpty() } else null
        } catch (e: IOException) {
            null
        }
    }

    @get:Synchronized
    override val size: Int get() = items.size

    @Synchronized
    override fun add(json: String): Int {
        require('\t' !in json && '\n' !in json) { "an event's JSON has no raw tab or line break" }
        val entry = QueuedEvent(nextSeq++, json)
        items.addLast(entry)
        var dropped = 0
        while (items.size > max) {
            items.removeFirst()
            dropped++
        }
        if (dropped > 0 || dirty) rewrite() else append(entry)
        return dropped
    }

    @Synchronized
    override fun peekBatch(max: Int): List<QueuedEvent> = items.asSequence().take(max).toList()

    @Synchronized
    override fun removeThrough(seq: Long): Int {
        var n = 0
        while (items.isNotEmpty() && items.peekFirst().seq <= seq) {
            items.removeFirst()
            n++
        }
        if (n > 0) rewrite()
        return n
    }

    @Synchronized
    override fun clear() {
        if (items.isEmpty()) return
        items.clear()
        rewrite()
    }

    @Synchronized
    override fun claim(owner: String): Boolean {
        if (this.owner == owner) return false
        // Clear first, record the owner second: a crash in between leaves an empty queue.
        if (items.isNotEmpty()) {
            items.clear()
            rewrite()
        }
        this.owner = owner
        try {
            dir.mkdirs()
            FileOutputStream(ownerTmp).use { it.write(owner.toByteArray(Charsets.UTF_8)); it.fd.sync() }
            if (!ownerTmp.renameTo(ownerFile)) {
                ownerFile.delete()
                if (!ownerTmp.renameTo(ownerFile)) throw IOException("rename failed")
            }
        } catch (e: IOException) {
            // unknown on disk: the next start sees no owner and clears again, which is the safe side
        }
        return true
    }

    // ---- persistence ----

    private fun load() {
        var clean = true
        try {
            if (file.isFile) {
                val text = String(file.readBytes(), Charsets.UTF_8)
                if (text.isNotEmpty() && !text.endsWith("\n")) clean = false
                var last = 0L
                for (line in text.split('\n')) {
                    if (line.isEmpty()) continue
                    val e = decode(line)
                    if (e == null) {
                        clean = false
                        continue
                    }
                    val seq = if (e.seq > last) e.seq else last + 1
                    if (seq != e.seq) clean = false
                    last = seq
                    items.addLast(QueuedEvent(seq, e.json))
                }
                nextSeq = last + 1
            }
        } catch (e: IOException) {
            clean = false
        } catch (e: RuntimeException) {
            clean = false
        }
        while (items.size > max) {
            items.removeFirst()
            clean = false
        }
        if (!clean) rewrite()
    }

    private fun append(entry: QueuedEvent) {
        try {
            dir.mkdirs()
            FileOutputStream(file, true).use { it.write((encode(entry) + "\n").toByteArray(Charsets.UTF_8)) }
        } catch (e: IOException) {
            dirty = true
        }
    }

    private fun rewrite() {
        try {
            dir.mkdirs()
            FileOutputStream(tmp).use { out ->
                val sb = StringBuilder()
                for (e in items) sb.append(encode(e)).append('\n')
                out.write(sb.toString().toByteArray(Charsets.UTF_8))
                out.fd.sync()
            }
            if (!tmp.renameTo(file)) {
                file.delete()
                if (!tmp.renameTo(file)) throw IOException("rename failed")
            }
            dirty = false
        } catch (e: IOException) {
            dirty = true
        }
    }

    companion object {
        const val DEFAULT_MAX_EVENTS = 500
        const val FILE_NAME = "tracking-events.queue"
        const val OWNER_FILE_NAME = "tracking-events.owner"

        private fun crc(s: String): String {
            val c = CRC32()
            c.update(s.toByteArray(Charsets.UTF_8))
            return java.lang.Long.toHexString(c.value)
        }

        internal fun encode(e: QueuedEvent): String {
            val p = e.seq.toString() + "\t" + e.json
            return p + "\t" + crc(p)
        }

        internal fun decode(line: String): QueuedEvent? {
            val parts = line.split('\t')
            if (parts.size != 3) return null
            if (crc(parts[0] + "\t" + parts[1]) != parts[2]) return null
            val seq = parts[0].toLongOrNull()?.takeIf { it >= 1 } ?: return null
            if (!parts[1].startsWith("{")) return null
            return QueuedEvent(seq, parts[1])
        }
    }
}
