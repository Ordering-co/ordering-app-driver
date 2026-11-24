import { isAtCustomerStatus, isAtStoreStatus, type StopStage } from '../orderStages'

/**
 * The blocks under the status row, each a piece of `FocusOrder`:
 * - `stop`: what the stage is about (the current stop's card, the route and its facts, or the two finished stops);
 * - `other`: the stop that is not the current one, a folded row ("Then deliver to" before the pickup,
 *   "Picked up at" after it);
 * - `payment`, `comment`, `products`;
 * - `completion`: what "Delivery complete" will ask for.
 * "More details" is always last and the status row always first: neither is in the table.
 */
export type FocusBlock = 'stop' | 'other' | 'payment' | 'comment' | 'products' | 'completion'

/** A moment of the order the screen is drawn for: the six mockups (`Main`, `ToStore`, `AtStore`, `ToCustomer`, `AtCustomer`, `Done`). */
export type FocusSituation = 'offered' | 'toStore' | 'atStore' | 'toCustomer' | 'atCustomer' | 'finished'

/**
 * The order of the blocks in each situation, as the approved mockup of that stage draws it, in one place. The
 * order's comment always sits right above the products (the mockups that draw one, the store's, put it there).
 * A block with nothing to show, or that the theme hides (`usePageSections('order_details')`: `business`,
 * `customer`, `bill`, `products`, `header`), is simply not drawn; the theme's own order of those sections does
 * not move these blocks (the stage orders them, as for the stops).
 *
 * `offered` has no `payment`: the route's facts card (the `stop` block) already says the total and the payment.
 */
export const FOCUS_BLOCK_ORDER: Record<FocusSituation, FocusBlock[]> = {
  // Main: the route and its facts, the products.
  offered: ['stop', 'comment', 'products'],
  // ToStore: the stop, "Then deliver to", the payment, the products.
  toStore: ['stop', 'other', 'payment', 'comment', 'products'],
  // AtStore: the stop, its comment, the products (open), "Then deliver to", the payment.
  atStore: ['stop', 'comment', 'products', 'other', 'payment'],
  // ToCustomer: the stop, the cash to collect, the products, "Picked up at" last.
  toCustomer: ['stop', 'payment', 'comment', 'products', 'other'],
  // AtCustomer: the stop, the cash (large), what completing asks for, the products.
  atCustomer: ['stop', 'payment', 'completion', 'comment', 'products', 'other'],
  // Done: the two finished stops, the payment, the products.
  finished: ['stop', 'payment', 'comment', 'products']
}

/** The situation of an order: its stop stage, and whether the driver is at the stop (the status the screen acts on). */
export const focusSituation = (stage: StopStage, effectiveStatus?: number | null): FocusSituation => {
  switch (stage) {
    case 'route': return 'offered'
    case 'finished': return 'finished'
    case 'pickup': return isAtStoreStatus(effectiveStatus) ? 'atStore' : 'toStore'
    default: return isAtCustomerStatus(effectiveStatus) ? 'atCustomer' : 'toCustomer'
  }
}
