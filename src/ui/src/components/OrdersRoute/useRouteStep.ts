import { useTheme } from 'styled-components/native'

import { useApi, useConfig } from '@components'
import { themeVisible } from '@/theme/helpers'
import { driverOrderStage } from '../../hooks/useDriverOrderStage'
import { cardActionsFor, type CardActionKey } from '../PreviousOrders/cardActions'
import type { RouteStop } from './routeStops'

/**
 * The order's next step at a stop, which is the very action the order card's quick action offers (`cardActionsFor`, the conditions of
 * the order's bottom bar): the positive one only (the card's negative action, reject or a failure, stays on the card and in the
 * order's details). Only a stop of ONE order has it: a store's stop with several orders would need one step per order, each with its
 * own status, hold, sheet and refusal, which one button cannot be; its orders are reached through the stop (a tap opens them). Nothing
 * when the theme hides the cards' quick actions (`orders.quick_actions`): the route follows the card.
 */
export const useRouteStep = (stop: RouteStop | undefined): { order: any, advance: CardActionKey } | null => {
  const theme: any = useTheme()
  const [{ configs }] = useConfig()
  const [ordering] = useApi()
  if (!stop || stop.orders.length !== 1 || !themeVisible(theme, 'orders.quick_actions')) return null
  const order = stop.orders[0]
  const { effectiveStatus, isPickupPhase } = driverOrderStage(order)
  const { advance } = cardActionsFor({ order, effectiveStatus, isPickupPhase, configs, project: ordering?.project })
  return advance ? { order, advance } : null
}
