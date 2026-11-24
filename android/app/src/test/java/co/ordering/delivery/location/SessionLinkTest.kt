package co.ordering.delivery.location

import co.ordering.driver.location.Cancellable
import co.ordering.driver.location.DeviceSnapshot
import co.ordering.driver.location.MemoryRecorderStore
import co.ordering.driver.location.PermissionState
import co.ordering.driver.location.Scheduler
import co.ordering.driver.location.TrackingEvent
import co.ordering.driver.location.TrackingRecorder
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Sequence A of the review: logout, the old worker finishes a request with the old token, the driver signs in again, the old
 * request's 401 arrives. The old run's answer must not stop the new run's recorder nor reach JavaScript.
 *
 *     ./gradlew :app:testDebugUnitTest --tests 'co.ordering.delivery.location.SessionLinkTest'
 */
class SessionLinkTest {
    /** Runs everything at once, on the calling thread; timers never fire. */
    private object Inline : Scheduler {
        override fun nowMillis() = 0L
        override fun execute(task: Runnable) = task.run()
        override fun schedule(delayMs: Long, task: Runnable) = Cancellable { }
    }

    private val owner = "u\ne"
    private val device = DeviceSnapshot(true, true, true, "wifi", false, PermissionState("always", true))
    private val events = ArrayList<TrackingEvent>()
    private val store = MemoryRecorderStore()

    private fun recorder() = TrackingRecorder("android", Inline, store, { events += it }).also { it.start(owner, "login", device) }

    @Test fun anOldRunsRevokedAnswerStopsNothingOfTheNewRunAndIsNotForwarded() {
        val oldSender = Any()
        val newSender = Any()
        var running: Any? = oldSender
        val oldLink = SessionLink { running }.also { it.sender = oldSender; it.recorder = recorder() }
        // logout: the old run ends; the driver signs in again: the new run is the running one
        oldLink.recorder!!.stop("logout")
        val newRecorder = recorder()
        val newLink = SessionLink { running }.also { it.sender = newSender; it.recorder = newRecorder }
        running = newSender
        events.clear()

        assertFalse("the old run is not the running one", oldLink.isCurrent)
        assertFalse("its 401 is not forwarded to JavaScript", oldLink.onUnauthorized())
        assertTrue("the new session's events were not ended", newRecorder.isActive)
        assertEquals(emptyList<String>(), events.map { it.event })
    }

    @Test fun theRunningRunsOwn401EndsItsOwnRecorderAndIsForwarded() {
        val sender = Any()
        val recorder = recorder()
        val link = SessionLink { sender }.also { it.sender = sender; it.recorder = recorder }
        events.clear()
        assertTrue(link.isCurrent)
        assertTrue(link.onUnauthorized())
        assertFalse(recorder.isActive)
        assertEquals("session_revoked", events.single { it.event == "tracking_stopped" }.data["reason"])
    }

    @Test fun aLinkWithNoSenderIsNeverCurrent() {
        val link = SessionLink { null }
        assertFalse(link.isCurrent)
        assertFalse(link.onUnauthorized())
    }
}
