import Foundation
import UserNotifications
import OneSignalCore

@objc(NotificationSettings)
class NotificationSettings: NSObject {

  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }

  /// iOS "Banner Style" preference for this app:
  /// - "persistent" — banners stay until acted on (UNAlertStyle.alert)
  /// - "temporary"  — banners auto-dismiss (UNAlertStyle.banner)
  /// - "none"       — banners disabled
  /// - "unknown"    — could not be determined
  @objc(getAlertStyle:rejecter:)
  func getAlertStyle(_ resolve: @escaping RCTPromiseResolveBlock,
                     rejecter reject: @escaping RCTPromiseRejectBlock) {
    UNUserNotificationCenter.current().getNotificationSettings { settings in
      let style: String
      switch settings.alertStyle {
      case .alert:
        style = "persistent"
      case .banner:
        style = "temporary"
      case .none:
        style = "none"
      @unknown default:
        style = "unknown"
      }
      resolve(style)
    }
  }

  @objc(setSecureOrderProject:)
  func setSecureOrderProject(_ project: String) {
    OneSignalUserDefaults.initShared().saveString(forKey: "secure_order_project", withValue: project)
  }
}
