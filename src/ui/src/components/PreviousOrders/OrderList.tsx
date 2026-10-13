import React from 'react'
import { View } from 'react-native'
import { useTheme } from 'styled-components/native'
import { AcceptOrRejectOrder as AcceptOrRejectOrderStyle } from './styles';
import { OrderItem } from './OrderItem';

import { useLanguage, useConfig } from '@components'
import { OButton } from '../shared';
import { areListedOrderRowPropsEqual } from './areListedOrderRowPropsEqual'

export const OrdersList = React.memo((props: any) => {
  const {
    order,
    _order,
    hideBtns,
    currentOrdenSelected,
    isLogisticOrder,
    handlePressOrder,
    currentTabSelected,
    getOrderStatus,
    handleClickLogisticOrder,
    loadingChangeOrder,
    activeOrdersCount
  } = props

  const theme = useTheme()
  const [, t] = useLanguage()
  const [{ configs }] = useConfig();

  const isHideRejectButtons = configs?.reject_orders_enabled && configs?.reject_orders_enabled?.value !== '1'

  return (
    <View
      style={{
        backgroundColor: currentOrdenSelected === order?.id ? theme.colors.gray100 : order?.locked && isLogisticOrder ? '#ccc' : '#fff',
        marginBottom: isLogisticOrder ? 10 : 0
      }}
    >
      <OrderItem
        order={order}
        _order={_order}
        isLogisticOrder={isLogisticOrder}
        handlePressOrder={handlePressOrder}
        currentTabSelected={currentTabSelected}
        getOrderStatus={getOrderStatus}
        activeOrdersCount={activeOrdersCount}
      />
      {isLogisticOrder && !hideBtns && (
        <AcceptOrRejectOrderStyle>
          {!!order?.order_group_id && !!order?.order_group ? (
            <OButton
              text={t('VIEW_ORDER', 'View order')}
              onClick={() => handlePressOrder({ ...order, logistic_order_id: _order?.id })}
              bgColor={theme.colors.blueLight}
              borderColor={theme.colors.blueLight}
              imgRightSrc={null}
              style={{ borderRadius: 7, height: 40 }}
              parentStyle={{ width: '100%' }}
              textStyle={{ color: theme?.colors?.white }}
            />
          ) : (
            <>
              {!isHideRejectButtons && (
                <OButton
                  text={t('REJECT', 'Reject')}
                  onClick={() => handleClickLogisticOrder(2, _order?.id)}
                  bgColor={theme.colors.red}
                  borderColor={theme.colors.red}
                  imgRightSrc={null}
                  style={{ borderRadius: 7, height: 40 }}
                  parentStyle={{ width: '45%' }}
                  textStyle={{ color: theme.colors.white }}
                  isDisabled={loadingChangeOrder}
                />
              )}
              <OButton
                text={t('ACCEPT', 'Accept')}
                onClick={() => handleClickLogisticOrder(1, _order?.id)}
                bgColor={theme.colors.green}
                borderColor={theme.colors.green}
                imgRightSrc={null}
                style={{ borderRadius: 7, height: 40 }}
                parentStyle={{ width: isHideRejectButtons ? '100%' : '45%' }}
                textStyle={{ color: theme.colors.white }}
                isDisabled={loadingChangeOrder}
              />
            </>
          )}
        </AcceptOrRejectOrderStyle>
      )}
    </View>
  )
}, areListedOrderRowPropsEqual)
