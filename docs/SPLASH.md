# Launch splash

The launch splash is [react-native-bootsplash](https://github.com/zoontek/react-native-bootsplash) 7: a native screen
(a **square logo** on a colour, white by default) shown from the first frame and kept over the app until JavaScript
hides it. It replaced `react-native-splash-screen` and its interim patch. The owner's decision (2026-11-23,
[theme/decisions.md](theme/decisions.md) "The splash logo is square"): the logo is square, like the marketplace app's
(`ordering-app-marketplace-theming`, its `docs/SPLASH.md`), and a brand's upload of it is optional.

## When it hides

**Not when the theme is read: when the first screen has been laid out and painted, and, if that screen is the loading page,
when its logo has actually loaded.** `src/DeliveryApp.tsx` renders nothing until the cached theme is read (and, with
`use_root_point`, the project list), so the native splash stays up over a blank JavaScript side. Then it renders the app,
and `useSplashHide` (`src/utils/splash.ts`) hides the splash two frames after the navigation container's `onReady`
(`src/appContainer.tsx`; what react-native-bootsplash's README recommends): the navigators have mounted and their views
are laid out. That was not enough on Android: the loading page draws the ring as an **image** (`Splash.tsx`), whose pixels
arrive after those frames (decoded off the UI thread; in a Debug build also fetched from Metro), so the splash faded
over an empty window for 0.07 to 0.27 s (pass 17: 0.27 to 0.75 s; pass 19, with only the `onReady` wait: 1 to 3 blank
frames on every cold start). So the loading page tells the splash about its logo: `Splash.tsx` calls `useSplashLogo()`
(registers "I am the first screen, wait for my logo" on mount, unregisters on unmount) and gives the `<Image>` its
`onLoad` and `onError`; `DeliveryApp` passes the hook's `logoSignal` down in `SplashLogoContext`. While the loading page
is mounted and its logo has not reported, the splash is not hidden. **When the first screen is not the loading page** (it
never registers: a build with `use_root_point` waiting for its project list does not render the app at all, and with no
loading page in the tree the container path is the only one) the `onReady` path alone decides, as before.

Measured on the Android emulator (API 37, Debug, Metro on 8082), the ring has been on the view by the time `onLoad`
has run and the hide is issued, so **no frames are waited after `onLoad`**: a wait of 0 frames and of 2 frames both gave
0 blank frames on 3 cold starts each, so no constant is kept for it. `onError` counts as loaded: an image that fails to
load must not keep the splash up.

What always hides it (hiding twice is harmless: `hideSplash()` is idempotent):

1. the first screen painted and, on the loading page, its logo loaded (above), the normal path;
2. **a fallback in the same hook**: `SPLASH_PAINT_FALLBACK_MS` (3 s) after the theme is read, if neither has led to a
   hide (a tree that lays nothing out, a logo that never answers), the splash goes anyway;
3. the launch time limit of `RootNavigator` (`useLaunchTimeLimit`, 15 s, an API that never answers) calls `hideSplash()` too.

Paths checked: a normal launch (1); a restart by `RNRestart` (project switch, retry: the JavaScript side loads again,
the native splash shows again and a new mount runs the same hook, so it waits for its own logo and hides again once);
a build with `use_root_point` (the hide waits for the project list, as before, and the container may already be painted:
it hides when the list is read); a theme read that fails (`cachedTheme` becomes `null`, the app renders, the same path); a
render that never reaches `onReady` (2); a launch stuck on an API that does not answer (the loading page is the first
screen: its logo loads, 1, and the limit lets the app go); a loading page that unmounts before its logo reports
(`launched` turned true: the container path hides it). `src/utils/__tests__/splash.test.tsx` covers: not hidden before
the layout, a first screen that is not the loading page, a loading page (not hidden before the logo reports, hidden
once after it in either order, not before the theme, the fallback when the logo never answers, an unmount), a restart, and
no hide after an unmount; `src/pages/__tests__/Splash.test.tsx` covers the page's `register`, `onLoad` and `onError`.

The risk that remains, and what is only the Debug build's: the logo's pixels are on the view once `onLoad` has run on
the JavaScript thread, then the fade starts a frame or more later, so a very slow device could still draw one frame
without it; the emulator showed none in 11 cold starts. The image arriving through Metro (an HTTP fetch of
`launch-logo.png`) is Debug only; a Release build reads it from the app's resources, so its `onLoad` comes sooner and
the wait is shorter. The wait itself (the signal) applies to a Release build as well, and is what makes it independent of
how long the image takes. iOS: the storyboard crossfades into the loading page; the splash now waits for the same
`onLoad`, which on iOS comes from the bundle's asset (a few frames), so the hide is a few frames later at most.

`src/pages/Splash.tsx` is the loading page the navigator shows after that (session, configs, push, permissions
loading): **the same logo, 120 x 120, centred, on the theme's `background`**, so the hand-over from the native splash
does not move or resize it. It does not touch the native splash itself, only reports its logo. The size is a build
constant (`LAUNCH_LOGO_SIZE`), not a theme value: the native splash cannot change at run time.

## One source, every size

**`assets/bootsplash/logo-source.png`** is the one source of every logo: square, 1024 x 1024, transparent, the logo
edge to edge (today the Ordering ring, the same mark as the launcher icon; the file is the marketplace app's, and the
launcher icon is identical to it composited on white, to within one level of 255). It is not bundled: every file below
is generated from it by `scripts/splash-logo.mjs` (`pnpm splash:logo`), and a Builder build generates the same files
from a brand's upload of it (see "The Builder").

| File | What | Size |
|---|---|---|
| `ios/ODelivery/Images.xcassets/BootSplashLogo.imageset/logo.png`, `logo@2x.png`, `logo@3x.png` (`Contents.json` declares 1x, 2x, 3x) | iOS: the logo fills the file; the storyboard's image view is **120 x 120 pt**, centred | 120, 240, 360 px |
| `ios/ODelivery/BootSplash.storyboard` | the launch screen (`Info.plist` `UILaunchStoryboardName`): one image view with centre X and centre Y constraints, and the view's one background `<color key="backgroundColor" red="1" green="1" blue="1" alpha="1" colorSpace="custom" customColorSpace="sRGB"/>` (white) | |
| `android/app/src/main/res/drawable-{m,h,xh,xxh,xxxh}dpi/bootsplash_logo.png` | Android: a transparent square canvas of **288 dp** with the logo **120 dp**, centred (0.416667 of the canvas, contained) | 288, 432, 576, 864, 1152 px (the logo 120, 180, 240, 360, 480 px) |
| `android/app/src/main/res/values/styles.xml` `BootTheme`, `values/colors.xml` `bootsplash_background` | the theme (parent `Theme.BootSplash`, then `AppTheme`; `MainActivity`'s theme) and its colour (`#FFFFFF`) | |
| `src/assets/images/launch-logo.png` | the loading page's picture (`BUNDLED_IMAGES.general.loadingSplash`): the logo filling the file, drawn 120 x 120 | 480 px (4 x 120, the largest Android density) |

Wiring: iOS `AppDelegate.swift` `ReactNativeDelegate.customize(_:)` calls
`RNBootSplash.initWithStoryboard("BootSplash", rootView:)` (the app uses the UIScene lifecycle; nothing in
`SceneDelegate`). Android `MainActivity.kt` sets `RNScreensFragmentFactory` and calls
`RNBootSplash.init(this, R.style.BootTheme)` before `super.onCreate(savedInstanceState)`.

**Why 120.** Android 12+ shows its splash icon in a 288 dp area masked to a **192 dp circle**; a square logo must fit
inside it (its diagonal at most 192 dp, so about 134 dp wide). 120 dp leaves room for any square logo (a round one
could go up to about 190). iOS and the loading page draw the same 120, so the three look alike. A logo that is not
square is contained in the 120 square (its longer side 120). The previous splash was a 798 x 180 wordmark, 250 pt wide
on iOS and 180 dp wide on Android (chosen in `docs/deps/shell-phase.md` section 2 and listed as gap G5 of
`docs/HANDOVER.md`); the owner replaced it with the square logo.

## Regenerating

```bash
pnpm splash:logo                      # writes the nine PNGs above from the source
node scripts/splash-logo.mjs --check  # writes nothing; fails when a file is missing or has the wrong size
```

The script uses `sharp`, which `react-native-bootsplash` installs (nothing is added to `package.json`), and writes
only those nine files: it resizes with "contain", centres on a transparent canvas and rounds `size x 0.416667` for the
Android logo, exactly the geometry of the Builder's transforms, and gives the same bytes on every run. It does not touch
the storyboard, `AndroidManifest.xml` or `project.pbxproj`. Change the logo by replacing the source and running it;
change the size by changing `LOGO` there, `LAUNCH_LOGO_SIZE` in `Splash.tsx` and the storyboard's frame and `<image>`
resource together (`src/__tests__/splashAssets.test.ts` pins the sizes).

Do not use the bootsplash CLI (`react-native-bootsplash generate`) for this app: it writes hashed names
(`BootSplashLogo-<hash>.imageset`, `logo-<hash>.png`, `Colors.xcassets`), reformats the whole `AndroidManifest.xml` and
edits `project.pbxproj`, and the Builder expects fixed names. If it is ever run, put back the names (`BootSplashLogo`,
`logo`, `logo@2x`, `logo@3x`), the white `<color>` of the storyboard (delete `Colors.xcassets` and its entries in
`project.pbxproj`) and the manifest (keep only `android:theme="@style/BootTheme"`).

## Colour: a finding, not fixed

**Measured (pass 17, iOS simulator).** The native launch screen draws the ring more saturated than the JavaScript loading
page draws the same file, and the two crossfade in about 0.2 s at the hand-over. The files (`logo@3x.png`,
`launch-logo.png` and the source) all hold the same values. The old wordmark did the same (ring green (26, 175, 68)
natively against (73, 173, 77) in JavaScript).

| Colour | In the file (and in the JavaScript page, measured) | Native launch screen, measured | The file's values read as Display P3 and shown in sRGB, computed |
|---|---|---|---|
| green | (76, 175, 80) | (0, 178, 65) | (0, 178, 65) |
| pink | (233, 30, 99) | (252, 0, 95) | (254, 0, 97) |
| orange | (255, 152, 0) | (253, 143, 0) | (255, 145, 0) |

(Blue: file (33, 150, 243), native (0, 150, 247), computed (0, 153, 250).) **Inferred, not read in Apple's documentation:**
the launch screen draws the file's pixel values in the display's own colour space (Display P3 on a P3 display), whatever
the file or the catalogue says.

**Tried, and why it does not help.**
- An embedded sRGB profile in the PNGs: the compiled catalogue already records the untagged files as `srgb`
  (`assetutil --info Assets.car` of the pass-17 build, and the same for scratch catalogues compiled with `actool` from an
  untagged PNG, one with an `iCCP` profile and one with an `sRGB` chunk). The tag would change nothing in the catalogue,
  so it was not kept.
- `Contents.json`: an image entry has, as far as I found, no colour-space key; `display-gamut` only selects a variant by
  the device's gamut and does not convert (a catalogue with `sRGB` and `display-P3` entries for one file compiled to two
  renditions, both `srgb`), and variants need file names the Builder does not write.

**The Builder.** Its transform (`BuilderImageTransformHelper`, Intervention Image on GD, `imagepng`) writes a PNG with no
profile and no `sRGB` chunk: a brand's generated files are untagged, as this repository's are.

**Options left for the owner; none is done.** (1) Accept it: it lasts 0.2 s, on P3 displays only. (2) An iOS-only
conversion to Display P3 in api-core's helper, with P3 variants declared in `Contents.json`: GD has no ICC support, so it
needs Imagick, and a new file name for each variant. (3) A Display P3 `launch-logo.png` (the same raw values, tagged P3) so
the JavaScript page matches the native splash on P3 displays: it does not cover a brand, whose file the Builder writes
untagged, and it makes the app's own ring more saturated. What a device would settle: whether any of these changes the
native green (pass 17 did not test one).

## iOS launch screen cache

iOS caches the launch screen: an update whose splash changed may show the old one (the old wordmark, here) until the
app is reinstalled or the device restarts. A build over an installed older one may show the previous launch image once.

## The Builder

The Builder replaces, per brand, the logo, `bootsplash_background` and the storyboard's `<color>` (the constant
`splash_background`, through `srgb_components`). The base of this app (`app_driver_theming`) makes the logo from **one
upload**, which is **optional** (the owner, 2026-11-23):

- the upload row (group `resources_splashes`) writes the brand's PNG to `assets/bootsplash/logo-source.png` (PNG,
  `image/png`, 1024 x 1024, at most 512 KB, transparent);
- nine `transform_image` rows read that file (`path:assets/bootsplash/logo-source.png`) and write the PNGs above: three
  for iOS (`contain`, 120, 240, 360), five for Android (`contain`, `scale` 0.416667, 288 to 1152) and one for the loading
  page (`contain`, 480, target `src/assets/images/launch-logo.png`). A `transform_image` whose source file is missing is
  skipped silently, so **the repository must hold the source at that path** (it does), or a build with no upload would
  ship nothing new at all;
- a brand that uploads nothing ships the repository's logo (the Ordering ring): the transforms read the default source
  and write the PNGs the repository already holds, and the Dashboard does not block the build (it blocks only a
  *required* `add_file` with no upload);
- the upload row is an `add_file`, optional (`required` false), kept on purpose. With no upload it is skipped and the
  committed file stays; with an upload it deletes the target and copies the upload in, before the transforms run (the
  hooks go `add_file`, `replace_file`, ..., `transform_image`). A `replace_file` would also do once the file is on the
  branch the base clones (it shows the default logo as the current one in the Dashboard), but it is skipped silently when
  its target does not exist in the clone, and an optional `add_file` raises no "missing file" warning (the Dashboard warns
  only for a *required* `add_file` without upload).
- the loading page reads `src/assets/images/launch-logo.png`, the ninth transform's target: a base without that row
  would give a branded build a native splash with the brand's logo and a loading page with the Ordering ring.

The rows themselves are in [HANDOVER.md](HANDOVER.md) section 2.
