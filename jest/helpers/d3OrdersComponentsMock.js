/**
 * @components mock factory for orders wired exports (driver app).
 */
/* eslint-env jest */

const { renderUiController } = require('./d1ShellDefaults')
const mockOrdering = require('./mockOrdering')
const d3 = require('./d3OrdersDefaults')

const eventEmitter = {
  emit: jest.fn(),
  on: jest.fn(),
  off: jest.fn()
}

const clone = (value) => JSON.parse(JSON.stringify(value))

const getMock = (overrides = {}) => ({
  ...mockOrdering,
  useUtils: jest.fn(() => [{
    optimizeImage: (url) => url,
    parsePrice: (v) => `$${v}`,
    parseNumber: (v) => v,
    parseDate: (v) => v,
    parseDistance: (v) => `${v} mi`,
    parseTime: (v) => v,
    timeFormat: 'HH:mm',
    is12Hours: false,
    preorderDateFormat: 'MM/DD',
    getMaxPreorderDays: () => 7,
    isWalletEnabled: () => true
  }, {}]),
  useEvent: jest.fn(() => [eventEmitter]),
  useConfig: jest.fn(() => [{
    loading: false,
    configs: {
      combine_pending_and_progress_orders: { value: '0' },
      allow_save_changes_offline: { value: '0' },
      reject_orders_enabled: { value: '1' },
      failed_pickup_by_driver_enabled: { value: '1' },
      order_not_ready_enabled: { value: '1' },
      allow_driver_reject_order: { value: '1' }
    }
  }]),
  useSession: jest.fn(() => [{ auth: true, user: { id: 1, level: 4 }, token: 'token' }, {}]),
  useApi: jest.fn(() => [{ ordering: { root: 'https://api.test', project: 'demo' } }, {}]),
  OrderListGroups: renderUiController({
    ...d3.orderListGroupsDefaults,
    ordersGroup: clone(d3.ordersGroup),
    loadOrders: jest.fn(),
    loadMoreOrders: jest.fn(),
    setCurrentTabSelected: jest.fn(),
    setCurrentFilters: jest.fn(),
    onFiltered: jest.fn()
  }),
  BusinessList: renderUiController(d3.businessListDefaults),
  MainSearch: renderUiController(d3.mainSearchDefaults),
  DriverList: renderUiController(d3.driverListDefaults),
  PaymethodList: renderUiController(d3.paymethodListDefaults),
  NewOrderNotification: renderUiController(d3.newOrderNotificationDefaults),
  OrderDetails: renderUiController(d3.orderDetailsDefaults),
  ...overrides
})

module.exports = { getMock, eventEmitter }
