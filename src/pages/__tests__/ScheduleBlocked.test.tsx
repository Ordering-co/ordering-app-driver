import React from 'react'
import { StyleSheet } from 'react-native'

import { renderPage } from '../../../jest/helpers/renderPage'
import { defaultAppTheme } from '../../theme/engine'

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

  it('paints the page background of the theme', () => {
    const theme: any = defaultAppTheme()
    const { toJSON } = renderPage(ScheduleBlocked, {
      route: { params: { nextSchedule: '09:00' } }
    })
    const wrapper: any = toJSON()
    expect(StyleSheet.flatten(wrapper.props.style).backgroundColor).toBe(theme.native.tokens.color.background)
  })
})
