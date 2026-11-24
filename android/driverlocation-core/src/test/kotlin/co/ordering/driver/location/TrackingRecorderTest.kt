package co.ordering.driver.location

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** The recorder on a virtual monotonic clock and a wall clock the test moves by hand. */
class TrackingRecorderTest {
    companion object {
        const val OWNER = "http://localhost:8080/users/7/locations\nhttp://localhost:8080/tracking_events"
        const val T0 = 1_795_046_400_000L // 2026-11-19 00:00:00 UTC
        val ALWAYS = PermissionState("always", true)
    }

    /** One "process": a scheduler (monotonic clock starts over), the wall clock, the sink. The store outlives it. */
    private class Rig(val store: RecorderStore, wall: Long, platform: String = "android", debounce: Long = 2000) {
        val sched = ManualScheduler()
        private var offset = wall - sched.nowMillis()
        val out = ArrayList<TrackingEvent>()
        private var n = 0
        val rec = TrackingRecorder(platform, sched, store, { out += it }, wallClock = { sched.nowMillis() + offset },
            newUuid = { "uuid-${++n}" }, debounceMs = debounce)
        val wall: Long get() = sched.nowMillis() + offset

        /** The wall clock jumps (the process was dead, or the user changed the time). */
        fun jumpWall(ms: Long) { offset += ms }
        fun run() = sched.runPending()
        fun advance(ms: Long) = sched.advance(ms)
        fun names() = out.map { it.event }
        fun of(name: String) = out.filter { it.event == name }
        fun clear() = out.clear()
    }

    private fun device(
        fg: Boolean = true, gps: Boolean = true, online: Boolean = true, type: String = "wifi",
        saver: Boolean = false, permission: PermissionState = ALWAYS
    ) = DeviceSnapshot(fg, gps, online, type, saver, permission)

    private fun rig(store: RecorderStore = MemoryRecorderStore(), wall: Long = T0) = Rig(store, wall)

    private fun Rig.started(reason: String = "available", d: DeviceSnapshot = device()): Rig {
        rec.start(OWNER, reason, d); run(); clear(); return this
    }

    private fun at(ms: Long) = T0 + ms

    // ---- started / stopped ----

    @Test fun startEmitsTrackingStartedWithTheReasonAndTheCommonData() {
        val r = rig()
        r.rec.start(OWNER, "login", device())
        r.run()
        val e = r.out.single()
        assertEquals("tracking_started", e.event)
        assertEquals(T0, e.occurredAtMs)
        assertNull(e.durationMs)
        assertEquals(listOf("platform" to "android", "app_state" to "foreground", "reason" to "login"), e.data.toList())
        assertEquals("uuid-1", e.uuid)
        assertTrue(r.rec.isActive)
    }

    @Test fun anUnknownStartReasonIsAvailable() {
        val r = rig()
        r.rec.start(OWNER, "whatever", device()); r.run()
        assertEquals("available", r.out.single().data["reason"])
    }

    @Test fun stopEmitsTrackingStoppedWithTheMonotonicDuration() {
        val r = rig().started()
        r.advance(90_000)
        r.jumpWall(5_000) // the wall clock moved too: the duration is the monotonic one
        r.rec.stop("unavailable"); r.run()
        val e = r.out.single()
        assertEquals("tracking_stopped", e.event)
        assertEquals(90_000L, e.durationMs)
        assertEquals("unavailable", e.data["reason"])
        assertEquals(T0 + 95_000, e.occurredAtMs)
        assertTrue(!r.rec.isActive)
    }

    @Test fun anUnknownOrMissingStopReasonIsUnknown() {
        val r = rig().started()
        r.rec.stop("nope"); r.run()
        assertEquals("unknown", r.out.single().data["reason"])
    }

    @Test fun nothingIsRecordedBeforeTheStartOrAfterTheStop() {
        val r = rig()
        r.rec.gps(false); r.rec.connectivity(false, "wifi"); r.rec.batterySaver(true); r.rec.mock("fused")
        r.rec.permission(PermissionState("denied", false)); r.rec.appForeground(false)
        r.advance(10_000)
        assertEquals(emptyList<String>(), r.names())
        r.rec.start(OWNER, "available", device(fg = false)); r.run(); r.clear()
        r.rec.stop("logout"); r.run(); r.clear()
        r.rec.gps(false); r.rec.connectivity(false, "wifi"); r.rec.batterySaver(true); r.rec.mock("fused")
        r.rec.appForeground(true); r.rec.stop("logout")
        r.advance(10_000)
        assertEquals(emptyList<String>(), r.names())
    }

    @Test fun aSecondStartWhileRunningAndAStopWhenIdleChangeNothing() {
        val r = rig()
        r.rec.start(OWNER, "available", device()); r.rec.start(OWNER, "login", device()); r.run()
        assertEquals(listOf("tracking_started"), r.names())
        r.clear()
        val idle = rig()
        idle.rec.stop("logout"); idle.run()
        assertEquals(emptyList<String>(), idle.names())
    }

    @Test fun theDataSaysBackgroundWhenTheAppIsInTheBackground() {
        val r = rig()
        r.rec.start(OWNER, "available", device(fg = false)); r.run()
        assertEquals("background", r.out.single().data["app_state"])
    }

    @Test fun theIosPlatformIsWrittenAsIs() {
        val r = Rig(MemoryRecorderStore(), T0, platform = "ios")
        r.rec.start(OWNER, "available", device()); r.run()
        assertEquals("ios", r.out.single().data["platform"])
    }

    // ---- the conditions: time, duration, debounce ----

    @Test fun gpsOffAndOnAreStampedWhenDetectedAndTheDurationIsMonotonic() {
        val r = rig().started()
        r.advance(10_000)
        r.rec.gps(false); r.run()
        assertEquals("held for the debounce", emptyList<String>(), r.names())
        r.advance(2_000)
        val off = r.out.single()
        assertEquals("turn_off_gps", off.event)
        assertEquals("detection time, not the debounce's end", T0 + 10_000, off.occurredAtMs)
        assertNull(off.durationMs)
        r.clear()
        r.advance(180_000)
        r.rec.gps(true); r.run()
        r.jumpWall(60_000) // a wall clock correction while it waits does not change the duration
        r.advance(2_000)
        val on = r.out.single()
        assertEquals("turn_on_gps", on.event)
        assertEquals(T0 + 192_000, on.occurredAtMs)
        assertEquals("from the opening's detection to the closing's", 182_000L, on.durationMs)
    }

    @Test fun aFlapInsideTheDebounceYieldsNoPair() {
        val r = rig().started()
        r.rec.gps(false); r.run()
        r.advance(1_900)
        r.rec.gps(true); r.run()
        r.advance(10_000)
        assertEquals(emptyList<String>(), r.names())
        // and the same for the closing side: off for good, then on and off again inside 2 s
        r.rec.gps(false); r.run(); r.advance(2_000)
        assertEquals(listOf("turn_off_gps"), r.names())
        r.clear()
        r.rec.gps(true); r.run(); r.advance(500)
        r.rec.gps(false); r.run(); r.advance(10_000)
        assertEquals("still off, no turn_on_gps", emptyList<String>(), r.names())
        r.rec.gps(true); r.run(); r.advance(2_000)
        assertEquals(listOf("turn_on_gps"), r.names())
    }

    @Test fun repeatedReadingsOfTheSameStateAreNoChange() {
        val r = rig().started()
        r.rec.gps(true); r.rec.connectivity(true, "wifi"); r.rec.batterySaver(false); r.rec.appForeground(true)
        r.advance(10_000)
        assertEquals(emptyList<String>(), r.names())
        r.rec.gps(false); r.rec.gps(false); r.rec.gps(false); r.run(); r.advance(5_000)
        assertEquals(listOf("turn_off_gps"), r.names())
    }

    @Test fun connectivityLostAndRestoredCarryTheNetworkType() {
        val r = rig().started(d = device(type = "wifi"))
        r.advance(1_000)
        r.rec.connectivity(false, "wifi"); r.run(); r.advance(2_000)
        val off = r.out.single()
        assertEquals("turn_off_mobile_data", off.event)
        assertEquals("wifi", off.data["network_type"])
        assertEquals(T0 + 1_000, off.occurredAtMs)
        r.clear()
        r.advance(60_000)
        r.rec.connectivity(true, "cellular"); r.run(); r.advance(2_000)
        val on = r.out.single()
        assertEquals("turn_on_mobile_data", on.event)
        assertEquals("cellular", on.data["network_type"])
        assertEquals(62_000L, on.durationMs)
        assertEquals(listOf("platform", "app_state", "network_type"), on.data.keys.toList())
    }

    @Test fun wifiToCellularInsideTheDebounceIsNotAnOutage() {
        val r = rig().started()
        r.rec.connectivity(false, "wifi"); r.run()
        r.advance(300)
        r.rec.connectivity(true, "cellular"); r.run()
        r.advance(10_000)
        assertEquals(emptyList<String>(), r.names())
    }

    @Test fun batterySaverOnAndOff() {
        val r = rig().started()
        r.rec.batterySaver(true); r.run(); r.advance(2_000)
        assertEquals(listOf("battery_saver_on"), r.names())
        r.clear()
        r.advance(30_000)
        r.rec.batterySaver(false); r.run(); r.advance(2_000)
        val off = r.out.single()
        assertEquals("battery_saver_off", off.event)
        assertEquals(32_000L, off.durationMs)
    }

    @Test fun backgroundAndForegroundAndTheAppStateOfTheOtherEvents() {
        val r = rig().started()
        r.rec.appForeground(false); r.run(); r.advance(2_000)
        val bg = r.out.single()
        assertEquals("set_app_in_background", bg.event)
        assertEquals("background", bg.data["app_state"])
        r.clear()
        r.advance(8_000)
        r.rec.gps(false); r.run(); r.advance(2_000)
        assertEquals("a gps event while in the background says so", "background", r.out.single().data["app_state"])
        r.clear()
        r.advance(20_000)
        r.rec.appForeground(true); r.run(); r.advance(2_000)
        val fg = r.out.single()
        assertEquals("set_app_in_foreground", fg.event)
        assertEquals("foreground", fg.data["app_state"])
        assertEquals(32_000L, fg.durationMs)
    }

    @Test fun aQuickBackgroundTripLikeARotationYieldsNothing() {
        val r = rig().started()
        r.rec.appForeground(false); r.run(); r.advance(700)
        r.rec.appForeground(true); r.run(); r.advance(10_000)
        assertEquals(emptyList<String>(), r.names())
    }

    @Test fun aHeldChangeIsEmittedBeforeTheStopWithItsOwnTime() {
        val r = rig().started()
        r.rec.gps(false); r.run(); r.advance(500)
        r.rec.stop("logout"); r.run(); r.advance(10_000)
        assertEquals(listOf("turn_off_gps", "tracking_stopped"), r.names())
        assertEquals("the time of the detection, not of the stop", T0, r.out[0].occurredAtMs)
        assertEquals(T0 + 500, r.out[1].occurredAtMs)
    }

    @Test fun aForegroundHeldAtTheStopIsEmittedBeforeItAndTheNextPairHasItsRealDuration() {
        val r = rig().started()
        r.rec.appForeground(false); r.run(); r.advance(2_000)
        assertEquals(listOf("set_app_in_background"), r.names())
        r.clear()
        r.advance(5_000)
        r.rec.appForeground(true); r.run(); r.advance(1_000) // held; tracking stops inside the hold
        r.rec.stop("permission"); r.run()
        assertEquals(listOf("set_app_in_foreground", "tracking_stopped"), r.names())
        val fg = r.out[0]
        assertEquals(T0 + 7_000, fg.occurredAtMs)
        assertEquals(7_000L, fg.durationMs)
        assertEquals("foreground", fg.data["app_state"])
        assertEquals("permission", r.out[1].data["reason"])

        // Tracking resumes: the pair of the next trip is measured from its own opening, never across the lost event.
        r.clear()
        r.rec.start(OWNER, "permission", device()); r.run()
        assertEquals(listOf("tracking_started"), r.names())
        r.clear()
        r.rec.appForeground(false); r.run(); r.advance(2_000)
        r.advance(4_000)
        r.rec.appForeground(true); r.run(); r.advance(2_000)
        assertEquals(listOf("set_app_in_background", "set_app_in_foreground"), r.names())
        assertEquals(6_000L, r.out[1].durationMs)
    }

    @Test fun aBackgroundThenAForegroundThenAStopInsideTheHoldKeepsTheLongDuration() {
        val r = rig().started()
        r.rec.appForeground(false); r.run(); r.advance(2_000); r.advance(58_000)
        r.clear()
        r.rec.appForeground(true); r.run(); r.advance(1_500)
        r.rec.stop("unavailable"); r.run()
        assertEquals(listOf("set_app_in_foreground", "tracking_stopped"), r.names())
        assertEquals(60_000L, r.out[0].durationMs)
        assertTrue("the session is over", !r.rec.isActive)
    }

    @Test fun everyHeldFamilyIsSettledAtTheStopOldestFirstEachWithItsOwnTime() {
        val r = rig().started()
        r.rec.gps(false); r.run(); r.advance(300)
        r.rec.connectivity(false, "cellular"); r.run(); r.advance(300)
        r.rec.batterySaver(true); r.run(); r.advance(300)
        r.rec.appForeground(false); r.run(); r.advance(300)
        r.rec.stop("logout"); r.run()
        assertEquals(
            listOf("turn_off_gps", "turn_off_mobile_data", "battery_saver_on", "set_app_in_background", "tracking_stopped"),
            r.names()
        )
        assertEquals(listOf(T0, T0 + 300, T0 + 600, T0 + 900, T0 + 1_200), r.out.map { it.occurredAtMs })
        assertEquals("cellular", r.out[1].data["network_type"])
        assertEquals("the event says where the app was when it happened", "background", r.out[3].data["app_state"])
        assertEquals("foreground", r.out[0].data["app_state"])
    }

    @Test fun theClosingOfEveryFamilyHeldAtTheStopIsEmittedWithItsDuration() {
        val r = rig().started()
        r.rec.gps(false); r.rec.connectivity(false, "wifi"); r.rec.batterySaver(true); r.run(); r.advance(2_000)
        r.advance(10_000)
        r.clear()
        r.rec.gps(true); r.rec.connectivity(true, "cellular"); r.rec.batterySaver(false); r.run(); r.advance(1_000)
        r.rec.stop("permission"); r.run()
        assertEquals(listOf("turn_on_gps", "turn_on_mobile_data", "battery_saver_off", "tracking_stopped"), r.names())
        assertEquals(listOf(12_000L, 12_000L, 12_000L), r.out.take(3).map { it.durationMs })
        assertEquals("cellular", r.out[1].data["network_type"])
    }

    @Test fun aFlapInsideTheHoldThenAStopLeavesNoPairAndNoLostDuration() {
        val r = rig().started()
        r.rec.appForeground(false); r.run(); r.advance(500)
        r.rec.appForeground(true); r.run(); r.advance(300) // back to what the server was told: no pair
        r.rec.gps(false); r.run(); r.advance(200)
        r.rec.gps(true); r.run(); r.advance(200)
        r.rec.stop("permission"); r.run()
        assertEquals(listOf("tracking_stopped"), r.names())
        r.clear()
        r.rec.start(OWNER, "permission", device()); r.run(); r.clear()
        r.rec.appForeground(false); r.run(); r.advance(2_000); r.advance(3_000)
        r.rec.appForeground(true); r.run(); r.advance(2_000)
        assertEquals(listOf("set_app_in_background", "set_app_in_foreground"), r.names())
        assertEquals(5_000L, r.out[1].durationMs)
    }

    @Test fun aStartRightAfterAStopThatSettledAChangeClosesItWithTheRealDuration() {
        val r = rig().started()
        r.rec.gps(false); r.run(); r.advance(500)
        r.rec.stop("permission"); r.run(); r.advance(1_500)
        r.rec.start(OWNER, "permission", device(gps = true)); r.run()
        assertEquals(listOf("turn_off_gps", "tracking_stopped", "tracking_started", "turn_on_gps"), r.names())
        assertEquals(2_000L, r.out[3].durationMs)
    }

    // ---- across a restart ----

    @Test fun theDurationAfterARestartIsTheDifferenceOfTheTwoWallTimes() {
        val store = MemoryRecorderStore()
        val first = rig(store).started()
        first.advance(5_000)
        first.rec.gps(false); first.run(); first.advance(2_000)
        assertEquals(listOf("turn_off_gps"), first.names())
        assertEquals(mapOf("gps_off" to T0 + 5_000), store.state.open)

        // The process died. 10 minutes later a new one starts with the location services on again.
        val second = Rig(store, T0 + 600_000)
        second.rec.start(OWNER, "login", device(gps = true)); second.run()
        assertEquals(listOf("tracking_stopped", "tracking_started", "turn_on_gps"), second.names())
        val on = second.of("turn_on_gps").single()
        assertEquals("occurred at the start's time", T0 + 600_000, on.occurredAtMs)
        assertEquals(595_000L, on.durationMs)
    }

    @Test fun theDurationAfterACleanStopAndARestartIsAlsoFromTheWallTimes() {
        val store = MemoryRecorderStore()
        val first = rig(store).started(d = device(online = true))
        first.rec.connectivity(false, "cellular"); first.run(); first.advance(2_000)
        first.rec.stop("logout"); first.run()
        val second = Rig(store, T0 + 120_000)
        second.rec.start(OWNER, "login", device(online = true, type = "wifi")); second.run()
        assertEquals(listOf("tracking_started", "turn_on_mobile_data"), second.names())
        assertEquals(120_000L, second.of("turn_on_mobile_data").single().durationMs)
        assertEquals("wifi", second.of("turn_on_mobile_data").single().data["network_type"])
    }

    @Test fun aStopAndStartInTheSameProcessUsesTheMonotonicClock() {
        val store = MemoryRecorderStore()
        val r = rig(store).started()
        r.rec.gps(false); r.run(); r.advance(2_000); r.clear()
        r.rec.stop("unavailable"); r.run(); r.clear()
        r.advance(40_000)
        r.jumpWall(7_000)
        r.rec.start(OWNER, "available", device(gps = true)); r.run()
        assertEquals(42_000L, r.of("turn_on_gps").single().durationMs) // from the opening (t=0) to the start, monotonic
    }

    // ---- the system stop ----

    @Test fun anActiveFlagWithNoCleanStopMeansTheSystemStoppedItAtTheHeartbeat() {
        val store = MemoryRecorderStore()
        val first = rig(store).started()
        first.advance(30_000)
        first.rec.heartbeat(); first.run()
        first.advance(20_000)
        first.rec.heartbeat(); first.run() // written (>= 15 s since the last write)
        assertEquals(T0 + 50_000, store.state.heartbeatWall)

        val second = Rig(store, T0 + 900_000)
        second.rec.start(OWNER, "login", device()); second.run()
        assertEquals(listOf("tracking_stopped", "tracking_started"), second.names())
        val stopped = second.out[0]
        assertEquals("system", stopped.data["reason"])
        assertEquals("the last time the module was alive", T0 + 50_000, stopped.occurredAtMs)
        assertEquals("how long the session tracked", 50_000L, stopped.durationMs)
        val started = second.out[1]
        assertEquals("restart", started.data["reason"])
        assertEquals(T0 + 900_000, started.occurredAtMs)
    }

    @Test fun aCleanStopLeavesNoOwedSystemStop() {
        val store = MemoryRecorderStore()
        val first = rig(store).started()
        first.rec.stop("unavailable"); first.run()
        assertTrue(!store.state.active)
        val second = Rig(store, T0 + 900_000)
        second.rec.start(OWNER, "available", device()); second.run()
        assertEquals(listOf("tracking_started"), second.names())
        assertEquals("available", second.out[0].data["reason"])
    }

    @Test fun anotherDriversSessionIsNotOursToReport() {
        val store = MemoryRecorderStore()
        val first = rig(store).started()
        first.rec.gps(false); first.run(); first.advance(2_000)
        val second = Rig(store, T0 + 900_000)
        second.rec.start("http://localhost:8080/users/99/locations\nhttp://localhost:8080/tracking_events", "login", device(gps = true)); second.run()
        assertEquals("no system stop, no turn_on_gps from the other driver", listOf("tracking_started"), second.names())
        assertEquals(emptyMap<String, Long>(), store.state.open)
    }

    @Test fun theHeartbeatIsWrittenAtMostEvery15SecondsAndEveryMinuteByTheTimer() {
        class CountingStore : RecorderStore {
            var saves = 0
            var state = RecorderState()
            override fun load() = state
            override fun save(state: RecorderState) { saves++; this.state = state }
        }
        val store = CountingStore()
        val r = rig(store).started()
        val base = store.saves
        for (i in 1..10) { r.advance(1_000); r.rec.heartbeat(); r.run() }
        assertEquals("ten fixes inside 15 s write nothing", base, store.saves)
        r.advance(6_000); r.rec.heartbeat(); r.run()
        assertEquals("one write after 15 s", base + 1, store.saves)
        assertEquals(T0 + 16_000, store.state.heartbeatWall)
        // the timer: no fix at all for a while, the heartbeat still advances
        r.advance(60_000)
        assertTrue(store.state.heartbeatWall!! >= T0 + 60_000)
        r.advance(60_000)
        assertTrue(store.state.heartbeatWall!! >= T0 + 120_000)
    }

    @Test fun cancelEndsTheSessionWithoutAnEventAndWithoutAnOwedSystemStop() {
        val store = MemoryRecorderStore()
        val r = rig(store).started()
        r.rec.gps(false); r.run(); r.advance(500)
        r.rec.cancel(); r.run(); r.advance(10_000)
        assertEquals(emptyList<String>(), r.names())
        assertTrue(!store.state.active && !r.rec.isActive)
        val next = Rig(store, T0 + 100_000)
        next.rec.start(OWNER, "available", device()); next.run()
        assertEquals(listOf("tracking_started"), next.names())
        assertEquals("available", next.out[0].data["reason"])
    }

    // ---- what is true at the start ----

    @Test fun batterySaverAlreadyOnAtTheStartIsReportedOnceAtTheStartsTime() {
        val r = rig()
        r.rec.start(OWNER, "available", device(saver = true)); r.run()
        assertEquals(listOf("tracking_started", "battery_saver_on"), r.names())
        assertEquals(T0, r.out[1].occurredAtMs)
        // already recorded as on: a later start while still on says nothing more
        r.rec.stop("logout"); r.run(); r.clear()
        r.advance(60_000)
        r.rec.start(OWNER, "available", device(saver = true)); r.run()
        assertEquals(listOf("tracking_started"), r.names())
    }

    @Test fun locationServicesOffAndNoConnectionAtTheStartAreReportedOnce() {
        val r = rig()
        r.rec.start(OWNER, "available", device(gps = false, online = false, type = "none")); r.run()
        assertEquals(listOf("tracking_started", "turn_off_gps", "turn_off_mobile_data"), r.names())
        assertEquals("none", r.of("turn_off_mobile_data").single().data["network_type"])
    }

    @Test fun startedInTheBackgroundIsNotAnEventButItsForegroundHasADuration() {
        val r = rig()
        r.rec.start(OWNER, "available", device(fg = false)); r.run()
        assertEquals(listOf("tracking_started"), r.names())
        r.clear()
        r.advance(25_000)
        r.rec.appForeground(true); r.run(); r.advance(2_000)
        val fg = r.out.single()
        assertEquals("set_app_in_foreground", fg.event)
        assertEquals(25_000L, fg.durationMs)
    }

    // ---- permission ----

    @Test fun aChangedAuthorizationIsReportedFromTheLastOneSeen() {
        val store = MemoryRecorderStore()
        val first = rig(store).started()
        first.rec.permission(PermissionState("while_in_use", true)); first.run()
        val e = first.out.single()
        assertEquals("location_permission_changed", e.event)
        assertEquals(
            listOf("platform", "app_state", "from", "to", "precise_from", "precise_to"), e.data.keys.toList()
        )
        assertEquals("always", e.data["from"]); assertEquals("while_in_use", e.data["to"])
        assertEquals(true, e.data["precise_from"]); assertEquals(true, e.data["precise_to"])
        first.clear()
        first.rec.permission(PermissionState("while_in_use", true)); first.run()
        assertEquals("the same again is no change", emptyList<String>(), first.names())
        first.rec.permission(PermissionState("while_in_use", false)); first.run()
        val precision = first.out.single()
        assertEquals("while_in_use", precision.data["from"]); assertEquals("while_in_use", precision.data["to"])
        assertEquals(true, precision.data["precise_from"]); assertEquals(false, precision.data["precise_to"])
    }

    @Test fun fromAlwaysToWhileInUseTrackingKeepsRunningAndOnlyThePermissionEventIsRecorded() {
        val r = rig().started()
        r.rec.permission(PermissionState("while_in_use", true)); r.run(); r.advance(10_000)
        assertEquals(listOf("location_permission_changed"), r.names())
        assertTrue("the recorder session goes on", r.rec.isActive)
        r.rec.gps(false); r.run(); r.advance(2_000)
        assertEquals("events still recorded with while in use", listOf("location_permission_changed", "turn_off_gps"), r.names())
    }

    @Test fun fromWhileInUseToDeniedThePermissionEventThenTheStopForThePermission() {
        val r = rig().started(d = device(permission = PermissionState("while_in_use", true)))
        r.rec.permission(PermissionState("denied", false)); r.run()
        r.rec.stop("permission"); r.run()
        assertEquals(listOf("location_permission_changed", "tracking_stopped"), r.names())
        assertEquals("while_in_use", r.out[0].data["from"]); assertEquals("denied", r.out[0].data["to"])
        assertEquals("permission", r.out[1].data["reason"])
        assertTrue(!r.rec.isActive)
    }

    @Test fun aStartWithWhileInUseIsAStartLikeAnyOtherAndReportsTheChangeFromTheLastAuthorization() {
        val fresh = rig()
        fresh.rec.start(OWNER, "login", device(permission = PermissionState("while_in_use", true))); fresh.run()
        assertEquals(listOf("tracking_started"), fresh.names()) // the first authorization seen is a baseline
        assertTrue(fresh.rec.isActive)

        val store = MemoryRecorderStore()
        val first = rig(store).started()
        first.rec.stop("permission"); first.run()
        val again = Rig(store, T0 + 60_000)
        again.rec.start(OWNER, "permission", device(permission = PermissionState("while_in_use", true))); again.run()
        assertEquals(listOf("tracking_started", "location_permission_changed"), again.names())
        assertEquals("permission", again.out[0].data["reason"])
        assertEquals("always", again.out[1].data["from"]); assertEquals("while_in_use", again.out[1].data["to"])
    }

    @Test fun aStartAfterAPermissionStopSaysPermissionAndAnOrphanedSessionStillSaysRestart() {
        val store = MemoryRecorderStore()
        val first = rig(store).started()
        first.rec.stop("permission"); first.run()
        val resumed = Rig(store, T0 + 60_000)
        resumed.rec.start(OWNER, "permission", device()); resumed.run()
        assertEquals("permission", resumed.of("tracking_started").single().data["reason"])
        // The process dies with the session open: the next start owes the system stop and says restart whatever JavaScript says.
        val after = Rig(store, T0 + 120_000)
        after.rec.start(OWNER, "permission", device()); after.run()
        assertEquals(listOf("tracking_stopped", "tracking_started"), after.names())
        assertEquals("system", after.out[0].data["reason"])
        assertEquals("restart", after.out[1].data["reason"])
    }

    @Test fun aChangeThatHappenedWhileTheProcessWasDeadIsReportedAtTheNextStartAtTheDetectionTime() {
        val store = MemoryRecorderStore()
        val first = rig(store).started()
        first.rec.stop("logout"); first.run()
        val second = Rig(store, T0 + 3_600_000)
        second.rec.start(OWNER, "login", device(permission = PermissionState("denied", false))); second.run()
        val e = second.of("location_permission_changed").single()
        assertEquals(T0 + 3_600_000, e.occurredAtMs)
        assertEquals("always", e.data["from"]); assertEquals("denied", e.data["to"])
        assertEquals(listOf("tracking_started", "location_permission_changed"), second.names())
    }

    @Test fun theFirstPermissionEverSeenIsABaselineNotAnEvent() {
        val r = rig()
        r.rec.start(OWNER, "available", device()); r.run()
        assertEquals(listOf("tracking_started"), r.names())
    }

    @Test fun closeOrphanReportsTheOwedStopWithTheGivenReasonThenThePermissionChange() {
        val store = MemoryRecorderStore()
        val first = rig(store).started()
        first.advance(20_000)
        first.rec.heartbeat(); first.run()
        val second = Rig(store, T0 + 500_000)
        second.rec.closeOrphan(OWNER, "permission", PermissionState("while_in_use", true)); second.run()
        assertEquals(listOf("tracking_stopped", "location_permission_changed"), second.names())
        val stopped = second.out[0]
        assertEquals("permission", stopped.data["reason"])
        assertEquals(T0 + 20_000, stopped.occurredAtMs)
        assertEquals(20_000L, stopped.durationMs)
        assertEquals(T0 + 500_000, second.out[1].occurredAtMs)
        assertTrue(!store.state.active)
        // a second call finds nothing to report
        second.clear()
        second.rec.closeOrphan(OWNER, "permission", PermissionState("denied", false)); second.run()
        assertEquals(emptyList<String>(), second.names())
    }

    @Test fun closeOrphanDoesNothingWithoutAnOrphanOrForAnotherOwnerOrWhileRunning() {
        val store = MemoryRecorderStore()
        val idle = Rig(store, T0)
        idle.rec.closeOrphan(OWNER, "permission", ALWAYS); idle.run()
        assertEquals(emptyList<String>(), idle.names())

        val first = rig(store).started()
        val other = Rig(store, T0 + 100_000)
        other.rec.closeOrphan("someone else", "permission", ALWAYS); other.run()
        assertEquals(emptyList<String>(), other.names())
        assertTrue("still owed to its owner", store.state.active)

        first.rec.closeOrphan(OWNER, "permission", ALWAYS); first.run() // the session is running: not an orphan
        assertEquals(emptyList<String>(), first.names())
    }

    // ---- simulated location ----

    @Test fun aSimulatedLocationIsReportedOncePerSessionAndPerTenMinutes() {
        val r = rig().started()
        r.rec.mock("fused"); r.run()
        val e = r.out.single()
        assertEquals("mock_location_detected", e.event)
        assertEquals("fused", e.data["provider"])
        r.clear()
        r.advance(60_000)
        r.rec.mock("fused"); r.run()
        r.advance(539_000)
        r.rec.mock("gps"); r.run()
        assertEquals("inside the ten minutes", emptyList<String>(), r.names())
        r.advance(2_000)
        r.rec.mock(null); r.run()
        assertEquals(1, r.out.size)
        assertEquals("no provider key when the OS gives none", listOf("platform", "app_state"), r.out[0].data.keys.toList())
        // a new session starts the count again
        r.clear()
        r.rec.stop("unavailable"); r.run()
        r.rec.start(OWNER, "available", device()); r.run(); r.clear()
        r.rec.mock("fused"); r.run()
        assertEquals(listOf("mock_location_detected"), r.names())
    }

    // ---- misc ----

    @Test fun uuidsAreV4LowercaseAndDifferent() {
        val r = Rig(MemoryRecorderStore(), T0)
        val real = TrackingRecorder("android", r.sched, MemoryRecorderStore(), { r.out += it }, wallClock = { T0 })
        real.start(OWNER, "available", device()); real.stop("unknown"); r.run()
        assertEquals(2, r.out.size)
        val pattern = Regex("^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$")
        assertTrue(r.out.all { pattern.matches(it.uuid) && it.uuid.length == 36 })
        assertTrue(r.out[0].uuid != r.out[1].uuid)
    }

    @Test fun theFileStoreRoundTripsAndNeverHoldsAToken() {
        val dir = java.nio.file.Files.createTempDirectory("rec").toFile()
        try {
            val store = FileRecorderStore(dir)
            val state = RecorderState(
                owner = OWNER, active = true, sessionStartWall = 5L, heartbeatWall = 9L,
                open = mapOf("gps_off" to 3L, "offline" to 4L), permission = PermissionState("always", false)
            )
            store.save(state)
            assertEquals(state, FileRecorderStore(dir).load())
            val text = java.io.File(dir, FileRecorderStore.FILE_NAME).readText()
            assertTrue("Bearer" !in text && "Authorization" !in text)
            java.io.File(dir, FileRecorderStore.FILE_NAME).writeText("garbage\n\u0000\u0001")
            assertEquals(RecorderState(), FileRecorderStore(dir).load())
        } finally {
            dir.deleteRecursively()
        }
    }

    @Test fun anEndToEndRunFeedsTheSenderInOrder() {
        // recorder -> sender lane -> transport: the order and the shape of what leaves the phone
        val dir = java.nio.file.Files.createTempDirectory("e2e").toFile()
        try {
            val sched = ManualScheduler()
            val transport = FakeTransport()
            val sender = LocationSender(
                eventsConfig(), transport, FileLocationQueue(dir), MockPolicy(true), sched, RecordingListener(),
                events = EventsSetup(FileEventQueue(dir))
            )
            var n = 0
            val rec = TrackingRecorder("android", sched, FileRecorderStore(dir), { sender.recordOnWorker(it) },
                wallClock = { T0 + sched.nowMillis() - 1_000_000L }, newUuid = { "uuid-${++n}" })
            sender.start()
            rec.start(eventsConfig().eventsOwner!!, "available", device())
            sched.runPending()
            rec.gps(false); sched.runPending(); sched.advance(2_000)
            rec.stop("unavailable"); sched.runPending()
            val bodies = transport.requests.filter { it.url == EVENTS_URL }.map { it.body }
            assertEquals(listOf("tracking_started", "turn_off_gps", "tracking_stopped"), bodies.flatMap { eventNames(it) })
            assertTrue(bodies.all { it.startsWith("{\"events\":\"[") })
        } finally {
            dir.deleteRecursively()
        }
    }
}
