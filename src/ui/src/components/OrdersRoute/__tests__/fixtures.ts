/** Orders as the Orders tab's list holds them, for the route's tests (fake places and people). */

export const store = (id: number, name: string, lat: number, lng: number, address = `${name} street`) => ({
  id,
  name,
  address,
  location: { lat, lng }
})

export const STORE_A = store(7, 'Luna Pizza', 40.7128, -74.006, '214 Harbor St')
export const STORE_B = store(8, 'Corner Deli', 40.73, -74.02, '58 Mill Ave')

/**
 * A delivery in progress. Status 8 (accepted, on the way to the store) has its pick-up still to make; 9 (picked up) has only its
 * customer left. `extra` overrides anything.
 */
export const order = (id: number, extra: Record<string, any> = {}) => ({
  id,
  status: 8,
  delivery_type: 1,
  business_id: 7,
  business: STORE_A,
  customer: { name: 'Ana', lastname: 'Gil', address: `${id} Pine Ct`, location: { lat: 40.72 + id / 100000, lng: -74.01 } },
  delivery_position: null,
  delivery_datetime_utc: '2099-01-01 12:00:00',
  delivery_datetime: '2099-01-01 12:00:00',
  eta_time: 0,
  time_status: 'in_time',
  total: 24.5,
  summary: { total: 24.5 },
  paymethod: { gateway: 'cash', name: 'Cash' },
  payment_events: [],
  ...extra
})

/** The ids of a route's stops, in order: `pickup:store:7`, `delivery:1042`. */
export const ids = (stops: Array<{ id: string }>) => stops.map((stop) => stop.id)
