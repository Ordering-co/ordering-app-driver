import XCTest
@testable import DriverLocationCore

final class BodyTests: XCTestCase {
    private func fix(_ lat: Double, _ lng: Double, mock: Bool = false) -> LocationFix {
        return LocationFix(lat: lat, lng: lng, accuracy: 5, speed: 2, timestamp: Date(timeIntervalSince1970: 0), mock: mock)
    }

    func testCanonicalBodyByteForByte() {
        let builder = LocationBodyBuilder(extras: ["driver_id": 42])
        let json = builder.jsonString(for: fix(37.3318, -122.0312))
        XCTAssertEqual(json, #"{"location":{"lat":37.3318,"lng":-122.0312,"v":"1.0"},"driver_id":42}"#)
        XCTAssertEqual(builder.body(for: fix(37.3318, -122.0312)), Data(json.utf8))
    }

    // The owner's decision of 2026-11-17: the body never carries `mock`, whatever the fix says.
    func testTheBodyHasNoMockKeyWhateverTheFixSays() {
        for mock in [false, true] {
            let json = LocationBodyBuilder(extras: ["driver_id": 7]).jsonString(for: fix(1.5, 2.5, mock: mock))
            XCTAssertEqual(json, #"{"location":{"lat":1.5,"lng":2.5,"v":"1.0"},"driver_id":7}"#)
            XCTAssertFalse(json.contains("mock"))
        }
    }

    func testBodyIsValidJSONWithLocationAsObject() throws {
        let data = LocationBodyBuilder(extras: ["driver_id": 42]).body(for: fix(10, -20))
        let object = try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any])
        let location = try XCTUnwrap(object["location"] as? [String: Any])
        XCTAssertEqual(location["lat"] as? Double, 10)
        XCTAssertEqual(location["lng"] as? Double, -20)
        XCTAssertNil(location["mock"])
        XCTAssertEqual(location["v"] as? String, "1.0")
        XCTAssertEqual(object["driver_id"] as? Int, 42)
        XCTAssertEqual(Set(object.keys), ["location", "driver_id"])
    }

    func testNumbersArePlainDecimals() {
        XCTAssertEqual(LocationBodyBuilder.number(2), "2")
        XCTAssertEqual(LocationBodyBuilder.number(-2), "-2")
        XCTAssertEqual(LocationBodyBuilder.number(0), "0")
        XCTAssertEqual(LocationBodyBuilder.number(-0.0), "0")
        XCTAssertEqual(LocationBodyBuilder.number(0.5), "0.5")
        XCTAssertEqual(LocationBodyBuilder.number(37.33182012345678), "37.33182012345678")
        XCTAssertEqual(LocationBodyBuilder.number(-122.00000001), "-122.00000001")
        XCTAssertEqual(LocationBodyBuilder.number(0.0001), "0.0001")
        XCTAssertEqual(LocationBodyBuilder.number(1e-7), "0.0000001")
        XCTAssertEqual(LocationBodyBuilder.number(-1e-5), "-0.00001")
        XCTAssertEqual(LocationBodyBuilder.number(179.9999999), "179.9999999")
        XCTAssertEqual(LocationBodyBuilder.number(.nan), "0")
        XCTAssertEqual(LocationBodyBuilder.number(.infinity), "0")
        for value in [1e-7, 1e-10, 12345.678, -0.000123, 90, 180] {
            let text = LocationBodyBuilder.number(value)
            XCTAssertFalse(text.lowercased().contains("e"), text)
            XCTAssertFalse(text.contains(","), text)
            XCTAssertEqual(Double(text)!, value, accuracy: 1e-15, text)
        }
    }

    func testNumbersDoNotDependOnTheLocale() {
        // The formatter never consults the user's locale: same text whatever the process locale is.
        let before = LocationBodyBuilder.number(1e-7)
        XCTAssertEqual(before, "0.0000001")
        XCTAssertEqual(String(format: "%.1f", locale: Locale(identifier: "es_ES"), 1.5), "1,5") // control: locales do change printf
        XCTAssertEqual(LocationBodyBuilder.number(1.5), "1.5")
    }

    func testExtrasAtTheRootSortedByKeyWithEscaping() {
        let builder = LocationBodyBuilder(extras: [
            "z_text": .string("a\"b\\c\nd\u{01}é"),
            "driver_id": 42,
            "ratio": 0.25
        ])
        XCTAssertEqual(builder.jsonString(for: fix(1, 2)),
                       #"{"location":{"lat":1,"lng":2,"v":"1.0"},"driver_id":42,"ratio":0.25,"z_text":"a\"b\\c\nd\u0001é"}"#)
    }

    func testNoExtras() {
        XCTAssertEqual(LocationBodyBuilder(extras: [:]).jsonString(for: fix(1, 2)),
                       #"{"location":{"lat":1,"lng":2,"v":"1.0"}}"#)
    }

    func testFixValidity() {
        XCTAssertTrue(fix(90, 180).isValid)
        XCTAssertFalse(fix(90.1, 0).isValid)
        XCTAssertFalse(fix(0, -180.1).isValid)
        XCTAssertFalse(fix(.nan, 0).isValid)
        XCTAssertFalse(LocationFix(lat: 0, lng: 0, accuracy: -1, speed: nil, timestamp: Date(), mock: false).isValid)
    }
}
