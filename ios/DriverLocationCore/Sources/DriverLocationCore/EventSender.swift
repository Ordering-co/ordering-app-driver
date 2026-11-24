import Foundation

/// What the events sender tells the platform layer, which writes the log lines (the core never logs). Called on the
/// sender's serial queue: return quickly. All methods default to no-ops.
public protocol EventsListener: AnyObject {
    /// An event was stored in the queue; `queued` is what it holds now (the event's JSON is never passed: it is not for a log).
    func onEventRecorded(event: String, queued: Int)
    /// A request is about to be made with `count` events; `queued` is what the queue holds.
    func onEventsRequest(count: Int, queued: Int)
    /// The API answered `status` to a request of `count` events (any status).
    func onEventsHttp(status: Int, count: Int)
    /// A retry was scheduled after `delay` seconds; `status` is the answer that caused it, nil for a network error.
    func onEventsRetry(delay: TimeInterval, status: Int?, queued: Int)
    /// `count` events will never be sent: `why` is `queue full` (the cap dropped the oldest) or `http NNN` (a 4xx the API will not accept, 403 included).
    func onEventsDropped(count: Int, why: String)
}

public extension EventsListener {
    func onEventRecorded(event: String, queued: Int) {}
    func onEventsRequest(count: Int, queued: Int) {}
    func onEventsHttp(status: Int, count: Int) {}
    func onEventsRetry(delay: TimeInterval, status: Int?, queued: Int) {}
    func onEventsDropped(count: Int, why: String) {}
}

/// The second lane of the sender: the tracking events (docs/LOCATION_MODULE.md, "Tracking events"). It runs on the same
/// serial queue as the positions (`post`), so state changes never overlap, and the positions come first: it never starts a
/// request while a position request is in flight (`positionsBusy`), and it sends ONE batch per task and posts itself for the
/// next, so a position that arrives meanwhile runs before it.
///
/// Request: `POST` `Config.eventsUrl` with the SAME headers as the positions, `{"events":"[...]"}` (the array as a JSON string), at most `maxBatch` events,
/// oldest first, through the same `HTTPTransport`. 2xx removes the batch. Only 401 means the session is
/// revoked: this lane stops, keeps the queue and calls `onRevoked` (the sender reports `unauthorized` once per set of headers,
/// whichever lane sees the 401 first); new headers resume it. 403 is "this endpoint refuses these events" (a proxy, a firewall,
/// a permissions rule on this one endpoint), NOT a revoked session: like any other 4xx (and 1xx/3xx) it drops THAT batch (the
/// API will not accept it) with one `onEventsDropped` (`http 403`), the lane keeps working and nobody is signed out. Network error, 5xx, 408, 429: kept, retried with the `Backoff`
/// (5 s, 15 s, 60 s, then 60 s), and at once on `connectivityRestored` / `flush` / a new event. With no `Config.eventsUrl` nothing
/// is recorded, written or sent. It works whether or not the positions' sender is started: the `tracking_stopped` event is
/// recorded after the stop.
public final class EventSender {
    /// The most events one request carries (contract section 2).
    public static let maxBatch = 100

    public weak var listener: EventsListener?

    private let config: () -> Config?
    private let transport: HTTPTransport
    private let queue: EventQueue
    private let scheduler: Scheduler
    private let post: (@escaping () -> Void) -> Void
    private let positionsBusy: () -> Bool
    private let onRevoked: (Int) -> Void

    // Worker only.
    private var backoff = Backoff()
    private var retry: Cancellable?
    private var revoked = false
    private var inFlight = false
    private var nextBatchPosted = false
    private var headersGeneration = 0

    /// - Parameters:
    ///   - config: the current configuration, read on the worker (nil = nothing to send yet).
    ///   - post: runs a block on the worker (the sender's serial queue).
    ///   - positionsBusy: true while a position request is in flight (events wait for it).
    ///   - onRevoked: called on the worker with the 401 status (only a 401 revokes the session).
    public init(config: @escaping () -> Config?, transport: HTTPTransport, queue: EventQueue, scheduler: Scheduler,
                post: @escaping (@escaping () -> Void) -> Void,
                positionsBusy: @escaping () -> Bool = { false },
                onRevoked: @escaping (Int) -> Void = { _ in }) {
        self.config = config
        self.transport = transport
        self.queue = queue
        self.scheduler = scheduler
        self.post = post
        self.positionsBusy = positionsBusy
        self.onRevoked = onRevoked
    }

    /// Events waiting (any thread).
    public var queued: Int { return queue.count }

    /// Stores an event (when events are on) and tries to send. Any thread.
    public func record(_ event: TrackingEvent) { post { self.append(event) } }

    /// The network is back: forget the backoff and try now.
    public func connectivityRestored() { post { self.restoredOnWorker() } }

    /// Try to send now (the module's `flush()`): a pending retry is cancelled, the backoff is kept.
    public func flush() { post { self.flushOnWorker() } }

    /// Other headers (a new token) resume a lane stopped by a 401.
    public func headersChanged() { post { self.headersChangedOnWorker() } }

    /// The configuration changed (an events url appeared or went).
    public func configChanged() { post { self.configChangedOnWorker() } }

    /// Cancels the retry timer. The events stay on disk.
    public func cancelTimers() { post { self.cancelRetry() } }

    // MARK: - Worker side

    func restoredOnWorker() {
        backoff.reset()
        cancelRetry()
        pump()
    }

    func flushOnWorker() {
        cancelRetry()
        pump()
    }

    func headersChangedOnWorker() {
        revoked = false
        headersGeneration += 1
        backoff.reset()
        cancelRetry()
        pump()
    }

    func configChangedOnWorker() {
        if config()?.eventsUrl == nil { cancelRetry() } else { pump() }
    }

    /// Stores `event`; on the worker.
    func append(_ event: TrackingEvent) {
        guard config()?.eventsUrl != nil else { return }
        let dropped = queue.add(event.toJson())
        if dropped > 0 { listener?.onEventsDropped(count: dropped, why: "queue full") }
        listener?.onEventRecorded(event: event.event, queued: queue.count)
        cancelRetry() // a new event is tried at once
        pump()
    }

    /// One batch; the next is posted behind whatever is already waiting on the worker.
    func pump() {
        guard !revoked, retry == nil, !inFlight, !positionsBusy() else { return }
        guard let cfg = config(), let url = cfg.eventsUrl else { return }
        let batch = queue.peekBatch(EventSender.maxBatch)
        guard let last = batch.last else { return }
        let body = Data(EventJson.body(batch.map { $0.json }).utf8)
        inFlight = true
        listener?.onEventsRequest(count: batch.count, queued: queue.count)
        let generation = headersGeneration
        transport.send(url: url, headers: cfg.headers, body: body) { [weak self] result in
            guard let self = self else { return }
            self.post { self.handle(result, count: batch.count, lastSeq: last.seq, generation: generation) }
        }
    }

    private func handle(_ result: TransportResult, count: Int, lastSeq: UInt64, generation: Int) {
        inFlight = false
        switch result {
        case .networkError:
            scheduleRetry(status: nil)
        case .response(let status, let retryAfter):
            listener?.onEventsHttp(status: status, count: count)
            switch status {
            case 200..<300:
                queue.removeThrough(seq: lastSeq)
                backoff.reset()
                postNextBatch()
            case 401:
                if generation != headersGeneration {
                    // Answer to a request made with the old token: the new headers have not been tried yet.
                    postNextBatch()
                } else {
                    revoked = true
                    cancelRetry()
                    onRevoked(status)
                }
            case 408, 429, 500..<600:
                scheduleRetry(status: status, retryAfter: retryAfter)
            default:
                // The API will never accept this batch (an unknown name, a validation error, a 403 on this endpoint): dropped, not retried.
                queue.removeThrough(seq: lastSeq)
                listener?.onEventsDropped(count: count, why: "http \(status)")
                backoff.reset()
                postNextBatch()
            }
        }
    }

    private func postNextBatch() {
        guard queue.count > 0, !nextBatchPosted else { return }
        nextBatchPosted = true
        post {
            self.nextBatchPosted = false
            self.pump()
        }
    }

    private func scheduleRetry(status: Int?, retryAfter: TimeInterval? = nil) {
        guard retry == nil else { return }
        let delay = RetryAfter.delay(backoff: backoff.nextDelay(), status: status, retryAfter: retryAfter)
        listener?.onEventsRetry(delay: delay, status: status, queued: queue.count)
        retry = scheduler.schedule(after: delay) { [weak self] in
            guard let self = self else { return }
            self.post {
                self.retry = nil
                self.pump()
            }
        }
    }

    private func cancelRetry() {
        retry?.cancel()
        retry = nil
    }
}
