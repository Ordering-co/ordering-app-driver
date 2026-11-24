import React, { useMemo } from 'react'
import { StyleSheet, View } from 'react-native'
import { useTheme } from 'styled-components/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ScheduleBlocked as ScheduleBlockedController } from '@ui'
import { themeColor } from '@/theme/helpers'

export const ScheduleBlocked = ({ route }: any) => {
  const theme = useTheme()
  const insets = useSafeAreaInsets()

  const styles = useMemo(() => StyleSheet.create({
    wrapper: {
      flex: 1,
      backgroundColor: themeColor(theme, 'background'),
      paddingTop: insets.top,
    },
  }), [theme, insets.top])

  const ScheduleBlockedProps = {
    nextSchedule: route?.params?.nextSchedule,
  }

  return (
    <View style={styles.wrapper}>
      <ScheduleBlockedController {...ScheduleBlockedProps} />
    </View>
  )
}
