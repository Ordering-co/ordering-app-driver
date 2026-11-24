package co.ordering.driver.location

import java.util.PriorityQueue
import java.util.concurrent.CopyOnWriteArrayList

/** Deterministic [Scheduler]: a virtual clock and a task list run by the test thread. */
class ManualScheduler : Scheduler {
    private class Entry(val at: Long, val seq: Long, val task: Runnable) : Comparable<Entry> {
        @Volatile var cancelled = false
        override fun compareTo(other: Entry) = compareValuesBy(this, other, { it.at }, { it.seq })
    }

    private val lock = Any()
    private val entries = PriorityQueue<Entry>()
    private var seq = 0L
    private var now = 1_000_000L
    val scheduledDelays = ArrayList<Long>()

    override fun nowMillis(): Long = synchronized(lock) { now }

    override fun execute(task: Runnable) {
        synchronized(lock) { entries.add(Entry(now, seq++, task)) }
    }

    override fun schedule(delayMs: Long, task: Runnable): Cancellable {
        val e = synchronized(lock) {
            scheduledDelays.add(delayMs)
            Entry(now + delayMs, seq++, task).also { entries.add(it) }
        }
        return Cancellable { e.cancelled = true }
    }

    /** Moves the clock by [ms] WITHOUT running anything: "this took that long" inside a task. */
    fun skip(ms: Long) = synchronized(lock) { now += ms }

    /** Runs everything due now (and what it posts). */
    fun runPending() = advance(0)

    /** Moves the clock by [ms], running every task that comes due, in order. */
    fun advance(ms: Long) {
        val target = synchronized(lock) { now + ms }
        while (true) {
            val e = synchronized(lock) {
                val head = entries.peek()
                if (head == null || head.at > target) null else entries.poll().also { now = maxOf(now, it.at) }
            } ?: break
            if (!e.cancelled) e.task.run()
        }
        synchronized(lock) { now = maxOf(now, target) }
    }

    fun pendingDelayed(): Int = synchronized(lock) { entries.count { !it.cancelled && it.at > now } }
}

/** [HttpTransport] that answers from a script and records every request. */
class FakeTransport : HttpTransport {
    class Request(val url: String, val headers: Map<String, String>, val body: String)

    val requests = CopyOnWriteArrayList<Request>()
    private val script = java.util.ArrayDeque<HttpResult>()

    @Volatile var default: HttpResult = HttpResult.Response(200)

    /** Called inside post(), before the answer: lets a test make something happen "in flight". */
    @Volatile var onPost: ((Request) -> Unit)? = null

    @Synchronized fun enqueue(vararg results: HttpResult) = results.forEach { script.addLast(it) }

    @Synchronized
    override fun post(url: String, headers: Map<String, String>, body: String): HttpResult {
        val req = Request(url, HashMap(headers), body)
        requests.add(req)
        onPost?.invoke(req)
        return script.pollFirst() ?: default
    }

    companion object {
        fun status(s: Int) = HttpResult.Response(s)
        val offline = HttpResult.NetworkError("UnknownHostException")
    }
}

class RecordingListener : SenderListener {
    val https = CopyOnWriteArrayList<Pair<Boolean, Int>>()
    val accepted = CopyOnWriteArrayList<LocationFix>()
    val states = CopyOnWriteArrayList<StateKind>()
    val requests = CopyOnWriteArrayList<Pair<String, Int>>()
    val retries = CopyOnWriteArrayList<Triple<Long, Int?, Int>>()
    val discards = CopyOnWriteArrayList<Int>()
    val deferred = CopyOnWriteArrayList<Pair<Long, Int>>()
    override fun onHttp(success: Boolean, status: Int) { https.add(success to status) }
    override fun onLocationAccepted(fix: LocationFix) { accepted.add(fix) }
    override fun onState(kind: StateKind) { states.add(kind) }
    override fun onRequest(body: String, queued: Int) { requests.add(body to queued) }
    override fun onRetryScheduled(delayMs: Long, status: Int?, queued: Int) { retries.add(Triple(delayMs, status, queued)) }
    override fun onDiscarded(count: Int) { discards.add(count) }
    override fun onSendDeferred(delayMs: Long, queued: Int) { deferred.add(delayMs to queued) }
}
