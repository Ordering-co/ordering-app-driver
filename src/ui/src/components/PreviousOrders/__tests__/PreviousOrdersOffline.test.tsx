import '../../../../../../jest/helpers/uiModuleMocks'
import React from 'react'
import { Alert } from 'react-native'
import { act, fireEvent, waitFor } from '@testing-library/react-native'

import { useConfig } from '@components'
import { offlineActionsFns, offlineActionsState } from '../../../../../../jest/helpers/d3OrdersUiMock'

jest.mock('@ui', () => {
  const { pickUi } = require('../../../../../../jest/helpers/uiModuleMocks')
  const { buildD3OrdersIntegrationUiMock } = require('../../../../../../jest/helpers/d3OrdersUiMock')
  return pickUi(buildD3OrdersIntegrationUiMock(), ['useOfflineActions', 'ReviewCustomer'])
})

jest.mock('@components', () => {
  const { getMock } = require('../../../../../../jest/helpers/d3OrdersComponentsMock')
  return getMock()
})

import { PreviousOrders as PreviousOrdersList } from '..'
import { useAcceptSheet } from '../../../hooks/useAcceptSheet'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { driverOrderTitle, sampleOrder } from '../../../../../../jest/helpers/d3OrdersDefaults'

/** The list as the orders screen draws it: it hosts the accept sheet (`useAcceptSheet`), and the list asks for it. */
const PreviousOrders = (props: any) => {
  const { openSheet, sheet } = useAcceptSheet({
    actions: props.actions,
    orderTitle: props.orderTitle,
    appTitle: props.appTitle,
    isLoadingOrder: props.loadingChangeOrder
  })
  return (
    <>
      <PreviousOrdersList openAcceptSheet={openSheet} {...props} />
      {sheet}
    </>
  )
}

const baseProps = {
  orderTitle: {
    ...driverOrderTitle,
    deliveryComplete: { key: 'DELIVERY_COMPLETE', text: 'Delivery complete', btnKey: 'DELIVERY_COMPLETE', btnText: 'Delivery complete' }
  },
  actions: { accept: 'acceptByDriver', reject: 'rejectByDriver' },
  getOrderStatus: () => 'In Progress',
  appTitle: { text: 'Delivery app' },
  onNavigationRedirect: jest.fn(),
  handleClickOrder: jest.fn()
}

const first = { ...sampleOrder, business: { ...sampleOrder.business, logo: null } }
const second = { ...first, id: 102 }
/** One group of two orders (101 and 102) at the given status, as the list draws a group. */
const group = (status: number, extra: Record<string, any> = {}) =>
  [[['group-1', [{ ...first, status, ...extra }, { ...second, status, ...extra }]]]]

const expandGroup = (screen: any) => fireEvent.press(screen.getAllByLabelText(/^Group No\./)[0])
const question = () => {
  const [title, , buttons] = (Alert.alert as jest.Mock).mock.calls.at(-1)
  return { title, accept: buttons[0] }
}
const toasts = () => require('../../../../../../jest/helpers/mockOrdering').useToast()[1].showToast.mock.calls

describe('PreviousOrders: a group\'s status change without a connection (decision 2026-11-20)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(Alert, 'alert').mockImplementation(jest.fn())
    offlineActionsState.isNetConnected = false
    offlineActionsState.canSaveChangesOffline = true
    offlineActionsFns.applyOffAction.mockReset().mockResolvedValue(true)
    offlineActionsFns.registerOffOrder.mockReset().mockResolvedValue(undefined)
    ;(useConfig as jest.Mock).mockReturnValue([{
      configs: { failed_pickup_by_driver_enabled: { value: '1' }, order_not_ready_enabled: { value: '1' }, disable_delivery_priority: { value: '1' } }
    }])
  })

  describe('the confirmation of a step queues one change per order and sends nothing', () => {
    const cases: Array<[string, any, number]> = [
      ['Ready for pickup', { status: 7 }, 4],
      ['Arrived to business', { status: 8, delivery_type: 1 }, 3],
      ['Pickup complete', { status: 8, delivery_type: 1 }, 9],
      ['Pickup completed by customer', { status: 4, delivery_type: 2 }, 15],
      ['Order not picked up by customer', { status: 4, delivery_type: 2 }, 17],
      ['Delivery complete', { status: 9 }, 11]
    ]

    it.each(cases)('%s', async (label, order, status) => {
      const handleChangeOrderStatus = jest.fn()
      const screen = renderWithProviders(
        <PreviousOrders {...baseProps} handleChangeOrderStatus={handleChangeOrderStatus} orders={group(order.status, order)} />
      )
      expandGroup(screen)
      fireEvent.press(screen.getByText(label))
      // The question is the same one the connected list asks.
      expect(question().title).toBe(label)
      expect(offlineActionsFns.applyOffAction).not.toHaveBeenCalled()
      await act(async () => { question().accept.onPress() })

      expect(handleChangeOrderStatus).not.toHaveBeenCalled()
      // One write, a change per order, each with its own id, the shape the accept sheet queues.
      expect(offlineActionsFns.applyOffAction).toHaveBeenCalledTimes(1)
      expect(offlineActionsFns.applyOffAction).toHaveBeenCalledWith([
        { event: 'evt_off_change_order_status', data: { orderId: 101, body: { status, id: 101 } } },
        { event: 'evt_off_change_order_status', data: { orderId: 102, body: { status, id: 102 } } }
      ])
      // Each order is kept as it will be once synced, with its old status and its sync mark.
      expect(offlineActionsFns.registerOffOrder).toHaveBeenCalledTimes(2)
      expect(offlineActionsFns.registerOffOrder).toHaveBeenCalledWith(expect.objectContaining({ id: 101, status, oldStatus: order.status, unsync: true }))
      expect(offlineActionsFns.registerOffOrder).toHaveBeenCalledWith(expect.objectContaining({ id: 102, status, oldStatus: order.status, unsync: true }))
      expect(toasts()).toEqual([])
    })

    it('the buttons are ready again afterwards (the confirmation can be asked again)', async () => {
      const screen = renderWithProviders(<PreviousOrders {...baseProps} handleChangeOrderStatus={jest.fn()} orders={group(7)} />)
      expandGroup(screen)
      fireEvent.press(screen.getByText('Ready for pickup'))
      await act(async () => { question().accept.onPress() })
      fireEvent.press(screen.getByText('Ready for pickup'))
      expect(Alert.alert).toHaveBeenCalledTimes(2)
    })

    it('a queue that could not be written says the change was not saved, and registers nothing', async () => {
      offlineActionsFns.applyOffAction.mockResolvedValue(false)
      const handleChangeOrderStatus = jest.fn()
      const screen = renderWithProviders(<PreviousOrders {...baseProps} handleChangeOrderStatus={handleChangeOrderStatus} orders={group(7)} />)
      expandGroup(screen)
      fireEvent.press(screen.getByText('Ready for pickup'))
      await act(async () => { question().accept.onPress() })
      expect(toasts()).toEqual([['error', 'The change was not saved. Try again.']])
      expect(offlineActionsFns.registerOffOrder).not.toHaveBeenCalled()
      expect(handleChangeOrderStatus).not.toHaveBeenCalled()
    })

    it('a queue that throws says it too, and the group is not left locked', async () => {
      offlineActionsFns.applyOffAction.mockRejectedValue(new Error('disk full'))
      const screen = renderWithProviders(<PreviousOrders {...baseProps} handleChangeOrderStatus={jest.fn()} orders={group(7)} />)
      expandGroup(screen)
      fireEvent.press(screen.getByText('Ready for pickup'))
      await act(async () => { question().accept.onPress() })
      expect(toasts()).toEqual([['error', 'The change was not saved. Try again.']])
      fireEvent.press(screen.getByText('Ready for pickup'))
      expect(Alert.alert).toHaveBeenCalledTimes(2)
    })

    it('with a connection the step is sent, once, and nothing is queued', async () => {
      offlineActionsState.isNetConnected = true
      const handleChangeOrderStatus = jest.fn()
      const screen = renderWithProviders(<PreviousOrders {...baseProps} handleChangeOrderStatus={handleChangeOrderStatus} orders={group(7)} />)
      expandGroup(screen)
      fireEvent.press(screen.getByText('Ready for pickup'))
      await act(async () => { question().accept.onPress() })
      expect(handleChangeOrderStatus).toHaveBeenCalledTimes(1)
      expect(handleChangeOrderStatus).toHaveBeenCalledWith(4, [101, 102])
      expect(offlineActionsFns.applyOffAction).not.toHaveBeenCalled()
    })
  })

  describe('the other paths a group\'s change takes queue the same way (they already did)', () => {
    it('the accept sheet ("Accept all"): a change per order in one write, nothing sent, the sheet closes', async () => {
      const handleChangeOrderStatus = jest.fn()
      const screen = renderWithProviders(
        <PreviousOrders {...baseProps} handleChangeOrderStatus={handleChangeOrderStatus} orders={group(0)} getOrderStatus={() => 'Pending'} />
      )
      expandGroup(screen)
      fireEvent.press(screen.getByText('Accept all'))
      fireEvent.press(screen.getByTestId('order-action'))
      await waitFor(() => expect(screen.queryByTestId('order-sheet')).toBeNull(), { timeout: 5000 })
      expect(handleChangeOrderStatus).not.toHaveBeenCalled()
      expect(offlineActionsFns.applyOffAction).toHaveBeenCalledTimes(1)
      expect(offlineActionsFns.applyOffAction).toHaveBeenCalledWith([
        { event: 'evt_off_change_order_status', data: { orderId: 101, body: expect.objectContaining({ status: 8, id: 101 }) } },
        { event: 'evt_off_change_order_status', data: { orderId: 102, body: expect.objectContaining({ status: 8, id: 102 }) } }
      ])
      expect(offlineActionsFns.registerOffOrder).toHaveBeenCalledTimes(2)
    })

    it('a reason form is the route: it is given the group and the list\'s request, which it never calls offline (see AcceptOrRejectGroupOffline)', () => {
      const onNavigationRedirect = jest.fn()
      const screen = renderWithProviders(
        <PreviousOrders {...baseProps} onNavigationRedirect={onNavigationRedirect} handleChangeOrderStatus={jest.fn()} orders={group(0)} getOrderStatus={() => 'Pending'} />
      )
      expandGroup(screen)
      fireEvent.press(screen.getByText('Reject all'))
      expect(onNavigationRedirect).toHaveBeenCalledWith('AcceptOrRejectOrder', expect.objectContaining({ action: 'reject', ids: [101, 102] }))
    })
  })

  it('without changes saved for later the group\'s buttons are not drawn at all (nothing to queue, nothing to send)', () => {
    offlineActionsState.canSaveChangesOffline = false
    const screen = renderWithProviders(<PreviousOrders {...baseProps} handleChangeOrderStatus={jest.fn()} orders={group(7)} />)
    expandGroup(screen)
    expect(screen.queryByText('Ready for pickup')).toBeNull()
  })

  it('names the group "Group No. 57" (a space) in the list, as the sheet and the forms do', () => {
    const orders = [[[57, [{ ...first, status: 7 }, { ...second, status: 7 }]]]]
    const screen = renderWithProviders(<PreviousOrders {...baseProps} handleChangeOrderStatus={jest.fn()} orders={orders} />)
    expect(screen.getByText('Group No. 57')).toBeTruthy()
    expect(screen.getByLabelText('Group No. 57')).toBeTruthy()
  })

describe('PreviousOrders: the sync mark of a card is the queue\'s', () => {
  const change = (orderId: number) => ({ event: 'evt_off_change_order_status', data: { orderId, body: { id: orderId, status: 3 } } })
  const card = (extra: Record<string, any> = {}) => [{ ...first, status: 3, ...extra }]

  beforeEach(() => {
    jest.clearAllMocks()
    offlineActionsState.isNetConnected = true
    offlineActionsState.canSaveChangesOffline = true
    offlineActionsState.actions = {}
  })
  afterEach(() => { offlineActionsState.actions = {} })

  it('is there while the queue holds a change for the order, whatever the copy of the order says', () => {
    offlineActionsState.actions = { 101: [change(101)] }
    const screen = renderWithProviders(<PreviousOrders {...baseProps} handleChangeOrderStatus={jest.fn()} orders={card()} />)
    expect(screen.getByTestId('order-card-unsync')).toBeTruthy()
  })

  it('is not there for a copy that says it is unsynced when the queue holds nothing for it (the list was not reloaded after the sync)', () => {
    const screen = renderWithProviders(<PreviousOrders {...baseProps} handleChangeOrderStatus={jest.fn()} orders={card({ unsync: true })} />)
    expect(screen.queryByTestId('order-card-unsync')).toBeNull()
  })

  it('goes with the queue: gone when the sync has sent the order\'s change, kept for one that failed and stays queued', () => {
    offlineActionsState.actions = { 101: [change(101)], 102: [change(102)] }
    const orders = [{ ...first, status: 3 }, { ...second, status: 3 }]
    const screen = renderWithProviders(<PreviousOrders {...baseProps} handleChangeOrderStatus={jest.fn()} orders={orders} />)
    expect(screen.getAllByTestId('order-card-unsync')).toHaveLength(2)
    // The run sent 101 and 102 failed: the queue keeps 102 only.
    offlineActionsState.actions = { 102: [change(102)] }
    screen.rerender(<PreviousOrders {...baseProps} handleChangeOrderStatus={jest.fn()} orders={orders} activeOrdersCount={1} />)
    expect(screen.getAllByTestId('order-card-unsync')).toHaveLength(1)
    offlineActionsState.actions = {}
    screen.rerender(<PreviousOrders {...baseProps} handleChangeOrderStatus={jest.fn()} orders={orders} activeOrdersCount={2} />)
    expect(screen.queryByTestId('order-card-unsync')).toBeNull()
  })

  it('marks the rows of a group, each by its own queue entry', () => {
    offlineActionsState.actions = { 102: [change(102)] }
    const screen = renderWithProviders(<PreviousOrders {...baseProps} handleChangeOrderStatus={jest.fn()} orders={group(3)} />)
    expandGroup(screen)
    expect(screen.getAllByTestId('order-card-unsync')).toHaveLength(1)
  })
})
})
