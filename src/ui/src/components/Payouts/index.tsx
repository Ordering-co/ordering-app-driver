import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from 'styled-components/native'

import { PayoutsParams } from '../../types'
import { getTraduction } from '../../utils'
import { useSecureOrderId } from '../../hooks/useSecureOrderId'
import { nativeTextStyle, themeGutter, themePart, themeSpace } from '@/theme/helpers'

import {
  useLanguage,
  useUtils,
  useToast,
  ToastType,
  PayoutList as PayoutListController
} from '@components'
import { NotFoundSource } from '../NotFoundSource'
import {
  OBadge,
  OButton,
  OCard,
  ONavbar,
  ONotice,
  OText,
  SkeletonBone,
  Tabs,
} from '../shared'

/** The tab of every status (the controller's `null`). */
const ALL = 'all'

/** A payout's state as a badge (decision D4): waiting is a warning, paid a success, held a danger. */
const STATUS_VARIANTS: Record<string, 'success' | 'warning' | 'danger'> = {
  paid: 'success',
  pending: 'warning',
  needs_review: 'danger'
}

/**
 * An account page (`account_page`: its room below, over the system's bottom
 * inset; the room above is the header's `xs`). A payout is a card: its store and amount in the card's title
 * look, the order's number and date on one line of metadata (`order_card`).
 */
const payoutsStyles = (theme: any, bottomInset: number) => {
  const page = themePart(theme, 'account_page', 'base')
  const card = themePart(theme, 'order_card', 'base')
  const notice = themePart(theme, 'alert', 'base')
  return StyleSheet.create({
    page: { flex: 1 },
    tabs: {
      paddingHorizontal: themeGutter(theme),
      paddingBottom: themeSpace(theme, 'md'),
    },
    content: {
      paddingHorizontal: themeGutter(theme),
      paddingBottom: page.padding_bottom + bottomInset,
      gap: themeSpace(theme, 'md'),
    },
    notice: { gap: notice.gap },
    noticeText: { ...nativeTextStyle(notice.text), color: themePart(theme, 'alert', 'variants.warning.color') },
    // A notice's action hugs its label, at the start of the notice.
    noticeAction: { alignSelf: 'flex-start' },
    row: { flexDirection: 'row', alignItems: 'center', gap: themeSpace(theme, 'sm') },
    info: { flex: 1, gap: themeSpace(theme, 'xxs') },
    amount: { alignItems: 'flex-end', gap: themeSpace(theme, 'xs') },
    title: { ...nativeTextStyle(card.name), color: card.name_color },
    // The payout's amount: the card's total look (`order_card.base.total_text`).
    total: { ...nativeTextStyle(card.total_text), color: card.name_color },
    meta: { ...nativeTextStyle(card.meta), color: card.meta_color },
    status: { alignSelf: 'flex-end' },
    bones: { gap: themeSpace(theme, 'sm') },
  })
}

interface PayoutCardProps {
  payout: any
  styles: ReturnType<typeof payoutsStyles>
  statuses: Record<string, string>
  onOpen: (payout: any) => void
}

/** One payout: the whole card opens its order, whose number is the app's order-number label (masked in a secure project). */
const PayoutCard = React.memo(({ payout, styles, statuses, onOpen }: PayoutCardProps) => {
  const [{ parsePrice, parseDate }] = useUtils()
  const { orderNumberLabel } = useSecureOrderId()
  const open = useCallback(() => onOpen(payout), [onOpen, payout])
  return (
    <OCard onPress={open} testID='payout-card'>
      <View style={styles.row}>
        <View style={styles.info}>
          <OText style={styles.title} numberOfLines={1}>{payout.business?.name}</OText>
          <OText style={styles.meta} numberOfLines={1}>{`${orderNumberLabel(payout.order_id)} · ${parseDate(payout.created_at)}`}</OText>
        </View>
        <View style={styles.amount}>
          <OText style={styles.total}>{parsePrice(payout.driver_amount)}</OText>
          {!!statuses[payout.driver_status] && (
            <OBadge variant={STATUS_VARIANTS[payout.driver_status]} style={styles.status}>
              {statuses[payout.driver_status]}
            </OBadge>
          )}
        </View>
      </View>
    </OCard>
  )
})

export const PayoutsUI = (props: PayoutsParams) => {
  const {
    navigation,
    payoutList,
    pagination,
    statusSelected,
    loadMorePayouts,
    handleChangeStatus,
    handleRefreshPayouts
  } = props

  const [, t] = useLanguage()
  const [, { showToast }] = useToast()
  const theme: any = useTheme()
  const insets = useSafeAreaInsets()
  const styles = useMemo(() => payoutsStyles(theme, insets.bottom), [theme, insets.bottom])
  // The pull-to-refresh spinner in the theme's spinner color (iOS tint, Android colors).
  const spinner = themePart(theme, 'spinner', 'base.color')
  const spinnerColors = useMemo(() => [spinner], [spinner])

  const [isRefreshing, setIsRefreshing] = useState(false)

  const payouts = payoutList?.payouts ?? []
  const loading = payoutList?.loading
  const error = payoutList?.error

  const tabs = [
    { key: ALL, text: t('ALL', 'All') },
    { key: 'paid', text: t('PAYOUT_STATUS_PAID', 'Paid') },
    { key: 'pending', text: t('PENDING', 'Pending') },
    { key: 'needs_review', text: t('PAYOUT_STATUS_IN_REVIEW', 'In review') }
  ]

  const paid = t('PAYOUT_STATUS_PAID', 'Paid')
  const pending = t('PENDING', 'Pending')
  const inReview = t('PAYOUT_STATUS_IN_REVIEW', 'In review')
  const statuses = useMemo(() => ({ paid, pending, needs_review: inReview }), [paid, pending, inReview])

  // Their part of these payouts is waiting for the driver to connect or finish their Stripe account
  const isAccountRequired = payouts.some((payout: any) => payout.review_reason === 'no_driver_account')
  const hasMorePayouts = !!pagination?.totalPages && pagination.currentPage < pagination.totalPages

  const goToBack = () => navigation?.canGoBack() && navigation.goBack()
  const openOrder = useCallback(
    (payout: any) => navigation?.navigate('OrderDetails', { orderId: payout.order_id }),
    [navigation]
  )

  const getErrorMessage = (err: any) => {
    const message = Array.isArray(err) ? err[0] : err
    // The API prefixes the keys it has no translation for
    return getTraduction(typeof message === 'string' ? message.replace(/^API_/, '') : message, t)
  }

  const onRefresh = () => {
    setIsRefreshing(true)
    handleRefreshPayouts?.()
  }

  useEffect(() => {
    if (!loading) setIsRefreshing(false)
  }, [loading])

  useEffect(() => {
    // With payouts on screen a failed page is only a notice: the ones loaded stay
    if (error && payouts.length > 0) {
      showToast(ToastType.Error, getErrorMessage(error))
    }
  }, [error])

  return (
    <View style={styles.page}>
      <ONavbar title={t('PAYOUTS', 'Payouts')} onBack={() => goToBack()} />
      <View style={styles.tabs}>
        <Tabs
          fill
          tabs={tabs}
          selected={statusSelected ?? ALL}
          onChange={(key: string) => handleChangeStatus?.(key === ALL ? null : key)}
        />
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => onRefresh()}
            tintColor={spinner}
            colors={spinnerColors}
          />
        }
      >
        {isAccountRequired && (
          <ONotice variant='warning'>
            <View style={styles.notice}>
              <OText style={styles.noticeText}>
                {t('PAYOUTS_STRIPE_ACCOUNT_REQUIRED', 'You have payouts waiting for your Stripe account. Connect it to receive them.')}
              </OText>
              <OButton
                size='md'
                appearance='outline'
                style={styles.noticeAction}
                text={t('CONNECT_STRIPE_ACCOUNT', 'Connect Stripe account')}
                onClick={() => navigation?.navigate('StripeConnectAccount')}
              />
            </View>
          </ONotice>
        )}
        {payouts.map((payout: any) => (
          <PayoutCard key={payout.id} payout={payout} styles={styles} statuses={statuses} onOpen={openOrder} />
        ))}
        {loading && !isRefreshing && (
          [...Array(payouts.length ? 2 : 5).keys()].map(i => (
            <OCard key={`placeholder_${i}`} testID='payout-skeleton'>
              <View style={styles.bones}>
                <SkeletonBone width='50%' />
                <SkeletonBone width='30%' />
              </View>
            </OCard>
          ))
        )}
        {!loading && !!error && payouts.length === 0 && (
          <NotFoundSource
            content={getErrorMessage(error)}
            btnTitle={t('TRY_AGAIN', 'Try Again')}
            onClickButton={() => handleRefreshPayouts?.()}
          />
        )}
        {!loading && !error && payouts.length === 0 && (
          <NotFoundSource content={t('NO_RESULTS_FOUND', 'Sorry, no results found')} />
        )}
        {!loading && hasMorePayouts && payouts.length > 0 && (
          <OButton
            text={t('LOAD_MORE', 'Load more')}
            color='neutral'
            appearance='outline'
            onClick={() => loadMorePayouts?.()}
          />
        )}
      </ScrollView>
    </View>
  )
}

export const Payouts = (props: PayoutsParams) => {
  const payoutsProps = {
    ...props,
    UIComponent: PayoutsUI
  }
  return <PayoutListController {...payoutsProps} />
}
