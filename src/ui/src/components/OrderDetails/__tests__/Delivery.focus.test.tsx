import '../../../../../../jest/helpers/uiModuleMocks'
import React from 'react'
import { StyleSheet } from 'react-native'
import { fireEvent, waitFor, within } from '@testing-library/react-native'

import { useApi, useConfig } from '@components'

require('../../../../../../jest/helpers/registerD3OrdersMocks')
require('../../../../../../jest/helpers/registerD4DeliveryMocks')

jest.mock('../../../../../context/PermissionsContext', () =>
  require('../../../../../../jest/helpers/mockPermissionsContext')
)

/** What the accept / reject view was drawn with: a stub, so the suite pins how Delivery opens it, not what it draws. */
const mockAcceptOrReject = jest.fn()

jest.mock('@ui', () => {
  const { pickUi } = require('../../../../../../jest/helpers/uiModuleMocks')
  const React = require('react')
  const { View, Pressable, Text } = require('react-native')
  const { buildD3OrdersUiMock } = require('../../../../../../jest/helpers/d3OrdersUiMock')
  const mock = buildD3OrdersUiMock()

  mock.AcceptOrRejectOrder = (props: any) => {
    mockAcceptOrReject(props)
    return React.createElement(View, { testID: 'accept-or-reject-stub' })
  }
  delete mock.ProductItemAccordion // the real one
  mock.FloatingButton = ({ btnText, secondBtnText, stepBtnText, thirdBtnText, firstButtonClick, secondButtonClick, stepButtonClick, thirdButtonClick }: any) =>
    React.createElement(
      View,
      { testID: 'floating-button' },
      stepBtnText ? React.createElement(Pressable, { testID: `float-${stepBtnText}`, onPress: stepButtonClick }, React.createElement(Text, null, stepBtnText)) : null,
      thirdBtnText ? React.createElement(Pressable, { testID: `float-${thirdBtnText}`, onPress: thirdButtonClick }, React.createElement(Text, null, thirdBtnText)) : null,
      btnText ? React.createElement(Pressable, { testID: `float-${btnText}`, onPress: firstButtonClick }, React.createElement(Text, null, btnText)) : null,
      secondBtnText ? React.createElement(Pressable, { testID: `float-${secondBtnText}`, onPress: secondButtonClick }, React.createElement(Text, null, secondBtnText)) : null
    )
  mock.DriverMap = ({ testID = 'driver-map-stub' }: any) => React.createElement(View, { testID })
  mock.OAlertOriginal = ({ open, content }: any) => open ? React.createElement(Text, { testID: 'delivery-alert' }, content?.[0]) : null
  mock.OModal = ({ open, children }: any) => open ? React.createElement(View, { testID: 'delivery-modal' }, children) : null
  // What the screen reads through the barrel; the rest (its location hook, the real accept view's own
  // modules) stays real.
  return pickUi(mock, ['useOfflineActions', 'FloatingButton', 'DriverMap', 'OAlertOriginal', 'OModal', 'ReviewCustomer', 'DeviceOrientationMethods', 'AcceptOrRejectOrder'])
})

jest.mock('@components', () => {
  const { getMock } = require('../../../../../../jest/helpers/d3OrdersComponentsMock')
  return getMock()
})

import { OrderDetailsDelivery } from '../Delivery'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { buildAppTheme, defaultAppTheme, THEME_PRODUCT_TYPE } from '../../../../../theme/engine'
import { bottomBarClearance, themeBottomSpace } from '../../../../../theme/helpers'
import { driverAppTitle, driverOrderTitle, sampleOrder } from '../../../../../../jest/helpers/d3OrdersDefaults'

const { PermissionsContext, mockPermissions } = require('../../../../../../jest/helpers/mockPermissionsContext')

const theme: any = defaultAppTheme()
const sections: Array<{ key: string, visible: boolean }> = theme.values.pages.order_details.sections
const flat = (node: any) => StyleSheet.flatten(node.props.style)

/** The theme with a page section hidden, a visibility key off, or both. */
const focus = ({ hide = [], off = [] }: { hide?: string[], off?: string[] } = {}) => buildAppTheme({
  version: 2,
  product_type: THEME_PRODUCT_TYPE,
  values: {
    pages: { order_details: { sections: sections.map((section) => hide.includes(section.key) ? { ...section, visible: false } : section) } },
    visibility: Object.fromEntries(off.map((key) => [key, false]))
  }
})

const renderDelivery = (ui: React.ReactElement, themeOverrides: any = focus(), permissions = mockPermissions) =>
  renderWithProviders(
    <PermissionsContext.Provider value={permissions}>{ui}</PermissionsContext.Provider>,
    { themeOverrides }
  )

const baseProps = {
  navigation: { navigate: jest.fn(), goBack: jest.fn(), canGoBack: jest.fn(() => true) },
  appTitle: driverAppTitle,
  orderTitle: driverOrderTitle,
  actions: {
    accept: 'acceptByDriver',
    reject: 'rejectByDriver',
    pickupFailed: 'pickupFailedByDriver',
    deliveryFailed: 'deliveryFailedByDriver',
    forcePickUp: 'forcePickUp',
    forceDelivery: 'forceDelivery'
  },
  handleChangeOrderStatus: jest.fn().mockResolvedValue({ id: 101 }),
  messages: { messages: [] },
  messagesReadList: []
}

const delivery = {
  ...sampleOrder,
  delivery_type: 1,
  customer_id: 7,
  business: { name: 'Store A', address: '1 Store St', location: { lat: 40.7128, lng: -74.006 } },
  customer: { name: 'Jane', lastname: 'Doe', cellphone: '5551234', address: '2 Home Ave', location: { lat: 40.72, lng: -74.01 } },
  driver_id: 1
}

const orderState = (order: any) => ({ order, loading: false, error: null })

const configs = (values: Record<string, string> = {}) => ({
  configs: {
    reject_orders_enabled: { value: '1' },
    allow_driver_reject_order: { value: '1' },
    order_not_ready_enabled: { value: '1' },
    failed_pickup_by_driver_enabled: { value: '1' },
    hidden_driver_eta_time: { value: '0' },
    ...Object.fromEntries(Object.entries(values).map(([key, value]) => [key, { value }]))
  }
})

describe('OrderDetailsDelivery: what the screen draws', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useConfig as jest.Mock).mockReturnValue([configs()])
    ;(useApi as jest.Mock).mockReturnValue([{ ordering: { root: 'https://api.test', project: 'demo' } }, {}])
  })

  describe('the body', () => {
    it('is ordered around the stop: the stop, folded rows, no collapsible cards and no header card', () => {
      const { getByTestId, queryByText, getByText } = renderDelivery(
        <OrderDetailsDelivery {...baseProps} order={orderState({ ...delivery, status: 8 })} />
      )
      expect(getByTestId('focus-stop-business')).toBeTruthy()
      expect(getByText('Then deliver to')).toBeTruthy()
      expect(queryByText('Business details')).toBeNull()
      expect(queryByText('Customer details')).toBeNull()
    })

    it('the scroll carries the page\'s gutter and the focus order as its only child', () => {
      const { getByTestId } = renderDelivery(<OrderDetailsDelivery {...baseProps} order={orderState({ ...delivery, status: 8 })} />)
      const scroll = getByTestId('order-details-scroll')
      expect(flat({ props: { style: scroll.props.contentContainerStyle } }).paddingHorizontal).toBe(theme.native.tokens.layout.page_gutter)
      expect(within(scroll).getByTestId('focus-order')).toBeTruthy()
    })

    it('gives the stop\'s Map button the screen\'s map, which checks the location permission', async () => {
      const navigate = jest.fn()
      const granted = renderDelivery(
        <OrderDetailsDelivery {...baseProps} order={orderState({ ...delivery, status: 8 })} />
      )
      fireEvent.press(granted.getByText('Map'))
      expect(await granted.findByTestId('driver-map-stub')).toBeTruthy()
      granted.unmount()
      const denied = renderDelivery(
        <OrderDetailsDelivery {...baseProps} navigation={{ ...baseProps.navigation, navigate }} order={orderState({ ...delivery, status: 8 })} />,
        focus(),
        { ...mockPermissions, isGrantedPermissions: false }
      )
      fireEvent.press(denied.getByText('Map'))
      expect(navigate).toHaveBeenCalledWith('RequestPermissions')
      expect(denied.queryByTestId('driver-map-stub')).toBeNull()
    })

    it('gives the offered order\'s "View on the map" button the same map', async () => {
      const { getByText, findByTestId } = renderDelivery(
        <OrderDetailsDelivery {...baseProps} order={orderState({ ...delivery, status: 0 })} />
      )
      fireEvent.press(getByText('View on the map'))
      expect(await findByTestId('driver-map-stub')).toBeTruthy()
    })

    it('keeps the notices over the scroll: pending sync changes', () => {
      const { offlineActionsState } = require('../../../../../../jest/helpers/d3OrdersUiMock')
      offlineActionsState.actions = { [delivery.id]: [{ event: 'evt_off_change_order_status', data: { orderId: delivery.id, body: { status: 3 } } }] }
      const { getByText } = renderDelivery(
        <OrderDetailsDelivery {...baseProps} order={orderState({ ...delivery, status: 8, unsync: true })} />
      )
      expect(getByText('Pending sync changes')).toBeTruthy()
      offlineActionsState.actions = {}
    })

    describe('the driver\'s position', () => {
      const GeoLocation = require('react-native-geolocation-service')
      const answer = GeoLocation.getCurrentPosition.getMockImplementation()
      const at = (latitude: number, longitude: number) =>
        GeoLocation.getCurrentPosition.mockImplementation((success: any) => success({ coords: { latitude, longitude }, timestamp: Date.now() }))
      afterEach(() => GeoLocation.getCurrentPosition.mockImplementation(answer))

      it('is written as a distance from the stop once the location hook has a real one', async () => {
        at(40.7128, -74.006)
        const { findByText } = renderDelivery(
          <OrderDetailsDelivery {...baseProps} order={orderState({ ...delivery, status: 8 })} />
        )
        expect(await findByText(/from you$/)).toBeTruthy()
      })

      it('is not written while the position is the 0, 0 the hook starts with', async () => {
        at(0, 0)
        const { queryByText, getByText } = renderDelivery(
          <OrderDetailsDelivery {...baseProps} order={orderState({ ...delivery, status: 8 })} />
        )
        await waitFor(() => expect(getByText('Store A')).toBeTruthy())
        expect(queryByText(/from you$/)).toBeNull()
      })
    })
  })

  describe('the top bar', () => {
    const order = orderState({ ...delivery, status: 8 })

    it('has copy and messages, and no map icon: the map is the stop card\'s button', () => {
      const { getByLabelText, queryByLabelText } = renderDelivery(<OrderDetailsDelivery {...baseProps} order={order} />)
      expect(getByLabelText('Copy order')).toBeTruthy()
      expect(getByLabelText('Messages')).toBeTruthy()
      expect(queryByLabelText('Map view')).toBeNull()
    })

    it('draws the copy and messages glyphs 24 (`icon.lg`) and pulls the last action\'s box into the gutter', () => {
      const { defaultAppTheme } = require('../../../../../theme/engine')
      const { StyleSheet } = require('react-native')
      const theme = defaultAppTheme()
      const { UNSAFE_getAllByProps, getByLabelText } = renderDelivery(<OrderDetailsDelivery {...baseProps} order={order} />)
      ;['copy-outline', 'chatbubble-ellipses-outline'].forEach((name) => {
        const glyphs = UNSAFE_getAllByProps({ name })
        expect(glyphs[glyphs.length - 1].props.size).toBe(theme.native.tokens.icon.lg)
      })
      let actions: any = getByLabelText('Copy order').parent
      while (actions && StyleSheet.flatten(actions.props?.style)?.gap !== theme.native.components.header.base.gap) actions = actions.parent
      expect(StyleSheet.flatten(actions.props.style).marginRight).toBeLessThan(0)
    })

    it('keeps the copy action away from pending orders', () => {
      const { queryByLabelText, getByLabelText } = renderDelivery(
        <OrderDetailsDelivery {...baseProps} order={orderState({ ...delivery, status: 0 })} />
      )
      expect(queryByLabelText('Copy order')).toBeNull()
      expect(getByLabelText('Messages')).toBeTruthy()
    })

    it.each(['confirmation.order.copy', 'confirmation.order.messages'])('%s hides only its button', (key) => {
      const labels: Record<string, string> = { 'confirmation.order.copy': 'Copy order', 'confirmation.order.messages': 'Messages' }
      const { queryByLabelText } = renderDelivery(<OrderDetailsDelivery {...baseProps} order={order} />, focus({ off: [key] }))
      Object.entries(labels).forEach(([other, label]) => {
        if (other === key) expect(queryByLabelText(label)).toBeNull()
        else expect(queryByLabelText(label)).toBeTruthy()
      })
    })

    it('counts the unread messages on the chat button', () => {
      const { getByTestId } = renderDelivery(
        <OrderDetailsDelivery {...baseProps} order={order} messages={{ messages: [{ id: 1, author_id: 99, read: false }] }} />
      )
      expect(within(getByTestId('order-unread-messages')).getByText('1')).toBeTruthy()
    })

    it('puts the count 2 (`xxs`) from the top of the chat button and flush with its right edge, as the boards draw it', () => {
      const { getByTestId } = renderDelivery(
        <OrderDetailsDelivery {...baseProps} order={order} messages={{ messages: [{ id: 1, author_id: 99, read: false }] }} />
      )
      const corner = StyleSheet.flatten(getByTestId('order-unread-corner').props.style)
      expect(corner).toEqual(expect.objectContaining({ position: 'absolute', top: defaultAppTheme().native.tokens.space.xxs, right: 0 }))
      expect(corner.top).toBe(2)
    })
  })

  describe('the bottom bar keeps every status step', () => {
    it.each([
      [0, ['Reject', 'Accept']],
      [8, ['Arrived to business', 'Pickup complete', 'Pickup failed']],
      [3, ['Pickup complete', 'Order not ready', 'Pickup failed']],
      [9, ['Arrived to customer', 'Delivery complete', 'Delivery failed']],
      [26, ['Delivery complete', 'Delivery failed']]
    ])('status %i', (status, buttons) => {
      const { getByTestId } = renderDelivery(<OrderDetailsDelivery {...baseProps} order={orderState({ ...delivery, status })} />)
      buttons.forEach((button) => expect(getByTestId(`float-${button}`)).toBeTruthy())
    })

    it('leaves the scroll the room of the bar\'s buttons', () => {
      const room = (order: any) => {
        const view = renderDelivery(<OrderDetailsDelivery {...baseProps} order={orderState(order)} />)
        const padding = flat({ props: { style: view.getByTestId('order-details-scroll').props.contentContainerStyle } }).paddingBottom
        view.unmount()
        return padding
      }
      expect(room({ ...delivery, status: 8 })).toBe(bottomBarClearance(theme, 0, 3))
      expect(room({ ...delivery, status: 0 })).toBe(bottomBarClearance(theme, 0, 2))
      expect(room({ ...delivery, status: 26 })).toBe(bottomBarClearance(theme, 0, 2))
    })
  })

  describe('"Review customer" is the bottom bar of an order that is over (page section review)', () => {
    const over = { ...delivery, status: 11 }

    it('is the bar\'s one button, not a button of the scroll', () => {
      const { getByTestId, queryByText } = renderDelivery(<OrderDetailsDelivery {...baseProps} order={orderState(over)} />)
      expect(getByTestId('float-Review customer')).toBeTruthy()
      expect(within(getByTestId('order-details-scroll')).queryByText('Review customer')).toBeNull()
      expect(queryByText('Pickup complete')).toBeNull()
    })

    it('opens the same review modal', () => {
      const { getByTestId, queryByTestId } = renderDelivery(<OrderDetailsDelivery {...baseProps} order={orderState(over)} />)
      expect(queryByTestId('review-customer-stub')).toBeNull()
      fireEvent.press(getByTestId('float-Review customer'))
      expect(getByTestId('review-customer-stub')).toBeTruthy()
    })

    it('the scroll leaves the bar one button\'s room', () => {
      const { getByTestId } = renderDelivery(<OrderDetailsDelivery {...baseProps} order={orderState(over)} />)
      expect(flat({ props: { style: getByTestId('order-details-scroll').props.contentContainerStyle } }).paddingBottom)
        .toBe(bottomBarClearance(theme, 0, 1))
    })

    it.each([
      ['an order already reviewed', { ...over, user_review: { qualification: 5 } }],
      ['an order without a customer', { ...over, customer_id: undefined }],
      ['an order still on its way', { ...delivery, status: 9 }],
      ['an order that is over in a state that is not reviewed (15)', { ...over, status: 15 }]
    ])('has no button for %s', (_, order) => {
      const { queryByTestId } = renderDelivery(<OrderDetailsDelivery {...baseProps} order={orderState(order)} />)
      expect(queryByTestId('float-Review customer')).toBeNull()
    })

    it('the page section review hides it, and the scroll keeps only the bottom space', () => {
      const { queryByTestId, getByTestId } = renderDelivery(
        <OrderDetailsDelivery {...baseProps} order={orderState(over)} />,
        focus({ hide: ['review'] })
      )
      expect(queryByTestId('float-Review customer')).toBeNull()
      expect(flat({ props: { style: getByTestId('order-details-scroll').props.contentContainerStyle } }).paddingBottom)
        .toBe(themeBottomSpace(theme, 0))
    })
  })

  describe('"To complete the delivery"', () => {
    const withCustomer = { ...delivery, status: 26, delivery_pin_status: 'requested' }

    it('is said when "Delivery complete" is offered and the project asks for a PIN or a photo', () => {
      ;(useConfig as jest.Mock).mockReturnValue([configs({ delivery_pin_enabled: '1', states_requiring_image_driver: '11' })])
      const { getByText } = renderDelivery(<OrderDetailsDelivery {...baseProps} order={orderState(withCustomer)} />)
      expect(getByText('To complete the delivery')).toBeTruthy()
      expect(getByText("The customer's delivery PIN · A photo of the delivery")).toBeTruthy()
    })

    it('is not said when the project asks for neither', () => {
      const { queryByText } = renderDelivery(<OrderDetailsDelivery {...baseProps} order={orderState(withCustomer)} />)
      expect(queryByText('To complete the delivery')).toBeNull()
    })

    it('is not said when the bar does not offer "Delivery complete" (the actions section is hidden, or a delosi project not at 26)', () => {
      ;(useConfig as jest.Mock).mockReturnValue([configs({ states_requiring_image_driver: '11' })])
      const hidden = renderDelivery(<OrderDetailsDelivery {...baseProps} order={orderState(withCustomer)} />, focus({ hide: ['actions'] }))
      expect(hidden.queryByText('To complete the delivery')).toBeNull()
      hidden.unmount()
      ;(useApi as jest.Mock).mockReturnValue([{ project: 'delosi' }])
      const stage = {
        ...delivery,
        status: 4,
        last_driver_assigned_at: '2026-11-18 09:00:00',
        reporting_data: { at: { 'status:26': '2026-11-18 10:00:00' } }
      }
      const delosi = renderDelivery(<OrderDetailsDelivery {...baseProps} order={orderState(stage)} />)
      expect(delosi.queryByText('To complete the delivery')).toBeNull()
    })

    it('is not said away from the customer', () => {
      ;(useConfig as jest.Mock).mockReturnValue([configs({ states_requiring_image_driver: '11' })])
      const { queryByText } = renderDelivery(<OrderDetailsDelivery {...baseProps} order={orderState({ ...delivery, status: 9 })} />)
      expect(queryByText('To complete the delivery')).toBeNull()
    })
  })

  describe('the action views: a sheet or a modal', () => {
    const lastProps = () => mockAcceptOrReject.mock.calls[mockAcceptOrReject.mock.calls.length - 1][0]

    it.each([
      ['accept', 0, 'float-Accept', {}],
      ['arrivedToBusiness', 8, 'float-Arrived to business', { states_requiring_image_driver: '3' }],
      ['pickupComplete', 3, 'float-Pickup complete', { states_requiring_image_driver: '9' }],
      ['deliveryComplete', 26, 'float-Delivery complete', { delivery_pin_enabled: '1' }]
    ])('%s opens the sheet, with no modal around it', (action, status, button, extra) => {
      ;(useConfig as jest.Mock).mockReturnValue([configs(extra)])
      const { getByTestId, queryByTestId } = renderDelivery(
        <OrderDetailsDelivery {...baseProps} order={orderState({ ...delivery, status, delivery_pin_status: 'requested' })} />
      )
      fireEvent.press(getByTestId(button))
      expect(getByTestId('accept-or-reject-stub')).toBeTruthy()
      expect(queryByTestId('delivery-modal')).toBeNull()
      expect(lastProps().action).toBe(action)
    })

    it.each([
      ['reject', 0, 'float-Reject'],
      ['pickupFailed', 8, 'float-Pickup failed'],
      ['notReady', 3, 'float-Order not ready'],
      ['deliveryFailed', 9, 'float-Delivery failed']
    ])('%s keeps the whole screen, in a modal', (action, status, button) => {
      const { getByTestId } = renderDelivery(
        <OrderDetailsDelivery {...baseProps} order={orderState({ ...delivery, status })} />
      )
      fireEvent.press(getByTestId(button))
      expect(within(getByTestId('delivery-modal')).getByTestId('accept-or-reject-stub')).toBeTruthy()
      expect(lastProps().action).toBe(action)
    })

    it('a forced status keeps the modal too', async () => {
      const { findByTestId } = renderDelivery(
        <OrderDetailsDelivery {...baseProps} forceUpdate={9} order={orderState({ ...delivery, status: 8 })} />
      )
      expect(within(await findByTestId('delivery-modal')).getByTestId('accept-or-reject-stub')).toBeTruthy()
    })

    it('hands the sheet exactly the props it hands the modal\'s view: one object, only the action differs', () => {
      const props = (status: number, button: string) => {
        mockAcceptOrReject.mockClear()
        const view = renderDelivery(<OrderDetailsDelivery {...baseProps} order={orderState({ ...delivery, status })} />)
        fireEvent.press(view.getByTestId(button))
        const received = lastProps()
        view.unmount()
        return received
      }
      const inSheet = props(0, 'float-Accept')
      const inModal = props(0, 'float-Reject')
      expect(Object.keys(inSheet).sort()).toEqual(Object.keys(inModal).sort())
      // The callbacks are new on every render: they are compared by being functions.
      const shape = (value: any) => Object.fromEntries(Object.entries(value).map(([key, item]) => [key, typeof item === 'function' ? 'function' : item]))
      expect(shape({ ...inSheet, action: null })).toEqual(shape({ ...inModal, action: null }))
      expect(inSheet).toEqual(expect.objectContaining({
        orderId: 101, action: 'accept', notShowCustomerPhone: true, actions: baseProps.actions, orderTitle: baseProps.orderTitle, appTitle: baseProps.appTitle
      }))
      expect(inSheet).not.toHaveProperty('sheet')
    })

    it('closes the sheet when the order\'s status changes, as the modal', async () => {
      const { getByTestId, queryByTestId, rerender } = renderDelivery(
        <OrderDetailsDelivery {...baseProps} order={orderState({ ...delivery, status: 0 })} />
      )
      fireEvent.press(getByTestId('float-Accept'))
      expect(getByTestId('accept-or-reject-stub')).toBeTruthy()
      rerender(
        <PermissionsContext.Provider value={mockPermissions}>
          <OrderDetailsDelivery {...baseProps} order={orderState({ ...delivery, status: 8 })} />
        </PermissionsContext.Provider>
      )
      await waitFor(() => expect(queryByTestId('accept-or-reject-stub')).toBeNull())
    })
  })

  describe('a group of orders', () => {
    const group = {
      ...delivery,
      id: 11,
      status: 7,
      isLogistic: true,
      order_group_id: 5,
      order_group: {
        orders: [
          { ...delivery, id: 11, status: 7, isLogistic: true },
          { ...delivery, id: 12, status: 7, isLogistic: true, business: { name: 'Store B', address: '9 B St' } }
        ]
      }
    }

    it('draws each order\'s blocks in a card titled with its number', () => {
      const { getByText, getAllByTestId } = renderDelivery(<OrderDetailsDelivery {...baseProps} order={orderState(group)} />)
      expect(getByText('Order No. 11')).toBeTruthy()
      expect(getByText('Order No. 12')).toBeTruthy()
      expect(getAllByTestId('focus-route')).toHaveLength(2)
      expect(getByText('Store B')).toBeTruthy()
    })

    it('has no other body than the group\'s cards', () => {
      const { getAllByTestId } = renderDelivery(<OrderDetailsDelivery {...baseProps} order={orderState(group)} />)
      expect(getAllByTestId('focus-order')).toHaveLength(2)
    })

    it('a lone order has its blocks without a title card', () => {
      const { queryByText, getAllByTestId } = renderDelivery(<OrderDetailsDelivery {...baseProps} order={orderState({ ...delivery, status: 0 })} />)
      expect(getAllByTestId('focus-order')).toHaveLength(1)
      expect(queryByText('Order No. 101')).toBeNull()
    })
  })

  describe('while the order loads', () => {
    it('draws the bar and the skeleton shaped like the new layout', () => {
      const { getByTestId, getAllByTestId, getByLabelText } = renderDelivery(
        <OrderDetailsDelivery {...baseProps} order={{ order: {}, loading: true, error: null }} />
      )
      expect(getByTestId('order-details-skeleton-stop')).toBeTruthy()
      expect(getAllByTestId('order-details-skeleton-card')).toHaveLength(3)
      expect(getByLabelText('Go back')).toBeTruthy()
    })
  })
})
