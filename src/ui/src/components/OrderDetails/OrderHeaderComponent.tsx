import React from 'react';
import { useTheme } from 'styled-components/native';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import SimpleLineIcons from 'react-native-vector-icons/SimpleLineIcons'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'

import {
  Actions,
  Dot,
  Header,
  Messages,
  OrderHeader,
  Section,
} from './styles';

import {
  useLanguage,
  useUtils,
  useConfig,
  useSession
} from '@components';

import {
  OIcon,
  OIconButton,
  OText,
} from '../shared'

import { useSecureOrderId } from '../../hooks/useSecureOrderId'

interface OrderHeader {
  order?: any,
  handleArrowBack?: any,
  handleOpenMapView?: any,
  handleOpenMessagesForBusiness?: any,
  getOrderStatus?: any,
  logisticOrderStatus?: Array<number>,
  handleViewSummaryOrder?: any;
  handleCopyClipboard?: any
  isCustomView?: any
  messages?: any
  messagesReadList?: any
}

export const OrderHeaderComponent = (props: OrderHeader) => {
  const {
    order,
    handleArrowBack,
    handleOpenMapView,
    handleOpenMessagesForBusiness,
    getOrderStatus,
    logisticOrderStatus,
    handleViewSummaryOrder,
    handleCopyClipboard,
    messages,
    messagesReadList
  } = props
  const theme = useTheme();
  const [, t] = useLanguage();
  const [configState] = useConfig()
  const [{ user }] = useSession()
  const [{ parseDate, parsePrice }] = useUtils();
  const paymethodsLength = order?.payment_events?.filter((item: any) => item.event === 'payment')?.length
  const showExternalId = configState?.configs?.change_order_id?.value === '1'
  const { displayOrderId } = useSecureOrderId()
  const messagesReadIds = messagesReadList?.map((message: any) => message?.order_message_id)

  const filteredMessages = messagesReadList?.length > 0 ? messages?.messages?.filter((message: any) => !messagesReadIds?.includes(message?.id)) : messages?.messages
  const cateringTypes = [7, 8]

  const styles = StyleSheet.create({
    icons: {
      maxWidth: 40,
      height: 40,
      padding: 10,
      alignItems: 'flex-end',
      color: theme.colors.gray200,
    },
    btnBackArrow: {
      borderWidth: 0,
      width: 32,
      height: 32,
      tintColor: theme.colors.gray200,
      backgroundColor: theme.colors.clear,
      borderColor: theme.colors.clear,
      shadowColor: theme.colors.clear,
      paddingLeft: 0,
      paddingRight: 0,
      marginTop: 10
    },
    headerText: {
      textAlign: 'center'
    },
    secondaryHeaderContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: 10
    }
  })

  const colors: any = {
    //BLUE
    0: theme.colors.primary,
    3: theme.colors.primary,
    4: theme.colors.primary,
    7: theme.colors.primary,
    8: theme.colors.primary,
    9: theme.colors.primary,
    13: theme.colors.primary,
    14: theme.colors.primary,
    18: theme.colors.primary,
    19: theme.colors.primary,
    20: theme.colors.primary,
    21: theme.colors.primary,
    22: theme.colors.primary,
    23: theme.colors.primary,
    24: theme.colors.primary,
    25: theme.colors.primary,
    26: theme.colors.primary,
    //GREEN
    1: theme.colors.statusOrderGreen,
    11: theme.colors.statusOrderGreen,
    15: theme.colors.statusOrderGreen,
    //RED
    2: theme.colors.statusOrderRed,
    5: theme.colors.statusOrderRed,
    6: theme.colors.statusOrderRed,
    10: theme.colors.statusOrderRed,
    12: theme.colors.statusOrderRed,
    16: theme.colors.statusOrderRed,
    17: theme.colors.statusOrderRed,
  };

  const walletName: any = {
    cash: {
      name: t('CASH_WALLET', 'Cash Wallet'),
    },
    credit_point: {
      name: t('CREDITS_POINTS_WALLET', 'Credit Points Wallet'),
    }
  }

  const orderTypes = (type: number) => type === 1
    ? t('DELIVERY', 'Delivery')
    : order.delivery_type === 2
      ? t('PICKUP', 'Pickup')
      : order.delivery_type === 3
        ? t('EAT_IN', 'Eat in')
        : order.delivery_type === 4
          ? t('CURBSIDE', 'Curbside')
          : t('DRIVER_THRU', 'Driver thru')

  const handlePaymethodsListString = () => {
    const paymethodsList = order?.payment_events?.filter((item: any) => item.event === 'payment').map((paymethod: any) => {
      return paymethod?.data?.wallet_currency
        ? walletName[paymethod?.data?.wallet_currency]?.name
        : paymethod?.paymethod?.gateway && paymethod?.paymethod?.gateway === 'cash' && order?.cash > 0
          ? `${t(paymethod?.paymethod?.gateway?.toUpperCase(), paymethod?.paymethod?.name)} (${t('CASH_CHANGE_OF', 'Change of :amount:').replace(':amount:', parsePrice(order?.cash))})`
          : paymethod?.paymethod?.gateway
            ? t(paymethod?.paymethod?.gateway?.toUpperCase(), paymethod?.paymethod?.name)
            : t(order?.paymethod?.gateway?.toUpperCase(), order?.paymethod?.name)
    })
    return paymethodsList.join(', ')
  }

  const deliveryDate = () => {
    const dateString = order?.delivery_datetime_utc ?? order?.delivery_datetime
    const currentDate = new Date();
    const receivedDate: any = new Date(order?.delivery_datetime);

    const formattedDate = receivedDate <= currentDate
      ? `${t('ASAP_ABBREVIATION', 'ASAP')}(${parseDate(dateString, { utc: !!order?.delivery_datetime_utc })})`
      : parseDate(dateString, { utc: !!order?.delivery_datetime_utc })
    return formattedDate
  }

  return (
    <View style={{ marginBottom: 20 }}>
      <Section style={{ paddingTop: 25, paddingBottom: 10 }}>
        <OText numberOfLines={2} size={24} weight="700" style={{ textAlign: 'center', marginBottom: 15 }}>
          <>
            {`${t('INVOICE_ORDER_NO', 'Order No.')} ${displayOrderId(order, showExternalId)} `}
            {!order?.isLogistic && (!order?.order_group_id || !logisticOrderStatus?.includes(order?.status)) && (
              <>
                {t('IS', 'is')}{' '}
                <OText
                  size={24}
                  weight="700"
                  color={colors[order?.status] || theme.colors.primary}>
                  {getOrderStatus(order?.status, t)?.value}
                </OText>
              </>
            )}
          </>
        </OText>
        {order?.delivery_position != null && (
          <View style={{ alignItems: 'center', marginBottom: 15 }}>
            <View
              style={{
                backgroundColor: theme.colors.primary,
                borderRadius: 12,
                paddingHorizontal: 12,
                paddingVertical: 5,
              }}
            >
              <OText size={13} color={'#fff'} weight="600">
                {t('DELIVERY_NUMBER', 'Delivery') + ` #${order?.delivery_position}`}
              </OText>
            </View>
          </View>
        )}
        <View style={{ borderWidth: 1, borderColor: theme.colors.tabBar }} />
        <View style={{ flexDirection: 'row', marginTop: 15 }}>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <OText size={14} weight='700' style={styles.headerText}>{`${t('ORDER_TYPE', 'Order Type')}`}</OText>
            <OText size={14} weight='400' style={styles.headerText}>
              {orderTypes(order.delivery_type)}
            </OText>
          </View>
          <View style={{ borderWidth: 1, borderColor: theme.colors.tabBar }} />
          <View style={{ flex: 1, alignItems: 'center' }}>
            <OText size={14} weight='700' style={styles.headerText}>
              {`${t(paymethodsLength > 1 ? 'PAYMENT_METHODS' : 'PAYMENT_METHOD', paymethodsLength > 1 ? 'Payment methods' : 'Payment method')}`}
            </OText>
            {order?.payment_events?.length > 0 ? (
              <OText size={14} weight='400' style={styles.headerText}>{`${handlePaymethodsListString()}`}</OText>
            ) : (
              <OText size={14} weight='400' style={styles.headerText}>{`${t(order?.paymethod?.gateway?.toUpperCase(), order?.paymethod?.name)}${order?.paymethod?.gateway === 'cash' && order?.cash ? ` (${t('CASH_CHANGE_OF', 'Change of :amount:').replace(':amount:', parsePrice(order?.cash))})` : ''}`}</OText>
            )}
          </View>
        </View>
      </Section>
      {!order?.isLogistic && !!order?.delivery_type && (!order?.order_group_id || !logisticOrderStatus?.includes(order?.status)) && (
        <>
          {order?.spot_number && (
            <View style={styles.secondaryHeaderContainer}>
              <OText size={12} style={styles.headerText} weight='700'>
                {order?.delivery_type === 3
                  ? t('EATIN_SPOT_NUMBER', 'Table number')
                  : order?.delivery_type === 5
                    ? t('DRIVE_THRU_SPOT_NUMBER', 'Drive thru lane')
                    : t('CURBSIDE_SPOT_NUMBER', 'Spot number')}{': '}
              </OText>
              <OText size={12} style={styles.headerText} weight='400'>{order.spot_number}</OText>
            </View>
          )}
        </>
      )}
      {order?.delivery_type === 9 && order?.reservation && (
        <View style={styles.secondaryHeaderContainer}>
          <OText size={12} style={styles.headerText} weight='700'>
            {t('RESERVATION_SCHEDULED_TO', 'Reservation scheduled to')}{': '}
          </OText>
          <OText size={12} style={styles.headerText} weight='400'>{parseDate(order?.reservation?.reserve_date, { utc: false })}{'\n'}</OText>
          <OText size={12} style={styles.headerText} weight='400'>{order?.reservation?.guests_reservation} {t('GUESTS', 'Guests')}</OText>
        </View>
      )}
      {order?.external_id && !showExternalId && (
        <View style={styles.secondaryHeaderContainer}>
          <OText size={12} style={styles.headerText} weight='700'>
            {t('EXTERNAL_ID', 'External ID')}{': '}
          </OText>
          <OText size={12} style={styles.headerText} weight='400'>
            {order?.external_id}
          </OText>
        </View>
      )}
      {!props.isCustomView && (
        <>
          {cateringTypes.includes(order?.delivery_type) && (
            <View style={styles.secondaryHeaderContainer}>
              <OText size={12} style={styles.headerText} weight='700'>
                {t('CREATED_AT', 'Created at')}{': '}
              </OText>
              <OText size={12} style={styles.headerText} weight='400'>
                {parseDate(order?.created_at)}
              </OText>
            </View>
          )}
          <View style={styles.secondaryHeaderContainer}>
            <OText size={12} style={styles.headerText} weight='700'>
              {t('PLACED_TO', 'Placed to')}{': '}
            </OText>
            <OText size={12} style={styles.headerText} weight='400'>
              {deliveryDate()}
            </OText>
          </View>
        </>
      )}
      {props.isCustomView && (
        <OrderHeader>
          <Header style={{ alignItems: 'center' }}>
            <OText size={12} style={{ marginBottom: 5 }}>
              <>
                {cateringTypes.includes(order?.delivery_type) ? `${t('CREATED_AT', 'Created at')}: ${parseDate(order?.created_at)}\n` : ''}
                {cateringTypes.includes(order?.delivery_type) ? `${t('PLACED_TO', 'Placed to')}: ` : ''}{deliveryDate()}
              </>
            </OText>

            {(!order?.isLogistic || (!logisticOrderStatus?.includes(order?.status) && !order?.order_group)) && (
              <Actions>
                {getOrderStatus(order?.status, t)?.value !==
                  t('PENDING', 'Pending') && (
                    <>
                      <TouchableOpacity onPress={() => handleCopyClipboard?.()}>
                        <MaterialCommunityIcons
                          name='content-copy'
                          color={theme.colors.gray200}
                          size={20}
                          style={styles.icons}
                        />
                      </TouchableOpacity>
                      {!!handleViewSummaryOrder && (
                        <TouchableOpacity onPress={() => handleViewSummaryOrder?.()}>
                          <SimpleLineIcons
                            name='printer'
                            color={theme.colors.gray200}
                            size={20}
                            style={styles.icons}
                          />
                        </TouchableOpacity>
                      )}
                    </>
                  )}
                <OIconButton
                  icon={theme.images.general.map}
                  iconStyle={{
                    width: 20,
                    height: 20,
                    tintColor: theme.colors.gray200,
                  }}
                  borderColor={theme.colors.clear}
                  style={styles.icons}
                  onClick={() => handleOpenMapView()}
                />
                <OIconButton
                  icon={theme.images.general.messages}
                  iconStyle={{
                    width: 20,
                    height: 20,
                    tintColor: theme.colors.gray200,
                  }}
                  borderColor={theme.colors.clear}
                  style={styles.icons}
                  onClick={() => handleOpenMessagesForBusiness()}
                />
              </Actions>
            )}
          </Header>
        </OrderHeader>
      )}
    </View>
  )
}
