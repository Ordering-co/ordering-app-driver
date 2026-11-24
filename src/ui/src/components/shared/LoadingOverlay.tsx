import React from 'react'
import { ActivityIndicator, Modal, StyleSheet, View } from 'react-native'
import { useTheme } from 'styled-components/native'
import { themeColor } from '@/theme/helpers'

/**
 * A blocking loading overlay (a transparent Modal, the theme's scrim and a
 * large spinner in the color on it). It covers the whole window, status bar
 * included, while `visible`; the back button does not close it.
 */
type LoadingOverlayProps = {
  visible?: boolean
  testID?: string
}

// Layout only (no theme values): safe at module level.
const layout = StyleSheet.create({ scrim: { flex: 1, alignItems: 'center', justifyContent: 'center' } })

export const LoadingOverlay = ({ visible = false, testID = 'loading-overlay' }: LoadingOverlayProps) => {
  const theme: any = useTheme()
  if (!visible) return null
  return (
    <Modal transparent visible animationType='none' statusBarTranslucent onRequestClose={() => {}}>
      <View style={[layout.scrim, { backgroundColor: themeColor(theme, 'overlay') }]} testID={testID}>
        <ActivityIndicator size='large' color={themeColor(theme, 'on_overlay')} />
      </View>
    </Modal>
  )
}

export default LoadingOverlay
