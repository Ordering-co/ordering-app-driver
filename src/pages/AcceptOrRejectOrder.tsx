import React from 'react';
import {
  AcceptOrRejectOrder as AcceptOrRejectOrderController,
  SafeAreaContainer,
} from '@ui';

const AcceptOrRejectOrder = ({ navigation, route }: any) => {
  return (
    <SafeAreaContainer>
      <AcceptOrRejectOrderController
        isPage
        navigation={navigation}
        route={route.params}
        notShowCustomerPhone={false}
        actions={{
          accept: 'acceptByDriver',
          reject: 'rejectByDriver',
          pickupFailed: 'pickupFailedByDriver',
          deliveryFailed: 'deliveryFailedByDriver',
          notReady: 'orderNotReady',
          forcePickUp: 'forcePickUp',
          forceDelivery: 'forceDelivery',
          forceStatus: 'forceStatus'
        }}
        orderTitle={{
          accept: { key: 'DELIVERY_TIME', text: 'Delivery time', btnKey: 'ACCEPT', btnText: 'Accept' },
          reject: { key: 'REJECT_ORDER', text: 'Reject Order', btnKey: 'REJECT', btnText: 'Reject' },
          pickupFailed: { key: 'PICKUP_FAILED', text: 'Pickup Failed', btnKey: 'PICKUP_FAILED', btnText: 'Pickup Failed' },
          deliveryFailed: { key: 'DELIVERY_FAILED', text: 'Delivery Failed', btnKey: 'DELIVERY_FAILED', btnText: 'Delivery Failed' },
          notReady: { key: 'ORDER_NOT_READY', text: 'Order not ready', btnKey: 'ORDER_NOT_READY', btnText: 'Order not ready' },
          forcePickUp: { key: 'FORCED_MARK_ORDER_AS_PICKUP', text: 'FORCED_MARK_ORDER_AS_PICKUP', btnKey: 'MOBILE_PICKUP_COMPLETE', btnText: 'PickUp Completed'},
          forceDelivery: { key: 'FORCED_MARK_ORDER_AS_DELIVERY', text: 'FORCED_MARK_ORDER_AS_DELIVERY', btnKey: 'MOBILE_DELIVERY_COMPLETE', btnText: 'Delivery Completed'},
          forceStatus: { key: 'REASON_REQUIRED', text: 'Reason required', btnKey: 'CONFIRM', btnText: 'Confirm' },
          arrivedToBusiness: { key: 'ARRIVED_TO_BUSINESS', text: 'Arrived to bussiness', btnKey: 'ARRIVED_TO_BUSINESS', btnText: 'Arrived to bussiness' },
          pickupComplete: { key: 'PICKUP_COMPLETE', text: 'Pickup complete', btnKey: 'PICKUP_COMPLETE', btnText: 'Pickup complete' },
          deliveryComplete: { key: 'DELIVERY_COMPLETE', text: 'Delivery complete', btnKey: 'DELIVERY_COMPLETE', btnText: 'Delivery complete' }
        }}
        appTitle={{ key: 'DELIVERY_APP', text: 'Delivery app' }}
        action={route.params.action}
        customerCellphone={route.params?.order?.customer?.cellphone}
        orderId={route.params.ids?.[0]}
        orders={route.params?.orders}
        order={route.params?.order}
        activeOrdersCount={route.params?.activeOrdersCount}
        handleUpdateOrder={async (param1: any, param2: any, param3: any) => {
          const ids = route.params?.ids
          const handleChangeOrderStatus = route.params?.handleChangeOrderStatus
          if (!handleChangeOrderStatus) return
          const deliveryPins = param3?.deliveryPins
          if (!deliveryPins) {
            const result = await handleChangeOrderStatus(param1, ids, param2)
            const succeeded = result?.length === ids?.length
            succeeded && navigation?.canGoBack() && navigation.goBack()
            return succeeded
          }
          const responses = (await Promise.all(ids.map((id: number) =>
            handleChangeOrderStatus(param1, [id], { ...param2, delivery_pin: deliveryPins[String(id)] }, { withDetails: true })
          ))).flat()
          param3?.onStatusResponses?.(responses)
          const succeeded = responses.every((response: any) => typeof response === 'object' && response && !response.error)
          succeeded && navigation?.canGoBack() && navigation.goBack()
          return succeeded
        }}
        closeModal={() => navigation?.canGoBack() && navigation.goBack()}
      />
    </SafeAreaContainer>
  );
};

export default AcceptOrRejectOrder;
