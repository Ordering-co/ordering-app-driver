import { useEffect, useState } from 'react'

/**
 * The connection as the app reads it. Two things can be wrong and they are told apart: the device has no network
 * (`offline`: nothing will arrive until it is back) and the socket to the server is down or connecting while the
 * network is fine (`reconnecting`: the app is retrying, and "Reconnect now" can push it).
 */
export type ConnectionState = 'live' | 'reconnecting' | 'offline'

/** The socket controller's status: 1 connected, 0 connecting, 2 disconnected. */
export type SocketStatus = 0 | 1 | 2 | number

export const connectionStateOf = ({ isNetConnected, socketStatus }: { isNetConnected: boolean | null | undefined, socketStatus: SocketStatus }): ConnectionState =>
  isNetConnected === false ? 'offline' : socketStatus === 1 ? 'live' : 'reconnecting'

/**
 * How long a live socket may be down before the pill says so (ms). A socket drops and comes back in a moment all the time
 * (a network handover, the app returning from the background): that is not worth a flicker of "Reconnecting". A lost
 * network (`offline`) and every recovery show at once.
 */
export const SOCKET_GRACE_MS = 3000

/** What the Server row says: the socket's own state, whatever the network is. */
export type ServerState = 'connected' | 'connecting' | 'disconnected'

export const serverStateOf = (socketStatus: SocketStatus): ServerState =>
  socketStatus === 1 ? 'connected' : socketStatus === 0 ? 'connecting' : 'disconnected'

/** The theme's state color of each: `success`, `warning`, `danger` (an ink: `<role>_text`, a tint: `<role>_subtle`). */
export const connectionRole = (state: ConnectionState): 'success' | 'warning' | 'danger' =>
  state === 'live' ? 'success' : state === 'reconnecting' ? 'warning' : 'danger'

export const serverRole = (state: ServerState): 'success' | 'warning' | 'danger' =>
  state === 'connected' ? 'success' : state === 'connecting' ? 'warning' : 'danger'

/**
 * The state the pill and the sheet show: the real one, except that a live connection whose socket drops is told as
 * `reconnecting` only when it stays down for `graceMs`. Anything else (offline, a recovery, the first reading) is shown
 * as it comes.
 */
export const useSettledConnection = (state: ConnectionState, graceMs: number = SOCKET_GRACE_MS): ConnectionState => {
  const [shown, setShown] = useState(state)
  useEffect(() => {
    if (state === shown) return
    if (shown === 'live' && state === 'reconnecting') {
      const timer = setTimeout(() => setShown(state), graceMs)
      return () => clearTimeout(timer)
    }
    setShown(state)
  }, [state, shown, graceMs])
  return shown
}
