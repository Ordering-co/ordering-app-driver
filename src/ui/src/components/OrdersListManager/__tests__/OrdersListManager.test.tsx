import React from 'react'
import { fireEvent } from '@testing-library/react-native'

import { useConfig } from '@components'

require('../../../../../../jest/helpers/registerD3OrdersMocks')

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

jest.mock('react-native-vector-icons/Fontisto', () => {
  const React = require('react')
  const { Pressable, Text } = require('react-native')
  return (props: any) =>
    React.createElement(
      Pressable,
      { testID: `fontisto-${props.name}`, onPress: props.onPress },
      React.createElement(Text, null, props.name)
    )
})

jest.mock('@ui', () => {
  const { buildD3OrdersIntegrationUiMock } = require('../../../../../../jest/helpers/d3OrdersUiMock')
  return buildD3OrdersIntegrationUiMock()
})

jest.mock('@components', () => {
  const { getMock } = require('../../../../../../jest/helpers/d3OrdersComponentsMock')
  return getMock()
})

import { OrdersListManager } from '..'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'

describe('OrdersListManager', () => {
  beforeEach(() => {
    ;(useConfig as jest.Mock).mockReturnValue([{ configs: {} }])
  })

  it('renders orders header and pending tab', () => {
    const { getByText, getAllByText } = renderWithProviders(<OrdersListManager />)
    expect(getByText('My orders')).toBeTruthy()
    expect(getAllByText('Pending').length).toBeGreaterThan(0)
  })

  it('renders previous orders when orders exist', () => {
    const { getByText } = renderWithProviders(<OrdersListManager />)
    expect(getByText('Store A')).toBeTruthy()
  })

  it('reloads orders when refresh icon is pressed', () => {
    const loadOrders = jest.fn()
    const { getByTestId } = renderWithProviders(
      <OrdersListManager loadOrders={loadOrders} />
    )
    fireEvent.press(getByTestId('feather-refresh-cw'))
    expect(loadOrders).toHaveBeenCalledWith({ newFetch: true })
  })

  it('switches to in progress tab', () => {
    const setCurrentTabSelected = jest.fn()
    const { getByText } = renderWithProviders(
      <OrdersListManager setCurrentTabSelected={setCurrentTabSelected} />
    )
    fireEvent.press(getByText('In Progress'))
    expect(setCurrentTabSelected).toHaveBeenCalledWith('inProgress')
  })

  it('opens search modal from search icon', () => {
    const { getByTestId, getByPlaceholderText } = renderWithProviders(
      <OrdersListManager />
    )
    fireEvent.press(getByTestId('fontisto-search'))
    expect(getByPlaceholderText('Order number')).toBeTruthy()
  })

  it('shows SLA settings when enterprise plan is enabled', () => {
    ;(useConfig as jest.Mock).mockReturnValue([{
      configs: { plan_enterprise: { value: '1' } }
    }])
    const { getByText } = renderWithProviders(<OrdersListManager />)
    expect(getByText(/SLA.s Settings/)).toBeTruthy()
  })

  it('opens SLA settings modal when enterprise button is pressed', () => {
    ;(useConfig as jest.Mock).mockReturnValue([{
      configs: { plan_enterprise: { value: '1' } }
    }])
    const { getAllByText } = renderWithProviders(<OrdersListManager />)
    fireEvent.press(getAllByText(/SLA.s Settings/)[0])
    expect(getAllByText(/SLA.s Settings/).length).toBeGreaterThan(1)
  })

  it('switches to cancelled tab', () => {
    const setCurrentTabSelected = jest.fn()
    const { getByText } = renderWithProviders(
      <OrdersListManager setCurrentTabSelected={setCurrentTabSelected} />
    )
    fireEvent.press(getByText('Cancelled'))
    expect(setCurrentTabSelected).toHaveBeenCalledWith('cancelled')
  })

  it('switches to completed tab', () => {
    const setCurrentTabSelected = jest.fn()
    const { getByText } = renderWithProviders(
      <OrdersListManager setCurrentTabSelected={setCurrentTabSelected} />
    )
    fireEvent.press(getByText('Completed'))
    expect(setCurrentTabSelected).toHaveBeenCalledWith('completed')
  })

  it('loads more orders when pagination allows', () => {
    const loadMoreOrders = jest.fn()
    const { getByText } = renderWithProviders(
      <OrdersListManager loadMoreOrders={loadMoreOrders} />
    )
    fireEvent.press(getByText('Load more orders'))
    expect(loadMoreOrders).toHaveBeenCalled()
  })

  it('shows empty state when pending tab has no orders', () => {
    const { getByText } = renderWithProviders(
      <OrdersListManager
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

  it('applies search filters from modal', () => {
    const onFiltered = jest.fn()
    const { getByTestId, getByText } = renderWithProviders(
      <OrdersListManager onFiltered={onFiltered} />
    )
    fireEvent.press(getByTestId('fontisto-search'))
    fireEvent.press(getByText('Search'))
    expect(onFiltered).toHaveBeenCalled()
  })

  it('shows loading skeleton while orders are loading', () => {
    const { getByTestId } = renderWithProviders(
      <OrdersListManager
        ordersGroup={{
          pending: { orders: [], loading: true, defaultFilter: [0], currentFilter: [0], pagination: { currentPage: 1, pageSize: 10, totalPages: 1, total: null } },
          inProgress: { orders: [], loading: false, defaultFilter: [3], currentFilter: [3], pagination: { currentPage: 1, pageSize: 10, totalPages: 1, total: 0 } },
          completed: { orders: [], loading: false, defaultFilter: [1], currentFilter: [1], pagination: { currentPage: 1, pageSize: 10, totalPages: 1, total: 0 } },
          cancelled: { orders: [], loading: false, defaultFilter: [2], currentFilter: [2], pagination: { currentPage: 1, pageSize: 10, totalPages: 1, total: 0 } }
        }}
      />
    )
    expect(getByTestId('order-list-skeleton')).toBeTruthy()
  })
})
