import React from 'react'
import { fireEvent } from '@testing-library/react-native'

jest.mock('@components', () => {
  const mockOrdering = require('../../../../../../jest/helpers/mockOrdering')
  const { renderUiController } = require('../../../../../../jest/helpers/d1ShellDefaults')
  const { driverListDefaults } = require('../../../../../../jest/helpers/d3OrdersDefaults')
  return {
    ...mockOrdering,
    DriverList: renderUiController(driverListDefaults)
  }
})

const { setupSharedComponentHooks } = require('../../../../../../jest/helpers/driverSharedTestSetup')
setupSharedComponentHooks()

import { OrdersOptionDriver } from '..'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'

describe('OrdersOptionDriver', () => {
  it('renders driver filter placeholder', () => {
    const { getByText } = renderWithProviders(<OrdersOptionDriver />)
    expect(getByText('Select Driver')).toBeTruthy()
  })

  it('calls onSearch when a driver is selected', () => {
    const onSearch = jest.fn()
    const { getByText } = renderWithProviders(<OrdersOptionDriver onSearch={onSearch} />)
    fireEvent.press(getByText('Select Driver'))
    fireEvent.press(getByText('Driver One'))
    expect(onSearch).toHaveBeenCalledWith(expect.objectContaining({ driver: 1 }))
  })
})
