import {
  areListedOrdersEqual,
  areListedOrderRowPropsEqual
} from '../areListedOrderRowPropsEqual'

const listedOrder = {
  id: 101,
  status: 7,
  locked: false,
  unsync: false,
  showNotification: false,
  time_status: 'in_time',
  delivery_type: 1,
  delivery_datetime: '2026-08-26 12:00:00',
  delivery_datetime_utc: '2026-08-26 16:00:00',
  eta_time: 30,
  external_id: 'EXT-1',
  order_group_id: null,
  delivery_position: 2,
  business: { name: 'Store A', logo: 'https://example.com/logo.png' },
  products: [{ id: 1, name: 'Burger' }]
}

describe('areListedOrdersEqual', () => {
  it('is true for the same object reference', () => {
    expect(areListedOrdersEqual(listedOrder, listedOrder)).toBe(true)
  })

  it('is true when only nested products differ', () => {
    expect(areListedOrdersEqual(
      listedOrder,
      { ...listedOrder, products: [{ id: 99, name: 'Pizza'.repeat(200) }] }
    )).toBe(true)
  })

  it('is false when status changes', () => {
    expect(areListedOrdersEqual(listedOrder, { ...listedOrder, status: 4 })).toBe(false)
  })

  it('is false when updated_at changes', () => {
    expect(areListedOrdersEqual(
      { ...listedOrder, updated_at: '2026-08-26T16:00:00.000000Z' },
      { ...listedOrder, updated_at: '2026-08-26T16:01:00.000000Z' }
    )).toBe(false)
  })

  it('is false when status_at changes', () => {
    expect(areListedOrdersEqual(
      { ...listedOrder, status_at: '2026-08-26T16:00:00.000000Z' },
      { ...listedOrder, status_at: '2026-08-26T16:01:00.000000Z' }
    )).toBe(false)
  })

  it('is false when business name changes', () => {
    expect(areListedOrdersEqual(
      listedOrder,
      { ...listedOrder, business: { ...listedOrder.business, name: 'Store B' } }
    )).toBe(false)
  })

  it('is false when delivery_position changes', () => {
    expect(areListedOrdersEqual(
      listedOrder,
      { ...listedOrder, delivery_position: 5 }
    )).toBe(false)
  })
})

describe('areListedOrdersEqual: what the card writes of the stops', () => {
  it.each([
    ['the store\'s address', { business: { name: 'Store', address: 'B' } }],
    ['the customer\'s address', { customer: { name: 'Jane', address: 'C' } }],
    ['the customer\'s name', { customer: { name: 'Ana', address: 'A' } }],
    ['the customer\'s last name', { customer: { name: 'Jane', lastname: 'Roe', address: 'A' } }]
  ])('is false when %s changes', (_what, change) => {
    const before = { ...listedOrder, business: { name: 'Store', address: 'A' }, customer: { name: 'Jane', lastname: 'Doe', address: 'A' } }
    expect(areListedOrdersEqual(before, { ...before, ...change })).toBe(false)
  })

  it('is true when the stops are the same', () => {
    const stops = { business: { name: 'Store', address: 'A' }, customer: { name: 'Jane', address: 'A' } }
    expect(areListedOrdersEqual({ ...listedOrder, ...stops }, { ...listedOrder, business: { ...stops.business }, customer: { ...stops.customer } })).toBe(true)
  })
})

describe('areListedOrderRowPropsEqual', () => {
  const baseProps = {
    order: listedOrder,
    _order: { id: 501, order: listedOrder },
    currentTabSelected: 'inProgress',
    loadingChangeOrder: false,
    activeOrdersCount: 4
  }

  it('does not JSON.stringify order objects', () => {
    const spy = jest.spyOn(JSON, 'stringify')
    areListedOrderRowPropsEqual(baseProps, {
      ...baseProps,
      order: { ...listedOrder, products: [{ id: 2 }] }
    })
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it('is true when only nested products differ', () => {
    expect(areListedOrderRowPropsEqual(baseProps, {
      ...baseProps,
      order: { ...listedOrder, products: [{ id: 2 }] },
      _order: { id: 501, order: { ...listedOrder, products: [{ id: 2 }] } }
    })).toBe(true)
  })

  it('is false when the tab changes', () => {
    expect(areListedOrderRowPropsEqual(baseProps, {
      ...baseProps,
      currentTabSelected: 'pending'
    })).toBe(false)
  })

  it('is false when loadingChangeOrder changes on an assign request (its buttons turn off with it)', () => {
    expect(areListedOrderRowPropsEqual({ ...baseProps, isLogisticOrder: true }, {
      ...baseProps,
      isLogisticOrder: true,
      loadingChangeOrder: true
    })).toBe(false)
  })

  it('is true when loadingChangeOrder changes on an order of the list: its card is busy with its own change, not with that flag', () => {
    expect(areListedOrderRowPropsEqual(baseProps, {
      ...baseProps,
      loadingChangeOrder: true
    })).toBe(true)
  })

  it('compares the driver\'s position by value: a new read of the same place redraws nothing, a new place redraws', () => {
    const at = { latitude: 40.7, longitude: -74 }
    expect(areListedOrderRowPropsEqual({ ...baseProps, driverPosition: at }, { ...baseProps, driverPosition: { ...at, timestamp: 2 } })).toBe(true)
    expect(areListedOrderRowPropsEqual({ ...baseProps, driverPosition: at }, { ...baseProps, driverPosition: { ...at, latitude: 40.8 } })).toBe(false)
    expect(areListedOrderRowPropsEqual({ ...baseProps, driverPosition: null }, { ...baseProps, driverPosition: at })).toBe(false)
  })

  it('is false when activeOrdersCount changes', () => {
    expect(areListedOrderRowPropsEqual(baseProps, {
      ...baseProps,
      activeOrdersCount: 8
    })).toBe(false)
  })

  describe('what is not an order field', () => {
    const handlers = { handlePressOrder: () => {}, handleClickLogisticOrder: () => {}, getOrderStatus: () => 'a' }

    it('is true while the row has the same handlers (the list gives it stable ones)', () => {
      expect(areListedOrderRowPropsEqual({ ...baseProps, ...handlers }, { ...baseProps, ...handlers })).toBe(true)
    })

    it.each(Object.keys(handlers))('is false when %s is another function: the row never keeps the closure of an old render', (name) => {
      expect(areListedOrderRowPropsEqual({ ...baseProps, ...handlers }, { ...baseProps, ...handlers, [name]: () => {} })).toBe(false)
    })

    it.each(['isLogisticOrder', 'hideBtns', 'inGroup'])('is false when %s changes: the row is another kind of row', (name) => {
      expect(areListedOrderRowPropsEqual({ ...baseProps, [name]: false }, { ...baseProps, [name]: true })).toBe(false)
    })

    it('reads a missing flag as off', () => {
      expect(areListedOrderRowPropsEqual({ ...baseProps, hideBtns: undefined }, { ...baseProps, hideBtns: false })).toBe(true)
    })
  })
})
