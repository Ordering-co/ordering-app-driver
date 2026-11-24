# New editor labels (for the Dashboard)

Keys the driver app's schema adds that the marketplace app's schema does not have, with
their English text. The Dashboard translates the editor from its own catalog
(`i18n/translations.json`): until its pull request adds these keys in every language, the
editor shows the English default below. Every other label of the schema reuses a key the
Dashboard already has, with the Dashboard's own text (a piece whose meaning differs from
the marketplace app's has its own key here, never a shared key with another text).

Status (2026-11-23): **every label below is pushed**: the eighth round's seven (`5af70478d`), and, in the last commit of the branch, `2c0de628e`
("editor labels for the driver app's order types, route and connection pill"), the ninth round's five and the twelve of round 12. **Pushed to the Dashboard, draft pull request Finitless-com/ordering-dashboard#574, waiting for review** (branch
`feat/driver-app-theme-editor-labels`). The branch has every key below in the Dashboard's 12 languages; its first three commits
(counted by the coordinator, not re-read here) add 8, 7 and 11 labels, change 2 texts and remove 1 label between them: the
third commit holds the 11 labels of the sizes round of 2026-11-19; a fourth, `5af70478d`, holds the 7 of the order card (2026-11-20). Its pull request goes in the same round as the schema's
first publish.

The list below is derived from the schema as it is on 2026-11-23 (after the status band): every
`BUILDER_THEME_*` key `product.schema.json` names (**675**, counted by reading every `"key"` of the file; 673 before round 13, 660 after the status band, 656 on 2026-11-20 and 650 before the
order card) that the Dashboard's `main` does not have, **111 keys** (87 of 2026-11-19, plus the 7 of the order card, less the one it
removed, plus the 5 of the status band, less `BUILDER_THEME_SLOT_POSITION`, plus the 12 of round 12 and the 2 of round 13); its English text is the schema's own `default`. The
Dashboard's `main` was not read for the five new keys: the count assumes it has none of them, and a `grep` of the local checkout of its `main` (not updated for this) found
none of `BUILDER_THEME_VARIANT_PRIMARY_SOFT`, `_DANGER_SOFT` and `_TYPE_DELIVERY`. A key the schema stops naming
leaves this list (and the branch, when nothing else uses it).

How the number was obtained: the Dashboard's `main` catalog was not read for this page. The list of 2026-11-18 (76 keys,
which was derived from the Dashboard's `main`) plus the 11 keys the sizes round adds (below) gives 87, and the 76 rows of the
earlier table were all still named by the schema (checked by comparing the table with the schema's keys). The schema names
12 keys that it did not name before this round: those 11 and `BUILDER_THEME_PROP_PHOTO_SIZE` ("Photo size", the label of
`order_request.base.photo_size`), which is also a key of the marketplace app's schema, so it is taken as one the Dashboard has and is not in the list (not
confirmed: the Dashboard's catalog was not read).

Changes of 2026-11-23, with the status band (ninth round): **added (5)**, all `BUILDER_THEME_VARIANT_*`, the labels of the new `badge` variants:
`PRIMARY_SOFT` ("Primary, soft"), `DANGER_SOFT` ("Error, soft"), `TYPE_DELIVERY` ("Order type: delivery, with a driver"), `TYPE_PICKUP`
("Order type: pickup, the customer collects") and `TYPE_IN_STORE` ("Order type: in the store"). **No longer named by the schema (1):**
`BUILDER_THEME_SLOT_POSITION` ("Delivery position"), because `order_card.slots.position` was removed; it leaves the list. The five new
labels were written on the branch `feat/driver-app-theme-editor-labels` and **are committed and pushed since, with the labels of
round 12 (`2c0de628e`: 238 added lines in `i18n/translations.json` and 17 in `dashboard-translations.json`, none removed; 17 keys in the 12 languages of its
catalog)**. The eighth round's seven labels are committed and pushed on that branch (`5af70478d`, pull request
Finitless-com/ordering-dashboard#574). **Left on the branch:** `BUILDER_THEME_SLOT_POSITION`, and `BUILDER_THEME_PROP_TIMER_ICON_SIZE`,
which the business app's schema still names (so it is not removed from the Dashboard).

Changes of 2026-11-23, with round 13: **added (2)**, `BUILDER_THEME_PROP_DOT_MAX_WIDTH` ("Status pill: maximum width", `components.badge.base.dot_max_width`, default 140, 80 to 320) and `BUILDER_THEME_PROP_LINE_NEXT_COLOR` ("Route line: color to the next stop", `components.map_marker.base.line_next_color`, default `{color.primary_pressed}`); **pushed** to the Dashboard branch in `ed2f8fae2` ("editor labels for the status pill's maximum width and the route's next leg colour"), the head of draft pull request #574. The route's other six labels keep their text.

Changes of 2026-11-23, with round 12 (the route, the connection pill and the switch): **added (12)**.
- The route's seven `map_marker` properties, all `BUILDER_THEME_PROP_*`: `STOP_SIZE` ("Stop: size", `map_marker.base.stop_size`), `STOP_NEXT_SIZE`
  ("Next stop: size"), `LINE_COLOR` ("Route line: color"), `LINE_WIDTH` ("Route line: width"), `LINE_NEXT_WIDTH` ("Route line: width to the next
  stop"), `LINE_DASH` ("Route line: dash length") and `LINE_GAP` ("Route line: gap between dashes");
- the visibility key `BUILDER_THEME_VIS_ITEM_ORDERS_ROUTE` ("Route button on the orders list", `visibility.orders.route`, group `orders`, editor
  order 14);
- the badge's dot, `BUILDER_THEME_PROP_DOT` ("Dot": `components.badge.variants.*_soft.dot`), `BUILDER_THEME_PROP_DOT_SIZE` ("Dot size":
  `badge.base.dot_size`) and `BUILDER_THEME_PROP_DOT_GAP` ("Dot gap": `badge.base.dot_gap`);
- `BUILDER_THEME_ICON_TILE_HELP` ("The tinted square with an icon at the start of a row, a sheet or an empty page."), the help text of
  `components.icon_tile`, whose own label key `BUILDER_THEME_COMPONENT_ICON_TILE` ("Icon tile") **the Dashboard's `main` already has**, and so does
  `BUILDER_THEME_LEVEL_LG` for its one size.
**Not added:** the switch's four size keys (`track_width`, `track_height`, `thumb_size`, `hit_width`) name no label key in the schema, so the editor
shows what it derives from the key; no catalog key was written for them. The five `badge` variants of the ninth round were already counted
in the 97. **Checked on 2026-11-23 by a script, again after round 13** (the schema's 675 `BUILDER_THEME_*` keys against the catalog `dashboard-translations.json` of the
local checkout of the Dashboard's `main` and of the branch at `2c0de628e`): 111 keys of the schema are not in that `main`, every one is in the table below
or in the prose above, and the branch (at `ed2f8fae2`) has all 675; the list in this page lost none of the earlier ones.

Changes of 2026-11-20, with the order card (eighth round): **added (7)** `BUILDER_THEME_VIS_ITEM_ORDERS_QUICK_ACTIONS` ("Quick actions
on the order card") and `BUILDER_THEME_VIS_ITEM_ORDERS_ABSOLUTE_TIME` ("Clock time on the order card"), the labels of the two new
`orders.*` visibility keys; `BUILDER_THEME_VARIANT_SUCCESS_SOFT` ("Success, soft") and `BUILDER_THEME_VARIANT_WARNING_SOFT` ("Warning,
soft"), the two new `badge` variants; `BUILDER_THEME_SLOT_ADVANCE` ("Accept and next step") and `BUILDER_THEME_SLOT_DECLINE`
("Decline (secondary)"), the two new `order_card` slots (their size, style, color and shape fields reuse keys the Dashboard has);
and `BUILDER_THEME_PROP_TITLE_TEXT` ("Title style", `order_card.base.title_text`). **Removed from the schema (1):**
`BUILDER_THEME_PROP_TIMER_ICON_SIZE` (the card's clock glyph is gone), which leaves the list. **The seven new labels were written in
the Dashboard's worktree on the branch `feat/driver-app-theme-editor-labels` (draft pull request Finitless-com/ordering-dashboard#574) and
are committed and pushed since (`5af70478d`)** (in the 12 languages of its catalog; the branch's two files have 105 added lines
and no removed one). The branch **still holds** `BUILDER_THEME_PROP_TIMER_ICON_SIZE`: removing it is left to that pull request.
The label of `orders.date` stays "Date" although it now only controls the clock time of orders that are over and a group's date; a new
text ("Date of finished orders") was proposed by the builder of the card and **not made** (no key or text changed).

Changes of 2026-11-19, with the sizes round: **added (11)**, the labels of the new size keys, all `BUILDER_THEME_PROP_*`:
`TRAILING_ICON_SIZE` ("Arrow icon size": `list_row` and `input`), `DETAIL_ICON_SIZE` ("Detail icon size"), `TALL_MIN_HEIGHT`
("Tall row height"), `COLLECT_MIN_HEIGHT` ("Cash to collect minimum height"), `QUANTITY_SIZE` ("Quantity box size"),
`HANDLE_HEIGHT` ("Handle height"), `VALUE_MIN_WIDTH` ("Number minimum width"), `PHOTO_TILE_HEIGHT` ("Photo tile height"),
`PHOTO_TILE_ICON_SIZE` ("Photo tile icon size"), `TIMER_ICON_SIZE` ("Timer icon size") and `TITLE_MIN_HEIGHT` ("Section title
minimum height"). The other new size keys reuse labels the schema already named. None removed, no text changed.

Changes of 2026-11-18, with the redesign:

- **Added (6):** `BUILDER_THEME_SLOT_SKIP` (the tutorial's Skip slot), `BUILDER_THEME_SHAPE_ROUND` and
  `BUILDER_THEME_ROUND_BUTTONS_HELP` (the round button shape), `BUILDER_THEME_MAP_MARKER_SHADOW_HELP` (the shadow of what
  floats over the map), `BUILDER_THEME_SLOT_REVIEW_ASSIGN` and `BUILDER_THEME_SLOT_REVIEW_ASSIGN_HELP` (the assign
  request's own Review button). The marketplace app's `BUILDER_THEME_SLOT_REVIEW` is no longer named by this schema.
- **Removed (4):** `BUILDER_THEME_ORDER_DETAILS_LAYOUT`, `BUILDER_THEME_ORDER_DETAILS_LAYOUT_HELP`,
  `BUILDER_THEME_OPTION_ORDER_FOCUS` and `BUILDER_THEME_OPTION_ORDER_LEGACY`, with the order's layout option (decision
  "One design, no legacy"); the Dashboard branch never had them.
- **Already in the list, missing on the branch until today:** `BUILDER_THEME_SLOT_STOP_MAP` and
  `BUILDER_THEME_SLOT_STOP_CALL` (the stop card's buttons).
- **Map markers as discs (2026-11-18, later):** **added (6)** `BUILDER_THEME_PROP_ME_COLOR` ("My position: color"),
  `BUILDER_THEME_PROP_ME_SIZE` ("My position: size"), `BUILDER_THEME_PROP_RING_COLOR` ("Ring color"),
  `BUILDER_THEME_PROP_RING_WIDTH` ("Ring width"), `BUILDER_THEME_PROP_SELECTED_RING_WIDTH` ("Selected ring width") and
  `BUILDER_THEME_PROP_SELECTED_SIZE` ("Selected size"), the labels of the new `map_marker` properties; **removed (1)**
  `BUILDER_THEME_PROP_AVATAR_SIZE` ("Photo size"), the picture inside the old pin, which no component of the schema has
  any more (the disc's glyph reuses the existing `BUILDER_THEME_PROP_ICON_SIZE` and `BUILDER_THEME_PROP_ICON_COLOR`,
  already in the Dashboard); the text of `BUILDER_THEME_MAP_MARKER_SHADOW_HELP` now also names the markers (same key).
- **Removed from the schema (2026-11-18, after the device passes), none of them in the list below (the Dashboard `main`
  has them, so they stay there until nothing else uses them):** `BUILDER_THEME_IMAGES_MAP_DRIVER` ("Driver"),
  `BUILDER_THEME_IMAGES_MAPS_TRACKING` ("Maps and tracking") and `BUILDER_THEME_IMAGES_MAP_MARKER_HELP` (the image
  `images.map.driver` and its card: the markers are discs, no marker reads a picture), and `BUILDER_THEME_PROP_MARK_COLOR`
  ("Mark color", `rating_scale.base.mark`: the review's scale is five separate segments, with no ticks). No key was added.
- **The delivery position of an order's card (2026-11-18, later):** **added (1)** `BUILDER_THEME_SLOT_POSITION`
  ("Delivery position"), the label of the new slot `order_card.slots.position` (its other labels, the size, style, color
  and the shape's "Round" option, reuse keys the Dashboard has or this list already holds). **Text changed (1)**
  `BUILDER_THEME_ROUND_BUTTONS_HELP`: a round button is a circle with only an icon and has fully round ends with a label
  (same key). None removed.
- A label whose key the schema names but whose text changed stays on its key (`BUILDER_THEME_ACCOUNT_PAGE_DRIVER_HELP` is
  "The space below…", since the header owns the space above).

| Key | English |
|---|---|
| `BUILDER_THEME_ACCOUNT_PAGE_DRIVER_HELP` | The space below the profile, sessions, payouts and Stripe account screens, and how their fields carry their label. |
| `BUILDER_THEME_COMPONENTS_APP_PARTS` | App parts and screens |
| `BUILDER_THEME_ICON_TILE_HELP` | The tinted square with an icon at the start of a row, a sheet or an empty page. |
| `BUILDER_THEME_COMPONENT_MAP_MARKER` | Map marker |
| `BUILDER_THEME_COMPONENT_NEW_ORDER_ALERT` | New order notice |
| `BUILDER_THEME_COMPONENT_ORDER_REQUEST` | Accept or reject an order |
| `BUILDER_THEME_IMAGES_EMPTY_NEW_ORDER` | New order notice |
| `BUILDER_THEME_IMAGES_EMPTY_SCHEDULE_BLOCKED` | Outside the schedule |
| `BUILDER_THEME_IMAGES_PLACEHOLDER_CUSTOMER` | Person without a photo |
| `BUILDER_THEME_MAP_MARKER_SHADOW_HELP` | What floats over the map keeps this shadow so it stands out from the tiles: the markers, the count, the buttons and the cards. Identity does not remove it. |
| `BUILDER_THEME_PAGE_SECTION_ACCOUNT_ROWS` | Schedule, sessions and payouts |
| `BUILDER_THEME_PAGE_SECTION_ACTION_BUTTONS` | Action buttons |
| `BUILDER_THEME_PAGE_SECTION_AVAILABILITY` | Availability |
| `BUILDER_THEME_PAGE_SECTION_CUSTOM_FIELDS` | Custom fields |
| `BUILDER_THEME_PAGE_SECTION_DELETE_ACCOUNT` | Delete account |
| `BUILDER_THEME_PAGE_SECTION_LANGUAGE` | Language |
| `BUILDER_THEME_PAGE_SECTION_LOGIN_BUTTON` | Login button |
| `BUILDER_THEME_PAGE_SECTION_LOGOUT` | Log out |
| `BUILDER_THEME_PAGE_SECTION_LOGO` | Logo |
| `BUILDER_THEME_PAGE_SECTION_ORDERS_LIST` | Orders |
| `BUILDER_THEME_PAGE_SECTION_ORDERS_SUMMARY` | Orders summary |
| `BUILDER_THEME_PAGE_SECTION_REVIEW` | Review the customer |
| `BUILDER_THEME_PAGE_SECTION_SEND` | Send button |
| `BUILDER_THEME_PAGE_SECTION_TITLE_AND_TEXT` | Title and text |
| `BUILDER_THEME_PAGE_SECTION_VEHICLE` | Spot and vehicle |
| `BUILDER_THEME_PROP_COLLECT_MIN_HEIGHT` | Cash to collect minimum height |
| `BUILDER_THEME_PROP_DETAIL_ICON_SIZE` | Detail icon size |
| `BUILDER_THEME_PROP_DOT` | Dot |
| `BUILDER_THEME_PROP_DOT_GAP` | Dot gap |
| `BUILDER_THEME_PROP_DOT_MAX_WIDTH` | Status pill: maximum width |
| `BUILDER_THEME_PROP_DOT_SIZE` | Dot size |
| `BUILDER_THEME_PROP_HANDLE_HEIGHT` | Handle height |
| `BUILDER_THEME_PROP_LINE_COLOR` | Route line: color |
| `BUILDER_THEME_PROP_LINE_DASH` | Route line: dash length |
| `BUILDER_THEME_PROP_LINE_GAP` | Route line: gap between dashes |
| `BUILDER_THEME_PROP_LINE_NEXT_COLOR` | Route line: color to the next stop |
| `BUILDER_THEME_PROP_LINE_NEXT_WIDTH` | Route line: width to the next stop |
| `BUILDER_THEME_PROP_LINE_WIDTH` | Route line: width |
| `BUILDER_THEME_PROP_ME_COLOR` | My position: color |
| `BUILDER_THEME_PROP_ME_SIZE` | My position: size |
| `BUILDER_THEME_PROP_PHOTO_TILE_HEIGHT` | Photo tile height |
| `BUILDER_THEME_PROP_PHOTO_TILE_ICON_SIZE` | Photo tile icon size |
| `BUILDER_THEME_PROP_QUANTITY_SIZE` | Quantity box size |
| `BUILDER_THEME_PROP_RING_COLOR` | Ring color |
| `BUILDER_THEME_PROP_RING_WIDTH` | Ring width |
| `BUILDER_THEME_PROP_SELECTED_RING_WIDTH` | Selected ring width |
| `BUILDER_THEME_PROP_SELECTED_SIZE` | Selected size |
| `BUILDER_THEME_PROP_STOP_NEXT_SIZE` | Next stop: size |
| `BUILDER_THEME_PROP_STOP_SIZE` | Stop: size |
| `BUILDER_THEME_PROP_TALL_MIN_HEIGHT` | Tall row height |
| `BUILDER_THEME_PROP_TIME_COLOR` | Time color |
| `BUILDER_THEME_PROP_TIME_TEXT` | Time style |
| `BUILDER_THEME_PROP_TITLE_MIN_HEIGHT` | Section title minimum height |
| `BUILDER_THEME_PROP_TITLE_TEXT` | Title style |
| `BUILDER_THEME_PROP_TRAILING_ICON_SIZE` | Arrow icon size |
| `BUILDER_THEME_PROP_VALUE_MIN_WIDTH` | Number minimum width |
| `BUILDER_THEME_ROUND_BUTTONS_HELP` | Round buttons: a circle when there is only an icon, like the send button of the chat; fully round ends when there is a label, like the delivery position of an order. |
| `BUILDER_THEME_SECTION_GROUP_DETAILS` | Details |
| `BUILDER_THEME_SHAPE_ROUND` | Round |
| `BUILDER_THEME_SLOT_ACCEPT` | Accept |
| `BUILDER_THEME_SLOT_ADVANCE` | Accept and next step |
| `BUILDER_THEME_SLOT_COPY` | Copy |
| `BUILDER_THEME_SLOT_DECLINE` | Decline (secondary) |
| `BUILDER_THEME_SLOT_MESSAGES` | Messages |
| `BUILDER_THEME_SLOT_REJECT` | Reject |
| `BUILDER_THEME_SLOT_REVIEW_ASSIGN` | Review button of an assign request |
| `BUILDER_THEME_SLOT_REVIEW_ASSIGN_HELP` | Only the assign request's screen draws it. In the order's details, Review customer is a button of the bottom bar. |
| `BUILDER_THEME_SLOT_SKIP` | Skip button |
| `BUILDER_THEME_SLOT_STOP_CALL` | Call button of the stop |
| `BUILDER_THEME_SLOT_STOP_MAP` | Map button of the stop |
| `BUILDER_THEME_VARIANT_DANGER_SOFT` | Error, soft |
| `BUILDER_THEME_VARIANT_PRIMARY_SOFT` | Primary, soft |
| `BUILDER_THEME_VARIANT_SUCCESS_SOFT` | Success, soft |
| `BUILDER_THEME_VARIANT_TYPE_DELIVERY` | Order type: delivery, with a driver |
| `BUILDER_THEME_VARIANT_TYPE_IN_STORE` | Order type: in the store |
| `BUILDER_THEME_VARIANT_TYPE_PICKUP` | Order type: pickup, the customer collects |
| `BUILDER_THEME_VARIANT_WARNING_SOFT` | Warning, soft |
| `BUILDER_THEME_VIS_ITEM_BOTTOM_NAV_LABELS` | Labels under the icons |
| `BUILDER_THEME_VIS_ITEM_BOTTOM_NAV_MAP` | Map tab |
| `BUILDER_THEME_VIS_ITEM_BOTTOM_NAV_MESSAGES` | Messages tab |
| `BUILDER_THEME_VIS_ITEM_BUSINESS_MAP_RECENTER_DRIVER` | Fit route and center buttons |
| `BUILDER_THEME_VIS_ITEM_CONFIRMATION_BUSINESS_EMAIL` | Store e-mail |
| `BUILDER_THEME_VIS_ITEM_CONFIRMATION_BUSINESS_PHONE_DRIVER` | Store phone |
| `BUILDER_THEME_VIS_ITEM_CONFIRMATION_ORDER_COPY` | Copy button |
| `BUILDER_THEME_VIS_ITEM_CONFIRMATION_ORDER_ETA_DRIVER_HELP` | The "Placed to" line of the order details: when the order is due. |
| `BUILDER_THEME_VIS_ITEM_CONFIRMATION_ORDER_ETA_DRIVER` | Scheduled date and time |
| `BUILDER_THEME_VIS_ITEM_CONFIRMATION_ORDER_MESSAGES` | Messages button |
| `BUILDER_THEME_VIS_ITEM_CONFIRMATION_ORDER_PAYMENTS` | Payments |
| `BUILDER_THEME_VIS_ITEM_CONFIRMATION_ORDER_TYPE` | Order type and payment method |
| `BUILDER_THEME_VIS_ITEM_CONFIRMATION_PRODUCTS_OPTIONS` | Product options |
| `BUILDER_THEME_VIS_ITEM_MAP_DISTANCE_BAR` | Distance and time |
| `BUILDER_THEME_VIS_ITEM_MAP_OTHER_MAPS` | Open in another maps app |
| `BUILDER_THEME_VIS_ITEM_MAP_ZOOM_CONTROLS` | Zoom buttons |
| `BUILDER_THEME_VIS_ITEM_MENU_SCHEDULE` | Schedule |
| `BUILDER_THEME_VIS_ITEM_MENU_SESSIONS_DRIVER_HELP` | Without this row the sessions screen cannot be reached. |
| `BUILDER_THEME_VIS_ITEM_MESSAGES_ORDER_CONSOLE_DRIVER_HELP` | Shown only when the project also keeps the order logbook on. |
| `BUILDER_THEME_VIS_ITEM_MESSAGES_SIGNATURE` | Send a signature |
| `BUILDER_THEME_VIS_ITEM_MESSAGES_SORT` | Sort options |
| `BUILDER_THEME_VIS_ITEM_MESSAGES_TITLE` | Title |
| `BUILDER_THEME_VIS_ITEM_ONBOARDING_SKIP` | Skip button |
| `BUILDER_THEME_VIS_ITEM_ORDERS_ABSOLUTE_TIME` | Clock time on the order card |
| `BUILDER_THEME_VIS_ITEM_ORDERS_ORDER_TYPE` | Order type |
| `BUILDER_THEME_VIS_ITEM_ORDERS_QUICK_ACTIONS` | Quick actions on the order card |
| `BUILDER_THEME_VIS_ITEM_ORDERS_REFRESH` | Refresh button |
| `BUILDER_THEME_VIS_ITEM_ORDERS_REVIEW_ORDER_BUTTON_DRIVER_HELP` | The button of a group of delivered orders. The order details keep their own review section. |
| `BUILDER_THEME_VIS_ITEM_ORDERS_REVIEW_ORDER_BUTTON_DRIVER` | Review customer button |
| `BUILDER_THEME_VIS_ITEM_ORDERS_ROUTE` | Route button on the orders list |
| `BUILDER_THEME_VIS_ITEM_ORDERS_SEARCH` | Search button |
| `BUILDER_THEME_VIS_ITEM_ORDERS_TITLE` | Title |
| `BUILDER_THEME_VIS_MAP` | Map |
| `BUILDER_THEME_VIS_ONBOARDING` | Tutorial |
