package co.ordering.driver.location

import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicInteger
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * `shutdownGracefully`: what is queued finishes (the last `tracking_stopped` send, a timer already set), nothing new is accepted.
 * No test sleeps for a guessed time: each waits on a latch (with a generous timeout that only a real hang reaches) and the
 * negative checks are made by a task that is queued AFTER the thing that must not run, on a second scheduler whose queue is
 * already empty.
 */
class ExecutorSchedulerShutdownTest {
    @Test fun tasksSubmittedBeforeTheShutdownStillRunTimersAlreadySetToo() {
        val scheduler = ExecutorScheduler("test-shutdown")
        val ran = AtomicInteger()
        val done = CountDownLatch(3)
        val timer = CountDownLatch(1)
        repeat(3) {
            scheduler.execute {
                ran.incrementAndGet()
                done.countDown()
            }
        }
        scheduler.schedule(50) { ran.addAndGet(100); timer.countDown() } // a retry timer
        scheduler.shutdownGracefully()
        assertTrue("the queued tasks ran", done.await(30, TimeUnit.SECONDS))
        assertTrue("the timer already set ran", timer.await(30, TimeUnit.SECONDS))
        assertEquals("the three tasks and the timer once", 103, ran.get())
    }

    @Test fun afterTheShutdownNothingNewIsAcceptedAndNothingThrows() {
        // A control scheduler that is NOT shut down runs a task submitted after the one under test: if the rejected scheduler
        // had accepted its task, that task would have run first (same instant, submission order) or at the latest within the
        // control's own 50 ms timer, so "ran == 0" after the control finished is a real "not accepted".
        val scheduler = ExecutorScheduler("test-shutdown-2")
        scheduler.shutdownGracefully()
        val ran = AtomicInteger()
        scheduler.execute { ran.incrementAndGet() }
        val cancellable = scheduler.schedule(1) { ran.incrementAndGet() } // accepted nothing: a no-op handle
        cancellable.cancel() // and cancelling it does not throw
        val control = ExecutorScheduler("test-shutdown-2-control")
        val controlRan = CountDownLatch(1)
        control.schedule(100) { controlRan.countDown() }
        assertTrue(controlRan.await(30, TimeUnit.SECONDS))
        control.shutdown()
        assertEquals("nothing submitted after the shutdown ran", 0, ran.get())
    }

    @Test fun aTimerSetAfterTheShutdownIsNotKeptEvenWhenItIsNotCancelled() {
        val scheduler = ExecutorScheduler("test-shutdown-3")
        scheduler.shutdownGracefully()
        val ran = AtomicInteger()
        scheduler.schedule(1) { ran.incrementAndGet() } // never cancelled: it must still not run
        val control = ExecutorScheduler("test-shutdown-3-control")
        val controlRan = CountDownLatch(1)
        control.schedule(100) { controlRan.countDown() }
        assertTrue(controlRan.await(30, TimeUnit.SECONDS))
        control.shutdown()
        assertEquals(0, ran.get())
        assertFalse(ran.get() > 0)
    }
}
