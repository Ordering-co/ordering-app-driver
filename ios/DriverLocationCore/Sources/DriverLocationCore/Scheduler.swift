import Foundation

public protocol Cancellable: AnyObject {
    func cancel()
}

/// Time and delayed work, injected so tests are deterministic.
public protocol Scheduler: AnyObject {
    var now: Date { get }
    /// A MONOTONIC clock in seconds: only differences between two readings mean anything (it is not the wall
    /// clock and nothing can set it back). The sender measures the minimum send interval with it. The default
    /// reads `now`, which suits a test scheduler whose `now` is a virtual clock.
    var monotonic: TimeInterval { get }
    /// Runs `work` once after `delay` seconds, on any thread, unless cancelled.
    func schedule(after delay: TimeInterval, _ work: @escaping () -> Void) -> Cancellable
}

public extension Scheduler {
    var monotonic: TimeInterval { return now.timeIntervalSinceReferenceDate }
}

/// The real one, on a global queue (the sender hops to its own queue).
public final class DispatchScheduler: Scheduler {
    private final class Token: Cancellable {
        let item: DispatchWorkItem
        init(_ item: DispatchWorkItem) { self.item = item }
        func cancel() { item.cancel() }
    }

    private let queue: DispatchQueue

    public init(queue: DispatchQueue = DispatchQueue.global(qos: .utility)) {
        self.queue = queue
    }

    public var now: Date { return Date() }

    /// `CLOCK_MONOTONIC_RAW`: keeps counting while the device sleeps and never jumps with the wall clock.
    public var monotonic: TimeInterval {
        return TimeInterval(clock_gettime_nsec_np(CLOCK_MONOTONIC_RAW)) / 1_000_000_000
    }

    public func schedule(after delay: TimeInterval, _ work: @escaping () -> Void) -> Cancellable {
        let item = DispatchWorkItem(block: work)
        queue.asyncAfter(deadline: .now() + delay, execute: item)
        return Token(item)
    }
}
