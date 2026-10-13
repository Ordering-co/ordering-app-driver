/**
 * Partial @ui mock for orders components (driver app).
 */
/* eslint-env jest */

const path = require('path')

const root = path.join(__dirname, '../..')

const req = (relativePath) => require(path.join(root, relativePath))

const offlineActionsState = {
  isNetConnected: true,
  canSaveChangesOffline: false,
  isCombinedTabs: false,
  actions: {},
  orders: null
}

const offlineActionsFns = {
  applyOffAction: jest.fn(),
  registerOffOrder: jest.fn(),
  setState: jest.fn()
}

const buildD3OrdersUiMock = () => {
  const React = require('react')
  const { View } = require('react-native')

  const stub = (testID) => () => React.createElement(View, { testID })

  return {
    OText: req('src/ui/src/components/shared/OText').default,
    OButton: req('src/ui/src/components/shared/OButton').default,
    OInput: req('src/ui/src/components/shared/OInput').default,
    OModal: req('src/ui/src/components/shared/OModal').default,
    OIcon: req('src/ui/src/components/shared/OIcon').default,
    OIconButton: req('src/ui/src/components/shared/OIconButton').default,
    OTextarea: req('src/ui/src/components/shared/OTextarea').default,
    OAlertOriginal: req('src/ui/src/components/shared/OAlertOriginal').default,
    ONavbar: req('src/ui/src/components/shared/ONavbar').default,
    NotFoundSource: req('src/ui/src/components/NotFoundSource').NotFoundSource,
    NotificationSetting: stub('notification-setting-stub'),
    NewOrderNotification: stub('new-order-notification-stub'),
    PreviousOrders: stub('previous-orders-stub'),
    OrdersOptionCity: stub('orders-option-city-stub'),
    OrdersOptionBusiness: stub('orders-option-business-stub'),
    OrdersOptionDelivery: stub('orders-option-delivery-stub'),
    OrdersOptionPaymethod: stub('orders-option-paymethod-stub'),
    OrdersOptionDriver: stub('orders-option-driver-stub'),
    OrdersOptionDate: stub('orders-option-date-stub'),
    OrdersOptionStatus: stub('orders-option-status-stub'),
    OrderSummaryTable: stub('order-summary-table-stub'),
    OrderListSkeleton: req('src/ui/src/components/shared/OrderListSkeleton').OrderListSkeleton,
    OrderDetailsDelivery: stub('order-details-delivery-stub'),
    WebsocketStatus: stub('websocket-status-stub'),
    FloatingButton: stub('floating-button-stub'),
    AcceptOrRejectOrder: stub('accept-or-reject-stub'),
    ReviewCustomer: stub('review-customer-stub'),
    GoogleMap: stub('google-map-stub'),
    OLink: req('src/ui/src/components/shared/OLink').default,
    DriverMap: stub('driver-map-stub'),
    ProductItemAccordion: stub('product-item-accordion-stub'),
    DeviceOrientationMethods: {
      useDeviceOrientation: jest.fn(() => [{
        orientation: 'portrait',
        dimensions: { width: 390, height: 844 }
      }])
    },
    useOfflineActions: jest.fn(() => [offlineActionsState, offlineActionsFns]),
    useLocation: jest.fn(() => ({
      userLocation: { latitude: 40.7128, longitude: -74.006, timestamp: Date.now() },
      getCurrentLocation: jest.fn().mockResolvedValue({
        latitude: 40.7128,
        longitude: -74.006,
        mocked: false
      }),
      followUserLocation: jest.fn(),
      stopFollowUserLocation: jest.fn()
    }))
  }
}

const buildD3OrdersIntegrationUiMock = () => {
  const mock = buildD3OrdersUiMock()
  mock.PreviousOrders = req('src/ui/src/components/PreviousOrders').PreviousOrders
  mock.AcceptOrRejectOrder = req('src/ui/src/components/AcceptOrRejectOrder').AcceptOrRejectOrder
  mock.OrdersOptionBusiness = req('src/ui/src/components/OrdersOptionBusiness').OrdersOptionBusiness
  mock.OrdersOptionCity = req('src/ui/src/components/OrdersOptionCity').OrdersOptionCity
  mock.OrdersOptionDelivery = req('src/ui/src/components/OrdersOptionDelivery').OrdersOptionDelivery
  mock.OrdersOptionPaymethod = req('src/ui/src/components/OrdersOptionPaymethod').OrdersOptionPaymethod
  mock.OrdersOptionDriver = req('src/ui/src/components/OrdersOptionDriver').OrdersOptionDriver
  mock.OrdersOptionDate = req('src/ui/src/components/OrdersOptionDate').OrdersOptionDate
  mock.OrdersOptionStatus = req('src/ui/src/components/OrdersOptionStatus').OrdersOptionStatus
  return mock
}

module.exports = {
  buildD3OrdersUiMock,
  buildD3OrdersIntegrationUiMock,
  offlineActionsState,
  offlineActionsFns
}
