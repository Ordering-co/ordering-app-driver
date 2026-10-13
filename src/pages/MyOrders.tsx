import React, { useContext, useEffect, useState } from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import { useTheme } from 'styled-components/native';
import { useNetInfo } from '@react-native-community/netinfo';

import {
  OrdersOption,
  SafeAreaContainerLayout,
} from '@ui';
import { useApi } from '@components';

import { SUMMARY_ENABLED_PROJECTS } from '../ui/src/components/OrdersOption/orderSummaryUtils';
import { PermissionsContext } from '../context/PermissionsContext';
import settings from '../config.json'

const MyOrders = (props: any) => {
  const theme = useTheme();
  const netInfo = useNetInfo();

  const { navigation } = props;
  const [ordering] = useApi();
  const isSummaryProject = SUMMARY_ENABLED_PROJECTS.includes(ordering?.project);
  const { isGrantedPermissions } = useContext(PermissionsContext);
  const [showPermissionModal, setPermissionModal] = useState(false)

  const MyOrderProps = {
    navigation,
    onNavigationRedirect: (page: string, params: any) => {
      if (!page) return;
      navigation.navigate(page, params);
    },
    checkNotification: true,
    isNetConnected: netInfo.isConnected,
    isDriverApp: true,
    useDefualtSessionManager: true,
    orderDetailsProps: {
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
    },
    paginationSettings: {
      initialPage: 1,
      pageSize: 10,
      ...(isSummaryProject && { filteredPageSize: 50 }),
      controlType: 'infinity',
    },
    orderGroupStatusCustom: {
      active: [0, 3, 4, 7, 8, 9, 13, 14, 18, 19, 20, 21, 22, 23, 24, 25, 26],
      pending: [0, 13],
      inProgress: [3, 4, 7, 8, 9, 14, 18, 19, 20, 21, 22, 23, 24, 25, 26],
    },
  };

  const styles = StyleSheet.create({
    container: {
      backgroundColor: theme.colors.backgroundPage,
    },
    modalView: {
      backgroundColor: '#FFF',
      alignItems: 'center',
      borderRadius: 8,
      width: Dimensions.get('screen').width * .9,
      height: Dimensions.get('screen').height * .7,
      paddingTop: 45,
    },
    wrapperIcon: {
      position: 'absolute',
      right: 20,
      top: 20
    },
    modalContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.4)'
    }
  });

  useEffect(() => {
    setPermissionModal(!isGrantedPermissions)
  }, [isGrantedPermissions]);

  return (
    <SafeAreaContainerLayout style={styles.container}>
      <OrdersOption {...MyOrderProps} />
    </SafeAreaContainerLayout>
  );
};

export default MyOrders;
