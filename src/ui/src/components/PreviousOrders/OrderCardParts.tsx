import React from 'react'
import { View } from 'react-native'

import { Icon, OBadge, OText } from '../shared'
import { bandToneStyles } from './styles'
import type { BandTone } from './orderCardBand'

/**
 * The pieces of an order card, as the approved drawing has them (the business app's status band, "D3"): the status band (the status
 * and the time, in the tint of the time's state), the header (the store's logo, its name over the title, the order's total at the end),
 * the next stop's line and the chips. `OrderItem` decides which of them an order has; each one is drawn only with what it is given, so
 * a piece the theme hides or the payload does not carry leaves no view.
 */
type Styles = Record<string, any>

interface HeaderProps {
  /** The store's logo (or what stands for it): the first thing of the header. */
  logo?: React.ReactNode
  /** The line over the title: the store's name (and the group's). */
  storeName?: string
  /** "#1049 · Nina Ross". */
  title?: string
  /** The store's name in the muted ink (a request another driver holds). */
  muted?: boolean
  /** What follows the title: the sync cloud and the unread dot. */
  marks?: React.ReactNode
  /** The order's total written; none leaves it out. */
  total?: string
  styles: Styles
  /** The line of the title that the card is `locked`. */
  lockedStyle?: any
}

export const OrderCardHeader = ({ logo, storeName, title, muted = false, marks, total, styles, lockedStyle }: HeaderProps) => (
  <View style={styles.header}>
    {logo}
    <View style={styles.info}>
      {!!storeName && (
        <OText style={[styles.storeName, muted && lockedStyle]} numberOfLines={1} testID='order-card-store-name'>{storeName}</OText>
      )}
      {(!!title || !!marks) && (
        <View style={styles.titleRow}>
          {!!title && <OText style={styles.title} numberOfLines={1} testID='order-card-title'>{title}</OText>}
          {marks}
        </View>
      )}
    </View>
    {total !== undefined && <OText preset='h4' style={styles.total} testID='order-card-total'>{total}</OText>}
  </View>
)

interface StopProps {
  party: 'business' | 'customer'
  /** "Pick up at 214 Harbor St": the address ends in an ellipsis when the line is short. */
  text: string
  /** "1.2 km": never cut, so the address shrinks and this does not. */
  distance?: string | null
  styles: Styles
}

/** The next stop's line: the glyph of the stop, "Pick up at 214 Harbor St" (it shrinks) and "· 1.2 km" (it keeps its room; the row's gap is the only space before the "·"). */
export const OrderCardStop = ({ party, text, distance, styles }: StopProps) => (
  <View style={styles.stop}>
    <Icon name={party === 'business' ? 'storefront-outline' : 'location-outline'} size='sm' color='text_muted' />
    <OText preset='body_sm' style={styles.stopText} numberOfLines={1} testID='order-card-stop'>{text}</OText>
    {!!distance && <OText preset='body_sm' style={styles.stopDistance} numberOfLines={1} testID='order-card-distance'>{`· ${distance}`}</OText>}
  </View>
)

interface BandProps {
  /** The status written; none leaves it out. */
  status?: string
  /** The time written ("24 min left"); none leaves it out. */
  time?: string
  tone: BandTone
  theme: any
  styles: Styles
}

/**
 * The status band, edge to edge at the card's top: the status at its start (it takes the room and wraps to as many lines as its words
 * need, never cut) and the time at its end (one text that keeps its width, or goes under the status, at the end, when both cannot share
 * a line), on the tone's tint (`bandToneStyles`). With neither the band is not drawn.
 */
export const OrderStatusBand = ({ status, time, tone, theme, styles }: BandProps) => {
  if (!status && !time) return null
  const look = bandToneStyles(theme, tone)
  return (
    <View style={[styles.band, look.box]} testID='order-card-band'>
      {!!status && <OText style={[styles.bandText, styles.bandStatus, look.text]} testID='order-card-status'>{status}</OText>}
      {!!time && <OText style={[styles.bandText, styles.bandTime, look.text]} testID='order-card-time'>{time}</OText>}
    </View>
  )
}

interface ChipsProps {
  /** The delivery position's chip (a button) or its setter, else the order type's. */
  lead?: React.ReactNode
  payment?: 'collect' | 'paid' | null
  collectText: string
  paidText: string
  items?: string
  styles: Styles
}

/** The chips: the position or the type, Collect cash or Paid, and the number of items; one row that wraps if it must. */
export const OrderChips = ({ lead, payment, collectText, paidText, items, styles }: ChipsProps) => {
  if (!lead && !payment && !items) return null
  return (
    <View style={styles.chips} testID='order-card-chips'>
      {lead}
      {!!payment && (
        <OBadge variant={payment === 'collect' ? 'warning_soft' : 'success_soft'} style={styles.chip} testID='order-card-payment'>
          {payment === 'collect' ? collectText : paidText}
        </OBadge>
      )}
      {!!items && <OText style={styles.items} testID='order-card-items'>{items}</OText>}
    </View>
  )
}
