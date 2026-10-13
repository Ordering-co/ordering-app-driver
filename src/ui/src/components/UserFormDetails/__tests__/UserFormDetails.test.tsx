import React from 'react'
import { fireEvent } from '@testing-library/react-native'

import { useSession, useToast } from '@components'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { userFormDetailsDefaults } from '../../../../../../jest/helpers/d2AuthDefaults'

jest.mock('@ui', () => {
  const { buildD2AuthUiMock } = require('../../../../../../jest/helpers/d2AuthUiMock')
  return buildD2AuthUiMock()
})

import { UserFormDetailsUI } from '..'

describe('UserFormDetailsUI', () => {
  beforeEach(() => {
    ;(useSession as jest.Mock).mockReturnValue([
      {
        auth: true,
        user: {
          id: 1,
          email: 'user@test.com',
          name: 'Test User',
          cellphone: '5551234567',
          country_phone_code: 1
        }
      },
      { logout: jest.fn() }
    ])
  })

  it('renders editable profile fields', () => {
    const { getByPlaceholderText } = renderWithProviders(
      <UserFormDetailsUI {...userFormDetailsDefaults} />
    )
    expect(getByPlaceholderText('Name')).toBeTruthy()
    expect(getByPlaceholderText('Email')).toBeTruthy()
    expect(getByPlaceholderText('Password')).toBeTruthy()
  })

  it('shows update action when changes exist', () => {
    const { getByText } = renderWithProviders(
      <UserFormDetailsUI
        {...userFormDetailsDefaults}
        formState={{ loading: false, changes: { name: 'Updated' }, result: { error: false } }}
      />
    )
    expect(getByText('Update')).toBeTruthy()
  })

  it('calls cancel handler', () => {
    const handleCancelEdit = jest.fn()
    const { getByText } = renderWithProviders(
      <UserFormDetailsUI {...userFormDetailsDefaults} handleCancelEdit={handleCancelEdit} />
    )
    fireEvent.press(getByText('Cancel'))
    expect(handleCancelEdit).toHaveBeenCalled()
  })

  it('hides action buttons in checkout mode', () => {
    const { queryByText } = renderWithProviders(
      <UserFormDetailsUI {...userFormDetailsDefaults} isCheckout />
    )
    expect(queryByText('Cancel')).toBeNull()
  })

  it('shows toast when update returns an error', () => {
    const showToast = jest.fn()
    ;(useToast as jest.Mock).mockReturnValue([, { showToast }])
    renderWithProviders(
      <UserFormDetailsUI
        {...userFormDetailsDefaults}
        formState={{ loading: false, changes: {}, result: { error: true, result: ['Update failed'] } }}
      />
    )
    expect(showToast).toHaveBeenCalled()
  })
})
