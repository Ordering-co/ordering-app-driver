import React from 'react'
import { fireEvent } from '@testing-library/react-native'

jest.mock('@components', () => require('../../../../../../jest/helpers/mockOrdering'))

const { setupSharedComponentHooks } = require('../../../../../../jest/helpers/driverSharedTestSetup')
setupSharedComponentHooks()

import { OrdersOptionDate } from '..'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { filterSearchDefaults } from '../../../../../../jest/helpers/d3OrdersDefaults'

describe('OrdersOptionDate', () => {
  it('renders date filter placeholder', () => {
    const { getByText } = renderWithProviders(
      <OrdersOptionDate {...filterSearchDefaults} />
    )
    expect(getByText('Select Date')).toBeTruthy()
  })

  it('calls onSearch when a preset date is selected', () => {
    const onSearch = jest.fn()
    const { getByText } = renderWithProviders(
      <OrdersOptionDate {...filterSearchDefaults} onSearch={onSearch} />
    )
    fireEvent.press(getByText('Select Date'))
    fireEvent.press(getByText('Today'))
    expect(onSearch).toHaveBeenCalledWith(
      expect.objectContaining({ date: expect.objectContaining({ type: 'today' }) })
    )
  })
})
