import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useTheme } from 'styled-components/native';
import {
  Keyboard,
  Platform,
  View,
  ScrollView
} from 'react-native';
import { openSettings } from 'react-native-permissions';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { acceptOrRejectStyles } from './styles';
import { AcceptOrRejectOrderParams } from '../../types';
import { orderCommentList, getShowDeliveryPrioritySelection, checkLocationRequirements, isLocationValidationActive, apiErrorText, groupLabel, formatPhone, phoneUrl } from '../../utils'
import { themeVisible } from '@/theme/helpers';
import { useLanguage, useConfig, useEvent, useToast, ToastType } from '@components';
import { useOfflineActions } from '../../context/OfflineActions';
import {
  ChoiceRow, FieldError, Icon, KeyboardScreen, OBottomPopup, OButton, OCard, ODivider, OIcon, ONavbar, ONotice, OStepper, OText, OTextarea
} from '../shared';
import { useLocation } from '../../hooks/useLocation';
import { useOpenContact } from '../../hooks/useOpenContact';
import { usePhoneCountry } from '../../hooks/usePhoneCountry';
import { useStatusImage, StatusImage } from '../../hooks/useStatusImage';
import { useDeliveryPin } from '../../hooks/useDeliveryPin';
import { useSecureOrderId } from '../../hooks/useSecureOrderId';
import { deliveryPinRetryAfter, useDeliveryPinCooldown } from '../../hooks/useDeliveryPinCooldown';
import { FloatingButton } from '../FloatingButton';
import { RequirementsDialog } from '../OrderDetails/RequirementsDialog';
import { SecurityPinFields } from './SecurityPinFields';
import { CollectRecap } from './CollectRecap';
import { BlockLabel } from './BlockLabel';
import { isAcceptOrRejectInFlight } from './isAcceptOrRejectInFlight';
import { isSheetAction } from './presentation';
import { hasSingleCustomer, isOrderGroup } from './groupOrders';
import { offlineStatusChanges } from './offlineChange';
import { useRevealField } from './useRevealField';
import { DeliveryTime } from './DeliveryTime';
import type { DeliveryTimeHandle } from './DeliveryTime';
import { DELIVERY_TIME } from './deliveryTimeRules';

export const AcceptOrRejectOrder = (props: AcceptOrRejectOrderParams) => {
  const {
    isPage,
    customerCellphone,
    customerCountryPhoneCode,
    action,
    handleUpdateOrder,
    actions,
    closeModal,
    orderId,
    orders,
    groupId,
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
    orderRetryAfter,
    skipsStatusImage
  } = props;

  const [, t] = useLanguage();
  const theme: any = useTheme();
  const openContact = useOpenContact();
  const defaultCountry = usePhoneCountry();
  const [{ configs }] = useConfig();
  const [, { showToast }] = useToast();
  const [events] = useEvent();
  const [{ isNetConnected, canSaveChangesOffline }, { applyOffAction, registerOffOrder }] = useOfflineActions()
  const { getCurrentLocation, userLocation } = useLocation();
  const { requiresImage: statusRequiresImage, captureImage } = useStatusImage();
  const { requiresDeliveryPin, isDeliveryPinComplete, usesLegacyPin, isLegacyPinValid } = useDeliveryPin();
  const insets = useSafeAreaInsets();
  const { orderNumberLabel, displayOrderId } = useSecureOrderId();
  // As a page the safe-area container already keeps the top inset.
  const top = isPage ? 0 : insets.top
  const styles = useMemo(() => acceptOrRejectStyles(theme, top), [theme, top]);
  const request = theme.native.components.order_request.base;

  const [deliveryPriority, setDeliveryPriority] = useState<number | null>(null);
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
  const textTareaRef = useRef<any>(null);
  // The delivery time the sheet sends, in minutes; its control settles a number being typed when the sheet's buttons ask.
  const timeRef = useRef<DeliveryTimeHandle>(null);
  const [minutes, setMinutes] = useState<number>(DELIVERY_TIME.default);
  const [comments, setComments] = useState('');
  const [rejectReason, setRejectReason] = useState(null);
  const [statusImage, setStatusImage] = useState<StatusImage | null>(null);
  const [pins, setPins] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [showOrderError, setShowOrderError] = useState(false);
  const submittingRef = useRef(false);

  const isDriverApp = appTitle?.key === 'DELIVERY_APP'
  const orderCommentsList = orderCommentList(action, t)

  // The customer's phone as every screen writes it (international), and the number the call dials (with the country code).
  const numberToShow = notShowCustomerPhone ? '' : formatPhone(customerCellphone, customerCountryPhoneCode, defaultCountry);
  // A group's action speaks for the group: its title says the action and how many orders, with no customer (there are several).
  const isGroup = isOrderGroup(orders)
  const groupCount = orders?.length ?? 0
  const groupTitles: Record<string, string> = {
    accept: t('ACCEPT_ORDERS', 'Accept _count_ orders'),
    reject: t('REJECT_ORDERS', 'Reject _count_ orders'),
    pickupFailed: t('PICKUP_FAILED_FOR_ORDERS', 'Pickup failed for _count_ orders'),
    deliveryFailed: t('DELIVERY_FAILED_FOR_ORDERS', 'Delivery failed for _count_ orders'),
    notReady: t('ORDERS_NOT_READY', '_count_ orders not ready'),
    arrivedToBusiness: t('ARRIVED_TO_BUSINESS_FOR_ORDERS', 'Arrived to business for _count_ orders'),
    pickupComplete: t('PICKUP_COMPLETE_FOR_ORDERS', 'Pickup complete for _count_ orders'),
    deliveryComplete: t('DELIVERY_COMPLETE_FOR_ORDERS', 'Delivery complete for _count_ orders')
  }
  const groupTitle = isGroup ? groupTitles[action]?.replace('_count_', String(groupCount)) : undefined
  const titleOrder = groupTitle ?? t(orderTitle[action]?.key, orderTitle[action]?.text)
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
  // A sheet that does not change the order's status (the delivery time of an accepted request) has no photo to ask: its request
  // only saves the time, and a photo taken for it would be refused.
  const requiresImage = !skipsStatusImage && statusRequiresImage(currentStatus)

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
  const hasOrderError = Array.isArray(orderError) ? orderError.length > 0 : !!orderError
  // The API's words, never its code ("ERROR_ORDER_FIND"): a screen that failed with nothing to say shows nothing.
  const submitErrorMessage = !showOrderError
    ? null
    : pinErrorCode === 'delivery_pin.invalid'
      ? t('SECURITY_CODE_DOES_NOT_MATCH', 'The code does not match')
      : pinErrorCode === 'delivery_pin.too_many_attempts' || !hasOrderError
        ? null
        : apiErrorText(orderError, t)

  const handlePinChange = (id: number | string, pin: string) => {
    setShowOrderError(false)
    setPins((prev) => ({ ...prev, [String(id)]: pin.replace(/\D/g, '') }))
  }

  // The check is made against each order's own stop (its store's or its customer's place): a group's orders can be at different ones.
  const locationTargets = isGroup ? orders! : [order]

  const checkAllRequirements = async (status: number, providedLocation?: any): Promise<{ valid: boolean; issues: any[]; location?: any }> => {
    let location = providedLocation
    const issues: any[] = []
    for (const target of locationTargets) {
      const result = await checkOrderRequirements(status, target, location)
      location = location ?? result.location
      // The same words for the same fault (no location, an old one) are said once, not once per order.
      result.issues.forEach((issue: any) => {
        if (!issues.some((known) => known.type === issue.type && known.message === issue.message)) issues.push(issue)
      })
      // Where the driver is cannot be known: no order can be checked.
      if (!result.valid && result.issues.some((issue: any) => issue.type === 'LOCATION_ERROR')) break
    }
    return { valid: issues.length === 0, issues, location }
  }

  const checkOrderRequirements = async (status: number, target: any, providedLocation?: any) => {
    return checkLocationRequirements({
      status,
      order: target,
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

  // The comment field is kept in sight above the bar and the keyboard (see `useRevealField`).
  const reveal = useRevealField(scrollViewRef, textTareaRef);

  const handleArrowBack: any = () => {
    closeModal(false);
  };

  const handleImagePicker = async () => {
    const image = await captureImage();
    image && setStatusImage(image);
  };

  const removeImage = () => {
    setStatusImage(null);
  };

  // `typedMinutes`: the number the field settled on a moment ago (the state has not caught up with it yet).
  const handleAcceptOrReject = async (typedMinutes?: number | null) => {
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

    // The delivery time is one number of minutes, already inside the limits (what `delivered_in` carries).
    const time = typedMinutes ?? minutes;

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

    if (!isNetConnected && canSaveChangesOffline !== false) {
      // No connection: the change is queued for when it returns and nothing is sent now (a request sent and also queued would be
      // applied twice). What is queued is the plain body: a photo cannot wait in the queue (a `FormData` does not serialise),
      // so a status that asks for one says it needs a connection and the sheet stays. A group waits as one change per order,
      // each with its own id, the way the queue keeps them (one list of changes per order, replayed order by order).
      let queuedOffline = false;
      try {
        if (requiresImage) {
          showToast(ToastType.Error, t('IMAGE_REQUIRES_CONNECTION', 'You need an internet connection to send the photo'));
        } else {
          const queuedIds: Array<number | string> = isGroup ? orders!.map((groupOrder: any) => groupOrder.id) : [orderId!];
          const queued = await applyOffAction(offlineStatusChanges(queuedIds, bodyToSend));
          if (queued === false) {
            showToast(ToastType.Error, t('THE_CHANGE_WAS_NOT_SAVED', 'The change was not saved. Try again.'));
          } else {
            // What the offline store keeps is the order as it will be once synced (a list of them for a group), never the answer's flag.
            const updated = await handleUpdateOrder?.(
              statusToSend,
              bodyToSend,
              // The offline copy carries what the request would have: the delivery position chosen in the sheet is part of the
              // change (it is in the queued body) and of the order the list and the details draw meanwhile.
              { dataToSave: { status: statusToSend, unsync: true, ...(bodyToSend.delivery_position != null && { delivery_position: bodyToSend.delivery_position }) } }
            );
            for (const savedOrder of [updated].flat()) {
              if (savedOrder && typeof savedOrder === 'object' && savedOrder.id != null) await registerOffOrder(savedOrder);
            }
            queuedOffline = true;
          }
        }
      } catch {
        showToast(ToastType.Error, t('THE_CHANGE_WAS_NOT_SAVED', 'The change was not saved. Try again.'));
      } finally {
        // Whatever happened, the action is ready for another tap: a view that stays must not be left locked.
        submittingRef.current = false;
        setSubmitting(false);
      }
      if (queuedOffline) {
        if (deliveryPriority !== null) events.emit('delivery_position_updated');
        closeModal && closeModal();
      }
      return;
    }

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

    const locationOptions = currentLocation && !statusImage ? { location: currentLocation } : undefined;
    let orderUpdated: any = null;
    try {
      orderUpdated = await handleUpdateOrder?.(
        statusToSend,
        bodyToSend,
        serverPin ? { ...locationOptions, deliveryPins: pins, onStatusResponses: handleStatusResponses } : locationOptions
      );
      if (deliveryPriority !== null) events.emit('delivery_position_updated')
      if (serverPin && orderUpdated) {
        await clearPinRetry()
      }
    } catch {
      // The screen that gave the request words what went wrong (`orderError`); here a request that threw is only not done.
      orderUpdated = null
    } finally {
      // Whatever the request did (even throw), the action is ready for another tap: a stuck "loading" would lock the sheet.
      submittingRef.current = false
      setSubmitting(false)
      setShowOrderError(!orderUpdated)
    }
  };

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
  }, [action, userLocation, configs, order, orders])

  // The actions without a list of reasons are a sheet over the screen that opens them; the others keep the whole screen.
  const sheet = isSheetAction(action)
  // The sheet is one view: the position, when it is asked, is a row of it and not a step before the time.
  const needsPosition = action === 'accept' && showDeliveryPrioritySelection && deliveryPriority === null
  // The bar's slot of the action (accept is success, arriving is the screen's action, a failure is danger).
  const actionSlot = isPositiveAction ? 'accept' : action === 'arrivedToBusiness' ? 'button' : 'reject'

  // The screens that keep the whole screen (a failure, a rejection) name the order under their title.
  const showExternalId = configs?.change_order_id?.value === '1'
  const subjectId = order?.id ?? orderId
  const customerName = [order?.customer?.name, order?.customer?.lastname].filter(Boolean).join(' ')
  // A group is named by its number and, on a line of its own, by its orders' numbers in the list's order: one line, cut with an
  // ellipsis when they do not fit, so a long group never grows the screen. The customers' names are not shown (several).
  const groupNumber = groupId ?? order?.cart_group_id
  const groupName = groupNumber != null && groupNumber !== '' ? groupLabel(t, groupNumber) : ''
  const groupOrdersLabel = isGroup
    ? `${t('ORDERS_NO', 'Orders No.')} ${(orders ?? []).map((groupOrder: any) => displayOrderId(groupOrder, showExternalId)).join(', ')}`
    : ''
  const barSubtitle = isGroup
    ? groupName
    : [subjectId ? orderNumberLabel(order?.id ? order : subjectId, showExternalId) : '', customerName].filter(Boolean).join(' · ')
  // One phone to call makes sense for one customer: the group's call is kept only when its orders share theirs.
  const singleCustomer = !isGroup || hasSingleCustomer(orders)
  const showCustomerPhone = !notShowCustomerPhone && singleCustomer && themeVisible(theme, 'confirmation.customer.phone')

  // A requirement of the location blocks the action: it stays painted off and answers, to say why.
  const primaryBlocked = isButtonDisabled
  const primaryDisabled = needsPosition || (showTextArea && !comments?.trim()) || (requiresImage && !statusImage) || (requiresPin && (!allPinsComplete || pinNeedsConnection || pinCoolingDown || !allLegacyPinsValid)) || isAcceptOrRejectInFlight({
    loading,
    isLoadingOrder,
    submitting
  })

  const handlePrimaryAction = () => {
    // A time still being typed ends where the tap lands. A number that had to be brought to a limit is shown first: the next tap sends it.
    const typed = action === 'accept' ? timeRef.current?.flush() : undefined;
    if (typed?.corrected) return;
    if (isButtonDisabled && currentStatus) {
      checkAllRequirements(currentStatus, userLocation).then(({ valid, issues }) => {
        if (!valid) {
          setValidationIssues(issues);
          setShowRequirementsModal(true);
        }
      });
      return;
    }

    handleAcceptOrReject(typed?.value);
  }

  /**
   * A number of minutes being typed ends where a tap lands outside its field, as the keyboard's Done ends it (a valid
   * number is kept, an empty one restores the previous value, one outside the limits is brought to the nearest and shown).
   * Says whether there was a typing to end.
   */
  const endTyping = (): boolean => {
    if (!timeRef.current?.isEditing()) return false;
    timeRef.current.flush();
    Keyboard.dismiss();
    return true;
  }

  /** The orders of the group, on one line cut with an ellipsis: the screen's header has one subtitle line, taken by the group's number. */
  const renderGroupOrders = (text: string) => !!text && (
    <OText preset='body_sm' color='text_muted' numberOfLines={1} ellipsizeMode='tail' testID='group-orders-line'>{text}</OText>
  )

  const renderStatusImage = () => (
    <View testID='status-image' style={sheet ? styles.photoBlockSheet : styles.photoBlock}>
      <BlockLabel>{t('UPLOAD_STATUS_IMAGE', 'Upload status image')}</BlockLabel>
      {statusImage ? (
        // The taken photo is one row in the sheet and in the form: the 72 thumbnail and "Remove image" (44 high) filling the rest.
        <View style={styles.photoRow} testID='status-image-row'>
          <OIcon
            src={{ uri: statusImage.uri }}
            style={styles.photoThumb}
            cover
          />
          {/* The button's own box sizes itself (44 high, as wide as this holder): the holder takes the rest of the row and centers it beside the thumbnail. */}
          <View style={styles.photoRemove} testID='status-image-remove'>
            <OButton
              text={t('REMOVE_IMAGE', 'Remove image')}
              color='danger'
              appearance='outline'
              onClick={removeImage}
            />
          </View>
        </View>
      ) : (
        <>
          {/* One tile, two sizes: the sheet's is tall with its glyph over the text, the screen's is a row as tall as the thumbnail. */}
          <OCard onPress={handleImagePicker} style={sheet ? styles.photoTileSheet : styles.photoTile} accessibilityLabel={t('TAP_TO_TAKE_PHOTO', 'Tap to take a photo')} testID='status-image-picker'>
            <Icon name='camera-outline' size={sheet ? request.photo_tile_icon_size : 'lg'} color='text_muted' />
            <OText preset='body' color='text_muted'>
              {t('TAP_TO_TAKE_PHOTO', 'Tap to take a photo')}
            </OText>
          </OCard>
          <FieldError testID='status-image-error'>
            {t('IMAGE_REQUIRED', 'Image is required')}
          </FieldError>
        </>
      )}
    </View>
  )

  const renderSecurityPin = () => (
    <SecurityPinFields
      orders={pinOrders}
      pins={pins}
      onChange={handlePinChange}
      autoFocus={!requiresImage || !!statusImage}
      requiresConnection={pinNeedsConnection}
      retryInSeconds={pinSecondsLeft}
      // The cause (the code does not match) first, then the wait it brought.
      error={renderSubmitError()}
    />
  )

  const renderSubmitError = () => !!submitErrorMessage && (
    // Under the delivery code it is the code's error (centered as the code); else it starts where the content does.
    <FieldError center={requiresPin} testID='order-action-error'>
      {submitErrorMessage}
    </FieldError>
  )

  if (sheet) {
    // The action keeps the look the bottom bar gives it, at the end of the sheet.
    const look = theme.native.components.bottom_bar.slots[actionSlot]
    // Accepting asks for the position and the time on one view: its title names the action, not one of the two.
    const sheetTitle = action === 'accept' ? (groupTitle ?? t('ACCEPT_ORDER', 'Accept order')) : titleOrder
    return (
      <OBottomPopup
        open
        onClose={() => handleArrowBack()}
        // Typing the time: the dimmed page only ends it (the sheet stays), the next tap closes; the sheet's blank parts end it too.
        onBackdropPress={() => { if (!endTyping()) handleArrowBack(); }}
        onBlankPress={action === 'accept' ? () => { endTyping(); } : undefined}
        title={sheetTitle}
        closeIcon
        padded
        keyboardAware
        testID='order-sheet'
      >
        <View style={styles.sheetBody}>
          {isGroup && renderGroupOrders([groupName, groupOrdersLabel].filter(Boolean).join(' · '))}
          {action === 'accept' && (
            <>
              {showDeliveryPrioritySelection && (
                <>
                  <View style={styles.positionRow}>
                    <View style={styles.positionText}>
                      <OText preset='label'>{t('DELIVERY_POSITION', 'Delivery position')}</OText>
                      <OText preset='body_sm' color='text_muted'>
                        {isGroup
                          ? t('DELIVERY_PRIORITY_QUESTION_ORDERS', 'In which order will you deliver these orders?')
                          : t('DELIVERY_PRIORITY_QUESTION', 'In which order will you deliver this order?')}
                      </OText>
                    </View>
                    <OStepper
                      value={deliveryPriority ?? 0}
                      // Without a position yet the number is a "#" and the first step gives 1.
                      min={deliveryPriority === null ? 0 : 1}
                      max={deliveryPriority === null ? undefined : maxPosition ?? undefined}
                      label={deliveryPriority === null ? '#' : undefined}
                      // The time being typed ends first: the sheet's own buttons do not leave a half-typed number behind.
                      onChange={(position) => { timeRef.current?.flush(); setDeliveryPriority(position); }}
                      testID='delivery-priority-stepper'
                    />
                  </View>
                  <ODivider />
                </>
              )}
              <DeliveryTime ref={timeRef} minutes={minutes} onChange={setMinutes} disabled={submitting} />
            </>
          )}

          {/* What is collected is one order's: a group's orders can be paid in different ways, so none is drawn for it. */}
          {action === 'deliveryComplete' && !isGroup && <CollectRecap order={order} />}
          {requiresImage && renderStatusImage()}
          {requiresPin ? renderSecurityPin() : renderSubmitError()}

          <View style={primaryBlocked ? styles.blocked : undefined}>
            <OButton
              testID='order-action'
              text={buttonText}
              color={look.color}
              appearance={look.appearance}
              size={look.size}
              onClick={handlePrimaryAction}
              disabled={primaryDisabled}
              fitText
            />
          </View>
        </View>

        {/* Inside the sheet's own modal: a second modal beside it would not be presented over it on iOS. */}
        <RequirementsDialog
          open={showRequirementsModal}
          issues={validationIssues}
          onClose={() => setShowRequirementsModal(false)}
          testID='requirements-dialog'
        />
      </OBottomPopup>
    )
  }

  return (
    <KeyboardScreen
      enabled
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.screen}
    >
      <View style={styles.bar}>
        <ONavbar title={titleOrder} subtitle={barSubtitle || undefined} onBack={() => handleArrowBack()} />
      </View>
      <ScrollView
        ref={scrollViewRef}
        onLayout={reveal.onScrollLayout}
        onContentSizeChange={reveal.onContentSizeChange}
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps='handled'
      >
        {isGroup && renderGroupOrders(groupOrdersLabel)}
        {/* The texts under the screen's title are leads (`body_lg`), whatever the action. */}
        {action === 'forceStatus' && (
          <OText preset='body_lg'>
            {t('ORDER_STATUS_REGRESSION_DESCRIPTION', 'Moving an order back to a previous status requires a reason. Write it to confirm the change or cancel to keep the current status.')}
          </OText>
        )}
        {action === 'reject' && (
          <>
            {showCustomerPhone && (
              <>
                <OText preset='body_lg'>
                  {t(
                    'CALL_YOUR_CUSTOMER_TO_RESOLVE_THE_ISSUE_AS_POLITELY_AS_POSSIBLE',
                    'Call your customer to resolve the issue as politely as possible',
                  )}
                </OText>
                <OButton
                  appearance='outline'
                  icon={<Icon name='call' />}
                  text={numberToShow || t('NOT_NUMBER', "There's not phonenumber.")}
                  disabled={!numberToShow}
                  onClick={() => openContact(phoneUrl(customerCellphone, customerCountryPhoneCode, defaultCountry))}
                  testID='customer-phone-button'
                />
              </>
            )}

            <OText preset='body_lg'>
              {isGroup
                ? t('MARK_THE_ORDERS_AS_REJECTED', 'Mark the orders as rejected')
                : t('MARK_THE_ORDER_AS_REJECTED', 'Mark the order as rejected')}
            </OText>
          </>
        )}

        {orderCommentsList && isDriverApp && (
          <View testID='reject-reasons'>
            <BlockLabel>{t('WHAT_HAPPENED', 'What happened?')}</BlockLabel>
            <View style={styles.reasons}>
              {orderCommentsList?.list?.map((item: any, index: number, list: any[]) => (
                <ChoiceRow
                  key={item.key}
                  kind='radio'
                  listed
                  last={index === list.length - 1}
                  selected={rejectReason === item.value}
                  onPress={() => setRejectReason(item.value)}
                  testID={`reject-reason-${item.value}`}
                >
                  <OText style={styles.reasonText} weight={rejectReason === item.value ? 600 : undefined}>{item.content}</OText>
                </ChoiceRow>
              ))}
            </View>
          </View>
        )}

        {showTextArea && (
          <View onLayout={reveal.onBlockLayout} style={styles.field}>
            <OText preset='label'>{t('COMMENTS', 'Comments')}</OText>
            <OTextarea
              textTareaRef={textTareaRef}
              onFocus={reveal.onFocus}
              placeholder={t(
                'PLEASE_TYPE_YOUR_COMMENTS_IN_HERE',
                'Please type your comments in here',
              )}
              value={comments}
              onChange={setComments}
            />
          </View>
        )}

        {action === 'reject' && (
          <ONotice variant='info'>
            {`${t('NOTE', 'Note')}: ${singleCustomer
              ? t('YOUR_CUSTOMER_WILL_RECEIVE_A_NOTIFICATION_ABOUT_THIS_ACTIONS', 'Your customer will receive a notification about this action')
              : t('YOUR_CUSTOMERS_WILL_RECEIVE_A_NOTIFICATION_ABOUT_THIS_ACTION', 'Your customers will receive a notification about this action')}`}
          </ONotice>
        )}

        {requiresImage && renderStatusImage()}

        {requiresPin ? renderSecurityPin() : renderSubmitError()}
      </ScrollView>
      {/* The app's bottom bar (`components.bottom_bar`), in the flow so the keyboard lifts it with the screen. */}
      <FloatingButton
        inline
        isPadding
        testID='order-bottom-bar'
        buttonTestID='order-action'
        btnText={buttonText}
        slot={actionSlot}
        blocked={primaryBlocked}
        disabled={primaryDisabled}
        firstButtonClick={handlePrimaryAction}
      />

      <RequirementsDialog
        open={showRequirementsModal}
        issues={validationIssues}
        onClose={() => setShowRequirementsModal(false)}
        testID='requirements-dialog'
      />
    </KeyboardScreen>
  );
};
