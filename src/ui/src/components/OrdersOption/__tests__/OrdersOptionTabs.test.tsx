import '../../../../../../jest/helpers/uiModuleMocks'
import React from 'react'
import { act, fireEvent, waitFor, within } from '@testing-library/react-native'

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
import { createFakeController, createServer } from '../../../../../../jest/helpers/fakeOrderListGroups'
import { sampleOrder } from '../../../../../../jest/helpers/d3OrdersDefaults'

const CHANGED = 'driver_order_changed'
const COMBINE = 'combine_pending_and_progress_orders'

const order = (id: number, status: number, extra: any = {}) => ({ ...sampleOrder, id, status, delivery_type: 1, ...extra })
/** An order at 4 (ready for pickup) the driver has accepted: his stage (8) is after the assignment. */
const acceptedAt4 = (id: number) => order(id, 4, {
  last_driver_assigned_at: '2026-11-23 09:00:00',
  reporting_data: { at: { 'status:8': '2026-11-23T10:00:00.000Z' } }
})
const endedAt = (id: number, status: number, at: string) => order(id, status, { reporting_data: { at: { [`status:${status}`]: at } } })

/** The bus the screen listens on: what it registered for an event. */
const emit = (event: string, ...args: any[]) => {
  const { useEvent } = require('@components')
  const [events] = useEvent()
  events.on.mock.calls.filter((call: any[]) => call[0] === event).forEach((call: any[]) => call[1](...args))
}

const tabNamed = (screen: any, name: string) => screen.queryAllByRole('tab').find((tab: any) => within(tab).queryByText(name))
const tabNames = (screen: any) => screen.queryAllByRole('tab').map((tab: any) => within(tab).getAllByText(/.+/)[0].props.children)
/** The tab the screen is on. */
const selectedTab = (screen: any) => ['Assigned', 'In Progress', 'Active', 'History'].find((name) => tabNamed(screen, name)?.props.accessibilityState.selected)
/** The orders the list draws, by id, in the order it draws them. */
const shown = (screen: any) => screen.queryAllByTestId(/^order-card-\d+$/).map((node: any) => Number(String(node.props.testID).split('-')[2]))

/** The loads of the fake controller go one after another: a few turns of the event loop let a whole sequence end. */
const settle = async () => {
  for (let turn = 0; turn < 14; turn++) await act(async () => {})
}

let restore: Array<() => void> = []

/** The screen over a controller that behaves as the real one, on a server holding `orders`. */
const start = async (orders: any[], props: any = {}, pageSize = 10) => {
  const server = createServer(orders, pageSize)
  const handle: any = {}
  const spy = jest.spyOn(require('@components'), 'OrderListGroups').mockImplementation(createFakeController(server, handle))
  restore.push(() => spy.mockRestore())
  const screen = renderWithProviders(<OrdersOption isDriverApp {...props} />)
  await settle()
  return { server, handle, screen }
}

describe('OrdersOption: Assigned, In Progress and History', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    offlineActionsState.isNetConnected = true
    offlineActionsState.isCombinedTabs = false
    offlineActionsState.combinedTabsRead = true
    offlineActionsState.actions = {}
    offlineActionsState.orders = null
    offlineActionsState.canSaveChangesOffline = false
    require('../../../providers/StoreUtil')._retrieveStoreData.mockReset().mockResolvedValue(null)
    mockReconnect = undefined
    ;(useConfig as jest.Mock).mockReturnValue([{ configs: { disable_delivery_priority: { value: '1' } } }])
  })
  afterEach(() => {
    restore.forEach((undo) => undo())
    restore = []
  })

  describe('the tabs', () => {
    it('are Assigned, In Progress and History from the first render, with Assigned selected', async () => {
      const screen = renderWithProviders(<OrdersOption isDriverApp />)
      expect(tabNames(screen)).toEqual(['Assigned', 'In Progress', 'History'])
      expect(selectedTab(screen)).toBe('Assigned')
      await settle()
    })

    it('are Active and History for a project that combines pending and in progress', async () => {
      ;(useConfig as jest.Mock).mockReturnValue([{ configs: { [COMBINE]: { key: COMBINE, value: '1' } } }])
      const screen = renderWithProviders(<OrdersOption isDriverApp />)
      expect(tabNames(screen)).toEqual(['Active', 'History'])
      expect(selectedTab(screen)).toBe('Active')
      await settle()
    })

    it('open on Assigned (Active when combined): the controller\'s first list, mapped to the tabs', async () => {
      const { handle, screen } = await start([order(1, 0)])
      expect(selectedTab(screen)).toBe('Assigned')
      expect(handle.state().currentTabSelected).not.toBe('active')
    })
  })

  describe('what each tab requests and shows', () => {
    const orders = [
      order(1, 0), // pending: Assigned
      order(2, 13), // a pre-order: Assigned
      order(3, 4), // ready for pickup, no stage of the driver's own: Assigned
      acceptedAt4(4), // ready for pickup, the driver at 8: In Progress
      order(5, 7), // accepted by business: Assigned
      order(6, 14), // not ready: Assigned
      order(7, 8), // accepted by the driver: In Progress
      order(8, 9), // picked up: In Progress
      order(9, 26), // with the customer: In Progress
      order(10, 4, { last_driver_assigned_at: '2026-11-23 09:00:00', reporting_data: { at: { 'status:3': '2026-11-23T10:00:00.000Z' } } }) // at the store: In Progress
    ]

    it('Assigned asks for the pending list and the in-progress list and holds the orders the driver has not accepted', async () => {
      const { server, screen } = await start(orders)
      expect(server.asked()).toEqual(['pending:1', 'inProgress:1'])
      expect(shown(screen).sort((a: number, b: number) => a - b)).toEqual([1, 2, 3, 5, 6])
    })

    it('In Progress asks for its own list only and holds the ones the driver accepted', async () => {
      const { server, screen } = await start(orders, { currentTabSelected: 'inProgress' })
      expect(server.asked()).toEqual(['inProgress:1'])
      expect(shown(screen).sort((a: number, b: number) => a - b)).toEqual([4, 7, 8, 9, 10])
    })

    it('an order is in one tab only', async () => {
      const { screen } = await start(orders)
      const assigned = shown(screen)
      fireEvent.press(within(tabNamed(screen, 'In Progress')).getByText('In Progress'))
      await settle()
      const inProgress = shown(screen)
      expect(assigned.filter((id: number) => inProgress.includes(id))).toEqual([])
      expect(assigned.length + inProgress.length).toBe(orders.length)
    })

    it('a tab already loaded asks for nothing when it is opened again', async () => {
      const { server, screen } = await start(orders)
      fireEvent.press(within(tabNamed(screen, 'In Progress')).getByText('In Progress'))
      await settle()
      fireEvent.press(within(tabNamed(screen, 'Assigned')).getByText('Assigned'))
      await settle()
      expect(server.asked()).toEqual(['pending:1', 'inProgress:1'])
    })

    it('a combined project\'s Active holds every open order, as it did', async () => {
      ;(useConfig as jest.Mock).mockReturnValue([{ configs: { [COMBINE]: { key: COMBINE, value: '1' } } }])
      const { server, screen } = await start(orders)
      expect(server.asked()).toEqual(['active:1'])
      expect(shown(screen)).toHaveLength(orders.length)
    })
  })

  describe('load more', () => {
    it('on In Progress, with a first page of orders the driver has not accepted, says "Load more orders" and not "no results"; the next page brings his', async () => {
      const offered = [30, 31, 32].map((id) => order(id, 4))
      const mine = [5, 6].map((id) => order(id, 8))
      const { server, screen } = await start([...offered, ...mine], { currentTabSelected: 'inProgress' }, 3)
      expect(shown(screen)).toEqual([])
      expect(screen.queryByText('Sorry, no results found')).toBeNull()
      expect(screen.getByTestId('orders-load-more')).toBeTruthy()
      fireEvent.press(screen.getByTestId('orders-load-more'))
      await settle()
      expect(server.asked()).toEqual(['inProgress:1', 'inProgress:2'])
      expect(shown(screen)).toEqual([6, 5])
      expect(screen.queryByTestId('orders-load-more')).toBeNull()
    })

    it('on Assigned, asks the next page of each list that has one, and each list shows its share', async () => {
      const pending = [20, 21, 22, 23].map((id) => order(id, 0))
      const open = [10, 11, 12].map((id) => order(id, 4)).concat([order(5, 8), order(6, 8)])
      const { server, screen } = await start([...pending, ...open], {}, 3)
      expect(shown(screen).sort((a: number, b: number) => a - b)).toEqual([10, 11, 12, 21, 22, 23])
      fireEvent.press(screen.getByTestId('orders-load-more'))
      await settle()
      expect(server.asked()).toEqual(['pending:1', 'inProgress:1', 'pending:2', 'inProgress:2'])
      expect(shown(screen).sort((a: number, b: number) => a - b)).toEqual([10, 11, 12, 20, 21, 22, 23])
      expect(screen.queryByTestId('orders-load-more')).toBeNull()
    })

    it('with a list that has no more, asks only the one that has', async () => {
      const pending = [20, 21, 22, 23].map((id) => order(id, 0))
      const { server, screen } = await start([...pending, order(10, 4)], {}, 3)
      fireEvent.press(screen.getByTestId('orders-load-more'))
      await settle()
      expect(server.asked()).toEqual(['pending:1', 'inProgress:1', 'pending:2'])
    })

    it('does not ask without a connection', async () => {
      const { server, screen } = await start([20, 21, 22, 23].map((id) => order(id, 0)), {}, 3)
      offlineActionsState.isNetConnected = false
      screen.rerender(<OrdersOption isDriverApp isNetConnected={false} />)
      await settle()
      expect(screen.queryByTestId('orders-load-more')).toBeNull()
      expect(server.asked()).toEqual(['pending:1', 'inProgress:1'])
    })
  })

  describe('History', () => {
    const history = [
      endedAt(1, 11, '2026-11-23T10:00:00.000Z'),
      endedAt(2, 5, '2026-11-23T11:00:00.000Z'),
      endedAt(3, 11, '2026-11-23T09:00:00.000Z'),
      endedAt(4, 2, '2026-11-23T08:00:00.000Z')
    ]
    const openHistory = async (props: any = {}, pageSize = 10, orders: any[] = history) => {
      const started = await start(orders, props, pageSize)
      fireEvent.press(within(tabNamed(started.screen, 'History')).getByText('History'))
      await settle()
      return started
    }

    it('has the chips All, Completed and Cancelled, All selected, as a group whose selected one is announced', async () => {
      const { screen } = await openHistory()
      expect(screen.queryByTestId('orders-history-chips')).toBeTruthy()
      const group = screen.getByTestId('orders-history-chips')
      expect(group.props.accessibilityRole).toBe('radiogroup')
      expect(group.props.accessibilityLabel).toBe('History')
      expect(within(group).getByText('All')).toBeTruthy()
      expect(within(group).getByText('Completed')).toBeTruthy()
      expect(within(group).getByText('Cancelled')).toBeTruthy()
      expect(screen.getByTestId('orders-history-all').props.accessibilityState.selected).toBe(true)
      expect(screen.getByTestId('orders-history-completed').props.accessibilityState.selected).toBe(false)
    })

    it('has no chips on the other tabs', async () => {
      const { screen } = await start(history)
      expect(screen.queryByTestId('orders-history-chips')).toBeNull()
    })

    it('All shows both lists together, the latest ended first (not by id)', async () => {
      const { server, screen } = await openHistory()
      expect(server.asked()).toEqual(['pending:1', 'inProgress:1', 'completed:1', 'cancelled:1'])
      expect(shown(screen)).toEqual([2, 1, 3, 4])
    })

    it('Completed shows what the Completed tab showed, Cancelled what Cancelled showed, and selecting a chip announces it', async () => {
      const { screen } = await openHistory()
      fireEvent.press(screen.getByTestId('orders-history-completed'))
      await settle()
      expect(shown(screen)).toEqual([3, 1])
      expect(screen.getByTestId('orders-history-completed').props.accessibilityState.selected).toBe(true)
      expect(screen.getByTestId('orders-history-all').props.accessibilityState.selected).toBe(false)
      fireEvent.press(screen.getByTestId('orders-history-cancelled'))
      await settle()
      expect(shown(screen)).toEqual([4, 2])
      fireEvent.press(screen.getByTestId('orders-history-all'))
      await settle()
      expect(shown(screen)).toEqual([2, 1, 3, 4])
    })

    it('the chips ask the lists they show and no others, and a list already loaded is not asked again', async () => {
      const { server, screen } = await start(history, { currentTabSelected: 'completed' })
      expect(server.asked()).toEqual(['completed:1'])
      fireEvent.press(screen.getByTestId('orders-history-cancelled'))
      await settle()
      fireEvent.press(screen.getByTestId('orders-history-all'))
      await settle()
      expect(server.asked()).toEqual(['completed:1', 'cancelled:1'])
    })

    it('"Load more" on All loads whatever each list still has; on a chip, only that list', async () => {
      const many = [1, 2, 3, 4].map((id) => endedAt(id, 11, `2026-11-23T0${id}:00:00.000Z`)).concat([5, 6, 7, 8].map((id) => endedAt(id, 5, `2026-11-23T0${id}:30:00.000Z`)))
      const all = await openHistory({}, 3, many)
      expect(shown(all.screen)).toHaveLength(6)
      fireEvent.press(all.screen.getByTestId('orders-load-more'))
      await settle()
      expect(all.server.asked().slice(4)).toEqual(['completed:2', 'cancelled:2'])
      expect(shown(all.screen)).toHaveLength(8)
      all.screen.unmount()

      const chip = await start(many, { currentTabSelected: 'completed' }, 3)
      fireEvent.press(chip.screen.getByTestId('orders-load-more'))
      await settle()
      expect(chip.server.asked()).toEqual(['completed:1', 'completed:2'])
      expect(shown(chip.screen)).toEqual([4, 3, 2, 1])
    })

    it('says what is empty, tab by tab: Assigned, In Progress, History and each of its chips (the general text is for the search and the requests)', async () => {
      const { screen } = await start([])
      expect(screen.getByText('No orders assigned')).toBeTruthy()
      expect(screen.queryByText('Sorry, no results found')).toBeNull()
      fireEvent.press(within(tabNamed(screen, 'In Progress')).getByText('In Progress'))
      await settle()
      expect(screen.getByText('No orders in progress')).toBeTruthy()
      expect(screen.queryByText('Sorry, no results found')).toBeNull()
      expect(screen.queryByText('No orders assigned')).toBeNull()
      fireEvent.press(within(tabNamed(screen, 'History')).getByText('History'))
      await settle()
      expect(screen.getByText('No orders in your history')).toBeTruthy()
      fireEvent.press(screen.getByTestId('orders-history-completed'))
      await settle()
      expect(screen.getByText('No completed orders')).toBeTruthy()
      fireEvent.press(screen.getByTestId('orders-history-cancelled'))
      await settle()
      expect(screen.getByText('No cancelled orders')).toBeTruthy()
      expect(screen.queryByText('Sorry, no results found')).toBeNull()
    })

    it('a project that combines pending and in progress says "No active orders" on its Active tab', async () => {
      ;(useConfig as jest.Mock).mockReturnValue([{ configs: { [COMBINE]: { key: COMBINE, value: '1' } } }])
      const { screen } = await start([], { combineTabs: true })
      expect(selectedTab(screen)).toBe('Active')
      expect(screen.getByText('No active orders')).toBeTruthy()
      expect(screen.queryByText('Sorry, no results found')).toBeNull()
      fireEvent.press(within(tabNamed(screen, 'History')).getByText('History'))
      await settle()
      expect(screen.getByText('No orders in your history')).toBeTruthy()
    })

    it('a search with no match keeps the general text', async () => {
      const { screen } = await start([])
      fireEvent.press(screen.getByLabelText('Search orders'))
      fireEvent.changeText(screen.getByPlaceholderText('Order number'), '999')
      fireEvent.press(screen.getByText('Search'))
      await settle()
      expect(screen.getByText('Sorry, no results found')).toBeTruthy()
      expect(screen.queryByText('No orders assigned')).toBeNull()
      expect(screen.queryByText('No orders in progress')).toBeNull()
    })

    it('draws the skeleton of finished cards (no stop line, no buttons) while a list loads, whichever chip', async () => {
      const screen = renderWithProviders(<OrdersOption isDriverApp currentTabSelected='cancelled' ordersGroup={{
        pending: { orders: [], loading: false, fetched: true, pagination: { currentPage: 1, totalPages: 1, total: 0 } },
        inProgress: { orders: [], loading: false, fetched: true, pagination: { currentPage: 1, totalPages: 1, total: 0 } },
        completed: { orders: [], loading: false, fetched: true, pagination: { currentPage: 1, totalPages: 1, total: 0 } },
        cancelled: { orders: [], loading: true, pagination: { currentPage: 1, totalPages: 1, total: null } }
      }} />)
      expect(screen.getByTestId('order-list-skeleton')).toBeTruthy()
      fireEvent.press(screen.getByTestId('orders-history-all'))
      expect(screen.getByTestId('order-list-skeleton')).toBeTruthy()
    })
  })

  describe('an order the driver changes moves between the tabs with no manual refresh', () => {
    it('an accept from Assigned ends with the order In Progress and Assigned without it (the lists load again, Assigned\'s one after the other)', async () => {
      const { server, handle, screen } = await start([order(101, 4), order(102, 0)])
      expect(shown(screen).sort()).toEqual([101, 102])
      server.orders.find((o: any) => o.id === 101)!.status = 8
      handle.loads.length = 0
      await act(async () => { emit(CHANGED, { orderIds: [101] }) })
      await settle()
      expect(shown(screen)).toEqual([102])
      // The first list loads with the controller's own reload, the second one after it, never two at once.
      expect(handle.loads.map((load: any) => `${load.tab}:${load.newFetch ? 'newFetch' : load.newFetchCurrent ? 'current' : 'more'}`)).toEqual(['pending:newFetch', 'inProgress:current'])
      fireEvent.press(within(tabNamed(screen, 'In Progress')).getByText('In Progress'))
      await settle()
      expect(shown(screen)).toEqual([101])
    })

    it('a step that finishes an order ends with it in History', async () => {
      const { server, screen } = await start([order(101, 26)], { currentTabSelected: 'inProgress' })
      expect(shown(screen)).toEqual([101])
      server.orders[0].status = 11
      await act(async () => { emit(CHANGED, { orderIds: [101] }) })
      await settle()
      expect(shown(screen)).toEqual([])
      fireEvent.press(within(tabNamed(screen, 'History')).getByText('History'))
      await settle()
      expect(shown(screen)).toEqual([101])
    })

    it('the reload keeps the rows of the tab on screen while it loads (no skeleton over them)', async () => {
      const { screen } = await start([order(101, 8)], { currentTabSelected: 'inProgress' })
      await act(async () => { emit(CHANGED, { orderIds: [101] }) })
      expect(screen.queryByTestId('order-list-skeleton')).toBeNull()
      expect(shown(screen)).toEqual([101])
      await settle()
    })

    it('an accept queued offline (or waiting to be sent) moves the order at once, with its mark', async () => {
      const queued = (orderId: number, body: any) => ({ event: 'evt_off_change_order_status', data: { orderId, body: { id: orderId, ...body } } })
      const { screen } = await start([order(101, 4)])
      expect(shown(screen)).toEqual([101])
      offlineActionsState.actions = { 101: [queued(101, { status: 8 })] }
      screen.rerender(<OrdersOption isDriverApp />)
      await settle()
      expect(shown(screen)).toEqual([])
      fireEvent.press(within(tabNamed(screen, 'In Progress')).getByText('In Progress'))
      await settle()
      expect(shown(screen)).toEqual([101])
      expect(screen.getByTestId('order-card-unsync')).toBeTruthy()
    })

    it('offline, the stored lists show an order accepted offline in In Progress, and the one not accepted in Assigned', async () => {
      const { _retrieveStoreData } = require('../../../providers/StoreUtil')
      _retrieveStoreData.mockImplementation((key: string) => {
        if (key === 'allow_save_changes_offline') return Promise.resolve(true)
        return Promise.resolve(null)
      })
      offlineActionsState.isNetConnected = false
      offlineActionsState.canSaveChangesOffline = true
      offlineActionsState.actions = { 101: [{ event: 'evt_off_change_order_status', data: { orderId: 101, body: { id: 101, status: 8 } } }] }
      offlineActionsState.orders = {
        pending: [order(102, 0)],
        inProgress: [order(101, 8, { unsync: true, oldStatus: 4 }), order(103, 4)],
        completed: [],
        cancelled: []
      }
      const { screen } = await start([], { isNetConnected: false })
      await waitFor(() => expect(shown(screen).length).toBeGreaterThan(0), { timeout: 5000 })
      expect(shown(screen).sort()).toEqual([102, 103])
      fireEvent.press(within(tabNamed(screen, 'In Progress')).getByText('In Progress'))
      await settle()
      expect(shown(screen)).toEqual([101])
      expect(screen.getByTestId('order-card-unsync')).toBeTruthy()
    })
  })

  describe('the selected tab changes only when the driver taps a tab, a navigation asks for one, or his tab is gone', () => {
    it('stays after a refresh, a reload asked by another screen, a catch-up and the controller moving its own list', async () => {
      const { handle, screen } = await start([order(1, 0), order(2, 8), endedAt(3, 11, '2026-11-23T10:00:00.000Z')])
      fireEvent.press(within(tabNamed(screen, 'In Progress')).getByText('In Progress'))
      await settle()
      expect(selectedTab(screen)).toBe('In Progress')

      fireEvent.press(screen.getByLabelText('Refresh'))
      await settle()
      expect(selectedTab(screen)).toBe('In Progress')

      await act(async () => { emit(CHANGED, { orderIds: [2] }) })
      await settle()
      expect(selectedTab(screen)).toBe('In Progress')

      await act(async () => { mockReconnect!() })
      await settle()
      expect(selectedTab(screen)).toBe('In Progress')

      // The controller resets the list it works on (its effect on the switch does it, and it opens on Pending): the tab the driver sees
      // does not follow it, and the screen puts the controller back on the list the tab needs.
      act(() => { handle.setTab('pending') })
      await settle()
      expect(selectedTab(screen)).toBe('In Progress')
      expect(handle.state().currentTabSelected).toBe('inProgress')
      act(() => { handle.setTab('completed') })
      await settle()
      expect(selectedTab(screen)).toBe('In Progress')
      expect(shown(screen)).toEqual([2])
    })

    it('stays on History and its chip through a refresh', async () => {
      const { screen } = await start([endedAt(1, 11, '2026-11-23T10:00:00.000Z'), endedAt(2, 5, '2026-11-23T11:00:00.000Z')])
      fireEvent.press(within(tabNamed(screen, 'History')).getByText('History'))
      await settle()
      fireEvent.press(screen.getByTestId('orders-history-cancelled'))
      await settle()
      fireEvent.press(screen.getByLabelText('Refresh'))
      await settle()
      expect(selectedTab(screen)).toBe('History')
      expect(screen.getByTestId('orders-history-cancelled').props.accessibilityState.selected).toBe(true)
      expect(shown(screen)).toEqual([2])
    })

    it('the screen tells the controller its switch once, and the same value never again', async () => {
      const setCombineTabsState = jest.fn()
      const { screen } = await start([order(1, 0)], { setCombineTabsState })
      screen.rerender(<OrdersOption isDriverApp setCombineTabsState={setCombineTabsState} />)
      await settle()
      expect(setCombineTabsState).not.toHaveBeenCalled()
    })

    it('goes to the first tab when the project\'s tabs change and his is gone, and keeps History', async () => {
      const { screen } = await start([order(1, 0), order(2, 8)])
      fireEvent.press(within(tabNamed(screen, 'In Progress')).getByText('In Progress'))
      await settle()
      ;(useConfig as jest.Mock).mockReturnValue([{ configs: { [COMBINE]: { key: COMBINE, value: '1' } } }])
      screen.rerender(<OrdersOption isDriverApp />)
      await settle()
      expect(tabNames(screen)).toEqual(['Active', 'History'])
      expect(selectedTab(screen)).toBe('Active')
      fireEvent.press(within(tabNamed(screen, 'History')).getByText('History'))
      ;(useConfig as jest.Mock).mockReturnValue([{ configs: { [COMBINE]: { key: COMBINE, value: '0' } } }])
      screen.rerender(<OrdersOption isDriverApp />)
      await settle()
      expect(selectedTab(screen)).toBe('History')
    })

    it('a navigation asks for a tab: a new assigned order opens Assigned over In Progress', async () => {
      const navigation = { addListener: jest.fn(() => jest.fn()), setParams: jest.fn() }
      const { screen } = await start([order(1, 0), order(2, 8)], { currentTabSelected: 'inProgress', navigation })
      expect(selectedTab(screen)).toBe('In Progress')
      screen.rerender(<OrdersOption isDriverApp navigation={navigation} tabRequest={{ show: 'orders', status: 4, at: 5 }} />)
      await settle()
      expect(selectedTab(screen)).toBe('Assigned')
      expect(navigation.setParams).toHaveBeenCalledWith({ show: undefined, status: undefined, at: undefined })
      screen.rerender(<OrdersOption isDriverApp navigation={navigation} />)
      await settle()
      expect(selectedTab(screen)).toBe('Assigned')
    })
  })

  describe('the search', () => {
    it('replaces the tabs while it is applied and gives them back on the tab the driver was on', async () => {
      const { screen } = await start([order(1, 0), order(2, 8)])
      fireEvent.press(within(tabNamed(screen, 'In Progress')).getByText('In Progress'))
      await settle()
      fireEvent.press(screen.getByLabelText('Search orders'))
      fireEvent.changeText(screen.getByPlaceholderText('Order number'), '42')
      fireEvent.press(screen.getByText('Search'))
      await settle()
      expect(screen.queryByTestId('orders-tabs')).toBeNull()
      expect(screen.getByTestId('orders-filter-notice')).toBeTruthy()
      fireEvent.press(screen.getByText('Clear filters'))
      await settle()
      expect(selectedTab(screen)).toBe('In Progress')
      expect(shown(screen)).toEqual([2])
    })

    it('loads the results again, not the tabs\' lists, while it is applied', async () => {
      const { server, handle, screen } = await start([order(1, 0)])
      fireEvent.press(screen.getByLabelText('Search orders'))
      fireEvent.changeText(screen.getByPlaceholderText('Order number'), '42')
      fireEvent.press(screen.getByText('Search'))
      await settle()
      server.requests.length = 0
      handle.loads.length = 0
      fireEvent.press(screen.getByLabelText('Refresh'))
      await settle()
      expect(handle.loads.every((load: any) => load.options?.allStatusses === true)).toBe(true)
      expect(handle.loads.length).toBeGreaterThan(0)
    })
  })
})

const queued = (orderId: number, body: any) => ({ event: 'evt_off_change_order_status', data: { orderId, body: { id: orderId, ...body } } })

describe('OrdersOption: what the lists show around the offline queue and a load that never answers', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    offlineActionsState.isNetConnected = true
    offlineActionsState.isCombinedTabs = false
    offlineActionsState.combinedTabsRead = true
    offlineActionsState.actions = {}
    offlineActionsState.orders = null
    offlineActionsState.canSaveChangesOffline = false
    ;(offlineActionsState as any).syncing = false
    require('../../../providers/StoreUtil')._retrieveStoreData.mockReset().mockResolvedValue(null)
    mockReconnect = undefined
    ;(useConfig as jest.Mock).mockReturnValue([{ configs: { disable_delivery_priority: { value: '1' } } }])
  })
  afterEach(() => {
    jest.useRealTimers()
    restore.forEach((undo) => undo())
    restore = []
  })

  it('a load that never answers does not hold the lists: after a sync the order is in In Progress, one reload follows the requests, and Refresh still works', async () => {
    jest.useFakeTimers()
    const { server, screen } = await start([order(101, 4)])
    expect(shown(screen)).toEqual([101])

    // Offline the driver accepted it: the queue holds the change and the order is In Progress at once.
    offlineActionsState.actions = { 101: [queued(101, { status: 8 })] }
    screen.rerender(<OrdersOption isDriverApp />)
    await settle()
    expect(shown(screen)).toEqual([])

    // The connection returns: the catch-up load goes out as the network changes and never answers.
    server.hang = true
    await act(async () => { emit(CHANGED, { orderIds: [101] }) })
    await settle()
    expect(server.requests.length).toBeGreaterThan(2)
    const before = server.requests.length

    // The sync sends its request (the server has it accepted), then tells the screen, then the queue is empty.
    offlineActionsState.syncing = true
    screen.rerender(<OrdersOption isDriverApp />)
    server.orders[0].status = 8
    await act(async () => { emit('offline_order_updated', [101]) })
    offlineActionsState.actions = {}
    offlineActionsState.syncing = false
    screen.rerender(<OrdersOption isDriverApp />)
    await settle()
    // Until the lists have loaded again, the order does not go back to the copy the lists held before it (Assigned, offered).
    expect(shown(screen)).toEqual([])
    fireEvent.press(within(tabNamed(screen, 'In Progress')).getByText('In Progress'))
    await settle()
    expect(shown(screen)).toEqual([101])

    // The load that never answers is not waited for for ever: the reload after the sync goes out, and it is after the sync.
    server.hang = false
    await act(async () => { jest.advanceTimersByTime(21000) })
    await settle()
    expect(server.requests.length).toBeGreaterThan(before)
    expect(server.requests.slice(before).some((request: any) => request.key === 'inProgress')).toBe(true)
    expect(shown(screen)).toEqual([101])
    fireEvent.press(within(tabNamed(screen, 'Assigned')).getByText('Assigned'))
    await settle()
    expect(shown(screen)).toEqual([])
    expect(screen.queryByText('Reject')).toBeNull()

    // And Refresh asks again, as before.
    server.requests.length = 0
    fireEvent.press(screen.getByLabelText('Refresh'))
    await settle()
    expect(server.requests.length).toBeGreaterThan(0)
  })

  it('no list is asked while the queue is sending its changes, and the reload that was waiting goes out when it ends', async () => {
    const { server, screen } = await start([order(101, 4)])
    server.requests.length = 0
    offlineActionsState.syncing = true
    screen.rerender(<OrdersOption isDriverApp />)
    await act(async () => { emit('offline_order_updated', [101]) })
    await act(async () => { mockReconnect!() })
    await settle()
    expect(server.requests).toEqual([])
    server.orders[0].status = 8
    offlineActionsState.syncing = false
    screen.rerender(<OrdersOption isDriverApp />)
    await settle()
    // The reload goes out after the run (the first two requests are its), and the catch-up asked while it ran is at most one more after it.
    expect(server.asked().slice(0, 2)).toEqual(['pending:1', 'inProgress:1'])
    expect(server.requests.length).toBeLessThanOrEqual(4)
  })

  it('what the server\'s list says wins once the lists have reloaded after the sync, whatever stage the queue gave', async () => {
    const { server, screen } = await start([order(101, 4)], { currentTabSelected: 'inProgress' })
    offlineActionsState.actions = { 101: [queued(101, { status: 8 })] }
    screen.rerender(<OrdersOption isDriverApp />)
    await settle()
    expect(shown(screen)).toEqual([101])
    // The server moved it on (the driver is at the store) before the screen reloaded.
    server.orders[0].status = 3
    await act(async () => { emit('offline_order_updated', [101]) })
    offlineActionsState.actions = {}
    screen.rerender(<OrdersOption isDriverApp />)
    await settle()
    expect(shown(screen)).toEqual([101])
    expect(screen.getByText('Driver in business')).toBeTruthy()
    expect(screen.queryByText('Accepted by driver')).toBeNull()
  })

  it('offline with the queue on, a tab with nothing to show says so, and the network error is for no stored list at all', async () => {
    const { screen } = await start([order(101, 4)])
    offlineActionsState.isNetConnected = false
    offlineActionsState.canSaveChangesOffline = true
    offlineActionsState.actions = { 101: [queued(101, { status: 8 })] }
    screen.rerender(<OrdersOption isDriverApp isNetConnected={false} />)
    await settle()
    expect(screen.getByText('No orders assigned')).toBeTruthy()
    expect(screen.queryByText('Network Error')).toBeNull()
    expect(screen.queryByText('Refresh')).toBeNull()
  })

  it('offline with nothing stored at all is still the network error', async () => {
    offlineActionsState.isNetConnected = false
    offlineActionsState.canSaveChangesOffline = true
    const { screen } = await start([], { isNetConnected: false })
    expect(await screen.findByText('Network Error')).toBeTruthy()
  })

  it('History All keeps its skeleton until both lists have answered, then draws them in order (never the first alone)', async () => {
    const history = [endedAt(1, 11, '2026-11-23T10:00:00.000Z'), endedAt(2, 5, '2026-11-23T11:00:00.000Z')]
    const server = createServer(history, 10)
    let open!: () => void
    server.gates.cancelled = new Promise<void>((resolve) => { open = resolve })
    const spy = jest.spyOn(require('@components'), 'OrderListGroups').mockImplementation(createFakeController(server, {}))
    restore.push(() => spy.mockRestore())
    const screen = renderWithProviders(<OrdersOption isDriverApp currentTabSelected='completed' />)
    await settle()
    fireEvent.press(screen.getByTestId('orders-history-all'))
    await settle()
    // The completed list answered, the cancelled one has not: no row yet.
    expect(shown(screen)).toEqual([])
    expect(screen.getByTestId('order-list-skeleton')).toBeTruthy()
    open()
    await settle()
    expect(shown(screen)).toEqual([2, 1])
    expect(screen.queryByTestId('order-list-skeleton')).toBeNull()
  })

  it('History shows an order that left In Progress outside the app, though the in-progress list still holds its old copy', async () => {
    const mine = order(101, 8, { updated_at: '2026-11-23 10:00:00' })
    const { server, screen } = await start([mine], { currentTabSelected: 'inProgress' })
    expect(shown(screen)).toEqual([101])
    // Cancelled elsewhere; the in-progress list is not loaded again, the cancelled one is (opening History).
    server.orders[0].status = 5
    server.orders[0].updated_at = '2026-11-23 11:00:00'
    fireEvent.press(within(tabNamed(screen, 'History')).getByText('History'))
    await settle()
    expect(shown(screen)).toEqual([101])
    fireEvent.press(within(tabNamed(screen, 'In Progress')).getByText('In Progress'))
    await settle()
    expect(shown(screen)).toEqual([])
  })

  it('the controller is never given a list it does not have: only the lists of the project and the requests', async () => {
    const { handle, screen } = await start([order(1, 0), order(2, 8), endedAt(3, 11, '2026-11-23T10:00:00.000Z')])
    const seen = new Set<string>()
    const original = handle.setTab
    for (const name of ['In Progress', 'History', 'Assigned']) {
      fireEvent.press(within(tabNamed(screen, name)).getByText(name))
      await settle()
      seen.add(handle.state().currentTabSelected)
    }
    expect(original).toBeDefined()
    seen.forEach((tab) => expect(['pending', 'inProgress', 'completed', 'cancelled']).toContain(tab))
  })
})
