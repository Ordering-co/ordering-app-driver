import { Platform } from 'react-native'
import type { TextStyle } from 'react-native'
import { themeColor } from '@/theme/helpers'

/**
 * A one-line text field's own text box. On Android an `EditText` keeps the font's
 * and the view's default vertical padding and starts at the top of its box, so the
 * text sat above the middle of the field (iOS centers it): no padding and a
 * centered text. A text area (`multiline`) keeps its text at the top. It also
 * keeps 4 dp at its sides, so a field's text started after a select's: none, the
 * box's own `padding_x` is the only indent on both platforms.
 */
export const singleLineInput: TextStyle = {
  paddingVertical: 0,
  paddingHorizontal: 0,
  textAlignVertical: 'center',
  includeFontPadding: false,
}

/** A text area's text box: its sides start where a one-line field's do (see `singleLineInput`). */
export const textAreaInput: TextStyle = { paddingHorizontal: 0 }

/**
 * The caret and the selection of every text field, in the theme's brand color
 * (left alone they are the system's accent: a teal on Android). iOS tints the
 * selection itself from one color; Android paints the color it is given, so the
 * selection takes the subtle tint and the caret and its handles the brand color.
 */
export const inputTint = (theme: any) => Platform.OS === 'android'
  ? {
      selectionColor: themeColor(theme, 'primary_subtle'),
      cursorColor: themeColor(theme, 'primary'),
      selectionHandleColor: themeColor(theme, 'primary'),
    }
  : { selectionColor: themeColor(theme, 'primary') }
