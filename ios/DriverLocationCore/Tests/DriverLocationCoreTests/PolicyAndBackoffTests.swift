import XCTest
@testable import DriverLocationCore

final class MockPolicyTests: XCTestCase {
    func testReleaseDropsASimulatedFixWhateverTheOptionSays() {
        for reject in [false, true] {
            XCTAssertEqual(MockPolicy(isReleaseBuild: true).evaluate(makeFix(1, mock: true), rejectMock: reject), .reject)
        }
        XCTAssertEqual(MockPolicy(isReleaseBuild: true).evaluate(makeFix(1, mock: true)), .reject)
    }

    func testDebugWithTheOptionOffAcceptsASimulatedFixAsReal() {
        let decision = MockPolicy(isReleaseBuild: false).evaluate(makeFix(1, mock: true), rejectMock: false)
        XCTAssertEqual(decision, .acceptAsReal(makeFix(1, mock: true)))
        XCTAssertEqual(MockPolicy(isReleaseBuild: false).evaluate(makeFix(1, mock: true)), decision) // default is off
    }

    func testDebugWithTheOptionOnDropsASimulatedFix() {
        XCTAssertEqual(MockPolicy(isReleaseBuild: false).evaluate(makeFix(1, mock: true), rejectMock: true), .reject)
    }

    func testARealFixIsNeverAffected() {
        for release in [true, false] {
            for reject in [false, true] {
                XCTAssertEqual(MockPolicy(isReleaseBuild: release).evaluate(makeFix(1), rejectMock: reject),
                               .accept(makeFix(1)))
            }
        }
    }
}

final class BackoffTests: XCTestCase {
    func testSequenceIs5_15_60ThenEvery60() {
        var backoff = Backoff()
        XCTAssertEqual((0..<6).map { _ in backoff.nextDelay() }, [5, 15, 60, 60, 60, 60])
    }

    func testResetStartsAgain() {
        var backoff = Backoff()
        _ = backoff.nextDelay(); _ = backoff.nextDelay(); _ = backoff.nextDelay()
        backoff.reset()
        XCTAssertEqual([backoff.nextDelay(), backoff.nextDelay()], [5, 15])
    }
}

final class ConfigTests: XCTestCase {
    func testValidConfigAndDefaults() throws {
        let config = try Config(url: testURL, headers: ["Authorization": "Bearer t"])
        XCTAssertEqual(config.distanceFilter, 25)
        XCTAssertEqual(config.maxQueue, 500)
        XCTAssertTrue(config.discardOlderOnSuccess) // "latest wins" is the default
        XCTAssertFalse(config.rejectMock) // a simulated fix is sent as real in debug by default
        XCTAssertEqual(config.url.absoluteString, testURL)
        XCTAssertTrue(config.extras.isEmpty)
    }

    func testRejectMockSurvivesReplacingHeaders() throws {
        let config = try Config(url: testURL, headers: ["Authorization": "Bearer t"], rejectMock: true)
        XCTAssertTrue(try config.replacingHeaders(["Authorization": "Bearer u"]).rejectMock)
    }

    func testDefaultHeadersAreAddedWhenMissingAndTheConfigsOwnWin() throws {
        let config = try Config(url: testURL, headers: ["Authorization": "Bearer t"], extras: ["driver_id": 42],
                                distanceFilter: 10, maxQueue: 7, rejectMock: true)
        let added = try config.addingDefaultHeaders(["User-Agent": "App/1 (x)", "X-Device-Id-X": "abc123"])
        XCTAssertEqual(added.headers["Authorization"], "Bearer t")
        XCTAssertEqual(added.headers["User-Agent"], "App/1 (x)")
        XCTAssertEqual(added.headers["X-Device-Id-X"], "abc123")
        XCTAssertEqual(added.distanceFilter, 10)
        XCTAssertEqual(added.maxQueue, 7)
        XCTAssertTrue(added.rejectMock)
        XCTAssertEqual(added.extras, config.extras)
        // The config's own value wins, whatever the case of the name.
        let own = try Config(url: testURL, headers: ["user-agent": "Mine/2"])
        let kept = try own.addingDefaultHeaders(["User-Agent": "App/1 (x)"])
        XCTAssertEqual(kept.headers, ["user-agent": "Mine/2"])
        // Nothing to add: the same config.
        XCTAssertEqual(try config.addingDefaultHeaders([:]), config)
        XCTAssertEqual(try config.addingDefaultHeaders(["authorization": "x"]), config)
        XCTAssertThrowsError(try config.addingDefaultHeaders(["X-Device-Id-X": "a\nb"])) { XCTAssertEqual($0 as? ConfigError, .invalidHeaders) }
    }

    func testRejectsBadValues() {
        XCTAssertThrowsError(try Config(url: "", headers: [:])) { XCTAssertEqual($0 as? ConfigError, .invalidURL) }
        XCTAssertThrowsError(try Config(url: "ftp://x.com/a", headers: [:])) { XCTAssertEqual($0 as? ConfigError, .invalidURL) }
        XCTAssertThrowsError(try Config(url: "/users/1/locations", headers: [:])) { XCTAssertEqual($0 as? ConfigError, .invalidURL) }
        XCTAssertThrowsError(try Config(url: "https://", headers: [:])) { XCTAssertEqual($0 as? ConfigError, .invalidURL) }
        XCTAssertThrowsError(try Config(url: testURL, headers: ["Authorization": "Bearer a\r\nX: y"])) { XCTAssertEqual($0 as? ConfigError, .invalidHeaders) }
        XCTAssertThrowsError(try Config(url: testURL, headers: ["": "x"])) { XCTAssertEqual($0 as? ConfigError, .invalidHeaders) }
        XCTAssertThrowsError(try Config(url: testURL, headers: ["Authorization": ""])) { XCTAssertEqual($0 as? ConfigError, .invalidHeaders) }
        XCTAssertThrowsError(try Config(url: testURL, headers: [:], extras: ["location": 1])) { XCTAssertEqual($0 as? ConfigError, .invalidExtras) }
        XCTAssertThrowsError(try Config(url: testURL, headers: [:], extras: ["": 1])) { XCTAssertEqual($0 as? ConfigError, .invalidExtras) }
        XCTAssertThrowsError(try Config(url: testURL, headers: [:], distanceFilter: -1)) { XCTAssertEqual($0 as? ConfigError, .invalidDistanceFilter) }
        XCTAssertThrowsError(try Config(url: testURL, headers: [:], distanceFilter: .nan)) { XCTAssertEqual($0 as? ConfigError, .invalidDistanceFilter) }
        XCTAssertThrowsError(try Config(url: testURL, headers: [:], maxQueue: 0)) { XCTAssertEqual($0 as? ConfigError, .invalidMaxQueue) }
        XCTAssertThrowsError(try Config(url: testURL, headers: [:], maxQueue: Config.maxQueueLimit + 1)) { XCTAssertEqual($0 as? ConfigError, .invalidMaxQueue) }
    }

    func testErrorsDoNotEchoTheToken() {
        do {
            _ = try Config(url: testURL, headers: ["Authorization": "Bearer top-secret\n"])
            XCTFail("expected an error")
        } catch {
            XCTAssertFalse("\(error)".contains("top-secret"))
            XCTAssertFalse(String(describing: error).contains("top-secret"))
        }
    }

    func testDistanceFilterZeroIsAllowed() throws {
        XCTAssertEqual(try Config(url: testURL, headers: [:], distanceFilter: 0).distanceFilter, 0)
    }
}
