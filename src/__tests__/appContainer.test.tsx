import React from 'react'
import { NativeModules, Platform, StatusBar, processColor } from 'react-native'

import { renderWithProviders } from '../../jest/helpers/renderWithProviders'
import { buildAppTheme, defaultAppTheme, THEME_PRODUCT_TYPE } from '../theme/engine'
import { themeColor, themeFontFamily } from '../theme/helpers'

// The navigation container, keeping the props it was given.
const mockNavigationContainer = jest.fn(({ children }: any) => children)
jest.mock('@react-navigation/native', () => ({
  // React Navigation 7 reads the fonts of its theme: the library's own weights are part of what the app maps.
  DefaultTheme: jest.requireActual('@react-navigation/native').DefaultTheme,
  NavigationContainer: (props: any) => mockNavigationContainer(props)
}))

jest.mock('../navigators/RootNavigator', () => {
  const { Text } = require('react-native')
  return { __esModule: true, default: () => <Text>root navigator</Text> }
})

import AppContainer, { ThemedStatusBar, navigationThemeOf } from '../appContainer'

/** A theme built from values, as the app builds it (never a spread). */
const themeWith = (values: any) => buildAppTheme({ version: 2, product_type: THEME_PRODUCT_TYPE, values })

describe('AppContainer', () => {
  it('mounts the navigation and one status bar', () => {
    const { getByText, UNSAFE_getAllByType } = renderWithProviders(<AppContainer />)
    expect(getByText('root navigator')).toBeTruthy()
    expect(UNSAFE_getAllByType(StatusBar)).toHaveLength(1)
  })
})

describe('the navigation\'s own paint', () => {
  it('is the theme\'s colors by role, not the library\'s defaults', () => {
    const theme = defaultAppTheme()
    renderWithProviders(<AppContainer />)
    const given = mockNavigationContainer.mock.calls[0][0].theme
    expect(given).toEqual(navigationThemeOf(theme))
    expect(given.dark).toBe(false)
    expect(given.colors.background).toBe(themeColor(theme, 'background'))
    expect(given.colors.card).toBe(themeColor(theme, 'surface'))
    expect(given.colors.border).toBe(themeColor(theme, 'border'))
  })

  it('has the fonts React Navigation 7 reads, in the theme\'s body font and without a weight of their own', () => {
    const theme = defaultAppTheme()
    renderWithProviders(<AppContainer />)
    const { fonts } = mockNavigationContainer.mock.calls[0][0].theme
    expect(Object.keys(fonts).sort()).toEqual(['bold', 'heavy', 'medium', 'regular'])
    expect(fonts.regular).toEqual({ fontFamily: themeFontFamily(theme, 'body', 400) })
    expect(fonts.medium).toEqual({ fontFamily: themeFontFamily(theme, 'body', 500) })
    expect(fonts.heavy).toEqual({ fontFamily: themeFontFamily(theme, 'body', 700) })
    for (const font of Object.values<any>(fonts)) expect(font.fontWeight).toBeUndefined()
  })

  it('follows a dark background', () => {
    const custom = themeWith({ tokens: { color: { background: '#101010' } } })
    mockNavigationContainer.mockClear()
    renderWithProviders(<AppContainer />, { themeOverrides: custom })
    const given = mockNavigationContainer.mock.calls[0][0].theme
    expect(given.dark).toBe(true)
    expect(given.colors.background).toBe('#101010')
  })
})

describe('ThemedStatusBar (decision D8)', () => {
  it('is dark content over the theme\'s light background', () => {
    const { UNSAFE_getByType } = renderWithProviders(<ThemedStatusBar />)
    const bar = UNSAFE_getByType(StatusBar)
    expect(bar.props.barStyle).toBe('dark-content')
    // React Native 0.87 removed the prop: the bar paints nothing of its own
    expect(bar.props.backgroundColor).toBeUndefined()
  })

  it('turns to light content over a dark background', () => {
    const custom = themeWith({ tokens: { color: { background: '#101010' } } })
    const { UNSAFE_getByType } = renderWithProviders(<ThemedStatusBar />, { themeOverrides: custom })
    const bar = UNSAFE_getByType(StatusBar)
    expect(bar.props.barStyle).toBe('light-content')
    expect(bar.props.backgroundColor).toBeUndefined()
  })
})

describe('the color behind the system bars on Android (the window\'s background)', () => {
  const setColor = jest.fn()
  let platform: { restore: () => void } | undefined
  beforeEach(() => {
    setColor.mockClear()
    NativeModules.WindowBackground = { setColor }
  })
  afterEach(() => {
    platform?.restore()
    platform = undefined
    delete NativeModules.WindowBackground
  })

  it('is the theme\'s background, sent to the app\'s native module', () => {
    platform = jest.replaceProperty(Platform, 'OS', 'android')
    const custom = themeWith({ tokens: { color: { background: '#101010' } } })
    renderWithProviders(<ThemedStatusBar />, { themeOverrides: custom })
    expect(setColor).toHaveBeenCalledTimes(1)
    expect(setColor).toHaveBeenCalledWith(processColor('#101010'))
  })

  it('is the default background without a served theme', () => {
    platform = jest.replaceProperty(Platform, 'OS', 'android')
    renderWithProviders(<ThemedStatusBar />)
    expect(setColor).toHaveBeenCalledWith(processColor(themeColor(defaultAppTheme(), 'background')))
  })

  it('does nothing on iOS, and nothing breaks in a binary without the module', () => {
    platform = jest.replaceProperty(Platform, 'OS', 'ios')
    renderWithProviders(<ThemedStatusBar />)
    expect(setColor).not.toHaveBeenCalled()
    platform.restore()
    platform = jest.replaceProperty(Platform, 'OS', 'android')
    delete NativeModules.WindowBackground
    expect(() => renderWithProviders(<ThemedStatusBar />)).not.toThrow()
  })
})

