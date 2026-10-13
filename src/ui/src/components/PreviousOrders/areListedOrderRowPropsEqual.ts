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
  'delivery_position'
] as const

export function areListedOrdersEqual (prev?: any, next?: any) {
  if (prev === next) return true
  if (!prev || !next) return prev === next

  for (const field of LISTED_ORDER_FIELDS) {
    if (prev[field] !== next[field]) return false
  }

  if (prev.business?.name !== next.business?.name) return false
  if (prev.business?.logo !== next.business?.logo) return false
  if (prev.order_group?.orders?.length !== next.order_group?.orders?.length) return false

  return true
}

export function areListedOrderRowPropsEqual (prevProps: any, nextProps: any) {
  return (
    prevProps.currentTabSelected === nextProps.currentTabSelected &&
    prevProps.currentOrdenSelected === nextProps.currentOrdenSelected &&
    prevProps.loadingChangeOrder === nextProps.loadingChangeOrder &&
    prevProps.activeOrdersCount === nextProps.activeOrdersCount &&
    areListedOrdersEqual(prevProps.order, nextProps.order) &&
    areListedOrdersEqual(prevProps._order, nextProps._order)
  )
}
