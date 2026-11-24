/**
 * Fixture of the stubs of the D3 orders components (driver app), shaped as the @ui barrel (see
 * uiModuleMocks.js). It lists only what a test replaces: a name it does not list is the real export
 * of its module.
 */
/* eslint-env jest */

const offlineActionsState = {
  isNetConnected: true,
  canSaveChangesOffline: false,
  isCombinedTabs: false,
  combinedTabsRead: true,
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
    NotificationSetting: stub('notification-setting-stub'),
    PreviousOrders: stub('previous-orders-stub'),
    WebsocketStatus: stub('websocket-status-stub'),
    FloatingButton: stub('floating-button-stub'),
    AcceptOrRejectOrder: stub('accept-or-reject-stub'),
    ReviewCustomer: stub('review-customer-stub'),
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

// The orders list over its real children: the previous orders and the accept view are the real ones
// (what is not listed here), the rest stays a stub.
const buildD3OrdersIntegrationUiMock = () => {
  const mock = buildD3OrdersUiMock()
  delete mock.PreviousOrders
  delete mock.AcceptOrRejectOrder
  return mock
}

module.exports = {
  buildD3OrdersUiMock,
  buildD3OrdersIntegrationUiMock,
  offlineActionsState,
  offlineActionsFns
}
