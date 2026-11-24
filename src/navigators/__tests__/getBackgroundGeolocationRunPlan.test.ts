import { getBackgroundGeolocationRunPlan } from '../getBackgroundGeolocationRunPlan'

const onShift = {
  ready: true,
  auth: true,
  userEnabled: true,
  blockedSchedule: false,
  driverLoginValidated: true,
  permissionsGranted: true
}

describe('getBackgroundGeolocationRunPlan', () => {
  it('stops tracking while schedule-blocked under login validation', () => {
    expect(getBackgroundGeolocationRunPlan({
      ...onShift,
      blockedSchedule: true
    })).toEqual({
      shouldStart: false,
      shouldStop: true
    })
  })

  it('starts tracking when the schedule window is valid', () => {
    expect(getBackgroundGeolocationRunPlan(onShift)).toEqual({
      shouldStart: true,
      shouldStop: false
    })
  })

  it('starts tracking when blocked but login validation is off', () => {
    expect(getBackgroundGeolocationRunPlan({
      ...onShift,
      blockedSchedule: true,
      driverLoginValidated: false
    })).toEqual({
      shouldStart: true,
      shouldStop: false
    })
  })

  it('stops tracking when logged out, disabled, or not ready', () => {
    expect(getBackgroundGeolocationRunPlan({
      ...onShift,
      auth: false
    }).shouldStart).toBe(false)

    expect(getBackgroundGeolocationRunPlan({
      ...onShift,
      userEnabled: false
    }).shouldStart).toBe(false)

    expect(getBackgroundGeolocationRunPlan({
      ...onShift,
      ready: false
    }).shouldStart).toBe(false)
  })

  it('stops tracking when OS location is not granted', () => {
    expect(getBackgroundGeolocationRunPlan({
      ...onShift,
      permissionsGranted: false
    })).toEqual({
      shouldStart: false,
      shouldStop: true
    })
  })
})
