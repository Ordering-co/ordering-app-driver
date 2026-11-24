import '../../../../../../jest/helpers/uiModuleMocks'
import React from 'react'
import { AccessibilityInfo, Alert, StyleSheet } from 'react-native'
import { act, fireEvent, waitFor, within } from '@testing-library/react-native'
import Clipboard from '@react-native-clipboard/clipboard'

import { useConfig, useToast } from '@components'
import { useOfflineActions } from '@ui'

require('../../../../../../jest/helpers/registerD3OrdersMocks')
require('../../../../../../jest/helpers/registerD4DeliveryMocks')

jest.mock('../../../../../context/PermissionsContext', () =>
  require('../../../../../../jest/helpers/mockPermissionsContext')
)

jest.mock('@react-native-vector-icons/material-design-icons/static', () => {
  const React = require('react')
  const { Pressable, Text } = require('react-native')
  return (props: any) =>
    React.createElement(
      Pressable,
      { testID: `mci-${props.name}`, onPress: props.onPress },
      React.createElement(Text, null, props.name)
    )
})

jest.mock('@react-native-clipboard/clipboard', () => ({
  setString: jest.fn()
}))

jest.mock('@ui', () => {
  const { pickUi } = require('../../../../../../jest/helpers/uiModuleMocks')
  const React = require('react')
  const { View, Pressable, Text } = require('react-native')
  const { buildD3OrdersUiMock } = require('../../../../../../jest/helpers/d3OrdersUiMock')
  const mock = buildD3OrdersUiMock()

  // The accept view and the product accordion are the real ones.
  delete mock.AcceptOrRejectOrder
  delete mock.ProductItemAccordion
  // The bar's stand-in keeps its order of buttons and their test ids; each one is the app's real button, so the
  // press-and-hold flags the screen passes decide what a tap and a hold do, as in the real bar.
  // The accept view (the real one, `inline`) and the requirements dialog (`box`) imported these two modules
  // directly and read the real ones: the stand-ins below are the screen's own, so those two keep the real ones.
  mock.FloatingButton = (props: any) => {
    if (props.inline) {
      const { FloatingButton: Real } = jest.requireActual('../../FloatingButton')
      return React.createElement(Real, props)
    }
    return mockDeliveryBar(props)
  }
  const mockDeliveryBar = ({
    btnText,
    secondBtnText,
    stepBtnText,
    thirdBtnText,
    firstButtonClick,
    secondButtonClick,
    stepButtonClick,
    thirdButtonClick,
    firstButtonHold,
    secondButtonHold,
    stepButtonHold,
    thirdButtonHold,
    disabled,
    onDisabledPress
  }: any) => {
    const { OButton } = require('../../shared')
    const action = (text: string, onClick: any, hold: any) =>
      React.createElement(OButton, { testID: `float-${text}`, text, onClick, hold, disabled, onDisabledPress })
    return React.createElement(
      View,
      { testID: 'floating-button' },
      stepBtnText ? action(stepBtnText, stepButtonClick, stepButtonHold) : null,
      thirdBtnText ? action(thirdBtnText, thirdButtonClick, thirdButtonHold) : null,
      btnText ? action(btnText, firstButtonClick, firstButtonHold) : null,
      secondBtnText ? action(secondBtnText, secondButtonClick, secondButtonHold) : null
    )
  }
  mock.DriverMap = ({ testID = 'driver-map-stub' }: any) =>
    React.createElement(View, { testID })
  mock.OAlertOriginal = ({ open, content, notice }: any) =>
    open
      ? React.createElement(Text, { testID: 'delivery-alert', accessibilityHint: notice ? 'notice' : undefined }, content?.[0])
      : null
  mock.OModal = (props: any) => {
    if (props.box) {
      const { OModal: Real } = jest.requireActual('../../shared')
      return React.createElement(Real, props)
    }
    return props.open
      ? React.createElement(View, { testID: 'delivery-modal' }, props.children)
      : null
  }
  // What the screen reads through the barrel; the rest (its location hook, the real accept view's own
  // modules) stays real.
  return pickUi(mock, ['useOfflineActions', 'FloatingButton', 'DriverMap', 'OAlertOriginal', 'OModal', 'ReviewCustomer', 'DeviceOrientationMethods', 'AcceptOrRejectOrder'])
})

jest.mock('@components', () => {
  const { getMock } = require('../../../../../../jest/helpers/d3OrdersComponentsMock')
  return getMock()
})

// What the screen does when the app has to catch up (the provider's own suite covers when it is told).
let mockReconnect: (() => void) | undefined
jest.mock('../../../../../context/SocketReconnectContext', () => ({
  useOnReconnect: (handler: () => void) => { mockReconnect = handler }
}))

import { OrderDetailsDelivery } from '../Delivery'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { buildAppTheme, defaultAppTheme, THEME_PRODUCT_TYPE } from '../../../../../theme/engine'
import { bottomBarClearance, themeBottomSpace } from '../../../../../theme/helpers'
import { driverAppTitle, driverOrderTitle, richSampleOrder, sampleOrder } from '../../../../../../jest/helpers/d3OrdersDefaults'

const { PermissionsContext, mockPermissions } = require('../../../../../../jest/helpers/mockPermissionsContext')
const { holdPress, tapPress, holdMs } = require('../../../../../../jest/helpers/holdPress')

/** A theme built from values, as the app builds it (never a spread). */
const themeWith = (values: any) => buildAppTheme({ version: 2, product_type: THEME_PRODUCT_TYPE, values })

/** The screen's behaviour: the bar, the status steps, the views its buttons open. What it draws is `Delivery.focus.test.tsx`. */
const renderDelivery = (ui: React.ReactElement, permissions = mockPermissions, themeOverrides?: any) =>
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

const orderWithLocations = {
  ...sampleOrder,
  business: {
    name: 'Store A',
    logo: 'https://example.com/logo.png',
    location: { lat: 40.7128, lng: -74.006 }
  },
  customer: {
    name: 'Jane',
    lastname: 'Doe',
    cellphone: '5551234',
    location: { lat: 40.72, lng: -74.01 }
  },
  driver_id: 1
}

describe('OrderDetailsDelivery', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useConfig as jest.Mock).mockReturnValue([{
      configs: {
        reject_orders_enabled: { value: '1' },
        allow_driver_reject_order: { value: '1' },
        order_not_ready_enabled: { value: '1' },
        failed_pickup_by_driver_enabled: { value: '1' },
        hidden_driver_eta_time: { value: '0' }
      }
    }])
  })

  it('draws the bar with its back arrow, and the page-shaped skeleton, while the order loads (decision H8)', () => {
    const goBack = jest.fn()
    const { getByTestId, getByLabelText, getAllByTestId } = renderDelivery(
      <OrderDetailsDelivery
        {...baseProps}
        navigation={{ navigate: jest.fn(), popTo: jest.fn(), goBack, canGoBack: () => true }}
        order={{ order: {}, loading: false, error: null }}
      />
    )
    expect(getByTestId('order-details-skeleton')).toBeTruthy()
    // The stop's card and the three folded rows.
    expect(getByTestId('order-details-skeleton-stop')).toBeTruthy()
    expect(getAllByTestId('order-details-skeleton-card')).toHaveLength(3)
    fireEvent.press(getByLabelText('Go back'))
    expect(goBack).toHaveBeenCalled()
  })

  describe('the bar says "Order" and, under it, the order\'s number (2026-11-17)', () => {
    const { useApi } = require('@components')
    const flatStyle = (node: any) => StyleSheet.flatten(node.props.style)
    afterEach(() => {
      ;(useApi as jest.Mock).mockReturnValue([{ ordering: { root: 'https://api.test', project: 'demo' } }, {}])
    })

    it('writes "Order" in the bar\'s title look and "No. N" on the line under it, and no number in the body', () => {
      const { getAllByText, getByText } = renderDelivery(
        <OrderDetailsDelivery {...baseProps} order={{ order: sampleOrder, loading: false, error: null }} orderId={101} />
      )
      // The number once: in the bar (the body does not write it).
      expect(getAllByText(/^No\. 101$/)).toHaveLength(1)
      const title = getByText('Order')
      const header = defaultAppTheme().native.components.header.base
      expect(flatStyle(title).fontSize).toBe(header.title.fontSize)
      expect(flatStyle(title).color).toBe(header.color)
      // The number is the bar's second line: smaller than the title, one line.
      const number = getByText('No. 101')
      expect(flatStyle(number).fontSize).toBeLessThan(header.title.fontSize)
      expect(number.props.numberOfLines).toBe(1)
    })

    it('masks it in a secure project, as the chat and the driver map do', () => {
      ;(useApi as jest.Mock).mockReturnValue([{ project: 'quickiedelivery' }])
      const { getByText, queryByText } = renderDelivery(
        <OrderDetailsDelivery {...baseProps} order={{ order: { ...sampleOrder, id: 1234567 }, loading: false, error: null }} />
      )
      expect(getByText(/^No\. 123\*\*\*\*$/)).toBeTruthy()
      expect(queryByText(/1234567/)).toBeNull()
    })

    it('is the external id when the project shows external ids', () => {
      ;(useConfig as jest.Mock).mockReturnValue([{ configs: { change_order_id: { value: '1' } } }])
      const { getByText } = renderDelivery(
        <OrderDetailsDelivery {...baseProps} order={{ order: { ...sampleOrder, external_id: 'EXT-1' }, loading: false, error: null }} />
      )
      expect(getByText(/^No\. EXT-1$/)).toBeTruthy()
    })

    it('is already there while the order loads (the number the screen was opened with), so the bar does not change when the order arrives', () => {
      const { getByText, getByTestId } = renderDelivery(
        <OrderDetailsDelivery {...baseProps} orderId={3523} order={{ order: {}, loading: true, error: null }} />
      )
      expect(getByTestId('order-details-skeleton')).toBeTruthy()
      expect(getByText('Order')).toBeTruthy()
      expect(getByText('No. 3523')).toBeTruthy()
    })

    it('is masked while loading in a secure project, and the number is absent when the project shows external ids (not known yet)', () => {
      ;(useApi as jest.Mock).mockReturnValue([{ project: 'quickiedelivery' }])
      const secure = renderDelivery(
        <OrderDetailsDelivery {...baseProps} orderId={1234567} order={{ order: {}, loading: true, error: null }} />
      )
      expect(secure.getByText(/^No\. 123\*\*\*\*$/)).toBeTruthy()
      secure.unmount()
      ;(useApi as jest.Mock).mockReturnValue([{ ordering: { root: 'https://api.test', project: 'demo' } }, {}])
      ;(useConfig as jest.Mock).mockReturnValue([{ configs: { change_order_id: { value: '1' } } }])
      const external = renderDelivery(
        <OrderDetailsDelivery {...baseProps} orderId={3523} order={{ order: {}, loading: true, error: null }} />
      )
      expect(external.queryByText(/No\./)).toBeNull()
      expect(external.getByText('Order')).toBeTruthy()
      expect(external.getByLabelText('Go back')).toBeTruthy()
    })

    it('stays in the bar when the order is not found', () => {
      const { getByText } = renderDelivery(
        <OrderDetailsDelivery
          {...baseProps}
          orderId={3523}
          navigation={{ navigate: jest.fn(), popTo: jest.fn(), goBack: jest.fn() }}
          order={{ order: {}, loading: false, error: ['ERROR_ORDER_FIND'] }}
        />
      )
      expect(getByText('No. 3523')).toBeTruthy()
      expect(getByText('Order not found')).toBeTruthy()
    })

    it('has no number when it does not know it', () => {
      const { queryByText } = renderDelivery(
        <OrderDetailsDelivery {...baseProps} order={{ order: {}, loading: true, error: null }} />
      )
      expect(queryByText(/No\./)).toBeNull()
    })
  })

  it('renders not found when order request fails', () => {
    const navigate = jest.fn()
    const popTo = jest.fn()
    const { getByText, getByLabelText } = renderDelivery(
      <OrderDetailsDelivery
        {...baseProps}
        navigation={{ navigate, popTo, goBack: jest.fn() }}
        order={{ order: {}, loading: false, error: ['Order not found'] }}
      />
    )
    expect(getByText('Order not found')).toBeTruthy()
    // The bar is drawn in the error state too: the way back is not only the button.
    expect(getByLabelText('Go back')).toBeTruthy()
    fireEvent.press(getByText('Go to my orders'))
    // The Orders tab lives in the BottomTab screen of the stack this screen is in (React Navigation 7
    // does not reach into a child navigator by the tab's name): the stack goes back to the tabs, on Orders.
    expect(popTo).toHaveBeenCalledWith('BottomTab', { screen: 'Orders' })
    expect(navigate).not.toHaveBeenCalled()
  })

  it('words the API\'s order-not-found code instead of printing it', () => {
    const { getByText, getByTestId, queryByText } = renderDelivery(
      <OrderDetailsDelivery
        {...baseProps}
        navigation={{ navigate: jest.fn(), popTo: jest.fn(), goBack: jest.fn() }}
        order={{ order: {}, loading: false, error: ['ERROR_ORDER_FIND'] }}
      />
    )
    expect(getByText('Order not found')).toBeTruthy()
    // No bundled picture: the not-found state's icon.
    expect(getByTestId('not-found-icon')).toBeTruthy()
    expect(queryByText('ERROR_ORDER_FIND')).toBeNull()
  })

  it('renders order details when order is loaded', () => {
    const { getByText } = renderDelivery(
      <OrderDetailsDelivery
        {...baseProps}
        order={{ order: sampleOrder, loading: false, error: null }}
      />
    )
    expect(getByText(/^No\. 101$/)).toBeTruthy()
    expect(getByText('Pending')).toBeTruthy()
  })

  it('renders rich order product details', () => {
    const { getAllByText } = renderDelivery(
      <OrderDetailsDelivery
        {...baseProps}
        order={{ order: richSampleOrder, loading: false, error: null }}
      />
    )
    expect(getAllByText(/Burger/).length).toBeGreaterThan(0)
    expect(getAllByText(/No onions/).length).toBeGreaterThan(0)
  })

  it('shows accept and reject actions for pending orders', () => {
    const { getByTestId } = renderDelivery(
      <OrderDetailsDelivery
        {...baseProps}
        order={{ order: { ...sampleOrder, status: 0 }, loading: false, error: null }}
      />
    )
    expect(getByTestId('float-Reject')).toBeTruthy()
    expect(getByTestId('float-Accept')).toBeTruthy()
  })

  it('shows pickup actions for pickup-in-progress orders', () => {
    const { getByTestId } = renderDelivery(
      <OrderDetailsDelivery
        {...baseProps}
        order={{ order: { ...sampleOrder, status: 8 }, loading: false, error: null }}
      />
    )
    expect(getByTestId('float-Pickup failed')).toBeTruthy()
    expect(getByTestId('float-Pickup complete')).toBeTruthy()
  })

  describe('"arrived to business" is a step of the bottom bar (decision of 2026-11-18)', () => {
    const onTheWay = { ...sampleOrder, status: 8, delivery_type: 1 }

    it('sits in the bar with the pickup\'s two on the way to the store, and changes the status to 3', async () => {
      const handleChangeOrderStatus = jest.fn().mockResolvedValue({ id: 101 })
      const { getByTestId, getAllByText } = renderDelivery(
        <OrderDetailsDelivery
          {...baseProps}
          handleChangeOrderStatus={handleChangeOrderStatus}
          order={{ order: onTheWay, loading: false, error: null }}
        />
      )
      // Once on the screen: in the bar, not also in the scroll.
      expect(getAllByText('Arrived to business')).toHaveLength(1)
      expect(getByTestId('float-Pickup complete')).toBeTruthy()
      expect(getByTestId('float-Pickup failed')).toBeTruthy()
      await holdPress(getByTestId('float-Arrived to business'))
      await waitFor(() => expect(handleChangeOrderStatus).toHaveBeenCalledWith(3, {}, {}))
    })

    it('keeps the pressed button in the bar until the finger lifts, then shows the next stage (so the touch\'s end has a button to reach)', async () => {
      let screen: any
      const orderAt = (status: number) => (
        <OrderDetailsDelivery
          {...baseProps}
          handleChangeOrderStatus={handleChangeOrderStatus}
          order={{ order: { ...onTheWay, status }, loading: false, error: null }}
        />
      )
      // The step is answered while the finger is down: the order comes back in its next status.
      const handleChangeOrderStatus = jest.fn(async () => {
        screen.rerender(<PermissionsContext.Provider value={mockPermissions}>{orderAt(3)}</PermissionsContext.Provider>)
        return { id: 101 }
      })
      screen = renderDelivery(orderAt(8))
      const arrived = screen.getByTestId('float-Arrived to business')
      jest.useFakeTimers()
      try {
        fireEvent(arrived, 'pressIn')
        await act(async () => { jest.advanceTimersByTime(holdMs()) })
        expect(handleChangeOrderStatus).toHaveBeenCalledTimes(1)
        // The order is at 3 now, and the bar still has the button under the finger.
        expect(screen.getByTestId('float-Arrived to business')).toBe(arrived)
        fireEvent(arrived, 'pressOut')
        fireEvent.press(arrived)
      } finally {
        jest.useRealTimers()
      }
      expect(screen.queryByTestId('float-Arrived to business')).toBeNull()
      expect(screen.getByTestId('float-Pickup complete')).toBeTruthy()
      // And the next hold, right away, is delivered and fires once.
      await holdPress(screen.getByTestId('float-Pickup complete'))
      await waitFor(() => expect(handleChangeOrderStatus).toHaveBeenCalledTimes(2))
      expect(handleChangeOrderStatus).toHaveBeenLastCalledWith(9, {}, {})
    })

    it('is the bar\'s only button when the project turns rejecting off', () => {
      ;(useConfig as jest.Mock).mockReturnValue([{
        configs: { reject_orders_enabled: { value: '0' }, hidden_driver_eta_time: { value: '0' } }
      }])
      const { getByTestId, queryByTestId } = renderDelivery(
        <OrderDetailsDelivery {...baseProps} order={{ order: onTheWay, loading: false, error: null }} />
      )
      expect(getByTestId('float-Arrived to business')).toBeTruthy()
      expect(queryByTestId('float-Pickup complete')).toBeNull()
      expect(StyleSheet.flatten(getByTestId('order-details-scroll').props.contentContainerStyle).paddingBottom)
        .toBe(bottomBarClearance(defaultAppTheme(), 0, 1))
    })

    it('leaves the bar once the driver is at the store', () => {
      const { getByTestId, queryByTestId } = renderDelivery(
        <OrderDetailsDelivery {...baseProps} order={{ order: { ...onTheWay, status: 3 }, loading: false, error: null }} />
      )
      expect(queryByTestId('float-Arrived to business')).toBeNull()
      expect(getByTestId('float-Pickup complete')).toBeTruthy()
    })

    it('is not offered for an order that is not a delivery', () => {
      const { getByTestId, queryByTestId } = renderDelivery(
        <OrderDetailsDelivery {...baseProps} order={{ order: { ...onTheWay, delivery_type: 2 }, loading: false, error: null }} />
      )
      expect(queryByTestId('float-Arrived to business')).toBeNull()
      expect(getByTestId('float-Pickup complete')).toBeTruthy()
    })

    it('sends to the permissions screen without the location permission', () => {
      const navigate = jest.fn()
      const handleChangeOrderStatus = jest.fn()
      const { getByTestId } = renderDelivery(
        <OrderDetailsDelivery
          {...baseProps}
          navigation={{ ...baseProps.navigation, navigate }}
          handleChangeOrderStatus={handleChangeOrderStatus}
          order={{ order: onTheWay, loading: false, error: null }}
        />,
        { ...mockPermissions, isGrantedPermissions: false }
      )
      fireEvent.press(getByTestId('float-Arrived to business'))
      expect(navigate).toHaveBeenCalledWith('RequestPermissions')
      expect(handleChangeOrderStatus).not.toHaveBeenCalled()
    })

    it('stays in the bar, disabled, while the order is changing', () => {
      const handleChangeOrderStatus = jest.fn()
      const { getByTestId } = renderDelivery(
        <OrderDetailsDelivery
          {...baseProps}
          handleChangeOrderStatus={handleChangeOrderStatus}
          order={{ order: onTheWay, loading: true, error: null }}
        />
      )
      fireEvent.press(getByTestId('float-Arrived to business'))
      expect(handleChangeOrderStatus).not.toHaveBeenCalled()
    })

    it('the scroll leaves room for the three buttons', () => {
      const { getByTestId } = renderDelivery(
        <OrderDetailsDelivery {...baseProps} order={{ order: onTheWay, loading: false, error: null }} />
      )
      expect(StyleSheet.flatten(getByTestId('order-details-scroll').props.contentContainerStyle).paddingBottom)
        .toBe(bottomBarClearance(defaultAppTheme(), 0, 3))
    })
  })

  it('shows delivery actions for in-progress delivery orders', () => {
    const { getByTestId } = renderDelivery(
      <OrderDetailsDelivery
        {...baseProps}
        order={{ order: { ...sampleOrder, status: 9 }, loading: false, error: null }}
      />
    )
    expect(getByTestId('float-Delivery failed')).toBeTruthy()
    expect(getByTestId('float-Delivery complete')).toBeTruthy()
  })

  it('navigates to permissions when location is not granted', () => {
    const navigate = jest.fn()
    const { getByTestId } = renderDelivery(
      <OrderDetailsDelivery
        {...baseProps}
        navigation={{ ...baseProps.navigation, navigate }}
        order={{ order: { ...sampleOrder, status: 0 }, loading: false, error: null }}
      />,
      { ...mockPermissions, isGrantedPermissions: false }
    )
    fireEvent.press(getByTestId('float-Accept'))
    expect(navigate).toHaveBeenCalledWith('RequestPermissions')
  })

  it('shows accept and reject for ready-to-pickup status', () => {
    const { getByTestId } = renderDelivery(
      <OrderDetailsDelivery
        {...baseProps}
        order={{ order: { ...sampleOrder, status: 7 }, loading: false, error: null }}
      />
    )
    expect(getByTestId('float-Accept')).toBeTruthy()
    expect(getByTestId('float-Reject')).toBeTruthy()
  })

  describe('a taken order the business marks ready (the driver\'s stage is read from its reporting data)', () => {
    const taken = (at: Record<string, string>) => ({
      ...sampleOrder,
      delivery_type: 1,
      status: 4,
      last_driver_assigned_at: '2026-07-27 19:41:30',
      reporting_data: { at: { 'status:7': '2026-07-27 19:41:11', 'status:8': '2026-07-27 19:41:30', ...at } }
    })
    const barTexts = (getByTestId: any) =>
      getByTestId('floating-button').children.map((child: any) => child.props.testID.replace('float-', ''))

    it('does not offer "arrived to business" again when the driver already arrived: three buttons, not four', () => {
      const { getByTestId, queryByTestId } = renderDelivery(
        <OrderDetailsDelivery {...baseProps} order={{ order: taken({ 'status:3': '2026-07-27 20:05:12' }), loading: false, error: null }} />
      )
      expect(queryByTestId('float-Arrived to business')).toBeNull()
      expect(queryByTestId('float-Accept')).toBeNull()
      expect(barTexts(getByTestId).sort()).toEqual(['Order not ready', 'Pickup complete', 'Pickup failed'])
      expect(StyleSheet.flatten(getByTestId('order-details-scroll').props.contentContainerStyle).paddingBottom)
        .toBe(bottomBarClearance(defaultAppTheme(), 0, 3))
    })

    it('still offers "arrived to business" when the driver has not arrived: it comes first, over the pickup\'s two', () => {
      const { getByTestId } = renderDelivery(
        <OrderDetailsDelivery {...baseProps} order={{ order: taken({}), loading: false, error: null }} />
      )
      expect(barTexts(getByTestId).sort()).toEqual(['Arrived to business', 'Pickup complete', 'Pickup failed'])
    })

    it('offers it while the driver is almost at the store (status 18)', () => {
      const { getByTestId } = renderDelivery(
        <OrderDetailsDelivery {...baseProps} order={{ order: taken({ 'status:18': '2026-07-27 19:50:00' }), loading: false, error: null }} />
      )
      expect(getByTestId('float-Arrived to business')).toBeTruthy()
    })

    it('does not offer it for an arrival from before the order was assigned to this driver', () => {
      const { getByTestId } = renderDelivery(
        <OrderDetailsDelivery {...baseProps} order={{ order: taken({ 'status:3': '2026-07-27 18:00:00' }), loading: false, error: null }} />
      )
      // The old arrival is not the driver\'s: the stage is the accept (8) of the current assignment.
      expect(getByTestId('float-Arrived to business')).toBeTruthy()
    })

    it('keeps the buttons of the stage the driver reached: "order not ready" at the store, the delivery\'s once picked up', () => {
      const atStore = renderDelivery(
        <OrderDetailsDelivery {...baseProps} order={{ order: taken({ 'status:3': '2026-07-27 20:05:12' }), loading: false, error: null }} />
      )
      expect(atStore.getByTestId('float-Order not ready')).toBeTruthy()
      atStore.unmount()
      const away = renderDelivery(
        <OrderDetailsDelivery {...baseProps} order={{ order: taken({ 'status:3': '2026-07-27 20:05:12', 'status:9': '2026-07-27 20:10:00' }), loading: false, error: null }} />
      )
      expect(away.queryByTestId('float-Arrived to business')).toBeNull()
      expect(away.getByTestId('float-Arrived to customer')).toBeTruthy()
    })
  })

  it('still offers pickup complete when reject actions are disabled', () => {
    ;(useConfig as jest.Mock).mockReturnValue([{
      configs: {
        reject_orders_enabled: { value: '0' },
        failed_pickup_by_driver_enabled: { value: '0' },
        hidden_driver_eta_time: { value: '0' }
      }
    }])

    const { getByTestId, getByText, queryByTestId } = renderDelivery(
      <OrderDetailsDelivery
        {...baseProps}
        order={{
          order: {
            ...sampleOrder,
            status: 4,
            last_driver_assigned_at: '2026-07-27 19:41:30',
            reporting_data: { at: { 'status:8': '2026-07-27 19:41:30' } }
          },
          loading: false,
          error: null
        }}
      />
    )
    expect(getByTestId('float-Arrived to business')).toBeTruthy()
    expect(getByTestId('float-Pickup complete')).toBeTruthy()
    expect(queryByTestId('float-Accept')).toBeNull()
  })

  it('keeps the delivery actions when a ready for pickup lands on a driver already out', () => {
    const { getByTestId, queryByTestId } = renderDelivery(
      <OrderDetailsDelivery
        {...baseProps}
        order={{
          order: {
            ...sampleOrder,
            status: 4,
            last_driver_assigned_at: '2026-07-27 19:41:30',
            reporting_data: {
              at: {
                'status:7': '2026-08-13 22:16:16',
                'status:8': '2026-07-27 19:41:30',
                'status:9': '2026-08-12 16:08:59',
                'status:26': '2026-08-12 22:30:08'
              }
            }
          },
          loading: false,
          error: null
        }}
      />
    )
    expect(getByTestId('float-Delivery complete')).toBeTruthy()
    expect(queryByTestId('float-Accept')).toBeNull()
  })

  it('still offers accept for a ready order the driver never took', () => {
    const { getByTestId } = renderDelivery(
      <OrderDetailsDelivery
        {...baseProps}
        order={{
          order: {
            ...sampleOrder,
            status: 4,
            last_driver_assigned_at: '2026-07-27 19:41:30',
            reporting_data: { at: { 'status:7': '2026-07-27 19:41:11' } }
          },
          loading: false,
          error: null
        }}
      />
    )
    expect(getByTestId('float-Accept')).toBeTruthy()
  })

  it('shows order not ready while the driver waits at the business', () => {
    const { getByText } = renderDelivery(
      <OrderDetailsDelivery
        {...baseProps}
        order={{ order: { ...sampleOrder, status: 3 }, loading: false, error: null }}
      />
    )
    expect(getByText('Order not ready')).toBeTruthy()
  })

  describe('every status step is in the bottom bar (decision of 2026-11-18)', () => {
    const { useApi } = require('@components')
    const scrollRoom = (getByTestId: any) =>
      StyleSheet.flatten(getByTestId('order-details-scroll').props.contentContainerStyle).paddingBottom
    /** The texts of the bar's buttons, top to bottom. */
    const barTexts = (getByTestId: any) =>
      getByTestId('floating-button').children.map((child: any) => child.props.testID.replace('float-', ''))

    it('"order not ready" sits between "pickup complete" and "pickup failed", and opens its screen', async () => {
      const { getByTestId, getAllByText, findAllByText } = renderDelivery(
        <OrderDetailsDelivery {...baseProps} order={{ order: { ...sampleOrder, status: 3, delivery_type: 1 }, loading: false, error: null }} />
      )
      expect(getAllByText('Order not ready')).toHaveLength(1)
      expect(barTexts(getByTestId).sort()).toEqual(['Order not ready', 'Pickup complete', 'Pickup failed'])
      expect(scrollRoom(getByTestId)).toBe(bottomBarClearance(defaultAppTheme(), 0, 3))
      fireEvent.press(getByTestId('float-Order not ready'))
      expect((await findAllByText('Order not ready')).length).toBeGreaterThan(0)
    })

    it('"order not ready" stays when the project turns rejecting off', () => {
      ;(useConfig as jest.Mock).mockReturnValue([{
        configs: { reject_orders_enabled: { value: '0' }, order_not_ready_enabled: { value: '1' }, hidden_driver_eta_time: { value: '0' } }
      }])
      const { getByTestId } = renderDelivery(
        <OrderDetailsDelivery {...baseProps} order={{ order: { ...sampleOrder, status: 3, delivery_type: 1 }, loading: false, error: null }} />
      )
      expect(getByTestId('float-Order not ready')).toBeTruthy()
      expect(getByTestId('float-Pickup complete')).toBeTruthy()
      expect(scrollRoom(getByTestId)).toBe(bottomBarClearance(defaultAppTheme(), 0, 2))
    })

    it('"order not ready" is not offered for an order that is not a delivery', () => {
      const { queryByTestId, getByTestId } = renderDelivery(
        <OrderDetailsDelivery {...baseProps} order={{ order: { ...sampleOrder, status: 3, delivery_type: 2 }, loading: false, error: null }} />
      )
      expect(queryByTestId('float-Order not ready')).toBeNull()
      expect(scrollRoom(getByTestId)).toBe(bottomBarClearance(defaultAppTheme(), 0, 2))
    })

    it('"arrived to customer" sits in the bar with the delivery\'s two on the way to the customer, and changes the status to 26', async () => {
      const handleChangeOrderStatus = jest.fn().mockResolvedValue({ id: 101 })
      const { getByTestId, getAllByText } = renderDelivery(
        <OrderDetailsDelivery
          {...baseProps}
          handleChangeOrderStatus={handleChangeOrderStatus}
          order={{ order: { ...sampleOrder, status: 9, delivery_type: 1 }, loading: false, error: null }}
        />
      )
      expect(getAllByText('Arrived to customer')).toHaveLength(1)
      expect(getByTestId('float-Delivery complete')).toBeTruthy()
      expect(getByTestId('float-Delivery failed')).toBeTruthy()
      expect(scrollRoom(getByTestId)).toBe(bottomBarClearance(defaultAppTheme(), 0, 3))
      await holdPress(getByTestId('float-Arrived to customer'))
      await waitFor(() => expect(handleChangeOrderStatus).toHaveBeenCalledWith(26, {}, {}))
    })

    it('"arrived to customer" leaves the bar once the driver is with the customer', () => {
      const { getByTestId, queryByTestId } = renderDelivery(
        <OrderDetailsDelivery {...baseProps} order={{ order: { ...sampleOrder, status: 26, delivery_type: 1 }, loading: false, error: null }} />
      )
      expect(queryByTestId('float-Arrived to customer')).toBeNull()
      expect(getByTestId('float-Delivery complete')).toBeTruthy()
      expect(scrollRoom(getByTestId)).toBe(bottomBarClearance(defaultAppTheme(), 0, 2))
    })

    it('"arrived to customer" sends to the permissions screen without the location permission', () => {
      const navigate = jest.fn()
      const handleChangeOrderStatus = jest.fn()
      const { getByTestId } = renderDelivery(
        <OrderDetailsDelivery
          {...baseProps}
          navigation={{ ...baseProps.navigation, navigate }}
          handleChangeOrderStatus={handleChangeOrderStatus}
          order={{ order: { ...sampleOrder, status: 9, delivery_type: 1 }, loading: false, error: null }}
        />,
        { ...mockPermissions, isGrantedPermissions: false }
      )
      fireEvent.press(getByTestId('float-Arrived to customer'))
      expect(navigate).toHaveBeenCalledWith('RequestPermissions')
      expect(handleChangeOrderStatus).not.toHaveBeenCalled()
    })

    it('"arrived to customer" is the bar\'s only button where the delivery\'s two are not offered', () => {
      ;(useApi as jest.Mock).mockReturnValue([{ project: 'delosi' }])
      ;(useConfig as jest.Mock).mockReturnValue([{
        configs: { reject_orders_enabled: { value: '0' }, hidden_driver_eta_time: { value: '0' } }
      }])
      try {
        const { getByTestId, queryByTestId } = renderDelivery(
          <OrderDetailsDelivery {...baseProps} order={{ order: { ...sampleOrder, status: 9, delivery_type: 1 }, loading: false, error: null }} />
        )
        expect(getByTestId('float-Arrived to customer')).toBeTruthy()
        expect(queryByTestId('float-Delivery complete')).toBeNull()
        expect(scrollRoom(getByTestId)).toBe(bottomBarClearance(defaultAppTheme(), 0, 1))
      } finally {
        ;(useApi as jest.Mock).mockReturnValue([{ ordering: { root: 'https://api.test', project: 'demo' } }, {}])
      }
    })
  })

  it('hides order not ready when the project disables it', () => {
    ;(useConfig as jest.Mock).mockReturnValue([{
      configs: {
        reject_orders_enabled: { value: '1' },
        order_not_ready_enabled: { value: '0' },
        failed_pickup_by_driver_enabled: { value: '1' },
        hidden_driver_eta_time: { value: '0' }
      }
    }])

    const { queryByText, getByTestId } = renderDelivery(
      <OrderDetailsDelivery
        {...baseProps}
        order={{ order: { ...sampleOrder, status: 3 }, loading: false, error: null }}
      />
    )
    expect(queryByText('Order not ready')).toBeNull()
    expect(getByTestId('float-Pickup complete')).toBeTruthy()
  })

  it('opens delivery failed modal from floating button', async () => {
    const { getByTestId, findAllByText } = renderDelivery(
      <OrderDetailsDelivery
        {...baseProps}
        order={{ order: { ...sampleOrder, status: 9 }, loading: false, error: null }}
      />
    )
    fireEvent.press(getByTestId('float-Delivery failed'))
    expect((await findAllByText('Delivery failed')).length).toBeGreaterThan(0)
  })

  it('copies order details for non-pending orders', () => {
    const { getByLabelText } = renderDelivery(
      <OrderDetailsDelivery
        {...baseProps}
        order={{ order: { ...sampleOrder, status: 7 }, loading: false, error: null }}
      />
    )
    fireEvent.press(getByLabelText('Copy order'))
    expect(Clipboard.setString).toHaveBeenCalled()
    // The copied text starts with the order number as every screen writes it (decision H2).
    expect((Clipboard.setString as jest.Mock).mock.calls.at(-1)[0]).toMatch(/^Order No\. 101 is /)
  })

  it('copies the bill\'s subtotal (the summary\'s), not a field the order does not carry', () => {
    const { getByLabelText } = renderDelivery(
      <OrderDetailsDelivery
        {...baseProps}
        order={{ order: { ...sampleOrder, status: 7, subtotal: undefined, summary: { subtotal: 55.5, total: 70.53 } }, loading: false, error: null }}
      />
    )
    fireEvent.press(getByLabelText('Copy order'))
    const copied: string = (Clipboard.setString as jest.Mock).mock.calls.at(-1)[0]
    expect(copied).toMatch(/Subtotal: \D*55\.5/)
    expect(copied).not.toMatch(/Subtotal: \D*0(\.0+)?\s/)
  })

  describe('the pending sync notice is the queue\'s: shown while it holds a change for the order, and only then', () => {
    const { offlineActionsState } = require('../../../../../../jest/helpers/d3OrdersUiMock')
    afterEach(() => { offlineActionsState.actions = {} })

    it('shows it while the queue holds a change for the order', () => {
      offlineActionsState.actions = { 101: [{ event: 'evt_off_change_order_status', data: { orderId: 101, body: { status: 3 } } }] }
      const { getByText } = renderDelivery(
        <OrderDetailsDelivery
          {...baseProps}
          order={{ order: { ...sampleOrder, unsync: true }, loading: false, error: null }}
        />
      )
      expect(getByText('Pending sync changes')).toBeTruthy()
    })

    it('shows it for an order whose copy does not say it is unsynced, when the queue holds a change for it', () => {
      offlineActionsState.actions = { 101: [{ event: 'evt_off_change_order_status', data: { orderId: 101, body: { status: 3 } } }] }
      const { getByText } = renderDelivery(
        <OrderDetailsDelivery {...baseProps} order={{ order: { ...sampleOrder }, loading: false, error: null }} />
      )
      expect(getByText('Pending sync changes')).toBeTruthy()
    })

    it('does not show it once the queue has sent the change, whatever the copy of the order says', () => {
      offlineActionsState.actions = {}
      const { queryByText } = renderDelivery(
        <OrderDetailsDelivery
          {...baseProps}
          order={{ order: { ...sampleOrder, unsync: true }, loading: false, error: null }}
        />
      )
      expect(queryByText('Pending sync changes')).toBeNull()
    })
  })

  it('shows driver removed warning when driver_id is null', () => {
    const { getByTestId } = renderDelivery(
      <OrderDetailsDelivery
        {...baseProps}
        order={{
          order: { ...sampleOrder, driver_id: null, driver: null },
          loading: false,
          error: null
        }}
      />
    )
    expect(getByTestId('delivery-alert')).toBeTruthy()
    expect(getByTestId('delivery-alert').props.children).toMatch(/removed from the order/i)
    // A notice: one button, not an Accept and a Cancel that both go back.
    expect(getByTestId('delivery-alert').props.accessibilityHint).toBe('notice')
  })

  it('opens accept modal when accept is pressed', async () => {
    const { getByTestId, findByText } = renderDelivery(
      <OrderDetailsDelivery
        {...baseProps}
        order={{ order: { ...sampleOrder, status: 0 }, loading: false, error: null }}
      />
    )
    fireEvent.press(getByTestId('float-Accept'))
    expect(await findByText('Delivery time')).toBeTruthy()
  })

  it('keeps accept modal open when order loading toggles', async () => {
    const { getByTestId, findByText, rerender, queryByText } = renderDelivery(
      <OrderDetailsDelivery
        {...baseProps}
        order={{ order: { ...sampleOrder, status: 0 }, loading: false, error: null }}
      />
    )
    fireEvent.press(getByTestId('float-Accept'))
    expect(await findByText('Delivery time')).toBeTruthy()
    rerender(
      <PermissionsContext.Provider value={mockPermissions}>
        <OrderDetailsDelivery
          {...baseProps}
          order={{ order: { ...sampleOrder, status: 0 }, loading: true, error: null }}
        />
      </PermissionsContext.Provider>
    )
    expect(queryByText('Delivery time')).toBeTruthy()
  })

  it('closes accept modal when order status changes', async () => {
    const { getByTestId, findByText, rerender, queryByText } = renderDelivery(
      <OrderDetailsDelivery
        {...baseProps}
        order={{ order: { ...sampleOrder, status: 0 }, loading: false, error: null }}
      />
    )
    fireEvent.press(getByTestId('float-Accept'))
    expect(await findByText('Delivery time')).toBeTruthy()
    rerender(
      <PermissionsContext.Provider value={mockPermissions}>
        <OrderDetailsDelivery
          {...baseProps}
          order={{ order: { ...sampleOrder, status: 8 }, loading: false, error: null }}
        />
      </PermissionsContext.Provider>
    )
    expect(queryByText('Delivery time')).toBeNull()
  })


  it('opens reject modal when reject is allowed', async () => {
    const { getByTestId, findByText } = renderDelivery(
      <OrderDetailsDelivery
        {...baseProps}
        order={{ order: { ...sampleOrder, status: 0 }, loading: false, error: null }}
      />
    )
    fireEvent.press(getByTestId('float-Reject'))
    expect(await findByText('Reject Order')).toBeTruthy()
  })

  it('blocks reject when driver is not allowed to reject', () => {
    ;(useConfig as jest.Mock).mockReturnValue([{
      configs: {
        reject_orders_enabled: { value: '1' },
        allow_driver_reject_order: { value: '0' },
        order_not_ready_enabled: { value: '1' },
        failed_pickup_by_driver_enabled: { value: '1' },
        hidden_driver_eta_time: { value: '0' }
      }
    }])
    const { getByTestId } = renderDelivery(
      <OrderDetailsDelivery
        {...baseProps}
        order={{ order: { ...sampleOrder, status: 0 }, loading: false, error: null }}
      />
    )
    fireEvent.press(getByTestId('float-Reject'))
    expect(getByTestId('delivery-alert').props.children).toMatch(/not allowed to reject/i)
  })

  it('opens pickup failed modal from floating button', async () => {
    const { getByTestId, findAllByText } = renderDelivery(
      <OrderDetailsDelivery
        {...baseProps}
        order={{ order: { ...sampleOrder, status: 8 }, loading: false, error: null }}
      />
    )
    fireEvent.press(getByTestId('float-Pickup failed'))
    expect((await findAllByText('Pickup failed')).length).toBeGreaterThan(0)
  })

  it('calls handleChangeOrderStatus on pickup complete', async () => {
    const handleChangeOrderStatus = jest.fn().mockResolvedValue({ id: 101 })
    const { getByTestId } = renderDelivery(
      <OrderDetailsDelivery
        {...baseProps}
        handleChangeOrderStatus={handleChangeOrderStatus}
        order={{ order: { ...sampleOrder, status: 8 }, loading: false, error: null }}
      />
    )
    await holdPress(getByTestId('float-Pickup complete'))
    await waitFor(() => expect(handleChangeOrderStatus).toHaveBeenCalledWith(9, {}, {}))
  })

  it('keeps the status in the body and sends the location as an option when the pickup location check is on', async () => {
    ;(useConfig as jest.Mock).mockReturnValue([{
      configs: {
        location_validation_enabled_status_9: { value: '1' },
        location_validation_distance_status_9: { value: '200' },
        location_validation_validity_status_9: { value: '5' }
      }
    }])
    const GeoLocation = require('react-native-geolocation-service')
    const defaultGetCurrentPosition = GeoLocation.getCurrentPosition.getMockImplementation()
    GeoLocation.getCurrentPosition.mockImplementation((success: any) =>
      success({ coords: { latitude: 40.7128, longitude: -74.006 }, timestamp: Date.now() })
    )
    try {
      const handleChangeOrderStatus = jest.fn().mockResolvedValue({ id: 101 })
      const { getByTestId } = renderDelivery(
        <OrderDetailsDelivery
          {...baseProps}
          handleChangeOrderStatus={handleChangeOrderStatus}
          order={{ order: { ...orderWithLocations, status: 3 }, loading: false, error: null }}
        />
      )
      await holdPress(getByTestId('float-Pickup complete'))
      await waitFor(() => expect(handleChangeOrderStatus).toHaveBeenCalledWith(
        9,
        {},
        { location: expect.objectContaining({ latitude: 40.7128, longitude: -74.006 }) }
      ))
    } finally {
      GeoLocation.getCurrentPosition.mockImplementation(defaultGetCurrentPosition)
    }
  })

  it('calls handleChangeOrderStatus on delivery complete', async () => {
    const handleChangeOrderStatus = jest.fn().mockResolvedValue({ id: 101 })
    const { getByTestId } = renderDelivery(
      <OrderDetailsDelivery
        {...baseProps}
        handleChangeOrderStatus={handleChangeOrderStatus}
        order={{ order: { ...sampleOrder, status: 9 }, loading: false, error: null }}
      />
    )
    await holdPress(getByTestId('float-Delivery complete'))
    await waitFor(() => expect(handleChangeOrderStatus).toHaveBeenCalled())
  })

  it('copies rich order details to clipboard', () => {
    const { getByLabelText } = renderDelivery(
      <OrderDetailsDelivery
        {...baseProps}
        order={{ order: { ...richSampleOrder, status: 7 }, loading: false, error: null }}
      />
    )
    fireEvent.press(getByLabelText('Copy order'))
    expect(Clipboard.setString).toHaveBeenCalled()
  })

  it('handles logistic order reject', async () => {
    const handleClickLogisticOrder = jest.fn()
    const { getByTestId } = renderDelivery(
      <OrderDetailsDelivery
        {...baseProps}
        handleClickLogisticOrder={handleClickLogisticOrder}
        order={{
          order: {
            ...sampleOrder,
            status: 4,
            isLogistic: true,
            logistic_order_id: 55
          },
          loading: false,
          error: null
        }}
      />
    )
    await holdPress(getByTestId('float-Reject'))
    expect(handleClickLogisticOrder).toHaveBeenCalledWith(2, 55)
  })

  it('handles logistic order accept', async () => {
    const handleClickLogisticOrder = jest.fn()
    const { getByTestId } = renderDelivery(
      <OrderDetailsDelivery
        {...baseProps}
        handleClickLogisticOrder={handleClickLogisticOrder}
        order={{
          order: {
            ...sampleOrder,
            status: 4,
            isLogistic: true,
            logistic_order_id: 55
          },
          loading: false,
          error: null
        }}
      />
    )
    tapPress(getByTestId('float-Accept'))
    expect(handleClickLogisticOrder).toHaveBeenCalledWith(1, 55)
  })

  it('accepts immediately when eta timer is hidden', async () => {
    ;(useConfig as jest.Mock).mockReturnValue([{
      configs: {
        reject_orders_enabled: { value: '1' },
        allow_driver_reject_order: { value: '1' },
        order_not_ready_enabled: { value: '1' },
        failed_pickup_by_driver_enabled: { value: '1' },
        hidden_driver_eta_time: { value: '1' }
      }
    }])
    const handleChangeOrderStatus = jest.fn().mockResolvedValue({ id: 101 })
    const { getByTestId } = renderDelivery(
      <OrderDetailsDelivery
        {...baseProps}
        handleChangeOrderStatus={handleChangeOrderStatus}
        order={{ order: { ...sampleOrder, status: 0 }, loading: false, error: null }}
      />
    )
    tapPress(getByTestId('float-Accept'))
    await waitFor(() => expect(handleChangeOrderStatus).toHaveBeenCalled())
  })

  it('navigates to order messages from header', () => {
    const navigate = jest.fn()
    const { getByLabelText } = renderDelivery(
      <OrderDetailsDelivery
        {...baseProps}
        navigation={{ ...baseProps.navigation, navigate }}
        order={{ order: { ...sampleOrder, status: 7 }, loading: false, error: null }}
      />
    )
    fireEvent.press(getByLabelText('Messages'))
    expect(navigate).toHaveBeenCalledWith(
      'OrderMessage',
      expect.objectContaining({ orderId: 101 })
    )
  })

  it('opens map modal when the map button is pressed', async () => {
    const { getByText, findByTestId } = renderDelivery(
      <OrderDetailsDelivery
        {...baseProps}
        order={{ order: orderWithLocations, loading: false, error: null }}
      />
    )
    fireEvent.press(getByText('View on the map'))
    expect(await findByTestId('driver-map-stub')).toBeTruthy()
  })

  it('hands the map only what it reads: the pin\'s own picture, no colors and no placeholder', async () => {
    const { DriverMap } = require('@ui')
    const { getByText, findByTestId, UNSAFE_getByType } = renderDelivery(
      <OrderDetailsDelivery
        {...baseProps}
        order={{ order: orderWithLocations, loading: false, error: null }}
      />
    )
    fireEvent.press(getByText('View on the map'))
    await findByTestId('driver-map-stub')
    const mapProps = UNSAFE_getByType(DriverMap).props
    // Status 0 leads to the store: its logo is the pin's picture.
    expect(mapProps.location).toEqual(expect.objectContaining({ type: 'Business', title: 'Store A', icon: 'https://example.com/logo.png' }))
    for (const prop of ['colors', 'navigation', 'orderStatus', 'readOnly', 'updateDriverPosition']) {
      expect(mapProps).not.toHaveProperty(prop)
    }
  })

  it('leaves a marker without a picture to the pin, which paints the theme\'s placeholder', async () => {
    const { DriverMap } = require('@ui')
    const { getByText, findByTestId, UNSAFE_getByType } = renderDelivery(
      <OrderDetailsDelivery
        {...baseProps}
        order={{
          order: { ...orderWithLocations, business: { ...orderWithLocations.business, logo: null } },
          loading: false,
          error: null
        }}
      />
    )
    fireEvent.press(getByText('View on the map'))
    await findByTestId('driver-map-stub')
    expect(UNSAFE_getByType(DriverMap).props.location.icon).toBeNull()
  })

  it('opens force pickup flow when forceUpdate is 9', async () => {
    const { findByTestId } = renderDelivery(
      <OrderDetailsDelivery
        {...baseProps}
        forceUpdate={9}
        order={{ order: { ...sampleOrder, status: 8 }, loading: false, error: null }}
      />
    )
    expect(await findByTestId('delivery-modal')).toBeTruthy()
  })

  it('goes back from the top bar', () => {
    const goBack = jest.fn()
    const { getAllByLabelText } = renderDelivery(
      <OrderDetailsDelivery
        {...baseProps}
        navigation={{ ...baseProps.navigation, goBack }}
        order={{ order: sampleOrder, loading: false, error: null }}
      />
    )
    // The first one is the screen's; the mocked controller also opens an action modal with its own.
    fireEvent.press(getAllByLabelText('Go back')[0])
    expect(goBack).toHaveBeenCalled()
  })

  describe('top bar actions and their visibility keys', () => {
    const order = { order: { ...sampleOrder, status: 7 }, loading: false, error: null }
    const labels: Record<string, string> = {
      'confirmation.order.copy': 'Copy order',
      'confirmation.order.messages': 'Messages'
    }

    it('has no map icon: the map is the stop card\'s button', () => {
      const { queryByLabelText } = renderDelivery(<OrderDetailsDelivery {...baseProps} order={order} />)
      expect(queryByLabelText('Map view')).toBeNull()
    })

    it('paints the two as the icon buttons of their slots', () => {
      const { getByLabelText } = renderDelivery(<OrderDetailsDelivery {...baseProps} order={order} />)
      const size = defaultAppTheme().native.components.button.sizes[defaultAppTheme().native.components.order_details.slots.copy.size]
      Object.values(labels).forEach((label) => {
        const button = getByLabelText(label)
        expect(button.props.accessibilityRole).toBe('button')
        expect(button.props.accessibilityState.disabled).toBe(false)
      })
      expect(size.height).toBeGreaterThanOrEqual(44)
    })

    it.each(Object.keys(labels))('%s hides only its button', (key) => {
      const { queryByLabelText } = renderDelivery(
        <OrderDetailsDelivery {...baseProps} order={order} />,
        mockPermissions,
        themeWith({ visibility: { [key]: false } })
      )
      Object.entries(labels).forEach(([other, label]) => {
        if (other === key) expect(queryByLabelText(label)).toBeNull()
        else expect(queryByLabelText(label)).toBeTruthy()
      })
    })

    it('keeps the copy action away from pending orders', () => {
      const { queryByLabelText } = renderDelivery(
        <OrderDetailsDelivery {...baseProps} order={{ order: { ...sampleOrder, status: 0 }, loading: false, error: null }} />
      )
      expect(queryByLabelText('Copy order')).toBeNull()
      expect(queryByLabelText('Messages')).toBeTruthy()
    })

    it('counts the unread messages of the others on the chat button', () => {
      const { getByTestId, queryByTestId, rerender } = renderDelivery(
        <OrderDetailsDelivery
          {...baseProps}
          order={order}
          messages={{ messages: [{ id: 1, author_id: 99, read: false }, { id: 2, author_id: 99, read: true }] }}
        />
      )
      // The count is the chat's unread badge (`chat_bubble.slots.unread`), as on the messages row (decision H5).
      const theme = defaultAppTheme()
      const slot = theme.native.components.chat_bubble.slots.unread
      const badge = StyleSheet.flatten(getByTestId('order-unread-messages').props.style)
      expect(badge.backgroundColor).toBe(theme.native.components.badge.variants[slot.variant].background)
      expect(badge.minHeight).toBe(theme.native.components.badge.sizes[slot.size].height)
      expect(within(getByTestId('order-unread-messages')).getByText('1')).toBeTruthy()
      rerender(
        <PermissionsContext.Provider value={mockPermissions}>
          <OrderDetailsDelivery {...baseProps} order={order} messages={{ messages: [] }} />
        </PermissionsContext.Provider>
      )
      expect(queryByTestId('order-unread-messages')).toBeNull()
    })
  })

  describe('the chat button\'s count follows the chat being read (one count with the list and the tab)', () => {
    const readHandler = () => {
      const { useEvent } = require('@components')
      const [events] = useEvent()
      return [...events.on.mock.calls].reverse().find((call: any[]) => call[0] === 'order_message_read')?.[1]
    }
    const order = { order: { ...sampleOrder, id: 4501 }, loading: false, error: null }

    it('clears when the order\'s chat is read and stays clear', () => {
      const { getByTestId, queryByTestId } = renderDelivery(
        <OrderDetailsDelivery {...baseProps} order={order} messages={{ messages: [{ id: 1, author_id: 99, read: false }, { id: 2, author_id: 99, read: false }] }} />
      )
      expect(within(getByTestId('order-unread-messages')).getByText('2')).toBeTruthy()
      act(() => { readHandler()(4501) })
      expect(queryByTestId('order-unread-messages')).toBeNull()
    })

    it('does not clear for the read of another order\'s chat', () => {
      const { getByTestId } = renderDelivery(
        <OrderDetailsDelivery {...baseProps} order={order} messages={{ messages: [{ id: 1, author_id: 99, read: false }] }} />
      )
      act(() => { readHandler()(9999) })
      expect(within(getByTestId('order-unread-messages')).getByText('1')).toBeTruthy()
    })
  })

  describe('one status change at a time', () => {
    const location = { coords: { latitude: 40.7128, longitude: -74.006 }, timestamp: Date.now() }
    const withLocationCheck = () => (useConfig as jest.Mock).mockReturnValue([{
      configs: {
        location_validation_enabled_status_9: { value: '1' },
        location_validation_distance_status_9: { value: '200' },
        location_validation_validity_status_9: { value: '5' }
      }
    }])

    it('a second hold during the location fix sends nothing: the bar is the first one\'s until it ends', async () => {
      withLocationCheck()
      const GeoLocation = require('react-native-geolocation-service')
      const defaultGetCurrentPosition = GeoLocation.getCurrentPosition.getMockImplementation()
      const answers: Array<() => void> = []
      // The fix takes seconds on the street: it answers when the test says.
      GeoLocation.getCurrentPosition.mockImplementation((success: any) => { answers.push(() => success(location)) })
      try {
        const handleChangeOrderStatus = jest.fn().mockResolvedValue({ id: 101 })
        const screen = renderDelivery(
          <OrderDetailsDelivery
            {...baseProps}
            handleChangeOrderStatus={handleChangeOrderStatus}
            order={{ order: { ...orderWithLocations, status: 3 }, loading: false, error: null }}
          />
        )
        const asked = answers.length
        await holdPress(screen.getByTestId('float-Pickup complete'))
        await waitFor(() => expect(answers.length).toBeGreaterThan(asked))
        const requests = answers.length
        // The same hold again while the first is still waiting for the fix.
        await holdPress(screen.getByTestId('float-Pickup complete'))
        expect(answers.length).toBe(requests)
        await act(async () => { answers.slice(asked).forEach((answer) => answer()) })
        await waitFor(() => expect(handleChangeOrderStatus).toHaveBeenCalledTimes(1))
        expect(handleChangeOrderStatus).toHaveBeenCalledWith(9, {}, expect.objectContaining({ location: expect.any(Object) }))
      } finally {
        GeoLocation.getCurrentPosition.mockImplementation(defaultGetCurrentPosition)
      }
    })

    it('gives the bar back when the request throws, and tells the driver the step did not happen', async () => {
      const handleChangeOrderStatus = jest.fn()
        .mockRejectedValueOnce(new Error('Server went away'))
        .mockResolvedValue({ id: 101 })
      const screen = renderDelivery(
        <OrderDetailsDelivery
          {...baseProps}
          handleChangeOrderStatus={handleChangeOrderStatus}
          order={{ order: { ...sampleOrder, status: 8 }, loading: false, error: null }}
        />
      )
      await holdPress(screen.getByTestId('float-Pickup complete'))
      await waitFor(() => expect(handleChangeOrderStatus).toHaveBeenCalledTimes(1))
      await waitFor(() => expect((useToast as jest.Mock).mock.results[0].value[1].showToast).toHaveBeenCalledWith(expect.anything(), 'Server went away'))
      // Not stuck: the next hold goes out.
      await holdPress(screen.getByTestId('float-Pickup complete'))
      await waitFor(() => expect(handleChangeOrderStatus).toHaveBeenCalledTimes(2))
    })
  })

  describe('catching up when the socket comes back', () => {
    it('loads the order and its messages again', () => {
      const getOrder = jest.fn()
      const loadMessages = jest.fn()
      renderDelivery(<OrderDetailsDelivery {...baseProps} order={{ order: sampleOrder, loading: false, error: null }} getOrder={getOrder} loadMessages={loadMessages} />)
      mockReconnect!()
      expect(getOrder).toHaveBeenCalledTimes(1)
      expect(loadMessages).toHaveBeenCalledTimes(1)
    })

    it('waits for a status change that is on the way, then loads once: the older GET must not answer after the POST', async () => {
      const getOrder = jest.fn()
      const loadMessages = jest.fn()
      let finish: (value?: any) => void = () => {}
      const handleChangeOrderStatus = jest.fn(() => new Promise((resolve) => { finish = resolve }))
      const screen = renderDelivery(
        <OrderDetailsDelivery
          {...baseProps}
          handleChangeOrderStatus={handleChangeOrderStatus}
          order={{ order: { ...sampleOrder, status: 8 }, loading: false, error: null }}
          getOrder={getOrder}
          loadMessages={loadMessages}
        />
      )
      await holdPress(screen.getByTestId('float-Pickup complete'))
      await waitFor(() => expect(handleChangeOrderStatus).toHaveBeenCalledTimes(1))
      mockReconnect!()
      mockReconnect!()
      expect(getOrder).not.toHaveBeenCalled()
      expect(loadMessages).not.toHaveBeenCalled()
      await act(async () => { finish({ id: 101 }) })
      await waitFor(() => expect(getOrder).toHaveBeenCalledTimes(1))
      expect(loadMessages).toHaveBeenCalledTimes(1)
    })

    it('waits while the controller is changing the order (a change started elsewhere), then loads', () => {
      const getOrder = jest.fn()
      const screen = renderDelivery(<OrderDetailsDelivery {...baseProps} order={{ order: sampleOrder, loading: true, error: null }} getOrder={getOrder} />)
      mockReconnect!()
      expect(getOrder).not.toHaveBeenCalled()
      screen.rerender(
        <PermissionsContext.Provider value={mockPermissions}>
          <OrderDetailsDelivery {...baseProps} order={{ order: sampleOrder, loading: false, error: null }} getOrder={getOrder} />
        </PermissionsContext.Provider>
      )
      expect(getOrder).toHaveBeenCalledTimes(1)
    })

    it('has nothing to load while the order is not there yet', () => {
      const getOrder = jest.fn()
      renderDelivery(<OrderDetailsDelivery {...baseProps} order={{ order: null, loading: true, error: null }} getOrder={getOrder} />)
      mockReconnect!()
      expect(getOrder).not.toHaveBeenCalled()
    })
  })

  describe('the orders list is told once per change of the driver\'s own that took (it does not wait for a socket)', () => {
    /** What the screen announced to the lists: the app's event, one entry per change. */
    const announced = () => {
      const { useEvent } = require('@components')
      const [events] = useEvent()
      return events.emit.mock.calls.filter((call: any[]) => call[0] === 'driver_order_changed').map((call: any[]) => call[1])
    }
    const delivery = { ...sampleOrder, delivery_type: 1 }
    const stepsOfTheBar: Array<[string, any]> = [
      ['Arrived to business', { ...delivery, status: 8 }],
      ['Pickup complete', { ...delivery, status: 3 }],
      ['Arrived to customer', { ...delivery, status: 9 }],
      ['Delivery complete', { ...delivery, status: 26 }]
    ]

    it.each(stepsOfTheBar)('%s: once, with the order, after the API answered', async (button, order) => {
      const screen = renderDelivery(
        <OrderDetailsDelivery {...baseProps} handleChangeOrderStatus={jest.fn().mockResolvedValue({ id: 101 })} order={{ order, loading: false, error: null }} />
      )
      expect(announced()).toEqual([])
      await holdPress(screen.getByTestId(`float-${button}`))
      await waitFor(() => expect(announced()).toEqual([{ orderIds: [101] }]))
    })

    it('says nothing while the request is still on its way, and says it when it answers', async () => {
      let answer: (value?: any) => void = () => {}
      const handleChangeOrderStatus = jest.fn(() => new Promise((resolve) => { answer = resolve }))
      const screen = renderDelivery(
        <OrderDetailsDelivery {...baseProps} handleChangeOrderStatus={handleChangeOrderStatus} order={{ order: { ...delivery, status: 3 }, loading: false, error: null }} />
      )
      await holdPress(screen.getByTestId('float-Pickup complete'))
      await waitFor(() => expect(handleChangeOrderStatus).toHaveBeenCalledTimes(1))
      expect(announced()).toEqual([])
      await act(async () => { answer({ id: 101 }) })
      expect(announced()).toHaveLength(1)
    })

    it('says nothing for a change that did not take (the controller answers null) or that threw', async () => {
      const handleChangeOrderStatus = jest.fn()
        .mockResolvedValueOnce(null)
        .mockRejectedValueOnce(new Error('Server went away'))
      const screen = renderDelivery(
        <OrderDetailsDelivery {...baseProps} handleChangeOrderStatus={handleChangeOrderStatus} order={{ order: { ...delivery, status: 3 }, loading: false, error: null }} />
      )
      await holdPress(screen.getByTestId('float-Pickup complete'))
      await waitFor(() => expect(handleChangeOrderStatus).toHaveBeenCalledTimes(1))
      await holdPress(screen.getByTestId('float-Pickup complete'))
      await waitFor(() => expect(handleChangeOrderStatus).toHaveBeenCalledTimes(2))
      await act(async () => {})
      expect(announced()).toEqual([])
    })

    it('says nothing for a change that was only queued offline: a load would put the old state back', async () => {
      ;(useOfflineActions as jest.Mock).mockImplementation(() => [
        { isNetConnected: false, canSaveChangesOffline: true, isCombinedTabs: false, actions: {}, orders: null },
        { applyOffAction: jest.fn(), registerOffOrder: jest.fn(), setState: jest.fn() }
      ])
      try {
        // The controller answers the order as it will be once synced (`dataToSave`: nothing is sent).
        const handleChangeOrderStatus = jest.fn().mockResolvedValue({ id: 101, status: 3, unsync: true })
        const screen = renderDelivery(
          <OrderDetailsDelivery {...baseProps} handleChangeOrderStatus={handleChangeOrderStatus} order={{ order: { ...delivery, status: 8 }, loading: false, error: null }} />
        )
        await holdPress(screen.getByTestId('float-Arrived to business'))
        await waitFor(() => expect(handleChangeOrderStatus).toHaveBeenCalledWith(3, {}, expect.objectContaining({ dataToSave: expect.any(Object) })))
        await act(async () => {})
        expect(announced()).toEqual([])
      } finally {
        ;(useOfflineActions as jest.Mock).mockImplementation(() => [
          { isNetConnected: true, canSaveChangesOffline: false, isCombinedTabs: false, actions: {}, orders: null },
          { applyOffAction: jest.fn(), registerOffOrder: jest.fn(), setState: jest.fn() }
        ])
      }
    })

    it('a change sent from the accept sheet is announced once too (the sheet\'s request is the same one)', async () => {
      ;(useConfig as jest.Mock).mockReturnValue([{ configs: { reject_orders_enabled: { value: '1' }, hidden_driver_eta_time: { value: '0' }, disable_delivery_priority: { value: '1' } } }])
      const handleChangeOrderStatus = jest.fn().mockResolvedValue({ id: 101 })
      const screen = renderDelivery(
        <OrderDetailsDelivery {...baseProps} handleChangeOrderStatus={handleChangeOrderStatus} order={{ order: { ...sampleOrder, status: 0 }, loading: false, error: null }} />
      )
      fireEvent.press(screen.getByTestId('float-Accept'))
      expect(await screen.findByTestId('order-sheet')).toBeTruthy()
      expect(announced()).toEqual([])
      await act(async () => { fireEvent.press(screen.getByTestId('order-action')) })
      await waitFor(() => expect(handleChangeOrderStatus).toHaveBeenCalledTimes(1))
      expect(announced()).toEqual([{ orderIds: [101] }])
    })

    it('a failed change of the sheet announces nothing', async () => {
      ;(useConfig as jest.Mock).mockReturnValue([{ configs: { reject_orders_enabled: { value: '1' }, hidden_driver_eta_time: { value: '0' }, disable_delivery_priority: { value: '1' } } }])
      const handleChangeOrderStatus = jest.fn().mockResolvedValue(null)
      const screen = renderDelivery(
        <OrderDetailsDelivery {...baseProps} handleChangeOrderStatus={handleChangeOrderStatus} order={{ order: { ...sampleOrder, status: 0 }, loading: false, error: null }} />
      )
      fireEvent.press(screen.getByTestId('float-Accept'))
      expect(await screen.findByTestId('order-sheet')).toBeTruthy()
      await act(async () => { fireEvent.press(screen.getByTestId('order-action')) })
      await waitFor(() => expect(handleChangeOrderStatus).toHaveBeenCalledTimes(1))
      expect(announced()).toEqual([])
    })

    describe('an assign request answered on this screen', () => {
      const request = { ...sampleOrder, status: 4, isLogistic: true, logistic_order_id: 55 }
      const render = (handleClickLogisticOrder: any) => renderDelivery(
        <OrderDetailsDelivery {...baseProps} handleClickLogisticOrder={handleClickLogisticOrder} order={{ order: request, loading: false, error: null }} />
      )

      it('accepted: the requests and the orders are told, with the orders it brought', async () => {
        const screen = render(jest.fn().mockResolvedValue({ error: false, orderIds: [101, 102] }))
        tapPress(screen.getByTestId('float-Accept'))
        await waitFor(() => expect(announced()).toEqual([{ orderIds: [101, 102], request: true, accepted: true }]))
      })

      it('rejected: only the requests are told', async () => {
        const screen = render(jest.fn().mockResolvedValue({ error: false }))
        await holdPress(screen.getByTestId('float-Reject'))
        await waitFor(() => expect(announced()).toEqual([{ orderIds: [101], request: true, accepted: false }]))
      })

      it('an answer that failed, or that never came, tells nothing', async () => {
        const failed = jest.fn().mockResolvedValue({ error: true, result: 'No' })
        const screen = render(failed)
        tapPress(screen.getByTestId('float-Accept'))
        await waitFor(() => expect(failed).toHaveBeenCalledTimes(1))
        await act(async () => {})
        expect(announced()).toEqual([])
        screen.unmount()
        const thrown = jest.fn().mockRejectedValue(new Error('down'))
        const again = render(thrown)
        tapPress(again.getByTestId('float-Accept'))
        await waitFor(() => expect(thrown).toHaveBeenCalledTimes(1))
        await act(async () => {})
        expect(announced()).toEqual([])
      })
    })
  })

  describe('the room under the bar (decision H8)', () => {
    it('adds no space of its own under the header\'s `xs`: the content starts at the scroll\'s top, the sections `lg` apart', () => {
      const { getByTestId } = renderDelivery(
        <OrderDetailsDelivery {...baseProps} order={{ order: { ...sampleOrder, status: 0 }, loading: false, error: null }} />
      )
      const content = StyleSheet.flatten(getByTestId('order-details-scroll').props.contentContainerStyle)
      expect(content.paddingTop).toBeUndefined()
      expect(content.paddingHorizontal).toBe(defaultAppTheme().native.tokens.layout.page_gutter)
      expect(content.gap).toBe(defaultAppTheme().native.tokens.space.lg)
    })
  })

  describe('the scroll leaves the bottom bar its room', () => {
    const theme = defaultAppTheme()
    const padding = (getByTestId: any) =>
      StyleSheet.flatten(getByTestId('order-details-scroll').props.contentContainerStyle).paddingBottom

    it('two buttons for accept and reject', () => {
      const { getByTestId } = renderDelivery(
        <OrderDetailsDelivery {...baseProps} order={{ order: { ...sampleOrder, status: 0 }, loading: false, error: null }} />
      )
      expect(padding(getByTestId)).toBe(bottomBarClearance(theme, 0, 2))
    })

    it('one button when the project turns rejecting off', () => {
      ;(useConfig as jest.Mock).mockReturnValue([{
        configs: { reject_orders_enabled: { value: '0' }, hidden_driver_eta_time: { value: '0' } }
      }])
      const { getByTestId } = renderDelivery(
        <OrderDetailsDelivery {...baseProps} order={{ order: { ...sampleOrder, status: 0 }, loading: false, error: null }} />
      )
      expect(padding(getByTestId)).toBe(bottomBarClearance(theme, 0, 1))
    })

    it('only the bottom space when the order has no bar', () => {
      const { getByTestId, queryByTestId } = renderDelivery(
        <OrderDetailsDelivery {...baseProps} order={{ order: { ...sampleOrder, status: 11 }, loading: false, error: null }} />
      )
      expect(queryByTestId('floating-button')).toBeNull()
      expect(padding(getByTestId)).toBe(themeBottomSpace(theme, 0))
    })
  })

  it('shows the requirements of a status as a warning over the scroll', async () => {
    ;(useConfig as jest.Mock).mockReturnValue([{
      configs: {
        location_validation_enabled_status_9: { value: '1' },
        location_validation_distance_status_9: { value: '200' },
        location_validation_validity_status_9: { value: '5' }
      }
    }])
    const GeoLocation = require('react-native-geolocation-service')
    const defaultGetCurrentPosition = GeoLocation.getCurrentPosition.getMockImplementation()
    GeoLocation.getCurrentPosition.mockImplementation((success: any) =>
      success({ coords: { latitude: 40.7128, longitude: -74.006 }, timestamp: Date.now() })
    )
    try {
      // The store is far from where the driver is.
      const { findByText, UNSAFE_getAllByProps } = renderDelivery(
        <OrderDetailsDelivery
          {...baseProps}
          order={{
            order: { ...orderWithLocations, status: 3, business: { ...orderWithLocations.business, location: { lat: 10, lng: 10 } } },
            loading: false,
            error: null
          }}
        />
      )
      expect(await findByText(/km away from the business/)).toBeTruthy()
      const notice = UNSAFE_getAllByProps({ accessibilityRole: 'alert' })[0]
      expect(StyleSheet.flatten(notice.props.style).backgroundColor)
        .toBe(defaultAppTheme().native.components.alert.variants.warning.background)
    } finally {
      GeoLocation.getCurrentPosition.mockImplementation(defaultGetCurrentPosition)
    }
  })

  it('opens the requirements dialog when a step does not meet them, and closes it', async () => {
    ;(useConfig as jest.Mock).mockReturnValue([{
      configs: {
        location_validation_enabled_status_9: { value: '1' },
        location_validation_distance_status_9: { value: '200' },
        location_validation_validity_status_9: { value: '5' }
      }
    }])
    const GeoLocation = require('react-native-geolocation-service')
    const defaultGetCurrentPosition = GeoLocation.getCurrentPosition.getMockImplementation()
    GeoLocation.getCurrentPosition.mockImplementation((success: any) =>
      success({ coords: { latitude: 40.7128, longitude: -74.006 }, timestamp: Date.now() })
    )
    try {
      const handleChangeOrderStatus = jest.fn().mockResolvedValue({ id: 101 })
      const { getByTestId, findByRole, queryByRole, findAllByText } = renderDelivery(
        <OrderDetailsDelivery
          {...baseProps}
          handleChangeOrderStatus={handleChangeOrderStatus}
          order={{
            order: { ...orderWithLocations, status: 3, business: { ...orderWithLocations.business, location: { lat: 10, lng: 10 } } },
            loading: false,
            error: null
          }}
        />
      )
      expect(queryByRole('button', { name: 'Close' })).toBeNull()
      await holdPress(getByTestId('float-Pickup complete'))
      const close = await findByRole('button', { name: 'Close' })
      // The dialog is the modal's box, with its title inside.
      const box = StyleSheet.flatten(getByTestId('requirements-dialog').props.style)
      expect(box.backgroundColor).toBe(defaultAppTheme().native.components.modal.base.background)
      expect(within(getByTestId('requirements-dialog')).getByText('Requirements Not Met')).toBeTruthy()
      // The banner over the scroll and the dialog both list the requirement.
      expect((await findAllByText(/km away from the business/)).length).toBe(2)
      expect(handleChangeOrderStatus).not.toHaveBeenCalled()
      fireEvent.press(close)
      await waitFor(() => expect(queryByRole('button', { name: 'Close' })).toBeNull())
    } finally {
      GeoLocation.getCurrentPosition.mockImplementation(defaultGetCurrentPosition)
    }
  })

  describe('the irreversible steps of the bar are held, never fired by a tap', () => {
    const configs = (extra: Record<string, any> = {}) => ({
      configs: {
        reject_orders_enabled: { value: '1' },
        allow_driver_reject_order: { value: '1' },
        order_not_ready_enabled: { value: '1' },
        failed_pickup_by_driver_enabled: { value: '1' },
        hidden_driver_eta_time: { value: '0' },
        ...extra
      }
    })
    const render = (order: any, extra: Record<string, any> = {}, props: Record<string, any> = {}, permissions = mockPermissions) => {
      ;(useConfig as jest.Mock).mockReturnValue([configs(extra)])
      const handleChangeOrderStatus = jest.fn().mockResolvedValue({ id: 101 })
      const handleClickLogisticOrder = jest.fn()
      const screen = renderDelivery(
        <OrderDetailsDelivery
          {...baseProps}
          handleChangeOrderStatus={handleChangeOrderStatus}
          handleClickLogisticOrder={handleClickLogisticOrder}
          order={{ order, loading: false, error: null }}
          {...props}
        />,
        permissions
      )
      return { screen, handleChangeOrderStatus, handleClickLogisticOrder }
    }
    const delivery = { ...sampleOrder, delivery_type: 1 }
    const hint = () => (useToast as jest.Mock).mock.results.map((result: any) => result.value[1].showToast).find((fn: any) => fn.mock.calls.length)

    // Each step that fires on its own: where it is, the order it is for, and what it sends.
    const held: Array<[string, string, any, (calls: any) => void]> = [
      ['Arrived to business', 'Arrived to business', { ...delivery, status: 8 }, ({ status }) => expect(status).toHaveBeenCalledWith(3, {}, {})],
      ['Pickup complete', 'Pickup complete', { ...delivery, status: 3 }, ({ status }) => expect(status).toHaveBeenCalledWith(9, {}, {})],
      ['Arrived to customer', 'Arrived to customer', { ...delivery, status: 9 }, ({ status }) => expect(status).toHaveBeenCalledWith(26, {}, {})],
      ['Delivery complete', 'Delivery complete', { ...delivery, status: 26 }, ({ status }) => expect(status).toHaveBeenCalledWith(11, {}, {})]
    ]

    it.each(held)('%s: a tap fires nothing and says what to do, an early release nothing, the completed hold once', async (_name, button, order, expectFired) => {
      const { screen, handleChangeOrderStatus } = render(order)
      const calls = { status: handleChangeOrderStatus }
      tapPress(screen.getByTestId(`float-${button}`))
      expect(handleChangeOrderStatus).not.toHaveBeenCalled()
      expect(hint()).toHaveBeenCalledWith('info', 'Hold to confirm', expect.any(Number))
      await holdPress(screen.getByTestId(`float-${button}`), holdMs() - 100)
      expect(handleChangeOrderStatus).not.toHaveBeenCalled()
      await holdPress(screen.getByTestId(`float-${button}`))
      await waitFor(() => expect(handleChangeOrderStatus).toHaveBeenCalledTimes(1))
      expectFired(calls)
    })

    it('accepting an offered order that needs no ETA is one tap, with no hint; with an ETA it opens the accept sheet on a tap', async () => {
      const direct = render({ ...sampleOrder, status: 0 }, { hidden_driver_eta_time: { value: '1' } })
      tapPress(direct.screen.getByTestId('float-Accept'))
      await waitFor(() => expect(direct.handleChangeOrderStatus).toHaveBeenCalledTimes(1))
      expect(direct.handleChangeOrderStatus).toHaveBeenCalledWith(8, {}, {})
      expect(hint()).toBeUndefined()
      direct.screen.unmount()

      const sheet = render({ ...sampleOrder, status: 0 })
      fireEvent.press(sheet.screen.getByTestId('float-Accept'))
      expect(await sheet.screen.findByText('Delivery time')).toBeTruthy()
      expect(sheet.handleChangeOrderStatus).not.toHaveBeenCalled()
    })

    describe('an assign request (the logistic assignment) is answered in place: accept is a tap, reject is held', () => {
      const request = { ...sampleOrder, status: 4, isLogistic: true, logistic_order_id: 55 }

      it('accept: one tap answers once, with no hint', () => {
        const { screen, handleClickLogisticOrder } = render(request)
        tapPress(screen.getByTestId('float-Accept'))
        expect(handleClickLogisticOrder).toHaveBeenCalledTimes(1)
        expect(handleClickLogisticOrder).toHaveBeenCalledWith(1, 55)
        expect(hint()).toBeUndefined()
      })

      it('reject: a tap answers nothing, the hold answers once', async () => {
        const { screen, handleClickLogisticOrder } = render(request)
        tapPress(screen.getByTestId('float-Reject'))
        expect(handleClickLogisticOrder).not.toHaveBeenCalled()
        await holdPress(screen.getByTestId('float-Reject'))
        expect(handleClickLogisticOrder).toHaveBeenCalledTimes(1)
        expect(handleClickLogisticOrder).toHaveBeenCalledWith(2, 55)
      })
    })

    describe('what already is a second step stays a tap (nothing is stacked on it)', () => {
      it.each([
        ['Pickup complete', { ...delivery, status: 3 }, { states_requiring_image_driver: { value: '9' } }],
        ['Arrived to business', { ...delivery, status: 8 }, { states_requiring_image_driver: { value: '3' } }],
        ['Delivery complete', { ...delivery, status: 26 }, { states_requiring_image_driver: { value: '11' } }],
        ['Delivery complete', { ...delivery, status: 26, delivery_pin_status: 'requested' }, { delivery_pin_enabled: { value: '1' } }]
      ])('%s opens its sheet (a photo or a code to give, its own submit) on a tap and sends nothing', async (button, order, extra) => {
        const { screen, handleChangeOrderStatus } = render(order, extra)
        fireEvent.press(screen.getByTestId(`float-${button}`))
        expect(await screen.findByTestId('order-sheet')).toBeTruthy()
        expect(handleChangeOrderStatus).not.toHaveBeenCalled()
        expect((useToast as jest.Mock).mock.results.every((result: any) => !result.value[1].showToast.mock.calls.length)).toBe(true)
      })

      it.each([
        ['Order not ready', { ...delivery, status: 3 }],
        ['Pickup failed', { ...delivery, status: 3 }],
        ['Delivery failed', { ...delivery, status: 26 }],
        ['Reject', { ...sampleOrder, status: 0 }]
      ])('%s opens its form (a reason to give, its own submit) on a tap and sends nothing', async (button, order) => {
        const { screen, handleChangeOrderStatus } = render(order)
        fireEvent.press(screen.getByTestId(`float-${button}`))
        expect(await screen.findByTestId('delivery-modal')).toBeTruthy()
        expect(handleChangeOrderStatus).not.toHaveBeenCalled()
      })

      it('without the location permission a tap goes to the permissions screen, whatever the step', () => {
        const navigate = jest.fn()
        const { screen, handleChangeOrderStatus } = render(
          { ...delivery, status: 8 }, {}, { navigation: { ...baseProps.navigation, navigate } }, { ...mockPermissions, isGrantedPermissions: false }
        )
        fireEvent.press(screen.getByTestId('float-Arrived to business'))
        expect(navigate).toHaveBeenCalledWith('RequestPermissions')
        expect(handleChangeOrderStatus).not.toHaveBeenCalled()
      })
    })

    describe('with a screen reader on (its activation cannot hold)', () => {
      beforeEach(() => {
        jest.spyOn(AccessibilityInfo, 'isScreenReaderEnabled').mockResolvedValue(true)
        jest.spyOn(Alert, 'alert').mockImplementation(jest.fn())
      })
      // The platform's mock is one function: put its answer back for the tests that follow.
      afterEach(() => {
        jest.spyOn(AccessibilityInfo, 'isScreenReaderEnabled').mockResolvedValue(false)
      })

      it('each held step asks a confirmation dialog named after the step, and sends it once when accepted', async () => {
        const { screen, handleChangeOrderStatus } = render({ ...delivery, status: 3 })
        await act(async () => {})
        fireEvent.press(screen.getByTestId('float-Pickup complete'))
        expect(handleChangeOrderStatus).not.toHaveBeenCalled()
        expect(Alert.alert).toHaveBeenCalledTimes(1)
        const [title, , buttons] = (Alert.alert as jest.Mock).mock.calls[0]
        expect(title).toBe('Pickup complete')
        expect(buttons.map((button: any) => button.text)).toEqual(['Pickup complete', 'Cancel'])
        // Cancelling sends nothing; accepting sends it once.
        buttons[1].onPress?.()
        expect(handleChangeOrderStatus).not.toHaveBeenCalled()
        buttons[0].onPress()
        await waitFor(() => expect(handleChangeOrderStatus).toHaveBeenCalledTimes(1))
        expect(handleChangeOrderStatus).toHaveBeenCalledWith(9, {}, {})
      })

      it('an assign request\'s answer asks too', async () => {
        const { screen, handleClickLogisticOrder } = render({ ...sampleOrder, status: 4, isLogistic: true, logistic_order_id: 55 })
        await act(async () => {})
        fireEvent.press(screen.getByTestId('float-Reject'))
        expect(handleClickLogisticOrder).not.toHaveBeenCalled()
        ;(Alert.alert as jest.Mock).mock.calls[0][2][0].onPress()
        expect(handleClickLogisticOrder).toHaveBeenCalledWith(2, 55)
      })
    })

    describe('offline and disabled', () => {
      afterEach(() => {
        ;(useOfflineActions as jest.Mock).mockImplementation(() => [
          { isNetConnected: true, canSaveChangesOffline: false, isCombinedTabs: false, actions: {}, orders: null },
          { applyOffAction: jest.fn(), registerOffOrder: jest.fn(), setState: jest.fn() }
        ])
      })

      it('offline with changes saved for later: the hold queues the change as it did the tap, once', async () => {
        const applyOffAction = jest.fn()
        ;(useOfflineActions as jest.Mock).mockImplementation(() => [
          { isNetConnected: false, canSaveChangesOffline: true, isCombinedTabs: false, actions: {}, orders: null },
          { applyOffAction, registerOffOrder: jest.fn(), setState: jest.fn() }
        ])
        const { screen, handleChangeOrderStatus } = render({ ...delivery, status: 8 })
        tapPress(screen.getByTestId('float-Arrived to business'))
        expect(applyOffAction).not.toHaveBeenCalled()
        await holdPress(screen.getByTestId('float-Arrived to business'))
        await waitFor(() => expect(handleChangeOrderStatus).toHaveBeenCalledTimes(1))
        expect(applyOffAction).toHaveBeenCalledTimes(1)
        expect(applyOffAction).toHaveBeenCalledWith({ event: 'evt_off_change_order_status', data: { orderId: 101, body: { status: 3 } } })
      })

      it('offline without changes saved for later: the step is off and a hold does nothing', async () => {
        ;(useOfflineActions as jest.Mock).mockImplementation(() => [
          { isNetConnected: false, canSaveChangesOffline: false, isCombinedTabs: false, actions: {}, orders: null },
          { applyOffAction: jest.fn(), registerOffOrder: jest.fn(), setState: jest.fn() }
        ])
        const { screen, handleChangeOrderStatus } = render({ ...delivery, status: 8 })
        expect(screen.getByTestId('float-Arrived to business').props.accessibilityState.disabled).toBe(true)
        await holdPress(screen.getByTestId('float-Arrived to business'))
        expect(handleChangeOrderStatus).not.toHaveBeenCalled()
      })

      describe('the steps painted off for lack of a connection still say why (the owner\'s decision of 2026-11-20)', () => {
        const NO_CONNECTION = 'No connection. Try again when the network is back.'
        const offlineWith = (canSaveChangesOffline: boolean, isNetConnected = false) => {
          ;(useOfflineActions as jest.Mock).mockImplementation(() => [
            { isNetConnected, canSaveChangesOffline, isCombinedTabs: false, actions: {}, orders: null },
            { applyOffAction: jest.fn(), registerOffOrder: jest.fn(), setState: jest.fn() }
          ])
        }
        const toasts = () => require('../../../../../../jest/helpers/mockOrdering').useToast()[1].showToast.mock.calls
        const noConnection = () => toasts().filter((call: any[]) => call[1] === NO_CONNECTION)

        it('a tap on a step shows the toast once, fires nothing, and the button stays off to the screen reader', async () => {
          offlineWith(false)
          const { screen, handleChangeOrderStatus } = render({ ...delivery, status: 8 })
          tapPress(screen.getByTestId('float-Arrived to business'))
          expect(noConnection()).toHaveLength(1)
          // The kind of the hold's hint, with its own text and the time of that hint.
          expect(noConnection()[0]).toEqual(['info', NO_CONNECTION, 2000])
          expect(handleChangeOrderStatus).not.toHaveBeenCalled()
          expect(screen.getByTestId('float-Arrived to business').props.accessibilityState.disabled).toBe(true)
        })

        it('accept and reject of an offered order answer too, and repeated taps, on one button or on both, do not stack: one toast while the first is on screen', async () => {
          offlineWith(false)
          const { screen, handleChangeOrderStatus } = render({ ...delivery, status: 4 })
          const accept = screen.getByTestId('float-Accept')
          tapPress(accept)
          expect(noConnection()).toHaveLength(1)
          tapPress(accept)
          tapPress(screen.getByTestId('float-Reject'))
          tapPress(accept)
          expect(noConnection()).toHaveLength(1)
          expect(handleChangeOrderStatus).not.toHaveBeenCalled()
          expect(screen.queryByTestId('order-sheet')).toBeNull()
        })

        it('a hold on a held step offline shows this hint, not "Hold to confirm", and fires nothing', async () => {
          offlineWith(false)
          const { screen, handleChangeOrderStatus } = render({ ...delivery, status: 8 })
          await holdPress(screen.getByTestId('float-Arrived to business'))
          expect(toasts().some((call: any[]) => call[1] === 'Hold to confirm')).toBe(false)
          expect(noConnection()).toHaveLength(1)
          expect(handleChangeOrderStatus).not.toHaveBeenCalled()
        })

        it('with the changes saved for later nothing says anything: the step is not off and queues', async () => {
          offlineWith(true)
          const { screen } = render({ ...delivery, status: 8 })
          expect(screen.getByTestId('float-Arrived to business').props.accessibilityState.disabled).toBeFalsy()
          tapPress(screen.getByTestId('float-Arrived to business'))
          // A tap on a held step says what a held step says: "Hold to confirm", never the connection.
          expect(noConnection()).toHaveLength(0)
        })

        it('with a connection nothing says it either', async () => {
          offlineWith(false, true)
          const { screen } = render({ ...delivery, status: 8 })
          tapPress(screen.getByTestId('float-Arrived to business'))
          expect(noConnection()).toHaveLength(0)
          expect(toasts().some((call: any[]) => call[1] === 'Hold to confirm')).toBe(true)
        })

        it('a button that is off because the order is changing says nothing about the connection', async () => {
          offlineWith(false, true)
          const screen = renderDelivery(
            <OrderDetailsDelivery {...baseProps} handleChangeOrderStatus={jest.fn()} order={{ order: { ...delivery, status: 8 }, loading: true, error: null }} />
          )
          tapPress(screen.getByTestId('float-Arrived to business'))
          expect(noConnection()).toHaveLength(0)
        })
      })

      it('while the order is changing the step is off and a hold does nothing', async () => {
        const handleChangeOrderStatus = jest.fn()
        const screen = renderDelivery(
          <OrderDetailsDelivery
            {...baseProps}
            handleChangeOrderStatus={handleChangeOrderStatus}
            order={{ order: { ...delivery, status: 8 }, loading: true, error: null }}
          />
        )
        await holdPress(screen.getByTestId('float-Arrived to business'))
        expect(handleChangeOrderStatus).not.toHaveBeenCalled()
      })
    })
  })
})
