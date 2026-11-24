import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'

import { formatCountdown, formatDelay, formatDuration, formatHours } from '../index'

dayjs.extend(utc)

const t = (_key: string, fallback?: string) => fallback ?? _key

/** `parseDate` as the project's utility writes a date (UtilsContext of the logic submodule). */
const parseDate = (date: any, options: any = {}) => {
  const inputFormat = ['YYYY-MM-DD HH:mm:ss', 'YYYY-MM-DD hh:mm:ss A', 'YYYY-MM-DD hh:mm:ss']
  const isUtc = typeof options.utc === 'boolean' ? options.utc : true
  if (!dayjs(date, inputFormat).isValid()) return 'invalid format'
  const parsed = isUtc ? dayjs.utc(date, inputFormat).local() : dayjs(date, inputFormat)
  return parsed.format(options.outputFormat)
}

describe('utils — formats', () => {
  describe('formatCountdown', () => {
    it('is always mm:ss, zero-padded', () => {
      expect(formatCountdown(599)).toBe('09:59')
      expect(formatCountdown(600)).toBe('10:00')
      expect(formatCountdown(65)).toBe('01:05')
      expect(formatCountdown(5)).toBe('00:05')
      expect(formatCountdown(0)).toBe('00:00')
    })

    it('keeps counting in minutes past an hour', () => {
      expect(formatCountdown(3665)).toBe('61:05')
    })

    it('never goes under zero and drops a part of a second', () => {
      expect(formatCountdown(-3)).toBe('00:00')
      expect(formatCountdown(59.9)).toBe('00:59')
      expect(formatCountdown(NaN)).toBe('00:00')
      expect(formatCountdown(undefined as any)).toBe('00:00')
    })
  })

  describe('formatDuration', () => {
    it('is whole minutes under an hour', () => {
      expect(formatDuration(12, t)).toBe('12 min')
      expect(formatDuration(12.34, t)).toBe('12 min')
      expect(formatDuration(0, t)).toBe('0 min')
      expect(formatDuration(59, t)).toBe('59 min')
    })

    it('is hours and zero-padded minutes from an hour on', () => {
      expect(formatDuration(60, t)).toBe('1 h 00 min')
      expect(formatDuration(65, t)).toBe('1 h 05 min')
      expect(formatDuration(135, t)).toBe('2 h 15 min')
      // 59.6 rounds to the hour.
      expect(formatDuration(59.6, t)).toBe('1 h 00 min')
    })

    it('reads its units from the translations', () => {
      const keys = (key: string) => key
      expect(formatDuration(12, keys)).toBe('12 TIME_MIN')
      expect(formatDuration(65, keys)).toBe('1 TIME_HOUR 05 TIME_MIN')
    })

    it('is zero for a negative value', () => {
      expect(formatDuration(-4, t)).toBe('0 min')
    })

    it('writes nothing for a value that is not a finite number, never a made-up one', () => {
      expect(formatDuration(NaN, t)).toBe('')
      expect(formatDuration(Infinity, t)).toBe('')
      expect(formatDuration(-Infinity, t)).toBe('')
      expect(formatDuration(undefined as any, t)).toBe('')
      expect(formatDuration('soon' as any, t)).toBe('')
    })
  })

  describe('formatHours', () => {
    it('writes a schedule\'s hour in a project of 24 hours', () => {
      const utils = { parseDate, timeFormat: 'HH:mm' }
      expect(formatHours({ hour: 9, minute: 5 }, utils)).toBe('09:05')
      expect(formatHours({ hour: 21, minute: 30 }, utils)).toBe('21:30')
      expect(formatHours({ hour: 0, minute: 0 }, utils)).toBe('00:00')
    })

    it('writes it in a project of 12 hours', () => {
      const utils = { parseDate, timeFormat: 'hh:mm A' }
      expect(formatHours({ hour: 9, minute: 5 }, utils)).toBe('09:05 AM')
      expect(formatHours({ hour: 21, minute: 30 }, utils)).toBe('09:30 PM')
      expect(formatHours({ hour: 0, minute: 0 }, utils)).toBe('12:00 AM')
    })

    it('drops the seconds a project\'s time format may carry (the SDK\'s default is HH:mm:ss)', () => {
      expect(formatHours({ hour: 9, minute: 5 }, { parseDate, timeFormat: 'HH:mm:ss' })).toBe('09:05')
      expect(formatHours({ hour: 21, minute: 30 }, { parseDate, timeFormat: 'hh:mm:ss A' })).toBe('09:30 PM')
    })

    it('asks the project\'s utility for the wall clock\'s hour in the project\'s time format', () => {
      const spy = jest.fn(() => 'formatted')
      expect(formatHours({ hour: 7, minute: 45 }, { parseDate: spy, timeFormat: 'h:mm a' })).toBe('formatted')
      expect(spy).toHaveBeenCalledWith('2000-01-01 07:45:00', { outputFormat: 'h:mm a', utc: false })
    })

    it('is empty without an hour', () => {
      const spy = jest.fn()
      expect(formatHours(undefined, { parseDate: spy, timeFormat: 'HH:mm' })).toBe('')
      expect(formatHours(null, { parseDate: spy, timeFormat: 'HH:mm' })).toBe('')
      expect(spy).not.toHaveBeenCalled()
    })
  })

  describe('formatDelay', () => {
    it('is hh:mm, zero-padded', () => {
      expect(formatDelay(125, t)).toBe('02:05')
      expect(formatDelay(7, t)).toBe('00:07')
      expect(formatDelay(0, t)).toBe('00:00')
    })

    it('counts the days from a day on', () => {
      expect(formatDelay(1440 + 125, t)).toBe('1 day 02:05')
    })

    it('marks a late order with a minus', () => {
      expect(formatDelay(-7, t)).toBe('- 00:07')
      expect(formatDelay(-(1440 + 125), t)).toBe('- 1 day 02:05')
    })
  })
})
