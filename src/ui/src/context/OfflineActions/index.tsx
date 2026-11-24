import React, { useState, createContext, useEffect, useContext, useRef } from 'react';
import { AppState } from 'react-native';
import { useNetInfo } from '@react-native-community/netinfo';
import { isLocalSimulatorMode } from '../../../../onboarding/ios-local-mode';

import { _retrieveStoreData, _setStoreData, _removeStoreData } from '../../providers/StoreUtil'
import { useApi, useConfig, useSession, useEvent, useWebsocket, useToast, useLanguage, ToastType } from '@components'
import { useSecureOrderId } from '../../hooks/useSecureOrderId'
import { apiErrorText } from '../../utils'
import {
  MAX_REFUSALS,
  OrderRun,
  SendOutcome,
  applyRunResults,
  bodyToSync,
  classifyAnswer,
  flatOrders,
  parseStoredOfflineActions,
  retryDelay
} from './offlineActionsQueue'

const QUEUE_KEY = 'offline_actions_array'
/** The project's switch for keeping changes made offline, as the last loaded config left it (a boolean). */
const ALLOW_KEY = 'allow_save_changes_offline'
/** The project's switch for showing the orders in three tabs (pending and in progress together), as the last loaded config left it (a boolean). */
const COMBINE_KEY = 'combine_pending_and_progress_orders'

/**
 * Whether the project saves changes made without a connection, from its config: `true` or `false` once the config is known, `undefined`
 * while it is not. The config is known once it has loaded (the key is there with its value, or it is not there at all: a project that
 * does not set it does not save changes); a config that has not loaded (still loading, or its request failed, which leaves it empty) is
 * not an answer.
 */
export const projectSavesChangesOffline = (configState?: { loading?: boolean, configs?: any }): boolean | undefined => {
  const configs = configState?.configs
  const own = configs?.allow_save_changes_offline
  if (own && typeof own === 'object') return String(own.value ?? '') === '1'
  const loaded = !configState?.loading && !!configs && Object.keys(configs).length > 0
  return loaded ? false : undefined
}

/**
 * Whether the project shows its orders in three tabs (`combine_pending_and_progress_orders`), from its config: `true` or `false` once the
 * config is known, `undefined` while it is not (the same rule as `projectSavesChangesOffline`: a config that has loaded without the key says
 * "not combined", one that has not loaded, or whose request failed, says nothing).
 */
export const projectCombinesTabs = (configState?: { loading?: boolean, configs?: any }): boolean | undefined => {
  const configs = configState?.configs
  const own = configs?.[COMBINE_KEY]
  if (own && typeof own === 'object') return String(own.value ?? '') === '1'
  const loaded = !configState?.loading && !!configs && Object.keys(configs).length > 0
  return loaded ? false : undefined
}

type State = {
  isNetConnected: boolean | null
  /** The project's tabs: three (`true`) or four (`false`); `null` while neither the config nor an earlier run's kept value says (see `combinedTabsRead`). */
  isCombinedTabs: boolean | null
  /** The kept value has been read (or the config answered before it): a `null` `isCombinedTabs` then means nothing was kept. */
  combinedTabsRead: boolean
  canSaveChangesOffline: boolean | null
  /** A sync run is sending the queue: the lists must not load until it ends (what they would bring is the state from before its requests). */
  syncing?: boolean
  actions: { [key: string]: any }
  orders: { [key: string]: any } | null
}

type SyncReason = 'connect' | 'retry' | 'foreground'

type Functions = {
  applyOffAction: (changes: any) => any
  registerOffOrder: (order: any) => any
  setState: React.Dispatch<React.SetStateAction<State>>
}

/** How long a request of a sync run may take (ms) before the run counts it as not sent. */
const SYNC_REQUEST_LIMIT_MS = 30000

const defaultState = {
  isNetConnected: null,
  isCombinedTabs: null,
  combinedTabsRead: false,
  canSaveChangesOffline: false,
  syncing: false,
  actions: {},
  orders: null,
}


export const OfflineActionsContext = createContext<[State, Functions]>([
  defaultState,
  {
    applyOffAction: () => {},
    registerOffOrder: () => {},
    setState: () => {}
  }
]);

export const OfflineActionsProvider = (props: any) => {
  const netInfo = useNetInfo()
  const [ordering] = useApi()
  const [configState] = useConfig()
  const [{ token }] = useSession()
  const [events] = useEvent()
  const socket = useWebsocket()
  const [, t] = useLanguage()
  const [, { showToast }] = useToast()
  const { maskOrderId } = useSecureOrderId()

  const [state, setState] = useState<State>(() => {
    const combines = projectCombinesTabs(configState)
    return {
      isNetConnected: netInfo.isConnected,
      isCombinedTabs: combines ?? null,
      combinedTabsRead: combines !== undefined,
      canSaveChangesOffline: false,
      syncing: false,
      actions: {},
      orders: null
    }
  })

  // The project's switch is the loaded config's, whenever it is known and as often as it changes: the buttons of the list and of the order's bar,
  // and the queue, all read it from here. What an earlier run kept stands in only until the config has loaded (an app opened with no connection
  // never loads it) and is never read after it, and a value that is not known yet is "off", never "on".
  const projectAllows = projectSavesChangesOffline(configState)
  const configKnown = useRef(false)
  useEffect(() => {
    if (projectAllows === undefined) return
    configKnown.current = true
    setState(previous => previous.canSaveChangesOffline === projectAllows ? previous : { ...previous, canSaveChangesOffline: projectAllows })
    _setStoreData(ALLOW_KEY, projectAllows)
  }, [projectAllows])
  useEffect(() => {
    let alive = true
    _retrieveStoreData(ALLOW_KEY).then((kept) => {
      if (alive && !configKnown.current && typeof kept === 'boolean') {
        setState(previous => ({ ...previous, canSaveChangesOffline: kept }))
      }
    }).catch(() => {})
    return () => { alive = false }
  }, [])

  // The project's tabs follow the loaded config the same way: it wins whenever it is known, the value an earlier run kept stands in only until
  // it loads (an app opened with no connection never loads it), and this provider is the one that writes it. The Orders screen reads it from
  // here (`useCombinedTabs`), so its tabs are right from their first paint and nothing reads the storage on the screen.
  const projectCombines = projectCombinesTabs(configState)
  const combineKnown = useRef(false)
  useEffect(() => {
    if (projectCombines === undefined) return
    combineKnown.current = true
    setState(previous => previous.isCombinedTabs === projectCombines && previous.combinedTabsRead ? previous : { ...previous, isCombinedTabs: projectCombines, combinedTabsRead: true })
    _setStoreData(COMBINE_KEY, projectCombines)
  }, [projectCombines])
  useEffect(() => {
    let alive = true
    const settle = (kept: any) => {
      if (!alive) return
      // A kept value read after the config answered never takes its place.
      const standIn = !combineKnown.current && typeof kept === 'boolean'
      setState(previous => previous.combinedTabsRead && !standIn ? previous : { ...previous, combinedTabsRead: true, ...(standIn && { isCombinedTabs: kept }) })
    }
    _retrieveStoreData(COMBINE_KEY).then(settle).catch(() => settle(null))
    return () => { alive = false }
  }, [])

  const getStatusById = (id: number) => {
    if (!id && id !== 0) return
    const active = [0, 3, 4, 7, 8, 9, 13, 14, 18, 19, 20, 21, 22, 23, 24, 25, 26]
    const pending = [0, 13]
    const inProgress = [3, 4, 7, 8, 9, 14, 18, 19, 20, 21, 22, 23, 24, 25, 26]
    const completed = [1, 11, 15]

    const status = pending.includes(id)
      ? 'pending'
      : inProgress.includes(id)
        ? 'inProgress'
        : completed.includes(id)
          ? 'completed'
          : 'cancelled'

    const combinedStatus = active.includes(id)
      ? 'active'
      : completed.includes(id)
        ? 'completed'
        : 'cancelled'

    return state.isCombinedTabs ? combinedStatus : status
  }

  // The queue is written one call at a time, each on top of what the one before left: calls that come in a row from one
  // screen (a group's changes, one per order) hold the same render's `state`, so building the queue from it kept only the last.
  const queueWrites = useRef<Promise<unknown>>(Promise.resolve())

  /**
   * Queues a change (or a list of them, written together) for when the connection returns. The queue is read from the storage,
   * which is what a sync replays, and the state follows it. `false` when the project does not allow saving changes offline.
   */
  const applyOffAction = async (changes: any) => {
    if (state.canSaveChangesOffline === false) return false

    const write = queueWrites.current.then(async () => {
      const queued = parseStoredOfflineActions(await _retrieveStoreData(QUEUE_KEY))
      const actions: Record<string, any[]> = { ...queued }
      for (const change of [changes].flat()) {
        const orderId = change?.data?.orderId
        const previous = actions[orderId]
        actions[orderId] = [...(Array.isArray(previous) ? previous : []), change]
      }

      await _setStoreData(QUEUE_KEY, actions)
      setState(state => ({ ...state, actions }))
      return true
    })
    // A write that failed must not stop the ones after it; its caller still hears of it.
    queueWrites.current = write.catch(() => {})
    return write
  }

  // Registering an order reads the stored lists and writes them back: one at a time, as the queue's own writes are (a group
  // registers an order after another, and a write must be on top of the one before).
  const registerWrites = useRef<Promise<unknown>>(Promise.resolve())

  /**
   * Keeps an order as it will be once its queued change syncs, in the stored list of its new status (the lists the offline list
   * draws). The order is taken out of every stored list it is in first, wherever that is (its old status's list, a group as the
   * list holds it): the status it had is no longer needed to find it, and a second change of an order does not leave a copy behind.
   */
  const registerOffOrder = async (order: any) => {
    if (!order) return

    const write = registerWrites.current.then(async () => {
      const newStatusString = getStatusById(order?.status)
      const ordersStoraged: any = {}

      for (const status of ['active', 'pending', 'inProgress', 'completed', 'cancelled']) {
        const stored = await _retrieveStoreData(`${status}_orders`)
        const others = flatOrders(stored).filter((_order: any) => _order.id !== order.id)
        const had = others.length !== flatOrders(stored).length
        if (!had && status !== newStatusString) continue

        ordersStoraged[status] = (status === newStatusString ? [...others, order] : others)
          .sort((a: any, b: any) => b.id - a.id)
        await _setStoreData(`${status}_orders`, ordersStoraged[status])
      }
      if (Object.keys(ordersStoraged).length) {
        setState(state => ({ ...state, orders: { ...(state.orders ?? {}), ...ordersStoraged } }))
      }
    })
    registerWrites.current = write.catch(() => {})
    return write
  }

  // ---- Syncing the queue --------------------------------------------------------------------------------------------------
  // A run replays the queue order by order and writes what it learned (what was sent leaves, what was refused counts) on top of the
  // storage. Runs are one at a time. The queue tries again by itself while it holds changes and there is a connection: after 15 s,
  // 30 s, 1 min and then every 2 min, when the app comes back to the foreground and when the connection returns. No timer runs
  // while the queue is empty; the timers stop when the queue empties, when the connection goes, on sign-out and on unmount.
  const connected = useRef(netInfo.isConnected)
  connected.current = netInfo.isConnected
  const running = useRef(false)
  const rerun = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const tries = useRef(0)
  const alive = useRef(true)
  // The timers and the foreground listener call the latest run, as the screen is now (its token, its language).
  const latestRun = useRef<(reason: SyncReason) => Promise<void>>(async () => {})

  const stopRetries = () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
  }

  const scheduleRetry = () => {
    stopRetries()
    const delay = retryDelay(tries.current)
    tries.current += 1
    timer.current = setTimeout(() => {
      timer.current = null
      latestRun.current('retry')
    }, delay)
  }

  const updateOrderStatus = async (orderId: string, body: any): Promise<SendOutcome> => {
    try {
      // A request that never answers (it was sent as the connection changed) ends as a transient failure: the run goes on, and the queue
      // tries again, instead of holding every run (and the lists that wait for it) for good.
      let limit: ReturnType<typeof setTimeout> | undefined
      const answer = await Promise.race([
        ordering.setAccessToken(token).orders(orderId).save(body),
        new Promise<null>((resolve) => { limit = setTimeout(() => resolve(null), SYNC_REQUEST_LIMIT_MS) })
      ]).finally(() => clearTimeout(limit))
      return answer ? classifyAnswer(answer) : { kind: 'transient' }
    } catch {
      // No answer, a network error or a 5xx (the SDK rejects those): the change stays and is tried again.
      return { kind: 'transient' }
    }
  }

  /** Posts the earlier changes of an order as a message to the business; `true` when it went out (so it is not posted again). */
  const handleSendMessage = async (offlineData: any) => {
    try {
      const _canRead = [0, 2, 3, 4]
      const body = {
        comment: offlineData?.message,
        type: 2,
        can_see: _canRead.join(',')
      }
      const response = await fetch(`${ordering.root}/orders/${offlineData?.orderId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'X-App-X': ordering.appId,
          'X-Socket-Id-X': socket?.getId()
        },
        body: JSON.stringify(body)
      })
      await response.json()
      return true
    } catch {
      return false
    }
  }

  const asId = (id: string) => (Number.isNaN(Number(id)) ? id : Number(id))

  /** Sends the last change of each order (and tells the earlier ones, once): what each request came to. */
  const replay = async (queued: Record<string, any[]>) => {
    const runs: Record<string, OrderRun> = {}
    const refusals: Array<{ id: string, message: string, dropped: boolean }> = []

    for (const orderId of Object.keys(queued)) {
      const changes = queued[orderId] ?? []
      if (!changes.length) continue

      // The earlier changes are only told to the business as a message, once: a retry does not post them again.
      const untold = changes.slice(0, -1).filter((change: any) => !change?.told)
      let told = changes.length > 1
      if (untold.length) {
        const message = [...untold].reverse()
          .map((obj: any) => Object.entries(obj?.data?.body ?? {}).map(([clave, valor]) => `${clave}: '${valor}'`).join(', '))
          .join(', ')
        told = await handleSendMessage({ message, orderId })
      }

      const outcome = await updateOrderStatus(orderId, bodyToSync(changes))
      let kind: OrderRun['outcome'] = outcome.kind
      if (outcome.kind === 'refused') {
        // The count lives with the queued change, so a restart does not start it again.
        const attempts = (changes[changes.length - 1]?.attempts ?? 0) + 1
        const dropped = attempts >= MAX_REFUSALS
        refusals.push({ id: orderId, message: apiErrorText(outcome.result, t), dropped })
        if (dropped) kind = 'dropped'
      }
      runs[orderId] = { outcome: kind, count: changes.length, told }
    }
    return { runs, refusals }
  }

  /** Writes a run's results on top of the storage as it is now, so a change queued while the run went is not lost. */
  const settle = (runs: Record<string, OrderRun>) => {
    const write = queueWrites.current.then(async () => {
      const next = applyRunResults(parseStoredOfflineActions(await _retrieveStoreData(QUEUE_KEY)), runs)
      if (Object.keys(next).length) await _setStoreData(QUEUE_KEY, next)
      else await _removeStoreData(QUEUE_KEY)
      setState(state => ({ ...state, actions: next }))
      return next
    })
    queueWrites.current = write.catch(() => {})
    return write
  }

  /** One toast for a run: the first order's number and the API's message in `template`, and "and N more" for the others. */
  const tellRefusals = (items: Array<{ id: string, message: string }>, template: string) => {
    const first = items[0]
    const text = template.replace('_order_', () => maskOrderId(first.id)).replace('_message_', () => first.message)
    showToast(
      ToastType.Error,
      items.length > 1
        ? t('LIST_AND_N_MORE', '_list_ and _count_ more').replace('_list_', () => text).replace('_count_', String(items.length - 1))
        : text
    )
  }

  const runSync = async (reason: SyncReason) => {
    if (isLocalSimulatorMode()) return
    if (running.current) {
      // One run at a time: a connection that came back while one runs is run again after it; a retry is only the schedule's.
      if (reason !== 'retry') rerun.current = true
      return
    }
    if (!alive.current || !connected.current || state.canSaveChangesOffline === false) return

    running.current = true
    stopRetries()
    if (reason !== 'retry') tries.current = 0
    let next: Record<string, any[]> = {}
    let retry = false
    let flagged = false
    try {
      const queued = parseStoredOfflineActions(await _retrieveStoreData(QUEUE_KEY))
      if (Object.keys(queued).length) {
        // The screens hold their loads while the run's requests are out: a list asked now would be the server's from before them.
        flagged = true
        setState(previous => ({ ...previous, syncing: true }))
        const { runs, refusals } = await replay(queued)
        next = await settle(runs)

        const outcomes = Object.entries(runs)
        const ids = (kind: OrderRun['outcome']) => outcomes.filter(([, run]) => run.outcome === kind).map(([id]) => id)
        const sent = ids('sent')
        const dropped = ids('dropped')

        // Told once per run, after every request of the run has answered and the queue was written: the orders list loads again
        // on it (`OrdersOption`), so the rows show what the server holds now (for a dropped change, the real stage) with no refresh.
        if (sent.length || dropped.length) events.emit('offline_order_updated', [...sent, ...dropped].map(asId))

        // The driver is told of a refusal once per run. A change dropped after its last try is the news (it was not applied).
        const droppedRefusals = refusals.filter((refusal) => refusal.dropped)
        if (droppedRefusals.length) {
          tellRefusals(droppedRefusals, t('OFFLINE_CHANGE_DISCARDED', 'The change to order No. _order_ was not applied: _message_'))
        } else if (refusals.length) {
          tellRefusals(refusals, t('OFFLINE_CHANGE_NOT_SYNCED', 'The change to order No. _order_ could not be sent: _message_'))
        }

        if (sent.length) tries.current = 0
        retry = outcomes.some(([, run]) => run.outcome === 'transient' || run.outcome === 'refused')
      }
    } finally {
      running.current = false
      if (flagged && alive.current) setState(previous => ({ ...previous, syncing: false }))
    }

    if (rerun.current) {
      rerun.current = false
      latestRun.current('connect')
    } else if (retry && token && alive.current && connected.current && Object.keys(next).length) {
      scheduleRetry()
    }
  }
  latestRun.current = runSync

  const actionsFromStorage = async (isConnected: boolean) => {
    // The orders kept for the offline list belong to that stretch without a connection: back online the lists load their own,
    // and the next stretch starts from what the lists held then (a copy kept from this one would show orders gone stale).
    setState(state => ({ ...state, isNetConnected: isConnected, ...(isConnected && { orders: null }) }))
    const storedActions = parseStoredOfflineActions(await _retrieveStoreData(QUEUE_KEY))

    if (isConnected && Object.keys(storedActions).length) {
      await runSync('connect')
      return
    }

    if (Object.keys(storedActions).length) {
      setState(state => ({ ...state, actions: storedActions }))
    }
  }

  useEffect(() => {
    if (netInfo.isConnected === null || state.canSaveChangesOffline === false) return
    actionsFromStorage(netInfo.isConnected)
  }, [netInfo.isConnected, state.canSaveChangesOffline])

  // The timers stop when the connection goes, on sign-out and on unmount.
  useEffect(() => { if (netInfo.isConnected === false) stopRetries() }, [netInfo.isConnected])
  useEffect(() => { if (!token) stopRetries() }, [token])
  useEffect(() => () => {
    alive.current = false
    stopRetries()
  }, [])

  // The app coming back to the foreground tries the queue again (a run with an empty queue reads the storage and stops).
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (appState) => {
      if (appState === 'active') latestRun.current('foreground')
    })
    return () => subscription.remove()
  }, [])

  const functions: any = {
    applyOffAction,
    registerOffOrder,
    setState
  }

  return (
    <OfflineActionsContext.Provider value={[{ ...state, isNetConnected: netInfo.isConnected }, functions]}>
      {props.children}
    </OfflineActionsContext.Provider>
  );
};

export const useOfflineActions = () => {
  const actionsManager = useContext(OfflineActionsContext)
  return actionsManager || [defaultState, {}]
}
