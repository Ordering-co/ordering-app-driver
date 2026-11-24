import { isDeliveredOrder, isOfferedStatus, isOnTheWayToStoreStatus, stopStage } from '../orderStages'

const delivery = { delivery_type: 1 }

describe('stopStage', () => {
  it.each([0, 4, 7, 13, 14, 20, 22, 24, 25])('status %i has no stop yet: the route', (status) => {
    expect(stopStage(delivery, status)).toBe('route')
  })

  it.each([3, 8, 18])('status %i is the pickup', (status) => {
    expect(stopStage(delivery, status)).toBe('pickup')
  })

  it.each([9, 19, 23, 26])('status %i is the delivery', (status) => {
    expect(stopStage(delivery, status)).toBe('delivery')
  })

  it.each([1, 2, 5, 6, 10, 11, 12, 15, 16, 17])('status %i is over', (status) => {
    expect(stopStage(delivery, status)).toBe('finished')
  })

  it('an order that is not a delivery stays at the store until it is over', () => {
    ;[0, 3, 8, 9, 26].forEach((status) => expect(stopStage({ delivery_type: 2 }, status)).toBe('pickup'))
    expect(stopStage({ delivery_type: 2 }, 11)).toBe('finished')
    expect(stopStage({ delivery_type: 3 }, 0)).toBe('pickup')
  })

  it('a catering delivery is a delivery', () => {
    expect(stopStage({ delivery_type: 7 }, 9)).toBe('delivery')
  })
})

describe('isOfferedStatus', () => {
  it('is the statuses for which the bottom bar offers accept and reject', () => {
    expect([0, 4, 7, 14].every(isOfferedStatus)).toBe(true)
    expect([3, 8, 9, 11, 13, 26].some(isOfferedStatus)).toBe(false)
  })
})

describe('isOnTheWayToStoreStatus', () => {
  it('is the driver accepted (8) or almost at the store (18): "Arrived to business" is the next step', () => {
    expect([8, 18].every(isOnTheWayToStoreStatus)).toBe(true)
  })

  it('is not the store itself (3), nor any stage after it, nor an offered order', () => {
    expect([0, 3, 4, 7, 9, 19, 23, 26, 11].some(isOnTheWayToStoreStatus)).toBe(false)
  })
})

describe('isDeliveredOrder', () => {
  it('is a delivery completed by the driver or the business', () => {
    expect(isDeliveredOrder({ delivery_type: 1, status: 11 })).toBe(true)
    expect(isDeliveredOrder({ delivery_type: 7, status: 1 })).toBe(true)
  })

  it('is not an order that failed, was rejected, or is not a delivery', () => {
    expect(isDeliveredOrder({ delivery_type: 1, status: 12 })).toBe(false)
    expect(isDeliveredOrder({ delivery_type: 1, status: 2 })).toBe(false)
    expect(isDeliveredOrder({ delivery_type: 2, status: 1 })).toBe(false)
  })
})
