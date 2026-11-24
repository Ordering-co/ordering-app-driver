import { StyleSheet } from 'react-native'
import { nativeTextStyle, themeColor, themeGutter, themeOpacity, themeSpace } from '@/theme/helpers'

/**
 * The Messages list: its rows (`components.list_row`: a flat row with a line under it, as every list of
 * rows of the app) and its content on the page gutter. A row is the store's logo, its name with the
 * order's number and date and the order's status under them, and, at its end, the order's timer and the
 * count of unread messages. The list's skeleton (`MessageListSkeleton`) is drawn with the same styles,
 * so the rows load at their size and pitch.
 */
export const messageListStyles = (theme: any) => {
  const row = theme.native.components.list_row.base
  return StyleSheet.create({
    fill: { flex: 1 },
    list: { flex: 1, backgroundColor: themeColor(theme, 'background') },
    content: { paddingHorizontal: themeGutter(theme), paddingBottom: themeSpace(theme, 'lg') },
    contentEmpty: { flexGrow: 1 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: row.gap,
      // Three lines (the store, the order, its status) beside the logo: the list's tall row, with `xs` of its own over and under.
      minHeight: row.tall_min_height,
      paddingVertical: themeSpace(theme, 'xs'),
      backgroundColor: row.background,
    },
    pressed: { opacity: themeOpacity(theme, 'pressed') },
    // The order's timer at the row's end: the card's timer text (`order_card.base.time_text`), colored by its state.
    timer: nativeTextStyle(theme.native.components.order_card.base.time_text),
    info: { flex: 1, gap: themeSpace(theme, 'xxs') },
    // The timer and the count at the row's end, one over the other.
    aside: { alignItems: 'flex-end', gap: themeSpace(theme, 'xs') },
    // The status wraps rather than truncate when a larger text size leaves it no room (a badge never truncates).
    badges: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', paddingTop: themeSpace(theme, 'xxs') },
    status: { flexShrink: 1 },
  })
}
