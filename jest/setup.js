/**
 * Jest setup file referenced by jest.config.js (`setupFiles`).
 * Registers native-module mocks the React Native preset needs.
 */
/* eslint-env jest */

try {
  require('react-native-gesture-handler/jestSetup')
} catch (e) {}

jest.mock('@react-native-vector-icons/ionicons/static', () => 'Icon')
jest.mock('@react-native-vector-icons/material-design-icons/static', () => 'Icon')

jest.mock('react-native-webview', () => {
  const React = require('react')
  const { View } = require('react-native')
  const WebView = (props) => React.createElement(View, { testID: 'webview', ...props })
  return { __esModule: true, default: WebView, WebView }
})

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
)

jest.mock('react-native-safe-area-context', () => {
  const inset = { top: 0, right: 0, bottom: 0, left: 0 }
  return {
    SafeAreaProvider: ({ children }) => children,
    SafeAreaView: ({ children }) => children,
    useSafeAreaInsets: () => inset,
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 })
  }
})

// React Navigation 7's packages import each other's internals (`createScreenFactory`…): the real
// package stays and only what a screen reads from the container is replaced.
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  NavigationContainer: ({ children }) => children,
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    reset: jest.fn(),
    setOptions: jest.fn(),
    getState: jest.fn(() => ({
      routes: [{ name: 'Profile' }],
      index: 0
    })),
    addListener: jest.fn(() => jest.fn())
  }),
  useRoute: () => ({ params: {} }),
  useFocusEffect: jest.fn(),
  useIsFocused: () => true,
  createNavigatorFactory: () => () => ({
    Navigator: ({ children }) => children,
    Screen: () => null,
    Group: ({ children }) => children
  })
}))

jest.mock('@react-navigation/stack', () => ({
  createStackNavigator: () => ({
    Navigator: ({ children }) => children,
    Screen: () => null
  }),
  CardStyleInterpolators: {},
  TransitionSpecs: {},
  HeaderStyleInterpolators: {}
}))

jest.mock('@react-navigation/bottom-tabs', () => ({
  ...jest.requireActual('@react-navigation/bottom-tabs'),
  createBottomTabNavigator: () => ({
    Navigator: ({ children }) => children,
    Screen: () => null
  })
}))

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn(() => Promise.resolve({ isConnected: true })),
  useNetInfo: jest.fn(() => ({ isConnected: true }))
}))

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn(() => '1.0.0'),
  getBuildNumber: jest.fn(() => '1'),
  getBundleId: jest.fn(() => 'co.ordering.delivery'),
  isTablet: jest.fn(() => false)
}))

jest.mock('react-native-restart', () => ({
  restart: jest.fn(),
  Restart: jest.fn()
}))

jest.mock('react-native-bootsplash', () => ({
  __esModule: true,
  default: {
    hide: jest.fn(() => Promise.resolve()),
    isVisible: jest.fn(() => Promise.resolve(false))
  }
}))

jest.mock('react-native-sound-player', () => ({
  playAsset: jest.fn(),
  stop: jest.fn()
}))

// OneSignal 5: every call is recorded and the listeners are kept (jest/helpers/mockOneSignal.js).
jest.mock('react-native-onesignal', () => require('./helpers/mockOneSignal'))

jest.mock('react-native-notify-kit', () => ({
  __esModule: true,
  default: {
    createChannel: jest.fn(),
    displayNotification: jest.fn(() => Promise.resolve('notification-id')),
    onForegroundEvent: jest.fn(() => jest.fn())
  },
  AndroidImportance: { HIGH: 4 },
  EventType: { PRESS: 1 }
}))

jest.mock('@react-native-clipboard/clipboard', () => ({
  setString: jest.fn(),
  getString: jest.fn(() => Promise.resolve(''))
}))

jest.mock('react-native-permissions', () => ({
  openSettings: jest.fn(() => Promise.resolve()),
  checkNotifications: jest.fn(() => Promise.resolve({ status: 'granted' })),
  check: jest.fn(() => Promise.resolve('granted')),
  request: jest.fn(() => Promise.resolve('granted')),
  PERMISSIONS: { IOS: {}, ANDROID: {} },
  RESULTS: { GRANTED: 'granted', DENIED: 'denied', BLOCKED: 'blocked' }
}))

jest.mock('react-native-maps', () => {
  const React = require('react')
  const { View } = require('react-native')
  const MapView = (props) => React.createElement(View, { testID: 'map-view', ...props })
  MapView.Marker = (props) => React.createElement(View, { testID: 'map-marker', ...props })
  MapView.Callout = (props) => React.createElement(View, { testID: 'map-callout', ...props })
  return { __esModule: true, default: MapView, Marker: MapView.Marker, Callout: MapView.Callout, PROVIDER_GOOGLE: 'google' }
})

jest.mock('react-native-geolocation-service', () => ({
  getCurrentPosition: jest.fn((success) => success({ coords: { latitude: 0, longitude: 0 } })),
  watchPosition: jest.fn(),
  clearWatch: jest.fn(),
  stopObserving: jest.fn(),
  requestAuthorization: jest.fn()
}))


