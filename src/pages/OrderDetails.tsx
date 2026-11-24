import React, { useContext } from 'react';
import { PermissionsContext } from '../context/PermissionsContext';
import { DRIVER_ACTIONS, DRIVER_APP_TITLE, DRIVER_ORDER_TITLES } from '../ui/src/components/AcceptOrRejectOrder/driverActions';

import {
  SafeAreaContainerLayout,
  OrderDetailsDelivery as OrderDetailsController,
} from '@ui';

const OrderDetails = ({ navigation, route }: any) => {
  const { permissions, askLocationPermission, redirectToSettings, getPermissions, isGrantedPermissions } =
    useContext(PermissionsContext);
  const orderDetailsProps = {
    navigation,
    order: route.params?.order,
    activeOrdersCount: route.params?.activeOrdersCount,
    driverAndBusinessId: true,
    orderId: route.params?.orderId || route.params?.order?.id,
    orderAssingId: route.params?.orderAssingId,
    isFromCheckout: route.params?.isFromCheckout,
    isFromRoot: route.params?.isFromRoot,
    isDriverNotification: route.params?.isDriverNotification,
    getDrivers: false,
    isDisabledOrdersRoom: true,
    actions: DRIVER_ACTIONS,
    orderTitle: DRIVER_ORDER_TITLES,
    appTitle: DRIVER_APP_TITLE,
    permissions,
    askLocationPermission,
    redirectToSettings,
    getPermissions,
    handleClickLogisticOrder: route?.params?.handleClickLogisticOrder,
    isGrantedPermissions
  };

  return (
    <SafeAreaContainerLayout>
      <OrderDetailsController {...orderDetailsProps} />
    </SafeAreaContainerLayout>
  );
};

export default OrderDetails;
