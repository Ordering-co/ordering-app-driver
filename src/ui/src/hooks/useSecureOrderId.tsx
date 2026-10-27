import { useApi } from '@components';

const SECURE_ORDER_ID_PROJECTS = ['quickiedelivery', 'luisv4plus'];

const PIN_LENGTH = 4;

export const useSecureOrderId = () => {
  const [ordering] = useApi();

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

  return {
    isSecureProject,
    pinLength,
    idPrefix,
    maskOrderId,
    displayOrderId,
  };
};
