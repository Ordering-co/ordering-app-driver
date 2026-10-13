/* eslint-env jest */
/**
 * Native mocks for OrderDetails/Delivery tests (c).
 * Import after registerD3OrdersMocks in Delivery.test.tsx.
 */

jest.mock('react-native-geolocation-service', () => ({
  getCurrentPosition: jest.fn((success) =>
    success?.({
      coords: { latitude: 40.7128, longitude: -74.006, accuracy: 1 },
      timestamp: Date.now()
    })
  ),
  watchPosition: jest.fn(() => 1),
  clearWatch: jest.fn(),
  stopObserving: jest.fn(),
  requestAuthorization: jest.fn()
}))

jest.mock('../../src/ui/src/hooks/useLocation', () => ({
  useLocation: jest.fn(() => ({
    userLocation: {
      latitude: 40.7128,
      longitude: -74.006,
      timestamp: Date.now(),
      mocked: false
    },
    getCurrentLocation: jest.fn().mockResolvedValue({
      latitude: 40.7128,
      longitude: -74.006,
      timestamp: Date.now(),
      mocked: false
    }),
    followUserLocation: jest.fn(),
    stopFollowUserLocation: jest.fn()
  }))
}))
