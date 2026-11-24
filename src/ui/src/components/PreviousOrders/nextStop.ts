import { stopStage } from '../OrderDetails/orderStages'

/** Whose address the driver goes to next. */
export type StopParty = 'business' | 'customer'

export interface NextStop {
  party: StopParty
  address: string
}

/**
 * The address the driver goes to now, for the line of an order's card: the store while picking up (and before
 * the order is on its way: the store comes first), the customer once it is picked up, nothing once it is over
 * or when the order does not carry that address. Which stop is current is the order's details' own rule
 * (`stopStage`), so the card and the details cannot disagree; the address is what the list's order already has.
 */
export const nextStop = (order: any, effectiveStatus?: number | null): NextStop | null => {
  const stage = stopStage(order, effectiveStatus)
  if (stage === 'finished') return null
  const party: StopParty = stage === 'delivery' ? 'customer' : 'business'
  const address = order?.[party]?.address
  return typeof address === 'string' && address.trim() ? { party, address: address.trim() } : null
}
