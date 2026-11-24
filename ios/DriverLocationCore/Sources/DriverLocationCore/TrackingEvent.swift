import Foundation

/// The event names of the tracking-events contract (docs/LOCATION_MODULE.md, "Tracking events"). The app never invents a name.
public enum EventNames {
    public static let turnOffGps = "turn_off_gps"
    public static let turnOnGps = "turn_on_gps"
    public static let turnOffMobileData = "turn_off_mobile_data"
    public static let turnOnMobileData = "turn_on_mobile_data"
    public static let locationPermissionChanged = "location_permission_changed"
    public static let setAppInBackground = "set_app_in_background"
    public static let setAppInForeground = "set_app_in_foreground"
    public static let batterySaverOn = "battery_saver_on"
    public static let batterySaverOff = "battery_saver_off"
    public static let mockLocationDetected = "mock_location_detected"
    public static let trackingStarted = "tracking_started"
    public static let trackingStopped = "tracking_stopped"
}

/// The `reason` of `tracking_started` / `tracking_stopped`.
public enum TrackingReasons {
    public static let available = "available"
    public static let schedule = "schedule"
    public static let login = "login"
    public static let restart = "restart"
    public static let unavailable = "unavailable"
    public static let logout = "logout"
    public static let permission = "permission"
    public static let sessionRevoked = "session_revoked"
    public static let system = "system"
    public static let unknown = "unknown"

    private static let starts: Set<String> = [available, schedule, login, permission, restart]
    private static let stops: Set<String> = [unavailable, logout, schedule, permission, sessionRevoked, system, unknown]

    /// A start reason the contract knows; anything else (or nil, an older JavaScript caller) is `available`.
    public static func startReason(_ value: String?) -> String {
        if let value = value, starts.contains(value) { return value }
        return available
    }

    /// A stop reason the contract knows; anything else (or nil) is `unknown`.
    public static func stopReason(_ value: String?) -> String {
        if let value = value, stops.contains(value) { return value }
        return unknown
    }
}

/// A value of an event's `data`: strings, booleans or integers.
public enum EventValue: Equatable {
    case string(String)
    case bool(Bool)
    case int(Int64)
}

/// One `data` key, in order (the JSON keeps it).
public struct EventField: Equatable {
    public let key: String
    public let value: EventValue
    public init(_ key: String, _ value: EventValue) {
        self.key = key
        self.value = value
    }
    public init(_ key: String, _ value: String) { self.init(key, .string(value)) }
    public init(_ key: String, _ value: Bool) { self.init(key, .bool(value)) }
}

/// One event as the API wants it (contract section 2). `occurredAtMs` is the wall clock at detection (epoch ms), written
/// as `YYYY-MM-DD HH:mm:ss` UTC (`LocationAt`); `durationMs` only for the events that END a condition. `data` always holds
/// `platform` and `app_state` first, then the per-event fields. The JSON is compact and in the order of the contract's example.
public struct TrackingEvent: Equatable {
    public let uuid: String
    public let event: String
    public let occurredAtMs: Int64
    public let durationMs: Int64?
    public let data: [EventField]

    public init(uuid: String, event: String, occurredAtMs: Int64, durationMs: Int64?, data: [EventField]) {
        self.uuid = uuid
        self.event = event
        self.occurredAtMs = occurredAtMs
        self.durationMs = durationMs
        self.data = data
    }

    /// A lowercase UUID v4, 36 characters.
    public static func newUUID() -> String { return UUID().uuidString.lowercased() }

    public func toJson() -> String {
        var out = "{\"uuid\":" + LocationBodyBuilder.quote(uuid)
        out += ",\"event\":" + LocationBodyBuilder.quote(event)
        out += ",\"occurred_at\":\"" + LocationAt.format(epochMs: occurredAtMs) + "\""
        if let durationMs = durationMs { out += ",\"duration_ms\":" + String(max(0, durationMs)) }
        out += ",\"data\":{"
        var first = true
        for field in data {
            if !first { out += "," }
            first = false
            out += LocationBodyBuilder.quote(field.key) + ":"
            switch field.value {
            case .string(let s): out += LocationBodyBuilder.quote(s)
            case .bool(let b): out += b ? "true" : "false"
            case .int(let i): out += String(i)
            }
        }
        return out + "}}"
    }
}

/// The body of one request: `{"events":"[{...},{...}]"}`, the events as they were stored, in a JSON ARRAY that is itself the value
/// of `events` as a JSON STRING (what today's JavaScript senders post and the form every version of the API accepts: the API in
/// production validates `events` with a string rule and rejects a real array; the newer one takes both). The same text as
/// `JSON.stringify({ events: JSON.stringify([...]) })`.
public enum EventJson {
    public static func body(_ eventJsons: [String]) -> String {
        return "{\"events\":" + arrayString(eventJsons) + "}"
    }

    /// The array of `eventJsons` written as one JSON string value (quoted and escaped).
    public static func arrayString(_ eventJsons: [String]) -> String {
        return LocationBodyBuilder.quote("[" + eventJsons.joined(separator: ",") + "]")
    }
}

extension LocationAt {
    /// The same text for an epoch in milliseconds (seconds truncated toward minus infinity).
    static func format(epochMs: Int64) -> String {
        var seconds = epochMs / 1000
        if epochMs % 1000 != 0 && epochMs < 0 { seconds -= 1 }
        return format(epochSeconds: TimeInterval(seconds))
    }
}
