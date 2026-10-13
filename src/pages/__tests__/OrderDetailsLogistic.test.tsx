import React from 'react'

import { renderPage } from '../../../jest/helpers/renderPage'

jest.mock('@ui', () => require('../../../jest/helpers/mockUi'))

import OrderDetailsLogistic from '../OrderDetailsLogistic'

describe('OrderDetailsLogistic', () => {
  it('renders logistic order details controller', () => {
    const { getByTestId } = renderPage(OrderDetailsLogistic, {
      route: {
        params: {
          order: { id: 12 },
          orderAssingId: 3,
          handleClickLogisticOrder: jest.fn()
        }
      }
    })
    expect(getByTestId('order-details-logistic')).toBeTruthy()
    expect(getByTestId('safe-area-layout')).toBeTruthy()
  })
})
