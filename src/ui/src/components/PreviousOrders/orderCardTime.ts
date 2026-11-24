import dayjs from '@/utils/dayjs'
import { timeStateOf } from '../shared/orderStates'
import { formatClockTime, formatDuration, type HoursFormatter } from '../../utils/formats'
import { themeVisible } from '@/theme/helpers'

type Translate = (key: string, fallback?: string) => string
/** The project's date writer (`useUtils`'s `parseDate`). */
type ParseDate = (value: any, options?: { outputFormat?: string, utc?: boolean }) => string

/** What the card's status band writes at its end: one text, and the state its tone follows. */
export interface CardTime {
  /** "24 min left", "12 min late", "6 min left · due 1:05 PM"; an order that is over, "12:53 PM · today". */
  text: string
  /** The time's state: `warning` at risk, `danger` late; none is on time (or an order that is over). */
  state: 'warning' | 'danger' | null
}

/** From this many minutes (10 hours) the figure drops the minutes: "12 h". */
const HOURS_ONLY_FROM = 600
/** From this many minutes (48 hours) the figure counts days: "2 d". */
const DAYS_FROM = 2880
const MINUTES_PER_HOUR = 60
const MINUTES_PER_DAY = 1440

/** The date format the API writes and the card reads. */
const API_FORMAT = 'YYYY-MM-DD HH:mm:ss'
/** A time of day never breaks a line: "12:53 PM" moves to the next line whole. */
const NO_BREAK = '\u00A0'

/**
 * When the order is due to the customer: its delivery time plus the preparation time (`eta_time`), as the card has always
 * computed it. The delivery time is the UTC one when the order has it (written on the device's clock), else the order's own
 * (its zone's) moved to UTC by the API's fixed offset. A missing or non-numeric preparation time adds nothing.
 */
export const orderDue = (order: any, parseDate: ParseDate) => {
  const offset = 300
  const zoned = dayjs(order?.delivery_datetime).add(offset, 'minute').format(API_FORMAT)
  const delivery = order?.delivery_datetime_utc
    ? parseDate(order?.delivery_datetime_utc, { outputFormat: API_FORMAT })
    : parseDate(zoned, { outputFormat: API_FORMAT })
  // A missing or non-numeric preparation time adds nothing (moment's `add`; dayjs's would make the date invalid).
  return dayjs(delivery).add(Number(order?.eta_time) || 0, 'minute')
}

/** The minutes left to the order's due time, negative once it is late: what the order's timer writes. */
export const delayMinutes = (due: ReturnType<typeof dayjs>): number =>
  Math.ceil(due.diff(dayjs.utc(), 'second') / 60)

/**
 * The figure of how long an order has left or is late by, short enough to leave the title its room: "N min" under an hour, "H h MM
 * min" from an hour to under 10 hours (the app's own duration, `formatDuration`), "H h" from 10 hours to under 48 hours and "N d" from
 * 48 hours; every piece is a key of the catalog (`TIME_MIN`, `TIME_HOUR`, `TIME_DAY`). The hours and the days are cut, not rounded:
 * "47 h" is still the day before two. A value that is not a number writes nothing.
 */
export const formatCardDuration = (minutes: number, t: Translate): string => {
  if (!Number.isFinite(Number(minutes))) return ''
  const total = Math.max(0, Math.round(Number(minutes)))
  if (total < HOURS_ONLY_FROM) return formatDuration(total, t)
  if (total < DAYS_FROM) return `${Math.floor(total / MINUTES_PER_HOUR)} ${t('TIME_HOUR', 'h')}`
  return `${Math.floor(total / MINUTES_PER_DAY)} ${t('TIME_DAY', 'd')}`
}

/**
 * Whether the band's time also says when the order is due ("6 min left · due 1:05 PM"): the theme's `orders.absolute_time`. Every
 * place that writes the band's time (the order card, the route's next stop and its late chips) reads the setting here and passes it to
 * `openOrderTime`, so one theme setting gives one text wherever the time shows.
 */
export const showsClockTime = (theme: Parameters<typeof themeVisible>[0]): boolean => themeVisible(theme, 'orders.absolute_time')

/**
 * The time of an order that is still open, as the band writes it: "24 min left", at risk the same in the warning tone, late "12 min late"
 * in the danger tone (no "+": the word says it). A late order is danger whatever the API's time state says (the text and its tone agree);
 * an order on time is in the brand's tone. The figure and the word are one phrase ("24 min left": the catalog's `CARD_TIME_LEFT` and
 * `CARD_TIME_LATE` read after the figure in every language). With `absolute` (the theme's clock time) the text also says when the order
 * is due: "6 min left · due 1:05 PM".
 */
export const openOrderTime = (
  order: any,
  utils: HoursFormatter,
  t: Translate,
  absolute: boolean
): CardTime => {
  const due = orderDue(order, utils.parseDate)
  const minutes = delayMinutes(due)
  const late = minutes < 0
  const apiState = timeStateOf(order?.time_status)
  const state = late ? 'danger' : apiState === 'warning' || apiState === 'danger' ? apiState : null
  const figure = formatCardDuration(late ? -minutes : minutes, t)
  const word = late ? t('CARD_TIME_LATE', 'late') : t('CARD_TIME_LEFT', 'left')
  const clock = absolute && due.isValid() ? formatClockTime(due.format(API_FORMAT), utils).replace(/\s+/g, NO_BREAK) : ''
  const phrase = `${figure} ${word}`
  return {
    text: clock ? `${phrase} · ${t('CARD_TIME_DUE', 'due :time:').replace(':time:', clock)}` : phrase,
    state
  }
}

/**
 * When an order that is over ended: the moment the API reports it reached its last status (`reporting_data.at['status:N']`, in UTC),
 * else the time it was due (its delivery time, as the card has always dated it). `null` without either.
 */
const endedAt = (order: any, parseDate: ParseDate) => {
  const reported = order?.reporting_data?.at?.[`status:${order?.status}`]
  const written = typeof reported === 'string' && reported
    ? parseDate(reported.replace('T', ' ').slice(0, 19), { outputFormat: API_FORMAT })
    : order?.delivery_datetime_utc
      ? parseDate(order.delivery_datetime_utc, { outputFormat: API_FORMAT })
      : order?.delivery_datetime
        ? parseDate(order.delivery_datetime, { outputFormat: API_FORMAT, utc: false })
        : ''
  const moment = written ? dayjs(written) : null
  return moment && moment.isValid() ? moment : null
}

/**
 * The time of an order that is over: the clock time it ended or was due and its day ("today", "yesterday", or the project's date),
 * "12:53 PM · today". It has no state: nothing is left to wait for (the band's tone is the status's).
 */
export const closedOrderTime = (
  order: any,
  utils: HoursFormatter & { dateFormat?: string },
  t: Translate
): CardTime | null => {
  const moment = endedAt(order, utils.parseDate)
  if (!moment) return null
  const days = moment.startOf('day').diff(dayjs().startOf('day'), 'day')
  const written = moment.format(API_FORMAT)
  const day = days === 0
    ? t('TODAY', 'Today').toLocaleLowerCase()
    : days === -1
      ? t('YESTERDAY', 'Yesterday').toLocaleLowerCase()
      : utils.parseDate(written, { outputFormat: utils.dateFormat, utc: false })
  return { text: `${formatClockTime(written, utils)} · ${day}`, state: null }
}
