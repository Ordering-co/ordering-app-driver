import React, { useMemo } from 'react'
import { View } from 'react-native'
import { useTheme } from 'styled-components/native'
import { ordersListStyles } from './styles'
import { themePart, themeVisible } from '@/theme/helpers'
import { OrderItem } from './OrderItem'

import { useLanguage, useConfig } from '@components'
import { OButton } from '../shared'
import { areListedOrderRowPropsEqual } from './areListedOrderRowPropsEqual'

/**
 * A row of the orders list: the order's card (its quick actions are its own: `OrderCardActions`) and, for an assign request, its
 * actions in the same card (`order_card.slots.advance` / `decline`: the positive across two thirds of the row, the negative outlined
 * across one; the theme's `orders.quick_actions` hides them with the order's). A request another driver holds (`locked`) has none: it
 * cannot be answered. Answering it is one tap that cannot be taken back for the reject, so only the reject is held (press and hold), as
 * it is in the request's own screen. Accepting is never held: a single tap, the time is valuable there.
 */
export const OrdersList = React.memo((props: any) => {
  const {
    order,
    _order,
    hideBtns,
    inGroup,
    isLogisticOrder,
    handlePressOrder,
    currentTabSelected,
    getOrderStatus,
    handleClickLogisticOrder,
    loadingChangeOrder,
    activeOrdersCount,
    handleChangeOrderStatus,
    openAcceptSheet,
    onNavigationRedirect,
    onOfflineTap,
    driverPosition
  } = props

  const theme: any = useTheme()
  const [, t] = useLanguage()
  const [{ configs }] = useConfig()
  const styles = useMemo(() => ordersListStyles(theme), [theme])
  const slots = themePart(theme, 'order_card', 'slots')
  const showQuickActions = themeVisible(theme, 'orders.quick_actions')

  const isHideRejectButtons = configs?.reject_orders_enabled && configs?.reject_orders_enabled?.value !== '1'

  const actions = isLogisticOrder && showQuickActions && !hideBtns && !order?.locked && (
    <View style={styles.requestActions}>
      {!!order?.order_group_id && !!order?.order_group ? (
        <View style={styles.action}>
          <OButton
            size={slots.advance.size}
            color={slots.advance.color}
            appearance={slots.advance.appearance}
            text={t('VIEW_ORDER', 'View order')}
            onClick={() => handlePressOrder({ ...order, logistic_order_id: _order?.id })}
          />
        </View>
      ) : (
        <>
          {!isHideRejectButtons && (
            <View style={styles.decline}>
              <OButton
                size={slots.decline.size}
                color={slots.decline.color}
                appearance={slots.decline.appearance}
                text={t('REJECT', 'Reject')}
                hold
                onClick={() => handleClickLogisticOrder(2, _order?.id)}
                disabled={loadingChangeOrder}
              />
            </View>
          )}
          <View style={isHideRejectButtons ? styles.action : styles.advance}>
            <OButton
              size={slots.advance.size}
              color={slots.advance.color}
              appearance={slots.advance.appearance}
              text={t('ACCEPT', 'Accept')}
              onClick={() => handleClickLogisticOrder(1, _order?.id)}
              disabled={loadingChangeOrder}
            />
          </View>
        </>
      )}
    </View>
  )

  return (
    <OrderItem
      order={order}
      _order={_order}
      inGroup={inGroup}
      isLogisticOrder={isLogisticOrder}
      handlePressOrder={handlePressOrder}
      currentTabSelected={currentTabSelected}
      getOrderStatus={getOrderStatus}
      activeOrdersCount={activeOrdersCount}
      handleChangeOrderStatus={handleChangeOrderStatus}
      openAcceptSheet={openAcceptSheet}
      onNavigationRedirect={onNavigationRedirect}
      onOfflineTap={onOfflineTap}
      driverPosition={driverPosition}
    >
      {actions}
    </OrderItem>
  )
}, areListedOrderRowPropsEqual)
