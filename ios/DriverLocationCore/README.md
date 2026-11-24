# DriverLocationCore

The core of the iOS side of the driver app's own location module (`docs/LOCATION_MODULE.md`,
which replaces `react-native-background-geolocation`). A standalone Swift package, no
third-party dependency, no React Native: Foundation, CoreLocation and Network, plus UIKit in one file (`DeviceSignals.swift`, behind `#if canImport(UIKit)`: the app's background / foreground notifications).
It builds and tests on macOS (`swift test`) and builds for iOS (15+).

Phase 1 (this package) is the logic and its tests. Phase 2 (below) wires it into the app
target and the React Native bridge; the core is designed so that wiring is thin glue.

## What is in it

| File | What it does |
|---|---|
| `LocationFix.swift` | `LocationFix` (lat, lng, accuracy, speed, timestamp, mock) and its validity rules |
| `LocationBody.swift` | `LocationBodyBuilder`: the request body, byte for byte; `sendLocationAt` adds `location_at` |
| `LocationAt.swift` | `LocationAt.format(_:)`: the `location_at` text, UTC, `YYYY-MM-DD HH:mm:ss`, integer arithmetic only (no `DateFormatter`, locale, calendar or zone is read) |
| `MockPolicy.swift` | the mock rule: three outcomes (`reject`, `accept`, `acceptAsReal`), see below (`isReleaseBuild` is injected; `rejectMock` comes from `Config`) |
| `Backoff.swift` | 5 s, 15 s, 60 s, then every 60 s; `reset()` on success |
| `Config.swift` | `Config` with validation (url, headers, extras, `distanceFilter`, `maxQueue`, `discardOlderOnSuccess`, `rejectMock`, **`minSendIntervalMs`** (0, off, to 3 600 000), **`sendLocationAt`** (false), **`eventsUrl`** (nil = the events recorder is off), `eventsOwner`) |
| `LocationQueue.swift` | persisted, bounded queue with a sequence number per fix; tolerant of corrupt files |
| `HTTPTransport.swift` | `HTTPTransport` protocol and `URLSessionTransport` |
| `Scheduler.swift` | `Scheduler` protocol (wall `now`, MONOTONIC `monotonic`, delayed work) and `DispatchScheduler` (`CLOCK_MONOTONIC_RAW`, `DispatchWorkItem` timers) |
| `LocationSender.swift` | the state machine: queue, send, retry, 401 stop |
| `LocationTracker.swift` | the CoreLocation adapter, behind the `LocationManaging` protocol |
| `SystemLocationManager.swift` | the real `CLLocationManager` behind that protocol |
| `Connectivity.swift` | `NetworkPathMonitor` (`NWPathMonitor`: `onRestored` and `onChange(online, networkType)`), the pure `PathTransitionDetector`, `ConnectivityTracker` and `NetworkTypeMapper` |
| `Events.swift` | `LocationEventDelegate`, `StateKind`, `LocationState`, `LocationAuthorization` |
| `DriverLocationService.swift` | everything wired: this is what the bridge talks to (it also owns the events recorder) |
| `TrackingEvent.swift` | the events (2026-11-19): `EventNames`, `TrackingReasons`, `TrackingEvent` (+ `toJson()`, the contract's JSON), `EventJson.body` |
| `EventQueue.swift` | `EventQueue`: the persisted, capped (500) queue of events, `tracking-events.queue` / `.owner` |
| `EventSender.swift` | `EventSender` (the events lane of the sender) and `EventsListener` (the log hooks) |
| `RecorderStore.swift` | `RecorderState`, `PermissionState`, `RecorderStore` (`FileRecorderStore`, `MemoryRecorderStore`): what the recorder keeps between runs, `tracking-events.state` |
| `TrackingRecorder.swift` | `TrackingRecorder`, `DeviceSnapshot`, `TrackingSignalSink`: from OS signals to stamped events |
| `DeviceSignals.swift` | `DeviceSignalSource` / `SystemDeviceSignals`: app in background / foreground and Low Power Mode, registered at `start`, removed at `stop` |

### The request

`POST {root}/users/{id}/locations`, `Content-Type: application/json`,
`Authorization: Bearer <token>` (the headers come from `Config`), body (compact, this key order):

```json
{"location":{"lat":37.3318,"lng":-122.0312,"v":"1.0"},"driver_id":42}
```

With `Config.sendLocationAt` (default false) one key is added at the top level, right after `location`:
`{"location":{...,"v":"1.0"},"location_at":"2026-11-19 14:03:07","driver_id":42}`, the time the fix was TAKEN (`CLLocation.timestamp`, not the
time of sending), UTC; off, the body is the one above, byte for byte.

There is no `mock` key (the owner's decision of 2026-11-17: the API stores a position without it): a simulated fix is dropped
or converted by `MockPolicy` before the body is built, and the builder never writes anything about it.

`location` is a JSON object; the extras of `Config` sit at the root, beside it, sorted by key.
Numbers are plain decimals (shortest round-trip, no exponent, no locale). This is the shape
checked against the local API. There is no option to change it.

### The sender's rules

- A fix is queued first (persisted), then sent; one request per fix.
- Two modes, `Config.discardOlderOnSuccess` (default **true**, switchable at run time):
  - `true`, "latest wins": the sender always attempts the **newest** queued fix. A 2xx removes that
    fix and every older one; fixes that arrived during the request are newer and stay (the newest of
    them goes next). A retry picks the newest fix at that moment. A fix older than the last one sent
    successfully is dropped on arrival (never back in time; kept for the life of the process, across
    `stop()` / `start()`). Positions are never sent out of order and an outage is not replayed.
  - `false`: first in first out, the whole route in order.
  - The order is the arrival order (a persisted, monotonic `seq`), never a comparison of timestamps
    of queued fixes.
- **Minimum send interval** (`Config.minSendIntervalMs`, default 0 = off): a floor between the START of two requests, on
  `Scheduler.monotonic`; a retry is a request. Inside the interval nothing is sent: the fixes stay queued and a timer (the
  scheduler's, the one the backoff uses; not the next fix) makes the request when it elapses, with the newest fix of that moment
  in "latest wins" (one per interval, oldest first, with the option off). The backoff, a new fix, `connectivityRestored()` and
  `flush()` go through the same gate (a retry goes out at the later of the backoff and the interval); `stop()` and a 401 cancel the
  timer; `configure` with another interval re-computes a waiting send. The delegate hears `onSendDeferred(delay:queued:)` once per
  wait. In the background the timer is only as good as the process: see `docs/LOCATION_MODULE.md`, "Two send options".
- 2xx: removed. Network error (no `onHttp` event: there was no answer), 5xx, 408, 429: kept, retried by the
  backoff, and at once on `connectivityRestored()`, `flush()` or a new fix. Any other 4xx, 1xx and 3xx:
  that fix is dropped and sending goes on (redirects are never followed).
- 401: sending stops, the queue stays, `unauthorized` is reported once; `updateHeaders` (or `configure`)
  with headers that differ from the rejected ones resumes it. Equal headers change nothing.
- Nothing is sent before `configure` + `start` or after `stop`. A fix arriving while not started is ignored.
  `stop()` keeps the queue on disk; the next `start()` sends what is left.
- A queue filled for another endpoint (another driver id) is cleared by `configure`.
- **The mock rule** (a fix the platform says is simulated, `isSimulatedBySoftware`), `MockPolicy.evaluate(_:rejectMock:)`:
  - **Release builds always drop it** before the queue and report `mock_rejected`, whatever `Config.rejectMock` says.
  - **Debug builds, `rejectMock == false` (the default)**: `.acceptAsReal`: it is queued and sent **as a real one**
    (the body has no `mock` key, so nothing tells the server; otherwise a developer could not see simulator positions), and the
    accepted-location event still reports `mock == true` (the truth).
  - **Debug builds, `rejectMock == true`**: dropped and reported like release, to try the production behaviour in debug.
  - A fix that is not simulated is never affected (`.accept`).
  - `rejectMock` is part of `Config` and can be switched by a later `configure`.
- The token is never logged, and error values never contain headers, URLs or the token.
- **Log hooks**: the core never logs; the delegate also hears `onRequest(body:queued:)`, `onRetryScheduled(delay:status:queued:)`,
  `onDiscarded(count:)` (a bare number, only when a success dropped older positions in "latest wins"; nothing goes to JavaScript)
  and `onNetworkRestored()` (all four have empty defaults). The app's bridge turns them into `os.Logger` lines
  (docs/LOCATION_MODULE.md, "Logs").

### Tracking events (2026-11-19)

The Swift half of the contract in `docs/LOCATION_MODULE.md`, "Tracking events", a port of the Kotlin core (same names, same rules, same tests).
It is off unless `Config.eventsUrl` is set (`POST {api}/tracking_events`).

- **Recorder** (`TrackingRecorder`): the platform layer maps each OS signal to one call (`gps(on:)`, `connectivity(online:networkType:)`,
  `batterySaver(on:)`, `appForeground(_:)`, `permission(_:)`, `mock(provider:)`, `heartbeat()`); `start(owner:reason:device:)` and
  `stop(reason:)` open and close the session. Events exist **only between `tracking_started` and `tracking_stopped`**. `occurred_at` is the
  wall clock at detection (`LocationAt`), `duration_ms` of a closing event is the monotonic difference from the opening's detection to
  the closing's when this process saw the opening, else the two persisted wall times. The four boolean conditions (location services,
  connection, Low Power Mode, background) are debounced 2 s: a change undone inside the window yields no pair; the event keeps the
  detection time. A session left without a clean stop (the persisted `active` flag, the heartbeat written on each fix, at most every
  15 s, and by a 60 s timer) is reported at the next `start` as `tracking_stopped` (`system`, `occurred_at` = the heartbeat) then
  `tracking_started` (`restart`); a session of another owner (other driver or url) is none of ours. At the start: what the server cannot
  know is sent once (Low Power Mode already on, services off, no connection; a changed authorization from the persisted one);
  `closeOrphan` reports the owed stop when nothing will start (`DriverLocationService.stop` with no session running: the JS reason, e.g.
  `permission`, then the authorization change).
- **Queue** (`EventQueue`): one JSON line per event (`{"seq":1,"json":"{...}"}`) in `tracking-events.queue`, capped at 500 (the oldest are
  dropped, `onEventsDropped(count:why:"queue full")`), never holding the token (its events carry no url); the owner (`Config.eventsOwner`: the positions' url,
  which holds the user id, a newline and the events url; no token) is in `tracking-events.owner`: another owner clears the queue and the recorder's state.
- **Sender** (`EventSender`, the second lane of `LocationSender`): `POST` `{"events":"[{...},{...}]"}` (the array written as ONE JSON STRING, like `JSON.stringify({ events: JSON.stringify([...]) })`: the form every API version accepts; at most 100, oldest first; the queue keeps each bare event JSON) with
  the SAME headers as the positions, through the same transport, scheduler and queue; one batch per task, so a position is never behind more than
  one events request, and the lane never starts a request while a position request is in flight. 2xx removes the batch; only 401 stops the
  lane, keeps the queue and reports `unauthorized` once per set of headers (shared with the positions' 401, whichever lane sees it first; only while tracking; the service records `session_revoked` first);
  403 ("this endpoint refuses these events") and any other 4xx drop that batch with a log line (`http 403`), the lane keeps working and nobody is signed out; network error, 5xx, 408, 429 keep it and retry with the backoff, at once on a restored
  connection or a new event; a `Retry-After` in seconds on a 429 / 503 is honoured when longer (at most 5 minutes). It works whether or not the positions are started (the stop's own event is sent after the stop), and the positions' sender pumps this lane at the end of EVERY outcome of a position request but a latched 401, so an event appended while a request was in flight is never left behind.
- **Detectors**: `LocationTracker.signals` (services, authorization and precision via `PermissionMapper`, a simulated fix, a heartbeat per batch of
  fixes); `NetworkPathMonitor.onChange` (`stop()` forgets the last reading and `current` is nil until the first one: "not known yet" is `DeviceSnapshot.online == nil`, no event; type: `wifi`, `cellular`, else `other`; offline = the last type seen, `none` if never);
  `SystemDeviceSignals` (`didEnterBackground` / `willEnterForeground`, `NSProcessInfoPowerStateDidChange`); all registered at `start`, removed at `stop`.
- **Log hooks** (`EventsListener`, the bridge writes the lines): `event <name> queued=N`, `events request n=N queued=M`, `events http S n=N`,
  `events retry in N ms (network error|http S) queued=M`, `events dropped N (queue full|http S)`.

### Threading

One private serial queue inside `LocationSender`. Every public method may be called from any thread;
`state()` may be called from inside a delegate callback. Delegate callbacks run on that queue: hop to
another queue before touching React Native or UI.

## Run the tests

```bash
cd ios/DriverLocationCore
export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer
swift test                                   # macOS 12+, no simulator, no network, no GPS
swift test --filter LatestWinsTests          # one suite
xcodebuild -scheme DriverLocationCore -destination 'generic/platform=iOS Simulator' build   # iOS compile check
```

The tests use fakes for every outside thing: `FakeTransport` (scripted answers, held completions),
`ManualScheduler` (deterministic timers and clock), `FakeManager` (the `CLLocationManager` stand-in)
and `URLProtocol` stubs for `URLSessionTransport`. The queue tests use a temporary directory.

Not covered by `swift test` (it needs a device or the simulator): the real `CLLocationManager`
behaviour, `CLLocation.sourceInformation?.isSimulatedBySoftware == true` (a hand-built `CLLocation`
cannot carry it), file protection on an iOS file system, and background execution.

## Phase 2: wire it into the app (checklist)

Do this when the React Native upgrade has landed and the app builds again. Nothing here is done yet.

### Add the package

- [ ] Add `ios/DriverLocationCore` to the app as a **local Swift package** (Xcode: File > Add Package
      Dependencies > Add Local...; link the `DriverLocationCore` library to the `ODelivery` target).
      The Xcode project and the Podfile are edited only in this step. If a local package does not
      fit the CocoaPods setup, the fallback is a `DriverLocationCore.podspec` over `Sources/`
      (same files, no change to them).
- [ ] The deployment target of the app is >= iOS 15 (the package needs it for `sourceInformation`).

### Info.plist and project settings

Keep:

- [ ] `UIBackgroundModes` with **`location`**. Without it `allowsBackgroundLocationUpdates = true`
      raises an exception at start. Keep `remote-notification` (push).
- [ ] `NSLocationWhenInUseUsageDescription`, `NSLocationAlwaysAndWhenInUseUsageDescription`
      (and `NSLocationAlwaysUsageDescription`), with real, translated texts.
- [ ] The permission requests stay in `PermissionsContext` (the core never requests them).
      The "Always" authorization is what lets tracking go on with the screen off.

Go with the old SDK (after `react-native-background-geolocation` and `-fetch` leave `package.json`
and `pod install` has run):

- [ ] `BGTaskSchedulerPermittedIdentifiers` (`com.transistorsoft.fetch`).
- [ ] The `fetch` entry of `UIBackgroundModes`, if nothing else uses it (check OneSignal / Firebase first).
- [ ] `NSMotionUsageDescription` (the physical-activity permission is no longer requested).
- [ ] The pods `RNBackgroundGeolocation`, `RNBackgroundFetch`, `TSBackgroundFetch` (gone by themselves
      once the JS dependencies are removed); the `LocationAccuracy` / motion bits of `setup_permissions`
      only if nothing else needs them.
- [ ] Review `PrivacyInfo.xcprivacy`: the precise-location collection entry stays; entries that only the
      old SDK needed can go.

### Where the tracker lives

- [ ] Create one `DriverLocationService` in `AppDelegate.application(_:didFinishLaunchingWithOptions:)`
      (not in the `SceneDelegate`, not in a React Native module's `init`) and keep it in a property of the
      app delegate / a process-wide singleton: it must live as long as the process. Create it on the main
      thread (`SystemLocationManager` needs a run loop). The `location` background mode keeps the process
      alive while updates are running and the app is in the background.
- [ ] `DriverLocationService(queueDirectory:isReleaseBuild:manager:)` with:
      `queueDirectory` = `Application Support/DriverLocation` (inside the app container, not `Caches`),
      `isReleaseBuild` = `#if DEBUG false #else true #endif`, `manager` = `SystemLocationManager()`.
- [ ] `stopOnTerminate` is true by design: nothing to do at launch except create the object; tracking
      starts only when JavaScript calls `start()`.

### The React Native TurboModule

- [ ] `src/native/NativeDriverLocation.ts` (codegen spec) and `src/native/driverLocation.ts` (the only
      importer), as in `docs/LOCATION_MODULE.md` §2.
- [ ] `ios/ODelivery/Location/RCTDriverLocation.mm` (Objective-C++, `RCT_EXPORT_MODULE(DriverLocation)`,
      conforming to the generated `NativeDriverLocationSpec`) calling a small Swift `@objc` class,
      `DriverLocationBridge`, that owns the reference to the service and conforms to `LocationEventDelegate`.
      The core stays free of `@objc`.

| JavaScript | Core |
|---|---|
| `configure(config)` | build `Config(url:headers:extras:distanceFilter:maxQueue:discardOlderOnSuccess:rejectMock:minSendIntervalMs:sendLocationAt:)` (a `ConfigError` rejects the promise; its text has no values), `service.configure(_:)`, resolve with the state. A second call with a new token only swaps the headers (no restart of the updates). `interval`, `fastestInterval`, `notification` are Android only: ignore. Extras: an integral `NSNumber` becomes `.int`, another number `.double`, a string `.string` |
| `start()` / `stop()` | `service.start()` / `service.stop()` |
| `getState()` | `service.state()` as a dictionary: `enabled`, `tracking`, `queued`, `lastLocationAt` (ms, or null), `lastHttpStatus` (or null), `authorization` (the raw string), `servicesEnabled` |
| `flush()` | `service.flush()` |
| `onLocation` | `onLocationAccepted(_:)` (`lat`, `lng`, `accuracy`, `speed`, `timestamp` in ms, `mock`) |
| `onHttp` | `onHttp(success:status:)` |
| `onState` | `onState(_:)` with `StateKind.rawValue` (`mock_rejected`, `unauthorized`, `authorization_changed`, `services_disabled`, `services_enabled`) |

- [ ] Delegate callbacks arrive on the core's private queue: hop to the module's method queue before
      emitting events to JavaScript. One delegate (the bridge) for the whole process; the JS side keeps
      one subscription (the fix for the duplicated listeners).
- [ ] On a 401 the JS side logs out: it calls `stop()`; the queue stays on disk and is cleared when another
      driver's `configure` arrives (the endpoint changes).
- [ ] Remove the JavaScript `updateDriverLocation()` POST once the native sender is proven.

### What to check on a simulator (before anything is called done)

Record each result with the build in `docs/theme/verification.md`.

Use `xcrun simctl location booted ...` (`set <lat>,<lng>`, `start --speed=<m/s> --distance=<m> <lat>,<lng> <lat>,<lng> ...`,
`run <scenario>`, `clear`). A simulator location may be reported as simulated by software: in a
**release** build the policy then drops every fix (that is the expected result of the policy, and a good
check of it); run the route checks with a **debug** build (fixes sent without a `mock` key, the event saying `mock: true`; with `rejectMock: true` nothing is sent) and run the release
build once to see `mock_rejected` and nothing sent.

- [ ] The first fix arrives: `queued` goes up and down, the local API stores the driver position equal to
      the `location` object sent.
- [ ] A route (`simctl location start`) with the app in the foreground, in the background (Home) and
      with the screen locked: positions keep arriving; the blue location indicator shows.
- [ ] Network off for 3 minutes, then on: with `discardOlderOnSuccess: true` one request with the newest
      position arrives and the queue is empty; with `false`, the whole queue arrives in order.
- [ ] Kill the app while offline with queued fixes, relaunch, start: the queue on disk is sent
      (the newest in "latest wins"). A locked simulated phone can still write the queue (file protection
      `completeUntilFirstUserAuthentication`; this needs a real device to be fully proven).
- [ ] The JavaScript bundle reloaded mid-route: sending goes on.
- [ ] Token revoked (change it on the server): one `unauthorized`, sending stops, the app logs out; a new
      login with the new token resumes without restarting the updates.
- [ ] Authorization changed in Settings (Always to While Using / Never) and Location Services off: the
      matching `authorization_changed` / `services_disabled` events arrive and the app's dialogs show.
- [ ] `allowsBackgroundLocationUpdates` does not crash at start (the `location` background mode is present).
- [ ] No token in the Xcode console, in the sysdiagnose log, or in any crash report.
- [ ] A real iPhone, by the owner: the same list on a real route, plus one hour of an active shift and the
      battery drop against the build with the old SDK (the stationary mode of the SDK is not copied).
