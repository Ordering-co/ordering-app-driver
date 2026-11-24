import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'

/**
 * The app's one dayjs, with the plugins its own code needs, extended once here:
 * `utc` (`dayjs.utc`, the order timers). Import dayjs from this module, never from the package.
 *
 * NOT `customParseFormat`: a dayjs plugin is global, the logic submodule's `parseDate` included, and with it
 * on `dayjs.utc(text, [formats])` (how `parseDate` reads every API date) reads the text as local time, so
 * every date the app writes through `parseDate` came out in UTC instead of the device's time (and the
 * order timer was off by the device's offset), and `dayjs(aDate, [formats])` is invalid (the search's
 * presets sent "invalid format" to the API). A day of the search is read by `parseSearchDay`.
 */
dayjs.extend(utc)

/** The format the orders search writes its days in (what `search.date` holds). */
export const SEARCH_DAY_FORMAT = 'MM/DD/YYYY'

/** A day of the orders search (`MM/DD/YYYY`) as the device's midnight of it; undefined if it is not one. */
export const parseSearchDay = (value?: string): Date | undefined => {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value ?? '')
  if (!match) return undefined
  const [, month, day, year] = match
  const date = new Date(Number(year), Number(month) - 1, Number(day))
  return date.getMonth() === Number(month) - 1 && date.getDate() === Number(day) ? date : undefined
}

export default dayjs
export type { Dayjs } from 'dayjs'
