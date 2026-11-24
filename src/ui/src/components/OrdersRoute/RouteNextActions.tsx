import React, { useMemo } from 'react'
import { View } from 'react-native'
import { useTheme } from 'styled-components/native'

import { useLanguage } from '@components'
import { Icon, OButton } from '../shared'
import { OrderCardActions } from '../PreviousOrders/OrderCardActions'
import { routeActionStyles } from './styles'
import type { RouteStop } from './routeStops'
import type { StepHost } from './useStepHost'
import { useRouteStep } from './useRouteStep'

/**
 * The two buttons of the next stop: Navigate (the maps sheet) and the order's next step, one third and two thirds of the row as the
 * order card's decline and advance. The step is the order card's own button (`OrderCardActions` with the advance action alone): the
 * same label, theme slot, hold to confirm, busy state, offline queue and refusals, never a copy of them. Without one (a stop of several
 * orders, or a theme that hides the cards' quick actions) Navigate takes the row.
 */
interface Props {
  stop: RouteStop
  host: StepHost
  /** How many orders the route is about (the accept view's delivery position goes up to it). */
  ordersCount: number
  /** Opens the stop's order, for the step whose check only the order's details make. */
  onOpenStop: () => void
  /** Navigate has somewhere to go: at least one stop has a location. */
  canNavigate: boolean
  onNavigate: () => void
}

export const RouteNextActions = ({ stop, host, ordersCount, onOpenStop, canNavigate, onNavigate }: Props) => {
  const theme: any = useTheme()
  const [, t] = useLanguage()
  const styles = useMemo(() => routeActionStyles(theme), [theme])
  const step = useRouteStep(stop)

  return (
    <View style={styles.row} testID='route-actions'>
      <View style={step ? styles.navigate : styles.alone}>
        <OButton
          fitText
          color='neutral'
          appearance='outline'
          icon={<Icon name='navigate-outline' />}
          text={t('NAVIGATE', 'Navigate')}
          disabled={!canNavigate}
          onClick={onNavigate}
          testID='route-navigate'
        />
      </View>
      {!!step && (
        <View style={styles.step}>
          <OrderCardActions
            order={step.order}
            actions={{ advance: step.advance }}
            handleChangeOrderStatus={host.changeOrderStatus}
            openAcceptSheet={host.openAcceptSheet}
            onNavigationRedirect={host.onNavigationRedirect}
            onOpenOrder={onOpenStop}
            onOfflineTap={host.onOfflineTap}
            activeOrdersCount={ordersCount}
          />
        </View>
      )}
    </View>
  )
}
