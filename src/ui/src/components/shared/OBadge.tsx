import React, { useMemo } from 'react'
import { Pressable, StyleSheet, View, ViewStyle } from 'react-native'
import { useTheme } from 'styled-components/native'
import { nativeTextStyle, themeControlHeight, themeOpacity, themeRadius, themeSpace } from '@/theme/helpers'
import OText from './OText'

/**
 * A label (`components.badge`): a status, an order type, a count. Its variant is
 * its meaning (decision D4): `primary` pending or in progress, `success`,
 * `warning`, `danger`, `neutral`; a word with a state color that is not an
 * order's status (Paid, Collect cash) is a `*_soft` one, and an order's type is
 * one of the three `type_*` ones (`orderTypeVariant`). The `*_soft` variants are
 * also the tones of the order card's status band. A badge is not tapped, except
 * with `onPress` (the card's "Delivery #N").
 *
 *   <OBadge variant='success'>{t('COMPLETED', 'Completed')}</OBadge>
 *   <OBadge variant='danger' count>3</OBadge>
 */
export type BadgeVariant =
  | 'primary' | 'neutral' | 'inverse' | 'warning' | 'danger' | 'success'
  | 'primary_soft' | 'success_soft' | 'warning_soft' | 'danger_soft'
  | 'type_delivery' | 'type_pickup' | 'type_in_store'

interface Props {
  variant?: BadgeVariant
  size?: 'sm' | 'md'
  /** A round count (`shapes.count`). */
  count?: boolean
  /**
   * The text takes as many lines as it needs and the chip grows with it, never wider than the room it is given. Without it the
   * text is one line.
   */
  wrap?: boolean
  /**
   * A dot before the text in the variant's own dot color (the `*_soft` variants have one): a live state, never color alone (not with `onPress`).
   * The badge is as wide as its dot, its text and its padding, never wider than `badge.base.dot_max_width`; a longer text ends with an ellipsis.
   */
  dot?: boolean
  /**
   * A badge that is tapped: a pressable with the badge's look, its touch area a control tall (the badge is small), dimmed while
   * pressed and while `disabled`.
   */
  onPress?: () => void
  disabled?: boolean
  accessibilityLabel?: string
  children?: React.ReactNode
  style?: ViewStyle
  testID?: string
}

export const OBadge = ({ variant = 'primary', size = 'sm', count = false, wrap = false, dot = false, onPress, disabled = false, accessibilityLabel, children, style, testID }: Props) => {
  const theme: any = useTheme()
  const styles = useMemo(() => {
    const badge = theme.native.components.badge
    const look = badge.variants[variant] ?? badge.variants.primary
    const sized = badge.sizes[size]
    return StyleSheet.create({
      box: {
        alignSelf: 'flex-start',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: sized.height,
        minWidth: sized.height,
        paddingHorizontal: count ? 0 : sized.padding_x,
        borderRadius: count ? badge.shapes.count.radius : badge.base.radius,
        backgroundColor: look.background,
        // A text of several lines has a little room above and below it, and the box never outgrows its row.
        ...(wrap && { maxWidth: '100%', paddingVertical: themeSpace(theme, 'xxs') }),
        // A dot goes before the text on one line; the badge is as wide as its text up to the theme's maximum, and past it the text ends with an ellipsis.
        ...(dot && { flexDirection: 'row' as const, gap: badge.base.dot_gap, maxWidth: badge.base.dot_max_width }),
      },
      // With a dot the text gives way (an ellipsis) before the box outgrows the room it is given.
      text: { ...nativeTextStyle(badge.base.text), color: look.color, ...(dot && { flexShrink: 1 }) },
      dot: { width: badge.base.dot_size, height: badge.base.dot_size, borderRadius: themeRadius(theme, 'full', { fixed: true }), backgroundColor: look.dot ?? look.color },
      // A text of several lines is centered and may shrink with its box.
      wrapText: { ...nativeTextStyle(badge.base.text), color: look.color, flexShrink: 1, textAlign: 'center' },
    })
  }, [theme, variant, size, count, wrap, dot])
  if (onPress) {
    // The touch area reaches a control's height above and below the badge.
    const reach = Math.max(0, (themeControlHeight(theme, 'md') - theme.native.components.badge.sizes[size].height) / 2)
    return (
      <Pressable
        accessibilityRole='button'
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        hitSlop={{ top: reach, bottom: reach }}
        style={({ pressed }) => [
          styles.box,
          style,
          pressed && { opacity: themeOpacity(theme, 'pressed') },
          disabled && { opacity: themeOpacity(theme, 'disabled') }
        ]}
        testID={testID}
      >
        <OText style={styles.text} numberOfLines={1}>{children}</OText>
      </Pressable>
    )
  }
  return (
    <View style={[styles.box, style]} testID={testID}>
      {dot && <View style={styles.dot} testID={testID && `${testID}-dot`} />}
      <OText style={wrap ? styles.wrapText : styles.text} numberOfLines={wrap ? undefined : 1}>{children}</OText>
    </View>
  )
}

export default OBadge
