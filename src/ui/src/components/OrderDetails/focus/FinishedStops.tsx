import React, { useMemo } from 'react'
import { useTheme } from 'styled-components/native'

import { focusStyles } from './styles'
import { StopRow } from './StopRow'
import { isDeliveredOrder } from '../orderStages'
import { OCard, ODivider } from '../../shared'

interface Props {
  order: any
  showBusiness: boolean
  showCustomer: boolean
  logisticOrderStatus?: number[]
}

/**
 * The stops of an order that is over: no stop is the current one, so both are folded rows of one card, with a
 * check and "Picked up at" / "Delivered to" for a delivered order and the plain "Store" / "Customer" for any
 * other end.
 */
export const FinishedStops = ({ order, showBusiness, showCustomer, logisticOrderStatus }: Props) => {
  const theme: any = useTheme()
  const styles = useMemo(() => focusStyles(theme), [theme])
  const mode = isDeliveredOrder(order) ? 'done' : 'neutral'
  const parties = [showBusiness && 'business', showCustomer && 'customer'].filter((party): party is 'business' | 'customer' => !!party)
  if (parties.length === 0) return null
  return (
    <OCard style={styles.foldCard} testID='focus-finished-stops'>
      {parties.map((party, index) => (
        <React.Fragment key={party}>
          {index > 0 && <ODivider />}
          <StopRow order={order} party={party} mode={mode} logisticOrderStatus={logisticOrderStatus} boxed={false} />
        </React.Fragment>
      ))}
    </OCard>
  )
}
