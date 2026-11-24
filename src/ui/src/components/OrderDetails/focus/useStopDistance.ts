import { calculateDistance, isPositionFix } from '../../../utils'
import { distanceText, storeToCustomerKilometers } from '../partyContact'
import { useConfig, useLanguage } from '@components'

/**
 * The distances the `focus` layout writes (and the orders list's card, the driver's distance alone), in the project's unit: from the driver to a stop, and from the
 * store to the customer. A distance from the driver needs a real position (never the 0, 0 the location
 * hook starts with); without one nothing is written, and no time is ever estimated from it.
 */
export const useStopDistance = (driverPosition?: { latitude?: number, longitude?: number } | null) => {
  const [, t] = useLanguage()
  const [{ configs }] = useConfig()
  const unit = configs?.distance_unit?.value

  /** "1.2 km", or null when the driver's position or the stop's location is not known: the distance alone, in the project's unit. */
  const distanceFromDriver = (location?: { lat: number, lng: number } | null): string | null =>
    location && isPositionFix(driverPosition)
      ? distanceText(calculateDistance(location, driverPosition as { latitude: number, longitude: number }), unit, t)
      : null

  /** "1.2 km from you", or null when the driver's position or the stop's location is not known. */
  const fromDriver = (location?: { lat: number, lng: number } | null): string | null => {
    const distance = distanceFromDriver(location)
    return distance === null ? null : t('DISTANCE_FROM_YOU', ':distance: from you').replace(':distance:', distance)
  }

  /** "3.4 km from the store": the customer's distance from the store, or null when either has no location. */
  const fromStore = (order: any): string | null => {
    const kilometers = storeToCustomerKilometers(order)
    return kilometers === null
      ? null
      : t('DISTANCE_FROM_THE_STORE', ':distance: from the store').replace(':distance:', distanceText(kilometers, unit, t))
  }

  return { fromDriver, distanceFromDriver, fromStore }
}
