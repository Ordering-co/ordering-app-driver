/**
 * Where an order is in the driver's trip, from the status the screen acts on
 * (`useDriverOrderStage`'s `effectiveStatus`): the one place of the order's
 * details that says which statuses are offered, which are the way to the store,
 * which the way to the customer and which are over. The bottom bar and the
 * `focus` layout read it, so the stop the screen shows and the buttons the bar
 * offers cannot disagree.
 */

/** The statuses for which the bottom bar offers accept and reject. */
export const OFFERED_STATUSES = [0, 4, 7, 14]

export const isOfferedStatus = (status?: number | null) => OFFERED_STATUSES.includes(Number(status))

/** The order types a driver delivers (delivery and catering delivery). */
export const DELIVERY_TYPES = [1, 7]

/** Accepted by the driver, driver almost at the store, driver at the store. */
const PICKUP_STATUSES = [3, 8, 18]

/** Picked up, driver almost with the customer, on the way, with the customer. */
const DELIVERY_STATUSES = [9, 19, 23, 26]

/** Completed, rejected, cancelled or failed (the states `orderStatusVariant` closes). */
export const FINISHED_STATUSES = [1, 2, 5, 6, 10, 11, 12, 15, 16, 17]

/** Completed by the business or by the driver: the order was handed to its customer. */
const DELIVERED_STATUSES = [1, 11]

export type StopStage = 'route' | 'pickup' | 'delivery' | 'finished'

/**
 * The stop the details are ordered around.
 * - `route`: not on its way yet (offered, pre-order…): the store and the customer, one after the other.
 * - `pickup`: the store is the stop, the way to it and at it. An order that is not a delivery stays here
 *   until it is over: its customer is never a stop.
 * - `delivery`: picked up, the customer is the stop.
 * - `finished`: no stop.
 */
export const stopStage = (order: any, effectiveStatus?: number | null): StopStage => {
  const status = Number(effectiveStatus)
  if (FINISHED_STATUSES.includes(status)) return 'finished'
  if (!DELIVERY_TYPES.includes(order?.delivery_type)) return 'pickup'
  if (PICKUP_STATUSES.includes(status)) return 'pickup'
  if (DELIVERY_STATUSES.includes(status)) return 'delivery'
  return 'route'
}

/** A delivery the driver completed: its two stops are done. */
export const isDeliveredOrder = (order: any) =>
  DELIVERY_TYPES.includes(order?.delivery_type) && DELIVERED_STATUSES.includes(Number(order?.status))

/** Accepted by the driver, driver almost at the store: the driver is still on the way to the store. */
const ON_THE_WAY_TO_STORE_STATUSES = [8, 18]

/**
 * "Arrived to business" is the driver's next step. It is read from the driver's stage (`useDriverOrderStage`'s
 * `effectiveStatus`), which for an order the business has marked ready is the latest status the driver reached
 * since the assignment (`reporting_data.at`): a driver who already arrived resolves to 3, not to 8 or 18, so the
 * step is not offered again however the business moves the order afterwards.
 */
export const isOnTheWayToStoreStatus = (status?: number | null) => ON_THE_WAY_TO_STORE_STATUSES.includes(Number(status))

/** The driver is at the store. */
export const isAtStoreStatus = (status?: number | null) => Number(status) === 3

/** The driver is with the customer. */
export const isAtCustomerStatus = (status?: number | null) => Number(status) === 26
