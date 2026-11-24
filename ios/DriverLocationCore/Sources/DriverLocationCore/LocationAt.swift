import Foundation

/// The `location_at` text: the instant a fix was taken, in UTC, exactly `YYYY-MM-DD HH:mm:ss`
/// (24-hour, zero-padded, ASCII digits, no `T`, no `Z`, no milliseconds, proleptic Gregorian calendar).
///
/// Computed with integer arithmetic only: no `DateFormatter`, no `Calendar`, no `Locale`, no time zone and no
/// numbering system of the device is read, so a phone in Arabic, with the Buddhist calendar or with a 12-hour
/// clock sends the same text as any other. Seconds are truncated (floor), never rounded, so a fix is never
/// dated in the future.
public enum LocationAt {
    public static func format(_ date: Date) -> String {
        return format(epochSeconds: date.timeIntervalSince1970)
    }

    static func format(epochSeconds: TimeInterval) -> String {
        guard epochSeconds.isFinite, abs(epochSeconds) < 1e14 else { return format(epochSeconds: 0) }
        let totalSeconds = Int64(epochSeconds.rounded(.down))
        let days = floorDiv(totalSeconds, 86_400)
        let secondOfDay = Int(totalSeconds - days * 86_400)
        // Civil date from days since 1970-01-01 (H. Hinnant's algorithm, proleptic Gregorian).
        let z = days + 719_468
        let era = floorDiv(z, 146_097)
        let dayOfEra = z - era * 146_097
        let yearOfEra = (dayOfEra - dayOfEra / 1_460 + dayOfEra / 36_524 - dayOfEra / 146_096) / 365
        let dayOfYear = dayOfEra - (365 * yearOfEra + yearOfEra / 4 - yearOfEra / 100)
        let mp = (5 * dayOfYear + 2) / 153
        let day = dayOfYear - (153 * mp + 2) / 5 + 1
        let month = mp < 10 ? mp + 3 : mp - 9
        let year = yearOfEra + era * 400 + (month <= 2 ? 1 : 0)
        return pad(year, 4) + "-" + pad(month, 2) + "-" + pad(day, 2) + " "
            + pad(Int64(secondOfDay / 3600), 2) + ":" + pad(Int64(secondOfDay / 60 % 60), 2) + ":" + pad(Int64(secondOfDay % 60), 2)
    }

    private static func floorDiv(_ a: Int64, _ b: Int64) -> Int64 {
        let q = a / b
        return (a % b != 0 && (a < 0) != (b < 0)) ? q - 1 : q
    }

    private static func pad(_ value: Int64, _ width: Int) -> String {
        let digits = String(value) // String(Int64) is ASCII whatever the locale
        return String(repeating: "0", count: max(0, width - digits.count)) + digits
    }
}
