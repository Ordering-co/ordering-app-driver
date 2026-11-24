import { PERMISSIONS } from 'react-native-permissions'

/**
 * What the location permissions screen lists: each permission the app asks for on this device, in the
 * words a driver understands, with whether it is granted. The permissions are the ones the context
 * asks (`getPermissions`) and their state the context's last check (`permissions.locationStatus`,
 * a status per permission), so a row says only what the system told the app. A permission the app
 * has no words for is not listed. The ones that work while the app is in use come before the one that
 * works in the background.
 */
export type LocationPermissionRow = {
  permission: string
  /** The words of the row, translated. */
  label: string
  granted: boolean
}

type Translate = (key: string, fallback?: string) => string
type Words = { label: string, rank: number }

/**
 * The words of a permission, or nothing for one that is not a location's. Each text is a call of its
 * own, with its key and its English: the translation catalog is read from them.
 */
const wordsOf = (t: Translate, permission: string): Words | null => {
  if (!permission) return null
  if (permission === PERMISSIONS.IOS.LOCATION_WHEN_IN_USE) {
    return { label: t('LOCATION_WHILE_USING_THE_APP', 'Location while using the app'), rank: 0 }
  }
  if (permission === PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION) {
    return { label: t('LOCATION_PRECISE', 'Precise location'), rank: 0 }
  }
  if (permission === PERMISSIONS.ANDROID.ACCESS_COARSE_LOCATION) {
    return { label: t('LOCATION_APPROXIMATE', 'Approximate location'), rank: 1 }
  }
  if (permission === PERMISSIONS.IOS.LOCATION_ALWAYS || permission === PERMISSIONS.ANDROID.ACCESS_BACKGROUND_LOCATION) {
    return { label: t('LOCATION_ALWAYS_IN_THE_BACKGROUND', 'Location always (in the background)'), rank: 2 }
  }
  return null
}

export const locationPermissionRows = (
  t: Translate,
  permissions: string[],
  statuses: Record<string, string> | string | null | undefined
): LocationPermissionRow[] => permissions
  .map((permission) => ({ permission, words: wordsOf(t, permission) }))
  .filter((row): row is { permission: string, words: Words } => row.words !== null)
  .sort((a, b) => a.words.rank - b.words.rank)
  .map(({ permission, words }) => ({
    permission,
    label: words.label,
    granted: typeof statuses === 'object' && statuses !== null && statuses[permission] === 'granted'
  }))
