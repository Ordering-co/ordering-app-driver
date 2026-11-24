import { useApi, useLanguage } from '@components';

const SECURE_ORDER_ID_PROJECTS = ['quickiedelivery', 'luisv4plus'];

const PIN_LENGTH = 4;

export const useSecureOrderId = () => {
  const [ordering] = useApi();
  const [, t] = useLanguage();

  const isSecureProject = SECURE_ORDER_ID_PROJECTS.includes(ordering?.project);

  const pinLength = (orderId?: number | string) =>
    Math.min(String(orderId ?? '').length, PIN_LENGTH);

  const idPrefix = (orderId?: number | string) => {
    const id = String(orderId ?? '');
    return id.slice(0, id.length - pinLength(orderId));
  };

  const maskOrderId = (orderId?: number | string) => {
    const id = String(orderId ?? '');
    if (!isSecureProject || !id) return id;
    return idPrefix(orderId) + '*'.repeat(pinLength(orderId));
  };

  const displayOrderId = (order: any, showExternalId?: boolean) =>
    (showExternalId && order?.external_id) || maskOrderId(order?.id);

  /** The id to show of an order (its external id when asked and it has one) or of a bare id, masked in a secure project. */
  const shownId = (order: any, showExternalId?: boolean) =>
    order !== null && typeof order === 'object'
      ? displayOrderId(order, showExternalId)
      : maskOrderId(order);

  /**
   * The order number as every screen writes it: "Order No. 123****", the label,
   * one space and the id, masked in a secure project. It takes an order (with
   * `showExternalId`, its external id when it has one) or a bare id (a payout's
   * `order_id`, a map marker's `id`). Without an id it is the label alone.
   */
  const orderNumberLabel = (order: any, showExternalId?: boolean) =>
    [t('ORDER_NO', 'Order No.'), shownId(order, showExternalId)].filter(Boolean).join(' ');

  /**
   * The number alone, "No. 123****", for the line under a title that already
   * says "Order" (the order's details bar: its three buttons leave no room for
   * the whole label on one line). Empty without an id.
   */
  const orderNumberShort = (order: any, showExternalId?: boolean) => {
    const id = shownId(order, showExternalId);
    return id ? `${t('ORDER_NO_SHORT', 'No.')} ${id}` : '';
  };

  return {
    isSecureProject,
    pinLength,
    idPrefix,
    maskOrderId,
    displayOrderId,
    orderNumberLabel,
    orderNumberShort,
  };
};
