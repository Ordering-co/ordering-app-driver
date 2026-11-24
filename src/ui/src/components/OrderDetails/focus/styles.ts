import { StyleSheet } from 'react-native'
import { nativeTextStyle, themeBorderWidth, themeColor, themeControlHeight, themeOpacity, themeSpace } from '@/theme/helpers'

/**
 * The styles of the order's details in the `focus` layout, each built from the
 * theme inside its component (`useMemo(() => focusStyles(theme), [theme])`).
 * The skeleton (`OrderDetailsSkeleton`) draws itself with the same styles.
 */
export const focusStyles = (theme: any) => StyleSheet.create({
  // The blocks of one order, `md` apart.
  order: { gap: themeSpace(theme, 'md') },
  // The status badges and when the order is for. Two children on one line, the badges at the start and the time at the end: the
  // row never wraps, the badges' group takes the room the time leaves and only wraps its chips when they do not fit in it
  // (a wrapping row let Yoga shrink the group to less than its chips while the time still had room: "Accepted by driver" and
  // "Delivery #2" on two lines with 90 pt free).
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: themeSpace(theme, 'xs') },
  // No badges (an assignment request's row): the time alone keeps the end of the line, where the design draws it.
  statusRowTimeOnly: { justifyContent: 'flex-end' },
  // The group is as wide as the row leaves it; its chips keep their text whole and wrap only when the room is really short.
  statusBadges: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: themeSpace(theme, 'xs') },
  // The clock and its time are one piece: they never separate.
  time: { flexDirection: 'row', alignItems: 'center', gap: themeSpace(theme, 'xs'), flexShrink: 0 },
  // A stop's card and the card of the route's two stops.
  card: { padding: themeSpace(theme, 'md'), gap: themeSpace(theme, 'sm') },
  head: { flexDirection: 'row', alignItems: 'flex-end', gap: themeSpace(theme, 'sm') },
  grow: { flex: 1, minWidth: 0 },
  askFor: { alignItems: 'flex-end' },
  inline: { flexDirection: 'row', alignItems: 'center', gap: themeSpace(theme, 'xs') },
  spread: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: themeSpace(theme, 'sm') },
  buttons: { flexDirection: 'row', gap: themeSpace(theme, 'sm'), paddingTop: themeSpace(theme, 'xs') },
  button: { flex: 1 },
  contact: { flexDirection: 'row', alignItems: 'center', gap: themeSpace(theme, 'sm'), minHeight: themeControlHeight(theme, 'md') },
  // The route: the store and the customer, joined by a line.
  route: { gap: themeSpace(theme, 'md') },
  stop: { flexDirection: 'row', gap: themeSpace(theme, 'sm') },
  rail: { alignItems: 'center', gap: themeSpace(theme, 'xs'), paddingTop: themeSpace(theme, 'xxs') },
  railLine: { flex: 1, width: themeBorderWidth(theme, 'thin'), backgroundColor: themeColor(theme, 'border') },
  // The facts of the offered order: total, payment, driver tip.
  facts: { flexDirection: 'row', alignItems: 'center' },
  // Three columns share the card's width: only `xs` at the sides, so each one holds its value; `md` over and under.
  factsCard: { paddingVertical: themeSpace(theme, 'md'), paddingHorizontal: themeSpace(theme, 'xs') },
  fact: { flex: 1, alignItems: 'center', gap: themeSpace(theme, 'xxs') },
  // A folded row, as the boards draw it: the card is the row, so it has no vertical padding of its own (the card's `md`
  // over and under made a one-line row 82 instead of 52); the header carries `sm` over and under its texts (two lines make
  // it about 58; one line, the `lg` control height, 50), `md` at the sides, and when it is open `md` under what it
  // opens. The header is the touch target, never under 44.
  foldCard: { paddingVertical: 0, paddingHorizontal: themeSpace(theme, 'md') },
  foldHead: { flexDirection: 'row', alignItems: 'center', gap: themeSpace(theme, 'sm'), paddingVertical: themeSpace(theme, 'sm'), minHeight: themeControlHeight(theme, 'lg') },
  // The stacked cash to collect (the label over the big amount): `md` over and under, as the board draws it, not the `sm` of a one-line row.
  foldHeadRoomy: { paddingVertical: themeSpace(theme, 'md') },
  foldBody: { gap: themeSpace(theme, 'xs'), paddingTop: themeSpace(theme, 'sm'), paddingBottom: themeSpace(theme, 'md') },
  pressed: { opacity: themeOpacity(theme, 'pressed') },
  // The cash to collect: the title and the change, and the amount at the right.
  collect: { flexDirection: 'row', alignItems: 'center', gap: themeSpace(theme, 'sm') },
  collectTexts: { flex: 1, minWidth: 0 },
  // A sub-title inside the more details (the contacts, the custom fields, the vehicle, the summary): `order_details.base.subtitle`.
  subtitle: { ...nativeTextStyle(theme.native.components.order_details.base.subtitle) },
  // The products and what the order asks for.
  line: { flexDirection: 'row', justifyContent: 'space-between', gap: themeSpace(theme, 'sm') },
  lineLabel: { flex: 1 },
  group: { gap: themeSpace(theme, 'md') },
  // A notice whose glyph is its own (the order's comment): the glyph and the texts side by side, as the notice lays its icon.
  noticeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.native.components.alert.base.gap },
  noticeTexts: { flex: 1, gap: themeSpace(theme, 'xxs') }
})
