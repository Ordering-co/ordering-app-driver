import React from 'react';
import { StyleSheet } from 'react-native';
import {
  KeyboardScreen,
  OrderMessage as OrderMessageController,
  SafeAreaContainer,
} from '@ui';

const OrderMessage = ({ navigation, route }: any) => {
  const {
    orderId,
    isFromCheckout,
    setOrders,
    order,
  } = route.params || {};

  const orderDetailsProps = {
    navigation,
    orderId: orderId || order?.id,
    order,
    isFromCheckout,
    setOrders,
    isDisabledOrdersRoom: true,
    goToBack: () => navigation?.canGoBack() && navigation.goBack(),
  };

  // The chat is a stack screen: the app's window on Android is padded by the system bars, which the keyboard's
  // position does not count (`KeyboardScreen` gives the avoiding view that distance), and a composer with no bar
  // under it, as the forms' pinned bar is, shows it as a field half under the keyboard. `padding` on both
  // platforms: the window is not what resizes.
  return (
    <KeyboardScreen
      behavior="padding"
      style={styles.screen}
      windowTestID="chat-window"
      testID="chat-keyboard-screen">
      <SafeAreaContainer edges={['top', 'left', 'right']}>
        <OrderMessageController {...orderDetailsProps} />
      </SafeAreaContainer>
    </KeyboardScreen>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
});

export default OrderMessage;
