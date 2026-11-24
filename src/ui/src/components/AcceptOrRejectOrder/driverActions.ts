/**
 * What the accept / reject view needs to know of the driver app: the request each action sends, the title and the
 * button it carries, and the app it speaks for. The route's page and every screen that presents the view in place
 * (`useAcceptSheet`) give it the same ones.
 */
export const DRIVER_ACTIONS = {
  accept: 'acceptByDriver',
  reject: 'rejectByDriver',
  pickupFailed: 'pickupFailedByDriver',
  deliveryFailed: 'deliveryFailedByDriver',
  notReady: 'orderNotReady',
  forcePickUp: 'forcePickUp',
  forceDelivery: 'forceDelivery',
  forceStatus: 'forceStatus'
}

/**
 * The title and the button of each action, as `t(key, text)` and `t(btnKey, btnText)` read them. The i18n scan only sees
 * a `t` call written with its key and its text in place, so the keys here are in no check of the scan:
 * `catalog.test.ts` holds each one to the catalog (the key is there, in every locale, and its English is the
 * text written here).
 */
export const DRIVER_ORDER_TITLES = {
  accept: { key: 'DELIVERY_TIME', text: 'Delivery time', btnKey: 'ACCEPT', btnText: 'Accept' },
  reject: { key: 'REJECT_ORDER', text: 'Reject order', btnKey: 'REJECT', btnText: 'Reject' },
  pickupFailed: { key: 'PICKUP_FAILED', text: 'Pickup failed', btnKey: 'PICKUP_FAILED', btnText: 'Pickup failed' },
  deliveryFailed: { key: 'DELIVERY_FAILED', text: 'Delivery failed', btnKey: 'DELIVERY_FAILED', btnText: 'Delivery failed' },
  notReady: { key: 'ORDER_NOT_READY', text: 'Order not ready', btnKey: 'ORDER_NOT_READY', btnText: 'Order not ready' },
  forcePickUp: { key: 'FORCED_MARK_ORDER_AS_PICKUP', text: 'Mark the order as picked up', btnKey: 'MOBILE_PICKUP_COMPLETE', btnText: 'Pickup complete' },
  forceDelivery: { key: 'FORCED_MARK_ORDER_AS_DELIVERY', text: 'Mark the order as delivered', btnKey: 'MOBILE_DELIVERY_COMPLETE', btnText: 'Delivery complete' },
  forceStatus: { key: 'REASON_REQUIRED', text: 'Reason required', btnKey: 'CONFIRM', btnText: 'Confirm' },
  arrivedToBusiness: { key: 'ARRIVED_TO_BUSINESS', text: 'Arrived to business', btnKey: 'ARRIVED_TO_BUSINESS', btnText: 'Arrived to business' },
  pickupComplete: { key: 'PICKUP_COMPLETE', text: 'Pickup complete', btnKey: 'PICKUP_COMPLETE', btnText: 'Pickup complete' },
  deliveryComplete: { key: 'DELIVERY_COMPLETE', text: 'Delivery complete', btnKey: 'DELIVERY_COMPLETE', btnText: 'Delivery complete' }
}

export const DRIVER_APP_TITLE = { key: 'DELIVERY_APP', text: 'Delivery app' }
