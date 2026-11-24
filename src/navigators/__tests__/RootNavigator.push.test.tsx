import React from 'react'
import { act, waitFor } from '@testing-library/react-native'

import { renderWithProviders } from '../../../jest/helpers/renderWithProviders'
import { useApi, useConfig, useOrder, useSession, useToast, useWebsocket } from '@components'
import { PermissionsContext } from '../../context/PermissionsContext'
import RootNavigator from '../RootNavigator'
import * as RootNavigation from '../NavigationRef'

// RootNavigator with OneSignal 5 (the mock of jest/helpers/mockOneSignal.js records every call):
// what the app does at sign-in, when a notification is tapped, and at sign-out.
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
  isGrantedPermissions: true,
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

describe('RootNavigator push with OneSignal 5', () => {
  let fetchMock: jest.Mock

  beforeEach(() => {
    mockOneSignal.__reset()
    mockRemoveStoreData.mockClear()
    mockSetStoreData.mockClear()
    ;(RootNavigation.navigate as jest.Mock).mockClear()
    jest.spyOn(console, 'log').mockImplementation(() => {})
    fetchMock = jest.fn(async () => ({ ok: true, json: async () => ({}) }))
    ;(global as any).fetch = fetchMock
    ;(useOrder as jest.Mock).mockReturnValue([{ loading: false, options: {}, carts: [] }, { handleLogEvent: jest.fn() }])
    ;(useConfig as jest.Mock).mockReturnValue([{
      loading: false,
      configs: { onesignal_deliveryapp_id: { value: 'os-app-1' } }
    }])
    ;(useApi as jest.Mock).mockReturnValue([{ project: 'demo', root: 'https://api.test' }, { setOrdering: jest.fn() }])
    ;(useToast as jest.Mock).mockReturnValue([null, { showToast: jest.fn() }])
    ;(useWebsocket as jest.Mock).mockReturnValue({ on: jest.fn(), off: jest.fn() })
  })

  it('does nothing with OneSignal while nobody is signed in', async () => {
    ;(useSession as jest.Mock).mockReturnValue(session(false))
    renderWithProviders(tree())
    await act(async () => {})

    expect(mockOneSignal.__calls).toEqual([])
  })

  it('initializes, logs the driver in as project-id, adds the email and the E.164 phone, and registers the subscription id', async () => {
    mockOneSignal.__answers.subscriptionId = 'sub-1'
    ;(useSession as jest.Mock).mockReturnValue(session(true))
    renderWithProviders(tree())

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled()
    })

    expect(calls('initialize', 'login', 'addEmail', 'addSms')).toEqual([
      'initialize:os-app-1',
      'login:demo-7',
      'addEmail:ana@example.test',
      'addSms:+573008282222'
    ])
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.test/users/7/notification_tokens')
    expect(init.method).toBe('POST')
    // The token of the driver's notification_tokens row is the push subscription id; no provider, as before.
    expect(JSON.parse(init.body)).toEqual({ token: 'sub-1', user_id: 7, app: expect.any(String) })
  })

  it('opens the order of a tapped OneSignal notification', async () => {
    mockOneSignal.__answers.subscriptionId = 'sub-1'
    ;(useSession as jest.Mock).mockReturnValue(session(true))
    renderWithProviders(tree())
    await waitFor(() => expect(mockOneSignal.__listeners.click.size).toBe(1))

    await act(async () => {
      mockOneSignal.__emit('click', { notification: { additionalData: { order_id: 55 } }, result: {} })
    })

    await waitFor(() => {
      expect(RootNavigation.navigate).toHaveBeenCalledWith('OrderDetails', {
        orderId: 55,
        isDriverNotification: true,
        isFromRoot: true
      })
    })
  })

  it('opts out and logs out of OneSignal when the driver signs out, and forgets the registered token', async () => {
    mockOneSignal.__answers.subscriptionId = 'sub-1'
    ;(useSession as jest.Mock).mockReturnValue(session(true))
    const view = renderWithProviders(tree())
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    mockOneSignal.__calls.length = 0

    ;(useSession as jest.Mock).mockReturnValue(session(false))
    view.rerender(tree())

    await waitFor(() => {
      expect(calls('optOut', 'logout')).toEqual(['optOut', 'logout'])
    })
    expect(mockRemoveStoreData).toHaveBeenCalledWith('notification_state')
  })

  it('removes its listeners when the navigator unmounts', async () => {
    ;(useSession as jest.Mock).mockReturnValue(session(true))
    const view = renderWithProviders(tree())
    await waitFor(() => expect(mockOneSignal.__listeners.click.size).toBe(1))

    view.unmount()

    expect(mockOneSignal.__listeners.click.size).toBe(0)
    expect(mockOneSignal.__listeners.change.size).toBe(0)
    expect(mockOneSignal.__listeners.permissionChange.size).toBe(0)
  })
})
