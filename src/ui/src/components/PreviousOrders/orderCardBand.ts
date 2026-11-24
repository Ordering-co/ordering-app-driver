import type { BadgeVariant } from '../shared/OBadge'
import { orderStatusVariant } from '../shared/orderStates'
import type { CardTime } from './orderCardTime'

/**
 * The tone of an order card's status band: one of the badge's soft variants (`components.badge.variants.<tone>_soft`: the tint and the
 * text color the theme already has for a state), so the band and the chips of the same state agree and the editor changes both.
 *
 * - An order that is still open says its time's state: on time the brand's tone (`primary_soft`), at risk the warning's, late the
 *   danger's. With no time on the card (no enterprise plan) there is no state: the brand's.
 * - An order that is over (the completed and cancelled tabs) says how it ended, as its status chip did: completed the success's,
 *   cancelled, rejected or failed the danger's.
 */
export type BandTone = 'primary' | 'warning' | 'danger' | 'success'

export const bandTone = (
  { closed, status, time }: { closed: boolean, status: number | string | null | undefined, time: CardTime | null }
): BandTone => {
  if (closed) {
    const variant = orderStatusVariant(status)
    return variant === 'success' || variant === 'danger' ? variant : 'primary'
  }
  return time?.state ?? 'primary'
}

/** The badge variant that paints a tone: `primary_soft`, `warning_soft`, `danger_soft`, `success_soft`. */
export const bandVariant = (tone: BandTone): BadgeVariant => `${tone}_soft`
