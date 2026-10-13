/**
 * Defaults for schedule & driver map legacy UI copies.
 */
/* eslint-env jest */

const sampleLocation = {
  lat: 40.7128,
  lng: -74.006,
  icon: 'https://example.com/pin.png',
  title: 'Store A'
}

const sampleMapOrder = {
  id: 101,
  status: 0,
  delivery_datetime_utc: '2026-07-14T18:00:00Z',
  delivery_datetime: '2026-07-14 14:00:00',
  paymethod: { name: 'Cash' }
}

const sampleScheduleDay = (enabled = true, openH = 9, openM = 0, closeH = 17, closeM = 0) => ({
  enabled,
  lapses: enabled
    ? [{ open: { hour: openH, minute: openM }, close: { hour: closeH, minute: closeM } }]
    : []
})

const driverMapDefaults = {
  location: sampleLocation,
  markerTitle: 'Your Location',
  maxLimitLocation: undefined,
  handleOpenMapView: jest.fn(),
  showAcceptOrReject: false,
  saveLocation: false,
  setSaveLocation: jest.fn(),
  order: sampleMapOrder,
  isSetInputs: false,
  orderStatus: 'Pending',
  isBusinessMarker: false,
  isToFollow: false,
  handleViewActionOrder: jest.fn(),
  driverUpdateLocation: { error: null, newLocation: null },
  setDriverUpdateLocation: jest.fn(),
  navigation: { navigate: jest.fn(), goBack: jest.fn() },
  getOrderStatus: jest.fn(() => ({ value: 'Pending' }))
}

const driverMapAcceptRejectDefaults = {
  ...driverMapDefaults,
  showAcceptOrReject: true
}

const driverScheduleDefaults = {
  setOpenModal: jest.fn(),
  schedule: [
    sampleScheduleDay(true, 9, 0, 17, 0),
    sampleScheduleDay(true, 9, 0, 17, 0),
    sampleScheduleDay(false),
    sampleScheduleDay(true, 10, 30, 18, 0),
    sampleScheduleDay(true, 9, 0, 17, 0),
    sampleScheduleDay(true, 9, 0, 17, 0),
    sampleScheduleDay(true, 9, 0, 17, 0)
  ]
}

const scheduleBlockedDefaults = {
  nextSchedule: {
    day: 0,
    schedule: { open: { hour: 9, minute: 0 } }
  }
}

const d4ConfigState = {
  loading: false,
  configs: {
    google_maps_api_key: { value: 'test-key' },
    distance_unit: { value: 'km' },
    reject_orders_enabled: { value: '1' },
    order_logbook_enabled: { value: '1' },
    default_country_code: { value: 'US' }
  }
}

module.exports = {
  sampleLocation,
  sampleMapOrder,
  sampleScheduleDay,
  driverMapDefaults,
  driverMapAcceptRejectDefaults,
  driverScheduleDefaults,
  scheduleBlockedDefaults,
  d4ConfigState,
  b7ConfigState: d4ConfigState
}
