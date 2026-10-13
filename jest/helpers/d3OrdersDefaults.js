/**
 * Controller defaults for orders UI wired exports (driver app).
 */
/* eslint-env jest */

const tabs = [
  { key: 0, text: 'Pending', tags: [0, 13], title: 'pending' },
  { key: 1, text: 'In Progress', tags: [3, 4, 7, 8], title: 'inProgress' },
  { key: 2, text: 'Completed', tags: [1, 11], title: 'completed' },
  { key: 3, text: 'Cancelled', tags: [2, 5], title: 'cancelled' }
]

const sampleOrder = {
  id: 101,
  status: 0,
  total: 25.5,
  currency: 'USD',
  delivery_type: 1,
  delivery_datetime: '2099-01-01 12:00:00',
  delivery_datetime_utc: '2099-01-01 12:00:00',
  products: [
    {
      id: 1,
      name: 'Burger',
      quantity: 1,
      price: 10,
      options: [],
      ingredients: []
    }
  ],
  summary: { total: 25.5, subtotal: 20, tax: 2.5, delivery_price: 3, driver_tip: 2 },
  customer: { name: 'Jane', cellphone: '5551234' },
  business: { name: 'Store A', logo: 'https://example.com/logo.png' },
  payment_events: [{ event: 'payment', amount: 25.5 }]
}

const richSampleOrder = {
  ...sampleOrder,
  comment: 'No onions',
  cash: 30,
  discount: 2,
  offer_type: 1,
  offer_rate: 10,
  external_id: 'EXT-101',
  delivery_option: { name: 'Leave at door' },
  tax_type: 2,
  tax: 8,
  service_fee: 5,
  customer: {
    name: 'Jane',
    lastname: 'Doe',
    email: 'jane@example.com',
    cellphone: '5551234',
    address: '123 Main St',
    address_notes: 'Ring bell',
    zipcode: '10001'
  },
  business: {
    name: 'Store A',
    email: 'store@example.com',
    cellphone: '5559999',
    phone: '5558888',
    address: '456 Store Ave',
    address_notes: 'Back entrance',
    logo: null
  },
  paymethod: { id: 1, gateway: 'stripe', name: 'Card' },
  taxes: [
    { id: 1, type: 2, rate: 8, target: 'product', name: 'Sales tax', summary: { tax: 2, tax_after_discount: 2 } },
    { id: 2, type: 1, target: 'product', summary: { tax: 0.5 } },
    { id: 3, type: 2, rate: 5, target: 'delivery_fee', name: 'Delivery tax', summary: { tax: 1, tax_after_discount: 1 } }
  ],
  offers: [
    { id: 1, name: 'Promo', target: 1, rate_type: 1, rate: 10, summary: { discount: 2 } },
    { id: 2, name: 'Delivery promo', target: 2, rate_type: 0, summary: { discount: 1 } },
    { id: 3, name: 'Cart promo', target: 3, rate_type: 1, rate: 5, summary: { discount: 1 } }
  ],
  products: [
    {
      id: 1,
      name: 'Burger',
      quantity: 2,
      price: 10,
      comment: 'No onions',
      options: [
        {
          name: 'Extras',
          suboptions: [{ quantity: 1, name: 'Cheese', position: 'whole', price: 1 }]
        }
      ],
      ingredients: [{ name: 'Onion', selected: false }]
    }
  ],
  payment_events: [
    {
      id: 1,
      event: 'payment',
      amount: 25.5,
      paymethod_id: 1,
      paymethod: { gateway: 'cash', name: 'Cash' }
    }
  ]
}

const emptyOrdersGroupEntry = {
  orders: [],
  loading: false,
  defaultFilter: [0],
  currentFilter: [0],
  pagination: { currentPage: 1, pageSize: 10, totalPages: 1, total: 0 }
}

const pendingOrdersGroupEntry = {
  orders: [sampleOrder],
  loading: false,
  defaultFilter: [0, 13],
  currentFilter: [0, 13],
  pagination: { currentPage: 1, pageSize: 10, totalPages: 3, total: 25 }
}

const ordersGroup = {
  pending: { ...pendingOrdersGroupEntry },
  inProgress: { ...emptyOrdersGroupEntry, defaultFilter: [3], currentFilter: [3] },
  completed: { ...emptyOrdersGroupEntry, defaultFilter: [1], currentFilter: [1] },
  cancelled: { ...emptyOrdersGroupEntry, defaultFilter: [2], currentFilter: [2] }
}

const orderStatus = [
  { key: 0, text: 'Pending' },
  { key: 1, text: 'Completed' },
  { key: 3, text: 'In Progress' },
  { key: 13, text: 'Preorder' }
]

const driverAppTitle = { key: 'DELIVERY_APP', text: 'Delivery app' }

const driverActions = {
  accept: 'acceptByDriver',
  reject: 'rejectByDriver',
  pickupFailed: 'pickupFailedByDriver',
  deliveryFailed: 'deliveryFailedByDriver',
  notReady: 'orderNotReady',
  forcePickUp: 'forcePickUp',
  forceDelivery: 'forceDelivery'
}

const driverOrderTitle = {
  accept: { key: 'DELIVERY_TIME', text: 'Delivery time', btnKey: 'ACCEPT', btnText: 'Accept' },
  reject: { key: 'REJECT_ORDER', text: 'Reject Order', btnKey: 'REJECT', btnText: 'Reject' },
  pickupFailed: { key: 'PICKUP_FAILED', text: 'Pickup Failed', btnKey: 'PICKUP_FAILED', btnText: 'Pickup Failed' },
  deliveryFailed: { key: 'DELIVERY_FAILED', text: 'Delivery Failed', btnKey: 'DELIVERY_FAILED', btnText: 'Delivery Failed' },
  notReady: { key: 'ORDER_NOT_READY', text: 'Order not ready', btnKey: 'ORDER_NOT_READY', btnText: 'Order not ready' }
}

const orderListGroupsDefaults = {
  setCurrentFilters: jest.fn(),
  tabs,
  combineTabs: false,
  setCombineTabsState: jest.fn(),
  isNetConnected: true,
  currentTabSelected: 'pending',
  setCurrentTabSelected: jest.fn(),
  ordersGroup,
  setOrdersGroup: jest.fn(),
  orderStatus,
  ordersFormatted: [sampleOrder],
  loadOrders: jest.fn(),
  loadMoreOrders: jest.fn(),
  onNavigationRedirect: jest.fn(),
  onFiltered: jest.fn(),
  handleClickOrder: jest.fn(),
  isBusinessApp: false,
  handleClickLogisticOrder: jest.fn(),
  logisticOrders: { loading: false, orders: [] },
  loadLogisticOrders: jest.fn(),
  isLogisticActivated: false,
  navigation: {
    navigate: jest.fn(),
    addListener: jest.fn(() => jest.fn())
  },
  handleChangeOrderStatus: jest.fn(),
  searchValue: '',
  setCheckNotificationStatus: jest.fn(),
  checkNotificationStatus: { open: false, checked: false }
}

const filterSearchDefaults = {
  search: {
    business: '',
    city: '',
    driver: '',
    paymethod: '',
    delivery_type: '',
    state: '',
    date: { from: '', to: '', type: '' }
  },
  onSearch: jest.fn(),
  setOpenedSelect: jest.fn(),
  openedSelect: null
}

const businessListDefaults = {
  ...filterSearchDefaults,
  businessesList: {
    businesses: [
      { id: 1, name: 'Store A' },
      { id: 2, name: 'Store B' }
    ]
  }
}

const mainSearchDefaults = {
  ...filterSearchDefaults,
  allListValues: {
    countries: [
      {
        id: 1,
        name: 'Country',
        cities: [
          { id: 10, name: 'City A' },
          { id: 11, name: 'City B' }
        ]
      }
    ]
  }
}

const driverListDefaults = {
  ...filterSearchDefaults,
  driverList: {
    drivers: [
      { id: 1, name: 'Driver One' },
      { id: 2, name: 'Driver Two' }
    ]
  }
}

const paymethodListDefaults = {
  ...filterSearchDefaults,
  paymethodList: {
    paymethods: [
      { id: 1, name: 'Cash' },
      { id: 2, name: 'Card' }
    ]
  }
}

const statusFilterDefaults = {
  ...filterSearchDefaults,
  currentTabSelected: 'pending',
  tabs,
  orderStatus
}

const newOrderNotificationDefaults = {
  isBusinessApp: false,
  orderStatus: [0, 7],
  events: {
    on: jest.fn(),
    off: jest.fn()
  }
}

const orderDetailsDefaults = {
  navigation: { navigate: jest.fn(), goBack: jest.fn(), canGoBack: jest.fn(() => true) },
  order: { order: sampleOrder, loading: false, error: null },
  messages: { messages: [] },
  messagesReadList: [],
  driverLocation: null,
  actions: driverActions,
  orderTitle: driverOrderTitle,
  appTitle: driverAppTitle,
  handleChangeOrderStatus: jest.fn(),
  readMessages: jest.fn(),
  setMessages: jest.fn(),
  updateDriverPosition: jest.fn(),
  driverUpdateLocation: false,
  setDriverUpdateLocation: jest.fn(),
  handleClickLogisticOrder: jest.fn(),
  forceUpdate: jest.fn(),
  orderAssingId: null,
  isCustomView: false,
  isDisabledOrdersRoom: true
}

const makeGroupedOrders = (orders = [sampleOrder]) => [[['group-1', orders.map((order) => ({
  ...order,
  business: { ...order.business, logo: order.business?.logo?.includes?.('https') ? order.business.logo : null }
}))]]]

module.exports = {
  orderListGroupsDefaults,
  filterSearchDefaults,
  businessListDefaults,
  mainSearchDefaults,
  driverListDefaults,
  paymethodListDefaults,
  statusFilterDefaults,
  newOrderNotificationDefaults,
  orderDetailsDefaults,
  sampleOrder,
  richSampleOrder,
  makeGroupedOrders,
  tabs,
  orderStatus,
  ordersGroup,
  driverAppTitle,
  driverActions,
  driverOrderTitle
}
