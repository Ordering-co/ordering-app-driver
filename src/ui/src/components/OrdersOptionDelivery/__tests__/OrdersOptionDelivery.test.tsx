import React from 'react'
import { fireEvent } from '@testing-library/react-native'

jest.mock('@components', () => require('../../../../../../jest/helpers/mockOrdering'))

const { setupSharedComponentHooks } = require('../../../../../../jest/helpers/driverSharedTestSetup')
setupSharedComponentHooks()

import { OrdersOptionDelivery } from '..'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { filterSearchDefaults } from '../../../../../../jest/helpers/d3OrdersDefaults'

describe('OrdersOptionDelivery', () => {
  it('renders delivery type filter placeholder', () => {
    const { getByText } = renderWithProviders(
      <OrdersOptionDelivery {...filterSearchDefaults} />
    )
    expect(getByText('Select Delivery type')).toBeTruthy()
  })

  it('calls onSearch when delivery type is selected', () => {
    const onSearch = jest.fn()
    const { getByText } = renderWithProviders(
      <OrdersOptionDelivery {...filterSearchDefaults} onSearch={onSearch} />
    )
    fireEvent.press(getByText('Select Delivery type'))
    fireEvent.press(getByText('Delivery'))
    expect(onSearch).toHaveBeenCalledWith(expect.objectContaining({ delivery_type: '1' }))
  })
})
