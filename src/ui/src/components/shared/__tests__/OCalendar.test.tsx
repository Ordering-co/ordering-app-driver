import React from 'react'
import { StyleSheet } from 'react-native'
import { fireEvent } from '@testing-library/react-native'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { freezeClock, restoreClock } from '../../../../../../jest/helpers/fakeClock'
const { setupSharedComponentHooks } = require('../../../../../../jest/helpers/driverSharedTestSetup')
import OCalendar from '../OCalendar'
import { defaultAppTheme } from '../../../../../theme/engine'

setupSharedComponentHooks()

describe('OCalendar', () => {
  // Sunday 15 February 2026, noon of the device's day.
  beforeEach(() => freezeClock(new Date(2026, 1, 15, 12, 0, 0).getTime()))
  afterEach(() => restoreClock())

  const days = (screen: any) => screen.getAllByRole('button')
    .filter((node: any) => /^\d+ [A-Z]/.test(node.props.accessibilityLabel ?? ''))

  it('opens on the current month with every one of its days, February 2026 starting on a Sunday', () => {
    const screen = renderWithProviders(<OCalendar onDateChange={jest.fn()} />)
    expect(screen.getByText('February 2026')).toBeTruthy()
    expect(days(screen)).toHaveLength(28)
    expect(days(screen)[0].props.accessibilityLabel).toBe('1 February 2026')
    expect(days(screen)[27].props.accessibilityLabel).toBe('28 February 2026')
    // 28 days from a Sunday: exactly four weeks of seven cells, one row of weekday names.
    expect(screen.getByText('Sun')).toBeTruthy()
  })

  it('opens on the month of the selected day, and marks it', () => {
    const screen = renderWithProviders(<OCalendar selectedDate={new Date(2026, 6, 4)} onDateChange={jest.fn()} />)
    expect(screen.getByText('July 2026')).toBeTruthy()
    expect(days(screen)).toHaveLength(31)
    const selected = days(screen).filter((node: any) => node.props.accessibilityState.selected)
    expect(selected.map((node: any) => node.props.accessibilityLabel)).toEqual(['4 July 2026'])
  })

  it('reads a selected day given as a string', () => {
    const screen = renderWithProviders(<OCalendar selectedDate='2026-03-09' onDateChange={jest.fn()} />)
    expect(screen.getByText('March 2026')).toBeTruthy()
    expect(days(screen).filter((node: any) => node.props.accessibilityState.selected).map((node: any) => node.props.accessibilityLabel)).toEqual(['9 March 2026'])
  })

  it('moves a month back and forward, across the year', () => {
    const screen = renderWithProviders(<OCalendar selectedDate={new Date(2026, 0, 20)} onDateChange={jest.fn()} />)
    fireEvent.press(screen.getByLabelText('Previous month'))
    expect(screen.getByText('December 2025')).toBeTruthy()
    expect(days(screen)).toHaveLength(31)
    fireEvent.press(screen.getByLabelText('Next month'))
    fireEvent.press(screen.getByLabelText('Next month'))
    expect(screen.getByText('February 2026')).toBeTruthy()
    expect(days(screen)).toHaveLength(28)
  })

  it('gives each day a cell as tall as a touch target (the `md` control height, decision H8), its circle the `sm` one', () => {
    const theme: any = defaultAppTheme()
    const screen = renderWithProviders(<OCalendar onDateChange={jest.fn()} />)
    const cell = StyleSheet.flatten(days(screen)[0].props.style)
    expect(cell.height).toBe(theme.native.tokens.size.md)
    expect(cell.height).toBe(44)
    // The weekday names keep their own, smaller row.
    const boxOf = (node: any) => {
      for (let up = node.parent; up; up = up.parent) if (StyleSheet.flatten(up.props?.style)?.height !== undefined) return StyleSheet.flatten(up.props.style)
      return {} as any
    }
    expect(boxOf(screen.getByText('Sun')).height).toBe(theme.native.tokens.size.sm)
    // The day itself is still the `sm` circle inside its cell.
    const circle = boxOf(screen.getByText('1'))
    expect(circle.height).toBe(theme.native.tokens.size.sm)
    expect(circle.width).toBe(theme.native.tokens.size.sm)
  })

  it('answers the day pressed as a date of the device\'s day', () => {
    const onDateChange = jest.fn()
    const screen = renderWithProviders(<OCalendar onDateChange={onDateChange} />)
    fireEvent.press(screen.getByLabelText('10 February 2026'))
    const date: Date = onDateChange.mock.calls[0][0]
    expect([date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([2026, 1, 10])
  })

  it('disables the days before the minimum and after the maximum, by day', () => {
    const screen = renderWithProviders(
      <OCalendar minDate={new Date(2026, 1, 10, 18, 0)} maxDate={new Date(2026, 1, 20, 6, 0)} onDateChange={jest.fn()} />
    )
    const disabled = days(screen).filter((node: any) => node.props.accessibilityState.disabled)
    const enabled = days(screen).filter((node: any) => !node.props.accessibilityState.disabled)
    expect(enabled[0].props.accessibilityLabel).toBe('10 February 2026')
    expect(enabled[enabled.length - 1].props.accessibilityLabel).toBe('20 February 2026')
    expect(disabled).toHaveLength(28 - 11)
  })

  it('stops the arrows at the months of the minimum and the maximum', () => {
    const screen = renderWithProviders(
      <OCalendar minDate={new Date(2026, 1, 1)} maxDate={new Date(2026, 3, 30)} onDateChange={jest.fn()} />
    )
    expect(screen.getByLabelText('Previous month').props.accessibilityState.disabled).toBe(true)
    fireEvent.press(screen.getByLabelText('Next month'))
    fireEvent.press(screen.getByLabelText('Next month'))
    expect(screen.getByText('April 2026')).toBeTruthy()
    fireEvent.press(screen.getByLabelText('Next month'))
    expect(screen.getByText('April 2026')).toBeTruthy()
    fireEvent.press(screen.getByLabelText('Previous month'))
    expect(screen.getByText('March 2026')).toBeTruthy()
  })

  it('takes the width its container gives it, and keeps every weekday name on one line', () => {
    const { StyleSheet } = require('react-native')
    const screen = renderWithProviders(<OCalendar onDateChange={jest.fn()} />)
    // Stretched across the container: a shrink-to-content box left about 160 pt of a 402 pt screen.
    const container = StyleSheet.flatten(screen.getByTestId('calendar-picker').props.style)
    expect(container.alignSelf).toBe('stretch')
    expect(container.width).toBeUndefined()
    for (const name of ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']) {
      expect(screen.getByText(name).props.numberOfLines).toBe(1)
    }
  })

  it('keeps the width the caller gives', () => {
    const { StyleSheet } = require('react-native')
    const screen = renderWithProviders(<OCalendar width={280} onDateChange={jest.fn()} />)
    expect(StyleSheet.flatten(screen.getByTestId('calendar-picker').props.style).width).toBe(280)
  })
})
