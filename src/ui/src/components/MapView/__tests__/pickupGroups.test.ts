import { isToPickUp, pickupGroups } from '../pickupGroups'
import { stopStage } from '../../OrderDetails/orderStages'

const order = (id: number, status: number, extra: any = {}) => ({ id, status, delivery_type: 1, business_id: 1, ...extra })

describe('pickupGroups: a store\'s disc is where to pick up', () => {
  it.each([
    ['offered', 0], ['ready for pickup', 4], ['pending', 7], ['accepted by the driver', 8], ['almost at the store', 18], ['at the store', 3],
  ])('keeps an order that is %s (status %i)', (_name, status) => {
    expect(isToPickUp(order(1, status))).toBe(true)
  })

  it.each([
    ['picked up', 9], ['almost with the customer', 19], ['on the way', 23], ['with the customer', 26],
  ])('leaves out an order that is %s (status %i): it is at its customer, not at the store', (_name, status) => {
    expect(isToPickUp(order(1, status))).toBe(false)
  })

  it('is the stage rule of the details and the list (`stopStage`), not a copy: it agrees with it on every status the map loads', () => {
    for (const status of [0, 13, 7, 4, 3, 8, 9, 14, 18, 19, 20, 21, 23, 26]) {
      for (const delivery_type of [1, 2, 7]) {
        const o = order(1, status, { delivery_type })
        expect(isToPickUp(o)).toBe(['route', 'pickup'].includes(stopStage(o, status)))
      }
    }
  })

  it('keeps an order that is not a delivery in its store group until it is over (its customer is never a stop)', () => {
    expect(isToPickUp(order(1, 9, { delivery_type: 2 }))).toBe(true)
  })

  it('reads the status the driver acts on: an order the business marked ready that the driver already picked up is not to pick up', () => {
    const picked = order(1, 4, {
      last_driver_assigned_at: '2026-01-01 10:00:00',
      reporting_data: { at: { 'status:8': '2026-01-01 10:05:00', 'status:9': '2026-01-01 10:20:00' } }
    })
    expect(isToPickUp(picked)).toBe(false)
    expect(isToPickUp(order(1, 4))).toBe(true)
  })

  it('drops the picked up orders of a group, keeps the others in order, and drops a group left with none', () => {
    const groups = {
      1: [order(10, 9, { business_id: 1 }), order(11, 8, { business_id: 1 }), order(12, 3, { business_id: 1 })],
      2: [order(20, 9, { business_id: 2 }), order(21, 26, { business_id: 2 })]
    }
    const result = pickupGroups(groups)
    expect(Object.keys(result)).toEqual(['1'])
    expect(result[1].map((o) => o.id)).toEqual([11, 12])
    // The controller's groups are not touched.
    expect(groups[1]).toHaveLength(3)
  })

  it('is empty for no groups', () => {
    expect(pickupGroups(undefined)).toEqual({})
    expect(pickupGroups({})).toEqual({})
  })
})
