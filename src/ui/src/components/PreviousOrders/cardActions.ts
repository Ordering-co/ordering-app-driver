import { DELIVERY_TYPES, isOfferedStatus, isOnTheWayToStoreStatus } from '../OrderDetails/orderStages'

/**
 * The quick actions of an order's card: one per step of the delivery, the next one (the positive action) and, where the step
 * has a negative one, that one. "Order not ready" and every other action of the order's bar stay in the order's details.
 */
export type CardActionKey =
  | 'accept'
  | 'reject'
  | 'arrivedToBusiness'
  | 'pickupComplete'
  | 'pickupFailed'
  | 'arrivedToCustomer'
  | 'deliveryComplete'
  | 'deliveryFailed'

export interface CardActions {
  /** The negative action: a third of the row, outlined. */
  decline?: CardActionKey
  /** The positive action: two thirds of the row, or all of it when there is no negative one. */
  advance?: CardActionKey
}

/** The status each direct step sets: the ones that fire in one request (accept, rejects and failures open a view). */
export const STATUS_OF_STEP: Partial<Record<CardActionKey, number>> = {
  arrivedToBusiness: 3,
  pickupComplete: 9,
  arrivedToCustomer: 26,
  deliveryComplete: 11
}

/** The accept / reject view each action opens, when it is not a direct step (`AcceptOrRejectOrder`'s `action`). */
export const VIEW_OF_ACTION: Partial<Record<CardActionKey, string>> = {
  accept: 'accept',
  reject: 'reject',
  arrivedToBusiness: 'arrivedToBusiness',
  pickupComplete: 'pickupComplete',
  pickupFailed: 'pickupFailed',
  deliveryComplete: 'deliveryComplete',
  deliveryFailed: 'deliveryFailed'
}

/** The statuses of the way to the customer and of the customer's door: picked up, almost there, on the way, there. */
const ON_THE_WAY_TO_CUSTOMER = [9, 19, 23]
const DELIVERY_STATUSES = [...ON_THE_WAY_TO_CUSTOMER, 26]

interface Params {
  order: any
  /** The status the driver acts on (`useDriverOrderStage`'s). */
  effectiveStatus: number
  /** The driver is in the pickup phase of an order the business marked ready. */
  isPickupPhase: boolean
  configs: any
  /** The project's name (`useApi`'s): two projects keep a rule of their own for the delivery's last step. */
  project?: string
}

/**
 * Which buttons the card offers an order, by where the order is in the driver's trip. It reads the conditions of the order's
 * bottom bar (`OrderDetails/Delivery.tsx`: the stage, the project's configs and the order's type), so the card and the bar offer the
 * same step in the same stage: offered, Reject / Accept; on the way to the store, Arrived to business; at the store, Pickup failed /
 * Pickup complete; on the way to the customer, Arrived to customer; with the customer, Delivery failed / Delivery complete.
 *
 * What an order that is over, or one that is not the driver's turn, has is nothing.
 */
export const cardActionsFor = ({ order, effectiveStatus, isPickupPhase, configs, project }: Params): CardActions => {
  const hidesReject = !!configs?.reject_orders_enabled && configs?.reject_orders_enabled?.value !== '1'
  const failedPickupEnabled = configs?.failed_pickup_by_driver_enabled?.value === '1'
  const isDelosi = ['delosi', 'delosipruebas'].includes(String(project))
  const isDelivery = DELIVERY_TYPES.includes(order?.delivery_type)

  // An order offered to the driver.
  if (isOfferedStatus(effectiveStatus)) return { decline: hidesReject ? undefined : 'reject', advance: 'accept' }

  // The way to the store: for a delivery the next step is the arrival. The bar offers the pickup outcomes beside it, the card only
  // the next step. (An order that is not a delivery has no arrival: it is at the store's step.)
  if (isOnTheWayToStoreStatus(effectiveStatus) && isDelivery) return { advance: 'arrivedToBusiness' }

  // At the store: the pickup outcomes. On the way to it the bar offers them only when reject is allowed (`showFloatButtonsPickUp`).
  const atStore = effectiveStatus === 3 || (isOnTheWayToStoreStatus(effectiveStatus) && !hidesReject) || isPickupPhase
  if (atStore) {
    return { decline: !hidesReject && failedPickupEnabled ? 'pickupFailed' : undefined, advance: 'pickupComplete' }
  }

  // The way to the customer and the customer's door.
  if (DELIVERY_STATUSES.includes(effectiveStatus) && !(isDelosi && effectiveStatus !== 26 && hidesReject)) {
    if (isDelivery && ON_THE_WAY_TO_CUSTOMER.includes(effectiveStatus)) return { advance: 'arrivedToCustomer' }
    return {
      decline: hidesReject ? undefined : 'deliveryFailed',
      // The project's delivery completes only at the door.
      advance: isDelosi && order?.status !== 26 ? undefined : 'deliveryComplete'
    }
  }

  return {}
}
