/**
 * The app's formats of a time that is not a date: a countdown, a duration, a
 * schedule's hour and an order's delay. One format each, on every screen. A
 * date or a date with its time is written by the project's utility
 * (`useUtils` → `parseDate`), never here.
 */
type Translate = (key: string, fallback?: string) => string

const pad = (value: number) => String(value).padStart(2, '0')

/** A whole number that is never negative (a missing or broken value is 0). */
const whole = (value: number, round: (n: number) => number) => {
  const number = Number(value)
  return Number.isFinite(number) ? Math.max(0, round(number)) : 0
}

/**
 * A countdown in seconds as `mm:ss`, both zero-padded: 599 → "09:59",
 * 0 → "00:00". An hour or more keeps counting in minutes (3665 → "61:05").
 */
export const formatCountdown = (seconds: number): string => {
  const total = whole(seconds, Math.floor)
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`
}

/**
 * A duration in minutes, rounded to the minute: "12 min" under an hour,
 * "1 h 05 min" from an hour on. A value that is not a finite number (NaN, Infinity, nothing)
 * is not a duration: it writes nothing (an empty text), never a number made up. A negative
 * one is 0.
 */
export const formatDuration = (minutes: number, t: Translate): string => {
  if (!Number.isFinite(Number(minutes))) return ''
  const total = whole(minutes, Math.round)
  const unit = t('TIME_MIN', 'min')
  if (total < 60) return `${total} ${unit}`
  return `${Math.floor(total / 60)} ${t('TIME_HOUR', 'h')} ${pad(total % 60)} ${unit}`
}

/** A time format without its seconds: `HH:mm:ss` → `HH:mm`, `hh:mm:ss A` → `hh:mm A`. */
const withoutSeconds = (format: string) => String(format || 'HH:mm').replace(/[:.]s{1,2}/g, '')

/** What `formatHours` needs of `useUtils()`: the project's date writer and its time format. */
export interface HoursFormatter {
  parseDate: (date: any, options?: { outputFormat?: string, utc?: boolean }) => string
  timeFormat: string
}

/**
 * An hour of a schedule (`{ hour, minute }`, as the API sends a lapse's `open`
 * and `close`) in the project's time format: "09:05", or "09:05 AM" in a
 * project of 12 hours. The formatter is the state of `useUtils()`:
 *
 *   const [utils] = useUtils()
 *   formatHours(lapse.open, utils)
 *
 * The hour is the wall clock's, so it is written as it is (`utc: false`), on a
 * fixed day, and without the seconds a project's format may carry (the SDK's
 * default is `HH:mm:ss`): a schedule has none. Nothing to show without an hour.
 */
export const formatHours = (
  time: { hour: number, minute: number } | null | undefined,
  { parseDate, timeFormat }: HoursFormatter
): string => {
  if (!time) return ''
  return parseDate(`2000-01-01 ${pad(whole(time.hour, Math.floor))}:${pad(whole(time.minute, Math.floor))}:00`, { outputFormat: withoutSeconds(timeFormat), utc: false })
}

/**
 * The time left of an order's timer, in minutes, as `hh:mm`: "02:05",
 * "1 day 02:05" from a day on, and "- 00:07" when it is late.
 */
export const formatDelay = (minutes: number, t: Translate): string => {
  const number = Number(minutes)
  const value = Number.isFinite(number) ? Math.trunc(number) : 0
  const total = Math.abs(value)
  const sign = value < 0 ? '- ' : ''
  const days = Math.floor(total / 1440)
  const rest = total - days * 1440
  const day = days === 0 ? '' : `${days} ${t('DAY', 'day')} `
  return `${sign}${day}${pad(Math.floor(rest / 60))}:${pad(rest % 60)}`
}

/**
 * The hour of an instant (`YYYY-MM-DD HH:mm:ss`, as the API writes it) in the project's time format, without seconds: "12:53 PM", "12:53".
 * The instant is read on the wall clock it is written in (`utc: false`), so it is given already in the device's time. An empty text
 * for a value that is not there. A `Date` (an instant the app measured itself: the connection's last update) is the same instant on the
 * device's clock.
 */
export const formatClockTime = (
  moment: string | Date | null | undefined,
  { parseDate, timeFormat }: HoursFormatter
): string => {
  if (!moment) return ''
  return parseDate(moment, { outputFormat: withoutSeconds(timeFormat), utc: false })
}
