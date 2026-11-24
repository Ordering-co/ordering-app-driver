import {
  OneSignal,
  LogLevel,
  type NotificationClickEvent,
  type PushSubscriptionChangedState
} from 'react-native-onesignal'

import { shouldPromptForPushNotifications } from './oneSignalGate'

/** What the app registers in `notification_tokens`; LogoutButton reads it to unregister the token. */
export const NOTIFICATION_STATE_KEY = 'notification_state'
/** The last user, email and SMS given to OneSignal: a changed email or number removes the old one. */
export const ONESIGNAL_IDENTITY_KEY = 'onesignal_identity'
/** The permission dialog was shown once on this install. */
export const ONESIGNAL_PERMISSION_ASKED_KEY = 'onesignal_permission_asked'

/**
 * What the app registers in `notification_tokens`. A OneSignal state carries no
 * `notification_provider`, as the driver app has always registered it; Firebase's
 * carries `fcm`.
 */
export type PushState = {
  notification_app: unknown
  notification_token?: string | null
  notification_provider?: 'fcm'
}

export type OneSignalIdentity = {
  appId: string
  externalId: string
  email?: string | null
  sms?: string | null
}

type PushStorage = {
  get: (key: string) => Promise<any>
  set: (key: string, value: any) => void
  remove: (key: string) => void
}

type OneSignalPushOptions = {
  storage: PushStorage
  notificationApp: unknown
  /** The state to register (a push subscription id arrived), or null after a teardown. */
  onState: (state: PushState | null) => void
  onNotificationClick: (notification: unknown) => void
  /**
   * The notification permission is granted: it already was when the setup looked, or the
   * driver just accepted the dialog. The driver app checks the iOS banner style then.
   */
  onPermissionGranted?: () => void
}

/** Deletes the token's row in `notification_tokens` (the user is still logged in). */
type UnregisterToken = (token: string) => Promise<void>

/**
 * OneSignal 5 for one mount of the root navigator: setup, teardown and the
 * SDK listeners. A setup that changes nothing does nothing (the configs load
 * again each time the checkout opens, and v5's addEmail / addSms queue an
 * operation on every call). `dispose()` removes the listeners: the navigator
 * mounts again when the API comes back.
 */
export function createOneSignalPush ({ storage, notificationApp, onState, onNotificationClick, onPermissionGranted }: OneSignalPushOptions) {
  // Each setup and teardown; an older setup stops when it sees a newer one.
  let generation = 0
  // Each teardown: a permission answered after one does not opt in.
  let session = 0
  let active = false
  let inFlight = false
  let initializedAppId: string | null = null
  let identity: OneSignalIdentity | null = null
  let token: string | null = null
  let disposed = false
  let listeners: {
    click: (event: NotificationClickEvent) => void
    change: (event: PushSubscriptionChangedState) => void
    permission: (granted: boolean) => void
  } | null = null

  const isLive = () => active || inFlight

  const initialize = (appId: string) => {
    if (initializedAppId === appId) {
      return
    }
    // Verbose in development only: at that level the native SDK writes its requests (the user's
    // email, phone and external id) to the device's log, which a release build must not do.
    OneSignal.Debug.setLogLevel(__DEV__ ? LogLevel.Verbose : LogLevel.Warn)
    OneSignal.initialize(appId)
    initializedAppId = appId
  }

  // State and storage from the id itself, never from an older state: the id
  // can arrive through `getIdAsync` or, on a clean install, through 'change'.
  const publishToken = (id: string) => {
    if (token === id) {
      return
    }
    token = id
    const state: PushState = {
      notification_app: notificationApp,
      notification_token: id
    }
    storage.set(NOTIFICATION_STATE_KEY, state)
    onState(state)
  }

  // After `initialize` (the native module throws before it on Android).
  const addListeners = () => {
    if (listeners) {
      return
    }
    listeners = {
      click: ({ notification }) => {
        onNotificationClick(notification)
      },
      change: ({ current }) => {
        if (!isLive()) {
          return
        }
        if (current?.id) {
          publishToken(current.id)
        }
        if (!current?.optedIn) {
          OneSignal.InAppMessages.addTrigger('prompt_ios', 'true')
        }
      },
      // A permission granted later (from the settings) resumes a subscription
      // a teardown opted out.
      permission: (granted) => {
        if (granted && isLive()) {
          OneSignal.User.pushSubscription.optIn()
        }
      }
    }
    OneSignal.Notifications.addEventListener('click', listeners.click)
    OneSignal.User.pushSubscription.addEventListener('change', listeners.change)
    OneSignal.Notifications.addEventListener('permissionChange', listeners.permission)
  }

  const removeListeners = () => {
    if (!listeners) {
      return
    }
    OneSignal.Notifications.removeEventListener('click', listeners.click)
    OneSignal.User.pushSubscription.removeEventListener('change', listeners.change)
    OneSignal.Notifications.removeEventListener('permissionChange', listeners.permission)
    listeners = null
  }

  const setup = async (next: OneSignalIdentity) => {
    if (disposed) {
      return
    }
    if (active && token && identity &&
      identity.appId === next.appId &&
      identity.externalId === next.externalId &&
      (identity.email || '') === (next.email || '') &&
      (identity.sms || '') === (next.sms || '')) {
      return
    }
    const current = ++generation
    const startedIn = session
    inFlight = true
    try {
      initialize(next.appId)
      addListeners()

      // The user first, then the email and SMS: v5 adds them to the current
      // user (an anonymous one before login), not to the device.
      const known = identity && identity.externalId === next.externalId ? identity : null
      try {
        if (!known) {
          OneSignal.login(next.externalId)
        }
      } catch (error) {
        console.log('OneSignal setup error:', error)
      }
      const stored = await storage.get(ONESIGNAL_IDENTITY_KEY)
      if (current !== generation) {
        return
      }
      // v5 adds (v4 replaced): a changed email or number removes the old one.
      const before = known ?? (stored && stored.externalId === next.externalId ? stored : null)
      try {
        if (before?.email && before.email !== next.email) {
          OneSignal.User.removeEmail(before.email)
        }
        if (next.email && known?.email !== next.email) {
          OneSignal.User.addEmail(next.email)
        }
        if (before?.sms && before.sms !== next.sms) {
          OneSignal.User.removeSms(before.sms)
        }
        if (next.sms && known?.sms !== next.sms) {
          OneSignal.User.addSms(next.sms)
        }
      } catch (error) {
        console.log('OneSignal setup error:', error)
      }
      identity = next
      storage.set(ONESIGNAL_IDENTITY_KEY, {
        externalId: next.externalId,
        email: next.email || null,
        sms: next.sms || null
      })

      let hasNotificationPermission = false
      try {
        hasNotificationPermission = await OneSignal.Notifications.getPermissionAsync()
      } catch (error) {
        console.log('OneSignal permission error:', error)
      }
      if (current !== generation) {
        return
      }

      if (!shouldPromptForPushNotifications({ hasNotificationPermission })) {
        // Resumes a subscription a teardown (logout, the switch to Firebase)
        // opted out; with the permission granted it does not prompt.
        OneSignal.User.pushSubscription.optIn()
        onPermissionGranted?.()
      } else {
        // The dialog once per install: Android 13+ would show it a second
        // time, in the middle of a checkout, after it was denied.
        const asked = await storage.get(ONESIGNAL_PERMISSION_ASKED_KEY)
        if (current !== generation) {
          return
        }
        if (!asked) {
          storage.set(ONESIGNAL_PERMISSION_ASKED_KEY, true)
          // v4's trigger for an in-app message that explains the prompt (a dashboard may key on it).
          OneSignal.InAppMessages.addTrigger('notification_prompt', 'true')
          OneSignal.Notifications.requestPermission(false)
            .then(granted => {
              console.log('Prompt response:', granted)
              if (granted && startedIn === session && isLive()) {
                OneSignal.User.pushSubscription.optIn()
                onPermissionGranted?.()
              }
            })
            .catch(error => {
              console.log('OneSignal permission prompt error:', error)
            })
        }
      }

      // The push subscription id (the v4 player id, kept on update): null
      // until OneSignal creates the subscription, then it arrives through 'change'.
      let subscriptionId: string | null = null
      try {
        subscriptionId = await OneSignal.User.pushSubscription.getIdAsync()
      } catch (error) {
        console.log('OneSignal subscription id error:', error)
      }
      if (current !== generation) {
        return
      }
      if (subscriptionId) {
        publishToken(subscriptionId)
      }
      active = true
    } finally {
      // A stale setup leaves the flag to the newer setup (or the teardown) that replaced it.
      if (current === generation) {
        inFlight = false
      }
    }
  }

  const teardown = async (unregister?: UnregisterToken) => {
    if (disposed) {
      return
    }
    const current = ++generation
    session += 1
    const registered = token
    active = false
    inFlight = false
    identity = null
    token = null
    if (initializedAppId) {
      try {
        OneSignal.User.pushSubscription.optOut()
        OneSignal.logout()
      } catch (error) {
        console.log('OneSignal teardown error:', error)
      }
    }
    if (registered && unregister) {
      try {
        await unregister(registered)
      } catch (error) {
        console.log('OneSignal token unsubscribe error:', error)
      }
    }
    // A setup that started meanwhile owns the state and the storage now.
    if (current !== generation) {
      return
    }
    storage.remove(NOTIFICATION_STATE_KEY)
    onState(null)
  }

  /**
   * The app opened in Firebase mode with a OneSignal subscription left from
   * before (the project switched while the app was closed): opts it out, once.
   */
  const retireStaleSubscription = async (appId: unknown, unregister?: UnregisterToken) => {
    if (disposed || !appId || typeof appId !== 'string' || isLive()) {
      return
    }
    const stored = await storage.get(NOTIFICATION_STATE_KEY)
    if (!stored?.notification_token || stored.notification_provider === 'fcm' || isLive()) {
      return
    }
    try {
      // Any call before `initialize` throws inside the native module on Android.
      initialize(appId)
      OneSignal.User.pushSubscription.optOut()
      OneSignal.logout()
    } catch (error) {
      console.log('OneSignal teardown error:', error)
    }
    if (unregister) {
      try {
        await unregister(stored.notification_token)
      } catch (error) {
        console.log('OneSignal token unsubscribe error:', error)
      }
    }
    storage.remove(NOTIFICATION_STATE_KEY)
  }

  const dispose = () => {
    disposed = true
    generation += 1
    session += 1
    active = false
    inFlight = false
    removeListeners()
  }

  return {
    setup,
    teardown,
    retireStaleSubscription,
    dispose,
    isActive: isLive,
    getToken: () => token
  }
}

export type OneSignalPush = ReturnType<typeof createOneSignalPush>
