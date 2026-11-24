import React from 'react'
import { StyleSheet } from 'react-native'
import { fireEvent, within } from '@testing-library/react-native'

import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { defaultAppTheme } from '../../../../../theme/engine'

jest.mock('@components', () => {
  const mockOrdering = require('../../../../../../jest/helpers/mockOrdering')
  const { renderUiController, languageSelectorDefaults } = require('../../../../../../jest/helpers/d1ShellDefaults')
  return {
    ...mockOrdering,
    LanguageSelector: renderUiController(languageSelectorDefaults)
  }
})

import { LanguageSelector } from '..'

describe('LanguageSelector', () => {
  it('is a row of the account that says the current language and changes it from the sheet', () => {
    const handleChangeLanguage = jest.fn()
    const { getByTestId, getByText, queryByText } = renderWithProviders(
      <LanguageSelector handleChangeLanguage={handleChangeLanguage} />
    )
    // Closed: the row names what it is and the language it has, the list is not drawn.
    const row = getByTestId('language-selector')
    expect(within(row).getByText('Language')).toBeTruthy()
    expect(within(row).getByText('English')).toBeTruthy()
    expect(queryByText('Español')).toBeNull()

    fireEvent.press(row)
    // The sheet has its title, and a row per language.
    expect(getByText('Español')).toBeTruthy()
    fireEvent.press(getByText('Español'))
    expect(handleChangeLanguage).toHaveBeenCalledWith('es')
    // Choosing closes the sheet.
    expect(queryByText('Español')).toBeNull()
  })

  it('writes each language in itself, not in the API\'s English name, and keeps the API\'s name for a code it has no name for', () => {
    const languagesState = {
      loading: false,
      languages: [
        { code: 'en', name: 'English' },
        { code: 'es', name: 'Spanish' },
        { code: 'pt', name: 'Portuguese' },
        { code: 'es-419-1', name: 'Spanish (Mexico)' },
        { code: 'xx', name: 'Klingon' }
      ]
    }
    const { getByTestId, getByText, queryByText } = renderWithProviders(<LanguageSelector languagesState={languagesState} currentLanguage='es' />)
    // The row says the current language in its own name.
    expect(within(getByTestId('language-selector')).getByText('Español')).toBeTruthy()
    fireEvent.press(getByTestId('language-selector'))
    expect(getByText('English')).toBeTruthy()
    expect(getByText('Português')).toBeTruthy()
    expect(getByText('Klingon')).toBeTruthy()
    // A regional variant is not the language itself: its own row says where.
    expect(getByText('Español (Mexico)')).toBeTruthy()
    expect(queryByText('Spanish')).toBeNull()
    expect(queryByText('Portuguese')).toBeNull()
  })

  it('writes the current language\'s name muted, before the chevron of a row that opens a sheet', () => {
    const { getByTestId } = renderWithProviders(<LanguageSelector />)
    const value = within(getByTestId('language-selector')).getByText('English')
    expect(StyleSheet.flatten(value.props.style).color).toBe(defaultAppTheme().native.tokens.color.text_muted)
  })

  it('draws the languages by name only, with a check on the current one', () => {
    const { getByTestId, getAllByText, UNSAFE_getAllByProps } = renderWithProviders(<LanguageSelector />)
    fireEvent.press(getByTestId('language-selector'))
    // The row's value and the sheet's row of the current language.
    expect(getAllByText('English')).toHaveLength(2)
    expect(UNSAFE_getAllByProps({ name: 'checkmark' }).length).toBeGreaterThan(0)
  })

  it('draws a line over its row only for the list that asks for it, and with the row', () => {
    const alone = renderWithProviders(<LanguageSelector />)
    const withLine = renderWithProviders(<LanguageSelector divided />)
    const lines = (screen: any) => screen.UNSAFE_queryAllByType(require('../../shared/ODivider').ODivider).length
    expect(lines(alone)).toBe(0)
    expect(lines(withLine)).toBe(1)
  })

  it('tells the profile whether its row is there', () => {
    const onShownChange = jest.fn()
    renderWithProviders(<LanguageSelector onShownChange={onShownChange} />)
    expect(onShownChange).toHaveBeenLastCalledWith(true)
  })

  it('draws nothing, and no line, with a single language or while the languages load', () => {
    const onShownChange = jest.fn()
    const single = renderWithProviders(
      <LanguageSelector divided onShownChange={onShownChange} languagesState={{ loading: false, languages: [{ code: 'en', name: 'English' }] }} />
    )
    expect(single.toJSON()).toBeNull()
    expect(onShownChange).toHaveBeenLastCalledWith(false)
    const loading = renderWithProviders(
      <LanguageSelector divided languagesState={{ loading: true, languages: [{ code: 'en', name: 'English' }, { code: 'es', name: 'Spanish' }] }} />
    )
    expect(loading.toJSON()).toBeNull()
  })
})
