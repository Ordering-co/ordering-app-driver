import { useCallback } from 'react';
import { useConfig } from '@components';
import type { AcceptSheetTarget } from './useAcceptSheet';
import { isOrderGroup } from '../components/AcceptOrRejectOrder/groupOrders';

export interface LogisticAcceptResult {
  error?: boolean;
  order?: any;
  orderIds?: Array<number>;
  defaultEta?: number | null;
}

interface UseLogisticDeliveryTimeParams {
  handleUpdateLogisticOrdersEta?: (orderIds: Array<number>, deliveredIn: number) => Promise<any>;
  /** Presents the accept view as a sheet over the screen the driver is on (`useAcceptSheet`). */
  openAcceptSheet?: (target: AcceptSheetTarget) => void;
  /** What the screen does once the sheet is gone (the request's own screen goes back to the list). */
  onClosed?: () => void;
}

/**
 * Opens the accept sheet, over the screen the driver is on, right after a logistic assign request was accepted,
 * so the driver can enter the delivery time. Only `delivered_in` is persisted — the
 * assign request endpoint already moved the order status.
 *
 * A request that groups several orders gets a sheet that speaks for the group (its orders and its number, as the
 * Pending list's groups do); a single request keeps the sheet of one order.
 *
 * A non-null `defaultEta` means the project saves its own ETA, so nothing is asked,
 * and `hidden_driver_eta_time` hides the delivery time for the whole app.
 */
export const useLogisticDeliveryTime = ({
  handleUpdateLogisticOrdersEta,
  openAcceptSheet,
  onClosed,
}: UseLogisticDeliveryTimeParams) => {
  const [{ configs }] = useConfig();
  const hideTimer = configs?.hidden_driver_eta_time?.value === '1';

  const requestDeliveryTime = useCallback(
    (acceptResult?: LogisticAcceptResult) => {
      const orderIds = (acceptResult?.orderIds ?? []).filter(Boolean);
      const hasDefaultEta = (acceptResult?.defaultEta ?? null) !== null;

      if (
        acceptResult?.error ||
        hideTimer ||
        hasDefaultEta ||
        !orderIds.length ||
        !openAcceptSheet ||
        !handleUpdateLogisticOrdersEta
      ) {
        return false;
      }

      const accepted = acceptResult?.order;
      // The orders the request grouped, as the sheet is to name them (only the ones whose time is saved), and the group's number.
      const groupOrders = (accepted?.order_group?.orders ?? accepted?.order?.order_group?.orders ?? [])
        .filter((groupOrder: any) => orderIds.includes(groupOrder?.id));
      const groupNumber = accepted?.order_group_id ?? accepted?.order_group?.id ?? accepted?.order?.order_group_id;

      openAcceptSheet({
        action: 'accept',
        ids: orderIds,
        order: accepted,
        // The request already moved the status: this only saves the time, so it has no photo of a status to ask for.
        skipsStatusImage: true,
        ...(isOrderGroup(groupOrders) && {
          orders: groupOrders,
          ...(groupNumber != null && groupNumber !== '' && { groupId: String(groupNumber) })
        }),
        handleChangeOrderStatus: (_status: any, ids: Array<number>, body: any) =>
          handleUpdateLogisticOrdersEta(ids, body?.delivered_in),
        onClosed,
      });

      return true;
    },
    [handleUpdateLogisticOrdersEta, openAcceptSheet, onClosed, hideTimer],
  );

  return { requestDeliveryTime };
};
