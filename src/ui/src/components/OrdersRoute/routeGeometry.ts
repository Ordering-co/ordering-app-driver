import { calculateDistance } from '../../utils'

/**
 * What the route draws and writes about the way between two points, behind one small interface so a routing service (the
 * streets, with minutes) can replace the straight lines later without touching the screens: they read `RouteLeg`s and
 * nothing else. Phase 1 is `straightGeometry`: a leg is the straight line between its two points, its distance is the
 * great-circle one and it never knows how long it takes (`minutes` is null, so no time is written anywhere).
 */

/** A point on the map, as the map library and the app's location hook write it. */
export interface LatLng {
  latitude: number
  longitude: number
}

/** The way between two consecutive points of the route. */
export interface RouteLeg {
  /** The stop the leg arrives at (its number in the route). */
  toStop: number
  /** The stop it leaves, or null when it leaves the driver. */
  fromStop: number | null
  /** The points the line passes through: two for a straight line, many for a street route. */
  path: LatLng[]
  distanceKm: number
  /** How long the leg takes; null while the geometry does not know (straight lines never do). */
  minutes: number | null
}

/** What a geometry answers for one leg. */
export type LegGeometry = Pick<RouteLeg, 'path' | 'distanceKm' | 'minutes'>

export interface RouteGeometry {
  leg: (from: LatLng, to: LatLng) => LegGeometry
}

/** The great-circle distance between two points, in kilometers (the formula the order card's distance uses). */
export const kilometersBetween = (from: LatLng, to: LatLng): number =>
  calculateDistance({ lat: from.latitude, lng: from.longitude }, to)

/** Phase 1: the straight line between the two points. */
export const straightGeometry: RouteGeometry = {
  leg: (from, to) => ({ path: [from, to], distanceKm: kilometersBetween(from, to), minutes: null })
}

interface LocatedStop {
  number: number
  location: LatLng | null
}

/**
 * The legs of the route, in order: the driver to the first stop that has a location (when the driver's position is known), then each
 * located stop to the next one. A stop with no location is not on the map and not in a leg.
 */
export const routeLegs = (
  driver: LatLng | null,
  stops: LocatedStop[],
  geometry: RouteGeometry = straightGeometry
): RouteLeg[] => {
  const legs: RouteLeg[] = []
  let from: { point: LatLng, stop: number | null } | null = driver ? { point: driver, stop: null } : null
  for (const stop of stops) {
    if (!stop.location) continue
    if (from) legs.push({ ...geometry.leg(from.point, stop.location), fromStop: from.stop, toStop: stop.number })
    from = { point: stop.location, stop: stop.number }
  }
  return legs
}

/** The whole route's length, in kilometers. */
export const routeKilometers = (legs: RouteLeg[]): number => legs.reduce((total, leg) => total + leg.distanceKm, 0)
