import { useCallback, useRef } from 'react'

import { useEvent } from '@components'

/**
 * The app's event for "the driver changed an order from a screen that is not the list": the orders list loads again on it,
 * without waiting for a socket (the app's own actions never depend on it: locally it is not connected and in the field it drops).
 */
export const ORDER_CHANGED_EVENT = 'driver_order_changed'

/** What the event carries. */
export interface OrderChange {
  /** The orders that changed. */
  orderIds: Array<number | string>
  /** The change was the answer to an assign request: the requests list loads again too. */
  request?: boolean
  /** The request was accepted: its orders are now the driver's, so the orders list loads again too (a rejected one adds nothing to it). */
  accepted?: boolean
}

/**
 * What a screen calls once a change of the driver's own took (the API answered and the order changed): the orders list
 * asks its reload queue (`OrdersOption`). One call per change, made by the one place the screen's changes go through.
 * A change that was only queued offline is never announced: the list shows the queued state, and a load would put the old one back.
 */
export const useAnnounceOrderChange = () => {
  const [events] = useEvent()
  const latest = useRef(events)
  latest.current = events
  // A stable function: a screen may call it after it is gone (a request answered while the driver is already back at the list).
  return useCallback((change: OrderChange) => {
    latest.current?.emit?.(ORDER_CHANGED_EVENT, change)
  }, [])
}
