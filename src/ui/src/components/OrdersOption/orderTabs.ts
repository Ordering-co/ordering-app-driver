import dayjs from '@/utils/dayjs'

import { isOfferedStatus } from '../OrderDetails/orderStages'
import { driverOrderStage } from '../../hooks/useDriverOrderStage'
import { flatOrders } from '../../context/OfflineActions/offlineActionsQueue'

/**
 * The tabs of the Orders screen and what each one holds, built on the lists the controller loads (`pending`, `inProgress`, `completed`,
 * `cancelled`; `active`, `completed`, `cancelled` for a project that combines pending and in progress). The controller's lists are the
 * API's (by status); the tabs are the driver's:
 *
 * - `assigned`: the orders given to the driver that he has not accepted yet (the ones whose card offers Reject / Accept): what the
 *   pending list brings and the offered orders of the in-progress list;
 * - `inProgress`: the ones he accepted (his stage is 8 or later);
 * - `active`: a combined project's one tab for both;
 * - `history`: the completed and the cancelled orders, with a chip to narrow it (`HistoryFilter`).
 */
export const LOGISTIC_VIEW = 'logisticOrders'

export type OrdersView = 'assigned' | 'inProgress' | 'active' | 'history' | typeof LOGISTIC_VIEW
export type HistoryFilter = 'all' | 'completed' | 'cancelled'
export type OrderKind = 'assigned' | 'inProgress' | 'active' | 'completed' | 'cancelled'

/** The statuses of each of the controller's lists, by the list's key (the wrapper's `tabs`). */
export type ListTags = Record<string, number[] | undefined>

/** The tabs a project has, in the order they are drawn: the first is the one the screen opens on. */
export const viewsFor = (combined: boolean): Exclude<OrdersView, typeof LOGISTIC_VIEW>[] =>
  combined ? ['active', 'history'] : ['assigned', 'inProgress', 'history']

/** The controller's lists of a project. */
export const listKeysFor = (combined: boolean): string[] =>
  combined ? ['active', 'completed', 'cancelled'] : ['pending', 'inProgress', 'completed', 'cancelled']

/** The tab a screen shows: the one asked for when the project has it (the requests' always), else the first. */
export const resolveView = (view: OrdersView, combined: boolean): OrdersView =>
  view === LOGISTIC_VIEW || (viewsFor(combined) as string[]).includes(view) ? view : viewsFor(combined)[0]

/** The tab and chip a controller list is shown in (what the controller starts on, or a list a caller names). */
export const viewOfList = (listKey: string | undefined, combined: boolean): { view: OrdersView, filter: HistoryFilter } => {
  switch (listKey) {
    case LOGISTIC_VIEW: return { view: LOGISTIC_VIEW, filter: 'all' }
    case 'completed': return { view: 'history', filter: 'completed' }
    case 'cancelled': return { view: 'history', filter: 'cancelled' }
    case 'inProgress': return { view: resolveView('inProgress', combined), filter: 'all' }
    case 'active': return { view: resolveView('active', combined), filter: 'all' }
    case 'pending': return { view: resolveView('assigned', combined), filter: 'all' }
    default: return { view: viewsFor(combined)[0], filter: 'all' }
  }
}

/**
 * The controller's lists a tab needs loaded, in the order they are asked for. In Progress needs only its own list (the orders
 * the driver accepted are in it); Assigned needs both of the project's open lists (the offered orders are in the in-progress one).
 */
export const listsFor = (view: OrdersView, filter: HistoryFilter): string[] => {
  switch (view) {
    case 'assigned': return ['pending', 'inProgress']
    case 'inProgress': return ['inProgress']
    case 'active': return ['active']
    case 'history': return filter === 'all' ? ['completed', 'cancelled'] : [filter]
    default: return []
  }
}

/** The tab key the order card (and its skeleton) understands: the card only tells open orders from finished ones. */
export const cardTabOf = (view: OrdersView): string => {
  switch (view) {
    case 'assigned': return 'pending'
    case 'history': return 'completed'
    default: return view
  }
}

/** Where an order is, from its status: `assigned` for one the driver has not accepted (`isOfferedStatus` of his own stage). */
export const kindOf = (order: any, tags: ListTags, combined: boolean): OrderKind | null => {
  const status = Number(order?.status)
  if (combined) {
    if (tags.active?.includes(status)) return 'active'
  } else {
    if (tags.pending?.includes(status)) return 'assigned'
    if (tags.inProgress?.includes(status)) return isOfferedStatus(driverOrderStage(order).effectiveStatus) ? 'assigned' : 'inProgress'
  }
  if (tags.completed?.includes(status)) return 'completed'
  if (tags.cancelled?.includes(status)) return 'cancelled'
  return null
}

const byIdDesc = (a: any, b: any) => Number(b.id) - Number(a.id)

/**
 * The order as the lists hand it to the screen: without the SDK's `api` (the class the API's answer casts it to keeps its client there:
 * a function, which the navigation state warns about when the order goes to the details as a route param). One plain copy per order.
 */
const plainOrders = new WeakMap<object, any>()
export const withoutApi = (order: any) => {
  if (!order || typeof order !== 'object' || !('api' in order)) return order
  let plain = plainOrders.get(order)
  if (!plain) {
    plain = { ...order }
    delete plain.api
    plainOrders.set(order, plain)
  }
  return plain
}

/** When the copy of an order was last changed (`updated_at`, UTC), written to compare as text; nothing when it has none. */
const updatedKey = (order: any): string => {
  const written = order?.updated_at
  return typeof written === 'string' && written ? written.replace('T', ' ').slice(0, 19) : ''
}

/**
 * The orders of every list, each once, split by kind, newest first. An order can be in two lists (it changed status and the lists
 * were not loaded at the same time): **the newest copy wins**, whatever list holds it, and it is classified by that copy's status. The
 * newest is the one with the later `updated_at`; with equal or missing ones, the copy of the list loaded most recently (`recency`: a
 * bigger number is later; a list without one counts by its place in the project's lists).
 */
export const splitOrders = (
  lists: Record<string, any[]>,
  tags: ListTags,
  combined: boolean,
  recency: Record<string, number> = {}
): Record<OrderKind, any[]> => {
  const found = new Map<string, { order: any, stamp: number, updated: string }>()
  listKeysFor(combined).forEach((key, place) => {
    const stamp = recency[key] ?? place
    for (const order of flatOrders(lists[key] ?? [])) {
      const candidate = { order, stamp, updated: updatedKey(order) }
      const held = found.get(String(order.id))
      const newer = held && candidate.updated && held.updated && candidate.updated !== held.updated
        ? candidate.updated > held.updated
        : !held || candidate.stamp >= held.stamp
      if (newer) found.set(String(order.id), candidate)
    }
  })
  const out: Record<OrderKind, any[]> = { assigned: [], inProgress: [], active: [], completed: [], cancelled: [] }
  found.forEach(({ order }) => {
    const kind = kindOf(order, tags, combined)
    if (kind) out[kind].push(withoutApi(order))
  })
  ;(Object.keys(out) as OrderKind[]).forEach((kind) => out[kind].sort(byIdDesc))
  return out
}

/**
 * When an order that is over ended, as an instant to sort by: the moment the API reports it reached its last status
 * (`reporting_data.at['status:N']`, UTC), else its delivery time. It follows what the card's band writes (`endedAt` in
 * `PreviousOrders/orderCardTime.ts`, which is private to it): the same fields, in the same order.
 */
export const endedAtMs = (order: any): number => {
  const reported = order?.reporting_data?.at?.[`status:${order?.status}`]
  const written = typeof reported === 'string' && reported
    ? reported.replace('T', ' ').slice(0, 19)
    : order?.delivery_datetime_utc || order?.delivery_datetime || ''
  const moment = written ? dayjs.utc(written) : null
  return moment && moment.isValid() ? moment.valueOf() : 0
}

/** What a tab holds, in the order it is drawn (History's `all` is both lists, the latest ended first). */
export const ordersOfView = (split: Record<OrderKind, any[]>, view: OrdersView, filter: HistoryFilter): any[] => {
  switch (view) {
    case 'assigned': return split.assigned
    case 'inProgress': return split.inProgress
    case 'active': return split.active
    case 'history':
      if (filter === 'completed') return split.completed
      if (filter === 'cancelled') return split.cancelled
      return [...split.completed, ...split.cancelled].sort((a, b) => (endedAtMs(b) - endedAtMs(a)) || byIdDesc(a, b))
    default: return []
  }
}

/** The orders as the controller's lists hand them to the cards: the ones of a cart group together, `[[groupId, orders]]`. */
export const groupByCart = (orders: any[]): any[] => {
  const out: any[] = []
  const seen = new Set<string>()
  for (const order of orders) {
    const group = order?.cart_group_id
    if (!group) {
      out.push(order)
    } else if (!seen.has(String(group))) {
      seen.add(String(group))
      out.push([[String(group), orders.filter((other) => other?.cart_group_id === group)]])
    }
  }
  return out
}

/** The tab an order of this status is shown in (the new-order alert's button asks for it); the first tab for an unknown status. */
export const viewForStatus = (status: number | undefined, tags: ListTags, combined: boolean): { view: OrdersView, filter: HistoryFilter } => {
  const first = { view: viewsFor(combined)[0], filter: 'all' as HistoryFilter }
  if (typeof status !== 'number') return first
  if (tags.completed?.includes(status) || tags.cancelled?.includes(status)) return { view: 'history', filter: 'all' }
  if (combined) return tags.active?.includes(status) ? { view: 'active', filter: 'all' } : first
  if (tags.pending?.includes(status)) return first
  if (tags.inProgress?.includes(status)) return { view: isOfferedStatus(status) ? 'assigned' : 'inProgress', filter: 'all' }
  return first
}

/** Marks the controller's lists as not loaded (rows and pagination stay until a load replaces them). */
export const markListsStale = (groups: any, keys: string[]) => {
  const next = { ...groups }
  for (const key of keys) {
    if (next[key]) next[key] = { ...next[key], fetched: false, error: null }
  }
  return next
}

/** Whether the list has a next page to ask for. */
export const listHasMore = (group: any): boolean =>
  !!group?.pagination?.totalPages && group.pagination.currentPage < group.pagination.totalPages

/**
 * Whether a list's `error` is a load that could not reach the API (and not the API's answer about the list). The controller writes
 * `[err.message ?? 'ERROR']` when a load throws, and what throws is the request itself: an XHR error event (no message, so `ERROR`),
 * a "Network request failed" or "Network Error". The API's own errors are its messages (a refused token, a bad query) and an
 * answer of 5xx is `Internal error`: those are about the list and are told. `offline` is the connection itself saying there is none:
 * then every error of a load is that one.
 */
export const isNetworkFailure = (error: unknown, offline: boolean): boolean => {
  const messages = (Array.isArray(error) ? error : [error]).filter((message) => message !== null && message !== undefined && message !== '')
  if (!messages.length) return false
  if (offline) return true
  return messages.every((message) => /^ERROR$|network/i.test(String(typeof message === 'object' ? (message as any)?.message ?? '' : message)))
}
