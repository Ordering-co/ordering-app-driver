package co.ordering.driver.location

import java.io.File
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder

class RecorderStoreFileTest {
    @get:Rule val tmp = TemporaryFolder()

    private val owner = "http://localhost:8080/v400/es/development/users/13217/locations\nhttp://localhost:8080/v400/es/development/tracking_events"

    @Test fun anOwnerWithALineBreakSurvivesTheFileAndIsTheSameString() {
        val store = FileRecorderStore(tmp.root)
        store.save(RecorderState(owner = owner, active = true, sessionStartWall = 1L, heartbeatWall = 2L, permission = PermissionState("always", true)))
        val loaded = FileRecorderStore(tmp.root).load()
        assertEquals(owner, loaded.owner)
        assertTrue(loaded.active)
    }

    @Test fun anOrphanOnDiskIsReportedByACloseOrphanOfAnotherProcessWithTheSameFileStore() {
        FileRecorderStore(tmp.root).save(RecorderState(owner = owner, active = true, sessionStartWall = 1_795_128_729_139L, heartbeatWall = 1_795_129_030_910L, permission = PermissionState("always", true)))
        val sched = ManualScheduler()
        val out = ArrayList<TrackingEvent>()
        val rec = TrackingRecorder("android", sched, FileRecorderStore(tmp.root), { out += it }, wallClock = { 1_795_129_600_000L })
        rec.closeOrphan(owner, "permission", PermissionState("denied", false))
        sched.runPending()
        assertEquals(listOf("tracking_stopped", "location_permission_changed"), out.map { it.event })
        assertEquals("permission", out[0].data["reason"])
        assertTrue(!FileRecorderStore(tmp.root).load().active)
    }
}
