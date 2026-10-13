import React, { useEffect, useState } from 'react';
import { Platform, PlatformIOSStatic, Pressable, StyleSheet, View, TouchableOpacity, TextInput } from 'react-native';
import { useTheme } from 'styled-components/native';
import DeviceInfo from 'react-native-device-info';
import moment from 'moment'
import EntypoIcon from 'react-native-vector-icons/Entypo'
import MCIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import FastImage from 'react-native-fast-image'

import {
  Card,
  Logo,
  Information,
  MyOrderOptions,
  NotificationIcon,
  Timestatus
} from './styles'

import { useLanguage, useUtils, useConfig, useEvent, useApi, useSession } from '@components';
import { DeviceOrientationMethods, OText, OModal, OButton } from '@ui'
import { getShowDeliveryPrioritySelection } from '../../utils'
import { useSecureOrderId } from '../../hooks/useSecureOrderId'
import { areListedOrderRowPropsEqual } from './areListedOrderRowPropsEqual'

const { useDeviceOrientation, PORTRAIT } = DeviceOrientationMethods

export const OrderItem = React.memo((props: any) => {
  const {
    order,
    _order,
    isLogisticOrder,
    currentTabSelected,
    getOrderStatus,
    handlePressOrder,
    activeOrdersCount
  } = props

  const theme = useTheme()
  const [, t] = useLanguage()
  const [events] = useEvent()
  const [configState] = useConfig()
  const [ordering] = useApi()
  const [{ token }] = useSession()
  const [{ parseDate }] = useUtils();
  const [orientationState] = useDeviceOrientation();

  const [ordersOffUpdated, setOrdersOffUpdated] = useState<number[]>([])
  const [showPriorityModal, setShowPriorityModal] = useState(false)
  const [newPosition, setNewPosition] = useState<number | null>(null)
  const [savingPosition, setSavingPosition] = useState(false)

  const showDeliveryPrioritySelection = getShowDeliveryPrioritySelection(configState?.configs)
  const maxPosition = activeOrdersCount != null ? activeOrdersCount : null
  const onTheWayToCustomerStatuses = [23]
  const isDeliveryPositionLocked = onTheWayToCustomerStatuses.includes(order?.status)
  const canEditDeliveryPosition = showDeliveryPrioritySelection && !isLogisticOrder &&
    currentTabSelected !== 'completed' && currentTabSelected !== 'cancelled'

  const openPriorityModal = () => {
    if (isDeliveryPositionLocked) return
    setNewPosition(order?.delivery_position ?? 1)
    setShowPriorityModal(true)
  }

  const handleUpdateDeliveryPosition = async () => {
    if (newPosition === null) return
    try {
      setSavingPosition(true)
      const response = await fetch(`${ordering.root}/orders/${order?.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'X-APP-X': ordering.appId,
          ...(ordering.appInternalName && { 'X-INTERNAL-PRODUCT-X': ordering.appInternalName }),
        },
        body: JSON.stringify({ delivery_position: newPosition }),
      })
      const { error } = await response.json()
      if (error) {
        console.error('Error updating delivery position:', error)
      } else {
        setShowPriorityModal(false)
        events.emit('delivery_position_updated')
      }
    } catch (e) {
      console.error('Error updating delivery position:', e)
    } finally {
      setSavingPosition(false)
    }
  }
  const isProjectEnterpricePlan = configState?.configs?.plan_enterprise && configState?.configs?.plan_enterprise?.value
  const [allowColumns, setAllowColumns] = useState({
    timer: isProjectEnterpricePlan,
    slaBar: isProjectEnterpricePlan,
  })
  const showExternalId = configState?.configs?.change_order_id?.value === '1'
  const { maskOrderId } = useSecureOrderId()

  const IS_PORTRAIT = orientationState.orientation === PORTRAIT
  const platformIOS = Platform as PlatformIOSStatic

  const isIpad = platformIOS.isPad
  const isTablet = DeviceInfo.isTablet();

  const isShowTimer = ((currentTabSelected === 'pending' || currentTabSelected === 'inProgress' || currentTabSelected === 'active') && allowColumns?.timer)

  const styles = StyleSheet.create({
    cardButton: {
      height: 105,
      paddingVertical: (isIpad || isTablet) ? 20 : 15,
      marginBottom: IS_PORTRAIT ? 15 : 0,
      marginLeft: 3,
      borderWidth: 1,
      borderColor: theme.colors.gray100,
      borderRadius: 10,
      backgroundColor: isProjectEnterpricePlan
        ? order?.time_status === 'delayed'
          ? theme.colors.danger100
          : order?.time_status === 'at_risk'
            ? theme.colors.warning100
            : '#fff'
        : '#fff'
    },
    icon: {
      borderRadius: 7.6,
      width: 65,
      height: 65
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
    date: {
      fontSize: 12,
      fontWeight: '400',
    },
    orderType: {
      fontSize: 12,
      color: theme.colors.primary,
      backgroundColor: theme.colors.secondary,
      alignSelf: 'center',
      alignItems: 'center',
      justifyContent: 'center',
      height: 25,
      padding: 4,
      borderRadius: 5,
      fontWeight: '400',
    },
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

  useEffect(() => {
    const slaSettings = isProjectEnterpricePlan
    setAllowColumns({
      ...allowColumns,
      timer: slaSettings,
      slaBar: slaSettings
    })
  }, [configState.loading])

  useEffect(() => {
    const handleOfflineOrder = (ids: any) => {
      ids && setOrdersOffUpdated(ids)
    }

    events.on('offline_order_updated', handleOfflineOrder)
    return () => {
      events.off('offline_order_updated', handleOfflineOrder)
    }
  }, [])

  return (
    <>
    <Pressable
      disabled={order?.locked && isLogisticOrder}
      style={styles.cardButton}
      onPress={() => handlePressOrder({
        ...order,
        logistic_order_id: _order?.id,
        unsync: order?.unsync && !ordersOffUpdated?.includes(order?.id)
      })}
    >
      <Card key={order.id}>
        {canEditDeliveryPosition && order?.delivery_position != null && (
          <TouchableOpacity
            onPress={openPriorityModal}
            disabled={isDeliveryPositionLocked}
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              zIndex: 2,
              backgroundColor: theme.colors.primary,
              borderRadius: 12,
              paddingHorizontal: 10,
              paddingVertical: 4,
              opacity: isDeliveryPositionLocked ? 0.6 : 1,
            }}
          >
            <OText size={11} color={'#fff'} weight="600">{`#${order?.delivery_position}`}</OText>
          </TouchableOpacity>
        )}
        {canEditDeliveryPosition && order?.delivery_position == null && (
          <TouchableOpacity
            onPress={openPriorityModal}
            disabled={isDeliveryPositionLocked}
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              zIndex: 2,
              backgroundColor: theme.colors.lightGray,
              borderRadius: 12,
              paddingHorizontal: 8,
              paddingVertical: 4,
              opacity: isDeliveryPositionLocked ? 0.6 : 1,
            }}
          >
            <MCIcon name="format-list-numbered" size={14} color={theme.colors.textGray} />
          </TouchableOpacity>
        )}
        {!!allowColumns?.slaBar && (
          <Timestatus
            timeState={order?.time_status}
          />
        )}
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
        <Information isShowTimer={isShowTimer}>
          {!!order?.order_group_id && (
            <OText style={{ fontSize: 12, fontWeight: '400' }}>{(t('INVOICE_GROUP_NO', 'Group No.') + order?.order_group_id)}</OText>
          )}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between'
            }}
          >
            {!!order.business?.name && (
              <OText numberOfLines={1} style={styles.title}>
                {order.business?.name}
              </OText>
            )}
            {order?.unsync && !ordersOffUpdated?.includes(order?.id) && (
              <MCIcon
                name={'cloud-sync'}
                color={'#444'}
                size={18}
              />
            )}
          </View>
          {!!order?.showNotification && (
            <NotificationIcon>
              <EntypoIcon
                name="dot-single"
                size={32}
                color={theme.colors.primary}
              />
            </NotificationIcon>
          )}
          <View>
            {!order?.order_group_id && showExternalId && !order?.order_group && (
              <OText
                style={styles.date}
                color={theme.colors.unselectText}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {`${order?.external_id ?? t('NO_EXTERNAL_ID', 'No external Id ') + t('NO', 'Order No.') + maskOrderId(order?.id)}` + ' · ' + `${order?.delivery_datetime_utc
                  ? parseDate(order?.delivery_datetime_utc)
                  : parseDate(order?.delivery_datetime, { utc: false })
                  }`}
              </OText>
            )}
            {!showExternalId && (<OText
              style={styles.date}
              color={theme.colors.unselectText}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {((!!order?.order_group_id && order?.order_group && isLogisticOrder
                ? `${order?.order_group?.orders?.length} ${t('ORDERS', 'Orders')}`
                : (t('NO', 'Order No.') + maskOrderId(order?.id))
              ) + ' · ' + `${order?.delivery_datetime_utc
                ? parseDate(order?.delivery_datetime_utc)
                : parseDate(order?.delivery_datetime, { utc: false })}`)}
            </OText>
            )}
            {isShowTimer && (
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
          </View>
          {!isLogisticOrder && (
            <MyOrderOptions>
              <OText
                style={styles.orderType}
                mRight={5}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {order.delivery_type === 1
                  ? t('DELIVERY', 'Delivery')
                  : order.delivery_type === 2
                    ? t('PICKUP', 'Pickup')
                    : order.delivery_type === 3
                      ? t('EAT_IN', 'Eat in')
                      : order.delivery_type === 4
                        ? t('CURBSIDE', 'Curbside')
                        : order.delivery_type === 5
                          ? t('DRIVER_THRU', 'Driver thru')
                          : order.delivery_type === 7
                            ? t('CATERING_DELIVERY', 'Catering delivery')
                            : order.delivery_type === 8
                              ? t('CATERING_PICKUP', 'Catering pickup')
                              : order.delivery_type === 9
                                ? t('RESERVATION', 'Reservation')
                                : t('DELIVERY', 'Delivery')}
              </OText>
              <OText
                style={{ ...styles.orderType, fontSize: getOrderStatus(order.status)?.length > 30 ? 10 : 12, alignSelf: 'center', verticalAlign: 'middle' }}
                mRight={5}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {getOrderStatus(order.status)}
              </OText>
            </MyOrderOptions>
          )}
        </Information>
      </Card>
    </Pressable>
    {canEditDeliveryPosition && (
      <OModal
        open={showPriorityModal}
        onClose={() => setShowPriorityModal(false)}
        isTransparent
      >
        <View
          style={{
            backgroundColor: '#fff',
            borderRadius: 12,
            paddingVertical: 24,
            paddingHorizontal: 20,
            width: '85%',
            alignItems: 'center',
          }}
        >
          <OText size={18} weight="700" color={theme.colors.textGray}>
            {t('DELIVERY_POSITION', 'Delivery position')}
          </OText>
          <OText size={13} color={theme.colors.textGray} style={{ marginTop: 4, marginBottom: 24 }}>
            {t('ORDER_NO', 'Order No.') + ` ${maskOrderId(order?.id)}`}
          </OText>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            <TouchableOpacity
              onPress={() => setNewPosition(prev => (prev !== null && prev > 1 ? prev - 1 : prev))}
              disabled={newPosition === null || newPosition <= 1}
              style={{
                width: 52,
                height: 52,
                borderRadius: 26,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: newPosition !== null && newPosition > 1 ? theme.colors.primary : theme.colors.lightGray,
              }}
            >
              <MCIcon name="minus" size={26} color={'#fff'} />
            </TouchableOpacity>
            <TextInput
              keyboardType="number-pad"
              value={newPosition !== null ? String(newPosition) : ''}
              placeholder="#"
              placeholderTextColor={theme.colors.textGray}
              onChangeText={(text) => {
                const num = parseInt(text, 10)
                if (!isNaN(num) && num >= 1) {
                  const clamped = maxPosition !== null ? Math.min(num, maxPosition) : num
                  setNewPosition(clamped)
                } else if (text === '') {
                  setNewPosition(null)
                }
              }}
              style={{
                width: 80,
                height: 60,
                marginHorizontal: 18,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: theme.colors.lightGray,
                textAlign: 'center',
                fontSize: 28,
                fontWeight: '700',
                color: theme.colors.primary,
                backgroundColor: theme.colors.inputChat,
              }}
            />
            <TouchableOpacity
              onPress={() => setNewPosition(prev => (prev !== null ? prev + 1 : 1))}
              disabled={maxPosition !== null && newPosition !== null && newPosition >= maxPosition}
              style={{
                width: 52,
                height: 52,
                borderRadius: 26,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: maxPosition !== null && newPosition !== null && newPosition >= maxPosition ? theme.colors.lightGray : theme.colors.primary,
              }}
            >
              <MCIcon name="plus" size={26} color={'#fff'} />
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: 'row', marginTop: 28, width: '100%' }}>
            <OButton
              text={t('CANCEL', 'Cancel')}
              bgColor={theme.colors.lightGray}
              borderColor={theme.colors.lightGray}
              imgRightSrc={null}
              style={{ borderRadius: 7, height: 42 }}
              parentStyle={{ width: '45%', marginRight: '5%' }}
              textStyle={{ color: theme.colors.textGray, fontSize: 15 }}
              onClick={() => setShowPriorityModal(false)}
            />
            <OButton
              text={savingPosition ? t('LOADING', 'Loading...') : t('SAVE', 'Save')}
              bgColor={newPosition === null || savingPosition ? theme.colors.disabled : theme.colors.green}
              borderColor={newPosition === null || savingPosition ? theme.colors.disabled : theme.colors.green}
              imgRightSrc={null}
              style={{ borderRadius: 7, height: 42 }}
              parentStyle={{ width: '50%' }}
              textStyle={{ color: '#fff', fontSize: 15 }}
              isDisabled={newPosition === null || savingPosition}
              onClick={() => handleUpdateDeliveryPosition()}
            />
          </View>
        </View>
      </OModal>
    )}
    </>
  )
}, areListedOrderRowPropsEqual)
