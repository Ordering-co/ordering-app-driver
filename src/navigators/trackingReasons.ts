import type { DriverLocationStartReason, DriverLocationStopReason } from '../native/driverLocation'

/**
 * Why tracking stops, from what the run plan looked at (`getBackgroundGeolocationRunPlan`): the `reason` of the module's
 * `tracking_stopped` event. The first cause that holds wins: no session (`logout`), the driver is not available
 * (`unavailable`), the schedule blocks them (`schedule`), the location permission is gone (`permission`).
 */
export const getTrackingStopReason = ({
  auth,
  userEnabled,
  blockedSchedule,
  driverLoginValidated,
  permissionsGranted
}: {
  auth?: unknown
  userEnabled?: unknown
  blockedSchedule?: unknown
  driverLoginValidated?: unknown
  permissionsGranted?: unknown
}): DriverLocationStopReason => {
  if (!auth) return 'logout'
  if (!userEnabled) return 'unavailable'
  if (!!blockedSchedule && !!driverLoginValidated) return 'schedule'
  if (!permissionsGranted) return 'permission'
  return 'unknown'
}

/**
 * Why tracking starts, from why it last stopped in this run of the app: the `reason` of `tracking_started`. After the
 * driver made themself available again: `available`; after the schedule block ended: `schedule`; after the permission
 * came back: `permission`; otherwise (a session just established, a session revoked and signed in again, or a first start):
 * `login`. `restart` is only for "the process came back and tracking resumes": the module says it itself when it finds a
 * session the system ended (the process was killed), whatever this says.
 */
export const getTrackingStartReason = (lastStop: DriverLocationStopReason | null): DriverLocationStartReason => {
  switch (lastStop) {
    case 'unavailable':
      return 'available'
    case 'schedule':
      return 'schedule'
    case 'permission':
      return 'permission'
    default:
      return 'login'
  }
}
