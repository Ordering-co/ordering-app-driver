# Area 5 — map and messages

Phase 1 inventory, read-only. Nothing was run (no app, no simulator, no tests): every row is from reading code.

**File legend** (all under `src/`; a row's `XX:n` is `file:line`):

| Short | File |
|---|---|
| `pMap` | `pages/MapView.tsx` |
| `pMsg` | `pages/Messages.tsx` |
| `pChat` | `pages/OrderMessage.tsx` |
| `MV` | `ui/src/components/MapView/index.tsx` |
| `RM` | `ui/src/components/MapView/RenderMarker.tsx` |
| `DM` | `ui/src/components/DriverMap/index.tsx` |
| `LI` | `ui/src/components/DriverMap/LocationIndicator.tsx` |
| `GM` | `ui/src/components/GoogleMap/index.tsx` |
| `CH` / `CHs` | `ui/src/components/Chat/index.tsx` / `styles.tsx` |
| `MO` / `MOs` | `ui/src/components/MessagesOption/index.tsx` / `styles.tsx` |
| `PM` / `PMf` / `PMs` | `ui/src/components/PreviousMessages/index.tsx` / `FooterMessageComponent.tsx` / `styles.tsx` |
| `OM` / `OMs` | `ui/src/components/OrderMessage/index.tsx` / `styles.tsx` |
| `CT` / `CTs` | `ui/src/components/Contacts/index.tsx` / `styles.tsx` (dead, see "Dead code") |
| `shared/X` | `ui/src/components/shared/X.tsx` (another agent's; quoted only for defaults) |
| `lib:gifted/X` | `node_modules/react-native-gifted-chat/lib/X.js` (2.1.0) |
| `lib:maplink` | `node_modules/react-native-map-link/src/components/Popup.js` (2.11.4 installed, `^2.8.2` declared) |

**Starting numbers for this area** (`.theme-audit/inventory.csv` filtered by the files above, tests excluded): 339 literals — size 100, space 87, radius 47, font_size 43, font_weight 24, color 11, border 8, font_family 8, opacity 5, shadow_part 3, z_index 2, line_height 1. By file: `CH` 124, `PM` 33, `DM` 31, `CT` 29 (dead), `GM` 23, `MO` 19, `LI` 12, `OM` 11, `CTs` 9 (dead), `RM` 8, `MOs` 8, `OMs` 8, `PMf` 8, `PMs` 8, `MV` 5, `CHs` 2, `pMsg` 1. 38 of the 339 are in the dead `Contacts` UI. Inline `style={{`: 62; other object-literal style props (`textStyle={{`, `iconStyle={{`, `containerStyle={{`…): 30; `StyleSheet.create`: 13 (3 module-level); hard-coded `fontFamily: 'Poppins'`: 7 (2 live); `Platform.OS` branches that change the look: 3; theme keys read but undefined: 1 (`textNormal`).

## Reachability (what is actually rendered)

| Component | Rendered by | Reachable? |
|---|---|---|
| `MapViewUI` (`MV:285`) | `pMap:13` ← `navigators/BottomNavigator.tsx:153-158` (tab "MapView"; `RequestPermissions` replaces it when location is not granted) | Yes |
| `RenderMarker` (`RM:28`) | `MV:205,213` | Yes |
| `DriverMap` (`DM:20`) | `ui/src/components/OrderDetails/Delivery.tsx:1063` inside `OModal entireModal customClose` (`:1057-1082`) | Yes (order detail → map) |
| `LocationIndicator` (`LI:11`) | `DM:370` | Yes (when `order` is passed) |
| `GoogleMap` (`GM:19`) | `ui/src/components/PreviousOrders/index.tsx:560` inside `OModal entireModal customClose`, opened by "Track real time position" (`PreviousOrders/index.tsx:342-351`) | Yes, with `readOnly` + `locations`; its accept bar (`GM:404-421`) is never shown (no caller passes `showAcceptOrReject`) |
| `MessagesOption` (`MO:272`) | `pMsg:37` ← `BottomNavigator.tsx:169-171` (tab "Messages") | Yes |
| `PreviousMessages` (`PM:17`) + `FooterComponent` (`PMf:8`) | `MO:240` | Yes — one variant only; there are no variants |
| `OrderMessage` (`OM:237`) | `pChat:36` ← `navigators/HomeNavigator.tsx:67-71`; entered from `PM:42` and `OrderDetails/Delivery.tsx:332` | Yes — always as business chat (`chatType = BUSINESS`, see "Dead code") |
| `Chat` (`CH:1307`) | `OM:215` only | Yes |
| `ChatMessageSkeleton` (`shared/ChatMessageSkeleton:77`) | `OM:159` only | Yes |
| `Contacts` UI (`CT:238`) | nobody (not exported by `ui/index.tsx`) | **No** |
| `OChatBubble` (`shared/OChatBubble:32`) | nobody (not in `shared/index.tsx`) | **No** |

## Screens

| Screen | Entry | Root container | Sticky / fixed children | Blocks in render order |
|---|---|---|---|---|
| Map tab | `BottomNavigator.tsx:153` → `pMap:4` → `MV:285` → `MV:43` | `SafeAreaView` from safe-area-context, `{flex:1}`, no background (`MV:182`) → `View {flex:1}` (`MV:183`) → absolute-fill container (`MV:185`, module styles `MV:21-27`). No scroll view. | Everything floats over the map | 1. `MapView` Google provider, absolute fill (`MV:186-202`). 2. Business markers (`MV:204-211`). 3. Customer markers (`MV:212-220`). 4. Driver's own marker (`MV:221-246`). 5. Zoom-in FAB (`MV:249-258`). 6. Zoom-out FAB (`MV:259-268`). 7. System alert on error (`MV:273-279`). No header, no loading, no empty state: the screen is blank until `initialPosition.latitude/longitude` are truthy (`MV:184`). |
| Messages tab | `BottomNavigator.tsx:169` → `pMsg:7` → `MO:272` (controller `Contacts` from `@components`) → `MO:21` | `SafeAreaContainerLayout` (`ui/src/layouts/SafeAreaContainer.tsx:51`): insets top/left/right + inner `View` (`paddingHorizontal 20`, `paddingTop 0`, `paddingBottom 0`) merged with `pMsg:29-32` (`backgroundColor backgroundPage`, `padding 20`). List is a `FlatList` (`PM:411`); skeleton state is a `ScrollView` (`PM:403`). | Title and sort chips sit outside the list, so they stay fixed; no `stickyHeaderIndices` | 1. `StatusBar` (layout). 2. Title "Messages" (`MO:164-166`). 3. Tab strip (`MO:167-199`) — never rendered, `tabs.length` is 1. 4. Sort chips, horizontal `ScrollView` (`MO:201-224`). 5. Empty / error state (`MO:226-238`). 6. List wrapper `{flex:1}` (`MO:239`): initial skeleton ×6 (`PM:402-409`) or `FlatList` with `RefreshControl` (`PM:422-425`), rows (`PM:318-396`), footer = skeleton ×2 while loading more + "Load more orders" (`PMf:41-59`). |
| Chat (order messages) | `HomeNavigator.tsx:67` → `pChat:8` → `OM:237` (controller `OrderDetails`) → `OM:26` → `CH:1307` (controller `Messages`) → `CH:73` | `KeyboardAvoidingView behavior="padding"` (`pChat:31-34`) → `SafeAreaContainer edges top/left/right` (`pChat:35`) → `View {flex:1}` (`OM:163`). Message list is the `FlatList` (inverted) owned by gifted-chat. | Header bar fixed on top (`OM:164`); input toolbar fixed at the bottom (library) | Loading: `ChatMessageSkeleton` full screen (`OM:158-160`). Loaded: 1. Header: back, avatar, title, subtitle (`OM:164-212`). 2. `SafeAreaView` (bottom edge only when the keyboard is hidden, `CH:1202-1204`) → white wrapper (`CH:1205`). 3. Message list (`CH:1206-1243`): day separators, first "order placed" message, console messages for order changes, bubbles with sender name, time and "Sent to" avatars, message images, scroll-to-bottom. 4. Signature pad footer when toggled (`CH:1166-1199`). 5. Input toolbar (`CH:799-811`): accessory = recipients row + quick-message chips (`CH:628-788`), then composer with signature and image buttons (`CH:813-921`) and send (`CH:923-964`); or the "chat ended" notice (`CH:816-829`). 6. Message-options bottom sheet (`CH:1245-1302`). 7. System alert "removed from the order" (`OM:224-230`). |
| Driver map (modal over order detail) | `OrderDetails/Delivery.tsx:1057-1082` → `DM:20` | `OModal` full screen (RN `Modal`, slide) → `SafeAreaView {flex:1}` (`DM:343`). No scroll view. | Close button, distance bar, FABs, "other maps" button and accept/reject bar are all absolutely positioned | 1. Close button, absolute top-right (`DM:344-351`). 2. Order header: title + status, route indicator, 5 pt band (`DM:352-373`). 3. Map (`DM:376-441`) with destination marker, driver marker, or a default pin. 4. "Fit route" FAB (`DM:444-454`). 5. "Center on me" FAB (`DM:455-465`). 6. Distance / time bar, absolute top of the map (`DM:466-493`). 7. "Show in other maps" button, absolute bottom (`DM:494-506`) + map-link `Popup` (`DM:507-526`). 8. Reject / Accept floating bar (`DM:528-546`) when `showAcceptOrReject`. 9. System alert (`DM:547-553`). |
| Tracking map (modal over orders list) | `PreviousOrders/index.tsx:553-570` → `GM:19` | `OModal` full screen → `SafeAreaView {flex:1}` (`GM:288`) → `View {flex:1, position:'relative'}` (`GM:289`). | Close button absolute top-left | 1. Map `{flex:1}` (`GM:290-395`): one marker + custom callout per location (`GM:314-384`), or a default pin (`GM:390-393`, unreachable from the only caller). 2. System alert (`GM:396-402`). 3. Accept bar (`GM:404-421`) — unreachable. 4. Close button (`GM:422-429`). |

## Elements

Proposals name a primitive of `components.md` §1 or a kind of token; no token names are invented. "OText default" = `shared/OText:5-10`: 14 px, weight 400, color literal `#344050`, family `theme.fonts.primary.name` (Helvetica).

### Map tab and markers

| Screen / component | Element | file:line | Values today | Function | Proposal (component, token or key) |
|---|---|---|---|---|---|
| Map tab | Safe-area root | `MV:182-183` | inline `{flex:1}` ×2; no background color | Screen container | Screen surface color role; styles into the component |
| Map tab | Map container | `MV:21-27,185` | module-level sheet: absolute fill, `height/width 100%`, `justifyContent flex-end`, `alignItems center` | Layout | Layout only (move out of module scope) |
| Map tab | Map | `MV:186-202` | `PROVIDER_GOOGLE`, absolute fill, `zoomControlEnabled={!(isDeliveryApp && android)}`; no `customMapStyle` | Map tiles | Not themable (library). Question: a map style JSON as a theme asset? |
| Map tab, all maps | Pin glyph | `MV:229-233`, `RM:86-90`, `DM:400-404`, `GM:322-326` | FontAwesome5 `map-marker`, size 50, `theme.colors.primary` | Marker body | Icon primitive, color from the brand role; size 50 is off the icon scale (one marker component) |
| Map tab, all maps | Pin avatar | `MV:234-245` (+`MV:28-40`), `RM:92-103` (+`RM:13-25`), `DM:405-412` (+`DM:284-294`), `GM:327-337` (+`GM:263-273`) | box `width 25`, absolute `top 6 left 6`; image 25×25, `borderRadius 50`, cover (FastImage) or contain (OIcon) | Who the marker is (driver / business / customer photo) | Same marker component; avatar size = layout; radius full |
| Map tab | Own-position marker title | `MV:227` | native callout with "Your Location" | Label | Not themable (library bubble) |
| Map tab | Callout box | `RM:105-143` | `View {flex:1, width:200, padding:5}` (`RM:108`) inside the library's callout bubble | Marker details | Library frame not themable; content: space token + text presets |
| Map tab | Callout name | `RM:109` | OText default + `weight='bold'` | Card title | Text preset (card title) |
| Map tab | Callout lines (order no., address, city / notes, zipcode, internal number) | `RM:110-130` | OText default (14 / 400 / `#344050`) | Body | Text preset (body), color from a text role |
| Map tab | Callout link "More info" / "Show orders" | `RM:131-141` | OText default, `textDecorationLine underline`, `theme.colors.primary` | Link to order / orders | Text preset (link) |
| Map tab | Zoom in / out | `MV:249-268` + `shared/OFab:34-51` | 30×30, `backgroundColor 'black'`, `borderRadius 100`, glyph white 20 (MaterialCommunityIcons `plus` / `minus`), shadow `#000` (0,3) 0.27 / 4.65, `elevation 6`, `zIndex 9999`, `activeOpacity 0.8`; position absolute `bottom 75` / `35`, `right 20` | Zoom the map | `button` with `shapes.icon` (floating); colors by role instead of literal black/white; positions = space tokens |
| Map tab | Error alert | `MV:273-279` | `OAlertOriginal` → `Alert.alert` | Error | System alert: not themable |

### Driver map (modal)

| Screen / component | Element | file:line | Values today | Function | Proposal (component, token or key) |
|---|---|---|---|---|---|
| Driver map | Close button | `DM:344-351`, `DM:303-307,331-335` | container absolute `right 0`, `marginTop = inset top`, `top 10`; `OIconButton` with `theme.images.general.close`, icon 48×48; wrapper height 40 (primitive), `borderRadius 7.6`, `borderWidth 0`, `paddingLeft 0` (primitive keeps `paddingRight 20`), no background | Leave the map | `button` icon shape / `header` close action; one size for both maps (48 here, 32 in `GM`) |
| Driver map | Header block | `DM:353` | inline `{padding:15}` | Order summary over the map | `card` or `header` surface; space token |
| Driver map | Title "Order No. N is" | `DM:354-369` | OText `size 16`, `weight "600"`, color default `#344050`, `numberOfLines 2`, `marginBottom 15`, `maxWidth '80%'` | Section title | Text preset (section title) |
| Driver map | Status inside the title | `DM:360-365` | OText `size 16`, `weight "700"`, color `colors?.[order.status] \|\| theme.colors.primary` (`colors` comes from `OrderDetails/Delivery.tsx:1080`) | Order status | Status color role (shared with the orders area) |
| Driver map | Route indicator | `DM:370`, `LI:14-55` | row `paddingVertical 10`; left column `marginRight 12`, `marginTop 3`; dots 12×12 `borderRadius 6`, top `textGray`, bottom `primary`; dashed line `width 1`, `height 20`, `borderWidth 1`, `textGray`; texts OText `fontSize 14`, `lineHeight 20`, `marginBottom 8` between them. It prints `order.business.name` above `order.customer.address` | Origin → destination | Its own small piece: dot colors by role, text preset (body), `divider`-like line color |
| Driver map | Band under the header | `DM:371` | inline `{height:5, backgroundColor: theme.colors.tabBar}` | Separator | `divider` (band) |
| Driver map | Map | `DM:376-390`, `DM:279-283` | absolute fill, `height '80%'`, `zoomControlEnabled` | Map tiles | Not themable |
| Driver map | Destination marker | `DM:393-413` | same pin (50, primary) + `OIcon` 25×25 `borderRadius 50`; native title callout | Where to go | Marker component (above) |
| Driver map | Driver marker | `DM:414-429`, `DM:295-302` | 25×25 circle `backgroundColor theme.colors.white`, `borderRadius 100`; `OIcon` `theme.images.general.driverImage` 25×25 | Driver position | Marker component; image key in the theme |
| Driver map | Default pin | `DM:432-439` | library's red pin + native title | Position when no destination | Not themable |
| Driver map | "Fit route" FAB | `DM:444-454` | `OFab` Ionicons `globe-sharp`; `right 20`; `bottom 75`, or with accept/reject `180` on iOS / `280` on Android | Fit both points | `button` icon shape; offset from the action bar's height, not per platform |
| Driver map | "Center on me" FAB | `DM:455-465` | `OFab` Ionicons `car-sport-sharp`; `right 20`; `bottom 35`, or `140` iOS / `240` Android | Follow the driver | Same |
| Driver map | Distance / time bar | `DM:466-493`, `DM:308-330` | absolute `top 0`, `zIndex 9999`, `width 100%`, `backgroundColor white`, `paddingHorizontal 20`; row `marginBottom 10`; left column `width '20%'`, `marginRight 10`: `OIcon` `arrow_distance` (26×26 primitive default) + OText `size 12` (default color), 3 lines; right column `width '75%'`, `paddingRight 20`: OText `size 13`, `theme.colors.unselectText`, 2 lines, `adjustsFontSizeToFit` | Distance and ETA | `card` (banner) surface; text presets (metadata / caption); icon primitive |
| Driver map | "Show in other maps" | `DM:494-506`, `DM:336-339` | wrapper absolute, `width 100%`, `alignItems center`, `bottom 10` (or `150` with accept/reject); `OButton` defaults (`shared/OButton:13-41`: bg + 2 px border `primary`, height 50, radius 10, `padding 0 20`, shadow `1px 1px 2px #00000020`, text 16 / 700 white in `theme.fonts.special`) + `borderRadius 10`, `alignSelf center`, `textStyle {color: white}` | Open the directions sheet | `button` (primary) |
| Driver map | Directions sheet | `DM:507-526` | react-native-map-link `Popup`; no `style` prop; `modalProps {animationIn:'slideInUp'}`; texts translated (title, message, cancel) | Choose a maps app | Third-party: either feed its `style` keys from the theme or replace with the app's `sheet` + `menu` rows |
| Driver map | Reject / Accept bar | `DM:528-546` + `ui/src/components/FloatingButton` | `FloatingButton` (another area's component): two 50 pt buttons radius 10 stacked, `firstColorCustom red`, `secondColorCustom green`, `widthButton '100%'`, `isPadding` (20), white bar; Reject hidden when `configs.reject_orders_enabled` ≠ `'1'` (`DM:77`) | Accept or reject the order | `button` colors (danger / success) in a bottom action bar |
| Driver map | Error alert | `DM:547-553` | `Alert.alert` | Location error | System alert |

### Tracking map (modal)

| Screen / component | Element | file:line | Values today | Function | Proposal (component, token or key) |
|---|---|---|---|---|---|
| Tracking map | Close button | `GM:422-429`, `GM:274-284` | absolute `top 0`, `left 15`, `marginTop = inset top`; icon 32×32; `borderRadius 7.6`, `borderWidth 0`, `paddingLeft 0` | Leave the map | Same icon button as the driver map (side and size differ today) |
| Tracking map | Marker | `GM:314-337` | same pin + `OIcon url` 25×25 (image through `optimizeImage 'h_300,c_limit'`) | Driver / business / customer | Marker component |
| Tracking map | Callout box | `GM:353-354` | `{flex:1, width:250, paddingRight:10, paddingLeft:10}`; inner `marginBottom 20` | Marker details | Library frame; content: space tokens |
| Tracking map | Callout title | `GM:355` | OText `size 16`, `weight 'bold'`, `paddingTop 10`, `marginBottom 10` | Card title | Text preset (card title) — 14 bold in the other callout |
| Tracking map | Callout address, zipcode | `GM:358-359` | OText `size 16` | Body | Text preset (body) — 14 in the other callout |
| Tracking map | "Go to this location" | `GM:363-381` | `OButton` `bgColor/borderColor primary`, `borderRadius 10`, `height 35`, `bottom 10`; text white, `fontFamily 'Poppins'`, `fontWeight 'normal'`, `fontSize 16`; no `onClick` (the callout's press opens the system sheet, `GM:339-351`) | Open directions | `button` (primary, small); remove the hard-coded family |
| Tracking map | Directions chooser | `GM:340-350` | `showLocation` → ActionSheet (iOS) / Alert (Android) | Choose a maps app | System UI: not themable. Duplicate of the `Popup` above |

### Messages tab

| Screen / component | Element | file:line | Values today | Function | Proposal (component, token or key) |
|---|---|---|---|---|---|
| Messages | Page container | `pMsg:28-33,36` | `backgroundColor theme.colors.backgroundPage`, `padding 20` (merged over the layout's `paddingHorizontal 20`, `paddingTop 0`, `paddingBottom 0`) | Screen surface | Screen surface role; screen gutter = one space token |
| Messages | Title | `MO:114-124,164-166` | row centered, `marginTop 15`, `marginBottom 10`; OText `fontSize 26`, `fontWeight '700'`, `theme.colors.textGray` | Screen title | `header` / text preset (screen title) |
| Messages | Sort chips row | `MO:201-206`, `MOs:15-17`, `MO:136-138` | horizontal `ScrollView`, `margin-bottom 10px` + content `marginBottom 20` | Sort the list (Newest / Order number) | Space tokens |
| Messages | Sort chip | `MO:207-222`, `MOs:19-27` | `styled.Pressable`: `min-height 34px`, `padding 4px 10px`, `border-radius 50px`, `margin-right 15px`; selected `primary` + white text; unselected `tabBar` + black text; label OText 14, `fontWeight 'normal'` (`MO:139-143`) | Filter chip | `chip` (selected / unselected states) |
| Messages | Empty / error state | `MO:226-238` + `ui/src/components/NotFoundSource/index.tsx:15-36` | image `theme.images.general.notFound` 260×220; text OText 18, `theme.colors.textSecondary`, centered; wrapper `margin 30px auto`, `padding 10px` | "Sorry, no results found" / API error text | `empty_state` |
| Messages | Initial skeleton | `PM:398-409` + `shared/OrderListSkeleton`, `shared/OrderListItemSkeleton:19-99` | `ScrollView` bg `backgroundPage`, `paddingBottom 20`; 6 rows: `minHeight 97`, bone 75×75 radius 10, lines 16 / 12 / 24 pt high, badge bone 22 round, hairline divider `borderTops`; bone color `theme.colors.inputSignup` | Loading | `skeleton` (color global, sizes layout) |
| Messages | List | `PM:411-435` | `FlatList` bg `backgroundPage`, content `paddingBottom 20` | Orders with messages | Surface role, space token |
| Messages | Pull to refresh | `PM:422-425` | `RefreshControl` with no `tintColor` / `colors` | Refresh | `spinner` color role |
| Messages | Row | `PM:325-329`, `PM:239-249` | `TouchableOpacity` `activeOpacity 1`; `height 100`, `minHeight 64`, `marginBottom 30`, `marginLeft 3`, `borderRadius 10`, `paddingTop 10`, `borderWidth 1`, `borderColor theme.colors.gray100` | Open the chat of that order | `card` (list row); pressed feedback from the theme |
| Messages | Row logo | `PM:331-341`, `PM:250-263`, `PMs:9-12` | box 75×75, `borderRadius 10`, `shadowColor "#0000006e"`, `shadowRadius 10`, `elevation 15`, `marginLeft 3` (no `shadowOpacity` / offset, no background); image 75×75, `borderRadius 7.6`, cover | Business logo | Logo frame: one component; shadow token (or none) |
| Messages | Row title | `PM:344-346`, `PM:264-269` | 16 / `'700'` / `textGray` / `theme.fonts.primary.name`, 1 line | Business name | Text preset (card title) |
| Messages | Unread badge | `PM:347-353`, `PMs:33-41`, `PM:270-273` | 22×22, `border-radius 22px`, `padding 1px 4px`, bg `theme.colors.secondary`; text 12, `primary` (the `size={14}` prop is overridden by the style) | Unread count | `badge` |
| Messages | Row meta line | `PM:356-365`, `PM:274-277` | 12 / `'400'` / default `#344050`, 1 line, `adjustsFontSizeToFit` (the `size={20}` prop is overridden) | "Order No. N · date" | Text preset (metadata), secondary text role |
| Messages | Row timer | `PM:366-382` | 12 / `'400'`; color literal `#00D27A` (in time), `#FFC700` (at risk), `#E63757` (delayed), `''` otherwise; only for active statuses (`PM:15`) | Time left / delay | Status color roles (success / warning / danger) |
| Messages | Row status pill | `PM:383-389`, `PM:278-285` | text 12 / `'400'`, `primary` on `secondary`, `padding 5`, `borderRadius 5`, `mRight 5`, 1 line | Order status | `chip` / `badge` (status); one color for every status here |
| Messages | Row text block | `PMs:14-24` | `margin-horizontal 5px`, `max-height 60px`, `bottom 10px` when the timer shows | Layout | Layout |
| Messages | Footer skeleton | `PMf:41-43` | 2 skeleton rows while loading more | Loading more | `skeleton` |
| Messages | "Load more orders" | `PMf:22-37,50-58` | `OButton` bg/border `primary`, `borderRadius 7.6`, `height 44`, `marginRight 10`, `marginBottom 10`, `marginTop 5`; text white, `fontFamily 'Poppins'`, `fontWeight 'normal'`, `fontSize 18` | Next page | `button` (primary); remove the hard-coded family |

### Chat screen

| Screen / component | Element | file:line | Values today | Function | Proposal (component, token or key) |
|---|---|---|---|---|---|
| Chat | Screen wrapper | `pChat:31-38,42-44` | `KeyboardAvoidingView behavior="padding"`; module sheet `{flex:1}`; `SafeAreaContainer` bg `backgroundPage` | Keyboard and insets | Behaviour; surface role |
| Chat | Loading skeleton | `OM:158-160` + `shared/ChatMessageSkeleton:80-153` | header (36 / 40 bones, hairline border `borderTops`, white), 5 bubbles (`inputDisabled` / `secondary`, radii 30 / 0, `maxWidth 78%`), toolbar (32 round, 40 high radius 15, 44×44 radius 15) | Loading | `skeleton`; it copies the bubble and header values by hand |
| Chat | Header bar | `OM:164`, `OMs:3-11` | row, `padding-horizontal 12px`, `padding-vertical 10px`, `border-bottom-width 1px` `borderTops`, bg `white` | Top bar | `header` |
| Chat | Back button | `OM:165-171`, `OM:129-139` | `OIconButton` `theme.images.general.arrow_left`, icon 22×22; 36×36, `borderWidth 0`, bg/border/shadow `clear`, `paddingLeft/Right 0`; `tintColor textGray` sits in the view style (no effect on the image; `iconColor` is not passed) | Back | `header` back button |
| Chat | Header avatar | `OM:173-196`, `OMs:21-30`, `OM:140-145` | 40×40, `border-radius 20px`, bg `gray100`, `margin-right 12px`; image 40×40 cover | Business logo (customer photo in the unreachable branch) | Avatar / logo frame: one component |
| Chat | Header title | `OM:198-206` | OText `size 17`, `weight "700"`, `textGray`, left, 1 line | Business name or "Order No. N" | Text preset (header title) |
| Chat | Header subtitle | `OM:207-209`, `OM:149-153` | OText `size 12`, `unselectText`, `marginTop 2`, 1 line: "Business · Order No. N" | Context | Text preset (caption), secondary text role |
| Chat | Chat surface | `CH:1205`, `CHs:3-6` | bg `theme.colors.white` | Background | Surface role |
| Chat | Message list paddings | `CH:1217-1222`, `CH:1235` | content `paddingHorizontal 22`, `flexGrow 1`; `messagesContainerStyle {paddingBottom 25}` | Layout | Space tokens |
| Chat | Bubble (others) | `CH:998-1010` | bg `theme.colors.inputDisabled`; `padding 5`; radii TL 30 / TR 30 / BR 30 / BL 0; container `marginVertical 5`, `marginLeft 3`; library adds `marginRight 60`, `minHeight 20`, 3 pt corner between consecutive messages (`lib:gifted/Bubble:19-31`) | Incoming message | Chat bubble as its own component (color role, radius token) |
| Chat | Bubble (mine) | `CH:1000,1011-1018` | bg `theme.colors.secondary`; `padding 5`; radii TL 30 / TR 30 / BL 30 / BR 0; `marginRight 3`; library `marginLeft 60` | Outgoing message | Same component, "mine" variant |
| Chat | Bubble text | `CH:994-997` + `lib:gifted/MessageText:10-41` | left: library `black`, 16 / lineHeight 20, margins 5 / 10, system font; right: `theme.colors.textGray`; links underlined `black` (left) / `white` (right) | Message body | Text preset (body) with the app's family; link color by role |
| Chat | Sender name | `CH:1110-1125` | OText default + `weight "700"`, `paddingHorizontal 10`: "Name (Role)", only on others' messages | Who wrote | Text preset (label) |
| Chat | Message time | `CH:966-970`, `CH:271-276` | OText 12, `paddingLeft 12`, `paddingRight 5`, `theme.colors.unselectText`, format `hh:mm A` | Time | Text preset (caption) |
| Chat | "Sent to" row | `CH:1052-1108`, `CH:238-253` | `marginBottom 10`, aligned to the bubble's side; label OText `size 9`, `textGray`; avatars 17×17, `borderRadius 30`, bg `white`, `marginLeft 4`, `paddingHorizontal 3`; icon 16×16 `borderRadius 50`, stretch | Who can read the message | Text preset (caption, 9 is off the scale); avatar component (small) |
| Chat | Message image | `CH:1024-1027`, `CH:1233` + `lib:gifted/MessageImage:7-19` | library: 150×100, `borderRadius 13`, `margin 3`, cover, opens a Lightbox | Attached photo | Third-party defaults: radius token + image size when the bubble becomes a primitive |
| Chat | Day separator | none passed (`lib:gifted/Day:9-22`) | library: 12 / `'600'` / `#b2b2b2`, `marginTop 5`, `marginBottom 10`, format `ll`, locale `en` | Date between days | Third-party default: text preset (caption) + `divider`-like separator; localise |
| Chat | Console message (order change) | `CH:390-438`, `CH:254-264` | pill bg `theme.colors.inputChat`, `paddingVertical 10`, `paddingHorizontal 32`, `borderRadius 30`, fixed `width 320`; text 16 `textGray` centered, up to 4 lines; time OText `size 10`, color `'#aaa'`, left. Passed as `text` of a system message, so the library wraps it in its own `Text` 12 / `'300'` / `#b2b2b2` (`lib:gifted/SystemMessage:14-19`) | Status changes, driver assignment, prep time changes | A notice component (`card` / `chip`-like); text presets; hidden for drivers when `configs.order_logbook_enabled === '0'` (`CH:567-569`) |
| Chat | Console image | `CH:430-432`, `CH:265-270` | `OIcon` with `uri`, 240×180, `borderRadius 10`, `marginTop 10` | Photo attached to a status change | Image box = layout; radius token |
| Chat | First message "Order placed for … Via …" | `CH:491-517` | column, `width = min(window side) − 60`; same pill without horizontal padding; date in `fontWeight 'bold'`; below: "Sent to:" 9 / `textGray` + 17×17 avatars (`CH:440-478`) | Thread start | Same notice component |
| Chat | Scroll-to-bottom | `CH:1029-1031`, `CH:1224,1234` + `lib:gifted/MessageContainer:32-47` | MaterialCommunityIcons `chevron-double-down` 32, color `theme.colors.textNormal` (**undefined**); library wrapper 40×40 white circle, `opacity 0.8`, `right 10`, `bottom 30`, shadow black 0.5 / 1 | Jump to the latest message | `button` icon shape (floating) — same function family as `OFab` |
| Chat | Loading earlier | `CH:1238-1241` | `ActivityIndicator size="small"`, `theme.colors.black` | Loading | `spinner` |
| Chat | Input toolbar | `CH:799-811`, `CH:218-221`, `CH:1237` + `lib:gifted/InputToolbar:9-24` | library: hairline top border `#b2b2b2`, bg white; app: `padding 10`, `flexDirection column-reverse`; primary row centered, space-between; accessory `position relative`, `marginBottom 45` (library height 44); `minInputToolbarHeight 145` | Composer area | Its own bar: surface + `divider` color by role, space tokens |
| Chat | Recipients row | `CH:631-760`, `CH:222-237`, `CHs:8-12` | horizontal `ScrollView`; each `Pressable`: row, `marginRight 25`, `opacity 1` or `0.25`; ring 33×33, `borderRadius 30`, `paddingHorizontal 3`, bg `clear`, `shadowColor shadow` or `brightness`; avatar 32×32, `borderRadius 32`, stretch; texts `margin-left 11px`: name OText `size 16`, `weight "600"`; role OText `size 13`, `unselectText`. A driver sees Business and Customer only (`CH:637,719`) | Choose who receives the message | Selectable avatar chip (`chip` with avatar, selected / unselected); opacity token for "off" |
| Chat | Quick-message chips | `CH:761-785`, `CH:277-285`, `CHs:14-16` | horizontal `ScrollView`, `margin-top 8px`; `OButton` `bgColor white`, `borderColor tabBar`, `borderWidth 1`, `height 32`, `borderRadius 50`, `marginRight 10`, `paddingLeft/Right 0`; text 14 / `'400'` / `textGray` (family `theme.fonts.special`). `backgroundColor '#E9ECEF'` in the style is overridden by `bgColor`. Texts come from `DRIVER_MESSAGE_1..4` | Insert a canned text | `chip` |
| Chat | Composer field | `CH:831-866` + `lib:gifted/Composer` | wrapper `height 44`, bg `inputChat`, `borderRadius 15`, `paddingRight 10`, `marginRight 8`; input `color '#010300'`, bg `inputChat`, `borderRadius 15`, `borderWidth 0`; library 16 / lineHeight 16, `marginLeft 10`, system font; placeholder `theme.colors.composerPlaceHolder`; single line | Write a message | `input` |
| Chat | Signature toggle | `CH:868-878` | `TouchableOpacity` + `OIcon` `theme.images.general.pen` 22×22 | Open the signature pad | `button` icon shape + icon primitive |
| Chat | Image picker button | `CH:880-896`, `CH:197-204` | container 44×44; `OIconButton` `borderColor transparent`; icon `imageChat` 28×28, or the picked image 32×32 `borderRadius 10` | Attach a photo | `button` icon shape; image preview radius token |
| Chat | Remove picked image | `CH:898-915` | `TouchableOpacity` absolute `top −5`, `right −5`, bg `white`, `borderRadius 25`; MaterialCommunityIcons `close-circle-outline` 24, `backgroundDark` | Remove the attachment | `button` icon shape (small) / `badge`-like close |
| Chat | Send | `CH:923-964`, `CH:205-213` | library `Send` container 44×44, `borderRadius 15`, transparent; `OIconButton` 44×44, `borderRadius 15`, `borderWidth 0`, bg `primary`; icon `send` (22×22 primitive default), `top 1`; disabled: `opacity 0.6`, `disabledColor white` (overridden by the style's `primary`) | Send | `button` icon shape (primary), disabled from the theme's disabled state |
| Chat | "Chat ended" notice | `CH:816-829` | column centered; MaterialCommunityIcons `close-octagon-outline` 24, no color; OText `size 14` | Order finished: no more messages (statuses 1, 2, 5, 6, 10, 11, 12, 15, 16, 17, `CH:102-103`) | Notice box (`alert`-like) + icon color role |
| Chat | Signature pad | `CH:1127-1199` | footer `height 120`, `paddingHorizontal 30`, `paddingVertical 10`, top border 1 `tabBar`; `SignatureScreen backgroundColor theme.colors.composerView`; `webStyle` CSS string (`border-radius 10px`, `background-color: red`, `color: #FFF` on a hidden footer) | Draw a signature to send as image | Third-party (WebView): feed colors from the theme into the CSS string |
| Chat | Clear signature | `CH:1184-1196` | `TouchableOpacity` absolute `right 35`, `top 15`; MaterialCommunityIcons `close` 24, `textGray` | Clear | `button` icon shape |
| Chat | Message-options sheet | `CH:1245-1251` + `shared/OBottomPopup:49-71` | RN `Modal` fade; backdrop `#000000AA`; sheet `#FFFFFF`, top radii 20, `paddingHorizontal 20`; app adds `paddingBottom 28`; title = RN `Text` 20 bold `marginVertical 15`, overridden to `fontSize 16`, centered (phone number or "Message options") | Long-press on a bubble | `sheet` |
| Chat | Sheet buttons Copy / Call / Text | `CH:1253-1291` | wrapper `width '70%'`, centered; `OButton` bg/border `primary`, text `white`, `parentStyle {width '100%', marginBottom 12}`; primitive height 50, radius 10 | Copy text, call or SMS a detected phone | `button` (primary) |
| Chat | Sheet button Cancel | `CH:1292-1299` | `OButton` bg `inputDisabled`, border `tabBar`, text `black`, `marginBottom 24` | Close | `button` (secondary / neutral appearance) |
| Chat | Removed-from-order alert | `OM:224-230` | `Alert.alert` | Error | System alert |

## Duplicates (same function, different implementation)

| Function | Implementations (file:line) | Visible differences |
|---|---|---|
| Map pin with an avatar | `MV:229-245`, `RM:86-104`, `DM:400-412`, `GM:322-337`; the two style entries (`image`, `view`) are copied 4 times: `MV:28-40`, `RM:13-25`, `DM:284-294`, `GM:263-273` | FastImage cover (`MV`, `RM`) vs `OIcon` contain (`DM`, `GM`); different fallback images; `RM` hides the avatar when there is no image |
| Driver's own position marker | `MV:221-246` (pin + photo), `DM:414-429` (white circle + `cursor-fill.png`), `DM:432-439` (library red pin) | Three looks for "me" |
| Full-screen map with its own chrome | `MV:43`, `DM:20`, `GM:19` | Each has its own close button, FABs, callouts and error alert; `DM` and `GM` share the type `GoogleMapsParams` and duplicate `calculateDistance`, `setMapErrors`, `mapErrors` |
| Close button of a map modal | `DM:344-351` (right, 48×48, `top 10`), `GM:422-429` (left 15, 32×32) | Side and size |
| Marker callout | `RM:108-142` (width 200, padding 5, 14 px, underlined link), `GM:353-382` (width 250, 16 px, primary button) | Width, type size, action style |
| "Open in another maps app" | `DM:507-526` (map-link `Popup` modal), `GM:340-350` (`showLocation` system sheet) | Library modal vs system sheet; `naverCallerName` `'co.ordering.delivery'` vs `'com.businessapp'` |
| Floating round button over content | `OFab` zoom (`MV:249,259`), `OFab` fit / center (`DM:444,455`), gifted-chat scroll-to-bottom (`CH:1029` + library wrapper) | 30 pt black vs 40 pt white at 0.8 opacity; MaterialCommunityIcons vs Ionicons |
| Chat bubble | gifted `Bubble` styled at `CH:989-1020`; `shared/OChatBubble:8-62` (unused: radius 35, `primary` / `backgroundGray`, white text); `shared/ChatMessageSkeleton:45-60` (copies 30 / 0 radii and the two colors) | Three sets of values for one shape |
| Chat header | `OMs:3-11` (1 px border) vs skeleton header `shared/ChatMessageSkeleton:85-93` (hairline) | Border width jumps when loading ends |
| Avatar / logo of business, customer, driver | header 40 round (`OM:176-195`), recipients 32 round in a 33 ring (`CH:655-661,696-702,737-743`), "sent to" 16 in a 17 white circle (`CH:444-473,1069-1102`), list row 75×75 radius 7.6 (`PM:332-340`), map pins 25 round | Sizes 16 / 25 / 32 / 40 / 75; radius full vs 7.6; cover vs stretch vs contain |
| Fallback of those images | `src` = `!logo && dummies.businessLogo` (`CH:446,657-659`), `url` = `optimizeImage(photo \|\| dummies.customerPhoto)` (`CH:455-458`), `url` = `optimizeImage(photo) \|\| dummies.driverPhoto` (`CH:466-469`), `logo ?? dummies.businessLogo` (`PM:338`, `RM:68`), ternary (`OM:175-186`) | Five ways to write one fallback; a remote demo URL is the fallback for customer and driver |
| Unread badge | `PMs:33-41` (22 round, `secondary`), `CTs:33-37` (radius 4, `#e9f2fe`, dead) | Shape and color |
| List row of the messages tab | `PM:325-392`, `CT:116-209` (dead); the order list rows of the orders area that `OrderListItemSkeleton` imitates | Border and fixed height only in `PM` |
| "Load more" button | `PMf:22-37,50-58`, `CT:96-108,224-232` (dead), unused copy `MO:147-159` | Same values copied three times; margin 40 vs 10 |
| Selected / unselected pill | sort chip `MOs:19-27`, quick-message chip `CH:770-782`, status pill `PM:278-285`, recipients toggle `CH:638-676` | Heights 34 / 32 / text-with-background / 33; radius 50 / 50 / 5 |
| Separator | 5 pt band `tabBar` (`DM:371`), 1 px `borderTops` (`OMs:8-9`), 1 px `tabBar` (`CH:1173-1174`), 1 px literal `#e9ecef` (`MOs:11-12`, dead branch), hairline `borderTops` (skeletons), hairline `#b2b2b2` (library toolbar) | Widths 5 / 1 / hairline; three colors for the same grey line |
| Time-status colors | literals `PM:371-377` (`#00D27A`, `#FFC700`, `#E63757`) vs `theme.colors.green` / `red` used at `DM:540-541` | `#FFC700` has no theme key |
| Order status labels | `CH:105-133` (`ORDER_STATUS`), `PM:45-236` (`getOrderStatus`), `getOrderStatus` passed into `DM:38` | Different translation keys for the same statuses (content, not style) |
| Orientation / window size | `CH:172-194` (own state; adds a `Dimensions` listener on every render, state unused), `ui/src/hooks/DeviceOrientation.tsx:7` used at `MO:37`, `ui/src/layouts/SafeAreaContainer.tsx:56-68` | Three implementations; none changes the layout in this area |
| System error alert | `MV:273`, `DM:547`, `GM:396`, `OM:224` — all `OAlertOriginal` | Same; listed because each owns its `alertState` |

## Blocks and pieces

| Page | Block or piece | Hideable? Movable? | Why |
|---|---|---|---|
| Map tab | Zoom in / out buttons | Hideable; not movable (fixed corner) | Pinch zoom still works; they replace Android's native controls, which are off (`MV:198`) |
| Map tab | Business markers / customer markers | Hideable each (question) | Two independent loops (`MV:204`, `MV:212`); hiding both leaves only the driver |
| Map tab | Own-position marker | Not hideable | The screen's reference point |
| Map tab | Callout lines: address notes / city, zipcode, internal number | Hideable each | Already conditional on data (`RM:122-130`) |
| Map tab | Callout link | Not hideable | Only way into the order from the map |
| Driver map | Close button | Not hideable | Only exit on iOS (Android also has back) |
| Driver map | Order header (title + status + route + band) | Hideable as a block; pieces (status, route indicator, band) hideable each | Already conditional on `order` (`DM:352`); status already conditional on logistic rules (`DM:357`) |
| Driver map | Distance / time bar | Hideable | Informative; it covers the top strip of the map |
| Driver map | Fit / center buttons | Hideable each | Convenience; note their offsets are hard-coded against the accept bar |
| Driver map | "Show in other maps" | Hideable | External navigation; its position is hard-coded (`bottom 10 / 150`) |
| Driver map | Reject / Accept bar | Logic, not theme; Reject already obeys `configs.reject_orders_enabled` | Depends on the order status |
| Tracking map | Callout address lines, "Go to this location" | Lines hideable; the button is the callout's only affordance | — |
| Messages | Title | Hideable | No function |
| Messages | Sort chips | Hideable (list keeps the default sort `last_direct_message_at`) | Two options only |
| Messages | Row: logo, unread badge, meta line, timer, status pill | Hideable each; order of the text lines movable in principle, but the row has fixed heights (`height 100`, `max-height 60px`, `bottom 10px`) that assume today's lines | Removing a line leaves a gap; adding one overflows |
| Messages | "Load more orders" | Not hideable | Pagination |
| Messages | Empty state image | Hideable (text stays) | `NotFoundSource` supports it |
| Chat | Header avatar, subtitle | Hideable each | Title alone still identifies the chat |
| Chat | Recipients row | Hideable only with a decision: it decides who receives each message | Without it `canRead` keeps its default |
| Chat | Quick-message chips | Hideable | Renders nothing already when the list is empty |
| Chat | Signature button + pad | Hideable | Optional way to attach an image |
| Chat | Image button | Hideable | Optional |
| Chat | Sender name, time, "Sent to" avatars | Hideable each | Per-bubble metadata |
| Chat | Console messages and the first "order placed" message | Already a server flag: `configs.order_logbook_enabled` (`CH:567`) | Becomes a visibility key or stays a config (question) |
| Chat | Scroll-to-bottom | Hideable (`scrollToBottom` prop) | Convenience |
| Chat | Call / Text actions of the options sheet | Hideable each | Only shown when a phone number is detected |
| Chat | Day separators | Hideable (library `renderDay`) | — |
| Chat | Input toolbar order (accessory above, composer below) | Movable: today done with `column-reverse` + `marginBottom 45` | Fragile: sizes are compensated by hand |

## Images

| Key or source | file:line | Painted box | Fit | Fallback | alt |
|---|---|---|---|---|---|
| `theme.images.general.close` (`assets/icons/Close.png`, 128×128, 1.6 KB) | `DM:346`, `GM:424` | 48×48, 32×32 | RN default (cover; `OIconButton` sets none when enabled) | none | none |
| `theme.images.general.arrow_distance` (`assets/icons/Up_arrow.png`, 104×120) | `DM:475` | 26×26 (primitive default) | contain | none | none |
| `theme.images.general.driverImage` (`assets/images/cursor-fill.png`, 124×124) | `DM:424` | 25×25 in a white 25 circle | contain | none | none |
| `theme.images.general.arrow_left` (24×24) | `OM:166` | 22×22 | RN default | none | none |
| `theme.images.general.send` (25×25) | `CH:951` | 22×22 (primitive default) | RN default | none | none |
| `theme.images.general.pen` (19×19) | `CH:875` | 22×22 (upscaled) | contain | none | none |
| `theme.images.general.imageChat` (64×64) | `CH:887` | 28×28 | RN default | none | none |
| `theme.images.general.attach`, `pdfFile`, `docFile`, `imageFile` (64 / 48 px) | `CH:306-309,594` | 28×28 | — | — | Read only by dead code (`RenderActionsAttach`) |
| `theme.images.general.notFound` (`assets/images/not-found.png`, 279×279, 28 KB) | `MO:235` → `NotFoundSource/index.tsx:18` | 260×220 | contain | — | none |
| `theme.images.dummies.businessLogo` (`assets/images/dummies/store.png`, 512×512, 11 KB) | `RM:68`, `PM:338`, `CH:446,658,1073`, `OM:182` | 25×25, 75×75, 16×16, 32×32, 16×16, 40×40 | cover / stretch / contain by place | it is the fallback | none |
| `theme.images.dummies.customerPhoto` (remote URL string, `DeliveryApp.tsx:94-95`, Cloudinary demo account) | `RM:68`, `CH:456,698,1085`, `OM:190` | 25, 16, 32, 16, 40 | as above | it is the fallback; needs network | none |
| `theme.images.dummies.driverPhoto` (remote URL string, `DeliveryApp.tsx:92-93`, Cloudinary demo → freeiconspng) | `MV:241`, `CH:468,740,1099` | 25, 16, 32, 16 | as above | it is the fallback; needs network. At `MV:241` the string is given to FastImage's `source` without `{uri}` | none |
| API: `user.photo` | `MV:237-241` | 25×25 round | cover | `dummies.driverPhoto` | none |
| API: `business.logo`, `customer.photo`, `driver.photo` | `RM:68`, `PM:334-338`, `CH:445-470,656-742,1070-1099`, `OM:177-193` | see above | see above | dummies | none |
| API: `location.icon` / `locations[i].icon` | `DM:408`, `GM:330-333` | 25×25 round | contain | hard-coded remote URLs in `PreviousOrders/index.tsx:147-175` | none |
| API: `message.source` (photo in a message) | library `MessageImage` (`CH:543,1024`); console image `CH:431` | 150×100 radius 13; 240×180 radius 10 | cover; contain | none | none |
| Device: picked image preview | `CH:884-886` | 32×32 radius 10 | cover (`iconCover` is passed but the enabled branch ignores it) | `imageChat` icon | none |
| Library bundle: maps-app icons | `lib:maplink` `:118-121` | 50×50 round | — | — | none |

Findings: no image in the area has an accessibility label; the customer and driver fallbacks are third-party demo URLs, not bundled assets; `Close.png` is painted at two sizes; `pen.png` is smaller than its box; four theme image keys are read only by dead code.

## Off the scale or without a token

| Value | Where | Why it does not fit |
|---|---|---|
| `theme.colors.textNormal` | `CH:1030` | Key not defined in `theme.json`: the icon gets `undefined` |
| `#FFC700` | `PM:374` | "At risk" color, no theme key (theme `primary` is `#FFB700`) |
| `#00D27A`, `#E63757` | `PM:372,376` | Literals equal to `green` / `red` (`success500` / `danger500`) |
| `#010300` | `CH:850` | Input text color, one use |
| `#aaa` | `CH:433` | Console time color, one use (equals the library's `timeTextColor`) |
| `#0000006e` | `PM:257` | Shadow color with alpha; the shadow has no opacity or offset |
| `#e9ecef` / `#E9ECEF` | `MOs:12`, `CH:279` | Literal equal to `tabBar`; the first is in a dead branch, the second is overridden |
| `'black'`, `'white'` | `shared/OFab:25,27,39` (used at `MV:249,259`, `DM:444,455`) | FAB colors are literals in the primitive |
| `red`, `#FFF` | `CH:1146-1147` | Inside the signature WebView's CSS |
| OText default `#344050` | `shared/OText:6`; every OText in the area without `color` (about 20 places) | Literal equal to `textGray`, not read from the theme |
| Library colors `#b2b2b2`, `#aaa`, `black`, `white`, `#0084ff` | `lib:gifted/Color`, `Day`, `SystemMessage`, `MessageText`, `InputToolbar` | Painted by gifted-chat where the app passes no style |
| Library colors `#464646`, `#BBC4CC`, `#ACBBCB`, `#ECF2F8` | `lib:maplink:25-30` | Painted by map-link's `Popup` |
| Font 9 | `CH:510,1061` | Below `caption` (12) |
| Font 10 | `CH:433` | Below `caption` |
| Font 26 | `MO:121` | Between `h2` (24) and `h1`; fitted `h2` would take it |
| Font 17 | `OM:199` | 1 px over `body_lg`; only use in the area |
| Font 13 | `DM:486`, `CH:672,713,754` | Between `caption` and `body` |
| `lineHeight 16` on a 16 px input | `lib:gifted/Composer` (not overridden at `CH:845`) | Ratio 1.0 |
| Space 22 | `CH:1220` | Between `lg` and `xl` |
| Space 28 | `CH:1250` | Between `xl` and `xxl` |
| Space 32, 45 | `CH:396`, `CH:807` | 45 compensates the library's accessory height |
| Space 11 | `CHs:11` | One use |
| Space 25 | `CH:643,684,725` | 1 over `xl` |
| Space 3 | `PM:244,262`, `CH:234,243,999,1000` | Hair-thin nudges |
| Negative offsets −5, −1 | `CH:608-609,902-903`, `MO:132` | Overlap by hand |
| Radius 25 | `CH:612,906` | Between `xl` and `xxl`; it is a circle (should be full) |
| Radius 30 / 32 / 50 / 100 used as "round" | `CH:235,244,251,226`, `MV:29`, `RM:14`, `DM:285,299`, `GM:264`, `MOs:25`, `CH:278` | Five numbers for "full" |
| Radius 7.6 | `DM:304`, `GM:275`, `PM:251`, `PMf:24` | Fits only the fitted `sm` |
| Radius 15 | `CH:208,837,847,940` | Composer and send: only use of `lg` in the area |
| Radius 13 | `lib:gifted/MessageImage` | Library default |
| Radius 6, 22 | `LI:32`, `PMs:35` | Circles written as half / full size |
| Border 11 | `DM:318` | In an unused style |
| Band 5 | `DM:371` | A view used as a divider |
| Icon 50 | `MV:231`, `RM:88`, `DM:402`, `GM:324` | Far above `lg` (24) |
| Icon / image 48, 32, 28, 22 | `DM:347`, `GM:425`, `CH:223-225,596-597,891-892,1030`, `CH:876`, `OM:168` | Off the icon scale or between levels |
| Control heights 30, 32, 34, 35, 36 | `shared/OFab:37`, `CH:281`, `MOs:23`, `GM:376`, `OM:131-132` | Below 44; five different small heights |
| Fixed widths 320, 240×180, 200, 250, `window − 60`, `window − 42` | `CH:397`, `CH:266-267`, `RM:108`, `GM:353`, `CH:492`, `MO:170` | Layout numbers; 320 can exceed the list's width on a small phone |
| Fixed row geometry `height 100`, `max-height 60px`, `bottom 10px`, `marginBottom 30` | `PM:241-243`, `PMs:20-23` | Assumes today's exact lines |
| Offsets 75 / 35 / 180 / 140 / 280 / 240 / 150 / 10 | `MV:255,265`, `DM:449-451,460-462,498` | Positions tied to other elements' heights, per platform |
| `zIndex 9999`, `100` | `DM:311`, `MO:133` (+ `shared/OFab:36`) | No z scale |
| Opacity 0.25, 0.6, 0.8 | `CH:642,683,724`, `CH:946`, `shared/OFab:21` | Unselected / disabled / pressed written by hand |
| Shadow without opacity or offset | `PM:257-259`, `CH:651-653,692-694,733-735` | iOS paints nothing; Android `elevation 15` on a view with no background |
| `fontFamily: 'Poppins'` | `GM:368`, `PMf:32` (+ `CT:70,77,84,91,104` dead) | Hard-coded family; Poppins files are bundled per weight (`Poppins-Regular`…), so the bare name does not resolve on Android |
| Faux weights on `theme.fonts.special` (`Inter_18pt-Black`) | `shared/OButton:38-39` + `CH:775-779` (`'400'`), `GM:370`, `PMf:34` (`'normal'`) | One Black file asked for 400 / 700 |
| `minInputToolbarHeight 145` | `CH:1237` | Sum of today's accessory + composer by hand |
| Map camera numbers (`edgePadding 80 / 120`, deltas `0.001 / 0.01 / 0.1`, `2000` ms) | `MV:76-77,109`, `DM:231-234,254`, `GM:66-67,225` | Map behaviour, not theme |

## Text roles

| Look today (size / weight / line height / color / family) | Where | Role |
|---|---|---|
| 26 / 700 / — / `textGray` / Helvetica | `MO:120-124,165` | Screen title (tab) |
| 17 / 700 / — / `textGray` / Helvetica | `OM:198-206` | Header title (stack screen) |
| 12 / 400 / — / `unselectText` / Helvetica | `OM:207-209` | Header subtitle |
| 16 / 600 / — / `#344050` default / Helvetica | `DM:354`, `CH:665,706,747` | Section title; recipient name |
| 16 / 700 / — / status color or `primary` | `DM:360-365` | Status inside a title |
| 16 / 700 / — / `textGray` / Helvetica (explicit) | `PM:264-269,344` | List row title |
| 16 / bold / — / `#344050` | `GM:355` | Callout title (tracking map) |
| 14 / bold / — / `#344050` | `RM:109` | Callout title (map tab) |
| 16 / 400 / — / `#344050` | `GM:358-359` | Callout body (tracking map) |
| 14 / 400 / — / `#344050` | `RM:110-130`, `CH:828` | Body: callout lines, "chat ended" |
| 14 / 400 / — / `primary`, underlined | `RM:131` | Link |
| 14 / 400 / 20 / `#344050` | `LI:47-50,68-69` | Body: route names |
| 14 / 700 / — / `#344050` | `CH:1119` | Sender name |
| 14 / normal / — / white or black | `MO:139-143,214-220` | Chip label |
| 14 / 400 / — / `textGray` / Inter Black file | `CH:775-779` | Quick-message chip label |
| 13 / 400 / — / `unselectText` | `DM:484-490`, `CH:669-674,710-715,751-756` | Metadata: ETA; recipient role |
| 12 / 400 / — / `#344050` | `DM:478`, `PM:274-277,356-365` | Metadata: distance; "Order No. · date" |
| 12 / 400 / — / time-status literal | `PM:368-380` | Timer |
| 12 / 400 / — / `primary` on `secondary` | `PM:278-285,383-389` | Status pill |
| 12 / 400 / — / `primary` | `PM:270-273,349` | Badge count |
| 12 / 400 / — / `unselectText` | `CH:271-276,967` | Message time |
| 16 / 400 / — / `textGray`, centered; nested bold | `CH:261-264,401,494-506` | Console / system message |
| 10 / 400 / — / `#aaa` | `CH:433` | Console message time |
| 9 / 400 / — / `textGray` | `CH:510,1061` | "Sent to:" label |
| 16 / 400 / 20 / black (others) or `textGray` (mine) / system font | `lib:gifted/MessageText` + `CH:994-997` | Message body |
| 12 / 600 / — / `#b2b2b2` / system font | `lib:gifted/Day` | Date separator |
| 12 / 300 / — / `#b2b2b2` / system font | `lib:gifted/SystemMessage` (wraps the console view) | Library system text |
| 16 / 400 / 16 / `#010300` / system font; placeholder `composerPlaceHolder` | `CH:845-865` + `lib:gifted/Composer` | Input text |
| 16 / 700 / — / white / `theme.fonts.special` | `shared/OButton:33-41` used at `DM:500`, `CH:1254,1267,1280` | Button text |
| 16 / 700 / — / black / `theme.fonts.special` | `CH:1292-1298` | Neutral button text |
| 16 / normal / — / white / `'Poppins'` | `GM:366-372` | Button text (callout) |
| 18 / normal / — / white / `'Poppins'` | `PMf:30-36` | Button text (load more) |
| 18 / 700 / — / white / Helvetica | `FloatingButton/index.tsx:47-57,94-100` used at `DM:529` | Action-bar button text |
| 16 / bold / — / platform default color / system font, centered | `CH:1249` + `shared/OBottomPopup:67-71` | Sheet title |
| 16 `#464646`; 12 `#ACBBCB`; 16 bold `#464646`; 16 bold `#BBC4CC` / system font | `lib:maplink:262-292` | Directions sheet: title, message, row, cancel |
| 18 / 400 / — / `textSecondary`, centered | `NotFoundSource/index.tsx:30-35` used at `MO:227` | Empty-state text |

Families in play: Helvetica through `OText` (`theme.fonts.primary.name`); `Inter_18pt-Black` through `OButton` (`theme.fonts.special.name`); hard-coded `'Poppins'` (2 live uses); the system font wherever a library or a raw RN `Text` paints (message body, date separators, input, sheet title, directions sheet). Line height is set once in the whole area (`LI:49`).

## Buttons and touchables

| What | Primitive | file:line | Look | Size | Press feedback | Disabled look | Under 44 pt? |
|---|---|---|---|---|---|---|---|
| Zoom in / out | `OFab` → `TouchableOpacity` | `MV:249,259` | black circle, white glyph, shadow | 30×30 | `activeOpacity 0.8` | — | Yes |
| Fit route / center | `OFab` | `DM:444,455` | same | 30×30 | 0.8 | — | Yes |
| Marker, callout | react-native-maps `Marker` / `Callout` `onPress` | `RM:77,106`, `GM:316,339` | library | — | library | — | Marker art is 50 tall |
| Close driver map | `OIconButton` (styled `TouchableOpacity`) | `DM:345` | bare PNG | 40 high, icon 48×48 | RN default (0.2) | — | Height 40 |
| Close tracking map | `OIconButton` | `GM:423` | bare PNG | 40 high, icon 32×32 | RN default | — | Height 40 |
| Show in other maps | `OButton` | `DM:500` | primary filled | 50 high | `activeOpacity` comes from `OButton.defaultProps` (0.5), which React 19 ignores on function components | `isDisabled` not used | No |
| Reject / Accept | `FloatingButton` → styled `TouchableOpacity` | `DM:529` | red / green filled, radius 10 | 50 high, full width | RN default | `disabled` passed through with no visual change | No |
| Directions sheet rows / cancel | library `TouchableOpacity` | `lib:maplink:112,136` | library | 70 / ~60 high | RN default | — | No |
| "Go to this location" | `OButton` inside a `Callout` | `GM:363` | primary filled | 35 high | none of its own (callout handles the press) | — | Yes |
| Sort chip | `styled.Pressable` | `MO:208`, `MOs:19` | pill | min 34 high | none | — | Yes |
| Message row | `TouchableOpacity` | `PM:325` | bordered card | 100 high | `activeOpacity 1` (none) | — | No |
| Load more orders | `OButton` | `PMf:50` | primary filled, radius 7.6 | 44 high | see OButton note | — | No |
| Pull to refresh | `RefreshControl` | `PM:422` | platform spinner | — | — | — | — |
| Chat back | `OIconButton` | `OM:165` | bare PNG | 36×36 | RN default | — | Yes |
| Recipient toggle | `Pressable` | `CH:638,679,720` | avatar + two texts | ~33 high | none; off state `opacity 0.25` | — | Yes |
| Quick message | `OButton` | `CH:770` | white pill, 1 px border | 32 high | see OButton note | — | Yes |
| Signature toggle | `TouchableOpacity` | `CH:868` | bare PNG | 22×22 | RN default | — | Yes |
| Pick image | `OIconButton` in a 44×44 box | `CH:882` | bare PNG / thumbnail | primitive 40 high with `padding-horizontal 20px` inside a 44-wide box | RN default | — | Box is 44 |
| Remove picked image | `TouchableOpacity` | `CH:899` | white circle + glyph | 24×24 | RN default | — | Yes |
| Send | library `Send` (`TouchableOpacity`) wrapping `OIconButton` | `CH:927-962` | primary square, radius 15 | 44×44 | RN default | `opacity 0.6`; the primitive swaps to a plain `View` | No |
| Bubble long-press | library `TouchableWithoutFeedback` | `CH:992` | — | bubble | none | — | — |
| Message image | library Lightbox | `CH:1024` | — | 150×100 | library | — | No |
| Scroll to bottom | library `TouchableOpacity`, `hitSlop 5` | `CH:1029,1234` | white circle 0.8 | 40×40 (+5 slop) | RN default | — | 40 + slop |
| Clear signature | `TouchableOpacity` | `CH:1184` | glyph | 24×24 | RN default | — | Yes |
| Sheet: Copy / Call / Text / Cancel | `OButton` | `CH:1254,1267,1280,1292` | primary ×3, neutral ×1 | 50 high, 70% wide | see OButton note | — | No |
| Sheet backdrop | `TouchableWithoutFeedback` | `shared/OBottomPopup:30` | `#000000AA` | full | none | — | — |
| Tab strip item | `Pressable` | `MO:172` | — | — | — | — | Dead branch |

No touchable in the area has an `accessibilityLabel` or `accessibilityRole` (the library's `Send` sets its own).

## Icons

Icon sets imported in the area:

| Set | Alias | Import |
|---|---|---|
| FontAwesome5 | `Icon` | `MV:3`, `RM:4`, `DM:4`, `GM:6` |
| MaterialCommunityIcons | `MaterialCommunityIcon` | `CH:24` |
| MaterialCommunityIcons | `MaterialIcon` (through `OFab`'s `materialIcon` prop) | `shared/OFab:10`, used at `MV:250,260` |
| Ionicons | `Icon` (through `OFab`) | `shared/OFab:9`, used at `DM:445,456` |
| MaterialIcons | `MaterialIcon` | `CT:7` (dead) |

| Glyph | Set | Size | Color | file:line | Function |
|---|---|---|---|---|---|
| `map-marker` | FontAwesome5 | 50 | `theme.colors.primary` | `MV:230`, `RM:87`, `DM:401`, `GM:323` | Map pin |
| `plus`, `minus` | MaterialCommunityIcons | 20 | `"white"` literal | `MV:251,261` | Zoom |
| `globe-sharp` | Ionicons | 20 | `"white"` literal | `DM:445` | Fit route |
| `car-sport-sharp` | Ionicons | 20 | `"white"` literal | `DM:456` | Center on driver |
| `close-circle-outline` | MaterialCommunityIcons | 24 | `backgroundDark` | `CH:909` (`CH:615` dead) | Remove attachment |
| `close-octagon-outline` | MaterialCommunityIcons | 24 | none passed | `CH:824` | Chat ended |
| `chevron-double-down` | MaterialCommunityIcons | 32 | `textNormal` (undefined) | `CH:1030` | Scroll to bottom |
| `close` | MaterialCommunityIcons | 24 | `textGray` | `CH:1191` | Clear signature |
| `star`, `star-half`, `star-border` | MaterialIcons | 20 | `arrowColor` | `CT:156-194` | Rating (dead) |

PNG icons (through `OIcon` / `OIconButton`):

| Key | Box | Tint | file:line | Function |
|---|---|---|---|---|
| `general.close` | 48×48, 32×32 | none | `DM:346`, `GM:424` | Close |
| `general.arrow_left` | 22×22 | none (`tintColor` is set on the wrapper style, where it does nothing) | `OM:166` | Back |
| `general.arrow_distance` | 26×26 | none | `DM:475` | Distance |
| `general.driverImage` | 25×25 | none | `DM:424` | Driver cursor |
| `general.send` | 22×22 | none | `CH:951` | Send |
| `general.pen` | 22×22 | none | `CH:875` | Signature |
| `general.imageChat` | 28×28 | none | `CH:887` | Pick image |
| `general.attach` (+ `pdfFile`, `docFile`, `imageFile`) | 28×28 | `tintColor textGray` | `CH:594-598` | Attach a file (dead) |

Four "close" glyphs coexist (PNG `Close.png`, `close-circle-outline`, `close-octagon-outline`, `close`), and three sets draw the floating buttons. The only tinted PNG of the area is in dead code: every live PNG icon is painted with the file's own color.

## Theme keys read

Live files of the area (counts from `grep`, styled files included):

| Key | Count | Where (examples) |
|---|---|---|
| `colors.primary` | 21 | pins `MV:232`, `RM:89`, `DM:403`, `GM:325`; chips `MO:212`; send `CH:949`; sheet buttons `CH:1256` |
| `colors.white` | 17 | `DM:298,313,502`, `CH:245,611,772`, `CHs:5`, `OMs:10`, `MO:155,217`, `PMf:31` |
| `colors.textGray` | 15 | `MO:123,134`, `PM:266`, `CH:262,598,777,996,1061`, `OM:133,201`, `LI:35,44` |
| `colors.unselectText` | 7 | `DM:485`, `CH:275,671,712,753`, `OM:151`, `MO:184` |
| `colors.transparent` | 5 | `CH:209,592,848,883,948` |
| `colors.clear` | 5 | `CH:236`, `OM:134-136,167` |
| `colors.tabBar` | 5 | `DM:371`, `MO:212`, `CH:773,1173,1295` |
| `colors.inputChat` | 4 | `DM:320` (unused style), `CH:257,836,851` |
| `colors.black` | 4 | `CH:215` (unused style), `CH:1240,1297`, `MO:217` |
| `colors.backgroundPage` | 4 | `pMsg:30`, `PM:404,416,419` |
| `colors.backgroundDark` | 4 | `CH:610,617,904,911` |
| `colors.shadow` | 3 | `CH:652,693,734` |
| `colors.brightness` | 3 | `CH:653,694,735` |
| `colors.secondary` | 3 | `CH:1012`, `PM:281`, `PMs:34` |
| `colors.green` | 3 | `DM:541`, `GM:408,417` |
| `colors.red` | 2 | `DM:540`, `GM:416` |
| `colors.inputDisabled` | 2 | `CH:1004,1294` |
| `colors.gray100` | 2 | `PM:248`, `OMs:27` |
| `colors.borderTops` | 1 | `OMs:9` |
| `colors.composerView` | 1 | `CH:1181` |
| `colors.composerPlaceHolder` | 1 | `CH:865` |
| `colors.actionsIcon` | 1 | `CH:588` (dead) |
| `colors.textNormal` | 1 | `CH:1030` — **read, not defined in `theme.json`** |
| `fonts.primary.name` | 1 | `PM:267` (plus every `OText`) |
| `images.dummies.businessLogo` | 6 | `RM:68`, `PM:338`, `CH:446,658,1073`, `OM:182` |
| `images.dummies.customerPhoto` | 5 | `RM:68`, `CH:456,698,1085`, `OM:190` |
| `images.dummies.driverPhoto` | 4 | `MV:241`, `CH:468,740,1099` |
| `images.general.close` | 2 | `DM:346`, `GM:424` |
| `images.general.imageFile` | 2 | `CH:306,307` (dead) |
| `images.general.arrow_distance`, `driverImage`, `arrow_left`, `send`, `pen`, `imageChat`, `notFound` | 1 each | `DM:475`, `DM:424`, `OM:166`, `CH:951`, `CH:875`, `CH:887`, `MO:235` |
| `images.general.attach`, `pdfFile`, `docFile` | 1 each | `CH:594,308,309` (dead) |

Through the primitives the area also depends on `colors.inputSignup` (skeleton bones), `colors.textSecondary` (empty state), `colors.disabled` (OButton disabled), `fonts.special.name` (OButton text), `images.logos.logo` (OIcon's last fallback). Keys read only by the dead `Contacts` UI: `colors.arrowColor` ×3, `colors.orderTypeColor`, `colors.shadow`, `colors.primary` ×3, `colors.white`, `colors.unselectText`, `colors.textGray`, `images.general.notFound`.

Same value under several names in what this area reads: `inputChat` = `gray100` = `#F8F9FA`; `transparent` and `clear`; `green` = `success500`; `red` = `danger500`; `white` = `backgroundPage`; `tabBar` = the literal `#e9ecef`.

## Platform and window

| What | file:line | Branch or computation | Kind |
|---|---|---|---|
| Android native zoom controls off in the driver app | `MV:198` | `zoomControlEnabled={!(isDeliveryApp && Platform.OS === 'android')}` | Look (library chrome); the two FABs replace it |
| FAB offsets over the accept bar | `DM:449-451,460-462` | `bottom: showAcceptOrReject ? (ios ? 180 : 280) : 75` and `(ios ? 140 : 240) : 35` | Hand-made spacing per platform: should follow the bar's height |
| "Other maps" button offset | `DM:498` | `bottom: showAcceptOrReject ? 150 : 10` | Hand-made spacing |
| Close button inset | `DM:42,334,344`; `GM:47,283` | `marginTop: top` (inset) inside a `SafeAreaView`, plus `top: 10` in `DM` | Safe area by hand, possibly applied twice |
| Map aspect ratio | `MV:60-61`, `DM:46-47`, `GM:52-53` | `Dimensions.get('window')` → `ASPECT_RATIO` for map deltas | Behaviour |
| First-message width | `CH:172-177,492` | shorter window side − 60 | Size from the window |
| Orientation state | `CH:179-194` | `Dimensions.addEventListener('change')` called in the render body; the state is never read | No effect on the look |
| Tab strip width | `MO:37,170` | `dimensions.width − 42` passed to a styled view that ignores it; dead branch | None |
| Chat bottom inset | `CH:1202-1204` | `edges={isKeyboardVisible ? [] : ['bottom']}`; `hooks/useKeyboardVisible.ts:8-11` picks `keyboardWill*` on iOS, `keyboardDid*` on Android | Safe area + keyboard |
| Keyboard avoiding | `pChat:31-34`, `CH:1207` | `KeyboardAvoidingView behavior="padding"` on both platforms; `isKeyboardInternallyHandled={false}` | Behaviour |
| Chat safe area | `pChat:35` | `SafeAreaContainer edges top/left/right` | Safe area |
| Messages safe area and status bar | `ui/src/layouts/SafeAreaContainer.tsx:84-96` | insets top/left/right; `StatusBar barStyle = ios ? 'dark-content' : 'default'`; status bar background `danger500` when offline, `success500` for 2 s when back | Look (shared layout) |
| Map tab safe area | `MV:182` | `SafeAreaView` with all edges, inside a tab | Safe area |
| Accept bar inset | `FloatingButton/index.tsx:35-38,62-63` | iOS-only bottom padding from `useFloatingButtonInset` | Other area's component |
| Sheet max height | `shared/OBottomPopup:3,65` | module-level `Dimensions.get('window').height` | Primitive |
| Directions sheet max height | `lib:maplink:23,242` | `SCREEN_HEIGHT * 0.6` | Library |

No `Platform.select`, no `.ios.tsx` / `.android.tsx` file and no tablet branch in the area's files.

## Styles that cannot see the theme

| Kind | Where | Note |
|---|---|---|
| Module-level `StyleSheet.create` | `MV:20-41`, `RM:12-26`, `pChat:42-44` | Sizes, radius and positions only (no color); still frozen at import |
| `StyleSheet.create` inside the component body (rebuilt on every render; it does see the theme) | `pMsg:28`, `DM:278`, `LI:14`, `GM:258`, `CH:196`, `MO:113`, `PM:238`, `PMf:22`, `OM:128`, `CT:58` | 10 files |
| Inline `style={{` | `CH` 29, `DM` 12, `GM` 7, `MV` 4, `PM` 3, `MO` 2, `LI` 2, `RM` 1, `OM` 1, `CT` 1 | 62 in total |
| Other inline style objects (`textStyle`, `iconStyle`, `containerStyle`, `wrapperStyle`, `textInputStyle`, `parentStyle`, `contentContainerStyle`…) | `CH` 23, `DM` 2, `GM` 2, `PM` 2, `OM` 1 | 30 in total |
| CSS string for a WebView | `CH:1128-1149` | Signature pad: literal colors inside a template string |
| `defaultProps` on function components the area relies on | `shared/OText:60`, `shared/OButton:142-147` (`activeOpacity 0.5`, `indicatorColor 'white'`), `shared/OIcon:62-65`, `shared/OIconButton:127`; `PreviousOrders/index.tsx:575` | None declared in the area's own files |
| Components declared inside a render body | `PM:318` (`MessageComponent`, used as `renderItem`), `CH:440` (`AvatarsConsole`), `CH:581` (`RenderActionsAttach`) | New identity on every render |
| Style values hidden in props of primitives | `OText size/weight/color`, `OIcon width/height`, `OFab style` | Literals passed as props, not styles (the script lists them as `size` / `font_size`) |

## Third-party UI

| Library | file:line | What it draws | Props that carry styles |
|---|---|---|---|
| `react-native-maps` 1.13.2 (Google provider) | `MV:186`, `DM:376`, `GM:290` | Tiles, Google logo, Android zoom controls (`DM:388`, `GM:301`), default red pin (`DM:432`, `GM:390`), the native bubble around `title` (`MV:227`, `DM:399,438`, `GM:392`) and around custom `Callout`s (`RM:105`, `GM:338`) | `style` only; `customMapStyle` is not used. Not themable, except marker and callout content (app views) |
| `react-native-map-link` | `DM:3,507-526` (`Popup`), `GM:5,340` (`showLocation`) | `Popup`: a `react-native-modal` card (white, radius 10, header, app rows with 50×50 icons, separators, cancel). `showLocation`: system ActionSheet / Alert | `Popup` accepts `style={{container, itemContainer, image, itemText, headerContainer, titleText, subtitleText, cancelButtonContainer, cancelButtonText, separatorStyle, activityIndicatorContainer}}`, `customHeader`, `customFooter`, `modalProps` — the app passes only `modalProps.animationIn` |
| `react-native-gifted-chat` 2.1.0 | `CH:12-21,1206-1243` | The whole thread: list, day separators, bubbles, message text and links, images, avatars' slots, input toolbar, send, scroll-to-bottom | See the next table |
| `react-native-lightbox-v2` (inside gifted-chat) | through `lib:gifted/MessageImage` | Full-screen image viewer | `lightboxProps` (not passed) |
| `react-native-parsed-text` (inside gifted-chat) | through `lib:gifted/MessageText` | Underlined URLs, phones, e-mails in a message; a phone tap opens an action sheet with English titles `Call / Text / Cancel` | `linkStyle`, `optionTitles` (not passed) |
| `@expo/react-native-action-sheet` (inside gifted-chat) | provider in `lib:gifted/GiftedChat` | System-like action sheet for phone taps | — |
| `react-native-signature-canvas` (WebView) | `CH:27,1177-1183` | Drawing surface | `webStyle` (CSS string), `backgroundColor` |
| `react-native-fast-image` | `MV:10,235`, `RM:5,93`, `PM:3,332` | Images | `style`, `resizeMode` |
| `react-native-image-picker` | `CH:22,330` | System photo picker | — |
| `@react-native-documents/picker` | `CH:25,314` | System file picker | — (dead path) |
| `Alert.alert` through `OAlertOriginal` | `MV:273`, `DM:547`, `GM:396`, `OM:224` | System alert with Accept / Cancel | Not themable |
| RN `RefreshControl` | `PM:422` | Platform spinner | `tintColor` / `colors` (not passed) |
| RN `ActivityIndicator` | `CH:1240` | Spinner | `color` (`theme.colors.black`) |
| RN `Modal` | `shared/OBottomPopup:23`, `shared/OModal` (hosts both map modals) | Sheet / full-screen modal | Primitive's |
| App toast through `useToast` | `CH:345,352,1262` | Error / "Text copied" toast | Toast primitive (other agent) |

Every style the app passes into gifted-chat, and what the library still paints by itself:

| Library piece | Prop | file:line | Value passed |
|---|---|---|---|
| `GiftedChat` | `listViewProps.contentContainerStyle` | `CH:1217-1222` | `flexGrow 1`, `paddingHorizontal 22` |
| `GiftedChat` | `messagesContainerStyle` | `CH:1235` | `paddingBottom 25` |
| `GiftedChat` | `minInputToolbarHeight` | `CH:1237` | 145 |
| `GiftedChat` | `renderLoading` | `CH:1239-1241` | `ActivityIndicator` small, `theme.colors.black` |
| `GiftedChat` | `scrollToBottomComponent` | `CH:1234` | icon only; `scrollToBottomStyle` not passed → wrapper is the library's |
| `Message` | `containerStyle` | `CH:1039-1047` | right `{flexDirection:'column'}`; left `{flexDirection:'column-reverse', alignItems:'flex-start'}` (puts the "Sent to" row under the bubble) |
| `Bubble` | `textStyle` | `CH:994-997` | left `{}`; right `{color: textGray}` |
| `Bubble` | `containerStyle` | `CH:998-1001` | `marginVertical 5`, top corner 30, `marginLeft/Right 3` |
| `Bubble` | `wrapperStyle` | `CH:1002-1019` | colors, `padding 5`, radii 30 / 0 |
| `Bubble` | `renderTime` | `CH:993,966` | app `OText` |
| `Bubble` | `renderCustomView` | `CH:1223,1110` | app sender name |
| `Avatar` slot | `renderAvatar`, `showAvatarForEveryMessage`, `showUserAvatar` | `CH:1225-1226,1236` | app "Sent to" row; library container adds `marginRight / marginLeft 8` |
| `MessageImage` | — | `CH:1024-1027` | nothing: library defaults |
| `InputToolbar` | `containerStyle`, `primaryStyle`, `accessoryStyle` | `CH:805-807` | `padding 10` + `column-reverse`; centered + space-between; `position relative` + `marginBottom 45` |
| `Composer` | `textInputStyle`, `placeholderTextColor`, `textInputProps` | `CH:845-865` | colors, radius 15, no border; single line |
| `Send` | `containerStyle` | `CH:934` | 44×44, radius 15, transparent |
| `Actions` | `containerStyle`, `optionTintColor` | `CH:587-588` | dead: `renderActions` is never given to `GiftedChat` |
| Not overridden: `Day` (date separator), `SystemMessage` text wrapper, link style, username, ticks, bubble's 3 pt "grouped" corners and 60 pt side margin, `InputToolbar` hairline border `#b2b2b2` and white background, scroll-to-bottom wrapper, Lightbox, `locale` (`'en'`) and `dateFormat` (`'ll'`) | — | — | library defaults |

Per `lessons.md` 21 and `components.md` §1, the chat thread and the directions popup are "libraries that paint their own UI": each needs a decision in phase 2 (app primitive, or keep the library and pass every style from the theme).

## Motion

| What | file:line | Values |
|---|---|---|
| Skeleton bone pulse | `shared/SkeletonBone:27-41` (Messages list, chat skeleton) | `Animated.loop` of two `Animated.timing`, opacity 0.7 → 1 → 0.7, 700 ms each, per-bone `delay` (0–450 ms; rows staggered by `index × 60`) |
| Chat bubble skeleton pulse | `shared/ChatMessageSkeleton:24-43` | opacity 0.75 → 1 → 0.75, 700 ms each, delays 90 / 150 / 210 / 270 / 330 ms |
| Message-options sheet | `shared/OBottomPopup:24` | RN `Modal animationType='fade'` (platform duration) |
| Map modals | `shared/OModal` (`animationType="slide"`) | Platform duration |
| Directions sheet | `DM:512-514` | `react-native-modal` `animationIn: 'slideInUp'` (library default duration) |
| Map camera | `DM:227-235` | `animateToRegion(..., 2000)`; `animateCamera`, `fitToCoordinates({animated:true})` at `DM:207,245-257`, `GM:224-227,317`, `MV:103-111,116-128` with library durations — map behaviour |
| Marker redraw window | `DM:63-69` | `tracksViewChanges` true for 2500 ms after the icon changes — behaviour |
| Auto-fit poll | `DM:261-271` | `setInterval` 1000 ms — behaviour |

No `Animated` or `LayoutAnimation` in the area's own files; no reduced-motion handling anywhere in the list above.

## Dead code

| What | Where | How it was checked |
|---|---|---|
| `Contacts` UI component and its styles (38 inventoried literals, 5 hard-coded `'Poppins'`, literal `#e9f2fe`) | `CT:1-253`, `CTs:1-42` | `grep -rn "components/Contacts\|from '../Contacts'" src` (submodule and tests excluded) returns nothing; it is not in `ui/index.tsx`; only `Contacts/__tests__/Contacts.test.tsx` imports it. `MO:12` imports the **controller** `Contacts` from `@components`, not this file; its only JSX use is commented (`MO:255-267`) |
| `OChatBubble` primitive | `shared/OChatBubble.tsx` | `grep -rn OChatBubble src` → only its own file and its test; not exported by `shared/index.tsx` |
| Contacts tab and its tags (Businesses, Customers, Drivers) | `MO:40` (commented), `MO:54-56`, `MO:167-199`, `MO:255-267` | `tabs` has one entry, so `tabs.length > 1` is always false and `tabsFilter` is always `[0, 1]` |
| Styled components of the tab strip | `MOs:3-13` (`FiltersTab`, `TabsContainer`) | Used only inside the dead branch above |
| Unused style entries | `MO:125-127` (`icons`), `MO:144-146` (`pressable`), `MO:147-159` (`loadButton`, `loadButtonText`), `CH:214-217` (`bubbleText`), `DM:316-322` (`facOrderStatus`, the only use of border 11), `GM:259-262` (`map`), `LI:54` (`textBottom`, empty) | Script: for each key of each `StyleSheet.create`, `grep -c "styles.<key>"` in the same file = 0 (`textBottom` is referenced but empty) |
| File-attach flow: `RenderActionsAttach`, `handleDocumentPicker`, `attachIcons`, the `file` state | `CH:287-292,305-327,581-626` | `RenderActionsAttach` is declared and never referenced (`grep -n "RenderActionsAttach\|renderActions" CH` → declaration only); so `file.type` is never set and `attach`, `pdfFile`, `docFile`, `imageFile` images and `colors.actionsIcon` are never painted. `grep` of those image keys in `src` finds no other reader |
| Unused imports / values | `MO:14` (`WebsocketStatus`), `MO:37` (`dimensions`, only in the dead branch), `CH:91` (`getTimeAgo`), `CH:179` (`orientation`), `CH:87` (`readMessages`), `DM:3-4` are used; `DM:51` (`googleMapsApiKey`), `DM:55` (`parseDate`) | Read of each file |
| Overridden literal | `CH:279` (`backgroundColor: '#E9ECEF'`) | `OButton` spreads `style` then sets `backgroundColor: bgColor` (`shared/OButton:120-125`); the only user passes `bgColor` (`CH:772`) |
| Customer-chat branch of the header (`chatType === USER_TYPE.DRIVER`: customer photo, customer name, "Customer" subtitle) | `OM:51-57,187-195` | `grep -rn "OrderMessage" src`: the two navigations (`PM:42`, `OrderDetails/Delivery.tsx:332`) pass no `driver`, or `business: true, driver: false`; with the defaults at `OM:34-35` the type is always `BUSINESS` |
| Accept bar of the tracking map | `GM:404-421` | Only caller (`PreviousOrders/index.tsx:560-569`) does not pass `showAcceptOrReject` |
| Default pin of the tracking map and the editable-pin flow (`handleChangeRegion`, `geocodePosition`, `validateResult`) | `GM:103-199,390-393` | Only caller passes `readOnly` and `locations` |
| Roles other than driver inside the chat (admin / store quick messages, the Driver recipient toggle, `user.level !== 4` branches) | `CH:146-151,160-165,481-482,719-759,1093-1104` | The app logs in with `allowedLevels: [4]` (`CLAUDE.md`); these branches need another user level |

## Not verified

Nothing was run: no simulator, no device, no tests, no type check. Everything above is from code; the rows below need a device or files that were not read.

- **Not read:** the submodule controllers (`Messages`, `MapView`, `Contacts`, `OrderDetails`, `FloatingButton` in `src/@/components`) — only their names and the props the UI destructures; the test files of the area (only listed); `pages/RequestPermissions.tsx` (what the Map tab shows without location permission — assumed another area); `OrderDetails/Delivery.tsx` and `PreviousOrders/index.tsx` beyond the call sites of `DriverMap`, `GoogleMap` and the chat route; `hooks/useLocation`; `shared/OToast`, `shared/OAlert`, `WebsocketStatus`; the rest of `OModal` beyond how it frames the two maps; `react-native-lightbox-v2` and `react-native-modal` sources.
- **System / console messages:** the app passes a `View` as the `text` of a gifted-chat system message, which the library renders inside a `Text`. How that paints (alignment, the 320 pt fixed width on a 320–360 pt phone, the inherited 12 px grey) needs a device on both platforms.
- **`OIcon` default tint:** the primitive's styled image has `tint-color: primary` and then an inline `tintColor: props.color`; whether avatars and PNG icons without `color` end up untinted (as the app evidently shows them) was not confirmed on a device.
- **`OButton` press opacity:** `activeOpacity` comes from `defaultProps`, which React 19 ignores on function components; the real feedback (0.5 or RN's 0.2) was not observed.
- **Messages page padding:** `padding: 20` (`pMsg:31`) merged with the layout's explicit `paddingTop: 0` / `paddingBottom: 0`; the effective vertical padding was deduced, not seen.
- **Row logo shadow** (`PM:257-259`): iOS should paint none (no opacity), Android `elevation 15` on a box without background; not seen.
- **Recipient ring "shadow"** (`CH:651-653`): only `shadowColor` is set; expected to paint nothing.
- **Driver-map overlays:** whether the distance bar (absolute `top 0` of the map area) and the close button (`marginTop: inset` + `top 10` inside a `SafeAreaView`) overlap or double the inset; whether the FAB offsets 180 / 140 (iOS) and 280 / 240 (Android) clear the accept bar on small and large phones.
- **Pick-image button:** `OIconButton` keeps `padding-horizontal: 20px` inside a 44-wide box; overflow or clipping not seen.
- **`FastImage` with a string source** (`MV:241`, when the driver has no photo): expected not to load; not seen.
- **Custom callouts on Android** (rendered by the maps library as a bitmap): whether the texts, the underlined link and the `OButton` paint as on iOS.
- **`fontFamily: 'Poppins'`** (`GM:368`, `PMf:32`) on Android, and the weights asked of `Inter_18pt-Black` through `OButton`: actual glyphs not seen.
- **Scroll-to-bottom icon color** with the undefined `textNormal`.
- **Keyboard:** `KeyboardAvoidingView behavior="padding"` on Android together with gifted-chat's toolbar and `minInputToolbarHeight 145`.
- **Landscape, tablets, right-to-left, large font scale, dark mode:** no code for any of them in the area; behaviour unknown.
- **Directions popup contents:** which apps it lists and its look on each platform.
- **Images' real colors:** the PNG icons are painted untinted; their own colors (and so the contrast on today's surfaces) were not opened.
- **Counts:** theme-key counts come from a regex over the area's files; a key read through a variable would be missed (none was seen while reading).
