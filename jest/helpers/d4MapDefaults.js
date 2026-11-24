/**
 * Defaults for D4 map UI wired exports (driver app).
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

module.exports = {
  sampleMapOrder,
  mapViewDefaults
}
