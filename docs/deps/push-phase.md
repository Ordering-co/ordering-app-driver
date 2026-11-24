# Push phase: OneSignal 5, Firebase 26, notify-kit, sound-player 0.14.5

Date: 2026-11-13. Branch `upgrade/push` (worktree `driver-theming-wt/push`). It does the push part of
[DEPENDENCIES_PLAN.md](../DEPENDENCIES_PLAN.md) (phase 4) from the research in
[push-and-shell.md](push-and-shell.md) §1 to §4. Where the research and what the code showed differ, this
page says so ("Reality").

No simulator, emulator or phone was used for this phase (another agent had them). Everything below
marked "built" was built; everything marked "not seen" waits for the test list at the end.

## 1. Versions

| Library | Before | After |
|---|---|---|
| `react-native-onesignal` | 4.5.2 (+ interim patch) | **5.5.17** (exact pin, as the sister app); native SDKs: iOS `OneSignalXCFramework` 5.8.1, Android 5.11.0 |
| `@react-native-firebase/app`, `/crashlytics`, `/messaging` | 23.8.8 | **^26.4.1** (the lock resolved 26.4.2); Firebase iOS SDK 12.10.0 -> 12.19.3 |
| `@notifee/react-native` | 9.1.8 | removed; **`react-native-notify-kit` ^9.7.0** (9.7.0) + the sister app's JDK patch |
| `react-native-sound-player` | 0.13.4 (+ interim patch) | **0.14.5** (exact pin), no patch |

Patches: removed `react-native-onesignal@4.5.2.patch` and `react-native-sound-player@0.13.4.patch`;
added `react-native-notify-kit@9.7.0.patch` (copied from the sister app: lets the library's Gradle
script run on any JDK from 17 on; it refuses everything but 8/11/17/21 and Android Studio ships 25).
`pnpm-workspace.yaml` `patchedDependencies` follows. Left alone (other phases): splash-screen,
rn-config-reader.

Gradle plugins: `google-services` 4.4.4 and `firebase-crashlytics-gradle` 3.0.8 were already bumped by
the core upgrade (checked). The `@notifee` local Maven line of `android/build.gradle` is gone (notify-kit
needs none).

## 2. OneSignal: where the calls live

`RootNavigator.tsx` no longer imports `react-native-onesignal`. The calls are in the app's own modules,
ported from the sister app (`ordering-app-marketplace-theming`) without its cookie-consent gate:

| File | What |
|---|---|
| `src/navigators/oneSignalPush.ts` | `createOneSignalPush`: setup, teardown, listeners, stale-subscription retirement, stale-setup guards |
| `src/navigators/pushProviderSwitch.ts` | which provider is wanted (Firebase when `firebase_push_enabled`, else OneSignal with an app id, none without a session) and one change at a time |
| `src/navigators/oneSignalSms.ts` | the phone as E.164 |
| `src/navigators/oneSignalGate.ts` | `shouldSetupOneSignal` (no consent), `shouldPromptForPushNotifications` |
| `src/navigators/notificationTokens.ts` | find and delete the API's `notification_tokens` row |
| `jest/helpers/mockOneSignal.js` | the v5 mock (records calls in order, keeps listeners to emit) |

Driver differences from the sister app:

- no `hasConsented`; identity `${ordering.project}-${user.id}`; id config `configs.onesignal_deliveryapp_id`;
  app key `settings.notification_app`.
- `createOneSignalPush` takes `onPermissionGranted`: called when the notification permission was already
  granted at setup and when the driver accepts the dialog. `RootNavigator` uses it for
  `setPendingBannerCheck(true)` (the iOS "persistent banner" alert), exactly where v4 did.
- the OneSignal state registered with the API carries **no `notification_provider`** (the driver app never
  sent one for OneSignal; Firebase's still sends `fcm`). The sister app sends `onesignal`: not copied,
  because the backend contract of the driver is not in either repository.

### Old -> new, call by call

| v4 (`RootNavigator`) | v5 (`oneSignalPush.ts`) | Behaviour change and how it is handled |
|---|---|---|
| `setLogLevel(6, 0)` | `OneSignal.Debug.setLogLevel(__DEV__ ? Verbose : Warn)` | v4 logged verbosely always; at Verbose the native SDK writes email, phone and external id to the device log, so release builds use Warn. Jest test. |
| `setAppId(id)` | `OneSignal.initialize(id)` | once per app id, before every other call (Android throws before it). Jest test on the call order. |
| `setNotificationOpenedHandler(h)` | `Notifications.addEventListener('click', h)` | added after `initialize`, once; removed on unmount. The click arrives as `notification.additionalData`; `RootNavigator` maps it with `getOpenedPushOrderData` (the same mapping Firebase pushes use, it also turns `''` / `'null'` into null). Tests: unit (hands the notification over) and `RootNavigator.push.test.tsx` (a click opens `OrderDetails`). **Cold start (killed app) not seen: device list 3.** |
| `addSubscriptionObserver(e => e.to.userId)` | `User.pushSubscription.addEventListener('change', ({ current }) => current.id)` | the token is now the push **subscription id** (the v4 player id, kept on update according to the sister app); it is what `POST /users/{id}/notification_tokens` sends, as today, and what `notification_state` stores for `LogoutButton`. Tests: id from `getIdAsync`, id that arrives through `change`, change during an in-flight setup. |
| `addTrigger('prompt_ios','true')` + `promptForPushNotificationsWithUserResponse(() => {})` when `!isSubscribed` | `InAppMessages.addTrigger('prompt_ios','true')` when the change event says not opted in | the prompt is **not repeated** on every unsubscribed event: v5 asks once per install (`onesignal_permission_asked`), because Android 13+ would show the dialog again in the middle of work after a denial. A permission granted later from Settings arrives through `permissionChange` and opts the subscription in. Tests for each. |
| `getDeviceState().hasNotificationPermission` | `await Notifications.getPermissionAsync()` | already granted: `optIn()` and `onPermissionGranted`. |
| `addTrigger('notification_prompt','true')` + `promptForPushNotificationsWithUserResponse(cb)` | `addTrigger('notification_prompt','true')` then `Notifications.requestPermission(false)` | kept the trigger (a OneSignal dashboard in-app message may key on it: research says UNKNOWN, so not dropped). `cb(accepted)` -> `.then(granted => optIn + onPermissionGranted)`; ignored if a teardown came meanwhile. Tests. |
| `setEmail(e)` | `User.addEmail(e)` | v5 **adds** (v4 replaced): the old email is removed (`removeEmail`) when the driver's email changed, also across app restarts (the last identity is stored under `onesignal_identity`). Tests. |
| `setSMSNumber('+57 300...')` | `User.addSms(oneSignalSmsNumber(user))` | v5 answers 400 "Identifier invalid format" to anything but E.164: country code and number joined without spaces, trunk zero dropped, nothing sent when no valid number can be built. `removeSms` for a changed number. Tests (`oneSignalSms.test.ts`, `RootNavigator.push.test.tsx` checks `+573008282222`). |
| `setExternalUserId(id)` | `OneSignal.login(id)` | called **before** `addEmail` / `addSms` (v5 attaches them to the current user). Test on the order `initialize, login, addEmail, addSms`. |
| `getDeviceState().userId` | `await User.pushSubscription.getIdAsync()` | null until OneSignal creates the subscription; then it arrives through `change`. |
| (none: v4 never logged out) | `User.pushSubscription.optOut(); OneSignal.logout()` in `teardown` | **new**: when the app logs out (`auth` false) or the project leaves OneSignal for Firebase. The next driver's setup does `login(newId)` and `optIn()` (permission already granted). The token row is deleted by `LogoutButton` (as today); a teardown with the session still open also deletes it through `unregisterNotificationToken`. Tests: unit (teardown, next setup) and `RootNavigator.push.test.tsx` (`auth` true -> false calls `optOut`, `logout`, removes `notification_state`). |
| `promptForPushNotificationsWithUserResponse` on foreground | n/a | 5.5.9: foreground notifications now display by default (the driver never set a foreground handler; v4's default also displayed them): the system banner AND the in-app new-order modal can both show. Device list 1. |

`index.js` and `NavigationRef.tsx` have no OneSignal code (nothing changed there).

## 3. The Android notification service extension

`android/app/src/main/java/co/ordering/delivery/NotificationServiceExtension.kt`: the OneSignal 4 class
(`OneSignal.OSRemoteNotificationReceivedHandler`) became v5's `INotificationServiceExtension`. This is the
alarm: it must not regress. Line by line:

| # | What the OneSignal 4 class did | Where the new class does it |
|---|---|---|
| 1 | `raiseAlarmVolumeToMax(context)` first: `STREAM_ALARM` to its maximum when lower, errors swallowed | the same private function, the first call of `onNotificationReceived`, with `event.context` |
| 2 | `secureOrderId`: SharedPreferences `secure_order` / `project` (written by `AlarmSoundModule.setSecureOrderProject`); only for projects `quickiedelivery`, `luisv4plus`; the id is `additionalData.order_id` (non-blank); the masked id keeps all but its last up to 4 characters, which become `*` | the same function, now given `notification.additionalData` (a `JSONObject?`); `SecureOrder` (prefs name, key, project list, `mask`, `maskText`) is untouched |
| 3 | `mutableCopy()` + `setExtender` forcing: channel `new_order_alarm`, `PRIORITY_MAX`, `CATEGORY_ALARM`, `VISIBILITY_PUBLIC`, `DEFAULT_VIBRATE` | `event.notification.setExtender { builder -> ... }`, the same five setters (v5's notification is already mutable) |
| 4 | inside the extender, with a secure order: title and body masked with the word-boundary regex (`SecureOrder.maskText`), `setContentTitle`, `setContentText`, `BigTextStyle().bigText(body)` | the same four lines in the same extender, reading `notification.title` / `notification.body` |
| 5 | `event.complete(mutated)`: show the notification with the extender | no call: v5 shows the notification when `onNotificationReceived` returns, with the extender applied (we never call `preventDefault()`, which would suppress it) |
| 6 | `catch Throwable -> event.complete(event.notification)`: show it unchanged on any failure | the `try/catch` stays; on failure nothing is changed and v5 shows the original notification. The only code in the `try` is `setExtender`; the extender's own body runs later inside OneSignal's display path |
| 7 | registered in the manifest as meta-data `com.onesignal.NotificationServiceExtension` = `${applicationId}.NotificationServiceExtension` | **Reality: the meta-data name did not change** in v5 (the task text and the research's section 1.2 differ: the research is right). I confirmed it in the 5.11.0 SDK: the string `com.onesignal.NotificationServiceExtension` is read by `NotificationConstants` and `NotificationLifecycleService`. The manifest is unchanged; the merged debug manifest holds the entry. |
| 8 | (new) | `@Keep` on the class: the SDK instantiates it by name from the manifest; release builds do not minify today, this keeps it safe if they do |

The channel itself (`new_order_alarm`, alarm sound `order_sound_notification`, `USAGE_ALARM`, importance
HIGH, bypass DND, vibration pattern) is still created by `MainApplication.createAlarmNotificationChannel()`:
unchanged. `AlarmSound` (the new-order modal's Android sound) is unchanged. Compiled; **the behaviour needs
a real push (device list 2, 4, 5, 6, 12).** I could not unit-test Kotlin here (the project has no JVM test
setup); the masking functions are pure and unchanged.

## 4. iOS

- `ios/Podfile`: `OneSignalXCFramework` 3.12.6 -> **5.8.1** for the `OneSignalNotificationServiceExtension`
  target (the same version `react-native-onesignal`'s podspec asks for, so the app gets the same pod);
  `$RNFirebaseDisableSPM = true` before `prepare_react_native_project!` (the app links pods statically;
  Firebase comes from CocoaPods). `pod install` needed `--repo-update` and a `pod update` of the Firebase pods
  and `OneSignalXCFramework` (the lock pinned Firebase 12.10.0, RNFB 26 wants ~> 12.19).
- `OneSignalNotificationServiceExtension/NotificationService.swift`: `import OneSignal` ->
  `import OneSignalExtension`; `OneSignal.didReceiveNotificationExtensionRequest` /
  `serviceExtensionTimeWillExpireRequest` -> `OneSignalExtension.*`. `import OneSignalCore` stays (it
  provides `OneSignalUserDefaults`). The whole alarm behaviour (`order_sound_notification.caf`,
  `.timeSensitive`, `relevanceScore`, the secure-order mask) is untouched.
- `ios/ODelivery/NotificationSettings.swift`: unchanged (`import OneSignalCore`,
  `OneSignalUserDefaults.initShared().saveString(forKey: "secure_order_project", ...)`); it compiles with
  5.8.1 in the app target. That the extension reads what the app wrote (shared app group) is **not seen**:
  device list 12 and 13.
- Entitlements, extension `Info.plist` (the stray `RCTNewArchEnabled` key is harmless) and
  `aps-environment` were not touched. OneSignal's own location module stays on (the app has its own location
  stack; `ONESIGNAL_DISABLE_LOCATION` / `onesignal.disableLocation` would drop it: the owner's decision).
- `pod install` also rewrote `project.pbxproj` (the "[RNFB] Crashlytics Configuration" build phase now
  understands SPM) and `PrivacyInfo.xcprivacy`: generated, kept.

## 5. Firebase, notify-kit, sound player

- **Firebase 26**: the JS calls (`getMessaging`, `getToken`, `getInitialNotification`,
  `onNotificationOpenedApp`, `onMessage`, `onTokenRefresh`, `setBackgroundMessageHandler` in `index.js`) were
  already the modular API: no JS change in the calls. Behaviour added around them in `RootNavigator`:
  Firebase now goes through the same provider switch as OneSignal; its setup ignores a token that arrives
  after a teardown (generation guard); its state is built fresh instead of spreading the previous React state;
  the teardown (logout, or the project moving to OneSignal) removes its listeners and, with the session still
  open, deletes the FCM token's row. The device's FCM token is **not** deleted (no `deleteToken`: the old code
  never did). `firebase.json` untouched. `crashlytics` has no JS importer; its native init is automatic: a
  test crash is on the device list.
- **notify-kit**: one import (`react-native-notify-kit`), the same default export and names
  (`displayNotification`, `onForegroundEvent`, `AndroidImportance`, `EventType`). Mocks updated.
- **sound player 0.14.5**: no call site changed (`playUrl`, `stop`, the four `addEventListener` in `App.tsx`
  and the `NativeModules?.RNSoundPlayer?.playUrl` guard in `NewOrderNotification`). Its Android Gradle now
  reads the root `compileSdk` / build tools, so the interim patch is gone and both Android builds pass. The
  type stub `src/types/react-native-sound-player/index.d.ts` is deleted (the package ships `index.d.ts`;
  `tsc` is clean). It is a legacy bridge module running through the interop layer under the new
  architecture: that it plays on iOS is **not seen** (device list 14). On Android the alarm goes through
  the app's own `AlarmSound` module, which is **unchanged**.
- Not done, owner's decisions: removing `ReactNativeFirebaseMessagingHeadlessService` from the manifest (the
  sister app did, ORD-2425); a white notification small icon (`smallIcon: 'ic_launcher'` is the colour icon);
  removing the log-only `SoundPlayer.addEventListener` calls of `App.tsx`.

## 6. Tests

| Test | Why |
|---|---|
| `src/navigators/__tests__/oneSignalPush.test.ts` (ported, plus a "driver app" group), `pushProviderSwitch.test.ts`, `oneSignalSms.test.ts` | the new modules, with the sister's cases and the driver's: permission callback, `notification_prompt` trigger, no provider in the state, logout then login as the next driver |
| `oneSignalGate.test.ts` | the gate and the token helpers |
| `RootNavigator.push.test.tsx` | `RootNavigator` end to end against the v5 mock: nothing while signed out; `initialize, login, addEmail, addSms` and the token POST at sign-in; a click opens the order; sign-out opts out and logs out; unmount removes the listeners |
| `jest/setup.js`, `src/__tests__/storefrontLaunch.test.tsx` | the v4 mocks replaced by the v5 helper; notifee -> notify-kit mock |

Nothing was deleted or skipped: the v4 mocks asserted no call (they only stubbed the module), so the
"rewrite" is the mock and the new tests.

## 7. What was built (this worktree)

See the report of the phase for the tails: `pnpm install --frozen-lockfile`, `tsc`, lint (0 errors, same
warning count), 132 suites / 1329 tests (127 / 1262 before), theme guard and keys, i18n checks, both release bundles,
`pod install`, `xcodebuild` Debug for the iPhone simulator SDK of the app and its notification service
extension (`** BUILD SUCCEEDED **`, the appex embedded in `deliveryApp.app/PlugIns`), `:app:assembleDebug`
and `:app:assembleRelease`.

## 8. Test list for whoever verifies on devices

### Simulator / emulator (a Google Play image for Android)

1. Launch on both; sign in as a driver of a project with `onesignal_deliveryapp_id` and
   `firebase_push_enabled` off. The notification permission dialog shows once; deny, relaunch: it does not
   show again; allow from Settings: the subscription resumes.
2. A subscription id is obtained and `POST /users/{id}/notification_tokens` goes out with `token` = that id,
   `app` = `deliveryapp`, no `provider` (check the request in the backend or Metro's network log). Android
   emulator: yes (FCM works on Google Play images). iOS simulator (arm64): no APNs token, so no
   subscription id: only that the app launches and the prompt shows.
3. Sign out: `notification_tokens` row of that token is gone (backend), and a OneSignal push to that user no
   longer reaches the emulator; sign in as another driver: only they get it.
4. `firebase_push_enabled = '1'` project, Android emulator: a push with a `notification` while the app is open
   shows through notify-kit in `new_order_alarm`; tapping it opens the order. Switch the project config
   between providers while logged in: only one provider's token row remains.
5. Android: the `new_order_alarm` channel exists (Settings > App > Notifications: sound, bypass DND, importance
   high). `adb shell dumpsys notification` after a push shows channel `new_order_alarm`, priority max,
   category alarm.
6. The new-order modal sound: Android plays through `AlarmSound` on the alarm stream every 2.5 s and stops on
   close; **iOS**: `SoundPlayer.playUrl` plays the CloudFront mp3 every 2.5 s and stops on close (the one check
   of sound-player 0.14.5 on the new architecture; if silent, the fallback is a 40-line `AVPlayer` module, see
   push-and-shell.md §4.3).
7. `xcrun simctl push <device> co.ordering.delivery payload.apns` with `mutable-content` and
   `custom.a.order_id` may show the extension's output (not guaranteed to run it).
8. A forced test crash reaches Crashlytics (Debug collection is on in `firebase.json`).

### Real phones, one iOS and one Android (the owner), OneSignal project and, once, an FCM project

(continues the list of push-and-shell.md §12; numbers kept)

1. App in **foreground**: a new-order push arrives; the modal/sound/vibration plays, and the system banner
   (v5 shows it by default): note whether both is acceptable. Tap it: the order opens.
2. App in **background**: notification with the **alarm sound** (Android `new_order_alarm`; iOS
   `order_sound_notification.caf`) and vibration; tap opens `OrderDetails` (or `OrderDetailsLogistic` for an
   assign request).
3. App **killed**: same; tap launches the app and opens the right order. This is the cold-start click: v5's
   click listener is added after login and configs, so check it, after a fresh install too and after login. If
   the tap is lost, the listener has to be added earlier (a decision for the owner).
4. Locked screen: sound plays, notification visible on the lock screen.
5. Do Not Disturb / Focus / silent switch: Android channel bypasses DND; iOS time-sensitive breaks through
   Focus. Note what the ringer switch does to the iOS alarm.
6. **Volume** (Android): the alarm stream is raised to maximum by the extension at every push (also with the
   app killed).
7. iOS banner style "temporary": the "Enable persistent notifications" alert appears once the permission is
   granted (after the dialog, and at launch when it was already granted).
8. Permissions: deny, then allow from Settings: the subscription resumes (iOS, and Android 13+).
9. **Logout / login**: after logout no push reaches the phone (v5 opt-out + logout, new in this phase); login
   as another driver: pushes go to the new driver only; the `notification_tokens` row of the first driver is
   deleted (ask the backend).
10. Two projects: switching project (the app restarts) keeps pushes on the right project.
11. A push with an image and action buttons: iOS service extension downloads the image (needs
    `mutable-content`); Android shows big picture and buttons.
12. **Order masking** in a project listed in the extensions (`quickiedelivery`, `luisv4plus`): the order
    number is masked in the notification text on **both** platforms and not masked in the app; not masked in a
    project outside the list. (iOS: `OneSignalUserDefaults` handoff between app and extension on SDK 5.8.1.)
13. iOS: masking still works for a push sent after a phone restart before the app was opened.
14. In-app new-order sound on iOS (see simulator 6) with the ringer switch on silent.
15. Crashlytics receives a test crash from a release build (RNFB 26 initialises natively).
16. The OneSignal id: ask the backend team whether it keys on the subscription id or the external id
    (`${project}-${user id}`): the app sends the subscription id as before.

## 9. For the merger

- Run `pnpm install` (the lock changed, patches changed) and `cd ios && pod install` (Firebase 12.19 and
  OneSignal 5.8.1 need `--repo-update` when the local specs are old); a clean Android build after the first
  `pnpm install`.
- `src/navigators/RootNavigator.tsx` conflicts to expect: the imports at the top (OneSignal import removed,
  notify-kit, the new push modules), the block from `oneSignalState` to `firebasePushSetup` (replaced), and the
  push effect `[configsLoading, configs?.onesignal_deliveryapp_id?.value, ...]`. The location, splash and
  reCAPTCHA parts are untouched.
- `package.json` / `pnpm-lock.yaml` / `pnpm-workspace.yaml` (`patchedDependencies`) will conflict with the
  other phases' dependency edits: take both sets of changes and run `pnpm install`.
- `CLAUDE.md` rows for OneSignal and patches were edited.

## 10. Simulator and emulator run

Date: 2026-11-13. First run of the merged push stack on devices: `pnpm install --frozen-lockfile`,
`rm -rf ios/Pods && pod install` (`Podfile.lock` unchanged), Debug builds of both apps, fresh installs
(iPhone 17 simulator, iOS 27; Android emulator API 37, Google Play), signed in as the local test driver
against the local API. No redbox, crash or native error at start on either platform: the merge has no defect
found. Screenshots: `.theme-audit/screens/shell/{ios,android}/p0-*.png` (git-ignored).

| Check (section 8 item) | iOS simulator | Android emulator |
|---|---|---|
| Permission prompt (1) | The system dialog "Would Like to Send You Notifications" shows right after sign-in, once. "Allow": the app then shows its own "Enable persistent notifications" alert, i.e. `onPermissionGranted` ran (`setPendingBannerCheck`) | The system dialog "send you notifications" shows right after sign-in. "Don't allow": the app goes on to the orders list, nothing is asked again. `pm grant POST_NOTIFICATIONS` while the app runs: OneSignal logs "Sending permission change event" and two `update-subscription` operations (the `permissionChange` listener opted the subscription in) |
| Subscription id and token request (2) | **Obtained**: the research expected none on the arm64 simulator. A `POST /users/6/notification_tokens` went out at sign-in and the row holds a 36-character UUID with `app = deliveryapp` (the API stores `provider = onesignal`); that is OneSignal's subscription id, not an APNs token (the simulator still has no APNs token, so no delivery) | Obtained also with the permission denied: the same `POST` (`docker logs apiv4-api-1`), a row with a 36-character id |
| Sign out (3, 9) | Profile > logout: `POST /auth/logout` 200 and the token row is gone (the logout body carries `notification_state`); no crash | Same: `POST /auth/logout` 200, the row is gone; logcat shows the SDK's `logout()` call from `oneSignalPush.teardown`; no crash |
| Notification on screen (7) | `xcrun simctl push` of an alert payload with `mutable-content` and `custom.a.order_id` shows the banner with the app in the foreground (v5 shows it by default). The extension's masking cannot be judged: the project is not in the masked list | n/a (no way to send a OneSignal push without its REST key) |
| Channel (5) | n/a | `adb shell dumpsys notification`: `new_order_alarm` exists, importance 4 (high), `USAGE_ALARM`, sound `raw/order_sound_notification`, vibration 1000/500/1000/500/1000, plus `driver_location`. **`mBypassDnd=false`**: the code asks for it but Android only honors it with the user's Do Not Disturb access, as before this phase; the real-phone DND test (5) stays |
| New-order modal and sound (6) | Not triggered on 2026-11-13. **Seen on 2026-11-17** (foreground, through a local stand-in for the socket, because the real socket server refuses the local project): the dialog, and the `AVPlayer` for the mp3 every 2.5 s, stopped on close; **not heard** ([verification.md](../theme/verification.md) §11) | Not triggered on 2026-11-13. **Seen on 2026-11-17** (foreground): the dialog, `AlarmSound` with `USAGE_ALARM` started and stopped on close; **not heard**; in the background the dialog did not show (§11) |
| Local notification through notify-kit (4) | The app has no path to one on iOS | Only for projects with `firebase_push_enabled = '1'`, from an FCM `onMessage`; not exercised (no Firebase server key, and the local project does not turn it on) |

Could not do, and why:

- **A new order for the test driver** (the modal and its sound, a push to the device): on 2026-11-13 creating or assigning
  an order needed an admin session of the local API and none was provided (the driver cannot assign itself:
  `PUT /orders/{id}` with `driver_id` answers `ERROR_ORDER_UPDATE`). **2026-11-17:** with the admin session the order was assigned
  (`PUT /orders/{id}` `{"driver_id":6}`), the in-app dialog and its sound were started on both platforms in the foreground (see
  [verification.md](../theme/verification.md) §11); the real socket server does not accept the local project, so the event came
  from a local stand-in. Still not seen: a **push** for a new order (the alarm channel, the iOS alarm sound), the sound audibly
  and the background/killed cases: they stay on the real-phone list.
- **Logout needs the driver to have no active orders** (`getActiveOrders` blocks it with "Can't logout, You have
  assigned orders": that is the shared logic, not the push stack). The test driver has four such orders in the
  local database; for the logout runs their `status` was set to 1 and put back after (ids 2876 and 3523 to 0,
  3504 and 3506 to 8).
- A real OneSignal or FCM delivery, the iOS service extension, the killed-app click, Crashlytics: real phone.
- Android 17 asks "find, connect to, and determine the relative position of nearby devices" on the first launch
  of a Debug build: `android.permission.ACCESS_LOCAL_NETWORK`, which the app does not declare (the platform asks it
  when an app talks to a local address, here Metro and the local API); a build against public hosts should not
  hit it.
