# Driver App onboarding verification

Verified locally on 2026-10-14, branch `codex/sergio-137-product-onboarding`. The source template still contains `YOUR_PROJECT`. No user credentials, admin keys, Firebase registrations or private signing files were created/copied. Backend checks used public reads; no account login, order mutation, printing, messaging, notification send or location write was performed.

## Environment and automated checks

Node 22.23.1 and Yarn Classic 1.22.22 were selected for this checkout without changing global defaults. Ruby 3.3.10/Bundler 2.7.1 were installed in an isolated temporary toolchain; CocoaPods 1.16.2 came from the frozen Gemfile lock. Xcode 27.0 (27A266a) had iOS 26.0/27.0 Simulator runtimes available. No JDK/Android SDK toolchain was configured in this environment.

| Check | Result | Scope |
|---|---|---|
| `yarn install --frozen-lockfile --non-interactive` | Passed | Pinned JavaScript dependencies; existing peer warnings retained. |
| `node --test scripts/onboarding/core.test.mjs` | 30 passed | Public identity validation, minimal patch, reject/backup/restore fixtures. |
| `node --test scripts/onboarding/ios-local.test.mjs` | 2 passed | Explicit local opt-in, rejection of release/device arguments and invalid ports. |
| Public `configure` + `doctor` on temporary copies | Passed | Exact authorized project code; unrelated config preserved and real source untouched. |
| `doctor` on untouched placeholder | Rejected `configured_project_mismatch` | Template is not presented as a configured tenant. |
| `yarn lint:check` | Passed | Files included by existing lint configuration. |
| `yarn exec tsc --noEmit` | Passed | Project TypeScript. |
| `yarn test:coverage --runInBand --watchman=false` | 113 suites / 595 tests passed | Runtime scope, release/Android rejection, NSNumber marker, deferred mount/failure and local project banner. |
| `yarn test:coverage:summary --no-run` | 71.05% average; 70% gate passed | Existing gate includes 86 source files; this is not native integration coverage. |
| `yarn i18n:verify`, `yarn i18n:check-generated` | Passed | Existing orphan-key warnings retained; generated catalog unchanged. |
| iOS production JavaScript bundle to temporary output | Passed | Entire JS/assets bundle; this alone did not prove native boot. |
| `git diff --check`, dependency and ID review | Passed | SDK gitlink, Yarn/Gemfile dependency versions, licenses and native IDs preserved. |

## Native minimum and normal launch

The old Podfile forced some dependency targets to iOS 12.x/13.x, rejected by Xcode 27. The app already requires React Native's minimum 15.1. `post_install` now uses `min_ios_version_supported`, preserving higher targets. Only the `PODFILE CHECKSUM` line changed in `ios/Podfile.lock`, mechanically verified against the original; no pod version/source/checksum changed. CocoaPods' unrelated reordering of SceneDelegate entries was restored in the normal project.

`bundle _2.7.1_ exec pod install --deployment` completed with 125 pods. The generated Pods project contained 296 target configurations, all at 15.1. The final **normal** Xcode build had no deployment override and passed that earlier error. It still failed because the own `ios/GoogleService-Info.plist` was absent; Xcode also reported `Command Ld failed with a nonzero exit code` for `__preview.dylib` without a separate detailed cause. The summary counted 3 failures (link, plist copy and workspace). No normal/release boot is claimed.

## Explicit local simulator without Firebase

```sh
yarn ordering:ios-local --without-firebase --project YOUR_PROJECT_SLUG
```

The same public project was validated against `/current` using a temporary config copy. The adapter generated an ignored project beside the original iOS project, removing only its Firebase plist resource and Crashlytics upload phase. `BUILD SUCCEEDED` for the generated Debug simulator target; the own native ID stayed unchanged. No fake Firebase file, provider project, SDK version change or admin credential was needed.

The native launch received the explicit local flag and validated public config. Native UserDefaults exposed the boolean marker as NSNumber 1; the JS guard accepts only native boolean true/numeric 1 with `__DEV__` and iOS, with a regression test. Normal/release code resets the marker and retains Firebase setup. Messaging is not imported or initialized in the local path; OneSignal/push registration and offline replay are guarded. Driver also skips location automation, permission prompts and background event writes.

The dedicated simulator rendered **Home, the Login entry button and the `Local preview · project: ...` banner** before later live source changes. Final cold-reload and login-form verification are recorded below; prior screenshots alone are not proof of the final source revision. Screenshots were inspected from the actual native simulator, confirming the validated public project rather than only a command/configuration success. Metro is bound to localhost on port 50210; runtime ownership is saved privately under `.ordering-setup/ios-local`. The host lacks the Simulator desktop application, so screenshots/device tooling inspect the headless simulator.

The script does not treat an unavailable desktop GUI as a native build failure. It also separates a Booted device status from screen verification.

Final cold JavaScript reload preserved the native local flag and rendered the Home/login entry with the validated project banner, without a hook-order overlay. Device accessibility snapshots and screenshots verified the actual screen.

The banner prefix was temporarily changed from `Local preview` to `My first local edit` in `src/onboarding/local-simulator-banner.tsx`. **Fast Refresh updated the native screen without a manual reload**: accessibility snapshots reported 19 nodes, including `My first local edit · project: orderingv1`, while Home and Login remained visible. The exact original banner bytes were then restored from a local backup. The 18 focused readiness/scope/marker/banner tests and 32 combined helper/adapter tests passed after restoration. A readiness-transition regression also rejects hook-order errors reported to `console.error`; errors are not hidden by LogBox filters.

Screenshots inspected during this verification were stored locally, outside the repository, under `/private/tmp/sergio-137-browser-evidence/driver-native-project.png` (baseline) and `driver-native-after.png` (temporary edit). These are local evidence paths, not published/downloadable assets; screenshots and any account data are not committed. No credentials were entered and no login request was submitted.

## Preserved boundaries

Local-mode session scope is distinct from a normal session even for the same tenant. In development, stale/unscoped sessions are cleared before the SDK mounts; old order caches and pending actions are quarantined locally rather than replayed into a different project. Backups/quarantine are not exported. Unrelated app configuration and preferences are preserved. Release uses the original source selector/storage behavior, retains saved sessions and performs no new development migration; a pure regression test verifies the selector flag, `project_name`, token, queued work and absence of scope reads.

The preview does not validate Firebase, maps, push, printing, driver tracking, Android, release signing or authenticated operational flows. Normal email/password account access is separate and was not submitted during verification. Keep those checks separate from the successful local UI boot. See [the runbook](onboarding.md) for the actual requirements and recovery flow.

## Coordinated native visual proof

The principal opened this app on its dedicated iOS Simulator, observed the selected `orderingv1` project and the real Home/Login screen, and captured [before](onboarding-evidence/before.png). Changing only the local banner text produced `My first local edit` in the running app through Fast Refresh, without a manual reload for that text change: [after](onboarding-evidence/after.png). The temporary source was restored exactly before commit. This verifies local simulator startup and the first edit; authenticated app workflows, maps, push and production Firebase remain unmeasured.
