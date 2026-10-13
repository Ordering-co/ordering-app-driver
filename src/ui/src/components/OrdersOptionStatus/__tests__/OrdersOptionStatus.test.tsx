import React from 'react'
import { fireEvent } from '@testing-library/react-native'

jest.mock('@components', () => require('../../../../../../jest/helpers/mockOrdering'))

const { setupSharedComponentHooks } = require('../../../../../../jest/helpers/driverSharedTestSetup')
setupSharedComponentHooks()

import { OrdersOptionStatus } from '..'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { statusFilterDefaults } from '../../../../../../jest/helpers/d3OrdersDefaults'

describe('OrdersOptionStatus', () => {
  it('renders status filter placeholder', () => {
    const { getByText } = renderWithProviders(
      <OrdersOptionStatus {...statusFilterDefaults} />
    )
    expect(getByText('Select Status')).toBeTruthy()
  })

  it('calls onSearch when a status is selected', () => {
    const onSearch = jest.fn()
    const { getByText } = renderWithProviders(
      <OrdersOptionStatus {...statusFilterDefaults} onSearch={onSearch} />
    )
    fireEvent.press(getByText('Select Status'))
    fireEvent.press(getByText('Pending'))
    expect(onSearch).toHaveBeenCalledWith(expect.objectContaining({ state: 0 }))
  })
})
