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

describe('areListedOrderRowPropsEqual', () => {
  const baseProps = {
    order: listedOrder,
    _order: { id: 501, order: listedOrder },
    currentTabSelected: 'inProgress',
    currentOrdenSelected: 101,
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

  it('is false when the selected order id changes', () => {
    expect(areListedOrderRowPropsEqual(baseProps, {
      ...baseProps,
      currentOrdenSelected: 202
    })).toBe(false)
  })

  it('is false when the tab changes', () => {
    expect(areListedOrderRowPropsEqual(baseProps, {
      ...baseProps,
      currentTabSelected: 'pending'
    })).toBe(false)
  })

  it('is false when loadingChangeOrder changes', () => {
    expect(areListedOrderRowPropsEqual(baseProps, {
      ...baseProps,
      loadingChangeOrder: true
    })).toBe(false)
  })

  it('is false when activeOrdersCount changes', () => {
    expect(areListedOrderRowPropsEqual(baseProps, {
      ...baseProps,
      activeOrdersCount: 8
    })).toBe(false)
  })
})
