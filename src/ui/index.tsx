//Components
import { AcceptOrRejectOrder } from './src/components/AcceptOrRejectOrder';
import { Chat } from './src/components/Chat';
import { FloatingButton } from './src/components/FloatingButton';
import { ForgotPasswordForm } from './src/components/ForgotPasswordForm';
import { Home } from './src/components/Home';
import { LanguageSelector } from './src/components/LanguageSelector';
import { LoginForm } from './src/components/LoginForm';
import { LogoutButton } from './src/components/LogoutButton';
import { MessagesOption } from './src/components/MessagesOption';
import { NotFoundSource } from './src/components/NotFoundSource';
import { OrderMessage } from './src/components/OrderMessage';
import { OrderDetailsDelivery } from './src/components/OrderDetails/Delivery';
import { OrdersOption } from './src/components/OrdersOption';
import { OrdersOptionCity } from './src/components/OrdersOptionCity';
import { OrdersOptionDate } from './src/components/OrdersOptionDate';
import { OrdersRoute, OrdersRouteStops } from './src/components/OrdersRoute';
import { PhoneInputNumber } from './src/components/PhoneInputNumber';
import { PreviousMessages } from './src/components/PreviousMessages';
import { PreviousOrders } from './src/components/PreviousOrders';
import { ProductItemAccordion } from './src/components/ProductItemAccordion';
import { ReviewCustomer } from './src/components/ReviewCustomer'
import { UserFormDetails } from './src/components/UserFormDetails';
import { UserProfileForm } from './src/components/UserProfileForm';
import { VerifyPhone } from './src/components/VerifyPhone';
import { DriverMap } from './src/components/DriverMap';
import { MapViewUI as MapView } from './src/components/MapView'
import { NewOrderNotification } from './src/components/NewOrderNotification';
import { DriverSchedule } from './src/components/DriverSchedule';
import { ScheduleBlocked } from './src/components/ScheduleBlocked';
import { OrderDetailsLogistic } from './src/components/OrderDetailsLogistic'
import { NotificationSetting } from './src/components/NotificationSetting'
import { Sessions } from './src/components/Sessions';
import { StripeConnectAccount } from './src/components/StripeConnectAccount';
import { Payouts } from './src/components/Payouts';
import { WebsocketStatus, ConnectionHost } from './src/components/WebsocketStatus';
//OComponents
import {
  OText,
  OButton,
  OInput,
  OIcon,
  OFab,
  OTextarea,
  OAlertOriginal,
  OModal,
  OToast,
  OLink,
  ONavbar,
  OrderListSkeleton,
  MessageListSkeleton,
  ChatMessageSkeleton,
  KeyboardScreen,
  Icon,
  OBottomPopup,
  ONotice,
  OSelect,
  OCalendar,
  OCheckbox,
  ChoiceMark,
  ChoiceRow,
  SectionTitle,
  BackButton,
  ModalCloseButton,
  SkeletonBone,
  FilterChip,
  Tabs,
  OBadge,
  ODivider,
  OCard,
  OListRow,
  OAvatar,
  OStepper,
  OOtpInput,
  OSwitch,
  LoadingOverlay,
  OSpinner,
  FieldError,
  PasswordToggle,
  Pager,
  PagerDots,
  StableText,
} from './src/components/shared';

import { getTraduction } from './src/utils'

// context
import { OfflineActionsContext, OfflineActionsProvider, useOfflineActions } from './src/context/OfflineActions'

//layouts
import { Container } from './src/layouts/Container';
import { SafeAreaContainer } from './src/layouts/SafeAreaContainer';
import { SafeAreaContainerLayout } from './src/layouts/SafeAreaContainer';

// hooks
import { useLocation } from './src/hooks/useLocation';
import { useCountdownTimer } from './src/hooks/useCountdownTimer';
import { DeviceOrientationMethods, LANDSCAPE, PORTRAIT, useDeviceOrientation } from './src/hooks/DeviceOrientation';

// providers
import { StoreMethods } from './src/providers/StoreUtil';

export {
  //Components
  AcceptOrRejectOrder,
  Chat,
  DriverMap,
  FloatingButton,
  ForgotPasswordForm,
  Home,
  LanguageSelector,
  LoginForm,
  LogoutButton,
  MessagesOption,
  MapView,
  NewOrderNotification,
  NotFoundSource,
  OrderDetailsDelivery,
  OrderMessage,
  OrdersOption,
  OrdersOptionCity,
  OrdersOptionDate,
  OrdersRoute,
  OrdersRouteStops,
  PhoneInputNumber,
  PreviousMessages,
  PreviousOrders,
  ProductItemAccordion,
  ReviewCustomer,
  SafeAreaContainerLayout,
  Sessions,
  StripeConnectAccount,
  UserFormDetails,
  UserProfileForm,
  VerifyPhone,
  DriverSchedule,
  ScheduleBlocked,
  OrderDetailsLogistic,
  Payouts,
  NotificationSetting,
  WebsocketStatus,
  ConnectionHost,
  //OComponents
  OAlertOriginal,
  OButton,
  OIcon,
  OInput,
  OLink,
  OFab,
  OModal,
  OToast,
  OText,
  OTextarea,
  ONavbar,
  Icon,
  OBottomPopup,
  ONotice,
  OSelect,
  OCalendar,
  OCheckbox,
  ChoiceMark,
  ChoiceRow,
  SectionTitle,
  BackButton,
  ModalCloseButton,
  SkeletonBone,
  StableText,
  FilterChip,
  Tabs,
  OBadge,
  ODivider,
  OCard,
  OListRow,
  OAvatar,
  OStepper,
  OOtpInput,
  OSwitch,
  LoadingOverlay,
  OSpinner,
  FieldError,
  PasswordToggle,
  Pager,
  PagerDots,
  OrderListSkeleton,
  MessageListSkeleton,
  ChatMessageSkeleton,
  KeyboardScreen,
  //layouts
  Container,
  SafeAreaContainer,
  // hooks
  useLocation,
  useCountdownTimer,
  DeviceOrientationMethods,
  LANDSCAPE,
  PORTRAIT,
  useDeviceOrientation,
  //context
  OfflineActionsContext,
  OfflineActionsProvider,
  useOfflineActions,
  // providers
  StoreMethods,
  // utils
  getTraduction,
};
