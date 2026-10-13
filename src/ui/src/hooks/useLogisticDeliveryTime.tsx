import { useCallback } from 'react';
import { useConfig } from '@components';

export interface LogisticAcceptResult {
  error?: boolean;
  order?: any;
  orderIds?: Array<number>;
  defaultEta?: number | null;
}

interface UseLogisticDeliveryTimeParams {
  handleUpdateLogisticOrdersEta?: (orderIds: Array<number>, deliveredIn: number) => Promise<any>;
  onNavigationRedirect?: (page: string, params?: any) => void;
}

/**
 * Opens the regular accept screen right after a logistic assign request was accepted,
 * so the driver can enter the delivery time. Only `delivered_in` is persisted — the
 * assign request endpoint already moved the order status.
 *
 * A non-null `defaultEta` means the project saves its own ETA, so nothing is asked,
 * and `hidden_driver_eta_time` hides the delivery time for the whole app.
 */
export const useLogisticDeliveryTime = ({
  handleUpdateLogisticOrdersEta,
  onNavigationRedirect,
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
        !onNavigationRedirect ||
        !handleUpdateLogisticOrdersEta
      ) {
        return false;
      }

      onNavigationRedirect('AcceptOrRejectOrder', {
        action: 'accept',
        ids: orderIds,
        order: acceptResult?.order,
        handleChangeOrderStatus: (_status: any, ids: Array<number>, body: any) =>
          handleUpdateLogisticOrdersEta(ids, body?.delivered_in),
      });

      return true;
    },
    [handleUpdateLogisticOrdersEta, onNavigationRedirect, hideTimer],
  );

  return { requestDeliveryTime };
};
