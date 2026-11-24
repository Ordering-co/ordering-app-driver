import React, { useState, useEffect, useContext, useMemo, useRef } from 'react';
import { View, ScrollView } from 'react-native';
import { useTheme } from 'styled-components/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Clipboard from '@react-native-clipboard/clipboard';

import { OrderDetailsParams } from '../../types';
import { apiErrorText, formatPhone, verifyDecimals, getProductPrice, getOrderStatus, checkLocationRequirements, isLocationValidationActive } from '../../utils';
import { bottomBarClearance, themeBottomSpace, themeVisible } from '@/theme/helpers';
import { usePageSections } from '@/theme/sections';
import { deliveryStyles } from './styles';
import { ValidationIssuesList } from './ValidationIssuesList';
import { RequirementsDialog } from './RequirementsDialog';
import { getOrderDetailsAcceptLoading, shouldCloseAcceptModalOnStatusChange } from './getOrderDetailsAcceptModalPlan';
import { DELIVERY_TYPES, OFFERED_STATUSES, isOfferedStatus, isOnTheWayToStoreStatus } from './orderStages';
import { FocusOrder } from './focus/FocusOrder';
import { orderSubtotal } from './OrderBill';
import { FocusSkeleton } from './focus/FocusSkeleton';
import { FocusReviewBar } from './focus/FocusReviewBar';
import { canReviewCustomer } from './reviewCustomer';
import { isSheetAction } from '../AcceptOrRejectOrder/presentation';
import { useLocation } from '../../hooks/useLocation';
import { useStatusImage } from '../../hooks/useStatusImage';
import { useSecureOrderId } from '../../hooks/useSecureOrderId';
import { useDeliveryPin } from '../../hooks/useDeliveryPin';
import { useDriverOrderStage } from '../../hooks/useDriverOrderStage';
import { useUnreadMessagesOfOrder } from '../../hooks/useUnreadMessagesOfOrder';
import { afterRelease, useSettledWhileHeld } from '../shared/holdLatch';
import { useOnReconnect } from '../../../../context/SocketReconnectContext';
import { useRefetchAfterMutation } from '../../hooks/useRefetchAfterMutation';
import { useAnnounceOrderChange } from '../../hooks/useAnnounceOrderChange';
import { useNoConnectionHint } from '../../hooks/useNoConnectionHint';
import { usePhoneCountry } from '../../hooks/usePhoneCountry';
import { isOrderQueued } from '../../context/OfflineActions/offlineActionsQueue';
import { PermissionsContext } from '../../../../context/PermissionsContext';

import {
  useLanguage,
  OrderDetails as OrderDetailsConTableoller,
  useToast,
  useSession,
  ToastType,
  useUtils,
  useConfig,
  useApi
} from '@components';

import { useOfflineActions } from '../../context/OfflineActions';
import {
  OAlertOriginal as Alert,
  Icon,
  OBadge,
  OButton,
  OModal,
  ONavbar,
  ONotice,
} from '../shared';
import { AcceptOrRejectOrder } from '../AcceptOrRejectOrder';
import { FloatingButton } from '../FloatingButton';
import { DriverMap } from '../DriverMap';
import { NotFoundSource } from '../NotFoundSource';

export const OrderDetailsUI = (props: OrderDetailsParams) => {
  const {
    navigation,
    messages,
    messagesReadList,
    driverLocation,
    actions,
    driverUpdateLocation,
    setDriverUpdateLocation,
    orderTitle,
    appTitle,
    handleClickLogisticOrder,
    forceUpdate,
    orderAssingId,
    regressionRequest,
    clearRegressionRequest
  } = props;

  const { permissions, askLocationPermission, redirectToSettings, getPermissions, isGrantedPermissions } = useContext(PermissionsContext);
  const [, { showToast }] = useToast();
  const [{ parsePrice, parseNumber }] = useUtils();
  const [{ configs }] = useConfig();
  const [ordering] = useApi()
  const { order, loading } = props.order
  const isDelosiProject = ['delosi', 'delosipruebas'].includes(ordering?.project)

  const messagesReadIds = messagesReadList?.map((message: any) => message?.order_message_id)
  const filteredMessages = messagesReadList?.length > 0 ? messages?.messages?.filter((message: any) => !messagesReadIds?.includes(message?.id)) : messages?.messages

  const hideTimer = configs?.hidden_driver_eta_time?.value === '1'
  const isAllowedDriverRejectOrder = configs?.allow_driver_reject_order?.value === '1'
  const isHideRejectButtons = configs?.reject_orders_enabled && configs?.reject_orders_enabled?.value !== '1'
  const isEnabledOrderNotReady = configs?.order_not_ready_enabled?.value === '1'
  const isEnabledFailedPickupDriver = configs?.failed_pickup_by_driver_enabled?.value === '1'
  const theme: any = useTheme();
  const insets = useSafeAreaInsets();
  const { render, isVisible } = usePageSections('order_details');
  const [, t] = useLanguage();
  const defaultCountry = usePhoneCountry();
  const [session] = useSession();
  const [{ isNetConnected, canSaveChangesOffline, actions: queuedChanges }, { applyOffAction, registerOffOrder }] = useOfflineActions()

  const { userLocation, getCurrentLocation, followUserLocation, stopFollowUserLocation } = useLocation();
  const { requiresImage: statusRequiresImage } = useStatusImage();
  const { orderNumberLabel, orderNumberShort } = useSecureOrderId();
  const { requiresDeliveryPin } = useDeliveryPin();

  const [actionOrder, setActionOrder] = useState('');
  const [openModalForMapView, setOpenModalForMapView] = useState(false);
  const [openModalForAccept, setOpenModalForAccept] = useState(false);
  const [pendingStatusBody, setPendingStatusBody] = useState<any>(null);
  const [loadingOrder, setLoadingOrder] = useState(false);
  const previousOrderStatusRef = useRef(order?.status);
  const acceptLoading = getOrderDetailsAcceptLoading({
    orderLoading: loading,
    loadingOrder
  });
  const [showRequirementsModal, setShowRequirementsModal] = useState(false);
  const [validationIssues, setValidationIssues] = useState<any[]>([]);
  const [isButtonDisabledByValidation, setIsButtonDisabledByValidation] = useState<{ [key: number]: boolean }>({
    3: false, 9: false, 11: false, 26: false
  });
  const [validationIssuesByStatus, setValidationIssuesByStatus] = useState<{ [key: number]: any[] }>({
    3: [], 9: [], 11: [], 26: []
  });
  const [alertState, setAlertState] = useState<{
    open: boolean;
    content: Array<string>;
    key?: string | null;
  }>({ open: false, content: [], key: null });

  const { effectiveStatus, isPickupPhase } = useDriverOrderStage(order)

  // Offline is a connection known to be gone (not one still being read): the order's bar and the list's cards decide it alike.
  const offline = isNetConnected === false
  const disabledActionsByInternet = offline && canSaveChangesOffline === false
  // The steps painted off for lack of a connection still answer a tap, to say so (one short toast, never stacked).
  const noConnectionHint = useNoConnectionHint()
  const whenOffline = disabledActionsByInternet ? noConnectionHint : undefined

  const validStatusComplete = [9, 19, 23, 26]

  const arrivedCustomerStatusses = [9, 19, 23]

  const pendingOrderStatus = [1, 4, 7, 13]

  const logisticOrderStatus = [4, 6, 7]

  const showFloatButtonsPickUp: any = {
    8: !isHideRejectButtons,
    3: true,
    18: !isHideRejectButtons,
  };

  const showFloatButtonsAcceptOrReject: any = Object.fromEntries(OFFERED_STATUSES.map((status) => [status, true]));

  const showPickupButtons = showFloatButtonsPickUp[effectiveStatus] || isPickupPhase
  // Every status step of the order is in the bottom bar (decision of 2026-11-18). "Arrived to business" (on
  // the way to the store) and "Arrived to customer" (on the way to the customer) are the bar's step, over
  // its two actions, and its only button when those two are not offered; "Order not ready" (at the store)
  // sits between "Pickup complete" and "Pickup failed". The three are for a delivery. "Arrived to business"
  // is offered only while the driver is on the way to the store: once the order has been through the arrival
  // (the business marks it ready afterwards) the stage resolves to "at the store" and the bar has three buttons.
  const isDelivery = DELIVERY_TYPES.includes(order?.delivery_type)
  const showArrivedToBusiness = isOnTheWayToStoreStatus(effectiveStatus) && isDelivery
  const showArrivedToCustomer = arrivedCustomerStatusses.includes(effectiveStatus) && isDelivery
  const showOrderNotReady = effectiveStatus === 3 && isDelivery && isEnabledOrderNotReady
  const showCompleteButtons = validStatusComplete.includes(effectiveStatus) && !(isDelosiProject && effectiveStatus !== 26 && isHideRejectButtons)
  const showAcceptOrRejectButtons = isOfferedStatus(effectiveStatus)

  // How many buttons the bottom bar stacks: the scroll leaves their room.
  const hidesReject = !!isHideRejectButtons
  const showDeliveryComplete = isDelosiProject ? order?.status === 26 : true
  // An order that is over has one button in the bar: review its customer.
  const showReviewBar = isVisible('review') && canReviewCustomer(order)
  const barButtons = Math.max(
    Number(showArrivedToBusiness) + (showPickupButtons ? 1 + Number(showOrderNotReady) + Number(!(hidesReject || !isEnabledFailedPickupDriver)) : 0),
    Number(showArrivedToCustomer) + (showCompleteButtons ? Number(showDeliveryComplete) + Number(!hidesReject) : 0),
    showAcceptOrRejectButtons ? 1 + Number(!hidesReject) : 0,
    Number(showReviewBar)
  )
  const clearance = (barButtons > 0 && isVisible('actions')) || showReviewBar
    ? bottomBarClearance(theme, insets.bottom, barButtons)
    : themeBottomSpace(theme, insets.bottom)
  const styles = useMemo(() => deliveryStyles(theme, clearance), [theme, clearance])

  const checkRequirements = async (status: number, providedLocation?: any): Promise<{ valid: boolean, issues: any[], location?: any }> => {
    return checkLocationRequirements({
      status,
      order,
      configs,
      t,
      getCurrentLocation,
      providedLocation,
      callbacks: {
        onRefreshLocation: getCurrentLocation,
        onOpenSettings: redirectToSettings,
        onCloseModal: () => setShowRequirementsModal(false),
        onRevalidate: async (newLocation: any) => {
          const { valid, issues } = await checkRequirements(status, newLocation);
          if (valid) {
            setShowRequirementsModal(false);
            setIsButtonDisabledByValidation(prev => ({ ...prev, [status]: false }));
            setValidationIssuesByStatus(prev => ({ ...prev, [status]: [] }));
          } else {
            setValidationIssues(issues);
            setValidationIssuesByStatus(prev => ({ ...prev, [status]: issues }));
          }
        },
        showToast
      },
      ToastType
    });
  };

  // A status change is one at a time: the first hold takes the bar (and a GPS fix can take seconds before the request
  // goes out), a second hold meanwhile would send the same step twice. And a catch-up asked meanwhile (the socket came
  // back) waits for the answer: the older GET must not put the previous stage's buttons back.
  const { track: trackChange, catchUp, inFlight: changingStatus } = useRefetchAfterMutation(
    () => {
      (props as any).getOrder?.()
      props.loadMessages?.()
    },
    !!props.order?.loading
  )

  // The one place this screen's status changes go through (the bar's steps, the accept sheet, the reason forms, the photo and
  // PIN sheets): the controller's request, counted as in flight, and announced once to the orders list when the API answered
  // and the order changed, so the list shows the new stage without a socket (`OrdersOption` listens). The controller answers
  // the order on success and `null` on a failure; a change saved offline (`dataToSave`) is only queued, so it is not announced.
  const announceOrderChange = useAnnounceOrderChange()
  const sendStatusChange = (status: any, body?: any, options?: any) => trackChange(async () => {
    const answer = await (props.handleChangeOrderStatus as any)?.(status, body, options)
    if (answer && !options?.dataToSave) announceOrderChange({ orderIds: [order?.id].filter(Boolean) })
    return answer
  })

  const changeOrderStatus = async (status: number) => {
    const statusesRequiringLocation = [3, 9, 11, 26];
    const validationEnabled = isLocationValidationActive(configs, status);
    let currentLocation = null;

    if (statusesRequiringLocation.includes(status) && validationEnabled) {
      const { valid, issues, location } = await checkRequirements(status);
      if (!valid) {
        setValidationIssues(issues);
        setShowRequirementsModal(true);
        return;
      }
      currentLocation = location;
    }

    if (offline && canSaveChangesOffline !== false) {
      applyOffAction({
        event: 'evt_off_change_order_status',
        data: { orderId: order?.id, body: { status } }
      })
    }

    const dataToSave: any = offline && canSaveChangesOffline !== false
      ? { dataToSave: { status, unsync: true } }
      : null
    const statusOptions: any = {
      ...(dataToSave || {}),
      ...(currentLocation && { location: currentLocation })
    }
    const orderUpdated = props.handleChangeOrderStatus && await sendStatusChange(status, {}, statusOptions)

    if (offline && canSaveChangesOffline !== false) {
      await registerOffOrder(orderUpdated)
    }
  }

  const handleChangeOrderStatus = async (status: number) => {
    // Set before the first await: a second hold that lands during the location check is turned away.
    if (changingStatus()) return
    setLoadingOrder(true)
    try {
      await trackChange(() => changeOrderStatus(status))
    } catch (error: any) {
      // The request or the offline queue threw: the step did not happen, and the driver is told instead of left looking at a bar that did nothing.
      showToast(ToastType.Error, error?.message)
    } finally {
      // Whatever happened (the request or the offline queue threw, the location was refused) the bar is the driver's again.
      setLoadingOrder(false)
    }
  }

  useEffect(() => {
    const relevantStatuses = [];
    if ([0, 7, 8].includes(effectiveStatus)) relevantStatuses.push(3);
    if ([3, 8, 18].includes(effectiveStatus)) relevantStatuses.push(9);
    if ([9, 19, 23, 26].includes(effectiveStatus)) relevantStatuses.push(11);
    if ([9].includes(effectiveStatus)) relevantStatuses.push(26);

    let minMaxAge = 5;
    if (relevantStatuses.length > 0 && configs) {
      const maxAges = relevantStatuses.map(status => {
        const configKey = `location_validation_validity_status_${status}`;
        return parseInt(configs?.[configKey]?.value || '5', 10);
      });
      minMaxAge = Math.min(...maxAges);
    }

    const locationAgeMinutes = userLocation?.timestamp
      ? (Date.now() - userLocation.timestamp) / 1000 / 60
      : 999;

    if (!userLocation?.timestamp || locationAgeMinutes > minMaxAge) {
      getCurrentLocation().catch(err => console.log(err));
    }

    followUserLocation();

    return () => {
      stopFollowUserLocation();
    };
  }, []);

  useEffect(() => {
    const statusesToValidate = [3, 9, 11, 26];

    (async () => {
      for (const status of statusesToValidate) {
        const validationEnabled = isLocationValidationActive(configs, status);

        if (!validationEnabled) {
          setIsButtonDisabledByValidation(prev => ({ ...prev, [status]: false }));
          setValidationIssuesByStatus(prev => ({ ...prev, [status]: [] }));
          continue;
        }

        if (!userLocation?.latitude && !userLocation?.longitude) {
          setIsButtonDisabledByValidation(prev => ({ ...prev, [status]: true }));
          setValidationIssuesByStatus(prev => ({ ...prev, [status]: [] }));
          continue;
        }

        const shouldValidate =
          (status === 3 && [0, 7, 8, 18].includes(effectiveStatus)) ||
          (status === 9 && [0, 3, 7, 8, 18].includes(effectiveStatus)) ||
          (status === 11 && [9, 19, 23, 26].includes(effectiveStatus)) ||
          (status === 26 && [9, 19].includes(effectiveStatus));

        if (!shouldValidate) {
          setIsButtonDisabledByValidation(prev => ({ ...prev, [status]: false }));
          setValidationIssuesByStatus(prev => ({ ...prev, [status]: [] }));
          continue;
        }

        try {
          const { valid, issues } = await checkRequirements(status, userLocation);
          setIsButtonDisabledByValidation(prev => ({ ...prev, [status]: !valid }));
          setValidationIssuesByStatus(prev => ({ ...prev, [status]: issues }));
        } catch (error) {
          setIsButtonDisabledByValidation(prev => ({ ...prev, [status]: true }));
          setValidationIssuesByStatus(prev => ({ ...prev, [status]: [] }));
        }
      }
    })();
  }, [userLocation, configs, effectiveStatus]);

  const handleOpenMessagesForBusiness = () => {
    navigation?.navigate('OrderMessage', {
      orderId: order?.id,
      order,
      setOrders: props.setOrders,
    });
  };

  const goToPermissionPage = () => {
    navigation.navigate('RequestPermissions')
  }

  const handleOpenMapView = async () => {
    if (!isGrantedPermissions) {
      navigation.navigate('RequestPermissions')
      return
    }
    const _permissions = await getPermissions()

    const isBlocked = _permissions.some((_permission: any) => permissions?.locationStatus?.[_permission] === 'blocked')
    const isGranted = _permissions.reduce((allPermissions: boolean, _permission: any) => allPermissions && permissions?.locationStatus?.[_permission] === 'granted', true)

    if (isGranted) {
      setOpenModalForMapView(!openModalForMapView);
    } else if (isBlocked) {
      // redirectToSettings();
      showToast(
        ToastType.Error,
        t(
          'GEOLOCATION_SERVICE_PERMISSION_BLOCKED',
          'Geolocation service  permissions blocked.',
        ),
      );
    } else {
      const response: any = await askLocationPermission();
      const isGranted = _permissions.reduce((allPermissions: boolean, _permission: string) => allPermissions && response?.locationStatus?.[_permission] === 'granted', true)
      if (isGranted) {
        setOpenModalForMapView(true)
      }
    }
  };

  const getFormattedSubOptionName = ({ quantity, name, position, price }: any) => {
    if (name !== 'No') {
      const pos = position && position !== 'whole' ? `(${t(position.toUpperCase(), position)})` : '';
      return pos
        ? `${quantity} x ${name} ${pos} +${parsePrice(price)}\n`
        : `${quantity} x ${name} +${parsePrice(price)}\n`;
    } else {
      return 'No\n';
    }
  };

  const handleCopyClipboard = () => {
    const businessName = order?.business?.name
      ? `${order?.business?.name} \n`
      : '';

    const businessEmail = order?.business?.email
      ? `${order?.business?.email} \n`
      : '';

    // The phones as the screens write them: international, with the party's country code.
    const businessCellphone = order?.business?.cellphone
      ? `${formatPhone(order?.business?.cellphone, order?.business?.country_phone_code, defaultCountry)} \n`
      : '';

    const businessPhone = order?.business?.phone
      ? `${formatPhone(order?.business?.phone, order?.business?.country_phone_code, defaultCountry)} \n`
      : '';

    const businessAddress = order?.business?.address
      ? `${order?.business?.address} \n`
      : '';

    const businessSpecialAddress = order?.business?.address_notes
      ? `${order?.business?.address_notes} \n \n`
      : '';

    const customerName = order?.customer?.name
      ? `${order?.customer?.name} ${order?.customer?.middle_name || ''} ${order?.customer?.lastname || ''
      } ${order?.customer?.second_lastname || ''} \n`
      : '';

    const customerEmail = order?.customer.email
      ? `${order?.customer.email} \n`
      : '';

    const customerCellPhone = order?.customer?.cellphone
      ? `${formatPhone(order?.customer?.cellphone, order?.customer?.country_phone_code, defaultCountry)} \n`
      : '';

    const customerPhone = order?.customer?.phone
      ? `${formatPhone(order?.customer?.phone, order?.customer?.country_phone_code, defaultCountry)} \n`
      : '';

    const customerAddress = order?.customer?.address
      ? `${order?.customer?.address} \n`
      : '';

    const customerSpecialAddress = order?.customer?.address_notes
      ? `${order?.customer?.address_notes} \n`
      : '';

    const payment = order?.paymethod?.name
      ? `${order?.paymethod?.name} - ${order.delivery_type === 1
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
                    : t('DELIVERY', 'Delivery')
      }\n`
      : '';

    const getSuboptions = (suboptions: any) => {
      const array: any = []
      suboptions?.length > 0 &&
        suboptions?.map((suboption: any) => {
          const string = `${getFormattedSubOptionName(suboption)}`
          array.push(string)
        })

      return array.join('')
    }

    const getOptions = (options: any, productComment: string = '') => {
      const array: any = [];

      options?.length &&
        options?.map((option: any) => {
          const string =
            `  ${option.name}\n    ${getSuboptions(option.suboptions)}`;

          array.push(string)
        })

      if (productComment) {
        array.push(`  ${t('COMMENT', 'Comment')}\n    ${productComment}\n`)
      }

      return array.join('')
    }

    const productsInArray =
      order?.products.length &&
      order?.products.map((product: any, i: number) => {
        const string =
          `${product?.quantity} X ${product?.name} ${parsePrice(product.total ?? getProductPrice(product))}\n${getOptions(product.options, product.comment)}`;

        return i === 0 ? ` ${string}` : string
      });

    const productsInString = productsInArray.join(' ');
    const orderDetails = `${t(
      'ORDER_DETAILS',
      'Order Details',
    )}:\n${productsInString}\n`;

    // The bill's own subtotal (the summary's, with the taxes the prices include), not a field the order does not carry.
    const subtotal = `${t('SUBTOTAL', 'Subtotal')}: ${parsePrice(
      orderSubtotal(order),
    )}\n`;

    const drivertip = `${t('DRIVER_TIP', 'Driver tip')} ${parsePrice(
      order?.summary?.driver_tip || order?.totalDriverTip,
    )}\n`;

    const deliveryFee = `${t('DELIVERY_FEE', 'Delivery fee')} ${verifyDecimals(
      order?.service_fee,
      parseNumber,
    )}% ${parsePrice(order?.summary?.service_fee || order?.serviceFee || 0)}\n`;

    const total = `${t('TOTAL', 'Total')} ${parsePrice(
      order?.summary?.total || order?.total,
    )}\n`;

    const orderStatus = `${orderNumberLabel(order)} ${t(
      'IS',
      'is',
    )} ${getOrderStatus(order?.status, t)?.value}\n`;

    Clipboard.setString(
      `${orderStatus} ${payment} ${t(
        'BUSINESS_DETAILS',
        'Business Details',
      )}\n ${businessName} ${businessEmail} ${businessCellphone} ${businessPhone} ${businessAddress} ${businessSpecialAddress}${t(
        'CUSTOMER_DETAILS',
        'Customer Details',
      )}\n ${customerName} ${customerEmail} ${customerCellPhone} ${customerPhone} ${customerAddress} ${customerSpecialAddress}\n${orderDetails} ${subtotal} ${drivertip} ${deliveryFee} ${total}`,
    );

    showToast(
      ToastType.Info,
      t('COPY_TO_CLIPBOARD', 'Copy to clipboard.'),
      1000,
    );
  };

  const handleViewActionOrder = (action: string) => {
    if (action === 'reject' && !isAllowedDriverRejectOrder) {
      setAlertState({
        open: true,
        content: [
          t('DRIVER_NOT_ALLOWED_TO_REJECT_ORDER', 'The driver is not allowed to reject an order.'),
        ],
        key: null,
      })
      return
    }
    if (!isGrantedPermissions) {
      navigation.navigate('RequestPermissions')
      return
    }
    if (openModalForMapView) {
      setOpenModalForMapView(false);
    }
    setActionOrder(action);
    setOpenModalForAccept(true);
  };

  const handleArrowBack: any = () => {
    if (alertState?.open && !isAllowedDriverRejectOrder && !pendingOrderStatus.includes(order?.status)) {
      setAlertState({
        ...alertState,
        open: false
      })
      return
    }
    navigation?.canGoBack() && navigation.goBack();
  };

  // The reject is held and answers while the finger is still on it: going back waits for the finger to lift, so the
  // button is not taken away from under it (`holdLatch`).
  // The answer to an assign request: counted as in flight and, once the API answered and it took, announced to the lists
  // (the request leaves the requests, an accepted one joins the orders). The screen may be gone when the answer comes.
  const answerLogisticRequest = (status: 1 | 2, order: any) => {
    trackChange(async () => {
      const answer: any = await (handleClickLogisticOrder as any)?.(status, orderAssingId || order?.logistic_order_id)
      if (answer && answer.error === false) {
        announceOrderChange({ orderIds: answer.orderIds ?? [order?.order?.id ?? order?.id].filter(Boolean), request: true, accepted: status === 1 })
      }
      return answer
    }).catch(() => {})
  }

  const handleRejectLogisticOrder = () => {
    answerLogisticRequest(2, order)
    afterRelease(handleArrowBack)
  }

  const handleAcceptLogisticOrder = (order: any) => {
    answerLogisticRequest(1, order)
    if (order?.order_group) {
      handleArrowBack()
    }
  }

  // The map's pin paints the theme's placeholder itself when there is no picture.
  const locations = [
    {
      ...order?.business?.location,
      title: order?.business?.name,
      icon: order?.business?.logo,
      type: 'Business',
    },
    {
      ...order?.customer?.location,
      title: order?.customer?.name,
      icon: order?.customer?.photo,
      type: 'Customer',
    },
  ];

  useEffect(() => {
    if (permissions?.locationStatus !== 'granted' && openModalForMapView) {
      setOpenModalForMapView(false);
    }
  }, [permissions?.locationStatus]);

  useEffect(() => {
    if (openModalForMapView) {
      setOpenModalForMapView(false);
    }
  }, [props.order?.loading]);

  // The socket came back (or the app returned after a long while in the background): what changed on this order
  // meanwhile (its status, its driver, its messages) came as events that were lost, so the details load it again.
  // A change of this screen on the way holds it until the change ends (`useRefetchAfterMutation`).
  useOnReconnect(() => {
    if (!order?.id) return
    catchUp()
  })

  useEffect(() => {
    if (shouldCloseAcceptModalOnStatusChange({
      acceptModalOpen: openModalForAccept,
      orderStatus: order?.status,
      previousOrderStatus: previousOrderStatusRef.current
    })) {
      setOpenModalForAccept(false);
    }
    previousOrderStatusRef.current = order?.status;
  }, [order?.status, openModalForAccept]);

  useEffect(() => {
    if (!regressionRequest) return
    setPendingStatusBody(regressionRequest.body)
    setActionOrder('forceStatus')
    setOpenModalForAccept(true)
    clearRegressionRequest?.()
  }, [regressionRequest])

  useEffect(() => {
    if (order?.driver_id === null && session?.user?.level === 4) {
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
    if (driverLocation) {
      locations[0] = driverLocation;
    }
  }, [driverLocation]);

  useEffect(() => {
    forceUpdate && handleViewActionOrder && handleViewActionOrder(forceUpdate === 9 ? 'forcePickUp' : 'forceDelivery')
  }, [forceUpdate])

  useEffect(() => {
    if (openModalForAccept) return
    if (!!props.order?.error || props.order?.error?.length > 0) {
      showToast(ToastType.Error, apiErrorText(props.order?.error, t), 5000)
    }
  }, [props.order?.error])

  let locationMarker: any;
  let isToFollow = false;
  let isBusinessMarker = false;
  const customerStatusses = [3, 9, 19, 23, 26]
  const businessStatusses = [7, 8, 18]
  if (businessStatusses?.includes(effectiveStatus)) {
    const markerBusiness = 'Business';
    isBusinessMarker = true;
    locationMarker = locations.find(
      (location: any) => location.type === markerBusiness,
    );

    if (effectiveStatus === 8 || effectiveStatus === 18) {
      isToFollow = true;
    }
  } else if (customerStatusses?.includes(effectiveStatus)) {
    const markerCustomer = 'Customer';
    isToFollow = true;
    isBusinessMarker = false;
    locationMarker = locations.find(
      (location: any) => location.type === markerCustomer,
    );
  } else {
    const markerBusiness = 'Business';
    locationMarker = locations.find(
      (location: any) => location.type === markerBusiness,
    );
  }

  // One count with the Messages list and the tab: reading the chat (`order_message_read`) clears it here too.
  const unreadMessages = useUnreadMessagesOfOrder(order?.id, filteredMessages, session?.user?.id, messages?.loading)
  const slots = theme.native.components.order_details.slots
  // The count of unread messages looks the same wherever it is written: the chat's slot.
  const unreadSlot = theme.native.components.chat_bubble.slots.unread

  /** The top bar's actions: copy the order and open the chat (the map is the stop's button). */
  const barActions = (!order?.isLogistic || (!logisticOrderStatus?.includes(order?.status) && !order?.order_group)) ? (
    <>
      {getOrderStatus(order?.status, t)?.slug !== 'PENDING' && themeVisible(theme, 'confirmation.order.copy') && (
        <OButton
          iconOnly
          color={slots.copy.color}
          appearance={slots.copy.appearance}
          size={slots.copy.size}
          icon={<Icon name='copy-outline' size='lg' />}
          accessibilityLabel={t('COPY_ORDER', 'Copy order')}
          onClick={() => handleCopyClipboard?.()}
        />
      )}
      {themeVisible(theme, 'confirmation.order.messages') && (
        <View>
          <OButton
            iconOnly
            color={slots.messages.color}
            appearance={slots.messages.appearance}
            size={slots.messages.size}
            icon={<Icon name='chatbubble-ellipses-outline' size='lg' />}
            accessibilityLabel={t('MESSAGES', 'Messages')}
            onClick={() => handleOpenMessagesForBusiness()}
          />
          {unreadMessages > 0 && (
            <View style={styles.unread} pointerEvents='none' testID='order-unread-corner'>
              <OBadge count variant={unreadSlot.variant} size={unreadSlot.size} testID='order-unread-messages'>{unreadMessages}</OBadge>
            </View>
          )}
        </View>
      )}
    </>
  ) : undefined

  const pickupIssues = (isButtonDisabledByValidation[3] && validationIssuesByStatus[3]?.length > 0) ||
    (isButtonDisabledByValidation[9] && validationIssuesByStatus[9]?.length > 0)
  const deliveryIssues = (isButtonDisabledByValidation[26] && validationIssuesByStatus[26]?.length > 0) ||
    (isButtonDisabledByValidation[11] && validationIssuesByStatus[11]?.length > 0)
  const hasOrder = order && Object.keys(order).length > 0
  // The notice of a change that waits for its sync is the queue's to decide, as the card's cloud: a copy of the order that says
  // `unsync` (the list's snapshot this screen was opened with) goes stale once the queue has sent it.
  const pendingSync = isOrderQueued(queuedChanges, order?.id)
  // The order is a request of a group (the logistic assignment): each of its orders is drawn in a card of its own.
  const isOrderGroup = !!(order?.order_group && order?.order_group_id && order?.isLogistic)

  const handleArrivedToBusiness = () => {
    if (!isGrantedPermissions) {
      goToPermissionPage();
      return;
    }

    if (statusRequiresImage(3)) {
      handleViewActionOrder && handleViewActionOrder('arrivedToBusiness');
    } else {
      handleChangeOrderStatus(3);
    }
  }

  const handleArrivedToCustomer = () =>
    isGrantedPermissions ? handleChangeOrderStatus(26) : goToPermissionPage()

  // A status step the driver cannot take back, on a button that fires it by itself (no sheet for a photo or
  // a code, no form for a reason, no page for a permission between the tap and the effect), is held:
  // a stray touch must not tell the business or the customer something false. One that opens a view with its
  // own submit asks nothing more, so it stays a tap.
  const holdArrivedToBusiness = !!isGrantedPermissions && !statusRequiresImage(3)
  const holdPickupComplete = !!isGrantedPermissions && !statusRequiresImage(9)
  const holdArrivedToCustomer = !!isGrantedPermissions
  const holdDeliveryComplete = !!isGrantedPermissions && !(statusRequiresImage(11) || requiresDeliveryPin(order))
  // An assign request (the logistic assignment) is answered in place; any other offered order opens the accept
  // sheet or the reject form. Only the reject is held: accepting is never held (a tap, the time is valuable
  // there), not the assignment's and not the direct accept with no ETA to give (`hidden_driver_eta_time`).
  const isAssignRequest = !!(order?.isLogistic && (order?.order_group || logisticOrderStatus.includes(order?.status)))
  const holdReject = !!isGrantedPermissions && isAssignRequest

  /** The bottom bar: every status step of the order (arrived, pickup, not ready, delivery, accept or reject). */
  const renderActions = () => (
    <>
      {showArrivedToBusiness && !showPickupButtons && (
        <FloatingButton
          disabled={props.order?.loading || disabledActionsByInternet || loadingOrder}
          onDisabledPress={whenOffline}
          btnText={t('ARRIVED_TO_BUSINESS', 'Arrived to business')}
          firstButtonClick={handleArrivedToBusiness}
          firstButtonHold={holdArrivedToBusiness}
          slot='button'
          isPadding={true}
        />
      )}
      {showPickupButtons && (
        <FloatingButton
          disabled={props.order?.loading || disabledActionsByInternet || loadingOrder}
          onDisabledPress={whenOffline}
          stepBtnText={showArrivedToBusiness ? t('ARRIVED_TO_BUSINESS', 'Arrived to business') : undefined}
          stepButtonClick={handleArrivedToBusiness}
          stepButtonHold={holdArrivedToBusiness}
          thirdBtnText={showOrderNotReady ? t('ORDER_NOT_READY', 'Order not ready') : undefined}
          thirdButtonClick={() => handleViewActionOrder && handleViewActionOrder('notReady')}
          btnText={t('PICKUP_FAILED', 'Pickup failed')}
          secondButtonClick={() => {
            if (!isGrantedPermissions) {
              goToPermissionPage();
              return;
            }

            if (statusRequiresImage(9)) {
              handleViewActionOrder && handleViewActionOrder('pickupComplete');
            } else {
              handleChangeOrderStatus(9);
            }
          }}
          firstButtonClick={() =>
            handleViewActionOrder && handleViewActionOrder('pickupFailed')
          }
          secondBtnText={t('PICKUP_COMPLETE', 'Pickup complete')}
          secondButtonHold={holdPickupComplete}
          secondButton={true}
          isPadding={true}
          isHideRejectButtons={isHideRejectButtons || !isEnabledFailedPickupDriver}
        />
      )}
      {showArrivedToCustomer && !showCompleteButtons && (
        <FloatingButton
          disabled={props.order?.loading || disabledActionsByInternet || loadingOrder}
          onDisabledPress={whenOffline}
          btnText={t('ARRIVED_TO_CUSTOMER', 'Arrived to customer')}
          firstButtonClick={handleArrivedToCustomer}
          firstButtonHold={holdArrivedToCustomer}
          slot='button'
          isPadding={true}
        />
      )}
      {showCompleteButtons && (
        <FloatingButton
          disabled={props.order?.loading || disabledActionsByInternet || loadingOrder}
          onDisabledPress={whenOffline}
          stepBtnText={showArrivedToCustomer ? t('ARRIVED_TO_CUSTOMER', 'Arrived to customer') : undefined}
          stepButtonClick={handleArrivedToCustomer}
          stepButtonHold={holdArrivedToCustomer}
          btnText={t('DELIVERY_FAILED', 'Delivery failed')}
          secondButtonClick={() => {
            if (!isGrantedPermissions) {
              goToPermissionPage();
              return;
            }

            if (statusRequiresImage(11) || requiresDeliveryPin(order)) {
              handleViewActionOrder && handleViewActionOrder('deliveryComplete');
            } else {
              handleChangeOrderStatus(11);
            }
          }}
          firstButtonClick={() =>
            handleViewActionOrder && handleViewActionOrder('deliveryFailed')
          }
          secondBtnText={t('DELIVERY_COMPLETE', 'Delivery complete')}
          secondButtonHold={holdDeliveryComplete}
          secondButton={showDeliveryComplete}
          negative
          isPadding={true}
          isHideRejectButtons={isHideRejectButtons}
        />
      )}
      {showAcceptOrRejectButtons && (
        <FloatingButton
          disabled={props.order?.loading || disabledActionsByInternet || loadingOrder}
          onDisabledPress={whenOffline}
          isHideRejectButtons={isHideRejectButtons}
          btnText={t('REJECT', 'Reject')}
          firstButtonHold={holdReject}
          firstButtonClick={() => {
            isGrantedPermissions
              ? order?.isLogistic && (order?.order_group || logisticOrderStatus.includes(order?.status))
                ? handleRejectLogisticOrder()
                : handleViewActionOrder('reject')
              : goToPermissionPage()
          }}
          secondButton={true}
          secondBtnText={t('ACCEPT', 'Accept')}
          secondButtonClick={() => {
            isGrantedPermissions
              ? hideTimer
                ? handleChangeOrderStatus(8)
                : (order?.isLogistic && (order?.order_group || logisticOrderStatus.includes(order?.status)))
                  ? handleAcceptLogisticOrder(order)
                  : handleViewActionOrder('accept')
              : goToPermissionPage()
          }}
          isPadding={true}
        />
      )}
    </>
  )

  // What the accept / reject view gets, whether it is a modal over the screen or (for the actions without a
  // list of reasons) its own sheet.
  const acceptOrRejectProps = {
    handleUpdateOrder: props.handleChangeOrderStatus && sendStatusChange,
    closeModal: setOpenModalForAccept,
    customerCellphone: order?.customer?.cellphone,
    customerCountryPhoneCode: order?.customer?.country_phone_code,
    loading: acceptLoading.loading,
    action: actionOrder,
    orderId: order?.id,
    order,
    activeOrdersCount: props.activeOrdersCount,
    notShowCustomerPhone: true,
    actions,
    orderTitle,
    appTitle,
    isLoadingOrder: acceptLoading.isLoadingOrder,
    pendingStatusBody,
    orderError: props.order?.error,
    orderErrorCodes: props.order?.errorCodes,
    orderRetryAfter: props.order?.retryAfter
  }

  /** The bottom bar of an order that is over: review its customer. */
  const renderReviewBar = () => <FocusReviewBar order={order} />

  // A held button fires with the finger still on it, and the step it takes changes the bar (the next stage's buttons, or
  // the review bar): the bar stays as it was until the finger lifts, so the pressed button is not replaced under it
  // (`holdLatch`: the touch's end would never be heard and the next touch on the screen would be ignored).
  const bars = useSettledWhileHeld(
    <>
      {render({ actions: renderActions }, { group: ['actions'] })}
      {render({ review: renderReviewBar }, { group: ['review'] })}
    </>
  )

  // The three states of the screen: the order loading, the order, or its error (the bar is drawn in all).
  const isOrderLoading = (!order || Object.keys(order).length === 0) && (props.order?.error?.length < 1 || !props.order?.error)
  const isOrderPage = !isOrderLoading && !!order?.id
  const isOrderError = !order?.id && (!!props.order?.error || props.order?.error?.length > 0)

  // The bar says "Order" and, on the line under it, the order's number ("No. 123"): two lines, as the
  // chat's bar, because the bar's three buttons leave no room for "Order No. 123" on one (decision of
  // 2026-11-17). Before the order arrives (and when it is not found) the number is the one the screen was
  // opened with, so the bar does not change when the order loads; a project that shows external ids
  // waits for the order.
  const showExternalId = configs?.change_order_id?.value === '1'
  const barNumber = order?.id
    ? orderNumberShort(order, showExternalId)
    : !showExternalId && props.orderId ? orderNumberShort(props.orderId) : undefined

  return (
    <>
      <View style={styles.page}>
        <ONavbar title={t('ORDER', 'Order')} subtitle={barNumber} onBack={() => handleArrowBack()} right={isOrderPage ? barActions : undefined} rightButtons />
        {isOrderLoading && <FocusSkeleton />}

        {isOrderPage && (
          <>
            {(pendingSync || (hasOrder && (pickupIssues || deliveryIssues))) && (
              <View style={styles.notices}>
                {pendingSync && (
                  <ONotice variant='info'>
                    {t('PENDING_SYNC_CHANGES', 'Pending sync changes')}
                  </ONotice>
                )}
                {hasOrder && pickupIssues && (
                  <ONotice variant='warning' showIcon={false}>
                    <ValidationIssuesList
                      issues={validationIssuesByStatus[3]?.length > 0 ? validationIssuesByStatus[3] : validationIssuesByStatus[9]}
                      showActions={false}
                    />
                  </ONotice>
                )}
                {hasOrder && deliveryIssues && (
                  <ONotice variant='warning' showIcon={false}>
                    <ValidationIssuesList
                      issues={validationIssuesByStatus[26]?.length > 0 ? validationIssuesByStatus[26] : validationIssuesByStatus[11]}
                      showActions={false}
                    />
                  </ONotice>
                )}
              </View>
            )}
            {hasOrder && (
              <>
                <ScrollView
                  testID='order-details-scroll'
                  style={styles.scroll}
                  contentContainerStyle={styles.content}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  {isOrderGroup ? order?.order_group?.orders.map((groupOrder: any) => (
                    <FocusOrder
                      key={groupOrder?.id}
                      order={groupOrder}
                      logisticOrderStatus={logisticOrderStatus}
                      driverPosition={userLocation}
                      onOpenMap={handleOpenMapView}
                      isOrderGroup
                    />
                  )) : (
                    <FocusOrder
                      order={order}
                      logisticOrderStatus={logisticOrderStatus}
                      driverPosition={userLocation}
                      onOpenMap={handleOpenMapView}
                      completeOffered={showCompleteButtons && showDeliveryComplete && isVisible('actions')}
                    />
                  )}
                </ScrollView>
                {bars}
              </>
            )}
            <RequirementsDialog
              open={showRequirementsModal}
              issues={validationIssues}
              onClose={() => setShowRequirementsModal(false)}
              testID='requirements-dialog'
            />
            {openModalForMapView && (
              <OModal
                open={openModalForMapView}
                onClose={() => handleOpenMapView()}
                entireModal
                customClose>
                <DriverMap
                  order={order}
                  location={locationMarker}
                  driverUpdateLocation={driverUpdateLocation}
                  setDriverUpdateLocation={setDriverUpdateLocation}
                  handleViewActionOrder={handleViewActionOrder}
                  isBusinessMarker={isBusinessMarker}
                  isToFollow={isToFollow}
                  showAcceptOrReject={
                    showFloatButtonsAcceptOrReject[effectiveStatus]
                  }
                  handleOpenMapView={handleOpenMapView}
                  logisticOrderStatus={logisticOrderStatus}
                  getOrderStatus={getOrderStatus}
                />
              </OModal>
            )}
            {openModalForAccept && (isSheetAction(actionOrder) ? (
              <AcceptOrRejectOrder {...acceptOrRejectProps} />
            ) : (
              <OModal
                open={openModalForAccept}
                onClose={() => setOpenModalForAccept(false)}
                entireModal
                customClose>
                <AcceptOrRejectOrder {...acceptOrRejectProps} />
              </OModal>
            ))}
          </>
        )}

        {isOrderError && (
          <View style={styles.gutter}>
            <NotFoundSource
              btnTitle={t('GO_TO_MY_ORDERS', 'Go to my orders')}
              content={apiErrorText(props.order.error, t)}
              onClickButton={() => navigation.popTo('BottomTab', { screen: 'Orders' })}
            />
          </View>
        )}
      </View>
      {alertState?.open && (
        <Alert
          open={alertState.open}
          notice
          onAccept={handleArrowBack}
          onClose={handleArrowBack}
          content={alertState.content}
          title={t('WARNING', 'Warning')}
        />
      )}
    </>
  );
};

export const OrderDetailsDelivery = (props: OrderDetailsParams) => {
  const orderDetailsProps = {
    ...props,
    UIComponent: OrderDetailsUI,
  };
  return <OrderDetailsConTableoller {...orderDetailsProps} />;
};
