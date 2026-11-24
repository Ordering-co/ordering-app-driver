import { orderTypeVariant } from '../orderTypeVariant'
import { defaultAppTheme } from '../../../../../theme/engine'

describe('orderTypeVariant', () => {
  it('paints a delivery with a driver (delivery, catering delivery) in the delivery colour', () => {
    expect([1, 7].map(orderTypeVariant)).toEqual(['type_delivery', 'type_delivery'])
  })

  it('paints what the customer collects (pickup, curbside, drive thru, catering pickup) in the pickup colour', () => {
    expect([2, 4, 5, 8].map(orderTypeVariant)).toEqual(['type_pickup', 'type_pickup', 'type_pickup', 'type_pickup'])
  })

  it('paints what is served in the store (eat in, reservation) in the in-store colour', () => {
    expect([3, 9].map(orderTypeVariant)).toEqual(['type_in_store', 'type_in_store'])
  })

  it('takes the type as the API sends it, a number or its text, and a type it does not know is neutral', () => {
    expect(orderTypeVariant('2')).toBe('type_pickup')
    for (const type of [0, 6, 99, '', null, undefined]) expect(orderTypeVariant(type as any)).toBe('neutral')
  })

  it('names variants the theme has, each with a tint and a text color', () => {
    const variants = (defaultAppTheme() as any).native.components.badge.variants
    for (const name of new Set([1, 2, 3].map(orderTypeVariant))) {
      expect(variants[name].background).toMatch(/^#[0-9A-F]{6}$/i)
      expect(variants[name].color).toMatch(/^#[0-9A-F]{6}$/i)
    }
  })
})
