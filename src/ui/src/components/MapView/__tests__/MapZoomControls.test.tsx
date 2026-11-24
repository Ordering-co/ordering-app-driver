import React from 'react'
import { StyleSheet, View } from 'react-native'
import { fireEvent } from '@testing-library/react-native'

import { MapZoomControls, useMapZoom } from '../MapZoomControls'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { buildAppTheme, defaultAppTheme, THEME_PRODUCT_TYPE } from '../../../../../theme/engine'

const { setupSharedComponentHooks } = require('../../../../../../jest/helpers/driverSharedTestSetup')
setupSharedComponentHooks()

/** The hook behind a pair of buttons, with a map that records what it is told. */
const Zoomer = ({ map, initial }: { map: any, initial: any }) => {
  const ref = React.useRef<any>(map)
  const zoom = useMapZoom(ref, initial)
  return (
    <View>
      <MapZoomControls onZoomIn={zoom.zoomIn} onZoomOut={zoom.zoomOut} />
      <View testID='settle' onTouchEnd={() => zoom.setRegion({ latitude: 10, longitude: 20, latitudeDelta: 0.4, longitudeDelta: 0.8 })} />
    </View>
  )
}

describe('MapZoomControls (the zoom of both maps: the Map tab and the order\'s driver map)', () => {
  const theme: any = defaultAppTheme()

  it('is a pair of buttons the size of the map\'s own floating buttons, named for a screen reader', () => {
    const { getByLabelText, getByTestId } = renderWithProviders(<MapZoomControls onZoomIn={jest.fn()} onZoomOut={jest.fn()} />)
    expect(getByLabelText('Zoom in').props.accessibilityRole).toBe('button')
    expect(getByLabelText('Zoom out').props.accessibilityRole).toBe('button')
    // One above the other, `sm` apart.
    expect(StyleSheet.flatten(getByTestId('map-zoom-controls').props.style).gap).toBe(theme.native.tokens.space.sm)
  })

  it('draws nothing when the theme hides the zoom buttons', () => {
    const custom: any = buildAppTheme({ version: 2, product_type: THEME_PRODUCT_TYPE, values: { visibility: { 'map.zoom_controls': false } } })
    const { queryByTestId } = renderWithProviders(<MapZoomControls onZoomIn={jest.fn()} onZoomOut={jest.fn()} />, { themeOverrides: custom })
    expect(queryByTestId('map-zoom-controls')).toBeNull()
  })

  it('halves the deltas of the region the map settled on to zoom in, doubles them to zoom out', () => {
    const map = { animateToRegion: jest.fn() }
    const { getByLabelText, getByTestId } = renderWithProviders(
      <Zoomer map={map} initial={{ latitude: 1, longitude: 2, latitudeDelta: 0.1, longitudeDelta: 0.2 }} />
    )
    fireEvent.press(getByLabelText('Zoom in'))
    expect(map.animateToRegion).toHaveBeenLastCalledWith({ latitude: 1, longitude: 2, latitudeDelta: 0.05, longitudeDelta: 0.1 })
    fireEvent.press(getByLabelText('Zoom out'))
    expect(map.animateToRegion).toHaveBeenLastCalledWith({ latitude: 1, longitude: 2, latitudeDelta: 0.2, longitudeDelta: 0.4 })
    // After the map settles somewhere else, the zoom starts from there.
    fireEvent(getByTestId('settle'), 'touchEnd')
    fireEvent.press(getByLabelText('Zoom in'))
    expect(map.animateToRegion).toHaveBeenLastCalledWith({ latitude: 10, longitude: 20, latitudeDelta: 0.2, longitudeDelta: 0.4 })
  })

  it('does nothing until the map says where it is (no position to zoom from)', () => {
    const map = { animateToRegion: jest.fn() }
    const { getByLabelText } = renderWithProviders(<Zoomer map={map} initial={{ latitudeDelta: 0.1, longitudeDelta: 0.2 }} />)
    fireEvent.press(getByLabelText('Zoom in'))
    expect(map.animateToRegion).not.toHaveBeenCalled()
  })
})
