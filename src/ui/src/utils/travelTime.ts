/**
 * The driver map's travel time: the straight-line distance to the destination over the
 * speed the device reports, in minutes. It is an estimate from two numbers a device can get
 * wrong, so it is shown only when both are believable.
 */

/**
 * Meters per second under which the driver counts as standing (about 1.8 km/h, below a
 * walk). A GPS at rest reports 0, -1 (unknown, iOS), nothing, or noise: an emulator once
 * sent about 1.6e-11 m/s, and 715 km over that is "12523548717494 h 47 min".
 */
export const MIN_MOVING_SPEED = 0.5

/**
 * Meters per second over which a speed is a broken reading, not a driver: 100 (360 km/h).
 * Epoch milliseconds or Infinity in the speed would estimate "0 min" for any distance.
 */
export const MAX_MOVING_SPEED = 100

/**
 * The longest travel time shown: a day. An order's trip is never a day long, so an estimate
 * past it comes from a bad position or a walking speed over a long straight line, not from a
 * route. (At 0.5 m/s the bound is 43 km; at 25 m/s, 90 km/h, it is 2160 km.)
 */
export const MAX_TRAVEL_MINUTES = 24 * 60

const METERS_PER_MINUTE_AT_ONE_MPS = 60

/**
 * The travel time to show after a new position, in minutes, or null for none.
 *
 * - A distance that is not a number, or negative, has no time (null).
 * - A speed that is missing, NaN or under `MIN_MOVING_SPEED` (a driver who is standing, or a
 *   device that does not know its speed) keeps the `previous` estimate: nothing new is known.
 *   It is null while there was none, never "0 min". A speed over `MAX_MOVING_SPEED` is a broken
 *   reading: no time.
 * - An estimate that is not finite or past `MAX_TRAVEL_MINUTES` has no time (null).
 */
export const nextTravelMinutes = (
  previous: number | null,
  distanceMeters: number,
  speedMetersPerSecond: number | null | undefined
): number | null => {
  if (typeof distanceMeters !== 'number' || !Number.isFinite(distanceMeters) || distanceMeters < 0) return null
  if (
    typeof speedMetersPerSecond !== 'number' ||
    Number.isNaN(speedMetersPerSecond) ||
    speedMetersPerSecond < MIN_MOVING_SPEED
  ) {
    return previous
  }
  if (speedMetersPerSecond > MAX_MOVING_SPEED) return null
  const minutes = distanceMeters / speedMetersPerSecond / METERS_PER_MINUTE_AT_ONE_MPS
  return Number.isFinite(minutes) && minutes >= 0 && minutes <= MAX_TRAVEL_MINUTES ? minutes : null
}

/**
 * True when a position is a fix: finite numbers that are not both 0 (the value the location
 * hook starts with, and what a missing coordinate becomes). Nobody delivers at 0, 0.
 */
export const isPositionFix = (position?: { latitude?: unknown, longitude?: unknown } | null): boolean => {
  const latitude = Number(position?.latitude)
  const longitude = Number(position?.longitude)
  return Number.isFinite(latitude) && Number.isFinite(longitude) && !(latitude === 0 && longitude === 0)
}
