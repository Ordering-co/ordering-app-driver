package co.ordering.driver.location

import java.util.concurrent.RejectedExecutionException
import java.util.concurrent.ScheduledFuture
import java.util.concurrent.ScheduledThreadPoolExecutor
import java.util.concurrent.ThreadFactory
import java.util.concurrent.TimeUnit

/** Something scheduled that can still be cancelled. */
fun interface Cancellable {
    fun cancel()
}

/**
 * The sender's clock and its single worker. All tasks run one at a time, in submission
 * order, on one thread: that is what makes the sender thread-safe. Tests inject a manual
 * implementation with a virtual clock.
 */
interface Scheduler {
    /**
     * A MONOTONIC clock in milliseconds: only differences between two readings mean anything (it is not
     * the wall clock and can be set back by nobody). The sender measures the minimum send interval with it.
     */
    fun nowMillis(): Long

    /** Runs [task] on the worker as soon as possible (FIFO among executes). */
    fun execute(task: Runnable)

    /** Runs [task] on the worker after [delayMs]. */
    fun schedule(delayMs: Long, task: Runnable): Cancellable
}

/**
 * Real [Scheduler]: one daemon thread. [shutdown] when the service is destroyed. Its timers are plain
 * `ScheduledThreadPoolExecutor` delays: no wake lock, no alarm (the foreground service's own wake-ups, the
 * location callbacks, are what run the worker while the device sleeps).
 *
 * @param clock the monotonic clock in milliseconds ([nowMillis]). The default, `System.nanoTime`, does not
 *   count the time the device sleeps; the Android app passes `SystemClock.elapsedRealtime`, which does.
 */
class ExecutorScheduler(
    threadName: String = "driver-location-sender",
    private val clock: () -> Long = { System.nanoTime() / 1_000_000L }
) : Scheduler {
    private val executor = ScheduledThreadPoolExecutor(1, ThreadFactory { r ->
        Thread(r, threadName).apply { isDaemon = true }
    }).apply { removeOnCancelPolicy = true }

    override fun nowMillis(): Long = clock()

    override fun execute(task: Runnable) {
        try {
            executor.execute(task)
        } catch (_: RejectedExecutionException) {
        }
    }

    override fun schedule(delayMs: Long, task: Runnable): Cancellable {
        val f: ScheduledFuture<*>? = try {
            executor.schedule(task, delayMs, TimeUnit.MILLISECONDS)
        } catch (_: RejectedExecutionException) {
            null
        }
        return Cancellable { f?.cancel(false) }
    }

    fun shutdown() {
        executor.shutdownNow()
    }

    /**
     * Lets everything already submitted finish, the immediate tasks AND the timers already set (a request in flight, the last
     * events' send, a retry that is due), and accepts nothing new (a retry scheduled after this is not set). The thread ends by
     * itself once the queue is empty. The service uses it so the `tracking_stopped` event of a stop reaches the API; [shutdown]
     * is the hard one. (The pool's own "no delayed tasks after shutdown" policy is NOT used: on Android it also drops the tasks
     * that are due now.)
     */
    fun shutdownGracefully() {
        executor.shutdown()
    }
}
