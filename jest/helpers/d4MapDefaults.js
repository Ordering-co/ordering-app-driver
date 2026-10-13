/**
 * Defaults for map UI wired exports (driver app).
 */
/* eslint-env jest */

const sampleMapOrder = {
  id: 101,
  business_id: 1,
  customer_id: 2,
  business: {
    id: 1,
    name: 'Store A',
    logo: 'https://example.com/logo.png',
    address: '123 Main St',
    zipcode: '10001',
    location: { lat: 40.7128, lng: -74.006 },
    city: { name: 'NYC' }
  },
  customer: {
    id: 2,
    name: 'Jane',
    lastname: 'Doe',
    photo: null,
    address: '456 Customer Ave',
    zipcode: '10002',
    internal_number: '2B',
    location: { lat: 40.72, lng: -74.01 },
    city: { address_notes: 'Ring bell' }
  }
}

const mapViewDefaults = {
  isLoadingBusinessMarkers: false,
  isDeliveryApp: true,
  markerGroups: {
    1: [sampleMapOrder]
  },
  customerMarkerGroups: {
    2: [sampleMapOrder]
  },
  alertState: { open: false, content: [] },
  setAlertState: jest.fn(),
  setDriverLocation: jest.fn(),
  onNavigationRedirect: jest.fn(),
  getBusinessLocations: jest.fn()
}

const googleMapDefaults = {
  location: { lat: 40.7128, lng: -74.006, icon: '', title: 'Pin' },
  locations: null,
  readOnly: true,
  markerTitle: 'Your Location',
  handleChangeAddressMap: jest.fn(),
  handleOpenMapView: jest.fn(),
  handleViewActionOrder: jest.fn(),
  setSaveLocation: jest.fn(),
  handleToggleMap: jest.fn(),
  saveLocation: false,
  showAcceptOrReject: false,
  maxLimitLocation: undefined,
  isSetInputs: false,
  driverLocation: null,
  navigation: { navigate: jest.fn(), goBack: jest.fn() },
  order: null,
  logisticOrderStatus: [],
  getOrderStatus: jest.fn((status) => ({ value: `Status ${status}` })),
  colors: { 0: '#000' }
}

const googleMapWithOrderDefaults = {
  ...googleMapDefaults,
  order: {
    id: 101,
    external_id: null,
    status: 0,
    isLogistic: false,
    order_group_id: null,
    business: { name: 'Store A' },
    customer: { address: '456 Customer Ave' }
  },
  locations: [
    {
      lat: 40.7128,
      lng: -74.006,
      level: 2,
      title: 'Business',
      icon: 'https://example.com/logo.png',
      business_id: 1,
      address: { addressName: '123 Main St', zipcode: '10001' }
    },
    {
      lat: 40.72,
      lng: -74.01,
      level: 3,
      title: 'Customer',
      icon: null,
      address: { addressName: '456 Customer Ave', zipcode: '10002' }
    }
  ]
}

module.exports = {
  sampleMapOrder,
  mapViewDefaults,
  googleMapDefaults,
  googleMapWithOrderDefaults
}
