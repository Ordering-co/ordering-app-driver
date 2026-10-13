import React from 'react'

jest.mock('@components', () => {
  const mockOrdering = require('../../../../../../jest/helpers/mockOrdering')
  return {
    ...mockOrdering,
    useSession: jest.fn(() => [{}, { refreshUserInfo: jest.fn() }]),
    useUtils: jest.fn(() => [{
      parseDate: () => '2026-07-14'
    }, {}])
  }
})

import { DriverSchedule } from '..'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { driverScheduleDefaults } from '../../../../../../jest/helpers/d4LegacyDefaults'

describe('DriverSchedule', () => {
  it('renders schedule header and days', () => {
    const { getByText } = renderWithProviders(
      <DriverSchedule {...driverScheduleDefaults} />
    )
    expect(getByText('Schedule')).toBeTruthy()
    expect(getByText('Sun')).toBeTruthy()
    expect(getByText('Mon')).toBeTruthy()
  })

  it('shows open/close times for enabled days', () => {
    const { getAllByText } = renderWithProviders(
      <DriverSchedule {...driverScheduleDefaults} />
    )
    expect(getAllByText('09:00').length).toBeGreaterThan(0)
    expect(getAllByText('17:00').length).toBeGreaterThan(0)
  })

  it('shows not available for disabled days', () => {
    const { getByText } = renderWithProviders(
      <DriverSchedule {...driverScheduleDefaults} />
    )
    expect(getByText('Not available')).toBeTruthy()
  })

  it('renders defaults when schedule is omitted', () => {
    const { getByText } = renderWithProviders(<DriverSchedule />)
    expect(getByText('Schedule')).toBeTruthy()
    expect(getByText('Sat')).toBeTruthy()
  })
})
