# CLAUDE.md

Guidance for AI assistants working in **Ordering Driver App** — the **bare React Native** mobile app for delivery drivers on Ordering.co / OrderingPlus.

**Repository:** [Ordering-co/ordering-app-driver](https://github.com/Ordering-co/ordering-app-driver)

**Stack:** React Native 0.88.1 (new architecture on both platforms, Hermes V1), React 19.3.0, TypeScript, styled-components/native. **Not Expo.** Drivers accept orders, navigate to pickups/drop-offs, track location in the background, and communicate with stores/customers.

**Related repos:**

| Repo | Role |
|------|------|
| [ordering-components](https://github.com/Finitless-com/ordering-components) | Headless logic submodule at `src/@/components` |
| [Customer App](https://github.com/Ordering-co/ordering-app-customer) | Customer mobile app — shares the same submodule and `@ui` pattern |
| [Ordering Website](https://github.com/Ordering-co/ordering-website-customer) | Web marketplace — same submodule, different platform wiring |

## Theming

**Read [docs/THEMING.md](docs/THEMING.md) before styling anything.** Every visual value
comes from the theme (`product.schema.json`, product type `driver_app`), read through the
helpers of `src/theme/helpers.ts` and the primitives of `src/ui/src/components/shared`.
The owner's decisions are in [docs/theme/decisions.md](docs/theme/decisions.md): they are
not reopened. `pnpm theme:guard` fails on a literal in a style. **The design rules come first: usability (the app is used by a driver) and the theme commanding every style: [docs/THEMING.md, "Design rules"](docs/THEMING.md#design-rules).**

## Onboarding

Use [docs/onboarding.md](docs/onboarding.md) for Quickstart project configuration and the local simulator. The development project gate prepares session and offline queue storage before the SDK provider mounts. Run Driver App role checks using a synthetic delivery or an authorized test project.

## Commands

Package manager is **pnpm** (the version pinned in `package.json` `packageManager`, through `corepack enable`; settings in `pnpm-workspace.yaml`). Node **>= 22.13** (`package.json` engines; React Native 0.88 and the theme engine require it). Android builds with JDK 17 or newer (Android Studio's JDK 25 works) and Gradle 9.4.1 (the wrapper).

```bash
pnpm install               # install dependencies
pnpm start                 # Metro bundler
pnpm start:reset           # Metro with cache reset
pnpm ios                   # run on iOS simulator
pnpm android               # run on Android emulator
pnpm test                  # jest (single file: pnpm test path/to/file-test.tsx)
pnpm lint                  # eslint . --fix
npx tsc --noEmit           # TypeScript typecheck (there is NO `npm run build`)
```

**iOS native deps** (first clone or after native dep changes):

```bash
bundle install
bundle exec pod install    # from ios/
```

**Verify a change in this order:** `npx tsc --noEmit` → `pnpm lint` → `pnpm test` → for UI or native changes, run on a simulator/device. There is no web/headless flow — it's a native driver app.

## Architecture: three layers

The app is deliberately split into **headless logic**, **presentational UI**, and **screen wiring**. Understanding this separation is essential before editing.

```
@components (submodule)     →  controllers + hooks, NO visual markup
@ui (src/ui)                →  styled-components skins, wired via UIComponent prop
pages + navigators (src/)   →  thin screen wrappers, navigation, i18n strings
```

### 1. `@components` → `src/@/components` (GIT SUBMODULE — edit with caution)

Headless, UI-agnostic business logic from [Finitless-com/ordering-components](https://github.com/Finitless-com/ordering-components) (formerly `OrderingPlus/components`).

**React Native entry point:** `@components` resolves to `src/@/components/native/index.js` — **not** `src/@/components/src/index.js` (that web barrel pulls the entire SDK into the bundle).

Exposes `OrderingProvider` (RN variant uses `NativeStrategy` + AsyncStorage) and hooks: `useSession`, `useOrder`, `useConfig`, `useApi`, `useLanguage`, `useWebsocket`, `useEvent`, `useBusiness`, `useCustomer`, `useToast`, `useUtils`, etc.

Driver-relevant controllers include `OrderListGroups`, `OrderDetails`, `NewOrderNotification`, `Messages`, `DriverList`, `ReviewCustomer`, `MapView`, `Contacts`, `Sessions`, `LoginForm`, `LogoutAction`.

Controllers accept a `UIComponent` prop and return only `<UIComponent {...props} />` — no layout markup of their own.

**This is a submodule:** clone with `--recursive`; logic changes belong in the upstream [ordering-components](https://github.com/Finitless-com/ordering-components) repo, not here. See `src/@/components/CLAUDE.md` for submodule rules. Confirm folder boundaries (app source vs. submodule) before editing.

**Native vs web wiring in the submodule:**

| Platform | Strategy | OrderingProvider | Import alias |
|----------|----------|------------------|--------------|
| React Native (this app) | `NativeStrategy` (AsyncStorage) | `native/src/contexts/OrderingContext` | `@components` → `native/index.js` |
| Web (website-marketplace-v26) | `WebStrategy` (localStorage) | `src/contexts/OrderingContext` | deep-imports from `~components/...` |

### 2. `@ui` → `src/ui` (APP SOURCE — the presentational component library)

~35 styled-components-based driver components in `src/ui/src/components/*`, re-exported from `src/ui/index.tsx`. This is where **visual work** happens.

**Wiring pattern** (most features follow this):

```tsx
// src/ui/src/components/LoginForm/index.tsx
import { LoginForm as LoginFormController } from '@components'

const LoginFormUI = (props) => { /* styled JSX */ }

export const LoginForm = (props) => (
  <LoginFormController {...props} UIComponent={LoginFormUI} />
)
```

**Driver-specific UI** (not in marketplace app): `OrdersOption`, `AcceptOrRejectOrder`, `OrderDetails/Delivery`, `OrderDetailsLogistic`, `DriverMap`, `DriverSchedule`, `ScheduleBlocked`, `NewOrderNotification`, `WebsocketStatus`, `NotificationSetting`.

Also exports helpers consumed by pages: `SafeAreaContainerLayout`, `ONavbar`, `OButton`, `ThemeProvider`, `OToast`, `StoreMethods`, `OfflineActionsProvider`, `useOfflineActions`, etc.

Each component keeps styles in a sibling **`styles.tsx`** with **named** styled-components — do not scatter inline `style={{ ... }}` objects.

**App-only context in `@ui`:** `OfflineActionsProvider` / `useOfflineActions` (`src/ui/src/context/OfflineActions/`) — queues order status changes when offline and syncs when connectivity returns. Used by `OrdersOption`, `AcceptOrRejectOrder`, and `OrderDetails/Delivery`.

### 3. `src/pages` + `src/navigators` (screen wiring)

Each file in `src/pages/*.tsx` is a thin screen wrapper: pulls hooks (`useLanguage`, `useTheme`, …), assembles props (including translated strings and driver-specific action maps), and renders a `@ui` component inside layout wrappers.

**App-only contexts** (not in submodule): `PermissionsProvider` (`src/context/PermissionsContext.tsx`) — location permission state for map tab and order flows.

## Entry flow

```
index.js  →  App.tsx  →  src/DeliveryApp.tsx  →  src/appContainer.tsx
```

`DeliveryApp` builds the provider tree:

`ThemeProvider` → `OrderingProvider` → `PermissionsProvider` → `AppContainer` (`NavigationContainer` → `RootNavigator`) + `OToast`

Also injects `theme.images` and `theme.sounds` (all `require()`d assets) from `src/assets/`.

## Navigation

React Navigation (stack + bottom tabs):

```
RootNavigator (auth gating, tutorial, splash, permissions, OneSignal, schedule block, background location tracking: the app's own module)
├─ Unauthed: IntroductoryTutorial → Home → Login / Forgot
└─ Authed: HomeNavigator
   ├─ BottomTab → BottomNavigator (Orders, MapView, Messages, Profile)
   └─ Stack screens: OrderDetails, OrderDetailsLogistic, AcceptOrRejectOrder, OrderMessage, Sessions, RequestPermissions
```

`NavigationRef.tsx` enables imperative navigation from outside React (e.g. OneSignal push handlers).

**Page conventions:**
- `const [, t] = useLanguage()` + `t('KEY', 'Fallback')`
- `useTheme()` for token colors
- `onNavigationRedirect: (page, params) => navigation.navigate(page, params)`
- Driver login uses `allowedLevels: [4]` (driver user level)
- Order actions use driver-specific API keys: `acceptByDriver`, `rejectByDriver`, `pickupFailedByDriver`, `deliveryFailedByDriver`, etc.

## Import aliases

Defined in BOTH `babel.config.js` (module-resolver) and `tsconfig.json` (paths) — **keep them in sync**:

| Alias | Resolves to |
|-------|-------------|
| `@` | `src` |
| `@ui` | `src/ui/index.tsx` |
| `@components` | `src/@/components/native/index.js` |

## Configuration & theming (runtime, not env vars)

- **`src/config.json`** — runtime app config: `app_id`, `app_internal_name` (`driver_app`), `notification_app` (`deliveryapp`), `api.url`/`version`, `socket.url`, `project`, feature flags (`show_tutorials`, `use_root_point`, `validate_developer_mode`, `force_update_lang`). Passed into `OrderingProvider` as `settings`.
- **`src/theme.json`** — colors, spacing, and image manifests. Use **theme tokens** (`theme.colors.*`) — never hardcode hex or magic numbers. `theme.images` and `theme.sounds` are populated at runtime in `DeliveryApp.tsx`.
- Server-side `configs` (from `useConfig()`) override local settings for many flags (e.g. `onesignal_deliveryapp_id`, `driver_login_validation`, `combine_pending_and_progress_orders`, `allow_save_changes_offline`).

## i18n

Translation via `const [, t] = useLanguage()`, called as `t('LANG_KEY', 'Fallback text')`. Always pass a sensible fallback.

Multi-locale source of truth: **`i18n/translations.json`** (locales from `i18n/config.json`). Commands: `pnpm i18n:generate|verify|missing|apply-batch|sync`. Fill missing locales with `.cursor/skills/translate-keys` (`/translate-keys`). See `i18n/README.md`.

Legacy EN-only dumps still regenerated by `pnpm i18n:generate`: `app-driver-translations.json` / `.csv`.

## Driver-specific behavior (do not confuse with marketplace)

| Concern | Where it lives |
|---------|----------------|
| Background location tracking | The app's own native module (`DriverLocation`: `android/app/src/main/java/co/ordering/delivery/location/`, `android/driverlocation-core`, iOS `ios/DriverLocationCore`; spec `src/native/NativeDriverLocation.ts`, wrapper `src/native/driverLocation.ts`, hook `src/navigators/useDriverLocationTracking.ts` called by `RootNavigator`). The native sender posts to `/users/{id}/locations`; no licensed SDK. Two send options (2026-11-19), both passed through `configure`: a minimum interval between the start of two requests (`minSendIntervalMs`, 0 = off) and `location_at` in the body (`sendLocationAt`, false = off); the app fixes 1500 ms and `location_at` on in `src/navigators/driverLocationOptions.ts` and lets the project configs `driver_location_min_send_interval_ms` and `driver_location_send_location_at` override them. The same module also **records and sends the driver's tracking events** (2026-11-19; GPS off / on, connection lost / restored, location permission or precision, app in the background / foreground, battery saver, a simulated position, tracking started / stopped, including a stop by the system), only while tracking: they are kept on the phone and posted to `{api}/tracking_events` in batches with the positions' headers; JavaScript passes `eventsUrl` and the start / stop reasons (`src/navigators/trackingReasons.ts`), the project config `driver_tracking_events_enabled` (`'0'`) turns it off, and nothing posts events from JavaScript any more (the old `turn_off_gps`, `set_app_in_background` and `turn_off_mobile_data` senders are gone). Android runs every service, sender, recorder and `closeOrphan` on **one process-wide worker** with one recorder store and one pair of queues (`DriverLocationRuntime`), so a stop always runs before the next start; a 401 answered to a request sent with replaced headers (or after a stop) revokes nothing on either platform; a `Retry-After` of a 429 / 503 is honoured, at most 5 minutes. See [docs/LOCATION_MODULE.md](docs/LOCATION_MODULE.md) |
| OneSignal 5 push (delivery app) | `RootNavigator` calls `src/navigators/oneSignalPush.ts` (+ `pushProviderSwitch.ts`, `oneSignalSms.ts`) — uses `configs.onesignal_deliveryapp_id`; Android `NotificationServiceExtension.kt` and the iOS `OneSignalNotificationServiceExtension` force the alarm channel/sound and mask the order id. Push: [docs/deps/push-phase.md](docs/deps/push-phase.md) |
| Launch time limit | `RootNavigator` + `src/navigators/useLaunchTimeLimit.ts` — an API that never answers keeps the launch pending; after 15 s the loading page leaves (app with a session, welcome screen without), the native splash is hidden and one "Network Error" toast shows; the gates stay what they are, so what waits for an answer runs when it comes |
| Driver schedule enforcement | `RootNavigator` — blocks login outside schedule when `driver_login_validation` is enabled |
| New order sound/vibration | `NewOrderNotification` UI + websocket `update_order` listener in `RootNavigator` |
| Offline order actions | `OfflineActionsProvider` in `@ui` |
| Map tab permission gate | `BottomNavigator` — shows `RequestPermissions` when location not granted |
| Developer mode block (Android) | `config.json` `validate_developer_mode` + `RootNavigator` |

## Where to edit what

| Task | Edit here | Do NOT edit |
|------|-----------|-------------|
| Visual design, layout, styled-components | `src/ui/src/components/*` | submodule controllers |
| Screen navigation, page-specific driver props | `src/pages/*`, `src/navigators/*` | `@ui` unless reusable |
| Business logic, API calls, order state | submodule `src/@/components/src/components/*` | this repo's pages for logic |
| Theme tokens, colors, spacing | `src/theme.json` | hardcoded values in components |
| App config, API URL, feature flags | `src/config.json` | env vars (not used) |
| Native-only integrations (OneSignal, the location module, permissions) | `src/navigators/RootNavigator.tsx`, `src/context/PermissionsContext.tsx` | submodule (keep platform-agnostic) |
| Offline action queue | `src/ui/src/context/OfflineActions/` | submodule |

## Common LLM mistakes — avoid these

1. **Adding styled-components or layout markup in submodule controllers** — belongs in `src/ui`.
2. **Importing from `src/@/components/src/index.js`** — use `@components` alias (native barrel).
3. **Putting business logic in `src/pages/*`** — pages wire props; logic lives in submodule controllers or `@ui` only when purely presentational.
4. **Hardcoding colors/spacing** — use `theme.json` tokens via `useTheme()`.
5. **Editing submodule casually** — changes affect web + mobile + driver; coordinate upstream PRs.
6. **Scattering inline styles** — use sibling `styles.tsx` with named styled-components.
7. **Forgetting translation fallbacks** — always pass fallback to `t()`.
8. **Dashboard vs driver confusion in submodule** — `OrdersDashboardComponents/` is admin-only; driver app uses `OrderListGroups`, `OrderDetails`, `NewOrderNotification`, etc.
9. **Using marketplace login levels** — driver app requires `allowedLevels: [4]`, not customer levels.
10. **Confusing this repo with ordering-app-marketplace-v26** — same architecture, different screens, native integrations, and driver order action keys.

## Gotchas

- **Submodule**: `src/@/components` is a git submodule (`.gitmodules`). Fresh clones need `git clone --recursive https://github.com/Finitless-com/ordering-app-driver-theming.git` or `git submodule update --init`.
- **Patches** (`patches/`, listed in `pnpm-workspace.yaml` `patchedDependencies`; `pnpm install` fails if one no longer applies). One patch is left: `react-native-notify-kit@9.7.0` (its Gradle script refuses any JDK but 8/11/17/21; the patch accepts 17+, Android Studio's JBR 25 included; stays while its Gradle script does that). Android location rationale strings: the app's own `AppStrings` module (`android/.../AppStrings.kt`, `src/navigators/locationRationale.ts`). Launch splash: [docs/SPLASH.md](docs/SPLASH.md) (react-native-bootsplash). `pnpm-workspace.yaml` also holds the pnpm settings: `nodeLinker: hoisted` (React Native autolinking, CocoaPods and Gradle read `node_modules/<name>`), `autoInstallPeers: false` (peers only when listed, as Yarn 1 did), `overrides` (react-native, Yarn's old `resolutions`) and `allowBuilds` (the only dependencies whose install scripts run).
- **Builder builds (Jenkins)**: `BUILD_PNPM.txt` at the root tells the Builder's pipelines to install with pnpm (`corepack`, `pnpm install --frozen-lockfile`) and to keep `ios/Podfile.lock`; without it they install with yarn. Always commit `pnpm-lock.yaml` with `package.json` (CI fails otherwise).
- **Android build:** `android.newDsl=false` and `android.builtInKotlin=false` (AGP 9 opt-outs: the `org.jetbrains.kotlin.android` plugin of this setup needs the legacy DSL (`-Pandroid.newDsl=true` fails to configure `:app` with "Failed to apply plugin 'org.jetbrains.kotlin.android'", checked again after the icon fonts left `fonts.gradle`)); `subprojects { buildConfig = true }` in `android/build.gradle` (AGP 9 turns BuildConfig off for libraries). `MainApplication` has no `ReactNativeHost` (the New Architecture throws on it): it builds the `ReactHost` from `PackageList` plus the app's own `AlarmSoundPackage`, `AppStringsPackage` and `DriverLocationPackage`. Play Services versions are not pinned in `app/build.gradle` (react-native-maps brings its own).
- **Native request headers**: the requests of the app carry two headers set natively, never from JS: the `User-Agent` with the app, build, OS and device (`<App>/<version> (co.ordering.delivery; build:<code>; Android 15; samsung SM-S911B) okhttp/…`, iOS `… iOS 18.2; iPhone15,2) CFNetwork/… Darwin/…`), which api-core parses, on **every host**, and `X-Device-Id-X`, the device's id for analytics, **only on requests to the Ordering API's host** (the owner's decision of 2026-11-19: the id only to the API; **this app differs from the marketplace app here, which sends both to every host**). JavaScript tells the native side which host is the API once it knows it: `useDriverLocationTracking` calls `setApiRoot(ordering.root)` (the `DriverLocation` module's one synchronous method; host and port are compared, so Metro on the same host is not the API); until then no request carries the id, and nothing else in the app may add it. Android: one OkHttp interceptor in `android/app/src/main/java/co/ordering/app/UserAgent.kt` (`ApiHosts.kt` holds the host), installed in `MainApplication` before React Native loads (React Native takes a single client builder: nothing else in the app may set one; neither Sentry, OneSignal nor the app's own modules do today); the id is `ANDROID_ID`, read once per process and kept in memory only (`DeviceId.kt`; never on disk: Auto Backup would copy it to another phone). The helpers live in the fixed package `co.ordering.app` (`android/app/src/main/java/co/ordering/app/`, imported by its full name): the Builder renames `co.ordering.delivery` only in the files its base lists, so a new class in the app's package would keep the old `package` line and break the build; their JVM tests are in `android/app/src/test/java/co/ordering/app/` (`./gradlew :app:testDebugUnitTest`; `HeadersInterceptorTest`: the API host gets both headers, another host only the User-Agent). iOS: `UserAgent` / `ApiHosts` / `RequestHeaders` / `DeviceId` in `ios/ODelivery/AppDelegate.swift`: the User-Agent is in the session's headers (`RCTSetCustomNSURLSessionConfigurationProvider`, which the bridging header imports; images carry it too) and the id is added request by request by `RCTSetCustomHTTPRequestInterceptor` (React Native 0.88's per-request hook, it sees fetch, XHR and images; session headers cannot be per host) when the request is the API's; the id is a UUID v4 in the Keychain (`…AfterFirstUnlockThisDeviceOnly`, survives a reinstall, no backup to another phone), read when first needed and kept in memory (one read at a time, so React Native's path and the location module's agree; a Keychain that cannot be read before the first unlock gives no id, never a new one), declared in `ios/ODelivery/PrivacyInfo.xcprivacy` (Device ID, linked, no tracking, analytics). **The driver location module's requests are not React Native's**: they are posted natively (`HttpURLConnection` in `android/driverlocation-core`, `URLSession` in `ios/DriverLocationCore`) and go to the API only (the positions' and the events' urls), so `DriverLocationService.kt` (Android, in its own process: `UserAgent.headers(context)`, reading `ANDROID_ID` again, never persisted) and `DriverLocationBridge.configure` (iOS, `UserAgent.headers()`) add both headers with the same values through the cores' `withDefaultHeaders` / `addingDefaultHeaders` (the cores know no header name and read no device; a header the JS configured wins). A User-Agent set from JS is kept, and the app passes none (`src/DeliveryApp.tsx` gives the provider no `userAgent`). The socket's handshake does not carry them. Never `X-Physical-Device-Code-X` (POS/kiosk devices) nor the Advertising ID.
- **Google Maps key:** both platforms hold the marker `_GOOGLE_MAPS_API_KEY_` (`android/app/src/main/AndroidManifest.xml`, `ios/ODelivery/AppDelegate.swift`); the Builder writes each brand's key. A local build shows blank map tiles until a key is written there locally: never commit one.
- **Hermes V1** (React Native 0.84+) does not compile a destructuring with a shorthand `get`/`set` and a default (`({ set = 'x' }) => ...`).
- ESLint (v8, `.eslintrc.js`, ignores in `.eslintignore`) extends `@react-native`, as the marketplace app: it lints `.js`, `.jsx`, `.ts` and `.tsx` with the TypeScript parser, not the submodule, tests, `jest/`, `scripts/`, `android/` or `ios/`. `react-hooks/exhaustive-deps`, `react-hooks/rules-of-hooks`, `@typescript-eslint/no-unused-vars` and `no-unreachable` are `warn` (legacy hook patterns, cleaned up gradually); `react/prop-types`, `react/display-name` and `no-useless-escape` are off. `pnpm lint:check` is the CI step.
- `OrdersOption` is a hybrid: it renders the `OrderListGroups` controller directly and composes `PreviousOrders`, the search modal (`OrdersOptionDate`, `OrdersOptionCity`), `NewOrderNotification` and `NotificationSetting` internally — not a simple single-controller wrapper.
- `isDriverApp: true` and driver action maps are passed from pages — keep them consistent across `MyOrders`, `OrderDetails`, and `AcceptOrRejectOrder`.
- `use_root_point: true` in config enables multi-project selection stored in AsyncStorage (`project_name`).
