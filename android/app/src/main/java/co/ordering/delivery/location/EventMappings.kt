package co.ordering.delivery.location

import co.ordering.driver.location.PermissionState

/**
 * The small, pure mappings from what Android says to what the tracking events say (docs/LOCATION_MODULE.md,
 * "Tracking events"). No Android class is touched, so each is a JVM unit test (`EventMappingsTest`); the service reads
 * the OS and calls them.
 */
internal object EventMappings {
    /**
     * The app's location authorization and precision as the contract names them. Android cannot tell "not determined"
     * from "denied". [precise] is the fine location permission (coarse only = approximate).
     */
    fun permission(fine: Boolean, coarse: Boolean, background: Boolean): PermissionState = when {
        !fine && !coarse -> PermissionState("denied", false)
        background -> PermissionState("always", fine)
        else -> PermissionState("while_in_use", fine)
    }

    /** `cellular` | `wifi` | `other` | `none` (no network at all). */
    fun networkType(present: Boolean, wifi: Boolean, cellular: Boolean): String = when {
        !present -> "none"
        wifi -> "wifi"
        cellular -> "cellular"
        else -> "other"
    }
}

/**
 * Turns the default network's callbacks into "online / offline + type" for the recorder. Online means the OS validated
 * the network (it reached the internet); a network that is up but not validated (a captive portal, no internet behind
 * the router) is offline. [type] of an offline report is the last type seen online (`none` if none yet). Repeated
 * reports of the same state (a signal strength change fires a callback) are not forwarded.
 */
internal class ConnectivityMapper(private val sink: (online: Boolean, type: String) -> Unit) {
    private var online: Boolean? = null
    private var lastType = "none"
    private var lastForwardedType: String? = null

    /** The state the service reads at the start (not forwarded: the recorder takes it in its snapshot). */
    fun seed(online: Boolean, type: String) {
        this.online = online
        if (online) lastType = type
        lastForwardedType = if (online) type else null
    }

    val lastKnownType: String get() = lastType

    /** The default network's capabilities changed (or it appeared): [validated], and its [type]. */
    fun onCapabilities(validated: Boolean, type: String) {
        if (validated) {
            lastType = type
            if (online == true && lastForwardedType == type) return
            online = true
            lastForwardedType = type
            sink(true, type)
        } else {
            if (online == false) return
            online = false
            lastForwardedType = null
            sink(false, lastType)
        }
    }

    /** There is no default network any more. */
    fun onLost() {
        if (online == false) return
        online = false
        lastForwardedType = null
        sink(false, lastType)
    }
}
