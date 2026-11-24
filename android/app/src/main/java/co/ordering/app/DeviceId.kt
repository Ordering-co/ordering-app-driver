package co.ordering.app

import android.annotation.SuppressLint
import android.content.Context
import android.provider.Settings

/**
 * The device's id the app sends in `X-Device-Id-X` on every request (`UserAgent.install`, and
 * `UserAgent.headers` for the driver location service's own requests), for the API's analytics.
 *
 * It is `Settings.Secure.ANDROID_ID`: from Android 8, a value per signing key, user and
 * device, which stays the same when the app is reinstalled and changes with a factory reset.
 * `UserAgent.install` reads it once per process, at start, and its interceptor reuses that
 * value on every request; the location service reads it again, in its own process (the
 * service may be in another one). It is kept in memory only, never in the app's storage: a
 * copy there (the module's queue, a preference) would travel to another phone with Auto
 * Backup. Never the Advertising ID.
 *
 * iOS sends a UUID kept in its Keychain under the same header (`DeviceId` in `AppDelegate.swift`).
 */
object DeviceId {
  const val HEADER = "X-Device-Id-X"

  @SuppressLint("HardwareIds")
  fun read(context: Context): String? =
    try {
      valid(Settings.Secure.getString(context.contentResolver, Settings.Secure.ANDROID_ID))
    } catch (e: Exception) {
      null
    }

  /** ANDROID_ID is hexadecimal (16 digits); anything else (none, an emulator's oddity) is no id. */
  fun valid(value: String?): String? {
    val id = value?.trim()?.lowercase() ?: return null
    return if (Regex("[0-9a-f]{1,64}").matches(id) && id.any { it != '0' }) id else null
  }
}
