import { StyleSheet } from 'react-native'
import { bandVariant, type BandTone } from './orderCardBand'
import { nativeTextStyle, themeColor, themeControlHeight, themeOpacity, themeRadius, themeSpace } from '@/theme/helpers'

/**
 * The tint of the status band's tone and the color of its texts: the tone's soft badge variant (`components.badge.variants.<tone>_soft`,
 * see `orderCardBand`), so the band and the chips of one state agree and the editor changes both.
 */
export const bandToneStyles = (theme: any, tone: BandTone) => {
  const look = theme.native.components.badge.variants[bandVariant(tone)]
  return { box: { backgroundColor: look.background }, text: { color: look.color } }
}

/**
 * The order card (`components.order_card`), the same for an order, a grouped
 * order and an assign request: the status band (edge to edge at the top: the status at its start and the time at its end, in the
 * tint of the time's state), a header (the store's logo, its name over "#number · customer", and at its end the order's total), the
 * next stop the driver goes to, the chips (the delivery position or the order type, Collect cash or Paid, the number of items) and
 * the quick actions. The card grows with its content; only its band is tinted.
 */
export const orderCardStyles = (theme: any) => {
  const card = theme.native.components.order_card.base
  const avatar = theme.native.components.avatar.sizes.md
  // The band cancels the card's padding at the top and at both sides, so it reaches the card's border, and rounds its top corners to
  // the card's inside (the card's radius less its border), since the card's box does not clip (a shadow would go with the clip).
  const padding = Number(card.padding ?? theme.native.components.card.base.padding) || 0
  const inner = Math.max(0, (card.radius ?? 0) - (card.border?.borderWidth ?? 0))
  return StyleSheet.create({
    // The card's blocks under the band (the header, the stop, the chips, the actions), `sm` apart.
    body: { gap: themeSpace(theme, 'sm') },
    // The status band: at least `sm` tall, `xs` over and under its text and the card's padding at the sides. Its status takes the room
    // (at least 40% of the band, so it never shrinks to a column of letters) and wraps to as many lines as it needs; its time keeps its
    // line, one text that is never cut. If both cannot share a line (a large text size, a long clock time) the time goes under the
    // status, at the end of the band.
    band: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      columnGap: themeSpace(theme, 'sm'),
      rowGap: themeSpace(theme, 'xxs'),
      minHeight: themeControlHeight(theme, 'sm'),
      paddingVertical: themeSpace(theme, 'xs'),
      paddingHorizontal: padding,
      marginTop: -padding,
      marginHorizontal: -padding,
      marginBottom: padding,
      borderTopLeftRadius: inner,
      borderTopRightRadius: inner,
    },
    // 12 over 1.5, semibold (`order_card.base.time_text`): the status and the time are one text role.
    bandText: { ...nativeTextStyle(card.time_text) },
    bandStatus: { flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: '40%' },
    bandTime: { flexShrink: 0, maxWidth: '100%', marginLeft: 'auto', textAlign: 'right' },
    // The time's bone in the skeleton's band, at its end.
    bandTimeBone: { marginLeft: 'auto' },
    // The header: the store's logo, the two lines of text, the total at the end.
    header: { flexDirection: 'row', alignItems: 'center', gap: themeSpace(theme, 'sm') },
    info: { flex: 1, minWidth: 0 },
    name: { ...nativeTextStyle(card.name), color: card.name_color },
    meta: { ...nativeTextStyle(card.meta), color: card.meta_color },
    // The store's name over the title: the card's small muted text, one line ending in an ellipsis.
    storeName: { ...nativeTextStyle(card.meta), color: card.meta_color },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: themeSpace(theme, 'xs') },
    // The strong line: 16 over 1.4, semibold (`order_card.base.title_text`).
    title: { ...nativeTextStyle(card.title_text), color: card.name_color, flexShrink: 1 },
    // The order's total at the header's end, large (`h4`), on one line that keeps its room: the title shrinks, never the amount.
    total: { flexShrink: 0 },
    // The stop the driver goes to: the glyph of the stop, the address (one line that shrinks and ends in an ellipsis) and the distance,
    // which keeps its whole width: two texts, so the ellipsis is the address's and never cuts the figure.
    stop: { flexDirection: 'row', alignItems: 'center', gap: themeSpace(theme, 'xs') },
    stopText: { flexShrink: 1, minWidth: 0 },
    stopDistance: { flexShrink: 0 },
    // The chips: the position or the type, the payment and the items, one row that wraps if it must, `xs` apart.
    chips: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: themeSpace(theme, 'xs'), rowGap: themeSpace(theme, 'xs') },
    chip: { flexShrink: 0, alignSelf: 'center' },
    items: { ...nativeTextStyle(card.meta), color: card.meta_color, marginLeft: themeSpace(theme, 'xs') },
    // The glyph of a group of orders (or of a locked request), in the room of a store's logo.
    tile: {
      width: avatar.size,
      height: avatar.size,
      borderRadius: themeRadius(theme, 'sm'),
      backgroundColor: themeColor(theme, 'surface_alt'),
      alignItems: 'center',
      justifyContent: 'center',
    },
    // An assign request another driver holds: the card on the alternative fill, its name muted.
    locked: { backgroundColor: themeColor(theme, 'surface_alt') },
    lockedName: { color: themeColor(theme, 'text_muted') },
    // A group's head: at least a control tall.
    press: { flexDirection: 'row', alignItems: 'center', gap: themeSpace(theme, 'sm'), minHeight: themeControlHeight(theme, 'md') },
    pressed: { opacity: themeOpacity(theme, 'pressed') },
  })
}

/**
 * The quick actions' row: the two actions share it, a third and two thirds of what their labels leave (a label is never cut by a narrow
 * cell). The space above it is the card's (`OCard`'s footer gap: the card's pressable owns it), so the row has no margin of its own.
 */
export const orderActionsStyles = (theme: any) => StyleSheet.create({
  row: { flexDirection: 'row', gap: themeSpace(theme, 'sm') },
  decline: { flexGrow: 1, flexShrink: 1 },
  advance: { flexGrow: 2, flexShrink: 1 },
  alone: { flexGrow: 1, flexShrink: 1 },
})

/** The list: its rows, a group's rows and the actions under a row or a group. */
export const ordersListStyles = (theme: any) => StyleSheet.create({
  list: { gap: themeSpace(theme, 'md') },
  // The actions of an assign request sit in its card, `sm` under its row.
  row: { gap: themeSpace(theme, 'sm') },
  // A group's open body: its orders and its actions, `sm` apart.
  groupBody: { gap: themeSpace(theme, 'sm') },
  hidden: { display: 'none' },
  actions: { flexDirection: 'row', alignItems: 'flex-start', gap: themeSpace(theme, 'sm') },
  // The actions of an assign request are the card's footer (beside its pressable, see `OCard`, which keeps the `sm` under its body).
  requestActions: { flexDirection: 'row', alignItems: 'flex-start', gap: themeSpace(theme, 'sm') },
  action: { flex: 1 },
  // An assign request's two actions: the negative a third of the row, the positive two thirds of it (what their labels leave).
  decline: { flexGrow: 1, flexShrink: 1 },
  advance: { flexGrow: 2, flexShrink: 1 },
})

/** The delivery position dialog's content, inside the modal's box (`OModal box`): the order and its stepper, centered, and the two actions side by side. */
export const positionDialogStyles = (theme: any) => StyleSheet.create({
  content: { alignItems: 'center', gap: themeSpace(theme, 'lg') },
  actions: { flexDirection: 'row', gap: themeSpace(theme, 'sm') },
  action: { flex: 1 },
})
