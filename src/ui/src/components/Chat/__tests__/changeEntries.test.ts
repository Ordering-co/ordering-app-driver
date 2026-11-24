import { describeChange, isEmptyChangeValue } from '../changeEntries'

const t = (_key: string, fallback?: string) => fallback ?? _key
const entry = (change: any, extra: any = {}) => describeChange({ change, ...extra }, t)

describe('what a change of the order says in the thread', () => {
  it('words a status change with the statuses\' names, as it always did', () => {
    expect(entry({ attribute: 'status', old: 0, new: 7 })).toBe('Order Status Changed from Order status pending to Order status accepted by restaurant')
    expect(entry({ attribute: 'status', old: '8', new: '18' })).toBe('Order Status Changed from Order confirmed accepted by driver to Order driver almost arrived to business')
  })

  it('words the minutes of a preparation or a delivery, and a logistic status', () => {
    expect(entry({ attribute: 'delivered_in', old: 10, new: 20 })).toBe('Order Delivered in Changed from 10 to 20 Minutes')
    expect(entry({ attribute: 'prepared_in', old: null, new: 15 })).toBe('Order Prepared in Changed from 0 to 15 Minutes')
    expect(entry({ attribute: 'logistic_status', old: 0, new: 2 })).toBe('Order Logistic status Changed from Pending to In queue')
  })

  describe('the three entries a device pass showed with raw placeholders', () => {
    it('"Changed from undefined to undefined" has nothing to say: no entry', () => {
      expect(entry({ attribute: 'status', old: undefined, new: undefined })).toBeUndefined()
      expect(entry({ attribute: 'delivery_position', old: undefined, new: undefined })).toBeUndefined()
    })

    it('"Reject reason Changed from false to undefined" is a removed reason, never "false" or "undefined"', () => {
      const text = entry({ attribute: 'reject_reason', old: 'Out of stock', new: undefined })
      expect(text).toBe('Order Reject reason removed')
      expect(entry({ attribute: 'reject_reason', old: false, new: undefined })).toBeUndefined()
      expect(entry({ attribute: 'reject_reason', old: false, new: 'Out of stock' })).toBe('Order Reject reason set to Out of stock')
    })

    it('"Delivery position Changed from false to Order completed" is a position, never a status\'s name', () => {
      // A position is shown as the number it is: only the status attribute turns an id into a status name.
      expect(entry({ attribute: 'delivery_position', old: false, new: 1 })).toBe('Order Delivery position set to 1')
      expect(entry({ attribute: 'delivery_position', old: 1, new: 2 })).toBe('Order Delivery position Changed from 1 to 2')
      expect(entry({ attribute: 'delivery_position', old: 2, new: false })).toBe('Order Delivery position removed')
    })
  })

  it('never prints "undefined", "null" or "false" as a value, whatever the attribute', () => {
    for (const attribute of ['status', 'logistic_status', 'delivery_position', 'reject_reason', 'external_id', 'driver_group_id', 'delivered_in']) {
      for (const [old, next] of [[undefined, 7], [3, undefined], [false, 1], [null, 2], ['undefined', 4], [5, 'null']]) {
        const text = entry({ attribute, old, new: next })
        if (text) expect(text).not.toMatch(/undefined|null|false/i)
      }
    }
  })

  it('leaves out an attribute the app has no words for, instead of showing it raw', () => {
    expect(entry({ attribute: 'delivery_pin_status', old: undefined, new: undefined })).toBeUndefined()
    expect(entry({ attribute: 'delivery_pin_status', old: 'requested', new: 'validated' })).toBeUndefined()
    expect(entry({ attribute: 'distance', old: 'far', new: 'near' })).toBeUndefined()
    expect(entry({ attribute: 'summary.refunded', old: 0, new: 10.71 })).toBeUndefined()
    expect(entry({})).toBeUndefined()
    expect(describeChange({}, t)).toBeUndefined()
  })

  it('leaves out a status the app has no name for', () => {
    expect(entry({ attribute: 'status', old: 0, new: 99 })).toBeUndefined()
  })

  it('words the assignment of a driver and its end', () => {
    expect(entry({ attribute: 'driver_id', old: null, new: 7 }, { driver: { name: 'Ana', lastname: 'Pérez' }, comment: 'abcd' }))
      .toBe('Ana Pérez Was assigned as driver 4')
    expect(entry({ attribute: 'driver_id', old: 13217, new: null })).toBe('Driver unassigned')
    expect(entry({ attribute: 'driver_id', old: 13217, new: undefined })).toBe('Driver unassigned')
    expect(entry({ attribute: 'driver_id', old: null, new: 7 }, { driver: { name: 'Ana', lastname: null } })).toBe('Ana Was assigned as driver')
  })

  it('words the group and the manual assignment with their whole phrases', () => {
    expect(entry({ attribute: 'driver_group_id', old: 1, new: 2 })).toBe('Order Driver group id changed from 1 to 2.')
    expect(entry({ attribute: 'driver_group_id', old: 1, new: null })).toBe('Order Driver group id removed')
    expect(entry({ attribute: 'manual_driver_assignment_comment', old: null, new: 'Necesita ayuda' })).toBe('Order Manual driver assignment comment set to Necesita ayuda')
  })

  it('writes a reason with the characters it has, "$&" included', () => {
    expect(entry({ attribute: 'reject_reason', old: 'a', new: 'cost $& more' })).toBe('Order Reject reason Changed from a to cost $& more')
  })

  it('knows what no value is', () => {
    for (const none of [undefined, null, false, '', '  ', 'undefined', 'null', 'false', []]) expect(isEmptyChangeValue(none)).toBe(true)
    for (const some of [0, '0', 'x', true, 1]) expect(isEmptyChangeValue(some)).toBe(false)
  })
})
