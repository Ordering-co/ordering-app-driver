import React, { useMemo } from 'react'
import { View } from 'react-native'
import { useTheme } from 'styled-components/native'

import { contentStyles } from './styles'
import { OText } from '../shared'

/** A line of two texts: a name and its value (the payments, the spot, the vehicle). */
export const OrderPair = ({ label, value }: { label: React.ReactNode, value: React.ReactNode }) => {
  const theme: any = useTheme()
  const styles = useMemo(() => contentStyles(theme), [theme])
  return (
    <View style={styles.pair}>
      <OText style={styles.pairLabel}>{label}</OText>
      <OText style={styles.info}>{value}</OText>
    </View>
  )
}
