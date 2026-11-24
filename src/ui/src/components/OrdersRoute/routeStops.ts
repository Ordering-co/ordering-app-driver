import { driverOrderStage } from '../../hooks/useDriverOrderStage'
import { flatOrders } from '../../context/OfflineActions/offlineActionsQueue'
import { DELIVERY_TYPES, isOfferedStatus, stopStage } from '../OrderDetails/orderStages'
import type { LatLng } from './routeGeometry'

/**
 * The stops of the driver's route, worked out from the orders in progress. Pure: no React, no clock, no theme, so the rule is
 * tested on its own and the list's entry, the map and the list of stops cannot disagree about it.
 *
 * - **The orders** are the ones the Orders tab shows as In Progress (or, in a project that combines the tabs, the accepted ones of
 *   Active): the app's own stage of each (`driverOrderStage`, so the offline queue's status, which the list shows, is the one
 *   read), never an order that is still offered, a pending one or one that is over.
 * - **The order of the route**: the orders by `delivery_position` ascending, the ones without a position after them, by delivery
 *   time (then by number, so the route does not move between two renders). Walking them in that order, a store's stop is added
 *   the first time a store with a pick-up still to make appears, one stop for ALL that store's orders not picked up yet; then the
 *   order's customer stop. An order already picked up has only its customer stop. The customer of an order that is not a delivery is
 *   never a stop (the details' own rule, `stopStage`).
 * - **A stop whose coordinates are missing or invalid** stays in the route, with no location: the list says so and nothing draws or
 *   measures a wrong point.
 */

export type StopKind = 'pickup' | 'delivery'

export interface RouteStop {
  /** `pickup:<store>` or `delivery:<order>`: stable while the stop lives. */
  id: string
  /** Its place in the route, from 1. */
  number: number
  kind: StopKind
  /** The orders it is for: the orders of the store still to pick up, or the one order to deliver. */
  orders: any[]
  /** The store's name (a pick-up) or the customer's (a delivery); an empty text when the order has none. */
  name: string
  address: string
  /** Where it is; null when the order carries no usable coordinates. */
  location: LatLng | null
}

/** The statuses of a project's pending list (the offered and pre-ordered ones): the combined Active tab holds them, the route does not. */
const PENDING_STATUSES = [0, 13]

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')

/**
 * The coordinates of a party of an order as a point of the map, or null when they are not usable: missing, not numbers (the API
 * may send them as text), out of the globe, or 0, 0 (nobody delivers there: what a missing coordinate becomes).
 */
export const parseCoordinates = (location?: { lat?: unknown, lng?: unknown } | null): LatLng | null => {
  if (!location || location.lat === null || location.lat === undefined || location.lat === '' || location.lng === null || location.lng === undefined || location.lng === '') return null
  const latitude = Number(location.lat)
  const longitude = Number(location.lng)
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null
  if (latitude === 0 && longitude === 0) return null
  return { latitude, longitude }
}

/** The stage of an order for the route: where its driver goes next, or none when it has no stop to make (offered, pending, over). */
export const routeStageOf = (order: any): 'pickup' | 'delivery' | null => {
  const { effectiveStatus } = driverOrderStage(order)
  if (isOfferedStatus(effectiveStatus) || PENDING_STATUSES.includes(Number(order?.status))) return null
  const stage = stopStage(order, effectiveStatus)
  if (stage === 'finished') return null
  return stage === 'delivery' ? 'delivery' : 'pickup'
}

/** Whether an order is one the route is about. */
export const isRouteOrder = (order: any): boolean => routeStageOf(order) !== null

/** The delivery position the driver chose, or null when the order has none. */
const positionOf = (order: any): number | null => {
  const raw = order?.delivery_position
  if (raw === null || raw === undefined || raw === '') return null
  const position = Number(raw)
  return Number.isFinite(position) ? position : null
}

/** The delivery time as a text that sorts by time (`YYYY-MM-DD HH:mm:ss`); empty when the order has none. */
const deliveryKey = (order: any): string => {
  const written = order?.delivery_datetime_utc || order?.delivery_datetime
  return typeof written === 'string' ? written.replace('T', ' ').slice(0, 19) : ''
}

const byId = (a: any, b: any): number => {
  const first = Number(a?.id)
  const second = Number(b?.id)
  return Number.isFinite(first) && Number.isFinite(second) ? first - second : String(a?.id).localeCompare(String(b?.id))
}

/**
 * The orders in the order of the route: by delivery position ascending; the ones with no position after them, by delivery time; ties
 * by order number. (An order with no delivery time goes last among its kind.)
 */
export const sortRouteOrders = (orders: any[]): any[] =>
  [...orders].sort((a, b) => {
    const first = positionOf(a)
    const second = positionOf(b)
    if (first !== null && second !== null && first !== second) return first - second
    if (first !== null && second === null) return -1
    if (first === null && second !== null) return 1
    const early = deliveryKey(a)
    const late = deliveryKey(b)
    if (early !== late) return !early ? 1 : !late ? -1 : early < late ? -1 : 1
    return byId(a, b)
  })

/** What makes two orders the same store: its id, else its place; nothing to join them by otherwise (the order stands alone). */
const storeKey = (order: any): string => {
  const id = order?.business_id ?? order?.business?.id
  if (id !== null && id !== undefined && id !== '') return `store:${id}`
  const place = parseCoordinates(order?.business?.location)
  return place ? `place:${place.latitude},${place.longitude}` : `order:${order?.id}`
}

/** The route's stops for these orders (any list the Orders tab holds: the ones with no stop to make are left out). */
export const buildRouteStops = (rows: unknown): RouteStop[] => {
  const orders = sortRouteOrders(flatOrders(rows).filter(isRouteOrder))
  const stops: RouteStop[] = []
  const stored = new Set<string>()

  const push = (stop: Omit<RouteStop, 'number'>) => { stops.push({ ...stop, number: stops.length + 1 }) }

  for (const order of orders) {
    if (routeStageOf(order) === 'pickup') {
      const key = storeKey(order)
      if (!stored.has(key)) {
        stored.add(key)
        const business = order?.business
        push({
          id: `pickup:${key}`,
          kind: 'pickup',
          orders: orders.filter((other) => routeStageOf(other) === 'pickup' && storeKey(other) === key),
          name: text(business?.name),
          address: text(business?.address),
          location: parseCoordinates(business?.location)
        })
      }
      // The customer of an order that is not a delivery is never a stop.
      if (!DELIVERY_TYPES.includes(order?.delivery_type)) continue
    }
    const customer = order?.customer
    push({
      id: `delivery:${order?.id}`,
      kind: 'delivery',
      orders: [order],
      name: [customer?.name, customer?.middle_name, customer?.lastname, customer?.second_lastname].map(text).filter(Boolean).join(' '),
      address: text(customer?.address),
      location: parseCoordinates(customer?.location)
    })
  }
  return stops
}

/** The stops of the route that can be drawn and measured: the ones with a location. */
export const locatedStops = (stops: RouteStop[]): Array<RouteStop & { location: LatLng }> =>
  stops.filter((stop): stop is RouteStop & { location: LatLng } => stop.location !== null)
