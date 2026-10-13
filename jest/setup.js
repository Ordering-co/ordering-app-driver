/**
 * Jest setup file referenced by jest.config.js (`setupFiles`).
 * Registers native-module mocks the React Native preset needs.
 */
/* eslint-env jest */

try {
  require('react-native-gesture-handler/jestSetup')
} catch (e) {}

jest.mock('react-native-vector-icons/Ionicons', () => 'Icon')
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon')
jest.mock('react-native-vector-icons/Foundation', () => 'Icon')
jest.mock('react-native-vector-icons/AntDesign', () => 'Icon')
jest.mock('react-native-vector-icons/Feather', () => 'Icon')
jest.mock('react-native-vector-icons/FontAwesome', () => 'Icon')

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
)

jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper', () => ({}), { virtual: true })

jest.mock('react-native-safe-area-context', () => {
  const inset = { top: 0, right: 0, bottom: 0, left: 0 }
  return {
    SafeAreaProvider: ({ children }) => children,
    SafeAreaView: ({ children }) => children,
    useSafeAreaInsets: () => inset,
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 })
  }
})

jest.mock('@react-navigation/native', () => ({
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

jest.mock('@react-navigation/drawer', () => ({
  createDrawerNavigator: () => ({
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
  getBundleId: jest.fn(() => 'com.deliveryapp'),
  isTablet: jest.fn(() => false)
}))

jest.mock('react-native-restart', () => ({
  restart: jest.fn(),
  Restart: jest.fn()
}))

jest.mock('react-native-fast-image', () => {
  const React = require('react')
  const { View } = require('react-native')
  const FastImage = (props) => React.createElement(View, { testID: 'fast-image', ...props })
  FastImage.resizeMode = { contain: 'contain', cover: 'cover', stretch: 'stretch' }
  FastImage.priority = { low: 'low', normal: 'normal', high: 'high' }
  FastImage.cacheControl = { immutable: 'immutable', web: 'web', cacheOnly: 'cacheOnly' }
  return { __esModule: true, default: FastImage, resizeMode: FastImage.resizeMode }
})

jest.mock('toggle-switch-react-native', () => {
  const React = require('react')
  const { View } = require('react-native')
  return (props) => React.createElement(View, { testID: 'toggle-switch', ...props })
})

jest.mock('react-native-splash-screen', () => ({
  hide: jest.fn(),
  show: jest.fn()
}))

jest.mock('@twotalltotems/react-native-otp-input', () => {
  const React = require('react')
  const { View } = require('react-native')
  return () => React.createElement(View, { testID: 'otp-input-view' })
})

jest.mock('react-native-sound-player', () => ({
  playAsset: jest.fn(),
  stop: jest.fn()
}))

jest.mock('react-native-onesignal', () => ({
  setAppId: jest.fn(),
  setNotificationOpenedHandler: jest.fn(),
  setNotificationWillShowInForegroundHandler: jest.fn(),
  promptForPushNotificationsWithUserResponse: jest.fn(),
  setExternalUserId: jest.fn(),
  removeExternalUserId: jest.fn()
}))

jest.mock('react-native-app-intro-slider', () => {
  const React = require('react')
  const { View } = require('react-native')
  return (props) => React.createElement(View, { testID: 'intro-slider', ...props })
})

jest.mock('@react-native-clipboard/clipboard', () => ({
  setString: jest.fn(),
  getString: jest.fn(() => Promise.resolve(''))
}))

jest.mock('react-native-gifted-chat', () => {
  const React = require('react')
  const { View, Text } = require('react-native')
  const GiftedChat = (props) => (
    <View testID="gifted-chat">
      <Text testID="gifted-chat-count">{String(props.messages?.length ?? 0)}</Text>
    </View>
  )
  return {
    GiftedChat,
    Actions: (props) => React.createElement(View, { testID: 'gifted-actions', ...props }),
    InputToolbar: (props) => React.createElement(View, { testID: 'gifted-input-toolbar', ...props }),
    Composer: (props) => React.createElement(View, { testID: 'gifted-composer', ...props }),
    Send: (props) => React.createElement(View, { testID: 'gifted-send', ...props }),
    Bubble: (props) => React.createElement(View, { testID: 'gifted-bubble', ...props }),
    MessageImage: (props) => React.createElement(View, { testID: 'gifted-message-image', ...props }),
    Day: (props) => React.createElement(View, { testID: 'gifted-day', ...props }),
    SystemMessage: (props) => React.createElement(View, { testID: 'gifted-system-message', ...props }),
    Message: (props) => React.createElement(View, { testID: 'gifted-message', ...props }),
    Time: (props) => React.createElement(View, { testID: 'gifted-time', ...props })
  }
})

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

jest.mock('react-native-maps-directions', () => {
  const React = require('react')
  const { View } = require('react-native')
  return (props) => React.createElement(View, { testID: 'map-directions', ...props })
})

jest.mock('react-native-geolocation-service', () => ({
  getCurrentPosition: jest.fn((success) => success({ coords: { latitude: 0, longitude: 0 } })),
  watchPosition: jest.fn(),
  clearWatch: jest.fn(),
  stopObserving: jest.fn(),
  requestAuthorization: jest.fn()
}))

jest.mock('react-native-background-geolocation', () => ({
  ready: jest.fn(() => Promise.resolve({ enabled: true })),
  start: jest.fn(),
  stop: jest.fn(),
  on: jest.fn(),
  removeListeners: jest.fn(),
  getCurrentPosition: jest.fn(() => Promise.resolve({ coords: { latitude: 0, longitude: 0 } }))
}))

jest.mock('react-native-background-fetch', () => ({
  configure: jest.fn(),
  status: jest.fn(() => Promise.resolve(2)),
  finish: jest.fn()
}))

jest.mock('react-native-background-timer', () => ({
  setInterval: jest.fn(() => 1),
  clearInterval: jest.fn(),
  setTimeout: jest.fn(() => 1),
  clearTimeout: jest.fn()
}))
