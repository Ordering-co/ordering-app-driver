import React from 'react'

import { renderPage } from '../../../jest/helpers/renderPage'

jest.mock('@ui', () => require('../../../jest/helpers/mockUi'))
jest.mock('../../context/PermissionsContext', () =>
  require('../../../jest/helpers/mockPermissionsContext')
)

import OrderDetails from '../OrderDetails'

describe('OrderDetails', () => {
  it('renders delivery order details controller', () => {
    const { getByTestId } = renderPage(OrderDetails, {
      route: {
        params: {
          orderId: 42,
          order: { id: 42, status: 7 },
          isFromCheckout: false
        }
      }
    })
    expect(getByTestId('order-details-delivery')).toBeTruthy()
    expect(getByTestId('safe-area-layout')).toBeTruthy()
  })

  it('uses order id from nested order param', () => {
    const { getByTestId } = renderPage(OrderDetails, {
      route: {
        params: {
          order: { id: 99 }
        }
      }
    })
    expect(getByTestId('order-details-delivery')).toBeTruthy()
  })
})
