import Foundation

/// A value of `Config.extras` (the JavaScript side sends strings and numbers).
public enum ExtraValue: Equatable {
    case string(String)
    case int(Int)
    case double(Double)
}

extension ExtraValue: ExpressibleByStringLiteral, ExpressibleByIntegerLiteral, ExpressibleByFloatLiteral {
    public init(stringLiteral value: String) { self = .string(value) }
    public init(integerLiteral value: Int) { self = .int(value) }
    public init(floatLiteral value: Double) { self = .double(value) }
}

/// Builds the body of `POST {root}/users/{id}/locations`.
///
/// Canonical shape (checked against the local API):
/// `{"location":{"lat":<n>,"lng":<n>,"v":"1.0"},<extras at the root, sorted by key>}`
/// for example `{"location":{"lat":37.3318,"lng":-122.0312,"v":"1.0"},"driver_id":42}`.
/// There is no `mock` key (the owner's decision of 2026-11-17): whether a fix is simulated is decided by
/// `MockPolicy` before the body is built, never by the body.
/// Compact JSON, fixed key order, numbers as plain decimals (no exponent, no locale).
///
/// With `sendLocationAt` (`Config.sendLocationAt`, default off) one key is added at the top level, right after
/// `location`: `"location_at":"2026-11-19 14:03:07"`, the time the fix was TAKEN (`LocationAt`). Off, the body is
/// exactly the one above.
public struct LocationBodyBuilder {
    public static let version = "1.0"
    public let extras: [String: ExtraValue]
    public let sendLocationAt: Bool

    public init(extras: [String: ExtraValue], sendLocationAt: Bool = false) {
        self.extras = extras
        self.sendLocationAt = sendLocationAt
    }

    public func body(for fix: LocationFix) -> Data {
        return Data(jsonString(for: fix).utf8)
    }

    public func jsonString(for fix: LocationFix) -> String {
        var out = "{\"location\":{\"lat\":"
        out += LocationBodyBuilder.number(fix.lat)
        out += ",\"lng\":"
        out += LocationBodyBuilder.number(fix.lng)
        out += ",\"v\":\"" + LocationBodyBuilder.version + "\"}"
        if sendLocationAt {
            // The instant the fix was taken, never the instant it is sent (a queued fix keeps its own).
            out += ",\"location_at\":\"" + LocationAt.format(fix.timestamp) + "\""
        }
        for key in extras.keys.sorted() {
            out += "," + LocationBodyBuilder.quote(key) + ":"
            switch extras[key]! {
            case .string(let s): out += LocationBodyBuilder.quote(s)
            case .int(let i): out += String(i)
            case .double(let d): out += LocationBodyBuilder.number(d)
            }
        }
        out += "}"
        return out
    }

    /// Shortest round-trip decimal, as JavaScript prints it: "2" not "2.0", never an exponent,
    /// never a locale separator, never "-0". Non-finite values (not valid JSON) become "0".
    static func number(_ value: Double) -> String {
        guard value.isFinite else { return "0" }
        if value == 0 { return "0" }
        var s = "\(value)"
        if s.contains("e") || s.contains("E") {
            // Fixed notation with enough digits to round-trip, then trimmed.
            s = String(format: "%.20f", locale: nil, value)
            s = trimZeros(s)
        } else if s.hasSuffix(".0") {
            s.removeLast(2)
        }
        return s
    }

    private static func trimZeros(_ s: String) -> String {
        guard s.contains(".") else { return s }
        var t = s
        while t.hasSuffix("0") { t.removeLast() }
        if t.hasSuffix(".") { t.removeLast() }
        return t.isEmpty || t == "-" ? "0" : t
    }

    static func quote(_ s: String) -> String {
        var out = "\""
        for scalar in s.unicodeScalars {
            switch scalar {
            case "\"": out += "\\\""
            case "\\": out += "\\\\"
            case "\n": out += "\\n"
            case "\r": out += "\\r"
            case "\t": out += "\\t"
            default:
                if scalar.value < 0x20 {
                    out += String(format: "\\u%04x", scalar.value)
                } else {
                    out.unicodeScalars.append(scalar)
                }
            }
        }
        return out + "\""
    }
}
