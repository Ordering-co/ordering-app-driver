import React, { useState, useEffect } from 'react';
import { Chat } from '../Chat';
import { useTheme } from 'styled-components/native';
import { StyleSheet, View, BackHandler } from 'react-native';

import {
  AvatarWrapper,
  ChatWrapper,
  HeaderContainer,
  HeaderContent,
  TextColumn,
} from './styles';
import { OrderDetailsParams } from '../../types';
import { USER_TYPE } from '../../config/constants';

import {
  useLanguage,
  OrderDetails as OrderDetailsController,
  useSession,
  useUtils
} from '@components';

import { OIcon, OText, OAlertOriginal as Alert, OIconButton, ChatMessageSkeleton } from '@ui';
import { useSecureOrderId } from '../../hooks/useSecureOrderId';

export const OrderMessageUI = (props: OrderDetailsParams) => {
  const {
    navigation,
    messages,
    setMessages,
    readMessages,
    messagesReadList,
    setOrders,
    business: routeBusiness = true,
    driver: routeDriver = false,
    goToBack,
  } = props;

  const [{ optimizeImage }] = useUtils();
  const theme = useTheme();
  const [, t] = useLanguage();
  const [{ user }] = useSession();
  const { maskOrderId } = useSecureOrderId();
  const { order, loading } = props.order;
  const [alertState, setAlertState] = useState<{
    open: boolean;
    content: Array<string>;
    key?: string | null;
  }>({ open: false, content: [], key: null });

  const chatType = routeDriver && !routeBusiness ? USER_TYPE.DRIVER : USER_TYPE.BUSINESS;
  const headerTitle = chatType === USER_TYPE.DRIVER
    ? order?.customer?.name || `${t('INVOICE_ORDER_NO', 'Order No.')} ${maskOrderId(order?.id)}`
    : order?.business?.name || `${t('INVOICE_ORDER_NO', 'Order No.')} ${maskOrderId(order?.id)}`;
  const headerSubtitle = chatType === USER_TYPE.DRIVER
    ? t('CUSTOMER', 'Customer')
    : t('BUSINESS', 'Business');

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

  useEffect(() => {
    if (!order?.id || messages?.loading) return;
    readMessages && readMessages();
  }, [order?.id, messages?.loading, routeBusiness, routeDriver]);

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

  const styles = StyleSheet.create({
    btnBackArrow: {
      borderWidth: 0,
      width: 36,
      height: 36,
      tintColor: theme.colors.textGray,
      backgroundColor: theme.colors.clear,
      borderColor: theme.colors.clear,
      shadowColor: theme.colors.clear,
      paddingLeft: 0,
      paddingRight: 0,
    },
    avatar: {
      height: 40,
      width: 40,
      borderRadius: 20,
      resizeMode: 'cover',
    },
    headerTitle: {
      textAlign: 'left',
    },
    headerSubtitle: {
      textAlign: 'left',
      color: theme.colors.unselectText,
      marginTop: 2,
    },
  });

  return (
    <>
      {(!order || Object.keys(order).length === 0 || loading) && (
        <ChatMessageSkeleton />
      )}

      {order && Object.keys(order).length > 0 && !loading && (
        <View style={{ flex: 1 }}>
          <HeaderContainer>
            <OIconButton
              icon={theme.images.general.arrow_left}
              borderColor={theme.colors.clear}
              iconStyle={{ width: 22, height: 22 }}
              style={styles.btnBackArrow}
              onClick={() => handleArrowBack()}
            />
            <HeaderContent>
              <AvatarWrapper>
                {chatType === USER_TYPE.BUSINESS ? (
                  !!order?.business?.logo ? (
                    <OIcon
                      url={optimizeImage(order?.business?.logo, 'h_300,c_limit')}
                      style={styles.avatar}
                    />
                  ) : (
                    <OIcon
                      src={theme.images.dummies.businessLogo}
                      style={styles.avatar}
                    />
                  )
                ) : (
                  <OIcon
                    url={optimizeImage(
                      order?.customer?.photo ||
                      theme?.images?.dummies?.customerPhoto,
                      'h_300,c_limit',
                    )}
                    style={styles.avatar}
                  />
                )}
              </AvatarWrapper>
              <TextColumn>
                <OText
                  size={17}
                  weight="700"
                  color={theme.colors.textGray}
                  style={styles.headerTitle}
                  numberOfLines={1}
                >
                  {headerTitle}
                </OText>
                <OText size={12} style={styles.headerSubtitle} numberOfLines={1}>
                  {`${headerSubtitle} · ${t('INVOICE_ORDER_NO', 'Order No.')} ${maskOrderId(order?.id)}`}
                </OText>
              </TextColumn>
            </HeaderContent>
          </HeaderContainer>

          <ChatWrapper>
            <Chat
              type={chatType}
              orderId={order?.id}
              messages={messages}
              order={order}
              setMessages={setMessages}
            />
          </ChatWrapper>

          <Alert
            open={alertState.open}
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
