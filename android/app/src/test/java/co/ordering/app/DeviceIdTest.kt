package co.ordering.app

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

/**
 *     ./gradlew :app:testDebugUnitTest --tests 'co.ordering.app.DeviceIdTest'
 */
class DeviceIdTest {
  @Test
  fun anAndroidIdIsKept() {
    assertEquals("3f2a9c4d1e8b7a60", DeviceId.valid("3f2a9c4d1e8b7a60"))
  }

  @Test
  fun itIsLowercaseAndTrimmed() {
    assertEquals("3f2a9c4d1e8b7a60", DeviceId.valid(" 3F2A9C4D1E8B7A60\n"))
  }

  @Test
  fun noneIsNoId() {
    assertNull(DeviceId.valid(null))
    assertNull(DeviceId.valid(""))
    assertNull(DeviceId.valid("   "))
  }

  @Test
  fun onlyZerosIsNoId() {
    assertNull(DeviceId.valid("0000000000000000"))
  }

  @Test
  fun notHexadecimalIsNoId() {
    assertNull(DeviceId.valid("android-id"))
    assertNull(DeviceId.valid("3f2a 9c4d"))
    assertNull(DeviceId.valid("é3f2a9c4d"))
    assertNull(DeviceId.valid("a".repeat(65)))
  }
}
