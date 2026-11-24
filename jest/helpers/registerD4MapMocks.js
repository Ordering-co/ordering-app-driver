/**
 * Native / third-party mocks for D4 map UI tests.
 */
/* eslint-env jest */

jest.mock('react-native-maps', () => {
  const React = require('react')
  const { View } = require('react-native')
  const MapView = React.forwardRef((props, ref) => {
    React.useImperativeHandle(ref, () => ({
      animateToRegion: jest.fn(),
      animateCamera: jest.fn(),
      fitToCoordinates: jest.fn()
    }))
    return React.createElement(View, { testID: 'map-view', ...props })
  })
  MapView.Marker = (props) => React.createElement(View, { testID: 'map-marker', ...props })
  MapView.Polygon = (props) => React.createElement(View, { testID: 'map-polygon', ...props })
  MapView.Circle = (props) => React.createElement(View, { testID: 'map-circle', ...props })
  MapView.Callout = (props) => React.createElement(View, { testID: 'map-callout', ...props })
  return {
    __esModule: true,
    default: MapView,
    Marker: MapView.Marker,
    Polygon: MapView.Polygon,
    Circle: MapView.Circle,
    Callout: MapView.Callout,
    PROVIDER_GOOGLE: 'google',
    MarkerAnimated: View,
    AnimatedRegion: jest.fn()
  }
})

jest.mock('react-native-map-link', () => ({
  showLocation: jest.fn(),
  // The maps apps of the device, each with the function that opens the route in it.
  getApps: jest.fn(() => Promise.resolve([
    { id: 'google-maps', name: 'Google Maps', icon: 1, open: jest.fn(() => Promise.resolve()) },
    { id: 'waze', name: 'Waze', icon: 2, open: jest.fn(() => Promise.resolve()) }
  ]))
}))
