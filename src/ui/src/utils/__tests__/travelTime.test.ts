import { isPositionFix, MAX_MOVING_SPEED, MAX_TRAVEL_MINUTES, MIN_MOVING_SPEED, nextTravelMinutes } from '../travelTime'
import { formatDuration } from '../formats'

const t = (_key: string, fallback?: string) => fallback ?? ''
const KM = 1000
const FROM_715_KM = 715.85 * KM

describe('nextTravelMinutes', () => {
  it('is the distance over the speed, in minutes', () => {
    // 15 m/s over 11.12 km: 12.36 minutes.
    expect(nextTravelMinutes(null, 11119.5, 15)).toBeCloseTo(12.355, 2)
    expect(nextTravelMinutes(null, 0, 15)).toBe(0)
  })

  describe('the defect: "12523548717494 h 47 min" for 715.85 km', () => {
    // The speed that makes 715.85 km read that many minutes: a GPS at rest, noise above 0.
    const noise = FROM_715_KM / ((12523548717494 * 60 + 47) * 60)

    it('is a speed of about 1.6e-11 m/s', () => {
      expect(noise).toBeGreaterThan(1.5e-11)
      expect(noise).toBeLessThan(1.7e-11)
      // The old estimate, without a guard: the absurd number the emulator showed.
      expect(formatDuration(FROM_715_KM / noise / 60, t)).toBe('12523548717494 h 47 min')
    })

    it('has no time: a speed under a walk counts as standing', () => {
      expect(nextTravelMinutes(null, FROM_715_KM, noise)).toBeNull()
      expect(nextTravelMinutes(null, FROM_715_KM, Number.MIN_VALUE)).toBeNull()
      expect(nextTravelMinutes(null, FROM_715_KM, MIN_MOVING_SPEED / 2)).toBeNull()
    })
  })

  describe('standing or not knowing the speed keeps the last estimate (null while there is none)', () => {
    it.each([0, -1, NaN, -Infinity, undefined, null, '12' as any])('speed %s', (speed: any) => {
      expect(nextTravelMinutes(null, 5000, speed)).toBeNull()
      expect(nextTravelMinutes(12, 5000, speed)).toBe(12)
    })

    it('counts a speed at the threshold as moving', () => {
      expect(nextTravelMinutes(null, 3000, MIN_MOVING_SPEED)).toBe(100)
    })
  })

  describe('a speed that is a broken reading has no time, and does not keep the last estimate', () => {
    it.each([Infinity, 1763337600000, MAX_MOVING_SPEED + 1])('speed %s', (speed) => {
      expect(nextTravelMinutes(12, 5000, speed)).toBeNull()
      expect(nextTravelMinutes(null, 5000, speed)).toBeNull()
    })

    it('counts the bound itself as a speed', () => {
      expect(nextTravelMinutes(null, 6000, MAX_MOVING_SPEED)).toBe(1)
    })
  })

  describe('a distance that cannot be trusted has no time, whatever the speed', () => {
    it.each([NaN, Infinity, -Infinity, -1, undefined as any, null as any, '5' as any])('distance %s', (distance: any) => {
      expect(nextTravelMinutes(12, distance, 15)).toBeNull()
    })
  })

  describe('an estimate beyond a day has no time', () => {
    it('is the bound itself that is still shown', () => {
      const speed = 10
      const meters = MAX_TRAVEL_MINUTES * 60 * speed
      expect(nextTravelMinutes(null, meters, speed)).toBe(MAX_TRAVEL_MINUTES)
      expect(nextTravelMinutes(null, meters + 1, speed)).toBeNull()
    })

    it('drops a previous estimate too: it is not kept once the new one is absurd', () => {
      expect(nextTravelMinutes(12, FROM_715_KM, 1)).toBeNull()
    })

    it('is hidden for 715 km at a walking pace, shown at a road speed', () => {
      expect(nextTravelMinutes(null, FROM_715_KM, 1.4)).toBeNull()
      expect(nextTravelMinutes(null, FROM_715_KM, 25)).toBeCloseTo(477.2, 0)
    })

    it('is hidden for epoch milliseconds read as a distance', () => {
      expect(nextTravelMinutes(null, Date.now(), 15)).toBeNull()
    })
  })
})

describe('isPositionFix', () => {
  it('is true for a position', () => {
    expect(isPositionFix({ latitude: 40.6, longitude: -74 })).toBe(true)
    expect(isPositionFix({ latitude: 0, longitude: -74 })).toBe(true)
    expect(isPositionFix({ latitude: '40.6', longitude: '-74' })).toBe(true)
  })

  it('is false for 0, 0 (no fix yet), a missing or a non-finite coordinate', () => {
    expect(isPositionFix({ latitude: 0, longitude: 0 })).toBe(false)
    expect(isPositionFix(undefined)).toBe(false)
    expect(isPositionFix(null)).toBe(false)
    expect(isPositionFix({})).toBe(false)
    expect(isPositionFix({ latitude: NaN, longitude: 3 })).toBe(false)
    expect(isPositionFix({ latitude: 3, longitude: Infinity })).toBe(false)
  })
})
