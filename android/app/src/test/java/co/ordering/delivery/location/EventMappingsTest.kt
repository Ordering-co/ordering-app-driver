package co.ordering.delivery.location

import co.ordering.driver.location.PermissionState
import org.junit.Assert.assertEquals
import org.junit.Test

/** The pure mappings from what Android says to what the tracking events say (no Android class involved). */
class EventMappingsTest {
    // ---- permission and precision ----

    @Test fun noLocationPermissionIsDeniedAndNotPrecise() {
        assertEquals(PermissionState("denied", false), EventMappings.permission(fine = false, coarse = false, background = false))
        // a background grant alone, without foreground location, is still nothing
        assertEquals(PermissionState("denied", false), EventMappings.permission(fine = false, coarse = false, background = true))
    }

    @Test fun foregroundOnlyIsWhileInUse() {
        assertEquals(PermissionState("while_in_use", true), EventMappings.permission(fine = true, coarse = true, background = false))
        assertEquals(PermissionState("while_in_use", true), EventMappings.permission(fine = true, coarse = false, background = false))
    }

    @Test fun backgroundGrantedIsAlways() {
        assertEquals(PermissionState("always", true), EventMappings.permission(fine = true, coarse = true, background = true))
    }

    @Test fun coarseOnlyIsApproximate() {
        assertEquals(PermissionState("while_in_use", false), EventMappings.permission(fine = false, coarse = true, background = false))
        assertEquals(PermissionState("always", false), EventMappings.permission(fine = false, coarse = true, background = true))
    }

    // ---- network type ----

    @Test fun networkTypes() {
        assertEquals("none", EventMappings.networkType(present = false, wifi = false, cellular = false))
        assertEquals("wifi", EventMappings.networkType(present = true, wifi = true, cellular = false))
        assertEquals("cellular", EventMappings.networkType(present = true, wifi = false, cellular = true))
        assertEquals("other", EventMappings.networkType(present = true, wifi = false, cellular = false))
        assertEquals("wifi", EventMappings.networkType(present = true, wifi = true, cellular = true)) // wifi over cellular (a VPN says both)
    }

    // ---- the default network's callbacks ----

    private class Rig {
        val seen = ArrayList<Pair<Boolean, String>>()
        val mapper = ConnectivityMapper { online, type -> seen += online to type }
    }

    @Test fun validatedMeansOnlineAndNotValidatedMeansOffline() {
        val r = Rig().apply { mapper.seed(online = true, type = "wifi") }
        r.mapper.onCapabilities(validated = false, type = "wifi") // up, no internet behind it
        assertEquals(listOf(false to "wifi"), r.seen)
        r.mapper.onCapabilities(validated = true, type = "wifi")
        assertEquals(listOf(false to "wifi", true to "wifi"), r.seen)
    }

    @Test fun theTypeLostIsTheLastOneSeenOnline() {
        val r = Rig().apply { mapper.seed(online = true, type = "cellular") }
        r.mapper.onLost()
        assertEquals(listOf(false to "cellular"), r.seen)
        r.mapper.onCapabilities(validated = true, type = "wifi")
        assertEquals(true to "wifi", r.seen.last())
    }

    @Test fun lostWithNothingSeenIsTypeNone() {
        val r = Rig().apply { mapper.seed(online = false, type = "none") }
        r.mapper.onCapabilities(validated = true, type = "wifi")
        r.mapper.onLost()
        assertEquals(listOf(true to "wifi", false to "wifi"), r.seen)
        val fresh = Rig()
        fresh.mapper.onLost()
        assertEquals(listOf(false to "none"), fresh.seen)
    }

    @Test fun repeatedReportsOfTheSameStateAreNotForwarded() {
        val r = Rig().apply { mapper.seed(online = true, type = "wifi") }
        repeat(5) { r.mapper.onCapabilities(validated = true, type = "wifi") } // signal strength changes
        assertEquals(emptyList<Pair<Boolean, String>>(), r.seen)
        r.mapper.onLost(); r.mapper.onLost()
        r.mapper.onCapabilities(validated = false, type = "wifi")
        assertEquals(listOf(false to "wifi"), r.seen)
    }

    @Test fun aSwitchOfTypeWhileOnlineIsForwardedSoTheRecorderKnowsTheNewOne() {
        val r = Rig().apply { mapper.seed(online = true, type = "wifi") }
        r.mapper.onCapabilities(validated = true, type = "cellular")
        assertEquals(listOf(true to "cellular"), r.seen)
    }
}
