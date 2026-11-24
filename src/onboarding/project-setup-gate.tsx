import React from 'react'
import { Text, View } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { hideSplash } from '../utils/splash'
import { prepareProjectStorage, isProjectOnboardingEnabled } from './prepareProjectStorage'
import { getLocalSimulatorSettings, isLocalSimulatorMode } from './ios-local-mode'

// Separate readiness hooks from the app/provider tree. Pending/ready/error transitions
// mount different children, never change the hooks of an already mounted app component.
const PreparedProjectSetupGate = ({ settings, children }: { settings: any, children: (config: any) => React.ReactNode }) => {
  const [config, setConfig] = React.useState<any>(null)
  const [error, setError] = React.useState(false)
  React.useEffect(() => {
    let active = true
    const initialize = async () => prepareProjectStorage(getLocalSimulatorSettings(settings), AsyncStorage, { development: __DEV__ })
    initialize().then(next => {
      if (active) setConfig(next)
    }).catch(() => {
      if (active) setError(true)
    })
    return () => { active = false }
  }, [settings])
  React.useEffect(() => {
    if (error) hideSplash()
  }, [error])
  if (error) return <View accessible accessibilityRole="alert"><Text>Unable to prepare project storage. Close and reopen the app.</Text></View>
  if (!config) return null
  return <>{children(config)}</>
}

export const ProjectSetupGate = ({ settings, children }: { settings: any, children: (config: any) => React.ReactNode }) =>
  isProjectOnboardingEnabled(settings, __DEV__, isLocalSimulatorMode())
    ? <PreparedProjectSetupGate settings={settings}>{children}</PreparedProjectSetupGate>
    : <>{children(settings)}</>
