import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import GoogleMaps
import FirebaseCore

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?
  var initialLaunchOptions: [UIApplication.LaunchOptionsKey: Any]?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    initialLaunchOptions = launchOptions
    // This opt-in applies only to a local Debug simulator. Release always requires Firebase.
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
      NSLog("Ordering local simulator: Firebase, push and location automation disabled")
    } else {
      FirebaseApp.configure()
    }

    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    // Configurar Google Maps API Key
    if !localSimulatorMode { GMSServices.provideAPIKey("_GOOGLE_MAPS_API_KEY_") }

    return true
  }

  func startReactNative(in window: UIWindow, launchOptions: [UIApplication.LaunchOptionsKey: Any]?) {
    self.window = window
    guard window.rootViewController == nil else { return }
    guard let factory = reactNativeFactory else {
      preconditionFailure("React Native factory is unavailable")
    }

    factory.startReactNative(
      withModuleName: "deliveryApp",
      in: window,
      launchOptions: launchOptions
    )
    RNSplashScreen.show()
  }

  func application(
    _ application: UIApplication,
    continue userActivity: NSUserActivity,
    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
  ) -> Bool {
    RCTLinkingManager.application(application, continue: userActivity, restorationHandler: restorationHandler)
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

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
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
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
