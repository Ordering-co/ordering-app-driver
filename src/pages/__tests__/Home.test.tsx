import React from 'react'
import { NativeModules, Platform, StatusBar, StyleSheet } from 'react-native'
import { fireEvent } from '@testing-library/react-native'
import { useIsFocused } from '@react-navigation/native'

import { renderPage } from '../../../jest/helpers/renderPage'
import { defaultAppTheme } from '../../theme/engine'

jest.mock('@ui', () => require('../../../jest/helpers/mockUi'))
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useIsFocused: jest.fn(() => true),
}))

import Home from '../Home'

describe('Home', () => {
  it('renders home page and navigates on redirect', () => {
    const { getByTestId, navigation } = renderPage(Home)
    expect(getByTestId('home-page')).toBeTruthy()
    fireEvent.press(getByTestId('home-nav'))
    expect(navigation.navigate).toHaveBeenCalledWith('Login', undefined)
  })

  it('ignores empty navigation redirect', () => {
    const { getByTestId, navigation } = renderPage(Home)
    fireEvent.press(getByTestId('home-nav-empty'))
    expect(navigation.navigate).not.toHaveBeenCalled()
  })

  it('keeps a dark surface of the theme behind the hero', () => {
    const theme: any = defaultAppTheme()
    const { toJSON } = renderPage(Home)
    const root: any = toJSON()
    expect(StyleSheet.flatten(root.props.style).backgroundColor).toBe(theme.native.tokens.color.inverse_surface)
  })

  describe('the system bars on Android (the hero is a photo from edge to edge)', () => {
    const setContentUnderBars = jest.fn()
    let platform: { restore: () => void } | undefined
    beforeEach(() => {
      setContentUnderBars.mockClear()
      ;(useIsFocused as jest.Mock).mockReturnValue(true)
      NativeModules.WindowBackground = { setContentUnderBars }
      platform = jest.replaceProperty(Platform, 'OS', 'android')
    })
    afterEach(() => {
      platform?.restore()
      platform = undefined
      delete NativeModules.WindowBackground
    })

    it('asks for the content to go under the bars while it is shown, and puts the padding back when it leaves', () => {
      const { unmount } = renderPage(Home)
      expect(setContentUnderBars).toHaveBeenCalledTimes(1)
      expect(setContentUnderBars).toHaveBeenLastCalledWith(true)
      unmount()
      expect(setContentUnderBars).toHaveBeenCalledTimes(2)
      expect(setContentUnderBars).toHaveBeenLastCalledWith(false)
    })

    it('puts the padding back while another screen is over it (the stack keeps it mounted) and asks again on return', () => {
      const { rerender } = renderPage(Home)
      ;(useIsFocused as jest.Mock).mockReturnValue(false)
      rerender(<Home navigation={{}} route={{}} />)
      expect(setContentUnderBars).toHaveBeenLastCalledWith(false)
      ;(useIsFocused as jest.Mock).mockReturnValue(true)
      rerender(<Home navigation={{}} route={{}} />)
      expect(setContentUnderBars).toHaveBeenLastCalledWith(true)
    })

    it('has light status bar icons over the photo only while it is shown', () => {
      const { UNSAFE_getByType, UNSAFE_queryAllByType, rerender } = renderPage(Home)
      expect(UNSAFE_getByType(StatusBar).props.barStyle).toBe('light-content')
      ;(useIsFocused as jest.Mock).mockReturnValue(false)
      rerender(<Home navigation={{}} route={{}} />)
      expect(UNSAFE_queryAllByType(StatusBar)).toHaveLength(0)
    })

    it('does nothing on iOS, which already draws edge to edge, and leaves its status bar to the app', () => {
      platform?.restore()
      platform = jest.replaceProperty(Platform, 'OS', 'ios')
      const { UNSAFE_queryAllByType } = renderPage(Home)
      expect(setContentUnderBars).not.toHaveBeenCalled()
      expect(UNSAFE_queryAllByType(StatusBar)).toHaveLength(0)
    })

    it('does not break in a binary without the native method', () => {
      NativeModules.WindowBackground = {}
      expect(() => renderPage(Home).unmount()).not.toThrow()
    })
  })
})
