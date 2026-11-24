import { StyleSheet } from 'react-native'
import { nativeTextStyle, themeColor, themeRadius, themeSpace } from '@/theme/helpers'
import { closeButtonInset } from '../shared/styles'

/**
 * The new order alert (`components.new_order_alert`, which inherits `modal`), in the app's sheet
 * (`OBottomPopup`, its handle and body), as the mockup draws it: one row with the icon in its round
 * tint, the headline and the text stacked beside it, and the close button at the row's end; the
 * button that opens what happened under it. A long headline wraps inside its own column, so it never
 * pushes the tile or the close button out.
 */
export const newOrderAlertStyles = (theme: any) => {
  const alert = theme.native.components.new_order_alert.base
  return StyleSheet.create({
    content: { gap: themeSpace(theme, 'md') },
    // The tile (or nothing, when the theme serves a picture), the column and the close button.
    row: { flexDirection: 'row', alignItems: 'center', gap: themeSpace(theme, 'md') },
    image: { width: alert.image_size, height: alert.image_size, alignSelf: 'center' },
    // The icon's round tint (`new_order_alert.icon_box_size`); it keeps its size whatever the text needs.
    tile: {
      width: alert.icon_box_size,
      height: alert.icon_box_size,
      flexShrink: 0,
      borderRadius: themeRadius(theme, 'full', { fixed: true }),
      backgroundColor: themeColor(theme, 'primary_subtle'),
      alignItems: 'center',
      justifyContent: 'center',
    },
    // The text column takes what the tile and the close button leave, and wraps inside it.
    copy: { flex: 1, minWidth: 0 },
    title: { ...nativeTextStyle(alert.title), color: alert.title_color },
    text: { ...nativeTextStyle(alert.text), color: alert.text_color },
    // The close button stands at the top of the row, its glyph (not its touch box) at the sheet's side padding.
    close: { alignSelf: 'flex-start', marginRight: -closeButtonInset(theme) },
  })
}
