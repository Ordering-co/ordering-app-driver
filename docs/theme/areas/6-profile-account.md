## Area 6 — Profile and account

Phase 1 inventory, read-only. Nothing was run (no app, no simulator, no tests): every statement below comes from reading code. Values are today's literals.

Paths: pages are under `src/pages/`; everything else is relative to `src/ui/src/components/` unless it starts with `src/`. Shared primitives (`shared/*`), `LogoutButton`, `LanguageSelector`, `DriverSchedule`, `PhoneInputNumber`, `VerifyPhone`, `NotFoundSource` and the layouts belong to other agents: they appear here only for how this area uses or bypasses them.

Files read completely: `src/pages/Profile.tsx`, `Sessions.tsx`, `Payouts.tsx`, `StripeConnectAccount.tsx`; `UserProfileForm/{index,RemoveAccountModal,styles}.tsx`; `UserFormDetails/{index,styles}.tsx`; `Sessions/{index,styles}.tsx`; `Payouts/{index,styles}.tsx`; `StripeConnectAccount/{index,styles}.tsx`; `NotificationSetting/index.tsx`. Read for context: `LogoutButton`, `LanguageSelector`, `DriverSchedule`, `PhoneInputNumber`, `NotFoundSource`, `shared/{OText,OButton,OInput,OIcon,OIconButton,ONavbar,OModal,OBottomPopup,OAlertOriginal}.tsx`, `src/ui/src/layouts/{Container,SafeAreaContainer}.tsx`, `src/navigators/{HomeNavigator,BottomNavigator}.tsx`, the image manifest in `src/DeliveryApp.tsx:34-99`, `src/theme.json`.

Script literals in this area (`.theme-audit/inventory.csv`, 214 rows in 12 files): space 73, size 49, radius 33, font_size 28, border 13, font_weight 11, line_height 4, font_family 2, color 1. The four page files have 0 rows (their only values are theme reads).

### What the brief expected and is NOT in the code

| Expected | Found | How checked |
|---|---|---|
| Camera action on the photo | No. Only `launchImageLibrary` (gallery). No camera icon, no overlay, no action sheet | `UserProfileForm/index.tsx:114-139, 389-397`; `theme.images.general.camera` is read only by `AcceptOrRejectOrder/index.tsx:960` and `src/ui/src/hooks/useStatusImage.tsx:29` |
| Notification settings in the profile | No. `NotificationSetting` is a bottom popup rendered by the orders list, not by the profile | `grep NotificationSetting src` → `OrdersOption/index.tsx:1285`, `OrdersListManager/index.tsx:873` only |
| App version | No version text anywhere in the area | `grep getVersion|DeviceInfo|appVersion src` → only `src/utils/sentry.ts:11-15`, `PermissionsContext.tsx:35`, `PreviousOrders/OrderItem.tsx:104` |
| WebView in payouts / Stripe | No WebView. Stripe onboarding opens in the external browser with `Linking.openURL` | `StripeConnectAccount/index.tsx:118-138`; no `react-native-webview` import in the area |
| `VerifyPhone` in the profile | Not used here | `grep VerifyPhone src` → `LoginForm/index.tsx:709`, `SignupForm/index.tsx:512` only |
| Inline validation errors under each field | Only "passwords do not match" is inline; the rest goes to a toast as one string `- msg\n- msg` | `UserFormDetails/index.tsx:166-182, 432-436` |

### Screens

| Screen (route) | Registered / linked | Root container | Sticky | Blocks in render order |
|---|---|---|---|---|
| Profile (`Profile` tab) | `src/navigators/BottomNavigator.tsx:184-198` (`unmountOnBlur: true`) | `KeyboardAvoidingView` (`Profile.tsx:50-53`, `flex-grow: 1`, behavior ios `padding` / android `height`) → `SafeAreaContainerLayout` (edges top/left/right, `paddingHorizontal: 20` default, `src/ui/src/layouts/SafeAreaContainer.tsx:84-99`) → fragment: title `View` + one of three states. Loaded state is a `ScrollView` (`UserProfileForm/index.tsx:387`, `flex: 1`, no indicator) | The title "Profile" stays outside the scroll (fixed above it): `UserProfileForm/index.tsx:298-300` | 1 title · 2a error (`NotFoundSource`) or 2b skeleton or 2c scroll: photo → availability row → data (view) or form (edit) → Edit button → divider → Schedule row → Sessions row → Stripe account row → Payouts row → divider → language selector → logout → Remove account button → (modals: schedule, remove account) |
| Sessions (`Sessions`) | `src/navigators/HomeNavigator.tsx:77-81`; linked from `UserProfileForm/index.tsx:545` | Page `Container` (`Sessions.tsx:16`): RN `SafeAreaView` + `StatusBar` + `ScrollView` `noPadding` (`src/ui/src/layouts/Container.tsx:38-55`), background `white`. Inside it a second, nested `ScrollView` (`SessionsWrapper`, `Sessions/styles.tsx:3`) with `maxHeight: HEIGHT_SCREEN * 0.7` (`Sessions/index.tsx:121`) | None (navbar scrolls with the page) | navbar → (strategy `jwt_session`) skeleton ×5 / list of session cards + two destructive buttons / empty text → (other strategies) explanation + "Active sessions" button → system alert |
| Payouts (`Payouts`) | `HomeNavigator.tsx:87-91`; linked from `UserProfileForm/index.tsx:559` only when `stripe_connect_payouts_enabled` | `SafeAreaContainerLayout paddingHorizontal={0}` (`Payouts.tsx:14`) → `Container` `View flex:1` → `List` `ScrollView` (`Payouts/styles.tsx:36`) with `RefreshControl` | Navbar and status tabs are outside the scroll (fixed) | navbar → status tabs (4) → scroll: Stripe notice → payout cards → skeleton cards → error / empty → footer "Load more" |
| Stripe account (`StripeConnectAccount`) | `HomeNavigator.tsx:82-86`; linked from `UserProfileForm/index.tsx:553` and `Payouts/index.tsx:131` | `SafeAreaContainerLayout paddingHorizontal={0}` (`StripeConnectAccount.tsx:14`) → `Container` `View flex:1` → `Content` `ScrollView` (`StripeConnectAccount/styles.tsx:12`) with `RefreshControl` | Navbar fixed | navbar → skeleton card / error card + "Try Again" / status card (icon, title, description) + action button |
| Schedule (full-screen modal, not a route) | Opened from `UserProfileForm/index.tsx:537`, `OModal entireModal hideIcons customClose` at `:583-593` | `Modal animationType="slide"` (`shared/OModal.tsx:177`) → `DriverSchedule` `ScrollView` with `RefreshControl` (`DriverSchedule/index.tsx:72-79`) | None | navbar → today band → 7 day cards (other agent's component) |
| Remove account (modal) | `UserProfileForm/index.tsx:594-598` | RN `Modal transparent animationType="fade"` → `KeyboardAvoidingView` overlay → card (`UserProfileForm/RemoveAccountModal.tsx:121-200`) | — | title → step 1 question / step 2 text + password input + error → Cancel / Continue·Remove |
| Enable notifications (sheet) | Rendered by `OrdersOption/index.tsx:1285` and `OrdersListManager/index.tsx:873` (other areas) | `OBottomPopup` (`shared/OBottomPopup.tsx:23-45`): `Modal transparent animationType='fade'`, sheet pinned to bottom | — | title → text → "Enable notifications" button (opens system settings) |

Conditions that gate blocks (all in `UserProfileForm/index.tsx` unless noted):

| Condition | Line | Effect |
|---|---|---|
| `validationFields?.error && !loading` | 301 | Error state replaces everything under the title |
| `(formState?.loading \|\| sessionLoading) && !validationFields.error` | 315 | Skeleton. Also shown while a photo or the form is being saved (whole screen swaps to skeleton) |
| `user?.level === 4` | 400 | Availability row |
| `isShowDriverStatus` = `!configs.available_status_enabled \|\| value !== '0'` (`Profile.tsx:36`) | 414 | Toggle shown; when false the row only shows the text "You are not Available to receive orders" (key `NOT_AVAILABLE_TO_RECEIVE_ORDERS`) |
| `userState.loadingDriver` | 416 | Spinner instead of the toggle |
| `!isEdit` | 439 | View mode (disabled inputs) vs edit form (`UserFormDetailsUI`) |
| `allowDriverUpdateData` = `level !== 4 \|\| configs.allow_driver_update_data === "1"` | 84, 521 | Edit button. The photo touchable is NOT gated by it (389) |
| `!props.isBusinessApp` (prop never passed in this app → always true) | 536, 590 | Schedule row and its modal content |
| `isStripeConnectPayoutsEnabled` = `level === 4 && configs.stripe_connect_payouts_enabled === '1'` | 87, 551 | Stripe account row + Payouts row |
| `languagesState.languages.length > 1 && !loading` | `LanguageSelector/index.tsx:52` | Language selector (renders `false` otherwise) |
| `allowDeleteDriverAccount` = `level !== 4 \|\| configs.allow_delete_driver_account === "1"` | 85, 572 | Remove account button; `isDisabled` when `user.level === 0` (574) |
| `user?.session_strategy === 'jwt_session'` | `Sessions/index.tsx:102` | Sessions list vs "activate sessions" message |
| `payout.review_reason === 'no_driver_account'` in any payout | `Payouts/index.tsx:72, 120` | Stripe notice box |
| `showInputPhoneNumber` = `validationFields.fields.checkout.cellphone.enabled` | `UserFormDetails/index.tsx:60, 438` | Phone field in edit mode |
| `Object.keys(formState.changes).length > 0 \|\| both passwords typed \|\| loading` | `UserFormDetails/index.tsx:475-479` | "Update" button appears next to "Cancel" |

### Elements

| Screen / component | Element | file:line | Values today | Function | Proposal (component, token or key) |
|---|---|---|---|---|---|
| Profile page | Page background | `src/pages/Profile.tsx:53, 56` | `theme.colors.backgroundPage` (#FFFFFF) twice inline; default `paddingHorizontal: 20` from layout | Screen surface and gutter | Surface color role; screen gutter = space token (layout primitive) |
| Profile | Title wrapper | `UserProfileForm/index.tsx:272-277, 298` | `marginTop: 15`, `marginBottom: 10`, row, centered | Top bar of a tab root (no back) | `header` (title-only variant) |
| Profile | Title text "Profile" | `UserProfileForm/index.tsx:278-283, 299` | `theme.fonts.special.name` (Inter_18pt-Black), 26, weight 700, `textGray` | Screen title | `header` title → text preset (screen title). Differs from stack screens' 24 |
| Profile error | `NotFoundSource` | `UserProfileForm/index.tsx:302-312` | image `general.notFound` 260×220, text 18 `textSecondary`, button h 50 r 7.6 `primary` (`NotFoundSource/index.tsx:18-47`) | Validation-fields load error + retry | `empty_state` (error variant) with `button` |
| Profile skeleton | Wrapper | `UserProfileForm/index.tsx:316-319` | `backgroundColor: theme.colors.backgroundLight` (#F5F9FF, differs from page #FFFFFF) | Loading surface | `skeleton`; surface role = page surface (question: keep the blue tint?) |
| Profile skeleton | Avatar bone | `UserProfileForm/index.tsx:321-329` | 120×120, `borderRadius: 20` (real avatar: 123 circle) | Photo placeholder | `skeleton` (sizes stay layout; shape should match the avatar) |
| Profile skeleton | Small bone | `UserProfileForm/index.tsx:331-339` | 20×20, r 20 | Unclear (nothing of that shape in the loaded view) | `skeleton` — candidate to remove |
| Profile skeleton | 8 × (line 40% + line 100%) | `UserProfileForm/index.tsx:342-352` | `marginTop: 30` on the first, height 12 (library default), color `#efefef` + Fade `#dfdfdf` (library) | Label + field placeholder | `skeleton` (color global) |
| Profile skeleton | Button/row bones | `UserProfileForm/index.tsx:354-382` | 30% × 44 r 7.6 mt 20; 100% × 33 r 7.6 mt 20; 40% × 15 r 7.6 mt 5 | Edit button / rows placeholder | `skeleton` |
| Profile | Photo | `UserProfileForm/index.tsx:388-398` | `OIcon` 123×123, `borderRadius: 123`, `borderWidth: 1`, `borderColor: gray100` (#F8F9FA); `resizeMode` contain (no `cover`); wrapper `CenterView` (`UserProfileForm/styles.tsx:3-5`) | Driver's photo; tap opens the gallery | Avatar image (size = control/avatar size token, radius full, border role) inside an icon-less touchable → `button` shape or a dedicated avatar piece (question) |
| Profile | Availability row | `UserProfileForm/index.tsx:401-436`; `UserProfileForm/styles.tsx:21-26` | row, space-between, `margin-top: 20px`; label `OText` 14 / 700 / `textGray`, 2 lines, `adjustsFontSizeToFit`, inline `paddingHorizontal: 0` | Available / busy state | List row with trailing control; text preset (label) |
| Profile | Availability toggle | `UserProfileForm/index.tsx:419-432` | `toggle-switch-react-native`, `size="small"` (track 40 wide, padding 10, thumb 15×15, track radius 20 → about 55×35 pt), `onColor: primary`, `offColor: offColor` (#8c8b8d), thumb `white` (library default), `animationSpeed: 200` | Switch | A switch primitive of the app (not in components.md §1: flag). On = brand role, off = neutral role, thumb role, `motion` duration |
| Profile | Availability spinner | `UserProfileForm/index.tsx:417` | `ActivityIndicator size="small" color=primary` | Saving the state | `spinner` (small) |
| Profile view mode | Field label | `UserProfileForm/index.tsx:246-249, 449, 482, 496` | `OText` 14, weight 700, `textGray`, Helvetica | Label above each datum | `field` label → text preset (label) |
| Profile view mode | Read-only "input" | `UserProfileForm/index.tsx:250-259, 453-478, 486-494, 497-507` | `OInput isDisabled`, style: `marginVertical: 10`, `marginBottom: 20`, `borderWidth: 1.5` bottom only (top/left/right 0), `borderColor: tabBar` (#e9ecef), `borderRadius: 10`; text `textGray`, placeholder `arrowColor` (#B1BCCC); height 50 and `padding-horizontal: 16px` from `shared/OInput.tsx:12-23` | Shows name, lastname, email… as underlined rows | `field` in a read-only/underline variant, or plain label + value text (question: is the underline look wanted, different from edit mode's box?) |
| Profile view mode | Password row | `UserProfileForm/index.tsx:486-494` | placeholder literal `'·············'`, `placeholderTextColor: textGray` | Masked password | Same as above |
| Profile view mode | Phone row | `UserProfileForm/index.tsx:496-507` | `isSecured` on a phone, value only as placeholder `(code) number` or `t('NOT_PHONE')`, placeholder color `textGray` | Phone | Same as above |
| Profile edit mode | Form wrappers | `UserFormDetails/styles.tsx:3-17`; `UserProfileForm/index.tsx:512` | `UDForm` `margin-top: 20px` + `UDWrapper` `margin-top: 20px` (40 total; view mode has 20) | Form rhythm | Space tokens (form rhythm) |
| Profile edit mode | Text input | `UserFormDetails/index.tsx:221-228, 272-329` | `OInput` style: `marginVertical: 10`, `marginBottom: 20`, `borderWidth: 1.5` all sides, `borderColor: tabBar`, `paddingHorizontal: 10`, `borderRadius: 10`; `selectionColor: primary`, text `textGray`, placeholder `arrowColor` | Editable field | `input` + `field` (border, radius, focus from theme). No focus or error look today |
| Profile edit mode | Password / confirm | `UserFormDetails/index.tsx:343-371, 384-415` | Same input + eye icon `MaterialCommunityIcons` 24 `arrowColor`, pressable glyph | Password fields | `input` with trailing icon button |
| Profile edit mode | Inline error | `UserFormDetails/index.tsx:213-220, 432-436` | 16, weight/style normal, `theme.colors.error` (#C90800), `paddingHorizontal: 16`, `marginBottom: 20` | "Passwords do not match" | `field` error text → text preset + danger role. Two danger keys in the area: `error` #C90800 and `danger500` #E63757 |
| Profile edit mode | "Your previous cellphone" note | `UserFormDetails/index.tsx:448-453` | Same `errorText` style (red) for an informative note. Never shown today: `phoneUpdate` is always undefined here (see Dead code) | Hint | `field` helper text, or delete |
| Profile edit mode | Phone field | `UserFormDetails/index.tsx:438-447, 240-246`; `UserFormDetails/styles.tsx:29-32` | `PhoneInputNumber` with `flagProps`: `width: 79`, `borderWidth: 1`, `borderRadius: 7.6`, `marginRight: 9`, `borderColor: inputSignup` (#DEE2E6); wrapper `margin-bottom: 25px`. The phone box itself: h 50, r 7.6, border 1 `inputSignup`, bg `white` (`PhoneInputNumber/index.tsx:83-93`) | Phone with country | `input` phone variant (other agent's primitive). Its border 1 / r 7.6 / `inputSignup` differ from the sibling inputs' 1.5 / 10 / `tabBar` |
| Profile edit mode | Cancel button | `UserFormDetails/index.tsx:229-239, 462-473` | `OButton` `bgColor: white`, `borderColor: primary`, h 44, r 7.6, border 1; text `textGray` 16 weight normal | Leave edit mode | `button` outline, neutral/secondary |
| Profile edit mode | Update button | `UserFormDetails/index.tsx:480-500` | `bgColor: primary`, `borderColor: primary`, h 44, r 7.6, border 1, `marginLeft: 5`; text `white` 16 normal (`textGray` + label "Updating" while loading, drawn as `StyledButtonDisabled` bg `disabled` #CBCBCB) | Save | `button` filled primary, with loading state |
| Profile | Edit button | `UserProfileForm/index.tsx:260-271, 522-533`; `UserProfileForm/styles.tsx:14-19` | `bgColor: yellowSecondary` (#FFF4DA), `borderColor: yellow` (#FFB700) — these win over the `backgroundColor: white` / `borderColor: primary` in `styles.editButton`; h 44, r 10, border 1, `marginBottom: 25`; text `yellow` 14 | Enter edit mode | `button` tonal/soft primary, size md. `yellow` = `primary` and `yellowSecondary` = `secondary` in value: one role |
| Profile | Divider (2) | `UserProfileForm/index.tsx:535, 567` | Zero-height `View` with `borderWidth: 2.5`, `borderColor: tabBar` (paints a 5 pt band); margins `0/40` and `20/20` | Section separation | `divider` (section) + block space |
| Profile | Navigation row ×4 | `UserProfileForm/index.tsx:284-293, 537-564` | `Pressable`, h 60, `padding: 10`, `borderRadius: 10`, `marginBottom: 10`, bg `gray100` (#F8F9FA); inner row inline `space-between`, `width: '100%'` (×4 identical inline objects); label `OText size={16}` (default color literal `#344050`); no pressed feedback | Schedule / Sessions / Stripe account / Payouts | One list-row component (label + trailing chevron), `card`-like surface; pressed state from theme |
| Profile | Row chevron | `UserProfileForm/index.tsx:540, 548, 556, 562` | AntDesign `right` 18; Schedule row color `theme?.colors?.textNormal` (UNDEFINED → library default), the other three `gray200` (#ADB5BD) | Disclosure | `icon` (size level, color role: muted) |
| Profile | Actions wrapper | `UserProfileForm/index.tsx:568-571`; `UserProfileForm/styles.tsx:28-35` | `flex: 1`, `padding-vertical: 10px`, column, `align-items: flex-start` | Holds language + logout | Layout only |
| Profile | Language selector (use) | `UserProfileForm/index.tsx:569` | No props. Draws: container bg `inputChat` (#F8F9FA), r 7.6, mb 18, row padding 8, emoji flag 24, text 16 `unselectText`, PNG chevron 20 untinted (`LanguageSelector/index.tsx:46-83`, `styles.tsx:3-17`); opens `react-native-country-picker-modal` | Change language | `select` opening a `sheet` (other agent's component). Same surface color and near-same radius as the rows above, different height and text color |
| Profile | Logout (use) | `UserProfileForm/index.tsx:570` | `setRootState={props.setRootState}` (undefined: `Profile.tsx` does not pass it). Draws: `TouchableOpacity` row, `marginBottom: 40`, text `fontFamily: 'Poppins'` 16 / 600 / `textGray`, PNG icon 18 tinted `disabledContrast` (#000) (`LogoutButton/index.tsx:32-61`) | Log out | `button` (text/ghost with trailing icon) or a list row (question). Hard-coded family `Poppins` |
| Profile | Remove account button | `UserProfileForm/index.tsx:573-581` | `OButton` `bgColor: white`, `borderColor: danger500` (#E63757); default h 50, r 10, border 2 (`shared/OButton.tsx:13-26`); text 16 / lineHeight 24 / 700 / `danger500`; margins 10/10; disabled for admins → bg `disabled`, text stays `danger500` | Start account deletion | `button` outline danger |
| Remove account modal | Backdrop | `UserProfileForm/styles.tsx:44-49`; `RemoveAccountModal.tsx:121-127` | `theme.colors.shadow` (rgba(0,0,0,0.8)), `padding: 20px`, centered; `KeyboardAvoidingView` ios `padding` | Scrim | `modal` (overlay color role, motion) |
| Remove account modal | Card | `UserProfileForm/styles.tsx:51-55` | bg `white`, `border-radius: 10px`, `padding: 20px`; no shadow | Dialog surface | `modal` (dialog variant) / `alert` |
| Remove account modal | Title | `RemoveAccountModal.tsx:41-44, 129-131` | `OText size={20}`, weight 700, `textGray`, `marginBottom: 10` | Dialog title | Text preset (dialog title) |
| Remove account modal | Body | `RemoveAccountModal.tsx:133-140` | `OText` 14 `textGray` | Question / instruction | Text preset (body) |
| Remove account modal | Password input | `RemoveAccountModal.tsx:141-165`; `UserProfileForm/styles.tsx:57-61` | wrapper row h 50, `margin-top: 16px`; `OInput` border 1.5 r 10 (primitive defaults), `borderColor: tabBar` → `danger500` on error; placeholder `unselectText` (#909BA9); eye icon 24 `arrowColor`; disabled while checking | Confirm with password | `input` + `field` with error state (the only input in the area with an error border) |
| Remove account modal | Error text | `RemoveAccountModal.tsx:61-63, 166-170` | `OText size={13}`, `danger500`, `marginTop: 8` | Wrong password / required / network | `field` error text |
| Remove account modal | Actions | `UserProfileForm/styles.tsx:63-72`; `RemoveAccountModal.tsx:173-197` | row, `margin-top: 20px`, each `flex: 1; margin-horizontal: 5px` | Button row | Layout + space |
| Remove account modal | Cancel | `RemoveAccountModal.tsx:45-51, 175-184` | `bgColor: white`, `borderColor: tabBar`, r 10, h 50, border 2; text `textGray` 14 | Close | `button` outline neutral |
| Remove account modal | Continue / Remove | `RemoveAccountModal.tsx:52-60, 187-195` | bg + border `danger500`, r 10, h 50; text `white` 14; loading spinner `white` | Advance / delete | `button` filled danger with loading |
| Sessions page | Background | `src/pages/Sessions.tsx:16` | `theme.colors.white` (other three screens use `backgroundPage`); also sets `StatusBar` background | Screen surface | Surface role (same as the others) |
| Sessions | Navbar wrapper | `Sessions/index.tsx:99-101` | inline `paddingHorizontal: 20`, `paddingTop: ios 0 / android 15`; `ONavbar` title 24 / 700 `textGray` (`shared/ONavbar.tsx:29-34`) | Top bar with back | `header` |
| Sessions | Skeleton card ×5 | `Sessions/index.tsx:105-117` | `SessionItem` + lines 40%, 40%, 5%. Not wrapped in the `paddingHorizontal: 20` view that the loaded list has (cards span edge to edge while loading) | Loading | `skeleton` inside `card` |
| Sessions | Session card | `Sessions/styles.tsx:5-14`; `Sessions/index.tsx:123-145` | row, space-between, `border-width: 1px`, `border-color: tabBar`, `padding: 20px`, `border-radius: 10px`, `margin-bottom: 10px`; inner block inline `width: '80%'` | One session | `card` (outlined) |
| Sessions | Dates | `Sessions/index.tsx:126-127` | `OText` 14: `created_at` in `unselectText`, `valid_thru` in `textGray` | Created / valid thru (no labels) | Text presets (metadata, body) |
| Sessions | "Current" mark | `Sessions/index.tsx:129-131` | `OText` 14 `success500` (#00D27A), plain text | Marks this device's session | `badge` (success) or text with success role |
| Sessions | Delete one | `Sessions/index.tsx:133-143` | `TouchableOpacity`, `borderRadius: 10`, `padding: 5`, `borderWidth: 1`, `borderColor: tabBar`; AntDesign `close` 16 `gray200` → 28×28 pt | Close one session | `button` icon shape (outline neutral), min touch target |
| Sessions | Actions block | `Sessions/index.tsx:147` | inline `bottom: 0` (no effect without `position`), `padding: 20`, `width: '100%'`, bg `white`; sits inside the 20 pt gutter (buttons inset 40) | Bulk actions | Layout + space |
| Sessions | Delete all | `Sessions/index.tsx:148-156` | `bgColor: white`, `borderColor: danger500`, r 10, `marginTop: 10`, h 50; text `danger500` 14, `width: '100%'`, centered | Close all sessions | `button` outline danger |
| Sessions | Delete all except current | `Sessions/index.tsx:157-165` | bg + border `danger500`, r 10, `marginTop: 10`; text `white` 14 | Close the others | `button` filled danger |
| Sessions | Empty text | `Sessions/index.tsx:169` | bare `OText` 14 default color, no padding, no image | No sessions | `empty_state` |
| Sessions | Not enabled | `Sessions/index.tsx:174-185` | `OText` 14 + `OButton` default primary, `borderRadius: 7.6`, `marginTop: 20`; text `white` 14 | Activate sessions | `empty_state` with `button` filled primary |
| Sessions | Confirmations | `Sessions/index.tsx:187-194` | `OAlertOriginal` → `Alert.alert(title 'Ordering', message, [Accept, Cancel])` (`shared/OAlertOriginal.tsx:39-42`) | Confirm delete / enable | System alert: not themable. Or `alert`/`modal` like the remove-account dialog (question) |
| Payouts / Stripe pages | Background | `src/pages/Payouts.tsx:14`, `src/pages/StripeConnectAccount.tsx:14` | `backgroundPage` from the layout, `paddingHorizontal={0}` | Screen surface | Surface role |
| Payouts | Header | `Payouts/styles.tsx:8-10`; `Payouts/index.tsx:101-103` | `padding: ios 0px / android 15px` top, `20px` sides, `0px` bottom | Top bar with back | `header` |
| Payouts | Status tabs container | `Payouts/styles.tsx:12-18` | row, bg `inputChat` (#F8F9FA), `border-radius: 8px`, `margin: 0px 20px 15px`, overflow hidden | Filter by status | Segmented control: `chip` group or its own component (question; `shared/OSegment.tsx` exists and is not used here) |
| Payouts | Tab | `Payouts/styles.tsx:20-27` | `Pressable`, `flex: 1`, `min-height: 40px`, `padding: 0px 4px`; selected bg `yellowSecondary`, else `transparent`; no pressed feedback | One status | `chip` selected / unselected states |
| Payouts | Tab text | `Payouts/styles.tsx:29-34` | 14, Helvetica; selected `primary` weight 600, else `unselectText` weight 400 (weight change moves the label) | Tab label | Text preset; reserve the bold width (lessons 18) |
| Payouts | List | `Payouts/styles.tsx:36-38`; `Payouts/index.tsx:115-119` | `ScrollView` with `padding: 0px 20px` on the scroll view's own style; `RefreshControl` with default colors | Payout list (paged by button, not virtualized) | Screen gutter; refresh tint = brand role |
| Payouts | Stripe notice | `Payouts/styles.tsx:40-53`; `Payouts/index.tsx:120-134` | box bg `yellowSecondary`, r 10, `padding: 15px`, `margin-bottom: 15px`; text 14 / line 20 `textGray`, mb 10; button `primary`, `height: 40`, r 10, text `white` 14 | Warns that payouts wait for a Stripe account | Notice box (`alert` inline / warning surface role) + `button` filled primary sm |
| Payouts | Payout card | `Payouts/styles.tsx:55-73`; `Payouts/index.tsx:136-153` | `Pressable` row, `border-width: 1px` `tabBar`, r 10, `padding: 15px`, `margin-bottom: 10px`; info `padding-right: 10px`; no pressed feedback; opens `OrderDetails` | One payout | `card` (outlined, pressable) — same pattern as the session card with padding 15 instead of 20 |
| Payouts | Card title / amount | `Payouts/styles.tsx:75-81` | 16 / 600 `textGray`, mb 4 | Business name; amount | Text preset (card title) |
| Payouts | Card metadata | `Payouts/styles.tsx:83-88` | 13 / line 18 `unselectText` | Order no., date | Text preset (metadata) |
| Payouts | Status | `Payouts/styles.tsx:90-95`; `Payouts/index.tsx:65-69` | 13 / 600; paid `success500`, pending `primary`, needs_review `danger500` | Payout state | `badge` or status text with state color roles (pending uses the brand color: question) |
| Payouts | Skeleton | `Payouts/index.tsx:155-164` | card + lines 50% / 30%; 5 on first load, 2 when loading more | Loading | `skeleton` in `card` |
| Payouts | Error / empty | `Payouts/index.tsx:165-174` | `NotFoundSource` (image 260×220, text 18 `textSecondary`), error adds "Try Again" button | States | `empty_state` |
| Payouts | Load more | `Payouts/styles.tsx:97-99`; `Payouts/index.tsx:175-186` | footer `margin: 10px 0px 40px`; button `primary` r 10 h 50, text `white` 16 | Paging | `button` filled primary |
| Stripe | Header / content | `StripeConnectAccount/styles.tsx:8-14` | same header padding as Payouts; scroll `padding: 0px 20px` | Top bar, gutter | `header`; gutter |
| Stripe | Skeleton card | `StripeConnectAccount/styles.tsx:46-51`; `index.tsx:181-187` | border 1 `tabBar`, r 10, `padding: 30px 20px`; lines 60 / 90 / 40% | Loading | `skeleton` in `card` |
| Stripe | Status card | `StripeConnectAccount/styles.tsx:16-27` | centered, border 1 `tabBar`, r 10, `padding: 30px 20px`, `margin-bottom: 20px`; icon wrapper mb 15 | Account state | `card` (outlined) or `empty_state` layout (icon + title + text + button) |
| Stripe | Status icon | `StripeConnectAccount/index.tsx:76-101, 192, 210` | AntDesign 48: `creditcard` `unselectText`, `exclamationcircleo` `primary` (incomplete) / `danger500` (error), `clockcircleo` `primary`, `checkcircleo` `success500` | State glyph | `icon` (largest size level), state color roles |
| Stripe | Title | `StripeConnectAccount/styles.tsx:29-36` | 20 / 600 `textGray`, center, mb 10 | State title | Text preset (card/section title) |
| Stripe | Description | `StripeConnectAccount/styles.tsx:38-44` | 15 / line 22 `unselectText`, center | State text / error message | Text preset (body secondary) |
| Stripe | Action button | `StripeConnectAccount/index.tsx:215-224` | r 10, h 50; filled `primary` + `white` text 16 for not_connected / incomplete; `white` bg + `primary` border and text for in_review / ready; spinner while the link loads | Open the Stripe form | `button` filled primary / outline primary, loading |
| Stripe | Try Again | `StripeConnectAccount/index.tsx:196-204` | filled `primary`, r 10, text `white` 16, disabled while loading | Retry | `button` filled primary |
| Enable notifications | Sheet | `NotificationSetting/index.tsx:36-42`; `shared/OBottomPopup.tsx:49-72` | backdrop literal `#000000AA`; sheet bg literal `#FFFFFF`, `paddingHorizontal: 20`; `containerStyle` sets `borderRadius: 10` on all corners (primitive default 20 on top); no bottom inset | Ask for notification permission | `sheet` |
| Enable notifications | Title | `NotificationSetting/index.tsx:39-40`; `shared/OBottomPopup.tsx:67-71` | raw `Text` 20, `fontWeight: 'bold'`, `marginVertical: 15`, center; no color, no family (system font) | Sheet title | `sheet` title → text preset |
| Enable notifications | Text | `NotificationSetting/index.tsx:44-48, 68-72` | `OText` 14 center; wrapper `paddingHorizontal: 25`, `paddingBottom: 20` | Explanation | Text preset (body) |
| Enable notifications | Button | `NotificationSetting/index.tsx:49-57, 73-83` | `primary` bg and border, `borderRadius: 5`, wrapper `width: '70%'` centered, `marginBottom: 25`; text color literal `'white'` | Open system settings | `button` filled primary |
| All | Toasts | `UserProfileForm/index.tsx:128, 134, 175-180, 198-203, 217`; `UserFormDetails/index.tsx:112, 124, 180, 187`; `Payouts/index.tsx:95`; `StripeConnectAccount/index.tsx:125, 133, 156, 163` | `showToast(ToastType.Error \| Success, …)` drawn by `shared/OToast.tsx` | Results and errors | `toast` |

### Duplicates (same function, different implementation)

| Function | Implementations (file:line) | Visible differences |
|---|---|---|
| Screen title | Profile `OText` (`UserProfileForm/index.tsx:278-283`); `ONavbar` title on Sessions / Payouts / Stripe / Schedule (`shared/ONavbar.tsx:29-34`); dead `sectionTitle` in `Sessions/index.tsx:89-94` | 26 vs 24; family `Inter_18pt-Black` vs the string `Inter_18pt-Black_18pt-Black` built in ONavbar; Profile has `marginTop: 15`, navbar has `paddingBottom: 15` |
| Navbar top spacing by platform | `Sessions/index.tsx:99` (inline), `Payouts/styles.tsx:9`, `StripeConnectAccount/styles.tsx:9`, `DriverSchedule/index.tsx:80` | Same `ios ? 0 : 15` + 20 sides written four times (Schedule uses `insets.top` on iOS) |
| Text input in a form | View mode (`UserProfileForm/index.tsx:250-259`), edit mode (`UserFormDetails/index.tsx:221-228`), phone (`PhoneInputNumber/index.tsx:83-93` + `UserFormDetails/index.tsx:240-246`), remove-account password (`RemoveAccountModal.tsx:142-164`) | Border: bottom-only 1.5 / box 1.5 / box 1 / box 1.5; radius 10 / 10 / 7.6 / 10; border color `tabBar` / `tabBar` / `inputSignup` / `tabBar`→`danger500`; placeholder `arrowColor` / `arrowColor` / `arrowColor` / `unselectText`; side padding 16 / 10 / 35 left / 16; margins only on the first two |
| Field label style object | `UserProfileForm/index.tsx:246-249` and `UserFormDetails/index.tsx:209-212` | Identical (`textGray`, 700), declared twice |
| Password eye toggle | `UserFormDetails/index.tsx:348-364`, `392-408` (two branches each), `RemoveAccountModal.tsx:148-153` (one ternary) | Same glyphs, 24, `arrowColor`; note the mapping is inverted between them: the form shows `eye-outline` when the password is visible, the modal shows `eye-off-outline` when visible |
| Primary filled button | Update (`UserFormDetails/index.tsx:481-499`), Active sessions (`Sessions/index.tsx:178-184`), notice (`Payouts/index.tsx:125-132`), Load more (`Payouts/index.tsx:177-184`), Stripe (`StripeConnectAccount/index.tsx:196-204, 215-224`), notifications (`NotificationSetting/index.tsx:49-57`), NotFound (`NotFoundSource/index.tsx:40-47`) | Height 44 / 50 / 40 / 50 / 50 / 50 / 50; radius 7.6 / 7.6 / 10 / 10 / 10 / 5 / 7.6; border 1 / 2 / 2…; text 16 normal / 14 / 14 / 16 / 16 / 16 bold / 16 bold; text color `theme.colors.white` vs literal `'white'` |
| Outline / secondary button | Edit (`UserProfileForm/index.tsx:523-532`), Cancel edit (`UserFormDetails/index.tsx:463-472`), Cancel modal (`RemoveAccountModal.tsx:175-184`), Stripe update details (`StripeConnectAccount/index.tsx:215-224`) | Fill `yellowSecondary` / `white` / `white` / `white`; border `yellow` 1 / `primary` 1 / `tabBar` 2 / `primary` 2; text `yellow` 14 / `textGray` 16 normal / `textGray` 14 / `primary` 16; height 44 / 44 / 50 / 50; radius 10 / 7.6 / 10 / 10 |
| Destructive button | Remove account (`UserProfileForm/index.tsx:573-581`), Delete all (`Sessions/index.tsx:148-156`), Delete all except current (`Sessions/index.tsx:157-165`), Remove in modal (`RemoveAccountModal.tsx:187-195`) | Outline with text 16/700 vs outline with text 14 vs filled 14 vs filled 14; the "safer" action (except current) is the filled one |
| Confirmation of a destructive action | Custom modal with password (`RemoveAccountModal.tsx`), system alert (`Sessions/index.tsx:187-194`) | App-drawn dialog vs `Alert.alert` titled "Ordering" |
| Outlined card | Session (`Sessions/styles.tsx:5-14`), payout (`Payouts/styles.tsx:55-64`), Stripe status (`StripeConnectAccount/styles.tsx:16-23`), Stripe placeholder (`StripeConnectAccount/styles.tsx:46-51`) | Padding 20 / 15 / 30·20 / 30·20; all border 1 `tabBar`, r 10; margin-bottom 10 / 10 / 20 / none |
| Filled row / soft surface | Profile rows (`UserProfileForm/index.tsx:284-293`, `gray100`), language selector (`LanguageSelector/index.tsx:53`, `inputChat`), payout tabs (`Payouts/styles.tsx:14`, `inputChat`), schedule day (`DriverSchedule/styles.tsx:7`, `gray100`) | `gray100` and `inputChat` are both #F8F9FA; radius 10 / 7.6 / 8 / 10 |
| Soft brand surface | Edit button (`yellowSecondary`, `UserProfileForm/index.tsx:525`), selected payout tab and notice (`yellowSecondary`, `Payouts/styles.tsx:26, 41`), schedule today band (`secondary`, `DriverSchedule/index.tsx:83`) | `yellowSecondary` and `secondary` are both #FFF4DA; `yellow` and `primary` both #FFB700 |
| Page background key | `backgroundPage` (`Profile.tsx:53, 56`, layout), `white` (`Sessions.tsx:16`, modal card, sessions actions) | Same value (#FFFFFF / #fff), two keys |
| Danger color | `danger500` #E63757 (12 reads), `error` #C90800 (`UserFormDetails/index.tsx:214`, `PhoneInputNumber/index.tsx:145`), `red` #E63757 (`DriverSchedule/index.tsx:112`) | Two reds for field errors in the same form |
| Muted text | `unselectText` #909BA9 (6), `arrowColor` #B1BCCC (placeholders, 9), `gray200` #ADB5BD (chevrons, 4), `textSecondary` #858585 (`NotFoundSource`) | Four near greys for secondary text / icons |
| Skeleton | Profile (`UserProfileForm/index.tsx:316-384`), sessions (`Sessions/index.tsx:105-117`), payouts (`Payouts/index.tsx:155-164`), Stripe (`StripeConnectAccount/index.tsx:181-187`) | All `rn-placeholder` with `Fade`; profile sets its own heights/radii (20, 7.6) and a tinted wrapper, the others use library defaults |
| Empty / error state | `NotFoundSource` (profile error, payouts error and empty), bare `OText` (`Sessions/index.tsx:169, 175`), Stripe error card (`StripeConnectAccount/index.tsx:188-205`) | Image + 18 pt text vs plain 14 pt text without padding vs icon card |
| Chevron | AntDesign `right` 18 (`UserProfileForm/index.tsx:540…`), PNG `chevronDown` 20 untinted (`LanguageSelector/index.tsx:77-82`), PNG `chevronDown` 16 `arrowColor` (`PhoneInputNumber/index.tsx:131-138`) | Vector vs PNG, three sizes, three colors |
| Close / back affordance | `ONavbar` PNG arrow (4 uses), AntDesign `close` 16 on sessions, country picker's own close PNG 15 | — |
| Phone-number state and formatting logic duplicated in UI | `UserProfileForm/index.tsx:72-112, 160-166` and `UserFormDetails/index.tsx:48-108` | Same `setUserCellPhone`, only one result is painted (`phoneToShow`) |
| Error-message helper | `Payouts/index.tsx:77-81`, `StripeConnectAccount/index.tsx:112-116` | Identical function twice (not visual) |

### Blocks and pieces

| Page | Block or piece | Hideable? Movable? | Why |
|---|---|---|---|
| Profile | Title | Hideable, not movable | Fixed above the scroll; nothing depends on it |
| Profile | Photo | Hideable, movable | Self-contained; removing it also removes the only way to change the photo |
| Profile | Availability row | Hideable, movable | Already gated by `user.level === 4` and `available_status_enabled`; no other entry to the driver's available/busy state in this area (check area of orders for another toggle) |
| Profile | Personal data (view) + Edit button | Hideable together; movable as one block | Edit button and the view/edit swap share `isEdit`; the button is separate JSX (`:521`) from the data (`:439`), so moving one without the other splits the form from its action. Edit already gated by `allow_driver_update_data` |
| Profile | Individual fields | Driven by server validation fields, not the theme | `sortInputFields(validationFields.fields.checkout)` (`UserProfileForm/index.tsx:445`, `UserFormDetails/index.tsx:256`); edit mode also filters with `showField`, view mode does not |
| Profile | Password and phone rows (view) | Hideable | Static rows without action |
| Profile | Dividers | Hideable | Decoration; should follow the blocks they separate (today they are siblings with fixed margins 40 / 20) |
| Profile | Schedule row + modal | Hideable, movable | Row and `OModal` are separate nodes (`:537`, `:583`); hide both |
| Profile | Sessions row | Hideable, movable | Only link to the `Sessions` screen: hiding it makes the screen unreachable |
| Profile | Stripe account row, Payouts row | Hideable, movable | Already gated by `stripe_connect_payouts_enabled`; they are the only links to both screens (plus Payouts → Stripe notice). The gate is a server config: a theme flag would be a second switch (question) |
| Profile | Language selector | Hideable, movable | Hides itself with one language; changing language elsewhere exists only before login |
| Profile | Logout | Movable; hiding breaks the app | Only logout entry found in this area |
| Profile | Remove account | Hideable (already by `allow_delete_driver_account`), movable | Store review rules may require it: product decision |
| Profile | Row order (Schedule, Sessions, Stripe, Payouts) | Movable | Four sibling `Pressable`s with no shared state |
| Sessions | "Current" mark, per-session delete, each bulk button | Hideable individually | Independent nodes |
| Sessions | Navbar | Not hideable | Only way back on iOS without a gesture-disabled stack (stack headers are off: `HomeNavigator.tsx:80`) |
| Payouts | Status tabs | Hideable | List then shows `statusSelected` default (all) |
| Payouts | Stripe notice | Hideable | Informative; its button duplicates the profile row |
| Payouts | Card pieces (business name, order no., date, amount, status) | Hideable individually | Independent text nodes; card press goes to `OrderDetails` |
| Payouts | Load more | Not hideable | Only paging mechanism |
| Stripe account | Icon, title, description | Hideable individually | The action button must stay |
| Enable notifications sheet | Whole sheet | Behaviour, not theme | Shown when the OS permission is `blocked` |

### Images

| Key or source | file:line | Painted box | Fit | Fallback | alt |
|---|---|---|---|---|---|
| API `user.photo` through `optimizeImage(…, 'h_300,c_limit')` (returns the URL unchanged in the native utils) | `UserProfileForm/index.tsx:390-396` | 123×123, radius 123, border 1 `gray100` | `contain` (no `cover` prop → non-square photos letterbox inside the circle) | Intended: `theme.images.general.user`, which is NOT in the manifest (`src/DeliveryApp.tsx:42-85`) → `OIcon` falls to `theme.images.logos.logo` (`shared/OIcon.tsx:37-45`; `logo.png`, 6.3 KB) | none (no `accessibilityLabel`) |
| `theme.images.general.notFound` (`not-found.png`, 279×279, 28 KB) | `UserProfileForm/index.tsx:308`; default inside `NotFoundSource/index.tsx:12` for `Payouts/index.tsx:166, 173` | 260×220 | contain | none | none |
| `theme.images.general.email`, `theme.images.general.user` as input icons | `UserProfileForm/index.tsx:458-462`, `UserFormDetails/index.tsx:280-284` | would be 20×20 (`shared/OInput.tsx:82-90`) | contain | Keys undefined → no icon is drawn | none |
| `theme.images.general.arrow_left` (24×24 PNG, 309 B) via `ONavbar` | used at `Sessions/index.tsx:100`, `Payouts/index.tsx:102`, `StripeConnectAccount/index.tsx:170`, `DriverSchedule/index.tsx:81` | 24×24 | none set on the enabled branch of `OIconButton` (RN default `cover`) | none | none |
| `theme.images.general.menulogout` (`logout.png` 64×64) | `LogoutButton/index.tsx:55-60` (used at `UserProfileForm/index.tsx:570`) | 18×18, tint `disabledContrast` #000 | contain | none | none |
| `theme.images.general.chevronDown` (`chevron-down.png` 64×64) | `LanguageSelector/index.tsx:77-82`; `PhoneInputNumber/index.tsx:131-138` | 20×20 untinted; 16×16 tint `arrowColor` | contain | none | none |
| `theme.images.general.inputPhone`, `general.close` | `PhoneInputNumber/index.tsx:157-161, 114-115` (used at `UserFormDetails/index.tsx:440`) | 20×20 absolute `top: 15, left: 99`; 15×15 in the country picker | contain | none | none |
| Emoji flags (not images) | `LanguageSelector/index.tsx:66-70, 99-103` | `flagSize: 24` | — | — | — |
| `theme.images.general.profilephoto` (`profile-default-photo.png`, 2.6 KB) | `src/DeliveryApp.tsx:67` | never painted | — | — | — |

Findings: the avatar's fallback key does not exist (app logo shows instead of a person placeholder) while a bundled default photo has no reader; two input-icon keys do not exist; no image in the area has an accessibility label.

### Text roles

| Role | Look today (family / size / weight / lineHeight / color) | Where |
|---|---|---|
| Screen title, tab root | `fonts.special.name` (Inter_18pt-Black) / 26 / 700 / — / `textGray` | `UserProfileForm/index.tsx:278-283, 299` |
| Screen title, stack screens | `${fonts.special.name}_18pt-Black` / 24 / 700 / — / `textGray` | `shared/ONavbar.tsx:29-34` at `Sessions/index.tsx:100`, `Payouts/index.tsx:102`, `StripeConnectAccount/index.tsx:170`, `DriverSchedule/index.tsx:81` |
| Dialog title | Helvetica / 20 / 700 / — / `textGray` | `RemoveAccountModal.tsx:129` |
| Sheet title | system font / 20 / bold / — / default text color | `shared/OBottomPopup.tsx:67-71` at `NotificationSetting/index.tsx:39` |
| Card / state title | Helvetica / 20 / 600 / — / `textGray`, centered | `StripeConnectAccount/styles.tsx:29-36` |
| Card title | Helvetica / 16 / 600 / — / `textGray` | `Payouts/styles.tsx:75-81` |
| Row label | Helvetica / 16 / 400 / — / literal `#344050` (OText default, `shared/OText.tsx:6`) | `UserProfileForm/index.tsx:539, 547, 555, 561` |
| Field label | Helvetica / 14 / 700 / — / `textGray` | `UserProfileForm/index.tsx:246-249`; `UserFormDetails/index.tsx:209-212` |
| Input text | Helvetica / 15 / 400 / — / `textGray` (prop); placeholder `arrowColor`, `textGray` or `unselectText` | `shared/OInput.tsx:25-33`; `UserProfileForm/index.tsx:456, 489, 502`; `RemoveAccountModal.tsx:145` |
| Body | Helvetica / 14 / 400 / — / `textGray` or OText default `#344050` | `RemoveAccountModal.tsx:133, 138`; `Sessions/index.tsx:127, 169, 175`; `NotificationSetting/index.tsx:45` |
| Body, notice | Helvetica / 14 / 400 / 20 / `textGray` | `Payouts/styles.tsx:47-53` |
| Body secondary | Helvetica / 15 / 400 / 22 / `unselectText`, centered | `StripeConnectAccount/styles.tsx:38-44` |
| Metadata | Helvetica / 13 / 400 / 18 / `unselectText` | `Payouts/styles.tsx:83-88` |
| Metadata (session created) | Helvetica / 14 / 400 / — / `unselectText` | `Sessions/index.tsx:126` |
| Status | Helvetica / 13 / 600 / — / state color | `Payouts/styles.tsx:90-95` |
| Status (session current) | Helvetica / 14 / 400 / — / `success500` | `Sessions/index.tsx:130` |
| Tab label | Helvetica / 14 / 400 `unselectText` → 600 `primary` when selected | `Payouts/styles.tsx:29-34` |
| Field error (form) | Helvetica / 16 / normal / — / `error` | `UserFormDetails/index.tsx:213-220`; `PhoneInputNumber/index.tsx:143-148` |
| Field error (modal) | Helvetica / 13 / 400 / — / `danger500` | `RemoveAccountModal.tsx:167` |
| Empty-state text | Helvetica / 18 / 400 / — / `textSecondary`, centered | `NotFoundSource/index.tsx:22-35` |
| Button text, default | special family / 16 / 700 / — / `white` | `shared/OButton.tsx:33-41`; untouched at `UserProfileForm/index.tsx:573` only in family/weight |
| Button text, 14 | special / 14 / 700 / — / `yellow`, `textGray`, `white`, `danger500` | `UserProfileForm/index.tsx:268-271`; `RemoveAccountModal.tsx:48-60`; `Sessions/index.tsx:151, 162, 181`; `Payouts/index.tsx:129` |
| Button text, 16 normal | special / 16 / normal / — / `textGray` or `white` | `UserFormDetails/index.tsx:234-239, 488-493` |
| Button text, 16 | special / 16 / 700 / — / `white` or `primary` | `Payouts/index.tsx:181`; `StripeConnectAccount/index.tsx:201, 221` |
| Button text, destructive large | special / 16 / 700 / 24 / `danger500` | `UserProfileForm/index.tsx:577` |
| Language value | Helvetica / 16 / 400 / — / `unselectText` | `LanguageSelector/index.tsx:46-49` |
| Logout | literal `'Poppins'` / 16 / 600 / — / `textGray` | `LogoutButton/index.tsx:39-46` |

Sizes in use in the area: 13, 14, 15, 16, 18, 20, 24, 26. Line heights are set on only four texts (18, 20, 22, 24). Weight 600 is asked of Helvetica, of which only Regular and Bold are bundled (`android/app/src/main/assets/fonts`).

### Buttons and touchables

| Element | file:line | Primitive | Look / size | `activeOpacity` | Disabled look | Under 44 pt? |
|---|---|---|---|---|---|---|
| Photo | `UserProfileForm/index.tsx:389` | `TouchableOpacity` | 123×123 | default 0.2 | none (still active when data editing is not allowed) | no |
| Availability toggle | `UserProfileForm/index.tsx:419-432` | `toggle-switch-react-native` | about 55×35 | `activeOpacity={0.8}` fixed in the library (`node_modules/toggle-switch-react-native/ToggleSwitch.js:176`) | `disabled` prop only; replaced by a spinner while saving | yes (35 high) |
| Edit | `UserProfileForm/index.tsx:523-532` | `OButton` + `style`/`textStyle` overrides | h 44, r 10, border 1 | undefined → 0.2 (`OButton.defaultProps` is ignored on React 19) | `StyledButtonDisabled`: bg/border `disabled` #CBCBCB, text keeps `yellow` | no (44) |
| Cancel / Update (edit) | `UserFormDetails/index.tsx:463-499` | `OButton` + overrides | h 44, r 7.6, border 1 | 0.2 | grey `disabled` fill; Update text turns `textGray` | no (44) |
| Password eye ×2 | `UserFormDetails/index.tsx:350-362, 394-406` | `onPress` on the vector icon glyph | 24×24 | none (Text press) | — | yes |
| Password eye (modal) | `RemoveAccountModal.tsx:148-153` | same | 24×24 | none | stays pressable while loading | yes |
| Navigation rows ×4 | `UserProfileForm/index.tsx:537-564` | raw `Pressable` with a static style | full width × 60 | no feedback at all | — | no |
| Language selector | `LanguageSelector/index.tsx:63` | `TouchableOpacity` | row with padding 8 around a 24 flag (about 40 high) | 0.2; list items `activeOpacity={1}` | — | probably (needs device) |
| Logout | `LogoutButton/index.tsx:50` | `TouchableOpacity` | text + 18 icon, no padding (about 20 high) | 0.2 | `disabled` while loading, no look | yes |
| Remove account | `UserProfileForm/index.tsx:573-581` | `OButton` + overrides | h 50, r 10, border 2 | 0.2 | grey fill, red text | no |
| Modal Cancel / Continue / Remove | `RemoveAccountModal.tsx:175-195` | `OButton` + overrides | h 50, r 10 | 0.2 | Cancel grey while loading; confirm shows spinner | no |
| Navbar back | `shared/ONavbar.tsx:43-49` (4 uses in the area) | `OIconButton` | h 40, 24 icon, absolutely positioned `top: -20, left: -20` | 0.2 | — | yes (40 high) |
| Delete one session | `Sessions/index.tsx:133-143` | `TouchableOpacity` + inline style | 28×28, r 10, border 1 | 0.2 | none (not disabled while `actionState.loading`) | yes |
| Delete all / except current / Active sessions | `Sessions/index.tsx:148-165, 178-184` | `OButton` + overrides | h 50, r 10 / 10 / 7.6 | 0.2 | grey fill; text keeps its color (white on grey, red on grey) | no |
| Payout tab ×4 | `Payouts/styles.tsx:20-27` | `styled.Pressable` | min-height 40 | no feedback | — | yes (40) |
| Notice button | `Payouts/index.tsx:125-132` | `OButton` + overrides | h 40, r 10 | 0.2 | — | yes (40) |
| Payout card | `Payouts/styles.tsx:55-64` | `styled.Pressable` | full width, padding 15 | no feedback | `disabled` on skeleton cards, no look | no |
| Load more / Try Again | `Payouts/index.tsx:177-184`; `NotFoundSource/index.tsx:40-47` | `OButton` + overrides | h 50, r 10 / 7.6 | 0.2 | — | no |
| Stripe action / Try Again | `StripeConnectAccount/index.tsx:196-204, 215-224` | `OButton` + overrides | h 50, r 10 | 0.2 | grey when loading (Try Again); spinner (action) | no |
| Enable notifications | `NotificationSetting/index.tsx:49-57` | `OButton` + `parentStyle`/`style`/`textStyle` | 70% wide, h 50, r 5 | 0.2 | — | no |
| Sheet backdrop | `shared/OBottomPopup.tsx:30-35` | `TouchableWithoutFeedback` | fills the rest of the screen | — | — | no |

Every `OButton` in the area (14 uses in 7 files, plus the one inside `NotFoundSource`) passes `style` and/or `textStyle`, and 11 of the 14 pass `bgColor`/`borderColor`: none uses the primitive as it comes. `OInput`: 7 uses, all with a `style` or a `borderColor` override. `OText`: 24 uses. No `OIconButton` is used directly by the area's files (it is imported and unused in `UserProfileForm/index.tsx:36` and `Sessions/index.tsx:17`).

### Icons

| Set / source | Import (alias) | Glyph | Size | Color | Function | file:line |
|---|---|---|---|---|---|---|
| AntDesign | `AntDesignIcon` (`UserProfileForm/index.tsx:7`) | `right` | 18 | `textNormal` (undefined) ×1, `gray200` ×3 | Row disclosure | `UserProfileForm/index.tsx:540, 548, 556, 562` |
| AntDesign | `AntIcon` (`Sessions/index.tsx:4`) | `close` | 16 | `gray200` | Delete a session | `Sessions/index.tsx:142` |
| AntDesign | `AntIcon` (`StripeConnectAccount/index.tsx:4`) | `creditcard`, `exclamationcircleo`, `clockcircleo`, `checkcircleo` | 48 | `unselectText`, `primary` / `danger500`, `primary`, `success500` | Account state | `StripeConnectAccount/index.tsx:77, 84, 91, 100, 192, 210` |
| MaterialCommunityIcons | `UserFormDetails/index.tsx:4` | `eye-outline`, `eye-off-outline` | 24 | `arrowColor` | Show / hide password | `UserFormDetails/index.tsx:350-362, 394-406` |
| MaterialCommunityIcons | `RemoveAccountModal.tsx:3` | `eye-outline`, `eye-off-outline` | 24 | `arrowColor` | Show / hide password | `RemoveAccountModal.tsx:148-153` |
| Tinted PNG | `OIcon` | `general.menulogout` | 18×18 | `disabledContrast` | Logout | `LogoutButton/index.tsx:55-60` |
| PNG | `OIcon` | `general.chevronDown` | 20×20 / 16×16 | untinted / `arrowColor` | Dropdown | `LanguageSelector/index.tsx:77-82`; `PhoneInputNumber/index.tsx:131-138` |
| PNG | `OIconButton` in `ONavbar` | `general.arrow_left` | 24×24 | untinted | Back | `shared/ONavbar.tsx:43-49` |
| PNG | `OIcon` | `general.inputPhone` | 20×20 | untinted | Phone field adornment | `PhoneInputNumber/index.tsx:157-161` |
| PNG (never drawn) | `OInput icon=` | `general.email`, `general.user` | 20×20 | `iconColor` default `#959595` (a `defaultProps`, ignored) | Field adornment | `UserProfileForm/index.tsx:458-462`; `UserFormDetails/index.tsx:280-284` |

Icon sizes in the area: 15, 16, 18, 20, 24, 48. Two vector families (AntDesign, MaterialCommunityIcons) plus PNGs for the same kinds of glyph (chevrons, close).

### Theme keys read

Counts over the 16 files of the area (pages + the six UI folders), by `grep` of `theme.colors|images|fonts`.

| Key | Reads | Value in `src/theme.json` | Used for |
|---|---|---|---|
| `colors.primary` | 30 | #FFB700 | Buttons, selection color, spinner, toggle on, tab selected, status |
| `colors.textGray` | 24 | #344050 | Titles, labels, input text, button text |
| `colors.white` | 19 | #fff | Button text and fills, modal card, sessions page |
| `colors.danger500` | 12 | #E63757 | Destructive buttons, error text and border, status |
| `colors.tabBar` | 11 | #e9ecef | Every border and divider of the area |
| `colors.arrowColor` | 9 | #B1BCCC | Placeholders, eye icons |
| `colors.unselectText` | 6 | #909BA9 | Secondary text, placeholder, unselected tab |
| `colors.gray200` | 4 | #ADB5BD | Chevrons, close icon |
| `colors.yellowSecondary` | 3 | #FFF4DA | Edit button fill, selected tab, notice |
| `colors.success500` | 3 | #00D27A | Current session, paid, Stripe ready |
| `colors.clear` | 3 | transparent | Only in the dead `styles.btnBackArrow` of `Sessions/index.tsx:76-78` |
| `colors.yellow` | 2 | #FFB700 | Edit button border and text |
| `colors.gray100` | 2 | #F8F9FA | Row fill, photo border |
| `colors.backgroundPage` | 2 | #FFFFFF | Profile page |
| `colors.transparent` | 1 | rgba(0, 0, 0, 0) | Unselected tab |
| `colors.shadow` | 1 | rgba(0, 0, 0, 0.8) | Modal backdrop |
| `colors.primaryContrast` | 1 | #FFF | Only in the dead `styles.btnOutline` (`UserFormDetails/index.tsx:206`) |
| `colors.offColor` | 1 | #8c8b8d | Toggle off |
| `colors.inputSignup` | 1 | #DEE2E6 | Phone flag button border |
| `colors.inputChat` | 1 | #F8F9FA | Tabs background |
| `colors.error` | 1 | #C90800 | Form error text |
| `colors.backgroundLight` | 1 | #F5F9FF | Skeleton wrapper |
| `colors.textNormal` | 1 | **UNDEFINED** | Schedule row chevron (`UserProfileForm/index.tsx:540`) |
| `fonts.primary.name` | 7 | Helvetica | Styled texts in Payouts and Stripe |
| `fonts.special.name` | 2 | Inter_18pt-Black | Profile title; dead `sectionTitle` in Sessions |
| `images.general.user` | 3 | **UNDEFINED** (not in `src/DeliveryApp.tsx:42-85`) | Avatar fallback, input icon |
| `images.general.email` | 2 | **UNDEFINED** | Input icon |
| `images.general.notFound` | 1 | `not-found.png` | Profile error state |

Read through the components this area uses (not counted above): `colors.disabledContrast`, `colors.textSecondary`, `colors.secondary`, `colors.red`, `colors.disabled`, `colors.baseColor`, `images.general.{menulogout, chevronDown, arrow_left, inputPhone, close}`, `images.logos.logo`. Literals reaching these screens from primitives: `#344050` (OText default color), `#000000AA` and `#FFFFFF` (OBottomPopup), `#00000020` (OButton shadow), `'white'` (`NotificationSetting/index.tsx:55`).

### Platform and window

| What | file:line | Today | Kind |
|---|---|---|---|
| Keyboard avoiding | `src/pages/Profile.tsx:52` | `behavior` ios `padding` / android `height` | Behaviour |
| Keyboard avoiding in modal | `RemoveAccountModal.tsx:127` | ios `padding` / android none | Behaviour |
| Navbar top padding | `Sessions/index.tsx:99`; `Payouts/styles.tsx:9`; `StripeConnectAccount/styles.tsx:9` | ios 0 / android 15 | Hand-made top spacing (lessons 14): use the inset / header component |
| Schedule header | `DriverSchedule/index.tsx:73-74, 80` | ios `insets.top` / android 15; android `maxHeight: windowHeight`, `paddingBottom: 120` | Hand-made safe area in a modal |
| Window height at import | `Sessions/index.tsx:19, 121` | `Dimensions.get('window')` at module level; list `maxHeight: height * 0.7` | Computed once (no rotation update); screen-relative size |
| Sheet max height | `shared/OBottomPopup.tsx:3, 65` | `Dimensions.get('window').height` at module level | Same |
| Safe area | `Profile.tsx:54`, `Payouts.tsx:14`, `StripeConnectAccount.tsx:14` | `SafeAreaContainerLayout`: top/left/right insets only. Payouts and Stripe are stack screens without a tab bar: no bottom inset (Payouts footer has `margin-bottom: 40px`; Stripe has none) | Safe area |
| Safe area (Sessions) | `Sessions.tsx:16` | `Container`: RN core `SafeAreaView` + `ScrollView`; different layout primitive from the other three screens | Safe area |
| Status bar | `src/ui/src/layouts/SafeAreaContainer.tsx:93-96`; `src/ui/src/layouts/Container.tsx:39-45` | ios `dark-content` / android `default`; background turns `danger500` offline and `success500` for 2 s on reconnect (layout); Sessions sets background `white`, `dark-content` | Status bar |
| Orientation listeners | `src/ui/src/layouts/Container.tsx:23-35`; `SafeAreaContainer.tsx:56-68` | Both layouts track Portrait/Landscape; `Container` padding depends on it only when `noPadding` is false (Sessions passes `noPadding`) | No look change in this area |
| Sheet bottom | `NotificationSetting/index.tsx:73-79` | `marginBottom: 25`, no inset | Hand-made bottom spacing |

No `Platform.select`, no `.ios.tsx`/`.android.tsx`, no tablet branch in the area's files.

### Styles that cannot see the theme

| File | Module-level `StyleSheet.create` | In-component `StyleSheet.create` (re-created each render) | Inline `style={{` | Other inline style props (`textStyle={{`, `titleStyle={{`, `containerStyle={{`) |
|---|---|---|---|---|
| `src/pages/Profile.tsx` | 0 | 0 | 2 | 0 |
| `src/pages/Sessions.tsx` | 0 | 0 | 1 | 0 |
| `src/pages/Payouts.tsx`, `StripeConnectAccount.tsx` | 0 | 0 | 0 | 0 |
| `UserProfileForm/index.tsx` | 0 | 1 (`:245`) | 20 | 1 |
| `UserProfileForm/RemoveAccountModal.tsx` | 0 | 1 (`:40`) | 0 | 0 |
| `UserFormDetails/index.tsx` | 0 | 1 (`:204`) | 2 | 1 |
| `Sessions/index.tsx` | 0 | 1 (`:65`, all four entries unused) | 12 | 3 |
| `Payouts/index.tsx` | 0 | 0 | 2 | 2 |
| `StripeConnectAccount/index.tsx` | 0 | 0 | 2 | 2 |
| `NotificationSetting/index.tsx` | 1 (`:63`) | 0 | 1 | 3 |

`defaultProps` on function components that reach this area (ignored on React 19): `OButton.defaultProps` (`shared/OButton.tsx:142-147`: `activeOpacity: 0.5`, `indicatorColor: 'white'`), `OInput.defaultProps` (`shared/OInput.tsx:145-149`: `iconColor`, `bgColor: 'white'`, `borderColor: 'white'`), `OIcon` (`shared/OIcon.tsx:62-65`), `OText` (`shared/OText.tsx:60-62`), `OIconButton` (`shared/OIconButton.tsx:127`). The area relies on them in: every `OButton` without `activeOpacity`; `OInput` without `bgColor` (all 7 uses) and without `borderColor` (6 of 7; the border color then comes from `style`). `Payouts/styles.tsx` and `StripeConnectAccount/styles.tsx` read `Platform.OS` inside a styled template at module level (static, fine for the platform, but not a theme value).

### Third-party UI

| Library / API | file:line | What it draws | Props that carry styles |
|---|---|---|---|
| `toggle-switch-react-native` ^3.2.0 | `UserProfileForm/index.tsx:8, 419-432` | Track + thumb switch | `onColor`, `offColor`, `size` (`small`: 40 / 10 / 15), `animationSpeed`; thumb `circleColor` default `white`; track radius 20 fixed in the library |
| `rn-placeholder` ^3.0.3 | `UserProfileForm/index.tsx:5, 320-382`; `Sessions/index.tsx:3, 107-115`; `Payouts/index.tsx:3, 158-161`; `StripeConnectAccount/index.tsx:3, 182-186` | Skeleton lines | `width` (%), `style`; color `#efefef` and Fade overlay `#dfdfdf` are library defaults (no `color` prop passed) |
| `react-native-image-picker` ^4.0.6 | `UserProfileForm/index.tsx:4, 115-138` | The system photo library | Not themable (`maxWidth/maxHeight: 200`) |
| `react-native-country-picker-modal` ^2.0.0 | through `LanguageSelector/index.tsx:55-110` and inside the phone field | Language list modal; country list | Other agent's component; no theme passed |
| `react-native-phone-number-input` ^2.0.0 | through `PhoneInputNumber/index.tsx:98-140`, used at `UserFormDetails/index.tsx:440-446` | Phone field with flag button | `flagButtonStyle` (set from this area: `UserFormDetails/index.tsx:240-246`), `textContainerStyle`, `containerStyle`, `codeTextStyle` |
| `Alert.alert` | through `shared/OAlertOriginal.tsx:39-42`, used at `Sessions/index.tsx:187-194` | System confirmation, title "Ordering" | Not themable |
| RN `Modal` | `RemoveAccountModal.tsx:121-126`; `shared/OModal.tsx:177` (schedule); `shared/OBottomPopup.tsx:23` (notifications) | Modal host | `animationType` fade / slide / fade |
| RN `RefreshControl` | `Payouts/index.tsx:117`; `StripeConnectAccount/index.tsx:174-177`; `DriverSchedule/index.tsx:75-78` | Pull-to-refresh spinner | No `tintColor` / `colors` passed → platform default |
| RN `ActivityIndicator` | `UserProfileForm/index.tsx:417`; inside `OButton` loading (`shared/OButton.tsx:100-104`) | Spinner | `color`, `size="small"` |
| `react-native-vector-icons` | AntDesign, MaterialCommunityIcons (see Icons) | Glyphs | `size`, `color` |
| `Linking.openURL` | `StripeConnectAccount/index.tsx:130` | Stripe's hosted onboarding in the external browser (only `https://*.stripe.com` accepted, `:37-46`) | Not app UI |
| `react-native-permissions` `openSettings` | `NotificationSetting/index.tsx:28` | The system settings app | Not app UI |

Around the Stripe flow the app's own UI is exactly: navbar, status/skeleton/error card, action button and toasts. There is no in-app web content.

### Motion

| What | file:line | Duration / type |
|---|---|---|
| Toggle thumb | `UserProfileForm/index.tsx:431` | `animationSpeed={200}` (library `Animated.timing`, native driver) |
| Skeleton fade | `Animation={Fade}` at `UserProfileForm/index.tsx:320, 343, 354`; `Sessions/index.tsx:107`; `Payouts/index.tsx:158`; `StripeConnectAccount/index.tsx:182` | Library default 500 ms loop |
| Remove-account modal | `RemoveAccountModal.tsx:124` | `animationType="fade"` (system duration) |
| Schedule modal | `shared/OModal.tsx:178` | `animationType="slide"` |
| Notifications sheet | `shared/OBottomPopup.tsx:24` | `animationType='fade'` (a bottom sheet that fades, does not slide) |
| Status bar | `src/ui/src/layouts/Container.tsx:43-44` | `showHideTransition="fade"`, `animated` |
| Reconnect color | `src/ui/src/layouts/SafeAreaContainer.tsx:77-79` | `setTimeout` 2000 ms |

No `Animated.*` or `LayoutAnimation` call is written in the area's own files.

### Off the scale or without a token

| Value | Where | Why it does not fit |
|---|---|---|
| Radius 5 | `NotificationSetting/index.tsx:82` | Only button of the area with 5; others 7.6 or 10 |
| Radius 7.6 next to 10 | 7.6: `UserFormDetails/index.tsx:231, 243`, `Sessions/index.tsx:183`, `UserProfileForm/index.tsx:361, 370, 379`, `LanguageSelector/styles.tsx:6`; 10: 22 uses | Two radii for the same buttons and inputs in one screen (Edit 10, Cancel/Update 7.6) |
| Radius 8 | `Payouts/styles.tsx:15` | Single use between 7.6 and 10 |
| Radius 20 on a square bone, 123 on the avatar | `UserProfileForm/index.tsx:325, 335, 395` | Skeleton shape does not match the circle; 123 means "full" |
| Border 1.5 | `UserProfileForm/index.tsx:253`; `UserFormDetails/index.tsx:224`; `shared/OInput.tsx:15` | Between thin (1) and thick (2) |
| Border 2.5 used as a band | `UserProfileForm/index.tsx:535, 567` | A divider drawn with a border on a zero-height view (5 pt total) |
| Border 2 on buttons | `shared/OButton.tsx:16` (kept by Remove account, modal buttons, sessions, payouts, Stripe) vs 1 on Edit/Cancel/Update | Two button border widths |
| Button heights 40 / 44 / 50 | `Payouts/index.tsx:130`; `UserProfileForm/index.tsx:261`, `UserFormDetails/index.tsx:230`; default 50 | Three control heights without a size axis |
| Row height 60; tab min-height 40; touch 28 | `UserProfileForm/index.tsx:291`; `Payouts/styles.tsx:24`; `Sessions/index.tsx:133-141` | Control sizes without a level |
| Avatar 123 (skeleton 120) | `UserProfileForm/index.tsx:393-394, 326-327` | Odd size, and its placeholder differs by 3 |
| Flag button width 79, `marginRight: 9`, icon at `left: 99` | `UserFormDetails/index.tsx:241, 244`; `PhoneInputNumber/index.tsx:155` | Hand-tuned to each other |
| Space 25 | `UserProfileForm/index.tsx:266`; `UserFormDetails/styles.tsx:30, 39`; `NotificationSetting/index.tsx:70, 78` | Between lg (20 fitted) and xl |
| Space 40 after the first divider vs 20/20 on the second | `UserProfileForm/index.tsx:535, 567` | Uneven section rhythm |
| Card padding 15, 20, 30·20 | `Payouts/styles.tsx:62`; `Sessions/styles.tsx:11`; `StripeConnectAccount/styles.tsx:21` | Same card, three paddings |
| Font sizes 13 and 15 | `Payouts/styles.tsx:86, 93`, `RemoveAccountModal.tsx:167`; `StripeConnectAccount/styles.tsx:41`, `shared/OInput.tsx:29` | One-off steps beside 14 and 16 |
| Titles 26 vs 24 | `UserProfileForm/index.tsx:281`; `shared/ONavbar.tsx:31` | Same role, two sizes |
| Error text 16 vs 13 | `UserFormDetails/index.tsx:217`; `RemoveAccountModal.tsx:167` | Same role, two sizes and two reds |
| Icon sizes 16 / 18 / 20 / 24 / 48 | see Icons | No icon size scale; 15 and 18 appear once or twice |
| `'·············'` placeholder | `UserProfileForm/index.tsx:488` | Literal string as a masked value |
| Literal `'white'` | `NotificationSetting/index.tsx:55` | Not from the theme |
| `#000000AA`, `#FFFFFF` | `shared/OBottomPopup.tsx:52, 60` (sheet used by `NotificationSetting`) | Not from the theme (other agent's primitive) |
| `theme.colors.textNormal` | `UserProfileForm/index.tsx:540` | Key not defined |
| `theme.images.general.user`, `.email` | `UserProfileForm/index.tsx:392, 460-461`; `UserFormDetails/index.tsx:282-283` | Keys not defined |
| `fontFamily: 'Poppins'` | `LogoutButton/index.tsx:41` | Hard-coded family; files are `Poppins-Regular`… (no `Poppins`) |
| Weight 600 on Helvetica | `Payouts/styles.tsx:33, 79, 94`; `StripeConnectAccount/styles.tsx:33` | No SemiBold file bundled for the primary family |
| `HEIGHT_SCREEN * 0.7` | `Sessions/index.tsx:121` | Size as a share of the window |
| `width: '80%'`, `width: '70%'` | `Sessions/index.tsx:124`; `NotificationSetting/index.tsx:75` | Percent widths inside components |

### Dead code

| Item | file:line | How checked |
|---|---|---|
| Unreachable screens | none | `Profile` is a tab (`BottomNavigator.tsx:184`); `Sessions`, `StripeConnectAccount`, `Payouts` are registered (`HomeNavigator.tsx:77-91`) and navigated to (`UserProfileForm/index.tsx:545, 553, 559`; `Payouts/index.tsx:131`). Stripe and Payouts are reachable only with `stripe_connect_payouts_enabled === '1'` and a level-4 user |
| `RemoveAccount` styled touchable | `UserProfileForm/styles.tsx:37-42` | `grep -rn "RemoveAccount\b" src` → only its definition |
| `UDLoader` | `UserFormDetails/styles.tsx:19-27` | `grep -rn UDLoader src` → only its definition |
| `Container` of Sessions | `Sessions/styles.tsx:19-22`, imported at `Sessions/index.tsx:13` | Imported, never rendered (needs a `pdng` prop nobody passes) |
| `styles` object of Sessions (4 entries) | `Sessions/index.tsx:65-95` | `grep "styles\." Sessions/index.tsx` → 0 uses |
| Unused imports | `Sessions/index.tsx:17` (`OIcon`, `OIconButton`); `UserProfileForm/index.tsx:36` (`OIconButton`), `:20` (`_retrieveStoreData`); `src/pages/Profile.tsx:2, 8` (`StyleSheet`, `View`, `OText`) | One occurrence each (the import) |
| `styles.btnOutline` | `UserFormDetails/index.tsx:205-208` | No use in the file |
| `DurationWrapper` (empty rule, only a commented line) | `Sessions/styles.tsx:15-17` | Rendered but styles nothing |
| `hideUpdateButton` prop | `UserProfileForm/index.tsx:515` | `UserFormDetailsUI` never reads it |
| Second `useForm()` and its error effect | `UserProfileForm/index.tsx:68, 208-219` | The form's fields are registered in `UserFormDetailsUI`'s own `useForm` (`UserFormDetails/index.tsx:43`); this one has no fields, so `errors` stays empty |
| `phoneUpdate`, `userPhoneNumber` state in the profile | `UserProfileForm/index.tsx:79, 81, 221-227` | Set, never painted in this file and not passed down (`UserFormDetailsUI` gets `{...props}` only, and the controller has no `phoneUpdate`: `grep phoneUpdate src/@/components/src/components/UserFormDetails/index.js` → 0), so the `phoneUpdate` branches of `UserFormDetails/index.tsx:443, 448-453` never run |
| Input icons | `UserProfileForm/index.tsx:458-462`; `UserFormDetails/index.tsx:280-284` | Keys `general.email` / `general.user` absent from the manifest: nothing is drawn |
| `theme.images.general.profilephoto` + `src/assets/icons/profile-default-photo.png` | `src/DeliveryApp.tsx:67` | `grep -rn profilephoto src` → only the manifest line |
| `isBusinessApp` branches | `UserProfileForm/index.tsx:536, 590` | Prop never passed (`src/pages/Profile.tsx:28-37`) |
| `level !== 4` / `isAdmin` branches | `UserProfileForm/index.tsx:84-86, 400, 574` | Login is restricted to level 4 per the repo's CLAUDE.md; not verified against the login code |
| `VerifyPhone` in this area | — | Not rendered by any file of the area |

Not theming but visible, found while reading: `Sessions/index.tsx:122` calls `sessionsList.sessions.reverse()` during render (it mutates the array, so the order can flip between renders); the view-mode list (`UserProfileForm/index.tsx:445`) does not apply `showField`, the edit list does; the photo can be changed when `allow_driver_update_data` is off; `LogoutButton` receives `setRootState` undefined.

### Not verified

Nothing was run: no simulator, no device, no tests, no type check. In particular:

- How any of this looks on iOS or Android, on a small phone, in landscape or on a tablet; overflow of long translations in the payout tabs (4 tabs, `padding: 0px 4px`), in the 60-pt rows and in the two-button rows.
- What `OInput` paints as background and border when `bgColor`/`borderColor` are undefined (its `defaultProps` are ignored on React 19 and the inline `backgroundColor: undefined` is spread over the styled `backgroundLight`): white, transparent or #F5F9FF. Same question for `OIcon`'s inline `tintColor: undefined` over the styled `tint-color: primary` (photo and PNG icons tinted or not), `OButton` press opacity (0.2 assumed from RN's default) and the spinner color of loading buttons that pass no `indicatorColor`.
- The color the Schedule chevron really gets from `color={undefined}` (`textNormal`).
- That the avatar fallback is the app logo (deduced from `shared/OIcon.tsx:37-45` and the manifest; not seen).
- Which font is painted for `Inter_18pt-Black` + weight 700, for `Inter_18pt-Black_18pt-Black` (ONavbar), for `'Poppins'` and for Helvetica at weight 600, on each platform.
- Real touch sizes of the language row, logout, toggle and eye icons (computed from code, not measured); whether `Pressable` rows show any feedback on Android.
- The nested scroll on Sessions (inner `ScrollView` with max height inside the page's `ScrollView`), the position of the bulk buttons, and the edge-to-edge skeleton cards.
- Bottom safe area on Payouts / Stripe / the notifications sheet on devices with a home indicator or Android gesture navigation.
- The country-picker modal opened by the language selector and by the phone field, the system photo picker, the system alert and the Stripe page in the browser: not opened.
- Toast look and position (`shared/OToast.tsx`, other agent).
- Server data shapes: which validation fields a real project returns (so which rows the profile shows), `user.schedule`, `session_strategy`, payout statuses other than `paid` / `pending` / `needs_review` (an unknown status paints no label).
- Not read: the `__tests__` folders of the area, `VerifyPhone/*` beyond its imports (not used here), `LanguageSelector/lang_country.json`, the submodule controllers beyond the props they pass (`UserFormDetails`, `Sessions`, `PayoutList` headers only; `StripeConnectAccount` and `LogoutAction` not opened), `shared/OToast.tsx` beyond its colors, the rest of `shared/*`.
- The claim that only level-4 users reach this screen (taken from CLAUDE.md, login code not read).
