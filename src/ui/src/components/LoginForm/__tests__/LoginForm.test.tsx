import '../../../../../../jest/helpers/uiModuleMocks'
import React from 'react'
import { Alert, Keyboard, ScrollView, StyleSheet, Text } from 'react-native'
import { act, fireEvent, waitFor } from '@testing-library/react-native'

import { useApi, useConfig, useToast } from '@components'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { buildAppTheme, defaultAppTheme, THEME_PRODUCT_TYPE } from '../../../../../../src/theme/engine'

jest.mock('react-native-recaptcha-that-works', () => {
  const React = require('react')
  return React.forwardRef((_props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({ open: jest.fn() }))
    return null
  })
})

// The real phone field: its label, its country and its messages are part of what the form draws.
jest.mock('@ui', () => {
  const { buildD2AuthUiMock } = require('../../../../../../jest/helpers/d2AuthUiMock')
  return buildD2AuthUiMock({ PhoneInputNumber: null }) // the real phone input
})

jest.mock('@components', () => {
  const mockOrdering = require('../../../../../../jest/helpers/mockOrdering')
  const { renderUiController } = require('../../../../../../jest/helpers/d1ShellDefaults')
  const { loginFormDefaults } = require('../../../../../../jest/helpers/d2AuthDefaults')
  return {
    ...mockOrdering,
    // The bottom bar's controller hands its props to its UI, as the form's own does.
    FloatingButton: renderUiController({}),
    LoginForm: renderUiController(loginFormDefaults)
  }
})

import { LoginForm } from '..'

const themed = (values: Record<string, unknown>): any =>
  buildAppTheme({ version: 2, product_type: THEME_PRODUCT_TYPE, values })
const labelColor = (node: any) => StyleSheet.flatten(node.props.style).color
const insideScroll = (node: any) => {
  for (let up = node.parent; up; up = up.parent) if (up.type === ScrollView) return true
  return false
}
/** What the theme paints around a field's box: its border color. */
const boxOf = (field: any) => StyleSheet.flatten(field.parent?.parent?.props.style ?? {})

const failed = (result: any) => ({ loading: false, result: { error: true, result } })

describe('LoginForm', () => {
  beforeEach(() => {
    ;(useApi as jest.Mock).mockReturnValue([{ project: 'demo' }, { setOrdering: jest.fn() }])
    ;(useConfig as jest.Mock).mockReturnValue([{ configs: {} }])
  })

  it('renders email login controls, the fields named by a label over their box', () => {
    const { getByLabelText, getByText, queryByPlaceholderText, getAllByText } = renderWithProviders(<LoginForm />)
    expect(getByLabelText('Email')).toBeTruthy()
    expect(getByLabelText('Password')).toBeTruthy()
    // The labels are the profile's: over the box, which has no placeholder of its own.
    expect(getByText('Email')).toBeTruthy()
    expect(getByText('Password')).toBeTruthy()
    expect(queryByPlaceholderText('Email')).toBeNull()
    expect(getAllByText('Login').length).toBeGreaterThan(0)
  })

  it('keeps its header fixed above the scroll, the gutter on the scroll\'s content (decision H8)', () => {
    const { getByLabelText, getAllByText, UNSAFE_getByType } = renderWithProviders(<LoginForm />)
    // The title is the header's: the first "Login" text; the form is the scroll's.
    expect(insideScroll(getAllByText('Login')[0])).toBe(false)
    expect(insideScroll(getByLabelText('Email'))).toBe(true)
    const scroll = UNSAFE_getByType(ScrollView)
    expect(StyleSheet.flatten(scroll.props.style).paddingHorizontal).toBeUndefined()
    expect(StyleSheet.flatten(scroll.props.contentContainerStyle).paddingHorizontal).toBe(20)
  })

  it('pins the main action to the bottom, under the scroll, in the app\'s bottom bar', () => {
    const { getByRole } = renderWithProviders(<LoginForm />)
    expect(insideScroll(getByRole('button', { name: 'Login' }))).toBe(false)
  })

  it('draws no action and no fields when the project has no login method', () => {
    const { queryByLabelText, queryByRole } = renderWithProviders(
      <LoginForm useLoginByEmail={false} useLoginByCellphone={false} useLoginOtp={false} />
    )
    expect(queryByLabelText('Email')).toBeNull()
    expect(queryByRole('button', { name: 'Login' })).toBeNull()
  })

  it('runs the invisible reCAPTCHA v3 on the project\'s base URL and hands its token to the form', () => {
    ;(useConfig as jest.Mock).mockReturnValue([{
      configs: {
        security_recaptcha_type: { value: 'v3' },
        security_recaptcha_score_v3: { value: 0.5 },
        security_recaptcha_site_key_v3: { value: 'v3-site-key' },
        security_recaptcha_base_url: { value: 'https://project.test' }
      }
    }])
    const handleReCaptcha = jest.fn()
    const { getByTestId } = renderWithProviders(<LoginForm enableReCaptcha handleReCaptcha={handleReCaptcha} />)
    const webview = getByTestId('webview')
    expect(webview.props.source.baseUrl).toBe('https://project.test')
    expect(webview.props.source.html).toContain('render=v3-site-key')
    webview.props.onMessage({ nativeEvent: { data: JSON.stringify({ type: 'token', token: 'tok-9' }) } })
    expect(handleReCaptcha).toHaveBeenCalledWith({ code: 'tok-9', version: 'v3' })
  })

  it('shows no reCAPTCHA when the project has it off', () => {
    const { queryByTestId } = renderWithProviders(<LoginForm enableReCaptcha />)
    expect(queryByTestId('webview')).toBeNull()
  })

  describe('the reCAPTCHA v2 check', () => {
    const v2 = (extra: Record<string, unknown> = {}) => ({
      configs: { security_recaptcha_type: { value: 'v2' }, security_recaptcha_site_key: { value: 'v2-key' }, ...extra }
    })

    it('draws its row with the check and its label', () => {
      ;(useConfig as jest.Mock).mockReturnValue([v2({ security_recaptcha_base_url: { value: 'https://project.test' } })])
      const { getByRole } = renderWithProviders(<LoginForm enableReCaptcha />)
      expect(getByRole('checkbox', { name: 'Verify reCAPTCHA' }).props.accessibilityState.checked).toBe(false)
    })

    it('says under its row, not in a toast, that the project has no base url', () => {
      ;(useConfig as jest.Mock).mockReturnValue([v2()])
      const showToast = jest.fn()
      ;(useToast as jest.Mock).mockReturnValue([, { showToast }])
      const { getByRole, getByTestId, queryByTestId } = renderWithProviders(<LoginForm enableReCaptcha />)
      expect(queryByTestId('error-recaptcha')).toBeNull()
      fireEvent.press(getByRole('checkbox', { name: 'Verify reCAPTCHA' }))
      expect(getByTestId('error-recaptcha').props.children).toBe('The config doesn\'t have recaptcha base url')
      expect(showToast).not.toHaveBeenCalled()
    })

    it('says under its row that the project has no site key (the retry after a failed check needs the v2 one)', () => {
      ;(useConfig as jest.Mock).mockReturnValue([{
        configs: {
          security_recaptcha_type: { value: 'v3' },
          security_recaptcha_score_v3: { value: 0.5 },
          security_recaptcha_site_key_v3: { value: 'v3-key' },
          security_recaptcha_base_url: { value: 'https://project.test' }
        }
      }])
      const { getByRole, getByTestId } = renderWithProviders(
        <LoginForm enableReCaptcha formState={failed(['ERROR_AUTH_VERIFICATION_CODE'])} />
      )
      fireEvent.press(getByRole('checkbox', { name: 'Verify reCAPTCHA' }))
      expect(getByTestId('error-recaptcha').props.children).toBe('The config doesn\'t have recaptcha site key')
    })

    it('falls back to it with the server\'s ask to try again, as a notice', () => {
      ;(useConfig as jest.Mock).mockReturnValue([v2({ security_recaptcha_base_url: { value: 'https://project.test' } })])
      const { getByTestId, getByText } = renderWithProviders(
        <LoginForm enableReCaptcha formState={failed(['ERROR_AUTH_VERIFICATION_CODE'])} />
      )
      expect(getByText('Please try again')).toBeTruthy()
      const info = defaultAppTheme().native.components.alert.variants.info
      expect(StyleSheet.flatten(getByTestId('login-notice').props.style).backgroundColor).toBe(info.background)
    })
  })

  it('redirects to forgot password screen', () => {
    const onNavigationRedirect = jest.fn()
    const { getByText, getByRole } = renderWithProviders(
      <LoginForm onNavigationRedirect={onNavigationRedirect} />
    )
    // The app's link (`components.link`).
    const link = defaultAppTheme().native.components.link
    expect(StyleSheet.flatten(getByText('Forgot your password?').props.style).color).toBe(link.base.color)
    fireEvent.press(getByRole('link', { name: 'Forgot your password?' }))
    expect(onNavigationRedirect).toHaveBeenCalledWith('Forgot')
  })

  it('hides the forgot password link with auth.forgot_password_link, and nothing else', () => {
    const { queryByText, getByLabelText, getByRole } = renderWithProviders(
      <LoginForm onNavigationRedirect={jest.fn()} />,
      { themeOverrides: themed({ visibility: { 'auth.forgot_password_link': false } }) }
    )
    expect(queryByText('Forgot your password?')).toBeNull()
    expect(getByLabelText('Password')).toBeTruthy()
    expect(getByRole('button', { name: 'Login' })).toBeTruthy()
  })

  it('hides the forgot password link on the OTP tab, where there is no password', () => {
    const { queryByText, queryByLabelText } = renderWithProviders(
      <LoginForm useLoginOtp useLoginOtpEmail loginTab="otp" otpType="email" onNavigationRedirect={jest.fn()} />
    )
    expect(queryByText('Forgot your password?')).toBeNull()
    expect(queryByLabelText('Password')).toBeNull()
  })

  describe('the login methods', () => {
    it('shows the e-mail and the OTP e-mail tabs when both are on', () => {
      const { getByText, getAllByRole } = renderWithProviders(<LoginForm useLoginByEmail useLoginOtpEmail />)
      expect(getByText('OTP Email')).toBeTruthy()
      expect(getAllByRole('tab')).toHaveLength(2)
    })

    it('draws no tabs with e-mail alone, nor with the OTP e-mail alone: there is nothing to choose', () => {
      const emailOnly = renderWithProviders(<LoginForm useLoginByEmail useLoginOtpEmail={false} />)
      expect(emailOnly.queryAllByRole('tab')).toHaveLength(0)
      emailOnly.unmount()
      const otpOnly = renderWithProviders(
        <LoginForm useLoginByEmail={false} useLoginOtp useLoginOtpEmail loginTab="otp" otpType="email" />
      )
      expect(otpOnly.queryAllByRole('tab')).toHaveLength(0)
      // The e-mail OTP is still drawn: its field and its action.
      expect(otpOnly.getByLabelText('Email')).toBeTruthy()
      expect(otpOnly.getByRole('button', { name: 'Get verify code' })).toBeTruthy()
    })

    it('draws no stray "0" when only phone login is enabled (the tabs condition rendered a number)', () => {
      const screen = renderWithProviders(
        <LoginForm useLoginByEmail={false} useLoginByCellphone useLoginOtpEmail={false} loginTab="cellphone" />
      )
      expect(screen.queryByText('0')).toBeNull()
      expect(screen.queryAllByRole('tab')).toHaveLength(0)
      expect(JSON.stringify(screen.toJSON())).not.toMatch(/"children":\["0"\]|"0"/)
      // The phone login is there instead.
      expect(screen.getByTestId('phone-country-trigger')).toBeTruthy()
    })

    it('switches to otp tab', () => {
      const handleChangeTab = jest.fn()
      const setOtpType = jest.fn()
      const { getAllByRole } = renderWithProviders(
        <LoginForm
          useLoginByEmail
          useLoginOtpEmail
          handleChangeTab={handleChangeTab}
          setOtpType={setOtpType}
        />
      )
      const [email, otp] = getAllByRole('tab')
      expect(email.props.accessibilityState.selected).toBe(true)
      expect(otp.props.accessibilityState.selected).toBe(false)
      fireEvent.press(otp)
      expect(handleChangeTab).toHaveBeenCalledWith('otp')
      expect(setOtpType).toHaveBeenCalledWith('email')
    })

    it('draws the login methods in the variant of the method_tabs slot', () => {
      const theme = themed({ components: { auth_form: { slots: { method_tabs: { variant: 'underline' } } } } })
      const look = theme.native.components.tabs.variants.underline
      const { getAllByRole } = renderWithProviders(
        <LoginForm useLoginByEmail useLoginOtpEmail />,
        { themeOverrides: theme }
      )
      expect(StyleSheet.flatten(getAllByRole('tab')[0].props.style).borderBottomColor).toBe(look.indicator)
    })

    it('renders the e-mail OTP tab with the e-mail field and the "Get verify code" action', () => {
      const { getByRole, getByLabelText } = renderWithProviders(
        <LoginForm useLoginOtp useLoginOtpEmail useLoginByEmail loginTab="otp" otpType="email" />
      )
      expect(getByLabelText('Email')).toBeTruthy()
      expect(getByRole('button', { name: 'Get verify code' })).toBeTruthy()
    })

    it('asks for the code of the e-mail OTP and opens its screen, with Cancel to leave it', async () => {
      const generateOtpCode = jest.fn()
      const { getByLabelText, getByRole, getByText, queryByText } = renderWithProviders(
        <LoginForm useLoginOtp useLoginOtpEmail loginTab="otp" otpType="email" generateOtpCode={generateOtpCode} />
      )
      fireEvent.changeText(getByLabelText('Email'), 'driver@example.com')
      fireEvent.press(getByRole('button', { name: 'Get verify code' }))
      await waitFor(() => expect(generateOtpCode).toHaveBeenCalledWith(expect.objectContaining({ email: 'driver@example.com' }), 2))
      expect(getByText('Enter verification code')).toBeTruthy()
      fireEvent.press(getByRole('button', { name: 'Cancel' }))
      expect(queryByText('Enter verification code')).toBeNull()
    })
  })

  describe('one tab per way in, only when there are two or more', () => {
    const E = { useLoginByEmail: true }
    const P = { useLoginByCellphone: true }
    const OE = { useLoginOtp: true, useLoginOtpEmail: true }
    const OP = { useLoginOtp: true, useLoginOtpCellphone: true }
    const off = { useLoginByEmail: false, useLoginByCellphone: false, useLoginOtpEmail: false, useLoginOtpCellphone: false }
    const labelsOf = (screen: any) => screen.queryAllByRole('tab').map((tab: any) => tab.findAllByType(Text)[0].props.children)

    it.each([
      ['e-mail alone', [E], 'email', []],
      ['phone alone', [P], 'cellphone', []],
      ['e-mail code alone', [OE], 'otp', []],
      ['phone code alone', [OP], 'otp', []],
      ['e-mail and e-mail code (as the mockup)', [E, OE], 'email', ['Email', 'OTP Email']],
      ['e-mail and phone', [E, P], 'email', ['Email', 'Phone']],
      ['e-mail, phone and e-mail code', [E, P, OE], 'email', ['Email', 'Phone', 'OTP Email']],
      ['e-mail, phone and phone code', [E, P, OP], 'email', ['Email', 'Phone', 'OTP Phone']],
      ['phone and phone code, no e-mail', [P, OP], 'cellphone', ['Phone', 'OTP Phone']],
      ['e-mail and phone code', [E, OP], 'email', ['Email', 'OTP Phone']],
      ['both codes', [OE, OP], 'otp', ['OTP Email', 'OTP Phone']],
      ['all four', [E, P, OE, OP], 'email', ['Email', 'Phone', 'OTP Email', 'OTP Phone']],
    ])('%s: the tabs are %j', (_name, ways, loginTab, expected) => {
      const props = Object.assign({}, off, ...(ways as any[]))
      const screen = renderWithProviders(<LoginForm {...props} loginTab={loginTab as string} otpType={props.useLoginOtpEmail ? 'email' : 'cellphone'} />)
      expect(labelsOf(screen)).toEqual(expected)
    })

    it('selects the tab of the controller\'s current way: the e-mail, the phone, and each code by its type', () => {
      const props = { ...off, ...E, ...P, ...OE, ...OP }
      const selected = (loginTab: string, otpType: string) => {
        const screen = renderWithProviders(<LoginForm {...props} loginTab={loginTab} otpType={otpType} />)
        const names = screen.getAllByRole('tab').filter((tab: any) => tab.props.accessibilityState.selected).map((tab: any) => tab.props.testID)
        screen.unmount()
        return names
      }
      expect(selected('email', 'email')).toEqual(['login-tab-email'])
      expect(selected('cellphone', 'email')).toEqual(['login-tab-cellphone'])
      expect(selected('otp', 'email')).toEqual(['login-tab-otp-email'])
      expect(selected('otp', 'cellphone')).toEqual(['login-tab-otp-cellphone'])
    })

    it('tells the controller the way the driver picks: the tab, or the code\'s tab with its type', () => {
      const handleChangeTab = jest.fn()
      const setOtpType = jest.fn()
      const screen = renderWithProviders(
        <LoginForm {...off} {...E} {...P} {...OE} {...OP} handleChangeTab={handleChangeTab} setOtpType={setOtpType} />
      )
      fireEvent.press(screen.getByTestId('login-tab-cellphone'))
      expect(handleChangeTab).toHaveBeenLastCalledWith('cellphone')
      fireEvent.press(screen.getByTestId('login-tab-email'))
      expect(handleChangeTab).toHaveBeenLastCalledWith('email')
      expect(setOtpType).not.toHaveBeenCalled()
      fireEvent.press(screen.getByTestId('login-tab-otp-email'))
      expect(handleChangeTab).toHaveBeenLastCalledWith('otp')
      expect(setOtpType).toHaveBeenLastCalledWith('email')
      fireEvent.press(screen.getByTestId('login-tab-otp-cellphone'))
      expect(handleChangeTab).toHaveBeenLastCalledWith('otp')
      expect(setOtpType).toHaveBeenLastCalledWith('cellphone')
    })

    const horizontalScrolls = (screen: any) => screen.UNSAFE_queryAllByType(ScrollView).filter((scroll: any) => scroll.props.horizontal)

    it('shares the row among up to three tabs', () => {
      const screen = renderWithProviders(<LoginForm {...off} {...E} {...P} {...OE} />)
      expect(horizontalScrolls(screen)).toHaveLength(0)
      expect(StyleSheet.flatten(screen.getByTestId('login-tabs').props.style || {}).marginEnd).toBeUndefined()
    })

    it('scrolls four tabs that do not fit sideways, out to the screen\'s edge, ending with the gutter (no shrunk text)', () => {
      const screen = renderWithProviders(<LoginForm {...off} {...E} {...P} {...OE} {...OP} />)
      const [scroll] = horizontalScrolls(screen)
      expect(scroll).toBeTruthy()
      // The row gives the content's gutter back to itself at its end, and the gutter ends its own content.
      expect(StyleSheet.flatten(scroll.props.style).marginEnd).toBe(-20)
      expect(StyleSheet.flatten(scroll.props.contentContainerStyle).paddingEnd).toBe(20)
    })

    describe('four tabs that fit the row', () => {
      /** The row has `room` and the tabs together take `track` (what the screen measures while it scrolls). */
      const measured = (screen: any, room: number, track: number) => {
        const [scroll] = horizontalScrolls(screen)
        act(() => scroll.props.onLayout({ nativeEvent: { layout: { width: room + 20, height: 44 } } }))
        act(() => screen.getByTestId('login-tabs-strip-track').props.onLayout({ nativeEvent: { layout: { width: track, height: 44 } } }))
      }

      it('share the full row as two or three do: no scroll, each tab keeps its width and takes its part of the rest', () => {
        const screen = renderWithProviders(<LoginForm {...off} {...E} {...P} {...OE} {...OP} />)
        measured(screen, 362, 333)
        expect(horizontalScrolls(screen)).toHaveLength(0)
        expect(StyleSheet.flatten(screen.getByTestId('login-tab-email').props.style).flexGrow).toBe(1)
        expect(StyleSheet.flatten(screen.getByTestId('login-tabs-strip').props.style).width).toBe('100%')
      })

      it('scroll when they do not fit', () => {
        const screen = renderWithProviders(<LoginForm {...off} {...E} {...P} {...OE} {...OP} />)
        measured(screen, 362, 400)
        expect(horizontalScrolls(screen)).toHaveLength(1)
      })
    })

    it('keeps the tabs over the fields, in the scroll, under the notices', () => {
      const screen = renderWithProviders(<LoginForm {...off} {...E} {...P} formState={failed(['Wrong'])} />)
      expect(insideScroll(screen.getByTestId('login-tabs'))).toBe(true)
      const order = JSON.stringify(screen.toJSON())
      expect(order.indexOf('login-notice')).toBeLessThan(order.indexOf('login-tabs'))
      expect(order.indexOf('login-tabs')).toBeLessThan(order.indexOf('Password'))
    })

    describe('on the phone tab', () => {
      const phoneTab = (props: Record<string, unknown> = {}) => renderWithProviders(
        <LoginForm {...off} {...E} {...P} loginTab='cellphone' onNavigationRedirect={jest.fn()} {...props} />
      )

      it('draws the phone field with its label over the row, then the password, and no e-mail', () => {
        const screen = phoneTab()
        expect(screen.getByTestId('phone-country-trigger')).toBeTruthy()
        expect(screen.getByText('Phone number')).toBeTruthy()
        expect(screen.getByLabelText('Password')).toBeTruthy()
        expect(screen.queryByLabelText('Email')).toBeNull()
        expect(screen.getByRole('button', { name: 'Login' })).toBeTruthy()
      })

      it('sends the cellphone credentials the controller takes: the number, its country and the password', async () => {
        const handleButtonLoginClick = jest.fn()
        const screen = phoneTab({ handleButtonLoginClick })
        fireEvent.changeText(screen.getByTestId('phone-input'), '4155552671')
        fireEvent.changeText(screen.getByLabelText('Password'), 'secret')
        fireEvent.press(screen.getByRole('button', { name: 'Login' }))
        await waitFor(() => expect(handleButtonLoginClick).toHaveBeenCalledTimes(1))
        expect(handleButtonLoginClick).toHaveBeenCalledWith({ password: 'secret', cellphone: '4155552671', country_phone_code: '1' })
      })

      it('writes what lacks under each field, in the error look, and sends nothing', async () => {
        const handleButtonLoginClick = jest.fn()
        const screen = phoneTab({ handleButtonLoginClick })
        fireEvent.press(screen.getByRole('button', { name: 'Login' }))
        expect(await screen.findByText('The field Mobile phone is required.')).toBeTruthy()
        expect(await screen.findByTestId('error-password')).toBeTruthy()
        expect(screen.queryByTestId('error-email')).toBeNull()
        expect(handleButtonLoginClick).not.toHaveBeenCalled()
      })

      it('shows the server\'s answer as the notice that stays until the driver edits, like the e-mail\'s', () => {
        const props = { handleChangeTab: jest.fn() }
        const screen = phoneTab({ ...props, formState: failed(['User or Password wrong']) })
        expect(screen.getByText('User or Password wrong')).toBeTruthy()
        expect(insideScroll(screen.getByTestId('login-notice'))).toBe(true)
        fireEvent.changeText(screen.getByLabelText('Password'), 'x')
        expect(screen.queryByTestId('login-notice')).toBeNull()
      })

      it('goes away with the notice when the driver changes tab', () => {
        const screen = phoneTab({ handleChangeTab: jest.fn(), formState: failed(['Wrong']) })
        expect(screen.queryByTestId('login-notice')).toBeTruthy()
        fireEvent.press(screen.getByTestId('login-tab-email'))
        expect(screen.queryByTestId('login-notice')).toBeNull()
      })

      it('keeps the forgot password link, a password being what it is for (and hides it with its visibility key)', () => {
        const onNavigationRedirect = jest.fn()
        const screen = phoneTab({ onNavigationRedirect })
        fireEvent.press(screen.getByRole('link', { name: 'Forgot your password?' }))
        expect(onNavigationRedirect).toHaveBeenCalledWith('Forgot')
        screen.unmount()
        const hidden = renderWithProviders(
          <LoginForm {...off} {...E} {...P} loginTab='cellphone' onNavigationRedirect={jest.fn()} />,
          { themeOverrides: themed({ visibility: { 'auth.forgot_password_link': false } }) }
        )
        expect(hidden.queryByText('Forgot your password?')).toBeNull()
      })
    })

    describe('on the phone code tab', () => {
      const codeTab = (props: Record<string, unknown> = {}) => renderWithProviders(
        <LoginForm {...off} {...E} {...OP} loginTab='otp' otpType='cellphone' onNavigationRedirect={jest.fn()} {...props} />
      )

      it('draws the phone field and "Get verify code": no e-mail, no password, no forgot link', () => {
        const screen = codeTab()
        expect(screen.getByTestId('phone-country-trigger')).toBeTruthy()
        expect(screen.queryByLabelText('Email')).toBeNull()
        expect(screen.queryByLabelText('Password')).toBeNull()
        expect(screen.queryByText('Forgot your password?')).toBeNull()
        expect(screen.getByRole('button', { name: 'Get verify code' })).toBeTruthy()
        expect(screen.queryByRole('button', { name: 'Send by WhatsApp' })).toBeNull()
      })

      it('asks for the code by SMS to the number typed, and opens the code screen', async () => {
        const generateOtpCode = jest.fn()
        const screen = codeTab({ generateOtpCode })
        fireEvent.changeText(screen.getByTestId('phone-input'), '4155552671')
        fireEvent.press(screen.getByRole('button', { name: 'Get verify code' }))
        await waitFor(() => expect(generateOtpCode).toHaveBeenCalledTimes(1))
        expect(generateOtpCode).toHaveBeenCalledWith(expect.objectContaining({ cellphone: '4155552671', country_phone_code: '1' }), 2)
        expect(screen.getByText('Enter verification code')).toBeTruthy()
      })

      it('asks for the number under its field when it is empty, and asks for no code', async () => {
        const generateOtpCode = jest.fn()
        const screen = codeTab({ generateOtpCode })
        fireEvent.press(screen.getByRole('button', { name: 'Get verify code' }))
        expect(await screen.findByText('The field Mobile phone is required.')).toBeTruthy()
        expect(generateOtpCode).not.toHaveBeenCalled()
        expect(screen.queryByText('Enter verification code')).toBeNull()
      })

      it('offers WhatsApp beside the SMS when the project has it, and sends the code by that channel', async () => {
        const generateOtpCode = jest.fn()
        const screen = codeTab({ generateOtpCode, useLoginOtpWhatsapp: true })
        expect(screen.getByRole('button', { name: 'Send by SMS' })).toBeTruthy()
        expect(screen.queryByRole('button', { name: 'Get verify code' })).toBeNull()
        fireEvent.changeText(screen.getByTestId('phone-input'), '4155552671')
        fireEvent.press(screen.getByRole('button', { name: 'Send by WhatsApp' }))
        await waitFor(() => expect(generateOtpCode).toHaveBeenCalledTimes(1))
        expect(generateOtpCode).toHaveBeenCalledWith(expect.objectContaining({ cellphone: '4155552671' }), 4)
      })

      it('sends by SMS (channel 2) from the pinned action even with WhatsApp on', async () => {
        const generateOtpCode = jest.fn()
        const screen = codeTab({ generateOtpCode, useLoginOtpWhatsapp: true })
        fireEvent.changeText(screen.getByTestId('phone-input'), '4155552671')
        fireEvent.press(screen.getByRole('button', { name: 'Send by SMS' }))
        await waitFor(() => expect(generateOtpCode).toHaveBeenCalledTimes(1))
        expect(generateOtpCode.mock.calls[0][1]).toBe(2)
      })

      it('draws no WhatsApp on the e-mail code or the phone and password tabs', () => {
        const email = renderWithProviders(<LoginForm {...off} {...E} {...OE} loginTab='otp' otpType='email' useLoginOtpWhatsapp />)
        expect(email.queryByRole('button', { name: 'Send by WhatsApp' })).toBeNull()
        email.unmount()
        const phone = renderWithProviders(<LoginForm {...off} {...E} {...P} loginTab='cellphone' useLoginOtpWhatsapp />)
        expect(phone.queryByRole('button', { name: 'Send by WhatsApp' })).toBeNull()
      })
    })
  })

  describe('the phone and password login', () => {
    const phoneLogin = (props: Record<string, unknown> = {}) => renderWithProviders(
      <LoginForm useLoginByEmail={false} useLoginByCellphone loginTab="cellphone" {...props} />
    )

    it('draws the phone as the profile\'s field: the country button and the number, its label over them, then the password', () => {
      const screen = phoneLogin()
      expect(screen.getByTestId('phone-country-trigger')).toBeTruthy()
      expect(screen.getByLabelText('Phone number')).toBeTruthy()
      expect(screen.getByText('Phone number')).toBeTruthy()
      expect(screen.queryByLabelText('Email')).toBeNull()
      expect(screen.getByLabelText('Password')).toBeTruthy()
      expect(screen.getByRole('button', { name: 'Login' })).toBeTruthy()
    })

    it('sends the country code and the national number with the password', async () => {
      const handleButtonLoginClick = jest.fn()
      const screen = phoneLogin({ handleButtonLoginClick })
      fireEvent.changeText(screen.getByTestId('phone-input'), '4155552671')
      fireEvent.changeText(screen.getByLabelText('Password'), 'secret')
      fireEvent.press(screen.getByRole('button', { name: 'Login' }))
      await waitFor(() => expect(handleButtonLoginClick).toHaveBeenCalledTimes(1))
      expect(handleButtonLoginClick).toHaveBeenCalledWith(expect.objectContaining({ password: 'secret', cellphone: '4155552671' }))
    })

    it('writes the required message under the phone field, with the password\'s, and sends nothing (no toast)', async () => {
      const showToast = jest.fn()
      ;(useToast as jest.Mock).mockReturnValue([, { showToast }])
      const handleButtonLoginClick = jest.fn()
      const screen = phoneLogin({ handleButtonLoginClick })
      fireEvent.press(screen.getByRole('button', { name: 'Login' }))
      expect(await screen.findByText('The field Mobile phone is required.')).toBeTruthy()
      expect(await screen.findByText('The field Password is required')).toBeTruthy()
      expect(handleButtonLoginClick).not.toHaveBeenCalled()
      expect(showToast).not.toHaveBeenCalled()
      // The phone field is in its error state.
      const error = defaultAppTheme().native.components.input.variants.default.states.error
      expect(boxOf(screen.getByTestId('phone-input')).borderColor).toBe(error.border.borderColor)
    })

    it('writes the required message even when the password is typed, and the typing takes it away', async () => {
      const handleButtonLoginClick = jest.fn()
      const screen = phoneLogin({ handleButtonLoginClick })
      fireEvent.changeText(screen.getByLabelText('Password'), 'secret')
      fireEvent.press(screen.getByRole('button', { name: 'Login' }))
      expect(await screen.findByText('The field Mobile phone is required.')).toBeTruthy()
      expect(handleButtonLoginClick).not.toHaveBeenCalled()
      fireEvent.changeText(screen.getByTestId('phone-input'), '4155552671')
      expect(screen.queryByText('The field Mobile phone is required.')).toBeNull()
    })

    it('keeps the invalid number under its field and sends nothing', async () => {
      const handleButtonLoginClick = jest.fn()
      const screen = phoneLogin({ handleButtonLoginClick })
      fireEvent.changeText(screen.getByTestId('phone-input'), '12')
      fireEvent.changeText(screen.getByLabelText('Password'), 'secret')
      fireEvent.press(screen.getByRole('button', { name: 'Login' }))
      expect(await screen.findByText('The Phone Number field is invalid')).toBeTruthy()
      expect(handleButtonLoginClick).not.toHaveBeenCalled()
    })

    describe('the SMS code (Twilio)', () => {
      const twilio = (value: string) => ({ configs: { twilio_service_enabled: { value } } })

      it('draws the "Or" divider and the outline "Get Verify Code" button when Twilio is on, after the fields', () => {
        ;(useConfig as jest.Mock).mockReturnValue([twilio('1')])
        const theme: any = defaultAppTheme()
        const screen = phoneLogin()
        expect(screen.getByText('Or')).toBeTruthy()
        const sms = screen.getByRole('button', { name: 'Get Verify Code' })
        expect(labelColor(screen.getByText('Get Verify Code'))).toBe(theme.native.components.button.variants.primary.outline.color)
        // It is in the scroll, after the fields; the pinned action is the login.
        expect(insideScroll(sms)).toBe(true)
        expect(insideScroll(screen.getByRole('button', { name: 'Login' }))).toBe(false)
      })

      it('takes "true" or "1" for Twilio on, and nothing else', () => {
        ;(useConfig as jest.Mock).mockReturnValue([twilio('true')])
        const on = phoneLogin()
        expect(on.queryByText('Or')).toBeTruthy()
        on.unmount()
        ;(useConfig as jest.Mock).mockReturnValue([twilio('0')])
        expect(phoneLogin().queryByText('Or')).toBeNull()
      })

      it('draws nothing of it off the phone tab, nor without Twilio', () => {
        ;(useConfig as jest.Mock).mockReturnValue([twilio('1')])
        const emailTab = renderWithProviders(<LoginForm useLoginByCellphone loginTab="email" />)
        expect(emailTab.queryByText('Or')).toBeNull()
        expect(emailTab.queryByRole('button', { name: 'Get Verify Code' })).toBeNull()
        emailTab.unmount()
        ;(useConfig as jest.Mock).mockReturnValue([{ configs: {} }])
        const off = phoneLogin()
        expect(off.queryByText('Or')).toBeNull()
        expect(off.queryByRole('button', { name: 'Get Verify Code' })).toBeNull()
      })

      it('asks for the phone under its field when it is empty, and sends no code', () => {
        ;(useConfig as jest.Mock).mockReturnValue([twilio('1')])
        const handleSendVerifyCode = jest.fn()
        const screen = phoneLogin({ handleSendVerifyCode })
        fireEvent.press(screen.getByRole('button', { name: 'Get Verify Code' }))
        expect(screen.getByText('The field Mobile phone is required.')).toBeTruthy()
        expect(handleSendVerifyCode).not.toHaveBeenCalled()
      })

      it('sends the code to the phone typed, and the screen of the phone verification opens with its title when it went', async () => {
        ;(useConfig as jest.Mock).mockReturnValue([twilio('1')])
        const handleSendVerifyCode = jest.fn()
        const screen = phoneLogin({ handleSendVerifyCode })
        fireEvent.changeText(screen.getByTestId('phone-input'), '4155552671')
        fireEvent.press(screen.getByRole('button', { name: 'Get Verify Code' }))
        expect(handleSendVerifyCode).toHaveBeenCalledWith({ country_phone_code: '1', cellphone: '4155552671' })
        screen.rerender(
          <LoginForm
            useLoginByEmail={false}
            useLoginByCellphone
            loginTab="cellphone"
            handleSendVerifyCode={handleSendVerifyCode}
            verifyPhoneState={{ loading: false, result: { error: false, result: 'OK' } }}
          />
        )
        expect(screen.getByText('Verify Phone')).toBeTruthy()
        expect(screen.getByText(/ending with \*\*71/)).toBeTruthy()
      })
    })
  })

  it('paints the submit button as the submit slot of the auth form', () => {
    const theme = themed({ components: { auth_form: { slots: { submit: { color: 'success' } } } } })
    const { getAllByText } = renderWithProviders(<LoginForm />, { themeOverrides: theme })
    // 'Login' is the screen's title and the button's label: the button is the last one.
    const labels = getAllByText('Login')
    expect(labelColor(labels[labels.length - 1])).toBe(theme.native.components.button.variants.success.solid.color)
  })

  describe('the errors of the fields, under each field', () => {
    const type = (screen: any, email: string, password: string) => {
      fireEvent.changeText(screen.getByLabelText('Email'), email)
      fireEvent.changeText(screen.getByLabelText('Password'), password)
    }

    it('marks the fields with the input error state and writes what they lack, when the form is submitted empty', async () => {
      const theme: any = defaultAppTheme()
      const error = theme.native.components.input.variants.default.states.error
      const { getByRole, getByLabelText, getByTestId } = renderWithProviders(<LoginForm />)
      expect(boxOf(getByLabelText('Email')).borderColor).not.toBe(error.border.borderColor)
      fireEvent.press(getByRole('button', { name: 'Login' }))
      await waitFor(() => expect(boxOf(getByLabelText('Email')).borderColor).toBe(error.border.borderColor))
      expect(boxOf(getByLabelText('Password')).borderColor).toBe(error.border.borderColor)
      expect(getByTestId('error-email').props.children).toBe('The field Email is required')
      expect(getByTestId('error-password').props.children).toBe('The field Password is required')
    })

    it('writes each message under its own field, in the field\'s error look', async () => {
      const field = defaultAppTheme().native.components.field.base
      const screen = renderWithProviders(<LoginForm />)
      fireEvent.press(screen.getByRole('button', { name: 'Login' }))
      const email = await screen.findByTestId('error-email')
      const style = StyleSheet.flatten(email.props.style)
      expect(style.color).toBe(field.error_color)
      expect(style.marginTop).toBe(field.message_gap)
      // Under its field: the smallest block that holds the message and the e-mail's box holds no other field.
      let group: any = email.parent
      while (group && !group.findAllByProps({ accessibilityLabel: 'Email' }).length) group = group.parent
      expect(group.findAllByProps({ accessibilityLabel: 'Password' })).toHaveLength(0)
    })

    it('writes only the missing password under it, with a good email, and sends nothing, with no toast', async () => {
      const showToast = jest.fn()
      ;(useToast as jest.Mock).mockReturnValue([, { showToast }])
      const handleButtonLoginClick = jest.fn()
      const screen = renderWithProviders(<LoginForm handleButtonLoginClick={handleButtonLoginClick} />)
      fireEvent.changeText(screen.getByLabelText('Email'), 'driver@example.com')
      fireEvent.press(screen.getByRole('button', { name: 'Login' }))
      expect(await screen.findByTestId('error-password')).toBeTruthy()
      expect(screen.queryByTestId('error-email')).toBeNull()
      expect(handleButtonLoginClick).not.toHaveBeenCalled()
      expect(showToast).not.toHaveBeenCalled()
    })

    it('writes a malformed email under its field each time it is sent, and sends nothing', async () => {
      const handleButtonLoginClick = jest.fn()
      const screen = renderWithProviders(<LoginForm handleButtonLoginClick={handleButtonLoginClick} />)
      type(screen, 'driver@', 'secret')
      fireEvent.press(screen.getByRole('button', { name: 'Login' }))
      expect((await screen.findByTestId('error-email')).props.children).toBe('Invalid email address')
      fireEvent.press(screen.getByRole('button', { name: 'Login' }))
      await act(async () => { await Promise.resolve() })
      expect(screen.getByTestId('error-email')).toBeTruthy()
      expect(handleButtonLoginClick).not.toHaveBeenCalled()
    })

    it('takes the message away when the field is corrected', async () => {
      const screen = renderWithProviders(<LoginForm />)
      fireEvent.press(screen.getByRole('button', { name: 'Login' }))
      await screen.findByTestId('error-email')
      fireEvent.changeText(screen.getByLabelText('Email'), 'driver@example.com')
      // The form re-validates the field on change, asynchronously (react-hook-form), and each re-render of the whole form
      // is ~0.25 s on a quiet machine: the message goes after two of them, several times that under load. The wait is the
      // global one (`asyncUtilTimeout`), not a timer to guess.
      await waitFor(() => expect(screen.queryByTestId('error-email')).toBeNull())
      expect(screen.getByTestId('error-password')).toBeTruthy()
    })

    it('sends the email in lower case, without spaces, and the password as it is typed', async () => {
      const handleButtonLoginClick = jest.fn()
      const screen = renderWithProviders(<LoginForm handleButtonLoginClick={handleButtonLoginClick} />)
      type(screen, 'Driver @Example.com', 'S3cret pass')
      fireEvent.press(screen.getByRole('button', { name: 'Login' }))
      await waitFor(() => expect(handleButtonLoginClick).toHaveBeenCalledTimes(1))
      expect(handleButtonLoginClick).toHaveBeenCalledWith({ email: 'driver@example.com', password: 'S3cret pass', cellphone: null, country_phone_code: null })
    })
  })

  describe('what belongs to no field, as a notice that stays', () => {
    it('shows the server\'s answer to the login (the first message of a list) as a danger notice, not a toast', () => {
      const showToast = jest.fn()
      ;(useToast as jest.Mock).mockReturnValue([, { showToast }])
      const { getByTestId, getByText } = renderWithProviders(<LoginForm formState={failed(['User or Password wrong', 'second'])} />)
      expect(getByText('User or Password wrong')).toBeTruthy()
      expect(StyleSheet.flatten(getByTestId('login-notice').props.style).backgroundColor)
        .toBe(defaultAppTheme().native.components.alert.variants.danger.background)
      // It is on the scroll, over the fields, and not a toast.
      expect(insideScroll(getByTestId('login-notice'))).toBe(true)
      expect(showToast).not.toHaveBeenCalled()
    })

    it('words the error code of a schedule that refuses the login, and any other code, instead of showing it raw', () => {
      const schedule = renderWithProviders(<LoginForm formState={failed(['ERROR_AUTH_DRIVER_LOGIN_VALIDATION'])} />)
      expect(schedule.getByText('You are outside the established schedule')).toBeTruthy()
      expect(schedule.queryByText('ERROR_AUTH_DRIVER_LOGIN_VALIDATION')).toBeNull()
      schedule.unmount()
      const other = renderWithProviders(<LoginForm formState={failed(['ERROR_AUTH_SOMETHING_NEW'])} />)
      expect(other.getByText('Error auth something new')).toBeTruthy()
    })

    it('shows an answer that is a text (a network failure, a blocked account) whole', () => {
      const { getByText } = renderWithProviders(<LoginForm formState={failed('Network request failed')} />)
      expect(getByText('Network request failed')).toBeTruthy()
    })

    it('shows nothing while the login is running or when it went through', () => {
      const running = renderWithProviders(<LoginForm formState={{ loading: true, result: { error: true, result: ['old'] } }} />)
      expect(running.queryByTestId('login-notice')).toBeNull()
      running.unmount()
      const fine = renderWithProviders(<LoginForm formState={{ loading: false, result: { error: false } }} />)
      expect(fine.queryByTestId('login-notice')).toBeNull()
    })

    it('stays until the driver edits a field, and shows the next answer again', () => {
      const props = { handleChangeTab: jest.fn() }
      const { getByLabelText, queryByTestId, rerender } = renderWithProviders(<LoginForm {...props} formState={failed(['Wrong'])} />)
      expect(queryByTestId('login-notice')).toBeTruthy()
      fireEvent.changeText(getByLabelText('Email'), 'driver@example.com')
      expect(queryByTestId('login-notice')).toBeNull()
      rerender(<LoginForm {...props} formState={failed(['Wrong again'])} />)
      expect(queryByTestId('login-notice')).toBeTruthy()
      fireEvent.changeText(getByLabelText('Password'), 'x')
      expect(queryByTestId('login-notice')).toBeNull()
    })

    it('goes away when the tab changes', () => {
      const { getAllByRole, queryByTestId } = renderWithProviders(
        <LoginForm useLoginByEmail useLoginOtpEmail handleChangeTab={jest.fn()} formState={failed(['Wrong'])} />
      )
      expect(queryByTestId('login-notice')).toBeTruthy()
      fireEvent.press(getAllByRole('tab')[1])
      expect(queryByTestId('login-notice')).toBeNull()
    })

    it('shows the server\'s answer to the SMS code request as a notice too', () => {
      const showToast = jest.fn()
      ;(useToast as jest.Mock).mockReturnValue([, { showToast }])
      const { getByText, getByTestId } = renderWithProviders(
        <LoginForm verifyPhoneState={{ loading: false, result: { error: true, result: 'Invalid phone' } }} />
      )
      expect(getByText('Invalid phone')).toBeTruthy()
      expect(getByTestId('login-notice')).toBeTruthy()
      expect(showToast).not.toHaveBeenCalled()
    })
  })

  it('shows the server message when the verification code request fails', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(jest.fn())
    renderWithProviders(
      <LoginForm
        useLoginOtp
        useLoginOtpEmail
        loginTab="otp"
        otpType="email"
        checkPhoneCodeState={{
          loading: false,
          result: { error: true, result: 'You must wait to request a new code' }
        }}
      />
    )
    expect(alertSpy).toHaveBeenCalledWith(
      'Error',
      'You must wait to request a new code',
      expect.any(Array)
    )
    // It tells, it does not ask: one button, and no Cancel next to it.
    expect(alertSpy.mock.calls[0][2]).toHaveLength(1)
  })

  it('toggles password visibility with a labelled icon button', () => {
    const { getByLabelText } = renderWithProviders(<LoginForm />)
    expect(getByLabelText('Password').props.secureTextEntry).toBe(true)
    fireEvent.press(getByLabelText('Show password'))
    expect(getByLabelText('Password').props.secureTextEntry).toBe(false)
    expect(getByLabelText('Hide password')).toBeTruthy()
  })

  it('draws the password\'s eye as the app\'s one: a 44 pt target whose glyph says what a tap does (decision H5)', () => {
    const input = defaultAppTheme().native.components.input.base
    const { getByLabelText, UNSAFE_getByProps, UNSAFE_queryByProps } = renderWithProviders(<LoginForm />)
    const eye = getByLabelText('Show password')
    const box = StyleSheet.flatten(eye.children[0].props.style)
    const slop = eye.props.hitSlop
    expect(box.height + 2 * slop).toBeGreaterThanOrEqual(44)
    expect(box.width + 2 * slop).toBeGreaterThanOrEqual(44)
    // Hidden: the open eye (a tap shows it), at the input's icon size and color, as in the profile and the remove-account dialog.
    const open = UNSAFE_getByProps({ name: 'eye-outline' })
    expect(open.props.size).toBe(input.icon_size)
    expect(open.props.color).toBe(input.icon_color)
    fireEvent.press(getByLabelText('Show password'))
    // Visible: the crossed eye (a tap hides it).
    expect(UNSAFE_getByProps({ name: 'eye-off-outline' })).toBeTruthy()
    expect(UNSAFE_queryByProps({ name: 'eye-outline' })).toBeNull()
  })

  describe('the screen of the phone verification', () => {
    const OK = { loading: false, result: { error: false, result: 'OK' } }
    const opened = () => renderWithProviders(<LoginForm verifyPhoneState={OK} />)

    it('opens as a screen with its title after the code is sent', () => {
      const { getByText, getByLabelText } = opened()
      expect(getByText('Verify Phone')).toBeTruthy()
      expect(getByLabelText('Enter verification code')).toBeTruthy()
    })

    it('has a Cancel that closes it, back to the login (it had only the device\'s back)', () => {
      const { getByRole, queryByText, getByLabelText } = opened()
      fireEvent.press(getByRole('button', { name: 'Cancel' }))
      expect(queryByText('Verify Phone')).toBeNull()
      expect(getByLabelText('Email')).toBeTruthy()
    })
  })

  describe('the keyboard', () => {
    const spies: jest.SpyInstance[] = []
    const spy = (spyOn: jest.SpyInstance) => { spies.push(spyOn); return spyOn }

    afterEach(() => {
      spies.splice(0).forEach((spyOn) => spyOn.mockRestore())
    })

    it('dismisses the keyboard before the request goes', async () => {
      const order: string[] = []
      spy(jest.spyOn(Keyboard, 'dismiss')).mockImplementation(() => { order.push('dismiss') })
      const handleButtonLoginClick = jest.fn(() => { order.push('submit') })
      const { getByLabelText, getByRole } = renderWithProviders(
        <LoginForm handleButtonLoginClick={handleButtonLoginClick} />
      )
      fireEvent.changeText(getByLabelText('Email'), 'driver@example.com')
      fireEvent.changeText(getByLabelText('Password'), 'secret')
      fireEvent.press(getByRole('button', { name: 'Login' }))
      await waitFor(() => expect(handleButtonLoginClick).toHaveBeenCalled())
      expect(order[0]).toBe('dismiss')
      expect(order.indexOf('dismiss')).toBeLessThan(order.indexOf('submit'))
    })

    it('keeps the keyboard open when a field is missing: the message is under the field, in sight, and the field is typed next', async () => {
      const dismiss = spy(jest.spyOn(Keyboard, 'dismiss')).mockImplementation(() => {})
      const handleButtonLoginClick = jest.fn()
      const { getByRole, findByTestId } = renderWithProviders(<LoginForm handleButtonLoginClick={handleButtonLoginClick} />)
      fireEvent.press(getByRole('button', { name: 'Login' }))
      await findByTestId('error-email')
      expect(dismiss).not.toHaveBeenCalled()
      expect(handleButtonLoginClick).not.toHaveBeenCalled()
    })

    it('clears every field error (no argument) when the tab changes', () => {
      const clearErrors = jest.fn()
      const reactHookForm = require('react-hook-form')
      const realUseForm = reactHookForm.useForm
      spy(jest.spyOn(reactHookForm, 'useForm')).mockImplementation((...args: any[]) => ({
        ...realUseForm(...args),
        clearErrors
      }))
      const handleChangeTab = jest.fn()
      const { getAllByRole } = renderWithProviders(
        <LoginForm useLoginByEmail useLoginOtpEmail handleChangeTab={handleChangeTab} />
      )
      fireEvent.press(getAllByRole('tab')[1])
      expect(handleChangeTab).toHaveBeenCalledWith('otp')
      expect(clearErrors).toHaveBeenCalledTimes(1)
      expect(clearErrors.mock.calls[0]).toEqual([])
    })
  })
})
