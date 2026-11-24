package co.ordering.driver.location

/**
 * Retry delays: 5 s, 15 s, 60 s, then 60 s again and again. [reset] after a success.
 * Thread-safe.
 */
class Backoff(private val stepsMs: LongArray = DEFAULT_STEPS_MS) {
    private var failures = 0

    init {
        require(stepsMs.isNotEmpty() && stepsMs.all { it > 0 }) { "backoff steps must be positive" }
    }

    /** Delay before the next retry; each call counts one more failure. */
    @Synchronized
    fun next(): Long {
        val delay = stepsMs[minOf(failures, stepsMs.size - 1)]
        failures++
        return delay
    }

    @Synchronized
    fun reset() {
        failures = 0
    }

    companion object {
        val DEFAULT_STEPS_MS = longArrayOf(5_000L, 15_000L, 60_000L)
    }
}
