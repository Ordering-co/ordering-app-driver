import { useCallback, useEffect, useRef } from 'react'

/**
 * A screen that loads its order again when the app catches up (`useOnReconnect`) must not do it while one of its own
 * changes is on the way: the GET that goes out first can answer after the POST and put the previous stage's order (and its
 * buttons) back. So a catch-up asked meanwhile waits, and loads once the change is over.
 *
 * - `track(change)` runs a change (an order's new status, a request's answer) and counts it as in flight until it settles,
 *   whether it resolves or throws. `inFlight()` says whether one is.
 * - `catchUp()` loads now, or once the change ends (once, however many were asked). `busy` is the controller's own
 *   state (`order.loading`): a change started by another path, that this screen cannot track, waits the same way.
 */
export const useRefetchAfterMutation = (refetch: () => void, busy = false) => {
  const running = useRef(0)
  const waiting = useRef(false)
  const latest = useRef(refetch)
  latest.current = refetch
  const isBusy = useRef(busy)
  isBusy.current = busy

  const flush = useCallback(() => {
    if (!waiting.current || running.current > 0 || isBusy.current) return
    waiting.current = false
    latest.current()
  }, [])

  const catchUp = useCallback(() => {
    if (running.current > 0 || isBusy.current) waiting.current = true
    else latest.current()
  }, [])

  const track = useCallback(async <T>(change: () => Promise<T> | T): Promise<T> => {
    running.current += 1
    try {
      return await change()
    } finally {
      running.current -= 1
      flush()
    }
  }, [flush])

  const inFlight = useCallback(() => running.current > 0, [])

  // A change the controller runs on its own ends here.
  useEffect(() => { if (!busy) flush() }, [busy, flush])

  return { track, catchUp, inFlight }
}
