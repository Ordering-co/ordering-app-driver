import React from 'react'
import { Text, TouchableOpacity, View } from 'react-native'

export const _setStoreData = jest.fn()
export const _removeStoreData = jest.fn()
export const _retrieveStoreData = jest.fn()

const stub = (testID) => (props) => (
  <View testID={testID} {...props} />
)

// The keyboard-avoiding screen is the real one (the page's structure is what its test reads).
export const KeyboardScreen = (props: any) => {
  const { KeyboardScreen: Real } = require('../../src/ui/src/components/shared/KeyboardScreen')
  return <Real {...props} />
}

export const Container = ({ children, style }: any) => (
  <View testID="container" style={style}>{children}</View>
)

export const SafeAreaContainer = ({ children, style }: any) => (
  <View testID="safe-area-container" style={style}>{children}</View>
)

export const SafeAreaContainerLayout = ({ children }: any) => (
  <View testID="safe-area-layout">{children}</View>
)

export const LoginForm = (props: any) => (
  <View testID="login-form">
    <TouchableOpacity
      testID="login-success"
      onPress={() =>
        props.handleSuccessLogin?.({
          id: 1,
          level: 4,
          session: { access_token: 'token' }
        })
      }
    />
    <TouchableOpacity
      testID="login-redirect"
      onPress={() => props.onNavigationRedirect?.('Signup')}
    />
  </View>
)

export const ForgotPasswordForm = (props: any) => (
  <View testID="forgot-password-form">
    <TouchableOpacity testID="forgot-back" onPress={() => props.navigation?.goBack?.()} />
  </View>
)

export const Sessions = (props: any) => (
  <View testID="sessions-controller" {...props} />
)

export const StripeConnectAccount = (props: any) => (
  <View testID="stripe-connect-account-controller" {...props} />
)

export const Payouts = (props: any) => (
  <View testID="payouts-controller" {...props} />
)

export const Home = (props: any) => (
  <View testID="home-page">
    <TouchableOpacity
      testID="home-nav"
      onPress={() => props.onNavigationRedirect?.('Login')}
    />
    <TouchableOpacity
      testID="home-nav-empty"
      onPress={() => props.onNavigationRedirect?.('')}
    />
  </View>
)

export const MessagesOption = (props: any) => (
  <View testID="messages-option">
    <TouchableOpacity
      testID="messages-option-nav"
      onPress={() => props.onNavigationRedirect?.('OrderMessage', { orderId: 1 })}
    />
    <TouchableOpacity
      testID="messages-option-nav-empty"
      onPress={() => props.onNavigationRedirect?.('')}
    />
  </View>
)

export const OrdersOption = (props: any) => (
  <View testID="orders-option">
    <Text testID="orders-option-driver">
      {props.isDriverApp ? 'driver' : 'other'}
    </Text>
    <TouchableOpacity
      testID="orders-option-nav"
      onPress={() => props.onNavigationRedirect?.('OrderDetails', { orderId: 5 })}
    />
    <TouchableOpacity
      testID="orders-option-nav-empty"
      onPress={() => props.onNavigationRedirect?.('')}
    />
  </View>
)

export const AcceptOrRejectOrder = (props: any) => (
  <View testID="accept-or-reject-order">
    <TouchableOpacity
      testID="accept-reject-update"
      onPress={() => props.handleUpdateOrder?.('accept', { time: 15 })}
    />
    <TouchableOpacity
      testID="accept-reject-close"
      onPress={() => props.closeModal?.()}
    />
  </View>
)

export const OrderDetailsDelivery = (props: any) => (
  <View testID="order-details-delivery" {...props} />
)

export const OrderDetailsLogistic = (props: any) => (
  <View testID="order-details-logistic" {...props} />
)

export const OrderMessage = (props: any) => (
  <View testID="order-message" {...props} />
)

export const MapView = (props: any) => (
  <View testID="map-view-ui">
    <Text testID="map-view-delivery-app">
      {props.isDeliveryApp ? 'delivery' : 'other'}
    </Text>
    <TouchableOpacity
      testID="map-view-nav"
      onPress={() => props.onNavigationRedirect?.('OrderDetails', { orderId: 3 })}
    />
  </View>
)

export const DriverMap = (props: any) => (
  <View testID="driver-map" {...props} />
)

export const DriverSchedule = (props: any) => (
  <View testID="driver-schedule" {...props} />
)

export const ScheduleBlocked = (props: any) => (
  <View testID="schedule-blocked">
    <Text testID="schedule-blocked-next">{props.nextSchedule ?? 'none'}</Text>
  </View>
)

export const NewOrderNotification = (props: any) => (
  <View testID="new-order-notification" {...props} />
)

export const FloatingButton = ({ btnText, onClickButton, firstButtonClick }: any) => (
  <TouchableOpacity testID="floating-button" onPress={firstButtonClick || onClickButton}>
    <Text testID="floating-button-text">{btnText}</Text>
  </TouchableOpacity>
)

export const NotFoundSource = ({ btnTitle, content, onClickButton }: any) => (
  <View testID="not-found-source">
    <Text testID="not-found-content">{content}</Text>
    <Text testID="not-found-btn-title">{btnTitle}</Text>
    <TouchableOpacity testID="not-found-button" onPress={onClickButton} />
  </View>
)

export const UserProfileForm = (props: any) => (
  <View testID="user-profile-form">
    <Text testID="user-profile-driver-status">
      {props.isShowDriverStatus ? 'show' : 'hide'}
    </Text>
    <TouchableOpacity testID="user-profile-go-back" onPress={() => props.goToBack?.()} />
    <TouchableOpacity
      testID="user-profile-nav"
      onPress={() => props.onNavigationRedirect?.('Sessions', {})}
    />
  </View>
)

export const UserFormDetailsUI = stub('user-form-details')
export const VerifyPhone = stub('verify-phone')
export const LanguageSelector = stub('language-selector')
export const LogoutButton = stub('logout-button')
export const WebsocketStatus = stub('websocket-status')
export const NotificationSetting = stub('notification-setting')
export const Chat = stub('chat')
export const PreviousMessages = stub('previous-messages')
export const PreviousOrders = stub('previous-orders')
export const ReviewCustomer = stub('review-customer')
export const PhoneInputNumber = stub('phone-input-number')
export const ProductItemAccordion = stub('product-item-accordion')

export const OText = ({ children }: any) => <Text testID="o-text">{children}</Text>
export const OButton = stub('o-button')
export const OInput = stub('o-input')
export const OIcon = stub('o-icon')
export const OFab = stub('o-fab')
export const OIconButton = ({ title, onClick }: any) => (
  <TouchableOpacity testID="o-icon-button" onPress={onClick}>
    <Text>{title}</Text>
  </TouchableOpacity>
)
export const OTextarea = stub('o-textarea')
export const OAlert = stub('o-alert')
export const OAlertOriginal = stub('o-alert-original')
export const OModal = stub('o-modal')
export const OToast = stub('o-toast')
export const OLink = stub('o-link')
export const ONavbar = stub('o-navbar')
export const OrderListSkeleton = stub('order-list-skeleton')
export const ChatMessageSkeleton = stub('chat-message-skeleton')

export const ThemeProvider = ({ children }: any) => children
export const useTheme = jest.fn(() => ({
  colors: { white: '#fff', backgroundPage: '#fff', primary: '#000' }
}))

export const OfflineActionsContext = React.createContext({})
export const OfflineActionsProvider = ({ children }: any) => children
export const useOfflineActions = jest.fn(() => [{}, { addOfflineAction: jest.fn() }])

export const useLocation = jest.fn(() => [{ latitude: 0, longitude: 0 }, jest.fn()])
export const useCountdownTimer = jest.fn(() => [0, jest.fn()])

export const DeviceOrientationMethods = {
  useDeviceOrientation: jest.fn(() => [{
    orientation: 'portrait',
    dimensions: { width: 390, height: 844 }
  }])
}

export const LANDSCAPE = 'landscape'
export const PORTRAIT = 'portrait'
export const useDeviceOrientation = DeviceOrientationMethods.useDeviceOrientation

export const StoreMethods = {
  _setStoreData,
  _removeStoreData,
  _retrieveStoreData
}

export const getTraduction = jest.fn((_key, fallback) => fallback)

const mockUi = {
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
  PhoneInputNumber,
  PreviousMessages,
  PreviousOrders,
  ProductItemAccordion,
  ReviewCustomer,
  SafeAreaContainerLayout,
  Sessions,
  StripeConnectAccount,
  Payouts,
  UserFormDetailsUI,
  UserProfileForm,
  VerifyPhone,
  DriverSchedule,
  ScheduleBlocked,
  OrderDetailsLogistic,
  NotificationSetting,
  WebsocketStatus,
  Container,
  KeyboardScreen,
  SafeAreaContainer,
  OAlert,
  OAlertOriginal,
  OButton,
  OIcon,
  OIconButton,
  OInput,
  OLink,
  OFab,
  OModal,
  OToast,
  OText,
  OTextarea,
  ONavbar,
  OrderListSkeleton,
  ChatMessageSkeleton,
  ThemeProvider,
  useTheme,
  OfflineActionsContext,
  OfflineActionsProvider,
  useOfflineActions,
  useLocation,
  useCountdownTimer,
  DeviceOrientationMethods,
  LANDSCAPE,
  PORTRAIT,
  useDeviceOrientation,
  StoreMethods,
  getTraduction,
  _setStoreData,
  _removeStoreData,
  _retrieveStoreData
}

module.exports = mockUi
