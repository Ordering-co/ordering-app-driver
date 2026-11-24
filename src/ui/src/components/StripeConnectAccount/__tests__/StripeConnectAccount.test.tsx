import '../../../../../../jest/helpers/uiModuleMocks'
import React from 'react'
import { AppState, Image, Linking, StyleSheet } from 'react-native'
import { act, fireEvent, waitFor, within } from '@testing-library/react-native'

import { useToast } from '@components'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { buildAppTheme, defaultAppTheme, THEME_PRODUCT_TYPE } from '../../../../../theme/engine'
import { nativeBoxStyle } from '../../../../../theme/helpers'

jest.mock('@ui', () => {
  const { buildD2AuthUiMock } = require('../../../../../../jest/helpers/d2AuthUiMock')
  return buildD2AuthUiMock()
})

jest.mock('@components', () => {
  const mockOrdering = require('../../../../../../jest/helpers/mockOrdering')
  const { renderUiController } = require('../../../../../../jest/helpers/d1ShellDefaults')
  return {
    ...mockOrdering,
    StripeConnectAccount: renderUiController({
      navigation: { goBack: jest.fn(), canGoBack: jest.fn(() => true) }
    }),
    // The bottom bar's controller: it hands its props to the UI (`FloatingButton`).
    FloatingButton: renderUiController({})
  }
})

import { StripeConnectAccount } from '..'

const account = {
  id: 4,
  owner_type: 'driver',
  owner_id: 6,
  details_submitted: true,
  payouts_enabled: true,
  transfers_enabled: true,
  requirements: { currently_due: [], past_due: [], disabled_reason: null }
}

const loaded = (value: any) => ({ account: value, loading: false, error: null })
const idle = { loading: false, error: null }

describe('StripeConnectAccount', () => {
  let appStateHandler: any
  let showToast: jest.Mock

  beforeEach(() => {
    appStateHandler = null
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_event: any, handler: any) => {
      appStateHandler = handler
      return { remove: jest.fn() } as any
    })
    jest.spyOn(Linking, 'openURL').mockResolvedValue(true as any)
    showToast = (useToast as jest.Mock)()[1].showToast
    showToast.mockClear()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('shows a placeholder while the account loads', () => {
    const { getByTestId, queryByText } = renderWithProviders(
      <StripeConnectAccount accountState={{ account: null, loading: true, error: null }} onboardingState={idle} />
    )
    expect(getByTestId('stripe-skeleton')).toBeTruthy()
    expect(queryByText('Connect Stripe account')).toBeNull()
  })

  it('invites to connect when the driver has no account', () => {
    const { getByText } = renderWithProviders(
      <StripeConnectAccount accountState={loaded(null)} onboardingState={idle} />
    )
    expect(getByText('Connect your Stripe account')).toBeTruthy()
    expect(getByText('Connect Stripe account')).toBeTruthy()
  })

  it('invites to continue when the form is not finished', () => {
    const { getByText } = renderWithProviders(
      <StripeConnectAccount
        accountState={loaded({ ...account, details_submitted: false, transfers_enabled: false })}
        onboardingState={idle}
      />
    )
    expect(getByText('Finish setting up your Stripe account')).toBeTruthy()
    expect(getByText('Continue')).toBeTruthy()
  })

  it('shows the account in review while Stripe has not approved it', () => {
    const { getByText } = renderWithProviders(
      <StripeConnectAccount
        accountState={loaded({ ...account, transfers_enabled: false })}
        onboardingState={idle}
      />
    )
    expect(getByText('Your Stripe account is in review')).toBeTruthy()
    expect(getByText('Stripe is reviewing your details. You will receive your payouts once your account is approved.')).toBeTruthy()
    expect(getByText('Update details')).toBeTruthy()
  })

  it('asks for more details when Stripe requires them', () => {
    const { getByText } = renderWithProviders(
      <StripeConnectAccount
        accountState={loaded({
          ...account,
          transfers_enabled: false,
          requirements: { currently_due: ['individual.verification.document'], past_due: [], disabled_reason: null }
        })}
        onboardingState={idle}
      />
    )
    expect(getByText('Stripe needs more details from you before you can receive payouts. Update your details to complete them.')).toBeTruthy()
  })

  it('shows the account ready when it can receive transfers', () => {
    const { getByText } = renderWithProviders(
      <StripeConnectAccount accountState={loaded(account)} onboardingState={idle} />
    )
    expect(getByText('Your Stripe account is ready')).toBeTruthy()
    expect(getByText('Update details')).toBeTruthy()
  })

  it('marks each state with a glyph in its color role, at the theme\'s size', () => {
    const custom = buildAppTheme({
      version: 2,
      product_type: THEME_PRODUCT_TYPE,
      values: { components: { empty_state: { base: { icon_size: 56 } } } }
    })
    const mark = (accountState: any, themeOverrides?: any) =>
      renderWithProviders(<StripeConnectAccount accountState={accountState} onboardingState={idle} />, { themeOverrides })
        .getByTestId('stripe-status-mark').props
    const color = defaultAppTheme().native.tokens.color
    expect(mark(loaded(null))).toEqual(expect.objectContaining({ name: 'card-outline', color: color.text_muted }))
    expect(mark(loaded({ ...account, details_submitted: false }))).toEqual(expect.objectContaining({ name: 'alert-circle-outline', color: color.primary_text }))
    expect(mark(loaded({ ...account, transfers_enabled: false }))).toEqual(expect.objectContaining({ name: 'time-outline', color: color.primary_text }))
    expect(mark(loaded(account))).toEqual(expect.objectContaining({ name: 'checkmark-circle-outline', color: color.success_text }))
    expect(mark(loaded(account)).size).toBe(defaultAppTheme().native.components.empty_state.base.icon_size)
    expect(mark(loaded(account), custom).size).toBe(56)
  })

  describe('the action in the bottom bar', () => {
    const slots = defaultAppTheme().native.components.bottom_bar.slots
    const variants = defaultAppTheme().native.components.button.variants[slots.button.color]
    const solid = nativeBoxStyle(variants.solid)
    const outline = nativeBoxStyle(variants.outline)
    const needed = { requirements: { currently_due: ['individual.verification.document'], past_due: [], disabled_reason: null } }
    const box = (accountState: any, label: string) => {
      const { getByRole, getByTestId } = renderWithProviders(<StripeConnectAccount accountState={accountState} onboardingState={idle} />)
      expect(getByTestId('stripe-bar')).toBeTruthy()
      return StyleSheet.flatten(getByRole('button', { name: label }).children[0].props.style)
    }

    it('is the bar\'s strong action (solid, the button slot) while the driver has something to do to be paid', () => {
      for (const [state, label] of [
        [loaded(null), 'Connect Stripe account'],
        [loaded({ ...account, details_submitted: false }), 'Continue'],
        // The mockup's "in review": Stripe asks for more details.
        [loaded({ ...account, transfers_enabled: false, ...needed }), 'Update details']
      ] as const) {
        expect(box(state, label)).toEqual(expect.objectContaining(solid))
      }
      expect(solid.backgroundColor).not.toBe(outline.backgroundColor)
    })

    it('is the bar\'s outline action when nothing is asked of the driver: a review with nothing to add, an account ready', () => {
      for (const state of [loaded({ ...account, transfers_enabled: false }), loaded(account)]) {
        const painted = box(state, 'Update details')
        expect(painted).toEqual(expect.objectContaining(outline))
        expect(painted.backgroundColor).not.toBe(solid.backgroundColor)
        // The slot's size stays: the bar does not change height with the state.
        expect(painted.minHeight).toBe(defaultAppTheme().native.components.button.sizes[slots.button.size].height)
      }
    })

    it('is as tall in outline as in solid', () => {
      expect(box(loaded(account), 'Update details').minHeight).toBe(box(loaded(null), 'Connect Stripe account').minHeight)
    })
  })

  it('draws no action while the account loads, nor over its error state', () => {
    const loading = renderWithProviders(<StripeConnectAccount accountState={{ account: null, loading: true, error: null }} onboardingState={idle} />)
    expect(loading.queryByTestId('stripe-bar')).toBeNull()
    loading.unmount()
    const failed = renderWithProviders(<StripeConnectAccount accountState={{ account: null, loading: false, error: ['Server Error'] }} onboardingState={idle} />)
    expect(failed.queryByTestId('stripe-bar')).toBeNull()
  })

  describe('the steps to being paid', () => {
    const steps = (accountState: any) => {
      const { getByTestId } = renderWithProviders(<StripeConnectAccount accountState={accountState} onboardingState={idle} />)
      const list = getByTestId('stripe-steps')
      return ['done', 'current', 'todo'].reduce((all: Record<string, string[]>, state) => ({
        ...all,
        [state]: within(list).queryAllByTestId(`stripe-step-${state}`).map((step) => within(step).getAllByText(/./)[0].props.children)
      }), {})
    }

    it('lists them in order: connected, form, Stripe\'s review, ready to be paid', () => {
      const { getByTestId } = renderWithProviders(<StripeConnectAccount accountState={loaded(null)} onboardingState={idle} />)
      const texts = within(getByTestId('stripe-steps')).getAllByText(/./).map((node) => node.props.children)
      expect(texts).toEqual(['Account connected', 'Form completed', 'Stripe\'s review', 'Ready to receive payouts'])
    })

    it('has the first one to do while there is no account', () => {
      expect(steps(loaded(null))).toEqual({ done: [], current: ['Account connected'], todo: ['Form completed', 'Stripe\'s review', 'Ready to receive payouts'] })
    })

    it('has the form to do once the account is connected', () => {
      expect(steps(loaded({ ...account, details_submitted: false, transfers_enabled: false }))).toEqual({
        done: ['Account connected'],
        current: ['Form completed'],
        todo: ['Stripe\'s review', 'Ready to receive payouts']
      })
    })

    it('waits on Stripe\'s review once the form is sent', () => {
      expect(steps(loaded({ ...account, transfers_enabled: false }))).toEqual({
        done: ['Account connected', 'Form completed'],
        current: ['Stripe\'s review'],
        todo: ['Ready to receive payouts']
      })
    })

    it('has them all done when the account can receive transfers', () => {
      expect(steps(loaded(account))).toEqual({
        done: ['Account connected', 'Form completed', 'Stripe\'s review', 'Ready to receive payouts'],
        current: [],
        todo: []
      })
    })

    it('marks each step with its glyph in a role color: a check in success, the clock in the brand, a circle muted', () => {
      const color = defaultAppTheme().native.tokens.color
      const { getAllByTestId } = renderWithProviders(
        <StripeConnectAccount accountState={loaded({ ...account, transfers_enabled: false })} onboardingState={idle} />
      )
      const glyph = (state: string) => within(getAllByTestId(`stripe-step-${state}`)[0]).UNSAFE_getByType(require('../../shared/Icon').default).props
      expect(glyph('done')).toEqual(expect.objectContaining({ name: 'checkmark', color: 'success_text' }))
      expect(glyph('current')).toEqual(expect.objectContaining({ name: 'time-outline', color: 'primary_text' }))
      expect(glyph('todo')).toEqual(expect.objectContaining({ name: 'ellipse-outline', color: 'text_muted' }))
      expect(color.success_text).toBeTruthy()
    })

    it('writes the current step with the label\'s weight and the coming ones muted', () => {
      const color = defaultAppTheme().native.tokens.color
      const { getAllByTestId } = renderWithProviders(
        <StripeConnectAccount accountState={loaded({ ...account, transfers_enabled: false })} onboardingState={idle} />
      )
      const text = (state: string) => StyleSheet.flatten(within(getAllByTestId(`stripe-step-${state}`)[0]).getAllByText(/./)[0].props.style)
      expect(text('todo').color).toBe(color.text_muted)
      expect(text('current').fontFamily).not.toBe(text('done').fontFamily)
    })
  })

  it('shows the action busy while the form url is requested', () => {
    const { getByRole, queryByText } = renderWithProviders(
      <StripeConnectAccount accountState={loaded(null)} onboardingState={{ loading: true, error: null }} />
    )
    expect(getByRole('button', { busy: true })).toBeTruthy()
    expect(queryByText('Connect Stripe account')).toBeTruthy()
  })

  it('opens the Stripe form in the browser and reads the account again on return', async () => {
    const handleGetAccount = jest.fn()
    const handleGetOnboardingUrl = jest.fn().mockResolvedValue('https://connect.stripe.com/setup/e/acct_1/abc')
    const { getByText } = renderWithProviders(
      <StripeConnectAccount
        accountState={loaded(null)}
        onboardingState={idle}
        handleGetAccount={handleGetAccount}
        handleGetOnboardingUrl={handleGetOnboardingUrl}
      />
    )
    fireEvent.press(getByText('Connect Stripe account'))
    await waitFor(() => {
      expect(Linking.openURL).toHaveBeenCalledWith('https://connect.stripe.com/setup/e/acct_1/abc')
    })
    act(() => appStateHandler('background'))
    expect(handleGetAccount).not.toHaveBeenCalled()
    act(() => appStateHandler('active'))
    expect(handleGetAccount).toHaveBeenCalledTimes(1)
    act(() => appStateHandler('active'))
    expect(handleGetAccount).toHaveBeenCalledTimes(1)
  })

  it('does not read the account again on return when the form was not opened', () => {
    const handleGetAccount = jest.fn()
    renderWithProviders(
      <StripeConnectAccount accountState={loaded(account)} onboardingState={idle} handleGetAccount={handleGetAccount} />
    )
    act(() => appStateHandler('active'))
    expect(handleGetAccount).not.toHaveBeenCalled()
  })

  it('does not open a url outside Stripe', async () => {
    const handleGetOnboardingUrl = jest.fn().mockResolvedValue('https://evil.example/phish')
    const { getByText } = renderWithProviders(
      <StripeConnectAccount
        accountState={loaded(null)}
        onboardingState={idle}
        handleGetOnboardingUrl={handleGetOnboardingUrl}
      />
    )
    fireEvent.press(getByText('Connect Stripe account'))
    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith('error', 'The Stripe form could not be opened. Try again.')
    })
    expect(Linking.openURL).not.toHaveBeenCalled()
  })

  it('requests the form url once when the button is pressed twice', async () => {
    let answerUrl: (url: string) => void = () => {}
    const handleGetOnboardingUrl = jest.fn().mockReturnValue(new Promise(resolve => {
      answerUrl = resolve
    }))
    const { getByText } = renderWithProviders(
      <StripeConnectAccount
        accountState={loaded(null)}
        onboardingState={idle}
        handleGetOnboardingUrl={handleGetOnboardingUrl}
      />
    )
    fireEvent.press(getByText('Connect Stripe account'))
    fireEvent.press(getByText('Connect Stripe account'))
    expect(handleGetOnboardingUrl).toHaveBeenCalledTimes(1)
    await act(async () => {
      answerUrl('https://connect.stripe.com/setup/e/acct_1/abc')
    })
    expect(Linking.openURL).toHaveBeenCalledTimes(1)
  })

  it('does not open the browser when the form url could not be created', async () => {
    const handleGetOnboardingUrl = jest.fn().mockResolvedValue(null)
    const { getByText } = renderWithProviders(
      <StripeConnectAccount accountState={loaded(null)} onboardingState={idle} handleGetOnboardingUrl={handleGetOnboardingUrl} />
    )
    fireEvent.press(getByText('Connect Stripe account'))
    await waitFor(() => {
      expect(handleGetOnboardingUrl).toHaveBeenCalled()
    })
    expect(Linking.openURL).not.toHaveBeenCalled()
  })

  it('notifies when the browser cannot open the form', async () => {
    ;(Linking.openURL as jest.Mock).mockRejectedValue(new Error('no browser'))
    const handleGetAccount = jest.fn()
    const { getByText } = renderWithProviders(
      <StripeConnectAccount
        accountState={loaded(null)}
        onboardingState={idle}
        handleGetAccount={handleGetAccount}
        handleGetOnboardingUrl={jest.fn().mockResolvedValue('https://connect.stripe.com/setup')}
      />
    )
    fireEvent.press(getByText('Connect Stripe account'))
    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith('error', 'The Stripe form could not be opened. Try again.')
    })
    act(() => appStateHandler('active'))
    expect(handleGetAccount).not.toHaveBeenCalled()
  })

  it('notifies the error of the onboarding request', () => {
    renderWithProviders(
      <StripeConnectAccount
        accountState={loaded(null)}
        onboardingState={{ loading: false, error: ['ERROR_STRIPE_CONNECT_PAYOUTS_DISABLED'] }}
      />
    )
    expect(showToast).toHaveBeenCalledWith('error', 'Payouts with Stripe are not enabled')
  })

  it('reads the error key the API answers with its prefix when it has no translation', () => {
    const { getByText } = renderWithProviders(
      <StripeConnectAccount
        accountState={{ account: null, loading: false, error: ['API_ERROR_USER_FIND'] }}
        onboardingState={{ loading: false, error: ['API_ERROR_STRIPE_CONNECT_ONBOARDING'] }}
      />
    )
    expect(getByText('User not found')).toBeTruthy()
    expect(showToast).toHaveBeenCalledWith('error', 'The Stripe form could not be created. Try again later.')
  })

  it('shows the error and retries when the account cannot be loaded', () => {
    const handleGetAccount = jest.fn()
    const { getByText } = renderWithProviders(
      <StripeConnectAccount
        accountState={{ account: null, loading: false, error: ['Network request failed'] }}
        onboardingState={idle}
        handleGetAccount={handleGetAccount}
      />
    )
    expect(getByText('Network request failed')).toBeTruthy()
    fireEvent.press(getByText('Try Again'))
    expect(handleGetAccount).toHaveBeenCalled()
  })

  it('draws that error as the app\'s error state, not a card of its own (decision H5)', () => {
    const theme: any = defaultAppTheme()
    const { getByText, getByTestId, queryByTestId, UNSAFE_queryAllByType } = renderWithProviders(
      <StripeConnectAccount
        accountState={{ account: null, loading: false, error: ['Network request failed'] }}
        onboardingState={idle}
      />
    )
    // The empty state's icon (no bundled picture) and its message: `body_lg`, muted, centered.
    expect(getByTestId('not-found-icon')).toBeTruthy()
    expect(UNSAFE_queryAllByType(Image)).toHaveLength(0)
    const message = StyleSheet.flatten(getByText('Network request failed').props.style)
    expect(message.fontSize).toBe(theme.native.tokens.typography.body_lg.fontSize)
    expect(message.color).toBe(theme.native.tokens.color.text_muted)
    expect(message.textAlign).toBe('center')
    expect(queryByTestId('stripe-status-mark')).toBeNull()
  })

  it('keeps the retry off while the account is read again', () => {
    const handleGetAccount = jest.fn()
    const failed = { account: null, loading: false, error: ['Network request failed'] }
    const { getByRole, rerender } = renderWithProviders(
      <StripeConnectAccount accountState={failed} onboardingState={idle} handleGetAccount={handleGetAccount} />
    )
    rerender(<StripeConnectAccount accountState={{ ...failed, loading: true }} onboardingState={idle} handleGetAccount={handleGetAccount} />)
    const retry = getByRole('button', { name: 'Try Again' })
    expect(retry.props.accessibilityState.disabled).toBe(true)
    fireEvent.press(retry)
    expect(handleGetAccount).not.toHaveBeenCalled()
  })

  it('keeps the account on screen and notifies when a refresh fails', () => {
    const { getByText } = renderWithProviders(
      <StripeConnectAccount
        accountState={{ account, loading: false, error: ['Network request failed'] }}
        onboardingState={idle}
      />
    )
    expect(getByText('Your Stripe account is ready')).toBeTruthy()
    expect(showToast).toHaveBeenCalledWith('error', 'Network request failed')
  })
})
