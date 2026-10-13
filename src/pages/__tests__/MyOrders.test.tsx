import React from 'react'
import { fireEvent } from '@testing-library/react-native'

import { renderPage } from '../../../jest/helpers/renderPage'

jest.mock('@ui', () => require('../../../jest/helpers/mockUi'))
jest.mock('../../context/PermissionsContext', () =>
  require('../../../jest/helpers/mockPermissionsContext')
)

import MyOrders from '../MyOrders'

describe('MyOrders', () => {
  it('renders orders option for driver app', () => {
    const { getByTestId } = renderPage(MyOrders)
    expect(getByTestId('orders-option')).toBeTruthy()
    expect(getByTestId('orders-option-driver').props.children).toBe('driver')
    expect(getByTestId('safe-area-layout')).toBeTruthy()
  })

  it('navigates on redirect and skips empty page', () => {
    const { getByTestId, navigation } = renderPage(MyOrders)
    fireEvent.press(getByTestId('orders-option-nav'))
    expect(navigation.navigate).toHaveBeenCalledWith('OrderDetails', { orderId: 5 })
    fireEvent.press(getByTestId('orders-option-nav-empty'))
    expect(navigation.navigate).toHaveBeenCalledTimes(1)
  })
})
