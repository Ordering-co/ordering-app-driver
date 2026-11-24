import { stopStage } from '../OrderDetails/orderStages'
import { driverOrderStage } from '../../hooks/useDriverOrderStage'

/**
 * The orders of a store that still have to be picked up. The controller groups every order by its store, and a
 * store's disc on the Map tab means "pick up here": an order the driver already picked up is not at the store
 * any more (its customer's disc is where it goes). It is the stage rule of the order's details and of the list's
 * card (`stopStage`, on the status the driver acts on), not a copy of it.
 */
export const isToPickUp = (order: any) => {
  const stage = stopStage(order, driverOrderStage(order).effectiveStatus)
  return stage === 'route' || stage === 'pickup'
}

/** The store groups with only their orders to pick up; a store with none draws no disc (and has no card). */
export const pickupGroups = (groups: any): Record<string, any[]> => {
  const result: Record<string, any[]> = {}
  Object.entries(groups ?? {}).forEach(([id, orders]: [string, any]) => {
    const pending = (orders ?? []).filter(isToPickUp)
    if (pending.length) result[id] = pending
  })
  return result
}
