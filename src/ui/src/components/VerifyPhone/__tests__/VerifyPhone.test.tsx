import React from 'react'
import { act, fireEvent } from '@testing-library/react-native'

import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'

jest.mock('react-native-loading-spinner-overlay', () => {
  const { View } = require('react-native')
  return (props: any) => <View testID="spinner-overlay" {...props} />
})

import { VerifyPhone } from '..'

describe('VerifyPhone', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders verify phone heading and code inputs', () => {
    const { getByText, getAllByPlaceholderText } = renderWithProviders(
      <VerifyPhone
        phone={{ cellphone: '5551234567', country_phone_code: 1 }}
        verifyPhoneState={{ loading: false }}
        checkPhoneCodeState={{ loading: false, result: {} }}
        handleCheckPhoneCode={jest.fn()}
        handleVerifyCodeClick={jest.fn()}
        setCheckPhoneCodeState={jest.fn()}
      />
    )
    expect(getByText('Verify Phone')).toBeTruthy()
    expect(getByText(/ending with/)).toBeTruthy()
    expect(getAllByPlaceholderText('0')).toHaveLength(4)
  })

  it('calls resend handler when timer expires', () => {
    const handleVerifyCodeClick = jest.fn()
    const { getByText } = renderWithProviders(
      <VerifyPhone
        phone={{ cellphone: '5551234567', country_phone_code: 1 }}
        verifyPhoneState={{ loading: false }}
        checkPhoneCodeState={{ loading: false, result: {} }}
        handleCheckPhoneCode={jest.fn()}
        handleVerifyCodeClick={handleVerifyCodeClick}
        setCheckPhoneCodeState={jest.fn()}
      />
    )

    act(() => {
      jest.advanceTimersByTime(600000)
    })

    fireEvent.press(getByText('Send Again'))
    expect(handleVerifyCodeClick).toHaveBeenCalled()
  })

  it('submits verification code when all digits are entered', () => {
    const handleCheckPhoneCode = jest.fn()
    const { getAllByPlaceholderText } = renderWithProviders(
      <VerifyPhone
        phone={{ cellphone: '5551234567', country_phone_code: 1 }}
        formValues={{ email: 'user@test.com' }}
        verifyPhoneState={{ loading: false }}
        checkPhoneCodeState={{ loading: false, result: {} }}
        handleCheckPhoneCode={handleCheckPhoneCode}
        handleVerifyCodeClick={jest.fn()}
        setCheckPhoneCodeState={jest.fn()}
      />
    )
    const inputs = getAllByPlaceholderText('0')
    inputs.forEach((input, index) => {
      fireEvent.changeText(input, `${index + 1}`)
    })
    expect(handleCheckPhoneCode).toHaveBeenCalled()
  })
})
