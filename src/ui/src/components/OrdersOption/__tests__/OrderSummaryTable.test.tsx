import React from 'react'
import { StyleSheet } from 'react-native'
import { fireEvent, within } from '@testing-library/react-native'

jest.mock('@components', () => {
  const { getMock } = require('../../../../../../jest/helpers/d3OrdersComponentsMock')
  return getMock()
})

import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { defaultAppTheme } from '../../../../../theme/engine'
import { OrderSummaryTable } from '../OrderSummaryTable'
import { buildOrderSummary } from '../orderSummaryUtils'

const theme: any = defaultAppTheme()
const flat = (node: any) => StyleSheet.flatten(node.props.style)

const orders = [
  { id: 1, status: 1, cash: 10 },
  { id: 2, status: 11, cash: '4.5' },
  { id: 3, status: 15, pay_data: 3 },
  { id: 4, status: 12 },
  { id: 5, status: 12 },
  // Not counted by either: a status the summary does not know.
  { id: 6, status: 0, cash: 99 }
]

const baseProps = {
  orders,
  successStatuses: [1, 11, 15],
  failedStatuses: [12],
  driverName: 'Carlos Méndez',
  filterSummary: [{ label: 'Date', value: 'Today' }, { label: 'City', value: 'Madrid' }],
  loading: false,
  totalCount: 9,
  canLoadMore: false,
  onLoadMore: jest.fn()
}

describe('OrderSummaryTable', () => {
  it('shows the day\'s numbers as tiles: the completed and the cancelled orders and the cash tips', () => {
    const { getByTestId } = renderWithProviders(<OrderSummaryTable {...baseProps} />)
    const completed = getByTestId('order-summary-completed')
    expect(within(completed).getByText('Completed')).toBeTruthy()
    expect(within(completed).getByText('3')).toBeTruthy()
    const cancelled = getByTestId('order-summary-cancelled')
    expect(within(cancelled).getByText('Cancelled')).toBeTruthy()
    // Only the failed deliveries count here, as the table always counted them.
    expect(within(cancelled).getByText('2')).toBeTruthy()
    const tips = getByTestId('order-summary-tips')
    expect(within(tips).getByText('Tip (Cash)')).toBeTruthy()
    // The cash of the completed orders: `cash`, else a numeric `pay_data`.
    expect(within(tips).getByText('$17.5')).toBeTruthy()
  })

  it('paints each tile in the state it counts (decision D4)', () => {
    const { getByTestId } = renderWithProviders(<OrderSummaryTable {...baseProps} />)
    expect(flat(getByTestId('order-summary-completed')).backgroundColor).toBe(theme.native.tokens.color.success_subtle)
    expect(flat(getByTestId('order-summary-cancelled')).backgroundColor).toBe(theme.native.tokens.color.danger_subtle)
    expect(flat(getByTestId('order-summary-tips')).backgroundColor).toBe(theme.native.tokens.color.surface_alt)
  })

  it('names the driver and each filter that has a value, and how many orders are loaded of the total', () => {
    const { getByText } = renderWithProviders(<OrderSummaryTable {...baseProps} />)
    expect(getByText('Driver')).toBeTruthy()
    expect(getByText('Carlos Méndez')).toBeTruthy()
    expect(getByText('Today')).toBeTruthy()
    expect(getByText('Madrid')).toBeTruthy()
    expect(getByText('Loaded: 6 of 9')).toBeTruthy()
  })

  it('takes the driver from the first order when it has one', () => {
    const { getByText } = renderWithProviders(
      <OrderSummaryTable {...baseProps} orders={[{ id: 1, status: 1, driver: { name: 'Ana', lastname: 'Ruiz' } }]} />
    )
    expect(getByText('Ana Ruiz')).toBeTruthy()
  })

  it('folds to the one line it always had, and opens again', () => {
    const { getByLabelText, queryByTestId, getByText } = renderWithProviders(<OrderSummaryTable {...baseProps} />)
    fireEvent.press(getByLabelText('Collapse'))
    expect(queryByTestId('order-summary-completed')).toBeNull()
    expect(getByText('Summary: ✓3 · ✗2 · $17.5')).toBeTruthy()
    fireEvent.press(getByLabelText('Expand'))
    expect(queryByTestId('order-summary-completed')).toBeTruthy()
  })

  it('offers to load more orders only while there are more pages', () => {
    const onLoadMore = jest.fn()
    const without = renderWithProviders(<OrderSummaryTable {...baseProps} />)
    expect(without.queryByText('Load more orders')).toBeNull()
    without.unmount()
    const { getByText } = renderWithProviders(<OrderSummaryTable {...baseProps} canLoadMore onLoadMore={onLoadMore} />)
    fireEvent.press(getByText('Load more orders'))
    expect(onLoadMore).toHaveBeenCalled()
  })
})

describe('buildOrderSummary', () => {
  it('counts the success and the failed statuses, adds the cash of the successful ones and flattens the cart groups', () => {
    const summary = buildOrderSummary([[['g1', [{ status: 1, cash: 2 }, { status: 12 }]]], { status: 11, cash: 3 }], { successStatuses: [1, 11], failedStatuses: [12] })
    expect(summary).toEqual({ exitosa: { count: 2, tips: 5 }, fallida: { count: 1, tips: 0 } })
  })
})
