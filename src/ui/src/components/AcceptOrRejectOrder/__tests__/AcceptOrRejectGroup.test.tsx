import '../../../../../../jest/helpers/uiModuleMocks'
import React from 'react'
import { act, fireEvent, waitFor, within } from '@testing-library/react-native'

import { useConfig } from '@components'

jest.mock('@ui', () => {
  const { pickUi } = require('../../../../../../jest/helpers/uiModuleMocks')
  const { buildD3OrdersUiMock } = require('../../../../../../jest/helpers/d3OrdersUiMock')
  return pickUi(buildD3OrdersUiMock(), ['useOfflineActions'])
})

jest.mock('@components', () => ({
  ...require('../../../../../../jest/helpers/mockOrdering'),
  useUtils: jest.fn(() => [{ optimizeImage: (url: string) => url, parsePrice: (value: number) => `$${Number(value ?? 0).toFixed(2)}` }]),
  FloatingButton: require('../../../../../../jest/helpers/d1ShellDefaults').renderUiController({})
}))

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: any) => children,
  SafeAreaView: ({ children }: any) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 })
}))

import { AcceptOrRejectOrder } from '..'
import { groupRequestBody, hasSingleCustomer, isOrderGroup, readStatusAnswer, updateGroupStatus } from '../groupOrders'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { driverAppTitle, driverOrderTitle } from '../../../../../../jest/helpers/d3OrdersDefaults'

const orderTitle = {
  ...driverOrderTitle,
  arrivedToBusiness: { key: 'ARRIVED_TO_BUSINESS', text: 'Arrived to business', btnKey: 'ARRIVED_TO_BUSINESS', btnText: 'Arrived to business' },
  pickupComplete: { key: 'PICKUP_COMPLETE', text: 'Pickup complete', btnKey: 'PICKUP_COMPLETE', btnText: 'Pickup complete' },
  deliveryComplete: { key: 'DELIVERY_COMPLETE', text: 'Delivery complete', btnKey: 'DELIVERY_COMPLETE', btnText: 'Delivery complete' }
}

const ana = { customer_id: 11, customer: { id: 11, name: 'Ana', lastname: 'Torres', cellphone: '6465550129', country_phone_code: '1' } }
const leo = { customer_id: 12, customer: { id: 12, name: 'Leo', lastname: 'Park', cellphone: '3001234567', country_phone_code: '57' } }

/** A group's orders: the ids and customers given, the group's number on each (`cart_group_id`). */
const groupOf = (ids: number[], customers: any[] = [ana, leo]) =>
  ids.map((id, index) => ({ id, cart_group_id: 57, status: 0, ...customers[index % customers.length] }))

const mockConfigs = (configs: any = {}) =>
  (useConfig as jest.Mock).mockReturnValue([{ configs: { disable_delivery_priority: { value: '1' }, ...configs } }])

const render = (action: string, props: any = {}) => {
  const orders = props.orders
  return renderWithProviders(
    <AcceptOrRejectOrder
      isPage
      action={action}
      orderTitle={orderTitle}
      appTitle={driverAppTitle}
      orderId={orders?.[0]?.id ?? 1}
      order={orders?.[0]}
      customerCellphone={orders?.[0]?.customer?.cellphone}
      customerCountryPhoneCode={orders?.[0]?.customer?.country_phone_code}
      actions={{ accept: 'acceptByDriver', reject: 'rejectByDriver', pickupFailed: 'pickupFailedByDriver', deliveryFailed: 'deliveryFailedByDriver', notReady: 'orderNotReady' }}
      handleUpdateOrder={jest.fn()}
      closeModal={jest.fn()}
      {...props}
    />
  )
}

describe('AcceptOrRejectOrder for a group of orders', () => {
  beforeEach(() => {
    const { offlineActionsState } = require('../../../../../../jest/helpers/d3OrdersUiMock')
    offlineActionsState.isNetConnected = true
    offlineActionsState.canSaveChangesOffline = false
    mockConfigs()
  })

  describe('the title and what is under it', () => {
    it('a single order keeps its title, its number and its customer (nothing of the group)', () => {
      const [only] = groupOf([3504])
      const screen = render('reject', { orders: [only], groupId: 57 })
      expect(screen.getByText('Reject Order')).toBeTruthy()
      expect(screen.getByText('Order No. 3504 · Ana Torres')).toBeTruthy()
      expect(screen.queryByTestId('group-orders-line')).toBeNull()
      expect(screen.queryByText(/Group No\./)).toBeNull()
      expect(screen.getByText('Mark the order as rejected')).toBeTruthy()
      expect(screen.getByText('Note: Your customer will receive a notification about this action')).toBeTruthy()
    })

    it('a group of 2 names the action and the count, then the group, then its orders; no customer name', () => {
      const orders = groupOf([3504, 2876])
      const screen = render('reject', { orders, groupId: 57 })
      expect(screen.getByText('Reject 2 orders')).toBeTruthy()
      expect(screen.queryByText('Reject Order')).toBeNull()
      expect(screen.getByText('Group No. 57')).toBeTruthy()
      expect(screen.getByTestId('group-orders-line').props.children).toBe('Orders No. 3504, 2876')
      expect(screen.queryByText(/Order No\./)).toBeNull()
      expect(screen.queryByText(/Ana|Leo/)).toBeNull()
    })

    it('takes the group\'s number from its orders when the caller gives none', () => {
      const screen = render('reject', { orders: groupOf([1, 2]) })
      expect(screen.getByText('Group No. 57')).toBeTruthy()
    })

    it('a group of 12 keeps every number in the list\'s order on ONE line that ends in an ellipsis', () => {
      const ids = Array.from({ length: 12 }, (_, index) => 3500 + index * 7)
      const screen = render('reject', { orders: groupOf(ids), groupId: 57 })
      expect(screen.getByText('Reject 12 orders')).toBeTruthy()
      const line = screen.getByTestId('group-orders-line')
      expect(line.props.children).toBe(`Orders No. ${ids.join(', ')}`)
      expect(line.props.numberOfLines).toBe(1)
      expect(line.props.ellipsizeMode).toBe('tail')
    })

    it('masks the numbers as the rest of the app does and writes the external id when the project asks', () => {
      mockConfigs({ change_order_id: { value: '1' } })
      const orders = groupOf([3504, 2876]).map((order, index) => (index === 0 ? { ...order, external_id: 'EXT-1' } : order))
      const screen = render('reject', { orders, groupId: 57 })
      expect(screen.getByTestId('group-orders-line').props.children).toBe('Orders No. EXT-1, 2876')
    })

    it.each([
      ['arrivedToBusiness', 'Arrived to business for 2 orders', 'Arrived to business'],
      ['pickupComplete', 'Pickup complete for 2 orders', 'Pickup complete'],
      ['deliveryComplete', 'Delivery complete for 2 orders', 'Delivery complete']
    ])('the steps of the route say the group in their title (%s), and the button keeps the action\'s own name', (action, title, buttonText) => {
      const screen = render(action, { orders: groupOf([1, 2]), groupId: 57, isPage: false })
      expect(screen.getByText(title)).toBeTruthy()
      expect(within(screen.getByTestId('order-action')).getByText(buttonText)).toBeTruthy()
    })

    it('a single order at one of those steps keeps the single title', () => {
      const [only] = groupOf([3504])
      const screen = render('pickupComplete', { orders: [only], groupId: 57, isPage: false })
      expect(screen.getAllByText('Pickup complete').length).toBeGreaterThan(0)
      expect(screen.queryByText(/for \d+ orders/)).toBeNull()
    })

    it.each([
      ['pickupFailed', 'Pickup failed for 2 orders'],
      ['deliveryFailed', 'Delivery failed for 2 orders'],
      ['notReady', '2 orders not ready']
    ])('the other reason forms too (%s)', (action, title) => {
      const screen = render(action, { orders: groupOf([1, 2]), groupId: 57 })
      expect(screen.getByText(title)).toBeTruthy()
      expect(screen.getByText('Group No. 57')).toBeTruthy()
      expect(screen.getByTestId('group-orders-line')).toBeTruthy()
      // The button keeps the action's own name.
      expect(screen.getByTestId('order-action')).toBeTruthy()
    })
  })

  describe('the texts in the plural', () => {
    it('a group of several customers: "customers" in the note, "orders" in the line, and no call to make', () => {
      const screen = render('reject', { orders: groupOf([1, 2]), groupId: 57 })
      expect(screen.getByText('Note: Your customers will receive a notification about this action')).toBeTruthy()
      expect(screen.getByText('Mark the orders as rejected')).toBeTruthy()
      expect(screen.queryByText('Mark the order as rejected')).toBeNull()
      expect(screen.queryByTestId('customer-phone-button')).toBeNull()
      expect(screen.queryByText(/Call your customer/)).toBeNull()
    })

    it('a group of one customer keeps the call (one phone) and the customer\'s own note', () => {
      const orders = groupOf([1, 2], [ana])
      const screen = render('reject', { orders, groupId: 57 })
      expect(screen.getByTestId('customer-phone-button')).toBeTruthy()
      expect(screen.getByText('+1 646 555 0129')).toBeTruthy()
      expect(screen.getByText(/Call your customer/)).toBeTruthy()
      expect(screen.getByText('Note: Your customer will receive a notification about this action')).toBeTruthy()
      // The orders are still plural.
      expect(screen.getByText('Mark the orders as rejected')).toBeTruthy()
    })

    it('orders without a customer id are not known to be the same one: no call', () => {
      const orders = [{ id: 1, cart_group_id: 57 }, { id: 2, cart_group_id: 57 }]
      const screen = render('reject', { orders, groupId: 57, customerCellphone: '5551234' })
      expect(screen.queryByTestId('customer-phone-button')).toBeNull()
    })

    it('what happened, the comments and the button are the same as for one order', async () => {
      const handleUpdateOrder = jest.fn().mockResolvedValue(true)
      const screen = render('reject', { orders: groupOf([1, 2]), groupId: 57, handleUpdateOrder })
      expect(screen.getByTestId('reject-reasons')).toBeTruthy()
      fireEvent.press(screen.getByTestId('reject-reason-very_far_away'))
      fireEvent.changeText(screen.getByPlaceholderText('Please type your comments in here'), 'too far')
      fireEvent.press(screen.getByText('Reject'))
      await waitFor(() => expect(handleUpdateOrder).toHaveBeenCalled())
      expect(handleUpdateOrder).toHaveBeenCalledWith(6, expect.objectContaining({ reject_reason: 'very_far_away', reasons: 'too far' }), undefined)
    })
  })

  describe('the sheets', () => {
    it('Accept for a group is a sheet that names the count, the group and its orders on one line', () => {
      const screen = render('accept', { isPage: false, orders: groupOf([3504, 2876]), groupId: 57 })
      expect(screen.getByTestId('order-sheet')).toBeTruthy()
      expect(screen.getByText('Accept 2 orders')).toBeTruthy()
      expect(screen.queryByText('Accept order')).toBeNull()
      const line = screen.getByTestId('group-orders-line')
      expect(line.props.children).toBe('Group No. 57 · Orders No. 3504, 2876')
      expect(line.props.numberOfLines).toBe(1)
    })

    it('Accept for one order is the sheet it always was', () => {
      const screen = render('accept', { isPage: false, order: { id: 1, status: 0 } })
      expect(screen.getByText('Accept order')).toBeTruthy()
      expect(screen.queryByTestId('group-orders-line')).toBeNull()
    })

    it('the delivery position asks about the orders, not about "this order", for a group', () => {
      mockConfigs({ disable_delivery_priority: { value: '0' } })
      const group = render('accept', { isPage: false, orders: groupOf([1, 2]), groupId: 57, activeOrdersCount: 2 })
      expect(group.getByText('In which order will you deliver these orders?')).toBeTruthy()
      group.unmount()
      const one = render('accept', { isPage: false, order: { id: 1, status: 0 }, activeOrdersCount: 2 })
      expect(one.getByText('In which order will you deliver this order?')).toBeTruthy()
    })

    it('Delivery complete for a group names the count and draws no recap of a single order\'s payment', () => {
      mockConfigs({ delivery_pin_enabled: { value: '1' } })
      const orders = groupOf([1, 2]).map((order) => ({ ...order, status: 9, delivery_pin_status: 'requested', summary: { total: 10 } }))
      const group = render('deliveryComplete', { isPage: false, orders, groupId: 57 })
      expect(group.getByText('Delivery complete for 2 orders')).toBeTruthy()
      expect(group.queryByTestId('collect-recap')).toBeNull()
      group.unmount()
      const one = render('deliveryComplete', { isPage: false, orders: [orders[0]], order: orders[0] })
      expect(one.getAllByText('Delivery complete').length).toBeGreaterThan(0)
      expect(one.queryByText(/for \d+ orders/)).toBeNull()
      expect(one.getByTestId('collect-recap')).toBeTruthy()
    })
  })
})

describe('the group helpers', () => {
  it('a group has more than one order', () => {
    expect(isOrderGroup(undefined)).toBe(false)
    expect(isOrderGroup([])).toBe(false)
    expect(isOrderGroup([{ id: 1 }])).toBe(false)
    expect(isOrderGroup([{ id: 1 }, { id: 2 }])).toBe(true)
  })

  it('the orders share a customer when every one has the same known customer id', () => {
    expect(hasSingleCustomer([{ customer_id: 1 }, { customer_id: 1 }])).toBe(true)
    expect(hasSingleCustomer([{ customer: { id: 1 } }, { customer_id: 1 }])).toBe(true)
    expect(hasSingleCustomer([{ customer_id: 1 }, { customer_id: 2 }])).toBe(false)
    expect(hasSingleCustomer([{ id: 1 }, { id: 2 }])).toBe(false)
  })

  describe('readStatusAnswer: whichever handler answered, an order changed only when its answer is there', () => {
    it('every answer there is every order changed', () => {
      expect(readStatusAnswer([{}, { id: 2 }], [1, 2])).toEqual({ succeeded: true, failures: [] })
      // The answers with their details (`withDetails`): an `error` of false is a change.
      expect(readStatusAnswer([{ id: 1, result: {}, error: false }], [1]).succeeded).toBe(true)
    })

    it('a null is an order that did not change (the list\'s and the logistic handler\'s answer to a failure)', () => {
      expect(readStatusAnswer([{}, null], [1, 2])).toEqual({ succeeded: false, failures: [{ id: 2, message: undefined, errorCodes: null, retryAfter: null }] })
      expect(readStatusAnswer([null, null], [1, 2]).failures.map((failure) => failure.id)).toEqual([1, 2])
    })

    it('an answer with an error carries the API\'s message, its codes and its wait', () => {
      const { failures } = readStatusAnswer(
        [{ id: 1, result: {}, error: false }, { id: 2, result: ['Delivery pin is invalid'], error: true, errorCodes: ['delivery_pin.invalid'], retryAfter: 30 }],
        [1, 2]
      )
      expect(failures).toEqual([{ id: 2, message: ['Delivery pin is invalid'], errorCodes: ['delivery_pin.invalid'], retryAfter: 30 }])
    })

    it('a text (the list handler\'s exception) fails every order and is the message, even when its length is the count of ids', () => {
      expect(readStatusAnswer('x', [1])).toEqual({ succeeded: false, failures: [{ id: 1, message: 'x' }] })
      expect(readStatusAnswer('Network request failed', [1, 2]).failures.map((failure) => failure.message)).toEqual(['Network request failed', 'Network request failed'])
    })

    it('an answer that cannot be matched to the ids (nothing, a short list, the empty list of an unsent time) fails every order', () => {
      expect(readStatusAnswer(undefined, [1, 2]).failures).toHaveLength(2)
      expect(readStatusAnswer(null, [1]).succeeded).toBe(false)
      expect(readStatusAnswer([{}], [1, 2]).failures.map((failure) => failure.id)).toEqual([1, 2])
      expect(readStatusAnswer([], [1]).succeeded).toBe(false)
      // A short list still tells why when one of its answers does.
      expect(readStatusAnswer([{ id: 1, result: ['Closed'], error: true }], [1, 2]).failures[0].message).toEqual(['Closed'])
    })

    it('nothing to change is nothing that failed', () => {
      expect(readStatusAnswer([], []).succeeded).toBe(true)
    })
  })

  describe('updateGroupStatus', () => {
    it('changes the whole group in one request, asking for each order\'s answer, and says it worked when every order answered', async () => {
      const handleChangeOrderStatus = jest.fn().mockResolvedValue([{}, {}])
      const done = await updateGroupStatus({ ids: [1, 2], handleChangeOrderStatus, status: 8, body: { delivered_in: 5 } })
      expect(handleChangeOrderStatus).toHaveBeenCalledWith(8, [1, 2], { delivered_in: 5, status: 8 }, { withDetails: true })
      expect(done).toEqual({ succeeded: true, failures: [] })
    })

    it('says which order did not change', async () => {
      const done = await updateGroupStatus({ ids: [1, 2], handleChangeOrderStatus: jest.fn().mockResolvedValue([{}, null]), status: 8, body: {} })
      expect(done?.succeeded).toBe(false)
      expect(done?.failures.map((failure) => failure.id)).toEqual([2])
    })

    it('a request that throws is every order not changed, with its message (no exception for the screen)', async () => {
      const done = await updateGroupStatus({ ids: [1, 2], handleChangeOrderStatus: jest.fn().mockRejectedValue(new Error('Boom')), status: 8, body: {} })
      expect(done).toEqual({ succeeded: false, failures: [{ id: 1, message: 'Boom' }, { id: 2, message: 'Boom' }] })
    })

    it('sends one request per order with its own delivery code and reports every answer', async () => {
      const handleChangeOrderStatus = jest.fn().mockResolvedValue([{ id: 1 }])
      const onStatusResponses = jest.fn()
      const done = await updateGroupStatus({
        ids: [1, 2],
        handleChangeOrderStatus,
        status: 11,
        body: { status: 11 },
        options: { deliveryPins: { 1: '1111', 2: '2222' }, onStatusResponses }
      })
      expect(handleChangeOrderStatus).toHaveBeenCalledWith(11, [1], { status: 11, delivery_pin: '1111' }, { withDetails: true })
      expect(handleChangeOrderStatus).toHaveBeenCalledWith(11, [2], { status: 11, delivery_pin: '2222' }, { withDetails: true })
      expect(onStatusResponses).toHaveBeenCalledWith([{ id: 1 }, { id: 1 }])
      expect(done?.succeeded).toBe(true)
    })

    it('a code that was refused leaves the screen open, and the order that refused it is the failure', async () => {
      const done = await updateGroupStatus({
        ids: [1],
        handleChangeOrderStatus: jest.fn().mockResolvedValue([{ id: 1, error: true, result: ['Delivery pin is invalid'], errorCodes: ['delivery_pin.invalid'] }]),
        status: 11,
        body: {},
        options: { deliveryPins: { 1: '0000' } }
      })
      expect(done?.succeeded).toBe(false)
      expect(done?.failures).toEqual([{ id: 1, message: ['Delivery pin is invalid'], errorCodes: ['delivery_pin.invalid'], retryAfter: null }])
    })

    it('does nothing without the list\'s function', async () => {
      expect(await updateGroupStatus({ ids: [1], status: 8, body: {} })).toBeUndefined()
    })

    describe('what the list\'s request is given: a plain body with its status', () => {
      it('never a multipart body (a photo): nothing is sent and every order is not changed, so the photo is never dropped', async () => {
        const handleChangeOrderStatus = jest.fn()
        const photo = new FormData()
        photo.append('status', '9')
        photo.append('status_image_file', { uri: 'file:///photo.jpg', type: 'image/jpeg', name: 'photo.jpg' } as any)
        const done = await updateGroupStatus({ ids: [1, 2], handleChangeOrderStatus, status: 9, body: photo })
        expect(handleChangeOrderStatus).not.toHaveBeenCalled()
        expect(done).toEqual({ succeeded: false, failures: [{ id: 1 }, { id: 2 }] })
      })

      it('nor with a delivery code per order: the multipart body would have gone out as `{ delivery_pin }` with no status', async () => {
        const handleChangeOrderStatus = jest.fn()
        const photo = new FormData()
        photo.append('status', '11')
        const done = await updateGroupStatus({ ids: [1], handleChangeOrderStatus, status: 11, body: photo, options: { deliveryPins: { 1: '1111' } } })
        expect(handleChangeOrderStatus).not.toHaveBeenCalled()
        expect(done?.succeeded).toBe(false)
      })

      it('always carries the status, with a code per order too', async () => {
        const handleChangeOrderStatus = jest.fn().mockResolvedValue([{}])
        await updateGroupStatus({ ids: [1], handleChangeOrderStatus, status: 11, body: {}, options: { deliveryPins: { 1: '1111' } } })
        expect(handleChangeOrderStatus).toHaveBeenCalledWith(11, [1], { status: 11, delivery_pin: '1111' }, { withDetails: true })
      })

      it('sends nothing when there is no status to send', async () => {
        const handleChangeOrderStatus = jest.fn()
        const done = await updateGroupStatus({ ids: [1], handleChangeOrderStatus, status: undefined, body: { reasons: 'late' } })
        expect(handleChangeOrderStatus).not.toHaveBeenCalled()
        expect(done?.succeeded).toBe(false)
      })

      it('carries where the driver checked in for the steps with a check, as the order\'s own request does', async () => {
        const handleChangeOrderStatus = jest.fn().mockResolvedValue([{}])
        await updateGroupStatus({ ids: [1], handleChangeOrderStatus, status: 9, body: { status: 9 }, options: { location: { latitude: 4.5, longitude: -74.1 } } })
        expect(handleChangeOrderStatus.mock.calls[0][2]).toEqual({ status: 9, location: { lat: 4.5, lng: -74.1 } })
      })

      it('leaves the location out of the statuses that do not check it', () => {
        expect(groupRequestBody(8, { status: 8 }, { latitude: 1, longitude: 2 })).toEqual({ status: 8 })
        expect(groupRequestBody(8, { delivered_in: 5 })).toEqual({ delivered_in: 5, status: 8 })
      })
    })
  })

  describe('the location check of a group', () => {
    const near = { lat: 0.0001, lng: 0.0001 }
    const far = { lat: 10, lng: 10 }
    const storeAt = (location: any) => ({ business: { location } })
    const checked = () => mockConfigs({
      location_validation_enabled_status_9: { value: '1' },
      location_validation_distance_status_9: { value: '100' }
    })

    it('checks every order\'s own store, not the first one\'s alone: one far from the driver blocks the whole step', async () => {
      checked()
      const handleUpdateOrder = jest.fn()
      const orders = [{ ...groupOf([1])[0], ...storeAt(near) }, { ...groupOf([2])[0], ...storeAt(far) }]
      const screen = render('pickupComplete', { orders, groupId: 57, handleUpdateOrder })
      fireEvent.press(screen.getByTestId('order-action'))
      expect(await screen.findByText('Requirements Not Met')).toBeTruthy()
      expect(handleUpdateOrder).not.toHaveBeenCalled()
    })

    it('lets the step through when every order is where the driver is', async () => {
      checked()
      const handleUpdateOrder = jest.fn().mockResolvedValue(true)
      const orders = [{ ...groupOf([1])[0], ...storeAt(near) }, { ...groupOf([2])[0], ...storeAt(near) }]
      const screen = render('pickupComplete', { orders, groupId: 57, handleUpdateOrder })
      await act(async () => {})
      await act(async () => { fireEvent.press(screen.getByTestId('order-action')) })
      expect(handleUpdateOrder).toHaveBeenCalledTimes(1)
      // The place goes with the request, as the order's own request sends it.
      expect(handleUpdateOrder.mock.calls[0][2]).toEqual({ location: expect.objectContaining({ latitude: 0, longitude: 0 }) })
    })
  })
})
