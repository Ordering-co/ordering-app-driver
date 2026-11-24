import React from 'react'
import { act, fireEvent, render } from '@testing-library/react-native'

/**
 * The app's real navigators on React Navigation 7 (the setup file's stand-ins are lifted): the stack
 * of `HomeNavigator` with its `BottomTab` of `BottomNavigator`, and only the pages replaced by stand-ins
 * that keep the `navigation` they are given (`jest/helpers/navigationScreens.js`).
 */
jest.mock('@react-navigation/native', () => jest.requireActual('@react-navigation/native'))
jest.mock('@react-navigation/stack', () => jest.requireActual('@react-navigation/stack'))
jest.mock('@react-navigation/bottom-tabs', () => jest.requireActual('@react-navigation/bottom-tabs'))
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default)

// The real new-order alert, as the authed navigator mounts it (its own suite covers what it says). It reads `useLocation`
// from `@ui`, which is this mock, so it is given lazily.
jest.mock('@ui', () => ({
  ...require('../../../jest/helpers/sharedPrimitivesMock').sharedPrimitives(),
  useLocation: () => ({ getCurrentLocation: jest.fn() }),
  // The connection sheet's host draws nothing until the pill of the Orders header asks for it (its own suite covers it).
  ConnectionHost: () => null,
  get NewOrderNotification () { return require('../../ui/src/components/NewOrderNotification').NewOrderNotification }
}))
// The app's event emitter is a real one, shared by whoever asks for it, as in the app.
jest.mock('@components', () => {
  const { EventEmitter } = require('events')
  const events = new EventEmitter()
  const socket = { join: jest.fn(), leave: jest.fn(), on: jest.fn(), off: jest.fn() }
  const { renderUiController } = require('../../../jest/helpers/d1ShellDefaults')
  return {
    ...require('../../../jest/helpers/mockOrdering'),
    useEvent: jest.fn(() => [events]),
    // The socket wrapper's surface the navigators use (the rooms of the signed-in driver, the listeners of the reconnect provider).
    useWebsocket: jest.fn(() => socket),
    NewOrderNotification: renderUiController({ orderStatus: [0, 7] })
  }
})
jest.mock('../../context/PermissionsContext', () => require('../../../jest/helpers/mockPermissionsContext'))

jest.mock('../../pages/MyOrders', () => require('../../../jest/helpers/navigationScreens').screen('Orders'))
jest.mock('../../pages/MapView', () => require('../../../jest/helpers/navigationScreens').screen('MapView'))
jest.mock('../../pages/Messages', () => require('../../../jest/helpers/navigationScreens').screen('Messages'))
jest.mock('../../pages/Profile', () => require('../../../jest/helpers/navigationScreens').screen('Profile'))
jest.mock('../../pages/RequestPermissions', () => require('../../../jest/helpers/navigationScreens').screen('RequestPermissions'))
jest.mock('../../pages/OrderDetails', () => require('../../../jest/helpers/navigationScreens').screen('OrderDetails'))
jest.mock('../../pages/OrderDetailsLogistic', () => require('../../../jest/helpers/navigationScreens').screen('OrderDetailsLogistic'))
jest.mock('../../pages/OrderMessage', () => require('../../../jest/helpers/navigationScreens').screen('OrderMessage'))
jest.mock('../../pages/AcceptOrRejectOrder', () => require('../../../jest/helpers/navigationScreens').screen('AcceptOrRejectOrder'))
jest.mock('../../pages/Splash', () => require('../../../jest/helpers/navigationScreens').screen('Splash'))
jest.mock('../../pages/Sessions', () => require('../../../jest/helpers/navigationScreens').screen('Sessions'))
jest.mock('../../pages/StripeConnectAccount', () => require('../../../jest/helpers/navigationScreens').screen('StripeConnectAccount'))
jest.mock('../../pages/Payouts', () => require('../../../jest/helpers/navigationScreens').screen('Payouts'))
jest.mock('../../pages/ProfileEdit', () => require('../../../jest/helpers/navigationScreens').screen('ProfileEdit'))
jest.mock('../../pages/ProfilePassword', () => require('../../../jest/helpers/navigationScreens').screen('ProfilePassword'))
jest.mock('../../pages/Schedule', () => require('../../../jest/helpers/navigationScreens').screen('Schedule'))
jest.mock('../../pages/OrdersRoute', () => require('../../../jest/helpers/navigationScreens').screen('OrdersRoute'))
jest.mock('../../pages/OrdersRouteStops', () => require('../../../jest/helpers/navigationScreens').screen('OrdersRouteStops'))

import { NavigationContainer } from '@react-navigation/native'
import { useConfig, useEvent, useSession } from '@components'
import HomeNavigator from '../HomeNavigator'
import { navigate as rootNavigate, navigationRef } from '../NavigationRef'
import { renderWithProviders } from '../../../jest/helpers/renderWithProviders'
const { seen, mounts, heights, reset } = require('../../../jest/helpers/navigationScreens')

const renderApp = () => renderWithProviders(
  <NavigationContainer ref={navigationRef}>
    <HomeNavigator />
  </NavigationContainer>
)

/** The route names of the stack and, of its BottomTab, the focused tab. */
const stackRoutes = () => navigationRef.current.getRootState().routes.map((route: any) => route.name)
const focusedTab = () => {
  const tabs = navigationRef.current.getRootState().routes.find((route: any) => route.name === 'BottomTab')
  return tabs?.state?.routes[tabs.state.index].name
}

describe('the app\'s navigators on React Navigation 7', () => {
  beforeEach(() => {
    reset()
    ;(useSession as jest.Mock).mockReturnValue([{ loading: false, user: { id: 1, level: 4 } }, {}])
  })

  describe('the tabs', () => {
    it('opens on Orders and switches tab by its bar', () => {
      const screen = renderApp()
      expect(screen.getByText('screen: Orders')).toBeTruthy()
      fireEvent.press(screen.getByLabelText('Messages'))
      expect(focusedTab()).toBe('Messages')
      expect(screen.getByText('screen: Messages')).toBeTruthy()
      fireEvent.press(screen.getByLabelText('Orders'))
      expect(focusedTab()).toBe('Orders')
    })

    it('goes to a sibling tab by its name, as the map\'s marker and the tabs\' redirects do', () => {
      renderApp()
      act(() => seen.Orders.navigation.navigate('Messages'))
      expect(focusedTab()).toBe('Messages')
      act(() => seen.Messages.navigation.navigate('Orders'))
      expect(focusedTab()).toBe('Orders')
      expect(stackRoutes()).toEqual(['BottomTab'])
    })
  })

  describe('the height of the tab bar (BottomTabBarHeightContext)', () => {
    it('is known to the screens inside the tabs and to nothing over them (what a floating button\'s inset reads)', () => {
      renderApp()
      expect(typeof heights.Orders).toBe('number')
      act(() => seen.Orders.navigation.navigate('Sessions'))
      expect(heights.Sessions).toBeUndefined()
    })
  })

  describe('the Profile tab (what `unmountOnBlur` did in React Navigation 6)', () => {
    it('starts over every time it is opened: its content leaves when another tab is focused', () => {
      const screen = renderApp()
      expect(screen.queryByText('screen: Profile')).toBeNull()
      fireEvent.press(screen.getByLabelText('Profile'))
      expect(screen.getByText('screen: Profile')).toBeTruthy()
      expect(mounts.Profile).toBe(1)

      fireEvent.press(screen.getByLabelText('Orders'))
      expect(screen.queryByText('screen: Profile')).toBeNull()

      fireEvent.press(screen.getByLabelText('Profile'))
      expect(screen.getByText('screen: Profile')).toBeTruthy()
      expect(mounts.Profile).toBe(2)
    })

    it('does not leave while a screen of the stack is open over it (Sessions, Payouts…), and is the same one on return', () => {
      const screen = renderApp()
      fireEvent.press(screen.getByLabelText('Profile'))
      expect(mounts.Profile).toBe(1)

      act(() => seen.Profile.navigation.navigate('Sessions'))
      expect(stackRoutes()).toEqual(['BottomTab', 'Sessions'])
      expect(screen.getByText('screen: Sessions')).toBeTruthy()
      // Hidden from the screen reader under the stack's screen, but mounted.
      expect(screen.queryByText('screen: Profile', { includeHiddenElements: true })).toBeTruthy()

      act(() => seen.Sessions.navigation.goBack())
      expect(stackRoutes()).toEqual(['BottomTab'])
      expect(mounts.Profile).toBe(1)
    })

    it('leaves the other tabs mounted when they are blurred', () => {
      const screen = renderApp()
      fireEvent.press(screen.getByLabelText('Messages'))
      fireEvent.press(screen.getByLabelText('Orders'))
      expect(mounts.Orders).toBe(1)
      expect(mounts.Messages).toBe(1)
      expect(screen.getByText('screen: Messages', { includeHiddenElements: true })).toBeTruthy()
    })
  })

  describe('back to the Orders tab from a screen of the stack', () => {
    it('popTo the BottomTab with the Orders screen: one BottomTab, on Orders (what the not found button does)', () => {
      const screen = renderApp()
      fireEvent.press(screen.getByLabelText('Messages'))
      act(() => seen.Messages.navigation.navigate('OrderDetails', { orderId: 5 }))
      expect(stackRoutes()).toEqual(['BottomTab', 'OrderDetails'])

      act(() => seen.OrderDetails.navigation.popTo('BottomTab', { screen: 'Orders' }))
      expect(stackRoutes()).toEqual(['BottomTab'])
      expect(focusedTab()).toBe('Orders')
    })

    it('from a deeper stack (details, then its chat): back to the tabs on Orders', () => {
      renderApp()
      act(() => seen.Orders.navigation.navigate('OrderDetails', { orderId: 5 }))
      act(() => seen.OrderDetails.navigation.navigate('OrderMessage', { orderId: 5 }))
      expect(stackRoutes()).toEqual(['BottomTab', 'OrderDetails', 'OrderMessage'])
      act(() => seen.OrderMessage.navigation.popTo('BottomTab', { screen: 'Orders' }))
      expect(stackRoutes()).toEqual(['BottomTab'])
      expect(focusedTab()).toBe('Orders')
    })

    it('navigate(\'Orders\') from the stack, as the app did in version 6, reaches no screen in version 7', () => {
      renderApp()
      act(() => seen.Orders.navigation.navigate('OrderDetails', { orderId: 5 }))
      const error = jest.spyOn(console, 'error').mockImplementation(() => undefined)
      act(() => seen.OrderDetails.navigation.navigate('Orders'))
      expect(error).toHaveBeenCalledWith(expect.stringContaining('was not handled by any navigator'))
      expect(stackRoutes()).toEqual(['BottomTab', 'OrderDetails'])
      error.mockRestore()
    })
  })

  describe('opening screens of the stack', () => {
    it('opens an order from a tab, and goes back to the tab it came from', () => {
      renderApp()
      act(() => seen.Orders.navigation.navigate('OrderDetails', { order: { id: 9 } }))
      expect(seen.OrderDetails.route.params).toEqual({ order: { id: 9 } })
      act(() => seen.OrderDetails.navigation.goBack())
      expect(stackRoutes()).toEqual(['BottomTab'])
      expect(focusedTab()).toBe('Orders')
    })

    it('opens the order of a push notification through the container\'s ref, over the tabs', () => {
      renderApp()
      act(() => rootNavigate('OrderDetails', { orderId: 77, isDriverNotification: true, isFromRoot: true }))
      expect(stackRoutes()).toEqual(['BottomTab', 'OrderDetails'])
      expect(seen.OrderDetails.route.params).toEqual({ orderId: 77, isDriverNotification: true, isFromRoot: true })
    })

    it('opens the next order of a push over the one open, and over its chat it goes back to the one open (version 6)', () => {
      renderApp()
      act(() => rootNavigate('OrderDetails', { orderId: 1 }))
      act(() => rootNavigate('OrderDetails', { orderId: 2 }))
      expect(stackRoutes()).toEqual(['BottomTab', 'OrderDetails'])
      expect(seen.OrderDetails.route.params).toEqual({ orderId: 2 })

      act(() => seen.OrderDetails.navigation.navigate('OrderMessage', { orderId: 2 }))
      expect(stackRoutes()).toEqual(['BottomTab', 'OrderDetails', 'OrderMessage'])
      act(() => rootNavigate('OrderDetails', { orderId: 3 }))
      expect(stackRoutes()).toEqual(['BottomTab', 'OrderDetails'])
      expect(seen.OrderDetails.route.params).toEqual({ orderId: 3 })
    })

    it('opens the logistic order and replaces it with the accept screen, as the delivery time request does', () => {
      renderApp()
      act(() => seen.Orders.navigation.navigate('OrderDetailsLogistic', { orderAssingId: 4 }))
      act(() => seen.OrderDetailsLogistic.navigation.replace('AcceptOrRejectOrder', { action: 'accept' }))
      expect(stackRoutes()).toEqual(['BottomTab', 'AcceptOrRejectOrder'])
    })

    it('opens the profile\'s own screens (its data, its password, its schedule) over the tabs, and back to the Profile tab', () => {
      const screen = renderApp()
      fireEvent.press(screen.getByLabelText('Profile'))
      ;['ProfileEdit', 'ProfilePassword', 'Schedule'].forEach((name) => {
        act(() => seen.Profile.navigation.navigate(name))
        expect(stackRoutes()).toEqual(['BottomTab', name])
        expect(screen.getByText(`screen: ${name}`)).toBeTruthy()
        act(() => seen[name].navigation.goBack())
        expect(stackRoutes()).toEqual(['BottomTab'])
        expect(focusedTab()).toBe('Profile')
      })
      // The tab was not rebuilt by any of them.
      expect(mounts.Profile).toBe(1)
    })

    it('opens the chat of an order from the messages tab', () => {
      renderApp()
      act(() => seen.Orders.navigation.navigate('Messages'))
      act(() => seen.Messages.navigation.navigate('OrderMessage', { orderId: 5 }))
      expect(stackRoutes()).toEqual(['BottomTab', 'OrderMessage'])
    })
  })

  describe('the new-order alert (the signed-in app\'s, not a tab\'s)', () => {
    const events = () => (useEvent as jest.Mock)()[0]
    const emit = (name: string, value: any) => act(async () => { events().emit(name, value) })
    const withRequestsTab = () => (useConfig as jest.Mock).mockReturnValue([{ configs: { logistic_module: { value: true } } }])
    afterEach(() => {
      ;(useConfig as jest.Mock).mockReturnValue([{ loading: false, configs: {} }])
      events().removeAllListeners()
    })

    it('is mounted once, whatever the tabs: one listener per event', () => {
      const screen = renderApp()
      fireEvent.press(screen.getByLabelText('Profile'))
      fireEvent.press(screen.getByLabelText('Messages'))
      fireEvent.press(screen.getByLabelText('Orders'))
      ;['order_added_notification', 'message_added_notification', 'request_register_notification'].forEach((name) => {
        expect(events().listenerCount(name)).toBe(1)
      })
    })

    it.each(['Messages', 'Profile', 'Orders'])('presents over the %s tab, even when it is not the tab the orders list is on', async (tab) => {
      const screen = renderApp()
      fireEvent.press(screen.getByLabelText(tab))
      await emit('order_added_notification', { id: 3504, status: 4 })
      expect(screen.getAllByTestId('new-order-alert')).toHaveLength(1)
      expect(screen.getByText('New order!!')).toBeTruthy()
    })

    it('presents over a screen of the stack (an order\'s details, the chat, Sessions)', async () => {
      const screen = renderApp()
      for (const name of ['OrderDetails', 'OrderMessage', 'Sessions']) {
        act(() => seen.Orders.navigation.navigate(name, { orderId: 5 }))
        await emit('order_added_notification', { id: 3504, status: 4 })
        expect(screen.getAllByTestId('new-order-alert')).toHaveLength(1)
        fireEvent.press(screen.getByLabelText('Close'))
        expect(screen.queryByTestId('new-order-alert')).toBeNull()
        act(() => seen[name].navigation.goBack())
      }
    })

    it('is not shown while the session is still loading (the splash)', async () => {
      ;(useSession as jest.Mock).mockReturnValue([{ loading: true, user: { id: 1, level: 4 } }, {}])
      const screen = renderApp()
      expect(events().listenerCount('order_added_notification')).toBe(0)
      expect(screen.queryByTestId('new-order-alert')).toBeNull()
    })

    it('"View order" of a request, from the Profile tab, takes the driver to the Orders tab and asks it for the requests', async () => {
      withRequestsTab()
      const screen = renderApp()
      fireEvent.press(screen.getByLabelText('Profile'))
      expect(focusedTab()).toBe('Profile')
      await emit('request_register_notification', { id: 52, order_id: 3504 })
      fireEvent.press(screen.getByText('View order'))
      expect(focusedTab()).toBe('Orders')
      expect(seen.Orders.route.params).toEqual(expect.objectContaining({ show: 'requests', at: expect.any(Number) }))
      expect(screen.queryByTestId('new-order-alert')).toBeNull()
    })

    it('"View order" of a request, from a screen of the stack, pops to the tabs first', async () => {
      withRequestsTab()
      const screen = renderApp()
      fireEvent.press(screen.getByLabelText('Profile'))
      act(() => seen.Profile.navigation.navigate('Sessions'))
      act(() => seen.Sessions.navigation.navigate('OrderMessage', { orderId: 8 }))
      expect(stackRoutes()).toEqual(['BottomTab', 'Sessions', 'OrderMessage'])
      await emit('request_register_notification', { id: 52, order_id: 3504 })
      fireEvent.press(screen.getByText('View order'))
      expect(stackRoutes()).toEqual(['BottomTab'])
      expect(focusedTab()).toBe('Orders')
      expect(seen.Orders.route.params).toEqual(expect.objectContaining({ show: 'requests' }))
    })

    it('asks for the requests again every time, so the second ask is seen too (`at` differs)', async () => {
      withRequestsTab()
      const screen = renderApp()
      await emit('request_register_notification', { id: 52, order_id: 3504 })
      fireEvent.press(screen.getByText('View order'))
      const first = seen.Orders.route.params.at
      await new Promise((resolve) => setTimeout(resolve, 5))
      fireEvent.press(screen.getByLabelText('Profile'))
      await emit('request_register_notification', { id: 53, order_id: 2876 })
      fireEvent.press(screen.getByText('View order'))
      expect(seen.Orders.route.params.at).toBeGreaterThan(first)
    })

    it('"View orders" takes the driver to the Orders tab and asks it for the list the orders are in', async () => {
      const screen = renderApp()
      fireEvent.press(screen.getByLabelText('Messages'))
      await emit('order_added_notification', { id: 3504, status: 4 })
      await emit('order_added_notification', { id: 2876, status: 4 })
      fireEvent.press(screen.getByText('View orders'))
      expect(focusedTab()).toBe('Orders')
      expect(seen.Orders.route.params).toEqual(expect.objectContaining({ show: 'orders', status: 4 }))
    })

    it('"View order" of an order opens its details, from any tab, and not the Orders tab\'s list', async () => {
      const screen = renderApp()
      fireEvent.press(screen.getByLabelText('Profile'))
      await emit('order_added_notification', { id: 3504, status: 4 })
      fireEvent.press(screen.getByText('View order'))
      expect(stackRoutes()).toEqual(['BottomTab', 'OrderDetails'])
      expect(seen.OrderDetails.route.params).toEqual({ orderId: 3504, isDriverNotification: true, isFromRoot: true })
    })
  })
})
