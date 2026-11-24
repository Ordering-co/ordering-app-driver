import React from 'react'
import { Text } from 'react-native'
import { fireEvent } from '@testing-library/react-native'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
const { setupSharedComponentHooks } = require('../../../../../../jest/helpers/driverSharedTestSetup')
import OBottomPopup from '../OBottomPopup'
import { closeButtonInset } from '../styles'

const mockInsets = { top: 0, right: 0, bottom: 0, left: 0 }

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: any) => children,
  SafeAreaView: ({ children }: any) => children,
  useSafeAreaInsets: () => mockInsets,
  useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 })
}))

setupSharedComponentHooks()

describe('OBottomPopup', () => {
  it('renders when open with title', () => {
    const onClose = jest.fn()
    const { getByText } = renderWithProviders(
      <OBottomPopup open containerStyle={{}} title="Popup" onClose={onClose}>
        <Text>Popup content</Text>
      </OBottomPopup>
    )
    expect(getByText('Popup')).toBeTruthy()
    expect(getByText('Popup content')).toBeTruthy()
  })

  it('calls onClose from modal request close', () => {
    const onClose = jest.fn()
    const { UNSAFE_getByType } = renderWithProviders(
      <OBottomPopup open containerStyle={{}} title="Popup" onClose={onClose}>
        <Text>body</Text>
      </OBottomPopup>
    )
    const { Modal } = require('react-native')
    fireEvent(UNSAFE_getByType(Modal), 'requestClose')
    expect(onClose).toHaveBeenCalled()
  })

  it('closes by nothing when the caller gave no onClose: the back key, the dimmed page and the close icon do not throw', () => {
    const { UNSAFE_getByType, UNSAFE_getAllByType, getByLabelText } = renderWithProviders(
      <OBottomPopup open closeIcon title="Popup">
        <Text>body</Text>
      </OBottomPopup>
    )
    const { Modal, TouchableWithoutFeedback } = require('react-native')
    expect(() => fireEvent(UNSAFE_getByType(Modal), 'requestClose')).not.toThrow()
    expect(() => fireEvent.press(UNSAFE_getAllByType(TouchableWithoutFeedback)[0])).not.toThrow()
    expect(() => fireEvent.press(getByLabelText('Close'))).not.toThrow()
  })

  it('calls onClose when tapping outside', () => {
    const onClose = jest.fn()
    const { UNSAFE_getAllByType } = renderWithProviders(
      <OBottomPopup open containerStyle={{}} title="Popup" onClose={onClose}>
        <Text>body</Text>
      </OBottomPopup>
    )
    const { TouchableWithoutFeedback } = require('react-native')
    fireEvent.press(UNSAFE_getAllByType(TouchableWithoutFeedback)[0])
    expect(onClose).toHaveBeenCalled()
  })

  describe('a sheet that holds a field being typed in', () => {
    const { TouchableWithoutFeedback } = require('react-native')

    it('gives the dimmed page its own tap, and the close button, the back key and the sheet\'s close stay `onClose`', () => {
      const onClose = jest.fn()
      const onBackdropPress = jest.fn()
      const { UNSAFE_getAllByType, UNSAFE_getByType, getByLabelText } = renderWithProviders(
        <OBottomPopup open closeIcon title='Popup' onClose={onClose} onBackdropPress={onBackdropPress}>
          <Text>body</Text>
        </OBottomPopup>
      )
      fireEvent.press(UNSAFE_getAllByType(TouchableWithoutFeedback)[0])
      expect(onBackdropPress).toHaveBeenCalledTimes(1)
      expect(onClose).not.toHaveBeenCalled()
      fireEvent.press(getByLabelText('Close'))
      fireEvent(UNSAFE_getByType(require('react-native').Modal), 'requestClose')
      expect(onClose).toHaveBeenCalledTimes(2)
    })

    it('tells a tap on a part no control answers (the claim is the sheet\'s blank parts, nothing a screen reader reads)', () => {
      const onBlankPress = jest.fn()
      const press = jest.fn()
      const { getByTestId, getByText } = renderWithProviders(
        <OBottomPopup open title='Popup' onBlankPress={onBlankPress}>
          <Text onPress={press}>body</Text>
        </OBottomPopup>
      )
      const sheet = getByTestId('sheet-bottom-space')
      expect(sheet.props.onStartShouldSetResponder()).toBe(true)
      expect(sheet.props.accessible).toBeUndefined()
      fireEvent(getByText('Popup'), 'responderRelease')
      expect(onBlankPress).toHaveBeenCalledTimes(1)
      // A control under the finger has its own press: the sheet's blank handler is not what answers it.
      fireEvent.press(getByText('body'))
      expect(press).toHaveBeenCalledTimes(1)
      expect(onBlankPress).toHaveBeenCalledTimes(1)
    })

    it('claims no touch without it', () => {
      const { getByTestId } = renderWithProviders(
        <OBottomPopup open title='Popup'>
          <Text>body</Text>
        </OBottomPopup>
      )
      expect(getByTestId('sheet-bottom-space').props.onStartShouldSetResponder).toBeUndefined()
      expect(getByTestId('sheet-bottom-space').props.onResponderRelease).toBeUndefined()
    })
  })

  describe('the title row (sizes round of 2026-11-19)', () => {
    const { StyleSheet } = require('react-native')
    const { defaultAppTheme } = require('../../../../../theme/engine')
    const theme = defaultAppTheme()
    const flat = (node: any) => StyleSheet.flatten(node.props.style)
    const rowOf = (node: any) => {
      let up = node.parent
      while (up && flat(up)?.position !== 'relative') up = up.parent
      return flat(up)
    }

    it('keeps `md` between the title row and the body, and `sheet.padding` at its sides and over it', () => {
      const { getByText } = renderWithProviders(
        <OBottomPopup open title="Popup" onClose={jest.fn()}><Text>body</Text></OBottomPopup>
      )
      const row = rowOf(getByText('Popup'))
      expect(row.paddingBottom).toBe(theme.native.tokens.space.md)
      expect(row.padding).toBe(theme.native.components.sheet.base.padding)
    })

    it('pulls the close button\'s box into the sheet\'s side padding, its glyph (22) staying on it', () => {
      const { getByLabelText } = renderWithProviders(
        <OBottomPopup open title="Popup" closeIcon onClose={jest.fn()}><Text>body</Text></OBottomPopup>
      )
      let holder: any = getByLabelText('Close').parent
      while (holder && flat(holder)?.marginRight === undefined) holder = holder.parent
      expect(flat(holder).marginRight).toBe(-closeButtonInset(theme))
    })
  })

  describe('the handle at the top of the sheet', () => {
    const { StyleSheet } = require('react-native')
    const { defaultAppTheme } = require('../../../../../theme/engine')
    const theme = defaultAppTheme()

    it('is drawn on every sheet, in the theme\'s handle color, and is only decoration (no press, no gesture)', () => {
      const { getByTestId } = renderWithProviders(
        <OBottomPopup open title="Popup" onClose={jest.fn()}><Text>body</Text></OBottomPopup>
      )
      const handle = getByTestId('sheet-handle', { includeHiddenElements: true })
      const style = StyleSheet.flatten(handle.props.style)
      expect(style.backgroundColor).toBe(theme.native.components.sheet.base.handle_color)
      expect(style.width).toBe(theme.native.tokens.space.xxl)
      expect(style.borderRadius).toBe(theme.native.tokens.radius.full)
      // 4 high, as the boards draw it (`sheet.base.handle_height`).
      expect(style.height).toBe(theme.native.components.sheet.base.handle_height)
      expect(style.height).toBe(4)
      expect(handle.props.onPress).toBeUndefined()
      expect(handle.props.onResponderMove).toBeUndefined()
    })

    it('sits above the title, centered, and out of the way of a screen reader', () => {
      const { getByTestId, getByText, toJSON } = renderWithProviders(
        <OBottomPopup open title="Popup" onClose={jest.fn()}><Text>body</Text></OBottomPopup>
      )
      let row: any = getByTestId('sheet-handle', { includeHiddenElements: true }).parent
      while (row && !row.props.importantForAccessibility) row = row.parent
      expect(StyleSheet.flatten(row.props.style).alignItems).toBe('center')
      expect(row.props.importantForAccessibility).toBe('no-hide-descendants')
      // The handle comes before the title in the sheet.
      const tree = JSON.stringify(toJSON())
      expect(tree.indexOf('sheet-handle')).toBeGreaterThan(-1)
      expect(tree.indexOf('sheet-handle')).toBeLessThan(tree.indexOf('Popup'))
      expect(getByText('Popup')).toBeTruthy()
    })

    it('can be left out with showHandleBar={false}', () => {
      const { queryByTestId } = renderWithProviders(
        <OBottomPopup open showHandleBar={false} title="Popup" onClose={jest.fn()}><Text>body</Text></OBottomPopup>
      )
      expect(queryByTestId('sheet-handle', { includeHiddenElements: true })).toBeNull()
    })
  })

  it('rides above the keyboard only when it holds a field (`keyboardAware`)', () => {
    const { KeyboardAvoidingView } = require('react-native')
    const plain = renderWithProviders(
      <OBottomPopup open title="Popup" onClose={jest.fn()}><Text>body</Text></OBottomPopup>
    )
    expect(plain.UNSAFE_getAllByType(KeyboardAvoidingView)[0].props.enabled).toBe(false)
    plain.unmount()
    const aware = renderWithProviders(
      <OBottomPopup open keyboardAware title="Popup" onClose={jest.fn()} testID="sheet"><Text>body</Text></OBottomPopup>
    )
    const container = aware.UNSAFE_getAllByType(KeyboardAvoidingView)[0]
    expect(container.props.enabled).toBe(true)
    expect(container.props.behavior).toBe('padding')
    expect(container.props.testID).toBe('sheet')
  })

  it('has no second keyboard-avoiding view unless the caller draws outside the sheet', () => {
    // That view's padding took room under the sheet: a strip of the page, undimmed, between the sheet and the keyboard.
    const { KeyboardAvoidingView } = require('react-native')
    const aware = renderWithProviders(
      <OBottomPopup open keyboardAware title="Popup" onClose={jest.fn()}><Text>body</Text></OBottomPopup>
    )
    expect(aware.UNSAFE_getAllByType(KeyboardAvoidingView)).toHaveLength(1)
    aware.unmount()
    const outside = renderWithProviders(
      <OBottomPopup open childenOutsideContainer title="Popup" onClose={jest.fn()}><Text>out</Text></OBottomPopup>
    )
    expect(outside.UNSAFE_getAllByType(KeyboardAvoidingView)).toHaveLength(2)
  })

  describe('the space under the sheet, closed and with the keyboard up', () => {
    const { Platform, Keyboard, StyleSheet } = require('react-native')
    const { act } = require('@testing-library/react-native')
    const { defaultAppTheme } = require('../../../../../theme/engine')
    const theme = defaultAppTheme()
    const components = theme.native.components
    const sheetPadding = components.sheet.base.padding
    const barPadding = components.bottom_bar.base.padding
    const minimum = components.bottom_nav.base.min_bottom_space
    const original = Platform.OS
    const setOS = (os: string) => Object.defineProperty(Platform, 'OS', { configurable: true, get: () => os })
    let listeners: Record<string, Array<(event?: any) => void>>
    let spy: jest.SpyInstance
    // A docked keyboard takes room: its end coordinates have a height.
    const emit = (...events: string[]) => act(() => { events.forEach((event) => (listeners[event] || []).forEach((cb) => cb({ endCoordinates: { height: 300 } }))) })
    // A floating keyboard: Android reports it as shown with a height of 0.
    const emitFloating = () => act(() => { (listeners.keyboardDidShow || []).forEach((cb) => cb({ endCoordinates: { height: 0 } })) })

    beforeEach(() => {
      listeners = {}
      spy = jest.spyOn(Keyboard, 'addListener').mockImplementation(((event: string, cb: () => void) => {
        (listeners[event] = listeners[event] || []).push(cb)
        return { remove: jest.fn() }
      }) as any)
      mockInsets.bottom = 0
    })
    afterEach(() => {
      spy.mockRestore()
      setOS(original)
    })

    const render = (props: any = {}) => {
      const screen = renderWithProviders(
        <OBottomPopup open padded title="Popup" onClose={jest.fn()} {...props}><Text>body</Text></OBottomPopup>
      )
      const under = () => StyleSheet.flatten(screen.getByTestId('sheet-bottom-space').props.style).paddingBottom
      const body = () => StyleSheet.flatten(screen.getByTestId('sheet-body').props.style).paddingBottom
      return { ...screen, under, body }
    }

    it('iOS, closed: the sheet\'s padding over the inset, never less than the minimum (as a pinned bar)', () => {
      setOS('ios')
      mockInsets.bottom = 34
      const sheet = render({ keyboardAware: true })
      expect(sheet.under()).toBe(34)
      expect(sheet.body()).toBe(sheetPadding)
      sheet.unmount()
      mockInsets.bottom = 0
      expect(render().under()).toBe(minimum)
    })

    it('Android, closed: the sheet\'s padding over the inset the window reads, with no minimum under it (as a pinned bar)', () => {
      setOS('android')
      expect(render({ keyboardAware: true }).under()).toBe(0)
      mockInsets.bottom = 63
      expect(render({ keyboardAware: true }).under()).toBe(63)
    })

    it.each(['ios', 'android'])('%s, keyboard up: a sheet with a field ends over the keyboard where a pinned bar does, and comes back when it goes down', (os) => {
      setOS(os)
      mockInsets.bottom = os === 'ios' ? 34 : 63
      const sheet = render({ keyboardAware: true })
      expect(sheet.under()).toBe(mockInsets.bottom)
      emit('keyboardWillShow', 'keyboardDidShow')
      // The keyboard covers the system space, and the bar's padding is all that is left under the last control.
      expect(sheet.under()).toBe(0)
      expect(sheet.body()).toBe(barPadding)
      emit('keyboardWillHide', 'keyboardDidHide')
      expect(sheet.under()).toBe(mockInsets.bottom)
      expect(sheet.body()).toBe(sheetPadding)
    })

    it('Android, floating keyboard (shown with a height of 0): the sheet keeps its inset, as it does while the keyboard is down', () => {
      setOS('android')
      mockInsets.bottom = 63
      const sheet = render({ keyboardAware: true })
      emitFloating()
      expect(sheet.under()).toBe(63)
      expect(sheet.body()).toBe(sheetPadding)
      // A docked keyboard that follows takes the room again.
      emit('keyboardDidShow')
      expect(sheet.under()).toBe(0)
      expect(sheet.body()).toBe(barPadding)
    })

    it('Android, floating keyboard: the avoiding view is off, so no padding leaves a strip of scrim under the sheet (the sheet reaches the screen\'s bottom); a docked one turns it on, and the transition floating -> docked -> floating follows', () => {
      const { KeyboardAvoidingView } = require('react-native')
      setOS('android')
      mockInsets.bottom = 63
      const sheet = render({ keyboardAware: true })
      const enabled = () => sheet.UNSAFE_getAllByType(KeyboardAvoidingView)[0].props.enabled
      expect(enabled()).toBe(true)
      emitFloating()
      expect(enabled()).toBe(false)
      emit('keyboardDidShow')
      expect(enabled()).toBe(true)
      emitFloating()
      expect(enabled()).toBe(false)
      act(() => { (listeners.keyboardDidHide || []).forEach((cb) => cb()) })
      expect(enabled()).toBe(true)
    })

    it('a sheet with no field does not follow the keyboard', () => {
      setOS('ios')
      mockInsets.bottom = 34
      const sheet = render()
      emit('keyboardWillShow', 'keyboardDidShow')
      expect(sheet.under()).toBe(34)
      expect(sheet.body()).toBe(sheetPadding)
    })
  })
})
