import React from 'react'
import { StyleSheet } from 'react-native'
import { fireEvent } from '@testing-library/react-native'

import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'

const mockSafeAreaInsets = { top: 0, right: 0, bottom: 0, left: 0 }

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: any) => children,
  SafeAreaView: ({ children }: any) => children,
  useSafeAreaInsets: () => mockSafeAreaInsets,
  useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 })
}))

// BottomTabBarHeightContext comes from the global mock in jest/setup.js
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs'

jest.mock('@components', () => {
  const mockOrdering = require('../../../../../../jest/helpers/mockOrdering')
  const { renderUiController } = require('../../../../../../jest/helpers/d1ShellDefaults')
  return {
    ...mockOrdering,
    FloatingButton: renderUiController({})
  }
})

import { FloatingButton } from '..'

describe('FloatingButton', () => {
  beforeEach(() => {
    mockSafeAreaInsets.bottom = 0
  })

  it('clears the home indicator on stack screens', () => {
    mockSafeAreaInsets.bottom = 34
    const { toJSON } = renderWithProviders(
      <FloatingButton btnText="Accept order" firstButtonClick={jest.fn()} />
    )
    expect(StyleSheet.flatten(toJSON().props.style).paddingBottom).toBe(34)
  })

  it('keeps the caller padding when it is larger than the inset', () => {
    mockSafeAreaInsets.bottom = 10
    const { toJSON } = renderWithProviders(
      <FloatingButton btnText="Accept order" paddingBottomIos={20} firstButtonClick={jest.fn()} />
    )
    expect(StyleSheet.flatten(toJSON().props.style).paddingBottom).toBe(20)
  })

  it('does not add the inset inside the bottom tabs', () => {
    mockSafeAreaInsets.bottom = 34
    const { toJSON } = renderWithProviders(
      <BottomTabBarHeightContext.Provider value={80}>
        <FloatingButton btnText="Accept order" firstButtonClick={jest.fn()} />
      </BottomTabBarHeightContext.Provider>
    )
    expect(StyleSheet.flatten(toJSON().props.style).paddingBottom).toBe(5)
  })

  it('handles primary button click', () => {
    const firstButtonClick = jest.fn()
    const { getByText } = renderWithProviders(
      <FloatingButton btnText="Accept order" firstButtonClick={firstButtonClick} />
    )
    fireEvent.press(getByText('Accept order'))
    expect(firstButtonClick).toHaveBeenCalled()
  })

  it('renders secondary button when enabled', () => {
    const secondButtonClick = jest.fn()
    const { getByText } = renderWithProviders(
      <FloatingButton
        btnText="Accept"
        secondBtnText="Reject"
        secondButton
        firstButtonClick={jest.fn()}
        secondButtonClick={secondButtonClick}
      />
    )
    fireEvent.press(getByText('Reject'))
    expect(secondButtonClick).toHaveBeenCalled()
  })

  it('hides reject buttons when isHideRejectButtons is true', () => {
    const { queryByText } = renderWithProviders(
      <FloatingButton
        btnText="Hidden"
        isHideRejectButtons
        firstButtonClick={jest.fn()}
      />
    )
    expect(queryByText('Hidden')).toBeNull()
  })
})
