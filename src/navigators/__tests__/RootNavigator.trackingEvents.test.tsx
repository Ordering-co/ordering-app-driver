import React from 'react'
import { AppState } from 'react-native'
import { act } from '@testing-library/react-native'

import { renderWithProviders } from '../../../jest/helpers/renderWithProviders'
import { useApi, useConfig, useOrder, useSession, useToast, useWebsocket } from '@components'
import { PermissionsContext } from '../../context/PermissionsContext'
import RootNavigator from '../RootNavigator'

/**
 * The tracking events (GPS off / on, connection lost / restored, app in the background) are recorded and sent by the
 * native location module while the driver is tracked (docs/LOCATION_MODULE.md, "Tracking events"). The navigator no
 * longer sends them from JavaScript: its three old senders (`set_app_in_background`, `turn_off_mobile_data`, and the
 * maps' `turn_off_gps`) are gone, so a connectivity change or the app going to the background posts nothing.
 */
const mockStorage = { set: jest.fn(), get: jest.fn(async () => undefined), remove: jest.fn() }

jest.mock('../../providers/StoreUtil', () => ({
  StoreMethods: {
    _retrieveStoreData: (...args: any[]) => (mockStorage.get as any)(...args),
    _setStoreData: (...args: any[]) => mockStorage.set(...args),
    _removeStoreData: (...args: any[]) => mockStorage.remove(...args),
    _clearStoreData: jest.fn()
  }
}))

jest.mock('../../hooks/useLocation', () => ({
  useLocation: () => ({ followUserLocation: jest.fn(), getCurrentLocation: jest.fn(async () => null) })
}))
jest.mock('@react-navigation/stack', () => ({ createStackNavigator: () => ({ Navigator: () => null, Screen: () => null }) }))
jest.mock('../HomeNavigator', () => () => null)
jest.mock('../../pages/IntroductoryTutorial', () => () => null)
jest.mock('../../pages/Home', () => () => null)
jest.mock('../../pages/Login', () => () => null)
jest.mock('../../pages/ForgotPassword', () => () => null)
jest.mock('../../pages/Splash', () => () => null)
jest.mock('../../pages/ScheduleBlocked', () => ({ ScheduleBlocked: () => null }))
jest.mock('../../pages/RequestPermissions', () => () => null)
jest.mock('../../ui/src/components/shared/ConfirmDialogHost', () => ({ ConfirmDialogHost: () => null }))
jest.mock('../NavigationRef', () => ({ ...jest.requireActual('../NavigationRef'), navigate: jest.fn() }))
jest.mock('@react-native-firebase/messaging', () => ({
  getMessaging: jest.fn(() => ({})),
  getToken: jest.fn(async () => null),
  getInitialNotification: jest.fn(async () => null),
  onNotificationOpenedApp: jest.fn(() => jest.fn()),
  onMessage: jest.fn(() => jest.fn()),
  onTokenRefresh: jest.fn(() => jest.fn())
}))
jest.mock('react-native-permissions', () => ({
  RESULTS: { GRANTED: 'granted', DENIED: 'denied' },
  request: jest.fn(async () => 'granted'),
  requestMultiple: jest.fn(async () => ({})),
  requestNotifications: jest.fn(async () => ({ status: 'granted' })),
  openSettings: jest.fn()
}))

// A listener that a test can fire: the navigator no longer subscribes at all (the assertion below).
const mockNetInfoListeners: Array<(state: any) => void> = []
jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: { addEventListener: jest.fn((listener: any) => { mockNetInfoListeners.push(listener); return () => undefined }) },
  addEventListener: jest.fn((listener: any) => { mockNetInfoListeners.push(listener); return () => undefined }),
  useNetInfo: jest.fn(() => ({ isConnected: true }))
}))

const driver = { id: 7, level: 4, email: 'ana@example.test', enabled: true }
const permissions = {
  permissions: { locationStatus: 'granted' },
  isGrantedPermissions: true,
  askLocationPermission: () => undefined,
  checkLocationPermission: () => undefined,
  redirectToSettings: () => undefined,
  getPermissions: () => []
}

describe('RootNavigator and the tracking events', () => {
  let handleLogEvent: jest.Mock
  let appStateListeners: Array<(state: string) => void>

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {})
    ;(global as any).fetch = jest.fn(async () => ({ ok: true, json: async () => ({}) }))
    handleLogEvent = jest.fn()
    appStateListeners = []
    jest.spyOn(AppState, 'addEventListener').mockImplementation(((_: string, listener: any) => {
      appStateListeners.push(listener)
      return { remove: jest.fn() }
    }) as any)
    mockNetInfoListeners.length = 0
    ;(useOrder as jest.Mock).mockReturnValue([{ loading: false, options: {}, carts: [] }, { handleLogEvent }])
    ;(useConfig as jest.Mock).mockReturnValue([{ loading: false, configs: {} }])
    ;(useApi as jest.Mock).mockReturnValue([{ project: 'demo', root: 'https://api.test' }, { setOrdering: jest.fn() }])
    ;(useToast as jest.Mock).mockReturnValue([null, { showToast: jest.fn() }])
    ;(useWebsocket as jest.Mock).mockReturnValue({ on: jest.fn(), off: jest.fn() })
    ;(useSession as jest.Mock).mockReturnValue([
      { auth: true, user: driver, loading: false, token: 'session-token' },
      { logout: jest.fn(), refreshUserInfo: jest.fn(), login: jest.fn() }
    ])
  })

  afterEach(() => jest.restoreAllMocks())

  const mount = async () => {
    renderWithProviders(
      <PermissionsContext.Provider value={permissions as never}>
        <RootNavigator />
      </PermissionsContext.Provider>
    )
    // Let the navigator finish loading (schedule, push setup): the old sender only fired once it had loaded.
    for (let i = 0; i < 10; i++) await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)) })
  }

  it('does not post set_app_in_background when the app goes to the background', async () => {
    await mount()
    expect(appStateListeners.length).toBeGreaterThan(0)
    await act(async () => {
      appStateListeners.forEach(listener => listener('background'))
    })
    await act(async () => {})
    expect(handleLogEvent).not.toHaveBeenCalled()
  })

  it('does not post turn_off_mobile_data on a connectivity change, and keeps no disconnected_at', async () => {
    await mount()
    await act(async () => {
      mockNetInfoListeners.forEach(listener => listener({ isConnected: false, isInternetReachable: false, type: 'none' }))
    })
    await act(async () => {
      mockNetInfoListeners.forEach(listener => listener({ isConnected: true, isInternetReachable: true, type: 'wifi' }))
    })
    await act(async () => {})
    expect(handleLogEvent).not.toHaveBeenCalled()
    expect(mockStorage.set.mock.calls.map(call => call[0])).not.toContain('disconnected_at')
    expect(mockStorage.get.mock.calls.map((call: any[]) => call[0])).not.toContain('disconnected_at')
  })

  it('no longer subscribes to NetInfo itself (the offline banner and the order lists read it in their own components)', async () => {
    await mount()
    expect(mockNetInfoListeners).toHaveLength(0)
  })
})
