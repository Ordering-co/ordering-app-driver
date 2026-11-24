import React, { useEffect, useMemo, useRef } from 'react';
import { View } from 'react-native';
import { useTheme } from 'styled-components/native';

import { useConfig, useLanguage } from '@components';
import { FieldError, OOtpInput, OText } from '../shared';
import { BlockLabel } from './BlockLabel';
import type { OOtpInputHandle } from '../shared/OOtpInput';
import { useDeliveryPin } from '../../hooks/useDeliveryPin';
import { useSecureOrderId } from '../../hooks/useSecureOrderId';
import { securityPinStyles } from './styles';

interface SecurityPinFieldsParams {
  orders: Array<any>;
  pins: Record<string, string>;
  onChange: (orderId: number | string, pin: string) => void;
  autoFocus?: boolean;
  requiresConnection?: boolean;
  retryInSeconds?: number;
  /** What the server answered to the last try (the code does not match): it comes before the wait it caused. */
  error?: React.ReactNode;
}

/** The first code takes the focus once the screen's window settled (a modal still opening drops the keyboard). */
const FOCUS_DELAY = 500;

/**
 * The customer's delivery code, one per order: a section of the screen (its
 * title and the line under it are the app's section title), then the app's
 * code entry (`OOtpInput`, decision D6), centered, after the digits the order
 * already gives (the prefix of a legacy code). Its errors are the field's
 * (`FieldError`), centered as the code they stand under.
 */
export const SecurityPinFields = (props: SecurityPinFieldsParams) => {
  const { orders, pins, onChange, autoFocus, requiresConnection, retryInSeconds, error } = props;

  // The first code takes the focus after the delay (`focus()` of its handle).
  const firstCode = useRef<OOtpInputHandle>(null);
  useEffect(() => {
    if (!autoFocus) return;
    const timer = setTimeout(() => firstCode.current?.focus(), FOCUS_DELAY);
    return () => clearTimeout(timer);
  }, []);

  const theme: any = useTheme();
  const [, t] = useLanguage();
  const [{ configs }] = useConfig();
  const { orderNumberLabel } = useSecureOrderId();
  const { deliveryPinLength, deliveryPinPrefix, isLegacyPinValid } = useDeliveryPin();
  const styles = useMemo(() => securityPinStyles(theme), [theme]);

  const showExternalId = configs?.change_order_id?.value === '1';
  const showOrderLabel = orders.length > 1;

  return (
    <View testID='security-pin'>
      <BlockLabel description={t('ASK_CUSTOMER_DELIVERY_CODE', 'Ask the customer for the delivery code')}>
        {t('SECURITY_CODE', 'Security code')}
      </BlockLabel>

      <View style={styles.codes}>
        {orders.map((order, index) => {
          const id = String(order?.id);
          const pin = pins[id] ?? '';
          const length = deliveryPinLength(order);
          const prefix = deliveryPinPrefix(order);
          const isWrong = pin.length === length && !isLegacyPinValid(order, pin);

          return (
            <View key={id} style={styles.order}>
              {showOrderLabel && (
                <OText preset='label'>
                  {orderNumberLabel(order, showExternalId)}
                </OText>
              )}
              <View style={styles.entry}>
                <View style={styles.row}>
                  {!!prefix && <OText style={styles.prefix}>{prefix}</OText>}
                  <OOtpInput
                    ref={index === 0 ? firstCode : undefined}
                    testID={`security-pin-${id}`}
                    length={length}
                    value={pin}
                    onChange={(code: string) => onChange(order?.id, code)}
                    hasError={isWrong}
                    accessibilityLabel={`${t('SECURITY_CODE', 'Security code')}, ${orderNumberLabel(order, showExternalId)}`}
                  />
                </View>
                {isWrong && (
                  <FieldError center testID={`security-pin-${id}-error`}>
                    {t('SECURITY_CODE_DOES_NOT_MATCH', 'The code does not match')}
                  </FieldError>
                )}
              </View>
            </View>
          );
        })}
      </View>

      {error}

      {requiresConnection && (
        <FieldError center>
          {t('DELIVERY_PIN_REQUIRES_CONNECTION', 'You need an internet connection to validate the delivery code')}
        </FieldError>
      )}

      {!!retryInSeconds && retryInSeconds > 0 && (
        <FieldError center>
          {t('DELIVERY_PIN_RETRY_IN', 'You can try again in _SECONDS_ seconds').replace('_SECONDS_', String(retryInSeconds))}
        </FieldError>
      )}
    </View>
  );
};
