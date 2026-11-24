import XCTest
@testable import DriverLocationCore

final class TrackingEventTests: XCTestCase {
    func testTheJsonIsExactlyTheContractsExample() {
        let e = TrackingEvent(uuid: "3f1c2a9e-5b7d-4c1e-9a52-0d6f8b7e1c44", event: "turn_on_gps",
                              occurredAtMs: 1_795_096_987_000, durationMs: 184_000,
                              data: [EventField("platform", "ios"), EventField("app_state", "background")])
        // 2026-11-19 14:03:07 UTC
        XCTAssertEqual(e.toJson(),
                       "{\"uuid\":\"3f1c2a9e-5b7d-4c1e-9a52-0d6f8b7e1c44\",\"event\":\"turn_on_gps\",\"occurred_at\":\"2026-11-19 14:03:07\",\"duration_ms\":184000,\"data\":{\"platform\":\"ios\",\"app_state\":\"background\"}}")
    }

    func testTheBodyIsTheArrayWrittenAsOneJsonString() throws {
        let one = ev(1).toJson()
        let two = ev(2, EventNames.turnOnGps, durationMs: 5).toJson()
        let body = EventJson.body([one, two])
        let object = try JSONSerialization.jsonObject(with: Data(body.utf8)) as! [String: Any]
        XCTAssertNil(object["events"] as? [Any], "not a real array")
        let text = try XCTUnwrap(object["events"] as? String)
        XCTAssertEqual(text, "[" + one + "," + two + "]")
        XCTAssertEqual(eventObjects(Data(body.utf8)).count, 2)
        XCTAssertTrue(body.hasPrefix("{\"events\":\"[{\\\"uuid\\\":"), body)
        XCTAssertEqual(EventJson.body([]), "{\"events\":\"[]\"}")
    }

    func testTheBodyIsByteForByteWhatJavaScriptWritesForTheSameEvents() {
        let e = TrackingEvent(uuid: "u", event: "x", occurredAtMs: 0, durationMs: nil, data: [EventField("provider", "a\tb\"c\\d")])
        // JSON.stringify({ events: JSON.stringify([<event>]) }) for that event
        let inner = "[{\"uuid\":\"u\",\"event\":\"x\",\"occurred_at\":\"1970-01-01 00:00:00\",\"data\":{\"provider\":\"a\\tb\\\"c\\\\d\"}}]"
        let expected = "{\"events\":" + LocationBodyBuilder.quote(inner) + "}"
        XCTAssertEqual(EventJson.body([e.toJson()]), expected)
        XCTAssertFalse(EventJson.body([e.toJson()]).contains("\t"))
    }

    func testDurationIsLeftOutWhenNilAndNeverNegative() {
        XCTAssertFalse(ev(1).toJson().contains("duration_ms"))
        XCTAssertTrue(ev(1, durationMs: -5).toJson().contains("\"duration_ms\":0"))
    }

    func testDataKeepsItsOrderAndWritesStringsBooleansAndIntegers() {
        let e = TrackingEvent(uuid: "u", event: "location_permission_changed", occurredAtMs: 0, durationMs: nil,
                              data: [EventField("platform", "ios"), EventField("precise_from", true), EventField("n", .int(7)), EventField("to", "denied")])
        XCTAssertTrue(e.toJson().hasSuffix("\"data\":{\"platform\":\"ios\",\"precise_from\":true,\"n\":7,\"to\":\"denied\"}}"))
    }

    func testTextIsEscapedSoALineNeverHoldsATabOrABreak() {
        let e = TrackingEvent(uuid: "u", event: "x", occurredAtMs: 0, durationMs: nil, data: [EventField("provider", "a\tb\nc\"d\\")])
        let json = e.toJson()
        XCTAssertFalse(json.contains("\t") || json.contains("\n"))
        XCTAssertTrue(json.contains("a\\tb\\nc\\\"d\\\\"))
    }

    func testOccurredAtIsAlwaysTheUtcTextWithSecondsTruncated() {
        XCTAssertEqual(LocationAt.format(epochMs: 1_795_046_400_999), "2026-11-19 00:00:00")
        XCTAssertEqual(LocationAt.format(epochMs: -1), "1969-12-31 23:59:59")
        XCTAssertEqual(LocationAt.format(epochMs: 0), "1970-01-01 00:00:00")
    }

    func testReasonsOutsideTheContractFallBack() {
        XCTAssertEqual(TrackingReasons.startReason(nil), "available")
        XCTAssertEqual(TrackingReasons.startReason("restart"), "restart")
        XCTAssertEqual(TrackingReasons.startReason("permission"), "permission")
        XCTAssertEqual(TrackingReasons.startReason("nope"), "available")
        XCTAssertEqual(TrackingReasons.stopReason(nil), "unknown")
        XCTAssertEqual(TrackingReasons.stopReason("session_revoked"), "session_revoked")
        XCTAssertEqual(TrackingReasons.stopReason("restart"), "unknown")
    }

    func testUuidsAreV4LowercaseAndDifferent() {
        let a = TrackingEvent.newUUID(), b = TrackingEvent.newUUID()
        let pattern = try! NSRegularExpression(pattern: "^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$")
        for u in [a, b] {
            XCTAssertEqual(u.count, 36)
            XCTAssertEqual(pattern.numberOfMatches(in: u, range: NSRange(u.startIndex..., in: u)), 1)
        }
        XCTAssertNotEqual(a, b)
    }
}
