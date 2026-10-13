import '../../../../../../jest/helpers/registerD4MapMocks'

import React from 'react'
import { fireEvent } from '@testing-library/react-native'

jest.mock('@ui', () => {
  const { buildD4LegacyUiMock } = require('../../../../../../jest/helpers/d4MapUiMock')
  return buildD4LegacyUiMock()
})

jest.mock('@components', () => {
  const mockOrdering = require('../../../../../../jest/helpers/mockOrdering')
  const { d4ConfigState } = require('../../../../../../jest/helpers/d4LegacyDefaults')
  return {
    ...mockOrdering,
    useConfig: jest.fn(() => [d4ConfigState]),
    useUtils: jest.fn(() => [{
      parseDate: (v: string) => v || '2026-07-14'
    }, {}])
  }
})

import { DriverMap } from '..'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import {
  driverMapDefaults,
  driverMapAcceptRejectDefaults
} from '../../../../../../jest/helpers/d4LegacyDefaults'

describe('DriverMap', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders map for order location', () => {
    const { getByTestId, getByText } = renderWithProviders(
      <DriverMap {...driverMapDefaults} />
    )
    expect(getByTestId('map-view')).toBeTruthy()
    expect(getByText(/Order No\./)).toBeTruthy()
    expect(getByText(/Pending/)).toBeTruthy()
  })

  it('closes map via back control', () => {
    const handleOpenMapView = jest.fn()
    const setDriverUpdateLocation = jest.fn()
    const { UNSAFE_getAllByType } = renderWithProviders(
      <DriverMap
        {...driverMapDefaults}
        handleOpenMapView={handleOpenMapView}
        setDriverUpdateLocation={setDriverUpdateLocation}
      />
    )
    const { TouchableOpacity } = require('react-native')
    UNSAFE_getAllByType(TouchableOpacity).forEach((node: any) => {
      if (typeof node.props.onPress === 'function') {
        fireEvent.press(node)
      }
    })
    expect(handleOpenMapView).toHaveBeenCalled()
  })

  it('fires accept/reject actions', () => {
    const handleViewActionOrder = jest.fn()
    const { getByTestId } = renderWithProviders(
      <DriverMap
        {...driverMapAcceptRejectDefaults}
        handleViewActionOrder={handleViewActionOrder}
      />
    )
    fireEvent.press(getByTestId('floating-second'))
    expect(handleViewActionOrder).toHaveBeenCalled()
  })
})
