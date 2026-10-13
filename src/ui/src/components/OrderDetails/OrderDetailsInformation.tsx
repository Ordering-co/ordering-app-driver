import React, { useContext } from 'react'
import { useTheme } from 'styled-components/native';
import { Pickup } from './styles';
import { StyleSheet, View } from 'react-native';

import { OrderContentComponent } from './OrderContentComponent'
import { useLanguage } from '@components'
import { OButton } from '@ui';
import { useFloatingButtonInset } from '../../hooks/useFloatingButtonInset';
import { useStatusImage } from '../../hooks/useStatusImage';
import { PermissionsContext } from '../../../../context/PermissionsContext';

export const OrderDetailsInformation = (props: any) => {
  const {
    order,
    effectiveStatus = order?.status,
    isOrderGroup,
    lastOrder,
    logisticOrderStatus,
    deliveryTypes,
    handleChangeOrderStatus,
    disabledActionsByInternet,
    loadingOrder,
    goToPermissionPage,
    arrivedCustomerStatusses,
    handleViewActionOrder,
    isEnabledOrderNotReady,
  } = props

  const { isGrantedPermissions } = useContext(PermissionsContext);
  const { requiresImage: statusRequiresImage } = useStatusImage();
  const theme = useTheme()
  const [, t] = useLanguage()
  const floatingInset = useFloatingButtonInset()

  const styles = StyleSheet.create({
    btnPickUp: {
      borderWidth: 0,
      backgroundColor: theme.colors.btnBGWhite,
      borderRadius: 10,
      marginBottom: 30
    },
  });

  const isShowBtnPickUp = (effectiveStatus === 8 || effectiveStatus === 18 || props.isPickupPhase) && deliveryTypes?.includes(order?.delivery_type) && !props.order?.loading
  const isShowBtnArrivedToCustomer = arrivedCustomerStatusses.includes(effectiveStatus) && deliveryTypes?.includes(order?.delivery_type) && !props.order?.loading
  const isShowBtnOrderNotReady = effectiveStatus === 3 && deliveryTypes?.includes(order?.delivery_type) && isEnabledOrderNotReady && !props.order?.loading

  const hasInlineButton = isShowBtnOrderNotReady || isShowBtnArrivedToCustomer || isShowBtnPickUp

  return (
    <View style={{ paddingHorizontal: 20, marginBottom: hasInlineButton ? 100 + floatingInset : 0 }}>
      <OrderContentComponent
        order={order}
        logisticOrderStatus={logisticOrderStatus}
        isOrderGroup={isOrderGroup}
        lastOrder={lastOrder}
      />
      {isShowBtnPickUp && (
        <OButton
          style={styles.btnPickUp}
          textStyle={{ color: theme.colors.primary }}
          text={t('ARRIVED_TO_BUSINESS', 'Arrived to bussiness')}
          isDisabled={props.order?.loading || disabledActionsByInternet || loadingOrder}
          onClick={() => {
            if (!isGrantedPermissions) {
              goToPermissionPage();
              return;
            }

            if (statusRequiresImage(3)) {
              handleViewActionOrder && handleViewActionOrder('arrivedToBusiness');
            } else {
              handleChangeOrderStatus(3);
            }
          }}
          imgLeftStyle={{ tintColor: theme.colors.backArrow }}
        />
      )}
        {isShowBtnArrivedToCustomer && (
        <OButton
          style={styles.btnPickUp}
          textStyle={{ color: theme.colors.primary }}
          text={t('ARRIVED_TO_CUSTOMER', 'Arrived to customer')}
          isDisabled={props.order?.loading || disabledActionsByInternet || loadingOrder}
          onClick={() =>
            isGrantedPermissions ? handleChangeOrderStatus(26) : goToPermissionPage()
          }
          imgLeftStyle={{ tintColor: theme.colors.backArrow }}
        />
      )}
      {isShowBtnOrderNotReady && (
        <OButton
          style={styles.btnPickUp}
          textStyle={{ color: theme.colors.white }}
          text={t('ORDER_NOT_READY', 'Order not ready')}
          isDisabled={props.order?.loading || disabledActionsByInternet || loadingOrder}
          onClick={() =>
            handleViewActionOrder && handleViewActionOrder('notReady')
          }
          imgLeftStyle={{ tintColor: theme.colors.backArrow }}
          bgColor={theme.colors.red}
        />
      )}

    </View>
  )
}
