/**
 * Jest collectCoverageFrom patterns — grows batch-by-batch.
 * Canonical order: docs/TEST_BATCH_REGISTRY.md (ORD-1082)
 */
module.exports = [
  // S0 — shared primitives (driver app inventory)
  '<rootDir>/src/ui/src/components/shared/OButton.tsx',
  '<rootDir>/src/ui/src/components/shared/OModal.tsx',
  '<rootDir>/src/ui/src/components/shared/OToast.tsx',
  '<rootDir>/src/ui/src/components/shared/OInput.tsx',
  '<rootDir>/src/ui/src/components/shared/OAlert.tsx',
  '<rootDir>/src/ui/src/components/shared/OAlertOriginal.tsx',
  '<rootDir>/src/ui/src/components/shared/OText.tsx',
  '<rootDir>/src/ui/src/components/shared/OBottomPopup.tsx',
  '<rootDir>/src/ui/src/components/shared/OIcon.tsx',
  '<rootDir>/src/ui/src/components/shared/OTextarea.tsx',
  '<rootDir>/src/ui/src/components/shared/OFab.tsx',
  '<rootDir>/src/ui/src/components/shared/OLink.tsx',
  '<rootDir>/src/ui/src/components/shared/ONavbar.tsx',
  '<rootDir>/src/ui/src/components/shared/ChatMessageSkeleton.tsx',
  '<rootDir>/src/ui/src/components/shared/MessageListSkeleton.tsx',
  '<rootDir>/src/ui/src/components/shared/ChoiceMark.tsx',
  '<rootDir>/src/ui/src/components/shared/ChoiceRow.tsx',
  '<rootDir>/src/ui/src/components/shared/FieldError.tsx',
  '<rootDir>/src/ui/src/components/shared/FilterChip.tsx',
  '<rootDir>/src/ui/src/components/shared/HoldToConfirm.tsx',
  '<rootDir>/src/ui/src/components/shared/Icon.tsx',
  '<rootDir>/src/ui/src/components/shared/LoadingOverlay.tsx',
  '<rootDir>/src/ui/src/components/shared/OAvatar.tsx',
  '<rootDir>/src/ui/src/components/shared/OBadge.tsx',
  '<rootDir>/src/ui/src/components/shared/OCalendar.tsx',
  '<rootDir>/src/ui/src/components/shared/OCard.tsx',
  '<rootDir>/src/ui/src/components/shared/OCheckbox.tsx',
  '<rootDir>/src/ui/src/components/shared/ODivider.tsx',
  '<rootDir>/src/ui/src/components/shared/OListRow.tsx',
  '<rootDir>/src/ui/src/components/shared/ONotice.tsx',
  '<rootDir>/src/ui/src/components/shared/OOtpInput.tsx',
  '<rootDir>/src/ui/src/components/shared/OSelect.tsx',
  '<rootDir>/src/ui/src/components/shared/OSpinner.tsx',
  '<rootDir>/src/ui/src/components/shared/OStepper.tsx',
  '<rootDir>/src/ui/src/components/shared/OSwitch.tsx',
  '<rootDir>/src/ui/src/components/shared/OrderListItemSkeleton.tsx',
  '<rootDir>/src/ui/src/components/shared/OrderListSkeleton.tsx',
  '<rootDir>/src/ui/src/components/shared/Pager.tsx',
  '<rootDir>/src/ui/src/components/shared/PasswordToggle.tsx',
  '<rootDir>/src/ui/src/components/shared/SectionTitle.tsx',
  '<rootDir>/src/ui/src/components/shared/SkeletonBone.tsx',
  '<rootDir>/src/ui/src/components/shared/StableText.tsx',
  '<rootDir>/src/ui/src/components/shared/Tabs.tsx',
  '<rootDir>/src/ui/src/components/shared/confirmAction.ts',
  '<rootDir>/src/ui/src/components/shared/orderStates.ts',
  '<rootDir>/src/ui/src/components/shared/pagerStyles.tsx',
  '<rootDir>/src/ui/src/components/shared/singleLineInput.ts',
  '<rootDir>/src/ui/src/components/shared/styles.tsx',

  // U1 — app utils
  '<rootDir>/src/ui/src/utils/index.tsx',
  '<rootDir>/src/ui/src/utils/formats.ts',
  '<rootDir>/src/ui/src/utils/orderStatus.ts',
  '<rootDir>/src/ui/src/utils/orderType.ts',
  '<rootDir>/src/utils/imageUrl.ts',

  // T1 — the theme runtime (docs/THEMING.md)
  '<rootDir>/src/theme/engine.ts',
  '<rootDir>/src/theme/remote.ts',
  '<rootDir>/src/theme/helpers.ts',
  '<rootDir>/src/theme/AppThemeContext.tsx',
  '<rootDir>/src/theme/sections.tsx',

  // C1 — app contexts and the rows they feed
  '<rootDir>/src/context/UnreadMessagesContext.tsx',
  '<rootDir>/src/context/locationPermissionRows.ts',

  // P1 — auth & splash pages
  '<rootDir>/src/pages/Splash.tsx',
  '<rootDir>/src/pages/IntroductoryTutorial.tsx',
  '<rootDir>/src/pages/Login.tsx',
  '<rootDir>/src/pages/ForgotPassword.tsx',
  '<rootDir>/src/pages/Sessions.tsx',
  '<rootDir>/src/pages/StripeConnectAccount.tsx',
  '<rootDir>/src/pages/Payouts.tsx',

  // P2 — orders & map pages
  '<rootDir>/src/pages/Home.tsx',
  '<rootDir>/src/pages/MyOrders.tsx',
  '<rootDir>/src/pages/AcceptOrRejectOrder.tsx',
  '<rootDir>/src/pages/OrderDetails.tsx',
  '<rootDir>/src/pages/OrderDetailsLogistic.tsx',
  '<rootDir>/src/pages/OrderMessage.tsx',
  '<rootDir>/src/pages/Messages.tsx',
  '<rootDir>/src/pages/MapView.tsx',

  // P3 — permissions & schedule pages
  '<rootDir>/src/pages/RequestPermissions.tsx',
  '<rootDir>/src/pages/ScheduleBlocked.tsx',
  '<rootDir>/src/pages/Profile.tsx',
  '<rootDir>/src/pages/ProfileEdit.tsx',
  '<rootDir>/src/pages/ProfilePassword.tsx',
  '<rootDir>/src/pages/Schedule.tsx',

  // D1 — shell UI wired exports
  '<rootDir>/src/ui/src/components/Home/index.tsx',
  '<rootDir>/src/ui/src/components/LanguageSelector/index.tsx',
  '<rootDir>/src/ui/src/components/LogoutButton/index.tsx',
  '<rootDir>/src/ui/src/components/FloatingButton/index.tsx',
  '<rootDir>/src/ui/src/components/NotFoundSource/index.tsx',
  '<rootDir>/src/ui/src/components/WebsocketStatus/index.tsx',
  '<rootDir>/src/ui/src/components/NotificationSetting/index.tsx',

  // D2 — auth UI wired exports
  '<rootDir>/src/ui/src/components/LoginForm/index.tsx',
  '<rootDir>/src/ui/src/components/LoginForm/Otp/index.tsx',
  '<rootDir>/src/ui/src/components/ForgotPasswordForm/index.tsx',
  '<rootDir>/src/ui/src/components/VerifyPhone/index.tsx',
  '<rootDir>/src/ui/src/components/Sessions/index.tsx',
  '<rootDir>/src/ui/src/components/StripeConnectAccount/index.tsx',
  '<rootDir>/src/ui/src/components/Payouts/index.tsx',
  '<rootDir>/src/ui/src/components/UserFormDetails/index.tsx',
  '<rootDir>/src/ui/src/components/UserProfileForm/index.tsx',
  '<rootDir>/src/ui/src/components/UserProfileForm/ProfilePhotoSheet.tsx',
  '<rootDir>/src/ui/src/components/UserProfileForm/ProfileRow.tsx',
  '<rootDir>/src/ui/src/components/UserProfileForm/RowsCard.tsx',
  '<rootDir>/src/ui/src/components/UserProfileForm/useProfilePhoto.ts',

  // D3 — orders UI wired exports (filters + light components in gate)
  '<rootDir>/src/ui/src/components/OrdersOptionCity/index.tsx',
  '<rootDir>/src/ui/src/components/OrdersOptionDate/index.tsx',
  '<rootDir>/src/ui/src/components/NewOrderNotification/index.tsx',
  '<rootDir>/src/ui/src/components/ProductItemAccordion/index.tsx',

  // D3b — heavy order screens
  '<rootDir>/src/ui/src/components/OrdersOption/index.tsx',
  '<rootDir>/src/ui/src/components/OrdersOption/ChipRow.tsx',
  '<rootDir>/src/ui/src/components/OrdersOption/OrdersSearchForm.tsx',
  '<rootDir>/src/ui/src/components/PreviousOrders/index.tsx',
  '<rootDir>/src/ui/src/components/PreviousOrders/nextStop.ts',
  '<rootDir>/src/ui/src/components/AcceptOrRejectOrder/index.tsx',

  // D4 — map, logistics & messages
  '<rootDir>/src/ui/src/components/ScheduleBlocked/index.tsx',
  '<rootDir>/src/ui/src/components/DriverSchedule/index.tsx',
  '<rootDir>/src/ui/src/components/DriverSchedule/hours.ts',
  '<rootDir>/src/ui/src/components/PreviousMessages/index.tsx',
  '<rootDir>/src/ui/src/components/MessagesOption/index.tsx',
  '<rootDir>/src/ui/src/components/ReviewCustomer/index.tsx',
  '<rootDir>/src/ui/src/components/OrderMessage/index.tsx',
  '<rootDir>/src/ui/src/components/OrderDetailsLogistic/index.tsx',
  '<rootDir>/src/ui/src/components/MapView/index.tsx',
  '<rootDir>/src/ui/src/components/MapView/MarkerCard.tsx',
  '<rootDir>/src/ui/src/components/DriverMap/index.tsx',

  // D4b — Chat in gate
  '<rootDir>/src/ui/src/components/Chat/index.tsx',

  // D4c — OrderDetails/Delivery in gate
  '<rootDir>/src/ui/src/components/OrderDetails/Delivery.tsx',

  // D5 — stores & misc
  '<rootDir>/src/ui/src/components/PhoneInputNumber/index.tsx'
]
