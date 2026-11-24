import React from 'react'
import { RefreshControl, ScrollView, StyleSheet } from 'react-native'
import { fireEvent, within } from '@testing-library/react-native'

jest.mock('@components', () => {
  const mockOrdering = require('../../../../../../jest/helpers/mockOrdering')
  return {
    ...mockOrdering,
    useSession: jest.fn(() => [{}, { refreshUserInfo: jest.fn() }]),
    useUtils: jest.fn()
  }
})

import dayjs from 'dayjs'
import { useSession, useUtils } from '@components'
import { DriverSchedule } from '..'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { driverScheduleDefaults } from '../../../../../../jest/helpers/d4DriverDefaults'
import { defaultAppTheme } from '../../../../../../src/theme/engine'

/** The project's utility, as `useUtils` gives it: a date writer and the project's date and time formats. */
const projectUtils = (dateFormat = 'YYYY-MM-DD', timeFormat = 'HH:mm') => [{
  parseDate: (date: any, options: any = {}) => dayjs(date).format(options.outputFormat ?? `${dateFormat} ${timeFormat}`),
  dateFormat,
  timeFormat
}, {}]

const theme: any = defaultAppTheme()
const flat = (node: any) => StyleSheet.flatten(node.props.style)

describe('DriverSchedule', () => {
  let navigation: { goBack: jest.Mock, canGoBack: jest.Mock }

  beforeEach(() => {
    navigation = { goBack: jest.fn(), canGoBack: jest.fn(() => true) }
    ;(useUtils as jest.Mock).mockReturnValue(projectUtils())
  })

  const renderSchedule = (props: any = {}) =>
    renderWithProviders(<DriverSchedule {...driverScheduleDefaults} navigation={navigation} {...props} />)

  it('renders the screen\'s title and the seven days', () => {
    const { getByText } = renderSchedule()
    expect(getByText('Schedule')).toBeTruthy()
    ;['Sun', 'Mon', 'Tues', 'Wed', 'Thur', 'Fri', 'Sat'].forEach((day) => expect(getByText(day)).toBeTruthy())
  })

  it('keeps its header fixed above the days, which scroll under it (decision H8)', () => {
    const { getByText, UNSAFE_getByType } = renderSchedule()
    const insideScroll = (node: any) => {
      for (let up = node.parent; up; up = up.parent) if (up.type === ScrollView) return true
      return false
    }
    expect(insideScroll(getByText('Schedule'))).toBe(false)
    expect(insideScroll(getByText('Sun'))).toBe(true)
    // The header\'s `xs` is the space under it: the scroll adds none above the card of days.
    expect(StyleSheet.flatten(UNSAFE_getByType(ScrollView).props.contentContainerStyle).paddingTop).toBeUndefined()
  })

  it('keeps the page\'s gutter on the content, with the account page\'s room below', () => {
    const { UNSAFE_getByType } = renderSchedule()
    const content = StyleSheet.flatten(UNSAFE_getByType(ScrollView).props.contentContainerStyle)
    expect(content.paddingHorizontal).toBe(theme.native.tokens.layout.page_gutter)
    expect(content.paddingBottom).toBe(theme.native.components.account_page.base.padding_bottom)
  })

  it('shows open/close times for enabled days', () => {
    const { getAllByText } = renderSchedule()
    expect(getAllByText('09:00 - 17:00').length).toBeGreaterThan(0)
    expect(getAllByText('10:30 - 18:00')).toHaveLength(1)
  })

  it('shows every lapse of a day with several', () => {
    const day = (lapses: number[][]) => ({
      enabled: true,
      lapses: lapses.map(([open, close]) => ({ open: { hour: open, minute: 0 }, close: { hour: close, minute: 0 } }))
    })
    const { getByText } = renderSchedule({ schedule: Array.from({ length: 7 }, (_, index) => day(index === 1 ? [[9, 13], [15, 20]] : [[8, 9]])) })
    expect(getByText('09:00 - 13:00')).toBeTruthy()
    expect(getByText('15:00 - 20:00')).toBeTruthy()
  })

  it('shows not available for disabled days, in the danger text color', () => {
    const { getByText } = renderSchedule()
    expect(flat(getByText('Not available')).color).toBe(theme.native.tokens.color.danger_text)
  })

  it('writes the hours in the project\'s time format (decision H4)', () => {
    ;(useUtils as jest.Mock).mockReturnValue(projectUtils('YYYY-MM-DD', 'hh:mm A'))
    const { getAllByText, queryByText } = renderSchedule()
    expect(getAllByText('09:00 AM - 05:00 PM').length).toBeGreaterThan(0)
    expect(getAllByText('10:30 AM - 06:00 PM')).toHaveLength(1)
    expect(queryByText('09:00 - 17:00')).toBeNull()
  })

  describe('today', () => {
    beforeEach(() => {
      // A Tuesday, at noon.
      jest.useFakeTimers()
      jest.setSystemTime(new Date(2026, 6, 14, 12, 0, 0))
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('says the day it is in the bar: its weekday and its date in the project\'s format (decision H4)', () => {
      ;(useUtils as jest.Mock).mockReturnValue(projectUtils('DD/MM/YYYY'))
      const { getByText, queryByText } = renderSchedule()
      expect(getByText('Tuesday, 14/07/2026')).toBeTruthy()
      // Never a format of the screen's own.
      expect(queryByText('Tuesday, July 14, 2026')).toBeNull()
    })

    it('writes each row\'s date in the project\'s date format, without a time, ascending from today', () => {
      ;(useUtils as jest.Mock).mockReturnValue(projectUtils('DD/MM/YYYY'))
      const { getByTestId, queryByText } = renderSchedule()
      // Today (Tuesday) is the 14th: the list is today and the six days after it, never a past or next week's Sunday first.
      ;['14/07/2026', '15/07/2026', '16/07/2026', '17/07/2026', '18/07/2026', '19/07/2026', '20/07/2026']
        .forEach((date, k) => expect(within(getByTestId(`schedule-row-${k}`)).getByText(date)).toBeTruthy())
      expect(queryByText('2026-07-14')).toBeNull()
    })

    it('starts at today, "Today" the first row, and runs the weekdays on from it', () => {
      const { getByTestId } = renderSchedule()
      const names = [0, 1, 2, 3, 4, 5, 6].map((k) => ['Tues', 'Wed', 'Thur', 'Fri', 'Sat', 'Sun', 'Mon']
        .find((name) => within(getByTestId(`schedule-row-${k}`)).queryByText(name)))
      expect(names).toEqual(['Tues', 'Wed', 'Thur', 'Fri', 'Sat', 'Sun', 'Mon'])
      expect(within(getByTestId('schedule-row-0')).getByText('Today')).toBeTruthy()
    })

    it('tints today\'s row with the brand\'s light color and badges it "Today", and no other row', () => {
      const { getAllByTestId, getByTestId, queryAllByTestId } = renderSchedule()
      const row = getByTestId('schedule-today')
      expect(flat(row).backgroundColor).toBe(theme.native.tokens.color.primary_subtle)
      expect(within(row).getByText('Tues')).toBeTruthy()
      expect(within(row).getByTestId('schedule-today-badge')).toBeTruthy()
      expect(within(getByTestId('schedule-today-badge')).getByText('Today')).toBeTruthy()
      expect(queryAllByTestId('schedule-today')).toHaveLength(1)
      expect(getAllByTestId('schedule-today-badge')).toHaveLength(1)
    })

    it('puts the "Today" badge on the day\'s own line, `list_row.base.gap` after its name, and makes the row tall (76)', () => {
      const { getByTestId } = renderSchedule()
      const row = getByTestId('schedule-today')
      expect(flat(getByTestId('schedule-row-0')).minHeight).toBe(theme.native.components.list_row.base.tall_min_height)
      let line: any = getByTestId('schedule-today-badge').parent
      while (line && flat(line)?.flexDirection !== 'row') line = line.parent
      expect(flat(line).gap).toBe(theme.native.components.list_row.base.gap)
      expect(within(line).getByText('Tues')).toBeTruthy()
      // The other rows are not tall (they say something, they open nothing: 44 at least, their two lines make them about 58).
      expect(flat(getByTestId('schedule-row-1')).minHeight).toBe(theme.native.tokens.size.md)
      expect(row).toBeTruthy()
    })

    it('tints today\'s whole list row, not only the strips at its sides, and leaves the other rows the list\'s fill', () => {
      const { getByTestId } = renderSchedule()
      // Today is the first row.
      expect(flat(getByTestId('schedule-row-0')).backgroundColor).toBe(theme.native.tokens.color.primary_subtle)
      ;[1, 2, 3, 4, 5, 6].forEach((i) => {
        expect(flat(getByTestId(`schedule-row-${i}`)).backgroundColor).toBe(theme.native.components.list_row.base.background)
      })
    })

    it('paints today\'s hours semibold and the other days\' regular', () => {
      const day = (open: number) => ({ enabled: true, lapses: [{ open: { hour: open, minute: 0 }, close: { hour: 20, minute: 0 } }] })
      // Tuesday opens at 11, every other day at 9.
      const schedule = Array.from({ length: 7 }, (_, index) => day(index === 2 ? 11 : 9))
      const { getByText, getAllByText } = renderSchedule({ schedule })
      expect(flat(getByText('11:00 - 20:00')).fontFamily).not.toBe(flat(getAllByText('09:00 - 20:00')[0]).fontFamily)
    })

    it('says "Not available" on today\'s row when the driver does not work today', () => {
      const { getByTestId } = renderSchedule()
      expect(within(getByTestId('schedule-today')).getByText('Not available')).toBeTruthy()
      expect(within(getByTestId('schedule-today')).getByText('Today')).toBeTruthy()
    })
  })

  describe('the rule: row k is today + k days and shows the schedule of weekday (today + k) % 7', () => {
    const ABBREVIATIONS = ['Sun', 'Mon', 'Tues', 'Wed', 'Thur', 'Fri', 'Sat']
    // One schedule whose weekday d opens at 8 + d, so a row's hours say which weekday's data it shows.
    const schedule = Array.from({ length: 7 }, (_, d) => ({
      enabled: true,
      lapses: [{ open: { hour: 8 + d, minute: 0 }, close: { hour: 20, minute: 0 } }]
    }))

    afterEach(() => {
      jest.useRealTimers()
    })

    // July 12, 2026 is a Sunday: 12 + d is the weekday d of that week.
    ;[0, 1, 2, 3, 4, 5, 6].forEach((today) => {
      it(`on a ${ABBREVIATIONS[today]}: today first, dates ascending, each row the data of its own weekday`, () => {
        jest.useFakeTimers()
        jest.setSystemTime(new Date(2026, 6, 12 + today, 23, 30, 0))
        ;(useUtils as jest.Mock).mockReturnValue(projectUtils('YYYY-MM-DD'))
        const { getByTestId, queryAllByTestId } = renderSchedule({ schedule })
        expect(queryAllByTestId(/^schedule-row-/)).toHaveLength(7)
        for (let k = 0; k < 7; k++) {
          const row = within(getByTestId(`schedule-row-${k}`))
          const weekday = (today + k) % 7
          expect(row.getByText(ABBREVIATIONS[weekday])).toBeTruthy()
          // The date is `today + k` (a month's end included: July 31 + 1 is August 1).
          const expected = dayjs(new Date(2026, 6, 12 + today + k)).format('YYYY-MM-DD')
          expect(row.getByText(expected)).toBeTruthy()
          expect(row.getByText(`${String(8 + weekday).padStart(2, '0')}:00 - 20:00`)).toBeTruthy()
        }
        expect(within(getByTestId('schedule-row-0')).getByText('Today')).toBeTruthy()
        expect(queryAllByTestId('schedule-today-badge')).toHaveLength(1)
      })
    })

    it('rolls over a month and a year end', () => {
      jest.useFakeTimers()
      jest.setSystemTime(new Date(2026, 11, 30, 9, 0, 0))
      ;(useUtils as jest.Mock).mockReturnValue(projectUtils('YYYY-MM-DD'))
      const { getByTestId } = renderSchedule({ schedule })
      ;['2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02', '2027-01-03', '2027-01-04', '2027-01-05']
        .forEach((date, k) => expect(within(getByTestId(`schedule-row-${k}`)).getByText(date)).toBeTruthy())
    })
  })

  it('goes back through the screen\'s bar', () => {
    const { getByLabelText } = renderSchedule()
    fireEvent.press(getByLabelText('Go back'))
    expect(navigation.goBack).toHaveBeenCalled()
  })

  it('does not go back when there is nowhere to go', () => {
    navigation.canGoBack.mockReturnValue(false)
    const { getByLabelText } = renderSchedule()
    fireEvent.press(getByLabelText('Go back'))
    expect(navigation.goBack).not.toHaveBeenCalled()
  })

  it('refreshes the session\'s user by pulling the list down', () => {
    const refreshUserInfo = jest.fn()
    ;(useSession as jest.Mock).mockReturnValue([{}, { refreshUserInfo }])
    const { UNSAFE_getByType } = renderSchedule()
    UNSAFE_getByType(RefreshControl).props.onRefresh()
    expect(refreshUserInfo).toHaveBeenCalled()
  })

  it('renders every day all day when the driver has no schedule', () => {
    const { getByText, getAllByText } = renderWithProviders(<DriverSchedule navigation={navigation} />)
    expect(getByText('Schedule')).toBeTruthy()
    expect(getByText('Sat')).toBeTruthy()
    expect(getAllByText('00:00 - 23:59')).toHaveLength(7)
  })
})
