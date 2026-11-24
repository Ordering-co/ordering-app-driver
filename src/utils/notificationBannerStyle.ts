import { useCallback } from 'react'
import { NativeModules, Platform } from 'react-native'
import { openSettings } from 'react-native-permissions'
import { useLanguage } from '@components'
import { presentConfirm } from '../ui/src/components/shared/confirmAction'

/**
 * iOS only. A "Temporary" banner disappears in seconds and a driver misses the order it
 * announced, so the app asks for "Persistent" (Settings > Notifications). The decision
 * (2026-11-17): the alert shows on every launch with a session and on every login while
 * the style is temporary, and a driver cannot switch "Available to receive orders" on
 * until it is persistent. Android, and an iOS build without the native module, are never
 * blocked.
 */

type Translate = (key: string, fallback: string) => string

/** What the native `NotificationSettings.getAlertStyle()` answers when the banner is temporary. */
const TEMPORARY = 'temporary'

/**
 * True while the iOS banner style is "Temporary". Asked at the moment of use, never cached:
 * the driver may have changed it in Settings a moment ago. A failure of the module counts
 * as not temporary (it never blocks a driver).
 */
export const isTemporaryBannerStyle = async (): Promise<boolean> => {
  if (Platform.OS !== 'ios') return false
  const NotificationSettings = NativeModules?.NotificationSettings
  if (!NotificationSettings?.getAlertStyle) return false
  try {
    return (await NotificationSettings.getAlertStyle()) === TEMPORARY
  } catch (err: any) {
    console.log('Banner style check error - ', err?.message)
    return false
  }
}

/** The alert: Later, or Go to settings. */
export const showPersistentNotificationsAlert = (t: Translate) => {
  presentConfirm({
    title: t('PERSISTENT_NOTIFICATIONS_TITLE', 'Enable persistent notifications'),
    message: t(
      'PERSISTENT_NOTIFICATIONS_MESSAGE',
      'To avoid missing orders, set the banner style to "Persistent" in Settings > Notifications.'
    ),
    acceptText: t('GO_TO_SETTINGS', 'Go to settings'),
    cancelText: t('LATER', 'Later'),
    onAccept: () => openSettings().catch(() => { })
  })
}

/**
 * Checks the banner style and, when it is temporary, shows the alert. Resolves true when it
 * is temporary (the alert was shown), false when it is not.
 */
export const warnIfTemporaryBanners = async (t: Translate): Promise<boolean> => {
  if (!(await isTemporaryBannerStyle())) return false
  showPersistentNotificationsAlert(t)
  return true
}

/**
 * `warnIfTemporaryBanners` with the language's `t`: the one function the root navigator
 * (at launch and at login) and the availability switch (before it goes on) share.
 */
export const useTemporaryBannersWarning = () => {
  const [, t] = useLanguage()
  return useCallback(() => warnIfTemporaryBanners(t), [t])
}
