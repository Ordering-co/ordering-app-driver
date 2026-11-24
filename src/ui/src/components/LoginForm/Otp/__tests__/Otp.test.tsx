import '../../../../../../../jest/helpers/uiModuleMocks'
import React from 'react'
import { act, fireEvent } from '@testing-library/react-native'
const { captureDialogs } = require('../../../../../../../jest/helpers/confirmDialogs')
import { Alert, ScrollView, StyleSheet, TextInput } from 'react-native'

import { renderWithProviders } from '../../../../../../../jest/helpers/renderWithProviders'
import { buildAppTheme, defaultAppTheme, THEME_PRODUCT_TYPE } from '../../../../../../../src/theme/engine'

jest.mock('@ui', () => {
  const { buildD2AuthUiMock } = require('../../../../../../../jest/helpers/d2AuthUiMock')
  return buildD2AuthUiMock()
})

// The bottom bar's controller hands its props to its UI.
jest.mock('@components', () => {
  const mockOrdering = require('../../../../../../../jest/helpers/mockOrdering')
  const { renderUiController } = require('../../../../../../../jest/helpers/d1ShellDefaults')
  return { ...mockOrdering, FloatingButton: renderUiController({}) }
})

import { Otp } from '..'

const baseProps = () => ({
  pinCount: 6,
  willVerifyOtpState: true,
  setWillVerifyOtpState: jest.fn(),
  handleLoginOtp: jest.fn(),
  onSubmit: jest.fn(),
  setAlertState: jest.fn(),
  formState: { loading: false }
})

const themed = (values: Record<string, unknown>) =>
  buildAppTheme({ version: 2, product_type: THEME_PRODUCT_TYPE, values })

/** The focus of a text field (one mock for every field of a test) and the fields it was asked on. */
const focus = TextInput.prototype.focus as jest.Mock
const focusedFields = () => focus.mock.contexts.map((field: any) => field.props.testID)

describe('Otp', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    focus.mockClear()
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  it('draws the code in the app\'s code entry, one cell per digit', () => {
    const { getByTestId, getByLabelText } = renderWithProviders(<Otp {...baseProps()} pinCount={4} />)
    expect(getByLabelText('Enter verification code')).toBeTruthy()
    expect(getByTestId('otp-code-field').props.maxLength).toBe(4)
  })

  it('puts the keyboard on the code half a second after the screen opens', () => {
    const { getByTestId } = renderWithProviders(<Otp {...baseProps()} />)
    // Never while the screen mounts.
    expect(getByTestId('otp-code-field').props.autoFocus).toBeFalsy()
    act(() => {
      jest.advanceTimersByTime(499)
    })
    expect(focus).not.toHaveBeenCalled()

    act(() => {
      jest.advanceTimersByTime(1)
    })
    expect(focusedFields()).toEqual(['otp-code-field'])
  })

  it('asks the same field for the focus at each request, without mounting it again', () => {
    const props = baseProps()
    const { getByTestId, rerender } = renderWithProviders(<Otp {...props} />)
    act(() => {
      jest.advanceTimersByTime(1000)
    })
    const first = getByTestId('otp-code-field')
    fireEvent.changeText(first, '12')

    rerender(<Otp {...props} isAlertOpen />)
    rerender(<Otp {...props} isAlertOpen={false} />)
    act(() => {
      jest.advanceTimersByTime(1000)
    })
    const second = getByTestId('otp-code-field')
    expect(focusedFields()).toEqual(['otp-code-field', 'otp-code-field'])
    expect(second).toBe(first)
    // What was typed stays.
    expect(second.props.value).toBe('12')
  })

  it('waits for the alert on top to be dismissed before focusing the code', () => {
    const props = baseProps()
    const { rerender } = renderWithProviders(<Otp {...props} isAlertOpen />)

    act(() => {
      jest.advanceTimersByTime(1000)
    })
    expect(focus).not.toHaveBeenCalled()

    rerender(<Otp {...props} isAlertOpen={false} />)
    act(() => {
      jest.advanceTimersByTime(1000)
    })
    expect(focusedFields()).toEqual(['otp-code-field'])
  })

  it('does not focus the code once the screen is gone', () => {
    const { unmount } = renderWithProviders(<Otp {...baseProps()} />)
    unmount()
    act(() => {
      jest.advanceTimersByTime(1000)
    })
    expect(focus).not.toHaveBeenCalled()
  })

  it('focuses the code again after dismissing the error alert, with the wrong code cleared', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {})
    const dialogs = captureDialogs()
    const props = baseProps()
    const { getByTestId, rerender } = renderWithProviders(<Otp {...props} isAlertOpen />)
    fireEvent.changeText(getByTestId('otp-code-field'), '123456')
    expect(props.handleLoginOtp).toHaveBeenCalledWith('123456')

    rerender(<Otp {...props} isAlertOpen formState={{ loading: false, result: { error: true, result: 'Invalid code' } }} />)
    // The app's dialog (a notice with one button), never the system alert.
    expect(alertSpy).not.toHaveBeenCalled()
    expect(dialogs.last()).toEqual(expect.objectContaining({ title: 'Error', message: 'Invalid code', acceptText: 'Accept', notice: true }))
    expect(getByTestId('otp-code-field').props.value).toBe('')
    expect(focus).not.toHaveBeenCalled()

    act(() => {
      dialogs.accept()
      jest.advanceTimersByTime(1000)
    })
    expect(focusedFields()).toEqual(['otp-code-field'])
    dialogs.off()
  })

  it('shows no error for the answer the login already had when the screen opened (a refused password)', () => {
    // After a failed password login the OTP tab asks a code and opens this screen with that old error still in the
    // form's state: it is not this screen's. An error that comes after is.
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {})
    const dialogs = captureDialogs()
    const refused = { loading: false, result: { error: true, result: ['Wrong user or password.'] } }
    const props = { ...baseProps(), formState: refused }
    const { rerender } = renderWithProviders(<Otp {...props} />)
    expect(dialogs.requests).toHaveLength(0)
    // The same state handed again is still the old answer.
    rerender(<Otp {...props} formState={refused} isAlertOpen={false} />)
    expect(dialogs.requests).toHaveLength(0)
    rerender(<Otp {...props} formState={{ loading: false, result: { error: true, result: 'Invalid code' } }} />)
    expect(dialogs.requests).toHaveLength(1)
    expect(dialogs.last()).toEqual(expect.objectContaining({ title: 'Error', message: 'Invalid code', notice: true }))
    expect(alertSpy).not.toHaveBeenCalled()
    dialogs.off()
    alertSpy.mockRestore()
  })

  it('is a screen with its title, no back arrow and its Cancel pinned in the bottom bar (the way out)', () => {
    const props = baseProps()
    const { getByText, queryByLabelText, getByTestId } = renderWithProviders(<Otp {...props} />)
    expect(getByText('Enter verification code')).toBeTruthy()
    expect(queryByLabelText('Go back')).toBeNull()
    // The button is the bar's: pinned under the scroll, on the page's gutter, not a block of the scroll.
    const inScroll = (node: any) => {
      for (let up = node.parent; up; up = up.parent) if (up.type === ScrollView) return true
      return false
    }
    expect(inScroll(getByTestId('otp-cancel'))).toBe(false)
    expect(inScroll(getByText('10:00'))).toBe(true)
    fireEvent.press(getByTestId('otp-cancel'))
    expect(props.setWillVerifyOtpState).toHaveBeenCalledWith(false)
  })

  it('submits the code when its last digit is typed and supports cancel', () => {
    const props = baseProps()
    const { getByTestId, getByRole } = renderWithProviders(<Otp {...props} />)
    fireEvent.changeText(getByTestId('otp-code-field'), '12345')
    expect(props.handleLoginOtp).not.toHaveBeenCalled()
    fireEvent.changeText(getByTestId('otp-code-field'), '123456')
    expect(props.handleLoginOtp).toHaveBeenCalledWith('123456')
    fireEvent.press(getByRole('button', { name: 'Cancel' }))
    expect(props.setWillVerifyOtpState).toHaveBeenCalledWith(false)
  })

  it('shows time expired alert when countdown reaches zero', () => {
    const props = baseProps()
    renderWithProviders(<Otp {...props} />)

    act(() => {
      jest.advanceTimersByTime(600000)
    })

    expect(props.setAlertState).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Time is up' })
    )
  })

  it('keeps resend off for the first 80 seconds, then calls onSubmit', () => {
    const props = baseProps()
    const { getByRole } = renderWithProviders(<Otp {...props} />)
    expect(getByRole('link', { name: 'Resend code' }).props.accessibilityState.disabled).toBe(true)
    fireEvent.press(getByRole('link', { name: 'Resend code' }))
    expect(props.onSubmit).not.toHaveBeenCalled()

    act(() => {
      jest.advanceTimersByTime(81000)
    })

    fireEvent.press(getByRole('link', { name: 'Resend code' }))
    expect(props.onSubmit).toHaveBeenCalled()
    expect(props.setAlertState).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'The code has been sent' })
    )
  })

  it('paints the countdown in the timer of the theme, in its expired color at zero', () => {
    const theme: any = themed({ components: { timer: { base: { color: '#112233', expired_color: '#445566' } } } })
    const { getByText } = renderWithProviders(<Otp {...baseProps()} />, { themeOverrides: theme })
    expect(StyleSheet.flatten(getByText('10:00').props.style).color).toBe('#112233')

    act(() => {
      jest.advanceTimersByTime(600000)
    })
    expect(StyleSheet.flatten(getByText('00:00').props.style).color).toBe('#445566')
  })

  it('draws the countdown as a tinted pill of the timer\'s own height, the digits centered in it', () => {
    const theme = defaultAppTheme()
    const { getByText } = renderWithProviders(<Otp {...baseProps()} />)
    const text = getByText('10:00')
    // The pill is the view around the text (the text primitive may wrap it once).
    let node: any = text.parent
    while (node && StyleSheet.flatten(node.props.style)?.height === undefined) node = node.parent
    const pill = StyleSheet.flatten(node.props.style)
    const timer = theme.native.components.timer.base
    expect(pill).toMatchObject({ height: timer.height, backgroundColor: timer.background, borderRadius: timer.radius, paddingHorizontal: timer.padding_x, justifyContent: 'center' })
    expect(timer.height).toBe(32)
    expect(StyleSheet.flatten(text.props.style)).toMatchObject({ color: theme.native.tokens.color.text, fontSize: 18 })
  })

  it('writes the countdown with the app\'s one format, zero-padded, as the phone verification\'s (decision H4)', () => {
    const { getByText, queryByText } = renderWithProviders(<Otp {...baseProps()} />)
    expect(getByText('10:00')).toBeTruthy()
    act(() => {
      jest.advanceTimersByTime(1000)
    })
    expect(getByText('09:59')).toBeTruthy()
    expect(queryByText('9:59')).toBeNull()
  })

  it('draws Cancel as the auth form\'s cancel slot says: neutral outline by default (decision H5)', () => {
    const color = (node: any) => StyleSheet.flatten(node.props.style).color
    const { getByText } = renderWithProviders(<Otp {...baseProps()} />)
    expect(color(getByText('Cancel'))).toBe(defaultAppTheme().native.components.button.variants.neutral.outline.color)

    const custom: any = themed({ components: { auth_form: { slots: { cancel: { color: 'danger', appearance: 'solid' } } } } })
    const own = renderWithProviders(<Otp {...baseProps()} />, { themeOverrides: custom })
    expect(color(own.getByText('Cancel'))).toBe(custom.native.components.button.variants.danger.solid.color)
  })

  it('takes the auth form\'s own timer when the theme scopes one', () => {
    const theme: any = themed({
      components: {
        timer: { base: { color: '#112233' } },
        auth_form: { scope: { timer: { base: { color: '#778899' } } } }
      }
    })
    const { getByText } = renderWithProviders(<Otp {...baseProps()} />, { themeOverrides: theme })
    expect(StyleSheet.flatten(getByText('10:00').props.style).color).toBe('#778899')
  })
})
