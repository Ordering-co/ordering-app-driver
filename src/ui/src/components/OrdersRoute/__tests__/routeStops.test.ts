import { buildRouteStops, isRouteOrder, locatedStops, parseCoordinates, routeStageOf, sortRouteOrders } from '../routeStops'
import { ids, order, store, STORE_A, STORE_B } from './fixtures'

describe('the route\'s stops (routeStops)', () => {
  describe('which orders the route is about', () => {
    it.each([
      ['accepted, on the way to the store', 8, 'pickup'],
      ['at the store', 3, 'pickup'],
      ['picked up', 9, 'delivery'],
      ['on the way to the customer', 23, 'delivery'],
      ['at the customer', 26, 'delivery']
    ])('%s (status %i) has its %s stop to make', (_name, status, stage) => {
      expect(routeStageOf(order(1, { status }))).toBe(stage)
      expect(isRouteOrder(order(1, { status }))).toBe(true)
    })

    it.each([
      ['an offered order', 0],
      ['a pre-order', 13],
      ['an order offered after the business marked it ready', 4],
      ['a completed order', 11],
      ['a rejected order', 5],
      ['a failed delivery', 12]
    ])('%s has none', (_name, status) => {
      expect(isRouteOrder(order(1, { status }))).toBe(false)
    })

    it('reads the stage the driver is in, not the status the business set (a ready order the driver already reached the store for)', () => {
      const ready = order(1, {
        status: 4,
        last_driver_assigned_at: '2099-01-01 10:00:00',
        reporting_data: { at: { 'status:8': '2099-01-01 10:05:00', 'status:9': '2099-01-01 10:20:00' } }
      })
      expect(routeStageOf(ready)).toBe('delivery')
    })
  })

  describe('the order of the route', () => {
    it('is the delivery position ascending', () => {
      const sorted = sortRouteOrders([order(1, { delivery_position: 3 }), order(2, { delivery_position: 1 }), order(3, { delivery_position: 2 })])
      expect(sorted.map((item) => item.id)).toEqual([2, 3, 1])
    })

    it('puts the orders with no position after the ones that have one, by delivery time, then by number', () => {
      const sorted = sortRouteOrders([
        order(10, { delivery_datetime_utc: '2099-01-01 12:30:00' }),
        order(11, { delivery_datetime_utc: '2099-01-01 12:10:00' }),
        order(12, { delivery_position: 5 }),
        order(14, { delivery_datetime_utc: '2099-01-01 12:10:00' }),
        order(13, { delivery_datetime_utc: null, delivery_datetime: null })
      ])
      expect(sorted.map((item) => item.id)).toEqual([12, 11, 14, 10, 13])
    })

    it('takes a position given as text, and reads nothing into an empty one', () => {
      const sorted = sortRouteOrders([order(1, { delivery_position: '2' }), order(2, { delivery_position: '' }), order(3, { delivery_position: 1 })])
      expect(sorted.map((item) => item.id)).toEqual([3, 1, 2])
    })
  })

  describe('worked example 1: positions, a store with two orders and an order already picked up', () => {
    // 1039 is picked up (position 1); 1042 and 1044 are at Luna Pizza, to be picked up (positions 2 and 3).
    const orders = [
      order(1044, { delivery_position: 3 }),
      order(1042, { delivery_position: 2 }),
      order(1039, { status: 9, delivery_position: 1, business_id: 8, business: STORE_B })
    ]

    it('walks them by position: the picked-up order\'s customer, then ONE stop for the store with both orders, then each customer', () => {
      const stops = buildRouteStops(orders)
      expect(ids(stops)).toEqual(['delivery:1039', 'pickup:store:7', 'delivery:1042', 'delivery:1044'])
      expect(stops.map((stop) => stop.number)).toEqual([1, 2, 3, 4])
      expect(stops[1].orders.map((item) => item.id)).toEqual([1042, 1044])
      expect(stops[1]).toEqual(expect.objectContaining({ kind: 'pickup', name: 'Luna Pizza', address: '214 Harbor St' }))
      expect(stops[2]).toEqual(expect.objectContaining({ kind: 'delivery', address: '1042 Pine Ct', name: 'Ana Gil' }))
    })

    it('does not add the store of an order that is already picked up', () => {
      expect(ids(buildRouteStops(orders)).filter((id) => id.startsWith('pickup'))).toEqual(['pickup:store:7'])
    })
  })

  describe('worked example 2: no positions, two stores', () => {
    // X is due last (store A), Y first (store B), Z has a position and goes before both.
    const orders = [
      order(30, { delivery_datetime_utc: '2099-01-01 12:30:00' }),
      order(31, { delivery_datetime_utc: '2099-01-01 12:10:00', business_id: 8, business: STORE_B }),
      order(32, { delivery_position: 1, business_id: 8, business: STORE_B })
    ]

    it('puts Z\'s trip first, then Y\'s (the earlier delivery time), then X\'s; Corner Deli is stopped at once for both of its orders', () => {
      const stops = buildRouteStops(orders)
      expect(ids(stops)).toEqual(['pickup:store:8', 'delivery:32', 'delivery:31', 'pickup:store:7', 'delivery:30'])
      expect(stops[0].orders.map((item) => item.id)).toEqual([32, 31])
    })
  })

  describe('what the list holds', () => {
    it('leaves out the orders with no stop to make and takes groups as the list draws them', () => {
      const grouped = [[['cart-1', [order(1, { cart_group_id: 'cart-1', delivery_position: 1 }), order(2, { cart_group_id: 'cart-1', delivery_position: 2 })]]], order(3, { status: 0 })]
      const stops = buildRouteStops(grouped)
      expect(ids(stops)).toEqual(['pickup:store:7', 'delivery:1', 'delivery:2'])
    })

    it('is empty with no orders, and with nothing but orders over or offered', () => {
      expect(buildRouteStops([])).toEqual([])
      expect(buildRouteStops(undefined)).toEqual([])
      expect(buildRouteStops([order(1, { status: 11 }), order(2, { status: 0 })])).toEqual([])
    })

    it('never makes a stop of the customer of an order that is not a delivery (a pick-up the customer collects)', () => {
      const stops = buildRouteStops([order(1, { delivery_type: 2 })])
      expect(ids(stops)).toEqual(['pickup:store:7'])
    })

    it('keeps two stores with no id apart by where they are, and an order with no store data on its own', () => {
      const a = order(1, { business_id: undefined, business: { name: 'A', location: { lat: 1, lng: 1 } }, delivery_position: 1 })
      const b = order(2, { business_id: undefined, business: { name: 'B', location: { lat: 2, lng: 2 } }, delivery_position: 2 })
      const c = order(3, { business_id: undefined, business: { name: 'C' }, delivery_position: 3 })
      const stops = buildRouteStops([a, b, c])
      expect(stops.filter((stop) => stop.kind === 'pickup').map((stop) => stop.name)).toEqual(['A', 'B', 'C'])
    })
  })

  describe('a stop with no usable location stays in the route, with none', () => {
    it('is in the list as a stop with a null location, and is left out of the located ones', () => {
      const stops = buildRouteStops([
        order(1, { delivery_position: 1, customer: { name: 'Ana', address: '9 Birch', location: null } }),
        order(2, { delivery_position: 2, status: 9, customer: { name: 'Bo', address: '5 Elm', location: { lat: '40.5', lng: '-73.9' } } })
      ])
      expect(ids(stops)).toEqual(['pickup:store:7', 'delivery:1', 'delivery:2'])
      expect(stops.map((stop) => stop.location)).toEqual([
        { latitude: STORE_A.location.lat, longitude: STORE_A.location.lng },
        null,
        { latitude: 40.5, longitude: -73.9 }
      ])
      expect(ids(locatedStops(stops))).toEqual(['pickup:store:7', 'delivery:2'])
    })

    it.each([
      ['no location', undefined],
      ['null', null],
      ['empty coordinates', { lat: '', lng: '' }],
      ['coordinates that are not numbers', { lat: 'north', lng: 'west' }],
      ['one missing', { lat: 40.7 }],
      ['null coordinates', { lat: null, lng: null }],
      ['0, 0 (what a missing coordinate becomes)', { lat: 0, lng: 0 }],
      ['a latitude off the globe', { lat: 91, lng: 10 }],
      ['a longitude off the globe', { lat: 10, lng: -181 }],
      ['infinity', { lat: Infinity, lng: 1 }]
    ])('%s is not a point', (_name, location: any) => {
      expect(parseCoordinates(location)).toBeNull()
    })

    it('reads numbers and numbers written as text, and a coordinate that is 0 on one axis only', () => {
      expect(parseCoordinates({ lat: 40.7128, lng: -74.006 })).toEqual({ latitude: 40.7128, longitude: -74.006 })
      expect(parseCoordinates({ lat: '40.7128', lng: '-74.006' })).toEqual({ latitude: 40.7128, longitude: -74.006 })
      expect(parseCoordinates({ lat: 0, lng: 12.5 })).toEqual({ latitude: 0, longitude: 12.5 })
    })
  })

  it('is the same stops for the same orders (nothing moves between two renders)', () => {
    const orders = [order(1, { delivery_position: 2 }), order(2, { delivery_position: 1 }), order(3)]
    expect(ids(buildRouteStops(orders))).toEqual(ids(buildRouteStops([...orders].reverse())))
    expect(store(1, 'x', 1, 2).location).toEqual({ lat: 1, lng: 2 })
  })
})
