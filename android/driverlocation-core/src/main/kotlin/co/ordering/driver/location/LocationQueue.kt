package co.ordering.driver.location

import java.io.File
import java.io.FileOutputStream
import java.io.IOException
import java.util.ArrayDeque
import java.util.zip.CRC32

/** A queued fix and the sequence number it got when it was queued (strictly increasing). */
data class QueuedFix(val seq: Long, val fix: LocationFix)

/**
 * Store of fixes waiting to be sent, ordered by a sequence number assigned when each fix is
 * queued (never by comparing timestamps). Implementations are thread-safe.
 */
interface LocationQueue {
    val size: Int

    /** Appends [fix] with the next sequence number and returns it; over the bound the OLDEST entries are dropped. */
    fun add(fix: LocationFix): Long

    /** The oldest fix, or null. Does not remove it. */
    fun peek(): LocationFix?

    /** The oldest entry (lowest sequence), or null. */
    fun peekFirstEntry(): QueuedFix?

    /** The newest entry (highest sequence), or null. */
    fun peekLastEntry(): QueuedFix?

    /** Removes the oldest entry; false when empty. */
    fun removeFirst(): Boolean

    /** Removes the entry with exactly this sequence; false if there is none. */
    fun remove(seq: Long): Boolean

    /** Removes every entry whose sequence is <= [seq]; returns how many. Newer entries stay. */
    fun removeThrough(seq: Long): Int

    fun setMaxQueue(max: Int)

    fun clear()

    /**
     * The queue belongs to one endpoint URL (one driver). Called with the URL the sender is
     * configured for: if it is the stored owner nothing happens; otherwise (another URL, or
     * entries with no recorded owner) the queue is CLEARED first and [url] becomes the owner,
     * so one driver's pending positions are never sent as another's. Returns true when the
     * owner changed (whether or not there was anything to discard).
     */
    fun claim(url: String): Boolean
}

/**
 * [LocationQueue] persisted in [dir] (injected: the Service passes its files dir), file
 * `locations.queue`: one line per fix, tab separated: `seq, lat, lng, accuracy, speed,
 * timestamp, mock, crc32`. A line of the first format (no `seq`, 7 columns) still loads: it
 * gets sequence numbers in file order, and the file is rewritten in the new format.
 *
 * - A new instance over the same directory sees the same entries and sequences (process restart).
 * - The owner (the endpoint URL, see [claim]) is stored beside it in `locations.owner`.
 * - Loading never throws: a line that is truncated, garbled or fails its CRC is skipped,
 *   every readable line is kept, and the file is rewritten clean at once (so a later
 *   append cannot glue onto a half-written line).
 * - Appends are one line; removals and drops rewrite the file through a temp file and a
 *   rename. A disk failure never throws to the caller: the queue goes on in memory and
 *   the next mutation rewrites the whole file.
 */
class FileLocationQueue(private val dir: File, maxQueue: Int = Config.DEFAULT_MAX_QUEUE) : LocationQueue {
    private val file = File(dir, FILE_NAME)
    private val tmp = File(dir, "$FILE_NAME.tmp")
    private val items = ArrayDeque<QueuedFix>()
    private var max = maxQueue
    private var dirty = false
    private var nextSeq = 1L
    private val ownerFile = File(dir, OWNER_FILE_NAME)
    private val ownerTmp = File(dir, "$OWNER_FILE_NAME.tmp")
    private var owner: String? = null

    init {
        require(maxQueue >= 1) { "maxQueue must be >= 1" }
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
    override fun add(fix: LocationFix): Long {
        val entry = QueuedFix(nextSeq++, fix)
        items.addLast(entry)
        var dropped = false
        while (items.size > max) {
            items.removeFirst()
            dropped = true
        }
        if (dropped || dirty) rewrite() else append(entry)
        return entry.seq
    }

    @Synchronized
    override fun peek(): LocationFix? = items.peekFirst()?.fix

    @Synchronized
    override fun peekFirstEntry(): QueuedFix? = items.peekFirst()

    @Synchronized
    override fun peekLastEntry(): QueuedFix? = items.peekLast()

    @Synchronized
    override fun removeFirst(): Boolean {
        if (items.isEmpty()) return false
        items.removeFirst()
        rewrite()
        return true
    }

    @Synchronized
    override fun remove(seq: Long): Boolean {
        val it = items.iterator()
        while (it.hasNext()) {
            if (it.next().seq == seq) {
                it.remove()
                rewrite()
                return true
            }
        }
        return false
    }

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
    override fun setMaxQueue(max: Int) {
        require(max >= 1) { "maxQueue must be >= 1" }
        this.max = max
        if (items.size > max) {
            while (items.size > max) items.removeFirst()
            rewrite()
        }
    }

    @Synchronized
    override fun clear() {
        items.clear()
        rewrite()
    }

    @Synchronized
    override fun claim(url: String): Boolean {
        if (owner == url) return false
        // Clear first, record the owner second: a crash in between leaves an empty queue.
        if (items.isNotEmpty()) {
            items.clear()
            rewrite()
        }
        owner = url
        try {
            dir.mkdirs()
            FileOutputStream(ownerTmp).use { it.write(url.toByteArray(Charsets.UTF_8)); it.fd.sync() }
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
                    val d = decode(line)
                    if (d == null) {
                        clean = false
                        continue
                    }
                    if (d.legacy) clean = false
                    // keep sequences strictly increasing, whatever the file says
                    val seq = if (d.seq != null && d.seq > last) d.seq else last + 1
                    if (d.seq != null && d.seq != seq) clean = false
                    last = seq
                    items.addLast(QueuedFix(seq, d.fix))
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

    private fun append(entry: QueuedFix) {
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

    internal class Decoded(val seq: Long?, val fix: LocationFix, val legacy: Boolean)

    companion object {
        const val FILE_NAME = "locations.queue"
        const val OWNER_FILE_NAME = "locations.owner"

        private fun fields(f: LocationFix): String =
            listOf(
                f.lat.toString(), f.lng.toString(), f.accuracy?.toString() ?: "", f.speed?.toString() ?: "",
                f.timestamp.toString(), if (f.mock) "1" else "0"
            ).joinToString("\t")

        private fun crc(s: String): String {
            val c = CRC32()
            c.update(s.toByteArray(Charsets.UTF_8))
            return java.lang.Long.toHexString(c.value)
        }

        internal fun encode(e: QueuedFix): String {
            val p = e.seq.toString() + "\t" + fields(e.fix)
            return p + "\t" + crc(p)
        }

        /** The first file format (no sequence), kept for the tests of the migration. */
        internal fun encodeLegacy(f: LocationFix): String {
            val p = fields(f)
            return p + "\t" + crc(p)
        }

        internal fun decode(line: String): Decoded? {
            val parts = line.split('\t')
            val legacy = when (parts.size) {
                7 -> true
                8 -> false
                else -> return null
            }
            val p = parts.subList(0, parts.size - 1).joinToString("\t")
            if (crc(p) != parts.last()) return null
            return try {
                val o = if (legacy) 0 else 1
                val seq = if (legacy) null else parts[0].toLong().also { if (it < 1) return null }
                val fix = LocationFix(
                    lat = parts[o].toDouble(),
                    lng = parts[o + 1].toDouble(),
                    accuracy = parts[o + 2].takeIf { it.isNotEmpty() }?.toDouble(),
                    speed = parts[o + 3].takeIf { it.isNotEmpty() }?.toDouble(),
                    timestamp = parts[o + 4].toLong(),
                    mock = when (parts[o + 5]) { "1" -> true; "0" -> false; else -> return null }
                )
                if (fix.isValid) Decoded(seq, fix, legacy) else null
            } catch (e: NumberFormatException) {
                null
            }
        }
    }
}
