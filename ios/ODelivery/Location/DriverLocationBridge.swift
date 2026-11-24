import Foundation
import os
import DriverLocationCore

/// The module's log lines, the same ones Android writes (tag `DriverLocation`): one subsystem and one category,
/// so Console.app and `log stream` can filter them (docs/LOCATION_MODULE.md, "Logs").
///
/// Info level for what happens on every position (a fix, a request, an answer), notice for the rest. Nothing
/// sensitive reaches a release build: no coordinates, no body, no url, no header, no token (a line carries
/// numbers, flags and fixed words); the debug build adds the coordinates and the exact request body.
private enum DriverLocationLog {
  static let subsystem = "co.ordering.driverlocation"
  static let category = "DriverLocation"
  static let logger = Logger(subsystem: subsystem, category: category)
}

/// The Swift half of the `DriverLocation` TurboModule (`RCTDriverLocation.mm` is the Objective-C++ half).
///
/// One per process: it owns the `DriverLocationService` of the core (created at launch on the main
/// thread, see `AppDelegate`), is the service's only `LocationEventDelegate`, and forwards the events to
/// whichever TurboModule instance is attached. A reload of the JavaScript bundle replaces the module
/// instance, never this object nor the service: sending goes on, and there is always one subscription.
/// The core stays free of `@objc`; everything React Native needs is here.
@objc(DriverLocationBridge)
public final class DriverLocationBridge: NSObject, LocationEventDelegate, EventsListener {
  @objc public static let shared = DriverLocationBridge()

  private let lock = NSLock()
  private var created: DriverLocationService?
  private var owner: AnyObject?
  private var locationSink: (([String: Any]) -> Void)?
  private var httpSink: (([String: Any]) -> Void)?
  private var stateSink: (([String: Any]) -> Void)?
  /// Events leave the core's private queue here, in order, before they reach React Native.
  private let eventQueue = DispatchQueue(label: "co.ordering.driverlocation.events")
  /// Only for the "tracking started" line.
  private var configuredDistance: Double = 0

  private override init() { super.init() }

  /// The service, created on first use on the main thread (`SystemLocationManager` needs a run loop).
  private var service: DriverLocationService {
    lock.lock()
    if let existing = created { lock.unlock(); return existing }
    lock.unlock()
    let make = { () -> DriverLocationService in
      self.lock.lock(); defer { self.lock.unlock() }
      if let existing = self.created { return existing }
      #if DEBUG
      let isRelease = false
      #else
      let isRelease = true
      #endif
      let service = DriverLocationService(queueDirectory: DriverLocationBridge.queueDirectory(),
                                          isReleaseBuild: isRelease,
                                          manager: SystemLocationManager(),
                                          onLog: { text in DriverLocationLog.logger.notice("\(text, privacy: .public)") })
      service.delegate = self
      service.eventsListener = self
      self.created = service
      return service
    }
    return Thread.isMainThread ? make() : DispatchQueue.main.sync(execute: make)
  }

  /// Application Support/DriverLocation: inside the app container (not `Caches`), excluded from backups.
  private static func queueDirectory() -> URL {
    let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first
      ?? URL(fileURLWithPath: NSTemporaryDirectory())
    let directory = base.appendingPathComponent("DriverLocation", isDirectory: true)
    try? FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    var values = URLResourceValues()
    values.isExcludedFromBackup = true
    var mutable = directory
    try? mutable.setResourceValues(values)
    return directory
  }

  /// Called from `AppDelegate` at launch: creates the service (nothing starts until JavaScript calls `start`).
  @objc public func bootstrap() { _ = service }

  // MARK: - Module surface

  @objc public func attach(owner: AnyObject,
                           onLocation: @escaping ([String: Any]) -> Void,
                           onHttp: @escaping ([String: Any]) -> Void,
                           onState: @escaping ([String: Any]) -> Void) {
    lock.lock(); defer { lock.unlock() }
    self.owner = owner
    locationSink = onLocation
    httpSink = onHttp
    stateSink = onState
  }

  /// Only the module that is attached can detach (a new instance may already have taken over).
  @objc public func detach(owner: AnyObject) {
    lock.lock(); defer { lock.unlock() }
    guard self.owner === owner else { return }
    self.owner = nil
    locationSink = nil
    httpSink = nil
    stateSink = nil
  }

  /// `headers` and `extras` are what JavaScript sent (`UnsafeObject`). Throws an `NSError` whose text
  /// never contains a value (the headers hold the token).
  @objc public func configure(url: String, headers: Any?, extras: Any?, distanceFilter: Double,
                              maxQueue: Double, discardOlderOnSuccess: Bool,
                              rejectMock: Bool, minSendIntervalMs: Double,
                              sendLocationAt: Bool, eventsUrl: String?) throws -> [String: Any] {
    guard let rawHeaders = headers as? [String: Any] else { throw DriverLocationBridge.error(ConfigError.invalidHeaders) }
    var stringHeaders: [String: String] = [:]
    for (name, value) in rawHeaders {
      guard let text = value as? String else { throw DriverLocationBridge.error(ConfigError.invalidHeaders) }
      stringHeaders[name] = text
    }
    var typedExtras: [String: ExtraValue] = [:]
    if extras != nil && !(extras is NSNull) {
      guard let rawExtras = extras as? [String: Any] else { throw DriverLocationBridge.error(ConfigError.invalidExtras) }
      for (key, value) in rawExtras {
        if let text = value as? String {
          typedExtras[key] = .string(text)
        } else if let number = value as? NSNumber, CFGetTypeID(number) != CFBooleanGetTypeID() {
          let double = number.doubleValue
          if double.isFinite, double == double.rounded(), abs(double) < 9_007_199_254_740_992 {
            typedExtras[key] = .int(Int(double))
          } else {
            typedExtras[key] = .double(double)
          }
        } else {
          throw DriverLocationBridge.error(ConfigError.invalidExtras)
        }
      }
    }
    let queueSize = (maxQueue.isFinite && maxQueue == maxQueue.rounded() && abs(maxQueue) < 1e9) ? Int(maxQueue) : 0
    // A number that is not a whole count of milliseconds is not a valid interval: the core rejects the -1.
    let intervalMs = (minSendIntervalMs.isFinite && minSendIntervalMs == minSendIntervalMs.rounded() && abs(minSendIntervalMs) < 1e9) ? Int(minSendIntervalMs) : -1
    do {
      // The headers every request of the app carries (User-Agent, X-Device-Id-X) are set here, natively,
      // never by JavaScript: the same values React Native's requests carry (`UserAgent.headers()` in
      // AppDelegate.swift). The device id is read from the Keychain now, when JavaScript configures
      // (the app is running and the phone unlocked), and never stored by the module. A header JavaScript
      // sent wins.
      let config = try Config(url: url, headers: stringHeaders, extras: typedExtras,
                              distanceFilter: distanceFilter, maxQueue: queueSize,
                              discardOlderOnSuccess: discardOlderOnSuccess,
                              rejectMock: rejectMock,
                              minSendIntervalMs: intervalMs,
                              sendLocationAt: sendLocationAt,
                              eventsUrl: eventsUrl)
        .addingDefaultHeaders(UserAgent.headers())
      lock.lock(); configuredDistance = distanceFilter; lock.unlock()
      DriverLocationLog.logger.notice("configured (distance=\(distanceFilter, format: .fixed(precision: 1), privacy: .public) m, maxQueue=\(queueSize, privacy: .public), discardOlder=\(discardOlderOnSuccess, privacy: .public), rejectMock=\(rejectMock, privacy: .public), minSendInterval=\(intervalMs, privacy: .public) ms, sendLocationAt=\(sendLocationAt, privacy: .public), events=\(eventsUrl != nil, privacy: .public))")
      return DriverLocationBridge.dictionary(service.configure(config))
    } catch let error as ConfigError {
      throw DriverLocationBridge.error(error)
    }
  }

  /// The API's root, so the device id goes to the API and to no other host (`ApiHosts` in AppDelegate.swift). Any thread.
  @objc public func setApiRoot(_ root: String) -> Bool {
    return ApiHosts.shared.set(root)
  }

  /// CoreLocation is driven from the main thread (its manager lives on that run loop).
  /// `reason`: the `tracking_started` reason JavaScript gives (nil from an older caller).
  @objc public func start(reason: String?, completion: @escaping ([String: Any]) -> Void) {
    DispatchQueue.main.async {
      let state = self.service.start(reason: reason)
      if state.enabled {
        self.lock.lock(); let distance = self.configuredDistance; self.lock.unlock()
        DriverLocationLog.logger.notice("tracking started (distance=\(distance, format: .fixed(precision: 1), privacy: .public) m, queued=\(state.queued, privacy: .public))")
      } else {
        DriverLocationLog.logger.error("start ignored: not configured")
      }
      completion(DriverLocationBridge.dictionary(state))
    }
  }

  /// `reason`: the `tracking_stopped` reason JavaScript gives. With no tracking running it also reports a session the process
  /// left without a stop (the module's `closeOrphan`).
  @objc public func stop(reason: String?, completion: @escaping ([String: Any]) -> Void) {
    DispatchQueue.main.async {
      let state = self.service.stop(reason: reason)
      DriverLocationLog.logger.notice("tracking stopped (queued=\(state.queued, privacy: .public))")
      completion(DriverLocationBridge.dictionary(state))
    }
  }

  @objc public func state() -> [String: Any] { DriverLocationBridge.dictionary(service.state()) }

  @objc public func flush() { service.flush() }

  // MARK: - LocationEventDelegate (the core's private queue)

  public func onHttp(success: Bool, status: Int) {
    DriverLocationLog.logger.info("http \(status, privacy: .public) success=\(success, privacy: .public)")
    deliver(["success": success, "status": status], to: \.httpSink)
  }

  public func onLocationAccepted(_ fix: LocationFix) {
    #if DEBUG
    DriverLocationLog.logger.info("location accepted lat=\(fix.lat, privacy: .public) lng=\(fix.lng, privacy: .public) mock=\(fix.mock, privacy: .public)")
    #else
    DriverLocationLog.logger.info("location accepted")
    #endif
    let body: [String: Any] = [
      "lat": fix.lat,
      "lng": fix.lng,
      "accuracy": fix.accuracy,
      "speed": fix.speed.map { $0 as Any } ?? NSNull(),
      "timestamp": DriverLocationBridge.milliseconds(fix.timestamp),
      "mock": fix.mock
    ]
    deliver(body, to: \.locationSink)
  }

  public func onState(_ kind: StateKind) {
    DriverLocationLog.logger.notice("state \(kind.rawValue, privacy: .public)")
    deliver(["kind": kind.rawValue], to: \.stateSink)
  }

  /// The exact body only in a debug build; a release build writes the queue size alone.
  public func onRequest(body: String, queued: Int) {
    #if DEBUG
    DriverLocationLog.logger.info("request queued=\(queued, privacy: .public) body=\(body, privacy: .public)")
    #else
    DriverLocationLog.logger.info("request queued=\(queued, privacy: .public)")
    #endif
  }

  public func onRetryScheduled(delay: TimeInterval, status: Int?, queued: Int) {
    let milliseconds = Int((delay * 1000).rounded())
    if let status = status {
      DriverLocationLog.logger.notice("retry in \(milliseconds, privacy: .public) ms (http \(status, privacy: .public)) queued=\(queued, privacy: .public)")
    } else {
      DriverLocationLog.logger.notice("retry in \(milliseconds, privacy: .public) ms (network error) queued=\(queued, privacy: .public)")
    }
  }

  /// One line per discard, nothing to JavaScript.
  public func onDiscarded(count: Int) {
    DriverLocationLog.logger.notice("discarded \(count, privacy: .public) older positions")
  }

  public func onNetworkRestored() {
    DriverLocationLog.logger.notice("network available: flush")
  }

  /// The minimum send interval has not elapsed: the request goes out in `delay` seconds with the newest position.
  public func onSendDeferred(delay: TimeInterval, queued: Int) {
    let milliseconds = Int((delay * 1000).rounded())
    DriverLocationLog.logger.info("send in \(milliseconds, privacy: .public) ms (min interval) queued=\(queued, privacy: .public)")
  }

  // MARK: - EventsListener (the sender's queue): the log lines of the tracking events, the same ones Android writes.
  // Event names, counts and statuses only: never an event's JSON, a url, a header or a token.

  public func onEventRecorded(event: String, queued: Int) {
    DriverLocationLog.logger.notice("event \(event, privacy: .public) queued=\(queued, privacy: .public)")
  }

  public func onEventsRequest(count: Int, queued: Int) {
    DriverLocationLog.logger.notice("events request n=\(count, privacy: .public) queued=\(queued, privacy: .public)")
  }

  public func onEventsHttp(status: Int, count: Int) {
    DriverLocationLog.logger.notice("events http \(status, privacy: .public) n=\(count, privacy: .public)")
  }

  public func onEventsRetry(delay: TimeInterval, status: Int?, queued: Int) {
    let milliseconds = Int((delay * 1000).rounded())
    if let status = status {
      DriverLocationLog.logger.notice("events retry in \(milliseconds, privacy: .public) ms (http \(status, privacy: .public)) queued=\(queued, privacy: .public)")
    } else {
      DriverLocationLog.logger.notice("events retry in \(milliseconds, privacy: .public) ms (network error) queued=\(queued, privacy: .public)")
    }
  }

  public func onEventsDropped(count: Int, why: String) {
    DriverLocationLog.logger.error("events dropped \(count, privacy: .public) (\(why, privacy: .public))")
  }

  /// Hands the event to the attached module, if any (none while the JavaScript runtime is being replaced).
  private func deliver(_ body: [String: Any], to sink: KeyPath<DriverLocationBridge, (([String: Any]) -> Void)?>) {
    lock.lock(); let target = self[keyPath: sink]; lock.unlock()
    guard let target = target else { return }
    eventQueue.async { target(body) }
  }

  // MARK: - Conversions

  private static func milliseconds(_ date: Date) -> Double { (date.timeIntervalSince1970 * 1000).rounded() }

  /// The spec's names: `always` | `when_in_use` | `denied` | `restricted` | `not_determined`.
  static func authorizationName(_ value: LocationAuthorization) -> String {
    switch value {
    case .authorizedAlways: return "always"
    case .authorizedWhenInUse: return "when_in_use"
    case .denied: return "denied"
    case .restricted: return "restricted"
    case .notDetermined: return "not_determined"
    }
  }

  static func dictionary(_ state: LocationState) -> [String: Any] {
    [
      "enabled": state.enabled,
      "tracking": state.tracking,
      "queued": state.queued,
      "lastLocationAt": state.lastLocationAt.map { milliseconds($0) as Any } ?? NSNull(),
      "lastHttpStatus": state.lastHttpStatus.map { $0 as Any } ?? NSNull(),
      "authorization": authorizationName(state.authorization),
      "servicesEnabled": state.servicesEnabled
    ]
  }

  private static func error(_ error: ConfigError) -> NSError {
    NSError(domain: "DriverLocation", code: 1, userInfo: [NSLocalizedDescriptionKey: error.description])
  }
}
