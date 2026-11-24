import { useCallback, useEffect, useReducer, useRef } from 'react'

/**
 * A reload that never answers must not hold the lists for ever: after this long the queue goes on as if it had.
 * (The controller's loads have no time limit of their own: a request on a dead connection can hang.)
 */
export const RELOAD_GIVE_UP_MS = 30000

interface ListState {
  running: boolean
  /** The reload asked while another one ran (or while a change was on its way): the last one asked, run once. */
  pending: (() => any) | null
}

/**
 * Orders the loads of a list the app cannot cancel. The controller's loads each write a whole-state snapshot when they end, so
 * two at once leave the answer of the last to end (not the last asked), and a reload that overlaps one of the driver's own
 * changes can bring back an order that was just answered. The app cannot change that, so it does not overlap them:
 *
 * - one reload per list at a time (`list` names it: the orders, the assign requests);
 * - one asked while that one runs is kept and run once when it ends (only the last one asked: they all want the lists as they are
 *   now), after the render that carries what the first one loaded, so it reads the controller's current functions;
 * - none starts while a change the driver made (`track`) is on its way, for any list: the changes edit the same snapshots. It
 *   runs when the last change ends.
 *
 * `request` starts at once when nothing is in the way.
 */
export function useReloadQueue () {
  const lists = useRef<Record<string, ListState>>({})
  const mutations = useRef(0)
  // The give-up timers still counting: a screen that goes away takes them with it.
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>())
  const [, wake] = useReducer((count: number) => count + 1, 0)

  const hasPending = () => Object.values(lists.current).some((list) => !!list.pending)

  const pump = useCallback(() => {
    if (mutations.current > 0) return
    Object.values(lists.current).forEach((list) => {
      if (list.running || !list.pending) return
      const run = list.pending
      list.pending = null
      list.running = true
      let released = false
      const release = () => {
        if (released) return
        released = true
        clearTimeout(giveUp)
        timers.current.delete(giveUp)
        list.running = false
        // The next one waits for the render of what this one loaded (an effect pumps again); with none waiting there is nothing to wake.
        if (list.pending) wake()
      }
      const giveUp = setTimeout(release, RELOAD_GIVE_UP_MS)
      timers.current.add(giveUp)
      let started: Promise<any>
      try {
        started = Promise.resolve(run())
      } catch (error) {
        started = Promise.reject(error)
      }
      started.catch(() => undefined).finally(release)
    })
  }, [])

  useEffect(() => () => {
    timers.current.forEach(clearTimeout)
    timers.current.clear()
  }, [])

  // Every render may have freed the way (a change ended, a load ended): the waiting reload runs from here.
  useEffect(() => { pump() })

  const request = useCallback((list: string, run: () => any) => {
    const state = lists.current[list] ?? (lists.current[list] = { running: false, pending: null })
    state.pending = run
    pump()
  }, [pump])

  /** A change of the driver's own (a status, an answer to a request): reloads wait for it. */
  const track = useCallback(async <T>(change: () => Promise<T>): Promise<T> => {
    mutations.current += 1
    try {
      return await change()
    } finally {
      mutations.current -= 1
      if (mutations.current === 0 && hasPending()) wake()
    }
  }, [])

  return { request, track }
}
