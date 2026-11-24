# Phase 10: verification

Date: 2026-11-14 · Status: **partial**. The automatic checks pass; the screens behind the login were seen on both platforms in the round 3 pass (§7) and again after the layout and skeleton decisions (§8). Branch `feature/theming-native`,
schema `driver_app` 1.0.0 (not published). **The redesign of the whole app of 2026-11-18 (§16) was seen on both platforms in three passes and an iOS check; one check on Android is pending.**

## 1. Automatic checks

Run locally on 2026-11-13 after the last commit of this pass, and by
`.github/workflows/ci.yml` on GitHub (run 43478373219, Node 22): every step passes there
except the publish dry run, which runs last and failed for the missing secret (that was on 2026-11-13; since 2026-11-23, when the owner granted this repository the organization's publish secrets, the gate is green with the dry run included: run 45262296490 on `16c25d4`).

| Check | Command | Result |
|---|---|---|
| Schema valid | `pnpm theme:validate` | `product.schema.json 1.0.0 is valid` |
| Compiled file up to date | `pnpm theme:verify` | up to date |
| No design literal (every category, sizes included) | `pnpm theme:guard` | 0 literals, no baseline; the exceptions with their reasons in `theme-exceptions.json` |
| Every key has a reader | `pnpm theme:keys` | every key has a reader; 40 read through a variable ([readers.md](readers.md)) |
| Extreme themes, resolved as the API serves them | `pnpm theme:extremes` | 16 of 16 (square, pill, light primary, dark surfaces, no shadows, larger text, the ten fonts) |
| Types | `npx tsc --noEmit` | 0 errors |
| Lint | `pnpm lint:check` | JavaScript and TypeScript are linted (they were not: only `.js` was parsed): 0 errors, 156 warnings left on purpose (`react-hooks/exhaustive-deps` 108, `no-shadow` 34, `eqeqeq` 5, inline styles 4, bitwise 4, 1 other): fixing them changes behaviour |
| Tests | `pnpm test` | 121 suites, 1 191 tests pass; coverage 87 % of statements |
| Translations | `pnpm i18n:verify` | the catalog matches the code; the 11 locales are filled |
| The engine resolves in release bundles | `npx react-native bundle --dev false` (ios, android) | both build (6.1 MB of JS each, before Hermes bytecode) |
| Native builds | Xcode 27.2 (iPhone 17 simulator, iOS 27.2); Gradle with JDK 17 (`assembleDebug`) | both build and launch |
| Publish dry run | `pnpm theme:publish:dry --required` | needs the `THEME_PUBLISH_KEY_PRODUCTION` secret: **it failed in CI as designed until 2026-11-23 and passes since** (the organization's secret reaches this repository: run 45262296490); never run by hand |

## 2. Tests

What the method asks to be covered, and where it is:

- the helpers on the engine's view (a border, a shadow, a text by its weight's file and
  never `fontWeight`, a radius that follows Identity and one that stays, images `{ uri }`
  or bundled): `src/theme/__tests__/theme.test.ts`;
- the fonts: every catalog font × weight has its file in `src/assets/fonts`, the Android
  assets and `Info.plist`, under the name `toNative` paints with: `theme.test.ts`, "fonts";
- the rules no token gives: a shadow dropped on a see-through background, the space
  under a bottom bar with an inset of 0, card borders
  (`src/theme/__tests__/boxAndClearance.test.ts`); the border reserved across a field's
  states (`shared/__tests__/OInput.test.tsx`);
- the request sends `theme_version=2`, `product_type=driver_app` and the
  `theme_schema_version` of the compiled file; another product's envelope paints the
  defaults: `theme.test.ts`;
- the cache: per project and schema version, a corrupt entry dropped: `theme.test.ts`;
- extreme themes complete and every helper paints; reduced motion turns the theme's
  motion off: `theme.test.ts`; `scripts/theme/extremes.mjs` in CI;
- old binaries (a theme cut down to a previous version): not applicable, 1.0.0 is the
  first version.

## 3. On devices

Debug builds loading their bundle from Metro, with the build's default theme (no theme
is served for `driver_app`: the schema is not published).

| Seen | iOS (iPhone 17 simulator, iOS 27.2) | Android (emulator, API 37, 411 dp wide) |
|---|---|---|
| Launch, splash | ✔ | ✔ |
| Tutorial (five slides, Skip, Next, Let's start) | ✔ first and last slide | ✔ slides 1, 2 and 5 |
| Welcome | ✔ | ✔ |
| Login (email and OTP tabs), the empty-form error state and its toast | ✔ login | ✔ both tabs, the error state, typing |
| Forgot password | — | ✔ |
| A field keeps its text in place when it turns to error | — | ✔ measured: the same pixel at rest and in error |
| Width of 320 dp (density override) | — | ✔ welcome and login: nothing clipped or wrapped |
| The app relaunches after the last fixes | ✔ | ✔ |
| Login after round 2: the password eye, the password field as tall as the e-mail's (44 pt, measured) | ✔ | — |

The system's own dialogs (location, physical activity, Google's location accuracy) are
the platform's. Screenshots: `.theme-audit/screens/` (not committed).

### With a session and a served theme (2026-11-13, iOS only)

iPhone 17 simulator, debug build, the **local API** (`http://localhost:8080`, project
`development`, a test driver account). The schema `driver_app` 1.0.0 was registered in the
local API and a test theme (primary color changed) written for a local driver site.

| Seen | Result |
|---|---|
| Login with e-mail and password | ✔ |
| Orders tab (header, tabs, an order card with its logo, number, timer and badges) | ✔ |
| Order details (the bar's icons, the unread count, the header with the status badge, the collapsed cards, the bottom bar with accept over reject) | ✔ |
| **A served theme reaches the app**: asked, cached and painted on the next launch (the selected tab and the status badge in the served primary color) | ✔ |

This is a first look, not the verification: every screen is gone through once, on both
platforms, after the React Native upgrade (decision U1).

## 4. Not verified

By name, so nobody takes it as seen:

- **Every screen behind the login, on both platforms**: orders (tabs, cards, search,
  assign requests), order details and the assign-request detail, accept / reject and the
  delivery PIN, the map tab and an order's map, messages and the chat, the review,
  profile, sessions, payouts, Stripe, the schedule and the schedule-blocked screen, the
  new-order dialog, the connection dialog. No test driver account was available.
- So also: whether the defaults reproduce today's look on those screens, the visible
  changes of [decisions.md](decisions.md) ("Phase 7"), and the findings of
  [harmony.md](harmony.md) that need a device.
- Push (received and opened in the three app states), deep links and background location
  after the iOS scene lifecycle change, on a real device.
- A served theme and the extreme themes **on a device**: they need the schema registered
  in a development API (the extremes are only checked by script).
- Each catalog font on a device (only Poppins, the default, was seen).
- The system's largest text size, reduced motion, right-to-left, landscape.
- Widths of 320 and 360 beyond the welcome and login screens; a narrow iPhone.
- Android with the three-button navigation bar (seen with gestures only); Android's new
  architecture (the app ships the old one today).
- Offline launch from the cache and a first launch offline: both need a release build.
- A build made by the Builder, and the publish workflow.
- Performance on a device: [PERFORMANCE.md](../PERFORMANCE.md), "To measure".
- The publish workflow itself (the dry run passes since 2026-11-23; the first publish happens when pull request #1 merges).
- Whatever builds the app outside this machine needs Node 22 or later (the theme engine
  requires it): the Builder's driver pipeline was not checked.

## 5. The driver location module (Android)

What was run, on what build, what was seen, what was not. Module: [LOCATION_MODULE.md](../LOCATION_MODULE.md).

**Setup.** AVD `Medium_Phone_API_37.0` (API 37, Google APIs, arm64), JDK 25 of Android
Studio, Metro on port 8082, the local API (`http://localhost:8080`, project `development`) through
`adb reverse`, the test driver. Builds: the debug APK (Metro) and the release APK (Hermes bundle,
debug keystore: the project's release signing config is the debug one). Location permissions were
the app's own prompt ("While using the app", no background permission) except the notification
and local-network ones. Positions were fed with `adb emu geo fix` (about 66 m apart, one every
42 s because the module asks the system for one every 40 s at most: its real configuration,
not shortened). The sender's own log lines (`DriverLocation` tag) are the evidence on the device,
the driver's stored position (`GET /users/{id}?params=location`) on the server. The test driver is
shared with other agents' clients: the stored position was therefore read in a poll that prints
each change with the time, and a foreign position (iOS simulator, Bogota) is seen between ours.

| Check | What was done | What was seen | |
|---|---|---|---|
| Native sender, local API | Logged in; the module configured itself, the service started | `tracking started (distance=25.0 m, interval=40000 ms)`, a position accepted and `http 200`; the stored position equalled the one sent (`37.4219983,-122.084`, `mock:false`) | ✔ |
| (a) Foreground | Route of 4 points | 2 of 4 reached the sender (the system delivers at most one per 40 s), each `http 200`, the stored position followed | ✔ |
| (b) Background | Home pressed (launcher focused), 3 points | 3 accepted, 3 `http 200`, the stored position followed (`37.426` to `37.4271983`) | ✔ |
| (c) Screen off | `input keyevent 26` (`mWakefulness=Asleep`), 3 points | 3 accepted, 3 `http 200` while asleep. The server read-back of that run was overwritten by another client, so the proof there is the sender's log | ✔ (log) |
| (d) Outage | Wi-Fi and data off, `adb reverse` removed (the API unreachable; confirmed from the device with `nc`), 5 points over 4.5 minutes, then everything back | During: 5 positions accepted, **no** `http` line, the queue file held 5 lines, the stored position did not move. After: `network available: flush` and **one** `http 200`; queue file **0** lines; stored position = the newest (`37.435`). Latest wins as specified. *A first attempt did not block the API (the removal had not taken effect): its result is not counted* | ✔ |
| (e) Reload mid-route | Dev-menu Reload (twice, the second with the final code), same process id `9880` | `Running "deliveryApp"` and `Driver location is configured and ready` again; **no** `tracking stopped` / `started`; the next positions `http 200`. (A first run showed the run plan stopping the service for a second on every start because the session and permissions begin empty: fixed, tests added.) | ✔ |
| (f) Token revoked | The app's session deleted through the API (`DELETE /users/{id}/sessions/{id}`, only the app's) and a position fed | `http 401`, **one** `state unauthorized`, 2 s later `tracking stopped`; the app showed the welcome screen; no more requests. The rejected position stayed in the queue and was sent after the next login (same driver) | ✔ |
| (g) Notification | `dumpsys notification` and the shade | While tracking: channel `driver_location`, `ONGOING_EVENT|FOREGROUND_SERVICE`, title "Background tracking enabled", text "Important for delivery real time location", the app's small icon. After logout: none | ✔ |
| (h) Is a `geo fix` mock? | `isMock` of the emulator's `geo fix` positions | **false** (logged `mock=false`): the emulator's GNSS is not a mock provider. A real mock needs the test provider: `appops set 2000 android:mock_location allow`, `cmd location providers add-test-provider gps`, `set-test-provider-location` | info |
| Mock, debug (owner's rule) | Test-provider positions, debug build, default config | `location accepted ... mock=true` (the event keeps the truth), `http 200`, the body carries `mock:false` and **the position is stored** | ✔ |
| Mock, debug with `rejectMock` | Same, with the option temporarily set in the hook (not committed) | `state mock_rejected` twice, no request | ✔ |
| Mock, release | Release APK (see the note), test-provider positions, then real ones | Mock: `state mock_rejected` twice, no request. Real: `location accepted`, `http 200`, stored | ✔ |
| Location services off | `cmd location set-location-enabled false` | Google's own "No location access" dialog and, under it, the app's `DriverLocationDialog` ("Mobile location off", "Enable location for tracking your orders", Cancel / Open Settings); Open Settings opened `Settings$LocationSettingsActivity`; on again, the dialog was closed | ✔ |

**Release build note.** The release manifest forbids cleartext traffic, so a release build cannot reach the
local `http` API. The release test used a build identical to `assembleRelease` plus a temporary manifest overlay
that allowed cleartext (never committed, removed). The shipped `assembleRelease` (without it) was built and
launched: it stays on the splash screen against the local API (no `https`), as any release build would.

**Server rule.** The server answers 200 and stores nothing for `mock:true` (checked with `curl` on the local API);
with the owner's rule the body's `mock` is always `false`.

**Other findings.** `ACTIVITY_RECOGNITION` is gone from the merged manifest and from `PermissionsContext`.
`android.newDsl=false` stays: with `-Pandroid.newDsl=true` the build fails at once (`org.jetbrains.kotlin.android`
cannot be cast to the new extension; `react-native-vector-icons/fonts.gradle` also uses `applicationVariants`): the SDK's `app.gradle` was not the only reason for it. The JavaScript POST (`updateDriverLocation`) was removed after (a) to (e) had passed;
its "refresh" was the same POST, replaced by the module's own first position at start and `flush()` when the app
comes back to the foreground. On API 37 the app asks the user for "nearby devices" (local network) at first launch (a library permission, not the module's).
Google's "Location Accuracy" dialog still appears from the JavaScript `react-native-geolocation-service` calls of other screens (not the module's).

**Checks.** Core: 117 JVM tests. Jest, `tsc`, lint, theme and i18n scripts, `assembleDebug`, `assembleRelease`
and the JavaScript release bundle: see the commit log of the branch and the report of this work.

**Not verified.** A real phone; OEM battery managers (Xiaomi, Samsung, Huawei) and Doze; runs longer than a few
minutes and battery; Android versions other than 37; the background permission ("Allow all the time") is neither
requested nor needed by a service started in the foreground, but a start from the background (Android 12+) is refused
and was only covered by unit tests of the hook (it starts again when the app returns); the service being killed by
the system under memory pressure (it is `START_NOT_STICKY`: it does not come back until the app starts it); iOS.

## 6. After the upgrade and the location module: joint device run

*Read this section as a dated log. Its statements that a driver with "While Using" only is not tracked (check 2, the first open
finding and the not-run list below) were true and seen then; the owner decided otherwise on 2026-11-19 and the rule changed:
with "While Using" the module tracks, and only a denied or restricted permission stops it (section 16, "Fifth round" and "Last
fixes of the day"; [decisions.md](decisions.md)).*

Date 2026-11-13. What was run: the merged branch (React Native 0.88.1 with the new architecture, the app's own
driver location module on both platforms with no old SDK, React Navigation 7, react-hook-form 7, dayjs in place of
moment) on **both devices at once**, against the local API (`http://localhost:8080`, project `development`, the test
driver). Build: **Debug** on both (iOS: iPhone 17 simulator, iOS 27.2, `xcodebuild` Debug; Android: AVD
`Medium_Phone_API_37.0`, `:app:assembleDebug`), Metro on port 8082 with a cleared cache; `Podfile.lock` rebuilt
(`rm -rf Pods && pod install`) with no `RNBackgroundGeolocation`, `RNBackgroundFetch`, `TSLocationManager` or
`TSBackgroundFetch`. **Theme:** the local API serves a test theme whose primary color is purple, and it **painted**
on both platforms (the active tab, the primary buttons, the "Pending" chips, the focused fields are purple;
screenshots below). The device clock and zone: Bogota, UTC-5. Screenshots are in `.theme-audit/screens/joint/{ios,android}/`
(git-ignored); the API's access log (`docker logs apiv4-api-1`) is the evidence for what each device sent, since the
iOS module writes no log line of its own (see "Findings").

**One defect found and fixed in this run** (commit `fix(dates): do not extend dayjs with customParseFormat ...`): the
merge's `src/utils/dayjs.ts` extended dayjs with `customParseFormat`. A dayjs plugin is global, so the logic
submodule's `parseDate` (which reads every API date with `dayjs.utc(text, [formats])`) changed with it: dates came out
in UTC instead of the device's time (`17:29` for a `12:29` local delivery), the order card's timer was off by the
device's offset (`- 154 day 23:19` where `- 155 day 04:19` was right), and `parseDate(aDate)` answered "invalid
format": the orders search's presets sent `"invalid format 00:00:00"` to the API, the custom range showed
"invalid format ~ invalid format", the connection dialog's "Last update" and the schedule's title too. Fixed by
dropping the plugin and reading the search's `MM/DD/YYYY` days by `parseSearchDay`; three tests pin `parseDate`'s
readings with the app's dayjs (they fail with the plugin on). After the fix (JavaScript only, Metro reload): the card
shows `11/06/2026 12:29PM` and `- 155 day 04:35` at 22:20 UTC (expected: delivery 17:29 UTC + 15 min eta, 22:20:23 UTC now =
155 d 04:36, cut to the minute shown), the range `10/11/2026 ~ 12/11/2026` (the project's format) sends
`11/10/2026 00:00:00` to `11/12/2026 23:59:59` (the API's), "Today" sends `11/13/2026 00:00:00` to `... 23:59:59`, the
connection dialog says `13/11/2026 05:19PM`, the sessions list shows the device's time. The shots before the fix
(`ios/37-calendar-to.png`, `38-range-selected.png`, `39-date-sheet.png`) keep the defect.

### Part A: the location module on iOS, with the real JavaScript and no old SDK

| Check | iOS | Evidence |
|---|---|---|
| 1. Builds, launches, session kept, no redbox, no old pods | ✔ Debug build succeeds; launch with the stored session; `Podfile.lock`, `Podfile`, `project.pbxproj` and `Info.plist` have no old SDK name | `ios/01-launch.png` (orders list, purple), `grep` of `ios/` (outside `Pods/`, `build/`) finds only the core's README, and in `src/` only the names `getBackgroundGeolocationRunPlan` and a test asserting the SDK is not imported |
| 2. Tracking starts by itself; the permission flow | ✔ with "Always" granted. Flow on a fresh install: (1) the system location prompt "Allow Once / Allow While Using App / Don't Allow" (the app asks for `LOCATION_ALWAYS` and `LOCATION_WHEN_IN_USE` together), (2) the app's own alert "Enable persistent notifications" (Later / Go to settings), which comes back after every launch and login. **"While Using" only: nothing happens**: `isGrantedPermissions` stays false (the permission module reports "Always" as not granted), the hook never configures or starts, **no dialog is shown**, no position is sent (0 `POST .../locations` in 10 minutes; `03-whileusing-no-dialog.png`). With "Always" (`simctl privacy grant location-always`, the app re-reads on foreground): tracking starts with no tap on the map tab, and the status bar shows the system location arrow (`05-route-foreground.png`) | not fixed: a product decision (ask for "Always" again, or accept "While Using" as Android does) |
| 3. A simulated route (`simctl location start --speed=20`) | ✔ foreground, Home, locked: one `POST /users/6/locations` about every 2 s in each phase (13 and 13 requests in two 25 s windows, `200`, `User-Agent deliveryApp/1 CFNetwork`, `"mock":false`); the stored position followed (`37.4036` ... `37.4123`, `mock:false`); the arrow stays in the status bar on the home screen | `06-route-home.png`, `07-route-locked.png`, `loc.sh` over the API log |
| 4. Log out, log in | the **Profile "logout" button cannot be used with this driver**: the app refuses it ("Can't logout, You have assigned orders", the test driver has 2 pending and 2 picked-up orders; `08b.png`), an existing business rule. Logout was done as in 6 (the session revoked): the sender stopped at the `401`, the arrow went. **Log in** (e-mail and password, the keyboard's "done"): tracking started at once, on the orders tab, no visit to the map; first request 6 s later | `09-after-revoke.png`, `15-after-login.png` |
| 5. A JavaScript reload mid-route | ✔ `Metro /reload` at 21:59:08: requests every 2 s with no gap (21:58:55 ... 21:59:33, no missing second), the app came back on its own | API log. One set of listeners is shown by 6 (one logout). The JavaScript runtime cannot be read (see "Not run") |
| 6. Session revoked through the API | ✔ `DELETE /users/6/sessions/{id}` with the app's own token: the next position got `401` (22:00:47), **one** logout (the welcome screen, `09-after-revoke.png`), no request in the next 15 s | API log |
| 7. Authorization "Never" | ✔ `simctl privacy revoke location`: the app (same process, not killed) showed its own themed dialog "Mobile location not enabled / Enable location for tracking your orders" with "Cancel" and "Open Settings" within 6 s, the arrow went, no more requests; "Open Settings" opened the system Settings (its root: it has a "deliveryApp" back link); `grant location-always` and back to the app: the dialog was closed, tracking resumed at the next fix (22:04:47) | `17-after-revoke-location.png`, `18b-settings.png`, `19-granted-again.png` |
| 8. Nothing of the old SDK left | ✔ no `transistorsoft`, `TSLocationManager`, `BackgroundFetch`, `BackgroundGeolocation` in `ios/` (outside `Pods/`) or in JS; `Info.plist` background modes are `location` and `remote-notification` only | greps |

### Part B: the module on Android after the merges

| Check | Android | Evidence |
|---|---|---|
| Rebuild, install, session kept, tracking by itself | ✔ the app started on its stored session; logcat `DriverLocation`: `tracking started (distance=25.0 m, interval=40000 ms, queued=0)`, `location accepted ... mock=false`, `http 200` | `android/02-after-gms.png` |
| `adb emu geo fix` x3, 42 s apart | ✔ three positions accepted, three `http 200`; the stored position followed (`37.5499983`, `37.5506983`, `37.5514`, `mock:false`) | logcat, `pos.sh` |
| The foreground notification | ✔ `dumpsys notification`: channel `driver_location`, `ONGOING_EVENT|FOREGROUND_SERVICE`; after the session was revoked no record and no service | |
| Stops at logout | ✔ by the revoked session (the profile button is blocked as on iOS): `http 401`, one `state unauthorized`, 0.6 s later `tracking stopped`, the welcome screen; after the next login the held position was sent (`http 200`) | logcat, `android/15-after-revoke.png` |

### Part C: navigation 7, forms 7, dayjs, on both platforms

| Check | iOS | Android | Evidence |
|---|---|---|---|
| Tab bar: first frame, labels, icons, safe area, the four tabs | ✔ height, labels, icons; the bar paints down to the home indicator; Orders and Profile seen (Messages and Map: not opened on iOS) | ✔ the bar sits above the gesture bar and paints to the bottom; Orders, Messages, Profile seen. **Map view**: switching to it raises Google's "Location Accuracy" dialog every time ("No thanks"); the map itself was not inspected | `ios/05-route-foreground.png`, `android/tab-Profile.png` |
| Profile reset: edit a field, switch tab, return | ✔ read mode, the name back to "Driver" | ✔ the same | `ios/22-...`, `android/06-profile-after-switch.png` |
| Sessions from Profile and back: not remounted | ✔ the edit mode stayed (Cancel / Update visible) | ✔ with the hardware back; edit mode kept | `ios/24-back-from-sessions.png` |
| Orders, details, chat, back, back | ✔ each back lands on the previous screen | ✔ the same | `ios/25-order-details.png`, `26-chat.png`; `android/08`, `09`, `10` |
| Android hardware back from the deep stack | | ✔ chat, details, orders; the back at the first tab leaves the app to the launcher (tracking goes on); from "Reject Order": the first back hides the keyboard, the second closes the screen | |
| "Go to my orders" from the not-found state | ✔ reached with a simulated push (`simctl push`, `order_id` 99999999, tapped from the banner): the state shows the raw key **`ERROR_ORDER_FIND`** as its text (the toast beside it is translated; `28-notfound.png`), "Go to my orders" lands on the Orders tab, nothing under it (an edge swipe changes nothing) | not run: no way to push on the emulator | `ios/28`, `29`, `30` |
| Accept / reject opens and closes | ✔ "Reject" opens "Reject Order"; the keyboard comes up with the comment field below the fold on opening (a scroll shows it with its caret, `33-reject-scrolled.png`); the bottom bar rides above the keyboard; back closes it | ✔ same; the bar paints to the bottom; Google's dialog covers the screen at first | `ios/32`, `33`, `34`; `android/11`, `12` |
| Login: empty, malformed e-mail, valid, "done" submits | ✔ toast "- The field Email is required / - The field Password is required" and red fields; "- Invalid email address"; valid credentials log in; the keyboard's "done" submitted each time | ✔ the same, with the Enter key | `ios/11`, `13`, `15`; `android/16`, `17` |
| Forgot password: invalid, then valid | ✔ invalid: red field and "- Invalid email address"; valid: `POST /users/forgot`, the button becomes "Link Sent" and the toast "Your link has been sent to the email: ..." (once) | not run (once only, as asked) | `ios/51`, `53` |
| Profile: name saved and restored; mismatched passwords | ✔ the name saved (`POST /users/6`, the API read back `DriverQ`; restored through the API to `Driver`); mismatched passwords: the field error "The passwords do not match" and the toast, **no request** | ✔ saved ("Update successfully" toast, API read back `DriverQ`, restored); mismatch: the same error and toast, no request | `ios/47`, `50`; `android/19`, `20` |
| Dates: the card's timer, the range, the calendar sheet | the timer was wrong before the fix and right after it (see above); the range and the API's format right after the fix; the calendar sheet opens, picks "From" then "To", and its month is right (13 Nov 2026 is the Friday marked) | the same (`android/13`, `14`) | `ios/36`, `38`, `40`, `41`; `android/14` |
| Redbox, navigation or forms warning, crash | none seen. The LogBox pill "Open debugger to view warnings" is on screen on both platforms after launch; its warnings could not be read (see "Not run") | same | |

### Part D: what was still standing

`npx tsc --noEmit` 0 errors; `pnpm lint:check` 0 errors (156 warnings, as before); `pnpm test` 127 suites, **1265**
tests (1262 + 3 new); `pnpm theme:guard` 0 literals; the iOS and Android release bundles
(`react-native bundle --dev false --minify true`) build; `:app:assembleDebug` succeeds; the iOS Debug build succeeds
(`xcodebuild`, simulator).

### Findings left open (not fixed here)

1. **iOS, "While Using" only: silent.** The driver who grants only "While Using" is never tracked and is not told
   (above, check 2). Android treats `when_in_use` as enough (the foreground service), iOS does not.
2. **The calendar sheet is narrow and wraps "Mon" and "Wed"** on both platforms (`ios/36-calendar.png`,
   `android/13-calendar.png`): the seven columns take about 160 pt of a 402 pt sheet and the two widest weekday names
   break onto two lines ("Mo n", "We d"). `OCalendar`'s container is `alignSelf: 'center'` with no width, so it shrinks to its
   content; unchanged by the merge (the diff of `OCalendar.tsx` is only the library), so it predates it.
3. **Android: a full-screen `OModal` page (the orders search) draws its header under the status bar** (the arrow and the title
   beside the clock, `android/14-range.png`; the iOS one is right). The modal's window has no top inset on API 37.
   Not caused by the three merges (the component is not in their diff); it needs a look at `OModal` on Android.
4. **The not-found state writes the raw key `ERROR_ORDER_FIND`** under the picture (the error text is not translated;
   the toast is). Not from the merges.
5. **The iOS module writes no log line** (Android has the `DriverLocation` tag): the iOS evidence had to come from the API's
   access log and the status bar. A few `os_log` lines (started, stopped, accepted, `http` status, unauthorized) would make the
   next run directly readable.
6. **The Profile "logout" button is blocked while the driver has an assigned order** (server rule: the app's `getActiveOrders`
   statuses include `0` and `8`), so with the test driver a logout can only be tried by revoking the session.
7. The status pill goes red ("Disconnected") after a Metro reload on iOS and stays so for the rest of the session; green after
   a fresh login. Not investigated.

### Not run

- On a **real phone** anything (background lifetime, the blue status-bar pill, battery, Low Power Mode).
- **The JavaScript runtime's own console**: Metro's inspector refused a debugger connection (`401 Unauthorized` on
  `/inspector/debug`), so "one set of listeners" after a reload and the LogBox warnings were not read from JavaScript;
  they are inferred from the API log (no duplicated requests, one logout).
- iOS: authorization changed to "While Using" **while the app runs and on shift** (only the fresh-install path was run); Location
  Services off (system switch); an iOS device-level Settings change (the simulator kept the app alive on `privacy revoke`;
  a phone may restart it); the profile's password fields with the system's "Strong Password" sheet over them (the sheet
  appears on every new-password field on the simulator; the mismatch was run after closing it).
- Android: the "not found" order state; **Forgot password**; the Map tab (the screen behind Google's dialog); the
  `adb`-driven keyboard has no "done" key, so the Enter key stood for it.
- The profile's Payouts and Stripe rows (the test account has none); the order card's timer on a still-running delivery
  (every test order is months late).
- The Release build on either device (JavaScript bundles only).

## 7. Round 3: the device pass (2026-11-13)

What ran: the branch after the React Native 0.88.1 upgrade, **Debug** builds from Metro (port 8082), the **local API** (`http://localhost:8080`, project `development`), the test driver, the **served test theme** (primary `#7C3AED`; the purple painted on every screen below). iPhone 17 simulator (iOS 27.2, 402 × 874 pt) and the Android emulator (API 37, Medium Phone, 411 dp, gesture navigation). Screenshots: `.theme-audit/screens/pass/{ios,android}/<nn>-<screen>.png` (git-ignored; the `-before` / `-after` pairs are the four fixes of [decisions.md](decisions.md), "round 3"). The measures behind H8 and H9 are in [harmony.md](harmony.md), "Round 3".

| Seen | iOS | Android |
|---|---|---|
| Welcome, Login (e-mail tab, OTP tab, the empty-form error toast and red fields), Forgot password (and its error) | ✔ | ✔ |
| Orders: Pending, In Progress, Completed, Cancelled (empty state), the assign-requests tab (empty), a card, the connection dialog | ✔ | ✔ |
| Search: the modal, the SLA, date and city sheets, the calendar (before and after the width fix) | ✔ | ✔ |
| Order details of a pending order: header, the three collapsible sections, the products, the bill, the payments, the bottom bar; of a completed one (no bar) | ✔ (pending) | ✔ both |
| The order's driver map and its "Show in other maps" sheet | ✔ (the map tiles are blank in the simulator; the pins show) | ✔ (tiles) |
| Chat of an order (thread, recipients, quick messages, composer) | ✔ | ✔ |
| Accept (the position step, the time step) and Reject (reasons, comment) | ✔ both | ✔ both |
| Messages tab, Map tab | ✔ | ✔ |
| Profile (read, edit, scrolled), Schedule, Sessions (to the bulk buttons), the language sheet, the remove-account dialogs (both), the logout refusal toast | ✔ | ✔ (Sessions not scrolled to its end; the edit mode not opened) |
| The not-found state (the raw code before, "Order not found" after) | ✔ | ✔ |
| System dialogs seen: the "Save password" and "Enable persistent notifications" alerts (iOS), the "Network error" alert (Android offline) | ✔ | ✔ |

**Large text.** iOS `accessibility-extra-extra-extra-large` and Android `font_scale` 2.0: Orders, order details, Reject, Messages and Profile. The text is capped by the primitives (about 1.3) so nothing broke; the tab bar grows; two defects showed (the Messages row cut the date and the status badge: fixed). Not seen large: Login, Forgot password, Schedule, Sessions, the chat, the sheets.

**Offline start (Android only).** The API made unreachable (`adb reverse` removed) with Metro up, the app force-stopped and started: the Orders screen painted from the **cached served theme** (purple tab and badges), no orders, and the system alert "Error / Network error". Restored after. iOS: the simulator shares the host's network and the API cannot be cut apart from Metro without editing `src/config.json`, which this pass does not touch: **not seen on iOS**. A first launch offline (the defaults) needs a Release build: not seen.

**Reduced motion.** Android's three animation scales set to 0 (what `AccessibilityInfo.isReduceMotionEnabled` reads) and back: the app kept running and every screen painted, but no skeleton frame was caught in two consecutive screenshots, so **the still skeleton was not seen**; it stays covered by `theme.test.ts` ("reduced motion turns the theme's motion off"). iOS: not set.

**Skeletons.** The local API answers in milliseconds and the lists are cached: a skeleton cannot be caught. They were forced on with a temporary edit (reverted) and measured on the iPhone (`ios/90…95-*-forced.png`); a delaying proxy in front of the API (Android) showed none either.

**Touched and left as it was.** The test driver's session was deleted once from the app's own Sessions screen (iOS) to see the screens before the login, then logged in again; its sessions list is long (58) from earlier passes. The iOS location authorization was revoked and granted again (the app's "Mobile location not enabled" dialog came and went). No order, message, profile or session data else was changed. Cancel in the location dialog did not close it (listed in harmony.md).

**Not seen in this pass, by name.**

- The new-order dialog: it needs an order assigned from an admin session, and there is none.
- The review of a customer (it opens after a delivery), Payouts, Stripe, the assign-request detail, the schedule-blocked screen (the project does not turn driver validation on), the tutorial (seen in the first pass), the notification settings sheet (iOS only a system alert came up), the requirements dialog and the delivery PIN (an order in a state that needs them).
- Sending a chat message, accepting, rejecting, uploading a status picture: they change data.
- The password eye with the password showing: a screenshot would print it. The eye itself was seen on both platforms before the pass (§3).
- Each of the ten catalog fonts (Poppins only), the extreme themes on a device, widths of 320 and 360, landscape, right-to-left, three-button navigation, a real phone, push, background location after the upgrade (§6).
- A Release build (offline first launch, Hermes bytecode), and a build by the Builder.
- The pressed states (the tap is instantaneous with `idb` and `adb`).


## 8. Round 4: H8 and H9 applied (2026-11-14)

The owner's layout and skeleton decisions ([decisions.md](decisions.md), "Phase 9: one look, round 4") applied and seen on both platforms: **Debug** builds from Metro (port 8082), the local API, the test driver, the served test theme; iPhone 17 simulator (iOS 27.2) and the Android emulator (API 37). Screenshots `.theme-audit/screens/round4/{ios,android}/<nn>-<screen>-{before,after}.png` (git-ignored); the before and after numbers per row are in [harmony.md](harmony.md), "Round 4".

**Automatic checks after the last commit** (all pass; lint 153 warnings against 156 before, none added):

| Check | Result |
|---|---|
| `npx tsc --noEmit` | 0 errors |
| `pnpm lint:check` | 0 errors, 153 warnings |
| `pnpm test` | 142 suites, 1 417 tests pass (137 and 1 364 before) |
| `pnpm theme:guard` | `ok: 0 literals` |
| `pnpm theme:keys` | every key has a candidate reader; 31 read through a variable (`account_page.base.padding_top` lost its reader with H8 and was removed from the schema) |
| `pnpm theme:verify` | `src/theme.compiled.json is up to date` |
| `pnpm theme:extremes` | every theme ok |
| `node i18n/check-generated.cjs` · `node i18n/verify.cjs` | `OK: i18n catalog matches code scan` · the 11 locales filled |

**Seen on both platforms, before and after:** Orders (pending, in progress), Messages, Profile, Schedule, Sessions, the order's details, the accept step, Reject, the driver map (and its zoom), the chat, the search modal and its calendar, the logout refusal toast, Login, Forgot password and the schedule-blocked screen (the last three with the session kept: a temporary edit showed the unauthenticated stack; reverted).

**Skeletons** (a temporary local edit forced each on, reverted, never committed; measured from the screenshots' pixels): Orders, Messages, the chat, Profile, the order details and the assign request, before and after, on both platforms.

**Defects.** The dialog in the modal's box on iOS (the location dialog) before and after (27 pt off center before); the location dialog's Cancel was **not reproduced** (what was tried is in [harmony.md](harmony.md)).

**Not seen on a device:** the order details' error state (the bar there: a test); a scrolling header on Login, Forgot or Schedule (the pages fit; a test); the toast over a screen's bottom action bar (a test, and the tab bar was seen); the Orders skeleton of the Completed and Cancelled tabs (no timer, no chip: the tab did not take a tap; a test); Payouts and Stripe (no account); a six-week month in the calendar; the skeletons at large text, at 320 and 360 pt and with the theme's pulse off; Sessions, Payouts and Stripe skeletons (decided: left).

**Touched and left as it was.** The iOS location authorization was revoked and granted again ("Always" is back); Metro is on 8082 from this checkout; the session of the test driver is intact. No data was changed.

## 9. Location module: no `mock` in the body, the discard line, iOS logs (2026-11-17)

The owner's three decisions of 2026-11-17 ([decisions.md](decisions.md), "Location module: discarded positions, the `mock` field, iOS logs"), seen on both platforms: **Debug** builds (iPhone 17 simulator, iOS 27.2; Android emulator, API 37), Metro on 8082, the local API (`http://localhost:8080`), the test driver, already logged in. The lines are in [LOCATION_MODULE.md](../LOCATION_MODULE.md), "Logs"; the evidence is the platform's own log (a debug build writes the exact body) and the API container's request log. The outage was `docker pause apiv4-api-1` / `docker unpause apiv4-api-1` (the config file was not touched). Positions are the simulator's and the emulator's.

| Check | Platform | What was seen |
|---|---|---|
| Body without `mock` | iOS | `request queued=1 body={"location":{"lat":37.3318,"lng":-122.0312,"v":"1.0"},"driver_id":6}` then `http 200 success=true`; the API log: `POST /v400/es/development/users/6/locations` 200. The simulator's position is flagged simulated (`location accepted ... mock=true`, the event keeps the truth) and was sent as a real one, without the field |
| Body without `mock` | Android | `request queued=1 body={"location":{"lat":4.6097,"lng":-74.0816983,"v":"1.0"},"driver_id":6}`, `http 200 success=true`. `adb emu geo fix` positions are not mock (`mock=false`); a real test-provider position (`appops set 2000 android:mock_location allow`, `cmd location providers add-test-provider gps`, `set-test-provider-location`) logged `location accepted lat=4.63 lng=-74.07 mock=true`, then the same body without `mock`, `http 200`. The test provider was removed and the appop restored |
| Lines at start | iOS | `state authorization_changed`, `configured (distance=25.0 m, maxQueue=500, discardOlder=true, rejectMock=false)`, `tracking started (distance=25.0 m, queued=0)` |
| Lines at start | Android | `configured (distance=25.0 m, interval=40000 ms, fastest=20000 ms, maxQueue=500, discardOlder=true, rejectMock=false)`, `network available: flush`, `tracking started (distance=25.0 m, interval=40000 ms, queued=0)` |
| Outage, retry and discard | iOS | API paused, 4 positions 4 s apart: `retry in 5000 ms (network error) queued=4`, then the request with the newest (`queued=4`), API unpaused 20 s later: `discarded 3 older positions` and `http 200 success=true`. The API log: one `499` (the request that timed out on the client's side) and one `200` |
| Outage, retry and discard | Android | API paused, positions 24 s apart: `retry in 5000 ms (network error) queued=1`, `retry in 15000 ms (network error) queued=1`, `retry in 60000 ms (network error) queued=2`; after unpausing, `http 200 success=true` and `discarded 2 older positions` (three queued, the newest sent). One line per discard, nothing in the JavaScript logs |
| Same text on both | both | The retry, discard, request and http lines are the same words; Android prints the discard after the `http` line, iOS before it (the platforms notify in a different order, the content is the same) |

Not in this run: a **release** build on a device (the release lines are the `#if DEBUG` / `BuildConfig.DEBUG` else-branches: no coordinates, no body, read from the code and covered by the build, not seen in a log), `state unauthorized`, `state mock_rejected` (needs a release build or `rejectMock`, which the hook does not set) and the authorization or services lines on Android (the iOS authorization line was seen at launch). Console.app was not opened; `log stream` and `log show` with the subsystem predicate were used.

**Checks.** Kotlin core tests, `swift test` (142 tests), `npx tsc --noEmit`, `pnpm lint:check` (0 errors, 153 warnings), `pnpm test` (142 suites, 1 421 tests), the iOS Debug build and `:app:assembleDebug` all pass after the last code change.

## 10. The owner's decisions of 2026-11-17: the banner alert, the empty state's icon, the travel time

Written and tested in a separate worktree (Jest only), then merged and **looked at on devices by the coordinator on 2026-11-17** (Debug builds, the local API):

- **iPhone 17 simulator, banner style "Temporary"** (the simulator's default): the alert shows at launch with a session. The availability switch could not be turned off for real (the test driver has assigned orders: the API answers 400), so the "off" state was forced with a local edit, reverted: a press shows the alert and sends nothing; with the style set to "Persistent" in Settings (Apps > the app > Notifications > Banner Style) a press sends `POST /users/6` (200) and shows no alert. Several automated taps did not reach the switch's handler at all (trace requests showed no press): an artefact of the forced value and the automation, not of the check, but a real switch going from off to on by hand was **not seen**.
- **Empty state** (iOS, Orders > Cancelled): the tray icon in the served theme's purple, right over the message. The 40 pt icon was first drawn in the picture's 220 pt room and read as detached from its message: the room was removed (the icon's own height, the picture's gap under it).
- **Android emulator, an order's driver map:** the row reads "715.85 km" and no time (it read "715.85 km · 0 min").
- **Not seen:** the alert after a logout and login (the test driver cannot log out), Android's switch, the Messages / Payouts / not-found empty states with the icon, a travel time while moving.

| Decision ([decisions.md](decisions.md)) | What changed | Tests |
|---|---|---|
| iOS: the "Enable persistent notifications" alert, and the availability switch | One shared function and hook (`src/utils/notificationBannerStyle.ts`: `isTemporaryBannerStyle`, `warnIfTemporaryBanners`, `useTemporaryBannersWarning`), used by `RootNavigator` and by the switch of `UserProfileForm`, the only place that can turn availability on. The alert is asked once per launch with a session and once per login (a ref reset at logout; only after the push setup found the permission granted, as before). While the style is temporary the switch refuses (stays off, no request, the alert); the style is asked at every press; switching off is never asked or refused. Android and an iOS without `NativeModules.NotificationSettings` are untouched. No new i18n key | `src/utils/__tests__/notificationBannerStyle.test.ts`, `src/navigators/__tests__/RootNavigator.banner.test.tsx`, the switch's describe in `UserProfileForm.test.tsx` |
| The empty state's picture | No bundled picture: `images.empty.not_found` has no fallback and `not-found.png` is deleted. `NotFoundSource` paints the served picture, or else the `Icon` `file-tray-outline` at `components.empty_state.base.icon_size` (40) in `primary_text`, in a box of the picture's height (`image_size`) and gap (`image_gap`), so the state is as tall as before. `images.empty.new_order` and `images.empty.schedule_blocked` keep their bundled pictures | `NotFoundSource.test.tsx` (both cases, size, color, layout) and the empty states of Orders, Messages, Payouts, Sessions, Stripe and the order's not-found state |
| The driver map's travel time | `nextTravelMinutes` / `isPositionFix` (`src/ui/src/utils/travelTime.ts`): no time unless the position is a fix, the speed is from 0.5 to 100 m/s and the result is within 24 h; a standing driver keeps the last estimate; none yet shows no time (it was "0 min"). `formatDuration` writes nothing for a non-finite value | `travelTime.test.ts`, `formats.test.ts`, `DriverMap.test.tsx` |

**To look at on a device** (the coordinator):

1. iOS, Settings > Notifications > the app > Banner Style "Temporary": open the app with a session: the alert shows once (Later, Go to settings); go to Profile and switch "Available to receive orders" on: the switch stays off, no request goes out, the same alert shows; "Go to settings" opens the app's settings; set the style to "Persistent", come back and switch it on: it goes on (nothing else shows); switch it off with the style at "Temporary": it goes off at once, no alert. Sign out and in with "Temporary": the alert shows again, once.
2. Android: the switch goes on and off with no alert.
3. A list with no orders (Orders, a tab with none), Messages with none, an order that does not exist (a push with a made-up `order_id`), Payouts with none: an icon (a tray) in the theme's blue over the message, in the room the yellow drawing took (the message and the button in the same place as before). With a served theme that sets `images.empty.not_found`: the picture.
4. Android, an order's driver map (Order details > map): the row under the header reads "715.85 km" (any far distance) and no time while the emulator reports no speed or a speed of noise; with the emulator's route playing at a road speed, a time such as "12 min" or "1 h 05 min" that follows the distance; it never reads "0 min" nor a number of thousands of hours.

**Automatic checks after the last commit:** `npx tsc --noEmit` 0 errors · `pnpm lint:check` 0 errors, 153 warnings (none added) · `pnpm test` 145 suites, 1 491 tests (142 and 1 421 before) · `pnpm theme:guard` `ok: 0 literals` · `pnpm theme:keys` every key has a candidate reader · `pnpm theme:verify` up to date · `pnpm theme:extremes` every theme ok · `node i18n/check-generated.cjs` and `node i18n/verify.cjs` OK.

## 11. Final device run (2026-11-17): the new-order alert, logout and login, the availability switch, Release builds

Same day as §9 and §10, Debug builds first (iPhone 17 simulator, iOS 27.2; Android emulator API 37; Metro on 8082), then Release builds of both against the local API (`http://localhost:8080`, project `development`), with the test driver (user 6). Local admin session of the API used only to move orders. No code was changed (no defect was found in the app that a test could pin; the findings below are in the environment, the web-socket wiring and one behaviour for the owner). Screenshots: `.theme-audit/screens/final/{ios,android}/` (git-ignored). Evidence lines are the platform's log, the API container's request log (`docker logs apiv4-api-1`) and the database (`notification_tokens`, `users.available`).

**Data touched and restored.** Driver 6's blocking orders (non-final, `driver_id = 6`) at the start: 2876 (status 0), 3523 (0), 3504 (8), 3506 (8). They were unassigned (`driver_id` null) with the admin's `PUT /orders/{id}`, and given back at the end of Part 1 with the same `driver_id` and `status`; the list of driver 6's orders after is the list before (the other 13 orders, all final, were never touched). Order 4464 (status 0, no driver, business 41) was assigned to driver 6 for the alert and unassigned again: it is back to `driver_id` null, status 0. `PUT` with `driver_id` answers `ERROR_ORDER_DRIVER_BUSY` for the status-8 orders while two pending ones are assigned, so they were given back first (3504, 3506, then 2876, 3523); `last_driver_assigned_at` and the order histories carry the moves.

### Part 1: Debug builds

| Check | iOS | Android | Evidence |
|---|---|---|---|
| The new-order dialog (`NewOrderNotification`), app in the foreground | Seen: "New order!!", the picture, "Order #4464 has been ordered.", a close "X" at the top right; the "Enable persistent notifications" system alert was also up (banner style "Temporary") and was closed with "Later" | Seen: the same dialog | `ios/02-new-order-alert.png`, `android/02-new-order-alert.png`. Through a **local stand-in** for the socket (see "Web-socket" below), not through the real server |
| The dialog against `docs/THEMING.md` | No raw key, nothing clipped, the dialog's box is white with the app's radius; the title is the theme's black, **there is no purple element in it** (no button: the dialog has only the close "X", no accept/reject or view action); the picture is the bundled yellow `images.empty.new_order` (kept by decision, §10) | The same | the two screenshots |
| The sound | `SoundPlayer.playUrl` ran: a new `AVPlayer` for the CloudFront mp3 every 2.5 s (10:27:07, :10, :12, :15 ... in the app's log) and a system-sound "vibrate" call; it stopped at once when the dialog was closed (no new `AVPlayer` after). **Not heard** (a simulator has no speaker I can listen to) | `AlarmSound` through a `MediaPlayer` with `USAGE_ALARM` (`dumpsys audio`: state `started`, then `stopped` after the dialog was closed); `AudioTrack` log lines "stop(16): called with 12033 frames delivered" every 2.5 s (the file was decoded and written). The audio focus stack stayed empty (the alarm stream does not take focus). **Not heard** | `ios-alert.log`, `android-alert.log` in the scratch notes; `dumpsys audio` |
| The dialog with the app in the background | n/a | The event arrived with the app on the home screen: **no dialog and no sound** (nothing started, nothing shown when the app came back); by the code (`isAppActive` in `SoundPlayerComponent`) the dialog and its sound are for the foreground, the background is the push's job (alarm channel), which was not testable | `android/03-alert-after-background.png` |
| Logout | `POST /auth/logout` 200 at once (no confirmation dialog in the app: `LogoutButton` calls the logout on press); location log `tracking stopped (queued=0)`; token row 324 removed from `notification_tokens`; welcome screen | `POST /auth/logout` 200, `tracking stopped`, welcome screen (the `notification_tokens` rows were not counted before this logout, so the removal of the device's row is **not** proven here; it is proven on iOS and was on 2026-11-13) | `android/04-logout-confirm.png` (it is the welcome screen: there is no confirmation), `ios/04-after-logout.png` |
| Login again | `POST /auth` 200, `notification_tokens` POST 200, **the "Enable persistent notifications" alert showed once after the login** (once per login, not again after "Later"); `configured`, `tracking started`, a position `POST /users/6/locations` 200; the log body has no `mock` key | `POST /auth` 200, tokens POST 200, `configured`, `network available: flush`, `tracking started`, `location accepted lat=.. lng=.. mock=false`, `request queued=1 body={"location":{..,"v":"1.0"},"driver_id":6}`, `http 200 success=true` | `ios/05-after-login.png`, `android/05-after-login.png`, `ios-loc.log`, `android-loc2.log` |
| Availability OFF (driver free of orders) | `POST /users/6` 200, `users.available` = f, stays off after 3 s | `POST /users/6` 200, f, stays off | `ios/07-switch-off.png`, `android/07-switch-off.png` |
| Availability ON, iOS "Temporary" | Refused: the switch stays off, **no request** (the API log has no `POST /users/6` between the press and the next action), the "Enable persistent notifications" alert shows, `available` stays f | n/a | `ios/08-switch-on-refused-alert.png` |
| Availability ON, iOS "Persistent" | Banner Style set to "Persistent" in Settings (Apps > the app > Notifications), back in the app: ON, `POST /users/6` 200, `available` = t, **no alert** | n/a | `ios/09-banner-persistent.png`, `ios/10-switch-on-persistent.png` |
| Availability ON, Android | n/a | OFF then ON: each `POST /users/6` 200, `available` f then t, no alert | `android/08-switch-on.png` |

The driver was left **available**. The banner style is back to "Temporary" (`ios/` check: Settings showed the check mark on Temporary).

**Taps on the iOS switch.** `idb ui tap` on the switch did nothing three times (value stayed, no request) and worked with `--duration 0.15`; the first taps were not the app's fault (the hierarchy value and the API log confirm each result).

**Web-socket (why the alert needed a stand-in).** The submodule's `WebsocketProvider` connects to `https://sockets-v3.orderingplus.com` whatever `config.json` says, and that server answers the local project with "Project development not valid (cache)" (checked with `socket.io-client` and the driver's token): the app never receives an event from the local API. The local API broadcasts through a queue worker (`queues:websockets`) that the `apiv4-queues-1` container does not run (it supervises only `http_requests`, which exits at start: "Class `Propaganistas\LaravelDisposableEmail\DisposableEmailServiceProvider` not found"); 25 broadcasts were waiting in Redis. To see the dialog: a temporary `queue:work redis --queue=websockets` in the api container (killed afterwards) and a **local-only** edit of the submodule's `WebsocketContext/index.js` pointing the URL at a small `socket.io` server in the scratch directory that emits `order_assigned` with the order read from the API (reverted with `git checkout`; `git status` clean in both repos). A first attempt emitted a malformed payload (the driver's token cannot read the order: `ERROR_ORDER_FIND`, my stand-in emitted a list) and the Orders list threw "Cannot convert undefined value to object" in `OrderListGroups`: that was the stand-in's fault, not the app's (a real order object, read as the admin, rendered the dialog and the list).

### Part 2: Release builds against the local API

iOS: `xcodebuild -configuration Release -sdk iphonesimulator` (Hermes bytecode `main.jsbundle`, 7.8 MB), installed over the Debug app (the session stayed). Android: `:app:assembleRelease` (113 MB, signed with the debug keystore, as `android/app/build.gradle` says), installed with `adb install -r` over the Debug app (installs over it, the session stayed). Metro was stopped (nothing on 8082) for both.

| Check | iOS | Android | Evidence |
|---|---|---|---|
| Cold start | The bootsplash, then the app; no red screen, no crash report (`~/Library/Logs/DiagnosticReports` has no `deliveryApp` entry) | The OS "Updating..." screen for ~30 s after the install (the emulator was at load 60: dexopt), then the app; no red screen; `adb logcat -b crash` shows only `vold`'s unwind request (the system dumping a process under load), no app crash | `ios/11-release-splash.png`, `ios/12-release-start.png`, `android/11-release-splash.png`, `android/12-release-start.png` |
| Orders, an order's details | Both pending orders, the details of 3523 with Accept and Reject, the purple "Pending" chip | The same | `ios/13`, `ios/14`, `android/13`, `android/14` |
| The driver map | Distance only: "5533.75 km", no time; the tiles are blank (the Google key marker is not replaced locally, `CLAUDE.md`) | "715.85 km" only, no time; tiles drawn | `ios/15-release-driver-map.png`, `android/15-release-driver-map.png` |
| Messages, Profile, Map view | All three open and paint; the served theme's purple | All three open and paint | `ios/16-release-tab-*.png`, `android/16-release-tab-*.png` |
| The location module in Release | `state authorization_changed`, `configured (... rejectMock=false)`, `tracking started`, then **`state mock_rejected` and no `POST /users/6/locations`**: the simulator's position is simulated and was dropped; no coordinates, no body in any line | `configured`, `tracking started`, `network available: flush`, then `location accepted` (no coordinates), `request queued=1` (no body), `http 200 success=true`: **the emulator's `geo fix` position is not flagged as mock by Android (`mock=false` in Debug), so it was sent** | `ios-loc-rel.log`, `android-loc-rel.log` (scratch notes) |
| A simulated position on Android | n/a | **Not seen.** With `appops ... android:mock_location allow` and a `gps` test provider (`set-test-provider-location`, four positions 10 s apart, 25 m or more apart) the Fused provider log says "location delivery ... blocked - too close" and the app got nothing (no `location accepted`, no `mock_rejected`, no request); the appop and the provider were removed after | `adb logcat` |
| Offline start (iOS, cached theme) | With the API **stopped** (`docker stop`, connection refused): the splash, then Orders in the cached purple theme, the "ERROR" empty state with the purple tray icon and the system alert "Error / Network error" (Accept, Cancel); no hang. With the API **paused** (`docker pause`, connections accepted and never answered): **the app stayed on the in-app splash for more than 2 minutes** and went on the moment the API was unpaused (see "Findings") | n/a (Android's offline start was seen on 2026-11-13, §7) | `ios/17-offline-early.png`, `ios/18-offline-after-10s.png` |
| Hermes / minification | Every tab and one order opened, no crash | Same, no crash | |

**Findings (none fixed here).**

1. **A hanging API keeps the app on its splash.** `docker pause apiv4-api-1`, kill and reopen the Release app: the splash (the in-app `Splash` page, `RootNavigator`: `loaded` waits for `orderStatus.loading`, `isPushLoading` and `loadingSchedule`) stayed for more than 2 minutes; all the launch requests (`/languages`, `/theme`, `/configs`, `/sites/current`, `/translations`, ...) were answered in the same second after `docker unpause`. No client timeout exists on those requests (they are the submodule's `fetch` calls). A refused connection is handled (offline state above). It is a decision for the owner whether to add a fail-safe (for example showing the cached app after some seconds); the splash is `src/pages/Splash` and `RootNavigator`, the requests are in the submodule.
2. **A Release Android build cannot reach `http://localhost:8080`**: the React Native Gradle plugin sets `usesCleartextTraffic` to `false` for `release`. The APK for this run was built with `android:usesCleartextTraffic="true"` written into `AndroidManifest.xml` locally (one line, reverted with `git checkout`, never committed).
3. **The new-order dialog has no action**: only the close "X" (no accept/reject, no "view order"). By the code, not a regression of the theming; the owner may want a button that opens the order.
4. **iOS Release install can fail on a stale derived-data directory**: reusing the scratch `dd-release` of 2026-11-13 left a stale `OneSignal.framework` (identifier `com.onesignal.OneSignal-Dynamic`, the same as `OneSignalFramework.framework`) in the app and `simctl install` refused it ("Found bundle ... with the same identifier"). A derived-data directory from before the OneSignal 5.8.1 pods carries it; removing the stale framework (and rebuilding) fixed it. Not an app defect; use a fresh `-derivedDataPath`.
5. The local stack's websocket path does not work for the app at all (above): the "connection status" chip reads disconnected on both platforms.

### Not seen

- The sound **audibly** (both platforms): only the players' state and logs.
- The new-order dialog through the **real** socket, and a **push** for a new order (a real OneSignal/FCM delivery), including with the app in the background or killed (the background case above only shows that the in-app dialog does not appear).
- The new-order dialog **after** login on a fresh session with an order assigned at the same moment (the order was assigned beforehand).
- A simulated (flagged `mock`) position **in Release on Android**: the Fused provider did not deliver the test provider's positions; on iOS `mock_rejected` was seen.
- Android's offline start with the Release build (seen in Debug on 2026-11-13).
- A **confirmation** before logout: there is none in the app (the owner's list assumed one).
- The iOS availability switch from off to on with real taps in the same state as a tester's (the taps needed a press duration; the results are confirmed in the API log and the database).
- The map tiles on iOS (no Google key locally).

## 12. The launch's time limit and the new-order dialog's icon

Two of the owner's decisions of 2026-11-17 ([decisions.md](decisions.md): "An API that hangs at launch", "The new-order dialog's picture"), written, tested in Jest and looked at on both devices (Debug builds, Metro on 8082, the local API `http://localhost:8080` with the test driver; no data was changed). Screenshots: `.theme-audit/screens/final2/{ios,android}/` (git-ignored). Both machines were busy (the Android emulator took 2 to 40 s to start its JavaScript), so every time below is read from a log line, not from a screenshot.

### 12.1 What the launch waits for, and what can hang

`DeliveryApp` waits for nothing on the network: the native splash went as soon as the cached theme and the stored project name were read from storage (since 2026-11-23 it goes when the first screen is painted: docs/SPLASH.md "When it hides") (`readCachedTheme`, `_retrieveStoreData`: no request). The loading page (`Splash`, drawn by `RootNavigator` while `!loaded || permissionsState.isLoading`) waits for:

| Gate | Waits for | Can it hang? |
|---|---|---|
| `sessionLoading` (the session) | The device's storage (token, user) | No (no request) |
| `loadingSchedule` | The cached user, then `getDriverScheduleBlockPlan` | No |
| `orderStatus.loading` | Language, session, then `GET /orders/options` | Yes |
| `languageState.loading` | `GET /translations` (and `/languages`) | Yes |
| `configsLoading` | The language, the first-load optimisation request, `GET /configs`, and an external `https://ipapi.co/json/` | Yes (two hosts) |
| `isPushLoading` | The configs (which provider), then the push setup (OneSignal / Firebase token); with no session it opens when the configs load | Yes, through the configs |
| `permissionsState.isLoading` | The permission dialogs (the driver), or the language request when the permissions are not asked (first launch, tutorial not done) | Yes on a first launch |

So `loaded` (with a session: order options, push, schedule; without one: session, push which waits for the configs) and, on a first launch, the permissions flag wait for requests that have no client timeout (the shared logic's `fetch` calls). Behind the gates, a screen whose own request never answers keeps its loading state: Orders (the `OrderListGroups` controller) draws its skeleton and has no error state while the request is pending; a refused connection ends the request and shows the "Network error" state. The location module is configured only after `languageState.loading` ends, so it too waits for the API.

### 12.2 The design

`src/navigators/useLaunchTimeLimit.ts` (the limit, `LAUNCH_TIME_LIMIT_MS` = 15 000, and the notice's time, `LAUNCH_NOTICE_MS` = 8 000, are named constants), used by `RootNavigator`. One timer, started at the mount of the navigator and cancelled for good as soon as the launch is `loaded`. At the limit, if the launch has not loaded:

- the loading page's gate opens (`launched` = `(loaded && !permissionsLoading) || (timedOut && !sessionLoading)`): with a cached session the logged-in app, without one the welcome / login screen. The session is still read from the device first (storage, never the network);
- `hideSplash()` (the native splash; a no-op in practice, it is already hidden once the cached theme is read) and one toast, `t('NETWORK_ERROR', 'Network Error')` through the app's `OToast`, 8 s. No new key, no i18n change.

The gates themselves are not touched: `loaded` and `permissionsState.isLoading` stay what they are, so the effects that wait for them (the push order opening, the developer mode check, the iOS banner alert) and for the answers (the push setup, the schedule block, the location module) run when the answers come, as in a normal launch. A permission dialog the driver leaves open after the launch loaded is not counted (the timer is gone). No timeout was added to any request.

### 12.3 What was seen

| Check | iOS (iPhone 17) | Android (emulator API 37) |
|---|---|---|
| API paused (`docker pause`), app killed and opened: the loading page, then the app | The navigator mounted 11:24:18.856, the limit fired 11:24:33.866 (log lines): **15.01 s**. At 20 s the app: Orders with its skeletons and the red "Network Error" toast over them (`ios/01`, `ios/02`) | Mounted 11:22:32.557, fired 11:22:47.578: **15.02 s** (three other runs: 15.01 s, 15.08 s, 15.02 s). Orders with skeletons and the toast, over the tab bar (`android/01`, `android/02`) |
| What the screens show behind the toast | The Orders skeletons keep pulsing with no message of their own once the toast is gone (8 s): a request pending has no error state. The refresh button is there | The same |
| API unpaused: the app ends as a normal launch | In the second the API answered: the orders loaded, the location module logged `configured` and `tracking started` (11:24:47.4), a position `http 200`, and the iOS "Enable persistent notifications" alert showed (the push setup ran and `loaded` turned true late) (`ios/03`) | Orders loaded, `configured`, `tracking started` (11:23:47.08), `network available: flush`, a position `http 200 success=true` (`android/03`) |
| A normal launch (API up) | No notice, nothing different: the app by 6 s; the limit's log line never printed (`ios/04`, `ios/05`) | The same (`android/04`) |
| Logged out | **Not seen on a device**: the test driver cannot log out while he has assigned orders (the API refuses) and no data was to be changed. Covered by tests only | Same |

The "Open debugger to view warnings" toast in the screenshots is the Debug build's.

### 12.4 The new-order dialog's picture

No bundled picture any more: `images.empty.new_order` has no fallback (`IMAGE_FALLBACKS`, `BUNDLED_IMAGES.general.newOrder` and `src/assets/images/new-order.png` are gone). `NewOrderNotification` paints the served illustration (at `components.new_order_alert.base.image_size`) while the theme sets one, else the `Icon` `notifications-outline` (a bell; the glyph exists in `@react-native-vector-icons/ionicons` 14) in color role `primary_text`, at the empty state's `components.empty_state.base.icon_size` (40): `new_order_alert` has no icon size key and the icon levels (`tokens.icon`, 16 to 32) are too small for the dialog's hero; the empty state's key is the same decision for the same role. The icon takes its own height, with the dialog's own gap (`md`, the same as the picture's `image_gap`) between the headline and the text; no new token, no schema edit. The image entry's metadata (`product.schema.json`) does not mention the bundled asset; the component would read a dedicated key (for example `new_order_alert.base.icon_size`) if the owner wants the two sizes apart.

To show the dialog (the local stack cannot deliver its socket event) a **temporary local-only edit** of `NewOrderNotification/index.tsx` opened it 6 s after the mount with the real order 3523; it was reverted with `git checkout` and never committed.

| Check | iOS | Android |
|---|---|---|
| The dialog | "New order!!", the bell, "Order #3523 has been ordered.", the close "X" at the top right; nothing clipped; the bell about 30 pt wide (a 40 pt glyph) and centered between the headline and the text (`ios/06`) | The same (`android/05`) |
| The icon's color | Sampled from the screenshot: rgb(124, 58, 237) = `#7C3AED`, the served theme's purple (`primary_text`) | The same |
| The close button | A tap on the "X" closes the dialog (the page behind returns to white, `ios/07`) | The same (`android/06`) |
| With a served picture | **Not seen on a device** (the local theme sets none); Jest only | Same |

Tests: `NewOrderNotification.test.tsx` (the icon, its size and color from the default theme and from a theme that sets them, the box; the served picture, at `image_size`, with no icon; the close button), `RootNavigator.launchLimit.test.tsx` and `useLaunchTimeLimit.test.tsx` (fake timers: the loading page before the limit; the app at the limit with a session and the welcome / login screen without one; the native splash hidden and one notice; the session read first; a launch that finishes before the limit never fires; a late answer ends in the normal state with the push setup run and no second notice).

### Not seen

- The limit **logged out** on a device, and with a served new-order picture on a device.
- A first launch (tutorial not done) behind a hung API: by the code the language request holds the permission flag, and the limit opens it; Jest covers the gates, not a fresh install.
- A Release build with the limit (Debug builds only; the code is the same).
- The Orders screen's own state if the API stays hung for minutes: it keeps its skeleton. A message for it is a decision (a timeout in the shared logic, or a notice in the screen).

## 13. Headers, 2026-11-17

The owner's report from a real Android phone (2026-11-17): the order details' bar had no title; the chat's header (store name, subtitle, back arrow) did not line up with the others; every header to be one. Decision: [decisions.md](decisions.md), "2026-11-17 | Order details: the bar's title; every header alike".

### How it was measured, and what was not seen

**Both devices were logged out** (the welcome screen, on the Android emulator and on the iOS simulator; no credentials were available), so no screen behind the login could be opened in the real app. What was done instead:

- **Real app, logged out**: Login and Forgot password, both platforms, before and after (`before-login`, `before-forgot`, `after-login`, `after-forgot`).
- **A temporary, uncommitted lab** (`src/HeaderLab.tsx` and one line of `src/DeliveryApp.tsx`, both removed before the commits) rendered the real components with mock props inside the real provider tree and theme: `ONavbar` in the configurations of the app's screens (`bars`), `OrderMessageUI` (the chat, loaded with a long and a short store name) and `ChatMessageSkeleton`, `OrderDetailsUI` (loaded, loading, not found), `OrderDetailsLogisticUI` (loaded, loading, not found) and an `OModal` full-screen page. The mock order is a made-up one (id 3523, a store called "Burger Palace Downtown Express Branch"); no request was made, nothing was written. Before = the code of `dafef8b` (the changes stashed), after = the working tree.
- Android: the emulator (API 37, as in §12), 411 dp wide, status bar 24 dp, measured with `uiautomator dump` (px / 2.625 = dp); the skeleton states were measured with the system's animations at 0 (the skeleton stops pulsing, which `uiautomator` needs) and set back to 1 afterwards. iOS: iPhone 17, 402 pt wide, status bar 62 pt, measured with `idb ui describe-all`. A skeleton's bones have no accessibility node: their geometry is pinned by the unit tests, not measured.
- Screenshots: `.theme-audit/screens/headers/{ios,android}/` (git-ignored), `before-*` / `after-*`; `fs13-*` is Android with the system font at 1.3.

### Findings

| Case | Cause | Where |
|---|---|---|
| The chat's store name and subtitle hug the top of the bar | The two texts (26.3 + 18.3 = 44.6 pt) filled a 48 pt bar with 1.7 pt over and under them, so the block touched the status bar's edge while the back arrow and the logo were centered; with the system font at 1.3 the block was 49.5 pt in a 48 pt bar and started at the status bar (0 pt) | `shared/ONavbar.tsx`, the text box had no room of its own |
| The chat's skeleton is not the chat's bar | 2 pt gap between its two bones that the loaded bar has not, and a round logo bone (the loaded bar draws a rounded square) | `shared/ChatMessageSkeleton.tsx` |
| Order details: no title; the number is a line of the header card | The bar was drawn with no title | `OrderDetails/Delivery.tsx`, `OrderHeaderComponent.tsx` |
| Assign request: no title, and the not-found state **crashes** | The error state rendered the header card with `order` null (`TypeError: Cannot read property 'delivery_type' of null`; the render error unmounts the whole app, Android `before-logistic-error-crash`), beside a not-found message outside the screen's view, with no bar | `OrderDetailsLogistic/index.tsx` |
| Orders: its actions are 5 pt apart, the details' are 20 pt apart | The orders bar wrapped its pill, refresh and search in a row of its own inside the bar's actions box (`header.gap`) | `OrdersOption/index.tsx` |

### Every header, measured (dp on Android, pt on iOS)

Bar top = the status bar's inset (Android 24, iOS 62). The back button is the 44 box at x 8 with its glyph at x 20, in every header that has one, before and after. Titles are `header.title` (20 / 700, 26.3 high), one line. "Right" lists the x of each button's box (44 wide). Rows marked *lab* were measured in the lab with the same props the screen passes; *real* in the app.

| Header | Platform | Bar height before → after | Back box | Title x (y) before → after | Right buttons x | What changed |
|---|---|---|---|---|---|---|
| Login (real) | Android | 48 → 48 | x 8.4 y 25.9 | 62.1 (35.0) → 62.1 (34.7) | none | Nothing (0.3 is the rounding of the text box) |
| Login (real) | iOS | 48 → 48 | x 8 y 64 | 62 (73) → 62 (73) | none | Nothing |
| Forgot password (real) | Android / iOS | 48 → 48 | as Login | 62.1 / 62 (same y as Login) | none | Nothing |
| Orders (lab: pill, refresh, search) | Android | 48 → 48 | none | 20.2 (34.7) → 20.2 | before 298.7, 347.8 (5 apart) → after 283.4, 347.4 (20 apart) | The actions are laid by the bar, `header.gap` apart |
| Orders (lab) | iOS | 48 → 48 | none | 20 (73) → 20 | before 289, 338 → after 274, 338 | Same |
| Messages, Profile (title only; lab) | both | 48 → 48 | none | 20 / 20.2 | none | Nothing |
| Sessions, Payouts, Stripe, Schedule, Review, Accept / reject (back + title; lab with the title of Sessions) | both | 48 → 48 | 8, 44 | 62 | none | Nothing (the primitive is the same) |
| Back + a long title + one button (lab) | Android / iOS | 48 → 48 | 8, 44 | 62, width 275.4 / 266, ends with an ellipsis, 10 before the button at 347.8 / 338 | 347.8 / 338 | Nothing: truncated, never under the button |
| Chat, loaded, long store name (lab) | Android | **48 → 54.6** (the bar grows) | y 25.9 → 29.3 (centered on 24..78.6) | 62.1 (y 25.9, 2 lines at 25.9 / 52.2) → 62.1 (y 29.0, lines at 29.0 / 55.2) | logo 36 square at the end (not in the accessibility tree: seen in the screenshots) | The texts keep 5 above and below (before: 1.9 above, 16.5 below the bar's 15); back, texts and logo are centered on the same middle |
| Chat, loaded (lab) | iOS | 48 → 54.6 | y 64 → 67.3 | 62 (63.7; 90.0) → 62 (67.0; 93.3) | logo at the end | Same |
| Chat, system font 1.3 (lab) | Android | 49.5 → 59.5 | y 26.7 → 31.6 | title y 24.0 (touching the status bar) → 29.0 | | The texts do not touch the bar's edge |
| Chat, skeleton (lab) | both | the same as the loaded one (pinned by `ChatMessageSkeleton.test.tsx`: same text box, no gap, rounded-square logo bone) | | | | Was a 2 pt gap and a round bone |
| Order details, loaded (lab) | Android | 48 → 48 | 8.4 / 25.9 | none → **62.1 (34.7), width 147.4: "Order No. 3523" is cut to "Order No. 35…"** | 219.8, 283.8, 347.8 | The number is the title; the header card starts with the status badge (its content moved up 38 dp: "Order Type" at 201.1 → 163.0) |
| Order details, loaded (lab) | iOS | 48 → 48 | 8 / 64 | none → 62 (73), width 138, **cut** | 210, 274, 338 | Same |
| Order details, loading and not found (lab) | both | 48 → 48 | same | none → 62 (34.7 / 73), the number the screen was opened with, width 329.9 / 320 (no buttons, not cut) | none | The bar has its title; it does not change when the order arrives (same x, y and size) |
| Assign request, loaded (lab) | both | 48 → 48 | same | none → 62.1 (34.7) / 62 (73), not cut | none | The number is the title; the header card starts with its facts (no status badge on an assign request) |
| Assign request, loading (lab) | both | 48 → 48 | same | none → none (no number known) | none | Nothing |
| Assign request, not found (lab) | both | **crash** (the app unmounts) → 48 | 8, 44 | → none | none | The bar, then the not-found message, as the order's details |
| Full-screen modal (search orders; lab) | both | 48 → 48 | 8, 44 | 62 | none | Nothing: shown with its back arrow and title, under the inset |
| Driver map, accept / reject, review customer, schedule, sessions, payouts, stripe, messages, profile, orders search | | | | | | **Not measured**: they sit behind the login. By the code they are `ONavbar` with the props above under their own inset (`DriverMap`, `AcceptOrRejectOrder`, `ReviewCustomer`, `DriverSchedule` lay it with `paddingTop` of the insets; the others sit in `SafeAreaContainerLayout`); none hand-draws a header |

### What was checked in the code for a header without `ONavbar`

No screen draws a hand-made header: the only back arrow is `BackButton` (in `ONavbar`), the only full-screen header is `OModal`'s (`ONavbar`) or the screen's own `ONavbar` (`customClose`). The Map tab has no header at all (a full-bleed map; not changed). The chat image viewer's close button floats over a photo (a viewer, not a header).

### Collision seen, not resolved here

The details' bar is back + the number + three 44 pt buttons that the theme lays `header.gap` apart (the schema's default is `lg`, 20): the title's room is 147.4 (Android, 411 dp) / 138 (iOS, 402 pt) and the number needs about 149 for four digits and 11 more for each digit: **"Order No. 3523" is already cut, and a real order number is cut more**. The two logged decisions (the number is the title; copy, map and chat are three 44 pt buttons) and the theme's gap cannot all be kept. Options are in [decisions.md](decisions.md), "Pending decisions".

### Not seen on a device

- Any screen behind the login in the real app (Orders, Messages, Profile, Sessions, Payouts, Stripe, Schedule, the driver map, accept / reject, the chat and the details with real data, the orders search modal): both devices were logged out. The chat, the details and the assign request were seen with mock data in the lab, which is the real components and theme but not the real navigation container, the real order or a real store logo.
- The Orders bar after the change in the real app (the lab drew its actions the way the screen now passes them).
- The skeletons' geometry (bones have no accessibility node): unit tests only.
- Android with a real phone (the phone was not touched), and other font scales than 1.0 and 1.3 (Android only).
- The system font larger than 1.3 on iOS (Dynamic Type).

### After the owner's decision: the two-line bar, seen in the real app (the coordinator, Android emulator)

The collision above was decided the same day ([decisions.md](decisions.md), 2026-11-17): the details' bar says "Order" and,
under it, "No. 123". The two keys that styled the number in the card (`order_details.base.status_text`, `status_color`) left
the schema (not published) with their labels and their entry in `theme-readers.json`.

Seen logged in as the test driver against the local API, debug build over Metro (411 dp, density 2.625, font scale 1.0;
px in the window, the status bar ends at 63):

| Screen (real app) | Back button | Title | Second line | Actions |
|---|---|---|---|---|
| Order details, pending order 3523, one-line bar (before this decision) | 22–138 × 68–184 | "Order No. 3523" 163–718 × 91–160 | none | map 745–861, chat 913–1029 (two buttons: the title fitted) |
| Order details, accepted order 3506, two-line bar | 22–138 × 77–192 | "Order" 163–550 × 76–145 | "No. 3506" 163–550 × 145–193 | copy 577–693, map 745–861, chat 913–1029, all × 77–192 |
| Chat with the store of order 3523 | 22–138 × 77–192 | "McBonalds" 163–907 × 76–145 | "Business · Order No. 3523" 163–907 × 145–193 | the logo, a rounded square |
| Driver map of order 3523 | 22–138 × 68–184 | "Order No. 3523" 163–1029 × 91–160 | none | none |

The details' two-line bar and the chat's are the same box: the same back button, title and second line, to the pixel. A
two-line bar is 6.6 dp taller than a one-line one, so its back arrow sits 8.5 px (3.2 dp) lower than on a one-line screen.
Orders, Messages, Profile, the orders' search and the accept screen were opened too: one-line bars with the title at the
same height and the same left edge (x 53 without a back arrow, 163 with one).

Not seen: iOS in the real app (the simulator was logged out; the lab's measures above stand for it), a project with
external ids, a secure project's masked number on a device (Jest), the assign request's bar in the real app, a real phone.

### Every header 56 pt, the arrow centered on the bar (the owner's decision, same day)

The owner asked for every header the same size, with the back arrow centered on the header and on nothing else
([decisions.md](decisions.md), 2026-11-17). `header.base.height` is 56 and `ONavbar` is exactly that tall (a fixed height,
no room of its own around the texts); its texts' font scale is limited to what two lines fit (`navbarTextScale`: 1.25 with
the defaults).

Seen in the real app on the Android emulator (the coordinator; px, the status bar ends at 63, 56 dp = 147 px, so the
bar's middle is y 136.5):

| Screen | Back button | Texts | Actions | Middle |
|---|---|---|---|---|
| Orders | none | "My orders" 102–171 | status, refresh, search 79–194 | 136.5 |
| Order details (accepted, three buttons) | 79–194 | "Order" 78–147, "No. 3506" 147–195 | copy, map, chat 79–194 | 136.5 |
| Chat | 79–194 | "Taste Wine" 78–147, "Business · Order No. 3506" 147–195 | the logo | 136.5 |
| Driver map | 79–194 | "Order No. 3506" 102–171 | none | 136.5 |
| Orders, system font at 1.3 | none | "My orders" 100–173 | 79–194 | 136.5 (the bar did not grow) |

The local API serves a complete theme built from the schema registered in it, so a changed default does not show locally
until the schema is registered again (`php artisan ordering:theme-schema` in the local API, as on 2026-11-13); it was, for
this check. Not seen: iOS, the chat at a larger system font (the font change restarts the activity on Orders), a real phone.

## 14. Polish pass, 2026-11-18

Every screen looked at for spacing, sizes, buttons, fields, map controls and flows; the changes are in
[decisions.md](decisions.md) ("Polish pass, 2026-11-18").

### How it was looked at

- **Android emulator** (1080 × 2400, density 2.625, API 37), the Debug app over Metro, the local API, logged in as the test
  driver; screenshots and `uiautomator` bounds. By the coordinator: Orders (the four tabs, assign requests, the connection
  dialog, the search form with its sheets and calendar), an order's details (pending, accepted, picked up, delivered; the
  three cards open), its map (with and without the accept / reject bar), accept, reject and pickup-failed, the chat (the
  composer, the signature pad), the Map tab, Messages, Profile (read and edit), schedule, sessions, the language sheet.
  One order was taken through arrived → pickup complete → delivery complete (the emulator placed at the store).
- **iOS simulator** (iPhone 17), logged out, by an agent whose diff and screenshots the coordinator read: the splash, the
  tutorial (slides 1, 2 and 5), Home, Login (e-mail and OTP e-mail tabs, the code screen), Forgot password. The coordinator
  then saw Home and Login with the changed primitives (the caret in the brand color, the layout unchanged).

### Measured (Android px unless said)

| What | Before | After |
|---|---|---|
| "Order number" field's text against a select's ("SLA's") in the search form | x 118 against 108 | 108 both |
| A field's caret | The system's teal | The theme's primary (Android and iOS) |
| "Pickup complete" in the bottom bar (14 / 600, as "Order not ready" in an inline button: 298 wide for 15 letters) | 273 wide (80 %) | 316 wide; glyphs 51 above and 48 below in the 131 box |
| An order card and its number-and-date line (fitted too, line 1.4) | Card 381 high, line 345–928 | The same: only a fitted text with a line under the font's height was shrunk |
| Toast with a two-line message | x 14 to 1066 | x 53 to 1028 (the gutter) |
| Behind the status bar and the navigation bar | 250, 250, 250 | 255, 255, 255 (the Debug app rebuilt and reinstalled) |
| Driver map without the bar, Google's logo | Half under the navigation bar | 20 dp above it |

Checks after the changes: `tsc` 0 errors, lint 0 errors, the guard 0 literals, the whole Jest suite.

### Seen and left as they are (logged decisions)

The Messages rows' two-line number and date, the map buttons' size and place, the pencil beside the profile photo, the
profile's dividers, the bottom bar's 50 pt buttons, the signature pad in the chat, the fields without a focus border (the
schema's default).

### Not seen

- The toast above the iOS keyboard (the two forms that showed one now close the keyboard first); the driver map's foot on iOS.
- The login's phone tab, phone verification and reCAPTCHA (not offered by the local project); the multi-project field of Home.
- Tutorial slides 3 and 4; anything at a larger system font; a real phone.
- The new-order alert, the review of a customer, an assign request, payouts and Stripe, the schedule block and the
  permissions screen were not reached in this pass (they were in §11 and before).

### After the owner's three decisions (same day)

- **Tutorial** (iOS simulator, the tutorial shown again by its stored flag, then finished): the photo's box ends where the
  photo does and the title starts 30 under it, on the first and the last slide; no dark line under the first photo.
- **Focus border** (Android emulator, the schema registered again in the local API): the focused "Order number" field has a
  1 pt border in the brand color and its placeholder starts at x 108, as before. Not seen: the code cells and iOS.
- **Driver map's title** (Android emulator): "Order" at y 78–147 and "No. 3504" at 147–195, the details' bar exactly.
- **The color behind the system bars** (Android emulator, the Debug app rebuilt with the `WindowBackground` module): with a
  probe color sent from JavaScript (#FFD0E0, removed afterwards) both bands read 255, 208, 224 over the white screen; with
  the theme's own background they read 255, 255, 255. Three cold starts reached Orders. One "isn't responding" dialog was
  seen on the first launch right after the reinstall, while Gradle had just finished and Metro was rebuilding the bundle;
  it did not come back. Not seen: a served theme with another background, a Release build, a phone under Android 15
  (there the bars are not edge to edge and the module's color is behind an opaque bar).
- **"Arrived to business" in the bottom bar** (Android emulator, order 3523 accepted on the local API): the bar stacks
  "Arrived to business" (y 1825–1956), "Pickup complete" (1982–2113) and "Pickup failed" (2140–2271), each 975 px wide; the
  scroll's last block (Payments) ends above the bar; far from the store the API's refusal shows as a toast above the three
  buttons; at the store the step goes through and the bar keeps the pickup's two, with "Order not ready" at the end of the
  scroll. Not seen: iOS, the bar with rejecting turned off (one button; covered by a test), a status that asks for a photo.
- **The other two steps in the bar** (same emulator and order): at the store the bar stacks "Pickup complete", "Order not
  ready" and "Pickup failed" at the same three places (y 1825, 1982, 2140) and the scroll holds no button; after the
  pickup it stacks "Arrived to customer", "Delivery complete" and "Delivery Failed". Not seen: the four-button bar (an
  order marked ready after the driver arrived, with "Order not ready" on: "Arrived to business" is offered again, as in
  the original app), the Delosi rules, iOS.

## 15. The order's new design (`focus`), 2026-11-18

This section is what was seen of the order's details and map when the design still sat behind a theme option; the owner
removed the option and the old design the same day ([decisions.md](decisions.md), "One design, no legacy"), so what it
saw is now the only order screen. Built by three agents on a common base (the sheet that rides above the keyboard, the
shared payment text, and then a theme option, since removed), each on its own folders; the coordinator read every diff, merged the two phone rules into one module, and looked
at the app on the Android emulator (the Debug app on the local API, the schema registered again with the new key).

Checks at the end: `tsc` 0 errors, lint 0 errors (153 warnings, as before), the guard 0 literals, every key with a reader,
the whole Jest suite, the i18n catalog complete (28 new keys in 11 locales).

Seen on the emulator (order 3504 on the way to the store, order 2876 offered and then accepted):

- **On the way to the store**: the status row on one line (two badges and "ASAP · 02:04PM"), the stop card ("Pick up at",
  the address link, the notes, "3311.42 km from you", the second phone and the e-mail as links, "Map" and "Call" in equal
  halves), "Then deliver to" and the payment as folded rows, the order's comment as a warning notice, the products and
  "More details" folded, the three steps in the bottom bar. The folded rows open: the customer's address, distance and
  phone; the bill with its payments.
- **Offered**: the route card ("Pick up at" over "Deliver to", "View on the map"), the facts (total, payment method), the
  payment row, the products, accept and reject in the bar; no copy button.
- **Accept sheet**: "Accept order", the position stepper, the time dial, "Accept" off until a position is chosen; typing
  25 gives 00 : 25 and the order is accepted with position 1, the sheet closing by itself.
- **The failure screen** ("Pickup Failed"): "Order No. 3504 · Cliente Norte" under the title, "What happened?", the
  reasons, "Comments" over the field, the action off until a comment is written. Nothing was sent.
- **The map**: the status badge at the bar's end, the map from the bar to the bottom, the four buttons at the top right,
  the card ("Pick up at", the store, its address, "0.62 km", "Show in other maps" solid and the call button), Google's
  logo above the card.

Corrected after looking: the status row wrapped its two badges (now the row's own children wrap), "Map" and "Call" were
not equal halves, the accept sheet's title repeated "Delivery time", an empty hour dropped the dial's label.

Not seen: the docked keyboard over a sheet (the emulator showed its floating toolbar, not a keyboard), any sheet on iOS,
the photo and delivery-code sheets (the local project asks for neither), "Collect in cash" and the states at the store,
towards the customer and with the customer, a finished order with "Review customer" in the bar, the review
screen, a group of orders, the map with the accept / reject bar, the call buttons dialling, a small phone, iOS at all. The old layout and its option are gone: nothing is left of it to see.

## 16. The redesign of the whole app, 2026-11-18

The owner approved a redesign of every screen, drawn as mockups, and decided it **replaces** the old design: one design,
no `legacy` layout, no theme option to choose between the two ([decisions.md](decisions.md), the rows of 2026-11-18).
Several agents built it in one working tree, each on its own screens; the schema was cut down to what the new design
reads and its defaults were set to the mockups ("Schema, second pass"). This section says what the redesign touched and,
above all, **what is not verified**. The list of what changed was written by reading the code, the schema and the
agents' reports; the results are those of the device passes below, as the device agents and the coordinator reported
them (the author of this page ran none).

### What changed, by area

- **Order** (details, accept / reject, the map): the `focus` design is the only one; `useOrderLayout` and the legacy
  views are deleted; the status steps and the stop card follow the decisions of the day ("Arrived to business" is not
  offered again once the driver has been through the arrival, read from `reporting_data.at['status:N']` since
  `last_driver_assigned_at`). The assign request's screen (`OrderDetailsLogistic`) was **not** redesigned: it still draws
  `OrderHeaderComponent` and `OrderContentComponent`.
- **Profile and account**: a list of sections; Information and Password are screens of their own (`ProfileEdit`,
  `ProfilePassword`), the schedule a screen of the stack, the photo a sheet (camera, gallery, remove). Camera and gallery
  need no Android permission and no native change (`launchCamera` of react-native-image-picker 8.3.0 uses an intent).
- **Orders list**: the next stop's line, search by chips, summary tiles, a group as one card, "View order" on the new-order
  alert, a locked request with no actions.
- **Messages, chat, map tab, permissions**: the unread counter (`UnreadMessagesContext`), recipients as chips, the map's
  bottom card (`MarkerCard`) in place of the callout, the permissions screen's checklist per platform.
- **Access**: Login, Forgot password and the two code screens share `AuthScreen` / `AuthAction`; errors under their field.
- **Guarded actions**: holds and confirmations ([THEMING.md](../THEMING.md), "Guarded actions"); accepting is never held.
- **Schema, second pass**: the new Identity, the corners, the round button, the map's shadow, the tabs' size.

### Device pass

One pass, on 2026-11-18, on the Android emulator (`Medium_Phone_API_37.0`, the debug build through Metro, the local API
with the schema registered there), signed in as the test driver with three orders in progress. Seen:

- **Orders list**: the pill tabs, the cards with the next stop's line ("Pick up at …" / "Deliver to …": the local API's
  list does carry `business.address` and `customer.address`), the delivery position chips, the timers.
- **An order on the way to the store** (status 8): the status row, the stop's card with only "Map" and "Call", the two
  folded rows, the order's comment, the products row, "More details" open with the store's other phone and its e-mail, and
  the bar with "Arrived to business", "Pickup complete" and "Pickup failed".
- **The hold**: a tap on "Arrived to business" showed "Hold to confirm" and fired nothing; a press released before 0.6 s
  showed the fill wiping in over the solid primary button and fired nothing. A hold was not taken to its end.
- **The order's map**: the status badge in the bar, the controls, the destination card with "Show in other maps" and the
  call button, the Google logo above the card. The map's tiles did not load on this emulator.
- **The chat opened from the order**: "Send to" with its two chips, the round send button, the history bubbles. After
  reading it, the Messages tab's count went from 158 to 148 and that conversation's row lost its count.
- **Messages**: the count on the tab before the tab was ever opened, the sort chips, the rows with their status badge,
  timer and unread count.
- **Map tab**: the count pill, the zoom pair and the locate button, a marker's card with its close button and "More info".
- **Profile**: the photo with its round camera button, the availability switch, the Information rows, the Password row,
  the Account rows with the language's value, Logout. The photo sheet with its three options; "Remove photo" asked its
  confirmation, the local API answered and stored `photo = ''`, and the profile showed the placeholder (the test user's
  photo was put back in the local database afterwards).
- **Information** (its own screen, labels above, the phone field, "Update" pinned and off with nothing changed),
  **Sessions** ("Current", "Started" / "Valid until", the solid and the outline bulk actions), **Schedule** (today
  highlighted), and Logout's confirmation (cancelled).
- **Search**: labels above the fields, the date and SLA chips, "Search" and "Clear search" pinned.

Not seen in that pass: the access screens (the test driver cannot sign out while it has orders), an offered order and its
accept, the order at the store, on the way to the customer, with the customer and delivered, the photo and PIN sheets,
the review, a group and an assign request, the new-order alert, a hold taken to its end, the Password screen, Payouts,
Stripe, the language sheet, the schedule-blocked and permissions screens, the keyboard over a pinned action, the
discard-changes question, a screen reader, reduced motion, and the real phone.

**Second pass, 2026-11-18, both platforms.** Reported by two device agents and partly opened by the coordinator. On the
iOS simulator (iPhone 17, a local QA driver) and the Android emulator the whole flow of an order from offered to
delivered with the review was walked, the holds firing once, the rule about "Arrived to business", the access screens,
the profile (photo from the gallery / the virtual camera, remove, a real edit, discard), sessions, the search, the chats
and unread counts, and the maps with the disc markers. It found the defects fixed after it:

- the pinned actions were under the keyboard;
- the Messages list stayed on an error after sign-in;
- the comment field was hidden in the reason forms;
- the launch stayed on the splash;
- today's row of the schedule was tinted only at its sides;
- the bill's look was not the mockup's;
- the order of the order's blocks was not the mockup's;
- the review's look was not the mockup's;
- a failed photo left a blank square.

Those fixes were seen in the third pass, below. Not reached in these two passes: the new-order alert and live updates
(no local socket server), the photo and PIN sheets (the local project asks neither), Payouts and Stripe (not configured),
the map's tiles (they do not load on the emulator nor the simulator). The third pass reached the photo and PIN sheets, Payouts and Stripe.

**Third pass and its check, 2026-11-18, both platforms.**

- The third pass (iOS simulator with the local QA driver, Android emulator with the test driver) confirmed on both
  platforms the fixes of the second pass's defects, and reached screens no pass had: the photo sheet and the delivery
  sheet with PIN and photo (a wrong PIN, then the right one completing the delivery), accept with no time to give (a
  single tap), the schedule-blocked screen, the Payouts row and screen and the Stripe screen (not connected), the
  permissions screen, the first step of removing the account (iOS); the launch with no stored session and the location
  granted (the tutorial showed about 6 s after the JavaScript started), Home edge to edge and the disc markers rendered
  as bitmaps (Android).
- It found what the second round fixed:
  - the comment field of the reason forms is brought into view after the keyboard has finished showing, from layout
    events (`useRevealField`), and its end stays in view while it grows;
  - a pinned bar over the keyboard keeps only its own padding (`FloatingButton` and the search form's bar), and takes
    the bottom inset back when the keyboard is down;
  - the chat's composer on Android fell short of the keyboard by the content's distance from the window's top: the
    chat passes it as `keyboardVerticalOffset` (`useWindowTop`);
  - `OBottomPopup` draws its handle by default (`showHandleBar={false}` leaves it out; decoration, no drag);
  - Information and Password ask "discard changes?" only when a value differs from what the screen opened with, and
    Update is enabled by the same rule;
  - after a wrong PIN the delivery sheet says the cause first and the wait second, and the accept sheet's dial always
    reads two digits;
  - Home on Android is drawn edge to edge by a native change (`ContentInsets.kt`, `WindowBackground.setContentUnderBars`,
    `src/utils/contentUnderBars.ts`, asked by `src/pages/Home.tsx`; its bottom is `account_page.base.padding_bottom` plus
    the inset), with light status-bar and navigation icons;
  - an API error that is a code is shown through `t(key, readable fallback)`, an empty answer says "Network Error", and
    the login the schedule validation refuses says the schedule-blocked screen's text;
  - the weekday keys of the catalog (`MONDAY`…`SUNDAY`, `DAY1`…`7`, the abbreviations, `DAYSHORT*`, `DAYMIN*`) were
    corrected in the 11 locales (181 strings, machine mistranslations such as "Wed" as "Casarse"), and "Thurday" was a
    fallback in code (`ScheduleBlocked`); no native speaker has read them;
  - the driver's own disc on the maps takes no tap, has no title or callout (only an accessibility label) and is drawn
    under the stops' discs, the stops' markers have no title either, and both maps set `moveOnMarkerPress={false}`;
    the map tab draws a store's disc only for the orders still to be picked up (the count pill counts every order);
  - the map tab picks the map or the permissions screen from the permissions context and re-checks every time it
    gains focus and when the app returns to the foreground, and the permissions screen does not `goBack()` when it is a
    tab's screen (granting used to send the driver to Orders);
  - the order's status row keeps its badges together and whole, the time at the row's end or on its own line at the
    row's start when it does not fit; the order card's badges row wraps (the type chip never shrinks, the timer sits at
    the end, under the chips when it wraps) and its skeleton follows; the comment's card trims its leading and trailing
    blank lines.
- A fourth, short check on the iOS simulator confirmed every item of the second round that iOS can show: the reason
  forms, the even 9.5 pt gap of the pinned bars over the keyboard on Login, the code screen, Forgot, Information and the
  search, the discard rule, the handle on three sheets, the dial's digits, the login's readable error for the schedule
  validation, "Thursday", the driver's disc, the store's disc only for orders to pick up, the permission taken away
  while the app runs (the permissions screen shows on the next foreground or tab visit, and granting brings the map back
  on the same tab), the status row and the card's chips with a long status, the comment's card.
- One open item came out of it: the accept sheet (`OBottomPopup`) still keeps its inset with the keyboard up, about
  54 pt between its button and the keyboard on iOS against about 9.5 pt for the bars. It was closed on 2026-11-19, below.

**Fourth check on Android, and what followed it, 2026-11-19.** On the Android emulator and the iOS simulator, against
the local API; reported to the coordinator by the device agents (the author of this page ran none).

- A fourth check on the Android emulator, with Gboard docked, confirmed: the chat's composer and send button whole above
  the keyboard from both entries (the order's details and the Messages tab), and a text sent; Home's Login button clear
  of the navigation area, with the photo reaching the four edges; the handle on the accept and the delivery sheets; the
  dial's digits; a wrong PIN showing "The code does not match" before the wait; the search's and the reason form's bars
  over the keyboard; the status row and the card's chips with a long status; the driver's disc taking no tap; no store
  disc for a picked-up order. It found one defect: on Profile → Information the pinned "Update" bar was overlapped by the
  docked keyboard by 37 px, and its gap over the navigation area with the keyboard closed was 66 px against 26 to 27 px
  on the modal forms.
- The fix of that defect, measured on the emulator by another agent. The cause: on Android the stack's screens are
  padded by the system bars (they start 63 px below the window's top on this emulator) and a `KeyboardAvoidingView`
  measures against its parent, so it fell short of the keyboard by that much; the modals (the reason form opened from the
  order's details, the review, the search) are a window of their own from y 0 and were never wrong. The rule now:
  `shared/KeyboardScreen.tsx` replaces every screen's `KeyboardAvoidingView` (on Android a measured wrapper gives the
  `keyboardVerticalOffset`; on iOS it is the bare view, unchanged), with a structural test that fails on a raw
  `KeyboardAvoidingView` outside `OBottomPopup` and `OModal`; and `barBottomSpace` (`src/theme/helpers.ts`; iOS as
  before, Android the inset the screen reads, without the `min_bottom_space` floor) gives every pinned bar the same space
  under it. Measured after the fix: 26 px over the docked keyboard and 26 px over the navigation area with it closed on
  Information, Password, Login, the code screen (measured on the pixels), Forgot password, the review and the
  Pickup-failed reason form; the search 28 and 27 px; the chat's send button 13 px over the keyboard, unchanged.
  **Visible change on Android:** the pinned bars of the stack's screens (the order's details, the access screens,
  Information, Password, the permissions screen) went from 66 px to 26 px over the navigation area; the tab bar keeps its
  floor. Not seen: the Accept / Reject page opened as a stack route from the orders list (tests only) and Home's project
  field (`use_root_point` is off locally). That agent did not run iOS.
- The accept sheet, after the owner's decision of 2026-11-19 (the gap over the keyboard made equal to the bars'). Before:
  `OBottomPopup` kept its inset and `sheet.padding` under a sheet with the keyboard up (53.3 pt on iOS, 91 px on Android,
  between the button and the keyboard). Now, with the keyboard up and `keyboardAware`, the body ends
  `bottom_bar.base.padding` over the keyboard. Measured on both platforms: iOS 9.3 pt (the button's bottom at 562, the
  keyboard's top at 571.3; Information's bar 9.3 in the same pass), Android 25 px (1492 against 1517; Information 26).
  The title and the close button stay visible with the keyboard up on both. With the keyboard closed iOS is unchanged
  (54 pt); **on Android every sheet changed**: the sheet now reads the real inset inside its own `SafeAreaProvider` (it
  read 0 before and added the 15 dp floor), so the accept sheet's gap over the navigation area went from 91 to 51 px and
  the profile photo sheet's last row from about 29 to 52 px. Not seen on a device: the delivery sheet's PIN and comment
  field with the keyboard up (the local project's PIN setting is off: unit tests only), and a phone without a home
  indicator.
- The native identifiers, after the owner's request of 2026-11-19 ([decisions.md](decisions.md)). The Android package
  (`applicationId`, `namespace`, the Kotlin sources) and the iOS bundle are `co.ordering.delivery`; the notification
  extension is `co.ordering.delivery.OneSignalNotificationServiceExtension` and the app group
  `group.co.ordering.delivery.onesignal`; the iOS project, workspace, target, scheme and folder are `ODelivery`;
  `builder.json` says the same. Left as they were: the JavaScript module name `deliveryApp` (`app.json`,
  `getMainComponentName`, `withModuleName`) and `rootProject.name`. The name shown under the icon was set to `ODelivery`
  on both platforms by the owner afterwards (`CFBundleDisplayName`, `app_name`, `app.json` `displayName`; decisions.md). Seen: Android `assembleDebug` succeeds and `aapt2` reports the new package; `installDebug` on the
  emulator, the session moved over from the old app's data, the app opens signed in on My orders, the old
  `com.deliveryapp` uninstalled (the coordinator). On iOS the Debug build of the `ODelivery` scheme succeeds, the built
  app and its extension carry the new identifiers and the group, and installed on the simulator with the old app's
  session moved over it opens signed in on My orders, the old `com.ordering.app1` uninstalled. After the owner set the visible
  name, `aapt2` reports `application-label` `ODelivery` for the Debug APK and Settings → Apps → App info on the emulator
  shows `ODelivery` (the update install kept the session: My orders); the built iOS app's `Info.plist` has
  `CFBundleDisplayName` and `CFBundleName` `ODelivery` and the simulator's home screen labels the icon `ODelivery`
  (the update install kept the session: My orders). Not verified: the name in the system's permission prompts, in the
  notification settings and on a real phone's launcher (they read the same name), Release
  builds, an archive, signing with a real profile, a real push (no APNs or FCM registration exists for the new
  identifier), a real phone. What a real build needs outside the repository is in HANDOVER.md.
- Local test data the agents moved and put back: order 3504 was taken to statuses 0, 9 and, by a completed hold, 11, then
  restored to 8 with its message deleted; order 3458 to 0 and back to 4.

Still not reached in any pass: the new-order alert and live updates (no local socket server: lists do not refresh by
themselves locally), the offline banner, a photo actually taken on iOS (no camera on the simulator; taken with the
virtual camera on Android), the map's tiles (they load on neither device), recovering the Messages list from a forced
error on a device (tests only), Android 14 and earlier, a real phone. (The fourth round, below, reached the new-order alert and the
live updates, the delivery sheet's PIN and comment field over the keyboard and the Accept / Reject pages opened from a group.)

### Fourth round (2026-11-19)

Reported to the coordinator by the device and build agents, on the Android emulator and the iPhone 17 simulator against the local
API; the author of this page ran none. The owner's decisions behind it are the rows of 2026-11-19 in [decisions.md](decisions.md); the
rules are in [THEMING.md](../THEMING.md).

**What changed in the tree** (uncommitted when this was written): the login has one tab per enabled way in, the phone included; the
sizes of the mockups, with 20 new schema keys and 16 changed default values ([components.md](components.md) section 6); the accept view's sheets
are presented in place, with one rule for success and an inline error when a change is not saved; a group's actions speak for the
group; the new-order alert is one instance mounted by `HomeNavigator` and gathers what arrives; the screens load again after a
reconnect; the unread count is in one place; the proof photo is not saved to the gallery; the iOS permission texts say what the app
does; `OAvatar` has a `tone`; `theme-exceptions.json` went from 20 entries to 7; 39 keys were added to the catalog, in the 12
languages of the file (16 for the alert, 13 for the group actions, 7 that were missing, 3 for the login).

**Native, after the identifiers changed.** The Kotlin location tests (123 passed) and the Swift ones (142 passed) were run. Android
`assembleRelease` succeeded (debug-signed; package `co.ordering.delivery`, label `ODelivery`, the JavaScript bundle inside). iOS Release
for the simulator and for an unsigned device (arm64) succeeded, with the extension's identifier. No CI step names anything that was
renamed. Not installed on a device, not signed with a real profile.

**The screens no pass had reached, on both platforms (before the sizes round).** The delivery sheet with a PIN, and with a PIN and a
photo, over the keyboard (the gap read 25 to 26 px on Android and 9.3 pt on iOS, as the pinned bars'); the wrong PIN's messages in
order; the photo taken on Android with the virtual camera; the Reject and Accept pages opened from a group in the list; "Hold to confirm"
on a tap of a request's Reject. Not reached: a photo on iOS (no camera on the simulator), a phone without a home indicator.

**The phone login, on both platforms.** Every combination of ways in (one, two, three and four tabs, and with WhatsApp), each tab with
the keyboard closed and up (26 px on Android, 9.33 pt on iOS), a wrong phone and password (the API's 400 shown as the inline notice),
and four tabs at 320 dp on Android. Not seen: a real phone login, a code actually sent, 320 pt on iOS.

**Real time, against a local sockets server** (the `websocket` project's dev compose, reached by a temporary local-only edit of the
submodule's sockets URL that was reverted after each pass; the local API's queue workers do not run, so the events were emitted from
scripts with the API's own `WebsocketHelper` and assign-request emitters, not by real API actions, and the driver's own action echoed
back could not be tested). The first pass found, and the second confirmed fixed on both platforms: the alert over another tab and over
a stack screen (iOS did not show it); "View order" of a request from another tab; the catch-up after an outage of 80 s with nothing
touched (the open order on Android, the list on iOS); the details' header count after the chat was read; a group request's name; a
message arriving over its own chat opening no alert; 2, 4, 6 and 10 arrivals gathered with "and N more"; requests gathered; a message
arriving while orders are open; a long headline wrapping (two lines on Android, three on iOS at the largest font). Also seen in the first
pass: the lists and the details following `update_order` live, the Messages counts live, the connection chip red during an outage and green
again. The sound was not heard: Android's audio and vibration reached the system, per its logs; iOS cannot be observed. Not verified on a
device: the reconnect's 1 s wait, the foreground rule on its own, the group's orders count in the alert, another language (the server's
dictionary has none for the local project). Left as they are: a `request_update` after a `request_cancel` does not bring the request
back; `tracking_driver` has no visible effect on the driver's own details; `order_updated_notification` has no emitter; the German
`ORDER_N_UPDATED` lacks a space before the number.

**The sizes audit** (kept outside the repository): 38 differences to fix, 9 settled by a decision, 10 where the mockups disagree among
themselves, 10 that reading could not determine. The 38 were brought to the mockups; four were left on purpose
([THEMING.md](../THEMING.md) section 9).

**Photos and permissions** (read in the tree): `NSPhotoLibraryAddUsageDescription` does not exist; the camera, photo library and location
texts of `ios/InfoPlist.xcstrings` (en, de, es, fr) and the English fallbacks of `ios/ODelivery/Info.plist` are the driver app's; the
two Bluetooth texts are gone and the four `*.lproj/InfoPlist.strings` files are deleted. Android's manifest has no camera, storage or
Bluetooth permission; the Debug build alone has `ACCESS_LOCAL_NETWORK`, for Metro (the "nearby devices" prompt is Debug only).
That last fact is the build agent's, and was not re-read from a merged manifest here.

**Not seen on any device when this was written:** the sizes round, the group titles, the accept sheet over the requests tab and over
the request's details, the failed-save notice, the dialog naming the group, and the iOS permission texts in a build.

### The final passes (2026-11-19, after the sizes round)

Two passes, one per platform (iPhone 17 simulator, iOS 27.2, 402 × 874 pt; Android emulator API 37, 1080 × 2400 at 2.625 px/dp),
against the local API, reported to the coordinator by the device agents; the author of this page ran none. Board by board against
the mockups, then fixes, then checks of the fixes on the platform named.

**What matched, on both platforms.** Headers and icons (24 / 22 / 18); sheets (handle 4, rows 50, the close at the padding); the
order card (actions 44, the position pill, the timer); the facts card; the cash block (64); a product's quantity box (28); the
stepper; the review (disc 56, columns 56); the Schedule rows (about 58, today's 76 with its badge); the profile rows (50 / 44);
Messages rows (76); the map's overlays; the Permissions disc (88); the tutorial, Home, Login, the code screen and Forgot; pinned
bars and sheets over the keyboard (iOS 9.3 pt, Android 26 px docked); the group titles; the failed-save notice (the sheet stays and
the retry works); the PIN sheet and the order of the wrong-code messages; and, on Android with the virtual camera, the photo
sheets (tile 120, thumbnail 72).

**Found and fixed, each then confirmed on the platform named.**

1. Folded rows of the order's details were 82 to 90 where the mockup has 50: the card added its own vertical padding. Now the card
   is the row: one line 52, two lines 60.7 to 61, the cash block 64, Done's two-row card 103 (iOS and Android).
2. Expanded products: the prices share the bill's right edge, a line is 48 (10 + 28 + 10), no space under the last line, a line that
   opens shows its chevron before the price, and the row's 44 target comes from `hitSlop` (iOS and Android).
3. The status row no longer wraps as a whole: the badges group wraps among its own chips and the time stays at the end (iOS and
   Android).
4. The order header's messages badge sits 2 from the button's top (iOS and Android).
5. "Remove image": 44 high, filling the row beside the 72 thumbnail, in the sheet (Android; the form variant by code only; iOS has no
   camera).
6. Reason forms: rows with a bottom divider and a 44 pitch instead of boxed cards (`ChoiceRow` `listed` / `last`); the radio is a
   drawn ring of `radio.base.size` (20), `ChoiceMark`. No logged decision had made them cards. A later Android check found the
   row's content at the top of the row; fixed in the last fixes (below).
7. A floating (undocked) Gboard lifted the pinned bars and left a strip of scrim under the accept sheet. One rule,
   `keyboardTakesRoom` (`src/hooks/useKeyboardVisible.ts`; Android: the keyboard takes room only if its end height is above 0 and
   its frame reaches the display's bottom within 48 dp; iOS always), used by `KeyboardScreen`, `OBottomPopup`'s avoiding views and
   `useRevealField`. Confirmed on Android: docked still lifts (26 px), floating rests without flicker, floating to docked and back,
   the accept sheet's white reaches the bottom edge.
8. The search by order number returned nothing on iOS (the controller left the `ilike` value unencoded there). The app now asks the
   controller for the encoded form on both platforms and sends `&`, `#` and `+` as the single-character wildcard
   (`OrdersOption/searchText.ts`). Upstream: the SDK should encode its query values.
9. An empty red toast on a failed accept of an assign request: an error toast always has a text (`apiErrorText`) and a toast with no
   message renders nothing.
10. API messages have their HTML entities decoded (`decodeHtmlEntities`, inside `getTraduction`).
11. The list reloads after the driver's own change, in one place (`OrdersOption`'s `handleChangeOrderStatus` wrapper), without
    depending on sockets.
12. The search's date chips wrap onto lines and "Custom range" has its calendar glyph (`ChipRow`).
13. Messages rows' meta line is one line with an ellipsis (the number first); rows stay 76.
14. The chat's composer ends `bottom_bar.base.padding` over the keyboard like a pinned bar (iOS 9.4 pt, Android 26 px).
15. Chat history entries never print "undefined", "null" or "false" (`Chat/changeEntries.ts`); only attributes the app has words for
    are shown; catalog keys `ORDER_ATTRIBUTE_SET_TO` and `ORDER_ATTRIBUTE_REMOVED`.
16. Login's four tabs fill the row when they fit (`Tabs` `fitFill`); the review's gap from the disc to the text is 15.
17. Profile's information rows: muted label, value in the text color (`OListRow` `titleMuted`), as the mockup.
18. "Collect in cash" at the customer (the stacked variant): `FoldedRow` `roomy` (padding `md`), 84.7 pt (mockup 83.2).
19. The requests button of the Orders header is a switch (pressed again it returns to the orders tab the driver was on); selecting
    the requests tab while it is open reloads it instead of leaving its skeleton for good (the submodule sets `loading` on every
    selection but loads only when the tab changes).

**Touch targets reported as small** (Forgot, Resend, the password eye) already had 44 pt through `hitSlop`: confirmed by tapping
outside their visible frames; nothing changed.

**By decision, unchanged:** the map's zoom, fit and locate buttons at 32; the status badge's padding; the chat system message's
padding; one count-badge size; the platform's own switch (iOS draws it 63 × 28); the Orders strip's five tabs; "Remove image" of the
proof photo is not confirmed.

**Not reached in the final passes:** the new-order alert (no sockets in these passes; it was verified in the sockets passes above);
MapPending, Payouts and Stripe (no entry for the test driver); ScheduleBlocked (config off); Remove account's second step (the agent
was refused the tap and did not work around it); a photo taken on iOS; the code screen with a floating keyboard; "Remove photo" over
the profile sheet on Android (the QA driver has no photo; seen on iOS); a logistic request's details with a real request on Android;
tutorial pages 2 to 5 on Android; the map's tiles (they load on neither device). For testing on Android the emulator was restored from
a snapshot during the day, reinstalled, and signed in with the local QA driver (the owner was asked).

### Fifth round (2026-11-19, later): native headers, send options, tracking events, the hold

Reported by the device and build agents, against the local API (on the branch of api-core for the events), on the Android emulator and the
iPhone 17 simulator. The decisions are the rows of 2026-11-19 in [decisions.md](decisions.md); the module's description is
[LOCATION_MODULE.md](../LOCATION_MODULE.md).

**The confirmation and notice dialog.** Every confirmation and notice is the app's own dialog (`ConfirmDialogHost`), and every
`Alert.alert` outside the submodule was converted ([THEMING.md](../THEMING.md), the primitives' table). The reports this page
was written from do not say which of the converted dialogs were looked at on a device, so none is claimed as seen here.

**The hold.** Cause of "after a held action the next touch is ignored", proved with temporary traces (since removed): the action fired
on the 0.6 s timer while the finger was still down, the status change unmounted the pressed button, the touch's end never reached
JavaScript and the unmounted `Pressable` stayed the responder. Now a held button still fires on the timer but nothing removes the
pressed element until the touch ends (`shared/holdLatch.ts`: `holdFinger`, `useSettledWhileHeld`, `afterRelease`; a latch frees itself
after 15 s); the order's bottom bar (`OrderDetails/Delivery.tsx`), the assign requests' list (`OrdersOption`) and the reject's go-back
(`OrderDetailsLogistic`, `Delivery`) wait for the release, and the hold also completes by the clock at the release (a busy JavaScript
thread no longer loses a hold; **the sixth round replaced the JavaScript clock by the touches' own timestamps**). **Seen on iOS:** 187 follow-up touches after holds of 0.7, 0.9, 1.3 and 2.0 s on the four guarded
buttons, 2 missed; the same automation loses 1 to 3 % of plain touches at rest under the machine's load that day, so the two misses are
not attributed to the hold; and a real finger has not confirmed it. The request card's Reject in the list: 14 of 14. **Not seen:**
reduced motion, VoiceOver, and Android after this fix (the Android check ran on the bundle that had it but did not repeat the hold
experiment).

**Native request headers** (the sibling app's change, both headers; **the sixth round limited `X-Device-Id-X` to the Ordering API's host**, below). Seen at runtime on both platforms, read from the local API's access
log with the device id's value never printed. Android: `ODelivery/1.0 (co.ordering.delivery; build:1; Android 17; Google
sdk_gphone64_arm64) okhttp/4.9.2`. iOS: `ODelivery/1.0 (co.ordering.delivery; build:1; iOS 27.2; iPhone18,3) CFNetwork/3896.200.61
Darwin/27.2.0` (the previous build sent `ODelivery/1 CFNetwork/…`). `X-Device-Id-X` is present on the fetch, position and event requests
(Android 16 hexadecimal characters; iOS a 36-character UUID, one value across the run). **Not seen:** the id surviving a reinstall on
iOS; a Release build; the Builder's package rename with the fixed package `co.ordering.app`. `src/config.json` must not carry a
`userAgent` key (it would override the native one): the agents never opened that file, so this is for the owner to check.

**The two send options.** Android: request starts 1499 to 1583 ms apart (mean 1512) with fixes every 350 ms (the hook's filters were
lowered temporarily for the run and restored); the timer sends the pending fix with no new fix; overridden by local config rows to
4000 ms and off without restarting tracking; the rows were deleted afterwards. iOS: with fixes every 0.6 s request starts 1559 to
1587 ms apart; `location_at` equal to `date -u` to the second, and equal to the fix's time on a late send; overridden to 4000 and off
and back. The API does not read `location_at` (the owner chose not to change it: [decisions.md](decisions.md)); a server-side shield
(`DriverLocationShield`) ignores positions closer than its own interval to the driver's last one in projects that are not exempt, so
the 1.5 s floor does not change what such a server stores.

**Tracking events.** The contract is described in `docs/LOCATION_MODULE.md` "Tracking events" and in api-core's
`docs/DRIVER_TRACKING_EVENTS.md`. **Seen end to end on Android** against the local API on the branch: every family stored with its own
time and duration (GPS off and on, 8 s; offline: events kept and delivered oldest first on restore; a retried batch stored once; battery
saver; background and foreground; a simulated position once per 10 minutes; permission always to while_in_use and to denied; a kill:
`tracking_stopped` `system` at the heartbeat's time, then `tracking_started` `restart`), the driver's state following each. **On iOS:**
started, system stop and restart, background and foreground with duration, Control Center gives no pair, permission changes (the
simulator does not kill the app on a permission change), a simulated position per session. **Not seen:** a clean stop
(`unavailable`, `logout`, `schedule`, `session_revoked`: the QA driver has assigned orders); the 4xx drop and the 401 paths against a
live API (unit tests only); Location Services off globally, Low Power Mode and a real connection loss on iOS; the background with the
screen locked; a Release build; a real phone. **Found while doing it:** the old JavaScript `set_app_in_background` sender never fired (it
read `loaded` from the first render's closure); the old `turn_off_mobile_data` time was written as `YYYY-MM-DD hh:mm:s` in local time;
the old `turn_off_gps` fired only with a map screen open and on any watch error.

**The API for the events:** api-core branch `feat/driver-tracking-events`, commit `35067e141`, draft pull request
Finitless-com/api-core#3882: the event's own time, idempotency per `(author, uuid)`, the history `GET /users/{id}/tracking_events`,
`driver_tracking_states` (`params=tracking_state`) and the broadcast `driver_tracking_event`; 55 new tests there. It must be deployed
(migrated) before an app build that records events. (The sixth round added the commit `c8aa810ce` to the same pull request: below.)

Last fixes of the day: **Reason rows:** the content is centered in the 44 dp row (`justifyContent: 'center'` on the listed style only);
seen on Android: ring center 488 px against the row's middle 487. **A stop settles what is pending first:** a change held in the 2 s
debounce whose condition still differs from the recorded state is emitted with its own detection time before `tracking_stopped`
(`settlePending()` in both cores' `TrackingRecorder`), so every opening event has its closing one; seen on iOS: background, then a
permission revoke while in the background, relaunch, stored rows `set_app_in_background`, `location_permission_changed` (always to
denied), `set_app_in_foreground` with `duration_ms` 7 541 and `tracking_stopped` reason `permission`; known and left:
`location_permission_changed` is not debounced, so it is queued before the settled foreground although it occurred later
(`occurred_at` is right, only the order of arrival differs). **Start reasons:** `permission` is a start reason (a start after a
permission stop), `session_revoked` maps to a `login` start, and `restart` is only what the native recorder says when it finds an
orphaned session; seen on iOS: granting "Always" after a revoke stored `tracking_started` reason `permission`. **"While Using" keeps
tracking** (the owner's decision of 2026-11-19): the rule lives in one place in JavaScript, `src/context/canTrackLocation.ts`, exposed by
`PermissionsContext` as `canTrackLocation` (iOS: "While Using" or "Always"; Android: every foreground permission, the background one is
not required) and used by `useDriverLocationTracking` for the start, the stop and the stop reason; `isGrantedPermissions` keeps its
meaning (the map tab's gate, the order actions and the "Always" dialog are unchanged); no native change was needed. Seen on iOS:
granting "While Using" with the app running showed the "Location access must be Always" dialog, no `tracking_stopped`, the permission
event stored and positions sent with HTTP 200; a fresh launch with only "While Using" started tracking; a revoke gave the permission
event and then `tracking_stopped` reason `permission`. Seen on Android: after revoking the background permission and relaunching,
tracking started, a position was sent and the event always to while_in_use was stored. Not seen: a real phone (a real iOS kills the app
when the authorization changes in Settings; the simulator does not) and Android 10. **A stale record** was removed from
`theme-readers.json` (`^radio\.base\.(size|unchecked)$`); `theme:keys` prints "every key has a candidate reader" with no advisory.
The native tests after these fixes, as the agents ran them: Kotlin core 272, Swift package 306.

### Sixth round (2026-11-19, later): the three reviews and their fixes

Three independent reviews read the tree as it stood after the fifth round's last fixes (HEAD `1f50004` plus the uncommitted set): the
native module, the JavaScript, and the API commit `35067e141`. Each reviewer only read (nothing was run by them); each finding was then
checked against the code by the agent that fixed it, with the failing test written first where a test could show it, and the fixes were
made by separate agents (native, JavaScript in three passes, API, catalog). The decisions behind them are the rows of 2026-11-19 in
[decisions.md](decisions.md): the device id only to the API, "While Using" keeps tracking, one state row per driver, `location_at` sent
with the API unchanged, at most three numbers and "and N more" in the alert (the owner's); and the row "Calls made in the sixth round"
(the coordinator's). **The fixes were first tested in code (Jest, the cores' tests, the API's own stack), and the native ones also seen on the iOS
simulator. The device passes that followed, iOS and then Android, are at the end of this block.** The test counts below are the fix agents' own, taken from their reports; the existing test files were counted in the
tree where this page names them.

**The JavaScript review: what it found.** (1) Rows of the orders and requests lists are memoized and kept the handlers of an old render,
and the controller's handlers write whole-list snapshots from them: with a socket adding a request while another was rejected, the new
one vanished or an answered one came back. (2) A late answer of the accept sheet closed or overwrote a newer sheet. (3) The dialog's
accept button, tapped twice, ran its action twice and dropped the next queued dialog; a re-mounted host lost its queue; an informational
alert showed a Cancel that also went back. (4) A group's step buttons skipped the photo and location rules, and the list's request
dropped a photo (worse than reported: in React Native a `FormData` has `_parts`, so the request went out with `_parts` and the id and
no status). (5) A finished fade-out hid the next toast. (6) The delivery step could be sent twice during a GPS fix, and a thrown request
left the bar disabled. (7) The new-order alert waited for a GPS fix and a `fetch` with no timeout, or was dropped when there was no
position, its error toast had its arguments swapped, and its sound was fetched from a CDN every 2.5 s. (8) The hold was judged with the
JavaScript clock and any finger's touch end released the latch. (9) The accept view's offline branch registered a boolean in the offline
store, sent the request and queued it too, and could stay locked. Smaller risks: a reconnect's reload racing a status change, several
reloads at once, stale read marks of the unread count, `OBottomPopup` calling an absent `onClose`, `Tabs` `fitFill` never measuring again,
`;` and `=` in the search, work done in render, `OButton`'s literals.

**The JavaScript fixes, and how they are tested** (pass A: the shared pieces, the alert, the delivery step; pass B: the lists, the accept
view, the groups; pass C: the follow-ups the first two left for files they did not own). All 14 findings of pass A and the 10 of pass B
were confirmed and fixed. Pass A: 67 suites and 1 017 tests in its folders (shared, `NewOrderNotification`, `OrderDetails`,
`OrderDetailsLogistic`, hooks, context) and 9 suites and 264 tests besides (`FloatingButton`, `LoginForm`, Sessions, `UserProfileForm`); its
new tests were written first or mutation-checked (the fix reverted, the test goes red): four in `ConfirmDialogHost.test.tsx` (two fail without the fix), four in `OToast.test.tsx` (three), two in `Delivery.test.tsx` (a second hold during a slow fix sends nothing; a thrown request gives the bar back), five for the alert
(a position that never resolves, no GPS, a hanging post, a refused post; 2 fail with the old awaiting code), the hold's tests rewritten (a short
tap handled late is still a tap, a real 0.65 s hold on a busy thread still fires once, no timestamp and one timestamp fall back to the JavaScript
clock), four for the second finger (3 fail without the fix), the three latch risks, the refetch hook (5 tests, 2 in `Delivery.test.tsx`, 1
in the Logistic suite), the dialog's re-mount and route changes (3), the unread count per order (3), `OBottomPopup` (1), `Tabs` (3) and
`OButton`'s touch box from the theme (1). Pass B: 66 suites and 1 299 tests in its folders; the three "a row keeps no old closure" tests of
`PreviousOrders.test.tsx` were shown to fail without the fix (the other fixes were reasoned, not mutation-checked: for example the old code
called `registerOffOrder(true)`), 4 tests for the late answer in `useAcceptSheet.test.tsx`, the hidden-status and location-sheet cases in
`PreviousOrders.test.tsx` and `AcceptOrRejectGroup.test.tsx`, 9 "without connection" tests in `AcceptOrRejectSheet.test.tsx` and 2 in
`useGroupStatusUpdate.test.tsx`, `useReloadQueue.test.tsx` (7) and `OrdersOption.test.tsx` (8), and `useStableCallback.test.tsx` (3). Pass C:
the notice on its callers (the two d4 UI stubs of `jest/helpers` draw `alert-notice`; `DeliveryApp` has a source-text test for `NoticeAlert`),
the offline queue merge (`OfflineActionsProvider.test.tsx`, 8 tests: calls in a row and in parallel all stay, a list is written together,
the queue builds on existing storage, one request per order on reconnect, a failed order stays), the group titles (`catalog.test.ts` holds the
nine keys the accept view reads straight, and that `GROUP_REQUIRES_CONNECTION` does not exist), `skipsStatusImage` (with status 8 in
`states_requiring_image_driver`: the delivery-time sheet has no photo block and sends a plain body, the accept sheet still requires it) and the
dialog's route key (asked mid-transition and it stays; popped and it is withdrawn once; another screen pushed over it; a navigator asking before
its inner state exists; none for no route or no state). Pass C's targeted run had 5 failures, all 5-second timeouts under load (`LoginForm`,
`OrdersOption`, `PreviousOrders`), and the three folders re-run alone passed (15 suites, 434 tests). In the three passes `tsc --noEmit` was
clean, eslint had 0 errors, `theme:guard` printed `ok: 0 literals` and `theme:keys` was ok; pass C also ran `i18n:verify` and
`i18n:check-generated` (green). A test of the old "queues nothing for a photo" case never awaited the photo, so its `not.toHaveBeenCalled()`
checks passed for nothing; it now awaits and checks the toast.

**Left, with the reason.** The controller (`OrderListGroups`, the submodule) still writes whole-state snapshots in `handleClickLogisticOrder`,
`handleClickOrder` and `loadOrders`, and its `handleChangeOrderStatus` cannot send a photo: the app mitigates (stable handlers, the reload
queue, no photo for a group) but the fetch window inside `handleClickLogisticOrder` stays, and a group photo needs a multipart handler
upstream. `syncChanges` rewrites the offline queue from its own snapshot, so a change queued while a sync runs could be lost (rare, older than
this round). The delivery-time sheet offline queues `{delivered_in, status: 8}` through the order-status queue where online it uses
`handleUpdateLogisticOrdersEta`: not checked on a device. A double tap whose second tap lands on the next of two dialogs asked back to back
answers that one (only the same-frame double tap is guarded), and a very busy thread that runs the 0.6 s timer before a short tap's release
event still fires the hold (the timestamps fix the case where the release is handled first, which is the reviewer's). A tab change withdraws an open
question as a push covering it does (a one-line change to "only when the screen unmounts": the coordinator's call, in the decisions). The
alert's sound is a 0.46 s chime repeated 12 times every 2.07 s; the 2.5 s re-trigger plays chime 1, then chime 2 cut about 60 ms short, so the
rhythm is uneven (0, 2.1, 2.5, 4.6, 5.0 s...) and nothing long is cut: left as it is, for the owner to hear (an even rhythm would be about
2.0 s with the vibration moved with it; a native loop needs `MediaPlayer.setLooping` in `AlarmSoundModule`, a native file). The reviewer did not
read most of the 172 changed files outside its groups, `SocketReconnectContext` with the real `useWebsocket`, or the toast provider (the
fixer read the provider: it hands a new `hideToast` on every render, which restarted the toast's timer; fixed). No finding of this review was
refuted.

**The native review: what it found.** Android: a 401 answered to a request made with an old token logged out the new session (iOS had a
generation guard, Android none: a logout and a quick sign-in, or a token refresh in the middle of a request); a restarted service overlapped
the previous worker, with two stores and two queues on the same files. iOS: `tracking_stopped` could stay unsent after a stop when the last
position request failed; the recorder's start snapshot read a stale connection; the device id's first read raced and deleted the other path's
item. Risks: the id and the detailed User-Agent went to every host (Google's static maps, the CDN: the owner decided "the id only to the API"),
the iOS session's headers frozen at its opening, `closeOrphan` not serialised, the start and stop reasons as process globals, a debounce timer
that could fire after it was replaced, and several statements that were only documented (Android "online" is a validated network, a condition
open at a clean stop, a swipe-away, `nanoTime` timers, the main thread's wait on iOS, two comments that said "never a url" and "consumed").

**The native fixes, and how they are tested.** All five defects were confirmed. Android: one process-wide worker, one recorder store and one pair
of queues (`DriverLocationRuntime.worker()`, never shut down; a sender's `retire()` stops its timers first, and the final `tracking_stopped` and
its send are ordinary queued tasks); a 401 belongs to the headers its request was sent with (`latestHeaders`, `currentHeaders` on the events
lane) and a stopped sender reports nothing; one `Forwarder` per run (`SessionLink`) that stops only its own recorder; the reasons travel with the
request (an intent extra for the start, the argument of `requestStop`). iOS: the events lane is pumped at the end of every outcome except a latched
401; the connectivity monitor is started before the snapshot, forgets its last reading when it stops, and "not known yet" makes no event;
`DeviceIdReader` reads one at a time, caches, adds a missing item and deletes only an existing one that is not a UUID; the debounce's pending
carries a token. The id only to the API: JavaScript calls `setApiRoot(ordering.root)` (a synchronous method of the module, from the hook, before
any parent's effect) and native code compares host and port: an OkHttp interceptor on Android (`ApiHosts.kt`, `UserAgent.kt`), and on iOS
`RCTSetCustomHTTPRequestInterceptor` (React Native 0.88's per-request hook, which sees fetch, XHR and images; the session keeps only the
User-Agent); until the root is known no request carries the id; the location module's own requests go to the API and keep both. Also done: `Retry-After`
(seconds, 429 and 503, at most 5 minutes) on both lanes and platforms; a clock that went back now waits one whole interval from now (the old branch
kept waiting until the clock caught up; found by the new test); `ExecutorSchedulerShutdownTest` rewritten with latches and no sleeps. Tests: Kotlin
core **290, 0 failures** (JDK 17); the Android app's JVM tests **30, 0 failures**, and `:app:testDebugUnitTest assembleDebug` succeeded;
`swift test` **325, 0 failures**; `xcodebuild` Debug for the simulator succeeded; `tsc --noEmit` clean. New named tests, counted in the tree: `StaleAnswerTest`
7 (5 fail on the old logic, by mutation), `SessionLinkTest` 3, `SharedWorkerTest` 4 (stop then an immediate start gives stopped, started and no
`system` / `restart`; a later kill is still reported; one characterization test shows the old two-worker ordering inventing the pair),
`RetryAfterTest` 5, `HeadersInterceptorTest` 8 (the API gets both headers, another host only the User-Agent, none until the root is known, a sibling
subdomain and another port are not the API, JavaScript's own headers are kept), `ReviewFixTests` 19 (Swift: every outcome pumps the events lane, a latched 401
does not; the new owner on Wi-Fi after an offline session emits no connection event; the real `NetworkPathMonitor` forgets its reading; the
Retry-After transport test through a `URLProtocol`). `DeviceIdReader` has no app test target, so it was tested in a throwaway harness that compiles the
marked section of `AppDelegate.swift` (12 tests, 0 failures, including 8 concurrent first-launch readers: one id, one add, zero deletes); **the harness
is not in the repository**, so that result cannot be repeated from it. In that run, `jest src/native src/navigators src/context` gave 350 passed and 14
failed in two suites (`RootNavigator.push`, `RootNavigator.launchLimit`): the tests' own partial mock of `NavigationRef` (fixed afterwards, see "The two RootNavigator suites" below).

**What was seen on a device, and what was not (native).** **iOS** (iPhone 17 simulator): the Debug build was installed over the existing app, with
`RCT_jsLocation` at `localhost:8082`, and launched ("Later" on the notifications dialog). The local API's access log (shape labels only, never the value)
showed `configs`, `theme`, `translations`, `order_options`, `orders`, `tracking_events`, `notification_tokens` and `users/N/locations` all answered 200 with the
detailed iOS User-Agent and an id of the shape of a UUID v4, the very first requests included (`setApiRoot` was in time). The orders list's Completed logo
loaded. **The map tab showed blank tiles** (no Google key locally), so the marker image could not be judged, and **no request to a third-party host was
observed**: "no id reaches a third party" on iOS rests on the unit tests and the interceptor's design, not on a capture. **Android** (emulator-5554):
**not verified**: `installDebug`, `adb install -r` and `pm install -r` of the 221 MB APK each broke or hung the emulator's `system_server` (host load 17 to
40, 3.9 GB of RAM), it recovered each time, the last attempt timed out at 240 s, the emulator was not restarted and the pushed file was removed; the installed
Android app is the previous build, signed in, so Android's "id only to the API" rests on `HeadersInterceptorTest`. (The device pass at the end of this block installed an arm64-only build after a cold restart and saw the headers on Android; the 401 guard, the single worker and the reasons stayed unseen there.) **Not seen anywhere:** Android on a device
for the 401 guard, the single worker and the reasons (JVM and core tests only; the service's own glue is tested only through `SessionLink`); iOS on the
simulator for the events lane after a failed request, the restart after an offline session and the debounce token (core unit tests only); a real phone. Both
apps were left signed in and tracking (iOS on the Orders tab).

**Refuted, changed in scope, or documented instead of changed (native).** D4 is real for a changed owner or a cancel; with the same owner the persisted open
condition already masked the symptom. R7 needs a stop and a start between the timer firing and its posted `fire` (a plain flap cancels), so it is narrower than
the review said. **Documented, not changed** ([LOCATION_MODULE.md](../LOCATION_MODULE.md), "Not changed, stated"): Android's "online" is
`NET_CAPABILITY_VALIDATED` (on a network whose validation never succeeds the driver reads as offline while positions flow); a condition open at a clean stop
is closed at the next start with a duration that spans the untracked time, and the server's state keeps its old value off shift (closing them at the stop would
send events for something that did not happen); an Android swipe-away is reported at once as `system`; the executor's delays use `nanoTime`, which does not
advance in deep sleep; iOS `start` and `stop` wait on the sender's queue from the main thread; `Retry-After` is read as seconds only. The queue and state files'
comments now say that the owner file holds the two urls.

**The API review: what it found.** In `35067e141`: an `occurred_at`, or a history's `from` or `to`, of `0000-01-01 00:00:00` (PHP parses it, PostgreSQL refuses it) gave a 500 and a critical
notification, as did an `object_id` beyond int4; a tenant whose schema was not migrated, or whose unique index was missing or INVALID, answered 500 to every request
that carried `uuid`, `occurred_at` or `duration_ms` (any authenticated user can send those) and the app would retry for ever; the state was written in a nested
transaction whose deadlock error Laravel does not roll back, so the commit could become a rollback while the request answered 200 and the app deleted its batch.
Risks: no limit on `data` (copied into up to 20 broadcast packets), no guard against a client looping requests, warnings with no project or driver, `tracking_state`
readable by levels 7 and 9 that the history refuses, a migration whose `ALTER TABLE`s queue every insert behind a long reader, and tests that could not catch what they
claimed (no real concurrency test, a pre-migration table that only renamed columns).

**The API fixes, and how they are tested** (commit `c8aa810ce` on the same branch, pushed, so draft pull request api-core#3882 now has two commits). All findings were
confirmed, each reproduced against the first version first, except one reviewer claim confirmed only in part: D3 (Laravel's `ManagesTransactions::handleTransactionException`,
in 13.26.1, decrements the level counter and rethrows a nested deadlock without issuing `ROLLBACK TO SAVEPOINT`, as the reviewer remembered; with a trigger raising 40P01
on the state table the old code answered 200, stored 0 events and queued 1 broadcast for events that no longer existed). Now: dates from `2000-01-01 00:00:00`, int4 for `object_id`
and the history's `user_id` (beyond it is a user that does not exist), `duration_ms` from 0 to bigint, `page` and `offset` bounded, the history's `events` filter limited to
`[a-z0-9_]{1,64}`, the User-Agent stored as valid UTF-8 of at most 1 000 characters, `data` over 4 096 serialized bytes or 5 levels is a **400** (not truncated; this applies to every
request shape, so a storefront click with more than 4 KB of `data` now gets a 400), a legacy request is inserted in chunks of 1 000 rows (7 500 events exceeded the bind-parameter
limit), and the 100-event cap applies to the stamped shape only. An unmigrated project degrades (SQLSTATE 42703 or 42P10 only): the events are stored through the old insert
and the request answers success, with no state and no broadcast, the project is remembered for 5 minutes in the cache and one `Log::notice` per project per hour says it needs the
migration (their `uuid`, `occurred_at` and `duration_ms` are lost, and a retry of the batch is stored again). The events' INSERT commits on its own (retried up to 3 times on a
deadlock or serialization failure); the state upsert and the broadcast run after it, each in its own `try`, and a retried batch repairs a state that was not written (a strictly
newer rule: a tie never rewinds it). One `driver_tracking_event` per request (the newest live event, the state after the batch and `earlier_events`, at most 20, without `data`),
at most one per driver per second (the `DriverLocationShield` pattern: a packet held back is dropped, the state stays readable). `tracking_state` is returned only to the roles that
may read that driver's history (administrator, business manager and driver manager in the lists; administrator and the driver himself in the single read), and left out for others
who ask. The migration runs every `ALTER TABLE` under `lock_timeout` 3 s with up to 10 retries, refuses to start below PostgreSQL 14 and documents that `down()` loses `uuid`,
`occurred_at`, `duration_ms` and `id`. **Tests:** 68 integration tests in four files (`DriverTrackingEventsTest` 38, `…ListTest` 15, `…HostileInputTest` 8, about 130 hostile inputs, each
a 400 that stores nothing and logs nothing at warning or above, `…UnmigratedTest` 7: a table really before the migration, one without the unique index, one with an INVALID
index, the signal once, the new path again after the memory expires, another SQL error not swallowed) and 24 unit tests, green, and the unit file with all of `tests/Unit/OpenApi`
gave 254 tests and 18 305 assertions green (the frozen-count tests did not move: no route changed); `node --test tests/Node/ApiDocumentationRunbookTest.mjs` passes; a real
concurrency test (a held uncommitted INSERT of one uuid and a second connection: the second waits and stores only the other) and a test that fails if the validation literals drift
from the constants. The migration was re-checked on a scratch database of the test stack (a rebuild of 400 000 rows in about 1.8 s, a second `up()` identical, a real failed
`CREATE UNIQUE INDEX CONCURRENTLY` repaired, `down()` twice and `up()` again; with a reader holding the table for 9 s `up()` waited, retried and succeeded, and an insert was held
about 2 s instead of about 7.5 s). The local `development` database needed nothing re-applied. A smoke check of the unauthenticated route answered 401. **How the test run was made
unable to notify:** the run script gave the test environment the Slack switch off and every webhook variable empty, the copy of the working tree excluded the owner's two local
files, the unit runs had no network and the integration network was internal, and the test classes fake the queue; verified inside the container before any suite ran. The OpenAPI
files were regenerated (they only gain `maximum` on `page` and `offset`).

**What the API fixes change for the app and the Dashboard.** The request and response shape is unchanged for the app. New 400s where there were 500s: an `occurred_at` before
2000, an `object_id` outside int4, a `data` over 4 KB or 5 levels (the app drops a batch on any 4xx but a 401, so it would be lost, not retried; the app's events carry a few hundred
bytes). On an unmigrated project the app now gets success instead of an error it would retry for ever. The Dashboard: `driver_tracking_event` is one per request with the new key
`earlier_events`, and one is dropped if the same driver already had one in the last second, so it should read `tracking_state` on open and on reconnect; the history's `events`,
`page` and `offset` have bounds. The Dashboard has no screen for any of it yet, and it must escape `data` (any authenticated user can write it, and managers read it).

**Left (API).** `tracking_events` has no retention: it grows with every driver event and a purge by `occurred_at` is not in place. `GET reports/tracking_events` (not touched)
filters on the arrival time, which has no index. `app/Exceptions/Handler.php`, line 144, throws a `TypeError` while rendering an exception for any request whose input holds
nested arrays (`$request->only($request->input())`): it is older than this work and was not changed; the new tests use `withoutExceptionHandling()` where they provoke a real 500.
An `occurred_at` up to 5 minutes ahead is kept and can make a correct event of another phone lose a family for that long, and a Redis outage costs a timeout per push inside the
request (both noted by the review, not changed). **Not verified:** production's PostgreSQL 14 itself (the test stack is 15), whether the production log channel shows
`Log::notice` (its default channel is `none`), long-lived workers such as Octane, the `RouteLockParity` / contracts suite and `pnpm docs:check` (no route changed), the whole integration
suite, and the Dashboard consuming the new packet. The local API must run with `USE_SLACK=false`, and no suite was run without the test environment's switch off.

**The catalog.** The step texts of 9 of the 11 locales rendered "business" (the store) as "work", "job" or "affairs" ("Arrivé au travail", "Arrivato al lavoro", "وصل إلى العمل",
"Пристигна на работа", "İşe vardık"): 60 texts in 20 keys were corrected to the word each locale already uses for the store, the English and the code untouched (the
table is in [decisions.md](decisions.md), the row "Calls made in the sixth round"). `pnpm i18n:generate`, `i18n:verify` and `i18n:check-generated` pass, and
`catalog.test.ts` with the `i18n` tests gave 37 passed; no test pinned a changed text. **Left:** the Arabic plural "الأعمال" in about nine admin keys, `DISABLED_BUSINESS` in es, fr, da
and nl ("handicapped" for "disabled"), plural-for-singular renderings, bg and da `BUSINESS_PHONE`; **no native speaker has read any of it**, the corrected texts included.

**What the next device check must look at** (the fix agents' lists, merged; the native ones are also section 7 of [LOCATION_MODULE.md](../LOCATION_MODULE.md)). Native: Android with
the id only on API requests and a third-party request without it; logout and a quick sign-in on a slow network (no second logout, no `system` / `restart` pair, the log line
`state unauthorized ignored: not the running service`); a token refresh in the middle of a request; iOS stopping tracking during a slow position request; iOS restarting after an offline
session; iOS launching before the first unlock; the map's marker image and the orders list's logos after the interceptor, on both. JavaScript: the hold's 0.6 s once, a quick tap's hint, two
fingers on one button lifting the second first; the "Hold to confirm" hint followed at once by an error toast (the error keeps its full time); the alert with no GPS and no network (it appears at
once, the error toast only with no position) and its sound in airplane mode on both platforms, on Android with and without the alarm module, no pause or cut between cycles; the Login tabs after
a rotation and with a large system font; a double tap on "Logout"; a reconnect during a hold (the delivery bar does not flick back); a question open (logout) while a notification tap
navigates elsewhere (it is withdrawn) and a question asked right after a push (discard changes: it stays); the notices of the maps, the chat and the review show one "Ok"; with the
requests list open, a socket adds a request while another is rejected (the new one stays, the answered one does not return); a group's "Accept all" with a photo status (no button) and a step
with `location_validation_*` on 3, 9 or 11 (a sheet that blocks if any order is far); in airplane mode with `allow_save_changes_offline` on: a single accept (no request goes out, one order
registered, it syncs once on reconnect), a group of two or more (the sheet closes, each order unsynced, each sent once on reconnect) and a photo status (the new toast, the sheet stays); a
reject followed quickly by a refresh (one reload after the answer); typing in the orders search (no flip) and "Search" then dismissing the form (the filters notice stays); a delivery-time sheet
after accepting a request with status 8 in `states_requiring_image_driver` (no photo block).

**Device pass of the sixth round** (the iOS pass after the fixes above, then the list fix it caused and its iOS confirmation; the Android pass on 2026-11-20, 07:35 to 08:03, after a first attempt on the evening of 2026-11-19). Reported by the device agents against the local API, driver 13217 and a few test orders; the identifiers below are shapes, never values. Their screenshots and logs are in session scratch folders, **not in the repository**: `scratchpad/pass6-ios/` (contact sheets, the API log lines), `scratchpad/pass6-fix-list/` (the iOS confirmation of the list fix) and `scratchpad/pass6-android/` (screenshots, six contact sheets, logcat). The local project has no sockets server (the socket chip is red), has `allow_save_changes_offline` off, and requires no photo and no location check for a status.

*iOS (iPhone 17 simulator), item by item.*

| Item | Seen | Verdict |
|---|---|---|
| Lists after the stale-handler fix | An accept from the sheet over the order's details updated the row ("Accepted by driver", then "#1"). The four steps made **on the order's details** (arrived to business, pickup complete, arrived to customer, delivery complete, each a hold) left the list stale for 3 s and for 8 s, and the row opened the old stage with "Arrived to business" offered again; a reject from the reason form left the row in its group. Pull to refresh brought the current state; search by order number gave that order with the "Filters applied" banner and "Clear filters" restored the list | **Defect found** (below), fixed and confirmed afterwards |
| A step cannot be sent twice | Two simultaneous taps on the accept sheet's Accept: one `PUT orders/3457` (and one message post). Two holds of 0.8 s on "Pickup complete": one PUT, the three bar buttons grey while it ran. Two taps on the group sheet's "Accept 2 orders" and two on the group confirmation: one PUT per order. Single holds of the other steps: one PUT each | ok |
| Dialogs | The group confirmation (names the count and the group): a double tap gave one PUT per order and closed once. The discard confirmation of the Information form: a double tap on "Discard" went back once, one screen only. The one-button notice "You have been removed from the order": two simultaneous taps dismissed it once | ok. **Not reached:** a dialog whose screen is left behind goes away (a dialog takes every touch; there was no way to leave the screen under it) |
| Hold | A short tap on "Arrived to business": the "Hold to confirm" toast and no request, again after 6 s (a new toast still shows); 0.7 to 0.9 s: one request; 0.3 s: none; a swipe that starts on the button: no request and no scroll. On an offered order, Reject is not held (it opens the reason form, the form's own step, as decided) | ok. **Not reached:** two fingers (the simulator's automation cannot do multi-touch); the hold on a request's Reject (no assign request available) |
| Group actions | A group of two orders: the title and "2 Orders", it folds and unfolds, "For the 2 orders of the group / Reject all / Accept all"; "Accept all" opens a sheet over the list ("Accept 2 orders", "Group No. … · Orders No. …", no photo block, Accept off until the position and time are set) and the group moved to In Progress; the group step "Arrived to business" asks a confirmation naming the count and the group, then both orders went to status 3; the group's "Pickup failed" opens a full-page reason form titled for 2 orders | ok. **Not reached:** a group status that requires a photo or the location (the local project requires none: the step with a location check took the confirmation path, so "it asks for the location" is not shown) |
| Reason rows, delivery-time sheet | The reject, group and single "Pickup failed" and "Delivery Failed" forms: listed rows 44 high with a hairline and a drawn radio ring, centered on the text, a selected row with a filled ring and bold text; the submit off until a reason and a comment are given, and lifted above the keyboard. The accept sheet with the delivery time, single and group, has no photo block | ok |
| New-order alert | An order was offered to the driver in the database with the app in the foreground: no alert after 15 s and after a refresh | **Not reached** (no sockets server locally) |
| Offline queue | The simulator has no offline switch and the Mac's network was not cut | **Not reached** |
| Headers | 46 of 46 requests of the app in the last 15 minutes carried the detailed User-Agent and an id of the shape of a UUID v4, one distinct value; the store logos load on every list row and the stop cards | ok. A request to another host was not captured |

*The defect, and its fix.* **The orders list, and the details opened from it, stayed stale after a change made on the order's details**: only the list's own handler reloaded the list, and the other path to a reload was the socket, which is not connected locally and drops in the field. Opening a stale row also showed the stale stage, because the details screen shows the row's snapshot and does not load the order. It is an old gap, not a regression of the fixes above. **Fix** (not asked of the owner: the coordinator's call, in [decisions.md](decisions.md); files `useAnnounceOrderChange.ts`, `OrdersOption/index.tsx`, `OrderDetails/Delivery.tsx`, `OrderDetailsLogistic/index.tsx`): a screen that changes an order outside the list announces it once, with the app's event `driver_order_changed`, when the API answered and the change took, and the list loads again through its reload queue; nothing is announced for a failed or an offline-queued change, and the changes sent through the list's own handler announce nothing (they reload it themselves). An answer to an assign request reloads the requests, and an accepted one the orders too. Tests: 28 new (the hook 2, `OrdersOption` 10, `Delivery` 12, `OrderDetailsLogistic` 4: the event reloads once also under a search, several coalesce into one load, one during a change of the list's own waits, nothing loads offline, each of the four steps emits once and not while the request is in flight, not for a failed, thrown or queued change, the accept sheet emits once, an answer after the screen is gone); the targeted run (`OrdersOption`, `OrderDetails`, `OrderDetailsLogistic`, `AcceptOrRejectOrder`, `PreviousOrders`, hooks) was 47 suites and 1 258 tests, green; `tsc --noEmit` clean, `theme:guard` ok. **Confirmed on the iOS simulator:** after each of the four steps on the details the row already showed the new state when going back ("Driver in business", "Pick up completed by driver", "Driver arrived to customer", then the row left In Progress for Completed), each step one `PUT` followed at once by one list `GET`, and a reopened row showed the current stage with the right buttons; "Pickup failed" through the reason form (the row left In Progress, one PUT and one list GET, the usual "removed from the order" notice); a group "Accept all" from the list itself (2 PUTs and exactly 1 list GET, still 1 three seconds later); pull to refresh one GET; search and "Clear filters". **Confirmed on Android** (below): accept, three steps and the reject form, one PUT then one list GET per step. **Not seen on a device:** the assign request's details path and the delivery-time save's own announcement (tests only: no assign request was available). **Left:** the list's own save of a request's delivery time does not reload the list (older); a row tapped while a reload is still running can open a slightly old snapshot, because the details screen does not load the order (the submodule's controller); a plain Reject is not offered on an accepted order in this app, so the form was reached through "Pickup failed".

*Android (emulator-5554).* **The install.** The all-ABI Debug APK (221 MB) hung the emulator's `system_server` on install, as in the native round (`install --no-streaming` ended with a broken pipe, `pm install -r` was still running after 330 s). An arm64-only build (`-PreactNativeArchitectures=arm64-v8a`, 83 MB, only `lib/arm64-v8a`, built in 44 s) did not install either while the emulator was looping: `system_server` was being killed about every 3 to 6 minutes (ten restarts), the user never reached the unlocked state and no screen of the app was seen (the first attempt, the evening of 2026-11-19; host load 30 to 60, one frame of 24 s). After a cold restart of the emulator, which the owner authorized, the arm64 APK installed, the app launched at 07:35 with its session, no crash and no `setApiRoot` error. At about 08:03 the emulator fell into a `system_server` restart loop again (about eight restarts at 1.5 to 5 minutes, host load between 5 and 98 from other sessions' emulators; the watchdog showed the main thread blocked for about 70 s in the GNSS HAL's initialisation at boot), and that **ended the Android pass early**.

| Item | Seen | Verdict |
|---|---|---|
| Headers | 54 requests in the first 16 minutes carried the detailed User-Agent (`ODelivery/1.0 (co.ordering.delivery; build:1; Android 17; Google sdk_gphone64_arm64) okhttp/4.9.2`) and a constant id of 16 hexadecimal characters (the system's id, as the code says; the iOS one is a UUID), from the first request after launch (a theme GET), and on the position and event posts; the store logos load | ok. A request to another host was not observed (the app made none to capture): that rests on `HeadersInterceptorTest` |
| Session answers; tracking | The log shows `start requested (reason=login)` and one `tracking started`; the session left by the cold restart was closed by the recorder (one `tracking_stopped` by the system and one `tracking_started`, as a kill should give), no other pair; the first position was accepted with HTTP 200 | ok for the tracking. **Not reached:** the 401 guard, the single worker and the reasons on a device (they need a sign-out) |
| Lists after the fix | Order 3460 accepted on its details, then three held steps (the location set with `emu geo fix`), going back after each: the row showed "Accepted by driver", "Driver in business", "Pick up completed by driver", "Driver arrived to customer" with no manual refresh; one PUT then one list GET each; the row opened the current stage, never a previous step; after the reject form (order 3458) the row left its tab; pull to refresh, the refresh button and search each made their one request, "Clear filters" restored the list | ok (there is no accept or reject on a single order's row, only on the details) |
| One submit; dialogs | A double tap on the accept sheet's Accept: one `PUT`; on the reject form's Reject: one `PUT`; on the notice's single "Ok": one dismissal | ok. **Not reached:** the confirmation dialog and a second hold right after a completed hold |
| Hold | A press of 120 ms: the "Hold to confirm" toast and no request; 700 ms: one request | ok. **Not reached:** two fingers |
| Group actions | Two orders joined as a group, pending: "For the 2 orders of the group / Reject all / Accept all"; "Accept all" tapped, then the emulator froze before the sheet could be captured | **Not reached:** the group sheet, its title and the photo or location asks |
| Offline queue | `allow_save_changes_offline` is off in this project (and a config may not be changed in a pass): with Wi-Fi and data off the order's Accept and Reject were painted off, a tap did nothing and sent nothing, and after the network came back no request went out for the order | **Not reached:** the queue's fixes (one change per order, no photo) rest on Jest |
| New-order alert | | **Not reached** (no sockets server) |
| Reason rows, accept sheet | Five listed reason rows with a drawn ring, a thin divider under each but the last, "Comments" below; the selected reason fills the ring in the brand color; the accept sheet's delivery position and time, no photo block, lifted above the keyboard | ok |

*What was not seen at all, and why.* On Android: the group accept sheet, the confirmation dialog, two fingers on a held button, the offline queue (the project's config is off), the new-order alert, the 401 guard, the single worker and the reasons on a device; on both platforms: the new-order alert (no sockets server locally), a request to a third-party host without the id (it rests on the unit tests on both platforms: no such request was captured), a group status that requires a photo or the location (the local project requires none), and the assign request's details path of the list fix (tests only). On iOS also: two fingers and a dialog whose screen is left behind.

*Noted, not changed (not confirmed defects).* No success toast follows an accept or a step on the sheet path: the screen changing is the only feedback (the controller's `handleChangeOrderStatus` does not toast; the accept toast belongs to another handler). The group's title on the list reads "Group No.57" with no space where the sheet and the form read "Group No. 57". With the offline queue off and no network, Accept and Reject are painted off with no message. After "Pick up completed by driver" the status badge and "Delivery #1" wrap to two lines on a narrow row and the clock shifts down. A zero-length `adb input tap` shows no hold hint where a 100 to 120 ms press does: probably the tool, not the app. The reject submit stays off until the Comments field has text, even after a reason is chosen (the decided rule). An order at status 4 whose `last_driver_assigned_at` is older than its `status: 9` entry reads as "to customer" and not as an offer, because the details derive the stage from `reporting_data` (local data, set fresh for the pass). The API moved two test orders to status 18 by itself while the simulator sat at the store (local data, restored). Accepting an order at delivery position 1 makes the API push the other orders' positions down (not the app). The test orders the passes changed were restored to their recorded values (the first iOS pass could not restore the orders' `updated_at` nor the messages the API posted on accept; the list-fix pass restored `updated_at` too); no project config was changed; the simulator's and the emulator's position were left at the store.

*The two RootNavigator suites.* The 14 failures of the native round (`RootNavigator.push` and `RootNavigator.launchLimit`) were the tests': four test files (`RootNavigator.push`, `.launchLimit`, `.banner`, `.trackingEvents`) mocked `NavigationRef` with only `navigate`, so `navigationRef` and `focusedRouteKeys` were undefined inside `ConfirmDialogHost`; the mock now keeps the real module's exports and replaces only `navigate`, and `jest src/navigators src/ui/src/components/shared` gave 58 suites and 615 tests, green. Noted, not changed: `ConfirmDialogHost` reads `navigationRef.current` once, in its mount effect, and attaches no listener if it is still null; the host sits inside the `NavigationContainer`, whose ref is set before the child's passive effect, so it should hold, but it was not shown on a device.
Checks at the end of the sixth round, run by the coordinator on 2026-11-20 on the whole tree before its commit, with the machine quiet: tsc clean; eslint 0 errors (143 warnings); Jest 204 suites and 3 292 tests green; theme:validate, verify, keys, guard (0 literals) and extremes; i18n:verify and i18n:check-generated; the Kotlin core 290 tests, the Android app's JVM tests 30, the Swift package 325, all green. An earlier whole-suite run under load (host load ~38) failed two tests on `waitFor`'s one-second limit (LoginForm, OrdersOption); both pass alone and in the quiet run.

### Seventh round (2026-11-20): the Android pass, the offline queue, the retention

The sixth round's Android pass ended early when the emulator fell into a restart loop. On 2026-11-20, after cold restarts of the
emulator (the owner's permission, in [decisions.md](decisions.md), three times that day, always for the `system_server` loop), the
pass went on in three runs against the local API (the same driver and a few test orders joined in one cart group), and after each
run another agent fixed what it found: the first run found three offline defects (D1 to D3), the second found two display
defects (D4, D5) and a lost delivery position, the third found that a change the API refuses was not told to the driver. The
decisions behind the work are the rows of 2026-11-20 in [decisions.md](decisions.md); the coordinator's calls are in the row "Calls
made in the seventh round". The agents' reports are the source of what follows; where the repository could confirm or correct a
fact, the code was read (the corrections are said where they matter). **Evidence is in session scratch, not in the repository:**
`scratchpad/pass6-android/` (screenshots numbered 65 to 146, contact sheets `sheet-07.png` to `sheet-15.png`, the API log lines).
For the passes, the project config `allow_save_changes_offline` (id 354 locally) was set to `'1'` and put back to `'0'` (checked by
a select); no other config was touched; the test orders were moved through their statuses and restored to their recorded values
(checked by a select). The emulator stayed stable through all three runs. The agents of the passes ran no automated tests.

*Android (emulator-5554), the pass of the offline queue, the group sheet, the dialog and the holds, item by item.* ("Seen" is what
the agent saw; every PUT and GET is from the API's access log.)

| Item | Seen | Verdict |
|---|---|---|
| Offline queue (config on) | One order accepted online, then Wi-Fi and data cut (`svc`) and a second accepted from its details with the sheet's position set: the sheet opened and the accept was queued with **no PUT sent**; the details showed the "Pending sync changes" notice and the badge "Accepted by driver" at once; the list showed the red banner "Last Update: … / 1 changes pending sync". On reconnect the banner went and, about 25 s later, one `PUT` (200); nothing was sent twice, and none for the order accepted online | Two defects found (D1, D2), below |
| Group accept sheet | The Pending tab showed the group ("Group No.57 · 2 Orders", no space in the title then) with "Reject all" and "Accept all"; "Accept all" opened the sheet "Accept 2 orders", with "Group No. 57 · Orders No. …", the delivery-position question for "these orders" and the delivery time, **no photo block**, above the keyboard. After Accept: one PUT per order, then the Pending list loaded again and came back empty; the group was in In Progress after one tab switch | ok |
| Confirmation dialog | The group's "Arrived to business" opened "This changes the 2 orders of group No. 57 at once. Continue?" with the confirm button first and Cancel under it. A double tap on the confirm button: one PUT per order (200) and one list GET | ok |
| Two fingers on a held button | Not injectable with `adb shell` (`sendevent` is denied on the input devices); done through the emulator console (`adb emu event send`, multitouch events). Finger A down on "Arrived to business", B down 0.15 s later and lifted at 0.3 s, A lifted at about 1.0 s: **exactly one PUT**, a list GET after it. A and B both lifted before 0.6 s: no PUT, nothing fired | ok (emulated fingers; a real finger is not seen) |
| A second hold right after a completed hold | On a step of the order's bar, a 700 ms hold on "Pickup complete" followed at once by a second 700 ms hold on the same spot: one PUT | ok |

*What the first run found.* **D1: the list did not refresh after the offline sync** (the PUT went, no list GET followed, the row read
"Ready for pickup" for over 90 s while the server had status 8; a pull to refresh fixed it). **D2: the offline list showed only
skeleton cards** after the queued accept, so no row could be opened and a step on an accepted order was not reachable offline.
**D3: a group's step through the confirmation was not queued offline**: the request went out anyway (one PUT per order, refused
with 400 because the emulator's position had not moved) and nothing was queued, where the accept sheet does queue. (THEMING.md said
"a group is queued as one change per order", which held for the sheets and the reason forms and not for this path; the text now
names the path.) Also seen: with the queue off, Accept and Reject painted off with no message, as before.

*The check of the first fixes (second run).*

| Item | Seen | Verdict |
|---|---|---|
| Offline accept | After relaunch, the order opened online and the network cut: accepted from its details; the list had **no skeletons**, the rows were there, "Last Update … / 1 changes pending sync", the accepted row had the cloud mark and "Accepted by driver"; that row and an untouched one both opened offline. The API log had no PUT and **no `GET orders`** offline (only the details screen's own `orders/{id}/messages` and `business/{id}`) | ok (D2 fixed) |
| Group step offline | A group of two accepted orders (one accepted offline just before): "Arrived to business" opened the confirmation, a double tap on its confirm button **sent nothing**, the banner read "2 changes pending sync", the stored queue held one set of changes per order | Queueing ok (D3 fixed); **display not ok** (D4) |
| Reconnect | After the sync: exactly 2 PUTs (one per order) and then **exactly 1 list GET**; the rows moved to "Driver in business" with no pull; the banner went; both orders ended at status 3 | ok (D1 fixed); the marks stayed (D5) |
| Queue off, offline | With config 354 at `'0'`, the network off, a tap on the painted-off Accept, Reject, and a step (a 700 ms hold on "Arrived to business") showed the blue toast "No connection. Try again when the network is back."; three quick taps gave one toast, gone about 2 s later; the buttons stayed painted off and no request went out; with the network on, a 700 ms hold gave one PUT | ok. Caveat: the toast appeared 0.5 to 0.8 s after the tap; in one run two screenshots (0.4 s and 1.9 s after the first Accept tap) showed none and could not be reproduced |
| Group title | The list title reads "Group No. 57" | ok |

*What that run found.* **D4: an offline group step was not shown on the rows** (both read "Accepted by driver", one had no mark, the
group still offered "Arrived to business"; the stored queue was right). **D5: the sync marks stayed after the sync** (the banner
went, the cloud stayed on both rows, one of them appeared only then; a pull removed them). A small one: after an offline accept with
the position increased, the details showed no "Delivery #" badge and the server's `delivery_position` stayed null; the sheet's
number was not checked in that run.

*The check of those fixes (third run).*

| Item | Seen | Verdict |
|---|---|---|
| Accept offline with a position | Online details, network cut, accepted with the position increased twice: the sheet showed **2**; the details read "Accepted by driver", **"Delivery #2"** and the notice; the list read "1 changes pending sync" and the row had the cloud mark, "Accepted by driver" and the #2 badge | ok |
| Group step offline | The confirm, double-tapped, sent nothing; **at once both rows read "Driver in business" with the cloud mark and #1 and #2**; the group offered only "Pickup failed" and "Pickup complete" with "Order not ready" under them, "Arrived to business" gone; the banner "2 changes pending sync"; switching to Pending and back changed nothing | ok (D4 fixed) |
| Sync | After a position nudge of about 30 m and the network back: the PUTs went about 3 s after, two (one per order), both 200, then **exactly one list GET**; the banner went; with the group open neither row had a mark and the details no "Pending sync changes", with no pull; both orders at status 3 and the accepted one's `delivery_position` **2**, the number chosen (null before) | ok (D5 and the position fixed). The PUT's body is not in the access log; the position on the server shows it travelled even though a step was queued after the accept |
| A change the API refuses | A held "Pickup complete" for the group, queued offline, synced with 200 after 5 minutes of staleness (that step did not trigger the location check locally). Then both orders were reset to status 8 and "Arrived to business" queued for the group with the last position about 8 minutes old: on reconnect the API refused both with 400, one each. **The rows kept the cloud and the optimistic "Driver in business"; the server stayed at 8; no toast and no message was seen** (screenshots 6, 9 and 18 s later), and the banner was gone while the marks stayed. The changes were **not retried by themselves**: each reconnect sent them again and they were refused again (400 at four later times). After a position move of more than 25 m, the next reconnect sent both (200), one list GET, every mark went | **Defect: a refusal was not told** (fixed in the third fix pass, not seen on a device) |

*What the 25 s was.* The wait between the network coming back and the first PUT is the system's, not a timer of the app. In the
second run the network was re-enabled and the cellular network connected after about 6 s and validated after about 9 s (the
location module logged it); the Wi-Fi connected after about 14 s and became validated **and the default network** after about 20 s;
the first PUT went about 1 s after that switch, 21 s after the re-enable. The app did not act on the cellular validation: the sync
keys on `useNetInfo().isConnected` only, which on Android follows the system's default network (`registerDefaultNetworkCallback`,
read in `@react-native-community/netinfo` 11.5.2), so up to about 12 s of it is the app waiting for the Wi-Fi to become the default
and the rest is the emulator's Wi-Fi taking about 20 s to validate. In the third run the PUTs went about 3 s after the re-enable. A
sync started from a validated network that is not the default was **not built**, with its reason (requests go through the default
network, so a PUT started earlier could fail): a call of the coordinator, in [decisions.md](decisions.md).

*The defects, their fixes and where each was confirmed.* The fix agents' own causes are given as they stated them; two were inferred
and not observed.

| Defect | Fix | Confirmed |
|---|---|---|
| **D1** no list load after the sync | `OfflineActionsProvider` emits `offline_order_updated` once per run, after every request of the run answered; `OrdersOption` listens and loads its orders once through the reload queue (waits for the connection if the screen still thinks it is offline); nothing is emitted when every change failed; the offline copies of the lists are discarded when the connection returns | Second and third run: after the PUTs, exactly one list GET, the rows moved with no pull |
| **D2** skeletons offline | No reload path runs offline (`reloadOrders`, `reloadRequests`, the next page, the pull to refresh; checked when asked and when the queued load starts); the controller's `loading` flags are ignored offline; the stored orders are applied in a `try/finally` that ends the loading and the error of each tab, and again when a load leaves a tab loading or in error. **The cause was inferred, not observed**: the accept sheet emits `delivery_position_updated` after queuing and that went straight to the controller's load, which can hang on a dead network. The controller's own load of the requests on a tab selection cannot be guarded without editing the submodule: the display rule covers it | Second run: no skeletons, rows open offline, no `GET orders` offline |
| **D3** group confirmation not queued | `PreviousOrders.runGroupedStatusChange` calls `queueStatusOffline` (`AcceptOrRejectOrder/offlineChange.ts`) when offline with the queue allowed: one change per order in one write, each order registered as it will be, nothing sent; the accept sheet builds its changes with the same `offlineStatusChanges` | Second run: nothing sent, the queue held the changes of each order |
| **D4** an offline group step not on the rows | The offline list is the stored lists with the queue applied on top (`applyQueuedChanges`): the last queued stage and position, the mark, the list of the new status, found by id wherever it is stored (a group as the list draws it included); `registerOffOrder` rewritten (out of every stored list, serialised); the group's buttons come from the shown status. **The mechanism was inferred**: the agent did not find the one line that kept the rows stale and removed the dependence on two weak points (an order stored inside a group was not found by its id, and the calls were not serialised) | Third run: both rows at once with the mark and the position, the group's buttons moved on |
| **D5** the marks stayed after the sync | One source, the queue: `isOrderQueued`; `OrderItem` and the details' notice mark an order while the queue holds a change for it; the listener and the `ordersOffUpdated` state of `OrderItem` are gone | Third run: no mark and no notice after the sync, with no pull |
| The delivery position lost offline | The offline copy (`dataToSave`) carries `delivery_position`, and `bodyToSync` sends the last change's body with the latest position of the earlier ones (a step queued after the accept would otherwise have sent the position only as chat text) | Third run: "Delivery #2" on the details and the row; the server's `delivery_position` 2 after the sync |
| A refused change not told, and no retry | The queue retries by itself (15 s, 30 s, 1 min, then every 2 min; on the connection coming back; on the app returning to the foreground), tells a refusal with an error toast, drops a change at the third refusal with its own toast, and the banner follows the queue (the count alone online); a run's results are written on what the storage holds now; the earlier changes are posted as a chat message once | **Jest only: not seen on a device** (the last fix pass came after the last device run) |
| "No connection" hint, queue off | `OButton`'s `onDisabledPress`, `FloatingButton`'s, `useNoConnectionHint`; a bug the fix agent's first test run found: Pressable's own `disabled` overrides `accessibilityState.disabled` even when `false`, so a button off but still answering would have read as enabled to a screen reader; `disabled` is left unset when the button must answer | Second run, on Android: one toast per tap, none stacked, buttons stayed off. TalkBack not seen |

*How the fixes are tested (the fix agents' own runs, from their reports).* New files: `OrdersOptionOffline.test.tsx` (22 tests for
D1 and D2 at first, 4 more for D4, 5 more later for the banner and the stage kept online), `PreviousOrdersOffline.test.tsx` (D3, with
the six confirmations, a queue that fails and one that throws, and 4 for D5), `AcceptOrRejectGroupOffline.test.tsx` (the four reason
forms offline), `useNoConnectionHint.test.tsx` and `OfflineActionsRetry.test.tsx` (fake timers: the schedule, its stops, outcomes,
the toasts, the drop at the third refusal, the attempt count surviving a restart, the 401, the chat message once); extended:
`OButton`, `Delivery`, `Delivery.focus`, `AcceptOrRejectSheet`, `OfflineActionsProvider`, `offlineActionsQueue`. The controller is
mocked in these tests (a stateful harness stands in for it). The whole-suite counts the agents gave: after the first fix pass 208
suites and 3 349 tests; after the second 208 and 3 377; after the third 209 and 3 419; `tsc --noEmit` clean, eslint 0 errors,
`theme:guard` 0 literals, `i18n:verify` and `i18n:check-generated` passing. The first fix agent's first run had 6 failures (4 on the
real `disabled` bug above, 2 on a 1 s `waitFor` limit under load that pass alone and now carry `timeout: 5000`).

*What the retries and the refusals do, as built (read from the code, **not run on a device**).* A run replays the queue order by
order. A transient answer (no answer, a network error, a 5xx, a 408, a 429) leaves the change queued, says nothing and is not
counted; a 4xx with the API's error is a refusal (an error toast with the API's reason, `attempts` + 1 kept on the order's last
queued change, so a restart does not start again); the third refusal drops the change (its own toast, and the list loads once and
shows the server's stage); a 401 is left alone (stays, no toast, not counted, not retried by the timer). Several orders in one run
give one toast (the first one's text and "and N more"); a run that drops anything tells only the dropped ones. A retry is
scheduled only when the queue is not empty, there is a token and a connection and the run had a transient or a refused change; it
stops on an empty queue, the connection going, sign-out and unmount. The timer is JavaScript's and Android may throttle it in the
background; returning to the foreground runs the queue at once. `getOfflineActionsAfterReplay` is no longer used by the provider
(left, with its tests).

*The catalog.* Three keys were added in the 11 locales: `NO_CONNECTION_TRY_LATER`, `OFFLINE_CHANGE_NOT_SYNCED` ("The change to
order No. _order_ could not be sent: _message_") and `OFFLINE_CHANGE_DISCARDED` ("The change to order No. _order_ was not applied:
_message_"), with the catalog's underscore placeholders. **19 texts of `DISABLED_*` that read "disabled person" were corrected** (the
English untouched): `DISABLED_BUSINESS` in es "Negocio desactivado", fr "Entreprise désactivée", da "Deaktiveret forretning", nl
"Uitgeschakeld bedrijf" (the app agent) and, by the catalog agent, de "Behindertes Geschäft" → "Deaktiviertes Geschäft", pt "Empresa
com deficiência" → "Empresa desativada", ar "الأعمال المعوقة" → "نشاط تجاري معطّل", el "Επιχείρηση με ειδικές ανάγκες" →
"Απενεργοποιημένη επιχείρηση", bg "Бизнес с увреждания" → "Деактивиран бизнес", tr "Engelli işletmesi" → "İşletme devre dışı";
`DISABLED_CATEGORY` it "Categoria disabili" → "Categoria disabilitata" (a judgment between "disabilitata" and "disattivata": the
nearest siblings were followed), de "Kategorie Behinderte" → "Deaktivierte Kategorie", ar "فئة المعوقين" → "فئة معطّلة", el → "Απενεργοποιημένη
κατηγορία", bg → "Деактивирана категория", tr "Engelli kategorisi" → "Kategori devre dışı"; `DISABLED_PRODUCT` el → "Απενεργοποιημένο
προϊόν", bg → "Деактивиран продукт", tr "Engelli ürün" → "Ürün devre dışı". Four `NUMBER_CHANGES_PENDING_SYNC` texts (fr "change"
in the singular, it "cambia", de "ändert sich bis zur Synchronisierung", tr "değiştirir") were wrong and were corrected by an agent
without being asked, because the banner now shows online too (the coordinator kept them). `i18n:generate`, `i18n:verify` and
`i18n:check-generated` pass. **No native speaker has read any of it.** Seen and not changed: pt `ENABLED_BUSINESS` ("Negócios
habilitados", a plural) and ar `ENABLED_BUSINESS` ("تمكين الأعمال", reads as a verb); the catalog agent found no other disabled-person
wording in any value. `INVOICE_GROUP_NO` is no longer read by the app (the group's line uses `GROUP_NRO`), and stays in the catalog.

*The API: a retention for `tracking_events`* (api-core, draft pull request Finitless-com/api-core#3882, now **three commits**: `35067e141`,
`c8aa810ce` and `dee85dd45`, pushed; `docs/DRIVER_TRACKING_EVENTS.md`, section "Retention"). `ordering:prune-tracking-events` walks the
projects (not deleted, database present) and deletes, in keyset batches of 5 000 (each its own transaction with a 3 s lock timeout and
a 30 s statement timeout, 50 ms apart, a budget of 120 s per project and the rest left for the next day), the rows of the **twelve
event names of the driver app's contract** older than 90 days by `occurred_at`. It is an allow-list: the storefronts' `click` events,
which `GET reports/tracking_events` counts, any other name, `driver_tracking_states` and the users are never touched (a test fails if
the accepted names are not exactly the pruned names plus `click`). Options `--days` (7 to 36 500), `--batch`, `--budget`, `--project`,
`--dry-run`; a bad value is refused (exit 2). A partial index `tracking_events_driver_events_occurred_at_index` on `(occurred_at, id)
WHERE event IN (the twelve)` serves the select (a new migration, `CREATE INDEX CONCURRENTLY`, no transaction), so old clicks do not
slow a batch. A project that has not run the earlier tracking migration is pruned by `created_at` with a `ctid` delete and no index.
The schedule is daily at 09:30 UTC (`withoutOverlapping(360)`, `onOneServer()`) and **off by default**: it runs only while
`TRACKING_EVENTS_PRUNE_ENABLED` is true; a run by hand ignores the switch. Deploy order: the code, `ordering:db migrate` (it builds the
index), one `--dry-run` by hand, then the variable. **Tests, as the agents report them:** unit 24 tests (87 assertions) and integration
81 tests (1 258 assertions) of the driver tracking events, run through `run-wt-safe.sh` (Slack off, no webhook variable, the network
internal); they cover the cutoff (the exact cutoff row stays), the batches and their keyset, `--dry-run`, the bounds, the state table
untouched, the unmigrated shape (also keeping old clicks), a failing project logged once while the run goes on, the budget, a project
with no table, the schedule line and switch, the migration with an INVALID leftover, and the plans (4 000 old clicks and 40 old driver
events: an index scan on the partial index, no rows removed by a filter, no sort, the delete on `tracking_events_id_unique`). The
first version of the command had 80 integration tests and also deleted the old `click` events; the owner's decision replaced it.
That run needed a second integration run (7 of the new tests failed on how the log lines were captured; the command's `log()` went
from private to protected), against the rule of one run, which was given the same day. `php -l` is clean on every file; the smoke
check `POST …/tracking_events` answered 401. **Not verified:** behaviour and speed on a large real table (everything ran on tiny
fixture tables; the plan test runs on 4 040 rows with sequential scans priced out); the migration on a project with millions of rows
and on the local `development` database (not run: it still lacks the index); the scheduler firing on a real server; the plan text
itself (the test accepts an index scan or an index-only scan and it was not printed); `pnpm run docs:check` and the OpenAPI
frozen-count tests (no route or rule changed, not run); production's PostgreSQL 14. A dry run on the local `development` database
(with the first version) counted 4 rows and deleted none.

*What was not seen, and why.* **iOS, for every offline item**: the simulator cannot cut its network and the Mac's was not cut, so
the offline queue, its list, its banner and the "no connection" toast were seen on Android only. **A real phone** for any of it. **The
assign request's path** (its details, its delivery-time save) offline and with the new reload. **A refusal other than "Driver
location is outdated" (the API's 400 when the last position is older than 5 minutes or has not moved)**, and a refusal read from the
API's own message at the third try. **A 5xx or a timeout** against the retry schedule. **The retries, the refusal toasts, the
drop at the third refusal and the banner following the queue: no device run at all** (Jest only; see the line that ends this block).
**The chat message of the earlier changes told once** (Jest only). **TalkBack reading the off button** as disabled. The PUT's body
(the access log has none): only the server's `delivery_position` shows it. A search applied offline still makes the controller load
(the display rule hides the skeleton, the button stays available); a tab never visited offline keeps its snapshot from before until it
is opened; Android may throttle the retry timer in the background; the sync is not started from a validated network that is not the
default (decided, above). Two fixes rest on a cause **inferred, not observed**: D2's trigger and D4's mechanism. The controller is
mocked in the tests that cover D1 to D5. Two fingers on one button were seen on Android only with the console's emulated touches.
A zero-length `adb shell input tap` still shows no hold hint where a 100 ms press does (the tool, probably).

*Closed or changed by this round:* the sixth round's notes "no success toast on the sheet path" (decided: none), "Group No.57" (fixed),
"silent off buttons offline" (the hint) and "the alert's uneven rhythm" (kept, decided); and its Android items "the group accept
sheet", "the confirmation dialog", "a second hold right after a completed hold", "two fingers" and "the offline queue" (seen on Android, above); and its known limit that
`syncChanges` rewrote the queue from its own snapshot (replaced by `applyRunResults`). The sixth round's "wrapped badges" and the
reject submit needing a comment are unchanged.

Device check of the retries (Android emulator, 2026-11-20, the queue on, times from the API's log): a group's "Arrived to business" queued offline and refused by the API (400, the position older than 5 minutes) was tried at 17:07:29, 17:07:45 (+16 s) and 17:08:15 (+30 s), two PUTs each; the first try's toast read "The change to order No. 3458 could not be sent: Driver location is outdated. … and 1 more", the marks and the queued stage stayed and the banner showed "2 changes pending sync" alone; the second try's toast was not captured. After the third refusal: no more PUTs (watched for 75 s), one list GET, the banner and marks gone, the rows back at "Accepted by driver" with "Arrived to business" offered again, and the toast "The change to order No. 3458 was not applied: … and 1 more" (it names one order and counts the other). A retry that passes: a first try refused for distance (400), the position moved, the retry 15 s later answered 200 for both, then exactly one list GET, marks and banner cleared, no PUT repeated after its 200. Foreground: with a refused change waiting, Home and back sent a try 1 s after the return, 6 s after the previous one. Network cut during a wait: no PUT for 40 s although two timers had passed; a try 1 s after the network came back. The drop counts any 4xx, whatever its message (one run mixed "location is outdated" and "must be within 100 meters"). Not seen: a 5xx or a timeout, the 2-minute step of the schedule, the chat message of an earlier change told once, iOS.
Checks at the end of the seventh round, run once by the coordinator on 2026-11-20 on the whole tree before its commit: tsc clean; eslint 0 errors (142 warnings); Jest 209 suites and 3 419 tests green (a first whole run had one test of `PreviousOrders.test.tsx` exceed the 5 s limit; the file passed alone three times and the second whole run was green); theme:validate, verify, keys, guard (0 literals) and extremes; i18n:verify and i18n:check-generated. The Kotlin core, the Android app's JVM tests and the Swift package were not run again: no native file changed in this round. api-core: the feature's files, run by its agent in the isolated stack, 81 integration and 24 unit tests green.

### Eighth round (2026-11-20, later): the order card and the require cycles

Two pieces of work after the seventh round. The owner reported Metro's "Require cycle" warning, and every cycle was removed
(committed and pushed as `5e43441`). The owner's decision of the day, the order card redrawn as the business app's "D1b" adapted
to the driver ([decisions.md](decisions.md), rows of 2026-11-20), was built; **its first build was seen on both devices by two
passes, which found defects, and the defects were fixed in code and tested with Jest only: no device has seen the fixes yet**
(the last two lines of this block are filled by the coordinator when the devices have). The agents' reports are the source of what
follows; where the repository could confirm or correct a fact, the code was read (the corrections are said where they matter).
**Evidence is in session scratch, not in the repository:** `scratchpad/pass8-ios/` (63 screenshots, contact sheets `sheet-01.png` to
`sheet-07.png`, `sheets.md`), `scratchpad/pass8-android/` (screenshots, `sheet-01.png` to `sheet-08.png`, `sheets.md`, `notes.md`, the
two-finger scripts `two.sh` and `one.sh`) and `scratchpad/pass7-cycles/` (the checker's output before and after, a screenshot).
Both passes ran against the local API with the same test driver; the iOS pass was on the iPhone 17 simulator (iOS 27.2), the
Android pass on the emulator (the screens were 411 dp wide), both dev builds served by Metro (slow: a tap to the reject form took 3 to 4 s on
Android). The agents of the passes ran no automated tests.

*The require cycles.* Before: `node scripts/check-cycles.mjs` found 303 modules and **31 cycles, all in one group and all through
the barrel `src/ui/index.tsx`**: 18 direct (`barrel -> X -> barrel`, through the `index.tsx` of 17 components and `OrderDetails/Delivery.tsx`) and
13 longer ones, each through a file that also imported `@ui` (`DriverMap/DestinationCard`, `LoginForm/Otp`, `OrderDetails/focus/FocusReviewBar`,
`OrderDetails/reviewCustomer`, `OrderContentComponent`, `ProductLines`, `FocusOrder` and `ProductsBlock`, `hooks/useAcceptSheet`,
`UserProfileForm/RemoveAccountModal`, `PreviousOrders/OrderList` and `OrderItem`). There was no real two-module cycle, so no leaf file and no
moved constant was needed: the 27 `@ui` imports inside `src/ui` became imports of the concrete modules, names and aliases unchanged.
After: **0 cycles**. The checker, the CI step and the ESLint rule are described in [THEMING.md](../THEMING.md) §4. The checker was
checked only against the real runs before and after, not against a purpose-built fixture. Mocking `@ui` no longer reached the modules
the components now import, so 33 tests under `src/ui` import `jest/helpers/uiModuleMocks.js` first (`pickUi` trims a fixture to what
a tree reads through the barrel); the first whole Jest run had 10 of 209 suites and 62 of 3 246 tests failing (the mock conflicts; two
`Delivery` suites ran out of heap because a fixture's `useLocation` stub made `Delivery.tsx` render without end), which were fixed and
the affected folders rerun (39 suites, 1 279 tests, 5 failed in `Delivery.test`; after the hand-off of the real `FloatingButton` when
`inline` is set and of the real `OModal` when `box` is set, `Delivery.test` alone gave 126 of 126). The agent's last checks: tsc exit 0; eslint
0 errors (142 warnings); `lint:cycles` 0; `theme:guard` ok. **The coordinator's run after the commit `5e43441`: Jest 209 suites and 3 419 tests,
tsc clean, eslint 0 errors, 0 cycles.**

*The cycles on Android (emulator-5554, one run).* After `logcat -c`, a force-stop and a relaunch of `co.ordering.delivery`: the Orders screen
with no Location Accuracy dialog, the order No. 3460 opened from In Progress and back to My orders. **No "Require cycle" line** in
`logcat -d -s ReactNativeJS:V`, for `src/` or `node_modules`; the log had 8 lines (the app's start, the driver-location notice and a
navigation-state warning about an order object with functions in its route params); no red screen. The Pending tab was empty, nothing
was changed. **Not seen:** anything on iOS; every other screen on Android (only Orders and one order's details were opened: a screen
that loads later could in principle show a warning, though no cycle is left in the static graph).

*The order card, first build: the two device passes, item by item.* Setup notes that change how to read them. In this project an offered
order (status 4) is listed under **In Progress**, not Pending (the Android agent: the Pending tab asks for statuses 0 and 13 and stayed empty
all session; the iOS agent: pending and in progress are shown together), so the offered card was checked there. The two agents posted
locations for the same driver: the first hold of each was refused by the API (400 "You must be within 100 meters …": a distance of 223 m on iOS,
3 856 m on Android, the other agent's position) until a new position was posted; that is the local setup, not the card. ("Seen" is what the
agent saw; every PUT and GET is from the API's access log.)

*iPhone 17 simulator (iOS 27.2).*

| Item | Seen | Verdict |
|---|---|---|
| The card against the drawing: In Progress (offered, accepted, at the store, on the way, at the customer) | Header (logo 44, the store's name small and muted, "#number · customer" strong, the time's figure over its word at the right); the stop line "Pick up at …" or "Deliver to … · 3.86 km" on one line; the status chip and the total on one row, the total at the right; the chips row (the "Delivery #N" pill, "Collect in cash" in the warning tint or "Paid" in the success tint, "n items" in muted text); Reject (outline) and Accept (solid) 1:2, a single button full width; "Pickup failed" and "Pickup complete", "Delivery Failed" and "Delivery complete" never cut. Nothing cut or overlapped | ok |
| Completed and Cancelled | Completed: "06:37PM" over "18/11/2026" for an old order, "01:54PM" over "today" for one just completed (the device's time zone). Cancelled (3457 set to status 12): "06:59PM" over "18/11/2026", the delivery-time fallback because `reporting_data` has no `status:12`; the red chip "Delivery Failed by driver". No stop line and no buttons on either | ok |
| No tint; the time's colors | No card was tinted (all white with a grey border). Late: red "+42 h 22 min / late" and "+8 min / late"; at risk (the Android agent's 3458 once its times changed): dark amber "37 min / left". **In time (the ordinary ink) was not seen: no order was in time** | ok, one state unseen |
| Every piece present | Total ("$ 173,80"), items ("4 items", "1 item"), the payment ("Collect in cash" for cash; "Paid" for a stripe payment event; **neither for `card_delivery`**), the stops' places (the distance appeared for pick-up and delivery and changed when the simulator moved: 3.86 km, 0.00, 0.01, 5.66 km), the times of finished orders. Nothing was missing, so the list's payload carries them (inferred from the card showing every piece; the response body was not read) | ok |
| A long status | "Driver almost arrived to business" and "Customer almost arrived to business" fit on one line beside "$ 10,00". With the total temporarily set to "$ 1.234.567,89" the chip wrapped to two lines (its text centered), the total stayed whole at the right and nothing overlapped | ok |
| Quick actions on 3457 | Reject opened "Reject order" (back kept the scroll); Accept opened the sheet and, accepted, gave one PUT 200 and one list GET; "Arrived to business": a tap fired nothing and showed the blue "Hold to confirm" toast, a hold of 0.8 s fired one PUT, a darker fill ran across the button during it, the row then read "Driver in business" with "Pickup failed" / "Pickup complete" and a new distance, and **the card stayed at the top of the list**; Pickup failed opened its form; "Pickup complete" held: the stop line became "Deliver to 11th Ave… 3.86 km"; "Arrived to customer" held: "Driver arrived to customer"; Delivery Failed opened its form; "Delivery complete" held: no PIN or photo sheet, the order left In Progress and appeared in Completed as "01:54PM / today". **Every step gave exactly one PUT and one list GET**; each row updated with no pull. A tap on the card's body opened the order | ok; defect 1 below |
| A group (57, two orders at status 8) | The group's card kept its header ("Group No. 57 · 2 Orders · date") and its own actions ("For the 2 orders of the group": Arrived to business, then Pickup failed / Pickup complete); its rows were the new card with no buttons. Undone afterwards (the group disappeared) | ok; defect 3 below |
| The delivery position | "Delivery #1" opened the "Delivery position" dialog (Order No. 3506, − 1 +, Cancel / Save); cancelled | ok |
| Large text | At extra-extra-extra-large and at accessibility-extra-extra-extra-large the two looked the same (the app caps the scaling); everything was there, the title and the stop line ended in ellipses, nothing was cut | ok |
| The assign requests' tab | Empty: no request exists for this driver | not reached |

*Android emulator (API 37).*

| Item | Seen | Verdict |
|---|---|---|
| In Progress at 411 dp (at risk, late, the stages) | Header, stop line with the distance, chip and total on one row, the wrapping chips row, all buttons present; nothing cut or overlapped; long customer names ended in an ellipsis; no card tinted. At risk "35 min / left" in dark yellow; late "+12 min / late" in red; a very late order "+42 h 45 min". "Paid" in green was seen on the iOS agent's 3506 | ok |
| Completed and Cancelled | Completed "12:40PM / today" with the green "Delivery completed by driver"; Cancelled "03:10PM / yesterday" with the red "Rejected by Driver"; the neutral "Delivery" chip, "Collect in cash", "4 items"; no stop line, no buttons | ok (the clock reads "12:40PM", the project's time format, where the drawing writes "12:53 PM") |
| Reject, Accept | Reject opened its form; the system back returned to the list with nothing sent; Accept opened the sheet and, with position 2 and time 00:00, accepted: one PUT and one list GET, the row read "Accepted by driver" and "Arrived to business" | ok |
| The held steps | A 100 ms press fired nothing and showed "Hold to confirm"; **900 ms holds fired exactly one PUT each** for Arrived to business, Pickup complete, Arrived to customer and Delivery complete, each followed by one list GET and the new stage on the row with no pull; Pickup failed and Delivery Failed opened their forms and back returned. During a change every card's buttons went grey | ok; F5 below |
| The card does not move under the finger; a tap on the card | In the frames during the holds the card stayed put (a later reordering was the iOS agent's orders coming and going, the list being sorted by delivery position). A tap on the card opened the order and back returned to the same scroll | ok |
| **Two fingers** | Finger A held on "Arrived to business" (540,1570), finger B down 0.15 s later and up within 0.3 s on the header (or at (200,1000)), A kept down about 1.0 s after B went up: **no PUT, and the order's details opened** (GETs of `loyalty_plans` and `orders/3458/messages`), twice. The control with one finger held 1.2 s fired the PUT (200). The same on the order's own bar had passed in the seventh round | **defect** |
| Scrolling | A finger down on "Pickup complete" or "Pickup failed" that dragged the list scrolled it and fired nothing (no PUT, no form), at font 1.3 so the list was long enough | ok, partly reached |
| Offline, queue on | Network cut, "Arrived to business" held: the card read "Driver in business" with Pickup failed / Pickup complete, a cloud mark after the title and the banner "1 changes pending sync"; network back: one PUT, one list GET, mark and banner gone | ok |
| Offline, queue off | On a fresh launch with the network cut the buttons were painted grey; one tap showed "No connection. Try again when the network is back." once, a second tap within 2 s on another card added no toast; network on, the buttons worked. **On an earlier launch (18:47, config '0', after switching all four tabs) the buttons stayed solid green for at least 2 minutes and a short tap showed "Hold to confirm"**; about 90 s later the whole list became "Network Error" with a "Last Update" banner and a Refresh button | ok on a fresh launch; **F8** once |
| A group (57) and the font at 1.3 | The group's card kept its header and tonal actions, its rows were the new card with no buttons and their stop lines ended in ellipses; at font 1.3 everything was visible, the names ellipsized earlier because the time column takes up to 45% | ok |

*Defects the two passes found, and what was done about each.* "Cause" is the fix agent's own; two causes were **inferred from reading the code and
React Native's responder rules, not observed**.

| Defect (seen by) | Cause | Fix (F) | How the fix is tested | On a device |
|---|---|---|---|---|
| **F1.** A second finger cancels the held step and opens the order (Android, twice) | The card was one `Pressable` with its buttons inside. On Android a second finger's touches go to the first touch's view, the button; React Native then asks the button's ancestors for the touch, the card says yes and the button gives it up: the press ends, so the hold stops, and the first finger's lift opens the order. The order's bar has no pressable above its buttons, which is why it passed there (inferred) | `OCard` takes a `footer`, drawn in the card's box outside its `Pressable`; the quick actions and an assign request's Accept / Reject are the footer; the pressable keeps the box's padding as its touch margin on top and sides. The pressed look covers the body only | `OCardFooter.test.tsx` (the structure: no pressable above the footer, the body opens and a button never does, the touch margin) and `OrderItem.test.tsx` (no pressable above any button). **Jest has no responder system: the tests prove the structure, not a second finger** | Not seen |
| **F2.** The first tap on "Pickup failed" or "Delivery Failed" did nothing, 2 of 2, 10 to 15 s after a held step (iOS) | **Not isolated.** The fix agent found that the orders screen drew the whole list as a skeleton whenever the controller marked the tab loading, and the reload after a step starts about when a held finger lifts, so the pressed button could be unmounted under the finger (the lost-touch case the hold latch exists for) and the next touch ignored. The timing is borderline: that this is what hit on iOS is **not shown** | The rows stay mounted while the list loads (F6); rows the latch still shows count as rows even when the controller's list is empty | `OrdersOptionCard.test.tsx` (the same card survives the load with the finger down; the very next tap reaches the next button; the last order of a tab that moves away stays under the finger) | Not seen |
| **F3.** The time column squeezes the title: "+42 h 51 min" took about 45% of the header, so "#3506 · Cliente…" and "#3506 · C…" at large text (iOS; Android the same at normal size) | The figure's width | `formatCardDuration`: "N min", "H h MM min" under 10 hours, "H h" under 48 hours, "N d"; the column is at most 40% (it was 45%), one line with an ellipsis. The widest figure, "+9 h 59 min", is about 100 dp at the default text size (an estimate, **not measured**) against about 116 dp of column on a 360 dp screen | `OrderItem.test.tsx`: the figure's ranges and the 40% column | Not seen |
| **F4.** The ellipsis cuts into the distance in a group's rows ("· 3…", "· 0.0…") (both) | One text carried the address and the distance | Two sibling texts: the address shrinks, the distance (`order-card-distance`, beginning with a no-break space) never does | `OrderItem.test.tsx` (the distance as a node of its own; the address shrinks and the whole distance is there) | Not seen |
| **F5.** Every card's buttons dim while one step is in flight (both) | The card took the controller's shared `loadingChangeOrder` as busy | A card is busy only with its own change (`submittingRef`, before the first `await`); a tap on another order goes through at once; the comparator no longer compares `loadingChangeOrder` for an order (still for an assign request, and a group's buttons use the shared flag) | `OrderItem.test.tsx` (the controller's flag paints no card off; only the changing card is busy; another order's tap is its own request; the busy one is never sent twice), `areListedOrderRowPropsEqual.test.ts` | Not seen |
| **F6.** The whole list blanks to the skeleton for about a second after a step (Android, once in four) | `OrdersOption` hid the list while the controller marked it loading, and the controller marks it for every reload while keeping its orders | The list stays whenever it has rows (assign requests included); the skeleton only when there is nothing to show; the empty state waits for the latch | `OrdersOptionCard.test.tsx` (no skeleton while loading, the same card through the load, the skeleton for a first load, the requests kept, the empty state), `OrderListSkeleton.test.tsx` updated | Not seen |
| **F7.** The distance is stale after the driver moves, or blinks off after a refetch (Android) | `PreviousOrders` read one position when it mounted and was remounted during loads, so it went back to none | `useListDriverPosition` (THEMING.md, "The order card"): the last real fix, kept beyond the screen, read again on each reload and on focus, no watch | `useListDriverPosition.test.tsx` (7 tests) and `OrdersOptionCard.test.tsx` (kept while the position reads none, follows the driver, read again on refresh and focus, kept when the read fails) | Not seen |
| **F8.** Offline with the queue off, once the buttons were not painted off (Android) | **Found in the code, not seen on a device, and not reproduced:** `OrdersOption` read the project's switch once, in a mount-only effect; with the config not yet loaded it fell back to a stored value nothing in the app wrote, so the result was `null`, and every consumer tests `canSaveChangesOffline !== false`, so `null` counted as on | `OfflineActionsProvider` follows the loaded config (THEMING.md, "The order card"); a value not known is off, never on; the boolean is kept in storage; the card, the order's bar and a group's buttons test `isNetConnected === false` | `OfflineActionsProvider.test.tsx` (the loaded config's value written for an app that opens offline; follows the config as it changes; a kept value stands in only until the config loads and never outlives it; off for a config that loaded without the key; not known while loading or empty) | Not seen |
| **F9.** "Delivery Failed" against "Pickup failed" (both) | The catalog's English value | `DELIVERY_FAILED` reads "Delivery failed", with every `t()` fallback, the test helper and the tests; the key `DELIVERY_FAILED_BY_DRIVER` (the status "Delivery Failed by driver") and the other locales are untouched | the strings of the tests that matched it | Not seen |

*The fixes' checks (the fix agent's own run, once, as asked).* Jest 213 suites and 3 542 tests green (the first whole run had 6 suites failing: one the
agent's own mistake, `isLogisticTab` used before its declaration, and five tests that still encoded the old behaviour, the skeleton over rows, the 45%
figure and the "Delivery Failed" helper text; one existing timing test, "keeps the gutter after tabs that share the row", flaked under the full run, passes
alone in about 1.7 s, and its `waitFor` was raised to 5 s); tsc exit 0; eslint 0 errors (140 warnings); `lint:cycles` 0; `theme:keys`, `theme:guard`,
`i18n:verify` and `i18n:check-generated` ok; `theme:validate` and `theme:verify` not run by that agent (the schema was untouched in that step). The build's own run before it:
Jest 210 suites and 3 466 tests green, tsc 0, eslint 0 errors (140 warnings), `lint:cycles` 0, and `theme:validate`, `theme:verify`, `theme:keys`,
`theme:guard`, `theme:extremes`, `i18n:verify` and `i18n:check-generated` ok (the first whole run had 3 failing suites, 5 tests: the removed
`timer_icon_size` in `designDefaults`, a comparator test that forbids `JSON.stringify`, two skeleton counts; `theme:keys` and `theme:guard` failed once each and were
fixed). `OrderItem.test.tsx` has 84 tests at the end of the fixes. `OrdersOptionOffline.test.tsx` and `OrderListSkeleton.test.tsx` had their expectations updated to the new behaviour (the report does not say which fix each follows).

*Seen and left as they are, with why.* Not defects of the card: **the details' bottom bar at "Accepted by driver" (status 8) shows "Arrived to business", "Pickup complete" and "Pickup failed"
together** (iOS, order 3506), where the card offers "Arrived to business" only; the card reads the bar's conditions, and the bar offers the pickup outcomes beside it
only when reject is allowed (`showFloatButtonsPickUp`); the iOS agent did not check it against the rules and neither did this round. **The round icon-only button before the "Delivery" chip**
(both agents saw it, on orders with no delivery position, and the drawing has none): it is the setter of the delivery position, shown while the project orders by position and the
order has none yet (the card_build report listed only that the pill stays tappable; the code was read). **The "Hold to confirm" toast** is a blue square-cornered block over the cards
(the existing toast's style). **The status chip's text is centered** when it wraps (`OBadge wrap`). **A group's rows** read smaller and tighter than a standalone card (iOS; they are nested cards). **The offline banner
"Last Update" pushes the list down about 150 px when the connection drops** (Android): a tap aimed at a button in the old layout landed on the card's body and opened the order. Not fixed in this round. API
facts met on the way: the API renumbers `delivery_position` when an order is accepted or completed (the iOS agent's steps changed the Android agent's orders), and refuses a step that checks the
location with the last position more than 100 m away ("Current distance: 223 meters") or older than 5 minutes.

*Local data changed and restored.* iOS: orders 3457 and 3506 (statuses 4, 8, 9, 11, 12, 18, 20, `cart_group_id` 57, `paymethod_id` 22 and 2, `summary.total` temporarily 1234567.89) and the
`order_payment_events` rows 794 and 843 (`paymethod_id` temporarily 2 and 22), restored to the recorded values and checked by a select (the starting values of 3506 differed from the
notes, `delivery_position` 3 and an `updated_at` from another pass; the notes' values were restored); the API's own `order_history` / `order_logs` rows for the PUTs were not removed.
Android: orders 3458 and 3460 (status, `last_driver_assigned_at`, `reporting_data`, the delivery times and `time_status` moved to today, `cart_group_id` 57), restored and checked by a select at about 19:22, the
API's automatic `delivery_position` of 3458 put back to null; the project config 354 (`allow_save_changes_offline`) was `'1'` for about 6 minutes and is `'0'` again (a select). No theme or other config was changed: the two settings were not tried (below).

*What was not seen, and why.* **The two new settings on any device** (`orders.quick_actions` off and `orders.absolute_time` on): the agents were told not to change a theme or a config. **Two fingers on a card's held button on iOS**, and on Android after the fix. **An order in time**
(the ordinary ink: every order was late or at risk). **An assign request** (none exists for this driver; its card, its footer and its Accept / Reject were seen on no device). **VoiceOver and TalkBack** on the card's buttons. **A real phone.** **A phone 360 dp wide** (the widest figure's width is an
estimate). **Another locale** (Italian, German: not part of the brief) and a right-to-left one. **Offline on iOS**, **a revoked location permission**, **a PIN or photo sheet** (config 721 is off). **The Paid chip on an order of the Android agent's own** (seen on the iOS agent's 3506). **The card at six or more rows** (Android had 3 or 4; the emulator's `gfxinfo` gave a 200 ms median frame, 100% janky, which says nothing about a device) and **how the skeleton's bones compare with the real card**.
**The clock time in a time zone other than the device's**. **The exact hex of the late and at-risk colors** (seen, not measured). **A whole run after the fixes on any device.** The build's report also lists: whether the list's payload carries `payment_events`, `products`, `summary.total`, `reporting_data` and the stops' `location` on a real project (inferred from the card showing every piece against the local API) and
`useSettledWhileHeld` with a real hold (the iOS pass saw the card stay at the top after a held step, with the list as it was then).

Device confirmation of the card's fixes and of the two settings (2026-11-20 and 2026-11-23; evidence in the session's scratch folders `pass8-ios/` and `pass8-android/`): F1 on Android, three runs with a second finger down and up during the hold (on the header, on another card's body, on another card's button): one PUT (200) and one list GET each, the status moved, the order's details did not open; a 100 ms tap on a button opened nothing, a tap on the body opened the order, a drag from a button scrolled and fired nothing, a press sliding from the body onto a button fired nothing. On iOS the single-finger cases only (the simulator has no second finger). F2: the first tap on the negative button 12 s after a held step opened its form, 2 of 2 on each platform (0 of 2 on iOS before). F6: rows stayed in every frame after each PUT, no skeleton; a step that empties a tab was not reached. F5: only the changing order's card went busy. F3: the figure read "+1 h 07 min", "+12 h", "+43 h", "+2 d", "+3 d"; with "+12 h" and longer the whole title shows, with "+1 h 07 min" the name loses its last letters. F4: in a group's rows the address ends in an ellipsis and the distance stays whole. F7: after a move of about 500 m and a pull to refresh every card's distance changed without a relaunch and none was lost during the reload. F8 on Android: queue off, the buttons were painted off about 4 s after the network was cut (not at once) and a tap showed the no-connection hint once; queue on, a held step was queued with its mark and banner and sent once. F9: the button reads "Delivery failed". The two settings, with the local project's served theme changed for the check (the owner authorized it; restored byte for byte afterwards) and seen at the first launch on both platforms: with `orders.quick_actions` off no card shows a button, a tap opens the order and the details keep their bar; with `orders.absolute_time` on the word reads "late · due 07:04PM" under "+4 d" (no order was on time, so "left · due …" was not seen) and the wider column cuts three or four more letters of the customer's name; a finished order's time is unchanged. Not seen: an assign request with the actions off (none exists locally), a group with the settings changed, two fingers on iOS, a real phone. Noted, not changed: a wider gap before the distance's "·".
Checks at the end of the eighth round, run by the coordinator on 2026-11-23 on the whole tree before its commit: tsc clean; eslint 0 errors (140 warnings); lint:cycles 0 cycles in 309 modules; theme:validate, verify, keys, guard (0 literals) and extremes; i18n:verify and i18n:check-generated; Jest 213 suites and 3 542 tests green in the second whole run (the first, with the host at load 18, had three tests run out of time, in LoginForm, OrdersOption and PreviousOrdersOffline; their three files passed alone, 206 of 206). No native file changed in this round.

### Ninth round (2026-11-23): the status-band card, the order types' colours, the tabs, the tests' time limits

Four pieces of work after the eighth round, whose docs are committed and pushed as `20d8343`. **The owner changed the card's design** after
seeing D1b on the devices ("better change the design to D3, the status band, keeping the order types' colour changes and the absolute
time"; [decisions.md](decisions.md), rows of 2026-11-23): the card was redrawn as the business app's "D3" (the driver's version was drawn
in the session's canvas and built); it was tested in Jest when it was written and **seen on both platforms in pass 9, then pass 10** (the lines that end
this block and the tenth round). **CI failed** on `20d8343` on two tests that ran out of time; the limits were
raised (`494bf7e`). **The tabs' flicker** was found by the agent that read those tests and fixed on the owner's yes. The agents'
reports (`scratchpad/round9/`) are the source of what follows; where the repository could confirm or correct a fact, the code was read
(the corrections are said). Nothing in this block was run on a device by the agents that wrote the code, and none of them ran a device.

*The status-band card: what was built.* From top to bottom (the rules are in [THEMING.md](../THEMING.md), "The order card"): the **status band**,
edge to edge, with the status at its start and the time at its end on the tint of a tone; the header (the logo, the store's name over
"#number · customer", the sync cloud and the unread dot, and **the total at its right**); the next-stop line with the distance; the
chips (the order type in its colour, "Delivery #N" as a pressable badge in the same colour, "Collect in cash" or "Paid", the items); the
quick actions in the card's footer, outside its pressable (unchanged). The band's margins cancel the card's padding and its top corners are
rounded to the card's inside, **instead of clipping the card**, so a theme shadow is not clipped; it is a row that wraps (the status
at least 40% and wrapping to as many lines as it needs, the time never cut and going under the status when both do not share a line).
The tones are the badge's soft variants: on time or with no time `primary_soft`, at risk `warning_soft`, late `danger_soft` (also when the
API says in time), and for an order that is over how it ended (`success_soft`, `danger_soft`). The time reads "24 min left", "12 min
late" (no "+"), "6 min left · due 1:05 PM" with `orders.absolute_time`, and "12:53 PM · today" for an order that is over; the phrase is the
figure and the catalog's word, composed, and **the catalog did not change** (the builder read the existing words in the 11 locales: "24 min restantes",
"12 min de retraso", "24 min übrig", "24 dk. kaldı"; German "übrig" is understandable and less idiomatic than "noch 24 min"). The order types' colours
are the business app's three variants, `type_delivery` (violet), `type_pickup` (teal) and `type_in_store` (orange), read through
`orderTypeVariant` on the type's chip, on "Delivery #N" (which is a pressable `OBadge`, dimmed and inert at status 23) and on the details'
"Delivery #N" badge. The schema (still 1.0.0) gained five badge variants (`primary_soft`, `danger_soft` and the three types, without the business
app's `dot` colour) and lost `order_card.slots.position`; the editor's label keys are in [editor-labels.md](editor-labels.md).
Also fixed on the way: **the no-break space of the clock time was a plain space** (`NO_BREAK` in `orderCardTime.ts`, with the test's regular
expression), so "due 12:53 PM" could break across lines against what the docs said.

*The build's checks (the builder's own run, once).* `jest`: the first whole run had 3 of 3 573 tests failing (212 of 215 suites passed), all the
builder's own, not flaky: the no-break space assertion, the skeleton test's filter of wrap rows (the band also wraps) and the `OrdersOption` bone
counts; the three suites' folders were rerun (18 suites, 527 tests), all green. `tsc --noEmit` clean; `eslint .` 0 errors (140 warnings, all existing); `lint:cycles`
0; `theme:validate`, `theme:verify` and `theme:keys` pass; `theme:guard` 0 literals; `theme:extremes` and `i18n:verify` / `i18n:check-generated` pass. The tests of
the card (`OrderItem.test.tsx`) were rewritten for the band (the time per state and its tone, the short durations, the absolute time, a long status with a long
time, no plan, an assign request, finished orders, the total in the header, the type's variant per `delivery_type` and on "Delivery #N", each `orders.*` key);
`orderCardBand.test.ts` and `orderTypeVariant.test.ts` are new; `OrderListSkeleton.test.tsx`, `OrdersOption.test.tsx` (the status's testID and the bone counts
10 and 9), `OrderHeaderComponent.test.tsx`, `designDefaults.test.ts` and `themedPrimitives.test.tsx` (the new variants and the badge's `onPress`) were
adjusted. **Jest checks the style values of the band's layout, not Yoga**: the wrapping of a long status beside a long time is not tested by any
engine.

*Corrections after reading the code.* The report says the position pill has "a 44 px touch area, not the old 32 px button": the code gives the badge a hit
slop **above and below it only** (the control's height less the badge's, halved), so it is 44 tall to the touch and not wider than the badge. The report says
the band's "gap `sm`": that is the column gap; the gap between lines when the time wraps under the status is `xxs`. The report says the band is not drawn "if both
texts are hidden or absent, which includes an assign request": true, because an assign request has no status text and no time.

*The CI failure and its fix.* On `20d8343` the coverage run failed two tests that ran out of time (the two the test-limits agent was given): **LoginForm, "takes the message away
when the field is corrected"** (after `changeText`, react-hook-form re-validates asynchronously and re-renders the whole form; the agent measured the event loop
blocked about 235 ms before the first microtask and the message gone about 465 to 480 ms after, on a quiet machine, against the library's wait of 1 s) and
**OrdersOption, "keeps the gutter after tabs that share the row"** (the screen drew four tabs, then read the switch and re-rendered the whole screen, about 840 ms on a quiet machine;
its explicit wait of 5 000 ms equalled the test's own limit of 5 s). The fix, committed and pushed as `494bf7e`: `jest.config.js` `testTimeout: 15000`,
`jest/setupAfterEnv.js` `configure({ asyncUtilTimeout: 5000 })` (so a wait ends before its test does), the explicit wait of the tabs test dropped and a comment in
the LoginForm test. No test relies on a wait timing out (the agent found no `rejects`, no `try / catch` around a wait that expects to fail, no
`waitForElementToBeRemoved`, no `jest.setTimeout`). A third test, `PreviousOrdersOffline` "Accept all", uses the same pattern (an explicit 5 000 ms wait in a test of
5 s) and was not opened; the global limit covers it. After the fix: LoginForm 83 of 83 in about 2.4 s three times under 6 busy loops and once under 30, `OrdersOption`
three times under 6 loops and once under 30 with only one failing test, the skeleton-count test broken by the card's uncommitted work (the agent's own diagnosis, not its
change), `tsc` clean. **On `494bf7e` CI ran 24 steps green and failed only at "Theme schema publish (dry run)"**, as on every push so far (the publish secrets are not set).

*The tabs' flicker, and its fix.* Found by the same agent while timing the OrdersOption test: **a project that combines pending and in progress drew four tabs and then three.** The
wrapper held `useState(null)` and read the stored switch in an effect, so the first paint counted `null` as "not combined" (four tabs) and the re-render brought three; the
controller (`OrderListGroups`) reads `combineTabs` once at mount and never followed; the provider's `isCombinedTabs` started false and was set only by the screen; the online start
removed the stored value, so a cold start offline usually had nothing stored. The owner said "yes, fix the tabs' flicker". **Now** `projectCombinesTabs` decides from the loaded
config (the rule of `projectSavesChangesOffline`), `OfflineActionsProvider` is the only place that stores the value and keeps what an earlier run left only until the config
loads, and `useCombinedTabs` returns `{ combined, pending }` in the render that paints the tabs; while pending the tab bar is a bone and the list the skeleton; with nothing kept and the
config failed (offline), four tabs. The screen reads and writes no storage for it. Left: a project with three tabs, nothing stored, opened offline and then online draws four and then three; `NewOrderNotification`
still reads the config itself for its requests button. **Tests:** the "keeps the gutter" test is now synchronous; a new `OrdersOption` block (three tabs at the first render with nothing awaited and
after settling, every render's tabs three, four at once for a switch of "0" and for a missing key, the config winning over a kept "combined" value, the kept value standing in
while the config is not loaded, held while loading and while the read is pending, four once the config failed, the tabs the moment the config arrives, the controller told the value
and nothing while unknown and following a config that overrides the kept value, no storage read, write or remove of the key on the screen, no extra screen render after the paint)
and a new provider block (the config's semantics, the stored value written from the loaded config and following it, nothing written while unknown, the kept value standing in only until the
config loads, a late read not overriding it, a non-boolean ignored). **The agent's run (once):** `jest` 3 597 passed and 3 failed in 3 of 215 suites (one of its own new tests counted whole-screen
commits and was noisy because an unrelated async re-render adds one: it was rewritten to count the screen's own renders and the whole suite was not run again; the other two, `PreviousOrders.test`
and `PreviousOrdersOffline.test` "Accept all" (5 s timeout), ran while `tsc` and `eslint` loaded the machine and passed alone, with `OrdersOption.test`: 3 suites, 243 tests); `tsc` 0 errors (twice); `eslint .` 0
errors (140 warnings; one `exhaustive-deps` warning of its own fixed); `lint:cycles` 0; `theme:guard` 0 literals. **Not verified:** any device; the real `OrderListGroups` controller (Jest mocks it:
the sync through `setCombineTabsState` and the controller's reset effect on `combineTabs` are read from the code); how the held bar looks and the real timing; the path "first run after the update, nothing stored, a slow
config" with anything but mocks.

*Not seen, and why (written before pass 9; passes 9 and 10 saw most of this, as their paragraphs say, and did not reach the time dropping under a wrapped status, the assign request's card, the pill dimmed at status 23, a dark or high-contrast theme, the composed phrases read by a native speaker and the tabs' cold-start cases offline or on a fresh install).* **Anything of the band on a device or an emulator:** the band's wrap layout in Yoga (a long status such as "Driver almost arrived to customer" with `orders.absolute_time` on, and the largest
system font, where the time should drop under the status, right-aligned), the negative-margin touch area on Android (a tap on the band opens the order), the band's rounded corners against a themed shadow, the pill's
44 touch reach, the three tones (on time, at risk, late), the green and red bands of finished orders, "12:40PM · today", the three type colours with "Delivery #N" in the same colour and the pill dimmed and inert at status 23, a group's
rows, an assign request's card (no band), the skeleton while loading, a dark or high-contrast theme, **the contrast of the warning and danger texts on their tints** (the theme's tokens, lighter than the drawing's, not measured), the
**composed time phrases read by a native speaker**, and **the tabs on a device** (a cold start online with the switch on and off, a cold start offline after a run online, a switch changed on the server, a fresh install).
Not seen of the eighth round either (still): two fingers on iOS, an order in time, VoiceOver and TalkBack, a real phone, 360 dp, another locale.

*Device pass of the status-band card (pass 9, 2026-11-23, one agent on the iOS simulator and one on the Android emulator, against the local API, before the
round 10 fixes; the reports are `scratchpad/round9/pass9_ios.md` and `pass9_android.md`).* **Seen, on both platforms:** the band runs edge to edge at the card's top and its two top corners are
rounded to the card's inside with a continuous border and no square corner poking out (zoomed 3 to 8 times; also on the nested rows of a group); the status at its start and the time at
its end, read as "Ready for pickup · 47 min left", "Accepted by driver · 18 min late", "Pick up completed by driver · 4 d late" (a day-old order is over 48 hours late, so the
figure is days; "20 h late" appeared only with a time moved back), "Delivery completed by driver · 06:37PM · 18/11/2026"; the total at the header's right, the stop line with the whole distance, the
type chip and "Delivery #N" in violet, "Collect in cash", the items and the buttons; completed and cancelled cards with no stop line and no buttons; **no card tinted outside its band**; the tones
(on time the brand's soft violet, at risk amber, late pink, completed mint, failed pink); a long status wrapping to two lines in the band with the time staying at the right (iOS at the
largest accessibility content size, Android at font scale 1.3) and nothing cut or overlapped; a tap on the band, on the body and on the card's edges opening the order; a tap on "Delivery #2"
opening the position dialog and not the order (Android: the dialog wins about 13 px below, 12 to the right and 22 above the pill, and at 57 px to the right the card opens); a short tap on a step showing "Hold to confirm"
with no PUT; **a held step giving one PUT and one list GET, the band and the buttons changing with no skeleton**; the first tap on "Pickup failed" 12 s later opening its form; two fingers (one on "Pickup complete",
one on the header) giving one PUT and not opening the order (Android); a group's rows (cart group 57) as cards with their band and no buttons inside the group's card; accept opening its sheet and accepting (iOS). **Defects found:**
(1) the order's details' "Delivery #N" badge was the solid brand badge on both platforms, not the type's colour (the build said it was); (2) the skeleton did not follow the new card: no tinted band, no buttons bone, so the list jumped
when the cards arrived (iOS: a skeleton card of 177 pt against 219 pt for a card with its buttons; Android: about 150 px shorter); (3) the contrast of the band's texts measured from pixels on iOS, 12 px semibold: late and failed 4.04, at risk 4.29,
completed 4.21 (under 4.5), on time 6.06; (4) a double space before the distance's "·" (a no-break space and the row's gap); (5) on Android a dead strip about 50 px high between the chips and the buttons that opened nothing. **Differences from the mockup**, listed
not fixed: an outlined round icon button before the type chip for an order with no position; the chips in regular weight where the mockup has "Delivery #1" semibold; the "4 d late" the mockup has no figure for; the title at font 1.3 shortened to
"#3458 · LuisS Me…". **Not reached:** the time dropping under a wrapped status (it never happened at the sizes the devices allowed); the assign request's card; the pill dimmed at status 23, the offline cloud and the unread dot; the skeleton on the Assigned
tab (it loaded empty; the skeleton was seen on In Progress); a list of four or more separate cards on Android. On Android the app **jumped tabs by itself twice** (In Progress to Pending after a tap on Refresh, and to Cancelled) while the iOS agent was changing an order's status:
the cause was found in round 10 (below). Local data of two orders per platform was changed and restored, proved by a select at the end of each pass; no theme or config was changed.
*Device check of the tabs and of the two settings on the band:* **not done in pass 9** (it looked at the band only, and changed no theme or config, so `orders.quick_actions` and `orders.absolute_time` were not toggled); the tabs were seen in pass 10 (below) and the two settings on
the band were seen in pass 14, on both platforms ("Pass 14", below).
*Checks at the end of the ninth round, and of the tenth to twelfth (the whole run of 2026-11-23, commit `6b83242`):* `tsc --noEmit` clean, `eslint .` 0 errors (135 warnings), Jest **234 suites and 3 987 tests passing**, `lint:cycles` 344 modules and 0 cycles,
`theme:validate`, `theme:verify`, `theme:keys`, `theme:guard` (0 literals) and `theme:extremes` passing, `i18n:verify` and `i18n:check-generated` passing (read from the run's own log).

### Tenth round (2026-11-23): the Assigned · In Progress · History tabs, and the band's fixes

Two agents, in Jest only, from the findings of pass 9 and from the owner's tabs decision ([decisions.md](decisions.md), the row "The Orders tabs"). **Tabs:** the three tabs, the History
chips, the screen's own selected tab, the status-based split, the one-list-after-another loading ("The Orders tabs" in [THEMING.md](../THEMING.md)); the cause of the tab that jumped was read in the
controller: its effect on `[combineTabs]` is the only path that moves its own tab (a plain load, refresh or `newFetch` does not), and the app's own paths are a tap on a tab, the alert's "View orders" (`tabRequest`, which opens the tab of the last updated order's status and fell back to Pending: an order
cancelled lands on Cancelled, which matches the symptom) and the requests button's way back; **a config that arrives without the key reads as "not combined"** is the reading, not confirmed on a device. **Card fixes:** the details' badge in the type's colour in `focus/StatusRow.tsx` (the file the devices
draw; round 9 had changed `OrderHeaderComponent.tsx`); the band inks as literals (ratios computed from the compiled theme by a test: 5.18, 6.66, 5.03, 5.68; the iOS pixel reading of the on-time tone was 6.06 against the computed 5.18, both pass); the skeleton (band tint, buttons bone,
`closed` shape; the card agent counted 11, 10 and 8 bones, and `OrdersOption.test.tsx` pins 10 for an open card with its time, 9 without it and 8 for a closed one (why the two differ by one was not looked into; both are green in the final run)); the single space before "·"; the gap above the footer moved to the pressable. **Catalog:** `ASSIGNED`, `HISTORY`, `NO_ORDERS_ASSIGNED`, `NO_ORDERS_IN_HISTORY`, `NO_COMPLETED_ORDERS`, `NO_CANCELLED_ORDERS` in the 11 locales.
**Tests:** new `orderTabs.test.ts`, `OrdersOptionTabs.test.tsx` (against a stateful stand-in controller, `jest/helpers/fakeOrderListGroups.js`, because the real one was never run in these tests), new cases in `FocusOrder.test.tsx`, `OrderItem.test.tsx`, `orderCardBand.test.ts` (the WCAG ratio of every tone),
`OCardFooter.test.tsx` and `OrderListSkeleton.test.tsx`. The tabs agent's single run: `tsc` 0 errors, `eslint .` 0 errors (141 warnings), `lint:cycles` 0, `theme:guard` 0; `jest` 3 664 passed and 10 failed in 3 suites, all in its own files (a missing `?? []` on a search results list and one tab-scroll test that no longer
applied), fixed and the 11 `OrdersOption*` suites rerun (262 tests); the card agent's run: 212 of 215 suites and 3 610 of 3 616 tests, its own three failures fixed and the other agent's two skeleton-count tests (10 and 9 bones) left for it. **Not verified:** the real `OrderListGroups` controller (its semantics are those of the stand-in, copied from reading `index.js`: the effect that loads an unloaded
selected list, `newFetch` resetting every list's pagination and its `[combineTabs]` reset); the chips' look beside the tabs; Load more on a phone with a slow API; and the whole device behaviour of the new card fixes.

*Pass 10 (2026-11-23, 10:14 to 10:54, iOS simulator iPhone 17 and Android emulator-5554; the reports are `scratchpad/round10/pass10_ios.md` and `pass10_android.md`).* **Seen OK, both platforms:** the first Orders frame of a cold start already has Assigned · In Progress · History with Assigned selected, and no frame of
other tabs (the iOS bursts ran at about 0.4 s a frame, so a one-frame glitch could slip between two shots; the tab bar fits the width: three tabs of 96.7 pt on iOS); an offered order (status 4 with a fresh assignment) is in Assigned with Reject / Accept and not in In Progress, and after the accept through the sheet it goes to In Progress with one PUT, then the
lists' GETs, no manual refresh, and **the selected tab does not move**; an order set back to status 4 with a later driver stage stays in In Progress; the History chips All · Completed · Cancelled under the tabs (All mixes both, latest ended first by the band's time and not by id; each chip shows only its own orders; the empty Cancelled chip reads "No cancelled orders" with an inbox icon; back from an order
opened in History returns to the chip it left); Refresh, pull to refresh and changes made in the database left the tab where it was, on both platforms (iOS: In Progress, and History with Cancelled; Android: five refreshes and a pull on each); a search replaced the tabs with the filters notice and "Clear filters" brought the same tab back (iOS); the details' badge is soft violet beside the
solid "Ready for pickup" (the colours matched the type's variant); the band inks measured from pixels: late and failed `#C42543` on `#FEEDF0` 5.03, completed `#00713F` on `#D6FFF7` 5.68, at risk `#6B5300` on `#FFF4CC` 6.66 (and the "Collect in cash" chip the same); one space before the "·" (6.3 pt against 9.3 pt in pass 9); the History skeleton with the band tint and no stop line or buttons (iOS: card edges identical to the real
cards, no jump; Android: the same height as the real History card); a tap in the gap between the chips and the buttons opens the order, a tap on a button never does (both platforms; Android at three x positions), the pill's own reach opens its dialog; a short tap on a step gives the hint; **two fingers on Android: one PUT, one GET, the details did not open**; a held step with no skeleton; on Android the offline accept
(config `allow_save_changes_offline` `'1'`): the order goes to In Progress at once with the cloud mark and the banner "1 changes pending sync", and the selected tab stays. **Defects found:**
(1) **Android, serious: after an offline accept syncs, the app keeps a stale list and stops refreshing** (the PUT succeeded and the database said status 8; no list GET followed it; the order reappeared in Assigned with Reject / Accept, still a minute later; from then on Refresh, pull to refresh and tab switches sent no requests and History's skeleton stayed up; a force-stop and relaunch fixed it);
(2) **iOS: an order that left In Progress outside the app did not show in History** (set to cancelled in the database while the driver sat on History: the cancelled list's GET answered 200 with the order, but Cancelled and All lacked it until In Progress was opened, which reloads the in-progress list; the stale copy won by being "native" to its list);
(3) **the selected tab's label broke**: iOS at content size large, "In Progress" on two lines in the selected pill; Android at font scale 1.3, "Assigned" broken in the word ("Assigne / d");
(4) **Android, offline after the accept of the only order in Assigned: "Network Error" and a Refresh button** instead of the empty text; (5) Android, History All painted the completed list alone for about 3 s and then inserted the cancelled orders above it; (6) Android, the skeleton of a cold launch: its first card's top equals the real card's, but it is about 11 dp (30 px) taller in total (600 px against 570), and 3 skeleton cards become one real card;
(7) minor: on iOS a tap on History while a pull to refresh was settling did nothing once. **Observations:** the dev build warned that `params.order.api…setAccessToken` is not serializable in the navigation state (when an order is opened from History: every order of the SDK carries its client); an older red-screen text in `logcat` about `currentTabSelected === LOGISTIC_TAB` was from before the pass and was not seen again; the server moves an
accepted order to status 18 by itself from the driver's position, and Google's Location Accuracy dialog came back on each resume with the wifi off. **Not reached:** "Load more orders" (each chip had at most two orders; the driver has four in all and page size is 10), the "Paid" chip (the card kept reading "Collect in cash" after the payment method was changed in the database, not looked into),
the open-card skeleton's band, buttons bone and height on a cold switch to In Progress (the list always kept its rows), and the sort of History All beyond two orders ended seconds apart. Local data was restored and proved by a select at the end of each pass; config 354 was set to `'1'` for the offline item and put back to `'0'`.

### Eleventh round (2026-11-23): pass 10's findings fixed, and the delivery time in minutes

**Tabs and lists (`scratchpad/round11/tabs_fixes.md`, Jest only).** (1) The chain the lists' hang was read to follow (from the code, not confirmed on a device): on reconnect a list GET went out as the network flipped, before the sync's PUT answered; it never answered, and its `loading` flag and the app's `inFlight` blocked every
later Refresh, pull and tab switch; the reload queue's own 30 s give-up ran into the same guards; the sync emptied the queue, so the overlay was gone and the pre-PUT copy showed the order in Assigned again. **Fixed** with the 20 s bound per list, `holdLoads` while the queue sends, `syncing` and the 30 s limit of a sync request, the 45 s wait of the screen and the kept stage of a sent order (60 s at most).
(2) History missing an order that left In Progress outside the app: the newest copy by `updated_at` wins. (3) Offline with the queue on and stored lists with orders, an emptied tab says its own empty text. (4) History All keeps its skeleton until both lists answered (`holdRows`). (5) `Tabs` `noWrap` and the Orders tabs as wide as their text. (6) Two questions answered by reading: no state calls the controller with a tab it does not know
(the red-screen text in `logcat` was from an earlier version of the file); the non-serializable `params.order.api` is every tab's rows, and the cards now get a copy without `api`. **Single run of the agent:** `jest` 3 674 passed and 17 failed in 4 suites (13 in the accept sheet's tests and one skeleton test, both the other agents', and its own, fixed afterwards: the `OrdersOption*`, `Tabs*` and `context` suites 382 tests pass); `tsc` 0 errors; `eslint .` 0 errors (138 warnings); `lint:cycles` 0; `theme:guard` 0;
the full `jest` was not rerun after its last fixes. **Not verified:** a device; the hang is simulated (`server.hang` and fake timers: the real behaviour of a request sent as the network flips is unknown, and which request hung first is not known); the tab widths at font 1.3 and on a 402 pt iPhone; whether the real controller's `loading` flag, once abandoned, behaves as the stand-in's does when a retry lands.

**The delivery time in minutes (`round11/accept_minutes.md`, Jest only).** The control as built, the values and what was removed are in [components.md](components.md) section 12 and "The delivery time" in [THEMING.md](../THEMING.md). The agent found nothing that relied on 0 or on more than 180, and that `hidden_driver_eta_time` is not read by the sheet. It also fixed the skeleton's extra height measured in pass 10 (the lead bone
is as tall as a badge, 20 dp, where it was the 32 setter chip: a card that has its position is 12 dp shorter than the old skeleton). **Single run:** `jest` 221 suites and 3 754 tests passed; `tsc` clean; `eslint .` 0 errors (136 warnings); `lint:cycles` 0; `theme:guard` 0; `i18n:verify` and `i18n:check-generated` OK; `theme:keys` failed once (the `time_color` reader was invisible to its text search as written) and passed after a one-line change, with `jest` not rerun after it.
**Tests:** new `MinutesValue.test.tsx`, `DeliveryTime.test.tsx`, `AcceptOrRejectDeliveryTime.test.tsx` (the three ways of entering and each ending of the typing, limits and correction, the minus and plus line at rest and while typing, no auto-focus, minutes sent for a single order and a group online and queued offline, `flush`, the accessibility labels). **Not verified:** the layout on a device (the alignment, the keyboard rules, the Accept button's height with the hint line), Android and iPad keyboard-hide behaviour, the Arabic
number agreement by a native reader, and the skeleton's 11 dp (derived from the code and pass 10, not measured). Existing translations that read wrongly were noted and not changed ([components.md](components.md) section 12).

*Builder base planning (`round11/builder-plan-report.md`).* The plan for the new Builder base was written in this round, with no database read; it is the base of HANDOVER.md section 2, which now records the base as created.

*Pass 11 (2026-11-23, iOS simulator iPhone 17 and Android emulator-5554, against the local API; both partly done; the reports are `scratchpad/round11/pass11-ios-report.md` and `pass11-android-report.md`, the evidence `pass11-ios/` and `pass11-android/`). It checked round 11's fixes and the new delivery time.*
**iOS, seen OK:** the accept sheet opens with no keyboard and shows the position stepper, "Delivery time", the chips 10 · 15 · 20 · 30 · 45 with 20 selected and "− 20 min +" (accessibility labels "5 minutes less", "Delivery time, 20 minutes. Tap to type a value", "5 minutes more"); chips and stepper (10, 15, 30 and back to 20; "−" disabled at 5); a tap on the figure gives a numeric field with "min", the hint "Minutes, from 5 to 180", no icon and no confirm button; **minus and plus did not move relative to the panel in any state** (the centre of "+" 35.5 pt under the panel's top at rest, typing and error; the box is 44 pt); "37" deselects the chips, "30" selects chip 30, "300" and "500" show the error and grey the minus; chip 45 or "+" tapped while typing ends the typing and wins; Done ends it and keeps the value; Accept with "999" showed "180 min" and sent nothing, the next tap sent one PUT and the API stored `delivered_in` 180; Accept above the keyboard with the figure visible at the default size; the three tabs each as wide as their label (97.7, 108.3 and 84 pt), identical whichever is selected, and at accessibility extra-extra-extra-large no label breaks and the row scrolls about 17 pt so the last tab can be selected; **History's stale copy fixed** (an order set to cancelled outside the app showed in Cancelled and All without visiting In Progress; pass 10's defect 2); History All's cold first load: 18 frames of skeleton, then both cards at once, none alone; opening an order from History showed no "Open debugger" warning toast.
**iOS defects:** (1) **typing in the delivery time field does not end on a tap outside it**: a tap on the sheet's title row, the label or the panel's corner leaves the keyboard and the field editing, and a tap on the dimmed page closes the whole sheet in one tap (the typed value is lost), so only Done, a chip, plus or Accept end it (the agent noted this may be the backdrop's intended behaviour); (2) minor: the range error is taller than the hint, so the keyboard-docked sheet grows 5 pt upward (panel top 358.0 to 353.0) when it replaces the hint.
**Android, seen OK:** the offline accept then sync, which pass 10 had broken: in three cycles the order stayed in In Progress with no mark and never returned to Assigned; Refresh, pull to refresh and History each sent requests and no skeleton stuck; in cycles 1 and 2 the PUT was followed by the in-progress list's GET at once (cycle 2 accepted from the order's details, which then show "Pending sync changes"), and in cycle 3 the lists caught up 3 s after a second reconnect with no relaunch (that cycle was not a true cut during the PUT: it went out about 3 s after the cut); the new sheet seen offline (no keyboard, five chips, "− 20 min +", Accept disabled until the position's plus is tapped) and `delivered_in` 20 stored; the tabs: bounds identical in all three states and no tab moves, at font 1.3 no label breaks in a word and all three fit without scrolling; History All's first load: skeleton frames for about 24 s on a slow emulator, no frame with the completed order alone (no real cancelled order existed to test an insertion above it); **the skeleton of a card with a position now equals the real card** (549 px against 550, the next card at 1035 against 1036; it was about 30 px short).
**Android defects:** (1) **offline with the queue on, the lists blanked themselves and did not reload on reconnect** (seen once, in cycle 3: with two offered orders in Assigned, wifi and data off and the Google dialog dismissed, both cards vanished within about 6 s, "No orders assigned"; In Progress read "Sorry, no results found" although an order was accepted; back online no request for about 8 s and the empty list stayed; Refresh restored it; **not isolated**, the Location Accuracy dialog and the app resuming may be the trigger); (2) minor: **the pending list was requested twice** (two identical GETs in the same second) on Refresh, pull to refresh and the History switch, and two completed GETs on History; (3) minor: **one pull to refresh sent no request** (cycle 2, Assigned; not repeated, possibly a missed gesture). The Google "Location Accuracy" dialog returns on each resume with wifi off, swallows taps and shifts the sheet by about 32 px.
**Not reached, and why.** **Both agents' database writes stopped mid-pass** (from about 11:29 on Android and during the pass on iOS: every write through tabularis timed out with "Approval timed out after 60s", because tabularis now asks its owner to approve each write; the agents did not work around it). So, on iOS: accepting once with 25 and reading `delivered_in`, the sheet opened from the order's details, the group of two orders with "Accept all", the keyboard rules at extra-extra-extra-large, and the plus at 180; on Android: the whole delivery-time sheet beyond what was seen offline (chips, stepper limits, typing and its endings, "999" and "25", "Accept all", the keyboard at 1.0 and 1.3), the skeleton of a card with no position, and the tightest case of the offline cycle (a cut during the PUT). **Data:** the orders and the config were restored afterwards by the coordinator, with the owner approving each write; config 354 was put back to `'0'`; 3506's original `delivered_in` was never on record and was set to 30 like its sibling 3457.
**What round 12 did with it:** the defects were fixed in code with tests (the typing endings by a tap on a blank part of the sheet and on the dimmed page, the reserved line under the field, the offline lists keeping their rows, the single reload on reconnect, one request per list, the pull's path read and not reproduced), and pass 12 confirmed most of them on a device ("Pass 12", below).

### Twelfth round (2026-11-23): the lists after an outage, the sheet's typing, the route, the connection sheet, the switch, the Messages rows and the sockets

Five agents and a socket audit, in Jest only (no device; pass 12, below, is their first device pass). Their reports are in `scratchpad/round12/` (`a-report.md` to `e-report.md`, `sockets-report.md`, `components-report.md`).

**A (Messages rows, `OSwitch`, the iOS module name).** The Messages row is "#number · store" (`message-title`), built with the new `utils/orderTitle.ts`; the card's header uses the same helpers, and an empty id now gives nothing where it gave "#". `OSwitch` was rewritten (the app already had one, which wrapped the platform's `Switch`): drawn by the app, four size keys added, the `switch.base.thumb` record of `theme-readers.json` removed
(the text search finds the reader). `PRODUCT_MODULE_NAME = ODelivery;` added to both configurations of the app target; `xcodebuild -showBuildSettings` with `PRODUCT_NAME="Acme Driver"` printed `PRODUCT_MODULE_NAME = Acme_Driver` before and `ODelivery` after (the header's own name does not print in that output). **Checks:** `tsc` clean; `eslint` on its five files 0 errors (5 old warnings); the theme checks pass; `jest` 22 suites and 621 tests (`themedPrimitives`, `PreviousMessages`,
`MessagesOption`, `UserProfileForm`, `PreviousOrders`, `utils`, `MessageListSkeleton`). No text key was added. **Not verified:** the switch's slide and feel, how the title cuts a long name (Jest has no layout), a real iOS build, how a screen reader reads the "#" and the "·".

**B (the accept sheet's typing, the offline lists, the duplicated requests, the empty texts).** *Typing:* `OBottomPopup` `onBackdropPress` and `onBlankPress`, `endTyping()` in the sheet, the handle's `isEditing()`; the close icon and the Android back key still close the sheet while typing. *The line under the field:* one clipped row of two full-width cells (Jest checks the style, the `-100%` margin inside `overflow: hidden` was not seen in Yoga). *Offline, queue on, lists blank* (reproduced with the real controller and a fake API,
not confirmed as the exact trigger of the device incident): three paths were traced: the controller's `loadOrders` wipes the rows of a `newFetchCurrent` load and, on failure, writes `error: [msg ?? 'ERROR']` while the XHR error has no message; `applyStoredOrders` captured the offline copy from a snapshot where a load had wiped a list, persisted `[]` for it and applied it over the screen (and, with the provider holding only one
list, wrote the stored empty lists over the rows); and nothing reloaded on reconnect when the lists were marked loaded and no queue ran, which matches "8 s, no request". *Duplicates:* reproduced with the real controller (a Refresh sent `pending:1 pending:1 inProgress:1`; History refresh `completed` twice): `attemptReload` called `loadOrders({ newFetch: true })` in the commit that moved the selection and the controller's own effect, in the same render closure, then
saw an unloaded list; fixed with a microtask. **The pull that sent no request was not reproduced**: no path was found that swallows it online; the likely reading is a gesture below the native threshold or a pull while `isNetConnected` was null or false. *Empty texts:* `NO_ORDERS_IN_PROGRESS` and `NO_ACTIVE_ORDERS`. **Tests:** new `OrdersOptionNetwork.test.tsx` (the real controller and `jest/helpers/fakeOrdering.js`): the rows kept when a load is cut,
the store never written with an empty list over rows it had, an app resume asking nothing, one reload per list on reconnect, a flap once, a failing reload with no cycle after 120 s, the queue's run waited for, a run that sent nothing still reloaded; `OrdersOptionOffline`, `orderTabs`, `AcceptOrRejectSheet`, `MinutesValue`, `OBottomPopup` and the empty texts. The "a load cut by the network keeps the rows" test failed before the fix (Assigned showed 1 card instead of 2); the others were not confirmed to fail on the old code. Run: `tsc` clean, `eslint` on its 7 files 0 errors, `lint:cycles` 0, `theme:guard` ok, `i18n:check-generated` OK, **`i18n:verify` failed on one key that was another agent's (`AVAILABLE`, empty in 11 locales) at that moment**,
27 suites and 771 tests passed. **Not verified:** any device behaviour of the responder claim, the native pull thresholds, the Location Accuracy resume, and the `-100%` margin in Yoga on both platforms; and the socket reconnect can still add a reload about a second after the connection returns (closed by E).

**C (the route, phase 1).** Built and tested in Jest: 22 files in `OrdersRoute/`, nine test files, two pages, the schema keys, 28 catalog keys; the stop-order rule with two worked examples from the tests, the links with fake coordinates (no address, name or number in a URL), `useMapsApps`, the entry's one import and line in `OrdersOption`. Run: `tsc`, `eslint` on its files 0 errors and 0 warnings in them, `lint:cycles` (342 modules), the theme checks, `i18n:verify` (844 keys) and `i18n:check-generated` pass; `jest` 23 suites and 467 tests (OrdersRoute, its page, `OrdersOption`, `navigation.integration`) and `src/theme` (4 suites, 70 tests).
Fixed along the way: a theme literal (`weight={700}`), two keys without a reader, the missing editor-group path of `orders.route` and the harness's slips. **Not verified:** any device, simulator or real map (the dashed round-cap lines on both Google providers, the stop discs as markers on Android, the camera, the panel at the largest text size, hold-to-confirm inside the panel's scroll, universal links opening the installed apps, `getApps`' real answers, the Android back key from both screens); the full suite; the translations (no native speaker); the Dashboard side of the eight labels;
the route under a served theme that hides `business_map.recenter` or `map.zoom_controls`; a real offline queue sync with the route open; the accept sheet from the route over iOS.

**D (the connection pill and sheet).** Ported from the business app: `connectionState.ts` and `connectionStore.ts` verbatim; 23 tests ported (the printer rows dropped; cases added for the 12-hour format, the notifications row when its read fails, the busy feedback of "Reconnect now", no "Update" or legend text, the theme following a changed danger colour). Five catalog keys were removed although the catalog's tool says orphans are kept. `HomeNavigator.tsx` and its integration test (a `ConnectionHost` stand-in in the `@ui` mock) were edited though not on the agent's list.
Run: `tsc` 0 errors, `eslint` on its files 0 errors (one old `exhaustive-deps` warning in `HomeNavigator`), `lint:cycles` (344 modules) 0, the theme checks pass (`theme:keys` 30 recorded), `i18n:verify` OK with 853 keys and 171 orphans kept, `i18n:check-generated` OK, `jest` on `WebsocketStatus` and `OrdersOption` 13 suites and 320 tests (the act() warnings are old). **Not verified:** the layout, the dot's alignment, the pill's width at 320 pt and at large text (the header's title is not protected: `ONavbar` lacks `titleFirst` and `tight`), the real `parseDate` on a `Date`, real notification permission states, a real socket reconnect; the suites that enumerate the `@ui` exports or the schema keys, `themedPrimitives` / `OBadge` tests and `designDefaults` were not run by it; the Dashboard-side labels; the `lg`-only `icon_tile` in the editor.

**E (the app's socket fixes).** A failed start counts as down (`handleConnectError`: two of its four new tests fail on the old code); `HomeNavigator`'s rooms join once and leave in a cleanup (four of eight new tests fail with the old effect; the shared `useWebsocket` mock returns an array, so `socket.join` was `Array.prototype.join` and the 26 tests of `navigation.integration` broke when `leave` was added: a stand-in socket was added to that suite); one reload per outage with a 10 s window (four of six new tests fail on the old code); Profile's refresh once per entry (two of three).
Run: `tsc` 0 errors, `eslint` on the changed files 0 errors, `lint:cycles` 344 modules, `jest src/context src/navigators src/pages src/ui/src/components/OrdersOption` 68 of 68 suites and 847 of 847 tests. **Not verified:** real socket.io, NetInfo or React Navigation timing; the real order of the network and socket signals; whether the 10 s window suits a slow socket; the pre-socket dummy wrapper (`useWebsocket()` returns a new `Socket({})` on each render until the provider's state is set: the effect re-runs and leaves on the dummy, harmless and untested); a Profile mounted already focused with no `state` event after it.

**The sockets audit** (read-only, by reading every step of the path in the app and in the submodule, checked out at `ede30be`; `src/config.json` was not opened, so `use_root_point` was taken as false from `theme/areas/2-auth-onboarding.md`; no device). Eleven findings: (1) the assign-request listeners are never removed (medium, high with the logistic module on); (2) a first connection after a failed start is never a catch-up (medium; fixed here); (3) with `use_root_point` logout leaves the previous user's socket live and rejoins their rooms (medium for those builds; the components agent
found it also happens without `use_root_point`); (4) `Contacts` never removes `orders_register`; (5) `HomeNavigator` joins three rooms with no cleanup (fixed here); (6) the connection status chip is inaccurate (the wrong emitter for `reconnect_attempt`; no `connect_error`; a race on attach); (7) the driver joins customer rooms through `OrderContext` (low, upstream); (8) `drivers_changes` uses a stale `session.user` (low to medium); (9) two catch-ups after an outage (fixed here); (10) the flat reconnect retry, with `invalid signature` stopping reconnection for good, and the token in the URL's query; (11) effects that wait on `socket?.socket` can register late (plausible, one step unverified).
**Where each stands:** (2), (5), (9) and a mitigation of (1) in this app (round 12 E); (1), (4), (6) in the components library's pull request #431 (merged), (3) in #432 (merged), and the socket address (`socket.override_url`, from the owner's decision, not a finding) in #433; (8) and the `Checkout` / `MultiCheckout` conditional `off` and the dashboard's copy of `WebsocketStatus` that the components agent found are also in #431, added to it after the first three commits (`15885d6`, `73add81`, `f07d6e5`); **left:** (7), (10), (11). **Not confirmed by the audit:** zombie sockets after the background (iOS suspension, Android Doze); a server emit to several rooms sending one event more than once (the alert queue merges by key); a project change with `use_root_point` true; and nothing about the server (sockets-v3) was looked at.
**The state of the components library's pull requests (2026-11-23, end of day): #426, #431, #432, #433 and #434 are all merged into its `main`, which is `425587a`** (#434 changed the CI runner to `namespace-profile-ordering-co-small`), **and this app's submodule pointer is committed at `425587a`** (`2389e8d`). **Pass 13 (the socket pass, 2026-11-23) ran against the local socket server** (the app's local configuration points at it through `socket.override_url`, never committed; the library at #432's branch, before it merged). **Seen on both platforms:** the pill reached "Live" (iOS within about 5 s; Android on its first screen), the Connection sheet saying Server "Connected" and Notifications "On"; an emitted order assignment showed one alert and one card (iOS: with the sound's cadence, read from the audio-queue log, not heard); a status change emitted for another order changed its card by itself; **logout closed the driver's socket on the server** (iOS at once, Android about 2 s after the confirmation) and the access screen appeared with no error and no crash; **a signed-out app received nothing** (no alert, no sound; it holds an anonymous socket with no rooms, which the business app's session measured on its own app too); after signing in again there was **exactly one driver socket and one alert per event** (iOS: three sign-out / sign-in cycles, each logout disconnecting the driver socket and each login producing one new one; Android: one cycle); **a 40 s background on iOS and an 18 s network cut on Android each reloaded the lists once** (iOS three GETs, one per list; Android assign requests and the two order lists once each, about 4 s after the network returned, and the stale cards vanished; the pill read "Offline" during the cut and "Live" within 3 s of its end). The business app's session tested #432 on its own app and reports, quoted as theirs: logout disconnects the socket at once, login brings one socket with its rooms once, no revival. **Not reached:** the pill going to "Reconnecting" from a real socket drop (the iOS simulator cannot cut its network and keeps the socket in the background; on Android the adb tunnel to the local server is not cut by disabling wifi, and removing the reverse for 20 s did not drop the connection either); Android's further sign-out cycles (the app refuses a logout while the driver has an active order, `LogoutAction.getActiveOrders`, a rule older than this work, and another session's order blocked it for about five minutes); multi-project builds (`use_root_point`); any signed build; hearing the sound or feeling the vibration. **To watch, not attributed:** on the saturated Android emulator (other emulators and the simulator running) the JS thread was blocked about 85 s after the sign-in (the Login button spun, then a blank screen, the anonymous socket dying by ping timeout) and about 45 s at the first chat (the driver socket died by ping timeout and the library reconnected by itself 61 s later, with one live socket afterwards); the agent read it as load and could not prove it, and it is worth looking at on a quiet machine. Also seen, not defects: the app's logout shows the Profile with blank fields for a few seconds before the access screen (about 20 s on the loaded Android); the iOS first alert had two audio-queue starts 33 ms apart (one or two players, not told apart). Orders and passwords of the shared account were restored or reset as each report says; nothing was committed. **Then #432 was merged by the owner: ordering-components `main` is `425587a` and holds #426, #431, #432, #433 and #434, and this app's submodule pointer is committed at `425587a` (commit `2389e8d`)**, so `socket.override_url` exists for local socket tests.
**The components library's three branches, as they were before they merged** (`/Users/work/Ordering/ordering-components-sockets`, all from `main` at `44c9ff1`; nothing in them was run on a device or against a real server, their tests use a fake `socket.io-client`): `fix/socket-listeners-and-status` (207 files and 1 325 tests pass at its first three commits; three more were added to it afterwards: `Checkout` / `MultiCheckout`, the admin dashboard's `WebsocketStatus` and `UserFormDetails`, their counts not read here; `main` has 204 and 1 296; 9 of the 14 tests of the `WebsocketStatus` folder fail on `main`, and the five `OrderListGroups` listener tests all failed on it), `fix/socket-close-on-logout` (204 files and 1 321 tests; four new tests fail on `main`), `feat/socket-override-url` (204 files and 1 311 tests; four of the five new fail on `main`); ESLint clean on the changed folders; they conflict only in test files that both append to (`WebsocketProvider.test.jsx`, `socket.test.js`). The components agent's own list of what it did not verify: a real server or device; whether the server revokes a token on logout; whether any consumer reads `socket.rooms` or relies on a revived socket after logout; `Checkout` and `MultiCheckout`; the rapid pair of `drivers_changes` events.

**The whole run of round 12 (the coordinator, once, 2026-11-23):** `tsc` clean; `eslint .` 0 errors, 135 warnings; `lint:cycles` 344 modules, 0 cycles; the theme's validate, verify, keys, guard and extremes pass; `i18n:verify` and `i18n:check-generated` pass; `jest` **234 suites, 3 987 tests, all passing** (the line "Checks at the end of the ninth round" above is the same run).
### Pass 12 (2026-11-23, after the twelfth round): the first device pass of round 12

iOS simulator iPhone 17 and Android emulator-5554, one agent each, against the local API (reports `scratchpad/round12/pass12-ios-report.md` and `pass12-android-report.md`, evidence `scratchpad/pass12-ios/` and `pass12-android/`, each with `sheets.md`). **Setup limit to remember when reading these passes:** both devices share one test driver account, so one device's position and accepts move the other's orders: the API moved the Android agent's orders to status 18 when the iOS simulator was put at the store (at the same second as the iOS agent's own) and reshuffled delivery positions when an accept took position 1; the orders of the other session also appeared in each device's lists and changed state during the pass (the Route had 3 or 4 stops instead of the agent's own). The Slack check showed `enabled false` on both. Orders and configs were restored and the restore proved by a select (iOS: `row_to_json` of both orders identical before and after; Android: all columns of both rows identical, config 354 back to `'0'`); the rows the API or the other session changed are not the agents' to restore.
**Accept sheet's delivery time, seen OK on both platforms.** *iOS:* the typing ends and the keyboard goes on a tap on the title row, the "Delivery time" label, the panel's top padding and its side padding (a typed 37 is kept, empty goes back to the last value, 500 becomes 180); on the dimmed page the first tap ends the typing and the sheet stays, the second closes it; a chip, minus, plus or the X answers on its first tap while typing and also ends it; **the panel's top edge is 353.0 pt in the hint and in the error state with no movement** (5 pt in pass 11), and Accept's top stays at y=464; at the largest text size the error wraps to two lines and the panel top is 324.3 in both; plus is disabled at 180 and minus at 5; Accept with 25 sent one PUT and the database held `delivered_in` 25 and status 8; the sheet opened from the order's details is the same control over the details; a group of two orders in cart group 57 at status 0 gave "Accept 2 orders · Group No. 57 · Orders No. 3506, 3457" and two PUTs with `delivered_in` 45; at the largest size with the keyboard up Accept and the figure line stay above the keyboard.
*Android:* opening with no keyboard, chips 10/15/20/30/45 with 20 selected and "− 20 min +" with the labels ("10 min", "5 minutes less", "Delivery time, 20 minutes. Tap to type a value", "5 minutes more", "Delivery time presets"); the first tap on a chip and on plus or minus works, plus off at 180 and minus off at 5; the field with digits and "min", the number keyboard, the hint, no icon and no confirm button (37 deselects the chips, 30 selects chip 30, 500 shows the error, at font 1.3 too); **minus and plus sit 690 px under the panel's top before and after (726 px at 1.3)** and hint to error moves nothing (the panel does grow 61 px, 23 dp, when the field opens, because the hint line appears); the typing ends, the keyboard hides and the sheet stays on Done, the back key, the title row, the label, the side padding and the gap; Done with 500 corrects the figure to 180; the first tap on the dimmed page keeps the sheet and the second closes it; 999 then Accept shows 180 and sends nothing and the next tap sends one PUT with `delivered_in` 180; 25 sent one PUT with 25; from the order's details the sheet opens over them and 30 gave one PUT plus a messages POST with `delivered_in` 30; a group of two orders in cart group 51 at status 0 gave "Accept 2 orders · Group No. 51 · Orders No. 3460, 3458" and two PUTs with 40; Accept and the figure line stay visible at 1.0 and 1.3 with the floating keyboard.
**Lists.** *Android, with config 354 `'1'`, three cycles:* the cards stay in Assigned and In Progress with the "Last Update" banner after 10 s offline, after a pull to refresh and after background then foreground, with no error text or empty text; **on reconnect with no action, one request per list about 4 s after the network returned** (cycle 1, Assigned open: pending at :15 and in-progress at :16; cycles 2 and 3, In Progress open: one in-progress request; the other tab's list is not reloaded until it is opened); with a queued accept (cycle 2) the card sits in In Progress with the cloud mark and "1 changes pending sync", then one PUT, the mark goes and the order never bounces; **each action sends each list's request once, never twice** (Refresh and pull on Assigned: pending and in-progress once each; switch to Assigned: pending; switch to History: completed and cancelled; History refresh: completed and cancelled; switch to In Progress and its refresh: in-progress; counted 25 to 30 s after each action). With the queue off (`'0'`) offline the cards stay and Accept and Reject are greyed. *iOS:* the offline cases were not exercised (earlier passes note that the simulator cannot cut its network); a held quick action sent one PUT and one list GET; the empty texts are below.
**Empty texts.** iOS: Assigned "No orders assigned", History All "No orders in your history", Completed "No completed orders", Cancelled "No cancelled orders", a search with no match "Sorry, no results found". Android: Assigned, Cancelled and the search (the tabs and the Route button are hidden during a search).
**Messages rows.** iOS and Android: "#3458 · Taste Wine" on one line with the number whole, the date on the second line, then the status badge; nothing cut in the title at the largest size (iOS) or at 1.3 (Android); the VoiceOver label on iOS reads "#3458 · Taste Wine, 18/11/2026 06:37PM, Ready for pickup, - 4 day 18:18, 39 unread messages". Truncation of a long name was not tested (the agents may not change names).
**The switch.** iOS: track 43.7 × 23.7 (44 × 24), thumb about 19 to 20, touch box 52 × 44, role switch (`AXSwitch`, trait Toggle), value 1. Android: track 115 × 63 px (43.8 × 24 dp), thumb 52 px (19.8 dp), touch box 136 × 116 px (51.8 × 44.2 dp), role `android.widget.Switch`, checkable and checked, label "Available to receive orders", colour `#7C3AED`. **The API refuses the toggle** (400 on `POST users/13217`, "You can't because you have assigned orders"), so the thumb's movement and the off state were not reached.
**The connection pill and sheet.** iOS: "Reconnecting" with a yellow dot, 112 pt at the default size, the title not squeezed and Refresh and Search at x=301 and 350; the sheet has the tile, "Reconnecting", the description, "Last update 01:00PM", Server "Disconnected", Notifications "On", "Reconnect now" and the note; Reconnect now shows a spinner for 2.2 s or more and returns; the X and the dimmed page close it, a swipe down (two tries) does not. Android: "Reconnecting" with a yellow dot online and "Offline" with a red dot offline, the same 326 px slot width in both (381 px at 1.3), "My orders" never squeezed (410 px at 1.0, 485 px at 1.3), the Refresh button disappears offline and the pill takes its place; the same sheet, "Notifications: On" matching `POST_NOTIFICATIONS` granted; Reconnect now shows a spinner with the button disabled for 3 s or more; the X, the dimmed page and the back key close it. The socket is down by design in these builds (see "The sockets").
**The route.** *iOS, in full:* the entry button full width (20 to 382, 44 high) above the first card, "Route · 4 stops", absent on Assigned, on History and with a search applied; the markers numbered in order, the next one solid and larger, the driver a black arrow; dashed lines with the driver's leg a little thicker; zoom, fit and locate work; the distances match the agent's own calculation (2.7939 km shown 2.79, 1.8542 shown 1.85, 5.6624 shown 5.66, total 10.3105 shown 10.31); a tap on a one-order stop in the list opens its details; the Navigate sheet shows "Google Maps · the whole route", "Google Maps · next stop only" and "Apple Maps · next stop only" and no Waze row (not installed on a simulator): the whole route opened Safari with Google Maps' web page with the driver, the store and the destination, "next stop only" opened Safari with Google's "No routes found" (the link carries no origin and Safari has no position; read as the web page's answer, not judged), and Apple Maps opened the Maps app; a short tap on the step shows "Hold to confirm" with no request and a 1.0 s hold with the device at the store sent one PUT and a list GET, the stops and map updating by themselves and the store stop becoming shared by 4 orders with no step button (a tap goes to In Progress); with 3506's customer location null the row says "No location", nothing is drawn for it and it is left out of the total; at the largest size the panel fits without scrolling. *Android, without its map:* the entry button in In Progress only (absent in Assigned, History and during a search); the panel "4 stops · about 25.29 km in a straight line" (the agent's own figures 10.11, 3.86, 5.66, 5.66 and 25.29 km; after moving the emulator to the store 15.18 against 15.18); a 3.5 s hold sent one PUT and the stops updated by themselves ("Pickup complete" then "Arrived to customer", 1 to 3 and 4 to 3 stops); "See all stops": the timeline with the next stop as a card with its status band, the others as rows with the leg distance, a tap on stop 4 opening order 3458 and back returning to the timeline; the Navigate sheet hides Waze (not installed); "Google Maps · the whole route" opened Maps with the intent's origin the driver, the waypoints the store and two customers and the destination the last customer (read from `dumpsys`); a stop without a location shows "No location", the total dropping from 15.18 to 9.52 km and the sheet saying "All 2 stops"; the hardware back goes from the timeline to the map screen and then to the list; at 1.3 the panel scrolls and fits.
**Regression and the skeleton.** A held quick action sent one PUT and updated the card, the details look right and History All's first load shows the skeleton and then the order with no partial flash (both platforms). *Android:* the skeleton card is 530 px high and the card with a position 531 px (it matches).
**Not reached, and why.**
- **"No orders in progress" after the last delivery, the Route button then gone, and In Progress empty (iOS): other orders of the shared test account stay in progress** (3458 and 3460 on iOS; 3506 on Android).
- **"No orders in your history" (Android):** 3457 stays completed.
- **The switch's off state and its thumb's movement:** the API refuses the toggle while orders are assigned.
- **Android's route map, markers and lines, the fit and locate behaviour:** the emulator's map is blank (no tiles; `GoogleApiManager … DEVELOPER_ERROR` in `logcat`: the Maps key is not registered for the package `co.ordering.delivery`, the key the owner still has to provide). The older Map view tab is blank too, so it is the environment.
- **"Google Maps · next stop only" on Android:** Maps' first-run sign-in and then its location-permission dialog consumed the intent; the whole-route intent was read from `dumpsys`.
- **A docked keyboard on Android:** only a floating one is available. **The shared-store stop with no step button on Android:** not built there. **A Route with two stops** on iOS.
- **iOS, VoiceOver labels of the Connection and Accept sheets** (the sheets are not in the simulator's element dump) and whether "Notifications: On" matches the system permission (the Settings screen was not reached).
- **Still open as device tests, with no pass behind them:** `orders.quick_actions` off, `orders.absolute_time` on, `orders.route` off, and a project with combined tabs, all on a device.
**Open items found by pass 12.** *Status after round 13 (below):* items 1, 2, 3, 5, 6 and 7 were fixed in code and **confirmed on devices in pass 14** (item 1 with one defect, fixed in round 14; item 7 only in part: "Pass 14", below); **item 4 is not a defect** (the buttons are the app's 32 pt `OFab` with 44 pt targets, as the decisions log records for the three maps; an option for the owner, not a defect: the stacked 44 pt zones overlap by 4 pt); items 8 and 9 stay open.
1. **The route's dashed lines read as a pale hatched band at the fitted zoom on iOS** (the dashes are about 1 px ticks; zoomed on the driver's leg they read as dots).
2. **The Orders title is cut by the connection pill at the largest text sizes on iOS** ("My orde…"; the pill is 132.7 pt there; text scaling seems capped, since three accessibility sizes gave the same layout; the header's buttons do not move; Android's title is not squeezed at 1.3).
3. **The tab pills keep a smaller width after a text-size change at run time until a relaunch (iOS):** 86.7, 97.7 and 73 pt ending at x=345, against 97.7, 108.3 and 84 filling to x=378 after a relaunch.
4. **The route map's zoom, fit and locate buttons are 32 pt**, under 44 (iOS).
5. **The route panel's next-stop title and subtitle are cut to one line with an ellipsis at large text, on both platforms** (the stops screen wraps them).
6. **Android's availability switch:** a spinner replaces the switch while its request is in flight, the row shrinks 24 dp and the page jumps up and back, and a refused toggle shows no message (iOS shows "You can't because you have assigned orders").
7. **The card skeleton is 12 dp shorter than a card without a delivery position (Android):** 562 px for the card of 3458 against 530 px, the list shifting about 31 px when it arrives (the trade-off the round 11 builder chose: a skeleton cannot know which case it is).
8. **A group card of orders offered at status 4 shows no "Accept all"** (the group card draws it only when the group's first order is at status 0, `PreviousOrders/index.tsx:262`: noted, not judged; the agents did not know whether status 4 groups occur in production).
9. **First taps lost right after a refresh or a tab switch on the Android emulator** (about five times, a second tap worked; not reproduced on iOS).
*Observations, not findings:* **the accept sheet opens showing "#" with Accept disabled until plus is tapped, although the card says "Delivery #2" (Android): this is the coded and tested behaviour, not a defect** (`AcceptOrRejectOrder/index.tsx`: `deliveryPriority` starts `null`, the stepper shows "#" and its first step gives 1, `needsPosition` keeps Accept off until a position is chosen; the test "is off until a position is chosen, and nothing is sent while it is" pins it; the decisions log has no row that says the stepper is prefilled with the order's own position, nor one that says it is not: it is the owner's to say if he wants it prefilled); iOS: "Last update 01:00PM" has a leading zero and no space (the project's time format; the local project's has none); Android: the accept sheet's layout takes about 1 s to settle after the typing ends (a chip tap 0.8 s after missed, 1.0 s hit), a burst of 34 quick plus taps registered 7 (taps 0.4 to 0.5 s apart all registered), the in-progress request follows the pending one by 1 to 22 s after a refresh and the list sometimes shows a skeleton or old rows for 3 to 7 s, the three-digit unread badges are tight in their circle at 1.3, "Last update" does not change after "Reconnect now", and Google's Location Accuracy dialog swallowed taps and shifted the sheets by about 32 px each time the app resumed with wifi off; dev-only: the LogBox toast and "Fast Refresh disconnected" once.

### Thirteenth round (2026-11-23, evening): pass 12's findings, and the socket pass

Nine items in code and Jest, by one agent (`scratchpad/round13/code-report.md`; committed as `bc19514`), and pass 13 (above, with the sockets). **The agent's run:** `tsc` clean; `eslint .` 0 errors (the usual warnings, one more `exhaustive-deps` in `UserProfileForm`); `lint:cycles` 345 modules and 0 cycles; the theme's validate, verify, keys, guard (0 literals) and extremes pass; `i18n:verify` (855 keys) and `i18n:check-generated` pass; the whole `jest --silent` 235 suites and 4 015 tests pass with the time limits not raised. **Fail-before check:** the HEAD versions of the 13 changed source files were put back and the new tests run: 26 failed (the items below say which tests were among them).
1. **The connection pill is as wide as its label**, up to the new `components.badge.base.dot_max_width` (140, range 80 to 320, step 1, editor order 5; the hidden sizer of the three labels is gone), and **the Orders title wins** (`ONavbar` `titleFirst`: the title takes its text's width and the end actions shrink first; only the Orders header sets it). The owner's decision of 2026-11-23, which replaces "as wide as its widest label". Tests (fail before): as wide as its label, capped at the maximum on one line with an ellipsis, follows the theme's maximum, `titleFirst` and its control, the header passing it. *Not verifiable in Jest:* the title winning at the largest text (Yoga).
2. **The requests tab's empty text** `NO_ASSIGN_REQUESTS` ("No assign requests", in 11 locales, each worded on that locale's `ASSIGN_REQUESTS`); the order is a search or filters first, then the requests tab, then the other tabs. Tests (the first two fail before): the empty tab, every request expired, a search with no match.
3. **The route's lines.** The premise (the defaults were too small) was half right: the cause is in the map libraries. iOS (`AIRGoogleMapPolyline.m`) passes the pattern to `GMSStyleSpans` with `kGMSLengthRhumb`, so it is **meters along the path**: 2 m at a fitted zoom is a sub-pixel tick, and 10 or 12 as a fixed number would be as invisible; Android (`MapPolyline.java`) with a round cap draws a `Dot` and ignores the dash length. New `routeLineDash.ts` (iOS: points times meters per point from the latitude span and the map's height, drawn again at quarter-octave steps; Android: points as they are, no `lineCap`); defaults `line_dash` 2 to 12 (range 4 to 32), `line_gap` 8 (range 4 to 24), `line_next_width` 4 to 5, and the driver's leg in the new key `components.map_marker.base.line_next_color` (`{color.primary_pressed}`, `#1862C5`, only slightly darker than `primary`, so the width carries most of the difference; widen `line_next_width` or take a darker token if a pass finds it weak). Tests: coherence and ranges, the next-leg colour, iOS meters at two zooms, Android points and no cap, the helper's own. *A device pass must compare:* iOS dashes about 12 pt long with 8 pt gaps at the fitted zoom and after zooming (a brief redraw at each step), Android dashes and not dots (it needs a working map key), the driver's leg wider and darker.
4. **The route map's buttons: stopped, no change.** The route uses the same `OFab` as the driver map and the Map tab (`sm`, 32 pt, 44 pt target through `hitSlop` 6 pt each side), which the decisions log records; so pass 12's finding is not a defect. The stacked buttons are 8 pt apart, so their 44 pt zones overlap by 4 pt: the owner may leave it, raise the gap to 12 or 15 on all three maps, or draw the buttons 44 pt tall (reversing the decision). A test pins that the four buttons have a 44 pt target (it passes before as well).
5. **The route panel:** the next stop's title and meta line take two lines (`NEXT_STOP_LINES`); the distance keeps one. Test fails before.
6. **The availability switch** stays in place, `disabled` while loading, and **the toast comes from the controller's state only** when a request the driver asked for ends (a refusal shows `apiErrorText`, a save the confirmation; opening the screen or reloading the user shows nothing); `isAvailable` falls back to the session's `user.available`, so the switch does not flip to Off meanwhile. The cause of the lost message is read from the code, not proved: the controller answers a refusal with a `result` that has no `result.result`, the local copy is replaced by it and the toast effect, gated on `userState.result.result`, skipped (a timing between two effects probably let iOS show it). Tests fail before. *Not verifiable here:* Android's behaviour. **Found, not fixed:** the profile skeleton's availability box is 32 where the switch row is 44.
7. **The Assigned skeleton's setter chip:** `orderCardPieces` has a `setter` piece, true for `pending` when the project orders by position, and `OrderListItemSkeleton` and `OrderListSkeleton` take `showSetter` and draw a chip-sized bone; two bone counts in `OrdersOption.test.tsx` went from 10 and 9 to 11 and 10. Assumes offered cards have no position: a card with one on that tab is then 12 dp shorter than its skeleton (check both on a device).
8. **`Tabs` measures again after a text-size change at run time:** `key={signature}` on its `ScrollView`. Test fails before; the second (large and back) passes before too, since it only simulates the layout events. *Not verified:* that `useWindowDimensions().fontScale` updates on iOS at run time (the pass 12 report says the pills did resize at large).
9. **Android builds for ARM only:** `reactNativeArchitectures=armeabi-v7a,arm64-v8a` in `android/gradle.properties` (the owner: "remove the x86 ones"); no code or CI assumed x86; no Gradle run. An x86_64 emulator: `./gradlew :app:assembleDebug -PreactNativeArchitectures=x86_64`.
**Catalog:** `NO_ASSIGN_REQUESTS` and `CART_REFRESH_RESPONSE_ERROR`, a text the components library at `425587a` reads, added with 11 locales by the agent's own translations so that `i18n:verify` and `i18n:check-generated` pass (none read by a native speaker; without it the two checks fail again with the local submodule). **Schema:** `badge.base.dot_max_width` and `map_marker.base.line_next_color` added, `line_dash`, `line_gap` and `line_next_width` changed, the version still 1.0.0. **Not verified:** any layout in Yoga (the pill's shrinking, `titleFirst`, the panel at large text), Google Maps rendering on either platform, whether the Android refusal toast reaches the screen, whether the font scale event fires on iOS at run time. Pass 14 confirmed most of these on devices ("Pass 14", below); what it did not reach is listed there.

### Pass 14 (2026-11-23): round 13 on devices, and the theme settings for the first time

iOS simulator iPhone 17 (code at `bc19514` as Metro served it) and Android emulator-5554, against the local API; reports `scratchpad/round14/pass14-ios-all.md` and `pass14-android-all.md`, evidence `scratchpad/pass14-ios/` and `pass14-android/`. **Part A confirmed round 13's fixes; part B** set the served theme of the local project to `orders.quick_actions` false and `orders.absolute_time` true and the project config `combine_pending_and_progress_orders` on (step 1), then `orders.route` false (step 2); the theme and the config were put back by the coordinator. The shared test account moved the other device's orders again (the API moved 3460 to status 18 when the iOS agent's simulator was put at the store by mistake; positions were reshuffled); the orders of each agent were restored and proved by a select, and the other's were not touched.
**Part A, seen OK.**
- *The pill and the title.* iOS: the "Live" pill is 61.7 × 24 pt (pass 12's was 112 for "Reconnecting"), its touch box 71.7 × 44, Refresh and Search at x=301 and 350; at the two largest accessibility sizes "My orders" is whole (pass 12: "My orde…"), the pill 67.3 pt. Android: the pill 164 × 63 px at 1.0 and 205 px (button) at 1.3, "Offline" 200 px, the refresh button hiding offline and returning; "My orders" whole in every state, the pill never before the title's end, the search button on screen.
- *The requests tab:* "No assign requests" with an inbox icon (both), the search hidden there; a search with no match "Sorry, no results found" (both).
- *The route's lines, iOS:* clear dashes at the fit, after two zooms in and after zooming out: the driver's leg dash 12.2 to 12.3 pt, gap 7.0 to 7.1 (period about 19.3 against the 20 expected), width 4.7 pt, colour (102, 25, 234); the other legs dash 12.1 to 12.2, gap 7.1 to 7.2, width 2.6 to 2.7 pt, (124, 58, 237), so **the driver's leg is about 1.8 times wider and darker**; after a zoom the pattern is recomputed within about 0.4 s (one frame still showed the old pattern scaled up).
- *The route panel at the largest text:* the next stop's title on two lines ("Pick up at Taste Wine" and "Deliver to 11th Ave, New York, NY, USA"), the sub-line "#3457 · LuisS Mercado · Collect $ 132,60 in cash" on two lines, the distance column on the right, the summary on two lines, Navigate and the step button not pushed off, and (Android at 1.3) the panel fitting without scrolling. A three-line address was not tested.
- *The availability switch:* in place with no movement of the row or the page in any frame (iOS: the first frame after the tap pixel-identical to before, value 1 throughout; Android: the track at x873 to 987 in every frame and "Information" at y=749, against pass 12's 64 px shrink), and the red toast **"You can't because you have assigned orders"** on both platforms (Android: at the bottom above the tab bar for about 3 s, about 5 to 6 s after the tap on a slow emulator; the API answered in 65 ms).
- *The Assigned skeleton:* iOS 232.0 pt against a real card without a position of 232.4 and with one of 220.3 (about 12 taller than the latter); Android 561 px against 562 and 531. The skeleton lasted about 0.1 s on iOS and showed in two of four cold launches.
- *The tabs after a run-time text-size change:* iOS Assigned 97.7, In Progress 108.3, History 84 ending at x=378; at the largest 103.7, 117.7 and 86 ending at 395.3; back at default 97.7, 108.3, 84 ending at 378, so the pills fill the row again (pass 12: they stayed 86.7, 97.7 and 73), also with Route open. Android: the activity restarts on a font change, so a stale layout cannot happen: 1.0 to 1.3 to 1.0 gave the same bounds each time as after a relaunch.
- *Regression look:* nothing broken (a short tap on a quick action says "Hold to confirm", the details, Messages rows "#number · store", a chat, the Connection sheet with "Reconnect now" updating "Last update", the accept sheet with its position stepper and Accept disabled until a position is chosen, the Route with one stop, "See all stops" and the Navigate sheet with Cancel).
**Part A, one defect:** *iOS, the route's lines came up as a fine hatch once in about nine opens* (text size largest, the Route opened and left, two orders changed in the database, the list refreshed, the Route reopened with 3 stops): the driver's leg at 2.4 pt dash and 1.0 pt gap, the other leg looking solid; the Fit button did not fix it and the first zoom press did (12.3 and 7.6); not reproduced in eight later opens. The likely cause the agent gave: the pattern is recomputed only on a zoom change, and the fit sometimes used a stale zoom. **Fixed in round 14** (below).
**Part B, step 1: the three settings and the combined project, seen for the first time on devices.**
- *Tabs.* **Two tabs, "Active" and "History", from the first frame the tabs show.** iOS: a 60 fps video of five cold launches, every frame from the header's first appearance scanned, no flash of three tabs (Active 172.3 pt wide at x=24, History 176.7 at x=201.3, ending at 378); Android: frames about a second apart, two tabs from the first frame with tabs (Active [64,260][528,354], History [541,260][1017,354]), a sub-second flash not excluded. The "Assign requests" clock button is no longer in the row (iOS: it was at x=20 in the other mode). Active holds the offered and the in-progress cards of both; History is unchanged.
- *Cards without buttons (`orders.quick_actions` false).* No Accept, Reject or step button on any card, offered or in progress; a tap opens the details, which keep the actions ("Arrived to customer", "Delivery complete", "Delivery failed"; Accept and Reject on an offered order). **iOS: 166.3 pt with a position chip and 178.3 pt with the outlined "set position" button, each exactly 54 pt shorter than with the buttons (220.3 and 232.4: 44 for the button and 10 for the gap); Android: 437 px (166.5 dp) and 468 px (178.3 dp), 143 px or 54 dp shorter.** The padding under the chips is 15 pt (iOS) and 16 dp (Android), the same as at the sides, the gap between cards unchanged, no empty footer.
- *The band's clock time (`orders.absolute_time` true).* "4 d late · due 06:24PM" and "4 d late · due 06:42PM" (offered, 3460 and 3458), "4 d late · due 07:04PM" (in progress, 3506, at status 8 and 9), "4 d late · due 06:24PM" (3460 accepted): the clock time is added to the relative text, not substituted, in the same red, with no date. At the largest text on iOS "Pick up completed by driver" wraps to two lines and the time stays whole on one line, vertically centred; titles are cut as before ("#3506 · Cliente…"). **Not reached:** the "N min left · due" case (every test order is days late).
- *The route in Active.* The entry "Route · N stops" is still there (362 × 44 on iOS); **the panel has no step button and Navigate takes the full width** (iOS 362 pt from x=20 to 382; Android the full row [53,2074][1028,2190]); on the stops screen the next-stop card has no step button either (iOS Navigate at the card's content width, 279 pt; Android full width). A shared store stop has no step button anyway (3460 and 3506 share one store), so the Android agent set 3460 to status 9 to get a one-order stop. **Two findings, both fixed in round 14:** the stops screen's next-stop band and the late chips of the rows still read "4 d late" without "due HH:MM" (the absolute time did not reach the route; both platforms); and the Active skeleton had no route-entry slot, so the first real card started 59 pt (iOS) or about 155 px (Android) lower than the first skeleton card.
- *The skeleton with the buttons hidden.* iOS: three skeleton cards of 166.0 pt, 181 pt apart, with no button bones; the real card without buttons is 166.3 with a position and 178.3 without, so a card with no position grows 12 pt when the real list replaces the skeleton (it showed for about 0.05 s in one of five launches). Android: 388 px against real cards of 389 px with a position and 420 without (32 px more): the skeleton lost 173 px against the 143 px of the real card because it had no setter bone in the combined tab. **Fixed in round 14** (the setter bone applies to the combined Active tab; Active's skeleton is now as tall as an offered card).
- *Not reached:* "No active orders" (the shared account's other orders always keep Active non-empty, both platforms).
**Part B, step 2 (`orders.route` false), both platforms.** The Route button is gone from Active, in the first launch, and **there is no flash of it in the cold-launch frames** (iOS: all 144 frames of a 60 fps video read zero violet pixels in the button's band, while the same scan finds the button in every frame of step 1; Android: the first card at the same y=428 in the skeleton and in the real list, frames about a second apart, a sub-second flash not excluded). **No empty slot:** the first card sits where the button's slot was (iOS: the first card moved up 59 pt, the 44 of the button and the 15 of the gap; History's chips and first card are unchanged; Android: the first card's node at y=404, the button's place), and nothing else moved (tabs, the pill, card heights, the bands). **No other way into the Route screens:** the Map tab shows the old map and a store marker's card goes back to the list; the order's details have no Route entry, and their Map button opens the order's own map and its old "Show in other maps" sheet (iOS) or "Fit the route" button without a stop list (Android).
**Minor observations.**
- *iOS:* "Last update 03:43PM" keeps its leading zero and no space; the route's zoom, fit and locate buttons are 32 × 32 pt (as decided); at the largest size the tab row reaches x=395 of 402; the "Hold to confirm" toast is a plain blue block; the position stepper shows "#" until a position is chosen (by design); while the Route is open the list moves other orders' positions and statuses by itself (3506 went from position 2 to 3 and four stops became one).
- *Android:* at 1.3 the three tabs measure 833 px against a room of about 822, so they stop sharing the row and scroll, and History rests 4 dp past the cards' edge (flush at 1.0; the same after a relaunch, so a layout fact, not a runtime bug); the Messages rows show "- 4 day 21:11" as the elapsed time (an odd format, not compared with earlier passes); the first tap after a Refresh or a tab switch was swallowed twice (as in pass 12); the dev banners covered the header offline at 1.3; each cold launch takes about 75 s to download the bundle.
**Not reached, and why.** "No active orders", "No orders in progress" and "No orders in your history" (the shared account always has orders); the "N min left · due" case (every test order is days late); "Reconnecting", the pill's 140 pt maximum and its ellipsis on iOS (the simulator cannot cut its network and the pill was "Live" from its first frame in every launch; Android's "Offline" was seen); the switch's dimmed state while its request runs (the refusal returns within a frame, and the Android emulator's request took 65 ms); the route's map, markers and lines on Android (the emulator's map is blank: the Maps key is not registered for `co.ordering.delivery`); a three-line address in the route panel. Orders and the shared account's data were restored as each report says: iOS `row_to_json` of 3457 and 3506 identical before and after; Android all columns of 3458 and 3460 identical; no theme or config change by the agents.

### Fourteenth round (2026-11-23, later): what pass 14 found

One agent, in code and Jest (`scratchpad/round14/code-report.md`; committed as `8609b82`). **Its run:** `tsc` clean; `eslint .` 0 errors and 135 warnings; `lint:cycles` 346 modules, 0 cycles; the theme's validate, verify, keys, guard (0 literals) and extremes pass; `i18n:verify` and `i18n:check-generated` pass; the whole `jest --silent` **235 suites and 4 043 tests pass** (a "worker failed to exit gracefully" notice at the end, with no failing test, not looked into). **Fail-before check:** the old versions of five source files were put back and the new tests run: 15 failed (the pure-function tests of `routeLineDash.test.ts` fail trivially, the functions not existing).
1. **The route's hatch on iOS.** Cause: `RouteMap.tsx` kept the dash scale in state and changed it only in the map's `onRegionChangeComplete`, which divided by the map's height (the window's until `onLayout` ran), and the fit never set the scale itself; a missed or early callback left a wrong scale until a zoom press. And `useMapZoom` did nothing until a region was known, so the zoom buttons did nothing after a fit that got no callback. **Change:** a pure `fittedRegion` (and `distinctPoints`) in `routeLineDash.ts`: Web Mercator, the framed box inside the edge-padded area, the limiting side the height or the width less the buttons' column (`mapPadding.right`), never closer than Google's zoom 21, one place or stops at one address giving the single-point region (`SINGLE_POINT_DELTA`); `fit()` computes it, sets the scale and the zoom buttons' region from it, and calls `animateToRegion` for one distinct place and `fitToCoordinates` otherwise (it called the latter even for a box of no size); the scale is derived from the shown region and the map's height, `onLayout` records the width and height and the fit runs again when the size changes while the driver has not touched the map, and the map's report was meant to override when the driver zooms or pans (**this part was replaced in commit `2acd15e`**: a report arrives late and can put an old scale back; see "Pass 15 and pass 16" below). The map's wrapper has `testID='route-map-frame'`. Tests: 8 for the pure function and 9 for the component (8 failed before). **Pass 15 found the hatch still in 4 of 24 opens; pass 16, after the second fix, none in 126.** The antimeridian is not handled. *Not verified:* the fit against Google's real fit.
2. **The clock time on the route.** Cause: `useRouteFormat.ts` called `openOrderTime(order, utils, t, false)`, hard-coded off. **Change:** one reader, `showsClockTime(theme)` in `PreviousOrders/orderCardTime.ts`, used by `OrderItem` and `useRouteFormat` with the existing `openOrderTime`; the stops screen's next-stop band and the late chips of the rows (now `wrap`) go through it; the map's panel shows no time; the enterprise-plan rule is unchanged. Tests (fail before): the band and a row's late chip with the setting on and off, no time without the plan.
3. **The combined Active tab's skeleton.** Cause (read from the code and the pass numbers): the setter bone did not depend on the buttons but on the tab: `orderCardPieces().setter` was true for `pending` only, and Active (`active`) is another tab key. **Change:** `SETTER_TABS = ['pending', 'active']`, still only when the project orders by position and never on an assign request. **A call for the owner:** in Active offered cards have no position and cards in progress do; the skeleton is now as tall as an offered card, so cards in progress are about 12 dp shorter than it; the other choice moves the mismatch to the offered cards (one string). Tests (fail before): the `orderCardPieces` test and a combined-tab skeleton with the quick actions on and off.
4. **The route entry's slot in the skeleton.** `OrderListSkeleton` takes `routeEntry` and draws a first bone (`testID='order-list-skeleton-route'`, height `button.sizes.md.height`, radius `button.base.radius`) with the list's `md` gap under it; the real button reads its size and look from the new `OrdersRoute/routeEntryLook.ts` (`'md'`, `'outline'`; a file of its own because importing `OrdersRouteEntry` into `shared` would make a cycle); `OrdersOption` passes `routeEntry` only for In Progress with no search and `orders.route` visible; `SkeletonBone` gained an optional `testID`. Cases it cannot know: an empty In Progress takes the slot away with the skeleton; with no stop with a location the entry is not drawn and the first card lands 59 pt higher; a larger button than `md` grows only the real one. Tests: 3 failed before.
5. **Tabs 4 dp too wide at font scale 1.3 on Android: not changed.** Nothing in `Tabs.tsx` is wrong: the three tabs measure 833 px (205 to 1038) and the room is about 822 (205 to 1027.5, the gutter taken off), so `fits` is false and the row scrolls, resting History 4 dp past the cards' edge. Every fix changes a design decision (a smaller padding or label width at large text, or letting the last tab shrink): an option for the owner, not a defect.
**Confirmation on devices: passes 15 and 16, below.**

### Pass 15 and pass 16 (2026-11-23, later): the route's hatch fixed in a second change

**Pass 15, iOS (iPhone 17 simulator, commit `8609b82`; `scratchpad/round14/pass15-ios-report.md`).** **The route's hatch was not fixed by round 14's first change:** 4 of 24 opens were a fine hatch (the whole route; dash 2.1 to 2.4 pt, gap 0.3 to 0.5), against dash 12.2 and gap 7.1 when right: 1 of 6 after a cold launch, 0 of 6 after a database change and a refresh, 2 of 6 on a quick back-and-reopen (open, back after 0.7 s, reopen 0.4 s later), 1 of 4 at the largest text, 0 of 2 with the text size changed while the route was open; each measured early (1 s) and settled (3 s), and a wrong open stayed wrong until a button was pressed. **The Fit button always restored it** (12 of 12 measurements after Fit, a zoom in and Fit again). The zoom buttons worked 0.3 s and 0.6 s after opening from the list; after a cold launch nothing happened at 0.3 s and at 0.6 s and 1.0 s they ended at an in-between zoom (leg 260, dash 11.7, gap 6.7). The absolute time on the stops screen is **OK**: the next-stop band "4 d late · due 06:24PM" (the shared store stop takes 3460's earlier time) and the row chips read like each order's card, the band wrapping to a second line at the largest text and nothing cut; the map panel shows no time. A shared address (3460 and 3457 at 11th Ave) is framed and drawn. **Not reached:** the In Progress skeleton (the cached rows stay on a refresh, a pull or a search, and on a cold launch the notifications dialog blocks the tabs and the data arrives 0.1 s after the screen); a one-stop route (3460, another agent's order, is always in progress); an empty In Progress. History's skeleton showed on its first visit with no route slot, as expected.
**Pass 15, Android (emulator-5554, commit `8609b82`; `pass15-android-report.md`).** The absolute time on the stops screen **OK** (the band "4 d late · due 06:24PM", the chips "07:04PM", "06:24PM", "07:04PM", each as its card, also at 1.3 where the band wraps to two lines and the chips are whole); **In Progress's skeleton starts with a bone at [53,404][1028,520], the exact bounds of the real "Route · N stops" button, and the first real card lands at the first skeleton card's y (583 and 583; skeleton 530 px, real 530)**; the Assigned skeleton starts at y=428 with no bone, and History's has none; the Assigned skeleton is 561 px against 562 (no position) and 531 (with one), a 30 px shift when the list arrives; the route's four buttons (zoom in, zoom out, fit, locate) in sequence and repeated on the blank map did not crash the app (pid unchanged, no FATAL). Regression looked right; the hold on an in-progress card was not tried.
**The cause found from pass 15, fixed in commit `2acd15e` ("the dash scale no longer follows a late map report").** A map's region report is built natively from what the map showed when the event was made and reaches JavaScript later (react-native-maps: `AIRGoogleMap.mm` on iOS, `MapView.java` on Android), so the report of the initial single-point region could arrive after the fit and put its scale back; `isGesture` is not reliable on iOS. **Now** the app's own moves (the fit, the zoom buttons, locate) set the scale from the region they ask for; **one** read of `getMapBoundaries()` confirms it when the move has settled (`settleDelay`: 1 000 ms plus 250 ms, or 250 ms with reduced motion); a region report is only a reason to read the map, ignored while a programmatic move is in flight (the driver's first touch ends that window); and answers that return after a newer move or after unmount are ignored (tickets). Android is unchanged (the scale is unused there). The code agent's whole suite at `2acd15e`: 235 suites and 4 059 tests, `tsc` clean, ESLint 0 errors and 135 warnings, 346 modules and 0 cycles.
**Pass 16, iOS (commit `2acd15e`; `pass16-ios-report.md`): the hatch is gone.** The same 24-open protocol with three measurements per open (about 0.5, 1.5 and 3 s after the tap): **72 of 72 right** (dash 12.2, gap 7.1, the driver's leg 139 pt), none transient; and 18 more opens, 12 quick back-and-reopens and 6 cold launches (the variants that failed in pass 15): **54 of 54 right**. The zoom buttons work from 0.6 s after the open tap (a tap at 0.3 s does nothing: the screen is still sliding in), zoom out the same, a zoom after a cold launch the same, and a later zoom always gives a leg of 293 pt with right dashes (the step changed from 316 in passes 14 and 15; a different zoom level, not a pattern error); Fit after a manual zoom (in twice and out twice) is right; a pan (early and later, and after zooming) keeps the dashes right on every visible leg; the locate button gives dashes about 3 % short (11.8 and 6.7, leg 251) that are right again after Fit; a 10 s background on the route and the return are right at 1 s and 3 s, and a zoom and Fit after the return too. The route's regression is OK (the panel, the Navigate sheet with Google Maps and Apple Maps, a short tap on the step showing "Hold to confirm" with no request, "See all stops"). **Not reached:** a pinch (the tool has no two-finger gesture) and the route's map on Android (the map key); a pan frame that measures the driver's leg when the route had left the view (the visible legs were measured instead). The tool's first attempt at one open did not change the text size and was redone.

### Not verified

By name, so nobody takes it as seen:

- **What the passes saw.** The first pass saw nothing of this redesign on iOS; the second walked the flow on the
  simulator and the emulator; the third confirmed its fixes on both; the fourth checks confirmed the second round's, the
  iOS one on 2026-11-18 and the Android one on 2026-11-19 (which found the Information bar's defect, fixed and measured
  the same day); the fourth round (2026-11-19) saw the screens left unseen, the phone login and the sockets on both; the final passes
  (one per platform, board by board against the mockups) found and fixed 19 differences and confirmed each on the
  platform named; the fifth round saw the native headers on both, the two send options on both and the tracking events
  end to end on Android and in part on iOS; the sixth round's fixes were tested in code, seen on the iOS simulator (the review fixes and the list fix, item by item) and in part on
  the Android emulator (its pass stopped early when the emulator fell into a restart loop), and its API fixes by the API's own test stack; the seventh round (2026-11-20) finished the Android pass in three runs (the group sheet, the dialog, two fingers with emulated touches, the second hold and the offline queue with its list, its marks and its position, each fix checked in the next run), fixed what it found, built the queue's retries and refusal toasts (Jest only, no device run yet) and the API's retention (the API's own test stack). The eighth round (2026-11-20, later) removed the 31 require cycles (seen on Android only, one run) and redrew the order card: its first build was seen by two passes (iOS simulator and Android emulator), and the fixes of the nine defects they found are tested in Jest only, with no device run after them. The ninth round (2026-11-23) redrew the card again as the status band, fixed the tests' time limits (CI green on `494bf7e` but the publish dry run) and the tabs' flicker, all in code and Jest, none seen on a device when it was written. The keyboard rule's fix and the identifiers' rename were looked at on Android;
  on iOS the accept sheet and the rename were looked at, the keyboard rule's change is the bare view and was not run
  again.
- **Android 14 and earlier, and 15 with the opt-out of `styles.xml`**: Home's native change (the content under the bars)
  was not seen there; by reading, nothing changes ([core-upgrade.md](../deps/core-upgrade.md) §3.4).
- **The API facts against production**: the three the code relies on (the list's `business.address` /
  `customer.address`, the list's `unread_count`, and `{"photo": ""}` removing the photo) were seen against the local API
  only (the device pass above), with the local copy of api-core.
- **The submodule's pointer is not moved**: the additive `handleRemovePhoto` of `UserFormDetails` (and its tests) is a pushed
  branch of ordering-components with a draft pull request, Finitless-com/ordering-components#426. When this was written the commit this repository
  recorded was `5af6bea` and the working copy had the branch checked out (`ede30be`). **#426 was merged on 2026-11-23 (merge commit `69168c1`) and the pointer was moved, with the socket fixes, to `425587a` (commit `2389e8d`).** Until it moved the pinned commit lacked the function (the earlier text of the pull request says the option "Remove photo" is then not shown; this was
  not run against the pinned commit in this round).
- **The holds**: that a held button fires after 0.6 s on a real finger, that the screen reader's dialog replaces it, that
  reduced motion makes the fill step. The primitive has a suite (`shared/__tests__/HoldToConfirm.test.tsx`, with the helper
  `jest/helpers/holdPress.js`, and `holdLatch.test.tsx`); on the emulator only the tap's hint and the fill of an unfinished hold
  were seen before the fifth round. In the fifth round the follow-up touch after a completed hold was seen on iOS (187 touches, 2
  missed, not attributed to the hold: see "Fifth round"); not seen: a real finger, reduced motion, VoiceOver, and Android after
  the latch. The sixth round changed how the hold is judged (the two touches' timestamps, a second finger, a stale latch): on a device a short tap, a
  hold of 0.7 to 0.9 s and a swipe from the button were seen (iOS and Android); **two fingers on one button** were seen in the seventh round on
  the Android emulator only, with multitouch events sent through the emulator's console (one PUT; a real finger and iOS are not seen). **On the order card's buttons the same test failed in the eighth round's pass** (no PUT, the order opened: the buttons were inside the card's pressable); the fix (the `footer` of `OCard`) is tested in Jest only, which has no responder system.
- **The theme's new identity on a served theme**: the defaults were set to the mockups, but no served theme with another
  Identity (rounded, shadowed) was looked at after the second pass; `pnpm theme:extremes` (it passes) is the only check
  of that.
- **Open items** (2026-11-23, after the ninth round). Closed by the fourth round: the delivery sheet's PIN and comment field over
  the keyboard, the Accept / Reject page opened from a group in the list, the new-order alert and live updates, the Release
  builds (made, not installed). Closed by the final passes: the sizes round, the group titles and the failed-save notice (seen
  on both platforms), the status photo's sheets on Android, and the 19 differences listed above. Closed by the fifth round: the
  native headers and the two send options on both platforms, the tracking events on Android end to end. The sixth round fixed what three reviews found and tested it in code, and its device passes (iOS in full, Android in part)
  confirmed the headers, the single submit, the dialogs, the hold, the reason rows and the list fix; what they did not reach is below. Closed by the seventh round, on the Android
  emulator: the group accept sheet and its title, the confirmation dialog, a second hold right after a completed hold, two fingers on a held button (emulated touches), and
  the offline queue on a device (the accept with its position, a group's step through the confirmation, the list and its marks offline and after the sync, one list load after
  the sync, the "No connection" hint with the queue off); and, by the owner's decisions of 2026-11-20, the alert's rhythm (kept), the success toast (none) and a retention for
  `tracking_events` (built, off by default). Still open:
  - **Not named by the final passes' reports, so not claimed:** the accept sheet over the requests tab and over the request's
    details, the dialog naming the group, and the iOS permission texts in a build.
  - **Not reached in the final passes:** the new-order alert (seen in the sockets passes only), MapPending, Payouts and Stripe,
    ScheduleBlocked, Remove account's second step, a photo taken on iOS, the code screen with a floating keyboard, "Remove photo"
    over the profile sheet on Android, a logistic request's details with a real request on Android, tutorial pages 2 to 5 on
    Android, the map's tiles.
  - **Not seen in the fifth round:** the hold on a real finger, with reduced motion, with VoiceOver, and on Android after the
    latch; the device id surviving a reinstall on iOS; a Release build of the native changes; the Builder's package rename with
    the fixed package `co.ordering.app`; a clean stop of tracking (`unavailable`, `logout`, `schedule`, `session_revoked`); the
    4xx drop and the 401 paths against a live API (unit tests only); Location Services off globally, Low Power Mode and a real
    connection loss on iOS; the background with the screen locked; Android 10 for "While Using"; a real phone (a real iOS kills the
    app when the authorization changes in Settings).
  - **Not seen in the sixth round** (the device pass above says why; the block lists what each check should look at; the group accept sheet, the
    confirmation dialog, two fingers and the offline queue on Android were seen in the seventh round, below): on Android, the 401 guard, the single worker and the
    reasons (they need a sign-out); on both, the new-order alert and the alert's sound and rhythm (no sockets server), a request to a third-party host without
    the id (unit tests only), a group status that requires a photo or the location (the local project requires none), the assign
    request's details path of the list fix (tests only), a dialog whose screen is left behind, and the offline queue on iOS; on iOS, the
    events after a failed position request, the restart after an offline session, the first launch before the first unlock; the marker
    image of the map tab (no tiles locally); the `DeviceIdReader` harness is outside the repository; the API's fixes against production
    (PostgreSQL 14, the log channel, Octane) and the Dashboard consuming the one packet.
  - **Not seen in the seventh round** (the block above says why): on iOS, every offline item (the simulator cannot cut its network); on a real phone,
    the offline queue with the project's config on and a real network loss; the retries (15 s, 30 s, 1 min, then 2 min; the foreground), the refusal toasts, the
    drop at the third refusal, the banner as the count alone and a refused change keeping its mark (Jest only: no device run after the third fix pass); a refusal
    other than "Driver location is outdated", a 5xx and a timeout against the schedule; the assign request's path offline; the chat message of earlier changes
    told once; TalkBack reading an off button as disabled and the hint with it; the PUT's body; a search applied offline (the controller still loads); a tab
    never visited offline; Android throttling the retry timer in the background; D2's trigger and D4's mechanism (inferred); the API's retention on a large
    table, its index migration on a large project and on the local `development` database, and the scheduler on a real server.
  - **Not seen in the eighth round** (the block above says why; **the fixes F1 to F9 and the two settings were seen on the devices on 2026-11-23, on the D1b layout: the paragraph "Device confirmation of the card's fixes" says what, and the next bullet what still holds after the band**; what follows is what that paragraph does not claim, as written before it): **the fixes F1 to F9 of the order card on any device** (Jest only then: the second finger on a card's button
    on Android, the first tap after a held step on iOS, the compact time column and the 40% width on a 360 dp phone, the distance's position kept and read again, the rows kept
    while a list reloads, the offline switch following the config, "Delivery failed"); **`orders.quick_actions` off and `orders.absolute_time` on** (never tried on a device: the
    passes were told not to change a theme); **an assign request's card and its footer with Accept / Reject**; an order **in time** (the ordinary ink); the card with **VoiceOver or
    TalkBack**, on **a real phone**, **at 360 dp**, in **another locale** (Italian, German, a right-to-left one) and **in another time zone** (the clock time of a finished order); the offline
    card on iOS; the permission revoked on the card; the PIN and photo sheets from the card (config 721 is off locally); the card at six or more rows and how its skeleton's bones compare
    with it; the payload fields (`payment_events`, `products`, `summary.total`, `reporting_data`, the stops' `location`) on a real project. The require cycles were checked on Android only.
  - **What the eighth round's device confirmations still hold for, after the change to the band (2026-11-23).** The eighth round's device passes saw the D1b layout, which the band replaced; what they saw of the **layout**
    (the time column and its 40% width and the figures "+12 h", "+2 d" in it, the status chip beside the total, "late · due 07:04PM" under the figure, the wider column cutting the customer's name, the distance's wider gap, F3) **no
    longer describes the card**. What stands because the code behind it did not change in the ninth round: **two fingers on the card's button and the single-finger cases** (the quick actions are still the card's `footer`, outside its pressable), **the first tap after a held step** (F2) and
    **the rows kept while a list reloads** (F6), **per-order busy** (F5), **the list's driver position** (F7), **the offline switch and the two offline cases** (F8), **"Delivery failed"** (F9), the
    held steps and the group's rows without buttons; the address and the distance as two texts (F4) hold in the code, but the stop line sits under a new header and was not looked at again. `orders.quick_actions` off was seen on the D1b card and its code is unchanged; **`orders.absolute_time` on was seen as a second line under the
    figure: on the band it is a suffix of the status band's text, which no device has seen.**
  - **Not seen in the ninth round** (the block above says why): the **status band on any device** (its wrap layout in Yoga and at the largest font, its touch area and rounded corners on Android, the tones, the finished orders' bands, the
    contrast of its texts, a dark or high-contrast theme); **the order types' colours** and "Delivery #N" (pressable, 44 to the touch, inert at status 23) on a device; the details' "Delivery #N" in the type's colour; **the tabs** (a cold start online and offline, a switch changed on the server, a fresh install, the held bar's look) and the real `OrderListGroups`
    controller with the new `combineTabs`; the composed time phrases read by a native speaker; an assign request's card and its footer (still none locally).
  - **Left by the ninth round, known:** a project with three tabs, nothing stored, opened offline and then online draws four and then three; `NewOrderNotification` reads the config itself for its requests button; the Dashboard branch still holds
    the labels of `BUILDER_THEME_SLOT_POSITION` (no schema names it) and of `BUILDER_THEME_PROP_TIMER_ICON_SIZE` (the business app's schema still does); German "24 min übrig" is less idiomatic than "noch 24 min"; the order type's label
    still says "Delivery" for a type the app does not know, which now draws a grey chip.
  - **Left by the eighth round, known:** the offline "Last Update" banner pushes the list down about 150 px when the connection drops (a tap aimed at a button can land on the card's
    body); the details' bottom bar at status 8 offers three buttons where the card offers one (not checked against the bar's rules); the `orders.date` label still says "Date" though it
    now controls only the clock time of an order that is over and a group's date (a rename was proposed, not made); the Dashboard branch still holds the label
    `BUILDER_THEME_PROP_TIMER_ICON_SIZE`, which the schema no longer names; the 55 new catalog strings of the card (`CARD_TIME_LEFT`, `CARD_TIME_LATE`, `CARD_TIME_DUE`, `PAID`, `TIME_DAY`
    in 11 locales) are read by no native speaker; the lint rule does not forbid a relative path to the barrel (`lint:cycles` would).
  - **Left by the sixth round, known:** the controller's whole-list snapshots and its missing multipart handler (upstream, the
    submodule); the delivery-time sheet's offline path (not checked on a device); `Handler.php` line 144 (older than this work); the catalog's
    unread "business" texts and the Arabic plural, which no native speaker has read; the list's own save of a request's delivery time not
    reloading the list, and a row tapped during a reload opening a slightly old snapshot; wrapped badges on a narrow row. **Closed by the
    seventh round:** `syncChanges` writing the queue from its own snapshot (`applyRunResults`), the alert's rhythm (the owner kept it),
    `tracking_events` with no retention (built; off until `TRACKING_EVENTS_PRUNE_ENABLED` is set after the deploy), "no success toast",
    "Group No.57" without a space and silent off buttons offline.
  - **Left by rounds 10 to 12, known:** everything of the route, the connection pill and sheet, the switch, the Messages rows, the accept sheet's typing endings and the offline lists fix **on a device** (pass 12 saw most of it; what it did not reach is in its "Not reached" list and its open items, and the three theme settings and a combined project were seen in pass 14); what pass 11 could not reach (its "Not reached" list above); the real `OrderListGroups` controller in the tabs' tests of rounds 10 and 11 (a stand-in copied from reading the code; round 12 B ran the real one in `OrdersOptionNetwork.test.tsx`);
    the pull to refresh that sent no request; the `-100%` margin and the clipped row of the sheet's reserved line in Yoga; the 10 s window of the two reconnect signals (a guess); the pill's width at 320 pt and at the largest text (`ONavbar` does not protect the title); `getApps`' real answers and the maps apps opening from the route's links; the route under a served theme that hides `business_map.recenter` or `map.zoom_controls`;
    the translations of the route's 28 keys, the connection sheet's 14, the minutes' seven and the six tabs' texts (no native speaker has read them; `MINUTES` reads as meeting minutes in da, nl and el, `DELIVERY_TIME` as a time of day in eight locales); the five catalog keys removed against the catalog tool's keep-orphans policy; a project that combines the tabs, on a device, with the two settings of the card; the Dashboard side of the 12 labels
    and, for the components library's pull requests, what pass 13 did not reach (a real socket drop, multi-project builds, a signed build; see the sockets audit above); the findings of the sockets audit that stay open (7, 8, 10, 11 and the two copies of the same defects in customer apps and the dashboard).
  - **Left by the seventh round, known:** the sync does not start from a validated network that is not the system's default (a call of the
    coordinator, with its reason); a change the API refuses is dropped at the third refusal (the owner's decision), with only the last queued
    change's body sent per order and the earlier ones told as one chat message; the retry timer is JavaScript's; the controller's own load of
    the requests on a tab selection cannot be guarded offline without editing the submodule (the display rule covers it); `getOfflineActionsAfterReplay`
    is unused (left, with its tests); `INVOICE_GROUP_NO` stays in the catalog unread; the `DISABLED_*` and `NUMBER_CHANGES_PENDING_SYNC` texts are unread by a native speaker;
    the production APK for the owner's phone waits for the project's name (a decision).
  - **From the earlier rounds:** Home's project field (`use_root_point` off locally); a phone without a home indicator under a
    sheet or a bar; an archive, signing with a real profile and a real push with the identifier `co.ordering.delivery`; the sound of
    the alert heard; the reconnect's wait and the foreground rule on a device; the group's orders count in the alert; another
    language on a device; a real phone login and a code actually sent; 320 pt wide on iOS; Android 14 and earlier; a real phone.
  - **Outside the repository:** the registrations of HANDOVER.md, the GitHub secrets of the schema publish, the
    merge of the pull requests that are still open (the Dashboard's #574, this app's #1, api-core#3882 and api-core#3898, whose three commits must be deployed, migrated, before any app build
    that records events; its retention is switched on only after the deploy, the migration and one `--dry-run`) and `pnpm i18n:sync` to the API for the new catalog keys (the workflow runs it). The local API's queue
    workers do not run (their container restarts on a missing PHP class) and it must run with `USE_SLACK=false` (its error
    notifications point at shared channels otherwise); React Native DevTools and Fast Refresh may lose their connection: relaunch
    the app, never wait. These are limits of the local setup, not of the app.
- **Open items of the design**, known and not fixed: the outline neutral button's grey line needs a role of the engine; the
  four sizes left on purpose ([THEMING.md](../THEMING.md) section 9); the realtime items the fourth round left as they are
  (above). Phone login is reachable since the fourth round (a tab).
  (The unread count going stale after a chat is read from the order's details was fixed in this round: the Messages list
  listens to `order_message_read`.)
- **Everything the sections above list as not seen** that this redesign touched again: a served theme and the extreme themes
  on a device, right to left, the system's largest text, a 320 pt phone, and every screen at a larger font.
- **Translations**: the 34 new texts of the first round are in the 11 locales and the 39 keys of the fourth round are in the
  catalog with all 12 languages of the file; `pnpm i18n:verify` passed at the end of the third round and is at the end of the
  fourth in the checks line below. No native speaker has read them; neither the editor labels added to the Dashboard's branch
  (eight, seven and eleven in its three commits, pushed, draft pull request #574, the seven of the eighth round, pushed in a fourth commit, the five of the ninth and the twelve of round 12, pushed in the branch's last commit `2c0de628e`), nor the 181 weekday strings corrected in the
  second round (the owner kept all of them on 2026-11-19), nor the 55 strings of the order card (five keys in 11 locales).

Checks at the end of the first round (the second round's counts are not recorded on this page), on the whole tree: `tsc --noEmit` clean, `eslint .` 0 errors (143 warnings), Jest 170
suites and 2 383 tests green, `theme:validate`, `theme:verify`, `theme:keys`, `theme:guard` (0 literals),
`theme:extremes`, `i18n:verify` and `i18n:check-generated` pass.

Checks at the end of the third round (2026-11-19, on the whole tree, after the keyboard rule, the sheet's rule and the new identifiers): `tsc --noEmit` clean, `eslint .` 0 errors (141 warnings), Jest 180 suites and 2 596 tests green, `theme:validate`, `theme:verify`, `theme:keys`, `theme:guard` (0 literals), `theme:extremes`, `i18n:verify` and `i18n:check-generated` pass. The Kotlin and Swift location tests were not run again in this round (their sources only moved package on Android).

Checks at the end of the fourth round, on the whole tree before its commit: tsc clean, eslint 0 errors (144 warnings), Jest 193 suites and 2 970 tests green, theme:validate, verify, keys, guard (0 literals) and extremes, i18n:verify and i18n:check-generated pass.

Checks at the end of the fifth round: not run separately; the sixth round's run above covers the same tree.
