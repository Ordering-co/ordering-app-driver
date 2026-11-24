package co.ordering.driver.location

import java.util.UUID

/** What the platform layer reads when tracking starts, so the recorder knows the state it begins in. */
data class DeviceSnapshot(
    val appForeground: Boolean,
    val gpsOn: Boolean,
    val online: Boolean,
    /** `cellular` | `wifi` | `other` | `none`: the type in use when online, the last one seen otherwise. */
    val networkType: String,
    val batterySaver: Boolean,
    val permission: PermissionState
)

/**
 * The events recorder (docs/LOCATION_MODULE.md, "Tracking events"): turns what the platform layer detects (a switch of the
 * location services, of the connection, of the battery saver, of the app's state or authorization, a simulated fix, a start
 * or a stop of tracking) into stamped [TrackingEvent]s and hands them to [sink]. It knows no Android or iOS: the platform
 * layer maps each OS signal to one call below.
 *
 * - **Only while tracking**: from [start] (its `tracking_started` included) to [stop] (its `tracking_stopped` included).
 *   Detectors call it freely; outside a session the calls change nothing (but [appForeground] is always remembered).
 * - **Time**: `occurred_at` is the wall clock at detection; the debounce below delays the event, not its time. `duration_ms`
 *   of a closing event is measured with the monotonic clock ([Scheduler.nowMillis]) when this process saw the condition
 *   open; otherwise (the process was killed in between) from the two wall times, the opening one persisted in [store].
 * - **Debounce**: a change of the four boolean conditions (location services, connection, battery saver, app in
 *   background) is held [debounceMs] (2 s); the opposite change inside the window cancels both, so a flapping signal
 *   yields no pair. Permission, mock and tracking events are not debounced. A [stop] settles what is held first (a held
 *   change that still differs from the recorded state is emitted with its own time, before `tracking_stopped`), so every
 *   opening has its closing event and no duration is measured across a lost one. [cancel] (the recorder switched off)
 *   emits nothing: the next [start] reconciles with the device.
 * - **A stop by the system**: while a session lives, the last time the module was alive (the heartbeat) and an "active"
 *   flag are persisted; if [start] finds the flag still set (no clean stop) it first emits `tracking_stopped` with reason
 *   `system` and `occurred_at` = the heartbeat, then `tracking_started` with reason `restart`. If the session belonged to
 *   another owner (another driver, another url) none of it is ours and nothing is emitted.
 * - **At the start**: the state is not an event, but what the server cannot know is sent once: a condition that is bad and
 *   not recorded as open (location services off, no connection, battery saver on) opens at the start's time; one recorded
 *   as open that is good now closes (the duration from the persisted opening); a changed authorization is reported from the
 *   persisted one to the present. The app being in the background is remembered silently (a later `set_app_in_foreground`
 *   then has its duration).
 *
 * Every public method may be called from any thread: the work runs on the [scheduler]'s worker (the sender's worker, so
 * the events are stored in order, behind whatever was already queued).
 *
 * @param sink receives each event on the worker (the sender's `recordOnWorker`).
 * @param wallClock epoch milliseconds.
 */
class TrackingRecorder(
    private val platform: String,
    private val scheduler: Scheduler,
    private val store: RecorderStore,
    private val sink: (TrackingEvent) -> Unit,
    private val wallClock: () -> Long = System::currentTimeMillis,
    private val newUuid: () -> String = { UUID.randomUUID().toString() },
    private val debounceMs: Long = DEBOUNCE_MS,
    private val heartbeatEveryMs: Long = HEARTBEAT_EVERY_MS,
    private val onLog: (String) -> Unit = {}
) {
    private enum class Cond(val key: String, val opening: String, val closing: String) {
        GPS("gps_off", EventNames.TURN_OFF_GPS, EventNames.TURN_ON_GPS),
        OFFLINE("offline", EventNames.TURN_OFF_MOBILE_DATA, EventNames.TURN_ON_MOBILE_DATA),
        BATTERY("battery_saver", EventNames.BATTERY_SAVER_ON, EventNames.BATTERY_SAVER_OFF),
        BACKGROUND("background", EventNames.SET_APP_IN_BACKGROUND, EventNames.SET_APP_IN_FOREGROUND)
    }

    private class Pending(
        val bad: Boolean,
        val wall: Long,
        val mono: Long,
        val appForeground: Boolean,
        val extra: Map<String, Any>,
        val timer: Cancellable
    )

    // Worker only.
    private var active = false
    private var state = RecorderState()
    private var appFg = true
    private var sessionStartMono = 0L
    private val openMono = HashMap<String, Long>()
    private val pending = HashMap<Cond, Pending>()
    private var mockLastMono: Long? = null
    private var heartbeatTimer: Cancellable? = null
    private var lastHeartbeatSavedWall = 0L

    /** True between [start] and [stop] (any thread; read after the call returned and the worker ran). */
    @Volatile var isActive = false
        private set

    // ---- public API (any thread) ----

    /**
     * Tracking started. [owner] is [Config.eventsOwner]; [reason] one of [TrackingReasons] (replaced by `restart` when
     * a session of this owner was left without a stop).
     */
    fun start(owner: String, reason: String, device: DeviceSnapshot) = post { doStart(owner, reason, device) }

    /** Tracking stopped; [reason] one of [TrackingReasons]. Ignored when no session is active. */
    fun stop(reason: String) = post { doStop(reason) }

    /**
     * A session of this [owner] was left without a stop (the process died) and nobody will [start] again now (the permission
     * is gone, the driver is off shift): emits the owed `tracking_stopped` with reason [reason] (`system`, or `permission`)
     * at the heartbeat's time, then the authorization change if [permission] differs from the persisted one. Nothing when
     * there is no such session.
     */
    fun closeOrphan(owner: String, reason: String, permission: PermissionState?) = post { doCloseOrphan(owner, reason, permission) }

    /**
     * The recorder is switched off while a session lives (the project turned `driver_tracking_events_enabled` off): the
     * session ends WITHOUT an event and without leaving the "active" flag, so a later start does not report a stop by the
     * system. [start] begins a new one when it is switched on again.
     */
    fun cancel() = post { doCancel() }

    /** The app came to the foreground (true) or left it (false). Always remembered; an event only while tracking. */
    fun appForeground(foreground: Boolean) = post {
        appFg = foreground
        if (active) desire(Cond.BACKGROUND, bad = !foreground)
    }

    /** The location services were switched on / off. */
    fun gps(on: Boolean) = post { if (active) desire(Cond.GPS, bad = !on) }

    /**
     * The connection came back ([online], [networkType] the one in use) or was lost ([networkType] the one lost):
     * `cellular` | `wifi` | `other` | `none`.
     */
    fun connectivity(online: Boolean, networkType: String) = post {
        if (active) desire(Cond.OFFLINE, bad = !online, extra = mapOf("network_type" to networkType))
    }

    fun batterySaver(on: Boolean) = post { if (active) desire(Cond.BATTERY, bad = on) }

    /** The app's authorization or precision is [permission] now; an event only when it differs from the last one seen. */
    fun permission(permission: PermissionState) = post { if (active) doPermission(permission, wallClock()) }

    /** The OS marked a fix as simulated; at most one event per session and per [MOCK_MIN_GAP_MS]. */
    fun mock(provider: String?) = post { if (active) doMock(provider) }

    /** The module is alive (a fix arrived): refreshes the heartbeat, written to disk at most every [HEARTBEAT_SAVE_MS]. */
    fun heartbeat() = post { if (active) doHeartbeat(force = false) }

    // ---- worker side ----

    private fun post(task: () -> Unit) {
        scheduler.execute {
            try {
                task()
            } catch (e: RuntimeException) {
                // never kill the worker; the class name only (no message: it could hold a value)
                onLog("recorder error: ${e.javaClass.simpleName}")
            }
        }
    }

    private fun doStart(owner: String, reason: String, device: DeviceSnapshot) {
        if (active) return // a second start while running changes nothing
        val wall = wallClock()
        val mono = scheduler.nowMillis()
        var saved = store.load()
        if (saved.owner != owner) {
            saved = RecorderState(owner = owner) // nothing of another driver's session is ours
            openMono.clear()
        }
        state = saved
        appFg = device.appForeground
        var startReason = TrackingReasons.startReason(reason)
        if (state.active) {
            // The last session never ended cleanly: the process was killed or the service destroyed. It stopped when it was
            // last alive.
            val last = state.heartbeatWall ?: state.sessionStartWall ?: wall
            val ran = state.sessionStartWall?.let { maxOf(0L, last - it) }
            emit(EventNames.TRACKING_STOPPED, minOf(last, wall), ran, mapOf("reason" to TrackingReasons.SYSTEM), appFg)
            onLog("tracking stopped by the system (no clean stop)")
            startReason = TrackingReasons.RESTART
        }
        state = state.copy(active = true, sessionStartWall = wall, heartbeatWall = wall)
        active = true
        isActive = true
        sessionStartMono = mono
        mockLastMono = null
        lastHeartbeatSavedWall = wall
        persist()
        emit(EventNames.TRACKING_STARTED, wall, null, mapOf("reason" to startReason), appFg)

        reconcile(Cond.GPS, bad = !device.gpsOn, wall, mono, emptyMap())
        reconcile(Cond.OFFLINE, bad = !device.online, wall, mono, mapOf("network_type" to device.networkType))
        reconcile(Cond.BATTERY, bad = device.batterySaver, wall, mono, emptyMap())
        reconcileBackground(!device.appForeground, wall, mono)
        doPermission(device.permission, wall)
        persist()
        scheduleHeartbeat()
    }

    private fun doStop(reason: String) {
        if (!active) return
        val wall = wallClock()
        val mono = scheduler.nowMillis()
        // What is still held is settled first: dropping it would lose the opening or the closing of a pair and every later
        // duration would be measured across the lost event.
        settlePending()
        heartbeatTimer?.cancel()
        heartbeatTimer = null
        emit(EventNames.TRACKING_STOPPED, wall, maxOf(0L, mono - sessionStartMono), mapOf("reason" to TrackingReasons.stopReason(reason)), appFg)
        // The event is in the queue before the flag says "stopped cleanly".
        active = false
        isActive = false
        state = state.copy(active = false, heartbeatWall = wall)
        persist()
    }

    private fun doCancel() {
        if (!active) return
        for (p in pending.values) p.timer.cancel()
        pending.clear()
        heartbeatTimer?.cancel()
        heartbeatTimer = null
        active = false
        isActive = false
        state = state.copy(active = false)
        persist()
    }

    private fun doCloseOrphan(owner: String, reason: String, permission: PermissionState?) {
        if (active) return
        val saved = store.load()
        if (saved.owner != owner || !saved.active) return
        val wall = wallClock()
        val last = minOf(saved.heartbeatWall ?: saved.sessionStartWall ?: wall, wall)
        val ran = saved.sessionStartWall?.let { maxOf(0L, last - it) }
        state = saved
        emit(EventNames.TRACKING_STOPPED, last, ran, mapOf("reason" to TrackingReasons.stopReason(reason)), appFg)
        onLog("tracking stopped by the system (no clean stop), reported without a restart")
        state = state.copy(active = false)
        if (permission != null) doPermission(permission, wall, force = true)
        persist()
    }

    private fun doPermission(now: PermissionState, wall: Long, force: Boolean = false) {
        val before = state.permission
        state = state.copy(permission = now)
        if (before == null || before == now) {
            if (before != now) persist()
            return
        }
        if (!active && !force) return
        emit(
            EventNames.LOCATION_PERMISSION_CHANGED, wall, null,
            linkedMapOf("from" to before.authorization, "to" to now.authorization, "precise_from" to before.precise, "precise_to" to now.precise),
            appFg
        )
        persist()
    }

    private fun doMock(provider: String?) {
        val mono = scheduler.nowMillis()
        val last = mockLastMono
        if (last != null && mono - last < MOCK_MIN_GAP_MS) return
        mockLastMono = mono
        emit(EventNames.MOCK_LOCATION_DETECTED, wallClock(), null, if (provider.isNullOrEmpty()) emptyMap() else mapOf("provider" to provider), appFg)
    }

    private fun doHeartbeat(force: Boolean) {
        val wall = wallClock()
        state = state.copy(heartbeatWall = wall)
        if (force || wall - lastHeartbeatSavedWall >= HEARTBEAT_SAVE_MS || wall < lastHeartbeatSavedWall) {
            lastHeartbeatSavedWall = wall
            persist()
        }
    }

    private fun scheduleHeartbeat() {
        heartbeatTimer?.cancel()
        heartbeatTimer = scheduler.schedule(heartbeatEveryMs) {
            heartbeatTimer = null
            if (active) {
                try {
                    doHeartbeat(force = true)
                    scheduleHeartbeat()
                } catch (_: RuntimeException) {
                }
            }
        }
    }

    // ---- conditions ----

    /** The condition now reads [bad] (when [pending] holds the same, nothing changes; the opposite of the emitted state starts the wait). */
    private fun desire(c: Cond, bad: Boolean, extra: Map<String, Any> = emptyMap()) {
        val isOpen = state.open.containsKey(c.key)
        val waiting = pending[c]
        if (bad == isOpen) {
            // Back to what the server was told: whatever was waiting was a flap, no pair.
            if (waiting != null) {
                waiting.timer.cancel()
                pending.remove(c)
            }
            return
        }
        if (waiting != null && waiting.bad == bad) return
        waiting?.timer?.cancel()
        val timer = scheduler.schedule(debounceMs) { fire(c) }
        pending[c] = Pending(bad, wallClock(), scheduler.nowMillis(), if (c == Cond.BACKGROUND) !bad else appFg, extra, timer)
    }

    /**
     * The end of a session settles every held change: one whose condition still differs from the last recorded state is
     * emitted now with its own detection time and monotonic mark (oldest first, then in the order of [Cond], so the queue keeps
     * the order of the times); one that went back to the recorded state was cancelled by [desire] already (a flap: no pair).
     */
    private fun settlePending() {
        val held = pending.entries.sortedWith(compareBy({ it.value.wall }, { it.key.ordinal })).map { it.key to it.value }
        pending.clear()
        for ((c, p) in held) {
            p.timer.cancel()
            if (p.bad != state.open.containsKey(c.key)) transition(c, p.bad, p.wall, p.mono, p.extra, p.appForeground)
        }
    }

    private fun fire(c: Cond) {
        try {
            val p = pending.remove(c) ?: return
            if (!active) return
            transition(c, p.bad, p.wall, p.mono, p.extra, p.appForeground)
        } catch (_: RuntimeException) {
        }
    }

    private fun transition(c: Cond, bad: Boolean, wall: Long, mono: Long, extra: Map<String, Any>, appForeground: Boolean) {
        val duration: Long?
        if (bad) {
            duration = null
            state = state.copy(open = state.open + (c.key to wall))
            openMono[c.key] = mono
        } else {
            // The monotonic clock when this process saw it open; else the two wall times (the opening one persisted).
            duration = openMono.remove(c.key)?.let { maxOf(0L, mono - it) }
                ?: state.open[c.key]?.let { maxOf(0L, wall - it) }
            state = state.copy(open = state.open - c.key)
        }
        persist()
        emit(if (bad) c.opening else c.closing, wall, duration, extra, appForeground)
    }

    private fun reconcile(c: Cond, bad: Boolean, wall: Long, mono: Long, extra: Map<String, Any>) {
        val isOpen = state.open.containsKey(c.key)
        if (bad != isOpen) transition(c, bad, wall, mono, extra, appFg)
    }

    private fun reconcileBackground(background: Boolean, wall: Long, mono: Long) {
        val isOpen = state.open.containsKey(Cond.BACKGROUND.key)
        if (!background && isOpen) {
            transition(Cond.BACKGROUND, false, wall, mono, emptyMap(), true)
        } else if (background && !isOpen) {
            // Started in the background: no event (the state at the start is not one), but remembered so that the
            // `set_app_in_foreground` that follows has its duration.
            state = state.copy(open = state.open + (Cond.BACKGROUND.key to wall))
            openMono[Cond.BACKGROUND.key] = mono
        }
    }

    // ---- output ----

    private fun emit(name: String, wall: Long, duration: Long?, extra: Map<String, Any>, appForeground: Boolean) {
        val data = LinkedHashMap<String, Any>()
        data["platform"] = platform
        data["app_state"] = if (appForeground) "foreground" else "background"
        data.putAll(extra)
        sink(TrackingEvent(newUuid(), name, wall, duration, data))
    }

    private fun persist() {
        store.save(state)
    }

    companion object {
        /** A change that is undone inside this window yields no event (contract: debounced 2 s). */
        const val DEBOUNCE_MS = 2_000L

        /** The module's life sign is refreshed at least this often while a session lives. */
        const val HEARTBEAT_EVERY_MS = 60_000L

        /** The heartbeat of a fix is written to disk at most this often. */
        const val HEARTBEAT_SAVE_MS = 15_000L

        /** `mock_location_detected` at most once per this (and once per session at least). */
        const val MOCK_MIN_GAP_MS = 600_000L
    }
}
