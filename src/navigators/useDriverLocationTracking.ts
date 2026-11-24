import { useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AppState, Linking, Platform } from 'react-native'
import { openSettings } from 'react-native-permissions'

import { useApi, useConfig, useLanguage, useSession } from '@components'
import {
  configure,
  flush,
  getState,
  onState,
  setApiRoot,
  start,
  stop,
  type DriverLocationAuthorization,
  type DriverLocationState,
  type DriverLocationStopReason
} from '../native/driverLocation'
import { PermissionsContext } from '../context/PermissionsContext'
import { getBackgroundGeolocationRunPlan } from './getBackgroundGeolocationRunPlan'
import { getDriverLocationSendOptions, getTrackingEventsUrl } from './driverLocationOptions'
import { getTrackingStartReason, getTrackingStopReason } from './trackingReasons'
import type { DriverLocationDialogKind } from '../ui/src/components/DriverLocationDialog'

/** The numbers the SDK was configured with, kept (docs/LOCATION_MODULE.md §1). */
const DISTANCE_FILTER = 25
const INTERVAL = 40000
const FASTEST_INTERVAL = 20000

/** What tracking needs from the device: any authorization that lets the app read the position (while in use or always). */
const isAuthorized = (authorization: DriverLocationAuthorization | string) =>
  authorization === 'always' || authorization === 'when_in_use'

/**
 * Why the dialog is open: what the device says about the location. On iOS "While Using the App" keeps tracking (decision
 * of the owner, 2026-11-19) but the orders are not tracked in the background: the dialog tells the driver and asks for
 * "Always".
 */
export const getLocationDialogKind = (state: Pick<DriverLocationState, 'authorization' | 'servicesEnabled'>): DriverLocationDialogKind | null => {
  if (Platform.OS === 'ios' && state.authorization === 'when_in_use') return 'always_required'
  if (!isAuthorized(state.authorization)) return 'authorization_changed'
  if (!state.servicesEnabled) return 'services_disabled'
  return null
}

/** Opens the settings where the driver can fix `kind`: the location switch, or the app's permissions. */
export const openLocationSettings = async (kind: DriverLocationDialogKind | null) => {
  try {
    if (kind === 'services_disabled' && Platform.OS === 'android') {
      await Linking.sendIntent('android.settings.LOCATION_SOURCE_SETTINGS')
      return
    }
  } catch {
    // falls through to the app's settings
  }
  try {
    await openSettings()
  } catch {
    // nowhere to go: the driver stays on the dialog
  }
}

/**
 * The driver's background tracking, held in one place for `RootNavigator`: the app's own
 * location module (`src/native/driverLocation.ts`, docs/LOCATION_MODULE.md).
 *
 * - `setApiRoot(ordering.root)` as soon as the root is known (and again if it changes): the native side adds the device id header
 *   to the requests of that host only.
 * - `configure` on token, user, language (the notification's texts), root, permission or send-option change
 *   (`driverLocationOptions.ts`: the minimum interval between requests and `location_at`, from the project's
 *   configs when present); the module swaps the headers and options of the running sender, nothing restarts
 *   and no listener is added. The events url (`{root}/tracking_events`) goes with it unless the project turned
 *   `driver_tracking_events_enabled` off: it is what makes the module record and send the tracking events.
 * - `start` / `stop` by `getBackgroundGeolocationRunPlan` (ready, logged in, user enabled,
 *   permissions granted, not blocked by the schedule), each with its reason (`trackingReasons.ts`), which the module
 *   writes in its `tracking_started` / `tracking_stopped` events.
 * - One subscription to the module's state for the life of the hook (it reads the latest
 *   session through refs): one logout on `unauthorized`, the dialogs for "location services
 *   off" and "permission lost".
 * - Back to the foreground: send what is pending, start again if the system refused it in the
 *   background, and check the device's location once more.
 * - The run plan asks the permission only what tracking needs: the system lets the app read the position (`canTrackLocation`:
 *   "While Using" is enough, on iOS and on Android). Tracking stops for the permission only when it is denied or restricted.
 * - iOS with "While Using the App" only: tracking runs while the system delivers positions, and the driver on shift is told
 *   once (and on each return to the app, unless they closed the dialog) that the orders are not tracked in the background and
 *   that it needs "Always".
 *
 * Returns the props of `DriverLocationDialog`.
 */
export const useDriverLocationTracking = ({
  blockedSchedule,
  driverLoginValidated
}: {
  blockedSchedule?: boolean
  driverLoginValidated?: boolean
}) => {
  const [languageState, t] = useLanguage()
  const [{ user, auth, token, loading: sessionLoading }, { logout }] = useSession()
  const [ordering] = useApi()
  const [{ configs }] = useConfig()
  const { isGrantedPermissions, canTrackLocation, permissions } = useContext(PermissionsContext)

  // The device id header goes to the Ordering API and to no other host (the owner's decision of 2026-11-19): the native side learns
  // which host that is from here, before the first request can leave (a layout effect runs before every parent's `useEffect`, where
  // the providers fetch). Until it is known no request carries the id.
  useLayoutEffect(() => {
    if (ordering?.root) setApiRoot(ordering.root)
  }, [ordering?.root])

  const [ready, setReady] = useState(false)
  const [dialogKind, setDialogKind] = useState<DriverLocationDialogKind | null>(null)

  const logoutRef = useRef(logout)
  logoutRef.current = logout
  const tokenRef = useRef(token)
  tokenRef.current = token
  const loggedOutToken = useRef<string | null>(null)
  /** The kind the driver closed: not asked again until the device is fine once. */
  const dismissedKind = useRef<DriverLocationDialogKind | null>(null)

  const plan = getBackgroundGeolocationRunPlan({
    ready,
    auth,
    userEnabled: user?.enabled,
    blockedSchedule,
    driverLoginValidated,
    permissionsGranted: canTrackLocation
  })
  // Not being ready yet is not a reason to stop: after a reload of the bundle the service is still
  // running and sending, and the hook only has to configure it again. Nor is not knowing yet: the
  // session and the permissions start empty (not logged in, not granted) and answer a moment later.
  const stateKnown = !sessionLoading && permissions?.locationStatus !== 'unavailable'
  const mustStop = stateKnown && getBackgroundGeolocationRunPlan({
    ready: true,
    auth,
    userEnabled: user?.enabled,
    blockedSchedule,
    driverLoginValidated,
    permissionsGranted: canTrackLocation
  }).shouldStop
  /** Why tracking last stopped in this run of the app: tells `available` from `login` at the next start. */
  const lastStopReason = useRef<DriverLocationStopReason | null>(null)
  const shouldRunRef = useRef(plan.shouldStart)
  shouldRunRef.current = plan.shouldStart
  // The driver is on shift whatever the permission says: a module event about the device is news.
  const onShift = getBackgroundGeolocationRunPlan({
    ready: true,
    auth,
    userEnabled: user?.enabled,
    blockedSchedule,
    driverLoginValidated,
    permissionsGranted: true
  }).shouldStart
  const onShiftRef = useRef(onShift)
  onShiftRef.current = onShift
  // iOS: on shift, the permissions read and not enough. "While Using the App" is the case to tell.
  const needsAlways = Platform.OS === 'ios' && stateKnown && onShift && !isGrantedPermissions
  const needsAlwaysRef = useRef(needsAlways)
  needsAlwaysRef.current = needsAlways

  const showDialog = useCallback((kind: DriverLocationDialogKind | null) => {
    if (kind === null) {
      dismissedKind.current = null
      setDialogKind(null)
      return
    }
    if (dismissedKind.current === kind) return
    setDialogKind(kind)
  }, [])

  /** Asks the device again; `news` (a module event) counts while the driver is on shift, a routine check only while tracking runs. */
  const checkDevice = useCallback(async (news = false) => {
    if (!(news ? onShiftRef.current : shouldRunRef.current)) return
    showDialog(getLocationDialogKind(await getState()))
  }, [showDialog])

  /** iOS: says that tracking needs "Always" when the driver allowed the location only while in use. */
  const checkAlways = useCallback(async () => {
    if (!needsAlwaysRef.current) return
    const { authorization } = await getState()
    if (needsAlwaysRef.current && authorization === 'when_in_use') showDialog('always_required')
  }, [showDialog])

  useEffect(() => {
    if (needsAlways) checkAlways().catch(() => undefined)
    // Off shift (a logout) or granted meanwhile: nothing left to ask for.
    else setDialogKind(kind => (kind === 'always_required' ? null : kind))
  }, [needsAlways, checkAlways])

  // One subscription for the life of the hook, whatever the token does.
  useEffect(() => {
    const subscription = onState(kind => {
      if (kind === 'unauthorized') {
        // The module reports it once; this keeps it one logout even if it is heard twice.
        if (loggedOutToken.current === tokenRef.current) return
        loggedOutToken.current = tokenRef.current
        logoutRef.current()
      } else if (kind === 'services_disabled' || kind === 'services_enabled' || kind === 'authorization_changed') {
        checkDevice(true).catch(() => undefined)
      }
    })
    return () => subscription.remove()
  }, [showDialog, checkDevice])

  // The send options: the app's defaults, overridden by the project's configs when they exist. Primitives, so a
  // config that changes (the configs are fetched again) configures the module again and nothing else.
  const { minSendIntervalMs, sendLocationAt } = getDriverLocationSendOptions(configs)
  // The native events recorder (GPS off / on, connection, permission, background, battery saver, simulated location,
  // tracking started / stopped): on unless the project says '0'. A string, so the effect below only runs when it changes.
  const eventsUrl = getTrackingEventsUrl(ordering?.root, configs)

  // Configure: a new token replaces the headers of the running sender; new send options reach it the same way
  // (no restart of tracking, nothing is added to the listeners).
  const notificationTitle = t('BACKGROUND_TRACKING_ENABLED', 'Background tracking enabled')
  const notificationText = t('BACKGROUND_TRACKING_ENABLED_DESC', 'Important for delivery real time location')
  useEffect(() => {
    if (languageState?.loading) return
    // Configured whether or not the location permission is granted (it only stores the configuration; `start` still needs
    // the permission, by the run plan): a session the system ended is reported by `stop('permission')`, which needs the
    // module to know the url and the token (docs/LOCATION_MODULE.md, "Tracking events").
    if (!token || !user?.id) {
      setReady(false)
      return
    }
    let current = true
    configure({
      url: `${ordering.root}/users/${user.id}/locations`,
      headers: { Authorization: `Bearer ${token}` },
      extras: { driver_id: user.id },
      distanceFilter: DISTANCE_FILTER,
      interval: INTERVAL,
      fastestInterval: FASTEST_INTERVAL,
      notification: { title: notificationTitle, text: notificationText },
      minSendIntervalMs,
      sendLocationAt,
      eventsUrl
    })
      .then(state => {
        if (!current) return
        setReady(state.enabled)
        if (state.enabled) console.log('- Driver location is configured and ready')
      })
      .catch((error: any) => {
        console.log('- Driver location could not be configured: ', error?.message)
        if (current) setReady(false)
      })
    return () => {
      current = false
    }
  }, [languageState?.loading, token, user?.id, ordering?.root, notificationTitle, notificationText, minSendIntervalMs, sendLocationAt, eventsUrl])

  // Start and stop by the run plan.
  useEffect(() => {
    if (plan.shouldStart) {
      start(getTrackingStartReason(lastStopReason.current)).then(() => checkDevice()).catch(() => undefined)
    }
    if (mustStop) {
      const reason = getTrackingStopReason({
        auth,
        userEnabled: user?.enabled,
        blockedSchedule,
        driverLoginValidated,
        permissionsGranted: canTrackLocation
      })
      lastStopReason.current = reason
      stop(reason).catch(() => undefined)
      showDialog(null)
    }
  }, [plan.shouldStart, mustStop, checkDevice, showDialog])

  // A stop decided before the module was configured is sent again once it is: the module reports a session the system ended
  // (`tracking_stopped` with the reason `permission`) only when it knows the url and the token.
  const mustStopRef = useRef(mustStop)
  mustStopRef.current = mustStop
  useEffect(() => {
    if (ready && mustStopRef.current) stop(lastStopReason.current ?? 'unknown').catch(() => undefined)
  }, [ready])

  // Back to the foreground.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async state => {
      if (state !== 'active') return
      if (!shouldRunRef.current) {
        checkAlways().catch(() => undefined)
        return
      }
      try {
        const current = await getState()
        // The system may have refused to start the service from the background.
        if (!current.tracking) await start()
        await flush()
        showDialog(getLocationDialogKind(await getState()))
      } catch {
        // the next change tries again
      }
    })
    return () => subscription.remove()
  }, [showDialog, checkAlways])

  const close = useCallback(() => {
    dismissedKind.current = dialogKind
    setDialogKind(null)
  }, [dialogKind])

  const openDialogSettings = useCallback(() => {
    setDialogKind(null)
    openLocationSettings(dialogKind)
  }, [dialogKind])

  return { kind: dialogKind, onClose: close, onOpenSettings: openDialogSettings }
}
