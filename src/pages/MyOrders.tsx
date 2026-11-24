import React from 'react';
import { useNetInfo } from '@react-native-community/netinfo';

import {
  OrdersOption,
  SafeAreaContainerLayout,
} from '@ui';
import { usePageSections } from '@/theme/sections';
import { DRIVER_ACTIONS, DRIVER_APP_TITLE, DRIVER_ORDER_TITLES } from '../ui/src/components/AcceptOrRejectOrder/driverActions';

const MyOrders = (props: any) => {
  const netInfo = useNetInfo();

  const { navigation, route } = props;
  // The summary table (section `summary` of the page `orders`) reads more orders per page when a theme shows it.
  const hasSummary = usePageSections('orders').isVisible('summary');

  const MyOrderProps = {
    navigation,
    // The list the new-order alert asks for (`openOrdersTab`), as the route's params carry it.
    tabRequest: route?.params?.at ? route.params : undefined,
    onNavigationRedirect: (page: string, params: any) => {
      if (!page) return;
      navigation.navigate(page, params);
    },
    checkNotification: true,
    isNetConnected: netInfo.isConnected,
    isDriverApp: true,
    useDefualtSessionManager: true,
    orderDetailsProps: {
      actions: DRIVER_ACTIONS,
      orderTitle: DRIVER_ORDER_TITLES,
      appTitle: DRIVER_APP_TITLE,
    },
    paginationSettings: {
      initialPage: 1,
      pageSize: 10,
      ...(hasSummary && { filteredPageSize: 50 }),
      controlType: 'infinity',
    },
    orderGroupStatusCustom: {
      active: [0, 3, 4, 7, 8, 9, 13, 14, 18, 19, 20, 21, 22, 23, 24, 25, 26],
      pending: [0, 13],
      inProgress: [3, 4, 7, 8, 9, 14, 18, 19, 20, 21, 22, 23, 24, 25, 26],
    },
  };

  return (
    <SafeAreaContainerLayout>
      <OrdersOption {...MyOrderProps} />
    </SafeAreaContainerLayout>
  );
};

export default MyOrders;
