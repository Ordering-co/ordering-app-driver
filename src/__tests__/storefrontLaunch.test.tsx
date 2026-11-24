import React from 'react'
import { waitFor } from '@testing-library/react-native'

import { renderWithProviders } from '../../jest/helpers/renderWithProviders'
import { useApi, useConfig, useOrder, useSession, useToast, useWebsocket } from '@components'
import { PermissionsContext } from '../context/PermissionsContext'
import RootNavigator from '../navigators/RootNavigator'

jest.mock('@ui', () => {
  const React = require('react')
  return {
    Home: (props: object) => {
      const { Home } = require('../ui/src/components/Home')
      return React.createElement(Home, props)
    }
  }
})

// The welcome screen's language button is the profile's controller: it answers with the project's languages.
jest.mock('@components', () => {
  const mockOrdering = require('../../jest/helpers/mockOrdering')
  const { renderUiController, languageSelectorDefaults } = require('../../jest/helpers/d1ShellDefaults')
  return { ...mockOrdering, LanguageSelector: renderUiController(languageSelectorDefaults) }
})

jest.mock('../providers/StoreUtil', () => ({
  StoreMethods: {
    _retrieveStoreData: jest.fn(async () => false),
    _setStoreData: jest.fn(),
    _removeStoreData: jest.fn(),
    _clearStoreData: jest.fn()
  }
}))

jest.mock('../hooks/useLocation', () => ({
  useLocation: () => ({
    followUserLocation: jest.fn(),
    getCurrentLocation: jest.fn(async () => null)
  })
}))

jest.mock('@react-navigation/stack', () => {
  const React = require('react')
  const { View } = require('react-native')

  const flattenScreens = (nodes: React.ReactNode): Array<React.ReactElement<{ name?: string, component?: React.ComponentType<unknown> }>> => {
    const screens: Array<React.ReactElement<{ name?: string, component?: React.ComponentType<unknown> }>> = []
    React.Children.forEach(nodes, (child) => {
      if (!React.isValidElement(child)) return
      if (child.type === React.Fragment) {
        screens.push(...flattenScreens(child.props.children))
        return
      }
      screens.push(child)
    })
    return screens
  }

  return {
    createStackNavigator: () => ({
      Navigator: ({ children }: { children?: React.ReactNode }) => {
        const screens = flattenScreens(children)
        const match = screens.find(child => child.props.name === 'Home')
        const ScreenComponent = match?.props?.component
        if (!ScreenComponent) return null
        return React.createElement(View, null, React.createElement(ScreenComponent, {
          navigation: { navigate: jest.fn() },
          route: { params: {} }
        }))
      },
      Screen: () => null
    })
  }
})

jest.mock('../navigators/HomeNavigator', () => () => null)
jest.mock('../pages/IntroductoryTutorial', () => () => null)
jest.mock('../pages/Login', () => () => null)
jest.mock('../pages/ForgotPassword', () => () => null)
jest.mock('../pages/Splash', () => () => null)
jest.mock('../pages/ScheduleBlocked', () => ({ ScheduleBlocked: () => null }))
jest.mock('../pages/RequestPermissions', () => () => null)

jest.mock('react-native-onesignal', () => require('../../jest/helpers/mockOneSignal'))

jest.mock('@react-native-firebase/messaging', () => ({
  getMessaging: jest.fn(() => ({})),
  getToken: jest.fn(async () => null),
  getInitialNotification: jest.fn(async () => null),
  onNotificationOpenedApp: jest.fn(() => jest.fn()),
  onMessage: jest.fn(() => jest.fn()),
  onTokenRefresh: jest.fn(() => jest.fn())
}))

jest.mock('react-native-notify-kit', () => ({
  __esModule: true,
  default: {
    createChannel: jest.fn(),
    displayNotification: jest.fn(),
    onForegroundEvent: jest.fn(() => jest.fn())
  },
  AndroidImportance: { HIGH: 4 },
  EventType: { PRESS: 1 }
}))

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: (callback: (state: { isConnected: boolean, isInternetReachable: boolean, type: string }) => void) => {
    callback({ isConnected: true, isInternetReachable: true, type: 'wifi' })
    return () => undefined
  }
}))

jest.mock('react-native-permissions', () => ({
  RESULTS: { GRANTED: 'granted', DENIED: 'denied' },
  request: jest.fn(async () => 'granted'),
  requestMultiple: jest.fn(async () => ({})),
  requestNotifications: jest.fn(async () => ({ status: 'granted' })),
  openSettings: jest.fn()
}))

const permissions = {
  permissions: { locationStatus: 'granted' },
  isGrantedPermissions: false,
  askLocationPermission: () => undefined,
  checkLocationPermission: () => undefined,
  redirectToSettings: () => undefined,
  getPermissions: () => []
}

describe('driver storefront launch', () => {
  beforeEach(() => {
    ;(useSession as jest.Mock).mockReturnValue([
      { auth: false, user: null, loading: false, token: null },
      { logout: jest.fn(), refreshUserInfo: jest.fn(), login: jest.fn() }
    ])
    ;(useOrder as jest.Mock).mockReturnValue([
      { loading: false, options: {}, carts: [] },
      { handleLogEvent: jest.fn() }
    ])
    ;(useConfig as jest.Mock).mockReturnValue([{ loading: false, configs: {} }])
    ;(useApi as jest.Mock).mockReturnValue([
      { project: 'demo', root: 'https://example.test' },
      { setOrdering: jest.fn() }
    ])
    ;(useToast as jest.Mock).mockReturnValue([null, { showToast: jest.fn() }])
    ;(useWebsocket as jest.Mock).mockReturnValue({ on: jest.fn(), off: jest.fn() })
  })

  it('shows the driver orders title after the splash', async () => {
    const view = renderWithProviders(
      <PermissionsContext.Provider value={permissions as never}>
        <RootNavigator />
      </PermissionsContext.Provider>
    )

    await waitFor(() => {
      expect(view.getByText('Sign in to see your orders')).toBeTruthy()
    })
    expect(view.toJSON()).toBeTruthy()
  })
})
