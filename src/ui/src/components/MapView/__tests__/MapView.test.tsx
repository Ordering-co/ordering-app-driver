import '../../../../../../jest/helpers/uiModuleMocks'
import React from 'react'
import { StyleSheet } from 'react-native'
import { act, fireEvent, waitFor } from '@testing-library/react-native'

// The map library, with the calls of the map's ref where a test can reach them.
const mockAnimateToRegion = jest.fn()
jest.mock('react-native-maps', () => {
  const React = require('react')
  const { View } = require('react-native')
  const MapView = React.forwardRef((props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({
      animateToRegion: mockAnimateToRegion,
      animateCamera: jest.fn(),
      fitToCoordinates: jest.fn()
    }))
    return React.createElement(View, { testID: 'map-view', ...props })
  })
  const Marker = (props: any) => React.createElement(View, { testID: 'map-marker', ...props })
  const Callout = (props: any) => React.createElement(View, { testID: 'map-callout', ...props })
  return { __esModule: true, default: MapView, Marker, Callout, PROVIDER_GOOGLE: 'google' }
})

jest.mock('@react-navigation/native', () => {
  const React = require('react')
  return {
    // React Navigation 7's packages import each other's internals: the real package stays.
    ...jest.requireActual('@react-navigation/native'),
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

import { useApi } from '@components'
import { MapViewUI } from '..'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { buildAppTheme, THEME_PRODUCT_TYPE } from '../../../../../theme/engine'
import { sampleMapOrder } from '../../../../../../jest/helpers/d4MapDefaults'
import { defaultAppTheme } from '../../../../../theme/engine'
import { themeGutter, themeSpace } from '../../../../../theme/helpers'
import { locationHookState } from '../../../../../../jest/helpers/d4MapUiMock'

const flat = (node: any) => StyleSheet.flatten(node.props.style)
const theme: any = defaultAppTheme()

const themeWith = (values: any) => buildAppTheme({ version: 2, product_type: THEME_PRODUCT_TYPE, values })

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
    // It tells, it does not ask: one button.
    expect(getByTestId('alert-notice')).toBeTruthy()
    fireEvent.press(getByTestId('alert-accept'))
    expect(setAlertState).toHaveBeenCalled()
  })

  it('zooms with the two floating buttons, named for a screen reader', async () => {
    const { getByLabelText } = renderWithProviders(<MapViewUI />)
    await waitFor(() => expect(getByLabelText('Zoom in')).toBeTruthy())
    fireEvent.press(getByLabelText('Zoom in'))
    fireEvent.press(getByLabelText('Zoom out'))
    expect(getByLabelText('Zoom out').props.accessibilityRole).toBe('button')
  })

  it('hides the zoom buttons with visibility map.zoom_controls, and nothing else', async () => {
    const theme = themeWith({ visibility: { 'map.zoom_controls': false } })
    const { getByTestId, queryByLabelText, getAllByTestId } = renderWithProviders(<MapViewUI />, { themeOverrides: theme })
    await waitFor(() => expect(getByTestId('map-view')).toBeTruthy())
    expect(queryByLabelText('Zoom in')).toBeNull()
    expect(queryByLabelText('Zoom out')).toBeNull()
    expect(getAllByTestId('map-marker').length).toBe(3)
  })

  describe('the markers: one disc for a store, a customer and the driver\'s own position', () => {
    const marker = theme.native.components.map_marker.base
    const glyphs = (view: any) => view.getAllByTestId('map-marker-disc').map((disc: any) => disc.findByType('Icon' as any).props.name)

    it('draws a store\'s, a customer\'s and the driver\'s, each with its glyph, in that order', async () => {
      const view = renderWithProviders(<MapViewUI />)
      await waitFor(() => expect(view.getAllByTestId('map-marker')).toHaveLength(3))
      expect(glyphs(view)).toEqual(['storefront-outline', 'person-outline', 'navigate-outline'])
    })

    it('anchors each one at its disc\'s center, on the coordinate of its place', async () => {
      const view = renderWithProviders(<MapViewUI />)
      await waitFor(() => expect(view.getAllByTestId('map-marker')).toHaveLength(3))
      view.getAllByTestId('map-marker').forEach((item: any) => expect(item.props.anchor).toEqual({ x: 0.5, y: 0.5 }))
      expect(view.getAllByTestId('map-marker')[0].props.coordinate).toEqual({ latitude: sampleMapOrder.business.location.lat, longitude: sampleMapOrder.business.location.lng })
    })

    it('gives the tapped one the selected size and ring, above the others, and not the others; tapping another moves it; closing the card gives it back', async () => {
      const view = renderWithProviders(<MapViewUI />)
      await waitFor(() => expect(view.getAllByTestId('map-marker')).toHaveLength(3))
      const disc = (position: number) => flat(view.getAllByTestId('map-marker-disc')[position])
      const zIndex = (position: number) => view.getAllByTestId('map-marker')[position].props.zIndex
      const tap = (position: number) => act(() => { view.getAllByTestId('map-marker')[position].props.onPress() })
      expect([disc(0).width, disc(1).width, disc(2).width]).toEqual([marker.size, marker.size, marker.me_size])

      tap(0)
      expect(disc(0)).toEqual(expect.objectContaining({ width: marker.selected_size, height: marker.selected_size, borderWidth: marker.selected_ring_width }))
      expect(disc(1)).toEqual(expect.objectContaining({ width: marker.size, borderWidth: marker.ring_width }))
      expect(disc(2).width).toBe(marker.me_size)
      expect(zIndex(0)).toBeGreaterThan(zIndex(1))
      expect(zIndex(0)).toBeGreaterThan(zIndex(2))
      // The driver's own disc is under the stops' (a tap where they overlap is the stop's).
      expect(zIndex(2)).toBeLessThan(zIndex(1))

      tap(1)
      expect(disc(0).width).toBe(marker.size)
      expect(disc(1)).toEqual(expect.objectContaining({ width: marker.selected_size, borderWidth: marker.selected_ring_width }))

      fireEvent.press(view.getByLabelText('Close'))
      expect(disc(0).width).toBe(marker.size)
      expect(disc(1).width).toBe(marker.size)
    })

    it('leaves a marker of the other kind alone when the ids of a store and a customer are the same', async () => {
      const view = renderWithProviders(<MapViewUI customerMarkerGroups={{ 1: [{ ...sampleMapOrder, customer_id: 1 }] }} />)
      await waitFor(() => expect(view.getAllByTestId('map-marker')).toHaveLength(3))
      act(() => { view.getAllByTestId('map-marker')[0].props.onPress() })
      const selected = view.getAllByTestId('map-marker-disc').map((disc: any) => flat(disc).width === marker.selected_size)
      expect(selected).toEqual([true, false, false])
    })

    it('has no title for any marker (no library info window): a store and a customer have no label, the driver\'s "Your Location" is its accessibility label, and it takes no press', async () => {
      const view = renderWithProviders(<MapViewUI />)
      await waitFor(() => expect(view.getAllByTestId('map-marker')).toHaveLength(3))
      const [store, customer, me] = view.getAllByTestId('map-marker')
      expect(store.props.title).toBeUndefined()
      expect(customer.props.title).toBeUndefined()
      expect(store.props.accessibilityLabel).toBeUndefined()
      expect(me.props.title).toBeUndefined()
      expect(me.props.accessibilityLabel).toBe('Your Location')
      expect(me.props.onPress).toBeUndefined()
      expect(me.props.tappable).toBe(false)
      expect(store.props.title).toBeUndefined()
    })

    it('does not move the map when a marker is tapped (the library would center on it, the driver\'s own disc included): the screen frames what it opens', async () => {
      const view = renderWithProviders(<MapViewUI />)
      await waitFor(() => expect(view.getAllByTestId('map-marker')).toHaveLength(3))
      expect(view.getByTestId('map-view').props.moveOnMarkerPress).toBe(false)
    })

    it('does not photograph a marker again when another is tapped: the others keep their view as it was', async () => {
      jest.useFakeTimers()
      try {
        const view = renderWithProviders(<MapViewUI />)
        await waitFor(() => expect(view.getAllByTestId('map-marker')).toHaveLength(3))
        act(() => { jest.runOnlyPendingTimers() })
        const tracking = () => view.getAllByTestId('map-marker').map((item: any) => item.props.tracksViewChanges)
        expect(tracking()).toEqual([false, false, false])
        act(() => { view.getAllByTestId('map-marker')[0].props.onPress() })
        expect(tracking()).toEqual([true, false, false])
      } finally {
        jest.useRealTimers()
      }
    })
  })

  describe('an order already picked up has no store disc (a store\'s disc is where to pick up)', () => {
    const picked = { ...sampleMapOrder, id: 102, status: 9, delivery_type: 1 }
    const waiting = { ...sampleMapOrder, id: 101, status: 8, delivery_type: 1 }
    const discs = (view: any) => view.getAllByTestId('map-marker-disc').map((disc: any) => disc.findByType('Icon' as any).props.name)
    const tap = (view: any, position: number) => act(() => { view.getAllByTestId('map-marker')[position].props.onPress() })

    it('lists under "Pick up at" only the orders still to pick up, with the customers\' discs as they were', async () => {
      const view = renderWithProviders(<MapViewUI markerGroups={{ 1: [waiting, picked] }} customerMarkerGroups={{ 2: [waiting, picked] }} />)
      await waitFor(() => expect(view.getAllByTestId('map-marker')).toHaveLength(3))
      tap(view, 0)
      expect(view.getByTestId('map-card-orders')).toHaveTextContent('Pick up at · Order No. 101')
      expect(view.getByTestId('map-card-orders')).not.toHaveTextContent('102')
      // The customer's card still names both orders.
      tap(view, 1)
      expect(view.getByTestId('map-card-orders')).toHaveTextContent('Deliver to · Order Numbers 101, 102')
      expect(view.getByText('Show orders')).toBeTruthy()
    })

    it('shows "Order No." and "More info" for the one order left at the store, not "Order Numbers" and "Show orders"', async () => {
      const view = renderWithProviders(<MapViewUI markerGroups={{ 1: [waiting, picked] }} />)
      await waitFor(() => expect(view.getAllByTestId('map-marker')).toHaveLength(3))
      tap(view, 0)
      expect(view.getByText('More info')).toBeTruthy()
      expect(view.queryByText('Show orders')).toBeNull()
    })

    it('draws no disc for a store whose orders are all picked up (the customer\'s and the driver\'s remain), and counts the orders, not the discs', async () => {
      const view = renderWithProviders(<MapViewUI markerGroups={{ 1: [picked, { ...picked, id: 103 }] }} customerMarkerGroups={{ 2: [picked], 3: [{ ...picked, id: 103, customer_id: 3 }] }} />)
      await waitFor(() => expect(view.getAllByTestId('map-marker')).toHaveLength(3))
      expect(discs(view)).toEqual(['person-outline', 'person-outline', 'navigate-outline'])
      expect(view.getByTestId('map-count')).toHaveTextContent('2 orders on the map')
    })

    it('counts every order of the map once, picked up or not', async () => {
      const view = renderWithProviders(<MapViewUI markerGroups={{ 1: [waiting, picked], 4: [{ ...waiting, id: 104, business_id: 4 }] }} />)
      await waitFor(() => expect(view.getAllByTestId('map-marker')).toHaveLength(4))
      expect(view.getByTestId('map-count')).toHaveTextContent('3 orders on the map')
    })

    it('closes the card of a store disc when its last order is picked up', async () => {
      const view = renderWithProviders(<MapViewUI markerGroups={{ 1: [waiting] }} />)
      await waitFor(() => expect(view.getAllByTestId('map-marker')).toHaveLength(3))
      tap(view, 0)
      expect(view.getByTestId('map-card')).toBeTruthy()
      view.rerender(<MapViewUI markerGroups={{ 1: [{ ...waiting, status: 9 }] }} />)
      expect(view.queryByTestId('map-card')).toBeNull()
      expect(discs(view)).not.toContain('storefront-outline')
    })
  })

  describe('the card of a marker, at the bottom of the map', () => {
    /** The store's marker, then the customer's, then the driver's own position. */
    const tap = (view: any, position: number) => act(() => { view.getAllByTestId('map-marker')[position].props.onPress() })
    const open = async (props: any = {}) => {
      const view = renderWithProviders(<MapViewUI {...props} />)
      await waitFor(() => expect(view.getAllByTestId('map-marker')).toHaveLength(3))
      return view
    }

    it('opens when a store\'s marker is tapped: what it is, the order, the name, the address and what else it knows of the place', async () => {
      const view = await open()
      expect(view.queryByTestId('map-card')).toBeNull()
      tap(view, 0)
      expect(view.getByTestId('map-card-orders')).toHaveTextContent('Pick up at · Order No. 101')
      expect(view.getByTestId('map-card-name')).toHaveTextContent('Store A')
      expect(view.getByTestId('map-card-address')).toHaveTextContent('123 Main St')
      expect(view.getByTestId('map-card-details')).toHaveTextContent('NYC · 10001')
      expect(view.getByText('More info')).toBeTruthy()
    })

    it('says to whom to deliver at a customer\'s marker, with the address notes, the zip code and the internal number', async () => {
      const view = await open()
      tap(view, 1)
      expect(view.getByTestId('map-card-orders')).toHaveTextContent('Deliver to · Order No. 101')
      expect(view.getByTestId('map-card-name')).toHaveTextContent('Jane Doe')
      expect(view.getByTestId('map-card-address')).toHaveTextContent('456 Customer Ave')
      expect(view.getByTestId('map-card-details')).toHaveTextContent('Ring bell · 10002 · 2B')
    })

    it('leaves out the lines the marker has nothing for', async () => {
      const bare = { ...sampleMapOrder, business: { ...sampleMapOrder.business, address: undefined, zipcode: undefined, city: undefined } }
      const view = await open({ markerGroups: { 1: [bare] } })
      tap(view, 0)
      expect(view.queryByTestId('map-card-address')).toBeNull()
      expect(view.queryByTestId('map-card-details')).toBeNull()
    })

    it('is not the map library\'s callout bubble', async () => {
      const view = await open()
      tap(view, 0)
      expect(view.queryAllByTestId('map-callout')).toHaveLength(0)
    })

    it('opens the order with "More info"', async () => {
      const onNavigationRedirect = jest.fn()
      const view = await open({ onNavigationRedirect })
      tap(view, 0)
      fireEvent.press(view.getByText('More info'))
      expect(onNavigationRedirect).toHaveBeenCalledWith('OrderDetails', { order: sampleMapOrder })
    })

    it('closes with its close button', async () => {
      const view = await open()
      tap(view, 0)
      fireEvent.press(view.getByLabelText('Close'))
      expect(view.queryByTestId('map-card')).toBeNull()
    })

    it('changes to the marker tapped next', async () => {
      const view = await open()
      tap(view, 0)
      expect(view.getByTestId('map-card-name')).toHaveTextContent('Store A')
      tap(view, 1)
      expect(view.getAllByTestId('map-card')).toHaveLength(1)
      expect(view.getByTestId('map-card-name')).toHaveTextContent('Jane Doe')
    })

    it('follows its marker\'s orders as they change, and closes when the marker is gone', async () => {
      const view = await open()
      tap(view, 0)
      view.rerender(<MapViewUI markerGroups={{ 1: [sampleMapOrder, { ...sampleMapOrder, id: 102 }] }} />)
      expect(view.getByTestId('map-card-orders')).toHaveTextContent('Pick up at · Order Numbers 101, 102')
      view.rerender(<MapViewUI markerGroups={{}} customerMarkerGroups={{}} />)
      expect(view.queryByTestId('map-card')).toBeNull()
    })

    it('is a card of the theme over the map\'s end, `sm` from its sides (the boards\' 10), with the floating surface\'s shadow', async () => {
      const view = await open()
      tap(view, 0)
      const room = flat(view.getByTestId('map-card-room'))
      expect(room).toEqual(expect.objectContaining({
        position: 'absolute', left: themeSpace(theme, 'sm'), right: themeSpace(theme, 'sm'), bottom: themeSpace(theme, 'sm')
      }))
      const card = flat(view.getByTestId('map-card'))
      expect(card.backgroundColor).toBe(theme.native.components.card.base.background)
      // What floats over the map keeps its own shadow (`map_marker.shadow`), though Identity is flat.
      expect(card.elevation).toBe(theme.native.components.map_marker.base.shadow.elevation)
      expect(card.elevation).toBeGreaterThan(0)
    })

    it('makes room for itself in the map\'s padding, so Google\'s logo is not covered', async () => {
      const view = await open()
      const padding = () => view.getByTestId('map-view').props.mapPadding
      expect(padding().bottom).toBe(0)
      tap(view, 0)
      fireEvent(view.getByTestId('map-card-room'), 'layout', { nativeEvent: { layout: { height: 148.4 } } })
      // The card's height and the room it sits in (`sm` over the tab bar).
      expect(padding()).toEqual({ top: 0, right: 0, left: 0, bottom: themeSpace(theme, 'sm') + 148 })
      fireEvent.press(view.getByLabelText('Close'))
      expect(padding().bottom).toBe(0)
    })

    it('keeps the buttons\' column clear of the markers it frames: once measured, the map pads its end by the gutter, the column\'s width and `sm`', async () => {
      const view = await open()
      const padding = () => view.getByTestId('map-view').props.mapPadding
      expect(padding().right).toBe(0)
      fireEvent(view.getByTestId('map-controls'), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 44, height: 150 } } })
      expect(padding()).toEqual({ top: 0, left: 0, bottom: 0, right: themeGutter(theme) + 44 + themeSpace(theme, 'sm') })
      // The card's room (bottom) and the column's (end) are independent.
      tap(view, 0)
      fireEvent(view.getByTestId('map-card-room'), 'layout', { nativeEvent: { layout: { height: 148 } } })
      expect(padding()).toEqual({ top: 0, left: 0, bottom: themeSpace(theme, 'sm') + 148, right: themeGutter(theme) + 44 + themeSpace(theme, 'sm') })
    })

    describe('the order numbers (decision H2)', () => {
      const many = [sampleMapOrder, { ...sampleMapOrder, id: 123456 }, { ...sampleMapOrder, id: 987654 }]
      afterEach(() => {
        (useApi as jest.Mock).mockReturnValue([{ get: jest.fn(), post: jest.fn() }, {}])
      })

      it('writes one order with the app\'s one label, masked in a secure project', async () => {
        (useApi as jest.Mock).mockReturnValue([{ project: 'luisv4plus' }, {}])
        const single = [{ ...sampleMapOrder, id: 123456 }]
        const view = await open({ markerGroups: { 1: single }, customerMarkerGroups: { 2: single } })
        tap(view, 0)
        expect(view.getByTestId('map-card-orders')).toHaveTextContent('Pick up at · Order No. 12****')
        tap(view, 1)
        expect(view.getByTestId('map-card-orders')).toHaveTextContent('Deliver to · Order No. 12****')
      })

      it('lists the orders of a marker with several, and opens the orders list from it', async () => {
        const onNavigationRedirect = jest.fn()
        const view = await open({ markerGroups: { 1: many }, onNavigationRedirect })
        tap(view, 0)
        expect(view.getByTestId('map-card-orders')).toHaveTextContent('Pick up at · Order Numbers 101, 123456, 987654')
        expect(view.queryByText('More info')).toBeNull()
        fireEvent.press(view.getByText('Show orders'))
        expect(onNavigationRedirect).toHaveBeenCalledWith('Orders')
      })

      it('masks every order of a marker with several the same way', async () => {
        (useApi as jest.Mock).mockReturnValue([{ project: 'luisv4plus' }, {}])
        const view = await open({ markerGroups: { 1: many }, customerMarkerGroups: { 2: many } })
        tap(view, 0)
        expect(view.getByTestId('map-card-orders')).toHaveTextContent('Pick up at · Order Numbers ***, 12****, 98****')
        tap(view, 1)
        expect(view.getByTestId('map-card-orders')).toHaveTextContent('Deliver to · Order Numbers ***, 12****, 98****')
      })
    })
  })

  describe('the count of orders on the map', () => {
    it('says how many orders the map shows, each counted once', async () => {
      const many = [sampleMapOrder, { ...sampleMapOrder, id: 102 }, { ...sampleMapOrder, id: 103, business_id: 5 }]
      const { getByTestId } = renderWithProviders(<MapViewUI markerGroups={{ 1: many.slice(0, 2), 5: [many[2]] }} />)
      await waitFor(() => expect(getByTestId('map-count')).toHaveTextContent('3 orders on the map'))
    })

    it('writes one order in the singular, and none as none', async () => {
      const one = renderWithProviders(<MapViewUI />)
      await waitFor(() => expect(one.getByTestId('map-count')).toHaveTextContent('1 order on the map'))
      const none = renderWithProviders(<MapViewUI markerGroups={{}} customerMarkerGroups={{}} />)
      await waitFor(() => expect(none.getByTestId('map-count')).toHaveTextContent('0 orders on the map'))
    })

    it('says nothing while the orders load: it would be a number the app does not know yet', async () => {
      const { getByTestId, queryByTestId } = renderWithProviders(<MapViewUI isLoadingBusinessMarkers />)
      await waitFor(() => expect(getByTestId('map-view')).toBeTruthy())
      expect(queryByTestId('map-count')).toBeNull()
    })
  })

  describe('the button that centers the map on the driver', () => {
    beforeEach(() => { mockAnimateToRegion.mockClear() })

    it('is one of the map\'s floating buttons, named for a screen reader', async () => {
      const { getByLabelText } = renderWithProviders(<MapViewUI />)
      await waitFor(() => expect(getByLabelText('Center on my position')).toBeTruthy())
      expect(getByLabelText('Center on my position').props.accessibilityRole).toBe('button')
    })

    it('brings the map to the driver\'s position', async () => {
      const { getByLabelText } = renderWithProviders(<MapViewUI />)
      await waitFor(() => expect(getByLabelText('Center on my position')).toBeTruthy())
      fireEvent.press(getByLabelText('Center on my position'))
      expect(mockAnimateToRegion).toHaveBeenCalledWith(expect.objectContaining({
        latitude: locationHookState.userLocation.latitude,
        longitude: locationHookState.userLocation.longitude
      }))
    })

    it('stays, with the zoom buttons off, whatever `map.zoom_controls` says', async () => {
      const theme = themeWith({ visibility: { 'map.zoom_controls': false } })
      const { getByLabelText, queryByLabelText } = renderWithProviders(<MapViewUI />, { themeOverrides: theme })
      await waitFor(() => expect(getByLabelText('Center on my position')).toBeTruthy())
      expect(queryByLabelText('Zoom in')).toBeNull()
    })
  })
})
