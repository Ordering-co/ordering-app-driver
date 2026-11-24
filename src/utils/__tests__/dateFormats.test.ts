import dayjs, { parseSearchDay } from '../dayjs'

/**
 * The outputs the app's own date code writes (the log of the moment the phone went offline,
 * the Central time fallback of the order timer, the search's days), pinned as literals:
 * they must not change with the date library.
 */
describe('the date formats the app writes', () => {
  const at = new Date(2026, 2, 5, 15, 4, 9)

  it('the moment the phone went offline, as the offline log writes it (12-hour clock, seconds not padded)', () => {
    expect(dayjs(at).format('YYYY-MM-DD hh:mm:s')).toBe('2026-03-05 03:04:9')
  })

  it('the UTC time of a delivery given in Central time: 300 minutes later', () => {
    expect(dayjs('2026-03-05 22:30:00').add(300, 'minute').format('YYYY-MM-DD HH:mm:ss')).toBe('2026-03-06 03:30:00')
  })

  it('the search\'s day: month first, read and written in the device\'s day', () => {
    const day = parseSearchDay('03/09/2026') as Date
    expect([day.getFullYear(), day.getMonth(), day.getDate(), day.getHours()]).toEqual([2026, 2, 9, 0])
    expect(parseSearchDay('02/30/2026')).toBeUndefined()
    expect(parseSearchDay('2026-03-09')).toBeUndefined()
    expect(parseSearchDay('')).toBeUndefined()
    expect(parseSearchDay(undefined)).toBeUndefined()
    expect(dayjs(new Date(2026, 11, 1, 23, 59)).format('MM/DD/YYYY')).toBe('12/01/2026')
  })

  it('the minutes left to a delivery: the seconds between two instants, cut to whole seconds', () => {
    const delivery = dayjs('2026-03-05 12:00:00').add(5, 'minute')
    expect(delivery.diff(dayjs('2026-03-05 10:00:30'), 'second')).toBe(7470)
    expect(delivery.diff(dayjs('2026-03-05 12:07:00'), 'second')).toBe(-120)
    expect(delivery.diff(dayjs('2026-03-05 12:05:00.900'), 'second')).toBe(0)
  })
})

/**
 * `parseDate` of the project's utility (UtilsContext of the logic submodule) reads every API date with the
 * app's own dayjs. A plugin the app extends dayjs with changes what it does (customParseFormat made it read
 * UTC text as local time and refuse a Date): these are its three readings, as the submodule writes them.
 */
describe('how the project\'s parseDate reads a moment with the app\'s dayjs', () => {
  const INPUTS = ['YYYY-MM-DD HH:mm:ss', 'YYYY-MM-DD hh:mm:ss A', 'YYYY-MM-DD hh:mm:ss']
  const parseDate = (date: any, outputFormat: string, utc = true) => {
    if (!dayjs(date, INPUTS).isValid()) return 'invalid format'
    return (utc ? dayjs.utc(date, INPUTS).local() : dayjs(date, INPUTS)).format(outputFormat)
  }
  const pad = (n: number) => String(n).padStart(2, '0')

  it('reads an API date as UTC and writes it in the device\'s time', () => {
    const instant = new Date(Date.UTC(2026, 5, 11, 17, 29, 0))
    const local = `${pad(instant.getHours())}:${pad(instant.getMinutes())}`
    expect(parseDate('2026-06-11 17:29:00', 'HH:mm')).toBe(local)
  })

  it('reads a date given as local text (utc: false) as it is', () => {
    expect(parseDate('2026-06-11 17:29:00', 'DD/MM/YYYY HH:mm', false)).toBe('11/06/2026 17:29')
  })

  it('accepts a Date (the search\'s presets give it the day of today)', () => {
    const at = new Date(2026, 10, 13, 17, 3, 9)
    expect(parseDate(at, 'MM/DD/YYYY')).toBe('11/13/2026')
  })
})
