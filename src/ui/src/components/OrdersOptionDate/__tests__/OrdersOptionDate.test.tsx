import React from 'react'
import dayjs from '@/utils/dayjs'
import { StyleSheet } from 'react-native'
import { fireEvent } from '@testing-library/react-native'

import { useUtils } from '@components'

jest.mock('@components', () => require('../../../../../../jest/helpers/mockOrdering'))

const { setupSharedComponentHooks } = require('../../../../../../jest/helpers/driverSharedTestSetup')
setupSharedComponentHooks()

import { OrdersOptionDate } from '..'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { filterSearchDefaults } from '../../../../../../jest/helpers/d3OrdersDefaults'

/** The project's utility, with a project whose dates are written day first. */
const projectDates = (dateFormat = 'DD/MM/YYYY') => (useUtils as jest.Mock).mockReturnValue([{
  parseDate: (date: any, options: any = {}) => dayjs(date).format(options.outputFormat ?? `${dateFormat} HH:mm`),
  dateFormat,
  timeFormat: 'HH:mm'
}, {}])

describe('OrdersOptionDate', () => {
  beforeEach(() => projectDates())

  it('is a chip for each preset and one for a custom range, wrapped onto lines as the mockup draws them', () => {
    const { getByText, getByTestId, UNSAFE_getAllByProps } = renderWithProviders(
      <OrdersOptionDate {...filterSearchDefaults} />
    )
    for (const name of ['Today', 'Yesterday', 'Last 7 days', 'Last 30 days', 'Custom range']) {
      expect(getByText(name)).toBeTruthy()
    }
    // Wrapped, `sm` apart: no chip is off the screen's edge in a row that scrolls.
    const row = StyleSheet.flatten(getByTestId('orders-date-chips').props.style)
    expect(row).toMatchObject({ flexDirection: 'row', flexWrap: 'wrap', gap: 10 })
    expect(getByTestId('orders-date-chips').props.horizontal).toBeUndefined()
    // The custom range carries a calendar glyph.
    expect(UNSAFE_getAllByProps({ name: 'calendar-outline' }).length).toBeGreaterThan(0)
  })

  it('calls onSearch with the preset a chip names, each of the four', () => {
    const onSearch = jest.fn()
    const { getByText } = renderWithProviders(
      <OrdersOptionDate {...filterSearchDefaults} onSearch={onSearch} />
    )
    for (const [name, type] of [['Today', 'today'], ['Yesterday', 'yesterday'], ['Last 7 days', 'last_7days'], ['Last 30 days', 'last_30days']]) {
      fireEvent.press(getByText(name))
      expect(onSearch).toHaveBeenLastCalledWith(expect.objectContaining({ date: { from: '', to: '', type } }))
    }
  })

  it('paints the chosen preset selected, and clears the filter when it is pressed again', () => {
    const onSearch = jest.fn()
    const search = { ...filterSearchDefaults.search, date: { from: '', to: '', type: 'yesterday' } }
    const { getByTestId } = renderWithProviders(
      <OrdersOptionDate {...filterSearchDefaults} search={search} onSearch={onSearch} />
    )
    expect(getByTestId('orders-date-yesterday').props.accessibilityState.selected).toBe(true)
    expect(getByTestId('orders-date-today').props.accessibilityState.selected).toBe(false)
    fireEvent.press(getByTestId('orders-date-yesterday'))
    expect(onSearch).toHaveBeenCalledWith(expect.objectContaining({ date: { from: '', to: '', type: '' } }))
  })

  it('opens the calendar in a sheet from the custom range chip, not in place', () => {
    const { getByText, queryByText } = renderWithProviders(
      <OrdersOptionDate {...filterSearchDefaults} />
    )
    expect(queryByText('From')).toBeNull()
    fireEvent.press(getByText('Custom range'))
    expect(getByText('From')).toBeTruthy()
  })

  it('picks a range on the calendar: the first day, then the last one', () => {
    const search = { ...filterSearchDefaults.search, date: { from: '', to: '', type: '' } }
    const onSearch = jest.fn()
    const screen = renderWithProviders(
      <OrdersOptionDate {...filterSearchDefaults} search={search} onSearch={onSearch} />
    )
    fireEvent.press(screen.getByLabelText('Custom range'))
    expect(screen.getByText('From')).toBeTruthy()
    const today = new Date()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const first = screen.getAllByRole('button').find((node: any) => /^10 /.test(node.props.accessibilityLabel ?? ''))
    fireEvent.press(first as never)
    const from = `${month}/10/${today.getFullYear()}`
    expect(onSearch).toHaveBeenLastCalledWith(expect.objectContaining({ date: { from, to: '', type: 'calendar' } }))
    expect(screen.getByText('To')).toBeTruthy()

    screen.rerender(
      <OrdersOptionDate {...filterSearchDefaults} search={{ ...search, date: { from, to: '', type: 'calendar' } }} onSearch={onSearch} />
    )
    // A day before the first one cannot end the range.
    const before = screen.getAllByRole('button').find((node: any) => /^9 /.test(node.props.accessibilityLabel ?? ''))
    expect((before as any).props.accessibilityState.disabled).toBe(true)
    const last = screen.getAllByRole('button').find((node: any) => /^12 /.test(node.props.accessibilityLabel ?? ''))
    fireEvent.press(last as never)
    expect(onSearch).toHaveBeenLastCalledWith(expect.objectContaining({
      date: { from, to: `${month}/12/${today.getFullYear()}`, type: 'calendar' }
    }))
  })

  it('shows the picked range as the custom chip\'s text, selected, and clears it when it is pressed', () => {
    const onSearch = jest.fn()
    const search = { ...filterSearchDefaults.search, date: { from: '11/10/2026', to: '11/12/2026', type: 'calendar' } }
    const { getByText, getByTestId, queryByText } = renderWithProviders(
      <OrdersOptionDate {...filterSearchDefaults} search={search} onSearch={onSearch} />
    )
    // In the project's date format (decision H4), never the format the search sends.
    expect(getByText('10/11/2026 ~ 12/11/2026')).toBeTruthy()
    expect(queryByText('Custom range')).toBeNull()
    expect(getByTestId('orders-date-range').props.accessibilityState.selected).toBe(true)
    fireEvent.press(getByTestId('orders-date-range'))
    expect(onSearch).toHaveBeenCalledWith(expect.objectContaining({ date: { from: '', to: '', type: '' } }))
  })

  it('writes the picked range in the project\'s date format, whatever it is, and only its first day while the last one is missing', () => {
    projectDates('YYYY.MM.DD')
    const search = { ...filterSearchDefaults.search, date: { from: '11/10/2026', to: '', type: 'calendar' } }
    const screen = renderWithProviders(<OrdersOptionDate {...filterSearchDefaults} search={search} />)
    expect(screen.getByText('2026.11.10')).toBeTruthy()
    screen.rerender(
      <OrdersOptionDate {...filterSearchDefaults} search={{ ...search, date: { ...search.date, to: '11/12/2026' } }} />
    )
    expect(screen.getByText('2026.11.10 ~ 2026.11.12')).toBeTruthy()
    expect(screen.queryByText(/11\/10\/2026/)).toBeNull()
  })

  it('leaves the padding around the calendar to its sheet (decision H5)', () => {
    const { StyleSheet } = require('react-native')
    const { defaultAppTheme } = require('../../../../../theme/engine')
    const sheet = defaultAppTheme().native.components.sheet.base
    const screen = renderWithProviders(<OrdersOptionDate {...filterSearchDefaults} />)
    fireEvent.press(screen.getByLabelText('Custom range'))
    // The boxes around the calendar, from it up to the sheet: only the sheet's body pads it.
    const padded: any[] = []
    for (let node: any = screen.getByTestId('orders-date-calendar').parent; node; node = node.parent) {
      const style = typeof node.type === 'string' ? StyleSheet.flatten(node.props.style) ?? {} : {}
      if (style.paddingHorizontal !== undefined || style.paddingBottom !== undefined) padded.push(style)
      if (style.borderTopLeftRadius !== undefined) break
    }
    expect(padded[0].paddingHorizontal).toBe(sheet.padding)
    expect(padded[0].paddingBottom).toBe(sheet.padding)
    // The next padded box is the sheet's own (the system space under it), not one of the screen's.
    expect(padded.filter((style) => style.paddingHorizontal !== undefined)).toHaveLength(1)
  })

  it('paints no chip selected without a value', () => {
    const search = { ...filterSearchDefaults.search, date: { from: '', to: '', type: '' } }
    const { getAllByRole } = renderWithProviders(
      <OrdersOptionDate {...filterSearchDefaults} search={search} />
    )
    expect(getAllByRole('button').filter((chip: any) => chip.props.accessibilityState?.selected)).toHaveLength(0)
  })
})
