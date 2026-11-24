import Foundation
import CoreLocation

/// A reading as the platform gives it, before validation. `isSimulated` is
/// `CLLocation.sourceInformation?.isSimulatedBySoftware` (iOS 15+).
public struct RawLocation: Equatable {
    public var lat: Double
    public var lng: Double
    public var horizontalAccuracy: Double
    public var speed: Double
    public var timestamp: Date
    public var isSimulated: Bool

    public init(lat: Double, lng: Double, horizontalAccuracy: Double, speed: Double, timestamp: Date, isSimulated: Bool) {
        self.lat = lat
        self.lng = lng
        self.horizontalAccuracy = horizontalAccuracy
        self.speed = speed
        self.timestamp = timestamp
        self.isSimulated = isSimulated
    }

    public init(_ location: CLLocation) {
        self.init(lat: location.coordinate.latitude,
                  lng: location.coordinate.longitude,
                  horizontalAccuracy: location.horizontalAccuracy,
                  speed: location.speed,
                  timestamp: location.timestamp,
                  isSimulated: location.sourceInformation?.isSimulatedBySoftware ?? false)
    }
}

/// What the tracker needs from `CLLocationManager`, so its logic is tested with a fake.
public protocol LocationManaging: AnyObject {
    var eventHandler: LocationManagerEventHandler? { get set }
    var allowsBackgroundLocationUpdates: Bool { get set }
    var pausesLocationUpdatesAutomatically: Bool { get set }
    var activityType: CLActivityType { get set }
    var desiredAccuracy: CLLocationAccuracy { get set }
    var distanceFilter: CLLocationDistance { get set }
    var showsBackgroundLocationIndicator: Bool { get set }
    var authorization: LocationAuthorization { get }
    /// `accuracyAuthorization == .fullAccuracy`.
    var preciseLocation: Bool { get }
    var servicesEnabled: Bool { get }
    func startUpdatingLocation()
    func stopUpdatingLocation()
}

public protocol LocationManagerEventHandler: AnyObject {
    func manager(didUpdate locations: [RawLocation])
    /// Authorization or "location services" changed: read them again.
    func managerDidChangeAuthorization()
}

/// The contract's names for the authorization (`always` | `while_in_use` | `denied` | `restricted` | `not_determined`) and the
/// precision flag (only an authorized app can be precise).
public enum PermissionMapper {
    public static func contractName(_ value: LocationAuthorization) -> String {
        switch value {
        case .authorizedAlways: return "always"
        case .authorizedWhenInUse: return "while_in_use"
        case .denied: return "denied"
        case .restricted: return "restricted"
        case .notDetermined: return "not_determined"
        }
    }

    public static func state(_ value: LocationAuthorization, precise: Bool) -> PermissionState {
        let authorized = value == .authorizedAlways || value == .authorizedWhenInUse
        return PermissionState(authorization: contractName(value), precise: authorized && precise)
    }
}

/// What the tracker feeds. `LocationSender` conforms.
public protocol FixSink: AnyObject {
    func submit(_ fix: LocationFix)
    func setAuthorization(_ value: LocationAuthorization)
    func setServicesEnabled(_ value: Bool)
}

extension LocationSender: FixSink {}

/// The CoreLocation adapter: configures the manager for continuous background tracking, turns
/// readings into `LocationFix`es (dropping the invalid and the stale ones), feeds the sink and
/// reports authorization / services changes. It never requests permissions (`PermissionsContext` does).
public final class LocationTracker: LocationManagerEventHandler {
    /// A reading older than this when it arrives is dropped (a cached position from an earlier run).
    public static let defaultMaxFixAge: TimeInterval = 60

    private let manager: LocationManaging
    private let sink: FixSink
    private let now: () -> Date
    private let maxFixAge: TimeInterval
    private let lock = NSLock()
    private var running = false
    /// The events recorder (optional): hears the services, the authorization, a simulated fix and a heartbeat per batch of fixes.
    public weak var signals: TrackingSignalSink?

    public init(manager: LocationManaging, sink: FixSink,
                maxFixAge: TimeInterval = LocationTracker.defaultMaxFixAge,
                now: @escaping () -> Date = Date.init) {
        self.manager = manager
        self.sink = sink
        self.maxFixAge = maxFixAge
        self.now = now
        manager.eventHandler = self
    }

    public var isRunning: Bool { lock.lock(); defer { lock.unlock() }; return running }

    /// Configures the manager, starts the updates and reports the current authorization / services.
    /// Needs `UIBackgroundModes` to contain `location` (the system raises an exception otherwise).
    public func start(distanceFilter: Double) {
        manager.allowsBackgroundLocationUpdates = true
        manager.pausesLocationUpdatesAutomatically = false
        manager.activityType = .automotiveNavigation
        manager.desiredAccuracy = kCLLocationAccuracyBest
        manager.distanceFilter = distanceFilter
        manager.showsBackgroundLocationIndicator = true
        lock.lock(); running = true; lock.unlock()
        reportAuthorization()
        manager.startUpdatingLocation()
    }

    public func stop() {
        lock.lock(); running = false; lock.unlock()
        manager.stopUpdatingLocation()
    }

    /// A new distance filter takes effect without restarting the updates.
    public func updateDistanceFilter(_ value: Double) {
        manager.distanceFilter = value
    }

    // MARK: - LocationManagerEventHandler

    public func manager(didUpdate locations: [RawLocation]) {
        guard isRunning else { return }
        let current = now()
        signals?.heartbeat()
        for raw in locations {
            // What the OS says about the fix, whatever the mock policy decides about sending it.
            if raw.isSimulated { signals?.mock(provider: nil) }
            guard let fix = convert(raw, now: current) else { continue }
            sink.submit(fix)
        }
    }

    public func managerDidChangeAuthorization() {
        reportAuthorization()
    }

    // MARK: - Internals

    func convert(_ raw: RawLocation, now: Date) -> LocationFix? {
        guard raw.horizontalAccuracy >= 0 else { return nil } // CoreLocation: negative means invalid
        guard now.timeIntervalSince(raw.timestamp) <= maxFixAge else { return nil }
        let fix = LocationFix(lat: raw.lat, lng: raw.lng, accuracy: raw.horizontalAccuracy,
                              speed: raw.speed >= 0 ? raw.speed : nil,
                              timestamp: raw.timestamp, mock: raw.isSimulated)
        return fix.isValid ? fix : nil
    }

    private func reportAuthorization() {
        sink.setAuthorization(manager.authorization)
        sink.setServicesEnabled(manager.servicesEnabled)
        signals?.gps(on: manager.servicesEnabled)
        signals?.permission(PermissionMapper.state(manager.authorization, precise: manager.preciseLocation))
    }
}
