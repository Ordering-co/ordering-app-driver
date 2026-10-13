import '../../../../../../jest/helpers/registerD4MapMocks'

import React from 'react'
import { fireEvent, waitFor } from '@testing-library/react-native'

jest.mock('@ui', () => {
  const { buildD4MapUiMock } = require('../../../../../../jest/helpers/d4MapUiMock')
  return buildD4MapUiMock()
})

jest.mock('@components', () => {
  const mockOrdering = require('../../../../../../jest/helpers/mockOrdering')
  return {
    ...mockOrdering,
    useConfig: jest.fn(() => [{
      loading: false,
      configs: {
        google_maps_api_key: { value: 'test-key' },
        change_order_id: { value: '0' }
      }
    }])
  }
})

import { GoogleMap } from '..'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import {
  googleMapDefaults,
  googleMapWithOrderDefaults
} from '../../../../../../jest/helpers/d4MapDefaults'

describe('GoogleMap', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders map with single location', () => {
    const { getByTestId } = renderWithProviders(
      <GoogleMap {...googleMapDefaults} />
    )
    expect(getByTestId('map-view')).toBeTruthy()
  })

  it('renders order header with location markers', () => {
    const { getByText } = renderWithProviders(
      <GoogleMap {...googleMapWithOrderDefaults} />
    )
    expect(getByText('Business')).toBeTruthy()
    expect(getByText('Customer')).toBeTruthy()
  })

  it('closes map via icon button', () => {
    const handleOpenMapView = jest.fn()
    const { UNSAFE_getAllByType } = renderWithProviders(
      <GoogleMap {...googleMapDefaults} handleOpenMapView={handleOpenMapView} />
    )
    const { TouchableOpacity } = require('react-native')
    const buttons = UNSAFE_getAllByType(TouchableOpacity)
    fireEvent.press(buttons[buttons.length - 1])
    expect(handleOpenMapView).toHaveBeenCalled()
  })

  it('fires accept action when floating button shown', () => {
    const handleViewActionOrder = jest.fn()
    const { getByTestId } = renderWithProviders(
      <GoogleMap
        {...googleMapDefaults}
        showAcceptOrReject
        handleViewActionOrder={handleViewActionOrder}
      />
    )
    fireEvent.press(getByTestId('floating-first'))
    expect(handleViewActionOrder).toHaveBeenCalledWith('accept')
  })

  it('geocodes when saveLocation is true', async () => {
    const handleChangeAddressMap = jest.fn()
    const setSaveLocation = jest.fn()
    const handleToggleMap = jest.fn()
    renderWithProviders(
      <GoogleMap
        {...googleMapDefaults}
        saveLocation
        isSetInputs
        handleChangeAddressMap={handleChangeAddressMap}
        setSaveLocation={setSaveLocation}
        handleToggleMap={handleToggleMap}
      />
    )
    await waitFor(() => {
      expect(handleChangeAddressMap).toHaveBeenCalled()
      expect(setSaveLocation).toHaveBeenCalledWith(false)
      expect(handleToggleMap).toHaveBeenCalled()
    })
  })

  it('renders multi-location markers for order map', () => {
    const { getAllByTestId, getByText } = renderWithProviders(
      <GoogleMap {...googleMapWithOrderDefaults} />
    )
    expect(getByText('Business')).toBeTruthy()
    expect(getAllByTestId('map-marker').length).toBeGreaterThan(0)
  })
})
