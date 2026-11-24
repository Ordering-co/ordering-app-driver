import type { BadgeVariant } from './OBadge'

/**
 * The badge variant of an order type (`delivery_type`), by how the order leaves the store (the owner's decision of 2026-11-20 in the
 * business app: two or three colours, not one per type): with a driver (delivery, catering delivery), collected by the customer
 * (pickup, curbside, drive thru, catering pickup) or served in the store (eat in, reservation). The same wherever the driver app
 * writes an order's type as a chip: the order card, a group's rows, "Delivery #N" and the details' position
 * (`components.badge.variants.type_delivery`, `type_pickup`, `type_in_store`). A type the app does not know is the neutral badge.
 *
 *   <OBadge variant={orderTypeVariant(order.delivery_type)}>{orderTypeLabel(t, order.delivery_type)}</OBadge>
 */
const VARIANTS: Record<number, BadgeVariant> = {
  1: 'type_delivery',
  7: 'type_delivery',
  2: 'type_pickup',
  4: 'type_pickup',
  5: 'type_pickup',
  8: 'type_pickup',
  3: 'type_in_store',
  9: 'type_in_store'
}

export const orderTypeVariant = (type: number | string | null | undefined): BadgeVariant => {
  if (type === null || type === undefined || type === '') return 'neutral'
  return VARIANTS[Number(type)] ?? 'neutral'
}

export default orderTypeVariant
