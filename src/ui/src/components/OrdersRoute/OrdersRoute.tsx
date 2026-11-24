import React, { useMemo, useState } from 'react'
import { View } from 'react-native'
import { useTheme } from 'styled-components/native'

import { useLanguage } from '@components'
import { NotFoundSource } from '../NotFoundSource'
import { ONavbar } from '../shared'
import { routeScreenStyles } from './styles'
import { NavigateSheet } from './NavigateSheet'
import { RouteMap } from './RouteMap'
import { RoutePanel } from './RoutePanel'
import type { RouteStop } from './routeStops'
import { useOpenStop } from './useOpenStop'
import { useRouteData } from './useRouteData'
import { useRouteFormat } from './useRouteFormat'
import { useStepHost } from './useStepHost'

/**
 * The driver's route: the stops of the orders in progress on the map, in the order they are made, with the next one in a panel under
 * it (Navigate, and the order's next step) and "See all stops". The orders are the Orders tab's In Progress list's own (`routeSource`),
 * so the screen follows the list. With no order in progress left (the last one was delivered while the screen was open) it says so.
 *
 * The lines between the stops are straight: they show the order of the stops, not the streets (the legs come from `routeLegs`, which a
 * routing service would replace); Navigate sends the real route to the driver's maps app.
 */
export const OrdersRoute = ({ navigation }: { navigation?: any }) => {
  const theme: any = useTheme()
  const [, t] = useLanguage()
  const styles = useMemo(() => routeScreenStyles(theme), [theme])
  const format = useRouteFormat()
  const { stops, located, driver, legs, kilometers, orderCount, getCurrentLocation } = useRouteData()
  const host = useStepHost(navigation)
  const openStop = useOpenStop(navigation, orderCount)
  const [sending, setSending] = useState(false)

  const spoken = (stop: RouteStop) => format.spoken(stop, stops.length, legs.find((leg) => leg.toStop === stop.number)?.distanceKm ?? null)
  const back = () => navigation?.canGoBack?.() && navigation.goBack()

  return (
    <View style={styles.page} testID='orders-route'>
      <ONavbar
        title={t('ROUTE', 'Route')}
        subtitle={stops.length ? format.ordersCount(orderCount) : undefined}
        onBack={back}
      />
      {stops.length === 0
        ? <NotFoundSource content={t('NO_ORDERS_IN_PROGRESS', 'No orders in progress')} conditioned={false} />
        : (
          <>
            <View style={styles.map} testID='route-map'>
              <RouteMap stops={located} driver={driver} legs={legs} spoken={spoken} getCurrentLocation={getCurrentLocation} />
            </View>
            <RoutePanel
              stops={stops}
              legs={legs}
              kilometers={kilometers}
              orderCount={orderCount}
              host={host}
              onSeeAll={() => navigation?.navigate?.('OrdersRouteStops')}
              onOpenStop={openStop}
              canNavigate={located.length > 0}
              onNavigate={() => setSending(true)}
            />
          </>
        )}
      {host.sheet}
      <NavigateSheet open={sending} onClose={() => setSending(false)} stops={stops} driver={driver} />
    </View>
  )
}

export default OrdersRoute
