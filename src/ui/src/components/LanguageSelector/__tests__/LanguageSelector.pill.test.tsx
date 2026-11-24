import React from 'react'
import { StyleSheet } from 'react-native'
import { fireEvent, within } from '@testing-library/react-native'

import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { defaultAppTheme } from '../../../../../theme/engine'

jest.mock('@components', () => {
  const mockOrdering = require('../../../../../../jest/helpers/mockOrdering')
  const { renderUiController, languageSelectorDefaults } = require('../../../../../../jest/helpers/d1ShellDefaults')
  return { ...mockOrdering, LanguageSelector: renderUiController(languageSelectorDefaults) }
})

import { LanguageSelector } from '..'

describe('LanguageSelector as a pill (the welcome screen\'s button)', () => {
  const theme: any = defaultAppTheme()

  it('names the current language in itself, in its text and for a screen reader', () => {
    const languagesState = { loading: false, languages: [{ code: 'en', name: 'English' }, { code: 'es', name: 'Spanish' }] }
    const { getByTestId } = renderWithProviders(<LanguageSelector variant='pill' languagesState={languagesState} currentLanguage='es' />)
    const button = getByTestId('language-selector')
    expect(within(button).getByText('Español')).toBeTruthy()
    expect(button.props.accessibilityLabel).toBe('Language: Español')
  })

  it('is a button with the globe and the current language, in the theme\'s inverse color, 44 pt at least', () => {
    const { getByTestId, getByText, UNSAFE_getByProps } = renderWithProviders(<LanguageSelector variant='pill' />)
    const button = getByTestId('language-selector')
    expect(button.props.accessibilityRole).toBe('button')
    expect(button.props.accessibilityLabel).toBe('Language: English')
    expect(within(button).getByText('English')).toBeTruthy()
    expect(UNSAFE_getByProps({ name: 'globe-outline' })).toBeTruthy()
    const inverse = theme.native.components.button.variants.inverse.solid
    expect(StyleSheet.flatten(getByText('English').props.style).color).toBe(inverse.color)
    expect(StyleSheet.flatten(button.children[0].props.style).minHeight).toBeGreaterThanOrEqual(44)
  })

  it('is a pill as the board draws it: round ends, `md` at its sides, `xs` between its glyph (18) and its name', () => {
    const { getByTestId, UNSAFE_getAllByProps } = renderWithProviders(<LanguageSelector variant='pill' />)
    const box = StyleSheet.flatten(getByTestId('language-selector').children[0].props.style)
    expect(box.borderRadius).toBe(theme.native.components.button.shapes.round.radius)
    expect(box.paddingHorizontal).toBe(theme.native.tokens.space.md)
    expect(box.gap).toBe(theme.native.tokens.space.xs)
    const glyphs = UNSAFE_getAllByProps({ name: 'globe-outline' })
    expect(glyphs[glyphs.length - 1].props.size).toBe(theme.native.components.button.sizes.md.icon_size)
  })

  it('is filled with the hero\'s own overlay, translucent over the photo, not the inverse button\'s opaque fill', () => {
    const { getByTestId } = renderWithProviders(<LanguageSelector variant='pill' />)
    const box = StyleSheet.flatten(getByTestId('language-selector').children[0].props.style)
    const overlay = theme.native.components.home_hero.base.overlay
    expect(box.backgroundColor).toBe(overlay)
    expect(box.backgroundColor).not.toBe(theme.native.components.button.variants.inverse.solid.background)
    // The overlay is a veil (it has alpha), so the photo shows through the pill.
    expect(overlay).toMatch(/^rgba\(.*,\s*0?\.\d+\)$/)
  })

  it('opens the same sheet and changes the language through the same controller call as the row', () => {
    const handleChangeLanguage = jest.fn()
    const { getByTestId, getByText, queryByText } = renderWithProviders(
      <LanguageSelector variant='pill' handleChangeLanguage={handleChangeLanguage} />
    )
    expect(queryByText('Español')).toBeNull()
    fireEvent.press(getByTestId('language-selector'))
    fireEvent.press(getByText('Español'))
    expect(handleChangeLanguage).toHaveBeenCalledWith('es')
    expect(queryByText('Español')).toBeNull()
  })

  it('draws nothing with a single language, as the row does, and tells its host', () => {
    const onShownChange = jest.fn()
    const { toJSON } = renderWithProviders(
      <LanguageSelector
        variant='pill'
        onShownChange={onShownChange}
        languagesState={{ loading: false, languages: [{ code: 'en', name: 'English' }] }}
      />
    )
    expect(toJSON()).toBeNull()
    expect(onShownChange).toHaveBeenLastCalledWith(false)
  })

  it('is the profile\'s row when it is not asked for the pill', () => {
    const { getByTestId } = renderWithProviders(<LanguageSelector />)
    expect(within(getByTestId('language-selector')).getByText('Language')).toBeTruthy()
  })
})
