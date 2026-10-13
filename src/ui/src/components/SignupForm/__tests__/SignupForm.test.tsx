import React from 'react'
import { fireEvent } from '@testing-library/react-native'

import { useToast } from '@components'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'

jest.mock('react-native-loading-spinner-overlay', () => {
  const { View } = require('react-native')
  return (props: any) => <View testID="spinner-overlay" {...props} />
})

jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => {
  const React = require('react')
  const { Pressable, Text } = require('react-native')
  return (props: any) =>
    React.createElement(
      Pressable,
      { testID: `mci-${props.name}`, onPress: props.onPress },
      React.createElement(Text, null, props.name)
    )
})

jest.mock('@ui', () => {
  const { buildD2AuthUiMock } = require('../../../../../../jest/helpers/d2AuthUiMock')
  return buildD2AuthUiMock()
})

jest.mock('@components', () => {
  const mockOrdering = require('../../../../../../jest/helpers/mockOrdering')
  const { renderUiController } = require('../../../../../../jest/helpers/d1ShellDefaults')
  const { signupFormDefaults } = require('../../../../../../jest/helpers/d2AuthDefaults')
  return {
    ...mockOrdering,
    SignupForm: renderUiController(signupFormDefaults)
  }
})

import { SignupForm } from '..'

describe('SignupForm', () => {
  it('renders signup fields', () => {
    const { getByPlaceholderText, getAllByText } = renderWithProviders(<SignupForm />)
    expect(getByPlaceholderText('Email')).toBeTruthy()
    expect(getByPlaceholderText('Name')).toBeTruthy()
    expect(getByPlaceholderText('Password')).toBeTruthy()
    expect(getAllByText('Sign Up').length).toBeGreaterThan(0)
  })

  it('shows loading spinner while submitting', () => {
    const { getByTestId } = renderWithProviders(
      <SignupForm formState={{ loading: true, result: { result: null, error: false } }} />
    )
    expect(getByTestId('spinner-overlay')).toBeTruthy()
  })

  it('renders verify code button for cellphone signup', () => {
    const { getByText } = renderWithProviders(<SignupForm useSignupByCellphone />)
    expect(getByText('Get Verify Code')).toBeTruthy()
  })

  it('shows toast when verify phone returns an error', () => {
    const showToast = jest.fn()
    ;(useToast as jest.Mock).mockReturnValue([, { showToast }])
    renderWithProviders(
      <SignupForm
        verifyPhoneState={{
          loading: false,
          result: { error: true, result: ['Invalid phone'] }
        }}
      />
    )
    expect(showToast).toHaveBeenCalled()
  })

  it('opens verify phone modal after successful code send', () => {
    const { getByText } = renderWithProviders(
      <SignupForm
        verifyPhoneState={{
          loading: false,
          result: { error: false, result: 'OK' }
        }}
      />
    )
    expect(getByText('Verify Phone')).toBeTruthy()
  })

  it('toggles password visibility icon', () => {
    const { getByTestId } = renderWithProviders(<SignupForm />)
    fireEvent.press(getByTestId('mci-eye-outline'))
    expect(getByTestId('mci-eye-off-outline')).toBeTruthy()
  })
})
