import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'

import { showQueuedStages } from '../../context/OfflineActions/offlineActionsQueue'
import {
  cardTabOf,
  groupByCart,
  isNetworkFailure,
  listHasMore,
  listKeysFor,
  listsFor,
  LOGISTIC_VIEW,
  markListsStale,
  ordersOfView,
  resolveView,
  splitOrders,
  viewOfList,
  type HistoryFilter,
  type ListTags,
  type OrdersView
} from './orderTabs'

/**
 * How long a load the controller started may stay unanswered (ms) before the app stops waiting for it. The controller's loads cannot be
 * cancelled and have no time limit of their own: one sent as the connection changed may never answer, and its `loading` flag would hold
 * every later load (and the skeleton) for good. After this long the next load goes out anyway; its answer replaces the stuck one's state.
 */
export const LOAD_LIMIT_MS = 20000
/** How long the connection must hold after it returned before the lists reload by themselves, so one that flaps asks once. */
export const RECONNECT_SETTLE_MS = 1500
/**
 * An outage gives one reload of the lists, though two signals announce its end: the phone's connection (after `RECONNECT_SETTLE_MS`)
 * and the socket's `connect` (a second or more later, once its own retries reach the server). A reload asked for by one signal makes
 * the other do nothing for this long (ms): long enough for the socket to be back, short enough for the next outage to reload again.
 */
export const CATCH_UP_COALESCE_MS = 10000

interface Params {
  /** The controller's lists, by key. */
  ordersGroup: any
  setOrdersGroup?: (update: any) => void
  /** The list the controller works on: its loads (`loadOrders`, `loadMoreOrders`) act on this one. */
  currentTabSelected?: string
  setCurrentTabSelected?: (key: string) => void
  loadOrders?: (...args: any[]) => any
  loadMoreOrders?: (...args: any[]) => any
  /** The wrapper's definitions of the controller's lists (`title`, `tags`). */
  tabs?: Array<{ title: string, tags?: number[] }>
  combined: boolean
  /** The project's tabs are not known yet: nothing loads. */
  tabsPending?: boolean
  isNetConnected?: boolean | null
  /** A search is applied: its results replace the tabs' lists, and the tabs' lists do not load. */
  searching: boolean
  /** The changes still queued (their stage is shown over the server's). */
  queuedChanges?: unknown
  /** The offline queue is sending its changes: no list loads meanwhile (what it would bring is the server's from before them). */
  holdLoads?: boolean
}

/**
 * The Orders screen's tabs on top of the controller's lists.
 *
 * - **The selected tab is the app's.** The controller works on one list at a time (`currentTabSelected`) and moves it by itself (its
 *   switch for combined tabs resets it, it opens on Pending); the tab the driver sees is state here, and changes only when he taps a
 *   tab or a chip, when a navigation asks for one (`setView`), or when the project's tabs change and his has gone (`resolveView`).
 *   The list the controller is on is only how the app gets the lists loaded.
 * - **What a tab needs is loaded one list after another** (the controller's loads are not cancellable and each writes a whole snapshot,
 *   so two at once lose data): the first needed list the controller has not loaded is selected, and its own effect loads it; load more
 *   asks the next page of each needed list that has one, in the same way; a reload asks the controller for its own reload of the first needed
 *   list (which marks every list as not loaded, keeping their rows) and the other needed lists then load as above.
 * - **What a tab shows** is every loaded list's orders, with the queue's stages on top, split by status (`splitOrders`), so an order the
 *   driver accepts moves from Assigned to In Progress with no reload (offline too: its queued status is its status).
 */
export const useOrderTabs = (params: Params) => {
  const {
    ordersGroup, setOrdersGroup, currentTabSelected, setCurrentTabSelected, loadOrders, loadMoreOrders, tabs, combined,
    tabsPending, isNetConnected, searching, queuedChanges, holdLoads
  } = params
  const online = !!isNetConnected
  const offline = isNetConnected === false

  // The tab the screen opens on is the controller's own first list, mapped to the tabs (Pending opens Assigned, Active stays Active).
  const [selection, setSelection] = useState(() => viewOfList(currentTabSelected, combined))
  const view = resolveView(selection.view, combined)
  const filter = selection.filter

  const tagsKey = JSON.stringify((tabs ?? []).map((tab) => [tab.title, tab.tags]))
  const tags = useMemo<ListTags>(() => Object.fromEntries((tabs ?? []).map((tab) => [tab.title, tab.tags])), [tagsKey]) // eslint-disable-line react-hooks/exhaustive-deps
  const keys = useMemo(() => listKeysFor(combined), [combined])
  const needed = useMemo(
    () => (view === LOGISTIC_VIEW || tabsPending || searching ? [] : listsFor(view, filter)),
    [view, filter, tabsPending, searching]
  )

  const jobs = useRef({
    reload: false,
    inFlight: false,
    /** When each list that is loading started to be waited for (a list that is not loading has none). */
    busy: {} as Record<string, number>,
    timers: [] as Array<ReturnType<typeof setTimeout>>,
    more: [] as string[],
    waiters: [] as Array<() => void>
  })
  const [, wake] = useReducer((count: number) => count + 1, 0)

  // A list that loads again is wiped by the controller when its load starts: what it showed stays on screen until it has its answer.
  // And a load that fails for lack of network ends with the list as the load left it (wiped, or with its failure written over the rows):
  // the rows the driver had stay, and so does what the offline list was built from.
  const lastRows = useRef<Record<string, any[]>>({})
  // Which list was loaded last: an order that is in two lists (and with no newer `updated_at` in either) is the copy of that one.
  const seenOrders = useRef<Record<string, any>>({})
  const loadedStamp = useRef<Record<string, number>>({})
  const stamps = useRef(0)
  const model = useMemo(() => {
    const lists: Record<string, any[]> = {}
    for (const key of keys) {
      const group = ordersGroup?.[key]
      const own: any[] = Array.isArray(group?.orders) ? group.orders : []
      const failedEmpty = !!group && !group.loading && !own.length && isNetworkFailure(group.error, offline)
      if (group && !group.loading && !failedEmpty) lastRows.current[key] = own
      if (group && seenOrders.current[key] !== group.orders) {
        seenOrders.current[key] = group.orders
        loadedStamp.current[key] = ++stamps.current + keys.length
      }
      const rows = (group?.loading || failedEmpty) && !own.length && lastRows.current[key] ? lastRows.current[key] : own
      lists[key] = showQueuedStages(rows, queuedChanges)
    }
    return groupByCart(ordersOfView(splitOrders(lists, tags, combined, { ...loadedStamp.current }), view, filter))
  }, [ordersGroup, queuedChanges, tags, combined, keys, view, filter, offline])

  // A list the controller has answered at least once (its own sign: a total): the rows of a view that needs two lists wait for both on
  // the first load (a skeleton, not the first list alone and the second one inserted above it); a list that loads again keeps its rows.
  const everLoaded = useRef<Record<string, boolean>>({})
  for (const key of keys) {
    const group = ordersGroup?.[key]
    if (group && (group.fetched || (group.pagination?.total ?? null) !== null)) everLoaded.current[key] = true
  }

  const groups = needed.map((key) => ordersGroup?.[key])
  // A load that has not answered for `LOAD_LIMIT_MS` is no longer waited for (see `loadsInTheWay`).
  const loading = !offline && needed.some((key) => {
    const since = jobs.current.busy[key]
    return !!ordersGroup?.[key]?.loading && !(since != null && Date.now() - since >= LOAD_LIMIT_MS)
  })
  // Never answered yet (the controller's own sign: no total): online only, offline the lists are the stored ones.
  const unsettled = online && groups.some((group) => !!group && group.pagination?.total === null)
  // A list that failed for lack of network and whose rows are known is not an error: its rows are drawn, with the offline banner.
  const error = needed.map((key) => ordersGroup?.[key]).find((group, index) => {
    if (!group?.error?.length) return false
    return !(isNetworkFailure(group.error, offline) && (lastRows.current[needed[index]]?.length ?? 0) > 0)
  })?.error ?? null
  const hasMore = groups.some((group) => listHasMore(group))
  // (A list that holds orders is not on its first load, whatever its total says: it is loading again.)
  const holdRows = online && needed.some((key) => !!ordersGroup?.[key] && !everLoaded.current[key] && !ordersGroup[key].orders?.length && !ordersGroup[key].error?.length)

  // ---- The lists, one at a time -------------------------------------------------------------------------------------------------
  const previous = useRef<{ tab?: string, online?: boolean }>({})
  // What the last render held: a reload asked between renders (a socket event, a change that ended) reads it.
  const latest = useRef<any>({})
  latest.current = {
    needed, ordersGroup, keys, online, tabsPending, holdLoads, currentTabSelected, setCurrentTabSelected, setOrdersGroup, loadOrders, loadMoreOrders
  }

  /** Wakes the screen once `ms` have passed (a limit that ends is no change of state on its own). */
  const wakeAfter = (ms: number) => {
    const timer = setTimeout(() => {
      jobs.current.timers = jobs.current.timers.filter((other) => other !== timer)
      wake()
    }, ms)
    jobs.current.timers.push(timer)
  }

  /** The app is about to ask the controller for a load of this list: it is waited for from now. */
  const asked = (key?: string) => {
    if (key) jobs.current.busy[key] = Date.now()
    wakeAfter(LOAD_LIMIT_MS + 50)
  }

  /**
   * Whether a load of the controller's lists is in the way of the next one. Each load writes the whole snapshot it started from, so
   * they go one at a time; but one that has not answered for `LOAD_LIMIT_MS` is not waited for: it was sent as the connection changed and
   * may never answer, and nothing could ever load again behind it.
   */
  const loadsInTheWay = (now: any): boolean => {
    const work = jobs.current
    let waiting = false
    for (const key of now.keys as string[]) {
      if (!now.ordersGroup?.[key]?.loading) {
        delete work.busy[key]
        continue
      }
      if (work.busy[key] === undefined) asked(key)
      // A list whose load went out long ago and never ended is no longer waited for: its flag stays until it loads again.
      if (Date.now() - work.busy[key] < LOAD_LIMIT_MS) waiting = true
    }
    return waiting
  }

  /**
   * Starts the reload: the first list the tab needs loads again with the controller's own reload (`newFetch`: its rows stay on screen
   * meanwhile, and every other list is marked as not loaded), and the effect below loads the tab's other lists after it. `newFetch` is
   * asked of one list only: a second one would reset the pagination of the first. A tab with no list (the requests, a search) only
   * marks the lists as not loaded: they load when their tab is next in view. Returns whether it is done (`false`: it has to wait its turn).
   */
  const attemptReload = (controllerLoads: boolean): boolean => {
    const work = jobs.current
    const now = latest.current
    if (!now.online || now.tabsPending) return true
    if (now.holdLoads || work.inFlight || loadsInTheWay(now)) return false
    const first = now.needed[0]
    if (!first) {
      now.setOrdersGroup?.((current: any) => markListsStale(current, now.keys))
      return true
    }
    if (now.currentTabSelected !== first) {
      now.setCurrentTabSelected?.(first)
      return false
    }
    // A list the controller has not loaded is loaded by its own effect in the commit it was selected in.
    if (controllerLoads && !now.ordersGroup?.[first]?.fetched) return true
    work.inFlight = true
    asked(first)
    // The controller's reload may never answer: it holds the sequence for `LOAD_LIMIT_MS` at most.
    const give = setTimeout(() => {
      work.inFlight = false
      wake()
    }, LOAD_LIMIT_MS)
    // The controller's own effect on the selected list runs right after this one in the commit that moved the selection, and reads the
    // same snapshot this load rewrites as it starts (it resets the lists and writes `fetched` off): it would load the list a second
    // time. Asked a turn later, the controller's effect has run on the list as it was, loaded, and sees nothing to load.
    const start = () => now.loadOrders?.({ newFetch: true }, { allStatusses: false })
    Promise.resolve(controllerLoads ? Promise.resolve().then(start) : start())
      .catch(() => undefined)
      .finally(() => {
        clearTimeout(give)
        work.inFlight = false
        wake()
      })
    return true
  }

  useEffect(() => {
    const work = jobs.current
    const release = () => {
      const waiting = work.waiters
      work.waiters = []
      waiting.forEach((resolve) => resolve())
    }
    // The controller loads a list by itself in the commit its tab (or the connection) changes in: this does not ask for the same load.
    const controllerLoads = previous.current.tab !== currentTabSelected || previous.current.online !== online
    previous.current = { tab: currentTabSelected, online }

    if (!online || tabsPending) {
      work.reload = false
      work.more = []
      work.busy = {}
      release()
      return
    }
    // Never two loads at once: each writes the whole snapshot it started from. Nor while the queue is sending its changes.
    if (holdLoads || work.inFlight || loadsInTheWay(latest.current)) return
    if (work.reload) {
      if (attemptReload(controllerLoads)) work.reload = false
      return
    }
    if (!needed.length) {
      work.more = []
      release()
      return
    }
    while (work.more.length && !(needed.includes(work.more[0]) && listHasMore(ordersGroup?.[work.more[0]]))) work.more.shift()
    const next = work.more[0]
    if (next) {
      if (currentTabSelected !== next) {
        setCurrentTabSelected?.(next)
        return
      }
      work.more.shift()
      asked(next)
      loadMoreOrders?.({ allStatusses: false })
      return
    }
    if (!currentTabSelected || !needed.includes(currentTabSelected)) {
      setCurrentTabSelected?.(needed[0])
      return
    }
    const unloaded = needed.find((key) => ordersGroup?.[key] && !ordersGroup[key].fetched && !ordersGroup[key].error?.length)
    if (unloaded) {
      if (currentTabSelected !== unloaded) {
        setCurrentTabSelected?.(unloaded)
      } else if (!controllerLoads) {
        asked(unloaded)
        loadOrders?.({ newFetchCurrent: true })
      }
      return
    }
    release()
  })

  useEffect(() => () => {
    const waiting = jobs.current.waiters
    jobs.current.waiters = []
    waiting.forEach((resolve) => resolve())
    jobs.current.timers.forEach(clearTimeout)
    jobs.current.timers = []
  }, [])

  /** Loads the lists again: the tab's own now, the others when their tab is next opened. Resolves once the tab's lists have answered. */
  const reload = useCallback(() => new Promise<void>((resolve) => {
    const work = jobs.current
    work.waiters.push(resolve)
    work.reload = true
    // At once when it can start (the screen holds the controller on the list it asks for): the loads of the list are not deferred to a render.
    if (attemptReload(false)) work.reload = false
    wake()
  }), []) // eslint-disable-line react-hooks/exhaustive-deps

  /** Asks the next page of each list the tab needs that has one. */
  const loadMore = useCallback(() => {
    const { needed: lists, ordersGroup: groupsNow } = latest.current
    const wanted = lists.filter((key: string) => listHasMore(groupsNow?.[key]))
    if (!wanted.length) return
    jobs.current.more = Array.from(new Set([...jobs.current.more, ...wanted]))
    wake()
  }, [])

  // ---- Selection ----------------------------------------------------------------------------------------------------------------
  const setView = useCallback((next: OrdersView, nextFilter?: HistoryFilter) => {
    setSelection((current) => ({ view: next, filter: nextFilter ?? current.filter }))
    // The requests are a list of their own: the controller loads them when it is on them, and loads them only on a change.
    if (next === LOGISTIC_VIEW && currentTabSelected !== LOGISTIC_VIEW) setCurrentTabSelected?.(LOGISTIC_VIEW)
  }, [currentTabSelected, setCurrentTabSelected])
  const setFilter = useCallback((next: HistoryFilter) => setSelection((current) => ({ ...current, filter: next })), [])

  return {
    view,
    filter,
    setView,
    setFilter,
    tags,
    rows: model,
    loading,
    unsettled,
    error,
    hasMore,
    holdRows,
    loadMore,
    reload,
    /** The rows each list last held, kept through the loads that wiped them or failed (what the offline list is built from). */
    knownRows: () => lastRows.current,
    cardTab: cardTabOf(view)
  }
}
