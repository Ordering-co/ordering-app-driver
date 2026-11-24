import React from 'react'
import { Dimensions, Keyboard, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native'
import { act, render, within } from '@testing-library/react-native'

import { KeyboardScreen } from '../KeyboardScreen'
import { layoutWindowOf, onAndroid } from '../../../../../../jest/helpers/androidWindow'

const fs = require('fs')
const path = require('path')

describe('KeyboardScreen', () => {
  let android: ReturnType<typeof onAndroid> | undefined
  const originalOS = Platform.OS
  afterEach(() => {
    android?.restore()
    android = undefined
    Object.defineProperty(Platform, 'OS', { configurable: true, get: () => originalOS })
  })

  const screen = () => (
    <KeyboardScreen behavior='padding' style={{ flex: 1 }} testID='avoiding' windowTestID='window'>
      <Text>field</Text>
    </KeyboardScreen>
  )

  describe('on Android', () => {
    it('gives the avoiding view the distance of its screen from the window\'s top (the activity pads the screens by the system bars)', async () => {
      android = onAndroid(63)
      const page = render(screen())
      const avoiding = page.UNSAFE_getByType(KeyboardAvoidingView)
      await layoutWindowOf(avoiding)
      expect(page.UNSAFE_getByType(KeyboardAvoidingView).props.keyboardVerticalOffset).toBe(63)
      expect(android.measureInWindow).toHaveBeenCalled()
    })

    it('measures the view that wraps the avoiding view, which fills the screen: the avoiding view\'s own frame.y is 0 inside it', async () => {
      android = onAndroid(63)
      const page = render(screen())
      const window: any = page.getByTestId('window')
      expect(StyleSheet.flatten(window.props.style).flex).toBe(1)
      expect(within(window).getByTestId('avoiding')).toBeTruthy()
      expect(page.UNSAFE_getAllByType(KeyboardAvoidingView)).toHaveLength(1)
      expect(page.getByText('field')).toBeTruthy()
    })

    it('is 0 for a screen at the window\'s top (a modal is a window of its own that starts at the screen\'s top)', async () => {
      android = onAndroid(0)
      const page = render(screen())
      await layoutWindowOf(page.UNSAFE_getByType(KeyboardAvoidingView))
      expect(page.UNSAFE_getByType(KeyboardAvoidingView).props.keyboardVerticalOffset).toBe(0)
    })

    it('rounds what the system measures and never gives a negative distance', async () => {
      android = onAndroid(62.6)
      const page = render(screen())
      await layoutWindowOf(page.UNSAFE_getByType(KeyboardAvoidingView))
      expect(page.UNSAFE_getByType(KeyboardAvoidingView).props.keyboardVerticalOffset).toBe(63)
      android.restore()
      android = onAndroid(-4)
      const other = render(screen())
      await layoutWindowOf(other.UNSAFE_getByType(KeyboardAvoidingView))
      expect(other.UNSAFE_getByType(KeyboardAvoidingView).props.keyboardVerticalOffset).toBe(0)
    })

    it('hands everything else to the avoiding view as it was (behavior, style, enabled)', () => {
      android = onAndroid(63)
      const page = render(
        <KeyboardScreen enabled behavior='height' style={{ flex: 1, backgroundColor: 'x' }}><View /></KeyboardScreen>
      )
      const avoiding = page.UNSAFE_getByType(KeyboardAvoidingView)
      expect(avoiding.props.enabled).toBe(true)
      expect(avoiding.props.behavior).toBe('height')
      expect(StyleSheet.flatten(avoiding.props.style).backgroundColor).toBe('x')
    })
  })

  describe('with a keyboard that takes no room (Android\'s floating Gboard)', () => {
    const display = 2400 / 2.625
    const listeners: Record<string, Array<(event?: any) => void>> = {}
    const emit = (event: string, height?: number, screenY?: number) =>
      act(() => (listeners[event] ?? []).forEach((listener) => listener(height === undefined ? undefined : { endCoordinates: { height, screenY } })))

    beforeEach(() => {
      Object.keys(listeners).forEach((key) => delete listeners[key])
      jest.spyOn(Keyboard, 'addListener').mockImplementation(((event: string, listener: any) => {
        ;(listeners[event] = listeners[event] ?? []).push(listener)
        return { remove: jest.fn() }
      }) as any)
      jest.spyOn(Keyboard, 'isVisible').mockReturnValue(false)
      jest.spyOn(Dimensions, 'get').mockReturnValue({ width: 411, height: display, scale: 2.625, fontScale: 1 })
    })
    afterEach(() => jest.restoreAllMocks())

    const avoidingOf = (page: ReturnType<typeof render>) => page.UNSAFE_getByType(KeyboardAvoidingView)

    it('lifts nothing: the avoiding view is off while a keyboard of height 0 or a frame that does not reach the bottom is up', () => {
      android = onAndroid(63)
      const page = render(screen())
      expect(avoidingOf(page).props.enabled).toBe(true)
      emit('keyboardDidShow', 0, display - 24)
      expect(avoidingOf(page).props.enabled).toBe(false)
      emit('keyboardDidShow', 280, 300)
      expect(avoidingOf(page).props.enabled).toBe(false)
    })

    it('behaves as it always has with a docked keyboard (on) and with none', () => {
      android = onAndroid(63)
      const page = render(screen())
      emit('keyboardDidShow', 300, display - 300)
      expect(avoidingOf(page).props.enabled).toBe(true)
      emit('keyboardDidHide')
      expect(avoidingOf(page).props.enabled).toBe(true)
    })

    it('keeps the avoiding view on for a docked keyboard above the three-button bar, with the suggestion strip off or on (the frame ends 48 dp above the display\'s bottom, to the float)', () => {
      android = onAndroid(63)
      const page = render(screen())
      // Frames of the emulator with three-button navigation (420 dpi): the numbers pad / no strip, and with the strip.
      emit('keyboardDidShow', 244.1904754638672, 622.09521484375)
      expect(avoidingOf(page).props.enabled).toBe(true)
      emit('keyboardDidShow', 288.3809509277344, 577.90478515625)
      expect(avoidingOf(page).props.enabled).toBe(true)
      // And the floating Gboard, which reports no height, is still off.
      emit('keyboardDidShow', 0, display)
      expect(avoidingOf(page).props.enabled).toBe(false)
    })

    it('follows a transition floating -> docked -> floating', () => {
      android = onAndroid(63)
      const page = render(screen())
      emit('keyboardDidShow', 0, display)
      expect(avoidingOf(page).props.enabled).toBe(false)
      emit('keyboardDidShow', 300, display - 300)
      expect(avoidingOf(page).props.enabled).toBe(true)
      emit('keyboardDidShow', 0, display)
      expect(avoidingOf(page).props.enabled).toBe(false)
      emit('keyboardDidHide')
      expect(avoidingOf(page).props.enabled).toBe(true)
    })

    it('stays off for a caller that turned it off, whatever the keyboard does', () => {
      android = onAndroid(63)
      const page = render(<KeyboardScreen enabled={false} behavior='padding'><View /></KeyboardScreen>)
      emit('keyboardDidShow', 300, display - 300)
      expect(avoidingOf(page).props.enabled).toBe(false)
    })

    it('on iOS every keyboard counts: the view is always on', () => {
      Object.defineProperty(Platform, 'OS', { configurable: true, get: () => 'ios' })
      const page = render(screen())
      emit('keyboardWillShow', 0, display)
      expect(avoidingOf(page).props.enabled).toBe(true)
    })
  })

  describe('on iOS', () => {
    it('is the avoiding view and nothing more: no wrapper (it would hide the safe area above it from its frame.y), no measure, offset 0', () => {
      const measureInWindow = jest.fn()
      ;(View as any).prototype.measureInWindow = measureInWindow
      const page = render(screen())
      const avoiding = page.UNSAFE_getByType(KeyboardAvoidingView)
      expect(avoiding.props.keyboardVerticalOffset).toBe(0)
      expect(avoiding.props.behavior).toBe('padding')
      expect(page.queryByTestId('window')).toBeNull()
      expect(measureInWindow).not.toHaveBeenCalled()
      delete (View as any).prototype.measureInWindow
    })
  })
})

describe('the keyboard-avoiding views of the app', () => {
  // One rule for every screen: a new screen gets the window's distance by using `KeyboardScreen`. The two
  // that may stay raw `KeyboardAvoidingView` are inside a `Modal`, a window of its own that starts at the screen's top.
  const MODAL_WINDOWS = ['shared/OBottomPopup.tsx', 'shared/OModal.tsx']
  const SRC = path.join(__dirname, '../../../../..')

  const sources = (dir: string): string[] => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry: any) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return ['__tests__', '@', 'node_modules'].includes(entry.name) ? [] : sources(full)
    return /\.(tsx?|jsx?)$/.test(entry.name) ? [full] : []
  })

  it('no screen draws a raw KeyboardAvoidingView', () => {
    const offenders = sources(SRC)
      .filter((file) => !file.endsWith('shared/KeyboardScreen.tsx') && !MODAL_WINDOWS.some((ok) => file.endsWith(ok)))
      .filter((file) => /<KeyboardAvoidingView/.test(fs.readFileSync(file, 'utf8')))
      .map((file) => path.relative(SRC, file))
    expect(offenders).toEqual([])
  })

  it('the exceptions are still inside a Modal', () => {
    for (const file of MODAL_WINDOWS) {
      const source = fs.readFileSync(path.join(SRC, 'ui/src/components', file), 'utf8')
      expect(source).toMatch(/<Modal\b/)
    }
  })
})
