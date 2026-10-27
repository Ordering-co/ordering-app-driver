import AsyncStorage from '@react-native-async-storage/async-storage'
import { act, renderHook, waitFor } from '@testing-library/react-native'

import { deliveryPinRetryAfter, useDeliveryPinCooldown } from '../useDeliveryPinCooldown'

const NOW = new Date('2026-10-21T12:00:00Z').getTime()

const setup = (ids: Array<number | string> = [223]) =>
  renderHook(({ orderIds }) => useDeliveryPinCooldown(orderIds), { initialProps: { orderIds: ids } })

const stored = async () => JSON.parse((await AsyncStorage.getItem('delivery_pin_retry_at')) || '{}')

describe('deliveryPinRetryAfter', () => {
  it('waits only for a wrong pin or an attempt made during the wait', () => {
    expect(deliveryPinRetryAfter(['delivery_pin.invalid'], 10)).toBe(10)
    expect(deliveryPinRetryAfter(['delivery_pin.too_many_attempts'], 7)).toBe(7)
  })

  it('does not wait for any other error', () => {
    expect(deliveryPinRetryAfter(['delivery_pin.required'], 10)).toBe(0)
    expect(deliveryPinRetryAfter(['location.outdated'], 10)).toBe(0)
    expect(deliveryPinRetryAfter(null, 10)).toBe(0)
    expect(deliveryPinRetryAfter(undefined, undefined)).toBe(0)
  })

  it('does not wait without a time from the server', () => {
    expect(deliveryPinRetryAfter(['delivery_pin.invalid'], null)).toBe(0)
    expect(deliveryPinRetryAfter(['delivery_pin.invalid'], 0)).toBe(0)
  })
})

describe('useDeliveryPinCooldown', () => {
  beforeEach(async () => {
    await AsyncStorage.clear()
    jest.useFakeTimers({ now: NOW })
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('does not wait before any failure', async () => {
    const { result } = setup()
    await waitFor(() => expect(result.current.secondsLeft).toBe(0))
  })

  it('waits the time the server asked for and counts it down', async () => {
    const { result } = setup()

    await act(async () => { await result.current.waitFor({ 223: 15 }) })
    expect(result.current.secondsLeft).toBe(15)

    await act(async () => { jest.advanceTimersByTime(4000) })
    expect(result.current.secondsLeft).toBe(11)

    await act(async () => { jest.advanceTimersByTime(11000) })
    expect(result.current.secondsLeft).toBe(0)
  })

  it('keeps the wait after the screen is reopened', async () => {
    const first = setup()
    await act(async () => { await first.result.current.waitFor({ 223: 10 }) })
    first.unmount()

    const { result } = setup()
    await waitFor(() => expect(result.current.secondsLeft).toBe(10))
  })

  it('keeps each order apart', async () => {
    const first = setup([223])
    await act(async () => { await first.result.current.waitFor({ 223: 10 }) })

    const { result } = setup([224])
    await waitFor(() => expect(result.current.secondsLeft).toBe(0))
  })

  it('uses the longest wait of a group', async () => {
    const { result } = setup([224, 225])
    await act(async () => { await result.current.waitFor({ 224: 10, 225: 30 }) })
    expect(result.current.secondsLeft).toBe(30)
  })

  it('forgets the wait once the pin goes through', async () => {
    const { result } = setup()
    await act(async () => { await result.current.waitFor({ 223: 10 }) })
    await act(async () => { await result.current.clear() })

    expect(result.current.secondsLeft).toBe(0)
    expect(await stored()).toEqual({})
  })

  it('drops from storage every wait that is over', async () => {
    const completedByAdmin = setup([223])
    await act(async () => { await completedByAdmin.result.current.waitFor({ 223: 10 }) })
    completedByAdmin.unmount()
    await act(async () => { jest.advanceTimersByTime(11000) })

    const other = setup([224])
    await act(async () => { await other.result.current.waitFor({ 224: 15 }) })

    expect(Object.keys(await stored())).toEqual(['224'])
  })
})
