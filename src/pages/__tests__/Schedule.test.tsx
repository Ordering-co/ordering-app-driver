import React from 'react'

import { useSession } from '@components'
import { renderPage } from '../../../jest/helpers/renderPage'

jest.mock('@ui', () => {
  const React = require('react')
  const { Text, View } = require('react-native')
  return {
    ...require('../../../jest/helpers/mockUi'),
    DriverSchedule: (props: any) => React.createElement(
      View,
      { testID: 'driver-schedule', navigation: props.navigation },
      React.createElement(Text, { testID: 'driver-schedule-days' }, JSON.stringify(props.schedule ?? null))
    )
  }
})

import Schedule from '../Schedule'

describe('Schedule', () => {
  it('opens the driver\'s week from the session\'s user, on a screen of the stack', () => {
    const schedule = [{ enabled: true, lapses: [] }]
    ;(useSession as jest.Mock).mockReturnValue([{ user: { id: 7, schedule } }, {}])
    const { getByTestId, navigation } = renderPage(Schedule)
    expect(getByTestId('safe-area-layout')).toBeTruthy()
    expect(JSON.parse(getByTestId('driver-schedule-days').props.children)).toEqual(schedule)
    expect(getByTestId('driver-schedule').props.navigation).toBe(navigation)
  })

  it('has no schedule to hand over for a driver without one', () => {
    ;(useSession as jest.Mock).mockReturnValue([{ user: { id: 7 } }, {}])
    const { getByTestId } = renderPage(Schedule)
    expect(JSON.parse(getByTestId('driver-schedule-days').props.children)).toBeNull()
  })
})
