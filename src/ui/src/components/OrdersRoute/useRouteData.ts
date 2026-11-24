import { useCallback, useMemo } from 'react'
import { useFocusEffect } from '@react-navigation/native'

import { isPositionFix } from '../../utils'
import { useLocation } from '../../hooks/useLocation'
import { routeKilometers, routeLegs, type LatLng } from './routeGeometry'
import { buildRouteStops, locatedStops } from './routeStops'
import { useRouteSource } from './routeSource'

/**
 * What the route's screens work from: the stops of the orders the Orders tab shows (`useRouteSource`, `buildRouteStops`), the driver's
 * live position from the app's own location source (`useLocation`, followed while the screen is in front, as the Map tab does) and the
 * legs between them (`routeLegs`: straight lines now, a routing service's later). Without a position (no permission, no fix yet) the
 * driver is null: no leg leaves the driver, no distance from him is written and the links leave their origin out.
 */
export const useRouteData = () => {
  const { rows } = useRouteSource()
  const stops = useMemo(() => buildRouteStops(rows), [rows])
  const located = useMemo(() => locatedStops(stops), [stops])

  const { userLocation, followUserLocation, stopFollowUserLocation, getCurrentLocation } = useLocation()
  useFocusEffect(useCallback(() => {
    followUserLocation()
    return () => stopFollowUserLocation()
  }, [])) // eslint-disable-line react-hooks/exhaustive-deps

  const latitude = Number(userLocation?.latitude)
  const longitude = Number(userLocation?.longitude)
  const hasFix = isPositionFix(userLocation)
  const driver = useMemo<LatLng | null>(() => (hasFix ? { latitude, longitude } : null), [hasFix, latitude, longitude])

  const legs = useMemo(() => routeLegs(driver, located), [driver, located])
  const kilometers = useMemo(() => routeKilometers(legs), [legs])
  /** How many orders the route is about (a store's stop holds several, an order has two stops). */
  const orderCount = useMemo(() => new Set(stops.flatMap((stop) => stop.orders.map((order) => String(order.id)))).size, [stops])

  return { stops, located, driver, legs, kilometers, orderCount, getCurrentLocation }
}
