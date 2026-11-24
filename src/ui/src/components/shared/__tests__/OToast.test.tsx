import React from 'react'
import { act, render } from '@testing-library/react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { ThemeProvider } from 'styled-components/native'
import { ToastType, useToast } from '@components'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
const { iconSource, setupSharedComponentHooks } = require('../../../../../../jest/helpers/driverSharedTestSetup')
import { Toast } from '../OToast'
import { BottomBarProvider, useReportBottomBar } from '../../../../../context/BottomBarContext'
import { defaultAppTheme } from '../../../../../theme/engine'
import { Animated, Keyboard, Platform, StyleSheet } from 'react-native'

setupSharedComponentHooks()

describe('OToast', () => {
  it('renders success toast and hides after duration', () => {
    jest.useFakeTimers()
    const hideToast = jest.fn()
    ;(useToast as jest.Mock).mockReturnValue([
      { type: ToastType.Success, message: 'Saved', duration: 300 },
      { hideToast }
    ])

    const { getByText } = renderWithProviders(<Toast />)
    expect(getByText('Saved')).toBeTruthy()

    act(() => {
      jest.advanceTimersByTime(600)
    })

    expect(hideToast).toHaveBeenCalled()
  })

  describe('what hides it', () => {
    // The test renderer finishes a native-driven animation on the spot: these are animations a test can leave running.
    type Run = { toValue: number, done?: (result: { finished: boolean }) => void, finish: () => void, stopped: boolean }
    let runs: Run[]
    beforeEach(() => {
      jest.useFakeTimers()
      runs = []
      jest.spyOn(Animated, 'timing').mockImplementation(((_value: any, config: any) => {
        const run: Run = {
          toValue: config.toValue,
          stopped: false,
          finish: () => { const done = run.done; run.done = undefined; done?.({ finished: true }) }
        }
        runs.push(run)
        return {
          start: (done?: (result: { finished: boolean }) => void) => { run.done = done },
          stop: () => { run.stopped = true; const done = run.done; run.done = undefined; done?.({ finished: false }) },
          reset: () => {}
        }
      }) as any)
    })
    afterEach(() => {
      jest.restoreAllMocks()
      jest.useRealTimers()
    })
    const fadeOuts = () => runs.filter((run) => run.toValue === 0)

    it('hides the toast when its fade-out runs to the end', () => {
      const hideToast = jest.fn()
      ;(useToast as jest.Mock).mockReturnValue([{ type: ToastType.Info, message: 'Hold to confirm', duration: 1000 }, { hideToast }])
      renderWithProviders(<Toast />)
      act(() => { jest.advanceTimersByTime(1000) })
      expect(hideToast).not.toHaveBeenCalled()
      act(() => fadeOuts()[0].finish())
      expect(hideToast).toHaveBeenCalledTimes(1)
    })

    it('a toast that starts while the previous one fades out is not hidden by the fade it interrupted', () => {
      const hideToast = jest.fn()
      ;(useToast as jest.Mock).mockReturnValue([{ type: ToastType.Info, message: 'Hold to confirm', duration: 1000 }, { hideToast }])
      const screen = renderWithProviders(<Toast />)
      // The hint's time is up: its fade-out is running, not finished.
      act(() => { jest.advanceTimersByTime(1000) })
      expect(fadeOuts()).toHaveLength(1)
      // The error arrives now: its fade-in takes the opacity over and interrupts the fade-out.
      ;(useToast as jest.Mock).mockReturnValue([{ type: ToastType.Error, message: ['Order not available'], duration: 3000 }, { hideToast }])
      screen.rerender(<Toast />)
      expect(fadeOuts()[0].stopped).toBe(true)
      expect(hideToast).not.toHaveBeenCalled()
      expect(screen.getByText('Order not available')).toBeTruthy()
      // Its own time and fade hide it, once.
      act(() => { jest.advanceTimersByTime(3000) })
      act(() => fadeOuts()[1].finish())
      expect(hideToast).toHaveBeenCalledTimes(1)
    })

    it('keeps its own time when the provider hands a new hideToast (an unrelated re-render of the provider)', () => {
      const config = { type: ToastType.Success, message: 'Saved', duration: 1000 }
      const first = jest.fn()
      const second = jest.fn()
      ;(useToast as jest.Mock).mockReturnValue([config, { hideToast: first }])
      // The theme is the same object between renders, as in the app (the test wrapper builds a new one each time).
      const theme = defaultAppTheme()
      const Wrapper = ({ children }: any) => <SafeAreaProvider><ThemeProvider theme={theme}>{children}</ThemeProvider></SafeAreaProvider>
      const screen = render(<Toast />, { wrapper: Wrapper })
      act(() => { jest.advanceTimersByTime(800) })
      ;(useToast as jest.Mock).mockReturnValue([config, { hideToast: second }])
      screen.rerender(<Toast />)
      // Not restarted: the fade starts 1000 ms after the toast came, not 800 + 1000.
      expect(runs.filter((run) => run.toValue === 1)).toHaveLength(1)
      act(() => { jest.advanceTimersByTime(200) })
      expect(fadeOuts()).toHaveLength(1)
      act(() => fadeOuts()[0].finish())
      expect(first).not.toHaveBeenCalled()
      expect(second).toHaveBeenCalledTimes(1)
    })

    it('hides nothing when it leaves in the middle of its fade', () => {
      const hideToast = jest.fn()
      ;(useToast as jest.Mock).mockReturnValue([{ type: ToastType.Success, message: 'Saved', duration: 1000 }, { hideToast }])
      const screen = renderWithProviders(<Toast />)
      act(() => { jest.advanceTimersByTime(1000) })
      screen.unmount()
      expect(fadeOuts()[0].stopped).toBe(true)
      expect(hideToast).not.toHaveBeenCalled()
    })
  })

  it('returns null without toast config', () => {
    ;(useToast as jest.Mock).mockReturnValue([null, { hideToast: jest.fn() }])
    const { toJSON } = renderWithProviders(<Toast />)
    expect(toJSON()).toBeNull()
  })

  describe('a toast never shows without a message', () => {
    const show = (type: string, message: any) => {
      ;(useToast as jest.Mock).mockReturnValue([{ type, message, duration: 3000 }, { hideToast: jest.fn() }])
      return renderWithProviders(<Toast />)
    }

    it('words an error the API sent as a list, as { message } or as a code (an assign request that fails)', () => {
      expect(show(ToastType.Error, ['Order not available']).getByText('Order not available')).toBeTruthy()
      expect(show(ToastType.Error, [{ message: 'Too late' }]).getByText('Too late')).toBeTruthy()
      expect(show(ToastType.Error, 'ERROR_INVALID_COUPON').getByText("The coupon doesn't exist")).toBeTruthy()
    })

    it('says the generic failure when an error has no message, never an empty box, "undefined" or a raw array', () => {
      for (const message of [undefined, null, '', [], [''], {}, 'undefined', ['null'], false]) {
        const screen = show(ToastType.Error, message)
        expect(screen.getByText('Network Error')).toBeTruthy()
        expect(screen.queryByText('undefined')).toBeNull()
      }
    })

    it('draws nothing for an info or success toast with no message', () => {
      for (const type of [ToastType.Info, ToastType.Success]) {
        for (const message of [undefined, null, '', [], {}]) {
          expect(show(type, message).toJSON()).toBeNull()
        }
      }
    })

    it('decodes the HTML entities of an API message', () => {
      expect(show(ToastType.Error, ['Correo o contrase&ntilde;a incorrectos.']).getByText('Correo o contraseña incorrectos.')).toBeTruthy()
    })
  })

  describe('its place over the bars of the bottom (decision H8)', () => {
    const theme: any = defaultAppTheme()
    const offset = theme.native.components.toast.base.offset
    const Bar = ({ height }: { height: number }) => {
      useReportBottomBar('bar', height)
      return null
    }
    /** The toast's own `bottom`: the first ancestor of its text that places it. */
    const bottomOf = (screen: any) => {
      for (let up = screen.getByText('Saved').parent; up; up = up.parent) {
        const bottom = StyleSheet.flatten(up.props?.style)?.bottom
        if (bottom !== undefined) return bottom
      }
      return undefined
    }
    beforeEach(() => {
      ;(useToast as jest.Mock).mockReturnValue([{ type: ToastType.Success, message: 'Saved', duration: 3000 }, { hideToast: jest.fn() }])
    })

    it('keeps its place over the bottom inset when no bar is on screen', () => {
      // The tests' safe area has no inset: the toast is its offset from the bottom.
      const screen = renderWithProviders(<Toast />)
      expect(bottomOf(screen)).toBe(offset)
    })

    it('is drawn above the bar on screen, the bar\'s own inset included (the tab bar, a bottom action bar)', () => {
      const screen = renderWithProviders(<BottomBarProvider><Bar height={94} /><Toast /></BottomBarProvider>)
      expect(bottomOf(screen)).toBe(94 + offset)
    })

    it('comes back down when the bar leaves', () => {
      const screen = renderWithProviders(<BottomBarProvider><Bar height={94} /><Toast /></BottomBarProvider>)
      screen.rerender(<BottomBarProvider><Toast /></BottomBarProvider>)
      expect(bottomOf(screen)).toBe(offset)
    })
  })
  describe('its place between the gutters and over the keyboard', () => {
    const theme: any = defaultAppTheme()
    const toast = theme.native.components.toast.base
    const gutter = theme.native.tokens.layout.page_gutter
    let replaced: { restore: () => void } | undefined
    let listeners: Record<string, (event?: any) => void>
    const Bar = ({ height }: { height: number }) => {
      useReportBottomBar('bar', height)
      return null
    }
    /** The first ancestor of the toast's text that carries the style prop `key`. */
    const nodeWith = (screen: any, key: string) => {
      for (let up = screen.getByText('Saved').parent; up; up = up.parent) {
        if (StyleSheet.flatten(up.props?.style)?.[key] !== undefined) return up
      }
      return undefined
    }
    const bottomOf = (screen: any) => StyleSheet.flatten(nodeWith(screen, 'bottom').props.style).bottom
    const keyboard = (event: string, height?: number) => act(() => {
      listeners[event]({ endCoordinates: { height } })
    })

    beforeEach(() => {
      listeners = {}
      jest.spyOn(Keyboard, 'addListener').mockImplementation(((event: string, listener: any) => {
        listeners[event] = listener
        return { remove: jest.fn() }
      }) as any)
      ;(useToast as jest.Mock).mockReturnValue([{ type: ToastType.Success, message: 'Saved', duration: 3000 }, { hideToast: jest.fn() }])
    })

    afterEach(() => {
      replaced?.restore()
      replaced = undefined
    })

    it('sits between the page gutters, takes no touch, and its box keeps the theme\'s max width', () => {
      const screen = renderWithProviders(<Toast />)
      const container = nodeWith(screen, 'left')
      const style = StyleSheet.flatten(container.props.style)
      expect(style.left).toBe(gutter)
      expect(style.right).toBe(gutter)
      expect(style.position).toBe('absolute')
      expect(container.props.pointerEvents).toBe('none')
      expect(StyleSheet.flatten(nodeWith(screen, 'maxWidth').props.style).maxWidth).toBe(toast.max_width)
    })

    describe('on iOS', () => {
      beforeEach(() => {
        replaced = jest.replaceProperty(Platform, 'OS', 'ios')
      })

      it('rides above the keyboard when it is taller than the bottom inset, and comes back when it hides', () => {
        const screen = renderWithProviders(<Toast />)
        expect(bottomOf(screen)).toBe(toast.offset)
        keyboard('keyboardWillShow', 300)
        expect(bottomOf(screen)).toBe(300 + toast.offset)
        keyboard('keyboardWillHide')
        expect(bottomOf(screen)).toBe(toast.offset)
      })

      it('stays over the bar when the keyboard is not taller than it', () => {
        const screen = renderWithProviders(<BottomBarProvider><Bar height={94} /><Toast /></BottomBarProvider>)
        keyboard('keyboardWillShow', 50)
        expect(bottomOf(screen)).toBe(94 + toast.offset)
        keyboard('keyboardWillShow', 300)
        expect(bottomOf(screen)).toBe(300 + toast.offset)
      })
    })

    it('does not follow the keyboard on Android', () => {
      replaced = jest.replaceProperty(Platform, 'OS', 'android')
      const screen = renderWithProviders(<Toast />)
      expect(listeners.keyboardWillShow).toBeUndefined()
      expect(listeners.keyboardWillHide).toBeUndefined()
      expect(bottomOf(screen)).toBe(toast.offset)
    })
  })
})
