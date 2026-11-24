type OneSignalGate = {
  configsLoading?: boolean
  appId?: unknown
  auth?: unknown
}

/** OneSignal is set up for a signed-in driver of a project that has an app id (the driver app asks for no cookie consent). */
export function shouldSetupOneSignal (params: OneSignalGate) {
  return !params.configsLoading && !!params.appId && !!params.auth
}

export function shouldTeardownOneSignal (params: OneSignalGate) {
  return !params.configsLoading && !shouldSetupOneSignal(params)
}

export function shouldPromptForPushNotifications (deviceState?: { hasNotificationPermission?: boolean } | null) {
  return !deviceState?.hasNotificationPermission
}
