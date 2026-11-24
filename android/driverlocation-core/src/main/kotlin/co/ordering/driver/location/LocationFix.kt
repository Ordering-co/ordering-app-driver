package co.ordering.driver.location

/**
 * One location reading, as the platform layer hands it to the core.
 *
 * @property timestamp epoch milliseconds of the reading (not of its arrival).
 * @property mock true when the platform says the reading is a mock location
 *   (`Location.isMock` on Android).
 */
data class LocationFix(
    val lat: Double,
    val lng: Double,
    val accuracy: Double? = null,
    val speed: Double? = null,
    val timestamp: Long,
    val mock: Boolean = false
) {
    /** False for NaN / infinite / out-of-range coordinates: the sender ignores such a fix. */
    val isValid: Boolean
        get() = lat.isFinite() && lng.isFinite() && lat in -90.0..90.0 && lng in -180.0..180.0
}
