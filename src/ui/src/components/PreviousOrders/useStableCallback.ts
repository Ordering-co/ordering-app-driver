import { useCallback, useRef } from 'react'

/**
 * A function that never changes and calls the latest one it was given.
 *
 * The orders list keeps its rows memoized (a socket event must not redraw every card), so a row keeps the props of the
 * last render in which something it draws changed. A handler passed as it comes would then be the closure of that old
 * render, and the controller's handlers write whole-list snapshots from what their render saw: an old one puts back a
 * list without the requests that arrived since (and with the ones already answered). The rows get this instead, so
 * what they call is always the latest handler and the memo has nothing to compare.
 */
export function useStableCallback<Args extends any[], Result> (callback?: (...args: Args) => Result) {
  const latest = useRef(callback)
  // Set while rendering, as the other "latest" refs of the app: a child renders after its parent, and an event
  // handler runs after the commit, so both read this render's function.
  latest.current = callback
  return useCallback((...args: Args): Result | undefined => latest.current?.(...args), [])
}
