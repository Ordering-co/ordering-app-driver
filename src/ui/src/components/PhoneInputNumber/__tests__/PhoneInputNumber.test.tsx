import React from 'react'
import { StyleSheet } from 'react-native'
import { act, fireEvent, waitFor, within } from '@testing-library/react-native'

jest.mock('@components', () => {
  const mockOrdering = require('../../../../../../jest/helpers/mockOrdering')
  const { d4ConfigState } = require('../../../../../../jest/helpers/d4DriverDefaults')
  return {
    ...mockOrdering,
    useConfig: jest.fn(() => [d4ConfigState]),
    useUtils: jest.fn(() => [{}, {}])
  }
})

import { PhoneInputNumber } from '..'
import { flagEmoji } from '../CountryFlag'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { defaultAppTheme } from '../../../../../../src/theme/engine'
import {
  phoneInputNumberDefaults,
  phoneInputNumberWithErrorDefaults
} from '../../../../../../jest/helpers/d5StoresDefaults'

const theme: any = defaultAppTheme()
const lastData = (handleData: jest.Mock) => handleData.mock.calls[handleData.mock.calls.length - 1]?.[0]

const renderPhone = async (props: Record<string, unknown> = {}) => {
  const view = renderWithProviders(<PhoneInputNumber {...phoneInputNumberDefaults} {...props} />)
  // The countries arrive after the mount.
  await act(async () => {})
  return view
}

describe('PhoneInputNumber', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders the number field beside the country and its calling code', async () => {
    const { getByPlaceholderText, getByTestId, getByText } = await renderPhone()
    expect(getByTestId('phone-input')).toBeTruthy()
    expect(getByPlaceholderText('Phone number')).toBeTruthy()
    expect(getByTestId('phone-country-trigger')).toBeTruthy()
    expect(getByText('+1')).toBeTruthy()
    expect(getByText(flagEmoji('US'))).toBeTruthy()
  })

  it('draws the country\'s trigger as the board does: `sm` at its sides, its chevron 16', async () => {
    const { getByTestId, UNSAFE_getAllByProps } = await renderPhone()
    const { StyleSheet } = require('react-native')
    const trigger = StyleSheet.flatten(getByTestId('phone-country-trigger').props.style)
    expect(trigger.paddingHorizontal).toBe(defaultAppTheme().native.tokens.space.sm)
    const chevrons = UNSAFE_getAllByProps({ name: 'chevron-down' })
    expect(chevrons[chevrons.length - 1].props.size).toBe(defaultAppTheme().native.tokens.icon.sm)
  })

  it('opens on the calling code the user saved', async () => {
    const { getByText } = await renderPhone({ defaultCode: '57' })
    expect(getByText('+57')).toBeTruthy()
    expect(getByText(flagEmoji('CO'))).toBeTruthy()
  })

  it('shows data error when provided', async () => {
    const { getByText } = await renderPhone(phoneInputNumberWithErrorDefaults)
    expect(getByText('The Phone Number field is invalid')).toBeTruthy()
  })

  it('writes that error as the app\'s field error: at the start, under the whole row (decision H7)', async () => {
    const field = defaultAppTheme().native.components.field.base
    const { getByText } = await renderPhone(phoneInputNumberWithErrorDefaults)
    const error = StyleSheet.flatten(getByText('The Phone Number field is invalid').props.style)
    expect(error.color).toBe(field.error_color)
    expect(error.fontSize).toBe(field.error.fontSize)
    expect(error.marginTop).toBe(field.message_gap)
    // Never centered: it starts where the field starts.
    expect(error.textAlign).toBe('auto')
    expect(error.alignSelf).toBe('stretch')
  })

  it('draws no error line without an error', async () => {
    const { queryByText } = await renderPhone()
    expect(queryByText('The Phone Number field is invalid')).toBeNull()
  })

  it('notifies handleData for a valid phone number', async () => {
    const handleData = jest.fn()
    const { getByTestId } = await renderPhone({ handleData })
    fireEvent.changeText(getByTestId('phone-input'), '201 555-0123')
    await waitFor(() => {
      expect(lastData(handleData)).toEqual(expect.objectContaining({
        error: '',
        phone: { country_phone_code: '1', cellphone: '2015550123' }
      }))
    })
  })

  it('notifies handleData with invalid error for short number', async () => {
    const handleData = jest.fn()
    const { getByTestId } = await renderPhone({ handleData })
    fireEvent.changeText(getByTestId('phone-input'), '555')
    await waitFor(() => {
      expect(lastData(handleData)).toEqual(expect.objectContaining({
        error: 'The Phone Number field is invalid'
      }))
    })
  })

  it('reports nothing while the field is empty', async () => {
    const handleData = jest.fn()
    const { getByTestId } = await renderPhone({ handleData })
    expect(handleData).not.toHaveBeenCalled()
    fireEvent.changeText(getByTestId('phone-input'), '2015550123')
    await waitFor(() => expect(handleData).toHaveBeenCalledTimes(1))
    fireEvent.changeText(getByTestId('phone-input'), '')
    await act(async () => {})
    expect(handleData).toHaveBeenCalledTimes(1)
  })

  it('takes a number pasted with its calling code: its country and the national number', async () => {
    const handleData = jest.fn()
    const { getByTestId, getByText } = await renderPhone({ handleData })
    fireEvent.changeText(getByTestId('phone-input'), '+52 55 1234 5678')
    await waitFor(() => {
      expect(lastData(handleData)).toEqual(expect.objectContaining({
        error: '',
        phone: { country_phone_code: '52', cellphone: '5512345678' }
      }))
    })
    expect(getByText('+52')).toBeTruthy()
    expect(getByTestId('phone-input').props.value).toBe('5512345678')
  })

  it('opens the countries in the select sheet, one row per calling code, and applies the choice', async () => {
    const handleData = jest.fn()
    const { getByTestId, getByText, findByText, getByPlaceholderText, queryByText } = await renderPhone({ handleData })
    fireEvent.changeText(getByTestId('phone-input'), '7212345')
    await act(async () => { fireEvent.press(getByTestId('phone-country-trigger')) })
    expect(getByText('Select country')).toBeTruthy()
    // The sheet lists the app's 250 countries (a long list draws its first rows): searching finds the one.
    expect(getByText('Afghanistan (+93)')).toBeTruthy()

    fireEvent.changeText(getByPlaceholderText('Search'), 'puerto')
    expect(await findByText('Puerto Rico (+1939)')).toBeTruthy()
    expect(queryByText('United States (+1)')).toBeNull()
    await act(async () => { fireEvent.press(getByText('Puerto Rico (+1787)')) })

    expect(getByText('+1787')).toBeTruthy()
    // The number already typed is reported again with the new calling code.
    await waitFor(() => {
      expect(lastData(handleData)).toEqual(expect.objectContaining({
        error: '',
        phone: { country_phone_code: '1787', cellphone: '7212345' }
      }))
    })
  })

  it('passes the caller\'s keyboard actions to the number field', async () => {
    const onSubmitEditing = jest.fn()
    const { getByTestId } = await renderPhone({ textInputProps: { returnKeyType: 'next', onSubmitEditing } })
    const field = getByTestId('phone-input')
    expect(field.props.returnKeyType).toBe('next')
    fireEvent(field, 'submitEditing')
    expect(onSubmitEditing).toHaveBeenCalled()
  })

  it('is read only when disabled: neither the number nor the country can change', async () => {
    const { getByTestId } = await renderPhone({ isDisabled: true, defaultValue: '2015550123' })
    expect(getByTestId('phone-input').props.editable).toBe(false)
    expect(getByTestId('phone-country-trigger').props.accessibilityState.disabled).toBe(true)
  })
  describe('in a scope of the theme (the profile\'s form)', () => {
    it('is drawn as it always was without one: the placeholder inside the box, no label over it (the login\'s field)', async () => {
      const { getByPlaceholderText, getByTestId } = await renderPhone()
      expect(getByPlaceholderText('Phone number')).toBeTruthy()
      expect(getByTestId('phone-input').props.accessibilityLabel).toBeUndefined()
    })

    it('puts the number\'s label over its box when the scope\'s fields do (`account_page`)', async () => {
      const { getByText, queryByPlaceholderText, getByTestId } = await renderPhone({ scope: 'account_page' })
      expect(getByText('Phone number')).toBeTruthy()
      expect(queryByPlaceholderText('Phone number')).toBeNull()
      expect(getByTestId('phone-input').props.accessibilityLabel).toBe('Phone number')
      expect(getByTestId('phone-country-trigger')).toBeTruthy()
    })

    it('puts that label over the whole row, at its start (the country\'s box and the number\'s), not over the number\'s box alone', async () => {
      const view = await renderPhone({ scope: 'account_page' })
      const { getByText, getByTestId } = view
      const label = getByText('Phone number')
      // Not inside the row beside the country: its box would be what the label is over.
      expect(within(getByTestId('phone-row')).queryByText('Phone number')).toBeNull()
      const look = theme.native.components.account_page.scope.field.base
      const style = StyleSheet.flatten(label.props.style)
      expect(style.color).toBe(look.label_color)
      expect(style.marginBottom).toBe(look.label_gap)
      expect(style.alignSelf).toBeUndefined()
      expect(style.textAlign).toBeUndefined()
      // The label is the first thing of the field, the row its next.
      const holder = (node: any): any => node && typeof node === 'object' && (node.children ?? []).some((child: any) => child?.props?.testID === 'phone-row') ? node : (node?.children ?? []).map((child: any) => typeof child === 'object' ? holder(child) : null).find(Boolean)
      const field = holder(view.toJSON())
      expect(field.children[0].children).toContain('Phone number')
      expect(field.children[1].props.testID).toBe('phone-row')
    })

    it('draws no label of its own in a scope whose fields keep it inside the box', async () => {
      const inside: any = require('../../../../../../src/theme/engine').buildAppTheme({
        version: 2,
        product_type: require('../../../../../../src/theme/engine').THEME_PRODUCT_TYPE,
        values: { components: { account_page: { scope: { field: { base: { label_position: 'inside' } } } } } }
      })
      const view = renderWithProviders(<PhoneInputNumber {...phoneInputNumberWithErrorDefaults} scope='account_page' />, { themeOverrides: inside })
      await act(async () => {})
      expect(view.getByPlaceholderText('Phone number')).toBeTruthy()
    })

    it('takes the scope\'s own field error look for its message', async () => {
      const theme: any = require('../../../../../../src/theme/engine').buildAppTheme({
        version: 2,
        product_type: require('../../../../../../src/theme/engine').THEME_PRODUCT_TYPE,
        values: { components: { account_page: { scope: { field: { base: { error_color: '#123456', label_position: 'above' } } } } } }
      })
      const view = renderWithProviders(<PhoneInputNumber {...phoneInputNumberWithErrorDefaults} scope='account_page' />, { themeOverrides: theme })
      await act(async () => {})
      expect(StyleSheet.flatten(view.getByText('The Phone Number field is invalid').props.style).color).toBe('#123456')
    })
  })
})
