import Foundation

/// 5 s, 15 s, 60 s, then every 60 s. `reset()` on success.
public struct Backoff: Equatable {
    public static let delays: [TimeInterval] = [5, 15, 60]

    private var attempt = 0

    public init() {}

    /// The delay to wait before the next retry; advances the sequence.
    public mutating func nextDelay() -> TimeInterval {
        let delay = Backoff.delays[min(attempt, Backoff.delays.count - 1)]
        attempt += 1
        return delay
    }

    public mutating func reset() {
        attempt = 0
    }
}
