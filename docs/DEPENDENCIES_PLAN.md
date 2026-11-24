# Dependency upgrade plan — React Native and libraries

Date: 2026-11-13 · Status: **approved** (decisions U1–U6, §6); phases 1 and 2 are done (they
were part of the theme conversion, see "Done so far"); the rest runs before the theme's
device verification. Branch
`feature/theming-native`.

Sources: `package.json` and `node_modules` of this repository against the npm registry
(`npm view <pkg>@latest`, read on 2026-11-13), the importers of each dependency in `src`
and in the logic submodule (counted by script, after the dead code of
[theme/decisions.md](theme/decisions.md) D1 was deleted), and the same upgrade already
made in the sister app (`ordering-app-marketplace-theming`: commits `74f43cf`,
`chore/deps-phase-1..3`, `feat/onesignal-5`, `chore/pnpm`).

## Done so far (2026-11-13, with the theme conversion)

72 runtime dependencies are now 44. What was done, and where it differs from §2 below
(which is kept as it was written, for the record):

- **§2.1, done:** every library nothing imported is removed (commit `786f25d`), and the
  pods without them (`d79281b`). `uuid@3.4.0` became a dependency of its own: the logic
  submodule imports it and it only arrived through a removed library.
- **§2.2, done**, with these differences:
  - the code entry is the app's own `OOtpInput`, not `react-native-otp-entry`: no OTP
    library is left;
  - `react-native-vector-icons` 10 (deprecated) **stays**, reduced to two families
    (Ionicons, MaterialCommunityIcons, decision D5). Its move to
    `@react-native-vector-icons/*` 14 is still to do: phase 3;
  - `react-native-map-link` stays at 2.x (the app draws its list in its own sheet) and
    `react-native-country-picker-modal` at 2.x (data only): their upgrades are phase 3.
- **Not in the plan: `react-native-fast-image` is removed, not upgraded.** Store logos
  and photos are drawn by the app's `OAvatar` on React Native's `Image`, which keeps
  the platform's HTTP cache but not FastImage's immutable disk cache. Its effect on
  iOS (logos fetched or decoded again when a list remounts) is not measured:
  [PERFORMANCE.md](PERFORMANCE.md). If it shows, the options are `expo-image` or
  FastImage's maintained fork, behind `OAvatar` only.

- **Core upgrade, done (2026-11-13, `docs/deps/core-upgrade.md`):** React Native 0.88.1,
  React 19.3.0 and the new architecture on Android; Gradle 9.4.1, AGP 9, Kotlin 2.2.0,
  compile SDK 37; the libraries that cannot stay (gesture-handler 2.33.1, screens, safe-area,
  maps 1.29.11, webview 14, permissions, device-info 15, image-picker 8, restart 0.0.29,
  sentry 8.33.0). Differences from the research: Firebase stays on 23.8.8 (it builds and runs
  on 0.88 on both platforms, so D1's 26.4.1 is left to the push phase); `@react-navigation/stack`
  6.4.1 and `react-native-sound-player` 0.13.4 (hard-coded compile SDK 31: the debug build passes, the release build fails its AAR metadata check) needed two more interim patches (`patches/`); the stack one: its `Card` used `InteractionManager`,
  removed in 0.87, and showed a red screen at the first transition. Navigation 6 and
  react-hook-form 6 otherwise run on 0.88 and the new architecture. The notification
  service extension no longer copies the font files. The interim patches (onesignal,
  splash-screen, rn-config-reader, stack) go away with their libraries.
- **Phase 4, push, done in code (branch `upgrade/push`, `docs/deps/push-phase.md`):**
  OneSignal 5.5.17 (the calls in `src/navigators/oneSignalPush.ts`, the Android and iOS notification
  extensions rewritten), Firebase ^26.4.1, `react-native-notify-kit` 9.7.0 (+ the sister app's JDK patch)
  instead of notifee, `react-native-sound-player` 0.14.5; the OneSignal 4 and sound-player interim patches are
  gone. Built on both platforms; not seen on a device: the owner's test list is in that page.

- **Native shell (phases 3 and 7), done in code and run on the iOS simulator and the Android emulator
  (`docs/deps/shell-phase.md`):** `react-native-bootsplash` 7.3.5 (`docs/SPLASH.md`) instead of
  `react-native-splash-screen`; reCAPTCHA v3 on the app's `RecaptchaV3` (WebView) instead of
  `@fatnlazycat/react-native-recaptcha-v3`; the app's `AppStrings` Kotlin module instead of `rn-config-reader`;
  `@react-native-vector-icons/ionicons` + `/material-design-icons` 14.0.0; `react-native-map-link` 3.15.0; the
  phone field's countries as the app's own `countries.ts` (the country-picker library removed); Sentry 8.35.0.
  The splash, config-reader and OneSignal 4 interim patches are gone: the only patch left is notify-kit's.

So the first phase to run is **0** (research) and then **3**.

## 1. Where the app is

| | Today | Latest | Sister app (proven) |
|---|---|---|---|
| React Native | 0.81.1 | 0.88.1 | 0.88.1 |
| React | 19.1.0 | 19.3.1 | 19.3.0 |
| Architecture | iOS new, **Android old** (`newArchEnabled=false`) | new only | new on both |
| Gradle / Kotlin / compileSdk | 8.14.3 / 2.1.20 / 36 | — | 9.4.1 / 2.2.0 / 37 |
| JDK to build Android | 17 (fails with Android Studio's JDK 25) | — | 25 |
| Node | ≥ 22 (the theme engine requires it; it was ≥ 20) | — | ≥ 22.13 |
| Package manager | Yarn 1 (`BUILD_CRA.txt` marker) | — | pnpm 12 (`BUILD_PNPM.txt` marker) |

Of the 72 runtime dependencies: 17 are removed because nothing imports them (§2.1), 13
are libraries already replaced by decision of the theme conversion (D2 / D5, §2.2), 8 are
unmaintained or in maintenance mode (§2.3), and most of the rest are behind by one to
five majors (§2.4).

**Rule of the plan:** take the versions the sister app already runs on React Native 0.88.1
with the new architecture, under the same Builder, instead of "the latest of everything".
Go past them only where this app has a library the sister app does not (background
location, sound, signature, the config reader).

## 2. Every dependency, by what happens to it

### 2.1 Remove: nothing imports it (phase 1)

`react-native-elements`, `react-native-picker-select`, `react-native-awesome-loading`,
`react-native-swipe-gestures`, `toggle-react-native`, `styled-system`,
`@react-navigation/drawer` (5.x beside navigation 6), `react-native-maps-directions`,
`react-native-background-timer`, `react-native-geocoding`,
`react-native-intersection-observer`, `react-native-print`, `react-native-html-to-pdf`,
`@types/react-native-html-to-pdf`, `@types/react-native-loading-spinner-overlay`
(deprecated stub), `@react-native-documents/picker` (its only user, the chat's file
attach, was dead code), `postinstall-postinstall`.

Kept although no JS imports them, to confirm one by one: `@react-native-firebase/app` and
`crashlytics` (native only), `react-native-screens` (navigation's peer),
`react-native-webview` (peer of the reCAPTCHA and signature libraries),
`react-native-background-fetch` (companion of background geolocation 4), `prop-types`,
`decimal.js`, `libphonenumber-js`, `socket.io-client` (the submodule's).

### 2.2 Replace with the app's own primitive: already decided (theme D2 / D5, phase 2)

| Library | Last publish | Importers | Becomes |
|---|---|---|---|
| `react-native-gifted-chat` 2.1.0 | active (3.5.0) | 1 | the app's chat thread (ported from the sister app) |
| `react-native-app-intro-slider` | 2022 | 1 | the app's pager |
| `react-native-phone-number-input` | 2022 | 1 | an input with a country select; `react-native-country-picker-modal` 2 → 3 only for its data |
| `@twotalltotems/react-native-otp-input` | 2022 | 2 | `react-native-otp-entry` (takes styles), as the sister app |
| `react-native-select-dropdown` 1.13 | 2024 | 2 | `OSelect` (a sheet) |
| `react-native-calendar-picker` 7 | 2024 | 1 | the app's calendar in the sheet |
| `rn-placeholder` | 2022 | 6 | `Skeleton` |
| `toggle-switch-react-native` | 2022 | 1 | React Native's `Switch` |
| `react-native-loading-spinner-overlay` 2 | 2025 | 1 | the app's overlay |
| `react-native-paper` 4 | active (5.x) | 2 | `OText` (it is used only for `Text`) |
| `react-native-linear-gradient` 2.7 | 2026 | 1 | the review's `rating_scale` fill (no gradient left) |
| `react-native-vector-icons` 10 | **deprecated** | 29 | `@react-native-vector-icons/ionicons` + `/material-design-icons` 14 (D5) |
| `react-native-map-link` 2.11 | active | 1 | 3.15.0 for the list of apps, drawn in the app's sheet |

### 2.3 Replace: unmaintained (phases 4, 5 and 7)

| Library | Last publish | Importers | Replacement | Phase |
|---|---|---|---|---|
| `@notifee/react-native` 9.1.8 | 2024-12 | 1 | `react-native-notify-kit` (as the sister app) | 4 |
| `react-native-splash-screen` 3.3.0 | 2022 | 2 | `react-native-bootsplash` 7 (as the sister app, its `docs/SPLASH.md`) | 7 |
| `react-native-geolocation-service` 5.3.1 | 2022 | 2 | `@react-native-community/geolocation` 3.4, or the background-geolocation SDK the app already has: one location stack (to decide in phase 5) | 5 |
| `@fatnlazycat/react-native-recaptcha-v3` | 2022 | 1 | reCAPTCHA v3 on `react-native-webview` (as the sister app) | 7 |
| `react-native-recaptcha-that-works` 1.3.2 | 2023 | 1 | keep, 2.0.0 if the new architecture needs it | 7 |
| `react-native-sound-player` 0.13.4 | 2025-02 | 2 | 0.14.5 first; if it does not run on the new architecture, a replacement chosen in phase 4 (it plays the new-order alarm: it cannot regress) | 4 |
| `rn-config-reader` 5.1.3 | 2024-08 | 1 | confirm what it reads; `react-native-device-info` or a few lines of native code if it blocks the new architecture | 7 |
| `moment` | maintenance mode | 6 (+2 in the submodule) | `dayjs` (already here) in the app's files; the dependency stays while the submodule imports it | 6 |

### 2.4 Upgrade (phases 3 to 7)

| Library | Today | Target | Notes | Phase |
|---|---|---|---|---|
| `react-native`, `@react-native/*`, CLI | 0.81.1, 20.0.0 | 0.88.1, the CLI its template pins | seven minors: the template diff of each (Gradle 9, Kotlin 2.2, SDK 37, Podfile, Metro, Babel), `@react-native/jest-preset` | 3 |
| `react`, `react-test-renderer`, `@types/react` | 19.1.0 | 19.3.x | | 3 |
| Android new architecture | off | on | required: every native module must support it (the list of §3) | 3 |
| `react-native-screens` | 4.14.0 | 4.30.1 | | 3 |
| `react-native-safe-area-context` | 5.8.0 | 5.11.1 | | 3 |
| `react-native-gesture-handler` | 2.28.0 | 2.33.1 | 3.x (a new API) is not needed: later | 3 |
| `react-native-maps` | 1.13.2 | 1.29.11 | 16 minors; the map is three screens of this app | 3 |
| `react-native-permissions` | 5.4.2 | 5.6.3 | | 3 |
| `react-native-device-info` | 10.14.0 | 15.0.2 | five majors, 3 importers | 3 |
| `react-native-image-picker` | 4.10.3 | 8.3.0 | four majors: the response shape changed | 3 |
| `react-native-fast-image` | — | — | removed with the theme conversion (see "Done so far") | — |
| `react-native-vector-icons` | 10.0.2 (deprecated) | `@react-native-vector-icons/ionicons` + `/material-design-icons` 14 | one importer: the app's `Icon` | 3 |
| `react-native-map-link` | 2.8.2 | 3.15.0 | one importer (the driver map's sheet) | 3 |
| `react-native-country-picker-modal` | 2.0.0 | 3.x | data only (the phone field's countries) | 3 |
| `react-native-webview` | 11.26.1 | 14.0.1 | | 3 |
| `react-native-signature-canvas` | 4.7.4 | 5.1.1 | a WebView inside | 3 |
| `@sentry/react-native` | 8.30.0 | 8.33.0+ | | 3 |
| `@react-native-async-storage/async-storage` | 2.2.0 | 2.2.x | 3.x changes the storage API: later | — |
| `@react-native-community/netinfo` | 11.5.2 | 11.x | 12 later | — |
| `react-native-restart` | 0.0.27 | 0.0.29 | | 3 |
| `react-native-onesignal` | 4.5.2 | 5.5.17 | a rewritten API; the sister app's migration and its review fixes are the guide | 4 |
| `@react-native-firebase/*` | 23.8.8 | 26.4.1 | 27.x after the sister app takes it | 4 |
| `react-native-background-geolocation` | 4.19.4 | removed | **Replaced by the app's own location module** ([LOCATION_MODULE.md](LOCATION_MODULE.md)): the SDK and `react-native-background-fetch` are out of `package.json`, the Gradle lines and the licence meta-data are gone on Android (iOS in progress) | 5 |
| `@react-navigation/native`, `stack`, `bottom-tabs` | 6.x | 7.x | plain-data params, as the sister app | 6 |
| `react-hook-form` | 6.15.8 | 7.x | 5 files: `Controller` and `register` changed | 6 |
| `libphonenumber-js`, `socket.io-client`, `styled-components`, `dayjs` | — | latest minor | | 6 |

### 2.5 Not now, and why

`typescript` 5.9 → 7.0, `eslint` 8 → 10, `jest` 29 → 30, `prettier` 2 → 3,
`@testing-library/react-native` 13 → 14, Babel 7 → 8: the sister app stays on the same
majors and React Native 0.88's presets are written for them. `eslint-config-standard`
(2023) goes when ESLint moves to the flat config. Each is its own change, after this plan.

## 3. Risks, in order

1. **Background location (phase 5).** It is the app: a regression is drivers not tracked.
   Version 5 is a major of a licensed SDK; it needs a real device moving, on both
   platforms, with the app in the background and killed.
2. **Push and the new-order alarm (phase 4).** OneSignal 5 changed every call; the
   notification service extension, the `new_order_alarm` channel and its sound must be
   seen with the app in the foreground, in the background and closed.
3. **Android's new architecture (phase 3).** Every native module must support it. To
   check before starting, one by one: background geolocation 4 (if only 5 does, phases 3
   and 5 merge), `react-native-sound-player`, `rn-config-reader`,
   `react-native-splash-screen`, `react-native-geolocation-service`, `@notifee`.
4. **The Builder.** It replaces placeholders as text and expects fixed splash and icon
   names and a package manager marker (inventory §8). Moving to bootsplash or to pnpm
   changes what it must do: its driver base has to be ready first, and one real Builder
   build per platform closes the plan.
5. **The submodule** (`src/@/components`) is shared with the web and the other apps: it is
   not edited here. React 19.3 and the libraries it imports from this `package.json`
   (dayjs, moment, prop-types, socket.io-client) must keep working as they are.

## 4. Phases

Each phase is its own branch and pull request on top of the previous one, ends with the
repository's checks (`npx tsc --noEmit`, `yarn lint:check`, `yarn test`, a release bundle
for each platform) and with the app opened on an iOS simulator and an Android emulator,
and says what it did not see.

| # | Phase | What | Device check |
|---|---|---|---|
| 0 | Research (read-only) | For each library of §2.3 and §2.4 with a major: its changelog and migration guide, whether it supports the new architecture, and the sister app's commit for it → `docs/deps/<library>.md`. Baseline: build times, binary sizes, cold start | — |
| 1 | Clean up — **done** | Remove §2.1; `pod install`; nothing else changes | launch (both platforms); login not seen |
| 2 | UI libraries — **done** | §2.2 — this was **phase 7 of the theme conversion** (primitives first), not extra work | the screens before login, both platforms |
| 3 | Core | React Native 0.88.1, React 19.3, Android's new architecture, the libraries of §2.4 marked 3 | every screen, both platforms |
| 4 | Push | OneSignal 5, Firebase 26, notify-kit, the alarm sound | push in three app states, both platforms |
| 5 | Location | ~~Background geolocation 5~~ replaced by the app's own location module (Android built and verified on the emulator, iOS in progress, real phones by the owner: [LOCATION_MODULE.md](LOCATION_MODULE.md)); the foreground location library | a real device moving, both platforms |
| 6 | JavaScript-only | Navigation 7, react-hook-form 7, moment → dayjs, minors | navigation flows, forms |
| 7 | Native shell | Bootsplash, reCAPTCHA on the WebView, the config reader, restart | cold start, login with reCAPTCHA |
| 8 | Close | The package manager, if it changes; CI; `CLAUDE.md`; a Builder build per platform; the "not now" list as issues | the Builder's builds installed |

**Order with the theme conversion.** Recommended: finish the theme's code (its phases 6
to 8, which already remove the twelve UI libraries and the dead dependencies), then run
phases 1 and 3 to 7 of this plan, and only then do the theme's device passes (its phases 9
and 10): every screen is verified once, on the platform that ships. The alternative
(upgrade first) validates on the new architecture twelve libraries that are about to be
deleted.

## 5. With agents

| Phase | Agents | Each one's files |
|---|---|---|
| 0 | One read-only agent per risky library (OneSignal, Firebase, background geolocation, navigation, maps, image picker, device info, react-hook-form, bootsplash, sound player), in parallel | writes only its `docs/deps/<library>.md` |
| 1 | One | `package.json`, lock files, pods |
| 2 | The theme's area agents | disjoint areas of `src/ui` |
| 3 | The coordinator makes the core upgrade (one author for `package.json`, `android/`, `ios/`, Metro, Babel, Jest); then one agent per platform fixes its build, and one per library group of §2.4 adapts the call sites | iOS agent: `ios/`; Android agent: `android/`; library agents: the importers of their library (1 to 5 files each) |
| 4, 5 | One agent each, **one after the other**: both live in `src/navigators/RootNavigator.tsx`. Before them, the coordinator moves push and location out of it into their own modules, so later changes do not collide | push: the push module and the notification extension; location: the location module and `PermissionsContext` |
| 6 | Three in parallel | navigators and pages · the five form files · the six `moment` files |
| 7 | Two in parallel | splash (native projects) · reCAPTCHA and config reader |
| 8 | The coordinator | — |

Rules for every agent, as in the theme conversion: its own worktree and its own simulator
or emulator; it commits locally and never pushes or opens a pull request; it does not
touch the submodule, `product.schema.json` or the decision log; its report ends with what
it did not see. The coordinator reads each diff, runs the checks and opens the app before
telling anything as verified. A real device (phases 4 and 5) and the Builder (phase 8) are
the owner's.

## 6. Decisions for the owner

**Decided on 2026-11-13** (Luis): **U1** the upgrade goes *before* the theme's device
verification — the theme's pull request waits and every screen is verified once, on what
ships (the option (c) below, not the recommended one) · **U2** (a) the sister app's
versions · **U3** (b) pnpm 12, now, in the theme's pull request · **U4** changed the same day: **no version 5** (its licence is per application
identifier and forbids white-label use); the SDK is replaced by the app's own native
module, [LOCATION_MODULE.md](LOCATION_MODULE.md) · **U5** (a) bootsplash, with the
upgrade and not waiting for the Builder: a Builder build has no correct splash until its
driver base is adapted · **U6** the owner tests push and background location on real
phones, from a list this plan's phases 4 and 5 leave. The table is kept as it was asked.

| # | Topic | Options | Recommendation |
|---|---|---|---|
| U1 | Order with the theme conversion | (a) theme code → this plan → theme's device passes · (b) theme complete, then this plan · (c) this plan first | (a) |
| U2 | Target versions | (a) the sister app's pins · (b) the latest of each library | (a): proven on the same Builder; (b) adds gesture-handler 3, async-storage 3, Firebase 27 and CLI 21 with nobody having run them |
| U3 | Package manager | (a) stay on Yarn 1 · (b) pnpm 12, as the sister app | (b) if the Builder's driver pipeline can take the `BUILD_PNPM.txt` marker; otherwise (a) and its own change later |
| U4 | Background geolocation 5 | (a) upgrade in phase 5 · (b) stay on 4.19 if it runs on the new architecture | depends on phase 0's finding and on whether the licence covers version 5 |
| U5 | Splash | (a) bootsplash, with the Builder's driver base adapted as the marketplace's · (b) keep `react-native-splash-screen` while it builds | (a), not before the Builder is ready |
| U6 | A real device for push and location | who tests, on which phones | needed for phases 4 and 5: an emulator does not prove either |

## 7. Not verified

- New-architecture support of each native library: phase 0 reads it; this plan assumes
  only what the sister app already runs.
- That React Native 0.82 and later no longer build with the old architecture: to confirm
  against the release notes in phase 0 (the sister app runs the new one on both platforms).
- The licence terms of background geolocation 5 and what the Builder's driver base
  replaces today (neither repository says).
- "Last publish" is the registry's `time.modified` of the latest version, not a judgement
  of each project's health.
