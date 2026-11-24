import Foundation

/// The sender state machine: queue first, then send, one request per fix.
///
/// Two modes (`Config.discardOlderOnSuccess`):
/// - "latest wins" (default): it always attempts the NEWEST queued fix; a 2xx removes that fix and every
///   older one (fixes that arrived while the request was in flight are newer and stay); a fix whose
///   timestamp is older than the last one sent successfully is dropped on arrival; a retry picks the
///   newest fix at that moment.
/// - `false`: first in first out, the whole route in order.
/// The rules below hold in both (a drop case removes only that fix).
///
/// - 2xx: the fix is removed, the next one is sent, the backoff resets.
/// - network error, 5xx, 408 and 429: the fix stays, a retry is scheduled by the `Backoff` (a network
///   error raises no `onHttp` event: there was no answer); it is also tried at once on
///   `connectivityRestored()`, `flush()` or a new fix.
/// - 401: sending stops, the queue stays, `unauthorized` is reported once, until `updateHeaders(_:)`
///   brings headers different from the current ones (then it resumes).
/// - any other 4xx, and 1xx / 3xx: that fix is dropped (the server will never accept it) and sending goes on.
///
/// - `Config.minSendIntervalMs` (default 0 = off) is a floor between the START of two requests, measured with the
///   scheduler's monotonic clock (a retry is a request). Within the interval nothing is sent: the fixes stay in the
///   queue (persisted, as always) and a timer, not a new fix, makes the request when it elapses, with the newest
///   fix of that moment in "latest wins" (oldest first, one per interval, with the option off). The retry backoff,
///   a new fix, `connectivityRestored()` and `flush()` all go through the same gate; the request is made at the
///   later of the backoff and the interval. `stop()` and a 401 cancel the timer. The timer is the one the backoff
///   uses (`DispatchScheduler`): it runs while the location updates keep the process alive.
///
/// Nothing is sent before `configure(_:)` and `start()`, or after `stop()`.
///
/// Threading: every state change runs on one private serial queue; every public method may be
/// called from any thread. Callbacks of the delegate run on that queue.
public final class LocationSender {
    public weak var delegate: LocationEventDelegate?
    /// Hears the events lane (the platform layer writes its log lines). See `EventsListener`.
    public weak var eventsListener: EventsListener? {
        didSet { eventLane.listener = eventsListener }
    }
    /// Called on the worker right before `unauthorized` is reported (once per set of headers). The service records
    /// `tracking_stopped` with reason `session_revoked` here.
    var revokedHook: (() -> Void)?

    private let queue = DispatchQueue(label: "co.ordering.driverlocation.sender")
    private let queueKey = DispatchSpecificKey<Void>()
    private let store: LocationQueue
    private let transport: HTTPTransport
    private let scheduler: Scheduler
    private let mockPolicy: MockPolicy
    private let eventQueue: EventQueue
    /// The events lane (`EventSender`): shares this sender's serial queue, transport and headers. Set at the end of `init`.
    private var eventLane: EventSender!
    /// The 401 was reported to the delegate and the headers have not changed since (report once).
    private var unauthorizedReported = false

    // Everything below is touched only on `queue`.
    private var config: Config?
    private var headers: [String: String] = [:]
    private var builder = LocationBodyBuilder(extras: [:])
    private var tracking = false
    private var inFlight = false
    private var unauthorizedLatched = false
    private var headersGeneration = 0
    private var backoff = Backoff()
    private var retry: Cancellable?
    /// The timer that makes a request once the minimum send interval has elapsed.
    private var intervalWake: Cancellable?
    /// `scheduler.monotonic` when the previous request STARTED; nil before the first one.
    private var lastRequestStartedAt: TimeInterval?
    private var lastHttpStatus: Int?
    private var lastLocationAt: Date?
    private var lastSentTimestamp: Date?
    private var authorization: LocationAuthorization = .notDetermined
    private var servicesEnabled = true

    // Work posted and not finished: lets tests wait for the chain of hops to end.
    private let pendingLock = NSLock()
    private var pending = 0

    /// - Parameter queueDirectory: where the persisted queue lives (injected; the app passes a folder
    ///   of Application Support).
    public init(queueDirectory: URL,
                transport: HTTPTransport,
                scheduler: Scheduler = DispatchScheduler(),
                mockPolicy: MockPolicy,
                maxQueue: Int = Config.defaultMaxQueue,
                maxEvents: Int = EventQueue.defaultMaxEvents) {
        self.store = LocationQueue(directory: queueDirectory, maxQueue: maxQueue)
        self.eventQueue = EventQueue(directory: queueDirectory, maxEvents: maxEvents)
        self.transport = transport
        self.scheduler = scheduler
        self.mockPolicy = mockPolicy
        queue.setSpecific(key: queueKey, value: ())
        self.eventLane = EventSender(
            config: { [weak self] in self?.config },
            transport: transport, queue: eventQueue, scheduler: scheduler,
            post: { [weak self] work in self?.post(work) },
            positionsBusy: { [weak self] in self?.inFlight ?? false },
            onRevoked: { [weak self] _ in
                guard let self = self, self.tracking else { return }
                self.reportUnauthorized()
            })
    }

    // MARK: - Public API

    /// Sets the endpoint, headers, extras and bound. Another endpoint than the one the queue was filled
    /// for (another driver) clears the queue. New headers resume a 401 stop. Never touches location updates.
    public func configure(_ newConfig: Config) {
        post {
            let previous = self.config
            let intervalChanged = previous != nil && previous?.minSendIntervalMs != newConfig.minSendIntervalMs
            let waiting = self.intervalWake != nil
            self.config = newConfig
            self.builder = LocationBodyBuilder(extras: newConfig.extras, sendLocationAt: newConfig.sendLocationAt)
            self.store.setMaxQueue(newConfig.maxQueue)
            let owner = newConfig.url.absoluteString
            if let stored = self.store.owner, stored != owner { self.store.removeAll() }
            self.store.setOwner(owner)
            if let eventsOwner = newConfig.eventsOwner { self.eventQueue.claim(eventsOwner) } // another driver's events are not ours
            let eventsChanged = previous?.eventsUrl != newConfig.eventsUrl
            let headersChanged = newConfig.headers != self.headers
            self.headers = newConfig.headers
            if headersChanged { self.headersGeneration += 1 }
            if intervalChanged && waiting { self.cancelIntervalWake() } // work the wait out again with the new interval
            if previous == nil || headersChanged { self.resumeAfterNewHeaders() }
            else { self.trySend() }
            if headersChanged { self.eventLane.headersChangedOnWorker() } else if eventsChanged { self.eventLane.configChangedOnWorker() }
        }
    }

    /// Replaces the headers (a new token). The location updates are not restarted. Headers equal to
    /// the current ones change nothing (a 401 stays latched).
    public func updateHeaders(_ newHeaders: [String: String]) {
        post {
            guard newHeaders != self.headers else { return }
            self.headers = newHeaders
            self.headersGeneration += 1
            if let config = self.config, let updated = try? config.replacingHeaders(newHeaders) {
                self.config = updated
            }
            self.resumeAfterNewHeaders()
            self.eventLane.headersChangedOnWorker()
        }
    }

    public func start() {
        post {
            self.tracking = true
            self.trySend()
        }
    }

    public func stop() {
        post {
            self.tracking = false
            self.cancelRetry()
            self.cancelIntervalWake()
        }
    }

    /// A fix from the platform: mock policy, then queue, then send.
    public func submit(_ fix: LocationFix) {
        post {
            guard self.tracking, let config = self.config else { return }
            guard fix.isValid else { return }
            if config.discardOlderOnSuccess, let lastSent = self.lastSentTimestamp, fix.timestamp < lastSent {
                return // never go back in time
            }
            switch self.mockPolicy.evaluate(fix, rejectMock: config.rejectMock) {
            case .reject:
                self.delegate?.onState(.mockRejected)
            case .accept(let accepted):
                self.accept(queued: accepted, reported: accepted)
            case .acceptAsReal(let original):
                var asReal = original
                asReal.mock = false // what is queued and sent; the event below keeps the truth
                self.accept(queued: asReal, reported: original)
            }
        }
    }

    /// The network is back: try at once (the backoff sequence is not reset).
    public func connectivityRestored() {
        post {
            self.cancelRetry()
            self.trySend()
            self.eventLane.restoredOnWorker()
        }
    }

    /// Try to send the queue now.
    public func flush() {
        post {
            self.cancelRetry()
            self.trySend()
            self.eventLane.flushOnWorker()
        }
    }

    // MARK: - The events lane

    /// Stores one event and sends it with the positions' headers. Ignored when there is no `Config.eventsUrl`. Any thread. It never
    /// delays a position: it runs on this same queue, one batch at a time, after the positions' own.
    public func record(_ event: TrackingEvent) {
        eventLane.record(event)
    }

    /// `record` for code that already runs on the worker (`performOnWorker`): stores the event at once, in order.
    public func recordOnWorker(_ event: TrackingEvent) {
        eventLane.append(event)
    }

    /// Runs `work` on this sender's serial queue (the recorder's worker).
    public func performOnWorker(_ work: @escaping () -> Void) {
        post(work)
    }

    /// The sender's clocks, for the recorder that feeds `record`.
    public var clock: Scheduler { return scheduler }

    /// Events waiting to be sent.
    public var queuedEvents: Int { return eventQueue.count }

    public func clearQueue() {
        post { self.store.removeAll() }
    }

    /// From the location adapter.
    public func setAuthorization(_ value: LocationAuthorization) {
        post {
            guard value != self.authorization else { return }
            self.authorization = value
            self.delegate?.onState(.authorizationChanged)
        }
    }

    /// From the location adapter.
    public func setServicesEnabled(_ value: Bool) {
        post {
            guard value != self.servicesEnabled else { return }
            self.servicesEnabled = value
            self.delegate?.onState(value ? .servicesEnabled : .servicesDisabled)
        }
    }

    /// A snapshot. Callable from any thread, also from a delegate callback.
    public func state() -> LocationState {
        return onQueue {
            LocationState(enabled: self.config != nil,
                          tracking: self.tracking,
                          queued: self.store.count,
                          lastHttpStatus: self.lastHttpStatus,
                          lastLocationAt: self.lastLocationAt,
                          authorization: self.authorization,
                          servicesEnabled: self.servicesEnabled)
        }
    }

    // MARK: - Internals (on `queue`)

    private func accept(queued: LocationFix, reported: LocationFix) {
        store.append(queued)
        lastLocationAt = scheduler.now
        delegate?.onLocationAccepted(reported)
        cancelRetry() // a new fix is tried at once
        trySend()
    }

    private func resumeAfterNewHeaders() {
        unauthorizedLatched = false
        unauthorizedReported = false
        backoff.reset()
        cancelRetry()
        trySend()
    }

    private func cancelRetry() {
        retry?.cancel()
        retry = nil
    }

    private func cancelIntervalWake() {
        intervalWake?.cancel()
        intervalWake = nil
    }

    /// Seconds still to wait before a request may start (0 = now). Monotonic; 0 when the option is off.
    private func intervalWait(_ config: Config) -> TimeInterval {
        guard config.minSendIntervalMs > 0, let last = lastRequestStartedAt else { return 0 }
        let minimum = TimeInterval(config.minSendIntervalMs) / 1000
        let now = scheduler.monotonic
        let elapsed = now - last
        if elapsed < 0 {
            // A clock that went back (it should not): count the interval from now, so the wait is ONE whole interval and not
            // "until the clock catches up with the old reading".
            lastRequestStartedAt = now
            return minimum
        }
        return elapsed >= minimum ? 0 : minimum - elapsed
    }

    /// The positions first; then, on the same queue, one batch of events.
    private func trySend() {
        trySendPositions()
        eventLane.pump()
    }

    /// Reports `unauthorized` to the delegate once per set of headers (either lane may be the first to see the 401).
    private func reportUnauthorized() {
        guard !unauthorizedReported else { return }
        unauthorizedReported = true
        revokedHook?()
        delegate?.onState(.unauthorized)
    }

    private func trySendPositions() {
        guard tracking, !unauthorizedLatched, !inFlight, let config = config,
              let entry = (config.discardOlderOnSuccess ? store.last : store.first) else { return }
        let wait = intervalWait(config)
        if wait > 0 {
            // Too soon after the previous request: keep the queue, make the request when the interval has elapsed.
            if intervalWake == nil {
                delegate?.onSendDeferred(delay: wait, queued: store.count)
                intervalWake = scheduler.schedule(after: wait) { [weak self] in
                    self?.post {
                        self?.intervalWake = nil
                        self?.trySend()
                    }
                }
            }
            return
        }
        lastRequestStartedAt = scheduler.monotonic
        inFlight = true
        let json = builder.jsonString(for: entry.fix)
        let body = Data(json.utf8)
        let generation = headersGeneration
        delegate?.onRequest(body: json, queued: store.count)
        transport.send(url: config.url, headers: headers, body: body) { [weak self] result in
            self?.post { self?.handle(result, for: entry, generation: generation) }
        }
    }

    private func handle(_ result: TransportResult, for entry: QueueEntry, generation: Int) {
        inFlight = false
        switch result {
        case .networkError:
            // No answer: no onHttp event, lastHttpStatus keeps the last real answer.
            scheduleRetry(status: nil)
            eventLane.pump() // the events that waited for this request (a stop's `tracking_stopped` included)
        case .response(let status, let retryAfter):
            lastHttpStatus = status
            switch status {
            case 200..<300:
                if config?.discardOlderOnSuccess == true {
                    let older = store.removeThrough(seq: entry.seq) - 1 // the sent one is not a discard
                    if older > 0 { delegate?.onDiscarded(count: older) }
                    if lastSentTimestamp.map({ entry.fix.timestamp > $0 }) ?? true {
                        lastSentTimestamp = entry.fix.timestamp
                    }
                } else {
                    store.remove(id: entry.id)
                }
                backoff.reset()
                delegate?.onHttp(success: true, status: status)
                trySend()
            case 401 where generation != headersGeneration:
                // Answer to a request made with the old token: the new headers have not been tried yet.
                delegate?.onHttp(success: false, status: status)
                trySend()
            case 401:
                delegate?.onHttp(success: false, status: status)
                if !unauthorizedLatched {
                    unauthorizedLatched = true
                    cancelRetry()
                    cancelIntervalWake()
                    reportUnauthorized()
                }
            case 408, 429, 500..<600:
                // Timeout, rate limit, server trouble: the fix is fine, try again later.
                delegate?.onHttp(success: false, status: status)
                scheduleRetry(status: status, retryAfter: retryAfter)
                eventLane.pump() // the events lane has its own state: a failed position does not make them wait
            default:
                // Any other 4xx, and 1xx / 3xx (redirects are never followed): it will never be accepted.
                store.remove(id: entry.id)
                delegate?.onHttp(success: false, status: status)
                trySend()
            }
        }
    }

    private func scheduleRetry(status: Int?, retryAfter: TimeInterval? = nil) {
        guard tracking, !unauthorizedLatched, retry == nil else { return }
        let delay = RetryAfter.delay(backoff: backoff.nextDelay(), status: status, retryAfter: retryAfter)
        delegate?.onRetryScheduled(delay: delay, status: status, queued: store.count)
        retry = scheduler.schedule(after: delay) { [weak self] in
            self?.post {
                self?.retry = nil
                self?.trySend()
            }
        }
    }

    // MARK: - Queue plumbing

    private func post(_ work: @escaping () -> Void) {
        pendingLock.lock(); pending += 1; pendingLock.unlock()
        queue.async {
            work()
            self.pendingLock.lock(); self.pending -= 1; self.pendingLock.unlock()
        }
    }

    private func onQueue<T>(_ work: () -> T) -> T {
        if DispatchQueue.getSpecific(key: queueKey) != nil { return work() }
        return queue.sync(execute: work)
    }

    /// Blocks until every posted piece of work (and the work it posted) has run. For tests.
    func waitUntilIdle() {
        while true {
            queue.sync {}
            pendingLock.lock(); let n = pending; pendingLock.unlock()
            if n == 0 { return }
        }
    }
}
