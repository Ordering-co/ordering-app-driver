import React from 'react'
import { act, fireEvent } from '@testing-library/react-native'
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native'

import { renderPage } from '../../../jest/helpers/renderPage'

jest.mock('@ui', () => require('../../../jest/helpers/mockUi'))

import OrderMessage from '../OrderMessage'

describe('OrderMessage', () => {
  describe('the keyboard and the chat\'s composer', () => {
    const onPlatform = async (platform: string, windowTop: number) => {
      Object.defineProperty(Platform, 'OS', { configurable: true, get: () => platform })
      // The view the screen measures answers where it sits in the window (the renderer has no native view).
      const measureInWindow = jest.fn((callback: any) => callback(0, windowTop, 390, 800))
      ;(View as any).prototype.measureInWindow = measureInWindow
      const page = renderPage(OrderMessage, { route: { params: { orderId: 15 } } })
      // Only Android wraps the avoiding view in the measured view: iOS has nothing to measure.
      const window: any = platform === 'android' ? page.getByTestId('chat-window') : page.queryByTestId('chat-window')
      if (window) {
        await act(async () => {
          fireEvent(window, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 390, height: 800 } } })
        })
      }
      return { page, window, measureInWindow }
    }
    const originalOS = Platform.OS
    afterEach(() => {
      delete (View as any).prototype.measureInWindow
      Object.defineProperty(Platform, 'OS', { configurable: true, get: () => originalOS })
    })

    it('on Android gives the avoiding view the distance the activity\'s padding puts above it (the keyboard is measured from the window\'s top)', async () => {
      // The chat has no bar under its composer to take the shortfall, as the forms\' pinned bar does.
      const { page } = await onPlatform('android', 24)
      const avoiding = page.UNSAFE_getByType(KeyboardAvoidingView)
      expect(avoiding.props.keyboardVerticalOffset).toBe(24)
      expect(avoiding.props.behavior).toBe('padding')
      page.unmount()
    })

    it('on iOS, which draws from the window\'s top, the offset is 0 and the behavior the same', async () => {
      const { page, measureInWindow } = await onPlatform('ios', 24)
      const avoiding = page.UNSAFE_getByType(KeyboardAvoidingView)
      expect(avoiding.props.keyboardVerticalOffset).toBe(0)
      expect(avoiding.props.behavior).toBe('padding')
      expect(measureInWindow).not.toHaveBeenCalled()
      // The avoiding view sits straight under the navigator's card, with no view of the screen's between.
      expect(page.queryByTestId('chat-window')).toBeNull()
      page.unmount()
    })

    it('has one avoiding view only (the screen\'s): the chat inside does not add a second', async () => {
      const { page } = await onPlatform('android', 24)
      expect(page.UNSAFE_getAllByType(KeyboardAvoidingView)).toHaveLength(1)
      // The window\'s measured view is the avoiding view\'s parent, so its own `frame.y` is 0.
      const avoiding = page.getByTestId('chat-keyboard-screen')
      expect(StyleSheet.flatten(avoiding.props.style).flex).toBe(1)
      page.unmount()
    })
  })

  it('renders order message controller with route params', () => {
    const setOrders = jest.fn()
    const { getByTestId } = renderPage(OrderMessage, {
      route: {
        params: {
          orderId: 15,
          isFromCheckout: false,
          setOrders
        }
      }
    })
    expect(getByTestId('order-message')).toBeTruthy()
    expect(getByTestId('safe-area-container')).toBeTruthy()
  })
})
