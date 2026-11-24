#!/usr/bin/env node
// Generates every launch-splash logo from the one square source (docs/SPLASH.md).
//
//   node scripts/splash-logo.mjs            # write the files
//   node scripts/splash-logo.mjs --check    # write nothing; fail if a file is missing or has the wrong size
//
// Source: assets/bootsplash/logo-source.png (square, transparent, the logo edge to edge).
//
// What it writes (each is the same as the Builder's `transform_image` rows of the base, "contain",
// centred, transparent, so a build with and without an uploaded logo lays out the same):
//   iOS      ios/ODelivery/Images.xcassets/BootSplashLogo.imageset/logo.png, logo@2x.png, logo@3x.png
//            120, 240 and 360 px: the logo fills the file (the storyboard draws it 120 x 120 pt).
//   Android  android/app/src/main/res/drawable-{m,h,xh,xxh,xxxh}dpi/bootsplash_logo.png
//            a transparent square canvas of 288 dp (288, 432, 576, 864, 1152 px) with the logo 120 dp
//            wide (scale 0.416667 of the canvas), centred.
//   JS page  src/assets/images/launch-logo.png: 480 px, the logo filling the file (120 dp at the largest
//            density, 4x). The loading page (src/pages/Splash.tsx) draws it 120 x 120.
//
// It uses `sharp`, which `react-native-bootsplash` (a dependency of the app) installs: nothing is added
// to package.json. It touches no other file: not the storyboard, not AndroidManifest.xml, not
// project.pbxproj (the bootsplash CLI does, and renames files).

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const check = process.argv.includes('--check')

const SOURCE = 'assets/bootsplash/logo-source.png'
const IOS_DIR = 'ios/ODelivery/Images.xcassets/BootSplashLogo.imageset'
const RES_DIR = 'android/app/src/main/res'
const JS_FILE = 'src/assets/images/launch-logo.png'

// The logo's width in points (iOS) and dp (Android) on both native splashes and on the loading page.
const LOGO = 120
// The logo's share of the Android canvas: 120 / 288 (the Builder's transform `scale`).
const ANDROID_SCALE = 0.416667
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 }

// [file, canvas px, logo px]
const targets = [
  ...[['logo.png', 1], ['logo@2x.png', 2], ['logo@3x.png', 3]].map(([name, scale]) =>
    [path.join(IOS_DIR, name), LOGO * scale, LOGO * scale]),
  ...[['mdpi', 288], ['hdpi', 432], ['xhdpi', 576], ['xxhdpi', 864], ['xxxhdpi', 1152]].map(([density, size]) =>
    [path.join(RES_DIR, `drawable-${density}`, 'bootsplash_logo.png'), size, Math.round(size * ANDROID_SCALE)]),
  [JS_FILE, 480, 480]
]

const source = path.join(repo, SOURCE)
const meta = await sharp(source).metadata()
if (meta.width !== meta.height || meta.width < 480 || !meta.hasAlpha) {
  console.error(`${SOURCE} must be square, at least 480 px and transparent (it is ${meta.width} x ${meta.height}, alpha ${meta.hasAlpha})`)
  process.exit(1)
}

let failed = false
for (const [file, canvas, logo] of targets) {
  const out = path.join(repo, file)
  if (check) {
    const size = fs.existsSync(out) ? await sharp(out).metadata() : null
    if (!size || size.width !== canvas || size.height !== canvas) {
      console.error(`${file}: expected ${canvas} x ${canvas}, found ${size ? `${size.width} x ${size.height}` : 'no file'}`)
      failed = true
    }
    continue
  }
  const pad = (canvas - logo) / 2
  const resized = sharp(source).resize(logo, logo, { fit: 'contain', background: TRANSPARENT })
  const image = pad > 0
    ? resized.extend({ top: pad, bottom: pad, left: pad, right: pad, background: TRANSPARENT })
    : resized
  fs.mkdirSync(path.dirname(out), { recursive: true })
  await image.png({ compressionLevel: 9 }).toFile(out)
  console.log(`${file}  ${canvas} x ${canvas}  (logo ${logo})`)
}
if (failed) process.exit(1)
