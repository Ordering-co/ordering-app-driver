import React, { useEffect, useRef } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import OTPInputView from '@twotalltotems/react-native-otp-input';
import { useTheme } from 'styled-components/native';

import { useConfig, useLanguage } from '@components';
import { OText } from '@ui';
import { useDeliveryPin } from '../../hooks/useDeliveryPin';
import { useSecureOrderId } from '../../hooks/useSecureOrderId';

interface SecurityPinFieldsParams {
  orders: Array<any>;
  pins: Record<string, string>;
  onChange: (orderId: number | string, pin: string) => void;
  autoFocus?: boolean;
  requiresConnection?: boolean;
  retryInSeconds?: number;
}

const MAX_FIELD_WIDTH = 38;
const MIN_FIELD_WIDTH = 26;
const FIELD_RATIO = 44 / 38;
const FIELD_GAP = 8;
const CONTENT_PADDING = 60;
const FOCUS_DELAY = 500;

const fieldWidthFor = (count: number) => {
  const available = Dimensions.get('window').width - CONTENT_PADDING;
  const fits = Math.floor((available + FIELD_GAP) / count) - FIELD_GAP;
  return Math.max(MIN_FIELD_WIDTH, Math.min(MAX_FIELD_WIDTH, fits));
};

export const SecurityPinFields = (props: SecurityPinFieldsParams) => {
  const { orders, pins, onChange, autoFocus, requiresConnection, retryInSeconds } = props;

  const otpRefs = useRef<Record<string, any>>({});

  useEffect(() => {
    if (!autoFocus) return;
    const timer = setTimeout(
      () => otpRefs.current[String(orders[0]?.id)]?.focusField?.(0),
      FOCUS_DELAY
    );
    return () => clearTimeout(timer);
  }, []);

  const theme = useTheme();
  const [, t] = useLanguage();
  const [{ configs }] = useConfig();
  const { displayOrderId } = useSecureOrderId();
  const { deliveryPinLength, deliveryPinPrefix, isLegacyPinValid } = useDeliveryPin();

  const showExternalId = configs?.change_order_id?.value === '1';
  const showOrderLabel = orders.length > 1;

  const styles = StyleSheet.create({
    section: {
      width: '100%',
      marginTop: 20,
      marginBottom: 10,
      alignItems: 'center',
    },
    title: {
      marginBottom: 4,
    },
    help: {
      marginBottom: 12,
      textAlign: 'center',
    },
    order: {
      alignItems: 'center',
      marginBottom: 4,
    },
    orderLabel: {
      marginBottom: 6,
    },
    row: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'center',
    },
    box: {
      borderWidth: 1,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.gray100,
      borderColor: theme.colors.gray200,
      marginRight: FIELD_GAP,
      marginBottom: FIELD_GAP,
    },
    otpGroup: {
      marginBottom: FIELD_GAP,
    },
    fieldHighlighted: {
      borderColor: theme.colors.primary,
      color: theme.colors.primary,
    },
    error: {
      textAlign: 'center',
    },
  });

  return (
    <View style={styles.section}>
      <OText size={16} weight="600" style={styles.title}>
        {t('SECURITY_CODE', 'Security code')}
      </OText>
      <OText size={13} color={theme.colors.textSecondary} style={styles.help}>
        {t('ASK_CUSTOMER_DELIVERY_CODE', 'Ask the customer for the delivery code')}
      </OText>

      {orders.map((order) => {
        const id = String(order?.id);
        const pin = pins[id] ?? '';
        const length = deliveryPinLength(order);
        const prefix = deliveryPinPrefix(order);
        const isWrong = pin.length === length && !isLegacyPinValid(order, pin);

        const width = fieldWidthFor(prefix.length + length);
        const height = Math.round(width * FIELD_RATIO);
        const fontSize = Math.max(13, Math.round(width * 0.47));

        return (
          <View key={id} style={styles.order}>
            {showOrderLabel && (
              <OText size={13} weight="600" style={styles.orderLabel}>
                {`${t('ORDER_NO', 'Order No.')} ${displayOrderId(order, showExternalId)}`}
              </OText>
            )}
            <View style={styles.row}>
              {prefix.split('').map((digit: string, index: number) => (
                <View key={index} style={[styles.box, { width, height }]}>
                  <OText size={fontSize} color={theme.colors.unselectText}>
                    {digit}
                  </OText>
                </View>
              ))}
              <View testID={`security-pin-${id}`} style={styles.otpGroup}>
                <OTPInputView
                  ref={(instance: any) => { otpRefs.current[id] = instance; }}
                  autoFocusOnLoad={false}
                  keyboardType="number-pad"
                  style={{
                    width: width * length + FIELD_GAP * (length - 1),
                    height
                  }}
                  pinCount={length}
                  code={pin}
                  codeInputFieldStyle={{
                    width,
                    height,
                    borderWidth: 1,
                    borderRadius: 8,
                    borderColor: theme.colors.gray200,
                    fontSize,
                    color: theme.colors.textGray
                  }}
                  codeInputHighlightStyle={styles.fieldHighlighted}
                  selectionColor={theme.colors.primary}
                  editable
                  onCodeChanged={(code: string) => onChange(order?.id, code)}
                />
              </View>
            </View>
            {isWrong && (
              <OText size={13} color={theme.colors.error} style={styles.error}>
                {t('SECURITY_CODE_DOES_NOT_MATCH', 'The code does not match')}
              </OText>
            )}
          </View>
        );
      })}

      {requiresConnection && (
        <OText size={13} color={theme.colors.error} style={styles.error}>
          {t('DELIVERY_PIN_REQUIRES_CONNECTION', 'You need an internet connection to validate the delivery code')}
        </OText>
      )}

      {!!retryInSeconds && retryInSeconds > 0 && (
        <OText size={13} color={theme.colors.error} style={styles.error}>
          {t('DELIVERY_PIN_RETRY_IN', 'You can try again in _SECONDS_ seconds').replace('_SECONDS_', String(retryInSeconds))}
        </OText>
      )}
    </View>
  );
};
