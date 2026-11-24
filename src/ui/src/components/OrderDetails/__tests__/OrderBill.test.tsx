import '../../../../../../jest/helpers/uiModuleMocks'
import React from 'react'
import { StyleSheet } from 'react-native'

require('../../../../../../jest/helpers/registerD3OrdersMocks')

jest.mock('@ui', () => {
  const { buildD3OrdersUiMock } = require('../../../../../../jest/helpers/d3OrdersUiMock')
  return buildD3OrdersUiMock()
})

jest.mock('@components', () => {
  const { getMock } = require('../../../../../../jest/helpers/d3OrdersComponentsMock')
  return getMock()
})

import { OrderBill, includedTaxes, orderSubtotal } from '../OrderBill'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { buildAppTheme, defaultAppTheme, THEME_PRODUCT_TYPE } from '../../../../../theme/engine'
import { richSampleOrder } from '../../../../../../jest/helpers/d3OrdersDefaults'

const themeWith = (values: any) => buildAppTheme({ version: 2, product_type: THEME_PRODUCT_TYPE, values })
const flat = (node: any) => StyleSheet.flatten(node.props.style)
const theme: any = defaultAppTheme()
const bill = theme.native.components.bill.base
const divider = theme.native.components.divider.variants

/** An order paid by card (no cash given) and one payment of another kind: the amounts the minus is about. */
const card = { id: 1, event: 'payment', amount: 12.5, paymethod_id: 2, paymethod: { gateway: 'stripe', name: 'Card' } }
const refund = { id: 2, event: 'refund', amount: 5, paymethod_id: 3, paymethod: { gateway: 'voucher', name: 'Voucher' } }
const order = (events: any[]) => ({ ...richSampleOrder, cash: undefined, payment_events: events })

const renderBill = (props: any, themeOverrides?: any) => renderWithProviders(<OrderBill {...props} />, { themeOverrides })

/** What the bill writes, in order. */
const texts = (tree: any): string[] => JSON.stringify(tree).match(/"children":\["[^"]*"\]/g)?.map((m) => m.slice(13, -2)) ?? []
const nodes = (tree: any): any[] => [tree].flat().flatMap((node: any) =>
  !node || typeof node === 'string' ? [] : [node, ...nodes(node.children ?? [])]
)

/** Every piece of text of a tree, in order. */
const leaves = (tree: any): string[] => [tree].flat().flatMap((node: any) =>
  typeof node === 'string' ? [node] : node ? leaves(node.children ?? []) : []
)

describe('OrderBill: the amounts and the rules are the same in both looks', () => {
  it('writes the same rows and the same total, whichever the look; only the payments are written apart', () => {
    const everything = order([card])
    const legacy = leaves(renderBill({ order: everything }).toJSON())
    const compact = leaves(renderBill({ order: everything, compact: true }).toJSON())
    const upToPayments = (all: string[]) => all.slice(0, all.indexOf('Total') + 2)
    expect(upToPayments(compact)).toEqual(upToPayments(legacy))
    // The rows the rules give: the subtotal, the discount, the taxes and fees, the delivery fee, the tip.
    expect(upToPayments(legacy)).toEqual(expect.arrayContaining(['Subtotal', 'Delivery Fee']))
    expect(upToPayments(legacy).length).toBeGreaterThan(10)
    // The one payment's amount is the same number in both.
    expect(legacy.join('')).toContain('$12.5')
    expect(compact.join('')).toContain('$12.5')
  })

  it.each([[false], [true]])('keeps the visibility keys of the total and the payments (compact=%s)', (compact) => {
    const total = renderBill({ order: order([card]), compact }, themeWith({ visibility: { 'confirmation.order.total': false } }))
    expect(total.queryByText('Total')).toBeNull()
    expect(total.getByText('Subtotal')).toBeTruthy()
    const payments = renderBill({ order: order([card]), compact }, themeWith({ visibility: { 'confirmation.order.payments': false } }))
    expect(payments.queryByText(/Payments/)).toBeNull()
    expect(payments.getByText('Total')).toBeTruthy()
  })

  it.each([[false], [true]])('writes the cash the customer gave as it is, with no minus (compact=%s)', (compact) => {
    const { getByText } = renderBill({ order: { ...richSampleOrder, cash: 30 }, compact })
    expect(getByText('$30')).toBeTruthy()
  })
})

describe('OrderBill: the default look, which the assign request\'s screen draws', () => {
  it('marks a payment against the total with a minus, under a "Payments" card, as it always did', () => {
    const { getByText, queryByTestId } = renderBill({ order: order([card, refund]) })
    expect(getByText('Payments')).toBeTruthy()
    expect(getByText('Card')).toBeTruthy()
    expect(getByText('Voucher')).toBeTruthy()
    expect(getByText('-$12.5')).toBeTruthy()
    // Any other event keeps the minus too.
    expect(getByText('-$5')).toBeTruthy()
    expect(queryByTestId('bill-payments')).toBeNull()
  })

  it('separates the total with the page\'s divider (a band) and keeps the rows far apart and the total at the theme\'s size', () => {
    const { toJSON, getByText } = renderBill({ order: order([card]) })
    const band = divider[theme.native.components.order_details.base.divider].line
    expect(nodes(toJSON()).some((node) => node.children === null && flat(node)?.height === band.borderWidth)).toBe(true)
    expect(flat(getByText('Total')).fontSize).toBe(bill.total.fontSize)
    expect(flat(getByText('Total')).fontWeight).toBe(flat(getByText('Subtotal')).fontWeight)
    // The bill's own gap (`lg`) sits between its blocks and `row_gap` between its rows: boxes in a column.
    const columns = (gap: number) => nodes(toJSON()).some((node) => flat(node)?.gap === gap && flat(node)?.flexDirection === undefined)
    expect(columns(bill.row_gap)).toBe(true)
    expect(columns(theme.native.tokens.space.lg)).toBe(true)
  })
})

describe('OrderBill compact: the details\' look (Done.dc.html)', () => {
  it('writes one muted line "Payments · Card" with its amount, not signed, and no card around it', () => {
    const { getByText, queryByText, getByTestId } = renderBill({ order: order([card]), compact: true })
    expect(getByText('Payments · Card')).toBeTruthy()
    expect(getByText('$12.5')).toBeTruthy()
    expect(queryByText('-$12.5')).toBeNull()
    // Not the "Payments" title of the card, nor a bordered box.
    expect(queryByText('Payments')).toBeNull()
    expect(flat(getByText('Payments · Card')).color).toBe(theme.native.tokens.color.text_muted)
    expect(flat(getByText('Payments · Card')).fontSize).toBe(bill.row.fontSize)
    expect(nodes(getByTestId('bill-payments').props.children).length).toBeGreaterThan(0)
  })

  it('keeps the minus on an event that is not a payment (a refund), and writes every payment on its own line', () => {
    const { getByText } = renderBill({ order: order([card, refund]), compact: true })
    expect(getByText('Payments · Card')).toBeTruthy()
    expect(getByText('Payments · Voucher')).toBeTruthy()
    expect(getByText('-$5')).toBeTruthy()
    expect(getByText('$12.5')).toBeTruthy()
  })

  it('draws small rows next to each other, a thin line over a bold total, and no band', () => {
    const { toJSON, getByText } = renderBill({ order: order([card]), compact: true })
    const thin = divider.item.line
    const lines = nodes(toJSON()).filter((node) => node.children === null && flat(node)?.height !== undefined)
    expect(lines.some((node) => flat(node).height === thin.borderWidth)).toBe(true)
    expect(lines.some((node) => flat(node).height === divider.band.line.borderWidth)).toBe(false)
    // The rows have no gap between them, nor the blocks of the bill; the total is the theme's size and bolder than the rows.
    const columns = (gap: number) => nodes(toJSON()).some((node) => flat(node)?.gap === gap && flat(node)?.flexDirection === undefined)
    expect(columns(bill.row_gap)).toBe(false)
    expect(columns(theme.native.tokens.space.lg)).toBe(false)
    expect(flat(getByText('Total')).fontSize).toBe(bill.total.fontSize)
    expect(Number(flat(getByText('Total')).fontFamily?.length)).toBeGreaterThan(0)
    expect(flat(getByText('Total')).fontFamily).not.toBe(flat(getByText('Subtotal')).fontFamily)
  })

  it('writes nothing about payments for an order with none', () => {
    const { queryByText, queryByTestId } = renderBill({ order: order([]), compact: true })
    expect(queryByText(/Payments/)).toBeNull()
    expect(queryByTestId('bill-payments')).toBeNull()
  })

  it('writes the texts in the bill\'s order: rows, total, payments', () => {
    const written = texts(renderBill({ order: order([card]), compact: true }).toJSON())
    expect(written.indexOf('Subtotal')).toBeLessThan(written.indexOf('Total'))
    expect(written.indexOf('Total')).toBeLessThan(written.indexOf('Payments · Card'))
  })
})

describe('the bill\'s subtotal, which the copied text of the order reads too', () => {
  it('is the summary\'s subtotal, or the order\'s own in an older answer', () => {
    expect(orderSubtotal({ summary: { subtotal: 55.5 } })).toBe(55.5)
    expect(orderSubtotal({ subtotal: 40 })).toBe(40)
    // The order carries its subtotal in `summary`: reading `order.subtotal` alone is what wrote "$ 0.00" in the copy.
    expect(orderSubtotal({ summary: { subtotal: 55.5, total: 70.53 } })).not.toBeNaN()
  })

  it('adds the taxes the prices include (type 1: on the products), as the bill\'s row does', () => {
    const order = {
      summary: { subtotal: 50 },
      taxes: [
        { type: 1, target: 'product', summary: { tax: 3 } },
        { type: 1, target: 'delivery_fee', summary: { tax: 1 } },
        { type: 2, target: 'product', summary: { tax: 9 } }
      ]
    }
    expect(includedTaxes(order)).toBe(3)
    expect(includedTaxes(order, true)).toBe(1)
    expect(orderSubtotal(order)).toBe(53)
    expect(orderSubtotal({ summary: { subtotal: 50, tax: 4 }, taxes: [], tax_type: 1 })).toBe(54)
    expect(orderSubtotal({ summary: { subtotal: 50, tax: 4 }, taxes: [], tax_type: 2 })).toBe(50)
  })
})
