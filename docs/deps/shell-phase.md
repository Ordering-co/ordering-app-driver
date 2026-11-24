# Native shell phase: bootsplash, reCAPTCHA, config reader, icons, map-link, country data

Date: 2026-11-13. Branch `feature/theming-native`. It does the native-shell part of
[DEPENDENCIES_PLAN.md](../DEPENDENCIES_PLAN.md) (phases 3 and 7) from the research in
[push-and-shell.md](push-and-shell.md) §5 to §9 and
[location-and-libraries.md](location-and-libraries.md) §3.1, §3.2 and §3.8, after the push stack ran
once on the simulator and the emulator ([push-phase.md](push-phase.md) §10). Where the research and what
the code showed differ, this page says so ("Reality").

## 1. Versions

| Library | Before | After | Patch |
|---|---|---|---|
| `react-native-splash-screen` | 3.3.0 | removed; `react-native-bootsplash` **^7.3.5** (7.3.5) | its interim patch removed |
| `@fatnlazycat/react-native-recaptcha-v3` | ^1.0.3 | removed; the app's `RecaptchaV3` on `react-native-webview` ^14.0.1 | |
| `react-native-recaptcha-that-works` | ^1.2.0 (1.3.2) | unchanged (the research: stay; 2.0.0 only renames a type) | |
| `rn-config-reader` | 5.1.3 | removed; the app's `AppStrings` module (Kotlin, about 25 lines) | its interim patch removed |
| `react-native-vector-icons` | 10.3.0 (deprecated) | `@react-native-vector-icons/ionicons` and `/material-design-icons` **14.0.0** | |
| `react-native-map-link` | 2.11.4 | **3.15.0** | |
| `react-native-country-picker-modal` | 2.0.0 | removed; the app's `countries.ts` (static data) | |
| `react-native-restart` | ^0.0.29 | unchanged (already there) | |
| `@sentry/react-native` | 8.33.0 | **8.35.0** (the research's pick; Android pulls `sentry-android` 8.64.0) | |

Interim patches left: **one**, `react-native-notify-kit@9.7.0` (its Gradle script refuses any JDK but
8/11/17/21; Android Studio ships 25). It stays while that script does. `pnpm-workspace.yaml`
`patchedDependencies` lists only it.

## 2. Bootsplash

See [SPLASH.md](../SPLASH.md) for the files, the wiring and how to regenerate. What this run found:

> **Superseded on 2026-11-23 (the owner: "the splash logo is square"):** the 798 x 180 wordmark, the 250 pt and 180 dp widths and the one wordmark file described below were replaced by a square logo, 120 pt / 120 dp, made from `assets/bootsplash/logo-source.png`. What follows is the record of the first run.

- **Source of the logo**: the 798 x 180 wordmark of the old iOS launch image, now
  `src/assets/images/launch-logo.png`, which the JS loading page also draws (one file, no platform branch).
- **Android cannot take the old width.** The generator refuses a logo wider than 192 dp ("will be cropped by
  Android", Android 12+ masks the splash icon to a 192 dp circle) and warns above 134 dp. The old Android
  launch screen drew the wordmark about 297 dp wide (a full-screen image); the new one draws it 180 dp wide (its
  diagonal fits the circle), and it is not cropped on the API 37 emulator. iOS keeps 250 pt. Both are now centred:
  the old iOS splash sat about 24 pt above the centre.
- **The generator's output was not kept as is**: hashed names, a reformatted `AndroidManifest.xml` (a 180-line
  diff for one theme name), a named-colour catalogue. Fixed names, a literal white `<color>` in the storyboard
  and a one-line manifest change were put back by hand (SPLASH.md "Regenerating with the CLI").
- `ios/project.pbxproj` was edited with the `xcodeproj` gem (the old storyboard out, `BootSplash.storyboard`
  in), not by the CLI. `LaunchScreen.storyboard`, which nothing referenced, is gone.
- (Since 2026-11-23 the hide is `useSplashHide`, after the first screen is painted: docs/SPLASH.md.) One hide, in `DeliveryApp`, after the cached theme is read, on both platforms (before: iOS only; on Android
  the loading page hid the native splash once its image loaded). The loading page no longer hides anything and
  the iOS frame constants (393 x 852, 76/362/250/80), the Android `measureInWindow` offset and the 5 s timer
  went with it.

## 3. reCAPTCHA

`RecaptchaV3` (`src/ui/src/components/RecaptchaV3`, copied from the marketplace app) replaces the v3 library:
a WebView loads Google's script on the project's `security_recaptcha_base_url`, runs `grecaptcha.execute` once
and posts the token (or an error, which never reaches `onExecute` as a token). `LoginForm` passes the same
props minus `reCaptchaType`. The v2 checkbox (`react-native-recaptcha-that-works`) is untouched. `jest/setup.js`
mocks the WebView once. Tests: the component's (page shape, escaping, messages, links) and two in `LoginForm`
(v3 on: the WebView on the base URL and the token reaches `handleReCaptcha`; off: no WebView).

Not seen: a real v3 token. The local project has `security_recaptcha_auth = 0` and no v3 key; a token needs a
site key registered for a real origin. Login with reCAPTCHA off was run on both devices (no WebView, same as
before).

## 4. rn-config-reader

Reality: as the research said, it read two strings, only used by Android's location permission rationale.
`AppStrings.kt` returns them from `strings.xml` (the placeholders stay there, for the Builder; the
`export_variables` array only the library read is gone). `src/navigators/locationRationale.ts` keeps the
defaults for iOS and for unreplaced placeholders (4 tests). `RootNavigator` calls it.

## 5. Icons

One importer, `shared/Icon.tsx`, now `@react-native-vector-icons/ionicons/static` and
`/material-design-icons/static`. **Glyph check by script** (every string literal in `src`, outside the logic
submodule and the tests, plus `product.schema.json`, tested against the old and new glyph maps): Ionicons
1338 names before, 1357 after, 0 removed; Material Design Icons 7448 after, 19 of the old 6596 removed
upstream, none used; 79 literals are Ionicons names and 95 are MDI names, **0 missing**; the 46 names passed
as `name` / `icon` props are all present. No icon name is built from a template string. Fonts: both packages
autolink on Android (`copyFonts`) and ship as pod resources on iOS; the built apps hold `Ionicons.ttf` and
`MaterialDesignIcons.ttf`. `Info.plist` `UIAppFonts` lists `MaterialDesignIcons.ttf` in place of
`MaterialCommunityIcons.ttf`. The manual Gradle project and `fonts.gradle` are gone.

`android.newDsl=false`: **still needed**. `-Pandroid.newDsl=true` fails to configure `:app` with "Failed to apply
plugin 'org.jetbrains.kotlin.android'" (the plugin casts the new extension to `BaseExtension`); that was one of the
two reasons CLAUDE.md gave, and the other one (`fonts.gradle`) is gone. Moving to AGP's built-in Kotlin
(`android.builtInKotlin=true` and dropping the plugin from `app/build.gradle`) would be the way out: not tried.

## 6. map-link 3 and the countries

- `react-native-map-link` 3.15.0: the same `getApps` call and result (`id`, `name`, `icon`, `open`). The driver
  map's "Show in other maps" sheet lists Apple Maps and Google Maps on the simulator and Google Maps on the
  emulator (only the installed ones).
- `react-native-country-picker-modal`: **replaced by data, not bumped**; the research's analysis held. The
  phone field only called `getAllCountries(FlagType.EMOJI, 'common')` and read `cca2`, `name` and `callingCode`.
  `src/ui/src/components/PhoneInputNumber/countries.ts` has the same 250 rows (the library's English common
  names and calling codes, sorted by name; Vatican City's `3906698` is the library's own value). The countries
  are there at the first render now (no async load). A test checks the file against libphonenumber-js.
  Names are English only, as before.

## 7. Restart and Sentry

`react-native-restart` was already ^0.0.29 (a TurboModule). Sentry 8.35.0: `sentry-android` 8.64.0 was not in
the offline Gradle cache, so the Android build needs the network once.

## 8. What was seen on the devices

Debug builds against Metro and the local API, as the test driver; screens in
`.theme-audit/screens/shell/{ios,android}/` (git-ignored).

| Check | iOS simulator (iPhone 17) | Android emulator (API 37) |
|---|---|---|
| Cold start, before / after | `before-cold-1.png`: the wordmark about 24 pt above the centre, 250 pt; `t3.png` (mid-fade): centred, 250 pt, white | `before-cold-5.png`: white system splash, then the wordmark about 297 dp wide; `t3.png`: the logo centred, 180 dp, on white; held while the dev bundle downloads (`t8.png`). The six `after-cold-*.png` frames are white with no logo (a run that was not explained); the coordinator repeated the cold start afterwards, from the launcher and with `am start -n`, eight and six frames: the logo is there from the first frame of the app's window in both |
| First frame | `after-first-frame.png`: the welcome screen | `after-first-frame.png`: the welcome screen |
| Login, reCAPTCHA off | `f-01-login.png`: email and password, the eye icon; sign-in works | `f-01-login.png`; sign-in works |
| Orders | `f-02-orders.png`: header, tab and card icons paint | `f-02-orders.png` |
| An order's details | `f-03-order-details.png`: back, map, chat and chevron icons | `f-03-order-details.png` |
| The driver map and its maps sheet | `f-05-driver-map.png`, `f-06-maps-sheet.png`: the sheet lists Apple Maps and Google Maps with their icons | `f-04-driver-map.png`, `f-05-maps-sheet.png`: Google Maps |
| The map tab | `f-04-map.png`: the map (tiles blank on iOS: `AppDelegate` still holds the key placeholder the Builder replaces), the app's own zoom buttons; the permission gate (`RequestPermissions`) shows until the location is "Always" | `f-06-map-tab.png`: the map with the zoom buttons. It stays blank when the Location Accuracy dialog is answered "No thanks" (`useLocation` asks for the position once at mount): answer "Turn on" |
| Profile | `f-07-profile.png` | `f-07-profile.png` |
| Logout | `f-08-after-logout.png`; `POST /auth/logout` 200, the token row is gone | `f-08-after-logout.png`; the same |

Things that looked like defects and were not: a blank Android map tab (the dialog above), an iOS blank map tile layer
(the key placeholder), the "Open debugger to view warnings" toast of the dev build (it swallows taps at the bottom of
the screen; close it first), and `adb shell input text` containing two `r` in a row while no field has focus, which
reloads a Debug build (the dev menu shortcut).

## 9. What was run

See the report of the phase for the tails of the checks. Device screens: `.theme-audit/screens/shell/{ios,android}/`
(git-ignored): `before-*`/`after-*` are the cold start before and after bootsplash, `p0-*` the push run, `f-*`
the final pass (login, orders, an order, the driver map and its maps sheet, the map tab, the profile).
