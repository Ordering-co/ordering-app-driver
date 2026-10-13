import React from 'react'
import { act, fireEvent } from '@testing-library/react-native'
import { Alert } from 'react-native'

import { renderWithProviders } from '../../../../../../../jest/helpers/renderWithProviders'

const mockOtpFocusField = jest.fn()
const mockOtpBlurAllFields = jest.fn()

jest.mock('@twotalltotems/react-native-otp-input', () => {
  const React = require('react')
  const { View, TouchableOpacity } = require('react-native')
  return React.forwardRef((props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({
      focusField: mockOtpFocusField,
      blurAllFields: mockOtpBlurAllFields
    }))
    return React.createElement(
      View,
      { testID: 'otp-input-view' },
      React.createElement(TouchableOpacity, {
        testID: 'otp-fill-code',
        onPress: () => props.onCodeFilled?.('123456')
      })
    )
  })
})

jest.mock('@ui', () => {
  const { buildD2AuthUiMock } = require('../../../../../../../jest/helpers/d2AuthUiMock')
  return buildD2AuthUiMock()
})

import { Otp } from '..'

describe('Otp', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    mockOtpFocusField.mockClear()
    mockOtpBlurAllFields.mockClear()
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  it('blurs before focusing so the field is not already focused and ignored', () => {
    const baseProps = {
      pinCount: 6,
      willVerifyOtpState: true,
      setWillVerifyOtpState: jest.fn(),
      handleLoginOtp: jest.fn(),
      onSubmit: jest.fn(),
      setAlertState: jest.fn(),
      formState: { loading: false }
    }
    const { rerender } = renderWithProviders(<Otp {...baseProps} isAlertOpen />)

    rerender(<Otp {...baseProps} isAlertOpen={false} />)
    act(() => {
      jest.advanceTimersByTime(1000)
    })

    expect(mockOtpBlurAllFields).toHaveBeenCalled()
    expect(mockOtpFocusField).toHaveBeenCalledWith(0)
    expect(mockOtpBlurAllFields.mock.invocationCallOrder[0])
      .toBeLessThan(mockOtpFocusField.mock.invocationCallOrder[0])
  })

  it('focuses the first box every time the verification screen is opened', () => {
    const { rerender } = renderWithProviders(
      <Otp
        pinCount={6}
        willVerifyOtpState
        setWillVerifyOtpState={jest.fn()}
        handleLoginOtp={jest.fn()}
        onSubmit={jest.fn()}
        setAlertState={jest.fn()}
        formState={{ loading: false }}
      />
    )

    act(() => {
      jest.advanceTimersByTime(1000)
    })
    expect(mockOtpFocusField).toHaveBeenCalledWith(0)

    mockOtpFocusField.mockClear()
    rerender(
      <Otp
        pinCount={6}
        willVerifyOtpState={false}
        setWillVerifyOtpState={jest.fn()}
        handleLoginOtp={jest.fn()}
        onSubmit={jest.fn()}
        setAlertState={jest.fn()}
        formState={{ loading: false }}
      />
    )
    rerender(
      <Otp
        pinCount={6}
        willVerifyOtpState
        setWillVerifyOtpState={jest.fn()}
        handleLoginOtp={jest.fn()}
        onSubmit={jest.fn()}
        setAlertState={jest.fn()}
        formState={{ loading: false }}
      />
    )

    act(() => {
      jest.advanceTimersByTime(1000)
    })
    expect(mockOtpFocusField).toHaveBeenCalledWith(0)
  })

  it('focuses the first box again once the alert on top is dismissed', () => {
    const baseProps = {
      pinCount: 6,
      willVerifyOtpState: true,
      setWillVerifyOtpState: jest.fn(),
      handleLoginOtp: jest.fn(),
      onSubmit: jest.fn(),
      setAlertState: jest.fn(),
      formState: { loading: false }
    }
    const { rerender } = renderWithProviders(<Otp {...baseProps} isAlertOpen />)

    act(() => {
      jest.advanceTimersByTime(1000)
    })
    expect(mockOtpFocusField).not.toHaveBeenCalled()

    rerender(<Otp {...baseProps} isAlertOpen={false} />)
    act(() => {
      jest.advanceTimersByTime(1000)
    })
    expect(mockOtpFocusField).toHaveBeenCalledWith(0)
  })

  it('focuses the first box again after dismissing the error alert', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {})
    renderWithProviders(
      <Otp
        pinCount={6}
        willVerifyOtpState
        setWillVerifyOtpState={jest.fn()}
        handleLoginOtp={jest.fn()}
        onSubmit={jest.fn()}
        setAlertState={jest.fn()}
        formState={{ loading: false, result: { error: true, result: 'Invalid code' } }}
      />
    )

    act(() => {
      jest.advanceTimersByTime(1000)
    })
    mockOtpFocusField.mockClear()

    const buttons: any = alertSpy.mock.calls[0][2]
    act(() => {
      buttons[0].onPress()
      jest.advanceTimersByTime(1000)
    })

    expect(mockOtpFocusField).toHaveBeenCalledWith(0)
  })

  it('submits code and supports cancel', () => {
    const handleLoginOtp = jest.fn()
    const setWillVerifyOtpState = jest.fn()
    const setAlertState = jest.fn()
    const { getByTestId, getByText } = renderWithProviders(
      <Otp
        pinCount={6}
        willVerifyOtpState
        setWillVerifyOtpState={setWillVerifyOtpState}
        handleLoginOtp={handleLoginOtp}
        onSubmit={jest.fn()}
        setAlertState={setAlertState}
        formState={{ loading: false }}
      />
    )
    fireEvent.press(getByTestId('otp-fill-code'))
    expect(handleLoginOtp).toHaveBeenCalledWith('123456')
    fireEvent.press(getByText('Cancel'))
    expect(setWillVerifyOtpState).toHaveBeenCalledWith(false)
  })

  it('shows time expired alert when countdown reaches zero', () => {
    const setAlertState = jest.fn()
    renderWithProviders(
      <Otp
        pinCount={6}
        willVerifyOtpState
        setWillVerifyOtpState={jest.fn()}
        handleLoginOtp={jest.fn()}
        onSubmit={jest.fn()}
        setAlertState={setAlertState}
        formState={{ loading: false }}
      />
    )

    act(() => {
      jest.advanceTimersByTime(600000)
    })

    expect(setAlertState).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Time is up' })
    )
  })

  it('calls onSubmit when resend is pressed after cooldown', () => {
    const onSubmit = jest.fn()
    const setAlertState = jest.fn()
    const { getByText } = renderWithProviders(
      <Otp
        pinCount={6}
        willVerifyOtpState
        setWillVerifyOtpState={jest.fn()}
        handleLoginOtp={jest.fn()}
        onSubmit={onSubmit}
        setAlertState={setAlertState}
        formState={{ loading: false }}
      />
    )

    act(() => {
      jest.advanceTimersByTime(81000)
    })

    fireEvent.press(getByText('Resend code'))
    expect(onSubmit).toHaveBeenCalled()
    expect(setAlertState).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'The code has been sent' })
    )
  })
})
