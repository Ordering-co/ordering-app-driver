import React from 'react'

import { renderPage } from '../../../jest/helpers/renderPage'

jest.mock('@ui', () => {
  const React = require('react')
  const { View } = require('react-native')
  return {
    ...require('../../../jest/helpers/mockUi'),
    OrdersRoute: (props: any) => React.createElement(View, { testID: 'orders-route', navigation: props.navigation }),
    OrdersRouteStops: (props: any) => React.createElement(View, { testID: 'orders-route-stops', navigation: props.navigation })
  }
})

import OrdersRoute from '../OrdersRoute'
import OrdersRouteStops from '../OrdersRouteStops'

describe('the route\'s pages', () => {
  it('OrdersRoute draws the route on a screen of the stack, with its navigation', () => {
    const { getByTestId, navigation } = renderPage(OrdersRoute)
    expect(getByTestId('safe-area-layout')).toBeTruthy()
    expect(getByTestId('orders-route').props.navigation).toBe(navigation)
  })

  it('OrdersRouteStops draws the list of stops on a screen of the stack, with its navigation', () => {
    const { getByTestId, navigation } = renderPage(OrdersRouteStops)
    expect(getByTestId('safe-area-layout')).toBeTruthy()
    expect(getByTestId('orders-route-stops').props.navigation).toBe(navigation)
  })
})
