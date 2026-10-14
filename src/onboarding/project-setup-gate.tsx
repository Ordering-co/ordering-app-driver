import React from 'react'
import { Text, View } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import SplashScreen from 'react-native-splash-screen'
import { prepareProjectStorage } from './prepareProjectStorage'
import { getLocalSimulatorSettings } from './ios-local-mode'

// Separate readiness hooks from the app/provider tree. Pending/ready/error transitions
// mount different children, never change the hooks of an already mounted app component.
export const ProjectSetupGate = ({ settings, children }: { settings: any, children: (config: any) => React.ReactNode }) => {
  const [config, setConfig] = React.useState<any>(__DEV__ ? null : settings)
  const [error, setError] = React.useState(false)
  const [ready, setReady] = React.useState(!__DEV__ && !settings.use_root_point)
  React.useEffect(() => {
    let active = true
    const initialize = async () => prepareProjectStorage(getLocalSimulatorSettings(settings), AsyncStorage, { development: __DEV__ })
    initialize().then(next => {
      if (active) { setConfig(next); setReady(true) }
    }).catch(() => {
      if (active) {
        if (__DEV__) setError(true)
        else setReady(true)
      }
    })
    return () => { active = false }
  }, [settings])
  React.useEffect(() => {
    if (ready || error) SplashScreen.hide()
  }, [ready, error])
  if (error) return <View accessible accessibilityRole="alert"><Text>Unable to prepare project storage. Close and reopen the app.</Text></View>
  if (!config) return null
  return <>{children(config)}</>
}
