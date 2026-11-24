import { shouldSetupFirebasePush } from './firebasePushConsent'
import { shouldSetupOneSignal } from './oneSignalGate'

export type PushProviderName = 'onesignal' | 'fcm'

export type PushProvider = {
  setup: () => Promise<void> | void
  teardown: () => Promise<void> | void
  /** Set up, or being set up. */
  isActive: () => boolean
}

type PushGates = {
  configsLoading?: boolean
  firebaseEnabled?: unknown
  oneSignalAppId?: unknown
  auth?: unknown
}

/**
 * The provider the app registers with: Firebase when the project turned it on,
 * else OneSignal when it has an app id; null without a session.
 * Undefined while the configs load: nothing is set up or torn down then.
 */
export function getDesiredPushProvider (gates: PushGates): PushProviderName | null | undefined {
  if (gates.configsLoading) {
    return undefined
  }
  const { configsLoading, auth } = gates
  if (shouldSetupFirebasePush({ configsLoading, enabled: gates.firebaseEnabled, auth })) {
    return 'fcm'
  }
  if (shouldSetupOneSignal({ configsLoading, appId: gates.oneSignalAppId, auth })) {
    return 'onesignal'
  }
  return null
}

/**
 * One change of provider at a time, in the order asked: the other provider's
 * teardown ends (its token deleted, the state and storage reset) before the
 * wanted one is set up. Run side by side, the teardown finished last and
 * erased the state the new provider had just written.
 */
export function createPushProviderSwitch () {
  let queue: Promise<void> = Promise.resolve()
  let stopped = false

  const sync = (desired: PushProviderName | null, providers: Record<PushProviderName, PushProvider>) => {
    queue = queue.then(async () => {
      if (stopped) {
        return
      }
      for (const name of Object.keys(providers) as PushProviderName[]) {
        if (name !== desired && providers[name].isActive()) {
          await providers[name].teardown()
        }
      }
      if (desired && !stopped) {
        await providers[desired].setup()
      }
    }).catch((error) => {
      console.log('Push provider switch error:', error)
    })
    return queue
  }

  /** The navigator unmounted: what is still queued does not run. */
  const stop = () => {
    stopped = true
  }

  return { sync, stop }
}
