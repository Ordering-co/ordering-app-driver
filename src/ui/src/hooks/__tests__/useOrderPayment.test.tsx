import { renderHook } from '@testing-library/react-native'

jest.mock('@components', () => ({
  useLanguage: () => [{}, (_key: string, fallback: string) => fallback],
  useUtils: () => [{ parsePrice: (value: number) => `$${Number(value ?? 0).toFixed(2)}` }]
}))

import { useOrderPayment } from '../useOrderPayment'

const payment = (order: any) => renderHook(() => useOrderPayment(order)).result.current
const cash = { event: 'payment', paymethod: { gateway: 'cash', name: 'Cash' } }
const card = { event: 'payment', paymethod: { gateway: 'stripe', name: 'Card' } }
const wallet = { event: 'payment', data: { wallet_currency: 'cash' }, paymethod: { gateway: 'cash', name: 'Cash' } }

describe('useOrderPayment', () => {
  it('writes a cash order with the bill the customer pays with, as the app always did', () => {
    const result = payment({ payment_events: [cash], cash: 50, summary: { total: 32.37 } })
    expect(result.text).toBe('Cash (Change of $50.00)')
    expect(result.methods).toBe('Cash')
    expect(result.isCashOnly).toBe(true)
    expect(result.change).toBe('Change of $50.00')
    expect(result.total).toBe('$32.37')
    expect(result.count).toBe(1)
  })

  it('has no change without the customer\'s bill', () => {
    const result = payment({ payment_events: [cash], cash: 0, total: 10 })
    expect(result.text).toBe('Cash')
    expect(result.change).toBeNull()
    expect(result.total).toBe('$10.00')
  })

  it('joins several payments, and is not a cash order when one of them is not cash', () => {
    const result = payment({ payment_events: [wallet, card, cash, { event: 'refund' }], cash: 50 })
    expect(result.text).toBe('Cash Wallet, Card, Cash (Change of $50.00)')
    expect(result.methods).toBe('Cash Wallet, Card, Cash')
    expect(result.count).toBe(3)
    expect(result.isCashOnly).toBe(false)
    expect(result.change).toBeNull()
  })

  it('takes the order\'s own method when a payment names none, and when the order has no payments', () => {
    expect(payment({ payment_events: [{ event: 'payment' }], paymethod: { gateway: 'cash', name: 'Cash' } }).text).toBe('Cash')
    const bare = payment({ paymethod: { gateway: 'cash', name: 'Cash' }, cash: 20, total: 5 })
    expect(bare.text).toBe('Cash (Change of $20.00)')
    expect(bare.isCashOnly).toBe(true)
    expect(bare.change).toBe('Change of $20.00')
    const paid = payment({ paymethod: { gateway: 'stripe', name: 'Card' } })
    expect(paid.text).toBe('Card')
    expect(paid.isCashOnly).toBe(false)
  })
})
