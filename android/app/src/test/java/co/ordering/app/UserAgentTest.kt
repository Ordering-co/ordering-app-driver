package co.ordering.app

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 *     ./gradlew :app:testDebugUnitTest --tests 'co.ordering.app.UserAgentTest'
 */
class UserAgentTest {
  @Test
  fun theApplicationPartHasTheAppBuildOsAndDevice() {
    assertEquals(
      "ODelivery/1.0 (co.ordering.delivery; build:7; Android 15; samsung SM-S911B)",
      UserAgent.format("ODelivery/1.0", "co.ordering.delivery", 7, "15", "samsung SM-S911B"),
    )
  }

  @Test
  fun aNameOutsideAsciiIsReducedToAToken() {
    // OkHttp rejects a header value outside ASCII: a label such as "Entregas Ñandú ☕" must not reach it.
    assertEquals("EntregasandA", UserAgent.token("Entregas Ñandú ☕ A"))
    assertEquals("", UserAgent.token("配送"))
    assertTrue(UserAgent.token("Entregas Ñandú ☕").all { it.code < 128 && it != ' ' })
  }

  @Test
  fun theCommentKeepsPrintableAsciiWithoutItsDelimiters() {
    assertEquals("Google Pixel 9 Pro", UserAgent.comment("  Google   Pixel (9); Pro "))
    assertEquals("unknown", UserAgent.comment(null))
    assertEquals("unknown", UserAgent.comment("電話"))
  }

  @Test
  fun aWholeUserAgentIsAsciiAndHasNoControlCharacters() {
    val value = UserAgent.format("ODelivery/1.0", "co.ordering.delivery", 1, "15\n", "Maker Ñ Model")
    assertTrue(value.all { it in ' '..'~' })
  }
}
