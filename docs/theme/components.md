# Components — grouping by function (phase 2)

Date: 2026-11-13 · Status: approved by the owner with D1–D8 as recommended (gate 2,
[decisions.md](decisions.md)).

Inputs: [inventory.md](inventory.md), the area reports in [areas/](areas/), and the
marketplace app's schema (`ordering-app-marketplace-theming/product.schema.json`): by the
owner's decision the driver app takes its role model and values, so a component that does
the same thing keeps the same name, axes and defaults, and the Dashboard's editor speaks
one vocabulary for both apps. The marketplace app's themed primitives
(`src/ui/src/components/shared`, `src/theme`) are the code to port, not to rewrite.

Rules applied: one function → one theme component → one code primitive; a variant stays
only when it changes structure, or differs in ≥ 2 properties outside tolerance and is used
in more than one place; everything else merges and its visible change is listed.

Values (heights, radii, sizes, colors) are phase 3 ([tokens.md](tokens.md)). Where a merge
implies a value change, the column "Visible change" says which way it goes.

## 1. Primitives (owned by the main agent, converted first)

| Group today | Theme component | Code primitive | Axes kept | Merged / removed | Visible change |
|---|---|---|---|---|---|
| `OText` (367 uses, 338 with look props), raw `<Text>` (15), `styled.Text` (17) | — (`typography.<preset>`, color by role) | `OText` with `preset` + `color` role; the family is the weight's file | presets of phase 3 | `size`/`weight`/`color`/`style` at the call → a preset and a role; built-in `#344050` → `text` | Every text gets the theme's font; bold is the real file on Android |
| `OButton` (73, all restyled), `FloatingButton` (10), 21 styled touchables acting as buttons, tutorial Next / Skip / Done, `LogoutButton` | `button` | `OButton` (defaults in the destructuring) | `colors`: primary, secondary, danger, success, neutral · `appearances`: solid, outline, tonal, ghost · `sizes`: sm, md, lg · `shapes.icon`, `shapes.round` (added 2026-11-18) · states pressed, disabled, loading | radii 5 / 7 / 7.6 / 8 / 10 → Identity's radius (since 2026-11-18 the button's own `radius.sm`, 8); heights 32–50 → three sizes; five label sizes → the size's text | Buttons unify height, radius and label; disabled and loading states paint (today several keep the enabled look) — **D3** |
| `OIconButton` (18), `OFab` (2), map close buttons (48 right / 32 left), top-bar icons of the order details, modal close X (5 glyphs) | `button` with `shapes.icon` | `IconButton` | — | targets 24–36 pt → 44 pt touch target | Icon buttons share one box; the map's black / white FAB takes a role |
| Text links (forgot password, "Send again", contact links `#365CC7`, "Clear filters", "Read more" ×3) | `link` | `OLink` | — | two blues → the theme's link look | Link color unifies |
| 10 vector-icon families (15 aliases, 13 sizes), ~30 tinted PNG icons via `OIcon` | — (`icon.*` sizes, color by role) | `Icon` (`name`, size level, color role); `OImage` for pictures | — | `OIcon` split into icon and image; one glyph per function | Some glyphs change — **D5** |
| `OInput` (18, five looks), raw `TextInput` (4), `PhoneInputNumber`, `OTextarea` | `input` | `OInput` (single line, multiline), the phone field as an input with a country select | `sizes`: md, code · states focus, disabled, error | radius 7.6 / 10, border 1 / 1.5, four border and placeholder colors → one; the profile's bottom-only border follows the input | Inputs unify; the profile's read mode looks like a disabled input |
| Field label, error text (sizes 13 / 14 / 16 / 20, reds `error` and `red`) | `field` | `OField` | — | two reds → `danger` | Field errors share one size and red |
| Code entry ×3 (4 boxes 80×80, 6 library cells 45×60, `SecurityPinFields`) | `input` size `code` | `OOtpInput` | — | 3 → 1 — **D6** | One box size for login code, phone verification and delivery PIN |
| `ODropDown`, `ODropDownCalendar`, `react-native-select-dropdown` (×3), the country picker as language selector | `sheet` + `menu` rows | `OSelect` (trigger with the input's look, list in a sheet, search for long lists) | — | 4 → 1; the iOS z-index ladder (14–20) goes | Every dropdown opens as a bottom sheet — **D2** |
| Reject and failure reasons, recipients of a message, notification options | `choice`, `checkbox`, `radio` | `ChoiceRow`, `ChoiceMark` | state selected | marks drawn per screen → one | Marks unify |
| Delivery position stepper ×2 (52 pt MaterialCommunityIcons, 56 pt Feather) | `stepper` | `OStepper` | — | 2 → 1 | Small |
| Orders tabs, login tabs (one per way in: email, phone, OTP email, OTP phone, since 2026-11-19), payout tabs | `tabs` | `Tabs` | `variants`: underline, pill | tabs 30–40 high → 44 pt targets | Tab bars unify |
| Order type and status chips, sort chips (34, radius 50), quick messages (32), review quick comments (40, radius 15), status pill (radius 5), position badge | `chip` (tappable) and `badge` (a label) | `FilterChip`, `OBadge` | chip: state selected · badge: `variants` primary, neutral, success, warning, danger | four sets of numbers → two components | Pills unify; order status takes a color by state — **D4** |
| `OToast` (`toastInfo`, `toastSuccess`, undefined `toastError`) | `toast` | `OToast` (inside the provider) | `variants`: info, success, error | literals → state colors | Error toast takes `danger` |
| Warning banner of the order details (`#FFF3CD` / `#856404`), filter notice, pending-sync row | `alert` | `ONotice` | `variants`: info, success, warning, danger | literals → state colors | Notices unify |
| `OModal` (14), 6 raw `Modal`, requirements dialog | `modal` | `OModal` | `slots.close` | scrims 0.4 / 0.5, radius 8 / 10 / 12 → one | Dialogs unify |
| `OBottomPopup` (2: notifications, chat), `react-native-map-link` popup | `sheet` | `OBottomPopup` | — | `#000000AA` → `overlay`; the map popup → a sheet of the app's rows | Sheets take the theme's scrim and surface |
| `ActivityIndicator` (5), `react-native-loading-spinner-overlay` | `spinner` | `ActivityIndicator` colored by the theme; a full-screen spinner of the app | — | overlay library → app view | Spinner color unifies |
| `SkeletonBone`, `rn-placeholder` (9 files), `OrderListSkeleton`, `ChatMessageSkeleton` | `skeleton` | `Skeleton` | — (color and radius global; shapes stay layout) | 2 systems → 1; the profile's blue-tinted wrapper goes | Skeleton color follows the theme |
| `NotFoundSource` (13 uses) | `empty_state` | `NotFoundSource` | — | — | None |
| Dividers 1 / 2 / 5 / 10 pt in four greys, borders used as lines | `divider` | `ODivider` | `variants`: item, section, band | 2.5 / 5 → `band`; 1 / 2 → `item` | Line heights and greys unify |
| Outlined or filled boxes written per screen (order details' four `gray100` cards, session, payout, Stripe status) | `card` | `OCard` | state pressed | paddings 15 / 20 / 30·20 → `card.padding` | Cards share border, radius and padding |
| Section titles (six looks in the order details) | `section_header` | `SectionTitle` | — | 6 → 1 | Section titles share one style |
| Rows with a chevron (schedule, sessions, Stripe, payouts, logout) | `list_row` | `OListRow` (`background`: one row's own fill, the schedule's today; `titleEnd`, `tall`: section 6) | — | logout's hard-coded Poppins button → a row — **D7** | Rows share height and padding |
| Avatars and logos (16 / 25 / 32 / 40 / 68 / 75 / 123; five fallbacks, two remote demo URLs) | `avatar`, `profile_photo` | `OAvatar`, `BusinessLogo` | `sizes`: sm, md, lg | fallbacks → one bundled image per kind; a picture that fails to load gives way to the same placeholder | Fallback avatar is a person glyph (today the app logo, by a missing key) |
| `toggle-switch-react-native` (availability) | `switch` | the platform's `Switch`, colored by the theme; **since 2026-11-23 `OSwitch` is drawn by the app** (section 12) | — | library removed | The switch takes the platform's shape; since 2026-11-23 the same pill track and round thumb on both platforms |
| Review customer's rating bar (`LinearGradient`) and quick comments | `rating_scale`, `review_form` | as the marketplace app's review | — | gradient → the scale's fill; since 2026-11-18 the scale is five separate segments over their labels (`rating_scale.base.mark`, the ticks, was removed) | Small |

## 2. App shell

| Group today | Theme component | Code primitive | Merged / removed | Visible change |
|---|---|---|---|---|
| `ONavbar` (24, a font family that exists nowhere, back at −20/−20), tab titles at 26, chat header at 17, the order details' top bar | `header` | `NavBar` with one `BackButton` (44 pt target) | `ios ? 0 : 15` top padding ×4 → the safe-area inset; three title sizes → one | One header everywhere |
| Bottom tab bar (icons declared inside the navigator, a guessed iOS inset `windowHeight < 845 ? 20 : 30`) | `bottom_nav` | `BottomNavigator`'s bar | one icon kind for the four tabs; the inset from the system with the theme's minimum | Tab icons and bottom space unify |
| `FloatingButton` bars (one or two buttons), accept / reject bars, the map's accept bar; reserves done by hand (`100 + inset`, `max-height: 85%`, FAB offsets 180/140 vs 280/240) | `bottom_bar` | `OBottomBar` + `bottomBarClearance` | hand-made reserves → measured from the theme | Content no longer hides under a two-button bar |
| `Container`, `SafeAreaContainer` (orientation listeners), page `SafeAreaView` | — (`layout.page_gutter`) | one screen wrapper | dead orientation code removed; gutters 20 / 30 → the page gutter | The accept / reject screen's 30 gutter becomes 20 |
| `WebsocketStatus` (socket state, orange `#FF9922` / `#FFF1E0`), offline state | `connection_status` | `WebsocketStatus`; **since 2026-11-23 a pill (`badge` `*_soft` with a `dot`) and a bottom sheet (`ConnectionHost`)**, section 12 | literals → warning role | Small; since 2026-11-23 the business app's pill and sheet replace the dialog |
| Status bar (three ways, Android bar turning red / green with connectivity) | — (style from the background's lightness) | one status bar inside the provider | — | **D8** |

## 3. Feature components (`inherits: card` where they are boxes)

| Group today | Theme component | Variants kept | Merged / removed | Visible change |
|---|---|---|---|---|
| Order card (`OrderItem`), logistic rows, grouped orders, the messages tab's order rows | `order_card` | `default` · `compact` (message row) | fixed height 105 → content height; the timer's three colors → state roles | Cards grow with their content. **Redrawn on 2026-11-20** (section 10) as the business app's "D1b" and **again on 2026-11-23** (section 11) as its "D3", the status band: a tinted band at the top with the status and the time, the total in the header, the type's colour on the chips, the quick actions across the foot |
| Order details: header card, business and customer cards, products, payments, comments | `order_details` | — | four `gray100` boxes → `card`; contact links → `link` | As listed in §1 |
| Product lines and their options (`ProductItemAccordion`, three accordion glyphs) | `product_line` under `order_details` | — | product name in the brand color with `width: 200` → text color, flexible | Product names turn to the text color |
| Bill rows | `bill` | — | rows 16 → the bill's text | Small |
| Accept / reject screen: time dial (55 pt), reasons, comment, evidence | `order_request` (`slots`: accept, reject · `scope`: choice, input, timer) | — | hand-made safe area and keyboard → the wrapper | Buttons as **D3** |
| New order modal (image, text, close) | `new_order_alert` (`inherits: modal`) | — | raw `Modal` → `OModal` | Small |
| Time state of an order (in time / at risk / delayed): card timer, bar, timeline | `badge` variants + `progress` | — | six hand-typed triplets → state roles | **D4** |
| Map overlays: pin with avatar (×3 copies; a fourth went with `GoogleMap`, dead code), "me" marker (3 looks), callout contents, distance / time bar, zoom and locate buttons | `map_marker`, `button` (icon) | — | 3 pins → 1; since 2026-11-18 `MapMarker`, one disc with a glyph (store, person, the driver's own) for both maps, no picture inside (`avatar_size` and `images.map.driver` were removed) | One marker and one "me" look |
| Chat thread (`react-native-gifted-chat`), console messages, composer, quick messages, recipients | `chat_bubble` (`slots.send`) + `chip` | — | the library → the app's thread — **D2** | Message text takes the theme's font; date separators are translated |
| Tutorial (`react-native-app-intro-slider`) | `tutorial` | — | the library → the app's pager | Buttons take the theme's radius |
| Welcome screen (background, logo, texts, login button) | `home_hero` | — | — | None |
| Login, OTP, forgot password, phone verification | `auth_form` (`slots`: submit, cancel, method_tabs, resend · `scope`: input, field, timer; `button`, `link` and `tabs` left the scope on 2026-11-18) | — | two countdowns → `timer` | "Get verify code" is outline as its call asks (painted filled today) |
| Profile: photo, availability, data form, rows | `account_page` | — | 14 restyled buttons → `button` variants | As **D3** |
| Sessions, payouts, Stripe connect | `card` + `list_row` + `badge` (payout status) | — | — | Payout "pending" takes the warning role (today the brand color) |
| Schedule (driver schedule, schedule blocked) | `list_row` + `section_header` | — | 11 inline styles → components | Small |
| Permissions request | `empty_state` + `button` | — | "Go to settings" is primary (painted today; its call asks for red and is ignored) | None |

## 4. Removed (dead code, if D1 is approved)

`OrdersListManager`, `OrderSummary`, `BusinessProductList`, `StoresList`,
`BusinessController`, `SignupForm`, the UI `Contacts`, `SearchBar`, `OChatBubble`, `OSegment`,
the five `OrdersOption*` filters nothing renders, the pages `Signup`, `NotFound` and
`NetworkError` with the `NetworkError` UI, `usePrinterCommands`, `src/context/Theme`,
`src/layouts/*`, `src/config/constants`, both `AlertProvider`s, both `Responsive`s; inside
live files, the `isBusinessApp` and `isCustomView` branches, the status-tags row, the SLA
settings, the file-attach flow, the customer-chat header, `GoogleMap`'s accept bar, the
cart mode of `ProductItemAccordion` and the orientation code; their tests, the 13 unread
color keys, the 12 unread bundled images, and the dependencies only they import
(`react-native-print`, `react-native-html-to-pdf`, `react-native-intersection-observer`).

## 5. Decisions for the owner

| # | Topic | Options | Recommendation |
|---|---|---|---|
| D1 | Dead code (§4): 4 518 lines of components and 469 literals nothing renders | (a) delete it all in this repository (the original keeps it) · (b) keep and theme it too | (a): theming code nobody can see cannot be verified, and the original repository still has it |
| D2 | Libraries that paint their own UI: chat thread, tutorial pager, phone field, code cells, dropdowns, calendar, skeletons, switch, spinner overlay, map-link popup | (a) replace each with the app's primitive, ported from the marketplace app · (b) keep the libraries and feed them theme values where their props allow | (a): what a library paints by itself (date separators, list greys, cell borders) never obeys the theme; the marketplace app already has every replacement |
| D3 | Buttons | (a) the marketplace app's: `md` 44 high for actions inside a screen, `lg` 50 in the bottom bar, radius from Identity, accept = success and reject = danger, solid in the bar and tonal inside a list row · (b) keep today's per-screen heights and radii as variants | (a): the five radii and seven heights carry no purpose |
| D4 | Order status and time colors | (a) by state, as the marketplace app: pending and in progress → primary, completed → success, rejected / cancelled / failed → danger; in time / at risk / delayed → success / warning / danger · (b) every status in the brand color, as the order card paints today | (a): the order details already color by state, and the card does not |
| D5 | Icon sets | (a) reduce the 10 families to the marketplace app's two (Ionicons, MaterialCommunityIcons), one glyph per function, with the list of replaced glyphs for review · (b) keep the 10 | (a) |
| D6 | Code entry | (a) one look for login code, phone verification and delivery PIN (the marketplace app's `input` size `code`, as many cells as the code has) · (b) keep the large 4-box look for phone verification | (a) |
| D7 | Logout on the profile | (a) a list row like schedule and sessions · (b) a button | (a) |
| D8 | Android status bar that turns red / green with connectivity | (a) keep it, with the theme's danger and success · (b) remove it: the status bar follows the screen's background and `connection_status` tells the state | (b): the bar's color is one more place saying what the connection row already says |

Not decided here (they are behaviour or product, listed for the owner in the area reports):
validation errors as toasts or inline, the hard-coded `delosi`, `quickiedelivery` and
`luisv4plus` project branches, the new-order sound's fixed URL, self-registration of
drivers, an app version on the profile.

## 6. The sizes round (2026-11-19)

The owner decided that all 38 differences of a sizes audit go to the mockups and that the icons follow the mockups with
new keys ([decisions.md](decisions.md)). The audit is not kept in the repository; it counted 38 differences to fix, 9 already
settled by a decision, 10 where the mockups disagree among themselves and 10 that reading could not determine. The schema
`driver_app` stays 1.0.0 (nothing is published). The values below were read from `src/theme.compiled.json` and compared with
its version at `b62483f`. **No token was added or changed**: these are properties of components, and where one points at a
token it is an existing one ([tokens.md](tokens.md)).

**New keys (20, each with a default):**

| Component | Key | Default | Used for |
|---|---|---|---|
| `button` | `shapes.icon.icon_size` | 22 | the glyph of a button with no label |
| `input` | `base.trailing_icon_size` | 18 | the glyph at a field's end |
| `list_row` | `base.trailing_icon_size` | 18 | the chevron or glyph at a row's end |
| `list_row` | `base.tall_min_height` | 76 | `OListRow` `tall`, and the Messages list's row |
| `order_details` | `base.detail_icon_size` | 18 | the glyphs of the details' rows and of the requirements list |
| `order_details` | `base.collect_min_height` | 64 | the header of the folded "Collect" payment row |
| `order_details` | `base.quantity_size` | 28 | a product's quantity box |
| `order_details` | `base.subtitle` | 12 / 1.5 / 600 | a sub-title inside "More details" |
| `new_order_alert` | `base.icon_size` | 28 | the alert's icon inside its tile |
| `sheet` | `base.handle_height` | 4 | the sheet's handle (it was the `xs` space, 5) |
| `stepper` | `base.value_min_width` | 28 | the number's box |
| `order_request` | `base.photo_size` | 72 | the status photo's thumbnail and row (label "Photo size") |
| `order_request` | `base.photo_tile_height` | 120 | the status photo's tile in a sheet |
| `order_request` | `base.photo_tile_icon_size` | 28 | the glyph of that tile |
| `rating_scale` | `base.min_height` | 56 | each level's column of the review's scale |
| `order_card` | `base.timer_icon_size` | 14 | the card's clock (**removed 2026-11-20**: the clock glyph is gone, nothing read it; section 10) |
| `order_card` | `base.time_text` | 12 / 1.5 / 600 | the order's timer on the Messages row and, since 2026-11-23, the status band's two texts on the card |
| `order_card` | `base.total_text` | 16 / 1.4 / 600 | a payout's amount |
| `account_page` | `base.title_min_height` | 34 | a profile section's title with nothing at its end |
| `empty_state` | `base.icon_box_size` | 88 | the round tint of the permissions screen's glyph |

**Defaults that changed (16 values, 13 rows):**

| Component | Key | Now | Was |
|---|---|---|---|
| `header` | `base.gap` | `{space.xs}` (5) | 20 |
| `button` | `sizes.md.icon_size` | 18 | 20 |
| `button` | `sizes.sm.padding_x` | `{space.sm}` (10) | 20 |
| `button` | `sizes.sm.text` | 12 / 1.2 / 600 | 14 / 1.2 / 600 |
| `list_row` | `base.padding_y` | `{space.sm}` (10) | 15 |
| `menu` | `base.item_height` | `{size.lg}` (50) | 44 |
| `divider` | `variants.vertical.spacing` | `{space.none}` (0) | 20 |
| `stepper` | `base.value` | `{typography.h3}` (20 / 1.3 / 700) | 14 / 1.4 / 400 |
| `rating_scale` | `base.label` | `{typography.body_sm}` (12 / 1.5 / 400) | 10 / 1.3 / 400 |
| `avatar` | `sizes.lg` | 56, glyph 26 | 65, glyph 24 |
| `avatar` | `sizes.sm` | 32, glyph 18 | 36, glyph 16 |
| `empty_state` | `base.image_size` | 180 | 220 |
| `order_card` | `slots.accept`, `slots.reject` | button size `md` | `sm` (a group's own actions still read them; the card's and a request's are `slots.advance` and `decline` since 2026-11-20; `slots.position`, added on 2026-11-18, was removed on 2026-11-23) |

**Rules that came with them.** A notice's action and a row's accept and reject are `md`. `OrderBill` `compact` rows are `xs`
apart. A folded row's header is the touch target, 50 at least. The back button and a bar's icon actions are pulled into the
gutter by `closeButtonInset` (half of the close slot's button height less `icon.md`: 12). The unread count's badge stays one
size (20).

**New props of the primitives:** `OListRow` `titleEnd` and `tall`; `FoldedRow` `minHeight`; `ONavbar` `rightButtons`;
`ModalCloseButton` `iconSize`; `OAvatar` `tone` (`brand`, or `neutral` for a quiet disc).

**Not applied, on purpose.** The stop card's buttons spacing (the audit was wrong: the boards match the app); the status
badge's padding (15, the mockup 12, no token between); the chat's system message's padding (10 against 8); the profile's camera
button (32 against 28); the unread count's three sizes (kept as one, 20).

## 7. The final passes (2026-11-19, later)

The final device passes on both platforms and the owner's decision on dialogs changed primitives, not the schema: **no key and
no default was added or changed** (`product.schema.json` is untouched, still 1.0.0). Every value below is an existing key or token.

**New components and modules:**

| Name | What it is | Theme |
|---|---|---|
| `ConfirmDialogHost` (`shared/ConfirmDialogHost.tsx`) | The app's own dialog for every confirmation and notice (`presentConfirm`, `useConfirm`, `useNotice`, `OAlertOriginal`): the modal's box with the title, the message and stacked buttons, the accept one first and Cancel under it; mounted once in `RootNavigator`; one at a time with a queue; a full-window overlay on iOS, a `Modal` on Android. It replaces `Alert.alert`, and `shared/OAlert.tsx` is gone | `components.modal` (box, padding, gap, radius, title), `components.button`, `tokens.color.overlay` |
| `holdLatch` (`shared/holdLatch.ts`) | Not a visual piece: `holdFinger`, `useSettledWhileHeld` and `afterRelease` keep a held button on the screen until the finger lifts | none |
| `keyboardTakesRoom` (`src/hooks/useKeyboardVisible.ts`) | The one rule of whether a keyboard takes room from the screen (Android: end height above 0 and the frame reaching the display's bottom within 48 dp; iOS: always); `useKeyboardVisible` and `useKeyboardFloating` read it | none |
| `ChipRow` (`OrdersOption/ChipRow.tsx`) | The chips of one search filter, wrapping onto lines `sm` apart | `tokens.space.sm` |
| `Chat/changeEntries.ts` (`describeChange`) | What a change of the order says in the chat's history; never "undefined", "null" or "false" | none |
| `OrdersOption/searchText.ts` (`searchTerm`, `SEARCH_ENCODES_PERCENT`) | The text of the orders search as it is sent | none |

**New props of the primitives:**

| Primitive | Prop | Used for |
|---|---|---|
| `ChoiceRow` | `listed`, `last` | a list of reasons as the boards draw it: no box, no side padding, a thin divider under each row (none under the last), content centered in the row's `choice.sizes.md.height` |
| `ChoiceMark` | (no new prop) | the radio is a drawn ring of `radio.base.size` with its dot, not the icon font's circle |
| `Tabs` | `fitFill` | tabs that fit their row are spread over its full width, otherwise the row scrolls (the login's four tabs) |
| `OListRow` | `titleMuted` | the title in `text_muted` (the profile's information rows) |
| `FoldedRow` | `roomy`, `bodyFlush` (and `minHeight` of section 6) | `md` over and under a stacked cash to collect; a body that brings its own padding (the products' lines) |

**Behaviour changed in a primitive:** `OToast` draws nothing without a message and an error toast always has a text (`apiErrorText`);
`getTraduction` decodes HTML entities; `KeyboardScreen` and `OBottomPopup`'s avoiding views are off while a keyboard that takes no room
is up; `HoldToConfirm` takes a finger at `holdLatch` when its hold completes with the finger
down (it also completed by the JavaScript clock at the release in this round; the sixth round judges the hold by the touches' own
timestamps, section 8); `ProductItemAccordion` (a 48 line, the price last, the chevron before it), the folded rows' card and the status row follow the
rules of [THEMING.md](../THEMING.md).

## 8. The sixth round (2026-11-19, later): what the three reviews' fixes changed in the primitives and shared pieces

No schema key, default or token was added or changed (`product.schema.json` is untouched, still 1.0.0), and the three catalog
keys below are texts, not theme. Rules are in [THEMING.md](../THEMING.md); this section lists the pieces.

**New modules and hooks:**

| Name | What it is |
|---|---|
| `useRefetchAfterMutation(refetch, busy?)` (`src/ui/src/hooks/useRefetchAfterMutation.ts`) | Returns `track(change)` (runs a change and counts it as in flight until it settles, resolved or thrown), `catchUp()` (loads now, or once after the change ends, once however many were asked) and `inFlight()`. `busy` is the controller's own `order.loading`. Used by `OrderDetails/Delivery` and `OrderDetailsLogistic` |
| `useReloadQueue()` (`OrdersOption/useReloadQueue.ts`) | Returns `request(list, run)` (one reload per named list at a time, the last one asked kept and run once afterwards) and `track(change)` (no reload starts while one of the driver's own changes is on its way). `RELOAD_GIVE_UP_MS` (30 000): a load that never answers is given up. Replaces `OrdersOption`'s `changesAnswered` state and effect |
| `useAnnounceOrderChange()` (`src/ui/src/hooks/useAnnounceOrderChange.ts`) | Returns a stable `announce({ orderIds, request?, accepted? })` that emits the app's event `driver_order_changed` (`ORDER_CHANGED_EVENT`) on the `useEvent` bus; `OrdersOption` listens once and reloads its lists through `useReloadQueue`. Called once per successful change by `OrderDetails/Delivery` (`sendStatusChange`, and the assign request's answer) and `OrderDetailsLogistic` (the answer and the delivery-time save); never for a failed or offline-queued change |
| `useStableCallback(callback)` (`PreviousOrders/useStableCallback.ts`) | A function that never changes and calls the latest one it was given; the list's rows get `pressOrder`, `logisticAction` and `statusText` from it |
| `groupRequestBody(status, body, location?)` (`AcceptOrRejectOrder/groupOrders.ts`) | The body the list's request takes: never a `FormData`, always with `status`, with `location: { lat, lng }` for 3, 9, 11 and 26 when a location check ran; `null` when it cannot be made |
| `touchTime(event)` (`shared/HoldToConfirm.tsx`) | The `nativeEvent.timestamp` of a touch event, or `undefined`; the hold's length is the difference of two of them |
| `useRouteKey()` (`shared/confirmAction.ts`), `focusedRouteKeys()` (`navigators/NavigationRef.tsx`) | The asking screen's own route, and the keys of the routes in front, from the root to the focused screen |

**New or changed props, parameters and contracts:**

| Where | What | Used for |
|---|---|---|
| `OAlertOriginal` | `notice` | One button ("Ok" by default, or `acceptText`) that calls `onAccept`; no Cancel. Passed by `DriverMap`, `MapView`, `OrderMessage`, `LoginForm`, `ReviewCustomer`, `OrderDetails/Delivery`, `OrderDetailsLogistic` and, for the provider's own alerts, `NoticeAlert` in `src/DeliveryApp.tsx`; never by a question (Sessions' delete, the profile photo's removal) |
| `ConfirmOptions` / `ConfirmRequest` | `routeKey` | The screen that asks, read by `useConfirm` and `OAlertOriginal` from `NavigationRouteContext`; `ConfirmDialogHost` withdraws a question (as Cancel) whose route is no longer in front |
| `HoldLayer` (`OButton`'s `holdLayer`) | `onPressIn(event)`, `onPressOut(event)`, `onTouchEnd(event, slop)`, `viewRef` | The press events carry the touch's timestamp; `onTouchEnd` releases the latch only when no finger left on the button is on it (`measureInWindow` through `viewRef`, hit slop included). Nothing outside `shared` builds a `holdLayer` |
| `AcceptSheetTarget`, `AcceptOrRejectOrderParams` | `skipsStatusImage` | "This sheet does not change the status": no photo block, no "Image is required". Set by `useLogisticDeliveryTime` |
| `useGroupStatusUpdate` | `orders` (param); `update(status, body, { dataToSave })` | The orders themselves, for what a change saved offline registers; with `dataToSave` it sends nothing and returns each order as it will be once synced. A view answered late returns `undefined` |
| `applyOffAction` (`OfflineActions`) | a change, or a list of them | Written in one go, serialised against the storage |
| `useUnreadMessagesOfOrder` | a 4th parameter, `loading` | A read that arrives while the messages load clears the ones that arrive with the load; the read mark is kept per order |
| `OBottomPopup` | `onClose` is optional | The back key and the scrim call it only when given |

**Behaviour changed in a primitive:** `ConfirmDialogHost` answers each request once (its queue is a ref of entries), cancels its pending
questions on unmount (a notice is dropped) and withdraws a question when its screen leaves the route in front; `OToast` hides on a fade
that finished only, stops its animation on cleanup and reads `hideToast` through a ref; `HoldToConfirm` judges the hold by the two
touches' timestamps, falls back to the JavaScript clock without them, clears `completed` with a 0 ms timer after the press-out and
replaces a stale latch handle on the next hold; `holdLatch.flush` runs every callback and then rethrows the first error; `Tabs` `fitFill`
measures again when the window width or the font scale changes; `OButton` takes its touch box from `themeControlHeight(theme, 'md')`
and its label limit from `TEXT_SCALE_LIMIT` (`FIT_MIN_SCALE`, 0.8, is a named constant: no theme key); `OrderItem` has no memo of its own and
`areListedOrderRowPropsEqual` compares the row kind and the handlers by identity; `PreviousOrders`'s `ordersGroupAction` is gone (the
forced-status modal uses `useGroupStatusUpdate`); `OrderDetails/Delivery` sends every status change through one wrapper, `sendStatusChange` (it also counts the sheets' changes as in flight); `hasSearchFilters` means the applied filters; `NewOrderNotification` gathers first, reports the
position on the side (`reportLocation`, 8 s) and plays the bundled `order_sound_notification` instead of a URL.

**Catalog keys added (texts, 11 locales):** `IMAGE_REQUIRES_CONNECTION` ("You need an internet connection to send the photo"),
`ARRIVED_TO_BUSINESS_FOR_ORDERS` ("Arrived to business for _count_ orders") and `PICKUP_COMPLETE_FOR_ORDERS` ("Pickup complete for
_count_ orders"). `GROUP_REQUIRES_CONNECTION` was proposed and not added: a group can be queued. `MOBILE_NO_INTERNET` is no longer used by
the accept view.

## 9. The seventh round (2026-11-20): the offline queue, its list and the off buttons

No schema key, default or token was added or changed (`product.schema.json` is untouched, still 1.0.0). The three catalog keys
below are texts, not theme. Rules are in [THEMING.md](../THEMING.md) ("The accept view and the group actions": the offline
bullets); this section lists the pieces.

**New modules and hooks:**

| Name | What it is |
|---|---|
| `useNoConnectionHint()` (`src/ui/src/hooks/useNoConnectionHint.ts`) | Returns a stable function that shows one info toast, "No connection. Try again when the network is back." (`NO_CONNECTION_TRY_LATER`), for `NO_CONNECTION_HINT_MS` (2000). One per tap, and none while the previous one is still on screen, whichever button of the screen is tapped. Used by `OrderDetails/Delivery` as the `onDisabledPress` of its bars |
| `groupLabel(t, groupId)` (`src/ui/src/utils/groupLabel.ts`, exported from `utils`) | "Group No. 57": `GROUP_NRO`, a space, the id. Used by `OrdersGroupedItem`, `OrderItem` and `AcceptOrRejectOrder` (the bar's subtitle and the sheet's line) |
| `AcceptOrRejectOrder/offlineChange.ts` | `OFFLINE_STATUS_EVENT` (`evt_off_change_order_status`); `offlineStatusChanges(ids, body)`, one change per order with its own `id`; `statusBeforeQueue(order)` (the status an order had before its first queued change); `ordersAsQueued(orders, ids, status)`; `queueStatusOffline({ applyOffAction, registerOffOrder, ids, orders, status, body })`, which queues a status change of several orders and registers each as it will be once synced, sends nothing, and returns `false` when the queue refused it. Used by the accept sheet (`offlineStatusChanges`), `useGroupStatusUpdate` (`statusBeforeQueue`) and `PreviousOrders.runGroupedStatusChange` (`queueStatusOffline`) |
| `OfflineActions/offlineActionsQueue.ts`, added | `isOrderQueued(actions, id)` (the one rule of the sync mark); `flatOrders(list)` (the orders of a stored list, a group as the list draws it included); `applyQueuedChanges(lists, actions, tabs)` (the offline list: the stored lists with the queue on top); `showQueuedStages(list, actions)` (a waiting change's stage and position kept on the card online); `bodyToSync(changes)` (the last body, with the latest delivery position of the earlier ones); `retryDelay(tries)`, `RETRY_DELAYS_MS` (15 000, 30 000, 60 000) and `RETRY_EVERY_MS` (120 000); `MAX_REFUSALS` (3); `classifyAnswer(response)` (`sent`, `transient`, `refused`, `auth`); `applyRunResults(current, runs)` (a run's results written on what the storage holds now). `getOfflineActionsAfterReplay` is no longer used by the provider; it and its tests were left |

**New or changed props, parameters, events and contracts:**

| Where | What | Used for |
|---|---|---|
| `OButton` | `onDisabledPress?(event?)` | A `disabled` button still answers the tap with this, never with `onClick`; a held button starts no hold and says no "Hold to confirm". It keeps the disabled look and `accessibilityState.disabled: true`; Pressable's `disabled` is left unset then (it overrides the accessibility state, even when `false`). A pressed look is no longer drawn on an off button. Ignored while the button is not disabled and while it is `loading` |
| `FloatingButton` (`FloatingButtonParams` in `ui/types`) | `onDisabledPress?()` | Passed to all four buttons of the bar. `OrderDetails/Delivery` gives it its `useNoConnectionHint()` to its five bars only offline with the queue off |
| `offline_order_updated` (the `useEvent` bus) | payload: the ids sent and the ids dropped | Emitted by `OfflineActionsProvider` once per sync run, after every request answered and the queue was written, and not when every change failed. `OrdersOption` listens and loads its orders again once; `OrderItem` no longer listens (its `ordersOffUpdated` state is gone) |
| `OfflineActionsContext` | `state.actions`, `state.orders` | `actions` is what `OrderItem`, `OrderDetails/Delivery` and `OrdersOption` read through `isOrderQueued`; `orders` (the stored lists kept for the offline list) is reset to `null` when the connection returns. `registerOffOrder` and `applyOffAction` are serialised |
| A queued change | `attempts`, `told` | `attempts`: the API's refusals of the order's last queued change; `told`: the earlier change was posted as a chat message. Both are stored with the queue |
| `AcceptOrRejectOrder` | `dataToSave` carries `delivery_position` | The offline copy of an accepted order shows its "Delivery #N" |
| `OrdersOption` | the banner; testID `orders-sync-pending` | The count alone in an `info` notice while the queue holds a change and the screen is online (or offline with no last-update date); the offline danger notice is as before |

**Behaviour changed:** `OfflineActionsProvider` syncs one run at a time and retries (15 s, 30 s, 1 min, then every 2 min; on the
connection coming back; on the app returning to the foreground through `AppState`), tells a refusal with an error toast and drops a
change after the third refusal; `OrderItem`'s mark and the details' "Pending sync changes" read the queue; `OrdersOption` guards
every reload while offline (`reloadOrders`, `reloadRequests`, `handleLoadMore`, the pull to refresh) and ignores the controller's
`loading` flags offline; `PreviousOrders.confirmGroupChange` queues a group's change offline.

**Catalog keys added (texts, 11 locales):** `NO_CONNECTION_TRY_LATER` ("No connection. Try again when the network is back."),
`OFFLINE_CHANGE_NOT_SYNCED` ("The change to order No. _order_ could not be sent: _message_") and `OFFLINE_CHANGE_DISCARDED`
("The change to order No. _order_ was not applied: _message_"). `LIST_AND_N_MORE` ("_list_ and _count_ more") was already there.
**Corrected:** 19 texts of three `DISABLED_*` keys: `DISABLED_BUSINESS` (es, fr, da, nl, de, pt, ar, el, bg, tr), `DISABLED_CATEGORY` (it, de, ar, el, bg, tr) and
`DISABLED_PRODUCT` (el, bg, tr), which read "disabled person" for "deactivated", and `NUMBER_CHANGES_PENDING_SYNC` in fr, it, de and tr
(a verb form for "changes"). The English is untouched. `INVOICE_GROUP_NO` is no longer read by the app's code (`OrderItem` used it for
the group's line, with no space; it uses `GROUP_NRO` through `groupLabel` now); it is still in the catalog.

## 10. The eighth round (2026-11-20, later): the order card and the require cycles

**The layout described here (the status chip row, the time column at the header's right, `OrderStatusRow`, `statusRow`, `timeWord`, the position slot and button) was superseded on 2026-11-23: read section 11 for the card as it is**; the rules and the pieces that did not change (the quick actions, the footer, the settings, the list, the offline switch) stand. The owner's decision of the day, the card redrawn as the business app's "D1b" adapted to the driver, is in [decisions.md](decisions.md);
its rules are in [THEMING.md](../THEMING.md) ("The order card"); this section lists the pieces. `product.schema.json` stays at
version 1.0.0 (nothing is published); the compiled theme, `theme-readers.json` and the catalog were regenerated. The card was seen on
a device in two passes of its first build, and what they found was fixed in Jest only ([verification.md](verification.md) §16).

**Schema keys added (7, and the editor's prop label of the last one):**

| Key | Default | Used for |
|---|---|---|
| `visibility.orders.quick_actions` | on | the quick actions of the order card and the Accept / Reject of an assign request; label "Quick actions on the order card" |
| `visibility.orders.absolute_time` | off | the clock time beside an open order's remaining time ("left · due 12:53 PM"); label "Clock time on the order card" |
| `components.badge.variants.success_soft` | `{color.success_subtle}` fill, `{color.success_text}` ink (**the ink became the literal `#00713F` in round 10**, section 12) | "Paid" |
| `components.badge.variants.warning_soft` | `{color.warning_subtle}` fill, `{color.warning_text}` ink (**the ink became the literal `#6B5300` in round 10**) | "Collect in cash" |
| `components.order_card.slots.advance` | button `md`, `solid`, `success` | the positive quick action (accept, the next step) and an assign request's Accept; label "Accept and next step" |
| `components.order_card.slots.decline` | button `md`, `outline`, `danger` | the negative quick action (reject, a failure) and an assign request's Reject; label "Decline (secondary)" |
| `components.order_card.base.title_text` | 16 / 1.4 / 600 | the strong line "#number · customer" (no existing role had this value: `name` is 14 / 600); `editor.props.title_text`, "Title style" |

The two `orders.*` keys are also in the editor's Layout section, in its `orders` group right after `visibility.orders.review_order_button`
(editor group `orders`, orders 12 and 13).

**Schema key removed (1):** `components.order_card.base.timer_icon_size` and its `editor.props.timer_icon_size` (label
`BUILDER_THEME_PROP_TIMER_ICON_SIZE`): the clock glyph is gone and nothing read them. `theme-readers.json` gained two entries
(`list_row.base.trailing_icon_size`, `input.base.trailing_icon_size`): their only literal reader was the chevron removed from the
request card; the real readers are `OListRow`, `ProfileRow` and `OSelect`.

**Components and modules (`src/ui/src/components/PreviousOrders/` unless said):**

| Name | What it is |
|---|---|
| `OrderCardParts.tsx` | `OrderCardHeader` (logo, store name over the title, the marks, the time column), `OrderCardStop` (the stop's glyph, the address that shrinks, the distance that does not), `OrderStatusRow` (the status chip beside the total), `OrderChips` (the position or type, the payment, the items) |
| `OrderCardActions.tsx` | The quick actions: `decline` and `advance` as `OButton`s of the two slots, `hold` on a step that fires by itself, one change per order, offline queue and offline hint |
| `cardActions.ts` | `cardActionsFor` (which actions the order's stage has, by the conditions of the bottom bar), `STATUS_OF_STEP`, `VIEW_OF_ACTION`, the types `CardActionKey` and `CardActions` |
| `orderCardData.ts` | `itemsCount`, `itemsText` ("3 items"), `paymentChip` ("collect", "paid" or nothing; `card_delivery` is neither) |
| `orderCardTime.ts` | `openOrderTime`, `closedOrderTime`, `formatCardDuration`, `orderDue`, `delayMinutes`, the type `CardTime` |
| `orderCardPieces.ts` | Changed: `timer` (open tabs, enterprise plan), the new `closedTime` (the completed and cancelled tabs, `CLOSED_TABS` exported) and `position` |
| `hooks/useListDriverPosition.ts` | The list's driver position (see THEMING.md): returns `{ position, refresh }`; `resetListDriverPosition` for tests |
| `utils/formats.ts` | Added `formatClockTime(moment, utils)` |
| `OrderDetails/focus/useStopDistance.ts` | Added `distanceFromDriver(location)` (the distance alone); `fromDriver` is built on it |
| `jest/helpers/uiModuleMocks.js` | `pickUi(fixture, names)` and the per-module mocks of the cycles round; tests under `src/ui` import it first |
| `scripts/check-cycles.mjs` | `pnpm lint:cycles`: the require-cycle check (CI step "No require cycles") |

**New or changed props and contracts:**

| Where | What | Used for |
|---|---|---|
| `OCard` | `footer` | The card's own buttons, inside its box and outside its `Pressable` (the card keeps the box's padding as its touch margin on top and sides). `testID` of the pressable: `<testID>-press` |
| `OBadge` | `wrap`; variants `success_soft`, `warning_soft` | A status chip that takes as many lines as it needs, never wider than the room it is given; the two soft variants |
| `OrderItem` props | `driverPosition`, `onOfflineTap`, `openAcceptSheet`, `handleChangeOrderStatus`, `onNavigationRedirect`, `activeOrdersCount` | The card draws and runs its own quick actions; the list passes the position and the one hint |
| `areListedOrderRowPropsEqual` | compares the card's fields (the driver's stage, total, payment, items, the stops' places, the position by value) | A row is redrawn when what the card writes changed; `loadingChangeOrder` only for an assign request |
| `OfflineActionsProvider` | follows the loaded config (`projectSavesChangesOffline`) and keeps the boolean in the storage key `allow_save_changes_offline` | The offline switch; `OrdersOption` no longer sets it |
| `OrdersOption` | `useSettledWhileHeld` on the orders list; `hasRows` | The list shows what it showed while a finger is on a held button; the rows stay while a list reloads |
| `OrderListItemSkeleton` / `OrderListSkeleton` | `showTimer` is also on for the closed tabs (`closedTime`); the bones follow the card's blocks | The skeleton stands for the new card; it draws no quick actions |

**Removed:** the clock glyph and the card's tint (`tint_*` styles), the status-and-type badges row with the timer at its end, the
chevron of the request card, and the card's own `Pressable` around its buttons.

**Catalog keys added (texts, 11 locales, filled and applied):** `CARD_TIME_LEFT` ("left"), `CARD_TIME_LATE` ("late"), `CARD_TIME_DUE`
("due :time:"), `PAID` ("Paid") with the build, and `TIME_DAY` ("d"; "j", "g", "T", … by locale) with the fixes. **Reused:**
`COLLECT_IN_CASH`, `ORDER_ITEMS_COUNT` and `_ONE`, `DELIVERY_NUMBER`, `TODAY`, `YESTERDAY`, `TIME_MIN`, `TIME_HOUR`, `PICK_UP_AT`,
`DELIVER_TO`, `DELIVERY_POSITION` and the action keys. **Text changed:** the English of `DELIVERY_FAILED` is "Delivery failed" (it was
"Delivery Failed"), with every `t()` fallback and the test helper that matched it; `DELIVERY_FAILED_BY_DRIVER` and the other
locales are untouched. No native speaker has read the new strings.

## 11. The ninth round (2026-11-23): the status band, the order types' colours, the tabs, the tests' limits

The owner changed the card to the business app's "D3", the status band, keeping the order types' colours and the absolute time
([decisions.md](decisions.md), rows of 2026-11-23); the rules are in [THEMING.md](../THEMING.md) ("The order card", "Three tabs or four is
decided before the tabs are painted"); this section lists the pieces. `product.schema.json` stays at 1.0.0 (nothing is published; the
compiled theme was regenerated). **The catalog did not change** (no key added or removed; the band reuses `CARD_TIME_LEFT`,
`CARD_TIME_LATE`, `CARD_TIME_DUE`, `TODAY` and `YESTERDAY`).

**Schema keys added (5, all `components.badge.variants`, with their labels):**

| Key | Default (fill, ink) | Label key and English | Used for |
|---|---|---|---|
| `primary_soft` | `{color.primary_subtle}`, `{color.primary_pressed}`; order 9 | `BUILDER_THEME_VARIANT_PRIMARY_SOFT` "Primary, soft" | the band's tone on time, or with no time |
| `danger_soft` | `{color.danger_subtle}`, `{color.danger_text}` (**ink the literal `#C42543` since round 10**); order 10 | `BUILDER_THEME_VARIANT_DANGER_SOFT` "Error, soft" | the band's tone late, cancelled, rejected or failed |
| `type_delivery` | `#D9CCFA`, `#3F1E96`; order 11 | `BUILDER_THEME_VARIANT_TYPE_DELIVERY` "Order type: delivery, with a driver" | types 1 and 7 |
| `type_pickup` | `#B9E4E8`, `#0A4E55`; order 12 | `BUILDER_THEME_VARIANT_TYPE_PICKUP` "Order type: pickup, the customer collects" | types 2, 4, 5 and 8 |
| `type_in_store` | `#FAD4B4`, `#7A3505`; order 13 | `BUILDER_THEME_VARIANT_TYPE_IN_STORE` "Order type: in the store" | types 3 and 9 |

The three type variants have the business app's values, orders and labels **without its `dot` colour** (the driver's `OBadge` has no
dot, and `theme:keys` would flag an unread key). The two soft variants have the business app's `primary_soft` values; the existing
`warning_soft` and `success_soft` (eighth round) are the band's other two tones.

**Schema key removed (1):** `components.order_card.slots.position` (label `BUILDER_THEME_SLOT_POSITION`): the pill is a badge in the type's
colour and nothing read the slot. **Kept:** `order_card.base.time_text` (12 / 1.5 / 600), now read by the band and by the Messages row's
timer; `title_text`; `total_text` (a payout's amount). No `order_card` key was added.

**New modules and hooks:**

| Name | What it is |
|---|---|
| `PreviousOrders/orderCardBand.ts` | `bandTone({ closed, status, time })` and `bandVariant(tone)`: the band's tone (`primary`, `warning`, `danger`, `success`) and the badge variant that paints it |
| `shared/orderTypeVariant.ts` | `orderTypeVariant(delivery_type)`: `type_delivery`, `type_pickup`, `type_in_store` or `neutral` |
| `OrdersOption/useCombinedTabs.ts` | `useCombinedTabs()` returns `{ combined, pending }`: the loaded config, else the kept value, else pending |
| `context/OfflineActions` | `projectCombinesTabs(configState)`; state `isCombinedTabs` (`boolean` or `null`) and `combinedTabsRead`; the provider writes the storage key `combine_pending_and_progress_orders` |

**Changed pieces:**

| Where | What |
|---|---|
| `OrderCardParts.tsx` | `OrderStatusBand` replaces `OrderStatusRow`; `OrderCardHeader` takes `total` and no longer `time`; `OrderChips` unchanged |
| `PreviousOrders/styles.tsx` | `band`, `bandText`, `bandStatus`, `bandTime`, `bandTimeBone`; `total` in the header; `time`, `timeWord`, `statusRow` and `statusSlot` gone; `bandToneStyles(theme, tone)` |
| `orderCardTime.ts` | `CardTime` is `{ text, state }` (it was `{ figure, word, state }`); `openOrderTime` writes "24 min left", "12 min late" (no "+") and " · due 1:05 PM"; `closedOrderTime` writes "12:53 PM · today"; `NO_BREAK` is U+00A0 |
| `OBadge` | variants `primary_soft`, `danger_soft`, `type_delivery`, `type_pickup`, `type_in_store`; props `onPress`, `disabled`, `accessibilityLabel` (a pressable badge; hit slop vertically to a control's height; pressed and disabled opacities); `wrap` unchanged |
| `OrderItem` | the band, the total in the header, the type chip and "Delivery #N" in `orderTypeVariant`'s variant, the pill disabled at status 23 |
| `OrderDetails/OrderHeaderComponent.tsx` | "Delivery #N" in the type's variant (`testID` `order-details-position`), it was `primary` |
| `OrderListItemSkeleton` | a band (status bone, time bone) and a total bone in the header; no status row |
| `OrdersOption` | the wrapper takes `combineTabs` and `tabsPending` from `useCombinedTabs`; the tab bar is a bone (`orders-tabs-pending`) and the list the skeleton while pending; it no longer reads or writes the stored value; the online start no longer removes it; `OrdersOptionParams` has `tabsPending` |
| `OfflineActionsProvider` | `isCombinedTabs` starts `null` (or the config's value), `combinedTabsRead` |
| `jest.config.js`, `jest/setupAfterEnv.js` | `testTimeout: 15000`, `configure({ asyncUtilTimeout: 5000 })` |
| `jest/helpers/d3OrdersUiMock.js` | `combinedTabsRead: true` in the mocked provider state |

**Removed:** `OrderStatusRow`, the time column and its styles, the status chip's use of `OBadge wrap` on the card (the prop stays), the
position's `OButton` (and `positionSlot`).

## 12. Rounds 10 to 12 (2026-11-23): the tabs, the minutes, the route, the connection sheet, the switch and the sockets

What was built after the status band, as the rules in [THEMING.md](../THEMING.md) (the sections named there) and the owner's decisions in
[decisions.md](decisions.md) (the rows of 2026-11-20 to 2026-11-23). `product.schema.json` stays at 1.0.0 (nothing is published).

**Round 10 and 11: the tabs and the card's fixes.** The Orders tabs are Assigned · In Progress · History (Active · History when the project
combines them) with the chips All · Completed · Cancelled; the selected tab is the screen's own state; the tab bar is as wide as the labels
(`Tabs` `noWrap`); the lists' loads are bounded and held while the queue syncs; the newest copy of an order wins. ("The Orders tabs" and "The
lists' loads are bounded" in THEMING.md.)

| Where | What |
|---|---|
| `OrdersOption/orderTabs.ts` | Pure rules: classification by status, split, History merge and sort (`endedAtMs`, a copy of the card's rule), the newest copy wins (`splitOrders`), grouping, `viewForStatus`, `isNetworkFailure`, `withoutApi` |
| `OrdersOption/useOrderTabs.ts` | The selection and the loading sequence: `LOAD_LIMIT_MS` (20 s), `RECONNECT_SETTLE_MS` (1.5 s), `CATCH_UP_COALESCE_MS` (10 s), `holdLoads`, `holdRows`, `knownRows()`, `controllerLoads` |
| `OrdersOption/ChipRow.tsx`, `styles.tsx` | `ChipRow` takes `accessibilityRole` and `accessibilityLabel`; `tabsBlock` and `chips`; `MAX_TABS_SHARING_ROW` is gone (at most three tabs) |
| `shared/Tabs.tsx` | `noWrap`: one line per label, on the hidden semibold copy too |
| `context/OfflineActions` | `syncing` (true while a run has queued changes out, still true when `offline_order_updated` is emitted); `SYNC_REQUEST_LIMIT_MS` (30 s); `getStatusById` lists 22 to 26 as the controller does |
| `shared/OCard.tsx` | the gap above the footer is the pressable's `paddingBottom` |
| `shared/OrderListItemSkeleton.tsx`, `OrderListSkeleton.tsx` | the band on the neutral badge tint, the buttons bone, the badge-tall lead bone, `closed` |
| `PreviousOrders/OrderCardParts.tsx`, `OrderCardActions.tsx`, `styles.tsx` | the distance text carries its own "· "; the quick actions' styles are `orderActionsStyles` |
| `OrderDetails/focus/StatusRow.tsx` | "Delivery #N" in the order type's variant (the screen the devices show; `OrderHeaderComponent.tsx` is the assign request's) |
| `product.schema.json` | `badge.variants.success_soft`, `warning_soft` and `danger_soft` take the literal inks `#00713F`, `#6B5300` and `#C42543` (4.5 or more on their tints: 5.68, 6.66, 5.03) |

**Round 11: the delivery time in minutes.** No schema change (`order_request.base.time_color` is read now by `DeliveryTime.tsx`).

| Name | What it is |
|---|---|
| `shared/MinutesValue.tsx` | the figure, the field, the reserved line under it; the handle `flush()` and `isEditing()`; `digitsOnly`, `minutesLineHeight(theme)` |
| `AcceptOrRejectOrder/DeliveryTime.tsx`, `deliveryTimeRules.ts` | the block (label, chips 10 · 15 · 20 · 30 · 45, minus / figure / plus) and `DELIVERY_TIME` (presets, step 5, 5 to 180, default 20), `clampMinutes`, `stepMinutes` |
| `shared/OBottomPopup.tsx` | `onBackdropPress` (default `onClose`) and `onBlankPress` (the `sheet-bottom-space` view claims the touch) |
| `AcceptOrRejectOrder/index.tsx` | `endTyping()` (what Done does, then `Keyboard.dismiss()`); `flush()` before the primary action and before the position stepper |

Removed: the hidden `TextInput`, `timerRef`, `openTimeKeyboard`, `handleTime`, `handleFixTime`, `openTimerIOnput`, `renderTimeInput`, the two
focus-on-entering effects, `twoDigits`, the hours / minutes state and the styles `dialUnit`, `digit`, `pressed`, `hidden`, `timeBlock` and
`sheetDial`. Catalog keys added (11 locales): `DELIVERY_TIME_PRESETS`, `DELIVERY_TIME_TAP_TO_TYPE`, `DELIVERY_TIME_FIELD`, `MINUTES_TYPE_HINT`,
`MINUTES_RANGE_ERROR`, `MINUTES_LESS`, `MINUTES_MORE`; `DELIVERY_TIME` and `TIME_MIN` are reused; `HOURS` no longer has a reader (the key stays).
Known: `MINUTES` reads as meeting minutes in da, nl and el and `DELIVERY_TIME` as a time of day in eight locales (es, fr, it, pt, da, tr, el, bg)
under a duration; they were not changed.

**Round 12: Messages rows, the switch, the sheet's typing, the lists, the route, the connection sheet and the sockets.**

Schema keys added (the version stays 1.0.0; `src/theme.compiled.json` regenerated):

| Key | Default | Used for |
|---|---|---|
| `components.switch.base.track_width`, `track_height`, `thumb_size`, `hit_width` | 44, 24, 20, 52 (ranges 36 to 64, 16 to 40, 12 to 36, 44 to 80, step 1, px) | `OSwitch`; the editor labels are derived from the key names, the schema names no label key for them. `theme-readers.json` no longer carries the `switch.base.thumb` record (the reader is found by text) |
| `visibility.orders.route` | `true` (editor group `orders`, order 14) | the Route button and the two screens; label `BUILDER_THEME_VIS_ITEM_ORDERS_ROUTE` "Route button on the orders list" |
| `components.map_marker.base.stop_size`, `stop_next_size` | 28, 36 | the stop discs of the route |
| `components.map_marker.base.line_color`, `line_width`, `line_next_width`, `line_dash`, `line_gap` | `{color.primary}`, 3, 4, 2, 8 | the route's dashed lines (the driver's leg is the `line_next_width`) |
| `components.badge.base.dot_size`, `dot_gap` | 8 (4 to 16), `{space.xs}` (scale space) | `OBadge` `dot` |
| `components.badge.variants.success_soft`, `warning_soft`, `primary_soft`, `danger_soft` `.dot` | `{color.success}`, `{color.warning}`, `{color.primary}`, `{color.danger}` | the dot of each soft variant; the three `type_*` variants have none and fall back to their ink |
| `components.icon_tile` (`base.radius` `{radius.sm}`, `sizes.lg.size` 44, range 24 to 120) | group `controls`, order 28 | the connection sheet's tinted tile; a subset of the business app's node (its `md`, `xl`, `variants` and `shapes.round` are not added: nothing reads them) |

The editor's labels for the new keys are in [editor-labels.md](editor-labels.md) (the Dashboard's pull request #574 holds them). `visibility.orders.route`
is also in the `orders` group's `paths` of the editor sections (`theme:validate` fails with `in_no_editor_group` without it).

| Where | What |
|---|---|
| `utils/orderTitle.ts` (exported from `utils/index.tsx`) | `ORDER_TITLE_SEPARATOR`, `orderNumberTag`, `joinTitle`: the order card's header and the Messages row title use them |
| `PreviousMessages/index.tsx` | the row is "#number · store" (`message-title`), the date alone on the second line, an `accessibilityLabel` |
| `shared/OSwitch.tsx` | rewritten: a `Pressable` with the role `switch`, the track, the thumb and the hit box drawn by the app |
| `ios/ODelivery.xcodeproj/project.pbxproj` | `PRODUCT_MODULE_NAME = ODelivery;` on the app target, in both configurations: `RCTDriverLocation.mm` imports `ODelivery-Swift.h`, and a Builder that sets `PRODUCT_NAME` to a brand's name would otherwise change the module's name and break the import (checked with `xcodebuild -showBuildSettings` with `PRODUCT_NAME="Acme Driver"`: it printed `Acme_Driver` before, `ODelivery` after; the header's own name was not printed, so only the module name is confirmed) |
| `shared/MinutesValue.tsx` | the reserved line under the field: one clipped row of two cells |
| `OrdersOption/useOrderTabs.ts`, `OrdersOption/index.tsx`, `orderTabs.ts` | a failed load keeps its rows, the single reload on reconnect, the 10 s window shared by the two reconnect signals, one request per list, `emptyText` per tab |
| `OrdersRoute/**` (22 files, 9 test files and a fixtures module), `pages/OrdersRoute.tsx`, `pages/OrdersRouteStops.tsx`, `ui/index.tsx` | the route (THEMING.md, "The route"); two stack screens in `HomeNavigator`, registered only when `orders.route` is on; one import and one line in `OrdersOption` |
| `WebsocketStatus/index.tsx`, `connectionState.ts`, `connectionStore.ts`, `ConnectionHost` | the pill and the sheet; `connectionState.ts` and `connectionStore.ts` are the business app's, copied with one comment word changed |
| `shared/OBadge.tsx` | `dot` |
| `utils/formats.ts` | `formatClockTime` also takes a `Date` |
| `navigators/HomeNavigator.tsx` | mounts `ConnectionHost` next to the new-order alert; the rooms effect joins once and leaves in its cleanup; `useNetInfo` is gone from the file |
| `context/SocketReconnectContext.tsx` | `handleConnectError`: a failed attempt counts as down |
| `pages/Profile.tsx` | the user is refreshed on the entry to the tab, not on every `state` event while it is focused |

**Catalog keys.** Added in round 12 (11 locales, no native speaker has read them): `NO_ORDERS_IN_PROGRESS`, `NO_ACTIVE_ORDERS`; the 28 of the route
(`ROUTE`, `NAVIGATE`, `ROUTE_STOPS_COUNT`, `ROUTE_STOPS_COUNT_ONE`, `ROUTE_ABOUT_STRAIGHT`, `ROUTE_ORDERS_IN_PROGRESS`, `ROUTE_ORDERS_IN_PROGRESS_ONE`,
`ROUTE_SEE_ALL_STOPS`, `ROUTE_STRAIGHT_LINE`, `ROUTE_NO_LOCATION`, `ROUTE_HELPER`, `ROUTE_STOPS_NOTE`, `ROUTE_NEXT_STOP_PICKUP`, `ROUTE_NEXT_STOP_DELIVER`,
`ROUTE_COLLECT_AMOUNT`, `ROUTE_OPEN_IN_MAPS`, `ROUTE_SHEET_INFO`, `ROUTE_GOOGLE_WHOLE`, `ROUTE_ALL_STOPS`, `ROUTE_FIRST_STOPS`, `ROUTE_GOOGLE_NEXT`,
`ROUTE_WAZE_NEXT`, `ROUTE_APPLE_NEXT`, `ROUTE_WAZE_ONE_AT_A_TIME`, `ROUTE_SHEET_NOTE`, `ROUTE_STOP_OF`, `ROUTE_STOP_ORDER_ONE`, `ROUTE_STOP_ORDER_MANY`); the
14 of the connection sheet taken from the business app's catalog (`LIVE`, `RECONNECTING`, `OFFLINE`, `CONNECTION`, `CONNECTION_LIVE_DESCRIPTION`,
`CONNECTION_RECONNECTING_DESCRIPTION`, `CONNECTION_OFFLINE_DESCRIPTION`, `CONNECTION_SERVER`, `CONNECTION_NOTIFICATIONS`, `CONNECTION_NOTIFICATIONS_ON`,
`CONNECTION_NOTIFICATIONS_OFF`, `RECONNECT_NOW`, `CONNECTION_CHECK_NETWORK`, `CONNECTED`). **Removed (5):** `CONNECTION_STATUS`, `CONNECTION_STATUS_SHORT`,
`WEBSOCKET_OK`, `WEBSOCKET_CONNECTING`, `WEBSOCKET_DISCONNECTED`, which only the old dialog read (the catalog's own policy keeps orphans: the owner may want
them back); `OK`, `UPDATE`, `LAST_UPDATE`, `CONNECTING` and `DISCONNECTED` stay because something else reads them. Round 10 added `ASSIGNED`, `HISTORY`,
`NO_ORDERS_ASSIGNED`, `NO_ORDERS_IN_HISTORY`, `NO_COMPLETED_ORDERS` and `NO_CANCELLED_ORDERS`.

**Upstream, not in this repository:** the three pull requests of `Finitless-com/ordering-components` (#431, #432 and #433 merged, with #434, the CI runner, and #426, the additive `handleRemovePhoto`, on 2026-11-23; the pointer is committed at `425587a`: THEMING.md, "Real time"), and
the Dashboard's labels (#574).

## 13. Round 13 (2026-11-23, evening): pass 12's fixes

The rules are in [THEMING.md](../THEMING.md) (the sections named there) and the owner's decisions and the calls in [decisions.md](decisions.md), 2026-11-23. The schema stays 1.0.0.

| Where | What |
|---|---|
| `product.schema.json` | **Added:** `components.badge.base.dot_max_width` (140, 80 to 320, step 1, px, editor order 5; label `BUILDER_THEME_PROP_DOT_MAX_WIDTH` "Status pill: maximum width") and `components.map_marker.base.line_next_color` (`{color.primary_pressed}`, editor order 19; `BUILDER_THEME_PROP_LINE_NEXT_COLOR` "Route line: color to the next stop"). **Changed:** `map_marker.base.line_dash` 2 to 12 (range 1 to 16 became 4 to 32), `line_gap` stays 8 (range 2 to 24 became 4 to 24), `line_next_width` 4 to 5 |
| `WebsocketStatus/index.tsx`, `shared/OBadge.tsx`, `shared/ONavbar.tsx` | The hidden sizer is gone; `OBadge` with `dot` takes `maxWidth` from `dot_max_width`; the pill keeps `minHeight` and `minWidth` 44; `ONavbar` has `titleFirst` (set by the Orders header only) |
| `OrdersRoute/routeLineDash.ts` (new, with its test), `OrdersRoute/RouteMap.tsx`, `RoutePanel.tsx` | `metersPerPoint`, `settledScale`, `routeDashPattern` (iOS meters, Android points, no `lineCap`); the next leg's colour; `NEXT_STOP_LINES` (2) |
| `UserProfileForm/index.tsx` | the switch stays in place and disabled while loading; the toast from the controller's state; `isAvailable` falls back to the session's `user.available` |
| `PreviousOrders/orderCardPieces.ts`, `shared/OrderListItemSkeleton.tsx`, `OrderListSkeleton.tsx`, `OrdersOption/index.tsx` | the `setter` piece and `showSetter` |
| `shared/Tabs.tsx` | `key={signature}` on the row's `ScrollView` |
| `OrdersOption/index.tsx` | the requests tab's empty text, `NO_ASSIGN_REQUESTS` |
| `android/gradle.properties` | `reactNativeArchitectures=armeabi-v7a,arm64-v8a` |
| `i18n/translations.json` (and the generated files) | `NO_ASSIGN_REQUESTS` (11 locales, each worded on that locale's `ASSIGN_REQUESTS`) and `CART_REFRESH_RESPONSE_ERROR` |

## 14. Round 14 (2026-11-23, later): pass 14's findings

The rules are in [THEMING.md](../THEMING.md) ("The order card", "The route") and the calls in [decisions.md](decisions.md), 2026-11-23. The schema and the catalog did not change.

| Where | What |
|---|---|
| `OrdersRoute/routeLineDash.ts` | `fittedRegion(frame)` and `distinctPoints(points)` (Web Mercator; a single place gives the single-point region `SINGLE_POINT_DELTA` of `RouteMap.tsx`), beside `metersPerPoint`, `settledScale` and `routeDashPattern` |
| `OrdersRoute/RouteMap.tsx` | `fit()` computes the region, sets the dash scale and the zoom buttons' region, and uses `animateToRegion` for one distinct place; the scale derives from the shown region and the map's height; `onLayout` records width and height and runs the fit again while the driver has not touched the map; **since `2acd15e` the app's own moves set the scale from the region they ask for, one read of `getMapBoundaries()` confirms it after `settleDelay` (`routeLineDash.ts`: `SETTLE_ANIMATION_MS` 1000, `SETTLE_MARGIN_MS` 250), a map report is only a reason to read (ignored while a programmatic move is in flight) and late answers are ignored by ticket**; `testID='route-map-frame'` |
| `PreviousOrders/orderCardTime.ts`, `OrdersRoute/useRouteFormat.ts`, `OrdersRoute/OrdersRouteStops.tsx`, `PreviousOrders/OrderItem.tsx` | `showsClockTime(theme)`; the route's time through `openOrderTime` with it; the late chip `wrap` |
| `PreviousOrders/orderCardPieces.ts` | `SETTER_TABS = ['pending', 'active']` |
| `shared/OrderListSkeleton.tsx`, `shared/SkeletonBone.tsx`, `OrdersOption/index.tsx` | `routeEntry` (a first bone of `button.sizes.md.height` and `button.base.radius`, with the list's `md` gap); `SkeletonBone` takes an optional `testID` |
| `OrdersRoute/routeEntryLook.ts` (new), `OrdersRoute/OrdersRouteEntry.tsx` | `ROUTE_ENTRY_SIZE` (`'md'`) and `ROUTE_ENTRY_APPEARANCE` (`'outline'`), read by the button and by the skeleton |
