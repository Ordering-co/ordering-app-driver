import React from 'react'
import { StyleSheet } from 'react-native'
import { useTheme } from 'styled-components/native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ScheduleBlocked as ScheduleBlockedController } from '@ui'

export const ScheduleBlocked = ({ navigation, route }: any) => {
  const theme = useTheme()

  const styles = StyleSheet.create({
    wrapper: {
      flex: 1,
      backgroundColor: theme.colors.clear,
    },
  })

  const ScheduleBlockedProps = {
    nextSchedule: route?.params?.nextSchedule,
  }

  return (
    <SafeAreaView style={styles.wrapper} edges={['top']}>
      <ScheduleBlockedController {...ScheduleBlockedProps} />
    </SafeAreaView>
  )
}
