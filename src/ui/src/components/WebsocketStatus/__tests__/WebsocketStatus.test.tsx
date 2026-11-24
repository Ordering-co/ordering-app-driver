import React from 'react'
import { StyleSheet } from 'react-native'
import { act, fireEvent, renderHook } from '@testing-library/react-native'
import RNRestart from 'react-native-restart'

const mockEmitter = () => {
  const listeners: Record<string, Function[]> = {}
  return {
    on: (name: string, fn: Function) => { listeners[name] = [...(listeners[name] ?? []), fn] },
    off: (name: string, fn: Function) => { listeners[name] = (listeners[name] ?? []).filter((other) => other !== fn) },
    emit: (name: string, value?: any) => (listeners[name] ?? []).forEach((fn) => fn(value))
  }
}
const mockSocket: any = {
  status: 1,
  date: new Date(2026, 10, 19, 12, 31),
  io: { connected: true, disconnect: jest.fn() },
  connect: jest.fn(),
  events: mockEmitter()
}
const mockPermission: any = { status: 'granted', fails: false }
const mockUtils: any = { timeFormat: 'HH:mm:ss' }

jest.mock('@components', () => {
  const React = require('react')
  const mockOrdering = require('../../../../../../jest/helpers/mockOrdering')
  return {
    ...mockOrdering,
    WebsocketStatus: ({ UIComponent, ...props }: any) => <UIComponent {...props} socketStatus={mockSocket.status} connectedDate={mockSocket.date} />,
    useWebsocket: () => ({ socket: mockSocket.io, connect: mockSocket.connect }),
    useEvent: () => [mockSocket.events],
    // The project's writer of a date, as the utilities give it (its time format has seconds, as the SDK's default).
    useUtils: () => [{ timeFormat: mockUtils.timeFormat, parseDate: (date: any, options: any) => require('dayjs')(date).format(options.outputFormat) }, {}]
  }
})
jest.mock('react-native-permissions', () => ({
  checkNotifications: () => mockPermission.fails ? Promise.reject(new Error('unavailable')) : Promise.resolve({ status: mockPermission.status })
}))

import { WebsocketStatus, ConnectionHost, closeConnectionSheet } from '..'
import { markConnectionUpdate, resetConnectionStore } from '../connectionStore'
import { connectionStateOf, serverStateOf, useSettledConnection, SOCKET_GRACE_MS } from '../connectionState'
import { OfflineActionsContext } from '../../../context/OfflineActions'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { buildAppTheme, defaultAppTheme, THEME_PRODUCT_TYPE } from '../../../../../theme/engine'

/** A theme built from values, as the app builds it (never a spread). */
const themeWith = (values: any) => buildAppTheme({ version: 2, product_type: THEME_PRODUCT_TYPE, values })
const flat = (node: any) => StyleSheet.flatten(node.props.style)

const view = async (net: boolean | null = true, options: Record<string, any> = {}) => {
  const screen = renderWithProviders(
    <OfflineActionsContext.Provider value={[{ isNetConnected: net, canSaveChangesOffline: false, actions: {}, orders: null }, { applyOffAction: jest.fn(), registerOffOrder: jest.fn(), setState: jest.fn() }] as any}>
      <WebsocketStatus />
      <ConnectionHost />
    </OfflineActionsContext.Provider>,
    options
  )
  await act(async () => { await Promise.resolve() })
  return screen
}

/** Taps the pill: the sheet opens and reads the phone's notification permission. */
const openSheet = async (getByTestId: (id: string) => any) => {
  fireEvent.press(getByTestId('connection-pill'))
  await act(async () => { await Promise.resolve() })
}

describe('connection state', () => {
  it('tells the device being offline from the socket being down', () => {
    expect(connectionStateOf({ isNetConnected: true, socketStatus: 1 })).toBe('live')
    expect(connectionStateOf({ isNetConnected: true, socketStatus: 2 })).toBe('reconnecting')
    expect(connectionStateOf({ isNetConnected: true, socketStatus: 0 })).toBe('reconnecting')
    expect(connectionStateOf({ isNetConnected: false, socketStatus: 1 })).toBe('offline')
    // A network that is not known yet is not an offline device.
    expect(connectionStateOf({ isNetConnected: null, socketStatus: 1 })).toBe('live')
    expect(serverStateOf(1)).toBe('connected')
    expect(serverStateOf(0)).toBe('connecting')
    expect(serverStateOf(2)).toBe('disconnected')
  })
})

describe('useSettledConnection (the pill does not flicker)', () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => jest.useRealTimers())

  it('keeps Live through a socket that drops and comes back inside the grace', () => {
    const { result, rerender } = renderHook(({ state }: any) => useSettledConnection(state), { initialProps: { state: 'live' } })
    rerender({ state: 'reconnecting' })
    act(() => { jest.advanceTimersByTime(SOCKET_GRACE_MS - 500) })
    expect(result.current).toBe('live')
    rerender({ state: 'live' })
    act(() => { jest.advanceTimersByTime(SOCKET_GRACE_MS * 2) })
    expect(result.current).toBe('live')
  })

  it('says Reconnecting when the socket stays down past the grace', () => {
    const { result, rerender } = renderHook(({ state }: any) => useSettledConnection(state), { initialProps: { state: 'live' } })
    rerender({ state: 'reconnecting' })
    act(() => { jest.advanceTimersByTime(SOCKET_GRACE_MS + 10) })
    expect(result.current).toBe('reconnecting')
  })

  it('shows a lost network and every recovery at once, and the first reading as it is', () => {
    expect(renderHook(() => useSettledConnection('reconnecting')).result.current).toBe('reconnecting')
    const { result, rerender } = renderHook(({ state }: any) => useSettledConnection(state), { initialProps: { state: 'live' } })
    rerender({ state: 'offline' })
    expect(result.current).toBe('offline')
    rerender({ state: 'live' })
    expect(result.current).toBe('live')
    rerender({ state: 'reconnecting' })
    rerender({ state: 'offline' })
    expect(result.current).toBe('offline')
  })
})

describe('WebsocketStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetConnectionStore()
    mockSocket.status = 1
    mockSocket.io = { connected: true, disconnect: jest.fn() }
    mockSocket.events = mockEmitter()
    mockSocket.date = new Date(2026, 10, 19, 12, 31)
    mockPermission.status = 'granted'
    mockPermission.fails = false
    mockUtils.timeFormat = 'HH:mm:ss'
  })

  it('writes the state on the pill with a dot, never by color alone', async () => {
    const { getByText, getByTestId } = await view()
    expect(getByText('Live')).toBeTruthy()
    expect(getByTestId('connection-status-dot')).toBeTruthy()
    expect(getByTestId('connection-pill').props.accessibilityLabel).toBe('Connection: Live')
  })

  it('says Reconnecting while the socket is down or connecting, and Offline when the device has no network', async () => {
    mockSocket.status = 2
    const down = await view()
    expect(down.getByText('Reconnecting')).toBeTruthy()
    down.unmount()

    mockSocket.status = 0
    const connecting = await view()
    expect(connecting.getByText('Reconnecting')).toBeTruthy()
    connecting.unmount()

    mockSocket.status = 1
    const offline = await view(false)
    expect(offline.getByText('Offline')).toBeTruthy()
    expect(offline.queryByText('Live')).toBeNull()
    expect(offline.getByTestId('connection-pill').props.accessibilityLabel).toBe('Connection: Offline')
  })

  it('colors the pill by the state, the soft tones of the badge: live success, reconnecting warning, offline danger', async () => {
    const badge = defaultAppTheme().native.components.badge.variants
    mockSocket.status = 1
    const live = await view(true)
    expect(flat(live.getByTestId('connection-status')).backgroundColor).toBe(badge.success_soft.background)
    expect(flat(live.getByTestId('connection-status-dot')).backgroundColor).toBe(badge.success_soft.dot)
    live.unmount()

    mockSocket.status = 2
    const down = await view(true)
    expect(flat(down.getByTestId('connection-status')).backgroundColor).toBe(badge.warning_soft.background)
    expect(flat(down.getByTestId('connection-status-dot')).backgroundColor).toBe(badge.warning_soft.dot)
    down.unmount()

    const offline = await view(false)
    expect(flat(offline.getByTestId('connection-status')).backgroundColor).toBe(badge.danger_soft.background)
    expect(flat(offline.getByTestId('connection-status-dot')).backgroundColor).toBe(badge.danger_soft.dot)
  })

  it('follows a theme that changes a state color, in the pill', async () => {
    const custom = themeWith({ tokens: { color: { danger_subtle: '#ABCDEF' } } })
    const { getByTestId } = await view(false, { themeOverrides: custom })
    expect(flat(getByTestId('connection-status')).backgroundColor).toBe(custom.native.components.badge.variants.danger_soft.background)
  })

  it('is as wide as the label it shows: no hidden copies of the other labels, and the badge stretches to its pill', async () => {
    const { getByTestId, getByText, getAllByText, queryAllByText } = await view(true)
    expect(flat(getByTestId('connection-status')).alignSelf).toBe('stretch')
    // Only the shown word is laid out (a sizer with the three labels made "Live" as wide as "Reconnecting").
    expect(getAllByText('Live', { includeHiddenElements: true })).toHaveLength(1)
    expect(queryAllByText('Reconnecting', { includeHiddenElements: true })).toHaveLength(0)
    expect(queryAllByText('Offline', { includeHiddenElements: true })).toHaveLength(0)
    expect(getByText('Live')).toBeTruthy()
  })

  it('caps the pill at the theme\'s maximum width and lets its text end with an ellipsis, never wrap', async () => {
    const { getByTestId, getByText } = await view(true)
    const max = defaultAppTheme().native.components.badge.base.dot_max_width
    expect(max).toBe(140)
    expect(flat(getByTestId('connection-status')).maxWidth).toBe(max)
    // The text is one line and gives way before the box outgrows its room.
    expect(getByText('Live').props.numberOfLines).toBe(1)
    expect(flat(getByText('Live')).flexShrink).toBe(1)
    // The pill itself gives way in a short bar, down to a control's width.
    expect(flat(getByTestId('connection-pill')).flexShrink).toBe(1)
    expect(flat(getByTestId('connection-pill')).minWidth).toBeGreaterThanOrEqual(44)
  })

  it('follows a theme that changes the maximum width', async () => {
    const custom = themeWith({ components: { badge: { base: { dot_max_width: 96 } } } })
    const { getByTestId } = await view(true, { themeOverrides: custom })
    expect(flat(getByTestId('connection-status')).maxWidth).toBe(96)
  })

  it('gives the pill a touch target of a control\'s height', async () => {
    const { getByTestId } = await view()
    expect(flat(getByTestId('connection-pill')).minHeight).toBeGreaterThanOrEqual(44)
  })

  it('draws no pill when the theme hides the connection status', async () => {
    const { queryByTestId } = await view(true, { themeOverrides: themeWith({ visibility: { connection_status: false } }) })
    expect(queryByTestId('connection-pill')).toBeNull()
  })

  it('opens the sheet with the state named, when the last update came, the server and the notifications', async () => {
    const { getByTestId, getByText, queryByTestId, queryByText } = await view()
    expect(queryByTestId('connection-sheet')).toBeNull()
    await openSheet(getByTestId)
    expect(getByTestId('connection-sheet')).toBeTruthy()
    expect(getByTestId('connection-state')).toHaveTextContent('Live')
    expect(getByTestId('connection-description')).toHaveTextContent('Orders update in real time. Last update 12:31.')
    expect(getByTestId('connection-server')).toHaveTextContent('Connected')
    expect(getByTestId('connection-notifications')).toHaveTextContent('On')
    expect(getByText('If orders stop arriving, check your Wi-Fi or mobile data.')).toBeTruthy()
    // The old dialog's legend and its restart button are gone.
    expect(queryByText('Update')).toBeNull()
    expect(queryByText('The websocket works normally.')).toBeNull()
  })

  it('writes the last update in the project\'s time format, without seconds', async () => {
    mockUtils.timeFormat = 'hh:mm:ss A'
    const { getByTestId } = await view()
    await openSheet(getByTestId)
    expect(getByTestId('connection-description')).toHaveTextContent('Orders update in real time. Last update 12:31 PM.')
  })

  it('the last update is the newest of the connection and the last order event', async () => {
    const { getByTestId } = await view()
    act(() => markConnectionUpdate(new Date(2026, 10, 19, 12, 45).getTime()))
    await openSheet(getByTestId)
    expect(getByTestId('connection-description')).toHaveTextContent(/Last update 12:45\./)
    // An order event moves it.
    act(() => markConnectionUpdate(new Date(2026, 10, 19, 12, 50).getTime()))
    expect(getByTestId('connection-description')).toHaveTextContent(/Last update 12:50\./)
  })

  it('tells a socket that is down from a device without network in the sheet', async () => {
    mockSocket.status = 2
    const down = await view(true)
    await openSheet(down.getByTestId)
    expect(down.getByTestId('connection-state')).toHaveTextContent('Reconnecting')
    expect(down.getByTestId('connection-description')).toHaveTextContent(/Lost the connection to the server/)
    expect(down.getByTestId('connection-server')).toHaveTextContent('Disconnected')
    down.unmount()
    closeConnectionSheet()

    const offline = await view(false)
    await openSheet(offline.getByTestId)
    expect(offline.getByTestId('connection-state')).toHaveTextContent('Offline')
    expect(offline.getByTestId('connection-description')).toHaveTextContent(/No internet connection/)
  })

  it('says the notifications are off when the phone does not allow them', async () => {
    mockPermission.status = 'denied'
    const { getByTestId } = await view()
    await openSheet(getByTestId)
    expect(getByTestId('connection-notifications')).toHaveTextContent('Off')
  })

  it('leaves the notifications row out when the phone cannot say', async () => {
    mockPermission.fails = true
    const { getByTestId, queryByTestId } = await view()
    await openSheet(getByTestId)
    expect(getByTestId('connection-server')).toBeTruthy()
    expect(queryByTestId('connection-row-notifications')).toBeNull()
  })

  it('has the rows of the connection only: the server and the notifications (no printer, no pending changes)', async () => {
    const { getByTestId, queryByTestId } = await view()
    await openSheet(getByTestId)
    expect(queryByTestId('connection-row-printer')).toBeNull()
    expect(queryByTestId('connection-printer')).toBeNull()
  })

  it('Reconnect now reconnects the socket without restarting the app', async () => {
    const { getByTestId } = await view()
    await openSheet(getByTestId)
    fireEvent.press(getByTestId('connection-reconnect'))
    // A socket that thinks it is connected is dropped first, then connected: the catch-up of the lists runs on that `connect`.
    expect(mockSocket.io.disconnect).toHaveBeenCalledTimes(1)
    expect(mockSocket.connect).toHaveBeenCalledTimes(1)
    expect(mockSocket.io.disconnect.mock.invocationCallOrder[0]).toBeLessThan(mockSocket.connect.mock.invocationCallOrder[0])
    expect(RNRestart.restart).not.toHaveBeenCalled()
  })

  it('Reconnect now only connects a socket that is already down', async () => {
    mockSocket.status = 2
    mockSocket.io = { connected: false, disconnect: jest.fn() }
    const { getByTestId } = await view()
    await openSheet(getByTestId)
    fireEvent.press(getByTestId('connection-reconnect'))
    expect(mockSocket.io.disconnect).not.toHaveBeenCalled()
    expect(mockSocket.connect).toHaveBeenCalledTimes(1)
  })

  it('Reconnect now shows it is working and ends its feedback by itself when the connection does not answer', async () => {
    jest.useFakeTimers()
    try {
      const { getByTestId } = await view()
      await openSheet(getByTestId)
      expect(getByTestId('connection-reconnect').props.accessibilityState).toEqual(expect.objectContaining({ busy: false }))
      fireEvent.press(getByTestId('connection-reconnect'))
      expect(getByTestId('connection-reconnect').props.accessibilityState).toEqual(expect.objectContaining({ busy: true }))
      act(() => { jest.advanceTimersByTime(4000) })
      expect(getByTestId('connection-reconnect').props.accessibilityState).toEqual(expect.objectContaining({ busy: false }))
    } finally {
      jest.useRealTimers()
    }
  })

  it('closes with its close button', async () => {
    const { getByTestId, queryByTestId, getByLabelText } = await view()
    await openSheet(getByTestId)
    fireEvent.press(getByLabelText('Close'))
    expect(queryByTestId('connection-sheet')).toBeNull()
  })

  it('marks the last update on every order event the list hears', async () => {
    mockSocket.date = new Date(2000, 0, 1, 8, 5)
    const { getByTestId } = await view()
    act(() => { mockSocket.events.emit('order_added', { id: 1 }) })
    await openSheet(getByTestId)
    // The mark is "now": newer than the connection of 08:05.
    expect(getByTestId('connection-description')).not.toHaveTextContent(/Last update 08:05\./)
  })
})
