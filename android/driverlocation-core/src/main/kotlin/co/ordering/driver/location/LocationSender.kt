package co.ordering.driver.location

/** Kinds of `onState` events (the JS `onState` payload carries [wire]). */
enum class StateKind(val wire: String) {
    /** A mock location was dropped (always in release; in debug when `rejectMock` is set). */
    MOCK_REJECTED("mock_rejected"),

    /** The API answered 401: sending stopped, the queue is kept; reported once. */
    UNAUTHORIZED("unauthorized")
}

/**
 * Events of the sender. Called on the sender's worker thread, never while the sender holds
 * a lock; an exception thrown by a callback is swallowed. All methods default to no-ops.
 */
interface SenderListener {
    /** The API answered [status] ([success] = 2xx). Not called for network errors (no answer). */
    fun onHttp(success: Boolean, status: Int) {}

    /** A fix passed the mock policy and was queued. */
    fun onLocationAccepted(fix: LocationFix) {}

    fun onState(kind: StateKind) {}

    /**
     * A request is about to be made: [body] is the exact JSON (already built for the request, so
     * passing it costs nothing; a release build must not log it), [queued] what the queue holds.
     */
    fun onRequest(body: String, queued: Int) {}

    /** A retry was scheduled in [delayMs]; [status] is the answer that caused it, null for a network error. */
    fun onRetryScheduled(delayMs: Long, status: Int?, queued: Int) {}

    /**
     * "Latest wins": a successful request dropped [count] (> 0) older queued positions. A bare
     * number, so the call costs nothing on the hot path; the listener decides to write one log line.
     * Nothing is reported to JavaScript.
     */
    fun onDiscarded(count: Int) {}

    /**
     * A request is due but the minimum send interval ([Config.minSendIntervalMs]) has not elapsed: it
     * will be made in [delayMs] with the newest fix of that moment. Called once per wait, not per fix.
     */
    fun onSendDeferred(delayMs: Long, queued: Int) {}
}

/** Snapshot for `getState()`. [lastHttpStatus] and [lastLocationAt] are null until they exist. */
data class SenderState(
    val queued: Int,
    val lastHttpStatus: Int?,
    val lastLocationAt: Long?,
    val tracking: Boolean,
    /** True from the 401 until `updateHeaders` brings new headers. */
    val unauthorized: Boolean
)

/**
 * What turns on the second lane of the sender, the tracking events (docs/LOCATION_MODULE.md, "Tracking events"): the
 * persisted [queue] and the [listener] that writes their log lines. The lane sends only while [Config.eventsUrl] is set.
 */
class EventsSetup(
    val queue: EventQueue,
    val listener: EventsListener = object : EventsListener {},
    val backoff: Backoff = Backoff()
)

/**
 * The sending state machine (docs/LOCATION_MODULE.md §3). Every public method may be
 * called from any thread; the work runs on the [Scheduler]'s single worker, so fixes keep
 * their arrival order and a request is never made concurrently with another.
 *
 * - [onFix]: dropped unless started; invalid coordinates are ignored; a mock fix is dropped
 *   (`mock_rejected`: always in release, in debug with `rejectMock`; otherwise sent as a real one); in "latest wins" mode a fix older than the last one
 *   sent successfully is dropped; otherwise queued (`onLocationAccepted`) and the queue is
 *   sent at once.
 * - Sending, one request per attempt. With [Config.discardOlderOnSuccess] false: oldest
 *   first, 2xx removes that fix, the whole route goes out in order. With it true (default,
 *   "latest wins"): the NEWEST queued fix is sent, and 2xx removes it and every older one
 *   (newer ones, queued meanwhile, stay and the newest of them goes next).
 *   Network error, 5xx, 408 or 429: the queue is kept, retry after the [Backoff] delay, or
 *   at once on [onConnectivityRestored] / [flush] / a new fix (in "latest wins", the
 *   newest fix of that moment is the one sent). 401: stop, keep the queue, report
 *   [StateKind.UNAUTHORIZED] once, until [updateHeaders] brings different headers. Any other
 *   4xx (and 1xx/3xx, which can never be accepted) drops only that fix and goes on.
 * - [Config.minSendIntervalMs] (default 0 = off) is a floor between the START of two requests, measured with
 *   the scheduler's monotonic clock (a retry is a request). Within the interval nothing is sent: the fixes
 *   stay in the queue (persisted as always) and a timer, not a new fix, makes the request when it elapses,
 *   with the newest fix of that moment in "latest wins" (oldest first, one per interval, with the option
 *   off). Retry backoff, new fixes, [onConnectivityRestored] and [flush] all go through the same gate; the
 *   request is made at the later of the backoff and the interval. [stop] and a 401 cancel the timer.
 * - The persisted queue belongs to the configured url: created, or [updateConfig]'d, with a
 *   different url than the stored owner, it is cleared before anything is sent.
 * - [stop] keeps the queue (on disk) and sends nothing until [start] again.
 * - Nothing here restarts location updates: [updateHeaders] / [updateConfig] only swap what
 *   the next request uses.
 */
class LocationSender(
    config: Config,
    private val transport: HttpTransport,
    private val queue: LocationQueue,
    private val mockPolicy: MockPolicy,
    private val scheduler: Scheduler,
    private val listener: SenderListener = object : SenderListener {},
    private val backoff: Backoff = Backoff(),
    events: EventsSetup? = null
) {
    // Written by the worker (and the constructor), read by the worker only.
    private var config: Config = config

    /** The events lane (null = the module was built without it). Shares this sender's worker, transport and headers. */
    private val eventLane: EventSender? = events?.let {
        EventSender(
            config = { this.config },
            transport = transport,
            queue = it.queue,
            scheduler = scheduler,
            listener = it.listener,
            backoff = it.backoff,
            currentHeaders = { latestHeaders },
            retired = { retired },
            onRevoked = { _ -> if (tracking) reportUnauthorized() }
        )
    }
    private val eventQueue: EventQueue? = events?.queue

    /** The 401 was reported to the listener and the headers have not changed since (report once). */
    private var unauthorizedReported = false
    private var retry: Cancellable? = null

    /** The timer that makes a request once the minimum send interval has elapsed (worker only). */
    private var intervalWake: Cancellable? = null

    /** Monotonic time ([Scheduler.nowMillis]) at which the previous request STARTED; null before the first (worker only). */
    private var lastRequestStartedAt: Long? = null

    /** Timestamp of the newest fix the server accepted (worker only; kept across stop/start). */
    private var lastSentTimestamp: Long? = null

    /**
     * The headers the NEXT request must carry, set at once by [updateHeaders] / [updateConfig] on the caller's thread: the
     * worker blocks in an HTTP call, so the change itself is applied behind it. A 401 answered to a request made with other
     * headers than these belongs to a token that was already replaced (iOS's `headersGeneration`): it revokes nothing.
     */
    @Volatile private var latestHeaders: Map<String, String> = config.headers

    /** [retire] was called: the service that owns this sender is gone. No timer is set any more. */
    @Volatile private var retired = false

    // Visible to state() from any thread.
    @Volatile private var tracking = false
    @Volatile private var unauthorized = false
    @Volatile private var lastHttpStatus = 0
    @Volatile private var lastLocationAt = -1L

    init {
        BodyBuilder.checkExtras(config.extras, config.sendLocationAt)
        queue.claim(config.url) // another driver's leftovers are discarded before anything is sent
        queue.setMaxQueue(config.maxQueue)
        claimEvents(config) // the same for the events (nothing is read or written without an events url)
    }

    /**
     * The events lane (docs/LOCATION_MODULE.md, "Tracking events"): stores one event and sends it with the positions'
     * headers. Ignored when there is no [Config.eventsUrl] or the sender was built without the lane. Any thread. Never
     * delays a position: the events request runs on this same worker, one batch at a time, after the positions' own.
     */
    fun record(event: TrackingEvent) {
        eventLane?.record(event)
    }

    /**
     * [record] for code that already runs on [worker] (the recorder does): stores the event at once, in order, instead of
     * posting another task behind whatever else is queued.
     */
    fun recordOnWorker(event: TrackingEvent) {
        eventLane?.recordOnWorker(event)
    }

    /** Events waiting to be sent (0 without the lane). */
    val queuedEvents: Int get() = eventQueue?.size ?: 0

    /** The sender's clock and worker, for the recorder that feeds [record]. */
    val worker: Scheduler get() = scheduler

    fun state(): SenderState = SenderState(
        queued = queue.size,
        lastHttpStatus = lastHttpStatus.takeIf { it != 0 },
        lastLocationAt = lastLocationAt.takeIf { it >= 0 },
        tracking = tracking,
        unauthorized = unauthorized
    )

    /** Starts sending, and sends whatever the queue still holds (e.g. from a previous run). */
    fun start() {
        tracking = true
        post { pump() }
    }

    /**
     * Stops sending positions; the queue is kept. A pending retry is cancelled. The events lane is not stopped: it
     * still sends what was recorded (the `tracking_stopped` of this very stop) until the worker is shut down.
     */
    fun stop() {
        tracking = false
        post {
            cancelRetry()
            cancelIntervalWake()
        }
    }

    /**
     * The service that owns this sender ends. What is queued on the worker (the `tracking_stopped` event and its send) still
     * runs; no retry or timer is set from now on, so nothing of this sender is left behind on a worker the next service shares
     * (what could not be sent stays on disk for the next start). Call it BEFORE the final events are recorded. Any thread.
     */
    fun retire() {
        retired = true
    }

    /** A fix from the platform. Ignored (not queued) when not started. */
    fun onFix(fix: LocationFix) {
        post {
            if (!tracking || !fix.isValid) return@post
            val decision = mockPolicy.decide(fix, config.rejectMock)
            if (decision == MockPolicy.Decision.REJECT) {
                notify { listener.onState(StateKind.MOCK_REJECTED) }
                return@post
            }
            // A debug build sends a simulated fix as a real one; the event below keeps the truth.
            val queued = if (decision == MockPolicy.Decision.ACCEPT_AS_REAL) fix.copy(mock = false) else fix
            // Latest wins: never go back in time (older than what the server already has).
            val last = lastSentTimestamp
            if (config.discardOlderOnSuccess && last != null && fix.timestamp < last) return@post
            queue.add(queued)
            lastLocationAt = fix.timestamp
            notify { listener.onLocationAccepted(fix) }
            cancelRetry()
            pump()
        }
    }

    /** The network is back: forget the backoff and try now. */
    fun onConnectivityRestored() {
        post {
            backoff.reset()
            cancelRetry()
            eventLane?.restoredOnWorker()
            pump()
        }
    }

    /** Try to send the queue now (JS `flush()`), the positions and then the events. */
    fun flush() {
        post {
            cancelRetry()
            eventLane?.flushOnWorker()
            pump()
        }
    }

    /**
     * Replaces the request headers (a new token) without restarting anything. If the sender
     * was stopped by a 401 and the headers differ from the rejected ones, it resumes.
     * @throws ConfigException if a header is not valid.
     */
    fun updateHeaders(headers: Map<String, String>) {
        val problems = Config.headerProblems(headers)
        if (problems.isNotEmpty()) throw ConfigException(problems)
        val copy = LinkedHashMap(headers)
        latestHeaders = copy
        post { applyConfig(config.withHeaders(copy)) }
    }

    /**
     * Replaces url, headers, extras and maxQueue (`configure` called again). Distance filter,
     * intervals and notification are the platform layer's business: it applies them itself.
     */
    fun updateConfig(newConfig: Config) {
        BodyBuilder.checkExtras(newConfig.extras, newConfig.sendLocationAt)
        latestHeaders = newConfig.headers
        post { applyConfig(newConfig) }
    }

    // ---- worker side ----

    private fun applyConfig(newConfig: Config) {
        val headersChanged = newConfig.headers != config.headers
        val intervalChanged = newConfig.minSendIntervalMs != config.minSendIntervalMs
        val eventsChanged = newConfig.eventsUrl != config.eventsUrl
        val waiting = intervalWake != null
        config = newConfig
        claimEvents(newConfig)
        if (headersChanged) unauthorizedReported = false
        if (queue.claim(newConfig.url)) {
            // A different endpoint (another driver): what was pending is not ours to send.
            cancelRetry()
            lastSentTimestamp = null
        }
        queue.setMaxQueue(newConfig.maxQueue)
        if (unauthorized && headersChanged) {
            unauthorized = false
            backoff.reset()
            cancelRetry()
            pump()
        } else if (intervalChanged && waiting) {
            // A send was waiting for the old interval: work out the wait again with the new one.
            cancelIntervalWake()
            pump()
        }
        if (headersChanged) eventLane?.onHeadersChanged() else if (eventsChanged) eventLane?.onConfigChanged()
    }

    /** The events queue belongs to the driver (the positions' url) and the endpoint: another owner clears it. */
    private fun claimEvents(cfg: Config) {
        val owner = cfg.eventsOwner ?: return
        eventQueue?.claim(owner)
    }

    /** Reports `unauthorized` to the listener once per set of headers (either lane may be the first to see the 401). */
    private fun reportUnauthorized() {
        if (unauthorizedReported) return
        unauthorizedReported = true
        notify { listener.onState(StateKind.UNAUTHORIZED) }
    }

    /** The positions first; then, on the same worker, one batch of events. */
    private fun pump() {
        pumpPositions()
        eventLane?.pump()
    }

    private fun pumpPositions() {
        while (tracking && !unauthorized) {
            val cfg = config
            val latestWins = cfg.discardOlderOnSuccess
            val entry = (if (latestWins) queue.peekLastEntry() else queue.peekFirstEntry()) ?: return
            val fix = entry.fix
            val wait = intervalWaitMs(cfg)
            if (wait > 0) {
                // Too soon after the previous request: keep the queue, make the request when the interval has elapsed.
                if (intervalWake == null) {
                    notify { listener.onSendDeferred(wait, queue.size) }
                    intervalWake = scheduler.schedule(wait) {
                        intervalWake = null
                        safely { pump() }
                    }
                }
                return
            }
            lastRequestStartedAt = scheduler.nowMillis()
            val sentWith = cfg.headers
            val body = BodyBuilder.build(fix, cfg.extras, cfg.sendLocationAt)
            notify { listener.onRequest(body, queue.size) }
            val result = try {
                transport.post(cfg.url, cfg.headers, body)
            } catch (e: RuntimeException) {
                HttpResult.NetworkError(e.javaClass.simpleName)
            }
            when (result) {
                is HttpResult.NetworkError -> {
                    scheduleRetry(null)
                    return
                }
                is HttpResult.Response -> {
                    val status = result.status
                    lastHttpStatus = status
                    val ok = status in 200..299
                    notify { listener.onHttp(ok, status) }
                    when {
                        ok -> {
                            // Latest wins: older queued fixes are discarded with it. Newer ones stay.
                            if (latestWins) {
                                val older = queue.removeThrough(entry.seq) - 1 // the sent one is not a discard
                                if (older > 0) notify { listener.onDiscarded(older) }
                            } else {
                                queue.remove(entry.seq)
                            }
                            lastSentTimestamp = maxOf(lastSentTimestamp ?: Long.MIN_VALUE, fix.timestamp)
                            backoff.reset()
                        }
                        status == 401 && !tracking -> {
                            // Stopped while the request was in flight (a logout, a driver off shift): nobody is left to tell, and
                            // a later session has its own token. The queue is kept; nothing is latched or reported.
                            return
                        }
                        status == 401 && latestHeaders != sentWith -> {
                            // The answer to a request made with a token that was replaced meanwhile: the new headers have not
                            // been tried yet. Try them (behind the change itself, which is already queued on this worker).
                            post { pump() }
                            return
                        }
                        status == 401 -> {
                            unauthorized = true
                            cancelRetry()
                            cancelIntervalWake()
                            reportUnauthorized()
                            return
                        }
                        status in 500..599 || status == 408 || status == 429 -> {
                            // The server's own trouble, a timeout or a rate limit: the same fix later.
                            scheduleRetry(status, result.retryAfterMs)
                            return
                        }
                        else -> {
                            // Any other 4xx (and 1xx/3xx): it will never be accepted.
                            queue.remove(entry.seq)
                            backoff.reset()
                        }
                    }
                }
            }
        }
    }

    /** Milliseconds still to wait before a request may start (0 = now). Monotonic; 0 when the option is off. */
    private fun intervalWaitMs(cfg: Config): Long {
        val min = cfg.minSendIntervalMs
        if (min <= 0) return 0
        val last = lastRequestStartedAt ?: return 0
        val now = scheduler.nowMillis()
        val elapsed = now - last
        return when {
            elapsed < 0 -> {
                // A clock that went back (it should not): count the interval from now, so the wait is ONE whole interval and
                // not "until the clock catches up with the old reading".
                lastRequestStartedAt = now
                min
            }
            elapsed >= min -> 0
            else -> min - elapsed
        }
    }

    private fun cancelIntervalWake() {
        intervalWake?.cancel()
        intervalWake = null
    }

    private fun scheduleRetry(status: Int?, retryAfterMs: Long? = null) {
        if (retry != null || !tracking || retired) return
        val delay = RetryAfter.delay(backoff.next(), status, retryAfterMs)
        notify { listener.onRetryScheduled(delay, status, queue.size) }
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
}
