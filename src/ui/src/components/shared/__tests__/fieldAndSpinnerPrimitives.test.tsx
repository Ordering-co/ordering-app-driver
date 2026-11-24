import React from 'react'
import { ActivityIndicator, StyleSheet } from 'react-native'
import { fireEvent } from '@testing-library/react-native'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'

jest.mock('@components', () => require('../../../../../../jest/helpers/mockOrdering'))

import { buildAppTheme, defaultAppTheme, THEME_PRODUCT_TYPE } from '../../../../../theme/engine'
import { FieldError, OSpinner, PasswordToggle } from '../index'

/** A theme built from values, as the app builds it (never a spread). */
const themeWith = (values: any) => buildAppTheme({ version: 2, product_type: THEME_PRODUCT_TYPE, values })
const flat = (node: any) => StyleSheet.flatten(node.props.style)

describe('FieldError, PasswordToggle and OSpinner', () => {
  const theme = defaultAppTheme()
  const components = theme.native.components

  it('are exported from the shared folder and from @ui', () => {
    // The whole @ui barrel loads every screen (and their native modules): its text is read instead.
    const barrel = require('fs').readFileSync(require('path').join(__dirname, '../../../../index.tsx'), 'utf8')
    for (const [name, primitive] of Object.entries({ FieldError, PasswordToggle, OSpinner })) {
      expect(primitive).toBeDefined()
      // Once in the import from the shared folder, once in the export list.
      expect(barrel.match(new RegExp(`^\\s+${name},$`, 'gm'))).toHaveLength(2)
    }
  })

  describe('FieldError', () => {
    it('is the field\'s error text, in its color, the message gap under its field', () => {
      const { getByText } = renderWithProviders(<FieldError>Required</FieldError>)
      const style = flat(getByText('Required'))
      const field = components.field.base
      expect(style.fontSize).toBe(field.error.fontSize)
      expect(style.lineHeight).toBe(field.error.lineHeight)
      expect(style.fontFamily).toBe(field.error.fontFamily)
      expect(style.color).toBe(field.error_color)
      expect(style.marginTop).toBe(field.message_gap)
    })

    it('starts where its field starts by default, whatever its host aligns', () => {
      const style = flat(renderWithProviders(<FieldError>Required</FieldError>).getByText('Required'))
      expect(style.textAlign).toBe('auto')
      expect(style.alignSelf).toBe('stretch')
    })

    it('is centered under a centered code entry', () => {
      const style = flat(renderWithProviders(<FieldError center>Wrong code</FieldError>).getByText('Wrong code'))
      expect(style.textAlign).toBe('center')
      expect(style.marginTop).toBe(components.field.base.message_gap)
    })

    it('follows a theme that changes the field\'s error', () => {
      const custom = themeWith({ components: { field: { base: { error_color: '#123456' } } } })
      const { getByText } = renderWithProviders(<FieldError>Required</FieldError>, { themeOverrides: custom })
      expect(flat(getByText('Required')).color).toBe(custom.native.components.field.base.error_color)
      expect(custom.native.components.field.base.error_color).not.toBe(components.field.base.error_color)
    })

    it('takes the look of its group\'s fields (scope)', () => {
      const custom = themeWith({ components: { auth_form: { scope: { field: { base: { error_color: '#654321' } } } } } })
      const scoped = custom.native.components.auth_form.scope.field.base.error_color
      expect(scoped).not.toBe(custom.native.components.field.base.error_color)
      const inside = renderWithProviders(<FieldError scope='auth_form'>In the form</FieldError>, { themeOverrides: custom })
      expect(flat(inside.getByText('In the form')).color).toBe(scoped)
      const outside = renderWithProviders(<FieldError>Elsewhere</FieldError>, { themeOverrides: custom })
      expect(flat(outside.getByText('Elsewhere')).color).toBe(custom.native.components.field.base.error_color)
    })
  })

  describe('PasswordToggle', () => {
    it('says what a tap does and reports it', () => {
      const onToggle = jest.fn()
      const hidden = renderWithProviders(<PasswordToggle visible={false} onToggle={onToggle} testID='eye' />)
      expect(hidden.getByLabelText('Show password')).toBeTruthy()
      expect(hidden.UNSAFE_getByProps({ name: 'eye-outline' })).toBeTruthy()
      fireEvent.press(hidden.getByTestId('eye'))
      expect(onToggle).toHaveBeenCalledTimes(1)
      const shown = renderWithProviders(<PasswordToggle visible onToggle={onToggle} />)
      expect(shown.getByLabelText('Hide password')).toBeTruthy()
      expect(shown.UNSAFE_getByProps({ name: 'eye-off-outline' })).toBeTruthy()
    })

    it('is a small icon button that fits inside the field, 44 pt to touch, with the input\'s icon size and color', () => {
      const { getByTestId, UNSAFE_getByProps } = renderWithProviders(<PasswordToggle visible={false} onToggle={jest.fn()} testID='eye' />)
      const eye = getByTestId('eye')
      const box = flat(eye.children[0] as any)
      // Its box fits between the field's borders, so a password field is as tall as any other.
      expect(box.height).toBe(components.button.sizes.sm.height)
      expect(box.height).toBeLessThanOrEqual(components.input.sizes.md.height - 2)
      // The touch target still reaches 44 pt.
      const slop = eye.props.hitSlop
      expect(box.height + 2 * slop).toBeGreaterThanOrEqual(44)
      expect(box.width + 2 * slop).toBeGreaterThanOrEqual(44)
      const glyph = UNSAFE_getByProps({ name: 'eye-outline' })
      expect(glyph.props.size).toBe(components.input.base.icon_size)
      expect(glyph.props.color).toBe(components.input.base.icon_color)
    })
  })

  describe('OSpinner', () => {
    it('spins in the spinner\'s color', () => {
      const { UNSAFE_getByType } = renderWithProviders(<OSpinner />)
      expect(UNSAFE_getByType(ActivityIndicator).props.color).toBe(components.spinner.base.color)
    })

    it('follows a theme that changes the spinner\'s color', () => {
      const custom = themeWith({ components: { spinner: { base: { color: '#123456' } } } })
      const { UNSAFE_getByType } = renderWithProviders(<OSpinner />, { themeOverrides: custom })
      expect(UNSAFE_getByType(ActivityIndicator).props.color).toBe(custom.native.components.spinner.base.color)
      expect(custom.native.components.spinner.base.color).not.toBe(components.spinner.base.color)
    })

    it('takes a color role, or a color the theme gave', () => {
      const role = renderWithProviders(<OSpinner color='text_muted' />)
      expect(role.UNSAFE_getByType(ActivityIndicator).props.color).toBe(theme.native.tokens.color.text_muted)
      const given = renderWithProviders(<OSpinner color={components.button.variants.primary.solid.color} />)
      expect(given.UNSAFE_getByType(ActivityIndicator).props.color).toBe(components.button.variants.primary.solid.color)
    })

    it('has the box of an icon size of the theme, the same on both platforms', () => {
      for (const size of ['sm', 'md', 'lg'] as const) {
        const { getByTestId, UNSAFE_getByType, unmount } = renderWithProviders(<OSpinner size={size} testID='spinner' />)
        const side = theme.native.tokens.icon[size]
        const box = flat(getByTestId('spinner'))
        expect(box.width).toBe(side)
        expect(box.height).toBe(side)
        const indicator = UNSAFE_getByType(ActivityIndicator)
        expect(indicator.props.size).toBe('small')
        expect(flat(indicator).transform).toEqual([{ scale: side / 20 }])
        unmount()
      }
    })

    it('is the medium size by default', () => {
      const { getByTestId } = renderWithProviders(<OSpinner testID='spinner' />)
      expect(flat(getByTestId('spinner')).width).toBe(theme.native.tokens.icon.md)
    })
  })
})
