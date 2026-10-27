import React from 'react';
import { KeyboardAvoidingView, Platform, StatusBar, StyleSheet } from 'react-native';
import {
  OrderMessage as OrderMessageController,
  SafeAreaContainer,
} from '@ui';
import { useKeyboardVisible } from '../hooks/useKeyboardVisible';

const OrderMessage = ({ navigation, route }: any) => {
  const isKeyboardVisible = useKeyboardVisible();
  // MainActivity places Android's native content below the system status bar.
  const keyboardVerticalOffset = Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0;
  const {
    orderId,
    isFromCheckout,
    setOrders,
    business,
    driver,
    order,
  } = route.params || {};

  const orderDetailsProps = {
    navigation,
    orderId: orderId || order?.id,
    order,
    isFromCheckout,
    setOrders,
    business,
    driver,
    isDisabledOrdersRoom: true,
    goToBack: () => navigation?.canGoBack() && navigation.goBack(),
  };

  // Android's window-relative hide event must not retain status-bar padding.
  return (
    <KeyboardAvoidingView
      behavior="padding"
      keyboardVerticalOffset={keyboardVerticalOffset}
      enabled={Platform.OS !== 'android' || isKeyboardVisible}
      style={styles.screen}
      testID="chat-keyboard-screen">
      <SafeAreaContainer edges={['top', 'left', 'right']}>
        <OrderMessageController {...orderDetailsProps} />
      </SafeAreaContainer>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
});

export default OrderMessage;
