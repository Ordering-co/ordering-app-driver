# Push stack and native shell: research for the driver app's move to React Native 0.88.1

Date: 2026-11-13. Read-only research. App to upgrade: `/Users/work/Ordering/ordering-app-driver-theming` (branch `feature/theming-native`, RN 0.81.1, iOS new architecture on, Android old architecture, `newArchEnabled=false`). Sister app that already did it: `/Users/work/Ordering/ordering-app-marketplace-theming` (RN 0.88.1, new architecture on both platforms, pnpm, Gradle 9.4.1, AGP 9 settings `android.newDsl=false`, `android.builtInKotlin=false`).

How to read the evidence:
- "Sister proven" = the sister app's `package.json`, its git history and its installed `node_modules` run these versions on RN 0.88.1 + new architecture. I did not build or run anything (read-only brief): "proven" means "the sister app ships it", not "I saw it run".
- Web facts carry their source link. Pages were treated as data.
- Anything I could not confirm is in section 14 and marked **UNKNOWN** in place.
- Importers were found with grep over `src`, `index.js`, `App.tsx`, `jest`. The logic submodule `src/@/components` imports none of these libraries (grep for the package names over `src/@` found no hit); its only reCAPTCHA code is the web `react-google-recaptcha`, not used by the native app.

## 0. Summary table

| Library | Driver today | Target | Sister proven on 0.88.1 + new arch | New-arch support (source) | Risk |
|---|---|---|---|---|---|
| `react-native-onesignal` | 4.5.2 | **5.5.17** (exact pin, as sister) | yes, 5.5.17 | TurboModule (`codegenConfig` in its package.json; sister commit 4895c02 says the v4 interop patch is gone) | High: every call changes, Android and iOS extensions are rewritten, the alarm depends on it |
| `@react-native-firebase/app`, `/messaging`, `/crashlytics` | 23.8.8 | **^26.4.1** (not 27) | yes, 26.4.1 | v26 requires the New Architecture ([rnfirebase.io v26 guide](https://rnfirebase.io/migrating-to-v26)); v24 release note: old architecture deprecated | Medium: JS calls do not change; Podfile flag, Gradle plugins and Android new arch are the work |
| `@notifee/react-native` | 9.1.8 (archived) | **`react-native-notify-kit` ^9.7.0** + the JDK patch (10.10.0 exists, see 3) | yes, 9.7.0 | "New Architecture only (TurboModules)" ([its README](https://github.com/marcocrupi/react-native-notify-kit)) | Low in JS (import path only); medium in supply chain (one-person fork) |
| `react-native-sound-player` | 0.13.4 | **0.14.5** | **no, the sister does not use it** | none declared: a legacy bridge module (no `codegenConfig`), runs through RN's interop layer ([RN 0.82 post](https://reactnative.dev/blog/2025/10/08/react-native-0.82): interop layers stay "for the foreseeable future") | Medium for iOS (the only platform that uses it); the Android alarm does not use it |
| `react-native-splash-screen` | 3.3.0 | **removed** → `react-native-bootsplash` **^7.3.5** | yes, 7.3.5 | TurboModule (`codegenConfig` RNBootSplashSpec); README documents RN >= 0.88 | Medium (native files) |
| `@fatnlazycat/react-native-recaptcha-v3` | 1.0.3 | **removed** → `RecaptchaV3` on `react-native-webview` 14.0.1 | yes (sister `RecaptchaV3` component) | n/a (a WebView) | Low |
| `react-native-recaptcha-that-works` | 1.3.2 | keep **1.3.2** (`^1.2.0` as sister); 2.0.0 optional | yes, 1.3.2 | pure JS + `react-native-webview` peer | Low |
| `rn-config-reader` | 5.1.3 | **removed** → ~25 lines of Kotlin in the app | no, the sister does not use it | legacy module; **its Android `build.gradle` calls `jcenter()`, removed in Gradle 9** ([Gradle 9 upgrade guide](https://docs.gradle.org/current/userguide/upgrading_major_version_9.html)) | High if kept: it will break the Android build |
| `react-native-restart` | 0.0.27 | **^0.0.29** | yes | 0.0.29 is a TurboModule (codegen spec `RNRestartSpec`) with a JS fallback | Low |
| `@sentry/react-native` | 8.30.0 | **8.35.0** (sister runs 8.33.0) | 8.33.0 yes | 8.35.0 "restore touch breadcrumbs and rage tap detection on the New Architecture from React Native 0.88" ([release](https://github.com/getsentry/sentry-react-native/releases)) | Low |
| `react-native-background-fetch` | 4.4.2 | keep **4.4.x** (no JS importer) | n/a (sister has none) | has `codegenConfig` RNBackgroundFetchSpec (TurboModule) | Low; it ships with background geolocation |

## 1. `react-native-onesignal` 4.5.2 → 5.5.17

### 1.1 Today
Importers (only one real one):
- `src/navigators/RootNavigator.tsx:4` `import OneSignal from 'react-native-onesignal'`. Also mocked at `jest/setup.js:98` and `src/__tests__/storefrontLaunch.test.tsx:77`.

Calls, all inside `oneSignalSetup` (`RootNavigator.tsx:144-224`), run from the effect at `:446-462` when `configs.firebase_push_enabled` is not `'1'`, `configs.onesignal_deliveryapp_id` is set and the user is authenticated:
- `:146` `OneSignal.setLogLevel(6, 0)`
- `:158` `OneSignal.setNotificationOpenedHandler(({ notification }) => setOrderId({ id: additionalData.order_id, assignId: additionalData.assign_request_id, group_id: additionalData.order_group_id }))`
- `:166` `OneSignal.addSubscriptionObserver(event => ...)`: `event.to.userId` becomes `notification_token` (state and `_setStoreData('notification_state')`); when `!event.to.isSubscribed`, `addTrigger('prompt_ios','true')` and `promptForPushNotificationsWithUserResponse(() => {})`
- `:183` `OneSignal.setAppId(data.appId)`
- `:187-196` `setEmail(user.email)`, `setSMSNumber('+<country_phone_code> <cellphone>')` (note the space), `setExternalUserId('<project>-<user id>')`
- `:201` `OneSignal.getDeviceState()` → `hasNotificationPermission`, `userId`
- `:204-209` `addTrigger('notification_prompt','true')` + `promptForPushNotificationsWithUserResponse(accepted => accepted && setPendingBannerCheck(true))`

The token the app registers (`subscribePushNotifications`, `RootNavigator.tsx:464-479`, POST `/users/{id}/notification_tokens` with `token`, `user_id`, `app`, optional `provider`) is the v4 `userId` (player id). `LogoutButton` (`src/ui/src/components/LogoutButton/index.tsx:19`) reads `notification_state` and passes it to `handleLogoutClick`, so the API deletes that token row. There is **no OneSignal teardown/logout call anywhere** today (`removeExternalUserId` appears only in the jest mock).

Native setup it has:
- iOS `ios/Podfile:32-34`: `target 'OneSignalNotificationServiceExtension' do pod 'OneSignalXCFramework', '3.12.6' end`. The app target gets OneSignal through `react-native-onesignal`'s podspec.
- iOS `ios/OneSignalNotificationServiceExtension/NotificationService.swift` (`import OneSignal`, `import OneSignalCore`): calls `OneSignal.didReceiveNotificationExtensionRequest(request, with: content, withContentHandler: wrappedHandler)` and `OneSignal.serviceExtensionTimeWillExpireRequest(...)`; the wrapped handler applies the app's "alarm behavior": `sound = order_sound_notification.caf`, `interruptionLevel = .timeSensitive`, `relevanceScore = 1.0`, and the secure-order masking (reads `OneSignalUserDefaults.initShared().getSavedString(forKey: "secure_order_project", ...)`, masks `order_id` in title/subtitle/body for projects `quickiedelivery`, `luisv4plus`; reads `userInfo["custom"]["a"]["order_id"]`).
- iOS `ios/ODelivery/NotificationSettings.swift:3,39`: `import OneSignalCore`; `setSecureOrderProject` writes `OneSignalUserDefaults.initShared().saveString(forKey: "secure_order_project", ...)`; `getAlertStyle` reads `UNNotificationSettings.alertStyle`. Bridge in `NotificationSettingsBridge.m` (`RCT_EXTERN_MODULE`). JS side: `src/utils/index.tsx:119-122` (`setSecureOrderProject`, called at `RootNavigator.tsx:660`), and `RootNavigator.tsx:319-338` `checkNotificationBannerStyle`.
- iOS extension target: bundle `co.ordering.delivery.OneSignalNotificationServiceExtension`, deployment target 15.1, entitlements app group `group.co.ordering.delivery.onesignal` (both targets), `aps-environment = development` in `ODelivery.entitlements`, `UIBackgroundModes` fetch/location/remote-notification in `Info.plist`.
- Android `android/app/src/main/AndroidManifest.xml`: `<meta-data android:name="com.onesignal.NotificationServiceExtension" android:value="${applicationId}.NotificationServiceExtension" />`; permissions POST_NOTIFICATIONS, VIBRATE.
- Android `android/app/src/main/java/co/ordering/delivery/NotificationServiceExtension.kt`: a **OneSignal 4** class (`OneSignal.OSRemoteNotificationReceivedHandler`, `OSNotificationReceivedEvent`, `event.notification.mutableCopy()`, `setExtender`, `event.complete(...)`). It raises STREAM_ALARM to max, forces channel `new_order_alarm`, `PRIORITY_MAX`, `CATEGORY_ALARM`, `VISIBILITY_PUBLIC`, `DEFAULT_VIBRATE`, and masks the order id (SharedPreferences `secure_order`/`project`, written by `AlarmSoundModule.setSecureOrderProject`).
- Android `MainApplication.kt:51-76` creates the `new_order_alarm` channel natively (sound `res/raw/order_sound_notification.mp3`, `USAGE_ALARM`, importance HIGH, bypass DND, vibration pattern).
- `firebase.json`: `messaging_android_notification_channel_id: "new_order_alarm"`.

### 1.2 Target
- Sister runs `react-native-onesignal` **5.5.17** pinned exactly (`package.json`), pod `OneSignalXCFramework` **5.8.1** (its podspec's version), Android SDK 5.11.0 (its `android/build.gradle`). Commits: `4895c02` (migration), `5405753` (review fixes: orphan token rows, provider switch, listeners), `b45b826` (verbose log in development only), `9c6cdfb`, `9875cc1` (SMS in E.164).
- New-arch: the package has a `codegenConfig` (`RNOneSignalSpec`); iOS platform 15.1 in its podspec; peer `react-native >= 0.79`. Release notes 5.5.8-5.5.17: [GitHub releases](https://github.com/OneSignal/react-native-onesignal/releases). Relevant lines: 5.5.9 "foreground notifications now display by default", 5.5.14 iOS SDK 5.7 raises minimum to iOS 15, 5.5.15/16 input validation rejects null/empty/NUL strings, 5.5.16 Android SDK 5.11.0.
- v5 API reference/migration: [react-native-onesignal MIGRATION_GUIDE.md](https://unpkg.com/react-native-onesignal@5.2.12/MIGRATION_GUIDE.md) (confirms `setAppId`→`initialize`, `setExternalUserId`→`login`, `logout`, `User.addEmail/addSms/removeEmail/removeSms`, `InAppMessages.addTrigger`, `Debug.setLogLevel`). The remaining mappings below I took from the installed type definitions of 5.5.17 in the sister app (`node_modules/react-native-onesignal/dist/index.d.ts`), which is authoritative.
- Android extension in v5: [OneSignal service extensions docs](https://documentation.onesignal.com/docs/en/service-extensions.md). Source of the interfaces: `INotificationServiceExtension.onNotificationReceived(event: INotificationReceivedEvent)`, `event.context`, `event.notification: IDisplayableMutableNotification` with `setExtender(NotificationCompat.Extender?)`, `display()`, `title`, `body`, `additionalData`; `event.preventDefault()` ([OneSignal-Android-SDK `INotificationReceivedEvent.kt`](https://github.com/OneSignal/OneSignal-Android-SDK/blob/main/OneSignalSDK/onesignal/core/src/main/java/com/onesignal/notifications/INotificationReceivedEvent.kt), `IMutableNotification.kt`). The manifest meta-data key `com.onesignal.NotificationServiceExtension` stays the same. The display code in the SDK (`NotificationDisplayer.kt`) states "An extender may have changed the channel, and the channel controls alerting on O+": setting `new_order_alarm` from the extender is still supported.
- iOS extension in v5: `import OneSignalExtension`; `OneSignalExtension.didReceiveNotificationExtensionRequest(...)` and `serviceExtensionTimeWillExpireRequest(...)` (same docs; the sister's `NotificationService.swift`). `OneSignalUserDefaults.initShared()`, `getSavedString(forKey:defaultValue:)` and `saveString(forKey:withValue:)` still exist in `OneSignalCore` 5.8.1 (checked in the headers of the sister's `ios/Pods/OneSignalXCFramework`).

### 1.3 Migration, call by call

JS: replace `RootNavigator.tsx:144-224`. Recommended: port the sister's three files instead of editing in place (the plan §5 already says to move push out of `RootNavigator` first):
- `ordering-app-marketplace-theming/src/navigators/oneSignalPush.ts` (`createOneSignalPush`: setup/teardown/listeners, no-op on unchanged identity, permission asked once per install, old email/SMS removed, stale-setup guards)
- `.../pushProviderSwitch.ts` (one provider change at a time: OneSignal vs Firebase)
- `.../oneSignalSms.ts` (`oneSignalSmsNumber`: E.164)
- tests and `jest/helpers/mockOneSignal.js`.

Driver differences to keep when porting: there is **no cookie consent** gate (drop `hasConsented`); the app name key is `settings.notification_app`; the id config is `configs.onesignal_deliveryapp_id`; the identity is `${ordering.project}-${user.id}`; after the permission answer the driver sets `setPendingBannerCheck(true)` (iOS "persistent banner" check): `createOneSignalPush` must expose the permission result (a callback, or return it from `setup`) for that. The driver also builds the SMS number with a space (`+57 300...`): OneSignal v5 answers 400 "Identifier invalid format" to anything not E.164 (sister commit 9875cc1), so use `oneSignalSmsNumber`.

| v4 call (driver line) | v5 equivalent | Notes |
|---|---|---|
| `import OneSignal from 'react-native-onesignal'` (`:4`) | `import { OneSignal, LogLevel, type NotificationClickEvent, type PushSubscriptionChangedState } from 'react-native-onesignal'` | named exports |
| `setLogLevel(6, 0)` (`:146`) | `OneSignal.Debug.setLogLevel(__DEV__ ? LogLevel.Verbose : LogLevel.Warn)` | at Verbose the native SDK writes email, phone and external id to the device log (sister b45b826): development only |
| `setAppId(appId)` (`:183`) | `OneSignal.initialize(appId)` | call it before any other call: on Android the native module throws before `initialize` |
| `setNotificationOpenedHandler(({notification}) => ...)` (`:158`) | `OneSignal.Notifications.addEventListener('click', ({ notification }) => ...)`; `notification.additionalData` is the same object | add once; remove with `removeEventListener` on unmount |
| `addSubscriptionObserver(e => e.to.userId, e.to.isSubscribed)` (`:166`) | `OneSignal.User.pushSubscription.addEventListener('change', ({ current }) => current.id, current.optedIn)` | `current.id` is the push subscription id (the v4 player id, kept on update per sister commit message) |
| `getDeviceState().hasNotificationPermission` (`:201,203`) | `await OneSignal.Notifications.getPermissionAsync()` | boolean |
| `getDeviceState().userId` (`:201,214,217`) | `await OneSignal.User.pushSubscription.getIdAsync()` | `null` until OneSignal creates the subscription; then it arrives through `change` |
| `promptForPushNotificationsWithUserResponse(cb)` (`:179,205`) | `OneSignal.Notifications.requestPermission(false).then(accepted => ...)` | the sister asks once per install (`onesignal_permission_asked`); a later grant from Settings arrives through `Notifications.addEventListener('permissionChange', granted => granted && OneSignal.User.pushSubscription.optIn())` |
| `addTrigger('prompt_ios','true')` / `('notification_prompt','true')` (`:178,204`) | `OneSignal.InAppMessages.addTrigger(key, value)` | only matters if the project has an in-app message keyed on the trigger; the driver never uses in-app messages otherwise: it can be dropped (**UNKNOWN**: ask whether OneSignal dashboards use these triggers) |
| `setEmail(email)` (`:188`) | `OneSignal.User.addEmail(email)` | **adds** (v4 replaced): call `removeEmail(old)` when it changes |
| `setSMSNumber(n)` (`:192`) | `OneSignal.User.addSms(e164)` / `removeSms(old)` | E.164 |
| `setExternalUserId(id)` (`:196`) | `OneSignal.login(id)` | call `login` first, then `addEmail`/`addSms` (v5 attaches them to the current user, an anonymous one before login) |
| (none; v4 never logged out) | `OneSignal.User.pushSubscription.optOut(); OneSignal.logout()` on teardown | new behaviour: sister teardown on logout and on the switch to Firebase; the next setup calls `optIn()` once permission is granted |

`index.js` and `NavigationRef.tsx`: no OneSignal code. `NavigationRef.tsx` (`navigate(name, params)`) is used by `RootNavigator.tsx` effect `:405-430` through `getPushOpenOrderPlan` (`:412`); unchanged.

`jest/setup.js:98-105`: replace the v4 mock with the sister's `jest/helpers/mockOneSignal.js` (v5 shape). `src/__tests__/storefrontLaunch.test.tsx:77` likewise.

iOS native:
1. `ios/Podfile`: `pod 'OneSignalXCFramework', '3.12.6'` → `'5.8.1'` (same version as the installed `react-native-onesignal` podspec, one pod version for both targets; re-read the podspec if the package version changes).
2. `ios/OneSignalNotificationServiceExtension/NotificationService.swift`: `import OneSignal` → `import OneSignalExtension`; `OneSignal.didReceiveNotificationExtensionRequest` → `OneSignalExtension.didReceiveNotificationExtensionRequest`; `OneSignal.serviceExtensionTimeWillExpireRequest` → `OneSignalExtension.serviceExtensionTimeWillExpireRequest`. Keep `import OneSignalCore` (needed for `OneSignalUserDefaults`) and keep the whole `applyAlarmBehavior` / secure-order code unchanged.
3. `ios/ODelivery/NotificationSettings.swift`: stays as is (`OneSignalCore`, `OneSignalUserDefaults`) — **verify it still compiles and that the NSE reads what the app wrote** (see risks).
4. Extension `Info.plist` has a stray `RCTNewArchEnabled` key (harmless; the sister's has none).
5. Entitlements: unchanged (`group.<bundle>.onesignal` in both). `aps-environment` is `development` in `ios/ODelivery/ODelivery.entitlements`; the release value is the Builder's/signing's concern (**UNKNOWN** whether the Builder rewrites it).
6. Optional: `ONESIGNAL_DISABLE_LOCATION=true pod install` and `onesignal.disableLocation=true` in `android/gradle.properties` drop OneSignal's own location module (its README lines 38-75). The driver has its own location stack (background geolocation) and a pinned `playServicesLocationVersion = "21.0.1"` in `android/build.gradle`; the owner should decide.

Android native: rewrite `NotificationServiceExtension.kt` for the v5 interface (draft, not compiled; the logic is the existing one):
```kotlin
import androidx.annotation.Keep
import com.onesignal.notifications.INotificationReceivedEvent
import com.onesignal.notifications.INotificationServiceExtension

@Keep
class NotificationServiceExtension : INotificationServiceExtension {
  override fun onNotificationReceived(event: INotificationReceivedEvent) {
    val context = event.context
    raiseAlarmVolumeToMax(context)
    val notification = event.notification
    val secure = secureOrderId(context, notification)   // additionalData?.optString("order_id") as today
    try {
      notification.setExtender { builder ->
        builder.setChannelId(ALARM_CHANNEL_ID)
          .setPriority(NotificationCompat.PRIORITY_MAX)
          .setCategory(NotificationCompat.CATEGORY_ALARM)
          .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
          .setDefaults(NotificationCompat.DEFAULT_VIBRATE)
        if (secure != null) { /* mask title/body with SecureOrder.maskText as today, setContentTitle/setContentText/BigTextStyle */ }
        builder
      }
    } catch (_: Throwable) {}
    // no preventDefault(): OneSignal displays it with the extender applied; no event.complete() in v5
  }
}
```
The `SecureOrder` object, `raiseAlarmVolumeToMax` and the manifest meta-data stay. `react-native-onesignal` declares the SDK with `api(...)`, so `com.onesignal.notifications.*` is visible to the app module without a new dependency line.

### 1.4 Delete
- Nothing is a patch in the driver (no `patches/`). The sister removed `patches/react-native-onesignal@4.5.2.patch`: not applicable here.
- After the port: `oneSignalState` spread-of-stale-state pattern in `RootNavigator` (`:166-217`) disappears with the module.

### 1.5 Verify
Simulator/emulator and jest (what can be seen without a phone):
- Jest: ported `oneSignalPush` tests; the call order `initialize → login → addEmail/addSms → permission → getIdAsync`.
- Android emulator with a Google Play image: app starts, `initialize` does not throw, a subscription id arrives and `POST /notification_tokens` fires; a push sent from OneSignal to that subscription shows in the `new_order_alarm` channel (channel settings page shows the sound and DND bypass). FCM works on Google Play emulators (expected, not run).
- iOS simulator: the app builds with both targets, the NSE embeds. **The ARM64 simulator does not produce an APNs token** ([RNFB v26 note](https://rnfirebase.io/migrating-to-v26)); OneSignal on the simulator is likewise not a push proof. `xcrun simctl push <device> <bundle id> payload.apns` can display a payload with `mutable-content` and a `custom.a.order_id` to look at the extension's output (**UNKNOWN** whether simctl runs the service extension: try it, do not rely on it).

Real phone only: see section 12.

### 1.6 Risks and unknowns
- **Cold-start click**: v4's `setNotificationOpenedHandler` was set at the start of setup. In v5 the `click` listener is added after `initialize` in `setup`, which runs after login and configs. Whether a tap that launched the app is replayed to a listener added late is **UNKNOWN** (the sister relies on it for its marketing pushes, but I did not find its test on a killed app). Test with the app killed.
- Android `NotificationServiceExtension` rewrite is the alarm: wrong channel or missing `setExtender` = a silent order. The SDK promises the extender may change the channel (see 1.2), but only a phone proves it.
- iOS `secure_order_project` handoff: the app writes with `OneSignalUserDefaults.initShared()` and the NSE reads the same; `initShared` in 5.8.1 resolves its suite from the app group name. Same API, new SDK major: **UNKNOWN** until a masked push (projects `quickiedelivery`, `luisv4plus`) is seen.
- `import OneSignalCore` from the app target (Swift, static pods): worked with v4 pods; with 5.8.1 `react-native-onesignal` is `static_framework`. **UNKNOWN** until the first iOS build. Fallback: write the key to `UserDefaults(suiteName: "group.<bundle>.onesignal")` directly (then the NSE key format must be checked).
- Behaviour changes: foreground push shows by default (5.5.9); token = subscription id (same value as the v4 player id for an existing install, per the sister's commit message); `addEmail`/`addSms` add instead of replace; the driver now opts out and logs out on teardown, which it never did.
- Both OneSignal and RNFB messaging set notification delegates and receive FCM/APNs on the same install today (the project chooses per `firebase_push_enabled`); that coexistence already exists in v4 and in the sister. Not re-proven by me.
- The Ordering backend contract (which id it sends to: subscription id or external id) is not in either repo: **UNKNOWN**.

## 2. `@react-native-firebase/app`, `/messaging`, `/crashlytics` 23.8.8 → 26.4.1

### 2.1 Today
Importers (all modular API already, nothing to rename):
- `index.js:6-10`: `getMessaging`, `setBackgroundMessageHandler(getMessaging(), async () => {})` (a no-op handler).
- `src/navigators/RootNavigator.tsx:5-12`: `getMessaging`, `getToken`, `getInitialNotification`, `onNotificationOpenedApp`, `onMessage`, `onTokenRefresh`, used in `firebasePushSetup` (`:227-317`) when `configs.firebase_push_enabled === '1'` (`firebasePushConsent.ts`). Permission is asked through `react-native-permissions` `requestNotifications` (not through RNFB: good, RNFB 25 deprecated its permission API, [v25 guide](https://rnfirebase.io/migrating-to-v25)).
- Mocks: `src/__tests__/storefrontLaunch.test.tsx:87`.
- `@react-native-firebase/crashlytics`: **no JS importer** (native only; RNFB's `RNFBCrashlyticsInitProvider` starts it). `@react-native-firebase/app`: no direct JS importer either.
- iOS `AppDelegate.swift:7,19`: `import FirebaseCore`, `FirebaseApp.configure()`. `ios/GoogleService-Info.plist` present (not read). `ios/Podfile:42-48`: modular headers for `GoogleUtilities`, `GoogleDataTransport`, `nanopb`, `FirebaseCore`, `FirebaseInstallations`, `FirebaseCoreExtension`; **no** `$RNFirebaseDisableSPM`. Firebase iOS SDK today: 12.10.0 from CocoaPods (`Podfile.lock`). Xcode build phase "[CP-User] [RNFB] Crashlytics Configuration" (pbxproj:359,578).
- Android: `android/build.gradle:19-20` `google-services:4.4.0`, `firebase-crashlytics-gradle:2.7.1`; `android/app/build.gradle:4-5` applies `com.google.gms.google-services` and `com.google.firebase.crashlytics`; `android/app/google-services.json` present (not read). No FCM service or channel metadata in the manifest (the RNFB manifests merge in).
- `firebase.json`: `crashlytics_debug_enabled: true`, `messaging_ios_foreground_presentation_options: [badge, sound, list, banner]`, `messaging_android_notification_channel_id: "new_order_alarm"` (the default channel of FCM notifications that arrive with the app in the background). The channel-id key is still read by 26.4.1 (`@react-native-firebase/messaging/android/build.gradle:92` in the sister's `node_modules`).

### 2.2 Target
- Sister: `^26.4.1` for app, crashlytics, messaging (+analytics). 27.x exists (27.1.1 on npm) but 27.0.0 is **"drop CocoaPods Firebase matrix; SPM-only"** ([v27.0.0 release](https://github.com/invertase/react-native-firebase/releases/tag/v27.0.0)); the sister links pods statically and pins 26.x for that reason (its `CLAUDE.md` "iOS pods" gotcha). Stay on 26.x.
- New architecture: v26.0.0 breaking changes: "messaging requires the React Native New Architecture", app/crashlytics also TurboModules ([v26.0.0 release](https://github.com/invertase/react-native-firebase/releases/tag/v26.0.0), [v26 guide](https://rnfirebase.io/migrating-to-v26): "If you can't enable it, stay on v25"; Gradle fails with a clear message when disabled). This is why Android's `newArchEnabled=true` (phase 3) must land before or with this phase.
- v26 messaging note: on the ARM64 simulator `registerForRemoteNotifications` is skipped and the simulator yields no APNs token; new rejections `messaging/registration-timeout` / `registration-superseded` come only from `registerDeviceForRemoteMessages` (not used here).
- Min platform in 26.4.1: iOS 15.0 (its `sdkVersions`), Android minSdk 23.

### 2.3 Migration
- JS: **no change** to the six calls (already the modular v23 style the sister also uses). The v26 JS breaking changes concern other modules (firestore, analytics `logEvent`, app-check…), none imported here.
- `package.json`: the three packages to `^26.4.1` (same version for all three: RNFBMessaging's podspec warns on a mismatch).
- `ios/Podfile`: add before `prepare_react_native_project!` the sister's lines:
  ```ruby
  # react-native-firebase resolves Firebase through Swift Package Manager by default, which
  # needs dynamic frameworks; the app links its pods statically, so Firebase comes from CocoaPods.
  $RNFirebaseDisableSPM = true
  ```
  Keep the modular-headers pods (the sister keeps the same six). `ios/Podfile.lock` regenerated (Firebase 12.10 → 12.19.3 in the sister).
- Android: `android/build.gradle` `google-services` 4.4.0 → **4.4.4**, `firebase-crashlytics-gradle` 2.7.1 → **3.0.8** (sister). Everything else (compileSdk 37, Kotlin 2.2, Gradle 9.4.1, AGP) is phase 3. `firebase.json` unchanged.
- Optional, from the sister (commit 52a4ad9, ORD-2425): in `AndroidManifest.xml` add `xmlns:tools` and `<service android:name="io.invertase.firebase.messaging.ReactNativeFirebaseMessagingHeadlessService" tools:node="remove" />`, so a background push does not boot React Native just to run the no-op `setBackgroundMessageHandler`. The driver has the same no-op handler (`index.js:14`). It does not affect OneSignal. Owner decision; verify that background FCM still shows (the system displays `notification` messages by itself).
- Optional: a notification small icon for FCM (`com.google.firebase.messaging.default_notification_icon` meta-data) and for notify-kit (section 3): the sister made a white silhouette `ic_stat_onesignal_default` (its `docs/ICONS.md`); the driver passes `ic_launcher` (colour icon: a grey blob on Android) at `RootNavigator.tsx:279`.

### 2.4 Delete
Nothing. (No notifee local Maven in the driver's `android/build.gradle`: checked, unlike what the sister removed in 57aae19.)

### 2.5 Verify
- Jest as today. `npx tsc --noEmit`. Android emulator (Google Play): FCM token fetched (`getToken`) and registered with `provider: 'fcm'`, foreground `onMessage` shows a notify-kit notification, tap fires `onNotificationOpenedApp` path. iOS simulator: only that the app builds and launches (no APNs token).
- Real phone: section 12.

### 2.6 Risks and unknowns
- Android old → new architecture is a prerequisite: RNFB 26 will not build otherwise.
- Crashlytics without JS import: collection is started natively by `RNFBCrashlyticsInitProvider` (files in `@react-native-firebase/crashlytics/ios` and `/android` read `crashlytics_*` keys); I did not confirm that reports still arrive after the upgrade: **UNKNOWN**, check one test crash.
- The RNFB iOS build phase script changed between versions (the sister's pbxproj has an SPM-aware script); `pod install` rewrites it.
- iOS APNs: `aps-environment` development/production per build.

## 3. `@notifee/react-native` 9.1.8 → `react-native-notify-kit` ^9.7.0

### 3.1 Today
- Importer: `src/navigators/RootNavigator.tsx:13` `import notifee, { AndroidImportance, EventType } from '@notifee/react-native'`; mocked at `src/__tests__/storefrontLaunch.test.tsx:96`.
- Calls (inside `firebasePushSetup`, Android only, FCM mode only): `notifee.displayNotification({ title, body, data, android: { channelId: 'new_order_alarm', smallIcon: 'ic_launcher', pressAction: { id: 'default' }, importance: AndroidImportance.HIGH } })` at `:275-285`, from `onMessage` when a push with a `notification` arrives in the foreground; `notifee.onForegroundEvent(({ type, detail }) => type === EventType.PRESS && setOrderId(getOpenedPushOrderData(detail.notification.data)))` at `:290-294`. The channel is **not** created by notifee: `MainApplication.kt` creates `new_order_alarm`.
- Native: autolinked; no manifest entries, no Maven entry in `android/build.gradle`; pods `RNNotifee` (`Podfile.lock`).

### 3.2 Target
- Sister commit `57aae19`: `react-native-notify-kit` **^9.7.0** (installed 9.7.0), "Only the import path changes". Notifee's own README says it is no longer maintained and recommends `expo-notifications` or this fork ([notifee README](https://github.com/invertase/notifee#readme)). The fork's README: "migrates the bridge to React Native's New Architecture (TurboModules)", "New Architecture only", drop-in API ([notify-kit README](https://github.com/marcocrupi/react-native-notify-kit)). It fixes upstream issue #912 (iOS: Notifee intercepted remote-notification taps and broke RNFB `onNotificationOpenedApp`/`getInitialNotification`) in 9.1.12: exactly this app's combination.
- JDK: the 9.7.0 `android/build.gradle` calls `System.exit(1)` on any JDK that is not 8/11/17/21; Android Studio ships JBR 25. The sister carries `patches/react-native-notify-kit@9.7.0.patch` (pnpm `patchedDependencies`, 14 lines: accept any JDK >= 17). The driver plan says JDK 25 is the target ("JDK to build Android 25" column of §1).
- **Newer: 10.10.0** (2026-10-28) accepts JDK >= 17 by itself (warning only outside 17/21): the patch would not be needed. Not run by the sister; 10.0.0 added a CLI and a server SDK, and its release notes show no breaking change for `displayNotification` / `onForegroundEvent` / `createChannel` ([releases](https://github.com/marcocrupi/react-native-notify-kit/releases)). Option for the owner: 9.7.0 + patch (proven as a pair) or 10.x without the patch (unproven here). The plan says "as the sister": 9.7.0.

### 3.3 Migration
- `package.json`: remove `@notifee/react-native`, add `react-native-notify-kit` `^9.7.0`.
- `RootNavigator.tsx:13` (or the moved push module): `from 'react-native-notify-kit'`. Same default export and names. Mock path in `src/__tests__/storefrontLaunch.test.tsx:96`.
- The patch: copy `patches/react-native-notify-kit@9.7.0.patch` and register it in `pnpm-workspace.yaml` `patchedDependencies` (`react-native-notify-kit@9.7.0: patches/react-native-notify-kit@9.7.0.patch`). The driver is on Yarn 1 today and its `CLAUDE.md` says "no patch-package": decision U3 (pnpm 12) makes the patch mechanism available. If pnpm is not in place when this lands, the alternatives are building with JDK 17 or 21, or notify-kit 10.x.
- iOS: `pod install` adds `RNNotifee` 9.7.0 (+ `NotifeeCore`), "builds its core from source" (sister commit message).
- Android: nothing else; no `android/build.gradle` Maven entry is needed.

### 3.4 Delete
`@notifee/react-native` from `package.json`, `yarn.lock` entry, `Pods` entry.

### 3.5 Verify
Android emulator (Google Play image) with `firebase_push_enabled = '1'`: a push with `notification` while the app is open shows through notify-kit in the alarm channel; tap triggers the `PRESS` event and navigates to the order. iOS: nothing visible (notify-kit's iOS part only intercepts delegate callbacks); check that `onNotificationOpenedApp` still fires on a phone.

### 3.6 Risks
Single-maintainer fork (npm `time.modified` 2026-10-28, active). The owner may prefer pinning exactly. Behaviour changes in the fork (documented in its README): `EventType.DELIVERED` now emitted for all iOS foreground notifications; foreground-service defaults; neither is used here.

## 4. `react-native-sound-player` 0.13.4 → 0.14.5, and the new-order alarm

### 4.1 Today
Importers: `src/ui/src/components/NewOrderNotification/index.tsx:12`; `App.tsx:3`. Tests: `.../NewOrderNotification/__tests__/NewOrderNotification.test.tsx:4,20`, `jest/setup.js:93`, `jest/helpers/registerD3OrdersMocks.js:6`. Type stub `src/types/react-native-sound-player/index.d.ts` (`declare module`).

What the app does (`NewOrderNotification/index.tsx`, `SoundPlayerComponent`, `:34-125`):
- A modal "new order / updated / messages" opens on socket events. While open and while `AppState === 'active'` it vibrates (`Vibration.vibrate([0,800,400,800,400,800], true)`) and, every 2.5 s, plays the sound for 2.5 s.
- **Android**: `useAlarmSound = Platform.OS === 'android' && !!NativeModules.AlarmSound?.start` → `AlarmSound.start(URL_SOUND)`; wait `DELAY_SOUND` (2500 ms); `AlarmSound.stop()`; on unmount `AlarmSound.release()`. `AlarmSound` is the app's **own** native module (`MainApplication.kt:94-211`, `AlarmSoundModule`, a legacy `ReactContextBaseJavaModule`): `MediaPlayer` with `USAGE_ALARM`, STREAM_ALARM volume to max, fallback to the system alarm ringtone, `setSecureOrderProject`. So **on Android `react-native-sound-player` does not play anything**.
- **iOS**: `SoundPlayer.playUrl(URL_SOUND)` (a CloudFront mp3), wait 2.5 s, `SoundPlayer.stop()`; guard `NativeModules?.RNSoundPlayer?.playUrl` at `:75`; cleanup `SoundPlayer.stop()` at `:84`.
- `App.tsx:8-25` registers four `SoundPlayer.addEventListener(...)` that only `console.log` (`FinishedPlaying`, `FinishedLoading`, `FinishedLoadingFile`, `FinishedLoadingURL`).
- The background/killed alarm is **not** this code: it is the push itself (iOS NSE sets `order_sound_notification.caf`, time-sensitive; Android channel `new_order_alarm` + the OneSignal extension; sections 1 and 2) and `Vibration.vibrate()` on `update_order` at `RootNavigator.tsx:680-692`.

Native: pod `RNSoundPlayer`; Android library autolinked. `ios/ODelivery/order_sound_notification.caf`, `android/app/src/main/res/raw/order_sound_notification.mp3`.

### 4.2 Target
- `0.14.5` (2025-02-11), the latest on npm. Differences 0.13.4 → 0.14.5 (diffed against the tarball): `android/build.gradle` no longer hardcodes `compileSdkVersion 31` and `buildToolsVersion "28.0.3"` (it reads `rootProject.ext` with `safeExtGet`); iOS adds `hasListeners` guards (`startObserving`/`stopObserving`), so events are not sent without listeners; `setNumberOfLoops` on Android, `playAsset` in JS.
- **New-architecture status: no TurboModule spec.** 0.14.5 has no `codegenConfig`; the iOS module is `RCT_EXPORT_MODULE` + `RCTEventEmitter` and the Android one a `ReactContextBaseJavaModule` + `@ReactMethod`. It runs on the new architecture only through RN's legacy-module interop layer, which RN 0.88.1 still contains (`RCTInteropTurboModule.mm`, `TurboModuleInteropUtils.kt` in the sister's `node_modules/react-native`); [RN 0.82 post](https://reactnative.dev/blog/2025/10/08/react-native-0.82): interop layers stay "for the foreseeable future". The README of the GitHub repo head (not of 0.14.5) says the package "is no longer actively maintained" and recommends `react-native-track-player` (the 0.14.5 tarball's README has no such sentence). No GitHub issue about the new architecture came up in the issue search. **UNKNOWN**: no one verified it on 0.88 with the new architecture (not the sister, not the library's authors). iOS runs it through interop **today** in the driver (iOS new architecture is already on, `RCTNewArchEnabled` in `Info.plist`), with 0.13.4.
- The Android build problem of 0.13.4 is real with the 0.88 toolchain: `buildToolsVersion "28.0.3"`/`compileSdkVersion 31` hardcoded; 0.14.5 fixes it.

### 4.3 Migration
- `package.json`: `^0.13.2` → `^0.14.5` (pin `0.14.5`).
- JS call sites: no API change for `playUrl`, `stop`, `addEventListener`. In 0.14.5 `index.js` is unchanged for these. Remove `src/types/react-native-sound-player/index.d.ts` (the package ships `index.d.ts`) only if `tsc` is happy; the stub currently types everything as `any`.
- `NativeModules?.RNSoundPlayer?.playUrl` (`:75`): under the new architecture `NativeModules` still exposes interop modules; the check keeps working (**UNKNOWN**: confirm in a Debug build, a `console.log` of the guard). The safer form is to stop depending on it and test `SoundPlayer`'s own call result in the existing `try`.
- Android: nothing; `AlarmSound` is a legacy module and works through interop: `MainApplication.kt` has to follow the 0.88 template (`getDefaultReactHost(context, packageList = PackageList(this).packages.apply { add(AlarmSoundPackage()) })`, see the sister's `MainApplication.kt`), keeping `createAlarmNotificationChannel()`, `AlarmConstants`, `AlarmSoundPackage`, `AlarmSoundModule`. `BuildConfig.IS_NEW_ARCHITECTURE_ENABLED` and the `DefaultReactNativeHost` pattern are phase 3's to replace; do not drop the alarm code while doing it. The interop supports `getConstants` and `@ReactMethod` (`TurboModuleInteropUtils.kt` handles both).
- If 0.14.5 does not work on iOS 0.88: the iOS part is ~40 lines of `AVPlayer` (`playUrl`/`stop`); the app already has an iOS native module (`NotificationSettings`) and an Android one (`AlarmSound`). Replace `SoundPlayer` by a shared `AlarmSound` JS wrapper (`start(url)`/`stop()`), remove the library, and the `App.tsx` listeners (they only log). That is the fallback, not the plan.

### 4.4 Delete
`App.tsx:8-25` listeners are dead weight (log only): can go with the migration (the library's iOS `hasListeners` guard makes them harmless either way).

### 4.5 Verify
- Jest: `NewOrderNotification` tests exist (`jest/setup.js:93` mock has `playAsset`/`stop` only, not `playUrl`: check that the tests are not passing for the wrong reason).
- Android emulator: modal opens on a socket event, sound repeats every 2.5 s through the alarm stream (check the volume is forced to max), vibration pattern, sound stops on close.
- iOS simulator: `playUrl` plays the CloudFront file (audio on the simulator works); silent switch (a simulator cannot test it; the library sets the `Playback` category in the load path only: the `playUrl` path may use the default category; **UNKNOWN** whether the in-app sound is heard with the ringer switch on silent: same as today).
- Real phone: section 12.

### 4.6 Risks
Interop on iOS with 0.88 + 0.14.5 unverified by anyone; abandoned library (last npm release Feb 2025); the alarm must not regress, so test the iOS in-app sound before anything else in this phase.

## 5. Bootsplash now: `react-native-splash-screen` 3.3.0 → `react-native-bootsplash` ^7.3.5

### 5.1 Today (what exactly is replaced)
JS:
- `src/DeliveryApp.tsx:3` `import SplashScreen from 'react-native-splash-screen'`; `:83-87` effect: `Platform.OS === 'ios' && cachedTheme !== undefined && (!configStore.loading || !settings.use_root_point)` → `SplashScreen.hide()`. Until the cached theme is read the component returns `null` (`:90`), so the native splash stays up. **On Android this effect does nothing**.
- `src/pages/Splash.tsx:3,15,50-52,69-70,84-85`: `hideNativeSplash = () => SplashScreen.hide()` is called on the launch image's `onLoad`/`onError` and after `NATIVE_SPLASH_MAX_DURATION` = 5000 ms. The page is the navigator screen shown while `!loaded || permissionsState.isLoading` (`RootNavigator.tsx:731-736`, and `HomeNavigator.tsx:95` for its own loading). It repeats the native launch image frame by frame: iOS: image `{ uri: 'SplashImage' }` at the storyboard frame (393x852 reference, image at x 76, y 362, 250x80, `contain`); Android: `require('../../android/app/src/main/res/mipmap-xxxhdpi/splash.png')` full screen `cover`, aligned by measuring the container (`src/theme/bundledImages.ts:13-17`).
- Tests: `src/pages/__tests__/Splash.test.tsx` (asserts `SplashScreen.hide` on load, error, 5 s, and the iOS frame geometry), `jest/setup.js:88-91` mock; type stub `src/types/react-native-splash-screen/index.d.ts`.

iOS native:
- `ios/ODelivery/Info.plist`: `UILaunchStoryboardName = SplashScreen`; `UIUserInterfaceStyle = Light`; `UIRequiredDeviceCapabilities = armv7`.
- `ios/SplashScreen.storyboard` (at `ios/` root, referenced in `project.pbxproj:85,176,269,436`): a centred image view `SplashImage` (asset 266x60 pt) on `systemBackgroundColor` (white). `ios/ODelivery/LaunchScreen.storyboard` is dead (template text "ReactNativeTemplateBase"; not in the pbxproj).
- Assets: `ios/ODelivery/Images.xcassets/SplashImage.imageset/splash@1x|2x|3x.png`: **three identical 798x180 PNGs** of the colour "Ordering" wordmark (ring + text).
- `ios/ODelivery/AppDelegate.swift:111` `RNSplashScreen.show()` right after `factory.startReactNative(...)` in `SceneDelegate.scene(_:willConnectTo:options:)`; `ios/ODelivery/ODelivery-Bridging-Header.h:3` `#import <react-native-splash-screen/RNSplashScreen.h>`.

Android native:
- `MainActivity.kt:3,9-14`: `installSplashScreen()` (androidx `core-splashscreen`), `SplashScreen.show(this)` (react-native-splash-screen dialog), `super.onCreate(null)`.
- `AndroidManifest.xml` MainActivity theme `@style/AppTheme.Splash`; `res/values/styles.xml` `AppTheme.Splash` (parent `Theme.SplashScreen`, background `@color/splashscreen_bg` = `#FFF`, transparent animated icon, `postSplashScreenTheme` `AppTheme`); `res/layout/launch_screen.xml` (full-screen `ImageView` `@mipmap/splash`, `centerCrop`); `res/mipmap-{ldpi..xxxhdpi}/splash.png` (2732x2732 white square with the same wordmark, centred, small) and `splash_land.png`; `android/app/build.gradle` `implementation 'androidx.core:core-splashscreen:1.0.1'` and a "Exclude conflicting support libraries ... react-native-splash-screen" block.

### 5.2 Target
Sister commit `b7fed3f` (and its `docs/SPLASH.md`): bootsplash **7.3.5**, logo on a colour, same on both platforms, hidden by JS. README of 7.3.5 (installed in the sister): "supports the latest version and the two previous minor series"; setup for RN >= 0.88 is documented. Package has `codegenConfig` `RNBootSplashSpec` (TurboModule). Sister's one hide path: `src/utils/splash.ts` `hideSplash()` (calls `BootSplash.hide({ fade: true })`, runs listeners once, with a 10 s safety timeout armed by `AppSplash`).

### 5.3 What replaces what

JS calls:
| Today | Bootsplash |
|---|---|
| `SplashScreen.hide()` (`DeliveryApp.tsx:85`, `Splash.tsx:15`) | `BootSplash.hide({ fade: true })` (returns a Promise; `.catch(() => undefined)`). `BootSplash.isVisible()` exists. Put both behind one `hideSplash()` as the sister's `src/utils/splash.ts`; never call `BootSplash.hide` directly elsewhere. |
| `SplashScreen.show()` (native, `AppDelegate.swift:111`, `MainActivity.kt:13`) | not needed: bootsplash shows from the first frame by itself (iOS storyboard held by `initWithStoryboard`; Android theme). |
| jest mock `jest/setup.js:88` | the sister's mock: `hide: jest.fn(() => Promise.resolve()), isVisible: jest.fn(() => false), useHideAnimation: ...` (its `jest/setup.js:67-75`) |

iOS `AppDelegate.swift` (the app already has the UIScene lifecycle: `SceneDelegate` + `ReactNativeDelegate`, same shape as the sister):
```swift
import RNBootSplash   // new import at the top
// SceneDelegate.scene(_:willConnectTo:options:): delete  RNSplashScreen.show()
class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  // The splash (BootSplash.storyboard) stays over the app until JS hides it.
  override func customize(_ rootView: RCTRootView) {
    super.customize(rootView)
    RNBootSplash.initWithStoryboard("BootSplash", rootView: rootView)
  }
  ...
}
```
This is the sister's code (`ios/ReactNativeAppsTemplate5/AppDelegate.swift`, `ReactNativeDelegate.customize`). The 7.3.5 README's RN >= 0.88 snippet subclasses `RCTDefaultReactNativeFactoryDelegate` as the SceneDelegate; the sister keeps the two classes separate and ships that on 0.88.1, which is what the driver already has: keep the driver's structure.
`ODelivery-Bridging-Header.h`: remove line 3 (`RNSplashScreen.h`); keep the other two imports (`NotificationSettings.swift` needs `RCTPromiseResolveBlock`).
`Info.plist`: `UILaunchStoryboardName` `SplashScreen` → `BootSplash`; sister also changed `UIRequiredDeviceCapabilities` armv7 → arm64 and the status bar to dark content over a light splash (optional).
Side note for the same file (not splash, but it is in the `SceneDelegate` the splash change touches): the driver's `scene(_:openURLContexts:)` and `scene(_:continue:)` call `RCTLinkingManager.application(...)`, which does nothing in a scene app; sister commit `8bac0f7` switched to `RCTLinkingManager.scene(_:openURLContexts:)` / `scene(_:continue:)` and put the launching URL into the launch options (`SceneDelegate.launchOptions` already does the latter in the driver). The driver's comment says "React Native 0.81 has no scene ones": 0.88 has (the sister uses them).

iOS files (the CLI writes them; see 5.4):
- new `ios/ODelivery/BootSplash.storyboard` (added to the Xcode project's Resources), new `Images.xcassets/BootSplashLogo.imageset` (`logo.png`, `logo@2x.png`, `logo@3x.png`), delete `ios/SplashScreen.storyboard`, `Images.xcassets/SplashImage.imageset`, the dead `LaunchScreen.storyboard`, and their `project.pbxproj` entries (lines 85, 176, 269, 436).

Android:
- `MainActivity.kt`:
  ```kotlin
  import com.swmansion.rnscreens.fragment.restoration.RNScreensFragmentFactory
  import com.zoontek.rnbootsplash.RNBootSplash
  override fun onCreate(savedInstanceState: Bundle?) {
    supportFragmentManager.fragmentFactory = RNScreensFragmentFactory()   // react-native-screens >= 4.16 (the plan takes 4.30.1)
    RNBootSplash.init(this, R.style.BootTheme)                            // before super.onCreate
    super.onCreate(savedInstanceState)                                    // today: super.onCreate(null)
    ...
  ```
  Delete `installSplashScreen()`, `SplashScreen.show(this)` and the `org.devio.rn.splashscreen` / `androidx.core.splashscreen` imports. The existing insets listener stays. The `super.onCreate(null)` of today is the pre-4.16 pattern: with `RNScreensFragmentFactory` the README says pass `savedInstanceState`.
- `res/values/styles.xml`: remove `AppTheme.Splash`; add
  ```xml
  <style name="BootTheme" parent="Theme.BootSplash">
      <item name="darkContentBarsStyle">true</item>
      <item name="bootSplashBackground">@color/bootsplash_background</item>
      <item name="bootSplashLogo">@drawable/bootsplash_logo</item>
      <item name="postBootSplashTheme">@style/AppTheme</item>
  </style>
  ```
  (the sister's). `AppTheme` keeps `windowOptOutEdgeToEdgeEnforcement` etc.
- `AndroidManifest.xml`: MainActivity `android:theme="@style/AppTheme.Splash"` → `@style/BootTheme`.
- `res/values/colors.xml`: `splashscreen_bg` → `<color name="bootsplash_background">#FFFFFF</color>`.
- `res/drawable-{mdpi..xxxhdpi}/bootsplash_logo.png` (generated); delete `res/layout/launch_screen.xml`, `res/mipmap-*/splash.png`, `splash_land.png` (but see 5.5: `Splash.tsx` currently `require`s `mipmap-xxxhdpi/splash.png`).
- `android/app/build.gradle`: delete `implementation 'androidx.core:core-splashscreen:1.0.1'` and the comment of the `configurations.all { exclude ... }` block (the exclusions can stay).

### 5.4 Assets from the current launch image (CLI)
The CLI (`react-native-bootsplash generate <logo> ...`) takes **one logo** (PNG or SVG), a background colour and a logo width, and writes: Android `drawable-*/bootsplash_logo.png`, `values/colors.xml` (`bootsplash_background`), `values/styles.xml` (`BootTheme`), the manifest theme; iOS `BootSplash.storyboard`, `Images.xcassets/BootSplashLogo-<hash>.imageset`, `Colors.xcassets/BootSplashBackground-<hash>.colorset`, `Info.plist` `UILaunchStoryboardName`, and it adds the storyboard and `Colors.xcassets` to the Xcode project (sister's `docs/SPLASH.md` "Regenerating with the CLI"; I read `dist/commonjs/extras/generate.js` and `utils.js` only for the names, not the full flow). Source for this app: the iOS `SplashImage.imageset/splash@3x.png` (798x180 RGBA, the colour wordmark; the three scales are the same file) is the only clean logo asset; the Android `splash.png` is the same wordmark small in a 2732x2732 white square (not usable as input). Background `FFFFFF` (the current iOS background is `systemBackgroundColor` with the app forced Light; Android `#FFF`).
Suggested command (sister's flags, `--logo-width` is the one decision):
```
yarn react-native-bootsplash generate <path>/splash@3x.png --platforms=android,ios --background=FFFFFF --logo-width=<dp> --assets-output=<temp dir>
```
`--logo-width` for this wordmark: today iOS draws it 250 pt wide (frame 250x80, image aspect-fit 266x60, so visually 250x56). Android 12+ masks its system splash icon area to a 192 dp circle; the sister limits a square logo to <= ~134 dp for that reason (its `docs/SPLASH.md`). A wide wordmark whose diagonal must stay inside 192 dp would be about 180 dp wide (4.4:1 aspect, 180 x 41 dp, diagonal 185). **UNKNOWN**: whether bootsplash's Android theme is clipped by that mask for a wide logo (the sister says it draws over the window from the first frame, so it should not be). Check on an Android 12+ emulator; start with `--logo-width=180` (it keeps the aspect: height = 180 x 180/798 = 41), and look at iOS at the same width for a matching result (iOS currently shows 250).
Keep the sister's discipline: the CLI emits hashed names; the Builder expects **fixed** names (decision/risk 4 of the plan); the sister renames them back and restores the storyboard (`docs/SPLASH.md` "Regenerating with the CLI" lists the steps: rename the imageset/PNGs, delete `Colors.xcassets` and its pbxproj entries, keep only the theme change in the manifest). The `UIKit` launch screen cache note applies (iOS caches launch screens; fixed names + an update can show the old one until reinstall).
Also: `Theme.BootSplash` parent is `Theme.AppCompat.DayNight.NoActionBar`; the app forces light (`UIUserInterfaceStyle Light`, `forceDarkAllowed false`); the explicit `bootSplashBackground` makes the colour constant in dark mode.

### 5.5 What the JS splash page does afterwards
The page `src/pages/Splash.tsx` stays: it is the loading screen of the app after the native splash (while the session, configs, push setup, schedule and permissions load: `!loaded || permissionsState.isLoading`), and it hides the native splash once it has painted the same image, so there is no flash. Changes:
- The two hide moments become one `hideSplash()` (copy `ordering-app-marketplace-theming/src/utils/splash.ts`; it hides on every call, so a re-created activity/scene never keeps it): `DeliveryApp.tsx` effect (today iOS only) and `Splash.tsx` (`onLoad`, `onError`, 5 s timeout). On Android the `DeliveryApp.tsx` effect currently does nothing: with bootsplash call `hideSplash` there on both platforms only if the JS page is mounted right after (it is: `cachedTheme` known → the navigator renders `Splash` first); otherwise the Android native logo stays until the image `onLoad`. Keep the 5 s timeout as safety (the sister: 10 s).
- The launch image the page draws must now be **the logo bootsplash draws**: same bitmap (`BUNDLED_IMAGES.general.loadingSplash`: today iOS `{ uri: 'SplashImage' }` named asset, which no longer exists, and Android `mipmap-xxxhdpi/splash.png`, both deleted). Use one bundled file (the wordmark, e.g. the same PNG the CLI got, in `src/assets/images/`), **centred**, `logoWidth` dp wide, height by aspect, on `themeColor(theme,'background')`: the same on iOS and Android, which deletes the iOS frame constants (`LAUNCH_SCREEN`, `LAUNCH_SCREEN_IMAGE`, the 393x852 reference), the Android `measureInWindow` offset logic (`FullScreenImage`, `imageBottom`) and the platform split. Bootsplash centres the logo on the screen (storyboard centre constraints; Android theme), whereas today iOS puts it ~24 pt above the centre.
- The page's background must equal `bootsplash_background` / the storyboard colour (`FFFFFF`), not the theme's `background` token if the served theme changes it: the hand-off from native to JS would flash. Today the page already paints `themeColor(theme,'background')`; the native colour is a build constant. **UNKNOWN** whether the product theme's `background` is white in every brand.
- `src/pages/__tests__/Splash.test.tsx` rewrites its iOS-frame assertions (it asserts the 750x1334 frame maths) and mocks bootsplash instead of `react-native-splash-screen`.
- `src/theme/bundledImages.ts:13-17` loses its `Platform.OS` branch.
- Remove `src/types/react-native-splash-screen/index.d.ts`.

### 5.6 Verify
iOS simulator and Android emulator (this is the part a simulator proves well): cold start shows the logo on white from the first frame (no blank white screen, no double splash), then the JS page with the logo in the same place, then the app; kill-and-relaunch; Android 12+/13+/14 images (the system splash and bootsplash's theme); rotate is irrelevant (portrait only); the 5 s/10 s timeout (turn off the network to force it); after a project switch with `RNRestart.restart()` (`Login.tsx:28`) the native splash must show again and hide again. Real phone: only to confirm timing.

### 5.7 Risks
Builder: the plan (§3 risk 4, §6 U5) states a Builder build has no correct splash until its driver base is adapted; fixed asset names and the three text/colour spots (`bootsplash_background`, storyboard colour) are what the Builder replaces in the sister (`docs/SPLASH.md`). The driver's Builder base is **UNKNOWN** to me (the `builder.json` here only lists `ios_project`, `ios_bundle`, `android_package`, `root_path`). `react-native-screens` >= 4.16 is required for the fragment-factory line (plan target 4.30.1). iOS launch-screen cache on updated installs.

## 6. reCAPTCHA

### 6.1 Today
`src/ui/src/components/LoginForm/index.tsx`:
- `:4` `import Recaptcha from 'react-native-recaptcha-that-works'` (v2 checkbox flow, `:508-521`: a `RecaptchaCheckbox` row opens `recaptchaRef.current.open()` (`:117`); `<Recaptcha ref siteKey baseUrl onVerify onExpire />`).
- `:5` `import ReCaptcha from '@fatnlazycat/react-native-recaptcha-v3'` (v3 invisible, `:500-506`: `<ReCaptcha url siteKey containerStyle={styles.recaptchaV3} onExecute={onRecaptchaVerify} reCaptchaType={1} />`).
- Config logic `:125-146`, `:263-271` (v2 fallback after `ERROR_AUTH_VERIFICATION_CODE`), `:383` style slot (`recaptchaV3: { height: themeControlHeight(theme,'md') }`).
- Tests: `.../LoginForm/__tests__/LoginForm.test.tsx:9,16` mock both. Stubs: `src/types/react-native-recaptcha-that-works/index.d.ts`, `src/types/@fatnlazycat/react-native-recaptcha-v3/index.d.ts`.
- No other importer. The submodule's `ReCaptcha` component is the web one.
- `react-native-webview` is 11.26.1 in `node_modules` (peer of both libs and of `react-native-signature-canvas`), declared `^11.22.7`.

### 6.2 Target
- v3: the sister replaced `@fatnlazycat/react-native-recaptcha-v3` (one release, 2022; "passed Google's errors to onExecute as if they were tokens") with its own `src/ui/src/components/RecaptchaV3/index.tsx` (+ `styles.tsx`, test) on `react-native-webview` 14.0.1 (commit `9856854`). The component keeps the old contract: `url` (the project's `security_recaptcha_base_url`), `siteKey`, `onExecute(token)`, `onError(msg)`, `containerStyle`; the WebView loads `{ html, baseUrl: url }`, runs `grecaptcha.execute(siteKey, { action })` and posts `{type:'token'|'error'}` back; `onShouldStartLoadWithRequest` keeps Google's frames inside and opens other links outside the app.
- v2: `react-native-recaptcha-that-works` stays at 1.3.2 in the sister (`^1.2.0`): pure JS + `react-native-webview >= 10` peer (npm), no native code; 2.0.0 (2023) only converts to TypeScript and renames the type `RecaptchaHandles` → `RecaptchaRef` ([release 2.0.0](https://github.com/douglasjunior/react-native-recaptcha-that-works/releases)). Recommendation: stay at 1.3.2 (as the sister) unless typed usage is wanted; with 2.0.0 delete the `declare module` stub.
- `react-native-webview` 14.0.1 (the plan's phase 3 target, and the sister's) has Fabric support; the sister runs it.

### 6.3 Migration
1. Copy `RecaptchaV3/index.tsx`, `styles.tsx` and `__tests__/RecaptchaV3.test.tsx` from the sister into `src/ui/src/components/RecaptchaV3/`. The `styles.tsx` uses `styled-components/native` (`RecaptchaFrame` width 100%, `RecaptchaWebView` flex 1): check the driver's rule that styles come from the theme (the file has no literals).
2. `LoginForm/index.tsx:5` `import ReCaptcha from '@fatnlazycat/...'` → `import { RecaptchaV3 } from '../RecaptchaV3'`; `:500-506` `<ReCaptcha ... reCaptchaType={1} />` → `<RecaptchaV3 url={recaptchaConfig?.baseUrl} siteKey={recaptchaConfig?.siteKey} containerStyle={styles.recaptchaV3} onExecute={onRecaptchaVerify} />` (drop `reCaptchaType`). Add `onError` only if the screen should react (the sister does not).
3. Remove `@fatnlazycat/react-native-recaptcha-v3` from `package.json`, its type stub, and its `jest.mock` in `LoginForm.test.tsx:16`; add the sister's WebView mock once in `jest/setup.js:15-21` (its `testID: 'webview'` mock).
4. `package.json`: `react-native-webview` becomes a direct, current dependency (`14.0.1`).
5. Behaviour not to lose: the v3 token is requested once at mount of the component (the old library did the same); a project whose `security_recaptcha_base_url` is not its real origin will get a Google error: `onError`.

### 6.4 Delete
`@fatnlazycat/react-native-recaptcha-v3` + its stub; later, if v2 moves to 2.0.0, the other stub.

### 6.5 Verify
Jest (the sister's `RecaptchaV3.test.tsx`: html shape, message parsing). Simulator/emulator: login screen for a project with `security_recaptcha_type = v3` loads a WebView, a token arrives and `handleReCaptcha({ code, version: 'v3' })` runs (needs a project whose site key allows the `baseUrl`; check with the API, not on a real phone). The v2 checkbox: opens the challenge modal. A real phone adds nothing specific.

### 6.6 Risks
Google's script must load inside a WebView with `baseUrl` = the project's domain: a project with a bad `security_recaptcha_base_url` fails. Android WebView availability. The visible badge in the form slot (`recaptchaV3` height).

## 7. `rn-config-reader` 5.1.3

### 7.1 Today
- Importer: `src/navigators/RootNavigator.tsx:17`; use at `:352-353` (inside `checkPermissions`): `RNConfigReader.driver_location_permission_title` and `RNConfigReader.description_driver_location_permission`, each with a fallback (`'Allow Driver App to access this device's location even when closed or not in use?'`, `'This app collects location data for locate drivers, stores and customers'`) used when the value is missing **or equals its placeholder** (`'ALLOW_DRIVER_APP_ACCESS_LOCATION'`, `'DESCRIPTION_DRIVER_APP_ACCESS_LOCATION'`). They go to `react-native-permissions` `request('android.permission.ACCESS_FINE_LOCATION', { title, message, buttonPositive: 'Ok' })` (the Android rationale dialog). Mock: `src/__tests__/storefrontLaunch.test.tsx:133`; stub: `src/types/rn-config-reader/index.d.ts`.
- What the library does (read in `node_modules/rn-config-reader`): Android module `getConstants()` returns the strings listed in the string-array `export_variables` of `res/values/strings.xml` (the app has exactly two: `driver_location_permission_title`, `description_driver_location_permission`, values are the placeholders above that the **Builder replaces as text**); iOS returns the whole `Info.plist` dictionary under `BuildConfigs`, which has neither key, so on iOS the fallbacks always apply (the rationale object is Android-only anyway).
- No other use anywhere in `src`.

### 7.2 Target / options
- `react-native-device-info` cannot replace it: it reads device and app metadata, not custom string resources. (`react-native-device-info` is already used at `src/context/PermissionsContext.tsx:35` for `getSystemVersion` and at `src/utils/sentry.ts:11-15` for version/build/bundle id; plan target 15.0.2.)
- **The library will not build on the target toolchain**: its `android/build.gradle` has `buildscript { repositories { jcenter() } dependencies { classpath 'com.android.tools.build:gradle:1.3.1' } }`, `lintOptions`, `compileSdkVersion safeExtGet(..., 23)`. `jcenter()` was removed in Gradle 9.0 ([upgrade guide](https://docs.gradle.org/current/userguide/upgrading_major_version_9.html), "removal of deprecated jcenter()"); the sister runs Gradle 9.4.1 and does not use the library. The module itself is a legacy bridge module with `getConstants()` (the interop layer supports `getConstants` returning a `Map`: `TurboModuleInteropUtils.kt`), so the new architecture is not the problem: Gradle is. **The sister has no equivalent; this is the driver's alone.**
- Replacement (a few native lines, as the plan allows): keep the placeholders in `strings.xml` (so the Builder keeps replacing them, **UNKNOWN** how it locates them: the plan only says "as text") and read them natively. Options: (a) a new tiny module in `MainApplication.kt` next to `AlarmSoundModule`:
  ```kotlin
  class AppStringsModule(ctx: ReactApplicationContext) : ReactContextBaseJavaModule(ctx) {
    override fun getName() = "AppStrings"
    override fun getConstants(): Map<String, Any> = mapOf(
      "driver_location_permission_title" to ctx.getString(R.string.driver_location_permission_title),
      "description_driver_location_permission" to ctx.getString(R.string.description_driver_location_permission))
  }
  ```
  registered in `AlarmSoundPackage.createNativeModules` (or a second package), JS `NativeModules.AppStrings?.driver_location_permission_title`; (b) put the two strings in a JS config file the Builder also replaces (needs the Builder's agreement); (c) drop the custom rationale and use fixed `t('...', 'fallback')` translations (changes branding behaviour: the owner decides).
- Because the legacy interop works on 0.88, (a) is the smallest change: no spec, no codegen.

### 7.3 Migration
`RootNavigator.tsx:17,352-353` (the permission code moves with the location phase): swap `RNConfigReader` for `NativeModules.AppStrings` (Android only; `Platform.OS === 'ios'` → undefined → fallbacks, as today). Remove `rn-config-reader`, its stub, and its mock in `storefrontLaunch.test.tsx:133`; add the module to `MainApplication.kt`. `strings.xml` stays (the `export_variables` array can go: only the library read it).

### 7.4 Verify
Android emulator: first launch after the tutorial, the location permission rationale shows the title/message (with placeholders unreplaced: the English fallbacks). Real phone: nothing extra.

### 7.5 Risks
How the Builder rewrites `strings.xml` placeholders is not documented in either repo (**UNKNOWN**). If it also edits `android/app/build.gradle` / Kotlin by text, moving the strings into Kotlin would break it: keep them in `strings.xml`.

## 8. `react-native-restart` 0.0.27 → ^0.0.29

- Importers: `src/ui/src/components/OrdersOption/index.tsx:3,474` (`RNRestart.Restart()` on a "retry" button when offline), `src/ui/src/components/WebsocketStatus/index.tsx:4,87` (`RNRestart.restart()`), `src/pages/Login.tsx:5,28` (`RNRestart.restart()` after a project switch login). Tests: `src/ui/src/components/WebsocketStatus/__tests__/WebsocketStatus.test.tsx:4`, `src/pages/__tests__/Login.test.tsx:3`, `jest/setup.js:83-86` mock. Stub `src/types/react-native-restart/index.d.ts`. No native setup beyond autolinking.
- Target: 0.0.29 (npm `time.modified` 2026-08-15), the sister runs it (LoginForm/WebsocketStatus). 0.0.29 declares a codegen spec (`RNRestartSpec`, `src/NativeRNRestart.ts`) and its JS resolves the module with `TurboModuleRegistry.get('RNRestart') ?? NativeModules.RNRestart`; `Restart()` (capital R) is kept but `@deprecated`; `restart(reason?)` and `getReason()` are new.
- Migration: `package.json` version only. `OrdersOption/index.tsx:474` `RNRestart.Restart()` → `RNRestart.restart()` (not required; fewer deprecations). Remove the stub if `tsc` accepts the packaged types.
- Verify: simulator/emulator: the three triggers restart the app; after a project switch the splash shows again (section 5.6). Risks: none known.

## 9. `@sentry/react-native` 8.30.0 → 8.35.0

- Importer: `src/utils/sentry.ts:1` (`import * as Sentry`), called from `index.js:9` `initSentry()`. `Sentry.init({ dsn, environment: 'production', release: '<bundleId>@<version>+<build>', dist, enableNativeCrashHandling: false, enableAppHangTracking: false, tracesSampleRate: 0.1 })` and two `setTag` calls; no-op in `__DEV__` or without a DSN (`src/sentry.json`). Test `src/utils/__tests__/sentry.test.ts`. The file is practically identical to the sister's `src/utils/sentry.ts`. No Sentry Gradle plugin and no Xcode build phase exist in either app (grep of `build.gradle` / `project.pbxproj`).
- Target: the sister is on 8.33.0 (proven). 8.35.0 (2026-11-12, latest) lists "Restore touch breadcrumbs and rage tap detection on the New Architecture from React Native 0.88" (#7013) ([releases](https://github.com/getsentry/sentry-react-native/releases)); between 8.30 and 8.35 I found no breaking change in the notes (8.33: persist fatal JS error envelopes on Android before exit; 8.31-8.35 features are opt-in). Pod `RNSentry` 8.30.0 → new. Recommended: `8.35.0` (exact, as the repo pins) once the core is on 0.88; 8.33.0 is the sister's.
- Migration: version only; no code change. Verify: a forced JS error in a production-mode bundle on each platform arrives at the project (the release string must still match source maps: unchanged).
- Risks: `enableNativeCrashHandling: false` stays (Crashlytics does native crashes).

## 10. `react-native-background-fetch` 4.4.2 (new-architecture status only)

- No JS importer in `src` or `index.js` (only `jest/setup.js:147` mock). It is a real dependency of `react-native-background-geolocation` 4.19.4 (its `package.json` `dependencies`: `"react-native-background-fetch": "~4.2.6"`; pod `TSBackgroundFetch ~> 4.1.0`; `Info.plist` `BGTaskSchedulerPermittedIdentifiers = com.transistorsoft.fetch`; `android/build.gradle:31-33` adds its `libs` Maven folder; `UIBackgroundModes fetch`).
- Status: 4.4.2 (npm `time.modified` 2026-04-22) has a codegen spec in its `package.json` (`RNBackgroundFetchSpec`) and its podspec calls `install_modules_dependencies`: it supports the new architecture. The installed copy is 4.4.2 although background geolocation 4 asks for `~4.2.6` (hoisted); **UNKNOWN** whether bg-geo 4.19.4 itself supports the new architecture (outside this brief: the plan's phase 5/risk 3).
- Migration: none in this document; it moves with background geolocation 5 (plan phase 5).

## 11. Cross-cutting changes and order

- Order of work inside "push" (plan phase 4): (1) coordinator extracts push out of `RootNavigator.tsx` (`src/push/` or `src/navigators/oneSignalPush.ts` etc.); (2) Firebase 26 + notify-kit (JS identical; needs Android new architecture on); (3) OneSignal 5 (JS port + iOS NSE + Android NSE rewrite) — the riskiest, do it with a phone at hand; (4) sound-player 0.14.5.
- `package.json` end state for this document: `react-native-onesignal` `5.5.17`; `@react-native-firebase/{app,crashlytics,messaging}` `^26.4.1`; `react-native-notify-kit` `^9.7.0` (+ patch) instead of `@notifee/react-native`; `react-native-sound-player` `0.14.5`; `react-native-bootsplash` `^7.3.5` instead of `react-native-splash-screen`; `react-native-webview` `14.0.1`; `react-native-restart` `^0.0.29`; `@sentry/react-native` `8.35.0`; removed: `@fatnlazycat/react-native-recaptcha-v3`, `rn-config-reader`; kept: `react-native-recaptcha-that-works` `^1.2.0`→1.3.2, `react-native-background-fetch` 4.4.x.
- `ios/Podfile`: `$RNFirebaseDisableSPM = true`; NSE pod `5.8.1`.
- `android/build.gradle`: `google-services:4.4.4`, `firebase-crashlytics-gradle:3.0.8`; the sister's `subplugins { plugins.withId("com.android.library") { android.buildFeatures.buildConfig = true } }` block (AGP 9 turns BuildConfig off for libraries) is the core phase's, but notify-kit and others need it.
- Jest: `jest/setup.js` mocks for onesignal (v5 helper), notifee→notify-kit, splash-screen→bootsplash, webview; `src/__tests__/storefrontLaunch.test.tsx` mocks `rn-config-reader` and `@notifee/react-native` (lines 96, 133).
- A literal Google Maps API key sits in `AndroidManifest.xml` (not a placeholder): not part of this brief; I did not copy it.

## 12. Real-phone test list for the owner (push and location phones)

For each, on **one iOS and one Android phone**, with a driver account, in a project that uses OneSignal (`firebase_push_enabled` off) **and** repeat once in a project with `firebase_push_enabled = '1'` (FCM path). Send the push from the OneSignal dashboard or from the API as an order assignment. Write down: pass/fail, which build.

Push, per app state, both platforms:
1. App in **foreground**: a push for a new order arrives; the in-app "New order" modal/sound/vibration plays (socket) and the system notification behaviour is the expected one (v5 shows it in the foreground by default). Tap it: the order opens.
2. App in **background** (home screen): the notification appears with the **alarm sound** (Android: `new_order_alarm` channel; iOS: `order_sound_notification.caf`) and vibration; tap opens `OrderDetails` (or `OrderDetailsLogistic` for an assign request).
3. App **killed** (swiped away): same notification; tap launches the app and opens the right order (this is the cold-start click path, section 1.6). Also check that it works on the first launch after a fresh install and after login.
4. Phone **locked** and screen off: sound plays, notification visible on the lock screen (public visibility).
5. Phone on **Do Not Disturb / silent switch / Focus**: Android channel bypasses DND (set in code); iOS "time sensitive" breaks through Focus/scheduled summary (the extension sets it). Note what the ringer switch does to the iOS alarm.
6. **Volume**: Android alarm stream is raised to max by the extension; the notification volume of the OS is not touched.
7. **Banner style** (iOS): if banners are "temporary", the "Enable persistent notifications" alert still appears after the permission is granted.
8. **Permissions**: fresh install, deny notifications, then allow from Settings: the subscription resumes (iOS and Android 13+).
9. **Logout/login**: after logout, no push reaches the phone; after login as another driver, the push goes to the new driver only; the token row in `notification_tokens` is deleted on logout (ask the backend team to confirm).
10. **Two projects**: switching project (the app restarts) keeps pushes going to the right project.

Notification extension (iOS) and extender (Android), rich content:
11. A push with an **image attachment** and **action buttons**: the iOS service extension downloads and shows the image (a push without `mutable-content` never runs the extension); Android shows the big picture/buttons.
12. **Secure-order masking** in a project listed in the extension (`quickiedelivery`, `luisv4plus`): the order number is masked in the notification text on both platforms and unmasked in the app. Also in a project not in the list: not masked.
13. iOS: a push sent while the app was **never opened since boot** (extension reads the shared App Group value written by the app earlier: check masking still works after a phone restart).

Alarm sound inside the app:
14. New order modal on **iOS**: the sound (`SoundPlayer.playUrl`, CloudFront mp3) plays every 2.5 s while the modal is open and stops when closed (the one check of `react-native-sound-player` 0.14.5 under the new architecture). On **Android**: the alarm plays on the alarm stream at max volume; when the phone is in silent mode it still plays.

Location (the app's other core): 15. background location posts keep arriving at `/users/{id}/locations` with the app in foreground, background and killed, 20 minutes moving, both platforms (belongs to plan phase 5, listed because the same phones are used).

Other shell items:
16. Cold start: the splash is the logo on white from the first frame (no black or white flash), switches to the JS splash without a jump, then the app. 17. Login with reCAPTCHA v3 and v2 projects. 18. A forced Sentry error arrives (production build). 19. "Restart" actions (offline retry, project switch) relaunch the app.

## 13. What simulators and emulators can and cannot prove (short)

- Simulator/emulator can prove: builds, launch, splash appearance, JS call order (jest), reCAPTCHA, restart, Android FCM on a Google Play image (expected), the Android notification channel config, sound playing from the app (not the lock-screen/Focus behaviour).
- Only a real phone proves: APNs token and delivery (the ARM64 simulator gets none), the iOS service extension with `mutable-content`, time-sensitive/Focus, the silent switch, Android Doze/battery optimisation and OEM kill policies for a killed app, DND bypass, lock-screen visibility and sounds in the killed state.

## 14. Not found / unknown (consolidated)

1. Whether `react-native-sound-player` 0.14.5 has been run on RN 0.88 + new architecture by anyone (no statement in its README, issues or releases; the GitHub head README says it is unmaintained).
2. OneSignal 5: replay of the notification click that launched a killed app to a listener added late; whether `OneSignalUserDefaults.initShared()` and `import OneSignalCore` from the app target behave as in v4; whether the Android extender's `setChannelId('new_order_alarm')` yields the alarm sound/DND behaviour on real devices (the SDK source says an extender may change the channel).
3. The backend contract of `notification_tokens` (subscription id vs external id; what it does with `provider`); whether OneSignal dashboards use the `prompt_ios` / `notification_prompt` in-app triggers.
4. How the Builder replaces placeholders (`strings.xml` text, storyboard colour, splash asset names) and its driver base: not in either repo (`builder.json` has four keys). The plan §6 U5 says the Builder's driver base must be adapted.
5. Whether bootsplash's Android theme clips a wide wordmark under Android 12+'s circle mask (sister's doc: square logos <= ~134 dp): needs an emulator; suggested `--logo-width=180`.
6. Whether Crashlytics keeps collecting with no JS import after RNFB 26 (native init provider path read, not run).
7. `aps-environment` for release builds (`development` in the repo).
8. notify-kit 10.x on this stack (the sister runs 9.7.0 + patch): not proven.
9. I did not run any build, so every "builds" statement is a reading of manifests, Podfiles, Gradle files and release notes.

## 15. Sources used (web)
- React Native 0.82 release post: https://reactnative.dev/blog/2025/10/08/react-native-0.82
- react-native-firebase releases v24-v27 and guides: https://github.com/invertase/react-native-firebase/releases , https://rnfirebase.io/migrating-to-v26 , https://rnfirebase.io/migrating-to-v25
- OneSignal: https://github.com/OneSignal/react-native-onesignal/releases , https://unpkg.com/react-native-onesignal@5.2.12/MIGRATION_GUIDE.md , https://documentation.onesignal.com/docs/en/service-extensions.md , https://github.com/OneSignal/OneSignal-Android-SDK (notification interfaces and `NotificationDisplayer.kt`)
- Notifee archive notice and the fork: https://github.com/invertase/notifee , https://github.com/marcocrupi/react-native-notify-kit
- reCAPTCHA wrapper: https://github.com/douglasjunior/react-native-recaptcha-that-works/releases
- Sentry: https://github.com/getsentry/sentry-react-native/releases
- Gradle 9: https://docs.gradle.org/current/userguide/upgrading_major_version_9.html
- npm registry (`npm view`) for versions and dates of every package listed; tarballs of `react-native-sound-player@0.14.5` and `react-native-notify-kit@10.10.0` were downloaded to this folder's `_pkgs/` for reading only (untrusted, not executed).
