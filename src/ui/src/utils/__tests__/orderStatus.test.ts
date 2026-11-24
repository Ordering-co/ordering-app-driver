import { getOrderStatus, getOrderStatuPickUp, orderStatusEntry, orderStatusList, orderStatusName } from '../index'

const english = (_key: string, fallback?: string) => fallback ?? _key
const keys = (key: string) => key

describe('utils — the one list of status names', () => {
  it('has every status from 0 to 26, once, in order', () => {
    expect(orderStatusList(english).map((status) => status.key)).toEqual(Array.from({ length: 27 }, (_, i) => i))
  })

  it('gives each status what its readers take: a name as value and as text, a slug and a progress', () => {
    for (const status of orderStatusList(english)) {
      expect(status.value).toBeTruthy()
      expect(status.text).toBe(status.value)
      expect(status.slug).toMatch(/^[A-Z_]+$/)
      expect(status.percentage).toBeGreaterThanOrEqual(0)
      expect(status.percentage).toBeLessThanOrEqual(1)
    }
  })

  it('translates each name with its slug as the key', () => {
    for (const status of orderStatusList(keys)) expect(status.value).toBe(status.slug)
  })

  it('names status 4 "Ready for pickup" and status 5 "Rejected by business" (decision H1)', () => {
    expect(orderStatusName(english, 4)).toBe('Ready for pickup')
    expect(orderStatusName(keys, 4)).toBe('READY_FOR_PICKUP')
    expect(orderStatusName(english, 5)).toBe('Rejected by business')
    expect(orderStatusName(keys, 5)).toBe('REJECTED_BY_BUSINESS')
  })

  it('keeps the names the order\'s details had for the statuses the lists wrote differently', () => {
    expect(orderStatusName(english, 13)).toBe('PreOrder')
    expect(orderStatusName(keys, 18)).toBe('DRIVER_ALMOST_ARRIVED_TO_BUSINESS')
    expect(orderStatusName(keys, 19)).toBe('DRIVER_ALMOST_ARRIVED_TO_CUSTOMER')
  })

  it('takes the status as a number or as a string, and knows no other status', () => {
    expect(orderStatusName(english, 0)).toBe('Pending')
    expect(orderStatusName(english, '11')).toBe('Delivery completed by driver')
    expect(orderStatusEntry(english, '0')?.slug).toBe('PENDING')
    expect(orderStatusName(english, 99)).toBeUndefined()
    expect(orderStatusName(english, undefined)).toBeUndefined()
    expect(orderStatusName(english, null)).toBeUndefined()
  })

  it('getOrderStatus reads the same list', () => {
    for (const status of orderStatusList(english)) {
      expect(getOrderStatus(String(status.key), english)).toEqual(status)
    }
    expect(getOrderStatus('4', english)?.value).toBe('Ready for pickup')
    expect(getOrderStatus('99', english)).toBeUndefined()
  })

  it('getOrderStatuPickUp names a pickup\'s statuses from the same list, with its own progress', () => {
    expect(getOrderStatuPickUp(4, english)).toEqual({ ...orderStatusEntry(english, 4), percentage: 0.5 })
    expect(getOrderStatuPickUp('0', english)?.percentage).toBe(0.1)
    // A status a pickup never goes through (a driver's).
    expect(getOrderStatuPickUp(9, english)).toBeUndefined()
  })
})
