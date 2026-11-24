import { Platform } from 'react-native'
import { defaultAppTheme } from '../engine'
import { barBottomSpace, bottomBarBox, bottomBarClearance, bottomBarHeight, bottomSpace, isOpaque, nativeBoxStyle, themeBottomSpace, themeControlHeight, themeSpace } from '../helpers'

const shadow = { shadowColor: '#000000', shadowOpacity: 0.1, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1, boxShadow: 'x' }

describe('nativeBoxStyle', () => {
  it('keeps the shadow on an opaque background and on a look without one', () => {
    expect(nativeBoxStyle({ background: '#FFFFFF', shadow })).toMatchObject({ backgroundColor: '#FFFFFF', shadowOpacity: 0.1 })
    expect(nativeBoxStyle({ shadow })).toMatchObject({ shadowOpacity: 0.1 })
  })

  it('drops it on a see-through background (an outline button, a color with alpha)', () => {
    for (const background of ['transparent', 'rgba(0,0,0,0.5)', '#00000080']) {
      expect(nativeBoxStyle({ background, shadow }).shadowOpacity).toBeUndefined()
    }
    expect(isOpaque('rgba(1,2,3,1)')).toBe(true)
    expect(isOpaque('#FFFFFFFF')).toBe(true)
  })
})

describe('bottomBarClearance', () => {
  it('is the bar (its slot\'s buttons, its padding, the space under it) and a block space', () => {
    const theme: any = defaultAppTheme()
    const bar = theme.native.components.bottom_bar
    const pad = bar.base.padding
    const button = theme.native.components.button.sizes[bar.slots.button.size].height
    expect(bottomBarHeight(theme, 34)).toBe(button + 2 * pad + 34)
    expect(bottomBarClearance(theme, 34)).toBe(bottomBarHeight(theme, 34) + themeSpace(theme, 'xl'))
    // With no inset (Android gestures) the bar still keeps the theme's minimum under its content.
    expect(bottomBarHeight(theme, 0, 2)).toBe(2 * button + themeSpace(theme, 'sm') + 2 * pad + themeBottomSpace(theme, 0))
    // Inside the bottom tabs the screen ends above the tab bar: no space under the buttons.
    expect(bottomBarHeight(theme, 34, 1, 0)).toBe(button + 2 * pad)
  })
})

describe('the space under a bottom bar', () => {
  const min = 15

  it('is the system inset, never less than the minimum', () => {
    expect([0, 15, 34, 48].map(inset => bottomSpace(inset, min))).toEqual([15, 15, 34, 48])
  })

  it('sizes the bar and pads its content over that space, once (no inset on top of the minimum)', () => {
    const box = (inset: number) => bottomBarBox({ height: 60, padding: 10, inset, min, growth: 3 })
    expect(box(0)).toEqual({ height: 60 + 15 + 3, paddingBottom: 15 + 10 })
    expect(box(15)).toEqual(box(0))
    expect(box(34)).toEqual({ height: 60 + 34 + 3, paddingBottom: 34 + 10 })
    expect(box(48)).toEqual({ height: 60 + 48 + 3, paddingBottom: 48 + 10 })
  })

  it('reads the minimum from the theme (`bottom_nav.min_bottom_space`)', () => {
    const theme: any = defaultAppTheme()
    const floor = theme.native.components.bottom_nav.base.min_bottom_space
    expect(floor).toBeGreaterThan(0)
    expect(themeBottomSpace(theme, 0)).toBe(floor)
    expect(themeBottomSpace(theme, floor + 20)).toBe(floor + 20)
  })
})

describe('the space under a pinned action bar (`barBottomSpace`)', () => {
  const theme: any = defaultAppTheme()
  const floor = theme.native.components.bottom_nav.base.min_bottom_space
  const original = Platform.OS
  const on = (os: string) => Object.defineProperty(Platform, 'OS', { configurable: true, get: () => os })
  afterEach(() => on(original))

  it('on iOS is the inset, never less than the theme\'s minimum (what it always was)', () => {
    on('ios')
    expect([0, floor, 34].map((inset) => barBottomSpace(theme, inset))).toEqual([floor, floor, 34])
    expect(barBottomSpace(theme, 34)).toBe(themeBottomSpace(theme, 34))
  })

  it('on Android is the inset the screen reads and no minimum on top: a screen of the stack (the activity pads it, inset 0) and a modal (its window reads the bars, 63) leave the same gap over the navigation area', () => {
    on('android')
    expect(barBottomSpace(theme, 0)).toBe(0)
    expect(barBottomSpace(theme, 63)).toBe(63)
  })

  it('sizes the room a bar takes, and the clearance a scroll leaves for it, with the same value as the bar', () => {
    const bar = theme.native.components.bottom_bar
    const button = theme.native.components.button.sizes[bar.slots.button.size].height
    on('android')
    expect(bottomBarHeight(theme, 0)).toBe(button + 2 * bar.base.padding)
    on('ios')
    expect(bottomBarHeight(theme, 0)).toBe(button + 2 * bar.base.padding + floor)
  })
})

describe('card borders', () => {
  const theme: any = defaultAppTheme()
  const borderColor = theme.native.tokens.color.border

  it('every card kind (and the choice cards) is a thin border of the theme\'s border color on its four sides', () => {
    for (const name of ['card', 'order_card', 'choice']) {
      const look = theme.native.components[name].base
      // `borderWidth` / `borderColor` (not per side): the same line on the four sides, on iOS and Android.
      expect(look.border).toMatchObject({ borderWidth: theme.native.tokens.border.thin, borderStyle: 'solid', borderColor })
      expect(Object.keys(look.border).some((key) => /Top|Bottom|Left|Right/.test(key))).toBe(false)
      expect(nativeBoxStyle(look)).toMatchObject({ borderWidth: look.border.borderWidth, borderColor })
    }
  })

  it('a theme can still take the border away', () => {
    const none = nativeBoxStyle({ background: '#FFFFFF', border: undefined })
    expect(none.borderWidth).toBeUndefined()
  })
})
