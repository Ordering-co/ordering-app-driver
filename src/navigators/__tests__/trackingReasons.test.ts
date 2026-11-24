import { getTrackingStartReason, getTrackingStopReason } from '../trackingReasons'

const onShift = { auth: true, userEnabled: true, blockedSchedule: false, driverLoginValidated: true, permissionsGranted: true }

describe('getTrackingStopReason', () => {
  it('is logout without a session, whatever else holds', () => {
    expect(getTrackingStopReason({ ...onShift, auth: false })).toBe('logout')
    expect(getTrackingStopReason({ ...onShift, auth: null, userEnabled: false, permissionsGranted: false })).toBe('logout')
  })

  it('is unavailable when the driver is not enabled', () => {
    expect(getTrackingStopReason({ ...onShift, userEnabled: false })).toBe('unavailable')
    expect(getTrackingStopReason({ ...onShift, userEnabled: undefined, blockedSchedule: true })).toBe('unavailable')
  })

  it('is schedule only when the block counts (login validation on)', () => {
    expect(getTrackingStopReason({ ...onShift, blockedSchedule: true })).toBe('schedule')
    expect(getTrackingStopReason({ ...onShift, blockedSchedule: true, driverLoginValidated: false, permissionsGranted: false })).toBe('permission')
  })

  it('is permission when the location permission is not granted', () => {
    expect(getTrackingStopReason({ ...onShift, permissionsGranted: false })).toBe('permission')
  })

  it('is unknown when nothing explains it', () => {
    expect(getTrackingStopReason(onShift)).toBe('unknown')
  })
})

describe('getTrackingStartReason', () => {
  it.each([
    ['unavailable', 'available'],
    ['schedule', 'schedule'],
    ['permission', 'permission'],
    ['session_revoked', 'login'],
    ['logout', 'login'],
    ['unknown', 'login'],
    [null, 'login']
  ] as const)('after %p it says %p', (lastStop, expected) => {
    expect(getTrackingStartReason(lastStop)).toBe(expected)
  })
})
