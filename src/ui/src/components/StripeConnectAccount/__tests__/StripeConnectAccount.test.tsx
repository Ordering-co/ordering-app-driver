import React from 'react'
import { AppState, Linking } from 'react-native'
import { act, fireEvent, waitFor } from '@testing-library/react-native'

import { useToast } from '@components'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'

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
  return {
    ...mockOrdering,
    StripeConnectAccount: renderUiController({
      navigation: { goBack: jest.fn(), canGoBack: jest.fn(() => true) }
    })
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
    expect(getByTestId('placeholder')).toBeTruthy()
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
