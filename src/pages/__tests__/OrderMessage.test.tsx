import React from 'react'

import { renderPage } from '../../../jest/helpers/renderPage'

jest.mock('@ui', () => require('../../../jest/helpers/mockUi'))

import OrderMessage from '../OrderMessage'

describe('OrderMessage', () => {
  it('renders order message controller with route params', () => {
    const setOrders = jest.fn()
    const { getByTestId } = renderPage(OrderMessage, {
      route: {
        params: {
          orderId: 15,
          isFromCheckout: false,
          setOrders
        }
      }
    })
    expect(getByTestId('order-message')).toBeTruthy()
    expect(getByTestId('safe-area-container')).toBeTruthy()
  })
})
