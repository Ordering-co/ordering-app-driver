package co.ordering.app

import android.content.Context
import android.content.pm.PackageInfo
import android.os.Build
import com.facebook.react.modules.network.NetworkingModule
import okhttp3.Interceptor
import okhttp3.OkHttp

/**
 * The User-Agent of the app's requests (`fetch`, `XMLHttpRequest`: every API call, and the
 * driver location module's own requests, [headers]):
 *
 * `<App>/<version> (<package>; build:<code>; Android <release>; <maker> <model>) okhttp/<version>`
 *
 * React Native's own is only `<App>/<version>`, so the API could not tell an
 * Android app (`UserAgentHelper::isAndroid`, the metering's client family) nor
 * its build or device. iOS sends the same shape (`AppDelegate.swift`). A
 * User-Agent the JS sets on a request is kept.
 *
 * The same interceptor adds the device's id (`X-Device-Id-X`, `DeviceId`), but ONLY to requests of the
 * Ordering API ([ApiHosts]: the owner's decision of 2026-11-19; the User-Agent goes to every host): React
 * Native takes one client builder only, so every header of the app's own goes here.
 *
 * The driver location service sends with `HttpURLConnection` (Android's own HTTP stack is
 * OkHttp underneath), not through React Native's client: [headers] gives it the same two
 * headers with the same values, built by the same function ([applicationPart]) and
 * read from the same source ([DeviceId.read]), natively, in the service's own process.
 *
 * In the fixed package `co.ordering.app`, not the app's: the Builder
 * renames the app's package (co.ordering.delivery) only in the files
 * its base lists, so a class of its own lives here and is imported.
 */
object UserAgent {
  private const val HEADER = "User-Agent"

  fun install(context: Context) {
    val interceptor = interceptor(reactDefault(context), value(context), DeviceId.read(context))
    NetworkingModule.setCustomClientBuilder { builder -> builder.addInterceptor(interceptor) }
  }

  /**
   * The interceptor of every request React Native makes. The User-Agent replaces React Native's own (or none) on every host;
   * the id ([deviceId]) is added only where [apiHosts] says the request is the API's, and only when the request has none.
   */
  internal fun interceptor(reactDefault: String, userAgent: String, deviceId: String?, apiHosts: (okhttp3.HttpUrl) -> Boolean = ApiHosts::matches): Interceptor =
    Interceptor { chain ->
      val request = chain.request()
      val headers = request.newBuilder()
      val current = request.header(HEADER)
      if (current == null || current == reactDefault) headers.header(HEADER, userAgent)
      if (deviceId != null && request.header(DeviceId.HEADER) == null && apiHosts(request.url)) headers.header(DeviceId.HEADER, deviceId)
      chain.proceed(headers.build())
    }

  /**
   * The two headers of every request of the app, for a transport that is not React Native's client (the location service's).
   * Its requests go to the API only, so they always carry the id.
   */
  fun headers(context: Context): Map<String, String> {
    val headers = LinkedHashMap<String, String>()
    headers[HEADER] = value(context)
    DeviceId.read(context)?.let { headers[DeviceId.HEADER] = it }
    return headers
  }

  /** The whole value: [applicationPart] and the HTTP stack. */
  fun value(context: Context): String = "${applicationPart(context)} okhttp/${OkHttp.VERSION}"

  /** `<App>/<version> (<package>; build:<code>; Android <release>; <maker> <model>)`: the one function every request's User-Agent is built from. */
  fun applicationPart(context: Context): String {
    val info = packageInfo(context)
    return format(
      reactDefault(context),
      context.packageName,
      versionCode(info),
      Build.VERSION.RELEASE,
      "${Build.MANUFACTURER} ${Build.MODEL}",
    )
  }

  /** The one React Native sets when the JS sets none (`NetworkingModule`): replaced. */
  private fun reactDefault(context: Context): String {
    val pm = context.packageManager
    val packageName = context.packageName
    val name = token(pm.getApplicationLabel(context.applicationInfo).toString()).ifEmpty { token(packageName) }
    val version = token(packageInfo(context).versionName)
    return if (version.isEmpty()) name else "$name/$version"
  }

  internal fun format(product: String, packageName: String, build: Long, release: String?, device: String?): String =
    "$product ($packageName; build:$build; Android ${comment(release)}; ${comment(device)})"

  private fun packageInfo(context: Context): PackageInfo = context.packageManager.getPackageInfo(context.packageName, 0)

  private fun versionCode(info: PackageInfo): Long =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) info.longVersionCode else @Suppress("DEPRECATION") info.versionCode.toLong()

  /** An RFC 7231 token, as React Native reduces the app's name (OkHttp rejects anything outside ASCII). */
  internal fun token(value: String?): String =
    value.orEmpty().filter { it in 'a'..'z' || it in 'A'..'Z' || it in '0'..'9' || it in "!#$%&'*+-.^_`|~" }

  /** Printable ASCII without the comment's own delimiters, spaces collapsed. */
  internal fun comment(value: String?): String =
    value.orEmpty().filter { it in ' '..'~' && it !in "();" }.trim().replace(Regex(" +"), " ").ifEmpty { "unknown" }
}
