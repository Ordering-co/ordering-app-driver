package co.ordering.driver.location

/** The event names of the tracking-events contract (docs/LOCATION_MODULE.md, "Tracking events"). The app never invents a name. */
object EventNames {
    const val TURN_OFF_GPS = "turn_off_gps"
    const val TURN_ON_GPS = "turn_on_gps"
    const val TURN_OFF_MOBILE_DATA = "turn_off_mobile_data"
    const val TURN_ON_MOBILE_DATA = "turn_on_mobile_data"
    const val LOCATION_PERMISSION_CHANGED = "location_permission_changed"
    const val SET_APP_IN_BACKGROUND = "set_app_in_background"
    const val SET_APP_IN_FOREGROUND = "set_app_in_foreground"
    const val BATTERY_SAVER_ON = "battery_saver_on"
    const val BATTERY_SAVER_OFF = "battery_saver_off"
    const val MOCK_LOCATION_DETECTED = "mock_location_detected"
    const val TRACKING_STARTED = "tracking_started"
    const val TRACKING_STOPPED = "tracking_stopped"
}

/** The `reason` of `tracking_started` / `tracking_stopped`. */
object TrackingReasons {
    const val AVAILABLE = "available"
    const val SCHEDULE = "schedule"
    const val LOGIN = "login"
    const val RESTART = "restart"
    const val UNAVAILABLE = "unavailable"
    const val LOGOUT = "logout"
    const val PERMISSION = "permission"
    const val SESSION_REVOKED = "session_revoked"
    const val SYSTEM = "system"
    const val UNKNOWN = "unknown"

    private val START = setOf(AVAILABLE, SCHEDULE, LOGIN, PERMISSION, RESTART)
    private val STOP = setOf(UNAVAILABLE, LOGOUT, SCHEDULE, PERMISSION, SESSION_REVOKED, SYSTEM, UNKNOWN)

    /** A start reason the contract knows; anything else (or null, an older JavaScript caller) is [AVAILABLE]. */
    fun startReason(value: String?): String = if (value != null && value in START) value else AVAILABLE

    /** A stop reason the contract knows; anything else (or null) is [UNKNOWN]. */
    fun stopReason(value: String?): String = if (value != null && value in STOP) value else UNKNOWN
}

/**
 * One event as the API wants it (contract section 2). [occurredAtMs] is the wall clock at detection, written as
 * `YYYY-MM-DD HH:mm:ss` UTC ([LocationAt]); [durationMs] only for the events that END a condition.
 * [data] always holds `platform` and `app_state` first, then the per-event fields; values are strings, booleans or
 * integers. The JSON is compact and in the order of the contract's example.
 */
data class TrackingEvent(
    val uuid: String,
    val event: String,
    val occurredAtMs: Long,
    val durationMs: Long?,
    val data: Map<String, Any>
) {
    fun toJson(): String {
        val sb = StringBuilder(160)
        sb.append("{\"uuid\":")
        EventJson.quote(sb, uuid)
        sb.append(",\"event\":")
        EventJson.quote(sb, event)
        sb.append(",\"occurred_at\":\"").append(LocationAt.format(occurredAtMs)).append('"')
        if (durationMs != null) sb.append(",\"duration_ms\":").append(maxOf(0L, durationMs))
        sb.append(",\"data\":{")
        var first = true
        for ((k, v) in data) {
            if (!first) sb.append(',')
            first = false
            EventJson.quote(sb, k)
            sb.append(':')
            when (v) {
                is String -> EventJson.quote(sb, v)
                is Boolean -> sb.append(if (v) "true" else "false")
                is Int, is Long -> sb.append(v.toString())
                else -> throw IllegalArgumentException("unsupported data value for '$k'")
            }
        }
        return sb.append("}}").toString()
    }
}

/**
 * The body of one request: `{"events":"[{...},{...}]"}`, the events as they were stored, in a JSON ARRAY that is itself the value
 * of `events` as a JSON STRING (what today's JavaScript senders post and the form every version of the API accepts: the API in
 * production validates `events` with a string rule and rejects a real array; the newer one takes both).
 */
object EventJson {
    fun body(eventJsons: List<String>): String = "{\"events\":" + arrayString(eventJsons) + "}"

    /** The array of [eventJsons] written as one JSON string value (quoted and escaped). */
    fun arrayString(eventJsons: List<String>): String {
        val array = StringBuilder(2 + eventJsons.sumOf { it.length + 1 })
        array.append('[')
        eventJsons.forEachIndexed { i, j ->
            if (i > 0) array.append(',')
            array.append(j)
        }
        array.append(']')
        val sb = StringBuilder(array.length + 16)
        quote(sb, array.toString())
        return sb.toString()
    }

    internal fun quote(sb: StringBuilder, s: String) {
        sb.append('"')
        for (c in s) {
            when {
                c == '"' -> sb.append("\\\"")
                c == '\\' -> sb.append("\\\\")
                c == '\n' -> sb.append("\\n")
                c == '\r' -> sb.append("\\r")
                c == '\t' -> sb.append("\\t")
                c == '\b' -> sb.append("\\b")
                c == '\u000C' -> sb.append("\\f")
                c < ' ' -> sb.append(String.format("\\u%04x", c.code))
                else -> sb.append(c)
            }
        }
        sb.append('"')
    }
}
