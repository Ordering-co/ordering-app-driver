import '../../../../../../jest/helpers/uiModuleMocks'
import React from 'react'
import { Linking, PixelRatio, Platform, StyleSheet } from 'react-native'
import { act, fireEvent, waitFor } from '@testing-library/react-native'
import { useFocusEffect } from '@react-navigation/native'
import { getApps } from 'react-native-map-link'

jest.mock('@ui', () => {
  const { pickUi } = require('../../../../../../jest/helpers/uiModuleMocks')
  const { buildD3OrdersIntegrationUiMock } = require('../../../../../../jest/helpers/d3OrdersUiMock')
  return pickUi(buildD3OrdersIntegrationUiMock(), ['useOfflineActions', 'useLocation'])
})
jest.mock('@components', () => require('../../../../../../jest/helpers/d3OrdersComponentsMock').getMock())
jest.mock('../../../../../context/PermissionsContext', () => require('../../../../../../jest/helpers/mockPermissionsContext'))
jest.mock('react-native-map-link', () => ({
  getApps: jest.fn(() => Promise.resolve([{ id: 'google-maps' }, { id: 'waze' }, { id: 'apple-maps' }]))
}))

// The map library: every prop is on the view, and the map's own calls are recorded.
// What the map really shows (`getMapBoundaries`): a test says it, a report's payload is not the truth.
const mockShown: { box: any, pending: Array<(box: any) => void> | null } = { box: null, pending: null }
const mockMap = {
  fitToCoordinates: jest.fn(),
  animateToRegion: jest.fn(),
  getMapBoundaries: jest.fn(() => mockShown.pending
    ? new Promise((resolve) => { mockShown.pending!.push(resolve) })
    : Promise.resolve(mockShown.box))
}
jest.mock('react-native-maps', () => {
  const React = require('react')
  const { View } = require('react-native')
  const MapView = React.forwardRef((props: any, ref: any) => {
    React.useImperativeHandle(ref, () => mockMap)
    React.useEffect(() => { props.onMapReady?.() }, []) // eslint-disable-line react-hooks/exhaustive-deps
    return React.createElement(View, { testID: 'route-map-view', ...props })
  })
  const Marker = (props: any) => React.createElement(View, { testID: 'map-marker', ...props })
  const Polyline = (props: any) => React.createElement(View, { testID: 'route-line', ...props })
  return { __esModule: true, default: MapView, Marker, Polyline, PROVIDER_GOOGLE: 'google' }
})

import { OrdersRoute } from '../OrdersRoute'
import { clearRouteSource, publishRouteSource } from '../routeSource'
import { useConfig, useUtils } from '@components'
import { offlineActionsState } from '../../../../../../jest/helpers/d3OrdersUiMock'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { holdPress } from '../../../../../../jest/helpers/holdPress'
import { buildAppTheme, defaultAppTheme, THEME_PRODUCT_TYPE } from '../../../../../theme/engine'
import { order, STORE_B } from './fixtures'
import dayjs from '@/utils/dayjs'

const { useLocation } = require('@ui')
const flat = (node: any) => StyleSheet.flatten(node.props.style)
const themeWith = (values: any) => buildAppTheme({ version: 2, product_type: THEME_PRODUCT_TYPE, values })
const theme: any = defaultAppTheme()
const marker = theme.native.components.map_marker.base

const driverAt = (latitude: number, longitude: number) => ({
  userLocation: { latitude, longitude, timestamp: 1 },
  getCurrentLocation: jest.fn().mockResolvedValue({ latitude, longitude }),
  followUserLocation: jest.fn(),
  stopFollowUserLocation: jest.fn()
})
const configs = (extra: Record<string, any> = {}) =>
  (useConfig as jest.Mock).mockReturnValue([{ loading: false, configs: { distance_unit: { value: 'km' }, allow_driver_reject_order: { value: '1' }, ...extra } }])

const boxOf = (region: any) => ({
  northEast: { latitude: region.latitude + region.latitudeDelta / 2, longitude: region.longitude + region.longitudeDelta / 2 },
  southWest: { latitude: region.latitude - region.latitudeDelta / 2, longitude: region.longitude - region.longitudeDelta / 2 }
})
/** The driver moves the map: he touches it, the map then shows `region`, and reports it (a gesture's report). */
const moveByHand = async (view: any, region: any, details: any = { isGesture: true }) => {
  fireEvent(view, 'touchStart')
  mockShown.box = boxOf(region)
  await act(async () => { view.props.onRegionChangeComplete(region, details) })
}

const navigation = () => ({ navigate: jest.fn(), goBack: jest.fn(), canGoBack: jest.fn(() => true) })

/** Three orders: 1042 and 1044 to pick up at Luna Pizza (positions 2, 3), 1039 already picked up at Corner Deli (position 1). */
const orders = () => [
  order(1039, { status: 9, delivery_position: 1, business_id: 8, business: STORE_B, paymethod: { gateway: 'card', name: 'Card' }, payment_events: [{ event: 'payment', paymethod: { gateway: 'card' } }], customer: { name: 'Marco', lastname: 'Prieto', address: '9 Birch Rd, Unit 2', location: { lat: 40.7, lng: -74.0 } } }),
  order(1042, { delivery_position: 2 }),
  order(1044, { delivery_position: 3 })
]

const show = (rows: any[], { changeOrderStatus = jest.fn(), nav = navigation(), themeOverrides }: any = {}) => {
  publishRouteSource({ rows, changeOrderStatus })
  const screen = renderWithProviders(<OrdersRoute navigation={nav} />, themeOverrides ? { themeOverrides } : undefined)
  return { ...screen, nav, changeOrderStatus }
}

describe('OrdersRoute: the route on the map', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockShown.box = null
    mockShown.pending = null
    act(() => clearRouteSource())
    offlineActionsState.isNetConnected = true
    offlineActionsState.canSaveChangesOffline = false
    ;(useLocation as jest.Mock).mockReturnValue(driverAt(40.6, -74.0))
    ;(useUtils as jest.Mock).mockReturnValue([{
      parsePrice: (value: number) => `$${Number(value).toFixed(2)}`,
      parseDate: (value: string, { outputFormat }: any = {}) => outputFormat ? dayjs(value).format(outputFormat) : value,
      timeFormat: 'HH:mm',
      dateFormat: 'MM/DD/YYYY'
    }, {}])
    configs()
    jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(true)
    jest.spyOn(Linking, 'openURL').mockResolvedValue(true as any)
  })
  afterEach(() => { act(() => clearRouteSource()) })

  describe('the map', () => {
    it('draws a numbered disc for each stop, in the route\'s order, the next one strong and above the others, and a spoken label on each', () => {
      const screen = show(orders())
      const markers = screen.getAllByTestId('map-marker').filter((node) => node.props.accessibilityLabel?.startsWith('Stop'))
      const labels = markers.map((node) => node.props.accessibilityLabel)
      expect(labels).toHaveLength(4)
      expect(labels[0]).toMatch(/^Stop 1 of 4, Deliver to 9 Birch Rd, Unit 2, order 1039, \d+\.\d\d km$/)
      expect(labels[1]).toMatch(/^Stop 2 of 4, Pick up at Luna Pizza, orders 1042, 1044, \d+\.\d\d km$/)
      expect(labels[2]).toMatch(/^Stop 3 of 4, Deliver to 1042 Pine Ct, order 1042, \d+\.\d\d km$/)
      expect(labels[3]).toMatch(/^Stop 4 of 4, Deliver to 1044 Pine Ct, order 1044, \d+\.\d\d km$/)
      expect(markers.map((node) => node.props.zIndex)).toEqual([3, 2, 2, 2])
      expect(screen.getAllByTestId('route-marker-disc').map((node) => flat(node).width)).toEqual([marker.stop_next_size, marker.stop_size, marker.stop_size, marker.stop_size])
      expect(screen.getAllByTestId('route-marker-disc').map((node) => node.findByType('Text' as any).props.children)).toEqual(['1', '2', '3', '4'])
    })

    it('puts the driver\'s own disc under the stops, with its label', () => {
      const screen = show(orders())
      const me = screen.getAllByTestId('map-marker').find((node) => node.props.accessibilityLabel === 'Your Location')
      expect(me).toBeTruthy()
      expect(me!.props.zIndex).toBeLessThan(2)
    })

    it('draws a dashed straight line between consecutive stops and the driver\'s to the next stop, stronger (wider and in the stronger tone of the line\'s role)', () => {
      const screen = show(orders())
      const lines = screen.getAllByTestId('route-line')
      expect(lines).toHaveLength(4)
      expect(lines.map((node) => node.props.strokeWidth)).toEqual([marker.line_next_width, marker.line_width, marker.line_width, marker.line_width])
      expect(marker.line_next_width).toBeGreaterThan(marker.line_width)
      // The leg to the next stop wears its own tone (the stronger one of the brand), the others the line's.
      expect(lines.map((node) => node.props.strokeColor)).toEqual([marker.line_next_color, marker.line_color, marker.line_color, marker.line_color])
      expect(marker.line_next_color).toBe(theme.native.tokens.color.primary_pressed)
      expect(marker.line_next_color).not.toBe(marker.line_color)
      for (const line of lines) {
        expect(line.props.coordinates).toHaveLength(2)
        // The library fills in a round cap when none is given, and on Android a round cap turns every dash into a dot: the app says `butt`.
        expect(line.props.lineCap).toBe('butt')
        expect(line.props.lineDashPattern).toHaveLength(2)
      }
      // The driver's leg starts at the driver.
      expect(lines[0].props.coordinates[0]).toEqual({ latitude: 40.6, longitude: -74.0 })
    })

    it('Android: the dash is the theme\'s points times the pixel ratio (the library reads pixels), whatever the zoom, flat ended and longer than the line is wide', () => {
      const os = Platform.OS
      const ratio = jest.spyOn(PixelRatio, 'get').mockReturnValue(2.625)
      Platform.OS = 'android'
      try {
        const screen = show(orders())
        act(() => { screen.getByTestId('route-map-view').props.onRegionChangeComplete({ latitude: 40.7, longitude: -74, latitudeDelta: 0.2, longitudeDelta: 0.1 }) })
        for (const line of screen.getAllByTestId('route-line')) {
          expect(line.props.lineDashPattern).toEqual([marker.line_dash * 2.625, marker.line_gap * 2.625])
          expect(line.props.lineCap).toBe('butt')
        }
        // The dash is a length in points, as on iOS: it is longer than the widest line in points.
        expect(marker.line_dash).toBeGreaterThanOrEqual(marker.line_width * 2)
        expect(marker.line_dash).toBeGreaterThanOrEqual(marker.line_next_width * 2)
      } finally {
        Platform.OS = os
        ratio.mockRestore()
      }
    })

    it('Android: a density of 1 leaves the theme\'s points as they are, and a denser screen lengthens the pattern in pixels, never the one in points', () => {
      const os = Platform.OS
      Platform.OS = 'android'
      try {
        for (const density of [1, 2, 3.5]) {
          const ratio = jest.spyOn(PixelRatio, 'get').mockReturnValue(density)
          const screen = show(orders())
          expect(screen.getAllByTestId('route-line')[0].props.lineDashPattern).toEqual([marker.line_dash * density, marker.line_gap * density])
          screen.unmount()
          ratio.mockRestore()
        }
      } finally {
        Platform.OS = os
      }
    })

    it('iOS: the pattern is the meters path, not scaled by the pixel ratio, and flat ended too', () => {
      const ratio = jest.spyOn(PixelRatio, 'get').mockReturnValue(3)
      try {
        const screen = show(orders())
        const [dash, gap] = screen.getAllByTestId('route-line')[0].props.lineDashPattern
        // Meters of the fit's zoom (the scale is set as soon as the map is fitted): the same with a density of 1 or 3.
        ratio.mockReturnValue(1)
        const other = show(orders())
        expect(other.getAllByTestId('route-line')[0].props.lineDashPattern).toEqual([dash, gap])
        expect(dash / gap).toBeCloseTo(marker.line_dash / marker.line_gap, 5)
        expect(screen.getAllByTestId('route-line')[0].props.lineCap).toBe('butt')
      } finally {
        ratio.mockRestore()
      }
    })

    it('iOS: the dash is in meters, the theme\'s points at the zoom the map shows, so it keeps its length on the screen as the map zooms', async () => {
      const screen = show(orders())
      const height = require('react-native').Dimensions.get('window').height
      const meters = (latitudeDelta: number) => (latitudeDelta * 111320) / height
      const dashOf = () => screen.getAllByTestId('route-line')[0].props.lineDashPattern
      // A route fitted on a phone (about 0.1 degrees of latitude over the map) and the same route zoomed in four times.
      await moveByHand(screen.getByTestId('route-map-view'), { latitude: 40.7, longitude: -74, latitudeDelta: 0.1, longitudeDelta: 0.05 })
      const [far, farGap] = dashOf()
      expect(far).toBeCloseTo(marker.line_dash * meters(0.1), -1)
      expect(far / farGap).toBeCloseTo(marker.line_dash / marker.line_gap, 5)
      // A dash of 12 points on that map is far longer than the 2 m the old default drew (a tick of a fraction of a pixel).
      expect(far).toBeGreaterThan(50)
      await moveByHand(screen.getByTestId('route-map-view'), { latitude: 40.7, longitude: -74, latitudeDelta: 0.025, longitudeDelta: 0.0125 })
      expect(dashOf()[0]).toBeCloseTo(far / 4, -1)
    })

    it('iOS: a small move of the zoom does not draw the lines again', async () => {
      const screen = show(orders())
      const view = () => screen.getByTestId('route-map-view')
      await moveByHand(view(), { latitude: 40.7, longitude: -74, latitudeDelta: 0.1, longitudeDelta: 0.05 })
      const first = screen.getAllByTestId('route-line')[0].props.lineDashPattern
      await moveByHand(view(), { latitude: 40.71, longitude: -74.01, latitudeDelta: 0.101, longitudeDelta: 0.05 })
      expect(screen.getAllByTestId('route-line')[0].props.lineDashPattern).toBe(first)
    })

    describe('iOS: the dash\'s scale is known as soon as the map is fitted, not when the map reports', () => {
      const WINDOW_HEIGHT = require('react-native').Dimensions.get('window').height
      const EDGE = theme.native.tokens.space.xxl
      const dashOf = (screen: any) => screen.getAllByTestId('route-line')[0].props.lineDashPattern[0] as number
      const laid = (screen: any, width: number, height: number) =>
        act(() => { fireEvent(screen.getByTestId('route-map-frame'), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width, height } } }) })
      /** The dash in meters of a map that shows `latitudeDelta` degrees over `height` points. */
      const dashFor = (latitudeDelta: number, height: number) => marker.line_dash * (latitudeDelta * 111320) / height
      /** The latitude span of what the fit was asked to frame. */
      const framedLatitudeSpan = () => {
        const latitudes = mockMap.fitToCoordinates.mock.calls.at(-1)[0].map((point: any) => point.latitude)
        return Math.max(...latitudes) - Math.min(...latitudes)
      }
      const near = (value: number, expected: number) => expect(Math.abs(value / expected - 1)).toBeLessThan(0.12)

      it('has the scale of the fit right after it, with no region report from the map', () => {
        const screen = show(orders())
        expect(mockMap.fitToCoordinates).toHaveBeenCalledTimes(1)
        // The latitude span of the frame over the map's height less its two edges (the limiting side of a tall phone), not the first region.
        near(dashOf(screen), dashFor(framedLatitudeSpan() * WINDOW_HEIGHT / (WINDOW_HEIGHT - 2 * EDGE), WINDOW_HEIGHT))
        expect(dashOf(screen)).toBeGreaterThan(dashFor(0.01, WINDOW_HEIGHT) * 5)
      })

      it('has it again after the fit button, when the map did not report in between', async () => {
        const screen = show(orders())
        await moveByHand(screen.getByTestId('route-map-view'), { latitude: 40.7, longitude: -74, latitudeDelta: 0.002, longitudeDelta: 0.001 })
        near(dashOf(screen), dashFor(0.002, WINDOW_HEIGHT))
        fireEvent.press(screen.getByLabelText('Fit the route'))
        near(dashOf(screen), dashFor(framedLatitudeSpan() * WINDOW_HEIGHT / (WINDOW_HEIGHT - 2 * EDGE), WINDOW_HEIGHT))
      })

      it('is worked out again for the map\'s own height when the layout arrives after the fit', () => {
        const screen = show(orders())
        const before = dashOf(screen)
        laid(screen, 400, 667)
        // The fit puts the same latitude span on a shorter map: more ground per point.
        expect(mockMap.fitToCoordinates).toHaveBeenCalledTimes(2)
        near(dashOf(screen), dashFor(framedLatitudeSpan() * 667 / (667 - 2 * EDGE), 667))
        expect(dashOf(screen)).toBeGreaterThan(before)
      })

      it('reads a report that came before the map\'s height was known against the height it has now', async () => {
        const screen = show(orders())
        fireEvent(screen.getByTestId('route-map-view'), 'touchStart')
        await moveByHand(screen.getByTestId('route-map-view'), { latitude: 40.7, longitude: -74, latitudeDelta: 0.1, longitudeDelta: 0.05 })
        near(dashOf(screen), dashFor(0.1, WINDOW_HEIGHT))
        laid(screen, 400, 667)
        near(dashOf(screen), dashFor(0.1, 667))
        // The driver had moved the map: no new fit.
        expect(mockMap.fitToCoordinates).toHaveBeenCalledTimes(1)
        // A resize after the height is known keeps the ground per point (the zoom did not change).
        laid(screen, 400, 500)
        near(dashOf(screen), dashFor(0.1, 667))
      })

      it('takes the width as the limit when the route runs east to west', () => {
        ;(useLocation as jest.Mock).mockReturnValue(driverAt(40.73, -74.4))
        const screen = show([order(1, { status: 9, delivery_position: 1, customer: { name: 'Ana', address: '1 Pine Ct', location: { lat: 40.72, lng: -74.0 } } })])
        laid(screen, 400, 800)
        // 0.4 degrees of longitude in 400 - 80 points: at this latitude the map shows 0.4 * cos(40.7) * 800 / 320 degrees of latitude.
        const expectedDelta = 0.4 * Math.cos(40.725 * Math.PI / 180) * 800 / (400 - 2 * EDGE)
        near(dashOf(screen), dashFor(expectedDelta, 800))
        // Reading only the latitude (0.01 degrees over the tall side) would have been about forty times shorter.
        expect(dashOf(screen)).toBeGreaterThan(dashFor(0.011, 800) * 20)
      })

      it('frames one stop as a single-point region, with no box to fit', () => {
        ;(useLocation as jest.Mock).mockReturnValue(driverAt(0, 0))
        show([order(1, { status: 9, delivery_position: 1 })])
        expect(mockMap.fitToCoordinates).not.toHaveBeenCalled()
        expect(mockMap.animateToRegion).toHaveBeenCalledWith(expect.objectContaining({ latitudeDelta: 0.01 }), expect.any(Number))
      })

      it('has a sane scale when the driver stands at the only stop (one place, a leg of no length)', () => {
        ;(useLocation as jest.Mock).mockReturnValue(driverAt(40.72001, -74.01))
        const screen = show([order(1, { status: 9, delivery_position: 1 })])
        expect(mockMap.fitToCoordinates).not.toHaveBeenCalled()
        near(dashOf(screen), dashFor(0.01, WINDOW_HEIGHT))
      })

      it('has the same for stops at the same place, which are one place and not a box of no size', () => {
        ;(useLocation as jest.Mock).mockReturnValue(driverAt(40.72, -74.01))
        const where = { name: 'Ana', address: '1 Pine Ct', location: { lat: 40.72, lng: -74.01 } }
        const screen = show([order(1, { status: 9, delivery_position: 1, customer: where }), order(2, { status: 9, delivery_position: 2, customer: where })])
        expect(mockMap.fitToCoordinates).not.toHaveBeenCalled()
        expect(mockMap.animateToRegion).toHaveBeenCalledWith(expect.objectContaining({ latitudeDelta: 0.01 }), expect.any(Number))
        near(dashOf(screen), dashFor(0.01, WINDOW_HEIGHT))
      })

      it('lets the map\'s own report correct it afterwards, when the driver zooms or pans', async () => {
        const screen = show(orders())
        await moveByHand(screen.getByTestId('route-map-view'), { latitude: 40.7, longitude: -74, latitudeDelta: 0.025, longitudeDelta: 0.0125 })
        near(dashOf(screen), dashFor(0.025, WINDOW_HEIGHT))
      })

      it('zooms from the fitted region when the map has not reported one yet', () => {
        const screen = show(orders())
        fireEvent.press(screen.getByLabelText('Zoom in'))
        expect(mockMap.animateToRegion).toHaveBeenCalledWith(expect.objectContaining({ latitude: expect.any(Number), latitudeDelta: expect.any(Number) }))
        const region = mockMap.animateToRegion.mock.calls.at(-1)[0]
        near(region.latitudeDelta, framedLatitudeSpan() * WINDOW_HEIGHT / (WINDOW_HEIGHT - 2 * EDGE) / 2)
      })

      describe('a late or stale report from the map never leaves a wrong scale', () => {
        const view = (screen: any) => screen.getByTestId('route-map-view')
        const settled = () => act(async () => { jest.advanceTimersByTime(1300) })
        const INITIAL = { latitude: 40.7, longitude: -74, latitudeDelta: 0.01, longitudeDelta: 0.005 }
        /** The latitude delta the fit gives, and the map showing it. */
        const mapShowsTheFit = () => {
          const delta = framedLatitudeSpan() * WINDOW_HEIGHT / (WINDOW_HEIGHT - 2 * EDGE)
          mockShown.box = boxOf({ latitude: 40.67, longitude: -74, latitudeDelta: delta, longitudeDelta: delta / 2 })
          return delta
        }
        beforeEach(() => { jest.useFakeTimers() })
        afterEach(() => { jest.useRealTimers() })

        it('does not undo the fit\'s scale when the report of the initial region arrives after it', async () => {
          const screen = show(orders())
          const delta = mapShowsTheFit()
          const fitted = dashOf(screen)
          await act(async () => { view(screen).props.onRegionChangeComplete(INITIAL, { isGesture: false }) })
          expect(dashOf(screen)).toBe(fitted)
          // The map is on its way (the fit is in flight): nothing is read from it meanwhile.
          expect(mockMap.getMapBoundaries).not.toHaveBeenCalled()
          await settled()
          expect(mockMap.getMapBoundaries).toHaveBeenCalledTimes(1)
          near(dashOf(screen), dashFor(delta, WINDOW_HEIGHT))
        })

        it('does not trust a stale report with the gesture flag either: the map is read, and it says what it shows', async () => {
          // react-native-maps keeps the flag of the last move of ANY map, so the initial report of this one can carry `isGesture: true`.
          const screen = show(orders())
          const delta = mapShowsTheFit()
          await settled()
          await act(async () => { view(screen).props.onRegionChangeComplete(INITIAL, { isGesture: true }) })
          near(dashOf(screen), dashFor(delta, WINDOW_HEIGHT))
        })

        it('corrects a report that describes a region the map no longer shows: the read says what it shows now', async () => {
          const screen = show(orders())
          mapShowsTheFit()
          await settled()
          // The map shows 0.025, a report that arrives late says 0.2.
          mockShown.box = boxOf({ latitude: 40.7, longitude: -74, latitudeDelta: 0.025, longitudeDelta: 0.0125 })
          await act(async () => { view(screen).props.onRegionChangeComplete({ ...INITIAL, latitudeDelta: 0.2, longitudeDelta: 0.1 }, { isGesture: false }) })
          near(dashOf(screen), dashFor(0.025, WINDOW_HEIGHT))
        })

        it('confirms the fit with one read when its animation is over, and takes the map\'s answer over the computed value, with no report at all', async () => {
          const screen = show(orders())
          const computed = dashOf(screen)
          mockShown.box = boxOf({ latitude: 40.7, longitude: -74, latitudeDelta: 0.5, longitudeDelta: 0.25 })
          await act(async () => { jest.advanceTimersByTime(1000) })
          expect(mockMap.getMapBoundaries).not.toHaveBeenCalled()
          await settled()
          expect(mockMap.getMapBoundaries).toHaveBeenCalledTimes(1)
          near(dashOf(screen), dashFor(0.5, WINDOW_HEIGHT))
          expect(dashOf(screen)).toBeGreaterThan(computed * 2)
          // One read, not a poll.
          await act(async () => { jest.advanceTimersByTime(20000) })
          expect(mockMap.getMapBoundaries).toHaveBeenCalledTimes(1)
        })

        it('waits less when the fit is not animated (the system reduces motion)', async () => {
          show(orders(), { themeOverrides: { meta: { ...theme.meta, reduceMotion: true } } })
          mockShown.box = boxOf({ latitude: 40.7, longitude: -74, latitudeDelta: 0.5, longitudeDelta: 0.25 })
          await act(async () => { jest.advanceTimersByTime(300) })
          expect(mockMap.getMapBoundaries).toHaveBeenCalledTimes(1)
        })

        it('ignores an answer that comes back after a newer fit', async () => {
          const screen = show(orders())
          const delta = mapShowsTheFit()
          mockShown.pending = []
          await settled()
          expect(mockShown.pending).toHaveLength(1)
          // The Fit button: a newer move, while the first read is still out.
          fireEvent.press(screen.getByLabelText('Fit the route'))
          await act(async () => { mockShown.pending![0](boxOf({ latitude: 40.7, longitude: -74, latitudeDelta: 0.5, longitudeDelta: 0.25 })) })
          near(dashOf(screen), dashFor(delta, WINDOW_HEIGHT))
        })

        it('ignores an answer that comes back after a newer read', async () => {
          const screen = show(orders())
          mapShowsTheFit()
          mockShown.pending = []
          await settled()
          await moveByHand(view(screen), { latitude: 40.7, longitude: -74, latitudeDelta: 0.025, longitudeDelta: 0.0125 })
          expect(mockShown.pending).toHaveLength(2)
          // The newer read answers first, the older one (a region the map left) after it.
          await act(async () => { mockShown.pending![1](boxOf({ latitude: 40.7, longitude: -74, latitudeDelta: 0.025, longitudeDelta: 0.0125 })) })
          await act(async () => { mockShown.pending![0](boxOf({ latitude: 40.7, longitude: -74, latitudeDelta: 0.5, longitudeDelta: 0.25 })) })
          near(dashOf(screen), dashFor(0.025, WINDOW_HEIGHT))
        })

        it('ignores an answer that comes back after the screen is gone, and reads nothing if it goes before the confirmation', async () => {
          const errors = jest.spyOn(console, 'error').mockImplementation(() => {})
          const gone = show(orders())
          await act(async () => { jest.advanceTimersByTime(500) })
          gone.unmount()
          await settled()
          expect(mockMap.getMapBoundaries).not.toHaveBeenCalled()
          const late = show(orders())
          mockShown.pending = []
          await settled()
          expect(mockShown.pending).toHaveLength(1)
          late.unmount()
          await act(async () => { mockShown.pending![0](boxOf({ latitude: 40.7, longitude: -74, latitudeDelta: 0.5, longitudeDelta: 0.25 })) })
          expect(errors).not.toHaveBeenCalled()
          errors.mockRestore()
        })

        it('starts clean on a quick back and reopen: the first screen\'s pending read does not reach the second', async () => {
          const first = show(orders())
          await act(async () => { jest.advanceTimersByTime(400) })
          first.unmount()
          act(() => clearRouteSource())
          const second = show(orders())
          const delta = mapShowsTheFit()
          const fitted = dashOf(second)
          near(fitted, dashFor(delta, WINDOW_HEIGHT))
          // 400 ms of the first one's wait have passed: its timer is gone, the second's own runs a full wait.
          await act(async () => { jest.advanceTimersByTime(900) })
          expect(mockMap.getMapBoundaries).not.toHaveBeenCalled()
          await act(async () => { jest.advanceTimersByTime(400) })
          expect(mockMap.getMapBoundaries).toHaveBeenCalledTimes(1)
          near(dashOf(second), dashFor(delta, WINDOW_HEIGHT))
        })

        it('still follows the driver\'s own gestures, and the zoom buttons at once', async () => {
          const screen = show(orders())
          const delta = mapShowsTheFit()
          await settled()
          await moveByHand(view(screen), { latitude: 40.7, longitude: -74, latitudeDelta: 0.025, longitudeDelta: 0.0125 })
          near(dashOf(screen), dashFor(0.025, WINDOW_HEIGHT))
          // A zoom in is half the region the map shows: the pattern is half as long in meters before any read.
          const before = dashOf(screen)
          fireEvent.press(screen.getByLabelText('Zoom in'))
          expect(dashOf(screen)).toBeCloseTo(before / 2, 6)
          fireEvent.press(screen.getByLabelText('Zoom out'))
          fireEvent.press(screen.getByLabelText('Zoom out'))
          expect(dashOf(screen)).toBeCloseTo(before * 2, 6)
          expect(delta).toBeGreaterThan(0)
        })

        it('uses a gesture\'s own report only when the map cannot be read', async () => {
          const screen = show(orders())
          mapShowsTheFit()
          await settled()
          const before = dashOf(screen)
          mockMap.getMapBoundaries.mockRejectedValueOnce('no map')
          await act(async () => { view(screen).props.onRegionChangeComplete({ ...INITIAL, latitudeDelta: 0.025, longitudeDelta: 0.0125 }, { isGesture: false }) })
          expect(dashOf(screen)).toBe(before)
          mockMap.getMapBoundaries.mockRejectedValueOnce('no map')
          await act(async () => { view(screen).props.onRegionChangeComplete({ ...INITIAL, latitudeDelta: 0.025, longitudeDelta: 0.0125 }, { isGesture: true }) })
          near(dashOf(screen), dashFor(0.025, WINDOW_HEIGHT))
        })

        it('Android keeps its pixels (the theme\'s points times the pixel ratio) and takes its reports as before, with no read and no wait', async () => {
          const os = Platform.OS
          Platform.OS = 'android'
          try {
            const screen = show(orders())
            await act(async () => { jest.advanceTimersByTime(5000) })
            await act(async () => { view(screen).props.onRegionChangeComplete({ ...INITIAL, latitudeDelta: 0.2, longitudeDelta: 0.1 }, { isGesture: false }) })
            expect(mockMap.getMapBoundaries).not.toHaveBeenCalled()
            const ratio = PixelRatio.get()
            for (const line of screen.getAllByTestId('route-line')) expect(line.props.lineDashPattern).toEqual([marker.line_dash * ratio, marker.line_gap * ratio])
          } finally {
            Platform.OS = os
          }
        })
      })
    })

    it('draws no line from the driver, and no disc for him, while his position is not known', () => {
      ;(useLocation as jest.Mock).mockReturnValue(driverAt(0, 0))
      const screen = show(orders())
      expect(screen.getAllByTestId('route-line')).toHaveLength(3)
      expect(screen.getAllByTestId('map-marker').some((node) => node.props.accessibilityLabel === 'Your Location')).toBe(false)
      expect(screen.queryByTestId('route-next-distance')).toBeNull()
    })

    it('does not draw a stop with no location, and says so in the list', () => {
      const screen = show([order(1, { delivery_position: 1, customer: { name: 'Ana', address: '9 Birch', location: null } }), order(2, { status: 9, delivery_position: 2 })])
      const labels = screen.getAllByTestId('map-marker').map((node) => node.props.accessibilityLabel)
      expect(labels.some((label) => label?.startsWith('Stop 2 of 3'))).toBe(false)
      expect(labels.filter((label) => label?.startsWith('Stop'))).toHaveLength(2)
    })

    it('fits every stop and the driver when the map is ready, and again for the fit button', () => {
      const screen = show(orders())
      expect(mockMap.fitToCoordinates).toHaveBeenCalledTimes(1)
      const [points, options] = mockMap.fitToCoordinates.mock.calls[0]
      expect(points).toHaveLength(5)
      expect(points[4]).toEqual({ latitude: 40.6, longitude: -74.0 })
      expect(options.animated).toBe(true)
      expect(options.edgePadding.top).toBe(theme.native.tokens.space.xxl)
      fireEvent.press(screen.getByLabelText('Fit the route'))
      expect(mockMap.fitToCoordinates).toHaveBeenCalledTimes(2)
    })

    it('fits again when the driver\'s first position arrives, but not when he moves, and not after he moved the map', () => {
      ;(useLocation as jest.Mock).mockReturnValue(driverAt(0, 0))
      const screen = show(orders())
      expect(mockMap.fitToCoordinates).toHaveBeenCalledTimes(1)
      expect(mockMap.fitToCoordinates.mock.calls[0][0]).toHaveLength(4)
      ;(useLocation as jest.Mock).mockReturnValue(driverAt(40.6, -74.0))
      screen.rerender(<OrdersRoute navigation={screen.nav} />)
      expect(mockMap.fitToCoordinates).toHaveBeenCalledTimes(2)
      ;(useLocation as jest.Mock).mockReturnValue(driverAt(40.61, -74.0))
      screen.rerender(<OrdersRoute navigation={screen.nav} />)
      expect(mockMap.fitToCoordinates).toHaveBeenCalledTimes(2)
      fireEvent(screen.getByTestId('route-map-view'), 'touchStart')
      ;(useLocation as jest.Mock).mockReturnValue(driverAt(0, 0))
      screen.rerender(<OrdersRoute navigation={screen.nav} />)
      expect(mockMap.fitToCoordinates).toHaveBeenCalledTimes(2)
    })

    it('does not animate the camera when the system reduces motion', () => {
      show(orders(), { themeOverrides: { meta: { ...theme.meta, reduceMotion: true } } })
      expect(mockMap.fitToCoordinates.mock.calls[0][1].animated).toBe(false)
    })

    it('centers on the driver with the locate button, at his position', async () => {
      const screen = show(orders())
      await act(async () => { fireEvent.press(screen.getByLabelText('Center on my position')) })
      expect(mockMap.animateToRegion).toHaveBeenCalledWith(expect.objectContaining({ latitude: 40.6, longitude: -74.0 }), expect.any(Number))
    })

    it('follows the driver while the screen is in front, and stops when it is not', () => {
      const location = driverAt(40.6, -74.0)
      ;(useLocation as jest.Mock).mockReturnValue(location)
      show(orders())
      const focus = (useFocusEffect as jest.Mock).mock.calls[0][0]
      const cleanup = focus()
      expect(location.followUserLocation).toHaveBeenCalled()
      cleanup()
      expect(location.stopFollowUserLocation).toHaveBeenCalled()
    })

    it('calls no routing or directions service: the map and the links are all that leave', () => {
      const fetchSpy = jest.spyOn(global as any, 'fetch').mockResolvedValue({ json: async () => ({}) } as any)
      show(orders())
      expect(fetchSpy).not.toHaveBeenCalled()
      fetchSpy.mockRestore()
    })
  })

  describe('the panel of the next stop', () => {
    it('says how many stops and how far in a straight line, with "See all stops"', () => {
      const screen = show(orders())
      expect(screen.getByTestId('route-summary').props.children).toMatch(/^4 stops · about \d+\.\d\d km in a straight line$/)
      fireEvent.press(screen.getByTestId('route-see-all'))
      expect(screen.nav.navigate).toHaveBeenCalledWith('OrdersRouteStops')
    })

    it('has the bar\'s subtitle count the orders, and the back arrow go back', () => {
      const screen = show(orders())
      expect(screen.getByText('3 orders in progress')).toBeTruthy()
      fireEvent.press(screen.getByLabelText('Go back'))
      expect(screen.nav.goBack).toHaveBeenCalled()
    })

    it('lets the next stop\'s title and its line under it take two lines (an address is not cut at a large text size), the distance keeping its place', () => {
      const screen = show(orders())
      expect(screen.getByTestId('route-next-title').props.numberOfLines).toBe(2)
      expect(screen.getByTestId('route-next-meta').props.numberOfLines).toBe(2)
      // The distance is one line, in a column that never shrinks.
      expect(screen.getByTestId('route-next-distance').props.numberOfLines).toBe(1)
      let column: any = screen.getByTestId('route-next-distance').parent
      while (column && flat(column)?.flexShrink === undefined) column = column.parent
      expect(flat(column).flexShrink).toBe(0)
    })

    it('draws the zoom, fit and locate buttons as every map\'s (the theme\'s small icon button): a control\'s height of touch target through its slop', () => {
      const screen = show(orders())
      const control = theme.native.components.button.sizes.md.height
      const small = theme.native.components.button.sizes.sm.height
      for (const label of ['Zoom in', 'Zoom out', 'Fit the route', 'Center on my position']) {
        const button = screen.getByLabelText(label)
        const slop = button.props.hitSlop
        expect(small + 2 * slop).toBeGreaterThanOrEqual(control)
      }
    })

    it('names the next stop: what to do, the order, the customer and how it is paid, and how far it is in a straight line', () => {
      const screen = show(orders())
      expect(screen.getByTestId('route-next-title').props.children).toBe('Deliver to 9 Birch Rd, Unit 2')
      expect(screen.getByTestId('route-next-meta').props.children).toBe('#1039 · Marco Prieto · Paid')
      expect(screen.getByTestId('route-next-distance').props.children).toMatch(/^\d+\.\d\d km$/)
      expect(screen.getByText('straight line')).toBeTruthy()
    })

    it('says "Collect $X in cash" for an order paid in cash', () => {
      const screen = show([order(1042, { status: 9 })])
      expect(screen.getByTestId('route-next-meta').props.children).toBe('#1042 · Ana Gil · Collect $24.50 in cash')
    })

    it('says "Collect in cash" with no amount where the theme hides the order\'s total from the driver', () => {
      const screen = show([order(1042, { status: 9 })], { themeOverrides: themeWith({ visibility: { 'confirmation.order.total': false } }) })
      expect(screen.getByTestId('route-next-meta').props.children).toBe('#1042 · Ana Gil · Collect in cash')
    })

    it('names a store with several orders by its name and its orders', () => {
      const screen = show([order(1042, { delivery_position: 1 }), order(1044, { delivery_position: 2 })])
      expect(screen.getByTestId('route-next-title').props.children).toBe('Pick up at Luna Pizza')
      expect(screen.getByTestId('route-next-meta').props.children).toBe('#1042, #1044')
    })

    it('says "No location" for a next stop that has none', () => {
      const screen = show([order(1, { status: 9, customer: { name: 'Ana', address: '9 Birch', location: null } })])
      expect(screen.getByTestId('route-next-no-location').props.children).toBe('No location')
      expect(screen.queryByText('straight line')).toBeNull()
    })

    it('writes the helper line under the buttons', () => {
      const screen = show(orders())
      expect(screen.getByTestId('route-helper').props.children).toBe('The lines show the order of the stops, not the streets. Navigate opens the real route in your maps app.')
    })

    it('writes the distance with the card\'s unit and formatter (miles when the project says so)', () => {
      configs({ distance_unit: { value: 'mi' } })
      const screen = show([order(1042, { status: 9 })])
      expect(screen.getByTestId('route-next-distance').props.children).toMatch(/^\d+\.\d\d mi$/)
    })

    it('opens the order of the next stop when it is tapped, and reads as one spoken stop', () => {
      const screen = show(orders())
      const next = screen.getByTestId('route-next-stop')
      expect(next.props.accessibilityLabel).toMatch(/^Stop 1 of 4, Deliver to 9 Birch Rd, Unit 2, order 1039, \d+\.\d\d km$/)
      fireEvent.press(next)
      expect(screen.nav.navigate).toHaveBeenCalledWith('OrderDetails', expect.objectContaining({ order: expect.objectContaining({ id: 1039 }) }))
    })

    it('takes the driver to the In Progress list for the stop of several orders', () => {
      const screen = show([order(1042, { delivery_position: 1 }), order(1044, { delivery_position: 2 })])
      fireEvent.press(screen.getByTestId('route-next-stop'))
      expect(screen.nav.navigate).toHaveBeenCalledWith('BottomTab', { screen: 'Orders', params: expect.objectContaining({ show: 'orders', status: 8 }) }, { pop: true })
    })
  })

  describe('the order\'s next step', () => {
    it('is the order card\'s own button: the same label, the order\'s own request, held to confirm', async () => {
      const screen = show([order(1042, { delivery_position: 1 })])
      const step = screen.getByTestId('order-card-1042-arrivedToBusiness')
      expect(screen.getByText('Arrived to business')).toBeTruthy()
      await holdPress(step)
      expect(screen.changeOrderStatus).toHaveBeenCalledWith(3, [1042])
    })

    it('is the step of the stage the order is in: delivery complete at the customer\'s door, and none other', () => {
      const screen = show([order(1042, { status: 26 })])
      expect(screen.getByText('Delivery complete')).toBeTruthy()
      expect(screen.queryByText('Delivery failed')).toBeNull()
      expect(screen.queryByText('Arrived to business')).toBeNull()
    })

    it('is not there for a store\'s stop of several orders: one button could not be each order\'s own step', () => {
      const screen = show([order(1042, { delivery_position: 1 }), order(1044, { delivery_position: 2 })])
      expect(screen.queryByText('Arrived to business')).toBeNull()
      expect(screen.getByTestId('route-navigate')).toBeTruthy()
    })

    it('is not there when the theme hides the cards\' quick actions: Navigate takes the row', () => {
      const screen = show([order(1042, { delivery_position: 1 })], { themeOverrides: themeWith({ visibility: { 'orders.quick_actions': false } }) })
      expect(screen.queryByText('Arrived to business')).toBeNull()
      expect(screen.getByTestId('route-navigate')).toBeTruthy()
    })

    it('goes to the permissions page without the location permission, as the card does', async () => {
      const { mockPermissions } = require('../../../../../../jest/helpers/mockPermissionsContext')
      const granted = mockPermissions.isGrantedPermissions
      mockPermissions.isGrantedPermissions = false
      try {
        const screen = show([order(1042, { delivery_position: 1 })])
        fireEvent.press(screen.getByTestId('order-card-1042-arrivedToBusiness'))
        expect(screen.nav.navigate).toHaveBeenCalledWith('RequestPermissions', undefined)
        expect(screen.changeOrderStatus).not.toHaveBeenCalled()
      } finally {
        mockPermissions.isGrantedPermissions = granted
      }
    })
  })

  describe('Navigate', () => {
    it('opens the maps sheet with a row for the whole route in Google Maps and the next stop in Google Maps, Waze and (iOS) Apple Maps', async () => {
      const screen = show(orders())
      fireEvent.press(screen.getByTestId('route-navigate'))
      expect(screen.getByText('Open in a maps app')).toBeTruthy()
      expect(screen.getByText('The route as it is now: 4 stops, in the order of the delivery positions.')).toBeTruthy()
      expect(screen.getByText('Google Maps · the whole route')).toBeTruthy()
      expect(screen.getByText('All 4 stops, one after another')).toBeTruthy()
      expect(screen.getByText('Google Maps · next stop only')).toBeTruthy()
      expect(screen.getByText('Waze · next stop only')).toBeTruthy()
      expect(screen.getByText('Apple Maps · next stop only')).toBeTruthy()
      expect(screen.getByText('The maps app keeps the route it was given. If an order changes, send the route again.')).toBeTruthy()
      await waitFor(() => expect(getApps).toHaveBeenCalled())
    })

    it('sends the whole route to Google Maps: the driver as the origin, the stops in order, coordinates only', async () => {
      const screen = show(orders())
      fireEvent.press(screen.getByTestId('route-navigate'))
      await act(async () => { fireEvent.press(screen.getByTestId('route-navigate-google_route')) })
      const url = (Linking.openURL as jest.Mock).mock.calls[0][0] as string
      expect(url).toBe(
        'https://www.google.com/maps/dir/?api=1&origin=40.6%2C-74' +
        '&destination=40.73044%2C-74.01' +
        '&waypoints=40.7%2C-74%7C40.7128%2C-74.006%7C40.73042%2C-74.01' +
        '&travelmode=driving'
      )
      expect(url).not.toMatch(/Birch|Harbor|Pine|Ana|Marco|1042/)
    })

    it('leaves the origin out of the whole route while the driver\'s position is not known', async () => {
      ;(useLocation as jest.Mock).mockReturnValue(driverAt(0, 0))
      const screen = show(orders())
      fireEvent.press(screen.getByTestId('route-navigate'))
      await act(async () => { fireEvent.press(screen.getByTestId('route-navigate-google_route')) })
      expect((Linking.openURL as jest.Mock).mock.calls[0][0]).not.toContain('origin')
    })

    it('sends the next stop alone to Waze, Google Maps and Apple Maps', async () => {
      const screen = show(orders())
      for (const key of ['waze_next', 'google_next', 'apple_next']) {
        fireEvent.press(screen.getByTestId('route-navigate'))
        await act(async () => { fireEvent.press(screen.getByTestId(`route-navigate-${key}`)) })
      }
      expect((Linking.openURL as jest.Mock).mock.calls.map((call) => call[0])).toEqual([
        'https://waze.com/ul?ll=40.7,-74&navigate=yes',
        'https://www.google.com/maps/dir/?api=1&destination=40.7%2C-74&travelmode=driving',
        'https://maps.apple.com/?daddr=40.7,-74&dirflg=d'
      ])
    })

    it('offers no Apple Maps on Android', () => {
      const os = Platform.OS
      Platform.OS = 'android'
      try {
        const screen = show(orders())
        fireEvent.press(screen.getByTestId('route-navigate'))
        expect(screen.queryByText('Apple Maps · next stop only')).toBeNull()
        expect(screen.getByText('Waze · next stop only')).toBeTruthy()
      } finally {
        Platform.OS = os
      }
    })

    it('offers Waze only when it is installed (asked as the order\'s map asks), and while it is not known', async () => {
      ;(getApps as jest.Mock).mockResolvedValueOnce([{ id: 'google-maps' }])
      const screen = show(orders())
      fireEvent.press(screen.getByTestId('route-navigate'))
      expect(screen.queryByText('Waze · next stop only')).toBeTruthy()
      await waitFor(() => expect(screen.queryByText('Waze · next stop only')).toBeNull())
      expect(getApps).toHaveBeenCalledWith(expect.objectContaining({ alwaysIncludeGoogle: true, latitude: 40.7, longitude: -74 }))
    })

    it('keeps Waze when the library cannot say what is installed', async () => {
      ;(getApps as jest.Mock).mockRejectedValueOnce(new Error('no'))
      const screen = show(orders())
      fireEvent.press(screen.getByTestId('route-navigate'))
      await act(async () => {})
      expect(screen.getByText('Waze · next stop only')).toBeTruthy()
    })

    it('says it sends the first 10 stops of a longer route', () => {
      const many = Array.from({ length: 12 }, (_, index) => order(2000 + index, { status: 9, delivery_position: index + 1 }))
      const screen = show(many)
      fireEvent.press(screen.getByTestId('route-navigate'))
      expect(screen.getByText('First 10 stops')).toBeTruthy()
      expect(screen.queryByText('All 12 stops, one after another')).toBeNull()
    })

    it('has no row for the whole route of a single stop, and closes with Cancel', () => {
      const screen = show([order(1042, { status: 9 })])
      fireEvent.press(screen.getByTestId('route-navigate'))
      expect(screen.queryByText('Google Maps · the whole route')).toBeNull()
      expect(screen.getByText('Google Maps · next stop only')).toBeTruthy()
      fireEvent.press(screen.getByTestId('route-navigate-cancel'))
      expect(screen.queryByText('Open in a maps app')).toBeNull()
    })

    it('offers no next-stop link for a next stop with no location, and no Navigate when nothing has one', () => {
      const none = { name: 'Ana', address: '9 Birch', location: null }
      const screen = show([order(1, { status: 9, delivery_position: 1, customer: none }), order(2, { status: 9, delivery_position: 2 })])
      fireEvent.press(screen.getByTestId('route-navigate'))
      expect(screen.queryByText('Google Maps · next stop only')).toBeNull()
      screen.unmount()
      const empty = show([order(1, { status: 9, customer: none })])
      fireEvent.press(empty.getByTestId('route-navigate'))
      expect(empty.queryByText('Open in a maps app')).toBeNull()
    })

    it('says so when the phone cannot open the link', async () => {
      ;(Linking.canOpenURL as jest.Mock).mockResolvedValue(false)
      const screen = show(orders())
      fireEvent.press(screen.getByTestId('route-navigate'))
      await act(async () => { fireEvent.press(screen.getByTestId('route-navigate-google_next')) })
      expect(Linking.openURL).not.toHaveBeenCalled()
    })
  })

  describe('no orders in progress', () => {
    it('says so, with no map and no panel, when there are none', () => {
      const screen = show([])
      expect(screen.getByText('No orders in progress')).toBeTruthy()
      expect(screen.queryByTestId('route-map-view')).toBeNull()
      expect(screen.queryByTestId('route-panel')).toBeNull()
    })

    it('says so when the last order is delivered while the screen is open', () => {
      const screen = show([order(1042, { status: 26 })])
      expect(screen.getByTestId('route-panel')).toBeTruthy()
      act(() => publishRouteSource({ rows: [order(1042, { status: 11 })], changeOrderStatus: jest.fn() }))
      expect(screen.getByText('No orders in progress')).toBeTruthy()
      expect(screen.queryByTestId('route-panel')).toBeNull()
    })
  })

  describe('it is the list\'s own orders, in the state the list shows them', () => {
    it('follows the list: an order that moves on, a new position, a new order', () => {
      const screen = show([order(1042, { delivery_position: 1 }), order(1044, { delivery_position: 2 })])
      expect(screen.getByTestId('route-next-title').props.children).toBe('Pick up at Luna Pizza')
      // The list brings 1042 as picked up and a new order first.
      act(() => publishRouteSource({
        rows: [order(1042, { status: 9, delivery_position: 2 }), order(1044, { delivery_position: 3 }), order(1050, { status: 9, delivery_position: 1 })],
        changeOrderStatus: jest.fn()
      }))
      expect(screen.getByTestId('route-next-title').props.children).toBe('Deliver to 1050 Pine Ct')
      expect(screen.getByText('3 orders in progress')).toBeTruthy()
    })

    it('shows the stage the list gives an order (the queue\'s status is on the row the list hands over)', () => {
      const screen = show([order(1042, { status: 8, delivery_position: 1 })])
      expect(screen.getByTestId('route-next-title').props.children).toBe('Pick up at Luna Pizza')
      // The driver queued "pickup complete" offline: the list's row says 9, and the route goes to the customer.
      act(() => publishRouteSource({ rows: [order(1042, { status: 9, delivery_position: 1, unsync: true })], changeOrderStatus: jest.fn() }))
      expect(screen.getByTestId('route-next-title').props.children).toBe('Deliver to 1042 Pine Ct')
    })
  })
})
