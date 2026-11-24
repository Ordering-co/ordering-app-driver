import React from 'react'
import { Keyboard, ScrollView, StyleSheet } from 'react-native'
import { act, fireEvent, waitFor } from '@testing-library/react-native'

import { useToast } from '@components'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { buildAppTheme, defaultAppTheme, THEME_PRODUCT_TYPE } from '../../../../../../src/theme/engine'

jest.mock('@components', () => {
  const mockOrdering = require('../../../../../../jest/helpers/mockOrdering')
  const { renderUiController } = require('../../../../../../jest/helpers/d1ShellDefaults')
  const { forgotPasswordDefaults } = require('../../../../../../jest/helpers/d2AuthDefaults')
  return {
    ...mockOrdering,
    ToastType: { Info: 'info', Success: 'success', Warning: 'warning', Error: 'error' },
    // The bottom bar's controller hands its props to its UI, as the form's own does.
    FloatingButton: renderUiController({}),
    ForgotPasswordForm: renderUiController(forgotPasswordDefaults)
  }
})

import { ForgotPasswordForm } from '..'

const LEAD = "Enter your email address and we'll send a link to reset your password."
const idle = { loading: false, result: {} }
const sent = { loading: false, result: { error: false, result: 'OK' } }
const insideScroll = (node: any) => {
  for (let up = node.parent; up; up = up.parent) if (up.type === ScrollView) return true
  return false
}

describe('ForgotPasswordForm', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders email recovery form, its field named by a label over it', () => {
    const { getByLabelText, queryByPlaceholderText, getByText } = renderWithProviders(<ForgotPasswordForm />)
    expect(getByLabelText('Email')).toBeTruthy()
    // The label is above the box (as the profile's forms): the box has no placeholder of its own.
    expect(getByText('Email')).toBeTruthy()
    expect(queryByPlaceholderText('Email')).toBeNull()
    expect(getByText('Recover Password')).toBeTruthy()
    expect(getByText(LEAD)).toBeTruthy()
  })

  it('writes the text under the title as a lead: `body_lg`, muted, as the welcome screen and the tutorial (decision H7)', () => {
    const { typography, color } = defaultAppTheme().native.tokens
    const { getByText } = renderWithProviders(<ForgotPasswordForm />)
    const lead = StyleSheet.flatten(getByText(LEAD).props.style)
    expect(lead.fontSize).toBe(typography.body_lg.fontSize)
    expect(lead.lineHeight).toBe(typography.body_lg.lineHeight)
    expect(lead.color).toBe(color.text_muted)
  })

  it('keeps its header fixed above the scroll, the gutter on the scroll\'s content (decision H8)', () => {
    const { getByText, UNSAFE_getByType } = renderWithProviders(<ForgotPasswordForm />)
    expect(insideScroll(getByText('Forgot your password?'))).toBe(false)
    expect(insideScroll(getByText(LEAD))).toBe(true)
    const scroll = UNSAFE_getByType(ScrollView)
    expect(StyleSheet.flatten(scroll.props.style).paddingHorizontal).toBeUndefined()
    expect(StyleSheet.flatten(scroll.props.contentContainerStyle).paddingHorizontal).toBe(defaultAppTheme().native.tokens.layout.page_gutter)
  })

  it('pins the button to the bottom, under the scroll, in the bottom bar and keeps its back arrow', () => {
    const navigation = { goBack: jest.fn(), canGoBack: jest.fn(() => true) }
    const { getByRole, getByLabelText } = renderWithProviders(<ForgotPasswordForm navigation={navigation} />)
    expect(insideScroll(getByRole('button', { name: 'Recover Password' }))).toBe(false)
    fireEvent.press(getByLabelText('Go back'))
    expect(navigation.goBack).toHaveBeenCalled()
  })

  it('submits recovery email', async () => {
    const handleButtonForgotPasswordClick = jest.fn()
    const { getByLabelText, getByText } = renderWithProviders(
      <ForgotPasswordForm formState={idle} handleButtonForgotPasswordClick={handleButtonForgotPasswordClick} />
    )
    fireEvent.changeText(getByLabelText('Email'), 'user@example.com')
    fireEvent.press(getByText('Recover Password'))
    await waitFor(() => {
      expect(handleButtonForgotPasswordClick).toHaveBeenCalled()
    })
  })

  describe('the answer of the server stays on the screen', () => {
    const sendTo = async (email: string, props: Record<string, unknown> = {}) => {
      const click = jest.fn()
      const screen = renderWithProviders(<ForgotPasswordForm formState={idle} handleButtonForgotPasswordClick={click} {...props} />)
      fireEvent.changeText(screen.getByLabelText('Email'), email)
      fireEvent.press(screen.getByRole('button', { name: 'Recover Password' }))
      await waitFor(() => expect(click).toHaveBeenCalled())
      return { ...screen, click }
    }
    const answer = (screen: any, formState: any) => screen.rerender(
      <ForgotPasswordForm formState={formState} handleButtonForgotPasswordClick={screen.click} />
    )

    it('shows the link sent as a success notice with the address, not as a toast', async () => {
      const showToast = jest.fn()
      ;(useToast as jest.Mock).mockReturnValue([, { showToast }])
      const screen = await sendTo('user@example.com')
      expect(screen.queryByTestId('forgot-notice')).toBeNull()
      answer(screen, sent)
      expect(screen.getByTestId('forgot-notice')).toBeTruthy()
      expect(screen.getByText('Your link has been sent to the email: user@example.com')).toBeTruthy()
      // The notice is the theme's success one, in the form's column after the field.
      const alert = defaultAppTheme().native.components.alert.variants.success
      expect(StyleSheet.flatten(screen.getByTestId('forgot-notice').props.style).backgroundColor).toBe(alert.background)
      expect(insideScroll(screen.getByTestId('forgot-notice'))).toBe(true)
      expect(showToast).not.toHaveBeenCalled()
    })

    it('keeps the notice until the address is edited', async () => {
      const screen = await sendTo('user@example.com')
      answer(screen, sent)
      // Waiting, pressing or rerendering does not take it away.
      screen.rerender(<ForgotPasswordForm formState={{ ...sent }} handleButtonForgotPasswordClick={screen.click} />)
      expect(screen.getByTestId('forgot-notice')).toBeTruthy()
      fireEvent.changeText(screen.getByLabelText('Email'), 'other@example.com')
      expect(screen.queryByTestId('forgot-notice')).toBeNull()
      expect(screen.queryByText(/Your link has been sent/)).toBeNull()
    })

    it('shows the failure of the request as a danger notice, and the button sends again', async () => {
      const screen = await sendTo('user@example.com')
      answer(screen, { loading: false, result: { error: true, result: ['User not found'] } })
      const notice = screen.getByTestId('forgot-notice')
      expect(screen.getByText('User not found')).toBeTruthy()
      expect(StyleSheet.flatten(notice.props.style).backgroundColor).toBe(defaultAppTheme().native.components.alert.variants.danger.background)
      expect(screen.getByRole('button', { name: 'Recover Password' }).props.accessibilityState.disabled).toBe(false)
    })

    it('shows a failure that comes as a text (the network\'s) whole', async () => {
      const screen = await sendTo('user@example.com')
      answer(screen, { loading: false, result: { error: true, result: 'Network request failed' } })
      expect(screen.getByText('Network request failed')).toBeTruthy()
    })

    it('drops the old failure when a new request is sent', async () => {
      const screen = await sendTo('user@example.com')
      answer(screen, { loading: false, result: { error: true, result: ['User not found'] } })
      fireEvent.press(screen.getByRole('button', { name: 'Recover Password' }))
      await waitFor(() => expect(screen.click).toHaveBeenCalledTimes(2))
      expect(screen.queryByText('User not found')).toBeNull()
    })
  })

  describe('the validation of the email, under the field', () => {
    const submit = async (screen: any, email: string) => {
      fireEvent.changeText(screen.getByLabelText('Email'), email)
      fireEvent.press(screen.getByText('Recover Password'))
      await act(async () => { await Promise.resolve() })
    }

    it('writes the missing email under the field and sends nothing, with no toast', async () => {
      const showToast = jest.fn()
      ;(useToast as jest.Mock).mockReturnValue([, { showToast }])
      const handleButtonForgotPasswordClick = jest.fn()
      const screen = renderWithProviders(
        <ForgotPasswordForm formState={idle} handleButtonForgotPasswordClick={handleButtonForgotPasswordClick} />
      )
      await submit(screen, '')
      expect(await screen.findByText('The field Email is required')).toBeTruthy()
      expect(screen.getByTestId('error-email')).toBeTruthy()
      expect(handleButtonForgotPasswordClick).not.toHaveBeenCalled()
      expect(showToast).not.toHaveBeenCalled()
    })

    it('writes a malformed email under the field each time it is sent, then sends a good one', async () => {
      const handleButtonForgotPasswordClick = jest.fn()
      const screen = renderWithProviders(
        <ForgotPasswordForm formState={idle} handleButtonForgotPasswordClick={handleButtonForgotPasswordClick} />
      )
      await submit(screen, 'user@')
      expect(await screen.findByText('Invalid email address')).toBeTruthy()
      await submit(screen, 'user@')
      expect(screen.getByText('Invalid email address')).toBeTruthy()
      expect(handleButtonForgotPasswordClick).not.toHaveBeenCalled()
      await submit(screen, 'User@Example.com')
      await waitFor(() => expect(handleButtonForgotPasswordClick).toHaveBeenCalledWith({ email: 'user@example.com' }))
      expect(screen.queryByText('Invalid email address')).toBeNull()
    })

    it('writes the error as the app\'s field error, at the start under its field', async () => {
      const field = defaultAppTheme().native.components.field.base
      const screen = renderWithProviders(<ForgotPasswordForm formState={idle} />)
      await submit(screen, '')
      const style = StyleSheet.flatten((await screen.findByTestId('error-email')).props.style)
      expect(style.color).toBe(field.error_color)
      expect(style.marginTop).toBe(field.message_gap)
      expect(style.fontSize).toBe(field.error.fontSize)
    })
  })

  it('turns the button off once the link is sent', async () => {
    const handleButtonForgotPasswordClick = jest.fn()
    const { getByLabelText, getByRole, rerender } = renderWithProviders(
      <ForgotPasswordForm formState={idle} handleButtonForgotPasswordClick={handleButtonForgotPasswordClick} />
    )
    expect(getByRole('button', { name: 'Recover Password' }).props.accessibilityState.disabled).toBe(false)
    fireEvent.changeText(getByLabelText('Email'), 'user@example.com')
    fireEvent.press(getByRole('button', { name: 'Recover Password' }))
    await waitFor(() => expect(handleButtonForgotPasswordClick).toHaveBeenCalledTimes(1))
    rerender(<ForgotPasswordForm formState={sent} handleButtonForgotPasswordClick={handleButtonForgotPasswordClick} />)
    const done = getByRole('button', { name: 'Link Sent' })
    expect(done.props.accessibilityState.disabled).toBe(true)
    fireEvent.press(done)
    expect(handleButtonForgotPasswordClick).toHaveBeenCalledTimes(1)
  })

  it('closes the keyboard when a valid email is sent, and keeps it to fix a missing one', async () => {
    const dismiss = jest.spyOn(Keyboard, 'dismiss').mockImplementation(() => {})
    try {
      const { getByLabelText, getByRole } = renderWithProviders(
        <ForgotPasswordForm formState={idle} handleButtonForgotPasswordClick={jest.fn()} />
      )
      fireEvent.press(getByRole('button', { name: 'Recover Password' }))
      await act(async () => { await Promise.resolve() })
      expect(dismiss).not.toHaveBeenCalled()
      fireEvent.changeText(getByLabelText('Email'), 'user@example.com')
      fireEvent.press(getByRole('button', { name: 'Recover Password' }))
      await waitFor(() => expect(dismiss).toHaveBeenCalledTimes(1))
    } finally {
      dismiss.mockRestore()
    }
  })

  it('turns the button on again, with its normal label, when the driver types after a sent link', async () => {
    const handleButtonForgotPasswordClick = jest.fn()
    const { getByLabelText, getByRole, queryByRole, rerender } = renderWithProviders(
      <ForgotPasswordForm formState={idle} handleButtonForgotPasswordClick={handleButtonForgotPasswordClick} />
    )
    fireEvent.changeText(getByLabelText('Email'), 'user@example.com')
    fireEvent.press(getByRole('button', { name: 'Recover Password' }))
    await waitFor(() => expect(handleButtonForgotPasswordClick).toHaveBeenCalledTimes(1))
    rerender(<ForgotPasswordForm formState={sent} handleButtonForgotPasswordClick={handleButtonForgotPasswordClick} />)
    expect(getByRole('button', { name: 'Link Sent' }).props.accessibilityState.disabled).toBe(true)
    fireEvent.changeText(getByLabelText('Email'), 'other@example.com')
    const again = getByRole('button', { name: 'Recover Password' })
    expect(again.props.accessibilityState.disabled).toBe(false)
    expect(queryByRole('button', { name: 'Link Sent' })).toBeNull()
    fireEvent.press(again)
    await waitFor(() => expect(handleButtonForgotPasswordClick).toHaveBeenCalledTimes(2))
    expect(handleButtonForgotPasswordClick).toHaveBeenLastCalledWith({ email: 'other@example.com' })
  })

  it('marks the field with the input error state when the email is missing', async () => {
    const theme: any = defaultAppTheme()
    const error = theme.native.components.input.variants.default.states.error
    const { getByLabelText, getByRole } = renderWithProviders(<ForgotPasswordForm />)
    const box = () => StyleSheet.flatten(getByLabelText('Email').parent?.parent?.props.style ?? {})
    fireEvent.press(getByRole('button', { name: 'Recover Password' }))
    await waitFor(() => expect(box().borderColor).toBe(error.border.borderColor))
  })

  it('paints the button as the submit slot of the auth form', () => {
    const theme: any = buildAppTheme({
      version: 2,
      product_type: THEME_PRODUCT_TYPE,
      values: { components: { auth_form: { slots: { submit: { color: 'danger' } } } } }
    })
    const { getByText } = renderWithProviders(<ForgotPasswordForm />, { themeOverrides: theme })
    expect(StyleSheet.flatten(getByText('Recover Password').props.style).color)
      .toBe(theme.native.components.button.variants.danger.solid.color)
  })
})
