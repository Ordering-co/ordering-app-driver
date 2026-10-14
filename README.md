# Ordering Driver App

## Start with an agent

1. Paste this prompt into your coding agent:

> Clone https://github.com/Ordering-co/ordering-app-driver.git into a new folder with pinned submodules. Preserve existing work. Follow README and docs/onboarding.md to launch Driver App for my Ordering project in a local simulator without Firebase. Reuse my Ordering connection or accept my project slug. Verify the selected project and one visible edit.

2. Confirm the Ordering project you want to use. Reuse an existing connection; sign in only if the agent needs account access. If you know your project slug, public validation can proceed without a developer login.
3. Open the preview and check that its project label matches your choice. Make one visible edit and confirm it appears with Fast Refresh. No account credentials or backend write are needed for this interface check.

## Manual alternative: see the app without Firebase

You can inspect Home, open the login form and edit the interface using an explicit **local iOS Simulator preview**. It uses your validated public Ordering project and skips Firebase setup. It does not create a Firebase project or copy another team's configuration.

If you prefer to run the commands yourself, use your project slug and clone into a new folder. If a checkout exists, verify its remote and preserve its changes. With the pinned native toolchain ready:

```sh
git clone --recurse-submodules https://github.com/Ordering-co/ordering-app-driver.git
cd ordering-app-driver
yarn install --frozen-lockfile
# With the repository's Ruby/Bundler versions active:
bundle _2.7.1_ install
cd ios
bundle _2.7.1_ exec pod install --deployment
cd ..
yarn ordering:ios-local --without-firebase --project YOUR_PROJECT_SLUG
```

Success means the native app opens and shows **Local preview · project: YOUR_PROJECT_SLUG**, Home and Login. Verify a visible change with Fast Refresh. On hosts without the Simulator desktop app, inspect the running simulator through device tooling; a successful build alone is insufficient.

Local preview disables Firebase, push registration and automatic offline replay and location tracking. Maps need your own keys for real use. Login with your own **driver (level 4) with a server-side schedule** account is a separate check; public project validation does not grant access. Release builds and normal launches retain their original Firebase requirements.

## Requirements and manual setup

React Native 0.81.1, React 19.1.0 and TypeScript; a public SDK submodule is pinned at `src/@/components`.

- Node **>=20.19.4** (Node 22 recommended) and Yarn Classic 1.22.
- iOS: macOS, Xcode **>=16.1**, Ruby **3.3.10**, Bundler **2.7.1** and CocoaPods **1.16.2** from `Gemfile.lock`.
- Android: JDK 17, SDK Platform 36, Build Tools 36.0.0 and NDK 27.1.12297006 as declared in `android/build.gradle`.

See the [full onboarding runbook](docs/onboarding.md) for public configuration, normal Firebase setup, Android, diagnosis, switching/disconnecting projects and updates. The [verification record](docs/onboarding-verification.md) separates JavaScript tests, native builds and visible screens. React Native's [0.81 release requirements](https://reactnative.dev/blog/2025/08/12/react-native-0.81) and [environment guide](https://reactnative.dev/docs/0.81/set-up-your-environment) provide toolchain details.

## Checks

```sh
yarn lint:check
yarn exec tsc --noEmit
yarn test:coverage --runInBand --watchman=false
yarn test:coverage:summary --no-run
node --test scripts/onboarding/core.test.mjs scripts/onboarding/ios-local.test.mjs
yarn i18n:verify
yarn i18n:check-generated
```

`yarn lint` fixes files; `lint:check` only reports. See [i18n/README.md](i18n/README.md) for translation maintenance. Local checks require no backend credentials; `i18n:sync:live` writes server data and needs a separate authorization.

## License

The app is distributed under [license-ordering.txt](license-ordering.txt). The SDK, dependencies, assets and notices retain their respective licenses.
