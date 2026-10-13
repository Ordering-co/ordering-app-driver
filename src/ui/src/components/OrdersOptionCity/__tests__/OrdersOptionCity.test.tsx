import React from 'react'
import { fireEvent } from '@testing-library/react-native'

jest.mock('@components', () => {
  const mockOrdering = require('../../../../../../jest/helpers/mockOrdering')
  const { renderUiController } = require('../../../../../../jest/helpers/d1ShellDefaults')
  const { mainSearchDefaults } = require('../../../../../../jest/helpers/d3OrdersDefaults')
  return {
    ...mockOrdering,
    MainSearch: renderUiController(mainSearchDefaults)
  }
})

const { setupSharedComponentHooks } = require('../../../../../../jest/helpers/driverSharedTestSetup')
setupSharedComponentHooks()

import { OrdersOptionCity } from '..'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'

describe('OrdersOptionCity', () => {
  it('renders city filter placeholder', () => {
    const { getByText } = renderWithProviders(<OrdersOptionCity />)
    expect(getByText('Select City')).toBeTruthy()
  })

  it('calls onSearch when a city is selected', () => {
    const onSearch = jest.fn()
    const { getByText } = renderWithProviders(<OrdersOptionCity onSearch={onSearch} />)
    fireEvent.press(getByText('Select City'))
    fireEvent.press(getByText('City A'))
    expect(onSearch).toHaveBeenCalledWith(expect.objectContaining({ city: 10, cityName: 'City A' }))
  })
})
