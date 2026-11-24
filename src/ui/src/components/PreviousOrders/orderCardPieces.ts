import { getShowDeliveryPrioritySelection } from '../../utils'

/** The tabs whose cards show the order's remaining time. */
const TIMER_TABS = ['pending', 'inProgress', 'active']
/**
 * The tabs that hold orders the driver has not accepted, which have no delivery position yet: Assigned (`pending`) and a combined
 * project's one tab (`active`, offered and in progress together). Whether their cards draw the position's setter is the tab's and the
 * project's (it orders by position), never the quick actions' or any other setting of the card.
 */
const SETTER_TABS = ['pending', 'active']
/** The tabs of orders that are over: their cards write the clock time the order ended or was due, and cannot be re-ordered by delivery position. */
export const CLOSED_TABS = ['completed', 'cancelled']

/**
 * Which optional pieces an order card draws, by the tab it is in and the project's configs: the
 * time at the header's end (the remaining time of the tabs of open orders, on the enterprise plan; the
 * clock time of the tabs of orders that are over) and the delivery position chip. The card (`OrderItem`)
 * and the skeleton that stands for it (`OrderListItemSkeleton`) both ask here, so a skeleton never draws a
 * piece the card does not. An assign request (`isLogistic`) has none of them.
 */
export const orderCardPieces = (tab: string, configs: any, isLogistic = false) => ({
  /** The order's remaining (or overdue) time: open orders, on the enterprise plan. */
  timer: !isLogistic && TIMER_TABS.includes(tab) && !!configs?.plan_enterprise?.value,
  /** The clock time an order that is over ended or was due, over its day. */
  closedTime: !isLogistic && CLOSED_TABS.includes(tab),
  position: !isLogistic && getShowDeliveryPrioritySelection(configs) && !CLOSED_TABS.includes(tab),
  /**
   * The position's setter (a chip, taller than a badge) beside the type: an order the driver has not accepted has no delivery position
   * yet (the accept sheet sets it), so the cards of the tabs that hold such orders (Assigned, and a combined project's Active, where
   * the offered orders are mixed with the ones in progress) draw it and the others, which have one, draw "Delivery #N". The card
   * decides by its own order; this is what its skeleton stands for, and it cannot know per card (in Active the offered cards are
   * the taller ones, and a card with a position is about 12 shorter than the skeleton).
   */
  setter: !isLogistic && getShowDeliveryPrioritySelection(configs) && SETTER_TABS.includes(tab),
})
