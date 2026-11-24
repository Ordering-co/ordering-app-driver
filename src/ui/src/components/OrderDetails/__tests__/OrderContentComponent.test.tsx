import '../../../../../../jest/helpers/uiModuleMocks'
import React from 'react'
import { StyleSheet } from 'react-native'
import { fireEvent } from '@testing-library/react-native'

require('../../../../../../jest/helpers/registerD3OrdersMocks')

jest.mock('@ui', () => {
  const { buildD3OrdersUiMock } = require('../../../../../../jest/helpers/d3OrdersUiMock')
  const mock = buildD3OrdersUiMock()
  delete mock.ProductItemAccordion // the real one
  return mock
})

jest.mock('@components', () => {
  const { getMock } = require('../../../../../../jest/helpers/d3OrdersComponentsMock')
  return getMock()
})

import { OrderContentComponent } from '../OrderContentComponent'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { buildAppTheme, defaultAppTheme, THEME_PRODUCT_TYPE } from '../../../../../theme/engine'
import { richSampleOrder } from '../../../../../../jest/helpers/d3OrdersDefaults'

/** A theme built from values, as the app builds it (never a spread). */
const themeWith = (values: any) => buildAppTheme({ version: 2, product_type: THEME_PRODUCT_TYPE, values })
const flat = (node: any) => StyleSheet.flatten(node.props.style)

const theme = defaultAppTheme()
const pageSections: Array<{ key: string, visible: boolean }> = theme.values.pages.order_details.sections
/** The page with one section hidden. */
const without = (key: string) => themeWith({
  pages: { order_details: { sections: pageSections.map((section) => section.key === key ? { ...section, visible: false } : section) } }
})
/** The page with its sections in another order. */
const ordered = (keys: string[]) => themeWith({
  pages: { order_details: { sections: keys.map((key) => ({ key, visible: true })) } }
})

/** An order with every section: custom fields, a vehicle and a spot, and already delivered by a customer to review. */
const fullOrder = {
  ...richSampleOrder,
  status: 11,
  customer_id: 7,
  metafields: [{ id: 1, key: 'Gate code', value: '4455' }],
  spot_number: 12,
  vehicle: { car_registration: 'ABC-123', color: 'Red', model: 'Golf', type: 'Car' }
}

const renderContent = (order: any = fullOrder, themeOverrides?: any, props: any = {}) =>
  renderWithProviders(
    <OrderContentComponent order={order} logisticOrderStatus={[4, 6, 7]} {...props} />,
    { themeOverrides }
  )

/** The component's children as the scroll receives them. */
const children = (tree: any): any[] => [tree].flat()
const divider = theme.native.components.divider.variants[theme.native.components.order_details.base.divider].line
const isDivider = (node: any) => node.children === null && flat(node).height === divider.borderWidth
/** What each child is: a divider, or the first text it shows. */
const outline = (tree: any) => children(tree).map((node) => {
  if (isDivider(node)) return '—'
  const text = JSON.stringify(node).match(/"children":\["([^"]+)"/)
  return text ? text[1] : '?'
})

describe('OrderContentComponent: the order\'s comment', () => {
  const text = (view: any) => view.UNSAFE_getAllByType(require('react-native').Text)
    .map((node: any) => [node.props.children].flat().join('')).filter((line: string) => /Ring twice|guard/.test(line))

  it('writes the comment without the blank lines it begins or ends with, as the focus view does, and keeps the ones inside', () => {
    const view = renderContent({ ...richSampleOrder, comment: '\n\n  Ring twice.\n\nLeave it at the door.\n\n' })
    expect(text(view)).toEqual(['Ring twice.\n\nLeave it at the door.'])
    const windows = renderContent({ ...richSampleOrder, comment: 'Ask the guard.\r\n' })
    expect(text(windows)).toEqual(['Ask the guard.'])
  })

  it('has no comment lines for a comment of only blanks and line breaks', () => {
    const view = renderContent({ ...richSampleOrder, comment: ' \n\n \t' })
    expect(view.queryByText('Order comment:', { exact: false })).toBeNull()
  })
})

describe('OrderContentComponent: the sections of the page order_details', () => {
  it('renders them in the theme\'s order as children of the scroll, the page\'s divider between them', () => {
    const { toJSON } = renderContent()
    expect(outline(toJSON())).toEqual([
      '—',
      'Custom fields',
      'Business details',
      'Customer details',
      '—',
      'Order Details',
      '—',
      'Subtotal',
      '—',
      'Spot number',
      '—',
      'Review customer'
    ])
  })

  it('renders nothing for a section without content: no line, no gap', () => {
    const { toJSON, queryByText } = renderContent(richSampleOrder)
    // No custom fields, no vehicle, and an order in progress is not reviewed.
    expect(outline(toJSON())).toEqual(['—', 'Business details', 'Customer details', '—', 'Order Details', '—', 'Subtotal'])
    expect(queryByText('Custom fields')).toBeNull()
    expect(queryByText('Vehicle')).toBeNull()
    expect(queryByText('Review customer')).toBeNull()
  })

  it.each([
    ['custom_fields', 'Custom fields'],
    ['business', 'Business details'],
    ['customer', 'Customer details'],
    ['bill', 'Subtotal'],
    ['vehicle', 'Vehicle'],
    ['review', 'Review customer']
  ])('hides the section %s and leaves no gap', (key, text) => {
    const shown = renderContent()
    expect(shown.getByText(text)).toBeTruthy()
    const all = outline(shown.toJSON())

    const hidden = renderContent(fullOrder, without(key))
    expect(hidden.queryByText(text)).toBeNull()
    const rest = outline(hidden.toJSON())
    expect(rest.length).toBeLessThan(all.length)
    // Never two lines in a row, and none at the end.
    expect(rest.join('')).not.toContain('——')
    expect(rest[rest.length - 1]).not.toBe('—')
    // The products stay whatever is hidden.
    expect(hidden.getByText('Order Details')).toBeTruthy()
  })

  it('moves the sections of the details as the theme orders them', () => {
    const { toJSON } = renderContent(fullOrder, ordered(
      ['header', 'products', 'bill', 'customer', 'business', 'custom_fields', 'vehicle', 'review', 'actions']
    ))
    expect(outline(toJSON())).toEqual([
      '—',
      'Order Details',
      '—',
      'Subtotal',
      '—',
      'Customer details',
      'Business details',
      'Custom fields',
      '—',
      'Spot number',
      '—',
      'Review customer'
    ])
  })

  it('takes the divider the theme chooses for the order details', () => {
    const custom = themeWith({ components: { order_details: { base: { divider: 'item' } } } })
    const { toJSON } = renderContent(fullOrder, custom)
    const line = custom.native.components.divider.variants.item.line
    expect(flat(children(toJSON())[0]).height).toBe(line.borderWidth)
    expect(flat(children(toJSON())[0]).backgroundColor).toBe(line.borderColor)
  })

  it('puts an order of a group in its own card, under its number', () => {
    const { toJSON, getByText } = renderContent(fullOrder, undefined, { isOrderGroup: true })
    expect(children(toJSON())).toHaveLength(1)
    // The order number as every screen writes it (decision H2), in the section's title.
    expect(getByText('Order No. 101')).toBeTruthy()
    expect(flat(children(toJSON())[0]).borderRadius).toBe(theme.native.components.card.base.radius)
  })
})

describe('OrderContentComponent: the cards', () => {
  it('opens and closes the business card from its title', () => {
    const { getByLabelText, queryByText, getByText } = renderContent()
    const title = getByLabelText('Business details')
    expect(title.props.accessibilityState.expanded).toBe(false)
    expect(queryByText('Store A')).toBeNull()
    fireEvent.press(title)
    expect(getByText('Store A')).toBeTruthy()
    expect(getByLabelText('Business details').props.accessibilityState.expanded).toBe(true)
    fireEvent.press(getByLabelText('Business details'))
    expect(queryByText('Store A')).toBeNull()
  })

  it('paints the cards as the theme\'s card and their titles as the order details\' section title', () => {
    const { toJSON, getByText } = renderContent()
    const card = flat(children(toJSON())[2])
    expect(card.backgroundColor).toBe(theme.native.components.card.base.background)
    expect(card.borderRadius).toBe(theme.native.components.card.base.radius)
    expect(card.padding).toBe(theme.native.components.card.base.padding)
    const title = theme.native.components.order_details.base.address_title
    ;['Custom fields', 'Business details', 'Customer details', 'Order Details', 'Payments', 'Vehicle'].forEach((text) => {
      expect(flat(getByText(text)).fontSize).toBe(title.fontSize)
      expect(flat(getByText(text)).fontFamily).toBe(title.fontFamily)
    })
  })

  it('shows the custom fields of the order', () => {
    const { getByLabelText, getByText } = renderContent()
    fireEvent.press(getByLabelText('Custom fields'))
    expect(getByText('Gate code')).toBeTruthy()
    expect(getByText('4455')).toBeTruthy()
  })

  it.each([
    ['confirmation.business.email', 'Business details', ['store@example.com'], ['5559999', '5558888', '456 Store Ave']],
    ['confirmation.business.phone', 'Business details', ['5559999', '5558888'], ['store@example.com', '456 Store Ave']],
    ['confirmation.customer.email', 'Customer details', ['jane@example.com'], ['5551234', '123 Main St']],
    ['confirmation.customer.phone', 'Customer details', ['5551234'], ['jane@example.com', '123 Main St']]
  ])('%s hides only its links', (key, card, gone, kept) => {
    const shown = renderContent()
    fireEvent.press(shown.getByLabelText(card))
    ;[...gone, ...kept].forEach((text) => expect(shown.getByText(text)).toBeTruthy())

    const hidden = renderContent(fullOrder, themeWith({ visibility: { [key]: false } }))
    fireEvent.press(hidden.getByLabelText(card))
    gone.forEach((text) => expect(hidden.queryByText(text)).toBeNull())
    kept.forEach((text) => expect(hidden.getByText(text)).toBeTruthy())
  })

  it('writes the contact data as links of the theme: compact rows whose touch area is still 44 pt', () => {
    const { getByLabelText, getByText, getAllByRole } = renderContent()
    fireEvent.press(getByLabelText('Customer details'))
    const email = getByText('jane@example.com')
    expect(flat(email).color).toBe(theme.native.components.link.base.color)
    const links = getAllByRole('link')
    expect(links.length).toBeGreaterThan(0)
    // A row is as tall as its text (no control height); the hit slop makes up the touch target.
    const lineHeight = flat(email).lineHeight
    links.forEach((link) => {
      expect(flat(link)?.minHeight).toBeUndefined()
      const { top, bottom } = link.props.hitSlop
      expect(lineHeight + top + bottom).toBeGreaterThanOrEqual(44)
    })
  })
})

describe('OrderContentComponent: products, bill and review', () => {
  it('writes the bill with the theme\'s bill texts', () => {
    const { getByText } = renderContent()
    const bill = theme.native.components.bill.base
    expect(flat(getByText('Subtotal')).fontSize).toBe(bill.row.fontSize)
    expect(flat(getByText('Subtotal')).color).toBe(bill.row_color)
    expect(flat(getByText('Total')).fontSize).toBe(bill.total.fontSize)
    expect(flat(getByText('$25.5')).color).toBe(bill.total_color)
  })

  it('follows a theme that changes the bill', () => {
    const custom = themeWith({ components: { bill: { base: { row_color: '#123456', row_gap: 20 } } } })
    const { getByText } = renderContent(fullOrder, custom)
    expect(flat(getByText('Subtotal')).color).toBe('#123456')
  })

  it('confirmation.order.total hides the bill\'s total, not its rows', () => {
    const hidden = renderContent(fullOrder, themeWith({ visibility: { 'confirmation.order.total': false } }))
    expect(hidden.queryByText('Total')).toBeNull()
    expect(hidden.getByText('Subtotal')).toBeTruthy()
    expect(hidden.getByText('Payments')).toBeTruthy()
  })

  it('confirmation.order.payments hides the payments card, not the bill', () => {
    const shown = renderContent()
    expect(shown.getByText('Payments')).toBeTruthy()
    const hidden = renderContent(fullOrder, themeWith({ visibility: { 'confirmation.order.payments': false } }))
    expect(hidden.queryByText('Payments')).toBeNull()
    expect(hidden.getByText('Subtotal')).toBeTruthy()
    expect(hidden.getByText('Total')).toBeTruthy()
  })

  it('confirmation.products.options hides the options and ingredients of a product, not its comment', () => {
    const shown = renderContent()
    expect(shown.getByText('Extras')).toBeTruthy()
    expect(shown.getByText(/No Onion/)).toBeTruthy()
    const hidden = renderContent(fullOrder, themeWith({ visibility: { 'confirmation.products.options': false } }))
    expect(hidden.queryByText('Extras')).toBeNull()
    expect(hidden.queryByText(/No Onion/)).toBeNull()
    expect(hidden.getByText(/Burger/)).toBeTruthy()
    expect(hidden.getByText('Comment')).toBeTruthy()
  })

  it('shows the spot and the vehicle of a curbside order', () => {
    const { getByText } = renderContent()
    expect(getByText('Spot number')).toBeTruthy()
    expect(getByText('12')).toBeTruthy()
    expect(getByText('ABC-123')).toBeTruthy()
    expect(getByText('Golf')).toBeTruthy()
  })

  it('offers the review of the customer with the button of its slot, and opens it', () => {
    const { getByRole, getByTestId, queryByTestId } = renderContent()
    const slot = theme.native.components.order_details.slots.review
    const button = getByRole('button', { name: 'Review customer' })
    const box = flat(button.children[0] as any)
    expect(box.minHeight).toBe(theme.native.components.button.sizes[slot.size].height)
    expect(box.backgroundColor).toBe(theme.native.components.button.variants[slot.color][slot.appearance].background)
    expect(queryByTestId('review-customer-stub')).toBeNull()
    fireEvent.press(button)
    expect(getByTestId('review-customer-stub')).toBeTruthy()
  })

  it('does not offer the review of an order already reviewed', () => {
    const { queryByText } = renderContent({ ...fullOrder, user_review: { qualification: 4 } })
    expect(queryByText('Review customer')).toBeNull()
  })
})
