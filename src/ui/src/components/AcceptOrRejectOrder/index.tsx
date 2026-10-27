import React, { useState, useEffect, useRef, useMemo } from 'react';
import FeatherIcon from 'react-native-vector-icons/Feather';
import { useTheme } from 'styled-components/native';
import SelectDropdown from 'react-native-select-dropdown'
import {
  Linking,
  Keyboard,
  Platform,
  View,
  KeyboardAvoidingView,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView
} from 'react-native';
import { openSettings } from 'react-native-permissions';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Content, Timer, TimeField, Header, Comments, CommentsButtonGroup, TopActions } from './styles';
import { AcceptOrRejectOrderParams } from '../../types';
import { orderCommentList, getShowDeliveryPrioritySelection, checkLocationRequirements, isLocationValidationActive } from '../../utils'
import { useLanguage, useConfig, useEvent, useToast, ToastType } from '@components';
import { useOfflineActions, OText, OButton, OTextarea, OIcon, OIconButton, ONavbar } from '@ui';
import { useLocation } from '../../hooks/useLocation';
import { useStatusImage, StatusImage } from '../../hooks/useStatusImage';
import { useDeliveryPin } from '../../hooks/useDeliveryPin';
import { deliveryPinRetryAfter, useDeliveryPinCooldown } from '../../hooks/useDeliveryPinCooldown';
import { ValidationIssuesList } from '../OrderDetails/ValidationIssuesList';
import { SecurityPinFields } from './SecurityPinFields';
import { isAcceptOrRejectInFlight } from './isAcceptOrRejectInFlight';

export const AcceptOrRejectOrder = (props: AcceptOrRejectOrderParams) => {
  const {
    isPage,
    customerCellphone,
    action,
    handleUpdateOrder,
    actions,
    closeModal,
    orderId,
    orders,
    notShowCustomerPhone,
    orderTitle,
    appTitle,
    isLoadingOrder,
    loading,
    order,
    activeOrdersCount,
    pendingStatusBody,
    orderError,
    orderErrorCodes,
    orderRetryAfter
  } = props;

  const [, t] = useLanguage();
  const theme = useTheme();
  const [{ configs }] = useConfig();
  const [, { showToast }] = useToast();
  const [events] = useEvent();
  const [{ isNetConnected, canSaveChangesOffline }, { applyOffAction, registerOffOrder }] = useOfflineActions()
  const { getCurrentLocation, userLocation } = useLocation();
  const { requiresImage: statusRequiresImage, captureImage } = useStatusImage();
  const { requiresDeliveryPin, isDeliveryPinComplete, usesLegacyPin, isLegacyPinValid } = useDeliveryPin();
  const insets = useSafeAreaInsets();

  const [deliveryPriority, setDeliveryPriority] = useState<number | null>(null);
  const [priorityStep, setPriorityStep] = useState(true);
  const [showRequirementsModal, setShowRequirementsModal] = useState(false);
  const [validationIssues, setValidationIssues] = useState<any[]>([]);
  const [isButtonDisabled, setIsButtonDisabled] = useState(false);

  const isPendingOrder = order?.status === 0 || order?.status === 13
  const maxPosition = activeOrdersCount != null
    ? activeOrdersCount + (isPendingOrder ? 1 : 0)
    : null;

  const showDeliveryPrioritySelection = useMemo(
    () => getShowDeliveryPrioritySelection(configs),
    [configs?.disable_delivery_priority?.value],
  );

  const scrollViewRef = useRef<any>(null);
  const viewRef = useRef<any>(null);
  const timerRef = useRef<TextInput>(null);
  const textTareaRef = useRef<TextInput>(null);
  const [hour, setHour] = useState('00');
  const [min, setMin] = useState('00');
  const [time, setTime] = useState('');
  const [comments, setComments] = useState('');
  const [rejectReason, setRejectReason] = useState(null);
  const [keyboardState, setKeyboardState] = useState({ show: false, height: 0 });
  const [statusImage, setStatusImage] = useState<StatusImage | null>(null);
  const [pins, setPins] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [showOrderError, setShowOrderError] = useState(false);
  const submittingRef = useRef(false);

  const isDriverApp = appTitle?.key === 'DELIVERY_APP'
  const orderCommentsList = orderCommentList(action, t)

  let codeNumberPhone, numberPhone, numberToShow;
  const phoneNumber = customerCellphone;
  const titleOrder = t(orderTitle[action]?.key, orderTitle[action]?.text)
  const buttonText = t(orderTitle[action]?.btnKey, orderTitle[action]?.btnText)
  const showTextArea = ['reject', 'deliveryFailed', 'pickupFailed', 'notReady', 'forcePickUp', 'forceDelivery', 'forceStatus'].includes(action)
  const isPositiveAction = ['accept', 'pickupComplete', 'deliveryComplete'].includes(action)

  const actionToStatus: Record<string, number> = {
    accept: 8,
    reject: 6,
    deliveryFailed: 12,
    pickupFailed: 10,
    notReady: 14,
    forcePickUp: 9,
    forceDelivery: 11,
    arrivedToBusiness: 3,
    pickupComplete: 9,
    deliveryComplete: 11,
  }

  const currentStatus = action === 'forceStatus' ? undefined : actionToStatus[action]
  const statusesRequiringLocation = [3, 9, 11, 26]
  const requiresImage = statusRequiresImage(currentStatus)

  const pinOrders: Array<any> = currentStatus === 11
    ? (orders?.length ? orders : [order]).filter(requiresDeliveryPin)
    : []
  const requiresPin = pinOrders.length > 0
  const allPinsComplete = pinOrders.every((pinOrder) => isDeliveryPinComplete(pins[String(pinOrder.id)], pinOrder))
  const allLegacyPinsValid = pinOrders.every((pinOrder) => isLegacyPinValid(pinOrder, pins[String(pinOrder.id)]))
  const serverPin = requiresPin && !usesLegacyPin
  const pinNeedsConnection = serverPin && !isNetConnected
  const {
    secondsLeft: pinSecondsLeft,
    waitFor: waitForPinRetry,
    clear: clearPinRetry
  } = useDeliveryPinCooldown(serverPin ? pinOrders.map((pinOrder) => pinOrder.id) : [])

  const handleStatusResponses = (responses: any[]) => {
    const waits = Object.fromEntries(
      (responses || [])
        .filter((response: any) => response?.error)
        .map((response: any) => [String(response.id), deliveryPinRetryAfter(response.errorCodes, response.retryAfter)])
    )
    waitForPinRetry(waits)
  }

  useEffect(() => {
    if (!showOrderError || !serverPin) return
    const seconds = deliveryPinRetryAfter(orderErrorCodes, orderRetryAfter)
    if (seconds > 0) waitForPinRetry({ [String(orderId)]: seconds })
  }, [showOrderError, orderErrorCodes, orderRetryAfter])
  const pinCoolingDown = requiresPin && pinSecondsLeft > 0

  const pinErrorCode = orderErrorCodes?.find((code: string) => code?.startsWith('delivery_pin.'))
  const submitErrorMessage = !showOrderError
    ? null
    : pinErrorCode === 'delivery_pin.invalid'
      ? t('SECURITY_CODE_DOES_NOT_MATCH', 'The code does not match')
      : pinErrorCode === 'delivery_pin.too_many_attempts'
        ? null
        : (Array.isArray(orderError) ? orderError[0] : orderError)

  const handlePinChange = (id: number | string, pin: string) => {
    setShowOrderError(false)
    setPins((prev) => ({ ...prev, [String(id)]: pin.replace(/\D/g, '') }))
  }

  const checkAllRequirements = async (status: number, providedLocation?: any) => {
    return checkLocationRequirements({
      status,
      order,
      configs,
      t,
      getCurrentLocation,
      providedLocation,
      callbacks: {
        onRefreshLocation: getCurrentLocation,
        onOpenSettings: () => {
          openSettings().catch(() => {
            console.warn('Cannot open settings');
          });
        },
        onCloseModal: () => setShowRequirementsModal(false),
        onRevalidate: async (newLocation: any) => {
          const { valid, issues } = await checkAllRequirements(status, newLocation);
          if (valid) {
            setShowRequirementsModal(false);
            setIsButtonDisabled(false);
          } else {
            setValidationIssues(issues);
          }
        },
        showToast
      },
      ToastType
    });
  };

  const styles = StyleSheet.create({
    selectOption: {
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 40,
      width: '100%',
      paddingHorizontal: 15,
      backgroundColor: theme.colors.inputChat,
      borderRadius: 7.6,
    },
    buttonTextStyle: {
      textAlign: 'left',
      marginHorizontal: 0,
      fontSize: 16,
      lineHeight: 24,
      color: '#748194',
      textTransform: 'capitalize'
    },
    dropdownStyle: {
      borderWidth: 1,
      borderRadius: 8,
      paddingTop: 5,
      backgroundColor: '#fff',
      borderColor: theme.colors.lightGray,
      overflow: 'hidden',
      minHeight: 120
    },
    rowStyle: {
      display: 'flex',
      borderBottomWidth: 0,
      height: 36,
      alignItems: 'center',
      paddingHorizontal: 10
    },
    parent: {
      flex: 1,
      backgroundColor: theme.colors.backgroundPage,
    },
    upper: {
      flex: 1,
      zIndex: 1001,
      paddingTop: action === 'reject' ? 0 : isPage ? 30 : 40,
      marginBottom: 10,
      backgroundColor: theme.colors.backgroundPage
    },
    bottomParent: {
      justifyContent: "center",
      paddingHorizontal: 30,
      alignItems: "center",
      width: '100%',
      height: 45,
    },
    bottom: {
      textAlignVertical: "center",
      textAlign: "center",
    },
    submitError: {
      width: '100%',
      marginTop: 12,
      textAlign: 'center',
    },
    btnBackArrow: {
      borderWidth: 0,
      width: 32,
      height: 32,
      tintColor: theme.colors.textGray,
      backgroundColor: theme.colors.clear,
      borderColor: theme.colors.clear,
      shadowColor: theme.colors.clear,
      paddingLeft: 0,
      paddingRight: 0
    },
    modalContainer: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20
    },
    modalContent: {
      backgroundColor: '#FFF',
      borderRadius: 10,
      padding: 20,
      width: '100%',
      maxHeight: '80%'
    },
    modalTitle: {
      marginBottom: 15,
      textAlign: 'center'
    },
    closeButton: {
      marginTop: 15,
      borderRadius: 7,
      height: 45
    },
    imageSection: {
      marginVertical: 15,
      alignItems: 'center' as const
    },
    imageContainer: {
      width: 200,
      height: 200,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: theme.colors.lightGray,
      borderStyle: 'dashed' as const,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      backgroundColor: theme.colors.inputChat
    },
    selectedImage: {
      width: 200,
      height: 200,
      borderRadius: 10,
      marginBottom: 10
    },
    imageText: {
      color: theme.colors.textGray,
      fontSize: 14,
      textAlign: 'center' as const,
      marginBottom: 5
    },
    requiredText: {
      color: theme.colors.red,
      fontSize: 12,
      marginTop: 5
    },
  })

  const handleFocus = () => {
    viewRef?.current?.measure((x: any, y: any) => {
      scrollViewRef?.current?.scrollTo({ x: 0, y });
    });
  };

  if (!notShowCustomerPhone) {
    if (phoneNumber) {
      codeNumberPhone = phoneNumber.slice(0, 3);
      numberPhone = phoneNumber.slice(3, phoneNumber?.length);
      numberToShow = `(${codeNumberPhone}) ${numberPhone}`;
    }
  }

  useEffect(() => {
    if (action === 'accept') {
      setPriorityStep(showDeliveryPrioritySelection);
    }
  }, [action, showDeliveryPrioritySelection]);

  const handleArrowBack: any = () => {
    if (action === 'accept' && !priorityStep && showDeliveryPrioritySelection) {
      setPriorityStep(true);
      return;
    }
    closeModal(false);
  };

  const handleTime = (e: any) => {
    if (
      e.includes(',') ||
      e.includes('.') ||
      e.includes('-') ||
      e.includes(' ')
    )
      return;

    setTime(e.slice(-4));
    const mins = e.slice(-2);
    const hours = e.slice(-4, -2);

    setMin(mins);
    setHour(hours);
    setTime(`${hours}${mins}`);
  };

  useEffect(() => {
    if (actions && action === 'accept') {
      openTimerIOnput();
    }

    if (actions && showTextArea) {
      openTextTareaOInput();
    }
  }, []);

  const handleFixTime = () => {
    if (min >= '60') {
      setMin('59');
    }

    if (min.length < 2) setMin(`0${min}`);
    if (hour.length < 2) setHour(`0${hour}`);

    if (!hour) setHour('00');
  };

  const openTimerIOnput = () => {
    const isFocus = timerRef.current?.isFocused();
    if (isFocus) {
      timerRef.current?.blur();
    }

  };

  const openTextTareaOInput = () => {
    const isFocus = textTareaRef.current?.isFocused();
    if (isFocus && textTareaRef?.current) {
      textTareaRef.current.blur();
    }

    if (!isFocus && textTareaRef?.current) {
      textTareaRef?.current?.focus?.();
    }
  };

  const handleImagePicker = async () => {
    const image = await captureImage();
    image && setStatusImage(image);
  };

  const removeImage = () => {
    setStatusImage(null);
  };

  const handleAcceptOrReject = async () => {
    if (isAcceptOrRejectInFlight({
      loading,
      isLoadingOrder,
      submitting: submittingRef.current
    })) return

    if (pinNeedsConnection) {
      showToast(ToastType.Error, t('DELIVERY_PIN_REQUIRES_CONNECTION', 'You need an internet connection to validate the delivery code'));
      return;
    }

    if (pinCoolingDown || (requiresPin && !allPinsComplete)) return;

    if (usesLegacyPin && requiresPin && !allLegacyPinsValid) {
      showToast(ToastType.Error, t('SECURITY_CODE_DOES_NOT_MATCH', 'The code does not match'));
      return;
    }

    submittingRef.current = true
    setSubmitting(true)
    setShowOrderError(false)

    handleFixTime();
    let minsToSend = min;

    if (min > '60') minsToSend = '59';

    const time = parseInt(hour || '0') * 60 + (parseInt(minsToSend) || 0);

    let currentLocation = null;

    if (currentStatus && statusesRequiringLocation.includes(currentStatus) && isLocationValidationActive(configs, currentStatus)) {
      const { valid, issues, location } = await checkAllRequirements(currentStatus);

      if (!valid) {
        submittingRef.current = false
        setSubmitting(false)
        setValidationIssues(issues);
        setShowRequirementsModal(true);
        return;
      }

      currentLocation = location;
    }

    let bodyToSend: any = {};
    const orderStatus: any = {
      acceptByBusiness: {
        prepared_in: time,
      },
      rejectByBusiness: {
        reasons: comments,
        status: 5,
      },
      acceptByDriver: {
        delivered_in: time,
        status: 8,
        ...(deliveryPriority !== null && { delivery_position: deliveryPriority }),
      },
      rejectByDriver: {
        reasons: comments,
        status: 6,
        reject_reason: rejectReason
      },
      pickupFailedByDriver: {
        reasons: comments,
        status: 10,
        reject_reason: rejectReason
      },
      deliveryFailedByDriver: {
        reasons: comments,
        status: 12,
        reject_reason: rejectReason
      },
      orderNotReady: {
        reasons: comments,
        status: 14,
        reject_reason: rejectReason
      },
      forceStatus: {
        ...(pendingStatusBody || {}),
        reasons: comments.trim()
      },
      forcePickUp: {
        reasons: comments,
        status: 9,
        reject_reason: rejectReason
      },
      forceDelivery: {
        reasons: comments,
        status: 11,
        reject_reason: rejectReason
      },
      arrivedToBusiness: {
        status: 3
      },
      pickupComplete: {
        status: 9
      },
      deliveryComplete: {
        status: 11
      }
    };

    if (actions && action === 'accept') {
      bodyToSend = orderStatus[actions.accept];
    }
    if (actions && action === 'reject') {
      bodyToSend = orderStatus[actions.reject];
    }
    if (actions && action === 'pickupFailed') {
      bodyToSend = orderStatus[actions.pickupFailed]
    }
    if (actions && action === 'deliveryFailed') {
      bodyToSend = orderStatus[actions.deliveryFailed]
    }
    if (actions && action === 'notReady') {
      bodyToSend = orderStatus[actions.notReady]
    }
    if (actions && action === 'forcePickUp') {
      bodyToSend = orderStatus[actions.forcePickUp]
    }
    if (actions && action === 'forceDelivery') {
      bodyToSend = orderStatus[actions.forceDelivery]
    }
    if (actions && action === 'forceStatus') {
      bodyToSend = orderStatus[actions.forceStatus]
    }
    if (action === 'arrivedToBusiness') {
      bodyToSend = orderStatus.arrivedToBusiness
    }
    if (action === 'pickupComplete') {
      bodyToSend = orderStatus.pickupComplete
    }
    if (action === 'deliveryComplete') {
      bodyToSend = orderStatus.deliveryComplete
    }

    bodyToSend.id = orderId;

    const deliveryPin = serverPin ? pins[String(orderId)] : undefined;
    if (deliveryPin) {
      bodyToSend.delivery_pin = deliveryPin;
    }

    const statusToSend = bodyToSend.status;

    if (statusImage) {
      const formData = new FormData();

      Object.keys(bodyToSend).forEach(key => {
        formData.append(key, bodyToSend[key]);
      });
      formData.append('status_image_file', statusImage as any);

      if (currentLocation) {
        formData.append('location[lat]', String(currentLocation.latitude));
        formData.append('location[lng]', String(currentLocation.longitude));
      }

      bodyToSend = formData;
    }

    if (!isNetConnected && canSaveChangesOffline !== false) {
      const body = Object.keys(bodyToSend || {}).length > 0
        ? bodyToSend
        : { status: statusToSend }

      const result = applyOffAction({
        event: 'evt_off_change_order_status',
        data: { orderId, body }
      })

      const orderUpdated = await handleUpdateOrder?.(
        statusToSend,
        bodyToSend,
        { dataToSave: { status: statusToSend, unsync: true } }
      )
      await registerOffOrder(orderUpdated)
      if (deliveryPriority !== null) events.emit('delivery_position_updated')
      closeModal && closeModal()
    } else {
      const locationOptions = currentLocation && !statusImage ? { location: currentLocation } : undefined
      const orderUpdated = await handleUpdateOrder?.(
        statusToSend,
        bodyToSend,
        serverPin ? { ...locationOptions, deliveryPins: pins, onStatusResponses: handleStatusResponses } : locationOptions
      );
      if (deliveryPriority !== null) events.emit('delivery_position_updated')
      if (serverPin && orderUpdated) {
        await clearPinRetry()
      }
      submittingRef.current = false
      setSubmitting(false)
      setShowOrderError(!orderUpdated)
    }
  };

  useEffect(() => {
    if (actions && action === 'accept' && !priorityStep && !isLoadingOrder) {
      const interval = setTimeout(() => {
        timerRef?.current?.focus?.()
      }, 400)
      return () => {
        clearTimeout(interval)
      }
    }
  }, [timerRef?.current, priorityStep, isLoadingOrder])

  useEffect(() => {
    if (!currentStatus || !statusesRequiringLocation.includes(currentStatus)) {
      setIsButtonDisabled(false);
      return;
    }

    if (!isLocationValidationActive(configs, currentStatus)) {
      setIsButtonDisabled(false);
      return;
    }

    checkAllRequirements(currentStatus, userLocation).then(({ valid }) => {
      setIsButtonDisabled(!valid);
    }).catch(() => {
      setIsButtonDisabled(true);
    });
  }, [action, userLocation, configs, order])

  useEffect(() => {
    const keyboardDidShowListener =
      Keyboard.addListener('keyboardDidShow', (e) => setKeyboardState({
        show: true,
        height: e.endCoordinates.height > 100
          ? Platform.OS == 'ios' ? e.endCoordinates.height : 0 : 0
      }))
    const keyboardDidHideListener =
      Keyboard.addListener('keyboardDidHide', () => setKeyboardState({ show: false, height: 0 }))
    return () => {
      keyboardDidShowListener.remove()
      keyboardDidHideListener.remove()
    }
  }, [])

  return (
    <KeyboardAvoidingView
      enabled
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: Platform.OS === 'ios'
            ? (isPage ? 0 : insets.top)
            : Math.max(insets.top, 30)
        }}
      >
        <ONavbar title={titleOrder} onBack={() => handleArrowBack()} />
      </View>
      <View style={styles.parent}>
        <View style={styles.upper}>
          <Content showsVerticalScrollIndicator={false} ref={scrollViewRef}>
            <Header>
              {action === 'forceStatus' && (
                <OText
                  size={15}
                  color={theme.colors.textGray}
                  style={{ marginTop: 10, marginBottom: 10 }}>
                  {t('ORDER_STATUS_REGRESSION_DESCRIPTION', 'Moving an order back to a previous status requires a reason. Write it to confirm the change or cancel to keep the current status.')}
                </OText>
              )}
              {action === 'reject' && (
                <>
                  {!notShowCustomerPhone && (
                    <>
                      <OText
                        size={15}
                        color={theme.colors.textGray}
                        style={{ marginTop: 10 }}>
                        {t(
                          'CALL_YOUR_CUSTOMER_TO_RESOLVE_THE_ISSUE_AS_POLITELY_AS_POSSIBLE',
                          'Call your customer to resolve the issue as politely as possible',
                        )}
                      </OText>

                      {!!numberToShow ? (
                        <OButton
                          bgColor="transparent"
                          borderColor={theme.colors.primary}
                          textStyle={{
                            color: theme.colors.primary,
                            fontSize: 20,
                          }}
                          style={{
                            borderRadius: 10,
                            marginVertical: 20,
                          }}
                          imgLeftStyle={{
                            resizeMode: 'contain',
                            left: 20,
                            position: 'absolute',
                          }}
                          imgLeftSrc={theme.images.general.cellphone}
                          text={numberToShow}
                          onClick={() =>
                            Linking.openURL(`tel:${customerCellphone}`)
                          }
                        />
                      ) : (
                        <OButton
                          bgColor="transparent"
                          borderColor={theme.colors.primary}
                          textStyle={{
                            color: theme.colors.primary,
                            fontSize: 15,
                          }}
                          style={{
                            borderRadius: 10,
                            marginVertical: 20,
                          }}
                          imgLeftStyle={{
                            resizeMode: 'contain',
                            left: 20,
                            position: 'absolute',
                          }}
                          isDisabled={true}
                          imgLeftSrc={theme.images.general.cellphone}
                          text={t('NOT_NUMBER', "There's not phonenumber.")}
                          onClick={() =>
                            Linking.openURL(`tel:${customerCellphone}`)
                          }
                        />
                      )}
                    </>
                  )}

                  <OText
                    size={15}
                    color={theme.colors.textGray}
                    style={{ marginBottom: 10 }}>
                    {t(
                      'MARK_THE_ORDER_AS_REJECTED',
                      'Mark the order as rejected',
                    )}
                  </OText>
                </>
              )}
            </Header>

            {action === 'accept' && priorityStep && showDeliveryPrioritySelection && (
              <View style={{ height: 300, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 }}>
                <OText size={18} weight="600" color={theme.colors.textGray} style={{ textAlign: 'center', marginBottom: 30 }}>
                  {t('DELIVERY_PRIORITY_QUESTION', 'In which order will you deliver this order?')}
                </OText>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                  <TouchableOpacity
                    onPress={() => setDeliveryPriority(prev => (prev !== null && prev > 1 ? prev - 1 : prev))}
                    disabled={deliveryPriority === null || deliveryPriority <= 1}
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 28,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: deliveryPriority !== null && deliveryPriority > 1 ? theme.colors.primary : theme.colors.lightGray,
                    }}
                  >
                    <FeatherIcon name="minus" size={26} color={'#fff'} />
                  </TouchableOpacity>
                  <View
                    style={{
                      width: 90,
                      height: 70,
                      marginHorizontal: 20,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: theme.colors.lightGray,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: theme.colors.inputChat,
                    }}
                  >
                    <OText size={34} weight="700" color={deliveryPriority !== null ? theme.colors.primary : theme.colors.textGray}>
                      {deliveryPriority !== null ? String(deliveryPriority) : '#'}
                    </OText>
                  </View>
                  <TouchableOpacity
                    onPress={() => setDeliveryPriority(prev => (prev !== null ? prev + 1 : 1))}
                    disabled={maxPosition !== null && deliveryPriority !== null && deliveryPriority >= maxPosition}
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 28,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: maxPosition !== null && deliveryPriority !== null && deliveryPriority >= maxPosition ? theme.colors.lightGray : theme.colors.primary,
                    }}
                  >
                    <FeatherIcon name="plus" size={26} color={'#fff'} />
                  </TouchableOpacity>
                </View>
                {deliveryPriority !== null && (
                  <OText size={15} color={theme.colors.primary} weight="500" style={{ marginTop: 20 }}>
                    {t('DELIVERY_NUMBER', 'Delivery') + ` #${deliveryPriority}`}
                  </OText>
                )}
              </View>
            )}

            {action === 'accept' && !priorityStep && (
              <View style={{ height: 300, justifyContent: 'center' }}>
                <Timer onPress={() => openTimerIOnput()} >
                  <OText weight="700" size={55} color={theme.colors.primary}>
                    {hour}
                  </OText>
                  {hour.length > 0 && <OText size={55} style={{ marginBottom: 10 }} color={theme.colors.primary} weight="700">:</OText>}
                  <OText weight="700" size={55} color={theme.colors.primary}>
                    {min}
                  </OText>
                  {time?.length > 2 && <OText style={{ position: 'absolute', bottom: 60, left: 55 }}>{t('HOURS', 'Hours')}</OText>}
                  <OText
                    style={{ position: 'absolute', bottom: 60, right: time?.length > 2 ? 55 : 95 }}
                    color={theme.colors.primary}
                  >{t('MINUTES', 'Minutes')}</OText>
                </Timer>
              </View>
            )}
            <TimeField
              ref={timerRef}
              keyboardType="numeric"
              value={time}
              placeholder={'00:00'}
              onChangeText={handleTime}
              onPressOut={() => handleFixTime()}
              editable={true}
              selectionColor={theme.colors.primary}
              placeholderTextColor={theme.colors.textGray}
              color={theme.colors.textGray}
              onEndEditing={handleFixTime}
              onSubmitEditing={() => handleAcceptOrReject()}
              onBlur={() => actions && action === 'accept' && !priorityStep && timerRef?.current?.focus?.()}
            />

            {orderCommentsList && isDriverApp && (
              <CommentsButtonGroup>
                <SelectDropdown
                  defaultButtonText={t('REJECT_REASONS_OPTIONS', 'Reject reasons')}
                  data={orderCommentsList?.list}
                  onSelect={(selectedItem: any) => {
                    setRejectReason(selectedItem?.value)
                  }}
                  buttonTextAfterSelection={(selectedItem: any) => selectedItem.content}
                  rowTextForSelection={(item: any) => item.key}
                  buttonStyle={styles.selectOption}
                  buttonTextStyle={styles.buttonTextStyle}
                  renderDropdownIcon={(isOpened: any) => {
                    return <FeatherIcon name={isOpened ? 'chevron-up' : 'chevron-down'} color={'#444'} size={18} />;
                  }}
                  dropdownStyle={styles.dropdownStyle}
                  dropdownOverlayColor='transparent'
                  rowStyle={styles.rowStyle}
                  renderCustomizedRowChild={(item: any) => {
                    return (
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center'
                        }}
                      >
                        <View>
                          <OText
                            size={14}
                            color={'#748194'}
                            style={{ textTransform: 'capitalize' }}
                          >
                            {item?.content}
                          </OText>
                        </View>
                      </View>
                    );
                  }}
                />
              </CommentsButtonGroup>
            )}

            {showTextArea && (
              <Comments ref={viewRef}>
                <OTextarea
                  textTareaRef={textTareaRef}
                  autoFocus
                  onFocus={handleFocus}
                  placeholder={t(
                    'PLEASE_TYPE_YOUR_COMMENTS_IN_HERE',
                    'Please type your comments in here',
                  )}
                  value={comments}
                  onChange={setComments}
                />
              </Comments>
            )}

            {action === 'reject' && (
              <View style={{ padding: 10, backgroundColor: theme.colors.gray100, borderRadius: 10 }}>
                <OText style={{ fontStyle: 'italic' }}>
                  {t('NOTE', 'Note')}
                  {': '}
                  {t('YOUR_CUSTOMER_WILL_RECEIVE_A_NOTIFICATION_ABOUT_THIS_ACTIONS', 'Your customer will receive a notification about this actions')}
                </OText>
              </View>
            )}

            {requiresImage && (
              <View style={styles.imageSection}>
                <OText size={16} weight="600" style={styles.imageText}>
                  {t('UPLOAD_STATUS_IMAGE', 'Upload status image')}
                </OText>
                {statusImage ? (
                  <View>
                    <OIcon
                      src={{ uri: statusImage.uri }}
                      style={styles.selectedImage}
                      cover
                    />
                    <OButton
                      text={t('REMOVE_IMAGE', 'Remove image')}
                      bgColor={theme.colors.red}
                      borderColor={theme.colors.red}
                      onClick={removeImage}
                      style={{ borderRadius: 7, height: 40 }}
                      textStyle={{ color: '#FFF', fontSize: 14 }}
                    />
                  </View>
                ) : (
                  <TouchableOpacity style={styles.imageContainer} onPress={handleImagePicker}>
                    <OIconButton
                      icon={theme.images.general.camera}
                      borderColor={theme.colors.clear}
                      iconStyle={{ width: 40, height: 40 }}
                      style={{ maxWidth: 60 }}
                      onClick={handleImagePicker}
                    />
                    <OText size={14} color={theme.colors.textGray} style={{ marginTop: 10 }}>
                      {t('TAP_TO_TAKE_PHOTO', 'Tap to take a photo')}
                    </OText>
                  </TouchableOpacity>
                )}
                {!statusImage && (
                  <OText style={styles.requiredText}>
                    {t('IMAGE_REQUIRED', 'Image is required')}
                  </OText>
                )}
              </View>
            )}

            {requiresPin && (
              <SecurityPinFields
                orders={pinOrders}
                pins={pins}
                onChange={handlePinChange}
                autoFocus={!requiresImage || !!statusImage}
                requiresConnection={pinNeedsConnection}
                retryInSeconds={pinSecondsLeft}
              />
            )}

            {!!submitErrorMessage && (
              <OText size={13} color={theme.colors.error} style={styles.submitError}>
                {submitErrorMessage}
              </OText>
            )}
          </Content>
        </View>
        <View
          style={{
            ...styles.bottomParent,
            marginBottom: Platform.OS === 'ios'
              ? 30 : (keyboardState.height === 0)
                ? isPage ? 0 : 40
                : keyboardState.height - (isPage ? 20 : -10)
          }}
        >
          {action === 'accept' && priorityStep && showDeliveryPrioritySelection ? (
            <OButton
              text={t('CONTINUE', 'Continue')}
              bgColor={deliveryPriority === null ? theme.colors.disabled : theme.colors.green}
              borderColor={deliveryPriority === null ? theme.colors.disabled : theme.colors.green}
              imgRightSrc={null}
              style={{ borderRadius: 7, height: 45 }}
              parentStyle={{ width: '100%' }}
              textStyle={{ color: '#FFF', fontSize: 18 }}
              isDisabled={deliveryPriority === null}
              onClick={() => setPriorityStep(false)}
            />
          ) : (
            <OButton
              text={buttonText}
              bgColor={
                isButtonDisabled
                  ? theme.colors.disabled
                  : isPositiveAction
                    ? theme.colors.green
                    : action === 'arrivedToBusiness'
                      ? theme.colors.primary
                      : theme.colors.red
              }
              borderColor={
                isButtonDisabled
                  ? theme.colors.disabled
                  : isPositiveAction
                    ? theme.colors.green
                    : action === 'arrivedToBusiness'
                      ? theme.colors.primary
                      : theme.colors.red
              }
              imgRightSrc={null}
              style={{
                borderRadius: 7,
                height: 45,
                opacity: isButtonDisabled ? 0.6 : 1
              }}
              parentStyle={{ width: '100%' }}
              textStyle={{ color: '#FFF', fontSize: 18 }}
              isDisabled={(showTextArea && !comments?.trim()) || (requiresImage && !statusImage) || (requiresPin && (!allPinsComplete || pinNeedsConnection || pinCoolingDown || !allLegacyPinsValid)) || isAcceptOrRejectInFlight({
                loading,
                isLoadingOrder,
                submitting
              })}
              onClick={() => {
                if (isButtonDisabled && currentStatus) {
                  checkAllRequirements(currentStatus, userLocation).then(({ valid, issues }) => {
                    if (!valid) {
                      setValidationIssues(issues);
                      setShowRequirementsModal(true);
                    }
                  });
                  return;
                }

                handleAcceptOrReject();
              }}
            />
          )}
        </View>
      </View>

      <Modal
        visible={showRequirementsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRequirementsModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <OText size={18} weight="600" style={styles.modalTitle}>
              {t('REQUIREMENTS_NOT_MET', 'Requirements Not Met')}
            </OText>
            <ScrollView showsVerticalScrollIndicator={false}>
              <ValidationIssuesList issues={validationIssues} showActions={true} />
            </ScrollView>
            <OButton
              text={t('CLOSE', 'Close')}
              onClick={() => setShowRequirementsModal(false)}
              bgColor={theme.colors.textGray}
              borderColor={theme.colors.textGray}
              textStyle={{ color: '#FFF', fontSize: 16 }}
              style={styles.closeButton}
            />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};
