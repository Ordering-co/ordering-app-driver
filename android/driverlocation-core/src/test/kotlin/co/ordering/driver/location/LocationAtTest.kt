package co.ordering.driver.location

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import java.util.Locale
import java.util.TimeZone

/** `location_at`: the instant the fix was TAKEN, UTC, `YYYY-MM-DD HH:mm:ss`, nothing of the device's locale. */
class LocationAtTest {
    @get:Rule val tmp = TemporaryFolder()

    private val shape = Regex("""^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$""")

    // (epoch seconds, expected), computed outside the code under test (Python's datetime in UTC).
    private val vectors = listOf(
        0L to "1970-01-01 00:00:00",
        -1L to "1969-12-31 23:59:59",
        -2_208_988_800L to "1900-01-01 00:00:00",
        946_684_799L to "1999-12-31 23:59:59",          // year boundary
        946_684_800L to "2000-01-01 00:00:00",
        951_782_400L to "2000-02-29 00:00:00",          // 2000 is a leap year
        1_700_000_000L to "2023-11-14 22:13:20",
        1_709_208_000L to "2024-02-29 12:00:00",
        1_709_251_199L to "2024-02-29 23:59:59",        // end of a leap day
        1_709_251_200L to "2024-03-01 00:00:00",        // month boundary
        1_795_096_987L to "2026-11-19 14:03:07",
        1_795_098_600L to "2026-11-19 14:30:00",
        1_798_761_599L to "2026-12-31 23:59:59",
        1_798_761_600L to "2027-01-01 00:00:00",
        2_147_483_647L to "2038-01-19 03:14:07",
        2_147_483_648L to "2038-01-19 03:14:08",
        4_107_455_999L to "2100-02-27 23:59:59",
        4_107_542_399L to "2100-02-28 23:59:59",        // 2100 is NOT a leap year...
        4_107_542_400L to "2100-03-01 00:00:00"         // ...so the next second is March 1st
    )

    private fun body(fix: LocationFix, at: Boolean = true) = BodyBuilder.build(fix, mapOf("driver_id" to 7), at)

    @Test fun formatsTheBoundaries() {
        vectors.forEach { (seconds, expected) -> assertEquals(expected, LocationAt.format(seconds * 1000)) }
    }

    @Test fun truncatesTheMillisecondsNeverRounds() {
        assertEquals("2023-11-14 22:13:20", LocationAt.format(1_700_000_000_000L))
        assertEquals("2023-11-14 22:13:20", LocationAt.format(1_700_000_000_999L))
        assertEquals("2023-11-14 22:13:21", LocationAt.format(1_700_000_001_000L))
        assertEquals("1969-12-31 23:59:59", LocationAt.format(-1L)) // one millisecond before the epoch
    }

    @Test fun everySecondOfADayHasTheShape() {
        for (s in 0 until 86_400 step 37) assertTrue(shape.matches(LocationAt.format(1_795_046_400_000L + s * 1000L)))
    }

    @Test fun aFixFromAnotherTimeZonesLocalMidnightIsSentInUtc() {
        // 2026-11-20 00:30 in Auckland (UTC+13 in November) is 2026-11-19 11:30 UTC.
        val saved = TimeZone.getDefault()
        try {
            for (zone in listOf("Pacific/Auckland", "America/Los_Angeles", "Asia/Kolkata", "UTC")) {
                TimeZone.setDefault(TimeZone.getTimeZone(zone))
                assertEquals("2026-11-19 14:03:07", LocationAt.format(1_795_096_987_000L))
            }
            TimeZone.setDefault(TimeZone.getTimeZone("Pacific/Auckland"))
            val localMidnightPlus30 = java.time.ZonedDateTime.of(2026, 11, 20, 0, 30, 0, 0, java.time.ZoneId.of("Pacific/Auckland"))
            assertEquals("2026-11-19 11:30:00", LocationAt.format(localMidnightPlus30.toInstant().toEpochMilli()))
            val la = java.time.ZonedDateTime.of(2026, 11, 18, 23, 59, 59, 0, java.time.ZoneId.of("America/Los_Angeles"))
            assertEquals("2026-11-19 07:59:59", LocationAt.format(la.toInstant().toEpochMilli()))
        } finally {
            TimeZone.setDefault(saved)
        }
    }

    @Test fun theDevicesLocaleCalendarAndDigitsChangeNothing() {
        val saved = Locale.getDefault()
        try {
            val locales = listOf(
                Locale.forLanguageTag("ar-SA"),                  // Arabic, Umm al-Qura calendar on some devices
                Locale.forLanguageTag("ar-EG-u-nu-arab"),        // Eastern Arabic digits
                Locale.forLanguageTag("fa-IR-u-nu-arabext"),     // Persian digits
                Locale.forLanguageTag("hi-IN-u-nu-deva"),        // Devanagari digits
                Locale.forLanguageTag("th-TH-u-ca-buddhist"),    // Buddhist calendar (year 2569)
                Locale.forLanguageTag("ja-JP-u-ca-japanese"),    // Japanese imperial calendar
                Locale.forLanguageTag("bn-BD-u-nu-beng"),
                Locale.forLanguageTag("tr-TR"),                  // the dotless-i locale
                Locale.ROOT
            )
            for (locale in locales) {
                Locale.setDefault(locale)
                assertEquals(locale.toString(), "2026-11-19 14:03:07", LocationAt.format(1_795_096_987_000L))
                val text = body(fix(1).copy(timestamp = 1_795_096_987_000L))
                assertTrue(text, text.contains("\"location_at\":\"2026-11-19 14:03:07\""))
                assertTrue(text.all { it.code < 128 })
            }
        } finally {
            Locale.setDefault(saved)
        }
    }

    @Test fun offTheBodyIsExactlyToday() {
        val f = fix(1)
        val today = """{"location":{"lat":10.001,"lng":-20.001,"v":"1.0"},"driver_id":7}"""
        assertEquals(today, body(f, at = false))
        assertEquals(today, BodyBuilder.build(f, mapOf("driver_id" to 7))) // the default is off
        assertFalse(body(f, at = false).contains("location_at"))
    }

    @Test fun onTheKeyIsAtTheTopLevelRightAfterLocationAndTheRestIsUnchanged() {
        val f = fix(1).copy(timestamp = 1_795_096_987_000L)
        assertEquals(
            """{"location":{"lat":10.001,"lng":-20.001,"v":"1.0"},"location_at":"2026-11-19 14:03:07","driver_id":7}""",
            body(f)
        )
        assertEquals("""{"location":{"lat":10.001,"lng":-20.001,"v":"1.0"},"location_at":"2026-11-19 14:03:07"}""",
            BodyBuilder.build(f, emptyMap(), true))
    }

    @Test fun anExtrasKeyCalledLocationAtCollidesOnlyWhenItIsSent() {
        BodyBuilder.checkExtras(mapOf("location_at" to "x"), false)
        val e = runCatching { BodyBuilder.checkExtras(mapOf("location_at" to "x"), true) }.exceptionOrNull()
        assertTrue(e is IllegalArgumentException)
        val c = runCatching { testConfig(extras = mapOf("location_at" to "x"), sendLocationAt = true) }.exceptionOrNull()
        assertTrue(c is ConfigException)
        testConfig(extras = mapOf("location_at" to "x")) // off: accepted, as before
    }

    @Test fun theConfigDefaultsAreOffAndSurviveWithHeaders() {
        val plain = Config("http://h/x", emptyMap())
        assertEquals(0L, plain.minSendIntervalMs)
        assertFalse(plain.sendLocationAt)
        val on = Config("http://h/x", emptyMap(), minSendIntervalMs = 1500, sendLocationAt = true)
        val swapped = on.withHeaders(mapOf("Authorization" to "Bearer b"))
        assertEquals(1500L, swapped.minSendIntervalMs)
        assertTrue(swapped.sendLocationAt)
        val defaults = on.withDefaultHeaders(mapOf("User-Agent" to "ua"))
        assertEquals(1500L, defaults.minSendIntervalMs)
        assertTrue(defaults.sendLocationAt)
        assertTrue(on.toString().contains("minSendIntervalMs=1500") && on.toString().contains("sendLocationAt=true"))
    }

    @Test fun theIntervalIsValidated() {
        Config("http://h/x", emptyMap(), minSendIntervalMs = Config.MAX_MIN_SEND_INTERVAL_MS)
        for (bad in listOf(-1L, Config.MAX_MIN_SEND_INTERVAL_MS + 1)) {
            assertTrue(runCatching { Config("http://h/x", emptyMap(), minSendIntervalMs = bad) }.exceptionOrNull() is ConfigException)
        }
    }

    // ---- through the sender: the fix's own time, however late it goes out ----

    private val scheduler = ManualScheduler()
    private val transport = FakeTransport()

    private fun sender(dir: java.io.File = tmp.root, interval: Long = 0, latestWins: Boolean = false, at: Boolean = true) = LocationSender(
        testConfig(discardOlderOnSuccess = latestWins, minSendIntervalMs = interval, sendLocationAt = at),
        transport, FileLocationQueue(dir), MockPolicy(true), scheduler
    )

    private fun times() = transport.requests.map { Regex("\"location_at\":\"([^\"]+)\"").find(it.body)?.groupValues?.get(1) }

    @Test fun aFixSentLateAfterAnOutageKeepsItsOwnTime() {
        val s = sender()
        s.start(); scheduler.runPending()
        transport.default = FakeTransport.offline
        val taken = fix(1).copy(timestamp = 1_795_096_987_000L)
        s.onFix(taken); scheduler.runPending()
        scheduler.advance(10 * 60_000) // ten minutes of failed retries go by
        transport.requests.clear()
        transport.default = HttpResult.Response(200)
        s.onConnectivityRestored(); scheduler.runPending()
        assertEquals(listOf<String?>("2026-11-19 14:03:07"), times()) // not the time of sending
    }

    @Test fun aFixFromTheQueueOfAPreviousRunKeepsItsOwnTime() {
        val dir = tmp.newFolder()
        prefilledQueue(dir, fix(1).copy(timestamp = 1_795_096_987_000L))
        val s = sender(dir)
        s.start(); scheduler.runPending()
        assertEquals(listOf<String?>("2026-11-19 14:03:07"), times())
    }

    @Test fun aFixSentAfterTheIntervalKeepsItsOwnTime() {
        val s = sender(interval = 1500, latestWins = true)
        s.start(); scheduler.runPending()
        s.onFix(fix(1).copy(timestamp = 1_795_096_987_000L)); scheduler.runPending()
        s.onFix(fix(2).copy(timestamp = 1_795_096_988_500L)); scheduler.runPending() // taken at :08, sent 1.5 s later
        scheduler.advance(1500)
        assertEquals(listOf<String?>("2026-11-19 14:03:07", "2026-11-19 14:03:08"), times())
    }

    @Test fun offTheRequestsCarryNoLocationAtEvenWhenFixesAreLate() {
        val s = sender(at = false)
        s.start(); scheduler.runPending()
        s.onFix(fix(1)); scheduler.runPending()
        assertEquals(listOf<String?>(null), times())
        assertFalse(transport.requests.single().body.contains("location_at"))
    }

    @Test fun theConfigCanSwitchItOnAndOffAtRunTime() {
        val s = sender(at = false)
        s.start(); scheduler.runPending()
        s.onFix(fix(1)); scheduler.runPending()
        s.updateConfig(testConfig(sendLocationAt = true)); scheduler.runPending()
        s.onFix(fix(2)); scheduler.runPending()
        s.updateConfig(testConfig(sendLocationAt = false)); scheduler.runPending()
        s.onFix(fix(3)); scheduler.runPending()
        assertEquals(listOf(false, true, false), transport.requests.map { it.body.contains("location_at") })
    }
}
