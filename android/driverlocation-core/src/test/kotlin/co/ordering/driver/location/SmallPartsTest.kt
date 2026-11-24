package co.ordering.driver.location

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test

class MockPolicyTest {
    @Test fun releaseRejectsMockWhateverTheOptionSaysAndKeepsReal() {
        val p = MockPolicy(releaseBuild = true)
        for (reject in listOf(false, true)) {
            assertEquals(MockPolicy.Decision.REJECT, p.decide(fix(1, mock = true), reject))
            assertEquals(MockPolicy.Decision.ACCEPT, p.decide(fix(1, mock = false), reject))
        }
        // The default of the option is false: still dropped.
        assertEquals(MockPolicy.Decision.REJECT, p.decide(fix(1, mock = true)))
    }

    @Test fun debugSendsMockAsRealByDefault() {
        val p = MockPolicy(releaseBuild = false)
        assertEquals(MockPolicy.Decision.ACCEPT_AS_REAL, p.decide(fix(1, mock = true)))
        assertEquals(MockPolicy.Decision.ACCEPT_AS_REAL, p.decide(fix(1, mock = true), rejectMock = false))
        assertEquals(MockPolicy.Decision.ACCEPT, p.decide(fix(1, mock = false), rejectMock = false))
    }

    @Test fun debugWithRejectMockBehavesLikeRelease() {
        val p = MockPolicy(releaseBuild = false)
        assertEquals(MockPolicy.Decision.REJECT, p.decide(fix(1, mock = true), rejectMock = true))
        assertEquals(MockPolicy.Decision.ACCEPT, p.decide(fix(1, mock = false), rejectMock = true))
    }

    @Test fun configDefaultsToNotRejecting() {
        assertFalse(testConfig().rejectMock)
        assertTrue(Config(testConfig().url, emptyMap(), rejectMock = true).rejectMock)
        assertTrue(testConfig().withHeaders(mapOf("Authorization" to "Bearer x")).rejectMock == false)
    }
}

class BackoffTest {
    @Test fun sequenceIsFiveFifteenSixtyThenSixtyForever() {
        val b = Backoff()
        val seq = (1..7).map { b.next() }
        assertEquals(listOf(5_000L, 15_000L, 60_000L, 60_000L, 60_000L, 60_000L, 60_000L), seq)
    }

    @Test fun resetStartsAgain() {
        val b = Backoff()
        repeat(4) { b.next() }
        b.reset()
        assertEquals(5_000L, b.next())
        assertEquals(15_000L, b.next())
    }
}

class ConfigTest {
    private val ok = mapOf("Authorization" to "Bearer secret-token")

    @Test fun defaultsAreTheAppsNumbers() {
        val c = Config("https://api.example.com/users/1/locations", ok)
        assertEquals(25.0, c.distanceFilter, 0.0)
        assertEquals(40_000L, c.interval)
        assertEquals(20_000L, c.fastestInterval)
        assertEquals(500, c.maxQueue)
    }

    @Test fun rejectsBadValuesListingEveryProblem() {
        val e = assertThrows(ConfigException::class.java) {
            Config("ftp://x", mapOf("Bad Name" to "v", "X" to "a\r\nb"), mapOf("k" to Double.NaN),
                distanceFilter = -1.0, interval = 0, fastestInterval = 0,
                notification = NotificationText(" ", ""), maxQueue = 0)
        }
        assertTrue(e.problems.size >= 8)
    }

    @Test fun fastestIntervalCannotExceedInterval() {
        assertThrows(ConfigException::class.java) {
            Config("http://h/x", ok, interval = 10_000, fastestInterval = 20_000)
        }
    }

    @Test fun urlMustBeHttpWithHost() {
        assertThrows(ConfigException::class.java) { Config("", ok) }
        assertThrows(ConfigException::class.java) { Config("not a url", ok) }
        assertThrows(ConfigException::class.java) { Config("http:///path", ok) }
        Config("http://localhost:8080/users/7/locations", ok)
    }

    @Test fun toStringNeverShowsTheTokenOrExtrasValues() {
        val c = Config("https://h/x", ok, mapOf("driver_id" to 4242))
        assertFalse(c.toString().contains("secret-token"))
        assertFalse(c.toString().contains("4242"))
    }

    @Test fun mapsAreCopied() {
        val h = linkedMapOf("Authorization" to "Bearer a")
        val c = Config("http://h/x", h)
        h["Authorization"] = "Bearer b"
        assertEquals("Bearer a", c.headers["Authorization"])
    }

    @Test fun withHeadersValidates() {
        val c = Config("http://h/x", ok)
        assertEquals("Bearer n", c.withHeaders(mapOf("Authorization" to "Bearer n")).headers["Authorization"])
        assertThrows(ConfigException::class.java) { c.withHeaders(mapOf("Authorization" to "x\ny")) }
    }

    @Test fun withDefaultHeadersAddsWhatIsMissingAndKeepsTheConfigsOwn() {
        val c = Config("http://h/x", ok)
        val d = c.withDefaultHeaders(mapOf("User-Agent" to "App/1 (x)", "X-Device-Id-X" to "abc123"))
        assertEquals("Bearer secret-token", d.headers["Authorization"])
        assertEquals("App/1 (x)", d.headers["User-Agent"])
        assertEquals("abc123", d.headers["X-Device-Id-X"])
        // The config's own value wins, whatever the case of the name.
        val own = Config("http://h/x", ok + ("user-agent" to "Mine/2"))
        val e = own.withDefaultHeaders(mapOf("User-Agent" to "App/1 (x)"))
        assertEquals("Mine/2", e.headers["user-agent"])
        assertFalse(e.headers.containsKey("User-Agent"))
        // Nothing to add: the same config.
        assertTrue(c.withDefaultHeaders(emptyMap()) === c)
        assertTrue(c.withDefaultHeaders(mapOf("authorization" to "x")) === c)
    }

    @Test fun withDefaultHeadersKeepsTheRestAndValidates() {
        val c = Config("http://h/x", ok, mapOf("driver_id" to 4242), distanceFilter = 10.0, maxQueue = 7, rejectMock = true)
        val d = c.withDefaultHeaders(mapOf("X-Device-Id-X" to "abc123"))
        assertEquals(10.0, d.distanceFilter, 0.0)
        assertEquals(7, d.maxQueue)
        assertTrue(d.rejectMock)
        assertEquals(4242, d.extras["driver_id"])
        assertFalse(d.toString().contains("abc123"))
        assertThrows(ConfigException::class.java) { c.withDefaultHeaders(mapOf("X-Device-Id-X" to "a\nb")) }
    }
}
