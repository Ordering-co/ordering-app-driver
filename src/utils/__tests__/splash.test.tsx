import React from 'react'
import { Text } from 'react-native'
import { act, fireEvent, render, renderHook } from '@testing-library/react-native'
import BootSplash from 'react-native-bootsplash'

import { hideSplash, SPLASH_PAINT_FALLBACK_MS, SplashLogoContext, useSplashHide, useSplashLogo } from '../splash'

const hide = BootSplash.hide as jest.Mock

// A frame is what `requestAnimationFrame` waits for: here, the next timer (the one scheduled by the frame before runs on the next call).
const frame = () => act(() => { jest.advanceTimersToNextTimer() })

describe('hideSplash', () => {
  beforeEach(() => hide.mockClear())

  it('hides the native splash with a fade, and twice is harmless', () => {
    hideSplash()
    hideSplash()

    expect(hide).toHaveBeenCalledTimes(2)
    expect(hide).toHaveBeenCalledWith({ fade: true })
  })

  it('does not fail when the native side refuses', () => {
    hide.mockRejectedValueOnce(new Error('no activity'))

    expect(() => hideSplash()).not.toThrow()
  })
})

describe('useSplashHide', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    hide.mockClear()
  })
  afterEach(() => {
    jest.useRealTimers()
  })

  // The loading page mounts (it is the first screen) and registers itself.
  const mountLoadingPage = (result: { current: ReturnType<typeof useSplashHide> }) => {
    let unregister = () => {}
    act(() => { unregister = result.current.logoSignal.register() })
    return unregister
  }

  it('does not hide the splash before the first screen is laid out, however long the theme took', () => {
    const { result } = renderHook(() => useSplashHide(true))

    expect(typeof result.current.onContainerReady).toBe('function')
    // the theme is read (mayHide) and the app has rendered, but no screen has been laid out yet
    act(() => { jest.advanceTimersByTime(SPLASH_PAINT_FALLBACK_MS - 1) })
    expect(hide).not.toHaveBeenCalled()
  })

  describe('a first screen that is not the loading page', () => {
    it('hides it once, two frames after the navigation container is ready', () => {
      const { result } = renderHook(() => useSplashHide(true))

      act(() => result.current.onContainerReady())
      expect(hide).not.toHaveBeenCalled()
      frame()
      expect(hide).not.toHaveBeenCalled()
      frame()
      expect(hide).toHaveBeenCalledTimes(1)
      expect(hide).toHaveBeenCalledWith({ fade: true })
      // the fallback is cancelled: nothing more, however long it waits
      act(() => { jest.advanceTimersByTime(SPLASH_PAINT_FALLBACK_MS * 2) })
      expect(hide).toHaveBeenCalledTimes(1)
    })

    it('waits for the cached theme (and the project list): ready but not allowed does not hide', () => {
      const { result, rerender } = renderHook(({ mayHide }: { mayHide: boolean }) => useSplashHide(mayHide), {
        initialProps: { mayHide: false }
      })

      act(() => result.current.onContainerReady())
      frame()
      frame()
      act(() => { jest.advanceTimersByTime(SPLASH_PAINT_FALLBACK_MS * 2) })
      expect(hide).not.toHaveBeenCalled()

      rerender({ mayHide: true })
      expect(hide).toHaveBeenCalledTimes(1)
    })
  })

  describe('a first screen that is the loading page (its logo is an image that arrives later)', () => {
    it('does not hide before the logo reports, however long after the container is ready', () => {
      const { result } = renderHook(() => useSplashHide(true))

      mountLoadingPage(result)
      act(() => result.current.onContainerReady())
      frame()
      frame()
      act(() => { jest.advanceTimersByTime(SPLASH_PAINT_FALLBACK_MS - 1) })
      expect(hide).not.toHaveBeenCalled()
    })

    it('hides once, when the logo has loaded after the container is ready', () => {
      const { result } = renderHook(() => useSplashHide(true))

      mountLoadingPage(result)
      act(() => result.current.onContainerReady())
      frame()
      frame()
      expect(hide).not.toHaveBeenCalled()

      act(() => result.current.logoSignal.settled())
      expect(hide).toHaveBeenCalledTimes(1)
      expect(hide).toHaveBeenCalledWith({ fade: true })
      act(() => { jest.advanceTimersByTime(SPLASH_PAINT_FALLBACK_MS * 2) })
      expect(hide).toHaveBeenCalledTimes(1)
    })

    it('hides once, when the container becomes ready after the logo has loaded', () => {
      const { result } = renderHook(() => useSplashHide(true))

      mountLoadingPage(result)
      act(() => result.current.logoSignal.settled())
      expect(hide).not.toHaveBeenCalled()

      act(() => result.current.onContainerReady())
      frame()
      expect(hide).not.toHaveBeenCalled()
      frame()
      expect(hide).toHaveBeenCalledTimes(1)
    })

    it('does not hide before the cached theme is read, even with the logo loaded', () => {
      const { result, rerender } = renderHook(({ mayHide }: { mayHide: boolean }) => useSplashHide(mayHide), {
        initialProps: { mayHide: false }
      })

      mountLoadingPage(result)
      act(() => result.current.onContainerReady())
      frame()
      frame()
      act(() => result.current.logoSignal.settled())
      expect(hide).not.toHaveBeenCalled()

      rerender({ mayHide: true })
      expect(hide).toHaveBeenCalledTimes(1)
    })

    it('lets the splash go after the fallback when the logo never reports (an image that never answers)', () => {
      const { result } = renderHook(() => useSplashHide(true))

      mountLoadingPage(result)
      act(() => result.current.onContainerReady())
      frame()
      frame()
      act(() => { jest.advanceTimersByTime(SPLASH_PAINT_FALLBACK_MS - 1) })
      expect(hide).not.toHaveBeenCalled()
      act(() => { jest.advanceTimersByTime(1) })
      expect(hide).toHaveBeenCalledTimes(1)
    })

    it('goes on the container path when the loading page unmounts before its logo reports', () => {
      const { result } = renderHook(() => useSplashHide(true))

      const unregister = mountLoadingPage(result)
      act(() => result.current.onContainerReady())
      frame()
      frame()
      expect(hide).not.toHaveBeenCalled()

      act(() => unregister())
      expect(hide).toHaveBeenCalledTimes(1)
    })
  })

  it('is the safety net: a tree that never reports ready is let go after the fallback', () => {
    renderHook(() => useSplashHide(true))

    act(() => { jest.advanceTimersByTime(SPLASH_PAINT_FALLBACK_MS - 1) })
    expect(hide).not.toHaveBeenCalled()
    act(() => { jest.advanceTimersByTime(1) })
    expect(hide).toHaveBeenCalledTimes(1)
  })

  it('does not arm the fallback before the theme is read', () => {
    renderHook(() => useSplashHide(false))

    act(() => { jest.advanceTimersByTime(SPLASH_PAINT_FALLBACK_MS * 2) })
    expect(hide).not.toHaveBeenCalled()
  })

  it('a restart (a new mount) shows the splash again and hides it again, once per launch', () => {
    const first = renderHook(() => useSplashHide(true))
    mountLoadingPage(first.result)
    act(() => first.result.current.onContainerReady())
    frame()
    frame()
    act(() => first.result.current.logoSignal.settled())
    expect(hide).toHaveBeenCalledTimes(1)
    first.unmount()

    const second = renderHook(() => useSplashHide(true))
    mountLoadingPage(second.result)
    act(() => second.result.current.onContainerReady())
    frame()
    frame()
    // the new launch waits for its own logo again
    expect(hide).toHaveBeenCalledTimes(1)
    act(() => second.result.current.logoSignal.settled())
    expect(hide).toHaveBeenCalledTimes(2)
  })

  it('does not hide after the app was unmounted before its first frame', () => {
    const { result, unmount } = renderHook(() => useSplashHide(false))

    act(() => result.current.onContainerReady())
    unmount()
    frame()
    frame()
    act(() => { jest.advanceTimersByTime(SPLASH_PAINT_FALLBACK_MS * 2) })
    expect(hide).not.toHaveBeenCalled()
  })
})

describe('useSplashLogo', () => {
  const Probe = () => {
    const { onLoad, onError } = useSplashLogo()
    return <Text testID="probe" onPress={onLoad} onLongPress={onError}>logo</Text>
  }

  it('registers the loading page on mount, unregisters on unmount, and reports a load or an error as settled', () => {
    const unregister = jest.fn()
    const signal = { register: jest.fn(() => unregister), settled: jest.fn() }
    const { getByTestId, unmount } = render(
      <SplashLogoContext.Provider value={signal}><Probe /></SplashLogoContext.Provider>
    )

    expect(signal.register).toHaveBeenCalledTimes(1)
    fireEvent.press(getByTestId('probe'))
    fireEvent(getByTestId('probe'), 'longPress')
    expect(signal.settled).toHaveBeenCalledTimes(2)
    unmount()
    expect(unregister).toHaveBeenCalledTimes(1)
  })

  it('does nothing without a provider (the loading page alone, in a test or a story)', () => {
    const { getByTestId } = render(<Probe />)

    expect(() => fireEvent.press(getByTestId('probe'))).not.toThrow()
  })
})
