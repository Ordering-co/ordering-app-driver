import React from 'react'

import { renderPage } from '../../../jest/helpers/renderPage'

jest.mock('@ui', () => require('../../../jest/helpers/mockUi'))

import { ScheduleBlocked } from '../ScheduleBlocked'

describe('ScheduleBlocked', () => {
  it('renders schedule blocked controller with next schedule', () => {
    const { getByTestId } = renderPage(ScheduleBlocked, {
      route: { params: { nextSchedule: '09:00' } }
    })
    expect(getByTestId('schedule-blocked')).toBeTruthy()
    expect(getByTestId('schedule-blocked-next').props.children).toBe('09:00')
  })
})
