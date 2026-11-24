import React from 'react'
import { KeyboardAvoidingView, StyleSheet, Text } from 'react-native'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
const { setupSharedComponentHooks } = require('../../../../../../jest/helpers/driverSharedTestSetup')

// The insets of two windows: the app's (outside the modal) are 0 on Android, where the activity
// pads its screens; the modal's own window (inside its SafeAreaProvider) runs under the status bar.
jest.mock('react-native-safe-area-context', () => {
  const React = require('react')
  const Context = React.createContext({ top: 0, right: 0, bottom: 0, left: 0 })
  const Depth = React.createContext(0)
  const Provider = ({ children }: any) => {
    // The test's own outer provider is the app's window; the one inside the modal is the modal's.
    const depth = React.useContext(Depth)
    const value = depth === 0 ? { top: 0, right: 0, bottom: 0, left: 0 } : { top: 31, right: 0, bottom: 17, left: 0 }
    return (
      <Depth.Provider value={depth + 1}>
        <Context.Provider value={value}>{children}</Context.Provider>
      </Depth.Provider>
    )
  }
  return {
    SafeAreaProvider: Provider,
    SafeAreaView: ({ children }: any) => children,
    useSafeAreaInsets: () => React.useContext(Context),
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 }),
  }
})

import OModal from '../OModal'
import { defaultAppTheme } from '../../../../../theme/engine'

setupSharedComponentHooks()

/** The first style value of `prop` on the node or its ancestors. */
const inherited = (start: any, prop: string) => {
  for (let node = start; node; node = node.parent) {
    const value = StyleSheet.flatten(node.props?.style)?.[prop]
    if (value !== undefined) return value
  }
  return undefined
}

describe('OModal safe-area insets', () => {
  it('a full-screen modal pads its header with the inset of its own window, not the app\'s', () => {
    const screen = renderWithProviders(
      <OModal open entireModal hideIcons title='Search orders' onClose={jest.fn()}>
        <Text>Body</Text>
      </OModal>
    )
    // The bar is the title's ancestor that carries the padding.
    expect(inherited(screen.getByText('Search orders'), 'paddingTop')).toBe(31)
  })

  it('a dialog keeps its box below the status bar of its own window', () => {
    const screen = renderWithProviders(
      <OModal open box title='Dialog' testID='dialog' onClose={jest.fn()}>
        <Text>Body</Text>
      </OModal>
    )
    expect(inherited(screen.getByTestId('dialog'), 'paddingTop')).toBeGreaterThanOrEqual(31)
  })

  it('a dialog keeps its bottom inset and its gutter: the keyboard-avoiding view does not replace them', () => {
    const screen = renderWithProviders(
      <OModal open box title='Dialog' testID='dialog' onClose={jest.fn()}>
        <Text>Body</Text>
      </OModal>
    )
    // The avoiding view sets its own `paddingBottom` (the keyboard's height, 0 while it is hidden): a
    // room carried by the same view would lose its inset and its gutter to it on iOS.
    const avoiding = screen.UNSAFE_getByType(KeyboardAvoidingView)
    expect(StyleSheet.flatten(avoiding.props.style).paddingBottom).toBeUndefined()
    expect(StyleSheet.flatten(avoiding.props.style).paddingTop).toBeUndefined()
    // The room above it carries the window's insets plus the page gutter on every side.
    const gutter = defaultAppTheme().native.tokens.layout.page_gutter
    let room: any
    for (let up = avoiding.parent; up && !room; up = up.parent) {
      if (StyleSheet.flatten(up.props?.style)?.paddingBottom !== undefined) room = StyleSheet.flatten(up.props.style)
    }
    expect(room.paddingBottom).toBe(17 + gutter)
    expect(room.paddingTop).toBe(31 + gutter)
    expect(room.paddingHorizontal).toBe(gutter)
    // The box is inside the avoiding view.
    expect(avoiding.findByProps({ testID: 'dialog' })).toBeTruthy()
  })
})
