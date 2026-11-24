# Driver location module, iOS phase 2

Status (updated for the owner's new mock rule, see "The mock rule" below): built and checked on the iOS simulator (iPhone 17, iOS 27.2 simulator runtime) against the
local API, 2026-11-13. Nothing here has run on a real iPhone. Contract: `docs/LOCATION_MODULE.md`;
core: `ios/DriverLocationCore/README.md` (136 tests green; 130 before the mock rule change).

## What was built

| Piece | File |
|---|---|
| The core as a **local Swift package** of the `ODelivery` target | `ios/ODelivery.xcodeproj/project.pbxproj` (+41 lines: `XCLocalSwiftPackageReference` to `DriverLocationCore`, the product dependency, the `Location` group and two sources). Edited with the `xcodeproj` gem (1.28.1, from the Homebrew CocoaPods), not by hand. No `Package.resolved` is needed for a local package. |
| The TurboModule `DriverLocation` | `ios/ODelivery/Location/RCTDriverLocation.h/.mm`: Objective-C++ over the generated `NativeDriverLocationSpecBase` / `NativeDriverLocationSpec` (`<DriverLocationSpec/DriverLocationSpec.h>`; class name from `codegenConfig.ios.modulesProvider`) |
| The Swift half | `ios/ODelivery/Location/DriverLocationBridge.swift`: a process-wide singleton that owns the `DriverLocationService`, is its only `LocationEventDelegate`, converts the spec's config and events |
| Creation at launch | `AppDelegate.application(_:didFinishLaunchingWithOptions:)` calls `DriverLocationBridge.shared.bootstrap()` (main thread). Nothing starts until JavaScript calls `start()` |
| Info.plist | removed `BGTaskSchedulerPermittedIdentifiers`, the `fetch` background mode, `NSMotionUsageDescription` (and its strings in `InfoPlist.xcstrings` and the four `InfoPlist.strings`). Kept: `location` and `remote-notification` modes, the three location usage descriptions |
| Podfile | unchanged: `setup_permissions` keeps `LocationAccuracy`, `LocationAlways`, `LocationWhenInUse` (they are the permission module's, used by the JS requests) |
| `Podfile.lock` | only the `ReactCodegen` checksum (codegen now includes `DriverLocationSpec`) |

### How it is wired

- `configure(config)`: `url`, `headers` (all values strings, else an error), `extras` (a string stays a string; an
  integral number becomes `.int`, another number `.double`; booleans and other types are rejected),
  `distanceFilter`, `maxQueue`, `discardOlderOnSuccess` go to `Config(...)`; `interval`, `fastestInterval`,
  `notificationTitle`, `notificationText` are ignored (Android). A `ConfigError` rejects the promise with
  code `E_DRIVER_LOCATION_CONFIG` and a text that has no value in it. A second call (new token) goes through the
  core's `configure`, which swaps the headers without restarting the updates.
- `start()` / `stop()` run on the main thread (the `CLLocationManager` lives on that run loop) and resolve with the state.
- `getState()` returns the spec's fields; `authorization` is mapped to the spec's names (`always`,
  `when_in_use`, `denied`, `restricted`, `not_determined`) because the core's raw values
  (`authorizedAlways`, ...) are not the spec's. `lastLocationAt` and `lastHttpStatus` are `null` when unknown.
- Events: the core calls the bridge on its private queue; the bridge hops to its own serial queue and calls the
  attached module's `emitOnLocation/Http/State`. The module attaches in `init` and detaches in `invalidate`/`dealloc`
  (only the module that is attached can detach). A JS reload replaces the module instance, never the service, so
  sending goes on and there is one subscription.
- `isReleaseBuild` is `#if DEBUG` in the bridge. The queue is in `Application Support/DriverLocation` (excluded from backups).
- The generated `ODelivery-Swift.h` also declares `ReactNativeDelegate` (AppDelegate.swift), a subclass of
  `RCTDefaultReactNativeFactoryDelegate`; Objective-C++ cannot take the module import, so `RCTDriverLocation.mm`
  imports `<React_RCTAppDelegate/RCTDefaultReactNativeFactoryDelegate.h>` before the Swift header. Without it the
  build fails with "cannot find interface declaration for 'RCTDefaultReactNativeFactoryDelegate'".

### Spec and core: what could not be honoured or was adapted

- Spec: everything is implemented as written. Nothing was changed in `NativeDriverLocation.ts`.
- Core: no change. Note for the JS wrapper: the **`authorization` string is the spec's** (mapped in the bridge).
- No `onHttp` event is raised for a network error (the core's rule: there was no answer); the state's `lastHttpStatus` stays at the last answer.

## The mock rule (owner's change, applied after the first run)

- **Release builds always drop a simulated position** before the queue and report `mock_rejected`; not configurable.
- **Debug builds, config `rejectMock` false (the default):** a simulated position is accepted and **sent as a real one**: the request
  body carries `"mock":false` (the server ignores `mock:true`, see check 2), while the `onLocation` event to JS still says `mock: true`.
  With **`rejectMock: true`** a debug build behaves like release (dropped, `mock_rejected`).
- The body's `mock` is always `false` (the key stays).
- Core API: `Config.rejectMock` (default `false`, switchable by a later `configure`); `MockPolicy.evaluate(_:rejectMock:)` has three
  outcomes, `.accept` (not simulated, as it is), `.acceptAsReal` (debug, option off: queued and sent with `mock == false`, event keeps
  `mock == true`), `.reject`; `LocationBodyBuilder` always writes `"mock":false`. `swift test`: **136 tests**, 0 failures.
- Spec: `rejectMock: boolean` added to `DriverLocationConfig` (the one allowed edit); the bridge maps it from the generated config.
- Checks 3 and 5 below describe the first run (old rule: `mock:true` sent, proxy rewrite); **check 11 is the re-run with the new
  rule** and supersedes them for the mock behaviour.

## Setup notes (how the checks ran)

- Debug simulator build with the SDK pods **still present** (no conflict: it builds and launches), and a second
  Debug and a Release build with the SDK pods **excluded from autolinking** (temporary `react-native.config.js`
  entries `platforms: { ios: null }` for `react-native-background-geolocation` and `-fetch`, then `pod install`:
  CocoaLumberjack, RNBackgroundFetch, RNBackgroundGeolocation, TSBackgroundFetch are removed and the app builds).
  That temporary config, a Metro alias that stubs the SDK's JS, and the test harness were **not committed**.
- Why the SDK-free build was needed: with the old SDK running (the current `RootNavigator` still starts it) the
  system location arrow stayed on after `stop()`, so the indicator check needs the SDK out of the process.
- The JS wiring is the other branch's. The module was driven by a temporary, uncommitted harness (`dl-harness.js`
  required from `index.js`) that polled a rig on `localhost:8099` for commands (`configure`, `start`, `stop`,
  `getState`, `flush`, `reload`) and posted every event to it. The rig also served a **logging reverse proxy on
  `localhost:8097`** that forwarded to the local API on 8080 and logged each request (the token was never logged; only
  `Bearer ***<length>`). A request counted below is one line of that proxy log, i.e. what the native sender sent.
  Token and driver (id 6) come from the local API's `POST /v400/en/development/auth`; no secret was written in the repo.

## Checks (simulator, Debug unless said)

Evidence lives in the rig logs (not in the repo) and the screenshots in `.theme-audit/screens/location/ios/` (git-ignored).

1. **The module is there.** `TurboModuleRegistry.get('DriverLocation')` is not null (`{"ev":"module","present":true}` logged
   by the harness on every boot, Debug and Release). The app launches without a redbox (`01-launch.png`, `20-final-launch.png`). **Pass.**
2. **The API contract (§5.3).** With `curl` and a driver token: `POST /v400/en/development/users/6/locations`
   with `{"location":{"lat":37.3318,"lng":-122.0312,"mock":false,"v":"1.0"},"driver_id":6}` gave 200 and
   `{"error":false,"result":{"location":{...},"driver_id":6,"effective":true}}`; `GET /users/6?params=location` returned
   exactly `{lat:37.3318,lng:-122.0312,mock:false,v:"1.0"}`; without `location` 400 (`The Location field is required.`);
   bad token 401 (`You do not have permission.`). **Pass.**
   - **Finding about the server:** a body with `"mock": true` is answered 200 but is **not stored** (the response is a bare string
     without `effective`, and the stored position stays as it was). So in a Debug build the API accepts simulated positions
     and ignores them. This matches the owner's rule (a mock position must not count) but means the simulator cannot show
     "stored equals sent" with the native sender.
3. **A native fix reaches the API and is stored** (first run, old rule: `mock:true` sent; superseded by check 11). Because every simulator fix is flagged simulated (see 5), the rig's proxy
   rewrote `mock` to `false` in the forwarded request only (flag `fwd_unmocked`; the logged body is what the app sent).
   App sent `{"location":{"lat":37.40001,"lng":-122.10002,"mock":true,"v":"1.0"},"driver_id":6}` (this key order, compact),
   User-Agent `deliveryApp/1 CFNetwork/...`, `Authorization: Bearer ***`, 200 in 54 ms; `GET /users/6?params=location` then
   returned `{lat:37.40001,lng:-122.10002,mock:false,v:"1.0"}`. Also direct to `localhost:8080` (no proxy): `onHttp {status:200}`
   for each fix. **Pass** (with the stated rewrite).
4. **A simulated route** (`xcrun simctl location <id> start --speed=20 37.4000,-122.1000 37.4270,-122.1000`), one run with phases
   marked in the rig log: foreground 20 s, then Home, then locked (`idb ui button LOCK`): **10 / 16 / 22 posts** in the three
   phases, one about every 2 s, same count as `onLocation` events; the last one 15:37:56, after the lock. Screenshots
   `02-route-foreground.png`, `03-route-home-indicator.png`, `04-route-locked.png`. **Pass** on the simulator, in the three
   states. (The simulator does not suspend the app the way a phone does: see "not verified".)
5. **Simulated flag** (first run). The simulator **does** report these fixes as `isSimulatedBySoftware`: every `onLocation` in Debug has
   `"mock":true`; in the first run every request carried `"mock":true` (now `false`, check 11). **Release** (simulator build, `main.jsbundle`): `start()` plus a route
   and single points gave **no request at all** (rig log has no API line in the phase), **no `onLocation`**, `queued` stays 0, and one
   `onState {"kind":"mock_rejected"}` per fix (about one every 2 s). Screenshot `19-release-build-mock-rejected.png`. **Pass.**
6. **Outage, latest wins.** The proxy was stopped (the url's port is closed: real connection refused, same url, so the owner
   rule does not clear the queue), five fixes were produced with `simctl location set` (lat 37.501 to 37.505), `getState` showed
   `queued: 5`, no `onHttp` (a network error is not an answer). The proxy was started again: the backoff retry (the sender's 60 s step)
   sent **one request with the newest** (`lat 37.505`) 56 s later, `onHttp 200`, `queued: 0`. **Pass.** Not run: the same with
   `discardOlderOnSuccess:false` (covered by the core's tests only).
7. **A JS reload mid-route** (the harness called `DevSettings.reload()` 15 s into a route; boot id changed `fl1r` to `bki0`):
   21 posts in total, 7 events seen by the first runtime and 14 by the second, **no duplicate latitude** in either, the
   largest gap between two posts 2.2 s (no pause), `getState` after the reload shows `tracking: true` with no `configure`
   or `start`. **Pass.**
8. **Invalid token.** During a route `configure` was called with a bad token: the next request answered **401**, one
   `onState {"kind":"unauthorized"}` and one `onHttp 401`; for the next 15 s no further request was made while fixes kept coming
   (`queued` went 0 to 7, then 8). `configure` with the good token (same url) resumed at once: the next request carried the
   newest queued fix (lat 37.4047), the queue emptied (`queued: 0`) and the updates were not restarted. **Pass.**
9. **The system location indicator.** On the simulator it is the arrow next to the clock. Tracking and a fix: arrow present
   (`16-tracking.png`); after `stop()`: gone (`17-stopped.png`; side by side in `18-indicator-during-vs-after-stop.png`; also
   `10-sdkfree-tracking-crop.png` / `11-sdkfree-after-stop-crop.png`). With the old SDK in the process the arrow stayed after
   `stop()` (the SDK's own manager). It shows with the app in the background (`03-route-home-indicator.png`, `06`). The
   blue status-bar pill that a phone draws is not simulated. **Pass** (arrow, not the pill).
10. **No token in logs.** `log show` of the app's process for 40 minutes (206k lines), the Metro log and the rig log: **0**
    occurrences of the token used by the native sender. **Pass** (for that token; not a sysdiagnose or a crash report).

Builds and tests: `swift test` in `ios/DriverLocationCore`: 136 tests, 0 failures (130 before the mock rule change). `xcodebuild -workspace deliveryApp.xcworkspace
-scheme deliveryApp -configuration Debug -destination 'id=<iPhone 17>'`: `** BUILD SUCCEEDED **` (also with the SDK pods
excluded, and Release for the simulator). `npx tsc --noEmit`: 0 errors.

11. **Re-run with the new mock rule** (Debug simulator build, own Metro on 8083, temporary uncommitted harness; Release simulator build).
    The old SDK pods and JS were present in these runs, so a position the old SDK wrote can be told apart: it has **no `mock` key**,
    the native sender always writes `"mock":false`.
    - **Debug, `rejectMock` off, through the proxy in pass-through (`fwd_unmocked:false`, no rewrite):** the app sent
      `{"location":{"lat":37.81234,"lng":-122.51234,"mock":false,"v":"1.0"},"driver_id":6}`, 200; `onLocation` said `mock: true`;
      `GET /users/6?params=location` returned `{lat:37.81234,lng:-122.51234,mock:false,v:"1.0"}`. **Pass.**
    - **Debug, `rejectMock` off, DIRECT to `localhost:8080` (no proxy in the path; 0 proxy lines):** a simulated route
      (`--speed=20 37.9000,-122.6000 37.9270,-122.6000`) gave 13 `onHttp` events, all 200, every `onLocation` `mock: true`; the stored
      position, read every 6 s, followed the route (37.90217, 37.90325, 37.90434, equal to the latest `onLocation` latitude)
      with `mock: false`. **Pass.**
    - **Debug, `rejectMock: true`** (a `configure` on the running sender, same url): a route of 20 s produced **no `onLocation`, no
      request, no `onHttp`, 11 `onState mock_rejected`**, `queued: 0`, and the stored position stayed at the last one (`37.7,-122.7`)
      while the simulated position moved 0.027 degrees. **Pass.**
    - **Release (simulator build), `rejectMock` false:** `start()`, a point and a route: **0 `onLocation`, 0 `onHttp`, 9 `mock_rejected`**,
      `lastHttpStatus` null. The stored position did change in this run, but to a record **without a `mock` key**: written by the
      old SDK's own posting (still in this build), not by the native sender. **Pass** for the module (the native sender sent nothing).
    - Not run again: `rejectMock: true` in Release (the rule says it changes nothing; covered by the core's tests).

## Not verified

- Anything on a real device: the physical-device background lifetime (the simulator keeps the app running regardless), the
  blue status-bar pill, real GPS accuracy and battery, the system's own location pauses, Low Power Mode.
- `discardOlderOnSuccess: false` end to end on the simulator; the app killed with a queue and relaunched (queue read from disk,
  "latest wins" restart); file protection with the phone locked (`completeUntilFirstUserAuthentication` needs a device).
- Authorization changes (Always to While Using / Never) and Location Services off: the bridge forwards the core's
  `authorization_changed` / `services_*` events, which the core tests cover; not driven on the simulator.
- "Sends without JavaScript" is by construction (the sender is native; the reload test shows requests continue while the JS
  runtime is replaced), but on the simulator JS also keeps running in the background, so a suspended JS thread was not seen.
- The app's own JS wiring (`src/native/driverLocation.ts`, the tracking hook, `RootNavigator`): not part of this branch.
- A sysdiagnose / crash report scan for the token.

## For whoever merges this with the JavaScript side

1. After the JS dependencies `react-native-background-geolocation` and `react-native-background-fetch` leave `package.json`,
   run `pnpm install` and then **`cd ios && pod install`** (Homebrew's `pod`): the SDK pods disappear and `Podfile.lock` changes. No
   `react-native.config.js` entry is needed (none is committed on this branch).
2. The first build resolves the local package by itself (File > Packages is not needed). Nothing else in Xcode.
3. Do not build **Release** in a working copy and then Debug without a `pod install` in between: React Native's prebuilt
   `React-Core-prebuilt` script swaps the `React.framework` in `ios/Pods` for the current configuration's flavor, and a Debug
   build against the Release flavor fails to link (`Sealable::Sealable()` and other `facebook::react` symbols undefined).
   `rm -rf ios/Pods && pod install` restores it.
4. In JS use the spec's `authorization` strings. A 401 gives one `unauthorized` event and the sender stops, keeps the queue and resumes
   with `configure` (same url, new token).
5. The JS `updateDriverLocation()` POST on every touch and `onHttp` can be removed: the native sender made every request in
   these checks.

## For the owner, on a real iPhone

Same build with the JS wiring merged, "Always" authorization granted, a driver on shift:

- [ ] A real route, app in the foreground, in the background and the phone locked: positions keep reaching the API (check the
      driver's position on the dispatch map); the blue status-bar pill shows while tracking and goes after the shift ends.
- [ ] **20 minutes locked, in the pocket, walking or driving**: no gap beyond the distance filter; note the number of positions.
- [ ] **Low Power Mode on**: the same 20 minutes.
- [ ] **Kill the app** (swipe it away): tracking stops (as today: no `startOnBoot`); relaunch and log in: it starts again; a queue
      left on disk is sent (the newest only, "latest wins").
- [ ] **A call, or another app using location** (navigation, Maps): tracking continues after it; the pill is not lost.
- [ ] **Airplane mode for 3 minutes, then off**: one request with the newest position, no replay of the outage.
- [ ] Change the permission in Settings (While Using, Never) and switch Location Services off: the app's dialogs show and tracking
      reacts.
- [ ] A token revoked on the server: one logout, the sender stops.
- [ ] **Battery after one hour** of an active shift, against the same hour on the build with the old SDK (the stationary mode of the
      SDK is not copied; a fix every 25 m while moving, none while still).
