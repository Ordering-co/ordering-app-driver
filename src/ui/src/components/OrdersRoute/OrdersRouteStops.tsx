import React, { useMemo, useState } from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import { useTheme } from 'styled-components/native'

import { useLanguage } from '@components'
import { joinTitle } from '../../utils/orderTitle'
import { useFloatingButtonInset } from '../../hooks/useFloatingButtonInset'
import { themePart } from '@/theme/helpers'
import { NotFoundSource } from '../NotFoundSource'
import { OBadge, OCard, ONavbar, OText } from '../shared'
import { OrderStatusBand } from '../PreviousOrders/OrderCardParts'
import { bandTone } from '../PreviousOrders/orderCardBand'
import { orderCardStyles } from '../PreviousOrders/styles'
import { stopsScreenStyles } from './styles'
import { NavigateSheet } from './NavigateSheet'
import { RouteNextActions } from './RouteNextActions'
import { StopNumber } from './StopNumber'
import type { RouteLeg } from './routeGeometry'
import type { RouteStop } from './routeStops'
import { useOpenStop } from './useOpenStop'
import { useRouteData } from './useRouteData'
import { useRouteFormat } from './useRouteFormat'
import { useStepHost, type StepHost } from './useStepHost'
import { useStopPayment } from './useStopPayment'

/**
 * All the stops of the route as a timeline, a second screen of the stack (opened by "See all stops", left with the back arrow to the
 * map): a rail of the stops' numbers with its line, the next stop as a card with the order card's status band (its time, "6 min left"
 * or "12 min late") and the same two buttons as the map's panel, the others as rows with the straight-line distance of their leg and a
 * late badge. A tap on a row opens its order. It is a screen of its own and not the panel expanded, because the card's buttons start
 * sheets (the accept view, the maps) that a sheet over the map could not stack on, and the system's back key and the stack's own
 * transition already do what leaving it must.
 */
interface ItemProps {
  styles: ReturnType<typeof stopsScreenStyles>
  stop: RouteStop
  total: number
  leg?: RouteLeg
  last: boolean
  onOpen: (stop: RouteStop) => void
}

/** One stop that is not the next: its rail and its row. */
const StopRow = ({ styles, stop, total, leg, last, onOpen }: ItemProps) => {
  const [, t] = useLanguage()
  const format = useRouteFormat()
  const payment = useStopPayment(stop.kind === 'delivery' ? stop.orders[0] : undefined)
  const time = format.time(stop)
  const distance = leg ? format.distance(leg.distanceKm) : null
  const detail = stop.kind === 'pickup'
    ? joinTitle([stop.address, format.orderLine(stop)])
    : joinTitle([format.orderLine(stop), payment])

  return (
    <View style={styles.item}>
      <View style={styles.rail} accessibilityElementsHidden importantForAccessibility='no-hide-descendants'>
        <StopNumber number={stop.number} />
        {!last && <View style={styles.line} />}
      </View>
      <Pressable
        style={styles.row}
        onPress={() => onOpen(stop)}
        accessibilityRole='button'
        accessibilityLabel={format.spoken(stop, total, leg?.distanceKm ?? null)}
        testID={`route-stop-${stop.number}`}
      >
        <View style={styles.texts}>
          <OText preset='label' numberOfLines={2}>{format.title(stop)}</OText>
          {!!detail && <OText style={styles.meta} numberOfLines={2}>{detail}</OText>}
          {time?.state === 'danger' && <OBadge variant='danger_soft' wrap testID={`route-stop-${stop.number}-late`}>{time.text}</OBadge>}
        </View>
        <View style={styles.figures}>
          {stop.location
            ? !!distance && <OText style={styles.meta} numberOfLines={1}>{distance}</OText>
            : <OText style={styles.meta} numberOfLines={1} testID={`route-stop-${stop.number}-no-location`}>{t('ROUTE_NO_LOCATION', 'No location')}</OText>}
        </View>
      </Pressable>
    </View>
  )
}

interface NextProps extends ItemProps {
  host: StepHost
  orderCount: number
  canNavigate: boolean
  onNavigate: () => void
}

/** The next stop: its rail and its card, with the order card's status band and the two buttons. */
const NextStopCard = ({ styles, stop, total, leg, last, onOpen, host, orderCount, canNavigate, onNavigate }: NextProps) => {
  const theme: any = useTheme()
  const [, t] = useLanguage()
  const format = useRouteFormat()
  const cardStyles = useMemo(() => orderCardStyles(theme), [theme])
  const payment = useStopPayment(stop.kind === 'delivery' ? stop.orders[0] : undefined)
  const time = format.time(stop)
  const distance = leg ? format.distance(leg.distanceKm) : null
  const status = stop.kind === 'pickup' ? t('ROUTE_NEXT_STOP_PICKUP', 'Next stop · pick up') : t('ROUTE_NEXT_STOP_DELIVER', 'Next stop · deliver')
  const detail = stop.kind === 'pickup'
    ? joinTitle([stop.address, format.orderLine(stop)])
    : joinTitle([format.orderLine(stop), payment])

  return (
    <View style={styles.item}>
      <View style={styles.rail} accessibilityElementsHidden importantForAccessibility='no-hide-descendants'>
        <StopNumber number={stop.number} next />
        {!last && <View style={[styles.line, styles.lineNext]} />}
      </View>
      <View style={styles.cardRoom}>
        <OCard
          look={themePart(theme, 'order_card', 'base')}
          onPress={() => onOpen(stop)}
          accessibilityLabel={format.spoken(stop, total, leg?.distanceKm ?? null)}
          footer={(
            <RouteNextActions
              stop={stop}
              host={host}
              ordersCount={orderCount}
              onOpenStop={() => onOpen(stop)}
              canNavigate={canNavigate}
              onNavigate={onNavigate}
            />
          )}
          testID='route-next-card'
        >
          <OrderStatusBand status={status} time={time?.text} tone={bandTone({ closed: false, status: stop.orders[0]?.status, time })} theme={theme} styles={cardStyles} />
          <View style={styles.cardBody}>
            <View style={styles.cardHead}>
              <View style={styles.texts}>
                <OText style={styles.rowTitle} numberOfLines={2} testID='route-next-card-title'>{stop.kind === 'pickup' ? stop.name || stop.address : stop.address || stop.name}</OText>
                <OText style={styles.meta} numberOfLines={2}>{detail}</OText>
              </View>
              <View style={styles.figures}>
                {stop.location
                  ? !!distance && (
                    <>
                      <OText preset='h4' numberOfLines={1}>{distance}</OText>
                      <OText style={styles.meta} numberOfLines={1}>{t('ROUTE_STRAIGHT_LINE', 'straight line')}</OText>
                    </>
                  )
                  : <OText style={styles.meta} numberOfLines={1}>{t('ROUTE_NO_LOCATION', 'No location')}</OText>}
              </View>
            </View>
          </View>
        </OCard>
      </View>
    </View>
  )
}

export const OrdersRouteStops = ({ navigation }: { navigation?: any }) => {
  const theme: any = useTheme()
  const [, t] = useLanguage()
  const format = useRouteFormat()
  const bottomSpace = useFloatingButtonInset()
  const styles = useMemo(() => stopsScreenStyles(theme, bottomSpace), [theme, bottomSpace])
  const { stops, located, driver, legs, kilometers, orderCount } = useRouteData()
  const host = useStepHost(navigation)
  const openStop = useOpenStop(navigation, orderCount)
  const [sending, setSending] = useState(false)
  const back = () => navigation?.canGoBack?.() && navigation.goBack()

  return (
    <View style={styles.page} testID='orders-route-stops'>
      <ONavbar title={t('ROUTE', 'Route')} subtitle={stops.length ? format.summary(stops.length, kilometers) : undefined} onBack={back} />
      {stops.length === 0
        ? <NotFoundSource content={t('NO_ORDERS_IN_PROGRESS', 'No orders in progress')} conditioned={false} />
        : (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} testID='route-stops-list'>
            {stops.map((stop, index) => {
              // The leg that arrives at the stop: from the driver for the first located one, else from the stop before it.
              const leg = legs.find((candidate) => candidate.toStop === stop.number)
              const props = { styles, stop, total: stops.length, leg, last: index === stops.length - 1, onOpen: openStop }
              return index === 0
                ? <NextStopCard key={stop.id} {...props} host={host} orderCount={orderCount} canNavigate={located.length > 0} onNavigate={() => setSending(true)} />
                : <StopRow key={stop.id} {...props} />
            })}
            <OText preset='body_sm' color='text_muted' style={styles.note} testID='route-stops-note'>
              {t('ROUTE_STOPS_NOTE', "The stops follow each order's delivery position. Change a position on its order to change the route.")}
            </OText>
          </ScrollView>
        )}
      {host.sheet}
      <NavigateSheet open={sending} onClose={() => setSending(false)} stops={stops} driver={driver} />
    </View>
  )
}

export default OrdersRouteStops
