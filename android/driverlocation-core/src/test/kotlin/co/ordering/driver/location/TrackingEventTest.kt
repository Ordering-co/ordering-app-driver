package co.ordering.driver.location

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class TrackingEventTest {
    @Test fun theJsonIsExactlyTheContractsExample() {
        val e = TrackingEvent(
            uuid = "3f1c2a9e-5b7d-4c1e-9a52-0d6f8b7e1c44",
            event = "turn_on_gps",
            occurredAtMs = 1_795_096_987_000L, // 2026-11-19 14:03:07 UTC
            durationMs = 184000,
            data = linkedMapOf("platform" to "android", "app_state" to "background")
        )
        assertEquals(
            """{"uuid":"3f1c2a9e-5b7d-4c1e-9a52-0d6f8b7e1c44","event":"turn_on_gps","occurred_at":"2026-11-19 14:03:07","duration_ms":184000,"data":{"platform":"android","app_state":"background"}}""",
            e.toJson()
        )
    }

    @Test fun theBodyIsTheArrayAsAJsonStringEveryApiVersionAccepts() {
        val body = EventJson.body(listOf(ev(1).toJson(), ev(2).toJson()))
        assertTrue(body, body.startsWith("""{"events":"[{\"uuid\":\"00000000-0000-4000-8000-000000000001\"""))
        assertTrue(body.endsWith("""}}]"}"""))
        // exactly what today's JavaScript senders post: JSON.stringify({ events: JSON.stringify([...]) })
        assertEquals(
            """{"events":"[{\"uuid\":\"3f1c2a9e-5b7d-4c1e-9a52-0d6f8b7e1c44\",\"event\":\"turn_on_gps\",\"occurred_at\":\"2026-11-19 14:03:07\",\"duration_ms\":184000,\"data\":{\"platform\":\"android\",\"app_state\":\"background\"}}]"}""",
            EventJson.body(listOf("""{"uuid":"3f1c2a9e-5b7d-4c1e-9a52-0d6f8b7e1c44","event":"turn_on_gps","occurred_at":"2026-11-19 14:03:07","duration_ms":184000,"data":{"platform":"android","app_state":"background"}}"""))
        )
        assertEquals(listOf(1, 2), eventNumbers(body))
        assertEquals("""{"events":"[]"}""", EventJson.body(emptyList()))
    }

    @Test fun durationIsLeftOutWhenNullAndNeverNegative() {
        assertTrue("duration_ms" !in ev(1).toJson())
        assertTrue("\"duration_ms\":0," in ev(1, durationMs = -5).toJson())
    }

    @Test fun dataKeepsItsOrderAndWritesStringsBooleansAndIntegers() {
        val e = ev(1).copy(data = linkedMapOf("platform" to "ios", "app_state" to "background", "from" to "always", "precise_to" to false, "n" to 3L))
        assertTrue(e.toJson().endsWith(""""data":{"platform":"ios","app_state":"background","from":"always","precise_to":false,"n":3}}"""))
    }

    @Test fun textIsEscapedSoALineNeverHoldsATabOrABreak() {
        val e = ev(1).copy(data = linkedMapOf("platform" to "a\tb\nc\"d\\e"))
        val json = e.toJson()
        assertTrue('\t' !in json && '\n' !in json)
        assertTrue("""a\tb\nc\"d\\e""" in json)
    }

    @Test fun anUnsupportedDataValueIsRefused() {
        val e = ev(1).copy(data = linkedMapOf("x" to 1.5))
        try { e.toJson(); throw AssertionError("expected an exception") } catch (_: IllegalArgumentException) {}
    }

    @Test fun reasonsOutsideTheContractFallBack() {
        assertEquals("available", TrackingReasons.startReason(null))
        assertEquals("available", TrackingReasons.startReason("nope"))
        assertEquals("login", TrackingReasons.startReason("login"))
        assertEquals("permission", TrackingReasons.startReason("permission"))
        assertEquals("restart", TrackingReasons.startReason("restart"))
        assertEquals("unknown", TrackingReasons.stopReason(null))
        assertEquals("unknown", TrackingReasons.stopReason("nope"))
        assertEquals("system", TrackingReasons.stopReason("system"))
        assertEquals("session_revoked", TrackingReasons.stopReason("session_revoked"))
    }
}
