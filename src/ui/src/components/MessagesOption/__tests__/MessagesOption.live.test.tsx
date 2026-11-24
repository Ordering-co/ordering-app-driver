import '../../../../../../jest/helpers/uiModuleMocks'
import React from 'react'
import fs from 'fs'
import path from 'path'
import { FlatList, Text } from 'react-native'
import { act, fireEvent, waitFor } from '@testing-library/react-native'

/**
 * The Messages screen is built at launch and stays in the tree while another tab is shown, so its
 * unread count is the tab bar's badge from the start. Here the real `Contacts` controller (the one
 * that loads the list and listens to the socket) runs under the real list, with a fake API and a fake
 * socket, and nothing tells the screen it is visible: the count is read from the context, as the tab
 * bar reads it.
 */
const mockSocket = (() => {
  const handlers: Record<string, Array<(payload: any) => void>> = {}
  return {
    socket: {},
    handlers,
    on: jest.fn((event: string, handler: (payload: any) => void) => { (handlers[event] ||= []).push(handler) }),
    off: jest.fn((event: string, handler: (payload: any) => void) => { handlers[event] = (handlers[event] || []).filter(h => h !== handler) }),
    join: jest.fn(),
    leave: jest.fn(),
    emit: (event: string, payload: any) => (handlers[event] || []).forEach(handler => handler(payload))
  }
})()

/** The app's event bus, as the order controller announces a read chat on it (`order_message_read`). */
const mockEvents = new (jest.requireActual('@/@/components/src/components/Emitter').Emitter)()

/** What the API answers: the list's page, and an order by id. */
let mockList: any[] = []
let mockOrderById: Record<number, any> = {}
/** The list's answers to give before the real one, one per request (an API error: `['No tienes permiso.']`). */
let mockFailures: string[][] = []
const mockGetList = jest.fn()
/** What each list request sent: the `parameters` (orderBy) and the `query` (page, page_size, where) of the call. */
let mockTotalPages = 1
let mockRequests: Array<{ parameters: any, query: any }> = []
const mockGetOrder = jest.fn()

/** The session the app has: none until the driver signs in. */
let mockSession: any = { token: 'token', user: { id: 7, level: 4 } }

/**
 * The API object is one, shared and mutable, as the SDK's: it answers 401 to a request that leaves with no
 * token on it, and the token is put there by whoever sets it (`setAccessToken`).
 */
const mockApi: any = {
  accessToken: null,
  orderId: undefined,
  sentParameters: undefined,
  setAccessToken: (token: string) => { mockApi.accessToken = token; return mockApi },
  orders: (id?: number) => { mockApi.orderId = id; mockApi.sentParameters = undefined; return mockApi },
  parameters: (parameters: any) => { mockApi.sentParameters = parameters; return mockApi },
  asDashboard: () => mockApi,
  get: async (options?: any) => {
    if (mockApi.orderId !== undefined) {
      const id = mockApi.orderId
      mockApi.orderId = undefined
      mockGetOrder(id)
      return { content: { result: mockOrderById[id], error: false } }
    }
    mockGetList(mockApi.accessToken)
    mockRequests.push({ parameters: mockApi.sentParameters, query: options?.query })
    mockApi.sentParameters = undefined
    if (!mockApi.accessToken) return { content: { result: ['No tienes permiso.'], error: true } }
    const failure = mockFailures.shift()
    if (failure) return { content: { result: failure, error: true } }
    return { content: { result: mockList, error: false, pagination: { current_page: mockRequests.length, total_pages: mockTotalPages } } }
  }
}

jest.mock('@/@/components/src/contexts/SessionContext', () => ({ useSession: () => [mockSession] }))
jest.mock('@/@/components/src/contexts/ApiContext', () => ({ useApi: () => [mockApi] }))
jest.mock('@/@/components/src/contexts/WebsocketContext', () => ({ useWebsocket: () => mockSocket }))

/** The chat on screen (the navigation's `OrderMessage`), if any: what the list reads to keep that chat's count at zero. */
let mockOpenChat: number | undefined
jest.mock('../../../../../navigators/NavigationRef', () => ({ openChatOrderId: () => mockOpenChat }))

/** What the list does when the app has to catch up (the provider's own suite covers when it is told). */
let mockReconnect: (() => void) | undefined
jest.mock('../../../../../context/SocketReconnectContext', () => ({
  useOnReconnect: (handler: () => void) => { mockReconnect = handler }
}))

jest.mock('@ui', () => {
  const mock = require('../../../../../../jest/helpers/d4MessagesUiMock').buildD4MessagesUiMock()
  // The list of messages is the real one (the stub of the fixture is dropped).
  delete mock.PreviousMessages
  return mock
})

jest.mock('@components', () => {
  const mockOrderingHooks = require('../../../../../../jest/helpers/mockOrdering')
  return {
    ...mockOrderingHooks,
    useSession: () => [mockSession],
    useApi: () => [mockApi],
    useEvent: () => [mockEvents],
    useUtils: jest.fn(() => [{ parseDate: (v: string) => v || '2026-01-01', optimizeImage: (url: string) => url }]),
    Contacts: jest.requireActual('@/@/components/src/components/Contacts').Contacts
  }
})

import { MessagesOption } from '..'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { UnreadMessagesProvider, useUnreadMessages } from '../../../../../context/UnreadMessagesContext'
import { sampleOrder } from '../../../../../../jest/helpers/d4MessagesDefaults'

// An order the list may hold has a direct message (`last_direct_message_at`): the tab lists only those.
const order = (id: number, unread: number) => ({ ...sampleOrder, id, unread_count: unread, last_direct_message_at: '2026-11-24 09:00:00', business: { ...sampleOrder.business, name: `Store ${id}` } })
const Badge = () => <Text testID='badge'>{JSON.stringify(useUnreadMessages())}</Text>
const render = () => renderWithProviders(
  <UnreadMessagesProvider>
    <Badge />
    <MessagesOption
      firstFetch='orders'
      sortParams={{ param: 'last_direct_message_at', direction: 'asc' }}
      paginationSettings={{ page: 1, pageSize: 45, controlType: 'infinity' }}
    />
  </UnreadMessagesProvider>
)
const known = (view: any) => JSON.parse(view.getByTestId('badge').props.children)

describe('the Messages list kept in the tree while another tab is shown', () => {
  beforeEach(() => {
    for (const key of Object.keys(mockSocket.handlers)) delete mockSocket.handlers[key]
    mockEvents._events = {}
    mockList = [order(1, 2), order(2, 0)]
    mockOrderById = {}
    mockFailures = []
    mockRequests = []
    mockTotalPages = 1
    mockSession = { token: 'token', user: { id: 7, level: 4 } }
    mockApi.accessToken = null
    mockOpenChat = undefined
    jest.clearAllMocks()
  })

  it('loads its list once at launch and reports the unread count with no help from a visit', async () => {
    const view = render()
    await waitFor(() => expect(known(view)).toEqual({ total: 2, more: false }))
    expect(mockGetList).toHaveBeenCalledTimes(1)
  })

  it('joins the socket rooms of the driver at launch, to hear a message while another tab is shown', async () => {
    const view = render()
    await waitFor(() => expect(known(view)).not.toBeNull())
    expect(mockSocket.join).toHaveBeenCalledWith('messages_orders_7')
    expect(mockSocket.join).toHaveBeenCalledWith('orders_7')
  })

  it('counts a new message of a known order, from the socket\'s `message` event', async () => {
    const view = render()
    await waitFor(() => expect(known(view).total).toBe(2))
    mockOrderById[2] = order(2, 3)
    await act(async () => { mockSocket.emit('message', { order_id: 2 }) })
    await waitFor(() => expect(known(view)).toEqual({ total: 5, more: false }))
    expect(mockGetOrder).toHaveBeenCalledWith(2)
  })

  it('counts a message of an order the list did not have', async () => {
    const view = render()
    await waitFor(() => expect(known(view).total).toBe(2))
    mockOrderById[9] = order(9, 1)
    await act(async () => { mockSocket.emit('message', { order_id: 9 }) })
    await waitFor(() => expect(known(view)).toEqual({ total: 3, more: false }))
  })

  // The chat is opened from the order's details, from this list or from a push; each reads it through the same
  // order controller, which announces it on the event bus (see `OrderMessage.test.tsx`), so the list hears it
  // whichever opened the chat.
  it('drops the count of an order whose chat was read, and counts the next message again', async () => {
    const view = render()
    await waitFor(() => expect(known(view)).toEqual({ total: 2, more: false }))

    act(() => { mockEvents.emit('order_message_read', 1) })
    await waitFor(() => expect(known(view)).toEqual({ total: 0, more: false }))
    expect(mockGetList).toHaveBeenCalledTimes(1)
    expect(mockGetOrder).not.toHaveBeenCalled()

    mockOrderById[1] = order(1, 1)
    await act(async () => { mockSocket.emit('message', { order_id: 1 }) })
    await waitFor(() => expect(known(view)).toEqual({ total: 1, more: false }))
  })

  it('leaves the other orders\' counts alone when one chat is read, and ignores a chat with nothing unread', async () => {
    mockList = [order(1, 2), order(2, 4)]
    const view = render()
    await waitFor(() => expect(known(view).total).toBe(6))
    act(() => { mockEvents.emit('order_message_read', 2) })
    await waitFor(() => expect(known(view).total).toBe(2))
    act(() => { mockEvents.emit('order_message_read', 2) })
    act(() => { mockEvents.emit('order_message_read', 99) })
    expect(known(view)).toEqual({ total: 2, more: false })
  })

  describe('a message of the chat that is open on screen', () => {
    it('never keeps the count the refetch brings, even when it lands after the chat\'s own read (the race)', async () => {
      const view = render()
      await waitFor(() => expect(known(view)).toEqual({ total: 2, more: false }))
      mockOpenChat = 1
      // The chat reads as the message arrives (its event comes first)...
      act(() => { mockEvents.emit('order_message_read', 1) })
      await waitFor(() => expect(known(view)).toEqual({ total: 0, more: false }))
      // ...and the list's own refetch of the order, which left before the read, answers with the old count.
      mockOrderById[1] = order(1, 1)
      await act(async () => { mockSocket.emit('message', { order_id: 1 }) })
      await waitFor(() => expect(mockGetOrder).toHaveBeenCalledWith(1))
      await waitFor(() => expect(known(view)).toEqual({ total: 0, more: false }))
    })

    it('does not count it, and counts the same message of an order whose chat is not open', async () => {
      const view = render()
      await waitFor(() => expect(known(view).total).toBe(2))
      mockOpenChat = 2
      mockOrderById[2] = order(2, 1)
      await act(async () => { mockSocket.emit('message', { order_id: 2 }) })
      await waitFor(() => expect(mockGetOrder).toHaveBeenCalledWith(2))
      expect(known(view)).toEqual({ total: 2, more: false })
      // Another order's message still counts.
      mockOrderById[1] = order(1, 3)
      await act(async () => { mockSocket.emit('message', { order_id: 1 }) })
      await waitFor(() => expect(known(view)).toEqual({ total: 3, more: false }))
    })
  })

  describe('catching up when the socket comes back', () => {
    it('loads the list again, with the counts that changed meanwhile', async () => {
      const view = render()
      await waitFor(() => expect(known(view)).toEqual({ total: 2, more: false }))
      expect(mockGetList).toHaveBeenCalledTimes(1)
      mockList = [order(1, 2), order(2, 5)]
      await act(async () => { mockReconnect!() })
      await waitFor(() => expect(known(view)).toEqual({ total: 7, more: false }))
      expect(mockGetList).toHaveBeenCalledTimes(2)
    })

    it('asks again through a new controller when the list had failed', async () => {
      mockFailures = [['No tienes permiso.']]
      const view = render()
      await waitFor(() => expect(view.getByText('No tienes permiso.')).toBeTruthy())
      await act(async () => { mockReconnect!() })
      await waitFor(() => expect(known(view)).toEqual({ total: 2, more: false }))
      expect(view.queryByText('No tienes permiso.')).toBeNull()
    })
  })

  it('stops listening when it leaves (the tab bar goes with the session)', async () => {
    const view = render()
    await waitFor(() => expect(known(view)).not.toBeNull())
    view.unmount()
    expect(mockSocket.handlers.message ?? []).toHaveLength(0)
    expect(mockEvents._events.order_message_read ?? []).toHaveLength(0)
  })
})

const tree = () => (
  <UnreadMessagesProvider>
    <Badge />
    <MessagesOption
      firstFetch='orders'
      sortParams={{ param: 'last_direct_message_at', direction: 'asc' }}
      paginationSettings={{ page: 1, pageSize: 45, controlType: 'infinity' }}
    />
  </UnreadMessagesProvider>
)
const refresh = (view: any) => act(async () => { view.UNSAFE_getByType(FlatList).props.refreshControl.props.onRefresh() })

describe('the list and the session', () => {
  beforeEach(() => {
    for (const key of Object.keys(mockSocket.handlers)) delete mockSocket.handlers[key]
    mockEvents._events = {}
    mockList = [order(1, 2), order(2, 0)]
    mockOrderById = {}
    mockFailures = []
    mockSession = { token: 'token', user: { id: 7, level: 4 } }
    mockApi.accessToken = null
    jest.clearAllMocks()
  })

  it('does not ask before there is a session, and shows the list as loading with nothing counted', async () => {
    mockSession = { token: null, user: null }
    const view = render()
    await act(async () => {})
    expect(mockGetList).not.toHaveBeenCalled()
    expect(known(view)).toBeNull()
    expect(view.queryByText('No tienes permiso.')).toBeNull()
    expect(view.queryByText('Sorry, no results found')).toBeNull()
    expect(mockSocket.join).not.toHaveBeenCalled()
  })

  it('asks once, with the token, when the session becomes available (no 401, no error to recover from)', async () => {
    mockSession = { token: null, user: null }
    const view = render()
    await act(async () => {})
    mockSession = { token: 'fresh', user: { id: 7, level: 4 } }
    view.rerender(tree())
    await waitFor(() => expect(known(view)).toEqual({ total: 2, more: false }))
    expect(mockGetList).toHaveBeenCalledTimes(1)
    expect(mockGetList).toHaveBeenCalledWith('fresh')
    expect(view.queryByText('No tienes permiso.')).toBeNull()
    expect(view.getByText('#1 · Store 1')).toBeTruthy()
    expect(mockSocket.join).toHaveBeenCalledWith('messages_orders_7')
  })

  it('keeps the sort chosen while it waited for the session', async () => {
    mockSession = { token: null, user: null }
    const view = render()
    fireEvent.press(view.getByLabelText('Order number'))
    mockSession = { token: 'fresh', user: { id: 7, level: 4 } }
    view.rerender(tree())
    await waitFor(() => expect(known(view)).not.toBeNull())
    expect(view.getByLabelText('Order number').props.accessibilityState.selected).toBe(true)
  })

  it('puts the session\'s token on the API object before the first request, which the controller does not do itself', async () => {
    mockApi.accessToken = null
    const view = render()
    await waitFor(() => expect(known(view)).not.toBeNull())
    expect(mockGetList).toHaveBeenCalledWith('token')
    expect(view.queryByText('No tienes permiso.')).toBeNull()
  })

  it('shows the error of a first answer, counts nothing, and a refresh asks again and replaces it with the list', async () => {
    mockFailures = [['No tienes permiso.']]
    const view = render()
    await waitFor(() => expect(view.getByText('No tienes permiso.')).toBeTruthy())
    expect(known(view)).toBeNull()
    expect(mockGetList).toHaveBeenCalledTimes(1)

    await refresh(view)
    await waitFor(() => expect(view.queryByText('No tienes permiso.')).toBeNull())
    expect(mockGetList).toHaveBeenCalledTimes(2)
    expect(view.getByText('#1 · Store 1')).toBeTruthy()
    expect(known(view)).toEqual({ total: 2, more: false })
  })

  it('keeps asking while the answers are errors, and recovers on the first good one', async () => {
    mockFailures = [['No tienes permiso.'], ['Network Error']]
    const view = render()
    await waitFor(() => expect(view.getByText('No tienes permiso.')).toBeTruthy())
    await refresh(view)
    await waitFor(() => expect(view.getByText('Network Error')).toBeTruthy())
    expect(view.queryByText('No tienes permiso.')).toBeNull()
    await refresh(view)
    await waitFor(() => expect(view.queryByText('Network Error')).toBeNull())
    expect(view.getByText('#2 · Store 2')).toBeTruthy()
    expect(mockGetList).toHaveBeenCalledTimes(3)
  })

  it('a sort chip pressed while the list is in error asks again with that sort, and the error goes with the answer', async () => {
    mockFailures = [['No tienes permiso.']]
    const view = render()
    await waitFor(() => expect(view.getByText('No tienes permiso.')).toBeTruthy())
    fireEvent.press(view.getByLabelText('Order number'))
    await waitFor(() => expect(view.queryByText('No tienes permiso.')).toBeNull())
    expect(mockGetList).toHaveBeenCalledTimes(2)
    expect(view.getByLabelText('Order number').props.accessibilityState.selected).toBe(true)
    await waitFor(() => expect(known(view)).toEqual({ total: 2, more: false }))
  })

  it('a list that worked and then failed shows the error, counts nothing, and recovers the same way', async () => {
    const view = render()
    await waitFor(() => expect(known(view)).toEqual({ total: 2, more: false }))
    mockFailures = [['Network Error']]
    await refresh(view)
    await waitFor(() => expect(view.getByText('Network Error')).toBeTruthy())
    expect(known(view)).toBeNull()
    await refresh(view)
    await waitFor(() => expect(known(view)).toEqual({ total: 2, more: false }))
    expect(view.queryByText('Network Error')).toBeNull()
  })

  it('asks again, for the new user, when the user changes, and joins the new user\'s rooms', async () => {
    const view = render()
    await waitFor(() => expect(known(view)).toEqual({ total: 2, more: false }))
    mockList = [order(5, 4)]
    mockSession = { token: 'other', user: { id: 8, level: 4 } }
    view.rerender(tree())
    await waitFor(() => expect(known(view)).toEqual({ total: 4, more: false }))
    expect(mockGetList).toHaveBeenCalledTimes(2)
    expect(mockGetList).toHaveBeenLastCalledWith('other')
    expect(mockSocket.join).toHaveBeenCalledWith('messages_orders_8')
    expect(mockSocket.leave).toHaveBeenCalledWith('messages_orders_7')
    expect(view.queryByText('#1 · Store 1')).toBeNull()
    expect(view.getByText('#5 · Store 5')).toBeTruthy()
  })

  it('counts nothing and asks nothing when the session ends, and asks again when one starts', async () => {
    const view = render()
    await waitFor(() => expect(known(view)).toEqual({ total: 2, more: false }))
    mockSession = { token: null, user: null }
    view.rerender(tree())
    expect(known(view)).toBeNull()
    expect(mockGetList).toHaveBeenCalledTimes(1)
    mockSession = { token: 'again', user: { id: 7, level: 4 } }
    view.rerender(tree())
    await waitFor(() => expect(known(view)).toEqual({ total: 2, more: false }))
    expect(mockGetList).toHaveBeenCalledTimes(2)
  })
})

describe('a list of the orders that have direct messages (the owner\'s decision of 2026-11-24)', () => {
  const where = { conditions: [{ attribute: 'last_direct_message_at', value: { condition: '!=', value: null } }], conector: 'AND' }
  const whereOf = (request: any) => JSON.parse(JSON.stringify(request.query.where))

  beforeEach(() => {
    for (const key of Object.keys(mockSocket.handlers)) delete mockSocket.handlers[key]
    mockEvents._events = {}
    mockList = [order(1, 2), order(2, 0)]
    mockOrderById = {}
    mockFailures = []
    mockRequests = []
    mockTotalPages = 1
    mockSession = { token: 'token', user: { id: 7, level: 4 } }
    mockApi.accessToken = null
    mockOpenChat = undefined
    jest.clearAllMocks()
  })

  it('asks the server for those orders only: the first page carries the `where`, with the sort and the page size', async () => {
    const view = render()
    await waitFor(() => expect(known(view)).toEqual({ total: 2, more: false }))
    expect(mockRequests).toHaveLength(1)
    expect(whereOf(mockRequests[0])).toEqual(where)
    expect(mockRequests[0].query).toMatchObject({ page: 1, page_size: 45 })
    expect(mockRequests[0].parameters).toEqual({ orderBy: 'last_direct_message_at' })
  })

  it('sends the same `where` on a sort change, with the new sort in the same request', async () => {
    const view = render()
    await waitFor(() => expect(known(view).total).toBe(2))
    fireEvent.press(view.getByLabelText('Order number'))
    await waitFor(() => expect(mockRequests).toHaveLength(2))
    expect(whereOf(mockRequests[1])).toEqual(where)
    expect(mockRequests[1].parameters).toEqual({ orderBy: '-id' })
    fireEvent.press(view.getByLabelText('Newest'))
    await waitFor(() => expect(mockRequests).toHaveLength(3))
    expect(whereOf(mockRequests[2])).toEqual(where)
    expect(mockRequests[2].parameters).toEqual({ orderBy: 'last_direct_message_at' })
  })

  it('sends it on a pull to refresh and on the catch-up after a reconnection', async () => {
    const view = render()
    await waitFor(() => expect(known(view).total).toBe(2))
    await refresh(view)
    await waitFor(() => expect(mockRequests).toHaveLength(2))
    await act(async () => { mockReconnect!() })
    await waitFor(() => expect(mockRequests).toHaveLength(3))
    mockRequests.forEach(request => expect(whereOf(request)).toEqual(where))
  })

  it('pages the filtered list: the total pages are the server\'s for the filter, and "Load more" asks the next page with the same `where`', async () => {
    mockTotalPages = 2
    const view = render()
    await waitFor(() => expect(known(view)).toEqual({ total: 2, more: true }))
    await act(async () => { fireEvent.press(view.getByText('Load more orders')) })
    await waitFor(() => expect(mockRequests).toHaveLength(2))
    expect(mockRequests[1].query).toMatchObject({ page: 2, page_size: 45 })
    expect(whereOf(mockRequests[1])).toEqual(where)
  })

  describe('with no conversation yet', () => {
    beforeEach(() => { mockList = [] })

    it('says so (and counts nothing), and no row is drawn', async () => {
      const view = render()
      await waitFor(() => expect(view.getByText('No messages yet')).toBeTruthy())
      expect(view.queryByText('Sorry, no results found')).toBeNull()
      expect(view.queryAllByTestId('message-row')).toHaveLength(0)
      expect(known(view)).toEqual({ total: 0, more: false })
    })

    it('shows the conversation, and the empty text goes, when the first message of an order arrives', async () => {
      const view = render()
      await waitFor(() => expect(view.getByText('No messages yet')).toBeTruthy())
      mockOrderById[9] = order(9, 1)
      await act(async () => { mockSocket.emit('message', { order_id: 9 }) })
      await waitFor(() => expect(view.getByText('#9 · Store 9')).toBeTruthy())
      expect(view.queryByText('No messages yet')).toBeNull()
      expect(known(view)).toEqual({ total: 1, more: false })
    })
  })

  describe('the real-time events', () => {
    it('add an order without a conversation to nothing: a status update or a new order of one is not listed', async () => {
      const view = render()
      await waitFor(() => expect(known(view).total).toBe(2))
      await act(async () => { mockSocket.emit('update_order', { id: 50, status: 7, driver: { id: 7 }, last_direct_message_at: null, unread_count: 0 }) })
      await act(async () => { mockSocket.emit('orders_register', { id: 51, status: 0, driver: { id: 7 } }) })
      expect(view.queryAllByTestId('message-row')).toHaveLength(2)
      expect(view.queryByText('#50 · Store A')).toBeNull()
      expect(view.queryByText('#51 · Store A')).toBeNull()
    })

    it('add an order of a message whose order has no direct message yet (the answer says none)', async () => {
      const view = render()
      await waitFor(() => expect(known(view).total).toBe(2))
      mockOrderById[60] = { ...order(60, 0), last_direct_message_at: null }
      await act(async () => { mockSocket.emit('message', { order_id: 60 }) })
      await waitFor(() => expect(mockGetOrder).toHaveBeenCalledWith(60))
      expect(view.queryAllByTestId('message-row')).toHaveLength(2)
    })

    it('add a new order that already has a conversation (an update of an order the list did not have)', async () => {
      const view = render()
      await waitFor(() => expect(known(view).total).toBe(2))
      await act(async () => { mockSocket.emit('update_order', { ...order(70, 4), driver: { id: 7 } }) })
      await waitFor(() => expect(view.getByText('#70 · Store 70')).toBeTruthy())
      expect(known(view).total).toBe(6)
    })

    it('still update an order that is in the list, with or without a conversation field in the event', async () => {
      const view = render()
      await waitFor(() => expect(known(view).total).toBe(2))
      await act(async () => { mockSocket.emit('update_order', { id: 1, status: 7, driver: { id: 7 } }) })
      expect(view.queryAllByTestId('message-row')).toHaveLength(2)
      expect(view.getByText('#1 · Store 1')).toBeTruthy()
    })
  })
})

describe('nothing of the Messages screen depends on its being visible', () => {
  // The screen is built before its tab opens and is never told it is shown: a rule that ran on focus
  // (a focus effect, marking as read, a sound, an analytics event) would run at launch or never.
  const sources = [
    'src/pages/Messages.tsx',
    'src/ui/src/components/MessagesOption/index.tsx',
    'src/ui/src/components/PreviousMessages/index.tsx',
    'src/ui/src/components/PreviousMessages/FooterMessageComponent.tsx'
  ]
  const forbidden = /useFocusEffect|useIsFocused|addListener|\breadMessages\b|Sound|analytics|Analytics|Sentry|StatusBar|AppState|Vibration|Keyboard/

  it.each(sources)('%s has no focus effect, marking as read, sound or analytics', (file) => {
    const text = fs.readFileSync(path.join(__dirname, '../../../../../../', file), 'utf8')
    expect(text).not.toMatch(forbidden)
  })
})
