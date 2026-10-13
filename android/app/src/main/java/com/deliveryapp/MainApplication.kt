package com.deliveryapp

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.react.uimanager.ViewManager

object AlarmConstants {
  const val ALARM_CHANNEL_ID = "new_order_alarm"
}

class MainApplication : Application(), ReactApplication {

  override val reactNativeHost: ReactNativeHost =
      object : DefaultReactNativeHost(this) {
        override fun getPackages(): List<ReactPackage> =
          PackageList(this).packages.apply {
            add(AlarmSoundPackage())
          }

        override fun getJSMainModuleName(): String = "index"

        override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

        override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
        override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED
      }

  override val reactHost: ReactHost
    get() = getDefaultReactHost(applicationContext, reactNativeHost)

  override fun onCreate() {
    super.onCreate()
    loadReactNative(this)
    createAlarmNotificationChannel()
  }

  private fun createAlarmNotificationChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val manager = getSystemService(NotificationManager::class.java) ?: return

    val notificationSound = Uri.parse("android.resource://$packageName/raw/order_sound_notification")

    val audioAttributes = AudioAttributes.Builder()
      .setUsage(AudioAttributes.USAGE_ALARM)
      .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
      .build()

    val channel = NotificationChannel(
      AlarmConstants.ALARM_CHANNEL_ID,
      "New orders (alarm)",
      NotificationManager.IMPORTANCE_HIGH
    ).apply {
      description = "Priority alert when a new order arrives"
      setSound(notificationSound, audioAttributes)
      enableVibration(true)
      vibrationPattern = longArrayOf(0, 1000, 500, 1000, 500, 1000)
      setBypassDnd(true)
      lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
    }
    manager.createNotificationChannel(channel)
  }
}

class AlarmSoundPackage : ReactPackage {
  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> =
    listOf(AlarmSoundModule(reactContext))

  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> =
    emptyList()
}

class AlarmSoundModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  private companion object {
    const val SECURE_ORDER_PREFS = "secure_order"
    const val SECURE_ORDER_PROJECT_KEY = "project"
  }

  private var player: MediaPlayer? = null
  private var loadedUri: Uri? = null
  private var isPrepared: Boolean = false
  private var shouldPlayWhenReady: Boolean = false

  override fun getName(): String = "AlarmSound"

  @ReactMethod
  fun start(url: String?) {
    val context = reactApplicationContext
    val fallbackUri = RingtoneManager.getActualDefaultRingtoneUri(context, RingtoneManager.TYPE_ALARM)
      ?: Settings.System.DEFAULT_ALARM_ALERT_URI
    val requestedUri = if (!url.isNullOrBlank()) Uri.parse(url) else fallbackUri

    val am = context.getSystemService(Context.AUDIO_SERVICE) as? AudioManager
    am?.let {
      val max = it.getStreamMaxVolume(AudioManager.STREAM_ALARM)
      it.setStreamVolume(AudioManager.STREAM_ALARM, max, 0)
    }

    if (player != null && loadedUri == requestedUri) {
      if (isPrepared) {
        try {
          player?.seekTo(0)
          player?.start()
        } catch (_: Throwable) {
          rebuild(context, requestedUri, fallbackUri)
        }
      } else {
        shouldPlayWhenReady = true
      }
      return
    }

    rebuild(context, requestedUri, fallbackUri)
  }

  @ReactMethod
  fun stop() {
    shouldPlayWhenReady = false
    try {
      player?.let { if (it.isPlaying) it.pause() }
    } catch (_: Throwable) {
    }
  }

  @ReactMethod
  fun release() {
    releaseInternal()
  }

  @ReactMethod
  fun setSecureOrderProject(project: String?) {
    reactApplicationContext
      .getSharedPreferences(SECURE_ORDER_PREFS, Context.MODE_PRIVATE)
      .edit()
      .putString(SECURE_ORDER_PROJECT_KEY, project ?: "")
      .apply()
  }

  private fun rebuild(context: Context, uri: Uri, fallbackUri: Uri) {
    releaseInternal()
    shouldPlayWhenReady = true
    loadedUri = uri
    try {
      val mp = MediaPlayer()
      mp.setAudioAttributes(
        AudioAttributes.Builder()
          .setUsage(AudioAttributes.USAGE_ALARM)
          .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
          .build()
      )
      mp.setDataSource(context, uri)
      mp.isLooping = false
      mp.setVolume(1f, 1f)
      mp.setOnPreparedListener {
        isPrepared = true
        if (shouldPlayWhenReady) {
          try { it.start() } catch (_: Throwable) {}
        }
      }
      mp.setOnErrorListener { errPlayer, _, _ ->
        errPlayer.release()
        if (loadedUri != fallbackUri) {
          rebuild(context, fallbackUri, fallbackUri)
        } else {
          player = null
          isPrepared = false
        }
        true
      }
      player = mp
      mp.prepareAsync()
    } catch (_: Throwable) {
      if (uri != fallbackUri) rebuild(context, fallbackUri, fallbackUri)
    }
  }

  private fun releaseInternal() {
    shouldPlayWhenReady = false
    isPrepared = false
    try {
      player?.apply {
        if (isPlaying) stop()
        release()
      }
    } catch (_: Throwable) {
    } finally {
      player = null
      loadedUri = null
    }
  }

  override fun invalidate() {
    releaseInternal()
    super.invalidate()
  }
}
