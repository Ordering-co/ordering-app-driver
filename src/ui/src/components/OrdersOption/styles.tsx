import { StyleSheet } from 'react-native'
import { nativeBoxStyle, nativeTextStyle, themeColor, themeControlHeight, themeGutter, themeOpacity, themePart, themeRadius, themeSpace } from '@/theme/helpers'

/** The orders tab: its header's actions, the page's sections and the search form. */
export const ordersOptionStyles = (theme: any) => StyleSheet.create({
  // The state rows (offline, filters on) and the sections, one block apart, under the header's own `xs`.
  body: { flex: 1, gap: themeSpace(theme, 'md') },
  // What sits on the page gutter outside the scroll (the notices, the tabs, the summary); the list carries it on its content.
  gutter: { paddingHorizontal: themeGutter(theme) },
  // The filters notice: its text and, at its end, the action that clears them.
  notice: { flexDirection: 'row', alignItems: 'center', gap: themeSpace(theme, 'sm') },
  noticeText: { flex: 1 },
  // The gutter is at the start; at the end only when the tabs share the row. A row of tabs that scrolls runs to the
  // screen's edge (the gutter ends its content), as the app's other sideways rows: the tab it cuts says there are more.
  tabs: { flexDirection: 'row', alignItems: 'center', gap: themeSpace(theme, 'sm'), paddingStart: themeGutter(theme) },
  tabsFilled: { paddingEnd: themeGutter(theme) },
  // The tabs and, under History, its chips, `sm` apart.
  tabsBlock: { gap: themeSpace(theme, 'sm') },
  chips: { paddingHorizontal: themeGutter(theme) },
  tabsTrack: { flex: 1 },
  list: { flex: 1 },
  listContent: { gap: themeSpace(theme, 'md'), paddingHorizontal: themeGutter(theme), paddingBottom: themeSpace(theme, 'lg') },
})

/** The search form: its fields (a label over each), spaced as every form, and the bar of its two actions pinned under them. */
export const searchFormStyles = (theme: any, bottomInset: number) => {
  const bar = theme.native.components.bottom_bar.base
  return StyleSheet.create({
    page: { flex: 1 },
    content: { paddingHorizontal: themeGutter(theme), paddingBottom: themeSpace(theme, 'lg'), gap: themePart(theme, 'field', 'base.gap') },
    field: { gap: themeSpace(theme, 'xs') },
    // The bottom bar's look (`components.bottom_bar`), with the space the system keeps under it.
    actions: {
      paddingTop: bar.padding,
      paddingBottom: bar.padding + bottomInset,
      paddingHorizontal: themeGutter(theme),
      gap: themeSpace(theme, 'sm'),
      ...nativeBoxStyle({ background: bar.background, shadow: bar.shadow }),
      ...(bar.border_top && { borderTopWidth: bar.border_top.borderWidth, borderTopColor: bar.border_top.borderColor }),
    },
  })
}

/** The order summary (`pages.orders`, section `summary`): a card with a head, the driver and the filters, and three tiles. */
export const orderSummaryStyles = (theme: any) => {
  const card = theme.native.components.order_card.base
  return StyleSheet.create({
    box: { gap: themeSpace(theme, 'sm') },
    head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: themeSpace(theme, 'sm'), minHeight: themeControlHeight(theme, 'md') },
    pressed: { opacity: themeOpacity(theme, 'pressed') },
    title: { ...nativeTextStyle(card.name), color: card.name_color, flex: 1 },
    meta: { gap: themeSpace(theme, 'xs') },
    metaRow: { flexDirection: 'row', justifyContent: 'space-between', gap: themeSpace(theme, 'sm') },
    metaValue: { flexShrink: 1, textAlign: 'right' },
    tiles: { flexDirection: 'row', gap: themeSpace(theme, 'sm') },
    tile: { flex: 1, padding: themeSpace(theme, 'sm'), borderRadius: themeRadius(theme, 'sm') },
    // Each tile in the state it counts (decision D4): the completed, the cancelled and the cash, neutral.
    tile_completed: { backgroundColor: themeColor(theme, 'success_subtle') },
    tile_cancelled: { backgroundColor: themeColor(theme, 'danger_subtle') },
    tile_tips: { backgroundColor: themeColor(theme, 'surface_alt') },
    footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: themeSpace(theme, 'sm') },
    footerText: { flexShrink: 1 },
  })
}

/** A filter of the search form: its select and, when it has a value, the button that clears it. */
export const filterStyles = (theme: any) => StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: themeSpace(theme, 'xs') },
  select: { flex: 1 },
})
