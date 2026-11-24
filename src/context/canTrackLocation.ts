import { PERMISSIONS, RESULTS } from 'react-native-permissions'

/**
 * Whether the system lets the app read the position at all, which is what the driver's background tracking needs
 * (owner's decision of 2026-11-19: "While Using the App" keeps tracking and sending for as long as the system delivers
 * positions; the dialog that asks for "Always" is a separate matter, see `isGrantedPermissions`).
 *
 * - iOS: "While Using" or "Always" is granted. Denied, restricted and not yet asked are not.
 * - Android: every permission the app asks for except `ACCESS_BACKGROUND_LOCATION` (only Android 10 lists it) is granted:
 *   the foreground service keeps tracking with the foreground permission alone.
 *
 * `results` is `permissions.locationStatus` (the map `checkMultiple` answers); anything else (the initial 'unavailable')
 * is false.
 */
export function canTrackLocation (results: unknown, platform: string): boolean {
  if (!results || typeof results !== 'object' || Array.isArray(results)) return false
  const status = results as Record<string, unknown>
  if (platform === 'ios') {
    return status[PERMISSIONS.IOS.LOCATION_WHEN_IN_USE] === RESULTS.GRANTED || status[PERMISSIONS.IOS.LOCATION_ALWAYS] === RESULTS.GRANTED
  }
  const foreground = Object.entries(status).filter(([permission]) => permission !== PERMISSIONS.ANDROID.ACCESS_BACKGROUND_LOCATION)
  return foreground.length > 0 && foreground.every(([, result]) => result === RESULTS.GRANTED)
}
