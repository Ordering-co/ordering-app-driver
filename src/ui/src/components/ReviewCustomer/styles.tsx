import { StyleSheet } from 'react-native'
import { nativeTextStyle, themeGutter, themeOpacity, themeSpace } from '@/theme/helpers'

/**
 * The customer review: the page (`components.review_form`: the space between
 * its blocks) and its 1 to 5 scale (`components.rating_scale`: track, fill,
 * and labels, five separate segments). `top` is the safe-area inset over the top bar and
 * `clearance` the room the scroll leaves for the Send bar.
 */
export const reviewStyles = (theme: any, top: number, clearance: number) => {
  const form = theme.native.components.review_form.base
  const scale = theme.native.components.rating_scale.base
  return StyleSheet.create({
    page: { flex: 1, paddingTop: top },
    scroll: { flex: 1 },
    content: {
      paddingHorizontal: themeGutter(theme),
      paddingBottom: clearance,
      gap: form.gap
    },
    customer: { flexDirection: 'row', alignItems: 'center', gap: themeSpace(theme, 'md') },
    customerText: { flex: 1 },
    // Five levels side by side, `xs` apart: each one a segment over its label.
    scale: { flexDirection: 'row', gap: themeSpace(theme, 'xs') },
    // Each level is a column of the scale's minimum height (`rating_scale.base.min_height`): its segment (the track's color, the fill's up to the chosen level) and its label.
    level: { flex: 1, alignItems: 'stretch', minHeight: scale.min_height, gap: themeSpace(theme, 'sm') },
    segment: { height: scale.height, borderRadius: scale.radius, backgroundColor: scale.track },
    segmentFilled: { backgroundColor: scale.fill },
    label: { ...nativeTextStyle(scale.label), color: scale.label_color, textAlign: 'center' },
    labelActive: { color: scale.label_active_color },
    pressed: { opacity: themeOpacity(theme, 'pressed') },
    // The quick comments wrap over several lines, `sm` apart both ways.
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: themeSpace(theme, 'sm') }
  })
}
