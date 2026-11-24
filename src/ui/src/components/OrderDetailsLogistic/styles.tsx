import { StyleSheet } from 'react-native'
import { themeGutter, themeSpace } from '@/theme/helpers'

/**
 * The detail of an assign request: the header on the page gutter, `lg` over the
 * scroll (the page's gap between sections, as in the order's details). Its scroll is laid
 * out by the order's details' own style (`deliveryStyles(theme, clearance)`: the gutter, the
 * gap between sections and the room of the bottom bar).
 */
export const logisticDetailStyles = (theme: any) => StyleSheet.create({
  screen: { flex: 1 },
  gutter: { paddingHorizontal: themeGutter(theme) },
  header: { paddingHorizontal: themeGutter(theme), paddingBottom: themeSpace(theme, 'lg') },
})
