package co.ordering.driver.location

/**
 * What to do with a mock (simulated) location. The build kind is injected (phase 2 passes
 * `!BuildConfig.DEBUG`), never read from Android here; the debug option is [Config.rejectMock].
 *
 * - Release builds: a mock fix is always dropped before the queue (the sender reports
 *   `mock_rejected`), whatever `rejectMock` says. Not configurable.
 * - Debug builds, `rejectMock` true: the same as release (so production behaviour can be tried).
 * - Debug builds, `rejectMock` false (default): the fix is accepted and SENT AS A REAL ONE
 *   (the body has no `mock` key at all, so nothing tells the server it was simulated; otherwise a
 *   developer could not see an emulator's positions); the accepted-location event keeps the
 *   truth (`mock = true`).
 * - A fix that is not mock is never affected.
 */
class MockPolicy(private val releaseBuild: Boolean) {
    enum class Decision {
        /** Queue it as it is. */
        ACCEPT,

        /** Drop it; the sender reports `mock_rejected`. */
        REJECT,

        /** Queue it with `mock = false` (the event for JS still carries the original). */
        ACCEPT_AS_REAL
    }

    fun decide(fix: LocationFix, rejectMock: Boolean = false): Decision = when {
        !fix.mock -> Decision.ACCEPT
        releaseBuild || rejectMock -> Decision.REJECT
        else -> Decision.ACCEPT_AS_REAL
    }
}
