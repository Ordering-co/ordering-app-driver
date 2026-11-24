import { StyleSheet } from 'react-native'
import {
  themeBottomSpace,
  themeColor,
  themeGutter,
  themeOpacity,
  themePart,
  themeRadius,
  themeSpace,
} from '@/theme/helpers'

/** The signature pad's drawing area (pt): the canvas is the library's own (out of scope). */
export const SIGNATURE_PAD_HEIGHT = 120

/**
 * The chat's styles: the composer's rows (who receives the message, as chips; the quick messages;
 * the buttons, the field and its send button) and the sheet of a message's options. The chat's
 * skeleton (`ChatMessageSkeleton`) is drawn with the same ones, so the composer loads at its size.
 */
export const chatStyles = (theme: any, bottom: number) => {
  const bubble = theme.native.components.chat_bubble.base
  const preview = themePart(theme, 'button', 'sizes.sm.icon_size')
  return StyleSheet.create({
    wrapper: { flex: 1, backgroundColor: themeColor(theme, 'background') },
    // The composer on the page sides, as the bubbles above it.
    toolbar: {
      paddingHorizontal: themeGutter(theme),
      paddingTop: themeSpace(theme, 'sm'),
      gap: themeSpace(theme, 'sm'),
      backgroundColor: bubble.composer_background,
    },
    toolbarInset: { paddingBottom: themeBottomSpace(theme, bottom) },
    // With the keyboard up the composer ends over it as a pinned bar does (`bottom_bar.base.padding`, the same
    // gap on every screen with a field: the bar, the sheets, the search); down, it clears the system's inset.
    toolbarKeyboard: { paddingBottom: theme.native.components.bottom_bar.base.padding },
    // "Send to" and its chips, in one row that scrolls sideways.
    recipients: { alignItems: 'center', gap: themeSpace(theme, 'sm') },
    pressed: { opacity: themeOpacity(theme, 'pressed') },
    quickMessages: { alignItems: 'center', gap: themeSpace(theme, 'sm') },
    row: { flexGrow: 0 },
    // The signature and image buttons, the field and the send button, in one row.
    primary: { flexDirection: 'row', alignItems: 'center', gap: themeSpace(theme, 'xs') },
    field: { flex: 1 },
    preview: { width: preview, height: preview, borderRadius: themeRadius(theme, 'xs') },
    removeImage: {
      position: 'absolute',
      top: -themeSpace(theme, 'xs'),
      right: -themeSpace(theme, 'xs'),
      backgroundColor: themeColor(theme, 'surface'),
      borderRadius: themeRadius(theme, 'full', { fixed: true }),
    },
    signature: { height: SIGNATURE_PAD_HEIGHT, paddingVertical: themeSpace(theme, 'xs') },
    clearSignature: { position: 'absolute', top: themeSpace(theme, 'xs'), right: 0 },
    // The sheet owns its sides and bottom (`OBottomPopup padded`): only the space between its pieces
    // is here, the same as the driver map's sheet of maps apps.
    sheet: { gap: themeSpace(theme, 'sm') },
  })
}
