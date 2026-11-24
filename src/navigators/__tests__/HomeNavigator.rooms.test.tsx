import React from 'react'
import { act } from '@testing-library/react-native'

/**
 * The rooms `HomeNavigator` joins for the signed-in driver, over the REAL socket wrapper of the submodule (only the
 * `socket.io-client` connection under it is a stand-in the test drives): which rooms the wrapper holds and what it tells the
 * server, as the user, the project and the connection change.
 */

const mockIo: any = { socket: null }
jest.mock('socket.io-client', () => ({
  __esModule: true,
  default: jest.fn(() => {
    const handlers: Record<string, Array<(...args: any[]) => void>> = {}
    const socket: any = {
      connected: false,
      active: true,
      emit: jest.fn(),
      connect: jest.fn(),
      close: jest.fn(),
      on: jest.fn((event: string, fn: any) => { (handlers[event] ??= []).push(fn) }),
      off: jest.fn(),
      fire: (event: string, ...args: any[]) => {
        if (event === 'connect') socket.connected = true
        if (event === 'disconnect') socket.connected = false
        handlers[event]?.forEach((fn) => fn(...args))
      }
    }
    mockIo.socket = socket
    return socket
  })
}))

jest.mock('@ui', () => ({
  ...require('../../../jest/helpers/sharedPrimitivesMock').sharedPrimitives(),
  ConnectionHost: () => null,
  NewOrderNotification: () => null
}))
jest.mock('../BottomNavigator', () => () => null)
;[
  'OrderDetails', 'OrderMessage', 'AcceptOrRejectOrder', 'Splash', 'RequestPermissions', 'OrderDetailsLogistic', 'Sessions',
  'StripeConnectAccount', 'Payouts', 'ProfileEdit', 'ProfilePassword', 'Schedule', 'OrdersRoute', 'OrdersRouteStops'
].forEach((page) => jest.doMock(`../../pages/${page}`, () => () => null))

import { useApi, useSession, useWebsocket } from '@components'
import { Socket } from '../../@/components/src/contexts/WebsocketContext/socket'
import HomeNavigator from '../HomeNavigator'
import { renderWithProviders } from '../../../jest/helpers/renderWithProviders'

const LEAVE_DEBOUNCE_MS = 500
const DRIVERS_ROOM = (project: string, id: number) => ({ project, room: 'drivers', user_id: id, role: 'driver' })

const emitted = (event: 'join' | 'leave') =>
  mockIo.socket.emit.mock.calls.filter(([name]: any[]) => name === event).map(([, room]: any[]) => room)
const held = (wrapper: any) => Object.values(wrapper.rooms).filter((entry: any) => entry.count > 0).map((entry: any) => entry.room)

describe('HomeNavigator: the rooms of the signed-in driver', () => {
  let wrapper: any
  let user: any
  let project: string

  const element = () => <HomeNavigator />
  const mount = () => {
    const view = renderWithProviders(element())
    return { ...view, redraw: () => view.rerender(element()) }
  }

  beforeEach(() => {
    jest.useFakeTimers()
    jest.clearAllMocks()
    mockIo.socket = null
    project = 'acme'
    user = { id: 5, level: 4 }
    wrapper = new Socket({ url: 'wss://sockets.test', project, accessToken: 'token' })
    wrapper.connect()
    ;(useWebsocket as jest.Mock).mockImplementation(() => wrapper)
    ;(useSession as jest.Mock).mockImplementation(() => [{ loading: false, user }, {}])
    ;(useApi as jest.Mock).mockImplementation(() => [{ project }, {}])
  })
  afterEach(() => {
    jest.useRealTimers()
  })

  it('joins its three rooms once the socket connects (the joins made before it are held and sent then)', () => {
    mount()
    expect(emitted('join')).toEqual([])
    act(() => mockIo.socket.fire('connect'))
    expect(emitted('join')).toEqual([
      'acme_orders_5',
      'acme_messages_orders_5',
      DRIVERS_ROOM('acme', 5)
    ])
  })

  it('joins the general rooms for a level 0 user', () => {
    user = { id: 5, level: 0 }
    mount()
    expect(held(wrapper)).toEqual(['orders', 'messages_orders', DRIVERS_ROOM('acme', 5)])
  })

  it('the network going and returning adds nothing to the count: the rooms are not joined again by this screen', () => {
    const NetInfo = require('@react-native-community/netinfo')
    const view = mount()
    act(() => mockIo.socket.fire('connect'))
    const counts = () => Object.values(wrapper.rooms).map((entry: any) => entry.count)
    expect(counts()).toEqual([1, 1, 1])
    for (const isConnected of [false, true, false, true]) {
      NetInfo.useNetInfo.mockReturnValue({ isConnected })
      view.redraw()
    }
    expect(counts()).toEqual([1, 1, 1])
    NetInfo.useNetInfo.mockReturnValue({ isConnected: true })
  })

  it('a drop and a connect again rejoin the rooms the wrapper holds, with nothing from the screen', () => {
    mount()
    act(() => mockIo.socket.fire('connect'))
    mockIo.socket.emit.mockClear()
    act(() => mockIo.socket.fire('disconnect', 'transport close'))
    act(() => mockIo.socket.fire('connect'))
    expect(emitted('join')).toHaveLength(3)
    expect(emitted('leave')).toEqual([])
  })

  it('leaves exactly the rooms it joined when the screen goes (the drivers room too: an object matches by content)', () => {
    const view = mount()
    act(() => mockIo.socket.fire('connect'))
    expect(held(wrapper)).toHaveLength(3)
    view.unmount()
    act(() => { jest.advanceTimersByTime(LEAVE_DEBOUNCE_MS + 10) })
    expect(held(wrapper)).toEqual([])
    expect(wrapper.rooms).toEqual({})
    expect(emitted('leave')).toEqual(['acme_orders_5', 'acme_messages_orders_5', DRIVERS_ROOM('acme', 5)])
  })

  it('changing the user leaves the previous user\'s rooms and joins the new one\'s', () => {
    const view = mount()
    act(() => mockIo.socket.fire('connect'))
    mockIo.socket.emit.mockClear()
    user = { id: 9, level: 4 }
    view.redraw()
    act(() => { jest.advanceTimersByTime(LEAVE_DEBOUNCE_MS + 10) })
    expect(emitted('join')).toEqual(['acme_orders_9', 'acme_messages_orders_9', DRIVERS_ROOM('acme', 9)])
    expect(emitted('leave')).toEqual(['acme_orders_5', 'acme_messages_orders_5', DRIVERS_ROOM('acme', 5)])
    expect(held(wrapper)).toEqual(['orders_9', 'messages_orders_9', DRIVERS_ROOM('acme', 9)])
  })

  it('a signed-out user (no id) joins nothing, and what was joined is left', () => {
    const view = mount()
    act(() => mockIo.socket.fire('connect'))
    user = null
    view.redraw()
    act(() => { jest.advanceTimersByTime(LEAVE_DEBOUNCE_MS + 10) })
    expect(held(wrapper)).toEqual([])
  })

  it('a session refresh that keeps the user\'s id, level and project joins nothing again', () => {
    const view = mount()
    act(() => mockIo.socket.fire('connect'))
    mockIo.socket.emit.mockClear()
    user = { ...user, name: 'renamed' }
    view.redraw()
    expect(Object.values(wrapper.rooms).map((entry: any) => entry.count)).toEqual([1, 1, 1])
    act(() => { jest.advanceTimersByTime(LEAVE_DEBOUNCE_MS + 10) })
    expect(mockIo.socket.emit).not.toHaveBeenCalled()
  })
})
