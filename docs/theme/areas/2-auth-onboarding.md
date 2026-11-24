## Area 2 — auth and onboarding

Phase 1 inventory, read-only. **Nothing was run** (no simulator, device, tests, typecheck or lint): every statement below comes from reading code. Paths are relative to the repo root `/Users/work/Ordering/ordering-app-driver-v26`.

Files read completely:

- Pages: `src/pages/Splash.tsx`, `IntroductoryTutorial.tsx`, `Home.tsx`, `Login.tsx`, `ForgotPassword.tsx`, `Signup.tsx`, `RequestPermissions.tsx`, `ScheduleBlocked.tsx`, `NetworkError.tsx`, `NotFound.tsx`
- UI: `src/ui/src/components/Home/{index,styles}.tsx`, `LoginForm/{index,styles}.tsx`, `LoginForm/Otp/{index,styles}.tsx`, `SignupForm/{index,styles}.tsx`, `ForgotPasswordForm/{index,styles}.tsx`, `VerifyPhone/{index,styles}.tsx`, `PhoneInputNumber/{index,styles}.tsx`, `ScheduleBlocked/index.tsx`, `DriverSchedule/{index,styles}.tsx`
- For context only (owned by other agents, not inventoried here): `src/navigators/RootNavigator.tsx`, `HomeNavigator.tsx`, `BottomNavigator.tsx`, `src/ui/src/components/shared/{OText,OButton,OInput,OIcon,OIconButton,ONavbar,OModal,OAlertOriginal}.tsx`, `src/ui/src/layouts/{Container,SafeAreaContainer}.tsx`, `src/ui/src/components/{NotFoundSource,FloatingButton,NetworkError}/*`, `src/DeliveryApp.tsx`, `src/theme.json`, `src/config.json`.

Build-time flags in `src/config.json` today: `show_tutorials: true`, `use_root_point: false`, `validate_developer_mode: false`. React is 19.1.0 (`package.json:47`), so `defaultProps` on the shared function components are ignored.

Scripted literals for these files in `.theme-audit/inventory.csv`: 208 rows.

### Reachability (conditions in the navigators)

| Screen / piece | Registered at | Shown when | Reached from |
|---|---|---|---|
| `Splash` | `src/navigators/RootNavigator.tsx:732-738`; also `src/navigators/HomeNavigator.tsx:93-99` | Root: `!loaded` or `permissionsState.isLoading`. HomeNavigator: session `loading` | automatic |
| `IntroductoryTutorial` | `src/navigators/RootNavigator.tsx:744-750` | `loaded && !permissionsState.isLoading && !auth && isTutorial`. `isTutorial` starts as `settings.show_tutorials` (`:68`) and turns false when AsyncStorage `isTutorial === false` (`:496-505`); the page writes it in `_onDone` (`src/pages/IntroductoryTutorial.tsx:186-189`) | automatic, first launch |
| `Home` (welcome) | `src/navigators/RootNavigator.tsx:751-755` | same as above with `!isTutorial` (takes the tutorial's slot) | automatic |
| `Login` | `src/navigators/RootNavigator.tsx:757-763` | `!auth` (always registered next to tutorial/Home) | `onNavigationRedirect('Login')` in `src/ui/src/components/Home/index.tsx:135`, `:227` |
| `Forgot` | `src/navigators/RootNavigator.tsx:764-768` | `!auth` | `src/ui/src/components/LoginForm/index.tsx:616` |
| `ScheduleBlocked` | `src/navigators/RootNavigator.tsx:772-778` | `auth && blockedSchedule && configs.driver_login_validation.value === '1'` (`:66`); `blockedSchedule` from `getDriverScheduleBlockPlan({ user })` (`:651-658`) | automatic; replaces the whole authed app |
| `RequestPermissions` | `src/navigators/HomeNavigator.tsx:72-76` (stack) and `src/navigators/BottomNavigator.tsx:155-157` (as the `MapView` tab's component when `!isGrantedPermissions`) | authed only | `navigation.navigate('RequestPermissions')` in `src/ui/src/components/OrderDetails/Delivery.tsx:342`, `:347`, `:550`; the Map tab |
| `DriverSchedule` | not a screen: inside `OModal entireModal hideIcons customClose` at `src/ui/src/components/UserProfileForm/index.tsx:583-592` | Profile tab, modal open | Profile (other area) |
| `VerifyPhone` | inside `OModal` at `src/ui/src/components/LoginForm/index.tsx:705-717` | `loginTab === 'cellphone'` and `configs.twilio_service_enabled` is `'true'`/`'1'`, after "Get Verify Code" succeeds | Login |
| `Otp` | inside `OModal entireModal hideIcons` at `src/ui/src/components/LoginForm/index.tsx:718-736` | `loginTab === 'otp'` after submit | Login |
| `Signup`, `NotFound`, `NetworkError` pages | **not registered in any navigator** | never | see "Dead code" |

Login-method flags come from the submodule controller, which overrides the page's `useLoginByCellphone`/`useLoginByEmail` props (`src/@/components/src/components/LoginForm/index.js:41-55`, props spread first at `:466`): `phone_password_login_enabled`, `opt_email_enabled`, `otp_cellphone_enabled`, `email_password_login_enabled`, `security_recaptcha_auth`.

### Elements

| Screen / component | Element | file:line | Values today | Function | Proposal (component, token or key) |
|---|---|---|---|---|---|
| Splash | `SplashContainer` | `src/pages/Splash.tsx:12-15` | `flex:1`; bg `theme.colors.backgroundPage` (#FFFFFF) | screen background behind the launch image | color role (page background) |
| Splash | `LaunchScreenImage` (iOS) | `src/pages/Splash.tsx:17-23`, `:51-69` | absolute; frame = window × (x 76/393, y 362/852, w 250/393, h 80/852); `resizeMode="contain"`; source `theme.images.general.loadingSplash` = `{ uri: 'SplashImage' }` (xcassets) | continues the native launch screen without a jump | image (splash); geometry is tied to the native storyboard: question (the native splash cannot change at run time) |
| Splash | `FullScreenImage` (Android) | `src/pages/Splash.tsx:25-31`, `:72-88` | absolute `left:0`, `bottom` computed from `measureInWindow` + `StatusBar.currentHeight`; size = `Dimensions.get('screen')`; `cover`; `fadeDuration={0}` | same | image (splash); same question |
| IntroductoryTutorial | screen wrapper | `src/pages/IntroductoryTutorial.tsx:194` | `SafeAreaContainer edges={[]}` + inline `backgroundColor: theme.colors.white` | page background | color role (page background) |
| IntroductoryTutorial | `StatusBar` | `src/pages/IntroductoryTutorial.tsx:195-199` | `dark-content`, bg `theme.colors.white`, `translucent={false}` | status bar | status bar from the theme (one place) |
| IntroductoryTutorial | slide | `src/pages/IntroductoryTutorial.tsx:57-60`, `:115-121` | `flex:1`; `paddingTop: insets.top`; `paddingBottom: 80 + insets.bottom`; bg `item.bg` = `theme.colors.white` | one tutorial page | space token; safe-area inset from the layout |
| IntroductoryTutorial | slide media | `src/pages/IntroductoryTutorial.tsx:61-66`, `:109-111`, `:122-124` | clip box `height: H × 0.6634645`, `width: W`, `overflow:hidden`; `Image` `W × round(W × 1369/1242)`, `cover` | slide illustration | image keys (5 slides); aspect as layout, not token |
| IntroductoryTutorial | slide content box | `src/pages/IntroductoryTutorial.tsx:67-71` | `flex:1`, `paddingTop:30`, `paddingHorizontal:30` | text area | space tokens |
| IntroductoryTutorial | slide title | `src/pages/IntroductoryTutorial.tsx:86-94`, `:126` | raw `Text`; `fontFamily:'Poppins'`, 22, `bold`, `#344050`, left, `width: W × .85`, `bottom: H × 0.01`, 2 lines | slide title | text preset (title) + text color role |
| IntroductoryTutorial | slide text | `src/pages/IntroductoryTutorial.tsx:77-85`, `:127` | raw `Text`; `'Poppins'`, 18, `lineHeight:28`, `#344050`, left, `width: W × .85`, `top: H × 0.005`, 3 lines | slide body | text preset (body large) + text color role |
| IntroductoryTutorial | Next | `src/pages/IntroductoryTutorial.tsx:95-106`, `:133-148` | `View` 90×40, `top:3`, centered, `right:0`; raw `Text` 16 / `'300'` / `theme.colors.primary` (no family) + AntDesign `arrowright` 16 primary; wrapped by the library's `TouchableOpacity` | advance | button (text/link appearance) with trailing icon |
| IntroductoryTutorial | Skip | `src/pages/IntroductoryTutorial.tsx:150-162` | same box; `marginLeft`: Android `W × .45`, iOS 0; `start`: iOS `W × 0.45`, Android 0; shown only on slide 0 (`:222-225`) | jump to last slide | button (text/link) |
| IntroductoryTutorial | Done | `src/pages/IntroductoryTutorial.tsx:175-184` | same box, `right:0`; label "Let's start!" | finish tutorial | button (text/link) — or primary: question |
| IntroductoryTutorial | pagination dots | `src/pages/IntroductoryTutorial.tsx:205-218` | active: bg `theme.colors.primary`, 8.3×8.3, `position:relative`, `right: W × 0.29`; inactive: bg `'lightgray'`, 8×8, same offset. Library base: 10×10, radius 5, `marginHorizontal:4`; container absolute `bottom/left/right: 16`; dots row `height:16`, `margin:16` | page indicator (tappable) | pager-dots primitive of the app replacing the library; color roles (active = primary, inactive = neutral) |
| Home (page) | root view | `src/pages/Home.tsx:10-15`, `:31` | `flex:1`, bg `theme.colors.black` | fallback behind the background image | color role |
| Home (page) | `StatusBar` | `src/pages/Home.tsx:32-38` | `translucent`, bg `theme.colors.transparent`, `light-content`, fade, animated | status bar over the photo | status bar from the theme |
| Home (UI) | `BackgroundImage` | `src/ui/src/components/Home/styles.tsx:26-34`; `src/ui/src/components/Home/index.tsx:141-144` | `ImageBackground` 100% × 100%, `cover`; `theme.images.backgroundsImages.login` | welcome hero | image key (welcome background) |
| Home (UI) | overlay | `src/ui/src/components/Home/index.tsx:70-78`, `:145` | absolute fill, bg `theme.colors.black`, `opacity: 0.4` | darkens the photo for legibility | overlay color role + opacity token |
| Home (UI) | `WrapperContainer` / scroll content | `src/ui/src/components/Home/styles.tsx:14-24`; `src/ui/src/components/Home/index.tsx:147-160` | `padding-horizontal:20`, `padding-bottom:20`; scroll content `paddingTop: insets.top`, `paddingBottom: keyboardInset > 0 ? keyboardInset + 16 : max(insets.bottom, 20)` | page gutters | space tokens (screen gutter); inset from layout |
| Home (UI) | logo | `src/ui/src/components/Home/styles.tsx:8-12`; `src/ui/src/components/Home/index.tsx:34-37`, `:161-163` | `OIcon` 180×40 `contain`, `theme.images.logos.logotypeInvert`; wrapper `margin-vertical:20` | brand | image key (logo on dark) |
| Home (UI) | hero title | `src/ui/src/components/Home/index.tsx:44-48`, `:166-168` | `OText`; 36 / `'600'` / `theme.fonts.special.name` (`Inter_18pt-Black`) / color `theme.colors.inputChat` (#F8F9FA) | welcome title | text preset (display) + on-image color role |
| Home (UI) | hero subtitle | `src/ui/src/components/Home/index.tsx:49-53`, `:169-171` | `OText`; 16 / `'300'` / special / `inputChat`; text block `marginBottom:20` (`:41-43`) | welcome subtitle (text from page prop `title`, `src/pages/Home.tsx:23-26`) | text preset (body large) + on-image color role |
| Home (UI) | project name input (only `useRootPoint`) | `src/ui/src/components/Home/index.tsx:64-69`, `:175-205`; `src/ui/src/components/Home/styles.tsx:36-41` | `OInput` with `borderWidth:1`, `borderRadius:7.6`, `borderColor`: `theme.colors.error` when the form has errors, else `theme.colors.white`; bg `theme.colors.transparent`; text and placeholder `theme.colors.white`; `selectionColor` primary; wrapper `min-height:50` | project name (multi-project builds) | `input` + `field` (on-dark appearance); error state from the theme |
| Home (UI) | error text | `src/ui/src/components/Home/index.tsx:207-214` | `OText` 14 (default) `theme.colors.white`, inline `alignSelf:'center'`, `marginTop:5` | field error | `field` error text (text preset caption + danger/on-image role) |
| Home (UI) | main button | `src/ui/src/components/Home/index.tsx:54-63`, `:215-229` | `OButton`: `bgColor`/`borderColor` primary; `style` `borderRadius:7.6`, `marginTop:20`; `textStyle` `fontSize:16`, color `theme.colors.inputTextColor` (#FFFFFF); wrapper `marginBottom:20`; `isLoading` shows a spinner. From `OButton`: height 50, border 2, text 700 special font | "Login" / "Set project" | `button` (primary, lg) |
| Login (page) | wrappers | `src/pages/Login.tsx:11-13`, `:40-46` | `KeyboardAvoidingView flex:1` (`behavior` iOS `padding` / Android `height`) → `Container` with inline `backgroundColor: theme.colors.white` (goes to the `SafeAreaView`, the `ScrollView` content and the `StatusBar`) | page shell | one screen layout; color role (page background) |
| LoginForm | form wrapper | `src/ui/src/components/LoginForm/index.tsx:388-391`, `:472` | `paddingBottom:40`, `width:'100%'` | form container | space token |
| LoginForm | header | `src/ui/src/components/LoginForm/index.tsx:473` | `ONavbar` (shared): title 24 / `'700'` / `theme.colors.textGray` / family `${theme.fonts.special.name}_18pt-Black`; back `OIconButton` with `arrow_left` 24×24 at absolute `top:-20; left:-20`; `paddingBottom:15` | screen top bar | `header` |
| LoginForm | login-method tabs | `src/ui/src/components/LoginForm/index.tsx:410-419`, `:475-504`; `src/ui/src/components/LoginForm/styles.tsx:3-14` | `LoginWith` `margin-bottom:30`; `TabsContainer` row with `min-width: ${width}px` where `width` is never passed; two `Pressable` `flex:1`, `height:40`; bg selected `theme.colors.secondary` (#FFF4DA) / unselected `theme.colors.gray100` (#F8F9FA); outer corners radius 10; label `OText` 16, `theme.fonts.primary.name`, color selected `primary` / unselected `unselectText`, weight selected `'600'` / `'normal'`. Both tabs ("Email", "OTP Email") are always rendered when the row shows | choose login method | one segmented tabs component (shared `OSegment` and the list tabs of other areas do the same): question which stays |
| LoginForm | email input | `src/ui/src/components/LoginForm/index.tsx:420-431`, `:509-549` | `OInput` `style`: `marginBottom:20`, `borderWidth:1`, `borderRadius:10`, `borderColor: theme.colors.inputSignup` (#DEE2E6), bg `transparent`, `minHeight:50`, `maxHeight:50` (also `color`, `fontWeight`, `fontFamily`, which are text props on a View); placeholder `unselectText`; text `textGray`; `selectionColor` primary | email | `input` + `field` |
| LoginForm | phone input | `src/ui/src/components/LoginForm/index.tsx:432-438`, `:551-564` | `PhoneInputNumber` in a `View` with inline `marginBottom:20`; flag button `width:79`, `borderWidth:1`, `borderRadius:7.6`, `marginRight:9`, `borderColor: inputSignup` | cellphone login / OTP by cellphone | `input` (phone) + select as a sheet for the country |
| LoginForm | password input | `src/ui/src/components/LoginForm/index.tsx:566-611` | same `OInput` style; right icon `MaterialCommunityIcons` `eye-outline` / `eye-off-outline` 24, `theme.colors.arrowColor` (#B1BCCC), `onPress` on the glyph | password + show/hide | `input` + `field`; icon button for the toggle |
| LoginForm | forgot link | `src/ui/src/components/LoginForm/index.tsx:439-444`, `:613-621` | `Pressable` inline `marginRight:'auto'`, `marginBottom:20`; `OText` 16 / `'400'` / `theme.colors.primary` / primary font | go to Forgot | `button` (link appearance) |
| LoginForm | reCAPTCHA v3 | `src/ui/src/components/LoginForm/index.tsx:624-631` | third-party WebView, `containerStyle={{ height: 40 }}` | bot check | stays third-party; space token for the box |
| LoginForm | reCAPTCHA v2 row | `src/ui/src/components/LoginForm/index.tsx:633-654`; `src/ui/src/components/LoginForm/styles.tsx:50-54` | `TouchableOpacity` inline `marginBottom:15` → row, `margin-bottom:10`; `MaterialCommunityIcons` `checkbox-marked` 26 primary / `checkbox-blank-outline` 26 `theme.colors.mediumGray`; `OText` 14 `mLeft={8}` | open the reCAPTCHA modal; shows verified | `checkbox` mark + row of a choice |
| LoginForm | submit | `src/ui/src/components/LoginForm/index.tsx:666-673` | `OButton` `bgColor`/`borderColor` primary, no style override: height 50, radius 10, border 2, text 16 / 700 / white / special font, `box-shadow: 1px 1px 2px #00000020` | "Login" / "Get verify code" | `button` (primary, lg) |
| LoginForm | "Or" separator | `src/ui/src/components/LoginForm/index.tsx:684-690`; `src/ui/src/components/LoginForm/styles.tsx:35-48` | `width:90%`, row, `margin-bottom:20`; two lines `width:40%`, `height:1px`, bg `theme.colors.disabled` (#CBCBCB); `OText` 18 `mLeft/mRight 20` | separates password login from verify code | `divider` (with label) |
| LoginForm | "Get Verify Code" | `src/ui/src/components/LoginForm/index.tsx:692-701`; `src/ui/src/components/LoginForm/styles.tsx:22-33` | wrapper `margin:10px 0 0`, `width:90%`, `margin-bottom:20`; `OButton` with `borderColor` primary and **no `bgColor`**: `OButton` only applies `borderColor` together with `bgColor` (`src/ui/src/components/shared/OButton.tsx:120-126`), so it paints the default filled primary; `indicatorColor` primary | send SMS code | `button`; appearance (outline or filled) is a question |
| LoginForm | VerifyPhone modal | `src/ui/src/components/LoginForm/index.tsx:705-717` | `OModal` default branch: full-screen view bg `rgba(0, 0, 0, 0.4)`, empty title row, content; no close control in this branch (`src/ui/src/components/shared/OModal.tsx:192-204`) | SMS code entry | `modal` (one implementation) |
| LoginForm | OTP modal | `src/ui/src/components/LoginForm/index.tsx:718-736` | `OModal entireModal hideIcons`, title "Enter verification code": back arrow 24 + title 24 / 700 | OTP entry | `modal` or `sheet` |
| LoginForm | error alert | `src/ui/src/components/LoginForm/index.tsx:737-743` | `OAlertOriginal` → system `Alert.alert` (Accept / Cancel) | code check errors, "code sent", "time is up" | `alert` (system alerts stay system) |
| Otp | container | `src/ui/src/components/LoginForm/Otp/styles.tsx:3-7` | `padding:20px`, centered, `flex:1` | modal body | space token |
| Otp | timer | `src/ui/src/components/LoginForm/Otp/index.tsx:119-121` | `OText` 24, default color `#344050` | time left (mm:ss) | text preset |
| Otp | code cells | `src/ui/src/components/LoginForm/Otp/index.tsx:102-114`, `:122-133` | `OTPInputView` `width:'100%'`, `height:150`, 6 cells; cell 45×60, `borderWidth:1`, `fontSize:16` (library default: border and text `rgba(226, 226, 226, 1)`, radius 2); focused: `borderColor` and `color` primary; `selectionColor` primary | 6-digit code | `input` (digit/OTP), a primitive of the app replacing the library |
| Otp | resend | `src/ui/src/components/LoginForm/Otp/index.tsx:134-138` | `TouchableOpacity`, disabled while `otpLeftTime > 520`; `OText` 16 `mBottom={30}`, color `theme.colors.disabled` / `theme.colors.primary` | resend code | `button` (link) with disabled state |
| Otp | cancel | `src/ui/src/components/LoginForm/Otp/index.tsx:139-146` | `OButton` bg `theme.colors.white`, border primary, text primary, `borderRadius:8`, `width:'100%'` | close modal | `button` (outline) |
| Otp | error | `src/ui/src/components/LoginForm/Otp/index.tsx:78-93` | system `Alert.alert` | wrong code | `alert` (system) |
| ForgotPassword (page) | wrappers | `src/pages/ForgotPassword.tsx:10-12`, `:18-24` | identical to Login's | page shell | one screen layout |
| ForgotPasswordForm | container | `src/ui/src/components/ForgotPasswordForm/styles.tsx:3-5` | `padding-bottom:40px` | form | space token |
| ForgotPasswordForm | header | `src/ui/src/components/ForgotPasswordForm/index.tsx:89-92` | `ONavbar`, title "Forgot your password?" | top bar | `header` |
| ForgotPasswordForm | intro text | `src/ui/src/components/ForgotPasswordForm/index.tsx:94-101` | `OText` 16, default color `#344050`, inline `marginBottom:30` | instructions | text preset (body) |
| ForgotPasswordForm | email input | `src/ui/src/components/ForgotPasswordForm/index.tsx:79-84`, `:104-141` | `OInput` `marginBottom:25`, `borderWidth:1`, `borderColor: theme.colors.disabled` (#CBCBCB), `borderRadius:7.6`; placeholder `arrowColor`; text `textGray`; no background override | email | `input` + `field` |
| ForgotPasswordForm | submit | `src/ui/src/components/ForgotPasswordForm/index.tsx:143-165` | `OButton`; text "Recover Password" / "Link Sent"; bg and border primary, or `theme.colors.disabled` once sent (still a touchable with an empty handler); `isLoading` | send reset link | `button` (primary) with a real disabled state |
| VerifyPhone | container | `src/ui/src/components/VerifyPhone/styles.tsx:3-8` | `width:100%`, `padding-top:5px`, `padding-left/right:20px` | modal body | space tokens |
| VerifyPhone | title | `src/ui/src/components/VerifyPhone/index.tsx:124-126` | `OText` 30, left | modal title | text preset (title) |
| VerifyPhone | hint | `src/ui/src/components/VerifyPhone/index.tsx:127-134` | `OText` 20, color `theme.colors.disabled` | "code sent to …**NN" | text preset (body) + muted text role |
| VerifyPhone | countdown pill | `src/ui/src/components/VerifyPhone/styles.tsx:10-17`, `:26-29`; `src/ui/src/components/VerifyPhone/index.tsx:135-146` | wrapper `padding-top/bottom:20px`; pill bg `${color}4D` (hex + alpha by string concatenation), `border-radius:30px`, `padding:5px 80px 0`; `OText` 30; color `theme.colors.success` (#90C68E), or `theme.colors.error` (#C90800) at `00:00` | time left | `badge`/`chip` with success and danger tones: question |
| VerifyPhone | digit inputs | `src/ui/src/components/VerifyPhone/index.tsx:109-120`, `:147-159`; `src/ui/src/components/VerifyPhone/styles.tsx:31-35` | 4 raw `TextInput` 80×80, `marginBottom:25`, `borderWidth:1`, `borderColor: theme.colors.disabled`, `borderRadius:20`, centered, `fontSize:40`; placeholder `'0'`; no color, family or focus style; not editable at `00:00`; row `space-between` | 4-digit SMS code | `input` (digit/OTP), same primitive as Otp |
| VerifyPhone | errors | `src/ui/src/components/VerifyPhone/index.tsx:160-188`; `src/ui/src/components/VerifyPhone/styles.tsx:37-43` | `margin-bottom:20px`; `OText` 20 `theme.colors.error`, "* message" | API errors | `field` error text / `alert` |
| VerifyPhone | resend row | `src/ui/src/components/VerifyPhone/index.tsx:189-198`; `src/ui/src/components/VerifyPhone/styles.tsx:19-24` | row centered, `margin-bottom:30px`; `OText` 17 inline `marginRight:5`; `Pressable` + `OText` 17 primary | resend | text preset + `button` (link) |
| VerifyPhone | loading | `src/ui/src/components/VerifyPhone/index.tsx:199` | `react-native-loading-spinner-overlay`, default look | checking code | `spinner` |
| PhoneInputNumber | field | `src/ui/src/components/PhoneInputNumber/index.tsx:82-94`, `:98-130` | `containerStyle` `width:'100%'`; `textContainerStyle`: bg `theme.colors.white`, `borderRadius:7.6`, `borderWidth:1`, `borderColor: inputSignup`, `paddingVertical:0`, `paddingLeft:35`, `height:50`; `codeTextStyle` `display:'none'`; text `textGray`, placeholder `arrowColor`, selection primary; number text 16 (library) | phone number | `input` (phone) |
| PhoneInputNumber | dropdown chevron | `src/ui/src/components/PhoneInputNumber/index.tsx:131-138` | `OIcon` `chevronDown` 16×16, tint `arrowColor` | open the country list | `icon` (sm), color by role |
| PhoneInputNumber | phone glyph | `src/ui/src/components/PhoneInputNumber/index.tsx:151-162` | `View` absolute `top:15`, `left:99`; `OIcon` `inputPhone` 20×20, no color | leading icon of the field | `icon` inside `input`, not absolute |
| PhoneInputNumber | field error | `src/ui/src/components/PhoneInputNumber/index.tsx:142-149` | `OText` 16, `theme.colors.error`, centered, `marginTop:5` | invalid number | `field` error text |
| PhoneInputNumber | country modal | `src/ui/src/components/PhoneInputNumber/index.tsx:111-116` | library modal; close image `theme.images.general.close` 15×15; filters off | choose country | select as a `sheet` with `menu` rows |
| ScheduleBlocked (page) | wrapper | `src/pages/ScheduleBlocked.tsx:10-15`, `:22` | `SafeAreaView` (safe-area-context) `edges={['top']}`, `flex:1`, bg `theme.colors.clear` (`transparent`) | page shell | one screen layout; color role (page background) |
| ScheduleBlocked (UI) | content | `src/ui/src/components/ScheduleBlocked/index.tsx:35` | inline `alignItems:'center'`, `padding:40` | layout | `empty_state` |
| ScheduleBlocked (UI) | title | `src/ui/src/components/ScheduleBlocked/index.tsx:36` | `OText` 20, weight 400, `#344050` | "You can't login" | text preset (title) |
| ScheduleBlocked (UI) | illustration | `src/ui/src/components/ScheduleBlocked/index.tsx:13`, `:37-41` | `OIcon` `theme.images.general.deliveryWaiting`, `(W − 80) × 0.9` by `(W − 80) × 0.8`, `W = Dimensions.get('screen').width`, `contain` | illustration | image key; size as layout |
| ScheduleBlocked (UI) | message and next time | `src/ui/src/components/ScheduleBlocked/index.tsx:42-46` | `OText` 14 default; row inline `marginBottom:20`: label `OText` 14 primary, value `OText` 14 | explanation; next schedule | text presets; emphasis color role |
| ScheduleBlocked (UI) | button | `src/ui/src/components/ScheduleBlocked/index.tsx:47-51` | `OButton` defaults (filled primary), `textStyle` color `theme.colors.white`; width = content | "Go back" (logs out) | `button` (primary) |
| RequestPermissions | container | `src/pages/RequestPermissions.tsx:19-26`, `:50-53` | styled `KeyboardAvoidingView` declared inside the component: `flex-grow:1`, bg `backgroundPage`, padding iOS `30px` / Android `0 30px 30px`, centered | page shell | one screen layout |
| RequestPermissions | message | `src/pages/RequestPermissions.tsx:54-72` | `NotFoundSource` (image `notFound` 260×220, text 14 `theme.colors.textSecondary` #858585, centered); Android wraps it in a `ScrollView`; the `errorImage` prop is not read by `NotFoundSource` | why location is needed (long disclosure text on Android) | `empty_state` |
| RequestPermissions | bottom button | `src/pages/RequestPermissions.tsx:74-82` | `FloatingButton`: bar absolute bottom, bg `#fff`, `padding-vertical:10px`, `paddingHorizontal:20`, iOS bottom `max(20, inset)`; button 100% × 50, radius 10, `marginTop:10`; label `OText` 18 white, `weight='700'` prop with `fontWeight:'normal'` in its style (the style wins). `firstColorCustom={theme.colors.red}` is only used when `secondButton` is set (`src/ui/src/components/FloatingButton/index.tsx:80-84`), so primary is painted | "Go to settings" | `button` (primary or danger: question) in a bottom bar |
| DriverSchedule | scroll | `src/ui/src/components/DriverSchedule/index.tsx:72-79` | `ScrollView`; Android `maxHeight: windowHeight`, content `paddingBottom:120`; `RefreshControl` with system colors | modal body | `modal`/`sheet` body; spinner color role |
| DriverSchedule | header | `src/ui/src/components/DriverSchedule/index.tsx:80-82` | inline `paddingHorizontal:20`, `paddingTop`: iOS `insets.top`, Android 15; `ONavbar` "Schedule" | top bar | `header` |
| DriverSchedule | date banner | `src/ui/src/components/DriverSchedule/index.tsx:83-85` | inline `borderRadius:10`, `marginHorizontal:20`, `padding:15`, centered, bg `theme.colors.secondary`; `OText` 20 / 700 primary | today's date | `card` (tinted) + text preset |
| DriverSchedule | day card | `src/ui/src/components/DriverSchedule/styles.tsx:3-10`; `src/ui/src/components/DriverSchedule/index.tsx:86-116` | list inline `marginHorizontal:20`, `marginTop:10`; card row, `border-radius:10px`, bg `theme.colors.gray100`, `padding:15px`, `margin-bottom:10px`; day `OText` 22 / 700; date `OText` 14; lapse row inline `marginTop:3`, `marginBottom:20`, `OText` 18 (open, "-" in `width:15`, close right-aligned); disabled day `OText` 18 `theme.colors.red`, `marginTop:3`, `marginBottom:10` | weekly schedule | `card` + text presets; danger color role |
| Signup (dead) | whole form | `src/ui/src/components/SignupForm/index.tsx:295-338`, `:340-525`; `src/ui/src/components/SignupForm/styles.tsx:11-16` | header `marginBottom:30` with `OIconButton` `arrow_left` 20×20 (`maxWidth:40`, `height:25`, `marginBottom:25`) and title `'Poppins'` 26 / `'600'` `textGray`; inputs `marginBottom:20`, border 1, radius 7.6, `inputSignup`, left PNG icons 20×20; phone wrapper `marginBottom:25`; eye icon 24 `inputSignup`; buttons radius 7.6, `height:44`, text `'Poppins'` 18 normal `inputTextColor`; form `margin-bottom:35px`; two spinner overlays | driver sign-up | delete or wire: question. If kept: `header`, `input`, `button`, `spinner` |
| NotFound (dead) | page | `src/pages/NotFound.tsx:23-30`, `:32-51` | styled `KeyboardAvoidingView` inside the component, `padding:30px`, bg `backgroundPage`; `NotFoundSource` text 18; `FloatingButton` | 404 | delete or wire: question. If kept: `empty_state` |
| NetworkError (dead) | page | `src/pages/NetworkError.tsx:4-10`; `src/ui/src/components/NetworkError/index.tsx:20-57`; `src/ui/src/components/NetworkError/styles.tsx:3-11` | `padding:20px 40px`; title 20 / 700 `theme.colors.darkText`, inline `marginBottom:14`; body 14 `darkText`; image `(W − 80) × 0.9` by `(W − 80) × 0.8`; `OButton` radius 8, `marginTop:45`, text white | offline screen | delete or wire: question. If kept: `empty_state` |

### Duplicates (same function, different implementation)

| Function | Implementations (file:line) | Visible differences |
|---|---|---|
| Screen header (back + title) | `ONavbar` in `src/ui/src/components/LoginForm/index.tsx:473`, `src/ui/src/components/ForgotPasswordForm/index.tsx:89-92`, `src/ui/src/components/DriverSchedule/index.tsx:81`; own header in `src/ui/src/components/SignupForm/index.tsx:342-352`; `OModal` header for the OTP modal (`src/ui/src/components/shared/OModal.tsx:208-223`); unused `styles.title` in `src/ui/src/components/LoginForm/index.tsx:404-409` | `ONavbar`: centered title 24 / 700, arrow 24 absolute. Signup: arrow 20 above a left title 26 / 600 Poppins. `OModal`: arrow 24 inline + left title 24 / 700 |
| Bordered text input | `src/ui/src/components/LoginForm/index.tsx:420-431`; `src/ui/src/components/ForgotPasswordForm/index.tsx:79-84`; `src/ui/src/components/SignupForm/index.tsx:330-337`; `src/ui/src/components/Home/index.tsx:64-69`; `src/ui/src/components/PhoneInputNumber/index.tsx:82-94` | radius 10 / 7.6 / 7.6 / 7.6 / 7.6; border color `inputSignup` / `disabled` / `inputSignup` / `white` or `error` / `inputSignup`; bottom margin 20 / 25 / 20 / — / 20 or 25 set by the caller; background transparent / none / transparent / transparent / white; placeholder `unselectText` / `arrowColor` / default `baseColor` / white / `arrowColor` |
| Code entry | `src/ui/src/components/VerifyPhone/index.tsx:147-159` (4 raw `TextInput`); `src/ui/src/components/LoginForm/Otp/index.tsx:122-133` (library, 6 cells); a third one exists in `src/ui/src/components/AcceptOrRejectOrder/SecurityPinFields.tsx` (other area, not read) | 80×80, radius 20, font 40, no focus style — versus 45×60, radius 2, font 16, focus in primary |
| Countdown | `src/ui/src/components/VerifyPhone/index.tsx:59-93`, `:135-146`; `src/ui/src/components/LoginForm/Otp/index.tsx:30-31`, `:119-121` | tinted pill, 30, success/error color — versus plain text 24 |
| Resend link | `src/ui/src/components/LoginForm/Otp/index.tsx:134-138`; `src/ui/src/components/VerifyPhone/index.tsx:193-197` | `TouchableOpacity`, 16, disabled color for the first 80 s — versus `Pressable`, 17, no disabled state, no press feedback |
| Text link / text button | forgot link `src/ui/src/components/LoginForm/index.tsx:613-621`; resend links above; tutorial Next/Skip/Done `src/pages/IntroductoryTutorial.tsx:133-184` | `Pressable` + `OText` 16 / 400 primary font; raw `Text` 16 / 300 system font in a 90×40 box |
| Main button (overrides on `OButton`) | `src/ui/src/components/Home/index.tsx:215-229`; `src/ui/src/components/LoginForm/index.tsx:666-673`; `src/ui/src/components/ForgotPasswordForm/index.tsx:143-165`; `src/ui/src/components/ScheduleBlocked/index.tsx:47-51`; `src/ui/src/components/SignupForm/index.tsx:486-508`; `src/ui/src/components/NetworkError/index.tsx:42-54`; `FloatingButton` in `src/pages/RequestPermissions.tsx:74-82` | radius 7.6 / 10 / 10 / 10 / 7.6 / 8 / 10 (own touchable); height 50 except Signup 44; label 16 / 700 except Signup 18 normal Poppins and FloatingButton 18 (weight 700 by prop, `normal` by style); text color key `inputTextColor` / default white / default / `white` / `inputTextColor` / `white` |
| Outline button | `src/ui/src/components/LoginForm/Otp/index.tsx:139-146`; `src/ui/src/components/LoginForm/index.tsx:693-700`; `src/ui/src/components/SignupForm/index.tsx:487-496` | Otp passes bg white + border primary + text primary and is outline; the other two pass only `borderColor` and paint filled |
| Password show/hide | `src/ui/src/components/LoginForm/index.tsx:575-591`; `src/ui/src/components/SignupForm/index.tsx:435-451` | icon color `arrowColor` versus `inputSignup` |
| Full-screen message with illustration | `src/ui/src/components/ScheduleBlocked/index.tsx:35-52`; `src/ui/src/components/NetworkError/index.tsx:21-56`; `NotFoundSource` via `src/pages/RequestPermissions.tsx:55-70` and `src/pages/NotFound.tsx:38-41` | title 20 / 400 above image — title 20 / 700 + body above image — image 260×220 above gray text; image formula `(W − 80) × 0.9 / 0.8` duplicated in the first two |
| Page shell for forms | `src/pages/Login.tsx:11-13`, `:40-46`; `src/pages/ForgotPassword.tsx:10-12`, `:18-24`; `src/pages/Signup.tsx:13-15`, `:44-50` | identical code three times |
| Page shell for messages | `src/pages/RequestPermissions.tsx:19-26`; `src/pages/NotFound.tsx:23-30` | same styled `KeyboardAvoidingView`; padding differs by platform only in the first |
| Error display | toast (`showToast`, 19 calls: `src/ui/src/components/LoginForm/index.tsx:121-357`, `src/ui/src/components/SignupForm/index.tsx:150-282`, `src/ui/src/components/ForgotPasswordForm/index.tsx:40-62`); inline text `src/ui/src/components/PhoneInputNumber/index.tsx:142-149` and `src/ui/src/components/Home/index.tsx:207-214`; inline list `src/ui/src/components/VerifyPhone/index.tsx:176-187`; system alert `src/ui/src/components/LoginForm/Otp/index.tsx:80-93` and `src/ui/src/components/LoginForm/index.tsx:737-743` | four mechanisms; inline sizes 16 / 14 / 20; colors `error` / white / `error` |
| Error color | `theme.colors.error` (#C90800) in `src/ui/src/components/PhoneInputNumber/index.tsx:145`, `src/ui/src/components/VerifyPhone/index.tsx:137`, `:183`, `src/ui/src/components/Home/index.tsx:67`; `theme.colors.red` (#E63757) in `src/ui/src/components/DriverSchedule/index.tsx:112`, `src/pages/RequestPermissions.tsx:78` | two reds for the same meaning |
| Loading | `OButton isLoading` (`src/ui/src/components/Home/index.tsx:224`, `src/ui/src/components/LoginForm/index.tsx:672`, `:698`, `src/ui/src/components/ForgotPasswordForm/index.tsx:159`); overlay library (`src/ui/src/components/VerifyPhone/index.tsx:199`, `src/ui/src/components/SignupForm/index.tsx:483`, `:523`) | spinner in the button versus a full-screen overlay |
| Safe area | `SafeAreaContainer edges={[]}` + insets by hand (`src/pages/IntroductoryTutorial.tsx:119-120`, `:194`); insets by hand (`src/ui/src/components/Home/index.tsx:154-155`, `src/ui/src/components/DriverSchedule/index.tsx:80`); core `SafeAreaView` in `Container` (Login, Forgot); safe-area-context `SafeAreaView` (`src/pages/ScheduleBlocked.tsx:22`); none (`src/pages/RequestPermissions.tsx`) | five ways |
| Status bar | `src/pages/IntroductoryTutorial.tsx:195-199`; `src/pages/Home.tsx:32-38`; `src/ui/src/layouts/Container.tsx:39-45` (Login, Forgot); none in ScheduleBlocked and RequestPermissions | set per screen with different props |
| Tinted card | `src/ui/src/components/DriverSchedule/index.tsx:83` (inline); `src/ui/src/components/DriverSchedule/styles.tsx:3-10` (styled) | same radius 10 and padding 15, written two ways in one file |

### Blocks and pieces

| Page | Block or piece | Hideable? Movable? | Why |
|---|---|---|---|
| Splash | launch image | no / no | must match the native launch screen frame by frame; the native splash cannot change at run time |
| IntroductoryTutorial | whole screen | hideable (today by `show_tutorials` in `src/config.json`, a build-time flag, not the theme) / no | question: does the theme take over this flag |
| IntroductoryTutorial | each slide (image, title, text) | image and texts editable; slide count is fixed at 5 in code (`src/pages/IntroductoryTutorial.tsx:23-54`) | texts are i18n keys; images are theme keys |
| IntroductoryTutorial | Skip | hideable / no | Next and swipe still work |
| IntroductoryTutorial | dots | hideable / no | decorative; positions are absolute offsets from the window width |
| IntroductoryTutorial | Next / Done | Done is required | the only way to leave the tutorial |
| Home | background image | hideable (black fallback) / no | `src/pages/Home.tsx:13` |
| Home | overlay | hideable (a value: opacity) / no | legibility of white text over the photo |
| Home | logo | hideable / movable | independent block in the scroll |
| Home | title, subtitle | hideable each / movable | independent texts |
| Home | project name input | not the theme's | `use_root_point` (build-time) |
| Home | Login button | required | only exit of the screen |
| Login | back button | question | Android has the system back; iOS has the swipe gesture |
| Login | title | hideable | part of the header |
| Login | method tabs | not the theme's | server configs choose the login methods |
| Login | forgot link | hideable in code terms / no | only entry to Forgot: product decision |
| Login | reCAPTCHA, "Or" + "Get Verify Code" | not the theme's | server configs (`security_recaptcha_*`, `twilio_service_enabled`) |
| ForgotPassword | intro text | hideable | informative |
| ForgotPassword | input, button | required | the form |
| ScheduleBlocked | title, illustration, message, next-time row | hideable each / movable | independent blocks in a column |
| ScheduleBlocked | Go back | required | only exit (logout) |
| RequestPermissions | illustration | hideable | decorative |
| RequestPermissions | text | required | Android background-location disclosure text; store policy: confirm |
| RequestPermissions | Go to settings | required | only action |
| DriverSchedule | date banner | hideable / movable | informative |
| DriverSchedule | day cards | required; the date line under each day is hideable | the content |
| VerifyPhone | hint | hideable | informative |
| VerifyPhone | countdown, inputs, resend | required | functional |
| Otp | timer, cells, resend, cancel | required | functional; cancel is the only close besides the header arrow |

### Images

No image in this area has an `accessibilityLabel` (grep for `accessib` in the area's files: 0 matches).

| Key or source | file:line | Painted box | Fit | Fallback | alt |
|---|---|---|---|---|---|
| `theme.images.general.loadingSplash`: iOS `{ uri: 'SplashImage' }` (`ios/deliveryApp/Images.xcassets/SplashImage.imageset`), Android `android/app/src/main/res/mipmap-xxxhdpi/splash.png` (2732×2732, 13.5 KB, opaque) — `src/DeliveryApp.tsx:44-46` | `src/pages/Splash.tsx:62`, `:79` | iOS: `W × 250/393` by `H × 80/852`. Android: screen width × screen height | contain / cover | none; `onError` only hides the native splash | none |
| `theme.images.tutorials.slide1`–`slide5` (`src/assets/images/slide1.png`–`slide5.png`, 1242×1369, opaque PNG, 1.65 + 1.68 + 1.68 + 1.91 + 2.03 = 8.96 MB) | `src/pages/IntroductoryTutorial.tsx:27`, `:33`, `:39`, `:45`, `:51`, `:123` | `W` by `round(W × 1369/1242)`, clipped to `W` by `H × 0.6634645` | cover | none | none |
| `theme.images.backgroundsImages.login` (`src/assets/images/background.png`, 375×812 with alpha, 615 KB) | `src/ui/src/components/Home/index.tsx:142` | full screen | cover | black page background | none |
| `theme.images.logos.logotypeInvert` (`src/assets/images/logotype-invert.png`, 250×55, 4 KB) | `src/ui/src/components/Home/index.tsx:162` | 180×40 | contain | `OIcon` uses `theme.images.logos.logo` only when `src` is falsy | none |
| `theme.images.general.deliveryWaiting` (`src/assets/images/delivery-waiting.png`, 199×199, 14 KB) | `src/ui/src/components/ScheduleBlocked/index.tsx:38` | `(W − 80) × 0.9` by `(W − 80) × 0.8` (about 282×250 at 393 wide: upscaled) | contain | same `OIcon` fallback | none |
| `theme.images.general.notFound` (`src/assets/images/not-found.png`, 279×279, 28 KB) | `src/ui/src/components/NotFoundSource/index.tsx:12`, `:18`, used by `src/pages/RequestPermissions.tsx:55`, `:65` and `src/pages/NotFound.tsx:38` | 260×220 (wrapper `max-width:300px`) | contain | none | none |
| `theme.images.general.noNetwork` (`src/assets/images/no-network.png`, 1002×904, 114 KB) | `src/ui/src/components/NetworkError/index.tsx:17`, `:38` (dead screen) | `(W − 80) × 0.9` by `(W − 80) × 0.8` | contain | `image` prop first | none |
| `theme.images.general.arrow_left` (`src/assets/icons/arrow_left.png`, 24×24) | via `ONavbar` (Login, Forgot, DriverSchedule); `src/ui/src/components/SignupForm/index.tsx:344` | 24×24; 20×20 in Signup | default | none | none |
| `theme.images.general.chevronDown` (`src/assets/icons/chevron-down.png`, 64×64) | `src/ui/src/components/PhoneInputNumber/index.tsx:133` | 16×16, tint `arrowColor` | contain | none | none |
| `theme.images.general.inputPhone` (`src/assets/icons/phone_input.png`, 64×64) | `src/ui/src/components/PhoneInputNumber/index.tsx:158` | 20×20 | contain | none | none |
| `theme.images.general.close` (`src/assets/icons/Close.png`, 128×128) | `src/ui/src/components/PhoneInputNumber/index.tsx:114-115` | 15×15 (library close button) | library | none | none |
| `theme.images.logos.emailInputIcon` (16×12), `theme.images.logos.passwordInputIcon` (10×16), `theme.images.general.profile` (64×65) | `src/ui/src/components/SignupForm/index.tsx:373-374`, `:434` (dead screen) | 20×20 inside `OInput` | contain | none | none |
| Country flags | `react-native-country-picker-modal`, through `src/ui/src/components/PhoneInputNumber/index.tsx:98` | library | library | library | library |
| Bundled, never painted | `theme.images.logos.background` (`src/DeliveryApp.tsx:36`, same file as the login background), `theme.images.logos.logotype` (`src/DeliveryApp.tsx:37`, 798×180, 30 KB): no reader in `src` outside the submodule. `src/assets/images/loading-splash.png` (151 KB) and `src/assets/images/close.png` (536 B): no `require` | — | — | — | — |

### Off the scale or without a token

| Value | Where | Why it does not fit |
|---|---|---|
| `#344050` literal | `src/pages/IntroductoryTutorial.tsx:78`, `:91`; and the default of every `OText` without a color (14 of the 29 `OText` uses in this area: DriverSchedule 5, ScheduleBlocked 3, LoginForm 2, VerifyPhone 2, ForgotPasswordForm 1, Otp 1) | same value as `theme.colors.textGray` but written as a literal; the default text color is not a theme read |
| `'lightgray'` | `src/pages/IntroductoryTutorial.tsx:213` | named color, no key |
| `#03DAC6` | `src/ui/src/components/LoginForm/index.tsx:451` | literal in a style entry nothing uses |
| `${color}4D` | `src/ui/src/components/VerifyPhone/styles.tsx:11` | alpha by string concatenation: only valid for 6-digit hex; `theme.json` also holds `rgb(...)` and named colors |
| `opacity: 0.4` on black | `src/ui/src/components/Home/index.tsx:76-77` | overlay strength without a token |
| Library colors: `rgba(226, 226, 226, 1)` (OTP cell border and text), `#000000` / `white` / `#F8F9F9` (phone field), `rgba(255, 255, 255, .9)` / `rgba(0, 0, 0, .2)` (slider dots, overridden) | `node_modules/@twotalltotems/react-native-otp-input/dist/styles.js`, `node_modules/react-native-phone-number-input/lib/styles.js`, `node_modules/react-native-app-intro-slider/dist/index.js` | painted by libraries; reachable only through style props |
| Font sizes 22, 26, 30, 40 | 22: `src/pages/IntroductoryTutorial.tsx:89`, `src/ui/src/components/DriverSchedule/index.tsx:90`. 26: `src/ui/src/components/LoginForm/index.tsx:407` (unused), `src/ui/src/components/SignupForm/index.tsx:310` (dead). 30: `src/ui/src/components/VerifyPhone/index.tsx:124`, `:139`. 40: `src/ui/src/components/VerifyPhone/index.tsx:118` | off the catalog levels in `.theme-audit/scales.md` |
| Font sizes 17 and 15 | 17: `src/ui/src/components/VerifyPhone/index.tsx:190`, `:194`. 15: `OInput` text (shared) under every input here | near-duplicates of 16 and 14 |
| `'Poppins'` | `src/pages/IntroductoryTutorial.tsx:81`, `:88`; `src/ui/src/components/SignupForm/index.tsx:307`, `:319` | hard-coded family; the bundled files are `Poppins-Regular`, `Poppins-Bold`… (`src/assets/fonts`), so the name does not match a file on Android |
| `theme.fonts.special.name` = `Inter_18pt-Black` with `fontWeight` 600 / 300 / 700 | `src/ui/src/components/Home/index.tsx:46-47`, `:50-51`; `OButton` label (shared) | a single Black cut used as a family plus a weight |
| `${theme.fonts.special.name}_18pt-Black` = `Inter_18pt-Black_18pt-Black` | `src/ui/src/components/shared/ONavbar.tsx:33` (title of Login, Forgot, DriverSchedule) | no bundled file has that name |
| No `fontFamily` | `src/pages/IntroductoryTutorial.tsx:102-106` (tutorial buttons); `src/ui/src/components/VerifyPhone/index.tsx:109-120` (digits) | raw `Text`/`TextInput` on the system font |
| Font weights `'300'`, `'bold'`, `'normal'`, `'600'`, `700` | `src/pages/IntroductoryTutorial.tsx:90`, `:104`; `src/ui/src/components/Home/index.tsx:47`, `:50`; `src/ui/src/components/LoginForm/index.tsx:497`; `src/ui/src/components/DriverSchedule/index.tsx:84`, `:90` | five spellings; 300 exists only here |
| `lineHeight: 28` | `src/pages/IntroductoryTutorial.tsx:80` | absolute (ratio 1.556 on 18); the only line height in the area |
| Radius 7.6, 8, 10 for the same control | inputs: 10 (`src/ui/src/components/LoginForm/index.tsx:424`) and 7.6 (`src/ui/src/components/ForgotPasswordForm/index.tsx:83`, `src/ui/src/components/Home/index.tsx:66`, `src/ui/src/components/PhoneInputNumber/index.tsx:85`). Buttons: 10 (default), 7.6 (`src/ui/src/components/Home/index.tsx:58`), 8 (`src/ui/src/components/LoginForm/Otp/index.tsx:144`) | three values for one role |
| Radius 20 and 30; library radius 2 | `src/ui/src/components/VerifyPhone/index.tsx:116`; `src/ui/src/components/VerifyPhone/styles.tsx:12`; OTP cells | one-off shapes for code boxes and the pill |
| Space 40, 80, 35, 9, 14, 45, 120 | 40: `src/ui/src/components/LoginForm/index.tsx:389`, `src/ui/src/components/ForgotPasswordForm/styles.tsx:4`, `src/ui/src/components/ScheduleBlocked/index.tsx:35`. 80: `src/pages/IntroductoryTutorial.tsx:59`, `:120`; `src/ui/src/components/VerifyPhone/styles.tsx:13`. 35: `src/ui/src/components/PhoneInputNumber/index.tsx:89`, `src/ui/src/components/SignupForm/styles.tsx:15`. 9: `src/ui/src/components/LoginForm/index.tsx:436`. 14 and 45: `src/ui/src/components/NetworkError/index.tsx:26`, `:48`. 120: `src/ui/src/components/DriverSchedule/index.tsx:10` | off the space levels |
| Absolute `top:15; left:99` | `src/ui/src/components/PhoneInputNumber/index.tsx:153-155` | derived from the flag button width 79 + margin 9 that the caller passes; with Signup's flag style (no width) it no longer lines up |
| Absolute `top:-20; left:-20` | `src/ui/src/components/shared/ONavbar.tsx:23-28` (used on 3 screens here) | assumes the parent has 20 of horizontal padding |
| Sizes 8.3 vs 8; 90×40; 79; 45×60; 80×80; 180×40; 260×220; `height:150`; `height:44` | `src/pages/IntroductoryTutorial.tsx:97-98`, `:209-210`, `:216-217`; `src/ui/src/components/LoginForm/index.tsx:433`; `src/ui/src/components/LoginForm/Otp/index.tsx:104-105`, `:124`; `src/ui/src/components/VerifyPhone/index.tsx:111-112`; `src/ui/src/components/Home/index.tsx:35-36`; `src/ui/src/components/SignupForm/index.tsx:315` | control and box sizes without a level |
| Window ratios 0.6634645, 1369/1242, .85, 0.29, .45, 0.7, 0.005, 0.01 | `src/pages/IntroductoryTutorial.tsx:62`, `:82`, `:84`, `:87`, `:93`, `:109`, `:154-155`, `:168`, `:208`, `:215` | layout by fractions of the window |
| `(W − 80) × 0.9` and `× 0.8` | `src/ui/src/components/ScheduleBlocked/index.tsx:39-40`; `src/ui/src/components/NetworkError/index.tsx:39-40` | image box from the screen width |
| 393×852 frame with 76 / 362 / 250 / 80 | `src/pages/Splash.tsx:6-7` | copy of the native launch screen geometry |
| Text props on a View | `src/ui/src/components/LoginForm/index.tsx:421`, `:429-430`; `src/ui/src/components/SignupForm/index.tsx:331` | `color`, `fontWeight`, `fontFamily` passed in `OInput`'s wrapper style |
| Props that paint nothing | `borderColor` without `bgColor` on `OButton` (`src/ui/src/components/LoginForm/index.tsx:696`, `src/ui/src/components/SignupForm/index.tsx:490`); `firstColorCustom` (`src/pages/RequestPermissions.tsx:78`); `errorImage` (`src/pages/RequestPermissions.tsx:59`, `:69`); `width` of `TabsContainer` (`src/ui/src/components/LoginForm/styles.tsx:10`, never passed) | the call asks for a look the component does not apply |
| Semantic mismatch of keys | `inputChat` as hero text color (`src/ui/src/components/Home/index.tsx:166`, `:169`); `inputTextColor` as button text (`:220`); `inputSignup` as every input border; `arrowColor` as placeholder and icon color; `disabled` as divider, hint text and input border | keys named after one use and reused for another role |

### Screens

| Screen | Root container | Sticky / absolute children | Blocks in render order |
|---|---|---|---|
| Splash | `View` (`SplashContainer`), no scroll | the image is absolute | 1 launch image (iOS: logo frame; Android: full-screen image) |
| IntroductoryTutorial | `SafeAreaContainer` (View) → `AppIntroSlider` (horizontal paging `FlatList`, library) | pagination overlay absolute at the bottom (library): dots, Next/Done right, Skip left | per slide: 1 media, 2 title, 3 text. Overlay: dots, Next (slides 0–3) or Done (slide 4), Skip (slide 0 only) |
| Home (welcome) | `View` → `ImageBackground` → `ScrollView` (`flexGrow:1`, `space-between`) | overlay absolute fill | 1 logo, 2 title + subtitle, 3 project input (if `useRootPoint`), 4 error text (if errors), 5 main button |
| Login | `KeyboardAvoidingView` → `Container` (`SafeAreaView` + `ScrollView`, padding iOS portrait `0 20 20`, otherwise `20`) | none | 1 header, 2 method tabs, 3 email or phone input, 4 password, 5 forgot link, 6 reCAPTCHA, 7 submit, 8 "Or" + "Get Verify Code"; modals: VerifyPhone, OTP; system alert |
| ForgotPassword | same as Login | none | 1 header, 2 intro text, 3 email input, 4 submit |
| ScheduleBlocked | `SafeAreaView` → `View`, no scroll | none | 1 title, 2 illustration, 3 message, 4 next-time row, 5 Go back |
| RequestPermissions | Fragment → `KeyboardAvoidingView` (iOS: content direct; Android: `ScrollView`) + `FloatingButton` | bottom bar absolute, `z-index:1000` | 1 illustration, 2 text, 3 bottom button |
| DriverSchedule (modal) | `ScrollView` with `RefreshControl` | none | 1 header, 2 date banner, 3 seven day cards |
| VerifyPhone (modal) | `View` inside `OModal`'s full-screen view | spinner overlay | 1 title, 2 hint, 3 countdown, 4 four digit boxes, 5 errors, 6 resend row |
| Otp (modal) | `View` inside `OModal entireModal` (header by `OModal`) | none | 1 timer, 2 six cells, 3 resend, 4 cancel |
| Signup (dead) | same shell as Login | two spinner overlays | 1 back + title, 2 dynamic fields, 3 phone, 4 password, 5 button; VerifyPhone modal |
| NotFound (dead) | Fragment → `KeyboardAvoidingView` + `FloatingButton` | bottom bar absolute | 1 illustration, 2 text, 3 bottom button |
| NetworkError (dead) | `SafeAreaContainer` → `View` | none | 1 title, 2 body, 3 illustration, 4 Refresh |

### Text roles

Size / weight / family / color. "default" color is `OText`'s literal `#344050`; default family is `theme.fonts.primary.name` (`Helvetica`); default size 14, weight 400.

| Look | Where | Role | Proposal |
|---|---|---|---|
| 36 / 600 / special / `inputChat` | `src/ui/src/components/Home/index.tsx:44-48`, `:166` | hero title on photo | text preset (display), on-image color role |
| 16 / 300 / special / `inputChat` | `src/ui/src/components/Home/index.tsx:49-53`, `:169` | hero subtitle | text preset (body large), on-image color role |
| 24 / 700 / `${special}_18pt-Black` / `textGray` | `ONavbar`: `src/ui/src/components/LoginForm/index.tsx:473`, `src/ui/src/components/ForgotPasswordForm/index.tsx:89`, `src/ui/src/components/DriverSchedule/index.tsx:81` | screen title | `header` title |
| 24 / 700 / primary font / default | `OModal` title for the OTP modal, `src/ui/src/components/LoginForm/index.tsx:723` | modal title | `modal` title (same preset as the header: question) |
| 26 / 600 / Poppins / `textGray` | `src/ui/src/components/SignupForm/index.tsx:306-312`, `:351` (dead); `src/ui/src/components/LoginForm/index.tsx:404-409` (unused) | screen title, older variant | goes with the dead code |
| 30 / 400 / default | `src/ui/src/components/VerifyPhone/index.tsx:124` | modal title | text preset (title) |
| 22 / bold / Poppins / `#344050` | `src/pages/IntroductoryTutorial.tsx:86-94` | slide title | text preset (title) |
| 22 / 700 / default | `src/ui/src/components/DriverSchedule/index.tsx:90` | card title (day) | text preset (card title) |
| 20 / 700 / primary color | `src/ui/src/components/DriverSchedule/index.tsx:84` | banner text | text preset (section title) |
| 20 / 400 / default | `src/ui/src/components/ScheduleBlocked/index.tsx:36` | screen title without weight | text preset (title): question |
| 20 / 700 / `darkText` | `src/ui/src/components/NetworkError/index.tsx:22-29` (dead) | screen title | text preset (title) |
| 20 / 400 / `disabled` | `src/ui/src/components/VerifyPhone/index.tsx:128` | hint | text preset (body), muted role |
| 20 / 400 / `error` | `src/ui/src/components/VerifyPhone/index.tsx:183` | error list | error text |
| 30 / 400 / `success` or `error` | `src/ui/src/components/VerifyPhone/index.tsx:138-144` | countdown | text preset (numeric display) |
| 24 / 400 / default | `src/ui/src/components/LoginForm/Otp/index.tsx:119` | countdown | same preset as above |
| 18 / 400 / line 28 / Poppins / `#344050` | `src/pages/IntroductoryTutorial.tsx:77-85` | slide body | text preset (body large) |
| 18 / 400 / default; `red` for "Not available" | `src/ui/src/components/LoginForm/index.tsx:686`; `src/ui/src/components/DriverSchedule/index.tsx:99-112` | separator label; schedule times | text preset (body large) |
| 18 or 14 / 400 / `textSecondary`, centered | `NotFoundSource` via `src/pages/NotFound.tsx:38-41` (18) and `src/pages/RequestPermissions.tsx:55-70` (14) | empty-state text | `empty_state` text |
| 16 / 400 / default | `src/ui/src/components/ForgotPasswordForm/index.tsx:94-96` | intro paragraph | text preset (body) |
| 14 / 400 / default | `src/ui/src/components/ScheduleBlocked/index.tsx:42`, `:45`; `src/ui/src/components/DriverSchedule/index.tsx:91`; `src/ui/src/components/LoginForm/index.tsx:652` | body, metadata, checkbox label | text preset (body small) |
| 14 / 400 / primary color | `src/ui/src/components/ScheduleBlocked/index.tsx:44` | inline label | text preset + emphasis role |
| 14 / 400 / `darkText` | `src/ui/src/components/NetworkError/index.tsx:30-35` (dead) | body | text preset (body small) |
| 14 / 400 / white, centered | `src/ui/src/components/Home/index.tsx:208-213` | field error on photo | error text |
| 16 / 400 / `error`, centered | `src/ui/src/components/PhoneInputNumber/index.tsx:143-148` | field error | error text (one size with the row above: question) |
| 16 / 600 or normal / primary font / `primary` or `unselectText` | `src/ui/src/components/LoginForm/index.tsx:416-419`, `:490-499` | tab label | tabs label |
| 16 / 400 / primary font / `primary` | `src/ui/src/components/LoginForm/index.tsx:439-444`, `:617` | link | `button` (link) label |
| 16 / 400 / `primary` or `disabled` | `src/ui/src/components/LoginForm/Otp/index.tsx:135` | link | `button` (link) label |
| 17 / 400 / default and `primary` | `src/ui/src/components/VerifyPhone/index.tsx:190-196` | question + link | body + `button` (link) label |
| 16 / 300 / system font / `primary` | `src/pages/IntroductoryTutorial.tsx:102-106` | tutorial Next / Skip / Done | `button` (link) label |
| 16 / 700 / special / white (`OButton` default); color overridden to `inputTextColor`, `white` or `primary` | `src/ui/src/components/LoginForm/index.tsx:666`, `:693`; `src/ui/src/components/ForgotPasswordForm/index.tsx:143`; `src/ui/src/components/Home/index.tsx:218-221`; `src/ui/src/components/ScheduleBlocked/index.tsx:49`; `src/ui/src/components/LoginForm/Otp/index.tsx:143` | button label | `button` label |
| 18 / normal / Poppins / `inputTextColor` | `src/ui/src/components/SignupForm/index.tsx:317-323` (dead) | button label | goes with the dead code |
| 18 / `weight='700'` prop but `fontWeight:'normal'` in the style (`src/ui/src/components/FloatingButton/index.tsx:47-57`, `:94-101`) / primary font / white | `FloatingButton` label via `src/pages/RequestPermissions.tsx:74-82` | bottom button label | `button` label |
| 15 / 400 / primary font / `textGray` (white on Home); placeholder `unselectText`, `arrowColor`, white or `baseColor` | `OInput` in `src/ui/src/components/LoginForm/index.tsx:512-531`, `:570-600`; `src/ui/src/components/ForgotPasswordForm/index.tsx:107-124`; `src/ui/src/components/Home/index.tsx:182-202` | input text and placeholder | `input` typography; one placeholder role |
| 16 / library / `textGray`; placeholder `arrowColor` | `src/ui/src/components/PhoneInputNumber/index.tsx:120-130` | phone input text | same `input` typography |
| 16 / library / `rgba(226, 226, 226, 1)`, primary when focused | `src/ui/src/components/LoginForm/Otp/index.tsx:103-113` | OTP digit | digit input typography |
| 40 / system / system default color | `src/ui/src/components/VerifyPhone/index.tsx:109-120` | SMS digit | digit input typography |

### Buttons and touchables

`OButton.defaultProps` (`activeOpacity: 0.5`, `indicatorColor: 'white'`) are ignored on React 19, so every `OButton` here runs with `activeOpacity` undefined (React Native's default) and no spinner color unless the call passes one.

| Element | file:line | Primitive | Look and size | activeOpacity / feedback | Disabled look | Under 44 pt? |
|---|---|---|---|---|---|---|
| Home main button | `src/ui/src/components/Home/index.tsx:216-228` | `OButton` | filled primary, radius 7.6, full width × 50 | not set | none; loading replaces the label with a spinner and removes the touchable | no |
| Login submit | `src/ui/src/components/LoginForm/index.tsx:666-673` | `OButton` | filled primary, radius 10, full width × 50 | not set | none; loading as above | no |
| Login "Get Verify Code" | `src/ui/src/components/LoginForm/index.tsx:693-700` | `OButton` | paints filled primary (outline was passed), 90% wide × 50; spinner color primary on a primary fill | not set | none | no |
| Forgot submit | `src/ui/src/components/ForgotPasswordForm/index.tsx:143-165` | `OButton` | filled primary, radius 10, × 50 | not set | "sent" state painted by hand with `theme.colors.disabled` fill, still pressable (empty handler) | no |
| Otp cancel | `src/ui/src/components/LoginForm/Otp/index.tsx:139-146` | `OButton` | outline (white fill, primary border 2 and text), radius 8, 100% × 50 | not set | none | no |
| ScheduleBlocked Go back | `src/ui/src/components/ScheduleBlocked/index.tsx:47-51` | `OButton` | filled primary, radius 10, content width × 50 | not set | none | no |
| RequestPermissions bottom button | `src/pages/RequestPermissions.tsx:74-82` | `FloatingButton` → `styled.TouchableOpacity` | filled primary, radius 10, 100% × 50 | not set | `disabled` prop without a visual change | no |
| Header back (Login, Forgot, DriverSchedule) | `src/ui/src/components/shared/ONavbar.tsx:43-49` | `OIconButton` (`styled.TouchableOpacity`) | transparent, icon 24, box 64×40 (height 40, horizontal padding 20) | not set | — | yes (40 high) |
| OTP modal back | `src/ui/src/components/shared/OModal.tsx:210-216` | `OIconButton` | 24×24, padding 0 | not set | — | yes (24×24) |
| Login method tabs | `src/ui/src/components/LoginForm/index.tsx:479-500` | `Pressable` ×2 | `flex:1` × 40, tinted fill | none (no pressed style, no ripple) | — | yes (40 high) |
| Forgot link | `src/ui/src/components/LoginForm/index.tsx:614-620` | `Pressable` | text 16 only | none | — | yes (one text line) |
| Password eye | `src/ui/src/components/LoginForm/index.tsx:577-589` | `onPress` on the vector icon glyph | 24×24 | none | — | yes (24×24) |
| reCAPTCHA v2 row | `src/ui/src/components/LoginForm/index.tsx:634-654` | `TouchableOpacity` | icon 26 + text 14 | not set | — | yes (about 36 high) |
| Otp resend | `src/ui/src/components/LoginForm/Otp/index.tsx:134-138` | `TouchableOpacity` | text 16 with 30 of bottom margin inside the touchable | not set | text in `theme.colors.disabled` | borderline (text line + 30) |
| VerifyPhone "Send Again" | `src/ui/src/components/VerifyPhone/index.tsx:193-197` | `Pressable` | text 17 only | none | none (always enabled) | yes (one text line) |
| Tutorial Next / Skip / Done | `src/pages/IntroductoryTutorial.tsx:133-184` | library `TouchableOpacity` around a 90×40 `View` | text 16 primary | library default | — | yes (40 high) |
| Tutorial dots | `src/pages/IntroductoryTutorial.tsx:205-218` | library `TouchableOpacity` (`dotClickEnabled` default true) | 8×8 and 8.3×8.3 | library default | — | yes |
| Phone flag button | `src/ui/src/components/PhoneInputNumber/index.tsx:139`; style from `src/ui/src/components/LoginForm/index.tsx:432-438` | library `TouchableOpacity` | 79 wide, border 1, radius 7.6 | library | library | no (79×50) |
| Country modal close and rows | `src/ui/src/components/PhoneInputNumber/index.tsx:111-116` | library | close image 15×15 | library | — | not verified |
| Signup back (dead) | `src/ui/src/components/SignupForm/index.tsx:343-349` | `OIconButton` | `maxWidth:40`, `height:25`, icon 20 | not set | — | yes |
| System alert buttons | `src/ui/src/components/LoginForm/Otp/index.tsx:80-93`; `src/ui/src/components/shared/OAlertOriginal.tsx:39-42` | system | system | system | — | — |

### Icons

| Set / source | file:line | Glyph | Size | Color | Function |
|---|---|---|---|---|---|
| `react-native-vector-icons/AntDesign` (alias `IconAntDesign`) | `src/pages/IntroductoryTutorial.tsx:6`, `:140-144` | `arrowright` | 16 | `theme.colors.primary` | trailing icon of Next |
| `react-native-vector-icons/MaterialCommunityIcons` | `src/ui/src/components/LoginForm/index.tsx:14`, `:577-589` | `eye-outline`, `eye-off-outline` | 24 | `theme.colors.arrowColor` | show / hide password |
| `react-native-vector-icons/MaterialCommunityIcons` | `src/ui/src/components/LoginForm/index.tsx:640-650` | `checkbox-marked`, `checkbox-blank-outline` | 26 | `theme.colors.primary` / `theme.colors.mediumGray` | reCAPTCHA verified mark |
| `react-native-vector-icons/MaterialCommunityIcons` | `src/ui/src/components/SignupForm/index.tsx:5`, `:437-449` (dead) | `eye-outline`, `eye-off-outline` | 24 | `theme.colors.inputSignup` | show / hide password |
| PNG `theme.images.general.arrow_left` | via `src/ui/src/components/shared/ONavbar.tsx:44-46`; `src/ui/src/components/SignupForm/index.tsx:344-346` | back arrow | 24×24; 20×20 | no tint passed | back |
| PNG `theme.images.general.chevronDown` | `src/ui/src/components/PhoneInputNumber/index.tsx:132-137` | chevron | 16×16 | tint `theme.colors.arrowColor` | open country list |
| PNG `theme.images.general.inputPhone` | `src/ui/src/components/PhoneInputNumber/index.tsx:157-161` | phone | 20×20 | no `color` prop | leading icon |
| PNG `theme.images.general.close` | `src/ui/src/components/PhoneInputNumber/index.tsx:114-115` | close | 15×15 | none | close the country modal |
| PNG `emailInputIcon`, `passwordInputIcon`, `general.profile` | `src/ui/src/components/SignupForm/index.tsx:371-375`, `:434` (dead) | mail, lock, person | 20×20 (`OInput`) | `iconColor` (its `#959595` default is in ignored `defaultProps`) | leading icons |

### Theme keys read

Counted with `grep -oE "theme\??\.colors\??\.X"` over the area's 27 source files (tests excluded). Every key is defined in `src/theme.json`; **no key read in this area's own files is undefined**. The undefined `theme.colors.textNormal` is read by `OInput` (`src/ui/src/components/shared/OInput.tsx:95`) only when `vertorIcon` is passed, which no file here does.

| Key | Value | Reads | Files |
|---|---|---|---|
| `colors.primary` | `#FFB700` | 35 | LoginForm 11, Otp 6, SignupForm 5, Home UI 3, ForgotPasswordForm 3, IntroductoryTutorial 3, DriverSchedule 1, PhoneInputNumber 1, ScheduleBlocked UI 1, VerifyPhone 1 |
| `colors.white` | `#fff` | 19 | IntroductoryTutorial 7, Home UI 5, and 1 each in Login, ForgotPassword, Signup pages, Otp, PhoneInputNumber, ScheduleBlocked UI, SignupForm |
| `colors.textGray` | `#344050` | 8 | LoginForm 3, SignupForm 3, ForgotPasswordForm 1, PhoneInputNumber 1 |
| `colors.inputSignup` | `#DEE2E6` | 7 | SignupForm 4, LoginForm 2, PhoneInputNumber 1 |
| `colors.disabled` | `#CBCBCB` | 7 | ForgotPasswordForm 3, VerifyPhone 2, Otp 1, LoginForm styles 1 |
| `colors.error` | `#C90800` | 5 | VerifyPhone 3, Home UI 1, PhoneInputNumber 1 |
| `colors.arrowColor` | `#B1BCCC` | 5 | LoginForm 2, PhoneInputNumber 2, ForgotPasswordForm 1 |
| `colors.unselectText` | `#909BA9` | 4 | LoginForm 4 |
| `colors.transparent` | `rgba(0, 0, 0, 0)` | 4 | Home page 1, Home UI 1, LoginForm 1, SignupForm 1 |
| `colors.inputTextColor` | `#FFFFFF` | 3 | SignupForm 2, Home UI 1 |
| `colors.backgroundPage` | `#FFFFFF` | 3 | Splash, RequestPermissions, NotFound |
| `colors.success` | `#90C68E` | 2 | VerifyPhone (its only readers in the app) |
| `colors.secondary` | `#FFF4DA` | 2 | LoginForm 1, DriverSchedule 1 |
| `colors.red` | `#E63757` | 2 | DriverSchedule 1, RequestPermissions 1 |
| `colors.inputChat` | `#F8F9FA` | 2 | Home UI |
| `colors.gray100` | `#F8F9FA` | 2 | LoginForm 1, DriverSchedule styles 1 |
| `colors.clear` | `transparent` | 2 | ScheduleBlocked page 1, SignupForm 1 |
| `colors.black` | `#000000` | 2 | Home page 1, Home UI 1 |
| `colors.mediumGray` | `rgb(134,154,183)` | 1 | LoginForm (its only reader in the app) |
| `fonts.primary.name` | `Helvetica` | 3 | `src/ui/src/components/LoginForm/index.tsx:418`, `:430`, `:443` |
| `fonts.special.name` | `Inter_18pt-Black` | 2 | `src/ui/src/components/Home/index.tsx:46`, `:51` |
| `images.general.loadingSplash` | per platform | 2 | `src/pages/Splash.tsx:62`, `:79` |
| `images.tutorials.slide1`–`slide5` | PNG | 1 each | `src/pages/IntroductoryTutorial.tsx:27-51` |
| `images.backgroundsImages.login`, `images.logos.logotypeInvert` | PNG | 1 each | `src/ui/src/components/Home/index.tsx:142`, `:162` |
| `images.general.deliveryWaiting` | PNG | 1 | `src/ui/src/components/ScheduleBlocked/index.tsx:38` |
| `images.general.chevronDown`, `inputPhone`, `close` | PNG | 1 each | `src/ui/src/components/PhoneInputNumber/index.tsx:133`, `:158`, `:115` |
| `images.general.arrow_left`, `images.general.profile`, `images.logos.emailInputIcon`, `images.logos.passwordInputIcon` | PNG | 1 each | `src/ui/src/components/SignupForm/index.tsx:344`, `:374`, `:373`, `:434` (dead) |

Same value under several keys in this area: `white` / `inputTextColor` / `backgroundPage`; `transparent` / `clear`; `inputChat` / `gray100`. `theme.fonts.*.weights` is never read.

### Platform and window

| What | file:line | Branch or computation | Kind |
|---|---|---|---|
| Splash layout | `src/pages/Splash.tsx:35-36`, `:42`, `:51-57` | iOS: frame from `useWindowDimensions`; Android: `Dimensions.get('screen')` + `StatusBar.currentHeight` + `measureInWindow` | rendering difference tied to the native splash |
| Splash source | `src/DeliveryApp.tsx:44-46` | iOS asset catalog name / Android `require` | native asset |
| Tutorial sizes | `src/pages/IntroductoryTutorial.tsx:18-21`, `:62-63`, `:82-93`, `:109-111`, `:208`, `:215` | everything from `useDeviceOrientation` window width and height | layout by window fractions |
| Tutorial Skip position | `src/pages/IntroductoryTutorial.tsx:154-155` | Android `marginLeft: W × .45`; iOS `start: W × 0.45` | hand-made positioning per platform |
| Tutorial insets | `src/pages/IntroductoryTutorial.tsx:17`, `:119-120`, `:194` | `edges={[]}` then `insets.top` and `80 + insets.bottom` by hand | safe area by hand |
| Home insets and keyboard | `src/ui/src/components/Home/index.tsx:25`, `:81-106`, `:154-155`, `:158` | keyboard events `keyboardWillShow` (iOS) / `keyboardDidShow` (Android); own bottom padding; `keyboardDismissMode` `interactive` / `on-drag` | safe area by hand; keyboard behaviour |
| Keyboard avoiding | `src/pages/Login.tsx:42`; `src/pages/ForgotPassword.tsx:20`; `src/pages/Signup.tsx:46`; `src/pages/RequestPermissions.tsx:52`; `src/pages/NotFound.tsx:36` | `behavior` iOS `padding` / Android `height` | behaviour |
| Form page padding | `src/ui/src/layouts/Container.tsx:10-12`, `:23-35` | iOS portrait `0 20 20`, otherwise `20`; orientation from a `Dimensions` listener added on every render | hand-made safe area by platform and orientation |
| RequestPermissions padding | `src/pages/RequestPermissions.tsx:22` | iOS `30px`; Android `0 30px 30px` | spacing by platform |
| RequestPermissions content | `src/pages/RequestPermissions.tsx:28-36`, `:54-72` | different text per platform; Android wraps it in a `ScrollView` | content and structure by platform |
| ScheduleBlocked image | `src/ui/src/components/ScheduleBlocked/index.tsx:13`, `:39-40` | `Dimensions.get('screen').width`, read once per render, no listener | size from the screen |
| ScheduleBlocked safe area | `src/pages/ScheduleBlocked.tsx:22` | `edges={['top']}` only | safe area |
| DriverSchedule | `src/ui/src/components/DriverSchedule/index.tsx:19-20`, `:73-74`, `:80` | Android `maxHeight: windowHeight` and `paddingBottom:120`; top padding iOS `insets.top`, Android 15 | hand-made insets by platform |
| Phone field | `node_modules/react-native-phone-number-input/lib/styles.js` | widths from `Dimensions` at module load (`wp(80)`, `wp(20)`); the app overrides the container to 100% and the flag to 79 | library |
| Bottom button | `src/ui/src/hooks/useFloatingButtonInset.tsx` (via `src/pages/RequestPermissions.tsx:74-82`) | iOS bottom inset outside the tab bar | safe area |

No tablet branch and no `useColorScheme`, `I18nManager` or `allowFontScaling` in the area's files (grep: 0 matches).

### Styles that cannot see the theme

No module-level `StyleSheet.create` in this area. All ten are created inside the component (they read the theme, and are rebuilt on every render):

| File | `StyleSheet.create` (line) | Inline `style={{` | Other inline style props |
|---|---|---|---|
| `src/pages/IntroductoryTutorial.tsx` | 56 | 7 | 2 (`activeDotStyle`, `dotStyle`) |
| `src/pages/Home.tsx` | 10 | 0 | 0 |
| `src/pages/Login.tsx` | — | 1 | 0 |
| `src/pages/ForgotPassword.tsx` | — | 1 | 0 |
| `src/pages/Signup.tsx` | — | 1 | 0 |
| `src/pages/ScheduleBlocked.tsx` | 10 | 0 | 0 |
| `src/ui/src/components/Home/index.tsx` | 33 | 2 | 2 (`contentContainerStyle`, `textStyle`) |
| `src/ui/src/components/LoginForm/index.tsx` | 387 | 4 | 1 (`containerStyle`) |
| `src/ui/src/components/LoginForm/Otp/index.tsx` | 102 | 2 | 1 (`textStyle`) |
| `src/ui/src/components/SignupForm/index.tsx` | 295 | 1 | 1 (`iconStyle`) |
| `src/ui/src/components/ForgotPasswordForm/index.tsx` | 66 | 1 | 0 |
| `src/ui/src/components/VerifyPhone/index.tsx` | 109 | 2 | 0 |
| `src/ui/src/components/PhoneInputNumber/index.tsx` | 82 | 2 | 2 (`containerStyle`, `codeTextStyle`; plus `closeButtonImageStyle` in an object) |
| `src/ui/src/components/ScheduleBlocked/index.tsx` | — | 2 | 1 (`textStyle`) |
| `src/ui/src/components/DriverSchedule/index.tsx` | — | 11 | 0 |
| Total | 10 | 37 | 10 |

Other cases:

| Case | file:line |
|---|---|
| Styled component declared inside the component (a new component type on every render) | `src/pages/RequestPermissions.tsx:19-26`; `src/pages/NotFound.tsx:23-30` |
| Module-level design constants | `src/pages/Splash.tsx:6-8`; `src/ui/src/components/DriverSchedule/index.tsx:10` |
| `defaultProps` on function components | none in this area's files. The shared ones these screens rely on, ignored on React 19: `src/ui/src/components/shared/OButton.tsx:142-147`, `OInput.tsx:145-149`, `OIcon.tsx:62-65`, `OText.tsx:60-62`, `OIconButton.tsx:127` |

How the area uses or bypasses the shared primitives:

| Primitive | Use | Bypass or override |
|---|---|---|
| `OText` | 29 uses in 9 files: 20 with a literal `size` prop, 5 with a `fontSize` in `style`, 4 at the default 14 | raw `Text` in `src/pages/IntroductoryTutorial.tsx:126-127`, `:139`, `:157`, `:170`, `:181`; `style` overrides for family, size and weight in `src/ui/src/components/Home/index.tsx:166`, `:169` and `src/ui/src/components/LoginForm/index.tsx:491`, `:617` |
| `OButton` | 8 call sites in the area's files (Home 1, LoginForm 2, Otp 1, ForgotPasswordForm 1, ScheduleBlocked 1, SignupForm 2), plus 1 in NetworkError | `style` radius or height overrides in Home, Otp, Signup, NetworkError; `textStyle` overrides in Home, Otp, ScheduleBlocked, Signup; tutorial buttons and the bottom button do not use it |
| `OInput` | 6 call sites (Home 1, LoginForm 2, ForgotPasswordForm 1, SignupForm 2) | every call overrides border, radius and background through `style`; raw `TextInput` in `src/ui/src/components/VerifyPhone/index.tsx:149-157`; two library inputs (phone, OTP) |
| `OIcon` | logo, illustration, chevron, phone glyph | raw `Image` in `src/pages/IntroductoryTutorial.tsx:123`; styled `Image` in `src/pages/Splash.tsx:17-31` |
| `OIconButton` | through `ONavbar` and `OModal`; directly in `src/ui/src/components/SignupForm/index.tsx:343-349` | — |
| `ONavbar` | Login, Forgot, DriverSchedule | Signup builds its own header |
| `OModal` | VerifyPhone, OTP, DriverSchedule host | — |
| Touchables | — | raw `Pressable` ×3 (`src/ui/src/components/LoginForm/index.tsx:479`, `:614`; `src/ui/src/components/VerifyPhone/index.tsx:193`), raw `TouchableOpacity` ×2 (`src/ui/src/components/LoginForm/index.tsx:634`; `src/ui/src/components/LoginForm/Otp/index.tsx:134`), `onPress` on icon glyphs ×2 |

### Third-party UI

| Library | file:line | What it draws | Props that carry styles |
|---|---|---|---|
| `react-native-app-intro-slider` ^4.0.4 | `src/pages/IntroductoryTutorial.tsx:3`, `:200-226` | horizontal pager, pagination overlay, dots, button wrappers (uses the core `SafeAreaView`) | `activeDotStyle`, `dotStyle`, `renderItem`, `renderNextButton`, `renderDoneButton`, `renderSkipButton` |
| `react-native-phone-number-input` ^2.0.0 with `react-native-country-picker-modal` ^2.0.0 | `src/ui/src/components/PhoneInputNumber/index.tsx:3`, `:98-140` | flag button, number `TextInput`, full-screen country list with flags and a close button | `containerStyle`, `textContainerStyle`, `codeTextStyle`, `flagButtonStyle`, `textInputProps`, `countryPickerProps` (`closeButtonImage`, `closeButtonImageStyle`), `renderDropdownImage` |
| `@twotalltotems/react-native-otp-input` ^1.3.11 | `src/ui/src/components/LoginForm/Otp/index.tsx:3`, `:122-133` | row of digit `TextInput`s | `style`, `codeInputFieldStyle`, `codeInputHighlightStyle`, `selectionColor` |
| `react-native-loading-spinner-overlay` ^2.0.0 | `src/ui/src/components/VerifyPhone/index.tsx:3`, `:199`; `src/ui/src/components/SignupForm/index.tsx:4`, `:483`, `:523` | full-screen modal with a spinner | none passed (library defaults) |
| `react-native-recaptcha-that-works` ^1.2.0 | `src/ui/src/components/LoginForm/index.tsx:11`, `:655-661` | modal with a WebView (Google's widget) | none passed; not themable |
| `@fatnlazycat/react-native-recaptcha-v3` ^1.0.3 | `src/ui/src/components/LoginForm/index.tsx:12`, `:625-631` | WebView | `containerStyle` (`height: 40`) |
| `Alert.alert` | `src/ui/src/components/LoginForm/Otp/index.tsx:80-93`; `src/ui/src/components/shared/OAlertOriginal.tsx:39-42` (from `src/ui/src/components/LoginForm/index.tsx:737-743`) | system alert | not themable |
| `react-native-splash-screen` ^3.3.0 | `src/pages/Splash.tsx:3`, `:10` | native splash (hide only) | not themable |
| `RefreshControl` | `src/ui/src/components/DriverSchedule/index.tsx:75-78` | system pull-to-refresh spinner | `tintColor` / `colors` not passed |
| `StatusBar` | `src/pages/IntroductoryTutorial.tsx:195-199`; `src/pages/Home.tsx:32-38` | status bar style and Android background | `barStyle`, `backgroundColor` |
| Toast (`useToast` → shared `OToast`) | 19 `showToast` calls in LoginForm, SignupForm, ForgotPasswordForm | toast | shared primitive (other agent) |

### Motion

No `Animated.*` or `LayoutAnimation` in this area's files (grep: 0 matches). Timed or animated behaviour that exists:

| What | file:line | Duration |
|---|---|---|
| Native splash kept at most | `src/pages/Splash.tsx:8`, `:46-49` | 5000 ms |
| Android image fade disabled | `src/pages/Splash.tsx:81` | `fadeDuration={0}` |
| Scroll to end when the keyboard opens / the input focuses | `src/ui/src/components/Home/index.tsx:84-86`, `:109-111` | after 100 ms and 250 ms, `animated: true` |
| Status bar change | `src/pages/Home.tsx:36-37` | `animated`, `showHideTransition="fade"` (system) |
| Modals (VerifyPhone, OTP, DriverSchedule host) | `src/ui/src/components/shared/OModal.tsx:178` | `animationType="slide"` (system) |
| OTP focus delay | `src/ui/src/components/LoginForm/Otp/index.tsx:13`, `:44-48` | 500 ms (behaviour) |
| Tutorial paging | library `FlatList` paging | native scroll |

### Dead code

Checked with `grep -rnE` over `src`, `App.tsx` and `index.js`, excluding the submodule `src/@` and `__tests__`.

| Item | file:line | How checked |
|---|---|---|
| `Signup` page | `src/pages/Signup.tsx` | no `Stack.Screen`/`Tab.Screen` uses it; no import of `pages/Signup` outside `src/pages/__tests__/Signup.test.tsx`; no `navigate('Signup')` |
| `SignupForm` UI | `src/ui/src/components/SignupForm/*` | only consumer is the dead page (exported from `src/ui/index.tsx:34`, `:129`) |
| Image keys only Signup reads | `theme.images.logos.emailInputIcon`, `theme.images.logos.passwordInputIcon` (`src/DeliveryApp.tsx:39-40`) | only readers: `src/ui/src/components/SignupForm/index.tsx:373`, `:434` |
| `NotFound` page | `src/pages/NotFound.tsx` | not registered or imported outside its test; it navigates to `'BusinessList'`, a route that does not exist (`:20`) |
| `NetworkError` page and UI | `src/pages/NetworkError.tsx`; `src/ui/src/components/NetworkError/*` | page not registered or imported anywhere; the UI component's only consumer is that page |
| Image key only NetworkError reads | `theme.images.general.noNetwork` (`src/assets/images/no-network.png`, 114 KB) | only reader: `src/ui/src/components/NetworkError/index.tsx:17` |
| Unused import | `src/navigators/RootNavigator.tsx:44` (`RequestPermissions`) | the identifier appears only on the import line |
| `RenderPrevButton` | `src/pages/IntroductoryTutorial.tsx:164-173` | not passed to the slider (`renderPrevButton` absent; `showPrevButton` defaults to false) |
| `styles.image` | `src/pages/IntroductoryTutorial.tsx:72-76` | no `styles.image` reference |
| Styled `OTab`, `TabBtn` | `src/ui/src/components/LoginForm/styles.tsx:55-64` | no importer |
| Style entries `header`, `arrowLeft`, `title`, `borderStyleBase`, `borderStyleHighLighted`, `underlineStyleBase`, `underlineStyleHighLighted`, `titleContainer` | `src/ui/src/components/LoginForm/index.tsx:392-409`, `:446-467` | no `styles.<name>` reference in the file |
| `Dimensions` import; `scrollRefTab` (never attached to a `ScrollView`) | `src/ui/src/components/LoginForm/index.tsx:7`, `:83`, `:176-182` | read of the file |
| Project-name branch in the login form | `src/ui/src/components/LoginForm/index.tsx:159-169`, `:228-237`, `:367-375` | `useRootPoint` is commented out in `src/pages/Login.tsx:36` and the form has no `project_name` field |
| No tab leads to `'cellphone'` | `src/ui/src/components/LoginForm/index.tsx:111-117` | the tabs array only has `email` and `otp`; the cellphone form shows only when the controller's default tab is `cellphone` |
| Style entries `header`, `arrowLeft`; imports `OIconButton`, `View` | `src/ui/src/components/ForgotPasswordForm/index.tsx:2`, `:14`, `:67-78` | no reference in the file |
| Styled `FormSide` | `src/ui/src/components/SignupForm/styles.tsx:3-9` | no importer |
| Empty styled `Wrapper` | `src/ui/src/components/PhoneInputNumber/styles.tsx:3` | a `View` with no styles |
| Unused `settings` import; ignored props `errorImage`, `firstColorCustom` | `src/pages/RequestPermissions.tsx:7`, `:59`, `:69`, `:78` | read of `NotFoundSource` and `FloatingButton` |
| Image keys nothing reads | `theme.images.logos.background`, `theme.images.logos.logotype` (`src/DeliveryApp.tsx:36-37`) | grep for `logos.background` and `logos.logotype`: 0 readers |
| Bundled files nothing requires | `src/assets/images/loading-splash.png` (151 KB), `src/assets/images/close.png` (536 B) | grep for the file names: 0 matches |
| `images` block of `src/theme.json` (empty strings) | `src/theme.json:98-164` | overwritten at start by `src/DeliveryApp.tsx:34-104` |

### Not verified

- **Nothing was run.** No simulator, device, screenshot, test, typecheck or lint. Touch-target sizes are estimates from styles; text heights were not measured.
- **Effect of ignored `defaultProps` on what is painted.** With React 19, `OInput` receives `bgColor` and `borderColor` undefined and passes `backgroundColor: undefined` inline over its styled `backgroundLight`; `OIcon` passes `tintColor: undefined` inline over its styled `tint-color: primary`. Whether inputs without an explicit background (Forgot) and images without a `color` prop (welcome logo, illustrations, phone glyph, back arrow) end up tinted or not needs a device.
- **Fonts actually painted** on each platform: `'Poppins'` (no file of that name on Android), `Inter_18pt-Black` with a `fontWeight`, `Inter_18pt-Black_18pt-Black` in `ONavbar`, `Helvetica` (system font on iOS versus the bundled file).
- **Two suspicious renders in the login form:** `TabsContainer`'s `min-width: undefinedpx` (`src/ui/src/components/LoginForm/styles.tsx:10`), and `{(Number(useLoginByEmail) + Number(useLoginOtpEmail)) && …}` (`src/ui/src/components/LoginForm/index.tsx:475`), which yields a bare `0` inside a `View` when both are off.
- **The VerifyPhone modal's real look:** `OModal`'s default branch paints a full-screen `rgba(0, 0, 0, 0.4)` view with no card and no close control; on iOS there is no visible way to dismiss it.
- **Spinner color in loading buttons** (no `indicatorColor` reaches `ActivityIndicator` in Home, Login submit and Forgot; primary on a primary fill in "Get Verify Code").
- **Splash continuity** with the native launch screen: `LaunchScreen.storyboard`, Android's window background and the three `SplashImage.imageset` files were not opened.
- **Library internals:** `react-native-app-intro-slider` (dist read), `react-native-phone-number-input` (styles read) and the OTP input (styles read) were read in part; `react-native-loading-spinner-overlay`, `react-native-country-picker-modal` and both reCAPTCHA libraries were not read, so their default colors are unknown.
- **Submodule controllers:** only the flags and props of `LoginForm` were read (`src/@/components/src/components/LoginForm/index.js:28-60`, `:460-500`); `SignupForm`, `ForgotPasswordForm` and `FloatingButton` controllers were not.
- **States that need server configs or another build:** OTP login, cellphone login, reCAPTCHA v2 and v3, Twilio verify code, `driver_login_validation` (ScheduleBlocked), `use_root_point` (project input on Home), `show_tutorials` off.
- **Navigation edge:** whether Splash can stay up when permissions are already granted and there is no token (`permissionsState.isLoading` is only cleared in some paths of `src/navigators/RootNavigator.tsx:545-556`) was not traced to the end.
- **Not seen at all:** right-to-left, dark mode, landscape, tablets, small phones, large font scale, Android gesture-navigation insets.
- **Not read:** every `__tests__` file of the area; `src/ui/src/types`; `OToast`, `OSegment` and the rest of `shared/*` beyond the eight files listed at the top; `SecurityPinFields` (the third code-entry implementation).
