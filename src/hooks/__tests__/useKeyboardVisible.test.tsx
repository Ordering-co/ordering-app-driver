import { Dimensions, Keyboard, Platform } from 'react-native'
import { act, renderHook } from '@testing-library/react-native'

import { keyboardTakesRoom, useKeyboardFloating, useKeyboardVisible } from '../useKeyboardVisible'

type Listener = (event?: any) => void

/** Runs the hook on a platform with the keyboard's events in hand; the keyboard starts hidden unless told. */
const setup = (platform: 'ios' | 'android', { visible = false, metrics }: { visible?: boolean, metrics?: any } = {}) => {
  const original = Platform.OS
  Object.defineProperty(Platform, 'OS', { configurable: true, get: () => platform })
  const listeners: Record<string, Listener[]> = {}
  const remove = jest.fn()
  const add = jest.spyOn(Keyboard, 'addListener').mockImplementation(((event: string, listener: Listener) => {
    ;(listeners[event] = listeners[event] ?? []).push(listener)
    return { remove }
  }) as any)
  const isVisible = jest.spyOn(Keyboard, 'isVisible').mockReturnValue(visible)
  const read = jest.spyOn(Keyboard, 'metrics').mockReturnValue(metrics)
  const view = renderHook(() => ({ visible: useKeyboardVisible(), floating: useKeyboardFloating() }))
  const emit = (event: string, height?: number, screenY?: number) =>
    act(() => listeners[event].forEach((listener) => listener(height === undefined ? undefined : { endCoordinates: { height, ...(screenY !== undefined && { screenY }) } })))
  return {
    ...view,
    listeners,
    emit,
    remove,
    restore: () => {
      add.mockRestore()
      isVisible.mockRestore()
      read.mockRestore()
      Object.defineProperty(Platform, 'OS', { configurable: true, get: () => original })
    },
  }
}

describe('useKeyboardVisible on Android', () => {
  it('listens to the did-show and did-hide events', () => {
    const keyboard = setup('android')
    expect(Object.keys(keyboard.listeners).sort()).toEqual(['keyboardDidHide', 'keyboardDidShow'])
    keyboard.restore()
  })

  it('is not up for a floating keyboard, which Android reports as shown with a height of 0', () => {
    const keyboard = setup('android')
    keyboard.emit('keyboardDidShow', 0)
    expect(keyboard.result.current.visible).toBe(false)
    keyboard.restore()
  })

  it('is up once the keyboard has a real height, and down when it hides', () => {
    const keyboard = setup('android')
    keyboard.emit('keyboardDidShow', 0)
    keyboard.emit('keyboardDidShow', 312)
    expect(keyboard.result.current.visible).toBe(true)
    keyboard.emit('keyboardDidHide')
    expect(keyboard.result.current.visible).toBe(false)
    keyboard.restore()
  })

  it('goes down again when a docked keyboard is undocked into a floating one', () => {
    const keyboard = setup('android')
    keyboard.emit('keyboardDidShow', 312)
    expect(keyboard.result.current.visible).toBe(true)
    keyboard.emit('keyboardDidShow', 0)
    expect(keyboard.result.current.visible).toBe(false)
    keyboard.restore()
  })

  it('starts up only when the keyboard already showing takes room', () => {
    const docked = setup('android', { visible: true, metrics: { height: 300 } })
    expect(docked.result.current.visible).toBe(true)
    docked.restore()
    const floating = setup('android', { visible: true, metrics: { height: 0 } })
    expect(floating.result.current.visible).toBe(false)
    floating.restore()
    const hidden = setup('android')
    expect(hidden.result.current.visible).toBe(false)
    hidden.restore()
  })

  it('removes every listener on unmount (two hooks, two events each)', () => {
    const keyboard = setup('android')
    keyboard.unmount()
    expect(keyboard.remove).toHaveBeenCalledTimes(4)
    keyboard.restore()
  })
})

describe('a keyboard that takes no room on Android', () => {
  const display = 2400 / 2.625

  beforeEach(() => {
    jest.spyOn(Dimensions, 'get').mockReturnValue({ width: 411, height: display, scale: 2.625, fontScale: 1 })
  })
  afterEach(() => jest.restoreAllMocks())

  it('is floating for an end height of 0, and for a frame that hovers over the content without reaching the display\'s bottom', () => {
    const keyboard = setup('android')
    expect(keyboard.result.current.floating).toBe(false)
    keyboard.emit('keyboardDidShow', 0, display - 24)
    expect(keyboard.result.current).toEqual({ visible: false, floating: true })
    keyboard.emit('keyboardDidShow', 280, 300)
    expect(keyboard.result.current).toEqual({ visible: false, floating: true })
    keyboard.restore()
  })

  it('is docked when its frame ends at the display\'s bottom, or at the navigation area\'s top', () => {
    const keyboard = setup('android')
    keyboard.emit('keyboardDidShow', 300, display - 300)
    expect(keyboard.result.current).toEqual({ visible: true, floating: false })
    keyboard.emit('keyboardDidShow', 300, display - 300 - 24)
    expect(keyboard.result.current).toEqual({ visible: true, floating: false })
    keyboard.restore()
  })

  it('is docked whatever the navigation bar: its frame ends above the bar (24 dp gestures, 48 dp three buttons, 56 dp taskbar), with the rounding the device sends', () => {
    const keyboard = setup('android')
    // The three-button bar is 48 dp whatever the density: the frame ends exactly 48 dp above the display's bottom, and
    // the floats that React Native sends came out a hair under it (866.28569 against 866.28571): it was read as
    // floating, so the pinned bar stayed under the keyboard (suggestion strip off, numbers pad).
    keyboard.emit('keyboardDidShow', 244.1904754638672, 622.09521484375)
    expect(keyboard.result.current).toEqual({ visible: true, floating: false })
    keyboard.emit('keyboardDidShow', 300, display - 300 - 48 - 0.001)
    expect(keyboard.result.current).toEqual({ visible: true, floating: false })
    keyboard.emit('keyboardDidShow', 300, display - 300 - 56)
    expect(keyboard.result.current).toEqual({ visible: true, floating: false })
    // A frame well above the bar is still a floating keyboard hovering over the content.
    keyboard.emit('keyboardDidShow', 300, display - 300 - 100)
    expect(keyboard.result.current).toEqual({ visible: false, floating: true })
    keyboard.restore()
  })

  it('follows a transition floating -> docked -> floating, and is neither when the keyboard hides', () => {
    const keyboard = setup('android')
    keyboard.emit('keyboardDidShow', 0)
    expect(keyboard.result.current).toEqual({ visible: false, floating: true })
    keyboard.emit('keyboardDidShow', 300, display - 300)
    expect(keyboard.result.current).toEqual({ visible: true, floating: false })
    keyboard.emit('keyboardDidShow', 0)
    expect(keyboard.result.current).toEqual({ visible: false, floating: true })
    keyboard.emit('keyboardDidHide')
    expect(keyboard.result.current).toEqual({ visible: false, floating: false })
    keyboard.restore()
  })

  it('starts floating only when the keyboard already showing takes no room', () => {
    const floating = setup('android', { visible: true, metrics: { height: 0, screenY: display } })
    expect(floating.result.current.floating).toBe(true)
    floating.restore()
    const docked = setup('android', { visible: true, metrics: { height: 300, screenY: display - 300 } })
    expect(docked.result.current).toEqual({ visible: true, floating: false })
    docked.restore()
  })

  it('is one rule: keyboardTakesRoom reads the same frames', () => {
    const original = Platform.OS
    Object.defineProperty(Platform, 'OS', { configurable: true, get: () => 'android' })
    expect(keyboardTakesRoom({ height: 0, screenY: display })).toBe(false)
    expect(keyboardTakesRoom({ height: 300, screenY: 100 })).toBe(false)
    expect(keyboardTakesRoom({ height: 300, screenY: display - 300 })).toBe(true)
    // Above the three-button bar (48 dp), to the float's last digit either way.
    expect(keyboardTakesRoom({ height: 244.1904754638672, screenY: 622.09521484375 })).toBe(true)
    expect(keyboardTakesRoom({ height: 288.3809509277344, screenY: 577.90478515625 })).toBe(true)
    expect(keyboardTakesRoom({ height: 300 })).toBe(true)
    Object.defineProperty(Platform, 'OS', { configurable: true, get: () => original })
  })
})

describe('useKeyboardVisible on iOS', () => {
  it('keeps its rule: every will-show event is up, whatever its height, and will-hide is down', () => {
    const keyboard = setup('ios')
    expect(Object.keys(keyboard.listeners).sort()).toEqual(['keyboardWillHide', 'keyboardWillShow'])
    keyboard.emit('keyboardWillShow', 0)
    expect(keyboard.result.current.visible).toBe(true)
    keyboard.emit('keyboardWillHide')
    expect(keyboard.result.current.visible).toBe(false)
    keyboard.emit('keyboardWillShow')
    expect(keyboard.result.current.visible).toBe(true)
    // Never floating on iOS: the avoiding views stay as they are.
    expect(keyboard.result.current.floating).toBe(false)
    keyboard.restore()
  })

  it('starts up when the keyboard is already showing', () => {
    const keyboard = setup('ios', { visible: true })
    expect(keyboard.result.current.visible).toBe(true)
    keyboard.restore()
  })
})
