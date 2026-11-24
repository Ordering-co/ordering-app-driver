# Inventory — ordering-app-driver (phase 1)

Date: 2026-11-13 · Branch `feature/theming-native` · Code reading only (no simulator run:
see §9).

Sources:

- Scripts (`.theme-audit/`, gitignored): `inventory.json/.csv`, `scales.md`, `components.md`,
  run on `src` excluding `src/@/` (logic submodule).
- Area reports (detail with `file:line`, values today, function and proposal):

| # | Area | Report |
|---|---|---|
| 1 | Theme today, provider, fonts, icons, shared primitives, navigators, tab bar | [areas/1-global-primitives.md](areas/1-global-primitives.md) |
| 2 | Splash, tutorial, welcome, login, OTP, forgot password, permissions, schedule | [areas/2-auth-onboarding.md](areas/2-auth-onboarding.md) |
| 3 | Orders list, order cards, search and filters, new order, accept / reject, logistic | [areas/3-orders-list.md](areas/3-orders-list.md) |
| 4 | Order details, products, bill, action bar, review customer | [areas/4-order-details.md](areas/4-order-details.md) |
| 5 | Map tab, driver map, tracking map, messages tab, chat | [areas/5-map-messages.md](areas/5-map-messages.md) |
| 6 | Profile, personal data, sessions, payouts, Stripe connect, notifications sheet | [areas/6-profile-account.md](areas/6-profile-account.md) |

Decisions taken before the inventory are in [decisions.md](decisions.md) (`driver_app`, a
repository split from v26, the marketplace app's role model and values, phone only, no v1
map, no dark mode).

The coordinator checked against the code, by script, the counts of §1, the primitives' call
sites, the keys read but not defined and every component listed as dead in §7. Everything
else is as the area agents read it.

## 1. Starting metrics

| Metric | Value |
|---|---|
| Source files (`src`, without the submodule and tests) | 247 |
| Design literals (scripts) | 2 445 in 132 files (469 of them in dead code, §7) |
| — space / size / font size / radius / font weight | 745 / 534 / 353 / 247 / 183 |
| — color / border / shadow parts / z-index / font family | 152 / 93 / 36 / 35 / 30 |
| — opacity / line height / motion | 17 / 11 / 4 |
| Inline `style={{` | 484 |
| `StyleSheet.create` | 64 (9 at module level, which never see the theme) |
| Hard-coded `fontFamily` | 30 (`'Poppins'` ×17, which is no bundled file's name) |
| `Platform.OS` / `Platform.select` | 87 |
| Distinct literal colors / families | 33 / 26 (plus 72 keys in `theme.json`) |
| Catalog fit: radius / font size / border / icon / space / control height | 98 % / 88 % / 83 % / 83 % / 77 % / 63 % |
| Fit to the marketplace app's space scale (0/2/5/10/15/20/30/40/50) | its levels 5, 10, 15, 20, 30, 40 and 50 are the exact value of 573 of the 770 uses (74 %); 12 ×27, 4 ×23, 8 ×22, 3 ×18, 24 ×18 and 25 ×18 are the largest groups off it |
| Color keys read but not defined | 5 keys, 16 reads: `textNormal` ×11, `blueLight` ×2, `textGra`, `border`, `toastError` |
| Image keys read but not defined | `general.user`, `general.email`, `general.information` |
| Screens | 20 registered (7 root, 9 home stack, 4 tabs) + 3 page files in no navigator (`Signup`, `NotFound`, `NetworkError`) |
| TypeScript errors / lint errors / tests | 0 / 0 / 674 passing in 120 suites |
| Bundled fonts | 67 files, 20 MB (copied again into `android/app/src/main/assets/fonts`) |
| Bundled images | 9.6 MB, of which the five tutorial slides are 8.96 MB of opaque PNG |

## 2. The theme today

- `src/theme.json`: 72 colors, 2 font roles (`primary` Helvetica, `special`
  `Inter_18pt-Black`) and an empty image manifest that `src/DeliveryApp.tsx` fills with
  `require`d assets, plus `theme.sounds.notification`.
- **One provider**, `ThemeProvider` of `src/ui/src/context/Theme` (a second copy in
  `src/context/Theme` has no importer). It imports from `'styled-components'` (the web
  entry), which works only because Metro resolves the package's `react-native` field. Its
  own `useTheme` tuple is dead: the 97 files that read the theme import `useTheme` from
  `styled-components/native`, and `setTheme` is never called.
- **The app reads no served theme.** The submodule's `OrderingThemeProvider` still asks
  `GET …/theme` at start (version 1, no parameters); the only reader of a served key in app
  code is the `BusinessList` controller, mounted only by `StoresList`, which nothing renders.
  So no project setting is lost by not having a v1 map.
- **Colors:** 13 of the 72 keys are never read; 11 groups of keys share one value (`red` =
  `danger500` = `statusOrderRed`, `yellow` = `primary`, `yellowSecondary` = `secondary`,
  `gray100` = `inputChat`, `white` = `backgroundPage`, `transparent` = `clear`…). Four near
  greys serve muted text (`unselectText`, `arrowColor`, `gray200`, `textSecondary`). `OText`'s
  built-in color is the literal `#344050`, painted by every text that passes none.
- **Fonts:** the code names 3 of the 67 files. Weight is always `fontWeight` over one family
  (faux bold on Android). `Inter_18pt-Black` is the family of every `OButton` label,
  `'Poppins'` (17 uses) matches no file name, and `ONavbar` builds
  `Inter_18pt-Black_18pt-Black`, which exists nowhere: what each platform really paints was
  not seen.
- **Icons:** 10 vector families (MaterialCommunityIcons, AntDesign, Feather, FontAwesome5,
  FontAwesome, MaterialIcons, SimpleLineIcons, Fontisto, Ionicons, Entypo) under 15 import
  names, 13 sizes, plus ~30 tinted PNG icons. Close has five glyphs, chevron-down four, the
  quantity stepper two sets; the Orders tab is a vector glyph and its three siblings PNGs.
- **React 19 ignores `defaultProps`** on the seven primitives that use them (`OButton`,
  `OText`, `OInput`, `OIcon`/`OImage`, `OLink`, `OSegment`, `OIconButton`): `OButton` loses
  `activeOpacity` and its spinner color, `OInput` its background and border color.
- **Sound:** the new-order sound plays a fixed remote URL; the bundled
  `theme.sounds.notification` has no reader.

## 3. Primitives and how they are bypassed

| Primitive | Call sites | Sites that override its look | Notes |
|---|---|---|---|
| `OText` | 367 | 338 (`style` 224, `size` 190, `color` 126, `weight` 112) | 15 raw `<Text>` and 17 `styled.Text` beside it |
| `OButton` | 73 | 73 (`textStyle` 69, `style` 65, `borderColor` 61, `bgColor` 59) | heights 32–50, radii 5 / 7 / 7.6 / 8 / 10, label 12–20 |
| `FloatingButton` | 10 | — | the screens' main action: 50 high, radius 10, label 18; no disabled look |
| `OIcon` | 47 | — | PNG icons with `tintColor` |
| `OInput` | 18 | 18 | five looks for one function; 4 raw `TextInput` |
| `OIconButton` | 18 | 18 | |
| `OModal` | 14 | — | plus `OBottomPopup` (2) and 6 raw `Modal`: three dialog implementations, scrims 0.4 / 0.5 / `#000000AA` |
| `ODropDown` / `ODropDownCalendar` | 6 / 1 | all | in-place lists; plus `react-native-select-dropdown` and the country picker modal used as the language selector |
| Touchables | 50 `TouchableOpacity`, 18 `Pressable`, 21 styled touchables | | most `Pressable`s have no pressed look; many targets under 44 pt |

The conversion is mostly "move the call-site overrides into the primitive's variants".

## 4. Patterns found by several areas

| Pattern | Areas | Today |
|---|---|---|
| Buttons | 1–6 | one function, five implementations (`OButton`, `FloatingButton`, styled touchables); accept / reject in four looks (tonal, solid 40, floating 50, 45 radius 7) |
| Inputs | 2, 3, 6 | radius 7.6 / 10, border 1 / 1.5, four border colors, four placeholder colors, bottom-only border in the profile's read mode |
| Code entry | 2, 3 | three implementations (4 boxes 80×80, 6 cells 45×60 by a library, `SecurityPinFields`) |
| Selects | 1, 3, 6 | four implementations (§3) |
| Cards | 3, 4, 6 | the same outlined or filled box written per screen (radius 10, `gray100` or a 1 pt `tabBar` border) |
| Dividers | 4, 6 | 1 / 2 / 5 / 10 pt in four greys, some drawn as an empty view's border |
| Section titles | 4 | six looks in the order details alone (20/700 … 14/700) |
| Screen titles | 1, 2, 5, 6 | tab titles at 26, `ONavbar` at 24, the chat header at 17 |
| Chips and pills | 3, 5 | order type and status chips, sort chips, quick messages, status pill: four sets of numbers |
| Status and time colors | 3, 4, 5 | `#00D27A` / `#FFC700` / `#E63757` typed by hand in six places; two greens and two reds for one meaning; the 27-status → color map duplicated in two files; the order card paints every status in the brand color |
| Skeletons | 1, 3, 4, 6 | `SkeletonBone` and `rn-placeholder` (9 files) with the library's own colors |
| Avatars and logos | 3, 5, 6 | sizes 16 / 25 / 32 / 40 / 68 / 75 / 123, fallbacks written five ways, two of them remote demo URLs |
| Errors | 2, 6 | toast, inline text in three sizes, a list, system alerts; two reds (`error` #C90800, `red` #E63757) |
| Safe area, status bar, keyboard | 1, 2, 3, 4 | done by hand per screen (`ios ? 0 : 15`, `windowHeight < 845 ? 20 : 30` under the tab bar, FAB offsets 180/140 vs 280/240) |
| Orientation | 1, 3 | three files track it, but the app is portrait-only on both platforms: unreachable |

## 5. Libraries that paint their own UI

| Library | Where | What it draws |
|---|---|---|
| `react-native-gifted-chat` | Chat | the whole thread; date separators, links, message images and the toolbar border stay the library's |
| `react-native-app-intro-slider` | Tutorial | pager, dots, buttons |
| `react-native-phone-number-input` + `react-native-country-picker-modal` | Login, profile, language selector | the field and the country modal |
| `@twotalltotems/react-native-otp-input` | Login OTP | code cells |
| `react-native-select-dropdown` | Orders search | dropdown list |
| `react-native-calendar-picker` | Orders date filter | calendar |
| `rn-placeholder` | 9 files | skeletons |
| `toggle-switch-react-native` | Profile | availability switch |
| `react-native-loading-spinner-overlay` | Login | full-screen spinner |
| `react-native-map-link` (`Popup`) | Driver map | "open in" modal with its own greys |
| `react-native-paper` | the two dropdowns | `Text` only |
| Out of scope (decisions.md) | | `react-native-maps` (tiles, default pins, callout bubbles), reCAPTCHA WebViews, `react-native-signature-canvas`, `Alert.alert`, the system photo picker and share sheets |

Dependencies no app or submodule file imports (to confirm against native linking before
removing): `react-native-elements`, `react-native-picker-select`,
`react-native-awesome-loading`, `react-native-swipe-gestures`, `toggle-react-native`,
`styled-system`, `@react-navigation/drawer`, `react-native-maps-directions`.

## 6. Screens

| Navigator | Screen | Root | Blocks in render order |
|---|---|---|---|
| Root | Splash | View | the launch image |
| Root | IntroductoryTutorial | intro slider | 5 slides (image, title, text), dots, Skip / Next / Done |
| Root | Home (welcome) | View over a background image | logo, title, text, login button |
| Root | Login | ScrollView | header, tabs (email, OTP), fields, forgot link, submit, OTP modal, reCAPTCHA |
| Root | Forgot | ScrollView | header, lead, field, submit |
| Root | ScheduleBlocked | View | title, text, schedule, logout |
| Tabs | Orders | FlatList per tab | title bar (connection, refresh, search), tabs, order cards, grouped orders, empty state; search modal; new-order modal; notifications sheet |
| Tabs | MapView | map | markers, callouts, zoom and locate buttons |
| Tabs | Messages | FlatList | title, sort chips, order rows, empty state |
| Tabs | Profile | ScrollView | title, photo, availability switch, personal data (read / edit), language, schedule, sessions, Stripe and payouts rows, delete account, logout |
| Stack | OrderDetails | ScrollView + floating bar | top bar (back, copy, map, chat), header card (number, status, dates), business card, customer card, products, bill, payments, comments, actions bar; driver map and review modals |
| Stack | OrderDetailsLogistic | ScrollView + floating bar | the same content for an assignment request, accept / reject |
| Stack | AcceptOrRejectOrder | ScrollView | title, timer or reasons, comment, photo and PIN evidence, action buttons |
| Stack | OrderMessage | chat | header, recipients, thread, quick messages, composer |
| Stack | RequestPermissions | View | image, title, disclosure text, button |
| Stack | Sessions | FlatList | header, session cards, bulk actions |
| Stack | StripeConnectAccount | ScrollView | header, status card, action |
| Stack | Payouts | FlatList | header, tabs, payout cards |

Each area report has the screen's conditions per order status, delivery type and server
config.

## 7. Dead code (nothing renders it)

| What | Size | How it was checked |
|---|---|---|
| `OrdersListManager` (a near copy of `OrdersOption` with a split view) | 1 216 lines | exported from `src/ui/index.tsx`, no JSX use; `CLAUDE.md` says `OrdersOption` composes it, the code does not |
| `OrderSummary` (print / PDF), `BusinessProductList`, `StoresList`, `BusinessController` | 1 934 lines | no JSX use outside themselves |
| `SignupForm` and the `Signup`, `NotFound`, `NetworkError` pages, the `NetworkError` UI | ~700 lines | the pages are in no navigator |
| The UI `Contacts` (the Messages tab mounts the controller), `SearchBar`, `OChatBubble`, `OSegment` | ~520 lines | no JSX use |
| `OrdersOptionBusiness`, `…Delivery`, `…Driver`, `…Paymethod`, `…Status` | 341 lines | reachable only through the dead manager |
| Branches of live files: `isBusinessApp`, `isCustomView`, the status-tags row, the SLA settings, the file-attach flow, the customer-chat header, `GoogleMap`'s accept bar, the cart mode of `ProductItemAccordion`, the orientation code | — | conditions that cannot be true in this app (area reports) |
| `src/context/Theme`, `src/layouts/*`, `src/config/constants`, both `AlertProvider`s, both `Responsive`s | — | no importer |
| 13 color keys, 12 bundled images, 64 font files | — | no reader |

4 518 lines of UI components and 469 of the 2 445 literals are in components nothing renders.
`react-native-print`, `react-native-html-to-pdf` and `react-native-intersection-observer` are
imported only by them. Whether they are deleted is the owner's decision (phase 2).

## 8. What the build system expects

- `builder.json` (`ios_project`, `ios_bundle`, `android_package`), the empty marker
  `BUILD_CRA.txt` and `NODE_VERSION.txt`; what the marker means to the pipelines is not
  written in either repository.
- Placeholders replaced as text: `_GOOGLE_MAPS_API_KEY_`, `_TRANSISTORSOFT_API_KEY_`.
- The splash is `react-native-bootsplash` (docs/SPLASH.md): fixed names (`BootSplash.storyboard`,
  `BootSplashLogo.imageset`, `drawable-*/bootsplash_logo.png`, `bootsplash_background`); the logo is square
  (120), made from `assets/bootsplash/logo-source.png` by `scripts/splash-logo.mjs`; JS paints
  `src/assets/images/launch-logo.png` (480 px, the same logo) and a test pins that path.
- Android runs the old architecture (`newArchEnabled=false`); iOS's `Info.plist` says new.

## 9. Not verified

- **Nothing was seen on a device.** Every look in the reports is deduced from style values:
  the fonts each platform falls back to, what the primitives paint without their
  `defaultProps`, what the undefined color keys paint, touch targets, clipping, shadows,
  the tab bar and insets on real phones.
- **iOS on this machine:** the app builds with Xcode 27.2 once no pod target asks for less
  than the app's minimum (fixed in `ios/Podfile`), but it stops at launch on the iOS 27
  simulators: UIKit requires the scene lifecycle, which the app has not adopted (the
  marketplace app has). Seeing iOS needs that native change or an older simulator runtime.
- **Android:** not run yet in this phase.
- States that need server configs or data (logistic module, grouped orders, delivery PIN,
  photo evidence, OTP and cellphone login, reCAPTCHA, schedule block, Stripe payouts),
  right-to-left, font scaling, small and large phones, tablets (iPad is a build target and
  the only tablet branch is a padding).
- The submodule's controllers were read only for the props they pass; the area reports
  list the files each agent skimmed instead of reading whole.
