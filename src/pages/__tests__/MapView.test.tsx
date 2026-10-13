import React from 'react'
import { fireEvent } from '@testing-library/react-native'

import { renderPage } from '../../../jest/helpers/renderPage'

jest.mock('@ui', () => require('../../../jest/helpers/mockUi'))

import MapView from '../MapView'

describe('MapView', () => {
  it('renders map view for delivery app', () => {
    const { getByTestId } = renderPage(MapView)
    expect(getByTestId('map-view-ui')).toBeTruthy()
    expect(getByTestId('map-view-delivery-app').props.children).toBe('delivery')
  })

  it('navigates on redirect', () => {
    const { getByTestId, navigation } = renderPage(MapView)
    fireEvent.press(getByTestId('map-view-nav'))
    expect(navigation.navigate).toHaveBeenCalledWith('OrderDetails', { orderId: 3 })
  })
})
