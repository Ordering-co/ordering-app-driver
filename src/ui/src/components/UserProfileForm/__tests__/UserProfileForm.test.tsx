import React from 'react'
import { Alert } from 'react-native'
import { fireEvent } from '@testing-library/react-native'

import { useSession, useConfig, useValidationFields } from '@components'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'

jest.mock('react-native-image-picker', () => ({
  launchImageLibrary: jest.fn()
}))

jest.mock('rn-placeholder', () => {
  const { View } = require('react-native')
  return {
    Placeholder: ({ children }: any) => <View testID="placeholder">{children}</View>,
    PlaceholderLine: () => <View testID="placeholder-line" />,
    Fade: {}
  }
})

jest.mock('@ui', () => {
  const { buildD2AuthUiMock } = require('../../../../../../jest/helpers/d2AuthUiMock')
  return buildD2AuthUiMock()
})

jest.mock('@components', () => {
  const mockOrdering = require('../../../../../../jest/helpers/mockOrdering')
  const { renderUiController } = require('../../../../../../jest/helpers/d1ShellDefaults')
  const { userProfileDefaults } = require('../../../../../../jest/helpers/d2AuthDefaults')
  return {
    ...mockOrdering,
    UserFormDetails: renderUiController(userProfileDefaults)
  }
})

import { UserProfileForm } from '..'

describe('UserProfileForm', () => {
  beforeEach(() => {
    ;(useSession as jest.Mock).mockReturnValue([
      {
        auth: true,
        sessionLoading: false,
        user: {
          id: 1,
          level: 4,
          email: 'user@test.com',
          name: 'Test User',
          cellphone: '5551234567',
          country_phone_code: 1
        }
      },
      { logout: jest.fn() }
    ])
    ;(useConfig as jest.Mock).mockReturnValue([{
      configs: {
        allow_driver_update_data: { value: '1' },
        allow_delete_driver_account: { value: '1' }
      }
    }])
    ;(useValidationFields as jest.Mock).mockReturnValue([
      { loading: false },
      { loadOriginalValidationFields: jest.fn() }
    ])
  })

  it('renders profile fields and actions', () => {
    const { getByText, getByTestId } = renderWithProviders(<UserProfileForm />)
    expect(getByText('Profile')).toBeTruthy()
    expect(getByText('Edit')).toBeTruthy()
    expect(getByTestId('language-selector-stub')).toBeTruthy()
  })

  it('enters edit mode from profile actions', () => {
    const toggleIsEdit = jest.fn()
    const { getByText } = renderWithProviders(<UserProfileForm toggleIsEdit={toggleIsEdit} />)
    fireEvent.press(getByText('Edit'))
    expect(toggleIsEdit).toHaveBeenCalled()
  })

  it('navigates to sessions screen', () => {
    const navigate = jest.fn()
    const { getByText } = renderWithProviders(
      <UserProfileForm navigation={{ navigate }} />
    )
    fireEvent.press(getByText('Sessions'))
    expect(navigate).toHaveBeenCalledWith('Sessions')
  })

  it('shows schedule section for driver', () => {
    const { getByText } = renderWithProviders(<UserProfileForm />)
    expect(getByText('Schedule')).toBeTruthy()
  })

  it('hides the Stripe account and payouts while Stripe Connect payouts are disabled', () => {
    const { queryByText } = renderWithProviders(<UserProfileForm />)
    expect(queryByText('Stripe account')).toBeNull()
    expect(queryByText('Payouts')).toBeNull()
  })

  it('navigates to the Stripe account and payouts when Stripe Connect payouts are enabled', () => {
    ;(useConfig as jest.Mock).mockReturnValue([{
      configs: { stripe_connect_payouts_enabled: { value: '1' } }
    }])
    const navigate = jest.fn()
    const { getByText } = renderWithProviders(
      <UserProfileForm navigation={{ navigate }} />
    )
    fireEvent.press(getByText('Stripe account'))
    expect(navigate).toHaveBeenLastCalledWith('StripeConnectAccount')
    fireEvent.press(getByText('Payouts'))
    expect(navigate).toHaveBeenLastCalledWith('Payouts')
  })

  it('hides the Stripe account and payouts for a user that is not a driver', () => {
    ;(useSession as jest.Mock).mockReturnValue([
      { auth: true, sessionLoading: false, user: { id: 1, level: 0, email: 'admin@test.com', name: 'Admin' } },
      { logout: jest.fn() }
    ])
    ;(useConfig as jest.Mock).mockReturnValue([{
      configs: { stripe_connect_payouts_enabled: { value: '1' } }
    }])
    const { queryByText } = renderWithProviders(<UserProfileForm />)
    expect(queryByText('Stripe account')).toBeNull()
    expect(queryByText('Payouts')).toBeNull()
  })

  it('confirms account removal', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_title, _msg, buttons: any) => {
      buttons?.[0]?.onPress?.()
    })
    const handleRemoveAccount = jest.fn()
    const { getByText } = renderWithProviders(
      <UserProfileForm handleRemoveAccount={handleRemoveAccount} />
    )
    fireEvent.press(getByText('Remove account'))
    expect(alertSpy).toHaveBeenCalled()
    expect(handleRemoveAccount).toHaveBeenCalledWith(1)
    alertSpy.mockRestore()
  })

  it('shows validation error state with refresh action', () => {
    const loadOriginalValidationFields = jest.fn()
    ;(useValidationFields as jest.Mock).mockReturnValue([
      { loading: false },
      { loadOriginalValidationFields }
    ])
    const { getByText } = renderWithProviders(
      <UserProfileForm validationFields={{ loading: false, error: ['Profile unavailable'] }} />
    )
    expect(getByText('Refresh profile')).toBeTruthy()
    fireEvent.press(getByText('Refresh profile'))
    expect(loadOriginalValidationFields).toHaveBeenCalledWith({ forceLoading: true })
  })

  it('shows loading placeholder while session loads', () => {
    ;(useSession as jest.Mock).mockReturnValue([
      {
        auth: true,
        sessionLoading: true,
        user: { id: 1, level: 4, email: 'user@test.com', name: 'Test User' }
      },
      { logout: jest.fn() }
    ])
    const { getAllByTestId } = renderWithProviders(<UserProfileForm />)
    expect(getAllByTestId('placeholder-line').length).toBeGreaterThan(0)
  })
})
