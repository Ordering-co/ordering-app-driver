package co.ordering.app

import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.Protocol
import okhttp3.Request
import okhttp3.Response
import okhttp3.ResponseBody.Companion.toResponseBody
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * The owner's decision of 2026-11-19: `X-Device-Id-X` only to the Ordering API; the detailed User-Agent to every host.
 *
 *     ./gradlew :app:testDebugUnitTest --tests 'co.ordering.app.HeadersInterceptorTest'
 */
class HeadersInterceptorTest {
  private val reactDefault = "ODelivery/1.0"
  private val userAgent = "ODelivery/1.0 (co.ordering.delivery; build:7; Android 15; samsung SM-S911B) okhttp/4.9.2"

  private var seen: Request? = null

  /** A client with the app's interceptor and, behind it, one that records the request it is given and answers 200 (no network). */
  private fun client(deviceId: String? = "abc123") = OkHttpClient.Builder()
    .addInterceptor(UserAgent.interceptor(reactDefault, userAgent, deviceId))
    .addInterceptor(Interceptor { chain ->
      seen = chain.request()
      Response.Builder().request(chain.request()).protocol(Protocol.HTTP_1_1).code(200).message("OK").body("".toResponseBody()).build()
    })
    .build()

  private fun get(url: String, userAgentHeader: String? = reactDefault, deviceHeader: String? = null): Request {
    val request = Request.Builder().url(url).apply {
      if (userAgentHeader != null) header("User-Agent", userAgentHeader)
      if (deviceHeader != null) header("X-Device-Id-X", deviceHeader)
    }.build()
    client().newCall(request).execute().close()
    return seen!!
  }

  @After fun reset() {
    ApiHosts.set(null)
  }

  @Test fun theApiHostGetsBothHeaders() {
    ApiHosts.set("https://apiv4.ordering.co/v400/en/brand")
    val sent = get("https://apiv4.ordering.co/v400/en/brand/orders")
    assertEquals(userAgent, sent.header("User-Agent"))
    assertEquals("abc123", sent.header("X-Device-Id-X"))
  }

  @Test fun anotherHostGetsOnlyTheUserAgent() {
    ApiHosts.set("https://apiv4.ordering.co/v400/en/brand")
    val sent = get("https://maps.googleapis.com/maps/api/staticmap?size=1x1")
    assertEquals(userAgent, sent.header("User-Agent"))
    assertNull("the id never goes to a third party", sent.header("X-Device-Id-X"))
  }

  @Test fun untilTheApiIsKnownNobodyGetsTheId() {
    val sent = get("https://apiv4.ordering.co/v400/en/brand/orders")
    assertEquals(userAgent, sent.header("User-Agent"))
    assertNull(sent.header("X-Device-Id-X"))
  }

  @Test fun aSiblingSubdomainOrAnotherPortIsNotTheApi() {
    ApiHosts.set("https://apiv4.ordering.co/v400/en/brand")
    assertNull(get("https://evil.apiv4.ordering.co/x").header("X-Device-Id-X"))
    assertNull(get("https://apiv4.ordering.co.evil.example/x").header("X-Device-Id-X"))
    assertNull(get("https://apiv4.ordering.co:8443/x").header("X-Device-Id-X"))
  }

  @Test fun theHostComparisonIgnoresCaseAndTheSchemesDefaultPort() {
    ApiHosts.set("https://ApiV4.Ordering.co/v400")
    assertEquals("abc123", get("https://apiv4.ordering.co:443/orders").header("X-Device-Id-X"))
    ApiHosts.set("http://localhost:8080/v400/en/development")
    assertEquals("abc123", get("http://localhost:8080/v400/en/development/users").header("X-Device-Id-X"))
    assertNull("Metro on the same host is not the API", get("http://localhost:8082/index.bundle").header("X-Device-Id-X"))
  }

  @Test fun anIdTheCallerSetsIsKeptAndAUserAgentTheCallerSetsToo() {
    ApiHosts.set("https://apiv4.ordering.co/v400")
    val sent = get("https://apiv4.ordering.co/x", userAgentHeader = "Custom/9", deviceHeader = "mine")
    assertEquals("Custom/9", sent.header("User-Agent"))
    assertEquals("mine", sent.header("X-Device-Id-X"))
  }

  @Test fun noIdIsSentWhenTheDeviceHasNone() {
    ApiHosts.set("https://apiv4.ordering.co/v400")
    OkHttpClient.Builder().addInterceptor(UserAgent.interceptor(reactDefault, userAgent, null))
      .addInterceptor(Interceptor { chain ->
        seen = chain.request()
        Response.Builder().request(chain.request()).protocol(Protocol.HTTP_1_1).code(200).message("OK").body("".toResponseBody()).build()
      }).build().newCall(Request.Builder().url("https://apiv4.ordering.co/x").build()).execute().close()
    assertNull(seen!!.header("X-Device-Id-X"))
  }

  @Test fun setApiRootRejectsTextThatIsNotAUrlAndClearsTheHost() {
    assertTrue(ApiHosts.set("https://apiv4.ordering.co/v400"))
    assertFalse(ApiHosts.set("not a url"))
    assertFalse(ApiHosts.matches("https://apiv4.ordering.co/x"))
    assertFalse(ApiHosts.set(null))
  }
}
