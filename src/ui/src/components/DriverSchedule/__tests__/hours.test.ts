import dayjs from 'dayjs'

import { allDayWeek, dayLapses, todaysHours } from '../hours'

const utils = (timeFormat = 'HH:mm') => ({
  parseDate: (date: any, options: any = {}) => dayjs(date).format(options.outputFormat),
  timeFormat
})

const day = (enabled: boolean, ...lapses: number[][]) => ({
  enabled,
  lapses: lapses.map(([open, close]) => ({ open: { hour: open, minute: 30 }, close: { hour: close, minute: 0 } }))
})

describe('the schedule\'s hours', () => {
  // A Tuesday.
  const tuesday = new Date(2026, 6, 14, 12, 0, 0)
  const week = [day(false), day(true, [8, 12]), day(true, [9, 13], [15, 20]), day(true, [9, 17]), day(true, [9, 17]), day(true, [9, 17]), day(false)]

  it('writes the lapses of a day in the project\'s time format', () => {
    expect(dayLapses(week[2], utils())).toEqual(['09:30 - 13:00', '15:30 - 20:00'])
    expect(dayLapses(week[2], utils('hh:mm A'))).toEqual(['09:30 AM - 01:00 PM', '03:30 PM - 08:00 PM'])
    expect(dayLapses(undefined, utils())).toEqual([])
  })

  it('has every day all day for a driver without a schedule', () => {
    const all = allDayWeek()
    expect(all).toHaveLength(7)
    expect(all.every((item) => item.enabled)).toBe(true)
    expect(dayLapses(all[0], utils())).toEqual(['00:00 - 23:59'])
  })

  it('gives today\'s lapses, the week starting on Sunday', () => {
    expect(todaysHours(week, utils(), tuesday)).toEqual({ enabled: true, hours: '09:30 - 13:00, 15:30 - 20:00' })
    expect(todaysHours(week, utils(), new Date(2026, 6, 12))).toEqual({ enabled: false, hours: '' })
  })

  it('gives a driver without a schedule the week the schedule screen draws for them: all day', () => {
    expect(todaysHours(undefined, utils(), tuesday)).toEqual({ enabled: true, hours: '00:00 - 23:59' })
    expect(todaysHours(null, utils(), tuesday)).toEqual({ enabled: true, hours: '00:00 - 23:59' })
  })

  it('knows nothing of a schedule that does not cover today', () => {
    expect(todaysHours([], utils(), tuesday)).toBeNull()
  })
})
