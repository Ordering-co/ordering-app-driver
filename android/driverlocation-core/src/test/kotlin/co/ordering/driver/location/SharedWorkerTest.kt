package co.ordering.driver.location

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * A service that is stopped and started again shares the process's ONE worker, recorder store and queues with the one before
 * (the app's `DriverLocationRuntime`): the old stop runs before the new start, and `closeOrphan` runs once. Two recorders stand
 * for the two services; they share a [ManualScheduler] (the worker) and a [MemoryRecorderStore] (the file).
 */
class SharedWorkerTest {
    private val owner = "http://localhost:8080/users/7/locations\nhttp://localhost:8080/tracking_events"
    private val permission = PermissionState("always", true)
    private val device = DeviceSnapshot(true, true, true, "wifi", false, permission)

    private val worker = ManualScheduler()
    private val store = MemoryRecorderStore()
    private val out = ArrayList<TrackingEvent>()
    private var n = 0

    private fun recorder() = TrackingRecorder(
        "android", worker, store, { out += it }, wallClock = { worker.nowMillis() }, newUuid = { "uuid-${++n}" }
    )

    private fun names() = out.map { it.event }

    @Test fun theOldStopRunsBeforeTheNewStartSoThereIsNoSpuriousSystemStopOrRestart() {
        val first = recorder()
        first.start(owner, "login", device); worker.runPending(); out.clear()

        // The driver switches off and on: stop, then start again at once, before the worker ran anything in between.
        first.stop("unavailable")
        val second = recorder()
        second.start(owner, "available", device)
        worker.runPending()

        assertEquals(listOf("tracking_stopped", "tracking_started"), names())
        assertEquals("unavailable", out[0].data["reason"])
        assertEquals("the new session says why it started, not `restart`", "available", out[1].data["reason"])
        assertTrue(second.isActive)
        assertFalse(first.isActive)
        assertTrue("the state on disk is the new, active session", store.load().active)
    }

    @Test fun aLaterKillOfTheNewSessionIsStillReported() {
        val first = recorder()
        first.start(owner, "login", device)
        first.stop("logout")
        val second = recorder()
        second.start(owner, "login", device)
        worker.runPending(); out.clear()
        // The old stop did not overwrite the new session's flag: the process dies now, and the next start finds an owed stop.
        assertTrue(store.load().active)
        val third = recorder()
        third.start(owner, "login", device); worker.runPending()
        assertEquals(listOf("tracking_stopped", "tracking_started"), names())
        assertEquals("system", out[0].data["reason"])
        assertEquals("restart", out[1].data["reason"])
    }

    @Test fun twoCloseOrphanCallsInARowReportTheOwedStopOnce() {
        val dead = recorder()
        dead.start(owner, "login", device); worker.runPending() // the process "dies": active stays set
        out.clear()

        // Nothing runs, JavaScript asks twice (the hook sends the stop again once configured).
        recorder().closeOrphan(owner, "permission", PermissionState("denied", false))
        recorder().closeOrphan(owner, "permission", PermissionState("denied", false))
        worker.runPending()

        assertEquals(1, out.count { it.event == "tracking_stopped" })
        assertEquals(1, out.count { it.event == "location_permission_changed" })
        assertEquals("permission", out.first { it.event == "tracking_stopped" }.data["reason"])
        assertFalse(store.load().active)
    }

    /** Why the worker is shared (the defect D2): with one worker per service the new start ran while the old stop was still waiting. */
    @Test fun withAWorkerPerServiceTheNewStartOvertakesTheOldStopAndInventsASystemStop() {
        val oldWorker = ManualScheduler()
        val first = TrackingRecorder("android", oldWorker, store, { out += it }, wallClock = { oldWorker.nowMillis() }, newUuid = { "uuid-${++n}" })
        first.start(owner, "login", device); oldWorker.runPending(); out.clear()
        first.stop("unavailable") // queued behind a request in flight: it has not run
        val second = recorder()
        second.start(owner, "available", device); worker.runPending() // the new worker is free
        assertEquals(listOf("tracking_stopped", "tracking_started"), names())
        assertEquals("system", out[0].data["reason"]) // the spurious stop
        assertEquals("restart", out[1].data["reason"])
    }
}
