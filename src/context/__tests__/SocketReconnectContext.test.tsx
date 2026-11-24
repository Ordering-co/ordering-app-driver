import React from 'react'
import { act, render } from '@testing-library/react-native'
import { AppState } from 'react-native'

/** A socket the test drives: `connect` and `disconnect` come when the test says so, as the chip's source does. */
const mockSocket = (() => {
  const handlers: Record<string, Set<() => void>> = {}
  return {
    on: jest.fn((event: string, fn: () => void) => { (handlers[event] ??= new Set()).add(fn) }),
    off: jest.fn((event: string, fn: () => void) => { handlers[event]?.delete(fn) }),
    emit: (event: string) => handlers[event]?.forEach((fn) => fn()),
    count: (event: string) => handlers[event]?.size ?? 0
  }
})()

jest.mock('@components', () => ({ useWebsocket: jest.fn(() => mockSocket) }))

import {
  BACKGROUND_REFETCH_MS,
  RECONNECT_SETTLE_MS,
  SocketReconnectProvider,
  useOnReconnect
} from '../SocketReconnectContext'

const Consumer = ({ onReconnect }: { onReconnect: () => void }) => {
  useOnReconnect(onReconnect)
  return null
}

const setup = (onReconnect = jest.fn()) => {
  const view = render(<SocketReconnectProvider><Consumer onReconnect={onReconnect} /></SocketReconnectProvider>)
  return { onReconnect, view }
}

const settle = () => act(() => { jest.advanceTimersByTime(RECONNECT_SETTLE_MS + 10) })

describe('SocketReconnectContext (one place decides the app has to catch up)', () => {
  let appStateHandler: (state: string) => void
  let remove: jest.Mock

  beforeEach(() => {
    jest.useFakeTimers()
    mockSocket.on.mockClear()
    mockSocket.off.mockClear()
    remove = jest.fn()
    jest.spyOn(AppState, 'addEventListener').mockImplementation(((_: string, fn: any) => {
      appStateHandler = fn
      return { remove }
    }) as any)
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  it('does nothing on the first connect of the socket: the screens load themselves', () => {
    const { onReconnect } = setup()
    act(() => mockSocket.emit('connect'))
    settle()
    expect(onReconnect).not.toHaveBeenCalled()
  })

  it('tells the screens once when the socket connects again after having dropped', () => {
    const { onReconnect } = setup()
    act(() => mockSocket.emit('connect'))
    act(() => mockSocket.emit('disconnect'))
    settle()
    expect(onReconnect).not.toHaveBeenCalled()
    act(() => mockSocket.emit('connect'))
    expect(onReconnect).not.toHaveBeenCalled()
    settle()
    expect(onReconnect).toHaveBeenCalledTimes(1)
    // A later connect with no drop in between is not a reconnect.
    act(() => mockSocket.emit('connect'))
    settle()
    expect(onReconnect).toHaveBeenCalledTimes(1)
  })

  it('debounces a connection that flaps: one ask for the burst, after it holds', () => {
    const { onReconnect } = setup()
    act(() => mockSocket.emit('connect'))
    for (let i = 0; i < 3; i++) {
      act(() => mockSocket.emit('disconnect'))
      act(() => mockSocket.emit('connect'))
      act(() => { jest.advanceTimersByTime(RECONNECT_SETTLE_MS / 4) })
    }
    expect(onReconnect).not.toHaveBeenCalled()
    settle()
    expect(onReconnect).toHaveBeenCalledTimes(1)
  })

  it('does not tell the screens when the socket drops again before it settled', () => {
    const { onReconnect } = setup()
    act(() => mockSocket.emit('disconnect'))
    act(() => mockSocket.emit('connect'))
    act(() => mockSocket.emit('disconnect'))
    settle()
    expect(onReconnect).not.toHaveBeenCalled()
    act(() => mockSocket.emit('connect'))
    settle()
    expect(onReconnect).toHaveBeenCalledTimes(1)
  })

  describe('a start that failed (the socket never connected: connect_error gives no disconnect)', () => {
    it('asks the screens to catch up once when it finally connects, after the settle time', () => {
      const { onReconnect } = setup()
      act(() => mockSocket.emit('connect_error'))
      act(() => { jest.advanceTimersByTime(1000) })
      act(() => mockSocket.emit('connect_error'))
      act(() => mockSocket.emit('connect_error'))
      settle()
      expect(onReconnect).not.toHaveBeenCalled()
      act(() => mockSocket.emit('connect'))
      expect(onReconnect).not.toHaveBeenCalled()
      settle()
      expect(onReconnect).toHaveBeenCalledTimes(1)
      // That was the catch-up: the next connect with no failure or drop in between is not another.
      act(() => mockSocket.emit('connect'))
      settle()
      expect(onReconnect).toHaveBeenCalledTimes(1)
    })

    it('a connection that holds and then fails again before it settled asks once, after the last connect', () => {
      const { onReconnect } = setup()
      act(() => mockSocket.emit('connect_error'))
      act(() => mockSocket.emit('connect'))
      act(() => mockSocket.emit('disconnect'))
      act(() => mockSocket.emit('connect_error'))
      settle()
      expect(onReconnect).not.toHaveBeenCalled()
      act(() => mockSocket.emit('connect'))
      settle()
      expect(onReconnect).toHaveBeenCalledTimes(1)
    })

    it('a failed attempt does not cancel the wait of a foreground return that is running', () => {
      const { onReconnect } = setup()
      act(() => appStateHandler('background'))
      act(() => { jest.advanceTimersByTime(BACKGROUND_REFETCH_MS + 1000) })
      act(() => appStateHandler('active'))
      act(() => mockSocket.emit('connect_error'))
      settle()
      expect(onReconnect).toHaveBeenCalledTimes(1)
    })

    it('listens to connect_error through the socket\'s own on/off and removes that very handler on cleanup', () => {
      const { view } = setup()
      expect(mockSocket.count('connect_error')).toBe(1)
      const added = mockSocket.on.mock.calls.find(([event]: any[]) => event === 'connect_error')![1]
      view.unmount()
      expect(mockSocket.count('connect_error')).toBe(0)
      expect(mockSocket.off).toHaveBeenCalledWith('connect_error', added)
    })
  })

  it('tells every screen that subscribed, with the latest handler it gave', () => {
    const first = jest.fn()
    const second = jest.fn()
    const view = render(
      <SocketReconnectProvider><Consumer onReconnect={first} /><Consumer onReconnect={second} /></SocketReconnectProvider>
    )
    const latest = jest.fn()
    view.rerender(<SocketReconnectProvider><Consumer onReconnect={latest} /><Consumer onReconnect={second} /></SocketReconnectProvider>)
    act(() => mockSocket.emit('disconnect'))
    act(() => mockSocket.emit('connect'))
    settle()
    expect(first).not.toHaveBeenCalled()
    expect(latest).toHaveBeenCalledTimes(1)
    expect(second).toHaveBeenCalledTimes(1)
  })

  it('stops telling a screen that left, and stops listening when the navigator leaves', () => {
    const { onReconnect, view } = setup()
    expect(mockSocket.count('connect')).toBe(1)
    view.unmount()
    expect(mockSocket.count('connect')).toBe(0)
    expect(mockSocket.count('disconnect')).toBe(0)
    expect(remove).toHaveBeenCalled()
    act(() => mockSocket.emit('disconnect'))
    act(() => mockSocket.emit('connect'))
    settle()
    expect(onReconnect).not.toHaveBeenCalled()
  })

  describe('the app coming back to the foreground', () => {
    it('asks after more than a short while in the background', () => {
      const { onReconnect } = setup()
      act(() => appStateHandler('background'))
      act(() => { jest.advanceTimersByTime(BACKGROUND_REFETCH_MS + 1000) })
      act(() => appStateHandler('active'))
      settle()
      expect(onReconnect).toHaveBeenCalledTimes(1)
    })

    it('does not ask after a short one (the notification shade, a call)', () => {
      const { onReconnect } = setup()
      act(() => appStateHandler('background'))
      act(() => { jest.advanceTimersByTime(BACKGROUND_REFETCH_MS / 3) })
      act(() => appStateHandler('active'))
      settle()
      expect(onReconnect).not.toHaveBeenCalled()
    })

    it('does not ask for an "inactive" pass (iOS control center), which is not the background', () => {
      const { onReconnect } = setup()
      act(() => appStateHandler('inactive'))
      act(() => { jest.advanceTimersByTime(BACKGROUND_REFETCH_MS * 2) })
      act(() => appStateHandler('active'))
      settle()
      expect(onReconnect).not.toHaveBeenCalled()
    })

    it('shares the one wait with the reconnect that comes with it: one ask', () => {
      const { onReconnect } = setup()
      act(() => appStateHandler('background'))
      act(() => mockSocket.emit('disconnect'))
      act(() => { jest.advanceTimersByTime(BACKGROUND_REFETCH_MS + 1000) })
      act(() => appStateHandler('active'))
      act(() => mockSocket.emit('connect'))
      settle()
      expect(onReconnect).toHaveBeenCalledTimes(1)
    })
  })

  it('tells nobody anything without a provider', () => {
    const onReconnect = jest.fn()
    render(<Consumer onReconnect={onReconnect} />)
    act(() => mockSocket.emit('disconnect'))
    act(() => mockSocket.emit('connect'))
    settle()
    expect(onReconnect).not.toHaveBeenCalled()
  })
})
