import React, { useMemo, useState } from 'react'
import { Pressable, View } from 'react-native'
import { useTheme } from 'styled-components/native'

import { orderCardStyles, ordersListStyles } from './styles'
import { themePart, themeVisible } from '@/theme/helpers'

import { useLanguage, useUtils } from '@components'
import { Icon, OCard, ODivider, OText } from '../shared'
import { groupLabel } from '../../utils'

/**
 * A group of orders: one card whose head opens and closes the group's orders
 * (rows of the card) and the group's actions under them.
 */
export const OrdersGroupedItem = (props: any) => {
  const { groupId, orders } = props

  const theme: any = useTheme()
  const [, t] = useLanguage()
  const [{ parseDate }] = useUtils()
  const [isActive, setActiveState] = useState(false)
  const card = useMemo(() => orderCardStyles(theme), [theme])
  const styles = useMemo(() => ordersListStyles(theme), [theme])

  const title = groupLabel(t, groupId)

  return (
    <OCard look={themePart(theme, 'order_card', 'base')} testID={`orders-group-${groupId}`}>
      <View style={card.body}>
        <Pressable
          accessibilityRole='button'
          accessibilityLabel={title}
          accessibilityState={{ expanded: isActive }}
          onPress={() => setActiveState(!isActive)}
          style={({ pressed }) => [card.press, pressed && card.pressed]}
        >
          <View style={card.tile}>
            <Icon set='mci' name='package-variant-closed' size='lg' color='text_muted' />
          </View>
          <View style={card.info}>
            <OText numberOfLines={1} style={card.name}>{title}</OText>
            <OText style={card.meta} numberOfLines={1}>
              {[
                `${orders.length} ${t('ORDERS', 'Orders')}`,
                themeVisible(theme, 'orders.date') && (orders[0]?.delivery_datetime_utc
                  ? parseDate(orders[0]?.delivery_datetime_utc)
                  : parseDate(orders[0]?.delivery_datetime, { utc: false }))
              ].filter(Boolean).join(' · ')}
            </OText>
          </View>
          <Icon name={isActive ? 'chevron-up' : 'chevron-down'} color='text_muted' />
        </Pressable>

        {/* Kept mounted while closed: a row keeps its state (its position dialog). */}
        <View style={isActive ? styles.groupBody : styles.hidden}>
          <ODivider />
          {props.children}
        </View>
      </View>
    </OCard>
  )
}
