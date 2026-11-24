package co.ordering.delivery.location

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.location.LocationManager
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.PowerManager
import android.util.Log
import androidx.core.content.ContextCompat
import androidx.core.location.LocationManagerCompat
import co.ordering.app.UserAgent
import co.ordering.driver.location.Config
import co.ordering.driver.location.DeviceSnapshot
import co.ordering.driver.location.EventSender
import co.ordering.driver.location.ExecutorScheduler
import co.ordering.driver.location.FileEventQueue
import co.ordering.driver.location.FileLocationQueue
import co.ordering.driver.location.FileRecorderStore
import co.ordering.driver.location.HttpUrlConnectionTransport
import co.ordering.driver.location.LocationFix
import co.ordering.driver.location.LocationSender
import co.ordering.driver.location.PermissionState
import co.ordering.driver.location.SenderState
import co.ordering.driver.location.TrackingReasons
import co.ordering.driver.location.TrackingRecorder
import java.io.File

/** Where the module (JavaScript side) hears about what the service does. Called from any thread. */
interface DriverLocationEvents {
    fun onLocation(fix: LocationFix)
    fun onHttp(success: Boolean, status: Int)
    fun onState(kind: String)
}

/**
 * What the TurboModule and the foreground service share, process-wide.
 *
 * The service owns the sender, the queue and the location updates; the module only holds the
 * configuration (never in an Intent: it carries the token) and an event sink while the React
 * runtime is alive. A reload of the JavaScript bundle replaces the module and clears the sink;
 * the service, and what it sends, goes on.
 */
internal object DriverLocationRuntime {
    /** The last valid `configure`. Set by the module, read by the service. */
    @Volatile var config: Config? = null

    /** The running service, or null. Set by the service itself. */
    @Volatile var service: DriverLocationService? = null

    /** Set by the service while it lives. */
    @Volatile var sender: LocationSender? = null

    /** The sender's state when the service last stopped (the queue outlives it). */
    @Volatile var lastState: SenderState? = null

    /** Events for JavaScript; null while no React runtime listens (they are dropped, `getState` is the truth). */
    @Volatile var events: DriverLocationEvents? = null

    /** The authorization last reported or seen, to emit `authorization_changed` only on a change. */
    @Volatile var lastAuthorization: String? = null

    // The reasons of `tracking_started` / `tracking_stopped` are NOT process globals: the start reason travels in the start intent
    // (`DriverLocationService.EXTRA_START_REASON`) and the stop reason in the call to `DriverLocationService.requestStop`, each
    // landing on the one service it was meant for. A reason that arrives late lands on a service that is gone, not on the next.

    private var workerInstance: ExecutorScheduler? = null
    private var eventQueueInstance: FileEventQueue? = null
    private var positionQueueInstance: FileLocationQueue? = null
    private var recorderStoreInstance: FileRecorderStore? = null

    /**
     * The ONE worker of the module, for the whole process: every service, every sender, every recorder and `closeOrphan` run their
     * tasks on it, one at a time and in the order they were posted. So the stop of a service always runs before the start of
     * the next one (even when the old worker is blocked in an HTTP call), two things never write the same file at once, and
     * nothing is lost when a service ends: what it posted last (the `tracking_stopped` event and its send) is simply the next task. A
     * daemon thread that sits idle between sessions; it is never shut down (the clock counts the time the device sleeps).
     */
    @Synchronized
    fun worker(): ExecutorScheduler =
        workerInstance ?: ExecutorScheduler(clock = { android.os.SystemClock.elapsedRealtime() }).also { workerInstance = it }

    /** The positions' persisted queue, ONE per process (same reason as [eventQueue]). */
    @Synchronized
    fun positionQueue(context: Context, maxQueue: Int): FileLocationQueue =
        positionQueueInstance ?: FileLocationQueue(queueDir(context).apply { mkdirs() }, maxQueue).also { positionQueueInstance = it }

    /** The recorder's state file, ONE store per process: two stores over one file would both write its temp file. */
    @Synchronized
    fun recorderStore(context: Context): FileRecorderStore =
        recorderStoreInstance ?: FileRecorderStore(queueDir(context).apply { mkdirs() }).also { recorderStoreInstance = it }

    /**
     * The events' persisted queue, ONE per process: a service that is stopped and started again (the driver switches off
     * and on) shares it with the one before.
     */
    @Synchronized
    fun eventQueue(context: Context): FileEventQueue =
        eventQueueInstance ?: FileEventQueue(queueDir(context).apply { mkdirs() }).also { eventQueueInstance = it }

    /** The location authorization for the events (contract names; the JavaScript-facing state keeps its own `when_in_use`). */
    fun permissionState(context: Context): PermissionState = EventMappings.permission(
        fine = granted(context, Manifest.permission.ACCESS_FINE_LOCATION),
        coarse = granted(context, Manifest.permission.ACCESS_COARSE_LOCATION),
        background = granted(context, Manifest.permission.ACCESS_BACKGROUND_LOCATION)
    )

    fun batterySaverOn(context: Context): Boolean =
        (context.applicationContext.getSystemService(Context.POWER_SERVICE) as? PowerManager)?.isPowerSaveMode == true

    /** The type of [capabilities] (null = no network). */
    fun networkType(capabilities: NetworkCapabilities?): String = EventMappings.networkType(
        present = capabilities != null,
        wifi = capabilities?.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) == true,
        cellular = capabilities?.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) == true
    )

    /** What the recorder needs to know at the start, read from the OS now. */
    fun deviceSnapshot(context: Context): DeviceSnapshot {
        val manager = context.applicationContext.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager
        val caps = try {
            manager?.getNetworkCapabilities(manager.activeNetwork)
        } catch (e: RuntimeException) {
            null
        }
        return DeviceSnapshot(
            appForeground = AppForeground.isForeground,
            gpsOn = servicesEnabled(context),
            online = caps?.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED) == true,
            networkType = networkType(caps),
            batterySaver = batterySaverOn(context),
            permission = permissionState(context)
        )
    }

    /**
     * A session left without a stop (the process died: the system, or the revoked permission) and no service runs to
     * report it (the driver is off shift, or the permission is gone so tracking will not start): reports it now with
     * [reason], on the module's worker. Nothing when the recorder is off, no session is owed, or one is owed to another driver.
     * Called twice in a row it reports once: the second call finds the flag cleared (both run on the one worker over the one
     * store). The cheap check reads one small file.
     */
    fun closeOrphan(context: Context, reason: String?) {
        val config = config
        val owner = config?.eventsOwner
        val app = context.applicationContext
        val store = recorderStore(app)
        val saved = store.load()
        Log.i(TAG, "orphan check: configured=${config != null} events=${owner != null} owed=${saved.active}")
        if (config == null || owner == null || !saved.active) return
        if (saved.owner != owner) {
            Log.i(TAG, "owed session belongs to another driver or url: left alone")
            return
        }
        eventQueue(app).claim(owner)
        // On the module's one worker, behind whatever the last service posted: an orphan is closed once, whoever asks.
        val worker = worker()
        val withHeaders = config.withDefaultHeaders(UserAgent.headers(app))
        val lane = EventSender(
            config = { withHeaders },
            transport = HttpUrlConnectionTransport(),
            queue = eventQueue(app),
            scheduler = worker,
            listener = EventsLog,
            retired = { true } // one attempt; what cannot be sent waits on disk for the next start
        )
        val orphanRecorder = TrackingRecorder(
            platform = "android", scheduler = worker, store = store, sink = { lane.recordOnWorker(it) },
            onLog = { Log.i(TAG, it) }
        )
        orphanRecorder.closeOrphan(owner, TrackingReasons.stopReason(reason), permissionState(app))
    }

    /** The one tag of every line of the module (Logcat: `adb logcat -s DriverLocation`). */
    const val TAG = "DriverLocation"

    fun queueDir(context: Context): File = File(context.applicationContext.filesDir, "driver-location")

    fun emitState(kind: String) {
        Log.i(TAG, "state $kind")
        try {
            events?.onState(kind)
        } catch (_: RuntimeException) {
        }
    }

    /** `always` | `when_in_use` | `denied`: Android cannot tell "not determined" from "denied". */
    fun authorization(context: Context): String {
        val fine = granted(context, Manifest.permission.ACCESS_FINE_LOCATION)
        val coarse = granted(context, Manifest.permission.ACCESS_COARSE_LOCATION)
        if (!fine && !coarse) return "denied"
        return if (granted(context, Manifest.permission.ACCESS_BACKGROUND_LOCATION)) "always" else "when_in_use"
    }

    fun hasLocationPermission(context: Context): Boolean = authorization(context) != "denied"

    fun servicesEnabled(context: Context): Boolean {
        val manager = context.applicationContext.getSystemService(Context.LOCATION_SERVICE) as? LocationManager
            ?: return false
        return LocationManagerCompat.isLocationEnabled(manager)
    }

    /** Emits `authorization_changed` when the permission differs from the last one seen. */
    fun checkAuthorization(context: Context) {
        val now = authorization(context)
        val before = lastAuthorization
        lastAuthorization = now
        if (before != null && before != now) emitState("authorization_changed")
    }

    private fun granted(context: Context, permission: String): Boolean =
        ContextCompat.checkSelfPermission(context, permission) == PackageManager.PERMISSION_GRANTED
}
