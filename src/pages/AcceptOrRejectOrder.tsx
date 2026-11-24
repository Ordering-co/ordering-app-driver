import React from 'react';
import {
  AcceptOrRejectOrder as AcceptOrRejectOrderController,
  SafeAreaContainer,
} from '@ui';
import { useGroupStatusUpdate } from '../ui/src/hooks/useGroupStatusUpdate';
import { DRIVER_ACTIONS, DRIVER_APP_TITLE, DRIVER_ORDER_TITLES } from '../ui/src/components/AcceptOrRejectOrder/driverActions';

/** The screen's bottom bar keeps the bottom inset itself: its background reaches the bottom of the screen. */
const ABOVE_THE_BAR: ('top' | 'left' | 'right')[] = ['top', 'left', 'right'];

/**
 * The full screen of the accept / reject view: the reason forms (a rejection, a failure, "order not ready", a forced
 * status) are this route. The sheet actions (`SHEET_ACTIONS`) are presented in place over the screen that asks for them
 * (`useAcceptSheet`) and no screen of the app navigates here with one; the route still draws them for a deep link or
 * an old caller.
 */
const AcceptOrRejectOrder = ({ navigation, route }: any) => {
  // The same rule as the sheets: the screen goes back only when every order changed, and stays, saying why, when not.
  const { update, error, errorCodes, retryAfter } = useGroupStatusUpdate({
    ids: route.params?.ids,
    orders: route.params?.orders ?? (route.params?.order ? [route.params.order] : undefined),
    handleChangeOrderStatus: route.params?.handleChangeOrderStatus,
    onSucceeded: () => navigation?.canGoBack() && navigation.goBack()
  });

  return (
    <SafeAreaContainer edges={ABOVE_THE_BAR}>
      <AcceptOrRejectOrderController
        isPage
        navigation={navigation}
        route={route.params}
        notShowCustomerPhone={false}
        actions={DRIVER_ACTIONS}
        orderTitle={DRIVER_ORDER_TITLES}
        appTitle={DRIVER_APP_TITLE}
        action={route.params.action}
        customerCellphone={route.params?.order?.customer?.cellphone}
        customerCountryPhoneCode={route.params?.order?.customer?.country_phone_code}
        orderId={route.params.ids?.[0]}
        orders={route.params?.orders}
        groupId={route.params?.groupId}
        order={route.params?.order}
        activeOrdersCount={route.params?.activeOrdersCount}
        orderError={error}
        orderErrorCodes={errorCodes}
        orderRetryAfter={retryAfter}
        handleUpdateOrder={update}
        closeModal={() => navigation?.canGoBack() && navigation.goBack()}
      />
    </SafeAreaContainer>
  );
};

export default AcceptOrRejectOrder;
