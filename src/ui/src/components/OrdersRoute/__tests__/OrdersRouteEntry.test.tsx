import '../../../../../../jest/helpers/uiModuleMocks'
import React from 'react'
import { act, fireEvent } from '@testing-library/react-native'

// The real primitives: the stubs of `@ui` are for the screens that mock part of the library.
jest.mock('@ui', () => ({}))
jest.mock('@components', () => require('../../../../../../jest/helpers/d3OrdersComponentsMock').getMock())

import { OrdersRouteEntry } from '../OrdersRouteEntry'
import * as source from '../routeSource'
import { clearRouteSource, currentRouteSource } from '../routeSource'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { buildAppTheme, THEME_PRODUCT_TYPE } from '../../../../../theme/engine'
import { order } from './fixtures'

const themeWith = (values: any) => buildAppTheme({ version: 2, product_type: THEME_PRODUCT_TYPE, values })
const rows = [order(1042, { delivery_position: 1 }), order(1044, { status: 9, delivery_position: 2 })]

const entry = (props: any = {}, themeOverrides?: any) => {
  const onNavigationRedirect = jest.fn()
  const handleChangeOrderStatus = jest.fn()
  const tree = (extra: any = {}) => <OrdersRouteEntry view='inProgress' orders={rows} onNavigationRedirect={onNavigationRedirect} handleChangeOrderStatus={handleChangeOrderStatus} {...props} {...extra} />
  const screen = renderWithProviders(tree(), themeOverrides ? { themeOverrides } : undefined)
  return { screen, tree, onNavigationRedirect, handleChangeOrderStatus }
}

describe('OrdersRouteEntry: the route\'s button in the orders list', () => {
  beforeEach(() => { act(() => clearRouteSource()) })
  afterEach(() => { act(() => clearRouteSource()) })

  it('is one outlined button across the list: a route glyph and "Route · N stops", N counting the stops, not the orders', () => {
    const { screen } = entry()
    // 1042 (a store, then its customer) and 1044 (its customer): three stops.
    const button = screen.getByTestId('orders-route-entry')
    expect(screen.getByText('Route · 3 stops')).toBeTruthy()
    expect(button.props.accessibilityRole).toBe('button')
    expect(screen.UNSAFE_getByType('Icon' as any).props.name).toBe('map-marker-path')
  })

  it('says "1 stop" for one', () => {
    const { screen } = entry({ orders: [order(1044, { status: 9 })] })
    expect(screen.getByText('Route · 1 stop')).toBeTruthy()
  })

  it('opens the route', () => {
    const { screen, onNavigationRedirect } = entry()
    fireEvent.press(screen.getByTestId('orders-route-entry'))
    expect(onNavigationRedirect).toHaveBeenCalledWith('OrdersRoute')
  })

  it('is drawn on the Active tab of a project that combines the tabs, and on no other', () => {
    expect(entry({ view: 'active' }).screen.getByTestId('orders-route-entry')).toBeTruthy()
    for (const view of ['assigned', 'history', 'logisticOrders', undefined]) {
      expect(entry({ view }).screen.queryByTestId('orders-route-entry')).toBeNull()
    }
  })

  it('counts only the orders the route is about: an offered order of the Active tab has no stop', () => {
    const { screen } = entry({ view: 'active', orders: [order(1, { status: 0 }), order(2, { status: 13 }), order(3, { status: 9 })] })
    expect(screen.getByText('Route · 1 stop')).toBeTruthy()
  })

  it('goes with the last order: nothing is drawn with no stop to make', () => {
    const { screen, tree } = entry()
    expect(screen.getByTestId('orders-route-entry')).toBeTruthy()
    screen.rerender(tree({ orders: [order(1042, { status: 11 })] }))
    expect(screen.queryByTestId('orders-route-entry')).toBeNull()
    screen.rerender(tree({ orders: [] }))
    expect(screen.queryByTestId('orders-route-entry')).toBeNull()
  })

  it('needs one stop with a location: with none it is not drawn', () => {
    const none = { name: 'Ana', address: '9 Birch', location: null }
    const { screen } = entry({ orders: [order(1, { status: 9, customer: none })] })
    expect(screen.queryByTestId('orders-route-entry')).toBeNull()
  })

  it('still counts the stop that has no location, when another one has', () => {
    const none = { name: 'Ana', address: '9 Birch', location: null }
    const { screen } = entry({ orders: [order(1, { status: 9, delivery_position: 1, customer: none }), order(2, { status: 9, delivery_position: 2 })] })
    expect(screen.getByText('Route · 2 stops')).toBeTruthy()
  })

  it('is hidden by the theme\'s route option (orders.route)', () => {
    const { screen } = entry({}, themeWith({ visibility: { 'orders.route': false } }))
    expect(screen.queryByTestId('orders-route-entry')).toBeNull()
  })

  describe('it feeds the route\'s screens with the list\'s own rows', () => {
    it('hands over the rows and the list\'s own status change while the list shows an In Progress tab', () => {
      const { handleChangeOrderStatus } = entry()
      expect(currentRouteSource().rows).toBe(rows)
      currentRouteSource().changeOrderStatus?.(3, [1042])
      expect(handleChangeOrderStatus).toHaveBeenCalledWith(3, [1042])
    })

    it('hands over a function that stays the same while the list\'s changes from one render to the next, and the newest rows', () => {
      const { screen, tree } = entry()
      const first = currentRouteSource().changeOrderStatus
      const next = jest.fn()
      const more = [order(1042, { delivery_position: 1 })]
      screen.rerender(tree({ handleChangeOrderStatus: next, orders: more }))
      expect(currentRouteSource().changeOrderStatus).toBe(first)
      expect(currentRouteSource().rows).toBe(more)
      currentRouteSource().changeOrderStatus?.(9, [1042])
      expect(next).toHaveBeenCalledWith(9, [1042])
    })

    it('hands over an empty list when the last order is gone (that is how the route learns it)', () => {
      const { screen, tree } = entry()
      screen.rerender(tree({ orders: [] }))
      expect(currentRouteSource().rows).toEqual([])
    })

    it('takes it back when the list leaves those tabs, and when it goes away', () => {
      const { screen, tree } = entry()
      expect(currentRouteSource().rows).toBe(rows)
      screen.rerender(tree({ view: 'assigned' }))
      expect(currentRouteSource().rows).toEqual([])
      screen.rerender(tree({ view: 'inProgress' }))
      expect(currentRouteSource().rows).toBe(rows)
      screen.unmount()
      expect(currentRouteSource().rows).toEqual([])
    })

    it('hands nothing over where the theme hides the route', () => {
      entry({}, themeWith({ visibility: { 'orders.route': false } }))
      expect(currentRouteSource().rows).toEqual([])
    })

    it('tells a screen that reads the source when it changes', () => {
      const seen: any[] = []
      const Reader = () => { seen.push(source.useRouteSource().rows); return null }
      renderWithProviders(<Reader />)
      const { screen, tree } = entry()
      screen.rerender(tree({ orders: [] }))
      expect(seen[0]).toEqual([])
      expect(seen).toContain(rows)
      expect(seen[seen.length - 1]).toEqual([])
    })
  })
})
