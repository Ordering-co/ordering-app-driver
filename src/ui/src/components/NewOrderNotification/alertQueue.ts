/**
 * What the new-order alert holds while it is open.
 *
 * An alert is one per kind of thing that happened. While one is open, the same kind arriving again is added to
 * it (a count, not a second alert), and a different kind waits behind it: when the driver closes the open one the
 * next kind's alert opens with everything it gathered meanwhile. Nothing is dropped and each kind needs one close.
 */

/** A new order, an updated one, a request to take an order (or a group), an updated request, a message. */
export type AlertKind = 'order' | 'order_update' | 'request' | 'request_update' | 'message'

export interface AlertItem {
  /** `o:<order>` or `g:<group>`: what makes two arrivals the same thing. */
  key: string
  orderId?: number | string
  /** A request for a group of orders: the group's number, not the request's. */
  groupId?: number | string
  /** The orders of that group, when the packet says. */
  ordersCount?: number
  /** The order's status: it tells the Orders tab which list the orders are in. */
  status?: number
}

export interface AlertQueue {
  /** The kinds that have something to say, in the order they first arrived: the first is the open alert. */
  kinds: AlertKind[]
  items: Partial<Record<AlertKind, AlertItem[]>>
}

export const emptyQueue: AlertQueue = { kinds: [], items: {} }

/** Adds an arrival: to its kind's alert when there is one (the same thing twice counts once), or as a new one. */
export const addAlert = (queue: AlertQueue, kind: AlertKind, item: AlertItem): AlertQueue => {
  const current = queue.items[kind] ?? []
  const known = current.some((other) => other.key === item.key)
  const items = known ? current.map((other) => (other.key === item.key ? { ...other, ...item } : other)) : [...current, item]
  return {
    kinds: queue.kinds.includes(kind) ? queue.kinds : [...queue.kinds, kind],
    items: { ...queue.items, [kind]: items }
  }
}

/** The open alert's kind and what it gathered; `null` when nothing is open. */
export const openAlert = (queue: AlertQueue): { kind: AlertKind, items: AlertItem[] } | null => {
  const kind = queue.kinds[0]
  return kind ? { kind, items: queue.items[kind] ?? [] } : null
}

/** Closes the open alert: the next kind's one (if any) is the open one now. */
export const closeAlert = (queue: AlertQueue): AlertQueue => {
  const [closed, ...kinds] = queue.kinds
  if (!closed) return queue
  const { [closed]: _gone, ...items } = queue.items
  return { kinds, items }
}
