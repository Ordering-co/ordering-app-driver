import type { BadgeVariant } from './OBadge'

/**
 * An order's status and time state as the theme's states (decision D4): the
 * one place of the app that turns a status number or a time status into a
 * badge variant or a color role (the orders list, the messages list, the
 * driver map, the order's details).
 */

/** Completed (by the store, the driver or the customer). */
const COMPLETED_STATUSES = [1, 11, 15]
/** Rejected, cancelled or failed. */
const NEGATIVE_STATUSES = [2, 5, 6, 10, 12, 16, 17]

/** Pending and in progress are `primary`, completed `success`, rejected / cancelled / failed `danger`. */
export const orderStatusVariant = (status: number | string | null | undefined): BadgeVariant => {
  const code = Number(status)
  if (COMPLETED_STATUSES.includes(code)) return 'success'
  if (NEGATIVE_STATUSES.includes(code)) return 'danger'
  return 'primary'
}

export type TimeState = 'success' | 'warning' | 'danger'

const TIME_STATES: Record<string, TimeState> = { in_time: 'success', at_risk: 'warning', delayed: 'danger' }

/** In time / at risk / delayed as `success` / `warning` / `danger`; null for an order without a time status. */
export const timeStateOf = (timeStatus: string | null | undefined): TimeState | null =>
  (timeStatus && TIME_STATES[timeStatus]) || null

/** The badge of a time state; an order without one (not measured yet) is `neutral`. */
export const timeStatusVariant = (timeStatus: string | null | undefined): BadgeVariant => timeStateOf(timeStatus) ?? 'neutral'
