import React from 'react'
import { act, fireEvent } from '@testing-library/react-native'
import { ScrollView, StyleSheet } from 'react-native'

import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { defaultAppTheme } from '../../../../../../src/theme/engine'

// The bottom bar's controller hands its props to its UI.
jest.mock('@components', () => {
  const mockOrdering = require('../../../../../../jest/helpers/mockOrdering')
  const { renderUiController } = require('../../../../../../jest/helpers/d1ShellDefaults')
  return { ...mockOrdering, FloatingButton: renderUiController({}) }
})

import { VerifyPhone } from '..'

const baseProps = () => ({
  phone: { cellphone: '5551234567', country_phone_code: 1 },
  verifyPhoneState: { loading: false },
  checkPhoneCodeState: { loading: false, result: {} },
  handleCheckPhoneCode: jest.fn(),
  handleVerifyCodeClick: jest.fn(),
  setCheckPhoneCodeState: jest.fn()
})

describe('VerifyPhone', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders the hint, the countdown and the four digits of the code', () => {
    const { getByText, getByTestId, getByLabelText } = renderWithProviders(<VerifyPhone {...baseProps()} />)
    expect(getByText(/ending with \*\*67/)).toBeTruthy()
    expect(getByText('10:00')).toBeTruthy()
    expect(getByLabelText('Enter verification code')).toBeTruthy()
    expect(getByTestId('verify-phone-code-field').props.maxLength).toBe(4)
  })

  describe('the way out', () => {
    const buttonLabel = (screen: any, name: string) => StyleSheet.flatten(screen.getByText(name).props.style)

    it('draws a Cancel in the bottom bar, under the scroll, that closes the screen (it had only the device\'s back)', () => {
      const onClose = jest.fn()
      const screen = renderWithProviders(<VerifyPhone {...baseProps()} onClose={onClose} />)
      const cancel = screen.getByRole('button', { name: 'Cancel' })
      let node: any = cancel
      let inScroll = false
      for (node = node.parent; node; node = node.parent) if (node.type === ScrollView) inScroll = true
      expect(inScroll).toBe(false)
      expect(onClose).not.toHaveBeenCalled()
      fireEvent.press(cancel)
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('wears the auth form\'s cancel slot: neutral outline by default, as the login code screen\'s Cancel', () => {
      const screen = renderWithProviders(<VerifyPhone {...baseProps()} onClose={jest.fn()} />)
      expect(buttonLabel(screen, 'Cancel').color).toBe(defaultAppTheme().native.components.button.variants.neutral.outline.color)
    })

    it('is a screen with its title and no back arrow (Cancel is the way out)', () => {
      const screen = renderWithProviders(<VerifyPhone {...baseProps()} onClose={jest.fn()} />)
      expect(screen.getByText('Verify Phone')).toBeTruthy()
      expect(screen.queryByLabelText('Go back')).toBeNull()
    })

    it('does not fail when its host gives no way to close', () => {
      const screen = renderWithProviders(<VerifyPhone {...baseProps()} />)
      expect(() => fireEvent.press(screen.getByRole('button', { name: 'Cancel' }))).not.toThrow()
    })
  })

  it('writes the countdown with the app\'s one format, zero-padded, as the login code\'s (decision H4)', () => {
    const { getByText } = renderWithProviders(<VerifyPhone {...baseProps()} />)
    act(() => {
      jest.advanceTimersByTime(1000)
    })
    expect(getByText('09:59')).toBeTruthy()
    act(() => {
      jest.advanceTimersByTime(539000)
    })
    expect(getByText('01:00')).toBeTruthy()
  })

  it('counts down again from ten minutes when the code is sent again', () => {
    const { getByText, getByRole, getByTestId } = renderWithProviders(<VerifyPhone {...baseProps()} />)
    act(() => {
      jest.advanceTimersByTime(600000)
    })
    expect(getByText('00:00')).toBeTruthy()
    fireEvent.press(getByRole('link', { name: 'Send Again' }))
    expect(getByText('10:00')).toBeTruthy()
    expect(getByTestId('verify-phone-code-field').props.editable).toBe(true)
    act(() => {
      jest.advanceTimersByTime(2000)
    })
    expect(getByText('09:58')).toBeTruthy()
  })

  it('calls resend handler when timer expires', () => {
    const props = baseProps()
    const { getByRole } = renderWithProviders(<VerifyPhone {...props} />)

    act(() => {
      jest.advanceTimersByTime(600000)
    })

    fireEvent.press(getByRole('link', { name: 'Send Again' }))
    expect(props.handleVerifyCodeClick).toHaveBeenCalled()
    expect(props.setCheckPhoneCodeState).toHaveBeenCalled()
  })

  it('submits verification code when all digits are entered', () => {
    const props = baseProps()
    const { getByTestId } = renderWithProviders(
      <VerifyPhone {...props} formValues={{ email: 'user@test.com' }} />
    )
    fireEvent.changeText(getByTestId('verify-phone-code-field'), '123')
    expect(props.handleCheckPhoneCode).not.toHaveBeenCalled()
    fireEvent.changeText(getByTestId('verify-phone-code-field'), '1234')
    expect(props.handleCheckPhoneCode).toHaveBeenCalledWith({
      email: 'user@test.com',
      cellphone: '5551234567',
      country_phone_code: '+1',
      code: '1234'
    })
  })

  it('paints the countdown in the timer\'s expired color and locks the code when the time is up', () => {
    const theme: any = defaultAppTheme()
    const timer = theme.native.components.timer.base
    const { getByText, getByTestId } = renderWithProviders(<VerifyPhone {...baseProps()} />)
    expect(StyleSheet.flatten(getByText('10:00').props.style).color).toBe(timer.color)
    expect(getByTestId('verify-phone-code-field').props.editable).toBe(true)

    act(() => {
      jest.advanceTimersByTime(600000)
    })
    expect(StyleSheet.flatten(getByText('00:00').props.style).color).toBe(timer.expired_color)
    expect(getByTestId('verify-phone-code-field').props.editable).toBe(false)
  })

  it('lists the errors of the check in the field\'s error look', () => {
    const theme: any = defaultAppTheme()
    const { getByText } = renderWithProviders(
      <VerifyPhone
        {...baseProps()}
        checkPhoneCodeState={{ loading: false, result: { error: true, result: ['Invalid code'] } }}
      />
    )
    const error = StyleSheet.flatten(getByText('* Invalid code').props.style)
    expect(error.color).toBe(theme.native.components.field.base.error_color)
    // Under a centered code entry, the error is centered too.
    expect(error.textAlign).toBe('center')
  })

  it('covers the screen with the app\'s loading overlay while the code is checked', () => {
    const { queryByTestId, rerender } = renderWithProviders(<VerifyPhone {...baseProps()} />)
    expect(queryByTestId('loading-overlay')).toBeNull()
    rerender(<VerifyPhone {...baseProps()} checkPhoneCodeState={{ loading: true }} />)
    expect(queryByTestId('loading-overlay')).toBeTruthy()
  })
})
