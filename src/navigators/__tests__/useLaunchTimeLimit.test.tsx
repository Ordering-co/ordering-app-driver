import { act, renderHook } from '@testing-library/react-native'

import { LAUNCH_TIME_LIMIT_MS, useLaunchTimeLimit } from '../useLaunchTimeLimit'

type Props = { loaded: boolean, permissionsLoading: boolean, permissionsPrompting?: boolean, sessionLoading?: boolean, onLimit?: (state: { loaded: boolean }) => void }

describe('useLaunchTimeLimit', () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => jest.useRealTimers())

  const mount = (initialProps: Props) => renderHook((props: Props) => useLaunchTimeLimit(props), { initialProps })
  const advance = (ms: number) => act(() => { jest.advanceTimersByTime(ms) })

  it('is about fifteen seconds', () => {
    expect(LAUNCH_TIME_LIMIT_MS).toBe(15000)
  })

  it('is closed until the launch has loaded and the permissions are read', () => {
    const view = mount({ loaded: false, permissionsLoading: true })
    expect(view.result.current).toBe(false)
    view.rerender({ loaded: true, permissionsLoading: true })
    expect(view.result.current).toBe(false)
    view.rerender({ loaded: true, permissionsLoading: false })
    expect(view.result.current).toBe(true)
  })

  it('opens at the limit, once, and calls onLimit once', () => {
    const onLimit = jest.fn()
    const view = mount({ loaded: false, permissionsLoading: true, sessionLoading: false, onLimit })
    advance(LAUNCH_TIME_LIMIT_MS - 1)
    expect(view.result.current).toBe(false)
    expect(onLimit).not.toHaveBeenCalled()
    advance(1)
    expect(view.result.current).toBe(true)
    advance(LAUNCH_TIME_LIMIT_MS * 2)
    expect(onLimit).toHaveBeenCalledTimes(1)
  })

  it('waits for the session read from the device even at the limit', () => {
    const view = mount({ loaded: false, permissionsLoading: true, sessionLoading: true })
    advance(LAUNCH_TIME_LIMIT_MS)
    expect(view.result.current).toBe(false)
    view.rerender({ loaded: false, permissionsLoading: true, sessionLoading: false })
    expect(view.result.current).toBe(true)
  })

  it('is cancelled for good by a launch that loaded in time', () => {
    const onLimit = jest.fn()
    const view = mount({ loaded: false, permissionsLoading: false, onLimit })
    advance(LAUNCH_TIME_LIMIT_MS - 1000)
    view.rerender({ loaded: true, permissionsLoading: false, onLimit })
    advance(LAUNCH_TIME_LIMIT_MS * 2)
    expect(onLimit).not.toHaveBeenCalled()
    expect(view.result.current).toBe(true)
  })

  it('does not fire while a permission dialog the driver leaves open holds a launch that loaded', () => {
    const onLimit = jest.fn()
    const view = mount({ loaded: true, permissionsLoading: true, permissionsPrompting: true, onLimit })
    advance(LAUNCH_TIME_LIMIT_MS * 3)
    expect(onLimit).not.toHaveBeenCalled()
    expect(view.result.current).toBe(false)
  })

  it('opens a launch that loaded but whose permissions never finished, with no dialog up, at the limit', () => {
    // No stored tutorial flag and the location already granted: nothing ever cleared "permissions loading".
    // The old limit was cancelled by `loaded`, so the loading page stayed for good.
    const onLimit = jest.fn()
    const view = mount({ loaded: true, permissionsLoading: true, permissionsPrompting: false, sessionLoading: false, onLimit })
    advance(LAUNCH_TIME_LIMIT_MS - 1)
    expect(view.result.current).toBe(false)
    advance(1)
    expect(view.result.current).toBe(true)
    // It says the API had answered, so no one blames the network.
    expect(onLimit).toHaveBeenCalledTimes(1)
    expect(onLimit).toHaveBeenCalledWith({ loaded: true })
  })

  it('counts the limit again once the dialog the driver left open is gone and the permissions are still not read', () => {
    const view = mount({ loaded: true, permissionsLoading: true, permissionsPrompting: true })
    advance(LAUNCH_TIME_LIMIT_MS * 2)
    expect(view.result.current).toBe(false)
    view.rerender({ loaded: true, permissionsLoading: true, permissionsPrompting: false })
    advance(LAUNCH_TIME_LIMIT_MS)
    expect(view.result.current).toBe(true)
  })

  it('tells onLimit that the API had not answered when the launch never loaded', () => {
    const onLimit = jest.fn()
    mount({ loaded: false, permissionsLoading: false, sessionLoading: false, onLimit })
    advance(LAUNCH_TIME_LIMIT_MS)
    expect(onLimit).toHaveBeenCalledWith({ loaded: false })
  })

  it('does not restart when the launch un-loads again', () => {
    const onLimit = jest.fn()
    const view = mount({ loaded: true, permissionsLoading: false, onLimit })
    view.rerender({ loaded: false, permissionsLoading: false, onLimit })
    advance(LAUNCH_TIME_LIMIT_MS * 2)
    expect(onLimit).not.toHaveBeenCalled()
  })
})
