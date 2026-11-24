import { TextInputProps } from 'react-native';
import { LatLng } from 'react-native-maps';
import type { ButtonAppearance, ButtonColor, ButtonSize } from '../components/shared/OButton';
export interface LoginParams {
  navigation?: any;
  formState?: any;
  useLoginByEmail?: boolean;
  useLoginByCellphone?: boolean;
  loginTab?: string;
  handleChangeTab?: any;
  loginButtonText?: string;
  onNavigationRedirect?: any;
  registerButtonText?: string;
  forgotButtonText?: string;
  verifyPhoneState?: any;
  checkPhoneCodeState?: any;
  setCheckPhoneCodeState?: any;
  handleButtonLoginClick?: any;
  handleSendVerifyCode?: any;
  handleCheckPhoneCode?: any;
  emailInputIcon?: any;
  passwordInputIcon?: any;
  allowedLevels?: any;
  useRootPoint?: any;
  notificationState?: any;
  handleReCaptcha?: any;
  enableReCaptcha?: any;

  otpType?: string,
  setOtpType: (type: string) => void,
  /** `channel`: 2 an SMS, 4 a WhatsApp message (the controller ignores it for an e-mail code). */
  generateOtpCode: (values?: any, channel?: number) => void,
  useLoginOtpEmail?: boolean,
  useLoginOtpCellphone?: boolean,
  useLoginOtpWhatsapp?: boolean,
  useLoginOtp?: boolean,
  validateDeveloperMode?: boolean
}
export interface otpParams {
  willVerifyOtpState: boolean,
  setWillVerifyOtpState: (val: boolean) => void,
  onSubmit: () => void,
  handleLoginOtp: (code: string) => void,
  setAlertState: any,
  formState?: any
  pinCount?: any
  isAlertOpen?: boolean
}
export interface ProfileParams {
  navigation?: any;
  isEdit?: boolean;
  formState?: any;
  userState?: any;
  toggleIsEdit?: any;
  cleanFormState?: any;
  setFormState?: any;
  isAvailableLoading?: boolean;
  handleChangeInput?: any;
  handleButtonUpdateClick?: any;
  /** Removes the user's photo (the headless `UserFormDetails` clears it with an empty `photo`). */
  handleRemovePhoto?: any;
  handleRemoveAccount?: any;
  handleToggleAvalaibleStatusDriver?: any;
  onNavigationRedirect?: any;
  handlechangeImage?: any;
  validationFields?: any;
  showField?: any;
  isRequiredField?: any;
  isShowDriverStatus?: boolean;
  isFocused?: boolean;
  setRootState?: any
}

export interface PhoneInputParams {
  data?: any;
  handleData?: any;
  defaultValue?: any;
  defaultCode?: number | null;
  forwardRef?: any;
  isDisabled?: boolean;
  textInputProps?: TextInputProps;
  onSubmitEditing?: () => void;
}

export interface LanguageSelectorParams {
  languagesState?: any;
  currentLanguage?: string;
  handleChangeLanguage?: any;
}
export interface NotFoundSourceParams {
  image?: any;
  content?: string;
  btnTitle?: string;
  /** The action waits (a request is running): dimmed, and its taps do nothing. */
  btnDisabled?: boolean;
  conditioned?: boolean;
  onClickButton?: any;
  children?: any;
}
export interface MessagesOptionParams {
  orders?: any;
  setOrders?: (status: any) => {};
  loadMore?: (key?: any) => {};
  orderList?: any;
  activeOrders?: boolean;
  pagination?: any;
  customArray?: Array<any>;
  messages?: any;
  setMessages?: () => {};
  loadMoreOrders?: () => {};
  loadOrders?: () => {};
  loadMessages?: () => {};
  handlerSubmit?: () => {};
  readMessages?: () => {};
  messagesReadList?: any;
  onNavigationRedirect?: any;
  setSortBy?: any;
  getOrders?: any
}
export interface OrdersOptionParams {
  /** A list the Orders tab is asked to show (`openOrdersTab`): `at` makes each ask a new one. */
  tabRequest?: { show?: 'orders' | 'requests', status?: number, at?: number };
  regressionRequest?: any;
  clearRegressionRequest?: () => void;
  orderList?: any;
  activeOrders?: boolean;
  pagination?: any;
  setRememberOrderStatus?: any;
  rememberOrderStatus?: any;
  titleContent?: string;
  customArray?: Array<any>;
  loadMoreOrders?: (options?: any) => {};
  loadOrders?: ({ }: any, options?: any) => {};
  messages?: any;
  setMessages?: () => {};
  loadMessages?: () => {};
  navigation?: any;
  setUpdateOtherStatus?: any;
  onNavigationRedirect?: any;
  orderStatus?: any;
  tabs?: any;
  currentTabSelected?: any;
  setCurrentTabSelected?: any;
  ordersGroup?: any;
  setOrdersGroup?: any;
  setCurrentFilters?: any;
  onFiltered?: ({ }: any) => {};
  filtered?: any;
  handleClickOrder?: any;
  orderGroupStatusCustom?: {
    active?: Array<number>;
    pending?: Array<number>;
    inProgress?: Array<number>;
    completed?: Array<number>;
    cancelled?: Array<number>;
  };
  handleClickLogisticOrder?: (status: number, orderId: number) => void,
  handleUpdateLogisticOrdersEta?: (orderIds: Array<number>, deliveredIn: number) => Promise<any>,
  logisticOrders?: { orders: Array<any>, loading: boolean, error: Array<string> | string },
  loadLogisticOrders?: () => void;
  isLogisticActivated?: boolean;
  checkNotification?: boolean;
  ordersFormatted?: any;
  handleChangeOrderStatus?: () => void;
  handleSendCustomerReview?: () => void;
  orderDetailsProps?: any;
  isNetConnected?: boolean | null;
  isDriverApp?: boolean;
  combineTabs?: boolean;
  /** The project's tabs are not known yet (neither its config nor a kept value): the screen holds its tab bar and its list. */
  tabsPending?: boolean;
  setCombineTabsState?: any;
  ordersFiltered?: any;
  loadingChangeOrder?: boolean
}
export interface PreviousMessagesParams {
  orders?: any;
  setOrders?: (status: any) => {};
  pagination?: any;
  getOrderStatus?: any;
  orderID?: number;
  reorderLoading?: boolean;
  messages?: any;
  setMessages?: (state?: any) => {};
  tabsFilter?: any;
  loadMoreOrders?: (status: any) => {};
  loadMessages?: (id: any) => {};
  handleReorder?: (order: any) => {};
  onNavigationRedirect?: (route: string, params?: any) => {};
  getOrders?: any;
  loading?: boolean;
  reload?: boolean;
  tabs?: any;
  loadMore: any
  error?: boolean
}
export interface OrderDetailsParams {
  handleUpdateLocationDriver?: () => {};
  setOrders?: (state: any) => {};
  actions?: actions;
  titleAccept?: textTranslate;
  titleReject?: textTranslate;
  titleNotReady?: textTranslate;
  appTitle?: textTranslate;
  drivers?: any;
  loadingDriver?: boolean;
  navigation?: any;
  messagesReadList?: any;
  urlToShare?: string;
  messages?: any;
  handleAssignDriver?: (id: any) => {};
  handleChangeOrderStatus?: (status: any, isAcceptOrReject: any, val?: any) => {};
  order?: any;
  /** The order the screen was opened for: known before the order loads. */
  orderId?: number | string;
  activeOrdersCount?: number;
  isFromRoot?: any;
  handleOrderRedirect?: () => {};
  setMessages?: () => {};
  readMessages?: () => {};
  isFromCheckout?: boolean;
  driverLocation?: any;
  goToBusinessList?: boolean;
  permissions?: any;
  askLocationPermission?: any;
  redirectToSettings?: any;
  updateDriverPosition?: any;
  driverUpdateLocation?: any;
  setDriverUpdateLocation?: any;
  handleClickLogisticOrder?: (status: number, orderId: number) => void;
  orderTitle?: any;
  forceUpdate?: number;
  regressionRequest?: any;
  clearRegressionRequest?: () => void;
  getPermissions?: any
  loadMessages?: any;
  notificationApp?: string
  orderAssingId?: any
  isGrantedPermissions?: any
  goToBack?: () => void;
}
export interface ProductItemAccordionParams {
  product?: any;
  comment?: string;
  changeQuantity?: (product: any, quantity: number) => {};
  offsetDisabled?: any;
  isFromCheckout?: any;
  isClickableEvent?: any;
  currency?: any;
}
export interface MessagesParams {
  type?: string;
  order?: any;
  orderId?: number;
  messages?: any;
  message?: string;
  image?: string;
  messagesToShow?: any;
  sendMessage?: any;
  canRead?: any;
  setCanRead?: any;
  notificationApp?: string
  handleSend?: () => {};
  setImage?: (image: string | null) => {};
  setMessage?: (comment: string) => {};
  setMessages?: (state?: any) => {};
  readMessages?: () => {};
}
/** The bar of actions pinned to the bottom of a screen (`FloatingButton`). */
export interface FloatingButtonParams {
  /** The first button's text: the screen's action when it stands alone, the negative one beside a second button. */
  btnText: string;
  secondBtnText?: string;
  /** A step before the bar's own actions (arrived to the business, to the customer), drawn over them in the bar's `button` slot. */
  stepBtnText?: string;
  stepButtonClick?: any;
  /** Another negative action (order not ready), drawn between the two in the bar's `reject` slot; the server's switch for rejecting does not hide it. */
  thirdBtnText?: string;
  thirdButtonClick?: any;
  /** The buttons sit on the page gutter. */
  isPadding?: boolean;
  firstButtonClick?: any;
  secondButtonClick?: any;
  disabled?: boolean;
  /** A second button (the positive action), drawn over the first. */
  secondButton?: boolean;
  /** The server turns rejecting off: the first button is not drawn. */
  isHideRejectButtons?: boolean;
  /** The first button is a negative action (a failure, a rejection) also when it stands alone. */
  negative?: boolean;
  /** The bar's slot a single action wears (`button` by default, `reject` with `negative`): `accept` for a positive one. */
  slot?: 'button' | 'accept' | 'reject';
  /** The action is blocked but still answers a tap (to say why): painted at the theme's disabled opacity, not disabled. */
  blocked?: boolean;
  /** The action is working: its spinner shows and it takes no tap. */
  loading?: boolean;
  /** The first action is drawn in outline, in its slot's color and size: a milder action under a stronger one, or one the driver need not take. */
  outline?: boolean;
  /** The first action wears this look (a slot of another component: the auth forms' `submit`, `cancel`) instead of its bar slot's. */
  buttonLook?: { color?: ButtonColor; appearance?: ButtonAppearance; size?: ButtonSize };
  /** The bar sits in the screen's flow (a screen that keeps it above its keyboard) instead of pinned to the bottom. */
  inline?: boolean;
  testID?: string;
  /** The test id of the first button. */
  buttonTestID?: string;
  /**
   * The button fires on a press and hold, not on a tap (`OButton`'s `hold`): for an irreversible step of
   * the delivery that fires on its own, with no sheet, form or dialog between the tap and the effect.
   * One flag per button, named as its click: the first, the second, the step and the third action.
   */
  firstButtonHold?: boolean;
  secondButtonHold?: boolean;
  stepButtonHold?: boolean;
  thirdButtonHold?: boolean;
  /**
   * What a tap on a button that is `disabled` does (`OButton`'s `onDisabledPress`): the buttons stay painted off and
   * keep their disabled state, and a tap says why they are off. Every button of the bar takes it.
   */
  onDisabledPress?: () => void;
}
export interface Location {
  latitude: number;
  longitude: number;
  speed: number;
  mocked?: boolean;
  timestamp?: number;
}

/** What the driver's map of an order takes (`DriverMap`). */
export interface GoogleMapsParams {
  /** The route's end; `icon` is the picture of who it stands for (the pin paints the theme's placeholder without one). */
  location: { lat: number; lng: number; icon?: string | null; title: string; type?: 'Business' | 'Customer' };
  maxLimitLocation?: number;
  isToFollow?: boolean;
  markerTitle?: string;
  showAcceptOrReject?: boolean;
  order?: any;
  handleOpenMapView?: () => void;
  isBusinessMarker?: boolean;
  handleViewActionOrder?: (action: string) => void;
  driverUpdateLocation?: any;
  setDriverUpdateLocation?: any;
  getOrderStatus?: any;
  logisticOrderStatus?: any;
}

interface actions {
  accept: string;
  reject: string;
  pickupFailed?: string;
  deliveryFailed?: string;
  notReady?: string;
  forcePickUp?: string;
  forceDelivery?: string;
}

interface textTranslate {
  key: string;
  text: string;
}

export interface AcceptOrRejectOrderParams {
  customerCellphone?: string;
  /** The calling code of `customerCellphone` (`customer.country_phone_code`): the call is dialled with it. */
  customerCountryPhoneCode?: string | number | null;
  closeModal?: any;
  loading?: boolean;
  action: string;
  orderId?: number;
  orders?: any[];
  /** The number of the group these orders belong to (`cart_group_id`), when the action is for a group. */
  groupId?: string | number;
  handleUpdateOrder?: (p1?: any, p2?: any, p3?: any) => any;
  notShowCustomerPhone?: boolean | undefined;
  actions?: any;
  titleAccept?: textTranslate;
  titleReject?: textTranslate;
  titleNotReady?: textTranslate;
  appTitle?: textTranslate;
  orderTitle?: any
  isPage?: boolean
  navigation?: any
  route?: any
  isLoadingOrder?: boolean
  pendingStatusBody?: any
  orderError?: string | string[]
  orderErrorCodes?: string[] | null
  orderRetryAfter?: number | null
  order?: any
  activeOrdersCount?: number
  /** The sheet does not change the order's status (it saves the delivery time of an accepted request): it asks for no status photo. */
  skipsStatusImage?: boolean
}

export interface MapViewParams {
  onNavigationRedirect: (page: string, params?: any) => void,
  getBusinessLocations: () => void,
  setDriverLocation: (location: any) => void,
  isLoadingBusinessMarkers?: boolean,
  isDeliveryApp: boolean,
  markerGroups: Array<any>,
  customerMarkerGroups: Array<any>,
  alertState: { open: boolean, content: Array<string>, key?: string | null },
  setAlertState: ({ open, content, key }: { open: boolean, content: Array<string>, key?: string | null }) => void
}

export interface ReviewCustomerParams {
  order?: any,
  closeModal?: any,
  reviewState?: any,
  setReviewState?: any,
  actionState?: any,
  handleChangeQualification?: any,
  handleSendCustomerReview?: any,
  handleCustomCustomerReview?: any,
}

export interface OrderDetailsLogisticParams {
  navigation: any,
  handleClickLogisticOrder: any,
  handleUpdateLogisticOrdersEta?: (orderIds: Array<number>, deliveredIn: number) => Promise<any>,
  orderAssingId: number,
  order: any
}

export interface SessionsParams {
  navigation: any,
  sessionsList?: any,
  actionState?: any,
  handleDeleteSession?: any,
  handleDeleteAllSessions?: any
}

export interface StripeConnectAccountParams {
  navigation?: any,
  accountState?: any,
  onboardingState?: any,
  handleGetAccount?: any,
  handleGetOnboardingUrl?: any
}

export interface PayoutsParams {
  navigation?: any,
  payoutList?: any,
  pagination?: any,
  statusSelected?: string | null,
  loadMorePayouts?: any,
  handleChangeStatus?: any,
  handleRefreshPayouts?: any
}

export interface RenderMarkerParams {
  marker: any,
  customer?: boolean,
  orderIds?: Array<number>
  onNavigationRedirect?: any,
  initialPosition?: LatLng,
  locationSelected?: LatLng,
  setLocationSelected ?: any
}
