package co.ordering.app

import okhttp3.HttpUrl.Companion.toHttpUrlOrNull
import okhttp3.HttpUrl

/**
 * Which requests are the Ordering API's, so that `X-Device-Id-X` goes there and nowhere else (the owner's decision of
 * 2026-11-19: the id only to the API; the detailed User-Agent may go to every host).
 *
 * JavaScript tells the native side the API root once it knows it (`DriverLocation.setApiRoot`, from `useDriverLocationTracking`:
 * `ordering.root`). Until then NO request carries the id. A request is the API's when its host and port are the root's.
 * Process-wide and in memory only.
 */
object ApiHosts {
  @Volatile private var host: String? = null
  @Volatile private var port: Int = -1

  /** Sets (or, with an unusable [root], clears) the API's host and port. Returns whether [root] was usable. */
  fun set(root: String?): Boolean {
    val url = root?.trim()?.toHttpUrlOrNull()
    if (url == null) {
      host = null
      port = -1
      return false
    }
    port = url.port
    host = url.host.lowercase()
    return true
  }

  /** True when [url] is on the configured API's host and port. False for everything while none is configured. */
  fun matches(url: HttpUrl): Boolean {
    val h = host ?: return false
    return url.host.lowercase() == h && url.port == port
  }

  /** True when [url] (text) is the API's; false for text that is not a URL. */
  fun matches(url: String): Boolean = url.toHttpUrlOrNull()?.let(::matches) ?: false
}
