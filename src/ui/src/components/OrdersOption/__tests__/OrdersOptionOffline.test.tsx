import '../../../../../../jest/helpers/uiModuleMocks'
import React from 'react'
import { ScrollView } from 'react-native'
import { act, fireEvent, waitFor } from '@testing-library/react-native'

import { useConfig } from '@components'

jest.mock('../../../providers/StoreUtil', () => ({
  _retrieveStoreData: jest.fn().mockResolvedValue(null),
  _setStoreData: jest.fn(),
  _removeStoreData: jest.fn()
}))

jest.mock('@ui', () => {
  const { pickUi } = require('../../../../../../jest/helpers/uiModuleMocks')
  const { buildD3OrdersIntegrationUiMock } = require('../../../../../../jest/helpers/d3OrdersUiMock')
  return pickUi({ ...buildD3OrdersIntegrationUiMock(), NewOrderNotification: () => null }, ['NotificationSetting', 'WebsocketStatus', 'useOfflineActions', 'ReviewCustomer'])
})

// What the tab does when the app has to catch up: the provider's own suite covers when it is told.
let mockReconnect: (() => void) | undefined
jest.mock('../../../../../context/SocketReconnectContext', () => ({
  useOnReconnect: (handler: () => void) => { mockReconnect = handler }
}))

jest.mock('@components', () => {
  const { getMock } = require('../../../../../../jest/helpers/d3OrdersComponentsMock')
  return getMock()
})

import { OrdersOption } from '..'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { offlineActionsState } from '../../../../../../jest/helpers/d3OrdersUiMock'
import { groupedOrdersGroup, ordersGroupOf, sampleOrder } from '../../../../../../jest/helpers/d3OrdersDefaults'

const SYNCED = 'offline_order_updated'

/** The bus the screen listens on: the handlers it registered for an event, and how many times it subscribed. */
const bus = (event: string) => {
  const { useEvent } = require('@components')
  const [events] = useEvent()
  const handlers = () => events.on.mock.calls.filter((call: any[]) => call[0] === event).map((call: any[]) => call[1])
  return {
    events,
    handlers,
    handler: () => handlers()[handlers().length - 1],
    // Every listener of the event hears it (the cards listen to this one too): what the emitter would do.
    emit: (...args: any[]) => handlers().forEach((listener: any) => listener(...args)),
    subscribed: () => handlers().length
  }
}

/** A load or a change that ends when the test says so. */
const pending = () => {
  let finish!: (value?: any) => void
  const fn = jest.fn(() => new Promise<any>((resolve) => { finish = resolve }))
  return { fn, finish: (value?: any) => finish(value) }
}

/** A change the queue holds for an order. */
const queued = (orderId: number, body: any) => ({ event: 'evt_off_change_order_status', data: { orderId, body: { id: orderId, ...body } } })

const loadingGroup = (extra: Record<string, any> = {}) => ({
  pending: { orders: [{ ...sampleOrder, unsync: true }], loading: true, defaultFilter: [0], currentFilter: [0], pagination: { currentPage: 1, pageSize: 10, totalPages: 1, total: 1 }, ...extra },
  inProgress: { orders: [], loading: false, defaultFilter: [3], currentFilter: [3], pagination: { currentPage: 1, pageSize: 10, totalPages: 1, total: 0 } },
  completed: { orders: [], loading: false, defaultFilter: [1], currentFilter: [1], pagination: { currentPage: 1, pageSize: 10, totalPages: 1, total: 0 } },
  cancelled: { orders: [], loading: false, defaultFilter: [2], currentFilter: [2], pagination: { currentPage: 1, pageSize: 10, totalPages: 1, total: 0 } }
})

describe('OrdersOption: the lists after the offline queue synced, and offline', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    const { _retrieveStoreData } = require('../../../providers/StoreUtil')
    _retrieveStoreData.mockReset().mockResolvedValue(null)
    offlineActionsState.isNetConnected = true
    offlineActionsState.canSaveChangesOffline = false
    offlineActionsState.isCombinedTabs = false
    offlineActionsState.actions = {}
    offlineActionsState.orders = null
    mockReconnect = undefined
    ;(useConfig as jest.Mock).mockReturnValue([{ configs: { disable_delivery_priority: { value: '1' } } }])
  })

  describe('D1: after the queue sent its changes the orders load again, once, with no refresh', () => {
    it('loads the orders once through the same load as the refresh button, however many orders the run carried', async () => {
      const loadOrders = jest.fn()
      renderWithProviders(<OrdersOption isDriverApp loadOrders={loadOrders} />)
      loadOrders.mockClear()
      await act(async () => { bus(SYNCED).emit([101, 102, 103]) })
      expect(loadOrders).toHaveBeenCalledTimes(1)
      expect(loadOrders).toHaveBeenCalledWith({ newFetch: true }, { allStatusses: false })
    })

    it('a search applied is loaded again, not the tabs', async () => {
      const loadOrders = jest.fn()
      const screen = renderWithProviders(
        <OrdersOption isDriverApp loadOrders={loadOrders} ordersFiltered={{ orders: [], loading: false, error: null, pagination: { total: 0 } }} />
      )
      fireEvent.press(screen.getByLabelText('Search orders'))
      fireEvent.changeText(screen.getByPlaceholderText('Order number'), '3460')
      fireEvent.press(screen.getByText('Search'))
      loadOrders.mockClear()
      await act(async () => { bus(SYNCED).emit([101]) })
      expect(loadOrders).toHaveBeenCalledWith({ newFetch: true }, { allStatusses: true })
    })

    it('goes through the reload queue: asked while a load runs, it is one load more, after it', async () => {
      const first = pending()
      const loadOrders = jest.fn(() => (loadOrders.mock.calls.length === 1 ? first.fn() : Promise.resolve()))
      const screen = renderWithProviders(<OrdersOption isDriverApp loadOrders={loadOrders} />)
      fireEvent.press(screen.getByLabelText('Refresh'))
      await act(async () => { bus(SYNCED).emit([101]) })
      await act(async () => { bus(SYNCED).emit([102]) })
      expect(loadOrders).toHaveBeenCalledTimes(1)
      await act(async () => { first.finish() })
      await waitFor(() => expect(loadOrders).toHaveBeenCalledTimes(2))
    })

    it('waits behind a change of the driver\'s own that is on its way', async () => {
      const change = pending()
      const loadOrders = jest.fn()
      const handleChangeOrderStatus = jest.fn(() => change.fn())
      const onNavigationRedirect = jest.fn()
      const screen = renderWithProviders(
        <OrdersOption
          isDriverApp
          loadOrders={loadOrders}
          handleChangeOrderStatus={handleChangeOrderStatus}
          onNavigationRedirect={onNavigationRedirect}
          ordersGroup={groupedOrdersGroup([{ ...sampleOrder, status: 0 }])}
        />
      )
      fireEvent.press(screen.getAllByLabelText(/^Group No\./)[0])
      fireEvent.press(screen.getByText('Reject all'))
      const { handleChangeOrderStatus: sent } = onNavigationRedirect.mock.calls[0][1]
      let done!: Promise<any>
      act(() => { done = sent(6, [1, 2]) })
      loadOrders.mockClear()
      await act(async () => { bus(SYNCED).emit([101]) })
      expect(loadOrders).not.toHaveBeenCalled()
      await act(async () => { change.finish([{ id: 1 }, { id: 2 }]); await done })
      // The change's own load and the sync's are one load.
      await waitFor(() => expect(loadOrders).toHaveBeenCalledTimes(1))
    })

    it('a screen that still thinks it is offline when the run ends loads once the connection is its own', async () => {
      const loadOrders = jest.fn()
      const screen = renderWithProviders(<OrdersOption isDriverApp isNetConnected={false} loadOrders={loadOrders} />)
      await act(async () => { bus(SYNCED).emit([101]) })
      expect(loadOrders).not.toHaveBeenCalled()
      screen.rerender(<OrdersOption isDriverApp isNetConnected loadOrders={loadOrders} />)
      await waitFor(() => expect(loadOrders).toHaveBeenCalledTimes(1))
      // Asked once, not again at the next render.
      screen.rerender(<OrdersOption isDriverApp isNetConnected loadOrders={loadOrders} />)
      expect(loadOrders).toHaveBeenCalledTimes(1)
    })

    it('listens once for the life of the screen', () => {
      const screen = renderWithProviders(<OrdersOption isDriverApp loadOrders={jest.fn()} />)
      const { events, subscribed, handlers } = bus(SYNCED)
      const registered = [...handlers()]
      const before = subscribed()
      expect(before).toBeGreaterThan(0)
      screen.rerender(<OrdersOption isDriverApp loadOrders={jest.fn()} />)
      expect(subscribed()).toBe(before)
      screen.unmount()
      registered.forEach((listener: any) => expect(events.off).toHaveBeenCalledWith(SYNCED, listener))
    })
  })

  describe('D2: offline, no path asks for a load, and the list is not a skeleton', () => {
    describe('no reload path loads without a connection', () => {
      it('the pull to refresh', () => {
        const loadOrders = jest.fn()
        const screen = renderWithProviders(<OrdersOption isDriverApp isNetConnected={false} loadOrders={loadOrders} />)
        const list = screen.UNSAFE_getAllByType(ScrollView).find((node: any) => node.props.refreshControl)!
        list.props.refreshControl.props.onRefresh()
        expect(loadOrders).not.toHaveBeenCalled()
      })

      it('the reconnect catch-up', () => {
        const loadOrders = jest.fn()
        const loadLogisticOrders = jest.fn()
        renderWithProviders(<OrdersOption isDriverApp isNetConnected={false} isLogisticActivated loadOrders={loadOrders} loadLogisticOrders={loadLogisticOrders} />)
        mockReconnect!()
        expect(loadOrders).not.toHaveBeenCalled()
        expect(loadLogisticOrders).not.toHaveBeenCalled()
      })

      it('the screen coming into focus, on the requests', () => {
        const loadLogisticOrders = jest.fn()
        const navigation = { navigate: jest.fn(), addListener: jest.fn(() => jest.fn()) }
        renderWithProviders(
          <OrdersOption isDriverApp isNetConnected={false} isLogisticActivated currentTabSelected='logisticOrders' navigation={navigation} loadLogisticOrders={loadLogisticOrders} />
        )
        const focus = (navigation.addListener.mock.calls as any[]).find((call) => call[0] === 'focus')![1]
        focus()
        expect(loadLogisticOrders).not.toHaveBeenCalled()
      })

      it('the focus does load them with a connection (the control of the test above)', () => {
        const loadLogisticOrders = jest.fn()
        const navigation = { navigate: jest.fn(), addListener: jest.fn(() => jest.fn()) }
        renderWithProviders(
          <OrdersOption isDriverApp isLogisticActivated currentTabSelected='logisticOrders' navigation={navigation} loadLogisticOrders={loadLogisticOrders} />
        )
        ;(navigation.addListener.mock.calls as any[]).find((call) => call[0] === 'focus')![1]()
        expect(loadLogisticOrders).toHaveBeenCalledTimes(1)
      })

      it('the new-order alert\'s request for the requests tab', () => {
        const loadLogisticOrders = jest.fn()
        const navigation = { navigate: jest.fn(), addListener: jest.fn(() => jest.fn()), setParams: jest.fn() }
        renderWithProviders(
          <OrdersOption
            isDriverApp
            isNetConnected={false}
            isLogisticActivated
            currentTabSelected='logisticOrders'
            navigation={navigation}
            tabRequest={{ at: 1, show: 'requests' }}
            loadLogisticOrders={loadLogisticOrders}
          />
        )
        expect(loadLogisticOrders).not.toHaveBeenCalled()
      })

      it('the change of a delivery position', async () => {
        const loadOrders = jest.fn()
        const screen = renderWithProviders(<OrdersOption isDriverApp isNetConnected={false} loadOrders={loadOrders} />)
        loadOrders.mockClear()
        await act(async () => { bus('delivery_position_updated').handler()() })
        expect(loadOrders).not.toHaveBeenCalled()
        screen.rerender(<OrdersOption isDriverApp isNetConnected loadOrders={loadOrders} />)
        await act(async () => { bus('delivery_position_updated').handler()() })
        expect(loadOrders).toHaveBeenCalledTimes(1)
      })

      it('a change made on another screen', async () => {
        const loadOrders = jest.fn()
        renderWithProviders(<OrdersOption isDriverApp isNetConnected={false} loadOrders={loadOrders} />)
        await act(async () => { bus('driver_order_changed').handler()({ orderIds: [101] }) })
        expect(loadOrders).not.toHaveBeenCalled()
      })

      it('the load after a change of the list\'s own that ended offline (the request was answered as the connection went)', async () => {
        offlineActionsState.isNetConnected = false
        offlineActionsState.canSaveChangesOffline = true
        const loadOrders = jest.fn()
        const onNavigationRedirect = jest.fn()
        const screen = renderWithProviders(
          <OrdersOption
            isDriverApp
            isNetConnected={false}
            loadOrders={loadOrders}
            handleChangeOrderStatus={jest.fn().mockResolvedValue([{ id: 1 }, { id: 2 }])}
            onNavigationRedirect={onNavigationRedirect}
            ordersGroup={groupedOrdersGroup([{ ...sampleOrder, status: 0 }])}
          />
        )
        fireEvent.press(screen.getAllByLabelText(/^Group No\./)[0])
        fireEvent.press(screen.getByText('Reject all'))
        const { handleChangeOrderStatus: sent } = onNavigationRedirect.mock.calls[0][1]
        await act(async () => { await sent(6, [1, 2]) })
        expect(loadOrders).not.toHaveBeenCalled()
      })

      it('a load that waited behind another does not run when the connection went meanwhile', async () => {
        const first = pending()
        const loadOrders = jest.fn(() => first.fn())
        const screen = renderWithProviders(<OrdersOption isDriverApp loadOrders={loadOrders} />)
        fireEvent.press(screen.getByLabelText('Refresh'))
        fireEvent.press(screen.getByLabelText('Refresh'))
        expect(loadOrders).toHaveBeenCalledTimes(1)
        screen.rerender(<OrdersOption isDriverApp isNetConnected={false} loadOrders={loadOrders} />)
        await act(async () => { first.finish() })
        expect(loadOrders).toHaveBeenCalledTimes(1)
      })
    })

    describe('the list is what the store keeps, with the queued change on its row', () => {
      beforeEach(() => {
        offlineActionsState.isNetConnected = false
        offlineActionsState.canSaveChangesOffline = true
      })

      it('a list left loading by a load that never answered is not a skeleton: its rows are drawn, the queued one marked', async () => {
        offlineActionsState.actions = { 101: [queued(101, { status: 8 })] }
        const screen = renderWithProviders(
          <OrdersOption
            isDriverApp
            isNetConnected={false}
            // The queue holds the accept (status 8): the order is In Progress, in whichever of the controller's lists it was stored.
            currentTabSelected='inProgress'
            ordersGroup={loadingGroup()}
          />
        )
        await waitFor(() => expect(screen.queryByTestId('order-list-skeleton')).toBeNull(), { timeout: 5000 })
        expect(screen.getByText('Store A')).toBeTruthy()
        expect(screen.getByTestId('order-card-unsync')).toBeTruthy()
      })

      it('the same list with a connection and nothing to show is still a skeleton while it loads', () => {
        offlineActionsState.isNetConnected = true
        const screen = renderWithProviders(<OrdersOption isDriverApp ordersGroup={loadingGroup({ orders: [] })} />)
        expect(screen.getByTestId('order-list-skeleton')).toBeTruthy()
      })

      it('the same list with a connection and rows keeps its rows while it loads (the skeleton is for a list with nothing yet)', () => {
        offlineActionsState.isNetConnected = true
        const screen = renderWithProviders(<OrdersOption isDriverApp ordersGroup={loadingGroup()} />)
        expect(screen.queryByTestId('order-list-skeleton')).toBeNull()
        expect(screen.getByText('Store A')).toBeTruthy()
      })

      it('the requests loading on another tab do not hold the orders in a skeleton', async () => {
        const screen = renderWithProviders(
          <OrdersOption
            isDriverApp
            isNetConnected={false}
            logisticOrders={{ loading: true, orders: [], error: null }}
          />
        )
        await waitFor(() => expect(screen.queryByTestId('order-list-skeleton')).toBeNull(), { timeout: 5000 })
        expect(screen.getByText('Store A')).toBeTruthy()
      })

      it('with nothing to show it says the network error, never a skeleton for good', async () => {
        offlineActionsState.canSaveChangesOffline = false
        const screen = renderWithProviders(
          <OrdersOption isDriverApp isNetConnected={false} ordersGroup={loadingGroup({ orders: [] })} />
        )
        expect(await screen.findByText('Network Error')).toBeTruthy()
        expect(screen.queryByTestId('order-list-skeleton')).toBeNull()
      })

      it('the skeleton ends when the store cannot be read', async () => {
        const { _retrieveStoreData } = require('../../../providers/StoreUtil')
        _retrieveStoreData.mockRejectedValueOnce(new Error('storage failed'))
        const screen = renderWithProviders(<OrdersOption isDriverApp isNetConnected={false} />)
        await waitFor(() => expect(screen.queryByTestId('order-list-skeleton')).toBeNull(), { timeout: 5000 })
      })

      it('gives the lists the stored orders again when a load left them loading or failed, ending both', async () => {
        const stored = { ...sampleOrder, id: 101, status: 8, oldStatus: 4, unsync: true }
        offlineActionsState.orders = { pending: [], inProgress: [stored] }
        const setOrdersGroup = jest.fn()
        renderWithProviders(
          <OrdersOption
            isDriverApp
            isNetConnected={false}
            setOrdersGroup={setOrdersGroup}
            ordersGroup={loadingGroup({ error: ['Network request failed'] })}
          />
        )
        await waitFor(() => expect(setOrdersGroup).toHaveBeenCalled())
        // It writes through a function of the controller's state: a load that ended meanwhile cannot be what is kept.
        const update = setOrdersGroup.mock.calls[0][0]
        expect(typeof update).toBe('function')
        const written = update(loadingGroup({ error: ['Network request failed'] }))
        expect(written.inProgress.orders).toEqual([stored])
        expect(written.pending.orders).toEqual([])
        for (const status of ['pending', 'inProgress', 'completed', 'cancelled']) {
          expect(written[status].loading).toBe(false)
          expect(written[status].error).toBeNull()
        }
      })

      it('does not touch the lists when nothing disturbed them', async () => {
        const setOrdersGroup = jest.fn()
        offlineActionsState.orders = null
        renderWithProviders(
          <OrdersOption
            isDriverApp
            isNetConnected={false}
            setOrdersGroup={setOrdersGroup}
            ordersGroup={loadingGroup({ loading: false })}
          />
        )
        await act(async () => {})
        // The run into the offline list reads the store (empty here: the lists' own orders are kept), and no second one follows.
        expect(setOrdersGroup.mock.calls.length).toBeLessThanOrEqual(1)
      })
    })

  describe('D4: an order the queue holds a change for shows it, in a group as out of one', () => {
    const base = { ...sampleOrder, delivery_type: 1, cart_group_id: 57 }
    let held: any

    /** The orders screen with a state of its own for the lists, as the controller keeps it: what the screen writes is what it draws. */
    const Harness = ({ initial }: { initial: any }) => {
      const [group, setGroup] = React.useState(initial)
      held = group
      return (
        <OrdersOption
          isDriverApp
          isNetConnected={false}
          currentTabSelected='inProgress'
          ordersGroup={group}
          setOrdersGroup={setGroup}
          orderDetailsProps={{ appTitle: { text: 'Delivery app' }, actions: {}, orderTitle: {} }}
          handleChangeOrderStatus={jest.fn()}
        />
      )
    }
    const tab = (orders: any[]) => ({ loading: false, error: null, defaultFilter: [], currentFilter: [], orders, pagination: { currentPage: 1, pageSize: 10, totalPages: 1, total: orders.length } })
    const lists = (inProgress: any[], pending: any[] = []) => ({ pending: tab(pending), inProgress: tab(inProgress), completed: tab([]), cancelled: tab([]) })
    const o101 = { ...base, id: 101, status: 8, unsync: true, oldStatus: 4 }
    const o102 = { ...base, id: 102, status: 8 }

    beforeEach(() => {
      offlineActionsState.isNetConnected = false
      offlineActionsState.canSaveChangesOffline = true
      ;(useConfig as jest.Mock).mockReturnValue([{
        configs: { disable_delivery_priority: { value: '1' }, failed_pickup_by_driver_enabled: { value: '1' }, order_not_ready_enabled: { value: '1' } }
      }])
    })

    it('the group\'s rows show the queued stage and the mark at once, and the group offers the next step, not the same one', async () => {
      // 101 had been accepted offline before (its status 8 is queued); the group's step is queued for both.
      offlineActionsState.actions = {
        101: [queued(101, { status: 8 }), queued(101, { status: 3 })],
        102: [queued(102, { status: 3 })]
      }
      const screen = renderWithProviders(<Harness initial={lists([o101, o102])} />)
      fireEvent.press(await screen.findByLabelText('Group No. 57'))
      await waitFor(() => expect(screen.getAllByText('Driver in business')).toHaveLength(2), { timeout: 5000 })
      expect(screen.queryByText('Accepted by driver')).toBeNull()
      // Both rows are marked, the one that had a change before and the one that did not.
      expect(screen.getAllByTestId('order-card-unsync')).toHaveLength(2)
      // The group's own buttons follow the stage (at the store: pickup), "Arrived to business" is not offered again.
      expect(screen.queryByText('Arrived to business')).toBeNull()
      expect(screen.getByText('Pickup complete')).toBeTruthy()
      // The first status the order had stays, the shown one is the last.
      expect(held.inProgress.orders.find((order: any) => order.id === 101)).toEqual(expect.objectContaining({ status: 3, oldStatus: 4, unsync: true }))
    })

    it('does it when the group was stored as the list draws it (the orders are inside it, not found by their id)', async () => {
      offlineActionsState.actions = { 101: [queued(101, { status: 3 })], 102: [queued(102, { status: 3 })] }
      const screen = renderWithProviders(<Harness initial={lists([[['57', [{ ...o101, unsync: false }, o102]]]])} />)
      fireEvent.press(await screen.findByLabelText('Group No. 57'))
      await waitFor(() => expect(screen.getAllByText('Driver in business')).toHaveLength(2), { timeout: 5000 })
      expect(held.inProgress.orders.every((order: any) => !Array.isArray(order))).toBe(true)
    })

    it('an order queued as accepted leaves Pending for In progress with the position the driver chose', async () => {
      offlineActionsState.actions = { 103: [queued(103, { status: 8, delivered_in: 30, delivery_position: 2 })] }
      const pendingOrder = { ...base, id: 103, status: 0, cart_group_id: undefined }
      renderWithProviders(<Harness initial={lists([], [pendingOrder])} />)
      await waitFor(() => expect(held.inProgress.orders.some((order: any) => order.id === 103)).toBe(true), { timeout: 5000 })
      expect(held.pending.orders).toEqual([])
      expect(held.inProgress.orders[0]).toEqual(expect.objectContaining({ id: 103, status: 8, delivery_position: 2, unsync: true }))
    })

    it('the lists the store holds nothing for keep their rows when only another list was registered (an order accepted offline), and are kept for the offline list', async () => {
      const { _setStoreData } = require('../../../providers/StoreUtil')
      const offered = { ...base, id: 103, status: 0, cart_group_id: undefined }
      offlineActionsState.orders = { inProgress: [o102] }
      renderWithProviders(<Harness initial={lists([], [offered])} />)
      await waitFor(() => expect(held.inProgress.orders.map((order: any) => order.id)).toEqual([102]), { timeout: 5000 })
      // Assigned's offered order is not taken from it by a store that only knows the list the accepted one went to.
      expect(held.pending.orders.map((order: any) => order.id)).toEqual([103])
      expect(_setStoreData).toHaveBeenCalledWith('pending_orders', [offered])
    })

    it('a stored list that is empty because the queue emptied it stays empty over the rows it had', async () => {
      offlineActionsState.orders = { pending: [], inProgress: [{ ...o102, id: 103 }] }
      renderWithProviders(<Harness initial={lists([], [{ ...base, id: 103, status: 0, cart_group_id: undefined }])} />)
      await waitFor(() => expect(held.inProgress.orders.map((order: any) => order.id)).toEqual([103]), { timeout: 5000 })
      expect(held.pending.orders).toEqual([])
    })

    it('draws the lists again when the queue gets a change after the list was shown', async () => {
      offlineActionsState.actions = {}
      const screen = renderWithProviders(<Harness initial={lists([o101, o102].map((order) => ({ ...order, unsync: false })))} />)
      await act(async () => {})
      expect(screen.queryByText('Driver in business')).toBeNull()
      offlineActionsState.actions = { 101: [queued(101, { status: 3 })], 102: [queued(102, { status: 3 })] }
      screen.rerender(<Harness initial={lists([])} />)
      await waitFor(() => expect(held.inProgress.orders.every((order: any) => order.status === 3)).toBe(true), { timeout: 5000 })
    })
  })

  describe('the pending sync banner follows the queue, online too', () => {
    it('online with changes still queued (retrying): the count alone, no "Last update", not the offline color', async () => {
      offlineActionsState.actions = { 101: [queued(101, { status: 3 })], 102: [queued(102, { status: 3 })] }
      const screen = renderWithProviders(<OrdersOption isDriverApp />)
      expect(await screen.findByText('2 changes pending sync')).toBeTruthy()
      expect(screen.getByTestId('orders-sync-pending')).toBeTruthy()
      expect(screen.queryByTestId('orders-offline')).toBeNull()
      expect(screen.queryByText(/Last Update/)).toBeNull()
    })

    it('goes when the queue empties', async () => {
      offlineActionsState.actions = { 101: [queued(101, { status: 3 })] }
      const screen = renderWithProviders(<OrdersOption isDriverApp />)
      expect(await screen.findByText('1 changes pending sync')).toBeTruthy()
      offlineActionsState.actions = {}
      screen.rerender(<OrdersOption isDriverApp />)
      expect(screen.queryByText(/changes pending sync/)).toBeNull()
      expect(screen.queryByTestId('orders-sync-pending')).toBeNull()
    })

    it('shows nothing online with an empty queue, and an order with an empty list of changes is not a change', () => {
      offlineActionsState.actions = { 101: [] }
      const screen = renderWithProviders(<OrdersOption isDriverApp />)
      expect(screen.queryByText(/changes pending sync/)).toBeNull()
    })

    it('offline keeps its banner, the last update and the count', async () => {
      const { _retrieveStoreData } = require('../../../providers/StoreUtil')
      _retrieveStoreData.mockImplementation((key: string) => Promise.resolve(key === 'last_date_connection' ? '2026-01-01 10:00:00' : null))
      offlineActionsState.isNetConnected = false
      offlineActionsState.actions = { 101: [queued(101, { status: 3 })] }
      const screen = renderWithProviders(<OrdersOption isDriverApp isNetConnected={false} />)
      expect(await screen.findByTestId('orders-offline')).toBeTruthy()
      expect(screen.getByText(/Last Update/)).toBeTruthy()
      expect(screen.getByText('1 changes pending sync')).toBeTruthy()
      expect(screen.queryByTestId('orders-sync-pending')).toBeNull()
    })

    it('a queued change that waits keeps its stage on the card online, over what the list loaded', async () => {
      offlineActionsState.actions = { 101: [queued(101, { status: 3 })] }
      // The order was loaded in Pending (status 0); its queued stage (3) is what it is: In Progress, at the store.
      const screen = renderWithProviders(<OrdersOption isDriverApp currentTabSelected='inProgress' />)
      expect(await screen.findByText('Driver in business')).toBeTruthy()
      expect(screen.queryByText('Accepted by driver')).toBeNull()
    })
  })
  })
})
