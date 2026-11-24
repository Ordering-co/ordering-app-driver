# Theming rules

How UI code in this app gets its look from the theme: stay inside the theme's tokens,
reuse what exists, and know when (and where) to add something new. Read this before
touching any style (styled components, `StyleSheet`, inline styles, style props), any
primitive in `src/ui/src/components/shared` or `product.schema.json`.

The schema format and its versioning rules are documented by the theme engine
(`@orderingco/ordering-theme-engine`, the version pinned in `package.json`), in
`node_modules/@orderingco/ordering-theme-engine/docs/`. This page is about how this app
uses it. The owner's decisions are in [theme/decisions.md](theme/decisions.md): a decision
there stays decided. The design behind the values is in `docs/theme/`: [tokens.md](theme/tokens.md), [components.md](theme/components.md),
[pages-and-visibility.md](theme/pages-and-visibility.md), [harmony.md](theme/harmony.md), [editor-labels.md](theme/editor-labels.md) and, for the keys read
through a variable, [readers.md](theme/readers.md); what was seen on devices is in [theme/verification.md](theme/verification.md).

<a id="design-rules"></a>
## Design rules: usability first

Two rules of the same rank come before every technical rule of this page (the owner, 2026-11-23: [theme/decisions.md](theme/decisions.md), the row "Usability first"):

1. **Usability comes before everything else: this app is used by a driver.** A driver is on the move, often one-handed, outdoors, glancing at the screen between stops, under time pressure and sometimes with a poor connection. A screen is judged by what a driver can see and do in a glance, with a thumb and with the sun on the glass, not by how elegant or how uniform it is.
2. **The theme commands every style.** No visual value lives in a component: colour, space, radius, border, shadow, typography, sizes, opacity, motion, images, and what a screen shows, hides or orders all come from the schema through the helpers, so that the editor changes them without a new build. The rules that enforce it are the technical ones below (§1, §8) and three checks: `pnpm theme:guard` (no design literal, no baseline: every file must pass), `pnpm theme:keys` (every schema key has a reader) and `pnpm theme:extremes` (extreme themes reach what the app paints); [§6](#6-adding-to-the-schema) lists what each one catches.

**How the two live together.** The theme may restyle everything, and usability is protected by what the schema allows (ranges and minimums the editor and the engine clamp to) and by the behaviours that are not themeable at all (they have no key). A rule of usability is never implemented as a literal that bypasses the theme, and a theme value must never be allowed to break a rule of usability: where the schema does not yet guarantee one, it is said below, in "What protects the rules", not hidden.

**The rules that follow.** Each is short and checkable and says where the app already applies it. *Owner* means a decision of the owner in the log (with its date); *Practice* means what the code does and the tests pin, not a recorded decision.

| # | Rule | Where it is applied | Kind |
|---|---|---|---|
| U1 | **The next thing the driver must do is the most visible element.** The order card leads with its status band and offers the one positive step across the card's width (accept, arrived, pick-up, delivery); every status step of the details is a button of the bottom bar; the route draws the next stop solid and larger and its leg thicker | "The order card" below; `order_card.slots.advance`, `components.bottom_bar`; `map_marker.base.stop_next_size`, `line_next_width`, `line_next_color`; the route's next-stop panel | Owner: 2026-11-18 ("The order's status steps": "the order's next step is always in reach"), 2026-11-20 and 2026-11-23 (the order card), 2026-11-23 (the route) |
| U2 | **The main action is within the thumb's reach and the keyboard never hides it.** It is pinned in the bottom bar; a sheet with a field ends where a pinned bar does | `FloatingButton` and `components.bottom_bar`; "The keyboard and the forms" below | Owner: 2026-11-18 ("Access": the main action pinned in the bottom bar), 2026-11-19 (the accept sheet's gap over the keyboard) |
| U3 | **State is never told by colour alone.** The band says its status and its time in words on a tint; the connection pill is a dot and a word (Live, Reconnecting, Offline); the order type is told by its word as well as its colour; a disabled button that matters says why when tapped | `orderCardBand.ts`, `OBadge` `dot`, `orderTypeVariant`, `onDisabledPress`; the band's three state inks are measured at 4.5:1 or more against their tints by `orderCardBand.test.ts` | Owner: 2026-11-23 (the connection pill names the state); Practice for the rest |
| U4 | **A touch target is at least a `md` control (44 by default), and a state never moves or resizes its control.** A glyph smaller than that reaches the target through `hitSlop`; the border's room is reserved in every state and a label that turns bold keeps its bold width; the delivery time's minus and plus never move, whatever the message under the field says | `themeControlHeight`, `reservedBorder`, `StableText`, `MinutesValue`; the pass 12 measurements (minus and plus 690 px under the panel's top before and after) | Owner: 2026-11-13 (control heights 32 / 44 / 50 / 60), 2026-11-18 (the map's buttons are 32 with 44 targets), 2026-11-23 (the stepper never moves) |
| U5 | **An irreversible step is guarded, and accepting is never guarded.** Arrived, pick-up, delivery and rejecting a request are held for 0.6 s; log out, deleting a session and a group's step are confirmed; accepting is one direct tap, because the time is valuable there | "Guarded actions" below; `HOLD_MS`, `FloatingButton` `*Hold`, `useConfirm` | Owner: 2026-11-18 ("Dangerous actions are guarded") |
| U6 | **As little typing as possible.** The delivery time is five quick choices and a stepper before it is a field, and the field opens a numbers keyboard; the delivery position is a stepper; a code is cells; a reason is a list; the chat has quick messages | `DeliveryTime.tsx`, `MinutesValue`, `OStepper`, `OOtpInput`, `messages.quick_messages` | Owner: 2026-11-23 (the minutes), 2026-11-13 (D6, the code entry; the quick messages P3) |
| U7 | **What the driver did is never lost to the network, and the app says when it is offline.** An accept or a step made offline is queued and retried by itself (15 s, 30 s, 1 min, then every 2 min, and on foreground); a tap on a greyed button says "No connection"; a list that fails to load keeps its rows and reloads once on reconnect; the pill reads Offline and the banner counts the changes waiting | `OfflineActionsProvider`, `useNoConnectionHint`, `useOrderTabs` (`isNetworkFailure`), `WebsocketStatus` | Owner: 2026-11-20 (the retries, the "No connection" toast); Practice for the kept rows |
| U8 | **Nothing important depends on a map or a service that may fail.** The route is straight lines and hands navigation to the maps app (no routing service); a travel time that cannot be trusted is not shown; an API that never answers does not hold the launch (15 s); with no served theme the binary paints its own defaults | `routeGeometry.ts` (`straightGeometry`), `useLaunchTimeLimit`, `defaultAppTheme` | Owner: 2026-11-23 (the route), 2026-11-17 (the travel time, the launch limit), 2026-11-13 (the served theme) |
| U9 | **Text grows with the system's setting and the essential is never cut.** The band wraps its status and keeps its time whole; the Orders title wins over the connection pill; the route's next stop takes two lines; the tabs are one line each and measure again when the font changes; `OText` and `OButton` stop growing at 1.3 times | `ONavbar` `titleFirst`, `badge.base.dot_max_width`, `Tabs` `noWrap`, `TEXT_SCALE_LIMIT` | Owner: 2026-11-23 (the title wins over the pill); Practice for the rest, seen on both platforms at the largest sizes in passes 9 to 12 |
| U10 | **The same function looks the same on every screen: one primitive for it.** Cancel, a notice's action, a dialog's close, a field's error, a store's logo, a spinner each have one component; a text role reads one place of the theme | "One control, one look" and "Typography by role" below, `src/ui/src/components/shared` | Owner: 2026-11-13 (D2, H1 to H7) |
| U11 | **An alert is heard and seen once per event, however many arrive.** Several new orders while the alert is open are one alert with a count; the same order twice counts once; its sound keeps one rhythm and stops on close | `alertQueue.ts`, `NewOrderNotification`; pass 13 saw one alert and one card per emitted event on both platforms | Owner: 2026-11-19 (one alert with the count), 2026-11-20 (the rhythm kept) |
| U12 | **Loading keeps the layout.** Each skeleton has the size of the piece that loads; the rows already shown stay while a list reloads; History All waits for both its lists before it paints | `SkeletonBone`, `OrderListItemSkeleton`, `useOrderTabs` (`holdRows`) | Owner: 2026-11-14 (H9); Practice for the rest |
| U13 | **Motion carries no information and reduced motion is followed.** Whatever moves also reads without moving: a held button says "Hold to confirm" and, with reduced motion, fills in steps; the theme or the system turning motion off gives every duration 0 | `themeMotion`, `AppThemeProvider` (`reduceMotion`), `OSwitch` | Owner: 2026-11-18 (the guarded actions); Practice for the rest |

**Using the rules.** When a design choice is open, the option that is easier for a driver to see and do at a glance wins over the more elegant or the more uniform one. A new screen, piece or theme key is checked against the table above before it is checked against the mockup; a rule it breaks is raised with the owner, not worked around.

**What protects the rules.** *In the schema:* a theme cannot reach below what the editor allows and the engine clamps a number to its node's range when a theme is read. Control heights `size.sm` 24 to 40, `md` 32 to 52, `lg` 40 to 64, `xl` 48 to 80; text sizes `body` 12 to 20, `body_sm` and `caption` 10 to 16, `label` 11 to 18, `button` 12 to 22; `opacity.disabled` 0.3 to 0.7 and `opacity.pressed` 0.6 to 0.95; the page gutter 8 to 48; the connection pill's width `badge.base.dot_max_width` 80 to 320; the route's dash 4 to 32 and gap 4 to 24. *Not themeable at all (no key exists):* the hold's 0.6 s (`HOLD_MS`), which actions are guarded and that accepting is not, the text scale limit (`TEXT_SCALE_LIMIT`, 1.3), the offline queue's retries, the reconnect settle and `SOCKET_GRACE_MS`, the bounds of the lists' loads, the rules of the stop order of the route; no visibility key hides what the delivery needs (the order's number, the store's and the customer's addresses, the customer's name, the products), the Orders and Profile tabs, the connection sheet or the offline banner ([theme/pages-and-visibility.md](theme/pages-and-visibility.md)). *The checks:* `theme:guard`, `theme:keys` and `theme:extremes` keep a rule of usability from being written as a literal and prove that extreme themes (square, pill, a light brand colour, dark surfaces, no shadows, larger text, each of the ten fonts) reach what the app paints. **Known gaps:** a touch target follows `size.md`, whose editor range goes down to 32, so a theme can make it smaller than 44; no check measures the contrast of a served theme's colours (`orderCardBand.test.ts` measures the band's tones on the build's defaults only, and `theme:extremes` checks that the colours reach the app, not that they read); and the pill's, the route's and the tabs' behaviour at the largest text is seen on devices, not checked by a test (Jest has no layout).

## 1. The theme decides

- Every visual value comes from the theme: colors, spacing, radii, borders, shadows,
  typography, icon and control sizes, opacity, motion, images and what is shown. Nothing
  is hard-coded: no hex, no number for a length, font size, line height or shadow, no
  `fontFamily` or `fontWeight`, in a styled component, a `StyleSheet`, an inline style or
  a prop like `size={14}`.
- The theme always arrives complete and valid: `theme.values` is the served theme (or the
  cached one, or none) completed by the engine's runtime (`complete`, in `src/theme/engine.ts`) with
  `src/theme.compiled.json`, the schema compiled by `pnpm theme:compile` (its defaults with the rule of each value, `product_type`
  `driver_app` and `version` 1.0.0):
  - every key of the schema is there; one the theme leaves out is the default;
  - a value the app does not understand is the default, never empty: another kind than the default's, an option the schema does not list,
    an invalid colour, or null where the default is not null (borders and shadows may be null: none);
  - a number is clamped to the editor's `min` / `max` of its node, else to the format's range (0 to 9999, an opacity 0 to 1);
  - a text style, a border and a shadow are checked field by field: an invalid or missing field is the default's;
  - a key the schema lacks is dropped; a page's `sections` keep the theme's order with only that page's sections; an image is an
    `http(s)` URL or `''` (none: the app then shows its bundled image, or an icon where the schema names no bundled picture).

  Readers rely on it: they do not re-check options or ranges, do not write fallbacks that repeat a default and do not use optional
  chains on the theme; only what the schema lets be null (a border, a shadow, an empty image) needs handling.
- The theme is only `{ values, native, meta }` (`src/theme/engine.ts`; `meta` carries the envelope's product type, schema version, preset,
  site theme id and date, and `reduceMotion`, the system's setting, which `AppThemeProvider` follows while the app runs).
- `theme.native` is the same theme as React Native values (`toNative` of
  `@orderingco/ordering-theme-engine/native`, built once per theme): paint from it; read
  `theme.values` only to compute (comparisons, nulls, options, visibility). Never build a
  theme by spreading values (its view keeps the old ones): build it with `buildAppTheme`
  (`src/theme/engine.ts`), and never change the result.
- One provider, `AppThemeProvider` (`src/theme/AppThemeContext.tsx`), from
  `styled-components/native`, at the top of `src/DeliveryApp.tsx`; everything that paints
  is inside it. Components read the theme with `useTheme()` of
  `styled-components/native`.
- Where the theme comes from: the binary paints `complete(compiled, null)` (the defaults
  of the schema version it was built with) until a served theme arrives, and the cached
  one on later launches (`src/theme/remote.ts`, one cache per project and schema version,
  read before the first frame); the app asks for it itself
  (`GET <root>/theme?theme_version=2&product_type=driver_app&theme_schema_version=<compiled version>`);
  a served theme equal to the cached one is kept as it is. No version 1 theme is read or
  mapped (the logic submodule still asks for one at start; nothing reads it).
- **How the served theme reaches the binary and is cached** (`src/theme/remote.ts`, `AppThemeContext.tsx`). `AppThemeProvider` sits at the
  top of the tree and paints, from the first frame, the theme cached for the project (`readCachedTheme`) or, with none, the build's defaults
  (`defaultAppTheme()`: `complete(compiled, null)`, built once). `RemoteThemeLoader`, inside `OrderingProvider` where the API root is known, asks
  once per root and project: `GET <root>/theme?theme_version=2&product_type=driver_app&theme_schema_version=<the compiled version>` with the
  header `X-App-X` set to the app's id, so that api-core cuts a theme of a newer schema down to the version this binary was built with. The
  answer must be a version 2 envelope of this product (`isThemeEnvelope`; another product's is ignored); on any failure (network, a status
  other than 2xx, not JSON) nothing changes. A new envelope is compared with the current one and, when it differs, replaces it and is written
  to `AsyncStorage` under `ordering_theme:v2:driver_app:<schema version>:<project>` (one cache per project and per schema version, so a new
  binary never reads a theme of another schema); the same envelope keeps the current object, so nothing re-renders. A cache that cannot be
  written only costs the next launch a request. The theme is read from the cache before the first frame, so an app opened offline paints
  its project's theme, and a first run offline paints the defaults.
- What the theme sets is not overridden in the app. If something looks wrong with the
  defaults, fix the default in the schema, not the style.
- If no token or component property fits a spot, do not invent a value: record it as an
  exception in `theme-exceptions.json` with its reason, and ask.

## 2. Where values live

| Layer | What it is | Example |
|---|---|---|
| `tokens.<group>.<name>` | The shared vocabulary, same names in every product; numbers in pt | `color.surface`, `space.md` |
| Identity (`shadow_style`, `border_style`, `motion_style`) | Theme-wide choices that move every property that `follows` them | one radius level for every box |
| `components.<c>.base` | A component's properties; defaults alias tokens | `card.base.background = {color.surface}` |
| Axes (`variants`, `appearances`, `sizes`, `shapes`, `colors`), `slots`, `scope`, `inherits` | As in the format | `button` sizes; `bottom_bar.slots.accept` |
| `visibility`, `images`, `pages` | What is shown, the theme's images, screen sections | `orders.business_logo`, `pages.order_details` |

The app is phone only: the schema declares no platforms.

Token groups and levels (`tokens` of `product.schema.json`; the schema sets the defaults and a theme can change them within the editor's range: code refers to the level, never to its number):

| Group | Levels (default → range where the editor limits it) |
|---|---|
| `color` | brand: `primary` with `on_primary`, `primary_subtle`, `primary_pressed`, `primary_text`; `secondary` with `on_secondary`, `secondary_subtle`, `secondary_pressed`; surfaces: `background`, `surface`, `surface_alt`, `overlay`, `on_overlay`, `inverse_surface`, `on_inverse`; text and lines: `text`, `text_muted`, `text_disabled`, `border`, `border_strong`; states: `success`, `warning`, `danger` each with `on_*`, `*_subtle` and `*_text`, and `info` with `on_info` and `info_subtle` (no `info_text`); `disabled` |
| `font` | `heading`, `body`: the families of the two roles (one of the ten catalog fonts; Poppins by default) |
| `typography` | `h1`–`h4` (heading font); `body_lg`, `body`, `body_sm`, `label`, `caption`, `button` (body font); each has `size`, `line` (a ratio), `weight`, `letter_spacing`, `transform` |
| `space` | `none` 0, `xxs` 2, `xs` 5, `sm` 10, `md` 15, `lg` 20, `xl` 30, `xxl` 40, `xxxl` 50 (each a range: `md` 8 to 20, `xl` 16 to 40…) |
| `radius` | `none`, `xs` 4, `sm` 8, `md` 10, `lg` 15, `xl` 20, `xxl` 30, `full` |
| `size` (control height) | `sm` 32 (24 to 40), `md` 44 (32 to 52), `lg` 50 (40 to 64), `xl` 60 (48 to 80) |
| `icon` | `sm` 16 (12 to 20), `md` 20 (16 to 24), `lg` 24 (20 to 32) |
| `border` | `thin` 1, `thick` 2 |
| `shadow` | `none`, `sm`, `md`, `lg`, `xl` |
| `opacity` | `disabled` 0.5 (0.3 to 0.7), `pressed` 0.85 (0.6 to 0.95) |
| `motion` | `fast` 120, `base` 200, `slow` 300 (each a range) |
| `layout`, `focus_ring` | `page_gutter` 20 (8 to 48); `mode` is in the catalog and not read by this app; the focus ring's width, offset and colour |
| Identity: `shadow_style`, `border_style`, `motion_style` | the build's defaults: shadow size `none`, border radius `md` with width `thin`, easing `ease_out` and motion on |

**Identity and `follows`.** The build's defaults are the approved mockups' (decisions of
2026-11-18): shadow size `none`, border width `thin`, radius `md` (10), so a surface is flat
and drawn with a line. A property that `follows` Identity takes its level. One whose `options`
leave Identity's level out keeps its own value: buttons and inputs (`radius.sm`, 8) and
dialogs and sheets (`radius.lg`, 15) look the same while Identity is `md`, and the levels they
do list (`none`, `full`…) still reach them. Cards, badges, alerts and toasts follow Identity
(10). To keep a property out of Identity, say it with `options` in the schema, never with a
number in a style. What floats over a map is the one exception to "no shadows": its own
`map_marker.base.shadow` (`md`), which Identity does not remove (the markers' discs, the buttons and the cards).

## 3. Reading the theme in code

Always through the helpers (`src/theme/helpers.ts`); never read `product.schema.json` from
app code.

| Need | Object styles | Styled templates |
|---|---|---|
| A component's properties | `themePart(theme, 'button', 'sizes.md.height')`, or `theme.native.components.<c>` inside the style function | — |
| Color | `themeColor` | `themeColor` |
| Spacing, page sides | `themeSpace`, `themeGutter` | `spaceCss`, `gutterCss` |
| Radius, shadow, border (Identity applied; shadows for iOS and Android at once; `{ fixed: true }` for a state or a round shape) | `themeRadius`, `themeShadow`, `themeBorder` | `radiusCss`, `shadowCss`, `borderCss` |
| Text (family by weight, `lineHeight = size × line`, no `fontWeight`) | `themeText` | `textCss` |
| A component's text look (`toNative`'s) as a Text style | `nativeTextStyle(look)` | — |
| Icon and control sizes | `themeIconSize`, `themeControlHeight` | `iconSizeCss`, `controlHeightCss` |
| Opacity (pressed, disabled) | `themeOpacity` | — |
| Motion (durations, easing; none when the theme or the system turns it off) | `themeMotion` | — |
| Shown or hidden; screen sections | `themeVisible(theme, 'orders.title')`; `usePageSections('order_details')` (`src/theme/sections.tsx`) | — |
| Images (`{ uri }`, the bundled asset, or nothing: `empty.not_found` and `empty.new_order` have no bundled picture, their states draw an icon) | `themeImage(theme, 'home_hero')` | — |
| A component's box (background, border, shadow: the shadow only on an opaque background) | `nativeBoxStyle(look)` | — |
| A shadow of its own, which Identity does not move (what floats over a map) | `nativeShadowStyle(theme.native.components.map_marker.base.shadow)` | — |
| A control whose states have different borders: the widest border's room in every state | `reservedBorder(looks)` | — |
| The space under a bottom bar; the room a scroll leaves for it | `themeBottomSpace`, `bottomBarClearance`, `useFloatingButtonInset` | — |
| A color from the API (not the theme) | `@orderingco/ordering-theme-engine/colors` (`onColor`, `legible`, `isLight`) | — |

If a helper is missing for a token group, add it next to its siblings (with its template
twin) rather than reading `theme.native` or `theme.values` inline. Object styles are built
inside the component, memoized on the theme
(`const styles = useMemo(() => StyleSheet.create(stylesOf(theme)), [theme])`), never at
module level and never in the render body as a prop.

Rules the helpers do not enforce:

- **A shadow needs an opaque box under it.** Never on an image or on a view without a
  background: carry it on a box with a background and put the picture inside.
- **What floats over a map keeps its shadow** (`map_marker.base.shadow`): `MapMarker`'s disc, `OFab`, the map tab's
  count pill, `MarkerCard` and `DestinationCard` carry it on a box with a background; everything
  else is flat.
- **A map marker is a disc with no title** (the library draws a square, unthemed callout for any marker that has one;
  what a stop says about itself is `MarkerCard` or `DestinationCard`). The driver's own disc is not a button: no press,
  not tappable, only an accessibility label, and it is drawn under the stops' discs (layers: the driver, the stops, the
  selected one), so a tap over it reaches the stop. Both maps set `moveOnMarkerPress={false}`. The map tab draws a
  store's disc only for the orders still to be picked up (`MapView/pickupGroups.ts`, on `stopStage`; the count pill
  counts every order).
- **An icon inside a button takes the button's size and ink** when it does not set its
  own (`<OButton icon={<Icon name='…' />} />`).

Every helper, by file (`src/theme/`):

| Helper | What it gives |
|---|---|
| `helpers.ts` `themeColor`, `themeSpace`, `themeGutter` | a colour, a space level, the page gutter |
| `themeRadius`, `themeBorderWidth`, `themeBorder`, `themeShadow` | Identity applied; `{ fixed: true }` keeps the level (a state, a round shape); a shadow as iOS `shadow*` and Android `elevation` at once |
| `themeControlHeight`, `themeIconSize`, `themeOpacity` | a `size` level, an `icon` level, `disabled` or `pressed` |
| `themeFontFamily`, `themeFontFace`, `themeText` | the font file of a role at a weight (the nearest bundled one), a style that carries only that file, a typography preset as a text style (`fontFamily`, `fontSize`, `lineHeight` = size × line) |
| `themeMotion` | `{ duration, easing }`; duration 0 when the theme turns motion off (`motion_style.enabled`) or the system asks to reduce it (`meta.reduceMotion`) |
| `themePart`, `themeValue` | a component's value as React Native takes it (`themePart(theme, 'button', 'sizes.md.height')`); a completed value to compute with (options, booleans, sections) |
| `themeScoped` | a component as a group sees it (the `scope` of `auth_form`, `header` and `account_page`), else the global one |
| `themeVisible`, `themeTitleAlign` | whether a piece is shown (a key the theme does not know is shown); how titles align (`section_header.base.align`) |
| `themeImage` | `{ uri }` of the theme's image, or the binary's own (`IMAGE_FALLBACKS`, `BUNDLED_IMAGES` of `bundledImages.ts`), or nothing |
| `bottomSpace`, `themeBottomSpace`, `barBottomSpace`, `bottomBarBox`, `bottomBarHeight`, `bottomBarClearance` | the space under a bar pinned to the bottom (the inset, never less than `bottom_nav.base.min_bottom_space`; on Android the inset the screen reads), its box and height, and the room a scroll leaves for it |
| `nativeTextStyle`, `nativeShadowStyle`, `nativeBoxStyle`, `isOpaque`, `reservedBorder` | a component's text look, shadow, and box (background, border, shadow: the shadow only on an opaque background) as styles; the widest border's room in every state |
| `spaceCss`, `gutterCss`, `radiusCss`, `controlHeightCss`, `iconSizeCss`, `borderCss`, `shadowCss`, `textCss` | the template twins for `styled-components/native` (CSS text with its unit) |
| `sections.tsx` `usePageSections(page)` | a page's sections in the theme's order (`render`, `isVisible`, `indexOf`) |
| `engine.ts` `buildAppTheme`, `defaultAppTheme`, `isThemeEnvelope` | the only way to build a theme; the build's defaults; whether a served value is this product's version 2 envelope |

## 4. Reuse or create: the order to follow

1. **The component already has the property.** Read it.
2. **A shared primitive already does it.** One purpose, one theme element
   (`src/ui/src/components/shared`, exported from `@ui`):

   | Purpose | Primitive | Theme |
   |---|---|---|
   | Text | `OText` (`preset`, `color` role, `weight`) | `tokens.typography`, `tokens.color` |
   | Button, icon button | `OButton` (`color`, `appearance`, `size`, `iconOnly`, `round` (a button drawn round, `shapes.round`: an icon-only one is a circle, the chat's send and the profile's camera; one with a label gets fully round ends, a pill, the order card's delivery position), `icon`, `loading`, `disabled`, `onDisabledPress` (a `disabled` button that must still say why it is off: it answers the tap with this and never with `onClick`, keeps the off look and the off accessibility state, draws no pressed look, and takes nothing while `loading`; see "No connection, queue off"), `hold` (fires after a press and hold: see "Guarded actions"); `fitText` keeps a long label on one line by shrinking it: on Android that label is drawn without a line height, or Android shrinks it to its floor even with room to spare; that floor, `FIT_MIN_SCALE` (0.8), is a named constant because the theme has no key for it, section 9; the touch box of every button is at least the theme's `md` control height, `themeControlHeight`, through `hitSlop`, and its label stops growing with the system's font at `TEXT_SCALE_LIMIT`, as `OText`'s does), `OIconButton` (a picture icon) | `components.button` |
   | Close and back | `ModalCloseButton` (`icon`, `iconSize`), `BackButton` (the back arrow is `lg`, 24). A button's touch box reaches past its glyph by `closeButtonInset` (`shared/styles.tsx`: half of the slot's height less `icon.md`, 12 by default): the back button, a bar's icon actions (`ONavbar` `rightButtons`), a sheet's close and the new-order alert's close are pulled that much into the gutter, so the glyph, not the box, sits on it | `modal.slots.close` |
   | Icon | `Icon` (`set` `ion` or `mci`, `size` level, `color` role); `OIcon` for pictures | `tokens.icon`, `tokens.color` |
   | Text field, text area | `OInput` (`hasError`, `isDisabled`; `scope` names the group it is in: the profile's fields are `scope='account_page'` and the access screens' `scope='auth_form'`, whose `field` puts the label above; `labelColor` is the ink of that label for a field over a photo; the phone field, `PhoneInputNumber`, takes the same `scope` and, in a scope with its labels above, draws its own label over the whole row (the country and the number) with no placeholder in the number's box), `OTextarea`. The focused field paints `input.variants.default.states.focus` (by default a thin border in the brand color; every state keeps the border's room, so the text never moves). Every text field takes its caret and selection from the theme's brand color (`inputTint`) and has no padding of its own at its sides (`singleLineInput`, `textAreaInput`): the box's `padding_x` is its only indent, so a field's text starts where a select's does on both platforms | `components.input`, `components.field` |
   | A field's error message | `FieldError` (at the start; `center` under a centered code entry; `scope` as its field's) | `field.base.error`, `error_color`, `message_gap` |
   | The eye of a password field | `PasswordToggle` (`visible`, `onToggle`), as the field's `iconCustomRight` | `input.base.icon_size`, `icon_color` |
   | Select (always a sheet), calendar | `OSelect`, `OCalendar` | `sheet`, `menu`, `input`, `date_strip` |
   | A choice of a list, its mark, a check | `ChoiceRow` (`kind`, `selected`; `listed` and `last` for a list of reasons: no box and no side padding, `choice.sizes.md.height` (44) at least with the content centered in it, a thin divider under it, none under the `last` one; off, the row is the boxed option of a product), `ChoiceMark`, `OCheckbox`. The radio is drawn, a ring of exactly `radio.base.size` (20) with its dot inside, never the icon font's circle (it fills about 0.82 of its box, so a 20 radio showed a 16.5 ring) | `choice`, `radio`, `checkbox` |
   | Full-screen modal page; a dialog in the modal's box | `OModal` (`entireModal`; `box`, with `closable` for a close button in its title row) | `components.modal`, `components.header` |
   | Bottom sheet | `OBottomPopup` (`padded`: the sheet owns its body's padding, sides and bottom; off for a body from edge to edge, as a list of rows; its second keyboard-avoiding view, the one for what is drawn outside the sheet, is rendered only with `childenOutsideContainer`: an empty one left a strip of the undimmed page between the sheet and the keyboard; it draws its handle by default, `components.sheet.base.handle_color`, and `showHandleBar={false}` leaves it out: decoration only, the sheet is not dragged; its back key and its scrim call `onClose` only when the caller gave one; **the space under it** is the pinned bars' rule: closed, the sheet's own padding over the window's bottom inset (`barBottomSpace`, read inside the sheet's own `SafeAreaProvider`, as `OModal` does: a modal is a window of its own and the insets outside it read 0 on Android) and no minimum on Android; with the keyboard up (`keyboardAware` only, and only a keyboard that takes room: `keyboardTakesRoom`, see "The keyboard and the forms") the inset goes and the body ends `components.bottom_bar.base.padding` over the keyboard, where a pinned bar does: 9.3 pt on iOS, 26 px on a 420 dpi Android; the handle is `sheet.base.handle_height` tall (4), the title row starts `md` under it and the body `md` under the title row; the sheets' rows of choices are `menu.base.item_height` tall (50); **`onBackdropPress`** is the tap on the dimmed page and defaults to `onClose`; **`onBlankPress`** makes the sheet's blank parts (the title row, the labels, the padding: the `sheet-bottom-space` view) claim the touch and call it, while a button, a chip or a field, deeper in the tree, answers first; it sets no `accessible` or role, so a screen reader finds nothing new, and it is not for a sheet that scrolls: the accept sheet passes it for the accept action only, to end the typing of the delivery time) | `components.sheet`, `components.menu` |
   | Toast (drawn at the root, between the page gutters, above the tab bar and a screen's bottom action bar: they report their height with `useReportBottomBar`; above the keyboard on iOS; it takes no touch; **it never shows without a message**: an error toast says what the API said through `apiErrorText`, or the generic failure when it said nothing, and a toast of another kind with no text draws nothing; the text is decoded of HTML entities; **only a fade that ran to its end hides it**: a toast that starts while the previous one fades out, as the "Hold to confirm" hint followed by an error, keeps its whole time, and a re-render of the provider's parent does not restart its timer; **an accept or a step of an order has no success toast**: the stage changing on the screen and on the row is the confirmation (the owner's decision of 2026-11-20), and the toasts a step can raise are a failure, the hold's hint, the "not saved" and "needs a connection" notices of the offline path and, with the offline queue off and no network, the no-connection hint of "Offline", below) | `OToast` | `components.toast` |
   | Notice box (also what an error of no field is on the access screens) | `ONotice` (`variant` info, success, warning, danger); the action in it is a `md` outline button | `components.alert` |
   | The alert of an order, request or message that arrives (`NewOrderNotification`) | One instance, mounted by `HomeNavigator` (a tab or a screen of the stack does not mount it), so it shows over any tab and any screen on both platforms (on iOS a `Modal` raised from a tab that was not focused was not presented). Drawn as the mockup: the handle, one row (the icon tile `new_order_alert.base.icon_box_size` holding the icon `icon_size` (28), the headline over the text, the close at the row's end), then the action. What it holds and says is in "The new-order alert", below | `components.new_order_alert` |
   | Ask before a dangerous action, or tell the driver something that blocks | `useConfirm()` (`shared/confirmAction.ts`: `confirm({ message, acceptText, cancelText, destructive, onAccept })`), `useNotice()` (one "OK" button, for an error that stops what the driver was doing), or `OAlertOriginal` with the same `acceptText`, `cancelText` and `destructive` for a piece that keeps an `open` state. All of them go through `presentConfirm` to **the app's own dialog**, `ConfirmDialogHost` (mounted once, in `RootNavigator`): the modal's box (as "Remove account") with the title, the message and the buttons stacked, the accept one first (solid, the danger color when it cannot be undone) and Cancel under it (the neutral outline); the hardware back key of Android, like a tap on the scrim, cancels (a notice closes); one dialog at a time, and a request that arrives meanwhile waits its turn; **a dialog answers once**: a double tap, or a Cancel, the back key and the scrim arriving together, run one callback and drop only the request that was answered, never the next one in line; **a notice has one button** (`useNotice`, or `OAlertOriginal` with `notice`: "Ok" by default, it calls `onAccept`; an information that is not a question never offers a Cancel, and what the app's own `Alert` of the shared logic shows goes through `NoticeAlert` of `src/DeliveryApp.tsx`); **a question is withdrawn, as Cancel, when the screen that asked is no longer in front** (a screen pushed over it, popped, another tab: `ConfirmDialogHost` looks for the asking screen's own route, `routeKey`, which `useConfirm` and `OAlertOriginal` read where they are drawn, among the routes in front each time the navigation publishes a state, so a question asked while a screen is still appearing stays; one asked from outside the screens, and a notice, are never withdrawn), and when the host unmounts (its pending questions get `onCancel` once; a notice is dropped, not run); on iOS it is drawn in a window of its own above the app's (`FullWindowOverlay`), so it shows over a sheet or a modal page, on Android it is a `Modal`. No screen calls `Alert.alert` (the submodule's own dialogs aside): the only call left is the stand-in `presentConfirm` uses before the host is mounted (a launch in progress, a test), so a question is never lost | `components.modal`, `components.button` |
   | Link | `OLink` | `components.link` |
   | A screen's top bar (it owns its room: the page gutter on its sides and `xs` under it; `header.height` tall, what is in it centered on its middle; a title with a subtitle keeps `xs` above and below and grows the bar; `right` takes the actions as direct children and the bar lays them `header.gap` apart, `xs` by default; with `rightButtons` the actions are icon buttons and the bar pulls them `closeButtonInset` into the gutter) | `ONavbar` (`title`, `subtitle`, `onBack`, `right`, `rightButtons`, `titleFirst`: the title takes its text's width and the end actions give way first, so a wide pill or a long action never cuts the title; only the Orders header sets it) | `components.header`, `tokens.layout.page_gutter` |
   | Section title (`page`: a page's section, its content `lg` under it) | `SectionTitle` | `components.section_header` |
   | The bar of actions pinned to the bottom (the accept / reject screen's too) | `FloatingButton` (one action in a `slot`, in `outline` when it is the milder one, or in another component's slot with `buttonLook` (the access screens' submit and cancel); accept over reject; a `step` before those two, drawn over them in the `button` slot ("Arrived to business", "Arrived to customer"); a `third`, another negative action between the two in the `reject` slot ("Order not ready"): every status step of an order's details is in this bar; `negative`; `blocked` = painted off but answers a tap; `loading`; `inline` = in the screen's flow, lifted by its keyboard; `firstButtonHold`, `secondButtonHold`, `stepButtonHold` and `thirdButtonHold` make that button a held one: see "Guarded actions") | `components.bottom_bar` |
   | The order's details, the views its buttons open and its map (one design: the stop the driver is going to first) | `OrderDetails/focus/*` (**a folded row's card is the row**: the card adds no vertical padding of its own, the header does (`sm` over and under, 50 at least, and it is the touch target), so a one-line row is 52 and a two-line one about 61; `FoldedRow` props: `minHeight` for a taller header (the cash to collect, `order_details.base.collect_min_height`, 64), `roomy` for `md` over and under the texts in place of `sm` (the stacked "Collect in cash" of the customer's stop, as the board draws it: 84.7 pt against 83.2) and `bodyFlush` when what opens brings its own padding (the products' lines: no space is left under the last one)). **A product's line** (`ProductItemAccordion`) is 48 high (`sm`, the quantity box 28, `sm`), its price is the line's last piece at the bill's right edge in every line, a line that opens shows its chevron before the price, and the row's 44 touch target comes from `hitSlop`, not from its height; `AcceptOrRejectOrder`: a sheet over the screen the driver is on for `SHEET_ACTIONS` (accept, arrived to business, pickup complete, delivery complete), presented in place ("The accept view", below), and a route with a full screen for the reason forms; `DriverMap/DestinationCard`. A rule the screens share lives in one module (`OrderDetails/orderStages.ts`, `orderData.tsx`, `OrderBill.tsx`, `partyContact.ts` with `stopContacts`, `hooks/useOrderPayment.tsx`, `hooks/useOpenContact.ts`, `hooks/useDriverOrderStage.tsx`). **The order of the blocks of the order's details** is in one table, `OrderDetails/focus/blockOrder.ts` (`FOCUS_BLOCK_ORDER`, by situation: offered, to the store, at the store, to the customer, at the customer, finished): it is the approved mockup's order of that stage, the order's comment always right above the products. The theme decides only what is shown (`pages.order_details` sections, `visibility`); its own order of those sections does not move these blocks. **`OrderBill`** has two looks of the same rows and amounts: the default is the assign request's screen's (rows far apart, a band over the total, a "Payments" card) and `compact` is the details' (small rows `xs` apart, a thin line over the bold total, the payments as muted "Payments · Cash" lines). The minus sign of a payment line means money taken off the total (an amount the order was paid with): the default look marks every payment event with it except cash with the amount the customer gave, which is written plain; `compact` writes a payment plain and keeps the minus for an event that is not a payment (a refund: money out). The assign request's screen (`OrderDetailsLogistic`) still draws `OrderHeaderComponent` and `OrderContentComponent`; its skeleton is `OrderDetailsSkeleton`, a shim over `FocusSkeleton` | `components.order_details`; slots `stop_map`, `stop_call` |
   | A marker on a map (the Map tab's and an order's) | `MapMarker` (`party`: `business`, `customer` or `me`; `selected`): one marker for both maps, a round disc with a ring and a glyph (a store, a person, the driver's own: a smaller, dark disc), drawn from `components.map_marker` (`size`, `selected_size`, `icon_size`, `icon_color`, `ring_color`, `ring_width`, `selected_ring_width`, `me_size`, `me_color`, `shadow`) with no store logo and no customer photo. It is anchored at the disc's center (the disc sits on its coordinate whatever its size). Selection is the Map tab's only: the tapped marker, whose card is open, is larger, has a thicker ring and is drawn above the others (`zIndex`: parties, then `me`, then the selected one); the order's map has no selected marker, its destination is drawn at the normal size. The map keeps its markers clear of the controls' column (the page gutter, its width and `sm`) on the side and of the bottom card when it frames them (`mapPadding`, on both maps) | `components.map_marker` |
   | Floating button over a map | `OFab` (it keeps the map's shadow) | `components.button` (inverse), `map_marker.base.shadow` |
   | A card over a map (the map tab's tapped marker; the order's destination) | `MarkerCard`, `DestinationCard`: an `OCard` with the map's shadow; the map's bottom room is the card's height plus `sm` | `components.card`, `map_marker.base.shadow` |
   | An access screen (login, forgot password, the two code screens): a fixed bar, a scroll and the main action in the bottom bar | `AuthScreen`, `AuthAction` (`LoginForm/AuthPieces.tsx`): the action wears `auth_form.slots.submit` or `cancel` through `FloatingButton`'s `buttonLook` | `components.auth_form` |
   | Loading placeholder (the only skeleton family, one pulse): `SkeletonBone`; each screen's skeleton is built from its loaded piece's own styles | `SkeletonBone` | `components.skeleton` |
   | A label that turns bold when selected | `StableText` | — |
   | Tabs | `Tabs` (`tabs`, `selected`, `onChange`, `variant`, `size`, `fill`, `endGutter`: a row that scrolls sideways and runs to the screen's right edge ends with the page gutter, so the last tab can be scrolled clear of the edge and a tab cut by the edge says there is more; `fitFill` measures the row and, when the tabs fit, spreads them over the full width (each keeps its own width and takes its part of what is left; the login's four tabs), and scrolls as before when they do not; it measures again when the window's width or the system's font scale changes, so a rotation or a larger font does not leave squeezed labels in a row that no longer fits; the size is the height of the whole bar: a pill tab inside its track is `height − 2·inset`; `noWrap`: every label is one line (`numberOfLines` 1, the hidden semibold copy that reserves the selected weight's room too), so a larger system font never breaks a word and selecting never moves the tabs: the Orders tabs are `fitFill endGutter noWrap`, each tab takes the width its label asks for, the room left over is spread equally (the same `flexGrow` for every tab, so the room around each label is the same) and, when they do not fit, the row scrolls sideways to the screen's edge; the login's and the payouts' tabs do not pass it; the row measures again when the system's font size changes at run time, because its scroll is remounted (`key` is the measure's signature, which includes the font scale): React Native sends `onLayout` only when a layout changes, so a change of font that leaves the room as it was reported nothing and the pills kept their old width until a relaunch) | `components.tabs` |
   | A tappable pill (a filter, a quick message, a sort option) | `FilterChip` (`md` unless a screen names a size) | `components.chip` |
   | A label that is not tapped (a status, an order type, a count) | `OBadge` (`variant`: the order states, `neutral`, `inverse`, and the soft pair for a word with a state's color that is not an order's status, `success_soft` "Paid" and `warning_soft` "Collect in cash": the state's `*_subtle` fill and `*_text` ink, and the band's `primary_soft` and `danger_soft`; an order's type is `type_delivery`, `type_pickup` or `type_in_store` (`orderTypeVariant`, three medium tints with dark text); `onPress`, `disabled`, `accessibilityLabel`: a badge that is tapped (a pressable with the badge's look, a control tall to the touch, dimmed while pressed and while disabled: the card's "Delivery #N"); `wrap`: the text takes as many lines as it needs, centered, and the chip is never wider than the room it is given, for a text that must never be cut; `dot`: a round dot before the text, `badge.base.dot_size` (8) and `dot_gap` (`xs`) apart, in the variant's own `dot` colour or, when it has none, its text colour; the `*_soft` variants have one; a state told by more than a colour; never together with `onPress`, and the text gives way (an ellipsis) before the box outgrows its room: the connection pill, whose maximum is `badge.base.dot_max_width` (140, range 80 to 320)) | `components.badge` |
   | A line between rows, sections or bands | `ODivider` (`item`, `section`, `band`) | `components.divider` |
   | A box of content, pressable as a whole when it opens something | `OCard` (`look` for a card kind that inherits it; `footer`: the card's own buttons, drawn in the card's box but **outside** its `Pressable`, see "The order card") | `components.card` |
   | A row of a list or a menu | `OListRow` (`background`: a fill for one row in place of the list's `list_row.base.background`, painted by the row itself: the schedule's today is tinted across its whole band, which a tint on a wrapper could not do because the row paints its own opaque fill over it; `titleEnd`: something at the title's end, as the group's count; `titleMuted`: the title in `text_muted`, for a row that names a field whose value is the row's end (the profile's information: the label muted, the value in the text color); `tall`: the row is `list_row.base.tall_min_height` (76) at least, the one the list marks; a row that opens something is 50 at least, `padding_y` is `sm`; the chevron or glyph at its end is `list_row.base.trailing_icon_size`, 18) | `components.list_row` |
   | A person's picture or a store's logo | `OAvatar` (`kind`, `size` (`lg` 56 with a 26 glyph, `sm` 32 with an 18 glyph), `tone`: `brand`, the default, or `neutral`, a quiet disc under a muted glyph, which the review gives a customer with no photo): a person is round, a store's logo (`kind='business'`) a rounded square on every screen; a picture that fails to load (an error answer, a deleted photo) gives way to the same placeholder, never an empty box | `components.avatar`, `tokens.radius.sm`, `images.placeholder.*` |
   | An empty or error state of a list or a screen | `NotFoundSource` (`content`, `btnTitle` / `onClickButton` / `btnDisabled`, children between the message and the action; the picture the theme serves as `images.empty.not_found`, or, while it serves none, an icon in `primary_text` at `empty_state.icon_size` right over the message (the picture's gap under it); the picture is `empty_state.image_size` (180); the permissions screen centers its glyph in a round tint of `empty_state.icon_box_size` (88)) | `components.empty_state`, `images.empty.not_found` |
   | A number with minus and plus | `OStepper` (the number is `stepper.base.value`, the `h3` look, in a box `value_min_width` (28) wide at least) | `components.stepper` |
   | A code typed digit by digit (login code, phone verification, delivery PIN) | `OOtpInput` | `components.input.sizes.code` |
   | A phone number the app shows or dials (the order's parties, the reason form's call, the profile) | `formatPhone(number, code)` writes it international ("+1 646 555 0129"; "+<code> <number>" when it does not parse, the bare number with no code, nothing for nothing) and `phoneUrl(number, code)` / `phoneDialNumber` make the `tel:` target in E.164 with the country code whenever it is known (`src/ui/src/utils/phone.ts`, over `libphonenumber-js`); a party with no code takes the project's default country (`default_country_code`, read once by `usePhoneCountry` and passed as the third argument; a number not valid for it stays as written); **a `tel:`, `sms:` or `mailto:` link is opened with `Linking.openURL` straight away, never after `Linking.canOpenURL`** (`utils/links`: Android 11+ answers `false` for a scheme the manifest does not declare; any other scheme, a maps app's, is still asked first so it is offered only when the app is there; `useOpenContact` and `OLink` do this); an input for a number is `PhoneInputNumber` and keeps its own behaviour; a phone typed in a chat message is dialled as written | — |
   | A language's name in the language selector | `languageOwnName(code, apiName)` (`src/ui/src/utils/languageNames.ts`): the language's own name ("Español"), the API's for a code the table lacks; a regional variant (`es-419-1`, "Spanish (Mexico)") is the language's name plus the API's qualifier ("Español (Mexico)"); never a `t()` key | — |
   | An on / off switch | `OSwitch` (drawn by the app, never the platform's `Switch`: a `Pressable` with the role `switch` and `accessibilityState` `checked` and `disabled`; a pill track `track_width` by `track_height` (44 by 24) with a round thumb `thumb_size` (20) that is the only thing that moves, sliding with `themeMotion` `fast` and jumping when the theme or the system reduces motion; the touch box is `hit_width` (52) wide and a `md` control (44) tall at least; disabled is `themeOpacity('disabled')`; its props are `value`, `onChange`, `disabled`, `testID` and `accessibilityLabel`; the business app's `label` prop was not ported, no driver screen uses it; only the profile's availability switch renders it, and that switch stays in place, dimmed and disabled, while its request runs: no spinner replaces it, so the row never shrinks) | `components.switch` (`on`, `off`, `thumb`, `track_width`, `track_height`, `thumb_size`, `hit_width`) |
   | A number of minutes the driver gives (the accept sheet's delivery time) | `MinutesValue` (`shared/MinutesValue.tsx`: the figure is a button in the stepper's own `stepper.base.value` look, `TIME_MIN` after it; a tap turns it into a numeric field with the unit after the digits, no icon and no confirm button; `minutes`, `min`, `max`, `onCommit`, `onTyping`, `color`; the handle has `flush()` and `isEditing()`; `minutesLineHeight(theme)` is the tallest of `input.sizes.md`, `button.sizes.md` and `stepper.sizes.md` (44), the height of the figure, the field and the two side boxes, so a tap on the figure moves nothing; **the line under the field is one reserved row**: a clipped row (`overflow: hidden`) of two full-width cells, the hint and the error, each with `field.base.message_gap` above it, and the one not shown pushed out of the clip with a `-100%` margin and hidden from a screen reader, so the row is always as tall as the taller of the two texts, even when one wraps, and the sheet never grows or moves when one replaces the other) and `AcceptOrRejectOrder/DeliveryTime.tsx` (the block: "Delivery time", the presets, minus, figure and plus; "The delivery time", below) | `components.stepper`, `components.input`, `components.field`, `components.chip` |
   | The connection state (the Orders header's pill, its sheet) | `WebsocketStatus` (the pill) and `ConnectionHost` (the sheet), `WebsocketStatus/connectionState.ts` and `connectionStore.ts`: "Real time", below | `components.badge` (`success_soft`, `warning_soft`, `danger_soft`, `dot`), `components.icon_tile`, `visibility.connection_status` |
   | The route of the orders in progress | `OrdersRouteEntry` (the button above the first card), `OrdersRoute` (the map and its panel), `OrdersRouteStops` (the timeline), `RouteMap`, `RoutePanel`, `RouteNextActions`, `NavigateSheet`, `StopNumber`, `RouteStopMarker`: "The route", below | `components.map_marker` (`stop_size`, `stop_next_size`, `line_*`), `visibility.orders.route` |
   | A blocking loading overlay | `LoadingOverlay` | `tokens.color.overlay` |
   | An inline spinner (a row, a sheet or a piece of the screen is loading) | `OSpinner` (`size` `sm`, `md`, `lg`; `color` role) | `components.spinner`, `tokens.icon` |
   | Pages swiped sideways with dots (the tutorial) | `Pager`, `PagerDots` | `components.tutorial` |

   Do not build a second version with its own styles, and do not add a library that
   paints its own UI (decision D2): what a library drew becomes one of these.

   **Imports inside `src/ui` (no require cycles).** `@ui` is the barrel (`src/ui/index.tsx`) for what is outside
   `src/ui`: the pages, the navigators, `DeliveryApp`. A file **inside `src/ui` never imports `@ui`**: it imports the
   concrete module (`../shared`, `../FloatingButton`, `../../hooks/useLocation`, `../../context/OfflineActions`, the other
   component's folder). The barrel imports every component, so a component that imports the barrel is in a cycle with it
   (Metro prints "Require cycle: …", and a module reached through a cycle can be read before it is initialised); on
   2026-11-20 there were 31, all through the barrel, and now there are none. Two things hold it: `pnpm lint:cycles`
   (`scripts/check-cycles.mjs`, no dependency; it follows `import`, `export … from`, `import 'x'` and `require('x')` with the
   aliases of `babel.config.js` and `tsconfig.json`, treats the submodule `src/@/components` as a leaf, skips tests and
   `jest/`, ignores type-only imports and dynamic `import()`, lists every cycle once as `a -> b -> a` and exits 1 if any
   exists; it is a step of the CI's quality gate, right after ESLint) and an ESLint rule (`no-restricted-imports` as an
   error for the name `@ui` in `src/ui/**`, tests excluded; `src/pages` and the tests may import it). The rule does not
   forbid a relative path to the barrel (`../../index`): none exists, and `lint:cycles` would find one. A test that mocks
   `@ui` for a component of `src/ui` must also mock the concrete modules the component imports: the test imports
   `jest/helpers/uiModuleMocks.js` first, which mocks each of them as its real exports plus what the test's `@ui`
   fixture lists for it (`pickUi(fixture, names)` trims a fixture to what the tree reads).
3. **A token used directly.** Layout glue that moves with the global scale.
4. **A new property on an existing component.** Its default aliases a token.
5. **A new component.**

Never create a new **token**. Token names are a fixed catalog shared by every product and api-core rejects names outside it: a missing level
(another space step, another icon size) is a change of the engine and the editor, so raise it and ask. Only the coordinator of a conversion
edits `product.schema.json`, `src/theme/` and the primitives: ask for what is missing.

**Reuse across components** (what the schema offers, with this app's real cases)
- Prefer a **slot** to restyling a contained component: the bottom bar's accept and reject buttons are `bottom_bar.slots.accept` and `reject`, the order card's quick actions `order_card.slots.advance` and `decline`, a modal's close `modal.slots.close`; a slot names the contained component's size, appearance and colour, not a custom button.
- Prefer a **`scope`** to a per-place override: `auth_form`, `header` and `account_page` carry a `scope`, read through `themeScoped` (the access screens' fields have their label above; the profile's section titles are small). No component of this schema uses `inherits`.
- Two components that should look alike alias the same token in their defaults; they do not read each other's properties.

## 5. Picking the right token

| Use | Token |
|---|---|
| Page canvas | `background` |
| Cards, modals, sheets, the tab bar | `surface` |
| Bands and soft fills | `surface_alt` |
| Text; secondary text, placeholders, metadata; disabled text | `text`; `text_muted`; `text_disabled` |
| Separators, card borders; control borders | `border`; `border_strong` |
| Brand, selection, progress (a fill) with its text | `primary` with `on_primary` |
| The brand color as text or icon on the page, links | `primary_text` |
| The brand's light tint (a selected row, a tonal chip) | `primary_subtle` |
| States (fill, text on it, tint, text on the page) | `success`, `warning`, `danger`, `info` with `on_*`, `*_subtle`, `*_text` |
| Scrim behind a modal; text over a photo | `overlay`; `on_overlay` |
| A disabled control's fill or line | `disabled` |
| Not a color | `transparent` (it is not an entry of `theme-exceptions.json`) |

**Translucency.** A colour is opaque unless its node says `alpha: true` in its editor metadata (nine nodes do: the overlay token, the outline and ghost button backgrounds, the menu's selected item, the tabs' `underline` and `plain` variants, the timer's background and the home hero's overlay); only then can its default be translucent, and a translucent box drops its shadow (`nativeBoxStyle`, `isOpaque`).

**Order status and time** (decision D4): pending and in progress are `primary`, completed
`success`, rejected / cancelled / failed `danger`; in time / at risk / delayed are
`success` / `warning` / `danger`. Painted with `badge` variants, never a hex. **The order card's status and time are one status band
on the tint of a soft variant** (the owner, 2026-11-23: it replaces the 2026-11-20 card whose time was text and whose status was a
chip; only the band is tinted, never the card): on time or with no time `primary_soft`, at risk `warning_soft`, late `danger_soft`,
and for an order that is over how it ended (`success_soft` completed, `danger_soft` cancelled, rejected or failed); "Paid" and "Collect
in cash" are the `success_soft` and `warning_soft` badge variants, and an order's type is `type_delivery`, `type_pickup` or
`type_in_store`.

**Buttons** (decision D3): `md` inside a screen and inside a list row, `lg` in the bottom
bar; accept is `success`, reject is `danger`: `solid` in the bar, `tonal` inside a group's row
(`order_card.slots.accept` / `reject`, which a group's own actions still read). **The order card's quick actions and an assign
request's Accept / Reject are `order_card.slots.advance` (solid, `success`, `md`: the positive, the next step) and
`order_card.slots.decline` (outline, `danger`, `md`: the negative)**, in thirds of what their labels leave (the decline a
third, the advance two thirds; alone, the whole row). `sm` is the
small control (32, `padding_x` `sm`, its label 12 / 600).

**Icons** (decision of 2026-11-19). The glyph's size is the mockups': 22 alone in a button
(`button.shapes.icon.icon_size`), 18 beside a label (`button.sizes.md.icon_size`) and at the end of
rows, fields and details (`list_row.base.trailing_icon_size`, `input.base.trailing_icon_size`,
`order_details.base.detail_icon_size`), 24 for the back arrow and the order header's actions, 20
for the map's buttons, the stepper, send and the password toggle. The icon tokens (16 / 20 / 24)
are unchanged: the sizes between them are keys of the component that owns the glyph, never a
number in a style.

**One control, one look** (decision H5). A control that does the same thing looks the
same on every screen:

| Control | Look |
|---|---|
| Cancel (a dialog, a sheet, a form) | `<OButton color='neutral' appearance='outline' />` |
| A notice's action | `<OButton size='md' appearance='outline' />` |
| A dialog's close | `OModal` `box` `closable` (never a close row of the screen's own) |
| A sheet's padding | `OBottomPopup` `padded` (never the caller's) |
| The password eye | `PasswordToggle` |
| A field's error | `FieldError` |
| A store's logo | `OAvatar kind='business'` (the rounded square) |
| Something loading in place | `OSpinner` |
| An action that cannot be taken back | A hold or a confirmation, by the rules of "Guarded actions" below |

**Guarded actions** (decision of 2026-11-18). Every dangerous action has a hold or a
confirmation, whichever is better in each case; a screen never invents a third way.

| What | Guard | How |
|---|---|---|
| A step of the delivery that cannot be taken back and fires in one tap: "Arrived to business", "Pickup complete", "Arrived to customer", "Delivery complete" | **Hold** (`HOLD_MS` = 600) | `FloatingButton`'s `stepButtonHold`, `secondButtonHold`, `firstButtonHold`, set only on the direct path: with the location permission granted and no sheet, photo or code between the tap and the effect (`Delivery.tsx`); the same rule on the order card's quick actions (`OrderCardActions`, `isHeld`: `OButton hold`) |
| Rejecting an assign request (its screen, the order's bottom bar, the orders-list card) | **Hold** | `firstButtonHold` in the two bars, `hold` on the card's `OButton` |
| Log out; delete one or all sessions (or enable them all); remove the profile photo; leave Information or Password with changes not saved | **Confirmation** | `useConfirm()` / `OAlertOriginal`, in the app's own dialog (`ConfirmDialogHost`, the primitives' table): the accept button is named after the action (`Logout`, `Delete`, `Remove`, `Discard`), never "OK"; `destructive` where it cannot be undone; `cancelText` when "Cancel" is unclear (`Keep editing`) |
| A status change that hits every order of a group at once and has no form of its own | **Confirmation** | `PreviousOrders`, `confirmGroupChange` (one question at a time): the question names the group and the count (`QUESTION_GROUP_ACTION`: "This changes the _count_ orders of group No. _group_ at once. Continue?"; `QUESTION_GROUP_ACTION_NO_NUMBER` when the group has no number) |
| A step with its own submit (a sheet, a reason form, the PIN, the two steps of remove account), and one that only opens a view | **Nothing** | The submit is the step: a guard on top asks twice. For a group: "Accept all" and "Delivery complete" with codes open their sheet over the list and the form is the step; "Reject all", pickup failed, delivery failed and order not ready open the reason form's page and the form is the step; the other status changes of a group are the confirmation of the row above |
| **Accepting** an order (with no ETA to give included), an assign request or a whole group ("Accept all") | **Nothing: it is never held** | One direct tap, with no hint and no screen-reader dialog: the time is valuable there (the owner, 2026-11-18) |

`HOLD_MS` is a behaviour constant (`shared/HoldToConfirm.tsx`), not a token and not a motion
level: a theme with no motion, or a driver who reduces it, still has to hold. The held
button paints its own pressed look as the progress (a fill that wipes in, the content drawn
again over it); with reduced motion the fill grows in steps. A plain tap on a held button
shows the toast "Hold to confirm" and fires nothing. With a screen reader on, the button asks
a dialog instead (the action's name on the accept button) and fires when it is accepted. Set
`hold` only where the tap would fire the action itself.

**Nothing removes the pressed element until the touch ends.** A held button fires on its timer with the finger still on it,
and what it fires (the order's new status, the request leaving the list, the screen going back) can take that button off
the screen while the finger is down. The native side then has no view to deliver the touch's end to, React Native's
responder system never hears it end, keeps the removed button as the responder and ignores the next touch that starts
(anywhere on the screen) until a second one clears it. So `shared/holdLatch.ts` holds what would remove the pressed
element until the finger lifts: `holdFinger` (taken by `HoldToConfirm` when the hold completes with the finger down, and
released by the touch's end, by the button unmounting or after 15 s, so a missed touch end never freezes a screen),
`useSettledWhileHeld(value)` (the screen keeps showing what it showed while a finger is down on a completed hold, and
applies the latest value at the release) and `afterRelease(run)` (runs now, or at the release). The order's bottom bar
(`OrderDetails/Delivery.tsx`), the assign requests' list and the orders list (`OrdersOption`: its rows go through
`useSettledWhileHeld`, since a held step of a card moves its order to another tab or changes its buttons) and the go-back after a
reject (`OrderDetailsLogistic`, `Delivery`) use them; a new screen whose action can remove the held button does the same.

**The hold is judged by the touches' own clock.** A busy JavaScript thread can handle the release late, and a clock read
when JavaScript gets round to it would turn a short tap into a hold (or drop a hold the finger kept). So `HoldToConfirm`
takes the length of the touch from the `nativeEvent.timestamp` of the press-in and of the press-out (`touchTime`: the touch
system's milliseconds, `UITouch.timestamp` on iOS and the `MotionEvent`'s time on Android, comparable only with each other,
never with `Date.now()`); the JavaScript clock is only the fallback for an event that has no timestamp (a screen reader's
activation, a bare press in a test). A release that arrives after 0.6 s of touch completes the hold once; a short tap handled
late is still a tap. What is left to the timer: if a very busy thread runs the 0.6 s timer before it handles a short tap's
release, the timer still fires.

**The latch follows the fingers and lets go of what is stale.** `onTouchEnd` of a held button ends the touch only when no
other finger is left on it: with `touches` remaining, the button is measured in the window (`measureInWindow`, through the
`viewRef` of `holdLayer`) and the latch is released only if none of them is on it, its hit slop included (a finger resting
elsewhere on the screen does not hold it); without `touches` or a measure it is released as before. A latch left from a
hold whose touch end never came (the 15 s safety let go of it) is replaced by the next hold of that button, which takes its
own; `completed` is cleared by a 0 ms timer after the press-out, so a press that never arrives (the finger slid off, the
button went `loading`) does not swallow the next tap; and `flush()` runs every waiting callback before it lets the first
error out.

**One submit at a time.** An order's step must not be sent twice by a second hold during the seconds a GPS fix takes:
`Delivery` sets its loading flag and a one-at-a-time guard **before** the first `await` of a status change, and a request
that throws gives the bar back (a `finally`) and shows an error toast. A group's confirmation is asked once at a time
(`confirmGroupChange` keeps one question open, released when it is accepted or cancelled, and refuses while a change is in
flight), and a group's status change releases its buttons when its answer arrives, not when the controller's loading flag
moves. A catch-up that loads an order again (reconnect, foreground) waits for a change of the driver's own to end
(`useRefetchAfterMutation`, "Real time"): the older GET could answer after the POST and put the previous stage's buttons
back.

**Typography by role.** Texts of the same role look the same on every screen; each role
reads one place of the theme, never a preset picked by the screen:

| Role | Reads |
|---|---|
| Screen title | `header.title` (through `ONavbar`) |
| Section title | `section_header.title` (through `SectionTitle`); the profile's are small, `account_page.title` (label), in the profile only |
| Card title (a group, a session, a payout) | `order_card.name`: one style for every card title |
| The order card's strong line ("#number · customer") | `order_card.title_text` (16 / 1.4 / 600); the store's name over it is `order_card.meta` |
| The order card's status band (the status and the time) | `order_card.time_text` (12 / 1.5 / 600), also the Messages row's timer; the tone's `*_soft` variant gives the tint and the ink |
| The order card's total | `h4`; `order_card.total_text` is a payout's amount, which the card does not read |
| Metadata (number, date, distance) | `order_card.meta` in its muted color; elsewhere `body_sm` in `text_muted` |
| A lead: the text under a screen's or a block's title (welcome, tutorial, forgot password, review, accept / reject, an empty state) | `body_lg` |
| Body copy, bill rows | `body` |
| Field labels, emphasised rows; the label of a block inside a sheet or a reason form ("What happened?", "Upload status image", "Security code": `label`, 14 / 600, with a muted `body_sm` description under it, `AcceptOrRejectOrder/BlockLabel.tsx`; decision of 2026-11-19) | `label` |
| A field's error | `field.error` in `field.error_color` (through `FieldError`) |
| Button labels | the button size's text |
| Tab bar labels, badges, captions | `bottom_nav.label_text`, the badge's text, `caption` |

**One text for one thing** (decisions H1–H4). What names the same thing is written by one
function, never by a list or a format of the screen's own:

| Thing | Written by | Reads |
|---|---|---|
| An order's status | `orderStatusName(t, status)`; the whole list is `orderStatusList(t)` (`key`, `value` and `text`, `slug`, `percentage`), one entry `orderStatusEntry(t, status)` (`src/ui/src/utils/orderStatus.ts`) | 4 is "Ready for pickup", 5 "Rejected by business" |
| The order number | `useSecureOrderId().orderNumberLabel(order)`, or `orderNumberLabel(id)` for a bare id (a payout's, a map marker's, the id a details screen was opened with) | "Order No. 123\*\*\*\*": `ORDER_NO`, one space, the id masked in a secure project. The chat's subtitle. The bar of the order's details and of the assign request has three buttons and no room for it on one line, and the driver map's bar titles the same order the same way: it says "Order" and, under it, `orderNumberShort(order)`, "No. 123\*\*\*\*" (`ORDER_NO_SHORT`). Never a line of the details' header card |
| The order type | `orderTypeLabel(t, order.delivery_type)` (`src/ui/src/utils/orderType.ts`) | Catering and reservation included; any other type is a delivery |
| A countdown | `formatCountdown(seconds)` | `mm:ss`, zero-padded: "09:59" |
| A duration | `formatDuration(minutes, t)` | "12 min"; "1 h 05 min" from an hour on; nothing for a value that is not a finite number |
| The driver map's travel time | `nextTravelMinutes(previous, meters, speed)`, `isPositionFix` (`src/ui/src/utils/travelTime.ts`) | A number of minutes, or null: no time is drawn (a position with no fix, a speed under a walk or over 100 m/s, an estimate past a day) |
| A schedule's hour | `formatHours({ hour, minute }, utils)` with the state of `useUtils()` | The project's time format: "09:05", "09:05 AM" |
| An order's timer | `formatDelay(minutes, t)` | "02:05", "1 day 02:05", "- 00:07" when late |
| The time on an order card | `openOrderTime(order, utils, t, absolute)`, `closedOrderTime(order, utils, t)` and `formatCardDuration(minutes, t)` (`PreviousOrders/orderCardTime.ts`); the clock time is `formatClockTime(moment, utils)` (`formats.ts`) | "24 min" over "left", "+12 min" over "late", "1 h 05 min", "12 h", "2 d"; "06:37PM" over "today" (the project's time format) |
| A date, a date with its time | `useUtils` → `parseDate` | The project's format |
| An API error shown to the driver | `apiErrorText(error, t)` (`src/ui/src/utils/index.tsx`, through `getTraduction`) | A message that is a code (`ERROR_FOO_BAR`, no spaces) goes through `t(key, readable fallback)`; a message with spaces is shown as text; an empty answer says "Network Error". Every API message has its HTML entities decoded (`decodeHtmlEntities`, named and numeric, one pass, inside `getTraduction`): the app draws plain text The login the schedule validation refuses (`ERROR_AUTH_DRIVER_LOGIN_VALIDATION`) says the schedule-blocked screen's text (`OUTSIDE_ESTABLISHED_SCHEDULE`) |

The formats are in `src/ui/src/utils/formats.ts`; all of them are exported from
`src/ui/src/utils`.

**Layout rules**

- Every screen's content, its header's included, sits on the page gutter. The header
  (`ONavbar`) carries its own sides; the scroll carries them on its **content**
  (`contentContainerStyle`), never on its frame: a frame with padding clips the side
  shadow of a card. A screen's wrapper (`SafeAreaContainerLayout`, `Container`) lays no sides.
- **The space under a header is `xs` (5) on every screen and both platforms, and it is the
  header's** (it was `md` until 2026-11-23: the bar is `header.height` tall with its title
  centred, so with `md` under it a one-line title had 16 above it, to the status bar, and 30
  under it): `ONavbar` owns it (`paddingBottom`, the `xs` token), so the first thing under a bar sits
  `xs` from it whatever the screen. A screen adds no space of its own under its bar (no `paddingTop` on its scroll,
  no `account_page.padding_top`), and a number inside a piece (the accept step's stepper has its
  own `xxl` padding) is that piece's, not the screen's. A header is fixed: it is drawn outside the
  scroll (`Container` takes it as `header`), in every state of the screen (loading and error too).
- **One bar, one rule for what is in it.** Every bar is exactly `header.height` tall (56 by
  default), with one line of text or two, and its back button, texts and actions are centered on
  its middle: the back arrow sits at the same height on every screen. A title with a subtitle
  (the chat, the order's details) fits that height, and the bar's texts follow the system's font
  size only while two lines still fit (`navbarTextScale`), so nothing grows a bar. A skeleton of
  a bar draws its bones in the same text box (`ONavbar` with `children`).
  A screen never wraps its actions in a row of its own: it passes them as `right`'s children and
  the bar lays them `header.gap` apart. The back button is the bar's own (`BackButton`); no screen
  draws an arrow or a title row of its own.
- Between the cards of a list: `md` (orders, messages, sessions, payouts). From a page's
  section title to its content: `lg` (`SectionTitle page`); a sheet's title keeps its own
  room, and a title inside a card the theme's `section_header.margin_bottom`.
- The safe-area inset comes from the system (`useSafeAreaInsets`), never from a platform
  branch (`ios ? 0 : 15`) or a window-height guess.
- A state (pressed, selected) never moves or resizes its control: its border room is
  reserved in every state and a label that turns bold keeps its bold width.
- A row of chips is one row that scrolls sideways, never wrapped. The exceptions are the customer's review, whose
  quick comments wrap so all of them are seen at once (the owner's decision of 2026-11-18), and the chips of each filter of
  the orders search (`OrdersOption/ChipRow.tsx`), which wrap onto as many lines as they need, `sm` apart on both axes, so
  "Custom range" (with its calendar glyph) is never off the screen's edge. A row that scrolls sideways
  and runs to the screen's right edge ends with the page gutter, so its last item can be scrolled clear of the edge: the
  orders tab strip, with more than three tabs, does it through `Tabs` `endGutter`.
- A list of sections that are cards or rows (the profile) draws no divider between them: the sections' own room does.
- On the access screens (login, forgot password, the code screens) an error belongs to its field (`FieldError`, under
  it) and one that belongs to no field is an `ONotice`, kept on screen until the driver edits, changes tab or a new
  result arrives. No toast is used there. **The login's tabs** are one per way in that the project has on, always in the order Email, Phone, OTP Email, OTP Phone, and show only when two or more are on (with one way there are no tabs). The configs are `email_password_login_enabled`, `phone_password_login_enabled`, `opt_email_enabled` (spelled so) and `otp_cellphone_enabled`; `whatsapp_otp_login_enabled` is not a tab but a channel of the phone code: the pinned action then reads "Send by SMS" and an outline "Send by WhatsApp" under the field sends the code by channel 4. The selected tab is the controller's (`loginTab`, or `otp-<otpType>`). Up to three tabs share the row; four scroll sideways (`Tabs` `endGutter`). The phone tab is `PhoneInputNumber` with its label over the whole row, then the password, "Forgot your password?" as on the e-mail tab, and the errors inline; the notice of an answer stays until the driver edits and clears when the tab changes.
- A section owns no outer margin; one with nothing to show renders no view.
- **A skeleton is built from the piece it stands for, never from numbers of its own**: it
  lays itself out with the loaded piece's own style function (`orderCardStyles`,
  `messageListStyles`, `chatStyles`, `profileStyles`, and for the order's details `focusStyles` and `deliveryStyles` through
  `FocusSkeleton`), reads each bone's height from the text look of what it stands for, and draws
  only the pieces that load (a piece the theme hides, or a tab that writes no time in its band, draws no bone:
  `orderCardPieces`; the card's skeleton has no quick actions, which depend on where the order is). Every bone is a `SkeletonBone`. Each skeleton has a test that pins its
  bones to the loaded piece's metrics.
- A bar pinned to the bottom keeps the system inset under its content, never less than
  `bottom_nav.min_bottom_space` on iOS (`barBottomSpace`: a device with no home indicator would put the buttons on the
  screen's edge). **On Android it keeps the inset the screen reads and no minimum**: the activity already pads its
  screens by the system bars (see the next rule), so a screen of the stack reads 0 and its bar stands clear above the
  navigation area, and a modal's window reads the bars' height; with the minimum on top the stack's bars (Information,
  the access screens, the order's details) had a second space under them that the modals' bars (the reason forms, the
  review, the search) did not: 66 px against 26 over the navigation area on a 420 dpi phone. Now it is the bar's own
  padding on every screen. With the keyboard up the bar keeps only its own padding (the keyboard covers the inset), so
  the gap over the keyboard is the same on every screen (`FloatingButton`, and the search form's own bar). A scroll
  under the bar leaves `bottomBarClearance`. The tab bar keeps its minimum (`bottomBarBox`).
- **On Android the activity pads the content by the system bars** (`MainActivity`, which asks `ContentInsets.kt` how
  much), so for every screen the safe-area insets read 0 there. One screen may ask to go under the bars:
  Home, while it is focused (`src/pages/Home.tsx` → `setContentUnderBars` of `src/utils/contentUnderBars.ts` → the
  native `WindowBackground.setContentUnderBars`; the status bar's icons are light over the photo's overlay, the
  navigation bar's too, and both are put back when it leaves). While the padding is off the insets report the bars,
  so **a screen that asks must handle its own insets**: Home's content ends `account_page.base.padding_bottom` plus the
  inset above the bottom edge on Android (iOS keeps the larger of its inset and `lg`). A binary without the native
  method does nothing. Where the window is not drawn edge to edge (Android 14 and earlier, 15 with the opt-out of
  `styles.xml`) the content view gets no bar insets and nothing changes.
- A card carries its radius on the box that paints its background and shadow, and grows
  with its content (no fixed heights for text).
- Dates and times are written by the project's utility (`useUtils` → `parseDate`), never
  with a format of the screen's own.
- **`SafeAreaContainerLayout` has no wrapper view** between its padded container (the system's insets above the
  screen) and the screen's own children. A keyboard-avoiding view reads its position from its parent, so a wrapper at
  the top of the safe area hid the top inset from it and it lifted its screen that much too little: a screen that
  puts a `KeyboardAvoidingView` under the layout counts the top inset itself.

**The keyboard and the forms.** A pinned action stays in sight over the keyboard on both platforms.
- **Every screen that keeps an action or a composer over the keyboard uses `KeyboardScreen`**
  (`ui/shared/KeyboardScreen.tsx`, exported from `@ui`), never a raw `KeyboardAvoidingView` (a test of the folder fails
  on one; the two sheets' own, in `OBottomPopup` and `OModal`, are inside a `Modal` and are the only exceptions). On
  Android the keyboard's position is in the window's coordinates and the activity pads the stack's screens by the system
  bars, so a `KeyboardAvoidingView` that measures its frame against its parent falls short of the keyboard by the
  screen's distance from the window's top (one bar inset, 63 px on a 420 dpi phone): the pinned bar went under the
  keyboard (Information, Password, and the access screens: they were saved by the bar's old minimum under it). On
  Android `KeyboardScreen` wraps the avoiding view in a view that fills the room, measures it in the window
  (`src/hooks/useWindowTop.ts`, `measureInWindow`) and gives that as `keyboardVerticalOffset`; a modal is a window of
  its own that starts at the screen's top, so the same wrapper gives 0 there (the reason forms, the review, the search,
  which were right already). iOS draws from the window's top and the avoiding view's own `frame.y` already counts the
  safe area above it: there `KeyboardScreen` is the `KeyboardAvoidingView` and nothing more (a wrapper would hide the
  top inset from it), and the pinned bars sit 9.3 to 9.5 pt over the keyboard as before. The chat uses `padding` on both
  platforms, the forms `padding` on iOS and `height` on Android. `OBottomPopup`'s keyboard views and the space it leaves over the keyboard are in its row above (a sheet with a field ends where a pinned bar does).
- The comment field of a reason form (reject, pickup or delivery failed, order not ready, a forced pickup, delivery or status) is brought
  into view once the keyboard has finished showing (`AcceptOrRejectOrder/useRevealField.ts`): the keyboard shrinks the
  scroll's room after the focus, so the scroll is made from layout events, never from an asynchronous `measure` (the
  field's block and the scroll report their layout) and repeated on focus, `keyboardDidShow`,
  `keyboardDidChangeFrame`, the scroll's layout and content size; the end of the field stays in view while it grows
  as it is typed in. The figure of the delivery time (the accept step, `MinutesValue`) is a field only after a tap on it: the sheet never focuses it
  by itself, so the keyboard does not open when the sheet does, and a tap on the figure opens it again even when the system's back
  closed it without blurring the field.
- **The comment-required rule of those forms is unchanged:** a comment is what enables the action (a text that is
  not blank); a reason picked from the list alone does not.
- **A keyboard that takes room** is one rule, `keyboardTakesRoom(frame)` (`src/hooks/useKeyboardVisible.ts`), and every
  reader of the keyboard asks it: `useKeyboardVisible` (`OBottomPopup`, `FloatingButton`, `OrdersSearchForm`, `Chat`),
  `useKeyboardFloating` (`KeyboardScreen`, and `OBottomPopup`'s avoiding views) and `useRevealField`. On iOS it is always
  true: every show event counts. On Android the keyboard takes room only if its end height is above 0 **and** its frame
  reaches the display's bottom within 72 dp (`DOCKED_TOLERANCE`, 56 dp for the tallest system bar plus 16 dp of slack);
  a floating (undocked) Gboard, reported as shown with an end height of 0 or hovering over the content, covers nothing,
  so a sheet or a pinned bar keeps its resting place and does not lift for it. **The tolerance must clear the bar the
  frame stops above, with room to spare.** React Native reports `height` as the keyboard's inset minus the system bars'
  (`ReactRootView`), so a docked frame ends where the bottom bar begins: `screenY + height` is the display's height
  minus 24 dp with gesture navigation, **48 dp with the three buttons (on every phone, whatever its density)** and 56 dp
  on a tablet's taskbar. The tolerance was once 48 dp, exactly the three-button bar, and `>=` was then decided by the
  rounding of the floats (866.28569 against 866.28571 on a 420 dpi emulator): with the suggestion strip off or the
  numbers pad, a docked keyboard read as floating, `KeyboardScreen` turned its avoiding view off and the pinned bar
  (Login, Forgot, Information, the reason forms, the Orders search, the chat's composer) and the accept sheet stayed
  under the keyboard, while with the strip on or a password field it was lifted: a screen that sometimes did and
  sometimes did not. On Android 15+ the window does not resize for the keyboard (`adjustResize` or not, the frame stays
  the display's): only the insets change, and the lift is the avoiding view's (`bottom` = the screen's bottom minus the
  keyboard's top, the same number as the keyboard's `height`). While a keyboard that takes no room is up, `KeyboardScreen` turns its avoiding view off (the view measured
  the floating keyboard's frame against its own bottom and either lifted the bar by the navigation area or flickered between
  the two) and a sheet's second avoiding view adds nothing (its padding left a strip of scrim under the sheet). Each show
  event says what the keyboard is now, so a docked keyboard after a floating one, and the other way round, are followed.
- **The chat's composer** is a pinned bar over the keyboard: with the keyboard up it ends `bottom_bar.base.padding` over it
  (`Chat/styles.ts`, `toolbarKeyboard`; 9.4 pt on iOS, 26 px on a 420 dpi Android), not a gap of its own.

**The order card.** (The owner's decisions of 2026-11-20 and 2026-11-23, in [theme/decisions.md](theme/decisions.md): the business app's
"D1b" on 2026-11-20, changed on 2026-11-23 to its "D3", the status band, keeping the order types' colours and the absolute time.) One
card is an order of the list, an assign request and a row of a group (`PreviousOrders/OrderItem.tsx`; its pieces are
`OrderCardParts.tsx` (the band, the header, the stop line, the chips), `OrderCardActions.tsx` (the quick actions) and the rules in
`orderCardBand.ts`, `orderCardData.ts`, `orderCardTime.ts`, `cardActions.ts`, `nextStop.ts` and, for the type's colour,
`shared/orderTypeVariant.ts`). Top to bottom:
- **Status band**, edge to edge at the card's top: the order's status at its start and its time at its end, on the tint of a tone.
  *Layout.* The band's margins cancel the card's padding (minus the padding at the top and at both sides, plus the padding under it),
  so it reaches the card's border, and its two top corners are rounded to the card's inside (the card's radius less its border
  width). It is drawn that way and **not by clipping the card** (`overflow: hidden`), because a theme shadow on the card's box would go
  with the clip. It is inside the card's pressable, so a tap on it opens the order. It is a row that wraps: the status takes the room
  (`flexGrow` 1, `flexShrink` 1, `flexBasis` 0, at least 40% of the band, so it never shrinks to a column of letters) and wraps to as
  many lines as it needs, never cut; the time keeps its width (never shrinks, at most the band's, right-aligned, `marginLeft: auto`);
  when the status's 40% and the time do not share a line (a large text size, a long clock time) the time goes onto its own line under
  the status, at the end, and at extreme sizes it wraps at its spaces rather than being cut. Both texts are `order_card.base.time_text`
  (12 / 1.5 / 600); the band is at least a `sm` control tall (32), `xs` over and under its texts, `sm` between them. *Tones.* A tone is a
  `badge` soft variant, so the band and the chips of one state agree and the editor changes both: **on time, or no time on the card**
  `primary_soft` (`primary_subtle` with `primary_pressed`), **at risk** `warning_soft`, **late** `danger_soft` (`danger_subtle`; late is danger
  also when the API says in time), and, for an order that is over, how it ended whatever the time:
  **completed** `success_soft`, **cancelled, rejected or failed** `danger_soft` (`orderCardBand.ts`, `bandTone`). **The inks of the three
  state tones are literals of the schema, not the theme's `*_text` tokens** (round 10: those were 4.29, 4.04 and 4.21 against their tints
  on the devices, under the 4.5 that small text needs): `success_soft` `#00713F`, `warning_soft` `#6B5300`, `danger_soft` `#C42543`, which
  the mockup draws, on the unchanged tints (5.68, 6.66 and 5.03; `primary_soft` stays at `primary_pressed` over its tint, 5.18). A test
  (`orderCardBand.test.ts`) computes the WCAG ratio of every tone from the compiled theme and fails under 4.5; the `*_text` tokens are
  untouched, so the error text of the rest of the app is as before. *Not drawn* when
  both texts are absent or hidden, an assign request included (it has neither).
- **Time text.** One phrase, composed as the figure, a space and the catalog's word (`CARD_TIME_LEFT`, `CARD_TIME_LATE`, which read after
  the figure in every language), written only where there is something to write. *Open orders* (the tabs Assigned, In Progress and
  Active, and only on the enterprise plan, `plan_enterprise`): "24 min left", "12 min late" (**late has no "+"**: the word says it);
  the state is `warning` or `danger` by the API's `time_status` (`at_risk`, `delayed`), `danger` whenever the minutes are below zero,
  none (on time) otherwise. The due time is the card's old computation (the delivery time, the UTC one when the order has it, plus
  `eta_time`, ceiled to minutes against the clock); it is written when the row is drawn, not a ticker. The figure is short by rule
  (`formatCardDuration`): "N min" under an hour, "H h MM min" from an hour to under 10 hours, "H h" from 10 to under 48 hours (cut,
  not rounded), "N d" from 48 hours. *Orders that are over* (the History tab, with or without the plan): the
  clock time the order ended (`reporting_data.at['status:N']`, else its delivery time) in the project's time format and its day,
  "12:53 PM · today", "· yesterday" or the project's date. With `orders.absolute_time` on, an open order's text ends in " · due 12:53
  PM" ("6 min left · due 1:05 PM"; the clock time is kept whole by a no-break space, U+00A0).
- **Header.** The store's logo (`OAvatar` `md`, 44; a lock tile for a request another driver holds); the store's name over the
  strong line "#number · customer" (`order_card.meta`, muted, and `order_card.title_text`, 16 / 1.4 / 600; each one line with an
  ellipsis; an order of a group whose other orders are on another tab says "Group No. N · store" on the store line, and an
  assign request of a group says "Group No. N · n Orders" in the strong line); the sync cloud and the unread dot after the
  title; and at the end **the order's total** (`h4`, written as the details write it, `useOrderPayment().total`, never shrinks: the
  title is what shrinks).
- **Stop line.** The glyph of the stop, "Pick up at <store's address>" until the order is picked up and "Deliver to <customer's
  address>" after (the stop is the details' own, `stopStage`), then "· 3.86 km" (the distance text carries its own "· " and the row's `xs` gap is the only space before it; it had a no-break space too and read as two spaces), the driver's distance in the project's unit
  (`useStopDistance().distanceFromDriver`: the details' computation without "from you"). The address and the distance are two
  texts: the address shrinks and ends in an ellipsis, the distance never shrinks. Nothing for an order that is over, for an
  assign request or for an order that has no address; no distance without a real position (the 0, 0 the location hook starts
  with is not one) or without the stop's location.
- **Chips.** One row that wraps. **The order type is written in its colour** (the business app's decision of 2026-11-20, three medium
  tints with dark text, not one per type; `orderTypeVariant(delivery_type)`, `shared/orderTypeVariant.ts`): types 1 and 7 (delivery,
  catering delivery) are `badge` `type_delivery` (violet), 2, 4, 5 and 8 (pickup, curbside, drive thru, catering pickup)
  `type_pickup` (teal), 3 and 9 (eat in, reservation) `type_in_store` (orange); **a missing or unknown type is `neutral`** (the label
  of any other type still says "Delivery", so the chip is grey while reading "Delivery"). The business app's variants also carry a
  `dot` colour; the driver's `OBadge` has no dot and the schema leaves it out. The type's colour is on **the order type's chip, on
  "Delivery #N" and on "Delivery #N" of the order's details** (`OrderDetails/focus/StatusRow.tsx`, the screen of an order in progress, and `OrderDetails/OrderHeaderComponent.tsx`, the assign request's; both were
  `primary`, and round 9 fixed only the second: the devices showed the first; the `testID` is `order-details-position`; "Accepted by driver" beside it
  stays the solid brand badge). **"Delivery #N"** is a pressable `OBadge` (`onPress`, `disabled`, `accessibilityLabel`) in
  the type's colour: it opens the delivery-position dialog, its touch area is a control tall (44) above and below it (not widened
  at the sides), it dims while pressed, and it is **inert and dimmed (the disabled opacity) while the order is on the way to the
  customer, status 23**; it replaces the old `order_card.slots.position` button (the slot is removed from the schema). In a project
  that orders by position, an order with no position yet shows the setter (an icon-only chip) beside the type. "Collect in cash"
  (`warning_soft`) or "Paid" (`success_soft`), and "n items" in muted text. The payment is the details' one rule
  (`useOrderPayment().isCashOnly`): cash only is "Collect in cash"; any other order with a payment event or a method is "Paid",
  wallet plus cash included, as the details treat it; **an order paid on delivery by card (`card_delivery`) shows neither**, since the
  details do not tell the driver to collect it and it is not paid yet. A piece the payload does not carry (no products, no payment)
  is left out, never a placeholder.
- **What each `orders.*` visibility key controls on the card** (and `confirmation.order.total`): `business_logo` the logo;
  `business_name` the store's name (the group's prefix stays); `order_number` the "#number" (the customer stays); `order_status`
  **the band's status text only** (with the time also absent the band is not drawn); `date` **the clock time and day of an order that
  is over**, in its band, and the date on a group's head (an open order has no date on the card); `absolute_time` the " · due …" of an
  open order's time; `order_type` the type's chip, "Delivery #N" and the setter; `quick_actions` the quick actions; and the **total
  follows `confirmation.order.total`**, the details' own switch, so a project that hides totals from the driver in the details does
  not leak them in the list. `orders.title`, `refresh`, `search` and `review_order_button` are the screen's, not the card's.
- **The two settings, in the theme only** (the business app also lets each device change them from its profile: not added here, the
  owner asked for the theme). `orders.quick_actions` (default **on**): off hides the quick actions of an order **and the Accept /
  Reject (or "View order") of an assign request**; the card still opens the order or the request when tapped, and a group's own
  actions are not part of it. `orders.absolute_time` (default **off**): on, an open order's band text also says when it is due; it
  does nothing for an order that is over, whose text already is a clock time. **The one reader is `showsClockTime(theme)`** (`PreviousOrders/orderCardTime.ts`) with the card's own formatter `openOrderTime`: the order card and the route's stops screen (the next-stop band and the late chips of the rows, which wrap) both use them, so "4 d late · due 06:24PM" reads the same in both; the map's panel shows no time; the enterprise-plan rule is unchanged. Both survive the change to the band unchanged.
- **The skeleton** stands for this card (`OrderListItemSkeleton`, laid out with `orderCardStyles`): a band, the card's own `band` style
  (edge to edge, rounded top corners) on the neutral badge tint `badge.variants.neutral.background` (the tone is not known yet), with a
  status bone (40%) and, on the tabs that write a time (`orderCardPieces`: `timer` or `closedTime`), a time bone at its end; the header
  with its logo, name and title bones and a total bone (when the total is shown); the stop line; the chips (the lead bone as tall as a
  badge, 20, wider when the card has its position: a card with its position is 20 high there; **on the Assigned tab and on the combined Active tab of a project that orders by position the lead bone is the setter's chip size instead** (`orderCardPieces().setter`, true for `SETTER_TABS` = `pending` and `active`, never for an assign request and whatever `orders.quick_actions` says; passed as `showSetter`), because an offered card has no position yet and draws the 32 setter: a card with a position there is then about 12 shorter than its skeleton, and the skeleton cannot know per card (in Active, offered cards have no position and cards in progress do: the skeleton is as tall as an offered card, a call recorded in the log); and, for an open order, a **buttons bone** through
  `OCard`'s `footer` (so the card's own gap sits above it), as tall as `button.sizes[order_card.slots.advance.size]` (44) and drawn only
  while `orders.quick_actions` is on. `closed` (passed by `OrdersOption` as `cardPieces.closedTime`, forwarded by `OrderListSkeleton`) is the
  shape of History: no stop line and no buttons bone, as the finished card. An assign request's skeleton has the header and the buttons bone. **In the In Progress tab the skeleton also reserves the route entry's slot** (`OrderListSkeleton` `routeEntry`, a first bone as tall as the entry button, `button.sizes.md.height`, with the button's radius, and the list's `md` gap under it; the entry's size and look are `OrdersRoute/routeEntryLook.ts`, a file of their own so that `shared` imports no component of the route): only while `orders.route` is visible, no search is applied and the tab is In Progress (not Assigned, History or the combined Active). The skeleton cannot know whether the list will have a stop with a location: with none the entry is not drawn and the first card lands 59 pt higher than the first skeleton card; an empty list takes the slot away with the skeleton; a larger button (a theme's size, large text) grows only the real button.
- **Quick actions** (`cardActions.ts`, `cardActionsFor`: the conditions of the order's bottom bar, so the card and the bar offer
  the same step in the same stage), across the width, the negative a third and the positive two thirds, in `order_card.slots.decline`
  (outline, danger, `md`) and `slots.advance` (solid, success, `md`; 44 against the bar's `lg`): offered, Reject / Accept; on the
  way to the store, Arrived to business; at the store, Pickup failed / Pickup complete; on the way to the customer, Arrived to
  customer; at the customer, Delivery failed / Delivery complete. Reject and the failures exist only where the project allows them
  (`reject_orders_enabled`, `failed_pickup_by_driver_enabled`, the project rule of `delosi` for the last step), and none is
  offered for an order that is over, in a group's row or an assign request (which has its own). They are the bar's own paths with
  the bar's guards: **Accept** is one tap and opens the accept sheet (unless `hidden_driver_eta_time` is on, when it sets status
  8 at once), never held; **Reject, Pickup failed and Delivery failed** open their reason form (a tap; Reject says "not allowed"
  when `allow_driver_reject_order` is off); **a step is held** (`OButton hold`, "Guarded actions") only when it fires by itself:
  the location permission granted and no photo, code or location check between the tap and the effect, otherwise it opens the
  same sheet the details open; **"Arrived to customer" with an active location check (status 26) opens the order**, because only
  the details make that check; without the location permission a tap goes to `RequestPermissions`. The change goes through the
  list's own request (`handleChangeOrderStatus`, which loads the list again); offline with the queue on it is queued as one change
  of the order (`queueStatusOffline`), with the queue off the buttons stay painted off and a tap shows the one "No connection"
  hint of the list (`onDisabledPress`, one `useNoConnectionHint` for the whole list).
- **The actions sit outside the card's pressable.** `OCard` takes a `footer`: it is drawn inside the card's box and **outside**
  its `Pressable` (which keeps the box's padding as its touch margin at the top and sides, so the rest of the card still opens the
  order; its `testID` is `order-card-<id>-press`, the box's `order-card-<id>`). With the buttons inside the pressable, a second
  finger that lands while the first holds a button (Android hands it to the first touch's view, wherever it lands) asks the card
  for the responder; the card says yes, the button gives it up, its hold is cancelled and the card opens when the first finger
  lifts. An assign request's Accept / Reject are the footer as well. The pressed look covers the card's body only. **The gap between the
  card's body and its footer, `sm`, belongs to the pressable** (its `paddingBottom`), not to the footer's `marginTop`: a margin belongs to
  nobody, and the strip between the chips and the buttons (about 10 pt) did nothing when tapped; now a tap there opens the order and a tap
  on a button still does only the button's action (padding and not `hitSlop`, because on Android a hit slop outside the parent's bounds
  is unreliable). A card with a footer and no press keeps the gap as a margin of the wrapper.
- **Busy is per order.** A card is busy only with its own change (`submittingRef`, set before the first `await`, so the same
  order is never sent twice); its buttons are painted off meanwhile and no other card's are. A tap on another order meanwhile goes
  through at once as a request of its own; the reload queue waits for every change in flight. An assign request's and a group's
  buttons still use the controller's shared `loadingChangeOrder`.
- **Rows stay while a list reloads.** The controller marks a list `loading` for every reload (the driver's own change, a pull to
  refresh, a socket event) and keeps its orders; `OrdersOption` keeps the rows on screen while the list has any (`hasRows`, assign
  requests included) and draws the skeleton only for a first load or an empty list; the empty state waits for the hold latch, and
  rows the latch still shows count as rows even if the controller's list is already empty. A list that blanked after each step
  took the button from under the finger (the hold latch's lost-touch case).
- **The list's driver position** (`hooks/useListDriverPosition.ts`, used by `OrdersOption`, passed down as `driverPosition`): the
  last real fix, kept at module level for the life of the app; a fix replaces it and the 0, 0 the location hook starts with never
  does; read once on each `reloadOrders` (its own reload, the refresh button, the pull to refresh, the events) and on the screen's
  focus, with no watch and no timer; a failed read keeps the previous fix. The rows' comparator compares it by value.
- **The offline switch follows the loaded config** (`OfflineActionsProvider`, `projectSavesChangesOffline`): a loaded config with
  `allow_save_changes_offline` is on when its value is `'1'`, off otherwise; a loaded config without the key is off; a config not
  known yet is "off", never "on", unless an earlier run left a boolean in storage (`allow_save_changes_offline`), which stands in
  only until the config loads. The provider writes the boolean to storage, so an app opened offline still knows; `OrdersOption` no
  longer sets or removes it. The card, the order's bar and a group's buttons use the same test for "offline", `isNetConnected ===
  false`.
- **A group** is its own card (`OrdersGroupedItem`: its head, the count and the date, and its own actions); its rows are this same
  card nested in it, with no quick actions.

**The route** (decisions of 2026-11-23, [theme/decisions.md](theme/decisions.md); `src/ui/src/components/OrdersRoute/`, the pages `src/pages/OrdersRoute.tsx`
and `OrdersRouteStops.tsx`). Phase 1, built: the orders in progress as numbered stops joined by **straight lines**, and a Navigate button that
hands the stops to a maps app. Phase 2, not built: routes by streets, with minutes, asked of Ordering's API (a provider per project), not
from the app; no map SDK or routing library was added, and the cost of phase 1 is zero.
- **The entry** (`OrdersRouteEntry`, `orders.route`, default on): a full-width outlined button, a route glyph and "Route · N stops"
  (`ROUTE`, `ROUTE_STOPS_COUNT`), in the header of the In Progress list (Active in a combined project), above the first card. It is drawn
  only while the theme shows the route, the tab in view is one of those two, **no search is applied** and at least one order in progress
  has a stop with a location; with the last order delivered it goes. It is also where the route gets its orders: while the list shows
  those tabs the entry hands `routeSource` (a store read with `useSyncExternalStore`) **the very rows the list draws** (the offline queue's
  stages, the delivery positions and `driverOrderStage` are already in them) and the list's own `handleChangeOrderStatus`, so the route
  keeps no second copy and follows every socket event, reconnect and sync that reaches the list. It stays mounted when it draws nothing
  (an empty list is how an open route learns that the last order is gone: "No orders in progress") and clears the source when it unmounts,
  when the tab is not one of the two or when the theme hides the route. With `orders.route` off nothing is published and the two screens
  are not registered in `HomeNavigator`'s stack. The entry is one import and one line in `OrdersOption`.
- **The stops** (`routeStops.ts`, `buildRouteStops`): the orders in progress (an offered, pending or finished order is not one) sorted by
  `delivery_position` ascending, those with no position after them by `delivery_datetime_utc` (else `delivery_datetime`), then by order
  number. Walking them in that order, the first time a store with a pick-up still to make appears **one store stop is added for all
  that store's orders not yet picked up**, and then the order's customer stop; an order already picked up has only its customer stop;
  **the customer of a non-delivery order is never a stop** (`stopStage`). A stop with a missing or invalid location (null, text, out of
  range, 0, 0) stays in the route with `location: null`: it keeps its number and its row ("No location"), and is left out of the map,
  the legs, the totals and the links. Example: 1039 picked up with position 1 at one store, 1042 and 1044 at another store with positions
  2 and 3 give `delivery:1039`, `pickup:store:7` (1042 and 1044), `delivery:1042`, `delivery:1044`.
- **The map** (`OrdersRoute`, `RouteMap`): numbered stop markers in route order (`StopNumber`, `RouteStopMarker`, the next stop solid and
  larger, the others the same disc turned over: surface fill, brand ring and digit), the driver's own disc (`MapMarker party='me'`), dashed
  straight lines between the stops and the driver's leg to the next stop thicker and in a darker blue (`line_next_width`, `line_next_color`), zoom buttons (the same 32 pt `OFab`s with 44 pt touch targets as the other maps), "Fit the
  route" and "Center on my position" under the same keys as the driver map (`map.zoom_controls`, `business_map.recenter`); the camera
  fits on opening, on a change of stops and on the driver's first fix, never after the driver touched the map, and does not animate when the
  theme or the system reduces motion. The theme's keys are `components.map_marker.base`: `stop_size` (28), `stop_next_size` (36), `line_color`
  (`{color.primary}`), `line_width` (3), `line_next_width` (5), `line_next_color` (`{color.primary_pressed}`), `line_dash` (12, range 4 to 32) and `line_gap` (8, range 4 to 24). **The dash is a length on the screen in points, but the two map libraries read it differently** (`OrdersRoute/routeLineDash.ts`): Android takes **pixels** (`MapPolyline.setLineDashPattern` gives the numbers to the library as they come, while only the stroke's width is scaled by the density), so the theme's points are multiplied by the pixel ratio (`PixelRatio.get()`: 12 / 8 points are 12 / 8 dp, as on iOS), and **every route line says `lineCap='butt'`** (`ROUTE_LINE_CAP`): react-native-maps fills in `'round'` when a polyline gives none (`MapPolyline.tsx`), and on Android a round cap draws every dash as a `Dot` and ignores its length (`MapPolyline.java`, `applyPattern`), so *not* setting a cap is not the same as having none; iOS takes **meters along the path** (`GMSStyleSpans`, `kGMSLengthRhumb`), so a fixed number is a sub-pixel tick on a route fitted into a phone, and the points are multiplied by the meters one point is worth at the map's zoom: first **from the fit the screen asks for itself** (`fittedRegion`: the framed box inside the edge-padded area, the limiting side the height or the width less the buttons' column, in Web Mercator, never closer than Google's zoom 21; one place, or stops at one address, give the single-point region), and **the scale has one source at a time**: the app's own moves (the fit, the zoom buttons, locate) set it from the region they ask for; **one** read of `getMapBoundaries()` confirms it when the move has settled (`settleDelay`: 1 000 ms plus 250 ms, or 250 ms with reduced motion); a region report (`onRegionChangeComplete`) is only a reason to read the map, because it is built natively from what the map showed when the event was made and reaches JavaScript later (react-native-maps: `AIRGoogleMap.mm`, `MapView.java`), so the report of the initial region could arrive after the fit and put its scale back (the fine hatch of passes 14 and 15), and `isGesture` is not reliable on iOS: a report is ignored while a programmatic move is in flight (the driver's first touch ends that window), and an answer that returns after a newer move or after unmount is ignored (tickets). The lines are drawn again when the scale changes by a quarter of an octave (about 19%); the zoom buttons work after a fit even before any report. On Android the pattern does not follow the zoom (the scale is unused there): it is the points times the pixel ratio, always. The panel under the map scrolls at the
  largest text size (the map keeps a minimum height).
- **The panel and the second screen.** "N stops · about X km in a straight line" (the total is the driver's leg plus the legs between located
  stops, in the order card's distance format), "See all stops" and the next stop: "Deliver to <address>" or "Pick up at <store>" (the title and the meta line take two lines each at large text; the distance stays one),
  "#number · customer", "Paid" or the cash to collect, its straight-line distance with the caption "straight line", **Navigate**, and the order's
  next-step button. "See all stops" opens `OrdersRouteStops`, a **second stack screen** (a modal sheet over the map could not host the
  accept sheet and the maps sheet on iOS, and a screen gives Android's back for free): a timeline, the next stop as a card with the order
  card's band, the others as rows with their leg distance; a tap on a one-order stop opens the order's details and on a store stop of
  several orders goes to the In Progress list. The band's time and the late badge follow the card's rule (the enterprise plan only; the
  badge only for late, and the most pressing order of a store stop).
- **The step button** is the order card's own `OrderCardActions` with the positive action only (the reject or the failure stays on the
  card and in the details), with the same hold and the same guards; it is shown only for a stop of **one** order (one button cannot be each
  order's own step, hold, sheet and refusal), and `orders.quick_actions` off removes it and Navigate takes the row.
- **Navigate** opens a sheet "Open in a maps app" (`NavigateSheet`) with only coordinates in every link, never an address, a name or a number:
  "Google Maps · the whole route" (`https://www.google.com/maps/dir/?api=1&origin=…&destination=…&waypoints=…&travelmode=driving`; `origin` is
  left out without a fix of the driver; at most 10 stops, 9 waypoints and the destination, the row then says "First 10 stops", otherwise "All N
  stops, one after another"; hidden when only one stop has a location), "Google Maps · next stop only", "Waze · next stop only" (hidden only
  when `getApps` of `react-native-map-link`, asked as the order's map asks it, answers and Waze is missing; shown while unknown or if the call
  fails) and, on iOS, "Apple Maps · next stop only", a note and Cancel (`routeLinks.ts`). The other apps are offered the next stop only. The links open through `useOpenContact` (`canOpenURL`, `openURL` and the app's own dialog on failure); the native
  declarations of the apps' schemes were already in the project. Navigate is not tied to `map.other_maps` and is disabled only when no stop is
  located; the next-stop-only rows are hidden when stop 1 has no location.
- **The door to phase 2** (`routeGeometry.ts`): the screens read only `RouteLeg`s (`path`, `distanceKm`, `minutes`); `straightGeometry` gives a
  two-point path, the great-circle distance (the formula of the order card's) and `minutes: null`, so no time is written anywhere. A routing
  service replaces `straightGeometry` and `routeLegs` in one place.

**The accept view and the group actions.** (Decisions of 2026-11-19.)
- The sheets of `SHEET_ACTIONS` (accept, arrived to business, pickup complete, delivery complete) are presented in
  place by `useAcceptSheet` (`src/ui/src/hooks`), over the screen the driver is on, and that screen hosts them: `OrderDetails/Delivery`,
  `OrdersOption` (for both of its lists) and `OrderDetailsLogistic`. The reason forms (reject, pickup failed, delivery
  failed, order not ready) alone use the `AcceptOrRejectOrder` route; no sheet action navigates there (the route still
  works for a caller that asks for it). **The host stays mounted while the request runs**: a list that empties with the
  answer would take its sheet with it, hence `OrdersOption` and not `PreviousOrders`. The delivery-time sheet of an
  accepted request closes the request's screen back to the list.
- **The delivery time** (the accept sheet's "Delivery time", for a single order and for a group; decision of 2026-11-23, as the business app's
  preparation time): **one number of minutes**, never hours and minutes (`AcceptOrRejectOrder/DeliveryTime.tsx`, over `shared/MinutesValue.tsx`;
  the limits and presets are the app's own, in `deliveryTimeRules.ts`: no server config gives them, `delivered_in` is a free integer of
  minutes). The label, five chips **10 · 15 · 20 · 30 · 45** (the one equal to the figure is selected, also while it is being typed),
  then minus, the figure and plus on the soft fill the dial had; the stepper moves by 5 from 5 to 180, its buttons off at the limits, and the
  default is **20**. A tap on the figure turns it into a numeric field with "min" after the digits, no edit icon and no confirm button;
  nothing is focused when the sheet opens. **Minus and plus never move**: their boxes are as tall as the figure's line
  (`minutesLineHeight`) and the row aligns to its start, so neither the field nor the message under it displaces them. Under the field one
  reserved line says "Minutes, from 5 to 180" (`MINUTES_TYPE_HINT`) or, outside the limits, "Enter a time from 5 to 180 minutes"
  (`MINUTES_RANGE_ERROR`): it is one clipped row of two cells, so it is as tall as the taller text and the sheet does not grow or move
  when one replaces the other. **The typing ends** on the keyboard's Done, on leaving the field, on the keyboard hiding, on a tap on a chip,
  minus or plus (that tap wins), on the sheet's own buttons and **on a tap on a blank part of the sheet** (the title row, the label, the
  padding: `OBottomPopup`'s `onBlankPress`, passed for the accept action only); a tap on the dimmed page ends it first and the sheet
  **stays**, and the next tap on it closes the sheet (`onBackdropPress`; the close icon and the Android back key still close the sheet
  while typing). An empty field restores the previous figure; a number outside the limits is brought to the nearest one **and the sheet
  waits for the next tap** (`flush()` returns `corrected`: "999" shows "180 min" and sends nothing, the next tap sends 180), a number inside
  them is sent on that tap; the delivery position's stepper flushes the time before it acts. The minutes are `delivered_in` online and in the
  queued body offline; the figure's ink is `order_request.base.time_color`. Nothing relied on the old dial's 0 (it sent `delivered_in: 0`
  when nothing was typed) or on its 119; `hidden_driver_eta_time` is not read by the sheet (its callers skip the sheet or accept directly).
- **One rule for success** (`readStatusAnswer`, `AcceptOrRejectOrder/groupOrders.ts`, used through `useGroupStatusUpdate`):
  success means every order changed. A failure keeps the sheet or the page open with the API's message as its inline
  error (`apiErrorText`; `THE_CHANGE_WAS_NOT_SAVED` when the handler gives none; `ORDERS_NOT_CHANGED` with the count when
  only some orders failed) and the action enabled again; the next try sends only the orders that failed; a change queued
  offline closes as before. A request that throws is a failure of every order. **A view answered late does not touch a newer
  one**: `useGroupStatusUpdate` counts the views it serves (every open, close or finish of a sheet bumps the count), and an
  answer that arrives for a view that was dismissed, or replaced by another group's, returns `undefined` and neither closes the
  new sheet, nor writes its error, nor narrows its retry; the list still reloads for a change that did happen, because the
  screen's own wrapper of `handleChangeOrderStatus` does it when the request answers (`useAcceptSheet` and
  `pages/AcceptOrRejectOrder` give the hook the `orders`). The forced-status "Reason required" modal of the list uses the same
  hook: it stays open with the error on a failure, retries only the failed orders and closes on success.
- **What a group is offered from the list.** The list's request (`handleChangeOrderStatus`) sends a plain JSON body to each
  order: it cannot carry a status photo and it does not check where the driver is. So a status in
  `states_requiring_image_driver` is **not offered to a group** (the driver opens each order, whose own view takes the photo):
  that covers 3, 4, 6, 8, 9, 10, 11, 12, 14, 15 and 17, "Accept all" (8) and "Reject all" (6) among them, and a row with no
  button left, with its hint line, is not drawn. A step 3, 9 or 11 whose location check is active
  (`isLocationValidationActive`) opens the existing sheet (`arrivedToBusiness`, `pickupComplete`, `deliveryComplete`) in place
  of the confirmation, and that sheet checks **every** order of the group against its own store or customer, merges and
  dedupes the issues, and stops when no GPS fix is available; with no check the confirmation stays. The body the list's
  request gets is made by `groupRequestBody` (`AcceptOrRejectOrder/groupOrders.ts`): never a `FormData` (a multipart body is a
  failure of every order and nothing is sent) and always with `status`; when a location check ran it carries
  `location: { lat, lng }` for 3, 9, 11 and 26, as the controller adds it for a single order.
- **Offline.** With no connection and `allow_save_changes_offline` the change is queued and never sent as well (a request sent
  and also queued would be applied twice): `update({ dataToSave })` sends nothing and returns each order as it will be once it
  syncs (`{ ...order, ...dataToSave, oldStatus }`, where `oldStatus` is the status the order had before its first queued change:
  `statusBeforeQueue`), and the screen registers each one in the offline store (never a boolean).
  **A group is queued as one change per order**, in one `applyOffAction([...])` call (`{ event, data: { orderId, body: { ...body,
  id } } }`, made by `offlineStatusChanges` in `AcceptOrRejectOrder/offlineChange.ts`: the accept sheet, the reason forms and the
  group's confirmation build their changes with it, so the paths cannot drift). **The confirmation of a group's step**
  (`PreviousOrders.confirmGroupChange` → `runGroupedStatusChange`: statuses 4, 3, 9, 15, 17 and 11 when no sheet is needed) is
  queued the same way offline, through `queueStatusOffline` of that file (one change per order in one write, each order registered
  as `{ ...order, status, unsync: true, oldStatus }`, nothing sent); a queue that returns `false` or throws shows the "not saved"
  toast. **The delivery position chosen in the accept sheet is kept**: it is part of the queued body and of the offline copy
  (`dataToSave` carries `delivery_position`), so the card and the details show "Delivery #N" meanwhile, and it travels with the
  sync (below). **A status with a photo is never queued** (a `FormData` does not serialise: the toast says
  `IMAGE_REQUIRES_CONNECTION` and the sheet stays); a queue that could not be written (`false`) or a handler that throws keeps
  the sheet open with the "not saved" toast, and `submitting` is released in a `finally`. The delivery-time sheet of an
  accepted request does not change the order's status, so its target carries `skipsStatusImage` (set by
  `useLogisticDeliveryTime`): it draws no photo block, does not ask for "Image is required" and is not refused offline for a
  photo, whatever `states_requiring_image_driver` says.
- **The offline queue** (`OfflineActions/index.tsx`) is one list of changes per order in the storage (`offline_actions_array`).
  `applyOffAction` takes a change or a list of them and is **serialised**: each call reads the storage on top of what the one
  before wrote, adds its changes (written in one go for a list) and then updates the state, so calls in a row from one render's
  closure all stay (building from the state kept only the last order), and a failed write does not stop the next call.
  `registerOffOrder` is serialised too: it takes the order out of every stored list it is in (an order stored inside a group as
  the list draws it, `[[key, orders]]`, included: `flatOrders`) and puts it in the list of its new status, so a second change
  of an order leaves no copy behind.
- **What the offline list shows** is the stored lists **with the queue applied on top** (`applyQueuedChanges`,
  `offlineActionsQueue.ts`), not a copy of what was stored: an order the queue holds a change for shows the status of its last
  queued change and the delivery position chosen, carries the sync mark (`unsync`) and sits in the list of its new status (the
  tabs' tags say which), wherever the stored copy is, in a group or not; an order the queue does not touch stays where it was.
  A group's buttons follow the queued stage, because they come from its first order's shown status ("Arrived to business" is
  not offered again after it was queued; "Pickup complete" and "Pickup failed" are). `OrdersOption` draws the lists again when the
  queue changes (`queueKey`) as well as when the stored orders do, and a load that left a tab loading or in error while offline
  is replaced by the stored lists again. The skeleton is held only while going offline.
- **No reload path runs offline.** `reloadOrders` and `reloadRequests` do nothing without a connection, checked when asked and
  again when the queued load starts; so do the load of a next page and the pull to refresh. Offline, a `loading` flag of the
  controller (orders or requests) is ignored: the list draws what it holds, or "Network Error" when it holds nothing, never a
  skeleton for good. The controller's own load of the requests on a tab selection cannot be guarded without editing the
  submodule: the display rule covers it. A tab never visited offline keeps its snapshot from before until it is opened.
- **After a sync run the list loads once** (`offline_order_updated`, emitted once per run, after every request of the run
  answered and the queue was written, with the ids sent and dropped; nothing is emitted when every change failed). `OrdersOption`
  asks its reload queue, so the rows show what the server holds (a dropped change shows the real stage) with no pull; if the
  screen still thinks it is offline when the event arrives, the load waits for the connection. When the connection returns the
  offline copies of the lists are discarded: the next stretch offline starts from what the lists held then.
- **The mark and "Pending sync changes" follow the queue only** (`isOrderQueued`): the cloud on a card (`OrderItem`) and the
  notice of the order's details (`OrderDetails/Delivery`) show while, and only while, the queue holds a change for the order. A
  copy that says `unsync` decides nothing (it goes stale: a list that was not reloaded, the snapshot a route was opened with). A
  change that failed to send stays in the queue and keeps its mark, and the banner and the marks clear together. Online, a
  waiting change keeps its stage and its position on the card in place (`showQueuedStages`) over what the server returned, so a
  refused change does not jump back; only a dropped change puts the server's stage back. A card shown online for a queued change
  can sit in the server's tab, not the queued stage's: it is not moved between tabs online.
- **The banner follows the queue.** Offline with a last-update date: the danger notice "Last Update: …" with "_n_ changes
  pending sync" under it. Otherwise, while the queue holds a change (online and retrying, or offline before a last update is
  known): the count alone in an `info` notice (`orders-sync-pending`). "Last update" and the offline color are about the
  connection, so they stay offline-only.
- **The sync run** (`OfflineActionsProvider`): one at a time; a trigger that arrives while one runs sets a rerun flag (the timer's
  does not). It reads the queue, replays it order by order and writes its results **on top of what the storage holds now**
  (`applyRunResults`), never over its own snapshot, so a change queued while the run goes is kept. Per order it sends the last
  change's body (`bodyToSync`), with the latest delivery position of the earlier changes when the last has none: the accept's
  position travels with a step queued after it. The earlier changes are told to the business **once**, as a chat message
  `key: 'value'` (marked `told` when the post went out; a retry never posts it again, and a post that failed is tried again).
- **What a request came to** (`classifyAnswer`, from the SDK's answer: it resolves a 4xx and rejects a 5xx and a network error):

  | Answer | Outcome | The queue | The driver |
  |---|---|---|---|
  | No answer, a network error, a 5xx, a 408, a 429 | Transient | The change stays; the schedule tries again | Nothing is said; not counted |
  | A 4xx with the API's error (not 401, 408, 429) | Refused | The change stays with `attempts` + 1 (kept on its last change, so a restart does not start again) | An error toast; the third refusal drops the change |
  | The third refusal | Dropped | The order's changes the run read are removed | A toast "The change to order No. _n_ was not applied: _reason_" (`OFFLINE_CHANGE_DISCARDED`); the list loads once and shows the server's stage |
  | A 401 | Left alone | Stays, as it always did | Nothing; not counted; not retried by the timer (a reconnection or a return to the foreground tries it again) |

  A refusal toast reads "The change to order No. _n_ could not be sent: _reason_" (`OFFLINE_CHANGE_NOT_SYNCED`), error kind, the
  reason through `apiErrorText`, the number through `maskOrderId`; several orders in one run give one toast, the first one's text
  and "and N more" (`LIST_AND_N_MORE`). A run that drops anything tells only the dropped ones that run. Every run that gets a
  refusal tells it again, so a refused change that is retried tells it each time.
- **The retries.** After a run that left a transient or a refused change and a non-empty queue, with a token and a connection, the
  provider tries again after **15 s, 30 s, 1 min, then every 2 min** (`retryDelay`); a run that sent something starts the
  sequence again, and so do the connection coming back and the app returning to the foreground (both also run at once). No timer
  exists while the queue is empty; the timer stops when the queue empties, when the connection goes, on sign-out and on unmount.
  The timer is JavaScript's, which Android may throttle in the background: the foreground trigger covers that. The sync is
  started by the system's **default** network only (`useNetInfo().isConnected`, which on Android follows
  `registerDefaultNetworkCallback`); a validated network that is not the default does not start it (the requests go through the
  default one), so the run starts when the default network is up: on the emulator that was 21 s after the radios were switched on in
  one pass (the emulator's Wi-Fi taking about 20 s to validate; the app did not act on the cellular network validated earlier)
  and about 3 s in another. The wait is the system's, not a timer of the app.
- **No connection, queue off.** A button painted off for lack of a connection still answers a tap: `OButton`'s `onDisabledPress`
  runs (never `onClick`; no hold starts and "Hold to confirm" is not said) and `useNoConnectionHint()` shows one info toast, "No
  connection. Try again when the network is back." (`NO_CONNECTION_TRY_LATER`, 2000 ms), at most one per tap and none while the
  previous is still on screen, on any button of the screen. The button keeps its disabled look and reads as disabled to a screen
  reader (`accessibilityState.disabled`); Pressable's own `disabled` overrides that state even when `false`, so it is left unset
  whenever the button must still answer. A button that is `loading` takes no tap. `FloatingButton` passes `onDisabledPress` to all four
  of its buttons; `OrderDetails/Delivery` gives it to its five bars only offline with the queue off; the orders list gives one to the
  order card's quick actions (`OrderCardActions`) and to a group's buttons, the same `useNoConnectionHint()` for every row of the list.
- `AcceptOrRejectOrder/driverActions.ts` holds the action and title maps (`DRIVER_ACTIONS`, `DRIVER_ORDER_TITLES`,
  `DRIVER_APP_TITLE`) and the pages import them. The keys that travel in `DRIVER_ORDER_TITLES` are not seen by the i18n
  scan: `AcceptOrRejectOrder/__tests__/catalog.test.ts` holds them to the catalog, so a new one is added to the catalog by
  hand with an English equal to the code's fallback.
- **The reasons of a reason form are listed rows**, not boxed cards: `ChoiceRow` `listed` (a `choice.sizes.md.height` pitch, the
  content centered in it, a thin divider under each row and none under the `last`) with the drawn radio ring of
  `radio.base.size` (the primitives' table). The selected row is told by its mark and by the weight its text has; no logged
  decision had made them cards.
- The labels inside a sheet or a reason form are the field label's role with a muted description (`BlockLabel`). The
  status photo is one tile in two variants: 120 high with a 28 glyph in a sheet, a 72 row in a reason form; once taken
  it is a 72 thumbnail with "Remove image", 44 high, filling the row (`order_request.base.photo_size`,
  `photo_tile_height`, `photo_tile_icon_size`). The proof photo is only uploaded: `useStatusImage` passes
  `saveToPhotos: false`.
- **A group** is more than one order of the same `cart_group_id` (a group of one behaves as the single order). Its title
  is the action with the count ("Reject 2 orders", "Accept 2 orders", "Pickup failed for 2 orders", "Delivery failed for 2
  orders", "2 orders not ready", "Delivery complete for 2 orders", "Arrived to business for 2 orders", "Pickup complete for 2
  orders": `groupTitles` in `AcceptOrRejectOrder/index.tsx`, `ARRIVED_TO_BUSINESS_FOR_ORDERS`, `PICKUP_COMPLETE_FOR_ORDERS`); the bar's subtitle is "Group No. N" (the word, a space, the number: **one helper**, `groupLabel(t, id)` in `utils/groupLabel.ts`, for the list's card and its rows
  (`OrdersGroupedItem`, `OrderItem`), the sheet and the forms; a screen never joins the word and the number itself, which is how
  the list once read "Group No.57"); the orders'
  numbers are the first line of the body ("Orders No. 3504, 2876", `body_sm`, muted, one line, ellipsis) and in a sheet one
  line, "Group No. N · Orders No. …". The notice about the customers is plural when the orders have several, and the
  singular is kept when they share one; the call lead and its button show only when every order has the same known
  customer; the reject form says "Mark the orders as rejected"; the delivery-position question speaks of "these orders"; the
  "Collect in cash" recap is not drawn for a group (it would show the first order's). A logistic group's accept sheet follows
  the same rule.

**Launch, session and lists.**
- The launch's time limit (`useLaunchTimeLimit`) opens the app when the launch has not opened by its limit: the
  session is read from the device and no gate waits for the API any more. It also rescues a launch that has *loaded*
  but is stuck on the permissions with no system dialog up (a dialog the driver leaves open is not a hang: the limit
  is counted again from the time it goes). Its notice ("Network Error") is only for an API that did not answer, never
  for a launch that had loaded.
- The Messages list is asked for only once there is a session (a token and a user), and again when the user changes
  (the tab is built at launch, before sign-in: a request that left earlier was answered 401). A list that failed is
  never kept: the controller carries the old error into a new answer, so any new request made while the list is in
  error (refresh, a page, another sort) starts a new controller (`restart`). Nothing is counted while the list is in
  error: the tab shows no number the app cannot know.
- **The location permission and the Map tab.** The tab picks the map or the permissions screen from the permissions
  context (`MapTab` in `BottomNavigator.tsx`) and asks the system again every time it gains focus, and the context
  asks again when the app returns to the foreground, so a permission taken away while the app runs shows the
  permissions screen on the next foreground or tab visit, and granting brings the map back on the same tab. The
  permissions screen does not `goBack()` when it is a tab's screen (granting used to send the driver to Orders).
- **Leaving Information or Password** asks "discard changes?" only when a value differs from what the screen opened
  with (`differsFromOpened` in `UserFormDetails`: typing a letter and deleting it is no change); Update is enabled by
  the same rule.
- **A row of badges wraps and keeps them whole.** The order's status row (`focus/StatusRow.tsx`) does not wrap as a whole:
  its badges are one group that takes the room the time leaves and wraps among its own chips (each keeps its text whole)
  only when the room is really short, and the time stays at the row's end (with no badges, alone at the end). The order
  card's chips row wraps (the type chip never shrinks), and its status and time are the band's ("The order card", above: the status
  wraps to as many lines as it needs and the time goes under it when both do not share a line); the card's skeleton follows. The comment's card trims the blank lines at its start and end (`orderCommentText`, in both order views).
- After a wrong delivery PIN the delivery sheet says the cause first ("The code does not match") and the wait second;
  the accept sheet's delivery time is one figure of minutes ("The delivery time", below).
- The profile's schedule row says today's hours also for a driver with no schedule of his own: the week the schedule
  screen draws for him (every day, all day: `allDayWeek`).
- **The orders list reloads after the driver's own change**, without depending on a socket: `OrdersOption`'s
  `handleChangeOrderStatus` wraps the controller's and, once the API has answered and the change took for at least one
  order, loads the list again once (the refresh button's own reload), asked inside the tracked change itself (there is no
  `changesAnswered` state any more). It is the one place; the cards, the sheets and the group actions all pass through it.
- **Reloads are one at a time, and rows keep no old closure.** The controller's loads cannot be cancelled and each writes a
  whole-list snapshot when it ends, so two at once leave the answer of the last to end, and one that overlaps the driver's own
  change can bring back a request that was just answered. `OrdersOption/useReloadQueue.ts` orders them on the app's side: one
  reload per list (the orders, the assign requests) at a time; one asked meanwhile is kept and run once afterwards (the last
  asked, after the render that carries what the first one loaded); none starts while a change of the driver's own is on its way
  (`track`: a status change, an answer to a request, the delivery-time save), and it runs when the last one ends; a load that
  never answers is given up after 30 s, so a hung request cannot block the lists. Every reload goes through it: focus, a position
  event, refresh, reconnect, a tab request and the one after an own change. The rows of the lists stay memoized (a socket event
  must not redraw every card), so they get **stable handlers** (`PreviousOrders/useStableCallback.ts`: `pressOrder`,
  `logisticAction`, `statusText`, which always call the latest handler), and the comparator (`areListedOrderRowPropsEqual`)
  also compares the kind of row (`isLogisticOrder`, `hideBtns`, `inGroup`), the handlers by identity, the driver's position by value
  and, for an assign request only, the controller's `loadingChangeOrder` (an order's card is busy with its own change); the handler the
  assign request's screen gets through the navigation params is the latest one too. A row holding the closure of an old render
  wrote a whole list from it and made a request that arrived meanwhile vanish (or an answered one come back). `OrderItem` has no
  memo of its own: `OrdersList` is the one gate.
- **A change of the driver's own made outside the list reloads the lists once, without the socket.** The order's details (the
  bar's steps, the accept sheet, the reason forms, the photo and PIN sheets) and the assign request's details change an order through
  their own handlers, which do not pass through the list's wrapper; the only other road to a reload was the socket, which is not
  connected on a local setup and drops in the field, so the list and the details opened from it (the details show the row's
  snapshot and do not load the order) stayed on the old stage. Now a screen announces its change with the app's event
  `driver_order_changed` (`useAnnounceOrderChange`, `src/ui/src/hooks`: the `useEvent` bus, payload `{ orderIds, request?, accepted? }`,
  a stable function that still works after the screen is gone, because a reject goes back before its answer arrives): **one emit per
  successful change, made by the one place the screen's changes go through** (`sendStatusChange` in `OrderDetails/Delivery.tsx`,
  which also counts the sheets' changes as in flight for `useRefetchAfterMutation`; `answerLogisticRequest` / `answerRequest` and the
  delivery-time save in `OrderDetailsLogistic`), when the API answered and the order changed. **Nothing is announced for a failed or
  thrown change or for one that was only queued offline** (a load would put the old stage back over what was queued), and the list's
  own path announces nothing (it reloads itself: one load per change). `OrdersOption` listens once and asks its reload queue, so the
  load waits for a change of the list's own that is on its way and joins any load already asked for; offline it does nothing; an
  answer to an assign request reloads the requests, and an accepted one the orders too.
- **Filters mean the applied ones.** `hasSearchFilters` of `OrdersOption` comes from `appliedSearch`, set by "Search": typing in
  the form changes nothing behind it (the list no longer flips to the filtered view while typing, and a reload asks for the
  statuses of what is applied), closing the form drops the draft and the summary reads what was applied.
- **Which set of tabs is decided before the tabs are painted.** A project that combines pending and in progress
  (`combine_pending_and_progress_orders` = `'1'`) has two tabs (Active · History), any other has three (Assigned · In Progress ·
  History). The decision is `projectCombinesTabs(configState)`
  (`context/OfflineActions`, the rule of `projectSavesChangesOffline`: `true` or `false` once the config is known, a config that
  loaded without the key says "not combined", one that has not loaded or failed says nothing). **`OfflineActionsProvider` is the only
  place that stores the value**: it reads what an earlier run kept (the boolean under the storage key
  `combine_pending_and_progress_orders`) when the app starts, keeps it in `isCombinedTabs` with a `combinedTabsRead` flag, and writes the
  loaded config's value as it changes; the kept value stands in only until the config loads, a late read never overrides the config
  and a stored value that is not a boolean is ignored. **`useCombinedTabs()`** (`OrdersOption/useCombinedTabs.ts`) returns
  `{ combined, pending }` in the render that paints the tabs: the loaded config, else the kept value, else `pending`. The screen reads
  nothing from storage, writes nothing and removes nothing of that key (the online start no longer removes it), passes `combineTabs` and
  `tabsPending` to the controller (which reads `combineTabs` once at mount) and calls its `setCombineTabsState` when the value is known
  or changes. **While it is `pending` the screen holds its tab bar** (a bone as high as the bar, `orders-tabs-pending`) **and its list**
  (the skeleton; what the controller loaded meanwhile may be the other set's and is not shown, nor an empty state): pending is nothing
  kept and the config still loading, or the kept value still being read; with nothing kept and the config failed (no connection) the
  default is drawn, three tabs, since holding for ever offline would be worse. There is no splash gate that waits for the configs, and
  the hold appears on a first run after this change with nothing stored. Left: a project that combines the tabs, nothing stored, opened
  offline and then online draws three tabs and then two (it cannot be known offline); `NewOrderNotification` still reads the config
  directly for its requests button.
- **The Orders tabs** (decisions of 2026-11-23, [theme/decisions.md](theme/decisions.md)): **Assigned · In Progress · History**, or
  **Active · History** in a project that combines pending and in progress. "Assigned" is what the old "Pending" tab was meant to be: the
  orders given to the driver that he has not accepted yet (the ones whose card offers Reject / Accept); the completed and the cancelled
  orders are one tab, History, with a row of chips under the tabs to narrow it, **All · Completed · Cancelled** (`FilterChip` `sm`; the
  chips are a `radiogroup` labelled "History", each announces its selected state; the tabs keep `role="tab"`). The rules are pure
  (`OrdersOption/orderTabs.ts`) and the selection and the loading are `OrdersOption/useOrderTabs.ts`.
  - **The controller's lists are not the tabs.** `OrderListGroups` loads one list at a time (`currentTabSelected`) and each load writes a
    whole snapshot, so two at once lose data: the selected tab is **the screen's own state**, and the controller's list is only how the
    app gets lists loaded (the screen puts the controller back on the list the tab needs). Nothing the controller does moves the tab (its
    effect on `combineTabs` is the only path that moves its own, and the app tells it a value only when that value really changed). The
    tab changes on a tap on a tab or a chip, on the new-order alert's "View orders" (`tabRequest`) and when its tab disappears (the first
    tab, History staying). The screen opens on the first tab, whatever it holds.
  - **An order is placed by its status, not by the list it came from**, after the offline queue's stages are applied (an order accepted
    offline moves to In Progress at once, with its mark): the pending tags (0, 13) are Assigned; an in-progress status is Assigned when
    `isOfferedStatus(driverOrderStage(order).effectiveStatus)` (4, 7 or 14 with no stage of the driver's own since the assignment), else
    In Progress; the completed and cancelled statuses are History.
  - **What each tab asks for:** Assigned the `pending` list and then `inProgress` (the offered orders are in it), In Progress `inProgress`
    only, History All `completed` then `cancelled`, merged, **latest ended first** by the time the card's band writes
    (`reporting_data.at['status:N']`, else the delivery time: `endedAtMs`, a copy of the card's rule), each chip its own list, Active
    `active`. Lists are asked one after another. **Load more** asks the next page of each underlying list that has one, one after
    another; a tab whose share is empty while its lists still have pages shows "Load more orders", not "no results".
  - **The newest copy of an order wins.** An order that is in two lists (it left In Progress outside the app, while the driver sat on
    History: the in-progress list still held its old copy and won because it was "native" to its list) is taken from the copy with the
    later `updated_at`; with equal or missing `updated_at`, from the list loaded most recently; and it is placed by that copy's status.
  - **A reload** (Refresh, pull to refresh, the driver's own change, a reconnect, the queue's sync, an event from another screen) is the
    controller's own, `loadOrders({ newFetch: true })`, on the first list the tab needs, which keeps its rows on screen; the tab's other
    list loads through the controller's effect, and the app keeps that list's previous rows meanwhile, so no skeleton appears over rows.
    Lists of other tabs are marked not loaded and reload when opened: that is how a finished order shows up in History. **One request
    per list:** when the selection moved in the same commit the reload starts one microtask later (`controllerLoads`), because the
    controller reassigns its render closure's `ordersGroup` inside `loadOrders` and its own effect on the selected tab then saw an
    unloaded list and asked again (a Refresh used to send `pending` twice). While a search is applied, the applied filters replace the
    tabs and the results reload as before; clearing them returns to the same tab.
  - **The alert opens the tab of the status** (`viewForStatus`): 0, 13, 4, 7 and 14 open Assigned, the other open statuses In Progress,
    a finished order History (All), an unknown one the first tab, and in a combined project an open one Active. The summary table still
    reads the `completed` and `cancelled` tags of the wrapper's `tabs` prop, and `OfflineActions` stores an order registered offline at
    22 to 26 in `active` and `inProgress` as the controller does (it stored them under `cancelled`).
  - **The cards get a plain copy of the order, without the SDK's `api`** (`withoutApi`, one cached copy per order, so a row that did not
    change is not drawn again): every order of the SDK carries its client, and opening one as a navigation parameter warned that it was not
    serializable.
- **The lists' loads are bounded, and a failed load keeps its rows.**
  - A load the controller started is waited for at most `LOAD_LIMIT_MS` (20 s) per list, and a request of the app's own as long
    (`inFlight`); after that the next load goes out and its answer replaces the stuck flag, and a hung list's skeleton ends. Before this
    a GET that never answered on the flip of the network (sent as the connection changed, before the sync's PUT) held every Refresh, pull
    and tab switch for good, and the lists stayed on the old copy until a relaunch.
  - **The queue's sync holds the lists** (`holdLoads`): `OfflineActions` has a `syncing` state, true only while a run has queued changes
    out and still true when it emits `offline_order_updated`; while it is true no list loads and a reload waits; the screen waits for it
    at most 45 s (`SYNC_HOLD_LIMIT_MS`), and a sync request that never answers (`SYNC_REQUEST_LIMIT_MS`, 30 s) counts as transient (the
    change stays queued, the run ends). On `offline_order_updated` the screen keeps the last queued stage of each order sent, so the
    order stays in In Progress and not back in Assigned until a reload asked after the sync lands (a reload that finishes clears only
    the stages made before it started) or 60 s pass (`HELD_STAGE_LIMIT_MS`); then the server's list wins.
  - **A load that fails for lack of network never replaces rows the screen knows** (`isNetworkFailure(error, offline)`: the controller's
    `ERROR` with no message, a network message, or any error while the connection is off; an answer of the API with a connection is not
    one). The failed list keeps its last rows (`lastRows`, `knownRows()`), the tab does not show its error while rows are known, and the
    offline banner says why. **What is stored is never overwritten by a wiped list**: `applyStoredOrders` captures list by list, and a
    list drawn from the offline store is marked `fetched` so the controller does not also load it.
  - **Offline with the queue on**, an emptied tab says its own empty text and has no Refresh button when the stored lists hold orders;
    "Network Error" stays for no stored lists at all, a failed online load and a project with the queue off. History All keeps its
    skeleton until **both** of its lists have answered (`holdRows`), so it never paints the first list alone.
  - **On reconnect the lists reload once, by themselves.** After the phone's connection has held `RECONNECT_SETTLE_MS` (1.5 s) the
    screen reloads through its reload queue (one request per list), waiting while the queue's `syncing` is true (bounded by `syncExpired`)
    and reloading once after it, even when the run sent nothing; a flap counts once, a failed reload is not retried (the next return is
    the next try). The phone's signal and the socket's catch-up (`useOnReconnect`, about a second after `connect`) both announce the end
    of an outage: `catchUpOnce` lets whichever comes first reload and the other do nothing within `CATCH_UP_COALESCE_MS` (10 s, a guess at
    how long the socket takes after the network: one line to change); it does not mark the window while offline and defers while the queue's
    sync holds the reload.
  - **Each tab has its own empty text:** `NO_ORDERS_ASSIGNED` "No orders assigned", `NO_ORDERS_IN_PROGRESS` "No orders in progress",
    `NO_ACTIVE_ORDERS` "No active orders", and in History `NO_ORDERS_IN_HISTORY` "No orders in your history", `NO_COMPLETED_ORDERS` and
    `NO_CANCELLED_ORDERS`; the requests tab ("Assign requests") has its own, `NO_ASSIGN_REQUESTS` "No assign requests" (the owner, 2026-11-23); `NO_RESULTS_FOUND` ("Sorry, no results found") only for a search or filters with no match, which win over the tab's text. **The Messages tab's is `NO_MESSAGES_YET` "No messages yet" with the line `NO_MESSAGES_YET_HINT` "Chats with customers and stores appear here. To start one, open an order and tap the chat button."** (the owner, 2026-11-24; the tab has no search or filter that could empty it, so it never says "no results"). (The controller's
    gotcha, for a caller: it reassigns its render closure's `ordersGroup`, so the app never calls `loadOrders` in the commit that
    changes the selection.)
- **The requests button of the Orders header is a switch.** It opens the assign requests and, pressed again, goes back to
  the orders tab the driver was on (`lastOrdersTab`). Selecting the requests tab while it is open used to leave its
  skeleton for good (the submodule's controller sets `loading` on every selection but loads only when the tab changes), so
  the app does not select a tab that is already open: the button goes back, and the new-order alert's "View requests"
  with the requests open loads the list again.
- **The search by order number** sends the text through `OrdersOption/searchText.ts`: the controller is asked for the
  encoded form (`SEARCH_ENCODES_PERCENT`) on both platforms, because the SDK writes the `where` into the query string as
  it is and iOS read a raw `%3460%` as "4", "60" and "%" (the search returned nothing); `&`, `#` and `+`, which
  `encodeURI` leaves and a query string would cut, go as the single-character wildcard of `ilike` (the search is then wider than
  what was typed: "a&b" also finds "axb"); `;` and `=` go as typed, whole (a query string is split at `&` and at the first `=`). (Upstream, the SDK
  should encode its query values; until it does this is the app's way.)
- **The Messages tab lists only the orders that have direct messages** (the owner's decision of 2026-11-24, [theme/decisions.md](theme/decisions.md)):
  `MessagesOption` hands the `Contacts` controller (the library at `d5df1de`, PR #435) two module constants,
  `orderConditions={[{ attribute: 'last_direct_message_at', value: { condition: '!=', value: null } }]}` (the controller sends it as the
  orders request's `where`: `{"conditions":[…],"conector":"AND"}`, with `orderBy` from the sort in the same request, on the first page,
  "Load more", a pull to refresh, the catch-up and a sort change) and `orderFilter={(order) => !!order?.last_direct_message_at}`
  (what a real-time event may insert: a `message` of an order not in the list fetches it and inserts it when it passes, so a first
  message makes the conversation appear; an `update_order` or `orders_register` of an order with no messages is not listed; an order
  already in the list is updated or moved to the top as always, and an event never removes one: that waits for the next fetch). The
  pages and totals are the server's for the filter, so "Load more" shows only conversations. Both sort chips still work ("Newest" is
  `last_direct_message_at`, "Order number" `-id`). The empty list says `NO_MESSAGES_YET` over `NO_MESSAGES_YET_HINT` (see the empty
  texts, above). **The tab's badge is unchanged in meaning:** the sum of `unread_count` of the orders the list has loaded (no request
  of its own), with a "+" while the list has more pages; orders with no conversation had none to count, so the filter only lets the
  first page hold more conversations, and the number can read higher than before. To write about an order with no messages the
  driver opens the chat from that order's details (`Delivery.tsx`, `handleOpenMessagesForBusiness`; its button shows with the
  `confirmation.order.messages` visibility, not only when there are messages).
- **A Messages row is titled "#number · store"** (the owner's decision of 2026-11-20, [theme/decisions.md](theme/decisions.md)): one
  `OText` of one line with an ellipsis at its tail, the number first so only the end of the store's name is ever cut (`message-title`,
  bold while there are unread messages), the masked id of a secure project written as the card writes it; the second line
  (`message-meta`) is the date alone, and the row stays `list_row.base.tall_min_height` (76) whatever the length of either. The
  title is made by the helpers of `src/ui/src/utils/orderTitle.ts` (`ORDER_TITLE_SEPARATOR` " · ", `orderNumberTag(shownId)` giving
  "#id" or nothing without an id, `joinTitle(parts)`), which the order card's header also uses, so the two share one separator. The
  row has an `accessibilityLabel` built from what it shows (title, date, status, timer and unread count, joined by ", "); how a
  screen reader reads the "#" and the "·" was not tried.
- **The chat's history** (the order's changes shown in the thread, `Chat/changeEntries.ts`, `describeChange`) never prints
  "undefined", "null" or "false": a side with no value drops out of the phrase ("Order _attribute_ set to _to_", "Order
  _attribute_ removed": `ORDER_ATTRIBUTE_SET_TO`, `ORDER_ATTRIBUTE_REMOVED`), only the attributes the app has words for are
  shown (any other attribute of the API's logbook is skipped, never drawn as its raw code) and an entry with nothing to say
  leaves no bubble.

**Real time.**
- **Catching up.** `SocketReconnectProvider` / `useOnReconnect` (`src/context/SocketReconnectContext.tsx`, provided by
  `HomeNavigator`) is the one place that decides "reconnected": the first connect of a healthy socket does not count, but a connect after a `disconnect` **or after a `connect_error`** does (a start that
  failed for a minute and then connected was taken for a first connect, so an order assigned in that minute never loaded nor alerted: a
  failed attempt now counts as down, and does not cancel a foreground wait that is running); a connection
  must hold for 1 s before the screens are told (a flapping one asks once); returning to the foreground after 30 s or more
  in the background counts (`inactive` does not). What loads again: the orders lists and the requests (`OrdersOption`), the
  Messages list and its counts, the open order's details (the order and its messages), the assign request's details and
  the chat. **A catch-up never races a change of the driver's own**: `useRefetchAfterMutation` (`src/ui/src/hooks`) counts the
  changes a screen runs (`track`: they count as in flight until they settle, resolved or thrown) and loads once, afterwards, a
  catch-up asked meanwhile (`catchUp`; also while the controller's own `order.loading` is true). `Delivery` and
  `OrderDetailsLogistic` (accept and reject) use it.
- **One unread count, three places:** `order_message_read` drives the Messages list's row, the tab's badge and the count in
  the order details' header (`useUnreadMessagesOfOrder`). What was read is kept per order (message ids are global: a larger
  mark of one order never hides another's messages), and a read that arrives while the messages are still loading clears the
  ones that arrive with the load (the hook's fourth argument, `loading`), and is forgotten if the order changes.

- **The rooms** `HomeNavigator` joins (`orders_<id>`, `messages_orders_<id>` and the drivers room; `orders` and `messages_orders` for level 0)
  are joined **once per user, level and project** and left in the effect's cleanup, with the same three objects: the wrapper
  (`socket.js`) counts joins per room key (an object's key is its `JSON.stringify`, so the same keys in the same order leave what they
  joined), holds joins made before the connection and joins every room with a count above 0 on each `connect`, and its `leave` is debounced
  by 500 ms. The effect no longer depends on connectivity (it re-joined on every flip and the count only grew, so the rooms of a user who
  signed out were never left) and does nothing without a user id.
- **Profile refreshes the user once per entry to the tab**, not on every navigation `state` event while it is focused (each refresh gave
  the shared logic a new `session` and re-ran its effects). It is a mitigation: the listener leak it aggravates is upstream (below).
- **The connection pill and its sheet are the business app's, ported** (decision of 2026-11-23; `WebsocketStatus/`). The pill sits in the
  Orders header behind `visibility.connection_status`: a dot and one word, **Live** (`success_soft`), **Reconnecting** (`warning_soft`) or
  **Offline** (`danger_soft`), in a `badge` `dot`, **as wide as its label, up to `badge.base.dot_max_width` (140, one line with an ellipsis), and the Orders title wins over it** (`ONavbar` `titleFirst`: the owner's decision of 2026-11-23, which replaces the business app's rule that the pill is as wide as its widest label so that its neighbours never move; Refresh and Search now shift a little when the state changes, and at the largest text the pill shrinks and "My orders" shows whole), a `md` control tall to the
  touch (`minHeight` and `minWidth` 44), with the accessibility label "Connection: <state>". **Offline** is the device's network (`isNetConnected === false`);
  **Reconnecting** is the socket down or connecting while the network is fine; a live socket that drops is told only after `SOCKET_GRACE_MS`
  (3 s), while offline and every recovery show at once (`connectionState.ts`). A tap opens the sheet, `ConnectionHost`, mounted **once**
  by `HomeNavigator` next to the new-order alert (inside `SocketReconnectProvider`, so it shows over every tab and screen): an
  `OBottomPopup` "Connection" with a tinted tile of `components.icon_tile` (a glyph: a check, a sync, a cloud off), the state's name and
  description with "Last update <time>" (the newer of the socket's connect date and the last `order_added` or `order_updated` event
  that the lists emit, in the project's time format: `formatClockTime` takes a `Date`), a **Server** row (Connected, Connecting,
  Disconnected), a **Notifications** row (On or Off from `checkNotifications()`, read each time the sheet opens, left out when the read
  fails), the button **Reconnect now** (it drops a stale socket and calls `connect()`, shows it is working for up to 4 s or until the socket
  says it is connected, and triggers the app's existing reconnect catch-up) and the note "If orders stop arriving, check your Wi-Fi or mobile
  data." Left out of the business app's sheet: its printer row (the driver has no printing module). The old dialog, its legend of rows
  and its "Update" button (a restart of the app) are gone, and so are the old keys that only it read (`CONNECTION_STATUS`,
  `CONNECTION_STATUS_SHORT`, `WEBSOCKET_OK`, `WEBSOCKET_CONNECTING`, `WEBSOCKET_DISCONNECTED`). The sheet is state and is never hidden by a theme
  key; the offline banner is state too.
- **What the sockets audit found and where it is fixed** (a read-only audit of the whole path, 2026-11-23; no device was used).
  *In this app:* a failed start is a catch-up (above); the rooms (above); the Profile's refresh (above); and the two reloads after an outage
  (the lists' bullet, `catchUpOnce`). *In the shared components library, `Finitless-com/ordering-components`, three pull requests, all merged into its `main` since (with #426 and #434, the CI runner; `main` is `425587a`, which is this app's submodule pointer) from
  `main` (they were merged by the owner after pass 13, and the pointer moved):* **#431** removes `OrderListGroups`' assign-request listeners
  (`request_register`, `request_update`, `request_cancel`) **by reference** (its cleanup called `socket.off(event)` with no handler and the
  wrapper's `off` then passes a fresh empty function, so nothing was removed and every re-run of the effect, which depends on `session`,
  added a copy: N toasts, N list updates, the alert's sound restarted N times and N position reads for one event on a project with the
  logistic module on) and reads the latest state through a ref, removes `Contacts`' `orders_register` listener on cleanup, and makes
  `WebsocketStatus` follow the Manager's `reconnect_attempt`, `reconnect_error` and `reconnect_failed` (socket.io-client 4 emits them on
  `socket.io`, not on the socket, so the status never went to "connecting" and the attempt count never moved), handle `connect_error`, read
  `connected` when its listeners attach, and expose two additive props to the skin, `connectError` (the last message since the last
  `connect`, or null) and `connectErrorIsAuth` (true when the wrapper treats it as a rejected session and stops retrying: `invalid
  signature`); **#432** closes the previous user's socket on logout (it was revived by the `user.id` effect, with the old token and rooms,
  also without `use_root_point`) with a new additive `Socket.dispose()` and does not connect a wrapper whose token is not the session's: the
  riskier one, because it touches the provider every product uses (tried by pass 13 on both platforms before it merged); **#433** adds an optional `override_url` under `"socket"` in the
  settings (`"socket": { "override_url": "…" }`), used only when it is a non-empty string; without it nothing changes and the legacy `url`
  stays ignored. **The reconnect back-off is not changed** (the owner's call). **#431 also holds three fixes found on the way** (customer apps and the admin dashboard, none in the driver's path): `Checkout` and `MultiCheckout` remember that `carts_update` was registered and remove exactly that handler on cleanup (they registered it behind a private emitter field and could skip the `off`), the admin dashboard's copy of `WebsocketStatus` follows the Manager's events too, and `UserFormDetails`' `drivers_changes` is applied on top of the latest session user and local state (it spread a stale `session.user`, so two events in a row overwrote each other). *Not fixed upstream, for later:* the driver joins customer rooms (`carts_<id>`, `orderoptions_<id>`) through `OrderContext`,
  which costs a join and a listener and nothing else. *Left as it is:* the flat retry (the Manager retries for ever every 1 to 7.5 s and
  nothing looks at the network or the foreground; on `invalid signature` the wrapper stops for good until a restart) and the token
  in the URL's query.
- **A local build shows "Live" only against a local sockets server.** The components library (the pinned `425587a`) builds the socket with a
  fixed production host and ignores the `url` of the app's `socket` settings, unless the settings carry **`socket.override_url`** (#433): with
  it set in the local `src/config.json` (never committed) the socket goes where it says, and pass 13 saw the pill reach "Live" that way on both
  platforms. Without it a local or staging build cannot reach its own sockets server: the pill reads "Reconnecting", the lists refresh only by
  pull, the refresh button and the app's own reloads, and the new-order alert cannot be caused.

**The new-order alert** (`NewOrderNotification`; `alertQueue.ts` holds what it gathers, `alertContent.ts` what it says).
- It gathers **per kind** of event: new orders, updated orders, requests, updated requests, messages. The open kind keeps
  gathering, the other kinds wait behind it, each kind needs one close and nothing is lost; the same order or group twice
  counts once. Several arrivals (the owner's decision: one alert with the count) read "New orders!!" / "_count_ new orders"
  / up to three numbers and then "and N more" (`LIST_AND_N_MORE`) / "View orders"; one thing says today's texts. The sound and the
  vibration start again on each arrival and stop on close.
- **The alert does not wait on GPS or the network.** An event is gathered at once. For an event that carries the driver (his own
  assigned order), the extra post of his position to `/locations` that the handler still makes is fire-and-forget
  (`reportLocation`, 8 s limit on the position and on the `fetch`, with an `AbortController`); no position, a refused post or one
  that hangs changes nothing about the alert, and the error toast, when there is no position, takes its arguments in order
  (`showToast(ToastType.Error, text)`). The post predates the native module and is redundant with it: it stays as a harmless
  extra fix at the moment of assignment.
- **The sound is the bundled `order_sound_notification`** (`res/raw/….mp3` on Android, the `.caf` in the iOS bundle), never fetched.
  It is a 0.46 s chime repeated 12 times every 2.07 s over 24.8 s, then silence. The alert starts it again from its beginning every
  `SOUND_CYCLE_MS` (2.5 s): `react-native-sound-player` loads it once per run and each cycle is `seek(0)` and `play()`; on Android
  with the `AlarmSound` module, `AlarmSound.start('android.resource://<bundle id>/raw/order_sound_notification')` every cycle. Nothing
  stops it between cycles, so one cycle cannot cut the next, and every exit stops the sound and the vibration. Heard: a chime, then
  the second one cut about 60 ms short at 2.5 s, so the rhythm is uneven (0, 2.1, 2.5, 4.6, 5.0 s...). It was left as it is, because the
  pattern is not longer than the cycle; an even rhythm would be a constant derived from the asset (about 2.0 s) with the vibration
  moved with it, and a native loop (`MediaPlayer.setLooping` in `AlarmSoundModule`) would play the whole tone: both are for the owner
  to decide after listening.
- **Where the button goes:** "View orders" opens the Orders tab on the list whose status holds the orders; "View requests"
  the requests tab; "View messages" the Messages tab; a single order's "View order" opens its details and a single
  request's the requests tab (no button when the driver cannot open requests). The contract is in `src/navigators/NavigationRef.tsx`
  (`openOrdersTab(show, status)`, `openMessagesTab()`, `openChatOrderId()`): `MyOrders` hands `route.params` to `OrdersOption` as
  `tabRequest`, which consumes and clears it.
- A request for a group is named by its group ("Group No. 89", with its orders' count when the packet has it), never by the
  assign request's id. A message of the order whose chat is on screen opens no alert and raises no count: it is read as it
  arrives.

## 6. Adding to the schema

When step 4 or 5 of section 4 applies, in the same pull request:

1. Add the node to `product.schema.json` with its `$type` and its default:
   - the default aliases a token (`{color.x}`, `{space.x}`, `{radius.x}`, `{shadow.x}`, `{typography.x}`, `{icon.x}`), never a literal unless
     the value is truly its own (a size with its `min` / `max`: `badge.base.dot_max_width` is 140);
   - a dimension says its `scale`;
   - a shadow, radius or border that should follow Identity says `follows` with `options` when it must keep a level of its own;
   - a translucent colour says `alpha: true`.
2. Add its editor metadata (`$extensions["co.ordering.editor"]`): `control`, `group`, `order`, and `min` / `max` / `step` / `unit` for a number;
   a new label is a key `BUILDER_THEME_PROP_…` with its English default under `editor.props`. The editor's rules are checked by `pnpm theme:validate`
   (a visibility key must also be in a group of `editor.sections`: without it the check fails with `in_no_editor_group`).
   - The Dashboard translates the editor from its own catalog. A new label key shows its English default until the Dashboard adds it in every
     language: list each new key with its text in `docs/theme/editor-labels.md` and open the Dashboard's pull request in the same round.
     The check that every `BUILDER_THEME_*` key of the schema is listed there is a comparison of the schema's keys with the Dashboard's catalog, run by hand at each round.
3. Bump `version` once the current one is published: a published version is immutable
   (api-core answers 409 `schema.version_exists`). Installed apps keep asking for the
   version they were built with: the new one must be published **before** the build
   that ships it, and a theme of it must cut down cleanly to the old one. The engine's `creating-a-schema.md` (section 6) and `schema-format.md` (sections 13 to 15) say which number to bump and how saved themes follow.
   - **Locally nothing is published:** the app paints the local schema's defaults (`pnpm theme:compile`; with no served theme it paints `complete(compiled, null)`), or the
     schema is registered in the local API with `php artisan ordering:theme-schema <path to product.schema.json>` to edit a theme of it from the local Dashboard (the local
     project's served theme may be cleaned, edited or deleted without bumping the version: [theme/decisions.md](theme/decisions.md), 2026-11-23).
4. Run `pnpm theme:compile` (it writes `src/theme.compiled.json`), then `theme:validate`, `theme:verify`, `theme:guard`, `theme:keys` and `theme:extremes`.
5. Read it through a helper (section 3) and cover it in a test. A key read through a variable or as a whole look goes in `theme-readers.json` with its reader
   ([theme/readers.md](theme/readers.md)).
6. Update this page if the change touches anything it describes (section 10).

### The checks and what each one catches

| Check | What it does | What it catches | Check name |
|---|---|---|---|
| `pnpm theme:validate` | `ordering-theme validate product.schema.json` | A schema the engine refuses (editor metadata, labels, aliases, ranges), for example a visibility key that is in no editor group (`in_no_editor_group`) | "Theme schema is valid" |
| `pnpm theme:verify` | `ordering-theme compile … --check`: compiles the schema and compares it with the committed `src/theme.compiled.json` | A schema changed without `pnpm theme:compile`: the binary would paint a stale default | "Compiled theme is up to date" |
| `pnpm theme:guard` | `scripts/theme/guard.mjs`: scans `src` (not the submodule) for design literals in the categories colour, space, radius, border, shadow, font size / weight / family, line height, letter spacing, motion, opacity and size; the recorded exceptions of `theme-exceptions.json` (7, each with its reason) are allowed | A hex, a number for a length, a shadow or a duration written in a style or a style prop; **no baseline**: every file must pass, none is allowed to carry a recorded count | "No design literals" |
| `pnpm theme:keys` | `scripts/theme/keys.mjs`: looks for each schema key's path as text in `src`; `theme-readers.json` (9 records) names the keys read through a variable or as a whole look | A key the editor would offer that no code reads ("a thick border changed nothing"); also a record that no longer matches anything | "Every schema key has a reader" |
| `pnpm theme:extremes` | `scripts/theme/extremes.mjs`: resolves extreme themes as api-core does, completes them as the app does and converts them: square and pill corners, a light brand colour with its own text colour, dark surfaces, no shadows, larger text, and each of the ten fonts | A property that stopped following Identity, a colour the matrix no longer derives, a font without its files. It does **not** measure contrast and does not replace looking at an extreme theme on a device | "Extreme themes reach the app (resolved as the API serves them)" |
| `pnpm lint:cycles` | `scripts/check-cycles.mjs`: the static import graph of `src` | A require cycle (the barrel `@ui` imported inside `src/ui`) | "No require cycles" (with `pnpm lint:check`, ESLint) |
| `pnpm i18n:verify`, `pnpm i18n:check-generated` | the translation catalog is complete for the locales of `i18n/config.json` and matches the code's scan | A text with a missing locale; a `t('KEY', …)` the catalog lacks | "Verify translation catalog", "Catalog matches code scan" |
| `npx tsc --noEmit`, `pnpm test:coverage` | types; Jest with a coverage threshold (the theme's own tests are `src/theme/__tests__`: defaults, the box and bar clearance, the provider) | A key read with the wrong type; a rule a test pins (the band's contrast, the schema's coherence) | "Typecheck", "Test coverage" |
| the release bundles | `react-native bundle` for iOS and Android | An import that no longer resolves | "Release bundles build (iOS and Android)" |

### A worked example: the connection pill's maximum width (`components.badge.base.dot_max_width`)

What the key took, end to end (round 13):
1. **The node**, under `components.badge.base`: `$type` `number`, `$value` 140, editor `control` `range` with `min` 80, `max` 320, `step` 1, `unit` `px`, `order` 5; its label is
   `editor.props.dot_max_width` = `BUILDER_THEME_PROP_DOT_MAX_WIDTH` "Status pill: maximum width". The default is a number of its own (a width has no token); the range is what keeps a theme from
   making the pill as narrow as a dot or wider than the header.
2. **The Dashboard's label:** one row in `docs/theme/editor-labels.md` and the key in the Dashboard's catalog (commit `ed2f8fae2` of draft pull request #574).
3. **The version:** unchanged, 1.0.0 (nothing is published yet).
4. **The checks:** `pnpm theme:compile` rewrote `src/theme.compiled.json`; `theme:validate`, `theme:verify`, `theme:guard`, `theme:keys` (the key has a reader) and `theme:extremes` pass.
5. **The reader and its test:** `shared/OBadge.tsx` reads `badge.base.dot_max_width` from `theme.native` as the `maxWidth` of a badge with a `dot`; `WebsocketStatus.test.tsx` asserts the pill is capped at the default and
   at a theme's value (`dot_max_width: 96`).
6. **This page and the log:** the primitives table (`OBadge`), the connection pill's paragraph and a row of `docs/theme/decisions.md` (the owner's decision that replaced "as wide as its widest label").

## 7. Fonts

The catalog's ten fonts (Archivo, Inter, Lato, Montserrat, Nunito, Open Sans, Playfair
Display, Poppins, Raleway, Roboto) are bundled as static files at weights 400, 500, 600
and 700, one file per weight (`src/assets/fonts/`, linked in `Info.plist` and the Xcode
project, copied to `android/app/src/main/assets/fonts/`). A file's name and its
PostScript name are `<FamilyWithoutSpaces>-<Weight>` (`OpenSans-SemiBold`), the names the
engine's `toNative` paints with. A family without a weight ships its nearest file under
that name. A weight is painted by its file (the text helper with `weight`), never by
`fontWeight`.

## 8. Don'ts

- No literals in styles or style props (the guard fails on them: `pnpm theme:guard`). `theme-exceptions.json` has 7 entries, each with its
  reason: the text helper's font family, hidden inputs at opacity 0 (`StableText` and `OOtpInput`; **a third entry, for the old delivery-time field, is stale**: `AcceptOrRejectOrder/styles.tsx` has no opacity 0 since the dial left, and the entry can be removed), the
  image picker's 2048 px, the JS splash's logo size (120 x 120, the native splash's) and the select's 60 % list. `transparent` is not one of them.
- No module-level `StyleSheet.create` with theme values: it never sees a theme change.
- No `fontFamily` or `fontWeight` in a component: the text helper picks the file.
- No `defaultProps` on function components: defaults go in the destructuring.
- No colors computed in a component; no second provider; no optional chains on the
  theme.
- No reading `theme.native…` or `theme.values…` inline when a helper exists; no converting a theme value in a component (a shadow or a text built from its
  fields).
- No second implementation of a primitive; no picker library and no list that opens in
  place.
- No space under a header or a gutter around it in a screen (the header has both); no gutter
  on a scroll's frame; no `Placeholder` / `Fade`: a skeleton is `SkeletonBone`s.
- No press feedback on what cannot be tapped; touch targets of at least 44 pt.
- No irreversible action that fires on a single tap without a hold or a confirmation, and no guard on accepting or on a
  step that already has its own submit ("Guarded actions", §5).
- No `Alert.alert` in a screen (the system's dialog is unthemed and its back key does not cancel): `useConfirm`,
  `useNotice` or `OAlertOriginal`; a piece that only tells (an error, "code sent") is a notice, with one button (`notice`), never
  a question with a Cancel that means the same. No action of a held button that takes the button off the screen before the
  finger lifts: it waits through `shared/holdLatch.ts`. No hold judged with `Date.now()` when the event has its own timestamp.
- No change of an order made outside the list that waits for a socket to reach it: it announces itself (`useAnnounceOrderChange`),
  once, and only when the API answered and it took.
- No handler given to a memoized row as it comes from a controller that writes whole-list snapshots (`useStableCallback`), no
  reload started beside another or over a change of the driver's own (`useReloadQueue`), no catch-up of an order beside its
  status change (`useRefetchAfterMutation`), and no step that can be sent twice while a GPS fix or a request is pending.
- No toast without a message (an error toast says its text through `apiErrorText`), and no success toast after an accept or a step of
  an order: the stage changing is the confirmation (decision of 2026-11-20).
- No button painted off for a reason the driver should know that stays silent when it is tapped (`onDisabledPress`), and no `disabled`
  set on its `Pressable` when it must still answer (it overrides `accessibilityState.disabled`, even `false`).
- No reload of the orders or the requests while offline (it marks the list as loading and writes a whole snapshot over the offline
  list), and no skeleton drawn offline from a `loading` flag. No sync mark, banner count or "Pending sync changes" read from a copy's
  `unsync` flag: the queue decides (`isOrderQueued`). No sync that writes the queue back from its own snapshot (`applyRunResults`),
  no retry timer that keeps running with an empty queue, without a connection or after sign-out.
- No group's name built in a screen ("Group No." and the number joined by hand): `groupLabel`.
- No import of `@ui` inside `src/ui` (a require cycle through the barrel: the concrete module, "Imports inside `src/ui`", §4; `pnpm
  lint:cycles` and the ESLint rule fail it). No cycle between two modules either: `lint:cycles` lists it.
- No tint on the order card but its status band (the band is the tone's `*_soft` variant, the card's box is never tinted), no clipping of the
  card to round the band (a theme shadow goes with it: negative margins and the inside radius), no order type written in a colour of the
  screen's own (`orderTypeVariant`), no button of the card inside its `Pressable` (the
  `footer` of `OCard`), no skeleton drawn over the rows a list already has (a reload keeps them), and no card busy with another
  order's change.
- No shadow on a see-through box; no state that moves its control.
- No `Platform.OS` branch for a look (a weight, a padding, a shadow): the runtime paints
  both platforms from one value.
- No served picture drawn with `Image` at its upload size: a logo or a photo goes through
  `OAvatar`, which asks the image server for the size it paints (`src/utils/imageUrl.ts`).
  The SDK's `optimizeImage` returns its URL unchanged: do not rely on it.
- No field-like box (an input, a select, a text area) without the room of its states'
  border at rest (`reservedBorder`): their texts start on the same edge.
- No list of status names, order-number label, order-type name or time format of a
  screen's own: the functions of §5 write them.
- No field error, password eye or `ActivityIndicator` built in a screen: `FieldError`,
  `PasswordToggle`, `OSpinner`.

## 9. Known deviations (open items)

Things the code does that this page's rules do not allow, kept on purpose until the missing piece exists:

- **Home's language pill** paints the hero's overlay (`home_hero.base.overlay`, translucent) through the button's
  `style`: `OButton` has no color role for a fill over a photo. It needs a role of the engine or of the button, and
  the style goes.
- **Sizes that differ from the mockups, on purpose** (the others follow them): the status
  badge's padding (15 where the mockup draws 12: no token between them), the chat's system message's padding (10 where the mockup
  draws 8), the profile's camera button (32 where the mockup draws 28), and the unread count's badge, which keeps one size (20)
  where the boards draw three.
- **The order card's differences from the drawing** (the business app's "D3", the status band, as the driver's, 2026-11-23; every value
  is the theme's token, none was typed to match): the logo is 44 (`OAvatar` `md`), the drawing's 40; the chips are `badge` `sm`, 20
  high with the `caption` text (10), the drawing's 24 and 12; "Delivery #N" is a badge, 20 high with a 44 touch area above and below it
  and regular weight (it was the button `sm`, 32 high, semibold); the band is at least 32 tall (`size.sm`), the drawing's 34; the
  the band's three state inks are the drawing's `#6B5300`, `#C42543` and `#00713F`, **written as literals in the three soft variants of the
  schema** (the theme's `*_text` tokens measured 4.29, 4.04 and 4.21 against the tints, under 4.5; the scale has no token for them), while
  the brand's text on the band, `primary_pressed` `#1862C5`, matches the drawing; the two buttons share the row 1:2 of what their labels leave, not an exact third; the payment's words are "Collect in
  cash" (an existing key) and "Paid" (the drawing: "Collect cash"); the clock time is written in the project's time format (the local
  project's has no space: "06:37PM", the drawing's "12:53 PM"); the time's phrase is the figure and the catalog's word, so German
  reads "24 min übrig" where "noch 24 min" would be more idiomatic (no native speaker has read it). Matching through tokens: the
  card's padding (15), gap (10), radius (10), the strong line (16 / 1.4 / 600), the total (`h4`), the band's padding (`xs` over and
  under, `sm` between) and the 44 buttons.
- **`OButton`'s `FIT_MIN_SCALE`** (0.8, how far a `fitText` label may shrink) is a named constant: the theme has no key for it and
  none was invented, and `theme:guard` does not catch a named constant.
- **Also kept as they are, by decision** (final passes of 2026-11-19): the map's zoom, fit and locate buttons are 32; "Remove image" of the status (proof) photo
  is not confirmed (the coordinator's call, logged in [theme/decisions.md](theme/decisions.md); the profile photo's "Remove photo" is).

## 10. Keeping this page true

This page describes the rules and the theme **as they are now**. It must match `product.schema.json`, the helpers and the primitives at all times.

- **Same pull request:** a change that touches what this page describes updates it in that pull request: the schema (token groups or levels, a
  component's parts, `follows`, `slots`, `scope`), a helper, a shared primitive in `src/ui/src/components/shared`, a rule about which token fits which purpose, a
  design rule above.
- **Rewrite in place:** edit the sentence that changed, so that the page reads as if it had always said the new thing, and delete what no longer exists.
- **Not a changelog:** history lives in git and in the commits, decisions in [theme/decisions.md](theme/decisions.md). A date or a decision's name stays where it
  says whose rule this is (the owner's, with the day), never as a list of what was before.
- **Specific rules only:** add a rule only if it applies across the codebase; a decision about one screen goes in that screen's code or in `docs/theme/`.
- **Point, don't copy:** prefer pointing to the source over copying values (a level's name, not its number; the helper's file, not its body), because what is not copied
  cannot go stale. The anchors other files link to (§4 "Imports inside `src/ui`", §6, §9, `#design-rules`) keep their names.
