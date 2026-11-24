import XCTest
@testable import DriverLocationCore

final class EventQueueTests: XCTestCase {
    private func json(_ n: Int) -> String { return ev(n).toJson() }

    func testAddsInOrderAndPeeksTheOldestBatch() {
        let q = EventQueue(directory: makeTempDirectory())
        for n in 1...5 { XCTAssertEqual(q.add(json(n)), 0) }
        XCTAssertEqual(q.count, 5)
        XCTAssertEqual(q.peekBatch(3).map { $0.json }, [json(1), json(2), json(3)])
        XCTAssertEqual(q.count, 5)
    }

    func testRemoveThroughRemovesTheBatchAndKeepsTheNewer() {
        let q = EventQueue(directory: makeTempDirectory())
        for n in 1...5 { q.add(json(n)) }
        let batch = q.peekBatch(3)
        q.add(json(6))
        XCTAssertEqual(q.removeThrough(seq: batch.last!.seq), 3)
        XCTAssertEqual(q.peekBatch(10).map { $0.json }, [json(4), json(5), json(6)])
    }

    func testSurvivesTheProcessAndKeepsTheSequence() {
        let dir = makeTempDirectory()
        let first = EventQueue(directory: dir)
        first.claim("owner")
        for n in 1...3 { first.add(json(n)) }
        let second = EventQueue(directory: dir)
        XCTAssertEqual(second.peekBatch(10).map { $0.json }, [json(1), json(2), json(3)])
        XCTAssertEqual(second.owner, "owner")
        second.add(json(4))
        XCTAssertEqual(second.peekBatch(10).map { $0.seq }, [1, 2, 3, 4])
    }

    func testTheCapDropsTheOldestAndSaysHowMany() {
        let q = EventQueue(directory: makeTempDirectory(), maxEvents: 3)
        for n in 1...3 { XCTAssertEqual(q.add(json(n)), 0) }
        XCTAssertEqual(q.add(json(4)), 1)
        XCTAssertEqual(q.peekBatch(10).map { $0.json }, [json(2), json(3), json(4)])
    }

    func testTheDefaultCapIs500() {
        XCTAssertEqual(EventQueue.defaultMaxEvents, 500)
        let q = EventQueue(directory: makeTempDirectory())
        for n in 1...502 { q.add(json(n)) }
        XCTAssertEqual(q.count, 500)
        XCTAssertEqual(q.peekBatch(1).first?.json, json(3))
    }

    func testAnotherOwnerClearsTheQueueAndTheSameOwnerKeepsIt() {
        let dir = makeTempDirectory()
        let q = EventQueue(directory: dir)
        XCTAssertTrue(q.claim("a\nb"))
        q.add(json(1))
        XCTAssertFalse(q.claim("a\nb"))
        XCTAssertEqual(q.count, 1)
        XCTAssertFalse(EventQueue(directory: dir).claim("a\nb"))
        XCTAssertEqual(EventQueue(directory: dir).count, 1)
        XCTAssertTrue(q.claim("c\nd"))
        XCTAssertEqual(q.count, 0)
        XCTAssertEqual(EventQueue(directory: dir).count, 0)
    }

    func testEntriesWithNoRecordedOwnerAreClearedAtTheFirstClaim() {
        let dir = makeTempDirectory()
        let q = EventQueue(directory: dir)
        q.add(json(1))
        XCTAssertTrue(q.claim("x"))
        XCTAssertEqual(q.count, 0)
    }

    func testAGarbledOrTruncatedLineIsSkippedAndTheFileIsRewrittenClean() throws {
        let dir = makeTempDirectory()
        let q = EventQueue(directory: dir)
        q.add(json(1)); q.add(json(2))
        let url = dir.appendingPathComponent(EventQueue.fileName)
        var text = try String(contentsOf: url)
        text += "{\"seq\":9,\"json\":\"{trunc\n"
        text += "not json at all\n"
        try text.write(to: url, atomically: true, encoding: .utf8)
        let again = EventQueue(directory: dir)
        XCTAssertEqual(again.peekBatch(10).map { $0.json }, [json(1), json(2)])
        XCTAssertEqual(again.skippedOnLoad, 2)
        XCTAssertEqual(EventQueue(directory: dir).skippedOnLoad, 0)
    }

    func testTheQueueHoldsNoTokenOrUrl() throws {
        let dir = makeTempDirectory()
        let q = EventQueue(directory: dir)
        q.claim("x")
        q.add(json(1))
        let text = try String(contentsOf: dir.appendingPathComponent(EventQueue.fileName))
        XCTAssertFalse(text.contains("Bearer") || text.contains("Authorization") || text.contains("http"))
    }
}
