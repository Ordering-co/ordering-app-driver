import Foundation
#if canImport(UIKit)
import UIKit
#endif

/// The two device signals only the events recorder needs: the app in the foreground or the background, and Low Power Mode.
/// Registered at the start of tracking and removed at the stop (`start` / `stop`).
public protocol DeviceSignalSource: AnyObject {
    var onAppForeground: ((Bool) -> Void)? { get set }
    var onBatterySaver: ((Bool) -> Void)? { get set }
    /// Registers the observers (once) and returns the state now. May be called on any thread.
    func start() -> (appForeground: Bool, batterySaver: Bool)
    func stop()
}

/// iOS: `UIApplication.didEnterBackgroundNotification` / `willEnterForegroundNotification` (the app is "in the background" when it
/// has entered the background, not merely inactive: Control Center or a system alert do not count) and
/// `NSProcessInfoPowerStateDidChange` with `isLowPowerModeEnabled`. Elsewhere (the package's tests on macOS) the app is always in the
/// foreground.
public final class SystemDeviceSignals: DeviceSignalSource {
    public var onAppForeground: ((Bool) -> Void)?
    public var onBatterySaver: ((Bool) -> Void)?

    private let lock = NSLock()
    private var tokens: [NSObjectProtocol] = []

    public init() {}

    public func start() -> (appForeground: Bool, batterySaver: Bool) {
        lock.lock()
        if tokens.isEmpty {
            let center = NotificationCenter.default
            #if canImport(UIKit) && !os(watchOS)
            tokens.append(center.addObserver(forName: UIApplication.didEnterBackgroundNotification, object: nil, queue: nil) { [weak self] _ in
                self?.onAppForeground?(false)
            })
            tokens.append(center.addObserver(forName: UIApplication.willEnterForegroundNotification, object: nil, queue: nil) { [weak self] _ in
                self?.onAppForeground?(true)
            })
            #endif
            tokens.append(center.addObserver(forName: .NSProcessInfoPowerStateDidChange, object: nil, queue: nil) { [weak self] _ in
                self?.onBatterySaver?(ProcessInfo.processInfo.isLowPowerModeEnabled)
            })
        }
        lock.unlock()
        return (SystemDeviceSignals.readAppForeground(), ProcessInfo.processInfo.isLowPowerModeEnabled)
    }

    public func stop() {
        lock.lock()
        let current = tokens
        tokens.removeAll()
        lock.unlock()
        for token in current { NotificationCenter.default.removeObserver(token) }
    }

    /// `UIApplication.shared.applicationState` is main-thread only.
    private static func readAppForeground() -> Bool {
        #if canImport(UIKit) && !os(watchOS)
        let read = { UIApplication.shared.applicationState != .background }
        return Thread.isMainThread ? read() : DispatchQueue.main.sync(execute: read)
        #else
        return true
        #endif
    }
}
