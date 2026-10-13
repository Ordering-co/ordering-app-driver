import React from 'react'
import { fireEvent } from '@testing-library/react-native'

jest.mock('@components', () => {
  const mockOrdering = require('../../../../../../jest/helpers/mockOrdering')
  const logout = jest.fn()
  return {
    ...mockOrdering,
    useSession: Object.assign(
      jest.fn(() => [{}, { logout }]),
      { __logout: logout }
    )
  }
})

import { useSession } from '@components'
import { ScheduleBlocked } from '..'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { scheduleBlockedDefaults } from '../../../../../../jest/helpers/d4LegacyDefaults'

describe('ScheduleBlocked', () => {
  beforeEach(() => {
    ;(useSession as any).__logout.mockClear()
  })

  it('renders blocked login messaging', () => {
    const { getByText } = renderWithProviders(
      <ScheduleBlocked {...scheduleBlockedDefaults} />
    )
    expect(getByText("You can't login")).toBeTruthy()
    expect(getByText('You are outside the established schedule')).toBeTruthy()
  })

  it('shows next available schedule window', () => {
    const { getByText } = renderWithProviders(
      <ScheduleBlocked {...scheduleBlockedDefaults} />
    )
    expect(getByText(/Next time/)).toBeTruthy()
    expect(getByText(/Sunday/)).toBeTruthy()
    expect(getByText(/09:00/)).toBeTruthy()
  })

  it('logs out when go back is pressed', () => {
    const { getByText } = renderWithProviders(
      <ScheduleBlocked {...scheduleBlockedDefaults} />
    )
    fireEvent.press(getByText('Go back'))
    expect((useSession as any).__logout).toHaveBeenCalled()
  })
})
