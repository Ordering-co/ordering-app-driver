import { areAllPermissionResultsGranted } from '../areAllPermissionResultsGranted'

const GRANTED = 'granted'

describe('areAllPermissionResultsGranted', () => {
  it('is true when every status is granted', () => {
    expect(areAllPermissionResultsGranted(['granted', 'granted'], GRANTED)).toBe(true)
    expect(areAllPermissionResultsGranted({
      'ios.permission.LOCATION_ALWAYS': 'granted',
      'ios.permission.LOCATION_WHEN_IN_USE': 'granted'
    }, GRANTED)).toBe(true)
  })

  it('is false when any status is denied or blocked', () => {
    expect(areAllPermissionResultsGranted(['granted', 'denied'], GRANTED)).toBe(false)
    expect(areAllPermissionResultsGranted({
      'android.permission.ACCESS_FINE_LOCATION': 'denied'
    }, GRANTED)).toBe(false)
  })

  it('is false for empty or missing results', () => {
    expect(areAllPermissionResultsGranted([], GRANTED)).toBe(false)
    expect(areAllPermissionResultsGranted({}, GRANTED)).toBe(false)
    expect(areAllPermissionResultsGranted(null, GRANTED)).toBe(false)
    expect(areAllPermissionResultsGranted('unavailable', GRANTED)).toBe(false)
  })
})
