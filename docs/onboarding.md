# Ordering Driver App onboarding

## Source, toolchain and pinned dependencies

The customer source is `https://github.com/Ordering-co/ordering-app-driver.git` and does not require access to an internal repository. Reuse an existing checkout after checking `git remote -v`, branch and `git status --short`; preserve its changes. If no suitable checkout exists, clone recursively into a new directory. Do not reset or overwrite existing work.

```sh
# Only when a new checkout is needed:
git clone --recurse-submodules https://github.com/Ordering-co/ordering-app-driver.git
cd ordering-app-driver
```

Use the pinned SDK submodule supplied by the public checkout. No separate private SDK clone or private organization access is required; keep its recorded gitlink and submodule metadata.

Use Node >=20.19.4 (Node 22 recommended), Yarn 1, Ruby 3.3.10, Bundler 2.7.1 and CocoaPods 1.16.2. Select tools for this checkout without changing global defaults. Initialize the SDK with `git submodule update --init --recursive`, never `--remote`; install JavaScript with `yarn install --frozen-lockfile`. Keep dependency versions, SDK gitlink, notices, licenses and native app IDs pinned.

The Podfile raises old pod deployment targets to React Native's existing `min_ios_version_supported` (15.1 for 0.81.1), preserving higher targets. This avoids Xcode 27 rejecting legacy 12.x/13.x targets. The Podfile SHA1 must match its `PODFILE CHECKSUM` footer in `ios/Podfile.lock`; preserve locked dependency versions. The Podfile explicitly selects `deliveryApp.xcodeproj`, so CocoaPods still uses the normal app when a local preview has also generated a `.ordering-local-*` project. Leave both projects in place; no temporary renaming/removal is needed. This uses CocoaPods' documented [project selector](https://guides.cocoapods.org/syntax/podfile.html#project).

Use `bundle _2.7.1_ exec pod install --deployment`. A stale specs catalog may require `--repo-update` with the same locked versions; this is not `pod update`.

## Local preview without Firebase

After dependencies/pods are ready:

```sh
yarn ordering:ios-local --without-firebase --project YOUR_PROJECT_SLUG
```

The adapter is deliberately opt-in and accepts only a Debug iOS Simulator build. It rejects release/device/configuration overrides. It validates the project through the shared public helper using a temporary copy of `src/config.json`. Neither the source JSON nor Firebase registrations are replaced.

It generates ignored `.ordering-local-*` projects next to the original iOS project, retaining relative source paths. Only the generated app target omits the missing Firebase plist resource and Crashlytics upload phase. The normal project retains both. The native process consumes `ORDERING_LOCAL_SIMULATOR=1` only under `DEBUG && targetEnvironment(simulator)`. It resets the UserDefaults marker on every launch, passes only validated public project/API fields to JavaScript and selects this checkout's Metro port without persisting a new normal bundle location. JavaScript also requires `__DEV__`, iOS and the native marker. React Native exposes the NSNumber marker as 1; only boolean true or numeric 1 enable it, never strings. Release/normal launches remain on the original path.

A dedicated simulator is recorded by UDID and checkout; the adapter does not reuse someone else's simulator by name. Repeated runs reuse Metro only after verifying PID arguments, working directory and HTTP status. It does not stop other servers or overwrite a live owned Metro record. State is private to `.ordering-setup/ios-local` (0700), with public selection, logs and ownership metadata; never add credentials there. If the desktop Simulator app is absent, the native process still runs headlessly and can be inspected with device tooling. Verify the actual screen separately from `BUILD SUCCEEDED`.

The local project banner must match your selected slug. The preview disables Firebase messaging/background handlers, OneSignal setup, push token registration and automatic offline queue replay. Location automation and permission requests are also skipped. Google Maps initialization is skipped in local preview; normal mode keeps the existing service registration. Maps require separately configured services. Normal email/password Ordering login is separate from Firebase and still requires your own account/role; no agent credential is copied to the app.

For other public API settings, use `--api-url`, `--api-version` and `--language`. If changing an already selected project, add `--confirm-project-change`. A local preview is not a release, provider registration check or proof of backend membership.

## Public project setup for normal launches

An existing Ordering connection can identify the project through read operations. Reuse the existing connection flow; do not build another developer login. Without a connector, use the manual slug path:

```sh
node scripts/onboarding/cli.mjs detect
node scripts/onboarding/cli.mjs configure --project YOUR_PROJECT_SLUG
# Only if your project uses different public API settings:
node scripts/onboarding/cli.mjs configure --project YOUR_PROJECT_SLUG --api-url https://YOUR_API --api-version v400 --language en
node scripts/onboarding/cli.mjs doctor
git diff -- src/config.json
```

The helper performs `GET <api.url>/<api.version>/<api.language>/<project>/current`, requiring JSON with `error:false` and the exact project code. An HTTP 200 HTML response or a different project is rejected before writing. It changes only `project` and API fields you explicitly pass, preserving IDs, sockets, flags and unrelated settings. Backups under `.ordering-setup` contain public configuration, not session credentials. Project existence does not establish account access.

For a fully manual path, back up the JSON locally, edit only `project` and explicit API fields, and inspect the public response:

```sh
curl --fail --silent --show-error 'https://YOUR_API/v400/default/YOUR_PROJECT_SLUG/current'
```

Check `error:false` and `result.code` exactly. Never paste admin API keys, MCP tokens, passwords or private signing files into source, logs or frontend config.

## Normal iOS/Android setup

Normal launches require the appropriate existing or team-owned `ios/GoogleService-Info.plist`, attached to target `deliveryApp`, and `android/app/google-services.json` matching the existing package. `FirebaseApp.configure()` remains required outside the explicit local mode. `firebase.json` contains behavior settings and does not register an app. Configure your own OneSignal IDs, entitlements and shared extension app group, restricted Google Maps keys, Apple team/profiles and production Android signing when testing those integrations. Use a development keystore only for local debug builds; preserve the repository’s signing configuration.

```sh
bundle _2.7.1_ install
cd ios
bundle _2.7.1_ exec pod install --deployment
cd ..
yarn start
# Another terminal, with your own Firebase registration ready:
yarn ios
```

Android requires JDK 17/`JAVA_HOME`, SDK Platform 36, Build Tools 36.0.0, NDK 27.1.12297006 and `ANDROID_HOME`/platform-tools. Check `java -version`, `adb devices` and local SDK paths, then `yarn android`. Metro serves JavaScript; it does not validate native APK/IPA builds or provider setup.

### Driver-specific integrations

Local preview skips tutorials, notification prompts, location permission requests, foreground/background location tracking, location updates and background event logging. It does not pretend that those permissions were granted. Maps, delivery navigation, push and schedules need separate verification with your own services/device. `react-native-background-geolocation` requires its own Android production license; do not copy a license or signing material from another app.

## First visible edit

Inspect Home and the local banner. Temporarily change `Local preview` to `My first local edit` in `src/onboarding/local-simulator-banner.tsx`. Confirm the changed text on the actual simulator with Fast Refresh, then restore only that text. This exercise needs no account or backend write. A bundle/test success is not appearance evidence; retain before/after screenshots or accessibility snapshots. You may open Login to inspect the email/password fields without entering credentials or submitting.

## Switch, disconnect and recover

Review/finish offline work and log out of the previous account before changing projects. Do not replay old work to another tenant.

```sh
node scripts/onboarding/cli.mjs configure --project ANOTHER_PROJECT --confirm-project-change
node scripts/onboarding/cli.mjs doctor
# For the temporary local preview:
yarn ordering:ios-local --without-firebase --project ANOTHER_PROJECT --confirm-project-change
```

Close/reopen the app after a project/API change; Fast Refresh alone is insufficient for session boundaries. Only explicit development setup (`localProjectConfigured: true`, written by the setup helper) or the opt-in local simulator enables project isolation. A historical source project alone preserves the normal development selector, token and offline work. When opted in, the configured `project` wins over stored `project_name`. Before mounting the development SDK tree, the app compares project, API URL/version and local-preview identity with the stored scope. A different/unscoped session is cleared locally; cached orders and pending actions are preserved outside replay keys under `ordering_onboarding_quarantine_<timestamp>`. Those records may contain order data: do not share/export them or requeue them automatically. Language/tutorial preferences and unrelated settings are preserved. Local preview never adopts a normal session, even for the same project. Development storage failures leave the SDK unmounted. Release preserves the original project selector flag, saved project and session behavior; it does not run the new development migration or delay the original SDK tree behind a setup/network check.

Use Logout to disconnect a user account. To remove a normal source selection, restore the helper's public-config backup or restore your previous project selection manually with the app closed. This does not restore a session or send actions:

```sh
node scripts/onboarding/cli.mjs restore --backup PATH_TO_BACKUP
node scripts/onboarding/cli.mjs doctor
```

If setup fails, inspect its error and the focused config diff. Do not replace the whole file or run `git reset --hard`. The local adapter does not change the source selection; a normal launch without its native flag resets the local marker and resumes normal Firebase requirements.

## Diagnosis and updates

| Symptom | Check/action |
|---|---|
| Wrong project/configuration | Run public `doctor`; verify exact project code and local banner. |
| SDK import missing | Initialize the pinned submodule, without `--remote`. |
| Ruby/Pods incompatible | Use Ruby 3.3.10/Bundler 2.7.1/Pods1.16.2; preserve pinned versions. |
| Simulator never becomes visible | Read the local build/Metro logs and inspect the recorded UDID; a Booted status alone is insufficient. |
| Missing Firebase/GOOGLE_APP_ID | Normal mode needs your own registration; use the explicit local adapter to inspect UI without Firebase. |
| Native link failure | Preserve the exact final log; do not attribute every failure to Firebase or update packages speculatively. |
| Login rejected | Verify project and driver (level 4) with a server-side schedule permissions using your own credentials. |
| Maps/push/printing/location unavailable | Configure and separately test your own services/hardware; the preview does not validate them. |

For code updates, preserve local changes, fetch the intended remote branch and combine it using your repository's merge policy. Initialize the parent revision's gitlink, reinstall with frozen Yarn/Bundler locks and reinstall pods when native code changes. Repeat public doctor, local screen checks and the README checks. Do not use generic dependency upgrades, `pod update` or submodule `--remote` as onboarding repairs. Publishing/signing a release is outside this preview workflow.
