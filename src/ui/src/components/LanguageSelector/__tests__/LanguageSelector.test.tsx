import React from 'react'
import { fireEvent } from '@testing-library/react-native'

import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'

jest.mock('@components', () => {
  const mockOrdering = require('../../../../../../jest/helpers/mockOrdering')
  const { renderUiController, languageSelectorDefaults } = require('../../../../../../jest/helpers/d1ShellDefaults')
  return {
    ...mockOrdering,
    LanguageSelector: renderUiController(languageSelectorDefaults)
  }
})

jest.mock('react-native-country-picker-modal', () => {
  const React = require('react')
  const { View, TouchableOpacity, Text } = require('react-native')
  const CountryPicker = ({ renderFlagButton, flatListProps }: any) => (
    <View testID="country-picker">
      {renderFlagButton?.()}
      {flatListProps?.data?.map((item: any) => (
        <TouchableOpacity
          key={item.key}
          testID={`lang-option-${item.key}`}
          onPress={() => flatListProps.renderItem({ item }).props.onPress()}
        >
          <Text>{item.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  )
  return {
    __esModule: true,
    default: CountryPicker,
    Flag: () => <View testID="country-flag" />
  }
})

import { LanguageSelector } from '..'

describe('LanguageSelector', () => {
  it('renders current language and changes selection', () => {
    const handleChangeLanguage = jest.fn()
    const { getByTestId } = renderWithProviders(
      <LanguageSelector handleChangeLanguage={handleChangeLanguage} />
    )
    expect(getByTestId('country-picker')).toBeTruthy()
    expect(getByTestId('lang-option-en')).toBeTruthy()
    fireEvent.press(getByTestId('lang-option-es'))
    expect(handleChangeLanguage).toHaveBeenCalledWith('es')
  })
})
