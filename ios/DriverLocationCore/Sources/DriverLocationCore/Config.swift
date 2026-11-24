import Foundation

public enum ConfigError: Error, Equatable, CustomStringConvertible {
    case invalidURL
    case invalidHeaders
    case invalidExtras
    case invalidDistanceFilter
    case invalidMaxQueue
    case invalidMinSendInterval
    case invalidEventsURL

    // Never includes the values (headers hold the token).
    public var description: String {
        switch self {
        case .invalidURL: return "invalid url: it must be an absolute http(s) URL with a host"
        case .invalidHeaders: return "invalid headers: names and values must be non-empty, without line breaks"
        case .invalidExtras: return "invalid extras: keys must be non-empty and not 'location'"
        case .invalidDistanceFilter: return "invalid distanceFilter: it must be finite and >= 0"
        case .invalidMaxQueue: return "invalid maxQueue: it must be between 1 and \(Config.maxQueueLimit)"
        case .invalidEventsURL: return "invalid eventsUrl: it must be an absolute http(s) URL with a host"
        case .invalidMinSendInterval: return "invalid minSendIntervalMs: it must be between 0 and \(Config.maxMinSendIntervalMs)"
        }
    }
}

/// What the JavaScript `configure` call carries that matters on iOS
/// (`interval`, `fastestInterval` and `notification` are Android only and ignored).
public struct Config: Equatable {
    public static let defaultDistanceFilter: Double = 25
    public static let defaultMaxQueue = 500
    public static let maxQueueLimit = 10_000
    /// The largest `minSendIntervalMs` the core accepts (one hour); the app caps what it passes lower.
    public static let maxMinSendIntervalMs = 3_600_000

    public let url: URL
    public let headers: [String: String]
    public let extras: [String: ExtraValue]
    public let distanceFilter: Double
    public let maxQueue: Int
    /// "Latest wins" (default): the sender always sends the newest queued fix, and a success removes it
    /// and every older one, so positions are never sent out of order and a long outage is not replayed.
    /// `false`: first in first out, the whole route in order.
    public let discardOlderOnSuccess: Bool
    /// Debug builds only: drop a simulated position (and report `mock_rejected`) instead of sending it as a real
    /// one. Default `false`. Release builds always drop simulated positions, whatever this says.
    public let rejectMock: Bool
    /// A floor, in milliseconds, between the START of a request to the API and the start of the previous one
    /// (monotonic clock; a retry is a request too). 0 (default) = no throttle, today's behaviour. Fixes that
    /// arrive meanwhile are kept ("latest wins" sends only the newest, when the interval has elapsed, with no
    /// new fix needed). At most `maxMinSendIntervalMs`.
    public let minSendIntervalMs: Int
    /// When true the body carries `location_at`: the time the fix was TAKEN (never the time of sending), UTC,
    /// `YYYY-MM-DD HH:mm:ss` (`LocationAt`). False (default) = today's body, byte for byte.
    public let sendLocationAt: Bool
    /// `POST {api}/tracking_events` (docs/LOCATION_MODULE.md, "Tracking events"). nil (default) = the events recorder is off and
    /// nothing about it is read, written or sent (an older caller changes nothing). The request carries the same `headers`.
    public let eventsUrl: URL?

    /// What the events queue belongs to: the positions' url (it holds the user id) and the events url, so a queue left by another
    /// driver, or for another API, is never sent under this one's token. nil without an events url.
    public var eventsOwner: String? {
        return eventsUrl.map { url.absoluteString + "\n" + $0.absoluteString }
    }

    /// Validates every field; throws a `ConfigError` that does not echo any value.
    public init(url: String,
                headers: [String: String],
                extras: [String: ExtraValue] = [:],
                distanceFilter: Double = Config.defaultDistanceFilter,
                maxQueue: Int = Config.defaultMaxQueue,
                discardOlderOnSuccess: Bool = true,
                rejectMock: Bool = false,
                minSendIntervalMs: Int = 0,
                sendLocationAt: Bool = false,
                eventsUrl: String? = nil) throws {
        guard let parsed = URL(string: url), let scheme = parsed.scheme?.lowercased(),
              scheme == "http" || scheme == "https", let host = parsed.host, !host.isEmpty else {
            throw ConfigError.invalidURL
        }
        try Config.validate(headers: headers)
        for key in extras.keys where key.isEmpty || key == "location" || (sendLocationAt && key == "location_at") {
            throw ConfigError.invalidExtras
        }
        guard distanceFilter.isFinite, distanceFilter >= 0 else { throw ConfigError.invalidDistanceFilter }
        guard maxQueue >= 1, maxQueue <= Config.maxQueueLimit else { throw ConfigError.invalidMaxQueue }
        guard minSendIntervalMs >= 0, minSendIntervalMs <= Config.maxMinSendIntervalMs else { throw ConfigError.invalidMinSendInterval }
        var events: URL?
        if let eventsUrl = eventsUrl {
            guard let parsedEvents = URL(string: eventsUrl), let eventsScheme = parsedEvents.scheme?.lowercased(),
                  eventsScheme == "http" || eventsScheme == "https", let eventsHost = parsedEvents.host, !eventsHost.isEmpty else {
                throw ConfigError.invalidEventsURL
            }
            events = parsedEvents
        }
        self.eventsUrl = events
        self.url = parsed
        self.headers = headers
        self.extras = extras
        self.distanceFilter = distanceFilter
        self.maxQueue = maxQueue
        self.discardOlderOnSuccess = discardOlderOnSuccess
        self.rejectMock = rejectMock
        self.minSendIntervalMs = minSendIntervalMs
        self.sendLocationAt = sendLocationAt
    }

    static func validate(headers: [String: String]) throws {
        for (name, value) in headers {
            let bad = CharacterSet(charactersIn: "\r\n\0")
            if name.isEmpty || value.isEmpty
                || name.rangeOfCharacter(from: bad) != nil
                || value.rangeOfCharacter(from: bad) != nil
                || name.contains(":") {
                throw ConfigError.invalidHeaders
            }
        }
    }

    /// A copy with other headers (validated).
    public func replacingHeaders(_ newHeaders: [String: String]) throws -> Config {
        try Config.validate(headers: newHeaders)
        return try Config(url: url.absoluteString, headers: newHeaders, extras: extras,
                          distanceFilter: distanceFilter, maxQueue: maxQueue,
                          discardOlderOnSuccess: discardOlderOnSuccess, rejectMock: rejectMock,
                          minSendIntervalMs: minSendIntervalMs, sendLocationAt: sendLocationAt,
                          eventsUrl: eventsUrl?.absoluteString)
    }

    /// A copy with `defaults` added for each header this config does not set already (names compared
    /// without case; the config's own value wins). The app passes in the headers that are its own (its
    /// User-Agent, its device id): the core knows no name and reads no device. Validated.
    public func addingDefaultHeaders(_ defaults: [String: String]) throws -> Config {
        let present = Set(headers.keys.map { $0.lowercased() })
        let added = defaults.filter { !present.contains($0.key.lowercased()) }
        if added.isEmpty { return self }
        return try replacingHeaders(headers.merging(added) { own, _ in own })
    }
}
