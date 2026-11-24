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

  it('asks for the usual page of orders while the summary section is hidden (the default)', () => {
    const { OrdersOption } = require('@ui')
    const { UNSAFE_getByType } = renderPage(MyOrders)
    const { paginationSettings } = UNSAFE_getByType(OrdersOption).props
    expect(paginationSettings.pageSize).toBe(10)
    expect(paginationSettings.filteredPageSize).toBeUndefined()
  })

  it('asks for larger filtered pages when a theme shows the summary section, whatever the project', () => {
    const { OrdersOption } = require('@ui')
    const { buildAppTheme, THEME_PRODUCT_TYPE } = require('../../theme/engine')
    const themeOverrides = buildAppTheme({
      version: 2,
      product_type: THEME_PRODUCT_TYPE,
      values: { pages: { orders: { sections: [{ key: 'tabs', visible: true }, { key: 'summary', visible: true }, { key: 'list', visible: true }] } } }
    })
    const { UNSAFE_getByType } = renderPage(MyOrders, { themeOverrides })
    expect(UNSAFE_getByType(OrdersOption).props.paginationSettings.filteredPageSize).toBe(50)
  })

  // The new-order alert asks the tab for a list through its route's params (`openOrdersTab`).
  describe('the list the new-order alert asks for', () => {
    const ask = (params: any) => {
      const { OrdersOption } = require('@ui')
      const view = renderPage(MyOrders, { route: { params } })
      return view.UNSAFE_getByType(OrdersOption).props.tabRequest
    }

    it('hands the ask to the list: which one, the status of the orders, and when', () => {
      expect(ask({ show: 'requests', at: 1700000000000 })).toEqual({ show: 'requests', at: 1700000000000 })
      expect(ask({ show: 'orders', status: 4, at: 5 })).toEqual({ show: 'orders', status: 4, at: 5 })
    })

    it('hands nothing when no one asked (or the ask was consumed: its params cleared)', () => {
      expect(ask({})).toBeUndefined()
      expect(ask({ show: undefined, status: undefined, at: undefined })).toBeUndefined()
    })
  })
})
