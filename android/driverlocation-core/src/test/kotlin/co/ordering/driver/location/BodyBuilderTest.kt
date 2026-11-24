package co.ordering.driver.location

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertThrows
import org.junit.Test

class BodyBuilderTest {
    private fun fx(lat: Double, lng: Double, mock: Boolean = false) =
        LocationFix(lat, lng, accuracy = 3.0, speed = 2.0, timestamp = 1L, mock = mock)

    // Expected strings below were produced by Node: JSON.stringify({location:{lat,lng,v:"1.0"},driver_id})

    @Test fun bodyIsExactlyTheCanonicalShape() {
        assertEquals(
            """{"location":{"lat":19.432608,"lng":-99.133209,"v":"1.0"},"driver_id":7}""",
            BodyBuilder.build(fx(19.432608, -99.133209), mapOf("driver_id" to 7))
        )
    }

    @Test fun integralNumbers() {
        assertEquals(
            """{"location":{"lat":4,"lng":-2.25,"v":"1.0"},"driver_id":1234}""",
            BodyBuilder.build(fx(4.0, -2.25), mapOf("driver_id" to 1234))
        )
    }

    // The owner's decision of 2026-11-17: the body never carries `mock`, whatever the fix says.
    @Test fun theBodyHasNoMockKeyWhateverTheFixSays() {
        listOf(false, true).forEach { mock ->
            val body = BodyBuilder.build(fx(4.0, -2.25, mock = mock), mapOf("driver_id" to 1234))
            assertEquals("""{"location":{"lat":4,"lng":-2.25,"v":"1.0"},"driver_id":1234}""", body)
            assertFalse(body.contains("mock"))
        }
    }

    @Test fun matchesJavaScriptDigitsForLongCoordinates() {
        assertEquals(
            """{"location":{"lat":40.7127753,"lng":-74.0059728,"v":"1.0"},"driver_id":42}""",
            BodyBuilder.build(fx(40.7127753, -74.0059728), mapOf("driver_id" to 42))
        )
        assertEquals(
            """{"location":{"lat":0.30000000000000004,"lng":-33.8688197,"v":"1.0"},"driver_id":9}""",
            BodyBuilder.build(fx(0.1 + 0.2, -33.8688197), mapOf("driver_id" to 9))
        )
    }

    @Test fun driverIdArrivingAsDoubleFromTheBridgeIsAnInteger() {
        assertEquals(
            """{"location":{"lat":1,"lng":2,"v":"1.0"},"driver_id":7}""",
            BodyBuilder.build(fx(1.0, 2.0), mapOf("driver_id" to 7.0))
        )
    }

    @Test fun numbersAreNeverInExponentFormNorLocalised() {
        val saved = java.util.Locale.getDefault()
        try {
            java.util.Locale.setDefault(java.util.Locale.GERMANY)
            assertEquals("0.00001", BodyBuilder.plainNumber(0.00001))
            assertEquals("0.0000001", BodyBuilder.plainNumber(1e-7))
            assertEquals("0", BodyBuilder.plainNumber(-0.0))
            assertEquals("-0.5", BodyBuilder.plainNumber(-0.5))
            assertEquals("12345678", BodyBuilder.plainNumber(12345678.0))
            assertEquals("100000000000000000000", BodyBuilder.plainNumber(1e20))
            assertEquals("-179.999999", BodyBuilder.plainNumber(-179.999999))
            assertEquals("1.5", BodyBuilder.plainNumber(1.5))
        } finally {
            java.util.Locale.setDefault(saved)
        }
    }

    @Test fun extrasAreMergedAtTheRootAfterLocationInOrder() {
        val extras = linkedMapOf<String, Any>("driver_id" to 7, "app" to "driver", "beta" to true, "ratio" to 0.5)
        assertEquals(
            """{"location":{"lat":1,"lng":2,"v":"1.0"},"driver_id":7,"app":"driver","beta":true,"ratio":0.5}""",
            BodyBuilder.build(fx(1.0, 2.0), extras)
        )
    }

    @Test fun noExtrasGivesOnlyLocation() {
        assertEquals("""{"location":{"lat":1,"lng":2,"v":"1.0"}}""", BodyBuilder.build(fx(1.0, 2.0)))
    }

    @Test fun stringsAreEscaped() {
        assertEquals(
            """{"location":{"lat":1,"lng":2,"v":"1.0"},"k\"":"a\"b\\c\nd\u0001é"}""",
            BodyBuilder.build(fx(1.0, 2.0), mapOf("k\"" to "a\"b\\c\nd\u0001é"))
        )
    }

    @Test fun anExtrasKeyCannotShadowLocation() {
        assertThrows(IllegalArgumentException::class.java) {
            BodyBuilder.build(fx(1.0, 2.0), mapOf("location" to "x"))
        }
    }

    @Test fun invalidCoordinatesAreRefused() {
        assertThrows(IllegalArgumentException::class.java) { BodyBuilder.build(fx(Double.NaN, 2.0)) }
        assertThrows(IllegalArgumentException::class.java) { BodyBuilder.build(fx(91.0, 2.0)) }
    }
}
