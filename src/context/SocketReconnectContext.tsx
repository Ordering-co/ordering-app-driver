import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react'
import { AppState } from 'react-native'

import { useWebsocket } from '@components'

/**
 * The one place that decides "the app has to catch up".
 *
 * The lists the driver looks at are kept fresh by the socket's events, and an event that came while the
 * socket was down is gone: after a drop the screens still show what they last knew. This provider watches
 * the socket the same way the connection chip does (`connect` after a `disconnect`: the chip going from red
 * to green) and tells whoever subscribed (`useOnReconnect`) to load again what it shows, once per reconnect:
 *
 * - the first connect of a healthy start is not a reconnect (the screens load themselves);
 * - a connection that never managed to start counts as down too: each failed attempt (`connect_error`, the start-up
 *   retry loop gives no `disconnect`) marks it, so the connect that finally comes is a catch-up (an order assigned
 *   meanwhile is not in the lists, and its event is gone);
 * - a connection that drops again before it settles is not told (the next connect is);
 * - the app coming back to the foreground after a while in the background (the system may have frozen the
 *   socket without a `disconnect` the app saw) asks the same, and shares the one wait with a reconnect that
 *   comes with it.
 *
 * Without a provider (a screen on its own, a test) nobody is told anything.
 */

/** How long a restored connection must hold before the screens are told, so a flapping one asks once. */
export const RECONNECT_SETTLE_MS = 1000
/** The shortest stay in the background that makes the screens load again when the app comes back. */
export const BACKGROUND_REFETCH_MS = 30000

type Listener = () => void
type Subscribe = (listener: Listener) => () => void

const ReconnectContext = createContext<Subscribe>(() => () => {})

export const SocketReconnectProvider = ({ children }: { children: React.ReactNode }) => {
  const socket: any = useWebsocket()
  const listeners = useRef(new Set<Listener>())

  const subscribe = useCallback<Subscribe>((listener) => {
    listeners.current.add(listener)
    return () => { listeners.current.delete(listener) }
  }, [])

  useEffect(() => {
    let dropped = false
    let backgroundAt: number | null = null
    let timer: ReturnType<typeof setTimeout> | null = null

    const cancel = () => {
      if (timer) clearTimeout(timer)
      timer = null
    }
    // Trailing: told once the connection has held for `RECONNECT_SETTLE_MS`; asking again inside the wait is the same ask.
    const ask = () => {
      cancel()
      timer = setTimeout(() => {
        timer = null
        listeners.current.forEach((listener) => listener())
      }, RECONNECT_SETTLE_MS)
    }
    const handleDisconnect = () => {
      dropped = true
      cancel()
    }
    // A failed attempt is a connection that is not up, as a drop is. It cancels nothing: a wait already running is the foreground
    // return's (an attempt cannot fail while connected, so no reconnect's wait is pending), and that load is still wanted.
    const handleConnectError = () => {
      dropped = true
    }
    const handleConnect = () => {
      if (!dropped) return
      dropped = false
      ask()
    }
    socket?.on?.('connect', handleConnect)
    socket?.on?.('disconnect', handleDisconnect)
    socket?.on?.('connect_error', handleConnectError)

    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'background') {
        backgroundAt = Date.now()
      } else if (state === 'active') {
        const since = backgroundAt
        backgroundAt = null
        if (since !== null && Date.now() - since >= BACKGROUND_REFETCH_MS) ask()
      }
    })

    return () => {
      cancel()
      socket?.off?.('connect', handleConnect)
      socket?.off?.('disconnect', handleDisconnect)
      socket?.off?.('connect_error', handleConnectError)
      appState.remove()
    }
  }, [socket])

  const value = useMemo(() => subscribe, [subscribe])
  return <ReconnectContext.Provider value={value}>{children}</ReconnectContext.Provider>
}

/**
 * Runs `handler` when the app has to catch up (see the provider). The latest handler is the one called, so
 * a screen passes its reload function as it is and never has to memoize it.
 */
export const useOnReconnect = (handler: () => void) => {
  const subscribe = useContext(ReconnectContext)
  const latest = useRef(handler)
  latest.current = handler
  useEffect(() => subscribe(() => latest.current()), [subscribe])
}
