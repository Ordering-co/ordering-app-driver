import Foundation

public enum LocationAuthorization: String, Equatable, Codable {
    case notDetermined, restricted, denied, authorizedWhenInUse, authorizedAlways
}

/// The `kind` of an `onState` event.
public enum StateKind: String, Equatable {
    case mockRejected = "mock_rejected"
    case unauthorized = "unauthorized"
    case authorizationChanged = "authorization_changed"
    case servicesDisabled = "services_disabled"
    case servicesEnabled = "services_enabled"
}

/// Snapshot returned by `state()`.
public struct LocationState: Equatable {
    /// True once configured.
    public var enabled: Bool
    /// True between `start()` and `stop()`.
    public var tracking: Bool
    public var queued: Int
    /// Status of the last answer from the server (a network error is not an answer); nil before any.
    public var lastHttpStatus: Int?
    /// When the last location was accepted (queued).
    public var lastLocationAt: Date?
    public var authorization: LocationAuthorization
    public var servicesEnabled: Bool

    public init(enabled: Bool = false, tracking: Bool = false, queued: Int = 0, lastHttpStatus: Int? = nil,
                lastLocationAt: Date? = nil, authorization: LocationAuthorization = .notDetermined,
                servicesEnabled: Bool = true) {
        self.enabled = enabled
        self.tracking = tracking
        self.queued = queued
        self.lastHttpStatus = lastHttpStatus
        self.lastLocationAt = lastLocationAt
        self.authorization = authorization
        self.servicesEnabled = servicesEnabled
    }
}

/// Events of the sender. Called on the sender's internal serial queue: return quickly, and hop to
/// another queue before touching UI or React Native. `state()` may be called from inside a callback.
public protocol LocationEventDelegate: AnyObject {
    /// An answer from the server for one request (a network error raises no event).
    func onHttp(success: Bool, status: Int)
    /// A fix passed the mock policy and was queued.
    func onLocationAccepted(_ fix: LocationFix)
    func onState(_ kind: StateKind)
    /// A request is about to be made. `body` is the exact JSON (already built for the request, so passing it
    /// costs nothing; a release build must not log it); `queued` is what the queue holds.
    func onRequest(body: String, queued: Int)
    /// A retry was scheduled after `delay` seconds; `status` is the answer that caused it, nil for a network error.
    func onRetryScheduled(delay: TimeInterval, status: Int?, queued: Int)
    /// "Latest wins": a successful request dropped `count` (> 0) older queued positions. A bare number, so the
    /// call costs nothing on the hot path; the delegate decides to write one log line. Nothing goes to JavaScript.
    func onDiscarded(count: Int)
    /// The connectivity monitor reported that the network is back (the sender is told right after).
    func onNetworkRestored()
    /// The minimum send interval (`Config.minSendIntervalMs`) has not elapsed: the request will be made after
    /// `delay` seconds with the newest queued fix of that moment. Called once per wait, not once per fix.
    func onSendDeferred(delay: TimeInterval, queued: Int)
}

public extension LocationEventDelegate {
    func onRequest(body: String, queued: Int) {}
    func onRetryScheduled(delay: TimeInterval, status: Int?, queued: Int) {}
    func onDiscarded(count: Int) {}
    func onNetworkRestored() {}
    func onSendDeferred(delay: TimeInterval, queued: Int) {}
}
