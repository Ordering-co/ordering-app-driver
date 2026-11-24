import React, { useState, useEffect, useMemo } from 'react';
import { Chat } from '../Chat';
import { StyleSheet, View, BackHandler } from 'react-native';

import { OrderDetailsParams } from '../../types';
import { USER_TYPE } from '../../config/constants';

import {
  useLanguage,
  OrderDetails as OrderDetailsController,
  useSession,
  useUtils
} from '@components';

import {
  OAvatar,
  ODivider,
  ONavbar,
  OAlertOriginal as Alert,
  ChatMessageSkeleton,
} from '../shared';
import { useSecureOrderId } from '../../hooks/useSecureOrderId';
import { useOnReconnect } from '../../../../context/SocketReconnectContext';
import { orderStatusName } from '../../utils';

/**
 * The chat screen of an order: the top bar (back, the store's name and its
 * logo) with the order's number under it (the app's one order-number label,
 * masked in a secure project) and its status (the app's one list of names), and
 * the chat (`Chat`). While the order loads it is the chat's skeleton.
 */
const orderMessageStyles = () => StyleSheet.create({
  screen: { flex: 1 },
  chat: { flex: 1 },
})

export const OrderMessageUI = (props: OrderDetailsParams) => {
  const {
    navigation,
    messages,
    setMessages,
    readMessages,
    setOrders,
    goToBack,
  } = props;

  const [{ optimizeImage }] = useUtils();
  const styles = useMemo(() => orderMessageStyles(), []);
  const [, t] = useLanguage();
  const [{ user }] = useSession();
  const { orderNumberLabel } = useSecureOrderId();
  const { order, loading } = props.order;
  const [alertState, setAlertState] = useState<{
    open: boolean;
    content: Array<string>;
    key?: string | null;
  }>({ open: false, content: [], key: null });

  const chatType = USER_TYPE.BUSINESS;
  const headerTitle = order?.business?.name || orderNumberLabel(order);
  // "Order No. 123 · Accepted by driver": the order the chat is about and where it stands. A store with no name
  // leaves the number to the title, so it is not written twice.
  const headerSubtitle = [order?.business?.name ? orderNumberLabel(order) : '', orderStatusName(t, order?.status)]
    .filter(Boolean).join(' · ');

  useEffect(() => {
    if (order?.driver === null && user.level === 4) {
      setAlertState({
        open: true,
        content: [
          t(
            'YOU_HAVE_BEEN_REMOVED_FROM_THE_ORDER',
            'You have been removed from the order',
          ),
        ],
        key: null,
      });
    }
  }, [order?.driver]);

  // The chat is read when it opens and again whenever a message of someone else arrives while it is on screen: the
  // order's count (the list's row, the tab's badge, the details' button) never keeps a message the driver is looking at.
  const lastIncomingId = [...(messages?.messages ?? [])].reverse().find((message: any) => message?.author_id !== user?.id)?.id;
  useEffect(() => {
    if (!order?.id || messages?.loading) return;
    readMessages && readMessages();
  }, [order?.id, messages?.loading, lastIncomingId]);

  // The socket came back: the messages of the gap are lost, so the chat loads them again.
  useOnReconnect(() => {
    if (order?.id) props.loadMessages?.();
  });

  const handleArrowBack = (): boolean => {
    if (order?.unread_count !== undefined) {
      setOrders?.((prevOrders: any) => {
        const { data } = prevOrders;

        const updateOrder = data?.find((_order: any, index: number) => {
          if (_order.id === order?.id) {
            _order.unread_count = 0;
            data.splice(index, 1, _order);
            return true;
          }

          return false;
        });

        if (updateOrder) {
          return { ...prevOrders, data };
        }

        return prevOrders;
      });

      readMessages?.();
    }

    if (goToBack) {
      goToBack();
    } else {
      navigation?.canGoBack() && navigation.goBack();
    }

    return true;
  };

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleArrowBack)
    return () => {
      backHandler.remove()
    }
  }, [order?.unread_count, messages?.messages, goToBack]);

  const backIfDriverDoesntExist = () => {
    if (goToBack) {
      goToBack();
    } else {
      navigation?.canGoBack() && navigation.goBack();
    }
  };

  return (
    <>
      {(!order || Object.keys(order).length === 0 || loading) && (
        <ChatMessageSkeleton onBack={() => handleArrowBack()} />
      )}

      {order && Object.keys(order).length > 0 && !loading && (
        <View style={styles.screen}>
          <ONavbar
            title={headerTitle}
            subtitle={headerSubtitle}
            onBack={() => handleArrowBack()}
            right={(
              <OAvatar
                kind='business'
                size='sm'
                source={order?.business?.logo ? optimizeImage(order?.business?.logo, 'h_300,c_limit') : undefined}
              />
            )}
          />
          <ODivider />

          <View style={styles.chat}>
            <Chat
              type={chatType}
              orderId={order?.id}
              messages={messages}
              order={order}
              setMessages={setMessages}
            />
          </View>

          <Alert
            open={alertState.open}
            notice
            onAccept={backIfDriverDoesntExist}
            onClose={backIfDriverDoesntExist}
            content={alertState.content}
            title={t('ERROR', 'Error')}
          />
        </View>
      )}
    </>
  );
};

export const OrderMessage = (props: OrderDetailsParams) => {
  const orderDetailsProps = {
    ...props,
    driverAndBusinessId: true,
    UIComponent: OrderMessageUI,
  };
  return <OrderDetailsController {...orderDetailsProps} />;
};
