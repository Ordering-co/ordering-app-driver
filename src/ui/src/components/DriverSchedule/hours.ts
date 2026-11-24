import { formatHours, type HoursFormatter } from '../../utils'

/** One day of a driver's schedule, as the API sends it: its lapses are `{ open, close }` of `{ hour, minute }`. */
export interface ScheduleDay {
  enabled: boolean
  lapses: Array<{ open: { hour: number, minute: number }, close: { hour: number, minute: number } }>
}

/** The week a driver without a schedule has: every day, all day (what the schedule screen has always drawn for them). */
export const allDayWeek = (): ScheduleDay[] => Array.from({ length: 7 }, () => ({
  enabled: true,
  lapses: [{ open: { hour: 0, minute: 0 }, close: { hour: 23, minute: 59 } }]
}))

/** The lapses of a day written in the project's time format: "09:00 - 13:00". */
export const dayLapses = (day: ScheduleDay | undefined, utils: HoursFormatter): string[] =>
  (day?.lapses ?? []).map((lapse) => `${formatHours(lapse.open, utils)} - ${formatHours(lapse.close, utils)}`)

/**
 * Today's place in the driver's schedule, for a row of the profile: `{ enabled: false }` on a day off and the
 * hours of the day's lapses otherwise; `null` when the schedule does not cover today. A driver with no schedule
 * at all has the week the schedule screen draws for them (every day, all day: `allDayWeek`), so the row says what
 * the screen says. The schedule starts on Sunday, as `Date#getDay`.
 */
export const todaysHours = (
  schedule: ScheduleDay[] | null | undefined,
  utils: HoursFormatter,
  today: Date = new Date()
): { enabled: boolean, hours: string } | null => {
  const week = schedule ?? allDayWeek()
  const day = Array.isArray(week) ? week[today.getDay()] : undefined
  if (!day) return null
  return day.enabled
    ? { enabled: true, hours: dayLapses(day, utils).join(', ') }
    : { enabled: false, hours: '' }
}
