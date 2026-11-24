package co.ordering.driver.location

import java.io.File
import java.io.FileOutputStream
import java.io.IOException

/**
 * The app's location authorization as the contract names it: [authorization] is `always` | `while_in_use` | `denied` |
 * `restricted` | `not_determined`, [precise] is whether the app may read the exact position.
 */
data class PermissionState(val authorization: String, val precise: Boolean)

/**
 * What the recorder keeps between runs of the process (never the token; the [owner] is the text the sender composes, see
 * [Config.eventsOwner]: the positions' url and the events url, so this file does hold the two urls).
 *
 * @property owner the session the rest belongs to; another owner empties everything below.
 * @property active a tracking session started and has not ended CLEANLY: if it is still set when the module starts again,
 *   the process was killed (or the service destroyed) without a stop, and `tracking_stopped` with reason `system` is owed.
 * @property sessionStartWall wall clock (epoch ms) of that session's `tracking_started`.
 * @property heartbeatWall the last time the module was known alive (epoch ms): on each fix and at least every minute.
 * @property open the conditions an opening event was sent for and no closing event yet (`gps_off`, `offline`,
 *   `battery_saver`, `background`), each with the wall clock of the opening: the duration of the closing event when the
 *   process that opened it is gone.
 * @property permission the last authorization seen, to tell what changed while the process was dead.
 */
data class RecorderState(
    val owner: String? = null,
    val active: Boolean = false,
    val sessionStartWall: Long? = null,
    val heartbeatWall: Long? = null,
    val open: Map<String, Long> = emptyMap(),
    val permission: PermissionState? = null
)

/** Where the [RecorderState] lives. [load] never throws (a missing or garbled store is the empty state); [save] never throws. */
interface RecorderStore {
    fun load(): RecorderState
    fun save(state: RecorderState)
}

/** In memory, for the tests and for a process with nowhere to write. */
class MemoryRecorderStore(var state: RecorderState = RecorderState()) : RecorderStore {
    @Synchronized override fun load(): RecorderState = state
    @Synchronized override fun save(state: RecorderState) {
        this.state = state
    }
}

/**
 * [RecorderStore] in [dir], file `tracking-events.state`: `key=value` lines, rewritten through a temp file and a rename.
 * The heartbeat is the frequent write, so no `fsync` there (a lost heartbeat is a few seconds of precision); everything
 * else is synced.
 */
class FileRecorderStore(private val dir: File) : RecorderStore {
    private val file = File(dir, FILE_NAME)
    private val tmp = File(dir, "$FILE_NAME.tmp")

    @Synchronized
    override fun load(): RecorderState {
        try {
            if (!file.isFile) return RecorderState()
            val map = LinkedHashMap<String, String>()
            for (line in String(file.readBytes(), Charsets.UTF_8).split('\n')) {
                val i = line.indexOf('=')
                if (i > 0) map[line.substring(0, i)] = line.substring(i + 1)
            }
            val open = LinkedHashMap<String, Long>()
            for ((k, v) in map) if (k.startsWith("open.")) v.toLongOrNull()?.let { open[k.removePrefix("open.")] = it }
            val permission = map["permission"]?.split(',')?.takeIf { it.size == 2 }?.let { PermissionState(it[0], it[1] == "1") }
            return RecorderState(
                owner = map["owner"]?.let(::unescape),
                active = map["active"] == "1",
                sessionStartWall = map["session_start"]?.toLongOrNull(),
                heartbeatWall = map["heartbeat"]?.toLongOrNull(),
                open = open,
                permission = permission
            )
        } catch (e: IOException) {
            return RecorderState()
        } catch (e: RuntimeException) {
            return RecorderState()
        }
    }

    @Synchronized
    override fun save(state: RecorderState) {
        try {
            dir.mkdirs()
            val sb = StringBuilder()
            state.owner?.let { sb.append("owner=").append(escape(it)).append('\n') }
            sb.append("active=").append(if (state.active) "1" else "0").append('\n')
            state.sessionStartWall?.let { sb.append("session_start=").append(it).append('\n') }
            state.heartbeatWall?.let { sb.append("heartbeat=").append(it).append('\n') }
            for ((k, v) in state.open) sb.append("open.").append(k).append('=').append(v).append('\n')
            state.permission?.let { sb.append("permission=").append(it.authorization).append(',').append(if (it.precise) "1" else "0").append('\n') }
            FileOutputStream(tmp).use { out ->
                out.write(sb.toString().toByteArray(Charsets.UTF_8))
                out.flush()
            }
            if (!tmp.renameTo(file)) {
                file.delete()
                tmp.renameTo(file)
            }
        } catch (e: IOException) {
            // the next save writes it again
        }
    }

    private fun escape(s: String) = s.replace("\\", "\\\\").replace("\n", "\\n")

    private fun unescape(s: String): String {
        val sb = StringBuilder(s.length)
        var i = 0
        while (i < s.length) {
            val c = s[i]
            if (c == '\\' && i + 1 < s.length) {
                sb.append(if (s[i + 1] == 'n') '\n' else s[i + 1])
                i += 2
            } else {
                sb.append(c)
                i++
            }
        }
        return sb.toString()
    }

    companion object {
        const val FILE_NAME = "tracking-events.state"
    }
}
