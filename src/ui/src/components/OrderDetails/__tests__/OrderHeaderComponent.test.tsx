import React from 'react'
import { StyleSheet } from 'react-native'

jest.mock('@components', () => {
  const { getMock } = require('../../../../../../jest/helpers/d3OrdersComponentsMock')
  return getMock()
})

import { OrderHeaderComponent } from '../OrderHeaderComponent'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { buildAppTheme, defaultAppTheme, THEME_PRODUCT_TYPE } from '../../../../../theme/engine'
import { getOrderStatus, orderTypeLabel } from '../../../utils'
import { sampleOrder } from '../../../../../../jest/helpers/d3OrdersDefaults'

/** A theme built from values, as the app builds it (never a spread). */
const themeWith = (values: any) => buildAppTheme({ version: 2, product_type: THEME_PRODUCT_TYPE, values })
const flat = (node: any) => StyleSheet.flatten(node.props.style)

const renderHeader = (order: any, themeOverrides?: any) =>
  renderWithProviders(
    <OrderHeaderComponent order={order} getOrderStatus={getOrderStatus} logisticOrderStatus={[4, 6, 7]} />,
    { themeOverrides }
  )

describe('OrderHeaderComponent', () => {
  const theme = defaultAppTheme()
  const details = theme.native.components.order_details.base

  it('does not write the order number: it is the screen\'s bar title (2026-11-17)', () => {
    const { queryByText, getByText } = renderHeader(sampleOrder)
    expect(queryByText(/Order No\./)).toBeNull()
    expect(queryByText(/101/)).toBeNull()
    // What the card keeps: the status, the order type and the payment.
    expect(getByText('Pending')).toBeTruthy()
    expect(getByText('Order Type')).toBeTruthy()
    expect(getByText('Payment method')).toBeTruthy()
  })

  it('never writes "undefined" for an order with no payment method (an assign request\'s order may come without it): the cell is empty, as the order\'s copied text is', () => {
    const { toJSON, getByText } = renderHeader({ ...sampleOrder, paymethod: undefined, payment_events: undefined })
    expect(JSON.stringify(toJSON())).not.toContain('undefined')
    expect(getByText('Payment method')).toBeTruthy()
    const none = renderHeader({ ...sampleOrder, paymethod: null, payment_events: [] })
    expect(JSON.stringify(none.toJSON())).not.toContain('undefined')
    // An order that has one still writes it.
    expect(renderHeader({ ...sampleOrder, paymethod: { gateway: 'cash', name: 'Cash' } }).getByText('Cash')).toBeTruthy()
  })

  it('writes the external id as a line of the order\'s data unless the project shows it as the number', () => {
    const { getByText } = renderHeader({ ...sampleOrder, external_id: 'EXT-1' })
    expect(getByText('EXT-1')).toBeTruthy()
  })

  it.each([
    [1, 'Delivery'],
    [2, 'Pickup'],
    [3, 'Eat in'],
    [4, 'Curbside'],
    [5, 'Driver thru'],
    [7, 'Catering delivery'],
    [8, 'Catering pickup'],
    [9, 'Reservation']
  ])('names order type %i "%s", as the order card does (decision H3)', (type, name) => {
    const { getByText } = renderHeader({ ...sampleOrder, delivery_type: type })
    expect(getByText(name)).toBeTruthy()
    expect(getByText(orderTypeLabel((_key: string, text?: string) => text ?? _key, type))).toBeTruthy()
  })

  const fallback = (_key: string, text: string) => text

  it.each([
    [0, 'primary'],
    [8, 'primary'],
    [26, 'primary'],
    [11, 'success'],
    [15, 'success'],
    [2, 'danger'],
    [12, 'danger']
  ])('paints status %i as a badge by its state (%s), as the cards do (decision H1b)', (status, variant) => {
    const { getByTestId, getByText, queryByText } = renderHeader({ ...sampleOrder, status })
    const badge = theme.native.components.badge.variants[variant]
    expect(flat(getByTestId('order-details-status')).backgroundColor).toBe(badge.background)
    expect(getByText(getOrderStatus(String(status), fallback)?.value)).toBeTruthy()
    // The number is no longer a sentence with the status in it.
    expect(queryByText(/Order No\. 101 is/)).toBeNull()
  })

  it('follows a theme that changes a badge', () => {
    const custom = themeWith({ components: { badge: { variants: { success: { background: '#0A5C36' } } } } })
    const { getByTestId } = renderHeader({ ...sampleOrder, status: 11 }, custom)
    expect(flat(getByTestId('order-details-status')).backgroundColor).toBe('#0A5C36')
  })

  it('leaves the status out of a logistic order', () => {
    const { queryByText, getByText } = renderHeader({ ...sampleOrder, isLogistic: true })
    expect(queryByText('Pending')).toBeNull()
    // No badge: the card starts with the facts, with no divider over them.
    expect(getByText('Order Type')).toBeTruthy()
  })

  it('shows the order type and the payment method, hidden by confirmation.order.type', () => {
    const shown = renderHeader(sampleOrder)
    expect(shown.getByText('Order Type')).toBeTruthy()
    expect(shown.getByText('Delivery')).toBeTruthy()
    expect(shown.getByText('Payment method')).toBeTruthy()

    const hidden = renderHeader(sampleOrder, themeWith({ visibility: { 'confirmation.order.type': false } }))
    expect(hidden.queryByText('Order Type')).toBeNull()
    expect(hidden.queryByText('Payment method')).toBeNull()
    // Only its piece goes: the status and the dates stay.
    expect(hidden.getByText('Pending')).toBeTruthy()
    expect(hidden.getByText(/Placed to/)).toBeTruthy()
  })

  it('separates the order type and the payment method with the theme\'s vertical divider', () => {
    const { ODivider } = require('../../shared')
    const custom = themeWith({
      components: { divider: { variants: { vertical: { line: { width: 2, color: '#123456', style: 'solid' }, spacing: 12 } } } }
    })
    const { UNSAFE_getAllByType } = renderHeader(sampleOrder, custom)
    const vertical = UNSAFE_getAllByType(ODivider).filter((divider: any) => divider.props.variant === 'vertical')
    expect(vertical).toHaveLength(1)
    const line = flat(vertical[0].findByType(require('react-native').View))
    expect(line).toEqual(expect.objectContaining({ width: 2, backgroundColor: '#123456', marginHorizontal: 12, alignSelf: 'stretch' }))
    // The row adds no space of its own around the divider.
    expect(flat(vertical[0].parent).gap).toBeUndefined()
  })

  it('confirmation.order.eta hides when the order is due ("Placed to"), and only that', () => {
    const shown = renderHeader(sampleOrder)
    expect(shown.getByText(/Placed to/)).toBeTruthy()
    shown.unmount()
    const hidden = renderHeader(sampleOrder, themeWith({ visibility: { 'confirmation.order.eta': false } }))
    expect(hidden.queryByText(/Placed to/)).toBeNull()
    expect(hidden.getByText('Pending')).toBeTruthy()
  })

  it('shows when a catering order was created, hidden by confirmation.order.date', () => {
    const catering = { ...sampleOrder, delivery_type: 7, created_at: '2099-01-01 10:00:00' }
    const shown = renderHeader(catering)
    expect(shown.getByText(/Created at/)).toBeTruthy()
    expect(shown.getByText('2099-01-01 10:00:00')).toBeTruthy()

    const hidden = renderHeader(catering, themeWith({ visibility: { 'confirmation.order.date': false } }))
    expect(hidden.queryByText(/Created at/)).toBeNull()
    expect(hidden.getByText(/Placed to/)).toBeTruthy()
  })

  it('shows the delivery position as a badge in the order type\'s colour, as the order card does', () => {
    const { getByText } = renderHeader({ ...sampleOrder, delivery_type: 1, delivery_position: 3 })
    expect(flat(getByText('Delivery #3')).color).toBe(theme.native.components.badge.variants.type_delivery.color)
    const pickup = renderHeader({ ...sampleOrder, delivery_type: 2, delivery_position: 3 })
    expect(flat(pickup.getByTestId('order-details-position')).backgroundColor).toBe(theme.native.components.badge.variants.type_pickup.background)
    expect(renderHeader(sampleOrder).queryByText(/Delivery #/)).toBeNull()
  })

  it('shows the spot, the external id and the reservation of the orders that have them', () => {
    const curbside = renderHeader({ ...sampleOrder, delivery_type: 4, spot_number: 12, external_id: 'EXT-1' })
    expect(curbside.getByText(/Spot number/)).toBeTruthy()
    expect(curbside.getByText('12')).toBeTruthy()
    expect(curbside.getByText('EXT-1')).toBeTruthy()

    const reservation = renderHeader({
      ...sampleOrder,
      delivery_type: 9,
      reservation: { reserve_date: '2099-02-02 20:00:00', guests_reservation: 4 }
    })
    expect(reservation.getByText(/Reservation scheduled to/)).toBeTruthy()
    expect(reservation.getByText(/4 Guests/)).toBeTruthy()
  })
})
