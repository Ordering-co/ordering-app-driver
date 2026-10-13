import React from 'react'
import { fireEvent } from '@testing-library/react-native'

jest.mock('react-native-calendar-picker', () => require('../../../../../../jest/mocks/calendarPicker'))

import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
const { iconSource, setupSharedComponentHooks } = require('../../../../../../jest/helpers/driverSharedTestSetup')
import ODropDownCalendar from '../ODropDownCalendar'

setupSharedComponentHooks()

describe('ODropDownCalendar', () => {
  const baseProps = {
    placeholder: 'Select date',
    onSelect: jest.fn(),
    rangeDate: { from: '', to: '' },
    handleChangeDate: jest.fn()
  }

  it('renders closed dropdown', () => {
    const { getByText } = renderWithProviders(<ODropDownCalendar {...baseProps} />)
    expect(getByText('Select date')).toBeTruthy()
  })

  it('opens modal options and selects an option', () => {
    const onSelect = jest.fn()
    const options = [
      { value: 'today', name: 'Today', content: 'Today' },
      { value: 'calendar', name: 'Calendar', content: 'Calendar' }
    ]
    const { getByText } = renderWithProviders(
      <ODropDownCalendar {...baseProps} onSelect={onSelect} isModal options={options} defaultValue="today" />
    )
    fireEvent.press(getByText('Today'))
    fireEvent.press(getByText('Calendar'))
    expect(onSelect).toHaveBeenCalled()
  })

  it('handles calendar date selection', () => {
    const handleChangeDate = jest.fn()
    const options = [{ value: 'calendar', name: 'Calendar', content: 'Calendar' }]
    const { getByText, getByTestId } = renderWithProviders(
      <ODropDownCalendar
        {...baseProps}
        handleChangeDate={handleChangeDate}
        isCalendar
        isModal
        options={options}
        defaultValue="calendar"
        isCalendarAlwaysVisible
      />
    )
    fireEvent.press(getByText('Select date'))
    fireEvent.press(getByTestId('calendar-select-start'))
    fireEvent.press(getByTestId('calendar-select-end'))
    expect(handleChangeDate).toHaveBeenCalled()
  })
})
