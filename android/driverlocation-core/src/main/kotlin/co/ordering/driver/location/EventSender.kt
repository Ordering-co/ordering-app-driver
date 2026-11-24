package co.ordering.driver.location

/**
 * What the events sender tells the platform layer, which writes the log lines (the core never logs). Called on the
 * worker, never while a lock is held; an exception thrown by a callback is swallowed. All methods default to no-ops.
 */
interface EventsListener {
    /** An event was stored in the queue; [queued] is what it holds now (the event's JSON is never passed: it is not for a log). */
    fun onEventRecorded(event: String, queued: Int) {}

    /** A request is about to be made with [count] events; [queued] is what the queue holds. */
    fun onEventsRequest(count: Int, queued: Int) {}

    /** The API answered [status] to a request of [count] events (any status). */
    fun onEventsHttp(status: Int, count: Int) {}

    /** A retry was scheduled in [delayMs]; [status] is the answer that caused it, null for a network error. */
    fun onEventsRetry(delayMs: Long, status: Int?, queued: Int) {}

    /** [count] events will never be sent: [why] is `queue full` (the cap dropped the oldest) or `http NNN` (a 4xx the API will not accept, 403 included). */
    fun onEventsDropped(count: Int, why: String) {}
}

/**
 * The second lane of the sender: the tracking events (docs/LOCATION_MODULE.md, "Tracking events"). It runs on the
 * [Scheduler]'s worker, the same single thread as the positions, so there is one request at a time and a position that
 * arrives meanwhile is never behind more than one events request ([pump] sends ONE batch and re-posts itself for the
 * next, so the tasks queued in between run first).
 *
 * Request: `POST` [Config.eventsUrl] with the SAME [Config.headers] as the positions, `{"events":"[...]"}` (the array as a JSON string, see [EventJson]), at most
 * [MAX_BATCH] events, oldest first, through the same [HttpTransport]. 2xx removes the batch. Only 401 means the session is
 * revoked: this lane stops, keeps the queue and calls [onRevoked] (the sender reports `unauthorized` once per set of
 * headers, whichever lane sees the 401 first); new headers resume it. 403 is "this endpoint refuses these events" (a proxy,
 * a firewall, a permissions rule on this one endpoint), NOT a revoked session: like any other 4xx (and 1xx/3xx) it drops
 * THAT batch (the API will not accept it) with one [EventsListener.onEventsDropped] (`http 403`), the lane keeps working
 * and nobody is signed out. Network error,
 * 5xx, 408, 429: kept, retried with the [Backoff] (5 s, 15 s, 60 s, then 60 s), and at once on [onConnectivityRestored] /
 * [flush] / a new event. With no [Config.eventsUrl] nothing is recorded, written or sent.
 *
 * It works whether or not the positions' sender is started: the `tracking_stopped` event is recorded after the stop.
 *
 * @param config the current configuration, read on the worker (null = nothing to send yet).
 * @param onRevoked called on the worker with the 401 status (only a 401 revokes the session).
 */
class EventSender(
    private val config: () -> Config?,
    private val transport: HttpTransport,
    private val queue: EventQueue,
    private val scheduler: Scheduler,
    private val listener: EventsListener = object : EventsListener {},
    private val backoff: Backoff = Backoff(),
    /**
     * The headers the next request must carry, which may be newer than the applied [config]'s (the worker is blocked in a
     * request while a change waits behind it). A 401 to a request sent with other headers is not a revoked session. Null
     * (default) = the applied config's: nothing is ever stale.
     */
    private val currentHeaders: () -> Map<String, String>? = { null },
    /** True once the owner is gone: no retry timer is set (what is left stays on disk). */
    private val retired: () -> Boolean = { false },
    private val onRevoked: (Int) -> Unit = {}
) {
    // Worker only.
    private var retry: Cancellable? = null
    private var revoked = false
    private var nextBatchPosted = false

    /** Events waiting (any thread). */
    val queued: Int get() = queue.size

    /** Stores an event (when events are on) and tries to send. Any thread. */
    fun record(event: TrackingEvent) = post { recordOnWorker(event) }

    /** The network is back: forget the backoff and try now. */
    fun onConnectivityRestored() = post {
        restoredOnWorker()
        pump()
    }

    /** Try to send now (the module's `flush()`, a start). */
    fun flush() = post {
        flushOnWorker()
        pump()
    }

    /** [onConnectivityRestored] without the send, for the sender that pumps both lanes itself (worker only). */
    internal fun restoredOnWorker() {
        backoff.reset()
        cancelRetry()
    }

    /** [flush] without the send (worker only). */
    internal fun flushOnWorker() {
        cancelRetry()
    }

    /** Other headers (a new token) resume a lane stopped by a 401. */
    fun onHeadersChanged() = post {
        revoked = false
        backoff.reset()
        cancelRetry()
        pump()
    }

    /** The configuration changed (an events url appeared or went): try again, or let the timers lapse. */
    fun onConfigChanged() = post {
        if (config()?.eventsUrl == null) cancelRetry() else pump()
    }

    /** Cancels the retry timer (the worker is going away). The events stay on disk. */
    fun cancelTimers() = post { cancelRetry() }

    // ---- worker side ----

    /** [record] for code that already runs on the worker (the recorder does): stores the event at once, in order. */
    fun recordOnWorker(event: TrackingEvent) {
        if (config()?.eventsUrl == null) return
        val dropped = queue.add(event.toJson())
        if (dropped > 0) notify { listener.onEventsDropped(dropped, "queue full") }
        notify { listener.onEventRecorded(event.event, queue.size) }
        cancelRetry() // a new event is tried at once
        pump()
    }

    /** One batch, then the next one is posted behind whatever is already waiting on the worker. */
    internal fun pump() {
        if (revoked || retry != null) return
        val cfg = config() ?: return
        val url = cfg.eventsUrl ?: return
        val batch = queue.peekBatch(MAX_BATCH)
        if (batch.isEmpty()) return
        val body = EventJson.body(batch.map { it.json })
        val sentWith = cfg.headers
        notify { listener.onEventsRequest(batch.size, queue.size) }
        val result = try {
            transport.post(url, cfg.headers, body)
        } catch (e: RuntimeException) {
            HttpResult.NetworkError(e.javaClass.simpleName)
        }
        when (result) {
            is HttpResult.NetworkError -> scheduleRetry(null)
            is HttpResult.Response -> {
                val status = result.status
                notify { listener.onEventsHttp(status, batch.size) }
                when {
                    status in 200..299 -> {
                        queue.removeThrough(batch.last().seq)
                        backoff.reset()
                        postNextBatch()
                    }
                    status == 401 && currentHeaders()?.let { it != sentWith } == true -> {
                        // Answered to a request made with a token that was replaced meanwhile: try the new one (the change is queued).
                        postNextBatch()
                    }
                    status == 401 -> {
                        revoked = true
                        cancelRetry()
                        notify { onRevoked(status) }
                    }
                    status in 500..599 || status == 408 || status == 429 -> scheduleRetry(status, result.retryAfterMs)
                    else -> {
                        // The API will never accept this batch (an unknown name, a validation error, a 403 on this endpoint): dropped, not retried.
                        queue.removeThrough(batch.last().seq)
                        notify { listener.onEventsDropped(batch.size, "http $status") }
                        backoff.reset()
                        postNextBatch()
                    }
                }
            }
        }
    }

    private fun postNextBatch() {
        if (queue.size == 0 || nextBatchPosted) return
        nextBatchPosted = true
        scheduler.execute {
            nextBatchPosted = false
            safely { pump() }
        }
    }

    private fun scheduleRetry(status: Int?, retryAfterMs: Long? = null) {
        if (retry != null || retired()) return
        val delay = RetryAfter.delay(backoff.next(), status, retryAfterMs)
        notify { listener.onEventsRetry(delay, status, queue.size) }
        retry = scheduler.schedule(delay) {
            retry = null
            safely { pump() }
        }
    }

    private fun cancelRetry() {
        retry?.cancel()
        retry = null
    }

    private fun post(task: () -> Unit) {
        scheduler.execute { safely(task) }
    }

    private inline fun safely(task: () -> Unit) {
        try {
            task()
        } catch (_: RuntimeException) {
            // never kill the worker; the next event retries
        }
    }

    private inline fun notify(block: () -> Unit) {
        try {
            block()
        } catch (_: RuntimeException) {
        }
    }

    companion object {
        /** The most events one request carries (contract section 2). */
        const val MAX_BATCH = 100
    }
}
