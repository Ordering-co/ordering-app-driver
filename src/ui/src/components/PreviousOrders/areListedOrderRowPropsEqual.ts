import { itemsCount } from './orderCardData'

/** The statuses the driver's own stage is read from (`useDriverOrderStage`). */
const DRIVER_STAGES = [3, 8, 9, 18, 19, 23, 26]

const LISTED_ORDER_FIELDS = [
  'id',
  'status',
  'locked',
  'unsync',
  'showNotification',
  'time_status',
  'delivery_type',
  'delivery_datetime',
  'delivery_datetime_utc',
  'eta_time',
  'external_id',
  'order_group_id',
  'updated_at',
  'status_at',
  'delivery_position',
  // What the card's actions and chips read: the driver's stage, the order's total and how it is paid.
  'last_driver_assigned_at',
  'total',
  'cash'
] as const

export function areListedOrdersEqual (prev?: any, next?: any) {
  if (prev === next) return true
  if (!prev || !next) return prev === next

  for (const field of LISTED_ORDER_FIELDS) {
    if (prev[field] !== next[field]) return false
  }

  if (prev.business?.name !== next.business?.name) return false
  if (prev.business?.logo !== next.business?.logo) return false
  // What the card writes of the stops: the store's address and the customer's name and address.
  if (prev.business?.address !== next.business?.address) return false
  if (prev.customer?.address !== next.customer?.address) return false
  for (const part of ['name', 'middle_name', 'lastname', 'second_lastname'] as const) {
    if (prev.customer?.[part] !== next.customer?.[part]) return false
  }
  if (prev.order_group?.orders?.length !== next.order_group?.orders?.length) return false
  // What the card writes of the stops' distance and of the order's money: the stops' places, the total, the way it is paid and how many
  // items it has. They are compared by value, not by identity: every load gives new objects and no row would stay.
  for (const place of ['lat', 'lng'] as const) {
    if (prev.business?.location?.[place] !== next.business?.location?.[place]) return false
    if (prev.customer?.location?.[place] !== next.customer?.location?.[place]) return false
  }
  if (prev.summary?.total !== next.summary?.total) return false
  if (prev.paymethod?.gateway !== next.paymethod?.gateway) return false
  if (prev.payment_events?.length !== next.payment_events?.length) return false
  if (itemsCount(prev) !== itemsCount(next)) return false
  // When the driver reached each stage, and the order's own last status: the stage the buttons follow.
  for (const status of [...DRIVER_STAGES, prev.status, next.status]) {
    if (prev.reporting_data?.at?.[`status:${status}`] !== next.reporting_data?.at?.[`status:${status}`]) return false
  }

  return true
}

/**
 * A row is redrawn when what it draws changed: its order (the listed fields), the tab, the pending change and the kind of row.
 * The handlers are compared by identity too: the list gives them stable (`useStableCallback`, they call the latest), so
 * they never cause a redraw, and one passed unstable would redraw the row instead of leaving it holding an old closure.
 */
export function areListedOrderRowPropsEqual (prevProps: any, nextProps: any) {
  return (
    prevProps.currentTabSelected === nextProps.currentTabSelected &&
    // The answer to an assign request turns its buttons off; an order's card is busy with its own change, not with the controller's flag.
    (!prevProps.isLogisticOrder || prevProps.loadingChangeOrder === nextProps.loadingChangeOrder) &&
    // By value: a read of the position gives a new object each time, and a row is drawn again only when the place changed.
    prevProps.driverPosition?.latitude === nextProps.driverPosition?.latitude &&
    prevProps.driverPosition?.longitude === nextProps.driverPosition?.longitude &&
    prevProps.handleChangeOrderStatus === nextProps.handleChangeOrderStatus &&
    prevProps.openAcceptSheet === nextProps.openAcceptSheet &&
    prevProps.onNavigationRedirect === nextProps.onNavigationRedirect &&
    prevProps.onOfflineTap === nextProps.onOfflineTap &&
    prevProps.activeOrdersCount === nextProps.activeOrdersCount &&
    !prevProps.isLogisticOrder === !nextProps.isLogisticOrder &&
    !prevProps.hideBtns === !nextProps.hideBtns &&
    !prevProps.inGroup === !nextProps.inGroup &&
    prevProps.handlePressOrder === nextProps.handlePressOrder &&
    prevProps.handleClickLogisticOrder === nextProps.handleClickLogisticOrder &&
    prevProps.getOrderStatus === nextProps.getOrderStatus &&
    areListedOrdersEqual(prevProps.order, nextProps.order) &&
    areListedOrdersEqual(prevProps._order, nextProps._order)
  )
}
