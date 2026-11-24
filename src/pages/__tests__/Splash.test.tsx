import React from 'react'
import { Image, Platform, StyleSheet } from 'react-native'

import { fireEvent } from '@testing-library/react-native'

import { SplashLogoContext } from '../../utils/splash'
import { renderWithProviders } from '../../../jest/helpers/renderWithProviders'
import { buildAppTheme, THEME_PRODUCT_TYPE } from '../../theme/engine'
import { BUNDLED_IMAGES } from '../../theme/bundledImages'

import Splash from '../Splash'

const renderLogo = (os: 'ios' | 'android') => {
  jest.replaceProperty(Platform, 'OS', os)
  const { UNSAFE_getByType } = renderWithProviders(<Splash />)
  const logo = UNSAFE_getByType(Image)
  return { style: StyleSheet.flatten(logo.props.style), resizeMode: logo.props.resizeMode }
}

describe('Splash', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('renders splash screen', () => {
    const { toJSON } = renderWithProviders(<Splash />)
    expect(toJSON()).toBeTruthy()
  })

  it('paints the theme\'s background behind the launch logo', () => {
    const theme: any = buildAppTheme({
      version: 2,
      product_type: THEME_PRODUCT_TYPE,
      values: { tokens: { color: { background: '#FAFBFC' } } }
    })
    const { getByTestId, UNSAFE_getByType } = renderWithProviders(<Splash />, { themeOverrides: theme })
    expect(StyleSheet.flatten(getByTestId('splash-container').props.style).backgroundColor).toBe('#FAFBFC')
    expect(UNSAFE_getByType(Image).props.source).toBe(BUNDLED_IMAGES.general.loadingSplash)
  })

  it('draws the square logo 120 x 120, as the native iOS splash does (120 pt)', () => {
    const { style, resizeMode } = renderLogo('ios')

    expect(resizeMode).toBe('contain')
    expect(style.width).toBe(120)
    expect(style.height).toBe(120)
  })

  it('draws the same 120 x 120 on Android (120 dp, inside the 192 dp circle of Android 12)', () => {
    const { style } = renderLogo('android')

    expect(style.width).toBe(120)
    expect(style.height).toBe(120)
  })

  it('centres the logo on the page, as both native splashes centre theirs', () => {
    const { getByTestId } = renderWithProviders(<Splash />)
    const container = StyleSheet.flatten(getByTestId('splash-container').props.style)

    expect(container.alignItems).toBe('center')
    expect(container.justifyContent).toBe('center')
  })

  it('does not call the native splash itself: DeliveryApp hides it once, after the cached theme', () => {
    const BootSplash = require('react-native-bootsplash').default
    renderWithProviders(<Splash />)
    expect(BootSplash.hide).not.toHaveBeenCalled()
  })

  it('tells the native splash its logo is loaded, or failed to load, and that it is the first screen', () => {
    const unregister = jest.fn()
    const signal = { register: jest.fn(() => unregister), settled: jest.fn() }
    const { UNSAFE_getByType, unmount } = renderWithProviders(
      <SplashLogoContext.Provider value={signal}><Splash /></SplashLogoContext.Provider>
    )
    const logo = UNSAFE_getByType(Image)

    expect(signal.register).toHaveBeenCalledTimes(1)
    fireEvent(logo, 'load')
    expect(signal.settled).toHaveBeenCalledTimes(1)
    fireEvent(logo, 'error')
    expect(signal.settled).toHaveBeenCalledTimes(2)
    unmount()
    expect(unregister).toHaveBeenCalledTimes(1)
  })
})
