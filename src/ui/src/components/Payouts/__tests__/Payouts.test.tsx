import React from 'react'
import { TouchableOpacity } from 'react-native'
import { fireEvent } from '@testing-library/react-native'

import { useToast, useUtils } from '@components'
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
    showToast = (useToast as jest.Mock)()[1].showToast
    showToast.mockClear()
    navigation = { navigate: jest.fn(), goBack: jest.fn(), canGoBack: jest.fn(() => true) }
  })

  it('renders the part of the driver of each payout', () => {
    const { getByText, getAllByText } = renderWithProviders(
      <Payouts navigation={navigation} payoutList={list([payout(1), payout(2, { driver_status: 'needs_review' })])} />
    )
    expect(getByText('Store 1')).toBeTruthy()
    expect(getByText('Order No. 12001')).toBeTruthy()
    expect(getByText('Store 2')).toBeTruthy()
    expect(getByText('Order No. 12002')).toBeTruthy()
    expect(getAllByText('$ 14.65')).toHaveLength(2)
    // One label in the tabs and one in the row of that status
    expect(getAllByText('Paid')).toHaveLength(2)
    expect(getAllByText('In review')).toHaveLength(2)
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
    expect(getAllByTestId('placeholder')).toHaveLength(5)
    expect(queryByText('Sorry, no results found')).toBeNull()
  })

  it('shows the empty state when there are no payouts', () => {
    const { getByText } = renderWithProviders(
      <Payouts navigation={navigation} payoutList={list([])} />
    )
    expect(getByText('Sorry, no results found')).toBeTruthy()
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

  it('goes back from the navbar', () => {
    const { UNSAFE_getAllByType } = renderWithProviders(
      <Payouts navigation={navigation} payoutList={list([])} />
    )
    fireEvent.press(UNSAFE_getAllByType(TouchableOpacity)[0])
    expect(navigation.goBack).toHaveBeenCalled()
  })
})
