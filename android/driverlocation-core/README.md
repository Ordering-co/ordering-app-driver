# driverlocation-core

The pure, platform-independent core of the driver app's own Android location module
(`docs/LOCATION_MODULE.md`, which replaces the licensed background-geolocation SDK).
A plain **Kotlin/JVM library**: no Android SDK, no React Native. It holds every rule of
the contract (§3) and is unit-tested on the JVM; the Android `Service`, the fused
location client and the React Native bridge (phase 2) are thin glue over it.

Package `co.ordering.driver.location`. Dependencies: Kotlin stdlib only (tests: JUnit 4).
It also compiles inside the Android app module: plain Kotlin, Java 17 target, only
`HttpURLConnection`, `java.io.File`, `java.util.concurrent`.

## Run the tests

Standalone, with the repo's wrapper and a JDK 17 (the module is not part of
`android/settings.gradle`, so it does not need the React Native build):

```bash
export JAVA_HOME=$(ls -d ~/.gradle/jdks/eclipse_adoptium-17-aarch64-os_x.2/*/Contents/Home | head -1)
cd android/driverlocation-core
../gradlew -p . test            # add --no-daemon if another Gradle build is running
```

Needs network the first time (Kotlin plugin, JUnit from Maven Central). The HTTP transport
test starts a throw-away `com.sun.net.httpserver` on 127.0.0.1; nothing external is touched.

## What is in it

| Class | Role |
|---|---|
| `LocationFix` | lat, lng, accuracy, speed, timestamp, mock; `isValid` |
| `BodyBuilder` | the request body, byte for byte (below); `sendLocationAt` adds `location_at` |
| `LocationAt` | `format(epochMs)`: the `location_at` text, UTC, `YYYY-MM-DD HH:mm:ss`, integer arithmetic only (no locale, calendar or zone is read) |
| `MockPolicy(releaseBuild)` | `decide(fix, rejectMock)`: release always drops a mock fix (`mock_rejected`); debug with `Config.rejectMock` drops it too; debug without it (default) accepts it **as a real one** (`ACCEPT_AS_REAL`: queued with `mock = false`; the accepted-location event keeps `mock = true`; the body never has a `mock` key); a non-mock fix is never affected. `rejectMock` is a `Config` field, switchable with `updateConfig` |
| `LocationQueue` / `FileLocationQueue(dir, maxQueue)` | persisted, ordered by sequence number (`peekFirstEntry`, `peekLastEntry`, `remove`, `removeThrough`, `claim(url)`), oldest dropped over the bound, survives restart, tolerates truncated / corrupt files (CRC per line) |
| `Backoff` | 5 s, 15 s, 60 s, then 60 s; `reset()` |
| `HttpTransport` / `HttpUrlConnectionTransport` | POST JSON, timeouts, no token in reasons; `HttpResult.Response(status)` or `NetworkError(reason)` |
| `Scheduler` / `ExecutorScheduler` | the sender's MONOTONIC clock (`nowMillis`, differences only; `ExecutorScheduler(clock = ...)`, the app passes `SystemClock.elapsedRealtime`) and single worker; its timers are plain executor delays, no wake lock (tests inject a manual one) |
| `Config` | validated settings (`url`, `headers`, `extras`, `distanceFilter`, `interval`, `fastestInterval`, `notification`, `maxQueue`, `discardOlderOnSuccess`, `rejectMock`, **`minSendIntervalMs`** (0, off, to 3 600 000), **`sendLocationAt`** (false), **`eventsUrl`** (null = the events recorder is off)); `withHeaders` / `withDefaultHeaders` carry them; `eventsOwner` names the driver + endpoint an events queue belongs to; `toString` never prints header values |
| `TrackingEvent`, `EventNames`, `TrackingReasons`, `EventJson` | one tracking event as the API wants it (`uuid`, `event`, `occurred_at` via `LocationAt`, `duration_ms`, `data`), its compact JSON in the contract's key order, the names and reasons the contract allows, and the body `{"events":"[...]"}` |
| `EventQueue` / `FileEventQueue(dir, max = 500)` | the events' persisted queue (`tracking-events.queue`, one CRC'd line per event, oldest dropped over the cap, `claim(owner)` clears it for another driver or endpoint, never holds the token) |
| `EventSender`, `EventsListener`, `EventsSetup` | the events lane of the sender (batches of at most 100, oldest first, same headers and transport as the positions, 2xx removes, 401 latches and reports once, 403 and any other 4xx drop that batch, network / 5xx / 408 / 429 retry with the backoff); `LocationSender(events = EventsSetup(queue, listener))` turns it on |
| `TrackingRecorder`, `DeviceSnapshot`, `PermissionState`, `RecorderStore` / `FileRecorderStore` / `MemoryRecorderStore`, `RecorderState` | the events recorder: the platform layer maps each OS signal to one call (`start`, `stop`, `gps`, `connectivity`, `batterySaver`, `appForeground`, `permission`, `mock`, `heartbeat`, `closeOrphan`, `cancel`); it stamps (wall clock at detection, monotonic or persisted wall durations), debounces 2 s, rate-limits the mock event, and detects a stop by the system from a persisted heartbeat |
| `LocationSender` | the state machine: queue, send in order, retry, 401, events, `state()` |
| `SenderListener`, `StateKind`, `SenderState` | events and snapshot. Besides `onHttp` / `onLocationAccepted` / `onState`, the listener hears what the platform layer writes as log lines (the core itself never logs): `onRequest(body, queued)`, `onRetryScheduled(delayMs, status, queued)` and `onDiscarded(count)` (a bare number, only when a success dropped older positions in "latest wins"; nothing goes to JavaScript) |

The request: `POST <url>` with `Authorization: Bearer <token>` (from `Config.headers`),
`Content-Type: application/json`, and exactly

```
{"location":{"lat":19.432608,"lng":-99.133209,"v":"1.0"},"driver_id":7}
```

With `Config.sendLocationAt` (default false) one key is added at the top level, right after `location`:
`{"location":{...,"v":"1.0"},"location_at":"2026-11-19 14:03:07","driver_id":7}`, the time the fix was TAKEN (not sent), UTC;
off, the body is the one above, byte for byte.

There is no `mock` key (the owner's decision of 2026-11-17: the API stores a position without it);
whether a fix is simulated is decided by `MockPolicy` before the body exists. `location` is an object with keys in that order, numbers as plain decimals (never an
exponent), extras merged at the root after `location`, compact JSON.

Behaviour of `LocationSender` (all covered by tests): not started = nothing queued or sent;
network error / 5xx / 408 / 429 keep the queue and retry by the backoff (a `Retry-After` in seconds on a 429 / 503 is honoured when longer,
at most 5 minutes: `RetryAfter`, `HttpResult.Response.retryAfterMs`), at once on a new
fix, `onConnectivityRestored()` or `flush()`; 401 stops, keeps the queue and reports
`unauthorized` once until `updateHeaders` brings *different* headers (a 401 to a request sent with headers that were replaced meanwhile,
or to one in flight when the sender was stopped, revokes nothing: the worker blocks in the HTTP call, so the sender keeps the newest headers the
moment they are given, `latestHeaders`, and compares); any other 4xx (and
1xx/3xx) drops only that fix; `stop()` keeps the queue; `updateHeaders` / `updateConfig`
never restart anything. Network errors do not raise `onHttp` (there is no answer).

**Minimum send interval (`Config.minSendIntervalMs`, default 0 = off).** A floor between the START of two requests, on the
scheduler's monotonic clock; a retry is a request. Inside the interval nothing is sent: the fixes stay queued and a timer (not the next
fix) makes the request when it elapses, with the newest fix of that moment in "latest wins" (one per interval, oldest first, with the
option off). The retry backoff, a new fix, `onConnectivityRestored()` and `flush()` all go through the same gate (a retry goes out at the
later of the backoff and the interval); `stop()` and a 401 cancel the timer; `updateConfig` with another interval re-computes a
waiting send. The listener hears `onSendDeferred(delayMs, queued)` once per wait. Details: `docs/LOCATION_MODULE.md`, "Two send options".

**Latest wins (`Config.discardOlderOnSuccess`, default true).** The sender always sends the
NEWEST queued fix; on 2xx that fix and every older one are removed (fixes queued meanwhile
are newer and stay; the newest of them goes next). A retry sends the newest fix of that
moment. A fix with a timestamp older than the last one sent successfully is dropped on
arrival (the mark survives `stop()`/`start()`, not a process restart). Order is by a sequence
number assigned when the fix is queued and persisted with it (an old queue file without
sequences loads and is migrated), never by comparing timestamps of queued fixes. With `false`
the behaviour is plain first in first out: the whole route, in order. `updateConfig` can
switch it at run time. Why: the server keeps one position per driver, so replaying old ones
after an outage would show the driver where they were.

**The queue belongs to its url.** The owner (the configured `url`) is stored beside the queue
(`locations.owner`). Creating a `LocationSender`, or calling `updateConfig`, with a different
url than the stored owner clears the queue before anything is sent (and forgets the "last
sent" mark), so one driver's pending positions are never sent as another's. Same url: kept.
Entries with no recorded owner (a queue from before owners existed) are cleared as well.

## Tracking events

The second job of the module (`docs/LOCATION_MODULE.md`, "Tracking events"): record what happens to the phone while the driver is
tracked (location services off / on, connection lost / restored, permission or precision changed, app in the background /
foreground, battery saver, a simulated position, tracking started / stopped) and send it to `POST {api}/tracking_events`.
The core knows no Android: the app's service reads the OS and calls `TrackingRecorder`; the recorder hands each
`TrackingEvent` to `LocationSender.recordOnWorker`, which stores it in the events queue and sends it from the same worker.

- **Off unless asked.** `Config.eventsUrl == null` (an older caller) records, writes and sends nothing; the sender built without
  `EventsSetup` ignores events.
- **Request.** `POST eventsUrl` with exactly `Config.headers` (Authorization, the native User-Agent, `X-Device-Id-X`),
  `{"events":"[{\"uuid\":\"..\",\"event\":\"turn_on_gps\",...}]"}`: the array of `{uuid, event, occurred_at, duration_ms, data}` written as a JSON STRING (what the old JavaScript senders posted; the form every API version accepts);
  `occurred_at` is UTC `YYYY-MM-DD HH:mm:ss` (`LocationAt`), `duration_ms` only on the closing events.
- **Positions first.** One worker, one request at a time: every positions `pump` ends with one events batch, and an events pump sends
  ONE batch and posts itself for the next, so a fix that arrives meanwhile is never behind more than one events request. The positions'
  minimum send interval does not gate the events.
- **Answers.** 2xx removes the batch; only 401 stops this lane (the session is revoked), keeps the queue and reports `unauthorized` once per set of headers
  (shared with the positions' 401, whichever lane sees it first; not reported after a stop); 403 ("this endpoint refuses these events") and any other 4xx
  (and 1xx / 3xx) drop that batch with one `onEventsDropped(count, "http NNN")`, the lane keeps working and nobody is signed out; network error, 5xx, 408, 429 keep it and retry with the module's backoff (5 s, 15 s, 60 s,
  then 60 s), at once on `onConnectivityRestored()`, `flush()`, new headers or a new event.
- **Queue.** Capped (500, the oldest dropped with `onEventsDropped(n, "queue full")`), persisted, cleared when the owner changes
  (`Config.eventsOwner` = the positions' url, which holds the user id, plus the events url: the events url alone names no driver).
- **Recorder.** Only between `start` and `stop` (both events included). A change of location services, connection, battery saver or
  app state is held 2 s and cancelled by its opposite (no pair for a flap); its event keeps the time of the detection. A closing event
  carries `duration_ms` from the monotonic clock when this process saw the condition open, else from the two wall times (the
  opening one is persisted in `tracking-events.state`). While a session lives the heartbeat (the last time the module was alive) and an
  "active" flag are persisted; a `start` that finds the flag set and no clean stop emits `tracking_stopped` with reason `system` at
  the heartbeat's time, then `tracking_started` with reason `restart`. `closeOrphan` reports the same owed stop (with the JavaScript
  reason, e.g. `permission`) when nothing will start again. A simulated fix gives at most one `mock_location_detected` per session
  and per 10 minutes.
- **One worker per process (the app's glue).** `LocationSender.retire()` is what a service calls first when it ends: the sender then sets no timer, so
  nothing of it stays on the worker the next service shares; its last tasks (the `tracking_stopped` event and its send) are ordinary queued tasks and run
  before anything the next service posts. The recorder store and the queues are one instance per process (`DriverLocationRuntime`).
- **Tests.** `TrackingEventTest`, `EventQueueTest`, `EventSenderTest`, `TrackingRecorderTest` (with `EventsTestSupport`), `StaleAnswerTest` (a 401 to replaced
  headers, a stop in flight, `retire`), `SharedWorkerTest` (stop then start on one worker; `closeOrphan` once), `RetryAfterTest`.

## Phase 2 checklist (Android glue)

Do it in the Android app project once the React Native upgrade has settled.

**Gradle wiring**
- [ ] Make the core compile in the app module. Simplest (no plugin clash with the root
      `kotlin-gradle-plugin` 2.1.20): in `android/app/build.gradle`
      `android.sourceSets.main.kotlin.srcDir("../driverlocation-core/src/main/kotlin")`.
      Alternative: `include ':driverlocation-core'` in `android/settings.gradle` and
      `implementation project(':driverlocation-core')`; then remove the `version` from
      `kotlin("jvm")` in this module's `build.gradle.kts` (the root classpath supplies it).
- [ ] `implementation "com.google.android.gms:play-services-location:<current 21.x>"`.
- [ ] `android.buildFeatures.buildConfig = true` (for `BuildConfig.DEBUG`).
- [ ] Keep running the core's tests through this standalone build (they need no emulator).
- [ ] Remove, as `docs/LOCATION_MODULE.md` §4 says: the SDK and `react-native-background-fetch`,
      the three `maven {}` blocks, the plugin's `app.gradle`/proguard lines, the licence `meta-data`.

**Manifest** (`android/app/src/main/AndroidManifest.xml`)
- [ ] Permissions: `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`, `ACCESS_BACKGROUND_LOCATION`,
      `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_LOCATION`, `POST_NOTIFICATIONS`, `INTERNET`,
      `ACCESS_NETWORK_STATE`. Drop `ACTIVITY_RECOGNITION` (no motion detection in v1).
- [ ] `<service android:name=".location.DriverLocationService" android:exported="false"
      android:foregroundServiceType="location" />`.
- [ ] Debug only: a network security config allowing cleartext to `localhost`/`10.0.2.2` for the
      local API (`http://localhost:8080`); release stays HTTPS only.

**The `Service`** (`DriverLocationService`)
- [ ] Return `START_NOT_STICKY` (contract: `stopOnTerminate: true`, no start on boot; a system
      restart would have no token anyway). `onTaskRemoved` -> stop tracking and `stopSelf()`.
- [ ] `onStartCommand`: create the notification channel (importance LOW), then
      `startForeground(id, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION)` within
      5 s, with the two texts from `Config.notification`. Android 12+ forbids starting a
      foreground service from the background: start it from the app while it is in the
      foreground (the run plan does), and handle `ForegroundServiceStartNotAllowedException`
      by reporting a state event, not by crashing.
- [ ] Own the core objects for the service's lifetime: `ExecutorScheduler()`,
      `FileLocationQueue(File(filesDir, "driver-location"), cfg.maxQueue)`,
      `HttpUrlConnectionTransport()`, `MockPolicy(releaseBuild = !BuildConfig.DEBUG)` (the debug option comes from `Config.rejectMock`),
      `LocationSender(...)`. `onDestroy`: `sender.stop()`, remove location and network callbacks,
      `scheduler.shutdown()`.
- [ ] **Fused client**: `FusedLocationProviderClient.requestLocationUpdates(
      LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, cfg.interval)
        .setMinUpdateIntervalMillis(cfg.fastestInterval)
        .setMinUpdateDistanceMeters(cfg.distanceFilter.toFloat())
        .setWaitForAccurateLocation(false).build(), callback, looper)`.
      Call `removeLocationUpdates` on stop. Catch `SecurityException` (permission lost) and report it.
      Optional fallback to `LocationManager` GPS provider when Play services are missing.
- [ ] **Callback -> core**: for each `Location l` in `LocationResult.locations`:
      `sender.onFix(LocationFix(l.latitude, l.longitude, l.accuracy.takeIf { l.hasAccuracy() }?.toDouble(),
      l.speed.takeIf { l.hasSpeed() }?.toDouble(), l.time, mock))`, with
      `mock = if (Build.VERSION.SDK_INT >= 31) l.isMock else @Suppress("DEPRECATION") l.isFromMockProvider`
      (`minSdk` is 29 today). `MockPolicy` decides; the service does not look at `mock` itself.
- [ ] **Connectivity**: `ConnectivityManager.registerDefaultNetworkCallback` (needs
      `ACCESS_NETWORK_STATE`); on `onAvailable` and when capabilities gain `NET_CAPABILITY_VALIDATED`
      call `sender.onConnectivityRestored()`. Unregister in `onDestroy`.
- [ ] Listener: a `SenderListener` that forwards `onHttp` / `onLocationAccepted` / `onState` to an
      event sink the module sets while JS is alive (drop them otherwise; `state()` is the source of
      truth). It must never block: it runs on the sender's worker.
- [ ] `servicesEnabled` for `getState()`: `LocationManager.isLocationEnabled`; also watch
      `LocationManager.PROVIDERS_CHANGED_ACTION` and send a state event.

**React Native TurboModule** (`DriverLocation`, spec `src/native/NativeDriverLocation.ts`)
- [ ] `configure(map)`: build `Config` (including the optional `discardOlderOnSuccess`, default true; numbers from `ReadableMap` arrive as doubles: the body builder
      already prints `7.0` as `7`); `ConfigException` -> `promise.reject("E_CONFIG", e.message)`.
      First call: remember it. Later calls while running: `sender.updateConfig(cfg)` (swaps url,
      headers, extras, maxQueue; **no restart**); restart the fused request only if distance filter
      or intervals changed. Resolve with the `State`.
- [ ] `start()`: `ContextCompat.startForegroundService(Intent(DriverLocationService))`, passing the
      config through a process-wide holder (not through the Intent: it would put the token in an Intent
      extra); `stop()`: `stopService`. Both resolve with `getState()`.
- [ ] `getState()`: `SenderState` + `enabled`, `authorization` (permission checks), `servicesEnabled`.
- [ ] `flush()` -> `sender.flush()`.
- [ ] `onLocation` / `onHttp` / `onState` as codegen event emitters; `onState` payload kinds are
      `StateKind.wire` (`mock_rejected`, `unauthorized`) plus the module's own (authorization, services).
- [ ] Register the package in `MainApplication`; JS wrapper `src/native/driverLocation.ts` is the only importer.

**Still to decide or do**
- [ ] Battery-optimisation guidance for aggressive vendors; background-permission rationale stays in
      `PermissionsContext`.
- [ ] `docs/LOCATION_MODULE.md` §5 steps 3-5 (local API, emulator route, real phones) are untouched.
