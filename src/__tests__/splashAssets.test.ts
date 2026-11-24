import fs from 'fs'
import path from 'path'

// The launch splash's files (docs/SPLASH.md): one square source, a 120 x 120 logo on both native
// splashes and on the loading page. scripts/splash-logo.mjs writes them; this pins what it must leave.
const root = path.join(__dirname, '../..')
const read = (file: string) => fs.readFileSync(path.join(root, file))
// A PNG's size is in its IHDR chunk: width and height at bytes 16 and 20.
const pngSize = (file: string) => {
  const b = read(file)
  expect(b.subarray(1, 4).toString()).toBe('PNG')
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) }
}

describe('launch splash assets', () => {
  it('keeps one square 1024 source', () => {
    expect(pngSize('assets/bootsplash/logo-source.png')).toEqual({ width: 1024, height: 1024 })
  })

  it('has the iOS logos at 120, 240 and 360 px, under the names the Builder writes', () => {
    const dir = 'ios/ODelivery/Images.xcassets/BootSplashLogo.imageset'
    expect(pngSize(`${dir}/logo.png`)).toEqual({ width: 120, height: 120 })
    expect(pngSize(`${dir}/logo@2x.png`)).toEqual({ width: 240, height: 240 })
    expect(pngSize(`${dir}/logo@3x.png`)).toEqual({ width: 360, height: 360 })
  })

  it('has the Android canvases of 288 dp at every density', () => {
    const sizes: Record<string, number> = { mdpi: 288, hdpi: 432, xhdpi: 576, xxhdpi: 864, xxxhdpi: 1152 }
    for (const [density, size] of Object.entries(sizes)) {
      expect(pngSize(`android/app/src/main/res/drawable-${density}/bootsplash_logo.png`)).toEqual({ width: size, height: size })
    }
  })

  it('has the loading page picture square, at least as large as the largest density needs (4 x 120)', () => {
    expect(pngSize('src/assets/images/launch-logo.png')).toEqual({ width: 480, height: 480 })
  })

  it('draws the iOS logo 120 x 120 pt, centred, on the one background colour the Builder replaces', () => {
    const sb = read('ios/ODelivery/BootSplash.storyboard').toString()

    expect(sb).toContain('<image name="BootSplashLogo" width="120" height="120"/>')
    expect(sb).toMatch(/<rect key="frame" x="127.5" y="273.5" width="120" height="120"\/>/)
    expect(sb).toContain('firstAttribute="centerX"')
    expect(sb).toContain('firstAttribute="centerY"')
    expect(sb).toContain('<color key="backgroundColor" red="1" green="1" blue="1" alpha="1" colorSpace="custom" customColorSpace="sRGB"/>')
  })
})
