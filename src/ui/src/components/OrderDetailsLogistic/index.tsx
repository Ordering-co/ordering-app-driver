import React, { useMemo, useState, useEffect } from 'react';
import { ScrollView, View } from 'react-native';
import { useTheme } from 'styled-components/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OrderDetailsLogisticParams } from '../../types';
import { useSecureOrderId } from '../../hooks/useSecureOrderId';
import { apiErrorText, getOrderStatus } from '../../utils';
import { useLogisticDeliveryTime } from '../../hooks/useLogisticDeliveryTime';
import { useAcceptSheet } from '../../hooks/useAcceptSheet';
import { OrderHeaderComponent } from '../OrderDetails/OrderHeaderComponent';
import { OrderContentComponent } from '../OrderDetails/OrderContentComponent';
import { deliveryStyles } from '../OrderDetails/styles';
import { bottomBarClearance, themeBottomSpace } from '@/theme/helpers';

import { logisticDetailStyles } from './styles';
import { useOnReconnect } from '../../../../context/SocketReconnectContext';
import {
  useLanguage,
  OrderDetails as OrderDetailsConTableoller,
  useSession,
  useConfig
} from '@components';

import { OAlertOriginal as Alert, ONavbar } from '../shared'
import { FloatingButton } from '../FloatingButton'
import { NotFoundSource } from '../NotFoundSource'
import { afterRelease } from '../shared/holdLatch'
import { useRefetchAfterMutation } from '../../hooks/useRefetchAfterMutation'
import { useAnnounceOrderChange } from '../../hooks/useAnnounceOrderChange'
import { OrderDetailsSkeleton } from '../OrderDetails/OrderDetailsSkeleton'

export const OrderDetailsLogisticUI = (props: OrderDetailsLogisticParams) => {
  const {
    navigation,
    handleClickLogisticOrder,
    handleUpdateLogisticOrdersEta,
    orderAssingId,
  } = props;
  const { order } = props.order
  // The socket came back: the request may have been answered or taken meanwhile, so it loads again. Not while this
  // screen is answering it (accept or reject): the older GET could answer after the PUT and show the request as pending again.
  const { track: trackAnswer, catchUp } = useRefetchAfterMutation(() => (props as any).getOrder?.(), !!props.order?.loading)
  useOnReconnect(() => {
    if (order?.id || orderAssingId) catchUp()
  })
  const theme: any = useTheme();
  const [, t] = useLanguage();
  const [session] = useSession();
  const [{ configs }] = useConfig();
  const { orderNumberShort } = useSecureOrderId();
  const insets = useSafeAreaInsets();
  // The delivery time is asked in a sheet over this request, which is already accepted: once it is gone the driver
  // goes back to the list.
  const { openSheet, sheet: acceptSheet } = useAcceptSheet();
  // The answer to the request and the delivery time saved after it are changes of the driver's own made outside the list: each is
  // announced once, when the API answered and it took, so the lists show it without a socket (`OrdersOption` listens).
  const announceOrderChange = useAnnounceOrderChange();
  const saveDeliveryTimes = handleUpdateLogisticOrdersEta && (async (orderIds: Array<number>, deliveredIn: number) => {
    const answer = await handleUpdateLogisticOrdersEta(orderIds, deliveredIn);
    // One answer per order, `null` for one that failed.
    const saved = Array.isArray(answer) ? orderIds.filter((_id, index) => !!answer[index]) : [];
    if (saved.length) announceOrderChange({ orderIds: saved });
    return answer;
  });
  const { requestDeliveryTime } = useLogisticDeliveryTime({
    handleUpdateLogisticOrdersEta: saveDeliveryTimes,
    openAcceptSheet: openSheet,
    onClosed: () => handleArrowBack(),
  });

  const [alertState, setAlertState] = useState<{
    open: boolean;
    content: Array<string>;
    key?: string | null;
  }>({ open: false, content: [], key: null });

  const logisticOrderStatus = [4, 6, 7]
  const isHideRejectButtons = configs?.reject_orders_enabled && configs?.reject_orders_enabled?.value !== '1'

  const showFloatButtonsAcceptOrReject: any = {
    0: true,
    4: true,
    7: true,
    14: true
  };
  const showAcceptOrRejectButtons = !!showFloatButtonsAcceptOrReject[order?.status]

  // The scroll leaves the room of the bottom bar (accept over reject) under its content, as the order's details do.
  const clearance = showAcceptOrRejectButtons
    ? bottomBarClearance(theme, insets.bottom, isHideRejectButtons ? 1 : 2)
    : themeBottomSpace(theme, insets.bottom)
  const styles = useMemo(() => logisticDetailStyles(theme), [theme])
  // The order's sections are the scroll's children: the scroll lays them out as the order's details lay theirs.
  const details = useMemo(() => deliveryStyles(theme, clearance), [theme, clearance])

  const handleArrowBack: any = () => {
    navigation?.canGoBack() && navigation.goBack();
  };

  /** Answers the request, counted as in flight, and announces it once the API answered and it took. The screen may be gone by then. */
  const answerRequest = (status: 1 | 2, order: any) => trackAnswer(async () => {
    const answer: any = await handleClickLogisticOrder?.(status, orderAssingId || order?.logistic_order_id, order)
    if (answer && answer.error === false) {
      announceOrderChange({ orderIds: answer.orderIds ?? [order?.order?.id ?? order?.id].filter(Boolean), request: true, accepted: status === 1 })
    }
    return answer
  })

  const handleRejectLogisticOrder = (order: any) => {
    answerRequest(2, order).catch(() => {})
    // The reject is held and answers with the finger still on its button: going back waits for it to lift.
    afterRelease(handleArrowBack)
  }

  const handleAcceptLogisticOrder = async (order: any) => {
    const result = await answerRequest(1, order)
    if (!requestDeliveryTime(result)) handleArrowBack()
  }

  useEffect(() => {
    if (order?.driver === null && session?.user?.level === 4) {
      setAlertState({
        open: true,
        content: [
          t(
            'YOU_HAVE_BEEN_REMOVED_FROM_THE_ORDER',
            'You have been removed from the order',
          ),
        ],
        key: null,
      });
    }
  }, [order?.driver]);

  const isLoading = (!order || Object.keys(order).length === 0) &&
    (props.order?.error?.length < 1 || !props.order?.error)
  const hasError = !!props.order?.error
  const hasOrder = !isLoading && !!order && Object.keys(order).length > 0
  // The bar is the order's details': "Order" and, under it, the order's number once there is an order
  // (the bar is the same in every state of the screen).
  const showExternalId = configs?.change_order_id?.value === '1'
  const barNumber = order?.id ? orderNumberShort(order, showExternalId) : undefined

  return (
    <>
      <View style={styles.screen}>
        {/* The bar of the order's details, in every state: loading, error and the order. */}
        <ONavbar title={t('ORDER', 'Order')} subtitle={barNumber} onBack={() => handleArrowBack()} />
        {isLoading && <OrderDetailsSkeleton />}

        {hasError && (
          <View style={styles.gutter}>
            <NotFoundSource
              btnTitle={t('GO_TO_MY_ORDERS', 'Go to my orders')}
              content={apiErrorText(props.order.error, t)}
              onClickButton={() => navigation.popTo('BottomTab', { screen: 'Orders' })}
            />
          </View>
        )}

        {hasOrder && (
          <>
            <View style={styles.header}>
              <OrderHeaderComponent
                order={order}
                getOrderStatus={getOrderStatus}
                logisticOrderStatus={logisticOrderStatus}
              />
            </View>
            {!hasError && (
              <>
                <ScrollView
                  testID='logistic-details-scroll'
                  style={details.scroll}
                  contentContainerStyle={details.content}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  {order?.order_group && !!order?.order_group_id && order?.isLogistic ? order?.order_group?.orders.map((order: any) => (
                    <OrderContentComponent
                      key={order?.id}
                      order={order}
                      logisticOrderStatus={logisticOrderStatus}
                      isOrderGroup
                    />
                  )) : (
                    <OrderContentComponent
                      order={order}
                      logisticOrderStatus={logisticOrderStatus}
                    />
                  )}
                </ScrollView>

                {showAcceptOrRejectButtons && (
                  <FloatingButton
                    btnText={t('REJECT', 'Reject')}
                    // The request is answered here, in one tap of the bar. Rejecting cannot be taken back, so it is held;
                    // accepting is never held (the time is valuable there): a single tap.
                    secondButtonClick={() => handleAcceptLogisticOrder(order)}
                    firstButtonClick={() => handleRejectLogisticOrder(order)}
                    firstButtonHold
                    secondBtnText={t('ACCEPT', 'Accept')}
                    secondButton={true}
                    isHideRejectButtons={isHideRejectButtons}
                    isPadding={true}
                  />
                )}
              </>
            )}
          </>
        )}
      </View>
      {acceptSheet}
      {alertState?.open && (
        <Alert
          open={alertState.open}
          notice
          onAccept={handleArrowBack}
          onClose={handleArrowBack}
          content={alertState.content}
          title={t('WARNING', 'Warning')}
        />
      )}
    </>
  );
};

export const OrderDetailsLogistic = (props: OrderDetailsLogisticParams) => {
  const orderDetailsProps = {
    ...props,
    UIComponent: OrderDetailsLogisticUI,
  };
  return <OrderDetailsConTableoller {...orderDetailsProps} />;
};
