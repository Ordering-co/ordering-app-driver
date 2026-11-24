import { StyleSheet } from 'react-native'

import {
  nativeBoxStyle,
  nativeTextStyle,
  themeBorderWidth,
  themeColor,
  themeControlHeight,
  themeGutter,
  themeSpace
} from '@/theme/helpers'

/**
 * The route's styles (`OrdersRoute`): the map screen (the map, its buttons and the panel of the
 * next stop), the list of stops and the maps sheet. Every value is the theme's, through the helpers.
 */

/** The two buttons of the next stop: Navigate a third of the row and the order's step two thirds (the order card's decline and advance). */
export const routeActionStyles = (theme: any) => StyleSheet.create({
  row: { flexDirection: 'row', gap: themeSpace(theme, 'sm') },
  navigate: { flexGrow: 1, flexShrink: 1 },
  alone: { flexGrow: 1, flexShrink: 1 },
  step: { flexGrow: 2, flexShrink: 1 }
})

/** The map screen: the bar, the map filling what the panel leaves, and the panel of the next stop under it. */
export const routeScreenStyles = (theme: any) => StyleSheet.create({
  page: { flex: 1 },
  // The map takes the room the panel leaves, never less than a control of the largest height (a panel at the largest text size scrolls).
  map: { flexGrow: 1, flexShrink: 1, flexBasis: 0, minHeight: themeControlHeight(theme, 'xl') },
  fill: { flex: 1 },
  // The buttons at the map's top right, `lg` under the bar and on the page gutter, where the other maps have them.
  controls: { position: 'absolute', top: themeSpace(theme, 'lg'), right: themeGutter(theme), alignItems: 'flex-end', gap: themeSpace(theme, 'sm') },
  fabs: { gap: themeSpace(theme, 'sm') }
})

/**
 * The panel of the next stop under the map: a pinned bar's look (`components.bottom_bar`: its fill, its line over it and the space
 * under its content, the system's inset included) that scrolls when its content outgrows what the screen leaves it.
 */
export const routePanelStyles = (theme: any, bottomSpace: number) => {
  const bar = theme.native.components.bottom_bar.base
  const card = theme.native.components.order_card.base
  return StyleSheet.create({
    panel: {
      flexGrow: 0,
      flexShrink: 1,
      ...nativeBoxStyle({ background: bar.background, shadow: bar.shadow }),
      ...(bar.border_top && { borderTopWidth: bar.border_top.borderWidth, borderTopColor: bar.border_top.borderColor })
    },
    content: {
      paddingTop: themeSpace(theme, 'sm'),
      paddingHorizontal: themeGutter(theme),
      paddingBottom: bar.padding + bottomSpace,
      gap: themeSpace(theme, 'sm')
    },
    summary: { flexDirection: 'row', alignItems: 'center', gap: themeSpace(theme, 'sm') },
    summaryText: { flex: 1 },
    next: { flexDirection: 'row', alignItems: 'center', gap: themeSpace(theme, 'sm'), minHeight: themeControlHeight(theme, 'md') },
    texts: { flex: 1, minWidth: 0 },
    // The strong line (16 over 1.4, semibold), as the order card's.
    title: { ...nativeTextStyle(card.title_text), color: card.name_color },
    meta: { ...nativeTextStyle(card.meta), color: card.meta_color },
    figures: { flexShrink: 0, alignItems: 'flex-end' }
  })
}

/** The list of stops: a rail of numbers with its line, and at its side the next stop's card or a stop's row. */
export const stopsScreenStyles = (theme: any, bottomSpace: number) => {
  const marker = theme.native.components.map_marker.base
  const card = theme.native.components.order_card.base
  return StyleSheet.create({
    page: { flex: 1 },
    content: { paddingHorizontal: themeGutter(theme), paddingBottom: themeSpace(theme, 'lg') + bottomSpace },
    item: { flexDirection: 'row', gap: themeSpace(theme, 'md') },
    // The rail is as wide as the largest disc, with each disc centered on it; its line joins a stop to the next.
    rail: { width: marker.stop_next_size, alignItems: 'center', flexShrink: 0 },
    line: { flex: 1, width: themeBorderWidth(theme, 'thick'), minHeight: themeSpace(theme, 'md'), marginVertical: themeSpace(theme, 'xs'), backgroundColor: themeColor(theme, 'border_strong') },
    lineNext: { backgroundColor: marker.color },
    // The next stop's card and a stop's row: the card's own room under it, a row as tall as a control to the touch.
    cardRoom: { flex: 1, minWidth: 0, paddingBottom: themeSpace(theme, 'md') },
    row: { flex: 1, minWidth: 0, minHeight: themeControlHeight(theme, 'md'), paddingBottom: themeSpace(theme, 'md'), flexDirection: 'row', alignItems: 'flex-start', gap: themeSpace(theme, 'sm') },
    texts: { flex: 1, minWidth: 0, gap: themeSpace(theme, 'xxs') },
    rowTitle: { ...nativeTextStyle(card.title_text), color: card.name_color },
    meta: { ...nativeTextStyle(card.meta), color: card.meta_color },
    figures: { flexShrink: 0, alignItems: 'flex-end' },
    cardBody: { gap: themeSpace(theme, 'sm') },
    cardHead: { flexDirection: 'row', alignItems: 'center', gap: themeSpace(theme, 'sm') },
    note: { marginTop: themeSpace(theme, 'xs') }
  })
}

/** The maps sheet: its pieces `sm` apart (the sheet owns its sides and bottom, `OBottomPopup padded`). */
export const navigateSheetStyles = (theme: any) => StyleSheet.create({
  sheet: { gap: themeSpace(theme, 'sm') }
})
