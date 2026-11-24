import { bandTone, bandVariant } from '../orderCardBand'
import { bandToneStyles } from '../styles'
import { defaultAppTheme } from '../../../../../theme/engine'

describe('bandTone: the tint of the order card\'s status band', () => {
  const time = (state: 'warning' | 'danger' | null) => ({ text: '24 min left', state })

  it('is the brand\'s on time, the warning\'s at risk and the danger\'s late, for an order that is open', () => {
    expect(bandTone({ closed: false, status: 3, time: time(null) })).toBe('primary')
    expect(bandTone({ closed: false, status: 3, time: time('warning') })).toBe('warning')
    expect(bandTone({ closed: false, status: 3, time: time('danger') })).toBe('danger')
  })

  it('is the brand\'s with no time on the card (no enterprise plan), whatever the status', () => {
    for (const status of [0, 3, 11, 12]) expect(bandTone({ closed: false, status, time: null })).toBe('primary')
  })

  it('is the success\'s for an order completed and the danger\'s for one cancelled, rejected or failed, with or without a time', () => {
    for (const status of [1, 11, 15]) expect(bandTone({ closed: true, status, time: time(null) })).toBe('success')
    for (const status of [2, 5, 6, 10, 12, 16, 17]) expect(bandTone({ closed: true, status, time: null })).toBe('danger')
  })

  it('names the soft badge variant of the tone, and paints its tint and its text from the theme', () => {
    const variants = (defaultAppTheme() as any).native.components.badge.variants
    for (const tone of ['primary', 'warning', 'danger', 'success'] as const) {
      expect(bandVariant(tone)).toBe(`${tone}_soft`)
      const look = bandToneStyles(defaultAppTheme(), tone)
      expect(look.box.backgroundColor).toBe(variants[`${tone}_soft`].background)
      expect(look.text.color).toBe(variants[`${tone}_soft`].color)
    }
  })
})

/** WCAG 2.x relative luminance and contrast ratio of two `#RRGGBB` colors. */
const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16) / 255)
    .map((channel) => (channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const contrast = (a: string, b: string) => {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (light + 0.05) / (dark + 0.05)
}

describe('the status band\'s tones read: the text on its tint is at least 4.5:1 (12 px semibold is small text)', () => {
  const variants = (defaultAppTheme() as any).native.components.badge.variants

  it('measures the contrast the way WCAG does (white on black 21, a color on itself 1)', () => {
    expect(contrast('#FFFFFF', '#000000')).toBeCloseTo(21, 5)
    expect(contrast('#336699', '#336699')).toBeCloseTo(1, 5)
  })

  // The same variants paint the "Collect in cash" (warning_soft) and "Paid" (success_soft) chips, so they are held to the same bar.
  for (const tone of ['primary', 'warning', 'danger', 'success'] as const) {
    it(`${tone}: the text of ${bandVariant(tone)} on its tint`, () => {
      const look = variants[bandVariant(tone)]
      expect(contrast(look.background, look.color)).toBeGreaterThanOrEqual(4.5)
    })
  }

  it('is held for the three colors of the order types too, which are chips of the same card', () => {
    for (const type of ['type_delivery', 'type_pickup', 'type_in_store']) {
      expect(contrast(variants[type].background, variants[type].color)).toBeGreaterThanOrEqual(4.5)
    }
  })
})
