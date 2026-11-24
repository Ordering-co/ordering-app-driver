import Foundation

/// One position reading, already converted from the platform type.
public struct LocationFix: Equatable, Codable {
    public var lat: Double
    public var lng: Double
    /// Horizontal accuracy in metres (always >= 0 for a valid fix).
    public var accuracy: Double
    /// Speed in m/s, nil when the platform reports it as invalid.
    public var speed: Double?
    public var timestamp: Date
    /// True when the platform says the position is simulated by software.
    public var mock: Bool

    public init(lat: Double, lng: Double, accuracy: Double, speed: Double?, timestamp: Date, mock: Bool) {
        self.lat = lat
        self.lng = lng
        self.accuracy = accuracy
        self.speed = speed
        self.timestamp = timestamp
        self.mock = mock
    }

    /// Coordinates are finite and inside the WGS84 ranges, and the accuracy is not negative.
    public var isValid: Bool {
        return lat.isFinite && lng.isFinite && accuracy.isFinite
            && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 && accuracy >= 0
    }
}
