import { alertContent } from '../alertContent'
import type { AlertItem, AlertKind } from '../alertQueue'

/** The catalog's fallbacks, as the app writes them when a language has no text of its own. */
const t = (_key: string, fallback: string) => fallback
const plain = (id?: number | string) => String(id ?? '')

const item = (extra: Partial<AlertItem> = {}): AlertItem => ({ key: 'o:3504', orderId: 3504, ...extra })
const message = (kind: AlertKind, items: AlertItem[]) => alertContent(kind, items, t, plain, true).message

describe('the new-order alert\'s wording, different by kind', () => {
  it('an order that is the driver\'s says it was assigned to him', () => {
    expect(message('order', [item()])).toBe('Order #3504 has been assigned to you.')
  })

  it('a request to take an order says it needs a driver', () => {
    expect(message('request', [item()])).toBe('Order #3504 needs a driver.')
  })

  it('a request for a group says the group needs a driver, with its orders when the packet says', () => {
    expect(message('request', [item({ key: 'g:89', orderId: undefined, groupId: 89 })])).toBe('Group No. 89 needs a driver.')
    expect(message('request', [item({ key: 'g:89', orderId: undefined, groupId: 89, ordersCount: 3 })])).toBe('Group No. 89 (3 orders) needs a driver.')
  })

  it('a group that is the driver\'s says it was assigned to him, with its orders when the packet says', () => {
    expect(message('order', [item({ key: 'g:89', orderId: undefined, groupId: 89 })])).toBe('Group No. 89 has been assigned to you.')
    expect(message('order', [item({ key: 'g:89', orderId: undefined, groupId: 89, ordersCount: 3 })])).toBe('Group No. 89 (3 orders) has been assigned to you.')
  })

  it('never says one kind\'s voice in the other\'s', () => {
    expect(message('order', [item()])).not.toMatch(/needs a driver/)
    expect(message('request', [item()])).not.toMatch(/assigned to you|ordered/)
  })

  it('keeps the title above the message: "New order!!" for one of either kind', () => {
    expect(alertContent('order', [item()], t, plain, true).title).toBe('New order!!')
    expect(alertContent('request', [item()], t, plain, true).title).toBe('New order!!')
  })

  it('writes the order\'s number as the app masks it', () => {
    const masked = (id?: number | string) => `${String(id ?? '').slice(0, -4)}****`
    expect(alertContent('order', [item()], t, masked, true).message).toBe('Order #**** has been assigned to you.')
  })

  it('asks the translator for keys of its own, so no language says the old "has been ordered"', () => {
    const asked: string[] = []
    const spy = (key: string, fallback: string) => { asked.push(key); return fallback }
    alertContent('order', [item()], spy, plain, true)
    alertContent('request', [item()], spy, plain, true)
    expect(asked).toEqual(expect.arrayContaining(['ORDER_N_ASSIGNED_TO_YOU', 'ORDER_N_NEEDS_DRIVER']))
    expect(asked).not.toContain('ORDER_N_ORDERED')
  })
})
