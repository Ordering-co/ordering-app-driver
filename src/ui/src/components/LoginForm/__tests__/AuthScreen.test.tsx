import React from 'react'
import { KeyboardAvoidingView, StyleSheet, Text } from 'react-native'

import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { layoutWindowOf, onAndroid } from '../../../../../../jest/helpers/androidWindow'

// A phone with a Dynamic Island and a home indicator.
const mockInsets = { top: 62, right: 0, bottom: 34, left: 0 }
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: any) => children,
  SafeAreaView: ({ children }: any) => children,
  useSafeAreaInsets: () => mockInsets
}))

jest.mock('@components', () => ({
  ...require('../../../../../../jest/helpers/mockOrdering'),
  FloatingButton: require('../../../../../../jest/helpers/d1ShellDefaults').renderUiController({})
}))

import { AuthScreen } from '../AuthPieces'

describe('AuthScreen', () => {
  it('lifts the screen with a keyboard-avoiding view that sits straight in the padded safe area', () => {
    // The view reads its position from its parent: with another view between it and the safe area's top
    // padding it did not count the top inset, and the pinned action stayed that much under the iOS keyboard.
    const { UNSAFE_getByType } = renderWithProviders(<AuthScreen title='Login' footer={<Text>bar</Text>}><Text>field</Text></AuthScreen>)
    const avoiding = UNSAFE_getByType(KeyboardAvoidingView)
    expect(avoiding.props.enabled).toBe(true)
    let parent: any = avoiding.parent
    while (parent && typeof parent.type !== 'string') parent = parent.parent
    expect(StyleSheet.flatten(parent.props.style).paddingTop).toBe(mockInsets.top)
    expect(parent.children).toHaveLength(1)
  })

  it('on Android gives the avoiding view the distance of the screen from the window\'s top (the login, the code screens and forgot are all this screen)', async () => {
    const android = onAndroid(63)
    const { UNSAFE_getByType } = renderWithProviders(<AuthScreen title='Login' footer={<Text>bar</Text>}><Text>field</Text></AuthScreen>)
    await layoutWindowOf(UNSAFE_getByType(KeyboardAvoidingView))
    expect(UNSAFE_getByType(KeyboardAvoidingView).props.keyboardVerticalOffset).toBe(63)
    expect(UNSAFE_getByType(KeyboardAvoidingView).props.behavior).toBe('height')
    android.restore()
  })
})
