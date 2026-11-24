import React, { useMemo } from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import { useTheme } from 'styled-components/native'

import { useLanguage } from '@components'
import { joinTitle } from '../../utils/orderTitle'
import { useFloatingButtonInset } from '../../hooks/useFloatingButtonInset'
import { OLink, OText } from '../shared'
import { routePanelStyles } from './styles'
import { StopNumber } from './StopNumber'
import { RouteNextActions } from './RouteNextActions'
import type { RouteLeg } from './routeGeometry'
import type { RouteStop } from './routeStops'
import type { StepHost } from './useStepHost'
import { useRouteFormat } from './useRouteFormat'
import { useStopPayment } from './useStopPayment'

/**
 * The panel under the route's map: how many stops there are and how far in a straight line, "See all stops", the next stop (what to
 * do and where, the order and its payment, and how far it is from the driver in a straight line) and the two buttons, Navigate and the
 * order's next step. A pinned bar's look; at the largest text sizes it scrolls instead of taking the map.
 */
interface Props {
  stops: RouteStop[]
  legs: RouteLeg[]
  kilometers: number
  orderCount: number
  host: StepHost
  onSeeAll: () => void
  /** A tap on the next stop: its order (or, for a store's several, the orders). */
  onOpenStop: (stop: RouteStop) => void
  canNavigate: boolean
  onNavigate: () => void
}

/** The next stop's title and its line under it take two lines, as the stops screen's rows do: at a large text size one line cut the address. The distance beside them keeps its place. */
const NEXT_STOP_LINES = 2

export const RoutePanel = ({ stops, legs, kilometers, orderCount, host, onSeeAll, onOpenStop, canNavigate, onNavigate }: Props) => {
  const theme: any = useTheme()
  const [, t] = useLanguage()
  const format = useRouteFormat()
  const bottomSpace = useFloatingButtonInset()
  const styles = useMemo(() => routePanelStyles(theme, bottomSpace), [theme, bottomSpace])

  const next = stops[0]
  const payment = useStopPayment(next.kind === 'delivery' ? next.orders[0] : undefined)
  // The leg that leaves the driver arrives at the first stop that has a location, which is the next stop when it has one.
  const fromDriver = legs.find((leg) => leg.fromStop === null && leg.toStop === next.number)
  const distance = fromDriver ? format.distance(fromDriver.distanceKm) : null

  return (
    <ScrollView
      style={styles.panel}
      contentContainerStyle={styles.content}
      bounces={false}
      showsVerticalScrollIndicator={false}
      testID='route-panel'
    >
      <View style={styles.summary}>
        <OText preset='body_sm' color='text_muted' style={styles.summaryText} testID='route-summary'>{format.summary(stops.length, kilometers)}</OText>
        <OLink size='sm' shorcut={t('ROUTE_SEE_ALL_STOPS', 'See all stops')} onPress={onSeeAll} testID='route-see-all' />
      </View>
      <Pressable
        style={styles.next}
        onPress={() => onOpenStop(next)}
        accessibilityRole='button'
        accessibilityLabel={format.spoken(next, stops.length, fromDriver?.distanceKm ?? null)}
        testID='route-next-stop'
      >
        <StopNumber number={next.number} next />
        <View style={styles.texts}>
          <OText style={styles.title} numberOfLines={NEXT_STOP_LINES} testID='route-next-title'>{format.title(next)}</OText>
          <OText style={styles.meta} numberOfLines={NEXT_STOP_LINES} testID='route-next-meta'>{joinTitle([format.orderLine(next), payment])}</OText>
        </View>
        <View style={styles.figures}>
          {distance
            ? (
              <>
                <OText preset='h4' numberOfLines={1} testID='route-next-distance'>{distance}</OText>
                <OText style={styles.meta} numberOfLines={1}>{t('ROUTE_STRAIGHT_LINE', 'straight line')}</OText>
              </>
            )
            : !next.location && <OText style={styles.meta} numberOfLines={1} testID='route-next-no-location'>{t('ROUTE_NO_LOCATION', 'No location')}</OText>}
        </View>
      </Pressable>
      <RouteNextActions stop={next} host={host} ordersCount={orderCount} onOpenStop={() => onOpenStop(next)} canNavigate={canNavigate} onNavigate={onNavigate} />
      <OText preset='body_sm' color='text_muted' testID='route-helper'>
        {t('ROUTE_HELPER', 'The lines show the order of the stops, not the streets. Navigate opens the real route in your maps app.')}
      </OText>
    </ScrollView>
  )
}

export default RoutePanel
