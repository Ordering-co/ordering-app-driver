import React, { useMemo } from 'react'
import { ActivityIndicator, StyleSheet, View, ViewStyle } from 'react-native'
import { useTheme } from 'styled-components/native'
import { themeColor, themeIconSize, themePart, type IconLevel } from '@/theme/helpers'

/**
 * The app's inline spinner: something is loading inside a piece of the screen
 * (a row, a sheet, a button's place). `components.spinner` gives its color;
 * its size is an icon size of the theme (`sm`, `md`, `lg`: the names of the
 * spinner's sizes), the same on both platforms.
 *
 *   <OSpinner />
 *   <OSpinner size='sm' color='text_muted' />
 *
 * A screen that waits as a whole uses `LoadingOverlay`; a list, its skeleton.
 */
interface Props {
  size?: IconLevel
  /** A color role of the theme, or a color the theme gave; the spinner's own by default. */
  color?: string
  style?: ViewStyle
  testID?: string
  accessibilityLabel?: string
}

/**
 * The side of the system's small indicator, in pt, on both platforms. Only
 * Android takes a size in pt, so the small one is scaled to the theme's size.
 */
const SYSTEM_SMALL = 20

export const OSpinner = ({ size = 'md', color, style, testID, accessibilityLabel }: Props) => {
  const theme: any = useTheme()
  const side = themeIconSize(theme, size)
  const styles = useMemo(() => StyleSheet.create({
    box: { width: side, height: side, alignItems: 'center', justifyContent: 'center' },
    indicator: { transform: [{ scale: side / SYSTEM_SMALL }] },
  }), [side])
  const paint = color === undefined
    ? themePart(theme, 'spinner', 'base.color')
    : theme.native.tokens.color[color] !== undefined ? themeColor(theme, color) : color
  return (
    <View style={[styles.box, style]} testID={testID}>
      <ActivityIndicator size='small' color={paint} style={styles.indicator} accessibilityLabel={accessibilityLabel} />
    </View>
  )
}

export default OSpinner
