import React from 'react'
import { StyleSheet, Text } from 'react-native'

import { renderWithProviders } from '../../../jest/helpers/renderWithProviders'
import { buildAppTheme, defaultAppTheme, THEME_PRODUCT_TYPE } from '../../theme/engine'
import { themeBottomSpace } from '../../theme/helpers'

/**
 * The tab bar as React Navigation draws it from the options the navigator
 * gives: the bar's style, and per screen its button (nothing when the screen
 * replaces it with none), its icon and its label (unless labels are off). The
 * focused tab is `mockFocused` (the first by default). A screen is registered
 * (`scene-<name>`) always, and built (its content) as React Navigation does:
 * when its tab is the focused one, or from launch when its options say
 * `lazy: false` (a tab is lazy by default).
 */
let mockFocused = 'Orders'
jest.mock('@react-navigation/bottom-tabs', () => {
  const React = require('react')
  const { View } = require('react-native')
  const Screen = () => null
  const Navigator = ({ children, screenOptions }: any) => {
    const screens = React.Children.toArray(children)
    return (
      <View>
        <View testID='scenes' style={screenOptions.sceneStyle}>
          {screens.map((screen: any) => {
            const { name, options, component } = screen.props
            const lazy = options.lazy ?? screenOptions.lazy ?? true
            return (
              <View key={name} testID={`scene-${name}`}>
                {(name === mockFocused || !lazy) && React.createElement(component)}
              </View>
            )
          })}
        </View>
        <View testID='tab-bar' style={screenOptions.tabBarStyle}>
          {screens.map((screen: any) => {
            const { name, options } = screen.props
            if (options.tabBarButton && options.tabBarButton({}) === null) return null
            const focused = name === mockFocused
            const color = focused ? screenOptions.tabBarActiveTintColor : screenOptions.tabBarInactiveTintColor
            return (
              <View key={name} testID={`tab-${name}`} accessibilityLabel={options.tabBarAccessibilityLabel} style={options.tabBarItemStyle}>
                {options.tabBarIcon({ focused, color })}
                {screenOptions.tabBarShowLabel !== false && options.tabBarLabel({ focused, color })}
              </View>
            )
          })}
        </View>
      </View>
    )
  }
  return { createBottomTabNavigator: () => ({ Navigator, Screen }) }
})

// The real shared primitives (Icon, OText) without the rest of @ui.
jest.mock('@ui', () => require('../../../jest/helpers/sharedPrimitivesMock').sharedPrimitives())

jest.mock('../../pages/MyOrders', () => {
  const { Text } = require('react-native')
  return { __esModule: true, default: () => <Text>screen: orders</Text> }
})
jest.mock('../../pages/MapView', () => {
  const { Text } = require('react-native')
  return { __esModule: true, default: () => <Text>screen: map</Text> }
})
// The Messages screen reports what its list knows of the unread messages, as the real one does.
let mockUnread: { total: number, more: boolean } | null = null
jest.mock('../../pages/Messages', () => {
  const { Text } = require('react-native')
  const { useReportUnreadMessages } = require('../../context/UnreadMessagesContext')
  return {
    __esModule: true,
    default: () => {
      useReportUnreadMessages(mockUnread)
      return <Text>screen: messages</Text>
    }
  }
})
jest.mock('../../pages/Profile', () => {
  const { Text } = require('react-native')
  return { __esModule: true, default: () => <Text>screen: profile</Text> }
})
jest.mock('../../pages/RequestPermissions', () => {
  const { Text } = require('react-native')
  return { __esModule: true, default: () => <Text>screen: permissions</Text> }
})
jest.mock('../../context/PermissionsContext', () => require('../../../jest/helpers/mockPermissionsContext'))

import BottomNavigator from '../BottomNavigator'
import { PermissionsContext } from '../../context/PermissionsContext'
import { BottomBarProvider, useBottomBarHeight } from '../../context/BottomBarContext'

/** A theme built from values, as the app builds it (never a spread). */
const themeWith = (values: any) => buildAppTheme({ version: 2, product_type: THEME_PRODUCT_TYPE, values })
const flat = (node: any) => StyleSheet.flatten(node.props.style)

/** The system's text size (1 = the default). */
const withFontScale = (fontScale: number) =>
  jest.spyOn(require('react-native'), 'useWindowDimensions').mockReturnValue({ width: 390, height: 844, scale: 3, fontScale })

describe('BottomNavigator', () => {
  const nav = defaultAppTheme().native.components.bottom_nav.base

  beforeEach(() => { withFontScale(1); mockUnread = null; mockFocused = 'Orders' })
  afterEach(() => { jest.restoreAllMocks() })

  it('draws the four tabs, each with a glyph and its label', () => {
    const { getByTestId, getByText, getByLabelText, UNSAFE_getByProps } = renderWithProviders(<BottomNavigator />)
    for (const name of ['Orders', 'MapView', 'Messages', 'Profile']) expect(getByTestId(`tab-${name}`)).toBeTruthy()
    for (const label of ['Orders', 'Map view', 'Messages', 'Profile']) {
      expect(getByText(label)).toBeTruthy()
      expect(getByLabelText(label)).toBeTruthy()
    }
    // One kind of icon for the four tabs: glyphs at the bar's icon size.
    for (const name of ['receipt-outline', 'map-outline', 'chatbubbles-outline', 'person-outline']) {
      expect(UNSAFE_getByProps({ name, size: nav.icon_size })).toBeTruthy()
    }
  })

  it('paints the focused tab in the active color and the others in the inactive one, icon and label', () => {
    const { getByText, UNSAFE_getByProps } = renderWithProviders(<BottomNavigator />)
    expect(UNSAFE_getByProps({ name: 'receipt-outline', size: nav.icon_size }).props.color).toBe(nav.active)
    expect(UNSAFE_getByProps({ name: 'person-outline', size: nav.icon_size }).props.color).toBe(nav.inactive)
    expect(flat(getByText('Orders')).color).toBe(nav.active)
    expect(flat(getByText('Profile')).color).toBe(nav.inactive)
    expect(flat(getByText('Profile')).fontSize).toBe(nav.label_text.fontSize)
    expect(flat(getByText('Profile')).fontFamily).toBe(nav.label_text.fontFamily)
  })

  it('writes the focused tab\'s label semibold and the others\' regular (the label\'s own file)', () => {
    const { getByText } = renderWithProviders(<BottomNavigator />)
    const semibold = defaultAppTheme().native.tokens.typography.label.fontFamily
    expect(flat(getByText('Orders')).fontFamily).toBe(semibold)
    expect(flat(getByText('Profile')).fontFamily).toBe(nav.label_text.fontFamily)
    expect(nav.label_text.fontFamily).not.toBe(semibold)
  })

  it('is `components.bottom_nav`: its box, and under the labels the theme\'s minimum where the system gives no inset', () => {
    const { getByTestId } = renderWithProviders(<BottomNavigator />)
    const bar = flat(getByTestId('tab-bar'))
    const space = themeBottomSpace(defaultAppTheme(), 0)
    expect(space).toBe(nav.min_bottom_space)
    expect(bar.backgroundColor).toBe(nav.background)
    expect(bar.height).toBe(nav.height + space)
    expect(bar.paddingBottom).toBe(space + nav.padding_y)
    expect(bar.paddingTop).toBe(nav.padding_y)
    expect(bar.paddingHorizontal).toBe(nav.padding_x)
    expect(bar.borderTopWidth).toBe(nav.border_top.borderWidth)
    expect(bar.borderTopColor).toBe(nav.border_top.borderColor)
    expect(bar.elevation).toBe(nav.shadow.elevation)
  })

  it('tells the toast how tall the bar is while the tabs are on screen (the bar\'s own height, its inset included)', () => {
    const Height = () => <Text testID='toast-room'>{String(useBottomBarHeight())}</Text>
    const screen = renderWithProviders(<BottomBarProvider><Height /><BottomNavigator /></BottomBarProvider>)
    const bar = flat(screen.getByTestId('tab-bar'))
    expect(screen.getByTestId('toast-room').props.children).toBe(String(bar.height))
    expect(bar.height).toBeGreaterThan(nav.height)
    screen.unmount()
  })

  it('follows a theme that changes the bar', () => {
    const custom = themeWith({
      components: { bottom_nav: { base: { background: '#101010', active: '#FFEE00', height: 72, min_bottom_space: 24, border_top: null } } },
    })
    const { getByTestId, getByText } = renderWithProviders(<BottomNavigator />, { themeOverrides: custom })
    const bar = flat(getByTestId('tab-bar'))
    expect(bar.backgroundColor).toBe('#101010')
    expect(bar.height).toBe(72 + 24)
    expect(bar.borderTopWidth).toBe(0)
    expect(flat(getByText('Orders')).color).toBe('#FFEE00')
  })

  it('grows with its label at a larger system text, up to the app\'s text cap, and not when the labels are hidden', () => {
    const line = nav.label_text.lineHeight
    const heightAt = (fontScale: number, themeOverrides?: any) => {
      withFontScale(fontScale)
      return flat(renderWithProviders(<BottomNavigator />, { themeOverrides }).getByTestId('tab-bar')).height
    }
    const base = nav.height + nav.min_bottom_space
    expect(heightAt(1)).toBe(base)
    expect(heightAt(1.3)).toBe(base + Math.ceil(line * (1.3 - 1)))
    expect(heightAt(2)).toBe(heightAt(1.3))
    expect(heightAt(2, themeWith({ visibility: { 'bottom_nav.labels': false } }))).toBe(base)
  })

  it('`bottom_nav.map` hides the Map view tab and nothing else; its screen stays registered', () => {
    const custom = themeWith({ visibility: { 'bottom_nav.map': false } })
    const { queryByTestId, getByTestId } = renderWithProviders(<BottomNavigator />, { themeOverrides: custom })
    expect(queryByTestId('tab-MapView')).toBeNull()
    for (const name of ['Orders', 'Messages', 'Profile']) expect(getByTestId(`tab-${name}`)).toBeTruthy()
    expect(getByTestId('scene-MapView')).toBeTruthy()
  })

  it('`bottom_nav.messages` hides the Messages tab and nothing else; its screen stays registered', () => {
    const custom = themeWith({ visibility: { 'bottom_nav.messages': false } })
    const { queryByTestId, getByTestId } = renderWithProviders(<BottomNavigator />, { themeOverrides: custom })
    expect(queryByTestId('tab-Messages')).toBeNull()
    for (const name of ['Orders', 'MapView', 'Profile']) expect(getByTestId(`tab-${name}`)).toBeTruthy()
    expect(getByTestId('scene-Messages')).toBeTruthy()
  })

  it('`bottom_nav.labels` hides the labels and keeps the tabs, their icons and what a screen reader says', () => {
    const custom = themeWith({ visibility: { 'bottom_nav.labels': false } })
    const { queryByText, getByTestId, getByLabelText, UNSAFE_getByProps } = renderWithProviders(<BottomNavigator />, { themeOverrides: custom })
    for (const label of ['Orders', 'Map view', 'Messages', 'Profile']) {
      expect(queryByText(label)).toBeNull()
      expect(getByLabelText(label)).toBeTruthy()
    }
    for (const name of ['Orders', 'MapView', 'Messages', 'Profile']) expect(getByTestId(`tab-${name}`)).toBeTruthy()
    expect(UNSAFE_getByProps({ name: 'map-outline', size: nav.icon_size })).toBeTruthy()
  })

  describe('the unread messages on the Messages tab', () => {
    it('draws no number while the Messages list has not said how many are unread', () => {
      const { queryByTestId, getByLabelText } = renderWithProviders(<BottomNavigator />)
      expect(queryByTestId('tab-badge')).toBeNull()
      expect(getByLabelText('Messages')).toBeTruthy()
    })

    it('draws no number when none is unread', () => {
      mockUnread = { total: 0, more: false }
      expect(renderWithProviders(<BottomNavigator />).queryByTestId('tab-badge')).toBeNull()
    })

    it('draws the count over the glyph, as the theme\'s count badge, and says it to a screen reader', () => {
      mockUnread = { total: 2, more: false }
      const { getByTestId, getByLabelText } = renderWithProviders(<BottomNavigator />)
      expect(getByTestId('tab-badge')).toHaveTextContent('2')
      expect(flat(getByTestId('tab-badge')).position).toBe('absolute')
      expect(flat(getByTestId('tab-badge')).backgroundColor).toBe(defaultAppTheme().native.components.badge.variants.primary.background)
      expect(getByLabelText('Messages, 2 unread messages')).toBeTruthy()
    })

    it('says one message in the singular', () => {
      mockUnread = { total: 1, more: false }
      const { getByTestId, getByLabelText } = renderWithProviders(<BottomNavigator />)
      expect(getByTestId('tab-badge')).toHaveTextContent('1')
      expect(getByLabelText('Messages, 1 unread message')).toBeTruthy()
    })

    it('writes a "+" when the list has pages it has not loaded: the number is then the least there are', () => {
      mockUnread = { total: 7, more: true }
      const { getByTestId, getByLabelText } = renderWithProviders(<BottomNavigator />)
      expect(getByTestId('tab-badge')).toHaveTextContent('7+')
      expect(getByLabelText('Messages, 7+ unread messages')).toBeTruthy()
    })

    it('leaves the glyph and the label where they are, and puts the badge on no other tab', () => {
      mockUnread = { total: 3, more: false }
      const { getAllByTestId, getByTestId } = renderWithProviders(<BottomNavigator />)
      expect(getAllByTestId('tab-badge')).toHaveLength(1)
      expect(getByTestId('tab-Messages').findAll((node: any) => node.props.testID === 'tab-badge')).not.toHaveLength(0)
      expect(getByTestId('tab-Orders').findAll((node: any) => node.props.testID === 'tab-badge')).toHaveLength(0)
    })

    it('is not drawn with the tab when the theme hides the Messages tab', () => {
      mockUnread = { total: 3, more: false }
      const custom = themeWith({ visibility: { 'bottom_nav.messages': false } })
      expect(renderWithProviders(<BottomNavigator />, { themeOverrides: custom }).queryByTestId('tab-badge')).toBeNull()
    })
  })

  describe('which screens are built at launch', () => {
    it('builds the Messages screen before its tab is opened, so its unread count is there from the start', () => {
      mockUnread = { total: 4, more: false }
      const { getByText, getByTestId } = renderWithProviders(<BottomNavigator />)
      expect(getByText('screen: messages')).toBeTruthy()
      // The tab shown is Orders: the badge is drawn without a visit to Messages.
      expect(getByText('screen: orders')).toBeTruthy()
      expect(getByTestId('tab-badge')).toHaveTextContent('4')
    })

    it('keeps the other tabs lazy: Map view and Profile are built when their tab opens', () => {
      const { queryByText } = renderWithProviders(<BottomNavigator />)
      expect(queryByText('screen: map')).toBeNull()
      expect(queryByText('screen: profile')).toBeNull()
    })

    it('does not build the Messages screen at launch when the theme hides its tab (no badge to feed, no call)', () => {
      const custom = themeWith({ visibility: { 'bottom_nav.messages': false } })
      const { queryByText, getByTestId } = renderWithProviders(<BottomNavigator />, { themeOverrides: custom })
      expect(getByTestId('scene-Messages')).toBeTruthy()
      expect(queryByText('screen: messages')).toBeNull()
    })

    it('builds the Messages screen whichever tab is shown', () => {
      mockFocused = 'Profile'
      const { getByText, queryByText } = renderWithProviders(<BottomNavigator />)
      expect(getByText('screen: messages')).toBeTruthy()
      expect(getByText('screen: profile')).toBeTruthy()
      expect(queryByText('screen: orders')).toBeNull()
    })
  })

  it('never hides Orders or Profile', () => {
    const custom = themeWith({ visibility: { 'bottom_nav.orders': false, 'bottom_nav.profile': false, 'bottom_nav.map': false, 'bottom_nav.messages': false } })
    const { getByTestId } = renderWithProviders(<BottomNavigator />, { themeOverrides: custom })
    expect(getByTestId('tab-Orders')).toBeTruthy()
    expect(getByTestId('tab-Profile')).toBeTruthy()
  })

  it('swaps the Map view screen for the permissions request while the location is not granted', () => {
    mockFocused = 'MapView'
    const granted = renderWithProviders(<BottomNavigator />)
    expect(granted.getByText('screen: map')).toBeTruthy()
    expect(granted.queryByText('screen: permissions')).toBeNull()

    const denied = renderWithProviders(
      <PermissionsContext.Provider value={{ isGrantedPermissions: false } as any}>
        <BottomNavigator />
      </PermissionsContext.Provider>
    )
    expect(denied.getByText('screen: permissions')).toBeTruthy()
    expect(denied.queryByText('screen: map')).toBeNull()
    // The tab itself stays.
    expect(denied.getByTestId('tab-MapView')).toBeTruthy()
  })

  describe('a permission lost, or given back, while the app runs', () => {
    const inContext = (value: any) => (
      <PermissionsContext.Provider value={value}><BottomNavigator /></PermissionsContext.Provider>
    )
    const context = (isGrantedPermissions: boolean, checkLocationPermission = jest.fn()) => ({ isGrantedPermissions, checkLocationPermission } as any)

    it('shows the permissions request as soon as the context says the permission is gone (never a blank tab), and the map as soon as it is back', () => {
      mockFocused = 'MapView'
      const view = renderWithProviders(inContext(context(true)))
      expect(view.getByText('screen: map')).toBeTruthy()

      view.rerender(inContext(context(false)))
      expect(view.getByText('screen: permissions')).toBeTruthy()
      expect(view.queryByText('screen: map')).toBeNull()

      view.rerender(inContext(context(true)))
      expect(view.getByText('screen: map')).toBeTruthy()
      expect(view.queryByText('screen: permissions')).toBeNull()
    })

    it('keeps the tab in the bar, focused, while its screen changes', () => {
      mockFocused = 'MapView'
      const view = renderWithProviders(inContext(context(true)))
      view.rerender(inContext(context(false)))
      expect(view.getByTestId('tab-MapView')).toBeTruthy()
      expect(view.getByTestId('scene-MapView')).toHaveTextContent('screen: permissions')
    })

    it('asks the system again every time the Map tab opens, so a permission taken away while the app ran does not wait for the next time the app comes back', () => {
      const { useFocusEffect } = require('@react-navigation/native')
      const focus = useFocusEffect as jest.Mock
      focus.mockImplementation((effect: any) => { require('react').useEffect(effect, [effect]) })
      try {
        mockFocused = 'MapView'
        const check = jest.fn()
        renderWithProviders(inContext(context(true, check)))
        expect(check).toHaveBeenCalled()
        // Not the other tabs' screens: only the Map tab's.
        const other = jest.fn()
        mockFocused = 'Orders'
        renderWithProviders(inContext(context(true, other)))
        expect(other).not.toHaveBeenCalled()
      } finally {
        focus.mockReset()
      }
    })

    it('does not ask again when only the answer changes (no loop: the check is the context\'s one function)', () => {
      const { useFocusEffect } = require('@react-navigation/native')
      const focus = useFocusEffect as jest.Mock
      focus.mockImplementation((effect: any) => { require('react').useEffect(effect, [effect]) })
      try {
        mockFocused = 'MapView'
        const check = jest.fn()
        const view = renderWithProviders(inContext(context(true, check)))
        view.rerender(inContext(context(false, check)))
        view.rerender(inContext(context(true, check)))
        expect(check).toHaveBeenCalledTimes(1)
      } finally {
        focus.mockReset()
      }
    })
  })

  it('paints the scenes on the page background', () => {
    const theme = defaultAppTheme()
    const { getByTestId } = renderWithProviders(<BottomNavigator />)
    expect(flat(getByTestId('scenes')).backgroundColor).toBe(theme.native.tokens.color.background)
  })
})
