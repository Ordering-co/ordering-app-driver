/**
 * Controller defaults for messages & details UI wired exports (driver app).
 */
/* eslint-env jest */

const sampleOrder = {
  id: 101,
  status: 0,
  unread_count: 2,
  created_at: '2026-01-01T12:00:00Z',
  delivery_datetime: '2099-01-01 12:00:00',
  delivery_datetime_utc: '2099-01-01 12:00:00',
  delivery_type: 1,
  app_id: 'ordering',
  business: { id: 1, name: 'Store A', logo: null },
  customer: { id: 2, name: 'Jane', lastname: 'Doe', photo: null, cellphone: '5551234' },
  driver: { id: 3, name: 'Driver', lastname: 'One', photo: null }
}

const orderDetailsDefaults = {
  navigation: {
    navigate: jest.fn(),
    goBack: jest.fn(),
    canGoBack: jest.fn(() => true),
    addListener: jest.fn(() => jest.fn())
  },
  order: {
    order: sampleOrder,
    loading: false,
    error: null
  },
  handleClickLogisticOrder: jest.fn(),
  orderAssingId: 55,
  messages: { messages: [], loading: false },
  setMessages: jest.fn(),
  readMessages: jest.fn(),
  messagesReadList: [],
  setOrders: jest.fn()
}

const messagesOptionDefaults = {
  orders: {
    loading: false,
    error: null,
    data: [
      {
        ...sampleOrder,
        business: { ...sampleOrder.business, name: 'Message Store' }
      }
    ]
  },
  setOrders: jest.fn(),
  loadMore: jest.fn(),
  pagination: { currentPage: 1, totalPages: 2, pageSize: 10 },
  messages: { messages: [], loading: false },
  onNavigationRedirect: jest.fn(),
  setSortBy: jest.fn(),
  getOrders: jest.fn()
}

const contactsDefaults = {
  contacts: {
    data: [
      { id: 1, name: 'Contact', lastname: 'One', logo: null, photo: null, unread_count: 1, qualification: 4 },
      { id: 2, name: 'Contact', lastname: 'Two', logo: null, photo: null, unread_count: 0, qualification: 3 }
    ],
    loading: false,
    error: null
  },
  activeTag: 2,
  pagination: { currentPage: 1, totalPages: 2 },
  getBusinesses: jest.fn(),
  getCustomers: jest.fn(),
  getDrivers: jest.fn(),
  loadMore: jest.fn(),
  onNavigationRedirect: jest.fn()
}

const chatDefaults = {
  type: 2,
  order: sampleOrder,
  orderId: 101,
  messages: {
    loading: false,
    messages: [
      {
        id: 1,
        type: 2,
        author: { id: 1, name: 'Jane', level: 3 },
        author_id: 1,
        comment: 'Hello there',
        created_at: '2026-01-01T12:05:00Z',
        can_see: '2,3',
        order_id: 101
      },
      {
        id: 2,
        type: 1,
        author: { id: 99, name: 'System', level: 0 },
        change: { attribute: 'status', old: 0, new: 7 },
        created_at: '2026-01-01T12:06:00Z',
        can_see: '2,3,4'
      }
    ]
  },
  image: null,
  message: '',
  messagesToShow: null,
  sendMessage: { loading: false },
  setMessage: jest.fn(),
  canRead: { business: true, customer: true, driver: true },
  setCanRead: jest.fn(),
  handleSend: jest.fn(),
  setImage: jest.fn(),
  readMessages: jest.fn(),
  isMessagesLoading: false
}

const reviewCustomerDefaults = {
  order: {
    ...sampleOrder,
    customer: {
      ...sampleOrder.customer,
      photo: null
    }
  },
  closeModal: jest.fn(),
  reviewState: { qualification: 5, comment: '' },
  setReviewState: jest.fn(),
  actionState: { loading: false, error: null },
  handleSendCustomerReview: jest.fn(),
  handleCustomCustomerReview: null
}

module.exports = {
  sampleOrder,
  orderDetailsDefaults,
  messagesOptionDefaults,
  contactsDefaults,
  chatDefaults,
  reviewCustomerDefaults
}
