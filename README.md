# Ordering Driver App

The Ordering mobile app for delivery drivers. Drivers see assigned and available deliveries, update pickup and drop-off status, navigate to each stop, and message stores or customers.

The app uses React Native 0.88.1, React 19.3, TypeScript and the Ordering theme engine. The shared headless SDK lives at `src/@/components` and is pinned by Git.

## Install and connect

Use Node.js 22.13 or newer and the pnpm version in `package.json`. For native builds, use the [React Native environment setup](https://reactnative.dev/docs/set-up-your-environment).

```sh
git clone --recurse-submodules https://github.com/Ordering-co/ordering-app-driver.git
cd ordering-app-driver
corepack enable
pnpm install --frozen-lockfile
```

[Ordering Quickstart and local onboarding](docs/onboarding.md) explains MCP project discovery, configuring the app, starting the iOS simulator without Firebase, and native provider setup.

## Change a theme or screen

Read [Theming](docs/THEMING.md) for schema, tokens and visibility. Driver App uses `driver_app` in `product.schema.json`, compiles to `src/theme.compiled.json`, and renders through `src/theme`, `src/ui` and the navigation stack. [Agent guidance](AGENTS.md) links to the architecture and checks.

## Verify a change

```sh
pnpm exec tsc --noEmit
pnpm lint:check && pnpm lint:cycles
pnpm test:coverage
pnpm theme:validate && pnpm theme:verify && pnpm theme:guard && pnpm theme:keys && pnpm theme:extremes
pnpm i18n:verify && pnpm i18n:check-generated
```

Use a synthetic delivery or a test project you are authorized to use. Open the delivery, advance the status and verify the updated card or details. Use a configured physical device to test background location, navigation and push.
