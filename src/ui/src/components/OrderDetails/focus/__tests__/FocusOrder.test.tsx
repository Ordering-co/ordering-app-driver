import '../../../../../../../jest/helpers/uiModuleMocks'
import React from 'react'
import { Alert, Linking, StyleSheet } from 'react-native'
import { fireEvent, waitFor, within } from '@testing-library/react-native'

require('../../../../../../../jest/helpers/registerD3OrdersMocks')

jest.mock('@ui', () => {
  const { buildD3OrdersUiMock } = require('../../../../../../../jest/helpers/d3OrdersUiMock')
  const mock = buildD3OrdersUiMock()
  delete mock.ProductItemAccordion // the real one
  return mock
})

jest.mock('@components', () => {
  const { getMock } = require('../../../../../../../jest/helpers/d3OrdersComponentsMock')
  return getMock()
})

import { useApi, useConfig } from '@components'
import { FocusOrder } from '../FocusOrder'
import { focusStyles } from '../styles'
import { renderWithProviders } from '../../../../../../../jest/helpers/renderWithProviders'
import { buildAppTheme, defaultAppTheme, THEME_PRODUCT_TYPE } from '../../../../../../theme/engine'
import { Icon } from '../../../shared'

const theme: any = defaultAppTheme()
const sections: Array<{ key: string, visible: boolean }> = theme.values.pages.order_details.sections
const flat = (node: any) => StyleSheet.flatten(node.props.style)
/** The icons of a glyph name a render drew. */
const glyphs = (view: any, name: string) => view.UNSAFE_queryAllByType(Icon).filter((icon: any) => icon.props.name === name)

/** The theme with a page section hidden, a visibility key off, or both. */
const themeWith = (values: any) => buildAppTheme({ version: 2, product_type: THEME_PRODUCT_TYPE, values })
const themed = ({ hide = [], off = [] }: { hide?: string[], off?: string[] } = {}) => themeWith({
  pages: { order_details: { sections: sections.map((section) => hide.includes(section.key) ? { ...section, visible: false } : section) } },
  visibility: Object.fromEntries(off.map((key) => [key, false]))
})

/** A delivery with everything the stops and blocks can show; each test overrides what it exercises. */
const baseOrder: any = {
  id: 1042,
  status: 8,
  delivery_type: 1,
  delivery_datetime: '2099-01-01 12:29:00',
  delivery_datetime_utc: '2099-01-01 12:29:00',
  created_at: '2026-11-18 10:00:00',
  comment: 'No onions on the pizza.',
  cash: 50,
  paymethod: { id: 1, gateway: 'cash', name: 'Cash' },
  summary: { total: 32.37, subtotal: 20, driver_tip: 3 },
  business: {
    name: 'Luna Pizza',
    address: '214 Harbor St',
    address_notes: 'Back door, ring the bell',
    cellphone: '5551110000',
    phone: '5552220000',
    email: 'store@example.com',
    location: { lat: 40.7128, lng: -74.006 }
  },
  customer: {
    name: 'Ana',
    lastname: 'Torres',
    address: '58 Maple Ave',
    internal_number: 'Apt 4B',
    zipcode: '62704',
    address_notes: 'Gate code 2580',
    cellphone: '6465550129',
    country_phone_code: '1',
    email: 'ana@example.com',
    location: { lat: 40.72, lng: -74.01 }
  },
  delivery_option: { name: 'Leave at the door' },
  on_behalf_of: 'Front desk',
  user_review: { qualification: 4.5 },
  products: [
    { id: 1, name: 'Margherita pizza', quantity: 1, price: 18, options: [], ingredients: [] },
    { id: 2, name: 'Garlic knots', quantity: 1, price: 5, options: [], ingredients: [] },
    { id: 3, name: 'Lemonade', quantity: 2, price: 4, options: [], ingredients: [] }
  ]
}

/** The product's line (a quantity, two spaces and the name): the folded row's own summary does not match it. */
// The quantity is a box of its own before the name: the name alone is the text.
const PIZZA = /^Margherita pizza$/

const fix = { latitude: 40.7, longitude: -74.0, timestamp: 1 }

const renderOrder = (order: any = {}, props: any = {}, themeOverrides: any = themed()) =>
  renderWithProviders(
    <FocusOrder
      order={{ ...baseOrder, ...order }}
      logisticOrderStatus={[4, 6, 7]}
      driverPosition={fix}
      onOpenMap={jest.fn()}
      {...props}
    />,
    { themeOverrides }
  )

describe('FocusOrder: which stop the order is ordered around (the effective status)', () => {
  beforeEach(() => {
    ;(useConfig as jest.Mock).mockReturnValue([{ configs: { distance_unit: { value: 'km' } } }])
  })

  it.each([0, 4, 7, 14])('status %i, offered: the route card, no stop card and no stop row', (status) => {
    const { getByTestId, queryByTestId, getByText } = renderOrder({ status })
    expect(getByTestId('focus-route')).toBeTruthy()
    expect(queryByTestId('focus-stop-business')).toBeNull()
    expect(queryByTestId('focus-stop-customer')).toBeNull()
    expect(queryByTestId('focus-stop-row-customer')).toBeNull()
    expect(getByText('Pick up at')).toBeTruthy()
    expect(getByText('Deliver to')).toBeTruthy()
    expect(getByText('View on the map')).toBeTruthy()
  })

  it.each([3, 8, 18])('status %i, the pickup: the store is the stop and the customer is the folded row "Then deliver to"', (status) => {
    const { getByTestId, queryByTestId, getByText } = renderOrder({ status })
    expect(getByTestId('focus-stop-business')).toBeTruthy()
    expect(queryByTestId('focus-stop-customer')).toBeNull()
    expect(getByTestId('focus-stop-row-customer')).toBeTruthy()
    expect(getByText('Then deliver to')).toBeTruthy()
    expect(getByText('Pick up at')).toBeTruthy()
  })

  it.each([9, 19, 23, 26])('status %i, the delivery: the customer is the stop and the store the folded row "Picked up at" with a check', (status) => {
    const view = renderOrder({ status })
    const { getByTestId, queryByTestId, getByText } = view
    expect(getByTestId('focus-stop-customer')).toBeTruthy()
    expect(queryByTestId('focus-stop-business')).toBeNull()
    expect(getByTestId('focus-stop-row-business')).toBeTruthy()
    expect(getByText('Deliver to')).toBeTruthy()
    expect(getByText('Picked up at')).toBeTruthy()
    expect(glyphs(view, 'checkmark')).toHaveLength(1)
  })

  it('reads the effective status, not the order\'s: a "ready for pickup" order the driver reached the store of', () => {
    const { getByTestId, getByText } = renderOrder({
      status: 4,
      last_driver_assigned_at: '2026-11-18 09:00:00',
      reporting_data: { at: { 'status:3': '2026-11-18 10:00:00' } }
    })
    expect(getByTestId('focus-stop-business')).toBeTruthy()
    expect(getByText('Ask for')).toBeTruthy()
  })

  it.each([1, 11])('status %i, a delivered order: two folded rows in one card, "Picked up at" and "Delivered to", with checks', (status) => {
    const view = renderOrder({ status })
    const { getByTestId, queryByTestId, getByText } = view
    expect(getByTestId('focus-finished-stops')).toBeTruthy()
    expect(queryByTestId('focus-stop-business')).toBeNull()
    expect(queryByTestId('focus-stop-customer')).toBeNull()
    expect(getByText('Picked up at')).toBeTruthy()
    expect(getByText('Delivered to')).toBeTruthy()
    expect(glyphs(view, 'checkmark')).toHaveLength(2)
  })

  it.each([2, 5, 6, 10, 12, 15, 16, 17])('status %i, any other end: neutral "Store" and "Customer" rows, no check', (status) => {
    const view = renderOrder({ status })
    const { getByTestId, getByText, queryByText } = view
    expect(getByTestId('focus-finished-stops')).toBeTruthy()
    expect(getByText('Store')).toBeTruthy()
    expect(getByText('Customer')).toBeTruthy()
    expect(queryByText('Picked up at')).toBeNull()
    expect(glyphs(view, 'checkmark')).toHaveLength(0)
  })

  it('an order that is not a delivery has the store as its stop through the whole order, and the customer as a plain row', () => {
    ;[0, 8, 3, 9, 26].forEach((status) => {
      const { getByTestId, queryByTestId, getByText, queryByText, unmount } = renderOrder({ status, delivery_type: 2 })
      expect(getByTestId('focus-stop-business')).toBeTruthy()
      expect(queryByTestId('focus-stop-customer')).toBeNull()
      expect(queryByTestId('focus-route')).toBeNull()
      expect(getByText('Customer')).toBeTruthy()
      expect(queryByText('Then deliver to')).toBeNull()
      unmount()
    })
  })

  it('a catering delivery (type 7) is a delivery', () => {
    const { getByTestId } = renderOrder({ status: 9, delivery_type: 7 })
    expect(getByTestId('focus-stop-customer')).toBeTruthy()
  })

  describe('the page sections business and customer hide their party: neither its card nor its row', () => {
    it('the pickup without the store shows only the customer\'s row, and without the customer only the store\'s card', () => {
      const noStore = renderOrder({ status: 8 }, {}, themed({ hide: ['business'] }))
      expect(noStore.queryByTestId('focus-stop-business')).toBeNull()
      expect(noStore.getByTestId('focus-stop-row-customer')).toBeTruthy()
      noStore.unmount()
      const noCustomer = renderOrder({ status: 8 }, {}, themed({ hide: ['customer'] }))
      expect(noCustomer.getByTestId('focus-stop-business')).toBeTruthy()
      expect(noCustomer.queryByTestId('focus-stop-row-customer')).toBeNull()
    })

    it('the delivery without the customer shows only the store\'s row, and without the store only the customer\'s card', () => {
      const noCustomer = renderOrder({ status: 9 }, {}, themed({ hide: ['customer'] }))
      expect(noCustomer.queryByTestId('focus-stop-customer')).toBeNull()
      expect(noCustomer.getByTestId('focus-stop-row-business')).toBeTruthy()
      noCustomer.unmount()
      const noStore = renderOrder({ status: 9 }, {}, themed({ hide: ['business'] }))
      expect(noStore.getByTestId('focus-stop-customer')).toBeTruthy()
      expect(noStore.queryByTestId('focus-stop-row-business')).toBeNull()
    })

    it('the route and the finished card leave a hidden party out, and with both hidden show no stop at all', () => {
      const route = renderOrder({ status: 0 }, {}, themed({ hide: ['business'] }))
      expect(route.queryByText('Pick up at')).toBeNull()
      expect(route.getByText('Deliver to')).toBeTruthy()
      route.unmount()
      const done = renderOrder({ status: 11 }, {}, themed({ hide: ['customer'] }))
      expect(done.getByText('Picked up at')).toBeTruthy()
      expect(done.queryByText('Delivered to')).toBeNull()
      done.unmount()
      const none = renderOrder({ status: 11 }, {}, themed({ hide: ['business', 'customer'] }))
      expect(none.queryByTestId('focus-finished-stops')).toBeNull()
      none.unmount()
      const noRoute = renderOrder({ status: 0 }, {}, themed({ hide: ['business', 'customer'] }))
      expect(noRoute.queryByTestId('focus-route')).toBeNull()
      expect(noRoute.getByTestId('focus-facts')).toBeTruthy()
    })
  })

  it('the stage, not the theme\'s order of sections, orders the blocks: status row, stop, payment, comment, products, more details', () => {
    const reversed = themeWith({
      pages: { order_details: { sections: [...sections].reverse() } }
    })
    const { toJSON } = renderOrder({ status: 8 }, {}, reversed)
    const text = JSON.stringify(toJSON())
    const at = (needle: string) => text.indexOf(needle)
    const order = [at('focus-status-row'), at('focus-stop-business'), at('focus-stop-row-customer'), at('focus-payment'), at('focus-comment'), at('focus-products'), at('focus-more-details')]
    expect(order.every((index) => index >= 0)).toBe(true)
    expect([...order].sort((a, b) => a - b)).toEqual(order)
  })
})

describe('FocusOrder: the route card of an offered order', () => {
  beforeEach(() => {
    ;(useConfig as jest.Mock).mockReturnValue([{ configs: { distance_unit: { value: 'km' } } }])
  })

  it('writes the store with its address and its distance from the driver, and the customer address with its distance from the store', () => {
    const { getByText } = renderOrder({ status: 0 })
    expect(getByText('Luna Pizza')).toBeTruthy()
    expect(getByText(/^214 Harbor St · .* km from you$/)).toBeTruthy()
    expect(getByText('58 Maple Ave')).toBeTruthy()
    expect(getByText(/km from the store$/)).toBeTruthy()
  })

  it('does not write a distance from the driver without a real position (none, or the 0, 0 the location hook starts with)', () => {
    const none = renderOrder({ status: 0 }, { driverPosition: undefined })
    expect(none.queryByText(/from you/)).toBeNull()
    expect(none.getByText('214 Harbor St')).toBeTruthy()
    none.unmount()
    const zero = renderOrder({ status: 0 }, { driverPosition: { latitude: 0, longitude: 0 } })
    expect(zero.queryByText(/from you/)).toBeNull()
  })

  it('its "View on the map" button is the stop_map slot, opens the screen\'s map and answers to confirmation.order.directions', () => {
    const onOpenMap = jest.fn()
    const { getByText, getByRole, rerender } = renderOrder({ status: 0 }, { onOpenMap })
    const slot = theme.native.components.order_details.slots.stop_map
    const look = theme.native.components.button.variants[slot.color][slot.appearance]
    const button = getByRole('button', { name: 'View on the map' })
    expect(flat(button.children[0] as any).backgroundColor).toBe(look.background)
    fireEvent.press(getByText('View on the map'))
    expect(onOpenMap).toHaveBeenCalledTimes(1)
    rerender(<FocusOrder order={{ ...baseOrder, status: 0 }} onOpenMap={onOpenMap} />)
    const hidden = renderOrder({ status: 0 }, {}, themed({ off: ['confirmation.order.directions'] }))
    expect(hidden.queryByText('View on the map')).toBeNull()
  })

  it('shows the three facts: the total (confirmation.order.total), how it is paid and the driver tip, only when there is one', () => {
    const { getByTestId, getByText } = renderOrder({ status: 0 })
    const facts = getByTestId('focus-facts')
    expect(facts).toBeTruthy()
    expect(getByText('$32.37')).toBeTruthy()
    expect(getByText('Cash')).toBeTruthy()
    expect(getByText('$3')).toBeTruthy()
    expect(getByText('Driver tip')).toBeTruthy()
  })

  it('shares the card\'s width between the three facts: `xs` at its sides, no space around the lines between them', () => {
    expect(theme.native.components.divider.variants.vertical.spacing).toBe(0)
    const { getByTestId } = renderOrder({ status: 0 })
    expect(flat(getByTestId('focus-facts'))).toEqual(expect.objectContaining({ paddingHorizontal: theme.native.tokens.space.xs, paddingVertical: theme.native.tokens.space.md }))
  })

  it('draws the contact glyphs of a stop 18 (`order_details.base.detail_icon_size`)', () => {
    expect(theme.native.components.order_details.base.detail_icon_size).toBe(18)
    const view = renderOrder({ status: 11 })
    fireEvent.press(view.getByRole('button', { name: 'Delivered to Ana Torres' }))
    const glyphs = view.UNSAFE_getAllByProps({ name: 'mail-outline' })
    expect(glyphs[glyphs.length - 1].props.size).toBe(18)
  })

  it('leaves the driver tip out for an order without one, and for a pickup', () => {
    const none = renderOrder({ status: 0, summary: { total: 32.37 } })
    expect(none.queryByText('Driver tip')).toBeNull()
    none.unmount()
    const pickup = renderOrder({ status: 0, delivery_type: 2 })
    expect(pickup.queryByText('Driver tip')).toBeNull()
  })

  it('confirmation.order.total hides the total fact', () => {
    const { queryByText } = renderOrder({ status: 0 }, {}, themed({ off: ['confirmation.order.total'] }))
    expect(queryByText('$32.37')).toBeNull()
    expect(queryByText('Payment')).toBeTruthy()
  })
})

describe('FocusOrder: the stop card', () => {
  beforeEach(() => {
    ;(useConfig as jest.Mock).mockReturnValue([{ configs: { distance_unit: { value: 'km' } } }])
  })

  it('the store (pickup): its name, the address as a maps link, its notes and its distance from the driver; no invented time', () => {
    const { getByText, getByRole, queryByText } = renderOrder({ status: 8 })
    expect(getByText('Luna Pizza')).toBeTruthy()
    expect(getByRole('link', { name: '214 Harbor St' })).toBeTruthy()
    expect(getByText('Back door, ring the bell')).toBeTruthy()
    expect(getByText(/km from you$/)).toBeTruthy()
    expect(queryByText(/min/)).toBeNull()
  })

  it('no distance without a real position', () => {
    const { queryByText } = renderOrder({ status: 8 }, { driverPosition: { latitude: 0, longitude: 0 } })
    expect(queryByText(/from you/)).toBeNull()
  })

  it('at the store: "Ask for" the order\'s number, as the bar writes it (masked in a secure project, the external id when shown), and whom it is for', () => {
    const { getByText, queryByText } = renderOrder({ status: 3 })
    expect(getByText('Ask for')).toBeTruthy()
    expect(getByText('No. 1042')).toBeTruthy()
    expect(getByText('For Ana Torres')).toBeTruthy()
    // On the way to the store there is nothing to ask for yet.
    const way = renderOrder({ status: 8 })
    expect(way.queryByText('Ask for')).toBeNull()
    expect(queryByText('For Ana Torres')).toBeTruthy()
  })

  it('writes the number masked in a secure project and as the external id when the project shows external ids', () => {
    ;(useApi as jest.Mock).mockReturnValue([{ project: 'quickiedelivery' }])
    const secure = renderOrder({ status: 3, id: 1234567 })
    expect(secure.getByText('No. 123****')).toBeTruthy()
    secure.unmount()
    ;(useApi as jest.Mock).mockReturnValue([{ ordering: { root: 'https://api.test', project: 'demo' } }, {}])
    ;(useConfig as jest.Mock).mockReturnValue([{ configs: { change_order_id: { value: '1' } } }])
    const external = renderOrder({ status: 3, external_id: 'POS-88213' })
    expect(external.getByText('No. POS-88213')).toBeTruthy()
  })

  it('the customer (delivery): the full name, the address link, one muted line of internal number · zip code · notes, the option as a neutral badge and the distance', () => {
    const { getByText, getByRole, getByTestId } = renderOrder({ status: 9 })
    expect(getByText('Ana Torres')).toBeTruthy()
    expect(getByRole('link', { name: '58 Maple Ave' })).toBeTruthy()
    expect(getByText('Apt 4B · 62704 · Gate code 2580')).toBeTruthy()
    expect(getByText('Leave at the door')).toBeTruthy()
    expect(getByText(/km from you$/)).toBeTruthy()
    expect(flat(getByTestId('focus-delivery-option')).backgroundColor).toBe(theme.native.components.badge.variants.neutral.background)
  })

  it('the muted line writes only what exists; the option only for a delivery; who it is on behalf of and the rating are kept', () => {
    const { getByText, queryByText } = renderOrder({
      status: 9,
      customer: { ...baseOrder.customer, internal_number: undefined, address_notes: undefined }
    })
    expect(getByText('62704')).toBeTruthy()
    expect(getByText('On behalf of: Front desk')).toBeTruthy()
    expect(getByText('4.5')).toBeTruthy()
    const noOption = renderOrder({ status: 9, delivery_option: undefined })
    expect(noOption.queryByText('Leave at the door')).toBeNull()
    expect(queryByText('Apt 4B · 62704 · Gate code 2580')).toBeNull()
  })

  it('the Map button is the stop_map slot and calls the screen\'s map; Call is the stop_call slot', () => {
    const onOpenMap = jest.fn()
    const { getByText, getByRole } = renderOrder({ status: 8 }, { onOpenMap })
    const stopMap = theme.native.components.order_details.slots.stop_map
    const stopCall = theme.native.components.order_details.slots.stop_call
    const button = theme.native.components.button
    expect(flat(getByRole('button', { name: 'Map' }).children[0] as any).backgroundColor).toBe(button.variants[stopMap.color][stopMap.appearance].background)
    expect(flat(getByRole('button', { name: 'Call' }).children[0] as any).minHeight).toBe(button.sizes[stopCall.size].height)
    fireEvent.press(getByText('Map'))
    expect(onOpenMap).toHaveBeenCalledTimes(1)
  })

  it('the Map button answers to confirmation.order.directions, and Call stays', () => {
    const { queryByText, getByText } = renderOrder({ status: 8 }, {}, themed({ off: ['confirmation.order.directions'] }))
    expect(queryByText('Map')).toBeNull()
    expect(getByText('Call')).toBeTruthy()
  })

  describe('Call: a tel: link', () => {
    let canOpenURL: jest.SpyInstance
    let openURL: jest.SpyInstance
    beforeEach(() => {
      canOpenURL = jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(true)
      openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined)
    })
    afterEach(() => {
      canOpenURL.mockRestore()
      openURL.mockRestore()
    })

    it('the store: the cellphone, as written', async () => {
      const { getByText } = renderOrder({ status: 8 })
      fireEvent.press(getByText('Call'))
      await waitFor(() => expect(openURL).toHaveBeenCalledWith('tel:5551110000'))
    })

    it('the store: the phone when it has no cellphone', async () => {
      const { getByText } = renderOrder({ status: 8, business: { ...baseOrder.business, cellphone: undefined } })
      fireEvent.press(getByText('Call'))
      await waitFor(() => expect(openURL).toHaveBeenCalledWith('tel:5552220000'))
    })

    it('the customer: with its country code', async () => {
      const { getByText } = renderOrder({ status: 9 })
      fireEvent.press(getByText('Call'))
      await waitFor(() => expect(openURL).toHaveBeenCalledWith('tel:+16465550129'))
    })

    it('the customer\'s phone is dialled with its country code and no space, as the cellphone', async () => {
      const { getByText } = renderOrder({ status: 9, customer: { ...baseOrder.customer, cellphone: undefined, phone: '2125550123' } })
      fireEvent.press(getByText('Call'))
      await waitFor(() => expect(openURL).toHaveBeenCalledWith('tel:+12125550123'))
    })

    it('says "Invalid number" for a number that is not dialable, and dials nothing', async () => {
      const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined)
      const { getByText } = renderOrder({ status: 9, customer: { ...baseOrder.customer, cellphone: 'not a number' } })
      fireEvent.press(getByText('Call'))
      await waitFor(() => expect(alert).toHaveBeenCalled())
      expect(alert.mock.calls[0][1]).toBe('Invalid number')
      expect(openURL).not.toHaveBeenCalled()
      alert.mockRestore()
    })

    it('says so when the system refuses the link (no dialler, no SIM)', async () => {
      openURL.mockRejectedValue(new Error('Unable to open URL'))
      const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined)
      const { getByText } = renderOrder({ status: 9 })
      fireEvent.press(getByText('Call'))
      await waitFor(() => expect(alert).toHaveBeenCalled())
      expect(alert.mock.calls[0][1]).toBe('Link could not be opened or is not supported')
      alert.mockRestore()
    })

    it('dials although canOpenURL answers false (Android 11+ does for a `tel:` the manifest did not declare)', async () => {
      canOpenURL.mockResolvedValue(false)
      const { getByText } = renderOrder({ status: 9 })
      fireEvent.press(getByText('Call'))
      await waitFor(() => expect(openURL).toHaveBeenCalledWith('tel:+16465550129'))
      expect(canOpenURL).not.toHaveBeenCalled()
    })
  })

  describe('Call is shown only when the party has a phone and its visibility key is on', () => {
    it('no phone, no Call (the store and the customer)', () => {
      const store = renderOrder({ status: 8, business: { ...baseOrder.business, cellphone: undefined, phone: undefined } })
      expect(store.queryByText('Call')).toBeNull()
      store.unmount()
      const customer = renderOrder({ status: 9, customer: { ...baseOrder.customer, cellphone: undefined } })
      expect(customer.queryByText('Call')).toBeNull()
    })

    it('confirmation.business.phone hides the store\'s Call, not the customer\'s', () => {
      const off = themed({ off: ['confirmation.business.phone'] })
      expect(renderOrder({ status: 8 }, {}, off).queryByText('Call')).toBeNull()
      expect(renderOrder({ status: 9 }, {}, off).getByText('Call')).toBeTruthy()
    })

    it('confirmation.customer.phone hides the customer\'s Call, not the store\'s', () => {
      const off = themed({ off: ['confirmation.customer.phone'] })
      expect(renderOrder({ status: 9 }, {}, off).queryByText('Call')).toBeNull()
      expect(renderOrder({ status: 8 }, {}, off).getByText('Call')).toBeTruthy()
    })

    it('the store\'s phones are not shown for an assignment request', () => {
      const { queryByText } = renderOrder({ status: 8, isLogistic: true, status_: 7 })
      // A logistic order that is still in a request status has no phones; one the driver accepted has.
      expect(queryByText('Call')).toBeTruthy()
      const request = renderOrder({ status: 7, isLogistic: true }, { logisticOrderStatus: [4, 6, 7] })
      expect(request.queryByText('Call')).toBeNull()
    })
  })

  it('the card of the current stop has only Map and Call: no link of its own, whatever the party has', () => {
    ;[['business', 8], ['customer', 9]].forEach(([party, status]) => {
      const { getByTestId, queryAllByRole } = renderOrder({ status })
      const card = getByTestId(`focus-stop-${party}`)
      expect(within(card).queryByText('store@example.com')).toBeNull()
      expect(within(card).queryByText('ana@example.com')).toBeNull()
      expect(within(card).queryByText('5552220000')).toBeNull()
      expect(within(card).getByText('Map')).toBeTruthy()
      expect(within(card).getByText('Call')).toBeTruthy()
      // Folded "More details" and the other stop's row are the only other places a contact could be.
      expect(queryAllByRole('link', { name: /@/ })).toHaveLength(0)
    })
  })
})

describe('FocusOrder: the contacts the stop card leaves to "More details"', () => {
  let canOpenURL: jest.SpyInstance
  let openURL: jest.SpyInstance
  beforeEach(() => {
    ;(useConfig as jest.Mock).mockReturnValue([{ configs: { distance_unit: { value: 'km' } } }])
    canOpenURL = jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(true)
    openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined)
  })
  afterEach(() => {
    canOpenURL.mockRestore()
    openURL.mockRestore()
  })

  const openMore = (view: any) => fireEvent.press(view.getByRole('button', { name: 'More details' }))

  it('at the store: its other phone and its e-mail, under its name, folded away until the row opens', () => {
    const view = renderOrder({ status: 8 })
    expect(view.queryByRole('link', { name: 'store@example.com' })).toBeNull()
    expect(view.queryByRole('link', { name: '5552220000' })).toBeNull()
    openMore(view)
    expect(view.getByRole('link', { name: 'store@example.com' })).toBeTruthy()
    expect(view.getByRole('link', { name: '5552220000' })).toBeTruthy()
    // The first phone is the Call button's, not a link.
    expect(view.queryByRole('link', { name: '5551110000' })).toBeNull()
    // The other stop's contacts are its own row's, not these.
    expect(view.queryByRole('link', { name: 'ana@example.com' })).toBeNull()
  })

  it('with the customer: its other phone and its e-mail', () => {
    const view = renderOrder({ status: 9, customer: { ...baseOrder.customer, phone: '2125550123' } })
    openMore(view)
    expect(view.getByRole('link', { name: 'ana@example.com' })).toBeTruthy()
    expect(view.getByRole('link', { name: '+1 212 555 0123' })).toBeTruthy()
    expect(view.queryByRole('link', { name: 'store@example.com' })).toBeNull()
  })

  it('each opens as the Call button opens its phone: tel: and mailto: through the one hook', async () => {
    const view = renderOrder({ status: 8 })
    openMore(view)
    fireEvent.press(view.getByRole('link', { name: 'store@example.com' }))
    await waitFor(() => expect(openURL).toHaveBeenCalledWith('mailto:store@example.com'))
    fireEvent.press(view.getByRole('link', { name: '5552220000' }))
    await waitFor(() => expect(openURL).toHaveBeenCalledWith('tel:5552220000'))
  })

  it('says "Invalid number" for a phone that is not dialable, and dials nothing', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined)
    const view = renderOrder({ status: 8, business: { ...baseOrder.business, phone: 'not a number' } })
    openMore(view)
    fireEvent.press(view.getByRole('link', { name: 'not a number' }))
    await waitFor(() => expect(alert).toHaveBeenCalled())
    expect(alert.mock.calls[0][1]).toBe('Invalid number')
    expect(openURL).not.toHaveBeenCalled()
    alert.mockRestore()
  })

  it('answer to their visibility keys: the store\'s e-mail and phones, the customer\'s e-mail', () => {
    const noEmail = renderOrder({ status: 8 }, {}, themed({ off: ['confirmation.business.email'] }))
    openMore(noEmail)
    expect(noEmail.queryByRole('link', { name: 'store@example.com' })).toBeNull()
    expect(noEmail.getByRole('link', { name: '5552220000' })).toBeTruthy()
    noEmail.unmount()
    const noPhones = renderOrder({ status: 8 }, {}, themed({ off: ['confirmation.business.phone'] }))
    openMore(noPhones)
    expect(noPhones.queryByRole('link', { name: '5552220000' })).toBeNull()
    expect(noPhones.queryByText('Call')).toBeNull()
    expect(noPhones.getByRole('link', { name: 'store@example.com' })).toBeTruthy()
    noPhones.unmount()
    const customer = renderOrder({ status: 9 }, {}, themed({ off: ['confirmation.customer.email'] }))
    openMore(customer)
    expect(customer.queryByRole('link', { name: 'ana@example.com' })).toBeNull()
  })

  it('the store\'s are not listed for an assignment request', () => {
    const view = renderOrder({ status: 7, isLogistic: true }, { logisticOrderStatus: [4, 6, 7] })
    openMore(view)
    expect(view.queryByRole('link', { name: 'store@example.com' })).toBeNull()
  })

  it('are listed only for the stop of the card: not on the route of an offered order, not for a finished one', () => {
    const offered = renderOrder({ status: 0 })
    openMore(offered)
    expect(offered.queryByRole('link', { name: 'store@example.com' })).toBeNull()
    offered.unmount()
    const over = renderOrder({ status: 11 })
    openMore(over)
    expect(over.queryByRole('link', { name: 'store@example.com' })).toBeNull()
  })

  it('are not listed when the page section of their party is hidden (its card is not drawn)', () => {
    const view = renderOrder({ status: 8 }, {}, themed({ hide: ['business'] }))
    openMore(view)
    expect(view.queryByRole('link', { name: 'store@example.com' })).toBeNull()
  })
})

describe('FocusOrder: the other stop, one folded row', () => {
  beforeEach(() => {
    ;(useConfig as jest.Mock).mockReturnValue([{ configs: { distance_unit: { value: 'km' } } }])
  })

  it('is folded: its fields are not drawn until the row is opened, and a second tap folds it', () => {
    const { getByRole, queryByText, getByText } = renderOrder({ status: 8 })
    expect(getByText('Ana Torres · 58 Maple Ave')).toBeTruthy()
    expect(queryByText('Apt 4B · 62704 · Gate code 2580')).toBeNull()
    const row = getByRole('button', { name: 'Then deliver to Ana Torres' })
    expect(row.props.accessibilityState.expanded).toBe(false)
    fireEvent.press(row)
    expect(getByText('Apt 4B · 62704 · Gate code 2580')).toBeTruthy()
    expect(getByRole('button', { name: 'Then deliver to Ana Torres' }).props.accessibilityState.expanded).toBe(true)
    fireEvent.press(getByRole('button', { name: 'Then deliver to Ana Torres' }))
    expect(queryByText('Apt 4B · 62704 · Gate code 2580')).toBeNull()
  })

  it('opened, the customer shows every field: address, place line, distance from the store, option, on behalf of, rating, phone and e-mail', () => {
    const { getByRole, getByText } = renderOrder({ status: 8 })
    fireEvent.press(getByRole('button', { name: 'Then deliver to Ana Torres' }))
    expect(getByRole('link', { name: '58 Maple Ave' })).toBeTruthy()
    expect(getByText('Apt 4B · 62704 · Gate code 2580')).toBeTruthy()
    expect(getByText(/km from the store$/)).toBeTruthy()
    expect(getByText('Leave at the door')).toBeTruthy()
    expect(getByText('On behalf of: Front desk')).toBeTruthy()
    expect(getByText('4.5')).toBeTruthy()
    expect(getByRole('link', { name: '+1 646 555 0129' })).toBeTruthy()
    expect(getByRole('link', { name: 'ana@example.com' })).toBeTruthy()
  })

  it('opened, the customer\'s links answer to their visibility keys', () => {
    const { getByRole, queryByRole } = renderOrder({ status: 8 }, {}, themed({ off: ['confirmation.customer.email', 'confirmation.customer.phone'] }))
    fireEvent.press(getByRole('button', { name: 'Then deliver to Ana Torres' }))
    expect(queryByRole('link', { name: 'ana@example.com' })).toBeNull()
    expect(queryByRole('link', { name: '+1 646 555 0129' })).toBeNull()
  })

  it('opened, the delivery option only shows for a delivery, and the customer\'s rating only with one', () => {
    const { getByRole, queryByText } = renderOrder({ status: 8, user_review: undefined, delivery_option: undefined })
    fireEvent.press(getByRole('button', { name: 'Then deliver to Ana Torres' }))
    expect(queryByText('Leave at the door')).toBeNull()
    expect(queryByText('4.5')).toBeNull()
  })

  it('on the way to the customer the store is "Picked up at" and opens to its address, notes, phones and e-mail', () => {
    const { getByRole, getByText } = renderOrder({ status: 9 })
    fireEvent.press(getByRole('button', { name: 'Picked up at Luna Pizza' }))
    expect(getByRole('link', { name: '214 Harbor St' })).toBeTruthy()
    expect(getByText('Back door, ring the bell')).toBeTruthy()
    expect(getByRole('link', { name: '5551110000' })).toBeTruthy()
    expect(getByRole('link', { name: '5552220000' })).toBeTruthy()
    expect(getByRole('link', { name: 'store@example.com' })).toBeTruthy()
  })

  it('opened, the store\'s links answer to their visibility keys and to the assignment request', () => {
    const off = renderOrder({ status: 9 }, {}, themed({ off: ['confirmation.business.email', 'confirmation.business.phone'] }))
    fireEvent.press(off.getByRole('button', { name: 'Picked up at Luna Pizza' }))
    expect(off.queryByRole('link', { name: 'store@example.com' })).toBeNull()
    expect(off.queryByRole('link', { name: '5551110000' })).toBeNull()
    off.unmount()
    const request = renderOrder({ status: 7, isLogistic: true, delivery_type: 2 })
    fireEvent.press(request.getByRole('button', { name: 'Customer Ana Torres' }))
    const finished = renderOrder({ status: 11, isLogistic: true })
    fireEvent.press(finished.getByRole('button', { name: 'Picked up at Luna Pizza' }))
    // The request statuses [4, 6, 7] are the logistic assignment's: a finished order has its contacts.
    expect(finished.getByRole('link', { name: '5551110000' })).toBeTruthy()
  })

  it('the finished card\'s rows open to the same fields', () => {
    const { getByRole } = renderOrder({ status: 11 })
    fireEvent.press(getByRole('button', { name: 'Delivered to Ana Torres' }))
    expect(getByRole('link', { name: 'ana@example.com' })).toBeTruthy()
    fireEvent.press(getByRole('button', { name: 'Picked up at Luna Pizza' }))
    expect(getByRole('link', { name: 'store@example.com' })).toBeTruthy()
  })

  it('every row is a touch target of at least 44 pt', () => {
    const { getByRole } = renderOrder({ status: 8 })
    expect(flat(getByRole('button', { name: 'Then deliver to Ana Torres' })).minHeight).toBeGreaterThanOrEqual(44)
  })

  it('draws a closed row as the boards do: `sm` over and under its texts, 50 high at least, `md` at its sides', () => {
    const styles = flat({ props: { style: focusStyles(theme).foldHead } })
    const card = flat({ props: { style: focusStyles(theme).foldCard } })
    expect(styles).toEqual(expect.objectContaining({ paddingVertical: theme.native.tokens.space.sm, minHeight: theme.native.tokens.size.lg }))
    expect(card.paddingHorizontal).toBe(theme.native.tokens.space.md)
    // The card is the row: no vertical padding of its own (the card's `md` over and under made a one-line row 82 high, not 52).
    expect(card.paddingVertical).toBe(0)
    const { getByRole } = renderOrder({ status: 8 })
    expect(flat(getByRole('button', { name: 'Then deliver to Ana Torres' })).minHeight).toBe(50)
    // Opened, what it shows ends `md` under (the board's 15).
    expect(flat({ props: { style: focusStyles(theme).foldBody } }).paddingBottom).toBe(theme.native.tokens.space.md)
  })

  it('the products open with no padding of their own under the last line (each line closes with its own `sm`), and the other rows keep theirs', () => {
    const { getByTestId } = renderOrder({ status: 3 })
    // Open at the store: the lines are the card's body with no padding around them.
    expect(getByTestId('focus-products-body').props.style).toBeUndefined()
    fireEvent.press(getByTestId('focus-more-details'))
    expect(flat(getByTestId('focus-more-details-body'))).toEqual(expect.objectContaining({ paddingBottom: theme.native.tokens.space.md }))
  })

  it('draws the cash to collect 64 high at least (`order_details.base.collect_min_height`), the rows around it 50', () => {
    expect(theme.native.components.order_details.base.collect_min_height).toBe(64)
    const { getByRole } = renderOrder({ status: 9 })
    expect(flat(getByRole('button', { name: 'Collect in cash' })).minHeight).toBe(64)
    const other = renderOrder({ status: 9, paymethod: { id: 2, gateway: 'stripe', name: 'Card' }, cash: undefined })
    expect(flat(other.getByTestId('focus-payment')).minHeight).toBe(theme.native.tokens.size.lg)
  })

  it('writes the sub-titles of the more details small and semibold (`order_details.base.subtitle`)', () => {
    const subtitle = theme.native.components.order_details.base.subtitle
    expect(subtitle).toEqual(expect.objectContaining({ fontSize: 12, fontFamily: theme.native.tokens.typography.label.fontFamily }))
    const view = renderOrder({ status: 8, metafields: [{ id: 1, key: 'Invoice', value: 'Required' }] })
    fireEvent.press(view.getByRole('button', { name: 'More details' }))
    expect(flat(view.getByText('Custom fields'))).toEqual(expect.objectContaining({ fontSize: subtitle.fontSize, fontFamily: subtitle.fontFamily }))
  })

  it('opens the bill with its rows `xs` apart and the total `sm` under the last of them', () => {
    const { getByRole, getByText } = renderOrder({ status: 26 })
    fireEvent.press(getByRole('button', { name: 'Collect in cash' }))
    let rows: any = getByText('Subtotal').parent
    // (Its own line is `sm` between the label and the amount: the rows' column is the next box up with a gap.)
    while (rows && flat(rows)?.gap !== theme.native.tokens.space.xs) rows = rows.parent
    expect(rows).toBeTruthy()
    expect(flat(rows).gap).toBe(theme.native.tokens.space.xs)
  })
})

describe('FocusOrder: the status row (page section header)', () => {
  it('writes the status as its badge, the delivery position and, at the right, when the order is for', () => {
    const { getByTestId, getByText } = renderOrder({ status: 8, delivery_position: 1 })
    const badge = theme.native.components.badge.variants.primary
    expect(flat(getByTestId('order-details-status')).backgroundColor).toBe(badge.background)
    expect(getByText('Accepted by driver')).toBeTruthy()
    expect(getByText('Delivery #1')).toBeTruthy()
    expect(getByTestId('focus-delivery-time')).toBeTruthy()
  })

  it('writes "Delivery #N" in the order type\'s variant, never the status\' solid brand badge (as the order card does)', () => {
    const variants = theme.native.components.badge.variants
    const cases: Array<[number | undefined, string]> = [[1, 'type_delivery'], [7, 'type_delivery'], [2, 'type_pickup'], [3, 'type_in_store'], [undefined, 'neutral']]
    for (const [type, variant] of cases) {
      const view = renderOrder({ status: 8, delivery_type: type, delivery_position: 2 })
      const position = flat(view.getByTestId('order-details-position'))
      expect(position.backgroundColor).toBe(variants[variant].background)
      expect(flat(view.getByText('Delivery #2')).color).toBe(variants[variant].color)
      expect(position.backgroundColor).not.toBe(variants.primary.background)
      view.unmount()
    }
  })

  describe('when the badges and the time do not fit one line', () => {
    const rowOf = (view: any) => view.getByTestId('focus-status-row')

    it('is two children: the badges together, then the time (the badges\' text is never cut, the time is not split from its clock)', () => {
      const view = renderOrder({ status: 18, delivery_position: 1 })
      const [badges, time] = rowOf(view).children
      expect(badges.props.testID).toBe('focus-status-badges')
      expect(time.props.testID).toBe('focus-delivery-time')
      expect(within(badges).getByTestId('order-details-status')).toBeTruthy()
      expect(within(badges).getByTestId('order-details-position')).toBeTruthy()
      expect(within(time).queryByTestId('order-details-status')).toBeNull()
      // The clock and its text are one row of the time's view that does not shrink.
      expect(flat(time)).toEqual(expect.objectContaining({ flexDirection: 'row', flexShrink: 0 }))
      expect(within(time).getByText(/./)).toBeTruthy()
    })

    it('does not wrap the row: the badges\' group takes the room the time leaves and wraps its chips only among themselves (390 wide: chips 156, time 111, row 362)', () => {
      const view = renderOrder({ status: 8, delivery_position: 2 })
      const row = flat(rowOf(view))
      expect(row).toEqual(expect.objectContaining({
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: theme.native.tokens.space.xs,
      }))
      // A wrapping row let the group shrink under its chips with room to spare.
      expect(row.flexWrap).toBeUndefined()
      const time = flat(view.getByTestId('focus-delivery-time'))
      expect(time.flexShrink).toBe(0)
      expect(time.flexGrow).toBeUndefined()
      // The group fills what is left of the row (362 - 111 - gap = 246 for 156 of chips), and gives way by wrapping its chips, one gap apart.
      const badges = flat(view.getByTestId('focus-status-badges'))
      expect(badges).toEqual(expect.objectContaining({
        flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: theme.native.tokens.space.xs
      }))
      expect(badges.flexShrink).toBeUndefined()
    })

    it('keeps the time at the end of the line when it is the only thing in the row (an assignment request has no badges)', () => {
      const view = renderOrder({ status: 7, isLogistic: true })
      expect(view.queryByTestId('focus-status-badges')).toBeNull()
      expect(flat(rowOf(view)).justifyContent).toBe('flex-end')
      expect(view.getByTestId('focus-delivery-time')).toBeTruthy()
    })

    it('has no badges group when the time is hidden and nothing else is, and keeps the group when only the time is hidden', () => {
      const view = renderOrder({ status: 8, delivery_position: 1 }, {}, themed({ off: ['confirmation.order.eta'] }))
      expect(view.getByTestId('focus-status-badges')).toBeTruthy()
      expect(view.queryByTestId('focus-delivery-time')).toBeNull()
      expect(flat(rowOf(view)).justifyContent).toBe('space-between')
    })
  })

  it('the status badge follows the order\'s state', () => {
    const { getByTestId } = renderOrder({ status: 11 })
    expect(flat(getByTestId('order-details-status')).backgroundColor).toBe(theme.native.components.badge.variants.success.background)
  })

  it('the time is "ASAP · hour" when it is due, and the date when it is not', () => {
    const due = renderOrder({ delivery_datetime: '2020-01-01 12:29:00', delivery_datetime_utc: undefined })
    // The mocked project's date writer returns what it is given.
    expect(due.getByText(/^ASAP · /)).toBeTruthy()
    due.unmount()
    const later = renderOrder()
    expect(later.getByText('2099-01-01 12:29:00')).toBeTruthy()
  })

  it('confirmation.order.eta hides the time and keeps the badges', () => {
    const { queryByTestId, getByTestId } = renderOrder({ status: 8 }, {}, themed({ off: ['confirmation.order.eta'] }))
    expect(queryByTestId('focus-delivery-time')).toBeNull()
    expect(getByTestId('order-details-status')).toBeTruthy()
  })

  it('has no status badge for an assignment request , and no row at all when nothing is left to show', () => {
    const request = renderOrder({ status: 7, isLogistic: true }, {}, themed({ off: ['confirmation.order.eta'] }))
    expect(request.queryByTestId('order-details-status')).toBeNull()
    expect(request.queryByTestId('focus-status-row')).toBeNull()
  })

  it('the page section header hides the row', () => {
    const { queryByTestId } = renderOrder({ status: 8 }, {}, themed({ hide: ['header'] }))
    expect(queryByTestId('focus-status-row')).toBeNull()
  })
})

describe('FocusOrder: the payment (page section bill)', () => {
  beforeEach(() => {
    ;(useConfig as jest.Mock).mockReturnValue([{ configs: { distance_unit: { value: 'km' } } }])
  })

  it('is one folded row: the payment text over "Total <amount>"', () => {
    const { getByRole, getByText, queryByText } = renderOrder({ status: 8 })
    expect(getByText('Cash (Change of $50)')).toBeTruthy()
    expect(getByText('Total $32.37')).toBeTruthy()
    expect(queryByText('Subtotal')).toBeNull()
    expect(getByRole('button', { name: 'Cash (Change of $50)' }).props.accessibilityState.expanded).toBe(false)
  })

  it('opened, it shows the whole bill: its rows, its total and its payments', () => {
    const { getByRole, getByText, getAllByText } = renderOrder({
      status: 8,
      summary: { subtotal: 20, total: 32.37, driver_tip: 3, delivery_price: 5.57, discount: 0 },
      payment_events: [{ id: 1, event: 'payment', amount: 32.37, paymethod_id: 1, paymethod: { gateway: 'cash', name: 'Cash' } }]
    })
    fireEvent.press(getByRole('button', { name: 'Cash (Change of $50)' }))
    expect(getByText('Subtotal')).toBeTruthy()
    expect(getByText('Delivery Fee')).toBeTruthy()
    expect(getAllByText('Driver tip').length).toBeGreaterThan(0)
    // The payments are one muted line of the bill, "Payments · Cash", with the amount the customer gave, unsigned.
    expect(getByText('Payments · Cash')).toBeTruthy()
    expect(getByText('$50')).toBeTruthy()
  })

  it('confirmation.order.total hides the total, in the row and in the bill; confirmation.order.payments hides the payments list', () => {
    const noTotal = renderOrder({ status: 8 }, {}, themed({ off: ['confirmation.order.total'] }))
    expect(noTotal.queryByText('Total $32.37')).toBeNull()
    noTotal.unmount()
    const order = { status: 8, payment_events: [{ id: 1, event: 'payment', amount: 32.37, paymethod_id: 1, paymethod: { gateway: 'cash', name: 'Cash' } }] }
    const noPayments = renderOrder(order, {}, themed({ off: ['confirmation.order.payments'] }))
    fireEvent.press(noPayments.getByRole('button', { name: 'Cash (Change of $50)' }))
    expect(noPayments.queryByText(/Payments/)).toBeNull()
    expect(noPayments.getByText('Subtotal')).toBeTruthy()
  })

  it('the page section bill hides the row', () => {
    const { queryByTestId } = renderOrder({ status: 8 }, {}, themed({ hide: ['bill'] }))
    expect(queryByTestId('focus-payment')).toBeNull()
  })

  describe('an offered order says its total and its payment once: in the facts card, not also in this row', () => {
    const open = (view: any) => fireEvent.press(view.getByRole('button', { name: 'More details' }))

    it.each([0, 14])('status %i: the facts card has them and there is no payment row', (status) => {
      const { getByTestId, queryByTestId, queryByText } = renderOrder({ status })
      expect(within(getByTestId('focus-facts')).getByText('$32.37')).toBeTruthy()
      expect(within(getByTestId('focus-facts')).getByText('Cash')).toBeTruthy()
      expect(queryByTestId('focus-payment')).toBeNull()
      expect(queryByText('Total $32.37')).toBeNull()
      expect(queryByText('Cash (Change of $50)')).toBeNull()
    })

    it('the bill stays reachable: "More details" opens to it, with its rows, its total and its payments', () => {
      const view = renderOrder({
        status: 0,
        summary: { subtotal: 20, total: 32.37, driver_tip: 3, delivery_price: 5.57, discount: 0 },
        payment_events: [{ id: 1, event: 'payment', amount: 32.37, paymethod_id: 1, paymethod: { gateway: 'cash', name: 'Cash' } }]
      })
      expect(view.queryByText('Subtotal')).toBeNull()
      open(view)
      expect(view.getByText('Summary')).toBeTruthy()
      expect(view.getByText('Subtotal')).toBeTruthy()
      expect(view.getByText('Delivery Fee')).toBeTruthy()
      expect(view.getByText('Payments · Cash')).toBeTruthy()
    })

    it('the page section bill hides it there too: no row, and no bill under "More details"', () => {
      const view = renderOrder({ status: 0 }, {}, themed({ hide: ['bill'] }))
      open(view)
      expect(view.queryByTestId('focus-payment')).toBeNull()
      expect(view.queryByText('Subtotal')).toBeNull()
    })

    it('the row is back once the order is accepted (status 8), and the bill is no longer under "More details"', () => {
      const view = renderOrder({ status: 8 })
      expect(view.getByTestId('focus-payment')).toBeTruthy()
      open(view)
      expect(view.queryByText('Summary')).toBeNull()
      expect(view.queryByText('Subtotal')).toBeNull()
    })

    it('an order that is not a delivery keeps its row: it has no route card to say the facts', () => {
      const view = renderOrder({ status: 0, delivery_type: 2 })
      expect(view.queryByTestId('focus-facts')).toBeNull()
      expect(view.getByTestId('focus-payment')).toBeTruthy()
    })
  })

  describe('"Collect in cash": an order paid only in cash, on the way to the customer and with them', () => {
    it.each([9, 19, 23])('status %i: the highlighted block with the change and the amount', (status) => {
      const { getByText, getByTestId, queryByText } = renderOrder({ status })
      expect(getByText('Collect in cash')).toBeTruthy()
      expect(getByText('Change of $50')).toBeTruthy()
      expect(getByText('$32.37')).toBeTruthy()
      expect(queryByText('Total $32.37')).toBeNull()
      const tint = theme.native.tokens.color.primary_subtle
      expect(flat(getByTestId('focus-payment-card')).backgroundColor).toBe(tint)
    })

    it('is larger with the customer (26) than on the way', () => {
      const way = renderOrder({ status: 9 })
      const wayAmount = flat(way.getByText('$32.37')).fontSize
      way.unmount()
      const here = renderOrder({ status: 26 })
      expect(flat(here.getByText('$32.37')).fontSize).toBeGreaterThan(wayAmount)
    })

    it('has `md` over and under its texts with the customer (the board\'s 15 all around), `sm` on the way', () => {
      const space = theme.native.tokens.space
      const way = renderOrder({ status: 9 })
      expect(flat(way.getByRole('button', { name: 'Collect in cash' })).paddingVertical).toBe(space.sm)
      way.unmount()
      const here = renderOrder({ status: 26 })
      expect(flat(here.getByRole('button', { name: 'Collect in cash' })).paddingVertical).toBe(space.md)
      here.unmount()
      // A row that is not the stacked block keeps its own padding.
      const card = renderOrder({ status: 26, paymethod: { id: 2, gateway: 'stripe', name: 'Card' }, cash: undefined })
      expect(flat(card.getByTestId('focus-payment')).paddingVertical).toBe(space.sm)
    })

    it('leaves the change line out when the order has no bill to change', () => {
      const { queryByText, getByText } = renderOrder({ status: 9, cash: undefined })
      expect(getByText('Collect in cash')).toBeTruthy()
      expect(queryByText(/Change of/)).toBeNull()
    })

    it('is not for an order paid another way, or only in part in cash', () => {
      const card = renderOrder({ status: 9, paymethod: { id: 2, gateway: 'stripe', name: 'Card' }, cash: undefined })
      expect(card.queryByText('Collect in cash')).toBeNull()
      card.unmount()
      const mixed = renderOrder({
        status: 9,
        payment_events: [
          { id: 1, event: 'payment', amount: 10, paymethod: { gateway: 'cash', name: 'Cash' } },
          { id: 2, event: 'payment', amount: 22, paymethod: { gateway: 'stripe', name: 'Card' } }
        ]
      })
      expect(mixed.queryByText('Collect in cash')).toBeNull()
    })

    it('is not for the pickup or the offered order', () => {
      ;[0, 8, 3].forEach((status) => {
        const view = renderOrder({ status })
        expect(view.queryByText('Collect in cash')).toBeNull()
        view.unmount()
      })
    })

    it('opens to the bill', () => {
      const { getByRole, getByText } = renderOrder({ status: 26 })
      fireEvent.press(getByRole('button', { name: 'Collect in cash' }))
      expect(getByText('Subtotal')).toBeTruthy()
    })

    it('confirmation.order.total hides the amount to collect', () => {
      const { queryByText, getByText } = renderOrder({ status: 9 }, {}, themed({ off: ['confirmation.order.total'] }))
      expect(getByText('Collect in cash')).toBeTruthy()
      expect(queryByText('$32.37')).toBeNull()
    })
  })
})

describe('FocusOrder: the order comment and the products (page section products)', () => {
  it('writes the comment as a warning notice, always visible, labelled "Order comment" with the comment\'s speech bubble', () => {
    const { getByTestId, getByText } = renderOrder({ status: 8 })
    const notice = getByTestId('focus-comment')
    expect(flat(notice).backgroundColor).toBe(theme.native.components.alert.variants.warning.background)
    expect(getByText('Order comment')).toBeTruthy()
    expect(getByText('No onions on the pizza.')).toBeTruthy()
  })

  it('draws the speech bubble of the mockup, not the warning triangle, once, in the notice\'s own icon size and ink', () => {
    const view = renderOrder({ status: 8 })
    const alert = theme.native.components.alert
    const notice = within(view.getByTestId('focus-comment'))
    expect(notice.getAllByTestId('focus-comment-icon')).toHaveLength(1)
    const bubble = glyphs(view, 'chatbox-outline')
    expect(bubble).toHaveLength(1)
    expect(bubble[0].props.size).toBe(alert.base.icon_size)
    expect(bubble[0].props.color).toBe(alert.variants.warning.icon_color)
    expect(glyphs(view, 'warning-outline')).toHaveLength(0)
  })

  it('writes the comment without the blank lines it begins or ends with (no empty band under the text), and keeps the ones inside', () => {
    const { getByTestId } = renderOrder({ status: 0, comment: '\n\n  Ring twice.\n\nLeave it at the door.\n\n' })
    expect(getByTestId('focus-comment-text').props.children).toBe('Ring twice.\n\nLeave it at the door.')
    const windows = renderOrder({ status: 0, comment: 'No onions.\r\n' })
    expect(windows.getByTestId('focus-comment-text').props.children).toBe('No onions.')
  })

  it('has no notice for a comment of only blanks and line breaks', () => {
    const { queryByTestId } = renderOrder({ status: 0, comment: ' \n\n \t' })
    expect(queryByTestId('focus-comment')).toBeNull()
  })

  it('has no notice without a comment', () => {
    const { queryByTestId } = renderOrder({ status: 8, comment: undefined })
    expect(queryByTestId('focus-comment')).toBeNull()
  })

  it('the comment shows with the products folded and open, and in every stage', () => {
    ;[0, 3, 8, 9, 11].forEach((status) => {
      const view = renderOrder({ status })
      expect(view.getByTestId('focus-comment')).toBeTruthy()
      view.unmount()
    })
  })

  it('the header is "<n> products · <m> items", with a one-line summary while folded', () => {
    const { getByText } = renderOrder({ status: 8 })
    expect(getByText('3 products · 4 items')).toBeTruthy()
    const summary = getByText('1 Margherita pizza, 1 Garlic knots, 2 Lemonade')
    expect(summary.props.numberOfLines).toBe(1)
  })

  it('writes the singular for one product and one item', () => {
    const { getByText } = renderOrder({ status: 8, products: [baseOrder.products[0]] })
    expect(getByText('1 product · 1 item')).toBeTruthy()
  })

  it('is folded away from the store and opens to the products', () => {
    const { getByRole, queryByText, getByText } = renderOrder({ status: 8 })
    expect(getByRole('button', { name: '3 products · 4 items' }).props.accessibilityState.expanded).toBe(false)
    expect(queryByText(PIZZA)).toBeNull()
    fireEvent.press(getByRole('button', { name: '3 products · 4 items' }))
    expect(getByText(PIZZA)).toBeTruthy()
    expect(getByText(/^Garlic knots$/)).toBeTruthy()
    expect(getByText(/^Lemonade$/)).toBeTruthy()
    expect(getByText('2')).toBeTruthy()
  })

  it('starts open at the store (status 3), and the summary goes while it is open', () => {
    const { getByText, queryByText } = renderOrder({ status: 3 })
    expect(getByText(PIZZA)).toBeTruthy()
    expect(queryByText('1 Margherita pizza, 1 Garlic knots, 2 Lemonade')).toBeNull()
  })

  it('keeps the driver\'s own toggle when the status changes', () => {
    const render = (status: number) => (
      <FocusOrder order={{ ...baseOrder, status }} onOpenMap={jest.fn()} logisticOrderStatus={[4, 6, 7]} />
    )
    const { getByRole, queryByText, rerender } = renderWithProviders(render(8), { themeOverrides: themed() })
    expect(queryByText(PIZZA)).toBeNull()
    // Untouched, it follows the stage: open at the store, folded again after it.
    rerender(render(3))
    expect(queryByText(PIZZA)).toBeTruthy()
    rerender(render(9))
    expect(queryByText(PIZZA)).toBeNull()
    // Opened by the driver on the way, it stays open at the store and after it.
    fireEvent.press(getByRole('button', { name: '3 products · 4 items' }))
    rerender(render(26))
    expect(queryByText(PIZZA)).toBeTruthy()
    // Folded by the driver at the store, it stays folded.
    rerender(render(3))
    fireEvent.press(getByRole('button', { name: '3 products · 4 items' }))
    expect(queryByText(PIZZA)).toBeNull()
    rerender(render(3))
    expect(queryByText(PIZZA)).toBeNull()
  })

  it('the page section products hides the products and the comment', () => {
    const { queryByTestId } = renderOrder({ status: 3 }, {}, themed({ hide: ['products'] }))
    expect(queryByTestId('focus-products')).toBeNull()
    expect(queryByTestId('focus-comment')).toBeNull()
  })
})

describe('FocusOrder: "To complete the delivery"', () => {
  const configs = (values: Record<string, string>) => ({
    configs: Object.fromEntries(Object.entries(values).map(([key, value]) => [key, { value }]))
  })

  it('lists the delivery PIN and the photo the completion will ask for, with the customer', () => {
    ;(useConfig as jest.Mock).mockReturnValue([configs({ delivery_pin_enabled: '1', states_requiring_image_driver: '11|9' })])
    const { getByText, getByTestId } = renderOrder({ status: 26, delivery_pin_status: 'requested' }, { completeOffered: true })
    expect(flat(getByTestId('focus-completion')).backgroundColor).toBe(theme.native.components.alert.variants.info.background)
    expect(getByText('To complete the delivery')).toBeTruthy()
    expect(getByText("The customer's delivery PIN · A photo of the delivery")).toBeTruthy()
  })

  it('lists only the PIN when no photo is required, and only the photo when no PIN is', () => {
    ;(useConfig as jest.Mock).mockReturnValue([configs({ delivery_pin_enabled: '1' })])
    const pin = renderOrder({ status: 26, delivery_pin_status: 'requested' }, { completeOffered: true })
    expect(pin.getByText("The customer's delivery PIN")).toBeTruthy()
    pin.unmount()
    ;(useConfig as jest.Mock).mockReturnValue([configs({ states_requiring_image_driver: '11' })])
    const photo = renderOrder({ status: 26 }, { completeOffered: true })
    expect(photo.getByText('A photo of the delivery')).toBeTruthy()
  })

  it('shows nothing when the completion asks for neither', () => {
    ;(useConfig as jest.Mock).mockReturnValue([configs({ delivery_pin_enabled: '1', states_requiring_image_driver: '9' })])
    const { queryByTestId } = renderOrder({ status: 26, delivery_pin_status: 'not_requested' }, { completeOffered: true })
    expect(queryByTestId('focus-completion')).toBeNull()
  })

  it('shows nothing when "Delivery complete" is not offered, or away from the customer', () => {
    ;(useConfig as jest.Mock).mockReturnValue([configs({ states_requiring_image_driver: '11' })])
    const notOffered = renderOrder({ status: 26 }, { completeOffered: false })
    expect(notOffered.queryByTestId('focus-completion')).toBeNull()
    notOffered.unmount()
    ;[9, 19, 23, 8, 3].forEach((status) => {
      const view = renderOrder({ status }, { completeOffered: true })
      expect(view.queryByTestId('focus-completion')).toBeNull()
      view.unmount()
    })
  })
})

describe('FocusOrder: more details', () => {
  beforeEach(() => {
    ;(useConfig as jest.Mock).mockReturnValue([{ configs: {} }])
  })

  const open = (view: any) => fireEvent.press(view.getByRole('button', { name: 'More details' }))

  it('is folded, and opens to label / value lines: the order type, "Placed to" in full and the external id', () => {
    const view = renderOrder({ status: 8, external_id: 'POS-88213' })
    expect(view.queryByText('Order Type')).toBeNull()
    open(view)
    expect(view.getByText('Order Type')).toBeTruthy()
    expect(view.getByText('Delivery')).toBeTruthy()
    expect(view.getByText('Placed to')).toBeTruthy()
    expect(view.getAllByText('2099-01-01 12:29:00')).toHaveLength(2)
    expect(view.getByText('External ID')).toBeTruthy()
    expect(view.getByText('POS-88213')).toBeTruthy()
  })

  it('writes the external id only when the project does not show it as the order\'s number', () => {
    ;(useConfig as jest.Mock).mockReturnValue([{ configs: { change_order_id: { value: '1' } } }])
    const view = renderOrder({ status: 8, external_id: 'POS-88213' })
    open(view)
    expect(view.queryByText('External ID')).toBeNull()
  })

  it('"Created at" is for a catering order (confirmation.order.date)', () => {
    const catering = renderOrder({ status: 8, delivery_type: 7 })
    open(catering)
    expect(catering.getByText('Created at')).toBeTruthy()
    catering.unmount()
    const plain = renderOrder({ status: 8 })
    open(plain)
    expect(plain.queryByText('Created at')).toBeNull()
    plain.unmount()
    const off = renderOrder({ status: 8, delivery_type: 7 }, {}, themed({ off: ['confirmation.order.date'] }))
    open(off)
    expect(off.queryByText('Created at')).toBeNull()
  })

  it('the spot line says table, lane or spot by the order type; the reservation line writes its date and guests', () => {
    const table = renderOrder({ status: 8, delivery_type: 3, spot_number: 12 })
    open(table)
    expect(table.getByText('Table number')).toBeTruthy()
    table.unmount()
    const lane = renderOrder({ status: 8, delivery_type: 5, spot_number: 12 })
    open(lane)
    expect(lane.getByText('Drive thru lane')).toBeTruthy()
    lane.unmount()
    const curbside = renderOrder({ status: 8, delivery_type: 4, spot_number: 12 })
    open(curbside)
    expect(curbside.getByText('Spot number')).toBeTruthy()
    curbside.unmount()
    const reservation = renderOrder({ status: 8, delivery_type: 9, reservation: { reserve_date: '2099-02-02 20:00:00', guests_reservation: 4 } })
    open(reservation)
    expect(reservation.getByText('Reservation scheduled to')).toBeTruthy()
    expect(reservation.getByText(/2099-02-02 20:00:00 4 Guests/)).toBeTruthy()
  })

  it('confirmation.order.type and confirmation.order.eta hide their lines', () => {
    const view = renderOrder({ status: 8 }, {}, themed({ off: ['confirmation.order.type'] }))
    open(view)
    expect(view.queryByText('Order Type')).toBeNull()
    expect(view.getByText('Placed to')).toBeTruthy()
    view.unmount()
    const noEta = renderOrder({ status: 8 }, {}, themed({ off: ['confirmation.order.eta'] }))
    open(noEta)
    expect(noEta.queryByText('Placed to')).toBeNull()
    expect(noEta.getByText('Order Type')).toBeTruthy()
  })

  it('lists the custom fields (page section custom_fields) as label / value lines', () => {
    const order = { status: 8, metafields: [{ id: 1, key: 'Invoice', value: 'Required' }, { id: 2, key: 'Locker', value: 'B-12' }] }
    const view = renderOrder(order)
    open(view)
    expect(view.getByText('Custom fields')).toBeTruthy()
    expect(view.getByText('Invoice')).toBeTruthy()
    expect(view.getByText('B-12')).toBeTruthy()
    view.unmount()
    const hidden = renderOrder(order, {}, themed({ hide: ['custom_fields'] }))
    open(hidden)
    expect(hidden.queryByText('Custom fields')).toBeNull()
  })

  it('has no custom fields block for an order without custom fields', () => {
    const view = renderOrder({ status: 8, metafields: [] })
    open(view)
    expect(view.queryByText('Custom fields')).toBeNull()
  })

  it('lists the vehicle (page section vehicle) under its conditions, and its spot once', () => {
    const order = { status: 8, delivery_type: 4, spot_number: 12, vehicle: { car_registration: 'ABC-123', color: 'Red', model: 'Golf', type: 'Car' } }
    const view = renderOrder(order)
    open(view)
    expect(view.getByText('Vehicle')).toBeTruthy()
    expect(view.getByText('Car registration')).toBeTruthy()
    expect(view.getByText('ABC-123')).toBeTruthy()
    expect(view.getByText('Model')).toBeTruthy()
    // The spot is the data's own line: the vehicle block does not write it a second time.
    expect(view.getAllByText('Spot number')).toHaveLength(1)
    view.unmount()
    const hidden = renderOrder(order, {}, themed({ hide: ['vehicle'] }))
    open(hidden)
    expect(hidden.queryByText('Vehicle')).toBeNull()
    expect(hidden.queryByText('Car registration')).toBeNull()
  })

  it('a spot the data line leaves out (an assignment request) is written by the vehicle block', () => {
    const view = renderOrder({ status: 8, isLogistic: true, delivery_type: 4, spot_number: 12, vehicle: { car_registration: 'ABC-123' } })
    open(view)
    expect(view.getAllByText('Spot number')).toHaveLength(1)
  })

  it('is not drawn when it would be empty', () => {
    const { queryByRole } = renderOrder({ status: 8 }, {}, themed({ off: ['confirmation.order.type', 'confirmation.order.eta', 'confirmation.business.email', 'confirmation.business.phone'] }))
    expect(queryByRole('button', { name: 'More details' })).toBeNull()
  })
})

describe('FocusOrder: the order of the blocks in each stage (the approved mockups)', () => {
  beforeEach(() => {
    ;(useConfig as jest.Mock).mockReturnValue([{ configs: { distance_unit: { value: 'km' }, delivery_pin_enabled: { value: '1' }, states_requiring_image_driver: { value: '11' } } }])
  })

  /** The blocks the render drew, top to bottom (a block is named once, at its first element). */
  const drawn = (view: any): string[] => {
    const tree = JSON.stringify(view.toJSON())
    const at = (id: string) => tree.indexOf(`"testID":"${id}`)
    const first = (ids: string[]) => Math.min(...ids.map(at).filter((index) => index >= 0), Infinity)
    const stop = first(['focus-route', 'focus-stop-business"', 'focus-stop-customer"', 'focus-finished-stops'])
    // The finished order's two rows are the stop itself, in one card.
    const other = at('focus-finished-stops') >= 0 ? Infinity : first(['focus-stop-row-business', 'focus-stop-row-customer'])
    const found: Array<[string, number]> = [
      ['status', at('focus-status-row')],
      ['stop', stop],
      ['facts', at('focus-facts')],
      ['other', other],
      ['payment', at('focus-payment')],
      ['comment', at('focus-comment')],
      ['products', at('focus-products')],
      ['completion', at('focus-completion')],
      ['more', at('focus-more-details')]
    ]
    return found.filter(([, index]) => index >= 0 && index !== Infinity).sort((a, b) => a[1] - b[1]).map(([name]) => name)
  }

  // One row per stage: the status row first, "More details" last, and between them the mockup's blocks. `facts`
  // is the offered order's card of the total, the payment and the tip, drawn with its route.
  it.each([
    ['Main: the offered order', 0, {}, ['status', 'stop', 'facts', 'comment', 'products', 'more']],
    ['ToStore: on the way to the store', 8, {}, ['status', 'stop', 'other', 'payment', 'comment', 'products', 'more']],
    ['AtStore: at the store', 3, {}, ['status', 'stop', 'comment', 'products', 'other', 'payment', 'more']],
    ['ToCustomer: on the way to the customer', 9, {}, ['status', 'stop', 'payment', 'comment', 'products', 'other', 'more']],
    ['AtCustomer: with the customer', 26, { completeOffered: true }, ['status', 'stop', 'payment', 'completion', 'comment', 'products', 'other', 'more']],
    ['Done: delivered', 11, {}, ['status', 'stop', 'payment', 'comment', 'products', 'more']]
  ])('%s', (_name, status, props, expected) => {
    const view = renderOrder({ status, delivery_pin_status: 'requested' }, props)
    // The offered order's payment is said in its facts card: the route's "stop" holds both.
    expect(drawn(view)).toEqual(expected)
  })

  it('draws the comment right above the products and "Picked up at" under them, in the way to the customer', () => {
    const view = renderOrder({ status: 23 })
    const order = drawn(view)
    expect(order.indexOf('comment')).toBe(order.indexOf('products') - 1)
    expect(order.indexOf('other')).toBe(order.indexOf('products') + 1)
    expect(view.getByTestId('focus-stop-row-business')).toBeTruthy()
    expect(view.getByText('Picked up at')).toBeTruthy()
  })

  it('puts "Then deliver to" and the payment under the products at the store, and over them on the way to it', () => {
    const atStore = drawn(renderOrder({ status: 3 }))
    expect(atStore.indexOf('products')).toBeLessThan(atStore.indexOf('other'))
    expect(atStore.indexOf('other')).toBeLessThan(atStore.indexOf('payment'))
    const toStore = drawn(renderOrder({ status: 18 }))
    expect(toStore.indexOf('other')).toBeLessThan(toStore.indexOf('payment'))
    expect(toStore.indexOf('payment')).toBeLessThan(toStore.indexOf('products'))
  })

  it('draws an order that is not a delivery with the stage\'s order too (its customer is the neutral row)', () => {
    expect(drawn(renderOrder({ status: 3, delivery_type: 2 }))).toEqual(['status', 'stop', 'comment', 'products', 'other', 'payment', 'more'])
    expect(drawn(renderOrder({ status: 8, delivery_type: 2 }))).toEqual(['status', 'stop', 'other', 'payment', 'comment', 'products', 'more'])
  })

  it('keeps every page section\'s visibility: a hidden section leaves its block out and the rest keep their places', () => {
    expect(drawn(renderOrder({ status: 3 }, {}, themed({ hide: ['products'] })))).toEqual(['status', 'stop', 'other', 'payment', 'more'])
    expect(drawn(renderOrder({ status: 3 }, {}, themed({ hide: ['bill'] })))).toEqual(['status', 'stop', 'comment', 'products', 'other', 'more'])
    expect(drawn(renderOrder({ status: 3 }, {}, themed({ hide: ['customer'] })))).toEqual(['status', 'stop', 'comment', 'products', 'payment', 'more'])
    expect(drawn(renderOrder({ status: 9 }, {}, themed({ hide: ['business'] })))).toEqual(['status', 'stop', 'payment', 'comment', 'products', 'more'])
    expect(drawn(renderOrder({ status: 9 }, {}, themed({ hide: ['header'] })))).toEqual(['stop', 'payment', 'comment', 'products', 'other', 'more'])
  })

  it('is the same whatever order the theme lists its sections in: the stage orders the blocks, the theme says what is shown', () => {
    const reversed = themeWith({ pages: { order_details: { sections: [...sections].reverse() } } })
    ;[[0, {}], [8, {}], [3, {}], [9, {}], [26, { completeOffered: true }], [11, {}]].forEach(([status, props]: any) => {
      expect(drawn(renderOrder({ status, delivery_pin_status: 'requested' }, props, reversed)))
        .toEqual(drawn(renderOrder({ status, delivery_pin_status: 'requested' }, props)))
    })
  })

  it('has one table for the six stages, covering every block each stage draws', () => {
    const { FOCUS_BLOCK_ORDER } = require('../blockOrder')
    expect(Object.keys(FOCUS_BLOCK_ORDER).sort()).toEqual(['atCustomer', 'atStore', 'finished', 'offered', 'toCustomer', 'toStore'])
    Object.values(FOCUS_BLOCK_ORDER).forEach((blocks: any) => expect(new Set(blocks).size).toBe(blocks.length))
  })
})

describe('FocusOrder: a group of orders', () => {
  it('draws each order\'s blocks inside a card titled with its number', () => {
    const first = renderOrder({ id: 1042, status: 7 }, { isOrderGroup: true })
    expect(first.getByText('Order No. 1042')).toBeTruthy()
    expect(first.getByTestId('focus-route')).toBeTruthy()
    expect(first.getByTestId('focus-order')).toBeTruthy()
  })

  it('writes the number masked in a secure project', () => {
    ;(useApi as jest.Mock).mockReturnValue([{ project: 'quickiedelivery' }])
    const view = renderOrder({ id: 1234567, status: 7 }, { isOrderGroup: true })
    expect(view.getByText('Order No. 123****')).toBeTruthy()
    ;(useApi as jest.Mock).mockReturnValue([{ ordering: { root: 'https://api.test', project: 'demo' } }, {}])
  })

  it('has no title card for a single order', () => {
    const { queryByText } = renderOrder({ id: 1042, status: 7 })
    expect(queryByText('Order No. 1042')).toBeNull()
  })
})
