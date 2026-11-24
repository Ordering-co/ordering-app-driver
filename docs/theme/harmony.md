# Phase 9: one look — findings

Date: 2026-11-13 · Status: **H1–H7 and H10 decided and done in code** (round 2: see
[decisions.md](decisions.md), "Phase 9: one look, round 2"; H6 in part); **H8 and H9 are open**: round 3
([Round 3](#round-3-h8-and-h9-seen-on-devices), the end of this page) measured each one on both
devices and asks the owner four questions. The text below is the audit as it was written, before round 2: its H1–H7 are
the record of what was found, not of what the code does now.

How it was made: a read-only agent went through `src/ui`, `src/pages` and
`src/navigators` against [THEMING.md](../THEMING.md), the decision log and the method's
harmony reference. The coordinator then read the code of the findings marked ✔ below;
the others are the agent's reading, not yet re-read. **No screen behind the login was
seen on a device** (no test driver account), so nothing here is a measurement: sizes
are computed from the theme's defaults. Paths are under `src/ui/src/components/`.

"Inherited" = the original app (`ordering-app-driver-v26`) already did it; the conversion
kept it.

**Brought up to date on 2026-11-23.** This page is the record of what the audits found when they were made; the order card, the Orders
tabs, the connection indicator, the switch and the delivery time were redrawn after round 4, so some pieces and line numbers named below
are gone. [Since round 4: what was replaced](#since-round-4-what-was-replaced), at the end, says what each one is now; read it before
trusting a line number or a measure of the order card here.

## Fixed (no decision needed)

| Finding | Fix |
|---|---|
| ✔ The assign-request detail had no back button: the conversion moved the back arrow from the order header to the screen's bar, and this screen had no bar | It draws the bar the order's details draw (`OrderDetailsLogistic/index.tsx`), with a test |
| ✔ A field's text and icon moved 1 pt when it turned to error (the error border was not reserved at rest); selects and text areas the same | `OInput`, `OSelect` and `OTextarea` reserve the widest border of their states (`reservedBorder`); measured on Android: the text stays at the same pixel |
| ✔ A screen reader said "close", "back" and "code" in English in every language | The catalog's `CLOSE`, `GO_BACK`, `ENTER_VERIFICATION_CODE`; the delivery PIN names its order |
| ✔ The orders list and the schedule painted the pull-to-refresh spinner with the brand color; the other lists read `components.spinner` | All read `spinner.base.color` (the same color by default) |

## H1. An order's status: its name and its look

- ✔ **Three lists of names** (inherited). Status 4 is "Ready for pickup" on the orders
  card (`OrdersOption/index.tsx:652-743`) and "Preparation Completed" in the details,
  the map and the messages (`src/ui/src/utils/index.tsx:640`,
  `PreviousMessages/index.tsx:133-324`); status 5 is "Rejected" in the messages and
  "Rejected by business" elsewhere.
- **Three looks.** A badge by state on the orders card, the messages row and the driver
  map; colored text in the details header (`OrderDetails/OrderHeaderComponent.tsx:103-112`).
  THEMING §5 says "painted with `badge` variants".
- The order timer is colored text on the orders card (`PreviousOrders/OrderItem.tsx:249`)
  and a badge on the messages row (`PreviousMessages/index.tsx:87`).

## H2. The order number

✔ Written five ways with four translation keys, and **not masked on two screens**
(inherited): `NO` + masked id without a space (`OrderItem.tsx:168`), `ORDER_NO`
(`OrderItem.tsx:280`, `SecurityPinFields.tsx:72`), `INVOICE_ORDER_NO` with and without a
space (`PreviousMessages/index.tsx:360`, `OrderMessage/index.tsx:56`,
`OrderHeaderComponent.tsx:104`, `DriverMap/index.tsx:380`), `ORDER_NO` + the raw
`payout.order_id` (`Payouts/index.tsx:80`), `ORDER_NUMBER` + the raw `marker.id`
(`MapView/RenderMarker.tsx:104`), "Order #id" (`OrderContentComponent.tsx:590`). The
`NO` key also means "No" elsewhere (already on the phase 7 list).

## H3. The order type

✔ The details header knows types 1 to 4 and calls every other one "Driver thru"
(`OrderHeaderComponent.tsx:56-64`, inherited); the orders card knows catering and
reservation (`OrderItem.tsx:17-28`). A catering delivery reads "Catering delivery" on its
card and "Driver thru" in its details.

## H4. Dates, times and durations

THEMING says a date is never formatted with a format of the screen's own. It is, here:

- the driver's schedule: `'dddd, MMMM D, YYYY'` and `'YYYY-MM-DD'`
  (`DriverSchedule/index.tsx:104,110`), and hours padded by hand as 24 h in two files
  (`DriverSchedule/index.tsx:60-63`, `ScheduleBlocked/index.tsx:39-42`), whatever the
  project's time format;
- ✔ the driver map's travel time: `toFixed(2) - mins` ("12.34 - mins",
  `DriverMap/index.tsx:402`, inherited);
- ✔ the code countdown: "9:59" in the OTP login (`LoginForm/Otp/index.tsx:112`) and
  "09:59" in the phone verification (`VerifyPhone/index.tsx:60-80`);
- the search's picked range, shown in the API's format `MM/DD/YYYY ~ MM/DD/YYYY`
  (`OrdersOptionDate/index.tsx:11,41`);
- the delay timer ("- 1 day 02:05"): the same function written twice
  (`OrderItem.tsx:117-133`, `PreviousMessages/index.tsx:338-354`).

## H5. One control, one look

- **Cancel has four looks**: neutral outline `md` (`OrderItem.tsx:293`,
  `UserFormDetails/index.tsx:370`, `RemoveAccountModal.tsx:136`), secondary solid
  (`Chat/index.tsx:753`, `DriverMap/index.tsx:518`), primary outline `lg`
  (`LoginForm/Otp/index.tsx:129`, the schema's `auth_form.slots.cancel`).
- The requirements dialog's Close is `secondary` from the order's details
  (`OrderDetails/Delivery.tsx:896`) and `neutral` from accept / reject.
- A full-screen modal leaves by a close X on the driver map (`DriverMap/index.tsx:381`)
  and by a back arrow everywhere else.
- The password eye is a 24 pt inline button in the login (`LoginForm/index.tsx:473`) and
  the 44 pt `PasswordToggle` in the profile and the remove-account dialog.
- The unread count is `danger` `sm` on the details' chat button (`Delivery.tsx:721`) and
  the theme's `chat_bubble.slots.unread` (primary `md`) on the messages row.
- "Delivery #N" is a selected chip on the card, a primary badge in the details, colored
  text in accept / reject.
- A notice's action is `sm` outline in the orders list and `md` solid in the payouts.
- A sheet of options is the select's rows, list rows on the driver map, and stacked solid
  buttons in the chat (`Chat/index.tsx:727-757`); the padding under a sheet's last control
  is the caller's (20, 20, 0 or 15).
- Dialog headers: the connection dialog and the new-order dialog draw their own close
  row; the others have a title and no X.
- A store's logo is a rounded square in the two lists and a circle in the chat and on the
  map; its name is 16/600 on cards, 14/600 in the details' card, 14/400 on the driver map.

## H6. The accept / reject screen's bottom bar

✔ It builds its own bar (`AcceptOrRejectOrder/styles.tsx:46-52`) where every other
screen uses `FloatingButton` (`components.bottom_bar`): no shadow, and as a page its
background stops above the home indicator's inset.

## H7. Texts of the same role

- Leads under a title: `body_lg` on the welcome screen, the tutorial, accept / reject and
  the empty state; `body` in forgot password, review and accept / reject's second text.
  THEMING's table says `body`.
- Section titles inside accept / reject: "Reject reasons" is the section title;
  "Upload status image" and "Security code" are a centered label.
- A field's error message is built by hand seven times, centered in four places and at
  the start in two (a `FieldError` exists in `LoginForm/AuthPieces.tsx`).
- "Your previous cellphone" uses the error style (red); it is information
  (`UserFormDetails/index.tsx:357`).
- Product details: "Ingredients:" and option names are `body` muted, "Comment" is
  `label` muted (`ProductItemAccordion/index.tsx:109,132,163`).
- The order's details bar has no title (the number is in a card under it); the driver
  map of the same order has the number as the bar's title.

## H8. Layout

- **The header scrolls with the content** on Login, Forgot password and the driver's
  schedule; it is fixed everywhere else. The space under it is 0 (orders, messages), `sm`
  (details, review, search), `md` (accept, login, forgot, schedule) or 20 (profile,
  sessions, payouts, Stripe).
- **The loading and error states of the order's details have no bar** (inherited: the
  back arrow was in the header that only the loaded state draws).
- The page gutter is on the scroll's frame on Orders, Messages, Login and Forgot, and on
  its content elsewhere: a frame clips the side shadow of cards and inputs. To confirm on
  a device.
- List gaps: `md` between order cards, `sm` between message rows, payouts and sessions.
- A section title's distance to its content is 10, 15, 20 or 30 depending on its host.
- Band dividers are full width on the driver map and inset by the gutter in the details
  and the review; the bill has the page's section divider between its rows and its total.
- The floating map buttons are `xl` from the bottom on the map tab and `sm` on the driver
  map; Android's own zoom buttons are left on the driver map, at the corner where the
  app's buttons sit. To confirm on Android.
- The toast is placed over the raw inset: it may cover a tab bar or a bottom bar. To
  confirm on a device.
- The calendar's day cells are 32 high and about 34 wide at 320 pt, without `hitSlop`.

## H9. Skeletons that do not match what loads

Orders always reserve the timer line (about 22 pt too tall per card off the enterprise
plan) and the logo and badge bones; the messages skeleton's gap is `md` for rows `sm`
apart; the chat's composer loads about 96 pt taller than its skeleton (the recipients and
quick messages rows); the order's details, the assign request, the profile, the payouts
and Stripe use generic bones; two skeleton families pulse differently (`SkeletonBone`
and `Placeholder` / `Fade`).

## H10. The schema against the marketplace app's

Visibility keys the marketplace app has, whose piece this app draws without a key:
`orders.business_name`, `confirmation.order.total`, `confirmation.order.eta` (the
"Placed to" line), `profile.password`, `orders.review_order_button`,
`business_map.recenter`; and `confirmation.customer.address`, which the phase 4 gate
excluded (the delivery needs it). The chat button's key is `confirmation.order.messages`
here and `confirmation.business.messages` there.

Defaults of shared components that differ with no recorded reason: `auth_form.slots.cancel`
(primary outline here, secondary solid there), `field.base.error` (`body_sm` / `caption`),
`home_hero.base.overlay` (0.4 / 0.15) and `title_align` (start / center),
`bottom_nav.base.padding_x` (none / `xl`), `order_details.slots.directions` (neutral
ghost icon / primary outline), `order_details.slots.review` (solid primary / outline
neutral). They were set to reproduce today's driver app.

`auth_form.slots.submit` is `lg` in both schemas: Login and Forgot password draw a 50 pt
button inside a screen, where decision D3 says 44 (`md`) inside a screen and 50 in the
bottom bar.

## Not changing the look, still to do

Move `FieldError` to the shared primitives; let `ONotice` style node children; an inline
spinner primitive (three direct `ActivityIndicator`); `ODivider` in the chat's separators;
one `withDividers` for the details and the profile; delete the unused header avatars of
`OModal`; `themeText` in `Chat/ChatThread.tsx`; the month arrows of `OCalendar` and the
chat's remove-image as icon buttons; one helper for the delay timer and the hours.

## Not seen

Everything that needs a device with a session: the shadows clipped by a scroll's frame,
Android's zoom buttons, a toast over a bar, the measured skeleton shifts, the widths of
320 and 360 on the authenticated screens (four tabs in Payouts, two half-width buttons
in a grouped row, the orders header's icons, six code cells), the accept / reject bar
over the home indicator, Android's elevation edges, large text, right-to-left, the
pressed states. The logic submodule was not read.

## Round 3: H8 and H9 seen on devices

Date 2026-11-13. Both platforms, the served theme (primary `#7C3AED`), the test driver of the
local API: iPhone 17 simulator (iOS 27.2, 402 × 874 pt, status bar 62) and the Android emulator
(API 37, 411 dp; 1 dp = 2.625 px). Nothing here was changed: H8 and H9 are the owner's.

**How the numbers were taken.** Points from the view hierarchy (`idb ui describe-all` frames;
`uiautomator dump` on Android) and from the screenshots' pixels (the 1 pt card border `#E9ECEF`,
the skeleton colors, read row by row). Screenshots are in `.theme-audit/screens/pass/{ios,android}/`
(git-ignored). Spacing tokens: `xxs` 2, `xs` 5, `sm` 10, `md` 15, `lg` 20, `xl` 30. A header bar is 62 to 110
on iOS (its icon buttons 64 to 108); "under the header" is from 110. **Skeletons:** the local API answers in
milliseconds and the lists are cached, so a real skeleton could not be caught on a device. Each was forced on
(a temporary local edit, reverted, never committed) and measured on the iPhone: the numbers are the real ones, the
frames are `ios/90…95-*-forced.png`. A proxy that slows the API (Android) showed no skeleton either, only the cached lists.

### H8: layout

| # | Screen | What is seen | Options | Recommendation |
|---|---|---|---|---|
| 1 | Login, Forgot password, Schedule: does the header scroll? | At rest the bar is where every bar is (64 to 108) on both platforms. **Not seen scrolling**: on the iPhone and the emulator the three pages fit without scrolling (`ios/61-login.png`, `64-forgot.png`, `35-schedule.png`); so only the code says it scrolls with the content | (a) a fixed header in the three, as the other eight screens · (b) keep | (a): with the keyboard open on Login the title and the back arrow would leave, nothing else on the page does that |
| 2 | Space under the header (from the bar's bottom, 110 on iOS) | Orders 5 (tabs at 115), Messages 0 (chips at 110), Details 10 (the header card's border at 120), Search 10 (first select at 120), Accept / reject 15 (lead at 125), Forgot 15 (125), Schedule 15 (125), Login 20 (tabs at 130), Sessions 20 (cards at 130), Profile 20 (the photo at 130; no bar, the title row). The accept step of the position is 55 (the stepper's own padding). Android equal (`android/30-details-top.png`, `44-schedule.png`) | (a) one value: `md` (15) · (b) one value: `lg` (20, the page gutter) · (c) keep the five values | (a) `md`: the value in the middle of today's 0 to 20, the one three screens already have, and the gap between two cards. Orders and Messages gain 10 to 15, Login and Sessions lose 5 |
| 3 | Order details, loading and error states | The error state draws no bar: the picture, the text and a 44 pt "Go to my orders" at y 359; no back arrow (`ios/06-notfound-after.png`, `android/10-notfound-after.png`). Android's hardware back works; on iOS the only way out is the button. The loading state is the 6 generic lines with no bar either (`ios/93-details-skeleton-forced.png`) | (a) the bar (back) in every state of the screen · (b) keep | (a): the same ONavbar the loaded state draws; no new piece |
| 4 | The page gutter on the scroll's frame (Orders, Messages, Login, Forgot) or on its content (the rest) | **Seen and measured.** An Orders or Messages card has its 1 pt border at x 20 and **nothing outside it** (pixel row at x 20: border, then white): the frame clips the side shadow. A Details or Sessions card has a soft shadow on its sides (x 16 to 20 go from 254 to 243). `ios/10-orders-pending.png` and `30-messages-tab.png` against `20-details-top.png` and `36-sessions.png` | (a) the gutter on the content everywhere (the shadow shows on every card's sides) · (b) keep | (a): same card, same shadow; the cost is padding on the list's content instead of its frame |
| 5 | Gaps between the cards of a list | Orders 15 (`md`; cards at 179 and 339.7), Messages 10 (`sm`; rows at 157, 282, 408), Sessions 10 (cards at 130, 226.7). The messages skeleton already uses 15 (see H9) | (a) `md` for every list of cards · (b) `sm` for every list · (c) `md` for the order cards (Orders, Messages), `sm` for the small rows (Sessions, payouts) | (a): one gap; it also makes the messages skeleton's rows land on the loaded rows' pitch |
| 6 | A section title's distance to its content | Details: "Order Details" 21 and "Payments" 20 (`lg`); Accept / reject: "Reject reasons" 16; a sheet's title to its first row 29 to 30 (`xl`: SLA's, Select Date, Language) | (a) pages `lg` (20), sheets keep their 30 (the sheet's own title) · (b) one value for pages and sheets · (c) keep | (a): only Accept / reject moves (16 to 20); a sheet's title is `sheet.title`, a different piece |
| 7 | Dividers: full width or inset | The details' band is 8 pt tall from x 20 to 382, inset by the gutter (`ios/20-details-top.png`, y 344 to 352). The driver map's grey is **a 48.6 pt row of distance and time** (`#F8F9FA`, x 0 to 402), not a divider: another piece | (a) keep: they are two pieces · (b) inset the map's row by the gutter | (a): nothing to unify; the audit took the row for a band |
| 8 | The map's floating buttons | Map tab: zoom in / out at 32 pt, 30 (`xl`) above the map's bottom (716 against 746) on iOS; at the gutter on both. Driver map: "Show in other maps" 10 (`sm`) above its bottom (700 against 710), the two 32 pt buttons stacked above it (bottom at 646). The driver map has **no zoom buttons on iOS**. **Android: Google's own zoom control (+ and −) is left on, and the app's "Center on my position" covers its "+"** (the buttons at x 986 and 999 px, y 1785 and 1796 px: 4 dp apart; `android/35-driver-map.png`) | (a) Google's controls off on the driver map and the app's own 32 pt zoom buttons (the map tab's), on both platforms · (b) Google's off, pinch only · (c) the app's buttons moved off Google's corner · (d) keep | (a): the same role looks the same on the map tab and the driver map, and the covered "+" goes |
| 9 | The toast over the bars | **Seen on both.** "Can't logout, You have assigned orders": iOS the toast spans y 750 to about 810 over the tab bar (746 to 830: it hides the Messages and Profile tabs, `ios/41-logout-refused.png`); Android its text at 2178 px over the bar (2169 to 2271 px, `android/48-logout-refused.png`) | (a) above the bar: the toast's offset is the bar's height plus the inset · (b) at the top, under the header · (c) keep | (a): the toast is drawn at the root, outside the tab navigator, so the bar's height must reach it (a coordinator's change in `OToast` / `appContainer`) |
| 10 | The calendar's day cells | After the width fix a cell is 52 × 32 pt on 402 pt (`ios/05-calendar-after.png`: 52 wide, rows 36 apart), 40 × 32 at 320 (computed); no `hitSlop` | (a) cells `md` high (44) as every touch target (the sheet grows by 72 pt for six weeks) · (b) `hitSlop` of 6 (neighbours overlap their slop) · (c) keep | (a) |

### H9: skeletons

| # | Screen | What is seen (loaded against skeleton) | Options | Recommendation |
|---|---|---|---|---|
| 11 | Orders | Loaded: 146 pt with the timer (Pending, In Progress), 114 pt without (Completed: `ios/12-orders-completed.png`); gap 15. Skeleton: **135** with its timer line always on, gap 15, bones for the logo, name, meta, timer and badge (`ios/90-orders-skeleton-forced.png`): 11 pt short where the card has a timer, 21 pt tall where it has none | (a) the skeleton as tall as the card: the card's gaps, the timer line only on the tabs that show it · (b) keep | (a) |
| 12 | Messages | Loaded: 115 to 116 pt, gap 10. Skeleton: **113** pt, gap **15** (`ios/91-messages-skeleton-forced.png`): the first row lands on the loaded one (y 157, 2 pt shorter); each next one is 3 pt further (128 against 125 apart), 18 pt after six | (a) the loaded row's height and gap (with H8 #5 `md`, the gap already matches) · (b) keep | (a) |
| 13 | Chat | The loaded composer is the recipients row (44, y 700), the quick messages (32, y 754) and the input (44, about y 796); the skeleton has the input only (`ios/92-chat-skeleton-forced.png`): the thread moves **96 pt** (44 + 32 + two gaps of 10) when it arrives | (a) two more bones for the two rows · (b) keep | (a) |
| 14 | Order details | Skeleton: six groups of four generic lines, pitch 126 (the lines 24 apart), no bar, no card, in `#EEF1F3` (`Placeholder` / `Fade`), where the loaded page is the bar, a header card of about 98 pt and three collapsible cards of about 71 (86 apart) (`ios/93-details-skeleton-forced.png`) | (a) rebuilt with `SkeletonBone` in the shape of the bar, the header card and the three cards · (b) keep | (a) |
| 15 | Profile | The photo bone is where the photo is (y 130). Then five bones 59 pt apart (y 272 to 508), where the loaded form is a label and a 44 pt field every 90 pt and seven fields (`ios/94-profile-skeleton-forced.png`): the form is 31 pt per field longer | (a) one bone for a label and one for a field per row, at 90 · (b) keep | (a) |
| 16 | Two pulse styles | `SkeletonBone` is `#F8F9FA` and pulses with the theme's motion; the details' and the assign request's `Placeholder` / `Fade` is `#EEF1F3` and its own pulse (frames of #14 and #11) | (a) every skeleton is a `SkeletonBone`; `Placeholder` and `Fade` go · (b) keep | (a), with #14 |
| 17 | Sessions, Payouts, Stripe | **Not seen**: the test driver has no payouts and no Stripe account, and the sessions skeleton could not be reached (`SKELETON_CARDS`: two bones and a button, from the code) | (a) measure when an account has them · (b) leave | (a) |

### What the owner has to answer

1. **Header and the top of every screen** (#1, #2, #3): a fixed header in every screen, `md` (15) under it, and the bar in every state of the order's details? Options: (a) all three · (b) pick some · (c) keep. Recommendation (a).
2. **The cards** (#4, #5, #6, #7): the gutter on the content (the side shadows show on Orders and Messages), `md` between cards in every list, `lg` before a page section's content, the bands left as they are? Recommendation: all four as proposed.
3. **Over the map and over the bars** (#8, #9, #10): the app's zoom buttons on the driver map (Google's off), the toast above the bars, 44 pt calendar cells? Recommendation: all three.
4. **Skeletons** (#11 to #17): each skeleton with the loaded piece's size, one `SkeletonBone` family? Recommendation (a), the Sessions / Payouts / Stripe ones when an account has them.

### Seen on the devices and not in H8 or H9

Fixed in this round: [decisions.md](decisions.md), "round 3". Listed here, for the owner or the next round:

- **(Decided 2026-11-14: a quick message without a text in the project is not shown.)** **Quick messages read `driver_message_1` … `driver_message_4`** in the chat (`ios/28-chat.png`): the keys' English fallback is the key itself and this project's dictionary has no text for `DRIVER_MESSAGE_n` (inherited). Not fixed: the four canned replies are copy for the product to write (the catalog's English is the key).
- **The empty state's picture is yellow** (`ios/13-orders-cancelled.png`, `android/23-orders-cancelled-empty.png`): `images.empty.not_found` is the old brand's bundled illustration, in a purple app. A new picture, not a theme value.
- **The schedule writes "Tues" and "Thur"** (`ios/35-schedule.png`); the calendar "Tue" and "Thu" (`DAYSHORT3`, `DAYSHORT5` of the project's dictionary against the schedule's own abbreviations).
- **(Decided 2026-11-14: the comment field is not focused on entering.)** **Reject Order on iOS opens the keyboard at once** (the comment field has `autoFocus`) and covers the last reasons (`ios/52-large-reject.png`); on Android no keyboard opens (`android/51-reject.png`).
- **The location-off dialog's "Cancel" does not close it** (iOS, location revoked: `ios/70-location-off-dialog.png`, tried twice); granting the permission closes it. Not investigated.
- A dialog drawn with `box` and a `KeyboardAvoidingView` on iOS loses its bottom inset and gutter: the view's own `paddingBottom` (the keyboard's, 0) replaces the style's. Seen in a test, not on a screen; only a very tall dialog would show it.
- iOS: the "Enable persistent notifications" alert comes back after every reload (a system alert, outside the theme).


## Round 4: H8 and H9 applied (2026-11-14)

*Round 4 measured a space of `md` (15) under the header. Since 2026-11-23 it is `xs` (5) ([decisions.md](decisions.md), "The space under a header is `xs`"): every position under a bar in this round is 10 higher today.*

The owner's decisions on #1 to #16 are applied ([decisions.md](decisions.md), "Phase 9: one look, round 4").
Both platforms, the same devices and theme as round 3 (iPhone 17: bar bottom 110, 402 × 874 pt; Android emulator: bar
bottom 72 dp, 411 dp). Numbers are points (dp on Android) from the view hierarchy and from the screenshots' pixels.
Screenshots are in `.theme-audit/screens/round4/{ios,android}/` (git-ignored), `<nn>-<screen>-{before,after}.png`.
A **visual** top is the first painted edge (the tab track, the card's border); round 3 counted some tops by the frame of a
tab inside its track (5 pt in), so Orders read "5" and is 0 visually.

### H8: layout

| # | Done | Where the rule lives | Before → after (iOS · Android) | Screenshots |
|---|---|---|---|---|
| 1 | done | `Container` takes the screen's `header` and draws it over its scroll; the Login and Forgot forms and the Schedule draw the bar outside their scroll | At rest the bars are where they were (iOS 64 to 108, Android 26 to 70) and Login's tabs, Forgot's lead and Schedule's title do not move (125 · 86.9). The three pages fit without scrolling on the devices, so **a scrolling header was not seen**; a test finds the bar outside the `ScrollView` and the content inside it | `30-login`, `31-forgot`, `07-schedule` |
| 2 | done | `ONavbar` owns the gutter on its sides and `md` under it (the room around its bar); no screen adds a space of its own under it. The `account_page.padding_top` read is gone from Profile, Sessions, Payouts and Stripe, and the key from the schema (never published) | First content under the bar, visual: Orders (tabs) 110 → 125 · 72 → 86.9; Messages (chips) 110 → 125 · 72 → 86.9; Details (header card) 120 → 125 · scroll top 72 → 86.9; Search (first select) 120 → 125 · 81.9 → 86.9; Accept / reject (lead) 125 → 125 · 86.9 → 86.9; Forgot, Login, Schedule 125 → 125 · 86.9 → 86.9; Sessions (card) 130 → 125 · 92.2 → 86.9; Profile (photo) 130 → 125 · 92.2 → 86.9; driver map (status badge) 113.3 → 128.3 · 72 → 86.9; chat (divider under the bar and the store's line) 138 → 125. **The accept step's stepper**: its 55 is the step's own `xxl` padding (40) over the page's 15; it stays 55 → 55 (lead at 165 · 126.9, unchanged): the stepper's padding is the stepper's | `03`, `06`, `09`, `15`, `10`, `11`, `08`, `01`, `12`, `13` |
| 3 | done on the loading state; the error state is **not seen** on a device | `OrderDetailsUI` draws `ONavbar` first in its three states (loading, page, error); the assign request does too | Loading: the bar with its back arrow (iOS 8, 64) over the skeleton, where there was none. The error state is covered by a test (the bar and "Go to my orders"); no order with an API error could be opened without touching the data | `24-details-skeleton` |
| 4 | done | The gutter is the scroll's `contentContainerStyle`; `SafeAreaContainerLayout` and `Container` lay no sides | An Orders card's side now has a shadow: pixels at x 14, 16, 18, 19, 19.5 go 255, 255, 255, 255, 255 → 255, 254, 250, 246, 245 (border at 20.5: 233) | `03-orders-pending` |
| 5 | done | `md` in `PreviousMessages` (`messageListStyles.card`), `Sessions` and `Payouts` | Messages rows (iOS) 10 → 15 apart (157, 281.7 → 172, 301.7); Sessions 10 → 15 (iOS 151, 247.7 → 146, 247.7, 349.3; Android 92.2, 188.2 → 86.9, 188.2, 289.5). Payouts: not seen (no payouts); a test pins its gap | `06`, `08` |
| 6 | done | `SectionTitle page` (`lg` under it); a block that follows a `ChoiceRow` takes back the row's own `xs` margin | Reject reasons (title to the first row's frame) 15.4 → 20.1 · 14.9 → 19.9; Schedule (the day's title to its first row's text) 46 → 56 · 46.1 → 56 (the card starts 10 → 20 under the title). The review's titles carry the review form's own text look and rhythm and are left (not measured in round 3) | `11-reject`, `07-schedule` |
| 7 | no change | — | — | — |
| 8 | done | `MapZoomControls` / `useMapZoom` (`MapView/MapZoomControls.tsx`), used by the Map tab and the driver map; `zoomControlEnabled={false}` on both | iOS: no zoom buttons → "+" 488, "−" 530, fit 572, center 614, other maps 656 (the last three where they were). Android: Google's "+" (359.6, 664.4) covered "Center on my position" (664) → Google's gone, the app's "+" 538.7, "−" 580.6 above fit 622.9 and center 664.8, other maps 706.7; nothing overlaps. Both zoom (a diff of the map's pixels after a tap) | `12-drivermap`, `12b-zoom-0`, `12c-zoom-in` |
| 9 | done, with the bottom action bar | `BottomBarContext`: the tab bar (`BottomNavigator`) and `FloatingButton` report their height, `OToast` rides above the tallest | "Can't logout" text, iOS y 769.7 → 709.7 (it hid the Messages and Profile tabs; the bar is 94 tall with the home indicator), Android 819.8 → 744.8 (bar 75). The action bar case is covered by tests (`FloatingButton` reports its layout height); not seen on a device | `14-toast` |
| 10 | done | `OCalendar`: the day's cell is `themeControlHeight('md')`, its circle the `sm` one, the weekday row `sm` | Day cells 32 → 44 high (rows 36 → 48 apart); the custom range sheet's top 485.3 → 425.3 on iOS for a five-week month (+12 a week, +72 for a six-week one); Android cells 32 → 43.8 | `16-calendar` |

### H9: skeletons

| # | Done | Where the rule lives | Before → after (iOS · Android) | Screenshots |
|---|---|---|---|---|
| 11 | done | `OrderListItemSkeleton` is laid out with `orderCardStyles` and draws what `orderCardPieces` (timer, position chip) and the theme's visibility say | Pitch 150 (card 135, always a timer line, no chip) → 160 (card 145.0) against a loaded 145.7 + 15 (iOS) and 145.5 + 15 (Android: 150.1 → 160.0 against 160.5). The **Completed** tab (no timer, no chip) was not captured on a device (the tab would not take a tap); a test pins its bones | `20-orders-skeleton` |
| 12 | done | `MessageListSkeleton` with `messageListStyles` (the rows' own card, gap and lines); it was the orders card | Pitch 128 · 127.9 against a loaded 124.7 · 124.3 → 129 · 129.2 against 129.7 · 129.3 (rows `md` apart now) | `21-messages-skeleton` |
| 13 | done | `ChatMessageSkeleton` draws the composer with `chatStyles` (toolbar, recipients, quick messages, primary row) and the app's `ONavbar` | The composer was the input row alone (the thread moved 96 pt); now the recipients row, the quick messages (iOS 754 to 786, Android 789.3 to 821.3, the real 754 · 789.3) and the input (796 to 840 · 831.2 to 875.4, the real 796 · 831.2) | `22-chat-skeleton` |
| 14 | done | `OrderDetailsSkeleton` (`OrderDetails/OrderDetailsSkeleton.tsx`), from `headerStyles`, `contentStyles` and `deliveryStyles`; the same one in the assign request | Six groups of four generic lines, no bar → the bar, the header card (top 125), its data line (310; the page's 311), the page's divider (348; 349) and three cards whose titles are at 397, 482, 567 (the page's 398.3, 483.7, 569; 85 apart against 85.35). The same on the assign request, both platforms | `24-details-skeleton`, `25-logistic-skeleton` |
| 15 | done, with a native part left out | `ProfileSkeleton` (`UserProfileForm/ProfileSkeleton.tsx`) from `profileStyles` and the account page's field | Five boxes 59 apart → a label and a box per field, **89 apart** (the page's 89.3), seven fields, the photo, the name, the availability row and the Edit button. The first label is 8 pt above the page's (442 against 450.3): the loaded availability row is as tall as the platform's switch, which is native and not in the theme, so the row is the list row's own height | `23-profile-skeleton` |
| 16 | done | `Skeleton.tsx` (`Placeholder`, `PlaceholderLine`, `PlaceholderMedia`, `Fade`) is deleted; `grep` finds none in `src` | Two colors and two pulses → every skeleton is `SkeletonBone` (`surface_alt`) with the theme's pulse | all |
| 17 | not done (as decided) | — | Sessions, Payouts and Stripe skeletons left as they were: not measurable with this account | — |

### Seen on the devices and not in H8 or H9

- **The dialog in the modal's box on iOS** (the location dialog, the delivery position, the requirements): fixed. At HEAD the dialog sat 27 pt below the center of the window (its title at 385.7, centered between the insets it is at 358.7): the avoiding view's `paddingBottom` replaced the room's inset and gutter. A test finds the room's padding on a plain view above the avoiding one. `ios/40-location-dialog-after.png`.
- **The location dialog's Cancel** (iOS): **not reproduced**. With the driver on shift and the location revoked (`simctl privacy revoke location com.ordering.app1`, which also restarts the app) the dialog "Mobile location not enabled" opened, and one tap on Cancel closed it and it stayed closed for 6 s: on the Orders tab and on the Messages tab, with the round's code and with `OModal` as it was at HEAD (there Cancel is at y 526 to 570, 27 pt below where the fixed dialog has it: a tap at the fixed position misses it). No cause found in `useDriverLocationTracking.ts` or `DriverLocationDialog`: `close` stores the kind and `showDialog` ignores the same kind until the device is fine once (a test already pins it). Not tried: the Settings app's own switch, a real device.
- The driver map's travel time on Android reads "12523548717494 h 47 min" with the emulator's location (a speed near 0): `formatDuration` is given a huge number of minutes. Not touched.

## Since round 4: what was replaced

The pieces of the order card and the tabs that the findings above name, and what stands in their place (the rules are in
[THEMING.md](../THEMING.md), "The order card" and "The Orders tabs"; the owner's decisions in [decisions.md](decisions.md), 2026-11-20
to 2026-11-23). None of the findings below was reopened: the code under them changed.

| Named above | Now |
|---|---|
| H1: "the order timer is colored text on the orders card (`PreviousOrders/OrderItem.tsx:249`)" and the card's status badge | The card has a **status band** at its top: the status at its start, the time at its end ("24 min left", "12 min late"; "12:53 PM · today" for an order that is over), on the tint of the time's state (on time the brand's, at risk the warning's, late the danger's; for an order that is over how it ended). The tone is a `badge` soft variant (`primary_soft`, `warning_soft`, `danger_soft`, `success_soft`), so the card, the chips and the editor agree. The Messages row's timer is still a badge |
| H2: the card's `NO` + masked id (`OrderItem.tsx:168`) and `ORDER_NO` (`OrderItem.tsx:280`) | The card's strong line is "#number · customer" (`order_card.title_text`), the header's top line the store's name. The **Messages row is titled "#number · store"** (2026-11-23): one line, the number never cut, built with the helpers of `utils/orderTitle.ts` that the card's header also uses; the masked id of a secure project is kept. This replaces, for the Messages row only, the "Order No. 101" the "Order number" row of decisions.md's "Phase 9: one look, round 2" gives it; the other screens keep theirs |
| H5: "Delivery #N is a selected chip on the card, a primary badge in the details, colored text in accept / reject" | "Delivery #N" is a **pressable `OBadge` in the order type's colour** (violet for a delivery, teal for a pickup, orange in the store; neutral for an unknown type) on the card and in the order's details (both layouts); it is inert and dimmed while the order is on the way to the customer. The position setter (an icon-only chip) is for an order with no position yet |
| H5: "Cancel has four looks" (`OrderItem.tsx:293`) | The card's actions are `order_card.slots.advance` and `decline`; Cancel inside a dialog or sheet is the neutral outline (decision H5, done) |
| H8 and its table, #11: "Loaded: 146 pt with the timer (Pending, In Progress), 114 pt without (Completed)"; "Pending", "In Progress" and "Completed" tabs | These heights are those of the old card. The tabs are **Assigned · In Progress · History** (History holds the completed and the cancelled, with the chips All · Completed · Cancelled), or Active · History when a project combines them; "Assigned" is what "Pending" was meant to be. The card's heights are not re-measured here: see verification.md, rounds 9 to 12 |
| H9 and round 4, #11: the orders skeleton with "its timer line always on, bones for the logo, name, meta, timer and badge" | The skeleton is the band's (a tinted band with a status and a time bone), the header (logo, name, title, total), the stop line, the chips and, for an open order, a buttons bone as tall as the card's buttons; the History skeleton has no stop line and no buttons. The remaining difference: a card with no delivery position yet is about 12 taller than its skeleton |
| H8 #4 and #5: the card's side shadow and the gap between cards (`md`) | Unchanged: the gutter on the content and `md` between the cards still hold |
| The connection indicator ("the orange pill and its dialog", D8 and H5's dialogs) | A pill (a dot and Live / Reconnecting / Offline) and a **bottom sheet** ported from the business app: the dialog, its legend and its "Update" restart button are gone |
| The platform's `Switch` (D2's switch, "the native switch is 63 × 28") | `OSwitch` is drawn by the app: the same on both platforms |
| The accept sheet's dial of hours and minutes | One figure of minutes with presets, a stepper and typing |
