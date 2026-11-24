package co.ordering.driver.location

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

/** The real single-thread [ExecutorScheduler] with fixes coming from many threads. */
class ConcurrencyTest {
    @get:Rule val tmp = TemporaryFolder()

    private fun awaitTrue(timeoutMs: Long = 20_000, cond: () -> Boolean) {
        val end = System.currentTimeMillis() + timeoutMs
        while (!cond() && System.currentTimeMillis() < end) Thread.sleep(5)
        assertTrue("condition not reached in time", cond())
    }

    /** Waits until the single worker has run everything posted so far (a FIFO marker task). */
    private fun drainWorker(scheduler: Scheduler) {
        val done = CountDownLatch(1)
        scheduler.execute { done.countDown() }
        assertTrue(done.await(20, TimeUnit.SECONDS))
    }

    private fun idOf(body: String): Int =
        Regex("\"ts\":(\\d+)").find(body)?.groupValues?.get(1)?.toInt()
            ?: ((Regex("\"lat\":([-0-9.]+)").find(body)!!.groupValues[1].toDouble() - 10.0) * 1e6).toInt()

    @Test fun fixesFromManyThreadsAreNeitherLostNorDuplicated() = manyThreads(discard = false)

    @Test fun inLatestWinsNothingIsSentTwiceAndNothingOlderAfterNewer() = manyThreads(discard = true)

    private fun manyThreads(discard: Boolean) {
        val threads = 8
        val perThread = 100
        val scheduler = ExecutorScheduler()
        val transport = FakeTransport()
        val queue = FileLocationQueue(tmp.root, 100_000)
        val acceptedOrder = java.util.concurrent.CopyOnWriteArrayList<Long>()
        val listener = object : SenderListener {
            override fun onLocationAccepted(fix: LocationFix) { acceptedOrder.add(fix.timestamp) }
        }
        // a little latency so that fixes pile up behind a request in flight
        transport.onPost = { if (it.body.length % 3 == 0) Thread.sleep(1) }
        val sender = LocationSender(
            testConfig(maxQueue = 100_000, discardOlderOnSuccess = discard),
            transport, queue, MockPolicy(true), scheduler, listener
        )
        try {
            sender.start()
            val go = CountDownLatch(1)
            val pool = Executors.newFixedThreadPool(threads)
            for (t in 0 until threads) pool.execute {
                go.await()
                for (i in 0 until perThread) {
                    val id = t * perThread + i + 1
                    // distinct, exactly representable lat: id / 1024 -> body is parsed back below
                    sender.onFix(LocationFix(10.0 + id / 1024.0, 1.0, null, null, id.toLong()))
                }
            }
            go.countDown()
            pool.shutdown()
            assertTrue(pool.awaitTermination(20, TimeUnit.SECONDS))
            val ids = { transport.requests.map { r ->
                val lat = Regex("\"lat\":([-0-9.]+)").find(r.body)!!.groupValues[1].toDouble()
                Math.round((lat - 10.0) * 1024.0).toInt()
            } }
            if (!discard) {
                awaitTrue { transport.requests.size >= threads * perThread && sender.state().queued == 0 }
                val sent = ids()
                assertEquals(threads * perThread, sent.size)
                assertEquals((1..threads * perThread).toSet(), sent.toSet())
                // per producing thread, the order of its own fixes is kept
                for (t in 0 until threads) {
                    val mine = sent.filter { (it - 1) / perThread == t }
                    assertEquals(mine.sorted(), mine)
                }
            } else {
                // every accepted fix is either sent or discarded by a newer success; the last
                // accepted one is always sent; nothing is sent twice; nothing older after newer
                drainWorker(scheduler)   // every posted fix has been processed; then it must be idle
                assertEquals(0, sender.state().queued)
                val sent = ids().map { it.toLong() }
                assertEquals(sent.size, sent.toSet().size)
                val accepted = acceptedOrder.toList()
                val positions = sent.map { accepted.indexOf(it) }
                assertTrue(positions.all { it >= 0 })
                assertEquals(positions.sorted(), positions)
                assertEquals(accepted.last(), sent.last())
            }
        } finally {
            scheduler.shutdown()
        }
    }

    @Test fun concurrentFlushesAndFixesNeverSendTheSameFixTwice() = flushes(discard = false)

    @Test fun concurrentFlushesAndFixesNeverSendTheSameFixTwiceInLatestWins() = flushes(discard = true)

    private fun flushes(discard: Boolean) {
        val scheduler = ExecutorScheduler()
        val transport = FakeTransport()
        val queue = FileLocationQueue(tmp.root, 100_000)
        val sender = LocationSender(
            testConfig(maxQueue = 100_000, discardOlderOnSuccess = discard), transport, queue, MockPolicy(true), scheduler
        )
        try {
            sender.start()
            val pool = Executors.newFixedThreadPool(4)
            val total = 400
            for (t in 0 until 4) pool.execute {
                for (i in 0 until total / 4) {
                    val id = t * (total / 4) + i + 1
                    sender.onFix(LocationFix(10.0 + id / 1024.0, 1.0, null, null, id.toLong()))
                    sender.flush(); sender.onConnectivityRestored(); sender.state()
                }
            }
            pool.shutdown()
            assertTrue(pool.awaitTermination(20, TimeUnit.SECONDS))
            if (discard) {
                drainWorker(scheduler)
                assertEquals(transport.requests.size, transport.requests.map { it.body }.toSet().size)
            } else {
                awaitTrue { sender.state().queued == 0 && transport.requests.size >= total }
                assertEquals(total, transport.requests.size)
                assertEquals(total, transport.requests.map { it.body }.toSet().size)
            }
        } finally {
            scheduler.shutdown()
        }
    }

    @Test fun stateCanBeReadWhileTheWorkerIsBusy() {
        val scheduler = ExecutorScheduler()
        val gate = CountDownLatch(1)
        val slow = object : HttpTransport {
            override fun post(url: String, headers: Map<String, String>, body: String): HttpResult {
                gate.await(10, TimeUnit.SECONDS)
                return HttpResult.Response(200)
            }
        }
        val queue = FileLocationQueue(tmp.root)
        val sender = LocationSender(testConfig(), slow, queue, MockPolicy(true), scheduler)
        try {
            sender.start()
            sender.onFix(LocationFix(1.0, 1.0, null, null, 1L))
            awaitTrue { sender.state().queued == 1 }
            sender.stop()                       // returns at once while a request is in flight
            assertEquals(false, sender.state().tracking)
            gate.countDown()
        } finally {
            scheduler.shutdown()
        }
    }
}
