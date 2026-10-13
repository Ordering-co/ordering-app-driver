import '../../../../../../jest/helpers/registerD5NativeMocks'

import React from 'react'
import { fireEvent, waitFor } from '@testing-library/react-native'

jest.mock('@components', () => {
  const mockOrdering = require('../../../../../../jest/helpers/mockOrdering')
  const { d4ConfigState } = require('../../../../../../jest/helpers/d4LegacyDefaults')
  return {
    ...mockOrdering,
    useConfig: jest.fn(() => [d4ConfigState]),
    useUtils: jest.fn(() => [{}, {}])
  }
})

import { PhoneInputNumber } from '..'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import {
  phoneInputNumberDefaults,
  phoneInputNumberWithErrorDefaults
} from '../../../../../../jest/helpers/d5StoresDefaults'

describe('PhoneInputNumber', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders phone input placeholder', () => {
    const { getByPlaceholderText, getByTestId } = renderWithProviders(
      <PhoneInputNumber {...phoneInputNumberDefaults} />
    )
    expect(getByTestId('phone-number-input')).toBeTruthy()
    expect(getByPlaceholderText('Phone number')).toBeTruthy()
  })

  it('shows data error when provided', () => {
    const { getByText } = renderWithProviders(
      <PhoneInputNumber {...phoneInputNumberWithErrorDefaults} />
    )
    expect(getByText('The Phone Number field is invalid')).toBeTruthy()
  })

  it('notifies handleData for a valid phone number', async () => {
    const handleData = jest.fn()
    const { getByTestId } = renderWithProviders(
      <PhoneInputNumber {...phoneInputNumberDefaults} handleData={handleData} />
    )
    fireEvent.changeText(getByTestId('phone-number-text'), '+15551234567')
    await waitFor(() => {
      expect(handleData).toHaveBeenCalledWith(
        expect.objectContaining({
          error: '',
          phone: expect.objectContaining({
            country_phone_code: '1'
          })
        })
      )
    })
  })

  it('notifies handleData with invalid error for short number', async () => {
    const handleData = jest.fn()
    const { getByTestId } = renderWithProviders(
      <PhoneInputNumber {...phoneInputNumberDefaults} handleData={handleData} />
    )
    fireEvent.changeText(getByTestId('phone-number-text'), '+1555')
    await waitFor(() => {
      expect(handleData).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'The Phone Number field is invalid'
        })
      )
    })
  })
})
