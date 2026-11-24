import Foundation

/// A stored event (its compact JSON, `TrackingEvent.toJson()`) and the sequence number it got when it was queued.
public struct QueuedEvent: Equatable, Codable {
    public let seq: UInt64
    public let json: String
}

/// The persisted queue of tracking events: a small file beside the positions' queue, FIFO, capped (the OLDEST are
/// dropped), never holding the token. Its events carry no url; the OWNER file beside it (`tracking-events.owner`) holds the text the
/// caller composes from the positions' url and the events url (no token), so another driver's queue is never sent. Thread safe (one lock).
///
/// Storage: one JSON object per line (`{"seq":1,"json":"{...}"}`) in `tracking-events.queue`, rewritten atomically on
/// every change (500 small lines at most), with the same file protection as the positions' queue. A line that cannot be
/// decoded (truncated, garbled) is skipped at load and the file is rewritten clean. A write that fails never throws: the
/// queue goes on in memory. The owner is in `tracking-events.owner`.
public final class EventQueue {
    public static let fileName = "tracking-events.queue"
    public static let ownerFileName = "tracking-events.owner"
    public static let defaultMaxEvents = 500

    private let directory: URL
    private let fileURL: URL
    private let ownerURL: URL
    private let max: Int
    private let lock = NSLock()
    private var entries: [QueuedEvent] = []
    private var nextSeq: UInt64 = 1
    private var ownerValue: String?
    /// Lines skipped by the last load.
    public private(set) var skippedOnLoad = 0

    public init(directory: URL, maxEvents: Int = EventQueue.defaultMaxEvents) {
        self.directory = directory
        self.fileURL = directory.appendingPathComponent(EventQueue.fileName)
        self.ownerURL = directory.appendingPathComponent(EventQueue.ownerFileName)
        self.max = Swift.max(1, maxEvents)
        load()
    }

    public var count: Int { lock.lock(); defer { lock.unlock() }; return entries.count }

    public var owner: String? { lock.lock(); defer { lock.unlock() }; return ownerValue }

    /// Appends one event's JSON; returns how many OLDEST events the cap dropped to make room (usually 0).
    @discardableResult
    public func add(_ json: String) -> Int {
        lock.lock(); defer { lock.unlock() }
        entries.append(QueuedEvent(seq: nextSeq, json: json))
        nextSeq += 1
        var dropped = 0
        if entries.count > max {
            dropped = entries.count - max
            entries.removeFirst(dropped)
        }
        persist()
        return dropped
    }

    /// The oldest `limit` events, oldest first. Does not remove them.
    public func peekBatch(_ limit: Int) -> [QueuedEvent] {
        lock.lock(); defer { lock.unlock() }
        return Array(entries.prefix(limit))
    }

    /// Removes every event whose sequence is <= `seq`; returns how many. Newer ones stay.
    @discardableResult
    public func removeThrough(seq: UInt64) -> Int {
        lock.lock(); defer { lock.unlock() }
        let before = entries.count
        entries.removeAll { $0.seq <= seq }
        let removed = before - entries.count
        if removed > 0 { persist() }
        return removed
    }

    public func removeAll() {
        lock.lock(); defer { lock.unlock() }
        guard !entries.isEmpty else { return }
        entries.removeAll()
        persist()
    }

    /// The queue belongs to one session: the owner text names the driver (the positions' url holds the user id) and the
    /// endpoint. Same owner: nothing happens. Another owner, or entries with none recorded: the queue is CLEARED first
    /// and `owner` is recorded, so one driver's events are never sent under another's token. True when the owner changed.
    @discardableResult
    public func claim(_ owner: String) -> Bool {
        lock.lock(); defer { lock.unlock() }
        if ownerValue == owner { return false }
        if !entries.isEmpty {
            entries.removeAll()
            persist()
        }
        ownerValue = owner
        try? FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        try? Data(owner.utf8).write(to: ownerURL, options: LocationQueue.writingOptions)
        return true
    }

    // MARK: - Storage

    private func load() {
        if let data = try? Data(contentsOf: ownerURL), let text = String(data: data, encoding: .utf8), !text.isEmpty {
            ownerValue = text
        }
        guard let data = try? Data(contentsOf: fileURL) else { return }
        var loaded: [QueuedEvent] = []
        var skipped = 0
        let decoder = JSONDecoder()
        for line in data.split(separator: 0x0A, omittingEmptySubsequences: true) {
            if let entry = try? decoder.decode(QueuedEvent.self, from: Data(line)), entry.seq >= 1, entry.json.hasPrefix("{") {
                loaded.append(entry)
            } else {
                skipped += 1
            }
        }
        loaded.sort { $0.seq < $1.seq }
        if loaded.count > max {
            loaded.removeFirst(loaded.count - max)
            skipped += 1
        }
        entries = loaded
        nextSeq = (loaded.last?.seq ?? 0) + 1
        skippedOnLoad = skipped
        if skipped > 0 { persist() }
    }

    private func persist() {
        var data = Data()
        let encoder = JSONEncoder()
        for entry in entries {
            if let line = try? encoder.encode(entry) {
                data.append(line)
                data.append(0x0A)
            }
        }
        try? FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        try? data.write(to: fileURL, options: LocationQueue.writingOptions)
    }
}
