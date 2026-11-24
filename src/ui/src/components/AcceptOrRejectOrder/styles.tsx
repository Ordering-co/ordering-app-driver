import { StyleSheet } from 'react-native'
import { nativeTextStyle, themeColor, themeGutter, themeOpacity, themeRadius, themeSpace } from '@/theme/helpers'
import { minutesLineHeight } from '../shared/MinutesValue'

/**
 * The accept / reject screen (`components.order_request`): the top bar and the
 * content on the page gutter; the action is the app's bottom bar
 * (`FloatingButton`, `components.bottom_bar`). `top` is what is left of the safe
 * area over the top bar (none as a page inside the safe-area container).
 */
export const acceptOrRejectStyles = (theme: any, top: number) => {
  const request = theme.native.components.order_request.base
  const choice = theme.native.components.choice.base
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: themeColor(theme, 'background') },
    bar: { paddingTop: top },
    scroll: { flex: 1 },
    // Under the bar's own `xs`: the blocks of the screen, `md` apart.
    content: {
      paddingHorizontal: themeGutter(theme),
      paddingBottom: themeSpace(theme, 'md'),
      gap: themeSpace(theme, 'md'),
    },
    // The reasons are rows of a list (a divider under each, 44 apart, the radio mark at its theme size): `xs` from their label, as the board draws it.
    reasons: { paddingTop: themeSpace(theme, 'xs') },
    reasonText: { ...nativeTextStyle(choice.text), color: choice.color, flex: 1, textTransform: 'capitalize' },
    // The status image's block: its label and its control, `xs` apart on the screen and `sm` in the sheet.
    photoBlock: { gap: themeSpace(theme, 'xs') },
    photoBlockSheet: { gap: themeSpace(theme, 'sm') },
    // The tile that opens the camera: as tall as the thumbnail with the glyph beside its text on the screen, taller with the
    // glyph over the text in the sheet (`order_request.base.photo_size`, `photo_tile_height`).
    photoTile: { height: request.photo_size, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: themeSpace(theme, 'sm') },
    photoTileSheet: { height: request.photo_tile_height, alignItems: 'center', justifyContent: 'center', gap: themeSpace(theme, 'sm') },
    // The comment field: its label and the field, `xs` apart.
    field: { gap: themeSpace(theme, 'xs') },

    // The sheet: the blocks and the action, `md` apart.
    sheetBody: { gap: themeSpace(theme, 'md') },
    // "Delivery position": its label and question at the start, the stepper at the end.
    positionRow: { flexDirection: 'row', alignItems: 'center', gap: themeSpace(theme, 'sm') },
    positionText: { flex: 1, minWidth: 0 },
    // The taken status photo, in the sheet and in the form: the thumbnail and "Remove image" side by side; the button keeps its own height, centered on the thumbnail.
    photoRow: { flexDirection: 'row', alignItems: 'center', gap: themeSpace(theme, 'md') },
    photoThumb: { width: request.photo_size, height: request.photo_size, borderRadius: themeRadius(theme, 'md') },
    photoRemove: { flex: 1, minWidth: 0, justifyContent: 'center' },
    // An action a requirement blocks: painted as disabled, it still answers the tap (the bottom bar does the same).
    blocked: { opacity: themeOpacity(theme, 'disabled') },
  })
}

/**
 * The delivery time of the accept sheet: its label, the presets and the stepper's line, `sm` apart. The line is on the soft fill
 * the dial had, as wide as the sheet. The minus, the figure and the plus start at the same line: each button is centred in a box
 * as tall as the figure's own line (`minutesLineHeight`: the figure at rest, the field while typing), so they stay level with the
 * number and nothing moves when the typing starts; the field's hint under the figure only lengthens the middle column.
 */
export const deliveryTimeStyles = (theme: any) => StyleSheet.create({
  block: { gap: themeSpace(theme, 'sm') },
  // Five equal chips: each in a cell that gives it the same width.
  presets: { flexDirection: 'row', gap: themeSpace(theme, 'xs') },
  presetCell: { flex: 1 },
  box: {
    padding: themeSpace(theme, 'md'),
    borderRadius: themeRadius(theme, 'md'),
    backgroundColor: themeColor(theme, 'surface_alt'),
  },
  stepper: { flexDirection: 'row', alignItems: 'flex-start', gap: themeSpace(theme, 'sm') },
  side: { minHeight: minutesLineHeight(theme), justifyContent: 'center' },
  value: { flex: 1, minWidth: 0, alignItems: 'center' },
})

/** What the driver collects, at the top of the delivery sheet: a soft box with the way it is paid at the start and the amount at the end. */
export const collectStyles = (theme: any) => StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: themeSpace(theme, 'sm'),
    paddingVertical: themeSpace(theme, 'sm'),
    paddingHorizontal: themeSpace(theme, 'md'),
    borderRadius: themeRadius(theme, 'md'),
    backgroundColor: themeColor(theme, 'primary_subtle'),
  },
  text: { flex: 1, minWidth: 0 },
})

/** The delivery PIN under its section title: per order, its label and its code entry (the cells and, right under them, its error), centered. */
export const securityPinStyles = (theme: any) => {
  const input = theme.native.components.input
  return StyleSheet.create({
    // The codes sit `sm` under the block's label; each order's code with its own label `xs` over it.
    codes: { gap: themeSpace(theme, 'sm'), marginTop: themeSpace(theme, 'sm') },
    order: { alignItems: 'center', gap: themeSpace(theme, 'xs') },
    // The code and its error: as wide as the screen's content, so the error centers on the code.
    entry: { alignSelf: 'stretch', alignItems: 'center' },
    row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: input.sizes.code.gap },
    prefix: { ...nativeTextStyle(input.sizes.code.text), color: themeColor(theme, 'text_muted') },
  })
}
