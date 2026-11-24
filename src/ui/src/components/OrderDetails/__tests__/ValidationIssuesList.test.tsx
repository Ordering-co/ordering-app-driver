import React from 'react'
import { fireEvent } from '@testing-library/react-native'

import { ValidationIssuesList } from '../ValidationIssuesList'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'

const issues = [
  { message: 'Your location is outdated', action: jest.fn(), actionText: 'Refresh Location' },
  { message: 'You are 2.0 km away from the business', action: null, actionText: null }
]

describe('ValidationIssuesList', () => {
  it('lists every requirement, with the action that solves it', () => {
    const { getByText, getAllByRole } = renderWithProviders(<ValidationIssuesList issues={issues} />)
    expect(getByText('Your location is outdated')).toBeTruthy()
    expect(getByText('You are 2.0 km away from the business')).toBeTruthy()
    const buttons = getAllByRole('button')
    expect(buttons).toHaveLength(1)
    fireEvent.press(buttons[0])
    expect(issues[0].action).toHaveBeenCalled()
  })

  it('draws each requirement\'s glyph at the detail size (`order_details.base.detail_icon_size`, 18)', () => {
    const { defaultAppTheme } = require('../../../../../theme/engine')
    const size = defaultAppTheme().native.components.order_details.base.detail_icon_size
    expect(size).toBe(18)
    const { UNSAFE_getAllByProps } = renderWithProviders(<ValidationIssuesList issues={issues} />)
    const glyphs = UNSAFE_getAllByProps({ name: 'alert-circle' })
    expect(glyphs[glyphs.length - 1].props.size).toBe(size)
  })

  it('shows no action in a banner', () => {
    const { queryByRole, getByText } = renderWithProviders(<ValidationIssuesList issues={issues} showActions={false} />)
    expect(getByText('Your location is outdated')).toBeTruthy()
    expect(queryByRole('button')).toBeNull()
  })
})
