import React from 'react'
import { fireEvent } from '@testing-library/react-native'

import { useConfig } from '@components'

jest.mock('rn-placeholder', () => {
  const { View } = require('react-native')
  return {
    Placeholder: ({ children }: any) => <View testID="placeholder">{children}</View>,
    PlaceholderLine: () => <View testID="placeholder-line" />,
    Fade: {}
  }
})

jest.mock('react-native-select-dropdown', () => {
  const React = require('react')
  const { View, Text, TouchableOpacity } = require('react-native')
  return ({ data, defaultButtonText, onSelect, buttonTextAfterSelection }: any) => (
    <View testID="select-dropdown">
      <Text>{defaultButtonText}</Text>
      {data?.map((item: any, index: number) => (
        <TouchableOpacity key={index} testID={`select-option-${index}`} onPress={() => onSelect?.(item, index)}>
          <Text>{buttonTextAfterSelection?.(item) ?? item?.name ?? item}</Text>
        </TouchableOpacity>
      ))}
    </View>
  )
})

jest.mock('react-native-vector-icons/Feather', () => {
  const React = require('react')
  const { Pressable, Text } = require('react-native')
  return (props: any) =>
    React.createElement(
      Pressable,
      { testID: `feather-${props.name}`, onPress: props.onPress },
      React.createElement(Text, null, props.name)
    )
})

jest.mock('react-native-vector-icons/AntDesign', () => {
  const React = require('react')
  const { Pressable, Text } = require('react-native')
  return (props: any) =>
    React.createElement(
      Pressable,
      { testID: `antdesign-${props.name}`, onPress: props.onPress },
      React.createElement(Text, null, props.name)
    )
})

jest.mock('../../../providers/StoreUtil', () => ({
  _retrieveStoreData: jest.fn().mockResolvedValue(null),
  _setStoreData: jest.fn(),
  _removeStoreData: jest.fn()
}))

jest.mock('@ui', () => {
  const { buildD3OrdersIntegrationUiMock } = require('../../../../../../jest/helpers/d3OrdersUiMock')
  return buildD3OrdersIntegrationUiMock()
})

jest.mock('@components', () => {
  const { getMock } = require('../../../../../../jest/helpers/d3OrdersComponentsMock')
  return getMock()
})

import { OrdersOption } from '..'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'

describe('OrdersOption', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    const { offlineActionsState } = require('../../../../../../jest/helpers/d3OrdersUiMock')
    offlineActionsState.isNetConnected = true
    offlineActionsState.isCombinedTabs = false
    offlineActionsState.actions = {}
    ;(useConfig as jest.Mock).mockReturnValue([{ configs: {} }])
  })

  it('renders orders header for business app', () => {
    const { getByText } = renderWithProviders(<OrdersOption isDriverApp />)
    expect(getByText('My orders')).toBeTruthy()
  })

  it('renders previous orders when orders exist', () => {
    const { getByText } = renderWithProviders(<OrdersOption isDriverApp />)
    expect(getByText('Store A')).toBeTruthy()
  })

  it('switches to cancelled tab', () => {
    const setCurrentTabSelected = jest.fn()
    const { getByText } = renderWithProviders(
      <OrdersOption isDriverApp setCurrentTabSelected={setCurrentTabSelected} />
    )
    fireEvent.press(getByText('Cancelled'))
    expect(setCurrentTabSelected).toHaveBeenCalledWith('cancelled')
  })

  it('loads orders on refresh', () => {
    const loadOrders = jest.fn()
    const { getByTestId } = renderWithProviders(
      <OrdersOption isDriverApp loadOrders={loadOrders} />
    )
    fireEvent.press(getByTestId('feather-refresh-cw'))
    expect(loadOrders).toHaveBeenCalledWith({ newFetch: true }, { allStatusses: false })
  })

  it('switches to completed tab', () => {
    const setCurrentTabSelected = jest.fn()
    const { getByText } = renderWithProviders(
      <OrdersOption isDriverApp setCurrentTabSelected={setCurrentTabSelected} />
    )
    fireEvent.press(getByText('Completed'))
    expect(setCurrentTabSelected).toHaveBeenCalledWith('completed')
  })

  it('opens search modal from filter icon', () => {
    const { getByTestId, getByPlaceholderText } = renderWithProviders(<OrdersOption isDriverApp />)
    fireEvent.press(getByTestId('antdesign-filter'))
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
    const { getByTestId, getByText } = renderWithProviders(
      <OrdersOption isDriverApp onFiltered={onFiltered} />
    )
    fireEvent.press(getByTestId('antdesign-filter'))
    fireEvent.press(getByText('Search'))
    expect(onFiltered).toHaveBeenCalled()
  })

  it('shows SLA filter in search modal when enterprise plan is enabled', () => {
    ;(useConfig as jest.Mock).mockReturnValue([{
      configs: { plan_enterprise: { value: '1' } }
    }])
    const { getByTestId, getAllByText } = renderWithProviders(<OrdersOption isDriverApp />)
    fireEvent.press(getByTestId('antdesign-filter'))
    expect(getAllByText(/SLA.s/).length).toBeGreaterThan(0)
  })

  it('shows empty state when pending tab has no orders', () => {
    const { getByText } = renderWithProviders(
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
    expect(getByText('Sorry, no results found')).toBeTruthy()
  })

  it('switches to in progress tab', () => {
    const setCurrentTabSelected = jest.fn()
    const { getByText } = renderWithProviders(
      <OrdersOption isDriverApp setCurrentTabSelected={setCurrentTabSelected} />
    )
    fireEvent.press(getByText('In Progress'))
    expect(setCurrentTabSelected).toHaveBeenCalledWith('inProgress')
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
    const { getByTestId, getByText } = renderWithProviders(
      <OrdersOption isDriverApp onFiltered={onFiltered} />
    )
    fireEvent.press(getByTestId('antdesign-filter'))
    fireEvent.press(getByText('Clear search'))
    expect(onFiltered).toHaveBeenCalledWith(null)
  })

  it('selects an SLA filter in enterprise search modal', () => {
    ;(useConfig as jest.Mock).mockReturnValue([{
      configs: { plan_enterprise: { value: '1' } }
    }])
    const { getByTestId, getByText } = renderWithProviders(<OrdersOption isDriverApp />)
    fireEvent.press(getByTestId('antdesign-filter'))
    fireEvent.press(getByText('At Risk'))
    expect(getByText('Search')).toBeTruthy()
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
    const { getByText, getByTestId, getByPlaceholderText } = renderWithProviders(
      <OrdersOption
        isDriverApp
        ordersFiltered={{ orders: [], loading: false, pagination: { currentPage: 1, pageSize: 10, totalPages: 1, total: 0 } }}
        onFiltered={onFiltered}
      />
    )
    fireEvent.press(getByTestId('antdesign-filter'))
    fireEvent.changeText(getByPlaceholderText('Order number'), '42')
    fireEvent.press(getByText('Search'))
    expect(getByText(/Filters applied/)).toBeTruthy()
  })

  it('clears active filters from filter alert banner', () => {
    const onFiltered = jest.fn()
    const { getByText, getByTestId, getByPlaceholderText } = renderWithProviders(
      <OrdersOption
        isDriverApp
        ordersFiltered={{ orders: [], loading: false, pagination: { currentPage: 1, pageSize: 10, totalPages: 1, total: 0 } }}
        onFiltered={onFiltered}
      />
    )
    fireEvent.press(getByTestId('antdesign-filter'))
    fireEvent.changeText(getByPlaceholderText('Order number'), '42')
    fireEvent.press(getByText('Search'))
    fireEvent.press(getByText('Clear filters'))
    expect(onFiltered).toHaveBeenCalledWith(null)
  })

  it('reloads logistic orders on refresh when logistic tab is selected', () => {
    const loadLogisticOrders = jest.fn()
    const { getByTestId } = renderWithProviders(
      <OrdersOption
        isDriverApp
        currentTabSelected="logisticOrders"
        loadLogisticOrders={loadLogisticOrders}
      />
    )
    fireEvent.press(getByTestId('feather-refresh-cw'))
    expect(loadLogisticOrders).toHaveBeenCalled()
  })

  it('shows status tags for business app on pending tab', () => {
    const { getByText, getAllByText } = renderWithProviders(
      <OrdersOption isBusinessApp currentTabSelected="pending" />
    )
    expect(getByText('All')).toBeTruthy()
    expect(getAllByText('Pending').length).toBeGreaterThan(0)
  })

  it('selects a status tag filter for business app', () => {
    const setCurrentFilters = jest.fn()
    const setOrdersGroup = jest.fn()
    const { getByText } = renderWithProviders(
      <OrdersOption
        isBusinessApp
        currentTabSelected="pending"
        setCurrentFilters={setCurrentFilters}
        setOrdersGroup={setOrdersGroup}
      />
    )
    fireEvent.press(getByText('Preorder'))
    expect(setCurrentFilters).toHaveBeenCalled()
    expect(setOrdersGroup).toHaveBeenCalled()
  })

  it('shows logistic empty state when logistic tab has no orders', () => {
    const { getByText } = renderWithProviders(
      <OrdersOption
        isDriverApp
        currentTabSelected="logisticOrders"
        logisticOrders={{ orders: [], loading: false, error: [] }}
      />
    )
    expect(getByText('Sorry, no results found')).toBeTruthy()
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

  it('selects all status tags for business app', () => {
    const setCurrentFilters = jest.fn()
    const { getByText } = renderWithProviders(
      <OrdersOption
        isBusinessApp
        currentTabSelected="pending"
        setCurrentFilters={setCurrentFilters}
      />
    )
    fireEvent.press(getByText('All'))
    expect(setCurrentFilters).toHaveBeenCalled()
  })
})
