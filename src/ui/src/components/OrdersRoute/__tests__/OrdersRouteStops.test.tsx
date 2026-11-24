import '../../../../../../jest/helpers/uiModuleMocks'
import React from 'react'
import { StyleSheet } from 'react-native'
import { act, fireEvent, within } from '@testing-library/react-native'

jest.mock('@ui', () => {
  const { pickUi } = require('../../../../../../jest/helpers/uiModuleMocks')
  const { buildD3OrdersIntegrationUiMock } = require('../../../../../../jest/helpers/d3OrdersUiMock')
  return pickUi(buildD3OrdersIntegrationUiMock(), ['useOfflineActions', 'useLocation'])
})
jest.mock('@components', () => require('../../../../../../jest/helpers/d3OrdersComponentsMock').getMock())
jest.mock('../../../../../context/PermissionsContext', () => require('../../../../../../jest/helpers/mockPermissionsContext'))
jest.mock('react-native-map-link', () => ({ getApps: jest.fn(() => Promise.resolve([])) }))

import { OrdersRouteStops } from '../OrdersRouteStops'
import { clearRouteSource, publishRouteSource } from '../routeSource'
import { useConfig, useUtils } from '@components'
import { offlineActionsState } from '../../../../../../jest/helpers/d3OrdersUiMock'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { holdPress } from '../../../../../../jest/helpers/holdPress'
import { freezeClock, restoreClock } from '../../../../../../jest/helpers/fakeClock'
import { buildAppTheme, defaultAppTheme, THEME_PRODUCT_TYPE } from '../../../../../theme/engine'
import { order, STORE_B } from './fixtures'
import dayjs from '@/utils/dayjs'

const { useLocation } = require('@ui')
const flat = (node: any) => StyleSheet.flatten(node.props.style)
const themeWith = (values: any) => buildAppTheme({ version: 2, product_type: THEME_PRODUCT_TYPE, values })
const NBSP = '\u00A0'
const clockOn = themeWith({ visibility: { 'orders.absolute_time': true } })
const clockOff = themeWith({ visibility: { 'orders.absolute_time': false } })
const theme: any = defaultAppTheme()
const badge = theme.native.components.badge

const driverAt = (latitude: number, longitude: number) => ({
  userLocation: { latitude, longitude, timestamp: 1 },
  getCurrentLocation: jest.fn().mockResolvedValue({ latitude, longitude }),
  followUserLocation: jest.fn(),
  stopFollowUserLocation: jest.fn()
})
const configs = (extra: Record<string, any> = {}) =>
  (useConfig as jest.Mock).mockReturnValue([{ loading: false, configs: { distance_unit: { value: 'km' }, ...extra } }])
const navigation = () => ({ navigate: jest.fn(), goBack: jest.fn(), canGoBack: jest.fn(() => true) })

/** Today's trip, as the mockup draws it: a delivery to make (1039, at 12:00), a store with two orders and a late order. */
const orders = () => [
  order(1039, { status: 9, delivery_position: 1, business_id: 8, business: STORE_B, customer: { name: 'Marco', lastname: 'Prieto', address: '9 Birch Rd, Unit 2', location: { lat: 40.7, lng: -74.0 } } }),
  order(1042, { delivery_position: 2, delivery_datetime_utc: '2099-01-01 11:00:00' }),
  order(1044, { delivery_position: 3 })
]

const show = (rows: any[], nav = navigation(), changeOrderStatus = jest.fn(), theme?: any) => {
  publishRouteSource({ rows, changeOrderStatus })
  return { ...renderWithProviders(<OrdersRouteStops navigation={nav} />, theme ? { themeOverrides: theme } : undefined), nav, changeOrderStatus }
}

describe('OrdersRouteStops: all the stops as a timeline', () => {
  beforeEach(() => {
    jest.clearAllMocks()
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
  })
  afterEach(() => { restoreClock(); act(() => clearRouteSource()) })

  it('has the bar say "Route" and, under it, how many stops and how far in a straight line', () => {
    const screen = show(orders())
    expect(screen.getByText('Route')).toBeTruthy()
    expect(screen.getByText(/^4 stops · about \d+\.\d\d km in a straight line$/)).toBeTruthy()
    fireEvent.press(screen.getByLabelText('Go back'))
    expect(screen.nav.goBack).toHaveBeenCalled()
  })

  describe('the stops', () => {
    it('are one rail of numbers in the route\'s order, the next stop\'s strong', () => {
      const screen = show(orders())
      const numbers = screen.getAllByTestId('route-stop-number', { hidden: true })
      expect(numbers.map((node) => node.findByType('Text' as any).props.children)).toEqual(['1', '2', '3', '4'])
      expect(flat(numbers[0]).width).toBe(theme.native.components.map_marker.base.stop_next_size)
      expect(flat(numbers[1]).width).toBe(theme.native.components.map_marker.base.stop_size)
      expect(flat(numbers[0]).backgroundColor).toBe(theme.native.components.map_marker.base.color)
      expect(flat(numbers[1]).backgroundColor).toBe(theme.native.components.map_marker.base.ring_color)
    })

    it('are written as the panel writes them: what to do and where, the order, the customer and the payment', () => {
      const screen = show(orders())
      expect(screen.getByText('9 Birch Rd, Unit 2')).toBeTruthy()
      expect(screen.getByText('#1039 · Marco Prieto · Collect $24.50 in cash')).toBeTruthy()
      expect(screen.getByText('Pick up at Luna Pizza')).toBeTruthy()
      expect(screen.getByText('214 Harbor St · #1042, #1044')).toBeTruthy()
      expect(screen.getByText('Deliver to 1042 Pine Ct')).toBeTruthy()
      expect(screen.getByText('#1042 · Ana Gil · Collect $24.50 in cash')).toBeTruthy()
      expect(screen.getByText('Deliver to 1044 Pine Ct')).toBeTruthy()
    })

    it('write each leg\'s straight-line distance in the project\'s unit, from the previous stop (the first from the driver)', () => {
      const screen = show(orders())
      expect(screen.getAllByText(/^\d+\.\d\d km$/).length).toBeGreaterThanOrEqual(4)
      configs({ distance_unit: { value: 'mi' } })
      screen.rerender(<OrdersRouteStops navigation={screen.nav} />)
      expect(screen.getAllByText(/^\d+\.\d\d mi$/).length).toBeGreaterThanOrEqual(4)
    })

    it('say "No location" for a stop that has none, and give it no distance', () => {
      const screen = show([order(1, { status: 9, delivery_position: 1 }), order(2, { status: 9, delivery_position: 2, customer: { name: 'Bo', address: '5 Elm', location: null } })])
      expect(screen.getByTestId('route-stop-2-no-location').props.children).toBe('No location')
    })

    it('are read one by one in order by a screen reader, with their distance', () => {
      const screen = show(orders())
      expect(screen.getByTestId('route-stop-2').props.accessibilityLabel).toMatch(/^Stop 2 of 4, Pick up at Luna Pizza, orders 1042, 1044, \d+\.\d\d km$/)
      expect(screen.getByTestId('route-stop-2').props.accessibilityRole).toBe('button')
      expect(screen.getByLabelText(/^Stop 1 of 4, Deliver to 9 Birch Rd, Unit 2, order 1039, \d+\.\d\d km$/)).toBeTruthy()
    })

    it('hide the rail from a screen reader (the stop\'s own label says its number)', () => {
      const screen = show(orders())
      expect(screen.UNSAFE_getAllByProps({ accessibilityElementsHidden: true }).length).toBeGreaterThanOrEqual(4)
    })

    it('open the order on a tap, or the In Progress list for a store with several orders', () => {
      const screen = show(orders())
      fireEvent.press(screen.getByTestId('route-stop-3'))
      expect(screen.nav.navigate).toHaveBeenCalledWith('OrderDetails', expect.objectContaining({ order: expect.objectContaining({ id: 1042 }) }))
      fireEvent.press(screen.getByTestId('route-stop-2'))
      expect(screen.nav.navigate).toHaveBeenLastCalledWith('BottomTab', { screen: 'Orders', params: expect.objectContaining({ show: 'orders' }) }, { pop: true })
    })
  })

  describe('the next stop\'s card', () => {
    it('has the order card\'s status band: "Next stop · deliver" at its start and, on the enterprise plan, the time at its end', () => {
      configs({ plan_enterprise: { value: '1' } })
      freezeClock(new Date('2099-01-01T11:54:00').getTime())
      const screen = show([order(1039, { status: 9, delivery_position: 1, delivery_datetime_utc: '2099-01-01 12:00:00' })])
      expect(screen.getByTestId('order-card-status').props.children).toBe('Next stop · deliver')
      expect(screen.getByTestId('order-card-time').props.children).toBe('6 min left')
      expect(flat(screen.getByTestId('order-card-band')).backgroundColor).toBe(badge.variants.primary_soft.background)
    })

    it('is "Next stop · pick up" for a store, and its time is "12 min late" in the danger tone once the order is late', () => {
      configs({ plan_enterprise: { value: '1' } })
      freezeClock(new Date('2099-01-01T12:12:00').getTime())
      const screen = show([order(1042, { delivery_position: 1, delivery_datetime_utc: '2099-01-01 12:00:00' })])
      expect(screen.getByTestId('order-card-status').props.children).toBe('Next stop · pick up')
      expect(screen.getByTestId('order-card-time').props.children).toBe('12 min late')
      expect(flat(screen.getByTestId('order-card-band')).backgroundColor).toBe(badge.variants.danger_soft.background)
    })

    it('writes the due time after the relative one when the theme\'s orders.absolute_time is on, as the order card does, and only then', () => {
      configs({ plan_enterprise: { value: '1' } })
      freezeClock(new Date('2099-01-01T12:12:00').getTime())
      const rows = () => [order(1042, { delivery_position: 1, delivery_datetime_utc: '2099-01-01 12:00:00' })]
      const on = show(rows(), navigation(), jest.fn(), clockOn)
      expect(on.getByTestId('order-card-time').props.children.replace(new RegExp(NBSP, 'g'), ' ')).toBe('12 min late · due 12:00')
      on.unmount()
      act(() => clearRouteSource())
      const off = show(rows(), navigation(), jest.fn(), clockOff)
      expect(off.getByTestId('order-card-time').props.children).toBe('12 min late')
    })

    it('writes no time where the order card writes none (no enterprise plan), even with the clock time on', () => {
      const screen = show([order(1039, { status: 9 })], navigation(), jest.fn(), clockOn)
      expect(screen.queryByTestId('order-card-time')).toBeNull()
    })

    it('writes no time where the order card writes none (no enterprise plan), the band keeping its status', () => {
      const screen = show([order(1039, { status: 9 })])
      expect(screen.queryByTestId('order-card-time')).toBeNull()
      expect(screen.getByTestId('order-card-status').props.children).toBe('Next stop · deliver')
    })

    it('has Navigate and the order\'s next step, the card\'s own buttons', async () => {
      const screen = show([order(1042, { delivery_position: 1 })])
      expect(screen.getByTestId('route-navigate')).toBeTruthy()
      await holdPress(screen.getByTestId('order-card-1042-arrivedToBusiness'))
      expect(screen.changeOrderStatus).toHaveBeenCalledWith(3, [1042])
    })

    it('opens the maps sheet with Navigate', () => {
      const screen = show(orders())
      fireEvent.press(screen.getByTestId('route-navigate'))
      expect(screen.getByText('Open in a maps app')).toBeTruthy()
    })

    it('opens the order when the card is tapped', () => {
      const screen = show(orders())
      fireEvent.press(screen.getByTestId('route-next-card'))
      expect(screen.nav.navigate).toHaveBeenCalledWith('OrderDetails', expect.objectContaining({ order: expect.objectContaining({ id: 1039 }) }))
    })
  })

  describe('the late badge', () => {
    it('marks a stop whose order is late, with the band\'s time text, and no other', () => {
      configs({ plan_enterprise: { value: '1' } })
      freezeClock(new Date('2099-01-01T12:12:00').getTime())
      const screen = show([
        order(1039, { status: 9, delivery_position: 1, delivery_datetime_utc: '2099-01-01 13:00:00' }),
        order(1044, { status: 9, delivery_position: 2, delivery_datetime_utc: '2099-01-01 12:00:00' }),
        order(1045, { status: 9, delivery_position: 3, delivery_datetime_utc: '2099-01-01 14:00:00' })
      ])
      const late = screen.getByTestId('route-stop-2-late')
      expect(within(late).getByText('12 min late')).toBeTruthy()
      expect(flat(late).backgroundColor).toBe(badge.variants.danger_soft.background)
      expect(screen.queryByTestId('route-stop-3-late')).toBeNull()
    })

    it('has the band\'s clock time too when the theme\'s orders.absolute_time is on, and not when it is off', () => {
      configs({ plan_enterprise: { value: '1' } })
      freezeClock(new Date('2099-01-01T12:12:00').getTime())
      const rows = () => [
        order(1039, { status: 9, delivery_position: 1, delivery_datetime_utc: '2099-01-01 13:00:00' }),
        order(1044, { status: 9, delivery_position: 2, delivery_datetime_utc: '2099-01-01 12:00:00' })
      ]
      const on = show(rows(), navigation(), jest.fn(), clockOn)
      expect(within(on.getByTestId('route-stop-2-late')).getByText(`12 min late · due${NBSP}12:00`)).toBeTruthy()
      on.unmount()
      act(() => clearRouteSource())
      const off = show(rows(), navigation(), jest.fn(), clockOff)
      expect(within(off.getByTestId('route-stop-2-late')).getByText('12 min late')).toBeTruthy()
    })

    it('is not written where the order card writes no time', () => {
      freezeClock(new Date('2099-01-01T12:12:00').getTime())
      const screen = show([order(1039, { status: 9, delivery_position: 1 }), order(1044, { status: 9, delivery_position: 2, delivery_datetime_utc: '2099-01-01 12:00:00' })])
      expect(screen.queryByTestId('route-stop-2-late')).toBeNull()
    })
  })

  it('ends with the note on the delivery positions', () => {
    const screen = show(orders())
    expect(screen.getByTestId('route-stops-note').props.children).toBe("The stops follow each order's delivery position. Change a position on its order to change the route.")
  })

  it('follows the list: a stop that goes away, and says so when the last one does', () => {
    const screen = show(orders())
    act(() => publishRouteSource({ rows: [order(1039, { status: 9, delivery_position: 1 })], changeOrderStatus: jest.fn() }))
    expect(screen.queryByTestId('route-stop-2')).toBeNull()
    act(() => publishRouteSource({ rows: [], changeOrderStatus: jest.fn() }))
    expect(screen.getByText('No orders in progress')).toBeTruthy()
    expect(screen.queryByTestId('route-stops-list')).toBeNull()
  })
})
