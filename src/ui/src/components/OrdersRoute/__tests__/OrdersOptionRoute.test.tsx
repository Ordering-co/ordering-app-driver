import '../../../../../../jest/helpers/uiModuleMocks'
import React from 'react'
import { StyleSheet } from 'react-native'
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
jest.mock('@components', () => require('../../../../../../jest/helpers/d3OrdersComponentsMock').getMock())
jest.mock('../../../../../context/PermissionsContext', () => require('../../../../../../jest/helpers/mockPermissionsContext'))

import { OrdersOption } from '../../OrdersOption'
import { clearRouteSource, currentRouteSource } from '../routeSource'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { buildAppTheme, THEME_PRODUCT_TYPE } from '../../../../../theme/engine'
import { resetListDriverPosition } from '../../../hooks/useListDriverPosition'
import { order } from './fixtures'

const { useLocation } = require('@ui')
const { offlineActionsState } = require('../../../../../../jest/helpers/d3OrdersUiMock')
const themeWith = (values: any) => buildAppTheme({ version: 2, product_type: THEME_PRODUCT_TYPE, values })

const entry = (orders: any[], filter: number[]) => ({
  orders,
  loading: false,
  fetched: true,
  defaultFilter: filter,
  currentFilter: filter,
  pagination: { currentPage: 1, pageSize: 10, totalPages: 1, total: orders.length }
})
const IN_PROGRESS = [3, 4, 7, 8, 9, 14, 18, 19, 20, 21, 22, 23, 24, 25, 26]

/** The Orders tab on In Progress, as the controller hands its lists. */
const tab = (orders: any[], props: any = {}) => (
  <OrdersOption
    isDriverApp
    currentTabSelected='inProgress'
    ordersGroup={{
      pending: entry([], [0, 13]),
      inProgress: entry(orders, IN_PROGRESS),
      completed: entry([], [1]),
      cancelled: entry([], [2])
    }}
    onNavigationRedirect={jest.fn()}
    {...props}
  />
)

describe('the route\'s entry in the Orders list', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    clearRouteSource()
    resetListDriverPosition()
    offlineActionsState.isNetConnected = true
    offlineActionsState.isCombinedTabs = false
    offlineActionsState.actions = {}
    offlineActionsState.canSaveChangesOffline = false
    ;(useConfig as jest.Mock).mockReturnValue([{ configs: { allow_driver_reject_order: { value: '1' } } }])
    ;(useLocation as jest.Mock).mockReturnValue({ userLocation: { latitude: 0, longitude: 0 }, getCurrentLocation: jest.fn().mockResolvedValue({ latitude: 0, longitude: 0 }), followUserLocation: jest.fn(), stopFollowUserLocation: jest.fn() })
  })
  afterEach(() => { act(() => clearRouteSource()) })

  describe('the list\'s skeleton has the button\'s slot where the list will have the button', () => {
    const group = (loadingList: 'pending' | 'inProgress' | 'completed') => ({
      pending: { ...entry([], [0, 13]), loading: loadingList === 'pending', fetched: false },
      inProgress: { ...entry([], IN_PROGRESS), loading: loadingList === 'inProgress', fetched: false },
      completed: { ...entry([], [1]), loading: loadingList === 'completed', fetched: false },
      cancelled: entry([], [2])
    })
    const loadingTab = (view: string, list: 'pending' | 'inProgress' | 'completed', themeOverrides?: any) =>
      renderWithProviders(
        <OrdersOption isDriverApp currentTabSelected={view} ordersGroup={group(list)} onNavigationRedirect={jest.fn()} />,
        themeOverrides ? { themeOverrides } : undefined
      )

    it('starts the In Progress skeleton with a bone as tall as the entry button, so the first card does not move when the list arrives', () => {
      const loading = loadingTab('inProgress', 'inProgress')
      const bone = loading.getByTestId('order-list-skeleton-route')
      const height = StyleSheet.flatten(bone.props.style).height
      loading.unmount()
      // The real button of the list that arrived: the same height.
      const loaded = renderWithProviders(tab([order(1042, { delivery_position: 1 })]))
      const minHeights = loaded.getByTestId('orders-route-entry').findAll((node: any) => typeof node.type === 'string' && typeof StyleSheet.flatten(node.props.style)?.minHeight === 'number')
        .map((node: any) => StyleSheet.flatten(node.props.style).minHeight)
      expect(minHeights).toContain(height)
    })

    it('has none in Assigned, in History or in the combined Active tab, whose lists have no such button', () => {
      expect(loadingTab('pending', 'pending').queryByTestId('order-list-skeleton-route')).toBeNull()
      expect(loadingTab('completed', 'completed').queryByTestId('order-list-skeleton-route')).toBeNull()
      offlineActionsState.isCombinedTabs = true
      ;(useConfig as jest.Mock).mockReturnValue([{ configs: { combine_pending_and_progress_orders: { value: '1' } } }])
      const active = renderWithProviders(
        <OrdersOption isDriverApp currentTabSelected='active' onNavigationRedirect={jest.fn()} ordersGroup={{
          active: { ...entry([], [0, 3]), loading: true, fetched: false },
          completed: entry([], [1]),
          cancelled: entry([], [2])
        }} />
      )
      expect(active.queryByTestId('order-list-skeleton')).toBeTruthy()
      expect(active.queryByTestId('order-list-skeleton-route')).toBeNull()
    })

    it('has none when the theme hides the route (orders.route)', () => {
      expect(loadingTab('inProgress', 'inProgress', themeWith({ visibility: { 'orders.route': false } })).queryByTestId('order-list-skeleton-route')).toBeNull()
    })
  })

  it('is the header of the In Progress list: one button above the first card, "Route · N stops"', () => {
    const screen = renderWithProviders(tab([order(1042, { delivery_position: 1 }), order(1044, { status: 9, delivery_position: 2 })]))
    expect(screen.getByTestId('orders-route-entry')).toBeTruthy()
    expect(screen.getByText('Route · 3 stops')).toBeTruthy()
    // Above the first card, in the same scroll.
    const inOrder = screen.getAllByTestId(/^(orders-route-entry|order-card-1042)$/).map((node) => node.props.testID)
    expect(inOrder).toEqual(['orders-route-entry', 'order-card-1042'])
  })

  it('opens the route', () => {
    const onNavigationRedirect = jest.fn()
    const screen = renderWithProviders(tab([order(1042)], { onNavigationRedirect }))
    fireEvent.press(screen.getByTestId('orders-route-entry'))
    expect(onNavigationRedirect).toHaveBeenCalledWith('OrdersRoute')
  })

  it('is not there with no order in progress, and goes when the last one is delivered', () => {
    const screen = renderWithProviders(tab([order(1042)]))
    expect(screen.getByTestId('orders-route-entry')).toBeTruthy()
    screen.rerender(tab([]))
    expect(screen.queryByTestId('orders-route-entry')).toBeNull()
    expect(currentRouteSource().rows).toEqual([])
  })

  it('is not there when the theme hides the route', () => {
    const screen = renderWithProviders(tab([order(1042)]), { themeOverrides: themeWith({ visibility: { 'orders.route': false } }) })
    expect(screen.queryByTestId('orders-route-entry')).toBeNull()
    expect(screen.getByTestId('order-card-1042')).toBeTruthy()
  })

  it('is not on the Assigned tab: its orders are not the route\'s', () => {
    const screen = renderWithProviders(tab([order(1042, { status: 7 })], { currentTabSelected: 'pending' }))
    expect(screen.queryByTestId('orders-route-entry')).toBeNull()
  })

  it('hands the route the rows the list shows, and the list\'s own status change', () => {
    const handleChangeOrderStatus = jest.fn().mockResolvedValue([{ id: 1042 }])
    renderWithProviders(tab([order(1042), order(1044, { status: 9 })], { handleChangeOrderStatus }))
    const handed = currentRouteSource()
    expect(JSON.stringify(handed.rows)).toContain('1042')
    expect(JSON.stringify(handed.rows)).toContain('1044')
    handed.changeOrderStatus?.(3, [1042])
    expect(handleChangeOrderStatus).toHaveBeenCalledWith(3, [1042])
  })

  it('gives the route the same orders the card shows, with the queue\'s stage the list put on them', () => {
    offlineActionsState.actions = { 1042: [{ event: 'update_order', data: { orderId: 1042, body: { status: 9 } } }] }
    renderWithProviders(tab([order(1042, { status: 8 })]))
    const rows = JSON.parse(JSON.stringify(currentRouteSource().rows)).flat(3)
    expect(rows.find((row: any) => row?.id === 1042)?.status).toBe(9)
  })

  it('takes the route\'s source back when the list goes away', () => {
    const screen = renderWithProviders(tab([order(1042)]))
    expect(currentRouteSource().rows.length).toBeGreaterThan(0)
    screen.unmount()
    expect(currentRouteSource().rows).toEqual([])
  })
})
