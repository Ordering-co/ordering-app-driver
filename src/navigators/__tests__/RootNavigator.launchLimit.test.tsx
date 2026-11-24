import React from 'react'
import { Text } from 'react-native'
import { act } from '@testing-library/react-native'
import BootSplash from 'react-native-bootsplash'

import { renderWithProviders } from '../../../jest/helpers/renderWithProviders'
import { ToastType, useApi, useConfig, useLanguage, useOrder, useSession, useToast, useWebsocket } from '@components'
import { PermissionsContext } from '../../context/PermissionsContext'
import RootNavigator from '../RootNavigator'
import { LAUNCH_NOTICE_MS, LAUNCH_TIME_LIMIT_MS } from '../useLaunchTimeLimit'

// The launch's time limit (decision 2026-11-17): an API that accepts the connection and never answers
// keeps every launch request pending; after LAUNCH_TIME_LIMIT_MS the navigator leaves the loading
// page, the native splash goes and one notice shows. What waits for an answer runs when it comes.
const mockOneSignal = require('react-native-onesignal')

jest.mock('../../providers/StoreUtil', () => ({
  StoreMethods: {
    _retrieveStoreData: jest.fn(async () => undefined),
    _setStoreData: jest.fn(),
    _removeStoreData: jest.fn(),
    _clearStoreData: jest.fn()
  }
}))

jest.mock('../../hooks/useLocation', () => ({
  useLocation: () => ({
    followUserLocation: jest.fn(),
    getCurrentLocation: jest.fn(async () => null)
  })
}))

// The stack draws the name of each screen it is given: which page is up is what is asserted.
jest.mock('@react-navigation/stack', () => {
  const { Text: ScreenName } = require('react-native')
  const mockReact = require('react')
  return {
    createStackNavigator: () => ({
      Navigator: ({ children }: any) => children,
      Screen: ({ name }: any) => mockReact.createElement(ScreenName, null, `screen: ${name}`)
    })
  }
})

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

const session = (auth: boolean, loading = false) => [
  { auth, user: auth ? driver : null, loading, token: auth ? 'session-token' : null },
  { logout: jest.fn(), refreshUserInfo: jest.fn(), login: jest.fn() }
]

const tree = (grantedPermissions = permissions) => (
  <PermissionsContext.Provider value={grantedPermissions as never}>
    <RootNavigator />
  </PermissionsContext.Provider>
)

/** What the API has answered: the order options, the translations and the configs. */
const answers = (answered: boolean) => {
  ;(useOrder as jest.Mock).mockReturnValue([{ loading: !answered, options: {}, carts: [] }, { handleLogEvent: jest.fn() }])
  ;(useLanguage as jest.Mock).mockReturnValue([{ loading: !answered, dictionary: {} }, (_key: string, fallback: string) => fallback])
  ;(useConfig as jest.Mock).mockReturnValue([{
    loading: !answered,
    configs: answered ? { onesignal_deliveryapp_id: { value: 'os-app-1' } } : {}
  }])
}

const advance = (ms: number) => act(async () => { jest.advanceTimersByTime(ms) })

describe('RootNavigator launch time limit', () => {
  let showToast: jest.Mock
  let screens: ReturnType<typeof renderWithProviders>

  const screen = (name: string) => screens.queryByText(`screen: ${name}`)
  const render = () => { screens = renderWithProviders(tree()) }

  beforeEach(() => {
    jest.useFakeTimers()
    mockOneSignal.__reset()
    mockOneSignal.__answers.subscriptionId = 'sub-1'
    ;(BootSplash.hide as jest.Mock).mockClear()
    jest.spyOn(console, 'log').mockImplementation(() => {})
    ;(global as any).fetch = jest.fn(async () => ({ ok: true, json: async () => ({}) }))
    showToast = jest.fn()
    ;(useApi as jest.Mock).mockReturnValue([{ project: 'demo', root: 'https://api.test' }, { setOrdering: jest.fn() }])
    ;(useToast as jest.Mock).mockReturnValue([null, { showToast }])
    ;(useWebsocket as jest.Mock).mockReturnValue({ on: jest.fn(), off: jest.fn() })
    ;(useSession as jest.Mock).mockReturnValue(session(true))
    answers(false)
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  it('stays on the loading page while the API has not answered and the limit has not passed', async () => {
    render()
    await advance(LAUNCH_TIME_LIMIT_MS - 1)
    expect(screen('Splash')).toBeTruthy()
    expect(screen('MyAccount')).toBeNull()
    expect(showToast).not.toHaveBeenCalled()
    expect(BootSplash.hide).not.toHaveBeenCalled()
  })

  it('goes on at the limit with a cached session: the app, the native splash hidden, one notice', async () => {
    render()
    await advance(LAUNCH_TIME_LIMIT_MS)
    expect(screen('Splash')).toBeNull()
    expect(screen('MyAccount')).toBeTruthy()
    expect(BootSplash.hide).toHaveBeenCalledWith({ fade: true })
    expect(showToast).toHaveBeenCalledTimes(1)
    expect(showToast).toHaveBeenCalledWith(ToastType.Error, 'Network Error', LAUNCH_NOTICE_MS)
    // Nothing fires twice however long the API stays silent.
    await advance(LAUNCH_TIME_LIMIT_MS * 3)
    expect(showToast).toHaveBeenCalledTimes(1)
  })

  it('goes on at the limit without a session: the welcome and login screens', async () => {
    ;(useSession as jest.Mock).mockReturnValue(session(false))
    render()
    await advance(LAUNCH_TIME_LIMIT_MS - 1)
    expect(screen('Splash')).toBeTruthy()
    expect(screen('Login')).toBeNull()

    await advance(1)
    expect(screen('Splash')).toBeNull()
    expect(screen('Login')).toBeTruthy()
    expect(screen('MyAccount')).toBeNull()
    expect(BootSplash.hide).toHaveBeenCalled()
    expect(showToast).toHaveBeenCalledTimes(1)
  })

  it('does not open the app before the session is read from the device, whatever the limit says', async () => {
    ;(useSession as jest.Mock).mockReturnValue(session(false, true))
    render()
    await advance(LAUNCH_TIME_LIMIT_MS * 2)
    expect(screen('Splash')).toBeTruthy()
    expect(screen('Login')).toBeNull()
    expect(screen('MyAccount')).toBeNull()
  })

  it('never fires on a launch that finishes before the limit, however slow', async () => {
    render()
    await advance(LAUNCH_TIME_LIMIT_MS - 1000)
    expect(screen('Splash')).toBeTruthy()

    // The answers come a second before the limit.
    answers(true)
    screens.rerender(tree())
    await advance(0)
    expect(screen('MyAccount')).toBeTruthy()

    await advance(LAUNCH_TIME_LIMIT_MS * 2)
    expect(showToast).not.toHaveBeenCalled()
    expect(BootSplash.hide).not.toHaveBeenCalled()
    expect(screen('MyAccount')).toBeTruthy()
  })

  it('ends in the normal state when the API answers after the limit: the push setup runs and the app stays', async () => {
    render()
    await advance(LAUNCH_TIME_LIMIT_MS)
    expect(screen('MyAccount')).toBeTruthy()
    // The configs have not answered: no push provider is chosen yet.
    expect(mockOneSignal.__calls).not.toContain('initialize:os-app-1')

    answers(true)
    screens.rerender(tree())
    await advance(0)
    expect(mockOneSignal.__calls).toContain('initialize:os-app-1')
    expect(screen('MyAccount')).toBeTruthy()
    expect(screen('Splash')).toBeNull()
    // No second notice, no second hide.
    expect(showToast).toHaveBeenCalledTimes(1)
  })

  // The launch with no stored tutorial flag and the location already granted (the system's "Clear storage" of an
  // app that had the permission): the one case where nothing ever cleared "permissions loading".
  describe('with the location granted and no stored tutorial flag', () => {
    const granted = { ...permissions, isGrantedPermissions: true }
    const { StoreMethods } = require('../../providers/StoreUtil')
    const welcome = () => screen('IntroductoryTutorial') ?? screen('Home')

    beforeEach(() => {
      ;(useSession as jest.Mock).mockReturnValue(session(false))
      answers(true)
    })

    it('leaves the loading page as soon as the API has answered, with no wait and no notice', async () => {
      screens = renderWithProviders(tree(granted))
      await advance(0)
      expect(screen('Splash')).toBeNull()
      expect(welcome()).toBeTruthy()
      expect(showToast).not.toHaveBeenCalled()
    })

    it('does not leave the page while the stored flag is still being read, and does when it is read', async () => {
      let readFlag: (value: any) => void = () => undefined
      StoreMethods._retrieveStoreData.mockImplementationOnce(() => new Promise((resolve) => { readFlag = resolve }))
      screens = renderWithProviders(tree(granted))
      await advance(1000)
      expect(screen('Splash')).toBeTruthy()
      await act(async () => { readFlag(undefined) })
      expect(screen('Splash')).toBeNull()
      expect(welcome()).toBeTruthy()
    })

    it('is let go at the limit, without a network notice, when the permissions never finish and no dialog is up', async () => {
      // The safety net: whatever keeps the permissions loading (here, a read of the store that never answers),
      // an API that answered must not keep the loading page up for good.
      StoreMethods._retrieveStoreData.mockImplementation(() => new Promise(() => undefined))
      screens = renderWithProviders(tree(granted))
      await advance(LAUNCH_TIME_LIMIT_MS - 1)
      expect(screen('Splash')).toBeTruthy()
      await advance(1)
      expect(screen('Splash')).toBeNull()
      expect(welcome()).toBeTruthy()
      expect(BootSplash.hide).toHaveBeenCalled()
      // The API had answered: it is not blamed.
      expect(showToast).not.toHaveBeenCalled()
      StoreMethods._retrieveStoreData.mockImplementation(async () => undefined)
    })
  })
})
