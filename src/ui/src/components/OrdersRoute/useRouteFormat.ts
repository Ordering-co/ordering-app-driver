import { useTheme } from 'styled-components/native'

import { useConfig, useLanguage, useUtils } from '@components'

import { joinTitle, orderNumberTag } from '../../utils/orderTitle'
import { useSecureOrderId } from '../../hooks/useSecureOrderId'
import { customerFullName, distanceText } from '../OrderDetails/partyContact'
import { orderCardPieces } from '../PreviousOrders/orderCardPieces'
import { delayMinutes, openOrderTime, orderDue, showsClockTime, type CardTime } from '../PreviousOrders/orderCardTime'
import type { RouteStop } from './routeStops'

/** The tab whose card writes the time of an order that is still open: the route's orders are the In Progress tab's. */
const ROUTE_TAB = 'inProgress'

/**
 * Everything the route writes about a stop, in one place so the map's panel, the list of stops and the screen reader's labels say
 * the same thing: the title ("Pick up at Luna Pizza", "Deliver to 18 Pine Ct"), the order numbers as the card writes them (masked in a
 * secure project, the external id when the project shows it), the distance in the project's unit with the card's formatter, and the
 * time the status band writes ("6 min left", "12 min late").
 */
export const useRouteFormat = () => {
  const theme: any = useTheme()
  const [, t] = useLanguage()
  const [utils] = useUtils()
  const [{ configs }] = useConfig()
  const { maskOrderId } = useSecureOrderId()
  const unit = configs?.distance_unit?.value
  const showExternalId = configs?.change_order_id?.value === '1'
  const clockTime = showsClockTime(theme)

  /** "1.10 km": the order card's distance, in the project's unit. */
  const distance = (kilometers: number): string => distanceText(kilometers, unit, t)

  /** The number as it is shown, without its "#": masked in a secure project, the external id when the project shows it. */
  const shownId = (order: any): string => String((showExternalId && order?.external_id) || maskOrderId(order?.id))

  /** "5 stops", "1 stop". */
  const stopsCount = (count: number): string =>
    (count === 1 ? t('ROUTE_STOPS_COUNT_ONE', ':count: stop') : t('ROUTE_STOPS_COUNT', ':count: stops')).replace(':count:', String(count))

  /** "5 stops · about 7.80 km in a straight line": the distance only when something is known of it. */
  const summary = (count: number, kilometers: number): string =>
    joinTitle([
      stopsCount(count),
      kilometers > 0 ? t('ROUTE_ABOUT_STRAIGHT', 'about :distance: in a straight line').replace(':distance:', distance(kilometers)) : ''
    ])

  /** "3 orders in progress". */
  const ordersCount = (count: number): string =>
    (count === 1 ? t('ROUTE_ORDERS_IN_PROGRESS_ONE', ':count: order in progress') : t('ROUTE_ORDERS_IN_PROGRESS', ':count: orders in progress'))
      .replace(':count:', String(count))

  /** What to do at the stop and where: "Pick up at Luna Pizza" (the store's name), "Deliver to 18 Pine Ct" (the customer's address). */
  const title = (stop: RouteStop): string => {
    const where = stop.kind === 'pickup' ? stop.name || stop.address : stop.address || stop.name
    return `${stop.kind === 'pickup' ? t('PICK_UP_AT', 'Pick up at') : t('DELIVER_TO', 'Deliver to')} ${where}`.trim()
  }

  /** "#1042 · Ana Gil" for one order, "#1042, #1043" for several (a store's pick-up). */
  const orderLine = (stop: RouteStop): string =>
    stop.orders.length === 1
      ? joinTitle([orderNumberTag(shownId(stop.orders[0])), stop.kind === 'delivery' ? stop.name : customerFullName(stop.orders[0]).trim()])
      : stop.orders.map((order) => orderNumberTag(shownId(order))).join(', ')

  /**
   * The time of the stop's most pressing order, as the order card's band writes it (the same text, the theme's clock time included:
   * `showsClockTime`); nothing where the card writes none (no enterprise plan).
   */
  const time = (stop: RouteStop): CardTime | null => {
    if (!orderCardPieces(ROUTE_TAB, configs).timer) return null
    let pressing: { time: CardTime, minutes: number } | null = null
    for (const order of stop.orders) {
      const minutes = delayMinutes(orderDue(order, utils.parseDate))
      if (!pressing || minutes < pressing.minutes) pressing = { time: openOrderTime(order, utils, t, clockTime), minutes }
    }
    return pressing?.time ?? null
  }

  /** What a screen reader says of a stop, in order: "Stop 2 of 5, Pick up at Luna Pizza, order 1042, 1.90 km". */
  const spoken = (stop: RouteStop, total: number, leg: number | null): string => {
    const numbers = stop.orders.map(shownId).join(', ')
    return [
      t('ROUTE_STOP_OF', 'Stop :number: of :total:').replace(':number:', String(stop.number)).replace(':total:', String(total)),
      title(stop),
      (stop.orders.length === 1 ? t('ROUTE_STOP_ORDER_ONE', 'order :numbers:') : t('ROUTE_STOP_ORDER_MANY', 'orders :numbers:')).replace(':numbers:', numbers),
      stop.location ? (leg === null ? '' : distance(leg)) : t('ROUTE_NO_LOCATION', 'No location')
    ].filter(Boolean).join(', ')
  }

  return { distance, shownId, stopsCount, summary, ordersCount, title, orderLine, time, spoken }
}
