# Ordering Driver App onboarding

Use this guide with a project you are authorized to use. The setup validates public project configuration and stores a local backup. MCP helps identify a project from an existing connection. The app uses its own driver session.

## Install the pinned source

Use Node.js 22.13 or newer and the pnpm version in `package.json`. Keep the SDK gitlink, lockfiles and native IDs in the source checkout.

```sh
git clone --recurse-submodules https://github.com/Ordering-co/ordering-app-driver.git
cd ordering-app-driver
pnpm install --frozen-lockfile
```

## Configure from Quickstart

After confirming the project in the existing [Ordering developer Quickstart](https://github.com/Ordering-co/ordering-dev-quickstart), its product catalog calls this app's `scripts/onboarding/cli.mjs configure --project` helper. You can also run the same commands in this checkout:

```sh
pnpm ordering:setup detect
pnpm ordering:setup configure --project YOUR_CONFIRMED_PROJECT
pnpm ordering:doctor
```

Detection reuses an existing MCP launcher. If it returns no project, use a public project slug explicitly confirmed by its owner. Keep administrative credentials in the launcher. The configuration helper uses public reads to validate the destination. It preserves other settings and uses `.ordering-setup/` for local backups.

A project change requires `--confirm-project-change`. Restore a backed-up configuration with `pnpm ordering:setup restore --backup BACKUP_FILENAME`. In an opted-in development setup, project storage is prepared before the SDK can hydrate a session or replay queued work.

## Preview on iOS without Firebase

Install the iOS dependencies from the pinned Podfile using the CocoaPods version in `ios/Podfile.lock`. Use the versions pinned by `.ruby-version` and `Gemfile.lock` for the local project generator. Run `bundle install` from the repo root before your first preview.

```sh
cd ios
pod install --deployment
cd ..
pnpm ordering:ios-local --without-firebase --project YOUR_CONFIRMED_PROJECT
```

The helper builds a generated Debug workspace for a simulator it owns. The native scheme and project are `ODelivery`, the JavaScript component is `deliveryApp`. The local mode disables Firebase, push setup, Google Maps initialization, background location and offline order replay. It leaves the normal project files and Developer settings intact. Check the project label and edit the label in `src/onboarding/local-simulator-banner.tsx` to verify Fast Refresh. For a role check, open a synthetic delivery and advance its status in a fixture or test project. Use a physical device with a test account to check background navigation and location.

## Normal native launches

Android needs the toolchain in `android/build.gradle` and a matching native service registration in `android/app/google-services.json`. iOS uses the app's own `ios/GoogleService-Info.plist`, provisioning and signing. Keep native registrations and signing inputs local. Use `pnpm android` or `pnpm ios` after selecting the device you intend to run on.

Use [Theming](THEMING.md) for the schema, its compiled defaults, application tokens and page variants.
