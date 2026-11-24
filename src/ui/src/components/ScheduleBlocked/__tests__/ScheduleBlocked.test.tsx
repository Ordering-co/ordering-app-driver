import React from 'react'
import { Image, StyleSheet } from 'react-native'
import { fireEvent } from '@testing-library/react-native'

jest.mock('@components', () => {
  const mockOrdering = require('../../../../../../jest/helpers/mockOrdering')
  const { renderUiController } = require('../../../../../../jest/helpers/d1ShellDefaults')
  const logout = jest.fn()
  return {
    ...mockOrdering,
    // The bottom bar's controller: it hands its props to the UI (`FloatingButton`).
    FloatingButton: renderUiController({}),
    useSession: Object.assign(
      jest.fn(() => [{}, { logout }]),
      { __logout: logout }
    )
  }
})

import dayjs from 'dayjs'
import { useSession, useUtils } from '@components'
import { ScheduleBlocked } from '..'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { scheduleBlockedDefaults } from '../../../../../../jest/helpers/d4DriverDefaults'
import { buildAppTheme, defaultAppTheme, THEME_PRODUCT_TYPE } from '../../../../../../src/theme/engine'

/** The project's utility, as `useUtils` gives it: a date writer and the project's time format. */
const projectUtils = (timeFormat = 'HH:mm') => [{
  parseDate: (date: any, options: any = {}) => dayjs(date).format(options.outputFormat ?? `YYYY-MM-DD ${timeFormat}`),
  timeFormat
}, {}]

describe('ScheduleBlocked', () => {
  beforeEach(() => {
    ;(useSession as any).__logout.mockClear()
    ;(useUtils as jest.Mock).mockReturnValue(projectUtils())
  })

  it('renders blocked login messaging', () => {
    const { getByText } = renderWithProviders(
      <ScheduleBlocked {...scheduleBlockedDefaults} />
    )
    expect(getByText("You can't login")).toBeTruthy()
    expect(getByText('You are outside the established schedule')).toBeTruthy()
  })

  it('has the bar\'s own gutter and `xs` once, and lays its empty state on the gutter (not twice, decision H8)', () => {
    const { getByText } = renderWithProviders(<ScheduleBlocked {...scheduleBlockedDefaults} />)
    const gutter = defaultAppTheme().native.tokens.layout.page_gutter
    const paddings = (node: any) => {
      const found: number[] = []
      for (let up = node.parent; up; up = up.parent) {
        // Host views only: a view and the component that renders it carry the same style.
        const padding = typeof up.type === 'string' ? StyleSheet.flatten(up.props?.style)?.paddingHorizontal : undefined
        if (padding !== undefined) found.push(padding)
      }
      return found
    }
    // The title sits in the bar's room alone; the message in the body's alone (the empty state's own
    // padding is the state's, not a gutter).
    expect(paddings(getByText("You can't login")).filter((padding) => padding === gutter)).toHaveLength(1)
    expect(paddings(getByText('You are outside the established schedule')).filter((padding) => padding === gutter)).toHaveLength(1)
  })

  it('shows the next available schedule window in a box tinted with the brand\'s light color', () => {
    const theme: any = defaultAppTheme()
    const { getByText, getByTestId } = renderWithProviders(
      <ScheduleBlocked {...scheduleBlockedDefaults} />
    )
    expect(getByText('Next time')).toBeTruthy()
    expect(getByText('Sunday 09:00')).toBeTruthy()
    const box = StyleSheet.flatten(getByTestId('schedule-next').props.style)
    expect(box.backgroundColor).toBe(theme.native.tokens.color.primary_subtle)
    expect(box.borderWidth).toBeUndefined()
    expect(box.shadowOpacity).toBeUndefined()
    // `md` over its `lg` sides, as drawn.
    expect(box.paddingVertical ?? box.padding).toBe(theme.native.tokens.space.md)
    expect(box.paddingHorizontal).toBe(theme.native.tokens.space.lg)
  })

  it('names the day of the week, from Sunday to Saturday', () => {
    const { getByText, rerender } = renderWithProviders(<ScheduleBlocked nextSchedule={{ day: 6, schedule: { open: { hour: 8, minute: 0 } } }} />)
    expect(getByText('Saturday 08:00')).toBeTruthy()
    rerender(<ScheduleBlocked nextSchedule={{ day: 0, schedule: { open: { hour: 8, minute: 0 } } }} />)
    expect(getByText('Sunday 08:00')).toBeTruthy()
    rerender(<ScheduleBlocked nextSchedule={{ day: 4, schedule: { open: { hour: 8, minute: 0 } } }} />)
    expect(getByText('Thursday 08:00')).toBeTruthy()
  })

  it('writes the next hour in the project\'s time format (decision H4)', () => {
    ;(useUtils as jest.Mock).mockReturnValue(projectUtils('hh:mm A'))
    const { getByText, queryByText } = renderWithProviders(
      <ScheduleBlocked nextSchedule={{ day: 1, schedule: { open: { hour: 14, minute: 5 } } }} />
    )
    expect(getByText('Monday 02:05 PM')).toBeTruthy()
    expect(queryByText(/14:05/)).toBeNull()
  })

  it('draws the screen without a next schedule, and without its box', () => {
    const none = renderWithProviders(<ScheduleBlocked />)
    expect(none.getByText('You are outside the established schedule')).toBeTruthy()
    expect(none.queryByText('Next time')).toBeNull()
    none.unmount()
    const empty = renderWithProviders(<ScheduleBlocked nextSchedule={{ schedule: null, day: null }} />)
    expect(empty.queryByTestId('schedule-next')).toBeNull()
    expect(empty.getByRole('button', { name: 'Go back' })).toBeTruthy()
  })

  it('logs out when go back is pressed', () => {
    const { getByRole } = renderWithProviders(
      <ScheduleBlocked {...scheduleBlockedDefaults} />
    )
    fireEvent.press(getByRole('button', { name: 'Go back' }))
    expect((useSession as any).__logout).toHaveBeenCalled()
  })

  it('draws Go back in the app\'s bottom bar, the only way out of a screen that has no other', () => {
    const slots = defaultAppTheme().native.components.bottom_bar.slots
    const button = defaultAppTheme().native.components.button
    const { getByRole, getByTestId, queryByTestId } = renderWithProviders(
      <ScheduleBlocked {...scheduleBlockedDefaults} />
    )
    expect(getByTestId('schedule-blocked-bar')).toBeTruthy()
    const box = StyleSheet.flatten(getByRole('button', { name: 'Go back' }).children[0].props.style)
    expect(box.backgroundColor).toBe(button.variants[slots.button.color][slots.button.appearance].background)
    expect(box.minHeight).toBe(button.sizes[slots.button.size].height)
    // The empty state carries no action of its own: the bar's is the only one.
    expect(queryByTestId('schedule-blocked-back')).toBeTruthy()
    expect(getByRole('button', { name: 'Go back' })).toBe(getByTestId('schedule-blocked-back'))
  })

  it('has no back arrow in its bar: logging out is the only way out', () => {
    const { queryByLabelText } = renderWithProviders(<ScheduleBlocked {...scheduleBlockedDefaults} />)
    expect(queryByLabelText('Go back')).toBeNull()
  })

  it('paints the theme\'s image of the schedule-blocked screen', () => {
    const theme: any = buildAppTheme({
      version: 2,
      product_type: THEME_PRODUCT_TYPE,
      values: { images: { 'empty.schedule_blocked': 'https://cdn.test/blocked.png' } }
    })
    const { UNSAFE_getAllByType } = renderWithProviders(
      <ScheduleBlocked {...scheduleBlockedDefaults} />,
      { themeOverrides: theme }
    )
    expect(UNSAFE_getAllByType(Image).map((image: any) => image.props.source?.uri)).toContain('https://cdn.test/blocked.png')
  })
})
