import { StyleSheet } from 'react-native'
import { nativeTextStyle, themeColor, themeGutter, themeSpace } from '@/theme/helpers'

/**
 * The order details' styles, each built from the theme inside its component
 * (`useMemo(() => deliveryStyles(theme, …), [theme, …])`).
 */

/** The screen: top bar, notices, the scroll and its room for the bottom bar. */
export const deliveryStyles = (theme: any, clearance: number) => StyleSheet.create({
  page: { flex: 1 },
  // The count of unread messages, on the corner of its button: `xxs` (2) from its top, as the boards draw it, and flush with its right edge.
  unread: { position: 'absolute', top: themeSpace(theme, 'xxs'), right: 0 },
  notices: { paddingHorizontal: themeGutter(theme), paddingBottom: themeSpace(theme, 'md'), gap: themeSpace(theme, 'sm') },
  // An empty or error state under the bar, on the page gutter.
  gutter: { paddingHorizontal: themeGutter(theme) },
  scroll: { flex: 1 },
  // The sections are the scroll's children: the space between them is the page's. The skeleton
  // (`OrderDetailsSkeleton`) is drawn with this same style.
  content: {
    paddingHorizontal: themeGutter(theme),
    paddingBottom: clearance,
    gap: themeSpace(theme, 'lg')
  }
})

/**
 * The requirements dialog's list, inside the modal's box (`OModal box`): it
 * scrolls inside what `room` (the window between the system's insets) leaves
 * once the box's own pieces are taken: its padding, its title, its gaps and
 * its close button, and the page gutter above and below.
 */
export const requirementsListStyles = (theme: any, room: number) => {
  const modal = theme.native.components.modal.base
  const edge = themeGutter(theme) + modal.padding + modal.gap
  const pieces = nativeTextStyle(modal.title).lineHeight + theme.native.components.button.sizes.md.height
  return StyleSheet.create({
    list: { flexGrow: 0, maxHeight: Math.max(room - edge - edge - pieces, 0) }
  })
}

/** The header section: the status, the order's facts and its dates (its number is the screen's bar title). */
export const headerStyles = (theme: any) => {
  const details = theme.native.components.order_details.base
  return StyleSheet.create({
    section: { gap: themeSpace(theme, 'sm') },
    card: { gap: themeSpace(theme, 'md') },
    // The status badge (by its state, decisions D4 and H1b) and the delivery position, centered.
    badges: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: themeSpace(theme, 'xs') },
    // The two facts side by side: the vertical divider between them brings its own space.
    facts: { flexDirection: 'row' },
    fact: { flex: 1, alignItems: 'center' },
    info: { ...nativeTextStyle(details.info_text), textAlign: 'center' }
  })
}

/** The details' sections: the cards, the products, the bill, the vehicle. */
export const contentStyles = (theme: any) => {
  const details = theme.native.components.order_details.base
  const bill = theme.native.components.bill.base
  const info = nativeTextStyle(details.info_text)
  return StyleSheet.create({
    // One order of a group, in its own box.
    group: { gap: themeSpace(theme, 'lg') },
    card: { gap: themeSpace(theme, 'sm') },
    // The lines of a card's body (a name, its contact links, an address) sit `sm` apart.
    body: { gap: themeSpace(theme, 'sm') },
    info,
    field: { flexDirection: 'row', gap: themeSpace(theme, 'sm') },
    fieldKey: { flex: 1 },
    fieldValue: { ...info, flex: 1, textAlign: 'right' },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: themeSpace(theme, 'sm') },
    name: { flex: 1 },
    rating: { flexDirection: 'row', alignItems: 'center', gap: themeSpace(theme, 'xs') },
    // "Read more" under a long address is as wide as its text: only the text answers the tap.
    more: { alignSelf: 'flex-start' },
    products: { gap: themeSpace(theme, 'xs') },
    bill: { gap: themeSpace(theme, 'lg') },
    rows: { gap: bill.row_gap },
    row: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: themeSpace(theme, 'sm') },
    rowLabel: { ...nativeTextStyle(bill.row), color: bill.row_color, flex: 1 },
    rowAmount: { ...nativeTextStyle(bill.row), color: bill.row_color },
    totalLabel: { ...nativeTextStyle(bill.total), color: bill.total_color, flex: 1 },
    totalAmount: { ...nativeTextStyle(bill.total), color: bill.total_color },
    // The details' look of the bill (`OrderBill compact`): the rows `xs` apart, the total under a thin line with `sm`
    // over it (the row gap included, as the board draws it) and `sm` inside it, and the payments muted, `xs` under the total.
    rowsCompact: { gap: themeSpace(theme, 'xs') },
    totalLine: { marginTop: themeSpace(theme, 'sm') },
    totalRowCompact: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: themeSpace(theme, 'sm'), paddingTop: themeSpace(theme, 'sm') },
    paymentsCompact: { paddingTop: themeSpace(theme, 'xs') },
    paymentLabel: { ...nativeTextStyle(bill.row), color: themeColor(theme, 'text_muted'), flex: 1 },
    paymentAmount: { ...nativeTextStyle(bill.row), color: themeColor(theme, 'text_muted') },
    vehicle: { gap: themeSpace(theme, 'xs') },
    pair: { flexDirection: 'row', justifyContent: 'space-between', gap: themeSpace(theme, 'sm') },
    pairLabel: { ...info, flex: 1 }
  })
}

/** The list of unmet location requirements (the banners and the dialog). */
export const issuesStyles = (theme: any) => StyleSheet.create({
  list: { gap: themeSpace(theme, 'sm') },
  issue: { gap: themeSpace(theme, 'sm') },
  message: { flexDirection: 'row', alignItems: 'flex-start', gap: themeSpace(theme, 'sm') },
  text: { flex: 1 }
})
