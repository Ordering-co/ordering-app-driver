import React, { useMemo, useState } from 'react'
import { View } from 'react-native'
import { useTheme } from 'styled-components/native'

import { focusStyles } from './styles'
import { FoldedRow } from './FoldedRow'
import { OrderBill } from '../OrderBill'
import { isAtCustomerStatus, type StopStage } from '../orderStages'
import { themeColor, themeVisible } from '@/theme/helpers'
import { Icon, OText } from '../../shared'
import { useOrderPayment } from '../../../hooks/useOrderPayment'

import { useLanguage } from '@components'

interface Props {
  order: any
  stage: StopStage
  effectiveStatus: number
}

/**
 * The payment of an order (page section `bill`), one folded row: how it is paid over its total. Opened it is
 * the whole bill. On the way to the customer and with them, an order paid only in cash
 * is the highlighted block of what to collect (the amount, and the change to give), larger with the customer.
 */
export const PaymentBlock = ({ order, stage, effectiveStatus }: Props) => {
  const theme: any = useTheme()
  const [, t] = useLanguage()
  const payment = useOrderPayment(order)
  const [open, setOpen] = useState(false)
  const styles = useMemo(() => focusStyles(theme), [theme])
  const showTotal = themeVisible(theme, 'confirmation.order.total')

  const collect = stage === 'delivery' && payment.isCashOnly
  const large = collect && isAtCustomerStatus(effectiveStatus)
  // The block is the brand's tint, without the card's border and shadow.
  const look = useMemo(
    () => collect ? { background: themeColor(theme, 'primary_subtle'), border: null, shadow: null } : undefined,
    [theme, collect]
  )

  const change = !!payment.change && <OText preset='body_sm'>{payment.change}</OText>
  const header = collect
    ? (
      <View style={styles.collect}>
        <View style={styles.collectTexts}>
          <OText preset='label'>{t('COLLECT_IN_CASH', 'Collect in cash')}</OText>
          {large && showTotal && <OText preset='h1'>{payment.total}</OText>}
          {change}
        </View>
        {!large && showTotal && <OText preset='h3'>{payment.total}</OText>}
      </View>
    )
    : (
      <>
        <OText preset='body_sm' color='text_muted' numberOfLines={1}>{payment.text}</OText>
        {showTotal && <OText preset='label'>{`${t('TOTAL', 'Total')} ${payment.total}`}</OText>}
      </>
    )

  return (
    <FoldedRow
      open={open}
      onToggle={() => setOpen(!open)}
      label={collect ? t('COLLECT_IN_CASH', 'Collect in cash') : payment.text}
      look={look}
      roomy={large}
      minHeight={collect ? theme.native.components.order_details.base.collect_min_height : undefined}
      chevronColor={collect ? 'text' : 'text_muted'}
      leading={!large && <Icon name={payment.isCashOnly ? 'cash-outline' : 'card-outline'} color={collect ? 'text' : 'text_muted'} />}
      header={header}
      body={<OrderBill order={order} compact />}
      testID='focus-payment'
    />
  )
}
