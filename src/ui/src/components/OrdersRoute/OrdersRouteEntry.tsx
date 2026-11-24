import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import { useTheme } from 'styled-components/native'

import { useLanguage } from '@components'
import { themeVisible } from '@/theme/helpers'
import { joinTitle } from '../../utils/orderTitle'
import { Icon, OButton } from '../shared'
import { buildRouteStops } from './routeStops'
import { clearRouteSource, publishRouteSource } from './routeSource'
// The button's size and look: the list's skeleton draws a bone of the same size where it will be.
import { ROUTE_ENTRY_APPEARANCE, ROUTE_ENTRY_SIZE } from './routeEntryLook'

/** The tabs of the Orders screen whose orders the route is about: the In Progress tab, and Active in a project that combines them. */
const ROUTE_VIEWS = ['inProgress', 'active']

/**
 * The entry of the route, the header of the In Progress (and Active) list: one outlined button across the list, a route glyph and
 * "Route · 5 stops", above the first card. It is drawn only while the theme shows the route (`orders.route`), the tab in view is one of
 * the route's, no search is applied (the tab is then not what the list shows) and at least one order in progress has a stop with a
 * location; with the last order delivered it goes.
 *
 * It is also where the route gets its orders: while the list shows one of those tabs, the rows it shows (the same ones, in the same
 * state: the offline queue's stages, the delivery positions, what the last reload brought) and its own status-change request are
 * handed to the route's screens (`routeSource`), so they follow the list and never keep a second copy of it. It stays mounted while
 * the button is not drawn (it renders nothing, but keeps the route fed: an empty list is how the route's screens learn that the
 * last order is gone), and clears what it handed over when it goes away or the list leaves those tabs.
 */
interface Props {
  /** The tab in view (`inProgress`, `active`…), none while a search is applied. */
  view?: string
  /** The rows the list shows: orders, or groups as the list draws them. */
  orders: unknown[]
  onNavigationRedirect?: (page: string, params?: any) => void
  /** The list's own status change: the one the order card's actions use (it loads the list again after a change). */
  handleChangeOrderStatus?: (...args: any[]) => any
}

export const OrdersRouteEntry = ({ view, orders, onNavigationRedirect, handleChangeOrderStatus }: Props) => {
  const theme: any = useTheme()
  const [, t] = useLanguage()
  const onRoute = themeVisible(theme, 'orders.route') && !!view && ROUTE_VIEWS.includes(view)

  // A stable function to hand over: the list's request changes with its renders, and the route's screens must not.
  const latest = useRef(handleChangeOrderStatus)
  latest.current = handleChangeOrderStatus
  const changeOrderStatus = useCallback((...args: any[]) => latest.current?.(...args), [])

  useEffect(() => {
    if (onRoute) publishRouteSource({ rows: orders, changeOrderStatus })
    else clearRouteSource()
  }, [onRoute, orders, changeOrderStatus])
  useEffect(() => () => clearRouteSource(), [])

  const stops = useMemo(() => (onRoute ? buildRouteStops(orders) : []), [onRoute, orders])
  if (!stops.some((stop) => stop.location)) return null

  const text = joinTitle([
    t('ROUTE', 'Route'),
    (stops.length === 1 ? t('ROUTE_STOPS_COUNT_ONE', ':count: stop') : t('ROUTE_STOPS_COUNT', ':count: stops')).replace(':count:', String(stops.length))
  ])
  return (
    <OButton
      appearance={ROUTE_ENTRY_APPEARANCE}
      size={ROUTE_ENTRY_SIZE}
      icon={<Icon set='mci' name='map-marker-path' />}
      text={text}
      onClick={() => onNavigationRedirect?.('OrdersRoute')}
      testID='orders-route-entry'
    />
  )
}

export default OrdersRouteEntry
