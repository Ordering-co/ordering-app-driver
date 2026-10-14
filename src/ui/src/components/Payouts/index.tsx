import React, { useEffect, useState } from 'react'
import { RefreshControl } from 'react-native'
import { Fade, Placeholder, PlaceholderLine } from 'rn-placeholder'
import { useTheme } from 'styled-components/native'

import { PayoutsParams } from '../../types'
import { getTraduction } from '../../utils'

import {
  Container,
  Header,
  Tabs,
  Tab,
  TabText,
  List,
  Notice,
  NoticeText,
  PayoutItem,
  PayoutInfo,
  PayoutAmount,
  PayoutTitle,
  PayoutText,
  PayoutStatus,
  Footer
} from './styles'

import {
  useLanguage,
  useUtils,
  useToast,
  ToastType,
  PayoutList as PayoutListController
} from '@components'
import { NotFoundSource, OButton, ONavbar } from '@ui'

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
  const [{ parsePrice, parseDate }] = useUtils()
  const [, { showToast }] = useToast()
  const theme = useTheme()

  const [isRefreshing, setIsRefreshing] = useState(false)

  const payouts = payoutList?.payouts ?? []
  const loading = payoutList?.loading
  const error = payoutList?.error

  const tabs = [
    { key: null, text: t('ALL', 'All') },
    { key: 'paid', text: t('PAYOUT_STATUS_PAID', 'Paid') },
    { key: 'pending', text: t('PENDING', 'Pending') },
    { key: 'needs_review', text: t('PAYOUT_STATUS_IN_REVIEW', 'In review') }
  ]

  const statuses: any = {
    paid: { text: t('PAYOUT_STATUS_PAID', 'Paid'), color: theme.colors.success500 },
    pending: { text: t('PENDING', 'Pending'), color: theme.colors.primary },
    needs_review: { text: t('PAYOUT_STATUS_IN_REVIEW', 'In review'), color: theme.colors.danger500 }
  }

  // Their part of these payouts is waiting for the driver to connect or finish their Stripe account
  const isAccountRequired = payouts.some((payout: any) => payout.review_reason === 'no_driver_account')
  const hasMorePayouts = !!pagination?.totalPages && pagination.currentPage < pagination.totalPages

  const goToBack = () => navigation?.canGoBack() && navigation.goBack()

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
    <Container>
      <Header>
        <ONavbar title={t('PAYOUTS', 'Payouts')} onBack={() => goToBack()} />
      </Header>
      <Tabs>
        {tabs.map(tab => (
          <Tab
            key={tab.key ?? 'all'}
            isSelected={tab.key === statusSelected}
            onPress={() => handleChangeStatus?.(tab.key)}
          >
            <TabText isSelected={tab.key === statusSelected}>{tab.text}</TabText>
          </Tab>
        ))}
      </Tabs>
      <List
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={() => onRefresh()} />
        }
      >
        {isAccountRequired && (
          <Notice>
            <NoticeText>
              {t('PAYOUTS_STRIPE_ACCOUNT_REQUIRED', 'You have payouts waiting for your Stripe account. Connect it to receive them.')}
            </NoticeText>
            <OButton
              text={t('CONNECT_STRIPE_ACCOUNT', 'Connect Stripe account')}
              bgColor={theme.colors.primary}
              borderColor={theme.colors.primary}
              textStyle={{ color: theme.colors.white, fontSize: 14 }}
              style={{ borderRadius: 10, height: 40 }}
              onClick={() => navigation?.navigate('StripeConnectAccount')}
            />
          </Notice>
        )}
        {payouts.map((payout: any) => (
          <PayoutItem
            key={payout.id}
            onPress={() => navigation?.navigate('OrderDetails', { orderId: payout.order_id })}
          >
            <PayoutInfo>
              <PayoutTitle numberOfLines={1}>{payout.business?.name}</PayoutTitle>
              <PayoutText>{t('ORDER_NO', 'Order No.')} {payout.order_id}</PayoutText>
              <PayoutText>{parseDate(payout.created_at)}</PayoutText>
            </PayoutInfo>
            <PayoutAmount>
              <PayoutTitle>{parsePrice(payout.driver_amount)}</PayoutTitle>
              {statuses[payout.driver_status] && (
                <PayoutStatus color={statuses[payout.driver_status].color}>
                  {statuses[payout.driver_status].text}
                </PayoutStatus>
              )}
            </PayoutAmount>
          </PayoutItem>
        ))}
        {loading && !isRefreshing && (
          [...Array(payouts.length ? 2 : 5).keys()].map(i => (
            <PayoutItem key={`placeholder_${i}`} disabled>
              <Placeholder Animation={Fade}>
                <PlaceholderLine width={50} />
                <PlaceholderLine width={30} />
              </Placeholder>
            </PayoutItem>
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
        <Footer>
          {!loading && hasMorePayouts && payouts.length > 0 && (
            <OButton
              text={t('LOAD_MORE', 'Load more')}
              bgColor={theme.colors.primary}
              borderColor={theme.colors.primary}
              textStyle={{ color: theme.colors.white, fontSize: 16 }}
              style={{ borderRadius: 10 }}
              onClick={() => loadMorePayouts?.()}
            />
          )}
        </Footer>
      </List>
    </Container>
  )
}

export const Payouts = (props: PayoutsParams) => {
  const payoutsProps = {
    ...props,
    UIComponent: PayoutsUI
  }
  return <PayoutListController {...payoutsProps} />
}
