# The driver location module (the app's own)

Status (2026-11-13): **Android: built and verified on the emulator** (API 37, debug and
release builds, against the local API: [theme/verification.md](theme/verification.md), "The
driver location module (Android)"; run again after the merges, same file, section 6). **iOS: wired
and seen with the real JavaScript and no old SDK** on the simulator (Debug, section 6 of the same
file): tracking starts by itself with "Always", sends in the foreground, on the home screen and
locked, survives a reload, stops with one logout on a revoked session, shows the themed dialog when
the location authorization is revoked and resumes when it is granted. "While Using" keeps tracking
on both platforms (the owner's decision of 2026-11-19, replacing the one of 2026-11-14 that did not track): the module keeps
tracking and sending for as long as the system delivers positions, the change of authorization is the
`location_permission_changed` event, and the app's dialog still tells the driver on shift that the orders are not tracked in
the background and asks for "Always" (seen on the simulator: the dialog, Cancel, Open Settings). Tracking stops for the
permission only when the authorization is denied or restricted (`tracking_stopped`, reason `permission`). Both platforms write the same log lines (2026-11-17, "Logs" in section 3). **Real phones: the owner.** It replaces `react-native-background-geolocation`
(and its companion `react-native-background-fetch`): that SDK needs a paid licence per
application identifier and its terms forbid white-label use, and the Builder creates one
app per brand. The module is native code of this repository, written and maintained
here, with no licence.

The owner's requirements, in his words: it must be **well tested against what works
today**; it sends **without JavaScript**; it **stays alive while the app is in the
background**; it **retries**; it keeps **the other options the app uses**; and a
**mock location is not sent in production**.

## 1. What the app uses today (the behaviour to keep)

From `src/navigators/RootNavigator.tsx` (the only importer) and the SDK's configuration:

| Today | To keep |
|---|---|
| `ready({...})` then `start()` / `stop()` by `getBackgroundGeolocationRunPlan` (ready, logged in, `user.enabled`, permissions granted, not blocked by the schedule) | The same run plan decides; the module only obeys `start` and `stop` |
| High accuracy, `distanceFilter: 25` m, Android interval 40 s / fastest 20 s | The same three numbers, as configuration |
| Android foreground service with a notification ("Background tracking enabled" / "Important for delivery real time location") | A foreground service of type `location` with those two texts (translated by the caller) |
| iOS `preventSuspend`, background mode `location`, authorization "Always" | Background location updates with the system's indicator; the app is kept running by them |
| Native HTTP: every location is `POST`ed to `${root}/users/${id}/locations` with `Authorization: Bearer <token>` and, since 2026-11-19, the app's two native headers (`User-Agent` with the app, build, OS and device, and `X-Device-Id-X`: the same values as the app's other requests, added by the native service, never by JavaScript; the module posts to the Ordering API only, so it always carries the id, which no other request of the app does outside the API's host; see "Native request headers" in `CLAUDE.md`), body root `location` = `{"lat","lng","v":"1.0"}` (no `mock` key since 2026-11-17), extra `driver_id`; since 2026-11-19 optionally `location_at` (§3, "Two send options") | The same request, made by native code (no JavaScript involved), byte-compatible with what the API accepts today (checked against the local API, §5) |
| `autoSync` with the SDK's store: a location that could not be sent is kept and sent later | A persisted queue, with retries (§3); by default the newest position wins and older pending ones are discarded on success (`discardOlderOnSuccess`, §2) |
| `onHttp`: on any answer the app refreshes the driver's position; on **401** it logs out | An event per answer (`success`, `status`); 401 stops the sender and is reported once |
| `onLocation` (only logged) | An event per accepted location (the map screens may use it later) |
| The SDK's dialogs: "location not enabled / off" with a button to Settings; Android's background-permission rationale | The app's own dialogs (`ConfirmDialogHost`, themed; `OAlert` is gone) fed by the module's state events; the permission requests stay in `PermissionsContext` |
| `mock` in the body (Android's mock-location flag) | **The body carries no `mock` key** (the owner's decision of 2026-11-17; the local API answers 200 and stores a position without it). **Release builds: a simulated (mock) location is always dropped before the queue, never sent**, and reported to JS as `mock_rejected` (the owner's decision; not configurable). **Debug builds:** by default (`rejectMock` false) it is accepted and **sent as a real one**: the same body as any other position, with nothing that says it was simulated (that is what lets a developer see an emulator's positions), while the `onLocation` event to JS still says `mock: true`. With `rejectMock` true a debug build behaves like release (dropped + `mock_rejected`), to try the production behaviour. The simulated flag therefore never leaves the device in a request |
| `stopOnTerminate: true` (a killed app stops tracking; so `startOnBoot` does nothing) | Tracking stops when the app is killed and does not start on boot. Stated, not accidental |
| The SDK stops the GPS while the phone is still (motion detection; the "physical activity" permission) | **Not copied in version 1** (the largest piece of the SDK). Battery is bounded by the distance filter and the interval; iOS may pause on its own. Measured in §5; a stationary mode is version 2 if the numbers ask for it. The physical-activity permission is no longer requested |

Not used today, and not built: geofences, tracking after the app is killed, headless
tasks, schedules, the odometer, the SDK's log upload.

Fixed on the way (defects of today's code, found by the research):

- every token, permission or language change added another `onHttp` / `onLocation`
  listener (several logouts on one 401): the module has one subscription, replaced;
- a second, JavaScript `POST` of the position runs on every touch, every app-state
  change and every `onHttp`: removed once the native sender is proven (it doubles the
  requests).

## 2. The contract (JavaScript side)

One wrapper, `src/native/driverLocation.ts`, over a TurboModule `DriverLocation`
(codegen spec `src/native/NativeDriverLocation.ts`). Nothing else imports the native
module.

```ts
configure(config: {
  url: string                    // `${root}/users/${id}/locations`
  headers: Record<string, string>// Authorization
  extras: Record<string, string | number> // { driver_id }
  distanceFilter: number         // metres (25)
  interval: number               // ms, Android (40000)
  fastestInterval: number        // ms, Android (20000)
  notification: { title: string, text: string } // Android
  maxQueue: number               // locations kept while offline (default 500, oldest dropped)
  discardOlderOnSuccess?: boolean // default true, see below
  rejectMock?: boolean           // debug builds only, default false, see below
  minSendIntervalMs?: number     // ms, integer >= 0, default 0 (off): "Two send options" in §3
  sendLocationAt?: boolean       // default false (off): adds `location_at` to the body, "Two send options" in §3
  eventsUrl?: string             // `${root}/tracking_events`; absent = the events recorder is off, "Tracking events" in §3
}): Promise<State>
start(reason?: 'available' | 'schedule' | 'login' | 'permission' | 'restart'): Promise<State>
stop(reason?: 'unavailable' | 'logout' | 'schedule' | 'permission' | 'session_revoked' | 'unknown'): Promise<State>
getState(): Promise<State>       // { enabled, tracking, queued, lastLocationAt, lastHttpStatus, authorization, servicesEnabled }
flush(): Promise<void>           // try to send the queue now
onLocation(cb): Subscription     // { lat, lng, accuracy, speed, timestamp, mock }
onHttp(cb): Subscription         // { success, status }
onState(cb): Subscription        // authorization or services changed, `mock_rejected`, `unauthorized`
setApiRoot(root: string): boolean // synchronous: the Ordering API's root, so native code knows which host may carry `X-Device-Id-X` ("Review fixes", section 3)
```

`discardOlderOnSuccess` (default **true**, "latest wins"): the sender always sends the
**newest** pending position, and when the server accepts it every older pending one is
discarded, so a position is never sent after a newer one. Why: the server keeps one position
per driver, so replaying old ones after an outage would show the driver where they were.
`false` sends every position, oldest first (the whole route). It may be changed by calling
`configure` again.

`rejectMock` (default **false**, debug builds only): with false a debug build sends a simulated
position as a real one (an ordinary body, no `mock` key; `onLocation` still reports `mock: true`); with true it drops
it and reports `mock_rejected`, as a release build does. A release build always drops simulated
positions, whatever this says. It may be changed by calling `configure` again. The tracking hook
does not set it.

`headers` carries the `Authorization` only. The two native headers (`User-Agent` and `X-Device-Id-X`; the module's requests go to the API only, so both are always sent; React Native's own requests carry the id only when the host is the API's, see "Review fixes" in section 3) are added by the native side (Android: `DriverLocationService`, which reads `ANDROID_ID` again in its own process and never stores it; iOS: `DriverLocationBridge.configure`, which reads the Keychain id), through the cores' `withDefaultHeaders` / `addingDefaultHeaders`; a header JavaScript does send wins.

`configure` may be called again with a new token: it replaces the headers of the
running sender without restarting the location updates and without adding listeners.

## 3. Native design

Shared rules, both platforms:

- **The sender is native and independent of the React runtime.** A location is written
  to the queue first, then sent; a reload of the JavaScript bundle or a suspended JS
  thread does not stop either.
- **Queue:** persisted (it survives the process being killed while the service lives),
  bounded by `maxQueue` (the oldest are dropped), ordered by a **sequence number assigned
  when a location is queued** (persisted with it; never by comparing timestamps). One
  request per location. Which one is sent depends on `discardOlderOnSuccess`:
  - **on (default, "latest wins")**: the **newest** queued location is sent; on 2xx it is
    removed **together with every older one** (locations queued meanwhile are newer: they
    stay and the newest of them goes next). A retry sends the newest location *of that
    moment*, not the one that failed. A location whose timestamp is older than the last one
    sent successfully is dropped on arrival (never go back in time; the mark survives
    `stop()`/`start()` within the process);
  - **off**: first in first out, **sent in order**, the server sees the whole route.
- **Owner:** the queue belongs to the endpoint URL it was filled for (stored beside it).
  When the sender is created, or `configure` is called again, with a **different url**
  (another driver after a logout/login or a restart), the queue is cleared before anything
  is sent; entries with no recorded owner are cleared too. Same url: the queue is kept.
- **Retries:** network errors, 5xx, **408 and 429** keep the queue and retry with a backoff
  (5 s, 15 s, 60 s, then every 60 s) and at once when connectivity returns or a new
  location arrives; a `Retry-After` of seconds on a **429 or 503** is honoured when it is longer than the backoff (at most 5 minutes; an
  HTTP-date is ignored), on both lanes and both platforms; 2xx removes (see above); **401 stops sending, keeps the queue, and
  reports `unauthorized` once**; any other 4xx (and 1xx/3xx) drops only that location (it
  will never be accepted) and goes on.
- **Mock:** detected by the platform (`Location.isMock` / `isFromMockProvider`;
  `CLLocationSourceInformation.isSimulatedBySoftware` on iOS 15+). Release builds drop
  it before the queue (`mock_rejected`), always. Debug builds send it **as a real one**
  (the event for JS keeps `mock: true`) unless `rejectMock` is true, in which
  case they drop it like release does. **The body has no `mock` key at all**: the decision is made
  by the policy before the body is built, so the drop in release is the module's own guarantee and
  the request never says whether a position was simulated.
- **Discards are logged, not reported:** when a success drops older positions ("latest wins"), the
  platform layer writes **one** log line with how many (see "Logs"); nothing goes to JavaScript, there is
  no event, and the core only passes a bare number (no allocation or I/O on the hot path beyond the
  log call).
- **No secrets in logs**: the token is never logged; a release build writes no coordinates, body, url, header or token (see "Logs").

Android (`android/app/src/main/java/.../location/`): a `Service` with
`foregroundServiceType="location"`, `FusedLocationProviderClient` (high accuracy,
`setMinUpdateDistanceMeters`, interval and fastest interval), a file-backed queue (`FileLocationQueue`),
`HttpURLConnection` on its own thread, a
`ConnectivityManager` callback to flush. The pure parts (queue, backoff, body builder,
mock policy) are plain Kotlin classes with JVM unit tests.

iOS (`ios/ODelivery/Location/`): `CLLocationManager` (`allowsBackgroundLocationUpdates`,
`pausesLocationUpdatesAutomatically = false`, `activityType = .automotiveNavigation`,
`showsBackgroundLocationIndicator`), a file-backed queue, `URLSession`, `NWPathMonitor`
to flush. The pure parts are plain Swift types with XCTest.

### Two send options (2026-11-19)

The owner asked for two options of the module: send **no sooner than x milliseconds** after the previous request,
and send **`location_at`**, the UTC time of the position, as `YYYY-MM-DD HH:mm:ss`. Both are values of the same
`configure` call, on both platforms; both are **off in the core and in the wrapper** (a call that names neither
behaves exactly as before) and **on in the app**, which fixes the values and lets the project's configs change them.

| | Minimum interval between requests | `location_at` |
|---|---|---|
| JS `configure` / codegen spec | `minSendIntervalMs: number` | `sendLocationAt: boolean` |
| Kotlin core `Config` | `minSendIntervalMs: Long = 0` (0 to 3 600 000, else `ConfigException`) | `sendLocationAt: Boolean = false` |
| Swift core `Config` | `minSendIntervalMs: Int = 0` (0 to 3 600 000, else `ConfigError.invalidMinSendInterval`) | `sendLocationAt: Bool = false` |
| Default in the core, the wrapper and an old caller | 0 = no throttle | false = today's body |
| **Default in the app** (`src/navigators/driverLocationOptions.ts`, one named constant each) | `DEFAULT_MIN_SEND_INTERVAL_MS = 1500` | `DEFAULT_SEND_LOCATION_AT = true` |
| Project config that overrides it (the `value` is a string; the configs need not exist) | `driver_location_min_send_interval_ms` | `driver_location_send_location_at` |

**Where the values come from.** The hook `useDriverLocationTracking` reads `useConfig()`'s `configs` and passes
`getDriverLocationSendOptions(configs)` to `configure`. Parsing (everything else falls back to the app's default; nothing
throws):

| Config | Accepted | Result |
|---|---|---|
| `driver_location_min_send_interval_ms` | an integer of digits, trimmed (`'4000'`, `'0'`, `'007'`; a JS integer also) | that many ms; `'0'` switches the interval off |
| | above 300 000 (5 minutes, `MAX_MIN_SEND_INTERVAL_MS`) | capped at 300 000 |
| | empty, negative, `'+5'`, `'1.5'`, `'1e3'`, `'1500ms'`, text, `NaN`, a boolean | the app's default, 1500 |
| `driver_location_send_location_at` | `'1'` or `true`; `'0'` or `false` | on; off |
| | empty, `'2'`, `'yes'`, `'true'` as text, anything else | the app's default, on |

The two values are primitives in the dependencies of the hook's configure effect: when the configs are fetched again and a
value changed, `configure` is called again with the new values; the module applies them to the running sender and does not
restart tracking or the location updates, and no listener is added (an unchanged config calls nothing). The configs do not
exist on the server today, so the defaults apply; creating them changes the behaviour with no new build.

**1. The minimum interval.** The module does not **start** a request sooner than `minSendIntervalMs` after the previous
request was **started** (not finished; a failed one counts; measured with a monotonic clock, never the wall clock; a new process
starts with no previous request). A position that arrives inside the interval is not lost and is not sent on its own: it goes
to the queue as always, and a timer, not the next fix, makes the request when the interval has elapsed, with the **newest** fix of
that moment ("latest wins": the older ones are discarded when it is accepted, `discarded N older positions`). No pending
position means no timer and no request. With `discardOlderOnSuccess` false (the whole route) the queue is sent oldest first,
one request per interval.

| Situation | What happens |
|---|---|
| `0` or absent | The code path is the old one: no timer, no wait, no log line |
| Two fixes inside the interval | One request when the first fix arrived, one more with the newest fix when the interval elapses; the line `send in N ms (min interval) queued=M` is written once per wait, not per fix |
| A request fails (network, 5xx, 408, 429) | The retry is a send: it is made at the **later** of the backoff (5 s, 15 s, 60 s, then 60 s) and the interval. With 1500 ms the backoff is always the longer; with an interval longer than the backoff the retry timer fires, finds the interval not elapsed and waits the rest |
| A new fix after a failure | As before it tries at once instead of waiting for the backoff, but not before the interval |
| The queue after an outage | The network callback / `flush()` go through the same gate: "latest wins" sends one request (the newest), the whole-route mode sends one per interval, never a burst. Reconnecting inside the interval waits for the rest of it |
| `stop()` | The pending timer is cancelled and nothing is sent after it (the positions stay on disk, as `stop()` always kept them); a later `start()` sends what is left, not before the interval counted from the last request |
| 401 (revoked session) | Sending stops as before and the timer is cancelled; new headers resume it, still gated by the interval |
| The configuration changes while a send waits | Another interval re-computes the wait at once (`0` sends now); an unchanged interval does not move the timer |
| The OS's own filters (`distanceFilter`, Android's `interval` / `fastestInterval`) | Unchanged. The interval is a floor on **sends**, not a request for more fixes: a driver who does not move still sends nothing |
| `maxQueue`, a fix older than the last one sent, the mock policy | Unchanged and applied on arrival, before the wait |

*Android.* The timer is a `ScheduledThreadPoolExecutor` delay on the sender's worker (`ExecutorScheduler`): the module takes
**no wake lock and no alarm** of its own; the foreground service and the fused location callbacks are what run the
worker while the screen is off. The clock is `SystemClock.elapsedRealtime()` (it counts the time the device sleeps), passed by
`DriverLocationService` to the scheduler. If the device sleeps deeply the executor's delay may fire late; the next fix (the callback wakes
the CPU) or the timer, whichever comes first, makes the request, and the elapsed time is measured with the clock that counts sleep.

*iOS.* The timer is the one the retry backoff already uses (`DispatchScheduler`, a `DispatchWorkItem` on a global queue); the
clock is `CLOCK_MONOTONIC_RAW`. No background task is begun for it. **The guarantee in the background is the one the backoff has:**
while location updates run in the background (the `location` background mode with `allowsBackgroundLocationUpdates`,
`pausesLocationUpdatesAutomatically` false) the process is kept running, so the timer fires; if the system nevertheless suspends the process,
the pending send is made on the first fix or the first time the process runs after the deadline (a due timer fires on resume),
never earlier than the interval. What a real phone does with a stationary driver in the background, and the
timer's lateness there, is to be checked by the owner (see "What the iOS check must look at").

**2. `location_at`.** With the option on, the body carries `location_at`: **when the fix was taken** (Android
`Location.getTime()`, iOS `CLLocation.timestamp`, stored with the fix in the queue), never when it is sent: a fix sent late
after the interval, after a retry, or from the queue of a previous run keeps its own time. UTC, exactly
`YYYY-MM-DD HH:mm:ss` (24-hour, zero-padded, no `T`, no `Z`, no milliseconds, seconds truncated, proleptic Gregorian, ASCII digits).
The text is computed with integer arithmetic (`LocationAt.kt`, `LocationAt.swift`): no formatter, no locale, no calendar, no
time zone is read, so a phone in Arabic or Persian, with the Buddhist or Japanese calendar, with Eastern digits or a 12-hour
clock sends `2026-11-19 14:03:07` like any other (tests set those locales and compare).

```
off (today's body, byte for byte): {"location":{"lat":19.432608,"lng":-99.133209,"v":"1.0"},"driver_id":7}
on:                                 {"location":{"lat":19.432608,"lng":-99.133209,"v":"1.0"},"location_at":"2026-11-19 14:03:07","driver_id":7}
```

The key is at the top level, right after `location` (before the extras); an extras key called `location_at` is refused while the
option is on. **What api-core does with it today (read only, `app/Http/Controllers/DriverLocationController.php`, `register`):**
the endpoint reads `location` (an object or a JSON string; the plugin's array form too), `driver_id` and `location.mock`, validates
`driver_id` and `location`, and stores `users.location` and `users.last_location_at = now()`. **It does not read
`location_at`**, at the top level or inside `location`: a top-level `location_at` is not validated, not stored and not used for
`last_location_at` (the server's clock is), and it comes back in the response and in the `tracking_driver` socket payload
(both are `$request->all()`); inside `location` it would be stored with the position in `users.location`. Hence the top level (nothing
of today's stored data changes) and the key waits for the API to read it. The API's own batch job
(`ProcessDriverLocationBatch`) already writes `last_location_at` from a text in this same format, `YYYY-MM-DD HH:mm:ss`. Also
note that api-core has a server-side shield on this route (`DriverLocationShield`, middleware `driver_location_shield`):
inside `LOCATION_EVERY_SECONDS` of the driver's previous accepted position (60 by default; 15 in the docker compose files)
it answers 200 with `lat` 0 / `lng` 0 and stores nothing, except for the projects of `LOCATION_UNLIMITED_PROJECTS` (`development`
locally). The 1500 ms interval is therefore a floor on what the app asks for, not a change of what a shielded project stores.

**No persisted configuration.** The configuration is never written to disk (it carries the token): the process-wide holder is
filled by the app's next `configure`. What is persisted is the queue, and each queued fix carries its own timestamp, which is all
`location_at` needs; nothing about the two options is stored with it, so a queue left by an older build is sent with the options
of the current configuration (an old build knew no `location_at`: the fix times are the same field it always stored).

### Tracking events (2026-11-19)

The owner moved the logging of "GPS off / internet off / app in the background" from JavaScript into the module and extended it,
because the module is the only thing alive in the background. The contract between the app and the API is
`scratchpad/tracking-events-contract.md` of that day (the API stores each event once per `(author_id, uuid)`, keeps its own
`occurred_at`, and keeps the driver's last state); this is the app's half.

**What is recorded, and only while tracking** (driver available / on shift, the app open or in the background; nothing for a driver
who is not being tracked). Every event has a `uuid` (v4), its real time `occurred_at` (UTC `YYYY-MM-DD HH:mm:ss`, `LocationAt`, the
wall clock at detection), `duration_ms` on the events that END a condition (the monotonic clock when the process lived through it,
else the difference of the two wall times, the opening one persisted), and `data` with `platform`, `app_state` and the fields below.

| Family | `event` (closing event has `duration_ms`) | `data` besides `platform`, `app_state` | Android signal | iOS signal |
|---|---|---|---|---|
| GPS | `turn_off_gps` / `turn_on_gps` | | `PROVIDERS_CHANGED_ACTION`, `MODE_CHANGED_ACTION` + `LocationManagerCompat.isLocationEnabled` | `locationManagerDidChangeAuthorization` + `CLLocationManager.locationServicesEnabled()` (off the main thread) |
| Connection | `turn_off_mobile_data` / `turn_on_mobile_data` | `network_type`: `cellular` \| `wifi` \| `other` \| `none` (the type lost / now in use) | default `NetworkCallback`, online = `NET_CAPABILITY_VALIDATED` | `NWPathMonitor`, online = `satisfied` |
| Permission | `location_permission_changed` | `from`, `to` (`always` \| `while_in_use` \| `denied` \| `restricted` \| `not_determined`), `precise_from`, `precise_to` | compared with the persisted state at the service start, at every foreground and at a failed location request | `locationManagerDidChangeAuthorization` (`authorizationStatus`, `accuracyAuthorization`) |
| App | `set_app_in_background` / `set_app_in_foreground` | | activity callbacks (`AppForeground`) | `didEnterBackground` / `willEnterForeground` |
| Battery | `battery_saver_on` / `battery_saver_off` | | `ACTION_POWER_SAVE_MODE_CHANGED`, `isPowerSaveMode` | `NSProcessInfoPowerStateDidChange`, `isLowPowerModeEnabled` |
| Simulated position | `mock_location_detected` (at most one per session and per 10 minutes) | `provider` when the OS gives one | `isMock` / `isFromMockProvider`, independent of the mock policy | `sourceInformation?.isSimulatedBySoftware` |
| Tracking | `tracking_started` / `tracking_stopped` | `reason` (below) | `begin()` / `endTracking()` of the service | `start()` / `stop()` |

`tracking_started` reasons: `available` (the driver switched to available), `schedule` (the schedule block ended), `login`, `permission`
(tracking resumes after a stop whose reason was `permission`, 2026-11-19), `restart` (only "the process came back and tracking resumes":
the module found a session the system had ended, whatever JavaScript says). `tracking_stopped` reasons: `unavailable`, `logout`, `schedule`, `permission`,
`session_revoked` (the 401 rule; the module records it itself before JavaScript logs out), `system` (below), `unknown`. JavaScript says
the reason it knows (`start(reason)` / `stop(reason)`, `src/navigators/trackingReasons.ts`); a stop the module did not hear from
JavaScript (the task removed, the service destroyed) is `system`.

**Rules.** Events are recorded only between `tracking_started` and `tracking_stopped` (both included); the watchers that only serve the
recorder (battery, app state) are registered at the start and removed at the stop. A change of GPS, connection, battery saver or app
state is held 2 s and cancelled by its opposite, so a flapping signal (a wifi to cellular handover, a rotation) gives no pair; the event
keeps the time of the detection. The state at `tracking_started` is not an event, with these exceptions so the server's state is right:
a condition that is bad and not recorded as open (battery saver on, location services off, no connection) opens at the start's time,
and one recorded as open that is good now closes (its duration from the persisted opening); a changed authorization is reported from the
persisted one; starting in the background is remembered silently (a later `set_app_in_foreground` has its duration). **A stop settles what is held first** (2026-11-19): a held change whose condition still differs from the recorded state is emitted with its own detection time, oldest first, before `tracking_stopped`; one that returned to the recorded state was cancelled already. So every opening event has its closing one (or none of the pair) and a duration is never measured across a lost event (seen on iOS: the app came to the foreground and tracking stopped for the permission within 2 s; the foreground event was dropped and the next one reported 60 097 ms for a stay of about 5 s). Switching the recorder off (`cancel`) emits nothing; the next start reconciles with the device.

**A stop by the system.** While a session lives the module persists a heartbeat (each fix, written at most every 15 s, and a 60 s timer)
and an "active" flag in `tracking-events.state`. At the next `start`, if the flag is set and there was no clean stop, it emits
`tracking_stopped` (`system`, `occurred_at` = the heartbeat, `duration_ms` = how long it tracked) and then `tracking_started` (`restart`).
If nothing will start again (the permission was revoked, which kills the process on Android; the driver is off shift), JavaScript's
`stop(reason)` with no running tracking reports the owed stop with its reason (`permission`) at the heartbeat's time, followed by the
authorization change (`closeOrphan`; for this the hook configures the module whenever a session exists, with or without the location
permission, and sends the stop again once the configuration is done: `start` still needs the permission): the one place an event is recorded outside a session, because without the permission no session
can begin. A session that belonged to another driver or url is not ours to report and is dropped.

**The queue.** `tracking-events.queue` beside the positions' queue, one CRC'd line per event, append-only, at most 500 events (the oldest
are dropped with one `events dropped N (queue full)` line), never holding the token. Its events carry no url; its owner file (`tracking-events.owner`) holds the positions' url (it has
the user id) plus the events url (no token): another driver or endpoint clears it, the same keeps it. The recorder's own state
(`tracking-events.state`: the owner, the active flag, the heartbeat, the open conditions with their wall times, the last authorization)
follows the same owner rule.

**The sender.** One more lane of `LocationSender`, on the same worker, scheduler, transport, backoff and connectivity-restored trigger:
`POST {root}/tracking_events` with the same headers as the positions (Authorization, the native User-Agent, `X-Device-Id-X`) and the body
`{"events":"[{...},{...}]"}`: the array written as a JSON string, exactly as the old JavaScript senders posted it and the form every version of the API accepts (the API in production validates `events` with a string rule and rejects a real array; the newer one takes both), at most 100 events per request (more is a 400 for the whole request), oldest first. 2xx removes the batch; only a 401
(a revoked session) stops the lane, keeps the queue and reports `unauthorized` once per set of headers (shared with the positions' 401, whichever
lane sees it first; nothing is reported after a stop; the `tracking_stopped` with `session_revoked` is recorded for a real 401 only); a 403 is "this
endpoint refuses these events" (a proxy, a firewall, a permissions rule on that one endpoint), not a revoked session: like any other 4xx (the API
does not know a name, a validation error) it drops that batch with one `events dropped N (http S)` line, never
an endless retry; a network error, 5xx, 408 and 429 keep it and retry with the backoff, and at once when the connection returns, on
`flush()`, with new headers and with a new event. Positions go first: one request at a time, an events pump sends ONE batch and posts
itself for the next, so a position is never behind more than one events request; the minimum send interval does not gate the events.
Stopping the service does not end the worker (it is process-wide, "Review fixes"): the `tracking_stopped` event and its send are the last tasks the stopping service posts, and they run before the next service's first one.

**The switch.** The project config `driver_tracking_events_enabled` (`'0'` = off; absent or anything else = on; the config does not exist
on the server today) is read in `src/navigators/driverLocationOptions.ts` beside the two send options. Off: the app passes no `eventsUrl`,
the module records, writes and sends nothing (a recorder switched off while tracking ends its session with no event), and tracking itself is
unchanged. Turned on again it sends the `tracking_started` of the running session and the events left on disk. An older JavaScript that
passes no `eventsUrl` changes nothing.

**What JavaScript no longer does.** `useLocation`'s `turn_off_gps` (the maps' position watch keeps its `console.log`), `RootNavigator`'s
`set_app_in_background` (which, since it read `loaded` from a closure of the first render, never fired) and `turn_off_mobile_data` with its
`disconnected_at` storage key and its NetInfo subscription are removed: nothing posts to `/tracking_events` from JavaScript any more.
`@react-native-community/netinfo` stays: `HomeNavigator`, `MyOrders` and `OfflineActionsProvider` read it.

**What the API does with them.** It stores each event once per `(author, uuid)` and answers success for a repeat (so a retry after an unanswered request never duplicates). Only an event that carries a `uuid` and comes from a driver (level 4) updates the driver's state and is broadcast live; `set_app_in_background` / `set_app_in_foreground` are stored but are neither state nor broadcast. A name the API does not know is a validation error that stores none of the batch: the rule for deploys is **the API first**, because an API that does not know a name answers 400 and the module drops that batch (as designed), losing those events.

**"While Using" and the authorization (2026-11-19).** JavaScript decides, in one place: `canTrackLocation` (`src/context/canTrackLocation.ts`, exposed by `PermissionsContext`) is true when the system lets the app read the position (iOS "While Using" or "Always"; Android every permission the app asks for but `ACCESS_BACKGROUND_LOCATION`), and the run plan of `useDriverLocationTracking` uses it instead of `isGrantedPermissions` (which still means every permission, "Always" on iOS, and still gates the map tab, the order actions and the dialog). The two native cores do not refuse "While Using": the Swift package starts updates and sends with `authorizedWhenInUse`, the Android service runs with the foreground permission alone (`hasLocationPermission` = fine or coarse). Always to "While Using" while tracking: the `location_permission_changed` event and nothing else; "While Using" to denied or restricted: the event, then JavaScript's `stop('permission')`.

**Android and the background permission.** On Android 11 and newer the app asks for fine and coarse location only (`PermissionsContext`), so revoking just `ACCESS_BACKGROUND_LOCATION` does not stop the tracking: the process is killed, restarts, and the next start reports `tracking_stopped` (`system`), `tracking_started` (`restart`) and `location_permission_changed` (`always` to `while_in_use`). The heartbeat is refreshed by the 60 s timer, so a stop by the system is dated up to a minute before the kill when the driver is not moving.

**Limits, stated.** A device that is offline reports late: the events wait on disk and arrive, oldest first, with their own times, when the
connection returns. A process killed by the system reports at the next start (the stop with the heartbeat's time, not the real kill time).
An event of the stop of a driver who goes unavailable while offline waits for the next start of the module. iOS, suspended in the background
with no location updates, records nothing until it runs again (the `location` background mode keeps it running while tracking). Android:
`PROVIDERS_CHANGED_ACTION` and the activity callbacks are only seen while the process lives. The API validates a name it does not know as an
error: the module drops that batch and logs it.

**Permissions and privacy.** No new permission (`ACCESS_NETWORK_STATE`, the location and foreground-service permissions are already there;
`isPowerSaveMode` and the activity callbacks need none; on iOS the notifications and `NWPathMonitor` need none). The events carry no new
identifier: the device id header is the one the app already sends (to the API only) and declares.

**Tests.** Kotlin core: `TrackingEventTest`, `EventQueueTest`, `EventSenderTest`, `TrackingRecorderTest` (the stop settles what is held; the start reasons; "While Using"), `StaleAnswerTest`, `SharedWorkerTest`, `RetryAfterTest`; Android app: `EventMappingsTest`, `HeadersInterceptorTest`, `SessionLinkTest`; Swift
package: the same set plus `ReviewFixTests`; JavaScript: `canTrackLocation.test.ts`, `driverLocationOptions.test.ts`, `trackingReasons.test.ts`, `useDriverLocationTracking.test.tsx`,
`driverLocation.test.ts`, `RootNavigator.trackingEvents.test.tsx`.

### Review fixes (2026-11-19)

An independent review of the native work found the defects below; each was checked against the code first and has a test.

- **A 401 belongs to the headers the request was sent with.** iOS had `headersGeneration`; Android did not: its worker blocks in the HTTP
  call, so a new token (`updateHeaders` / `updateConfig`) is only applied behind it. `LocationSender` now keeps the newest headers the
  moment they are given (`latestHeaders`, any thread) and a 401 to a request sent with other headers is not a revoked session: nothing is
  latched or reported and the request is made again with the new ones (events lane: the same, `currentHeaders`). A sender that was stopped
  while a request was in flight reports nothing either (a logout, then a quick sign-in, no longer logs the new session out).
  `DriverLocationService.Forwarder` is one per run and acts only while its sender is the running one (`SessionLink`): it stops its own
  recorder, never "whichever is current", and forwards to JavaScript only for the running service.
- **One worker on Android.** Every service, sender, recorder and `closeOrphan` run on one process-wide `ExecutorScheduler`
  (`DriverLocationRuntime.worker()`, a daemon thread that is never shut down), with one `FileRecorderStore` and one pair of queues per process.
  A stop is the last thing a service posts and the next start the first thing the next one posts, so the old `doStop` always runs before the
  new `doStart` (no spurious `tracking_stopped` `system` + `restart`, no old `open` map over the new session, one writer of the state file),
  and what `shutdownGracefully` guaranteed for the final events is the same thing: the `tracking_stopped` and its send are queued tasks,
  which run. `LocationSender.retire()` (called first at the end of a run) makes the old sender set no more timers, so nothing of it is left on the
  shared worker; an event that could not be sent waits on disk for the next start. Two `closeOrphan` calls in a row report once (the second finds
  the flag cleared: same worker, same store).
- **The reasons travel with the request.** The start reason is an extra of the start intent (`EXTRA_START_REASON`, a start with none never erases
  one) and the stop reason the argument of `DriverLocationService.requestStop`, each landing on the one run it is for and then forgotten; they are
  no longer process globals that a late call could leave for the next session.
- **iOS: the stop's event is always sent.** At the end of every outcome of a position request (a network error, 408, 429, 5xx, any 4xx, 2xx) the
  events lane is pumped; only a latched 401 keeps the events on disk. The recorder's start snapshot no longer reads a stale connection: the
  monitor is started first and forgets its last reading when it stops, and "not known yet" (`DeviceSnapshot.online` nil) makes no
  connection event until the first real reading (which is also said again behind the start, so one that arrived in between is not lost).
  A debounce timer that had already fired cannot take the pending that replaced it (a token). A clock that went back in the minimum-interval
  math waits one whole interval counted from now (both platforms, tested).
- **The device id goes only to the Ordering API** (the owner's decision of 2026-11-19; the User-Agent still goes to every host). JavaScript calls
  `setApiRoot(ordering.root)` (a synchronous method of this module, from the hook, before any parent's effect); native code compares host and port.
  Android: the OkHttp interceptor (`UserAgent.interceptor`). iOS: the User-Agent stays in the session's headers and the id is added by
  `RCTSetCustomHTTPRequestInterceptor`, React Native 0.88's per-request hook (it sees fetch, XHR and images), read when needed and kept once read
  (`DeviceId`, one read at a time: a first launch no longer deletes the other path's new item, and the module's `configure` and React Native's
  requests agree; a Keychain that cannot be read gives no id, never a new one). Until the root is known no request carries the id. The location
  module's own requests go to the API only and keep both headers.

**Not changed, stated.**

- *Android "online" is `NET_CAPABILITY_VALIDATED`.* On a network where the system's validation never succeeds (a captive portal, some private
  or corporate networks, a network that blocks the connectivity check) the driver reads as offline (`turn_off_mobile_data`) while positions
  may still reach the API.
- *A condition open at a clean stop* (GPS off, offline, battery saver) is kept open on disk and closed at the next start, with a duration that
  spans the untracked time (from the two wall times); between the stop and the next start the server's state keeps its old value. Closing
  them at the stop would send events for something that did not happen (the condition did not end), so it was not done.
- *Android, a swipe-away* is reported as `tracking_stopped` with reason `system` at once (the service is destroyed and its last events are sent
  then), not at the next start; only a kill the service never sees is reported at the next start, with the heartbeat's time.
- *Android timers.* The executor's delays use `System.nanoTime`, which does not advance in deep sleep: a retry, the minimum-interval wait and the
  events' debounce may fire late after the device slept (never early); the interval itself is measured with `SystemClock.elapsedRealtime`, which does.
  The next fix or network callback wakes the worker anyway. The module takes no wake lock.
- *iOS `start` / `stop`* are called on the main thread and wait on the sender's serial queue (`state()`), a few milliseconds of disk I/O.
- *`Retry-After`* is read as seconds only (an HTTP-date is ignored) and only on a 429 or 503.

### Logs

Both platforms write the same lines, so a run can be read the same way. The core never logs (it only
passes events: `onRequest`, `onRetryScheduled`, `onDiscarded`, ...); the platform layer writes the lines.

| | Android | iOS |
|---|---|---|
| Writer | `android.util.Log`, `DriverLocationService.kt` (`Forwarder`), `DriverLocationRuntime.kt`, `DriverLocationModule.kt` | `os.Logger`, `DriverLocationBridge.swift` |
| Filter | tag `DriverLocation` | subsystem `co.ordering.driverlocation`, category `DriverLocation` |
| Levels | all `I`, failures `W` | `info` for what happens on every position (fix, request, answer), `notice` for the rest, `error` for a refused start |

| Line | Meaning | Debug build adds | Release build |
|---|---|---|---|
| `configured (distance=25.0 m, [interval=.. ms, fastest=.. ms,] maxQueue=500, discardOlder=true, rejectMock=false, minSendInterval=1500 ms, sendLocationAt=true, events=true)` | `configure` accepted | | the same (numbers and flags, never the url, headers or extras) |
| `tracking started (distance=25.0 m, [interval=.. ms,] queued=N)` / `tracking stopped` | `start` / `stop` | | the same |
| `location accepted` | a position passed the mock policy and was queued | ` lat=.. lng=.. mock=..` | no coordinates |
| `request queued=N` | a request is about to be made; N positions queued | ` body={"location":{"lat":..,"lng":..,"v":"1.0"},["location_at":"..",]"driver_id":..}`, the exact body | queue size only |
| `http 200 success=true` | the API answered | | the same |
| `retry in 5000 ms (network error)` / `(http 503)` + ` queued=N` | a retry was scheduled (5 s, 15 s, 60 s, then 60 s) | | the same |
| `send in N ms (min interval) queued=M` | a request is due but the minimum send interval has not elapsed; it goes out in N ms with the newest position (once per wait; never written when the interval is 0) | | the same |
| `discarded N older positions` | a success dropped N older queued ones ("latest wins"); only when N > 0 | | the same |
| `state mock_rejected` / `unauthorized` / `authorization_changed` / `services_enabled` / `services_disabled` | what JavaScript gets in `onState` | | the same |
| `network available: flush` (Android also `network validated: flush`) | connectivity came back | | the same |
| `event <name> queued=N` | a tracking event was stored (names only, never the body) | | the same |
| `events request n=N queued=M` / `events http S n=N` | a batch of N events is about to go / the API answered S | | the same |
| `events retry in N ms (network error \| http S) queued=M` | the events' retry (5 s, 15 s, 60 s, then 60 s) | | the same |
| `events dropped N (queue full \| http S)` | N events will never be sent: the cap dropped the oldest, or the API answered a 4xx for that batch (`W` on Android) | | the same |
| `tracking stopped by the system (no clean stop)` | the recorder found a session the process left without a stop | | the same |
| Android only: `task removed, stopping`, `location permission missing / lost`, `cannot enter foreground: ..`, `start refused: ..`, `connectivity callback not registered: ..` | the service's own refusals | | the same (exception class names only) |
| Android only: `state unauthorized ignored: not the running service` | an OLD run's sender said it late (a request still in flight at a logout): it stopped nothing and JavaScript did not hear it | | the same |
| iOS only: `start ignored: not configured` | `start` before `configure` | | the same |

The queue size is on `request` and on every `retry`; there is no separate "queue size" line. Before
2026-11-17 Android wrote no line for `configured`, the request, the retry and its delay, the discard,
or the authorization and services changes, and iOS wrote none at all; none of the lines Android did write
carried anything sensitive in a release build (coordinates were already debug-only), so nothing had to be
removed.

How to read them:

- Android: `adb logcat -s DriverLocation` (add `-c` first to clear). `adb logcat -d -s DriverLocation` to dump.
- iOS simulator: `xcrun simctl spawn <udid> log stream --level info --style compact --predicate 'subsystem == "co.ordering.driverlocation"'`
  (`--level info` is needed to see the per-position lines; `log show --last 5m --info --predicate ...` for the past).
- iOS in Console.app: select the device or simulator, Action menu, "Include Info Messages", filter `subsystem:co.ordering.driverlocation`
  (or `category:DriverLocation`). On a device the debug build's coordinates are written as public values; a release build never writes them.

## 4. What changes in the projects

- Removed: `react-native-background-geolocation`, `react-native-background-fetch`, the
  three `maven {}` blocks and the plugin's `app.gradle` / proguard lines in
  `android/`, the licence `meta-data`, `BGTaskSchedulerPermittedIdentifiers`
  (`com.transistorsoft.fetch`), the `fetch` background mode if nothing else uses it,
  `NSMotionUsageDescription`, their Jest mocks.
- Kept: the location permissions and usage descriptions, the `location` background mode,
  `FOREGROUND_SERVICE_LOCATION`, `POST_NOTIFICATIONS`.

## 5. Tests (what "well tested" means here)

1. **Unit, on the pure parts** (JVM and XCTest): the body equals today's byte for byte;
   queue order, bound and persistence (sequence numbers survive a restart; an old queue file
   without them still loads; the owner url is stored); the backoff sequence; 2xx / 401 / 4xx / 5xx /
   network error each do what §3 says; **the body has no `mock` key, whatever the fix says** (one test per core pins its absence); mock dropped in release whatever `rejectMock` says, sent as real (no `mock` key, event keeps `mock: true`) in debug, dropped and reported in debug with `rejectMock`, a real fix unaffected, `rejectMock` switched at run time with `configure`; **latest wins**: five locations queued
   offline then online send exactly one request carrying the newest and leave the queue
   empty; a newer location arriving while a request is in flight survives its success and is
   sent next, the older ones gone; a retry after a 5xx sends the newest of that moment; a 4xx
   drops only that location and the next newest is tried; a restart sends the newest; a
   location older than the last one sent is dropped on arrival; with the option off every
   FIFO test passes unchanged; switching the option with `configure` at run time; **owner**:
   a new sender over the same directory with another url starts empty and sends nothing, with
   the same url keeps and sends the queue, and `configure` with another url clears it;
   408/429 are retried; concurrency in both modes (nothing sent twice, nothing older after
   something newer in latest wins);
   **the two send options** (`MinSendIntervalTest` / `MinSendIntervalTests`, `LocationAtTest` / `LocationAtTests`, a fake clock and scheduler): 0 = unchanged, two fixes inside the interval give one request and then one with the newest at the interval, no pending fix no request, the interval counted from the start of the request, a failed request and its retry (backoff longer, interval longer), a new fix after a failure, the paced flush in both modes, a reconnect inside the interval, stop cancels the timer, start after stop, a 401, an interval changed while waiting; `location_at` off is today's body, on is the fix's own time (late, from the queue, after the interval), the boundaries (year, leap day, 2100, 1900, 2038, negative), another time zone's local midnight, locales with other calendars and digits;
   `configure` with a new token swaps the header; the listener / delegate hears the request (exact body, queue size), every retry with its delay and cause, and a discard with its count only when older positions were dropped.
2. **JavaScript** (Jest, the wrapper mocked at the native boundary): the run plan
   starts and stops it; one subscription after several token changes; one logout on
   401; the dialogs for "services off" and "permission lost".
3. **Against the local API** (`http://localhost:8080`, project `development`, the test
   driver): a location sent by the native sender is accepted and is the driver's
   position afterwards (read back through the API or the local database), on both
   platforms.
4. **Emulator and simulator**, a simulated route (Android `adb emu geo fix` / a GPX;
   iOS `simctl location start`): positions arrive with the app in the foreground, in the
   background and with the screen off; network off for 3 minutes then on (the queue
   arrives in order); the JavaScript bundle reloaded mid-route (sending goes on); the
   token revoked (one logout, the sender stops); a mock location in a release build is
   not sent (`mock_rejected`), in a debug build it is sent as real and stored, and in a debug
   build with `rejectMock` it is not sent.
5. **Real phones, by the owner** (an iPhone, a Pixel-class Android, one phone with
   aggressive battery management): the same list on a real route, plus one hour of an
   active shift with the battery drop noted against the build with the SDK.

Nothing is called done from step 4 down until it has been run and its result written in
`docs/theme/verification.md` with the platform and the build.

## 6. What the iOS check must look at (the two send options, 2026-11-19)

Built and unit-tested on iOS (`swift test`, `xcodebuild` Debug for the simulator); **not run** on the simulator or a phone yet.
When it is run, with a Debug build and `xcrun simctl location start` / a GPX, read `log stream --level info` (subsystem
`co.ordering.driverlocation`) and the API's access log:

- `configured (... minSendInterval=1500 ms, sendLocationAt=true)` once the driver is signed in, and again (no `tracking started`
  line, no restart of the updates) when a project config changes.
- Positions arriving faster than 1.5 s (`simctl location start --speed` with a short distance filter, or several `simctl location set`)
  give `send in N ms (min interval)` and requests whose starts are never closer than 1500 ms; after the last position, one more
  request with the newest one, without another fix.
- The body in the Debug log: `"location_at":"..."` right after `location`, the UTC of the fix (compare with `date -u`), and no
  `location_at` with the config set to `'0'`.
- **In the background and with the screen locked** (the part a unit test cannot show): that the `send in` timer fires on time
  while the `location` background mode keeps the process running, and what a stationary phone does with a pending send; the iOS
  guarantee is the one of the retry backoff (section 3), so look for a pending position that waits for the next fix instead of
  the timer. A real phone, by the owner.
- A phone whose language, region and calendar are not Gregorian / Latin (Arabic, Thai Buddhist) still sends the ASCII text.

## 7. What the next device check must look at (the review's fixes, 2026-11-19)

- **The device id only to the API.** On both platforms: the API's access log shows the id (a shape, never the value) and the detailed
  User-Agent on fetch, positions and events requests; a request to another host (Google's static maps, the CDN's images) carries the
  User-Agent and no id; the orders list's logos and the map's marker image still load; an upload to the API still works. A launch before the
  first unlock on iOS (a push after a restart): the first request after it can be read carries the id.
- **Logout, sign in at once (Android).** With a slow network, log out and sign in again within seconds: no second logout, one
  `tracking_stopped` (`logout`) then one `tracking_started`, no `system` / `restart` pair; `adb logcat -s DriverLocation` shows `state unauthorized
  ignored: not the running service` if an old answer arrived late.
- **A token refresh mid-request.** `configure` with a new token while a position request is in flight: no logout, the next request carries the new token.
- **iOS, the stop's event.** Stop tracking while a position request is slow or failing: `events request n=1` follows the position's answer and
  the `tracking_stopped` arrives at the API without a new start.
- **iOS, a restart after an offline session.** Switch Wi-Fi off, wait, stop, start on Wi-Fi: no `turn_off_mobile_data` at the start, no
  `turn_on_mobile_data` two seconds later (unless the previous session's opening is still recorded as open, which closes it, with its duration).
