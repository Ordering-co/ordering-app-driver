import React, { useEffect, useMemo, useRef, useState } from 'react'
import { AppState, Linking, RefreshControl, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from 'styled-components/native'

import { StripeConnectAccountParams } from '../../types'
import { getTraduction } from '../../utils'
import { nativeTextStyle, themeGutter, themePart, themeSpace } from '@/theme/helpers'

import {
  useLanguage,
  useToast,
  ToastType,
  StripeConnectAccount as StripeConnectAccountController
} from '@components'
import {
  Icon,
  OCard,
  ONavbar,
  OText,
  SkeletonBone,
} from '../shared'
import { NotFoundSource } from '../NotFoundSource'
import { FloatingButton } from '../FloatingButton'

/**
 * An account page (`account_page`: its room below, over the system's bottom
 * inset; the room above is the header's `xs`). The account's state is a card: a mark at the size of an empty
 * state's icon (`empty_state.icon_size`), a title in the card's title look
 * (`order_card`) and its explanation; under it, the four steps to being paid, each done, current or
 * still to come; the action is the app's bottom bar. An account that could not be read is
 * the app's error state (`NotFoundSource`), with its retry.
 */
const stripeStyles = (theme: any, bottomInset: number) => {
  const page = themePart(theme, 'account_page', 'base')
  const card = themePart(theme, 'order_card', 'base')
  return StyleSheet.create({
    page: { flex: 1 },
    content: {
      paddingHorizontal: themeGutter(theme),
      paddingBottom: page.padding_bottom + bottomInset,
      gap: themeSpace(theme, 'lg'),
    },
    status: { alignItems: 'flex-start', gap: themeSpace(theme, 'sm') },
    title: { ...nativeTextStyle(card.name), color: card.name_color },
    steps: { gap: themeSpace(theme, 'sm') },
    step: { flexDirection: 'row', alignItems: 'center', gap: themeSpace(theme, 'sm') },
    bones: { gap: themeSpace(theme, 'sm') },
  })
}

const getAccountStatus = (account: any) => {
  if (!account) return 'not_connected'
  if (!account.details_submitted) return 'incomplete'
  if (!account.transfers_enabled) return 'in_review'
  return 'ready'
}

/** Where the account is on the way to being paid: the step it is at (the first still to do). A ready account has done them all. */
const STEP_OF_STATUS: Record<string, number> = { not_connected: 0, incomplete: 1, in_review: 2, ready: 4 }

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
  const theme: any = useTheme()
  const insets = useSafeAreaInsets()
  const markSize = themePart(theme, 'empty_state', 'base.icon_size')
  // The pull-to-refresh spinner in the theme's spinner color (iOS tint, Android colors).
  const spinner = themePart(theme, 'spinner', 'base.color')
  const spinnerColors = useMemo(() => [spinner], [spinner])

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
  // The bar shows once the account is read, and not over its error state; it keeps the bottom inset itself.
  const hasBar = isLoaded && !(error && !account)
  const styles = useMemo(() => stripeStyles(theme, hasBar ? 0 : insets.bottom), [theme, insets.bottom, hasBar])
  const hasDetailsRequired =
    !!account?.requirements?.currently_due?.length || !!account?.requirements?.past_due?.length

  const statuses: any = {
    not_connected: {
      icon: 'card-outline',
      color: 'text_muted',
      title: t('STRIPE_ACCOUNT_NOT_CONNECTED', 'Connect your Stripe account'),
      description: t('STRIPE_ACCOUNT_NOT_CONNECTED_DESCRIPTION', 'Connect a Stripe account to receive the payouts of your deliveries.'),
      button: t('CONNECT_STRIPE_ACCOUNT', 'Connect Stripe account')
    },
    incomplete: {
      icon: 'alert-circle-outline',
      color: 'primary_text',
      title: t('STRIPE_ACCOUNT_INCOMPLETE', 'Finish setting up your Stripe account'),
      description: t('STRIPE_ACCOUNT_INCOMPLETE_DESCRIPTION', 'You have not finished the Stripe form yet. Continue where you left off to receive your payouts.'),
      button: t('CONTINUE', 'Continue')
    },
    in_review: {
      icon: 'time-outline',
      color: 'primary_text',
      title: t('STRIPE_ACCOUNT_IN_REVIEW', 'Your Stripe account is in review'),
      description: hasDetailsRequired
        ? t('STRIPE_ACCOUNT_DETAILS_REQUIRED', 'Stripe needs more details from you before you can receive payouts. Update your details to complete them.')
        : t('STRIPE_ACCOUNT_IN_REVIEW_DESCRIPTION', 'Stripe is reviewing your details. You will receive your payouts once your account is approved.'),
      button: t('UPDATE_DETAILS', 'Update details')
    },
    ready: {
      icon: 'checkmark-circle-outline',
      color: 'success_text',
      title: t('STRIPE_ACCOUNT_READY', 'Your Stripe account is ready'),
      description: t('STRIPE_ACCOUNT_READY_DESCRIPTION', 'You can receive the payouts of your deliveries.'),
      button: t('UPDATE_DETAILS', 'Update details')
    }
  }
  const currentStatus = statuses[status]
  // The action is the bar's strong one while the driver has something to do to be paid: connect, finish the
  // form, or give the details Stripe asks for (the mockup's "in review" is that case). Otherwise (a review with
  // nothing asked of the driver, an account ready) "Update details" is optional and is the outline one.
  const isRequiredAction = status === 'not_connected' || status === 'incomplete' || (status === 'in_review' && hasDetailsRequired)
  // From the account's own fields: connected, its form sent, Stripe's review passed, paid.
  const steps = [
    t('STRIPE_STEP_CONNECTED', 'Account connected'),
    t('STRIPE_STEP_FORM', 'Form completed'),
    t('STRIPE_STEP_REVIEW', 'Stripe\'s review'),
    t('STRIPE_STEP_READY', 'Ready to receive payouts')
  ]
  const currentStep = STEP_OF_STATUS[status]

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
    <View style={styles.page}>
      <ONavbar title={t('STRIPE_ACCOUNT', 'Stripe account')} onBack={() => goToBack()} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={!!loading && isLoaded}
            onRefresh={() => handleGetAccount?.()}
            tintColor={spinner}
            colors={spinnerColors}
          />
        }
      >
        {!isLoaded ? (
          <OCard testID='stripe-skeleton'>
            <View style={styles.bones}>
              <SkeletonBone width='60%' />
              <SkeletonBone width='90%' />
              <SkeletonBone width='40%' />
            </View>
          </OCard>
        ) : error && !account ? (
          <NotFoundSource
            content={getErrorMessage(error)}
            btnTitle={t('TRY_AGAIN', 'Try Again')}
            btnDisabled={!!loading}
            onClickButton={() => handleGetAccount?.()}
          />
        ) : (
          <>
            <OCard>
              <View style={styles.status}>
                <Icon testID='stripe-status-mark' name={currentStatus.icon} size={markSize} color={currentStatus.color} />
                <OText style={styles.title}>{currentStatus.title}</OText>
                <OText color='text_muted'>{currentStatus.description}</OText>
              </View>
            </OCard>
            <View style={styles.steps} testID='stripe-steps'>
              {steps.map((label, index) => {
                const state = index < currentStep ? 'done' : index === currentStep ? 'current' : 'todo'
                return (
                  <View key={label} style={styles.step} testID={`stripe-step-${state}`}>
                    <Icon
                      name={state === 'done' ? 'checkmark' : state === 'current' ? 'time-outline' : 'ellipse-outline'}
                      color={state === 'done' ? 'success_text' : state === 'current' ? 'primary_text' : 'text_muted'}
                    />
                    <OText preset={state === 'current' ? 'label' : 'body'} color={state === 'todo' ? 'text_muted' : 'text'}>{label}</OText>
                  </View>
                )
              })}
            </View>
          </>
        )}
      </ScrollView>
      {hasBar && (
        // The one action, in the app's bottom bar.
        <FloatingButton
          inline
          outline={!isRequiredAction}
          isPadding
          testID='stripe-bar'
          buttonTestID='stripe-action'
          btnText={currentStatus.button}
          loading={!!onboardingState?.loading}
          firstButtonClick={() => handleOpenForm()}
        />
      )}
    </View>
  )
}

export const StripeConnectAccount = (props: StripeConnectAccountParams) => {
  const stripeConnectAccountProps = {
    ...props,
    UIComponent: StripeConnectAccountUI
  }
  return <StripeConnectAccountController {...stripeConnectAccountProps} />
}
