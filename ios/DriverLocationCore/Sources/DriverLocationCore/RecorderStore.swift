import Foundation

/// The app's location authorization as the contract names it: `authorization` is `always` | `while_in_use` | `denied` |
/// `restricted` | `not_determined`; `precise` is whether the app may read the exact position.
public struct PermissionState: Equatable, Codable {
    public var authorization: String
    public var precise: Bool
    public init(authorization: String, precise: Bool) {
        self.authorization = authorization
        self.precise = precise
    }
}

/// What the recorder keeps between runs of the process (never the token; the `owner` is the text the sender composes, `Config.eventsOwner`:
/// the positions' url and the events url, so this file does hold the two urls).
///
/// - `owner`: the session the rest belongs to; another owner empties everything below.
/// - `active`: a tracking session started and has not ended CLEANLY; still set when the module starts again = the process was
///   killed (or suspended and terminated) without a stop, and `tracking_stopped` with reason `system` is owed.
/// - `sessionStartWall` / `heartbeatWall`: epoch ms of that session's `tracking_started` and of the last time the module was alive.
/// - `open`: the conditions an opening event was sent for and no closing one yet (`gps_off`, `offline`, `battery_saver`,
///   `background`), each with the wall clock (epoch ms) of the opening: the duration when the process that opened it is gone.
/// - `permission`: the last authorization seen.
public struct RecorderState: Equatable, Codable {
    public var owner: String?
    public var active: Bool
    public var sessionStartWall: Int64?
    public var heartbeatWall: Int64?
    public var open: [String: Int64]
    public var permission: PermissionState?

    public init(owner: String? = nil, active: Bool = false, sessionStartWall: Int64? = nil, heartbeatWall: Int64? = nil,
                open: [String: Int64] = [:], permission: PermissionState? = nil) {
        self.owner = owner
        self.active = active
        self.sessionStartWall = sessionStartWall
        self.heartbeatWall = heartbeatWall
        self.open = open
        self.permission = permission
    }
}

/// Where the `RecorderState` lives. `load` never fails (a missing or garbled store is the empty state); `save` never fails.
public protocol RecorderStore: AnyObject {
    func load() -> RecorderState
    func save(_ state: RecorderState)
}

/// In memory, for the tests.
public final class MemoryRecorderStore: RecorderStore {
    private let lock = NSLock()
    private var state: RecorderState
    public init(_ state: RecorderState = RecorderState()) { self.state = state }
    public func load() -> RecorderState { lock.lock(); defer { lock.unlock() }; return state }
    public func save(_ state: RecorderState) { lock.lock(); self.state = state; lock.unlock() }
}

/// `RecorderStore` in `directory`, file `tracking-events.state` (JSON), written atomically with the same file protection as
/// the queues.
public final class FileRecorderStore: RecorderStore {
    public static let fileName = "tracking-events.state"
    private let directory: URL
    private let fileURL: URL
    private let lock = NSLock()

    public init(directory: URL) {
        self.directory = directory
        self.fileURL = directory.appendingPathComponent(FileRecorderStore.fileName)
    }

    public func load() -> RecorderState {
        lock.lock(); defer { lock.unlock() }
        guard let data = try? Data(contentsOf: fileURL), let state = try? JSONDecoder().decode(RecorderState.self, from: data) else {
            return RecorderState()
        }
        return state
    }

    public func save(_ state: RecorderState) {
        lock.lock(); defer { lock.unlock() }
        guard let data = try? JSONEncoder().encode(state) else { return }
        try? FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        try? data.write(to: fileURL, options: LocationQueue.writingOptions)
    }
}
