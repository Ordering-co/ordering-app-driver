# Location stack and remaining libraries: the driver app's move to React Native 0.88.1 (new architecture)

Read-only research, 2026-11-13. App: `/Users/work/Ordering/ordering-app-driver-theming` (today RN 0.81.1, Android old architecture).
Sister: `/Users/work/Ordering/ordering-app-marketplace-theming` (RN 0.88.1, commits `74f43cf` platform, `4f26987` icons, `d48a3b2` libphonenumber, `1f0a494` map-link).
Paths below are relative to the driver app unless they start with `sister:`. Line numbers are of the working tree on 2026-11-13.
Nothing was installed, built or run. The package tarballs I read (to inspect types and native files) are in `deps/pkgs/` next to this file.

---------------------------------------------------------------------------------------------------

## 0. How much "proven by the sister app" is worth

I read the sister's `docs/theme/verification.md`. What it proves, and what it does not:

- Proven: the versions resolve together in `pnpm-lock.yaml` on RN 0.88.1 and the app was run **on an Android emulator (API 37, debug build)** and walked screen by screen.
- NOT proven: **iOS was never run** ("no Xcode on this machine, nothing was seen on iOS"); no release build is described; no physical device; no background location (the sister has no such library); the sister uses `react-native-maps` only in its own map component, and `@react-native-community/geolocation` only for **one-shot `getCurrentPosition`** (3 call sites), never `watchPosition`.

So wherever the table says "yes" it means "same version, resolved and run on an Android emulator, one-shot paths". Everything iOS, everything background, every `watchPosition` use is mine to carry.

---------------------------------------------------------------------------------------------------

## 1. Decisions and confirmations the owner has to give (read this first)

1. **Licence of background geolocation 5 (U4).** From the vendor's licence page (https://docs.transistorsoft.com/license/) and the plugin README:
   - A licence key is required for **RELEASE builds on both iOS and Android**. Debug builds work without one. Today only Android has a key (`com.transistorsoft.locationmanager.license`, the placeholder `_TRANSISTORSOFT_API_KEY_` in `android/app/src/main/AndroidManifest.xml:30`, replaced by the Builder); **iOS has none in `ios/ODelivery/Info.plist`**. Version 5 needs one there (`TSLocationManagerLicense`).
   - **v4 keys do not work with v5**: new keys come from the vendor's customer dashboard ("New" tab, a signed JWT token).
   - **One licence covers one Application Identifier** (suffixes such as `.dev`, `.staging`, `.test` count as the same one); a licence gives one Android key and one iOS key; keys are bound to the identifier typed at generation (one free regeneration for another identifier on request).
   - **The terms forbid reselling or offering the SDK as a "white-label" or "SDK as a service" product**; agencies may build apps for clients, but clients get no rights in the key unless the licence is transferred. The licence is perpetual, with **12 months of updates**; renewing the maintenance period is yearly and optional.
   - What the owner must confirm: (a) that the licence he holds (or buys) is a v5 one, (b) that it covers **every Application Identifier the Builder produces** for driver apps (each brand has its own bundle id / package) on **both** platforms, (c) that the Builder's white-label model is compatible with the "no white-label" clause, (d) who holds the dashboard and how the Builder receives two keys per app (Android meta-data and iOS Info.plist key; the iOS one is new work for the Builder), (e) the date from which updates stop being included.
   - What I could not find: what the SDK does at runtime in a release build with a missing or wrong key (the page only says debug builds work and the warning there does not restrict functionality). **Test a release build with no key before shipping** and treat "tracking silently stops" as the assumed behaviour.
2. **`react-native-background-fetch`**: the plan says it travels with background geolocation. In v5 it does **not** (see 2.2.1): the plugin has no dependency on it, and the app never calls it (no importer in `src`; only a Jest mock in `jest/setup.js:150`). Decision to take: remove it (recommended). The iOS part the SDK needs (`TSBackgroundFetch`) arrives with the iOS SDK pod.
3. **Foreground location library**: recommendation is **`@react-native-community/geolocation` 3.4.0**, behind ONE shared module (2.3). Needs a yes.
4. **When the app is killed, tracking stops (`stopOnTerminate: true`, `RootNavigator.tsx:~600`).** That is today's behaviour and the plan keeps it. If the business expects tracking to survive a swipe-kill, that is a separate decision (`stopOnTerminate: false` + headless task) and it changes the licence/consent/battery story. The test list in 2.6 states the expected result for each state under today's setting.
5. **Order inside the plan**: RN 0.82+ ignores `newArchEnabled=false` (official 0.82 post: the legacy architecture can no longer be enabled; interop layers for legacy modules are kept "for the foreseeable future"), and BGGeo 5 is a TurboModule (changelog 5.0.0-beta.2). So phases 3 (core) and 5 (location) cannot be separated for the build to run; only the *call-site* work can wait.

---------------------------------------------------------------------------------------------------

## 2. THE LOCATION STACK

### 2.1 Today

Importers (`src`, tests excluded unless said):

| Library | Where | What it does |
|---|---|---|
| `react-native-background-geolocation` 4.19.4 (`^4.14.6`) | `src/navigators/RootNavigator.tsx:14` (the only importer; the logic submodule does **not** import it) | `ready`, `onLocation`, `onHttp`, `start`, `stop`, `removeListeners`; HTTP posting to the API |
| `react-native-background-fetch` 4.4.2 | none in `src`; `android/build.gradle:38-45` (maven repo of the project), mock in `jest/setup.js:150` | nothing (it is a dependency of BGGeo 4.19.4: `npm view` shows `react-native-background-fetch ~4.2.6`) |
| `react-native-geolocation-service` 5.3.1 | `src/hooks/useLocation.tsx:2`, `src/ui/src/hooks/useLocation.tsx:2` (two copies of the hook), Jest mocks `jest/setup.js:130`, `jest/helpers/registerD4DeliveryMocks.js:7`, `src/ui/src/components/OrderDetails/__tests__/Delivery.test.tsx:544,867,901` | `getCurrentPosition`, `watchPosition`, `clearWatch` |
| `react-native-permissions` 5.4.2 | `src/context/PermissionsContext.tsx:5-11`, `src/navigators/RootNavigator.tsx:15`, `src/pages/RequestPermissions.tsx:5`, `src/ui/src/components/NotificationSetting/index.tsx:4`, `src/ui/src/components/AcceptOrRejectOrder/index.tsx:12` | `checkMultiple`, `requestMultiple`, `request`, `requestNotifications`, `checkNotifications`, `openSettings`, `RESULTS`, `PERMISSIONS` |
| `react-native-device-info` 10.14 | `src/context/PermissionsContext.tsx:3` (`getSystemVersion`), `src/utils/sentry.ts:2` (`getBuildNumber`, `getBundleId`, `getVersion`) | 4 calls |
| `react-native-maps` 1.13.2 | `src/ui/src/components/MapView/index.tsx:8`, `MapView/RenderMarker.tsx:3`, `DriverMap/index.tsx:8`, `src/ui/src/types/index.tsx:2` (`LatLng` type) | see section 3.3 |

The BGGeo code (`RootNavigator.tsx`):

- `:69` `useLocation()` (the `src/hooks` copy) gives `followUserLocation`, `getCurrentLocation`.
- `:103-121` `updateDriverLocation()`: a **second, JS-side path** that `fetch`es `POST ${ordering.root}/users/${user.id}/locations` with `location: JSON.stringify({lat,lng,mock,v:'1.0'})`, `driver_id`, `Authorization: Bearer`. It runs on every AppState change (`:128`), on every `onTouchEnd` of the root view (`:728`) and **inside every `onHttp` event** (`:567-570`).
- `:544-628` `handleBackgroundGeolocation()`: if permissions not granted, stops; if no token `removeListeners()`; else `followUserLocation()` (JS watch that is never stopped), `onLocation` (console.log only), `onHttp` (logs, calls `updateDriverLocation()`, `logout()` on `status === 401`), then `BackgroundGeolocation.ready({...})` (flat v4 config, listed in 2.2.3), then `setEnabled({enabled, ready:true})`.
- `:629-632` effect that calls it on `[isGrantedPermissions, token, languageState?.loading]`.
- `:633-648` effect that calls `BackgroundGeolocation.start()` / `.stop()` from `getBackgroundGeolocationRunPlan` (`src/navigators/getBackgroundGeolocationRunPlan.ts`: runs only when ready + auth + `user.enabled` + permissions granted + not schedule-blocked when `driver_login_validation` is on).
- `setConfig` is **not** used. A new token re-runs `ready({reset:true, ...})` with the new header.

Native today:

- `android/app/src/main/AndroidManifest.xml`: permissions `ACCESS_BACKGROUND_LOCATION`, `ACCESS_COARSE_LOCATION`, `ACCESS_FINE_LOCATION`, `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_LOCATION`, `POST_NOTIFICATIONS` (lines 3-11); meta-data `com.transistorsoft.locationmanager.license` (line 30, placeholder) and `com.google.android.maps.v2.API_KEY` (line 31-33, a literal key committed in the clear; the sister reads its keys through a Builder-written `NativeKeys`: worth the same treatment, value not copied here).
- `android/build.gradle:38-45` two `maven { url project(':react-native-background-fetch')/libs }` and one `project(':react-native-background-geolocation')/libs`; `playServicesLocationVersion = "21.0.1"` (line 9); `minSdkVersion = 29`.
- `android/app/build.gradle:59-61` `apply from: "${background_geolocation.projectDir}/app.gradle"`, `:112` extra proguard file from the plugin; `:121-128` manual `implementation(project(':react-native-maps')){exclude group: 'com.google.android.gms'}` plus `play-services-base:18.0.1`, `play-services-location:$playServicesLocationVersion`, `play-services-maps:18.0.2`.
- `ios/ODelivery/Info.plist`: `UIBackgroundModes` = `fetch`, `location`, `remote-notification`; `BGTaskSchedulerPermittedIdentifiers` = `com.transistorsoft.fetch`; `NSLocationAlwaysAndWhenInUseUsageDescription`, `NSLocationAlwaysUsageDescription`, `NSLocationWhenInUseUsageDescription`, `NSMotionUsageDescription`; **no licence key**.
- `ios/Podfile:19-24` `setup_permissions(['LocationAccuracy','LocationAlways','LocationWhenInUse','Notifications'])`; `Podfile.lock` has `RNBackgroundGeolocation (4.19.4)`, `RNBackgroundFetch (4.4.2)`, `TSBackgroundFetch (4.1.1)`.
- `ios/ODelivery/AppDelegate.swift`: no `TSBackgroundFetch` call (see 2.2.4).

### 2.2 `react-native-background-geolocation` 4.19.4 to 5.8.2 (decided by the owner)

Latest on npm: **5.8.2** (modified 2026-10-29). Read from the tarball (`deps/pkgs/bggeo/`) and the vendor's GitHub (CHANGELOG, `help/MIGRATION-GUIDE-5.0.0.md`).

#### 2.2.1 What changed that touches this app

- **Architecture**: v5 is a TurboModule (5.0.0-beta.2); `RNBackgroundGeolocation.podspec` uses `install_modules_dependencies`; Android library applies the `com.facebook.react` plugin and declares `codegenJavaPackageName`. It is the version meant for RN 0.88. (4.19.4 is a legacy module; on iOS it runs today through the interop layer, on Android it would too after the architecture flag is gone, but I found no vendor statement that this is supported.)
- **No dependency on `react-native-background-fetch`** (v5.8.2 `package.json`: `@babel/runtime`, `@transistorsoft/background-geolocation-types ^5.3.8`, `tslib`). The iOS pod `TSLocationManager ~> 4.8.0` itself depends on `TSBackgroundFetch ~> 4.1.0` (CocoaPods spec 4.8.3, read from the local trunk checkout). So removing the npm package loses nothing the SDK needs on iOS.
- **Maven repositories**: the migration guide tells you to **remove** the Huawei repo and the two `project(...)/libs` repos (`background_fetch`, the plugin). v5 resolves `tslocationmanager` from Maven Central/Google. This matters: if `react-native-background-fetch` leaves `package.json` while `android/build.gradle` still names `project(':react-native-background-fetch')`, Gradle fails at configuration.
- **Android**: `android/app.gradle` of the plugin is now an **empty file** kept only so `apply from:` still resolves (5.7.1, AGP 9 fix). `consumerProguardFiles 'proguard-rules.pro'` is applied by the library, so the app-level `proguardFiles "${background_geolocation.projectDir}/proguard-rules.pro"` line (`app/build.gradle:112`) is redundant. The vendor's setup page still asks that a release type with minify has `shrinkResources false`. `playServicesLocationVersion` default is **21.3.0** ("or higher"): the app's pin at 21.0.1 must be raised or removed. `tslocationmanager` default `4.7.+` (min 4.7.0 in 5.8.0).
- **iOS**: pod `TSLocationManager ~> 4.8.0`; the plugin ships a privacy bundle (`TSLocationManagerPrivacy`, `PrivacyInfo.xcprivacy`); deployment target for it is 15.0 (the app's is 15.1). Info.plist per the vendor: `UIBackgroundModes` `location`, `fetch`, `processing`, `audio` (audio only for debug sounds); `BGTaskSchedulerPermittedIdentifiers` `com.transistorsoft.fetch`; the three location usage strings and `NSMotionUsageDescription` (all present today); new: `TSLocationManagerLicense`. The app has no `processing` background mode today: add it if the vendor's list is followed to the letter (I could not verify it is mandatory).
- **Config model**: the flat config is **deprecated** (still accepted with runtime warnings), and the **TypeScript types only accept the compound config** (`ready(config: Config)` with `Config = {reset, logger, geolocation, http, app, persistence, activity, authorization}`; the old flat keys are typed only in the legacy declarations). The app is TypeScript, so `tsc` will reject the flat object at `RootNavigator.tsx:576`. Convert (2.2.3).
- **Constants**: the shared TypeScript interface does **not** declare `BackgroundGeolocation.LOG_LEVEL_VERBOSE` / `DESIRED_ACCURACY_HIGH` (they still exist at runtime in `src/index.js`). Use the named runtime enums: `import BackgroundGeolocation, { LogLevel, DesiredAccuracy, Subscription } from 'react-native-background-geolocation'` (named enum imports exist at runtime from 5.6.0; `Subscription` is a type).
- **Events**: `onLocation(cb, onError)`, `onHttp(cb)` return a `Subscription` (`.remove()`); `onHttp` receives `{success, status, responseText}` as today. `removeListeners()` works since 5.8.1 (it "removes every `on*` subscription; the bug existed since 4.4.0": today's logout path `RootNavigator.tsx:554` only half worked).
- **`Location`**: field `mock` (Android) exists; `age` is now in **seconds** with ms precision (the app does not read it).
- **5.6.0**: "Upgrading from 4.x imports the saved v4 configuration"; `requestPermission(permission?)` selector; rejections carry the bare status; on **iOS the motion prompt moves from `start()` to `requestPermission()`**: if the app never calls `requestPermission()`, iOS Motion & Fitness may never be asked, and motion-based stop detection is then unavailable. Test it (2.6) and decide whether to call `BackgroundGeolocation.requestPermission()` once after the app's own location flow (iOS only).
- **5.8.0**: stored configuration is encrypted (AES-256-GCM, key in Keystore/Keychain). Rolling back to an older plugin version leaves the old one on defaults until `ready()` runs; an undecryptable config starts the SDK **stopped** (after a backup restore or an app Keychain cleanup). Because the app calls `ready({reset:true,...})` on every launch, it re-applies its config anyway; keep `reset: true`.
- 5.3.0: geofencing and motion detection no longer need a foreground service; the vendor says `FOREGROUND_SERVICE`/`FOREGROUND_SERVICE_LOCATION` may be removed from a manifest **for those uses**. This app tracks with a foreground service (notification "Background tracking enabled"): **keep both permissions**.
- `foregroundService: true` (flat key, `RootNavigator.tsx:582`): the flat typings say the plugin enforces it on Android 8+ and it "cannot be set to false". It has no place in the compound types: drop it, expect the notification to stay (`app.notification`).

#### 2.2.2 `RootNavigator.tsx` call by call

| v4 call (line) | v5 |
|---|---|
| `import BackgroundGeolocation, { Subscription } from "react-native-background-geolocation"` (14) | same default import; add `LogLevel`, `DesiredAccuracy` as named imports |
| `BackgroundGeolocation.onLocation(cb)` (559) | same; returns `Subscription`; the app only logs: keep (or drop the console.log in release) |
| `BackgroundGeolocation.onHttp(cb)` (563) | same event shape; keep the 401 to `logout()` |
| `BackgroundGeolocation.ready({...})` (576) | same call, **compound** config (2.2.3), resolves a `State` with `enabled` |
| `BackgroundGeolocation.start()` / `.stop()` (643, 646) | same; both return `Promise<State>`; the run plan stays |
| `BackgroundGeolocation.removeListeners()` (554) | same; now really removes all |
| `BackgroundGeolocation.LOG_LEVEL_VERBOSE`, `DESIRED_ACCURACY_HIGH` (579-580) | `LogLevel.Verbose` (use `Info` or `Warning` in release builds: Verbose fills the on-device log database), `DesiredAccuracy.High` |
| token change: re-`ready()` | **change**: call `ready()` once, then `setConfig({ http: { headers: { Authorization: 'Bearer ' + token }, url }, persistence: { extras: { driver_id } } })` when the token or user changes (`setConfig` takes `Partial<Config>`) |

Defects found in today's code that the migration should not carry over (they exist now; verify before fixing):

1. `handleBackgroundGeolocation` is `async` and its `return () => { onLocation.remove(); onHttpChange.remove() }` (`:623-626`) is returned **to nobody**: the effect at `:629-632` ignores it. Every re-run (token, permission or language change) **adds another `onHttp` and `onLocation` listener**, so after N runs one HTTP event fires `updateDriverLocation()` N times and `logout()` N times on a 401. Register listeners once (module level or `useRef`) and remove them on unmount.
2. `updateDriverLocation()` runs on every `onHttp`, on every touch of the screen (`:728`) and on every AppState change: a JS-side POST in parallel with the SDK's own HTTP sync. The body differs (JS sends `location` as a JSON **string**; the SDK sends an object per `locationTemplate`). The server evidently accepts both. Capture one request of each on the server before and after the migration (see 2.6) and decide with the API owner whether the JS path is still needed.
3. `followUserLocation()` at `:558` starts a JS location watch that is never stopped, for the life of the app, only to keep the hook's state fresh.
4. `stopOnTerminate: true` together with `startOnBoot: true`: to my knowledge of the vendor's docs, start-on-boot only has effect when `stopOnTerminate: false`; today a reboot does not resume tracking until the driver opens the app. (Docs not fetched for this point; verify in the reboot test.)

#### 2.2.3 The `ready()` object: today (flat v4) to v5 (compound)

```
reset: true                                         -> reset: true            (top level, unchanged)
debug: false, logLevel: VERBOSE                     -> logger: { debug: false, logLevel: LogLevel.Verbose }
desiredAccuracy: HIGH                               -> geolocation: { desiredAccuracy: DesiredAccuracy.High,
distanceFilter: 25                                  ->   distanceFilter: 25,
stationaryRadius: 10                                ->   stationaryRadius: 10,
locationUpdateInterval: 40000                       ->   locationUpdateInterval: 40000,        (Android)
fastestLocationUpdateInterval: 20000                ->   fastestLocationUpdateInterval: 20000, (Android)
allowIdenticalLocations: false                      ->   allowIdenticalLocations: false,
locationAuthorizationRequest: 'Always'              ->   locationAuthorizationRequest: 'Always',
locationAuthorizationAlert: {titleWhenNotEnabled,   ->   locationAuthorizationAlert: {... same keys ...} }   (iOS)
  titleWhenOff, instructions, cancelButton, settingsButton}
foregroundService: true                             -> (no key: enforced on Android 8+)
stopOnTerminate: true, startOnBoot: true,           -> app: { stopOnTerminate: true, startOnBoot: true,
preventSuspend: true                                ->   preventSuspend: true,                  (iOS)
notification: {title, text}                         ->   notification: { title, text },         (Android)
backgroundPermissionRationale: {title, message,     ->   backgroundPermissionRationale: { same keys } }   (Android)
  positiveAction, negativeAction}
url, autoSync: true, headers: {Authorization}       -> http: { url, autoSync: true, headers: { Authorization: 'Bearer ' + token },
httpRootProperty: 'location'                        ->   rootProperty: 'location' }
locationTemplate: '{"lat":<%= latitude %>, ...}'    -> persistence: { locationTemplate: '...same string...',
extras: { driver_id }                               ->   extras: { driver_id } }
```

Key placements read from `@transistorsoft/background-geolocation-types` 5.3.8 (`core/config/*.d.ts`). The template tags (`latitude`, `longitude`, `mock`) are unchanged in the vendor's `http.md`. `{{httpRootProperty}}` was renamed `http.rootProperty`; `httpTimeout` is `http.timeout` (not used).

The vendor's http page says `extras` are merged into an object template, so `driver_id` ends up inside the `location` object as today; I did not find a statement about v5 changing that. Verify on the wire.

#### 2.2.4 Native changes, in order

Android (`android/`):
1. `android/build.gradle`: delete lines 36-45 (the three `maven {}` blocks that name `:react-native-background-fetch`/`:react-native-background-geolocation` and the Huawei repo); keep `google()` and `mavenCentral()` (the sister's `allprojects` shows the shape).
2. `android/build.gradle:9`: set `playServicesLocationVersion = "21.3.0"` or delete the line (maps 1.29.11 and BGGeo 5 both default to 21.3.0; community geolocation pins 21.0.1 and Gradle resolves the highest).
3. `android/app/build.gradle`: delete `:59-61` (`apply from .../app.gradle`) and `:112`; delete `:121-128` (manual maps project and the three play-services lines, see 3.3); keep `minifyEnabled enableProguardInReleaseBuilds` and add `shrinkResources false` in `release` if minify is ever turned on.
4. `AndroidManifest.xml`: put the new v5 key behind the same `com.transistorsoft.locationmanager.license` meta-data (Builder placeholder stays); keep all location permissions. After the first build read the **merged** manifest and confirm `ACTIVITY_RECOGNITION`, `FOREGROUND_SERVICE_LOCATION` and the SDK's services are present (the app requests `ACTIVITY_RECOGNITION` at runtime, `PermissionsContext.tsx:42`).
5. `android/gradle.properties`: `newArchEnabled=false` is ignored by 0.82+; the sister removes it by setting `true`.
6. `android/settings.gradle`: nothing for BGGeo (autolinking).

iOS (`ios/`):
1. `Info.plist`: add `TSLocationManagerLicense` (string, the v5 JWT; Builder placeholder to be created); keep `BGTaskSchedulerPermittedIdentifiers` and the location/motion strings; decide on `processing` in `UIBackgroundModes` (vendor list).
2. `Podfile`: nothing specific for BGGeo; `pod install` resolves `TSLocationManager ~> 4.8.0` and `TSBackgroundFetch`. Remove nothing but check that `RNBackgroundFetch` disappears from `Podfile.lock`.
3. `AppDelegate.swift`: the vendor's "auto" install page still lists `TSBackgroundFetch.sharedInstance()?.didFinishLaunching()` in `didFinishLaunchingWithOptions`. Today's AppDelegate has none and 4.19.4 runs. I could not tell from the pages I could read whether v5 needs it; the SDK's own debug log on the first launch will say ("BGTaskScheduler..." messages): look at it in the iOS test.
4. `PrivacyInfo.xcprivacy` of the app is untouched; the SDK ships its own bundle.

JS/tests:
- `jest/setup.js:138-145` mocks `react-native-background-geolocation` with `on`, no `onLocation`/`onHttp`/`LogLevel`: add `onLocation`, `onHttp` (returning `{remove}`), `setConfig`, `requestPermission`, and the enums (the file `src/__tests__/storefrontLaunch.test.tsx:112-113` already does for two of them).
- `jest/setup.js:150` mock of `react-native-background-fetch`: delete with the package.

#### 2.2.5 Effort and risk

Effort **L** (config conversion S, listener/`setConfig` restructuring M, native changes M, licence and Builder plumbing L, real-device verification L). Risk **high**: it is the product. Do it after the core upgrade builds; verify first in a **debug** build (no licence needed) on a device, then a release build with the real v5 keys.

### 2.3 Foreground location: `react-native-geolocation-service` 5.3.1 to ONE of two

The app's uses (all through `useLocation`, two copies of the hook):

- `GeoLocation.getCurrentPosition(ok, err, { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 })` (`src/hooks/useLocation.tsx:48-65`, `src/ui/src/hooks/useLocation.tsx:48-66`): returns `{latitude, longitude, speed, mocked, timestamp}`. `mocked` is posted to the API (`RootNavigator.tsx:114`), `timestamp` feeds the "location is outdated" check of order status changes (`src/ui/src/utils/index.tsx:344`, statuses 3, 9, 11, 26).
- `watchPosition(ok, err, { enableHighAccuracy: true, distanceFilter: 3 })` and `clearWatch(id)` (`:68-92`), used by `MapView/index.tsx:142-153` (focus effect), `DriverMap/index.tsx:192`, `OrderDetails/Delivery.tsx:251-254`, `RootNavigator.tsx:558` (never cleared).
- Callers of the hook: `RootNavigator.tsx:69`, `AcceptOrRejectOrder/index.tsx:62`, `OrderDetails/Delivery.tsx:89`, `NewOrderNotification/index.tsx:128`, `MapView/index.tsx:66`, `DriverMap/index.tsx:162`. Every mount of the hook runs its own `getCurrentPosition` (`useEffect` at `:38-46`).

Options compared:

| | `@react-native-community/geolocation` 3.4.0 | BGGeo's `getCurrentPosition` / `watchPosition` |
|---|---|---|
| Architecture | TurboModule **and** legacy (README line 7; `codegenConfig` `RNCGeolocationSpec`) | TurboModule |
| Proven by the sister | same version on 0.88.1, Android emulator, `getCurrentPosition` only | not applicable |
| Response shape | `{ coords:{latitude,longitude,altitude,accuracy,altitudeAccuracy,heading,speed}, timestamp (ms), mocked }`: **same as geolocation-service**, `mocked` on Android (API 18+) and iOS 15+ | `Location` with `coords`, `timestamp` as ISO string, `mock`, `age`, etc.: different shape; every consumer changes |
| Call signature | identical (`success, error, options`), `watchPosition` returns a number, `clearWatch(id)` | promise / `Subscription` |
| Needs the SDK ready/licensed/started | no | yes: `ready()` first; in a release build without a valid key, unknown; and `getCurrentPosition` **persists the sample and the SDK syncs it** unless `persist:false` |
| Works when tracking is stopped (schedule block, user disabled, before login) | yes | the map screens and order-status location checks would depend on the tracking SDK's lifecycle |
| Maintenance | last release 2024-09-01 (3.4.0); community repo | actively released (5.8.2, Oct 2026) |
| Effort | one import line, config at start, unit mocks | rewrite of the hook and 6 consumers, tests |

**Recommendation: `@react-native-community/geolocation` 3.4.0**, wrapped in one module, because it is a near drop-in, independent of the tracking SDK and licence, and already on RN 0.88.1 in the sister. The BGGeo SDK stays the tracker; the foreground library only feeds the UI and the status-change checks.

Concrete migration:

1. `package.json`: remove `react-native-geolocation-service`, add `@react-native-community/geolocation` `3.4.0`. No Podfile or Gradle edit (autolinked; Android pulls `play-services-location:21.0.1`, Gradle resolves the highest).
2. Once at start (e.g. top of `src/DeliveryApp.tsx` or in the new module): `Geolocation.setRNConfiguration({ skipPermissionRequests: true, locationProvider: 'playServices' })`.
   - `skipPermissionRequests: true` is required: the app owns the permission flow (`react-native-permissions`, `BGGeo locationAuthorizationRequest`); by default the library would ask on iOS by itself.
   - `locationProvider: 'playServices'` keeps the fused provider the app has today (default `auto` falls to Android's `LocationManager` unless told otherwise).
3. Replace `import GeoLocation from 'react-native-geolocation-service'` by `import Geolocation from '@react-native-community/geolocation'` in both hook copies (and collapse the two copies into one: the `src/ui` copy returns `timestamp` and `src/hooks` logs `turn_off_gps`; the merged one needs both).
4. **Real defect in the library, matters here**: `watchPosition` in `js/implementation.native.ts` returns `Object.keys(subscriptions).length + 1000`. With several watchers opening and closing (root, map tab, driver map, delivery), ids **collide**: watch A=1000, B=1001, C=1002, `clearWatch(1001)` leaves 2 subscriptions, the next watch gets 1002 and overwrites C's listener; clearing it later removes the wrong one. Also, `startObserving(options)` is called only for the first watcher, so only the first `distanceFilter` applies. Therefore: **one shared watcher** (a module-level singleton or a provider with a counter of subscribers that starts one `watchPosition` on the first subscriber and clears it on the last), exposing the last position to every `useLocation()`; each hook instance subscribes instead of watching. This also removes the JS watch that RootNavigator keeps forever.
5. Fix `if (watchId.current) clearWatch(...)` to `!== undefined` (ids are never 0 here, but it is the right test).
6. Error callback: codes are the standard `PERMISSION_DENIED 1`, `POSITION_UNAVAILABLE 2`, `TIMEOUT 3`; the app only logs them and logs `turn_off_gps`.
7. Tests: swap the three `jest.mock('react-native-geolocation-service')` and the `require(...)` in `Delivery.test.tsx:544,867,901` for the new module, and mock `setRNConfiguration`.

Effort **M**, risk **medium** (the watch collision is the trap; a single shared watcher removes it). If the owner prefers to stay dependency-free of a 2024 release: the alternative is a 30-line native-free wrapper over BGGeo's `watchPosition({persist:false})`, but that couples the map to the licence.

### 2.4 Permissions: `react-native-permissions` 5.4.2 to 5.6.3 (sister: 5.6.3, proven on emulator)

- Calls used: `checkMultiple/requestMultiple(getPermissions())`, `request(permission, rationale)`, `requestNotifications`, `checkNotifications`, `openSettings`, `RESULTS`, `PERMISSIONS.IOS.LOCATION_ALWAYS/LOCATION_WHEN_IN_USE`, `PERMISSIONS.ANDROID.ACTIVITY_RECOGNITION/ACCESS_FINE_LOCATION/ACCESS_COARSE_LOCATION/ACCESS_BACKGROUND_LOCATION`. All remain.
- Release notes read (5.4.3 to 5.6.3): no breaking section. Relevant: **5.5.3** `check(LOCATION_ALWAYS)` now returns `denied` (not `blocked`) when only When-In-Use is granted, because the upgrade can still be requested. The app only compares with `RESULTS.GRANTED` (`areAllPermissionResultsGranted`), so no behaviour change, but `RequestPermissions` copy "grant the background location permission" still applies. **5.5.0** uses the package `exports` field: TypeScript needs `moduleResolution: bundler`. `tsconfig.json` of the driver is the old template with `"module": "commonjs"` and no `extends`; the sister's `extends "@react-native/typescript-config"` (sets `moduleResolution: "bundler"`). Do the same here (also needed for `@react-native-vector-icons/*`, `@react-navigation/*` 7, `react-hook-form` types).
- `ios/Podfile` `setup_permissions([...])` keeps working (sister: `setup_permissions(['AppTrackingTransparency','Notifications'])`).
- Existing defect (not new): `PermissionsContext.tsx:35-37` compares `DeviceInfo.getSystemVersion()` (a **string**, "10") with `=== 10`: Android 10 never takes its branch (it asks only fine location, not background/activity recognition). `>= 11` works by coercion. BGGeo asks its own background-location dialog anyway (`backgroundPermissionRationale`), so this surfaces only on Android 10 devices. Fix with `parseInt`.
- Also `PermissionsContext.tsx:49-54` adds an `AppState` listener in an effect with no cleanup.

Effort **S**, risk **low**.

### 2.5 `react-native-device-info` 10.14 to 15.0.2 (sister: 15.0.2)

- Calls: `getSystemVersion()` (`PermissionsContext.tsx:35`), `getBuildNumber()`, `getBundleId()`, `getVersion()` (`utils/sentry.ts:11-15`). Not imported by the submodule.
- Breaking changes 11 to 15 (CHANGELOG): 11 removes Android `getPhoneNumber` and needs compileSdk 33+; 12 iOS `getUniqueId` becomes per-device; 13 Android `powerStateDidChange` payload; 14 removes the default `getInstanceId` fallback (`play-services-iid`, AD_ID permission); 15 needs compileSdk 34+. None of the four calls is touched; the app's compileSdk is 36.
- `src/types/react-native-device-info/index.d.ts` (`declare module`) hides the package's types: delete it.
- Effort **S**, risk **low**.

### 2.6 What the owner tests on a real moving phone: background location

Why a phone: simulators and emulators have no real motion sensor/activity recognition and no OEM battery management; BGGeo's trip detection (stationary to moving) will sit idle unless forced. On a simulator you can only prove: the app builds, the SDK is configured ("BackgroundGeolocation is configured and ready: true" in the log, `RootNavigator.tsx:621`), `start()`/`stop()` follow login/logout/schedule, and, with a simulated route (iOS Simulator: Features > Location > City Run/Freeway Drive; Android emulator: Extended controls > Location > route, or Features > Location in the toolbar), that HTTP requests reach `POST /users/{id}/locations` (watch them on the API log or a debug proxy). In a debug build call `BackgroundGeolocation.changePace(true)` once to leave "stationary".

Phones: one iPhone on a current iOS (one with a SIM and Low Power Mode available), one Pixel-class Android 14/15, one OEM phone with aggressive battery management (Samsung or Xiaomi). For each, **release** build with the v5 keys (the licence matters here) and **debug** build once.

Short list (the driver has an active order; someone at the API watches the driver's position on the admin map or the log of `/users/{id}/locations`):

1. **First launch, permission flow.** Fresh install, log in as a driver. iOS: grant "While Using" first, then "Always" when asked (and the Motion & Fitness prompt: note whether it appears; see 5.6.0). Android 14+: allow location, the notification permission, then "Allow all the time" (the `backgroundPermissionRationale` dialog; Android 11+ sends the driver to Settings). Expected: the "Background tracking enabled" notification (Android) / blue bar (iOS) appears; positions arrive at the API.
2. **Foreground, walking/driving 5 minutes, screen on.** Positions every ~20-40 s while moving (Android: `fastestLocationUpdateInterval`/`locationUpdateInterval`), every 25 m (`distanceFilter`). The driver map and the map tab follow the blue dot. Check the POST body once and compare it with a v4 request: same fields (`lat`, `lng`, `mock`, `v`, `driver_id`).
3. **Background (home button), screen on, 10 minutes of movement.** Positions keep arriving; the map screens are not needed.
4. **Screen off / phone locked in a pocket, 15 to 20 minutes of movement**, once with the phone on battery and once with Low Power Mode (iOS) or battery saver (Android). Expected: positions keep arriving, possibly sparser. Note any gap longer than 2 minutes.
5. **Stationary, then moving again** (stop 10 minutes, then walk): tracking wakes up on motion.
6. **App killed from the app switcher while on an order.** With today's `stopOnTerminate: true` the expectation is **tracking stops** (and the iOS blue bar disappears). Record it, because the business must know. Reopen the app: tracking resumes by itself after login.
7. **After a reboot** (phone restarted, app not opened): today tracking does **not** resume (`stopOnTerminate: true`). Open the app: it resumes. If the business wants the opposite, that is the setting change of decision 4 above.
8. **No network for 3 minutes (airplane mode, keep moving), then network back.** The SDK stores the samples and uploads them on reconnect (`autoSync`); count the posts that arrive after reconnecting.
9. **Token expired / logout on 401.** Make the API answer 401 (revoke the session): the app logs out **once** (today it may do it several times, see defect 1 of 2.2.2).
10. **Schedule block** (`driver_login_validation` on, outside schedule): tracking stops; when the block ends, it starts. **Logout** stops tracking; **login** starts it without opening the map.
11. **Mock location** (Android developer option, "Select mock location app"): `mock: true` reaches the API (`mock` in the template) and the foreground `mocked` flag is `true` (the "location outdated" and distance checks of statuses 3, 9, 11, 26 still behave).
12. **GPS off / location services off mid-shift**: the app shows the "Mobile location off" alert (`locationAuthorizationAlert`) and logs `turn_off_gps` (`src/hooks/useLocation.tsx` error path). Turn it back on: tracking resumes.
13. **Release build with a wrong or empty key**: record what happens (nothing in the vendor pages says). Do this once, on purpose, before shipping.
14. **Battery**: note the battery drop after one hour of an active shift, on each phone, against the v4 build.
15. **Android merged manifest and iOS device log**: after the first run read the SDK's own log (`BackgroundGeolocation.logger` / `getLog`, or Xcode console) for licence, BGTaskScheduler or permission warnings.

### 2.7 Risks and unknowns of the location stack

- Licence (section 1): commercial terms, iOS key, per-brand keys, white-label clause. Biggest non-technical risk.
- Behaviour of a release build with no/invalid key: unknown (not documented in what I could read).
- iOS Motion & Fitness prompt moved from `start()` to `requestPermission()` in 5.6.0: whether this app's flow still gets the prompt is unverified.
- Whether `TSBackgroundFetch.didFinishLaunching()` in `AppDelegate` is required by v5: unverified.
- iOS: nothing in the sister proves any of this; **Android only on an emulator**.
- The flat-to-compound conversion is mine, from the types package; the vendor's API reference site was not readable (see "What I could not find").
- The JS-side second POST (`updateDriverLocation`) can mask a broken SDK upload in tests; during the verification, disable it in a debug build so that only SDK posts reach the API.

---------------------------------------------------------------------------------------------------

## 3. THE REMAINING LIBRARIES

### 3.1 `react-native-vector-icons` 10.3 (deprecated) to `@react-native-vector-icons/ionicons` + `/material-design-icons` 14.0.0

Today: ONE importer, `src/ui/src/components/shared/Icon.tsx:4-5` (`react-native-vector-icons/Ionicons` and `/MaterialCommunityIcons`, `SETS = { ion, mci }`). Native: `android/settings.gradle:6-7` and `android/app/build.gradle:124,148` (manual project + `fonts.gradle`), `ios/ODelivery/Info.plist` `UIAppFonts` entries `Ionicons.ttf` and `MaterialCommunityIcons.ttf`. Jest mocks `jest/setup.js:11-12`. Type stub `src/types/react-native-vector-icons/index.d.ts`.

Target = the sister's `4f26987` exactly (packages at 14.0.0, imported from `/static`, `iconStyle` instead of `solid` for FA5, which the driver does not use):

- `Icon.tsx`: `import Ionicons from '@react-native-vector-icons/ionicons/static'` and `import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'`. The `name`/`size`/`color`/`style` props are unchanged.
- Android: delete `settings.gradle:6-7` and `app/build.gradle:124` and `:148`. The packages autolink; each package's Gradle copies its `fonts/*.ttf` into assets (`copyFonts` task in the package's `android/build.gradle`).
- iOS `UIAppFonts`: `Ionicons.ttf` stays; `MaterialCommunityIcons.ttf` becomes **`MaterialDesignIcons.ttf`** (the font file of the new package; the pod copies `fonts/*.ttf` as resources).
- Delete `src/types/react-native-vector-icons/index.d.ts` (the packages ship types). Update Jest mocks to `@react-native-vector-icons/ionicons/static` and `.../material-design-icons/static`.
- `tsconfig.json` needs `moduleResolution: bundler` (see 2.4) for the `exports` map.

Glyph names (checked against the glyph maps: v10.3 `node_modules/react-native-vector-icons/glyphmaps/*.json` and the 14.0.0 tarballs, by script `deps/` pkgs):

- Ionicons 1338 names in v10, 1357 in 14: **0 removed**.
- MaterialCommunityIcons 6596 in v10, MaterialDesignIcons 7448 in 14: **19 removed upstream; none is used by the app**. I extracted every string literal in `src` (non-test, non-submodule) that exists in either old map and tested it against the new maps: **0 missing**. The `mci` names the app uses (all present in 14): `circle-medium`, `cloud-sync`, `map-marker`, `package-variant-closed`, `signature-freehand`, `checkbox-marked`, `checkbox-blank-outline`, `eye-off-outline`, `eye-outline`, `phone-outline` (via `OInput` `vertorIcon`, `OInput.tsx:151`), `format-list-numbered` (`PreviousOrders/OrderItem.tsx:203`, `iconSet='mci'`). No `OFab` call uses `materialIcon`, so `globe-sharp`, `car-sport-sharp`, `add`, `remove`, `close`, `chevron-down` are Ionicons (present).
- Dynamic names (`ICONS[variant]` in `ONotice.tsx:16-21`: `information-circle-outline`, `checkmark-circle-outline`, `warning-outline`, `alert-circle-outline`; `StripeConnectAccount`'s `card-outline`, `time-outline`...; `Chat/index.tsx:719-735` `copy-outline`, `call`, `chatbubble-ellipses-outline`; the tab bar's `receipt-outline`, `map-outline`, `chatbubbles-outline`, `person-outline`) were covered by the literal sweep. The `name` that comes from the submodule or the API is not covered by any static check: grep found none.

Proven by the sister: yes (Android emulator; iOS fonts "linked and tested", not seen). Effort **S**, risk **low**.

### 3.2 `react-native-map-link` 2.11 to 3.15.0 (sister: 3.15.0)

- Importer: `DriverMap/index.tsx:3` `getApps({ latitude, longitude, sourceLatitude, sourceLongitude, alwaysIncludeGoogle: true, naverCallerName: 'co.ordering.delivery' })` (`:358-365`); test `DriverMap.test.tsx:6`. The app draws its own sheet from `apps[]` (`app.icon`, `app.name`, `app.open()`).
- 3.15.0 (tarball `lib/index.d.ts`): `getApps({ alwaysIncludeGoogle, appsWhiteList, appsBlackList, appTitles, naverCallerName, ...rest })` exists with the same options; the sister's `1f0a494` message says `showLocation` kept the options its order details pass and that the Info.plist schemes and Android `<queries>` were already there (a one-line bump). I did not find the 3.0.0 release notes (the releases page only listed 3.7.0 and later), so "same call, no change" is from the type declarations only.
- Native: unchanged. `Info.plist` `LSApplicationQueriesSchemes` and the manifest `<queries>` blocks exist (the manifest has **two** `<queries>` elements, lines 13-18 and 77-92: merge them, harmless). Check the new apps the README lists (Neshan, Outmap, DashTag) if the app wants them in the sheet; they need their schemes in `LSApplicationQueriesSchemes`.
- Effort **S**, risk **low**.

### 3.3 `react-native-maps` 1.13.2 to 1.29.11 (sister: 1.29.11, Android emulator only)

Calls the app makes:

- `MapView` with `provider={PROVIDER_GOOGLE}`, `initialRegion`, `zoomTapEnabled`, `zoomEnabled`, `zoomControlEnabled`, `moveOnMarkerPress`, `onTouchStart`, `onRegionChangeComplete`, `ref` (`MapView/index.tsx:182-198`, `DriverMap/index.tsx:406-420`).
- `ref.fitToCoordinates(coords, { edgePadding, animated })` (`MapView/index.tsx:99`, `DriverMap/index.tsx:319-331`), `animateToRegion(region, duration)` (`MapView/index.tsx:112,120`, `DriverMap/index.tsx:302`), `animateCamera({center})` (`DriverMap/index.tsx:282`).
- `Marker` with `coordinate`, `tracksViewChanges`, `title`, `onPress`, children as custom views (`MapPin`) (`MapView/RenderMarker.tsx:79-124`, `index.tsx:218`, `DriverMap:423-449`), `Callout` with `onPress` and a custom React view (`RenderMarker.tsx:99-123`), `markerRef.current.showCallout()` (`:68`) and `markerRef.current.props.coordinate` (`:65-66`).
- Types: `LatLng` (`src/ui/src/types/index.tsx:2`).

What 1.29.11 does with them (read from the tarball `deps/pkgs/maps/package`):
- Peer: `react >= 18.3.1`, `react-native >= 0.76`; podspec iOS **15.1** (the app's deployment target is already 15.1). New architecture: 1.14.0 added support, 1.21.0 Fabric, 1.29.0 iOS Fabric for Google Maps markers/polygons (changelog headings).
- `MapView.animateToRegion(region, duration = 500)`, `animateCamera(camera, {duration})`, `fitToCoordinates(coords, options)` present (`src/MapView.tsx:841-915`); on iOS-Fabric they go through `createFabricMap` commands.
- `MapMarker` is still a **class** with `showCallout()`/`hideCallout()` (`src/MapMarker.tsx:373-419`), so the ref calls survive; `tracksViewChanges` is in the native specs; `props.coordinate` on the instance still works because it is a class component.
- Android `tracksViewChanges` was fixed in 1.24.9, custom marker sizing in 1.23.12; "keep the marker anchored when its content is transformed" in 1.29.2.
- The sister's types note: `MarkerAnimated` children are not in 0.88's `AnimatedProps` types: not an issue here (the driver uses plain `Marker`).

Native migration (sister `74f43cf`):
- **iOS `Podfile`**: replace `pod 'react-native-google-maps'`, `pod 'GoogleMaps', '7.4.0'`, `pod 'Google-Maps-iOS-Utils'` (`Podfile:39-42`) with `pod 'react-native-maps/Google', :path => '../node_modules/react-native-maps'` (brings GoogleMaps 9.4.0 and Utils 6.1.0 in the sister's lock). Keep `GMSServices.provideAPIKey(...)` in `AppDelegate.swift:30` (value not copied here).
- **Android**: delete `app/build.gradle:121-128` (manual `project(':react-native-maps')` with exclude, `play-services-base:18.0.1`, `play-services-maps:18.0.2`, `play-services-location`); maps brings `play-services-maps 19.1.0`, `play-services-base 18.5.0`, `play-services-location 21.3.0`, `android-maps-utils 3.10.0`, `androidx.work 2.9.1`. The manifest `com.google.android.maps.v2.API_KEY` stays.
- Jest mock `jest/setup.js:120-127` keeps working (it exposes `default`, `Marker`, `Callout`, `PROVIDER_GOOGLE`); add `Marker.prototype.showCallout` if the callout effect is tested.

Not proven by the sister: `animateCamera`, `showCallout()` via ref, iOS at all, background-to-foreground map. Verify on a simulator/emulator: map tab with markers and callouts (tap marker, tap callout opens OrderDetails/Orders), `fitToCoordinates` on load, recenter button, driver map follows the user, marker photos appear (the `tracksViewChanges={!imageLoaded}` path). On a phone only: GPS accuracy of the blue dot and smoothness of following.

Effort **M**, risk **medium** (iOS Google maps on Fabric is the youngest part: 1.29.0).

### 3.4 `react-native-image-picker` 4.10.3 to 8.3.0 (sister: 8.3.0)

- Importers: `useStatusImage.tsx:1` (`launchCamera` with `mediaType:'photo', saveToPhotos:true, cameraType:'back', maxWidth/maxHeight:1280, quality:0.8`), `Chat/index.tsx:11` (`launchImageLibrary`, `includeBase64:true`, 2048 px), `UserProfileForm/index.tsx:4` (`launchImageLibrary`, `includeBase64:true`, 200 px). Not imported by the submodule.
- Response shape: **unchanged** in 8.x: `{ didCancel, errorCode, errorMessage, assets: [{ uri, type, fileName, fileSize, width, height, base64, ... }] }` (README of the current version). The app already reads `assets[0]`, so no call-site change is needed for the shape.
- Breaking in the 5.x-8.x line: v8.0.0 converts HEIC to JPEG automatically on Android unless `assetRepresentationMode: 'current'` (good for the status photo, which accepts only png/jpeg, `useStatusImage.tsx:55`). No other breaking entry in 7.2-8.3.1; v5/v6 notes were not on the page I could read.
- Setup: no Android permission by default; the library does not need `CAMERA`; `saveToPhotos` needs `WRITE_EXTERNAL_STORAGE` only on Android 28 and below (the app's minSdk is 29). iOS: `NSCameraUsageDescription` and `NSPhotoLibraryUsageDescription` exist in `Info.plist:67,77`. The new architecture on Android is via `newArchEnabled`, iOS via the normal pod install.
- Existing defect found: `Chat/index.tsx:294-300` and `UserProfileForm/index.tsx:167-172` read `didCancel` and `errorMessage` from `assets[0]` instead of from the response root; on a picker error the user sees nothing (only a `console.log` that never runs). Fix while touching the files.
- Effort **S**, risk **low** (device: camera and gallery open on Android 14/15 and iOS; a HEIC photo uploads as JPEG).

### 3.5 `react-native-webview` 11.26.1 to 14.0.1 and `react-native-signature-canvas` 4.7.4 to 5.1.1

- `react-native-webview` has **no importer** in `src` or the submodule; it is a peer of `react-native-signature-canvas`. Notably, signature-canvas 4.7.4 already declares `peerDependencies: react-native-webview >=13` while the app has 11.26.1: a peer mismatch today. 5.1.1 has the same peer (`>=13`).
- webview 14.0.0 (the one breaking release I could read): Android needs **API 24+** (the app has 29) and legacy file-upload code was removed. Sister: 14.0.1 (used by its reCAPTCHA, payment and help screens; Android emulator).
- signature-canvas importer: `Chat/index.tsx:14`, used at `:540-546` with `ref`, `onOK`, `onEnd`, `webStyle`, `backgroundColor`, and `ref.clearSignature()`/`readSignature()` (`:521,525`). 5.1.1 `index.d.ts` declares all of them (`onOK`, `onEnd`, `webStyle`, `backgroundColor`, `clearSignature`, `readSignature`). Its CHANGELOG for 5.0.1-5.1.1 lists no breaking change; there is no 5.0.0 entry in the file I read. **The sister does not use signature-canvas**: not proven there.
- Verify: open the chat, show the signature pad, draw, send; clear. Android and iOS (the pad is a WebView with injected HTML).
- Effort **S**, risk **low-medium** (WebView on both platforms).

### 3.6 `@react-native-clipboard/clipboard`, `@react-native-community/netinfo`, `@react-native-async-storage/async-storage`

- Clipboard 1.16.3 installed = the sister's 1.16.3. Importers `Chat/index.tsx:10`, `OrderDetails/Delivery.tsx:5` (`setString`). Nothing to do. Effort **S**, risk **low**.
- NetInfo installed 11.5.2 = the sister's. 11.5.0 added new-architecture support, 11.5.1 an iOS new-arch fix. **12.0.0** (Feb 2026) raises iOS to 14+ and changes the Wi-Fi API (needs the NetworkExtension framework): not needed, stay on 11.5.2. Importers: `OfflineActions/index.tsx:2`, `RootNavigator.tsx:16`, `HomeNavigator.tsx:2`, `MyOrders.tsx:2`.
- AsyncStorage installed 2.2.0 = the sister's. The submodule imports it (`native/src/NativeStrategy/index.js`): **keep 2.x** (3.x changes the storage API; latest is 3.1.1). Importers in the app: `providers/StoreUtil.tsx:1`, `src/ui/src/providers/StoreUtil.tsx:1` (two copies), `theme/remote.ts:11`.
- All three: effort **S**, risk **low**.

### 3.7 `react-native-gesture-handler`, `react-native-screens`, `react-native-safe-area-context`

- Pins of the sister (resolved): gesture-handler **2.33.1**, screens **4.30.1**, safe-area-context **5.11.1**. The driver is at 2.28.0 / 4.14.0 / 5.8.0. Latest on npm: gesture-handler 3.5.0 (a new API: not now), screens 4.30.1, safe-area 5.11.1.
- Importers: gesture-handler only in `jest/setup.js:8` (the stack navigator imports it); screens none (navigation peer); safe-area many (`useSafeAreaInsets` in about 25 files, `SafeAreaProvider` in `App.tsx:2`, `SafeAreaView` in `MapView/index.tsx:9`). Same API in 5.8 to 5.11.
- `src/types/react-native-safe-area-context/index.d.ts` is a type stub: check and delete if the package's types are enough.
- Effort **S**, risk **low**.

### 3.8 `react-native-country-picker-modal` 2.0.0 to 3.0.0 (data only: could a static JSON replace it?)

- Importer: `PhoneInputNumber/index.tsx:5`, used only as `getAllCountries(FlagType.EMOJI, 'common')` (`:176`). Flags are drawn by the app's own `CountryFlag` (emoji from `cca2`).
- The sister has **the identical `PhoneInputNumber`** and pins **3.0.0** (peer `react >= 19`, `react-native >= 0.78`, one dependency `fuse.js`); it dropped a 2.0.0 patch (`sister: patches/react-native-country-picker-modal+2.0.0.patch`, removed in `74f43cf`). Same call, same data: proven on the Android emulator.
- Static replacement: yes, it is feasible and small. The library's data is a 76 KB `countries-emoji.json` with 19 language name tables; the app uses only the English common name, `cca2` and `callingCode[]`. A static file `{cca2, name, callingCode[]}` (about 250 rows, 10 KB) plus the already-present `libphonenumber-js` `getCountries()`/`getCountryCallingCode()` gives the same list; the app's `calling.ts` already falls back to libphonenumber-js for codes. Cost: a generation script and ownership of the country names (translation of names is not used today). **Recommendation**: move to 3.0.0 now (zero code change, proven), schedule the static JSON as a later cleanup if the owner wants one dependency fewer.
- Effort **S**, risk **low**.

### 3.9 `@react-navigation/*` 6.x to 7.x (sister: native 7.5.1, stack 7.12.1, bottom-tabs 7.21.0)

Installed: native 6.1.18. Sister's commit `74f43cf` did this with a helper (`sister: src/navigators/appNavigation.ts`) and plain-data params.

Breaking changes (official upgrade guide, https://reactnavigation.org/docs/upgrading-from-6.x/) against this app:

1. **`NavigationContainer theme` must include `fonts`** (`appContainer.tsx:36-47`, `navigationThemeOf` has `dark` and `colors` only). Add `fonts: DefaultTheme.fonts` (or the app's). Without it the tab bar and headers read `theme.fonts` and crash.
2. **`unmountOnBlur` is removed** (`BottomNavigator.tsx:122`, the Profile tab). Replacement: `popToTopOnBlur`, or remount with `useIsFocused` in a `layout`/`screenLayout` wrapper. The Profile page keeps its own focus logic (`pages/Profile.tsx:25-45`: `navigation.getState()` and the `'state'` listener, both still exist).
3. **`navigate` no longer reaches screens inside a nested child navigator**, and **no longer goes back** to an existing screen (pushes; use `popTo`). Hits in this app:
   - `OrderDetails/Delivery.tsx:961` `navigation.navigate('Orders')` and `OrderDetailsLogistic/index.tsx:132` `navigation.navigate('Orders')`: these screens live in `HomeNavigator`'s stack; `Orders` is a **tab inside `BottomTab`** (child navigator). Under 6.x the action fell through to the child; under 7 it will not. Change to `navigation.navigate('BottomTab', { screen: 'Orders' })` or `popTo('BottomTab', { screen: 'Orders' })` (this is the case you want: go back to the tabs rather than stack them). `navigationInChildEnabled` on the container is the temporary switch, removed in the next major.
   - `RootNavigator.tsx:414,420` push-notification opens via `RootNavigation.navigate('OrderDetails'|'OrderDetailsLogistic', ...)` through the container ref (`navigators/NavigationRef.tsx`): `OrderDetails` is in `HomeNavigator` (inside root's `MyAccount`), i.e. a **parent** of the focused navigator when a tab is focused, so bubbling up still reaches it. It will not work when the focused navigator is the root stack (`ScheduleBlocked`, `Splash`), as before. When a different order opens while `OrderDetails` is already focused, 7.x keeps the screen (updates params); decide whether to `push` or give `getId` per order. Sister's `openScreen` routes through `MyAccount` for this.
   - Same-stack calls (`navigate('Sessions')`, `'StripeConnectAccount'`, `'Payouts'`, `'RequestPermissions'`, `'OrderMessage'`, `'OrderDetails'`, `'Login'`, `'Home'`, `'Forgot'`, the tabs' `onNavigationRedirect` in `pages/MapView.tsx:9`, `Messages.tsx:10`, `MyOrders.tsx:21`) keep working; `navigate` to a screen already focused stays.
4. `OrderDetailsLogistic/index.tsx:51` `navigation.replace(...)` exists in 7. `canGoBack()/goBack()` (many) unchanged; `addListener('focus'|'state')`, `getState`, `useFocusEffect`, `useNavigation`, `BottomTabBarHeightContext` (`OModal.tsx:5`, `useFloatingButtonInset.tsx:3`) are all still exported (the guide does not list them as changed).
5. Stack options: the app uses only `headerShown: false` and `animationTypeForReplace`: unaffected. Bottom tabs: `tabBarAccessibilityLabel`, `tabBarLabel`, `tabBarActiveTintColor`, `tabBarStyle`, `tabBarShowLabel`, `tabBarLabelPosition`, `tabBarIcon`, `tabBarButton`, `tabBarItemStyle`: the guide lists renames only for `tabBarTestID` (not used) and removals for `lazy`, `tabBarOptions`, `sceneContainerStyle` (not used).
6. **Params**: `initialParams={{ setTutorial }}` (`RootNavigator.tsx:748`), `route.params.handleChangeOrderStatus` (`pages/AcceptOrRejectOrder.tsx:50`), `route.params.handleClickLogisticOrder` (`pages/OrderDetails.tsx:52`, `OrderDetailsLogistic.tsx:13`) and whole order objects in params are **functions / non-serializable data in navigation state**. They still work, but the sister moved to plain data (`useSendResult`, no function and no SDK model in params), mostly for state persistence and warnings. Priority: **medium-low**, 3 callbacks; do it after the upgrade is green.
7. Types: `src/types/@react-navigation/native/index.d.ts` (`declare module '@react-navigation/native'`, everything `any`) shadows the real types: delete it. Jest: `jest/setup.js:30-70` mocks `@react-navigation/*`; align with the sister's `registerM3NativeMocks`.
8. `@react-navigation/stack` 7 requires `react-native-gesture-handler` and `react-native-screens` 4 (already planned); minimum RN 0.72, TypeScript 5.

Effort **M** (the three `navigate('Orders')` fixes, the theme `fonts`, `unmountOnBlur`, tests), risk **medium** (deep link/push open paths and tab behaviour only show in the app).

### 3.10 `react-hook-form` 6.15.8 to 7.x (sister: 7.91.0; latest 7.92.0)

Five files (importers): `Home/index.tsx:12`, `LoginForm/index.tsx:3`, `UserFormDetails/index.tsx:3`, `ForgotPasswordForm/index.tsx:3`, `UserProfileForm/index.tsx:3`. The submodule does not import it. Sister's diffs (`74f43cf`, `LoginForm`, `ForgotPasswordForm`) show the exact mechanical change:

- `const { control, handleSubmit, errors } = useForm()` becomes `const { control, handleSubmit, formState: { errors } } = useForm<FormValues>()` (`Home:42`, `LoginForm:75` also `clearErrors`, `UserFormDetails:49` also `setValue, watch`, `ForgotPasswordForm:30`, `UserProfileForm:106` where `useForm()` is called **only to read `errors`**: drop it or move to `formState`).
- `render={({ onChange, value }) => ...}` becomes `render={({ field: { onChange, value } }) => ...}` (Home:165, LoginForm:414,466, UserFormDetails:283,308, ForgotPasswordForm:96). `UserFormDetails.tsx:228` `render={() => ...}` (field list driven by `setValue`) keeps working because `Controller` still registers the field; it does not use `field`.
- `onSubmitEditing={handleSubmit(onSubmit)}` passes the RN event to `handleSubmit` (`ForgotPasswordForm:110`, LoginForm at its `onSubmitEditing`); the sister changed these to `() => handleSubmit(onSubmit)()` (Home already does). `onClick={handleSubmit(onSubmit)}` on buttons (`ForgotPasswordForm:141`, `UserFormDetails:398`) should get the same wrapper if `OButton` passes an event.
- `rules`: `required: 'message'`, `pattern: {value, message}`, `validate: fn` are the same in 7. `defaultValue` on `Controller` is still accepted (v7 prefers `defaultValues` on `useForm`; do not bother). `clearErrors([val])` takes an array in 7.
- `watch('password')` returns `undefined` on the first render in v7 (before the Controller registers): `UserFormDetails.tsx:63-64,123` reads `watchPassword.length` inside `onSubmit` (after registration, fine) and `:388` with `?.`; make the first one `(watchPassword ?? '').length` for safety.
- `errors` is `formState.errors`, a proxy that only subscribes when read during render: all five files already read it in render or in an effect keyed on it, which works; `Object.values(errors)` of FieldError objects with `.message` are the same shape.
- Types: `src/types/react-hook-form/index.d.ts` (`declare module`) must be deleted (the package has its own types). TS then requires a `FormValues` type like the sister's `Record<string, string | boolean>`.
- Tests that mock `useForm` return values (search `__tests__` for `useForm`) need `formState: { errors }`.

Effort **S-M**, risk **low-medium** (validation messages and toasts are visible, easy to test in the app: login with empty fields, bad email, passwords not matching on profile).

### 3.11 `moment` to `dayjs` in the app's own files (the dependency stays)

The submodule imports `moment` at `src/@/components/src/components/ProductForm/index.js:3` and `BusinessReservation/index.js:8` (not driver features, but they are in the barrel): `moment` stays in `package.json`. The submodule already extends dayjs with `utc`, `relativeTime`, `updateLocale` (`UtilsContext/index.js:7-14`); the app should `dayjs.extend` what it needs itself. `dayjs` is in the app already (1.11.23; used by `navigators/getDriverScheduleBlockPlan.ts` and tests).

| File:line | Use | dayjs |
|---|---|---|
| `PreviousMessages/index.tsx:137,142` and `PreviousOrders/OrderItem.tsx:95,100` (same code twice) | `moment(x).add(offset,'minutes').format('YYYY-MM-DD HH:mm:ss')`; `moment(d).add(eta,'minutes').diff(moment().utc(),'seconds')` | `dayjs(x).add(...).format(...)`; `.diff(dayjs.utc(), 'second')` (needs `utc`; note dayjs unit is singular or plural both accepted) |
| `NewOrderNotification/index.tsx:151` | `moment.duration(moment().diff(moment.utc(value?.last_driver_assigned_at)))` | `dayjs.duration(dayjs().diff(dayjs.utc(...)))` needs plugins `utc` and `duration` |
| `OrdersOption/index.tsx:129` | `moment(value, SEARCH_DATE_FORMAT).toDate()` | needs `customParseFormat` plugin: `dayjs(value, FORMAT).toDate()` |
| `OrdersOptionDate/index.tsx:14,54` | `moment(value, DATE_FORMAT).toDate()`; `moment(date).format(DATE_FORMAT)` | `customParseFormat`; format tokens equal |
| `shared/OCalendar.tsx:42-127` | `moment(...)`, `.clone().startOf('month')`, `.month()`, `.day()`, `isBefore/isAfter/isSame(x,'day'|'month')`, type `moment.Moment` | all exist in dayjs (`Dayjs` type); `clone()` exists |
| `navigators/RootNavigator.tsx:529` | `moment().format('YYYY-MM-DD hh:mm:s')` | `dayjs().format(...)` (same tokens) |

Dead code: `setLocalMoment` (`ui/src/utils/index.tsx:440`) is used only by its test. Tests that `require('moment')` (`NewOrderNotification.test.tsx:153`, `OrdersOption.test.tsx:462`, `OrdersOptionDate.test.tsx:2`) must follow. Trap: moment parses `'YYYY-MM-DD HH:mm:ss'` leniently and in the **local** zone, dayjs without `customParseFormat` reads ISO strings only: verify the 2 `moment(x)` of the ETA code with real `delivery_datetime` strings (the code has `parseDate` from the submodule feeding it).

Effort **S-M**, risk **low-medium** (time arithmetic: the ETA/late badge).

### 3.12 `styled-components`, `socket.io-client`, `libphonenumber-js`, `uuid`

- `styled-components` installed 6.5.3, `^6.1.0` in package.json, sister resolves 6.5.3 (latest 6.6.0): nothing to do; same API on RN 0.88.
- `socket.io-client` installed 4.8.3 (`^4.8.1`); **only the submodule imports it** (`WebsocketContext/socket.js`): keep as is.
- `libphonenumber-js`: app pins `1.11.19` (Jan 2025 metadata); sister `d48a3b2` moved to **1.13.15** because the old metadata refused number ranges opened since (VE +58 422, TR +90 509, AE +971 53). The app's `PhoneInputNumber/index.tsx:4` and `calling.ts:1-2` (`libphonenumber-js/max`, `/max/metadata`) are the same as the sister's. Move to 1.13.15 (1.13.16 exists as of 2026-11-10). Effort **S**, risk **low**; the submodule imports it too (`^1.9.17`), compatible.
- `uuid` pinned `3.4.0` **because the submodule needs it** (`AddressForm/index.js:5`: `import { v4 } from 'uuid'`; the submodule's own package.json says `^8.3.2`); the driver does not use `AddressForm` at runtime (the import only executes at module load). Newer `uuid` (14.0.3) on React Native needs a `crypto.getRandomValues` polyfill (`react-native-get-random-values`, which the sister imports first in `sister: index.js`); with 3.4.0 it falls back to `Math.random`. Leave 3.4.0 until the submodule is the one changing, or add the polyfill and a current `uuid`. Effort **S**, risk **low**.

---------------------------------------------------------------------------------------------------

## 4. Verification in one view

Simulator / emulator can show (and should, per library):
- Build and launch on both platforms (new architecture): every native library above links.
- Icons: every tab, FAB, input glyph, notice.
- Maps: both map screens, markers, callouts, fit, recenter, the sheet of external map apps (`getApps` lists installed apps: on a simulator only Apple Maps/Google Maps if installed).
- Permissions: the dialogs, "Go to settings".
- Image picker: gallery (add photos to the simulator/emulator), camera is a stub on emulators.
- Chat: signature pad, clipboard copy.
- Forms and navigation flows; the three `navigate('Orders')` fixes; the push-open path via `adb shell am start`/`xcrun simctl push` (a payload that carries `order_id`).
- Location: SDK configured, start/stop by login/logout/schedule, HTTP posts from a simulated route, `changePace(true)`.

Only a real moving phone shows: everything in 2.6 (background, screen off, kill, reboot, OEM battery management, motion permission prompts, licence behaviour in release, battery cost), GPS accuracy, camera capture, and OneSignal/FCM interplay with the foreground service.

---------------------------------------------------------------------------------------------------

## 5. Table

"Proven" = the sister has the same version resolved on RN 0.88.1 and ran it on an Android emulator (debug); **iOS never seen by the sister**; "no" = the sister does not use it.

| Library | Today | Target | Proven by the sister? | Effort | Risk |
|---|---|---|---|---|---|
| react-native-background-geolocation | 4.19.4 | 5.8.2 (compound config, new licence JWT on both platforms) | no (sister has none); v5 is a TurboModule per vendor changelog | L | high |
| react-native-background-fetch | 4.4.2 | remove (v5 does not depend on it; no importer) | n/a | S | low |
| react-native-geolocation-service | 5.3.1 | remove; `@react-native-community/geolocation` 3.4.0 behind one shared watcher | getCurrentPosition only (Android emulator) | M | medium |
| react-native-permissions | 5.4.2 | 5.6.3 | yes (Android) | S | low |
| react-native-device-info | 10.14 | 15.0.2 | yes (Android) | S | low |
| react-native-maps | 1.13.2 | 1.29.11 (`react-native-maps/Google` pod, autolinked Android) | yes (Android; no iOS); not `animateCamera`/`showCallout` | M | medium |
| react-native-map-link | 2.11.4 | 3.15.0 | yes (`showLocation`, not `getApps`) | S | low |
| react-native-image-picker | 4.10.3 | 8.3.0 | yes (Android) | S | low |
| react-native-webview | 11.26.1 | 14.0.1 (peer only) | yes (Android) | S | low |
| react-native-signature-canvas | 4.7.4 | 5.1.1 | no | S | low-medium |
| @react-native-clipboard/clipboard | 1.16.3 | 1.16.3 (no change) | yes | S | low |
| @react-native-community/netinfo | 11.5.2 | 11.5.2 (12 later) | yes | S | low |
| @react-native-async-storage/async-storage | 2.2.0 | 2.2.0 (3.x later; submodule uses it) | yes | S | low |
| react-native-gesture-handler | 2.28.0 | 2.33.1 | yes | S | low |
| react-native-screens | 4.14.0 | 4.30.1 | yes | S | low |
| react-native-safe-area-context | 5.8.0 | 5.11.1 | yes | S | low |
| react-native-vector-icons | 10.3.0 (deprecated) | @react-native-vector-icons/ionicons + /material-design-icons 14.0.0 | yes (Android; iOS fonts tested not seen) | S | low |
| react-native-country-picker-modal | 2.0.0 | 3.0.0 (static JSON possible later) | yes (same component) | S | low |
| @react-navigation/native, stack, bottom-tabs | 6.1.18 / 6.x / 6.x | 7.5.1 / 7.12.1 / 7.21.0 | yes, with a different navigator layout | M | medium |
| react-hook-form | 6.15.8 | 7.91.0 | yes | S-M | low-medium |
| moment (app files) | 2.31.0 | dayjs (+ plugins customParseFormat, duration, utc); moment stays for the submodule | partly (dayjs yes) | S-M | low-medium |
| styled-components | 6.5.3 | 6.5.3 / `^6.1.0` | yes | S | low |
| socket.io-client | 4.8.3 | unchanged (submodule only) | yes | S | low |
| libphonenumber-js | 1.11.19 | 1.13.15 | yes | S | low |
| uuid | 3.4.0 | unchanged (submodule needs it; newer needs the random-values polyfill) | no | S | low |

---------------------------------------------------------------------------------------------------

## 6. What I could not find, or could only partly read

- The vendor's **API reference and setup pages for v5** (docs.transistorsoft.com) were mostly not retrievable: I used the GitHub README, `CHANGELOG.md`, `help/MIGRATION-GUIDE-5.0.0.md`, `help/http.md`, `help/INSTALL-*-AUTO.md`, the package tarball and the types package. The "AUTO" install pages are the older generation of the guide and do not mention v5; the migration guide was read through a summariser, not line by line.
- **What a release build does without a valid v5 key**: not documented in anything I could read.
- Whether v5 requires the `TSBackgroundFetch` call in `AppDelegate`, and whether `UIBackgroundModes: processing` is mandatory.
- Whether `startOnBoot` is ignored with `stopOnTerminate: true` (vendor docs not fetched for it).
- Whether v4.19.4 is supported by the vendor on the new architecture (only v5's TurboModule change is documented).
- The release notes of `react-native-maps` 1.14 to 1.29 beyond commit-style headings; of `react-native-webview` 12 and 13; of `react-native-map-link` 3.0.0; of `react-native-image-picker` 5 and 6; of `react-native-signature-canvas` 5.0.0.
- `react-native-permissions` README (404 on the path I tried): used the release list only.
- Nothing was run: every "works" above is read from types, native files and changelogs.

## 7. Sources (all read as data)

- Vendor: https://github.com/transistorsoft/react-native-background-geolocation (README, `CHANGELOG.md`, `help/MIGRATION-GUIDE-5.0.0.md`, `help/http.md`, `help/INSTALL-ANDROID-AUTO.md`, `help/INSTALL-IOS-AUTO.md`), https://docs.transistorsoft.com/react-native/setup/, https://docs.transistorsoft.com/license/, npm tarballs `react-native-background-geolocation@5.8.2` and `@transistorsoft/background-geolocation-types@5.3.8`, CocoaPods spec `TSLocationManager 4.8.3`.
- https://reactnative.dev/blog/2025/10/08/react-native-0.82 (new architecture only; interop layers kept).
- https://reactnavigation.org/docs/upgrading-from-6.x/
- GitHub releases/changelogs: `react-native-community/react-native-geolocation` (npm 3.4.0 tarball), `react-native-maps/react-native-maps` (CHANGELOG, npm 1.29.11 tarball), `react-native-image-picker/react-native-image-picker`, `react-native-device-info/react-native-device-info`, `zoontek/react-native-permissions`, `react-native-netinfo/react-native-netinfo`, `react-native-webview/react-native-webview`, `includable/react-native-map-link` (npm 3.15.0 tarball), `YanYuanFE/react-native-signature-canvas` (npm 5.1.1 tarball), `oblador/react-native-vector-icons` v14 packages (npm tarballs), `react-native-country-picker-modal@3.0.0` (npm tarball).
- Sister repository (local): `package.json`, `pnpm-lock.yaml`, `docs/theme/verification.md`, commits `74f43cf`, `4f26987`, `d48a3b2`, `1f0a494`.
