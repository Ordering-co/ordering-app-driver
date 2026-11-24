import XCTest
@testable import DriverLocationCore

/// `location_at`: the instant the fix was TAKEN, UTC, `YYYY-MM-DD HH:mm:ss`, nothing of the device's locale.
final class LocationAtTests: XCTestCase {
    // (epoch seconds, expected), computed outside the code under test (Python's datetime in UTC).
    private let vectors: [(Double, String)] = [
        (0, "1970-01-01 00:00:00"),
        (-1, "1969-12-31 23:59:59"),
        (-2_208_988_800, "1900-01-01 00:00:00"),
        (946_684_799, "1999-12-31 23:59:59"),          // year boundary
        (946_684_800, "2000-01-01 00:00:00"),
        (951_782_400, "2000-02-29 00:00:00"),          // 2000 is a leap year
        (1_700_000_000, "2023-11-14 22:13:20"),
        (1_709_208_000, "2024-02-29 12:00:00"),
        (1_709_251_199, "2024-02-29 23:59:59"),        // end of a leap day
        (1_709_251_200, "2024-03-01 00:00:00"),        // month boundary
        (1_795_096_987, "2026-11-19 14:03:07"),
        (1_795_098_600, "2026-11-19 14:30:00"),
        (1_798_761_599, "2026-12-31 23:59:59"),
        (1_798_761_600, "2027-01-01 00:00:00"),
        (2_147_483_647, "2038-01-19 03:14:07"),
        (2_147_483_648, "2038-01-19 03:14:08"),
        (4_107_455_999, "2100-02-27 23:59:59"),
        (4_107_542_399, "2100-02-28 23:59:59"),        // 2100 is NOT a leap year...
        (4_107_542_400, "2100-03-01 00:00:00")         // ...so the next second is March 1st
    ]

    private func fix(taken seconds: Double, index: Int = 1) -> LocationFix {
        return LocationFix(lat: Double(index) / 1000, lng: -122.5, accuracy: 5, speed: 1.5,
                           timestamp: Date(timeIntervalSince1970: seconds), mock: false)
    }

    func testFormatsTheBoundaries() {
        for (seconds, expected) in vectors {
            XCTAssertEqual(LocationAt.format(Date(timeIntervalSince1970: seconds)), expected)
        }
    }

    func testTruncatesTheFractionNeverRounds() {
        XCTAssertEqual(LocationAt.format(Date(timeIntervalSince1970: 1_700_000_000.0)), "2023-11-14 22:13:20")
        XCTAssertEqual(LocationAt.format(Date(timeIntervalSince1970: 1_700_000_000.999)), "2023-11-14 22:13:20")
        XCTAssertEqual(LocationAt.format(Date(timeIntervalSince1970: 1_700_000_001.0)), "2023-11-14 22:13:21")
        XCTAssertEqual(LocationAt.format(Date(timeIntervalSince1970: -0.001)), "1969-12-31 23:59:59")
    }

    func testEverySecondOfADayHasTheShape() {
        let shape = try! NSRegularExpression(pattern: #"^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$"#)
        for second in stride(from: 0, to: 86_400, by: 37) {
            let text = LocationAt.format(Date(timeIntervalSince1970: 1_795_046_400 + Double(second)))
            XCTAssertEqual(shape.numberOfMatches(in: text, range: NSRange(text.startIndex..., in: text)), 1, text)
        }
    }

    func testAFixFromAnotherTimeZonesLocalMidnightIsSentInUtc() {
        // 2026-11-20 00:30 in Auckland (UTC+13 in November) is 2026-11-19 11:30 UTC.
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "Pacific/Auckland")!
        let auckland = calendar.date(from: DateComponents(year: 2026, month: 11, day: 20, hour: 0, minute: 30, second: 0))!
        XCTAssertEqual(LocationAt.format(auckland), "2026-11-19 11:30:00")
        calendar.timeZone = TimeZone(identifier: "America/Los_Angeles")!
        let la = calendar.date(from: DateComponents(year: 2026, month: 11, day: 18, hour: 23, minute: 59, second: 59))!
        XCTAssertEqual(LocationAt.format(la), "2026-11-19 07:59:59")
    }

    func testTheDevicesLocaleCalendarAndDigitsChangeNothing() {
        // The formatter reads no locale at all; this proves it by formatting the same instant with each
        // locale/calendar identifier's own formatter output as a control (they differ), and ours never does.
        let taken = Date(timeIntervalSince1970: 1_795_096_987)
        let identifiers = ["ar_SA@calendar=islamic-umalqura", "ar_EG@numbers=arab", "fa_IR@numbers=arabext",
                           "hi_IN@numbers=deva", "th_TH@calendar=buddhist", "ja_JP@calendar=japanese", "bn_BD@numbers=beng", "en_US_POSIX"]
        var differing = 0
        for identifier in identifiers {
            let control = DateFormatter()
            control.locale = Locale(identifier: identifier)
            control.timeZone = TimeZone(identifier: "UTC")
            control.dateFormat = "yyyy-MM-dd HH:mm:ss"
            if control.string(from: taken) != "2026-11-19 14:03:07" { differing += 1 }
            XCTAssertEqual(LocationAt.format(taken), "2026-11-19 14:03:07", identifier)
        }
        XCTAssertGreaterThan(differing, 0, "the control formatter should have been fooled by at least one of those locales")
        let body = LocationBodyBuilder(extras: ["driver_id": 7], sendLocationAt: true).jsonString(for: fix(taken: 1_795_096_987))
        XCTAssertTrue(body.contains(#""location_at":"2026-11-19 14:03:07""#))
        XCTAssertTrue(body.unicodeScalars.allSatisfy { $0.value < 128 })
    }

    func testOffTheBodyIsExactlyToday() {
        let today = #"{"location":{"lat":0.001,"lng":-122.5,"v":"1.0"},"driver_id":7}"#
        let off = LocationBodyBuilder(extras: ["driver_id": 7], sendLocationAt: false).jsonString(for: fix(taken: 1_795_096_987))
        XCTAssertEqual(off, today)
        XCTAssertEqual(LocationBodyBuilder(extras: ["driver_id": 7]).jsonString(for: fix(taken: 1_795_096_987)), today)
        XCTAssertFalse(off.contains("location_at"))
    }

    func testOnTheKeyIsAtTheTopLevelRightAfterLocationAndTheRestIsUnchanged() throws {
        let body = LocationBodyBuilder(extras: ["driver_id": 7], sendLocationAt: true).jsonString(for: fix(taken: 1_795_096_987))
        XCTAssertEqual(body, #"{"location":{"lat":0.001,"lng":-122.5,"v":"1.0"},"location_at":"2026-11-19 14:03:07","driver_id":7}"#)
        let object = try XCTUnwrap(JSONSerialization.jsonObject(with: Data(body.utf8)) as? [String: Any])
        XCTAssertEqual(Set(object.keys), ["location", "location_at", "driver_id"])
        XCTAssertEqual(LocationBodyBuilder(extras: [:], sendLocationAt: true).jsonString(for: fix(taken: 1_795_096_987)),
                       #"{"location":{"lat":0.001,"lng":-122.5,"v":"1.0"},"location_at":"2026-11-19 14:03:07"}"#)
    }

    func testAnExtrasKeyCalledLocationAtCollidesOnlyWhenItIsSent() {
        XCTAssertNoThrow(try Config(url: testURL, headers: ["A": "b"], extras: ["location_at": "x"]))
        XCTAssertThrowsError(try Config(url: testURL, headers: ["A": "b"], extras: ["location_at": "x"], sendLocationAt: true)) {
            XCTAssertEqual($0 as? ConfigError, .invalidExtras)
        }
    }

    func testTheConfigDefaultsAreOffAndSurviveHeaderChanges() throws {
        let plain = try Config(url: testURL, headers: ["A": "b"])
        XCTAssertEqual(plain.minSendIntervalMs, 0)
        XCTAssertFalse(plain.sendLocationAt)
        let on = try Config(url: testURL, headers: ["A": "b"], minSendIntervalMs: 1500, sendLocationAt: true)
        for copy in [try on.replacingHeaders(["C": "d"]), try on.addingDefaultHeaders(["User-Agent": "ua"])] {
            XCTAssertEqual(copy.minSendIntervalMs, 1500)
            XCTAssertTrue(copy.sendLocationAt)
        }
    }

    func testTheIntervalIsValidated() {
        XCTAssertNoThrow(try Config(url: testURL, headers: ["A": "b"], minSendIntervalMs: Config.maxMinSendIntervalMs))
        for bad in [-1, Config.maxMinSendIntervalMs + 1] {
            XCTAssertThrowsError(try Config(url: testURL, headers: ["A": "b"], minSendIntervalMs: bad)) {
                XCTAssertEqual($0 as? ConfigError, .invalidMinSendInterval)
            }
        }
    }

    // MARK: through the sender: the fix's own time, however late it goes out

    private func times(_ rig: SenderRig) -> [String?] {
        return rig.transport.requests.map { request in
            let body = String(decoding: request.body, as: UTF8.self)
            guard let range = body.range(of: #""location_at":""#) else { return nil }
            return String(body[range.upperBound...].prefix(19))
        }
    }

    func testAFixSentLateAfterAnOutageKeepsItsOwnTime() {
        // makeFix(1)'s own time is 2023-11-14 22:13:21 UTC; the virtual "now" of the rig is ten minutes later.
        let rig2 = SenderRig(config: makeConfig(sendLocationAt: true))
        rig2.transport.fallback = .networkError("x")
        rig2.submit(1); rig2.advance(600)
        rig2.transport.fallback = .response(status: 200)
        rig2.sender.connectivityRestored(); rig2.idle()
        XCTAssertEqual(times(rig2).last, "2023-11-14 22:13:21") // not the time of sending
    }

    func testAFixFromTheQueueOfAPreviousRunKeepsItsOwnTime() {
        let directory = makeTempDirectory()
        let first = SenderRig(directory: directory, config: makeConfig(sendLocationAt: true), started: false)
        first.transport.fallback = .networkError("x")
        first.sender.start(); first.idle()
        first.submit(1)
        first.sender.stop(); first.idle()
        let second = SenderRig(directory: directory, config: makeConfig(sendLocationAt: true))
        XCTAssertEqual(times(second), ["2023-11-14 22:13:21"])
    }

    func testAFixSentAfterTheIntervalKeepsItsOwnTime() {
        let rig = SenderRig(config: makeConfig(discardOlderOnSuccess: true, minSendIntervalMs: 1500, sendLocationAt: true))
        rig.submit(1)
        rig.advance(0.25); rig.submit(2)                  // taken at ...:22, sent 1.25 s later
        rig.advance(1.25)
        XCTAssertEqual(times(rig), ["2023-11-14 22:13:21", "2023-11-14 22:13:22"])
    }

    func testOffTheRequestsCarryNoLocationAt() {
        let rig = SenderRig(config: makeConfig(sendLocationAt: false))
        rig.submit(1)
        XCTAssertEqual(times(rig), [nil])
        XCTAssertFalse(String(decoding: rig.transport.requests[0].body, as: UTF8.self).contains("location_at"))
    }

    func testTheConfigCanSwitchItOnAndOffAtRunTime() {
        let rig = SenderRig(config: makeConfig(sendLocationAt: false))
        rig.submit(1)
        rig.sender.configure(makeConfig(sendLocationAt: true)); rig.idle()
        rig.submit(2)
        rig.sender.configure(makeConfig(sendLocationAt: false)); rig.idle()
        rig.submit(3)
        XCTAssertEqual(times(rig).map { $0 != nil }, [false, true, false])
    }
}
