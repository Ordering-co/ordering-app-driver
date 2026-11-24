import React, { useMemo } from 'react'
import { StyleSheet, View } from 'react-native'
import { useTheme } from 'styled-components/native'

import { focusStyles } from './styles'
import { deliveryStyles } from '../styles'
import { OCard, SkeletonBone } from '../../shared'
import { themeControlHeight, themeIconSize, themePart, themeText, themeVisible } from '@/theme/helpers'

/** The folded rows under the stop card: the other stop, the payment, the products. */
const FOLDED_ROWS = 3

/**
 * The size of each piece of the loaded `focus` page, read from the same places the loaded pieces are drawn
 * with (`focusStyles`, `deliveryStyles` and the text looks and controls they are built from), so the skeleton
 * and the page cannot drift.
 */
export const focusSkeletonMetrics = (theme: any) => {
  const slot = theme.native.components.order_details.slots.stop_map
  return {
    focus: focusStyles(theme),
    /** The scroll's content: the page's own padding and the gap between its sections. */
    page: StyleSheet.flatten(deliveryStyles(theme, 0).content),
    badge: themePart(theme, 'badge', 'sizes.md.height'),
    badgeWidth: 2 * themeControlHeight(theme, 'lg'),
    timeWidth: themeControlHeight(theme, 'xl'),
    meta: themeText(theme, 'body_sm').lineHeight,
    name: themeText(theme, 'h4').lineHeight,
    line: themeText(theme, 'body').lineHeight,
    button: themePart(theme, 'button', `sizes.${slot.size}.height`),
    buttonRadius: themePart(theme, 'button', 'base.radius'),
    chevron: themeIconSize(theme, 'md')
  }
}

/**
 * The order details while the order loads, in the `focus` layout: the shape of the loaded page under its bar,
 * in `SkeletonBone`s: the status row, the stop's card with its two buttons and the folded rows.
 */
export const FocusSkeleton = () => {
  const theme: any = useTheme()
  const m = useMemo(() => focusSkeletonMetrics(theme), [theme])
  return (
    <View style={m.page} testID='order-details-skeleton'>
      <View style={m.focus.order}>
        <View style={m.focus.statusRow}>
          <SkeletonBone width={m.badgeWidth} height={m.badge} borderRadius={m.badge / 2} delay={100} />
          {themeVisible(theme, 'confirmation.order.eta') && (
            <View style={m.focus.time}>
              <SkeletonBone width={m.timeWidth} height={m.meta} delay={200} />
            </View>
          )}
        </View>
        <OCard style={m.focus.card} testID='order-details-skeleton-stop'>
          <SkeletonBone width={m.timeWidth} height={m.meta} delay={300} />
          <SkeletonBone width={m.badgeWidth} height={m.name} delay={400} />
          <SkeletonBone width={m.badgeWidth + m.timeWidth} height={m.line} delay={500} />
          <View style={m.focus.buttons}>
            {[0, 1].map((index) => (
              <View key={index} style={m.focus.button}>
                <SkeletonBone width='100%' height={m.button} borderRadius={m.buttonRadius} delay={600 + index * 100} />
              </View>
            ))}
          </View>
        </OCard>
        {Array.from({ length: FOLDED_ROWS }, (_, index) => (
          <OCard key={index} style={m.focus.foldCard} testID='order-details-skeleton-card'>
            <View style={m.focus.foldHead}>
              <View style={m.focus.grow}>
                <SkeletonBone width={m.badgeWidth} height={m.line} delay={800 + index * 100} />
              </View>
              <SkeletonBone width={m.chevron} height={m.chevron} delay={850 + index * 100} />
            </View>
          </OCard>
        ))}
      </View>
    </View>
  )
}
