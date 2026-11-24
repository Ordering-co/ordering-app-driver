# Pages, sections, visibility and images (phase 4)

Date: 2026-11-13 · Status: **approved** with P1–P4 as recommended (gate 4, 2026-11-13; see decisions.md).

Inputs: the "Blocks and pieces" and "Images" tables of the area reports
([areas/](areas/)), and the marketplace app's schema: a piece both apps draw keeps the
marketplace app's key name and editor group, so the Dashboard's labels are reused.

Rules applied: a **block** of a screen is a section (ordered, hidden); a **piece** inside
a block is one flat `visibility` key, default `true` (shown, as today); an element has a
single switch; what a server config already decides (`configs.*`) is not given a second
switch in the theme; a key never cuts the navigation or the delivery flow; a key hides no
more than it says.

## 1. Pages and their sections

`footer` is `false` on every page (the app has no footer) and hidden in the editor. A
section with `group` moves among the sections of its group; `fixed` = not hideable, stays
in place.

| Page | Screen | Sections, in today's order | Group |
|---|---|---|---|
| `onboarding` | IntroductoryTutorial | `slide_1`, `slide_2`, `slide_3`, `slide_4`, `slide_5` — hideable, movable | `slides` |
| `home` | Home (welcome) | `logo` (hideable) · `title` (hideable; title and text) · `login_account` (fixed) | — |
| `orders` | Orders tab | `tabs` (fixed) · `summary` (hideable — **P1**) · `list` (fixed) | — |
| `order_details` | OrderDetails, OrderDetailsLogistic | `header` (fixed: number, status, dates) · `custom_fields` · `business` · `customer` · `products` (not hideable, movable) · `bill` · `vehicle` (spot and vehicle) · `review` (the "Review customer" button) · `actions` (fixed: the bottom bar) | `details` for `custom_fields` … `vehicle` |
| `review` | ReviewCustomer | `customer` (photo and name) · `rating` (fixed) · `quick_comments` · `comment` · `send` (fixed) | — |
| `profile` | Profile | `profile_photo` · `availability` · `information` (the data and its Edit button) · `account` (the rows: schedule, sessions, Stripe, payouts) · `language` · `logout` (fixed) · `delete_account` (not hideable — store rules) | `main` for `availability` … `language` |

Screens without sections of their own (one block, or blocks that cannot move): Splash,
Login, Forgot, ScheduleBlocked, RequestPermissions, MapView, Messages, OrderMessage (chat),
AcceptOrRejectOrder, Sessions, Payouts, StripeConnectAccount, and, since 2026-11-23, the route (`OrdersRoute`, `OrdersRouteStops`:
one map and one panel that cannot move, and one timeline: there is no `pages.route`, because a page would need a reader and a test for nothing). Their pieces are visibility
keys below, or nothing.

Not sections, and why: the orders tabs (Assigned · In Progress · History, or Active · History) and their order (the project's, with
`combine_pending_and_progress_orders` and `logistic_module`); the floating action bar and
the inline status buttons (the delivery flow); the login methods (server configs); the
profile's fields (the server's validation fields); the schedule gate and the permissions
screen (behaviour).

Code consequences: `order_details` and `profile` render through `usePageSections`; a
hidden section renders no view and the gap between sections is the page's (today's
dividers with margins 40 / 20 become the page's separator); the bottom bar's clearance is
measured, so hiding `review` or `bill` leaves no blank band.

## 2. Visibility keys

All `boolean`, default `true` unless said. 46 keys in 9 editor groups (37 in 8 at the
phase 4 gate; six added before the first publish, decision H10 of 2026-11-13; `orders.quick_actions` and `orders.absolute_time` on 2026-11-20
and `orders.route` on 2026-11-23: the table below lists them; counted by reading the schema's `visibility`). "M" = the
marketplace app has the same key.

| Group | Key | Hides | Notes |
|---|---|---|---|
| `bottom_nav` | `bottom_nav.map` | the Map view tab | **P2**. Orders and Profile are not hideable (the main flow, the logout) |
| | `bottom_nav.messages` | the Messages tab | **P2**. The chat stays reachable from an order |
| | `bottom_nav.labels` | the labels under the tab icons | |
| `orders` | `connection_status` (M) | the connection pill of the orders header (Live / Reconnecting / Offline, a dot and one word; since 2026-11-23 the business app's pill) | the connection sheet it opens and the offline banner are state: never hidden |
| | `orders.title` | the tab's title | |
| | `orders.refresh` | the refresh icon | pull to refresh stays |
| | `orders.search` | the search icon and its modal | |
| | `orders.business_logo` (M) | the store's logo on an order card | |
| | `orders.order_number` (M) | the order's number on a card | |
| | `orders.date` (M) | the order's date on a card | |
| | `orders.order_type` | the order type chip | |
| | `orders.order_status` (M) | the status chip | |
| | `orders.business_name` (M) | the store's name on an order card | H10 |
| | `orders.review_order_button` (M) | "Review customer" of a group of delivered orders | H10; the order details keep their `review` section |
| | `orders.quick_actions` | the quick actions of an order's card and the Accept / Reject (or "View order") of an assign request; a tap still opens the order | default **on**; the business app's key and label ("Quick actions on the order card"), theme only |
| | `orders.absolute_time` | nothing when off; on, an open order's band text ends in " · due 12:53 PM" | default **off**; "Clock time on the order card" |
| | `orders.route` | the "Route · N stops" button above the first card of In Progress, **and the route's two screens**, which are then not registered in the stack | 2026-11-23; "Route button on the orders list" (`BUILDER_THEME_VIS_ITEM_ORDERS_ROUTE`, editor order 14) |
| `confirmation` (order details) | `confirmation.order.copy` | the copy icon | |
| | `confirmation.order.directions` (M) | the map icon | |
| | `confirmation.order.messages` | the chat icon | the chat stays in the Messages tab |
| | `confirmation.order.type` | the order type and payment method columns | |
| | `confirmation.order.date` (M) | the "created at" line | |
| | `confirmation.business.email` | the store's e-mail | |
| | `confirmation.business.phone` | the store's phones | |
| | `confirmation.customer.email` | the customer's e-mail | |
| | `confirmation.customer.phone` (M) | the customer's phones (also the call button of accept / reject) | |
| | `confirmation.products.options` | a product's options and ingredients | |
| | `confirmation.order.payments` | the payments card under the bill | |
| | `confirmation.order.eta` (M) | the "Placed to" line: when the order is due | H10; its own label ("Scheduled date and time") |
| | `confirmation.order.total` (M) | the bill's total | H10 |
| `messages` | `messages.title` | the Messages tab's title | |
| | `messages.sort` | the sort chips | |
| | `messages.quick_messages` (M) | the quick messages row of the chat | the marketplace app defaults it `false`; here `true` (shown today) |
| | `messages.image_upload` (M) | the image button | |
| | `messages.signature` | the signature button and pad | |
| | `messages.order_console` (M) | the order's status messages in the thread | shown only when the server's `order_logbook_enabled` also allows |
| | `messages.time` (M) | the time under a bubble | the marketplace app defaults it `false`; here `true` |
| `map` | `map.zoom_controls` | the zoom buttons | pinch stays |
| | `map.distance_bar` | the distance and time bar of the driver map | |
| | `map.other_maps` | "Show in other maps" | |
| | `business_map.recenter` (M) | the fit-route and center buttons of the driver map | H10; the marketplace app's key name, in this app's `map` group |
| `auth` | `auth.forgot_password_link` (M) | the forgot password link | |
| `onboarding` | `onboarding.skip` | the tutorial's Skip | Next and Done stay |
| `menu` | `menu.schedule` | the schedule row of the profile | |
| | `menu.sessions` (M) | the sessions row (and so the way to the screen) | |
| `profile` | `profile.password` (M) | the password and its confirmation in the profile's form | H10 |

Not keys, and why:

- **The customer's and the store's address, the customer's name, the products and the
  order number in the details:** the delivery needs them.
- **Stripe account, payouts, delete account, edit profile, availability, reject / failed /
  not-ready buttons, the SLA timer, the delivery position, the logistic tab:** each
  already has a server config; a theme key would be a second switch for the same thing.
- **The recipients row of the chat:** it decides who receives a message.
- **The tutorial as a whole:** it stays the build flag `show_tutorials`; hiding the five
  slides also skips it.
- **Sessions' and payouts' pieces, the schedule's lines, the map's callout lines:**
  nobody asked for them (start with few; a key is added when a project needs it).

## 3. Images

Theme images are `https` URLs or `''` (then the bundled asset paints). `jpg`, `png`, `webp`
only (`png` / `webp` when transparent). Ideal size = 3× the largest box a phone paints
(430 × 932 pt).

| Key | Paints | Bundled today | Size · ratio | Notes |
|---|---|---|---|---|
| `logotype` (M) | the welcome screen's logo | `logotype-invert.png` (4 KB) | 600 × 150 · 4:1 · alpha | |
| `home_hero` (M) | the welcome screen's background | `background.png` 375 × 812 at 1×, 615 KB | 1290 × 2796 · 9:19 · safe 3:4 | bundled as JPEG at 3× |
| `onboarding.slide_1` … `onboarding.slide_5` (M) | the tutorial's slides | five opaque PNGs, 8.96 MB | 1290 × 2796 · 9:19 | bundled as JPEG (≈ 1 MB in all) |
| `empty.not_found` (M) | every empty state (orders, messages, profile error) | none: an icon in the theme's color (decided 2026-11-17) | 900 × 900 · 1:1 · alpha | |
| `empty.new_order` | the new-order modal's illustration | none: an icon in the theme's color (decided 2026-11-17) | 900 × 900 · 1:1 · alpha | |
| `empty.schedule_blocked` | the schedule-blocked screen's illustration | `delivery-waiting.png` | 900 × 900 · 1:1 · alpha | |
| `placeholder.business_logo` (M) | a store without a logo | `dummies/store.png` | 210 × 210 · 1:1 | |
| `placeholder.customer` | a customer or a driver without a photo (profile, review, chat) | a remote demo URL today; a person glyph bundled | 210 × 210 · 1:1 | replaces the undefined `general.user` and both demo URLs |

There is no image for the map's markers: they are discs with a glyph (`components.map_marker`; the driver's own picture, `map.driver`, and `cursor-fill.png` went on 2026-11-18).

Not theme images: the native splash and the app icon (build assets; the JS splash repeats
the native one frame by frame); the ~30 PNG icons (`theme.images.general.*`: arrows,
close, tabs…), which become glyphs of the two kept icon sets (D5); the grouped-orders icon.
Bundled files nothing paints after D1 (`no-network.png`, `order-creating.png`,
`order-success.png`, `loading-splash.png`, `logo.png` when no fallback reads it…) are
removed with their manifest entries.

## 4. Site settings

None: the app's name, API and project come from `src/config.json` and the Builder, and
its feature flags from the server's `configs`.

## 5. Decisions for the owner

| # | Topic | Options | Recommendation |
|---|---|---|---|
| P1 | The order summary table of the Orders tab, switched on today only for the projects `quickiedelivery` and `luisv4plus` by name in the code | (a) a section `summary` of `orders`, hidden by default, that any project turns on in its theme — those two projects lose it until they turn it on · (b) keep the project names in code, out of the theme | (a): a project name in the code cannot be edited; say whether the two projects' themes must be prepared before they move to this app |
| P2 | Hiding the Map view and Messages tabs | (a) both hideable (`bottom_nav.map`, `bottom_nav.messages`); Orders and Profile never · (b) the tab bar is fixed | (a): a project without messaging or without the map tab can drop it, and nothing becomes unreachable |
| P3 | Default of `messages.quick_messages` and `messages.time` | (a) `true`, as the driver app shows today · (b) `false`, as the marketplace app's defaults | (a): the defaults reproduce today's app |
| P4 | Customer contact data (`confirmation.customer.phone`, `.email`) | (a) hideable, shown by default · (b) not hideable | (a): some operations do not let drivers call customers |
