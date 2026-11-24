import React, { useMemo } from 'react'
import { Pressable, StyleSheet } from 'react-native'
import { useTheme } from 'styled-components/native'
import { nativeTextStyle, themeControlHeight, themeOpacity, themeSpace } from '@/theme/helpers'
import { Icon, SectionTitle } from '../shared'

interface Props {
  title: string
  expanded: boolean
  onPress: () => void
  testID?: string
}

/**
 * The title of a card that opens and closes (custom fields, business,
 * customer): the order details' section title (`order_details.address_title`)
 * and the one accordion glyph of the app. The row is the touch target, grown
 * to the `md` control height without changing the card's height.
 */
export const CollapsibleTitle = ({ title, expanded, onPress, testID }: Props) => {
  const theme: any = useTheme()
  const text = theme.native.components.order_details.base.address_title
  const styles = useMemo(() => {
    const slop = Math.max(0, (themeControlHeight(theme, 'md') - nativeTextStyle(text).lineHeight) / 2)
    return {
      slop: { top: slop, bottom: slop },
      ...StyleSheet.create({
        row: { flexDirection: 'row', alignItems: 'center', gap: themeSpace(theme, 'sm') },
        // The row centers the glyph on the title: the title's own space under it goes.
        title: { flex: 1, marginBottom: 0 },
        pressed: { opacity: themeOpacity(theme, 'pressed') }
      })
    }
  }, [theme, text])
  return (
    <Pressable
      testID={testID}
      accessibilityRole='button'
      accessibilityLabel={title}
      accessibilityState={{ expanded }}
      hitSlop={styles.slop}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <SectionTitle text={text} style={styles.title} numberOfLines={1}>{title}</SectionTitle>
      <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size='sm' color='text_muted' />
    </Pressable>
  )
}
