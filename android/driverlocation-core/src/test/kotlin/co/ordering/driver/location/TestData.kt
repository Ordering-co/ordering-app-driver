package co.ordering.driver.location

fun fix(n: Int, mock: Boolean = false) =
    LocationFix(lat = 10.0 + n / 1000.0, lng = -20.0 - n / 1000.0, accuracy = 5.0, speed = 1.5, timestamp = 1_700_000_000_000L + n, mock = mock)

fun testConfig(
    maxQueue: Int = 500,
    token: String = "tok-1",
    extras: Map<String, Any> = mapOf("driver_id" to 7),
    // The FIFO behaviour is what the older tests were written for; LatestWinsTest sets true.
    discardOlderOnSuccess: Boolean = false,
    minSendIntervalMs: Long = 0L,
    sendLocationAt: Boolean = false
) = Config(
    url = "http://localhost:8080/users/7/locations",
    headers = mapOf("Authorization" to "Bearer $token"),
    extras = extras,
    maxQueue = maxQueue,
    discardOlderOnSuccess = discardOlderOnSuccess,
    minSendIntervalMs = minSendIntervalMs,
    sendLocationAt = sendLocationAt
)

/** A queue already owned by [testConfig]'s url, holding [fixes] (as a previous run would leave it). */
fun prefilledQueue(dir: java.io.File, vararg fixes: LocationFix, url: String = testConfig().url): FileLocationQueue =
    FileLocationQueue(dir).also { q -> q.claim(url); fixes.forEach { q.add(it) } }
