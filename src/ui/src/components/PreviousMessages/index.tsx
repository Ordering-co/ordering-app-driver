import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, FlatList, RefreshControl, View, ScrollView } from 'react-native';
import FastImage from 'react-native-fast-image';
import { useTheme } from 'styled-components/native';

import { Card, Logo, Information, Header, Badge } from './styles';
import { PreviousMessagesParams } from '../../types';
import { FooterComponent } from './FooterMessageComponent';

import { useLanguage, useUtils } from '@components';
import { OText, OrderListSkeleton } from '../shared';
import { useSecureOrderId } from '../../hooks/useSecureOrderId';
import moment from 'moment';

const activeStatus = [0, 3, 4, 7, 8, 9, 13, 14, 18, 19, 20, 21, 22, 23, 24, 25, 26]

export const PreviousMessages = (props: PreviousMessagesParams) => {
  const {
    orders,
    onNavigationRedirect,
    setOrders,
    getOrders,
    pagination,
    loading,
    reload,
    tabs,
    loadMore,
    tabsFilter,
    error
  } = props;

  const [, t] = useLanguage();
  const theme = useTheme();
  const [{ parseDate, optimizeImage }] = useUtils();
  const { maskOrderId } = useSecureOrderId();
  const [refreshing] = useState(false);

  const handlePressOrder = (order: any) => {
    const uuid = order?.id;

    onNavigationRedirect &&
      onNavigationRedirect('OrderMessage', { orderId: uuid, setOrders });
  };

  const getOrderStatus = (s: string) => {
    const status = parseInt(s);
    const orderStatus = [
      {
        key: 0,
        value: t('PENDING', 'Pending'),
        slug: 'PENDING',
        percentage: 0.25,
      },
      {
        key: 1,
        value: t('COMPLETED', 'Completed'),
        slug: 'COMPLETED',
        percentage: 1,
      },
      {
        key: 2,
        value: t('REJECTED', 'Rejected'),
        slug: 'REJECTED',
        percentage: 0,
      },
      {
        key: 3,
        value: t('DRIVER_IN_BUSINESS', 'Driver in business'),
        slug: 'DRIVER_IN_BUSINESS',
        percentage: 0.6,
      },
      {
        key: 4,
        value: t('PREPARATION_COMPLETED', 'Preparation Completed'),
        slug: 'PREPARATION_COMPLETED',
        percentage: 0.7,
      },
      {
        key: 5,
        value: t('REJECTED', 'Rejected'),
        slug: 'REJECTED_BY_BUSINESS',
        percentage: 0,
      },
      {
        key: 6,
        value: t('REJECTED_BY_DRIVER', 'Rejected by Driver'),
        slug: 'REJECTED_BY_DRIVER',
        percentage: 0,
      },
      {
        key: 7,
        value: t('ACCEPTED_BY_BUSINESS', 'Accepted by business'),
        slug: 'ACCEPTED_BY_BUSINESS',
        percentage: 0.35,
      },
      {
        key: 8,
        value: t('ACCEPTED_BY_DRIVER', 'Accepted by driver'),
        slug: 'ACCEPTED_BY_DRIVER',
        percentage: 0.45,
      },
      {
        key: 9,
        value: t('PICK_UP_COMPLETED_BY_DRIVER', 'Pick up completed by driver'),
        slug: 'PICK_UP_COMPLETED_BY_DRIVER',
        percentage: 0.8,
      },
      {
        key: 10,
        value: t('PICK_UP_FAILED_BY_DRIVER', 'Pick up Failed by driver'),
        slug: 'PICK_UP_FAILED_BY_DRIVER',
        percentage: 0,
      },
      {
        key: 11,
        value: t(
          'DELIVERY_COMPLETED_BY_DRIVER',
          'Delivery completed by driver',
        ),
        slug: 'DELIVERY_COMPLETED_BY_DRIVER',
        percentage: 1,
      },
      {
        key: 12,
        value: t('DELIVERY_FAILED_BY_DRIVER', 'Delivery Failed by driver'),
        slug: 'DELIVERY_FAILED_BY_DRIVER',
        percentage: 0,
      },
      {
        key: 13,
        value: t('PREORDER', 'PreOrder'),
        slug: 'PREORDER',
        percentage: 0,
      },
      {
        key: 14,
        value: t('ORDER_NOT_READY', 'Order not ready'),
        slug: 'ORDER_NOT_READY',
        percentage: 0,
      },
      {
        key: 15,
        value: t(
          'ORDER_PICKEDUP_COMPLETED_BY_CUSTOMER',
          'Order picked up completed by customer',
        ),
        slug: 'ORDER_PICKEDUP_COMPLETED_BY_CUSTOMER',
        percentage: 100,
      },
      {
        key: 16,
        value: t('CANCELLED_BY_CUSTOMER', 'Cancelled by customer'),
        slug: 'CANCELLED_BY_CUSTOMER',
        percentage: 0,
      },
      {
        key: 17,
        value: t(
          'ORDER_NOT_PICKEDUP_BY_CUSTOMER',
          'Order not picked up by customer',
        ),
        slug: 'ORDER_NOT_PICKEDUP_BY_CUSTOMER',
        percentage: 0,
      },
      {
        key: 18,
        value: t(
          'ORDER_DRIVER_ALMOST_ARRIVED_BUSINESS',
          'Driver almost arrived to business',
        ),
        slug: 'ORDER_DRIVER_ALMOST_ARRIVED_BUSINESS',
        percentage: 0.15,
      },
      {
        key: 19,
        value: t(
          'ORDER_DRIVER_ALMOST_ARRIVED_CUSTOMER',
          'Driver almost arrived to customer',
        ),
        slug: 'ORDER_DRIVER_ALMOST_ARRIVED_CUSTOMER',
        percentage: 0.9,
      },
      {
        key: 20,
        value: t(
          'ORDER_CUSTOMER_ALMOST_ARRIVED_BUSINESS',
          'Customer almost arrived to business',
        ),
        slug: 'ORDER_CUSTOMER_ALMOST_ARRIVED_BUSINESS',
        percentage: 90,
      },
      {
        key: 21,
        value: t(
          'ORDER_CUSTOMER_ARRIVED_BUSINESS',
          'Customer arrived to business',
        ),
        slug: 'ORDER_CUSTOMER_ARRIVED_BUSINESS',
        percentage: 95,
      },
      {
        key: 22,
        value: t('ORDER_LOOKING_FOR_DRIVER', 'Looking for driver'),
        slug: 'ORDER_LOOKING_FOR_DRIVER',
        percentage: 35
      },
      {
        key: 23,
        value: t('ORDER_DRIVER_ON_WAY', 'Driver on way'),
        slug: 'ORDER_DRIVER_ON_WAY',
        percentage: 45
      },
      {
        key: 24,
        value: t('ORDER_DRIVER_WAITING_FOR_ORDER', 'Driver waiting for order'),
        slug: 'ORDER_DRIVER_WAITING_FOR_ORDER',
        percentage: 25
      },
      {
        key: 25,
        value: t('ORDER_ACCEPTED_BY_DRIVER_COMPANY', 'Accepted by driver company'),
        slug: 'ORDER_ACCEPTED_BY_DRIVER_COMPANY',
        percentage: 25
      },
      {
        key: 26,
        value: t('ORDER_DRIVER_ARRIVED_CUSTOMER', 'Driver arrived to customer'),
        slug: 'ORDER_DRIVER_ARRIVED_CUSTOMER',
        percentage: 80
      }
    ];

    const objectStatus = orderStatus.find(o => o.key === status);

    return objectStatus && objectStatus;
  };

  const styles = StyleSheet.create({
    cardButton: {
      flex: 1,
      height: 100,
      minHeight: 64,
      marginBottom: 30,
      marginLeft: 3,
      borderRadius: 10,
      paddingTop: 10,
      borderWidth: 1,
      borderColor: theme.colors.gray100,
    },
    icon: {
      borderRadius: 7.6,
      width: 75,
      height: 75,
    },
    logo: {
      borderRadius: 10,
      shadowColor: "#0000006e",
      shadowRadius: 10,
      elevation: 15,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 3,
    },
    title: {
      fontSize: 16,
      color: theme.colors.textGray,
      fontFamily: theme.fonts.primary.name,
      fontWeight: '700',
    },
    badge: {
      fontSize: 12,
      color: theme.colors.primary,
    },
    date: {
      fontSize: 12,
      fontWeight: '400',
    },
    orderType: {
      fontSize: 12,
      color: theme.colors.primary,
      backgroundColor: theme.colors.secondary,
      padding: 5,
      borderRadius: 5,
      fontWeight: '400',
    }
  });

  const getDelayMinutes = (order: any) => {
    const offset = 300
    const cdtToutc = moment(order?.delivery_datetime).add(offset, 'minutes').format('YYYY-MM-DD HH:mm:ss')
    const _delivery = order?.delivery_datetime_utc
      ? parseDate(order?.delivery_datetime_utc, { outputFormat: 'YYYY-MM-DD HH:mm:ss' })
      : parseDate(cdtToutc, { outputFormat: 'YYYY-MM-DD HH:mm:ss' })
    const _eta = order?.eta_time
    const diffTimeAsSeconds = moment(_delivery).add(_eta, 'minutes').diff(moment().utc(), 'seconds')
    return Math.ceil(diffTimeAsSeconds / 60)
  }


  const displayDelayedTime = (order: any) => {
    let tagetedMin = getDelayMinutes(order)
    // get day, hour and minutes
    const sign = tagetedMin >= 0 ? '' : '- '
    tagetedMin = Math.abs(tagetedMin)
    let day: string | number = Math.floor(tagetedMin / 1440)
    const restMinOfTargetedMin = tagetedMin - 1440 * day
    let restHours: string | number = Math.floor(restMinOfTargetedMin / 60)
    let restMins: string | number = restMinOfTargetedMin - 60 * restHours
    // make standard time format
    day = day === 0 ? '' : `${day + ' ' + t('DAY', 'day') + ' '}`
    restHours = restHours < 10 ? '0' + restHours : restHours
    restMins = restMins < 10 ? '0' + restMins : restMins

    const finalTaget = sign + day + restHours + ':' + restMins
    return finalTaget
  }

  const MessageComponent = (props: any) => {
    const order = props.item
    return (
      <>
        {!reload &&
          !error &&
          JSON.stringify(tabsFilter) === JSON.stringify(tabs[0].tags) && (
            <TouchableOpacity
              key={order?.id}
              onPress={() => handlePressOrder(order)}
              style={styles.cardButton}
              activeOpacity={1}>
              <Card key={order?.id}>
                <Logo style={styles.logo}>
                  <FastImage
                    style={styles.icon}
                    source={order.business?.logo?.includes('https') ? {
                      uri: order.business?.logo,
                      priority: FastImage.priority.high,
                      cache: FastImage.cacheControl.immutable
                    } : order.business?.logo ?? theme?.images?.dummies?.businessLogo}
                    resizeMode={FastImage.resizeMode.cover}
                  />
                </Logo>
                <Information isShowTimer={activeStatus.includes(order?.status)}>
                  <Header>
                    <OText numberOfLines={1} style={styles.title}>
                      {order?.business?.name}
                    </OText>
                    {order?.unread_count > 0 && (
                      <Badge>
                        <OText size={14} style={styles.badge}>
                          {order?.unread_count}
                        </OText>
                      </Badge>
                    )}
                  </Header>

                  <OText
                    style={styles.date}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    size={20}>
                    {t('INVOICE_ORDER_NO', 'Order No.') + maskOrderId(order.id) + ' · '}
                    {order?.delivery_datetime_utc
                      ? parseDate(order?.delivery_datetime_utc)
                      : parseDate(order?.delivery_datetime, { utc: false })}
                  </OText>
                  {activeStatus.includes(order?.status) && (
                    <>
                      <OText
                        style={styles.date}
                        color={
                          order?.time_status === 'in_time'
                            ? '#00D27A'
                            : order?.time_status === 'at_risk'
                              ? '#FFC700'
                              : order?.time_status === 'delayed'
                                ? '#E63757'
                                : ''}
                      >
                        {displayDelayedTime(order)}
                      </OText>
                    </>
                  )}
                  <OText
                    style={styles.orderType}
                    mRight={5}
                    numberOfLines={1}
                    adjustsFontSizeToFit>
                    {getOrderStatus(order?.status)?.value}
                  </OText>
                </Information>
              </Card>
            </TouchableOpacity>
          )}
      </>
    )
  }

  const showInitialSkeleton = (loading || reload) && !orders?.length;

  return (
    <View style={{ flex: 1 }}>
      {showInitialSkeleton ? (
        <ScrollView
          style={{ flex: 1, backgroundColor: theme.colors.backgroundPage }}
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        >
          <OrderListSkeleton count={6} />
        </ScrollView>
      ) : (
        <FlatList
          data={orders}
          renderItem={MessageComponent}
          keyExtractor={(order) => order?.id}
          showsVerticalScrollIndicator={false}
          style={{ flex: 1, backgroundColor: theme.colors.backgroundPage }}
          contentContainerStyle={{
            paddingBottom: 20,
            backgroundColor: theme.colors.backgroundPage,
            ...(orders?.length ? {} : { flexGrow: 1 }),
          }}
          refreshControl={<RefreshControl
            refreshing={refreshing}
            onRefresh={() => getOrders?.()}
          />}
          ListFooterComponent={<FooterComponent
            loading={loading}
            reload={reload}
            pagination={pagination}
            tabsFilter={tabsFilter}
            tabs={tabs}
            loadMore={loadMore}
            skeletonCount={orders?.length ? 2 : 0}
          />}
        />
      )}
    </View>
  );
};
