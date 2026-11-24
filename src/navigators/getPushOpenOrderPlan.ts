function hasPendingValue (value: unknown) {
  return value != null && value !== ''
}

function hasPendingPushOrder (orderId: unknown) {
  if (!orderId || typeof orderId !== 'object') return false
  const pending = orderId as { id?: unknown, assignId?: unknown, group_id?: unknown }
  return (
    hasPendingValue(pending.id) ||
    hasPendingValue(pending.assignId) ||
    hasPendingValue(pending.group_id)
  )
}

export function getPushOpenOrderPlan ({
  loaded,
  auth,
  orderId
}: {
  loaded?: unknown
  auth?: unknown
  orderId?: {
    id?: unknown
    assignId?: unknown
    group_id?: unknown
  } | null
}) {
  if (!loaded || !auth || !hasPendingPushOrder(orderId)) {
    return {
      shouldClear: false,
      screen: null,
      orderId: null,
      orderAssingId: null
    }
  }

  const pending = orderId as { id?: unknown, assignId?: unknown, group_id?: unknown }

  if (hasPendingValue(pending.assignId) && !hasPendingValue(pending.group_id)) {
    return {
      shouldClear: true,
      screen: 'OrderDetailsLogistic' as const,
      orderId: null,
      orderAssingId: pending.assignId
    }
  }

  if (
    hasPendingValue(pending.id) &&
    !hasPendingValue(pending.assignId) &&
    !hasPendingValue(pending.group_id)
  ) {
    return {
      shouldClear: true,
      screen: 'OrderDetails' as const,
      orderId: pending.id,
      orderAssingId: null
    }
  }

  return {
    shouldClear: true,
    screen: null,
    orderId: null,
    orderAssingId: null
  }
}
