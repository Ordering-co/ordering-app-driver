jest.mock('react-native-permissions', () => ({
  PERMISSIONS: {
    IOS: { LOCATION_ALWAYS: 'ios.always', LOCATION_WHEN_IN_USE: 'ios.when_in_use' },
    ANDROID: { ACCESS_FINE_LOCATION: 'android.fine', ACCESS_COARSE_LOCATION: 'android.coarse', ACCESS_BACKGROUND_LOCATION: 'android.background' }
  },
  RESULTS: { GRANTED: 'granted', DENIED: 'denied', BLOCKED: 'blocked' }
}))

import { canTrackLocation } from '../canTrackLocation'

describe('canTrackLocation: what the driver\'s tracking needs from the system (the owner\'s decision of 2026-11-19)', () => {
  it('iOS: "Always" and "While Using" both track', () => {
    expect(canTrackLocation({ 'ios.always': 'granted', 'ios.when_in_use': 'granted' }, 'ios')).toBe(true)
    expect(canTrackLocation({ 'ios.always': 'denied', 'ios.when_in_use': 'granted' }, 'ios')).toBe(true)
  })

  it('iOS: denied, blocked (denied or restricted) and not asked yet do not', () => {
    expect(canTrackLocation({ 'ios.always': 'denied', 'ios.when_in_use': 'denied' }, 'ios')).toBe(false)
    expect(canTrackLocation({ 'ios.always': 'blocked', 'ios.when_in_use': 'blocked' }, 'ios')).toBe(false)
  })

  it('Android: the foreground permission alone tracks, the background one is not needed (Android 10 lists it)', () => {
    expect(canTrackLocation({ 'android.fine': 'granted', 'android.coarse': 'granted' }, 'android')).toBe(true)
    expect(canTrackLocation({ 'android.fine': 'granted', 'android.coarse': 'granted', 'android.background': 'denied' }, 'android')).toBe(true)
  })

  it('Android: a foreground permission that is not granted does not', () => {
    expect(canTrackLocation({ 'android.fine': 'blocked', 'android.coarse': 'granted' }, 'android')).toBe(false)
    expect(canTrackLocation({ 'android.background': 'granted' }, 'android')).toBe(false)
  })

  it('says no for what is not a result map: the initial state, nothing, an array', () => {
    expect(canTrackLocation('unavailable', 'ios')).toBe(false)
    expect(canTrackLocation(undefined, 'android')).toBe(false)
    expect(canTrackLocation({}, 'android')).toBe(false)
    expect(canTrackLocation(['granted'], 'ios')).toBe(false)
  })
})
