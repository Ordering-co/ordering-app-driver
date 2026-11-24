import React, { useContext } from 'react'
import { AppState, Platform, Text } from 'react-native'
import { act, render } from '@testing-library/react-native'

jest.mock('react-native-device-info', () => ({ getSystemVersion: () => '15' }))
jest.mock('react-native-permissions', () => ({
  checkMultiple: jest.fn(),
  requestMultiple: jest.fn(),
  openSettings: jest.fn(),
  PERMISSIONS: {
    IOS: { LOCATION_ALWAYS: 'ios.always', LOCATION_WHEN_IN_USE: 'ios.when_in_use' },
    ANDROID: { ACCESS_FINE_LOCATION: 'android.fine', ACCESS_COARSE_LOCATION: 'android.coarse', ACCESS_BACKGROUND_LOCATION: 'android.background' }
  },
  RESULTS: { GRANTED: 'granted', DENIED: 'denied', BLOCKED: 'blocked' }
}))

import { checkMultiple } from 'react-native-permissions'
import { PermissionsContext, PermissionsProvider } from '../PermissionsContext'

const granted = { 'ios.always': 'granted', 'ios.when_in_use': 'granted' }
const taken = { 'ios.always': 'denied', 'ios.when_in_use': 'denied' }

let renders = 0
let latest: any
const Probe = () => {
  latest = useContext(PermissionsContext)
  renders += 1
  return <Text testID='granted'>{String(latest.isGrantedPermissions)}</Text>
}

/** The listeners the provider put on the app's state, and what removes them. */
let listeners: Array<(state: string) => void> = []
const removed = jest.fn()

const mount = async () => {
  const view = render(<PermissionsProvider><Probe /></PermissionsProvider>)
  await act(async () => {})
  return view
}
const comeBack = async () => { await act(async () => { listeners.forEach((listener) => listener('active')) }) }

describe('PermissionsProvider: a permission lost while the app runs', () => {
  const originalOS = Platform.OS
  beforeEach(() => {
    jest.clearAllMocks()
    renders = 0
    listeners = []
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' })
    jest.spyOn(AppState, 'addEventListener').mockImplementation(((_event: string, listener: any) => {
      listeners.push(listener)
      return { remove: () => { removed(); listeners = listeners.filter((item) => item !== listener) } }
    }) as any)
    ;(checkMultiple as jest.Mock).mockResolvedValue(granted)
  })
  afterEach(() => {
    jest.restoreAllMocks()
    Object.defineProperty(Platform, 'OS', { configurable: true, value: originalOS })
  })

  it('is granted once the system says so, and not before it has answered', async () => {
    const view = render(<PermissionsProvider><Probe /></PermissionsProvider>)
    expect(view.getByTestId('granted')).toHaveTextContent('false')
    await act(async () => {})
    expect(view.getByTestId('granted')).toHaveTextContent('true')
  })

  it('is not granted as soon as the app comes back to the foreground and the system no longer grants it, and granted again when it does', async () => {
    const view = await mount()
    expect(view.getByTestId('granted')).toHaveTextContent('true')
    ;(checkMultiple as jest.Mock).mockResolvedValue(taken)
    await comeBack()
    expect(view.getByTestId('granted')).toHaveTextContent('false')
    expect(latest.permissions.locationStatus).toEqual(taken)
    ;(checkMultiple as jest.Mock).mockResolvedValue(granted)
    await comeBack()
    expect(view.getByTestId('granted')).toHaveTextContent('true')
  })

  it('is not granted when only one of the permissions is lost', async () => {
    const view = await mount()
    ;(checkMultiple as jest.Mock).mockResolvedValue({ ...granted, 'ios.always': 'blocked' })
    await comeBack()
    expect(view.getByTestId('granted')).toHaveTextContent('false')
  })

  it('"While Using" is not fully granted (the dialog asks for "Always") but the app can still track', async () => {
    const view = await mount()
    expect(latest.canTrackLocation).toBe(true)
    ;(checkMultiple as jest.Mock).mockResolvedValue({ 'ios.always': 'denied', 'ios.when_in_use': 'granted' })
    await comeBack()
    expect(view.getByTestId('granted')).toHaveTextContent('false')
    expect(latest.canTrackLocation).toBe(true)
    ;(checkMultiple as jest.Mock).mockResolvedValue({ 'ios.always': 'blocked', 'ios.when_in_use': 'blocked' })
    await comeBack()
    expect(latest.canTrackLocation).toBe(false)
  })

  it('checks again when a screen asks (the Map tab does it every time it opens)', async () => {
    const view = await mount()
    ;(checkMultiple as jest.Mock).mockResolvedValue(taken)
    await act(async () => { await latest.checkLocationPermission() })
    expect(view.getByTestId('granted')).toHaveTextContent('false')
  })

  it('ignores a state of the app that is not "active" (going to the background asks nothing)', async () => {
    await mount()
    ;(checkMultiple as jest.Mock).mockClear()
    await act(async () => { listeners.forEach((listener) => listener('background')) })
    expect(checkMultiple).not.toHaveBeenCalled()
  })

  it('keeps the last answer when the system fails to answer, and does not throw', async () => {
    const view = await mount()
    ;(checkMultiple as jest.Mock).mockRejectedValue(new Error('no answer'))
    await comeBack()
    expect(view.getByTestId('granted')).toHaveTextContent('true')
  })

  it('does not render again for an answer equal to the one it holds, and gives screens functions that stay the same', async () => {
    await mount()
    const check = latest.checkLocationPermission
    const before = renders
    await comeBack()
    await comeBack()
    expect(renders).toBe(before)
    expect(latest.checkLocationPermission).toBe(check)
  })

  it('stops listening to the app\'s state when it unmounts', async () => {
    const view = await mount()
    expect(listeners).toHaveLength(1)
    view.unmount()
    expect(removed).toHaveBeenCalledTimes(1)
    expect(listeners).toHaveLength(0)
  })
})
