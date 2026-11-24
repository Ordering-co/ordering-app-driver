# Area 1 — global, primitives and shell

Phase 1 inventory, read-only. Nothing was run on a device or simulator: every statement below comes from reading code and from counting scripts over the source (`src` without `src/@/`, without `__tests__` and `*.test.*`; 247 source files). No repository file was modified except this report.

Path shorthands used in every `file:line`:

- `shared/` = `src/ui/src/components/shared/`
- `~/` = `src/ui/src/components/`
- `ui/` = `src/ui/src/`
- everything else is relative to the repository root.

How counts were made: JSX opening tags parsed per file (props at brace depth 0), `theme.colors.X` / `images.G.K` / `fonts.R.K` by regular expression (optional chaining included), reachability by following imports from `index.js` (relative paths, `@ui`, `@/`). A key read through a variable would be missed by the regex: none was found (`grep "colors\["`, `"images\["` → only a local `colors[order?.status]` map in `~/OrderDetails/OrderHeaderComponent.tsx:189`, which is another area's).

---

## 1 — Global, primitives and shell

### Elements

| Screen / component | Element | file:line | Values today | Function | Proposal (component, token or key) |
|---|---|---|---|---|---|
| OText | text | shared/OText.tsx:5-29 | color: prop or `'#344050'` (literal, same hex as `textGray`); family: prop or `theme.fonts.primary.name` (`Helvetica`); weight 400 unless `weight`; size: prop px or `14px`; margins: `hasBottom` → 10/10/10, else `mBottom`/`mRight`/`mLeft`; `flex: 1/0` when `isWrap`; `text-decoration: ${textDecorationLine}` (prints `undefined` when absent); `lineHeight` passed inline (:53) | Every text of the app (367 call sites) | text primitive with typography presets; color from a role; margins out of the primitive (space tokens at the caller) |
| OButton, enabled | touchable + box + label | shared/OButton.tsx:13-26, 33-41, 110-138 | bg `primary`, radius 10, border 2 `primary`, height 50, padding L/R 20, `box-shadow: 1px 1px 2px #00000020`; label 16 / 700 / `white`, margin L/R 10, family `theme.fonts.special.name` (`Inter_18pt-Black`); `bgColor` + `borderColor` props override inline, but `borderColor` is applied only when `bgColor` is also passed (:120-126); `isCircle` → width 52 (:115) | Primary action | `button` (colors × appearances, sizes) |
| OButton, disabled | View (not touchable) | shared/OButton.tsx:28-31, 43-45, 85-95 | bg + border `disabled` (#CBCBCB), label color `primary` (#FFB700) | Disabled state | `button` disabled state (theme's disabled) |
| OButton, loading | View + spinner | shared/OButton.tsx:97-106 | same box; `ActivityIndicator size="small"` color `indicatorColor` (the `'white'` default is in `defaultProps`, ignored by React 19 → undefined unless passed; 4 of 73 sites pass it) | Loading state | `button` loading state + `spinner` |
| OButton images | left / right image | shared/OButton.tsx:47-60, 128-136 | left 20×20 contain; right 15×15 contain, absolute right 20 | Icon in a button | `icon` inside `button` (takes the button's size and ink) |
| OIcon | image | shared/OIcon.tsx:8-10, 29-58 | `tint-color: primary` in the styled image, always overridden by inline `tintColor: props.color` (undefined when no color → no tint); size prop or 26×26; `contain` (or `cover`); wrapper `overflow: hidden`, radius from `style.borderRadius`; source fallback chain `src → url → dummy → theme.images.logos.logo` (:37-44) | Tinted PNG icon AND remote avatar/logo image (both jobs) | `icon` primitive (sizes `icon.*`, color by role) and a separate image/avatar primitive |
| OIconButton, enabled | touchable pill | shared/OIconButton.tsx:6-15, 61-90 | height 40 (prop), radius = height/2 (20), border 1 (`borderColor` or `color`, css default `white`), padding H 20; bg `isOutline ? 'white' : bgColor or color`; icon 22×22 tint `iconColor`; title 16, margin H 7, color `textColor or color`, no font family (system font) | Icon button / pill button | `button` with `shapes.icon` (icon button) |
| OIconButton, disabled | View | shared/OIconButton.tsx:16-25, 92-121 | border + bg `backgroundDark` (#484848) or `disabledColor` | Disabled icon button | `button` disabled state |
| OInput | field | shared/OInput.tsx:12-33, 76-141 | wrapper: bg `backgroundLight` in css but overridden inline by `bgColor` (undefined: the `'white'` default lives in ignored `defaultProps`), radius `border` prop or 10, border 1.5 with color `borderColor` prop (undefined by the same reason), padding H 16, height 50; input: 15 / 400, family `fonts.primary`, min-height 30; left `OIcon` 20×20 margin-right 10; left vector icon `MaterialIcons` 20, color `vectorIconColor` or `theme.colors.textNormal` (undefined key), margin H 10; placeholder color prop or `baseColor` (#B1BCCC); right `OIcon` 20×20; `maxLength` 1000 | Text field | `input` + `field` |
| OTextarea | multiline field | shared/OTextarea.tsx:5-14, 29-42 | radius 10, border 1 `lightGray`; inner height 100, padding 5 10; placeholder `lightGray`; no family, no size (system 14) | Comment box (1 call site) | `input` (multiline) |
| OModal, full screen (`entireModal`) | modal + header | shared/OModal.tsx:59-173, 176-276 | RN `Modal` `animationType="slide"`; header: `marginTop: insets.top`, padding H 20, padding-bottom 25 (15 with `hideIcons`), border-bottom 2 `#e6e6e6` (0 with `hideIcons`); back = `OIconButton` 24×24 icon `arrow_left`, transparent; title `OText` 24 / 700; 3 avatar frames 34×34 radius 7.6 with shadow (0,2) 0.25 / 3.84 / elevation 3, images 33×33 | Full-screen modal with a back header and order avatars | `modal` + `header` |
| OModal, centered | dim overlay | shared/OModal.tsx:63-70, 193-204 | overlay `rgba(0, 0, 0, 0.4)`, centered; a title row is always rendered (even with an empty title) with the header's padding and 2 pt `#e6e6e6` bottom border | Dialog over a scrim | `modal` (scrim color role) |
| OBottomPopup | bottom sheet | shared/OBottomPopup.tsx:23-45, 49-72 | RN `Modal` `fade`, scrim `#000000AA`; sheet bg `#FFFFFF`, top radius 20, padding H 20, `maxHeight: Dimensions.get('window').height` (module level); title raw `Text` 20 / bold, margin V 15; no bottom inset | Bottom sheet (2 call sites) | `sheet` |
| ODropDown, closed | select trigger | shared/ODropDown.tsx:30-44, 125-153 | padding 15, radius 10, border 1; border/bg `bgcolor` or (`secondary` ? `lightGray`/`white` : `primary`); label 16, color `textcolor` or (`secondary` ? `black` : `white`), no family; right icon absolute right 12 top 13: `Feather chevron-down` 24 color `textcolor`, or `AntDesign close` 20 color `theme.colors.textNormal` (undefined) when a value is set and `handleClear` exists | Filter select | `select` that opens a `sheet` with `menu` rows |
| ODropDown, open | in-place list | shared/ODropDown.tsx:46-68, 154-225 | absolute top 65, z-index 9999, border 1 `inputChat`, `shadow-color: 'rgba(0.0, 0.0, 0.0, 0.5)'` (quoted, not a valid color), shadow-opacity 0.21, elevation 7, bg `white`, radius 7.6, padding L/R 10; row padding 15, border-bottom 1 `lightGray`, `font-size: 16px` set on a View (no effect); radio `MaterialCommunityIcons radiobox-marked` 24 `primary` / `radiobox-blank` 24 `arrowColor`; label = `react-native-paper` `Text` with no style | Options list | `sheet` + `menu` row + `radio` |
| ODropDownCalendar | date filter | shared/ODropDownCalendar.tsx:77-90, 181-356 | same trigger and list as ODropDown (copy), trigger icon `AntDesign calendar`/`close` 20 `textNormal` (undefined); From/To inputs: min-height 36, 12, `'Poppins-Regular'`, border 1 `tabBar` (active `primary`), padding 7 14, color `backArrow`, radius 7.6; labels paper `Text`; clear `AntDesign close` 20 `disabled`; `CalendarPicker` width `window − 80`, chevrons `Feather` 24 `disabled`, selected day bg `forgotText` text `textGray`, today bg `theme.colors.border` (undefined), headers 12 `unselectText` | Date range filter (1 call site) | `select` sheet with a date picker inside; `input` |
| OFab | round button | shared/OFab.tsx:17-52 | 30×30, bg `black`, radius 100, icon 20 `white` (Ionicons or MaterialCommunityIcons), shadow (0,3) 0.27 / 4.65 / elevation 6, z-index 9999, `activeOpacity` 0.8 | Map zoom / recenter buttons (4 sites) | `button` with `shapes.icon` |
| OLink | link | shared/OLink.tsx:69-88 | `Pressable`; text = `OText` (color prop, 1 line); `hasButton` → `OButton` width 100%, radius 10, text `white` | Phone / URL link (9 sites, one file) | text primitive with a link preset, or `button` appearance link |
| ONavbar | screen header | shared/ONavbar.tsx:15-57 | row, padding-bottom 15; back `OIconButton` icon `arrow_left` 24×24, transparent, absolute top −20 left −20; title 24 / 700 `textGray`, family `` `${theme.fonts.special.name}_18pt-Black` `` = `Inter_18pt-Black_18pt-Black` (no such font), centered | Header of 8 screens | `header` |
| OToast | toast | shared/OToast.tsx:52-73, 77-93 | absolute, centered, maxWidth 480, bottom `(insets.bottom or 20) + 20`, z-index 9999999999; radius 16, padding 16; bg `toastInfo` or `#6BA4FF`, `toastError` (undefined) or `#D83520`, `toastSuccess` or `#90C68E`; raw `Text` 14 `#fff` centered (system font) | App toast (mounted once, DeliveryApp.tsx:161) | `toast` |
| OAlert / OAlertOriginal | system alert | shared/OAlert.tsx:22-37; shared/OAlertOriginal.tsx:39-42 | `Alert.alert` with Cancel/Accept | Confirmation and SDK errors | `alert` (system alerts are not themable) |
| SkeletonBone | pulse block | shared/SkeletonBone.tsx:13-59 | default height 12, radius 6; bg `inputSignup` (#DEE2E6); opacity 0.7 ↔ 1 | Skeleton unit | `skeleton` primitive (global color; sizes stay layout) |
| OrderListItemSkeleton / OrderListSkeleton | order row skeleton | shared/OrderListItemSkeleton.tsx:19-99; shared/OrderListSkeleton.tsx:18-35 | row min-height 97, padding V 6, margin-bottom 12; avatar 75×75 r10; lines 16/12/12, pill 88×24 r5, dot 22 r11; divider hairline `borderTops`; list bg `backgroundPage`, padding-top 2, 5 rows | Orders / messages loading (5 sites) | `skeleton` + `divider` |
| ChatMessageSkeleton | chat skeleton | shared/ChatMessageSkeleton.tsx:45-60, 80-154 | header padding 12/10, hairline `borderTops`, bg `white`; bubbles maxWidth 78%, min-height 38/52, padding 14/10, radius 30 with one corner 0, bg `inputDisabled` (left) / `secondary` (right), gap 6; toolbar bones 32 r16, 40 r15, 44 r15 | Chat loading (1 site) | `skeleton` |
| Container (layout) | screen scroll | ui/layouts/Container.tsx:5-56 | core `SafeAreaView` + `ScrollView`, both bg `backgroundPage`; padding `0px 20px 20px` on iOS portrait, else `20px`; `StatusBar` (see App-wide 8) | Root of Login, Forgot, Sessions | screen container (space token for the gutter; inset from the safe area) |
| SafeAreaContainer | screen box | ui/layouts/SafeAreaContainer.tsx:20-49 | `View` flex 1, bg `backgroundPage`, padding = insets of the chosen `edges` | Root of 4 screens | screen container |
| SafeAreaContainerLayout | screen box + gutter | ui/layouts/SafeAreaContainer.tsx:51-101 | SafeAreaContainer edges top/left/right + `View` padding H 20 (`paddingHorizontal` prop) + `StatusBar` whose Android bg turns `danger500` offline and `success500` for 2 s on reconnect | Root of 7 screens | screen container; connectivity colors from state roles |
| Tab bar | bar | src/navigators/BottomNavigator.tsx:32-62, 128-138 | bg `white`, border-top 1 `tabBar`, shadow (0,5) 0.36 / 6.87 / elevation 11; iOS: height 80 and padding-bottom 20 when window height < 845, else 90 / 30; Android: height `70 + insets.bottom`; active tint `primary`, inactive `disabled`; labels drawn by hand (`tabBarShowLabel: false`) | Bottom navigation | `tab_bar` |
| Tab bar item | icon + label | src/navigators/BottomNavigator.tsx:64-125 | container padding-top 10; Orders icon = `FontAwesome5 list-alt` 20; Map / Messages = PNG 20×20; Profile = PNG 23×23, all tinted with the tab tint; label `OText` 12 (14 on iPad) / 700, 1 line, `adjustsFontSizeToFit`, color `textGray` focused, else the inactive tint | Tab | `tab_bar` (label typography, icon size) + `icon` |
| WebsocketStatus pill | status chip | ~/WebsocketStatus/index.tsx:41-88 | width 100, radius 10, padding 10/15, `activeOpacity` 0.6; bg by status: 0 `warning100`, 1 `'#E3FEF3'` (literal = `success100`), 2 `danger100`, other `'#FFF1E0'`; text 16 / lineHeight 16, color `'#FF9922'` / `'#00D27A'` / `'#E63757'` (literals) | Socket state on the orders header | `chip` or `badge` with state color roles |
| WebsocketStatus modal | dialog | ~/WebsocketStatus/index.tsx:90-162; ~/WebsocketStatus/styles.tsx:7-29 | card bg `white`, radius 10, width `window − 40`, padding 20; title 20 / 700 `textGray`; "Last update" 14 / 400; close `MaterialCommunityIcons close` 28 `gray200`; 3 rows radius 10, padding 10, margin-bottom 10, bg `success100` / `warning100` / `danger100`, dot 12, title 18 / 700 `textGray`, description 14 / 400 `unselectText`; button row margin-top 50, `OButton` radius 8, height 50 | Connection status legend + restart | `modal` + `card` + `button` |
| FloatingButton bar | bottom action bar | ~/FloatingButton/styles.tsx:3-20; ~/FloatingButton/index.tsx:37-64 | absolute bottom 0, width 100%, padding V 10, bg `#fff`, z-index 1000; iOS padding-bottom `max(paddingBottomIos ?? 5, home-indicator inset outside tabs)`; padding H 20 when `isPadding` | Sticky actions of order screens | bottom action bar (surface role, space, safe-area minimum from the theme) |
| FloatingButton button | touchable | ~/FloatingButton/styles.tsx:22-35; ~/FloatingButton/index.tsx:72-139 | radius 10, height 50, width `widthButton` (always `'100%'` at call sites), stacked `column-reverse`, first button margin-top 10; bg: with two buttons `firstColorCustom` / `secondColorCustom` (callers pass `red` / `green`), with one button `color` or `primary` (`principalButtonColor`); border 1 `colorTxt1` when set; label 18, `fontWeight: 'normal'` in style (the `weight='700'` prop loses to it), `white`, absolute centered, 2 lines; side values 16 / 700 `white`, margin 20; `disabled` blocks the press with no visual change | Accept / reject / complete / failed | `button` (colors: danger, success, primary; one size) |
| NotFoundSource | empty state | ~/NotFoundSource/index.tsx:12-50; ~/NotFoundSource/styles.tsx:3-16 | margin `30px auto`, padding 10, centered; image 260×220 in max-width 300; text `textSecondary`, size `textSize ?? 18`, centered; button wrapper margin-top 10, `OButton` width 100%, height 50, radius 7.6, bg/border `primary`, text `white` | Empty / error states (15 sites) | `empty_state` |
| NetworkError | full-screen error | ~/NetworkError/index.tsx:21-56; ~/NetworkError/styles.tsx:3-11 | padding 20 40; title 20 / 700 `darkText`, margin-bottom 14; body 14 `darkText`; image `(screenW − 80) × 0.9` by `× 0.8`; `OButton` radius 8, margin-top 45, bg/border `primary`, text `white` | Offline screen (not reachable today, see Dead code) | `empty_state` |
| SearchBar | search field | ~/SearchBar/index.tsx:47-112 | width 225, radius 7.6, bg `inputDisabled`; `OInput` transparent, placeholder `arrowColor`, selection `primary`, text `textGray`; cancel `OButton` bg `clear`, border `lightGray`, max-height 20; clear `Feather x-circle` 22 `unselectText`; search `OIconButton` 25×25 | Search (only rendered by components nothing renders, see Dead code) | `search_bar` inheriting `input` |
| LogoutButton | row button | ~/LogoutButton/index.tsx:32-61 | row, margin-bottom 40; label `textGray`, `'Poppins'`, 600, 16, margin-right 10; icon `menulogout` 18×18 tint `disabledContrast` (#000) | Log out (profile) | `button` (text appearance) with an `icon` |
| LanguageSelector | select row | ~/LanguageSelector/index.tsx:52-112; ~/LanguageSelector/styles.tsx:3-17 | box radius 7.6, margin-bottom 18, bg `inputChat`; row padding 8; emoji flag 24; label 16 `unselectText`; chevron PNG 20×20; the list is `react-native-country-picker-modal`'s own modal, rows with `activeOpacity` 1 | Language picker (profile) | `select` (sheet with `menu` rows) |

### Duplicates (same function, different implementation)

| Function | Implementations (file:line) | Visible differences |
|---|---|---|
| Theme provider + `useTheme` tuple | ui/context/Theme/index.tsx:10-25; src/context/Theme/index.tsx:10-23 | Identical code. The second file has no importer |
| Scroll screen container | ui/layouts/Container.tsx:22; src/layouts/Container.tsx:22 | Same; the `src/layouts` copy lacks `forwardRef` and spells the prop `nopadding`. No importer |
| Safe-area container | ui/layouts/SafeAreaContainer.tsx:20 (View + insets); src/layouts/SafeAreaContainer.tsx:3 (styled core `SafeAreaView`); ui/layouts/Container.tsx:17 (core `SafeAreaView`); `SafeAreaView` of `react-native-safe-area-context` in 6 files (App-wide 8) | Core `SafeAreaView` does nothing on Android; the context one pads on both |
| Alert provider | ui/providers/AlertProvider.tsx:12; src/providers/AlertProvider.tsx:12; shared/OAlertOriginal.tsx:15 | First two byte-identical and unused; the third is the one mounted |
| `normalize()` | ui/providers/Responsive.tsx:8; src/providers/Responsive.tsx:8 | Identical; only reader is the dead `OSegment` |
| Storage helpers | ui/providers/StoreUtil.tsx; src/providers/StoreUtil.tsx | Both live (the second is imported by `RootNavigator.tsx:45`); `_setStoreData` differs (async + always `JSON.stringify` vs sync + strings as they are) |
| `getTraduction`, `getIconCard`, `flatArray`… | ui/utils/index.tsx:8-126; src/utils/index.tsx:6-98 | `src/utils` is an older copy (shorter key list); only `setSecureOrderProject` and `flatArray` are imported from it |
| `useLocation` | ui/hooks/useLocation.tsx; src/hooks/useLocation.tsx | Both live (root one used by `RootNavigator.tsx:19`) |
| Constants | ui/config/constants.tsx:1-10; src/config/constants.tsx:1-10 | Root copy has no importer |
| Orientation state | ui/hooks/DeviceOrientation.tsx:7; ui/layouts/Container.tsx:23-35; ui/layouts/SafeAreaContainer.tsx:56-68 | Three hand-made listeners; the two layouts add a `Dimensions` listener on every render and never remove it |
| Select with options list | shared/ODropDown.tsx:70; shared/ODropDownCalendar.tsx:92; `react-native-select-dropdown` (3 files, other areas); `react-native-country-picker-modal` in ~/LanguageSelector/index.tsx:55 | Four ways to pick one option; the first two are a copy of each other (styled blocks at :27-68 and :34-75 are the same text) |
| Modal / sheet | shared/OModal.tsx:177; shared/OBottomPopup.tsx:23; raw `Modal` in 4 more files (App-wide 2) | Scrims `rgba(0,0,0,0.4)` vs `#000000AA`; `slide` vs `fade`; radius 20 vs none |
| Primary button | shared/OButton.tsx:84; ~/FloatingButton/styles.tsx:22; shared/OIconButton.tsx:56; shared/OFab.tsx:17; styled touchables in 13 files | Height 50 / 50 / 40 / 30; radius 10 / 10 / 20 / 100; label 16 bold Inter vs 18 normal Helvetica vs 16 system |
| Button radius for the same primary button | 10 (shared/OButton.tsx:15), 8 (~/WebsocketStatus/index.tsx:156, ~/NetworkError/index.tsx:47), 7.6 (~/NotFoundSource/index.tsx:41), 10 (shared/OLink.tsx:75) | Three radii for one button |
| Screen header (back + title) | shared/ONavbar.tsx:41-56; shared/OModal.tsx:208-223 | Same back button and 24 / 700 title; navbar centers the title and uses a font name that does not exist, the modal left-aligns it with the default family |
| Close icon | `MaterialCommunityIcons close` 28 (~/WebsocketStatus/index.tsx:111); `AntDesign close` 20 (shared/ODropDown.tsx:137, shared/ODropDownCalendar.tsx:197, 291, 311); `Feather x-circle` 22 (~/SearchBar/index.tsx:99); PNG `general.close` (3 files, other areas); `Feather x` (other area) | Five glyphs for "close/clear" |
| Chevron down | `Feather chevron-down` 24 (shared/ODropDown.tsx:145); PNG `general.chevronDown` 20 (~/LanguageSelector/index.tsx:78); `AntDesign down`, `MaterialCommunityIcons chevron-down` (other areas) | Four glyphs |
| Skeleton | shared/SkeletonBone.tsx (15 sites) vs `rn-placeholder` `Placeholder`/`PlaceholderLine` (15 + 31 sites in 9 files) | Two skeleton systems; rn-placeholder paints its own gray |
| Status colors | theme `danger500`/`success500` (ui/layouts/SafeAreaContainer.tsx:72, 76) vs literals `'#E63757'`/`'#00D27A'`/`'#FF9922'` (~/WebsocketStatus/index.tsx:57-63) vs `red`/`green` (FloatingButton callers) | Same hex under 3 names and as literals |
| Empty state | ~/NotFoundSource/index.tsx:8; ~/NetworkError/index.tsx:10 | Same image + text + primary button, different paddings, text sizes and radius |

### Blocks and pieces

| Page | Block or piece | Hideable? Movable? | Why |
|---|---|---|---|
| Shell | Tutorial before Home (`IntroductoryTutorial`) | Hideable (today: `config.json` `show_tutorials` + AsyncStorage `isTutorial`), src/navigators/RootNavigator.tsx:68, 744-756 | A build flag today; candidate visibility key |
| Shell | Schedule gate (`ScheduleBlocked` replaces the whole authed app) | Not hideable | Driven by `configs.driver_login_validation` + the user's schedule (RootNavigator.tsx:66, 772-778): behaviour |
| Shell | Splash while loading | Not hideable | RootNavigator.tsx:732-738, HomeNavigator.tsx:93-99 |
| Tab bar | Tabs Orders, Map view, Messages, Profile | Order is fixed in code (BottomNavigator.tsx:139-198); each tab could be hidden except Orders (initial route) | Question for the product owner: may a theme hide Map view or Messages? |
| Tab bar | Map view tab body | Swapped for `RequestPermissions` when location is not granted (BottomNavigator.tsx:155-157) | Behaviour, not theme |
| Tab bar | Labels under icons | Hideable | Drawn by hand inside the icon (BottomNavigator.tsx:115-123) |
| Orders header | WebsocketStatus pill | Hideable | Self-contained (`~/WebsocketStatus/index.tsx:68-88`); rendered from `~/OrdersOption/index.tsx:557` |
| OModal header | Order avatars (business, customer, driver) | Hideable (already a prop: `hideIcons`, shared/OModal.tsx:224) | Decorative |
| OModal header | Back button + title | Not hideable unless `customClose` | Only way out of the modal on iOS |
| FloatingButton | First (reject / failed) button | Hideable (prop `isHideRejectButtons`, ~/FloatingButton/index.tsx:71) | Already conditional on configs at the callers |
| FloatingButton | Left / right values (`btnLeftValue`, `btnRightValue`) | Never shown: no caller passes `btnLeftValueShow` / `btnRightValueShow` | Dead props |
| NotFoundSource | Image | Always shown: `image or theme.images.general.notFound` is always truthy (~/NotFoundSource/index.tsx:12-20), so the "text only" branch (:21-28) never renders and the `errorImage` prop is not read | Candidate visibility key |
| NotFoundSource | Text, button | Shown by props | Content |
| Profile | LanguageSelector | Hidden by itself while loading or with ≤ 1 language (~/LanguageSelector/index.tsx:52) | Data-driven |
| Profile | LogoutButton | Not hideable | Only way to sign out |
| App | Toast | Not hideable | Feedback channel |
| Screens with SafeAreaContainerLayout | Status-bar connectivity color (Android) | Hideable | ui/layouts/SafeAreaContainer.tsx:70-81 |

### Images

| Key or source | file:line | Painted box | Fit | Fallback | alt |
|---|---|---|---|---|---|
| `theme.images.general.arrow_left` (24×24 PNG) | shared/ONavbar.tsx:44; shared/OModal.tsx:211 | 24×24 (`iconStyle`) | default of `Image` (cover) on the enabled branch | none | none |
| `theme.images.general.map` / `messages` / `profile` | src/navigators/BottomNavigator.tsx:81, 90, 99 | 20×20, 20×20, 23×23, tinted | contain | none | none (label next to it) |
| `theme.images.general.notFound` (279×279) | ~/NotFoundSource/index.tsx:12, 18 | 260×220 | contain | is itself the fallback of the `image` prop | none |
| `theme.images.general.noNetwork` (1002×904, 114 KB) | ~/NetworkError/index.tsx:17, 37-41 | `(screenW−80)×0.9` by `(screenW−80)×0.8` | contain | fallback of `image` prop | none |
| `theme.images.general.search` (65×65) | ~/SearchBar/index.tsx:104 | 25×25 | cover (default) | none | none |
| `theme.images.general.menulogout` (64×64) | ~/LogoutButton/index.tsx:56 | 18×18, tint `#000` | contain | none | none |
| `theme.images.general.chevronDown` (64×64) | ~/LanguageSelector/index.tsx:78 | 20×20, no tint | contain | none | none |
| `theme.images.logos.logo` (200×200) | shared/OIcon.tsx:44 | whatever the caller asks (26×26 default) | contain | last resort of every `OIcon` with no source | none |
| API `order.business.logo` through `optimizeImage(…, 'h_300,c_limit')` | shared/OModal.tsx:227-234 | 33×33, radius 7.6 | contain (the `resizeMode: 'stretch'` in the style at :90 loses to the prop) | `theme.images.dummies.businessLogo` (:237) | none |
| API `order.customer.photo` | shared/OModal.tsx:245-250 | 33×33 | contain | `theme.images.dummies.customerPhoto` (a remote Cloudinary demo URL, DeliveryApp.tsx:94-95) | none |
| API `order.driver.photo` | shared/OModal.tsx:257-262 | 33×33 | contain | `theme.images.dummies.driverPhoto` (remote URL on `res.cloudinary.com/demo/…freeiconspng.com…`, DeliveryApp.tsx:92-93) | none |
| `OButton` `imgLeftSrc` / `imgRightSrc` (caller's) | shared/OButton.tsx:129, 135 | 20×20 / 15×15 | contain | none | none |
| `OIconButton` `icon` (caller's) | shared/OIconButton.tsx:73-79 | 22×22 | cover on the enabled branch, contain/cover on the disabled one | none | none |
| Emoji flag (`Flag withEmoji`) | ~/LanguageSelector/index.tsx:66-70, 99-103 | 24 | text glyph | none | none |

No `accessibilityLabel` on any image or icon-only button of the area.

### Off the scale or without a token

| Value | Where | Why it does not fit |
|---|---|---|
| radius 7.6 | shared/OModal.tsx:89, 100; shared/ODropDown.tsx:56; shared/ODropDownCalendar.tsx:63, 286, 306; ~/SearchBar/index.tsx:52, 61; ~/NotFoundSource/index.tsx:41; ~/LanguageSelector/styles.tsx:6 | A fractional radius (56 uses app-wide per `scales.md`); next to 8 and 10 for the same boxes |
| radius 18, 35, 100, 50 | shared/OSegment.tsx:17; shared/OChatBubble.tsx:10; shared/OFab.tsx:40; shared/OModal.tsx:125 | Pills/circles written as numbers |
| border 1.5, 2 | shared/OInput.tsx:15; shared/OButton.tsx:16; shared/OModal.tsx:78 | Two widths beside the 1 pt lines |
| `StyleSheet.hairlineWidth` | shared/OrderListItemSkeleton.tsx:51; shared/ChatMessageSkeleton.tsx:90, 113 | Device-dependent width |
| z-index 9999, 10000, 9999999999, 1000 | shared/ODropDown.tsx:48; shared/ODropDownCalendar.tsx:55; shared/OFab.tsx:36; shared/OModal.tsx:112, 189; shared/OToast.tsx:82; ~/FloatingButton/styles.tsx:14 | Arbitrary stacking numbers |
| Shadows: (1,1) 2 `#00000020`; (0,2) 0.25 / 3.84 / elev 3; (0,2) 0.25 / 4 / elev 5; (0,3) 0.27 / 4.65 / elev 6; opacity 0.21 / elev 7; (0,5) 0.36 / 6.87 / elev 11 | shared/OButton.tsx:22; shared/OModal.tsx:101-108, 136-143; shared/OFab.tsx:43-50; shared/ODropDown.tsx:52-54; src/navigators/BottomNavigator.tsx:44-51 | Six shadows, none shared |
| `'#344050'` | shared/OText.tsx:6 | The default color of every text is a literal equal to `textGray` |
| `'#e6e6e6'`, `'#CCCCCC80'`, `'#F194FF'`, `'#2196F3'`, `'white'` | shared/OModal.tsx:79, 126, 132, 151, 154, 157 | Literals (the last four in unused styles) |
| `'#000000AA'`, `'#FFFFFF'` | shared/OBottomPopup.tsx:52, 60 | Scrim and surface literals |
| `rgba(0, 0, 0, 0.4)` | shared/OModal.tsx:69 | Second scrim |
| `'black'`, `'white'`, `'#000'` | shared/OFab.tsx:25, 27, 39, 43 | Literals in a module-level StyleSheet |
| `'white'` (border), `'white'` (outline bg) | shared/OIconButton.tsx:11, 21, 66 | Literals |
| `'#959595'`, `'white'` | shared/OInput.tsx:146-148 | In `defaultProps` (ignored) |
| `'#6BA4FF'`, `'#D83520'`, `'#90C68E'`, `'#fff'` | shared/OToast.tsx:55, 58, 61, 91 | Fallbacks; the error one is the color actually painted (`toastError` is undefined) |
| `'#E3FEF3'`, `'#FFF1E0'`, `'#FF9922'`, `'#00D27A'`, `'#E63757'` | ~/WebsocketStatus/index.tsx:46, 50, 57-63 | State colors as literals; the orange has no theme key at all |
| `#fff` | ~/FloatingButton/styles.tsx:13 | Surface literal |
| `'white'`, `'grey'`, `'#ADADAD'`, `normalize(8.8)` | shared/OSegment.tsx:8, 13, 59, 64, 68, 69 | Dead component; font size scaled by screen width |
| `'black'` | shared/OChatBubble.tsx:79, 89 | Dead component |
| font size 9 | shared/OChatBubble.tsx:92 | Below any text scale |
| text 18 with `fontWeight: 'normal'` | ~/FloatingButton/index.tsx:48-50 | The main action label is the only 18 pt normal label; `OButton`'s is 16 / 700 |
| widths 225, 100, 120×60, maxWidth 480, 300, 40 | ~/SearchBar/index.tsx:49, 107; ~/WebsocketStatus/index.tsx:78; src/navigators/styles.tsx:4-5; shared/OToast.tsx:81; ~/NotFoundSource/styles.tsx:15 | Fixed layout widths |
| `windowHeight < 845`, heights 80 / 90 / 70, paddings 20 / 30 | src/navigators/BottomNavigator.tsx:32-37 | A device guess instead of the bottom inset on iOS |
| `top: -20, left: -20` | shared/ONavbar.tsx:26-27 | Negative offsets to undo the button's own padding |
| `top: 65px` | shared/ODropDown.tsx:49; shared/ODropDownCalendar.tsx:56 | List position tied to the trigger's height |
| `width - 40`, `width - 80`, `(deviceWidth - 80) * 0.9` | ~/WebsocketStatus/index.tsx:97; shared/ODropDownCalendar.tsx:339; ~/NetworkError/index.tsx:39-40 | Sizes computed from the window with literal gutters |
| `margin: 30px auto` | ~/NotFoundSource/styles.tsx:10 | `auto` margin in React Native |
| `text-decoration: undefined` | shared/OText.tsx:28 | Invalid declaration emitted on every text without the prop |
| `shadow-color: 'rgba(0.0, 0.0, 0.0, 0.5)'` | shared/ODropDown.tsx:52; shared/ODropDownCalendar.tsx:59 | Quoted string, not a color |

### Screens

The area owns the shell, not pages. Per shell level:

| Screen / level | Root container | Sticky children | Blocks in render order |
|---|---|---|---|
| App | `SafeAreaProvider` (App.tsx:27) | — | `ThemeProvider` → `OrderingProvider` → `OfflineActionsProvider` → `PermissionsProvider` → `AppContainer` (`NavigationContainer` → `RootNavigator`) + `OToast` as a sibling above the navigation (DeliveryApp.tsx:156-165) |
| RootNavigator | `View` flex 1 with `onTouchEnd` that posts the driver's location on every touch (RootNavigator.tsx:727-730) | — | Stack, all `headerShown: false`: Splash while `!loaded or permissionsState.isLoading`; signed out: IntroductoryTutorial or Home, Login, Forgot; signed in: ScheduleBlocked or MyAccount (HomeNavigator) (:731-790) |
| HomeNavigator | Stack (HomeNavigator.tsx:44-100) | — | BottomTab, OrderDetails, OrderDetailsLogistic, AcceptOrRejectOrder, OrderMessage, RequestPermissions, Sessions, StripeConnectAccount, Payouts; Splash while the session loads |
| BottomNavigator | `Tab.Navigator` (BottomNavigator.tsx:128-199) | Tab bar | Orders (initial), MapView (or RequestPermissions), Messages, Profile (`unmountOnBlur`) |
| Layout `Container` | core `SafeAreaView` → `ScrollView` (`keyboardShouldPersistTaps="handled"`) | none | children (pages Login.tsx:43, ForgotPassword.tsx:21, Sessions.tsx:16) |
| Layout `SafeAreaContainer` | `View` | none | children (pages AcceptOrRejectOrder.tsx:9, IntroductoryTutorial.tsx:194 with `edges={[]}`, OrderMessage.tsx:35 with top/left/right) |
| Layout `SafeAreaContainerLayout` | `View` in `View` | none | `StatusBar`, children (pages Messages.tsx:36, MyOrders.tsx:105, OrderDetails.tsx:58, OrderDetailsLogistic.tsx:17, Payouts.tsx:14, Profile.tsx:54, StripeConnectAccount.tsx:14) |
| `FloatingButton` | absolutely positioned bar at the bottom of its parent (not a scroll child) | itself | first button, second button above it (`column-reverse`) |
| `NotFoundSource` / `NetworkError` | `View` | none | image, text, children or button / title, text, image, button |
| `WebsocketStatus` modal | `OModal` (centered) → `View` | none | title + last update + close; 3 status rows; Update button |
| `ODropDown*` list | plain `ScrollView` with `nestedScrollEnabled` inside an absolutely positioned box (`maxHeight` 200–220 from callers) | none | option rows; From/To inputs; calendar |

Pages that use none of the layouts (their own root): Home.tsx:31 (`View` + translucent StatusBar), Splash.tsx:60, MapView.tsx:13, RequestPermissions.tsx:50, ScheduleBlocked.tsx:22 (`SafeAreaView` of safe-area-context, top edge). They belong to other areas.

### Text roles

| Look (size / weight / lineHeight / color / family) | Where | Role |
|---|---|---|
| 14 / 400 / — / `#344050` / Helvetica | shared/OText.tsx:5-10 (default) | Body (default of the primitive) |
| 16 / 700 / — / `white` / `Inter_18pt-Black` | shared/OButton.tsx:33-41 | Button label |
| 16 / 700 / — / `primary` / `Inter_18pt-Black` | shared/OButton.tsx:43-45 | Disabled button label |
| 16 / — / — / caller's color / system | shared/OIconButton.tsx:30-33 | Icon-button label |
| 15 / 400 / — / inherited / Helvetica | shared/OInput.tsx:25-33 | Field text |
| system default / — / `lightGray` placeholder | shared/OTextarea.tsx:11-14, 35 | Textarea text |
| 24 / 700 / — / `#344050` / Helvetica | shared/OModal.tsx:118-122, 198, 217-222 | Modal title |
| 24 / 700 / — / `textGray` / `Inter_18pt-Black_18pt-Black` (not a font) | shared/ONavbar.tsx:29-34, 53 | Screen title |
| 20 / bold / — / default black / system | shared/OBottomPopup.tsx:67-71 | Sheet title |
| 16 / — / — / `textcolor` (callers: `unselectText`) / system | shared/ODropDown.tsx:41-44; shared/ODropDownCalendar.tsx:48-51 | Select value / placeholder |
| paper default (14, `#000`, Paper's regular family) | shared/ODropDown.tsx:183, 218; shared/ODropDownCalendar.tsx:234, 268, 280, 300 | Option label, From/To labels |
| 12 / — / — / `backArrow` / `Poppins-Regular` | shared/ODropDownCalendar.tsx:77-86 | Date input text |
| 12 / — / — / `unselectText` | shared/ODropDownCalendar.tsx:141-148 | Calendar weekday header |
| 14 / — / — / `#fff` / system, centered | shared/OToast.tsx:88-92 | Toast message |
| 12 (14 iPad) / 700 / — / `textGray` (focused) or `disabled` / Helvetica | src/navigators/BottomNavigator.tsx:115-123 | Tab label |
| 16 / 400 / 16 / status literal / Helvetica | ~/WebsocketStatus/index.tsx:83-85 | Status chip label |
| 20 / 700 / — / `textGray` / system | ~/WebsocketStatus/styles.tsx:11-16 | Dialog title |
| 18 / 700 / — / `textGray` / system | ~/WebsocketStatus/styles.tsx:24-29 | Row title |
| 14 / 400 / — / `#344050` / Helvetica, margin-bottom 20 | ~/WebsocketStatus/index.tsx:106 | Metadata ("Last update") |
| 14 / 400 / — / `unselectText` / Helvetica, 1 line fit | ~/WebsocketStatus/index.tsx:34-39, 123, 135, 147 | Row description |
| 18 / normal / — / `white` / Helvetica, centered, 2 lines fit | ~/FloatingButton/index.tsx:47-57, 94-101, 127-134 | Main action label |
| 16 / 700 (one of them 400, :103) / — / `white` / Helvetica | ~/FloatingButton/index.tsx:90, 103, 123, 136 | Side value in the action button (never shown) |
| 18 (14 from src/pages/RequestPermissions.tsx:58, 68) / 400 / — / `textSecondary` / Helvetica, centered | ~/NotFoundSource/index.tsx:22-35 | Empty-state message |
| 20 / 700 / — / `darkText` / Helvetica | ~/NetworkError/index.tsx:22-29 | Error title |
| 14 / 400 / — / `darkText` / Helvetica | ~/NetworkError/index.tsx:30-35 | Error body |
| 16 / 600 / — / `textGray` / `'Poppins'` | ~/LogoutButton/index.tsx:39-46 | Text-button label |
| 16 / 400 / — / `unselectText` / Helvetica | ~/LanguageSelector/index.tsx:46-49, 72, 105 | Select value and option |
| 9 / 400 / — / `white` or `black` | shared/OChatBubble.tsx:83-93 | Timestamp (dead component) |
| `normalize(8.8)` / — / `white` or `#ADADAD` / `Poppins-Regular`, uppercase by JS | shared/OSegment.tsx:25-27, 66-74 | Segment label (dead component) |

Seven font outcomes for text in one area: Helvetica (theme primary), `Inter_18pt-Black` (theme special), the broken `Inter_18pt-Black_18pt-Black`, `'Poppins'`, `'Poppins-Regular'`, the system font (raw `Text`, `styled.Text` without a family) and react-native-paper's.

### Buttons and touchables

| Tappable | Primitive | file:line | Look and size | activeOpacity | Disabled look | Target < 44 pt |
|---|---|---|---|---|---|---|
| OButton | `TouchableOpacity` around a styled `View` | shared/OButton.tsx:110-138 | 50 high, radius 10 | prop; the 0.5 default is in ignored `defaultProps` → RN default 0.2 | gray box `disabled`, yellow text | no |
| OIconButton | `styled.TouchableOpacity` | shared/OIconButton.tsx:6, 61 | 40 high, radius 20 | RN default 0.2 | View `backgroundDark` | height 40 |
| OFab | `TouchableOpacity` | shared/OFab.tsx:20-23 | 30×30 black circle | 0.8 | none | yes (30×30) |
| OLink | `Pressable` | shared/OLink.tsx:69 | text line or OButton | none (no pressed feedback) | none | yes when a single text line (~17) |
| OAlert wrapper | `styled.TouchableOpacity` | shared/OAlert.tsx:6, 46 | wraps children | 0.2 | `disabled` prop, no look | caller's |
| ODropDown / ODropDownCalendar trigger | `styled.TouchableOpacity` | shared/ODropDown.tsx:30, 125; shared/ODropDownCalendar.tsx:37, 182 | padding 15 + 16 text (~50) | 0.2 | none | no |
| ODropDown option row | `TouchableOpacity` | shared/ODropDown.tsx:195-220; shared/ODropDownCalendar.tsx:245-270 | padding 15 + 24 icon (~54) | 0.2 | none | no |
| ODropDown clear / calendar icon | vector icon with `onPress` | shared/ODropDown.tsx:137-143; shared/ODropDownCalendar.tsx:197-203 | 20 glyph | none (Text press) | none | yes (20) |
| Date clear icons | `AntDesign` with `onPress` | shared/ODropDownCalendar.tsx:291-297, 311-317 | 20 glyph | none | none | yes (20) |
| OBottomPopup backdrop | `TouchableWithoutFeedback` | shared/OBottomPopup.tsx:30-35 | fills above the sheet | — | — | no |
| ONavbar back | `OIconButton` | shared/ONavbar.tsx:43-49 | 24×24 icon in a 64×40 box offset −20/−20 | 0.2 | none | height 40 |
| OModal back | `OIconButton` | shared/OModal.tsx:210-216 | style width 24, height 24 | 0.2 | none | yes (24×24) |
| Tab bar item | React Navigation tab button | src/navigators/BottomNavigator.tsx:139-198 | bar 70–90 high, 4 equal items | library | none | no |
| WebsocketStatus pill | `TouchableOpacity` | ~/WebsocketStatus/index.tsx:69-82 | 100 wide, ~36 high | 0.6 | none | yes (~36 high) |
| WebsocketStatus close | `TouchableOpacity` | ~/WebsocketStatus/index.tsx:110-112 | 28 glyph | 0.2 | none | yes (28) |
| WebsocketStatus Update | `OButton` | ~/WebsocketStatus/index.tsx:152-158 | 50 high, radius 8, full width | 0.2 | — | no |
| FloatingButton buttons | `styled.TouchableOpacity` | ~/FloatingButton/styles.tsx:22; ~/FloatingButton/index.tsx:72, 110 | 50 high, radius 10, full width | 0.2 | none (press blocked only) | no |
| NotFoundSource button | `OButton` | ~/NotFoundSource/index.tsx:40-47 | 50 high, radius 7.6 | 0.2 | — | no |
| NetworkError Refresh | `OButton` | ~/NetworkError/index.tsx:42-54 | 50 high, radius 8 | 0.2 | — | no |
| SearchBar cancel | `OButton` | ~/SearchBar/index.tsx:87-94 | max-height 20 | 0.2 | — | yes (20) |
| SearchBar clear | `TouchableOpacity` | ~/SearchBar/index.tsx:98-100 | 22 glyph | 0.2 | — | yes (22) |
| SearchBar search | `OIconButton` | ~/SearchBar/index.tsx:103-111 | 25×25 icon, max-width 40, 40 high | 0.2 | — | yes (40×40) |
| LogoutButton | `TouchableOpacity` | ~/LogoutButton/index.tsx:50 | text row ~20 high | 0.2 | none while loading | yes (~20 high) |
| LanguageSelector trigger / row | `TouchableOpacity` | ~/LanguageSelector/index.tsx:63, 90-95 | padding 8 + 24 (~40) | 0.2 / 1 | none | yes (~40) |
| OSegment item | `TouchableOpacity` | shared/OSegment.tsx:53-55 | dead | 0.2 | — | — |
| OChatBubble image | `styled.TouchableOpacity` | shared/OChatBubble.tsx:17, 64 | dead | 0.2 | — | — |

Heights marked "~" are derived from padding + font size, not measured.

### Icons

Area files only (app-wide table in App-wide 4).

| Glyph / PNG | Set (alias) | file:line | Size | Color | Function |
|---|---|---|---|---|---|
| `list-alt` | FontAwesome5 (`IconFA`) | src/navigators/BottomNavigator.tsx:4, 66, 73-75 | 20 | tab tint (`primary` / `disabled`) | Orders tab |
| `general.map`, `general.messages`, `general.profile` | PNG tinted via `OIcon` | src/navigators/BottomNavigator.tsx:81, 90, 99 | 20, 20, 23 | tab tint | Map, Messages, Profile tabs |
| `general.arrow_left` | PNG via `OIconButton` | shared/ONavbar.tsx:44; shared/OModal.tsx:211 | 24 | not tinted (the PNG's own color; `tintColor: textGray` sits in the wrapper's View style at shared/OModal.tsx:163, where it does nothing) | Back |
| `chevron-down` | Feather (`FeatherIcon`) | shared/ODropDown.tsx:145-151 | 24 | `textcolor` prop | Select caret |
| `close` | AntDesign | shared/ODropDown.tsx:137; shared/ODropDownCalendar.tsx:197, 291, 311 | 20 | `textNormal` (undefined) / `disabled` | Clear value |
| `calendar` | AntDesign | shared/ODropDownCalendar.tsx:198 | 20 | `textNormal` (undefined) | Date select |
| `chevron-left`, `chevron-right` | Feather | shared/ODropDownCalendar.tsx:324-337 | 24 | `disabled` | Calendar month navigation |
| `radiobox-marked`, `radiobox-blank` | MaterialCommunityIcons | shared/ODropDown.tsx:170-180, 205-215; shared/ODropDownCalendar.tsx:221-231, 255-265 | 24 | `primary` / `arrowColor` | Radio mark |
| caller's `iconName` | Ionicons (`Icon`) or MaterialCommunityIcons (`MaterialIcon`) | shared/OFab.tsx:9-10, 25-27 | 20 | `white` | Callers pass `globe-sharp`, `car-sport-sharp` (Ionicons, ~/DriverMap/index.tsx:445, 456) and `plus`, `minus` (MCI, ~/MapView/index.tsx:251, 261) |
| caller's `vertorIcon` | MaterialIcons (`MaterialIcon`) | shared/OInput.tsx:8, 91-98 | 20 | `vectorIconColor` or `textNormal` (undefined) | Field leading icon; no caller passes it (grep `vertorIcon`) |
| `close`, `circle` ×3 | MaterialCommunityIcons (`MaterialIcon`) | ~/WebsocketStatus/index.tsx:3, 111, 115, 127, 139 | 28, 12 | `gray200`; status literals | Close; status dot |
| `x-circle` | Feather (`Icon`) | ~/SearchBar/index.tsx:3, 99 | 22 | `unselectText` | Clear search |
| `general.search` | PNG via `OIconButton` | ~/SearchBar/index.tsx:104 | 25 | not tinted | Search |
| `general.menulogout` | PNG via `OIcon` | ~/LogoutButton/index.tsx:56 | 18 | `disabledContrast` | Log out |
| `general.chevronDown` | PNG via `OIcon` | ~/LanguageSelector/index.tsx:78 | 20 | not tinted | Select caret |
| `cc-visa`, `cc-mastercard`, `cc-amex`, `cc-discover`, `cc-jcb`, `cc-diners-club`, `credit-card-alt` | FontAwesome | ui/utils/index.tsx:86-126; src/utils/index.tsx:58-98 | caller's | `#000` | `getIconCard`: no caller in the app (grep) |
| (unused import) | Feather (`Icon`) | shared/OModal.tsx:4 | — | — | Imported, never rendered |

### Theme keys read

Area files only; app-wide totals are in App-wide 1.

| Key | Reads | Key | Reads |
|---|---|---|---|
| `colors.primary` | 26 | `colors.white` | 23 |
| `colors.clear` | 9 | `colors.backgroundPage` | 8 |
| `colors.textGray` | 8 | `colors.disabled` | 7 |
| `colors.lightGray` | 7 | `colors.unselectText` | 4 |
| `colors.textSecondary` | 3 | `colors.inputChat` | 3 |
| `colors.borderTops` | 3 | `colors.arrowColor` | 3 |
| `colors.tabBar` | 2 | `colors.black` | 2 |
| `colors.transparent` | 2 | `colors.backgroundDark` | 2 |
| `colors.inputDisabled` | 2 | `colors.darkText` | 2 |
| `colors.danger100` | 2 | `colors.warning100` | 2 |
| `colors.backgroundGray` | 2 (dead OChatBubble) | `colors.gray200` | 1 |
| `colors.secondary` | 1 | `colors.backgroundLight` | 1 |
| `colors.inputSignup` | 1 | `colors.disabledContrast` | 1 |
| `colors.backArrow` | 1 | `colors.danger500` | 1 |
| `colors.success500` | 1 | `colors.success100` | 1 |
| `colors.forgotText` | 1 | `colors.baseColor` | 1 |
| `colors.toastInfo` | 1 | `colors.toastSuccess` | 1 |
| `fonts.primary.name` | 2 (shared/OText.tsx:7, shared/OInput.tsx:30) | `fonts.special.name` | 2 (shared/OButton.tsx:38, shared/ONavbar.tsx:33) |
| `images.general.arrow_left` | 2 | `images.general.map` / `messages` / `profile` | 1 each |
| `images.general.notFound` / `noNetwork` / `search` / `menulogout` / `chevronDown` | 1 each | `images.logos.logo` | 1 |
| `images.dummies.businessLogo` / `customerPhoto` / `driverPhoto` | 1 each | | |

Read but undefined, in the area:

| Key | file:line | What it paints today |
|---|---|---|
| `colors.textNormal` | shared/OInput.tsx:95; shared/ODropDown.tsx:140; shared/ODropDownCalendar.tsx:200 | Icon `color={undefined}` → the icon set's default (black) |
| `colors.border` | shared/ODropDownCalendar.tsx:344 | `todayBackgroundColor={undefined}` → the calendar library's default |
| `colors.toastError` | shared/OToast.tsx:58 | Falls to the literal `#D83520` |

### Platform and window

| What | file:line | Branch / computation | Kind |
|---|---|---|---|
| Screen gutter | ui/layouts/Container.tsx:10-12 (copy: src/layouts/Container.tsx:10-12) | iOS portrait `0px 20px 20px`, else `20px` | Hand-made top inset (the SafeAreaView already pads on iOS) → use the inset |
| Orientation state | ui/layouts/Container.tsx:23-35; ui/layouts/SafeAreaContainer.tsx:56-68; ui/hooks/DeviceOrientation.tsx:12-31 | `Dimensions` width < height | The app is locked to portrait on both platforms (`AndroidManifest.xml:42`, `Info.plist:181-184`): the landscape branch cannot happen on phones |
| Status bar style | ui/layouts/SafeAreaContainer.tsx:94 | iOS `dark-content`, Android `default` | Theme value or runtime |
| Tab bar height / bottom padding | src/navigators/BottomNavigator.tsx:28-37 | iOS: window height < 845 → 80 / 20, else 90 / 30; Android: `70 + insets.bottom` | Hand-made safe-area inset on iOS |
| Tablet tab layout | src/navigators/BottomNavigator.tsx:29, 116, 136-137 | `Platform.isPad` → label 14, item `flex: 1`, icon width 100% | The only tablet switch found (iPad is a build target: `TARGETED_DEVICE_FAMILY = "1,2"` in `ios/ODelivery.xcodeproj/project.pbxproj:813`); a `platforms` entry or a fixed rule |
| Unused tab container | src/navigators/styles.tsx:8-9 | `isIos` → justify and bottom 10 / 13 | Dead styled component |
| Floating bar bottom padding | ~/FloatingButton/index.tsx:37-38, 62-63; ~/FloatingButton/styles.tsx:15-19; ui/hooks/useFloatingButtonInset.tsx:11-16 | iOS only: `max(paddingBottomIos ?? 5, insets.bottom outside the tabs)`; Android gets no bottom inset | Safe area; Android with gesture navigation gets 0 (lesson 17) |
| Toast position | shared/OToast.tsx:67 | `(insets.bottom or 20) + 20` | Safe area |
| Modal header top | shared/OModal.tsx:57, 72 | `marginTop: insets.top` | Safe area |
| Socket modal card | ~/WebsocketStatus/index.tsx:19, 96-101 | module-level `Dimensions.get('window').width − 40`; margins = insets | Window size read once at import |
| Sheet max height | shared/OBottomPopup.tsx:3, 65 | module-level `Dimensions.get('window').height` | Window size read once at import |
| Calendar width | shared/ODropDownCalendar.tsx:112, 339 | `useWindowDimensions().width − 80` | Layout |
| Offline image | ~/NetworkError/index.tsx:18, 39-40 | `Dimensions.get('screen').width` | Layout |
| `normalize()` | ui/providers/Responsive.tsx:3-15 | font size × (window width / 320), minus 2 on Android | Font scaled by screen; only the dead OSegment uses it |
| Keyboard events | src/hooks/useKeyboardVisible.ts:8-11 | iOS `keyboardWill*`, Android `keyboardDid*` | Behaviour |
| Permissions list | src/context/PermissionsContext.tsx:35-61 | iOS vs Android 10 / 11+ | Behaviour |
| Splash image source | src/DeliveryApp.tsx:44-46 | iOS `{ uri: 'SplashImage' }` (asset catalog), Android `require('../android/app/src/main/res/mipmap-xxxhdpi/splash.png')` | Build-system file names (App-wide 7) |
| Native splash hide | src/DeliveryApp.tsx:150-152 | iOS only | Behaviour |
| Foreground push display | src/navigators/RootNavigator.tsx:272-286 | Android only, notifee | Behaviour |
| Banner style alert | src/navigators/RootNavigator.tsx:321-338 | iOS only | System alert |

No `Platform.select`, no `.ios.tsx` / `.android.tsx` files in the area. No keyboard avoiding in the area's files (pages do it).

### Styles that cannot see the theme

| File | Module-level `StyleSheet.create` | `StyleSheet.create` inside the component (rebuilt every render) | Inline `style={{` | `defaultProps` on a function component |
|---|---|---|---|---|
| shared/OBottomPopup.tsx | :49 | — | 2 | — |
| shared/OFab.tsx | :34 | — | 1 | — |
| shared/OToast.tsx | :77 | — | 1 (+2 arrays) | — |
| shared/OModal.tsx | — | :59 | 1 | — |
| shared/ONavbar.tsx | — | :15 | 0 | — |
| shared/OrderListItemSkeleton.tsx | — | :19 | 0 | — |
| shared/OrderListSkeleton.tsx | — | :18 | 0 | — |
| shared/ChatMessageSkeleton.tsx | — | :80 | 2 (+1 array) | — |
| shared/OButton.tsx | — | — | 1 | :142 (`isLoading`, `isDisabled`, `indicatorColor: 'white'`, `activeOpacity: 0.5`) |
| shared/OIcon.tsx | — | — | 2 | :62 (`width`/`height` 26; harmless, the body repeats them) |
| shared/OIconButton.tsx | — | — | 6 | :127 (empty) |
| shared/OInput.tsx | — | — | 4 | :145 (`iconColor: '#959595'`, `bgColor: 'white'`, `borderColor: 'white'`) |
| shared/OLink.tsx | — | — | 1 | :92 (`onTextLayout`) |
| shared/OText.tsx | — | — | 0 (+1 array) | :60 (`onTextLayout`) |
| shared/OSegment.tsx | — | — | 3 | :82 (`labelStyle: 'uppercase'`) |
| shared/ODropDown.tsx | — | — | 6 | — |
| shared/ODropDownCalendar.tsx | — | — | 16 | — |
| shared/OChatBubble.tsx | — | — | 1 | — |
| shared/SkeletonBone.tsx | — | — | 1 (+1 array) | — |
| ~/WebsocketStatus/index.tsx | — | :33 | 16 | — |
| ~/FloatingButton/index.tsx | — | :40 | 2 (+2 arrays) | — |
| ~/NotFoundSource/index.tsx | — | — | 4 | — |
| ~/NetworkError/index.tsx | — | — | 2 | — |
| ~/SearchBar/index.tsx | — | :47 | 2 | — |
| ~/LogoutButton/index.tsx | — | :32 | 0 | — |
| ~/LanguageSelector/index.tsx | — | :45 | 2 | — |
| ui/layouts/SafeAreaContainer.tsx | — | — | 1 (+1 array) | — |
| src/navigators/BottomNavigator.tsx | — | :39 | 0 | — |
| src/navigators/RootNavigator.tsx | — | — | 1 | — |

Effects of the ignored `defaultProps` (React 19.1.0, `package.json:47`), to check on a device:

- `OButton`: `activeOpacity` is undefined (RN default 0.2, not 0.5); the loading spinner has no color unless the caller passes `indicatorColor`.
- `OInput`: `bgColor` and `borderColor` are undefined, and the inline style at shared/OInput.tsx:77-81 passes those undefined values over the styled background. Whether the field shows the css `backgroundLight` and which border color a 1.5 pt border without color gets depends on how React Native merges an undefined style value: 17 of 18 call sites pass their own `style`, 2 pass `borderColor`.

Also in the area: components declared inside a component and remounted on every render — `IconComponent` and `BottomTabIconComponent` (src/navigators/BottomNavigator.tsx:64-68, 108-125).

App-wide numbers (for the starting metrics): 618 inline `style={{` in 81 files; 64 `StyleSheet.create`, 9 at module level (src/pages/OrderMessage.tsx:42, ~/NotificationSetting/index.tsx:63, ~/NewOrderNotification/index.tsx:248, ~/OrderDetails/ValidationIssuesList.tsx:55, shared/OFab.tsx:34, shared/OToast.tsx:77, shared/OBottomPopup.tsx:49, ~/MapView/RenderMarker.tsx:12, ~/MapView/index.tsx:20); 9 `defaultProps` (the 7 above + ~/PreviousOrders/index.tsx:575, ~/OrdersOption/index.tsx:1291); 89 `Platform.OS` / `isPad` reads; 38 `Dimensions.get` / `useWindowDimensions`.

### Third-party UI

| Library | file:line | What it draws | Props that carry styles |
|---|---|---|---|
| `react-native-paper` `Text` | shared/ODropDown.tsx:8, 183, 218; shared/ODropDownCalendar.tsx:8, 234, 268, 280, 300 | Option labels and From/To labels with Paper's default theme (no Paper `Provider` is mounted) | `style`; nothing else of Paper is used in the app (2 files) |
| `react-native-calendar-picker` | shared/ODropDownCalendar.tsx:9, 322-348 | Month grid, weekday header, month/year title, range selection | `width`, `selectedDayColor`, `selectedDayTextColor`, `todayBackgroundColor`, `dayLabelsWrapper`, `customDayHeaderStyles`, `previousComponent`, `nextComponent`; month title, day text and range colors are the library's defaults |
| `react-native-country-picker-modal` (`CountryPicker`, `Flag`) | ~/LanguageSelector/index.tsx:3, 55-110 | A full-screen modal with its own header, close button and list; emoji flags | `renderFlagButton`, `flatListProps.renderItem` (rows are the app's); the modal chrome is the library's (no `theme` prop passed) |
| `react-native-gesture-handler` `ScrollView` | shared/ODropDown.tsx:4, 159; shared/ODropDownCalendar.tsx:4, 210 | Scroll of the non-modal branch | none; branch never used (every call site passes `isModal`) |
| `Alert.alert` (system) | shared/OAlert.tsx:22; shared/OAlertOriginal.tsx:39; shared/OLink.tsx:24, 35; src/navigators/RootNavigator.tsx:327, 714; ui/providers/AlertProvider.tsx:25 and src/providers/AlertProvider.tsx:25 (both dead) | System dialogs: confirmations, SDK errors (`OrderingProvider` gets `OAlertOriginal` as `Alert`, DeliveryApp.tsx:157), link errors, banner style, developer mode | not themable |
| RN `Modal` | shared/OModal.tsx:177; shared/OBottomPopup.tsx:23 | Native modal window | `animationType`, `transparent` |
| `@react-navigation/bottom-tabs` | src/navigators/BottomNavigator.tsx:5, 128-138 | Tab bar frame and press handling | `tabBarStyle`, `tabBarActiveTintColor`, `tabBarInactiveTintColor`, `tabBarItemStyle`, `tabBarIconStyle` |
| `@react-navigation/stack` | src/navigators/RootNavigator.tsx:55; src/navigators/HomeNavigator.tsx:18 | Screen transitions and the card background (default theme of `NavigationContainer`: no `theme` prop at src/appContainer.tsx:8) | every screen `headerShown: false`; the navigation theme's `background` shows during transitions |
| `@notifee/react-native` | src/navigators/RootNavigator.tsx:276-286 | Android foreground notification (`smallIcon: 'ic_launcher'`, channel `new_order_alarm`) | system UI |
| `react-native-background-geolocation` | src/navigators/RootNavigator.tsx:595-618 | Foreground-service notification text, location authorization alert, background permission rationale | system UI; texts from `t()` |
| `react-native-onesignal` 4.5.2 | src/navigators/RootNavigator.tsx:179-208 | Push permission prompt | system UI |
| `react-native-permissions` | src/navigators/RootNavigator.tsx:353-362 | Android rationale dialog (`title`, `message`, `buttonPositive`) | system UI; texts from native strings through `rn-config-reader` |
| `react-native-splash-screen` | src/DeliveryApp.tsx:3, 151 | Native splash | native resources (App-wide 7) |
| `react-native-restart` | ~/WebsocketStatus/index.tsx:153; ~/NetworkError/index.tsx:53 | No UI (reloads the app) | — |

### Motion

| What | file:line | Values |
|---|---|---|
| Toast fade in / out | shared/OToast.tsx:8, 17-33 | `Animated.timing` opacity 0 → 1 and 1 → 0, 300 ms each, native driver; stays `toastConfig.duration` |
| Skeleton pulse | shared/SkeletonBone.tsx:26-40 | loop of opacity 0.7 → 1 (700 ms, `delay` prop) → 0.7 (700 ms) |
| Chat bubble skeleton pulse | shared/ChatMessageSkeleton.tsx:24-39 | loop 0.75 → 1 → 0.75, 700 ms each, delays 90–330 |
| Skeleton stagger | shared/OrderListItemSkeleton.tsx:17, 64-94; shared/ChatMessageSkeleton.tsx:125-152 | `index × 60` ms + 30/45/60/75/90; header 0–60, toolbar 390–450 |
| Modal | shared/OModal.tsx:178 | `animationType="slide"` (platform duration) |
| Bottom sheet | shared/OBottomPopup.tsx:24 | `animationType="fade"` (the sheet fades in, it does not slide) |
| Status bar | ui/layouts/Container.tsx:43-44 | `showHideTransition="fade"`, `animated` |
| Connectivity color | ui/layouts/SafeAreaContainer.tsx:77-79 | `setTimeout` 2000 ms before clearing the green |
| Search debounce | ~/SearchBar/index.tsx:39-43 | 1000 ms when `lazyLoad` |
| Press feedback | see Buttons and touchables | `activeOpacity` 0.2 (default), 0.6, 0.8, 1 |

No `LayoutAnimation` in the area.

### Dead code

Checked by following imports from `index.js` (254 files reachable, 91 files under `src` not reachable, 67 of them fonts linked natively) and by searching each name's JSX tag and identifier across `src` (without `src/@/` and tests).

| Item | file | How it was checked |
|---|---|---|
| `OSegment` | shared/OSegment.tsx | Not exported from shared/index.tsx; 0 JSX sites; unreachable |
| `OChatBubble` | shared/OChatBubble.tsx | Same |
| `Responsive.normalize` (both copies) | ui/providers/Responsive.tsx; src/providers/Responsive.tsx | Only importer is `OSegment` |
| `AlertProvider` (both copies) | ui/providers/AlertProvider.tsx; src/providers/AlertProvider.tsx | 0 importers |
| Theme context copy | src/context/Theme/index.tsx | 0 importers (`@ui` uses ui/context/Theme) |
| Layout copies | src/layouts/Container.tsx; src/layouts/SafeAreaContainer.tsx | 0 importers |
| Constants copy | src/config/constants.tsx | 0 importers |
| `useTheme` tuple hook and `setTheme` | ui/context/Theme/index.tsx:22-25, 11 | Exported from `@ui` (src/ui/index.tsx:171) but imported by no file: all 97 theme consumers import `useTheme` from `styled-components/native` |
| `BottomTabIconContainer` | src/navigators/styles.tsx:3-10 | Imported at src/navigators/BottomNavigator.tsx:18, never rendered |
| `RequestPermissions` import | src/navigators/RootNavigator.tsx:44 | Imported, not used in this file |
| `OModal` unused styles | shared/OModal.tsx:110-117 (`cancelBtn`), 123-129 (`wrapperIcon`), 130-144 (`modalView`), 145-160 (`button`, `buttonOpen`, `buttonClose`, `textStyle`) | No `styles.X` reference in the file |
| `OModal` unused props and imports | shared/OModal.tsx:16-17, 20-21, 23, 27-28 (`onAccept`, `onCancel`, `acceptText`, `cancelText`, `hideCloseDefault`, `isNotDecoration`, `styleCloseButton`); :2 `TouchableOpacity`, :4 Feather `Icon` | Destructured or imported, never read |
| ODropDown / ODropDownCalendar non-modal branch | shared/ODropDown.tsx:158-186; shared/ODropDownCalendar.tsx:209-237 | All 7 call sites pass `isModal` |
| `secondary` variant of both dropdowns | shared/ODropDown.tsx:38-43; shared/ODropDownCalendar.tsx:45-50 | No call site passes `secondary`; all pass `bgcolor` + `textcolor`, so the `primary` default is never painted either |
| `OInput` `vertorIcon` branch | shared/OInput.tsx:91-98 | No caller passes it |
| `OButton` `isCircle`, `disabledStyle` | shared/OButton.tsx:69, 78, 115 | No caller passes them (props counted over 73 sites) |
| `OIconButton` `isOutline`, `textColor`, `height`, `title` | shared/OIconButton.tsx:37-45 | Over 18 sites the only look props passed are `borderColor`, `iconStyle`, `style`, `disabledColor`, `iconColor`; no site passes `title` (grep `title=` in the 8 lines after each `<OIconButton`) |
| `SImage` tint | shared/OIcon.tsx:9 | Always overridden inline (:47) |
| `SearchBar` unused style and props | ~/SearchBar/index.tsx:55-59 (`borderStyle`), :18-19 (`noBorderShow`, `borderStyle`) | Not referenced |
| `SearchBar` as a whole | ~/SearchBar/index.tsx | Its 3 render sites are in `BusinessProductList` (2) and `StoresList` (1), which no file renders or references outside their own folders and the `@ui` barrel |
| `NetworkError` as a whole | ~/NetworkError/index.tsx | Only used by `src/pages/NetworkError.tsx`, a page no navigator registers (unreachable) |
| FloatingButton props never passed | ~/FloatingButton/index.tsx:13-16, 18, 26 (`btnLeftValue`, `btnRightValue`, `btnLeftValueShow`, `btnRightValueShow`, `colorTxt1`; `isSecondaryBtn` is passed but never read) | The 8 live call sites were read; the 2 in unrendered files (src/pages/NotFound.tsx:43, ~/OrderSummary/index.tsx:847) were not |
| `NotFoundSource` text-only branch and `errorImage` prop | ~/NotFoundSource/index.tsx:21-28; ui/types/index.tsx:264 | See Blocks and pieces |
| `getIconCard`, `getGoogleMapImage`, `lightenDarkenColor`, `shape`, `priceList` | ui/utils/index.tsx:86, 131, 963, 605, 648 | No reference outside the two utils files (identifier search for each of the five names) |
| `src/utils/index.tsx` except `setSecureOrderProject`, `flatArray` | src/utils/index.tsx:12-160 | Importers: RootNavigator.tsx:21, src/providers/StoreUtil.tsx:2 |
| Unreachable pages (other areas, for the coordinator) | src/pages/NetworkError.tsx, src/pages/NotFound.tsx, src/pages/Signup.tsx | Not imported by any navigator |
| Unreferenced `@ui` components (other areas, for the coordinator) | ~/Contacts/ (MessagesOption uses the controller from `@components`), ~/OrderDetails/usePrinterCommands.tsx, ~/StoresList/styles.tsx; exported from the barrel with no reference outside their folder: `OrdersListManager`, `StoresList`, `BusinessProductList`, `OrderSummary`, `OrdersOptionStatus` (and `BusinessController`, only used by `StoresList`) | Identifier search across `src` |
| Theme keys never read, bundled files never painted | see App-wide 1 and 5 | |

---

## App-wide inventories

### 1. The theme today

**Providers and consumption**

| Fact | Where |
|---|---|
| One theme object: `src/theme.json` imported and mutated at import time (`theme.images = …`, `theme.sounds = …`) | src/DeliveryApp.tsx:6, 34-108 |
| One provider mounted: `ThemeProvider` from `@ui`, which nests the app's own `ThemeContext` (value: the tuple `[theme, setTheme]`) and styled-components' `ThemeProvider` | ui/context/Theme/index.tsx:10-20; mounted at src/DeliveryApp.tsx:156 |
| The provider imports from `'styled-components'` (web entry). `styled-components` 6.5.3 declares `"react-native": "native/dist/styled-components.native.cjs.js"` (`node_modules/styled-components/package.json:11`), so Metro resolves it to the same file as `'styled-components/native'`; under another resolver (a test runner without that field) the two would be different contexts | ui/context/Theme/index.tsx:2 |
| Consumers: 97 files import `useTheme` from `'styled-components/native'` and call `const theme = useTheme()` (the theme object itself: 101 calls, none destructures a tuple); 35 files read `props.theme` / `({ theme })` inside styled templates | counted |
| The tuple hook `useTheme` of the app's context (`[theme, setTheme]`) is exported from `@ui` and has 0 consumers; `setTheme` is never called: the theme never changes after start | src/ui/index.tsx:74, 171 |
| `NavigationContainer` gets no `theme` (React Navigation's default light theme is under every screen) | src/appContainer.tsx:8 |
| No served theme is read by app code: `useOrderingTheme` / `OrderingThemeContext` have 0 references in `src` outside the submodule | grep |

**The submodule fetches a theme anyway (report only)**

- `OrderingProvider` of the native barrel mounts `OrderingThemeProvider` (`src/@/components/native/src/contexts/OrderingContext/index.js:15, 50`), exported at `src/@/components/native/index.js:115`.
- On start (once `ordering.project` is set, and because `settings.useOptimizeLoad` is not in `src/config.json`), it runs `fetch(\`${ordering.root}/theme\`, { method: 'GET', headers: { 'X-App-X': settings.appId } })` (`src/@/components/src/contexts/OrderingThemeContext/index.js:88-101, 132-141`). `ordering.root` = `${url}/${version}/${language}/${project}` (`src/@/components/src/sdk/src/classes/Ordering.ts:72-74`) → with today's config `https://api.orderingplus.com/v400/<language>/orderingplus/theme`, header `X-App-X: react-native-app`. No query parameters, no version parameter, no product type.
- The response's `result.values` is stored after blanking every key whose name contains `color` and whose value is not a valid color (`:71-86, 103`).
- One controller the app mounts reads it: `BusinessList` (`src/@/components/src/components/BusinessList/index.js:62, 74`, key `theme.business_listing_view.components.cities.hidden`), used by `~/OrdersOptionBusiness/index.tsx:6`. Nothing else of the response reaches the screen.

**Colors: 72 keys in `src/theme.json:24-97`** (reads / files, across all of `src` except `src/@/` and tests)

| Key | Value | Reads | Files | Key | Value | Reads | Files |
|---|---|---|---|---|---|---|---|
| primary | #FFB700 | 215 | 59 | textGray | #344050 | 125 | 42 |
| white | #fff | 101 | 46 | unselectText | #909BA9 | 48 | 29 |
| clear | transparent | 48 | 18 | tabBar | #e9ecef | 29 | 17 |
| disabled | #CBCBCB | 26 | 12 | red | #E63757 | 25 | 16 |
| lightGray | #D2D2D2 | 23 | 9 | gray200 | #ADB5BD | 23 | 8 |
| arrowColor | #B1BCCC | 21 | 11 | inputChat | #F8F9FA | 21 | 12 |
| gray100 | #F8F9FA | 21 | 14 | backgroundPage | #FFFFFF | 20 | 14 |
| danger500 | #E63757 | 18 | 8 | green | #00D27A | 17 | 9 |
| borderTops | #d9d9d9 | 15 | 8 | statusOrderRed | #E63757 | 14 | 2 |
| inputDisabled | #F7F7F7 | 13 | 12 | black | #000000 | 13 | 9 |
| transparent | rgba(0, 0, 0, 0) | 12 | 7 | error | #C90800 | 12 | 8 |
| danger100 | #FEEDF0 | 11 | 3 | secondary | #FFF4DA | 10 | 10 |
| inputSignup | #DEE2E6 | 9 | 5 | success100 | #E3FEF3 | 9 | 2 |
| backgroundDark | #484848 | 8 | 3 | success500 | #00D27A | 8 | 5 |
| offColor | #8c8b8d | 7 | 5 | backArrow | #748194 | 7 | 4 |
| statusOrderGreen | #0CAD63 | 6 | 2 | inputTextColor | #FFFFFF | 5 | 4 |
| shadow | rgba(0, 0, 0, 0.8) | 5 | 3 | backgroundLight | #F5F9FF | 4 | 4 |
| primaryLight | #F5F9FF | 4 | 1 | btnBGWhite | #E9F2FE | 4 | 3 |
| textSecondary | #858585 | 4 | 3 | statusOrderBlue | #04449c | 3 | 2 |
| darkText | #414954 | 3 | 2 | brightness | rgba(0,0,0,0.2) | 3 | 1 |
| warning100 | #FFF9E2 | 3 | 2 | yellowSecondary | #FFF4DA | 3 | 2 |
| skyBlue | #CFE6FF | 2 | 1 | backgroundGray | #CCCCCC | 2 | 1 (dead OChatBubble) |
| success | #90C68E | 2 | 1 | yellow | #FFB700 | 2 | 1 |
| forgotText | #E9F2FE | 1 | 1 | orderTypeColor | #03459E | 1 | 1 (dead Contacts UI) |
| toastInfo | #6ba4ff | 1 | 1 | toastSuccess | #73bd24 | 1 | 1 |
| primaryContrast | #FFF | 1 | 1 | notAvailable | #EEEEEE | 1 | 1 |
| disabledContrast | #000 | 1 | 1 | dusk | rgb(65,77,107) | 1 | 1 |
| mediumGray | rgb(134,154,183) | 1 | 1 | composerPlaceHolder | #93a2b8 | 1 | 1 |
| composerView | #f0f2f4 | 1 | 1 | actionsIcon | #222845 | 1 | 1 |
| baseColor | #B1BCCC | 1 | 1 | | | | |

Defined but never read (13): `primaryOG` #2C7BE5, `secondaryLightColor` #B1BCCC, `quantityProduct` #1E5CAF, `addres` #51637b, `grey`, `secundary` #EFEFEF, `secundaryContrast` #000, `colorPage` #333, `whiteGray` #f7f6f3, `paleGray` #FAFAFA, `btnFont` black, `editColor` #F2BB40, `cancelColor` #D81212.

Same value under several keys: #FFB700 `primary` = `yellow`; #FFF4DA `secondary` = `yellowSecondary`; #F5F9FF `backgroundLight` = `primaryLight`; #B1BCCC `arrowColor` = `secondaryLightColor` = `baseColor`; #F8F9FA `inputChat` = `gray100`; #E9F2FE `forgotText` = `btnBGWhite`; #E63757 `statusOrderRed` = `red` = `danger500`; #00D27A `green` = `success500`; white `backgroundPage` = `inputTextColor` = `primaryContrast` = `white`; transparent `transparent` = `clear`; black `black` = `secundaryContrast` = `disabledContrast`.

Read but undefined (5 keys, 16 reads):

| Key | Reads | file:line |
|---|---|---|
| `colors.textNormal` | 11 | ~/BusinessProductList/AccordionDropdown.tsx:29; ~/Chat/index.tsx:1030; ~/NewOrderNotification/index.tsx:139; ~/OrderDetails/OrderContentComponent.tsx:661; ~/OrderSummary/index.tsx:797; ~/PreviousOrders/OrdersGroupedItem.tsx:97; ~/ProductItemAccordion/index.tsx:170; ~/UserProfileForm/index.tsx:540; shared/ODropDown.tsx:140; shared/ODropDownCalendar.tsx:200; shared/OInput.tsx:95 |
| `colors.blueLight` | 2 | ~/PreviousOrders/OrderList.tsx:54, 55 |
| `colors.textGra` | 1 | ~/OrdersListManager/index.tsx:422 |
| `colors.border` | 1 | shared/ODropDownCalendar.tsx:344 |
| `colors.toastError` | 1 | shared/OToast.tsx:58 |

**Fonts: `src/theme.json:2-23`**

| Key | Value | Reads | Readers |
|---|---|---|---|
| `fonts.primary.name` | `Helvetica` | 15 in 8 files | shared/OText.tsx:7, shared/OInput.tsx:30, ~/LoginForm/index.tsx:418, 430, 443, ~/OrdersOption/OrderSummaryTable.tsx:79, ~/Payouts/styles.tsx:31, 49 and 7 more |
| `fonts.special.name` | `Inter_18pt-Black` | 6 in 5 files | shared/OButton.tsx:38, shared/ONavbar.tsx:33, ~/Home/index.tsx:46, 51, ~/Sessions/index.tsx:91, ~/UserProfileForm/index.tsx:279 |
| `fonts.primary.weights`, `fonts.special.weights` | `[300, 400, 500, 600, 700]` | 0 | never read |

**Images: the manifest in `src/theme.json:98-164` is 55 empty strings, overwritten at start by `src/DeliveryApp.tsx:34-104`** (reads / files)

| Key | Reads | Key | Reads | Key | Reads |
|---|---|---|---|---|---|
| logos.background | 0 | logos.logotype | 0 | logos.logotypeInvert | 1 |
| logos.passwordInputIcon | 1 | logos.emailInputIcon | 1 | logos.logo | 1 (OIcon fallback) |
| tutorials.slide1…slide5 | 1 each | backgroundsImages.login | 1 | dummies.businessLogo | 11 / 9 |
| dummies.driverPhoto | 5 / 3 | dummies.customerPhoto | 6 / 4 | general.loadingSplash | 2 / 1 |
| general.notFound | 9 / 9 | general.dropDown | 0 | general.chevronDown | 2 / 2 |
| general.inputPhone | 1 | general.imageChat | 1 | general.attach | 1 |
| general.arrow_left | 9 / 9 | general.arrow_distance | 1 | general.arrow_down | 0 |
| general.map | 3 / 3 | general.arrowReturnLeft | 0 | general.close | 3 / 3 |
| general.pdfFile | 1 | general.docFile | 1 | general.driverImage | 1 |
| general.imageFile | 2 / 1 | general.cellphone | 2 / 1 | general.reload | 0 |
| general.search | 1 (dead SearchBar) | general.camera | 1 | general.profilephoto | 0 |
| general.orders | 0 | general.messages | 3 / 3 | general.stores | 0 |
| general.profile | 2 / 2 | general.menulogout | 1 | general.project | 0 |
| general.newOrder | 1 | general.orderCreating | 0 | general.orderSuccess | 0 |
| general.chronometer | 2 / 2 | general.noNetwork | 1 (dead NetworkError) | general.clock1 / clockRisk / clockDelayed | 2 / 2 each |
| general.deliveryWaiting | 1 | general.ordersGroup | 1 | general.send | 1 |
| general.pen | 1 | | | | |

Defined (and `require`d, so bundled) but never read (12): `logos.background`, `logos.logotype`, `general.dropDown`, `general.arrow_down`, `general.arrowReturnLeft`, `general.reload`, `general.profilephoto`, `general.orders`, `general.stores`, `general.project`, `general.orderCreating`, `general.orderSuccess`. `backgroundsImages.login` and `logos.background` point to the same file.

Read but undefined (3 keys, 7 reads):

| Key | file:line |
|---|---|
| `images.general.user` | ~/ReviewCustomer/index.tsx:217; ~/UserFormDetails/index.tsx:283; ~/UserProfileForm/index.tsx:392, 461 |
| `images.general.email` | ~/UserFormDetails/index.tsx:282; ~/UserProfileForm/index.tsx:460 |
| `images.general.information` | ~/StoresList/index.tsx:153 |

**Sounds:** `theme.sounds.notification` (`src/assets/sounds/notification.mp3`, src/DeliveryApp.tsx:106-108) has 0 readers. The new-order sound plays from a fixed URL, `https://d33aymufw4jvwf.cloudfront.net/notification.mp3` (~/NewOrderNotification/index.tsx:45, 71), and natively from `android/app/src/main/res/raw/order_sound_notification.mp3` / `ios/ODelivery/order_sound_notification.caf`.

### 2. Primitives' API

Call sites across all of `src` (except `src/@/` and tests). "Overrides" = sites that pass at least one look prop.

| Primitive | Look props | Built-in default look | Sites / files | Sites overriding the look (prop: count) |
|---|---|---|---|---|
| OText | `size`, `weight`, `color`, `style`, `lineHeight`, `fontFamily`, `mBottom`, `mLeft`, `mRight`, `hasBottom`, `isWrap`, `textDecorationLine` | 14 / 400 / `#344050` / Helvetica | 367 / 55 | 338 (`style` 224, `size` 190, `color` 126, `weight` 112, `mBottom` 40, `mLeft` 7, `mRight` 7, `textDecorationLine` 2); 0 sites pass `fontFamily` or `lineHeight` as props |
| OButton | `style`, `textStyle`, `parentStyle`, `disabledStyle`, `bgColor`, `borderColor`, `imgLeftStyle`, `imgRightStyle`, `indicatorColor`, `loadingStyle`, `activeOpacity`, `isCircle` | 50 high, radius 10, bg + 2 pt border `primary`, label 16 / 700 `white` Inter | 73 / 34 | 73 (`textStyle` 69, `style` 65, `borderColor` 61, `bgColor` 59, `parentStyle` 25, `imgLeftStyle` 5, `indicatorColor` 4, `imgRightStyle` 1). No site uses the default look |
| OIcon | `color`, `width`, `height`, `style`, `borderRadius`, `cover`, `borderBottomWidth` | 26×26, contain, no tint | 47 / 26 | 46 (`style` 33, `width`/`height` 23, `color` 11, `cover` 2, `borderBottomWidth` 2) |
| OIconButton | `style`, `iconStyle`, `textStyle`, `color`, `bgColor`, `borderColor`, `textColor`, `iconColor`, `height`, `isOutline`, `disabledColor` | 40 high pill, radius 20, 1 pt border, icon 22 | 18 / 13 | 18 (`iconStyle` 18, `style` 17, `borderColor` 15, `disabledColor` 1, `iconColor` 1): always used as a bare icon button |
| OInput | `style`, `bgColor`, `borderColor`, `placeholderTextColor`, `iconColor`, `iconRightColor`, `iconStyle`, `iconRightStyle`, `vectorIconColor`, `selectionColor`, `color` | 50 high, radius 10, border 1.5, text 15 Helvetica | 18 / 11 | 18 (`style` 17, `selectionColor` 13, `color` 13, `placeholderTextColor` 12, `borderColor` 2) |
| OTextarea | none | radius 10, 1 pt `lightGray`, 100 high | 1 / 1 | 0 |
| OModal | `style`, `titleSectionStyle`, `isTransparent`, `entireModal`, `customClose`, `hideIcons` (+ unused `styleCloseButton`, `isNotDecoration`, `hideCloseDefault`) | slide modal; centered scrim unless `entireModal` | 14 / 10 | 12 (`entireModal` 10, `customClose` 9, `hideIcons` 3, `isTransparent` 2) |
| OBottomPopup | `containerStyle`, `titleStyle` | white sheet, top radius 20, title 20 bold | 2 / 2 | 2 (both props at both sites) |
| ODropDown | `style`, `bgcolor`, `textcolor`, `secondary`, `dropViewMaxHeight` | `primary` box with white text (never painted) | 6 / 6 | 6 (`bgcolor`, `textcolor`, `dropViewMaxHeight` at all) |
| ODropDownCalendar | same | same | 1 / 1 | 1 |
| OFab | `style` (position only) | 30×30 black circle | 4 / 2 | 4 (`style`) |
| OLink | `color`, `PressStyle`, `TextStyle` | OText default | 9 / 1 | 9 (`PressStyle`, `TextStyle`) |
| ONavbar | none | back + 24 / 700 centered title | 8 / 8 | 0 |
| OToast | `messageStyle` | see Elements | 1 / 1 | 0 |
| OAlert | none (wrapper) | — | 2 / 2 | 0 |
| OAlertOriginal | none | system alert | 8 `<Alert>` JSX sites in 8 `@ui` files + `OrderingProvider`'s `Alert` | 0 |
| SkeletonBone | `width`, `height`, `borderRadius`, `style` | 12 high, radius 6 | 15 / 2 (both in `shared/`) | 15 (sizes are layout) |
| OrderListSkeleton | none (`count`, `showTimer`) | 5 rows | 5 / 5 | 0 |
| OrderListItemSkeleton | none | see Elements | 1 / 1 | 0 |
| ChatMessageSkeleton | none | see Elements | 1 / 1 | 0 |
| OSegment, OChatBubble | — | — | 0 | dead |

Raw elements used instead of a primitive (app-wide):

| Raw element | JSX sites / files | Where |
|---|---|---|
| `<Text>` from `react-native` | 9 / 4 | src/pages/IntroductoryTutorial.tsx:126, 127, 139, 157, 170, 181; ~/OrderDetails/ValidationIssuesList.tsx:35; shared/OBottomPopup.tsx:38; shared/OToast.tsx:69 |
| `<Text>` from `react-native-paper` | 6 / 2 | shared/ODropDown.tsx:183, 218; shared/ODropDownCalendar.tsx:234, 268, 280, 300 |
| `styled.Text` | 17 definitions / 11 files | ~/Payouts/styles.tsx (5), ~/StripeConnectAccount/styles.tsx (2), ~/WebsocketStatus/styles.tsx (2), ~/OrdersListManager/styles.tsx, ~/OrdersOption/styles.tsx, shared/OButton.tsx, shared/ODropDown.tsx, shared/ODropDownCalendar.tsx, shared/OIconButton.tsx, shared/OSegment.tsx, shared/OText.tsx (the primitive itself) |
| `<TextInput>` | 4 / 3 | ~/AcceptOrRejectOrder/index.tsx:85, 86; ~/PreviousOrders/OrderItem.tsx:432; ~/VerifyPhone/index.tsx:149 |
| `styled.TextInput` | 4 / 4 | ~/AcceptOrRejectOrder/styles.tsx; shared/ODropDownCalendar.tsx; shared/OInput.tsx and shared/OTextarea.tsx (the primitives) |
| `<TouchableOpacity>` | 50 / 31 (+2 under the alias `CustomTouchableOpacity`) | most: ~/Chat/index.tsx, ~/OrderDetails/OrderContentComponent.tsx, ~/PreviousOrders/OrderItem.tsx, ~/UserProfileForm/index.tsx |
| `<Pressable>` | 18 / 10 | other areas + shared/OLink.tsx:69 |
| `<TouchableWithoutFeedback>` | 1 / 1 | shared/OBottomPopup.tsx:30 |
| `styled.TouchableOpacity` | 13 definitions / 13 files | ~/AcceptOrRejectOrder, ~/FloatingButton, ~/LoginForm, ~/OrdersListManager, ~/OrdersOption, ~/PreviousOrders, ~/ProductItemAccordion, ~/UserProfileForm (`styles.tsx`), shared/OAlert.tsx, shared/OChatBubble.tsx, shared/ODropDown.tsx, shared/ODropDownCalendar.tsx, shared/OIconButton.tsx |
| `styled.Pressable` | 8 definitions / 5 files | ~/MessagesOption, ~/OrdersListManager (2), ~/OrdersOption (2), ~/Payouts (2), ~/StoresList (`styles.tsx`) |
| `<Modal>` (RN) | 6 / 6 | ~/AcceptOrRejectOrder/index.tsx:1070; ~/NewOrderNotification/index.tsx:118; ~/OrderDetails/Delivery.tsx:1032; ~/UserProfileForm/RemoveAccountModal.tsx:121; and the two primitives shared/OBottomPopup.tsx:23, shared/OModal.tsx:177 |
| `<ActivityIndicator>` | 5 / 5 | ~/BusinessController/index.tsx:136; ~/Chat/index.tsx:1240; ~/OrdersOption/OrderSummaryTable.tsx:195; ~/UserProfileForm/index.tsx:417; shared/OButton.tsx:100 |
| `Spinner` (`react-native-loading-spinner-overlay`) | 3 / 2 | ~/SignupForm/index.tsx:483, 523; ~/VerifyPhone/index.tsx:199 |
| `Placeholder` / `PlaceholderLine` (`rn-placeholder`) | 15 / 31 in 9 files | other areas |
| `onPress=` handlers in total | 121 | counted |

### 3. Fonts

**Bundled:** 67 files in `src/assets/fonts`, 21,215,652 bytes (20.3 MB on disk), linked by `react-native.config.js:7` (`assets: ['./src/assets/fonts']`).

| Family (files) | Count | Bytes |
|---|---|---|
| Inter 18pt (9 weights × upright/italic) | 18 | 6,222,776 |
| Inter 24pt (same) | 18 | 6,221,080 |
| Inter 28pt (same) | 18 | 6,218,840 |
| Helvetica (`Helvetica.ttf`, `-Bold`, `-Oblique`, `-BoldOblique`) | 4 | 1,501,240 |
| Poppins (Thin, Light, Regular, Medium, SemiBold, Bold) | 6 | 945,212 |
| `helvetica-compressed-…otf`, `helvetica-light-…ttf`, `helvetica-rounded-bold-…otf` | 3 | 106,504 |

**Linking:** Android: `android/app/src/main/assets/fonts` holds the same 67 files (identical listing, a second 20.3 MB copy in the repository); the icon fonts come from `apply from: …/react-native-vector-icons/fonts.gradle` (`android/app/build.gradle:148`). iOS: `Info.plist` `UIAppFonts` lists 83 entries = the 67 files + 16 icon fonts (AntDesign, Entypo, EvilIcons, Feather, FontAwesome, FontAwesome5 Brands/Regular/Solid, Fontisto, Foundation, Ionicons, MaterialCommunityIcons, MaterialIcons, Octicons, SimpleLineIcons, Zocial); the Xcode project copies the same 67 as resources.

**Every `fontFamily` in the app (40 declarations):**

| Declaration | Count | Resolves to |
|---|---|---|
| `fontFamily: 'Poppins'` | 16 (+1 `font-family: Poppins`) | iOS: the Poppins family (weight picks the face). Android: there is no `Poppins.ttf`, the files are `Poppins-Regular.ttf`…; expected to fall back to the system font (lesson 9) |
| `theme.fonts.primary.name` (`Helvetica`) | 15 (8 styled + 6 object + OText's default) | iOS: Helvetica is also a system family. Android: `Helvetica.ttf`; bold is synthesized, since the bold file is named `Helvetica-Bold.ttf`, not `Helvetica_bold.ttf` |
| `theme.fonts.special.name` (`Inter_18pt-Black`) | 5 | Android: the file `Inter_18pt-Black.ttf`. iOS: the file's PostScript name is `Inter18pt-Black` and its family `Inter 18pt Black` (name table read with a script), so `Inter_18pt-Black` matches neither; expected to fall back to the system font |
| `` `${theme.fonts.special.name}_18pt-Black` `` | 1 (shared/ONavbar.tsx:33) | `Inter_18pt-Black_18pt-Black`: no such font on either platform |
| `'Poppins-Regular'` | 2 (shared/ODropDownCalendar.tsx:82, shared/OSegment.tsx:26) | The file / PostScript name on both platforms |

**How weight is expressed:** always `fontWeight` / the `weight` prop on top of one family name, never a per-weight file (except the two `Poppins-Regular`). Values in use (style objects, styled templates and the `weight` prop together): 700 ×59, 400 ×55, 600 ×39, `'normal'` ×16, `'bold'` ×9, 300 ×2, 500 ×1. `OButton` asks for weight 700 on a Black face.

**Bundled files nothing uses (by name in code):** all 36 Inter 24pt and 28pt files; 17 of the 18 Inter 18pt files (only `Inter_18pt-Black` is named); the three `helvetica-*` extras; `Poppins-Thin`, `-Light`, `-Medium`, `-SemiBold`, `-Bold` are never named (only reachable on iOS through the family name `'Poppins'` plus a weight). `Helvetica-Oblique` / `-BoldOblique` are not named either, but `fontStyle: 'italic'` is set on default (Helvetica) texts in ~/AcceptOrRejectOrder/index.tsx:928 and ~/ProductItemAccordion/index.tsx:239, 250, 265, 276, so iOS may pick them by family; on Android the italic is synthesized (the file is not named `Helvetica_italic.ttf`). Named in code: `Helvetica`, `Inter_18pt-Black`, `Poppins-Regular` (3 files); at least 56 of the 67 files (the 53 unused Inter files and the 3 extras, ≈ 19 MB) cannot be reached by any name the code uses.

### 4. Icon sets app-wide

`react-native-vector-icons` is imported in 37 files, under 15 alias names, 10 families, 103 JSX uses.

| Family | Files | Uses | Aliases | Sizes (count) | Glyphs (count) |
|---|---|---|---|---|---|
| MaterialCommunityIcons | 16 | 42 | `MaterialCommunityIcon`, `MaterialCommunityIcons`, `MCIcon`, `MaterialIcon` | 24 (22), 26 (6), 12 (3), 16 (3), 20 (3), 18 (2), 14, 28, 32 | `eye-outline` 5, `eye-off-outline` 5, `radiobox-marked` 4, `radiobox-blank` 4, `circle` 3, `close` 2, `close-circle-outline` 2, `cloud-sync` 2, `content-copy` 2, `chevron-up` 2, `chevron-down` 2, `close-octagon-outline`, `chevron-double-down`, `checkbox-marked`, `checkbox-blank-outline`, `star`, `alert-circle`, `format-list-numbered`, `minus`, `plus`, `pencil-outline`, `trash-can-outline`; through `OFab`: `plus`, `minus` |
| AntDesign | 10 | 22 | `IconAntDesign`, `AntDesignIcon`, `AntIcon`, `AntDesign` | 18 (7), 20 (6), 16 (4), 48 (2), 12, 14, 24 | `close` 7, `up` 4, `down` 4, `right` 4, `arrowright`, `caretdown`, `caretright`, `warning`, `exclamationcircle`, `exclamationcircleo`, `filter`, `calendar`, one dynamic (`currentStatus.icon`, ~/StripeConnectAccount/index.tsx:210) |
| FontAwesome | 2 | 14 (7 per utils copy) | `FontAwesome` | caller's | `cc-visa`, `cc-mastercard`, `cc-amex`, `cc-discover`, `cc-jcb`, `cc-diners-club`, `credit-card-alt` — inside `getIconCard`, which nothing calls |
| Feather | 8 | 12 | `FeatherIcon`, `Icon` | 24 (5), 18 (3), 26 (2), 22, 30 | `chevron-down` 4, `chevron-up` 3, `refresh-cw` 2, `minus`, `plus`, `x`, `x-circle`, `chevron-left`, `chevron-right`; imported and unused in shared/OModal.tsx:4 |
| FontAwesome5 | 5 | 5 | `IconFA`, `Icon` | 50 (4), 20 | `map-marker` 4 (map pins), `list-alt` (Orders tab) |
| MaterialIcons | 2 | 4 | `MaterialIcon` | 20 (4) | `star`, `star-half`, `star-border` (dead Contacts UI), dynamic `vertorIcon` (never passed) |
| SimpleLineIcons | 2 | 1 | `SimpleLineIcons` | 20 | `printer`; imported and unused in ~/OrderDetails/Delivery.tsx:43 |
| Fontisto | 2 | 1 | `FontistoIcon` | 24 | `search` (in `OrdersListManager`, which nothing renders); imported and unused in ~/OrdersOption/index.tsx |
| Entypo | 1 | 1 | `EntypoIcon` | 32 | `dot-single` |
| Ionicons | 1 | 1 | `Icon` (shared/OFab.tsx:9) | 20 | through `OFab`: `globe-sharp`, `car-sport-sharp` |

The alias `MaterialIcon` means MaterialIcons in shared/OInput.tsx:8 and MaterialCommunityIcons in shared/OFab.tsx:10 and ~/WebsocketStatus/index.tsx:3; `Icon` means Feather, FontAwesome5 or Ionicons depending on the file.

Icon sizes in use: 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 48, 50 (13 sizes).

**PNG icons of `theme.images.general`** (readers in App-wide 1; painted through `OIcon` / `OIconButton` / `Image`, tinted when a `color` / `tintColor` is passed): 30 of the 40 keys have readers — `arrow_left` (9), `notFound` (9), `map` (3), `messages` (3), `close` (3), `chevronDown` (2), `profile` (2), `imageFile` (2), `cellphone` (2), `chronometer` (2), `clock1` / `clockRisk` / `clockDelayed` (2 each), `inputPhone`, `imageChat`, `attach`, `arrow_distance`, `pdfFile`, `docFile`, `driverImage`, `search`, `camera`, `menulogout`, `newOrder`, `noNetwork`, `deliveryWaiting`, `ordersGroup`, `send`, `pen`, `loadingSplash` — and 10 have none (`dropDown`, `arrow_down`, `arrowReturnLeft`, `reload`, `profilephoto`, `orders`, `stores`, `project`, `orderCreating`, `orderSuccess`). The Orders tab uses a vector glyph while `general.orders` (a PNG for the same tab) is bundled and unread.

### 5. Bundled images

Metro bundles every file `require`d in `src/DeliveryApp.tsx:34-104`, whether or not something reads its key. No other `require(` of an asset exists in `src`.

`src/assets/images` (9.6 MB on disk):

| File | Bytes | Pixels | Alpha | Key | Painted? |
|---|---|---|---|---|---|
| slide1.png | 1,653,868 | 1242×1369 | no | tutorials.slide1 | yes (tutorial) — opaque photo stored as PNG |
| slide2.png | 1,684,807 | 1242×1369 | no | tutorials.slide2 | yes — opaque PNG |
| slide3.png | 1,683,422 | 1242×1369 | no | tutorials.slide3 | yes — opaque PNG |
| slide4.png | 1,908,214 | 1242×1369 | no | tutorials.slide4 | yes — opaque PNG |
| slide5.png | 2,030,792 | 1242×1369 | no | tutorials.slide5 | yes — opaque PNG |
| background.png | 615,064 | 375×812 | yes (flag) | logos.background (0 reads) + backgroundsImages.login (1 read) | yes (Home background); full-screen picture at 1× resolution; whether it is really transparent anywhere was not checked |
| loading-splash.png | 151,147 | 2700×1800 | yes | none — not `require`d (a test forbids it: src/__tests__/DeliveryApp.splash.test.ts:12) | no; not bundled |
| no-network.png | 113,883 | 1002×904 | yes | general.noNetwork | bundled; reader is the unreachable NetworkError |
| logotype.png | 29,854 | 798×180 | yes | logos.logotype | bundled, 0 reads (same bytes as the iOS splash images, 29,854) |
| not-found.png | 28,034 | 279×279 | yes | general.notFound | yes |
| new-order.png | 21,505 | 264×264 | yes | general.newOrder | yes |
| order-success.png | 20,483 | 314×314 | yes | general.orderSuccess | bundled, 0 reads |
| order-creating.png | 17,700 | 314×314 | yes | general.orderCreating | bundled, 0 reads |
| delivery-waiting.png | 14,248 | 199×199 | yes | general.deliveryWaiting | yes |
| dummies/store.png | 11,455 | 512×512 | yes | dummies.businessLogo | yes |
| logo.png | 6,332 | 200×200 | yes | logos.logo | only as `OIcon`'s last fallback |
| logotype-invert.png | 4,068 | 250×55 | yes | logos.logotypeInvert | yes (Home) |
| cursor-fill.png | 1,405 | 124×124 | yes | general.driverImage | yes |
| close.png | 536 | 44×44 | yes | none — not `require`d | no |

The five slides are 8,961,103 bytes: 91 % of the folder.

`src/assets/icons` (36 files, 60 KB of content):

| File | Bytes | Pixels | Key | Painted? |
|---|---|---|---|---|
| orders_group.png | 13,425 | 213×213 | general.ordersGroup | yes |
| clock1.png / clock-history1.png / clock-fill1.png | 3,429 / 2,962 / 2,603 | 48×48 | clock1 / clockRisk / clockDelayed | yes |
| profile-default-photo.png | 2,626 | 128×128 | general.profilephoto | bundled, 0 reads |
| cellphone.png | 1,744 | 64×64 | general.cellphone | yes |
| messages.png | 1,733 | 65×65 | general.messages | yes |
| search.png | 1,614 | 65×65 | general.search | only the dead SearchBar |
| camera.png | 1,593 | 64×64 | general.camera | yes |
| Close.png | 1,588 | 128×128 | general.close | yes |
| reload.png | 1,525 | 65×65 | general.reload | bundled, 0 reads |
| profile.png | 1,283 | 64×65 | general.profile | yes |
| stores.png | 1,121 | 65×65 | general.stores | bundled, 0 reads |
| attach.png | 997 | 64×64 | general.attach | yes |
| chronometer.png | 968 | 42×48 | general.chronometer | yes |
| pdfFile.png | 967 | 48×48 | general.pdfFile | yes |
| Up_arrow.png | 933 | 104×120 | general.arrow_distance | yes |
| arrow_down.png | 892 | 51×32 | general.arrow_down | bundled, 0 reads |
| image-chat.png | 871 | 64×64 | general.imageChat | yes |
| phone_input.png | 763 | 64×64 | general.inputPhone | yes |
| phone.png | 735 | 41×64 | none — not `require`d | no |
| logout.png | 719 | 64×64 | general.menulogout | yes |
| project.png | 719 | 64×64 | general.project | bundled, 0 reads |
| map.png | 675 | 65×64 | general.map | yes |
| orders.png | 674 | 65×64 | general.orders | bundled, 0 reads |
| arrow_up.png | 674 | 38×60 | none — not `require`d | no |
| imageFile.png | 669 | 48×48 | general.imageFile | yes |
| arrow_return_left.png | 574 | 80×80 | general.arrowReturnLeft | bundled, 0 reads |
| docFile.png | 516 | 48×48 | general.docFile | yes |
| drop_down.png | 496 | 50×31 | general.dropDown | bundled, 0 reads |
| chevron-down.png | 486 | 64×64 | general.chevronDown | yes |
| pen.png | 412 | 19×19 | general.pen | yes |
| send.png | 349 | 25×25 | general.send | yes |
| arrow_left.png | 309 | 24×24 | general.arrow_left | yes (24×24 at 1× only: soft on 2×/3× screens) |
| email.png | 299 | 16×12 | logos.emailInputIcon | reader is the unreachable Signup form |
| password.png | 233 | 10×16 | logos.passwordInputIcon | same |

No `@2x` / `@3x` variants exist for any PNG: each file is used at every density.

Other bundled assets: `src/assets/sounds/notification.mp3` (4,479 bytes, `require`d, 0 readers), `notification.ogg` (6,131, not required); `src/assets/json/order.json` (6,187) and `orders.json` (118,635): no reference anywhere in `src`, tests or `jest/`. Remote images fixed in code: the two dummy avatars on `res.cloudinary.com/demo` (src/DeliveryApp.tsx:92-95) and the Google static-map marker on `res.cloudinary.com/ditpjbrmz` (ui/utils/index.tsx:132, unused).

### 6. Libraries that paint UI app-wide

Files importing each dependency of `package.json` (app code without tests; "sub" = files of the submodule that import it).

| Library (version) | App files | Sub | What it paints |
|---|---|---|---|
| styled-components ^6.1.0 (6.5.3 installed) | 150 | 0 | styling |
| react-native-vector-icons ^10.0.2 | 37 | 0 | icons (10 families) |
| react-native-safe-area-context 5.8.0 | 18 | 0 | insets |
| rn-placeholder ^3.0.3 | 9 | 0 | skeletons with its own color and animation |
| react-native-fast-image ^8.5.11 | 6 | 0 | remote images |
| react-hook-form ^6.15.1 | 6 | 0 | none (form state) |
| toggle-switch-react-native ^3.2.0 | 5 | 0 | switch (`onColor`, `offColor`, sizes) |
| react-native-maps 1.13.2 | 5 | 0 | map, markers, callouts |
| react-native-restart ^0.0.27 | 4 | 0 | none |
| react-native-select-dropdown ^1.7.0 | 3 | 0 | dropdown button and list |
| react-native-image-picker ^4.0.6 | 3 | 0 | system camera / gallery |
| @react-navigation/native ^6.1.17 | 3 | 0 | container (default theme) |
| react-native-paper ^4.9.2 | 2 | 0 | only `Text`, in the two dropdown primitives |
| react-native-loading-spinner-overlay ^2.0.0 | 2 | 0 | full-screen spinner |
| @twotalltotems/react-native-otp-input ^1.3.11 | 2 | 0 | code cells |
| react-native-map-link ^2.8.2 | 2 | 0 | "open in maps" popup |
| @react-navigation/bottom-tabs ^6.5.20 | 2 | 0 | tab bar |
| @react-navigation/stack ^6.3.29 | 2 | 0 | transitions |
| react-native-splash-screen ^3.3.0 | 2 | 0 | native splash |
| @react-native-clipboard/clipboard ^1.16.0 | 2 | 0 | none |
| react-native-gesture-handler 2.28.0 | 2 | 0 | `ScrollView` of a dead branch (also a peer of the navigators) |
| react-native-sound-player ^0.13.2 | 2 | 0 | none (sound) |
| react-native-gifted-chat 2.1.0 | 1 | 0 | chat thread, composer, bubbles |
| react-native-calendar-picker ^7.1.2 | 1 | 0 | calendar |
| react-native-country-picker-modal ^2.0.0 | 1 | 0 | language modal, flags |
| react-native-phone-number-input ^2.0.0 | 1 | 0 | phone field + its country modal |
| react-native-signature-canvas ^4.3.0 | 1 | 0 | signature pad (WebView) |
| react-native-app-intro-slider ^4.0.4 | 1 | 0 | tutorial pager, dots, buttons |
| react-native-linear-gradient 2.7.3 | 1 | 0 | rating bar gradient |
| react-native-intersection-observer ^0.0.9 | 1 | 0 | none (scroll observer, in the unrendered `BusinessProductList`) |
| react-native-html-to-pdf 1.3.0, react-native-print ^0.11.0 | 1 each | 0 | system print dialog (in the unrendered `OrderSummary`) |
| @fatnlazycat/react-native-recaptcha-v3 ^1.0.3, react-native-recaptcha-that-works ^1.2.0 | 1 each | 0 | reCAPTCHA (WebView) |
| @react-native-documents/picker ^11.0.0 | 1 | 0 | system file picker |
| react-native-geocoding ^0.5.0 | 1 | 0 | none |
| react-native-onesignal 4.5.2, @notifee/react-native ^9.1.8, react-native-background-geolocation ^4.14.6 | 1 each | 0 | system notifications and prompts |
| **react-native-elements ^3.0.0-alpha.1** | **0** | 0 | nothing — removable |
| **react-native-picker-select ^8.0.4** | **0** | 0 | nothing — removable |
| **react-native-awesome-loading ^1.0.15** | **0** | 0 | nothing — removable |
| **react-native-swipe-gestures ^1.0.5** | **0** | 0 | nothing — removable |
| **toggle-react-native ^1.1.2** | **0** | 0 | nothing — removable |
| **styled-system ^5.1.5** | **0** | 0 | nothing — removable |
| **@react-navigation/drawer ^5.10.2** | **0** | 0 | nothing — removable (a v5 package beside v6 navigators) |
| **react-native-maps-directions ^1.8.0** | **0** | 0 | nothing — removable |
| **react-native-background-timer ^2.4.1** | **0** | 0 | nothing imported (a type stub exists in `src/types`) |
| react-native-webview ^11.22.7 | 0 | 0 | not imported by the app; needed by the signature canvas and reCAPTCHA libraries |
| react-native-screens 4.14.0 | 0 | 0 | not imported; peer of the navigators |
| react-native-background-fetch ^4.2.1 | 0 | 0 | not imported; companion of background-geolocation |
| @react-native-firebase/app, /crashlytics ^23.3.0 | 0 | 0 | not imported in JS (`firebase.json` configures crashlytics; `app` is the peer of `messaging`) |
| prop-types, decimal.js, libphonenumber-js, socket.io-client | 0 | 140 / 2 / 3 / 1 | used by the submodule only |
| @types/react-native-html-to-pdf, @types/react-native-loading-spinner-overlay, postinstall-postinstall | 0 | 0 | type / tooling packages listed under `dependencies` |

`moment` (6 app files) and `dayjs` (1 app file, 21 in the submodule) are both shipped. "Removable" means no import was found in app or submodule source; native autolinking and peer requirements were not checked beyond what is noted.

### 7. Build-system expectations

| Item | What the repository has | What it suggests the Builder relies on |
|---|---|---|
| `builder.json` | `{"ios_project": "ODelivery", "ios_bundle": "co.ordering.delivery", "android_package": "co.ordering.delivery", "root_path": ""}` | The names the Builder renames per brand: the Xcode project/target `ODelivery`, the bundle id, the Android package (sister repo's file has the same four keys with `ReactNativeAppsTemplate5` / `com.ordering.app1` / `com.reactnativeappstemplate5`) |
| `BUILD_CRA.txt` | Empty file at the root | A marker file. The sister repo has `BUILD_PNPM.txt` instead, documented as "tells the Builder's pipelines … to install with pnpm … without it they install with yarn" (`ordering-app-marketplace-theming/CLAUDE.md:170`). `BUILD_CRA.txt` is not explained in either repository: its meaning is a question for whoever owns the Jenkins pipelines |
| `NODE_VERSION.txt` | `22` | The Node version the pipeline uses (`package.json` engines says `>=20`); the sister repo has the same file |
| Package manager | `yarn.lock`, no `patches/` | Yarn install (the sister repo moved to pnpm with the marker file) |
| Android package path | `android/app/src/main/java/co/ordering/delivery/` with `MainActivity.kt`, `MainApplication.kt`, `NotificationServiceExtension.kt`; `namespace` and `applicationId "co.ordering.delivery"` (`android/app/build.gradle:86, 88`) | The sister's note (`CLAUDE.md:181`): the Builder renames the package only in the files its base lists and moves the folder; a new Kotlin file in that package would keep the old `package` line. Here a third class already lives there (`NotificationServiceExtension.kt`, referenced as `${applicationId}.NotificationServiceExtension` in `AndroidManifest.xml:28-29`) |
| Placeholders replaced as text | `_TRANSISTORSOFT_API_KEY_` (`AndroidManifest.xml:30`), `_GOOGLE_MAPS_API_KEY_` (`ios/ODelivery/AppDelegate.swift:31`) | The Builder replaces every occurrence of the text (sister `CLAUDE.md:175`): never write these strings elsewhere. The Android Maps key is a literal in `AndroidManifest.xml:33`, not a placeholder |
| Native strings | `app_name` = `deliveryApp`; `driver_location_permission_title` = `ALLOW_DRIVER_APP_ACCESS_LOCATION`, `description_driver_location_permission` = `DESCRIPTION_DRIVER_APP_ACCESS_LOCATION` (`android/app/src/main/res/values/strings.xml`), read through `rn-config-reader` (RootNavigator.tsx:353-354) | Values the Builder may overwrite per brand; the code treats the two sentinel values as "use the default text" |
| App name | `app.json` `name`/`displayName` `deliveryApp`; `CFBundleDisplayName` `deliveryApp` (`Info.plist:11-12`) | Renamed per brand |
| Runtime config | `src/config.json` (`project`, `app_id`, API and socket URLs, flags) | Rewritten per brand (the sister lists `config.json` among the renamed files) |
| Splash, Android | `android/app/src/main/res/mipmap-*/splash.png` and `splash_land.png` (6 densities, all the same 13,547-byte file), shown by `layout/launch_screen.xml` (`@mipmap/splash`, `centerCrop`); `AppTheme.Splash` with `splashscreen_bg` `#FFF` (`values/colors.xml`); `react-native-splash-screen` (`MainActivity.kt:17-18`) | Fixed file names replaced per brand. The JS also `require`s `mipmap-xxxhdpi/splash.png` (src/DeliveryApp.tsx:46) and a test pins that exact path (src/__tests__/DeliveryApp.splash.test.ts:13): the file cannot move or be renamed |
| Splash, iOS | `ios/ODelivery/Images.xcassets/SplashImage.imageset/splash@1x/2x/3x.png` (three copies of one 29,854-byte file), shown by `ios/SplashScreen.storyboard` (`UILaunchStoryboardName` = `SplashScreen`, `scaleAspectFit`, white background); JS paints `{ uri: 'SplashImage' }` (src/DeliveryApp.tsx:45) | Fixed image-set name and file names |
| App icon | `mipmap-*/ic_launcher.png`, `ic_launcher_round.png`; `Images.xcassets/AppIcon.appiconset/icon-*.png` (21 files) | Fixed names replaced per brand |
| Notification icons / sounds | `res/drawable-*/ic_stat_onesignal_default.png`, `drawable-xxxhdpi/ic_onesignal_large_icon_default.png`, `res/raw/order_sound_notification.mp3`, `ios/ODelivery/order_sound_notification.caf` | Fixed names used by OneSignal / notifee / the native alarm |
| Push and services files | `ios/GoogleService-Info.plist`, `android/app/google-services.json` (not opened), `ios/OneSignalNotificationServiceExtension/` | Replaced per brand (the sister says the extension's bundle and App Group names are renamed) |
| Sentry | `src/sentry.json` with a fixed DSN | A split repository inherits it (lesson 29) |
| CI | `.github/workflows/ci.yml`, `i18n-sync.yml`; no theme-publish workflow | Nothing publishes a schema or re-syncs a Builder base today (the sister does both on every push to `main`, `CLAUDE.md:169`) |
| Architecture flags | Android `newArchEnabled=false`, `edgeToEdgeEnabled=false` (`android/gradle.properties:37, 46`); iOS `RCTNewArchEnabled` true (`Info.plist:79-80`) | The two platforms may run different architectures (lesson 11): `boxShadow` and other new-architecture-only styles cannot be assumed on Android |

Differences from the sister repo's notes: the sister uses `react-native-bootsplash` (`BootSplash.storyboard`, `BootTheme`, `src/splash.json`) with "fixed names because the Builder replaces them per brand" (`CLAUDE.md:171`); this app is still on `react-native-splash-screen` with `SplashScreen.storyboard` + `SplashImage` + `mipmap/splash.png`. Which exact files the driver Builder base lists for replacement is not in either repository.

### 8. Status bar and safe areas

**Native settings:** iOS `UIViewControllerBasedStatusBarAppearance` false, `UIUserInterfaceStyle` Light, portrait only, `UIRequiresFullScreen` true (`Info.plist:179-188`). Android `AppTheme`: light, `forceDarkAllowed` false, `windowTranslucentStatus` false, `windowOptOutEdgeToEdgeEnforcement` true for API 35 (`android/app/src/main/res/values/styles.xml:6-11`), with `targetSdkVersion = 36` (`android/build.gradle:6`); activity `screenOrientation="portrait"`, `windowSoftInputMode="adjustResize"` (`AndroidManifest.xml:42-43`). No dark mode anywhere.

**`StatusBar` elements (5, one dead):**

| file:line | barStyle | backgroundColor (Android) | translucent | Used by |
|---|---|---|---|---|
| ui/layouts/Container.tsx:39-45 | prop or `dark-content` | `style.backgroundColor` or `'transparent'` | prop or false | Login, ForgotPassword, Sessions |
| ui/layouts/SafeAreaContainer.tsx:93-96 | iOS `dark-content`, Android `default` | only while offline (`danger500`) or 2 s after reconnecting (`success500`); otherwise not set | not set | Messages, MyOrders, OrderDetails, OrderDetailsLogistic, Payouts, Profile, StripeConnectAccount |
| src/pages/Home.tsx:32-38 | `light-content` | `theme.colors.transparent` | true | Home |
| src/pages/IntroductoryTutorial.tsx:195-199 | `dark-content` | `theme.colors.white` | false | Tutorial |
| src/layouts/Container.tsx:39-45 | (copy) | (copy) | (copy) | nothing |

`StatusBar` props are global and the last mounted one wins: screens without a `StatusBar` (AcceptOrRejectOrder, OrderMessage, MapView, RequestPermissions, ScheduleBlocked, Splash) inherit whatever the previous screen set, including Home's translucent light style. `Splash.tsx:42` also reads `StatusBar.currentHeight`.

**Safe areas:** `SafeAreaProvider` at the root (App.tsx:27) and a second one inside every `OModal` (shared/OModal.tsx:191).

| Mechanism | Where |
|---|---|
| `SafeAreaContainer` (View + insets by `edges`) | ui/layouts/SafeAreaContainer.tsx:20-49; pages AcceptOrRejectOrder.tsx:9 (all edges), IntroductoryTutorial.tsx:194 (`edges={[]}`, then its own `useSafeAreaInsets` at :17), OrderMessage.tsx:35 (top/left/right) |
| `SafeAreaContainerLayout` (top/left/right; bottom left to the tab bar or the floating bar) | 7 pages (see Screens) |
| Core `SafeAreaView` (iOS only) | ui/layouts/Container.tsx:17, 38 → Login, ForgotPassword, Sessions; Android gets no inset from it |
| `SafeAreaView` of safe-area-context | src/pages/ScheduleBlocked.tsx:22 (top), ~/Chat/index.tsx:1202, ~/DriverMap/index.tsx:343, ~/GoogleMap/index.tsx:288, ~/MapView/index.tsx:182, shared/OModal.tsx:176 (wrapping a `Modal`), ~/NewOrderNotification/styles.tsx:4 (`styled(SafeAreaView)`) |
| `useSafeAreaInsets` by hand | src/navigators/BottomNavigator.tsx:26, 34 (Android bottom only); shared/OModal.tsx:57, 72 (top margin); shared/OToast.tsx:15, 67 (bottom); ~/WebsocketStatus/index.tsx:31, 99-100; ui/hooks/useFloatingButtonInset.tsx:12-15 (iOS bottom, outside tabs); ~/Home/index.tsx:25; ~/DriverMap/index.tsx:42; ~/GoogleMap/index.tsx:47; ~/DriverSchedule/index.tsx:18; ~/ReviewCustomer/index.tsx:54; ~/AcceptOrRejectOrder/index.tsx:65; src/pages/IntroductoryTutorial.tsx:17 |
| Guessed insets | Tab bar on iOS: `windowHeight < 845 ? 20 : 30` (src/navigators/BottomNavigator.tsx:32-37); `Container` padding by platform (ui/layouts/Container.tsx:10-12); `FloatingButton` `paddingBottomIos ?? 5` (callers pass 20 in src/pages/RequestPermissions.tsx) |

Who paints behind the notch / home indicator: the layouts paint `backgroundPage` (white) behind the top inset; the tab bar paints its own white over the bottom inset; the floating bar paints `#fff` over it on iOS and nothing extra on Android; Home paints its background image under a translucent status bar.

**Keyboard:** no `KeyboardAvoidingView` in the area's files. App-wide: `behavior={ios ? 'padding' : 'height'}` in pages Login.tsx:42, ForgotPassword.tsx:20, Profile.tsx:52, RequestPermissions.tsx:52 (a styled `KeyboardAvoidingView` declared inside the component, :19), plus `<KeyboardAvoidingView>` at src/pages/OrderMessage.tsx:31, ~/AcceptOrRejectOrder/index.tsx:669, ~/ReviewCustomer/index.tsx:179; `useKeyboardVisible` (src/hooks/useKeyboardVisible.ts) is used by ~/Chat/index.tsx:45.

---

### Not verified

Nothing was run: no simulator, no device, no Metro, no test, no type check, no lint. The items below need a device or a person.

- **Fonts on screen.** That `Inter_18pt-Black` falls back to the system font on iOS, that `'Poppins'` falls back on Android, and that `Inter_18pt-Black_18pt-Black` (ONavbar title) paints the system font on both: derived from file names and name tables, not seen.
- **`OInput` without its defaults.** What background and border color the field shows when `bgColor` / `borderColor` are undefined (React 19 ignores `defaultProps`); same for `OButton`'s press opacity and spinner color.
- **Centered `OModal`'s title row.** Whether the always-rendered title row (padding + 2 pt `#e6e6e6` border, shared/OModal.tsx:194-201) is visible above the WebsocketStatus card.
- **`FloatingButton` background when a custom color is missing.** `backgroundColor: styles.primaryBtn` passes a style object as a color (~/FloatingButton/index.tsx:81, 114); every live caller with two buttons passes both colors, so it was not seen to fail. In src/pages/RequestPermissions.tsx the single button passes `firstColorCustom={red}` but the single-button branch reads `color`: by the code the button is `primary`, not red.
- **Undefined theme keys.** What `color={undefined}` paints for the 11 `textNormal` icons, and `todayBackgroundColor={undefined}` in the calendar.
- **`text-decoration: undefined`** and **`shadow-color: 'rgba(…)'`** (quoted): whether styled-components drops them silently or warns.
- **Tab bar** heights and bottom padding on real iPhones (the 845 pt threshold), on iPad (a build target; only the tab bar adapts to it), and on Android with gesture vs 3-button navigation.
- **Android 15/16 edge to edge.** `targetSdkVersion` is 36 and the theme opts out of edge-to-edge enforcement only "for API 35": whether insets are 0, doubled or correct on Android 16 was not seen; Login / ForgotPassword / Sessions use the core `SafeAreaView`, which does nothing on Android.
- **Status bar inheritance** between screens (Home's translucent light style leaking into screens without a `StatusBar`).
- **New architecture.** Whether iOS really runs the new architecture (`RCTNewArchEnabled` true) while Android runs the old one (`newArchEnabled=false`); the Podfile was only searched for flags.
- **Theme request.** That `GET …/theme` is actually sent at start, and what the API answers for `X-App-X: react-native-app`: read in the submodule's code, not observed on the network.
- **`react-native-paper` `Text`** without a Paper provider: which font and color it paints.
- **`react-native-country-picker-modal`** chrome (header, close button, background) and **`react-native-calendar-picker`** defaults (month title, day text, range colors): library code not read.
- **Images.** Whether `background.png` has transparent pixels (only the alpha flag was read); how the 24×24 `arrow_left.png` and the other 1× icons look on 3× screens.
- **Builder.** What `BUILD_CRA.txt` means, and the exact list of files and placeholders the driver's Builder base replaces: neither repository says. `android/app/google-services.json`, `ios/GoogleService-Info.plist`, `ios/Podfile` (beyond a flag search), `AppDelegate.swift` (beyond the placeholder line) and `MainApplication.kt` were not read in full.
- **Removable dependencies.** "0 imports" was checked in app and submodule source only; native linking, peer dependencies and `jest/` mocks were not.
- **Files of the area read only by search, not line by line:** `ui/utils/index.tsx` lines 131-595 and 700-1274 (searched for colors, icons, alerts, `Platform`, `Dimensions`: none beyond what is listed), `ui/config/currency.tsx` (data table), `ui/types/index.tsx` and `src/types/index.tsx` (only the parameter types of the area's components), `ui/context/OfflineActions/*`, `ui/hooks/useLocation.tsx`, `useCountdownTimer`, `useDeliveryPin*`, `useDriverOrderStage`, `useLogisticDeliveryTime`, `useSecureOrderId`, `src/hooks/useLocation.tsx`, `src/utils/sentry.ts`, `src/navigators/get*.ts`, `firebasePushConsent.ts`, `~/LanguageSelector/lang_country.json` (searched: no JSX, colors, theme reads or system alerts except the toasts of `useStatusImage`). The `*.d.ts` stubs under `src/types` and `ui/types` were listed, not opened.
- **Other areas' findings mentioned here** (unreferenced `@ui` components, unreachable pages) come from an import graph and identifier search; their owners should confirm.
