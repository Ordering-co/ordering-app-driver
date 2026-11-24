import '../../../../../../jest/helpers/uiModuleMocks'
import '../../../../../../jest/helpers/registerD4MapMocks'

import React from 'react'
import { Alert, Linking, StyleSheet } from 'react-native'
import { act, fireEvent, waitFor, within } from '@testing-library/react-native'
import { getApps } from 'react-native-map-link'

jest.mock('@ui', () => {
  const { buildD4MapUiMock } = require('../../../../../../jest/helpers/d4MapUiMock')
  return buildD4MapUiMock()
})

jest.mock('@components', () => {
  const mockOrdering = require('../../../../../../jest/helpers/mockOrdering')
  const { d4ConfigState } = require('../../../../../../jest/helpers/d4DriverDefaults')
  return {
    ...mockOrdering,
    useConfig: jest.fn(() => [d4ConfigState]),
    useUtils: jest.fn(() => [{
      parseDate: (v: string) => v || '2026-07-14'
    }, {}])
  }
})

import { DriverMap } from '..'
import { useApi, useConfig } from '@components'
import { ODivider, OBottomPopup, OButton, ONavbar, OSpinner } from '../../shared'
import { FloatingButton } from '../../FloatingButton'
import { useLocation } from '../../../hooks/useLocation'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { buildAppTheme, defaultAppTheme, THEME_PRODUCT_TYPE } from '../../../../../theme/engine'
import { bottomBarHeight, nativeShadowStyle, nativeTextStyle, themeBottomSpace, themeGutter, themeSpace } from '../../../../../theme/helpers'
import {
  d4ConfigState,
  driverMapDefaults,
  driverMapAcceptRejectDefaults
} from '../../../../../../jest/helpers/d4DriverDefaults'
import { locationHookState } from '../../../../../../jest/helpers/d4MapUiMock'

const flat = (node: any) => StyleSheet.flatten(node.props.style)

const store = { lat: 40.7128, lng: -74.006, icon: 'https://example.com/store.png', title: 'Store marker', type: 'Business' as const }
const person = { ...store, icon: 'https://example.com/person.png', title: 'Customer marker', type: 'Customer' as const }

const order = {
  ...driverMapDefaults.order,
  id: 1042,
  status: 7,
  business: { name: 'Luna Pizza', address: '214 Harbor St, Springfield', cellphone: '5551234567', country_phone_code: '1' },
  customer: {
    name: 'Ana',
    middle_name: 'Maria',
    lastname: 'Gomez',
    second_lastname: 'Ruiz',
    address: '58 Maple Ave, Apt 4B',
    cellphone: '5559876543',
    country_phone_code: '1'
  }
}

const toStore = { ...driverMapDefaults, order, location: store, isBusinessMarker: true }
const toCustomer = { ...driverMapDefaults, order: { ...order, status: 9 }, location: person, isBusinessMarker: false }
const offered = { ...driverMapAcceptRejectDefaults, order: { ...order, status: 0 }, location: store, isBusinessMarker: false }

const themeWith = (values: any) => buildAppTheme({ version: 2, product_type: THEME_PRODUCT_TYPE, values })
// The default theme is the design; `values` are the theme's own overrides.
const render = (ui: React.ReactElement, values?: any) =>
  renderWithProviders(ui, values ? { themeOverrides: themeWith(values) } : {})
const hide = (...keys: string[]) => ({ visibility: Object.fromEntries(keys.map((key) => [key, false])) })

// A driver on the move, 11 km from the destination: the card has a distance and a time.
const moving = () => (useLocation as jest.Mock).mockReturnValue({
  ...locationHookState,
  userLocation: { latitude: 40.6128, longitude: -74.006, speed: 15, mocked: false }
})

describe('DriverMap', () => {
  const theme: any = defaultAppTheme()
  const badge = theme.native.components.badge.variants

  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    ;(useLocation as jest.Mock).mockReturnValue(locationHookState)
    jest.restoreAllMocks()
  })

  it('renders the map and the order\'s bar', () => {
    const { getByTestId, getByText } = render(<DriverMap {...driverMapDefaults} />)
    expect(getByTestId('map-view')).toBeTruthy()
    expect(getByText('Order')).toBeTruthy()
    expect(getByText(/^No\. /)).toBeTruthy()
    expect(getByText(/Pending/)).toBeTruthy()
  })

  it('tells a failed location update in a notice (one button), not in a question', () => {
    const { getByTestId, getByText, queryByTestId } = render(
      <DriverMap {...driverMapDefaults} driverUpdateLocation={{ error: ['Could not update'], newLocation: null }} />
    )
    expect(getByText('Could not update. Try Again')).toBeTruthy()
    expect(getByTestId('alert-notice')).toBeTruthy()
    fireEvent.press(getByTestId('alert-accept'))
    expect(queryByTestId('alert-original')).toBeNull()
  })

  it('leaves by the back arrow of the top bar, as every full-screen modal (decision H5)', () => {
    const handleOpenMapView = jest.fn()
    const setDriverUpdateLocation = jest.fn()
    const { getByLabelText, queryByLabelText, UNSAFE_getByType } = render(
      <DriverMap
        {...driverMapDefaults}
        handleOpenMapView={handleOpenMapView}
        setDriverUpdateLocation={setDriverUpdateLocation}
      />
    )
    // The bar's own back arrow, and no close X: its end is the status badge.
    expect(UNSAFE_getByType(ONavbar as any).props.onBack).toEqual(expect.any(Function))
    expect(queryByLabelText('Close')).toBeNull()
    fireEvent.press(getByLabelText('Go back'))
    expect(handleOpenMapView).toHaveBeenCalled()
    expect(setDriverUpdateLocation).toHaveBeenCalledWith(expect.objectContaining({ error: null, newLocation: null }))
  })

  describe('the order number of the title (decision H2)', () => {
    const numbered = { ...driverMapDefaults.order, id: 123456, external_id: 'EXT-9' }

    afterEach(() => {
      (useApi as jest.Mock).mockReturnValue([{ get: jest.fn(), post: jest.fn() }, {}])
      ;(useConfig as jest.Mock).mockReturnValue([d4ConfigState])
    })

    it('is the bar\'s second line, under "Order" (as the order\'s details)', () => {
      const { getByText, queryByText } = render(<DriverMap {...driverMapDefaults} order={numbered} />)
      expect(getByText('Order')).toBeTruthy()
      expect(getByText('No. 123456')).toBeTruthy()
      expect(queryByText('Order No. 123456')).toBeNull()
    })

    it('is masked in a secure project', () => {
      (useApi as jest.Mock).mockReturnValue([{ project: 'luisv4plus' }, {}])
      const { getByText, queryByText } = render(<DriverMap {...driverMapDefaults} order={numbered} />)
      expect(getByText('No. 12****')).toBeTruthy()
      expect(queryByText(/123456/)).toBeNull()
    })

    it('is the external id in a project that shows it', () => {
      (useConfig as jest.Mock).mockReturnValue([{ ...d4ConfigState, configs: { ...d4ConfigState.configs, change_order_id: { value: '1' } } }])
      expect(render(<DriverMap {...driverMapDefaults} order={numbered} />).getByText('No. EXT-9')).toBeTruthy()
    })
  })

  describe('the status badge', () => {
    it('is at the end of the bar, colored by its state (decision D4)', () => {
      const background = (status: number, text: string) => {
        const { getByTestId, UNSAFE_getByType } = render(
          <DriverMap {...toStore} order={{ ...order, status }} getOrderStatus={() => ({ value: text })} />
        )
        const found = within(UNSAFE_getByType(ONavbar as any)).getByTestId('driver-map-status')
        expect(found).toHaveTextContent(text)
        expect(getByTestId('driver-map-status')).toBe(found)
        return flat(found).backgroundColor
      }
      expect(background(0, 'Pending')).toBe(badge.primary.background)
      expect(background(11, 'Delivered')).toBe(badge.success.background)
      expect(background(12, 'Failed')).toBe(badge.danger.background)
    })

    it('keeps the bar\'s title, subtitle and back arrow', () => {
      const { getByText, getByLabelText } = render(<DriverMap {...toStore} />)
      expect(getByText('Order')).toBeTruthy()
      expect(getByText('No. 1042')).toBeTruthy()
      const handleOpenMapView = jest.fn()
      const back = render(<DriverMap {...toStore} handleOpenMapView={handleOpenMapView} />)
      fireEvent.press(back.getByLabelText('Go back'))
      expect(handleOpenMapView).toHaveBeenCalled()
      expect(getByLabelText('Go back')).toBeTruthy()
    })

    it('is not shown for a logistic order', () => {
      const { queryByTestId, UNSAFE_getByType } = render(<DriverMap {...toStore} order={{ ...order, isLogistic: true }} />)
      expect(queryByTestId('driver-map-status')).toBeNull()
      expect(UNSAFE_getByType(ONavbar as any).props.right).toBeUndefined()
    })

    it('is not shown for an order of a group whose status the logistic list holds, and is for any other', () => {
      const grouped = { ...order, order_group_id: 5 }
      const held = render(<DriverMap {...toStore} order={grouped} logisticOrderStatus={[7]} />)
      expect(held.queryByTestId('driver-map-status')).toBeNull()
      const other = render(<DriverMap {...toStore} order={grouped} logisticOrderStatus={[0]} />)
      expect(other.getByTestId('driver-map-status')).toBeTruthy()
    })
  })

  describe('what is above the map', () => {
    it('is the bar and nothing else: no route\'s ends, no band, one distance (the card\'s)', () => {
      const { queryByTestId, UNSAFE_queryAllByType, getByTestId, getAllByTestId } = render(<DriverMap {...toStore} />)
      expect(queryByTestId('location-indicator-name')).toBeNull()
      expect(queryByTestId('location-indicator-address')).toBeNull()
      // No band divider; the card has none while it has its buttons.
      expect(UNSAFE_queryAllByType(ODivider as any)).toHaveLength(0)
      expect(getAllByTestId('driver-map-distance')).toHaveLength(1)
      expect(within(getByTestId('driver-map-card')).getByTestId('driver-map-distance')).toBeTruthy()
    })

    it('leaves the map the room: the first thing under the bar is the map, the last the bar of accept / reject or the screen\'s end', () => {
      const { getByTestId, queryByTestId } = render(<DriverMap {...toStore} />)
      expect(getByTestId('map-view')).toBeTruthy()
      expect(queryByTestId('driver-map-bar-room')).toBeNull()
      // The map fills its frame.
      expect(flat(getByTestId('map-view'))).toEqual(expect.objectContaining({ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }))
    })

    describe('the markers: the destination the card is about and the driver, as discs', () => {
      const marker = theme.native.components.map_marker.base
      const discs = (view: any) => view.getAllByTestId('map-marker-disc').map((disc: any) => ({
        width: flat(disc).width,
        borderWidth: flat(disc).borderWidth,
        glyph: disc.findByType('Icon' as any).props.name,
      }))

      it('draws the destination at the normal size, not the selected one (nothing is selected on the order\'s map), and the driver\'s own disc', () => {
        const view = render(<DriverMap {...toStore} />)
        expect(view.getAllByTestId('map-marker')).toHaveLength(2)
        expect(discs(view)).toEqual([
          { width: marker.size, borderWidth: marker.ring_width, glyph: 'storefront-outline' },
          { width: marker.me_size, borderWidth: marker.ring_width, glyph: 'navigate-outline' },
        ])
        expect(marker.size).not.toBe(marker.selected_size)
        // The same for a customer, and with the order offered.
        expect(discs(render(<DriverMap {...toCustomer} />))[0]).toEqual(expect.objectContaining({ width: marker.size, borderWidth: marker.ring_width }))
        expect(discs(render(<DriverMap {...offered} />))[0]).toEqual(expect.objectContaining({ width: marker.size, borderWidth: marker.ring_width }))
        // The driver's own disc is drawn under the stop's, as on the Map tab: a tap over both is the stop's.
        const [destination, me] = view.getAllByTestId('map-marker')
        expect(destination.props.zIndex).toBeGreaterThan(me.props.zIndex)
      })

      it('does not move the map when a marker is tapped: the driver\'s disc takes no tap, and the stop\'s card is the app\'s own', () => {
        expect(render(<DriverMap {...toStore} />).getByTestId('map-view').props.moveOnMarkerPress).toBe(false)
      })

      it('has the glyph of the stop the card names: a store, or a customer', () => {
        expect(discs(render(<DriverMap {...toStore} />))[0].glyph).toBe('storefront-outline')
        expect(discs(render(<DriverMap {...toCustomer} />))[0].glyph).toBe('person-outline')
        // A pending order's marker is the store though the details do not flag it, as the card says.
        expect(discs(render(<DriverMap {...toStore} isBusinessMarker={false} />))[0].glyph).toBe('storefront-outline')
      })

      it('anchors the disc at its center on the coordinate of the destination, and the driver\'s on the driver\'s', () => {
        const view = render(<DriverMap {...toStore} />)
        const [destination, me] = view.getAllByTestId('map-marker')
        expect(destination.props.anchor).toEqual({ x: 0.5, y: 0.5 })
        expect(me.props.anchor).toEqual({ x: 0.5, y: 0.5 })
        expect(destination.props.coordinate).toEqual({ latitude: store.lat, longitude: store.lng })
        expect(me.props.coordinate).toEqual({ latitude: locationHookState.userLocation.latitude, longitude: locationHookState.userLocation.longitude })
      })

      it('has no title on either marker (the library would draw its own info window: the card is the app\'s), the driver\'s disc takes no press, and no logo or photo is drawn on the marker', () => {
        const view = render(<DriverMap {...toStore} />)
        const [destination, me] = view.getAllByTestId('map-marker')
        expect(destination.props.title).toBeUndefined()
        expect(destination.props.accessibilityLabel).toBeUndefined()
        expect(me.props.title).toBeUndefined()
        expect(me.props.tappable).toBe(false)
        expect(me.props.onPress).toBeUndefined()
        expect(view.UNSAFE_queryAllByType(require('react-native').Image)).toHaveLength(0)
      })
    })
  })

  describe('the destination card', () => {
    it('names the store to pick up at, with its address, when the marker is the store', () => {
      const { getByTestId } = render(<DriverMap {...toStore} />)
      expect(getByTestId('driver-map-card-label')).toHaveTextContent('Pick up at')
      expect(getByTestId('driver-map-card-name')).toHaveTextContent('Luna Pizza')
      expect(getByTestId('driver-map-card-address')).toHaveTextContent('214 Harbor St, Springfield')
    })

    it('names the customer to deliver to, in full, with the address, when the marker is the customer', () => {
      const { getByTestId } = render(<DriverMap {...toCustomer} />)
      expect(getByTestId('driver-map-card-label')).toHaveTextContent('Deliver to')
      expect(getByTestId('driver-map-card-name')).toHaveTextContent('Ana Maria Gomez Ruiz')
      expect(getByTestId('driver-map-card-address')).toHaveTextContent('58 Maple Ave, Apt 4B')
    })

    it('goes to the store for a status whose marker is the store though the details do not flag it (a pending order)', () => {
      const { getByTestId } = render(<DriverMap {...toStore} isBusinessMarker={false} />)
      expect(getByTestId('driver-map-card-label')).toHaveTextContent('Pick up at')
      expect(getByTestId('driver-map-card-name')).toHaveTextContent('Luna Pizza')
    })

    it('goes by the flag when the marker does not say who it is', () => {
      const bare = { ...store, type: undefined } as any
      expect(render(<DriverMap {...toStore} location={bare} isBusinessMarker />).getByTestId('driver-map-card-label')).toHaveTextContent('Pick up at')
      expect(render(<DriverMap {...toCustomer} location={bare} isBusinessMarker={false} />).getByTestId('driver-map-card-label')).toHaveTextContent('Deliver to')
    })

    it('has no address line for a party without an address, and the marker\'s title for a nameless one', () => {
      const { getByTestId, queryByTestId } = render(
        <DriverMap {...toStore} order={{ ...order, business: { cellphone: '5551234567' } }} />
      )
      expect(queryByTestId('driver-map-card-address')).toBeNull()
      expect(getByTestId('driver-map-card-name')).toHaveTextContent('Store marker')
    })

    it('floats over the map, `sm` from its sides (the boards\' 10), with the shadow of a floating surface', () => {
      const { getByTestId } = render(<DriverMap {...toStore} />)
      const room = flat(getByTestId('driver-map-card-room'))
      expect(room.position).toBe('absolute')
      expect(room.left).toBe(themeSpace(theme, 'sm'))
      expect(room.right).toBe(themeSpace(theme, 'sm'))
      // Over the space the bottom bar of the system keeps (the theme's minimum when there is none).
      expect(room.bottom).toBe(themeSpace(theme, 'sm') + themeBottomSpace(theme, 0))
      const card = flat(getByTestId('driver-map-card'))
      expect(card).toEqual(expect.objectContaining(nativeShadowStyle(theme.native.components.map_marker.base.shadow)))
      expect(card.elevation).toBeGreaterThan(0)
      expect(card.backgroundColor).toBe(theme.native.components.card.base.background)
    })

    it('floats right over the accept / reject bar\'s room when the bar shows', () => {
      const { getByTestId } = render(<DriverMap {...offered} />)
      expect(flat(getByTestId('driver-map-card-room')).bottom).toBe(themeSpace(theme, 'sm'))
    })
  })

  describe('the distance and the travel time (visibility map.distance_bar)', () => {
    it('are the card\'s, at its right: the distance with its unit and the time as the app writes a duration', () => {
      moving()
      const { getByTestId } = render(<DriverMap {...toStore} />)
      const card = within(getByTestId('driver-map-card'))
      expect(card.getByTestId('driver-map-distance')).toHaveTextContent(/^11\.\d+ km$/)
      expect(card.getByTestId('driver-map-time')).toHaveTextContent('12 min')
    })

    it('show no time when there is none to trust, and the distance stays', () => {
      const { getByTestId, queryByTestId } = render(<DriverMap {...toStore} />)
      expect(getByTestId('driver-map-distance')).toBeTruthy()
      expect(queryByTestId('driver-map-time')).toBeNull()
    })

    it('are not drawn without the key, and the rest of the card is', () => {
      moving()
      const { queryByTestId, getByText, getByLabelText, getByTestId } = render(<DriverMap {...toStore} />, hide('map.distance_bar'))
      expect(queryByTestId('driver-map-distance')).toBeNull()
      expect(queryByTestId('driver-map-time')).toBeNull()
      expect(getByTestId('driver-map-card-name')).toHaveTextContent('Luna Pizza')
      expect(getByText('Show in other maps')).toBeTruthy()
      expect(getByLabelText('Call the store')).toBeTruthy()
    })

    it('keep the numbers of the offered order\'s card too', () => {
      moving()
      const { getByTestId } = render(<DriverMap {...offered} />)
      expect(getByTestId('driver-map-distance')).toHaveTextContent(/^11\.\d+ km$/)
      expect(getByTestId('driver-map-time')).toHaveTextContent('12 min')
    })
  })

  describe('the travel time (decision H4)', () => {
    // The driver, about 11.1 km south of the destination (0.1 degrees of latitude).
    const from = { latitude: 40.6128, longitude: -74.006 }
    const meters = 6371e3 * (0.1 * Math.PI / 180)
    const time = (speed: number) => {
      (useLocation as jest.Mock).mockReturnValue({
        ...locationHookState,
        initialPosition: { ...from, speed, mocked: false },
        userLocation: { ...from, speed, mocked: false }
      })
      return render(<DriverMap {...driverMapDefaults} />).getByTestId('driver-map-time')
    }

    it('is the app\'s duration in minutes under an hour: no decimals, no dash', () => {
      // 15 m/s: 12.36 minutes.
      expect(meters / 15 / 60).toBeCloseTo(12.36, 1)
      const node = time(15)
      expect(node).toHaveTextContent('12 min')
      expect(node).not.toHaveTextContent(/\.|-|mins|hours/)
    })

    it('is hours and minutes from an hour on', () => {
      // 2 m/s: 92.7 minutes (it read "1.54 - hours").
      expect(meters / 2 / 60).toBeCloseTo(92.66, 1)
      expect(time(2)).toHaveTextContent('1 h 33 min')
      // 3.0886 m/s: the hour itself, read in minutes on both sides of it.
      expect(time(meters / 3600)).toHaveTextContent('1 h 00 min')
    })

    it('shows no time before the first estimate (never "0 min"), and keeps the last one while the driver is stopped', () => {
      ;(useLocation as jest.Mock).mockReturnValue({
        ...locationHookState,
        initialPosition: { ...from, speed: 0, mocked: false },
        userLocation: { ...from, speed: 0, mocked: false }
      })
      const first = render(<DriverMap {...driverMapDefaults} />)
      expect(first.queryByTestId('driver-map-time')).toBeNull()
      // The distance still shows.
      expect(first.getByTestId('driver-map-distance')).toBeTruthy()

      ;(useLocation as jest.Mock).mockReturnValue({ ...locationHookState, userLocation: { ...from, speed: 15, mocked: false } })
      const { getByTestId, rerender } = render(<DriverMap {...driverMapDefaults} />)
      expect(getByTestId('driver-map-time')).toHaveTextContent('12 min')
      // The driver stops a little further on: the estimate stays, still in minutes.
      ;(useLocation as jest.Mock).mockReturnValue({ ...locationHookState, userLocation: { latitude: 40.6129, longitude: -74.006, speed: 0, mocked: false } })
      rerender(<DriverMap {...driverMapDefaults} />)
      expect(getByTestId('driver-map-time')).toHaveTextContent('12 min')
    })

    describe('a time that cannot be trusted is not shown (decision 2026-11-17)', () => {
      // About 715.85 km south of the destination: the row that read "715.85 km · 12523548717494 h 47 min".
      const far = { latitude: 40.7128 - 6.4375, longitude: -74.006 }
      const timeAt = (position: any) => {
        ;(useLocation as jest.Mock).mockReturnValue({
          ...locationHookState,
          initialPosition: position,
          userLocation: position
        })
        return render(<DriverMap {...driverMapDefaults} />)
      }

      it('reads 715 km at a road speed as hours, and shows the distance', () => {
        const { getByTestId } = timeAt({ ...far, speed: 25, mocked: false })
        expect(getByTestId('driver-map-time')).toHaveTextContent('7 h 57 min')
        expect(getByTestId('driver-map-distance')).toHaveTextContent(/715\.\d+/)
      })

      it.each([
        ['the emulator\'s noise above zero (1.6e-11 m/s), which read 12523548717494 h 47 min', 1.5878e-11],
        ['the smallest number above zero', Number.MIN_VALUE],
        ['a walking pace over 715 km (beyond a day)', 1.4],
        ['an unknown speed (-1)', -1],
        ['no speed', undefined],
        ['NaN', NaN],
        ['Infinity', Infinity],
        ['epoch milliseconds', 1763337600000]
      ])('has no time for %s', (_name, speed) => {
        const { queryByTestId } = timeAt({ ...far, speed, mocked: false })
        expect(queryByTestId('driver-map-time')).toBeNull()
      })

      it('has no time at the position 0, 0 (no fix yet), whatever the speed', () => {
        const { queryByTestId } = timeAt({ latitude: 0, longitude: 0, speed: 15, mocked: false })
        expect(queryByTestId('driver-map-time')).toBeNull()
      })

      it('has no time for a position that is not a number', () => {
        const { queryByTestId } = timeAt({ latitude: NaN, longitude: NaN, speed: 15, mocked: false })
        expect(queryByTestId('driver-map-time')).toBeNull()
      })

      it('drops the last estimate when the next one is absurd', () => {
        ;(useLocation as jest.Mock).mockReturnValue({ ...locationHookState, userLocation: { ...from, speed: 15, mocked: false } })
        const { getByTestId, queryByTestId, rerender } = render(<DriverMap {...driverMapDefaults} />)
        expect(getByTestId('driver-map-time')).toHaveTextContent('12 min')
        ;(useLocation as jest.Mock).mockReturnValue({ ...locationHookState, userLocation: { ...far, speed: 1.4, mocked: false } })
        rerender(<DriverMap {...driverMapDefaults} />)
        expect(queryByTestId('driver-map-time')).toBeNull()
      })
    })
  })

  describe('"Show in other maps" (visibility map.other_maps)', () => {
    it('is the card\'s primary action and opens the sheet of maps apps', async () => {
      const { getByText, queryByText, getByTestId } = render(<DriverMap {...toStore} />)
      expect(within(getByTestId('driver-map-card')).getByText('Show in other maps')).toBeTruthy()
      expect(queryByText('Waze')).toBeNull()
      await act(async () => {
        fireEvent.press(getByText('Show in other maps'))
      })
      await waitFor(() => expect(getByText('Waze')).toBeTruthy())
      expect(getApps).toHaveBeenCalledWith(expect.objectContaining({ alwaysIncludeGoogle: true }))
      expect(getByText('What app would you like to use?')).toBeTruthy()
      const apps = await (getApps as jest.Mock).mock.results[0].value
      fireEvent.press(getByText('Google Maps'))
      expect(apps[0].open).toHaveBeenCalled()
      expect(queryByText('Waze')).toBeNull()
    })

    it('is the app\'s default button (solid primary), the screen\'s main action', () => {
      const look = theme.native.components.button.variants.primary.solid
      const { getByRole } = render(<DriverMap {...toStore} />)
      const box = StyleSheet.flatten(getByRole('button', { name: 'Show in other maps' }).children[0].props.style)
      expect(box.backgroundColor).toBe(look.background)
      expect(box.minHeight).toBe(theme.native.components.button.sizes.md.height)
    })

    it('is not drawn without the key, and the call button stays', () => {
      const { queryByText, getByLabelText } = render(<DriverMap {...toStore} />, hide('map.other_maps'))
      expect(queryByText('Show in other maps')).toBeNull()
      expect(getByLabelText('Call the store')).toBeTruthy()
    })

    it('is not left in the controls over the map', () => {
      const { getByTestId } = render(<DriverMap {...toStore} />)
      expect(within(getByTestId('driver-map-controls')).queryByText('Show in other maps')).toBeNull()
    })

    it('leaves the card with no row of actions when there is nothing to do', () => {
      const { getByTestId, queryByText, queryByLabelText } = render(
        <DriverMap {...toStore} order={{ ...order, business: { name: 'Luna Pizza' } }} />,
        hide('map.other_maps')
      )
      expect(queryByText('Show in other maps')).toBeNull()
      expect(queryByLabelText('Call the store')).toBeNull()
      expect(getByTestId('driver-map-card-name')).toHaveTextContent('Luna Pizza')
    })
  })

  describe('the sheet of maps apps', () => {
    const open = async (ui = <DriverMap {...toStore} />) => {
      const view = render(ui)
      await act(async () => {
        fireEvent.press(view.getByText('Show in other maps'))
      })
      return view
    }

    it('closes with Cancel', async () => {
      const { getByText, queryByText } = await open()
      await waitFor(() => expect(getByText('Waze')).toBeTruthy())
      fireEvent.press(getByText('Cancel'))
      expect(queryByText('Waze')).toBeNull()
    })

    it('paints its Cancel as every Cancel of the app: a neutral outline (decision H5)', async () => {
      const { getByText, getByRole, UNSAFE_getAllByType } = await open()
      await waitFor(() => expect(getByText('Waze')).toBeTruthy())
      const cancel = UNSAFE_getAllByType(OButton as any).find((button: any) => button.props.text === 'Cancel') as any
      expect(cancel.props).toEqual(expect.objectContaining({ color: 'neutral', appearance: 'outline' }))
      expect(cancel.props.size).toBeUndefined()
      const look = theme.native.components.button.variants.neutral.outline
      const box = StyleSheet.flatten(getByRole('button', { name: 'Cancel' }).children[0].props.style)
      expect(box.borderColor).toBe(look.border.borderColor)
      expect(box.backgroundColor).toBe(look.background)
    })

    it('leaves its sides and bottom to the sheet (decision H5)', async () => {
      const { getByText, getByTestId, UNSAFE_getByType } = await open()
      await waitFor(() => expect(getByText('Waze')).toBeTruthy())
      expect(UNSAFE_getByType(OBottomPopup as any).props.padded).toBe(true)
      const body = flat(getByTestId('driver-map-sheet'))
      expect(body.paddingHorizontal).toBeUndefined()
      expect(body.paddingBottom).toBeUndefined()
      expect(body.padding).toBeUndefined()
      expect(body.gap).toBe(themeSpace(theme, 'sm'))
    })

    it('waits for the maps apps with the app\'s spinner', async () => {
      let resolve: (apps: any[]) => void = () => {}
      ;(getApps as jest.Mock).mockReturnValueOnce(new Promise((done) => { resolve = done }))
      const { getByTestId, queryByTestId, UNSAFE_getByType } = await open()
      expect(getByTestId('driver-map-apps-loading')).toBeTruthy()
      expect(UNSAFE_getByType(OSpinner as any)).toBeTruthy()
      expect(flat(getByTestId('driver-map-apps-loading')).alignSelf).toBe('center')
      await act(async () => {
        resolve([])
      })
      expect(queryByTestId('driver-map-apps-loading')).toBeNull()
    })
  })

  describe('the call button', () => {
    let open: jest.SpyInstance
    let alert: jest.SpyInstance

    beforeEach(() => {
      open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true)
      alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {})
    })

    it('calls the store\'s number under the order\'s own rule (with its country code), 44 pt to touch', async () => {
      const { getByLabelText } = render(<DriverMap {...toStore} />)
      const size = theme.native.components.button.sizes[theme.native.components.order_details.slots.stop_call.size].height
      expect(size).toBeGreaterThanOrEqual(44)
      await act(async () => {
        fireEvent.press(getByLabelText('Call the store'))
      })
      expect(open).toHaveBeenCalledWith('tel:+15551234567')
    })

    it('calls the customer with the country code of the number, when the marker is the customer', async () => {
      const { getByLabelText, queryByLabelText } = render(<DriverMap {...toCustomer} />)
      expect(queryByLabelText('Call the store')).toBeNull()
      await act(async () => {
        fireEvent.press(getByLabelText('Call the customer'))
      })
      expect(open).toHaveBeenCalledWith('tel:+15559876543')
    })

    it('is for the party the map goes to: the store\'s key does not hide the customer\'s, nor the other way', () => {
      expect(render(<DriverMap {...toStore} />, hide('confirmation.business.phone')).queryByLabelText('Call the store')).toBeNull()
      expect(render(<DriverMap {...toStore} />, hide('confirmation.customer.phone')).getByLabelText('Call the store')).toBeTruthy()
      expect(render(<DriverMap {...toCustomer} />, hide('confirmation.customer.phone')).queryByLabelText('Call the customer')).toBeNull()
      expect(render(<DriverMap {...toCustomer} />, hide('confirmation.business.phone')).getByLabelText('Call the customer')).toBeTruthy()
    })

    it('is not drawn for a party with no phone', () => {
      const bare = { ...order, business: { name: 'Luna Pizza' }, customer: { ...order.customer, cellphone: undefined, phone: '' } }
      expect(render(<DriverMap {...toStore} order={bare} />).queryByLabelText('Call the store')).toBeNull()
      expect(render(<DriverMap {...toCustomer} order={bare} />).queryByLabelText('Call the customer')).toBeNull()
    })

    it('falls back to the phone when there is no cellphone, and prefers a number that can be dialled', async () => {
      const onlyPhone = { ...order, business: { ...order.business, cellphone: undefined, phone: '5550001111' } }
      const first = render(<DriverMap {...toStore} order={onlyPhone} />)
      await act(async () => {
        fireEvent.press(first.getByLabelText('Call the store'))
      })
      expect(open).toHaveBeenLastCalledWith('tel:+15550001111')
      const mixed = { ...order, business: { ...order.business, cellphone: 'ask for Tom', phone: '5550001111' } }
      const second = render(<DriverMap {...toStore} order={mixed} />)
      await act(async () => {
        fireEvent.press(second.getByLabelText('Call the store'))
      })
      expect(open).toHaveBeenLastCalledWith('tel:+15550001111')
    })

    it('says so, and does not dial, for a number that is not a number (as the order\'s links)', async () => {
      const invalid = { ...order, business: { ...order.business, cellphone: '555-ASK' } }
      const { getByLabelText } = render(<DriverMap {...toStore} order={invalid} />)
      await act(async () => {
        fireEvent.press(getByLabelText('Call the store'))
      })
      expect(open).not.toHaveBeenCalled()
      expect(alert).toHaveBeenCalledWith('Error opening the link', 'Invalid number', expect.any(Array))
    })

    it('says so when the device cannot call', async () => {
      open.mockRejectedValue(new Error('no dialer'))
      const { getByLabelText } = render(<DriverMap {...toStore} />)
      await act(async () => {
        fireEvent.press(getByLabelText('Call the store'))
      })
      expect(alert).toHaveBeenCalledWith('Error opening the link', 'Link could not be opened or is not supported', expect.any(Array))
    })
  })

  describe('while the order is offered (the accept / reject bar)', () => {
    it('names the next stop under a divider, and has no call button nor maps button', () => {
      const { getByTestId, getByText, queryByText, queryByLabelText, UNSAFE_queryAllByType } = render(<DriverMap {...offered} />)
      // The card still names where the driver goes first.
      expect(getByTestId('driver-map-card-label')).toHaveTextContent('Pick up at')
      expect(getByTestId('driver-map-card-name')).toHaveTextContent('Luna Pizza')
      expect(getByText('Then deliver to')).toBeTruthy()
      expect(getByTestId('driver-map-card-next')).toHaveTextContent(/^Then deliver to 58 Maple Ave, Apt 4B/)
      expect(UNSAFE_queryAllByType(ODivider as any)).toHaveLength(1)
      expect(queryByText('Show in other maps')).toBeNull()
      expect(queryByLabelText('Call the store')).toBeNull()
      expect(queryByLabelText('Call the customer')).toBeNull()
    })

    it('has "Other maps" at its end, which opens the sheet', async () => {
      const { getByText, getByTestId } = render(<DriverMap {...offered} />)
      expect(within(getByTestId('driver-map-card-next')).getByText('Other maps')).toBeTruthy()
      await act(async () => {
        fireEvent.press(getByText('Other maps'))
      })
      await waitFor(() => expect(getByText('Waze')).toBeTruthy())
      expect(getApps).toHaveBeenCalled()
    })

    it('has no "Other maps" link without the key (visibility map.other_maps), and keeps the next stop', () => {
      const { queryByText, getByTestId } = render(<DriverMap {...offered} />, hide('map.other_maps'))
      expect(queryByText('Other maps')).toBeNull()
      expect(getByTestId('driver-map-card-next')).toHaveTextContent('Then deliver to 58 Maple Ave, Apt 4B')
    })

    it('has no next stop, and no divider, when the customer has no address and there is no link', () => {
      const { queryByTestId, UNSAFE_queryAllByType } = render(
        <DriverMap {...offered} order={{ ...offered.order, customer: { name: 'Ana' } }} />,
        hide('map.other_maps')
      )
      expect(queryByTestId('driver-map-card-next')).toBeNull()
      expect(UNSAFE_queryAllByType(ODivider as any)).toHaveLength(0)
    })

    it('keeps the accept / reject bar under the map, as today', () => {
      const handleViewActionOrder = jest.fn()
      const { getByTestId, UNSAFE_getByType } = render(<DriverMap {...offered} handleViewActionOrder={handleViewActionOrder} />)
      expect(UNSAFE_getByType(FloatingButton as any)).toBeTruthy()
      expect(getByTestId('driver-map-bar-room')).toBeTruthy()
      fireEvent.press(getByTestId('floating-second'))
      expect(handleViewActionOrder).toHaveBeenCalledWith('accept')
      fireEvent.press(getByTestId('floating-first'))
      expect(handleViewActionOrder).toHaveBeenCalledWith('reject')
    })
  })

  describe('the accept / reject bar', () => {
    it('gives the bottom bar no colors of its own: the theme paints accept and reject', () => {
      const { UNSAFE_getByType } = render(<DriverMap {...driverMapAcceptRejectDefaults} />)
      const props = UNSAFE_getByType(FloatingButton as any).props
      expect(props).not.toHaveProperty('firstColorCustom')
      expect(props).not.toHaveProperty('secondColorCustom')
      expect(props).not.toHaveProperty('widthButton')
      expect(props.secondButton).toBe(true)
    })

    it('keeps the map over the bottom bar\'s room, measured from the theme', () => {
      expect(render(<DriverMap {...driverMapDefaults} />).queryByTestId('driver-map-bar-room')).toBeNull()
      const withBar = render(<DriverMap {...driverMapAcceptRejectDefaults} />)
      // Accept and reject: exactly the height of a bar of two buttons, under the map (no band between them).
      const bar = theme.native.components.bottom_bar
      const button = theme.native.components.button.sizes[bar.slots.button.size].height
      const room = flat(withBar.getByTestId('driver-map-bar-room')).height
      expect(room).toBe(bottomBarHeight(theme, 0, 2))
      expect(room).toBe(2 * button + themeSpace(theme, 'sm') + 2 * bar.base.padding + themeBottomSpace(theme, 0))
    })

    it('measures the bar\'s room with the space the bar itself keeps under its buttons (none inside the tabs)', () => {
      const { BottomTabBarHeightContext } = require('@react-navigation/bottom-tabs')
      const inTabs = render(
        <BottomTabBarHeightContext.Provider value={80}>
          <DriverMap {...driverMapAcceptRejectDefaults} />
        </BottomTabBarHeightContext.Provider>
      )
      expect(flat(inTabs.getByTestId('driver-map-bar-room')).height).toBe(bottomBarHeight(theme, 0, 2, 0))
    })
  })

  describe('the controls over the map', () => {
    it('are at its top right, `lg` under the bar and on the page gutter: zoom, then fit the route and center on my position', () => {
      const { getByTestId } = render(<DriverMap {...toStore} />)
      const controls = getByTestId('driver-map-controls')
      const style = flat(controls)
      expect(style).toEqual(expect.objectContaining({
        position: 'absolute',
        top: themeSpace(theme, 'lg'),
        right: themeGutter(theme),
        alignItems: 'flex-end'
      }))
      expect(style.bottom).toBeUndefined()
      expect(style.left).toBeUndefined()
      const labels = controls.findAll((node: any) => typeof node.type === 'string' && node.props.accessibilityLabel).map((node: any) => node.props.accessibilityLabel)
      const unique = labels.filter((label: string, index: number) => labels.indexOf(label) === index)
      expect(unique).toEqual(['Zoom in', 'Zoom out', 'Fit the route', 'Center on my position'])
    })

    it('fit and center are hidden by visibility business_map.recenter, and only they', () => {
      const { queryByLabelText, getByLabelText, getByText } = render(<DriverMap {...toStore} />, hide('business_map.recenter'))
      expect(queryByLabelText('Fit the route')).toBeNull()
      expect(queryByLabelText('Center on my position')).toBeNull()
      expect(getByLabelText('Zoom in')).toBeTruthy()
      expect(getByText('Show in other maps')).toBeTruthy()
    })

    it('zoom is hidden by visibility map.zoom_controls, and only it', () => {
      const { queryByLabelText, getByLabelText } = render(<DriverMap {...toStore} />, hide('map.zoom_controls'))
      expect(queryByLabelText('Zoom in')).toBeNull()
      expect(getByLabelText('Fit the route')).toBeTruthy()
    })

    it('name the fit and center buttons, 44 pt to touch, and the library\'s own zoom buttons stay off', () => {
      const { getByLabelText, getByTestId } = render(<DriverMap {...toStore} />)
      const fit = getByLabelText('Fit the route')
      const size = theme.native.components.button.sizes.sm.height
      expect(size + 2 * fit.props.hitSlop).toBeGreaterThanOrEqual(44)
      fireEvent.press(fit)
      fireEvent.press(getByLabelText('Center on my position'))
      expect(getByTestId('map-view').props.zoomControlEnabled).toBe(false)
    })
  })

  describe('the padding of the map follows the card', () => {
    const inset = 34
    const height = 148

    let insets: jest.SpyInstance

    beforeEach(() => {
      insets = jest.spyOn(require('react-native-safe-area-context'), 'useSafeAreaInsets')
        .mockReturnValue({ top: 0, right: 0, bottom: inset, left: 0 })
    })

    afterEach(() => {
      insets.mockRestore()
    })

    const layout = (node: any, value: number) => act(() => {
      fireEvent(node, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 300, height: value } } })
    })

    it('keeps the map\'s own marks over the system bar until the card is measured', () => {
      const { getByTestId } = render(<DriverMap {...toStore} />)
      expect(getByTestId('map-view').props.mapPadding).toEqual({ top: 0, right: 0, bottom: inset, left: 0 })
    })

    it('is the room the card takes, its height and the space under it, once it is measured', () => {
      const { getByTestId } = render(<DriverMap {...toStore} />)
      layout(getByTestId('driver-map-card-room'), height)
      // The card sits over the system's bar: the room under it already holds the system\'s bar.
      const under = themeSpace(theme, 'sm') + themeBottomSpace(theme, inset)
      expect(getByTestId('map-view').props.mapPadding).toEqual({ top: 0, right: 0, bottom: under + height, left: 0 })
      expect(under).toBeGreaterThanOrEqual(inset)
    })

    it('follows the card when it grows or shrinks', () => {
      const { getByTestId } = render(<DriverMap {...toStore} />)
      const under = themeSpace(theme, 'sm') + themeBottomSpace(theme, inset)
      layout(getByTestId('driver-map-card-room'), height)
      layout(getByTestId('driver-map-card-room'), height + 40)
      expect(getByTestId('map-view').props.mapPadding.bottom).toBe(under + height + 40)
      layout(getByTestId('driver-map-card-room'), height - 60)
      expect(getByTestId('map-view').props.mapPadding.bottom).toBe(under + height - 60)
    })

    it('keeps the buttons\' column clear: once it is measured the map pads its end by the page gutter, the column\'s width and `sm`', () => {
      const { getByTestId } = render(<DriverMap {...toStore} />)
      expect(getByTestId('map-view').props.mapPadding.right).toBe(0)
      act(() => {
        fireEvent(getByTestId('driver-map-controls'), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 44, height: 200 } } })
      })
      expect(getByTestId('map-view').props.mapPadding).toEqual({
        top: 0, left: 0, right: themeGutter(theme) + 44 + themeSpace(theme, 'sm'), bottom: inset
      })
      // The card keeps its own side: the two paddings are independent.
      layout(getByTestId('driver-map-card-room'), height)
      expect(getByTestId('map-view').props.mapPadding.right).toBe(themeGutter(theme) + 44 + themeSpace(theme, 'sm'))
      expect(getByTestId('map-view').props.mapPadding.bottom).toBe(themeSpace(theme, 'sm') + themeBottomSpace(theme, inset) + height)
    })

    it('ends where the card starts above the accept / reject bar (the map ends where the bar starts)', () => {
      const { getByTestId } = render(<DriverMap {...offered} />)
      expect(getByTestId('map-view').props.mapPadding.bottom).toBe(0)
      layout(getByTestId('driver-map-card-room'), height)
      expect(getByTestId('map-view').props.mapPadding).toEqual({ top: 0, right: 0, bottom: themeSpace(theme, 'sm') + height, left: 0 })
    })
  })

  describe('without an order', () => {
    const none = { ...driverMapDefaults, order: undefined }

    it('still draws the card, naming the marker, and has no badge nor title', () => {
      const { queryByTestId, getByTestId, getByText, UNSAFE_getByType } = render(<DriverMap {...none} />)
      expect(getByTestId('driver-map-card-name')).toHaveTextContent(driverMapDefaults.location.title)
      expect(queryByTestId('driver-map-card-address')).toBeNull()
      expect(queryByTestId('driver-map-status')).toBeNull()
      expect(UNSAFE_getByType(ONavbar as any).props.right).toBeUndefined()
      expect(UNSAFE_getByType(ONavbar as any).props.title).toBeUndefined()
      expect(UNSAFE_getByType(ONavbar as any).props.subtitle).toBeUndefined()
      expect(getByTestId('driver-map-distance')).toBeTruthy()
      expect(within(getByTestId('driver-map-card')).getByText('Show in other maps')).toBeTruthy()
      expect(getByText('Show in other maps')).toBeTruthy()
    })

    it('keeps the controls at the map\'s top right', () => {
      const { getByTestId } = render(<DriverMap {...none} />)
      const controls = flat(getByTestId('driver-map-controls'))
      expect(controls.top).toBe(themeSpace(theme, 'lg'))
      expect(controls.bottom).toBeUndefined()
    })
  })
})
