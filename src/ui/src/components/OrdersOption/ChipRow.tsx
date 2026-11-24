import React, { useMemo } from 'react'
import { StyleSheet, View } from 'react-native'
import { useTheme } from 'styled-components/native'

import { themeSpace } from '@/theme/helpers'

/**
 * The chips of one filter of the search (OrdersSearch mockup): they wrap onto as many lines as they need, `sm`
 * apart on both axes, so every chip is in sight ("Custom range" is never off the screen's edge).
 */
export const ChipRow = ({ children, testID, accessibilityRole, accessibilityLabel }: {
  children: React.ReactNode
  testID?: string
  /** A row of chips that are one choice (`radiogroup`) says so, with its name, and each chip announces whether it is the selected one. */
  accessibilityRole?: 'radiogroup'
  accessibilityLabel?: string
}) => {
  const theme: any = useTheme()
  const styles = useMemo(() => StyleSheet.create({
    row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: themeSpace(theme, 'sm') },
  }), [theme])
  return <View style={styles.row} testID={testID} accessibilityRole={accessibilityRole} accessibilityLabel={accessibilityLabel}>{children}</View>
}
