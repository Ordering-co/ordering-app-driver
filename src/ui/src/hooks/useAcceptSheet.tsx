import React, { useCallback, useMemo, useRef, useState } from 'react';

import { AcceptOrRejectOrder } from '../components/AcceptOrRejectOrder';
import { useGroupStatusUpdate } from './useGroupStatusUpdate';
import { DRIVER_ACTIONS, DRIVER_APP_TITLE, DRIVER_ORDER_TITLES } from '../components/AcceptOrRejectOrder/driverActions';

/** What a screen asks the accept view for: the action, the orders it changes and the request it sends. */
export interface AcceptSheetTarget {
  /** One of `SHEET_ACTIONS`: a reason form is a page of its own, not a sheet. */
  action: string;
  ids: number[];
  order?: any;
  /** The orders of a group, when the sheet speaks for the group. */
  orders?: any[];
  groupId?: string;
  activeOrdersCount?: number;
  /** The request the status change makes (the list's own, or the one that saves the delivery time of a request). */
  handleChangeOrderStatus?: (...args: any[]) => any;
  /** The sheet does not change the order's status (the delivery time of an accepted request): it asks for no status photo. */
  skipsStatusImage?: boolean;
  /** Called once, when the sheet is gone (answered, dismissed or queued offline): where the screen goes next. */
  onClosed?: () => void;
}

interface UseAcceptSheetParams {
  actions?: any;
  orderTitle?: any;
  appTitle?: any;
  isLoadingOrder?: boolean;
}

/**
 * Presents the accept view as a sheet over the screen the driver is on, as the order's details present theirs.
 * A route would draw the sheet over an empty page. The screen renders `sheet` (a screen that does not go away
 * while the request runs: a list that empties with the answer would take the sheet with it) and calls `openSheet`.
 * The sheet closes when the request changed every order and stays open when it did not, with the reason as its inline
 * error and its action ready for another try (`useGroupStatusUpdate`).
 */
export const useAcceptSheet = ({
  actions = DRIVER_ACTIONS,
  orderTitle = DRIVER_ORDER_TITLES,
  appTitle = DRIVER_APP_TITLE,
  isLoadingOrder
}: UseAcceptSheetParams = {}) => {
  const [target, setTarget] = useState<AcceptSheetTarget | null>(null);
  // The target as the callbacks of the view see it, and the guard that tells the screen only once.
  const targetRef = useRef<AcceptSheetTarget | null>(null);

  // A failed attempt belongs to the sheet it happened in: a sheet that opens (or goes away) starts clean.
  const resetRef = useRef<() => void>(() => {});

  const openSheet = useCallback((next: AcceptSheetTarget) => {
    resetRef.current();
    targetRef.current = next;
    setTarget(next);
  }, []);

  const closeSheet = useCallback(() => {
    const closing = targetRef.current;
    if (!closing) return;
    resetRef.current();
    targetRef.current = null;
    setTarget(null);
    closing.onClosed?.();
  }, []);

  const { update, reset, error, errorCodes, retryAfter } = useGroupStatusUpdate({
    ids: target?.ids,
    orders: target?.orders ?? (target?.order ? [target.order] : undefined),
    handleChangeOrderStatus: target?.handleChangeOrderStatus,
    onSucceeded: closeSheet
  });
  resetRef.current = reset;

  const sheet = useMemo(() => target && (
    <AcceptOrRejectOrder
      notShowCustomerPhone={false}
      appTitle={appTitle}
      customerCellphone={target.order?.customer?.cellphone}
      customerCountryPhoneCode={target.order?.customer?.country_phone_code}
      action={target.action}
      orderId={target.ids?.[0]}
      order={target.order}
      orders={target.orders}
      groupId={target.groupId}
      activeOrdersCount={target.activeOrdersCount}
      skipsStatusImage={target.skipsStatusImage}
      actions={actions}
      orderTitle={orderTitle}
      isLoadingOrder={isLoadingOrder}
      orderError={error}
      orderErrorCodes={errorCodes}
      orderRetryAfter={retryAfter}
      handleUpdateOrder={update}
      closeModal={closeSheet}
    />
  ), [target, actions, orderTitle, appTitle, isLoadingOrder, closeSheet, update, error, errorCodes, retryAfter]);

  return { openSheet, closeSheet, sheet };
};
