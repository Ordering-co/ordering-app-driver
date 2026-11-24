import Foundation
import CoreLocation

/// The real `CLLocationManager` behind `LocationManaging`. Create it on the main thread (it needs a
/// run loop for its delegate callbacks).
public final class SystemLocationManager: NSObject, LocationManaging, CLLocationManagerDelegate {
    private let manager: CLLocationManager
    private var cachedServicesEnabled = true
    private let servicesQueue = DispatchQueue(label: "co.ordering.driverlocation.services", qos: .utility)

    public weak var eventHandler: LocationManagerEventHandler?

    public override init() {
        manager = CLLocationManager()
        super.init()
        manager.delegate = self
        refreshServices()
    }

    public var allowsBackgroundLocationUpdates: Bool {
        get {
            #if os(iOS)
            return manager.allowsBackgroundLocationUpdates
            #else
            return false
            #endif
        }
        set {
            #if os(iOS)
            manager.allowsBackgroundLocationUpdates = newValue
            #endif
        }
    }

    public var pausesLocationUpdatesAutomatically: Bool {
        get {
            #if os(iOS)
            return manager.pausesLocationUpdatesAutomatically
            #else
            return false
            #endif
        }
        set {
            #if os(iOS)
            manager.pausesLocationUpdatesAutomatically = newValue
            #endif
        }
    }

    public var showsBackgroundLocationIndicator: Bool {
        get {
            #if os(iOS)
            return manager.showsBackgroundLocationIndicator
            #else
            return false
            #endif
        }
        set {
            #if os(iOS)
            manager.showsBackgroundLocationIndicator = newValue
            #endif
        }
    }

    public var activityType: CLActivityType {
        get { return manager.activityType }
        set { manager.activityType = newValue }
    }

    public var desiredAccuracy: CLLocationAccuracy {
        get { return manager.desiredAccuracy }
        set { manager.desiredAccuracy = newValue }
    }

    public var distanceFilter: CLLocationDistance {
        get { return manager.distanceFilter }
        set { manager.distanceFilter = newValue }
    }

    public var authorization: LocationAuthorization {
        return SystemLocationManager.map(manager.authorizationStatus)
    }

    /// Full accuracy (the exact position) as opposed to the "Precise Location" switch being off.
    public var preciseLocation: Bool {
        return manager.accuracyAuthorization == .fullAccuracy
    }

    /// Cached: `CLLocationManager.locationServicesEnabled()` must not run on the main thread.
    public var servicesEnabled: Bool { return cachedServicesEnabled }

    public func startUpdatingLocation() {
        refreshServices()
        manager.startUpdatingLocation()
    }

    public func stopUpdatingLocation() {
        manager.stopUpdatingLocation()
    }

    static func map(_ status: CLAuthorizationStatus) -> LocationAuthorization {
        switch status {
        case .notDetermined: return .notDetermined
        case .restricted: return .restricted
        case .denied: return .denied
        case .authorizedAlways: return .authorizedAlways
        #if os(iOS)
        case .authorizedWhenInUse: return .authorizedWhenInUse
        #endif
        default: return .authorizedWhenInUse
        }
    }

    private func refreshServices() {
        servicesQueue.async { [weak self] in
            let enabled = CLLocationManager.locationServicesEnabled()
            DispatchQueue.main.async {
                guard let self = self, self.cachedServicesEnabled != enabled else { return }
                self.cachedServicesEnabled = enabled
                self.eventHandler?.managerDidChangeAuthorization()
            }
        }
    }

    // MARK: - CLLocationManagerDelegate

    public func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        eventHandler?.manager(didUpdate: locations.map(RawLocation.init))
    }

    public func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        refreshServices()
        eventHandler?.managerDidChangeAuthorization()
    }

    public func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        // Transient errors (kCLErrorLocationUnknown) need no action; a denial arrives as an authorization change.
    }
}
