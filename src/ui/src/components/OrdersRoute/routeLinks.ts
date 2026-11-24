import type { LatLng } from './routeGeometry'

/**
 * The links that send the route to a maps app, built from coordinates only: never an order's, a customer's or a store's data (no
 * address, no name, no number) in a URL. They are the apps' universal https links: they open the app when it is installed and the
 * browser otherwise, so opening one needs nothing declared to the system (what the sheet offers is decided by `useMapsApps`).
 *
 * - Google Maps takes the whole route (`maps/dir`, driving): the origin is the driver's position (left out without one: Google then
 *   starts from where the phone is), the stops between as waypoints in order and the last stop as the destination. Google takes at most
 *   9 waypoints, so a longer route sends its first 10 stops (`ROUTE_LINK_STOP_LIMIT`): the 9 first are waypoints and the 10th is the
 *   destination.
 * - Every app takes one destination at a time (Waze only ever does): the next stop. A number is digits, a dot, a minus and the comma
 *   between the two, which a query carries as they are; Google's are encoded, as its documentation asks.
 */

/** The stops one link carries: 9 waypoints and the destination (the limit of Google's documented URL). */
export const ROUTE_LINK_STOP_LIMIT = 10

/** A coordinate written for a URL: at most 6 decimals (about 10 cm), never an exponent. */
const coordinate = (value: number): string => String(Number(value.toFixed(6)))

/** "40.7128,-74.006". */
const pair = (point: LatLng): string => `${coordinate(point.latitude)},${coordinate(point.longitude)}`

/** The stops a Google Maps link of this route carries, and whether the route had more than the limit. */
export const googleRouteStops = <T>(stops: T[]): { sent: T[], capped: boolean } => ({
  sent: stops.slice(0, ROUTE_LINK_STOP_LIMIT),
  capped: stops.length > ROUTE_LINK_STOP_LIMIT
})

/**
 * Google Maps' whole route, with the documented parameters (`api=1`): `origin` (the driver, when known), `destination` (the last stop
 * sent), `waypoints` (the ones between, separated by "|"; none for a route of one stop) and `travelmode=driving`. Every value is
 * URL-encoded. Without a stop there is no route: null.
 */
export const googleRouteUrl = (driver: LatLng | null, stops: LatLng[]): string | null => {
  const { sent } = googleRouteStops(stops)
  if (!sent.length) return null
  const destination = sent[sent.length - 1]
  const waypoints = sent.slice(0, -1)
  const parts = [
    'api=1',
    ...(driver ? [`origin=${encodeURIComponent(pair(driver))}`] : []),
    `destination=${encodeURIComponent(pair(destination))}`,
    ...(waypoints.length ? [`waypoints=${encodeURIComponent(waypoints.map(pair).join('|'))}`] : []),
    'travelmode=driving'
  ]
  return `https://www.google.com/maps/dir/?${parts.join('&')}`
}

/** Google Maps to one destination, from where the phone is. */
export const googleStopUrl = (stop: LatLng): string =>
  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(pair(stop))}&travelmode=driving`

/** Waze to one destination, started at once. */
export const wazeStopUrl = (stop: LatLng): string =>
  `https://waze.com/ul?ll=${pair(stop)}&navigate=yes`

/** Apple Maps to one destination, driving, from where the phone is. */
export const appleStopUrl = (stop: LatLng): string =>
  `https://maps.apple.com/?daddr=${pair(stop)}&dirflg=d`
