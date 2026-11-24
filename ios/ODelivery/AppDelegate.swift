import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import GoogleMaps
import FirebaseCore
import RNBootSplash

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?
  var launchOptions: [UIApplication.LaunchOptionsKey: Any]?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    // Only an explicit Debug simulator preview may start without a provider registration.
    var localSimulatorMode = false
#if DEBUG && targetEnvironment(simulator)
    localSimulatorMode = ProcessInfo.processInfo.environment["ORDERING_LOCAL_SIMULATOR"] == "1"
#endif
    UserDefaults.standard.set(localSimulatorMode, forKey: "OrderingLocalSimulatorMode")
    UserDefaults.standard.removeObject(forKey: "OrderingLocalSimulatorConfig")
    if localSimulatorMode {
      if let raw = ProcessInfo.processInfo.environment["ORDERING_LOCAL_CONFIG"],
         let data = raw.data(using: .utf8),
         let config = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
        UserDefaults.standard.set(config, forKey: "OrderingLocalSimulatorConfig")
      }
    } else {
      FirebaseApp.configure()
    }
    // The User-Agent and X-Device-Id-X of every request (`UserAgent` below), set natively.
    UserAgent.install()

    // The driver location service lives as long as the process (it outlives a JavaScript reload).
    // Creating it starts nothing: tracking begins when JavaScript calls `start()`.
    if !localSimulatorMode { DriverLocationBridge.shared.bootstrap() }

    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    // Configurar Google Maps API Key
    if !localSimulatorMode { GMSServices.provideAPIKey("_GOOGLE_MAPS_API_KEY_") }

    // The window and React Native start in SceneDelegate (UIScene lifecycle,
    // required from iOS 27); the launch options are kept for it.
    self.launchOptions = launchOptions

    return true
  }

  func application(
    _ application: UIApplication,
    configurationForConnecting connectingSceneSession: UISceneSession,
    options: UIScene.ConnectionOptions
  ) -> UISceneConfiguration {
    let configuration = UISceneConfiguration(name: "Default Configuration", sessionRole: connectingSceneSession.role)
    configuration.delegateClass = SceneDelegate.self
    return configuration
  }

  // Manejo de URLs para deep linking
  func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey : Any] = [:]
  ) -> Bool {
    if RCTLinkingManager.application(app, open: url, options: options) {
      return true
    }
    return false
  }
}

/// The app's one scene (UIScene lifecycle): its window hosts React Native, and
/// the URLs it receives (deep links) go to React Native's Linking.
///
/// UIKit no longer calls the app delegate's URL methods once the app has a
/// scene manifest: a link opened while the app runs arrives here and is handed
/// to `RCTLinkingManager` by its scene entry points (its app-delegate ones do
/// nothing once the app has a scene manifest), and the link that launched the
/// app is given to React Native as a launch option (`Linking.getInitialURL()`
/// reads it from there: no JS listens yet).
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene,
          let appDelegate = UIApplication.shared.delegate as? AppDelegate,
          let factory = appDelegate.reactNativeFactory else { return }

    let window = UIWindow(windowScene: windowScene)
    self.window = window
    appDelegate.window = window

    factory.startReactNative(
      withModuleName: "deliveryApp",
      in: window,
      launchOptions: SceneDelegate.launchOptions(appDelegate.launchOptions, connectionOptions)
    )
  }

  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    RCTLinkingManager.scene(scene, openURLContexts: URLContexts)
  }

  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    RCTLinkingManager.scene(scene, continue: userActivity)
  }

  /// The app's launch options plus what launched the scene: with scenes, the
  /// URL (or the universal link) arrives in the connection options, and the
  /// app delegate's launch options no longer carry it.
  static func launchOptions(
    _ launchOptions: [UIApplication.LaunchOptionsKey: Any]?,
    _ connectionOptions: UIScene.ConnectionOptions
  ) -> [UIApplication.LaunchOptionsKey: Any] {
    var options = launchOptions ?? [:]
    if let url = connectionOptions.urlContexts.first?.url {
      options[.url] = url
    }
    if let activity = connectionOptions.userActivities.first(where: { $0.activityType == NSUserActivityTypeBrowsingWeb }) {
      options[.userActivityDictionary] = [
        UIApplication.LaunchOptionsKey.userActivityType.rawValue: activity.activityType,
        "UIApplicationLaunchOptionsUserActivityKey": activity
      ] as [String: Any]
    }
    return options
  }
}

/// The User-Agent of the app's requests (`fetch`, `XMLHttpRequest`, images):
///
/// `<App>/<version> (<bundle id>; build:<build>; iOS <version>; <model>) CFNetwork/<version> Darwin/<version>`
///
/// The system's own is `<App>/<build> CFNetwork/… Darwin/…`: the build number
/// as the version, no OS version nor device. Android sends the same shape
/// (`co/ordering/app/UserAgent.kt`). A User-Agent the JS sets on a request is kept (a
/// request's header wins over the session's).
///
/// The same session adds the device's id (`X-Device-Id-X`, `DeviceId`).
///
/// The driver location module sends with its own `URLSession` (`DriverLocationCore`), not
/// React Native's: `headers()` gives `DriverLocationBridge` the same two headers with the same
/// values (the same `make()`, the same `DeviceId.read()`), so every request of the app carries them.
enum UserAgent {
  static func install() {
    RCTSetCustomNSURLSessionConfigurationProvider {
      // React Native's default session (RCTHTTPRequestHandler), plus the User-Agent: it goes to every host. The device id does NOT
      // live in the session's headers (they cannot be per host): `RequestHeaders` adds it request by request, to the API only.
      let configuration = URLSessionConfiguration.default
      if let wifiOnly = Bundle.main.object(forInfoDictionaryKey: "ReactNetworkForceWifiOnly") as? NSNumber {
        configuration.allowsCellularAccess = !wifiOnly.boolValue
      }
      configuration.httpShouldSetCookies = true
      configuration.httpCookieAcceptPolicy = .always
      configuration.httpCookieStorage = HTTPCookieStorage.shared
      configuration.httpAdditionalHeaders = ["User-Agent": UserAgent.value]
      return configuration
    }
    // Called for every request React Native sends (`fetch`, `XMLHttpRequest`, images), before it is sent.
    RCTSetCustomHTTPRequestInterceptor { request in
      guard let request = request else { return nil }
      return RequestHeaders.intercept(request)
    }
  }

  /// The two headers of every request of the app, for a session that is not React Native's (the location module's): it posts to the
  /// API only, so it always carries the id. No device id when the Keychain cannot be read now (before the first unlock): the
  /// header is left out. The same `DeviceId.read()` the React Native path uses, so the two agree.
  static func headers() -> [String: String] {
    var headers = ["User-Agent": value]
    if let deviceId = DeviceId.read() {
      headers[DeviceId.header] = deviceId
    }
    return headers
  }

  /// Built once: the whole value does not change while the app runs.
  static let value: String = make()

  static func make() -> String {
    let info = Bundle.main.infoDictionary ?? [:]
    let bundleId = Bundle.main.bundleIdentifier ?? "unknown"
    let name = token(info["CFBundleName"] as? String).isEmpty ? token(bundleId) : token(info["CFBundleName"] as? String)
    let version = token(info["CFBundleShortVersionString"] as? String)
    let build = token(info["CFBundleVersion"] as? String)
    let os = ProcessInfo.processInfo.operatingSystemVersion
    let osVersion = os.patchVersion > 0
      ? "\(os.majorVersion).\(os.minorVersion).\(os.patchVersion)"
      : "\(os.majorVersion).\(os.minorVersion)"
    let cfNetwork = Bundle(identifier: "com.apple.CFNetwork")?.infoDictionary?["CFBundleVersion"] as? String ?? "unknown"
    var system = utsname()
    uname(&system)
    let darwin = field(&system.release)
    let model = ProcessInfo.processInfo.environment["SIMULATOR_MODEL_IDENTIFIER"] ?? field(&system.machine)
    let product = version.isEmpty ? name : "\(name)/\(version)"
    return "\(product) (\(bundleId); build:\(build); iOS \(osVersion); \(model)) CFNetwork/\(cfNetwork) Darwin/\(darwin)"
  }

  /// An RFC 7231 token (letters, digits and `!#$%&'*+-.^_`|~`).
  private static func token(_ value: String?) -> String {
    let allowed = Set("!#$%&'*+-.^_`|~")
    return String((value ?? "").filter { $0.isASCII && ($0.isLetter || $0.isNumber || allowed.contains($0)) })
  }

  private static func field<T>(_ value: inout T) -> String {
    withUnsafePointer(to: &value) {
      $0.withMemoryRebound(to: CChar.self, capacity: MemoryLayout<T>.size) { String(cString: $0) }
    }
  }
}

// MARK: RequestHeaders begin

/// Which requests are the Ordering API's, so that `X-Device-Id-X` goes there and nowhere else (the owner's decision of 2026-11-19: the
/// id only to the API; the User-Agent may go to every host). JavaScript tells the native side the API root once it knows it
/// (`DriverLocation.setApiRoot`, from `useDriverLocationTracking`: `ordering.root`). Until then NO request carries the id. A request
/// is the API's when its host and port are the root's. Process-wide, in memory only.
final class ApiHosts {
  static let shared = ApiHosts()

  private let lock = NSLock()
  private var host: String?
  private var port: Int?

  /// Sets (or, with an unusable `root`, clears) the API's host and port. Returns whether `root` was usable.
  @discardableResult
  func set(_ root: String?) -> Bool {
    lock.lock(); defer { lock.unlock() }
    guard let root = root, let url = URL(string: root.trimmingCharacters(in: .whitespaces)),
          let scheme = url.scheme?.lowercased(), scheme == "http" || scheme == "https",
          let host = url.host?.lowercased(), !host.isEmpty else {
      self.host = nil
      self.port = nil
      return false
    }
    self.host = host
    self.port = ApiHosts.effectivePort(url)
    return true
  }

  /// True when `url` is on the configured API's host and port. False for everything while none is configured.
  func matches(_ url: URL?) -> Bool {
    guard let url = url, let candidate = url.host?.lowercased() else { return false }
    lock.lock(); defer { lock.unlock() }
    return candidate == host && ApiHosts.effectivePort(url) == port
  }

  private static func effectivePort(_ url: URL) -> Int? {
    if let port = url.port { return port }
    switch url.scheme?.lowercased() {
    case "https": return 443
    case "http": return 80
    default: return nil
    }
  }
}

/// What the app adds to a request of React Native's, request by request (`RCTSetCustomHTTPRequestInterceptor`): the device's id, and
/// only when the request is the API's (`ApiHosts`) and the caller set none. The id is read when needed (and kept once read), so a launch
/// before the first unlock, which cannot read the Keychain yet, gets it with the first request after it can.
enum RequestHeaders {
  static func intercept(_ request: URLRequest) -> URLRequest? {
    guard request.value(forHTTPHeaderField: DeviceId.header) == nil, ApiHosts.shared.matches(request.url),
          let deviceId = DeviceId.read() else { return nil }
    var copy = request
    copy.setValue(deviceId, forHTTPHeaderField: DeviceId.header)
    return copy
  }
}

// MARK: RequestHeaders end

// MARK: DeviceId begin

/// What `DeviceId` needs of the Keychain, so its rules can be tried without one (`DeviceIdReader` takes it).
protocol DeviceIdStore {
  func copy() -> DeviceIdStoreRead
  /// Removes the item.
  func delete()
  func add(_ data: Data) -> DeviceIdStoreAdd
}

enum DeviceIdStoreRead {
  case value(Data)
  case notFound
  /// The Keychain cannot be read now (before the first unlock).
  case unreadable
}

enum DeviceIdStoreAdd {
  case added
  case duplicate
  case failed
}

/// The Keychain item of the id.
struct SystemDeviceIdStore: DeviceIdStore {
  private let item: [CFString: Any] = [
    kSecClass: kSecClassGenericPassword,
    kSecAttrService: "co.ordering.app.device-id",
    kSecAttrAccount: "device-id",
  ]

  func copy() -> DeviceIdStoreRead {
    var query = item
    query[kSecReturnData] = true
    query[kSecMatchLimit] = kSecMatchLimitOne
    var result: AnyObject?
    switch SecItemCopyMatching(query as CFDictionary, &result) {
    case errSecSuccess:
      return .value((result as? Data) ?? Data())
    case errSecItemNotFound:
      return .notFound
    default:
      return .unreadable
    }
  }

  func delete() {
    SecItemDelete(item as CFDictionary)
  }

  func add(_ data: Data) -> DeviceIdStoreAdd {
    var attributes = item
    attributes[kSecValueData] = data
    attributes[kSecAttrAccessible] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
    switch SecItemAdd(attributes as CFDictionary, nil) {
    case errSecSuccess: return .added
    case errSecDuplicateItem: return .duplicate
    default: return .failed
    }
  }
}

/// Reads, or makes the first time, the device's id. ONE read at a time (React Native's first request and the location module's
/// `configure` can both ask on a first launch: without the lock one deleted the other's new item and the two paths sent different
/// ids until the next launch), and the id is kept in memory once read.
///
/// A missing item is added, never deleted first. An item that exists with something that is not a UUID is replaced. A Keychain that
/// cannot be read now (before the first unlock) gives no id: a new one would replace the kept one.
final class DeviceIdReader {
  private let store: DeviceIdStore
  private let lock = NSLock()
  private var cached: String?

  init(store: DeviceIdStore) {
    self.store = store
  }

  func read() -> String? {
    lock.lock(); defer { lock.unlock() }
    if let cached = cached { return cached }
    let id = readOrCreate()
    cached = id
    return id
  }

  private func readOrCreate() -> String? {
    switch store.copy() {
    case .value(let data):
      if let id = String(data: data, encoding: .utf8), UUID(uuidString: id) != nil { return id }
      store.delete() // it exists and is not a UUID: replaced
    case .unreadable:
      return nil
    case .notFound:
      break // nothing to delete
    }
    let id = UUID().uuidString.lowercased()
    switch store.add(Data(id.utf8)) {
    case .added:
      return id
    case .duplicate:
      // Another process kept one first.
      if case .value(let data) = store.copy(), let kept = String(data: data, encoding: .utf8), UUID(uuidString: kept) != nil { return kept }
      return nil
    case .failed:
      return nil
    }
  }
}

/// The device's id the app sends in `X-Device-Id-X`, for the API's analytics, ONLY to the Ordering API (`ApiHosts`, `RequestHeaders`;
/// the location module's own requests go to the API alone). It does not depend on the cookie consent.
///
/// A UUID v4 made the first time and kept in the Keychain, so it stays the same when the app is reinstalled.
/// `…AfterFirstUnlockThisDeviceOnly`: it never travels to another phone with a backup, and it is not synchronized with iCloud.
/// Android sends its ANDROID_ID under the same header (`co/ordering/app/DeviceId.kt`).
enum DeviceId {
  static let header = "X-Device-Id-X"

  private static let reader = DeviceIdReader(store: SystemDeviceIdStore())

  /// The kept id, or a new one. Nil when the Keychain cannot be read now (before the first unlock).
  static func read() -> String? { return reader.read() }
}

// MARK: DeviceId end

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  // The launch splash (BootSplash.storyboard) stays over the app until JavaScript hides it.
  override func customize(_ rootView: RCTRootView) {
    super.customize(rootView)
    RNBootSplash.initWithStoryboard("BootSplash", rootView: rootView)
  }

  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
#if targetEnvironment(simulator)
    if ProcessInfo.processInfo.environment["ORDERING_LOCAL_SIMULATOR"] == "1",
       let port = ProcessInfo.processInfo.environment["ORDERING_LOCAL_METRO_PORT"],
       let number = Int(port), number > 0 && number <= 65535 {
      return URL(string: "http://127.0.0.1:\(number)/index.bundle?platform=ios&dev=true&minify=false")
    }
#endif
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
