## 4 — Order details

Phase 1 inventory, read-only. Nothing was run (no app, no simulator, no tests): every statement below comes from reading code.

Path abbreviations used in every table:

| Abbrev. | Path |
|---|---|
| `P` | `src/pages/OrderDetails.tsx` |
| `OD/` | `src/ui/src/components/OrderDetails/` |
| `PIA/` | `src/ui/src/components/ProductItemAccordion/` |
| `RC/` | `src/ui/src/components/ReviewCustomer/` |
| `OS/` | `src/ui/src/components/OrderSummary/` |
| `BPL/` | `src/ui/src/components/BusinessProductList/` |
| `BC/` | `src/ui/src/components/BusinessController/` |
| `SL/` | `src/ui/src/components/StoresList/` |
| `SH/` | `src/ui/src/components/shared/` (other agent's; cited only for what my files get from it) |
| `FB/` | `src/ui/src/components/FloatingButton/` (other agent's) |

### Reachability of the area (summary; details under "Dead code")

| Component | Reachable in the driver app? | Rendered from |
|---|---|---|
| `P` → `OrderDetailsDelivery` (`OD/Delivery.tsx`) | Yes | `src/navigators/HomeNavigator.tsx:52-56` (stack screen `OrderDetails`, `headerShown: false`). Entry points: `PreviousOrders/index.tsx:99`, `MapView/RenderMarker.tsx:106`, `Payouts/index.tsx:138`, push open `RootNavigator.tsx:420-421` |
| `OD/OrderHeaderComponent.tsx` | Yes, except its `isCustomView` branch (`:290-351`) | `OD/Delivery.tsx:923`, `OrderDetailsLogistic/index.tsx:155` (other area) |
| `OD/OrderContentComponent.tsx`, `OD/OrderDetailsInformation.tsx` | Yes | `OD/Delivery.tsx:934-936`; `OrderContentComponent` also from `OrderDetailsLogistic/index.tsx:103` |
| `OD/ValidationIssuesList.tsx` | Yes | `OD/Delivery.tsx:899,908,1044`; `AcceptOrRejectOrder/index.tsx:1082` |
| `PIA/` | Yes (read-only mode only; cart branches unreachable) | `OD/OrderContentComponent.tsx:471` |
| `RC/` | Yes | `OD/OrderContentComponent.tsx:778`, `PreviousOrders/index.tsx:542` |
| `OD/usePrinterCommands.tsx` | **No** | no importer |
| `OS/` (print / PDF summary) | **No** | only exported `src/ui/index.tsx:27,120` |
| `SL/`, `BC/`, `BPL/` | **No** | only exported; `BC` only rendered by `SL` |
| `OrderDetails/Business` | Does not exist: the folder only has `Delivery.tsx` | — |

---

### Screens

| Screen | Root container | Fixed / sticky children | Blocks in render order |
|---|---|---|---|
| `OrderDetails` (`P:57-61`) | `SafeAreaContainerLayout paddingHorizontal={0}` (`src/ui/src/layouts/SafeAreaContainer.tsx:51-100`: `View` flex 1, bg `backgroundPage`, insets top/left/right only, `StatusBar`) → `View flex:1` (`OD/Delivery.tsx:818`) → `OrderDetailsContainer` = `styled.ScrollView` (`OD/styles.tsx:3-6`, `flex:1`, `max-height: 85%` or `100%`) | Outside the scroll, above it (fixed): top bar `Header` (`OD/Delivery.tsx:820-871`), pending-sync row (`:872-893`), validation banners (`:896-913`). Outside the scroll, below it: `FloatingButton` (absolute, bottom 0, `FB/styles.tsx:3-20`) (`:939-1029`). No `stickyHeaderIndices` | 1 top bar (back · copy · map · chat) → 2 pending-sync row → 3 validation banner(s) → **scroll:** 4 header card (order no. + status, delivery-position pill, order type / payment method) → 5 secondary lines (spot / reservation / external id / created at / placed to) → per order (1, or N for a logistic group): 6 group title → 7 band divider → 8 custom-fields card → 9 business card → 10 customer card → 11 "Order Details" title + order comment + product accordions → 12 bill rows + total → 13 payments card → 14 spot → 15 vehicle → 16 "Review customer" button → 17 inline status button(s) → **fixed:** 18 floating action bar |
| Loading state of the same screen | `View` bg `backgroundLight`, `paddingHorizontal: 20` (`OD/Delivery.tsx:796-813`); not a scroll | — | 6 × rn-placeholder group of 4 lines |
| Error state (no order + error) | `NotFoundSource` (`OD/Delivery.tsx:1115-1125`) | — | image `general.notFound` 260×220 → message → button "Go to my orders" |
| Requirements modal | RN `Modal` transparent, `animationType="slide"` (`OD/Delivery.tsx:1032-1056`) → overlay `View` → card `View` → inner `ScrollView` (`:1043`) | title and Close button fixed, list scrolls | title → `ValidationIssuesList` (with action buttons) → Close |
| Map modal | `OModal entireModal customClose` (`OD/Delivery.tsx:1057-1084`) → `DriverMap` (other area) | — | — |
| Action modal (accept / reject / pickup failed / delivery failed / not ready / force / arrived / pickup complete / delivery complete) | `OModal entireModal customClose` (`OD/Delivery.tsx:1085-1111`) → `AcceptOrRejectOrder` (other area) | — | — |
| Review customer modal | `OModal entireModal customClose` (`OD/OrderContentComponent.tsx:772-783`) → `KeyboardAvoidingView` (`RC/index.tsx:179-188`) → `Content` = `styled.ScrollView` (`RC/styles.tsx:3-6`) | `ONavbar` above the scroll (`RC/index.tsx:189-191`); `FloatingButton` below (`:304-311`) | navbar → "Rate the experience" + customer photo → rating bar + 5 labels → band divider → quick-comment title + chips → band divider → "add something" title → textarea → Send Review |

**Order details per effective status** (`effectiveStatus` = `order.status`, except status 4 where it is resolved from the driver stage, `src/ui/src/hooks/useDriverOrderStage.tsx:27-34`). Conditions: `OD/Delivery.tsx:123-188`, `OD/OrderDetailsInformation.tsx:46-51`, `OD/OrderContentComponent.tsx:73,763`.

| Effective status | Status color in title (`OD/OrderHeaderComponent.tsx:101-132`) | Floating bar (bottom, stacked: second button on top) | Inline button at the end of the scroll (only `delivery_type` 1 or 7) | "Review customer" button |
|---|---|---|---|---|
| 0 Pending | `primary` | Accept (green) / Reject (red) (`OD/Delivery.tsx:1000-1029`) | — | — |
| 4 Preparation completed (no driver stage), 7 Accepted by business, 14 Order not ready | `primary` | Accept / Reject | — | — |
| 8 Accepted by driver, 18 Driver almost arrived to business (or `isPickupPhase`) | `primary` | Pickup complete (green) / Pickup failed (red) (`:939-967`) — for 8 and 18 the **whole bar** is hidden when `reject_orders_enabled` ≠ '1' (`:172-176`) | "Arrived to business" (`OD/OrderDetailsInformation.tsx:61-81`) | — |
| 3 Driver in business | `primary` | Pickup complete / Pickup failed | "Order not ready" (red) if `configs.order_not_ready_enabled` = '1' (`:94-106`) | — |
| 9 Pickup completed, 19 Driver almost arrived to customer, 23 Driver on way | `primary` | Delivery complete (green) / Delivery failed (red) (`OD/Delivery.tsx:968-999`) | "Arrived to customer" (`OD/OrderDetailsInformation.tsx:82-93`) | — |
| 26 Driver arrived to customer | `primary` | Delivery complete / Delivery failed | — | — |
| 1, 11 (green); 2, 5, 6, 10, 12, 16, 17 (red) | `statusOrderGreen` / `statusOrderRed` | — | — | Yes, if `!order.user_review && order.customer_id` (`OD/OrderContentComponent.tsx:763-771`) |
| 15 Picked up by customer | `statusOrderGreen` | — | — | — |
| 13, 20, 21, 22, 24, 25 | `primary` | — | — | — |

Modifiers of the table above:

| Condition | Effect | file:line |
|---|---|---|
| `configs.reject_orders_enabled` exists and ≠ '1' (`isHideRejectButtons`) | hides the red (first) button of every bar; hides the whole pickup bar on 8/18 | `OD/Delivery.tsx:80,172-176,965,996,1004`, `FB/index.tsx:71` |
| `configs.failed_pickup_by_driver_enabled` ≠ '1' | hides "Pickup failed" | `OD/Delivery.tsx:82,965` |
| `configs.allow_driver_reject_order` ≠ '1' | "Reject" opens a system alert instead of the modal | `OD/Delivery.tsx:79,539-548` |
| `configs.hidden_driver_eta_time` = '1' | "Accept" changes status to 8 directly, no modal | `OD/Delivery.tsx:78,1019-1020` |
| `configs.states_requiring_image_driver` contains 3 / 9 / 11, or delivery PIN required | the button opens the action modal (`arrivedToBusiness` / `pickupComplete` / `deliveryComplete`) instead of changing status | `OD/Delivery.tsx:950-954,980-984`, `OD/OrderDetailsInformation.tsx:73-77` |
| location validation configs (`location_validation_*`) | warning banner(s) above the scroll; requirements modal on press | `OD/Delivery.tsx:219-232,288-329,896-913` |
| project name is `delosi` / `delosipruebas` (hard-coded) | delivery bar hidden unless status 26 when reject is hidden; "Delivery complete" only on 26; order comment painted `primary` bold | `OD/Delivery.tsx:73,186,990`, `OD/OrderContentComponent.tsx:458-461` |
| offline and `canSaveChangesOffline === false` | all action buttons `disabled` | `OD/Delivery.tsx:121,941,971,1002`, `OD/OrderDetailsInformation.tsx:66,87,99` |
| `order.unsync` | "Pending sync changes" row | `OD/Delivery.tsx:872-893` |
| `order.isLogistic && (order.order_group \|\| status ∈ [4,6,7])` | top-bar actions (copy/map/chat) hidden; status text hidden in title; business email/phones hidden; Accept/Reject call the logistic handler | `OD/Delivery.tsx:828,1009,1021`, `OD/OrderHeaderComponent.tsx:183,233`, `OD/OrderContentComponent.tsx:217` |
| `order.order_group && order.order_group_id && order.isLogistic` | one `OrderDetailsInformation` per order of the group, each inside a bordered box with its own title | `OD/Delivery.tsx:933-937`, `OD/styles.tsx:29-39` |
| `!isGrantedPermissions` (location) | every action navigates to `RequestPermissions` | `OD/Delivery.tsx:346-349,549-552,945-948,1008-1012` |
| `order.driver_id === null` and user level 4 | system alert "You have been removed from the order" | `OD/Delivery.tsx:631-644,1126-1134` |

---

### Elements

#### Order details screen (reachable)

| Screen / component | Element | file:line | Values today | Function | Proposal (component, token or key) |
|---|---|---|---|---|---|
| Loading | Skeleton wrapper | `OD/Delivery.tsx:796-800` | bg `theme.colors.backgroundLight` (#F5F9FF), paddingHorizontal 20 (inline) | loading state of the screen | `skeleton` primitive; surface color role; space token |
| Loading | 6 groups × 4 `PlaceholderLine` | `OD/Delivery.tsx:801-812` | widths 90 / 50 / 20 / 10 (%), row marginBottom 30, `Animation={Fade}`; line height/color = rn-placeholder defaults | skeleton lines | `skeleton` primitive (library replaced); widths stay layout |
| Top bar | `Header` | `OD/styles.tsx:13-18`, `OD/Delivery.tsx:820` | row, space-between, padding-horizontal 20, padding-vertical 10; no background, no border | screen top bar (back + actions, no title) | `header` |
| Top bar | Back button | `OD/Delivery.tsx:821-827`, style `:713-724` | `OIconButton`, icon `general.arrow_left` 24×24 (no tint: PNG as drawn), box 24×24, borderWidth 0, bg/border/shadow `clear`, paddingLeft/Right 0, marginTop 10; `tintColor: gray200` set on the **View** style (no effect) | go back / dismiss alert | `header` back button (icon button); icon size + color role |
| Top bar | Copy icon | `OD/Delivery.tsx:833-840`, style `:706-712` | `TouchableOpacity` (no style) + `MaterialCommunityIcons content-copy` size 20 color `gray200`; glyph style maxWidth 40, height 40, padding 10. Hidden when status slug is PENDING (`:830-831`) | copy order as text to clipboard | icon button in `header`; `icon` size; color role |
| Top bar | Map icon | `OD/Delivery.tsx:843-853` | `OIconButton` icon `general.map` 20×20 tint `gray200`; style height 40, maxWidth 40, minWidth 40, padding 10, borderColor `clear` (primitive adds padding-horizontal 20, border 1, radius 20) | open map modal | icon button in `header` |
| Top bar | Chat icon + unread dot | `OD/Delivery.tsx:854-867`; `Dot` `OD/styles.tsx:143-152` | `OIconButton` icon `general.messages` 20×20 tint `gray200`, same box as map. Dot: absolute, 8×8, radius 4, bg `theme.colors.red`, top 10, right 10, z-index 99; shown when there are unread messages from others (`:855`) | open `OrderMessage` (chat with business) | icon button in `header` + `badge` (dot) |
| Sync row | Pending-sync notice | `OD/Delivery.tsx:872-893` | row, align center, **no horizontal padding** (page padding is 0); `MaterialCommunityIcons cloud-sync` 16 color `'#444'` (literal); `OText` 14, color `textGray`, marginLeft 5 | offline: changes saved locally, not synced | inline notice (`alert` info/warning variant) or `badge`; icon + color role; space token |
| Validation | Warning banner (×0–2) | `OD/Delivery.tsx:896-913`, style `:757-772` | bg `'#FFF3CD'`, borderLeftWidth 4 `'#D81212'`, padding 12, paddingBottom 20, marginTop 8, marginBottom 8, marginHorizontal 20, radius 8, shadow `#000` offset 0/2 opacity 0.15 radius 6, elevation 5 | location requirements not met for the next status | `alert` (warning) |
| Validation | Issue row | `OD/ValidationIssuesList.tsx:20-38,55-69` | `MaterialCommunityIcons alert-circle` 16 color `theme.colors.red`, marginTop 2; raw `<Text>` fontSize 13, lineHeight 18, color `'#856404'`, marginLeft 8 (no fontFamily: system font); row marginBottom 8 | one unmet requirement | `alert` body: text preset + icon; color roles (warning) |
| Validation | Issue action button | `OD/ValidationIssuesList.tsx:39-48,70-75` | `OButton` bg/border `primary`, text `'#FFF'` 14, radius 7, height 45, width 100%, marginTop 10 | refresh location / open settings | `button` (primary, small size) |
| Scroll | `OrderDetailsContainer` | `OD/styles.tsx:3-6`, `OD/Delivery.tsx:914-922` | `flex:1`; `max-height: 85%` when status ∈ [0] or ([7,14] and not reservation) or ([4,20,21] and delivery type ∉ [1,7]); else `100%` | screen scroll | layout; the 85% is a hand-made reserve for the action bar (see "Off the scale") |
| Header card | `Section` | `OD/styles.tsx:154-157`, `OD/OrderHeaderComponent.tsx:178-179` | radius 10, bg `gray100` (#F8F9FA), paddingTop 25, paddingBottom 10 (inline); wrapper marginBottom 20; **no horizontal margin or padding** (card runs edge to edge of the screen) | summary card | `card` |
| Header card | Title "Order No. N is STATUS" | `OD/OrderHeaderComponent.tsx:180-195` | `OText` 24 / 700, centered, 2 lines, marginBottom 15; status part colored by map `:101-132` (`primary` / `statusOrderGreen` / `statusOrderRed`), fallback `primary` | screen title + order status | text preset (screen title); status color roles |
| Header card | Delivery-position pill | `OD/OrderHeaderComponent.tsx:196-211` | bg `primary`, radius 12, paddingHorizontal 12, paddingVertical 5; `OText` 13 / 600 color `'#fff'`; wrapper marginBottom 15. Shown when `order.delivery_position != null` | position of the delivery in the route | `badge` / `chip` |
| Header card | Horizontal and vertical rules | `OD/OrderHeaderComponent.tsx:212,220` | empty `View` with `borderWidth: 1`, borderColor `tabBar` (#e9ecef) → a 2 pt line | separators inside the card | `divider` (item) |
| Header card | Two columns: Order type / Payment method(s) | `OD/OrderHeaderComponent.tsx:213-231` | row marginTop 15, each `flex:1` centered; label `OText` 14 / 700 center, value 14 / 400 center | order facts | text presets (label + value) |
| Secondary lines | Spot / Reservation / External ID / Created at / Placed to | `OD/OrderHeaderComponent.tsx:233-289`, style `:91-98` | centered row, marginTop 10; label `OText` 12 / 700, value 12 / 400 | order metadata | text preset (metadata/caption) |
| Order group | Group box | `OD/styles.tsx:29-39`, `OD/OrderContentComponent.tsx:150` | border 1 `rgba(0, 0, 0, 0.2)`, padding 10 when `isOrderGroup`; last order margin-bottom 50 | one order of a logistic group | `card` (outlined) |
| Order group | Title "Order #N" | `OD/OrderContentComponent.tsx:151-153` | `OText` 18 / 700 | card title | text preset (section title) |
| Content | Band divider | `OD/OrderContentComponent.tsx:154` | empty `View` `borderWidth: 2.5` color `gray100`, marginBottom 25 → 5 pt band | separates header from details | `divider` (band) |
| Content | Info cards: Custom fields / Business / Customer / Payments | `OD/styles.tsx:47-67,159`, `OD/OrderContentComponent.tsx:156,191,301,660` | 3 styled components with the same look: bg `gray100`, radius 10, padding-horizontal 15, padding-vertical 20, margin-bottom 20, column, align flex-start | grouping card | one `card` |
| Content | Collapsible card header (×3) | `OD/OrderContentComponent.tsx:157-166,192-205,302-311`, style `:108-113` | `TouchableOpacity` row space-between width 100%; `OText` 16 / 700 (marginBottom 5 on two of the three); `AntDesign up`/`down` size 18 color `gray200`. All three start **collapsed** (`:63`) | expand / collapse the card | accordion header: text preset (card title) + `icon` |
| Content | Custom-field row | `OD/OrderContentComponent.tsx:168-186` | row marginBottom 5; key `OText` 14 / 700 width 50%; value 14 / 700 width 45% right-aligned; list marginTop 10 | metafields | text presets (label / value) |
| Content | Business name / Customer name | `OD/OrderContentComponent.tsx:208-216,320-331` | `OText` 14 / 700, marginTop 10, mBottom 5 / 4; customer name 2 lines maxWidth 90% | contact name | text preset (card subtitle) |
| Content | Contact links: email, cellphone, phone, address, address notes | `OD/OrderContentComponent.tsx:219-266,275-287,347-394`, styles `:86-99` | `OLink` (`Pressable`, no press feedback) inside row `linkWithIcons` (marginBottom 5, flex 1); text 14, color `'#365CC7'` (literal), weight 400; 1–3 lines (20 when expanded). Opens `mailto:` / `tel:` / `maps:` (iOS) or `geo:` (Android) | call, email or open the maps app. **There are no call/chat/map icon buttons per contact**: the only actions are these text links and the top-bar icons | link text preset; link color role |
| Content | "Read more" / "Show less" (×2) | `OD/OrderContentComponent.tsx:288-294,395-401` | `TouchableOpacity` + `OText` 12 color `statusOrderBlue` (#04449c) | expand long address / notes | link text preset (small) |
| Content | Distance line | `OD/OrderContentComponent.tsx:268-272` | `OText` 14 / 700 | business–customer distance | text preset |
| Content | Customer rating | `OD/OrderContentComponent.tsx:334-341` | `View` with `top: 30, right: 40` offsets; `MaterialCommunityIcons star` 24 color `arrowColor` (#B1BCCC), `bottom: 3`; `OText` 14 mLeft 5 | review already given | `icon` + text preset; position by offsets |
| Content | Plain data lines (internal number, address notes, zipcode, on behalf of, delivery option) | `OD/OrderContentComponent.tsx:405-442` | `OText` 14 / 400 default color, mBottom 4; address notes inside a horizontal `ScrollView` (`:412-420`) | customer data | text preset (body) |
| Products | Section title "Order Details" | `OD/OrderContentComponent.tsx:448-450` | `OText` 20 / 700, marginBottom 10 | section title | text preset (section title) |
| Products | Order comment | `OD/OrderContentComponent.tsx:452-467` | label `OText` 14; value 14 (project `delosi`: color `primary`, weight bold) | order comment | text presets |
| Products | Product row (accordion) | `PIA/styles.tsx:3-10`, `PIA/index.tsx:125-131` | section bg `#fff` (literal), margin-bottom 10, padding-top 10, padding-bottom 20, border-bottom 1 `#d9d9d9` (literal); header `styled.TouchableOpacity` `activeOpacity={1}`; `isValid === false` → bg `rgba(0, 0, 0, 0.1)` (`PIA/styles.tsx:17-21`) | product line, tap toggles options | list row + `divider` (item) |
| Products | Quantity + name | `PIA/index.tsx:139-151` | fixed `width: 200`; `OText` 16 / 700 color `primary`, marginLeft 5, 2 lines, `adjustsFontSizeToFit` | product name | text preset (item title); color role (today brand color on white) |
| Products | Price | `PIA/index.tsx:162-164` | `OText` 16 / 400 color `textGray`, 1 line, `adjustsFontSizeToFit` | line total | text preset (price) |
| Products | Chevron | `PIA/index.tsx:165-173` | `MaterialCommunityIcons chevron-up`/`chevron-down` size 16, color `theme.colors.textNormal` (**undefined key**), `top: 3`; a 16 pt spacer when nothing to expand | accordion indicator | `icon` (sm); color role |
| Products | Options block | `PIA/styles.tsx:44-63`, `PIA/index.tsx:228-325` | `display: none` when collapsed; list margin-top 10, margin-left 18; suboption margin-left 3 + text mLeft 10; all texts `OText` 14 italic color `unselectText` (#909BA9); "Comment" label 14 / 600 italic; comment 2 lines (15 expanded) paddingLeft 10; "Read more" 12 `statusOrderBlue` | ingredients removed ("No X"), options, suboptions (`qty x name (position) +price`), product comment | text preset (secondary, italic today) |
| Bill | Bill rows (13 row kinds) | `OD/OrderContentComponent.tsx:479-639`; `Table` `OD/styles.tsx:73-78`; `OrderBill` `:80-87`; `OSRow` `:132-137` | container padding-vertical 20; row space-between; both texts `OText` 16 / 400, mBottom 10; long labels wrapped in a 70% wide `OSRow` | subtotal, discount, offers, subtotal with discount, tax, service fee, taxes, fees, delivery fee, driver tip | text presets (bill label / bill amount); row spacing token |
| Bill | Total | `OD/styles.tsx:107-112`, `OD/OrderContentComponent.tsx:641-657` | border-top 5 `gray100`, padding-top 20, margin-top 20, paddingBottom 10; label 16 / 700; amount 16 / 700 color `primary` | order total | text preset (total) + `divider` (band) |
| Bill | Payments card | `OD/OrderContentComponent.tsx:659-704` | card as above; title `OText` 14 / 700 color `theme.colors.textNormal` (**undefined** → primitive default `#344050`); rows space-between marginBottom 10, texts 14 / 400 | payment events | `card` + text presets |
| Extra | Spot number | `OD/styles.tsx:97-105`, `OD/OrderContentComponent.tsx:707-718` | border-top 1 `gray100`, padding-vertical 20 (padding-bottom 50 when no vehicle); row of two `OText` 14, marginBottom 5 | curbside / table number | `divider` (item) + text presets |
| Extra | Vehicle | `OD/styles.tsx:89-95`, `OD/OrderContentComponent.tsx:720-762` | border-top 1 `gray100`, padding-vertical 20, padding-bottom 50; title `OText` 16 / 600 color `textGray`; 4 rows of two `OText` 14 | customer vehicle (curbside) | section title preset + rows |
| Extra | "Review customer" button | `OD/OrderContentComponent.tsx:763-771`, style `:100-107` | `OButton` bg `primary`, borderWidth 0, radius 8, width 100%, marginTop 4, marginBottom 10; text `white` (primitive: 16 / 700, family `theme.fonts.special.name`, height 50) | open the review modal | `button` (primary) |
| Inline actions | Wrapper | `OD/OrderDetailsInformation.tsx:54` | paddingHorizontal 20; marginBottom `100 + floatingInset` when there is an inline or floating button, else 0 | content padding + reserve for the floating bar | space tokens; reserve should come from the bar's measured height |
| Inline actions | "Arrived to business" / "Arrived to customer" | `OD/OrderDetailsInformation.tsx:61-93`, style `:38-43` | `OButton` bg `btnBGWhite` (#E9F2FE), borderWidth 0, radius 10, marginBottom 30; text color `primary`; `imgLeftStyle` tint `backArrow` with no image (no effect) | change status to 3 / 26 | `button` (secondary / soft appearance) |
| Inline actions | "Order not ready" | `OD/OrderDetailsInformation.tsx:94-106` | same style, `bgColor` `theme.colors.red`, text `white` | open "not ready" modal | `button` (danger) |
| Floating bar | Pickup / Delivery / Accept-Reject bars | `OD/Delivery.tsx:939-1029` | `FloatingButton` with `firstColorCustom={theme.colors.red}`, `secondColorCustom={theme.colors.green}`, `widthButton='100%'`, `isPadding` (20). From the primitive (`FB/index.tsx:40-58`, `FB/styles.tsx`): container absolute bottom 0, bg `#fff`, padding-vertical 10, z-index 1000; buttons height 50, radius 10, stacked `column-reverse` with marginTop 10; label 18, `fontWeight: 'normal'`, white | main status actions | action bar with two `button`s (success / danger) |
| Requirements modal | Overlay + card | `OD/Delivery.tsx:1032-1040`, styles `:733-751` | overlay `rgba(0, 0, 0, 0.5)`, padding 20, centered; card bg `'#FFF'`, radius 10, padding 20, width 100%, maxWidth 400, maxHeight 80%; title `OText` 18 / 600 centered, marginBottom 20 | location requirements dialog | `modal` (dialog) |
| Requirements modal | Close button | `OD/Delivery.tsx:1046-1053`, style `:752-756` | `OButton` bg/border `textGray` (#344050), text `'#FFF'` 16, radius 7, height 45, marginTop 20 | close | `button` (neutral) |
| Error | `NotFoundSource` | `OD/Delivery.tsx:1115-1125` | defaults of the primitive: image 260×220, text 18 `textSecondary`, button height 50 radius 7.6 `primary` | order not found / network error | `empty_state` |
| Alerts | Warning alert | `OD/Delivery.tsx:1126-1134` (`SH/OAlertOriginal.tsx:39-42`) | system `Alert.alert` with Accept / Cancel | "not allowed to reject", "removed from the order" | system alert (not themable) or `alert`/`modal` — decision |
| Toasts | Copy done / geolocation blocked / order error | `OD/Delivery.tsx:531-535,359-365,659-663` | `showToast` Info 1000 ms; Error (default); Error 5000 ms | feedback | `toast` |

#### Review customer modal (reachable)

| Screen / component | Element | file:line | Values today | Function | Proposal |
|---|---|---|---|---|---|
| ReviewCustomer | Root | `RC/index.tsx:179-188` | `KeyboardAvoidingView` flex 1, `marginTop: top` inset, `marginBottom: bottom` inset, space-between | modal body | `modal` (full screen) / `sheet`; safe area from the modal primitive |
| ReviewCustomer | Navbar | `RC/index.tsx:189-191` | wrapper paddingHorizontal 20, paddingTop iOS 0 / Android 15; `ONavbar` (back icon 24×24 at `top:-20,left:-20`, title 24 / 700 `textGray`, `SH/ONavbar.tsx:15-39`) | title + back | `header` |
| ReviewCustomer | Scroll | `RC/styles.tsx:3-6`, `RC/index.tsx:193-197` | bg `white`, margin-bottom 30; content paddingBottom 20, paddingHorizontal 20 | content | surface color role; space tokens |
| ReviewCustomer | "Rate the experience" + question | `RC/index.tsx:198-207`, `RC/styles.tsx:14-19` | row space-between margin-top 5; text column maxWidth 75%; `OText` 16 / 700; `OText` 14 | prompt | text presets (section title + body) |
| ReviewCustomer | Customer photo frame | `RC/index.tsx:208-222`, style `:59-67` | bg `white`, radius 8, overflow hidden, shadow `theme.colors.black` offset 1/4 radius 3 opacity 0.1 elevation 3, padding 5 when no photo; `OIcon` 50×50, radius 7.6, `contain` | avatar | avatar frame (`card` shadow level); image box |
| ReviewCustomer | Rating bar | `RC/index.tsx:224-231`, style `:68-73`; `RC/styles.tsx:20-23` | `LinearGradient` height 8, radius 5, marginTop 5, colors [`primary`, `tabBar`] with hard stop at the selected percent, mirrored in RTL; container margin-top 13, margin-bottom 25 | 1–5 qualification as a progress bar | progress/rating component; color roles (fill, track); radius |
| ReviewCustomer | Rating labels (×5) | `RC/index.tsx:232-261`, styles `:74-88` | absolute `top: -18` at left 0/25/50/75% and right 0; tick `View` 8×1 bg `dusk` (or transparent), marginBottom 10; `OText` 12, selected `darkText` (#414954), others `lightGray` (#D2D2D2); `TouchableOpacity` default feedback | choose qualification | text preset (caption) with selected state |
| ReviewCustomer | Band dividers (×2) | `RC/index.tsx:263,287` | empty `View` `borderWidth: 2.5` color `tabBar`, marginTop 20 | section separators | `divider` (band) |
| ReviewCustomer | Quick-comment title | `RC/index.tsx:264-269` | `OText` 14 / 700, marginTop 30 | section title | text preset |
| ReviewCustomer | Quick-comment chips | `RC/index.tsx:270-286`, `RC/styles.tsx:30-33` | wrap row; `OButton` height 40, paddingLeft/Right 5, marginHorizontal 3, marginVertical 10, radius 15, border 2 (primitive); selected: bg `secondary` (#FFF4DA), border `primary`, text `primary`; unselected: bg `white`, border `tabBar`, text `textGray`; text 12 | multi-select tags | `chip` (selected / unselected) |
| ReviewCustomer | "Do you want to add something?" | `RC/index.tsx:288-294` | `OText` 16 / 700, marginTop 30 | section title | text preset |
| ReviewCustomer | Comment textarea | `RC/index.tsx:295-301`, style `:101-108` | `OInput multiline`, border `lightGray`, radius 8, height 100, marginTop 10, marginBottom 40, alignItems flex-start (primitive: border 1.5, padding-horizontal 16, font 15) | free comment | `input` (textarea) + `field` |
| ReviewCustomer | Send Review | `RC/index.tsx:304-311`, `RC/styles.tsx:7-13` | wrapper margin-horizontal 20, margin-bottom 40 (declared twice: 10 then 40); `FloatingButton` `color={primary}`, width 100%; label "Loading" while sending (no spinner) | submit | `button` (primary) with loading state |
| ReviewCustomer | Error alert | `RC/index.tsx:312-318` | system `Alert.alert` | API error | system alert / `alert` |

#### Unreachable components (kept short; see "Dead code")

| Screen / component | Element | file:line | Values today | Function | Proposal |
|---|---|---|---|---|---|
| OrderSummary | Whole printable summary | `OS/index.tsx:448-856`, `OS/styles.tsx:3-61` | scroll bg `white`, margin-bottom 60, padding-horizontal 20; sections separated by border-bottom 5 / 10 `inputChat`; total border-top 1 `borderTops`; titles `OText` 16 / 600 `textGray`; body 14 `textGray` / 14 default; header 15 / 600; back `OIconButton` icon 20×20; `FloatingButton` "Print" `color={green}`; HTML for print with literal `font-size: 25–27px` (`:143-378`) | print / PDF of an order | delete, or (if kept) `header` + `card`/`divider` + text presets + `button` |
| StoresList | Stores screen | `SL/index.tsx:127-221` | title 26 / 600 `textGray`; `SearchBar` width 210; info line 12 + link 12 `skyBlue`; `OIcon` 12×12 `general.information` (**undefined key**); rn-placeholder skeleton 74 high, radius 7.6, width 22% / 11% by orientation | list of businesses with on/off switch | delete, or `header` + `search_bar` + list rows + `skeleton` + `empty_state` |
| BusinessController | Store row | `BC/index.tsx:94-152`, `BC/styles.tsx:3-19` | row min-height 64, margin-bottom 30; logo `FastImage` 70×70 radius 7.6 in a frame radius 18 padding 2 shadow `#000` 0/1.5 opacity 0.21 radius 3 elevation 7; name 18 / 600 `textGray`; address 14 `unselectText`; `ToggleSwitch` small on `primary` off `offColor`; `ActivityIndicator` small `primary` | enable / disable a store | delete, or `card` row + switch + `spinner` |
| BusinessProductList | Categories + products overlay | `BPL/index.tsx:91-187`, `BPL/ProductList.tsx:97-194`, `BPL/AccordionDropdown.tsx:21-64`, `BPL/IterateCategories.tsx:19-108`, `BPL/styles.tsx:3-10` | title 20 / 600 `textGray`; back `TouchableOpacity` 32×32 + `OIcon` 26; `SearchBar` width 180; rows padding-vertical 10 / 15, border-bottom 1 `borderTops`; product thumb 35×35 radius 7.6; name 12; `AntDesign caretdown/caretright` 14 `textNormal` (undefined); full-window absolute overlay sized with `Dimensions` | enable / disable categories and products | delete, or list rows + accordion + switch |
| OrderHeaderComponent `isCustomView` branch | Secondary header with date + actions | `OD/OrderHeaderComponent.tsx:290-351` | `OText` 12; copy and printer (`SimpleLineIcons printer` 20) icons; map/chat `OIconButton` 20×20 `gray200` | tablet split view | delete with `OrdersListManager` (other area) or keep as `header` |

---

### Duplicates (same function, different implementation)

| Function | Implementations (file:line) | Visible differences |
|---|---|---|
| Status → color map | `OD/Delivery.tsx:139-170` (passed to `DriverMap` `:1081`), `OD/OrderHeaderComponent.tsx:101-132` | identical 27-entry objects built on every render; three colors only (`primary`, `statusOrderGreen`, `statusOrderRed`) |
| Top-bar actions (copy · map · chat) | `OD/Delivery.tsx:828-869`, `OD/OrderHeaderComponent.tsx:300-348` (dead branch) | second one has no unread dot, adds a printer icon, compares the translated status text instead of the slug |
| Back button | `OD/Delivery.tsx:821-827` (`OIconButton`, icon 24, box 24×24, marginTop 10); `RC` through `ONavbar` (`SH/ONavbar.tsx:43-49`, icon 24, absolute −20/−20); `OS/index.tsx:453-459` (icon 20, maxWidth 40); `BPL/index.tsx:95-100` and `BPL/ProductList.tsx:101-106` (`TouchableOpacity` 32×32 + `OIcon` 26 tinted `textGray`) | icon 20 / 24 / 26; touch box 24 / 32 / 40; tinted or not; three primitives |
| Card container | `OrderBusiness` `OD/styles.tsx:47-56`, `OrderCustomer` `:58-67`, `OrderPayments` `:159`, `Section` `:154-157` | first three identical; `Section` same bg and radius but its padding is inline (`OD/OrderHeaderComponent.tsx:179`) and it has no margins |
| Divider / separator | 2 pt rule `borderWidth:1` `tabBar` (`OD/OrderHeaderComponent.tsx:212,220`); 5 pt band `borderWidth:2.5` `gray100` (`OD/OrderContentComponent.tsx:154`); 5 pt band `borderWidth:2.5` `tabBar` (`RC/index.tsx:263,287`); border-top 5 `gray100` (`OD/styles.tsx:108`); border-top 1 `gray100` (`OD/styles.tsx:90,98`); border-bottom 1 `#d9d9d9` (`PIA/styles.tsx:8-9`); dead: border-bottom 5 / 10 `inputChat` (`OS/styles.tsx:14-30`), 1 `borderTops` (`OS/styles.tsx:45`, `BPL/styles.tsx:7-8`, `BPL/index.tsx:129-130`) | 1 / 2 / 5 / 10 pt; four grays (`tabBar` #e9ecef, `gray100` #F8F9FA, `#d9d9d9`, `inputChat` #F8F9FA); some are borders of a box, some are empty views whose *border* is the line |
| Collapsible header | 3 × card header with `AntDesign up/down` 18 (`OD/OrderContentComponent.tsx:157-166,192-205,302-311`); product row with `MaterialCommunityIcons chevron-up/down` 16 (`PIA/index.tsx:165-173`); dead: `AntDesign caretdown/caretright` 14 (`BPL/AccordionDropdown.tsx:25-31`) | three glyphs from two icon sets, sizes 14 / 16 / 18, colors `gray200` / undefined `textNormal`; cards start collapsed, products start expanded |
| "Read more / Show less" | `OD/OrderContentComponent.tsx:288-294`, `:395-401`, `PIA/index.tsx:317-321` | same look (12, `statusOrderBlue`); the measuring rule (`WIDTH_SCREEN * .76`) is copied three times (`OD/OrderContentComponent.tsx:138-147`, `PIA/index.tsx:120-122`) |
| Link text | contact links `'#365CC7'` 14 (`OD/OrderContentComponent.tsx:96-99`); read-more `statusOrderBlue` #04449c 12; dead: `skyBlue` #CFE6FF 12 (`SL/index.tsx:163`) | three blues for "tappable text" |
| Section / card title | 16 / 700 (`OD/OrderContentComponent.tsx:158,193,303`, `RC/index.tsx:200,288`); 20 / 700 (`OD/OrderContentComponent.tsx:448`); 18 / 700 (`:152`); 16 / 600 `textGray` (`:722-727`); 14 / 700 (`:661`, `RC/index.tsx:264`); 18 / 600 (`OD/Delivery.tsx:1040`); dead: 16 / 600 `textGray` (`OS/index.tsx:498-504`), 20 / 600 (`BPL/index.tsx:66-71`), 26 / 600 (`SL/index.tsx:111-116`), 18 / 600 (`BC/index.tsx:83-87`) | 6 looks for a section title in the reachable screens |
| Bill / totals rows | `OD/OrderContentComponent.tsx:479-657` (16 / 400, mBottom 10, total border-top 5); dead `OS/index.tsx:688-793` (14, marginBottom 5, total border-top 1, weight 600) | size, spacing and divider differ; the dead one also computes fewer rows |
| Primary / action button | `FloatingButton` (50 high, radius 10, label 18 normal) `OD/Delivery.tsx:939-1029`, `RC/index.tsx:305-310`; inline `OButton` radius 10 (`OD/OrderDetailsInformation.tsx:38-43`); `OButton` radius 8 (`OD/OrderContentComponent.tsx:100-107`); `OButton` radius 7 height 45 (`OD/Delivery.tsx:752-756`, `OD/ValidationIssuesList.tsx:70-75`); `NotFoundSource` button radius 7.6 height 50 | radius 7 / 7.6 / 8 / 10; height 45 / 50; label 14 / 16 / 18; label family `fonts.special` (`OButton`) vs `fonts.primary` (`FloatingButton`) |
| Danger / success colors | `theme.colors.red` (#E63757) for buttons, dot, issue icon; `statusOrderRed` (#E63757) for status text; `'#D81212'` banner border (same hex as `cancelColor`); `theme.colors.green` (#00D27A) buttons vs `statusOrderGreen` (#0CAD63) status text | two reds (one literal) and two greens for the same meanings |
| Skeleton | rn-placeholder in `OD/Delivery.tsx:801-812`; dead `BPL/index.tsx:142-160`, `BPL/ProductList.tsx:171-189`, `SL/index.tsx:195-216`; shared `SH/SkeletonBone.tsx`, `SH/OrderListSkeleton.tsx` exist (other agent) | this area never uses the shared skeleton |
| Customer full name builder | `RC/index.tsx:167`, `OS/index.tsx:118-119`, `OD/usePrinterCommands.tsx:55`, inline `OD/OrderContentComponent.tsx:327-330`, `OD/Delivery.tsx:411-414` | content duplication (not visual) |
| Wallet / paymethod names, order-type names | `OD/OrderHeaderComponent.tsx:134-164`, `OD/OrderContentComponent.tsx:76-83`, `OS/index.tsx:121-141,380-386`, `OD/usePrinterCommands.tsx:18-51`, `OD/Delivery.tsx:436-453` | different translation keys for the same wallet (`CASH_WALLET` vs `PAY_WITH_CASH_WALLET`); header maps every type other than 1–4 to "Driver thru" (`OD/OrderHeaderComponent.tsx:143-151`) while the clipboard text knows 7 and 8 |

---

### Blocks and pieces

| Page | Block or piece | Hideable? Movable? | Why |
|---|---|---|---|
| OrderDetails | Top bar (back) | Not hideable; fixed | only way back besides the system gesture |
| OrderDetails | Copy icon | Hideable | independent `TouchableOpacity`; already conditional (`OD/Delivery.tsx:830-842`) |
| OrderDetails | Map icon | Hideable | independent; opens a modal |
| OrderDetails | Chat icon + unread dot | Hideable | independent; navigates to `OrderMessage` |
| OrderDetails | Pending-sync row | State, not a theme piece | driven by `order.unsync` |
| OrderDetails | Validation banners | State, not a theme piece | driven by location validation configs |
| OrderDetails | Header card (order no. + status) | Not hideable; movable only within the scroll | it is the only place the order number and status are shown; first child of the scroll |
| OrderDetails | Status text inside the title | Hideable (already hidden for logistic) | nested `OText` (`OD/OrderHeaderComponent.tsx:183-193`) |
| OrderDetails | Delivery-position pill | Hideable | own conditional `View` (`:196-211`) |
| OrderDetails | Order type / Payment method columns | Hideable together (rule + row are siblings) | no dependency |
| OrderDetails | Secondary lines: spot, reservation, external ID, created at, placed to | Each hideable; order fixed by JSX | independent conditional `View`s (`:233-289`); external ID also depends on config `change_order_id` |
| OrderDetails | Custom-fields card | Hideable, movable | independent sibling (`OD/OrderContentComponent.tsx:155-189`) |
| OrderDetails | Business card | Hideable, movable; "start expanded" is a candidate option | independent sibling (`:191-299`); state `showFields` local |
| OrderDetails | Customer card | Hideable, movable; same option | independent sibling (`:301-445`) |
| OrderDetails | Pieces inside the cards: email, phones, address, distance, notes, rating, zipcode, internal number, on-behalf-of, delivery option | Each hideable | independent conditionals; contact data is privacy-relevant |
| OrderDetails | Products list + order comment | Not hideable (core); movable | `OrderProducts` sibling (`:447-477`) |
| OrderDetails | Product options / ingredients / comment | Hideable individually; "start expanded" option | conditionals in `PIA/index.tsx:231-323` |
| OrderDetails | Bill rows | Hideable as a block (a driver may not need prices) — product decision | `OrderBill` sibling (`:479-705`); total is inside it |
| OrderDetails | Payments card | Hideable | conditional inside `OrderBill` (`:659-704`) |
| OrderDetails | Spot / Vehicle blocks | Hideable | independent siblings (`:707-762`) |
| OrderDetails | "Review customer" button | Hideable | independent (`:763-771`); modal is its only consumer here |
| OrderDetails | Inline status buttons (arrived to business / customer, not ready) | Not theme-hideable | status flow; "not ready" already has a server config |
| OrderDetails | Floating action bar | Not hideable, not movable | status flow; absolute at the bottom; reject/failed visibility already has server configs — a theme visibility key here would duplicate them |
| ReviewCustomer | Customer photo | Hideable | independent `View` |
| ReviewCustomer | Quick-comment chips block | Hideable | sibling between two dividers (the dividers must go with it) |
| ReviewCustomer | Free comment field | Hideable | sibling |
| ReviewCustomer | Rating bar, Send button | Not hideable | the form's purpose |

---

### Images

| Key or source | file:line | Painted box | Fit | Fallback | alt |
|---|---|---|---|---|---|
| `theme.images.general.arrow_left` (`src/assets/icons/arrow_left.png`, 24×24 px, single density, 309 B) | `OD/Delivery.tsx:822`; dead `OS/index.tsx:454`, `BPL/index.tsx:99`, `BPL/ProductList.tsx:105` | 24×24 untinted (Delivery); 20×20 (OS); 26×26 tinted `textGray` (BPL) | `OIconButton` enabled branch sets no `resizeMode` (RN default `cover`); `OIcon` `contain` | none | none (`accessibilityLabel` absent) |
| `theme.images.general.map` (`map.png`, 65×64 px, 675 B) | `OD/Delivery.tsx:844`; dead `OD/OrderHeaderComponent.tsx:326` | 20×20, tint `gray200` | default `cover` | none | none |
| `theme.images.general.messages` (`messages.png`, 65×65 px, 1.7 KB) | `OD/Delivery.tsx:857`; dead `OD/OrderHeaderComponent.tsx:337` | 20×20, tint `gray200` | default `cover` | none | none |
| `theme.images.dummies.businessLogo` (`dummies/store.png`, 512×512 px, 11 KB) | `OD/Delivery.tsx:587` (fallback of the business marker icon passed to `DriverMap`); dead `BC/index.tsx:110` (70×70 cover), `BPL/ProductList.tsx:151` (35×35) | painted by `DriverMap` (other area) | — | it *is* the fallback | none |
| Fixed remote URL `https://res.cloudinary.com/demo/image/upload/c_thumb,g_face,r_max/d_avatar.png/non_existing_id.png` | `OD/Delivery.tsx:595` | customer marker icon in `DriverMap` | — | same URL already exists as `theme.images.dummies.customerPhoto` (`src/DeliveryApp.tsx:94-95`) | none |
| API: `order.business.logo`, `order.customer.photo` | `OD/Delivery.tsx:587,594` | map markers (other area) | — | above | none |
| API: `order.customer.photo` via `optimizeImage(…, 'h_100,c_limit')` | `RC/index.tsx:215-221` | 50×50, radius 7.6, in a white frame radius 8 | `contain` (`SH/OIcon.tsx:55`) | `theme.images.general.user` → **key not defined** in `src/DeliveryApp.tsx:34-104`, so `OIcon` falls through to `theme.images.logos.logo` (`SH/OIcon.tsx:38-44`): the app logo is painted as the avatar | none |
| `theme.images.general.notFound` (`not-found.png`, 279×279 px, 28 KB) | default of `NotFoundSource` used at `OD/Delivery.tsx:1116`; dead explicit reads `BPL/index.tsx:122`, `BPL/ProductList.tsx:131`, `SL/index.tsx:175` | 260×220 | `contain` | none | none |
| `theme.images.general.information` | dead `SL/index.tsx:153` | 12×12 tint `skyBlue` | `contain` | **key not defined** → app logo | none |
| API: `product.images`, `business.logo` | dead `BPL/ProductList.tsx:150`, `BC/index.tsx:106-110` | 35×35; 70×70 (`FastImage` cover) | — | `dummies.businessLogo` | none |

No product photo is painted in the reachable order details (`PIA` paints text only; `ProductImage` styled component is unused).

---

### Off the scale or without a token

| Value | Where | Why it does not fit |
|---|---|---|
| `'#FFF3CD'`, `'#856404'`, `'#D81212'` | `OD/Delivery.tsx:758,760`, `OD/ValidationIssuesList.tsx:67` | warning surface / warning text / danger accent as literals; no warning role is read from the theme (`warning100` #FFF9E2 exists but is not used here) |
| `'#365CC7'` | `OD/OrderContentComponent.tsx:97` | link color literal; matches no theme color (`statusOrderBlue` is #04449c, `primaryOG` #2C7BE5) |
| `'#444'` | `OD/Delivery.tsx:882` | icon color literal |
| `'#FFF'` / `'#fff'` / `#fff` | `OD/Delivery.tsx:741,1051`, `OD/ValidationIssuesList.tsx:45`, `OD/OrderHeaderComponent.tsx:206`, `PIA/styles.tsx:4` | on-color text and surface as literals while `theme.colors.white` exists |
| `#d9d9d9` | `PIA/styles.tsx:9` | divider literal (equals `borderTops`) |
| `rgba(0, 0, 0, 0.5)`, `rgba(0, 0, 0, 0.2)`, `rgba(0, 0, 0, 0.1)` | `OD/Delivery.tsx:735`, `OD/styles.tsx:31`, `PIA/styles.tsx:20` | overlay, group border, invalid-row tint as literals (`OModal` overlay uses 0.4: `SH/OModal.tsx:69`) |
| shadow `#000` 0/2, opacity 0.15, radius 6, elevation 5 | `OD/Delivery.tsx:767-771` | one-off shadow; RC photo uses 1/4, 0.1, 3, elevation 3 (`RC/index.tsx:59-67`) |
| `theme.colors.textNormal` | `OD/OrderContentComponent.tsx:661`, `PIA/index.tsx:170` (dead: `OS/index.tsx:797`, `BPL/AccordionDropdown.tsx:29`) | key read but **not defined** in `src/theme.json`: the Payments title falls to the `OText` default `#344050`; the chevron gets `color={undefined}` |
| `theme.ecolors.red` | `PIA/index.tsx:205` | typo: `theme.ecolors` does not exist; would throw if the cart branch ever rendered (unreachable today) |
| `theme.defaultLanguages.DISCOUNT` | `OD/OrderContentComponent.tsx:490,494` | theme key that does not exist (text, not style); the literal `'Discount'` is what is used |
| `theme.images.general.user`, `theme.images.general.information` | `RC/index.tsx:217`, `SL/index.tsx:153` | image keys read but not defined |
| border `2.5` used as a 5 pt band | `OD/OrderContentComponent.tsx:154`, `RC/index.tsx:263,287` | not on the border scale (1 / 2); it is a divider drawn with the border of an empty view |
| border 5 (total), border 4 (banner accent) | `OD/styles.tsx:108`, `OD/Delivery.tsx:759` | off the border scale |
| radius 7 / 7.6 / 8 / 10 for the same kind of box | buttons `OD/Delivery.tsx:754`, `OD/ValidationIssuesList.tsx:72`, `OD/OrderContentComponent.tsx:103`, `OD/OrderDetailsInformation.tsx:41`; photo `RC/index.tsx:64,220` | four near values; pill radius 12 (`OD/OrderHeaderComponent.tsx:201`) and chip 15 (`RC/index.tsx:281`), bar 5 (`RC/index.tsx:71`) |
| button height 45 vs 50, chip 40 | `OD/Delivery.tsx:755`, `OD/ValidationIssuesList.tsx:73`, `RC/index.tsx:281` | control heights not from one scale |
| font size 13 | `OD/OrderHeaderComponent.tsx:206`, `OD/ValidationIssuesList.tsx:66` | between caption 12 and body 14 |
| `lineHeight: 18` absolute on 13 | `OD/ValidationIssuesList.tsx:68` | the only explicit line height of the area; absolute, not a ratio |
| `fontStyle: 'italic'` (×8) | `PIA/index.tsx:239,250,265,276,304,309` | italic with family `Helvetica` / weight 600: needs an italic face; on Android the family is resolved by file name |
| weights as number, string and `'bold'` | `weight={700}` `OD/OrderContentComponent.tsx:661`; `weight={600}` `PIA/index.tsx:301`; `weight: 'bold'` `OD/OrderContentComponent.tsx:460`; `fontWeight: '700'` in a style next to `weight='700'` `:93-95,651` | one family + `fontWeight` (faux bold on Android) and mixed notations |
| `width: 200` for the product name | `PIA/index.tsx:139` | fixed width regardless of the window; price column takes the rest |
| `WIDTH_SCREEN * .76` | `OD/OrderContentComponent.tsx:140,144`, `PIA/index.tsx:121` | magic ratio of the window to decide "read more" |
| `max-height: 85%` + `marginBottom: 100 + inset` | `OD/styles.tsx:5`, `OD/Delivery.tsx:917-921`, `OD/OrderDetailsInformation.tsx:54` | two hand-made reserves for the floating bar with **different conditions**: the 85% rule covers statuses 0 / 7 / 14 / 4 / 20 / 21 (20 and 21 have no bar), the 100 pt margin covers every status with a bar; the bar itself, with two buttons, is 130 pt high on Android (10 + 50 + 10 + 50 + 10) and 120 + max(5, bottom inset) on iOS (`FB/styles.tsx:9,15-19`, `FB/index.tsx:37-38,78`) |
| `top: 30, right: 40`, `bottom: 3`, `top: 3` | `OD/OrderContentComponent.tsx:335-336`, `PIA/index.tsx:170` | position by offsets instead of layout |
| `padding-bottom: 50` / `margin-bottom: 50` | `OD/styles.tsx:37,93,102` | bottom reserve spread in three styled components |
| `width: '50%'` + `'45%'`, `OSRow width: 70%`, `maxWidth: '90%'`, `'75%'` | `OD/OrderContentComponent.tsx:178,181,325`, `OD/styles.tsx:135`, `RC/index.tsx:199` | layout shares, stay layout (listed so they are not tokenized) |
| Disabled look of the inline buttons | `OD/OrderDetailsInformation.tsx:62-66,95-105` with `SH/OButton.tsx:85-95` | when `isDisabled`, `OButton` ignores `bgColor` and paints `style` + `textStyle`: the two "Arrived" buttons look the same as enabled; "Order not ready" becomes white text on `btnBGWhite` (#E9F2FE) |
| Disabled look of the floating bar | `OD/Delivery.tsx:941,971,1002` with `FB/index.tsx:89,122` | `disabled` only blocks the press; no visual change |
| Pending-sync row without horizontal padding | `OD/Delivery.tsx:873-879` | the page has `paddingHorizontal={0}` (`P:58`) and the row adds none |
| Header card edge to edge | `OD/OrderHeaderComponent.tsx:178-179` | rounded card (radius 10) with no horizontal margin while everything below has 20 |

---

### Text roles

Defaults that every `OText` gets from the primitive (`SH/OText.tsx:5-29`): color `'#344050'` literal, family `theme.fonts.primary.name` (`Helvetica`), size 14, weight 400, no line height. `OButton` label: 16 / 700, family `theme.fonts.special.name` (`Inter_18pt-Black`), color `white` (`SH/OButton.tsx:33-41`).

| # | Look (size / weight / lineHeight / color / family) | Role | Where (reachable) | Count |
|---|---|---|---|---|
| T1 | 24 / 700 / — / default (+ status span `primary` \| `statusOrderGreen` \| `statusOrderRed`) / primary, centered | screen title (order no. + status) | `OD/OrderHeaderComponent.tsx:180-191` | 2 |
| T2 | 24 / 700 / — / `textGray` / `"${fonts.special.name}_18pt-Black"` | modal title (`ONavbar`) | `RC/index.tsx:190` (`SH/ONavbar.tsx:29-34`) | 1 |
| T3 | 20 / 700 / — / default | section title | `OD/OrderContentComponent.tsx:448` | 1 |
| T4 | 18 / 700 / — / default | order-group card title | `OD/OrderContentComponent.tsx:152` | 1 |
| T5 | 18 / 600 / — / default, centered | dialog title | `OD/Delivery.tsx:1040` | 1 |
| T6 | 16 / 700 / — / default | card title / form section title | `OD/OrderContentComponent.tsx:158,193-199,303`, `RC/index.tsx:200-205,288-294` | 5 |
| T7 | 16 / 600 / — / `textGray` | section title (Vehicle) | `OD/OrderContentComponent.tsx:722-727` | 1 |
| T8 | 16 / 700 / — / `primary` | product name | `PIA/index.tsx:140-150` | 1 |
| T9 | 16 / 400 / — / `textGray` | product price | `PIA/index.tsx:162` | 1 |
| T10 | 16 / 400 / — / default | bill label and amount | `OD/OrderContentComponent.tsx:481-637` | 36 |
| T11 | 16 / 700 / — / default and `primary` | total label / total amount | `OD/OrderContentComponent.tsx:643-655` | 2 |
| T12 | 14 / 700 / — / default | label, name, emphasized line (order type label, business / customer name, metafield key and value, distance, quick-comment title, Payments title) | `OD/OrderHeaderComponent.tsx:215,222`, `OD/OrderContentComponent.tsx:178,181,208,269,320,661`, `RC/index.tsx:264` | 10 |
| T13 | 14 / 400 / — / default | body / value | `OD/OrderHeaderComponent.tsx:216,226,228`, `OD/OrderContentComponent.tsx:337,406,417,424,430,437,454,457,685,695,710-758`, `RC/index.tsx:206` | ~25 |
| T14 | 14 / 400 / — / `textGray` | notice text (pending sync) | `OD/Delivery.tsx:885-891` | 1 |
| T15 | 14 / 400 / — / `'#365CC7'` | link (email, phone, address) | `OD/OrderContentComponent.tsx:221-393` (style `:96-99`) | 9 |
| T16 | 14 / 400 italic / — / `unselectText` | product option, suboption, ingredient, comment | `PIA/index.tsx:236-316` | 5 |
| T17 | 14 / 600 italic / — / `unselectText` | product "Comment" label | `PIA/index.tsx:299-306` | 1 |
| T18 | 13 / 600 / — / `'#fff'` | badge text (delivery position) | `OD/OrderHeaderComponent.tsx:206` | 1 |
| T19 | 13 / default / 18 / `'#856404'` / system (raw `Text`) | warning message | `OD/ValidationIssuesList.tsx:35,63-69` | 1 |
| T20 | 12 / 700 and 12 / 400 / — / default, centered | metadata label / value | `OD/OrderHeaderComponent.tsx:237-284` | 11 |
| T21 | 12 / 400 / — / `statusOrderBlue` | "Read more" link | `OD/OrderContentComponent.tsx:292,399`, `PIA/index.tsx:319` | 3 |
| T22 | 12 / 400 / — / `darkText` (selected) \| `lightGray` | rating label | `RC/index.tsx:248-257` | 1 |
| T23 | 16 / 700 / — / `primary` \| `white` / special | inline button label | `OD/OrderDetailsInformation.tsx:64,85,97`, `OD/OrderContentComponent.tsx:766` | 4 |
| T24 | 16 and 14 / 700 / — / `'#FFF'` / special | dialog button label | `OD/Delivery.tsx:1051`, `OD/ValidationIssuesList.tsx:45` | 2 |
| T25 | 12 / 700 / — / `primary` \| `textGray` / special | chip label | `RC/index.tsx:277-280` | 1 |
| T26 | 18 / normal / — / `white` / primary | floating-bar button label (from `FB/index.tsx:47-57`) | every `FloatingButton` of the area | — |
| T27 | 24 / 400 / — / `red`, centered | "Not available" (cart branch, unreachable) | `PIA/index.tsx:219-224` | 1 |
| T28 | 12 / 400 / — / default | custom-view date line (unreachable) | `OD/OrderHeaderComponent.tsx:293` | 1 |

Dead components add: 26 / 600 `textGray` (`SL/index.tsx:111-116`), 20 / 600 `textGray` (`BPL/index.tsx:66-71`, `BPL/ProductList.tsx:49-54`), 18 / 600 `textGray` and 14 `unselectText` (`BC/index.tsx:83-91`), 15 / 600 and 15 `textGray`, 16 / 600 `textGray`, 14 `textGray`, 13 and 13 bold (`OS/index.tsx:460-665`), 12 and 12 `skyBlue` (`SL/index.tsx:159-165`), 12 (`BPL/ProductList.tsx:154`).

`size={N}` literals on text in the area: 12 ×18, 13 ×3, 14 ×7, 16 ×36, 18 ×2, 20 ×1, 24 ×1 (reachable + dead). `weight=` literals: '400' ×41, '700' ×24, '600' ×7, `{600}` ×1, `{700}` ×1, 'bold' ×1.

---

### Buttons and touchables

| Tappable | Primitive | file:line | Look and size | activeOpacity / feedback | Disabled look | Touch target |
|---|---|---|---|---|---|---|
| Back (top bar) | `OIconButton` → `styled.TouchableOpacity` (`SH/OIconButton.tsx:6-15`) | `OD/Delivery.tsx:821-827` | 24×24, transparent, icon 24 | RN default (0.2) | n/a | **24×24 (< 44)**, no `hitSlop` |
| Copy | `TouchableOpacity` | `OD/Delivery.tsx:833-840` | glyph 20 in a 40-high padded text box | RN default | n/a | **~40×40 (< 44)** |
| Map, Chat | `OIconButton` | `OD/Delivery.tsx:843-866` | height 40, min/max width 40, icon 20 | RN default | n/a | **40×40 (< 44)** |
| Card header ×3 | `TouchableOpacity` | `OD/OrderContentComponent.tsx:157,192,302` | full-width row, text 16 + chevron 18 | RN default | n/a | height = text line (~20–25 pt) **< 44** |
| Contact links ×9 | `OLink` → `Pressable` (`SH/OLink.tsx:69`) | `OD/OrderContentComponent.tsx:221-393` | text 14 `#365CC7` | none (Pressable without pressed style) | n/a | one text line (~17 pt) **< 44** |
| Read more ×3 | `TouchableOpacity` | `OD/OrderContentComponent.tsx:289-293,396-400`, `PIA/index.tsx:318-320` | text 12 | RN default | n/a | ~15 pt high **< 44** |
| Product row | `styled.TouchableOpacity` `Accordion` | `PIA/styles.tsx:12-22`, `PIA/index.tsx:126-131` | full row | `activeOpacity={1}` (no feedback) | invalid row: bg `rgba(0,0,0,0.1)` | row height ≥ text (not guaranteed 44) |
| Review customer | `OButton` | `OD/OrderContentComponent.tsx:764-770` | 50 high, 100% wide, radius 8, `primary` | `activeOpacity` undefined → RN default (the primitive's `defaultProps` 0.5 is ignored by React 19) | never disabled | OK |
| Arrived to business / customer | `OButton` | `OD/OrderDetailsInformation.tsx:62-93` | 50 high, radius 10, bg `btnBGWhite`, label `primary` | same | same look as enabled (see "Off the scale") | OK |
| Order not ready | `OButton` | `OD/OrderDetailsInformation.tsx:95-105` | 50 high, radius 10, bg `red`, label `white` | same | white label on `btnBGWhite` | OK |
| Floating bar buttons (accept, reject, pickup complete / failed, delivery complete / failed) | `FloatingButton` → `styled.TouchableOpacity` (`FB/styles.tsx:22-35`) | `OD/Delivery.tsx:939-1029` | 50 high, 100% wide, radius 10; green `theme.colors.green` / red `theme.colors.red`; label 18 white | RN default | none | OK |
| Issue action | `OButton` | `OD/ValidationIssuesList.tsx:40-47` | 45 high, radius 7, `primary` | RN default | — | OK |
| Close (requirements) | `OButton` | `OD/Delivery.tsx:1046-1053` | 45 high, radius 7, `textGray` | RN default | — | OK |
| Go to my orders | `OButton` inside `NotFoundSource` | `OD/Delivery.tsx:1116-1124` | 50 high, radius 7.6, `primary` | RN default | — | OK |
| Navbar back (review) | `OIconButton` inside `ONavbar` | `RC/index.tsx:190` | default 40 high, padding-horizontal 20, icon 24 | RN default | — | 40 high (< 44) |
| Rating label ×5 | `TouchableOpacity` | `RC/index.tsx:238-258` | tick 8 + text 12 | RN default | — | ~35 pt high, text-wide **< 44** |
| Quick-comment chip | `OButton` | `RC/index.tsx:272-284` | 40 high, radius 15, border 2 | RN default | — | 40 high (< 44) |
| Send Review | `FloatingButton` | `RC/index.tsx:305-310` | 50 high, `primary` | RN default | none (label switches to "Loading") | OK |
| Dead: pencil / trash in product row | vector icon `onPress`, `OAlert` → `styled.TouchableOpacity` | `PIA/index.tsx:186-207` | glyph 26 | — | — | 26 (< 44) |
| Dead: store row, category row, caret, back 32×32, link, `ToggleSwitch` small | `TouchableOpacity` / third party | `BC/index.tsx:99-102`, `BPL/AccordionDropdown.tsx:25,32`, `BPL/IterateCategories.tsx:39,65,89`, `BPL/index.tsx:95-98`, `BPL/ProductList.tsx:101-104`, `SL/index.tsx:162` | — | RN default | — | caret 14, back 32 (< 44) |
| Dead: Print | `FloatingButton` | `OS/index.tsx:847-853` | `green`, 100% | — | — | OK |

No `Pressable` with pressed style, no android ripple, no `hitSlop` anywhere in the area.

---

### Icons

Icon sets imported: `react-native-vector-icons/MaterialCommunityIcons` (aliases `MCIcon`, `MaterialCommunityIcons`, `MaterialIcon`, `MaterialCommunityIcon`), `/AntDesign` (alias `AntDesignIcon`), `/SimpleLineIcons` (only used in a dead branch; unused import in `OD/Delivery.tsx:43`). Tinted PNGs through `OIconButton` / `OIcon`.

| Glyph | Set (alias) | file:line | Size | Color | Function |
|---|---|---|---|---|---|
| `content-copy` | MaterialCommunityIcons | `OD/Delivery.tsx:834-839`; dead `OD/OrderHeaderComponent.tsx:306-311` | 20 | `gray200` | copy order |
| `cloud-sync` | MaterialCommunityIcons (`MCIcon`) | `OD/Delivery.tsx:880-884` | 16 | `'#444'` | pending sync |
| `alert-circle` | MaterialCommunityIcons (`MCIcon`) | `OD/ValidationIssuesList.tsx:29-34` | 16 | `theme.colors.red` | unmet requirement |
| `up` / `down` | AntDesign | `OD/OrderContentComponent.tsx:161-165,200-204,306-310` | 18 | `gray200` | card collapse |
| `star` | MaterialCommunityIcons (`MaterialIcon`) | `OD/OrderContentComponent.tsx:336` | 24 | `arrowColor` | customer rating |
| `chevron-up` / `chevron-down` | MaterialCommunityIcons | `PIA/index.tsx:170` | 16 | `textNormal` (undefined) | product collapse |
| `pencil-outline`, `trash-can-outline` | MaterialCommunityIcons | `PIA/index.tsx:186-206` (unreachable) | 26 | `theme.colors.green`, `theme.ecolors.red` (typo) | edit / delete cart product |
| `printer` | SimpleLineIcons | `OD/OrderHeaderComponent.tsx:315-320` (unreachable) | 20 | `gray200` | print summary |
| `caretdown` / `caretright` | AntDesign | `BPL/AccordionDropdown.tsx:26-30` (dead) | 14 | `textNormal` (undefined) | category collapse |
| PNG `general.arrow_left` | `OIconButton` / `OIcon` | `OD/Delivery.tsx:822-824`; `SH/ONavbar.tsx:44-46`; dead `OS/index.tsx:454-455`, `BPL/index.tsx:99`, `BPL/ProductList.tsx:105` | 24; 24; 20; 26 | untinted; untinted; untinted; `textGray` | back |
| PNG `general.map` | `OIconButton` | `OD/Delivery.tsx:844-849` | 20×20 | tint `gray200` | open map |
| PNG `general.messages` | `OIconButton` | `OD/Delivery.tsx:857-862` | 20×20 | tint `gray200` | open chat |
| PNG `general.information` (undefined key) | `OIcon` | `SL/index.tsx:152-158` (dead) | 12×12 | tint `skyBlue` | info |

Sizes in use (reachable): 16, 18, 20, 24. Three "expand" glyphs for one function (see Duplicates). Colors are passed per call, never by role.

---

### Theme keys read

Counts are occurrences in the area's files (`grep` of `theme.colors.X` and `props.theme.colors.X`), split by reachability. Hex from `src/theme.json`.

| Key | Reachable | Dead | Value | Notes |
|---|---|---|---|---|
| `colors.primary` | 48 | 8 | #FFB700 | 34 of the 48 are the two status maps (17 each) |
| `colors.textGray` | 7 | 24 | #344050 | |
| `colors.clear` | 14 | 7 | transparent | all on icon-button styles |
| `colors.statusOrderRed` | 14 | 0 | #E63757 | status maps only |
| `colors.gray200` | 14 | 0 | #ADB5BD | header icons, chevrons |
| `colors.red` | 8 | 3 | #E63757 | buttons, dot, issue icon |
| `colors.gray100` | 8 | 0 | #F8F9FA | cards, dividers |
| `colors.statusOrderGreen` | 6 | 0 | #0CAD63 | status maps only |
| `colors.unselectText` | 6 | 1 | #909BA9 | product options |
| `colors.tabBar` | 6 | 0 | #e9ecef | rules, rating track, chip border |
| `colors.white` | 5 | 2 | #fff | |
| `colors.green` | 4 | 1 | #00D27A | accept / complete; `PIA` pencil (unreachable) |
| `colors.statusOrderBlue` | 3 | 0 | #04449c | read more |
| `colors.backArrow` | 3 | 0 | #748194 | only in `imgLeftStyle` with no image → paints nothing (`OD/OrderDetailsInformation.tsx:79,91,103`) |
| `colors.lightGray` | 3 | 0 | #D2D2D2 | RC |
| `colors.btnBGWhite` | 2 | 0 | #E9F2FE | one of them in an unused style key (`OD/Delivery.tsx:703`) |
| `colors.textNormal` | 2 | 2 | **undefined** | `OD/OrderContentComponent.tsx:661`, `PIA/index.tsx:170`, `OS/index.tsx:797`, `BPL/AccordionDropdown.tsx:29` |
| `colors.backgroundLight` | 1 | 1 | #F5F9FF | skeleton wrapper |
| `colors.arrowColor` | 1 | 0 | #B1BCCC | star |
| `colors.secondary`, `colors.dusk`, `colors.darkText`, `colors.black` | 1 each | 0 | #FFF4DA, rgb(65,77,107), #414954, #000000 | RC |
| `colors.notAvailable` | 1 | 0 | #EEEEEE | only in an unused style key (`OD/Delivery.tsx:699`) |
| `colors.borderTops` | 0 | 9 | #d9d9d9 | only dead code in this area |
| `colors.offColor` | 0 | 6 | #8c8b8d | only dead code in this area |
| `colors.inputChat` | 0 | 4 | #F8F9FA | only dead code in this area |
| `colors.skyBlue` | 0 | 2 | #CFE6FF | only dead code in this area |
| `ecolors.red` | 1 (unreachable branch) | 0 | **`theme.ecolors` undefined** | `PIA/index.tsx:205` |
| `defaultLanguages.DISCOUNT` | 2 | 0 | **undefined** | `OD/OrderContentComponent.tsx:490,494` |
| `images.general.arrow_left` | 1 | 3 | PNG | |
| `images.general.map` | 1 | 1 | PNG | |
| `images.general.messages` | 1 | 1 | PNG | |
| `images.dummies.businessLogo` | 1 | 2 | PNG | |
| `images.general.notFound` | 0 (read by `NotFoundSource` default) | 3 | PNG | |
| `images.general.user` | 1 | 0 | **undefined** | `RC/index.tsx:217` |
| `images.general.information` | 0 | 1 | **undefined** | `SL/index.tsx:153` |
| `theme.fonts.*` | 0 direct | 0 | — | only through `OText` / `OButton` / `ONavbar` |

Keys read but undefined in this area: `colors.textNormal`, `ecolors` (object), `defaultLanguages` (object), `images.general.user`, `images.general.information`.

`useTheme` comes from `styled-components/native` in every file of the area.

---

### Platform and window

| What | file:line | Today | Kind |
|---|---|---|---|
| Safe area of the page | `P:58` → `src/ui/src/layouts/SafeAreaContainer.tsx:84` | insets top / left / right applied; **bottom not applied**; `paddingHorizontal: 0` | look (inset) |
| Status bar | `src/ui/src/layouts/SafeAreaContainer.tsx:93-96` | `barStyle` iOS `dark-content` / Android `default`; background `danger500` / `success500` on connectivity change | look (other area) |
| Bottom reserve for the bar | `OD/OrderDetailsInformation.tsx:35,54` (`src/ui/src/hooks/useFloatingButtonInset.tsx:11-16`) | `100 + (iOS && not in tabs ? insets.bottom : 0)`; Android gets 0 | hand-made inset (lesson 17) |
| Scroll max height | `OD/styles.tsx:5` | 85% / 100% of the parent | window-relative size |
| "Read more" threshold | `OD/OrderContentComponent.tsx:56,60,140,144`; `PIA/index.tsx:39-40,121` | `Dimensions.get('window').width * .76` via `useDeviceOrientation` (captured once by `useCallback(…, [])`) | window-relative size |
| Product name width | `PIA/index.tsx:139` | fixed 200 | fixed size |
| Maps URL scheme | `OD/OrderContentComponent.tsx:258-261,278-281,385-388` | `Platform.select` `maps:` / `geo:` | behaviour (not theme) |
| Review modal insets | `RC/index.tsx:54,184-185` | `marginTop: top`, `marginBottom: bottom` by hand (the `OModal` with `customClose` paints no bar) | hand-made inset |
| Review modal top padding | `RC/index.tsx:189` | iOS 0 / Android 15 | look (platform spacing = inset by hand, lesson 14) |
| Keyboard avoiding | `RC/index.tsx:179-181,159-165` | `behavior` iOS `padding` / Android `height`; scroll to end on `keyboardDidShow` (listener never removed) | behaviour |
| RTL | `RC/index.tsx:69` | `scaleX: -1` on the rating bar when `I18nManager.isRTL` | look |
| Requirements dialog width | `OD/Delivery.tsx:744-746` | width 100%, maxWidth 400, maxHeight 80% | window-relative size |
| Dead: overlay size | `BPL/index.tsx:170-171` | `Dimensions.get('window')` width / height | — |
| Dead: orientation | `SL/index.tsx:50-57,88-98,200` | `Dimensions` listener added on every render; skeleton width 22% / 11% | — |
| Dead: printer font sizes | `OD/usePrinterCommands.tsx:76-188` (15 branches) | `Platform.OS === 'ios' ? 10–16 : 18–24` (printer output, not screen) | — |
| Dead: print path | `OS/index.tsx:430` | iOS silent print / Android PDF | behaviour |
| Dead: `isIos` prop | `BPL/index.tsx:194` | passed to the controller | behaviour |

No tablet branch and no orientation-dependent layout in the reachable files (the only split view is `OrdersListManager`, never rendered).

---

### Styles that cannot see the theme

| File | Inline style objects (`*tyle={{`) | Style arrays | `StyleSheet.create` | Where it is created |
|---|---|---|---|---|
| `P` | 0 | 0 | 0 | — |
| `OD/Delivery.tsx` | 10 | 0 | 1 (`:697-773`, 11 keys, 4 unused) | inside the component: re-created on every render, sees the theme |
| `OD/OrderContentComponent.tsx` | 33 | 0 | 1 (`:85-114`) | inside the component |
| `OD/OrderHeaderComponent.tsx` | 14 | 0 | 1 (`:71-99`, 1 key unused) | inside the component |
| `OD/OrderDetailsInformation.tsx` | 7 | 0 | 1 (`:37-44`) | inside the component |
| `OD/ValidationIssuesList.tsx` | 2 | 1 | 1 (`:55-76`) | **module level**: cannot see the theme (holds `'#856404'`, 13, 18, radius 7, height 45) |
| `PIA/index.tsx` | 18 | 0 | 0 | — |
| `RC/index.tsx` | 15 | 0 | 1 (`:58-109`, 1 key unused) | inside the component |
| `OS/index.tsx` (dead) | 40 | 0 | 1 (`:419-427`) | inside the component |
| `BPL/*` (dead) | 23 (7 + 9 + 4 + 3) | 0 | 2 (`BPL/index.tsx:56-89`, `BPL/ProductList.tsx:28-78`) | inside the component |
| `BC/index.tsx` (dead) | 3 | 0 | 1 (`:60-92`) | inside the component |
| `SL/index.tsx` (dead) | 7 | 0 | 1 (`:100-125`) | inside the component |
| **Total** | **172** (reachable 99, dead 73) | 1 | 11 (1 module-level) | |

- `defaultProps` on function components: none declared in the area's files. Consumed primitives declare them and React 19 ignores them: `SH/OText.tsx:60-62`, `SH/OButton.tsx:142-147` (`activeOpacity: 0.5`, `indicatorColor: 'white'`), `SH/OIcon.tsx:62-65`, `SH/OIconButton.tsx:127`, `SH/OLink.tsx:92-94`, `SH/OInput.tsx:145-149` (`bgColor: 'white'`, `borderColor: 'white'`). Effect here: `OButton` press opacity is RN's default, and the review textarea gets `backgroundColor: undefined` inline.
- View-only style props on the wrong element: `tintColor` in a `ViewStyle` (`OD/Delivery.tsx:717`, `OD/OrderHeaderComponent.tsx:83`, `RC/index.tsx:93`, `BPL/index.tsx:82`, `BPL/ProductList.tsx:42`), `color` in the icon-button `ViewStyle` (`OD/Delivery.tsx:711`, `OD/OrderHeaderComponent.tsx:77`).
- Styled-components with literals: `PIA/styles.tsx:4,9,20`, `OD/styles.tsx:31`.
- Styled-component props forwarded to native views (not transient): `hasFloatingButton` (`OD/Delivery.tsx:917`), `isOrderGroup`, `lastOrder` (`OD/OrderContentComponent.tsx:150`), `vehicleExists` (`:479,708`), `isValid` (`PIA/index.tsx:127`), `isSpace` (`BPL/IterateCategories.tsx:38`).

---

### Third-party UI

| Library | file:line | What it draws | Props that carry style |
|---|---|---|---|
| `rn-placeholder` (`Placeholder`, `PlaceholderLine`, `Fade`) | `OD/Delivery.tsx:4,801-812`; dead `BPL/index.tsx:3,142-160`, `BPL/ProductList.tsx:6,171-189`, `SL/index.tsx:3,195-216` | skeleton lines with its own gray, height and fade | `width` (percent), `height`, `style`; `Animation` |
| `react-native-vector-icons` (MaterialCommunityIcons, AntDesign, SimpleLineIcons) | see "Icons" | glyphs | `size`, `color`, `style` |
| RN `Modal` (raw) | `OD/Delivery.tsx:1032-1056` | requirements dialog | `animationType="slide"`, `transparent`; content styled by hand |
| `OModal` (shared, other agent) → RN `Modal` | `OD/Delivery.tsx:1058-1062,1086-1090`, `OD/OrderContentComponent.tsx:772-777` | full-screen modal, always `entireModal customClose` (no title bar from the primitive) | — |
| `Alert.alert` (system) | through `OAlertOriginal`: `OD/Delivery.tsx:1126-1134`, `RC/index.tsx:312-318`; through `OLink` (`SH/OLink.tsx:23-43`) for every contact link; through `OAlert` `PIA/index.tsx:195-207` (unreachable); direct `OS/index.tsx:397` (dead) | system dialogs: warning, review error, "link not supported", "invalid number" | none (not themable) |
| Toast (`useToast` → `OToast`, other area) | `OD/Delivery.tsx:359-365,531-535,659-663`; dead `BPL/index.tsx:49-52`, `BPL/ProductList.tsx:93`, `BC/index.tsx:41-54`, `SL/index.tsx:69-80` | toast | type, duration (1000, 5000 ms) |
| `react-native-linear-gradient` | `RC/index.tsx:13,225-231` | rating bar | `colors` (`primary`, `tabBar`), `locations`, `start`/`end`, `style` |
| `KeyboardAvoidingView` | `RC/index.tsx:179-188` | — | `behavior` by platform |
| `DriverMap` (maps, other area) | `OD/Delivery.tsx:1063-1082` | map with markers; receives the status `colors` map and marker icons | `colors`, `location.icon` |
| `AcceptOrRejectOrder` (other area) | `OD/Delivery.tsx:1091-1109` | all action sheets (reject reasons, failed, photo evidence, PIN, timer) | `orderTitle`, `appTitle` (texts) |
| `@react-native-clipboard/clipboard` | `OD/Delivery.tsx:5,521-529` | nothing | — |
| `Linking` to OS apps (`tel:`, `mailto:`, `maps:`, `geo:`) | `SH/OLink.tsx:55-59` from `OD/OrderContentComponent.tsx:221-393` | leaves the app | — |
| Dead: `toggle-switch-react-native` | `BC/index.tsx:138-146`, `BPL/ProductList.tsx:156-164`, `BPL/AccordionDropdown.tsx:39-46`, `BPL/IterateCategories.tsx:48-55,71-78,95-102` | switch | `onColor` (`primary`), `offColor` (`offColor`), `size="small"`, `animationSpeed={200}` |
| Dead: `react-native-fast-image` | `BC/index.tsx:104-112` | store logo | `style`, `resizeMode` |
| Dead: `react-native-intersection-observer` (`IOScrollView`) | `BPL/ProductList.tsx:3,122-127` | scroll view | `style` |
| Dead: `react-native-print`, `react-native-html-to-pdf` | `OS/index.tsx:4-5,389-417` | system print dialog; PDF from an HTML string with literal `font-size: 25–27px` | HTML string |
| Dead: `ActivityIndicator` | `BC/index.tsx:136` | spinner small `primary` | `size`, `color` |
| Dead: `NetInfo.fetch()` in render | `SL/index.tsx:39-41` | — | — |

Not present in this area: signature canvas, pickers, dropdowns, date pickers, WebView, phone input. Photo evidence (`launchCamera`, `src/ui/src/hooks/useStatusImage.tsx:23-68`) and the delivery PIN are only *decided* here (`requiresImage`, `requiresDeliveryPin`); their UI is inside `AcceptOrRejectOrder` (other area). Packages used only by dead code of this area: `react-native-print`, `react-native-html-to-pdf`, `react-native-intersection-observer` (`grep` in `src` outside the submodule finds no other importer); `toggle-switch-react-native` is also used by `UserProfileForm` (other area).

---

### Motion

| What | file:line | Duration |
|---|---|---|
| RN `Modal animationType="slide"` (requirements) | `OD/Delivery.tsx:1035` | platform default |
| `OModal` slide (map, action, review) | `SH/OModal.tsx:178` | platform default |
| rn-placeholder `Fade` | `OD/Delivery.tsx:802` (dead: `BPL/index.tsx:143`, `BPL/ProductList.tsx:172`, `SL/index.tsx:196`) | library default |
| `Animated.View` with no animated value | `PIA/index.tsx:229,325` | none: the accordion toggles `display` instantly (`:228`); a commented-out `toggleAccordion` effect remains (`:97-99`) |
| Toast durations | `OD/Delivery.tsx:534,663` | 1000 ms, 5000 ms |
| `TouchableOpacity` press fade | every touchable above | RN default; `activeOpacity={1}` on the product row |
| Dead: `ToggleSwitch animationSpeed` | `BC/index.tsx:145` and 5 more | 200 ms |

No `Animated.timing` / `spring`, no `LayoutAnimation` in the area.

---

### Dead code

How checked: `grep -rn` over `src`, `App.tsx`, `index.js` excluding `src/@` (submodule) and `__tests__`, for JSX usage (`<Name`), imports and route names; `src/navigators/HomeNavigator.tsx:44-100`, `BottomNavigator.tsx` and `RootNavigator.tsx` read for registered screens; styled exports checked against JSX usage in their own folder and in `OrderDetailsLogistic`; `StyleSheet` keys checked with `grep "styles\.<key>"`.

| Item | file:line | Evidence |
|---|---|---|
| `OrderSummary` (whole folder, 857 + 61 lines) | `OS/index.tsx`, `OS/styles.tsx` | only `src/ui/index.tsx:27,120` references it; no `<OrderSummary` anywhere. Its opener `handleViewSummaryOrder` is never passed to `OrderHeaderComponent` (`OD/Delivery.tsx:923-932`, `OrderDetailsLogistic/index.tsx:155-160`), so the printer icon never renders |
| `usePrinterCommands` | `OD/usePrinterCommands.tsx:12-223` | no importer in `src` |
| `StoresList` (whole folder) | `SL/index.tsx`, `SL/styles.tsx` | only `src/ui/index.tsx:35,130`; no page, no route, no `<StoresList` |
| `BusinessController` (whole folder) | `BC/index.tsx`, `BC/styles.tsx` | only rendered by `SL/index.tsx:181` (dead); exported `src/ui/index.tsx:3,93` |
| `BusinessProductList` (whole folder: index, ProductList, AccordionDropdown, IterateCategories, styles) | `BPL/*` | only `src/ui/index.tsx:4,94`; the route `BusinessProductListing` that `BC/index.tsx:101` navigates to is registered in no navigator |
| `OrderDetails/Business` | — | does not exist; `OD/` only holds `Delivery.tsx` |
| `isCustomView` branch of the header | `OD/OrderHeaderComponent.tsx:290-351` (+ condition `OD/Delivery.tsx:819`, `OD/OrderHeaderComponent.tsx:268`) | the prop is only passed by `OrdersListManager/index.tsx:599`, and `<OrdersListManager` is rendered nowhere (`grep` finds only its export `src/ui/index.tsx:19,112`) |
| Cart mode of `ProductItemAccordion` | `PIA/index.tsx:47-64,101-108,182-208,214-225` | neither caller passes `isCartProduct`, `isCartPending`, `onEditProduct`, `onDeleteProduct`, `getProductMax` (`OD/OrderContentComponent.tsx:471-475`, `OS/index.tsx:678-682`); contains the `theme.ecolors.red` typo |
| Styled components never rendered | `OD/styles.tsx`: `Pickup` (`:8-11`, imported at `OD/Delivery.tsx:10` and `OD/OrderDetailsInformation.tsx:3`), `Logo` (`:25-27`), `DriverItem` (`:114-122`), `AssignDriver` (`:124-130`). `OS/styles.tsx`: `Action` (`:58-61`). `PIA/styles.tsx`: `ProductInfo` (`:24-26`), `ProductQuantity` (`:28`), `ProductImage` (`:38-40`). `SL/styles.tsx`: all five (`OptionTitle`, `FiltersTab`, `OTabs`, `TagsContainer`, `Tag`, `:3-26`) | no JSX usage |
| `StyleSheet` keys never used | `OD/Delivery.tsx`: `driverOff` (`:698`), `btnPickUp` (`:701`), `headerText` (`:725`), `secondaryHeaderContainer` (`:728`). `OD/OrderHeaderComponent.tsx`: `btnBackArrow` (`:79-90`). `RC/index.tsx`: `btnBackArrow` (`:89-100`). `OS/index.tsx`: `btnBackArrow` (`:420-423`). `BPL/ProductList.tsx`: `logo` (`:55-66`). `SL/index.tsx`: `icons` (`:117-119`) | `grep "styles\.<key>"` = 0 |
| Unused imports / props / variables | `OD/Delivery.tsx:43` `SimpleLineIcons`, `:10` `Pickup`; `OD/OrderHeaderComponent.tsx:24` `OIcon`, `:9,11` `Dot`, `Messages`; props `handleArrowBack`, `messages`, `messagesReadList` and `filteredMessages` (`:48,55-56,66-68`) never used / never passed, `:61` `user`; `OD/OrderContentComponent.tsx:52` `user`; `P:3` `settings`; `OD/OrderDetailsInformation.tsx:79,91,103` `imgLeftStyle` without image | `grep` of each identifier in its file |
| No driver contact block | — | the screen shows business and customer only; `DriverItem` / `AssignDriver` are leftovers of a driver-assignment block |
| Theme keys read only by dead code of this area | `colors.borderTops`, `colors.offColor`, `colors.inputChat`, `colors.skyBlue`, `images.general.information` | may still be read by other areas: to cross-check at consolidation |
| Tests that keep the dead components alive | `OS/__tests__/OrderSummary.test.tsx`, `SL/__tests__/StoresList.test.tsx`, `BC/__tests__/BusinessController.test.tsx`, `BPL/__tests__/BusinessProductList.test.tsx` | deleting the components means deleting these tests |

---

### Not verified

Nothing was run: no app, no simulator, no device, no tests, no type check. Everything above is from reading code. Specifically not determined:

- **How the screen actually looks** in each status, order type and platform (iOS and Android), small and large phones; no screenshots exist.
- **Header card edge to edge** (`OD/OrderHeaderComponent.tsx:178-179`) and **pending-sync row without padding** (`OD/Delivery.tsx:873-879`): deduced from `paddingHorizontal={0}` on the page; needs a device.
- **Content hidden behind the floating bar**: the 100 pt reserve vs a ~130 pt two-button bar, and the 85% `max-height` on statuses without a bar (20, 21) — needs a device on both platforms (Android gets no bottom inset here).
- **Icon-button boxes in the top bar**: the primitive's `padding-horizontal: 20` together with `padding: 10` and `maxWidth: 40` from the caller (`OD/Delivery.tsx:706-712,851`); which padding wins and whether the 20 pt icon is clipped or squeezed was not seen.
- **`undefined` inline values over styled values**: `tintColor: undefined` in `OIcon` (does the review avatar fallback — the app logo — come out tinted `primary`?), `backgroundColor: undefined` on the review textarea (`OInput`), `color={undefined}` on the product chevron (default glyph color per platform).
- **Fonts as painted**: `Helvetica` + `fontWeight` 600/700 and `fontStyle: italic` on Android (faux bold / missing italic face), the `OButton` family `Inter_18pt-Black` with weight 700, and the `ONavbar` family string `"Inter_18pt-Black_18pt-Black"` (belongs to the primitives' agent).
- **`box-shadow` on `OButton`** (`SH/OButton.tsx:22`) and the `elevation` / shadow of the warning banner on Android.
- **Touch targets** are computed from style values, not measured.
- **`adjustsFontSizeToFit`** on product name / price: real sizes vary per text.
- **Server data shapes**: which of `metafields`, `payment_events`, `vehicle`, `spot_number`, `delivery_position`, `reservation`, `offers`, `taxes`, `fees` the driver API really returns; order types 7 / 8 / 9 labels ("Driver thru" for anything above 4 in the header).
- **Configs**: real values of `reject_orders_enabled`, `allow_driver_reject_order`, `failed_pickup_by_driver_enabled`, `order_not_ready_enabled`, `hidden_driver_eta_time`, `states_requiring_image_driver`, `delivery_pin_enabled`, `location_validation_*`, `change_order_id`, `distance_unit` in production projects.
- **Submodule controllers** (`OrderDetails`, `ReviewCustomer`, `FloatingButton`, `StoreProductList`, `BusinessList`, `BusinessController` in `src/@/components`) were not read beyond confirming they are exported from `native/index.js`; what they pass down is taken from the UI components' destructuring.
- **Other areas' components opened from here** were not audited: `DriverMap`, `AcceptOrRejectOrder` (reject reasons, pickup / delivery failed, photo evidence, PIN, timer), `OrderMessage`, `OModal`, `OToast`, `NotFoundSource`, `FloatingButton`, `ONavbar`, `OInput`, `SearchBar`, `OrderDetailsLogistic`, `OrdersListManager`, `PreviousOrders` (second caller of `ReviewCustomer`). Only the props this area passes to them are reported.
- **Test files** of the area (`__tests__`) were listed, not read.
- **Whether dead-only theme keys and packages are used elsewhere** was checked by `grep` for the three packages only; the color keys need the consolidation pass.
- **RTL**: only the rating bar handles it; the rest was not evaluated.
- **Accessibility**: no `accessibilityLabel` / `accessibilityRole` found in the area; not evaluated on a device.
