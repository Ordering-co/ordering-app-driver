# Ordering Driver App

Drivers can review assigned orders, accept or reject deliveries, follow pickup and delivery stages, view maps, exchange messages, and queue supported order actions while offline.

This is a bare React Native 0.81.1 application with React 19.1.0 and TypeScript. The headless Ordering SDK is a submodule at `src/@/components`; the app UI is in `src/ui` and screen wiring is in `src/pages` and `src/navigators`.

## Requirements

- Node.js 20.19.4 or newer and Yarn Classic 1.22.
- Android development: JDK 17, Android Studio and the SDK versions declared in `android/build.gradle`.
- iOS development: macOS, Xcode supporting the project's deployment target, the Ruby version in `.ruby-version`, Bundler and CocoaPods.
- Your own Ordering project and backend configuration. SDK source is fetched recursively from its public repository.

## Setup

```sh
git clone --recurse-submodules https://github.com/Ordering-co/ordering-app-driver.git
cd ordering-app-driver
yarn install --frozen-lockfile
```

If you cloned without submodules, run `git submodule update --init --recursive`. Keep the SDK revision recorded by the parent repository.

Edit `src/config.json`: set `project` to your own project. Review the app identifiers, API version/language, API/socket endpoints and existing feature flags for your deployment. Public app IDs and endpoint defaults are included; they do not provide backend access or credentials. `builder.json` describes native project/package identifiers, and `app.json` supplies the registered native component name. Keep native names and bundle/package IDs consistent when configuring your own application.

Native configuration is required before launching:

- Register your Android/iOS apps in your own Firebase project. Add `android/app/google-services.json` and `ios/GoogleService-Info.plist`, including the iOS file in the `deliveryApp` target. These registrations are not supplied.
- Replace `_GOOGLE_MAPS_API_KEY_` in the Android manifest and iOS AppDelegate with your restricted keys for the corresponding native bundle/package. Set your own Google credentials in backend configuration where required.
- Configure your own OneSignal application, notification extension app group and push entitlements. Both targets must use the same app group; configure its value explicitly in each entitlement file.
- Select your Apple development team and provisioning profiles in Xcode. Supply your own production Android signing configuration. The included `debug.keystore` is the standard public React Native development template; use it only for local debug builds.
- Background location uses react-native-background-geolocation. Configure its Android production license in the manifest and your backend location settings. Driver access requires a driver account and a server-side schedule configuration.

Do not commit credentials or private signing files. Generated service registrations are ignored by `.gitignore`. `firebase.json` contains Firebase behavior settings, not a Firebase registration.

For iOS dependencies:

```sh
bundle install
cd ios
bundle exec pod install
cd ..
```

Start Metro with `yarn start`, then run `yarn android` or `yarn ios` from another terminal. Android/iOS commands require a configured emulator, simulator or device and native toolchain.

## Local checks

```sh
yarn lint:check
yarn tsc --noEmit
yarn test --runInBand --watchman=false
yarn test:coverage --runInBand --watchman=false
yarn i18n:verify
yarn i18n:check-generated
```

`yarn lint` applies automatic fixes; `lint:check` only reports findings. Type checking and linting may expose existing diagnostics in the app or SDK. Inspect those diagnostics before making changes. `test:coverage` reports the scope declared in `jest/coverage-include.js`; it does not verify every native integration.

Catalog maintenance is documented in [i18n/README.md](i18n/README.md). Existing translated values are retained; any English fallback in another locale should be translated for that locale before production use. The default translation sync command is a dry run; live sync requires explicit credentials for your own backend and writes server data.

To inspect JavaScript bundles without launching a device:

```sh
mkdir -p build
yarn react-native bundle --platform android --dev false --entry-file index.js --bundle-output build/android.jsbundle --assets-dest build/android-assets --max-workers 2
yarn react-native bundle --platform ios --dev false --entry-file index.js --bundle-output build/ios.jsbundle --assets-dest build/ios-assets --max-workers 2
```

JavaScript bundling does not produce or validate an APK/IPA, native signing, provider registrations, or the behavior of your backend tenant. Login, checkout, deliveries, location and notifications require separate testing with your own configured services and devices.

## License

This application is licensed under [license-ordering.txt](license-ordering.txt). Third-party dependencies and bundled notices retain their respective licenses.
