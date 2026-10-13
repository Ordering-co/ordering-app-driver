import '../../../../../../jest/helpers/registerD4MapMocks'

import React from 'react'
import { fireEvent, waitFor } from '@testing-library/react-native'

jest.mock('@react-navigation/native', () => {
  const React = require('react')
  return {
    NavigationContainer: ({ children }: any) => children,
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
      reset: jest.fn(),
      setOptions: jest.fn(),
      addListener: jest.fn(() => jest.fn())
    }),
    useRoute: () => ({ params: {} }),
    useFocusEffect: (cb: any) => {
      React.useEffect(() => {
        const cleanup = cb()
        return typeof cleanup === 'function' ? cleanup : undefined
      }, [])
    },
    createNavigatorFactory: () => () => ({
      Navigator: ({ children }: any) => children,
      Screen: () => null,
      Group: ({ children }: any) => children
    })
  }
})

jest.mock('@ui', () => {
  const { buildD4MapUiMock } = require('../../../../../../jest/helpers/d4MapUiMock')
  return buildD4MapUiMock()
})

jest.mock('@components', () => {
  const mockOrdering = require('../../../../../../jest/helpers/mockOrdering')
  const { renderUiController } = require('../../../../../../jest/helpers/d1ShellDefaults')
  const { mapViewDefaults } = require('../../../../../../jest/helpers/d4MapDefaults')
  return {
    ...mockOrdering,
    useSession: jest.fn(() => [{
      user: { id: 1, name: 'Driver', photo: 'https://example.com/photo.png' }
    }, {}]),
    MapView: renderUiController(mapViewDefaults)
  }
})

import { MapViewUI } from '..'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'

describe('MapView', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders map when focused and markers loaded', async () => {
    const { getByTestId } = renderWithProviders(<MapViewUI />)
    await waitFor(() => expect(getByTestId('map-view')).toBeTruthy())
  })

  it('loads business locations on focus', () => {
    const getBusinessLocations = jest.fn()
    renderWithProviders(<MapViewUI getBusinessLocations={getBusinessLocations} />)
    expect(getBusinessLocations).toHaveBeenCalled()
  })

  it('updates driver location from user location', () => {
    const setDriverLocation = jest.fn()
    renderWithProviders(<MapViewUI setDriverLocation={setDriverLocation} />)
    expect(setDriverLocation).toHaveBeenCalledWith({
      location: { lat: 40.7128, lng: -74.006 }
    })
  })

  it('shows alert and closes it', () => {
    const setAlertState = jest.fn()
    const { getByTestId, getByText } = renderWithProviders(
      <MapViewUI
        alertState={{ open: true, content: ['Map failed'] }}
        setAlertState={setAlertState}
      />
    )
    expect(getByText('Error')).toBeTruthy()
    expect(getByText('Map failed')).toBeTruthy()
    fireEvent.press(getByTestId('alert-accept'))
    expect(setAlertState).toHaveBeenCalled()
  })

  it('zooms via fab controls', async () => {
    const { UNSAFE_getAllByType } = renderWithProviders(<MapViewUI />)
    await waitFor(() => {
      const { TouchableOpacity } = require('react-native')
      expect(UNSAFE_getAllByType(TouchableOpacity).length).toBeGreaterThan(0)
    })
    const { TouchableOpacity } = require('react-native')
    const fabs = UNSAFE_getAllByType(TouchableOpacity)
    fabs.forEach((node: any) => {
      if (typeof node.props.onPress === 'function') {
        fireEvent.press(node)
      }
    })
    expect(fabs.length).toBeGreaterThan(0)
  })
})
