import Foundation
import Network

public protocol ConnectivityMonitoring: AnyObject {
    /// Called when the network comes back (from unsatisfied to satisfied).
    var onRestored: (() -> Void)? { get set }
    /// Called on every path update with whether a usable network exists and its type (`wifi` | `cellular` | `other`; when
    /// offline, the last type seen, `none` if never). The events recorder debounces and filters it.
    var onChange: ((_ online: Bool, _ networkType: String) -> Void)? { get set }
    /// The last path update since `start()`, nil before the first one (and after `stop()`): "not known yet" is not "offline".
    var current: (online: Bool, networkType: String)? { get }
    func start()
    func stop()
}

/// Decides when a path update means "restored": only the change from unreachable to reachable.
/// The first update is the starting state and is never a restoration.
public struct PathTransitionDetector: Equatable {
    private var last: Bool?

    public init() {}

    public mutating func update(satisfied: Bool) -> Bool {
        defer { last = satisfied }
        return last == false && satisfied
    }
}

/// The contract's `network_type` for the interfaces a path uses: `wifi`, `cellular`, else `other` (wired, loopback, other).
public enum NetworkTypeMapper {
    public static func type(wifi: Bool, cellular: Bool) -> String {
        if wifi { return "wifi" }
        if cellular { return "cellular" }
        return "other"
    }
}

/// Maps path updates to (online, network type): the type of a usable path, and, once the path is lost, the last type that was in
/// use (`none` when no path was ever usable).
public struct ConnectivityTracker: Equatable {
    private var lastType = "none"
    public private(set) var latest: (online: Bool, networkType: String)?

    public init() {}

    public mutating func update(satisfied: Bool, usableType: String) -> (online: Bool, networkType: String) {
        if satisfied { lastType = usableType }
        let result = (online: satisfied, networkType: satisfied ? usableType : lastType)
        latest = result
        return result
    }

    public static func == (lhs: ConnectivityTracker, rhs: ConnectivityTracker) -> Bool {
        return lhs.lastType == rhs.lastType && lhs.latest?.online == rhs.latest?.online && lhs.latest?.networkType == rhs.latest?.networkType
    }
}

/// `NWPathMonitor` adapter.
public final class NetworkPathMonitor: ConnectivityMonitoring {
    public var onRestored: (() -> Void)?
    public var onChange: ((_ online: Bool, _ networkType: String) -> Void)?

    private let queue = DispatchQueue(label: "co.ordering.driverlocation.connectivity", qos: .utility)
    private var monitor: NWPathMonitor?
    private var detector = PathTransitionDetector()
    private var tracker = ConnectivityTracker()
    private let lock = NSLock()

    public init() {}

    public var current: (online: Bool, networkType: String)? {
        lock.lock(); defer { lock.unlock() }
        return tracker.latest
    }

    public func start() {
        lock.lock(); defer { lock.unlock() }
        guard monitor == nil else { return }
        let m = NWPathMonitor()
        detector = PathTransitionDetector()
        tracker = ConnectivityTracker()
        m.pathUpdateHandler = { [weak self] path in
            guard let self = self else { return }
            let satisfied = path.status == .satisfied
            let type = NetworkTypeMapper.type(wifi: path.usesInterfaceType(.wifi), cellular: path.usesInterfaceType(.cellular))
            self.lock.lock()
            let restored = self.detector.update(satisfied: satisfied)
            let change = self.tracker.update(satisfied: satisfied, usableType: type)
            self.lock.unlock()
            self.onChange?(change.online, change.networkType)
            if restored { self.onRestored?() }
        }
        m.start(queue: queue)
        monitor = m
    }

    /// Cancels the monitor AND forgets what it last said: a session that ended offline and restarts on Wi-Fi must not read the old
    /// "offline" as the present (it would open a condition at the start and close it two seconds later).
    public func stop() {
        lock.lock(); defer { lock.unlock() }
        monitor?.cancel()
        monitor = nil
        detector = PathTransitionDetector()
        tracker = ConnectivityTracker()
    }
}
