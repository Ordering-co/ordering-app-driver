/**
 * @format
 */

import { AppRegistry } from 'react-native'
import App from './App'
import { isLocalSimulatorMode } from './src/onboarding/ios-local-mode'
import { name as appName } from './app.json'

if (!isLocalSimulatorMode()) {
  const { getMessaging, setBackgroundMessageHandler } = require('@react-native-firebase/messaging')
  setBackgroundMessageHandler(getMessaging(), async () => {})
}

AppRegistry.registerComponent(appName, () => App)
