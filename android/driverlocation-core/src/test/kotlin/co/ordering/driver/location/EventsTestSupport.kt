package co.ordering.driver.location

import java.util.concurrent.CopyOnWriteArrayList

const val EVENTS_URL = "http://localhost:8080/tracking_events"

/** The default test config with the events lane on (an events url). */
fun eventsConfig(
    eventsUrl: String? = EVENTS_URL,
    token: String = "tok-1",
    discardOlderOnSuccess: Boolean = true,
    minSendIntervalMs: Long = 0L,
    extraHeaders: Map<String, String> = emptyMap()
) = Config(
    url = "http://localhost:8080/users/7/locations",
    headers = mapOf("Authorization" to "Bearer $token") + extraHeaders,
    extras = mapOf("driver_id" to 7),
    discardOlderOnSuccess = discardOlderOnSuccess,
    minSendIntervalMs = minSendIntervalMs,
    eventsUrl = eventsUrl
)

/** A well formed event number [n]: occurred_at is n seconds after 2026-11-19 00:00:00 UTC. */
fun ev(n: Int, name: String = EventNames.TURN_OFF_GPS, durationMs: Long? = null) = TrackingEvent(
    uuid = "00000000-0000-4000-8000-" + n.toString().padStart(12, '0'),
    event = name,
    occurredAtMs = 1_795_046_400_000L + n * 1000L,
    durationMs = durationMs,
    data = linkedMapOf("platform" to "android", "app_state" to "foreground")
)

class RecordingEventsListener : EventsListener {
    val recorded = CopyOnWriteArrayList<Pair<String, Int>>()
    val requests = CopyOnWriteArrayList<Pair<Int, Int>>()
    val https = CopyOnWriteArrayList<Pair<Int, Int>>()
    val retries = CopyOnWriteArrayList<Triple<Long, Int?, Int>>()
    val dropped = CopyOnWriteArrayList<Pair<Int, String>>()
    override fun onEventRecorded(event: String, queued: Int) { recorded.add(event to queued) }
    override fun onEventsRequest(count: Int, queued: Int) { requests.add(count to queued) }
    override fun onEventsHttp(status: Int, count: Int) { https.add(status to count) }
    override fun onEventsRetry(delayMs: Long, status: Int?, queued: Int) { retries.add(Triple(delayMs, status, queued)) }
    override fun onEventsDropped(count: Int, why: String) { dropped.add(count to why) }
}

/**
 * The array text inside a request body `{"events":"[...]"}`: the string value of `events`, unescaped. Fails the test when the
 * body is not that shape (a real array would be a different wire format).
 */
fun eventsArray(body: String): String {
    require(body.startsWith("{\"events\":\"[") && body.endsWith("]\"}")) { "not the string form: " + body.take(40) }
    val raw = body.substring("{\"events\":\"".length, body.length - 2)
    val sb = StringBuilder()
    var i = 0
    while (i < raw.length) {
        val c = raw[i]
        if (c == '\\') {
            when (val n = raw[i + 1]) {
                'n' -> sb.append('\n'); 't' -> sb.append('\t'); 'r' -> sb.append('\r'); 'b' -> sb.append('\b'); 'f' -> sb.append('\u000C')
                'u' -> { sb.append(raw.substring(i + 2, i + 6).toInt(16).toChar()); i += 4 }
                else -> sb.append(n)
            }
            i += 2
        } else {
            sb.append(c)
            i++
        }
    }
    return sb.toString()
}

/** The names of the events inside a request body, in order. */
fun eventNames(body: String): List<String> = Regex("\"event\":\"([a-z_]+)\"").findAll(eventsArray(body)).map { it.groupValues[1] }.toList()

/** The uuids' sequence numbers (see [ev]) inside a body. */
fun eventNumbers(body: String): List<Int> = Regex("\"uuid\":\"00000000-0000-4000-8000-(\\d{12})\"")
    .findAll(if (body.startsWith("{\"events\":")) eventsArray(body) else body) // a request body, or one stored event
    .map { it.groupValues[1].toInt() }.toList()
