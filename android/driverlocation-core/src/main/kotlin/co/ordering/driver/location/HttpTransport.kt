package co.ordering.driver.location

import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL

/** Outcome of one request: an HTTP answer or a failure before any answer. */
sealed class HttpResult {
    /**
     * The server answered with [status] (any status, 2xx or not). [retryAfterMs] is the `Retry-After` header of the answer
     * in milliseconds, already bounded by [RetryAfter.MAX_MS] (null = none, or one this module cannot read).
     */
    data class Response(val status: Int, val retryAfterMs: Long? = null) : HttpResult()

    /** No answer: timeout, DNS, refused, reset... [reason] is an exception class name only. */
    data class NetworkError(val reason: String) : HttpResult()
}

/**
 * The `Retry-After` header of a 429 / 503: delta-seconds only (an HTTP-date is ignored: the backoff applies), bounded so a
 * server cannot silence the module for long.
 */
object RetryAfter {
    /** The longest wait a server may ask for (5 minutes). */
    const val MAX_MS = 300_000L

    /** Milliseconds for [value] (`"120"` = 120 s), at most [MAX_MS]; null when it is not a plain number of seconds. */
    fun parse(value: String?): Long? {
        val text = value?.trim() ?: return null
        if (text.isEmpty() || text.length > 9 || !text.all { it in '0'..'9' }) return null
        return minOf(text.toLong() * 1000L, MAX_MS)
    }

    /** The wait for a retry: the backoff's delay, or the server's request when it is longer; only for 429 and 503. */
    fun delay(backoffMs: Long, status: Int?, retryAfterMs: Long?): Long =
        if ((status == 429 || status == 503) && retryAfterMs != null) maxOf(backoffMs, minOf(retryAfterMs, MAX_MS)) else backoffMs
}

/** One POST of a JSON body. Must not throw for network problems and must never log secrets. */
interface HttpTransport {
    fun post(url: String, headers: Map<String, String>, body: String): HttpResult
}

/**
 * [HttpTransport] on `HttpURLConnection` (available on Android and the JVM). Called from the
 * sender's worker thread only. Redirects are not followed (a POST must reach its URL).
 * The token (headers) is never logged and never put in a failure reason: [HttpResult.NetworkError]
 * carries the exception's class name, not its message.
 */
class HttpUrlConnectionTransport(
    private val connectTimeoutMs: Int = 15_000,
    private val readTimeoutMs: Int = 20_000
) : HttpTransport {
    override fun post(url: String, headers: Map<String, String>, body: String): HttpResult {
        var conn: HttpURLConnection? = null
        return try {
            val c = URL(url).openConnection() as? HttpURLConnection
                ?: return HttpResult.NetworkError("NotHttp")
            conn = c
            c.requestMethod = "POST"
            c.connectTimeout = connectTimeoutMs
            c.readTimeout = readTimeoutMs
            c.instanceFollowRedirects = false
            c.useCaches = false
            c.doOutput = true
            headers.forEach { (k, v) -> c.setRequestProperty(k, v) }
            c.setRequestProperty("Content-Type", "application/json")
            val bytes = body.toByteArray(Charsets.UTF_8)
            c.setFixedLengthStreamingMode(bytes.size)
            c.outputStream.use { it.write(bytes) }
            val status = c.responseCode
            val retryAfter = if (status == 429 || status == 503) RetryAfter.parse(c.getHeaderField("Retry-After")) else null
            drain(if (status >= 400) c.errorStream else c.inputStream)
            HttpResult.Response(status, retryAfter)
        } catch (e: IOException) {
            HttpResult.NetworkError(e.javaClass.simpleName)
        } catch (e: RuntimeException) {
            HttpResult.NetworkError(e.javaClass.simpleName)
        } finally {
            try {
                conn?.disconnect()
            } catch (_: Exception) {
            }
        }
    }

    private fun drain(stream: java.io.InputStream?) {
        try {
            stream?.use {
                val buf = ByteArray(1024)
                var total = 0
                while (total < 65_536) {
                    val n = it.read(buf)
                    if (n < 0) break
                    total += n
                }
            }
        } catch (_: IOException) {
        }
    }
}
