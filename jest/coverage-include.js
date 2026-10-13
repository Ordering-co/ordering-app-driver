/**
 * Jest collectCoverageFrom patterns — lists the tested app sources.
 * Coverage includes the app components listed below.
 */
module.exports = [
  // shared primitives (driver app inventory)
  '<rootDir>/src/ui/src/components/shared/OButton.tsx',
  '<rootDir>/src/ui/src/components/shared/OModal.tsx',
  '<rootDir>/src/ui/src/components/shared/OToast.tsx',
  '<rootDir>/src/ui/src/components/shared/OInput.tsx',
  '<rootDir>/src/ui/src/components/shared/OAlert.tsx',
  '<rootDir>/src/ui/src/components/shared/OAlertOriginal.tsx',
  '<rootDir>/src/ui/src/components/shared/OText.tsx',
  '<rootDir>/src/ui/src/components/shared/ODropDown.tsx',
  '<rootDir>/src/ui/src/components/shared/ODropDownCalendar.tsx',
  '<rootDir>/src/ui/src/components/shared/OBottomPopup.tsx',
  '<rootDir>/src/ui/src/components/shared/OIcon.tsx',
  '<rootDir>/src/ui/src/components/shared/OIconButton.tsx',
  '<rootDir>/src/ui/src/components/shared/OTextarea.tsx',
  '<rootDir>/src/ui/src/components/shared/OFab.tsx',
  '<rootDir>/src/ui/src/components/shared/OLink.tsx',
  '<rootDir>/src/ui/src/components/shared/ONavbar.tsx',
  '<rootDir>/src/ui/src/components/shared/OSegment.tsx',
  '<rootDir>/src/ui/src/components/shared/OChatBubble.tsx',

  // app utils
  '<rootDir>/src/ui/src/utils/index.tsx',

  // auth & splash pages
  '<rootDir>/src/pages/Splash.tsx',
  '<rootDir>/src/pages/IntroductoryTutorial.tsx',
  '<rootDir>/src/pages/Login.tsx',
  '<rootDir>/src/pages/Signup.tsx',
  '<rootDir>/src/pages/ForgotPassword.tsx',
  '<rootDir>/src/pages/Sessions.tsx',
  '<rootDir>/src/pages/NetworkError.tsx',
  '<rootDir>/src/pages/NotFound.tsx',

  // orders & map pages
  '<rootDir>/src/pages/Home.tsx',
  '<rootDir>/src/pages/MyOrders.tsx',
  '<rootDir>/src/pages/AcceptOrRejectOrder.tsx',
  '<rootDir>/src/pages/OrderDetails.tsx',
  '<rootDir>/src/pages/OrderDetailsLogistic.tsx',
  '<rootDir>/src/pages/OrderMessage.tsx',
  '<rootDir>/src/pages/Messages.tsx',
  '<rootDir>/src/pages/MapView.tsx',

  // permissions & schedule pages
  '<rootDir>/src/pages/RequestPermissions.tsx',
  '<rootDir>/src/pages/ScheduleBlocked.tsx',
  '<rootDir>/src/pages/Profile.tsx',

  // shell UI wired exports
  '<rootDir>/src/ui/src/components/Home/index.tsx',
  '<rootDir>/src/ui/src/components/LanguageSelector/index.tsx',
  '<rootDir>/src/ui/src/components/LogoutButton/index.tsx',
  '<rootDir>/src/ui/src/components/FloatingButton/index.tsx',
  '<rootDir>/src/ui/src/components/NetworkError/index.tsx',
  '<rootDir>/src/ui/src/components/NotFoundSource/index.tsx',
  '<rootDir>/src/ui/src/components/WebsocketStatus/index.tsx',
  '<rootDir>/src/ui/src/components/NotificationSetting/index.tsx',
  '<rootDir>/src/ui/src/components/SearchBar/index.tsx',

  // auth UI wired exports
  '<rootDir>/src/ui/src/components/LoginForm/index.tsx',
  '<rootDir>/src/ui/src/components/LoginForm/Otp/index.tsx',
  '<rootDir>/src/ui/src/components/ForgotPasswordForm/index.tsx',
  '<rootDir>/src/ui/src/components/SignupForm/index.tsx',
  '<rootDir>/src/ui/src/components/VerifyPhone/index.tsx',
  '<rootDir>/src/ui/src/components/Sessions/index.tsx',
  '<rootDir>/src/ui/src/components/UserFormDetails/index.tsx',
  '<rootDir>/src/ui/src/components/UserProfileForm/index.tsx',

  // orders UI wired exports (filters + light components in gate)
  '<rootDir>/src/ui/src/components/OrdersOptionBusiness/index.tsx',
  '<rootDir>/src/ui/src/components/OrdersOptionCity/index.tsx',
  '<rootDir>/src/ui/src/components/OrdersOptionDate/index.tsx',
  '<rootDir>/src/ui/src/components/OrdersOptionDelivery/index.tsx',
  '<rootDir>/src/ui/src/components/OrdersOptionDriver/index.tsx',
  '<rootDir>/src/ui/src/components/OrdersOptionPaymethod/index.tsx',
  '<rootDir>/src/ui/src/components/OrdersOptionStatus/index.tsx',
  '<rootDir>/src/ui/src/components/NewOrderNotification/index.tsx',
  '<rootDir>/src/ui/src/components/ProductItemAccordion/index.tsx',

  // b — heavy order screens
  '<rootDir>/src/ui/src/components/OrdersListManager/index.tsx',
  '<rootDir>/src/ui/src/components/OrdersOption/index.tsx',
  '<rootDir>/src/ui/src/components/PreviousOrders/index.tsx',
  '<rootDir>/src/ui/src/components/AcceptOrRejectOrder/index.tsx',
  '<rootDir>/src/ui/src/components/OrderSummary/index.tsx',

  // map, logistics & messages
  '<rootDir>/src/ui/src/components/ScheduleBlocked/index.tsx',
  '<rootDir>/src/ui/src/components/DriverSchedule/index.tsx',
  '<rootDir>/src/ui/src/components/Contacts/index.tsx',
  '<rootDir>/src/ui/src/components/PreviousMessages/index.tsx',
  '<rootDir>/src/ui/src/components/MessagesOption/index.tsx',
  '<rootDir>/src/ui/src/components/ReviewCustomer/index.tsx',
  '<rootDir>/src/ui/src/components/OrderMessage/index.tsx',
  '<rootDir>/src/ui/src/components/OrderDetailsLogistic/index.tsx',
  '<rootDir>/src/ui/src/components/MapView/index.tsx',
  '<rootDir>/src/ui/src/components/GoogleMap/index.tsx',
  '<rootDir>/src/ui/src/components/DriverMap/index.tsx',

  // b — Chat in gate
  '<rootDir>/src/ui/src/components/Chat/index.tsx',

  // c — OrderDetails/Delivery in gate
  '<rootDir>/src/ui/src/components/OrderDetails/Delivery.tsx',

  // stores & misc
  '<rootDir>/src/ui/src/components/StoresList/index.tsx',
  '<rootDir>/src/ui/src/components/BusinessController/index.tsx',
  '<rootDir>/src/ui/src/components/BusinessProductList/index.tsx',
  '<rootDir>/src/ui/src/components/PhoneInputNumber/index.tsx'
]
