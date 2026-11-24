import React, { useMemo } from 'react'
import { View } from 'react-native'
import { useTheme } from 'styled-components/native'

import { focusStyles } from './styles'
import { showsOrderStatus, useOrderDeliveryDate } from '../orderData'
import { orderStatusVariant } from '../../shared/orderStates'
import { orderTypeVariant } from '../../shared/orderTypeVariant'
import { orderStatusName } from '../../../utils'
import { themeVisible } from '@/theme/helpers'
import { Icon, OBadge, OText } from '../../shared'

import { useLanguage } from '@components'

interface Props {
  order: any
  logisticOrderStatus?: number[]
}

/**
 * The first block of an order in the `focus` layout (page section `header`): its status and delivery
 * position as badges (the position in the order type's colour, `orderTypeVariant`, as on the order card), and when it is for (`confirmation.order.eta`): always at the end of the line: the badges wrap among themselves when they
 * and the time do not fit together.
 */
export const StatusRow = ({ order, logisticOrderStatus }: Props) => {
  const theme: any = useTheme()
  const [, t] = useLanguage()
  const styles = useMemo(() => focusStyles(theme), [theme])
  const date = useOrderDeliveryDate(order)

  const showStatus = showsOrderStatus(order, logisticOrderStatus)
  const hasPosition = order?.delivery_position != null
  const showTime = themeVisible(theme, 'confirmation.order.eta')
  const hasBadges = showStatus || hasPosition
  if (!hasBadges && !showTime) return null

  return (
    <View style={[styles.statusRow, !hasBadges && styles.statusRowTimeOnly]} testID='focus-status-row'>
      {/* The badges are one child (it takes the room the time leaves) and the time the other, at the end of the line. */}
      {hasBadges && (
        <View style={styles.statusBadges} testID='focus-status-badges'>
          {showStatus && (
            <OBadge variant={orderStatusVariant(order?.status)} size='md' testID='order-details-status'>
              {orderStatusName(t, order?.status)}
            </OBadge>
          )}
          {hasPosition && (
            <OBadge variant={orderTypeVariant(order?.delivery_type)} size='md' testID='order-details-position'>
              {t('DELIVERY_NUMBER', 'Delivery') + ` #${order?.delivery_position}`}
            </OBadge>
          )}
        </View>
      )}
      {showTime && (
        <View style={styles.time} testID='focus-delivery-time'>
          <Icon name='time-outline' size='sm' color='text_muted' />
          <OText preset='body_sm' color='text_muted'>{date.short}</OText>
        </View>
      )}
    </View>
  )
}
