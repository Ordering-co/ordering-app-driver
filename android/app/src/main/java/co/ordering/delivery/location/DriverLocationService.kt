package co.ordering.delivery.location

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.ServiceInfo
import android.location.Location
import android.location.LocationManager
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.os.Build
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.os.SystemClock
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import co.ordering.app.UserAgent
import co.ordering.driver.location.Config
import co.ordering.driver.location.EventsSetup
import co.ordering.driver.location.FileLocationQueue
import co.ordering.driver.location.HttpUrlConnectionTransport
import co.ordering.driver.location.LocationFix
import co.ordering.driver.location.LocationSender
import co.ordering.driver.location.MockPolicy
import co.ordering.driver.location.SenderListener
import co.ordering.driver.location.StateKind
import co.ordering.driver.location.TrackingReasons
import co.ordering.driver.location.TrackingRecorder
import co.ordering.delivery.BuildConfig
import co.ordering.delivery.R
import com.google.android.gms.location.LocationAvailability
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority

/**
 * The foreground service of the driver location module (docs/LOCATION_MODULE.md §3).
 *
 * It owns the core's sender (queue, retries, HTTP: all native, no JavaScript), the fused
 * location updates and the connectivity and location-services watchers, for as long as it
 * lives. It is started by the module while the app is in the foreground, stopped by `stop()`,
 * and stopped when the user swipes the app away (`stopOnTerminate`); `START_NOT_STICKY` and no
 * boot receiver mean it never comes back by itself.
 */
class DriverLocationService : Service() {
    private var sender: LocationSender? = null
    private var fused: com.google.android.gms.location.FusedLocationProviderClient? = null
    private var requestedWith: Config? = null
    private var updatesActive = false
    private var networkCallback: ConnectivityManager.NetworkCallback? = null
    private var providersReceiver: BroadcastReceiver? = null
    private var batteryReceiver: BroadcastReceiver? = null
    private var removeForegroundListener: (() -> Unit)? = null
    private var recorder: TrackingRecorder? = null
    private var connectivity: ConnectivityMapper? = null
    private var eventsOn = false
    private var lastServicesEnabled: Boolean? = null
    private var notificationTexts: Pair<String, String>? = null

    /** Ties this run's sender and recorder to the process-wide listeners (see [SessionLink]). */
    private var link: SessionLink? = null

    /**
     * Why this run ends (`tracking_stopped`'s reason): given by [requestStop], or by the service itself. Per run, never a
     * process global: a reason that arrives after the run ended lands on a service that is gone.
     */
    private var endReason: String? = null

    /** Why JavaScript started this run (`tracking_started`'s reason), from the start intent; used once by the recorder, then forgotten. */
    private var startReason: String? = null

    private val locationCallback = object : LocationCallback() {
        override fun onLocationResult(result: LocationResult) {
            val current = sender ?: return
            for (location in result.locations) {
                val fix = toFix(location)
                current.onFix(fix)
                // For the events: a simulated fix is reported whatever the mock policy does with it, and every fix is a
                // sign of life (the heartbeat that tells a stop by the system from a clean one).
                recorder?.let { r ->
                    if (fix.mock) r.mock(location.provider)
                    r.heartbeat()
                }
            }
        }

        override fun onLocationAvailability(availability: LocationAvailability) {
            // Nothing to send: `services_*` events come from the providers receiver.
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        DriverLocationRuntime.service = this
    }

    /**
     * JavaScript's `stop(reason)` for the running service: the reason is this run's own, then the service stops. Main thread.
     * The first reason wins (the service may have its own, such as a lost permission).
     */
    internal fun requestStop(reason: String) {
        if (endReason == null) endReason = reason
        stopSelf()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        // A start with no reason never erases one already given for this run.
        intent?.getStringExtra(EXTRA_START_REASON)?.let { startReason = it }
        val config = DriverLocationRuntime.config
        // Every startForegroundService call must be answered by startForeground, even when it
        // is followed by a stop: the notification is posted first, with the configured texts.
        if (!enterForeground(config)) {
            stopSelf()
            return START_NOT_STICKY
        }
        if (config == null) {
            Log.w(TAG, "started without a configuration, stopping")
            stopSelf()
            return START_NOT_STICKY
        }
        if (!DriverLocationRuntime.hasLocationPermission(this)) {
            Log.w(TAG, "location permission missing, stopping")
            DriverLocationRuntime.emitState("authorization_changed")
            stopSelf()
            return START_NOT_STICKY
        }
        if (sender == null) begin(config) else apply(config)
        return START_NOT_STICKY
    }

    /** The user swiped the app away: tracking stops with it (today's `stopOnTerminate: true`). */
    override fun onTaskRemoved(rootIntent: Intent?) {
        Log.i(TAG, "task removed, stopping")
        stopSelf()
    }

    override fun onDestroy() {
        endTracking()
        if (DriverLocationRuntime.service === this) DriverLocationRuntime.service = null
        super.onDestroy()
    }

    // ---- life of one tracking run ----

    private fun begin(configured: Config) {
        val config = withNativeHeaders(configured)
        // ONE worker for the whole process (`DriverLocationRuntime.worker`): the previous run's last tasks (its `tracking_stopped`
        // and the send of it) are ahead of this run's in the same queue, so they finish first, whatever a request in flight is
        // waiting for. Its clock counts the time the device sleeps; its timers are plain executor delays (no wake lock, no
        // alarm): the location callbacks wake it.
        val worker = DriverLocationRuntime.worker()
        val queue = DriverLocationRuntime.positionQueue(this, config.maxQueue)
        val session = SessionLink { DriverLocationRuntime.sender }
        link = session
        val created = LocationSender(
            config = config,
            transport = HttpUrlConnectionTransport(),
            queue = queue,
            mockPolicy = MockPolicy(releaseBuild = !BuildConfig.DEBUG),
            scheduler = worker,
            listener = Forwarder(session),
            events = EventsSetup(DriverLocationRuntime.eventQueue(this), EventsLog)
        )
        sender = created
        session.sender = created
        DriverLocationRuntime.sender = created
        DriverLocationRuntime.lastAuthorization = DriverLocationRuntime.authorization(this)
        // The events recorder rides the sender's worker and stores into the sender's events lane, in order.
        val events = TrackingRecorder(
            platform = "android",
            scheduler = worker,
            store = DriverLocationRuntime.recorderStore(this),
            sink = { created.recordOnWorker(it) },
            onLog = { Log.i(TAG, it) }
        )
        recorder = events
        session.recorder = events
        created.start()
        startUpdates(config)
        watchConnectivity()
        watchServices()
        watchEventSignals()
        syncEvents(config)
        Log.i(TAG, "tracking started (distance=${config.distanceFilter} m, interval=${config.interval} ms, queued=${created.state().queued})")
    }

    /** `configure` called again while running: the sender swaps what it needs, the updates restart only if their numbers changed. */
    internal fun apply(configured: Config) {
        val running = sender ?: return
        val config = withNativeHeaders(configured)
        running.updateConfig(config)
        val before = requestedWith
        if (before == null || before.distanceFilter != config.distanceFilter ||
            before.interval != config.interval || before.fastestInterval != config.fastestInterval
        ) {
            stopUpdates()
            startUpdates(config)
        }
        val texts = config.notification.title to config.notification.text
        if (texts != notificationTexts) enterForeground(config)
        syncEvents(config)
    }

    /**
     * Starts or ends the events recorder when the configuration says so: an events url is the switch (JavaScript passes it
     * unless the project turned `driver_tracking_events_enabled` off). Turned on while running: `tracking_started` with the
     * reason JavaScript gave; turned off: the session ends with no event.
     */
    private fun syncEvents(config: Config) {
        val owner = config.eventsOwner
        val on = owner != null
        if (on == eventsOn) return
        eventsOn = on
        val events = recorder ?: return
        if (owner != null) {
            val reason = TrackingReasons.startReason(startReason)
            startReason = null // used: a recorder switched on later without a new start says `available`
            events.start(owner, reason, DriverLocationRuntime.deviceSnapshot(this))
        } else {
            events.cancel()
        }
    }

    /**
     * The headers every request of the app carries (`User-Agent`, `X-Device-Id-X`), set here, natively,
     * never by JavaScript: the same two values React Native's requests carry (co.ordering.app.UserAgent).
     * The device id (ANDROID_ID) is read again in this process and never stored (not in the config, not
     * in the queue). A header the configuration already holds wins.
     */
    private fun withNativeHeaders(config: Config): Config = config.withDefaultHeaders(UserAgent.headers(this))

    private fun endTracking() {
        stopUpdates()
        removeForegroundListener?.invoke()
        removeForegroundListener = null
        batteryReceiver?.let {
            try {
                unregisterReceiver(it)
            } catch (_: RuntimeException) {
            }
        }
        batteryReceiver = null
        // The stop's own event (with its reason, this run's own) goes into the queue before anything else is posted for the end.
        // The sender is told the service is gone first: from now on it sets no timer (what cannot be sent waits on disk).
        sender?.retire()
        val reason = endReason ?: TrackingReasons.SYSTEM
        endReason = null
        recorder?.stop(reason)
        recorder = null
        eventsOn = false
        connectivity = null
        networkCallback?.let {
            try {
                (getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager).unregisterNetworkCallback(it)
            } catch (_: RuntimeException) {
            }
        }
        networkCallback = null
        providersReceiver?.let {
            try {
                unregisterReceiver(it)
            } catch (_: RuntimeException) {
            }
        }
        providersReceiver = null
        val running = sender
        if (running != null) {
            DriverLocationRuntime.lastState = running.state().copy(tracking = false)
            running.stop()
        }
        sender = null
        if (DriverLocationRuntime.sender === running) DriverLocationRuntime.sender = null
        link = null
        // No worker to shut down: it is the process's, and what was posted above (the `tracking_stopped` and its send) is the next
        // thing it runs, ahead of anything the next service posts.
        Log.i(TAG, "tracking stopped")
    }

    // ---- fused location ----

    private fun startUpdates(config: Config) {
        val client = fused ?: LocationServices.getFusedLocationProviderClient(this).also { fused = it }
        val request = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, config.interval)
            .setMinUpdateIntervalMillis(config.fastestInterval)
            .setMinUpdateDistanceMeters(config.distanceFilter.toFloat())
            .setWaitForAccurateLocation(false)
            .build()
        try {
            client.requestLocationUpdates(request, locationCallback, Looper.getMainLooper())
            updatesActive = true
            requestedWith = config
        } catch (e: SecurityException) {
            Log.w(TAG, "location permission lost")
            recorder?.permission(DriverLocationRuntime.permissionState(this))
            DriverLocationRuntime.emitState("authorization_changed")
            requestStop(TrackingReasons.PERMISSION)
        }
    }

    private fun stopUpdates() {
        if (!updatesActive) return
        fused?.removeLocationUpdates(locationCallback)
        updatesActive = false
    }

    private fun toFix(l: Location): LocationFix {
        val mock = if (Build.VERSION.SDK_INT >= 31) l.isMock else @Suppress("DEPRECATION") l.isFromMockProvider
        return LocationFix(
            lat = l.latitude,
            lng = l.longitude,
            accuracy = if (l.hasAccuracy()) l.accuracy.toDouble() else null,
            speed = if (l.hasSpeed()) l.speed.toDouble() else null,
            timestamp = l.time,
            mock = mock
        )
    }

    // ---- connectivity and location services ----

    private fun watchConnectivity() {
        val manager = getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        // For the events: the same callbacks, mapped to "online / offline + type" (ConnectivityMapper), seeded with what the OS says now.
        val snapshot = DriverLocationRuntime.deviceSnapshot(this)
        val mapper = ConnectivityMapper { online, type -> recorder?.connectivity(online, type) }
        mapper.seed(snapshot.online, snapshot.networkType)
        connectivity = mapper
        val callback = object : ConnectivityManager.NetworkCallback() {
            private var validated = false

            override fun onAvailable(network: Network) {
                Log.i(TAG, "network available: flush")
                sender?.onConnectivityRestored()
            }

            override fun onCapabilitiesChanged(network: Network, capabilities: NetworkCapabilities) {
                val now = capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
                if (now && !validated) {
                    Log.i(TAG, "network validated: flush")
                    sender?.onConnectivityRestored()
                }
                validated = now
                mapper.onCapabilities(now, DriverLocationRuntime.networkType(capabilities))
            }

            override fun onLost(network: Network) {
                validated = false
                mapper.onLost()
            }
        }
        try {
            manager.registerDefaultNetworkCallback(callback)
            networkCallback = callback
        } catch (e: RuntimeException) {
            Log.w(TAG, "connectivity callback not registered: ${e.javaClass.simpleName}")
        }
    }

    private fun watchServices() {
        val receiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context, intent: Intent) = checkServices()
        }
        val filter = IntentFilter(LocationManager.PROVIDERS_CHANGED_ACTION).apply {
            addAction(LocationManager.MODE_CHANGED_ACTION)
        }
        // Not exported: only the system sends these.
        androidx.core.content.ContextCompat.registerReceiver(this, receiver, filter, androidx.core.content.ContextCompat.RECEIVER_NOT_EXPORTED)
        providersReceiver = receiver
        lastServicesEnabled = null
        checkServices()
    }

    private fun checkServices() {
        val now = DriverLocationRuntime.servicesEnabled(this)
        val before = lastServicesEnabled
        lastServicesEnabled = now
        // For the events: the recorder compares with what it was told (it takes the first reading as the start's state).
        if (before != null) recorder?.gps(now)
        recorder?.permission(DriverLocationRuntime.permissionState(this))
        // At the start only "off" is news; later both ways are.
        if (before == null && now) return
        if (before != now) DriverLocationRuntime.emitState(if (now) "services_enabled" else "services_disabled")
        DriverLocationRuntime.checkAuthorization(this)
    }

    /**
     * The signals that only serve the events recorder, registered with the tracking and removed with it: the battery
     * saver (`ACTION_POWER_SAVE_MODE_CHANGED`) and the app's foreground / background ([AppForeground]; coming to the
     * foreground also reads the authorization again, since a revoked permission is only seen then or at a failed request).
     */
    private fun watchEventSignals() {
        val receiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context, intent: Intent) {
                recorder?.batterySaver(DriverLocationRuntime.batterySaverOn(this@DriverLocationService))
            }
        }
        androidx.core.content.ContextCompat.registerReceiver(
            this, receiver, IntentFilter(PowerManager.ACTION_POWER_SAVE_MODE_CHANGED),
            androidx.core.content.ContextCompat.RECEIVER_NOT_EXPORTED
        )
        batteryReceiver = receiver
        removeForegroundListener = AppForeground.listen { foreground ->
            recorder?.appForeground(foreground)
            if (foreground) recorder?.permission(DriverLocationRuntime.permissionState(this))
        }
    }

    // ---- the notification ----

    /** Posts (or refreshes) the foreground notification. False when the system does not let the service be foreground. */
    private fun enterForeground(config: Config?): Boolean {
        val title = config?.notification?.title ?: DEFAULT_TITLE
        val text = config?.notification?.text ?: DEFAULT_TEXT
        notificationTexts = title to text
        return try {
            ServiceCompat.startForeground(
                this,
                NOTIFICATION_ID,
                buildNotification(title, text),
                if (Build.VERSION.SDK_INT >= 29) ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION else 0
            )
            true
        } catch (e: SecurityException) {
            // The location permission is not (or no longer) granted for a foreground service.
            Log.w(TAG, "cannot enter foreground: permission")
            DriverLocationRuntime.emitState("authorization_changed")
            false
        } catch (e: RuntimeException) {
            // ForegroundServiceStartNotAllowedException (Android 12+): the app is in the background.
            Log.w(TAG, "cannot enter foreground: ${e.javaClass.simpleName}")
            false
        }
    }

    private fun buildNotification(title: String, text: String): Notification {
        val manager = getSystemService(NotificationManager::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            manager?.createNotificationChannel(
                NotificationChannel(CHANNEL_ID, title, NotificationManager.IMPORTANCE_LOW).apply {
                    description = text
                    setShowBadge(false)
                }
            )
        }
        val open = packageManager.getLaunchIntentForPackage(packageName)?.let {
            PendingIntent.getActivity(this, 0, it, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        }
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_onesignal_default)
            .setContentTitle(title)
            .setContentText(text)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
            .setContentIntent(open)
            .build()
    }

    /**
     * Sender events to the module. Runs on the worker: never blocks. One per run: what an OLD run's sender says late (the answer
     * to a request still in flight when the driver logged out) is logged but acts on nothing and reaches JavaScript as nothing
     * ([SessionLink.isCurrent]).
     */
    private class Forwarder(private val session: SessionLink) : SenderListener {
        override fun onHttp(success: Boolean, status: Int) {
            Log.i(TAG, "http $status success=$success")
            if (!session.isCurrent) return
            try {
                DriverLocationRuntime.events?.onHttp(success, status)
            } catch (_: RuntimeException) {
            }
        }

        override fun onLocationAccepted(fix: LocationFix) {
            if (BuildConfig.DEBUG) Log.i(TAG, "location accepted lat=${fix.lat} lng=${fix.lng} mock=${fix.mock}")
            else Log.i(TAG, "location accepted")
            if (!session.isCurrent) return
            try {
                DriverLocationRuntime.events?.onLocation(fix)
            } catch (_: RuntimeException) {
            }
        }

        override fun onState(kind: StateKind) {
            if (kind == StateKind.UNAUTHORIZED) {
                // A revoked session ends THIS run's events session (before JavaScript hears it and logs out), and only when
                // this run is the running one.
                if (!session.onUnauthorized()) {
                    Log.i(TAG, "state unauthorized ignored: not the running service")
                    return
                }
            } else if (!session.isCurrent) {
                return
            }
            DriverLocationRuntime.emitState(kind.wire) // writes the `state <kind>` line
        }

        /** The body (coordinates) only in a debug build; a release build writes the queue size alone. */
        override fun onRequest(body: String, queued: Int) {
            if (BuildConfig.DEBUG) Log.i(TAG, "request queued=$queued body=$body")
            else Log.i(TAG, "request queued=$queued")
        }

        override fun onRetryScheduled(delayMs: Long, status: Int?, queued: Int) {
            Log.i(TAG, "retry in $delayMs ms (${if (status == null) "network error" else "http $status"}) queued=$queued")
        }

        /** One line per discard, nothing to JavaScript. */
        override fun onDiscarded(count: Int) {
            Log.i(TAG, "discarded $count older positions")
        }

        /** The minimum send interval has not elapsed: the request goes out in [delayMs] with the newest position. */
        override fun onSendDeferred(delayMs: Long, queued: Int) {
            Log.i(TAG, "send in $delayMs ms (min interval) queued=$queued")
        }
    }

    companion object {
        /** The `tracking_started` reason JavaScript gave, carried by the start intent of that run. */
        const val EXTRA_START_REASON = "co.ordering.driverlocation.START_REASON"

        private const val TAG = "DriverLocation"
        private const val CHANNEL_ID = "driver_location"
        private const val NOTIFICATION_ID = 7301
        private const val DEFAULT_TITLE = "Background tracking enabled"
        private const val DEFAULT_TEXT = "Important for delivery real time location"
    }
}
