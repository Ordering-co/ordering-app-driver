/**
 * What an order card writes besides its time and its stop, read from the order of the list's payload and by the rules the order's
 * details already follow. Every function answers `undefined` / `null` when the payload does not carry what it needs: the card then
 * leaves the piece out (never a placeholder).
 */

type Translate = (key: string, fallback?: string) => string

/** The gateway of a card the driver takes to the door: collected on delivery, like cash, though the details do not highlight it. */
const CARD_ON_DELIVERY = 'card_delivery'

/**
 * How many items the order has: the sum of its products' quantities, as the details' products row counts them
 * (`ProductsBlock`). `undefined` when the payload has no products (an assign request may come without them).
 */
export const itemsCount = (order: any): number | undefined => {
  const products: any[] = Array.isArray(order?.products) ? order.products : []
  if (!products.length) return undefined
  return products.reduce((total, product) => total + (Number(product?.quantity) || 0), 0)
}

/** "3 items", "1 item": the small muted text of the chips' row, written with the details' own keys. */
export const itemsText = (order: any, t: Translate): string | undefined => {
  const items = itemsCount(order)
  if (items === undefined) return undefined
  return (items === 1 ? t('ORDER_ITEMS_COUNT_ONE', ':count: item') : t('ORDER_ITEMS_COUNT', ':count: items')).replace(':count:', String(items))
}

/**
 * "Collect cash" or "Paid", by the order's details' one rule (`useOrderPayment`'s `isCashOnly`: the order's only payment is cash, or
 * with no payment event its method is cash): the driver has to collect it. Any other order has nothing to collect and is paid, as long
 * as the payload says how (a payment event or a method); an order paid at the door by card (`card_delivery`) is neither, since
 * the details do not say "collect" for it and it is not paid yet: the card writes nothing. Nothing when the payload says nothing.
 */
export const paymentChip = (order: any, isCashOnly: boolean): 'collect' | 'paid' | null => {
  if (isCashOnly) return 'collect'
  const events: any[] = Array.isArray(order?.payment_events) ? order.payment_events.filter((event: any) => event?.event === 'payment') : []
  const gateways = [order?.paymethod?.gateway, ...events.map((event) => event?.paymethod?.gateway)]
  if (gateways.includes(CARD_ON_DELIVERY)) return null
  return events.length > 0 || !!(order?.paymethod?.gateway || order?.paymethod?.name) ? 'paid' : null
}
