import Foundation
import CoreLocation
@testable import DriverLocationCore

func makeTempDirectory() -> URL {
    let url = FileManager.default.temporaryDirectory
        .appendingPathComponent("DriverLocationCoreTests-\(UUID().uuidString)", isDirectory: true)
    try? FileManager.default.createDirectory(at: url, withIntermediateDirectories: true)
    return url
}

let testURL = "https://api.example.com/v1/en/project/users/42/locations"

/// The default here is FIFO (`discardOlderOnSuccess: false`): most tests follow a whole route in order.
/// `LatestWinsTests` and the "both modes" tests pass `true`.
func makeConfig(token: String = "secret-token", url: String = testURL, maxQueue: Int = 500,
                distanceFilter: Double = 25, discardOlderOnSuccess: Bool = false,
                rejectMock: Bool = false, minSendIntervalMs: Int = 0, sendLocationAt: Bool = false,
                eventsUrl: String? = nil) -> Config {
    return try! Config(url: url, headers: ["Authorization": "Bearer \(token)"],
                       extras: ["driver_id": 42], distanceFilter: distanceFilter, maxQueue: maxQueue,
                       discardOlderOnSuccess: discardOlderOnSuccess, rejectMock: rejectMock,
                       minSendIntervalMs: minSendIntervalMs, sendLocationAt: sendLocationAt, eventsUrl: eventsUrl)
}

/// A fix whose latitude identifies it: lat = index / 1000.
func makeFix(_ index: Int, mock: Bool = false) -> LocationFix {
    return LocationFix(lat: Double(index) / 1000, lng: -122.5, accuracy: 5, speed: 1.5,
                       timestamp: Date(timeIntervalSince1970: 1_700_000_000 + Double(index)), mock: mock)
}

/// Index of the fix a request body carries.
func index(ofBody body: Data) -> Int {
    let object = try! JSONSerialization.jsonObject(with: body) as! [String: Any]
    let location = object["location"] as! [String: Any]
    return Int((location["lat"] as! Double * 1000).rounded())
}

final class FakeTransport: HTTPTransport {
    struct Request {
        let url: URL
        let headers: [String: String]
        let body: Data
        /// The fake's clock when the request started (nil without a clock).
        var at: Date? = nil
    }

    private let lock = NSLock()
    private var _requests: [Request] = []
    private var script: [TransportResult] = []
    private var held: [(TransportResult) -> Void] = []
    private var _fallback: TransportResult = .response(status: 200)
    var clock: (() -> Date)?
    var holdCompletions = false
    var answerOnBackgroundThread = false

    var requests: [Request] { lock.lock(); defer { lock.unlock() }; return _requests }
    var indices: [Int] { return requests.map { index(ofBody: $0.body) } }

    /// Results used one by one; afterwards `fallback`.
    func enqueue(_ results: TransportResult...) {
        lock.lock(); script.append(contentsOf: results); lock.unlock()
    }

    var fallback: TransportResult {
        get { lock.lock(); defer { lock.unlock() }; return _fallback }
        set { lock.lock(); _fallback = newValue; lock.unlock() }
    }

    func send(url: URL, headers: [String: String], body: Data, completion: @escaping (TransportResult) -> Void) {
        lock.lock()
        _requests.append(Request(url: url, headers: headers, body: body, at: clock?()))
        if holdCompletions {
            held.append(completion)
            lock.unlock()
            return
        }
        let result = script.isEmpty ? _fallback : script.removeFirst()
        let background = answerOnBackgroundThread
        lock.unlock()
        if background {
            DispatchQueue.global().async { completion(result) }
        } else {
            completion(result)
        }
    }

    /// Answers the oldest held request.
    func release(_ result: TransportResult) {
        lock.lock()
        let completion = held.isEmpty ? nil : held.removeFirst()
        lock.unlock()
        completion?(result)
    }
}

final class ManualScheduler: Scheduler {
    private final class Token: Cancellable {
        var cancelled = false
        func cancel() { cancelled = true }
    }

    private let lock = NSLock()
    private var items: [(delay: TimeInterval, due: Date, token: Token, work: () -> Void)] = []
    private var _now = Date(timeIntervalSince1970: 1_700_000_000)

    var now: Date {
        get { lock.lock(); defer { lock.unlock() }; return _now }
        set { lock.lock(); _now = newValue; lock.unlock() }
    }

    func schedule(after delay: TimeInterval, _ work: @escaping () -> Void) -> Cancellable {
        let token = Token()
        lock.lock(); items.append((delay, _now.addingTimeInterval(delay), token, work)); lock.unlock()
        return token
    }

    /// Delays of the timers that are scheduled and not cancelled or fired.
    var pendingDelays: [TimeInterval] {
        lock.lock(); defer { lock.unlock() }
        return items.filter { !$0.token.cancelled }.map { $0.delay }
    }

    /// Takes the earliest live timer due at or before `limit` and moves the clock to its due time.
    func popDue(upTo limit: Date) -> (() -> Void)? {
        lock.lock(); defer { lock.unlock() }
        items.removeAll { $0.token.cancelled }
        guard let index = items.indices.min(by: { items[$0].due < items[$1].due }), items[index].due <= limit else { return nil }
        let item = items.remove(at: index)
        if item.due > _now { _now = item.due }
        return item.work
    }

    /// Fires the oldest live timer; returns its delay.
    @discardableResult
    func fireNext() -> TimeInterval? {
        lock.lock()
        items.removeAll { $0.token.cancelled }
        guard !items.isEmpty else { lock.unlock(); return nil }
        let item = items.removeFirst()
        lock.unlock()
        item.work()
        return item.delay
    }
}

final class RecordingDelegate: LocationEventDelegate {
    private let lock = NSLock()
    private var _http: [(Bool, Int)] = []
    private var _accepted: [LocationFix] = []
    private var _states: [StateKind] = []
    private var _requests: [(body: String, queued: Int)] = []
    private var _retries: [(delay: TimeInterval, status: Int?, queued: Int)] = []
    private var _discards: [Int] = []
    private var _networkRestored = 0
    private var _deferred: [(delay: TimeInterval, queued: Int)] = []
    var onStateHook: ((StateKind) -> Void)?

    var http: [(success: Bool, status: Int)] { lock.lock(); defer { lock.unlock() }; return _http }
    var accepted: [LocationFix] { lock.lock(); defer { lock.unlock() }; return _accepted }
    var states: [StateKind] { lock.lock(); defer { lock.unlock() }; return _states }
    var requests: [(body: String, queued: Int)] { lock.lock(); defer { lock.unlock() }; return _requests }
    var retries: [(delay: TimeInterval, status: Int?, queued: Int)] { lock.lock(); defer { lock.unlock() }; return _retries }
    var discards: [Int] { lock.lock(); defer { lock.unlock() }; return _discards }
    var deferred: [(delay: TimeInterval, queued: Int)] { lock.lock(); defer { lock.unlock() }; return _deferred }
    var networkRestored: Int { lock.lock(); defer { lock.unlock() }; return _networkRestored }

    func onHttp(success: Bool, status: Int) { lock.lock(); _http.append((success, status)); lock.unlock() }
    func onLocationAccepted(_ fix: LocationFix) { lock.lock(); _accepted.append(fix); lock.unlock() }
    func onState(_ kind: StateKind) {
        lock.lock(); _states.append(kind); lock.unlock()
        onStateHook?(kind)
    }
    func onRequest(body: String, queued: Int) { lock.lock(); _requests.append((body, queued)); lock.unlock() }
    func onRetryScheduled(delay: TimeInterval, status: Int?, queued: Int) { lock.lock(); _retries.append((delay, status, queued)); lock.unlock() }
    func onDiscarded(count: Int) { lock.lock(); _discards.append(count); lock.unlock() }
    func onNetworkRestored() { lock.lock(); _networkRestored += 1; lock.unlock() }
    func onSendDeferred(delay: TimeInterval, queued: Int) { lock.lock(); _deferred.append((delay, queued)); lock.unlock() }
}

final class FakeManager: LocationManaging {
    weak var eventHandler: LocationManagerEventHandler?
    var allowsBackgroundLocationUpdates = false
    var pausesLocationUpdatesAutomatically = true
    var activityType: CLActivityType = .other
    var desiredAccuracy: CLLocationAccuracy = 0
    var distanceFilter: CLLocationDistance = 0
    var showsBackgroundLocationIndicator = false
    var authorization: LocationAuthorization = .authorizedAlways
    var preciseLocation = true
    var servicesEnabled = true
    private(set) var startCount = 0
    private(set) var stopCount = 0
    func startUpdatingLocation() { startCount += 1 }
    func stopUpdatingLocation() { stopCount += 1 }
}

final class RecordingSink: FixSink {
    var fixes: [LocationFix] = []
    var authorizations: [LocationAuthorization] = []
    var services: [Bool] = []
    func submit(_ fix: LocationFix) { fixes.append(fix) }
    func setAuthorization(_ value: LocationAuthorization) { authorizations.append(value) }
    func setServicesEnabled(_ value: Bool) { services.append(value) }
}

/// Behaves like `NetworkPathMonitor`: nothing is known until the first reading arrives (`deliver`), and `stop()` forgets it.
final class FakeConnectivity: ConnectivityMonitoring {
    var onRestored: (() -> Void)?
    var onChange: ((Bool, String) -> Void)?
    var current: (online: Bool, networkType: String)? {
        get { if !scripted.isEmpty { return scripted.removeFirst() }; return _current }
        set { _current = newValue }
    }
    private var _current: (online: Bool, networkType: String)?
    /// Successive answers of `current` (a reading that arrives between two looks), before it settles on the real value.
    var scripted: [(online: Bool, networkType: String)?] = []
    private(set) var started = 0
    private(set) var stopped = 0
    func start() { started += 1 }
    func stop() { stopped += 1; _current = nil; scripted = [] }
    /// A path update: what the monitor would say, to `current` and to `onChange`.
    func deliver(online: Bool, type: String) {
        _current = (online, type)
        onChange?(online, type)
    }
}

/// Everything a sender test needs.
final class SenderRig {
    let directory: URL
    let transport = FakeTransport()
    let scheduler = ManualScheduler()
    let delegate = RecordingDelegate()
    let events = RecordingEventsListener()
    let sender: LocationSender

    init(directory: URL = makeTempDirectory(), release: Bool = true, config: Config? = makeConfig(),
         started: Bool = true, maxQueue: Int = 500, maxEvents: Int = EventQueue.defaultMaxEvents) {
        self.directory = directory
        transport.clock = { [scheduler] in scheduler.now }
        sender = LocationSender(queueDirectory: directory, transport: transport, scheduler: scheduler,
                                mockPolicy: MockPolicy(isReleaseBuild: release), maxQueue: maxQueue, maxEvents: maxEvents)
        sender.delegate = delegate
        sender.eventsListener = events
        if let config = config { sender.configure(config) }
        if started { sender.start() }
        sender.waitUntilIdle()
    }

    func submit(_ indexes: Int...) {
        for i in indexes { sender.submit(makeFix(i)) }
        sender.waitUntilIdle()
    }

    func idle() { sender.waitUntilIdle() }

    /// Moves the virtual clock by `seconds`, firing every timer that comes due on the way, in order.
    func advance(_ seconds: TimeInterval) {
        let target = scheduler.now.addingTimeInterval(seconds)
        while let work = scheduler.popDue(upTo: target) {
            work()
            sender.waitUntilIdle()
        }
        scheduler.now = target
    }

    /// Seconds after `origin` at which each request started.
    func startTimes(since origin: Date) -> [TimeInterval] {
        return transport.requests.compactMap { $0.at?.timeIntervalSince(origin) }
    }

    /// Fires the next retry timer and waits.
    @discardableResult
    func fireRetry() -> TimeInterval? {
        let delay = scheduler.fireNext()
        sender.waitUntilIdle()
        return delay
    }
}
