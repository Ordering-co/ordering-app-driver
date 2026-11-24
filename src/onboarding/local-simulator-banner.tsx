import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { isLocalSimulatorMode } from './ios-local-mode'
import { useAppTheme } from '../theme/AppThemeContext'
import { themeColor, themeSpace, themeText } from '../theme/helpers'

export const LocalSimulatorBanner = ({ project, children }: { project: string, children: React.ReactNode }) => {
  const theme = useAppTheme()
  const styles = React.useMemo(() => StyleSheet.create({
    container: { flex: 1 },
    banner: { backgroundColor: themeColor(theme, 'surface') },
    label: { ...themeText(theme, 'label'), color: themeColor(theme, 'text'), paddingHorizontal: themeSpace(theme, 'md'), paddingVertical: themeSpace(theme, 'sm') }
  }), [theme])
  if (!isLocalSimulatorMode()) return <>{children}</>
  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.banner}>
        <Text accessibilityRole="text" style={styles.label}>
          Local preview · project: {project}
        </Text>
      </SafeAreaView>
      {children}
    </View>
  )
}
