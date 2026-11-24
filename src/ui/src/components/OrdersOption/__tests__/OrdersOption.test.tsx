import '../../../../../../jest/helpers/uiModuleMocks'
import React from 'react'
import { Modal, ScrollView, StyleSheet } from 'react-native'
import { act, fireEvent, waitFor, within } from '@testing-library/react-native'

import { useConfig } from '@components'

jest.mock('../../../providers/StoreUtil', () => ({
  _retrieveStoreData: jest.fn().mockResolvedValue(null),
  _setStoreData: jest.fn(),
  _removeStoreData: jest.fn()
}))

// The new order alert is not the tab's: the authed navigator mounts it once (its own suite and `HomeNavigator`'s cover
// it). A stand-in that records its mounts proves the tab does not render one.
const mockAlertMounts: any[] = []

jest.mock('@ui', () => {
  const { pickUi } = require('../../../../../../jest/helpers/uiModuleMocks')
  const { buildD3OrdersIntegrationUiMock } = require('../../../../../../jest/helpers/d3OrdersUiMock')
  const mock = {
    ...buildD3OrdersIntegrationUiMock(),
    NewOrderNotification: (props: any) => { mockAlertMounts.push(props); return null }
  }
  return pickUi(mock, ['NotificationSetting', 'WebsocketStatus', 'useOfflineActions', 'ReviewCustomer'])
})

// What the tab does when the app has to catch up: the provider's own suite covers when it is told.
let mockReconnect: (() => void) | undefined
jest.mock('../../../../../context/SocketReconnectContext', () => ({
  useOnReconnect: (handler: () => void) => { mockReconnect = handler }
}))

jest.mock('@components', () => {
  const { getMock } = require('../../../../../../jest/helpers/d3OrdersComponentsMock')
  return getMock()
})

import { OrdersOption } from '..'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { buildAppTheme, defaultAppTheme, THEME_PRODUCT_TYPE } from '../../../../../theme/engine'
import { orderStatusList } from '../../../utils'

/** The tab of the screen with this name (a chip is a button, never a tab). */
const tabNamed = (screen: any, name: string) => screen.queryAllByRole('tab').find((tab: any) => within(tab).queryByText(name))

/** A theme built from values, as the app builds it (never a spread). */
const themeWith = (values: any) => buildAppTheme({ version: 2, product_type: THEME_PRODUCT_TYPE, values })

describe('OrdersOption', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    const { offlineActionsState } = require('../../../../../../jest/helpers/d3OrdersUiMock')
    offlineActionsState.isNetConnected = true
    offlineActionsState.isCombinedTabs = false
    offlineActionsState.combinedTabsRead = true
    offlineActionsState.actions = {}
    ;(useConfig as jest.Mock).mockReturnValue([{ configs: {} }])
  })

  it('renders orders header for business app', () => {
    const { getByText } = renderWithProviders(<OrdersOption isDriverApp />)
    expect(getByText('My orders')).toBeTruthy()
  })

  it('carries the page gutter on the list\'s content, not its frame, with `md` between the cards (decision H8)', () => {
    const { UNSAFE_getAllByType, getByTestId } = renderWithProviders(<OrdersOption isDriverApp />)
    const list = UNSAFE_getAllByType(ScrollView).find((node: any) => node.props.refreshControl)!
    // A frame with a gutter would clip the side shadow of a card.
    expect(StyleSheet.flatten(list.props.style).paddingHorizontal).toBeUndefined()
    const content = StyleSheet.flatten(list.props.contentContainerStyle)
    expect(content.paddingHorizontal).toBe(20)
    expect(content.gap).toBe(15)
    // What sits outside the scroll (the tabs) has the gutter itself; the header has its own room.
    expect(StyleSheet.flatten(getByTestId('orders-tabs').props.style).paddingStart).toBe(20)
  })

  it('renders previous orders when orders exist', () => {
    const { getByText } = renderWithProviders(<OrdersOption isDriverApp />)
    expect(getByText('Store A')).toBeTruthy()
  })

  it("names a card's status with the app's one list of status names (decision H1)", () => {
    const { sampleOrder, ordersGroupOf } = require('../../../../../../jest/helpers/d3OrdersDefaults')
    const t = (_key: string, fallback?: string) => fallback ?? _key
    const names = orderStatusList(t)
    const orders = names.map((status) => ({ ...sampleOrder, id: 500 + status.key, status: status.key }))
    // Every status the list knows is written with the list's name, whatever the controller's own list says: the open ones in the
    // open tabs, the finished ones in History.
    const written = (key: string, filter?: string) => {
      const screen = renderWithProviders(<OrdersOption isDriverApp ordersGroup={ordersGroupOf(orders)} currentTabSelected={key} />)
      if (filter) fireEvent.press(screen.getByTestId(`orders-history-${filter}`))
      const out = screen.queryAllByTestId('order-card-status').map((status) => status.props.children)
      screen.unmount()
      return out
    }
    const open = [...written('pending'), ...written('inProgress')]
    const finished = [...written('completed'), ...written('cancelled')]
    const nameOf = (key: number) => names.find((status) => status.key === key)!.text
    const openKeys = names.map((status) => status.key).filter((key) => [0, 13, 3, 4, 7, 8, 9, 14, 18, 19, 20, 21, 22, 23, 24, 25, 26].includes(key))
    const finishedKeys = names.map((status) => status.key).filter((key) => [1, 11, 15, 2, 5, 6, 10, 12, 16, 17].includes(key))
    expect([...open].sort()).toEqual(openKeys.map(nameOf).sort())
    expect([...finished].sort()).toEqual(finishedKeys.map(nameOf).sort())
    expect(names.find((status) => status.key === 4)?.text).toBe('Ready for pickup')
    expect(names.find((status) => status.key === 5)?.text).toBe('Rejected by business')
  })

  it('opens History, and its Cancelled chip asks the controller for the cancelled list', () => {
    const setCurrentTabSelected = jest.fn()
    const { getByText, getByTestId } = renderWithProviders(
      <OrdersOption isDriverApp setCurrentTabSelected={setCurrentTabSelected} />
    )
    fireEvent.press(getByText('History'))
    fireEvent.press(getByTestId('orders-history-cancelled'))
    expect(setCurrentTabSelected).toHaveBeenLastCalledWith('cancelled')
  })

  it('loads orders on refresh', () => {
    const loadOrders = jest.fn()
    const { getByLabelText } = renderWithProviders(
      <OrdersOption isDriverApp loadOrders={loadOrders} />
    )
    fireEvent.press(getByLabelText('Refresh'))
    expect(loadOrders).toHaveBeenCalledWith({ newFetch: true }, { allStatusses: false })
  })

  it('opens History on its two lists, completed first', () => {
    const setCurrentTabSelected = jest.fn()
    const { getByText } = renderWithProviders(
      <OrdersOption isDriverApp setCurrentTabSelected={setCurrentTabSelected} />
    )
    fireEvent.press(getByText('History'))
    expect(setCurrentTabSelected).toHaveBeenLastCalledWith('completed')
  })

  it('opens search modal from filter icon', () => {
    const { getByPlaceholderText, getByLabelText } = renderWithProviders(<OrdersOption isDriverApp />)
    fireEvent.press(getByLabelText('Search orders'))
    expect(getByPlaceholderText('Order number')).toBeTruthy()
  })

  it('shows notification setting stub', () => {
    const { getByTestId } = renderWithProviders(
      <OrdersOption isDriverApp checkNotification />
    )
    expect(getByTestId('notification-setting-stub')).toBeTruthy()
  })

  it('loads more orders when pagination allows', () => {
    const loadMoreOrders = jest.fn()
    const { getByText } = renderWithProviders(
      <OrdersOption isDriverApp loadMoreOrders={loadMoreOrders} />
    )
    fireEvent.press(getByText('Load more orders'))
    expect(loadMoreOrders).toHaveBeenCalledWith({ allStatusses: false })
  })

  it('applies search filters from modal', () => {
    const onFiltered = jest.fn()
    const { getByText, getByLabelText } = renderWithProviders(
      <OrdersOption isDriverApp onFiltered={onFiltered} />
    )
    fireEvent.press(getByLabelText('Search orders'))
    fireEvent.press(getByText('Search'))
    expect(onFiltered).toHaveBeenCalled()
  })

  it('shows SLA filter in search modal when enterprise plan is enabled', () => {
    ;(useConfig as jest.Mock).mockReturnValue([{
      configs: { plan_enterprise: { value: '1' } }
    }])
    const { getAllByText, getByLabelText } = renderWithProviders(<OrdersOption isDriverApp />)
    fireEvent.press(getByLabelText('Search orders'))
    expect(getAllByText(/SLA.s/).length).toBeGreaterThan(0)
  })

  it('shows empty state when pending tab has no orders', () => {
    const { getByText, getByTestId } = renderWithProviders(
      <OrdersOption
        isDriverApp
        ordersGroup={{
          pending: { orders: [], loading: false, defaultFilter: [0], currentFilter: [0], pagination: { currentPage: 1, pageSize: 10, totalPages: 1, total: 0 } },
          inProgress: { orders: [], loading: false, defaultFilter: [3], currentFilter: [3], pagination: { currentPage: 1, pageSize: 10, totalPages: 1, total: 0 } },
          completed: { orders: [], loading: false, defaultFilter: [1], currentFilter: [1], pagination: { currentPage: 1, pageSize: 10, totalPages: 1, total: 0 } },
          cancelled: { orders: [], loading: false, defaultFilter: [2], currentFilter: [2], pagination: { currentPage: 1, pageSize: 10, totalPages: 1, total: 0 } }
        }}
      />
    )
    expect(getByText('No orders assigned')).toBeTruthy()
    // No bundled picture: the empty state's icon.
    expect(getByTestId('not-found-icon')).toBeTruthy()
  })

  it('shows the server error when the orders request fails', () => {
    const { getByText, queryByText } = renderWithProviders(
      <OrdersOption
        isDriverApp
        ordersGroup={{
          pending: {
            orders: [],
            loading: false,
            error: [{ message: 'Server error' }],
            defaultFilter: [0],
            currentFilter: [0],
            pagination: { currentPage: 1, pageSize: 10, totalPages: 1, total: 0 }
          }
        }}
      />
    )
    expect(getByText('Server error')).toBeTruthy()
    expect(queryByText('Sorry, no results found')).toBeNull()
  })

  it('shows the network error when the driver is offline', async () => {
    const { offlineActionsState } = require('../../../../../../jest/helpers/d3OrdersUiMock')
    offlineActionsState.isNetConnected = false
    const { findByText, queryByText } = renderWithProviders(
      <OrdersOption
        isDriverApp
        isNetConnected={false}
        ordersGroup={{
          pending: {
            orders: [],
            loading: false,
            error: [],
            defaultFilter: [0],
            currentFilter: [0],
            pagination: { currentPage: 1, pageSize: 10, totalPages: 1, total: 0 }
          }
        }}
      />
    )
    expect(await findByText('Network Error')).toBeTruthy()
    expect(queryByText('Sorry, no results found')).toBeNull()
  })

  it('switches to in progress tab', () => {
    const setCurrentTabSelected = jest.fn()
    const { getByText } = renderWithProviders(
      <OrdersOption isDriverApp setCurrentTabSelected={setCurrentTabSelected} />
    )
    fireEvent.press(getByText('In Progress'))
    // The tab asks nothing more of the controller than the list that holds its orders.
    expect(setCurrentTabSelected).toHaveBeenLastCalledWith('inProgress')
  })

  it('shows pending sync count when offline actions exist', async () => {
    const { offlineActionsState } = require('../../../../../../jest/helpers/d3OrdersUiMock')
    const { _retrieveStoreData } = require('../../../providers/StoreUtil')
    offlineActionsState.isNetConnected = false
    offlineActionsState.actions = { 101: { id: 101 } }
    _retrieveStoreData.mockImplementation((key: string) => {
      if (key === 'last_date_connection') return Promise.resolve('2026-01-01')
      if (key === 'allow_save_changes_offline') return Promise.resolve(true)
      return Promise.resolve(null)
    })
    const { findByText } = renderWithProviders(
      <OrdersOption isDriverApp isNetConnected={false} />
    )
    expect(await findByText(/1 changes pending sync/i)).toBeTruthy()
  })

  it('clears search from modal', () => {
    const onFiltered = jest.fn()
    const { getByText, getByLabelText } = renderWithProviders(
      <OrdersOption isDriverApp onFiltered={onFiltered} />
    )
    fireEvent.press(getByLabelText('Search orders'))
    fireEvent.press(getByText('Clear search'))
    expect(onFiltered).toHaveBeenCalledWith(null)
  })

  describe('the clear buttons of the search modal', () => {
    const fields = [
      { name: 'order number', placeholder: 'Order number', clearId: 'orders-search-id-clear' },
      { name: 'external id', placeholder: 'External id', clearId: 'orders-search-external-clear' }
    ]

    it.each(fields)('offers none on the $name while it is empty, and one once it has a text', ({ placeholder, clearId }) => {
      const { getByLabelText, getByPlaceholderText, queryByTestId } = renderWithProviders(<OrdersOption isDriverApp />)
      fireEvent.press(getByLabelText('Search orders'))
      expect(queryByTestId(clearId)).toBeNull()
      fireEvent.changeText(getByPlaceholderText(placeholder), '1234')
      expect(queryByTestId(clearId)).not.toBeNull()
    })

    it.each(fields)('empties the $name when its clear button is pressed (and the button goes)', ({ placeholder, clearId }) => {
      const { getByLabelText, getByPlaceholderText, getByTestId, queryByTestId } = renderWithProviders(<OrdersOption isDriverApp />)
      fireEvent.press(getByLabelText('Search orders'))
      fireEvent.changeText(getByPlaceholderText(placeholder), '1234')
      expect(getByPlaceholderText(placeholder).props.value).toBe('1234')
      fireEvent.press(getByTestId(clearId))
      expect(getByPlaceholderText(placeholder).props.value).toBe('')
      expect(queryByTestId(clearId)).toBeNull()
    })

    it('keeps the other field\'s text and button when one is cleared', () => {
      const { getByLabelText, getByPlaceholderText, getByTestId, queryByTestId } = renderWithProviders(<OrdersOption isDriverApp />)
      fireEvent.press(getByLabelText('Search orders'))
      fireEvent.changeText(getByPlaceholderText('Order number'), '1234')
      fireEvent.changeText(getByPlaceholderText('External id'), 'EXT-9')
      fireEvent.press(getByTestId('orders-search-id-clear'))
      expect(queryByTestId('orders-search-id-clear')).toBeNull()
      expect(getByPlaceholderText('External id').props.value).toBe('EXT-9')
      expect(getByTestId('orders-search-external-clear')).toBeTruthy()
    })
  })

  describe('the SLA filter of the search', () => {
    const enterprise = () => (useConfig as jest.Mock).mockReturnValue([{ configs: { plan_enterprise: { value: '1' } } }])
    const open = (props: any = {}) => {
      const screen = renderWithProviders(<OrdersOption isDriverApp {...props} />)
      fireEvent.press(screen.getByLabelText('Search orders'))
      return screen
    }

    it('is a chip for each time state, with the state\'s dot, on the enterprise plan', () => {
      enterprise()
      const { getByTestId, getByText, getAllByText } = open()
      expect(getAllByText(/SLA.s/).length).toBeGreaterThan(0)
      for (const [state, name] of [['in_time', 'Ok'], ['at_risk', 'At Risk'], ['delayed', 'Delayed']]) {
        expect(within(getByTestId(`orders-sla-${state}`)).getByText(name)).toBeTruthy()
      }
      expect(getByText('Search')).toBeTruthy()
    })

    it('does not exist off the enterprise plan', () => {
      const { queryByTestId, queryByText } = open()
      expect(queryByTestId('orders-sla-chips')).toBeNull()
      expect(queryByText(/SLA.s/)).toBeNull()
    })

    it('selects a state, changes to another and clears when the selected one is pressed again; the search sends it', () => {
      enterprise()
      const onFiltered = jest.fn()
      const { getByTestId, getByText } = open({ onFiltered })
      const selected = (state: string) => getByTestId(`orders-sla-${state}`).props.accessibilityState.selected
      fireEvent.press(getByTestId('orders-sla-at_risk'))
      expect(selected('at_risk')).toBe(true)
      expect(selected('in_time')).toBe(false)
      fireEvent.press(getByTestId('orders-sla-delayed'))
      expect(selected('at_risk')).toBe(false)
      expect(selected('delayed')).toBe(true)
      fireEvent.press(getByTestId('orders-sla-delayed'))
      expect(selected('delayed')).toBe(false)
      fireEvent.press(getByTestId('orders-sla-at_risk'))
      fireEvent.press(getByText('Search'))
      expect(onFiltered).toHaveBeenCalledWith(expect.objectContaining({ timeStatus: 'at_risk' }))
    })
  })

  describe('the date filter of the search', () => {
    const open = (props: any = {}) => {
      const screen = renderWithProviders(<OrdersOption isDriverApp {...props} />)
      fireEvent.press(screen.getByLabelText('Search orders'))
      return screen
    }

    it('is a chip for each preset and one for a custom range, no select', () => {
      const { getByTestId, queryByTestId } = open()
      for (const [key, name] of [['today', 'Today'], ['yesterday', 'Yesterday'], ['last_7days', 'Last 7 days'], ['last_30days', 'Last 30 days']]) {
        expect(within(getByTestId(`orders-date-${key}`)).getByText(name)).toBeTruthy()
      }
      expect(within(getByTestId('orders-date-range')).getByText('Custom range')).toBeTruthy()
      expect(queryByTestId('orders-date-select')).toBeNull()
    })

    it('filters by the chosen preset, as the select did, and a second press clears it', () => {
      const onFiltered = jest.fn()
      const { getByTestId, getByText } = open({ onFiltered })
      fireEvent.press(getByTestId('orders-date-yesterday'))
      expect(getByTestId('orders-date-yesterday').props.accessibilityState.selected).toBe(true)
      fireEvent.press(getByTestId('orders-date-today'))
      expect(getByTestId('orders-date-yesterday').props.accessibilityState.selected).toBe(false)
      fireEvent.press(getByTestId('orders-date-yesterday'))
      fireEvent.press(getByTestId('orders-date-yesterday'))
      expect(getByTestId('orders-date-yesterday').props.accessibilityState.selected).toBe(false)
      fireEvent.press(getByTestId('orders-date-yesterday'))
      fireEvent.press(getByText('Search'))
      expect(onFiltered).toHaveBeenLastCalledWith(expect.objectContaining({
        date: { from: expect.stringMatching(/ 00:00:00$/), to: expect.stringMatching(/ 23:59:59$/) }
      }))
    })

    it('lays the search out in the order of the mockup: the number, the external id, the date, the city, each under its label', () => {
      const { getAllByText, getByText } = open()
      const labels = ['Order number', 'External id', 'Date', 'City'].map((label) => getByText(label))
      expect(labels).toHaveLength(4)
      expect(getAllByText('Order number')).toHaveLength(1)
    })
  })

  describe('the assign requests\' button beside the tabs', () => {
    it('is there when the project has the logistic module and tabs apart, and opens the requests', () => {
      const setCurrentTabSelected = jest.fn()
      const { getByTestId } = renderWithProviders(
        <OrdersOption isDriverApp isLogisticActivated setCurrentTabSelected={setCurrentTabSelected} />
      )
      fireEvent.press(getByTestId('orders-logistic-tab'))
      expect(setCurrentTabSelected).toHaveBeenCalledWith('logisticOrders')
    })

    it('is a switch: pressed with the requests open it goes back to the orders tab the driver was on, and again to the requests', () => {
      const setCurrentTabSelected = jest.fn()
      const screen = renderWithProviders(<OrdersOption isDriverApp isLogisticActivated currentTabSelected='inProgress' setCurrentTabSelected={setCurrentTabSelected} />)
      expect(tabNamed(screen, 'In Progress').props.accessibilityState.selected).toBe(true)
      fireEvent.press(screen.getByTestId('orders-logistic-tab'))
      expect(setCurrentTabSelected).toHaveBeenLastCalledWith('logisticOrders')
      // Nothing is selected while the requests are open.
      expect(screen.getAllByRole('tab').filter((tab: any) => tab.props.accessibilityState?.selected)).toHaveLength(0)
      fireEvent.press(screen.getByTestId('orders-logistic-tab'))
      expect(tabNamed(screen, 'In Progress').props.accessibilityState.selected).toBe(true)
      fireEvent.press(screen.getByTestId('orders-logistic-tab'))
      expect(setCurrentTabSelected).toHaveBeenLastCalledWith('logisticOrders')
    })

    it('goes back to the first tab when the requests were the first thing shown', () => {
      const screen = renderWithProviders(
        <OrdersOption isDriverApp isLogisticActivated currentTabSelected='logisticOrders' />
      )
      fireEvent.press(screen.getByTestId('orders-logistic-tab'))
      expect(tabNamed(screen, 'Assigned').props.accessibilityState.selected).toBe(true)
    })

    it('never selects the tab that is already open: the controller marks the list loading on a selection and loads only on a change', () => {
      const setCurrentTabSelected = jest.fn()
      const { getByTestId } = renderWithProviders(
        <OrdersOption isDriverApp isLogisticActivated currentTabSelected='logisticOrders' setCurrentTabSelected={setCurrentTabSelected} />
      )
      fireEvent.press(getByTestId('orders-logistic-tab'))
      expect(setCurrentTabSelected).not.toHaveBeenCalledWith('logisticOrders')
    })

    it('is not there without the logistic module', () => {
      const { queryByTestId } = renderWithProviders(<OrdersOption isDriverApp />)
      expect(queryByTestId('orders-logistic-tab')).toBeNull()
    })

    it('is not there with the combined tabs', async () => {
      ;(useConfig as jest.Mock).mockReturnValue([{ configs: { combine_pending_and_progress_orders: { value: '1' } } }])
      const { findByText, queryByTestId } = renderWithProviders(<OrdersOption isDriverApp isLogisticActivated />)
      await findByText('Active')
      expect(queryByTestId('orders-logistic-tab')).toBeNull()
    })

    it('is painted selected on the requests\' tab and as a plain control on the others', () => {
      const theme = defaultAppTheme()
      const off = renderWithProviders(<OrdersOption isDriverApp isLogisticActivated />)
      expect(StyleSheet.flatten(off.getByTestId('orders-logistic-tab').findByType(require('react-native').View).props.style).backgroundColor)
        .toBe(theme.native.components.button.variants.neutral.solid.background)
      off.unmount()
      const on = renderWithProviders(<OrdersOption isDriverApp isLogisticActivated currentTabSelected='logisticOrders' />)
      expect(StyleSheet.flatten(on.getByTestId('orders-logistic-tab').findByType(require('react-native').View).props.style).backgroundColor)
        .toBe(theme.native.components.button.variants.primary.tonal.background)
    })
  })

  describe('the new order alert', () => {
    it('is not mounted by the tab (the authed navigator mounts it once, over every tab)', () => {
      mockAlertMounts.length = 0
      renderWithProviders(<OrdersOption isDriverApp isLogisticActivated />)
      expect(mockAlertMounts).toHaveLength(0)
    })
  })

  describe('the list the alert asks for (the route\'s params, `tabRequest`)', () => {
    const request = (tabRequest: any, props: any = {}) => {
      const setCurrentTabSelected = jest.fn()
      const navigation = { addListener: jest.fn(() => jest.fn()), setParams: jest.fn() }
      renderWithProviders(
        <OrdersOption isDriverApp navigation={navigation} setCurrentTabSelected={setCurrentTabSelected} tabRequest={tabRequest} {...props} />
      )
      return { setCurrentTabSelected, navigation }
    }

    it('selects the assign requests when the project has them, and says it has consumed the ask', () => {
      const { setCurrentTabSelected, navigation } = request({ show: 'requests', at: 1 }, { isLogisticActivated: true })
      expect(setCurrentTabSelected).toHaveBeenCalledWith('logisticOrders')
      expect(navigation.setParams).toHaveBeenCalledWith({ show: undefined, status: undefined, at: undefined })
    })

    it('loads the requests instead of selecting their tab again when they are already open (the selection alone leaves the list loading for good)', () => {
      const loadLogisticOrders = jest.fn()
      const { setCurrentTabSelected, navigation } = request(
        { show: 'requests', at: 1 },
        { isLogisticActivated: true, currentTabSelected: 'logisticOrders', loadLogisticOrders }
      )
      expect(setCurrentTabSelected).not.toHaveBeenCalled()
      expect(loadLogisticOrders).toHaveBeenCalledTimes(1)
      expect(navigation.setParams).toHaveBeenCalledWith({ show: undefined, status: undefined, at: undefined })
    })

    it('does not select the requests when the project has none', () => {
      const { setCurrentTabSelected } = request({ show: 'requests', at: 1 })
      expect(setCurrentTabSelected).not.toHaveBeenCalled()
    })

    /** The tab the screen is on after the ask. */
    const opened = (tabRequest: any, props: any = {}) => {
      const navigation = { addListener: jest.fn(() => jest.fn()), setParams: jest.fn() }
      const screen = renderWithProviders(<OrdersOption isDriverApp navigation={navigation} tabRequest={tabRequest} {...props} />)
      return ['Assigned', 'In Progress', 'History', 'Active'].find((name) => tabNamed(screen, name)?.props.accessibilityState.selected)
    }

    it('opens the tab the orders\' status is shown in: a new assigned order (0, 13, an offered 4, 7 or 14) Assigned, an accepted one In Progress, a finished one History', () => {
      expect(opened({ show: 'orders', status: 0, at: 1 }, { currentTabSelected: 'inProgress' })).toBe('Assigned')
      expect(opened({ show: 'orders', status: 13, at: 1 }, { currentTabSelected: 'inProgress' })).toBe('Assigned')
      expect(opened({ show: 'orders', status: 4, at: 1 }, { currentTabSelected: 'inProgress' })).toBe('Assigned')
      expect(opened({ show: 'orders', status: 7, at: 1 }, { currentTabSelected: 'inProgress' })).toBe('Assigned')
      expect(opened({ show: 'orders', status: 8, at: 1 })).toBe('In Progress')
      expect(opened({ show: 'orders', status: 11, at: 1 })).toBe('History')
      expect(opened({ show: 'orders', status: 2, at: 1 })).toBe('History')
    })

    it('opens Assigned when no status is known', () => {
      expect(opened({ show: 'orders', at: 1 }, { currentTabSelected: 'inProgress' })).toBe('Assigned')
    })

    it('opens Active for a project that combines its tabs', async () => {
      ;(useConfig as jest.Mock).mockReturnValue([{ configs: { combine_pending_and_progress_orders: { value: '1' } } }])
      expect(opened({ show: 'orders', status: 8, at: 1 }, {})).toBe('Active')
    })

    it('does nothing without an ask', () => {
      const { setCurrentTabSelected, navigation } = request(undefined)
      expect(setCurrentTabSelected).not.toHaveBeenCalled()
      expect(navigation.setParams).not.toHaveBeenCalled()
    })
  })

  describe('catching up when the socket comes back', () => {
    it('loads the orders again, as the refresh button does, and the assign requests when the project has them', () => {
      const loadOrders = jest.fn()
      const loadLogisticOrders = jest.fn()
      renderWithProviders(<OrdersOption isDriverApp isLogisticActivated loadOrders={loadOrders} loadLogisticOrders={loadLogisticOrders} />)
      mockReconnect!()
      expect(loadOrders).toHaveBeenCalledWith({ newFetch: true }, { allStatusses: false })
      expect(loadLogisticOrders).toHaveBeenCalledTimes(1)
    })

    it('loads only the requests when they are the list in front (the orders\' group has no such tab)', () => {
      const loadOrders = jest.fn()
      const loadLogisticOrders = jest.fn()
      renderWithProviders(
        <OrdersOption isDriverApp isLogisticActivated currentTabSelected='logisticOrders' loadOrders={loadOrders} loadLogisticOrders={loadLogisticOrders} />
      )
      mockReconnect!()
      expect(loadLogisticOrders).toHaveBeenCalledTimes(1)
      expect(loadOrders).not.toHaveBeenCalled()
    })

    it('does not load without a connection', () => {
      const loadOrders = jest.fn()
      renderWithProviders(<OrdersOption isDriverApp isNetConnected={false} loadOrders={loadOrders} />)
      mockReconnect!()
      expect(loadOrders).not.toHaveBeenCalled()
    })
  })

  it('pins the search and clear actions under the form, out of its scroll, and Clear search is the neutral outline of every cancel', () => {
    const { getByLabelText, getByText } = renderWithProviders(<OrdersOption isDriverApp />)
    fireEvent.press(getByLabelText('Search orders'))
    const inScroll = (node: any) => {
      for (let up = node.parent; up; up = up.parent) if (up.props?.contentContainerStyle) return true
      return false
    }
    expect(inScroll(getByText('Search'))).toBe(false)
    expect(inScroll(getByText('Clear search'))).toBe(false)
    expect(inScroll(getByText('Order number'))).toBe(true)
  })

  it('lifts the whole search form over the keyboard, its pinned actions with it', () => {
    // The search is a modal whose window the system does not resize: without a keyboard-avoiding view the
    // two actions stayed fully behind the keyboard while a field was focused.
    const { KeyboardAvoidingView } = require('react-native')
    const { getByLabelText, getByText, UNSAFE_getByType } = renderWithProviders(<OrdersOption isDriverApp />)
    fireEvent.press(getByLabelText('Search orders'))
    const form = UNSAFE_getByType(KeyboardAvoidingView)
    expect(form.props.behavior).toBe('padding')
    const inForm = (node: any) => {
      for (let up = node.parent; up; up = up.parent) if (up === form) return true
      return false
    }
    expect(inForm(getByText('Search'))).toBe(true)
    expect(inForm(getByText('Clear search'))).toBe(true)
  })

  it('the search form, in its modal, asks for no distance from the window\'s top on Android (the modal is a window of its own)', async () => {
    const { layoutWindowOf, onAndroid } = require('../../../../../../jest/helpers/androidWindow')
    const { KeyboardAvoidingView } = require('react-native')
    const android = onAndroid(0)
    const { getByLabelText, UNSAFE_getByType } = renderWithProviders(<OrdersOption isDriverApp />)
    fireEvent.press(getByLabelText('Search orders'))
    await layoutWindowOf(UNSAFE_getByType(KeyboardAvoidingView))
    expect(UNSAFE_getByType(KeyboardAvoidingView).props.keyboardVerticalOffset).toBe(0)
    expect(UNSAFE_getByType(KeyboardAvoidingView).props.behavior).toBe('padding')
    android.restore()
  })

  it('draws the filters notice without an icon, its text and its action side by side', () => {
    const { getByLabelText, getByPlaceholderText, getByText, getByTestId } = renderWithProviders(
      <OrdersOption
        isDriverApp
        ordersFiltered={{ orders: [], loading: false, pagination: { currentPage: 1, pageSize: 10, totalPages: 1, total: 0 } }}
      />
    )
    fireEvent.press(getByLabelText('Search orders'))
    fireEvent.changeText(getByPlaceholderText('Order number'), '42')
    fireEvent.press(getByText('Search'))
    const notice = getByTestId('orders-filter-notice')
    expect(notice.findAll((node: any) => node.type === 'Icon')).toHaveLength(0)
    let row: any = getByText(/Filters applied/).parent
    while (row && StyleSheet.flatten(row.props.style)?.flexDirection === undefined) row = row.parent
    expect(StyleSheet.flatten(row.props.style).flexDirection).toBe('row')
    expect(within(row).getByText('Clear filters')).toBeTruthy()
  })

  it('renders combined tabs when combine tabs config is enabled', async () => {
    ;(useConfig as jest.Mock).mockReturnValue([{
      configs: { combine_pending_and_progress_orders: { value: '1' } }
    }])
    const { findByText } = renderWithProviders(<OrdersOption isDriverApp />)
    expect(await findByText('Active')).toBeTruthy()
  })

  it('shows loading skeleton while orders are loading', () => {
    const { getByTestId } = renderWithProviders(
      <OrdersOption
        isDriverApp
        ordersGroup={{
          pending: { orders: [], loading: true, defaultFilter: [0], currentFilter: [0], pagination: { currentPage: 1, pageSize: 10, totalPages: 1, total: null } },
          inProgress: { orders: [], loading: false, defaultFilter: [3], currentFilter: [3], pagination: { currentPage: 1, pageSize: 10, totalPages: 1, total: 0 } },
          completed: { orders: [], loading: false, defaultFilter: [1], currentFilter: [1], pagination: { currentPage: 1, pageSize: 10, totalPages: 1, total: 0 } },
          cancelled: { orders: [], loading: false, defaultFilter: [2], currentFilter: [2], pagination: { currentPage: 1, pageSize: 10, totalPages: 1, total: 0 } }
        }}
        ordersFormatted={[]}
      />
    )
    expect(getByTestId('order-list-skeleton')).toBeTruthy()
  })

  describe('the loading skeleton draws the pieces of the cards of its tab (decision H9)', () => {
    const loadingGroup = (tab: string) => ({
      pending: { orders: [], loading: tab === 'pending', defaultFilter: [0], currentFilter: [0], pagination: { currentPage: 1, pageSize: 10, totalPages: 1, total: tab === 'pending' ? null : 0 } },
      inProgress: { orders: [], loading: false, defaultFilter: [3], currentFilter: [3], pagination: { currentPage: 1, pageSize: 10, totalPages: 1, total: 0 } },
      completed: { orders: [], loading: tab === 'completed', defaultFilter: [1], currentFilter: [1], pagination: { currentPage: 1, pageSize: 10, totalPages: 1, total: tab === 'completed' ? null : 0 } },
      cancelled: { orders: [], loading: false, defaultFilter: [2], currentFilter: [2], pagination: { currentPage: 1, pageSize: 10, totalPages: 1, total: 0 } }
    })
    const bones = (root: any) => root.findAll((node: any) => typeof node.type === 'string' && node.props.style && StyleSheet.flatten(node.props.style)?.opacity !== undefined && typeof StyleSheet.flatten(node.props.style)?.height === 'number')

    it('has the remaining time on a tab of open orders on the enterprise plan, and the clock time of the orders that are over on History', () => {
      ;(useConfig as jest.Mock).mockReturnValue([{ configs: { plan_enterprise: { value: '1' } } }])
      const pending = renderWithProviders(
        <OrdersOption isDriverApp currentTabSelected='pending' ordersGroup={loadingGroup('pending')} ordersFormatted={[]} />
      )
      const open = bones(pending.getAllByTestId('order-list-item-skeleton')[0]).length
      pending.unmount()
      const completed = renderWithProviders(
        <OrdersOption isDriverApp currentTabSelected='completed' ordersGroup={loadingGroup('completed')} ordersFormatted={[]} />
      )
      const closed = bones(completed.getAllByTestId('order-list-item-skeleton')[0]).length
      // Open (Assigned): the band's status and its time, the logo, the store's name, the title, the total, the stop's line, the position's
      // setter chip (an offered order has no position; the project orders by position), the type and the payment chips, and the buttons
      // (eleven); closed (History, whichever chip): the band's status and time, the logo, the store, the title, the total and the two chips
      // (no stop line, no buttons).
      expect(open).toBe(11)
      expect(closed).toBe(8)
    })

    it('draws the combined Active tab\'s skeleton with the setter chip too, whether the quick actions are shown or hidden (the buttons do not decide it)', () => {
      require('../../../../../../jest/helpers/d3OrdersUiMock').offlineActionsState.isCombinedTabs = true
      ;(useConfig as jest.Mock).mockReturnValue([{ configs: { combine_pending_and_progress_orders: { value: '1' } } }])
      const setter = defaultAppTheme().native.components.chip.sizes.sm.height
      const group = {
        active: { orders: [], loading: true, defaultFilter: [0, 3], currentFilter: [0, 3], pagination: { currentPage: 1, pageSize: 10, totalPages: 1, total: null } },
        completed: { orders: [], loading: false, defaultFilter: [1], currentFilter: [1], pagination: { currentPage: 1, pageSize: 10, totalPages: 1, total: 0 } },
        cancelled: { orders: [], loading: false, defaultFilter: [2], currentFilter: [2], pagination: { currentPage: 1, pageSize: 10, totalPages: 1, total: 0 } }
      }
      const heightsOf = (themeOverrides?: any) => {
        const screen = renderWithProviders(
          <OrdersOption isDriverApp currentTabSelected='active' ordersGroup={group} ordersFormatted={[]} />,
          themeOverrides ? { themeOverrides } : undefined
        )
        const first = screen.getAllByTestId('order-list-item-skeleton')[0]
        const heights = first
          .findAll((node: any) => typeof node.type === 'string' && typeof StyleSheet.flatten(node.props.style)?.height === 'number' && StyleSheet.flatten(node.props.style)?.opacity !== undefined)
          .map((node: any) => StyleSheet.flatten(node.props.style).height)
        screen.unmount()
        return heights
      }
      const withButtons = heightsOf()
      const withoutButtons = heightsOf(themeWith({ visibility: { 'orders.quick_actions': false } }))
      expect(withButtons).toContain(setter)
      expect(withoutButtons).toContain(setter)
      // The only difference between the two is the buttons' bone.
      expect(withButtons.length - withoutButtons.length).toBe(1)
    })

    it('has no timer off the enterprise plan', () => {
      const pending = renderWithProviders(
        <OrdersOption isDriverApp currentTabSelected='pending' ordersGroup={loadingGroup('pending')} ordersFormatted={[]} />
      )
      // The same open card without its time.
      expect(bones(pending.getAllByTestId('order-list-item-skeleton')[0])).toHaveLength(10)
    })
  })

  it('shows error message when orders request fails', () => {
    const { getByText } = renderWithProviders(
      <OrdersOption
        isDriverApp
        ordersGroup={{
          pending: { orders: [], loading: false, error: ['Network error'], defaultFilter: [0], currentFilter: [0], pagination: { currentPage: 1, pageSize: 10, totalPages: 1, total: 0 } },
          inProgress: { orders: [], loading: false, defaultFilter: [3], currentFilter: [3], pagination: { currentPage: 1, pageSize: 10, totalPages: 1, total: 0 } },
          completed: { orders: [], loading: false, defaultFilter: [1], currentFilter: [1], pagination: { currentPage: 1, pageSize: 10, totalPages: 1, total: 0 } },
          cancelled: { orders: [], loading: false, defaultFilter: [2], currentFilter: [2], pagination: { currentPage: 1, pageSize: 10, totalPages: 1, total: 0 } }
        }}
        ordersFormatted={[]}
      />
    )
    expect(getByText('Network error')).toBeTruthy()
  })

  it('shows filter alert when search filters are active', () => {
    const onFiltered = jest.fn()
    const { getByText, getByPlaceholderText, getByLabelText } = renderWithProviders(
      <OrdersOption
        isDriverApp
        ordersFiltered={{ orders: [], loading: false, pagination: { currentPage: 1, pageSize: 10, totalPages: 1, total: 0 } }}
        onFiltered={onFiltered}
      />
    )
    fireEvent.press(getByLabelText('Search orders'))
    fireEvent.changeText(getByPlaceholderText('Order number'), '42')
    fireEvent.press(getByText('Search'))
    expect(getByText(/Filters applied/)).toBeTruthy()
  })

  it('paints the notice\'s action as every notice action: medium and outline (decision H5; the boards draw it 44 high)', () => {
    const { StyleSheet, View } = require('react-native')
    const { defaultAppTheme } = require('../../../../../theme/engine')
    const button = defaultAppTheme().native.components.button
    const { getByText, getByPlaceholderText, getByLabelText, getByRole } = renderWithProviders(
      <OrdersOption
        isDriverApp
        ordersFiltered={{ orders: [], loading: false, pagination: { currentPage: 1, pageSize: 10, totalPages: 1, total: 0 } }}
      />
    )
    fireEvent.press(getByLabelText('Search orders'))
    fireEvent.changeText(getByPlaceholderText('Order number'), '42')
    fireEvent.press(getByText('Search'))
    const action = StyleSheet.flatten(getByRole('button', { name: 'Clear filters' }).findByType(View).props.style)
    expect(action.minHeight).toBe(button.sizes.md.height)
    expect(action.backgroundColor).toBe(button.variants.primary.outline.background)
    expect(action.borderColor).toBe(button.variants.primary.outline.border.borderColor)
  })

  it('clears active filters from filter alert banner', () => {
    const onFiltered = jest.fn()
    const { getByText, getByPlaceholderText, getByLabelText } = renderWithProviders(
      <OrdersOption
        isDriverApp
        ordersFiltered={{ orders: [], loading: false, pagination: { currentPage: 1, pageSize: 10, totalPages: 1, total: 0 } }}
        onFiltered={onFiltered}
      />
    )
    fireEvent.press(getByLabelText('Search orders'))
    fireEvent.changeText(getByPlaceholderText('Order number'), '42')
    fireEvent.press(getByText('Search'))
    fireEvent.press(getByText('Clear filters'))
    expect(onFiltered).toHaveBeenCalledWith(null)
  })

  it('reloads logistic orders on refresh when logistic tab is selected', () => {
    const loadLogisticOrders = jest.fn()
    const { getByLabelText } = renderWithProviders(
      <OrdersOption
        isDriverApp
        currentTabSelected="logisticOrders"
        loadLogisticOrders={loadLogisticOrders}
      />
    )
    fireEvent.press(getByLabelText('Refresh'))
    expect(loadLogisticOrders).toHaveBeenCalled()
  })

  it('says "No assign requests" when the requests tab has none, never the general text', () => {
    const { getByText, queryByText } = renderWithProviders(
      <OrdersOption
        isDriverApp
        currentTabSelected="logisticOrders"
        logisticOrders={{ orders: [], loading: false, error: [] }}
      />
    )
    expect(getByText('No assign requests')).toBeTruthy()
    expect(queryByText('Sorry, no results found')).toBeNull()
  })

  it('says it too when every request in the tab has expired', () => {
    const { getByText } = renderWithProviders(
      <OrdersOption
        isDriverApp
        currentTabSelected="logisticOrders"
        logisticOrders={{ orders: [{ id: 1, expired: true }], loading: false, error: [] }}
      />
    )
    expect(getByText('No assign requests')).toBeTruthy()
  })

  it('keeps the general text for a search with no match, and not the requests\' text', () => {
    const { getByText, queryByText, getByPlaceholderText, getByLabelText } = renderWithProviders(
      <OrdersOption
        isDriverApp
        isLogisticActivated
        ordersFiltered={{ orders: [], loading: false, pagination: { currentPage: 1, pageSize: 10, totalPages: 1, total: 0 } }}
      />
    )
    fireEvent.press(getByLabelText('Search orders'))
    fireEvent.changeText(getByPlaceholderText('Order number'), '42')
    fireEvent.press(getByText('Search'))
    expect(getByText('Sorry, no results found')).toBeTruthy()
    expect(queryByText('No assign requests')).toBeNull()
  })

  it('gives the orders header the title first: the connection pill gives way before "My orders" is cut', () => {
    const { getByTestId, getByText } = renderWithProviders(<OrdersOption isDriverApp />)
    expect(getByTestId('orders-header')).toBeTruthy()
    const flat = (node: any) => require('react-native').StyleSheet.flatten(node.props.style)
    let box: any = getByText('My orders').parent
    while (box && flat(box)?.flexGrow === undefined) box = box.parent
    expect(flat(box).flexShrink).toBe(0)
  })

  it('shows last update banner when offline with stored connection date', async () => {
    const { _retrieveStoreData } = require('../../../providers/StoreUtil')
    const { offlineActionsState } = require('../../../../../../jest/helpers/d3OrdersUiMock')
    offlineActionsState.isNetConnected = false
    _retrieveStoreData.mockImplementation((key: string) => {
      if (key === 'last_date_connection') return Promise.resolve('2026-01-01 10:00:00')
      if (key === 'allow_save_changes_offline') return Promise.resolve(true)
      return Promise.resolve(null)
    })
    const { findByText } = renderWithProviders(
      <OrdersOption isDriverApp isNetConnected={false} />
    )
    expect(await findByText(/Last Update/)).toBeTruthy()
  })

  describe('header pieces by visibility', () => {
    it('shows the title, the connection status, refresh and search by default', () => {
      const { getByText, getByTestId, getByLabelText } = renderWithProviders(<OrdersOption isDriverApp />)
      expect(getByText('My orders')).toBeTruthy()
      expect(getByTestId('websocket-status-stub')).toBeTruthy()
      expect(getByLabelText('Refresh')).toBeTruthy()
      expect(getByLabelText('Search orders')).toBeTruthy()
    })

    it('lays the pill, refresh and search at the bar\'s end `header.gap` apart, as every header lays its actions', () => {
      const { getByTestId } = renderWithProviders(<OrdersOption isDriverApp />)
      const actions = (node: any) => {
        for (let up = node.parent; up; up = up.parent) if (up.props?.style && StyleSheet.flatten(up.props.style)?.gap !== undefined) return up
        throw new Error('no actions box')
      }
      const box = actions(getByTestId('orders-refresh'))
      expect(StyleSheet.flatten(box.props.style).gap).toBe(defaultAppTheme().native.components.header.base.gap)
      // One box for the three: no row of the screen\'s own inside the bar\'s.
      expect(actions(getByTestId('orders-search'))).toBe(box)
      expect(actions(getByTestId('websocket-status-stub'))).toBe(box)
    })

    it('draws refresh and search 22 (the icon-only shape\'s glyph) with their boxes pulled into the gutter', () => {
      const theme = defaultAppTheme()
      const { UNSAFE_getAllByProps, getByTestId } = renderWithProviders(<OrdersOption isDriverApp />)
      ;['refresh', 'search'].forEach((name) => {
        const glyphs = UNSAFE_getAllByProps({ name })
        expect(glyphs[glyphs.length - 1].props.size).toBe(theme.native.components.button.shapes.icon.icon_size)
      })
      let actions: any = getByTestId('orders-refresh').parent
      while (actions && StyleSheet.flatten(actions.props?.style)?.gap !== theme.native.components.header.base.gap) actions = actions.parent
      expect(StyleSheet.flatten(actions.props.style).marginRight).toBeLessThan(0)
    })

    it('hides the title with orders.title and keeps the actions', () => {
      const { queryByText, getByLabelText } = renderWithProviders(<OrdersOption isDriverApp />, {
        themeOverrides: themeWith({ visibility: { 'orders.title': false } })
      })
      expect(queryByText('My orders')).toBeNull()
      expect(getByLabelText('Refresh')).toBeTruthy()
    })

    it('hides the connection pill with connection_status', () => {
      const { queryByTestId, getByText } = renderWithProviders(<OrdersOption isDriverApp />, {
        themeOverrides: themeWith({ visibility: { connection_status: false } })
      })
      expect(queryByTestId('websocket-status-stub')).toBeNull()
      expect(getByText('My orders')).toBeTruthy()
    })

    it('hides the refresh button with orders.refresh', () => {
      const { queryByLabelText, getByLabelText } = renderWithProviders(<OrdersOption isDriverApp />, {
        themeOverrides: themeWith({ visibility: { 'orders.refresh': false } })
      })
      expect(queryByLabelText('Refresh')).toBeNull()
      expect(getByLabelText('Search orders')).toBeTruthy()
    })

    it('hides the search button with orders.search', () => {
      const { queryByLabelText, getByLabelText } = renderWithProviders(<OrdersOption isDriverApp />, {
        themeOverrides: themeWith({ visibility: { 'orders.search': false } })
      })
      expect(queryByLabelText('Search orders')).toBeNull()
      expect(getByLabelText('Refresh')).toBeTruthy()
    })

    it('renders no header when every piece of it is hidden', () => {
      const { queryByTestId, getByText } = renderWithProviders(<OrdersOption isDriverApp />, {
        themeOverrides: themeWith({ visibility: { 'orders.title': false, connection_status: false, 'orders.refresh': false, 'orders.search': false } })
      })
      expect(queryByTestId('orders-header')).toBeNull()
      // The list and "Load more" are never hidden.
      expect(getByText('Store A')).toBeTruthy()
      expect(getByText('Load more orders')).toBeTruthy()
    })
  })

  describe('sections of the page orders', () => {
    const filtered = { orders: [], loading: false, pagination: { currentPage: 1, pageSize: 10, totalPages: 1, total: 0 } }
    const withSummary = () => themeWith({
      pages: { orders: { sections: [{ key: 'tabs', visible: true }, { key: 'summary', visible: true }, { key: 'list', visible: true }] } }
    })
    const applyFilter = ({ getByLabelText, getByPlaceholderText, getByText }: any) => {
      fireEvent.press(getByLabelText('Search orders'))
      fireEvent.changeText(getByPlaceholderText('Order number'), '42')
      fireEvent.press(getByText('Search'))
    }

    it('renders the tabs through the Tabs primitive and the list', () => {
      const { getAllByRole, getByTestId, getByText } = renderWithProviders(<OrdersOption isDriverApp />)
      expect(getByTestId('orders-tabs')).toBeTruthy()
      expect(getAllByRole('tab').length).toBe(3)
      expect(getByText('Store A')).toBeTruthy()
    })

    it('lays the tabs out as their labels ask: one line each, the spare room shared equally, the row scrolling out to the edge when they do not fit', () => {
      const { act } = require('@testing-library/react-native')
      const { ScrollView } = require('react-native')
      const gutter = 20
      const strip = (screen: any) => screen.UNSAFE_getAllByType(ScrollView).find((node: any) => node.props.horizontal)
      const screen = renderWithProviders(<OrdersOption isDriverApp />)
      const frame = StyleSheet.flatten(screen.getByTestId('orders-tabs').props.style)
      expect(frame.paddingStart).toBe(gutter)
      expect(frame.paddingEnd).toBe(gutter)
      // Every label is one line, the selected weight's room kept.
      screen.getAllByRole('tab').forEach((tab: any) => {
        within(tab).getAllByText(/.+/, { includeHiddenElements: true }).forEach((label: any) => expect(label.props.numberOfLines).toBe(1))
      })
      const measure = (room: number, track: number) => {
        act(() => strip(screen).props.onLayout({ nativeEvent: { layout: { width: room + gutter, height: 44 } } }))
        act(() => screen.getByTestId('orders-tabs-strip-track').props.onLayout({ nativeEvent: { layout: { width: track, height: 44 } } }))
      }
      // Measured and fitting: shared, each tab growing by the same amount over its own width.
      measure(360, 300)
      expect(screen.UNSAFE_queryAllByType(ScrollView).filter((node: any) => node.props.horizontal)).toHaveLength(0)
      screen.getAllByRole('tab').forEach((tab: any) => expect(StyleSheet.flatten(tab.props.style).flexGrow).toBe(1))
      // Larger text or a narrower phone: the tabs no longer fit, so the row scrolls.
      screen.unmount()
      const narrow = renderWithProviders(<OrdersOption isDriverApp />)
      act(() => strip(narrow).props.onLayout({ nativeEvent: { layout: { width: 300 + gutter, height: 44 } } }))
      act(() => narrow.getByTestId('orders-tabs-strip-track').props.onLayout({ nativeEvent: { layout: { width: 380, height: 44 } } }))
      expect(narrow.UNSAFE_queryAllByType(ScrollView).filter((node: any) => node.props.horizontal)).toHaveLength(1)
    })

    it('keeps the gutter after tabs that share the row (the project that combines its tabs has two, from the first render)', () => {
      ;(useConfig as jest.Mock).mockReturnValue([{ configs: { combine_pending_and_progress_orders: { value: '1' } } }])
      const { getByTestId, getAllByRole } = renderWithProviders(<OrdersOption isDriverApp />)
      // No wait: the screen reads the switch from the configs the app holds, in the render that paints the tabs.
      expect(getAllByRole('tab')).toHaveLength(2)
      expect(StyleSheet.flatten(getByTestId('orders-tabs').props.style).paddingEnd).toBe(20)
    })

    it('keeps the summary table hidden by default, whatever the project', () => {
      const onFiltered = jest.fn()
      const screen = renderWithProviders(<OrdersOption isDriverApp ordersFiltered={filtered} onFiltered={onFiltered} />)
      applyFilter(screen)
      expect(screen.queryByText('Orders Summary')).toBeNull()
      expect(onFiltered).toHaveBeenCalledWith(expect.not.objectContaining({ excludeStatuses: expect.anything() }))
    })

    it('shows the summary table of the filtered orders when the theme turns the section on', () => {
      const onFiltered = jest.fn()
      const screen = renderWithProviders(
        <OrdersOption isDriverApp ordersFiltered={filtered} onFiltered={onFiltered} />,
        { themeOverrides: withSummary() }
      )
      expect(screen.queryByText('Orders Summary')).toBeNull()
      applyFilter(screen)
      expect(screen.getByText('Orders Summary')).toBeTruthy()
      // The cancelled statuses leave the list, except the failed delivery the table counts.
      expect(onFiltered).toHaveBeenCalledWith(expect.objectContaining({ excludeStatuses: [2, 5, 6, 10, 16, 17] }))
    })

    it('writes the searched range in the project\'s date format in the summary (decision H4), and sends the API its own', () => {
      const dayjs = require('@/utils/dayjs').default
      const { useUtils } = require('@components')
      const utils = (useUtils as jest.Mock)()[0]
      ;(useUtils as jest.Mock).mockReturnValue([{
        ...utils,
        parseDate: (date: any, options: any = {}) => dayjs(date).format(options.outputFormat ?? 'DD/MM/YYYY HH:mm'),
        dateFormat: 'DD/MM/YYYY'
      }, {}])
      const onFiltered = jest.fn()
      const screen = renderWithProviders(
        <OrdersOption isDriverApp ordersFiltered={filtered} onFiltered={onFiltered} />,
        { themeOverrides: withSummary() }
      )
      fireEvent.press(screen.getByLabelText('Search orders'))
      fireEvent.press(screen.getByLabelText('Custom range'))
      const day = (number: number) => screen.getAllByRole('button').find((node: any) => new RegExp(`^${number} `).test(node.props.accessibilityLabel ?? ''))
      fireEvent.press(day(10) as never)
      fireEvent.press(day(12) as never)
      fireEvent.press(screen.getByText('Search'))
      const month = dayjs().format('MM')
      const year = dayjs().format('YYYY')
      expect(screen.getByText(`10/${month}/${year} → 12/${month}/${year}`)).toBeTruthy()
      expect(onFiltered).toHaveBeenCalledWith(expect.objectContaining({
        date: { from: `${month}/10/${year} 00:00:00`, to: `${month}/12/${year} 23:59:59` }
      }))
      ;(useUtils as jest.Mock).mockReturnValue([utils, {}])
    })

    it('never hides the offline banner', async () => {
      const { _retrieveStoreData } = require('../../../providers/StoreUtil')
      const { offlineActionsState } = require('../../../../../../jest/helpers/d3OrdersUiMock')
      offlineActionsState.isNetConnected = false
      _retrieveStoreData.mockImplementation((key: string) => {
        if (key === 'last_date_connection') return Promise.resolve('2026-01-01 10:00:00')
        if (key === 'allow_save_changes_offline') return Promise.resolve(true)
        return Promise.resolve(null)
      })
      const { findByTestId } = renderWithProviders(<OrdersOption isDriverApp isNetConnected={false} />, {
        themeOverrides: themeWith({ visibility: { 'orders.title': false, connection_status: false, 'orders.refresh': false, 'orders.search': false } })
      })
      expect(await findByTestId('orders-offline')).toBeTruthy()
    })
  })
})

describe('OrdersOption: the accept sheet is presented over the orders, not on a route', () => {
  const { sampleOrder, makeGroupedOrders, groupedOrdersGroup, ordersGroupOf } = require('../../../../../../jest/helpers/d3OrdersDefaults')
  const { tapPress } = require('../../../../../../jest/helpers/holdPress')

  beforeEach(() => {
    jest.clearAllMocks()
    const { offlineActionsState } = require('../../../../../../jest/helpers/d3OrdersUiMock')
    offlineActionsState.isNetConnected = true
    offlineActionsState.canSaveChangesOffline = false
    ;(useConfig as jest.Mock).mockReturnValue([{ configs: { disable_delivery_priority: { value: '1' } } }])
  })

  describe('an assign request accepted in the Requests tab (the project asks the delivery time)', () => {
    const request = { ...sampleOrder, id: 909, isLogistic: true, order: { ...sampleOrder, id: 202 }, locked: false }
    const accepted = { error: false, order: { id: 202 }, orderIds: [202], defaultEta: null }
    const requestsTab = (props: Record<string, any> = {}) => (
      <OrdersOption
        isDriverApp
        currentTabSelected='logisticOrders'
        logisticOrders={{ orders: [request], loading: false, error: [] }}
        handleClickLogisticOrder={jest.fn().mockResolvedValue(accepted)}
        handleUpdateLogisticOrdersEta={jest.fn().mockResolvedValue([{ id: 202 }])}
        onNavigationRedirect={jest.fn()}
        {...props}
      />
    )

    it('opens the sheet over the tab with no navigation, sends the time once and closes when it was saved', async () => {
      const onNavigationRedirect = jest.fn()
      const handleUpdateLogisticOrdersEta = jest.fn().mockResolvedValue([{ id: 202 }])
      const screen = renderWithProviders(requestsTab({ onNavigationRedirect, handleUpdateLogisticOrdersEta }))
      tapPress(screen.getByText('Accept'))
      await waitFor(() => expect(screen.getByTestId('order-sheet')).toBeTruthy())
      expect(onNavigationRedirect).not.toHaveBeenCalled()
      expect(screen.getByText('Store A')).toBeTruthy()
      fireEvent.press(screen.getByTestId('order-action'))
      await waitFor(() => expect(screen.queryByTestId('order-sheet')).toBeNull(), { timeout: 5000 })
      expect(handleUpdateLogisticOrdersEta).toHaveBeenCalledTimes(1)
      expect(handleUpdateLogisticOrdersEta).toHaveBeenCalledWith([202], expect.any(Number))
      expect(onNavigationRedirect).not.toHaveBeenCalled()
    })

    it('keeps the sheet when the time was not saved', async () => {
      const handleUpdateLogisticOrdersEta = jest.fn().mockResolvedValue([])
      const screen = renderWithProviders(requestsTab({ handleUpdateLogisticOrdersEta }))
      tapPress(screen.getByText('Accept'))
      await waitFor(() => expect(screen.getByTestId('order-sheet')).toBeTruthy())
      fireEvent.press(screen.getByTestId('order-action'))
      await waitFor(() => expect(handleUpdateLogisticOrdersEta).toHaveBeenCalledTimes(1), { timeout: 5000 })
      expect(screen.getByTestId('order-sheet')).toBeTruthy()
    })

    it('is still there when the answered request was the last one and the list went away with it', async () => {
      const handleUpdateLogisticOrdersEta = jest.fn().mockResolvedValue([{ id: 202 }])
      let screen: any
      // The controller takes the request out of the list before it answers, as the real one does.
      const handleClickLogisticOrder = jest.fn(async () => {
        screen.rerender(requestsTab({ logisticOrders: { orders: [], loading: false, error: [] }, handleClickLogisticOrder, handleUpdateLogisticOrdersEta }))
        return accepted
      })
      screen = renderWithProviders(requestsTab({ handleClickLogisticOrder, handleUpdateLogisticOrdersEta }))
      tapPress(screen.getByText('Accept'))
      await waitFor(() => expect(screen.getByTestId('order-sheet')).toBeTruthy())
      expect(screen.queryByText('Store A')).toBeNull()
      fireEvent.press(screen.getByTestId('order-action'))
      await waitFor(() => expect(screen.queryByTestId('order-sheet')).toBeNull(), { timeout: 5000 })
      expect(handleUpdateLogisticOrdersEta).toHaveBeenCalledTimes(1)
    })

    it('asks nothing when the project saves its own time', async () => {
      const handleClickLogisticOrder = jest.fn().mockResolvedValue({ ...accepted, defaultEta: 10 })
      const screen = renderWithProviders(requestsTab({ handleClickLogisticOrder }))
      tapPress(screen.getByText('Accept'))
      await waitFor(() => expect(handleClickLogisticOrder).toHaveBeenCalledTimes(1))
      expect(screen.queryByTestId('order-sheet')).toBeNull()
    })
  })

  describe('a request rejected with a hold (the list answers while the finger is still on the card)', () => {
    const { holdMs } = require('../../../../../../jest/helpers/holdPress')
    const requestsOf = (ids: number[]) => ids.map((id) => ({ ...sampleOrder, id, isLogistic: true, order: { ...sampleOrder, id: id + 100 }, locked: false }))
    const tab = (orders: any[], handleClickLogisticOrder: any) => (
      <OrdersOption
        isDriverApp
        currentTabSelected='logisticOrders'
        logisticOrders={{ orders, loading: false, error: [] }}
        handleClickLogisticOrder={handleClickLogisticOrder}
        onNavigationRedirect={jest.fn()}
      />
    )

    beforeEach(() => { jest.useFakeTimers() })
    afterEach(() => { jest.useRealTimers() })

    it.each([
      ['the card is not the last one', [1, 2], 1],
      ['the card is the last one and the list goes away with it', [1], 0]
    ])('keeps the pressed Reject where it is until the finger lifts, then shows the answer (%s)', (_name, ids, left) => {
      let screen: any
      // The controller takes the request out of the list as it answers, as the real one does.
      const handleClickLogisticOrder = jest.fn(() => {
        screen.rerender(tab(requestsOf(ids.slice(1)), handleClickLogisticOrder))
      })
      screen = renderWithProviders(tab(requestsOf(ids), handleClickLogisticOrder))
      const reject = screen.getAllByText('Reject')[0]
      fireEvent(reject, 'pressIn')
      act(() => { jest.advanceTimersByTime(holdMs()) })
      expect(handleClickLogisticOrder).toHaveBeenCalledTimes(1)
      // The finger is still down: the list is as it was, so the touch's end has a button to reach.
      expect(screen.getAllByText('Reject')).toHaveLength(ids.length)
      fireEvent(reject, 'pressOut')
      fireEvent.press(reject)
      expect(screen.queryAllByText('Reject')).toHaveLength(left)
    })
  })

  describe('the list after the driver\'s own status change (no socket needed)', () => {
    /** The handler a card, the confirmation dialog, a sheet or a reason page sends its change through. */
    const changeThroughTheList = async (answer: any, filtered = false) => {
      const onNavigationRedirect = jest.fn()
      const loadOrders = jest.fn()
      const handleChangeOrderStatus = jest.fn().mockResolvedValue(answer)
      const screen = renderWithProviders(
        <OrdersOption
          isDriverApp
          ordersGroup={groupedOrdersGroup([{ ...sampleOrder, status: 0 }])}
          ordersFiltered={{ orders: makeGroupedOrders([{ ...sampleOrder, status: 0 }]), loading: false, error: null, pagination: { total: 1 } }}
          onNavigationRedirect={onNavigationRedirect}
          handleChangeOrderStatus={handleChangeOrderStatus}
          loadOrders={loadOrders}
        />
      )
      if (filtered) {
        fireEvent.press(screen.getByLabelText('Search orders'))
        fireEvent.changeText(screen.getByPlaceholderText('Order number'), '3460')
        fireEvent.press(screen.getByText('Search'))
        loadOrders.mockClear()
      }
      fireEvent.press(screen.getAllByLabelText(/^Group No\./)[0])
      fireEvent.press(screen.getByText('Reject all'))
      const { handleChangeOrderStatus: sent } = onNavigationRedirect.mock.calls[0][1]
      await act(async () => { await sent(6, [1, 2]) })
      return { loadOrders, handleChangeOrderStatus }
    }

    it('loads the list again once the API answered a change that took, so the orders move tab without a refresh', async () => {
      const { loadOrders, handleChangeOrderStatus } = await changeThroughTheList([{ id: 1 }, { id: 2 }])
      expect(handleChangeOrderStatus).toHaveBeenCalledTimes(1)
      expect(loadOrders).toHaveBeenCalledTimes(1)
      expect(loadOrders).toHaveBeenCalledWith({ newFetch: true }, { allStatusses: false })
    })

    it('does it when only some of the orders changed, and with the details the sheets ask for', async () => {
      expect((await changeThroughTheList([{ id: 1 }, null])).loadOrders).toHaveBeenCalledTimes(1)
      expect((await changeThroughTheList([{ id: 1, error: false }, { id: 2, error: true }])).loadOrders).toHaveBeenCalledTimes(1)
    })

    it('leaves the list alone when nothing changed (the sheet or the form keeps the error and lets retry)', async () => {
      expect((await changeThroughTheList([null, null])).loadOrders).not.toHaveBeenCalled()
      expect((await changeThroughTheList([{ id: 1, error: true }])).loadOrders).not.toHaveBeenCalled()
      expect((await changeThroughTheList('Network request failed')).loadOrders).not.toHaveBeenCalled()
    })

    it('loads the results of the search again, not the tabs, while a search is applied', async () => {
      const { loadOrders } = await changeThroughTheList([{ id: 1 }], true)
      expect(loadOrders).toHaveBeenCalledWith({ newFetch: true }, { allStatusses: true })
    })
  })

  describe('a change made on another screen reaches the list through the app\'s event, not the socket', () => {
    const EVENT = 'driver_order_changed'
    /** The bus the screen listens on: the handler it registered for the event, and how many times it subscribed. */
    const bus = () => {
      const { useEvent } = require('@components')
      const [events] = useEvent()
      const handlers = () => events.on.mock.calls.filter((call: any[]) => call[0] === EVENT).map((call: any[]) => call[1])
      return { events, handler: () => handlers()[handlers().length - 1], subscribed: () => handlers().length }
    }
    const pending = () => {
      let finish!: (value?: any) => void
      const fn = jest.fn(() => new Promise<any>((resolve) => { finish = resolve }))
      return { fn, finish: (value?: any) => finish(value) }
    }

    it('loads the orders once, through the same load as the refresh button', async () => {
      const loadOrders = jest.fn()
      renderWithProviders(<OrdersOption isDriverApp loadOrders={loadOrders} />)
      loadOrders.mockClear()
      await act(async () => { bus().handler()({ orderIds: [101] }) })
      expect(loadOrders).toHaveBeenCalledTimes(1)
      expect(loadOrders).toHaveBeenCalledWith({ newFetch: true }, { allStatusses: false })
    })

    it('loads the results of the search again while a search is applied', async () => {
      const loadOrders = jest.fn()
      const screen = renderWithProviders(
        <OrdersOption isDriverApp loadOrders={loadOrders} ordersFiltered={{ orders: [], loading: false, error: null, pagination: { total: 0 } }} />
      )
      fireEvent.press(screen.getByLabelText('Search orders'))
      fireEvent.changeText(screen.getByPlaceholderText('Order number'), '3460')
      fireEvent.press(screen.getByText('Search'))
      loadOrders.mockClear()
      await act(async () => { bus().handler()({ orderIds: [101] }) })
      expect(loadOrders).toHaveBeenCalledWith({ newFetch: true }, { allStatusses: true })
    })

    it('several events while a load runs make one load more, after it', async () => {
      const first = pending()
      const loadOrders = jest.fn(() => (loadOrders.mock.calls.length === 1 ? first.fn() : Promise.resolve()))
      renderWithProviders(<OrdersOption isDriverApp loadOrders={loadOrders} />)
      const { handler } = bus()
      // The first event starts the load, and the ones that follow find it running.
      await act(async () => { handler()({ orderIds: [101] }) })
      expect(loadOrders).toHaveBeenCalledTimes(1)
      await act(async () => { handler()({ orderIds: [102] }); handler()({ orderIds: [101] }); handler()({ orderIds: [103] }) })
      expect(loadOrders).toHaveBeenCalledTimes(1)
      await act(async () => { first.finish() })
      await waitFor(() => expect(loadOrders).toHaveBeenCalledTimes(2))
      await act(async () => {})
      expect(loadOrders).toHaveBeenCalledTimes(2)
    })

    it('does not overlap a change of the list\'s own that is on its way: it loads once, after it', async () => {
      const change = pending()
      const loadOrders = jest.fn()
      const onNavigationRedirect = jest.fn()
      const screen = renderWithProviders(
        <OrdersOption
          isDriverApp
          ordersGroup={groupedOrdersGroup([{ ...sampleOrder, status: 0 }])}
          onNavigationRedirect={onNavigationRedirect}
          handleChangeOrderStatus={change.fn}
          loadOrders={loadOrders}
        />
      )
      loadOrders.mockClear()
      fireEvent.press(screen.getAllByLabelText(/^Group No\./)[0])
      fireEvent.press(screen.getByText('Reject all'))
      const { handleChangeOrderStatus: sent } = onNavigationRedirect.mock.calls[0][1]
      let answer!: Promise<any>
      act(() => { answer = sent(6, [1, 2]) })
      await act(async () => { bus().handler()({ orderIds: [101] }) })
      expect(loadOrders).not.toHaveBeenCalled()
      await act(async () => { change.finish([{ id: 1 }, { id: 2 }]); await answer })
      // The change's own load and the event's are one.
      await waitFor(() => expect(loadOrders).toHaveBeenCalledTimes(1))
      await act(async () => {})
      expect(loadOrders).toHaveBeenCalledTimes(1)
    })

    it('an answer to an assign request loads the requests; an accepted one the orders as well, a rejected one only the requests', async () => {
      const loadOrders = jest.fn()
      const loadLogisticOrders = jest.fn()
      renderWithProviders(<OrdersOption isDriverApp isLogisticActivated loadOrders={loadOrders} loadLogisticOrders={loadLogisticOrders} />)
      loadOrders.mockClear()
      loadLogisticOrders.mockClear()
      await act(async () => { bus().handler()({ orderIds: [101], request: true, accepted: false }) })
      expect(loadLogisticOrders).toHaveBeenCalledTimes(1)
      expect(loadOrders).not.toHaveBeenCalled()
      await act(async () => { bus().handler()({ orderIds: [101], request: true, accepted: true }) })
      expect(loadLogisticOrders).toHaveBeenCalledTimes(2)
      expect(loadOrders).toHaveBeenCalledTimes(1)
    })

    it('a change of an order alone leaves the requests alone', async () => {
      const loadOrders = jest.fn()
      const loadLogisticOrders = jest.fn()
      renderWithProviders(<OrdersOption isDriverApp isLogisticActivated loadOrders={loadOrders} loadLogisticOrders={loadLogisticOrders} />)
      loadOrders.mockClear()
      loadLogisticOrders.mockClear()
      await act(async () => { bus().handler()({ orderIds: [101] }) })
      expect(loadOrders).toHaveBeenCalledTimes(1)
      expect(loadLogisticOrders).not.toHaveBeenCalled()
    })

    it('loads nothing offline: the list shows what was queued, and a load would put the old state back', async () => {
      const loadOrders = jest.fn()
      renderWithProviders(<OrdersOption isDriverApp isNetConnected={false} loadOrders={loadOrders} />)
      loadOrders.mockClear()
      await act(async () => { bus().handler()({ orderIds: [101] }) })
      expect(loadOrders).not.toHaveBeenCalled()
    })

    it('subscribes once: a re-render does not unsubscribe and subscribe again, and the screen leaving takes the listener away', () => {
      const loadOrders = jest.fn()
      const screen = renderWithProviders(<OrdersOption isDriverApp loadOrders={loadOrders} />)
      const { events, subscribed, handler } = bus()
      expect(subscribed()).toBe(1)
      screen.rerender(<OrdersOption isDriverApp loadOrders={jest.fn()} ordersGroup={groupedOrdersGroup([{ ...sampleOrder, status: 0 }])} />)
      screen.rerender(<OrdersOption isDriverApp loadOrders={jest.fn()} />)
      expect(subscribed()).toBe(1)
      const registered = handler()
      expect(events.off.mock.calls.filter((call: any[]) => call[0] === EVENT)).toHaveLength(0)
      screen.unmount()
      expect(events.off).toHaveBeenCalledWith(EVENT, registered)
    })

    it('the latest load is the one that runs, whatever render the listener was made in', async () => {
      const first = jest.fn()
      const second = jest.fn()
      const screen = renderWithProviders(<OrdersOption isDriverApp loadOrders={first} />)
      screen.rerender(<OrdersOption isDriverApp loadOrders={second} />)
      first.mockClear()
      second.mockClear()
      await act(async () => { bus().handler()({ orderIds: [101] }) })
      expect(first).not.toHaveBeenCalled()
      expect(second).toHaveBeenCalledTimes(1)
    })

    it('a change sent through the list\'s own handler loads once and announces nothing: it is not told twice', async () => {
      const onNavigationRedirect = jest.fn()
      const loadOrders = jest.fn()
      const screen = renderWithProviders(
        <OrdersOption
          isDriverApp
          ordersGroup={groupedOrdersGroup([{ ...sampleOrder, status: 0 }])}
          onNavigationRedirect={onNavigationRedirect}
          handleChangeOrderStatus={jest.fn().mockResolvedValue([{ id: 1 }, { id: 2 }])}
          loadOrders={loadOrders}
        />
      )
      loadOrders.mockClear()
      fireEvent.press(screen.getAllByLabelText(/^Group No\./)[0])
      fireEvent.press(screen.getByText('Reject all'))
      const { handleChangeOrderStatus: sent } = onNavigationRedirect.mock.calls[0][1]
      await act(async () => { await sent(6, [1, 2]) })
      await act(async () => {})
      expect(loadOrders).toHaveBeenCalledTimes(1)
      expect(bus().events.emit.mock.calls.filter((call: any[]) => call[0] === EVENT)).toEqual([])
    })
  })

  describe('the lists load one at a time, and never over a change of the driver\'s own', () => {
    /** A load or a change that ends when the test says so. */
    const pending = () => {
      let finish!: (value?: any) => void
      const fn = jest.fn(() => new Promise<any>((resolve) => { finish = resolve }))
      return { fn, finish: (value?: any) => finish(value) }
    }

    it('a refresh asked while the list is loading is not a second load: it runs once, after the first', async () => {
      const first = pending()
      const loadOrders = jest.fn(() => (loadOrders.mock.calls.length === 1 ? first.fn() : Promise.resolve()))
      const screen = renderWithProviders(<OrdersOption isDriverApp loadOrders={loadOrders} />)
      fireEvent.press(screen.getByLabelText('Refresh'))
      fireEvent.press(screen.getByLabelText('Refresh'))
      fireEvent.press(screen.getByLabelText('Refresh'))
      expect(loadOrders).toHaveBeenCalledTimes(1)
      await act(async () => { first.finish() })
      await waitFor(() => expect(loadOrders).toHaveBeenCalledTimes(2))
    })

    it('the reconnect, the refresh and the position change share the one load', async () => {
      const first = pending()
      const loadOrders = jest.fn(() => (loadOrders.mock.calls.length === 1 ? first.fn() : Promise.resolve()))
      const screen = renderWithProviders(<OrdersOption isDriverApp loadOrders={loadOrders} />)
      fireEvent.press(screen.getByLabelText('Refresh'))
      mockReconnect!()
      mockReconnect!()
      expect(loadOrders).toHaveBeenCalledTimes(1)
      await act(async () => { first.finish() })
      await waitFor(() => expect(loadOrders).toHaveBeenCalledTimes(2))
    })

    it('the assign requests have their own load: it is not held by the orders\'', () => {
      const orders = pending()
      const loadLogisticOrders = jest.fn()
      renderWithProviders(<OrdersOption isDriverApp isLogisticActivated loadOrders={orders.fn} loadLogisticOrders={loadLogisticOrders} />)
      mockReconnect!()
      expect(orders.fn).toHaveBeenCalledTimes(1)
      expect(loadLogisticOrders).toHaveBeenCalledTimes(1)
    })

    it('a refresh asked while a change of the list is on its way waits for it, and the list is loaded once, after the change', async () => {
      const change = pending()
      const loadOrders = jest.fn()
      const onNavigationRedirect = jest.fn()
      const screen = renderWithProviders(
        <OrdersOption
          isDriverApp
          ordersGroup={groupedOrdersGroup([{ ...sampleOrder, status: 0 }])}
          onNavigationRedirect={onNavigationRedirect}
          handleChangeOrderStatus={change.fn}
          loadOrders={loadOrders}
        />
      )
      fireEvent.press(screen.getAllByLabelText(/^Group No\./)[0])
      fireEvent.press(screen.getByText('Reject all'))
      const { handleChangeOrderStatus: sent } = onNavigationRedirect.mock.calls[0][1]
      let answer!: Promise<any>
      act(() => { answer = sent(6, [1, 2]) })
      fireEvent.press(screen.getByLabelText('Refresh'))
      mockReconnect!()
      // The load would overlap the change and could bring back an order it just answered.
      expect(loadOrders).not.toHaveBeenCalled()
      await act(async () => { change.finish([{ id: 1 }, { id: 2 }]); await answer })
      await waitFor(() => expect(loadOrders).toHaveBeenCalledTimes(1))
    })

    it('a change that did not take does not load by itself, but a refresh asked meanwhile still runs when it ends', async () => {
      const change = pending()
      const loadOrders = jest.fn()
      const onNavigationRedirect = jest.fn()
      const screen = renderWithProviders(
        <OrdersOption
          isDriverApp
          ordersGroup={groupedOrdersGroup([{ ...sampleOrder, status: 0 }])}
          onNavigationRedirect={onNavigationRedirect}
          handleChangeOrderStatus={change.fn}
          loadOrders={loadOrders}
        />
      )
      fireEvent.press(screen.getAllByLabelText(/^Group No\./)[0])
      fireEvent.press(screen.getByText('Reject all'))
      const { handleChangeOrderStatus: sent } = onNavigationRedirect.mock.calls[0][1]
      let answer!: Promise<any>
      act(() => { answer = sent(6, [1, 2]) })
      fireEvent.press(screen.getByLabelText('Refresh'))
      expect(loadOrders).not.toHaveBeenCalled()
      await act(async () => { change.finish([null, null]); await answer })
      await waitFor(() => expect(loadOrders).toHaveBeenCalledTimes(1))
    })
  })

  describe('what the list was asked for is what was applied, not what is being typed', () => {
    // The search form is the modal's page: it is left with the system's back (it has no close button of its own).
    const closeForm = (screen: any) => {
      let modal: any = screen.getByPlaceholderText('Order number')
      while (modal && modal.type !== Modal) modal = modal.parent
      fireEvent(modal, 'requestClose')
    }

    it('typing in the search form changes nothing behind it: the tabs stay and a reload asks for the tab, not for the search', () => {
      const loadOrders = jest.fn()
      const screen = renderWithProviders(<OrdersOption isDriverApp loadOrders={loadOrders} />)
      fireEvent.press(screen.getByLabelText('Search orders'))
      fireEvent.changeText(screen.getByPlaceholderText('Order number'), '42')
      expect(screen.getByTestId('orders-tabs')).toBeTruthy()
      expect(screen.queryByTestId('orders-filter-notice')).toBeNull()
      fireEvent.press(screen.getByLabelText('Refresh'))
      expect(loadOrders).toHaveBeenCalledWith({ newFetch: true }, { allStatusses: false })
    })

    it('leaving the form without searching drops what was typed', () => {
      const screen = renderWithProviders(<OrdersOption isDriverApp />)
      fireEvent.press(screen.getByLabelText('Search orders'))
      fireEvent.changeText(screen.getByPlaceholderText('Order number'), '42')
      closeForm(screen)
      fireEvent.press(screen.getByLabelText('Search orders'))
      expect(screen.getByPlaceholderText('Order number').props.value).toBe('')
    })

    it('leaving the form after a search keeps the search applied, and the form shows it again', () => {
      const loadOrders = jest.fn()
      const screen = renderWithProviders(<OrdersOption isDriverApp loadOrders={loadOrders} ordersFiltered={{ orders: [], loading: false, pagination: { total: 0 } }} />)
      fireEvent.press(screen.getByLabelText('Search orders'))
      fireEvent.changeText(screen.getByPlaceholderText('Order number'), '42')
      fireEvent.press(screen.getByText('Search'))
      expect(screen.getByTestId('orders-filter-notice')).toBeTruthy()
      fireEvent.press(screen.getByLabelText('Search orders'))
      fireEvent.changeText(screen.getByPlaceholderText('Order number'), '4299')
      closeForm(screen)
      expect(screen.getByTestId('orders-filter-notice')).toBeTruthy()
      fireEvent.press(screen.getByLabelText('Search orders'))
      expect(screen.getByPlaceholderText('Order number').props.value).toBe('42')
    })
  })

  describe('a group of pending orders', () => {
    const renderGroup = (onNavigationRedirect = jest.fn()) => {
      const screen = renderWithProviders(
        <OrdersOption
          isDriverApp
          ordersGroup={groupedOrdersGroup([{ ...sampleOrder, status: 0 }])}
          onNavigationRedirect={onNavigationRedirect}
          handleChangeOrderStatus={jest.fn()}
        />
      )
      fireEvent.press(screen.getAllByLabelText(/^Group No\./)[0])
      return screen
    }

    it('Accept all is a sheet over the list and Reject all, a reason form, is the route', () => {
      const onNavigationRedirect = jest.fn()
      const screen = renderGroup(onNavigationRedirect)
      fireEvent.press(screen.getByText('Accept all'))
      expect(onNavigationRedirect).not.toHaveBeenCalled()
      expect(screen.getByTestId('order-sheet')).toBeTruthy()
      fireEvent.press(screen.getByLabelText('Close'))
      expect(screen.queryByTestId('order-sheet')).toBeNull()
      fireEvent.press(screen.getByText('Reject all'))
      expect(onNavigationRedirect).toHaveBeenCalledWith('AcceptOrRejectOrder', expect.objectContaining({ action: 'reject' }))
    })
  })
})

describe('OrdersOption: the tabs of a project that combines its pending and in progress orders are right from the first paint', () => {
  const COMBINE = 'combine_pending_and_progress_orders'
  const { offlineActionsState } = require('../../../../../../jest/helpers/d3OrdersUiMock')
  const withSwitch = (value?: string, extra: any = {}) => ({
    loading: false,
    configs: { default_order_type: { value: 'delivery' }, ...(value === undefined ? {} : { [COMBINE]: { key: COMBINE, value } }) },
    ...extra
  })
  const tabNames = (screen: any) => screen.queryAllByRole('tab').map((tab: any) => within(tab).getAllByText(/.+/)[0].props.children)
  const COMBINED = ['Active', 'History']
  const FOUR = ['Assigned', 'In Progress', 'History']

  beforeEach(() => {
    jest.clearAllMocks()
    offlineActionsState.isNetConnected = true
    offlineActionsState.isCombinedTabs = false
    offlineActionsState.combinedTabsRead = true
    offlineActionsState.actions = {}
    const { _retrieveStoreData } = require('../../../providers/StoreUtil')
    _retrieveStoreData.mockReset().mockResolvedValue(null)
  })

  /**
   * The tabs the screen hands its controller at each of its renders (what the UI draws them from): what a driver could have seen on
   * the way, not only what is left. The controller is the mock's, which calls through.
   */
  const recordTabs = () => {
    const components = require('@components')
    const original = components.OrderListGroups
    const seen: string[][] = []
    const spy = jest.spyOn(components, 'OrderListGroups').mockImplementation((props: any) => {
      seen.push(props.tabs.map((tab: any) => tab.text))
      return original(props)
    })
    return { seen, restore: () => spy.mockRestore() }
  }

  it('shows two tabs at the first render for a project whose config combines them, and never three', async () => {
    ;(useConfig as jest.Mock).mockReturnValue([withSwitch('1')])
    const screen = renderWithProviders(<OrdersOption isDriverApp />)
    // Right after `render`, with nothing awaited: the first committed render.
    expect(tabNames(screen)).toEqual(COMBINED)
    await act(async () => {})
    expect(tabNames(screen)).toEqual(COMBINED)
  })

  it('hands the controller two tabs at every render, from the first (never three on the way to two)', async () => {
    ;(useConfig as jest.Mock).mockReturnValue([withSwitch('1')])
    const { seen, restore } = recordTabs()
    try {
      const screen = renderWithProviders(<OrdersOption isDriverApp />)
      await act(async () => {})
      expect(seen.length).toBeGreaterThan(0)
      // The controller's lists (what the tabs are built on): Active, Completed and Cancelled, from the first render.
      seen.forEach((tabs) => expect(tabs).toEqual(['Active', 'Completed', 'Cancelled']))
      expect(tabNames(screen)).toEqual(COMBINED)
    } finally {
      restore()
    }
  })

  it('shows the three tabs at once for a project that does not combine them (the switch off, or not in its config)', () => {
    ;(useConfig as jest.Mock).mockReturnValue([withSwitch('0')])
    const off = renderWithProviders(<OrdersOption isDriverApp />)
    expect(tabNames(off)).toEqual(FOUR)
    off.unmount()
    ;(useConfig as jest.Mock).mockReturnValue([withSwitch()])
    expect(tabNames(renderWithProviders(<OrdersOption isDriverApp />))).toEqual(FOUR)
  })

  it('the config wins over what an earlier run kept: kept "combined", the loaded project does not combine', () => {
    offlineActionsState.isCombinedTabs = true
    ;(useConfig as jest.Mock).mockReturnValue([withSwitch('0')])
    expect(tabNames(renderWithProviders(<OrdersOption isDriverApp />))).toEqual(FOUR)
  })

  it('with the config not loaded, the value an earlier run kept stands in: kept "combined" is two at the first render, never three', async () => {
    offlineActionsState.isCombinedTabs = true
    ;(useConfig as jest.Mock).mockReturnValue([{ loading: false, configs: {} }])
    const screen = renderWithProviders(<OrdersOption isDriverApp />)
    expect(tabNames(screen)).toEqual(COMBINED)
    await act(async () => {})
    expect(tabNames(screen)).toEqual(COMBINED)
  })

  it('with the config not loaded, kept "not combined" is three at the first render, never two', () => {
    offlineActionsState.isCombinedTabs = false
    ;(useConfig as jest.Mock).mockReturnValue([{ loading: true, configs: {} }])
    expect(tabNames(renderWithProviders(<OrdersOption isDriverApp />))).toEqual(FOUR)
  })

  describe('with the config not loaded and nothing kept', () => {
    beforeEach(() => { offlineActionsState.isCombinedTabs = null })

    it('holds the tab bar and the list while the config is still loading: no tab at all, a bone as high as the bar, the skeleton for the list', () => {
      ;(useConfig as jest.Mock).mockReturnValue([{ loading: true, configs: {} }])
      const screen = renderWithProviders(<OrdersOption isDriverApp />)
      expect(screen.queryAllByRole('tab')).toHaveLength(0)
      expect(screen.queryByTestId('orders-tabs')).toBeNull()
      expect(screen.getByTestId('orders-tabs-pending')).toBeTruthy()
      expect(screen.getByTestId('order-list-skeleton')).toBeTruthy()
      // The rows the controller loaded meanwhile are the other set's: none is shown, and no empty state either.
      expect(screen.queryByText('Store A')).toBeNull()
      expect(screen.queryByText('Sorry, no results found')).toBeNull()
    })

    it('draws the Assigned tab\'s skeleton as the offered card: the position\'s setter chip leads its chips (a card with no position is taller than one with it)', () => {
      ;(useConfig as jest.Mock).mockReturnValue([{ loading: true, configs: {} }])
      const { StyleSheet } = require('react-native')
      const { defaultAppTheme } = require('../../../../../theme/engine')
      const setter = defaultAppTheme().native.components.chip.sizes.sm.height
      const screen = renderWithProviders(<OrdersOption isDriverApp />)
      const heights = screen.getByTestId('order-list-skeleton')
        .findAll((node: any) => typeof node.type === 'string' && typeof StyleSheet.flatten(node.props.style)?.height === 'number' && StyleSheet.flatten(node.props.style)?.opacity !== undefined)
        .map((node: any) => StyleSheet.flatten(node.props.style).height)
      expect(heights).toContain(setter)
    })

    it('holds the tab bar while the kept value is still being read', () => {
      offlineActionsState.combinedTabsRead = false
      ;(useConfig as jest.Mock).mockReturnValue([{ loading: false, configs: {} }])
      const screen = renderWithProviders(<OrdersOption isDriverApp />)
      expect(screen.queryAllByRole('tab')).toHaveLength(0)
      expect(screen.getByTestId('orders-tabs-pending')).toBeTruthy()
    })

    it('draws the default, the three tabs, once the config failed to load (no connection) and nothing was ever kept', () => {
      ;(useConfig as jest.Mock).mockReturnValue([{ loading: false, configs: {} }])
      const screen = renderWithProviders(<OrdersOption isDriverApp />)
      expect(tabNames(screen)).toEqual(FOUR)
      expect(screen.queryByTestId('orders-tabs-pending')).toBeNull()
    })

    it('draws the tabs the moment the config arrives, in the render that carries it', () => {
      ;(useConfig as jest.Mock).mockReturnValue([{ loading: true, configs: {} }])
      const screen = renderWithProviders(<OrdersOption isDriverApp />)
      expect(screen.queryAllByRole('tab')).toHaveLength(0)
      ;(useConfig as jest.Mock).mockReturnValue([withSwitch('1')])
      screen.rerender(<OrdersOption isDriverApp />)
      expect(tabNames(screen)).toEqual(COMBINED)
    })
  })

  describe('the controller follows the screen', () => {
    it('starts from the switch the tabs were drawn with and is not told it again (its effect on the switch resets the list it works on)', () => {
      const setCombineTabsState = jest.fn()
      ;(useConfig as jest.Mock).mockReturnValue([withSwitch('1')])
      const screen = renderWithProviders(<OrdersOption isDriverApp setCombineTabsState={setCombineTabsState} />)
      screen.rerender(<OrdersOption isDriverApp setCombineTabsState={setCombineTabsState} />)
      expect(setCombineTabsState).not.toHaveBeenCalled()
    })

    it('is told nothing while the tabs are not known, and the value once they are', () => {
      const setCombineTabsState = jest.fn()
      offlineActionsState.isCombinedTabs = null
      ;(useConfig as jest.Mock).mockReturnValue([{ loading: true, configs: {} }])
      const screen = renderWithProviders(<OrdersOption isDriverApp setCombineTabsState={setCombineTabsState} />)
      expect(setCombineTabsState).not.toHaveBeenCalled()
      ;(useConfig as jest.Mock).mockReturnValue([withSwitch('1')])
      screen.rerender(<OrdersOption isDriverApp setCombineTabsState={setCombineTabsState} />)
      expect(setCombineTabsState).toHaveBeenLastCalledWith(true)
    })

    it('follows a config that loads over the value an earlier run kept', () => {
      const setCombineTabsState = jest.fn()
      offlineActionsState.isCombinedTabs = true
      ;(useConfig as jest.Mock).mockReturnValue([{ loading: true, configs: {} }])
      const screen = renderWithProviders(<OrdersOption isDriverApp setCombineTabsState={setCombineTabsState} />)
      expect(tabNames(screen)).toEqual(COMBINED)
      ;(useConfig as jest.Mock).mockReturnValue([withSwitch('0')])
      screen.rerender(<OrdersOption isDriverApp setCombineTabsState={setCombineTabsState} />)
      expect(tabNames(screen)).toEqual(FOUR)
      expect(setCombineTabsState).toHaveBeenLastCalledWith(false)
    })
  })

  describe('the screen neither reads nor writes the switch in the storage (the provider does, from the loaded config)', () => {
    it('reads nothing, and the screen is not rendered again once it is painted (no value arrives later)', async () => {
      ;(useConfig as jest.Mock).mockReturnValue([withSwitch('1')])
      const { _retrieveStoreData, _setStoreData, _removeStoreData } = require('../../../providers/StoreUtil')
      const { seen, restore } = recordTabs()
      try {
        renderWithProviders(<OrdersOption isDriverApp />)
        const atFirstPaint = seen.length
        await act(async () => {})
        // The screen's own renders (the controller gets its props from each): the value used to be read, then set, which drew it twice.
        expect(seen).toHaveLength(atFirstPaint)
      } finally {
        restore()
      }
      const asked = (mock: jest.Mock) => mock.mock.calls.filter((call) => call[0] === COMBINE)
      expect(asked(_retrieveStoreData)).toHaveLength(0)
      expect(asked(_setStoreData)).toHaveLength(0)
      expect(asked(_removeStoreData)).toHaveLength(0)
    })

    it('keeps the kept value while connected (it used to be removed at each online start, so a cold start offline never had it)', () => {
      ;(useConfig as jest.Mock).mockReturnValue([withSwitch('1')])
      const { _removeStoreData } = require('../../../providers/StoreUtil')
      renderWithProviders(<OrdersOption isDriverApp isNetConnected />)
      expect(_removeStoreData).toHaveBeenCalledWith('last_date_connection')
      expect(_removeStoreData).not.toHaveBeenCalledWith(COMBINE)
    })
  })
})
