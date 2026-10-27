import React, { useState, useEffect, useContext, useRef } from 'react';
import { StyleSheet, TouchableOpacity, View, Modal, ScrollView } from 'react-native';
import { useTheme } from 'styled-components/native';
import { Placeholder, PlaceholderLine, Fade } from 'rn-placeholder';
import Clipboard from '@react-native-clipboard/clipboard';
import MCIcon from 'react-native-vector-icons/MaterialCommunityIcons';

import { OrderDetailsParams } from '../../types';
import { verifyDecimals, getProductPrice, getOrderStatus, checkLocationRequirements, isLocationValidationActive } from '../../utils';
import { Actions, OrderDetailsContainer, Pickup, Messages as MessagesStyled, Header, Dot } from './styles';
import { OrderHeaderComponent } from './OrderHeaderComponent';
import { OrderDetailsInformation } from './OrderDetailsInformation'
import { ValidationIssuesList } from './ValidationIssuesList';
import { getOrderDetailsAcceptLoading, shouldCloseAcceptModalOnStatusChange } from './getOrderDetailsAcceptModalPlan';
import { useLocation } from '../../hooks/useLocation';
import { useStatusImage } from '../../hooks/useStatusImage';
import { useSecureOrderId } from '../../hooks/useSecureOrderId';
import { useDeliveryPin } from '../../hooks/useDeliveryPin';
import { useDriverOrderStage } from '../../hooks/useDriverOrderStage';
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

import {
  useOfflineActions,
  OAlertOriginal as Alert,
  AcceptOrRejectOrder,
  FloatingButton,
  DriverMap,
  NotFoundSource,
  OButton, OText, OModal,
  OIconButton
} from '@ui';
import SimpleLineIcons from 'react-native-vector-icons/SimpleLineIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

export const OrderDetailsUI = (props: OrderDetailsParams) => {
  const {
    navigation,
    messages,
    setMessages,
    readMessages,
    messagesReadList,
    driverLocation,
    actions,
    updateDriverPosition,
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
  const { order, loading, error } = props.order
  const isDelosiProject = ['delosi', 'delosipruebas'].includes(ordering?.project)

  const messagesReadIds = messagesReadList?.map((message: any) => message?.order_message_id)
  const filteredMessages = messagesReadList?.length > 0 ? messages?.messages?.filter((message: any) => !messagesReadIds?.includes(message?.id)) : messages?.messages

  const hideTimer = configs?.hidden_driver_eta_time?.value === '1'
  const isAllowedDriverRejectOrder = configs?.allow_driver_reject_order?.value === '1'
  const isHideRejectButtons = configs?.reject_orders_enabled && configs?.reject_orders_enabled?.value !== '1'
  const isEnabledOrderNotReady = configs?.order_not_ready_enabled?.value === '1'
  const isEnabledFailedPickupDriver = configs?.failed_pickup_by_driver_enabled?.value === '1'
  const theme = useTheme();
  const [, t] = useLanguage();
  const [session] = useSession();
  const [{ isNetConnected, canSaveChangesOffline }, { applyOffAction, registerOffOrder }] = useOfflineActions()

  const { userLocation, getCurrentLocation, followUserLocation, stopFollowUserLocation } = useLocation();
  const { requiresImage: statusRequiresImage } = useStatusImage();
  const { maskOrderId } = useSecureOrderId();
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

  const isReservation = order?.delivery_type === 9

  const { effectiveStatus, isPickupPhase } = useDriverOrderStage(order)

  const disabledActionsByInternet = isNetConnected !== null && !isNetConnected && canSaveChangesOffline === false

  const validStatusComplete = [9, 19, 23, 26]

  const pendingOrderStatus = [1, 4, 7, 13]

  const logisticOrderStatus = [4, 6, 7]

  const deliveryTypes = [1, 7]

  const pendingStatus = [0]

  const orderToReady = [7, 14]

  const statusForComplete = [4, 20, 21]

  const orderToComplete = isReservation ? [...statusForComplete, 7] : statusForComplete

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

  const showFloatButtonsPickUp: any = {
    8: !isHideRejectButtons,
    3: true,
    18: !isHideRejectButtons,
  };

  const showFloatButtonsAcceptOrReject: any = {
    0: true,
    4: true,
    7: true,
    14: true
  };

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

  const handleChangeOrderStatus = async (status: number) => {
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

    setLoadingOrder(true)
    if (!isNetConnected && canSaveChangesOffline !== false) {
      const result = applyOffAction({
        event: 'evt_off_change_order_status',
        data: { orderId: order?.id, body: { status } }
      })
    }

    const dataToSave: any = !isNetConnected && canSaveChangesOffline !== false
      ? { dataToSave: { status, unsync: true } }
      : null
    const statusOptions: any = {
      ...(dataToSave || {}),
      ...(currentLocation && { location: currentLocation })
    }
    const orderUpdated = props.handleChangeOrderStatus && await props.handleChangeOrderStatus(status, {}, statusOptions)

    if (!isNetConnected && canSaveChangesOffline !== false) {
      await registerOffOrder(orderUpdated)
    }
    setLoadingOrder(false)
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
      business: true,
      driver: false,
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
    const businessName = !!order?.business?.name
      ? `${order?.business?.name} \n`
      : '';

    const businessEmail = !!order?.business?.email
      ? `${order?.business?.email} \n`
      : '';

    const businessCellphone = !!order?.business?.cellphone
      ? `${order?.business?.cellphone} \n`
      : '';

    const businessPhone = !!order?.business?.phone
      ? `${order?.business?.phone} \n`
      : '';

    const businessAddress = !!order?.business?.address
      ? `${order?.business?.address} \n`
      : '';

    const businessSpecialAddress = !!order?.business?.address_notes
      ? `${order?.business?.address_notes} \n \n`
      : '';

    const customerName = !!order?.customer?.name
      ? `${order?.customer?.name} ${order?.customer?.middle_name || ''} ${order?.customer?.lastname || ''
      } ${order?.customer?.second_lastname || ''} \n`
      : '';

    const customerEmail = !!order?.customer.email
      ? `${order?.customer.email} \n`
      : '';

    const customerCellPhone = !!order?.customer?.cellphone
      ? `${order?.customer?.cellphone} \n`
      : '';

    const customerPhone = !!order?.customer?.phone
      ? `${order?.customer?.phone} \n`
      : '';

    const customerAddress = !!order?.customer?.address
      ? `${order?.customer?.address} \n`
      : '';

    const customerSpecialAddress = !!order?.customer?.address_notes
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

    const subtotal = `${t('SUBTOTAL', 'Subtotal')}: ${parsePrice(
      order?.subtotal,
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

    const orderStatus = `${t('INVOICE_ORDER_NO', 'Order No.')} ${maskOrderId(order.id)} ${t(
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

  const handleRejectLogisticOrder = () => {
    handleClickLogisticOrder?.(2, orderAssingId || order?.logistic_order_id)
    handleArrowBack()
  }

  const handleAcceptLogisticOrder = (order: any) => {
    handleClickLogisticOrder?.(1, orderAssingId || order?.logistic_order_id)
    if (order?.order_group) {
      handleArrowBack()
    }
  }

  const locations = [
    {
      ...order?.business?.location,
      title: order?.business?.name,
      icon: order?.business?.logo || theme.images.dummies.businessLogo,
      type: 'Business',
    },
    {
      ...order?.customer?.location,
      title: order?.customer?.name,
      icon:
        order?.customer?.photo ||
        'https://res.cloudinary.com/demo/image/upload/c_thumb,g_face,r_max/d_avatar.png/non_existing_id.png',
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
      showToast(ToastType.Error,
        props.order?.error?.[0] ||
        props.order?.error ||
        t('NETWORK_ERROR', 'Network Error'),
        5000)
    }
  }, [props.order?.error])

  let locationMarker: any;
  let isToFollow = false;
  let isBusinessMarker = false;
  const customerStatusses = [3, 9, 19, 23, 26]
  const businessStatusses = [7, 8, 18]
  const arrivedCustomerStatusses = [9, 19, 23]
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

  const styles = StyleSheet.create({
    driverOff: {
      backgroundColor: theme.colors.notAvailable,
    },
    btnPickUp: {
      borderWidth: 0,
      backgroundColor: theme.colors.btnBGWhite,
      borderRadius: 8,
    },
    icons: {
      maxWidth: 40,
      height: 40,
      padding: 10,
      alignItems: 'flex-end',
      color: theme.colors.gray200,
    },
    btnBackArrow: {
      borderWidth: 0,
      width: 24,
      height: 24,
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
      maxWidth: 400,
      maxHeight: '80%'
    },
    modalTitle: {
      marginBottom: 20,
      textAlign: 'center'
    },
    closeButton: {
      marginTop: 20,
      borderRadius: 7,
      height: 45
    },
    floatingValidationContainer: {
      backgroundColor: '#FFF3CD',
      borderLeftWidth: 4,
      borderLeftColor: '#D81212',
      padding: 12,
      paddingBottom: 20,
      marginTop: 8,
      marginBottom: 8,
      marginHorizontal: 20,
      borderRadius: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
      elevation: 5
    }
  });

  const OrderDetailsInformationProps = {
    order,
    effectiveStatus,
    isPickupPhase,
    logisticOrderStatus,
    deliveryTypes,
    handleChangeOrderStatus,
    disabledActionsByInternet,
    loadingOrder,
    goToPermissionPage,
    arrivedCustomerStatusses,
    handleViewActionOrder,
    isHideRejectButtons,
    isEnabledOrderNotReady
  }

  return (
    <>
      {(!order || Object.keys(order).length === 0) &&
        (error?.length < 1 || !error) && (
          <View
            style={{
              backgroundColor: theme.colors.backgroundLight,
              paddingHorizontal: 20,
            }}>
            {[...Array(6)].map((item, i) => (
              <Placeholder key={i} Animation={Fade}>
                <View style={{ flexDirection: 'row', marginBottom: 30 }}>
                  <Placeholder>
                    <PlaceholderLine width={90} />
                    <PlaceholderLine width={50} />
                    <PlaceholderLine width={20} />
                    <PlaceholderLine width={10} />
                  </Placeholder>
                </View>
              </Placeholder>
            ))}
          </View>
        )}

      {!((!order || Object.keys(order).length === 0) &&
        (props.order?.error?.length < 1 || !props.order?.error)) && order?.id && (
          <View style={{ flex: 1 }}>
            {!props.isCustomView && (
              <Header>
                <OIconButton
                  icon={theme.images.general.arrow_left}
                  borderColor={theme.colors.clear}
                  iconStyle={{ width: 24, height: 24 }}
                  style={styles.btnBackArrow}
                  onClick={() => handleArrowBack()}
                />
                {(!order?.isLogistic || (!logisticOrderStatus?.includes(order?.status) && !order?.order_group)) && (
                  <Actions>
                    {getOrderStatus(order?.status, t)?.slug !==
                      'PENDING' && (
                        <>
                          <TouchableOpacity onPress={() => handleCopyClipboard?.()}>
                            <MaterialCommunityIcons
                              name='content-copy'
                              color={theme.colors.gray200}
                              size={20}
                              style={styles.icons}
                            />
                          </TouchableOpacity>
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
                      style={{ ...styles.icons, minWidth: 40 }}
                      onClick={() => handleOpenMapView()}
                    />
                    <MessagesStyled>
                      {filteredMessages?.filter((message: any) => message?.author_id !== session?.user?.id && !message?.read)?.length > 0 && <Dot />}
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
                    </MessagesStyled>
                  </Actions>
                )}
              </Header>
            )}
            {order?.unsync && (
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'flex-start',
                  alignItems: 'center'
                }}
              >
                <MCIcon
                  name={'cloud-sync'}
                  color={'#444'}
                  size={16}
                />
                <OText
                  size={14}
                  color={theme.colors.textGray}
                  style={{ marginLeft: 5 }}
                >
                  {t('PENDING_SYNC_CHANGES', 'Pending sync changes')}
                </OText>
              </View>
            )}
            {order && Object.keys(order).length > 0 && (
              <>
                {((isButtonDisabledByValidation[3] && validationIssuesByStatus[3]?.length > 0) ||
                  (isButtonDisabledByValidation[9] && validationIssuesByStatus[9]?.length > 0)) && (
                  <View style={styles.floatingValidationContainer}>
                    <ValidationIssuesList
                      issues={validationIssuesByStatus[3]?.length > 0 ? validationIssuesByStatus[3] : validationIssuesByStatus[9]}
                      showActions={false}
                    />
                  </View>
                )}
                {((isButtonDisabledByValidation[26] && validationIssuesByStatus[26]?.length > 0) ||
                  (isButtonDisabledByValidation[11] && validationIssuesByStatus[11]?.length > 0)) && (
                  <View style={styles.floatingValidationContainer}>
                    <ValidationIssuesList
                      issues={validationIssuesByStatus[26]?.length > 0 ? validationIssuesByStatus[26] : validationIssuesByStatus[11]}
                      showActions={false}
                    />
                  </View>
                )}
                <OrderDetailsContainer
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                  hasFloatingButton={order &&
                    Object.keys(order).length > 0 &&
                    (pendingStatus.includes(effectiveStatus) ||
                      (orderToReady.includes(effectiveStatus) && !isReservation) ||
                      (orderToComplete.includes(effectiveStatus) && !deliveryTypes.includes(order?.delivery_type)))}
                >
                  <OrderHeaderComponent
                    order={order}
                    handleOpenMapView={handleOpenMapView}
                    handleOpenMessagesForBusiness={handleOpenMessagesForBusiness}
                    handleCopyClipboard={handleCopyClipboard}
                    getOrderStatus={getOrderStatus}
                    handleArrowBack={handleArrowBack}
                    logisticOrderStatus={logisticOrderStatus}
                    isCustomView={props.isCustomView}
                  />
                  {order?.order_group && order?.order_group_id && order?.isLogistic ? order?.order_group?.orders.map((order: any, i: number, hash: any) => (
                    <OrderDetailsInformation key={order?.id} {...OrderDetailsInformationProps} isOrderGroup lastOrder={hash?.length === i + 1} />
                  )) : (
                    <OrderDetailsInformation {...OrderDetailsInformationProps} />
                  )}
                </OrderDetailsContainer>
                {(showFloatButtonsPickUp[effectiveStatus] || isPickupPhase) && (
                  <FloatingButton
                    disabled={props.order?.loading || disabledActionsByInternet || loadingOrder}
                    btnText={t('PICKUP_FAILED', 'Pickup failed')}
                    isSecondaryBtn={false}
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
                    secondButton={true}
                    firstColorCustom={theme.colors.red}
                    secondColorCustom={theme.colors.green}
                    widthButton={'100%'}
                    isPadding={true}
                    isHideRejectButtons={isHideRejectButtons || !isEnabledFailedPickupDriver}
                  />
                )}
                {(validStatusComplete.includes(effectiveStatus)) && !(isDelosiProject && effectiveStatus !== 26 && isHideRejectButtons) && (
                  <>
                    <FloatingButton
                      disabled={props.order?.loading || disabledActionsByInternet || loadingOrder}
                      btnText={t('DELIVERY_FAILED', 'Delivery Failed')}
                      isSecondaryBtn={false}
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
                      secondButton={isDelosiProject ? order?.status === 26 : true}
                      firstColorCustom={theme.colors.red}
                      principalButtonColor={theme.colors.red}
                      secondColorCustom={theme.colors.green}
                      widthButton={'100%'}
                      isPadding={true}
                      isHideRejectButtons={isHideRejectButtons}
                    />
                  </>
                )}
                {showFloatButtonsAcceptOrReject[effectiveStatus] && (
                  <FloatingButton
                    disabled={props.order?.loading || disabledActionsByInternet || loadingOrder}
                    widthButton={'100%'}
                    isHideRejectButtons={isHideRejectButtons}
                    btnText={t('REJECT', 'Reject')}
                    firstColorCustom={theme.colors.red}
                    firstButtonClick={() => {
                      isGrantedPermissions
                        ? order?.isLogistic && (order?.order_group || logisticOrderStatus.includes(order?.status))
                          ? handleRejectLogisticOrder()
                          : handleViewActionOrder('reject')
                        : goToPermissionPage()
                    }}
                    isSecondaryBtn={false}
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
                    secondColorCustom={theme.colors.green}
                    isPadding={true}
                  />
                )}
              </>
            )}
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
            {openModalForMapView && (
              <OModal
                open={openModalForMapView}
                onClose={() => handleOpenMapView()}
                entireModal
                customClose>
                <DriverMap
                  navigation={navigation}
                  order={order}
                  orderStatus={getOrderStatus(order?.status, t)?.value || ''}
                  location={locationMarker}
                  readOnly
                  updateDriverPosition={updateDriverPosition}
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
                  colors={colors}
                />
              </OModal>
            )}
            {openModalForAccept && (
              <OModal
                open={openModalForAccept}
                onClose={() => setOpenModalForAccept(false)}
                entireModal
                customClose>
                <AcceptOrRejectOrder
                  handleUpdateOrder={props.handleChangeOrderStatus}
                  closeModal={setOpenModalForAccept}
                  customerCellphone={order?.customer?.cellphone}
                  loading={acceptLoading.loading}
                  action={actionOrder}
                  orderId={order?.id}
                  order={order}
                  activeOrdersCount={props.activeOrdersCount}
                  notShowCustomerPhone
                  actions={actions}
                  orderTitle={orderTitle}
                  appTitle={appTitle}
                  isLoadingOrder={acceptLoading.isLoadingOrder}
                  pendingStatusBody={pendingStatusBody}
                  orderError={props.order?.error}
                  orderErrorCodes={props.order?.errorCodes}
                  orderRetryAfter={props.order?.retryAfter}
                />
              </OModal>
            )}
          </View>
        )}

      {!order?.id && (!!props.order?.error || props.order?.error?.length > 0) && (
        <NotFoundSource
          btnTitle={t('GO_TO_MY_ORDERS', 'Go to my orders')}
          content={
            props.order.error[0] ||
            props.order.error ||
            t('NETWORK_ERROR', 'Network Error')
          }
          onClickButton={() => navigation.navigate('Orders')}
        />
      )}
      {alertState?.open && (
        <Alert
          open={alertState.open}
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
