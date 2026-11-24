import '../../../../../../jest/helpers/uiModuleMocks'
import React from 'react'
import { ScrollView } from 'react-native'
import { act, fireEvent, within } from '@testing-library/react-native'

import { useConfig } from '@components'

/**
 * The orders screen over the REAL `OrderListGroups` controller (its context modules are mocked, the controller is not) and a
 * fake orders API (`fakeOrdering`): what a load that fails for lack of network does to the lists, an app resume without a
 * connection, the reload when the connection returns, and the requests each action sends.
 */

// What the device keeps (AsyncStorage), so what the screen stores offline is what it reads back.
const mockStore = new Map<string, any>()
jest.mock('../../../providers/StoreUtil', () => ({
  _retrieveStoreData: jest.fn((key: string) => Promise.resolve(mockStore.has(key) ? mockStore.get(key) : null)),
  _setStoreData: jest.fn((key: string, value: any) => { mockStore.set(key, value); return Promise.resolve() }),
  _removeStoreData: jest.fn((key: string) => { mockStore.delete(key); return Promise.resolve() })
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

// The controller's own contexts: the API is the fake one of the test.
let mockApi: any
const mockEvents = { on: jest.fn(), off: jest.fn(), emit: jest.fn() }
jest.mock('../../../../../@/components/src/contexts/SessionContext', () => ({ useSession: () => [{ user: { id: 1, level: 4 }, token: 'token' }, {}] }))
jest.mock('../../../../../@/components/src/contexts/ApiContext', () => ({ useApi: () => [mockApi] }))
jest.mock('../../../../../@/components/src/contexts/WebsocketContext', () => ({
  useWebsocket: () => ({ on: jest.fn(), off: jest.fn(), join: jest.fn(), leave: jest.fn(), getId: () => 'socket' })
}))
jest.mock('../../../../../@/components/src/contexts/ToastContext', () => ({
  ToastType: { Error: 'error', Info: 'info', Success: 'success' },
  useToast: () => [{}, { showToast: jest.fn() }]
}))
jest.mock('../../../../../@/components/src/contexts/LanguageContext', () => ({ useLanguage: () => [{}, (_key: string, fallback: string) => fallback] }))
jest.mock('../../../../../@/components/src/contexts/EventContext', () => ({ useEvent: () => [mockEvents] }))
jest.mock('../../../../../@/components/src/contexts/ConfigContext', () => ({ useConfig: () => [{ configs: {} }] }))

jest.mock('@components', () => {
  const { getMock } = require('../../../../../../jest/helpers/d3OrdersComponentsMock')
  return getMock({ OrderListGroups: jest.requireActual('../../../../../@/components/src/components/OrderListGroups').OrderListGroups })
})

import { OrdersOption } from '..'
import { CATCH_UP_COALESCE_MS, RECONNECT_SETTLE_MS } from '../useOrderTabs'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { offlineActionsState } from '../../../../../../jest/helpers/d3OrdersUiMock'
import { createServer } from '../../../../../../jest/helpers/fakeOrderListGroups'
import { createFakeOrdering } from '../../../../../../jest/helpers/fakeOrdering'
import { sampleOrder } from '../../../../../../jest/helpers/d3OrdersDefaults'

const state: any = offlineActionsState
const SYNCED = 'offline_order_updated'

const order = (id: number, status: number, extra: any = {}) => ({ ...sampleOrder, id, status, delivery_type: 1, ...extra })
const endedAt = (id: number, status: number, at: string) => order(id, status, { reporting_data: { at: { [`status:${status}`]: at } } })
const queued = (orderId: number, body: any) => ({ event: 'evt_off_change_order_status', data: { orderId, body: { id: orderId, ...body } } })

const tabNamed = (screen: any, name: string) => screen.queryAllByRole('tab').find((tab: any) => within(tab).queryByText(name))
/** The orders the list draws, by id, sorted. */
const shown = (screen: any) => screen.queryAllByTestId(/^order-card-\d+$/).map((node: any) => Number(String(node.props.testID).split('-')[2])).sort((a: number, b: number) => a - b)

/** The loads go one after another, each answered in a turn of the event loop: a few turns let a whole sequence end. */
const settle = async () => {
  for (let turn = 0; turn < 24; turn++) await act(async () => {})
}
/** Lets the screen's timers (the settle of a connection that came back) run. */
const later = async (ms: number) => {
  await act(async () => { jest.advanceTimersByTime(ms) })
  await settle()
}

/** The screen over the real controller, on a server holding `orders`. */
const start = async (orders: any[], props: any = {}) => {
  const server = createServer(orders, 10)
  mockApi = createFakeOrdering(server)
  const navigation = { navigate: jest.fn(), addListener: jest.fn(() => jest.fn()), setParams: jest.fn() }
  const element = (extra: any = {}) => <OrdersOption isDriverApp navigation={navigation} {...props} {...extra} />
  const screen = renderWithProviders(element())
  await settle()
  /** What the phone's connection says (and what the queue's provider says with it). */
  const connection = async (value: boolean | null) => {
    state.isNetConnected = value
    screen.rerender(element({ isNetConnected: value }))
    await settle()
  }
  return { server, api: mockApi, screen, connection, element }
}

/** Holds the answer of a list's requests until `release()`. */
const hold = (server: any, key: string) => {
  let release!: () => void
  server.gates[key] = new Promise<void>((resolve) => { release = () => { delete server.gates[key]; resolve() } })
  return release
}

beforeEach(() => {
  jest.clearAllMocks()
  jest.useFakeTimers()
  mockStore.clear()
  state.isNetConnected = true
  state.canSaveChangesOffline = true
  state.isCombinedTabs = false
  state.combinedTabsRead = true
  state.syncing = false
  state.actions = {}
  state.orders = null
  mockReconnect = undefined
  ;(useConfig as jest.Mock).mockReturnValue([{ configs: { disable_delivery_priority: { value: '1' } } }])
})
afterEach(() => {
  jest.useRealTimers()
})

/** Two orders offered to the driver (Assigned), one accepted (In Progress). */
const orders = () => [order(1, 0), order(3, 4), order(7, 8)]

describe('OrdersOption over the real controller: a load that fails for lack of network', () => {
  it('a reload cut by the network never takes the rows from Assigned or puts an error over them: the last known rows stay, with the offline banner', async () => {
    const { server, api, screen, connection } = await start(orders())
    expect(shown(screen)).toEqual([1, 3])

    // Refresh: the first list loads, the second one is on its way when the connection goes, and its answer is a network error.
    const release = hold(server, 'inProgress')
    fireEvent.press(screen.getByLabelText('Refresh'))
    await settle()
    api.down = true
    await connection(false)
    release()
    await settle()

    expect(shown(screen)).toEqual([1, 3])
    expect(screen.queryByText('Network Error')).toBeNull()
    expect(screen.queryByText(/ERROR/)).toBeNull()
    expect(screen.queryByText('No orders assigned')).toBeNull()
    expect(screen.getByTestId('orders-offline')).toBeTruthy()
  })

  it('does the same for In Progress, and History keeps its orders', async () => {
    const { server, api, screen, connection } = await start([...orders(), endedAt(11, 11, '2026-11-23T10:00:00.000Z')])
    fireEvent.press(within(tabNamed(screen, 'In Progress')).getByText('In Progress'))
    await settle()
    expect(shown(screen)).toEqual([7])
    fireEvent.press(within(tabNamed(screen, 'History')).getByText('History'))
    await settle()
    expect(shown(screen)).toEqual([11])
    fireEvent.press(within(tabNamed(screen, 'In Progress')).getByText('In Progress'))
    await settle()

    const release = hold(server, 'inProgress')
    fireEvent.press(screen.getByLabelText('Refresh'))
    await settle()
    api.down = true
    await connection(false)
    release()
    await settle()

    expect(shown(screen)).toEqual([7])
    expect(screen.queryByText('Sorry, no results found')).toBeNull()
    fireEvent.press(within(tabNamed(screen, 'History')).getByText('History'))
    await settle()
    expect(shown(screen)).toEqual([11])
    fireEvent.press(within(tabNamed(screen, 'Assigned')).getByText('Assigned'))
    await settle()
    expect(shown(screen)).toEqual([1, 3])
  })

  it('what the screen keeps for the offline list is never an empty list over rows it had: a load wiped one when the connection went', async () => {
    const { server, api, screen, connection } = await start(orders())
    const { _setStoreData } = require('../../../providers/StoreUtil')
    const release = hold(server, 'inProgress')
    fireEvent.press(screen.getByLabelText('Refresh'))
    await settle()
    // The connection goes while the second list is loading again (the controller emptied it when its load started).
    api.down = true
    await connection(false)
    release()
    await settle()

    // (Online the stored lists are cleared with null: that is not a list.)
    const kept = (status: string) => _setStoreData.mock.calls.filter((call: any[]) => call[0] === `${status}_orders` && call[1] !== null).map((call: any[]) => call[1])
    expect(kept('inProgress').length).toBeGreaterThan(0)
    expect(kept('inProgress').every((rows: any) => Array.isArray(rows) && rows.length > 0)).toBe(true)
    expect(shown(screen)).toEqual([1, 3])
  })

  it('an app resume without a connection (the connection reads unknown for a moment) changes nothing and asks for nothing', async () => {
    const { server, api, screen, connection } = await start(orders())
    api.down = true
    await connection(false)
    expect(shown(screen)).toEqual([1, 3])
    server.requests.length = 0

    await connection(null)
    await connection(false)
    await later(RECONNECT_SETTLE_MS * 4)
    expect(shown(screen)).toEqual([1, 3])
    expect(screen.queryByText('Network Error')).toBeNull()
    expect(screen.getByTestId('orders-offline')).toBeTruthy()
    expect(api.asked()).toEqual([])
    // The catch-up of a socket that came back, the focus and the pull do not ask offline either.
    act(() => { mockReconnect!() })
    const list = screen.UNSAFE_getAllByType(ScrollView).find((node: any) => node.props.refreshControl)!
    act(() => { list.props.refreshControl.props.onRefresh() })
    await settle()
    expect(api.asked()).toEqual([])
  })

  it('with a load that failed and no rows ever shown, the network error is still what it says', async () => {
    state.canSaveChangesOffline = false
    const server = createServer([], 10)
    mockApi = createFakeOrdering(server)
    mockApi.down = true
    state.isNetConnected = false
    const screen = renderWithProviders(<OrdersOption isDriverApp isNetConnected={false} navigation={{ navigate: jest.fn(), addListener: jest.fn(() => jest.fn()), setParams: jest.fn() }} />)
    await settle()
    expect(screen.getByText('Network Error')).toBeTruthy()
  })
})

describe('OrdersOption over the real controller: the connection returns', () => {
  const cut = async (ctx: any) => {
    const release = hold(ctx.server, 'inProgress')
    fireEvent.press(ctx.screen.getByLabelText('Refresh'))
    await settle()
    ctx.api.down = true
    await ctx.connection(false)
    release()
    await settle()
  }

  it('reloads the lists once by itself (Assigned\'s two lists, one request each), with no refresh, and draws what the server holds', async () => {
    const ctx = await start(orders())
    await cut(ctx)
    ctx.server.orders.push(order(5, 0))
    ctx.server.requests.length = 0
    ctx.api.down = false
    await ctx.connection(true)
    await later(RECONNECT_SETTLE_MS)
    await later(RECONNECT_SETTLE_MS * 10)
    expect(ctx.api.asked()).toEqual(['pending:1', 'inProgress:1'])
    expect(shown(ctx.screen)).toEqual([1, 3, 5])
    expect(ctx.screen.queryByTestId('orders-offline')).toBeNull()
  })

  it('waits for the connection to hold: one that flaps asks once, after it settled', async () => {
    const ctx = await start(orders())
    await cut(ctx)
    ctx.server.requests.length = 0
    ctx.api.down = false
    await ctx.connection(true)
    await later(RECONNECT_SETTLE_MS / 3)
    ctx.api.down = true
    await ctx.connection(false)
    await later(RECONNECT_SETTLE_MS * 2)
    expect(ctx.api.asked()).toEqual([])
    ctx.api.down = false
    await ctx.connection(true)
    await later(RECONNECT_SETTLE_MS * 10)
    expect(ctx.api.asked()).toEqual(['pending:1', 'inProgress:1'])
  })

  it('a reload that fails again is not retried in a cycle: the rows stay, and nothing more is asked', async () => {
    const ctx = await start(orders())
    await cut(ctx)
    ctx.server.requests.length = 0
    // The phone says it is connected but the API cannot be reached: the reload's requests end as network errors.
    await ctx.connection(true)
    await later(RECONNECT_SETTLE_MS)
    const asked = ctx.api.asked().length
    expect(asked).toBeGreaterThan(0)
    expect(asked).toBeLessThanOrEqual(2)
    await later(120000)
    expect(ctx.api.asked().length).toBe(asked)
    expect(shown(ctx.screen)).toEqual([1, 3])
  })

  it('with changes queued, the lists wait for the queue\'s run and reload once after it (the run\'s own announcement is that reload)', async () => {
    const ctx = await start(orders())
    await cut(ctx)
    state.actions = { 3: [queued(3, { status: 8 })] }
    await ctx.connection(false)
    ctx.server.requests.length = 0
    ctx.api.down = false
    // The provider's run starts as the connection returns.
    state.syncing = true
    await ctx.connection(true)
    await later(RECONNECT_SETTLE_MS * 3)
    expect(ctx.api.asked()).toEqual([])
    ctx.server.orders.find((o: any) => o.id === 3)!.status = 8
    const { useEvent } = require('@components')
    state.actions = {}
    state.syncing = false
    await act(async () => { mockEvents.emit.mockClear(); useEvent()[0].on.mock.calls.filter((call: any[]) => call[0] === SYNCED).forEach((call: any[]) => call[1]([3])) })
    ctx.screen.rerender(ctx.element({ isNetConnected: true }))
    await settle()
    await later(RECONNECT_SETTLE_MS * 10)
    expect(ctx.api.asked()).toEqual(['pending:1', 'inProgress:1'])
    expect(shown(ctx.screen)).toEqual([1])
  })

  it('a run that sent nothing (every change failed) still gets one reload of the lists, after it ended', async () => {
    const ctx = await start(orders())
    await cut(ctx)
    state.actions = { 3: [queued(3, { status: 8 })] }
    await ctx.connection(false)
    ctx.server.requests.length = 0
    ctx.api.down = false
    state.syncing = true
    await ctx.connection(true)
    await later(RECONNECT_SETTLE_MS * 3)
    expect(ctx.api.asked()).toEqual([])
    state.syncing = false
    ctx.screen.rerender(ctx.element({ isNetConnected: true }))
    await settle()
    await later(RECONNECT_SETTLE_MS * 10)
    expect(ctx.api.asked()).toEqual(['pending:1', 'inProgress:1'])
  })
})

describe('OrdersOption over the real controller: one outage, one reload (the phone\'s connection and the socket both announce its end)', () => {
  const cut = async (ctx: any) => {
    ctx.api.down = true
    await ctx.connection(false)
    ctx.server.requests.length = 0
    ctx.api.down = false
  }
  /** The socket's catch-up signal (`useOnReconnect`), as the provider sends it. */
  const socketSignal = async () => {
    await act(async () => { mockReconnect!() })
    await settle()
  }

  it('the phone first, the socket a moment after: the lists reload once', async () => {
    const ctx = await start(orders())
    await cut(ctx)
    await ctx.connection(true)
    await later(RECONNECT_SETTLE_MS)
    expect(ctx.api.asked()).toEqual(['pending:1', 'inProgress:1'])
    // The socket reaches the server some seconds after the network came back.
    await later(2500)
    await socketSignal()
    await later(RECONNECT_SETTLE_MS * 5)
    expect(ctx.api.asked()).toEqual(['pending:1', 'inProgress:1'])
  })

  it('the socket first, the phone\'s settle after: the lists reload once', async () => {
    const ctx = await start(orders())
    await cut(ctx)
    await ctx.connection(true)
    await socketSignal()
    expect(ctx.api.asked()).toEqual(['pending:1', 'inProgress:1'])
    await later(RECONNECT_SETTLE_MS * 5)
    expect(ctx.api.asked()).toEqual(['pending:1', 'inProgress:1'])
  })

  it('the next outage reloads again, once the window of the last one has passed', async () => {
    const ctx = await start(orders())
    await cut(ctx)
    await ctx.connection(true)
    await later(RECONNECT_SETTLE_MS)
    await socketSignal()
    expect(ctx.api.asked()).toEqual(['pending:1', 'inProgress:1'])
    await later(CATCH_UP_COALESCE_MS)
    await cut(ctx)
    await ctx.connection(true)
    await later(RECONNECT_SETTLE_MS)
    await socketSignal()
    expect(ctx.api.asked()).toEqual(['pending:1', 'inProgress:1'])
  })

  it('a socket that comes back with the phone\'s connection up all along reloads once (no outage of the phone)', async () => {
    const ctx = await start(orders())
    ctx.server.requests.length = 0
    await socketSignal()
    expect(ctx.api.asked()).toEqual(['pending:1', 'inProgress:1'])
    await socketSignal()
    expect(ctx.api.asked()).toEqual(['pending:1', 'inProgress:1'])
  })

  it('a socket signal that finds the phone offline reloads nothing and does not use up the reload of the connection that returns', async () => {
    const ctx = await start(orders())
    await cut(ctx)
    ctx.api.down = true
    await socketSignal()
    expect(ctx.api.asked()).toEqual([])
    ctx.api.down = false
    await ctx.connection(true)
    await later(RECONNECT_SETTLE_MS)
    expect(ctx.api.asked()).toEqual(['pending:1', 'inProgress:1'])
  })

  it('while the queue\'s run holds the reload of the returned connection, the socket\'s signal does not reload either', async () => {
    const ctx = await start(orders())
    await cut(ctx)
    state.actions = { 3: [queued(3, { status: 8 })] }
    await ctx.connection(false)
    ctx.server.requests.length = 0
    ctx.api.down = false
    state.syncing = true
    await ctx.connection(true)
    await socketSignal()
    await later(RECONNECT_SETTLE_MS * 3)
    expect(ctx.api.asked()).toEqual([])
  })
})

describe('OrdersOption over the real controller: each list is asked once per action', () => {
  it('the first load: each list of Assigned once', async () => {
    const { api } = await start(orders())
    expect(api.asked()).toEqual(['pending:1', 'inProgress:1'])
  })

  it('the Refresh button asks each list of the tab once, the first one with the controller\'s own reload', async () => {
    const { api, screen } = await start(orders())
    api.reset()
    fireEvent.press(screen.getByLabelText('Refresh'))
    await settle()
    expect(api.asked()).toEqual(['pending:1', 'inProgress:1'])
    expect(shown(screen)).toEqual([1, 3])
  })

  it('the pull to refresh does the same', async () => {
    const { api, screen } = await start(orders())
    api.reset()
    const list = screen.UNSAFE_getAllByType(ScrollView).find((node: any) => node.props.refreshControl)!
    act(() => { list.props.refreshControl.props.onRefresh() })
    await settle()
    expect(api.asked()).toEqual(['pending:1', 'inProgress:1'])
  })

  it('a pull while the refresh is still running is one reload more, after it, not a request on top of it', async () => {
    const { api, server, screen } = await start(orders())
    api.reset()
    const release = hold(server, 'inProgress')
    fireEvent.press(screen.getByLabelText('Refresh'))
    await settle()
    const list = screen.UNSAFE_getAllByType(ScrollView).find((node: any) => node.props.refreshControl)!
    act(() => { list.props.refreshControl.props.onRefresh() })
    await settle()
    expect(api.asked()).toEqual(['pending:1', 'inProgress:1'])
    release()
    await settle()
    expect(api.asked()).toEqual(['pending:1', 'inProgress:1', 'pending:1', 'inProgress:1'])
  })

  it('switching to History asks each list History shows once', async () => {
    const { api, screen } = await start([...orders(), endedAt(11, 11, '2026-11-23T10:00:00.000Z'), endedAt(12, 12, '2026-11-23T11:00:00.000Z')])
    api.reset()
    fireEvent.press(within(tabNamed(screen, 'History')).getByText('History'))
    await settle()
    expect(api.asked()).toEqual(['completed:1', 'cancelled:1'])
    expect(shown(screen)).toEqual([11, 12])
  })

  it('Refresh on History asks each list of History once; going back to Assigned asks what the refresh left unloaded, once each', async () => {
    const { api, screen } = await start([...orders(), endedAt(11, 11, '2026-11-23T10:00:00.000Z'), endedAt(12, 12, '2026-11-23T11:00:00.000Z')])
    fireEvent.press(within(tabNamed(screen, 'History')).getByText('History'))
    await settle()
    api.reset()
    fireEvent.press(screen.getByLabelText('Refresh'))
    await settle()
    expect(api.asked()).toEqual(['completed:1', 'cancelled:1'])
    api.reset()
    fireEvent.press(within(tabNamed(screen, 'Assigned')).getByText('Assigned'))
    await settle()
    expect(api.asked()).toEqual(['pending:1', 'inProgress:1'])
  })

  it('a refresh from In Progress asks its list once', async () => {
    const { api, screen } = await start(orders())
    fireEvent.press(within(tabNamed(screen, 'In Progress')).getByText('In Progress'))
    await settle()
    api.reset()
    fireEvent.press(screen.getByLabelText('Refresh'))
    await settle()
    expect(api.asked()).toEqual(['inProgress:1'])
  })
})
