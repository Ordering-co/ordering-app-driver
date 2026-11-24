package co.ordering.delivery.location

import android.content.Intent
import android.os.Handler
import android.os.Looper
import android.util.Log
import androidx.core.content.ContextCompat
import co.ordering.app.ApiHosts
import co.ordering.driver.location.Config
import co.ordering.driver.location.ConfigException
import co.ordering.driver.location.LocationFix
import co.ordering.driver.location.NotificationText
import co.ordering.driver.location.SenderState
import co.ordering.driver.location.TrackingReasons
import co.ordering.driver.location.bridge.NativeDriverLocationSpec
import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableType
import com.facebook.react.bridge.WritableMap
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

/**
 * The TurboModule `DriverLocation` (spec: src/native/NativeDriverLocation.ts). A thin shell over
 * [DriverLocationRuntime] and [DriverLocationService]: it parses the configuration, starts and
 * stops the service, and hands the service's events to JavaScript while a React runtime lives.
 * When the runtime is reloaded this module is invalidated; the service is not.
 */
@ReactModule(name = NativeDriverLocationSpec.NAME)
class DriverLocationModule(reactContext: ReactApplicationContext) :
    NativeDriverLocationSpec(reactContext), LifecycleEventListener {

    private val main = Handler(Looper.getMainLooper())

    private val events = object : DriverLocationEvents {
        override fun onLocation(fix: LocationFix) {
            val map = Arguments.createMap()
            map.putDouble("lat", fix.lat)
            map.putDouble("lng", fix.lng)
            if (fix.accuracy != null) map.putDouble("accuracy", fix.accuracy!!) else map.putNull("accuracy")
            if (fix.speed != null) map.putDouble("speed", fix.speed!!) else map.putNull("speed")
            map.putDouble("timestamp", fix.timestamp.toDouble())
            map.putBoolean("mock", fix.mock)
            emitOnLocation(map)
        }

        override fun onHttp(success: Boolean, status: Int) {
            val map = Arguments.createMap()
            map.putBoolean("success", success)
            map.putInt("status", status)
            emitOnHttp(map)
        }

        override fun onState(kind: String) {
            val map = Arguments.createMap()
            map.putString("kind", kind)
            emitOnState(map)
        }
    }

    override fun initialize() {
        super.initialize()
        DriverLocationRuntime.events = events
        reactApplicationContext.addLifecycleEventListener(this)
    }

    /** The React runtime goes away (a reload): drop the sink, leave the service and its queue alone. */
    override fun invalidate() {
        reactApplicationContext.removeLifecycleEventListener(this)
        if (DriverLocationRuntime.events === events) DriverLocationRuntime.events = null
        super.invalidate()
    }

    override fun onHostResume() {
        DriverLocationRuntime.checkAuthorization(reactApplicationContext)
    }

    override fun onHostPause() {}
    override fun onHostDestroy() {}

    override fun configure(config: ReadableMap, promise: Promise) {
        val parsed = try {
            parse(config)
        } catch (e: ConfigException) {
            promise.reject("E_CONFIG", e.message)
            return
        } catch (e: IllegalArgumentException) {
            promise.reject("E_CONFIG", e.message)
            return
        }
        DriverLocationRuntime.config = parsed
        // Numbers and flags only: never the url, the headers or the extras.
        Log.i(TAG, "configured (distance=${parsed.distanceFilter} m, interval=${parsed.interval} ms, fastest=${parsed.fastestInterval} ms, " +
            "maxQueue=${parsed.maxQueue}, discardOlder=${parsed.discardOlderOnSuccess}, rejectMock=${parsed.rejectMock}, " +
            "minSendInterval=${parsed.minSendIntervalMs} ms, sendLocationAt=${parsed.sendLocationAt}, events=${parsed.eventsUrl != null})")
        // The running service swaps what it needs on its own thread; it never restarts for a new token.
        main.post { DriverLocationRuntime.service?.apply(parsed) }
        promise.resolve(stateMap())
    }

    override fun start(reason: String?, promise: Promise) {
        if (DriverLocationRuntime.config == null) {
            promise.resolve(stateMap())
            return
        }
        // What `tracking_started` says (the events recorder: docs/LOCATION_MODULE.md, "Tracking events"): it travels in the intent,
        // to the one run it is for. A start while the service already runs only remembers it (when it has one) for a recorder
        // switched on later; a start with no reason never erases the one given.
        Log.i(TAG, "start requested (reason=${TrackingReasons.startReason(reason)})")
        val context = reactApplicationContext
        try {
            val intent = Intent(context, DriverLocationService::class.java)
            if (reason != null) intent.putExtra(DriverLocationService.EXTRA_START_REASON, TrackingReasons.startReason(reason))
            ContextCompat.startForegroundService(context, intent)
        } catch (e: RuntimeException) {
            // Android 12+ does not let an app in the background start a foreground service.
            Log.w(TAG, "start refused: ${e.javaClass.simpleName}")
            promise.resolve(stateMap())
            return
        }
        settle(promise) { DriverLocationRuntime.sender?.state()?.tracking == true }
    }

    override fun stop(reason: String?, promise: Promise) {
        val context = reactApplicationContext
        val running = DriverLocationRuntime.service
        Log.i(TAG, "stop requested (reason=${TrackingReasons.stopReason(reason)}, running=${running != null})")
        if (running != null) {
            // The running service says it in its `tracking_stopped` (and sends it before it goes away); the reason goes to THIS
            // service, with the request, not to a global the next session could read.
            val why = TrackingReasons.stopReason(reason)
            main.post { running.requestStop(why) }
        } else {
            // Nothing runs: a session the process left without a stop (killed, or its permission revoked) is reported now.
            try {
                DriverLocationRuntime.closeOrphan(context, reason)
            } catch (e: RuntimeException) {
                Log.w(TAG, "orphan session not reported: ${e.javaClass.simpleName}")
            }
            context.stopService(Intent(context, DriverLocationService::class.java))
        }
        settle(promise) { DriverLocationRuntime.service == null }
    }

    override fun getState(promise: Promise) {
        promise.resolve(stateMap())
    }

    /** The API's root, so the device id goes to the API and to nobody else (`co.ordering.app.ApiHosts`). Synchronous: set before the next request. */
    override fun setApiRoot(root: String): Boolean = ApiHosts.set(root)

    override fun flush(promise: Promise) {
        DriverLocationRuntime.sender?.flush()
        promise.resolve(null)
    }

    /** Resolves with the state once [done] holds (the service answers on the main thread), or after 2 s. */
    private fun settle(promise: Promise, done: () -> Boolean) {
        val deadline = System.currentTimeMillis() + SETTLE_MS
        val poll = object : Runnable {
            override fun run() {
                if (done() || System.currentTimeMillis() >= deadline) {
                    promise.resolve(stateMap())
                } else {
                    main.postDelayed(this, 40)
                }
            }
        }
        main.post(poll)
    }

    private fun stateMap(): WritableMap {
        val context = reactApplicationContext
        val live = DriverLocationRuntime.sender?.state()
        val last: SenderState? = live ?: DriverLocationRuntime.lastState
        val map = Arguments.createMap()
        map.putBoolean("enabled", DriverLocationRuntime.config != null)
        map.putBoolean("tracking", live?.tracking == true)
        map.putInt("queued", last?.queued ?: 0)
        if (last?.lastLocationAt != null) map.putDouble("lastLocationAt", last.lastLocationAt!!.toDouble()) else map.putNull("lastLocationAt")
        if (last?.lastHttpStatus != null) map.putInt("lastHttpStatus", last.lastHttpStatus!!) else map.putNull("lastHttpStatus")
        map.putString("authorization", DriverLocationRuntime.authorization(context))
        map.putBoolean("servicesEnabled", DriverLocationRuntime.servicesEnabled(context))
        return map
    }

    private fun parse(map: ReadableMap): Config {
        fun need(key: String) {
            if (!map.hasKey(key) || map.isNull(key)) throw IllegalArgumentException("$key is required")
        }
        listOf(
            "url", "headers", "extras", "distanceFilter", "interval", "fastestInterval",
            "notificationTitle", "notificationText", "maxQueue", "discardOlderOnSuccess", "rejectMock",
            "minSendIntervalMs", "sendLocationAt"
        ).forEach(::need)

        val headers = LinkedHashMap<String, String>()
        map.getMap("headers")!!.let { h ->
            val it = h.keySetIterator()
            while (it.hasNextKey()) {
                val key = it.nextKey()
                if (h.getType(key) != ReadableType.String) throw IllegalArgumentException("header '$key' must be a string")
                headers[key] = h.getString(key)!!
            }
        }
        val extras = LinkedHashMap<String, Any>()
        map.getMap("extras")!!.let { e ->
            val it = e.keySetIterator()
            while (it.hasNextKey()) {
                val key = it.nextKey()
                when (e.getType(key)) {
                    ReadableType.String -> extras[key] = e.getString(key)!!
                    ReadableType.Number -> extras[key] = e.getDouble(key)
                    ReadableType.Boolean -> extras[key] = e.getBoolean(key)
                    else -> throw IllegalArgumentException("extras['$key'] must be a string, a number or a boolean")
                }
            }
        }
        return Config(
            url = map.getString("url")!!,
            headers = headers,
            extras = extras,
            distanceFilter = map.getDouble("distanceFilter"),
            interval = map.getDouble("interval").toLong(),
            fastestInterval = map.getDouble("fastestInterval").toLong(),
            notification = NotificationText(map.getString("notificationTitle")!!, map.getString("notificationText")!!),
            maxQueue = map.getDouble("maxQueue").toInt(),
            discardOlderOnSuccess = map.getBoolean("discardOlderOnSuccess"),
            rejectMock = map.getBoolean("rejectMock"),
            minSendIntervalMs = map.getDouble("minSendIntervalMs").toLong(),
            sendLocationAt = map.getBoolean("sendLocationAt"),
            // Optional: absent = the events recorder is off (an older caller changes nothing).
            eventsUrl = if (map.hasKey("eventsUrl") && !map.isNull("eventsUrl")) map.getString("eventsUrl") else null
        )
    }

    private companion object {
        const val TAG = "DriverLocation"
        const val SETTLE_MS = 2_000L
    }
}

class DriverLocationPackage : BaseReactPackage() {
    override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? =
        if (name == NativeDriverLocationSpec.NAME) DriverLocationModule(reactContext) else null

    override fun getReactModuleInfoProvider() = ReactModuleInfoProvider {
        mapOf(
            NativeDriverLocationSpec.NAME to ReactModuleInfo(
                NativeDriverLocationSpec.NAME,
                DriverLocationModule::class.java.name,
                false, // canOverrideExistingModule
                false, // needsEagerInit
                false, // isCxxModule
                true   // isTurboModule
            )
        )
    }
}
