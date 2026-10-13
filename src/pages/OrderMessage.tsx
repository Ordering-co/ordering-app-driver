import React from 'react';
import {
  OrderMessage as OrderMessageController,
  SafeAreaContainer,
} from '@ui';

const OrderMessage = ({ navigation, route }: any) => {
  const {
    orderId,
    isFromCheckout,
    setOrders,
    business,
    driver,
    order,
  } = route.params || {};

  const orderDetailsProps = {
    navigation,
    orderId: orderId || order?.id,
    order,
    isFromCheckout,
    setOrders,
    business,
    driver,
    isDisabledOrdersRoom: true,
    goToBack: () => navigation?.canGoBack() && navigation.goBack(),
  };

  return (
    <SafeAreaContainer edges={['top', 'left', 'right']}>
      <OrderMessageController {...orderDetailsProps} />
    </SafeAreaContainer>
  );
};

export default OrderMessage;
