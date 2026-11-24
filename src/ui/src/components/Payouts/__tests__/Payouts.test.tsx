import '../../../../../../jest/helpers/uiModuleMocks'
import React from 'react'
import { ScrollView, StyleSheet } from 'react-native'
import { fireEvent } from '@testing-library/react-native'

import { useApi, useToast, useUtils } from '@components'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { defaultAppTheme } from '../../../../../theme/engine'

jest.mock('@ui', () => {
  const { buildD2AuthUiMock } = require('../../../../../../jest/helpers/d2AuthUiMock')
  return buildD2AuthUiMock()
})

jest.mock('@components', () => {
  const mockOrdering = require('../../../../../../jest/helpers/mockOrdering')
  const { renderUiController } = require('../../../../../../jest/helpers/d1ShellDefaults')
  return {
    ...mockOrdering,
    PayoutList: renderUiController({
      statusSelected: null,
      pagination: { currentPage: 1, pageSize: 10, totalPages: 1, total: 2 }
    })
  }
})

import { Payouts } from '..'

const payout = (id: number, values: any = {}) => ({
  id,
  order_id: 12000 + id,
  business_id: 41,
  currency: 'MXN',
  driver_amount: 14.65,
  driver_status: 'paid',
  review_reason: null,
  created_at: '2026-10-09 17:36:05',
  business: { id: 41, name: `Store ${id}` },
  ...values
})

const list = (payouts: any[], values: any = {}) => ({ payouts, loading: false, error: null, ...values })

describe('Payouts', () => {
  let showToast: jest.Mock
  let navigation: any

  beforeEach(() => {
    ;(useUtils as jest.Mock).mockReturnValue([{
      parsePrice: (value: number) => `$ ${value}`,
      parseDate: (value: string) => value
    }])
    ;(useApi as jest.Mock).mockReturnValue([{ project: 'demo' }, {}])
    showToast = (useToast as jest.Mock)()[1].showToast
    showToast.mockClear()
    navigation = { navigate: jest.fn(), goBack: jest.fn(), canGoBack: jest.fn(() => true) }
  })

  it('lays its cards `md` apart, as every list of cards, under the header\'s own `xs` (decision H8)', () => {
    const { UNSAFE_getByType } = renderWithProviders(<Payouts payoutList={list([payout(1), payout(2)])} />)
    const content = StyleSheet.flatten(UNSAFE_getByType(ScrollView).props.contentContainerStyle)
    expect(content.gap).toBe(defaultAppTheme().native.tokens.space.md)
    expect(content.paddingTop).toBeUndefined()
  })

  it('renders the part of the driver of each payout', () => {
    const { getByText, getAllByText } = renderWithProviders(
      <Payouts navigation={navigation} payoutList={list([payout(1), payout(2, { driver_status: 'needs_review' })])} />
    )
    expect(getByText('Store 1')).toBeTruthy()
    // The order's number and its date, on one line of metadata.
    expect(getByText('Order No. 12001 · 2026-10-09 17:36:05')).toBeTruthy()
    expect(getByText('Store 2')).toBeTruthy()
    expect(getByText('Order No. 12002 · 2026-10-09 17:36:05')).toBeTruthy()
    expect(getAllByText('$ 14.65')).toHaveLength(2)
    // One label in the tabs and one in the row of that status
    expect(getAllByText('Paid')).toHaveLength(2)
    expect(getAllByText('In review')).toHaveLength(2)
  })

  it('writes the amount of a payout at 16 and semibold (`order_card.base.total_text`)', () => {
    const total = defaultAppTheme().native.components.order_card.base.total_text
    expect(total).toEqual(expect.objectContaining({ fontSize: 16 }))
    const { getAllByText } = renderWithProviders(
      <Payouts navigation={navigation} payoutList={list([payout(1)])} />
    )
    const [amount] = getAllByText('$ 14.65')
    expect(StyleSheet.flatten(amount.props.style)).toEqual(expect.objectContaining({ fontSize: total.fontSize, fontFamily: total.fontFamily }))
  })

  it('writes the order number as the app\'s label, masked in a secure project (decision H2)', () => {
    ;(useApi as jest.Mock).mockReturnValue([{ project: 'quickiedelivery' }, {}])
    const { getByText, queryByText, getByTestId } = renderWithProviders(
      <Payouts navigation={navigation} payoutList={list([payout(1)])} />
    )
    expect(getByText('Order No. 1**** · 2026-10-09 17:36:05')).toBeTruthy()
    expect(queryByText(/12001/)).toBeNull()
    // The card still opens the order by its real id.
    fireEvent.press(getByTestId('payout-card'))
    expect(navigation.navigate).toHaveBeenCalledWith('OrderDetails', { orderId: 12001 })
  })

  it('filters by the status of the tab pressed', () => {
    const handleChangeStatus = jest.fn()
    const { getByText } = renderWithProviders(
      <Payouts navigation={navigation} payoutList={list([])} handleChangeStatus={handleChangeStatus} />
    )
    fireEvent.press(getByText('Paid'))
    expect(handleChangeStatus).toHaveBeenLastCalledWith('paid')
    fireEvent.press(getByText('Pending'))
    expect(handleChangeStatus).toHaveBeenLastCalledWith('pending')
    fireEvent.press(getByText('In review'))
    expect(handleChangeStatus).toHaveBeenLastCalledWith('needs_review')
    fireEvent.press(getByText('All'))
    expect(handleChangeStatus).toHaveBeenLastCalledWith(null)
  })

  it('opens the order of the payout pressed', () => {
    const { getByText } = renderWithProviders(
      <Payouts navigation={navigation} payoutList={list([payout(1)])} />
    )
    fireEvent.press(getByText('Store 1'))
    expect(navigation.navigate).toHaveBeenCalledWith('OrderDetails', { orderId: 12001 })
  })

  it('invites to connect the Stripe account when a payout waits for it', () => {
    const { getByText } = renderWithProviders(
      <Payouts
        navigation={navigation}
        payoutList={list([payout(1, { driver_status: 'needs_review', review_reason: 'no_driver_account' })])}
      />
    )
    expect(getByText('You have payouts waiting for your Stripe account. Connect it to receive them.')).toBeTruthy()
    fireEvent.press(getByText('Connect Stripe account'))
    expect(navigation.navigate).toHaveBeenCalledWith('StripeConnectAccount')
  })

  it('draws the notice\'s action as every notice\'s: a medium outline button at the start (decision H5; the boards draw it 44 high)', () => {
    const button = defaultAppTheme().native.components.button
    const { getByText, getByRole } = renderWithProviders(
      <Payouts
        navigation={navigation}
        payoutList={list([payout(1, { driver_status: 'needs_review', review_reason: 'no_driver_account' })])}
      />
    )
    expect(StyleSheet.flatten(getByText('Connect Stripe account').props.style).color).toBe(button.variants.primary.outline.color)
    const box = StyleSheet.flatten(getByRole('button', { name: 'Connect Stripe account' }).children[0].props.style)
    expect(box.minHeight ?? box.height).toBe(button.sizes.md.height)
    expect(box.alignSelf).toBe('flex-start')
  })

  it('does not invite to connect when no payout waits for the account', () => {
    const { queryByText } = renderWithProviders(
      <Payouts navigation={navigation} payoutList={list([payout(1)])} />
    )
    expect(queryByText('Connect Stripe account')).toBeNull()
  })

  it('loads more payouts while there are pages left', () => {
    const loadMorePayouts = jest.fn()
    const { getByText } = renderWithProviders(
      <Payouts
        navigation={navigation}
        payoutList={list([payout(1)])}
        pagination={{ currentPage: 1, pageSize: 10, totalPages: 3, total: 25 }}
        loadMorePayouts={loadMorePayouts}
      />
    )
    fireEvent.press(getByText('Load more'))
    expect(loadMorePayouts).toHaveBeenCalled()
  })

  it('draws load more as the quiet outline button, not the primary action', () => {
    const button = defaultAppTheme().native.components.button.variants.neutral.outline
    const { getByRole } = renderWithProviders(
      <Payouts
        navigation={navigation}
        payoutList={list([payout(1)])}
        pagination={{ currentPage: 1, pageSize: 10, totalPages: 3, total: 25 }}
      />
    )
    const box = StyleSheet.flatten(getByRole('button', { name: 'Load more' }).children[0].props.style)
    expect(box.borderColor).toBe(button.border.borderColor)
    expect(box.backgroundColor).toBe(button.background)
  })

  it('hides load more on the last page', () => {
    const { queryByText } = renderWithProviders(
      <Payouts navigation={navigation} payoutList={list([payout(1)])} />
    )
    expect(queryByText('Load more')).toBeNull()
  })

  it('shows placeholders while the first page loads', () => {
    const { getAllByTestId, queryByText } = renderWithProviders(
      <Payouts navigation={navigation} payoutList={list([], { loading: true })} />
    )
    expect(getAllByTestId('payout-skeleton')).toHaveLength(5)
    expect(queryByText('Sorry, no results found')).toBeNull()
  })

  it('shows the empty state when there are no payouts', () => {
    const { getByText, getByTestId } = renderWithProviders(
      <Payouts navigation={navigation} payoutList={list([])} />
    )
    expect(getByText('Sorry, no results found')).toBeTruthy()
    // No bundled picture: the empty state's icon.
    expect(getByTestId('not-found-icon')).toBeTruthy()
  })

  it('shows the error and retries when the payouts cannot be loaded', () => {
    const handleRefreshPayouts = jest.fn()
    const { getByText } = renderWithProviders(
      <Payouts
        navigation={navigation}
        payoutList={list([], { error: ['Network request failed'] })}
        handleRefreshPayouts={handleRefreshPayouts}
      />
    )
    expect(getByText('Network request failed')).toBeTruthy()
    fireEvent.press(getByText('Try Again'))
    expect(handleRefreshPayouts).toHaveBeenCalled()
  })

  it('keeps the payouts on screen and notifies when the next page fails', () => {
    const { getByText } = renderWithProviders(
      <Payouts navigation={navigation} payoutList={list([payout(1)], { error: ['Network request failed'] })} />
    )
    expect(getByText('Store 1')).toBeTruthy()
    expect(showToast).toHaveBeenCalledWith('error', 'Network request failed')
  })

  it('marks the selected status tab', () => {
    const { getAllByRole } = renderWithProviders(
      <Payouts navigation={navigation} payoutList={list([])} statusSelected='pending' />
    )
    const tabs = getAllByRole('tab')
    expect(tabs).toHaveLength(4)
    expect(tabs.map((tab: any) => tab.props.accessibilityState.selected)).toEqual([false, false, true, false])
  })

  it('selects the tab of every status while the controller filters by none', () => {
    const { getAllByRole } = renderWithProviders(
      <Payouts navigation={navigation} payoutList={list([])} />
    )
    expect(getAllByRole('tab')[0].props.accessibilityState.selected).toBe(true)
  })

  it('paints each status as a badge by its state: paid success, pending warning, in review danger', () => {
    const badge = defaultAppTheme().native.components.badge.variants
    const { getAllByText } = renderWithProviders(
      <Payouts
        navigation={navigation}
        payoutList={list([
          payout(1, { driver_status: 'paid' }),
          payout(2, { driver_status: 'pending' }),
          payout(3, { driver_status: 'needs_review' })
        ])}
      />
    )
    // The second label of each status is the card's badge (the first is its tab).
    const color = (label: string) => StyleSheet.flatten(getAllByText(label)[1].props.style).color
    expect(color('Paid')).toBe(badge.success.color)
    expect(color('Pending')).toBe(badge.warning.color)
    expect(color('In review')).toBe(badge.danger.color)
  })

  it('draws no badge for a status the app does not know', () => {
    const { getAllByTestId, queryByText } = renderWithProviders(
      <Payouts navigation={navigation} payoutList={list([payout(1, { driver_status: 'on_hold' })])} />
    )
    expect(getAllByTestId('payout-card')).toHaveLength(1)
    expect(queryByText('on_hold')).toBeNull()
  })

  it('opens the order from anywhere on the card', () => {
    const { getByTestId } = renderWithProviders(
      <Payouts navigation={navigation} payoutList={list([payout(1)])} />
    )
    fireEvent.press(getByTestId('payout-card'))
    expect(navigation.navigate).toHaveBeenCalledWith('OrderDetails', { orderId: 12001 })
  })

  it('goes back from the navbar', () => {
    const { getByLabelText } = renderWithProviders(
      <Payouts navigation={navigation} payoutList={list([])} />
    )
    fireEvent.press(getByLabelText('Go back'))
    expect(navigation.goBack).toHaveBeenCalled()
  })
})
