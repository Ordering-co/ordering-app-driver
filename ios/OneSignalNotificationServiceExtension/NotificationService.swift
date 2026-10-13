import UserNotifications

import OneSignal
import OneSignalCore

class NotificationService: UNNotificationServiceExtension {

    var contentHandler: ((UNNotificationContent) -> Void)?
    var receivedRequest: UNNotificationRequest!
    var bestAttemptContent: UNMutableNotificationContent?

    override func didReceive(_ request: UNNotificationRequest, withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void) {
        self.receivedRequest = request
        self.bestAttemptContent = (request.content.mutableCopy() as? UNMutableNotificationContent)

        let wrappedHandler: (UNNotificationContent) -> Void = { content in
            if let mutable = content.mutableCopy() as? UNMutableNotificationContent {
                self.applyAlarmBehavior(to: mutable)
                contentHandler(mutable)
            } else {
                contentHandler(content)
            }
        }
        self.contentHandler = wrappedHandler

        if let bestAttemptContent = bestAttemptContent {
            OneSignal.didReceiveNotificationExtensionRequest(self.receivedRequest, with: bestAttemptContent, withContentHandler: wrappedHandler)
        }
    }

    override func serviceExtensionTimeWillExpire() {
        // Called just before the extension will be terminated by the system.
        // Use this as an opportunity to deliver your "best attempt" at modified content, otherwise the original push payload will be used.
        if let contentHandler = contentHandler, let bestAttemptContent =  bestAttemptContent {
            applyAlarmBehavior(to: bestAttemptContent)
            OneSignal.serviceExtensionTimeWillExpireRequest(self.receivedRequest, with: self.bestAttemptContent)
            contentHandler(bestAttemptContent)
        }
    }

    private let secureOrderProjects = ["quickiedelivery", "luisv4plus"]
    private let secureOrderProjectKey = "secure_order_project"

    private func maskedOrderId(_ id: String) -> String {
        let pin = min(id.count, 4)
        return String(id.prefix(id.count - pin)) + String(repeating: "*", count: pin)
    }

    private func maskedText(_ text: String, regex: NSRegularExpression, masked: String) -> String {
        let range = NSRange(text.startIndex..., in: text)
        return regex.stringByReplacingMatches(in: text, options: [], range: range, withTemplate: masked)
    }

    private func applySecureOrderMask(to content: UNMutableNotificationContent) {
        guard let project = OneSignalUserDefaults.initShared().getSavedString(forKey: secureOrderProjectKey, defaultValue: nil),
              secureOrderProjects.contains(project),
              let custom = content.userInfo["custom"] as? [String: Any],
              let data = custom["a"] as? [String: Any],
              let raw = data["order_id"] else { return }
        let id = "\(raw)"
        guard !id.isEmpty,
              let regex = try? NSRegularExpression(pattern: "\\b" + NSRegularExpression.escapedPattern(for: id) + "\\b") else { return }
        let masked = maskedOrderId(id)
        content.title = maskedText(content.title, regex: regex, masked: masked)
        content.subtitle = maskedText(content.subtitle, regex: regex, masked: masked)
        content.body = maskedText(content.body, regex: regex, masked: masked)
    }

    private func applyAlarmBehavior(to content: UNMutableNotificationContent) {
        applySecureOrderMask(to: content)
        content.sound = UNNotificationSound(named: UNNotificationSoundName("order_sound_notification.caf"))

        if #available(iOS 15.0, *) {
            content.interruptionLevel = .timeSensitive
            content.relevanceScore = 1.0
        }
    }
}
