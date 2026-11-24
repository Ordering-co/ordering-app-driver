import React from 'react'
import { AppState, Linking, Platform } from 'react-native'
import { act, renderHook } from '@testing-library/react-native'
import { openSettings } from 'react-native-permissions'

import { PermissionsContext } from '../../context/PermissionsContext'
import {
  getLocationDialogKind,
  openLocationSettings,
  useDriverLocationTracking
} from '../useDriverLocationTracking'
import * as driverLocation from '../../native/driverLocation'

jest.mock('../../native/driverLocation', () => ({
  configure: jest.fn(),
  start: jest.fn(),
  stop: jest.fn(),
  getState: jest.fn(),
  flush: jest.fn(),
  onState: jest.fn(),
  setApiRoot: jest.fn(() => true)
}))

const mockSession: { state: any, logout: jest.Mock } = { state: {}, logout: jest.fn() }
const mockLanguage: { state: any } = { state: { loading: false } }
const mockConfigs: { configs: any } = { configs: {} }
jest.mock('@components', () => ({
  useConfig: () => [{ configs: mockConfigs.configs }],
  useLanguage: () => [mockLanguage.state, (_key: string, fallback: string) => fallback],
  useSession: () => [mockSession.state, { logout: mockSession.logout }],
  useApi: () => [{ root: 'http://localhost:8080' }]
}))

const native = driverLocation as jest.Mocked<typeof driverLocation>

const okState = {
  enabled: true,
  tracking: true,
  queued: 0,
  lastLocationAt: null,
  lastHttpStatus: null,
  authorization: 'always',
  servicesEnabled: true
}

const session = (overrides: Record<string, unknown> = {}) => ({
  auth: true,
  token: 'token-1',
  user: { id: 7, enabled: true },
  ...overrides
})

let stateListener: (kind: any) => void
let subscription: { remove: jest.Mock }
let appStateListener: (state: string) => void

let mockLocationStatus: any = { 'android.permission.ACCESS_FINE_LOCATION': 'granted' }
// `granted`: every permission the app asks for (isGrantedPermissions); `canTrack`: the system lets the app read the position
// (canTrackLocation, "While Using" is enough). By default they are the same.
let mockGranted = true
let mockCanTrack: boolean | null = null
const permissionsWrapper = () => ({ children }: any) => (
  <PermissionsContext.Provider
    value={{
      isGrantedPermissions: mockGranted,
      canTrackLocation: mockCanTrack ?? mockGranted,
      permissions: { locationStatus: mockLocationStatus }
    } as any}
  >
    {children}
  </PermissionsContext.Provider>
)

const render = (props: { blockedSchedule?: boolean, driverLoginValidated?: boolean } = {}, granted = true, canTrack: boolean | null = null) => {
  mockGranted = granted
  mockCanTrack = canTrack
  return renderHook((p: typeof props) => useDriverLocationTracking(p), {
    initialProps: props,
    wrapper: permissionsWrapper()
  })
}

const settle = async () => {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  mockSession.state = session()
  mockLanguage.state = { loading: false }
  mockConfigs.configs = {}
  mockLocationStatus = { 'android.permission.ACCESS_FINE_LOCATION': 'granted' }
  subscription = { remove: jest.fn() }
  native.onState.mockImplementation((callback: any) => {
    stateListener = callback
    return subscription
  })
  native.configure.mockResolvedValue(okState)
  native.start.mockResolvedValue(okState)
  native.stop.mockResolvedValue({ ...okState, tracking: false })
  native.getState.mockResolvedValue(okState)
  native.flush.mockResolvedValue(undefined)
  jest.spyOn(AppState, 'addEventListener').mockImplementation(((_: string, listener: any) => {
    appStateListener = listener
    return { remove: jest.fn() }
  }) as any)
  jest.spyOn(console, 'log').mockImplementation(() => undefined)
})

describe('useDriverLocationTracking', () => {
  it('tells the native side which host is the API as soon as the root is known, before it configures anything', async () => {
    render()
    expect(native.setApiRoot).toHaveBeenCalledWith('http://localhost:8080')
    expect(native.setApiRoot).toHaveBeenCalledTimes(1)
    await settle()
    expect(native.setApiRoot.mock.invocationCallOrder[0]).toBeLessThan(native.configure.mock.invocationCallOrder[0])
  })

  it('tells it even when nobody is signed in (the login request is the API\'s too)', async () => {
    mockSession.state = session({ auth: false, token: null, user: null })
    render()
    await settle()
    expect(native.setApiRoot).toHaveBeenCalledWith('http://localhost:8080')
    expect(native.configure).not.toHaveBeenCalled()
  })

  it('configures the module with the driver, the token and the notification, then starts it by the run plan', async () => {
    render()
    await settle()
    expect(native.configure).toHaveBeenCalledWith({
      url: 'http://localhost:8080/users/7/locations',
      headers: { Authorization: 'Bearer token-1' },
      extras: { driver_id: 7 },
      distanceFilter: 25,
      interval: 40000,
      fastestInterval: 20000,
      notification: { title: 'Background tracking enabled', text: 'Important for delivery real time location' },
      minSendIntervalMs: 1500,
      sendLocationAt: true,
      eventsUrl: 'http://localhost:8080/tracking_events'
    })
    expect(native.start).toHaveBeenCalledTimes(1)
    expect(native.stop).not.toHaveBeenCalled()
  })

  describe('the tracking events (the module records them; the app only gives the url and the reasons)', () => {
    const lastConfigure = () => native.configure.mock.calls[native.configure.mock.calls.length - 1][0]

    it('passes the events url, the API root plus /tracking_events, when the project config is absent', async () => {
      mockConfigs.configs = {}
      render()
      await settle()
      expect(lastConfigure().eventsUrl).toBe('http://localhost:8080/tracking_events')
    })

    it.each([['1'], [''], ['yes'], ['2']])('leaves the recorder on for driver_tracking_events_enabled %p', async value => {
      mockConfigs.configs = { driver_tracking_events_enabled: { value } }
      render()
      await settle()
      expect(lastConfigure().eventsUrl).toBe('http://localhost:8080/tracking_events')
    })

    it("turns the recorder off with '0': no events url is passed, tracking itself is unchanged", async () => {
      mockConfigs.configs = { driver_tracking_events_enabled: { value: '0' } }
      render()
      await settle()
      expect(lastConfigure()).not.toHaveProperty('eventsUrl', expect.anything())
      expect(lastConfigure().eventsUrl).toBeUndefined()
      expect(lastConfigure()).toMatchObject({ url: 'http://localhost:8080/users/7/locations', minSendIntervalMs: 1500 })
      expect(native.start).toHaveBeenCalledTimes(1)
    })

    it('configures again, without a new build, when the project config changes', async () => {
      mockConfigs.configs = {}
      const view = render()
      await settle()
      expect(native.configure).toHaveBeenCalledTimes(1)
      mockConfigs.configs = { driver_tracking_events_enabled: { value: '0' } }
      view.rerender({})
      await settle()
      expect(native.configure).toHaveBeenCalledTimes(2)
      expect(lastConfigure().eventsUrl).toBeUndefined()
      mockConfigs.configs = { driver_tracking_events_enabled: { value: '0' } } // fetched again, same value
      view.rerender({})
      await settle()
      expect(native.configure).toHaveBeenCalledTimes(2)
      expect(native.start).toHaveBeenCalledTimes(1)
    })

    it('starts with the reason login the first time', async () => {
      render()
      await settle()
      expect(native.start).toHaveBeenCalledWith('login')
    })

    it('stops with the reason that holds: logout, unavailable, schedule, permission', async () => {
      mockSession.state = session({ auth: false })
      render().unmount()
      await settle()
      expect(native.stop).toHaveBeenLastCalledWith('logout')

      jest.clearAllMocks()
      mockSession.state = session({ user: { id: 7, enabled: false } })
      render().unmount()
      await settle()
      expect(native.stop).toHaveBeenLastCalledWith('unavailable')

      jest.clearAllMocks()
      mockSession.state = session()
      render({ blockedSchedule: true, driverLoginValidated: true }).unmount()
      await settle()
      expect(native.stop).toHaveBeenLastCalledWith('schedule')

      jest.clearAllMocks()
      render({}, false).unmount()
      await settle()
      expect(native.stop).toHaveBeenLastCalledWith('permission')
    })

    it('sends the stop again once the module is configured, so an owed stop is reported with the reason permission', async () => {
      let finish: (state: any) => void = () => undefined
      native.configure.mockReturnValue(new Promise(resolve => { finish = resolve }) as any)
      render({}, false)
      await settle()
      expect(native.stop).toHaveBeenCalledTimes(1) // decided before the module knew the url and the token
      await act(async () => {
        finish(okState)
        await Promise.resolve()
      })
      await settle()
      expect(native.stop).toHaveBeenCalledTimes(2)
      expect(native.stop).toHaveBeenLastCalledWith('permission')
      expect(native.start).not.toHaveBeenCalled()
    })

    it('starts with permission, not restart, after a stop for the permission', async () => {
      const view = render()
      await settle()
      mockGranted = false
      mockCanTrack = false
      view.rerender({})
      await settle()
      expect(native.stop).toHaveBeenLastCalledWith('permission')
      mockGranted = true
      mockCanTrack = true
      view.rerender({})
      await settle()
      expect(native.start).toHaveBeenLastCalledWith('permission')
    })

    it('starts with available after the driver was unavailable, and with schedule after a schedule block', async () => {
      const view = render()
      await settle()
      expect(native.start).toHaveBeenLastCalledWith('login')

      mockSession.state = session({ user: { id: 7, enabled: false } })
      view.rerender({})
      await settle()
      expect(native.stop).toHaveBeenLastCalledWith('unavailable')

      mockSession.state = session()
      view.rerender({})
      await settle()
      expect(native.start).toHaveBeenLastCalledWith('available')

      view.rerender({ blockedSchedule: true, driverLoginValidated: true })
      await settle()
      expect(native.stop).toHaveBeenLastCalledWith('schedule')
      view.rerender({})
      await settle()
      expect(native.start).toHaveBeenLastCalledWith('schedule')
    })
  })

  describe('the send options (project configs over the app defaults)', () => {
    const lastConfigure = () => native.configure.mock.calls[native.configure.mock.calls.length - 1][0]

    it('uses the app defaults (1500 ms and location_at on) with the configs absent', async () => {
      mockConfigs.configs = undefined
      render()
      await settle()
      expect(lastConfigure()).toMatchObject({ minSendIntervalMs: 1500, sendLocationAt: true })
    })

    it('takes the project configs when they are present', async () => {
      mockConfigs.configs = {
        driver_location_min_send_interval_ms: { value: '4000' },
        driver_location_send_location_at: { value: '0' }
      }
      render()
      await settle()
      expect(native.configure).toHaveBeenCalledTimes(1)
      expect(lastConfigure()).toMatchObject({ minSendIntervalMs: 4000, sendLocationAt: false })
    })

    it('falls back to the defaults for an invalid config', async () => {
      mockConfigs.configs = {
        driver_location_min_send_interval_ms: { value: '-5' },
        driver_location_send_location_at: { value: 'maybe' }
      }
      render()
      await settle()
      expect(lastConfigure()).toMatchObject({ minSendIntervalMs: 1500, sendLocationAt: true })
    })

    it('configures the module again, without starting or stopping it, when a config changes while running', async () => {
      const view = render()
      await settle()
      expect(native.configure).toHaveBeenCalledTimes(1)
      expect(native.start).toHaveBeenCalledTimes(1)

      mockConfigs.configs = { driver_location_min_send_interval_ms: { value: '3000' } }
      view.rerender({})
      await settle()
      expect(native.configure).toHaveBeenCalledTimes(2)
      expect(lastConfigure()).toMatchObject({ minSendIntervalMs: 3000, sendLocationAt: true, headers: { Authorization: 'Bearer token-1' } })

      mockConfigs.configs = { driver_location_min_send_interval_ms: { value: '3000' }, driver_location_send_location_at: { value: '0' } }
      view.rerender({})
      await settle()
      expect(native.configure).toHaveBeenCalledTimes(3)
      expect(lastConfigure()).toMatchObject({ minSendIntervalMs: 3000, sendLocationAt: false })

      // The configs fetched again with the same values: nothing to configure.
      mockConfigs.configs = { driver_location_min_send_interval_ms: { value: '3000' }, driver_location_send_location_at: { value: '0' } }
      view.rerender({})
      await settle()
      expect(native.configure).toHaveBeenCalledTimes(3)

      expect(native.start).toHaveBeenCalledTimes(1)
      expect(native.stop).not.toHaveBeenCalled()
      expect(native.onState).toHaveBeenCalledTimes(1)
    })
  })

  it('stops it while the user is not logged in, is disabled, or the schedule blocks the shift', async () => {
    mockSession.state = session({ auth: false })
    const loggedOut = render()
    await settle()
    expect(native.start).not.toHaveBeenCalled()
    expect(native.stop).toHaveBeenCalled()
    loggedOut.unmount()

    jest.clearAllMocks()
    mockSession.state = session({ user: { id: 7, enabled: false } })
    render()
    await settle()
    expect(native.start).not.toHaveBeenCalled()
    expect(native.stop).toHaveBeenCalled()

    jest.clearAllMocks()
    mockSession.state = session()
    render({ blockedSchedule: true, driverLoginValidated: true })
    await settle()
    expect(native.start).not.toHaveBeenCalled()
    expect(native.stop).toHaveBeenCalled()
  })

  it('does not stop a running service while the session or the permissions are still being read (a reload of the bundle)', async () => {
    // The session and the permissions start empty and answer a moment later: not logged in yet is not logged out.
    mockSession.state = session({ auth: false, user: null, token: null, loading: true })
    mockLocationStatus = 'unavailable'
    const view = render({}, false)
    await settle()
    expect(native.stop).not.toHaveBeenCalled()
    expect(native.start).not.toHaveBeenCalled()

    // Read: the driver is logged in and the permissions are granted, nothing was stopped, and it starts (a no-op for a running service).
    mockSession.state = session()
    mockLocationStatus = { 'android.permission.ACCESS_FINE_LOCATION': 'granted' }
    view.unmount()
    render()
    await settle()
    expect(native.stop).not.toHaveBeenCalled()
    expect(native.start).toHaveBeenCalledTimes(1)
  })

  it('stops once the session is read and nobody is logged in', async () => {
    mockSession.state = session({ auth: false, user: null, token: null, loading: false })
    render()
    await settle()
    expect(native.stop).toHaveBeenCalled()
  })

  it('configures but does not start without the permissions (the module then knows how to report an owed stop), and waits while the language loads', async () => {
    render({}, false)
    await settle()
    expect(native.configure).toHaveBeenCalledTimes(1)
    expect(native.start).not.toHaveBeenCalled()
    expect(native.stop).toHaveBeenCalledWith('permission')

    jest.clearAllMocks()
    mockLanguage.state = { loading: true }
    render()
    await settle()
    expect(native.configure).not.toHaveBeenCalled()
  })

  it('stops when the run plan flips (the schedule blocks) and starts again when it clears', async () => {
    const view = render({ blockedSchedule: false, driverLoginValidated: true })
    await settle()
    expect(native.start).toHaveBeenCalledTimes(1)
    view.rerender({ blockedSchedule: true, driverLoginValidated: true })
    await settle()
    expect(native.stop).toHaveBeenCalledTimes(1)
    view.rerender({ blockedSchedule: false, driverLoginValidated: true })
    await settle()
    expect(native.start).toHaveBeenCalledTimes(2)
  })

  it('keeps ONE subscription whatever the token does, and configures again with each token', async () => {
    const view = render()
    await settle()
    for (const token of ['token-2', 'token-3', 'token-4']) {
      mockSession.state = session({ token })
      view.rerender({})
      await settle()
    }
    expect(native.onState).toHaveBeenCalledTimes(1)
    expect(subscription.remove).not.toHaveBeenCalled()
    expect(native.configure).toHaveBeenCalledTimes(4)
    expect(native.configure).toHaveBeenLastCalledWith(expect.objectContaining({ headers: { Authorization: 'Bearer token-4' } }))
    // The running sender is not restarted for a new token.
    expect(native.start).toHaveBeenCalledTimes(1)
    view.unmount()
    expect(subscription.remove).toHaveBeenCalledTimes(1)
  })

  it('logs out ONCE on unauthorized, even if the module says it twice', async () => {
    render()
    await settle()
    act(() => stateListener('unauthorized'))
    act(() => stateListener('unauthorized'))
    expect(mockSession.logout).toHaveBeenCalledTimes(1)
  })

  it('logs out again for a new token that is rejected in turn', async () => {
    const view = render()
    await settle()
    act(() => stateListener('unauthorized'))
    mockSession.state = session({ token: 'token-2' })
    view.rerender({})
    await settle()
    act(() => stateListener('unauthorized'))
    expect(mockSession.logout).toHaveBeenCalledTimes(2)
  })

  it('asks for the settings when the location services go off, and closes the dialog when they come back', async () => {
    const view = render()
    await settle()
    native.getState.mockResolvedValue({ ...okState, servicesEnabled: false })
    act(() => stateListener('services_disabled'))
    await settle()
    expect(view.result.current.kind).toBe('services_disabled')

    native.getState.mockResolvedValue(okState)
    act(() => stateListener('services_enabled'))
    await settle()
    expect(view.result.current.kind).toBeNull()
  })

  it('asks for the settings when the permission is lost', async () => {
    const view = render()
    await settle()
    native.getState.mockResolvedValue({ ...okState, authorization: 'denied' })
    act(() => stateListener('authorization_changed'))
    await settle()
    expect(view.result.current.kind).toBe('authorization_changed')
  })

  it('does not ask again for what the driver closed, until the device was fine once', async () => {
    const view = render()
    await settle()
    native.getState.mockResolvedValue({ ...okState, servicesEnabled: false })
    act(() => stateListener('services_disabled'))
    await settle()
    act(() => view.result.current.onClose())
    expect(view.result.current.kind).toBeNull()
    act(() => stateListener('services_disabled'))
    await settle()
    expect(view.result.current.kind).toBeNull()

    native.getState.mockResolvedValue(okState)
    act(() => stateListener('services_enabled'))
    await settle()
    native.getState.mockResolvedValue({ ...okState, servicesEnabled: false })
    act(() => stateListener('services_disabled'))
    await settle()
    expect(view.result.current.kind).toBe('services_disabled')
  })

  it('opens the settings from the dialog and closes it', async () => {
    const view = render()
    await settle()
    native.getState.mockResolvedValue({ ...okState, authorization: 'denied' })
    act(() => stateListener('authorization_changed'))
    await settle()
    act(() => view.result.current.onOpenSettings())
    await settle()
    expect(openSettings).toHaveBeenCalled()
    expect(view.result.current.kind).toBeNull()
  })

  it('says nothing about the device while the driver is off shift', async () => {
    mockSession.state = session({ auth: false })
    const view = render()
    await settle()
    native.getState.mockResolvedValue({ ...okState, servicesEnabled: false })
    act(() => stateListener('services_disabled'))
    await settle()
    expect(view.result.current.kind).toBeNull()
  })

  it('sends what is pending when the app comes back, and starts again if the system refused it', async () => {
    render()
    await settle()
    jest.clearAllMocks()
    native.getState.mockResolvedValue({ ...okState, tracking: false })
    await act(async () => {
      appStateListener('active')
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })
    await settle()
    expect(native.start).toHaveBeenCalledTimes(1)
    expect(native.flush).toHaveBeenCalledTimes(1)

    jest.clearAllMocks()
    native.getState.mockResolvedValue(okState)
    await act(async () => {
      appStateListener('active')
      await Promise.resolve()
      await Promise.resolve()
    })
    await settle()
    expect(native.start).not.toHaveBeenCalled()
    expect(native.flush).toHaveBeenCalledTimes(1)
  })

  it('does not touch the module on a foreground when it must not run', async () => {
    mockSession.state = session({ auth: false })
    render()
    await settle()
    jest.clearAllMocks()
    await act(async () => {
      appStateListener('active')
      await Promise.resolve()
    })
    expect(native.flush).not.toHaveBeenCalled()
    expect(native.start).not.toHaveBeenCalled()
  })

  it('survives a configuration the module rejects', async () => {
    native.configure.mockRejectedValue(new Error('url must be http or https'))
    render()
    await settle()
    expect(native.start).not.toHaveBeenCalled()
  })
})

describe('iOS with the location allowed only while the app is in use', () => {
  const originalOS = Platform.OS
  const whileInUse = { ...okState, enabled: false, tracking: false, authorization: 'when_in_use' }
  beforeEach(() => {
    Platform.OS = 'ios'
    mockLocationStatus = { 'ios.permission.LOCATION_ALWAYS': 'denied' }
    native.getState.mockResolvedValue(whileInUse as any)
  })
  afterEach(() => {
    Platform.OS = originalOS
  })

  it('keeps tracking with "While Using" and tells the driver on shift that the orders are not tracked in the background and that it needs "Always"', async () => {
    const view = render({}, false, true)
    await settle()
    expect(view.result.current.kind).toBe('always_required')
    expect(native.start).toHaveBeenCalledTimes(1)
    expect(native.start).toHaveBeenCalledWith('login')
    expect(native.stop).not.toHaveBeenCalled()
  })

  it('goes from "Always" to "While Using" without stopping: the dialog asks for "Always" and nothing else changes', async () => {
    native.getState.mockResolvedValue(okState)
    const view = render()
    await settle()
    expect(native.start).toHaveBeenCalledTimes(1)
    expect(view.result.current.kind).toBeNull()

    jest.clearAllMocks()
    native.getState.mockResolvedValue(whileInUse as any)
    mockLocationStatus = { 'ios.permission.LOCATION_ALWAYS': 'denied', 'ios.permission.LOCATION_WHEN_IN_USE': 'granted' }
    mockGranted = false
    mockCanTrack = true
    view.rerender({})
    await settle()
    expect(native.stop).not.toHaveBeenCalled()
    expect(native.start).not.toHaveBeenCalled()
    expect(view.result.current.kind).toBe('always_required')
  })

  it('stops with the reason permission only when "While Using" becomes denied or restricted, and starts again with permission', async () => {
    const view = render({}, false, true)
    await settle()
    expect(native.start).toHaveBeenLastCalledWith('login')

    mockCanTrack = false
    view.rerender({})
    await settle()
    expect(native.stop).toHaveBeenLastCalledWith('permission')
    expect(view.result.current.kind).toBeNull()

    mockGranted = true
    mockCanTrack = true
    view.rerender({})
    await settle()
    expect(native.start).toHaveBeenLastCalledWith('permission')
  })

  it('keeps asking for "Always" on each return to the app while tracking runs, but not for what the driver closed', async () => {
    const view = render({}, false, true)
    await settle()
    act(() => view.result.current.onClose())
    await act(async () => { appStateListener('active') })
    await settle()
    expect(view.result.current.kind).toBeNull()
    expect(native.stop).not.toHaveBeenCalled()
  })

  it('says nothing when the location is denied or not answered yet (the permission screens own those)', async () => {
    native.getState.mockResolvedValue({ ...whileInUse, authorization: 'denied' } as any)
    const denied = render({}, false)
    await settle()
    expect(denied.result.current.kind).toBeNull()

    native.getState.mockResolvedValue({ ...whileInUse, authorization: 'not_determined' } as any)
    const unanswered = render({}, false)
    await settle()
    expect(unanswered.result.current.kind).toBeNull()
  })

  it('says nothing off shift, nor before the permissions are read', async () => {
    mockSession.state = session({ auth: false })
    const loggedOut = render({}, false)
    await settle()
    expect(loggedOut.result.current.kind).toBeNull()

    mockSession.state = session()
    mockLocationStatus = 'unavailable'
    const unread = render({}, false)
    await settle()
    expect(unread.result.current.kind).toBeNull()
  })

  it('says nothing on Android, where the foreground permission alone keeps tracking', async () => {
    Platform.OS = 'android'
    native.getState.mockResolvedValue({ ...whileInUse, tracking: true } as any)
    const view = render({}, false, true)
    await settle()
    expect(view.result.current.kind).toBeNull()
    expect(native.stop).not.toHaveBeenCalled()
  })

  it('asks again when the app comes back, but not for what the driver closed', async () => {
    const view = render({}, false, true)
    await settle()
    act(() => view.result.current.onOpenSettings())
    await settle()
    expect(openSettings).toHaveBeenCalled()
    expect(view.result.current.kind).toBeNull()
    await act(async () => { appStateListener('active') })
    await settle()
    expect(view.result.current.kind).toBe('always_required')

    act(() => view.result.current.onClose())
    await act(async () => { appStateListener('active') })
    await settle()
    expect(view.result.current.kind).toBeNull()
  })

  it('closes when the driver logs out', async () => {
    const view = render({}, false, true)
    await settle()
    expect(view.result.current.kind).toBe('always_required')
    mockSession.state = session({ auth: false, token: null, user: null })
    view.rerender({})
    await settle()
    expect(view.result.current.kind).toBeNull()
  })
})

describe('getLocationDialogKind', () => {
  const originalOS = Platform.OS
  afterEach(() => {
    Platform.OS = originalOS
  })

  it('reads the permission first, then the location services', () => {
    Platform.OS = 'android'
    expect(getLocationDialogKind({ authorization: 'always', servicesEnabled: true })).toBeNull()
    expect(getLocationDialogKind({ authorization: 'when_in_use', servicesEnabled: true })).toBeNull()
    expect(getLocationDialogKind({ authorization: 'denied', servicesEnabled: false })).toBe('authorization_changed')
    expect(getLocationDialogKind({ authorization: 'always', servicesEnabled: false })).toBe('services_disabled')
  })

  it('asks for "always" on iOS, by its own name when the driver allowed it only while in use', () => {
    Platform.OS = 'ios'
    expect(getLocationDialogKind({ authorization: 'when_in_use', servicesEnabled: true })).toBe('always_required')
    expect(getLocationDialogKind({ authorization: 'denied', servicesEnabled: true })).toBe('authorization_changed')
    expect(getLocationDialogKind({ authorization: 'always', servicesEnabled: true })).toBeNull()
  })
})

describe('openLocationSettings', () => {
  const originalOS = Platform.OS
  afterEach(() => {
    Platform.OS = originalOS
  })

  it('opens the location switch on Android when the services are off', async () => {
    Platform.OS = 'android'
    const sendIntent = jest.spyOn(Linking, 'sendIntent').mockResolvedValue(undefined)
    await openLocationSettings('services_disabled')
    expect(sendIntent).toHaveBeenCalledWith('android.settings.LOCATION_SOURCE_SETTINGS')
    expect(openSettings).not.toHaveBeenCalled()
  })

  it('opens the app\'s settings otherwise, or when the intent fails', async () => {
    Platform.OS = 'android'
    await openLocationSettings('authorization_changed')
    expect(openSettings).toHaveBeenCalledTimes(1)
    jest.spyOn(Linking, 'sendIntent').mockRejectedValue(new Error('no activity'))
    await openLocationSettings('services_disabled')
    expect(openSettings).toHaveBeenCalledTimes(2)
  })
})
