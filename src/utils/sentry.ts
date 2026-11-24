import * as Sentry from '@sentry/react-native'
import DeviceInfo from 'react-native-device-info'
import sentryConfig from '../sentry.json'
import settings from '../config.json'

export function initSentry () {
  try {
    const dsn = sentryConfig?.dsn
    if (__DEV__ || !dsn) return

    const buildNumber = DeviceInfo.getBuildNumber()
    Sentry.init({
      dsn,
      environment: 'production',
      release: `${DeviceInfo.getBundleId()}@${DeviceInfo.getVersion()}+${buildNumber}`,
      dist: buildNumber,
      enableNativeCrashHandling: false,
      enableAppHangTracking: false,
      tracesSampleRate: 0.1
    })
    Sentry.setTag('app', 'app-driver-26')
    Sentry.setTag('project', settings.project)
  } catch {}
}
