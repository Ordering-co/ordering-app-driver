package co.ordering.delivery

import android.content.Context
import android.media.AudioManager
import androidx.annotation.Keep
import androidx.core.app.NotificationCompat
import com.onesignal.notifications.INotificationReceivedEvent
import com.onesignal.notifications.INotificationServiceExtension
import org.json.JSONObject

object SecureOrder {
  const val PREFS = "secure_order"
  const val PROJECT_KEY = "project"
  val PROJECTS = setOf("quickiedelivery", "luisv4plus")

  fun mask(id: String): String {
    val pin = minOf(id.length, 4)
    return id.substring(0, id.length - pin) + "*".repeat(pin)
  }

  fun maskText(text: String?, id: String, masked: String): String? {
    if (text == null) return null
    return Regex("\\b" + Regex.escape(id) + "\\b").replace(text, masked)
  }
}

/**
 * OneSignal 5's notification service extension (registered in the manifest as the
 * `com.onesignal.NotificationServiceExtension` meta-data). It runs for every push that arrives,
 * in any app state, before OneSignal displays it. OneSignal 5 displays the notification itself
 * when this returns (no `event.complete`, no `preventDefault`), with the extender applied.
 * Every behaviour below is the one of the OneSignal 4 class it replaces (docs/deps/push-phase.md).
 */
@Keep
class NotificationServiceExtension : INotificationServiceExtension {

  private companion object {
    const val ALARM_CHANNEL_ID = "new_order_alarm"
  }

  override fun onNotificationReceived(event: INotificationReceivedEvent) {
    val context = event.context
    raiseAlarmVolumeToMax(context)
    val notification = event.notification
    val secureOrder = secureOrderId(context, notification.additionalData)
    try {
      // The extender forces the alarm channel and look; on a failure the push is shown as it came.
      notification.setExtender { builder ->
        builder
          .setChannelId(ALARM_CHANNEL_ID)
          .setPriority(NotificationCompat.PRIORITY_MAX)
          .setCategory(NotificationCompat.CATEGORY_ALARM)
          .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
          .setDefaults(NotificationCompat.DEFAULT_VIBRATE)
        if (secureOrder != null) {
          val (id, masked) = secureOrder
          val title = SecureOrder.maskText(notification.title, id, masked)
          val body = SecureOrder.maskText(notification.body, id, masked)
          builder.setContentTitle(title)
          builder.setContentText(body)
          builder.setStyle(NotificationCompat.BigTextStyle().bigText(body))
        }
        builder
      }
    } catch (e: Throwable) {
      // Nothing to undo: without an extender OneSignal displays the original notification.
    }
  }

  private fun raiseAlarmVolumeToMax(context: Context) {
    try {
      val am = context.getSystemService(Context.AUDIO_SERVICE) as? AudioManager ?: return
      val max = am.getStreamMaxVolume(AudioManager.STREAM_ALARM)
      if (am.getStreamVolume(AudioManager.STREAM_ALARM) < max) {
        am.setStreamVolume(AudioManager.STREAM_ALARM, max, 0)
      }
    } catch (_: Throwable) {
    }
  }

  private fun secureOrderId(context: Context, additionalData: JSONObject?): Pair<String, String>? {
    val project = context.getSharedPreferences(SecureOrder.PREFS, Context.MODE_PRIVATE)
      .getString(SecureOrder.PROJECT_KEY, null) ?: return null
    if (!SecureOrder.PROJECTS.contains(project)) return null
    val id = additionalData?.optString("order_id")?.takeIf { it.isNotBlank() } ?: return null
    return id to SecureOrder.mask(id)
  }
}
