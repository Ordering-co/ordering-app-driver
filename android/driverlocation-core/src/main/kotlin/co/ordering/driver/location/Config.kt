package co.ordering.driver.location

import java.net.URI

/** The notification of the Android foreground service (texts translated by the caller). */
data class NotificationText(val title: String, val text: String)

/** Thrown by [Config] when its values are not usable; the message lists every problem. */
class ConfigException(val problems: List<String>) :
    IllegalArgumentException("Invalid location config: " + problems.joinToString("; "))

/**
 * What `configure(...)` of the JS contract (docs/LOCATION_MODULE.md §2) carries.
 * Validated on construction ([ConfigException]); maps are copied (immutable afterwards).
 *
 * [toString] never prints header values or extras values: the token must not reach a log.
 *
 * @property extras values may be String, Number or Boolean; merged at the root of the body.
 * @property distanceFilter metres.
 * @property interval milliseconds (Android).
 * @property fastestInterval milliseconds (Android), not above [interval].
 * @property maxQueue locations kept while offline; the oldest are dropped beyond it.
 * @property discardOlderOnSuccess "latest wins" (default true): the sender always sends the
 *   NEWEST queued fix, and when it is accepted every older queued fix is discarded, so a
 *   position is never sent after a newer one. The server keeps one position per driver, so
 *   replaying old ones after an outage would show the driver where they were. False: every
 *   fix is sent, oldest first (the whole route).
 * @property rejectMock debug builds only (see [MockPolicy]): drop a mock fix instead of sending it
 *   as a real one. A release build drops mock fixes whatever this says. Default false.
 * @property minSendIntervalMs a floor, in milliseconds, between the START of a request to the API
 *   and the start of the previous one (monotonic clock; a retry is a request too). 0 (default) = no
 *   throttle, today's behaviour. Fixes that arrive meanwhile are kept ("latest wins" sends only the
 *   newest, when the interval has elapsed, with no new fix needed). At most [MAX_MIN_SEND_INTERVAL_MS].
 * @property sendLocationAt when true the body carries `location_at`: the time the fix was TAKEN
 *   (never the time of sending), UTC, `YYYY-MM-DD HH:mm:ss` ([LocationAt]). False (default) = today's
 *   body, byte for byte.
 * @property eventsUrl `POST {api}/tracking_events` (docs/LOCATION_MODULE.md, "Tracking events"). Null (default) = the
 *   events recorder is off and nothing about it is read, written or sent (an older caller changes nothing). Same
 *   scheme rules as [url]; the request carries the same [headers].
 */
class Config(
    val url: String,
    headers: Map<String, String>,
    extras: Map<String, Any> = emptyMap(),
    val distanceFilter: Double = 25.0,
    val interval: Long = 40_000L,
    val fastestInterval: Long = 20_000L,
    val notification: NotificationText = NotificationText("Background tracking enabled", "Important for delivery real time location"),
    val maxQueue: Int = DEFAULT_MAX_QUEUE,
    val discardOlderOnSuccess: Boolean = true,
    val rejectMock: Boolean = false,
    val minSendIntervalMs: Long = 0L,
    val sendLocationAt: Boolean = false,
    val eventsUrl: String? = null
) {
    val headers: Map<String, String> = LinkedHashMap(headers)
    val extras: Map<String, Any> = LinkedHashMap(extras)

    init {
        val problems = ArrayList<String>()
        problems += urlProblems(url)
        if (eventsUrl != null) problems += urlProblems(eventsUrl).map { "eventsUrl: $it" }
        problems += headerProblems(headers)
        extras.forEach { (k, v) ->
            if (k.isEmpty()) problems += "extras: empty key"
            val ok = v is String || v is Boolean ||
                (v is Number && (v !is Double || v.isFinite()) && (v !is Float || v.isFinite()))
            if (!ok) problems += "extras['$k'] must be a string, a finite number or a boolean"
        }
        if (!distanceFilter.isFinite() || distanceFilter < 0) problems += "distanceFilter must be >= 0"
        if (interval <= 0) problems += "interval must be > 0"
        if (fastestInterval <= 0) problems += "fastestInterval must be > 0"
        if (interval > 0 && fastestInterval > interval) problems += "fastestInterval must not exceed interval"
        if (notification.title.isBlank()) problems += "notification.title is empty"
        if (notification.text.isBlank()) problems += "notification.text is empty"
        if (maxQueue < 1 || maxQueue > MAX_QUEUE_LIMIT) problems += "maxQueue must be between 1 and $MAX_QUEUE_LIMIT"
        if (minSendIntervalMs < 0 || minSendIntervalMs > MAX_MIN_SEND_INTERVAL_MS) {
            problems += "minSendIntervalMs must be between 0 and $MAX_MIN_SEND_INTERVAL_MS"
        }
        if (sendLocationAt && "location_at" in extras.keys) problems += "extras: key 'location_at' collides with the body"
        if (problems.isNotEmpty()) throw ConfigException(problems)
    }

    /** Same config with other headers (a refreshed token). Validated. */
    fun withHeaders(newHeaders: Map<String, String>): Config =
        Config(url, newHeaders, extras, distanceFilter, interval, fastestInterval, notification, maxQueue, discardOlderOnSuccess, rejectMock,
            minSendIntervalMs, sendLocationAt, eventsUrl)

    /**
     * Same config with [defaults] added for each header it does not set already (names compared without
     * case; the config's own value wins). The app passes in the headers that are its own (its
     * User-Agent, its device id): the core knows no name and reads no device. Validated.
     */
    fun withDefaultHeaders(defaults: Map<String, String>): Config {
        val present = headers.keys.map { it.lowercase() }.toSet()
        val added = defaults.filterKeys { it.lowercase() !in present }
        return if (added.isEmpty()) this else withHeaders(headers + added)
    }

    /**
     * What the events queue belongs to: the positions' url (it holds the user id) and the events url, so a queue left by
     * another driver, or for another API, is never sent under this one's token. Null without an events url.
     */
    val eventsOwner: String? get() = eventsUrl?.let { "$url\n$it" }

    override fun toString(): String =
        "Config(url=$url, headers=${headers.keys}, extras=${extras.keys}, distanceFilter=$distanceFilter, " +
            "interval=$interval, fastestInterval=$fastestInterval, maxQueue=$maxQueue, " +
            "discardOlderOnSuccess=$discardOlderOnSuccess, minSendIntervalMs=$minSendIntervalMs, sendLocationAt=$sendLocationAt, events=${eventsUrl != null})"

    companion object {
        const val DEFAULT_MAX_QUEUE = 500
        const val MAX_QUEUE_LIMIT = 100_000

        /** The largest [minSendIntervalMs] the core accepts (one hour); the app caps what it passes lower. */
        const val MAX_MIN_SEND_INTERVAL_MS = 3_600_000L

        private val HEADER_NAME = Regex("^[!#$%&'*+.^_`|~0-9A-Za-z-]+$")

        internal fun urlProblems(url: String): List<String> {
            val uri = try {
                URI(url)
            } catch (e: Exception) {
                return listOf("url is not a valid URI")
            }
            val scheme = uri.scheme?.lowercase()
            if (scheme != "http" && scheme != "https") return listOf("url must be http or https")
            if (uri.host.isNullOrEmpty()) return listOf("url has no host")
            return emptyList()
        }

        /** Validates headers alone (used by `updateHeaders`). Messages never contain values. */
        internal fun headerProblems(headers: Map<String, String>): List<String> {
            val problems = ArrayList<String>()
            headers.forEach { (k, v) ->
                if (!HEADER_NAME.matches(k)) problems += "header name '$k' is not valid"
                if (v.any { it == '\r' || it == '\n' || it == '\u0000' }) problems += "header '$k' has a forbidden character in its value"
            }
            return problems
        }
    }
}
