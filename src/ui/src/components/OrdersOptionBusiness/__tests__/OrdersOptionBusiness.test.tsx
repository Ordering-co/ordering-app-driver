import React from 'react'
import { fireEvent } from '@testing-library/react-native'

jest.mock('@components', () => {
  const mockOrdering = require('../../../../../../jest/helpers/mockOrdering')
  const { renderUiController } = require('../../../../../../jest/helpers/d1ShellDefaults')
  const { businessListDefaults } = require('../../../../../../jest/helpers/d3OrdersDefaults')
  return {
    ...mockOrdering,
    BusinessList: renderUiController(businessListDefaults)
  }
})

const { setupSharedComponentHooks } = require('../../../../../../jest/helpers/driverSharedTestSetup')
setupSharedComponentHooks()

import { OrdersOptionBusiness } from '..'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'

describe('OrdersOptionBusiness', () => {
  it('renders business filter placeholder', () => {
    const { getByText } = renderWithProviders(<OrdersOptionBusiness />)
    expect(getByText('Select Business')).toBeTruthy()
  })

  it('calls onSearch when a business is selected', () => {
    const onSearch = jest.fn()
    const { getByText } = renderWithProviders(<OrdersOptionBusiness onSearch={onSearch} />)
    fireEvent.press(getByText('Select Business'))
    fireEvent.press(getByText('Store A'))
    expect(onSearch).toHaveBeenCalledWith(expect.objectContaining({ business: 1 }))
  })
})
