import React from 'react'
import { StyleSheet } from 'react-native'

jest.mock('@components', () => ({
  ...require('../../../../../../jest/helpers/mockOrdering'),
  useUtils: () => [{ parsePrice: (value: number) => `$${Number(value ?? 0).toFixed(2)}` }]
}))

import { CollectRecap } from '../CollectRecap'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { buildAppTheme, defaultAppTheme, THEME_PRODUCT_TYPE } from '../../../../../theme/engine'

const theme = defaultAppTheme()
const flat = (node: any) => StyleSheet.flatten(node.props.style)

const cash = { event: 'payment', paymethod: { gateway: 'cash', name: 'Cash' } }
const card = { event: 'payment', paymethod: { gateway: 'stripe', name: 'Card' } }
const hideTotal = buildAppTheme({ version: 2, product_type: THEME_PRODUCT_TYPE, values: { visibility: { 'confirmation.order.total': false } } })

describe('CollectRecap, what the driver collects', () => {
  describe('a cash order', () => {
    it('says "Collect in cash", the change of the bill the customer pays with, and the total', () => {
      const { getByText, queryByText } = renderWithProviders(
        <CollectRecap order={{ payment_events: [cash], cash: 50, summary: { total: 32.37 } }} />
      )
      expect(getByText('Collect in cash')).toBeTruthy()
      expect(getByText('Change of $50.00')).toBeTruthy()
      expect(getByText('$32.37')).toBeTruthy()
      // The methods' line is not written: the order is cash.
      expect(queryByText('Cash')).toBeNull()
    })

    it('has no change line without the customer\'s bill', () => {
      const { getByText, queryByText } = renderWithProviders(
        <CollectRecap order={{ payment_events: [cash], cash: 0, total: 10 }} />
      )
      expect(getByText('Collect in cash')).toBeTruthy()
      expect(queryByText(/Change of/)).toBeNull()
      expect(getByText('$10.00')).toBeTruthy()
    })

    it('is a cash order without payment events when its method is cash', () => {
      const { getByText } = renderWithProviders(
        <CollectRecap order={{ paymethod: { gateway: 'cash', name: 'Cash' }, cash: 20, total: 5 }} />
      )
      expect(getByText('Collect in cash')).toBeTruthy()
      expect(getByText('Change of $20.00')).toBeTruthy()
    })
  })

  describe('any other order', () => {
    it('writes the payment methods and the total, and not "Collect in cash"', () => {
      const { getByText, queryByText } = renderWithProviders(
        <CollectRecap order={{ payment_events: [card], summary: { total: 18 } }} />
      )
      expect(getByText('Card')).toBeTruthy()
      expect(getByText('$18.00')).toBeTruthy()
      expect(queryByText('Collect in cash')).toBeNull()
    })

    it('writes every method of a mixed payment, the cash one with the bill the customer pays with', () => {
      const { getByText, queryByText } = renderWithProviders(
        <CollectRecap order={{ payment_events: [card, cash], cash: 50, summary: { total: 32.37 } }} />
      )
      expect(getByText('Card, Cash (Change of $50.00)')).toBeTruthy()
      expect(getByText('$32.37')).toBeTruthy()
      expect(queryByText('Collect in cash')).toBeNull()
      // The change is part of the methods' line, not a line of its own.
      expect(queryByText('Change of $50.00')).toBeNull()
    })
  })

  describe('the visibility key of the total (confirmation.order.total)', () => {
    it('hides the amount of a cash order and keeps what it says', () => {
      const { getByText, queryByText, queryByTestId } = renderWithProviders(
        <CollectRecap order={{ payment_events: [cash], cash: 50, summary: { total: 32.37 } }} />,
        { themeOverrides: hideTotal }
      )
      expect(queryByTestId('collect-total')).toBeNull()
      expect(queryByText('$32.37')).toBeNull()
      expect(getByText('Collect in cash')).toBeTruthy()
      expect(getByText('Change of $50.00')).toBeTruthy()
    })

    it('hides the amount of any other order and keeps its methods', () => {
      const { getByText, queryByText } = renderWithProviders(
        <CollectRecap order={{ payment_events: [card], summary: { total: 18 } }} />,
        { themeOverrides: hideTotal }
      )
      expect(queryByText('$18.00')).toBeNull()
      expect(getByText('Card')).toBeTruthy()
    })

    it('shows the amount by default', () => {
      const { getByTestId } = renderWithProviders(
        <CollectRecap order={{ payment_events: [cash], summary: { total: 32.37 } }} />
      )
      expect(getByTestId('collect-total')).toBeTruthy()
    })
  })

  it('is a soft box of the theme: the brand\'s tint, `md` radius, the amount as a title at the end', () => {
    const { getByTestId } = renderWithProviders(
      <CollectRecap order={{ payment_events: [cash], summary: { total: 32.37 } }} />
    )
    const box = flat(getByTestId('collect-recap'))
    expect(box.backgroundColor).toBe(theme.native.tokens.color.primary_subtle)
    expect(box.borderRadius).toBe(theme.native.tokens.radius.md)
    expect(box.flexDirection).toBe('row')
    expect(flat(getByTestId('collect-total')).fontSize).toBe(theme.native.tokens.typography.h3.fontSize)
  })
})
