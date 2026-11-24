import XCTest
import CoreLocation
@testable import DriverLocationCore

final class TrackerTests: XCTestCase {
    private let t0 = Date(timeIntervalSince1970: 1_700_000_000)
    private var manager: FakeManager!
    private var sink: RecordingSink!
    private var tracker: LocationTracker!

    override func setUp() {
        manager = FakeManager()
        sink = RecordingSink()
        tracker = LocationTracker(manager: manager, sink: sink, maxFixAge: 60, now: { [t0] in t0 })
    }

    private func raw(lat: Double = 1, lng: Double = 2, accuracy: Double = 5, speed: Double = 3,
                     age: TimeInterval = 0, simulated: Bool = false) -> RawLocation {
        return RawLocation(lat: lat, lng: lng, horizontalAccuracy: accuracy, speed: speed,
                           timestamp: t0.addingTimeInterval(-age), isSimulated: simulated)
    }

    // MARK: - What it configures

    func testConfiguresTheManagerForBackgroundTracking() {
        tracker.start(distanceFilter: 25)
        XCTAssertTrue(manager.allowsBackgroundLocationUpdates)
        XCTAssertFalse(manager.pausesLocationUpdatesAutomatically)
        XCTAssertEqual(manager.activityType, .automotiveNavigation)
        XCTAssertEqual(manager.desiredAccuracy, kCLLocationAccuracyBest)
        XCTAssertEqual(manager.distanceFilter, 25)
        XCTAssertTrue(manager.showsBackgroundLocationIndicator)
        XCTAssertEqual(manager.startCount, 1)
        XCTAssertTrue(tracker.isRunning)
    }

    func testDistanceFilterComesFromTheConfig() {
        tracker.start(distanceFilter: 80)
        XCTAssertEqual(manager.distanceFilter, 80)
        tracker.updateDistanceFilter(10)
        XCTAssertEqual(manager.distanceFilter, 10)
        XCTAssertEqual(manager.startCount, 1) // not restarted
        XCTAssertEqual(manager.stopCount, 0)
    }

    func testStopStopsTheUpdates() {
        tracker.start(distanceFilter: 25)
        tracker.stop()
        XCTAssertEqual(manager.stopCount, 1)
        XCTAssertFalse(tracker.isRunning)
    }

    func testTheTrackerIsTheManagersHandler() {
        XCTAssertTrue(manager.eventHandler === tracker)
    }

    // MARK: - What it passes and drops

    func testAValidReadingBecomesAFix() {
        tracker.start(distanceFilter: 25)
        tracker.manager(didUpdate: [raw(lat: 37.5, lng: -122.25, accuracy: 4, speed: 8.5, age: 3)])
        XCTAssertEqual(sink.fixes, [LocationFix(lat: 37.5, lng: -122.25, accuracy: 4, speed: 8.5,
                                                timestamp: t0.addingTimeInterval(-3), mock: false)])
    }

    func testNegativeAccuracyIsDropped() {
        tracker.start(distanceFilter: 25)
        tracker.manager(didUpdate: [raw(accuracy: -1)])
        XCTAssertTrue(sink.fixes.isEmpty)
    }

    func testAccuracyZeroIsKept() {
        tracker.start(distanceFilter: 25)
        tracker.manager(didUpdate: [raw(accuracy: 0)])
        XCTAssertEqual(sink.fixes.count, 1)
    }

    func testStaleReadingsAreDropped() {
        tracker.start(distanceFilter: 25)
        tracker.manager(didUpdate: [raw(age: 61), raw(age: 3600), raw(lat: 9, age: 60)])
        XCTAssertEqual(sink.fixes.map { $0.lat }, [9]) // exactly at the limit is kept
    }

    func testOutOfRangeAndNonFiniteCoordinatesAreDropped() {
        tracker.start(distanceFilter: 25)
        tracker.manager(didUpdate: [raw(lat: 91), raw(lng: -181), raw(lat: .nan), raw(lng: .infinity)])
        XCTAssertTrue(sink.fixes.isEmpty)
    }

    func testInvalidSpeedBecomesNil() {
        tracker.start(distanceFilter: 25)
        tracker.manager(didUpdate: [raw(speed: -1)])
        XCTAssertNil(sink.fixes.first?.speed)
    }

    func testASimulatedReadingIsFlaggedForThePolicy() {
        tracker.start(distanceFilter: 25)
        tracker.manager(didUpdate: [raw(simulated: true)])
        XCTAssertEqual(sink.fixes.map { $0.mock }, [true]) // the sender's MockPolicy decides what happens to it
    }

    func testAbatchKeepsItsOrderAndDropsOnlyTheBadOnes() {
        tracker.start(distanceFilter: 25)
        tracker.manager(didUpdate: [raw(lat: 1), raw(lat: 2, accuracy: -1), raw(lat: 3), raw(lat: 4, age: 500), raw(lat: 5)])
        XCTAssertEqual(sink.fixes.map { $0.lat }, [1, 3, 5])
    }

    func testNothingIsPassedWhenNotRunning() {
        tracker.manager(didUpdate: [raw()])
        XCTAssertTrue(sink.fixes.isEmpty)
        tracker.start(distanceFilter: 25)
        tracker.stop()
        tracker.manager(didUpdate: [raw()])
        XCTAssertTrue(sink.fixes.isEmpty)
    }

    // MARK: - Authorization and services

    func testStartReportsTheCurrentAuthorizationAndServices() {
        manager.authorization = .authorizedWhenInUse
        manager.servicesEnabled = false
        tracker.start(distanceFilter: 25)
        XCTAssertEqual(sink.authorizations, [.authorizedWhenInUse])
        XCTAssertEqual(sink.services, [false])
    }

    func testChangesAreReportedToTheSink() {
        tracker.start(distanceFilter: 25)
        manager.authorization = .denied
        manager.servicesEnabled = false
        tracker.managerDidChangeAuthorization()
        XCTAssertEqual(sink.authorizations.last, .denied)
        XCTAssertEqual(sink.services.last, false)
    }

    func testChangesAreReportedEvenWhenNotRunning() {
        manager.authorization = .restricted
        tracker.managerDidChangeAuthorization()
        XCTAssertEqual(sink.authorizations, [.restricted])
    }

    // MARK: - The real conversions

    func testRawLocationFromACLLocation() {
        let when = Date(timeIntervalSince1970: 1_700_000_042)
        let location = CLLocation(coordinate: CLLocationCoordinate2D(latitude: 37.5, longitude: -122.25),
                                  altitude: 10, horizontalAccuracy: 6, verticalAccuracy: 3,
                                  course: 90, speed: 4.5, timestamp: when)
        let raw = RawLocation(location)
        XCTAssertEqual(raw, RawLocation(lat: 37.5, lng: -122.25, horizontalAccuracy: 6, speed: 4.5, timestamp: when, isSimulated: false))
    }

    func testAuthorizationMapping() {
        XCTAssertEqual(SystemLocationManager.map(.notDetermined), .notDetermined)
        XCTAssertEqual(SystemLocationManager.map(.restricted), .restricted)
        XCTAssertEqual(SystemLocationManager.map(.denied), .denied)
        XCTAssertEqual(SystemLocationManager.map(.authorizedAlways), .authorizedAlways)
    }
}
