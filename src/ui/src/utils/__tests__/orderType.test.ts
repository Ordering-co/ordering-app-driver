import { orderTypeLabel } from '../index'

const t = (_key: string, fallback?: string) => fallback ?? _key

describe('utils — orderTypeLabel', () => {
  it('names the types a driver sees', () => {
    expect(orderTypeLabel(t, 1)).toBe('Delivery')
    expect(orderTypeLabel(t, 2)).toBe('Pickup')
    expect(orderTypeLabel(t, 3)).toBe('Eat in')
    expect(orderTypeLabel(t, 4)).toBe('Curbside')
    expect(orderTypeLabel(t, 5)).toBe('Driver thru')
  })

  it('names catering (7, 8) and reservation (9)', () => {
    expect(orderTypeLabel(t, 7)).toBe('Catering delivery')
    expect(orderTypeLabel(t, 8)).toBe('Catering pickup')
    expect(orderTypeLabel(t, 9)).toBe('Reservation')
  })

  it('calls any type it does not know a delivery', () => {
    expect(orderTypeLabel(t, 6)).toBe('Delivery')
    expect(orderTypeLabel(t, 42)).toBe('Delivery')
    expect(orderTypeLabel(t, undefined)).toBe('Delivery')
    expect(orderTypeLabel(t, null)).toBe('Delivery')
  })

  it('takes the type as the API sends it, a number or a string', () => {
    expect(orderTypeLabel(t, '7')).toBe('Catering delivery')
  })

  it('translates with the type\'s key', () => {
    const keys = (key: string) => key
    expect(orderTypeLabel(keys, 9)).toBe('RESERVATION')
    expect(orderTypeLabel(keys, 1)).toBe('DELIVERY')
  })
})
