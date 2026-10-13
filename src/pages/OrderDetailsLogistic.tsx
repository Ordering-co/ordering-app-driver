import React from 'react';
import {
  SafeAreaContainerLayout,
  OrderDetailsLogistic as OrderDetailsLogisticController,
} from '@ui';

const OrderDetailsLogistic = ({ navigation, route }: any) => {

  const orderDetailsProps = {
    navigation,
    order: route.params?.order,
    orderAssingId: route.params?.orderAssingId,
    handleClickLogisticOrder: route?.params?.handleClickLogisticOrder,
  };

  return (
    <SafeAreaContainerLayout>
      <OrderDetailsLogisticController {...orderDetailsProps} />
    </SafeAreaContainerLayout>
  );
};

export default OrderDetailsLogistic;
