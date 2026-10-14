import React from 'react'
import { Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { isLocalSimulatorMode } from './ios-local-mode'

export const LocalSimulatorBanner = ({ project, children }: { project: string, children: React.ReactNode }) => {
  if (!isLocalSimulatorMode()) return <>{children}</>
  return (
    <View style={{ flex: 1 }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: '#263238' }}>
        <Text accessibilityRole="text" style={{ color: 'white', paddingHorizontal: 12, paddingVertical: 8, fontSize: 13 }}>
          Local preview · project: {project}
        </Text>
      </SafeAreaView>
      {children}
    </View>
  )
}
