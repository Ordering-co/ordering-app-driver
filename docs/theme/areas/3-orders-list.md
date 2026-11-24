## Area 3 — Orders list, filters and incoming orders

Phase 1 inventory, read-only. Nothing was run (no app, no simulator, no tests): every row is from reading the code.

Path shorthand: `C/` = `src/ui/src/components/`, `S/` = `src/ui/src/components/shared/`, `P/` = `src/pages/`.

Files read completely: `P/MyOrders.tsx`, `P/AcceptOrRejectOrder.tsx`, `P/OrderDetailsLogistic.tsx`; `C/OrdersOption/{index,styles,OrderSummaryTable,orderSummaryUtils}.tsx`; `C/OrdersListManager/{index,styles,utils}.tsx`; `C/PreviousOrders/{index,OrderItem,OrderList,OrdersGroupedItem,styles}.tsx` + the two `.ts` helpers; `C/OrdersOption{Business,City,Date,Delivery,Driver,Paymethod,Status}/{index,styles}.tsx`; `C/NewOrderNotification/{index,styles}.tsx`; `C/AcceptOrRejectOrder/{index,SecurityPinFields,styles}.tsx`; `C/OrderDetailsLogistic/{index,styles}.tsx`. Read for context only (other agents own them): `S/OText, OButton, OIcon, OIconButton, OInput, OModal, ONavbar, OTextarea, ODropDown, ODropDownCalendar, OAlertOriginal, OrderListSkeleton, OrderListItemSkeleton, SkeletonBone`, `C/NotFoundSource`, `C/FloatingButton`, `C/WebsocketStatus`, `src/ui/src/layouts/SafeAreaContainer.tsx`, `src/navigators/{HomeNavigator,BottomNavigator}.tsx`, `src/theme.json`, `src/DeliveryApp.tsx` (image manifest), and the submodule controller `OrderListGroups/index.js` (props only).

Starting numbers of the area (from `.theme-audit/inventory.csv`, tests excluded): **679 literals in 25 files** — space 203, size 138, font_size 85, radius 83, color 69 (14 distinct), font_weight 32, z_index 24, border 20, opacity 7, font_family 7, text_transform 4, shadow_part 4, line_height 3. By hand: 115 inline `style={{`, 53 inline `textStyle/parentStyle/iconStyle/imgLeftStyle={{`, 11 `StyleSheet.create` (1 at module level), 2 `defaultProps`, 45 distinct theme keys read 283 times, 3 of them undefined.

### Who renders what (reachability)

| Component | Rendered by | Live in the driver app? |
|---|---|---|
| `MyOrders` page | `src/navigators/BottomNavigator.tsx:141` (tab `Orders`, initial route) | Yes |
| `OrdersOption` | `P/MyOrders.tsx:106` | Yes |
| `OrderSummaryTable` | `C/OrdersOption/index.tsx:741` | Only when `ordering.project` is `quickiedelivery` or `luisv4plus` (`orderSummaryUtils.tsx:1`) and a filter is applied |
| `PreviousOrders` → `OrdersList` (`OrderList.tsx`) → `OrderItem`; `OrdersGroupedItem` | `C/OrdersOption/index.tsx:770,793` (and `C/OrdersListManager/index.tsx:523,537`) | Yes |
| `OrdersOptionDate`, `OrdersOptionCity` | `C/OrdersOption/index.tsx:934,941` (and `OrdersListManager:634,639`) | Yes (search modal) |
| `OrdersOptionBusiness`, `OrdersOptionDelivery`, `OrdersOptionDriver`, `OrdersOptionPaymethod` | Only `C/OrdersListManager/index.tsx:646-665`, inside `isBusinessApp &&` | **No** |
| `OrdersOptionStatus` | Nothing (only exported, `src/ui/index.tsx:20,113`) | **No** |
| `OrdersListManager` | Nothing (only exported, `src/ui/index.tsx:19,112`; no `<OrdersListManager` in `src` outside its own folder and tests) | **No** — and `CLAUDE.md` says `OrdersOption` composes it internally: it does not |
| `NewOrderNotification` | `C/OrdersOption/index.tsx:854` (and `OrdersListManager:604`) | Yes |
| `AcceptOrRejectOrder` | Page (`HomeNavigator.tsx:63` → `P/AcceptOrRejectOrder.tsx:10`, `isPage`); `OModal` in `C/PreviousOrders/index.tsx:520`; `OModal` in `C/OrderDetails/Delivery.tsx:1091` (area 4) | Yes |
| `SecurityPinFields` | `C/AcceptOrRejectOrder/index.tsx:980` | Yes, when a delivery PIN is required |
| `OrderDetailsLogistic` | Page (`HomeNavigator.tsx:58`), opened from `PreviousOrders/index.tsx:96` and a push (`RootNavigator.tsx:415`) | Yes, with `configs.logistic_module` |

Props that never arrive in the driver app: `isBusinessApp` (no page passes it → every `isBusinessApp` branch is off); `isDriverApp: true` (`P/MyOrders.tsx:34`) turns off the status tags row (`C/OrdersOption/index.tsx:188,649`); `appTitle.text` is `'Delivery app'` (`P/MyOrders.tsx:60`) so the `includes('Business')` branch (`PreviousOrders/index.tsx:339`) is off and the `includes('Delivery')` branches (`:81-82`) are on.

### Elements

#### Orders tab (`MyOrders` → `OrdersOption`)

| Screen / component | Element | file:line | Values today | Function | Proposal (component, token or key) |
|---|---|---|---|---|---|
| MyOrders | Page container | `P/MyOrders.tsx:75-78,105`; `src/ui/src/layouts/SafeAreaContainer.tsx:84-92` | `backgroundColor: theme.colors.backgroundPage` (#FFFFFF), `paddingHorizontal: 20` from the layout, top/left/right insets | Screen surface and gutter | Screen surface color role; page gutter space token |
| OrdersOption | "Filters applied" notice | `C/OrdersOption/index.tsx:538-551`; `styles.tsx:154-166` | absolute `top: 50`, `right: 10`, z 1000, bg `#FFF9E2`, radius 10, padding 5, wrap; icon AntDesign `warning` 12 `#FFC700`; text size 10 default color `#344050`; link size 10 underline `rgb(44, 123, 229)` | Warn that new orders can be missed while a filter is on, with a "Clear filters" link | `alert`/notice box (warning); text preset (caption); link text; color roles warning surface / warning / link. Question: 10 pt text |
| OrdersOption | Header row | `C/OrdersOption/index.tsx:207-212,553` | row, space-between, `marginTop: 15`, `marginBottom: 10` | Screen top bar (no back button) | `header` (screen title variant) |
| OrdersOption | Screen title "My orders" | `:213-217,554` | `fontSize: 26`, `fontWeight: '700'`, `theme.colors.textGray` (#344050), family `theme.fonts.primary.name` (Helvetica) from `OText` | Screen title | Text preset (screen title); text primary role |
| OrdersOption | Header icons wrapper | `styles.tsx:29-33` | row, `background: #fff` | Group of header actions | Part of `header`; surface role |
| OrdersOption | Connection status pill | `:556-558` (→ `C/WebsocketStatus`, other area) | wrapper `marginRight: 10` | Websocket status button | `chip`/`badge` (owned by its area) |
| OrdersOption | Refresh icon | `:559-569` | Feather `refresh-cw` 24, `theme.colors.gray200` (#ADB5BD), `marginRight: 20`, `onPress` on the glyph; hidden offline | Reload the list | Icon button (`button` `shapes.icon`); icon size token; icon color role |
| OrdersOption | Filter icon + "filter active" badge | `:570-593` | AntDesign `filter` 24 `gray200`; badge AntDesign `exclamationcircle` 16 `theme.colors.primary`, absolute `right: -8`, `top: -5`, z 1000; hidden on the logistic tab | Open search modal; dot when a filter is on | Icon button + `badge` (dot) |
| OrdersOption | Tabs strip | `:596-647`; `styles.tsx:3-17,58-62` | container `margin-bottom: 20`, `min-height: 30`, `max-height: 35`; each tab `flex: 1`; selected bg `theme.colors.secondary` (#FFF4DA), others `theme.colors.gray100` (#F8F9FA); radius 10 on the outer corners of first/last tab only; hidden while a filter is applied | Switch order group: Pending / In Progress / Completed / Cancelled, or Active / Completed / Cancelled when `combine_pending_and_progress_orders` (`:1234-1279`) | Segmented tabs component (one implementation; `S/OSegment` exists and is not used here). Question: component of its own or `chip` group |
| OrdersOption | Tab label | `:629-642,221-228` | `fontSize: 12`; selected `weight '700'` color `primary` (#FFB700); unselected `'400'` `unselectText` (#909BA9); `textTransform: capitalize`, centered | Tab text | Text preset (label); selected/unselected color roles. Lesson 18: weight changes on selection |
| OrdersOption | Logistic tab (icon only) | `:599-616,229-233,242-246` | `Pressable` `marginTop: 5`, `marginRight: 5`; `OIcon` `theme.images.general.chronometer` 24×24 tint `unselectText`; selected 26×26 tint `textGray` + `borderBottomWidth: 1`; only when `logistic_module` on, not business app, tabs not combined | Tab for assign requests (logistic orders) | Same tabs component (icon tab); icon from the theme icon set |
| OrdersOption | List body | `:648` | `flex: 1`, `minHeight: HEIGHT_SCREEN - 450` | Holds banners and the list | Layout (not a token); remove the magic 450 |
| OrdersOption | Status tags row | `:649-715,234-241`; `styles.tsx:19-27` | `Tag` pill min-height 34, padding 4/10, radius 10, margin-right 15; selected bg `primary` text `white`, else bg `tabBar` text `black`; text 14 normal | Filter the tab by order status | `chip` — **never rendered in the driver app** (`isDriverApp`) |
| OrdersOption | Offline banner | `:716-739` | radius 8, `paddingVertical: 3`, bg `theme.colors.danger500` (#E63757), `marginBottom: 10`; text `color: 'white'`, centered, 14: "Last Update: {date}" and "{n} changes pending sync" | Offline state with queued actions | `alert`/notice (danger); text preset |
| OrdersOption | Pull to refresh | `:758-763` | `RefreshControl`, `refreshing` always `false`, no tint | Reload | System control; `spinner` color role if tinted |
| OrdersOption | Loading | `:805-809` | `OrderListSkeleton count={5} showTimer` (bone color `theme.colors.inputSignup`, row min-height 97, avatar 75×75 r10, lines 16/12/12, pill 88×24, hairline `borderTops`) | List loading / reconnect | `skeleton` (shared) |
| OrdersOption | "Load more orders" | `:811-824,247-259` | `OButton` h 44, radius 7.6, margins 5/10/10, bg+border `primary`, text 18 `fontWeight: 'normal'` color `inputTextColor` (#FFFFFF); hidden offline | Manual pagination (`controlType: 'infinity'` in `P/MyOrders.tsx:66` but it is a button) | `button` (primary, medium, full width) |
| OrdersOption | Empty / error / network state | `:826-850` | `NotFoundSource`: image `theme.images.general.notFound` 260×220, text 18 `textSecondary` (#858585); offline adds a "Refresh" `OButton` (h 50, r 7.6, primary) that restarts the app (`RNRestart.Restart()`) | "Sorry, no results found" / API error message / "Network Error" | `empty_state` |

#### Search orders modal (inside `OrdersOption`)

| Screen / component | Element | file:line | Values today | Function | Proposal |
|---|---|---|---|---|---|
| Search modal | Modal shell | `C/OrdersOption/index.tsx:856-866`; `S/OModal.tsx:205-223`; `styles.tsx:35-37` | `OModal entireModal hideIcons`, slide; header = back arrow 24 + title "Search orders" 24/700, `paddingHorizontal: 20`, `paddingBottom: 15`; body `ScrollView` `padding: 0 20px` | Full-screen filter form | `modal` or `sheet` + `header`. Question: full screen or bottom sheet |
| Search modal | SLA select (enterprise plan only) | `:869-903,271-295,309-315`; `styles.tsx:63-85` | react-native-select-dropdown: button min-height 40, `paddingHorizontal: 15`, bg `theme.colors.inputChat` (#F8F9FA), radius 7.6; text 16/24 `#748194`; chevron Feather 18 `#444`; list border 1 `lightGray`, radius 8, bg `#fff`, `minHeight: 155`, overlay transparent; rows h 36, `paddingHorizontal: 10`, text 14 `#748194`, state bar 3 × 90% r6 `#00D27A` / `#FFC700` / `#E63757` | Filter by time status (Ok / At risk / Delayed) | `select` (sheet with `menu` rows); state colors success / warning / danger |
| Search modal | Order number, External id inputs | `:904-933,260-266`; `S/OInput.tsx:12-33` | `OInput` h 50, `padding-horizontal: 16`, text 15; overridden border 1 `#DEE2E6`, radius 7.6, `marginBottom: 24`; clear icon AntDesign `close` 20, no color given, absolute `right: 12`, `top: 13` | Filter by id | `input` + `field` with a clear icon button |
| Search modal | Date dropdown | `:934-940`; `C/OrdersOptionDate/index.tsx:43-63`; `S/ODropDownCalendar.tsx` | closed: padding 15, radius 10, border 1, bg+border `theme.colors.inputDisabled` (#F7F7F7), label 16 `unselectText`, AntDesign `calendar`/`close` 20; open: floating panel `top: 65`, radio rows (MaterialCommunityIcons 24), From/To inputs 12 pt, `react-native-calendar-picker` always visible, max-height 220; wrapper `margin-bottom: 24`, iOS `z-index: 20` | Filter by date preset or range | `select` (sheet) with a date range picker inside |
| Search modal | City dropdown | `:941-947`; `C/OrdersOptionCity/index.tsx:41-59`; `S/ODropDown.tsx` | same closed control; open list max-height 200, rows padding 15 with bottom border `lightGray`, radio 24 (`primary` / `arrowColor`), row text is `react-native-paper` `Text`; iOS `z-index: 18` | Filter by city | `select` (sheet with `radio` rows) |
| Search modal | "Search" button | `:948-959` | `OButton` default (bg+border `primary`, border 2, h 50, text 16/700 `white`, family `theme.fonts.special.name`), radius 7.6, `marginTop: 60`, `marginBottom: 10` | Apply filters | `button` (primary, large, full width) |
| Search modal | "Clear search" button | `:960-973` | `bgColor='#fff'`, border `primary`, text `primary`, radius 7.6 | Reset filters | `button` (primary, outline) |
| SLA settings content | Title, order-type tabs, status timeline, time box | `:976-1026,1034-1097`; `styles.tsx:39-45,95-145` | title 20 bold `textGray`; tabs 12/14; rail `#E9ECEF` 1 px; bars 4×22 r4; icons `clock1/clockRisk/clockDelayed` 16 tinted; time box border 1 `disabled` r 7.6 | Explain SLA states | **Unreachable in `OrdersOption`**: `onClickSetting` (`:432`) is never called. Dead code candidate |

#### Order summary table (two hard-coded projects)

| Screen / component | Element | file:line | Values today | Function | Proposal |
|---|---|---|---|---|---|
| OrderSummaryTable | Card | `C/OrdersOption/OrderSummaryTable.tsx:61-69,140` | bg `white`, radius 8, border 1 `borderTops` (#d9d9d9), margin 12/12 | Summary of filtered orders | `card` |
| OrderSummaryTable | Header bar (collapsible) | `:70-83,141-144` | `TouchableOpacity activeOpacity 0.7`, padding 12/10, bg `gray100`; title 14/600 `textGray` with `fontFamily: theme.fonts.primary.name`; AntDesign `up`/`down` 16 | Collapse / expand | Card header row; text preset (card title); `icon` |
| OrderSummaryTable | Collapsed line | `:84-89,146-149` | 13, `textGray`, glyphs `✓` `✗` in the string | One-line summary | Text preset (body small) |
| OrderSummaryTable | Meta rows | `:90-98,152-163` | label 12/600 width 110; value 12; `textGray` | Driver and active filters | Text presets (label / metadata) |
| OrderSummaryTable | Table header | `:99-105,113,165-169` | bg `primary`, padding 6/12; 12/600 `white` | Column titles | Table header: brand surface + on-brand text roles |
| OrderSummaryTable | Table rows | `:106-112,114,170-179` | padding 8/12, bottom border 1 `borderTops`; 13 `textGray` | Completed / Cancelled counts and tips | `divider` (item); text preset (body small) |
| OrderSummaryTable | Footer + "Load more orders" | `:118-136,181-201` | text 11 `backArrow` (#748194); button `TouchableOpacity activeOpacity 0.7`, min-width 110, h 32, radius 7.6, bg `primary`, text 12/600 `white`; loading = `ActivityIndicator small` `white` | Loaded count and pagination | `button` (primary, small) with its loading state; `spinner` |

#### Order card (`PreviousOrders` → `OrdersList` → `OrderItem`)

| Screen / component | Element | file:line | Values today | Function | Proposal |
|---|---|---|---|---|---|
| OrdersList | Row wrapper | `C/PreviousOrders/OrderList.tsx:33-38` | bg `'#fff'`; `'#ccc'` when a logistic order is `locked`; `gray100` when selected (only `OrdersListManager` passes the selection); `marginBottom: 10` for logistic rows | Row background and state | `card` states (default / disabled / selected) |
| OrderItem | Card | `C/PreviousOrders/OrderItem.tsx:109-124,214-222` | `Pressable` (no pressed style), `height: 105`, `paddingVertical: 15` (20 on iPad/tablet), `marginBottom: 15` portrait / 0 landscape, `marginLeft: 3`, border 1 `gray100`, radius 10; bg `'#fff'`, or with `plan_enterprise`: `danger100` (#FEEDF0) when `time_status === 'delayed'`, `warning100` (#FFF9E2) when `'at_risk'`; disabled when locked | Open the order (`OrderDetails` / `OrderDetailsLogistic`) | Order `card` inheriting `card`; state surfaces danger / warning; pressed state |
| OrderItem | SLA bar | `:262-266`; `styles.tsx:41-56` | 4 × 80, radius 20; `#00D27A` in time, `#FFC700` at risk, `#E63757` delayed; enterprise only | Time status at a glance | State indicator; success / warning / danger roles |
| OrderItem | Business logo | `:125-138,267-277`; `styles.tsx:10-13` | frame 68×68, radius 10, `marginLeft: 3`, `shadowColor: "#0000006e"`, `shadowRadius: 10`, `elevation: 15` (no `shadowOpacity`/offset, no background); `FastImage` 65×65, radius 7.6, cover | Business identity | Logo frame component (one for the app); shadow token; radius token. Lessons 11, 15 |
| OrderItem | Group number line | `:279-281` | 12/400, default `OText` color `#344050`: "Group No.{id}" | Order belongs to a group | Text preset (metadata) |
| OrderItem | Business name | `:139-144,288-292` | 16/700, `textGray`, `fontFamily: theme.fonts.primary.name`, 1 line | Card title | Text preset (card title) |
| OrderItem | Unsynced icon | `:293-299` | MaterialCommunityIcons `cloud-sync` 18 `#444` | Change made offline, pending sync | `icon` (status) or `badge` |
| OrderItem | New-activity dot | `:301-309`; `styles.tsx:31-34` | Entypo `dot-single` 32 `primary`, absolute `left: 90%` | Unread notification on the order | `badge` (dot) |
| OrderItem | Order number · date line | `:145-148,311-337` | 12/400 `unselectText`, 1 line, `adjustsFontSizeToFit`; with `change_order_id`: external id (or "No external Id Order No.{id}") · date; logistic group: "{n} Orders" · date | Metadata | Text preset (metadata) |
| OrderItem | Countdown / delay timer | `:338-354,163-190` | 12/400; color `#00D27A` / `#FFC700` / `#E63757` / none by `time_status`; text `[- ][d day ]HH:MM`; only on pending / inProgress / active tabs with enterprise plan; shifts the block `bottom: 10px` (`styles.tsx:21-23`) | Minutes to (or past) the promised time | Text preset (metadata) with a state color role |
| OrderItem | Order type chip | `:149-160,356-381`; `styles.tsx:26-29` | text 12/400 `primary` on `secondary` (#FFF4DA), h 25, padding 4, radius 5, `mRight 5`; labels Delivery / Pickup / Eat in / Curbside / Driver thru / Catering delivery / Catering pickup / Reservation; hidden on logistic rows | Order type | `chip`/`badge` (order type) |
| OrderItem | Order status chip | `:382-389` | same look as the type chip for **every** status; font 10 instead of 12 when the label is longer than 30 characters | Order status text | `badge` (status). Question: color per status (the order detail header paints green/red from `statusOrderGreen`/`statusOrderRed`, area 4) or brand tint as today |
| OrderItem | Delivery position badge | `:224-242` | `TouchableOpacity` absolute top-right, z 2, bg `primary`, radius 12, padding 4/10, text 11/600 `'#fff'` "#n"; `opacity: 0.6` and disabled on status 23 | Shows and edits the delivery order (priority) | `badge` (tappable) / small `chip` |
| OrderItem | "Set position" badge | `:243-261` | same box, bg `lightGray` (#D2D2D2), padding 4/8; MaterialCommunityIcons `format-list-numbered` 14 `textGray` | Assign a position when none | Icon `chip` |
| OrderItem | Delivery position dialog | `:395-499`; `S/OModal.tsx:193-204` | `OModal isTransparent` (backdrop `rgba(0,0,0,0.4)`); box bg `'#fff'`, radius 12, padding 24/20, width 85%; title 18/700; subtitle 13; steppers 52×52 radius 26 bg `primary`/`lightGray`, icon 26 `'#fff'`; `TextInput` 80×60, radius 10, border 1 `lightGray`, bg `inputChat`, 28/700 `primary`; Cancel (`lightGray`, text `textGray` 15) and Save (`green` or `disabled`, text `'#fff'` 15), h 42, radius 7 | Change the delivery position | `modal` (dialog) + number stepper + `button` pair |

#### Grouped orders and action buttons (`PreviousOrders`)

| Screen / component | Element | file:line | Values today | Function | Proposal |
|---|---|---|---|---|---|
| OrdersGroupedItem | Group header (accordion) | `C/PreviousOrders/OrdersGroupedItem.tsx:26-53,56-102`; `styles.tsx:58-76` | section bg `#FFF`, `padding-vertical: 10`; `TouchableOpacity activeOpacity={1}`; frame 65×65 r10 with the same shadow as the card logo; `FastImage` `theme.images.general.ordersGroup` 60×60 r 7.6; title 16/600 `textGray` "Group No.{id}"; two lines 12 `unselectText` ("{n} Orders", date); chevron MaterialCommunityIcons 18 `theme.colors.textNormal` (undefined) | Collapse / expand a group of orders | Accordion row inheriting `card`; text presets; `icon` |
| OrdersGroupedItem | Group body | `:104-112`; `styles.tsx:78-85` | `display: flex/none`; `Animated.View` with no animation; `margin-top: 20`, `margin-left: 20` | Orders of the group, then group actions | Layout; space tokens |
| PreviousOrders | Action row | `C/PreviousOrders/styles.tsx:36-40` | row, space-between, `margin: 10px` | Holds one or two buttons | Layout; space token |
| PreviousOrders | Negative soft buttons ("Reject all", "Order not picked up by customer", "Pickup failed", "Delivery Failed") | `C/PreviousOrders/index.tsx:242-257,360-373,414-429,451-466` | `OButton` h 40, radius 7, bg+border `danger100`, text 12 `danger500`, width 45%; some with `paddingLeft/Right: 10` and centered text | Negative action on a whole group | `button` (danger, soft/tonal, small) |
| PreviousOrders | Positive soft buttons ("Accept all", "Pickup completed by customer", "Pickup complete", "Delivery complete") | `:259-275,375-388,431-444,468-489` | h 40, radius 7, bg+border `success100`, text 12 `success500`, width 45% or 100% when reject is hidden (`reject_orders_enabled`) | Positive action on a whole group | `button` (success, soft/tonal, small) |
| PreviousOrders | Neutral soft buttons ("Ready for pickup", "Arrived to bussiness", "Track real time position") | `:280-293,300-313,342-351` | h 40, radius 7, bg `primaryLight` (#F5F9FF) or `btnBGWhite` (#E9F2FE), text 12 `primary`, 100% | Status step | `button` (soft). Yellow text on light blue today — question |
| PreviousOrders | "Order not ready" | `:320-335` | h 40, radius 7, bg+border `red`, text 12 `white` | Report the order is not ready | `button` (danger, solid, small) |
| PreviousOrders | "Review customer" | `:395-408` | h 40, radius **8**, bg+border `primary`, text `white` (default 16) | Open the review modal for finished groups | `button` (primary, small) |
| PreviousOrders | Disabled look of these buttons | `S/OButton.tsx:28-31,85-95` | `isDisabled` swaps to a non-touchable `View`: bg+border `theme.colors.disabled` (#CBCBCB), text keeps the `textStyle` color (e.g. `danger500` on grey) | In-flight guard (`groupedStatusInFlight`) | `button` disabled state from the theme |
| OrdersList (logistic) | "View order" | `C/PreviousOrders/OrderList.tsx:50-60` | h 40, radius 7, 100%; `bgColor={theme.colors.blueLight}` — **undefined key**, so `OButton` ignores it and paints its default `primary`; text `white` | Open a grouped assign request | `button`; define the color. Question |
| OrdersList (logistic) | "Reject" / "Accept" | `:63-86` | h 40, radius 7, 45% each (Accept 100% when reject hidden); solid `red` (#E63757) / `green` (#00D27A), text `white` 16 | Answer an assign request from the list | `button` (danger solid / success solid) |
| PreviousOrders | Force-status modal | `C/PreviousOrders/index.tsx:514-535` | `OModal entireModal customClose` hosting `AcceptOrRejectOrder` | Reason for a status regression | `modal` |
| PreviousOrders | Review modal, map modal | `:536-570` | `OModal entireModal customClose` hosting `ReviewCustomer` / `GoogleMap` (other areas); the map one is behind the Business-only button | Review customer; track | `modal` |

#### Accept / reject screen (`AcceptOrRejectOrder`)

| Screen / component | Element | file:line | Values today | Function | Proposal |
|---|---|---|---|---|---|
| AcceptOrRejectOrder | Top bar | `C/AcceptOrRejectOrder/index.tsx:674-683`; `S/ONavbar.tsx` | wrapper `paddingHorizontal: 20`, hand-made `paddingTop` (see Platform); `ONavbar`: back arrow 24 absolute `top: -20`, `left: -20`; title 24/700 `textGray`, centered | Back + action title ("Delivery time", "Reject Order", "Pickup Failed", …) | `header` |
| AcceptOrRejectOrder | Body | `:235-245,684-686`; `styles.tsx:3-5` | bg `backgroundPage`; `paddingTop` 0 (reject) / 30 (page) / 40 (modal); `ScrollView` `padding-horizontal: 30` | Scrollable content | Screen surface; gutter space token (30 here vs 20 on the list) |
| AcceptOrRejectOrder | Explanatory texts | `:688-708,761-769` | size 15, `textGray`, margins 10 | Regression explanation; "Call your customer…"; "Mark the order as rejected" | Text preset (body) |
| AcceptOrRejectOrder | Customer phone button | `:710-757` | `OButton` transparent, border 2 `primary`, radius 10, h 50, `marginVertical: 20`; text 20 `primary`; left image `theme.images.general.cellphone` 20×20 absolute `left: 20`; without a number: disabled, text 15 "There's not phonenumber." | Call the customer before rejecting | `button` (primary, outline, large, leading icon) + disabled state |
| AcceptOrRejectOrder | Delivery priority step | `:774-832` | block h 300, `paddingHorizontal: 20`; question 18/600 `textGray` centered; steppers 56×56 radius 28 bg `primary`/`lightGray`, Feather `minus`/`plus` 26 `'#fff'`; value box 90×70, radius 10, border 1 `lightGray`, bg `inputChat`, number 34/700 `primary` (`textGray` for "#"); caption 15/500 `primary` "Delivery #n" | Choose the delivery position before accepting (unless `disable_delivery_priority`) | Number stepper (same as the dialog on the card); text presets |
| AcceptOrRejectOrder | Delivery time dial | `:834-851`; `styles.tsx:13-24` | block h 300; circle 245×245 radius 123, padding 40, bg `secondary`; digits 55/700 `primary`; colon 55/700 with `marginBottom: 10`; "Hours" 14 default color, "Minutes" 14 `primary`, absolute `bottom: 60` | Enter the delivery time (HH:MM) with the numeric keyboard | Time entry display: text preset (display) + brand tint surface. Question: keep the 55 pt display |
| AcceptOrRejectOrder | Hidden time input | `:852-866`; `styles.tsx:26-33` | `TextInput` 0×0, `opacity: 0`, 55/600, `selectionColor: primary` | Captures the digits | Behaviour, not theme |
| AcceptOrRejectOrder | Reject reasons select | `:868-908,202-234`; `styles.tsx:42-46` | react-native-select-dropdown, same styles as the SLA select; `minHeight: 120`, `textTransform: capitalize`; wrapper `margin-top: 15` | Pick a reason (driver app, actions with a reason list) | `select` (sheet with `menu` rows) |
| AcceptOrRejectOrder | Comments | `:910-924`; `styles.tsx:37-40`; `S/OTextarea.tsx` | `OTextarea` radius 10, border 1 `lightGray`, h 100, padding 5/10, placeholder `lightGray`; wrapper `margin-top: 20`, `padding-bottom: 20` | Mandatory comment for negative / forced actions | `input` (multiline) + `field` |
| AcceptOrRejectOrder | Note box | `:926-934` | padding 10, bg `gray100`, radius 10; italic 14 "Note: Your customer will receive a notification…" | Reject hint | `alert`/notice (neutral) |
| AcceptOrRejectOrder | Status photo | `:296-327,936-977` | title 14/600 `textGray` (the `size={16}` is overridden by the style); dashed tile 200×200, radius 10, border 2 dashed `lightGray`, bg `inputChat`, camera 40×40, caption 14 `textGray`; preview 200×200 r10; "Remove image" `OButton` `red` h 40 r 7 text 14 `'#FFF'`; "Image is required" 12 `red` | Photo required by the status | Image upload tile; `button` (danger, small); error text preset |
| SecurityPinFields | Delivery PIN | `C/AcceptOrRejectOrder/SecurityPinFields.tsx:20-31,56-103,106-187` | title 16/600; help 13 `textSecondary`; order label 13/600; prefix boxes border 1 `gray200`, radius 8, bg `gray100`; OTP cells border 1 `gray200`, radius 8, text `textGray`, focus border+text `primary`; cell width 26–38 from the window, height = width × 44/38, font `max(13, width × 0.47)`, gap 8; errors 13 `theme.colors.error` | Customer's delivery code, one row per order | Code/OTP `input` primitive of the app; error text preset |
| AcceptOrRejectOrder | Submit error | `:257-261,990-994` | 13 `theme.colors.error` (#C90800), centered, `marginTop: 12` | API error / wrong code | Error text preset; danger role (two reds today: `error` and `red`) |
| AcceptOrRejectOrder | Bottom action bar | `:246-252,997-1005` | fixed under the scroll, h 45, `paddingHorizontal: 30`, hand-made `marginBottom` | Holds the main button | Bottom action bar with the safe-area inset (lessons 14, 17) |
| AcceptOrRejectOrder | "Continue" | `:1006-1017` | `OButton` h 45, radius 7, 100%, bg `green` or `disabled`, text 18 `'#FFF'` | Go from priority to time | `button` (success, large) |
| AcceptOrRejectOrder | Main action button | `:1019-1065` | h 45, radius 7, 100%, text 18 `'#FFF'`; bg `green` (accept, pickupComplete, deliveryComplete), `primary` (arrivedToBusiness), `red` (all others), `disabled` + `opacity: 0.6` when location requirements fail (still tappable: opens the requirements modal) | Confirm the action | `button`: success / primary / danger by action; disabled and "blocked" states |
| AcceptOrRejectOrder | Requirements modal | `:273-295,1070-1094` | raw `Modal` slide, backdrop `rgba(0, 0, 0, 0.5)`, padding 20; box bg `'#FFF'`, radius 10, padding 20, `maxHeight: 80%`; title 18/600 centered; list (`ValidationIssuesList`, area 4); "Close" `OButton` bg `textGray`, h 45, radius 7, text 16 `'#FFF'` | Location / distance requirements not met | `modal` (dialog) + `button` (neutral) |

#### New order notification, logistic order detail

| Screen / component | Element | file:line | Values today | Function | Proposal |
|---|---|---|---|---|---|
| NewOrderNotification | Backdrop | `C/NewOrderNotification/index.tsx:118-123`; `styles.tsx:4-9` | raw `Modal` slide, transparent; `SafeAreaView` centered, `rgba(0, 0, 0, 0.4)` | Interrupting dialog with sound and vibration | `modal` (dialog) overlay token |
| NewOrderNotification | Box | `:124,248-257` | bg `'#FFF'`, radius 8, padding 65/20/20, `maxWidth: windowWidth - 60` | Dialog surface | `modal` surface, radius, padding |
| NewOrderNotification | Title | `:125-134,263-268` | 22/700 `textGray`, centered, absolute `top: 20`, `marginHorizontal: 40`: "New order!!" / "New messages have been received!" / "New orders have been updated!" | Event title | Text preset (dialog title) |
| NewOrderNotification | Close | `:135-140,258-262` | `TouchableOpacity` absolute `right: 20`, `top: 20`; Feather `x` 30, `theme.colors.textNormal` (undefined) | Dismiss and stop the sound | Icon button (close) |
| NewOrderNotification | Illustration | `:141-145` | `theme.images.general.newOrder` 250×200 contain | Decoration | Theme image key |
| NewOrderNotification | Body | `:146-151` | 14 `primary`, `mBottom 15`: "Order #{id} has been ordered." | Which order | Text preset (body). Yellow body text on white — question |
| OrderDetailsLogistic | Loading | `C/OrderDetailsLogistic/index.tsx:123-139` | 6 × rn-placeholder (`Fade`), lines 100 / 70 / 30 / 20 %, `paddingVertical: 20` | Order loading | `skeleton` (the app's own one) |
| OrderDetailsLogistic | Error | `:141-151` | `NotFoundSource` + "Go to my orders" button | Load error | `empty_state` |
| OrderDetailsLogistic | Header and content | `:155-172` | `OrderHeaderComponent` + `OrderContentComponent` (area 4) inside `styled.ScrollView`; spacer `100 + inset` / 50 / 35 | Order detail of an assign request | Owned by area 4 |
| OrderDetailsLogistic | Reject / Accept | `:174-188`; `C/FloatingButton` | `FloatingButton` absolute bottom, bg `#fff`, `paddingHorizontal: 20`; two full-width buttons stacked (column-reverse), h 50, radius 10, `red` / `green`, text 18 `white`; shown for status 0, 4, 7, 14 | Answer the assign request | Bottom action bar + `button` (danger / success, large) |
| OrderDetailsLogistic | "Removed from the order" alert | `:193-201`; `S/OAlertOriginal.tsx:39-42` | `Alert.alert` (system) | Warning | System alert (not themable) |

#### Not rendered by anything (kept for the decision)

| Screen / component | Element | file:line | Values today | Function | Proposal |
|---|---|---|---|---|---|
| OrdersListManager | Whole screen | `C/OrdersListManager/index.tsx:299-737`; `styles.tsx` | split 30% list / 70% detail (`Sides`, `LeftSide`, `RightSide` border 2 `gray100`); title 26/600 `fontFamily: 'Poppins'`; underline tabs (bottom border 1 `tabBar`, selected 16/600 with `theme.colors.textGra` — undefined); icons `backgroundDark`; SLA row; `Tag` radius 50; modal padding 30; `paddingBottom: 220` / `110` | A manager / tablet variant of the orders screen | Delete or keep — question. Not a design variant switched at run time: nothing mounts it |
| OrdersOptionBusiness / Delivery / Driver / Paymethod / Status | Dropdown wrappers | `C/OrdersOption*/index.tsx`, `styles.tsx` | `ODropDown` bg `inputDisabled`, text `unselectText`, max-height 200 (Driver 165); wrapper `margin-bottom: 24`, iOS z-index 14–19 | Business-app filters | Delete with `OrdersListManager`, or one `select` |

### Duplicates (same function, different implementation)

| Function | Implementations (file:line) | Visible differences |
|---|---|---|
| Orders list screen | `C/OrdersOption/index.tsx:55-1032` (live) · `C/OrdersListManager/index.tsx:51-738` (dead) | Title weight 700 vs 600 + `Poppins`; segmented tabs vs underline tabs; icon color `gray200` vs `backgroundDark`; filter icon (AntDesign) vs search icon (Fontisto); modal header from `OModal` (24/700) vs own back button + `ModalTitle` (20 bold); modal padding 20 vs 30; tag radius 10 vs 50; no offline handling in the dead one |
| Styled files of that screen | `C/OrdersOption/styles.tsx` · `C/OrdersListManager/styles.tsx` | 13 styled components with the same names, values drifting (`Tag`, `TabsContainer`, `TabPressable`, `ModalContainer`, `ModalTitle`) |
| SLA status block and timer | `C/OrdersOption/index.tsx:1034-1097` · `C/OrdersListManager/utils.tsx:108-215` | Same look; the second declares its styled components inside the render function |
| Filter constants and date math | `C/OrdersOption/index.tsx:158-204,402-430` · `C/OrdersListManager/utils.tsx:13-95` | Copy-paste |
| Order status labels | `C/OrdersOption/index.tsx:1142-1233` · `C/OrdersListManager/index.tsx:750-841` · `src/ui/src/utils/index.tsx:667` (`getOrderStatus`, used by `OrderDetailsLogistic:157`) | Status 4 reads "Ready for pickup" in the lists and "Preparation Completed" in the detail |
| Time-status color (in time / at risk / delayed) | card timer `C/PreviousOrders/OrderItem.tsx:343-349` · card bar `C/PreviousOrders/styles.tsx:47-55` · select bar `C/OrdersOption/styles.tsx:69-79` (+ `OrdersListManager/styles.tsx:73-83`) · timeline `C/OrdersOption/index.tsx:164-178` (+ `utils.tsx:63-77`) · card tint `OrderItem.tsx:117-123` | `#00D27A` / `#FFC700` / `#E63757` literal four times; only the card tint reads the theme (`danger100`, `warning100`); bars are 4×80 r20, 3×90% r6 and 4×22 r4 |
| Select / dropdown | react-native-select-dropdown: `C/OrdersOption/index.tsx:871`, `C/AcceptOrRejectOrder/index.tsx:870`, `C/OrdersListManager/index.tsx:346` (style object copied three times: `OrdersOption:271-315`, `AcceptOrRejectOrder:202-234`, `OrdersListManager:166-197`) · `S/ODropDown` (City, and the 5 dead wrappers) · `S/ODropDownCalendar` (Date) | Closed control: bg `inputChat` r 7.6 min-height 40 text `#748194` vs bg `inputDisabled` r 10 padding 15 text `unselectText`; list: flat rows h 36 vs radio rows padding 15 with dividers; chevron 18 `#444` vs 24; list `minHeight` 155 vs 120 |
| Filter dropdown wrappers | `C/OrdersOption{Business,City,Delivery,Driver,Paymethod,Status}/index.tsx` + 7 identical `styles.tsx` | Only the placeholder, the options and the iOS z-index (14–20) change |
| Number stepper (delivery position) | `C/PreviousOrders/OrderItem.tsx:417-474` · `C/AcceptOrRejectOrder/index.tsx:779-825` | Circles 52 vs 56; icons MaterialCommunityIcons vs Feather; editable `TextInput` 80×60 font 28 vs read-only box 90×70 font 34; margin 18 vs 20 |
| Reject / accept pair | soft: `C/PreviousOrders/index.tsx:242-275` · solid small: `C/PreviousOrders/OrderList.tsx:63-86` · floating: `C/OrderDetailsLogistic/index.tsx:175-187` · screen submit: `C/AcceptOrRejectOrder/index.tsx:1019-1065` | `danger100`/`danger500` tonal 12 pt h 40 r 7 · solid `red`/`green` 16 pt h 40 r 7 · solid h 50 r 10 18 pt stacked · solid h 45 r 7 18 pt |
| "Load more orders" | `C/OrdersOption/index.tsx:814-823` (`OButton`) · `C/OrdersOption/OrderSummaryTable.tsx:188-199` (`TouchableOpacity`) | h 44 text 18 normal, no loading state · h 32 text 12/600 with spinner |
| Dialog with dim backdrop | `C/NewOrderNotification/index.tsx:118-154` (raw `Modal`) · `C/AcceptOrRejectOrder/index.tsx:1070-1094` (raw `Modal`) · `C/PreviousOrders/OrderItem.tsx:396-499` (`OModal isTransparent`) · unused styles `P/MyOrders.tsx:79-97` | Backdrop 0.4 / 0.5 / 0.4; box radius 8 / 10 / 12; padding 65-20-20 / 20 / 24-20; close by X / button / Cancel button |
| Loading placeholder | `S/OrderListSkeleton` (`C/OrdersOption/index.tsx:808`) · rn-placeholder (`C/OrderDetailsLogistic/index.tsx:126-137`) · `ActivityIndicator` (`OrderSummaryTable.tsx:195`) | Own animated bones vs library lines vs spinner |
| Logo frame | `C/PreviousOrders/OrderItem.tsx:125-138` (68 frame, 65 image) · `C/PreviousOrders/OrdersGroupedItem.tsx:27-42` (65 frame, 60 image) · skeleton avatar 75×75 r10 (`S/OrderListItemSkeleton.tsx:60-66`) | Three sizes for the same slot; the skeleton does not match the card (75 vs 68; row 97 vs 105) |
| Card title | `OrderItem.tsx:139-144` (16/700, family set) · `OrdersGroupedItem.tsx:43-48` (16/600, no family) | Weight |
| Screen / modal title | `C/OrdersOption/index.tsx:213-217` (26/700) · `S/ONavbar.tsx:29-34` (24/700) · `S/OModal.tsx:217-222` (24/700) · `ModalTitle` `C/OrdersOption/styles.tsx:39-45` (20 bold) · dialog titles 22/700, 18/700, 18/600 | Five title sizes in one area |
| Notice box | `FilterAlert` `C/OrdersOption/styles.tsx:154-166` · offline banner `C/OrdersOption/index.tsx:717-738` · reject note `C/AcceptOrRejectOrder/index.tsx:927-933` | `#FFF9E2` r10 text 10 · `danger500` r8 text 14 white · `gray100` r10 italic 14 |
| Close glyph | AntDesign `close` 20 (`C/OrdersOption/index.tsx:912,927`) · Feather `x` 30 (`NewOrderNotification:139`) | Set and size |
| Chevron | Feather 18 `#444` (selects) · MaterialCommunityIcons 18 (`OrdersGroupedItem:97`) · AntDesign `up/down` 16 (`OrderSummaryTable:143`) · Feather 24 (`S/ODropDown:145`) | Set, size, color |
| Error red | `theme.colors.error` #C90800 (`AcceptOrRejectOrder:991`, `SecurityPinFields:168-183`) · `theme.colors.red` #E63757 (`AcceptOrRejectOrder:324`) | Two reds for error text on the same screen |

### Blocks and pieces

| Page | Block or piece | Hideable? Movable? | Why |
|---|---|---|---|
| Orders tab | "Filters applied" notice | Hideable; not movable (absolute overlay) | State-driven; hiding it removes the only "Clear filters" shortcut outside the modal |
| Orders tab | Screen title | Hideable | Decoration; the header row keeps the actions |
| Orders tab | Connection status pill | Hideable | Informative; opens its own modal |
| Orders tab | Refresh icon | Hideable | Pull to refresh does the same; already hidden offline |
| Orders tab | Filter icon | Hideable (removes search) | The only entry to the search modal |
| Orders tab | Tabs | Not hideable; order of tabs fixed by the controller | Without them only the first group is reachable; today `combine_pending_and_progress_orders` (server config) switches 4 tabs ↔ 3 |
| Orders tab | Logistic tab | Server config `logistic_module`; also hidden when tabs are combined | Behaviour |
| Orders tab | Offline banner | Not hideable | Tells the driver the data is stale and how many changes wait |
| Orders tab | Order summary table | Hideable. Today gated by two project names in code | Candidate for a visibility key instead of `SUMMARY_ENABLED_PROJECTS` — question |
| Orders tab | "Load more" button | Not hideable | Only pagination |
| Orders tab | Empty state image / text / button | Image hideable; text not | Text carries the error |
| Order card | Business logo | Hideable | Name remains |
| Order card | Business name | Not hideable | Card title |
| Order card | Order number · date | Hideable per piece (id is already masked by `useSecureOrderId`; `change_order_id` swaps to external id) | Metadata |
| Order card | Order type chip, status chip | Hideable each | Informative; status is also implied by the tab |
| Order card | SLA bar, timer, card tint | Server config `plan_enterprise` | Behaviour today; could also be visibility |
| Order card | Delivery position badge | Server config `disable_delivery_priority` | Behaviour |
| Order card | Unsynced icon, new-activity dot | Not hideable | State |
| Group | Group header image | Hideable | Decoration |
| Group / logistic rows | Reject buttons | Server config `reject_orders_enabled`; also `order_not_ready_enabled`, `failed_pickup_by_driver_enabled` | Behaviour |
| Search modal | SLA select | Server config `plan_enterprise` | Behaviour |
| Search modal | Order number, External id, Date, City | Hideable each; reorderable (plain vertical stack; the iOS z-index ladder 18/20 must follow the order) | Independent filters |
| Search modal | Search / Clear search | Not hideable | Actions |
| Accept / reject | Priority step | Server config `disable_delivery_priority` | Behaviour |
| Accept / reject | Time dial | Not hideable in this component (`hidden_driver_eta_time` is checked by callers: `Delivery.tsx:78`, `useLogisticDeliveryTime.tsx:29`) | Behaviour |
| Accept / reject | Customer phone button + call text | Hideable (prop `notShowCustomerPhone` exists) | Convenience |
| Accept / reject | Reject note box | Hideable | Hint |
| Accept / reject | Reasons select, comments | Not hideable | Required by the API for those actions |
| Accept / reject | Photo tile, PIN fields | Not hideable | Required by server settings |
| New order modal | Illustration | Hideable | Decoration |
| New order modal | Title, body, close | Not hideable | Content and the only way out |
| Logistic detail | Reject button | Server config `reject_orders_enabled` | Behaviour |

### Images

| Key or source | file:line | Painted box | Fit | Fallback | alt |
|---|---|---|---|---|---|
| `theme.images.general.notFound` (`not-found.png`, 279×279, 28 KB) | `C/OrdersOption/index.tsx:845` (also `OrdersListManager:589`; default inside `NotFoundSource` for `OrderDetailsLogistic:142`) | 260×220 | contain | The component falls back to the same key | none |
| `theme.images.general.newOrder` (`new-order.png`, 264×264, 21.5 KB) | `C/NewOrderNotification/index.tsx:141-145` | 250×200 | contain | none | none |
| `theme.images.general.ordersGroup` (`orders_group.png`, 213×213, 13.4 KB) | `C/PreviousOrders/OrdersGroupedItem.tsx:64-68` | 60×60, radius 7.6, in a 65×65 frame | cover | none | none |
| `theme.images.dummies.businessLogo` (`dummies/store.png`, 512×512, 11.5 KB) | `C/PreviousOrders/OrderItem.tsx:274` | 65×65, radius 7.6, in a 68×68 frame | cover | It is the fallback of the business logo | none |
| API: `order.business.logo` | `C/PreviousOrders/OrderItem.tsx:268-276` | 65×65 | cover | Used as `uri` only if it contains `https`; otherwise the raw string is passed as `source` (not a valid source), and only `null`/`undefined` reaches the dummy | none |
| `theme.images.general.chronometer` (42×48, 1 KB) | `C/OrdersOption/index.tsx:603-614` (also `OrdersListManager:394`) | 24×24, 26×26 when selected; tinted | contain | none | none |
| `theme.images.general.clock1`, `clockRisk`, `clockDelayed` (48×48) | `C/OrdersOption/index.tsx:163,170,177` → `:1049-1054` (also `utils.tsx:62-76`) | 16×16 tinted | contain | none | none — only painted by the unreachable SLA settings content |
| `theme.images.general.cellphone` (64×64) | `C/AcceptOrRejectOrder/index.tsx:727,751` | 20×20 inside `OButton`, absolute `left: 20` | contain | none | none |
| `theme.images.general.camera` (64×64) | `C/AcceptOrRejectOrder/index.tsx:960` | 40×40 | default (stretch) | none | none |
| `theme.images.general.arrow_left` (24×24) | through `S/ONavbar`, `S/OModal` (shared); direct read only in dead `OrdersListManager/index.tsx:611` (20×13, tint `backArrow`) | 24×24 | — | none | none |
| Device photo (`statusImage.uri`) | `C/AcceptOrRejectOrder/index.tsx:943-947` | 200×200, radius 10 | cover | none | none |
| Fixed external URLs (cloudinary demo avatars / store) | `C/PreviousOrders/index.tsx:147,161,175` | map marker icons | — | They are the fallbacks | — only in the Business-only map branch (off in this app) |
| Fixed external sound | `C/NewOrderNotification/index.tsx:45` (`https://d33aymufw4jvwf.cloudfront.net/notification.mp3`) | — | — | — | Not an image: the bundled `theme.sounds.notification` (`src/DeliveryApp.tsx:106`) is read by no file of `src` outside the submodule (`grep sounds`) |

No image of the area has an `accessibilityLabel`. Icon-only touchables have none either.

### Off the scale or without a token

| Value | Where | Why it does not fit |
|---|---|---|
| `#fff` / `#FFF` / `'white'` (28 literals) | e.g. `C/OrdersOption/styles.tsx:32,143`, `C/PreviousOrders/OrderItem.tsx:122-123,240,403,430,472,493`, `C/AcceptOrRejectOrder/index.tsx:223,281,792,823,954,1014,1046,1089`, `C/NewOrderNotification/index.tsx:250`, `C/OrdersOption/index.tsx:291,727,733,963` | Literal while `theme.colors.white` / `backgroundPage` exist; surface and on-color text are two roles |
| `#00D27A` ×6, `#E63757` ×6 | time-status rows above | Equal to `theme.colors.green`/`success500` and `red`/`danger500`/`statusOrderRed` but typed by hand |
| `#FFC700` ×7 | `C/OrdersOption/index.tsx:171,541`, `styles.tsx:74`, `C/PreviousOrders/OrderItem.tsx:346`, `styles.tsx:51` (+ dead copies) | No key; 16 steps from `primary`/`yellow` `#FFB700` — near color to collapse into a warning role |
| `#748194` ×6 | select text `C/OrdersOption/index.tsx:285,897`, `C/AcceptOrRejectOrder/index.tsx:216,897` (+ dead) | Equal to `theme.colors.backArrow`, typed by hand |
| `#444` ×4 | `C/OrdersOption/index.tsx:888`, `C/AcceptOrRejectOrder/index.tsx:881`, `C/PreviousOrders/OrderItem.tsx:296` (+ dead) | No key; near `backgroundDark` `#484848` |
| `#DEE2E6` ×2, `#E9ECEF` ×2, `#FFF9E2`, `rgb(44, 123, 229)`, `'#ccc'` | `C/OrdersOption/index.tsx:263`, `styles.tsx:100,159`, `index.tsx:549`, `C/PreviousOrders/OrderList.tsx:35` | Equal to `inputSignup`, `tabBar`, `warning100`, `primaryOG`, `backgroundGray`: typed by hand |
| `rgba(0, 0, 0, 0.4)` ×2 (+1 unused), `rgba(0, 0, 0, 0.5)` | `C/NewOrderNotification/styles.tsx:8`, `S/OModal.tsx:69`, `C/AcceptOrRejectOrder/index.tsx:275`, `P/MyOrders.tsx:96` | Two overlay opacities, no token |
| `"#0000006e"` shadow | `C/PreviousOrders/OrderItem.tsx:132-134`, `OrdersGroupedItem.tsx:34-36` | `shadowColor` + `shadowRadius: 10` + `elevation: 15` with no opacity, offset or background: iOS paints nothing, Android elevation on a transparent view (lessons 11, 15) |
| `theme.colors.blueLight`, `textNormal`, `textGra` | `C/PreviousOrders/OrderList.tsx:54-55`; `OrdersGroupedItem.tsx:97`, `C/NewOrderNotification/index.tsx:139`; `C/OrdersListManager/index.tsx:422` | Read but not defined in `theme.json`: the button falls to `primary`, the icons to the icon library's default color |
| `OText` default color `#344050` | every `OText` without `color` (e.g. `C/OrdersOption/index.tsx:545`, `C/PreviousOrders/OrderItem.tsx:280`, `C/AcceptOrRejectOrder/index.tsx:844,928`) | Hard-coded in the primitive (`S/OText.tsx:6`); equals `textGray` |
| Radius 7 (21) · 7.6 (20) · 8 (10) | buttons `C/PreviousOrders/index.tsx:247…`, `C/AcceptOrRejectOrder/index.tsx:1012,1041`; inputs/selects `C/OrdersOption/index.tsx:248,264,278`; boxes `C/OrdersOption/index.tsx:289,719`, `SecurityPinFields.tsx:85,155` | Three values for one "small" radius |
| Radius 10 (15), 12 (3), 5 (1), 6 / 4 / 20 (bars) | cards and tiles; dialog and badge (`OrderItem.tsx:234,253,404`); chip (`OrderItem.tsx:158`) | 10 vs 12 for boxes; chip radius 5 used once |
| Radius 26, 28, 123, 50 | `OrderItem.tsx:424,466`; `AcceptOrRejectOrder/index.tsx:786,817`; `AcceptOrRejectOrder/styles.tsx:22`; `OrdersListManager/styles.tsx:27` | Half of the size: circles and pills → `full`, not a level |
| Space 3, 5, 15, 18, 20, 24, 28, 30, 45, 60, 65 | `OrderItem.tsx:113,137` (3); `OrdersOption/index.tsx:211,244-245,252` (15, 5); `OrderItem.tsx:449,475` (18, 28); gutters 20 (`OrdersOption/styles.tsx:36`) vs 30 (`AcceptOrRejectOrder/styles.tsx:4,8`, `index.tsx:248`); 24 (`OrdersOption/index.tsx:265`, 7 `Container`s); 45 (`P/MyOrders.tsx:85`, unused); 60 (`OrdersOption/index.tsx:955`); 65 (`NewOrderNotification/index.tsx:254`) | Outside the catalog steps (see `.theme-audit/scales.md`); the 5/10/15/20/30 ladder is the app's real scale |
| Space 220, 110, 70; magic `HEIGHT_SCREEN - 450` | `C/OrdersListManager/index.tsx:503,597,674`; `C/OrdersOption/index.tsx:648` | Layout compensation, not spacing |
| Font size 10 (×3), 11 (×2), 13 (×9), 15 (×7), 22, 26, 28, 34, 55 (×4) | `OrdersOption/index.tsx:545,549`, `OrderItem.tsx:383`; `OrderItem.tsx:240`, `OrderSummaryTable.tsx:125`; `SecurityPinFields.tsx:110-183`, `OrderItem.tsx:414`, `OrderSummaryTable.tsx:87,114`; `AcceptOrRejectOrder/index.tsx:690-762,827`, `OrderItem.tsx:483,493`; `NewOrderNotification/index.tsx:127`; `OrdersOption/index.tsx:215`; `OrderItem.tsx:454`; `AcceptOrRejectOrder/index.tsx:807`; `:837-841` | Between or beyond levels; 10 pt is below a readable caption; 55 has no level |
| Computed font size `max(13, width × 0.47)` | `C/AcceptOrRejectOrder/SecurityPinFields.tsx:123` | Derived from the window |
| Font weights `'500'` ×1, `'bold'`, `'normal'`, numeric `700` | `C/AcceptOrRejectOrder/index.tsx:827`; `C/OrdersOption/styles.tsx:41`, `index.tsx:239,257`; `C/NewOrderNotification/index.tsx:129` | Mixed notations; one 500 |
| `fontFamily: 'Poppins'` ×5 | `C/OrdersListManager/index.tsx:104,114,133,150`, `styles.tsx:42` | Dead file; no such family name on Android (files are `Poppins-Regular`…, lesson 9) |
| `fontFamily: theme.fonts.primary.name` + `fontWeight` | `C/PreviousOrders/OrderItem.tsx:142-143`, `C/OrdersOption/OrderSummaryTable.tsx:79-80` (and every `OText`/`OButton`) | One family plus weight: faux bold on Android (lesson 9); `OButton` text is `Inter_18pt-Black` + weight 700 |
| `lineHeight: 24` | `C/OrdersOption/index.tsx:284`, `C/AcceptOrRejectOrder/index.tsx:215` | Absolute (lesson 10) |
| Control heights 25, 32, 36, 40 (most used), 42, 44, 45, 50, 52, 56, 60, 70 | chip `OrderItem.tsx:156`; `OrderSummaryTable.tsx:131`; select rows `OrdersOption/index.tsx:312`; group buttons `PreviousOrders/index.tsx:247…`; `OrderItem.tsx:481,491`; `OrdersOption/index.tsx:249`; `AcceptOrRejectOrder/index.tsx:251,294,1012,1042`; `OButton` default; steppers | Seven button heights for three intents (small / medium / large) |
| Icon sizes 12, 14, 18, 26, 30, 32 | `OrdersOption/index.tsx:542`; `OrderItem.tsx:259`; chevrons / `cloud-sync`; steppers; `NewOrderNotification:139`; `OrderItem.tsx:305` | Outside 16 / 20 / 24 |
| z-index 2, 10, 12, 14–20, 100, 1000, 1001 | `OrderItem.tsx:232,251`; `OrdersOption/index.tsx:222,231,579,956,970`; `OrdersOption*/styles.tsx:6`; `OrdersOption/styles.tsx:156`; `AcceptOrRejectOrder/index.tsx:241` | Hand-made stacking, an iOS ladder for the in-place dropdowns |
| Opacity 0.6 (×3), 0.7 (×2) | `OrderItem.tsx:237,256`, `AcceptOrRejectOrder/index.tsx:1043`; `OrderSummaryTable.tsx:141,190` | Disabled and pressed opacity typed per call |
| Fixed sizes of the card | `C/PreviousOrders/OrderItem.tsx:110` (`height: 105`), `styles.tsx:20` (`max-height: 60px`), `:44` (80) | A fixed card height with up to five text rows inside |
| Project names in code | `C/OrdersOption/orderSummaryUtils.tsx:1` | Feature switch by project slug |
| Script false positive | `.theme-audit/scales.md` lists font size 30 at `C/PreviousOrders/OrderItem.tsx:383` | It is the comparison `length > 30`; the sizes on that line are 10 and 12 |

### Screens

| Screen | Root container | Sticky / fixed children | Blocks in render order |
|---|---|---|---|
| Orders tab — `Orders` in the bottom tabs (`BottomNavigator.tsx:139-152`) → `P/MyOrders.tsx` → `OrdersOption` → controller `OrderListGroups` → `OrdersOptionUI` | `SafeAreaContainerLayout` (`View`, insets top/left/right, `paddingHorizontal: 20`) → fragment. No scroll root: the list is a `ScrollView` (`C/OrdersOption/index.tsx:753`, `nestedScrollEnabled`) that maps every order (no `FlatList`, no virtualization) | Header and tabs sit outside the scroll (fixed); filter notice is an absolute overlay; no `stickyHeaderIndices` | 1 filter notice (`:538`) · 2 header: title, status pill, refresh, filter (`:553`) · 3 tabs (`:596`) · 4 body (`:648`): [status tags — off] · offline banner (`:716`) · summary table (`:740`) · scroll: orders (`:770`) or assign requests (`:793`), skeleton (`:808`), load more (`:814`), empty/error (`:834`) · 5 new-order modal (`:854`) · 6 search modal (`:857`) · 7 `NotificationSetting` (`:1284`, other area) |
| Search orders modal | `OModal` (RN `Modal` slide, own `SafeAreaProvider`) → title section → `ModalContainer` `styled.ScrollView` (`C/OrdersOption/styles.tsx:35`) | Title section fixed above the scroll | SLA select [enterprise] · order number · external id · date · city · Search · Clear search. Dropdown panels open in place, absolutely positioned inside the scroll (`top: 65`, z 9999) |
| Order row | `View` (`OrderList.tsx:33`) → `Pressable` card → row: SLA bar · logo · info column; then the logistic buttons row | — | info column: group no. · name + unsynced icon · dot · number/date · timer · type chip + status chip; position badge absolute top-right |
| Order group | `AccordionSection` → header `TouchableOpacity` → hidden/shown body | — | group image · title · count · date · chevron → order rows (without buttons) → one action row by the status of the first order |
| Accept / reject — stack `AcceptOrRejectOrder` (`HomeNavigator.tsx:62-66`) → `P/AcceptOrRejectOrder.tsx` (`SafeAreaContainer`, all four insets) → component; also inside `OModal` | `KeyboardAvoidingView` (`flex: 1`) → top bar `View` → `parent` `View` → `upper` `View` → `Content` `styled.ScrollView` | Top bar above and main button bar below the scroll, both fixed | top bar · [regression text] · [call text, phone button, "mark as rejected"] · [priority step] · [time dial] · hidden input · [reasons select] · [comments] · [note] · [photo] · [PIN] · [error] · bottom button · requirements `Modal` |
| Logistic order detail — stack `OrderDetailsLogistic` (`HomeNavigator.tsx:57-61`) → `P/OrderDetailsLogistic.tsx` (`SafeAreaContainerLayout`) → controller `OrderDetails` | `View flex 1` → `OrderHeaderComponent` → `OrderDetailsContainer` `styled.ScrollView` (`styles.tsx:3`) | Header fixed above; `FloatingButton` absolute at the bottom (the scroll ends with a spacer of `100 + inset`) | loading placeholders or error · header · one `OrderContentComponent` per order (group) · floating Reject / Accept · system alert |
| New order dialog | RN `Modal` (slide, transparent) → `SafeAreaView` backdrop → box | — | title · close · illustration · body |
| Delivery position dialog | `OModal isTransparent` (not `entireModal`): backdrop `View` → empty title section → box | — | title · order number · stepper · Cancel / Save |
| (dead) `OrdersListManager` | fragment → header · SLA row · `Sides` row: `LeftSide` 30% (tabs in a horizontal `ScrollView`, tags, list `ScrollView`) + `RightSide` 70% (`OrderDetailsDelivery`) | — | Not mounted |

### Text roles

| Look (size / weight / color / family) | Where | Role |
|---|---|---|
| 26 / 700 / `textGray` / primary family | `C/OrdersOption/index.tsx:213-217,554` | Screen title |
| 24 / 700 / `textGray` / `${fonts.special.name}_18pt-Black` (resolves to `Inter_18pt-Black_18pt-Black`, not a bundled name) | `S/ONavbar.tsx:29-34` used at `C/AcceptOrRejectOrder/index.tsx:682` | Screen title with back |
| 24 / 700 / default `#344050` | `S/OModal.tsx:217-222` used at `C/OrdersOption/index.tsx:857-863` | Modal title |
| 22 / 700 / `textGray`, centered | `C/NewOrderNotification/index.tsx:126-133` | Dialog title |
| 20 / bold / `textGray` | `C/OrdersOption/styles.tsx:39-45` | Modal section title (unreachable content) |
| 18 / 700 / `textGray` | `C/PreviousOrders/OrderItem.tsx:411` | Dialog title |
| 18 / 600 / `textGray` or default | `C/AcceptOrRejectOrder/index.tsx:776,1078` | Step question; dialog title |
| 16 / 700 / `textGray` / primary family | `C/PreviousOrders/OrderItem.tsx:139-144` | Card title |
| 16 / 600 / `textGray` | `C/PreviousOrders/OrdersGroupedItem.tsx:43-48`; `SecurityPinFields.tsx:107` | Group title; section title |
| 14 / 600 / `textGray` | `C/OrdersOption/OrderSummaryTable.tsx:78-83`; `C/AcceptOrRejectOrder/index.tsx:317-322,938` | Card header; section title |
| 15 / 400 / `textGray` | `C/AcceptOrRejectOrder/index.tsx:689-694,700-708,761-769` | Body (explanations) |
| 14 / 400 / default `#344050` | `C/AcceptOrRejectOrder/index.tsx:844`; `C/OrdersOption/index.tsx:1057,1061` | Body default |
| 14 / 400 italic | `C/AcceptOrRejectOrder/index.tsx:928` | Note |
| 14 / 400 / `primary` | `C/NewOrderNotification/index.tsx:146-151`; `C/AcceptOrRejectOrder/index.tsx:845-848` | Dialog body; dial unit |
| 14 / 400 / `'white'` centered | `C/OrdersOption/index.tsx:726-736` | Banner text |
| 14 / 400 / `textGray` | `C/AcceptOrRejectOrder/index.tsx:966` | Helper text |
| 13 / 400 / `textGray` | `C/OrdersOption/OrderSummaryTable.tsx:87,114`; `C/PreviousOrders/OrderItem.tsx:414` | Table cell; dialog subtitle |
| 13 / 400 / `textSecondary` | `SecurityPinFields.tsx:110` | Help text |
| 13 / 600 | `SecurityPinFields.tsx:128` | Field label |
| 13 / 400 / `error` | `SecurityPinFields.tsx:168,177,183`; `C/AcceptOrRejectOrder/index.tsx:991` | Error |
| 12 / 400 / `red` | `C/AcceptOrRejectOrder/index.tsx:323-327,972` | Required-field error |
| 12 / 400 / `unselectText` | `C/PreviousOrders/OrderItem.tsx:145-148,312-337`; `OrdersGroupedItem.tsx:49-52` | Metadata |
| 12 / 400 / default | `C/PreviousOrders/OrderItem.tsx:280` | Metadata (group number) |
| 12 / 400 / state color | `C/PreviousOrders/OrderItem.tsx:340-352` | Timer |
| 12 (or 10) / 400 / `primary` on `secondary` | `C/PreviousOrders/OrderItem.tsx:149-160,358-389` | Chip text |
| 12 / 700 or 400 / `primary` or `unselectText`, capitalize | `C/OrdersOption/index.tsx:629-642` | Tab label |
| 12 / 600 / `textGray`; 12 / 400 / `textGray` | `C/OrdersOption/OrderSummaryTable.tsx:92-98` | Label / value |
| 12 / 600 / `white` | `C/OrdersOption/OrderSummaryTable.tsx:113,136` | Table header; small button text |
| 11 / 400 / `backArrow` | `C/OrdersOption/OrderSummaryTable.tsx:125` | Footnote |
| 11 / 600 / `'#fff'` | `C/PreviousOrders/OrderItem.tsx:240` | Badge text |
| 10 / 400 / default; 10 underline `rgb(44, 123, 229)` | `C/OrdersOption/index.tsx:545,549` | Notice text; link |
| 55 / 700 / `primary` | `C/AcceptOrRejectOrder/index.tsx:837-843` | Display (time) |
| 34 / 700 / `primary` or `textGray`; 28 / 700 / `primary` | `C/AcceptOrRejectOrder/index.tsx:807`; `C/PreviousOrders/OrderItem.tsx:454-456` | Stepper value |
| 15 / 500 / `primary` | `C/AcceptOrRejectOrder/index.tsx:827` | Caption under the stepper |
| 16 / 24 / `#748194`; rows 14 / `#748194` (capitalize on the reasons select) | `C/OrdersOption/index.tsx:280-286,897`; `C/AcceptOrRejectOrder/index.tsx:211-218,895-901` | Select value; select option |
| 16 / `unselectText`, no family | `S/ODropDown.tsx:41-44` via `OrdersOptionCity`, `OrdersOptionDate` | Select value (second implementation) |
| Button text — `OButton` default 16 / 700 / `white` / `fonts.special.name`; overrides: 12 (group actions), 14, 15, 18, 20; 18 with `fontWeight: 'normal'` (load more) | `S/OButton.tsx:33-41`; `C/PreviousOrders/index.tsx:249…475`; `C/AcceptOrRejectOrder/index.tsx:716,739,954,1014,1046,1089`; `C/PreviousOrders/OrderItem.tsx:483,493`; `C/OrdersOption/index.tsx:254-259` | Button text in five sizes |
| 18 / 400 / `textSecondary`, centered | `C/NotFoundSource/index.tsx:29-35` (used by this area) | Empty-state text |

### Buttons and touchables

| Element | file:line | Primitive | Look and size | `activeOpacity` / pressed | Disabled look | Touch target |
|---|---|---|---|---|---|---|
| Filter-notice icon | `C/OrdersOption/index.tsx:539-544` | vector icon `onPress` | 12 pt glyph | none | — | 12×12 — under 44 |
| "Clear filters" link | `:548-550` | `Pressable` | text 10 underline | none | — | ~12 high — under 44 |
| Refresh | `:560-568` | vector icon `onPress` | 24 | none | hidden offline | 24×24 — under 44 |
| Filter + badge | `:573-591` | vector icon `onPress` | 24 (badge 16) | none | — | 24×24 — under 44 |
| Logistic tab | `:600-615` | `Pressable` | icon 24/26 + padding 10 | none | — | ~35 — under 44 |
| Order tabs | `:618-643` | styled `Pressable` (`TabPressable`) | `flex: 1`, strip height 30–35 | none | — | 30–35 high — under 44 |
| Status tags (off) | `:660,687` | styled `Pressable` (`Tag`) | min-height 34 | none | ignores press while loading | 34 — under 44 |
| Load more | `:814-823` | `OButton` | h 44, r 7.6, primary | `OButton.defaultProps.activeOpacity = 0.5` is not applied on React 19 → RN default 0.2 | grey `View` | 44 |
| Select button (SLA, reasons) | `:871-901`; `C/AcceptOrRejectOrder/index.tsx:870-906` | react-native-select-dropdown | min-height 40 (library default height applies) | library | — | ≥ 40 |
| Select rows | `:309-315`; `AcceptOrRejectOrder:228-234` | library row | h 36 | library | — | 36 — under 44 |
| Input clear icons | `C/OrdersOption/index.tsx:912-917,927-932` | vector icon `onPress` | 20 | none | — | 20×20 — under 44 |
| Date / City control | `S/ODropDownCalendar.tsx:37-47`, `S/ODropDown.tsx:30-40` | styled `TouchableOpacity` | padding 15, radius 10 | 0.2 default | — | ~50 |
| Dropdown option rows | `S/ODropDown.tsx:195-220` | `TouchableOpacity` | padding 15, radio 24 | 0.2 | — | ~54 |
| Search / Clear search | `C/OrdersOption/index.tsx:948-973` | `OButton` | h 50, r 7.6; primary solid / outline | 0.2 | — | 50 |
| Summary header | `C/OrdersOption/OrderSummaryTable.tsx:141` | `TouchableOpacity` | full width, padding 10 | 0.7 | — | ~37 high — under 44 |
| Summary "Load more" | `:188-199` | `TouchableOpacity` | h 32, min-width 110, r 7.6, primary | 0.7 | `disabled` while loading, spinner, no color change | 32 — under 44 |
| Order card | `C/PreviousOrders/OrderItem.tsx:214-222` | `Pressable` | h 105 | none (no pressed style, no ripple) | not pressable when locked; grey row behind | 105 |
| Position badge / set-position badge | `:225-261` | `TouchableOpacity` | padding 4/10 or 4/8, r 12 | 0.2 | `opacity: 0.6` | ~22 high — under 44 |
| Stepper − / + (dialog) | `:418-431,460-473` | `TouchableOpacity` | 52×52 circle | 0.2 | bg `lightGray` | 52 |
| Position input | `:432-459` | raw `TextInput` | 80×60 | — | — | 60 |
| Dialog Cancel / Save | `:476-496` | `OButton` | h 42, r 7 | 0.2 | bg `disabled`, text `'#fff'` | 42 — under 44 |
| Group header | `C/PreviousOrders/OrdersGroupedItem.tsx:57-60` | styled `TouchableOpacity` (`Accordion`) | row 65 high | `activeOpacity={1}` (no feedback) | — | 65 |
| Group action buttons (13) | `C/PreviousOrders/index.tsx:242-489` | `OButton` | h 40, r 7 (8 for review), width 45% / 100% | 0.2 | grey `View`, text keeps its color | 40 — under 44 |
| Logistic View order / Reject / Accept | `C/PreviousOrders/OrderList.tsx:51-86` | `OButton` | h 40, r 7 | 0.2 | grey `View`, text `white` | 40 — under 44 |
| Back (accept/reject) | `S/ONavbar.tsx:43-49` | `OIconButton` | h 40, icon 24, absolute `top: -20`, `left: -20` | 0.2 | — | 40 high, placed with negative offsets |
| Phone button | `C/AcceptOrRejectOrder/index.tsx:711-757` | `OButton` | h 50, r 10, outline primary | 0.2 | grey `View`, text `primary` 15 | 50 |
| Stepper − / + (screen) | `:780-793,811-824` | `TouchableOpacity` | 56×56 circle | 0.2 | bg `lightGray` | 56 |
| Time dial | `:836`; `styles.tsx:13-24` | styled `TouchableOpacity` (`Timer`) | 245×245 circle | 0.2 | — | 245 |
| Photo tile | `:958-969` | `TouchableOpacity` + inner `OIconButton` (two nested touchables, same handler) | 200×200 dashed | 0.2 | — | 200 |
| Remove image | `:948-955` | `OButton` | h 40, r 7, red | 0.2 | — | 40 — under 44 |
| OTP cells | `SecurityPinFields.tsx:141-164` | `@twotalltotems/react-native-otp-input` | 26–38 wide, 30–44 high | library | — | Under 44 wide |
| Continue / main action | `C/AcceptOrRejectOrder/index.tsx:1007-1065` | `OButton` | h 45, r 7, 100% | 0.2 | grey `View`; "blocked" = bg `disabled` + opacity 0.6, still pressable | 45 |
| Requirements Close | `:1084-1091` | `OButton` | h 45, r 7, bg `textGray` | 0.2 | — | 45 |
| New-order close | `C/NewOrderNotification/index.tsx:135-140` | `TouchableOpacity` | icon 30 | 0.2 | — | 30×30 — under 44 |
| Floating Reject / Accept | `C/OrderDetailsLogistic/index.tsx:175-187` | `FloatingButton` (styled `TouchableOpacity`) | h 50, r 10, 100% | 0.2 | `disabled` prop, no look | 50 |

No touchable of the area sets `hitSlop`, `accessibilityRole` or `accessibilityLabel`; none uses `android_ripple`.

### Icons

| Set (import alias) | Glyph | Size | Color | file:line | Function |
|---|---|---|---|---|---|
| Feather (`FeatherIcon`) | `refresh-cw` | 24 | `theme.colors.gray200` | `C/OrdersOption/index.tsx:560` | Reload |
| Feather | `chevron-up` / `chevron-down` | 18 | `#444` | `C/OrdersOption/index.tsx:888`; `C/AcceptOrRejectOrder/index.tsx:881` | Select open/closed |
| Feather | `minus` / `plus` | 26 | `#fff` | `C/AcceptOrRejectOrder/index.tsx:792,823` | Stepper |
| Feather (`Icon`) | `x` | 30 | `theme.colors.textNormal` (undefined) | `C/NewOrderNotification/index.tsx:139` | Close dialog |
| AntDesign (`AntDesignIcon`) | `warning` | 12 | `#FFC700` | `C/OrdersOption/index.tsx:539` | Filter notice |
| AntDesign | `exclamationcircle` | 16 | `theme.colors.primary` | `:573` | Filter-active badge |
| AntDesign | `filter` | 24 | `theme.colors.gray200` | `:586` | Open search |
| AntDesign | `close` | 20 | not set | `:912,927` | Clear input |
| AntDesign | `up` / `down` | 16 | `theme.colors.textGray` | `C/OrdersOption/OrderSummaryTable.tsx:143` | Collapse |
| MaterialCommunityIcons (`MCIcon`) | `format-list-numbered` | 14 | `theme.colors.textGray` | `C/PreviousOrders/OrderItem.tsx:259` | Set delivery position |
| MaterialCommunityIcons | `cloud-sync` | 18 | `#444` | `:294` | Pending sync |
| MaterialCommunityIcons | `minus` / `plus` | 26 | `#fff` | `:430,472` | Stepper |
| MaterialCommunityIcons (`MaterialCommunityIcon`) | `chevron-up` / `chevron-down` | 18 | `theme.colors.textNormal` (undefined) | `C/PreviousOrders/OrdersGroupedItem.tsx:97` | Accordion |
| Entypo (`EntypoIcon`) | `dot-single` | 32 | `theme.colors.primary` | `C/PreviousOrders/OrderItem.tsx:303` | Unread dot |
| Fontisto (`FontistoIcon`) | `search` | 24 | `theme.colors.backgroundDark` | `C/OrdersListManager/index.tsx:315` (dead); imported and unused in `C/OrdersOption/index.tsx:5` | Open search |
| Through shared dropdowns | AntDesign `close`/`calendar` 20; Feather `chevron-down` 24, `chevron-left/right` 24; MaterialCommunityIcons `radiobox-marked/blank` 24 | — | `textNormal` (undefined), `unselectText`, `disabled`, `primary`, `arrowColor` | `S/ODropDown.tsx:137-216`, `S/ODropDownCalendar.tsx:197-335` | Date and City filters |
| Tinted PNG (`OIcon`) | `theme.images.general.chronometer` | 24 / 26 | `unselectText` / `textGray` | `C/OrdersOption/index.tsx:603-614` | Logistic tab |
| Tinted PNG (`OIcon`) | `clock1`, `clockRisk`, `clockDelayed` | 16 | `#00D27A`, `#FFC700`, `#E63757` | `C/OrdersOption/index.tsx:1049-1054` | SLA timeline (unreachable) |
| PNG, not tinted | `cellphone` 20×20; `camera` 40×40; `arrow_left` 24×24 | — | file colors | `C/AcceptOrRejectOrder/index.tsx:727,751,960`; `S/ONavbar.tsx:44` | Call; take photo; back |

Five vector families (Feather, AntDesign, MaterialCommunityIcons, Entypo, Fontisto) plus PNG icons in one area; the same function drawn with different sets (stepper: Feather vs MaterialCommunityIcons; chevron: three sets; close: two sets).

### Theme keys read

45 distinct keys, 283 reads in the area's files (regex on `theme.colors|images|fonts`, including `props.theme` and `theme?.`).

| Key | Reads | Defined? | Only in dead files? |
|---|---|---|---|
| `colors.primary` | 44 | yes | no |
| `colors.textGray` | 38 | yes | no |
| `colors.unselectText` | 19 | yes | no |
| `colors.white` | 15 | yes | no |
| `colors.lightGray` | 13 | yes | no |
| `colors.disabled` | 12 | yes | no |
| `colors.red` | 10 | yes | no |
| `colors.green` | 9 | yes | no |
| `colors.danger100` | 9 | yes | no |
| `colors.inputDisabled` | 9 | yes | no (Date, City; 5 more in dead wrappers; 2 in unused `FilterBtnWrapper`) |
| `colors.clear` | 8 | yes | 6 of 8 are in unused style keys |
| `colors.success100` | 8 | yes | no |
| `colors.gray100` | 7 | yes | no |
| `colors.inputChat` | 7 | yes | no |
| `colors.error` | 6 | yes | 2 of 6 in unused style keys |
| `colors.danger500` | 5 | yes | no |
| `colors.tabBar` | 5 | yes | live reads are in the tags row that never renders |
| `colors.black` | 4 | yes | same (tags row) |
| `colors.gray200` | 4 | yes | no |
| `colors.primaryLight` | 4 | yes | no |
| `colors.success500` | 4 | yes | no |
| `colors.backArrow` | 3 | yes | 1 live (`OrderSummaryTable.tsx:125`) |
| `colors.backgroundPage` | 3 | yes | no |
| `colors.secondary` | 3 | yes | no |
| `colors.borderTops` | 2 | yes | no |
| `colors.btnBGWhite` | 2 | yes | no |
| `colors.inputTextColor` | 2 | yes | 1 live |
| `colors.backgroundDark` | 2 | yes | **yes** (`OrdersListManager/index.tsx:306,317`) |
| `colors.textSecondary` | 1 | yes | no |
| `colors.warning100` | 1 | yes | no |
| `colors.blueLight` | 2 | **no** | no — `C/PreviousOrders/OrderList.tsx:54-55` |
| `colors.textNormal` | 2 | **no** | no — `OrdersGroupedItem.tsx:97`, `NewOrderNotification/index.tsx:139` (also read by the shared dropdowns and `OInput`) |
| `colors.textGra` | 1 | **no** | **yes** — `OrdersListManager/index.tsx:422` |
| `fonts.primary.name` | 2 | yes | no — `OrderItem.tsx:142`, `OrderSummaryTable.tsx:79` |
| `images.general.notFound` | 2 | yes | 1 live |
| `images.general.chronometer` | 2 | yes | 1 live |
| `images.general.clock1`, `clockRisk`, `clockDelayed` | 2 each | yes | live reads feed unreachable content |
| `images.general.cellphone` | 2 | yes | no |
| `images.general.camera` | 1 | yes | no |
| `images.general.newOrder` | 1 | yes | no |
| `images.general.ordersGroup` | 1 | yes | no |
| `images.dummies.businessLogo` | 1 | yes | no |
| `images.general.arrow_left` | 1 | yes | **yes** (the live back arrows read it inside `ONavbar`/`OModal`) |

Same hex under several keys in what this area reads: `red` = `danger500` (#E63757); `green` = `success500` (#00D27A); `gray100` = `inputChat` (#F8F9FA). The area reads no `theme.sounds` key.

### Platform and window

| What | file:line | Value | Kind |
|---|---|---|---|
| Tablet padding of the card | `C/PreviousOrders/OrderItem.tsx:101-104,111` | `Platform.isPad` or `DeviceInfo.isTablet()` → `paddingVertical` 20 instead of 15 | The only tablet branch of the live area: a `platforms` value or nothing — question |
| Orientation margin of the card | `:100,112` | portrait `marginBottom: 15`, landscape 0 | Orientation branch that cannot happen: the app is locked to portrait (`ios/ODelivery/Info.plist:181-184`, `android/app/src/main/AndroidManifest.xml:42`) |
| List min height from the window | `C/OrdersOption/index.tsx:186,648` | `HEIGHT_SCREEN - 450` (`Dimensions.get('window')` through `useDeviceOrientation`) | Layout computed from the screen |
| `IS_PORTRAIT` computed, unused | `C/OrdersOption/index.tsx:187`; `C/OrdersListManager/index.tsx:94` | — | Dead variable |
| iOS-only selected-tab underline | `C/OrdersOption/index.tsx:998`; `C/OrdersListManager/index.tsx:418,705` | `borderBottomWidth` 1 only on iOS | Look branch (unreachable / dead code) |
| iOS-only z-index of dropdown wrappers | `C/OrdersOption{Date,City,…}/styles.tsx:5-7` | 20, 18 (and 14–19) | Stacking workaround for in-place dropdowns; disappears with a sheet select |
| Unused style with platform margin | `C/OrdersOption/index.tsx:307` | `marginTop` iOS 60 / Android 30 | Hand-made safe area, dead |
| `isIos` passed to the controller | `C/OrdersOption/index.tsx:1141`; `C/OrdersListManager/index.tsx:749` | `Platform.OS === 'ios'` | Behaviour |
| Dialog max width from the screen | `C/NewOrderNotification/index.tsx:36,256` | `Dimensions.get('screen').width - 60`, read once at import | Computed at module load; the app is portrait-only and full screen on iPad (`UIRequiresFullScreen`), so the width does not change while running |
| Android alarm sound module | `C/NewOrderNotification/index.tsx:46-47,107-112` | `NativeModules.AlarmSound` on Android, `SoundPlayer` otherwise | Behaviour |
| Keyboard avoiding | `C/AcceptOrRejectOrder/index.tsx:669-673` | `behavior` iOS `padding`, Android `height` | Behaviour |
| Top bar padding by hand | `C/AcceptOrRejectOrder/index.tsx:677-679` | iOS: 0 as a page, `insets.top` in a modal; Android: `Math.max(insets.top, 30)` — as a page this adds to the `SafeAreaContainer` top inset (`P/AcceptOrRejectOrder.tsx:9`) | Hand-made safe area (lesson 14) |
| Bottom bar margin by hand | `C/AcceptOrRejectOrder/index.tsx:1000-1003,653-666` | iOS 30; Android 0 (page) / 40 (modal), or `keyboardHeight - 20` / `+ 10` from keyboard listeners | Hand-made safe area and keyboard (lessons 14, 17) |
| Content top padding by action | `C/AcceptOrRejectOrder/index.tsx:242` | 0 (reject) / 30 (page) / 40 (modal) | Layout by prop |
| PIN cell size from the window | `C/AcceptOrRejectOrder/SecurityPinFields.tsx:20-31,121-123` | `(window width − 60 + 8) / count − 8`, clamped 26–38; `Dimensions.get` at render, no listener | Computed from the screen |
| Spacer for the floating buttons | `C/OrderDetailsLogistic/index.tsx:109-115`; `src/ui/src/hooks/useFloatingButtonInset.ts` | `100 + inset` (iOS home indicator outside tabs) / 50 / 35 | Hand-made inset |
| Safe areas of the pages | `P/MyOrders.tsx:105`; `P/OrderDetailsLogistic.tsx:17`; `P/AcceptOrRejectOrder.tsx:9` | `SafeAreaContainerLayout` (top, left, right + gutter 20) for the first two; `SafeAreaContainer` (four edges, no gutter) for the third | Two page shells |
| Status bar | `src/ui/src/layouts/SafeAreaContainer.tsx:93-96` | iOS `dark-content`; Android background turns `danger500` offline and `success500` for 2 s when back | Other area's file; affects the Orders tab |
| Unused modal sizes | `P/MyOrders.tsx:83-84` | 90% / 70% of the screen | Dead styles |
| (dead) split view | `C/OrdersListManager/styles.tsx:110-123` | 30% / 70% columns | A tablet layout nothing mounts (the iOS target includes iPad: `TARGETED_DEVICE_FAMILY = "1,2"`) |

### Styles that cannot see the theme

| Kind | Where | Note |
|---|---|---|
| Module-level `StyleSheet.create` | `C/NewOrderNotification/index.tsx:248-269` | Computed at import: `'#FFF'`, radius 8, paddings, `maxWidth` from the screen. The only module-level sheet of the area |
| `StyleSheet.create` inside the component (rebuilt every render; sees the theme) | `C/OrdersOption/index.tsx:206,1078`; `OrderSummaryTable.tsx:60`; `C/OrdersListManager/index.tsx:96`, `utils.tsx:187`; `C/PreviousOrders/OrderItem.tsx:108` (once per card), `OrdersGroupedItem.tsx:26`; `C/AcceptOrRejectOrder/index.tsx:201`, `SecurityPinFields.tsx:56`; `P/MyOrders.tsx:75` | 10 sheets; to move to styled components or memoized on the theme |
| Styled components declared inside a render function | `C/OrdersListManager/utils.tsx:118-155,200-207` | New component type each render (dead file) |
| Inline `style={{ … }}` | `C/AcceptOrRejectOrder/index.tsx` 28 · `C/OrdersOption/index.tsx` 19 · `C/OrdersListManager/index.tsx` 15 · `C/PreviousOrders/index.tsx` 14 · `C/PreviousOrders/OrderItem.tsx` 14 · `OrderSummaryTable.tsx` 9 · `OrdersGroupedItem.tsx` 5 · `OrderList.tsx` 4 · `C/OrderDetailsLogistic/index.tsx` 4 · `utils.tsx` 1 · `SecurityPinFields.tsx` 1 · `C/NewOrderNotification/index.tsx` 1 | 115 in total |
| Inline `textStyle` / `parentStyle` / `iconStyle` / `imgLeftStyle={{ … }}` on primitives | `C/PreviousOrders/index.tsx` 26 · `C/AcceptOrRejectOrder/index.tsx` 11 · `OrderList.tsx` 6 · `OrderItem.tsx` 4 · `C/OrdersListManager/index.tsx` 3 · `C/OrdersOption/index.tsx` 2 · `SecurityPinFields.tsx` 1 | 53: every `OButton` of the area is restyled at the call (height, radius, colors, font size) |
| `defaultProps` on function components | `C/OrdersOption/index.tsx:1291-1293` (`isNetConnected: true`); `C/PreviousOrders/index.tsx:575-577` (`orders: []`) | Ignored on React 19; the page passes `isNetConnected` itself. The primitives used here rely on ignored defaults too: `OButton` (`activeOpacity: 0.5`, `indicatorColor`), `OInput` (`bgColor: 'white'`, `borderColor: 'white'`) |
| Colors passed as props instead of read by the component | `bgColor` / `borderColor` / `color` / `bgcolor` / `textcolor` / `firstColorCustom` on `OButton`, `OText`, `ODropDown`, `FloatingButton` | The primitive cannot own its variants while each call sends its colors |

### Third-party UI

| Library | file:line | What it draws | Props that carry styles |
|---|---|---|---|
| `react-native-select-dropdown` ^1.7.0 | `C/OrdersOption/index.tsx:871-901`; `C/AcceptOrRejectOrder/index.tsx:870-906`; `C/OrdersListManager/index.tsx:346-374` (dead) | Select button and floating option list | `buttonStyle`, `buttonTextStyle`, `dropdownStyle`, `rowStyle`, `dropdownOverlayColor`, `renderDropdownIcon`, `renderCustomizedRowChild` |
| `react-native-calendar-picker` ^7.1.2 (through `S/ODropDownCalendar`) | `C/OrdersOptionDate/index.tsx:45-62` → `S/ODropDownCalendar.tsx:322-348` | Month grid for the date range | `selectedDayColor`, `selectedDayTextColor`, `todayBackgroundColor` (reads undefined `theme.colors.border`), `dayLabelsWrapper`, `customDayHeaderStyles`, `width` |
| `react-native-paper` ^4.9.2 `Text` (through the shared dropdowns) | `S/ODropDown.tsx:183,218`; `S/ODropDownCalendar.tsx:234,268,280,300` | Option labels with Paper's own font and color | none passed |
| `@twotalltotems/react-native-otp-input` ^1.3.11 | `C/AcceptOrRejectOrder/SecurityPinFields.tsx:141-164` | PIN cells | `style`, `codeInputFieldStyle`, `codeInputHighlightStyle`, `selectionColor` |
| `rn-placeholder` ^3.0.3 | `C/OrderDetailsLogistic/index.tsx:126-137` | Loading lines with `Fade` | `width` only; library colors |
| `react-native-fast-image` ^8.5.11 | `C/PreviousOrders/OrderItem.tsx:268-276`; `OrdersGroupedItem.tsx:64-68` | Logos | `style`, `resizeMode` |
| RN `Modal` (raw) | `C/NewOrderNotification/index.tsx:118-122`; `C/AcceptOrRejectOrder/index.tsx:1070-1075` | Dialogs outside `OModal` | `animationType="slide"`, `transparent` |
| RN `RefreshControl` | `C/OrdersOption/index.tsx:759-762` | System pull-to-refresh spinner | no `tintColor` / `colors` |
| RN `ActivityIndicator` | `C/OrdersOption/OrderSummaryTable.tsx:195` | Spinner | `color`, `size` |
| RN `Alert.alert` (through `OAlertOriginal`) | `C/OrderDetailsLogistic/index.tsx:193-201` | System alert | not themable |
| RN `KeyboardAvoidingView`, `Vibration`, `Linking`; `react-native-restart`; `react-native-sound-player`; `react-native-permissions` | `C/AcceptOrRejectOrder/index.tsx:669,730,181`; `C/NewOrderNotification/index.tsx:61,71`; `C/OrdersOption/index.tsx:848` | No UI | Behaviour |
| Maps (`GoogleMap`, other area) | `C/PreviousOrders/index.tsx:554-570` | Tracking map in a modal | Behind the Business-only button: off |

### Motion

| What | file:line | Duration / value |
|---|---|---|
| New-order dialog | `C/NewOrderNotification/index.tsx:119` | `Modal animationType='slide'` (system duration) |
| Requirements dialog | `C/AcceptOrRejectOrder/index.tsx:1073` | `Modal animationType="slide"` |
| Search modal, position dialog, force-status / review / map modals | `S/OModal.tsx:178` | `animationType="slide"` for every `OModal`, also the centered dialog |
| Group accordion | `C/PreviousOrders/OrdersGroupedItem.tsx:104-111` | `Animated.View` imported and mounted with no animated value: the body switches `display` with no transition |
| List skeleton | `S/SkeletonBone.tsx:27-41` (used at `C/OrdersOption/index.tsx:808`) | `Animated.loop`: opacity 0.7 → 1 in 700 ms, back in 700 ms; stagger `index × 60` ms plus 30 / 45 / 60 / 75 / 90 |
| Detail skeleton | `C/OrderDetailsLogistic/index.tsx:127` | rn-placeholder `Fade` (library timing) |
| Pressed feedback | `C/OrdersOption/OrderSummaryTable.tsx:141,190`; `OrdersGroupedItem.tsx:58` | `activeOpacity` 0.7, 0.7, 1; every other touchable uses the RN default (0.2) or has none (`Pressable`) |
| Vibration and sound loop (behaviour) | `C/NewOrderNotification/index.tsx:35,61-62` | pattern `[0, 800, 400, 800, 400, 800]` repeating; sound restarted every 2500 ms |
| Focus delays (behaviour) | `C/AcceptOrRejectOrder/index.tsx:626-628`; `SecurityPinFields.tsx:25,40-43` | 400 ms; 500 ms |
| Scroll to top on tab change | `C/OrdersOption/index.tsx:447-452` | `scrollTo()` |

No `LayoutAnimation` and no `Animated.timing` in the area's own files.

### Dead code

| Item | Where | How it was checked |
|---|---|---|
| `OrdersListManager` (component, `styles.tsx`, `utils.tsx`, its test) | `C/OrdersListManager/*` | `grep -rn "OrdersListManager" src` outside the submodule: only its own folder and the export in `src/ui/index.tsx:19,112`. No page or navigator mounts it |
| `OrdersOptionBusiness`, `OrdersOptionDelivery`, `OrdersOptionDriver`, `OrdersOptionPaymethod` | `C/OrdersOption*/` | Only rendered by `OrdersListManager/index.tsx:646-665`, inside `isBusinessApp &&` |
| `OrdersOptionStatus` | `C/OrdersOptionStatus/` | No JSX use anywhere in `src`; only the `@ui` export |
| Status tags row in `OrdersOption` | `C/OrdersOption/index.tsx:649-715`; `Tag` in `styles.tsx:19-27`; style keys `tag`, `tagsContainer` | `showTagsList = !props.isDriverApp && …` (`:188`) and the only page passes `isDriverApp: true` (`P/MyOrders.tsx:34`) |
| SLA settings content in `OrdersOption` | `C/OrdersOption/index.tsx:976-1026`, `StatusBlock` `:1034-1071`, `Timer` `:1073-1097`; `ModalTitle`, `SlaSettingModalContent`, `DeliveryStatusWrapper`, `VerticalLine`, `StatusItems`, `ItemHeader`, `ItemStatus`, `ItemContent`, `TimerInputWrapper`, `OverLine` in `styles.tsx`; `deliveryStatus`, `defaultOrderTypes`, `currentDeliveryType`, `selectedTabStatus`, `scrollRefTab` | `setOpenSLASettingModal(true)` only inside `onClickSetting` (`:432-434`), which nothing calls in that file; `StatusBlock`/`Timer` exported from `OrdersOption/index.tsx` are imported nowhere else |
| Images only painted by that content | `theme.images.general.clock1`, `clockRisk`, `clockDelayed` (`src/assets/icons/clock1.png`, `clock-history1.png`, `clock-fill1.png`) | `grep` of the three keys in `src` outside the submodule: the only readers are the two `deliveryStatus` lists (`C/OrdersOption/index.tsx:163-177`, `C/OrdersListManager/utils.tsx:62-76`), both feeding content that never renders |
| `isBusinessApp` branches | `C/OrdersOption/index.tsx:599,799,854`; `C/PreviousOrders/index.tsx:83`; `C/NewOrderNotification/index.tsx:190,194` | `grep isBusinessApp src/pages src/navigators`: no page passes it |
| "Track real time position" button, map modal, three fallback URLs, `handleOpenMapView` | `C/PreviousOrders/index.tsx:137-187,338-353,554-570` | Needs `appTitle.text` to include `'Business'`; the driver pages pass `'Delivery app'` |
| Selected-row background | `C/PreviousOrders/OrderList.tsx:35` (`currentOrdenSelected`) | Only `OrdersListManager` passes `currentOrdenSelected` / `handleClickEvent` |
| Unused styled components | `FilterBtnWrapper`, `Actions` (`C/OrdersOption/styles.tsx:47-56,146-148` and `C/OrdersListManager/styles.tsx:50-59,108`); `TopActions` (`C/AcceptOrRejectOrder/styles.tsx:7-11`, imported at `index.tsx:20`, never rendered) | Script: styled exports with no JSX use in their folder |
| Unused `StyleSheet` keys | `C/OrdersOption/index.tsx`: `icons`, `SLAwrapper`, `btnBackArrow`, `acceptButtonStyle`, `errorMessage`; `C/AcceptOrRejectOrder/index.tsx`: `bottom`, `btnBackArrow`; `C/OrdersListManager/index.tsx`: `icons`, `acceptButtonStyle`, `errorMessage`; `P/MyOrders.tsx`: `modalView`, `wrapperIcon`, `modalContainer` | Script: keys with no `styles.<key>` reference in the file |
| Unused imports and state | `C/OrdersOption/index.tsx`: `TouchableOpacity`, `FontistoIcon`, `IS_PORTRAIT`, `setSlaSettingTime`, `refreshing` (never true); `P/MyOrders.tsx`: `showPermissionModal` state, `settings`, `Dimensions` (only for the unused styles); `C/PreviousOrders/index.tsx:50,189-196` commented timer; `C/PreviousOrders/OrderItem.tsx`: `IS_PORTRAIT` only feeds one margin | Read |
| `Animated` in the accordion | `C/PreviousOrders/OrdersGroupedItem.tsx:2,105` | No animated value is created |
| `checkSoundMedia` and `isEnabledReadStorage` | `C/NewOrderNotification/index.tsx:43,105-116` | The call is commented out; the state stays `true` |
| Bundled sound | `theme.sounds.notification` (`src/DeliveryApp.tsx:106-108`, `src/assets/sounds/notification.mp3`) | `grep -rn "sounds" src` outside the submodule: only the definition. The dialog plays a remote URL |
| Theme keys only read by dead code in this area | `colors.backgroundDark`, `colors.textGra` (undefined), `images.general.arrow_left` (direct read) | See "Theme keys read" |

### Not verified

Nothing was run: no simulator, no device, no tests, no type check. By name:

- **Every pixel result**: the tables give style values, not measured boxes. Not seen: the order card with five text rows inside `max-height: 60` in a card of fixed height 105 (clipping or overlap of the chips, with and without the timer shift `bottom: 10px`); long business names next to the position badge; the 30–35 pt tabs with long translations.
- **React 19 `defaultProps`** (`OButton`, `OInput`, `OrdersOption`, `PreviousOrders`): stated from the code and lesson 8, not observed. Consequences to confirm on a device: press opacity 0.2 instead of 0.5, and the search inputs painting `backgroundLight` (#F5F9FF) instead of white.
- **Undefined keys**: what `theme.colors.textNormal` (close X, group chevron) and `blueLight` ("View order") paint was deduced, not seen.
- **Fonts**: whether `Helvetica` + `fontWeight` and `Inter_18pt-Black` + 700 render a real or a faux bold on Android; what `ONavbar`'s family string `Inter_18pt-Black_18pt-Black` falls back to on each platform.
- **Shadows** of the logo frames (iOS: no `shadowOpacity`; Android: `elevation: 15` on a view with no background).
- **The delivery position dialog** through `OModal isTransparent`: it also mounts an empty title section with a 2 px bottom border (`S/OModal.tsx:193-201`); whether a stray line shows above the box.
- **Accept / reject screen**: the Android top padding as a page (`Math.max(insets.top, 30)` on top of `SafeAreaContainer`), the bottom margin with the keyboard open on both platforms, the absolute "Hours"/"Minutes" labels inside the dial, the hidden input keeping focus, the screen inside `OModal` vs as a page.
- **In-place dropdowns** (Date, City) inside the modal `ScrollView`: clipping, overlap of the buttons below, the iOS z-index ladder, the calendar width `window − 80`; Android stacking without z-index.
- **react-native-select-dropdown**: its real button height (library default vs `minHeight: 40`) and where its list opens.
- **Tablet**: the app ships for iPad (`TARGETED_DEVICE_FAMILY = "1,2"`) and is locked to portrait on both platforms, so landscape does not exist; the only tablet branch of the area is the card padding. How the list, the 245 pt dial, the new-order dialog and the bottom bar look on a tablet was not seen. iOS is also fixed to light mode (`UIUserInterfaceStyle = Light`, `ios/ODelivery/Info.plist:185-186`).
- **Offline flow**: banner, cached orders, "Refresh" restart, status bar color; **push/websocket flow**: when the new-order dialog opens, sound and vibration.
- **Server-config states** not exercised: `plan_enterprise` (SLA bar, timer, tint, SLA select), `logistic_module` (logistic tab, assign-request rows, logistic detail), `combine_pending_and_progress_orders`, `change_order_id`, `disable_delivery_priority`, `reject_orders_enabled`, `order_not_ready_enabled`, `failed_pickup_by_driver_enabled`, `allow_save_changes_offline`, delivery PIN and status-photo settings, summary projects.
- **Right-to-left**: no RTL handling was found in the area; not tested.
- **Accessibility**: labels and roles are absent in code; contrast (yellow `#FFB700` text on white and on `#FFF4DA`, white on `#FFB700`) was not measured.
- **Not read**: the area's `__tests__` folders (not UI); the submodule beyond the props of `OrderListGroups`; the components owned by other areas that this area mounts (`WebsocketStatus`, `NotificationSetting`, `NotFoundSource`, `FloatingButton`, `OrderHeaderComponent`, `OrderContentComponent`, `ValidationIssuesList`, `ReviewCustomer`, `GoogleMap`, `OrderDetailsDelivery`) were skimmed or left to their owners; the hooks `useDeliveryPin`, `useStatusImage`, `useSecureOrderId`, `useLocation` (behaviour).
- **Readers inside the submodule** of the `clock*` images and of `theme.sounds`: only `src` outside the submodule was searched.
