package co.ordering.driver.location

import com.sun.net.httpserver.HttpServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import java.net.InetSocketAddress
import java.util.concurrent.CopyOnWriteArrayList

/** The real transport against a throw-away server on 127.0.0.1 (no external network). */
class HttpUrlConnectionTransportTest {
    private class Seen(val method: String, val path: String, val headers: Map<String, String>, val body: String)

    private lateinit var server: HttpServer
    private val seen = CopyOnWriteArrayList<Seen>()
    @Volatile private var status = 200
    @Volatile private var delayMs = 0L
    @Volatile private var redirect = false

    private val base get() = "http://127.0.0.1:${server.address.port}"

    @Before fun up() {
        server = HttpServer.create(InetSocketAddress("127.0.0.1", 0), 0)
        server.createContext("/") { ex ->
            val body = String(ex.requestBody.readBytes(), Charsets.UTF_8)
            seen.add(Seen(ex.requestMethod, ex.requestURI.path,
                ex.requestHeaders.entries.associate { it.key.lowercase() to it.value.first() }, body))
            if (delayMs > 0) Thread.sleep(delayMs)
            if (redirect) ex.responseHeaders.add("Location", "$base/other")
            val payload = "{\"ok\":true}".toByteArray()
            ex.sendResponseHeaders(status, payload.size.toLong())
            ex.responseBody.use { it.write(payload) }
        }
        server.start()
    }

    @After fun down() = server.stop(0)

    @Test fun postsJsonWithHeadersAndExactBytes() {
        val t = HttpUrlConnectionTransport()
        val body = BodyBuilder.build(LocationFix(1.5, -2.25, null, null, 1L), mapOf("driver_id" to 7))
        val r = t.post("$base/users/7/locations", mapOf("Authorization" to "Bearer abc"), body)
        assertEquals(HttpResult.Response(200), r)
        val s = seen.single()
        assertEquals("POST", s.method)
        assertEquals("/users/7/locations", s.path)
        assertEquals("application/json", s.headers["content-type"])
        assertEquals("Bearer abc", s.headers["authorization"])
        assertEquals(body, s.body)
    }

    @Test fun theAppsUserAgentAndDeviceIdReachTheServerInPlaceOfTheStacksOwn() {
        val ua = "ODelivery/1.0 (co.ordering.delivery; build:1; Android 15; samsung SM-S911B) okhttp/5.0.0"
        val config = Config("$base/users/7/locations", mapOf("Authorization" to "Bearer abc"))
            .withDefaultHeaders(mapOf("User-Agent" to ua, "X-Device-Id-X" to "3f2a9c4d1e8b7a60"))
        val r = HttpUrlConnectionTransport().post(config.url, config.headers, "{}")
        assertEquals(HttpResult.Response(200), r)
        val s = seen.single()
        assertEquals(ua, s.headers["user-agent"])
        assertEquals("3f2a9c4d1e8b7a60", s.headers["x-device-id-x"])
        assertEquals("Bearer abc", s.headers["authorization"])
    }

    @Test fun nonAsciiBodyIsUtf8() {
        val r = HttpUrlConnectionTransport().post("$base/x", emptyMap(), "{\"a\":\"é€\"}")
        assertEquals(HttpResult.Response(200), r)
        assertEquals("{\"a\":\"é€\"}", seen.single().body)
    }

    @Test fun reportsEveryStatusAsAnAnswerNotAnError() {
        val t = HttpUrlConnectionTransport()
        for (code in listOf(201, 400, 401, 404, 500, 503)) {
            status = code
            assertEquals(HttpResult.Response(code), t.post("$base/x", emptyMap(), "{}"))
        }
    }

    @Test fun doesNotFollowRedirects() {
        status = 302; redirect = true
        assertEquals(HttpResult.Response(302), HttpUrlConnectionTransport().post("$base/x", emptyMap(), "{}"))
        assertEquals(1, seen.size)
    }

    @Test fun connectionRefusedIsANetworkErrorWithoutSecrets() {
        val port = server.address.port
        server.stop(0)
        val r = HttpUrlConnectionTransport().post("http://127.0.0.1:$port/x", mapOf("Authorization" to "Bearer SECRET"), "{}")
        assertTrue(r is HttpResult.NetworkError)
        assertFalse(r.toString().contains("SECRET"))
        server = HttpServer.create(InetSocketAddress("127.0.0.1", 0), 0).also { it.start() } // for @After
    }

    @Test fun readTimeoutIsANetworkError() {
        delayMs = 1_500
        val r = HttpUrlConnectionTransport(connectTimeoutMs = 500, readTimeoutMs = 300)
            .post("$base/x", emptyMap(), "{}")
        assertTrue(r is HttpResult.NetworkError)
    }

    @Test fun malformedUrlIsANetworkErrorNotAnException() {
        assertTrue(HttpUrlConnectionTransport().post("nope", emptyMap(), "{}") is HttpResult.NetworkError)
        assertTrue(HttpUrlConnectionTransport().post("file:///etc/passwd", emptyMap(), "{}") is HttpResult.NetworkError)
    }
}
