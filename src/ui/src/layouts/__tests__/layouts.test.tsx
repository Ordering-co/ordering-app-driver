import React from 'react'
import { ScrollView, StatusBar, StyleSheet, Text } from 'react-native'
import { useNetInfo } from '@react-native-community/netinfo'

import { renderWithProviders } from '../../../../../jest/helpers/renderWithProviders'
import { buildAppTheme, defaultAppTheme, THEME_PRODUCT_TYPE } from '../../../../theme/engine'
import { themeColor, themeGutter, themeSpace } from '../../../../theme/helpers'

// A phone with a notch and a home indicator.
const mockInsets = { top: 47, right: 0, bottom: 34, left: 0 }
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: any) => children,
  SafeAreaView: ({ children }: any) => children,
  useSafeAreaInsets: () => mockInsets
}))

import { Container } from '../Container'
import { SafeAreaContainer, SafeAreaContainerLayout } from '../SafeAreaContainer'

/** A theme built from values, as the app builds it (never a spread). */
const themeWith = (values: any) => buildAppTheme({ version: 2, product_type: THEME_PRODUCT_TYPE, values })
const flat = (node: any) => StyleSheet.flatten(node.props.style)

describe('screen wrappers', () => {
  const theme = defaultAppTheme()

  describe('SafeAreaContainer', () => {
    it('is the page canvas inside the system\'s insets', () => {
      const { toJSON } = renderWithProviders(<SafeAreaContainer><Text>in</Text></SafeAreaContainer>)
      const style = flat(toJSON())
      expect(style.flex).toBe(1)
      expect(style.backgroundColor).toBe(themeColor(theme, 'background'))
      expect(style.paddingTop).toBe(mockInsets.top)
      expect(style.paddingBottom).toBe(mockInsets.bottom)
      expect(style.paddingLeft).toBe(mockInsets.left)
      expect(style.paddingRight).toBe(mockInsets.right)
    })

    it('keeps only the insets of its `edges`', () => {
      const tab = renderWithProviders(<SafeAreaContainer edges={['top', 'left', 'right']}><Text>in</Text></SafeAreaContainer>)
      expect(flat(tab.toJSON()).paddingTop).toBe(mockInsets.top)
      expect(flat(tab.toJSON()).paddingBottom).toBe(0)
      const none = renderWithProviders(<SafeAreaContainer edges={[]}><Text>in</Text></SafeAreaContainer>)
      expect(flat(none.toJSON()).paddingTop).toBe(0)
    })

    it('follows the theme\'s background, and a caller\'s style over it', () => {
      const custom = themeWith({ tokens: { color: { background: '#101010' } } })
      const themed = renderWithProviders(<SafeAreaContainer><Text>in</Text></SafeAreaContainer>, { themeOverrides: custom })
      expect(flat(themed.toJSON()).backgroundColor).toBe('#101010')
      const own = renderWithProviders(<SafeAreaContainer style={{ backgroundColor: themeColor(theme, 'surface_alt') }}><Text>in</Text></SafeAreaContainer>)
      expect(flat(own.toJSON()).backgroundColor).toBe(themeColor(theme, 'surface_alt'))
    })
  })

  describe('SafeAreaContainerLayout', () => {
    it('is the page above a bottom bar (no bottom inset) and lays no sides: the header and the scroll carry the gutter', () => {
      const { toJSON, getByText } = renderWithProviders(<SafeAreaContainerLayout><Text>in</Text></SafeAreaContainerLayout>)
      const screen: any = toJSON()
      expect(flat(screen).paddingTop).toBe(mockInsets.top)
      expect(flat(screen).paddingBottom).toBe(0)
      // A frame with a gutter would clip the side shadow of a card (decision H8).
      expect(flat(screen).paddingHorizontal).toBeUndefined()
      expect(flat(screen).flex).toBe(1)
      expect(getByText('in')).toBeTruthy()
    })

    it('puts its children directly in the padded container, so a keyboard-avoiding view sees the top inset', () => {
      // `KeyboardAvoidingView` measures its frame against its parent: a view between the padded container
      // and the screen's own root hid the top inset (62 pt on a Dynamic Island phone) and the screen's bottom
      // action stayed that much under the keyboard.
      const { toJSON } = renderWithProviders(<SafeAreaContainerLayout><Text>in</Text></SafeAreaContainerLayout>)
      const screen: any = toJSON()
      expect(flat(screen).paddingTop).toBe(mockInsets.top)
      expect(screen.children).toHaveLength(1)
      expect(screen.children[0].type).toBe('Text')
    })

    it('mounts no status bar, offline or not (decision D8)', () => {
      ;(useNetInfo as jest.Mock).mockReturnValue({ isConnected: false })
      const { UNSAFE_queryByType } = renderWithProviders(<SafeAreaContainerLayout><Text>in</Text></SafeAreaContainerLayout>)
      expect(UNSAFE_queryByType(StatusBar)).toBeNull()
      ;(useNetInfo as jest.Mock).mockReturnValue({ isConnected: true })
    })
  })

  describe('Container', () => {
    it('is the screen wrapper around a scroll whose content, not its frame, is on the page gutter', () => {
      const { toJSON, UNSAFE_getByType, UNSAFE_queryByType } = renderWithProviders(<Container><Text>in</Text></Container>)
      const screen = flat(toJSON())
      expect(screen.backgroundColor).toBe(themeColor(theme, 'background'))
      expect(screen.paddingTop).toBe(mockInsets.top)
      expect(screen.paddingBottom).toBe(mockInsets.bottom)
      const scroll = UNSAFE_getByType(ScrollView)
      // The frame is the screen's width (a card's side shadow shows); the content carries the sides.
      expect(flat(scroll).paddingHorizontal).toBeUndefined()
      const content = StyleSheet.flatten(scroll.props.contentContainerStyle)
      expect(content.paddingHorizontal).toBe(themeGutter(theme))
      expect(content.paddingBottom).toBe(themeSpace(theme, 'lg'))
      expect(content.paddingTop).toBeUndefined()
      expect(scroll.props.keyboardShouldPersistTaps).toBe('handled')
      expect(UNSAFE_queryByType(StatusBar)).toBeNull()
    })

    it('`noPadding` leaves the sides to the screen', () => {
      const { UNSAFE_getByType } = renderWithProviders(<Container noPadding><Text>in</Text></Container>)
      expect(StyleSheet.flatten(UNSAFE_getByType(ScrollView).props.contentContainerStyle)?.paddingHorizontal).toBeUndefined()
    })

    it('draws its `header` fixed above the scroll, never inside it', () => {
      const { getByText } = renderWithProviders(
        <Container header={<Text>bar</Text>}><Text>in</Text></Container>
      )
      const insideScroll = (node: any) => {
        for (let up = node.parent; up; up = up.parent) if (up.type === ScrollView) return true
        return false
      }
      expect(insideScroll(getByText('bar'))).toBe(false)
      expect(insideScroll(getByText('in'))).toBe(true)
    })

    it('hands its scroll to `forwardRef`', () => {
      const ref = React.createRef<any>()
      renderWithProviders(<Container forwardRef={ref}><Text>in</Text></Container>)
      expect(ref.current).toBeTruthy()
    })
  })
})
