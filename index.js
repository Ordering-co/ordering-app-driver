/**
 * @format
 */

import { AppRegistry } from 'react-native'
import { getMessaging, setBackgroundMessageHandler } from '@react-native-firebase/messaging'
import App from './App'
import { name as appName } from './app.json'
import { initSentry } from './src/utils/sentry'
import { isLocalSimulatorMode } from './src/onboarding/ios-local-mode'

if (!isLocalSimulatorMode()) {
  initSentry()
  setBackgroundMessageHandler(getMessaging(), async () => {})
}

AppRegistry.registerComponent(appName, () => App)
