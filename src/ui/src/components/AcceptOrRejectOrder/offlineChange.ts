/**
 * How a status change waits for the connection, for every path that makes one offline (the accept sheet, a reason form, the
 * confirmation of a group's step): one change per order, each with its own id, the way the queue keeps them (one list of
 * changes per order, replayed order by order when the connection returns). `OfflineActions` owns the queue; this is only
 * the shape of what goes into it, so the paths cannot drift apart.
 */

/** The queue's event for an order's new status. */
export const OFFLINE_STATUS_EVENT = 'evt_off_change_order_status'

/** The changes to queue for these orders: the body of the change (plain JSON, never a `FormData`) for each id. */
export const offlineStatusChanges = (ids: Array<number | string>, body: any) =>
  ids.map((id) => ({ event: OFFLINE_STATUS_EVENT, data: { orderId: id, body: { ...body, id } } }))

/**
 * The status an order had before its first queued change: a second change does not replace it (`oldStatus` of a copy that is
 * already waiting for its sync stays), and its shown status is the last change's.
 */
export const statusBeforeQueue = (order: any) => (order?.unsync && order?.oldStatus != null ? order.oldStatus : order?.status)

/** Each of these orders as it will be once the change syncs (what the offline store keeps and the list draws, with its sync flag). */
export const ordersAsQueued = (orders: any[] | undefined, ids: Array<number | string>, status: any) =>
  (orders ?? [])
    .filter((order) => order?.id != null && ids.includes(order.id))
    .map((order) => ({ ...order, status, unsync: true, oldStatus: statusBeforeQueue(order) }))

/**
 * Queues a status change of the given orders (the confirmation of a group's step has no form and no photo) and registers each
 * order as it will be once synced, sending nothing: a request sent and also queued would be applied twice. `false` when the
 * queue could not take it (the project does not save changes offline, or the write failed); an error of the queue is thrown.
 */
export const queueStatusOffline = async ({ applyOffAction, registerOffOrder, ids, orders, status, body }: {
  applyOffAction: (changes: any) => Promise<any> | any
  registerOffOrder: (order: any) => Promise<any> | any
  ids: Array<number | string>
  orders?: any[]
  status: any
  body?: any
}): Promise<boolean> => {
  const queued = await applyOffAction(offlineStatusChanges(ids, { ...body, status }))
  if (queued === false) return false
  for (const order of ordersAsQueued(orders, ids, status)) await registerOffOrder(order)
  return true
}
