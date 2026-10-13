package com.deliveryapp

import android.content.Context
import android.media.AudioManager
import androidx.core.app.NotificationCompat
import com.onesignal.OSNotificationReceivedEvent
import com.onesignal.OneSignal

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

class NotificationServiceExtension : OneSignal.OSRemoteNotificationReceivedHandler {

  private companion object {
    const val ALARM_CHANNEL_ID = "new_order_alarm"
  }

  override fun remoteNotificationReceived(context: Context, event: OSNotificationReceivedEvent) {
    raiseAlarmVolumeToMax(context)
    val secureOrder = secureOrderId(context, event)
    try {
      val mutated = event.notification.mutableCopy()
      mutated.setExtender { builder ->
        builder
          .setChannelId(ALARM_CHANNEL_ID)
          .setPriority(NotificationCompat.PRIORITY_MAX)
          .setCategory(NotificationCompat.CATEGORY_ALARM)
          .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
          .setDefaults(NotificationCompat.DEFAULT_VIBRATE)
        if (secureOrder != null) {
          val (id, masked) = secureOrder
          val title = SecureOrder.maskText(event.notification.title, id, masked)
          val body = SecureOrder.maskText(event.notification.body, id, masked)
          builder.setContentTitle(title)
          builder.setContentText(body)
          builder.setStyle(NotificationCompat.BigTextStyle().bigText(body))
        }
        builder
      }
      event.complete(mutated)
    } catch (e: Throwable) {
      event.complete(event.notification)
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

  private fun secureOrderId(context: Context, event: OSNotificationReceivedEvent): Pair<String, String>? {
    val project = context.getSharedPreferences(SecureOrder.PREFS, Context.MODE_PRIVATE)
      .getString(SecureOrder.PROJECT_KEY, null) ?: return null
    if (!SecureOrder.PROJECTS.contains(project)) return null
    val id = event.notification.additionalData?.optString("order_id")?.takeIf { it.isNotBlank() } ?: return null
    return id to SecureOrder.mask(id)
  }
}
