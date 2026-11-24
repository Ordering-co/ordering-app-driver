import { useCallback } from 'react'

import type { RouteStop } from './routeStops'

/**
 * What a tap on a stop does: it opens the stop's order, as a tap on the order's card does. A store's stop for several orders has no
 * single order to open: it takes the driver to the Orders tab's In Progress list, popping the route's screens, where each order is a
 * card with its own actions.
 */
export const useOpenStop = (navigation: any, activeOrdersCount: number) =>
  useCallback((stop: RouteStop) => {
    if (stop.orders.length === 1) {
      navigation?.navigate?.('OrderDetails', { order: stop.orders[0], activeOrdersCount })
      return
    }
    navigation?.navigate?.('BottomTab', { screen: 'Orders', params: { show: 'orders', status: stop.orders[0]?.status, at: Date.now() } }, { pop: true })
  }, [navigation, activeOrdersCount])
