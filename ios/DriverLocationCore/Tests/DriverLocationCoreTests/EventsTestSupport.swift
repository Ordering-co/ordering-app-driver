import Foundation
@testable import DriverLocationCore

let eventsTestURL = "https://api.example.com/v1/en/project/tracking_events"

/// The default test config with the events lane on (an events url).
func eventsConfig(token: String = "secret-token", url: String = testURL, eventsUrl: String? = eventsTestURL,
                  minSendIntervalMs: Int = 0) -> Config {
    return makeConfig(token: token, url: url, discardOlderOnSuccess: true, minSendIntervalMs: minSendIntervalMs, eventsUrl: eventsUrl)
}

/// A well formed event number `n`: occurred_at is n seconds after 2026-11-19 00:00:00 UTC.
func ev(_ n: Int, _ name: String = EventNames.turnOffGps, durationMs: Int64? = nil) -> TrackingEvent {
    return TrackingEvent(uuid: "00000000-0000-4000-8000-" + String(format: "%012d", n), event: name,
                         occurredAtMs: 1_795_046_400_000 + Int64(n) * 1000, durationMs: durationMs,
                         data: [EventField("platform", "ios"), EventField("app_state", "foreground")])
}

final class RecordingEventsListener: EventsListener {
    private let lock = NSLock()
    private var _recorded: [(String, Int)] = []
    private var _requests: [(Int, Int)] = []
    private var _https: [(Int, Int)] = []
    private var _retries: [(TimeInterval, Int?, Int)] = []
    private var _dropped: [(Int, String)] = []
    var recorded: [(event: String, queued: Int)] { lock.lock(); defer { lock.unlock() }; return _recorded }
    var requests: [(count: Int, queued: Int)] { lock.lock(); defer { lock.unlock() }; return _requests }
    var https: [(status: Int, count: Int)] { lock.lock(); defer { lock.unlock() }; return _https }
    var retries: [(delay: TimeInterval, status: Int?, queued: Int)] { lock.lock(); defer { lock.unlock() }; return _retries }
    var dropped: [(count: Int, why: String)] { lock.lock(); defer { lock.unlock() }; return _dropped }
    func onEventRecorded(event: String, queued: Int) { lock.lock(); _recorded.append((event, queued)); lock.unlock() }
    func onEventsRequest(count: Int, queued: Int) { lock.lock(); _requests.append((count, queued)); lock.unlock() }
    func onEventsHttp(status: Int, count: Int) { lock.lock(); _https.append((status, count)); lock.unlock() }
    func onEventsRetry(delay: TimeInterval, status: Int?, queued: Int) { lock.lock(); _retries.append((delay, status, queued)); lock.unlock() }
    func onEventsDropped(count: Int, why: String) { lock.lock(); _dropped.append((count, why)); lock.unlock() }
}

extension FakeTransport {
    /// The requests to the events url, oldest first.
    var eventRequests: [Request] { return requests.filter { $0.url.absoluteString == eventsTestURL } }
    var positionRequests: [Request] { return requests.filter { $0.url.absoluteString != eventsTestURL } }
}

/// The events of a request body `{"events":"[...]"}`: `events` must be a JSON STRING holding the array (a real array would be a
/// different wire format), parsed again.
func eventObjects(_ body: Data) -> [[String: Any]] {
    let object = try! JSONSerialization.jsonObject(with: body) as! [String: Any]
    let text = object["events"] as! String
    return try! JSONSerialization.jsonObject(with: Data(text.utf8)) as! [[String: Any]]
}

/// The names of the events inside a request body, in order.
func eventNames(_ body: Data) -> [String] {
    return eventObjects(body).map { $0["event"] as! String }
}

/// The sequence numbers (see `ev`) inside a body.
func eventNumbers(_ body: Data) -> [Int] {
    return eventObjects(body).map { Int(String(($0["uuid"] as! String).suffix(12)))! }
}

extension SenderRig {
    func record(_ numbers: Int...) {
        for n in numbers { sender.record(ev(n)) }
        sender.waitUntilIdle()
    }
}
