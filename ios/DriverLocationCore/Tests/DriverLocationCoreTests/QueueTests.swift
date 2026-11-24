import XCTest
@testable import DriverLocationCore

final class QueueTests: XCTestCase {
    private var dir: URL!

    override func setUp() { dir = makeTempDirectory() }
    override func tearDown() { try? FileManager.default.removeItem(at: dir) }

    private var queueFile: URL { return dir.appendingPathComponent(LocationQueue.fileName) }

    func testFirstInFirstOut() {
        let queue = LocationQueue(directory: dir, maxQueue: 10)
        let a = queue.append(makeFix(1)), b = queue.append(makeFix(2)), c = queue.append(makeFix(3))
        XCTAssertEqual(queue.all.map { $0.fix.lat }, [0.001, 0.002, 0.003])
        XCTAssertEqual(queue.first, a)
        queue.remove(id: a.id)
        XCTAssertEqual(queue.first, b)
        queue.remove(id: b.id)
        queue.remove(id: c.id)
        XCTAssertNil(queue.first)
        XCTAssertEqual(queue.count, 0)
    }

    func testSequenceIncreasesAndSurvivesInstancesAndRemovals() {
        let queue = LocationQueue(directory: dir, maxQueue: 10)
        let a = queue.append(makeFix(9)), b = queue.append(makeFix(1)), c = queue.append(makeFix(5))
        XCTAssertEqual([a.seq, b.seq, c.seq], [1, 2, 3]) // order of arrival, not of timestamps
        XCTAssertEqual(queue.last, c)
        queue.remove(id: c.id)
        let d = queue.append(makeFix(2))
        XCTAssertEqual(d.seq, 4) // monotonic: a number is never reused within the run
        let again = LocationQueue(directory: dir, maxQueue: 10)
        XCTAssertEqual(again.all.map { $0.seq }, [1, 2, 4])
        XCTAssertEqual(again.append(makeFix(3)).seq, 5) // a new instance continues after the newest on disk
    }

    func testRemoveThroughRemovesTheEntryAndEveryOlderOne() {
        let queue = LocationQueue(directory: dir, maxQueue: 10)
        let entries = (1...5).map { queue.append(makeFix($0)) }
        XCTAssertEqual(queue.removeThrough(seq: entries[2].seq), 3)
        XCTAssertEqual(queue.all.map { $0.fix }, [makeFix(4), makeFix(5)])
        XCTAssertEqual(queue.removeThrough(seq: entries[2].seq), 0) // again: nothing
        XCTAssertEqual(LocationQueue(directory: dir, maxQueue: 10).all.map { $0.fix }, [makeFix(4), makeFix(5)])
        XCTAssertEqual(queue.removeThrough(seq: 999), 2)
        XCTAssertNil(queue.last)
        XCTAssertNil(queue.first)
    }

    func testLastIsTheNewestQueuedEvenWithAnOlderTimestamp() {
        let queue = LocationQueue(directory: dir, maxQueue: 10)
        queue.append(makeFix(8))
        let newest = queue.append(makeFix(3))
        XCTAssertEqual(queue.last, newest)
        XCTAssertEqual(LocationQueue(directory: dir, maxQueue: 10).last?.fix, makeFix(3))
    }

    func testSequenceAfterATruncatedFileContinuesFromWhatIsReadable() throws {
        let queue = LocationQueue(directory: dir, maxQueue: 10)
        (1...3).forEach { queue.append(makeFix($0)) }
        var data = try Data(contentsOf: queueFile)
        data.removeLast(25)
        try data.write(to: queueFile)
        let reloaded = LocationQueue(directory: dir, maxQueue: 10)
        XCTAssertEqual(reloaded.all.map { $0.seq }, [1, 2])
        XCTAssertEqual(reloaded.append(makeFix(9)).seq, 3)
    }

    func testBoundDropsTheOldest() {
        let queue = LocationQueue(directory: dir, maxQueue: 3)
        (1...5).forEach { queue.append(makeFix($0)) }
        XCTAssertEqual(queue.all.map { $0.fix.lat }, [0.003, 0.004, 0.005])
    }

    func testShrinkingTheBoundTrims() {
        let queue = LocationQueue(directory: dir, maxQueue: 10)
        (1...5).forEach { queue.append(makeFix($0)) }
        queue.setMaxQueue(2)
        XCTAssertEqual(queue.all.map { $0.fix.lat }, [0.004, 0.005])
        XCTAssertEqual(LocationQueue(directory: dir, maxQueue: 2).count, 2)
    }

    func testSurvivesANewInstanceOverTheSameDirectory() {
        let first = LocationQueue(directory: dir, maxQueue: 10)
        let a = first.append(makeFix(1))
        first.append(makeFix(2))
        first.append(makeFix(3))
        first.remove(id: a.id)
        first.setOwner("https://api.example.com/users/42/locations")

        let second = LocationQueue(directory: dir, maxQueue: 10)
        XCTAssertEqual(second.all.map { $0.fix }, [makeFix(2), makeFix(3)])
        XCTAssertEqual(second.owner, "https://api.example.com/users/42/locations")
        XCTAssertEqual(second.skippedOnLoad, 0)
    }

    func testFixFieldsRoundTrip() {
        let fix = LocationFix(lat: 37.33182012345678, lng: -122.03118, accuracy: 4.5, speed: nil,
                              timestamp: Date(timeIntervalSince1970: 1_700_000_123.456), mock: true)
        LocationQueue(directory: dir, maxQueue: 10).append(fix)
        XCTAssertEqual(LocationQueue(directory: dir, maxQueue: 10).first?.fix, fix)
    }

    func testTruncatedFileKeepsTheReadableEntries() throws {
        let queue = LocationQueue(directory: dir, maxQueue: 10)
        (1...3).forEach { queue.append(makeFix($0)) }
        var data = try Data(contentsOf: queueFile)
        data.removeLast(25) // the third line is cut in the middle
        try data.write(to: queueFile)

        let reloaded = LocationQueue(directory: dir, maxQueue: 10)
        XCTAssertEqual(reloaded.all.map { $0.fix }, [makeFix(1), makeFix(2)])
        XCTAssertEqual(reloaded.skippedOnLoad, 1)
        reloaded.append(makeFix(4)) // still writable, and the file is clean again
        XCTAssertEqual(LocationQueue(directory: dir, maxQueue: 10).all.map { $0.fix }, [makeFix(1), makeFix(2), makeFix(4)])
        XCTAssertEqual(LocationQueue(directory: dir, maxQueue: 10).skippedOnLoad, 0)
    }

    func testGarbageInTheMiddleIsSkipped() throws {
        let queue = LocationQueue(directory: dir, maxQueue: 10)
        queue.append(makeFix(1))
        queue.append(makeFix(2))
        let lines = try Data(contentsOf: queueFile).split(separator: 0x0A, omittingEmptySubsequences: true).map { Data($0) }
        var data = Data()
        data.append(lines[0]); data.append(0x0A)
        data.append(Data([0xFF, 0xFE, 0x00, 0x7B, 0x22, 0xC3])); data.append(0x0A) // invalid UTF-8 and broken JSON
        data.append(Data("{\"id\":\"x\",\"fix\":{\"lat\":\"oops\"}}".utf8)); data.append(0x0A) // wrong types
        data.append(Data("{\"id\":\"y\",\"fix\":{\"lat\":500,\"lng\":0,\"accuracy\":1,\"timestamp\":1,\"mock\":false}}".utf8)); data.append(0x0A) // out of range
        data.append(lines[1]); data.append(0x0A)
        try data.write(to: queueFile)

        let reloaded = LocationQueue(directory: dir, maxQueue: 10)
        XCTAssertEqual(reloaded.all.map { $0.fix }, [makeFix(1), makeFix(2)])
        XCTAssertEqual(reloaded.skippedOnLoad, 3)
    }

    func testWhollyCorruptOrEmptyFilesGiveAnEmptyQueue() throws {
        try Data([0x00, 0x01, 0x02, 0xFF]).write(to: queueFile)
        XCTAssertEqual(LocationQueue(directory: dir, maxQueue: 10).count, 0)
        try Data().write(to: queueFile)
        XCTAssertEqual(LocationQueue(directory: dir, maxQueue: 10).count, 0)
        try FileManager.default.removeItem(at: queueFile)
        XCTAssertEqual(LocationQueue(directory: dir, maxQueue: 10).count, 0)
    }

    func testAMissingDirectoryIsCreated() {
        let nested = dir.appendingPathComponent("a/b/c")
        let queue = LocationQueue(directory: nested, maxQueue: 5)
        queue.append(makeFix(1))
        XCTAssertEqual(LocationQueue(directory: nested, maxQueue: 5).count, 1)
    }

    func testAnUnwritableDirectoryNeverCrashesAndKeepsWorkingInMemory() throws {
        let blocker = dir.appendingPathComponent("file")
        try Data("x".utf8).write(to: blocker)
        let queue = LocationQueue(directory: blocker, maxQueue: 5) // a file, not a directory
        queue.append(makeFix(1))
        queue.append(makeFix(2))
        XCTAssertEqual(queue.count, 2)
        XCTAssertGreaterThan(queue.persistenceFailures, 0)
    }

    func testWritesUseAtomicAndProtectionUntilFirstUserAuthentication() {
        XCTAssertTrue(LocationQueue.writingOptions.contains(.atomic))
        XCTAssertTrue(LocationQueue.writingOptions.contains(.completeFileProtectionUntilFirstUserAuthentication))
        // Not the stricter class: it would make writes fail while the phone is locked.
        XCTAssertFalse(LocationQueue.writingOptions.contains(.completeFileProtection))
    }

    func testRemovingAnUnknownIdIsANoOp() {
        let queue = LocationQueue(directory: dir, maxQueue: 5)
        queue.append(makeFix(1))
        queue.remove(id: "nope")
        XCTAssertEqual(queue.count, 1)
    }

    func testConcurrentAppendsAreNotLost() {
        let queue = LocationQueue(directory: dir, maxQueue: 5000)
        DispatchQueue.concurrentPerform(iterations: 8) { t in
            for i in 0..<50 { queue.append(makeFix(t * 100 + i)) }
        }
        XCTAssertEqual(queue.count, 400)
        XCTAssertEqual(Set(queue.all.map { $0.id }).count, 400)
        XCTAssertEqual(LocationQueue(directory: dir, maxQueue: 5000).count, 400)
    }
}
