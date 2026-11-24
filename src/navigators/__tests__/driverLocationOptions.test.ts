import {
  DEFAULT_MIN_SEND_INTERVAL_MS,
  DEFAULT_SEND_LOCATION_AT,
  MAX_MIN_SEND_INTERVAL_MS,
  MIN_SEND_INTERVAL_CONFIG_KEY,
  SEND_LOCATION_AT_CONFIG_KEY,
  getDriverLocationSendOptions,
  parseMinSendIntervalMs,
  TRACKING_EVENTS_ENABLED_CONFIG_KEY,
  getTrackingEventsUrl,
  isTrackingEventsEnabled,
  parseSendLocationAt,
  parseTrackingEventsEnabled
} from '../driverLocationOptions'

describe('the app defaults', () => {
  it('are 1500 ms and location_at on, and the keys are the two documented project configs', () => {
    expect(DEFAULT_MIN_SEND_INTERVAL_MS).toBe(1500)
    expect(DEFAULT_SEND_LOCATION_AT).toBe(true)
    expect(MAX_MIN_SEND_INTERVAL_MS).toBe(300000)
    expect(MIN_SEND_INTERVAL_CONFIG_KEY).toBe('driver_location_min_send_interval_ms')
    expect(SEND_LOCATION_AT_CONFIG_KEY).toBe('driver_location_send_location_at')
  })

  it('apply when the configs are absent, empty or the keys are missing', () => {
    const defaults = { minSendIntervalMs: 1500, sendLocationAt: true }
    expect(getDriverLocationSendOptions(undefined)).toEqual(defaults)
    expect(getDriverLocationSendOptions(null)).toEqual(defaults)
    expect(getDriverLocationSendOptions({})).toEqual(defaults)
    expect(getDriverLocationSendOptions({ other_key: { value: '1' } })).toEqual(defaults)
    expect(getDriverLocationSendOptions({ [MIN_SEND_INTERVAL_CONFIG_KEY]: undefined })).toEqual(defaults)
    expect(getDriverLocationSendOptions({ [MIN_SEND_INTERVAL_CONFIG_KEY]: {} })).toEqual(defaults)
  })
})

describe('parseMinSendIntervalMs', () => {
  it('reads an integer of milliseconds, and 0 switches the interval off', () => {
    expect(parseMinSendIntervalMs('4000')).toBe(4000)
    expect(parseMinSendIntervalMs(' 2500 ')).toBe(2500)
    expect(parseMinSendIntervalMs('0')).toBe(0)
    expect(parseMinSendIntervalMs('007')).toBe(7)
    expect(parseMinSendIntervalMs(3000)).toBe(3000)
    expect(parseMinSendIntervalMs(0)).toBe(0)
  })

  it.each([
    [''],
    ['   '],
    ['-1'],
    ['-0'],
    ['+5'],
    ['1.5'],
    ['1e3'],
    ['0x10'],
    ['abc'],
    ['1500ms'],
    [null],
    [undefined],
    [NaN],
    [Infinity],
    [-5],
    [true],
    [{}]
  ])('falls back to the default for %p', value => {
    expect(parseMinSendIntervalMs(value)).toBe(DEFAULT_MIN_SEND_INTERVAL_MS)
  })

  it('caps a huge value at 5 minutes instead of rejecting it', () => {
    expect(parseMinSendIntervalMs('300000')).toBe(300000)
    expect(parseMinSendIntervalMs('300001')).toBe(300000)
    expect(parseMinSendIntervalMs('99999999999')).toBe(300000)
    expect(parseMinSendIntervalMs('9'.repeat(400))).toBe(300000)
    expect(parseMinSendIntervalMs(86400000)).toBe(300000)
  })
})

describe('parseSendLocationAt', () => {
  it("reads '1' and '0' (and the booleans)", () => {
    expect(parseSendLocationAt('1')).toBe(true)
    expect(parseSendLocationAt('0')).toBe(false)
    expect(parseSendLocationAt(' 0 ')).toBe(false)
    expect(parseSendLocationAt(true)).toBe(true)
    expect(parseSendLocationAt(false)).toBe(false)
  })

  it.each([[''], ['2'], ['yes'], ['no'], ['true'], ['false'], ['on'], [null], [undefined], [1], [0], [{}]])(
    'falls back to the default (on) for %p',
    value => {
      expect(parseSendLocationAt(value)).toBe(DEFAULT_SEND_LOCATION_AT)
    }
  )
})

describe('getDriverLocationSendOptions', () => {
  it('takes each present valid config and the default for the rest, independently', () => {
    expect(getDriverLocationSendOptions({ [MIN_SEND_INTERVAL_CONFIG_KEY]: { value: '4000' } }))
      .toEqual({ minSendIntervalMs: 4000, sendLocationAt: true })
    expect(getDriverLocationSendOptions({ [SEND_LOCATION_AT_CONFIG_KEY]: { value: '0' } }))
      .toEqual({ minSendIntervalMs: 1500, sendLocationAt: false })
    expect(getDriverLocationSendOptions({
      [MIN_SEND_INTERVAL_CONFIG_KEY]: { value: '0' },
      [SEND_LOCATION_AT_CONFIG_KEY]: { value: '1' }
    })).toEqual({ minSendIntervalMs: 0, sendLocationAt: true })
    expect(getDriverLocationSendOptions({
      [MIN_SEND_INTERVAL_CONFIG_KEY]: { value: 'soon' },
      [SEND_LOCATION_AT_CONFIG_KEY]: { value: 'yes' }
    })).toEqual({ minSendIntervalMs: 1500, sendLocationAt: true })
  })
})

describe('the events recorder switch', () => {
  it('is the documented project config', () => {
    expect(TRACKING_EVENTS_ENABLED_CONFIG_KEY).toBe('driver_tracking_events_enabled')
  })

  it("is off only for '0'", () => {
    expect(parseTrackingEventsEnabled('0')).toBe(false)
    expect(parseTrackingEventsEnabled(' 0 ')).toBe(false)
    expect(parseTrackingEventsEnabled(0)).toBe(false)
    expect(parseTrackingEventsEnabled(false)).toBe(false)
  })

  it.each([['1'], [''], ['2'], ['no'], ['false'], ['00'], [undefined], [null], [1], [true], [{}]])('is on for %p', value => {
    expect(parseTrackingEventsEnabled(value)).toBe(true)
  })

  it('is on when the configs or the key are absent', () => {
    expect(isTrackingEventsEnabled(undefined)).toBe(true)
    expect(isTrackingEventsEnabled(null)).toBe(true)
    expect(isTrackingEventsEnabled({})).toBe(true)
    expect(isTrackingEventsEnabled({ [TRACKING_EVENTS_ENABLED_CONFIG_KEY]: {} })).toBe(true)
    expect(isTrackingEventsEnabled({ [TRACKING_EVENTS_ENABLED_CONFIG_KEY]: { value: '1' } })).toBe(true)
    expect(isTrackingEventsEnabled({ [TRACKING_EVENTS_ENABLED_CONFIG_KEY]: { value: '0' } })).toBe(false)
  })

  it('gives the events url, or nothing when off or without a root', () => {
    expect(getTrackingEventsUrl('https://api.example.com/v400/proj', {})).toBe('https://api.example.com/v400/proj/tracking_events')
    expect(getTrackingEventsUrl('https://api.example.com/v400/proj', { [TRACKING_EVENTS_ENABLED_CONFIG_KEY]: { value: '0' } })).toBeUndefined()
    expect(getTrackingEventsUrl(undefined, {})).toBeUndefined()
    expect(getTrackingEventsUrl('', {})).toBeUndefined()
  })

  it('does not touch the two send options', () => {
    expect(getDriverLocationSendOptions({ [TRACKING_EVENTS_ENABLED_CONFIG_KEY]: { value: '0' } })).toEqual({
      minSendIntervalMs: 1500,
      sendLocationAt: true
    })
  })
})
