import React, { useMemo } from 'react'
import { Pressable, StyleSheet, View, ViewStyle } from 'react-native'
import { useTheme } from 'styled-components/native'
import { nativeBoxStyle, themeOpacity, themeSpace } from '@/theme/helpers'

/**
 * A box of content: `components.card` (background, border, radius, shadow and
 * padding), or a component that inherits it (`look`: for example
 * `theme.native.components.order_card.base`). With `onPress` the whole card is
 * the touch target, with the theme's pressed opacity.
 *
 * A `footer` is the card's own buttons (an order's quick actions): it sits in the card's box but
 * **outside** the pressable. A button inside a pressable card has the card above it in the responder
 * chain, and any second touch that begins while a finger is on the button (Android sends it to the
 * first touch's view, wherever it lands) asks the card for the responder and gets it: the button's
 * press is cancelled, its hold with it, and the card opens when the first finger lifts. With the
 * footer beside the pressable no ancestor wants the touch, so a button's touches are the button's
 * alone and the card's press never fires from them. The pressable keeps the box's padding as its own
 * touch margin (`hitSlop`), so the whole card but the footer still opens.
 *
 * The footer is `sm` under the body, and that gap belongs to the card's pressable (its bottom padding), not to the footer (no margin of its
 * own) and not to nobody: a touch between the body's last line and the buttons opens the card, and only the buttons themselves are
 * outside it.
 */
interface Props {
  /** The look of a card kind that inherits `card`; `card`'s own by default. */
  look?: Record<string, any>
  onPress?: () => void
  disabled?: boolean
  children?: React.ReactNode
  /** The card's buttons: in the box, outside the pressable (see above). */
  footer?: React.ReactNode
  style?: ViewStyle
  testID?: string
  accessibilityLabel?: string
}

export const OCard = ({ look, onPress, disabled, children, footer, style, testID, accessibilityLabel }: Props) => {
  const theme: any = useTheme()
  const styles = useMemo(() => {
    const card = theme.native.components.card.base
    const own = { ...card, ...(look ?? {}) }
    return StyleSheet.create({
      box: {
        borderRadius: own.radius,
        padding: own.padding ?? card.padding,
        ...nativeBoxStyle(own),
      },
      pressed: { opacity: themeOpacity(theme, 'pressed') },
      // The space between the body and the footer: the pressable's own with a press, the footer's wrapper without one.
      bodyGap: { paddingBottom: themeSpace(theme, 'sm') },
      footerGap: { marginTop: themeSpace(theme, 'sm') },
    })
  }, [theme, look])
  // With a footer the pressable is inside the box: its touch margin is the box's padding (not at the bottom, where the footer is).
  const padding = Number(look?.padding ?? theme.native.components.card.base.padding) || 0
  const margin = useMemo(() => ({ top: padding, left: padding, right: padding }), [padding])
  if (!onPress) {
    return (
      <View style={[styles.box, style]} testID={testID}>
        {children}
        {!!footer && <View style={styles.footerGap}>{footer}</View>}
      </View>
    )
  }
  if (footer) {
    return (
      <View style={[styles.box, style]} testID={testID}>
        <Pressable
          testID={testID ? `${testID}-press` : undefined}
          accessibilityRole='button'
          accessibilityLabel={accessibilityLabel}
          disabled={disabled}
          onPress={onPress}
          hitSlop={margin}
          style={({ pressed }) => [styles.bodyGap, pressed && styles.pressed]}
        >
          {children}
        </Pressable>
        {footer}
      </View>
    )
  }
  return (
    <Pressable
      testID={testID}
      accessibilityRole='button'
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.box, pressed && styles.pressed, style]}
    >
      {children}
    </Pressable>
  )
}

export default OCard
