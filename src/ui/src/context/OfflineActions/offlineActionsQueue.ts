export function parseStoredOfflineActions (stored: unknown) {
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) {
    return {}
  }

  return stored as Record<string, any[]>
}

export function getOfflineActionsAfterReplay ({
  queued,
  succeededOrderIds
}: {
  queued: Record<string, unknown>
  succeededOrderIds: Array<string | number>
}) {
  const remaining = { ...queued }

  for (const orderId of succeededOrderIds) {
    delete remaining[String(orderId)]
  }

  return {
    remaining,
    shouldClearAll: Object.keys(remaining).length === 0
  }
}

/**
 * Whether the queue holds a change for the order. This is the one thing that marks an order as pending sync (the cloud on its
 * card, the notice of its details): the queue is what a sync replays, so an order is marked while, and only while, it holds a
 * change for it. A copy of the order that says `unsync` decides nothing (it goes stale: a list that was not reloaded, a route's
 * snapshot), and a change that failed to send stays in the queue and so keeps its mark.
 */
export function isOrderQueued (actions: unknown, orderId: unknown) {
  if (!actions || typeof actions !== 'object' || orderId == null) return false
  const held = (actions as Record<string, unknown>)[String(orderId)]
  return Array.isArray(held) ? held.length > 0 : !!held
}

/**
 * The orders of a stored list as plain orders. A list may hold a group as the list draws it (`[[key, orders]]`, what the
 * controller's grouping makes), and an order inside one is not found by its id: a change made to it would be written beside the
 * group and never shown. The same order twice keeps its last copy.
 */
export function flatOrders (list: unknown): any[] {
  const out: any[] = []
  const walk = (item: any) => {
    if (!Array.isArray(item)) {
      if (item && typeof item === 'object') out.push(item)
      return
    }
    for (const entry of item) {
      if (Array.isArray(entry) && entry.length === 2 && Array.isArray(entry[1])) entry[1].forEach(walk)
      else walk(entry)
    }
  }
  walk(list)
  const last = new Map<string, any>()
  out.forEach((order) => { last.set(String(order.id), order) })
  return out.filter((order) => last.get(String(order.id)) === order)
}

/** The queued change of an order that sets a status, the last one; and the delivery position the driver chose, the last one given. */
function queuedState (changes: any) {
  const list: any[] = Array.isArray(changes) ? changes : []
  const bodies = list.map((change) => change?.data?.body).filter(Boolean)
  const latest = <T>(pick: (body: any) => T | null | undefined) => {
    for (let i = bodies.length - 1; i >= 0; i--) {
      const value = pick(bodies[i])
      if (value != null) return value
    }
    return undefined
  }
  return { status: latest((body) => body.status), position: latest((body) => body.delivery_position) }
}

/**
 * The orders the lists show without a connection: the stored lists with the queue's changes on top. The queue is the source of
 * what was changed (it is what will be sent, and it survives a restart), so an order it holds a change for shows the status of
 * its last change and the delivery position chosen, is marked `unsync` and sits in the list of its new status (`tabs` say which
 * statuses each list holds), whatever the stored copy says. Each order is found by its id wherever it is stored, in a group or not.
 * Orders the queue does not touch stay where they were.
 */
export function applyQueuedChanges (
  lists: Record<string, any>,
  actions: unknown,
  tabs: Array<{ title: string, tags?: number[] }> = []
): Record<string, any[]> {
  const flat: Record<string, any[]> = {}
  for (const key of Object.keys(lists)) flat[key] = flatOrders(lists[key])

  const found = new Map<string, { order: any, key: string }>()
  for (const key of Object.keys(flat)) {
    for (const order of flat[key]) {
      if (isOrderQueued(actions, order.id)) found.set(String(order.id), { order, key })
    }
  }
  if (!found.size) return flat

  for (const key of Object.keys(flat)) flat[key] = flat[key].filter((order) => !found.has(String(order.id)))

  for (const [id, { order, key }] of found) {
    const { status, position } = queuedState((actions as Record<string, unknown>)[id])
    const shown = {
      ...order,
      status: status ?? order.status,
      ...(position != null && { delivery_position: position }),
      unsync: true,
      // The status the order had before its first queued change stays: a second change does not replace it.
      oldStatus: order.unsync && order.oldStatus != null ? order.oldStatus : order.status
    }
    const target = tabs.find((tab) => tab?.tags?.includes(shown.status))?.title ?? key
    flat[target] = [...(flat[target] ?? []), shown]
  }
  for (const key of Object.keys(flat)) flat[key] = [...flat[key]].sort((a, b) => b.id - a.id)
  return flat
}

/**
 * The body a sync sends for an order: the last queued change's. The delivery position chosen in an earlier change (the accept
 * sheet's) goes with it when the last one has none, as the accept's request would have carried it: the earlier changes are
 * only told to the business as a message, so the position would be lost with them.
 */
export function bodyToSync (changes: any[]) {
  const list = [...changes].reverse()
  const last = list[0]?.data?.body ?? {}
  if (last.delivery_position != null) return last
  const carried = list.slice(1).map((change) => change?.data?.body?.delivery_position).find((value) => value != null)
  return carried != null ? { ...last, delivery_position: carried } : last
}

/** How long the queue waits before it tries again, by the number of tries since the connection last changed: 15 s, 30 s, 1 min, then every 2 min. */
export const RETRY_DELAYS_MS = [15000, 30000, 60000]
export const RETRY_EVERY_MS = 120000
export const retryDelay = (tries: number) => RETRY_DELAYS_MS[tries] ?? RETRY_EVERY_MS

/** How many times the API may refuse an order's change before the change is dropped (the third refusal drops it). */
export const MAX_REFUSALS = 3

/** What one request of a sync came to. */
export type SendOutcome =
  | { kind: 'sent' }
  /** No answer, a network error, a 5xx, a 408 or a 429: the change stays queued and the schedule tries again, with no word to the driver. */
  | { kind: 'transient' }
  /** The API answered the request with a refusal (a 4xx with its message). */
  | { kind: 'refused', result: unknown }
  /** A 401 is not this path's business: it stays queued as it always did, and is neither counted nor retried by the schedule. */
  | { kind: 'auth' }

/** Reads the answer of `orders(id).save(body)` (an `ApiResponse`: `{ content: { error, result }, status }`). */
export function classifyAnswer (response: any): SendOutcome {
  const content = response?.content
  if (!content) return { kind: 'transient' }
  if (!content.error) return { kind: 'sent' }
  const status = Number(response?.status)
  if (status === 401) return { kind: 'auth' }
  if (status === 408 || status === 429 || status >= 500) return { kind: 'transient' }
  return { kind: 'refused', result: content.result }
}

/** What a run did to an order: the outcome, and whether the earlier changes of the order were told to the business as a message. */
export interface OrderRun {
  outcome: SendOutcome['kind'] | 'dropped'
  /** The order's changes the run read: the first `count` of what the queue holds for it now. */
  count: number
  /** The earlier changes were told (their message was posted): never posted again by a retry. */
  told: boolean
}

/**
 * The queue after a run, on top of what the storage holds now (not on the snapshot the run read: a change queued while the run
 * was going stays). A sent or dropped order loses the changes the run read. One that stays keeps them, with what the run learned:
 * the changes that were told as a message are marked `told`, and a refusal adds to the `attempts` kept on the order's last change
 * (the one the run sent), so a restart does not start the count again.
 */
export function applyRunResults (current: Record<string, any[]>, runs: Record<string, OrderRun>): Record<string, any[]> {
  const next: Record<string, any[]> = {}
  for (const orderId of Object.keys(current)) {
    const changes = [...(current[orderId] ?? [])]
    const run = runs[orderId]
    if (!run || run.count > changes.length) {
      next[orderId] = changes
      continue
    }
    if (run.outcome === 'sent' || run.outcome === 'dropped') {
      const rest = changes.slice(run.count)
      if (rest.length) next[orderId] = rest
      continue
    }
    next[orderId] = changes.map((change, index) => {
      if (index >= run.count) return change
      const isSent = index === run.count - 1
      return {
        ...change,
        ...(run.told && !isSent && { told: true }),
        ...(isSent && run.outcome === 'refused' && { attempts: (change?.attempts ?? 0) + 1 })
      }
    })
  }
  return next
}

/**
 * The orders as the lists draw them online, with the stage of a queued change that is still waiting (one the API refused, or that
 * has not been sent yet) on top of what the server holds: the card keeps the stage the driver queued while it is pending. Only the
 * status and the delivery position change, in place (the list it is in is the server's).
 */
export function showQueuedStages<T> (list: T, actions: unknown): T {
  if (!Array.isArray(list) || !actions || typeof actions !== 'object' || !Object.keys(actions).length) return list
  const one = (order: any) => {
    if (!order || typeof order !== 'object' || !isOrderQueued(actions, order.id)) return order
    const { status, position } = queuedState((actions as Record<string, unknown>)[String(order.id)])
    if ((status == null || status === order.status) && (position == null || position === order.delivery_position)) return order
    return { ...order, ...(status != null && { status }), ...(position != null && { delivery_position: position }) }
  }
  return list.map((item: any) => {
    if (!Array.isArray(item)) return one(item)
    return item.map((entry: any) => (Array.isArray(entry) && Array.isArray(entry[1]) ? [entry[0], entry[1].map(one)] : entry))
  }) as unknown as T
}
