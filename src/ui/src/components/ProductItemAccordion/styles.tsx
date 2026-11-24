import { StyleSheet } from 'react-native'
import { themeColor, themeControlHeight, themeOpacity, themeRadius, themeSpace } from '@/theme/helpers'

/** What a row that opens needs above and under it to be a touch target of the `md` control height: its quantity box is shorter. */
const productRowSlop = (theme: any) => {
  const slop = Math.max(0, (themeControlHeight(theme, 'md') - theme.native.components.order_details.base.quantity_size) / 2)
  return { top: slop, bottom: slop }
}

/** A product line of an order: its row (quantity, name, price, the accordion glyph) and what it opens. */
export const productLineStyles = (theme: any) => ({
  slop: productRowSlop(theme),
  ...StyleSheet.create({
  // `sm` over and under, as the boards draw a product (a 28 box between two 10s, 48 in all); the line closes with its own padding, so the card
  // that holds the lines adds none under the last one.
  line: { paddingVertical: themeSpace(theme, 'sm') },
  // The row is as tall as its quantity box (or its name when that is longer). A row that opens is a touch target of at least the `md`
  // control height through its slop, so the line's pitch does not change with what the line can do.
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: themeSpace(theme, 'sm')
  },
  pressed: { opacity: themeOpacity(theme, 'pressed') },
  name: { flex: 1 },
  // The quantity in a small box (`order_details.base.quantity_size`), on the soft fill.
  quantity: {
    width: theme.native.components.order_details.base.quantity_size,
    height: theme.native.components.order_details.base.quantity_size,
    // `sm` as the buttons and fields have it (8, the boards'), whatever Identity's level is.
    borderRadius: themeRadius(theme, 'sm', { fixed: true }),
    backgroundColor: themeColor(theme, 'surface_alt'),
    alignItems: 'center',
    justifyContent: 'center'
  },
  // The details sit under the row and the line's own padding closes them.
  details: { paddingLeft: themeSpace(theme, 'lg'), paddingTop: themeSpace(theme, 'xxs'), gap: themeSpace(theme, 'sm') },
  suboption: { marginLeft: themeSpace(theme, 'sm') },
  // "Read more" is as wide as its text: only the text answers the tap.
  more: { alignSelf: 'flex-start' }
  })
})
