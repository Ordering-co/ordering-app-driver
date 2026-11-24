import { useSyncExternalStore } from 'react'

/**
 * Where the route gets its orders: the Orders tab's own list, never a second copy of it. The list (`OrdersOption`) draws its entry
 * button through `OrdersRouteEntry`, which hands here the orders the tab shows (the same rows, with the offline queue's stages already
 * on them and the delivery positions the list loaded) and the list's own request to change an order's status. The route's screens
 * read this store, so they show the orders the list shows, in the state it shows them, change when the list does (a socket event, a
 * reload after the driver's own change, the offline queue's sync) and change an order through the same request the card does.
 *
 * It is module state read through `useSyncExternalStore`: the screens are in the stack above the tabs, not inside the list. The entry
 * clears it when it goes away (the list is gone, or the tab is not one the route is about).
 */
export interface RouteSource {
  /** The rows of the tab in view (an order, or a group as the list draws it: `[[group, orders]]`). */
  rows: unknown[]
  /** The list's own status change (`handleChangeOrderStatus` of `OrdersOption`: it loads the list again after a change). */
  changeOrderStatus?: (...args: any[]) => any
}

const EMPTY: RouteSource = { rows: [] }

let current: RouteSource = EMPTY
const listeners = new Set<() => void>()

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

const snapshot = () => current

/** What is handed over right now, for a reader that is not a component. */
export const currentRouteSource = (): RouteSource => current

/** The list hands its rows over; a change of either value tells the screens that read them. */
export const publishRouteSource = (next: RouteSource) => {
  if (next.rows === current.rows && next.changeOrderStatus === current.changeOrderStatus) return
  current = next
  listeners.forEach((listener) => listener())
}

/** The list no longer has orders for the route to show. */
export const clearRouteSource = () => publishRouteSource(EMPTY)

/** What the route is about right now. */
export const useRouteSource = (): RouteSource => useSyncExternalStore(subscribe, snapshot, snapshot)
