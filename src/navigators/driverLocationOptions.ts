/**
 * What the project's configs decide about the driver location module (docs/LOCATION_MODULE.md): the two send options
 * ("Two send options") and the switch of the events recorder ("Tracking events"): the app's fixed defaults, the
 * project's configs that override them, and how those are read. One place: nothing else in the app names these
 * numbers or keys.
 */

/** Fixed in the app (owner's decision, 2026-11-19): at least this many ms between the start of two requests. */
export const DEFAULT_MIN_SEND_INTERVAL_MS = 1500

/** Fixed in the app (owner's decision, 2026-11-19): the request body carries `location_at`. */
export const DEFAULT_SEND_LOCATION_AT = true

/** The largest interval the app passes down (5 minutes): a project config above it is capped, not rejected. */
export const MAX_MIN_SEND_INTERVAL_MS = 300000

/** The project configs (`useConfig()`'s `configs`, each `{ value: string }`) that override the defaults. They need not exist. */
export const MIN_SEND_INTERVAL_CONFIG_KEY = 'driver_location_min_send_interval_ms'
export const SEND_LOCATION_AT_CONFIG_KEY = 'driver_location_send_location_at'

export interface DriverLocationSendOptions {
  minSendIntervalMs: number
  sendLocationAt: boolean
}

/**
 * An integer >= 0 in milliseconds ('1500', '0', 3000). A value above `MAX_MIN_SEND_INTERVAL_MS` becomes
 * the maximum; empty, negative, fractional, in exponent form, not a number: the default. '0' is valid:
 * it switches the interval off.
 */
export const parseMinSendIntervalMs = (value: unknown): number => {
  const text = typeof value === 'number' && Number.isFinite(value) ? String(value) : value
  if (typeof text !== 'string' || !/^\d+$/.test(text.trim())) return DEFAULT_MIN_SEND_INTERVAL_MS
  return Math.min(Number(text.trim()), MAX_MIN_SEND_INTERVAL_MS)
}

/** `'1'` / `true` and `'0'` / `false`; anything else (empty, 'yes', 'true' as text, 2...): the default. */
export const parseSendLocationAt = (value: unknown): boolean => {
  if (value === true || value === false) return value
  if (typeof value !== 'string') return DEFAULT_SEND_LOCATION_AT
  const text = value.trim()
  if (text === '1') return true
  if (text === '0') return false
  return DEFAULT_SEND_LOCATION_AT
}

/** The options for the module: the project's configs where they are present and valid, the app's defaults otherwise. */
export const getDriverLocationSendOptions = (
  configs?: Record<string, { value?: unknown } | undefined> | null
): DriverLocationSendOptions => ({
  minSendIntervalMs: parseMinSendIntervalMs(configs?.[MIN_SEND_INTERVAL_CONFIG_KEY]?.value),
  sendLocationAt: parseSendLocationAt(configs?.[SEND_LOCATION_AT_CONFIG_KEY]?.value)
})

/**
 * The switch of the native events recorder (GPS off / on, connection, permission, background, battery saver, simulated
 * location, tracking started / stopped), so it can be turned off for a project without a release. The config does not need
 * to exist: the recorder is on by default.
 */
export const TRACKING_EVENTS_ENABLED_CONFIG_KEY = 'driver_tracking_events_enabled'

/** `'0'` (also the number 0 or `false`) switches the recorder off; absent, empty or anything else leaves it on. */
export const parseTrackingEventsEnabled = (value: unknown): boolean => {
  if (value === false || value === 0) return false
  if (typeof value === 'string' && value.trim() === '0') return false
  return true
}

export const isTrackingEventsEnabled = (configs?: Record<string, { value?: unknown } | undefined> | null): boolean =>
  parseTrackingEventsEnabled(configs?.[TRACKING_EVENTS_ENABLED_CONFIG_KEY]?.value)

/** The events endpoint of the API (`POST {root}/tracking_events`), or undefined when the recorder is off: what `configure` takes as `eventsUrl`. */
export const getTrackingEventsUrl = (
  root: string | undefined,
  configs?: Record<string, { value?: unknown } | undefined> | null
): string | undefined => (root && isTrackingEventsEnabled(configs) ? `${root}/tracking_events` : undefined)
