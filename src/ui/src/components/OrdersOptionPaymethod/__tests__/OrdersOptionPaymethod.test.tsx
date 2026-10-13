import React from 'react'
import { fireEvent } from '@testing-library/react-native'

jest.mock('@components', () => {
  const mockOrdering = require('../../../../../../jest/helpers/mockOrdering')
  const { renderUiController } = require('../../../../../../jest/helpers/d1ShellDefaults')
  const { paymethodListDefaults } = require('../../../../../../jest/helpers/d3OrdersDefaults')
  return {
    ...mockOrdering,
    PaymethodList: renderUiController(paymethodListDefaults)
  }
})

const { setupSharedComponentHooks } = require('../../../../../../jest/helpers/driverSharedTestSetup')
setupSharedComponentHooks()

import { OrdersOptionPaymethod } from '..'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'

describe('OrdersOptionPaymethod', () => {
  it('renders paymethod filter placeholder', () => {
    const { getByText } = renderWithProviders(<OrdersOptionPaymethod />)
    expect(getByText('Select Paymethod')).toBeTruthy()
  })

  it('calls onSearch when a paymethod is selected', () => {
    const onSearch = jest.fn()
    const { getByText } = renderWithProviders(<OrdersOptionPaymethod onSearch={onSearch} />)
    fireEvent.press(getByText('Select Paymethod'))
    fireEvent.press(getByText('Cash'))
    expect(onSearch).toHaveBeenCalledWith(expect.objectContaining({ paymethod: 1 }))
  })
})
