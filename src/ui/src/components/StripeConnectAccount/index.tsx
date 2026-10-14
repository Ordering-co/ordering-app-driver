import React, { useEffect, useRef, useState } from 'react'
import { AppState, Linking, RefreshControl } from 'react-native'
import { Fade, Placeholder, PlaceholderLine } from 'rn-placeholder'
import AntIcon from 'react-native-vector-icons/AntDesign'
import { useTheme } from 'styled-components/native'

import { StripeConnectAccountParams } from '../../types'
import { getTraduction } from '../../utils'

import {
  Container,
  Header,
  Content,
  StatusCard,
  StatusIcon,
  StatusTitle,
  StatusDescription,
  PlaceholderCard
} from './styles'

import {
  useLanguage,
  useToast,
  ToastType,
  StripeConnectAccount as StripeConnectAccountController
} from '@components'
import { OButton, ONavbar } from '@ui'

const getAccountStatus = (account: any) => {
  if (!account) return 'not_connected'
  if (!account.details_submitted) return 'incomplete'
  if (!account.transfers_enabled) return 'in_review'
  return 'ready'
}

// Stripe account links are hosted on stripe.com. Anything else stays in the app.
const isStripeOnboardingUrl = (value: unknown): value is string => {
  if (typeof value !== 'string') return false
  try {
    const parsed = new URL(value)
    const host = parsed.hostname
    return parsed.protocol === 'https:' && (host === 'stripe.com' || host.endsWith('.stripe.com'))
  } catch {
    return false
  }
}

export const StripeConnectAccountUI = (props: StripeConnectAccountParams) => {
  const {
    navigation,
    accountState,
    onboardingState,
    handleGetAccount,
    handleGetOnboardingUrl
  } = props

  const [, t] = useLanguage()
  const [, { showToast }] = useToast()
  const theme = useTheme()

  const [isLoaded, setIsLoaded] = useState(false)
  // The driver fills the Stripe form in the browser: the account is read again when they come back
  const isFormOpened = useRef(false)
  const openingForm = useRef(false)
  const getAccount = useRef(handleGetAccount)
  getAccount.current = handleGetAccount

  const account = accountState?.account
  const loading = accountState?.loading
  const error = accountState?.error
  const status = getAccountStatus(account)
  const hasDetailsRequired =
    !!account?.requirements?.currently_due?.length || !!account?.requirements?.past_due?.length

  const statuses: any = {
    not_connected: {
      icon: 'creditcard',
      color: theme.colors.unselectText,
      title: t('STRIPE_ACCOUNT_NOT_CONNECTED', 'Connect your Stripe account'),
      description: t('STRIPE_ACCOUNT_NOT_CONNECTED_DESCRIPTION', 'Connect a Stripe account to receive the payouts of your deliveries.'),
      button: t('CONNECT_STRIPE_ACCOUNT', 'Connect Stripe account')
    },
    incomplete: {
      icon: 'exclamationcircleo',
      color: theme.colors.primary,
      title: t('STRIPE_ACCOUNT_INCOMPLETE', 'Finish setting up your Stripe account'),
      description: t('STRIPE_ACCOUNT_INCOMPLETE_DESCRIPTION', 'You have not finished the Stripe form yet. Continue where you left off to receive your payouts.'),
      button: t('CONTINUE', 'Continue')
    },
    in_review: {
      icon: 'clockcircleo',
      color: theme.colors.primary,
      title: t('STRIPE_ACCOUNT_IN_REVIEW', 'Your Stripe account is in review'),
      description: hasDetailsRequired
        ? t('STRIPE_ACCOUNT_DETAILS_REQUIRED', 'Stripe needs more details from you before you can receive payouts. Update your details to complete them.')
        : t('STRIPE_ACCOUNT_IN_REVIEW_DESCRIPTION', 'Stripe is reviewing your details. You will receive your payouts once your account is approved.'),
      button: t('UPDATE_DETAILS', 'Update details')
    },
    ready: {
      icon: 'checkcircleo',
      color: theme.colors.success500,
      title: t('STRIPE_ACCOUNT_READY', 'Your Stripe account is ready'),
      description: t('STRIPE_ACCOUNT_READY_DESCRIPTION', 'You can receive the payouts of your deliveries.'),
      button: t('UPDATE_DETAILS', 'Update details')
    }
  }
  const currentStatus = statuses[status]
  const isPrimaryAction = status === 'not_connected' || status === 'incomplete'

  const goToBack = () => navigation?.canGoBack() && navigation.goBack()

  const getErrorMessage = (err: any) => {
    const message = Array.isArray(err) ? err[0] : err
    // The API prefixes the keys it has no translation for
    return getTraduction(typeof message === 'string' ? message.replace(/^API_/, '') : message, t)
  }

  const handleOpenForm = async () => {
    if (openingForm.current) return
    openingForm.current = true
    try {
      const url = await handleGetOnboardingUrl?.()
      if (!url) return
      if (!isStripeOnboardingUrl(url)) {
        showToast(ToastType.Error, t('STRIPE_ACCOUNT_FORM_OPEN_ERROR', 'The Stripe form could not be opened. Try again.'))
        return
      }
      isFormOpened.current = true
      try {
        await Linking.openURL(url)
      } catch {
        isFormOpened.current = false
        showToast(ToastType.Error, t('STRIPE_ACCOUNT_FORM_OPEN_ERROR', 'The Stripe form could not be opened. Try again.'))
      }
    } finally {
      openingForm.current = false
    }
  }

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && isFormOpened.current) {
        isFormOpened.current = false
        getAccount.current?.()
      }
    })
    return () => subscription.remove()
  }, [])

  useEffect(() => {
    if (!loading) setIsLoaded(true)
  }, [loading])

  useEffect(() => {
    if (onboardingState?.error) {
      showToast(ToastType.Error, getErrorMessage(onboardingState.error))
    }
  }, [onboardingState?.error])

  useEffect(() => {
    // With an account on screen a failed refresh is only a notice: the last account read stays
    if (error && account) {
      showToast(ToastType.Error, getErrorMessage(error))
    }
  }, [error])

  return (
    <Container>
      <Header>
        <ONavbar title={t('STRIPE_ACCOUNT', 'Stripe account')} onBack={() => goToBack()} />
      </Header>
      <Content
        refreshControl={
          <RefreshControl
            refreshing={!!loading && isLoaded}
            onRefresh={() => handleGetAccount?.()}
          />
        }
      >
        {!isLoaded ? (
          <PlaceholderCard>
            <Placeholder Animation={Fade}>
              <PlaceholderLine width={60} />
              <PlaceholderLine width={90} />
              <PlaceholderLine width={40} />
            </Placeholder>
          </PlaceholderCard>
        ) : error && !account ? (
          <>
            <StatusCard>
              <StatusIcon>
                <AntIcon name='exclamationcircleo' size={48} color={theme.colors.danger500} />
              </StatusIcon>
              <StatusDescription>{getErrorMessage(error)}</StatusDescription>
            </StatusCard>
            <OButton
              text={t('TRY_AGAIN', 'Try Again')}
              isDisabled={!!loading}
              bgColor={theme.colors.primary}
              borderColor={theme.colors.primary}
              textStyle={{ color: theme.colors.white, fontSize: 16 }}
              style={{ borderRadius: 10 }}
              onClick={() => handleGetAccount?.()}
            />
          </>
        ) : (
          <>
            <StatusCard>
              <StatusIcon>
                <AntIcon name={currentStatus.icon} size={48} color={currentStatus.color} />
              </StatusIcon>
              <StatusTitle>{currentStatus.title}</StatusTitle>
              <StatusDescription>{currentStatus.description}</StatusDescription>
            </StatusCard>
            <OButton
              text={currentStatus.button}
              isLoading={!!onboardingState?.loading}
              indicatorColor={isPrimaryAction ? theme.colors.white : theme.colors.primary}
              bgColor={isPrimaryAction ? theme.colors.primary : theme.colors.white}
              borderColor={theme.colors.primary}
              textStyle={{ color: isPrimaryAction ? theme.colors.white : theme.colors.primary, fontSize: 16 }}
              style={{ borderRadius: 10 }}
              onClick={() => handleOpenForm()}
            />
          </>
        )}
      </Content>
    </Container>
  )
}

export const StripeConnectAccount = (props: StripeConnectAccountParams) => {
  const stripeConnectAccountProps = {
    ...props,
    UIComponent: StripeConnectAccountUI
  }
  return <StripeConnectAccountController {...stripeConnectAccountProps} />
}
