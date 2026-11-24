import { nextStop } from '../nextStop'

const delivery = {
  delivery_type: 1,
  business: { address: '  214 Harbor St ' },
  customer: { address: '9 Birch Rd' }
}

describe('nextStop', () => {
  it('is the store while the order is not on its way, and on the way to it and at it', () => {
    for (const status of [0, 7, 14, 4, 8, 18, 3]) {
      expect(nextStop(delivery, status)).toEqual({ party: 'business', address: '214 Harbor St' })
    }
  })

  it('is the customer once the order is picked up', () => {
    for (const status of [9, 19, 23, 26]) {
      expect(nextStop(delivery, status)).toEqual({ party: 'customer', address: '9 Birch Rd' })
    }
  })

  it('is nothing once the order is over', () => {
    for (const status of [1, 2, 5, 6, 10, 11, 12, 15, 16, 17]) {
      expect(nextStop(delivery, status)).toBeNull()
    }
  })

  it('is always the store for an order that is not a delivery: its customer is never a stop', () => {
    expect(nextStop({ ...delivery, delivery_type: 2 }, 9)).toEqual({ party: 'business', address: '214 Harbor St' })
    expect(nextStop({ ...delivery, delivery_type: 3 }, 26)).toEqual({ party: 'business', address: '214 Harbor St' })
  })

  it('is nothing for a stop whose address the order does not carry', () => {
    expect(nextStop({ delivery_type: 1, business: { name: 'Store' } }, 3)).toBeNull()
    expect(nextStop({ delivery_type: 1, customer: { address: '   ' } }, 9)).toBeNull()
    expect(nextStop({ delivery_type: 1 }, 9)).toBeNull()
    expect(nextStop(null, 3)).toBeNull()
  })
})
