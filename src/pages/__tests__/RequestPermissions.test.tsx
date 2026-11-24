import React from 'react'
import { Platform, ScrollView, StatusBar, StyleSheet } from 'react-native'
import { fireEvent } from '@testing-library/react-native'
import { openSettings } from 'react-native-permissions'

import { mockPermissions } from '../../../jest/helpers/mockPermissionsContext'
import { renderPage } from '../../../jest/helpers/renderPage'
import { defaultAppTheme } from '../../theme/engine'
import { bottomBarClearance, themeColor, themeGutter, themePart, themeSpace } from '../../theme/helpers'

// The real primitives of the screen with the bottom bar as a button of its own.
jest.mock('@ui', () => {
  const React = require('react')
  const { Pressable, Text } = require('react-native')
  return {
    ...require('../../../jest/helpers/sharedPrimitivesMock').sharedPrimitives(),
    FloatingButton: ({ btnText, firstButtonClick }: any) => (
      <Pressable testID='floating-button' onPress={firstButtonClick}><Text testID='floating-button-text'>{btnText}</Text></Pressable>
    )
  }
})
jest.mock('../../context/PermissionsContext', () =>
  require('../../../jest/helpers/mockPermissionsContext')
)
// The system's permission names, as the device would give them.
jest.mock('react-native-permissions', () => ({
  openSettings: jest.fn(() => Promise.resolve()),
  PERMISSIONS: {
    IOS: { LOCATION_ALWAYS: 'ios.always', LOCATION_WHEN_IN_USE: 'ios.when_in_use' },
    ANDROID: { ACCESS_FINE_LOCATION: 'android.fine', ACCESS_COARSE_LOCATION: 'android.coarse', ACCESS_BACKGROUND_LOCATION: 'android.background' }
  },
  RESULTS: { GRANTED: 'granted', DENIED: 'denied', BLOCKED: 'blocked' }
}))

import RequestPermissions from '../RequestPermissions'

const flat = (node: any) => StyleSheet.flatten(node.props.style)
const theme: any = defaultAppTheme()

const onPlatform = (os: 'ios' | 'android') => {
  Object.defineProperty(Platform, 'OS', { configurable: true, value: os })
}

describe('RequestPermissions', () => {
  const originalOS = Platform.OS

  beforeEach(() => {
    jest.clearAllMocks()
    mockPermissions.isGrantedPermissions = false
    mockPermissions.permissions = { locationStatus: { 'ios.when_in_use': 'granted', 'ios.always': 'denied' } } as any
    mockPermissions.getPermissions = jest.fn(() => ['ios.always', 'ios.when_in_use']) as any
    onPlatform('ios')
  })
  afterEach(() => onPlatform(originalOS as any))

  it('says that the location is needed, and why, with the button of the settings', () => {
    const { getByTestId, getByText } = renderPage(RequestPermissions)
    expect(getByTestId('permissions-title')).toHaveTextContent('Location is needed')
    expect(getByText('You must grant the background location permission for the use of this app, please grant permission and restart the app.')).toBeTruthy()
    expect(getByTestId('floating-button-text').props.children).toBe('Go to settings')
  })

  it('opens device settings from the bottom bar\'s button', () => {
    const { getByTestId } = renderPage(RequestPermissions)
    fireEvent.press(getByTestId('floating-button'))
    expect(openSettings).toHaveBeenCalled()
  })

  it('goes back when permissions are already granted', () => {
    mockPermissions.isGrantedPermissions = true
    const { navigation } = renderPage(RequestPermissions)
    expect(navigation.goBack).toHaveBeenCalled()
  })

  it('does not go back when it is the Map tab\'s screen: the tab swaps it for the map, and going back from a tab is another tab', () => {
    mockPermissions.isGrantedPermissions = true
    const { navigation } = renderPage(RequestPermissions, { navigation: { getState: jest.fn(() => ({ type: 'tab', routes: [], index: 1 })) } as any })
    expect(navigation.goBack).not.toHaveBeenCalled()
    // A stack screen still leaves.
    const stack = renderPage(RequestPermissions, { navigation: { getState: jest.fn(() => ({ type: 'stack', routes: [], index: 1 })) } as any })
    expect(stack.navigation.goBack).toHaveBeenCalled()
  })

  it('does not go back while a permission is missing', () => {
    const { navigation } = renderPage(RequestPermissions)
    expect(navigation.goBack).not.toHaveBeenCalled()
  })

  describe('the text per platform', () => {
    it('is the background permission\'s on iOS', () => {
      const { getByTestId } = renderPage(RequestPermissions)
      expect(getByTestId('permissions-text')).toHaveTextContent(/^You must grant the background location permission/)
    })

    it('is the long explanation of the real time location on Android', () => {
      onPlatform('android')
      const { getByTestId } = renderPage(RequestPermissions)
      expect(getByTestId('permissions-text')).toHaveTextContent(/^This app require access to your device location \(real time location provided by Google\)/)
      expect(getByTestId('permissions-text')).toHaveTextContent(/Features used in background: Google maps real time GPS tracking\.$/)
    })
  })

  describe('the permissions the device has and has not granted', () => {
    it('lists each one the app asks for on iOS, the one for use first, with a mark of its state', () => {
      const { getByTestId, getAllByTestId, getByLabelText } = renderPage(RequestPermissions)
      const rows = getByTestId('permissions-list')
      expect(rows).toBeTruthy()
      expect(getByLabelText('Location while using the app: Granted')).toBeTruthy()
      expect(getByLabelText('Location always (in the background): Not granted')).toBeTruthy()
      expect(getAllByTestId('permission-granted')).toHaveLength(1)
      expect(getAllByTestId('permission-missing')).toHaveLength(1)
      // Granted in the success color, missing in the danger one.
      expect(getAllByTestId('permission-granted')[0].props.color).toBe(themeColor(theme, 'success_text'))
      expect(getAllByTestId('permission-missing')[0].props.color).toBe(themeColor(theme, 'danger_text'))
    })

    it('writes the missing one in bold and the granted one as the rest', () => {
      const { getByText } = renderPage(RequestPermissions)
      expect(flat(getByText('Location always (in the background)')).fontFamily).not.toBe(flat(getByText('Location while using the app')).fontFamily)
    })

    it('lists the ones Android asks for, the background one only where the system version asks for it', () => {
      onPlatform('android')
      mockPermissions.permissions = { locationStatus: { 'android.fine': 'granted', 'android.coarse': 'denied' } } as any
      mockPermissions.getPermissions = jest.fn(() => ['android.fine', 'android.coarse']) as any
      const eleven = renderPage(RequestPermissions)
      expect(eleven.getByLabelText('Precise location: Granted')).toBeTruthy()
      expect(eleven.getByLabelText('Approximate location: Not granted')).toBeTruthy()
      expect(eleven.queryByLabelText(/in the background/)).toBeNull()

      mockPermissions.getPermissions = jest.fn(() => ['android.background', 'android.fine', 'android.coarse']) as any
      const ten = renderPage(RequestPermissions)
      expect(ten.getByLabelText('Location always (in the background): Not granted')).toBeTruthy()
    })

    it('counts a permission the system has not answered as not granted', () => {
      mockPermissions.permissions = { locationStatus: 'unavailable' } as any
      const { getAllByTestId, queryAllByTestId } = renderPage(RequestPermissions)
      expect(queryAllByTestId('permission-granted')).toHaveLength(0)
      expect(getAllByTestId('permission-missing')).toHaveLength(2)
    })

    it('draws no list when the context asks for none', () => {
      mockPermissions.getPermissions = jest.fn(() => []) as any
      expect(renderPage(RequestPermissions).queryByTestId('permissions-list')).toBeNull()
    })
  })

  it('draws the glyph centered in a round tint of the brand, `empty_state.base.icon_box_size` across', () => {
    const { UNSAFE_getAllByProps } = renderPage(RequestPermissions)
    const glyphs = UNSAFE_getAllByProps({ name: 'location-outline' })
    const glyph = glyphs[glyphs.length - 1]
    expect(glyph.props.size).toBe(themePart(theme, 'empty_state', 'base.icon_size'))
    expect(glyph.props.color).toBe(themeColor(theme, 'primary_text'))
    const badge = flat(glyphs[0].parent!)
    expect(badge.backgroundColor).toBe(themeColor(theme, 'primary_subtle'))
    const box = themePart(theme, 'empty_state', 'base.icon_box_size')
    expect(badge).toEqual(expect.objectContaining({ width: box, height: box, alignItems: 'center', justifyContent: 'center' }))
  })

  it('lays the message at the page gutter, clear of the bottom bar, on both platforms', () => {
    const { UNSAFE_getByType, UNSAFE_queryAllByType } = renderPage(RequestPermissions)
    const content = StyleSheet.flatten(UNSAFE_getByType(ScrollView).props.contentContainerStyle)
    expect(content.paddingHorizontal).toBe(themeGutter(theme))
    expect(content.paddingBottom).toBe(bottomBarClearance(theme, 0))
    expect(content.justifyContent).toBe('center')
    expect(UNSAFE_queryAllByType(StatusBar)).toHaveLength(0)
  })
})
