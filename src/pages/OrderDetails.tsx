import React, { useContext } from 'react';
import { PermissionsContext } from '../context/PermissionsContext';
import settings from '../config.json'

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
    actions: {
      accept: 'acceptByDriver',
      reject: 'rejectByDriver',
      pickupFailed: 'pickupFailedByDriver',
      deliveryFailed: 'deliveryFailedByDriver',
      notReady: 'orderNotReady',
      forcePickUp: 'forcePickUp',
      forceDelivery: 'forceDelivery',
      forceStatus: 'forceStatus'
    },
    orderTitle: {
      accept: { key: 'DELIVERY_TIME', text: 'Delivery time', btnKey: 'ACCEPT', btnText: 'Accept' },
      reject: { key: 'REJECT_ORDER', text: 'Reject Order', btnKey: 'REJECT', btnText: 'Reject' },
      pickupFailed: { key: 'PICKUP_FAILED', text: 'Pickup Failed', btnKey: 'PICKUP_FAILED', btnText: 'Pickup Failed' },
      deliveryFailed: { key: 'DELIVERY_FAILED', text: 'Delivery Failed', btnKey: 'DELIVERY_FAILED', btnText: 'Delivery Failed' },
      notReady: { key: 'ORDER_NOT_READY', text: 'Order not ready', btnKey: 'ORDER_NOT_READY', btnText: 'Order not ready' },
      forcePickUp: { key: 'FORCED_MARK_ORDER_AS_PICKUP', text: 'FORCED_MARK_ORDER_AS_PICKUP', btnKey: 'MOBILE_PICKUP_COMPLETE', btnText: 'PickUp Completed' },
      forceDelivery: { key: 'FORCED_MARK_ORDER_AS_DELIVERY', text: 'FORCED_MARK_ORDER_AS_DELIVERY', btnKey: 'MOBILE_DELIVERY_COMPLETE', btnText: 'Delivery Completed' },
      forceStatus: { key: 'REASON_REQUIRED', text: 'Reason required', btnKey: 'CONFIRM', btnText: 'Confirm' },
      arrivedToBusiness: { key: 'ARRIVED_TO_BUSINESS', text: 'Arrived to bussiness', btnKey: 'ARRIVED_TO_BUSINESS', btnText: 'Arrived to bussiness' },
      pickupComplete: { key: 'PICKUP_COMPLETE', text: 'Pickup complete', btnKey: 'PICKUP_COMPLETE', btnText: 'Pickup complete' },
      deliveryComplete: { key: 'DELIVERY_COMPLETE', text: 'Delivery complete', btnKey: 'DELIVERY_COMPLETE', btnText: 'Delivery complete' }
    },
    appTitle: { key: 'DELIVERY_APP', text: 'Delivery app' },
    permissions,
    askLocationPermission,
    redirectToSettings,
    getPermissions,
    handleClickLogisticOrder: route?.params?.handleClickLogisticOrder,
    isGrantedPermissions
  };

  return (
    <SafeAreaContainerLayout paddingHorizontal={0}>
      <OrderDetailsController {...orderDetailsProps} />
    </SafeAreaContainerLayout>
  );
};

export default OrderDetails;
