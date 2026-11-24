import '../../../../../../jest/helpers/uiModuleMocks'
import React from 'react'
import { act, fireEvent } from '@testing-library/react-native'

import { useConfig } from '@components'

jest.mock('../../../providers/StoreUtil', () => ({
  _retrieveStoreData: jest.fn().mockResolvedValue(null),
  _setStoreData: jest.fn(),
  _removeStoreData: jest.fn()
}))

jest.mock('@ui', () => {
  const { pickUi } = require('../../../../../../jest/helpers/uiModuleMocks')
  const { buildD3OrdersIntegrationUiMock } = require('../../../../../../jest/helpers/d3OrdersUiMock')
  return pickUi(buildD3OrdersIntegrationUiMock(), ['NotificationSetting', 'WebsocketStatus', 'useOfflineActions', 'ReviewCustomer', 'useLocation'])
})

jest.mock('../../../../../context/SocketReconnectContext', () => ({ useOnReconnect: () => {} }))

jest.mock('@components', () => {
  const { getMock } = require('../../../../../../jest/helpers/d3OrdersComponentsMock')
  return getMock()
})

jest.mock('../../../../../context/PermissionsContext', () =>
  require('../../../../../../jest/helpers/mockPermissionsContext')
)

import { OrdersOption } from '..'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { resetHoldLatch } from '../../shared/holdLatch'
import { resetListDriverPosition } from '../../../hooks/useListDriverPosition'

const { sampleOrder } = require('../../../../../../jest/helpers/d3OrdersDefaults')
const { holdMs, tapPress } = require('../../../../../../jest/helpers/holdPress')
const { useLocation } = require('@ui')

const open = (status: number, extra: any = {}) => ({
  ...sampleOrder,
  id: 101,
  status,
  delivery_type: 1,
  business: { name: 'Store A', logo: null, address: '214 Harbor St', location: { lat: 40.7228, lng: -74.006 } },
  customer: { name: 'Jane', address: '9 Birch Rd', location: { lat: 40.8, lng: -74.006 } },
  ...extra
})

const entry = (orders: any[], loading: boolean, filter: number[]) => ({
  orders,
  loading,
  fetched: !loading,
  defaultFilter: filter,
  currentFilter: filter,
  pagination: { currentPage: 1, pageSize: 10, totalPages: 1, total: loading ? null : orders.length }
})

/** The orders tab as the controller gives it (these are accepted orders: In Progress): `loading` is what a load that keeps the orders it had sets. */
const tab = (orders: any[], loading: boolean, props: any = {}) => (
  <OrdersOption
    isDriverApp
    currentTabSelected='inProgress'
    ordersGroup={{
      pending: entry([], false, [0, 13]),
      inProgress: entry(orders, loading, [3, 4, 7, 8, 9, 14, 18, 19, 20, 21, 22, 23, 24, 25, 26]),
      completed: entry([], false, [1]),
      cancelled: entry([], false, [2])
    }}
    {...props}
  />
)

const driverAt = (latitude: number, longitude: number, getCurrentLocation = jest.fn().mockResolvedValue({ latitude, longitude })) => ({
  userLocation: { latitude, longitude, timestamp: 1 },
  getCurrentLocation,
  followUserLocation: jest.fn(),
  stopFollowUserLocation: jest.fn()
})

describe('OrdersOption: the card\'s list keeps what it shows while it loads', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetHoldLatch()
    resetListDriverPosition()
    const { offlineActionsState } = require('../../../../../../jest/helpers/d3OrdersUiMock')
    offlineActionsState.isNetConnected = true
    offlineActionsState.isCombinedTabs = false
    offlineActionsState.actions = {}
    offlineActionsState.canSaveChangesOffline = false
    ;(useConfig as jest.Mock).mockReturnValue([{ configs: { allow_driver_reject_order: { value: '1' }, failed_pickup_by_driver_enabled: { value: '1' } } }])
    ;(useLocation as jest.Mock).mockReturnValue(driverAt(0, 0))
  })
  afterEach(() => {
    jest.useRealTimers()
    resetHoldLatch()
  })

  describe('the rows stay while the list loads again (a change of the driver\'s own, a pull to refresh, the socket)', () => {
    it('keeps the cards, and draws no skeleton, while the controller marks the list as loading', () => {
      const screen = renderWithProviders(tab([open(8)], true))
      expect(screen.getByText('Arrived to business')).toBeTruthy()
      expect(screen.getByTestId('order-card-101')).toBeTruthy()
      expect(screen.queryByTestId('order-list-skeleton')).toBeNull()
    })

    it('is the same card, not a new one, from the load to its end: the loading flag goes up and down over it', () => {
      const screen = renderWithProviders(tab([open(8)], false))
      const before = screen.getByTestId('order-card-101')
      screen.rerender(tab([open(8)], true))
      expect(screen.getByTestId('order-card-101')).toBe(before)
      screen.rerender(tab([open(8)], false))
      expect(screen.getByTestId('order-card-101')).toBe(before)
    })

    it('draws the skeleton for a first load, a list with nothing to show yet', () => {
      const screen = renderWithProviders(tab([], true))
      expect(screen.getByTestId('order-list-skeleton')).toBeTruthy()
    })

    it('keeps the assign requests while they load again', () => {
      const request = { ...sampleOrder, id: 909, isLogistic: true, order: { ...sampleOrder, id: 202 }, locked: false }
      const screen = renderWithProviders(
        <OrdersOption
          isDriverApp
          currentTabSelected='logisticOrders'
          logisticOrders={{ orders: [request], loading: true, error: [] }}
          handleClickLogisticOrder={jest.fn()}
          onNavigationRedirect={jest.fn()}
        />
      )
      expect(screen.getByText('Accept')).toBeTruthy()
      expect(screen.queryByTestId('order-list-skeleton')).toBeNull()
    })

    it('shows the empty state once a list that loaded has nothing, and the rows that the finger holds until it lifts', () => {
      const screen = renderWithProviders(tab([], false))
      expect(screen.queryByTestId('order-list-skeleton')).toBeNull()
      expect(screen.getByText('No orders in progress')).toBeTruthy()
    })
  })

  describe('after a held step, whose answer loads the list again with the finger still on the button', () => {
    it('keeps the pressed button where it is (not even the loading takes it), and the very next tap reaches the next button', async () => {
      const onNavigationRedirect = jest.fn()
      const handleChangeOrderStatus = jest.fn().mockResolvedValue([{ id: 101 }])
      const props = { handleChangeOrderStatus, onNavigationRedirect }
      const screen = renderWithProviders(tab([open(8)], false, props))
      const button = screen.getByText('Arrived to business')

      jest.useFakeTimers()
      fireEvent(button, 'pressIn')
      await act(async () => { jest.advanceTimersByTime(holdMs()) })
      expect(handleChangeOrderStatus).toHaveBeenCalledWith(3, [101])
      // The controller answers: the order is at the store and the list is loading again, with the finger still down.
      screen.rerender(tab([open(3)], true, props))
      expect(screen.getByText('Arrived to business')).toBe(button)
      expect(screen.queryByTestId('order-list-skeleton')).toBeNull()
      // The finger lifts: the list shows what it holds now.
      await act(async () => {
        fireEvent(button, 'pressOut')
        fireEvent.press(button)
      })
      jest.useRealTimers()
      screen.rerender(tab([open(3)], false, props))
      expect(screen.queryByText('Arrived to business')).toBeNull()
      // The next tap, on a button that was not there before the step, is not lost.
      tapPress(screen.getByText('Pickup failed'))
      expect(onNavigationRedirect).toHaveBeenCalledTimes(1)
      expect(onNavigationRedirect).toHaveBeenCalledWith('AcceptOrRejectOrder', expect.objectContaining({ action: 'pickupFailed', ids: [101] }))
    })

    it('keeps the card of the last order of the tab where it is while the finger is down on its button (the answer moves it to another tab)', async () => {
      const handleChangeOrderStatus = jest.fn().mockResolvedValue([{ id: 101 }])
      const props = { handleChangeOrderStatus, onNavigationRedirect: jest.fn() }
      const screen = renderWithProviders(tab([open(26)], false, props))
      const button = screen.getByText('Delivery complete')
      jest.useFakeTimers()
      fireEvent(button, 'pressIn')
      await act(async () => { jest.advanceTimersByTime(holdMs()) })
      screen.rerender(tab([], false, props))
      // The tab has no order now, but the button the finger is on is still there, and so is no empty state.
      expect(screen.getByText('Delivery complete')).toBe(button)
      expect(screen.queryByText('No orders in progress')).toBeNull()
      await act(async () => {
        fireEvent(button, 'pressOut')
        fireEvent.press(button)
      })
      expect(screen.queryByText('Delivery complete')).toBeNull()
      expect(screen.getByText('No orders in progress')).toBeTruthy()
    })
  })

  describe('the distance: the last position known, read again each time the list loads', () => {
    const distance = (screen: any) => screen.queryByTestId('order-card-distance')

    it('is there from the position the screen reads, and kept when the position reads "none" for a moment', () => {
      ;(useLocation as jest.Mock).mockReturnValue(driverAt(40.7128, -74.006))
      const screen = renderWithProviders(tab([open(3)], false))
      expect(distance(screen)).not.toBeNull()
      ;(useLocation as jest.Mock).mockReturnValue(driverAt(0, 0))
      screen.rerender(tab([open(3)], true))
      expect(distance(screen)).not.toBeNull()
      screen.rerender(tab([open(3)], false))
      expect(distance(screen)).not.toBeNull()
    })

    it('follows the driver: the distance changes when the position does, with no remount of the list', () => {
      ;(useLocation as jest.Mock).mockReturnValue(driverAt(40.7128, -74.006))
      const screen = renderWithProviders(tab([open(3)], false))
      const first = distance(screen).props.children
      ;(useLocation as jest.Mock).mockReturnValue(driverAt(40.7228, -74.006))
      screen.rerender(tab([open(3)], false))
      expect(distance(screen).props.children).not.toBe(first)
    })

    it('reads the position again when the list reloads: the refresh button and the screen\'s focus (no watch, no timer)', () => {
      const getCurrentLocation = jest.fn().mockResolvedValue({ latitude: 40.7, longitude: -74 })
      ;(useLocation as jest.Mock).mockReturnValue(driverAt(40.7128, -74.006, getCurrentLocation))
      const listeners: Record<string, () => void> = {}
      const navigation = { navigate: jest.fn(), setParams: jest.fn(), addListener: jest.fn((event: string, callback: () => void) => { listeners[event] = callback; return jest.fn() }) }
      const loadOrders = jest.fn()
      const screen = renderWithProviders(tab([open(3)], false, { navigation, loadOrders }))
      expect(getCurrentLocation).not.toHaveBeenCalled()
      fireEvent.press(screen.getByLabelText('Refresh'))
      expect(loadOrders).toHaveBeenCalledTimes(1)
      expect(getCurrentLocation).toHaveBeenCalledTimes(1)
      act(() => { listeners.focus() })
      expect(getCurrentLocation).toHaveBeenCalledTimes(2)
      expect(useLocation.mock.results[0].value.followUserLocation).not.toHaveBeenCalled()
    })

    it('keeps the previous position when the read fails', async () => {
      const getCurrentLocation = jest.fn().mockRejectedValue({ err: 'timeout' })
      ;(useLocation as jest.Mock).mockReturnValue(driverAt(40.7128, -74.006, getCurrentLocation))
      const screen = renderWithProviders(tab([open(3)], false, { loadOrders: jest.fn() }))
      await act(async () => { fireEvent.press(screen.getByLabelText('Refresh')) })
      expect(getCurrentLocation).toHaveBeenCalledTimes(1)
      expect(distance(screen)).not.toBeNull()
    })
  })
})
