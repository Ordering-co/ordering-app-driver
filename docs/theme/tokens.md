# Tokens — unified scales and colors (phase 3)

Date: 2026-11-13 · Status: **approved** (gate 3, 2026-11-13; see decisions.md).

By the owner's decision (decisions.md, "Look of the defaults") the values are **the
marketplace app's** (`ordering-app-marketplace-theming/product.schema.json`, 1.0.0): same
levels, colors, radius, shadows and motion, so both apps are one family and a theme means
the same in both. This document says what each level absorbs of what the driver app paints
today, and lists the visible changes. Source: `.theme-audit/scales.md` and the color keys
the live code reads (dead code of components.md §4 left out). All values are pt. Token
names are the engine's fixed catalog: no new tokens.

## 1. Space

| Level | Value | Absorbs (uses today) |
|---|---|---|
| none | 0 | 0, 1 |
| xxs | 2 | 2 (9), 3 (18) |
| xs | 5 | 4 (23), 5 (118), 6 (5) |
| sm | 10 | 8 (22), 10 (195), 12 (27) |
| md | 15 | 14 (5), 15 (59), 16 (10) |
| lg | 20 | 18 (4), 20 (145) |
| xl | 30 | 28 (2), 30 (38) |
| xxl | 40 | 40 (13) |
| xxxl | 50 | 45 (3), 50 (5) |
| `layout.page_gutter` | 20 | the screens' `paddingHorizontal: 20`; the accept / reject screen's 30 |

573 of the 770 uses are already exactly on a level. Visible changes: 8 → 10 (22) and
12 → 10 (27), 3 → 2 (18), 4 → 5 (23), 16 → 15 (10); 24 / 25 (36 uses) fall between `lg`
and `xl` and are decided by purpose in phase 7 (between page blocks `xl`, inside a
component `lg`). Values ≥ 60 (60, 65, 70, 80, 100, 110, 220) are room left for a floating
bar, a map or an image: they become measured clearances or recorded layout exceptions.

Rhythm: between page blocks `xl`; between form fields `md`; inside a component, a property
of the component aliased to a level.

## 2. Radius

| Level | Value | Absorbs |
|---|---|---|
| none | 0 | 0, 0.5, 1 |
| xs | 4 | 4, 5, 6 (12) |
| sm | 8 | 7 (23), 7.6 (56), 8 (19) |
| md | 10 | 10 (71), 12 (4) — Identity's radius: cards, badges, alerts and toasts follow it. Since 2026-11-18 buttons and inputs keep `sm` (8) and dialogs and sheets `lg` (15): their `options` leave `md` out, so Identity does not move them |
| lg | 15 | 15, 16 (6) |
| xl | 20 | 18, 20, 22 (18), 25 (2) |
| xxl | 30 | 26, 28, 30, 32, 35 (22) |
| full | 9999 | 50, 100, 123 (round shapes) |

Visible changes: boxes at 7 / 7.6 / 8 (98 uses: most buttons and inputs) → Identity's 10 (buttons
and inputs: 8, since 2026-11-18, see above); 5 on a few buttons → 10.

## 3. Border

`thin` 1, `thick` 2. 1.5 (3: the profile's input lines) → `thin`. 2.5 / 5 / 10 (11 uses) are
lines drawn as an empty view's border: they become `divider` variants. 4 and 11 (map pin
rings) became the marker's own `ring_width` and `selected_ring_width` (`map_marker`, 2026-11-18).

## 4. Sizes

Control heights (`size`):

| Level | Value | Absorbs |
|---|---|---|
| sm | 32 | 28–36 (36: chips, small buttons) |
| md | 44 | 38–45 (63) — the default button and input (D3) |
| lg | 50 | 48–52 (15) — the bottom bar's button |
| xl | 60 | 56–64 (14) |

Visible changes: 40 → 44 (37 uses grow 4 pt), 45 → 44 or `lg` in a bar (7), 35 / 36 → 32
(10), 64 → 60 (5). Everything tappable gets a 44 pt target from its primitive (`hitSlop`
when its box is smaller).

Icons (`icon`): sm 16, md 20, lg 24. 14 and 18 → 16 (18 uses), 22 → 20, 23–26 → 24;
12 (6) → `sm`; 28–48 (18 uses: glyphs inside round tiles, the Stripe status mark, the map
marker's glyph) take their component's own size (the marker's `icon_size`). Since 2026-11-19 the glyph sizes the mockups draw between
the levels are keys of the component that owns the glyph, not tokens: 22 alone in a button, 18 beside a label and at the end of rows,
fields and details ([components.md](components.md) section 6). No token was added or changed in that round.

## 5. Typography

Fonts: `font.heading` = `font.body` = **poppins**; the catalog's 10 families bundled at
400 / 500 / 600 / 700, one file per weight. Helvetica, the three Inter cuts and today's
Poppins files (67 files, 20 MB) go. `'bold'` → 700, `'normal'` → 400, 300 → 400.

| Style | Size | Line | Weight | Role in the driver app | Today |
|---|---|---|---|---|---|
| h1 | 28 | 1.2 | 700 | — (kept for a theme) | 28, 30 (rare) |
| h2 | 24 | 1.25 | 700 | welcome and login titles | 22, 24, 26 (27 uses) |
| h3 | 20 | 1.3 | 700 | screen title (header), modal title | tab titles 26, `ONavbar` 24, chat 17, modals 20 |
| h4 | 18 | 1.3 | 600 | section title | six looks from 20/700 to 14/700 |
| body_lg | 16 | 1.4 | 400 | lead text; card title at weight 600 (the marketplace app's card title) | 16, 17 (109) |
| body | 14 | 1.4 | 400 | body, bill rows, inputs | 14, 15 (80) |
| body_sm | 12 | 1.5 | 400 | metadata (in `text_muted`) | 11, 12, 13 (74) |
| caption | 10 | 1.3 | 400 | chip text in tight rows, counters | 8.8, 9, 10 (13) |
| label | 14 | 1.4 | 600 | field labels, emphasised rows | 14 bold |
| button | 14 | 1.2 | 600 | button labels | 12–20 in five sizes |

One place of the theme per role: screen title `h3`, section title `h4`, card title 16/600,
metadata `body_sm` muted, body `body`. Off the scale and kept as component properties: the
accept / reject time dial (55), the phone-verification digits (40 → the code input's own
text) and the new-order headline (34).

Visible changes: every text changes family (Helvetica / Inter / the system's fallback →
Poppins); screen titles 24 / 26 → 20; bill rows 16 → 14; button labels 16 / 18 → 14; texts
with no line height take their style's ratio. Font scaling: on, capped at 1.3 in `OText`.

## 6. Shadows

Today: 15 hand-made shadows (iOS `shadowRadius` 3–10, opacity 0.1–0.36; Android
`elevation` 1–15), some only on one platform.

| Level | x / y | blur | opacity (#000) | elevation | Takes |
|---|---|---|---|---|---|
| none | — | — | — | — | — |
| sm | 0 / 1 | 4 | 0.10 | 1 | cards, inputs, the header's icon buttons (elevation 1–3) |
| md | 0 / 2 | 8 | 0.10 | 3 | floating map buttons, the message row's logo (elevation 5–7) |
| lg | 0 / 4 | 12 | 0.15 | 6 | the bottom bar, toasts (elevation 11) |
| xl | 0 / 8 | 24 | 0.20 | 12 | modals and sheets (elevation 15) |

A box's `shadow` and `border` follow Identity. Since 2026-11-18 Identity is `shadow_style.size`
`none` and `border_style.width` `thin` (it was `sm` and `none`, as the marketplace app's): surfaces
are flat and drawn with lines, as the mockups. What floats over a map keeps its own shadow,
`map_marker.base.shadow` (`md`), which Identity does not remove. The levels above remain for a
theme that sets them. `elevation` used for stacking order (and the z-index ladder
14–20 of the in-place dropdowns) goes with the sheet select.

## 7. Colors

The marketplace app's 40 colors, same values. Right column: the legacy keys and literals of
the live code each role replaces (uses).

| Role | Value | Replaces today |
|---|---|---|
| `primary` / `on_primary` | #1E72E3 / #FFFFFF | `primary` #FFB700 as a fill, border or selection (≈ 120 of its 187 uses), `yellow`; `white` and `primaryContrast` as text on it |
| `primary_text` | #1E72E3 | `primary` as text or icon on the page (≈ 65), links `#365CC7`, `statusOrderBlue` #04449c, `#2C7BE5` |
| `primary_subtle` | #E9F2FE | `secondary` and `yellowSecondary` #FFF4DA (the brand's light tint: chips, selected rows, "mine" bubble), `btnBGWhite`, `forgotText` |
| `primary_pressed` | #1862C5 | — (no pressed look today) |
| `secondary` / `on_secondary` / `_subtle` / `_pressed` | #EFEFEF / #000000 / #F8F9FA / #DDDDDD | neutral buttons (cancel, secondary actions on `white` or `gray100`) |
| `background` | #FFFFFF | `backgroundPage`, `white` as the canvas |
| `surface` | #FFFFFF | `white` on cards, modals, sheets, the tab bar |
| `surface_alt` | #F8F9FA | `gray100`, `inputChat`, `inputDisabled` #F7F7F7, `composerView`, `notAvailable` #EEE, `primaryLight` / `backgroundLight` #F5F9FF as a band |
| `text` | #000000 | `textGray` #344050 (84) and `OText`'s built-in `#344050`, `black`, `#444`, `darkText`, `dusk`, `actionsIcon`, `backgroundDark` as text; undefined `textNormal` |
| `text_muted` | #616161 | `unselectText` #909BA9 (37), `gray200` #ADB5BD (23), `arrowColor` #B1BCCC (17), `textSecondary` #858585, `backArrow` #748194, `mediumGray`, `composerPlaceHolder`, `offColor`, `#ADADAD` |
| `text_disabled` | #B1BCCC | `disabled` and `lightGray` as text or icon |
| `border` | #E9ECEF | `tabBar` #E9ECEF (26), `lightGray` #D2D2D2 and `inputSignup` #DEE2E6 as lines, `borderTops`, undefined `border` |
| `border_strong` | #909090 | `backgroundDark` #484848 as a control's border, the spinner |
| `disabled` | #CBCBCB | `disabled` as a fill or line |
| `overlay` / `on_overlay` | rgba(0,0,0,0.4) / #FFFFFF | scrims `rgba(0,0,0,0.4 / 0.5)`, `#000000AA`, `#0000006e`, `shadow`, `brightness`; white text on the welcome photo |
| `inverse_surface` / `on_inverse` | #000000 / #FFFFFF | `black` as a fill (map buttons), white on it |
| `success` / `on_` / `_subtle` / `_text` | #00884F / #FFFFFF / #D6FFF7 / #00884F | `green` and `success500` #00D27A (23), `statusOrderGreen` #0CAD63, `success` #90C68E, `toastSuccess`, literal `#00D27A`; `success100` |
| `warning` / `on_` / `_subtle` / `_text` | #FFC700 / #000000 / #FFF4CC / #8F6F00 | literal `#FFC700` (at risk), socket orange `#FF9922` / `#FFF1E0`, `warning100`, the warning banner `#FFF3CD` / `#856404` |
| `danger` / `on_` / `_subtle` / `_text` | #DA3453 / #FFFFFF / #FEEDF0 / #DA3453 | `red`, `danger500`, `statusOrderRed` #E63757 (54), `error` #C90800 (11), `#D81212`, `#FF0000`; `danger100`; undefined `toastError` |
| `info` / `on_info` / `info_subtle` | #1E72E3 / #FFFFFF / #F5F9FF | `toastInfo` #6BA4FF |
| `rating`, `favorite` | #FFC917, #E63757 | the review's stars (kept for the review form) |

Not colors: `clear`, `transparent` (55 uses) stay literal `transparent` (recorded
exception; since 2026-11-19 `transparent` is no entry of `theme-exceptions.json`).

Undefined keys get their role: `textNormal` → `text`, `blueLight` (the logistic "View
order" button) → the primary button, `border` → `border`, `toastError` → `danger`.

**Visible changes (the approved decision, listed):** the brand color yellow #FFB700 →
blue #1E72E3, with white text on it (today white on yellow, or yellow text on white, both
under 2:1 contrast); its light tint cream #FFF4DA → light blue #E9F2FE; text slate #344050
→ black; the four muted greys → #616161 (darker: readable at 12 pt); success #00D27A →
#00884F and danger #E63757 / #C90800 → #DA3453; lines #D2D2D2 / #DEE2E6 → #E9ECEF
(lighter); scrims 0.5 / 0.67 → 0.4; "at risk" keeps #FFC700.

## 8. Motion, opacity, identity

- `motion`: fast 120, base 200, slow 300, easing `ease_out`. The switch's 200 ms → `base` (since 2026-11-23 the app's own `OSwitch` slides its thumb with `fast`, and jumps with reduced motion);
  the skeleton's 700 ms pulse is the skeleton primitive's own.
- `opacity`: pressed 0.85 (today: React Native's default 0.2 on most touchables, since
  `OButton`'s `defaultProps` are ignored, and none on `Pressable`s), disabled 0.5 (0.6 on
  four controls, 0.25 on the recipients' "off").
- Identity: radius `md`, border width `thin`, shadow size `none` (2026-11-18, the mockups'; the marketplace app's
  are `none` and `sm`).
- Reduced motion is respected (no theme motion when the system asks).

## 9. Exceptions to record

`transparent`; the map (the library's callouts) and the signature canvas; window
shares and aspect boxes (the tutorial image, map heights, the welcome background); skeleton
shapes; z-index. Each goes in `theme-exceptions.json` with its reason when its batch is
converted. Since 2026-11-19 that file has 7 entries, and `transparent` is not one.

## 10. Not verified

What the app paints today on a device (fonts' fallbacks, the primitives without their
`defaultProps`): the "today" columns come from style values. The visible changes will be
seen with before / after screenshots on both platforms in phases 6 and 9.

## 11. The order card's tokens (2026-11-20, later)

The redrawn order card ([components.md](components.md) section 10, [THEMING.md](../THEMING.md) "The order card") **adds and changes no
token**: its new schema keys are properties of components (the two `orders.*` visibility keys, `badge.variants.success_soft` and
`warning_soft`, `order_card.slots.advance` and `decline`, `order_card.base.title_text`). What it reads: (Written for the D1b layout of 2026-11-20: the time and the status colors of the rows below moved to the status band on 2026-11-23, section 12; the rest stands.)

| Piece | Token |
|---|---|
| Card padding, the gap between its blocks, radius | the card's own (15), `space.sm` (10), Identity's radius (10) |
| The strong line | `order_card.base.title_text`, 16 / 1.4 / 600 (a component key: no typography role has these values) |
| The time's figure and the total | `typography.h4` (18 / 1.3 / 600); the word under the figure, the store's name and the items: `order_card.meta` (`body_sm`, 12 / 1.5) |
| At risk, late | `color.warning_text` (#8F6F00) and `color.danger_text` (#DA3453) as the figure's ink; in time is `color.text`. **The card is not tinted any more**: the "at risk keeps #FFC700" of section 7 is the badge variant's and the bar's, not the card's |
| "Paid", "Collect in cash" | `color.success_subtle` (#D6FFF7) with `color.success_text` (#00884F); `color.warning_subtle` (#FFF4CC) with `color.warning_text` (#8F6F00) |
| The chips' gaps | `space.xs` (5) on both axes; the status chip's vertical padding `space.xxs` (2) |
| The two buttons | `button` size `md` (44): `advance` solid `color.success`, `decline` outline `color.danger` |

Where it differs from the drawing, and why, is in [THEMING.md](../THEMING.md) section 9 (the drawing's #6B5300, #00713F and #C42543 are
not in the scale: the theme's text colors were used).

## 12. The status band's and the types' colors (2026-11-23)

The change to the status band ([components.md](components.md) section 11) **adds and changes no token**; the new colors are badge variants
(component properties) and each is a token alias or a literal of its variant:

| Piece | Color |
|---|---|
| Band on time, or with no time | `color.primary_subtle` (#E9F2FE) with `color.primary_pressed` (#1862C5) (`primary_soft`) |
| Band at risk | `color.warning_subtle` (#FFF4CC) with `color.warning_text` (#8F6F00) (`warning_soft`) |
| Band late, cancelled, rejected or failed | `color.danger_subtle` (#FEEDF0) with `color.danger_text` (#DA3453) (`danger_soft`) |
| Band completed | `color.success_subtle` (#D6FFF7) with `color.success_text` (#00884F) (`success_soft`) |
| Type: delivery with a driver | #D9CCFA with #3F1E96 (`type_delivery`) |
| Type: the customer collects | #B9E4E8 with #0A4E55 (`type_pickup`) |
| Type: in the store | #FAD4B4 with #7A3505 (`type_in_store`) |

The three type pairs are **literals of the variants, not tokens** (the business app's, the owner's decision of 2026-11-20 there: medium
tints with dark text, "the text reads at 6.5:1 or more on its tint" in its record; not re-measured here). They are none of the status colors. The
band's two texts are `order_card.base.time_text` (12 / 1.5 / 600) and its height at least `size.sm` (32); its padding `space.xs` over and
under, `space.sm` between the texts. The warning and danger texts of the band are the theme's (#8F6F00, #DA3453), lighter than the
drawing's (#6B5300, #C42543): their contrast on their tints was not measured.
