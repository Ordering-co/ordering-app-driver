# Core upgrade: React Native 0.81.1 -> 0.88.1, React 19.3.0, new architecture on Android

Target app: `/Users/work/Ordering/ordering-app-driver-theming` (read only for this document).
Model: `/Users/work/Ordering/ordering-app-marketplace-theming` (RN 0.88.1, new arch on both platforms).
Date of research: 2026-11-13. Everything below was read from the two repositories, from the
installed `node_modules` of both, from the sister app's git history, and from the web pages
cited in "Sources". Where a statement is an inference, it says so.

State of the driver repo when read: HEAD `3a413d2`. The package manager was already moved to
**pnpm 12.18.0** by another agent (`package.json` `packageManager`, `pnpm-workspace.yaml`,
`BUILD_PNPM.txt`, `pnpm-lock.yaml`, no `yarn.lock`), ESLint already extends `@react-native`.
`pnpm-workspace.yaml` carries `overrides: react-native: 0.81.1` (it was Yarn's `resolutions`):
**it must change with `package.json`** (section 2.1).

Helper files written next to this document (all in
`/private/tmp/claude-502/-Users-work-Ordering-ordering-app-driver-v26/7973cf91-8d30-4927-951c-6460cc60be31/scratchpad/deps/`):

| File | What it is |
|---|---|
| `patches/react-native-onesignal@4.5.2.patch` | the sister app's final pnpm-format patch; `git apply --check` passes on the driver's installed 4.5.2 |
| `patches/react-native-splash-screen@3.3.0.patch` | same, passes on the driver's installed 3.3.0 |
| `patches/rn-config-reader@5.1.3.patch` | written for this document (the sister app has no such library); `git apply --check` passes on the driver's installed 5.1.3 |
| `patches/react-native-date-picker@5.0.13.patch` | the sister's; NOT applicable to the driver (no such dependency); kept for reference only |
| `tpl/0.81.1`, `tpl/0.88.1` | the rn-diff-purge template files (RnDiffApp) of both versions, for `diff -r` |
| `src-grep.txt`, `submodule-grep.txt` | raw output of the API grep of section 3 (`scripts/grep_src.py`) |
| `android-imports.txt` | output of `scripts/imports.py` (section 4) |

---------------------------------------------------------------------------------------------------

## 0. Decisions the coordinator must take before step 1

| # | Decision | Recommendation and why |
|---|---|---|
| D1 | Firebase (`@react-native-firebase/*`) 23.8.8 now, or 26.4.1 in this step | **26.4.1 now.** The sister app changed 23.3 -> 26.4.1 in the very same commit as RN 0.88.1 (`74f43cf`), together with `google-services` 4.4.0 -> 4.4.4 and `firebase-crashlytics-gradle` 2.7.1 -> 3.0.8 (AGP 9). 23.8.8 on RN 0.88 is not proven anywhere. Cost: iOS needs `$RNFirebaseDisableSPM = true` in the Podfile (the sister's comment: Firebase's Swift packages need dynamic frameworks, the app links statically). The plan puts Firebase in phase 4; moving it here is the only way to run a proven combination. |
| D2 | Play Services versions in `android/app/build.gradle` | Remove the explicit `play-services-base:18.0.1`, `play-services-maps:18.0.2`, `play-services-location` lines and the `exclude group: 'com.google.android.gms'` on `:react-native-maps` (section 2.4), as the sister's file has none: maps 1.29.11 declares base 18.5.0 / maps 19.1.0 / location 21.3.0 itself. Not verified: that Transistorsoft's `tslocationmanager-v21:3.+` is happy with location 21.3.0 (see "Not known"). |
| D3 | How to carry three library fixes: patches vs earlier replacement | Patches (pnpm `patchedDependencies`, exactly as the sister did): OneSignal 4.5.2, splash-screen 3.3.0 (both sister-proven) and **rn-config-reader 5.1.3 (new; without it Gradle 9 cannot configure the project)**. The plan already replaces these libraries in phases 4 and 7; the patches are throw-away. |
| D4 | `reactNativeArchitectures` | **Done on 2026-11-23** (the owner: "remove the x86 ones"). The sister reduced it to `armeabi-v7a,arm64-v8a` (commit `a6fc422`): the x86/x86_64 build doubled the native CMake compile and took the APK from ~65 MB to ~121 MB. The driver built 4 ABIs until then and now builds `armeabi-v7a` and `arm64-v8a` (`android/gradle.properties`); an x86_64 emulator needs `-PreactNativeArchitectures=x86_64` for one build. An Apple Silicon emulator is arm64. |
| D5 | `edgeToEdgeEnabled` | Keep `false` (both apps run `false`; the 0.88 template says `true`). Android 16 / targetSdk 36 enforces edge-to-edge anyway; the driver's `MainActivity` already pads `systemBars` top and bottom by hand (not on Home: it asks to be drawn under the bars, section 3.4). RN 0.86 changed edge-to-edge handling (section 3.4): device-check, do not touch the flag. |

---------------------------------------------------------------------------------------------------

## 1. Version table

"Driver today" = declared in `package.json` / `android/` / `ios/` and, where different, what is installed in `node_modules`.
"Sister" = `ordering-app-marketplace-theming` HEAD (and at `74f43cf` when that differs).
"Target" = what the driver should have after this step.

| Item | Driver today | Sister | Target | Note |
|---|---|---|---|---|
| react-native | 0.81.1 | 0.88.1 | **0.88.1** | exact pin |
| react | 19.1.0 | 19.3.0 | **19.3.0 (exact)** | RN 0.88.1's renderer reports `19.3.0` (`Libraries/Renderer/implementations/ReactFabric-dev.js`: `version: "19.3.0"`); `react` must match it exactly. Do NOT take 19.3.1 (the plan's "latest") |
| react-test-renderer | 19.1.0 | 19.3.0 | **19.3.0** | same pin as react |
| @types/react | ^19.1.0 (installed 19.3.0) | ^19.2.0 | **^19.2.0** | |
| @types/react-test-renderer | ^19.1.0 | ^19.1.0 | unchanged | |
| @react-native/babel-preset | 0.81.1 | 0.88.1 | **0.88.1** | |
| @react-native/eslint-config | 0.81.1 | 0.88.1 | **0.88.1** | |
| @react-native/metro-config | 0.81.1 | 0.88.1 | **0.88.1** | |
| @react-native/typescript-config | 0.81.1 | 0.88.1 | **0.88.1** | the driver's `tsconfig.json` does not extend it today |
| @react-native/jest-preset | (inside react-native) | 0.88.1 | **0.88.1 (new devDependency)** | extracted from `react-native` in 0.85 |
| @react-native-community/cli (+ -platform-android, -platform-ios) | 20.0.0 | 20.2.0 | **20.2.0** | the 0.88.1 template pins 20.2.0 |
| Metro | 0.83.8 (installed) | 0.87.2 | 0.87.x (comes with metro-config 0.88.1; RN 0.88 raised the minimum to 0.87.1) | not a direct dependency |
| @babel/core / @babel/preset-env / @babel/runtime | ^7.25 (7.29.7) | same | unchanged | the 0.88.1 template has the same ranges |
| Jest | ^29.6.3 (29.7.0) | same | unchanged | `@react-native/jest-preset` depends on jest 29 pieces |
| @testing-library/react-native | ^13.2.0 (13.3.3) | same | unchanged | |
| TypeScript | ^5.8.3 (5.9.3) | same (5.9.3) | unchanged | the 0.88.1 template says ^6.0.3; the sister stays on 5.9.3 and passes `tsc` with 0 errors |
| ESLint | ^8.19.0 (8.57.1) | same | unchanged | |
| Hermes | Hermes "legacy" `hermes-engine` 0.81.1 (Podfile.lock) | Hermes V1: `hermes-compiler` 260318099.0.5, pod `hermes-engine (260318099.0.5)` | **Hermes V1** (default since 0.84; nothing to set) | `hermesEnabled=true` stays. Sister gotcha: Hermes V1 does not compile `({ set = 'ion' }) =>` (shorthand `get`/`set` with a default in a destructuring). Grepped the driver's `src`, `index.js`, `App.tsx` for `{ get = ` / `{ set = `: 0 hits |
| Gradle wrapper | 8.14.3 | 9.4.1 | **9.4.1** | RN 0.82 moved the template to Gradle 9.0.0; 0.88.1 template 9.4.1. Gradle 9 removed `jcenter()` (see rn-config-reader) |
| Android Gradle Plugin | 8.11.0 (RN gradle plugin `libs.versions.toml` of 0.81.1) | 9.2.1 | **9.2.1** (pulled by `@react-native/gradle-plugin`, not declared in the app) | AGP 9 first supported by RN 0.87 |
| Kotlin | 2.1.20 | 2.2.0 | **2.2.0** | Gradle 9 embeds 2.2.0; RN 0.87 minimum Kotlin 2.0 |
| compileSdk | 36 | 37 | **37** | SDK platform 37.0 and build-tools 37.0.0 are installed on this machine (`~/Library/Android/sdk`) |
| buildTools | 36.0.0 | 37.0.0 | **37.0.0** | |
| targetSdk | 36 | 36 | 36 | unchanged |
| minSdk | 29 | 24 | **29 (keep)** | RN 0.88's own minimum is 24; the driver's 29 is its own choice |
| NDK | 27.1.12297006 | 27.1.12297006 | 27.1.12297006 | unchanged; installed here |
| JDK to build Android | 17 (plan: "fails with Android Studio's JDK 25") | JDK 25 (Android Studio JBR 25.0.3; sister commit `2d1c9ff` says "Android Studio ships JBR 25") | **17 minimum (Gradle 9 daemon needs 17+; AGP 9); JDK 25 works with Gradle 9.4.1 per the sister** | This machine: no `java` on PATH; Android Studio JBR 25.0.3 exists; `~/.gradle/jdks` has Temurin 17.0.20 (toolchain download). The "fails with 25" of the plan is a Gradle 8.14.3 matter (not verified here) |
| Node | `>=22` in `engines`; `NODE_VERSION.txt` 22; this machine runs 24.20.0 | `>= 22.13.0`; CI `node-version: 22`; `NODE_VERSION.txt` 22 | **`>= 22.13.0`** | RN 0.88.1 `engines`: `^22.13.0 \|\| ^24.3.0 \|\| >= 26.0.0`; `@react-native/jest-preset` `>= 22.13.0` |
| pnpm | 12.18.0 (done by the other agent) | 12.18.0 | 12.18.0 | |
| iOS deployment target | 15.1 (project and Podfile via `min_ios_version_supported`) | 15.1 (app 15.6 in two configs) | **15.1** (RN 0.88.1 `Helpers::Constants.min_ios_version_supported` = `'15.1'`) | |
| Xcode | this machine: Xcode.app 27.2 (but `xcode-select -p` points at CommandLineTools) | built with Xcode 26+ (sister CLAUDE.md) | RN 0.88.1 minimum **16.1** (`min_xcode_version_supported`); the UIScene lifecycle is mandatory with the iOS 27 SDK | run `sudo xcode-select -s /Applications/Xcode.app` if needed |
| CocoaPods | 1.17.0 (Podfile.lock); `Gemfile` `cocoapods ~> 1.13`; `.ruby-version` 3.3.10 (this shell's `ruby` is the system 2.6.10: use rbenv/bundler) | 1.17.0 | 1.17.0 | RN's iOS prebuilt core (`React-Core-prebuilt`) is the default since 0.84 |
| iOS architecture | new (`RCTNewArchEnabled` true) | new | new | pbxproj gains `-DRCT_REMOVE_LEGACY_ARCH=1` via `pod install` (sister `74f43cf` pbxproj diff) |
| Android architecture | **old** (`newArchEnabled=false`) | new (`newArchEnabled=true`) | **new** | `newArchEnabled=false` is *ignored by RN* from 0.82 (blog), but libraries read the property to choose their sources (`newarch`/`oldarch`, `paper`): 12 of the driver's native libraries do (grep of their `android/build.gradle`: background-fetch, gesture-handler, maps, permissions, safe-area-context, screens, vector-icons, async-storage, clipboard, netinfo, firebase app, sentry). Set it to `true` |
| Edge-to-edge (Android) | `edgeToEdgeEnabled=false` | `false` | `false` | D5 |

Library versions that change in the core step are in section 2.1 (table "native libraries").

---------------------------------------------------------------------------------------------------

## 2. File-by-file changes

Paths are relative to `/Users/work/Ordering/ordering-app-driver-theming`. "Sister" files are relative to `/Users/work/Ordering/ordering-app-marketplace-theming`.
The official diff (rn-diff-purge 0.81.1 -> 0.88.1, `tpl/`) touches only: `android/app/build.gradle`, `android/build.gradle`, `android/gradle.properties`, `gradle-wrapper.properties`, `MainApplication.kt`, `ios/Podfile` (one comment), `AppDelegate.swift` (+ new `SceneDelegate.swift`), `Info.plist`, `project.pbxproj`, `jest.config.js`, `package.json`. The rest below comes from the sister's history and from reading the driver's libraries.

### 2.1 `package.json` and `pnpm-workspace.yaml` (core packages only)

```diff
   "dependencies": {
-    "react": "19.1.0",
+    "react": "19.3.0",
-    "react-native": "0.81.1",
+    "react-native": "0.88.1",
   },
   "devDependencies": {
-    "@react-native-community/cli": "20.0.0",
-    "@react-native-community/cli-platform-android": "20.0.0",
-    "@react-native-community/cli-platform-ios": "20.0.0",
-    "@react-native/babel-preset": "0.81.1",
-    "@react-native/eslint-config": "0.81.1",
-    "@react-native/metro-config": "0.81.1",
-    "@react-native/typescript-config": "0.81.1",
+    "@react-native-community/cli": "20.2.0",
+    "@react-native-community/cli-platform-android": "20.2.0",
+    "@react-native-community/cli-platform-ios": "20.2.0",
+    "@react-native/babel-preset": "0.88.1",
+    "@react-native/eslint-config": "0.88.1",
+    "@react-native/jest-preset": "0.88.1",
+    "@react-native/metro-config": "0.88.1",
+    "@react-native/typescript-config": "0.88.1",
-    "@types/react": "^19.1.0",
+    "@types/react": "^19.2.0",
-    "react-test-renderer": "19.1.0",
+    "react-test-renderer": "19.3.0",
   },
   "engines": {
-    "node": ">=22"
+    "node": ">= 22.13.0"
   },
```

`pnpm-workspace.yaml` (current content read at 14:30):

```diff
 overrides:
-  react-native: 0.81.1
+  react-native: 0.88.1
+
+# Applied on every install; each one is explained in CLAUDE.md "Patches" (write it, as the sister did).
+patchedDependencies:
+  react-native-onesignal@4.5.2: patches/react-native-onesignal@4.5.2.patch
+  react-native-splash-screen@3.3.0: patches/react-native-splash-screen@3.3.0.patch
+  rn-config-reader@5.1.3: patches/rn-config-reader@5.1.3.patch
```

Copy the three files from `.../scratchpad/deps/patches/` into the driver's new `patches/` directory. The pnpm patch format is
`diff --git a/<path inside the package> b/...` (no `node_modules/` prefix); the sister converted its patch-package patches to this format in `f38af9e`, and `git apply --check -p1` was run here against the driver's installed copies of all three libraries. `pnpm install` fails if a patch does not apply, which is the intended alarm. If the Builder's Jenkins uses `pnpm install --frozen-lockfile` (marker `BUILD_PNPM.txt`, already in the repo), the patches and the lock apply there too (sister CLAUDE.md "Builder builds").

What each patch does:

* `react-native-onesignal@4.5.2` (3 hunks): (a) `android/build.gradle` `proguard-android.txt` -> `proguard-android-optimize.txt` (AGP 9 removed the first file); (b) Android `RNOneSignal.addTrigger(String, Object)` -> `addTrigger(String, Dynamic)`: the New Architecture's interop layer cannot read an `Object` parameter. **The driver calls `addTrigger` on both platforms at `src/navigators/RootNavigator.tsx:178` and `:204`**; (c) iOS `RCTOneSignalEventEmitter.m`: the module exports `setExternalUserId` and `removeExternalUserId` twice each (with and without callback); the interop layer keeps the first, JS calls the one with a callback ("called with too many arguments"). **The driver calls `OneSignal.setExternalUserId` at `RootNavigator.tsx:195`.** (c) was fixed by the sister 35 minutes after its upgrade commit (`5c9cb38` after `74f43cf`, same day).
* `react-native-splash-screen@3.3.0`: the same proguard line in its `android/build.gradle`.
* `rn-config-reader@5.1.3`: removes the library's `buildscript { repositories { jcenter() } dependencies { classpath 'com.android.tools.build:gradle:1.3.1' } }` block from `android/build.gradle`. Gradle 9.0.0 **removed** `RepositoryHandler.jcenter()` ("The `jcenter()` repository API has been removed in Gradle 9.0.0", Gradle 9 upgrade guide), so without the patch the project does not configure. This is the one blocker the sister app cannot show you (it has no such library). The driver uses the library only for two Android string resources (`RootNavigator.tsx:352-353`: `driver_location_permission_title`, `description_driver_location_permission`, declared in `android/app/src/main/res/values/strings.xml` `export_variables`).

Native libraries that change in the core step (all versions are the sister's, `package.json` at `74f43cf` / HEAD):

| Package | Driver today (declared / installed) | Target | Why it is in the core step |
|---|---|---|---|
| react-native-gesture-handler | 2.28.0 | **2.33.1** | **Required.** 2.28.0's `src/handlers/gestures/GestureDetector/utils.ts` imports `src/RNRenderer.ts`, which requires `react-native/Libraries/Renderer/shims/ReactNative`. That file does not exist in 0.88.1 (checked in the sister's `node_modules`: `Libraries/Renderer/shims/ReactFabric` exists, `.../shims/ReactNative` does not). Metro would fail to bundle. The sister's 2.33.1 has no `RNRenderer` |
| react-native-screens | 4.14.0 | 4.30.1 | sister-proven. Keep `super.onCreate(null)` in `MainActivity` (section 2.5) |
| react-native-safe-area-context | 5.8.0 | 5.11.1 | sister-proven |
| react-native-maps | 1.13.2 | 1.29.11 | sister-proven; Podfile and Android Play Services lines change (2.4, 2.8) |
| react-native-webview | ^11.22.7 (11.26.1) | ^14.0.1 | sister-proven. `react-native-signature-canvas` 4.7.4 already declares `peerDependencies: react-native-webview >=13`: the driver violates it today |
| react-native-permissions | 5.4.2 | 5.6.3 | sister-proven |
| react-native-device-info | ^10.4.0 (10.14.0) | ^15.0.2 | sister-proven; the driver only calls `getBuildNumber/getBundleId/getVersion/getSystemVersion` (`src/utils/sentry.ts:11-15`, `src/context/PermissionsContext.tsx:35`) |
| react-native-image-picker | ^4.0.6 (4.10.3) | ^8.3.0 | sister-proven; driver call sites: `src/ui/src/hooks/useStatusImage.tsx:25` (`launchCamera`), `src/ui/src/components/Chat/index.tsx:285`, `src/ui/src/components/UserProfileForm/index.tsx:158` (`launchImageLibrary`, callback style, still supported) |
| react-native-restart | ^0.0.27 | ^0.0.29 | sister-proven (0.0.29 is a TurboModule through its codegen spec); the driver's `RNRestart.Restart()` / `.restart()` calls (`OrdersOption/index.tsx:474`, `WebsocketStatus/index.tsx:87`, `pages/Login.tsx:28`) still exist (`Restart` is marked deprecated) |
| @sentry/react-native | 8.30.0 | 8.33.0 | sister-proven |
| @react-native-firebase/app, crashlytics, messaging | ^23.3.0 (23.8.8) | ^26.4.1 | D1 |
| react-native-country-picker-modal | ^2.0.0 | 3.0.0 | optional in this step; the driver only calls `getAllCountries` (`src/ui/src/components/PhoneInputNumber/index.tsx:5`); the sister dropped its 2.0.0 patch (React 19 `defaultProps` on function components) when it moved to 3.0.0 |

Keep as they are in this step: `@react-native-async-storage/async-storage` 2.2.0, `@react-native-clipboard/clipboard` ^1.16.0, `@react-native-community/netinfo` ^11.3.3, `@notifee/react-native` ^9.1.8 (plus the local-maven line in 2.2), `react-native-onesignal` 4.5.2 (+patch), `react-native-splash-screen` ^3.3.0 (+patch), `react-native-vector-icons` ^10.0.2 (the sister ran 10.x on 0.88.1 until its own migration, commit `4f26987`), `react-native-map-link` ^2.8.2 (JS only), `react-native-background-geolocation` ^4.14.6 (4.19.4), `react-native-background-fetch` ^4.2.1 (4.4.2), `react-native-sound-player`, `react-native-geolocation-service`, `rn-config-reader` (+patch), `react-native-signature-canvas`, both reCAPTCHA libraries, `@react-navigation/*` 6, `react-hook-form` 6, `styled-components` 6. (React Navigation 7 and react-hook-form 7 were part of the sister's 0.88 commit; the driver defers them to plan phase 6: **not proven** on 0.88 for the driver's versions, see "Not known".)

After editing: `pnpm install` (regenerates `pnpm-lock.yaml`; commit it, CI fails otherwise), then check `node_modules/react-native/package.json` is 0.88.1 and that exactly one `react-native` exists.

### 2.2 `android/build.gradle`

Full target file (changes against today: versions, Firebase plugins, repository block, `subprojects` block):

```gradle
buildscript {
    ext {
        buildToolsVersion = "37.0.0"
        minSdkVersion = 29
        compileSdkVersion = 37
        targetSdkVersion = 36
        ndkVersion = "27.1.12297006"
        kotlinVersion = "2.2.0"
        // bg-geolocation and react-native-geolocation-service read this key (D2)
        playServicesLocationVersion = "21.0.1"
    }
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath("com.android.tools.build:gradle")
        classpath("com.facebook.react:react-native-gradle-plugin")
        classpath("org.jetbrains.kotlin:kotlin-gradle-plugin")

        classpath("com.google.gms:google-services:4.4.4")
        classpath("com.google.firebase:firebase-crashlytics-gradle:3.0.8")
    }
}

allprojects {
    repositories {
        google()
        mavenCentral()
        // Notifee ships its core as a local Maven repository. Its own build script adds it to
        // every project, but with configure-on-demand and parallel builds (both on in
        // gradle.properties) that can run after :app resolved its dependencies (sister 74f43cf).
        maven { url "$rootDir/../node_modules/@notifee/react-native/android/libs" }
        // react-native-background-geolocation (its tslocationmanager AAR) and its HMS variant
        maven { url("${project(':react-native-background-geolocation').projectDir}/libs") }
        maven { url 'https://developer.huawei.com/repo/' }
        // react-native-background-fetch (its own android/libs does not exist in 4.4.2; mavenCentral
        // serves com.transistorsoft:tsbackgroundfetch). Remove the next line if nothing breaks.
        maven { url("${project(':react-native-background-fetch').projectDir}/libs") }
    }
}

apply plugin: "com.facebook.react.rootproject"

// AGP 9 turns BuildConfig off for libraries; several native libraries still declare BuildConfig
// fields (or read their BuildConfig) and stop configuring without it. (sister 74f43cf)
subprojects {
    plugins.withId("com.android.library") {
        android.buildFeatures.buildConfig = true
    }
}
```

Removed on purpose: `mavenLocal()`; `maven { url "$rootDir/../node_modules/react-native/android" }` and `jsc-android/dist` (neither directory exists in `node_modules` today: checked); the duplicated bg-fetch line. The HMS line is kept because it is part of the library's own documentation for its HMS variant (not verified that the driver ships HMS).

Libraries that need `buildConfig` (grep of the installed `android/build.gradle` files): async-storage, netinfo, sentry, background-fetch (sets it itself), gesture-handler, maps, permissions, safe-area-context, screens, vector-icons.

### 2.3 `android/gradle.properties`

```diff
-newArchEnabled=false
+newArchEnabled=true
 hermesEnabled=true
 edgeToEdgeEnabled=false
 android.enableJetifier=true
+
+# Opt out of built-in kotlin and new DSL behavior that ships with AGP 9.
+# Starting from AGP 10.x these opt outs will be removed.
+android.builtInKotlin=false
+android.newDsl=false
```

(The two flags are what the RN 0.87 post and the 0.88.1 template ship. `android.newDsl=false` keeps the legacy `android.applicationVariants` API that `react-native-vector-icons/fonts.gradle` and `react-native-background-geolocation/android/app.gradle` use: the sister ran vector-icons 10.3's `fonts.gradle` on AGP 9.2.1 at `74f43cf`, which proves that API, but **`app.gradle`'s `variant.mergeResourcesProvider.configure { doLast {...} }` was not exercised by the sister**; fallback if it fails: `ext.removeBackgroundGeolocationDebugSoundsInRelease = false` in `android/build.gradle`'s `ext`, which makes that script return immediately, at the cost of ~1.5 MB of debug sounds in release.)
Done (D4, 2026-11-23): `reactNativeArchitectures=armeabi-v7a,arm64-v8a` in `android/gradle.properties`; `-PreactNativeArchitectures=x86_64` overrides it for one build.
Keep `org.gradle.configureondemand=true` and `org.gradle.parallel=true` (the sister keeps both; they are why the Notifee line in 2.2 exists).

### 2.4 `android/app/build.gradle`

```diff
-    //   skip the bundling of the JS bundle and the assets. By default is just 'debug'.
+    //   skip the bundling of the JS bundle and the assets. Default is "debug", "debugOptimized".
-    // debuggableVariants = ["liteDebug", "prodDebug"]
+    // debuggableVariants = ["liteDebug", "liteDebugOptimized", "prodDebug", "prodDebugOptimized"]
 ...
-            proguardFiles getDefaultProguardFile("proguard-android.txt"), "proguard-rules.pro"
+            proguardFiles getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro"
             proguardFiles "${background_geolocation.projectDir}/proguard-rules.pro"
```

Everything else stays: `namespace "co.ordering.delivery"`, `applicationId`, the bg-geolocation `apply from: .../app.gradle`, `apply from: .../react-native-vector-icons/fonts.gradle`, the support-library `exclude` block, `androidx.core:core-splashscreen:1.0.1` (used by `MainActivity.installSplashScreen()`), `project(':react-native-vector-icons')`.

D2 (recommended): in `dependencies`, delete

```gradle
    implementation(project(':react-native-maps')){
      exclude group: 'com.google.android.gms'
    }
    implementation 'com.google.android.gms:play-services-base:18.0.1'
    implementation "com.google.android.gms:play-services-location:$playServicesLocationVersion"
    implementation 'com.google.android.gms:play-services-maps:18.0.2'
```

(`:react-native-maps` is autolinked by `autolinkLibrariesWithApp()`; the explicit `implementation project(...)` is redundant, and the `exclude` would leave the app's runtime classpath on play-services-maps **18.0.2** while the maps library 1.29.11 is compiled against **19.1.0**.) If the owner prefers to keep explicit lines, use the library's own versions: base 18.5.0, maps 19.1.0, location 21.3.0.
Note the `build.gradle` of maps 1.29.11 reads `googlePlayServicesLocationVersion`, the other two libraries read `playServicesLocationVersion`: two different keys. Gradle takes the highest version, so location ends at 21.3.0 whatever `ext` says.

### 2.5 `android/gradle/wrapper/*`, `gradlew`, `gradlew.bat`, `settings.gradle`

`gradle-wrapper.properties`: only `distributionUrl=https\://services.gradle.org/distributions/gradle-9.4.1-bin.zip`.
Also replace the binary and the scripts with the Gradle 9.4.1 ones (the sister's commit changed `gradle-wrapper.jar` 43764 -> 48966 bytes, `gradlew`, `gradlew.bat`):

```
cp /Users/work/Ordering/ordering-app-marketplace-theming/android/gradlew            android/gradlew
cp /Users/work/Ordering/ordering-app-marketplace-theming/android/gradlew.bat        android/gradlew.bat
cp /Users/work/Ordering/ordering-app-marketplace-theming/android/gradle/wrapper/gradle-wrapper.jar android/gradle/wrapper/gradle-wrapper.jar
```

(or `cd android && ./gradlew wrapper --gradle-version 9.4.1`; the first `./gradlew` needs Gradle 8.14.3 present, which is cached here.) `~/.gradle/wrapper/dists` already has `gradle-9.4.1-bin`.

`settings.gradle`: **no change** (identical to the 0.88.1 template apart from the app name and the manual `:react-native-vector-icons` include, which stays until vector-icons is migrated; the sister kept the same include at `74f43cf`).

### 2.6 Kotlin sources

Language today: Kotlin (`MainActivity.kt`, `MainApplication.kt`, `NotificationServiceExtension.kt`); no Java in the app. All in package `co.ordering.delivery` (see Builder note in section 6).

**`MainApplication.kt`**: must change (the 0.88 template removed `DefaultReactNativeHost`; `ReactApplication.reactNativeHost` now *throws* "You should not use ReactNativeHost directly in the New Architecture", read from `ReactApplication.kt` of 0.88.1). Today's file builds the app's custom `AlarmSoundPackage` inside a `DefaultReactNativeHost`. Target for the top of the file (everything from `object AlarmConstants` down stays byte for byte, including `createAlarmNotificationChannel`, `AlarmSoundPackage`, `AlarmSoundModule`):

```diff
 import com.facebook.react.ReactApplication
 import com.facebook.react.ReactHost
 import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
-import com.facebook.react.ReactNativeHost
 import com.facebook.react.ReactPackage
 import com.facebook.react.bridge.NativeModule
 ...
 import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
-import com.facebook.react.defaults.DefaultReactNativeHost
 import com.facebook.react.uimanager.ViewManager
 ...
 class MainApplication : Application(), ReactApplication {

-  override val reactNativeHost: ReactNativeHost =
-      object : DefaultReactNativeHost(this) {
-        override fun getPackages(): List<ReactPackage> =
-          PackageList(this).packages.apply {
-            add(AlarmSoundPackage())
-          }
-
-        override fun getJSMainModuleName(): String = "index"
-
-        override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG
-
-        override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
-        override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED
-      }
-
-  override val reactHost: ReactHost
-    get() = getDefaultReactHost(applicationContext, reactNativeHost)
+  override val reactHost: ReactHost by lazy {
+    getDefaultReactHost(
+      context = applicationContext,
+      packageList =
+        PackageList(this).packages.apply {
+          add(AlarmSoundPackage())
+        },
+    )
+  }

   override fun onCreate() {
     super.onCreate()
     loadReactNative(this)
     createAlarmNotificationChannel()
   }
```

* Keep `loadReactNative(this)` as the first thing after `super.onCreate()`: react-native-background-geolocation 4.19.4 and background-fetch 4.4.2 detect bridgeless at headless-task time with `DefaultNewArchitectureEntryPoint.getBridgelessEnabled()` via reflection (`HeadlessTaskManager.java:~245`, `HeadlessTask.java:169`), and fall back to `getReactNativeHost()` (which now throws) when it returns false. `getBridgelessEnabled` exists as a public static in 0.88.1 (`ReactAndroid.api`).
* Both libraries also call `getReactHost` by reflection on the Application class: the `reactHost` property getter satisfies it.
* `AlarmSoundModule` is a legacy `ReactContextBaseJavaModule` (`getName() = "AlarmSound"`, `@ReactMethod` with `String?` / no parameters, `invalidate()` override). It runs through the interop layer ("interop layers stay in the codebase for the foreseeable future", 0.82 post); none of its methods takes an `Object`/`ReadableMap` (the case the sister's OneSignal patch had to fix). `BaseJavaModule.invalidate()` and `ReactContextBaseJavaModule` exist in 0.88.1's `ReactAndroid.api`. JS reads it as `NativeModules.AlarmSound` (`NewOrderNotification/index.tsx:42`, `utils/index.tsx:120`). **Not proven on a device: it is the new-order alarm, test it first** (section 5).

**`MainActivity.kt`**: no change is required by the 0.88 diff (the template's still uses `DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)`, the driver's too). Keep `super.onCreate(null)`: the sister's `1d65bc6` ("React Native Screens cannot restore fragments from a previous process") did the same before moving to `RNScreensFragmentFactory` with bootsplash. Keep the manual `systemBars` padding (D5).

**`NotificationServiceExtension.kt`**: no change (OneSignal 4 API `OSRemoteNotificationReceivedHandler`).

### 2.7 `android/app/src/main/AndroidManifest.xml` and `android/app/src/debug/AndroidManifest.xml`

```diff
     <application
       android:name=".MainApplication"
+      android:usesCleartextTraffic="${usesCleartextTraffic}"
       android:label="@string/app_name"
```

and **delete** `android/app/src/debug/AndroidManifest.xml` (it only sets `usesCleartextTraffic="true"`; the RN Gradle plugin of 0.88.1 injects the placeholder: `AgpConfiguratorUtils.kt` sets `usesCleartextTraffic` to `"true"` in debug/debugOptimized and `"false"` in release). Sister did both in `74f43cf` (one declaration, set by the plugin per build type).

Observation, not required: `<activity android:name=".SearchActivity" ...>` names a class that does not exist in `android/app/src` (no `SearchActivity` in Kotlin/Java). It builds today; leave it unless the owner wants it gone.
`styles.xml`: no change (`windowOptOutEdgeToEdgeEnforcement` is ignored by Android 16 with targetSdk 36, honoured on API 35).

### 2.8 `ios/Podfile`

The 0.81.1 -> 0.88.1 template diff is one deleted comment line. The driver's Podfile needs these changes:

```diff
 platform :ios, min_ios_version_supported
+
+# Firebase 26 resolves through Swift Package Manager by default, which needs dynamic frameworks;
+# the app links its pods statically, so Firebase comes from CocoaPods (sister 74f43cf).   [only with D1]
+$RNFirebaseDisableSPM = true
 prepare_react_native_project!
 ...
 target 'ODelivery' do

-  # React Native Maps dependencies
-  rn_maps_path = '../node_modules/react-native-maps'
-  pod 'react-native-google-maps', :path => rn_maps_path
-  pod 'GoogleMaps', '7.4.0'
-  pod 'Google-Maps-iOS-Utils'
+  # React Native Maps with the Google provider (brings GoogleMaps and Google-Maps-iOS-Utils at the
+  # versions it supports: 9.4.0 / 6.1.0).
+  pod 'react-native-maps/Google', :path => '../node_modules/react-native-maps'
```

Why: maps 1.29.11 has no `react-native-google-maps.podspec` (the 1.13.2 package does; listing of `node_modules/react-native-maps` in both repos), and its `Google` subspec pins `GoogleMaps` 9.4.0 / `Google-Maps-iOS-Utils` 6.1.0, which a `GoogleMaps 7.4.0` pin would conflict with.
Keep: `OneSignalXCFramework 3.12.6` for the extension target (the library stays at 4.5.2), the Firebase modular-header pods, the `fmt` header patch (the sister keeps it on 0.88.1; whether 0.88's fmt 12.1.0 still needs it was not tested), the `CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES` and deployment-target loops, `setup_permissions([...])`.
Run `cd ios && bundle exec pod install` (regenerates `Podfile.lock`: hermes-engine -> 260318099.0.5, `React-Core-prebuilt`, OneSignal stays 3.12.6, RNFBApp 26.4.1).
`pod install` also rewrites `ios/ODelivery.xcodeproj/project.pbxproj` (the sister's diff shows `-DRCT_REMOVE_LEGACY_ARCH=1` in `OTHER_CFLAGS` / `OTHER_CPLUSPLUSFLAGS`, `PODFILE_DIR = "$(SRCROOT)"`, the `Pods_*` references and, with RNFB 26, a rewritten Crashlytics run-script): commit what it produces.

### 2.9 `ios/ODelivery/AppDelegate.swift` (UIScene already adopted; what 0.88 changes)

Today's file already splits `AppDelegate` (builds `RCTReactNativeFactory`, Firebase, Google Maps key) and `SceneDelegate` (`factory.startReactNative(withModuleName:in:launchOptions:)`, `RNSplashScreen.show()`), with a hand-made `launchOptions(_:_:)` that copies the scene's URL and web-browsing activity into the launch options. That matches the shape the sister runs on 0.88.1.

What 0.88 changes (RN 0.88 post, `RCTLinkingManager.h` and `RCTReactNativeFactory.h` of 0.88.1):

1. `RCTLinkingManager` has dedicated scene entry points: `+scene:openURLContexts:` and `+scene:continueUserActivity:`. Its app-delegate methods ("Invoke from AppDelegate for non-scene apps (no `UIApplicationSceneManifest` in Info.plist)") do nothing once the app has a scene manifest. **The driver's `SceneDelegate` still calls the app-delegate forms** (`AppDelegate.swift`, `scene(_:openURLContexts:)` and `scene(_:continue:)`, its own comment says "React Native 0.81 has no scene ones"). The sister fixed exactly this in `8bac0f7` six days after upgrading. The driver has no JS `Linking.getInitialURL()/addEventListener('url')` consumer (grep, section 3) and its `Info.plist` has no `CFBundleURLTypes`, so today nothing visible breaks; fix anyway so Builder-added URL types work:

```diff
   func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
-    guard let context = URLContexts.first else { return }
-    var options: [UIApplication.OpenURLOptionsKey: Any] = [:]
-    if let source = context.options.sourceApplication {
-      options[.sourceApplication] = source
-    }
-    _ = RCTLinkingManager.application(UIApplication.shared, open: context.url, options: options)
+    RCTLinkingManager.scene(scene, openURLContexts: URLContexts)
   }

   func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
-    _ = RCTLinkingManager.application(UIApplication.shared, continue: userActivity, restorationHandler: { _ in })
+    RCTLinkingManager.scene(scene, continue: userActivity)
   }
```

   and update the doc-comment of `SceneDelegate` accordingly (take the sister's, `ios/ReactNativeAppsTemplate5/AppDelegate.swift`). The `AppDelegate.application(_:open:options:)` can stay (UIKit no longer calls it).
2. New factory entry points `startReactNative(withModuleName:in:connectionOptions:)` and `...initialProperties:connectionOptions:` (official, "only the first URL context and user activity are used"). The 0.88.1 template's `SceneDelegate` uses `connectionOptions:`; the sister (proven) keeps `launchOptions:` with its own `launchOptions(_:_:)` helper. **Recommendation: keep the driver's current call** (`factory.startReactNative(withModuleName: "deliveryApp", in: window, launchOptions: SceneDelegate.launchOptions(...))`): same as the sister, minimal diff. Switching to `connectionOptions:` and deleting the helper is the documented alternative, not proven by the sister.
3. The factory/delegate classes are unchanged for this use: `RCTReactNativeFactory(delegate:)`, `RCTDefaultReactNativeFactoryDelegate` subclass overriding `sourceURL(for:)` and `bundleURL()` compiles on 0.88.1 in the sister (same two overrides). `delegate.dependencyProvider = RCTAppDependencyProvider()` unchanged.
4. Optional from the template: `RCTDevMenuConfiguration` in DEBUG (`reactNativeFactory.devMenuConfiguration = ...`). Not needed.
5. Placeholder rule (sister gotcha, Builder): never write `_GOOGLE_MAPS_API_KEY_` anywhere else in the file or in a comment; the Builder replaces every occurrence.

`RNSplashScreen.show()` in `scene(_:willConnectTo:...)` (blocks the main run loop until `SplashScreen.hide()`, `RNSplashScreen.m`) works today on the new architecture on iOS; unchanged.

### 2.10 `ios/ODelivery/Info.plist`, `PrivacyInfo.xcprivacy`, `project.pbxproj`

* `Info.plist`: **nothing is mandatory.** `RCTNewArchEnabled` true and `UIApplicationSceneManifest` (`$(PRODUCT_MODULE_NAME).SceneDelegate`, `UIApplicationSupportsMultipleScenes` false) are already there. The 0.88.1 template additionally adds `CADisableMinimumFrameDurationOnPhone` true (120 Hz on ProMotion phones), `UISupportedInterfaceOrientations~ipad`, and `UIRequiresFullScreen` true; the sister did not take any. Optional: `CADisableMinimumFrameDurationOnPhone`.
* `PrivacyInfo.xcprivacy`: the sister added reason `3B52.1` to `NSPrivacyAccessedAPICategoryFileTimestamp` in `74f43cf` (cause not stated). The driver already lists `C617.1` and `0A2A.1`. Add `3B52.1` to match.
* `project.pbxproj`: besides what `pod install` writes (2.8), update the "Bundle React Native code and images" shell script to the quoted form of the 0.88.1 template (paths with spaces):

```diff
-shellScript = "set -e\n\nWITH_ENVIRONMENT=\"$REACT_NATIVE_PATH/scripts/xcode/with-environment.sh\"\nREACT_NATIVE_XCODE=\"$REACT_NATIVE_PATH/scripts/react-native-xcode.sh\"\n\n/bin/sh -c \"$WITH_ENVIRONMENT $REACT_NATIVE_XCODE\"\n";
+shellScript = "set -e\n\nWITH_ENVIRONMENT=\"$REACT_NATIVE_PATH/scripts/xcode/with-environment.sh\"\nREACT_NATIVE_XCODE=\"$REACT_NATIVE_PATH/scripts/react-native-xcode.sh\"\n\n/bin/sh -c \"\\\"$WITH_ENVIRONMENT\\\" \\\"$REACT_NATIVE_XCODE\\\"\"\n";
```

  The template also sets `TARGETED_DEVICE_FAMILY = "1,2"` and `SUPPORTED_PLATFORMS = "iphoneos iphonesimulator"`; the driver is portrait/full-screen, do not take the iPad family without a decision. Deployment target is already 15.1.
* `ios/.xcode.env` unchanged (`NODE_BINARY=$(command -v node)`).

### 2.11 `metro.config.js`, `babel.config.js`, `index.js`, `App.tsx`, `react-native.config.js`

* `metro.config.js`: **no functional change** (identical in the sister; only its header comments differ: `https://reactnative.dev/docs/metro` and `@type {import('@react-native/metro-config').MetroConfig}`). Metro 0.87 drops YAML and `.es6` config files: not used.
* `babel.config.js`: **no change** (`presets: ['module:@react-native/babel-preset']` + `module-resolver` with the `@`, `@ui`, `@components` aliases).
* `index.js`, `App.tsx`, `react-native.config.js`: no change. (`App.tsx` registers four `SoundPlayer.addEventListener` listeners that are never removed: pre-existing.)
* `rn-cli.config.js` references `react-native-typescript-transformer`, which is not installed, and no tool reads it: dead file, can be deleted (not required).

### 2.12 `jest.config.js`, `jest/setup.js`

```diff
 module.exports = {
-  preset: 'react-native',
+  preset: '@react-native/jest-preset',
```

and in `jest/setup.js` remove (the sister removed the same line in `74f43cf`):

```diff
-jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper', () => ({}), { virtual: true })
```

Everything else in `jest.config.js` (`moduleNameMapper`, `transformIgnorePatterns`, `testMatch` with `<rootDir>/jest/**` and `src/**`) stays; the sister's `process.env.TZ` and `forceExit` are its own. `transformIgnorePatterns` already covers `@?react-native`, `@react-navigation`, `styled-components`, the theme engine. Verify with `pnpm test` that the Animated tests still pass (`Skeleton`, `SkeletonBone`, `OToast`, `Chat/ImageViewer`): the 0.85 post says the Animated backend changed ("New Animation Backend"); if a native-animated warning appears, mock the helper at the path the 0.88 `Animated` imports (`react-native/src/private/animated/NativeAnimatedHelper`) rather than putting the line back (**not tested**).
Tests that read RN internals and may move: `jest.replaceProperty(StatusBar, 'currentHeight', 24)` (`pages/__tests__/Splash.test.tsx:64`) is fine (`StatusBar.currentHeight` is still a static in 0.88.1's `StatusBar.js:267`); `appContainer.test.tsx:28,58,66` look up `StatusBar` by type (section 3.2, `backgroundColor` removal).

### 2.13 `tsconfig.json`

Today's file is a full hand-written config (`module: commonjs`, `moduleResolution: node`, `lib: ["es2017"]`). 0.88's `@react-native/typescript-config` is `target/module esnext`, `moduleResolution: bundler`, `customConditions: ["react-native"]`, `types: ["jest"]`, Hermes-oriented `lib`, `skipLibCheck`. The sister moved to it in `c979620` ("the 175 errors inside libraries' declarations were theirs, not the app's") and 0.87 made the strict TypeScript API the default (deep imports of `react-native/Libraries/*` are type errors; the temporary opt-out `customConditions: ["react-native", "react-native-legacy-deep-imports"]` exists "through 0.88"). Target (keeps the driver's `paths`, plugin and excludes):

```jsonc
{
  "extends": "@react-native/typescript-config",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "react": ["./node_modules/@types/react"],
      "@/*": ["src/*"],
      "@": ["src/*"],
      "@components": ["src/@/components/native/index.js"],
      "@ui": ["src/ui/index.tsx"],
      "@orderingco/ordering-theme-engine/runtime": ["node_modules/@orderingco/ordering-theme-engine/dist/runtime.d.ts"],
      "@orderingco/ordering-theme-engine/native": ["node_modules/@orderingco/ordering-theme-engine/dist/native.d.ts"],
      "@orderingco/ordering-theme-engine/colors": ["node_modules/@orderingco/ordering-theme-engine/dist/palette.d.ts"]
    },
    "plugins": [{ "name": "typescript-styled-plugin", "lint": { "unknownProperties": "ignore" } }]
  },
  "exclude": [
    "node_modules", "babel.config.js", "metro.config.js", "jest.config.js", "jest", "scripts", "coverage",
    "__tests__", "**/__tests__", "android", "ios", "src/@/components"
  ]
}
```

Expect new `tsc` errors: at least `StatusBar backgroundColor` (3.2), and possibly `useRef<TextInput>` / `useRef<ScrollView>` (8 sites, section 3.7; the sister still compiles `useRef<TextInput>` in `PhoneInputNumber/index.tsx:67` but uses `TextInputInstance` in `SearchBar`, `UserVerification`, `LegacyPlacesInput`). Run `npx tsc --noEmit` before and after and compare; fix in the same step (the sister needed a separate "typecheck passes with 0 errors" commit afterwards).

### 2.14 `.github/workflows/ci.yml` and other CI/Builder files

* `ci.yml` (already pnpm: `pnpm/action-setup@v6`, `node-version: 22`, `cache: pnpm`): **no change required.** `node-version: 22` resolves to the latest 22.x (>= 22.13). There is no Android/iOS build or JDK step in this workflow: nothing to add for JDK. Its "Release bundles build (iOS and Android)" step (`npx react-native bundle ...`) is the CI check that would have caught the gesture-handler 2.28 import above; keep it.
* `NODE_VERSION.txt` (22) read by the Builder: unchanged; **not verified** what exact 22.x the Builder installs (needs >= 22.13).
* `BUILD_PNPM.txt`: already present. `Gemfile`, `.ruby-version`: unchanged.
* `CLAUDE.md` of the driver: update the stack line (RN 0.81.1 -> 0.88.1, React 19.1 -> 19.3), the Android architecture, a "Patches" gotcha for the three patches, and the Hermes V1 gotcha.

---------------------------------------------------------------------------------------------------

## 3. Breaking changes 0.82 -> 0.88 that touch this app's code

Scope of the grep: `src` (331 files, `src/@/` excluded), `index.js`, `App.tsx`; tests included and marked `[test]`. The submodule (`src/@/components`) was grepped apart: its React Native surface is **one import** (`@react-native-async-storage/async-storage` in `native/src/NativeStrategy/index.js`); no hit for any removed API. Its 138 `defaultProps` hits are all a local `const defaultProps = {...}` merged by object spread, not React's static property.

### 3.1 What the releases changed (summary, with source)

| Version | Breaking or relevant change |
|---|---|
| 0.82 | New Architecture only (`newArchEnabled=false` ignored on Android, `RCT_NEW_ARCH_ENABLED=0` on iOS); Gradle 9.0.0; uncaught promise rejections now raise `console.error`/uncaught error mechanism; `Appearance.setColorScheme(null)` -> `'unspecified'`; `JSONArguments` removed (Android); interop layers stay |
| 0.83 | none for users; React 19.2; Android deprecations `sendRequestInternal`, `startOperationBatch`/`finishOperationBatch` |
| 0.84 | Hermes V1 default; iOS precompiled binaries default; legacy-arch code no longer compiled on iOS (`RCT_REMOVE_LEGACY_ARCH`); Android removed `LazyReactPackage`, `CxxModuleWrapper(Base)`, `CallbackImpl`, `OnBatchCompleteListener`, `BridgeDevSupportManager`, `LayoutAnimationController`... ; Node >= 22.11 |
| 0.85 | **`StyleSheet.absoluteFillObject` removed**; Jest preset to `@react-native/jest-preset`; `CatalystInstanceImpl` removed, `NativeViewHierarchyManager` stubbed, `UIManagerHelper` deprecated (Android); `AccessibilityInfo.setAccessibilityFocus` deprecated; new Animation backend |
| 0.86 | none breaking; edge-to-edge fixes (`measureInWindow`, `KeyboardAvoidingView`, `Dimensions`, `StatusBar` inside Modal, nav-bar contrast); `BackHandler` events carry an event object and are re-registered in `onHostResume` (API 36 fix); `Image.getSize` returns true dimensions; non-invertible transforms (`scaleX: 0`) receive no touches |
| 0.87 | Strict TypeScript API default; **`InteractionManager` removed**; **`StatusBar` `backgroundColor`/`translucent`/`networkActivityIndicatorVisible` props and setters removed**; `Modal` `animated` prop removed; boolean `keyboardShouldPersistTaps` removed; `useColorScheme()` can return null; `*Properties` type aliases removed; AGP 9 supported; Kotlin >= 2.0; compileSdk/buildTools 37; deprecations `ImageBackground`, `InputAccessoryView` (0.88), `DrawerLayoutAndroid`, `UIManagerModule.addUIBlock` |
| 0.88 | iOS SceneDelegate support (new `startReactNative...connectionOptions:`; `RCTLinkingManager.scene...`); web-style event dispatching default (code reaching into RN event internals may break); Android default `User-Agent` now includes the app name and version; `ReactFragment.fabricEnabled` no effect; codegen no longer crawls `node_modules` symlinks (iOS); React 19.3.0 |
| React 19.2 / 19.3 | `useId` prefix `_r_` (19.2; `«r»` in 19.1); hidden `<Activity>` unmounts effects; 19.3: dev warning for conditional `use()`, transitions render independently; `eslint-plugin-react-hooks` 6 changes its `recommended` preset |

### 3.2 Hits that need a code change

| Removed or changed API | Hit (`path:line`) | Action |
|---|---|---|
| `StyleSheet.absoluteFillObject` (removed 0.85) | `src/ui/src/components/Chat/ImageViewer.tsx:58`, `src/ui/src/components/DriverMap/index.tsx:393`, `src/ui/src/components/MapView/index.tsx:27`, `src/ui/src/components/MapView/index.tsx:191` | replace with `StyleSheet.absoluteFill` (a frozen style object: spread it where the code spreads, pass it where it passes) |
| `StatusBar` `backgroundColor` prop (removed 0.87; ignored by Android 15+ edge-to-edge anyway) | `src/appContainer.tsx:21-25` (`<StatusBar animated backgroundColor={background} barStyle=.../>`) | drop `backgroundColor` (TS error otherwise). The colour behind the status bar must come from the content or the window background: **device-check** the Android top bar on API 35 and 36; `src/__tests__/appContainer.test.tsx:58-66` (reads the StatusBar by type) may need its expectation changed |

### 3.3 Hits that need no change but were checked

| API | Hits | Verdict |
|---|---|---|
| `SafeAreaView` from `react-native` | none. `src/ui/src/components/MapView/index.tsx:9,178,256` use `react-native-safe-area-context`'s | fine |
| `BackHandler.removeEventListener` | none. `src/ui/src/components/OrderMessage/index.tsx:114-116` uses `addEventListener(...)` + `subscription.remove()` | fine; 0.86 re-registers hardware-back handlers on resume for API 36: check back press on that screen after a background/resume |
| `InteractionManager` | none (app and submodule) | fine |
| `PushNotificationIOS`, `Clipboard` from RN core | none; clipboard is `@react-native-clipboard/clipboard` (`Chat/index.tsx:10,721`, `OrderDetails/Delivery.tsx:5,487`) | fine |
| `findNodeHandle`, `UIManager`, `setNativeProps`, `requireNativeComponent` | none | fine |
| `measure` / `measureInWindow` | `src/pages/Splash.tsx:45` (`measureInWindow` + `StatusBar.currentHeight` to place the splash image), `src/ui/src/components/AcceptOrRejectOrder/index.tsx:209` (`view.measure((x, y) => scrollView.scrollTo({x:0,y}))`) | `measure*` stay on host components in the new architecture (0.82 post). 0.86 changed `measureInWindow` under edge-to-edge: **device-check the Splash image position on Android**; the `scrollTo` uses `y` relative to the parent: check on the order-reject form |
| `defaultProps` | none in `src`; submodule: local objects only | fine |
| `unstable_*`, `react-native/Libraries/...` deep imports | none in the app; third-party deep imports checked in section 4 | fine for the app |
| `Animated` `useNativeDriver: true` | `Chat/ImageViewer.tsx:69`, `shared/OToast.tsx:32,41`, `shared/Skeleton.tsx:43,44`, `shared/SkeletonBone.tsx:37,42` | all on `opacity` / `transform` (natively animatable); fine. `Skeleton.tsx:43-44` pass `isInteraction: false` (still a valid option) |
| `Modal` | `Chat/ImageViewer.tsx:101` (`statusBarTranslucent`, `navigationBarTranslucent`), `shared/LoadingOverlay.tsx:23`, `shared/OBottomPopup.tsx:77`, `shared/OModal.tsx:153` | none uses `animated` (removed); they use `animationType`. Edge-to-edge: check full-screen modals |
| `keyboardShouldPersistTaps` | 10 uses, all the string `'handled'` | fine (booleans were removed) |
| `useColorScheme` / `Appearance` | none | fine |
| `InputAccessoryView`, `DrawerLayoutAndroid`, `LayoutAnimation` | none | fine |
| `ImageBackground` | `src/ui/src/components/Home/styles.tsx:3` (`styled.ImageBackground`) | deprecated in 0.87 (a `View` + absolutely positioned `Image` is the replacement); still works. Not in this step |
| `TouchableWithoutFeedback` | `shared/OBottomPopup.tsx:2,90` | still exported; fine |
| `AccessibilityInfo` | `src/theme/AppThemeContext.tsx:30-31` (`isReduceMotionEnabled`, `addEventListener('reduceMotionChanged')`) | fine (only `setAccessibilityFocus` was deprecated) |
| `Dimensions` / `useWindowDimensions` | 31 hits (listed in `src-grep.txt`); `src/ui/src/hooks/DeviceOrientation.tsx:20` adds a `Dimensions` listener and never removes it (pre-existing) | fine; 0.88 on iOS with scenes: window dimensions update with the scene |
| `DeviceEventEmitter` | `src/navigators/RootNavigator.tsx:672-676` (`addListener('change_project')` / `removeAllListeners`), `src/ui/src/components/Home/index.tsx:117` (`emit`) | JS-only, fine |
| `NativeModules` | `RootNavigator.tsx:321` (`NotificationSettings`, iOS Swift `RCT_EXTERN_MODULE`: already new-arch on iOS), `:704`, `:718` (`DeveloperOptions`, see below), `NewOrderNotification/index.tsx:42` (`AlarmSound`), `:75` (`RNSoundPlayer.playUrl`), `src/utils/index.tsx:120` | see section 4. **`NativeModules.DeveloperOptions` has no native implementation anywhere in the repo or in `node_modules`** (Kotlin, Java, Swift, Obj-C, gradle all grepped): `validate_developer_mode` can only ever read `undefined`. Pre-existing; not in the scope of this step |
| `LogBox.ignoreLogs` | `src/DeliveryApp.tsx:15,35` | fine |
| `Linking` | only `openURL` / `canOpenURL` (`AcceptOrRejectOrder:573`, `Chat/index.tsx:730,736`, `Chat/ChatThread.tsx:226`, `StripeConnectAccount:150`, `shared/OLink.tsx:86-90`); no `getInitialURL` / `url` listener | the iOS deep-link change in 2.9 has no JS consumer today |
| `Vibration`, `Alert`, `AppState`, `Keyboard`, `PixelRatio`, `KeyboardAvoidingView` | listed in `src-grep.txt` | no removed API used; `KeyboardAvoidingView` on Android with edge-to-edge changed in 0.86 for the better; device-check forms with the keyboard (Login, AcceptOrRejectOrder, OrderMessage) |
| `unhandled promise rejections` (0.82) | n/a (behaviour) | the app now reports every previously swallowed rejection: expect a **spike of new events in Sentry** (`src/utils/sentry.ts`, `tracesSampleRate 0.1`) in the first release; plan for triage |
| Android default `User-Agent` (0.88) | n/a | RN's networking now sends an app name and version in the default UA; the sister sets its own UA natively (`UserAgent.kt`/`AppDelegate.swift`). The driver sets none: **check whether the Ordering API or any proxy keys on the old UA** (not known) |

### 3.4 Edge-to-edge (Android) in one place

targetSdk 36 + Android 16 enforces edge-to-edge regardless of `edgeToEdgeEnabled`; `windowOptOutEdgeToEdgeEnforcement` (in `styles.xml`) is honoured only up to API 35. The driver compensates in `MainActivity` (top and bottom `systemBars` padding on `android.R.id.content`), except while a screen has asked to go under the bars: the Home screen (a photo from edge to edge) does, while it is focused. The padding is read from `ContentInsets.kt` (`underBars`, process-wide state, so a recreated activity finds what the screen asked for) each time the insets are applied; `src/pages/Home.tsx` asks through `src/utils/contentUnderBars.ts` → `WindowBackground.setContentUnderBars`, which also turns the navigation bar's icons light (and puts them back) and asks for the insets again; the status bar's icons are JavaScript's (`StatusBar`). Because the safe-area insets report the bars while the padding is off, a screen that asks must handle its own insets (Home's content ends `account_page.base.padding_bottom` plus the inset above the bottom edge on Android). Seen on the Android emulator (API 37, where the opt-out is ignored); **not seen on Android 14 and earlier, nor on 15 with the opt-out of `styles.xml`** (by reading, unchanged there: the content view gets no bar insets, so the padding is 0 either way). 0.86 fixed `measureInWindow`, `Dimensions`, `KeyboardAvoidingView`, `StatusBar` in Modal and navigation-bar contrast for exactly the case "the OS enforces it without `edgeToEdgeEnabled`". Whether the manual padding and the new RN behaviour double-count insets is **not known**: check Splash, `OBottomPopup` (bottom sheet), `Chat/ImageViewer` (translucent bars) and the bottom tab bar on an API 35 and an API 36 device.

### 3.5 React 19.2 / 19.3 items

No `Activity`, `useEffectEvent`, `use()` or `useId` in `src` or the submodule that I looked for (not exhaustively grepped); `defaultProps` on function components has been gone since React 19.0 and the app already runs 19.1. `eslint-plugin-react-hooks` v6 is not a direct dependency (comes through `@react-native/eslint-config`).

### 3.6 New iOS 0.88 behaviour

Web-style event dispatching is the default: code that reaches into RN's event plugin registry would break; the app and the submodule do not (no `ReactNativeBridgeEventPlugin`, `unstable_batchedUpdates` tricks etc. found by the `unstable_` grep).

### 3.7 TypeScript surface (strict API)

`useRef<TextInput>` / `useRef<ScrollView>` / `useRef<FlatList<T>>` in: `src/ui/src/components/PhoneInputNumber/index.tsx:78`, `Home/index.tsx:45`, `Chat/ChatThread.tsx:252`, `OrdersOption/index.tsx:161`, `shared/OOtpInput.tsx:37`, `shared/Pager.tsx:73`, `AcceptOrRejectOrder/index.tsx:93-94`. The sister uses `TextInputInstance` (type import from `react-native`) in 3 files and `useRef<TextInput>` in 1; both compile there. No use of `*Properties` aliases, `NativeMethods`, `Touchable` root type or `react-native/Libraries/*` types in the app (grep). `src/types/index.tsx` imports `TextInputProps`, `ViewStyle` only.

---------------------------------------------------------------------------------------------------

## 4. The new architecture on Android: native dependencies of this app

How to read "status":
* **proven** = the same library at that version builds and runs in `ordering-app-marketplace-theming` on RN 0.88.1 (commit `74f43cf` or later; the sister's repository does not document device test results beyond its commit messages, so "runs" means what its commits and CLAUDE.md state).
* **claimed by docs** = the library's own changelog/source says it supports the new architecture; not run in the sister.
* **unknown** / **known not to work** as written.

Evidence method for the "legacy module" rows: Android sources of every installed native dependency were scanned for `com.facebook.*` imports and checked against the public API listing of RN 0.88.1 (`ReactAndroid.api`): no import of a class removed in 0.82-0.88 (`android-imports.txt`; the residual "missing" lines are codegen output, `FLog`, Fresco, annotations: false positives). This does not detect removed *methods*.
Legacy `ReactContextBaseJavaModule` modules run through the interop layer; its known limit (from the sister's OneSignal fix): a `@ReactMethod` parameter typed `Object`, and two methods exported under one name.

| Library (driver version) | Kind | Status on Android new arch | Evidence / what to watch |
|---|---|---|---|
| **react-native-background-geolocation 4.19.4** (keep; plan phase 5 -> 5.8.2) | legacy module + headless task | **claimed by docs** | Library CHANGELOG: "4.18.0 (2024-12-02): Android: implement support for new 'Bridgeless Architecture'"; 5.0.0-beta.2 "Implement React Native Turbo Modules". 5.8.2 (2026-10-29) fixes "an Android ANR at launch" with "React Native's New Architecture" (version range affected not stated). Source check of the installed 4.19.4: `HeadlessTaskManager.java` has a bridgeless branch (reflection on `getReactHost`, `DefaultNewArchitectureEntryPoint.getBridgelessEnabled`) - both present in 0.88.1. No `Object` parameters (all `ReadableMap` + `Callback`). `android/build.gradle` uses `implementation "com.facebook.react:react-native:+"`, which the RN Gradle plugin substitutes with `react-android` (`DependencyUtils.kt`). `app.gradle` uses the legacy variant API (needs `android.newDsl=false`, 2.3). It depends on `react-native-background-fetch ~4.2.6` and ships a **nested** `node_modules/react-native-background-fetch` 4.2.9 next to the top-level 4.4.2. **Not proven in the sister (it has no background location). The riskiest library of the step: a real device, app in background and killed (plan U6)** |
| **react-native-background-fetch 4.4.2** (keep) | TurboModule (`codegenConfig` `RNBackgroundFetchSpec`) | **claimed by docs** | CHANGELOG 4.4.0 (2026-04-14) "Migrate to TurboModule architecture", 4.2.6 "Implement support for new Bridgeless Architecture", an "Unreleased" entry says "verified on React Native 0.88.1" (iOS SwiftPM entry). Android `build.gradle` reads `rootProject.newArchEnabled == "true"` for its own `BuildConfig.IS_NEW_ARCHITECTURE_ENABLED`: another reason for `newArchEnabled=true`. Not used from JS in the driver's `src` (only as bg-geo's companion) |
| **react-native-sound-player 0.13.4** (keep; plan: 0.14.5) | legacy module (Java, Obj-C) | **unknown** | README on GitHub: "This package is no longer actively maintained"; no mention of the new architecture. Source: `@ReactMethod`s with `String`/`double`/`int`, `addListener`/`removeListeners` present, `index.js` deep-imports `react-native/Libraries/Image/resolveAssetSource` (exists in 0.88.1; the package `exports` map keeps `./Libraries/*` -> `./Libraries/*.js` at runtime). On Android it is only the fallback of the app's own `AlarmSound` module (`NewOrderNotification/index.tsx:50-75`); it is the sound path on iOS (already new-arch there). `android/build.gradle` hard-codes `compileSdkVersion 31` / `buildToolsVersion "28.0.3"` (react-android 0.88.1's AAR metadata says `minCompileSdk=34`; whether AGP 9 objects for a library module: not known, the build tells) |
| **react-native-signature-canvas 4.7.4** | JS + WebView | n/a (JS) | needs `react-native-webview >=13` (peer): fixed by webview 14.0.1 (proven) |
| **rn-config-reader 5.1.3** (keep + patch; plan phase 7 replaces) | legacy module, constants only (`getConstants`) | **known not to work unpatched**; patched: **unknown** at runtime | `android/build.gradle` has `buildscript { repositories { jcenter() } ... classpath 'com.android.tools.build:gradle:1.3.1' }`: `jcenter()` is removed in Gradle 9.0 (Gradle 9 upgrade guide). The library's GitHub page says nothing about the new architecture. After the patch (2.1) it is a 1-method legacy module; constants through interop are the unverified part. Used at `RootNavigator.tsx:352-353` only |
| **react-native-recaptcha-that-works 1.3.2**, **@fatnlazycat/react-native-recaptcha-v3 1.0.3** | JS + WebView | n/a (JS) | the sister ran the latter at `74f43cf` on 0.88.1 before replacing it (`9856854`); both need webview |
| **react-native-map-link 2.11.4** | JS (`Linking`) | n/a (JS); sister ran ^2.8.2 on 0.88.1 | plan phase 3 moves to 3.15.0 (sister `1f0a494`) |
| **react-native-country-picker-modal 2.0.0** | JS | n/a; data only (`getAllCountries`) | sister: 2.0.0 needed a `defaultProps` patch, 3.0.0 does not |
| **react-native-device-info 10.14.0 -> 15.0.2** | legacy module | **proven at 15.0.2** | sister `^15.0.2` |
| **react-native-image-picker 4.10.3 -> 8.3.0** | legacy module (activity result) | **proven at 8.3.0** | sister `^8.3.0` |
| **react-native-geolocation-service 5.3.1** (keep) | legacy module (Java + Swift) | **unknown** | README table only says RN >=0.60; no new-architecture statement. `@ReactMethod`s take `ReadableMap` + `Callback`, no `Object`. Used by `src/hooks/useLocation.tsx:2` and `src/ui/src/hooks/useLocation.tsx:2` (foreground fix). Plan phase 5 may drop it |
| **react-native-splash-screen 3.3.0** (keep + patch; plan phase 7 -> bootsplash) | legacy module + Activity helper | **proven with the patch** | sister ran it from `74f43cf` until `b7fed3f`; the patch only changes the proguard file. Known issue stated by the sister at `b7fed3f`: "opened a dialog over Android 12's system splash: a blank white screen, then the image" - the driver combines it with `androidx.core:core-splashscreen`; behaviour at 0.81 is the baseline |
| **react-native-restart 0.0.27 -> 0.0.29** | TurboModule via codegen spec (0.0.29) | **proven at 0.0.29** | sister `^0.0.29`; `Restart()` still exported (deprecated). 0.0.27 `RestartModule.java` still calls `reactApplication.getReactNativeHost()` in a dead path (it would throw now) |
| **@notifee/react-native 9.1.8** (keep; plan phase 4 -> notify-kit) | legacy module | **proven** (sister `74f43cf` ran 9.1.8; archived upstream; moved to `react-native-notify-kit` in `57aae19` for maintenance, not for a failure) | needs the local-maven repo line (2.2). Android Studio JBR 25 builds it (`2d1c9ff`: only notify-kit's script rejects JDK 25) |
| **react-native-onesignal 4.5.2** (keep + patch; plan phase 4 -> 5.5.17) | legacy module | **proven only with the sister's patch** | sister `5c9cb38` + `74f43cf`; `Dynamic` for `addTrigger`, one iOS method per name, proguard line. Driver call sites: `RootNavigator.tsx:146-205` (`setLogLevel`, `setNotificationOpenedHandler`, `addSubscriptionObserver`, `addTrigger` x2, `setAppId`, `setEmail`, `setSMSNumber`, `setExternalUserId`, `getDeviceState`, `promptForPushNotificationsWithUserResponse`) |
| **@react-native-firebase/app, crashlytics, messaging 23.8.8** | legacy modules | 23.8.8: **unknown** on 0.88; **26.4.1: proven** | D1. `index.js` registers `setBackgroundMessageHandler(getMessaging(), async () => {})`; the sister (ORD-2425) removed the messaging headless service from its manifest so background pushes do not boot RN: not part of this step |
| **@sentry/react-native 8.30.0 -> 8.33.0** | TurboModule/Fabric | **proven at 8.33.0** | sister |
| **react-native-maps 1.13.2 -> 1.29.11** | Fabric + legacy | **proven at 1.29.11** (customer app's maps) | driver uses `MapView`, `Marker`, `Callout`, `PROVIDER_GOOGLE`, `animateToRegion`, `fitToCoordinates`, `tracksViewChanges` (`DriverMap/index.tsx`, `MapView/index.tsx`, `RenderMarker.tsx`): the driver's map screens are heavier than the sister's address map: **test them** |
| **react-native-webview 11.26.1 -> 14.0.1** | Fabric view | **proven at 14.0.1** | 11.26.1: unknown/peer-violating |
| **react-native-vector-icons 10.3.0** | codegen + fonts.gradle | **proven** (sister ran 10.x on 0.88.1 until `4f26987`) | `fonts.gradle` uses `android.applicationVariants.all` (needs `android.newDsl=false`) |
| **@react-native-community/netinfo 11.5.2**, **@react-native-async-storage/async-storage 2.2.0**, **@react-native-clipboard/clipboard 1.16.3** | TurboModules | **proven** (same ranges in the sister) | |
| **react-native-gesture-handler 2.28.0 -> 2.33.1** | Fabric | 2.28.0: **known not to work** (missing RN shim); 2.33.1: **proven** | 2.1 |
| **react-native-screens 4.14.0 -> 4.30.1**, **react-native-safe-area-context 5.8.0 -> 5.11.1**, **react-native-permissions 5.4.2 -> 5.6.3** | Fabric / TurboModules | **proven** at the target versions | sister |
| **App's own `AlarmSound` module** (`MainApplication.kt`) | legacy Kotlin module via `ReactPackage` | **claimed by docs** (interop) | no sister equivalent |
| **App's own iOS `NotificationSettings`** (Swift + `RCT_EXTERN_MODULE`) | legacy | already running on the new arch on iOS | |
| `@react-navigation/*` 6, `react-hook-form` 6, `styled-components` 6, `socket.io-client`, `dayjs`, `moment` | JS | styled-components 6: proven (sister). Navigation 6 and RHF 6 on RN 0.88/React 19.3: **unknown** (sister moved to 7 in the same commit; the driver already runs both on React 19.1 today) | |

Third-party **runtime deep imports** into `react-native/Libraries/*` found in the driver's direct dependencies (script over `node_modules`): all exist in 0.88.1 and are exported (`./Libraries/*` -> `./Libraries/*.js`) except `react-native/Libraries/Renderer/shims/ReactNative` (gesture-handler 2.28.0 only, fixed by 2.33.1).

---------------------------------------------------------------------------------------------------

## 5. Order of execution, checks, and what the sister's history says not to repeat

### 5.1 Order

0. **Baseline** on `main` of the driver, before touching anything: `pnpm exec tsc --noEmit` (record the error count), `pnpm lint:check`, `pnpm test`, the two `react-native bundle` commands of `ci.yml`, an Android debug build size and a cold-start time; **and a map of the real behaviour of the three flows that matter** (new-order alarm, background location, push) on the 0.81 build, so a regression can be told from a pre-existing fault.
1. **Branch + JS toolchain** (2.1, 2.11-2.13): `package.json`, `pnpm-workspace.yaml`, `patches/`, `tsconfig.json`, `jest.config.js`, `jest/setup.js`. `pnpm install`.
   Done when: install applies 3 patches without error; `node -p "require('react-native/package.json').version"` = 0.88.1; one copy of `react` 19.3.0 and `react-test-renderer` 19.3.0.
2. **JS fixes** (3.2): `absoluteFillObject` x4, `StatusBar backgroundColor`.
   Done when: `pnpm exec tsc --noEmit` not worse than baseline (fix what the new base exposes), `pnpm lint:check`, `pnpm test`, and both release bundles (`npx react-native bundle --platform ios|android --dev false --entry-file index.js ...` as in `ci.yml`) build. The bundle step is what proves every third-party import resolves under Metro 0.87.
3. **Android native** (2.2-2.7): Gradle wrapper, gradle files, `MainApplication.kt`, manifest.
   Build: `cd android && ./gradlew :app:assembleDebug -PreactNativeArchitectures=arm64-v8a` with JDK 17 or Android Studio's JBR 25 (`JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"`). First failures to expect, in order: a library still on `proguard-android.txt`; `jcenter()` (patch not applied); `BuildConfig` missing in a library (the `subprojects` block); Gradle repo resolution of notifee / bg-geo AARs; a library compiled against a removed RN class (compare `android-imports.txt`).
   Done when: debug and **release** APK build, the app starts on an arm64 emulator, JS runs on Hermes V1, no "RedBox", `adb logcat` has no `TurboModuleRegistry` / interop warnings for the app's own `AlarmSound`.
4. **iOS native** (2.8-2.10): Podfile, `pod install`, AppDelegate scene calls, privacy manifest, pbxproj script.
   Build with Xcode 27.2 (switch `xcode-select`), simulator and a Release archive.
   Done when: Debug and Release build, app starts, no redbox at launch, Pods diff reviewed (hermes-engine 260318099.0.5, RNFBApp 26.4.1 if D1).
5. **Device verification** (the sister found its bugs here, not in unit tests). Android and iOS, in this order of risk:
   1. new-order alarm: foreground (`NewOrderNotification` + `AlarmSound.start/stop`, iOS `SoundPlayer`), backgrounded, screen locked; vibration; OneSignal notification with the `new_order_alarm` channel and the service extension.
   2. background location: start, move, background, **kill the app**, check `/users/{id}/locations` posts continue (headless task path of 4.19.4 on bridgeless); toggle permissions; `BackgroundGeolocation.ready` config at `RootNavigator.tsx:576`.
   3. push in three states (foreground / background / closed): OneSignal handlers at `RootNavigator.tsx:158` (opened handler), `:166` (subscription observer), `addTrigger` x2 (patched), `setExternalUserId` (patched, iOS), notifee foreground notifications (`:275-290`).
   4. Login (reCAPTCHA both libraries), signature canvas in the chat/delivery proof, image picker camera and gallery, map screens (driver map, marker callouts, fit/animate), navigation sheet (map-link), Splash image position (Android), keyboard on forms, Android back button on `OrderMessage`, `RNRestart`, `rn-config-reader` permission-dialog texts, offline queue.
6. **CI + docs**: `CLAUDE.md`, push, check the Builder-facing files (section 6).

### 5.2 Mistakes the sister's history shows (so they are not repeated)

| Sister commit | What went wrong | What to do here |
|---|---|---|
| `74f43cf` (one commit: RN 0.88.1 + 25 library bumps + navigation 7 + RHF 7 + theme work, 3500 lines of Podfile.lock) | the platform change was buried in a feature commit; two device-only bugs followed within hours/days | one commit (or PR) for this step only; library bumps in the same step only where section 2.1 says they are required |
| `5c9cb38` (35 minutes after `74f43cf`) | OneSignal 4.5.2 iOS: two exported methods under one JS name; interop keeps the first; JS passes a callback -> "called with too many arguments" | apply the patch in step 1; test `setExternalUserId` on iOS |
| `74f43cf` (patch) | OneSignal `addTrigger(String, Object)` unreadable by the interop layer | same patch; the driver calls `addTrigger` on both platforms |
| `74f43cf` | AGP 9: libraries referencing `proguard-android.txt` | patch onesignal and splash-screen (done); grep done here: no other installed library has it |
| `74f43cf` | AGP 9 turns `buildConfig` off in libraries | `subprojects { ... buildConfig = true }` (2.2) |
| `74f43cf` + comment in `build.gradle` | Notifee's local Maven repo, declared only by its own script, resolved too late with `configureondemand` + `parallel` | repo line in `allprojects` (2.2) |
| `8bac0f7` (6 days later) | `RCTLinkingManager.application(...)` does nothing in a scene app; launch URL not in launch options | change the two scene calls (2.9); the driver already has the launch-options helper |
| `8722af5` | Groovy 4 (Gradle 9): `XmlSlurper` moved to `groovy.xml` in a build script | none in the driver's Gradle files (grepped `XmlSlurper`, `getConvention` in `android/*.gradle` and every installed library's `*.gradle`: 0 hits) |
| `a6fc422` | x86/x86_64 ABIs doubled the CMake compile and the APK size | D4 |
| `1d65bc6` | react-native-screens cannot restore fragments after process death | keep `super.onCreate(null)` |
| `8b3c5d0` | `react-native-date-picker` iOS `modulesProvider` -> a redbox at launch in Debug | not applicable (no such library); the lesson: launch in Debug on iOS and read the redbox/log before declaring iOS done, even though iOS was already new-arch |
| `2d1c9ff` | a library's Gradle script exiting on JDK 25 | none known for the driver's set; if a library's script rejects the JDK, patch it rather than pinning the developer's JDK |
| `c979620` | after moving to the RN tsconfig, 175 library-declaration errors and a handful of the app's own; fixed in a later commit | budget the typecheck work in step 2 |
| CLAUDE.md "Hermes V1" | shorthand `set`/`get` with a default in a destructuring does not compile | grepped the driver: none |
| `b7fed3f` | with `react-native-splash-screen`, Android 12 shows a blank white screen before the image | pre-existing in the driver; do not count it as a regression of this step |
| CLAUDE.md "Builder" | the Builder replaces *every* occurrence of a placeholder text in a file | do not write `_GOOGLE_MAPS_API_KEY_`, `_TRANSISTORSOFT_API_KEY_` or any `_X_` placeholder in new comments |

---------------------------------------------------------------------------------------------------

## 6. Not known

Each item is a point I could not establish from the repositories, the installed packages or the cited pages.

1. **Whether react-native-background-geolocation 4.19.4 delivers headless events to JS with the app killed on RN 0.88 bridgeless.** The library's source and changelog say it supports bridgeless; no repository here has run it. 5.8.2's "Android ANR at launch with the New Architecture" entry does not say which 5.x versions or whether 4.19.x is affected.
2. **Whether `tslocationmanager-v21:3.+` works with play-services-location 21.3.0** (what Gradle will resolve once maps 1.29.11 is autolinked and the explicit 21.0.1 line is gone). D2.
3. **rn-config-reader 5.1.3 after the patch**: that AGP 9 accepts the rest of its `build.gradle` (`buildToolsVersion` default `23.0.1` overridden by `ext`, `lintOptions`, no namespace: the RN plugin adds it for libraries as it does today) and that `getConstants()` reaches `NativeModules.RNConfigReader` through interop. The sister's notifee 9.1.8 (`lintOptions`) and others show `lintOptions` still configures with `android.newDsl=false`.
4. **react-native-sound-player 0.13.4 and react-native-geolocation-service 5.3.1 on the Android new architecture**, and whether sound-player's hard-coded `compileSdkVersion 31` is accepted next to react-android 0.88.1 (`minCompileSdk=34` in its AAR metadata).
5. **`react-native-background-geolocation`'s `app.gradle`** (`variant.mergeResourcesProvider`) on AGP 9 with `android.newDsl=false`; fallback in 2.3.
6. **Firebase 23.8.8 on RN 0.88** (why D1 recommends 26.4.1), and, for either version, the background-push behaviour (`setBackgroundMessageHandler`) on bridgeless; the sister's removal of the headless service (`52a4ad9`) is a separate decision.
7. **React Navigation 6.x, react-hook-form 6.15 and the other JS libraries on React 19.3 / RN 0.88**: the driver runs them on React 19.1 today; no sister proof (the sister moved to Navigation 7 / RHF 7 in the same commit).
8. **Whether the app's own `AlarmSound` module, as a legacy `ReactContextBaseJavaModule` registered through a `ReactPackage` in `getDefaultReactHost(packageList=...)`, is found by `NativeModules.AlarmSound` on bridgeless.** The 0.82 post keeps interop; nothing in the sister uses a custom Java module. If it fails, the fix is a `TurboModule`/`BaseReactPackage` rewrite of ~150 lines in `MainApplication.kt`.
9. **`NativeModules.DeveloperOptions`** (`validate_developer_mode`, `RootNavigator.tsx:704-718`): no native code exists in the repo or in `node_modules`; maybe the Builder injects one. Not investigated further.
10. **The Builder**: that its driver base accepts (a) the rewritten `MainApplication.kt`, (b) pnpm patches (`BUILD_PNPM.txt` is there), (c) `NotificationServiceExtension.kt` and `AlarmSoundModule` living in `co.ordering.delivery` (the sister's CLAUDE.md says the Builder renames the package only in `MainActivity.kt`, `MainApplication.kt`, `build.gradle`, `google-services.json`, `config.json` and moves the whole `com/<package>/` folder; classes in other packages must use a fixed package), (d) which exact Node 22 and JDK its Jenkins nodes have (needs Node >= 22.13 and JDK >= 17), (e) the licence key placeholder `_TRANSISTORSOFT_API_KEY_` in the manifest.
11. **Which JDK 17-25 combinations work with every driver library** under Gradle 9.4.1: the sister builds with JBR 25; the driver plan says JDK 25 fails today (Gradle 8.14.3). Not tested.
12. **Whether the Ordering API or proxies depend on RN's old default Android User-Agent** (0.88 adds app name/version).
13. **How the Android status bar looks after dropping `backgroundColor`** and how the manual `systemBars` padding interacts with RN 0.86's edge-to-edge changes on API 35/36 (3.4).
14. **Hermes V1 behaviour for the app's JS** beyond the one syntax rule the sister documents (the Intl/Date differences, if any, were not examined; moment/dayjs timezone code was not read).
15. **Test-suite effects**: whether `@react-native/jest-preset` 0.88 plus the removed `NativeAnimatedHelper` mock changes any of the driver's ~hundreds of tests; not run (read-only task).
16. **Whether RN 0.88's `fmt` still needs the Podfile's `fmt/base.h` patch**, and whether `GoogleMaps` 9.4.0 / Utils 6.1.0 (from maps 1.29.11) compile with the driver's Swift `import GoogleMaps` in `AppDelegate.swift` (the sister's AppDelegate imports it the same way).
17. **iOS Debug launch on Xcode 27.2** (the machine's Xcode): not built here.
18. **TypeScript errors after the tsconfig change**: not counted (would need `tsc` against 0.88 types, i.e. an install).
19. **Pre-existing, noticed but out of scope**: `UserProfileForm/index.tsx:167` reads `didCancel` from an asset instead of the response; `SearchActivity` in the manifest has no class; `DeviceOrientation.tsx:20` never removes its `Dimensions` listener; `App.tsx` never removes the `SoundPlayer` listeners; `rn-cli.config.js` is dead.

---------------------------------------------------------------------------------------------------

## Sources

* React Native release posts: https://reactnative.dev/blog/2025/10/08/react-native-0.82 , .../2025/12/10/react-native-0.83 , .../2026/02/11/react-native-0.84 , .../2026/04/07/react-native-0.85 , .../2026/06/11/react-native-0.86 , .../2026/08/11/react-native-0.87 , .../2026/10/19/react-native-0.88
* Upgrade-helper source of truth: https://github.com/react-native-community/rn-diff-purge (`release/0.81.1` and `release/0.88.1`, `RnDiffApp`, copied into `tpl/`)
* Gradle 9 upgrade guide: https://docs.gradle.org/current/userguide/upgrading_major_version_9.html
* React 19.2: https://react.dev/blog/2025/10/01/react-19-2 ; React 19.3: https://react.dev/blog/2026/09/09/react-19-3
* Transistorsoft changelogs: https://github.com/transistorsoft/react-native-background-geolocation/blob/master/CHANGELOG.md , https://github.com/transistorsoft/react-native-background-fetch/blob/master/CHANGELOG.md
* Library READMEs read: https://github.com/johnsonsu/react-native-sound-player , https://github.com/Agontuk/react-native-geolocation-service , https://github.com/csath/react-native-config-reader
* Sister repository: commits `74f43cf`, `5c9cb38`, `8bac0f7`, `8722af5`, `a6fc422`, `1d65bc6`, `2d1c9ff`, `8b3c5d0`, `b7fed3f`, `57aae19`, `4f26987`, `c979620`, `f38af9e`, `52a4ad9`; its `CLAUDE.md` "Gotchas".
* Local reads: 0.88.1 sources in `/Users/work/Ordering/ordering-app-marketplace-theming/node_modules/react-native` (`ReactApplication.kt`, `ReactAndroid.api`, `RCTLinkingManager.h`, `RCTReactNativeFactory.h`, `scripts/cocoapods/helpers.rb`, `package.json` `exports`), `@react-native/gradle-plugin` (`libs.versions.toml`, `AgpConfiguratorUtils.kt`, `DependencyUtils.kt`), the Gradle cache AAR metadata of `react-android` 0.81.1 (`minCompileSdk=1`) and 0.88.1 (`minCompileSdk=34`).
