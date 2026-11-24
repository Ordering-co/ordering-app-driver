package co.ordering.delivery.location

import co.ordering.driver.location.TrackingReasons
import co.ordering.driver.location.TrackingRecorder

/**
 * What ties one run of the service (its sender and its events recorder) to the process-wide pieces that hear it. The sender's
 * answers arrive on a worker the NEXT service shares, possibly after that next service started (a request still in flight at a
 * logout): they must never act on the next session's recorder or reach JavaScript as if they were its own.
 *
 * Plain Kotlin on purpose (the JVM tests in `src/test` build one without Android): [running] says which sender the process
 * considers the running one (`DriverLocationRuntime.sender`).
 */
internal class SessionLink(private val running: () -> Any?) {
    @Volatile var sender: Any? = null
    @Volatile var recorder: TrackingRecorder? = null

    /** This link's sender is the one that runs now (not an old service's, finishing its last request). */
    val isCurrent: Boolean get() = sender.let { it != null && running() === it }

    /**
     * The sender reported a revoked session (a 401). Ends THIS session's recorder, and only when this is the running session.
     * Returns whether JavaScript must hear it (false for a session that is not the running one).
     */
    fun onUnauthorized(): Boolean {
        if (!isCurrent) return false
        recorder?.stop(TrackingReasons.SESSION_REVOKED)
        return true
    }
}
