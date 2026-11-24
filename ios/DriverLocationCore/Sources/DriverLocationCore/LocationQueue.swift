import Foundation

public struct QueueEntry: Equatable, Codable {
    public let id: String
    /// Increases by one for every fix queued (persisted with it): the order of arrival.
    /// Never compare the timestamps of queued fixes to order them.
    public let seq: UInt64
    public let fix: LocationFix
}

/// Persisted FIFO of fixes waiting to be sent, bounded by `maxQueue` (the oldest is dropped).
///
/// Storage: one JSON object per line in `queue.jsonl` inside the injected directory, rewritten
/// atomically on every change (a few hundred small lines at most), with file protection
/// `completeUntilFirstUserAuthentication` so it can be written while the phone is locked.
/// Loading skips lines it cannot decode (a truncated or corrupt file never crashes and keeps
/// every readable entry). A second file, `owner`, says which endpoint the entries were queued for.
/// Thread safe (one lock).
public final class LocationQueue {
    public static let fileName = "queue.jsonl"
    public static let ownerFileName = "owner"

    /// Options of every write. `.atomic` so a crash never leaves half a file; the protection class
    /// keeps the file writable after the first unlock (a locked phone keeps tracking).
    public static let writingOptions: Data.WritingOptions = [.atomic, .completeFileProtectionUntilFirstUserAuthentication]

    private let directory: URL
    private let fileURL: URL
    private let ownerURL: URL
    private let lock = NSLock()
    private var entries: [QueueEntry] = []
    private var limit: Int
    private var ownerValue: String?
    private var nextSeq: UInt64 = 1
    /// Lines skipped by the last load (corrupt or truncated).
    public private(set) var skippedOnLoad = 0
    /// Writes that failed (the queue keeps working in memory).
    public private(set) var persistenceFailures = 0

    public init(directory: URL, maxQueue: Int) {
        self.directory = directory
        self.fileURL = directory.appendingPathComponent(LocationQueue.fileName)
        self.ownerURL = directory.appendingPathComponent(LocationQueue.ownerFileName)
        self.limit = max(1, maxQueue)
        prepareDirectory()
        load()
    }

    public var count: Int { lock.lock(); defer { lock.unlock() }; return entries.count }

    public var maxQueue: Int { lock.lock(); defer { lock.unlock() }; return limit }

    public var all: [QueueEntry] { lock.lock(); defer { lock.unlock() }; return entries }

    public var first: QueueEntry? { lock.lock(); defer { lock.unlock() }; return entries.first }

    /// The newest entry (highest sequence).
    public var last: QueueEntry? { lock.lock(); defer { lock.unlock() }; return entries.last }

    public var owner: String? { lock.lock(); defer { lock.unlock() }; return ownerValue }

    /// Appends at the end; when the bound is exceeded the oldest entries are dropped.
    @discardableResult
    public func append(_ fix: LocationFix) -> QueueEntry {
        lock.lock(); defer { lock.unlock() }
        let entry = QueueEntry(id: UUID().uuidString, seq: nextSeq, fix: fix)
        nextSeq += 1
        entries.append(entry)
        if entries.count > limit { entries.removeFirst(entries.count - limit) }
        persist()
        return entry
    }

    /// Removes the entry with this id (no-op when it is already gone, e.g. dropped by the bound).
    public func remove(id: String) {
        lock.lock(); defer { lock.unlock() }
        guard let index = entries.firstIndex(where: { $0.id == id }) else { return }
        entries.remove(at: index)
        persist()
    }

    /// Removes the entry with this sequence and every older one; returns how many went.
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

    public func setMaxQueue(_ newValue: Int) {
        lock.lock(); defer { lock.unlock() }
        limit = max(1, newValue)
        if entries.count > limit {
            entries.removeFirst(entries.count - limit)
            persist()
        }
    }

    public func setOwner(_ newOwner: String?) {
        lock.lock(); defer { lock.unlock() }
        guard newOwner != ownerValue else { return }
        ownerValue = newOwner
        if let newOwner = newOwner {
            write(Data(newOwner.utf8), to: ownerURL)
        } else {
            try? FileManager.default.removeItem(at: ownerURL)
        }
    }

    // MARK: - Storage

    private static let encoder: JSONEncoder = {
        let e = JSONEncoder()
        e.dateEncodingStrategy = .secondsSince1970
        return e
    }()

    private static let decoder: JSONDecoder = {
        let d = JSONDecoder()
        d.dateDecodingStrategy = .secondsSince1970
        return d
    }()

    private func prepareDirectory() {
        var attributes: [FileAttributeKey: Any] = [:]
        #if os(iOS)
        attributes[.protectionKey] = FileProtectionType.completeUntilFirstUserAuthentication
        #endif
        try? FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true,
                                                 attributes: attributes.isEmpty ? nil : attributes)
        var values = URLResourceValues()
        values.isExcludedFromBackup = true
        var dir = directory
        try? dir.setResourceValues(values)
    }

    private func load() {
        if let data = try? Data(contentsOf: ownerURL), let text = String(data: data, encoding: .utf8) {
            ownerValue = text
        }
        guard let data = try? Data(contentsOf: fileURL) else { return }
        var loaded: [QueueEntry] = []
        var skipped = 0
        for line in data.split(separator: 0x0A, omittingEmptySubsequences: true) {
            if let entry = try? LocationQueue.decoder.decode(QueueEntry.self, from: Data(line)), entry.fix.isValid {
                loaded.append(entry)
            } else {
                skipped += 1
            }
        }
        if loaded.count > limit { loaded.removeFirst(loaded.count - limit) }
        // The file is in arrival order; sorting by sequence also repairs a file whose lines were shuffled.
        loaded.sort { $0.seq < $1.seq }
        entries = loaded
        nextSeq = (loaded.last?.seq ?? 0) + 1
        skippedOnLoad = skipped
        if skipped > 0 { persist() } // compact: the file is clean from now on
    }

    private func persist() {
        var data = Data()
        for entry in entries {
            if let line = try? LocationQueue.encoder.encode(entry) {
                data.append(line)
                data.append(0x0A)
            }
        }
        write(data, to: fileURL)
    }

    private func write(_ data: Data, to url: URL) {
        do {
            try data.write(to: url, options: LocationQueue.writingOptions)
        } catch {
            persistenceFailures += 1
        }
    }
}
