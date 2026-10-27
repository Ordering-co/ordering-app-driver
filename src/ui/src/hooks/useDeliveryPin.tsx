import { useConfig } from '@components';
import { useSecureOrderId } from './useSecureOrderId';

export const DELIVERY_PIN_LENGTH = 4;

export const DELIVERY_PIN_STATUS_REQUESTED = 'requested';

export const useDeliveryPin = () => {
  const [{ configs }] = useConfig();
  const { isSecureProject, pinLength, idPrefix } = useSecureOrderId();

  const isDeliveryPinEnabled = configs?.delivery_pin_enabled?.value === '1';
  const usesLegacyPin = !isDeliveryPinEnabled && isSecureProject;

  const requiresDeliveryPin = (order: any) =>
    isDeliveryPinEnabled
      ? order?.delivery_pin_status === DELIVERY_PIN_STATUS_REQUESTED
      : usesLegacyPin && !!order?.id;

  const deliveryPinLength = (order?: any) =>
    usesLegacyPin ? pinLength(order?.id) : DELIVERY_PIN_LENGTH;

  const deliveryPinPrefix = (order?: any) =>
    usesLegacyPin ? idPrefix(order?.id) : '';

  const isDeliveryPinComplete = (pin?: string, order?: any) =>
    !!pin && /^\d+$/.test(pin) && pin.length === deliveryPinLength(order);

  const isLegacyPinValid = (order: any, pin?: string) => {
    if (!usesLegacyPin) return true;
    const id = String(order?.id ?? '');
    return !!id && id.slice(id.length - deliveryPinLength(order)) === pin;
  };

  return {
    isDeliveryPinEnabled,
    usesLegacyPin,
    requiresDeliveryPin,
    deliveryPinLength,
    deliveryPinPrefix,
    isDeliveryPinComplete,
    isLegacyPinValid,
  };
};
