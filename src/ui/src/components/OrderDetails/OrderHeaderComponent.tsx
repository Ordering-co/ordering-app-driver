import React, { useMemo } from 'react';
import { useTheme } from 'styled-components/native';
import { View } from 'react-native';

import { headerStyles } from './styles';
import { orderStatusVariant } from '../shared/orderStates';
import { orderTypeVariant } from '../shared/orderTypeVariant';
import { themeVisible } from '@/theme/helpers';

import {
  useLanguage
} from '@components';

import {
  OBadge,
  OCard,
  ODivider,
  OText,
} from '../shared'

import { orderTypeLabel } from '../../utils'
import { useOrderPayment } from '../../hooks/useOrderPayment'
import { showsOrderStatus, useOrderDataLines, useOrderDeliveryDate } from './orderData'

interface OrderHeader {
  order?: any,
  getOrderStatus?: any,
  logisticOrderStatus?: Array<number>,
}

export const OrderHeaderComponent = (props: OrderHeader) => {
  const {
    order,
    getOrderStatus,
    logisticOrderStatus
  } = props
  const theme: any = useTheme();
  const [, t] = useLanguage();
  const payment = useOrderPayment(order)
  const paymethodsLength = payment.count
  const dataLines = useOrderDataLines(order, logisticOrderStatus)
  const deliveryDate = useOrderDeliveryDate(order).full

  const styles = useMemo(() => headerStyles(theme), [theme])

  const showStatus = showsOrderStatus(order, logisticOrderStatus)
  const hasBadges = showStatus || order?.delivery_position != null
  const showFacts = themeVisible(theme, 'confirmation.order.type')

  /** A line of the order's data under the card: its name in the muted color, its value in the text's. */
  const meta = (label: string, value: React.ReactNode) => (
    <OText preset='body_sm' color='text_muted' align='center'>
      {label}{': '}
      <OText preset='body_sm'>{value}</OText>
    </OText>
  )

  return (
    <View style={styles.section}>
      {(hasBadges || showFacts) && (
        <OCard style={styles.card}>
          {/* The status as on every other screen: a badge by its state (decision H1b), beside the delivery position, which is in the order type's colour (`orderTypeVariant`, as on the order card).
              The order's number is the screen's bar title, not a line of this card. */}
          {hasBadges && (
            <View style={styles.badges}>
              {showStatus && (
                <OBadge variant={orderStatusVariant(order?.status)} size='md' testID='order-details-status'>
                  {getOrderStatus(order?.status, t)?.value}
                </OBadge>
              )}
              {order?.delivery_position != null && (
                <OBadge variant={orderTypeVariant(order?.delivery_type)} size='md' testID='order-details-position'>
                  {t('DELIVERY_NUMBER', 'Delivery') + ` #${order?.delivery_position}`}
                </OBadge>
              )}
            </View>
          )}
          {showFacts && (
            <>
              {hasBadges && <ODivider />}
              <View style={styles.facts}>
                <View style={styles.fact}>
                  <OText preset='label' align='center'>{`${t('ORDER_TYPE', 'Order Type')}`}</OText>
                  <OText style={styles.info}>
                    {orderTypeLabel(t, order.delivery_type)}
                  </OText>
                </View>
                <ODivider variant='vertical' />
                <View style={styles.fact}>
                  <OText preset='label' align='center'>
                    {`${t(paymethodsLength > 1 ? 'PAYMENT_METHODS' : 'PAYMENT_METHOD', paymethodsLength > 1 ? 'Payment methods' : 'Payment method')}`}
                  </OText>
                  <OText style={styles.info}>{payment.text}</OText>
                </View>
              </View>
            </>
          )}
        </OCard>
      )}
      {dataLines.map((line) => (
        <React.Fragment key={line.key}>{meta(line.label, line.value)}</React.Fragment>
      ))}
      {themeVisible(theme, 'confirmation.order.eta') && meta(t('PLACED_TO', 'Placed to'), deliveryDate)}
    </View>
  )
}
