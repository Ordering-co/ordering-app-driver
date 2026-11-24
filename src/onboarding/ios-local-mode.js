/* global __DEV__ */
import { Platform, Settings } from 'react-native'

// The native marker is reset on every launch and only enabled in Debug iOS simulators.
export const isLocalSimulatorMode = () => {
  if (!__DEV__ || Platform.OS !== 'ios') return false
  try {
    const marker = Settings?.get?.('OrderingLocalSimulatorMode')
    // NSNumber booleans are exposed as 1 by React Native's native JSON cleaner.
    return marker === true || marker === 1
  } catch { return false }
}

export const getLocalSimulatorSettings = settings => {
  if (!isLocalSimulatorMode()) return settings
  const selected = Settings.get('OrderingLocalSimulatorConfig')
  if (!selected || typeof selected.project !== 'string' || !/^[a-z0-9_-]{1,120}$/.test(selected.project)) {
    throw new Error('Local simulator requires a validated public project configuration')
  }
  return {
    ...settings,
    project: selected.project,
    localSimulatorMode: true,
    show_tutorials: false,
    api: {
      ...settings.api,
      url: selected.api?.url ?? settings.api.url,
      version: selected.api?.version ?? settings.api.version,
      language: selected.api?.language ?? settings.api.language
    },
    socket: { ...settings.socket },
    ...(selected.franchiseSlug ? { franchiseSlug: selected.franchiseSlug } : {})
  }
}
