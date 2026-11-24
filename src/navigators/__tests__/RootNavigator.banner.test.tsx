import React from 'react'
import { Alert, NativeModules, Platform } from 'react-native'
import { act, waitFor } from '@testing-library/react-native'

import { renderWithProviders } from '../../../jest/helpers/renderWithProviders'
const { captureDialogs } = require('../../../jest/helpers/confirmDialogs')
import { useApi, useConfig, useOrder, useSession, useToast, useWebsocket } from '@components'
import { PermissionsContext } from '../../context/PermissionsContext'
import RootNavigator from '../RootNavigator'
import * as RootNavigation from '../NavigationRef'

// The app's dialog host is replaced by the test's own: what the driver would be asked is recorded.
jest.mock('../../ui/src/components/shared/ConfirmDialogHost', () => ({ ConfirmDialogHost: () => null }))

// The iOS "Enable persistent notifications" alert of RootNavigator (decision 2026-11-17): on every
// launch with a session and on every login while the banner style is temporary, once each, never
// before a login.
const mockOneSignal = require('react-native-onesignal')
const mockSetStoreData = jest.fn()
const mockRemoveStoreData = jest.fn()

jest.mock('../../providers/StoreUtil', () => ({
  StoreMethods: {
    _retrieveStoreData: jest.fn(async () => undefined),
    _setStoreData: (...args: any[]) => mockSetStoreData(...args),
    _removeStoreData: (...args: any[]) => mockRemoveStoreData(...args),
    _clearStoreData: jest.fn()
  }
}))

jest.mock('../../hooks/useLocation', () => ({
  useLocation: () => ({
    followUserLocation: jest.fn(),
    getCurrentLocation: jest.fn(async () => null)
  })
}))

jest.mock('@react-navigation/stack', () => ({
  createStackNavigator: () => ({ Navigator: () => null, Screen: () => null })
}))

jest.mock('../HomeNavigator', () => () => null)
jest.mock('../../pages/IntroductoryTutorial', () => () => null)
jest.mock('../../pages/Home', () => () => null)
jest.mock('../../pages/Login', () => () => null)
jest.mock('../../pages/ForgotPassword', () => () => null)
jest.mock('../../pages/Splash', () => () => null)
jest.mock('../../pages/ScheduleBlocked', () => ({ ScheduleBlocked: () => null }))
jest.mock('../../pages/RequestPermissions', () => () => null)

jest.mock('@react-native-firebase/messaging', () => ({
  getMessaging: jest.fn(() => ({})),
  getToken: jest.fn(async () => null),
  getInitialNotification: jest.fn(async () => null),
  onNotificationOpenedApp: jest.fn(() => jest.fn()),
  onMessage: jest.fn(() => jest.fn()),
  onTokenRefresh: jest.fn(() => jest.fn())
}))

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: () => () => undefined
}))

jest.mock('react-native-permissions', () => ({
  RESULTS: { GRANTED: 'granted', DENIED: 'denied' },
  request: jest.fn(async () => 'granted'),
  requestMultiple: jest.fn(async () => ({})),
  requestNotifications: jest.fn(async () => ({ status: 'granted' })),
  openSettings: jest.fn()
}))


jest.mock('../NavigationRef', () => ({ ...jest.requireActual('../NavigationRef'), navigate: jest.fn() }))

const permissions = {
  permissions: { locationStatus: 'granted' },
  isGrantedPermissions: false,
  askLocationPermission: () => undefined,
  checkLocationPermission: () => undefined,
  redirectToSettings: () => undefined,
  getPermissions: () => []
}

const driver = { id: 7, level: 4, email: 'ana@example.test', cellphone: '3008282222', country_phone_code: 57 }

const session = (auth: boolean) => [
  { auth, user: auth ? driver : null, loading: false, token: auth ? 'session-token' : null },
  { logout: jest.fn(), refreshUserInfo: jest.fn(), login: jest.fn() }
]

const tree = () => (
  <PermissionsContext.Provider value={permissions as never}>
    <RootNavigator />
  </PermissionsContext.Provider>
)

const calls = (...names: string[]) => mockOneSignal.__calls
  .filter((call: string) => names.some(name => call === name || call.startsWith(`${name}:`)))

const nativeModules = NativeModules as any

describe('RootNavigator banner-style alert (iOS)', () => {
  let getAlertStyle: jest.Mock
  let alert: jest.SpyInstance
  let dialogs: ReturnType<typeof captureDialogs>

  const alertCount = () => dialogs.requests.filter((request: any) => request.title === 'Enable persistent notifications').length

  beforeEach(() => {
    mockOneSignal.__reset()
    mockOneSignal.__answers.subscriptionId = 'sub-1'
    jest.spyOn(console, 'log').mockImplementation(() => {})
    ;(global as any).fetch = jest.fn(async () => ({ ok: true, json: async () => ({}) }))
    getAlertStyle = jest.fn(async () => 'temporary')
    nativeModules.NotificationSettings = { getAlertStyle }
    alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {})
    dialogs = captureDialogs()
    jest.replaceProperty(Platform, 'OS', 'ios')
    ;(useOrder as jest.Mock).mockReturnValue([{ loading: false, options: {}, carts: [] }, { handleLogEvent: jest.fn() }])
    ;(useConfig as jest.Mock).mockReturnValue([{
      loading: false,
      configs: { onesignal_deliveryapp_id: { value: 'os-app-1' } }
    }])
    ;(useApi as jest.Mock).mockReturnValue([{ project: 'demo', root: 'https://api.test' }, { setOrdering: jest.fn() }])
    ;(useToast as jest.Mock).mockReturnValue([null, { showToast: jest.fn() }])
    ;(useWebsocket as jest.Mock).mockReturnValue({ on: jest.fn(), off: jest.fn() })
  })

  afterEach(() => {
    dialogs.off()
    delete nativeModules.NotificationSettings
    jest.restoreAllMocks()
  })

  it('shows the alert once at a launch with a session while the style is temporary', async () => {
    ;(useSession as jest.Mock).mockReturnValue(session(true))
    renderWithProviders(tree())
    await waitFor(() => expect(alertCount()).toBe(1))
    await act(async () => {})
    expect(alertCount()).toBe(1)
    expect(getAlertStyle).toHaveBeenCalledTimes(1)
  })

  it('does not show it again when a later push setup runs in the same session (another OneSignal app id)', async () => {
    ;(useSession as jest.Mock).mockReturnValue(session(true))
    const view = renderWithProviders(tree())
    await waitFor(() => expect(alertCount()).toBe(1))

    // The push setup runs again with another OneSignal app id: it asks for the alert once more.
    mockOneSignal.__calls.length = 0
    ;(useConfig as jest.Mock).mockReturnValue([{
      loading: false,
      configs: { onesignal_deliveryapp_id: { value: 'os-app-2' } }
    }])
    view.rerender(tree())
    await waitFor(() => expect(mockOneSignal.__calls).toContain('initialize:os-app-2'))
    await waitFor(() => expect(mockOneSignal.__calls).toContain('optIn'))
    await act(async () => {})

    expect(alertCount()).toBe(1)
    expect(getAlertStyle).toHaveBeenCalledTimes(1)
  })

  it('does not show it nor ask the style before a login', async () => {
    ;(useSession as jest.Mock).mockReturnValue(session(false))
    renderWithProviders(tree())
    await act(async () => {})
    expect(getAlertStyle).not.toHaveBeenCalled()
    expect(alertCount()).toBe(0)
    expect(alert).not.toHaveBeenCalled()
  })

  it('shows it again at the next login', async () => {
    ;(useSession as jest.Mock).mockReturnValue(session(true))
    const view = renderWithProviders(tree())
    await waitFor(() => expect(alertCount()).toBe(1))

    ;(useSession as jest.Mock).mockReturnValue(session(false))
    view.rerender(tree())
    await act(async () => {})
    expect(alertCount()).toBe(1)

    ;(useSession as jest.Mock).mockReturnValue(session(true))
    view.rerender(tree())
    await waitFor(() => expect(alertCount()).toBe(2))
  })

  it('shows nothing when the style is persistent', async () => {
    getAlertStyle.mockResolvedValue('persistent')
    ;(useSession as jest.Mock).mockReturnValue(session(true))
    renderWithProviders(tree())
    await waitFor(() => expect(getAlertStyle).toHaveBeenCalled())
    await act(async () => {})
    expect(alertCount()).toBe(0)
  })

  it('shows nothing on Android', async () => {
    jest.replaceProperty(Platform, 'OS', 'android')
    ;(useSession as jest.Mock).mockReturnValue(session(true))
    renderWithProviders(tree())
    await waitFor(() => expect(mockOneSignal.__calls).toContain('optIn'))
    await act(async () => {})
    expect(getAlertStyle).not.toHaveBeenCalled()
    expect(alertCount()).toBe(0)
  })
})
