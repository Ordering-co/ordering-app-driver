import '../../../../../../jest/helpers/uiModuleMocks'
import React from 'react'
import { Alert } from 'react-native'
import { act, fireEvent, waitFor, within } from '@testing-library/react-native'

import { useConfig } from '@components'
import { offlineActionsState } from '../../../../../../jest/helpers/d3OrdersUiMock'

jest.mock('@ui', () => {
  const { pickUi } = require('../../../../../../jest/helpers/uiModuleMocks')
  const { buildD3OrdersIntegrationUiMock } = require('../../../../../../jest/helpers/d3OrdersUiMock')
  return pickUi(buildD3OrdersIntegrationUiMock(), ['useOfflineActions', 'ReviewCustomer'])
})

jest.mock('@components', () => {
  const { getMock } = require('../../../../../../jest/helpers/d3OrdersComponentsMock')
  return getMock()
})

import { PreviousOrders as PreviousOrdersList } from '..'
import { useAcceptSheet } from '../../../hooks/useAcceptSheet'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { driverOrderTitle, makeGroupedOrders, sampleOrder } from '../../../../../../jest/helpers/d3OrdersDefaults'
import { defaultAppTheme } from '../../../../../theme/engine'
import { StyleSheet } from 'react-native'
import { DRIVER_ACTIONS, DRIVER_ORDER_TITLES } from '../../AcceptOrRejectOrder/driverActions'
const { holdPress, tapPress, holdMs } = require('../../../../../../jest/helpers/holdPress')

const flat = (node: any) => StyleSheet.flatten(node.props.style)

/**
 * The list as the orders screen draws it: the screen hosts the accept sheet (`useAcceptSheet`, as `OrdersOption` does) and the list
 * asks for it, so a sheet is over the list and no route is opened. `OrdersOption.test` covers the screen's own wiring.
 */
const PreviousOrders = (props: any) => {
  const { openSheet, sheet } = useAcceptSheet({
    actions: props.actions,
    orderTitle: props.orderTitle,
    appTitle: props.appTitle,
    isLoadingOrder: props.loadingChangeOrder
  })
  return (
    <>
      <PreviousOrdersList openAcceptSheet={openSheet} {...props} />
      {sheet}
    </>
  )
}

// What the orders page gives the list for the accept / reject view it presents over itself.
const orderTitle = {
  ...driverOrderTitle,
  deliveryComplete: { key: 'DELIVERY_COMPLETE', text: 'Delivery complete', btnKey: 'DELIVERY_COMPLETE', btnText: 'Delivery complete' }
}

const baseProps = {
  orderTitle,
  actions: { accept: 'acceptByDriver', reject: 'rejectByDriver' },
  getOrderStatus: () => 'Pending',
  appTitle: { text: 'Delivery app' },
  handleChangeOrderStatus: jest.fn(),
  onNavigationRedirect: jest.fn(),
  handleClickOrder: jest.fn()
}

const orderWithoutLogo = {
  ...sampleOrder,
  business: { ...sampleOrder.business, logo: null }
}

// A group is a card that opens its orders: found by its label ("Group No.<id>").
const expandOrderGroup = ({ getAllByLabelText }: { getAllByLabelText: (label: RegExp) => unknown[] }) => {
  fireEvent.press(getAllByLabelText(/^Group No\./)[0] as never)
}

/**
 * The question a group's status change asks before it hits every order of the group: its title and message,
 * and its two buttons (accept first). Nothing is sent until the accept button is pressed.
 */
const groupQuestion = () => {
  const [title, message, buttons] = (Alert.alert as jest.Mock).mock.calls.at(-1)
  return { title, message, accept: buttons[0], cancel: buttons[1] }
}

describe('PreviousOrders', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(Alert, 'alert').mockImplementation(jest.fn())
    offlineActionsState.isNetConnected = true
    offlineActionsState.canSaveChangesOffline = false
    ;(useConfig as jest.Mock).mockReturnValue([{ configs: {} }])
  })

  it('renders nothing when orders list is empty', () => {
    const { queryByText } = renderWithProviders(
      <PreviousOrders orders={[]} />
    )
    expect(queryByText('Store A')).toBeNull()
  })

  it('navigates to order details when order is pressed', () => {
    const onNavigationRedirect = jest.fn()
    const handleClickOrder = jest.fn()
    const { getByText } = renderWithProviders(
      <PreviousOrders
        {...baseProps}
        orders={[orderWithoutLogo]}
        onNavigationRedirect={onNavigationRedirect}
        handleClickOrder={handleClickOrder}
      />
    )
    fireEvent.press(getByText('Store A'))
    expect(handleClickOrder).toHaveBeenCalled()
    expect(onNavigationRedirect).toHaveBeenCalledWith(
      'OrderDetails',
      expect.objectContaining({ order: expect.objectContaining({ id: 101 }) })
    )
  })

  it('renders delivery type and status labels', () => {
    const { getByText } = renderWithProviders(
      <PreviousOrders {...baseProps} orders={[orderWithoutLogo]} />
    )
    expect(getByText('Delivery')).toBeTruthy()
    expect(getByText('Pending')).toBeTruthy()
  })

  it('renders pickup label for pickup orders', () => {
    const { getByText } = renderWithProviders(
      <PreviousOrders
        {...baseProps}
        orders={[{ ...orderWithoutLogo, delivery_type: 2 }]}
      />
    )
    expect(getByText('Pickup')).toBeTruthy()
  })

  it('renders external order id when config enabled', () => {
    ;(useConfig as jest.Mock).mockReturnValue([{
      configs: { change_order_id: { value: '1' } }
    }])
    const { getByText } = renderWithProviders(
      <PreviousOrders
        {...baseProps}
        orders={[{ ...orderWithoutLogo, external_id: 'EXT-101' }]}
      />
    )
    expect(getByText(/EXT-101/)).toBeTruthy()
  })

  it('shows accept and reject all for grouped pending orders: Reject all is a page, Accept all a sheet over the list', () => {
    const onNavigationRedirect = jest.fn()
    const screen = renderWithProviders(
      <PreviousOrders
        {...baseProps}
        orders={makeGroupedOrders([{ ...orderWithoutLogo, status: 0 }])}
        onNavigationRedirect={onNavigationRedirect}
      />
    )
    expandOrderGroup(screen)
    // The accept sheet is presented by the list itself: no route (it would be drawn over an empty page).
    fireEvent.press(screen.getByText('Accept all'))
    expect(onNavigationRedirect).not.toHaveBeenCalled()
    expect(screen.getByTestId('order-sheet')).toBeTruthy()
    fireEvent.press(screen.getByLabelText('Close'))
    expect(screen.queryByTestId('order-sheet')).toBeNull()
    fireEvent.press(screen.getByText('Reject all'))
    expect(onNavigationRedirect).toHaveBeenCalledWith(
      'AcceptOrRejectOrder',
      expect.objectContaining({ action: 'reject' })
    )
  })

  it('marks ready for pickup on in-progress grouped orders', () => {
    const handleChangeOrderStatus = jest.fn()
    const screen = renderWithProviders(
      <PreviousOrders
        {...baseProps}
        orders={makeGroupedOrders([{ ...orderWithoutLogo, status: 7 }])}
        handleChangeOrderStatus={handleChangeOrderStatus}
        getOrderStatus={() => 'In Progress'}
      />
    )
    expandOrderGroup(screen)
    fireEvent.press(screen.getByText('Ready for pickup'))
    expect(handleChangeOrderStatus).not.toHaveBeenCalled()
    groupQuestion().accept.onPress()
    expect(handleChangeOrderStatus).toHaveBeenCalledWith(4, [101])
  })

  it('ignores a second Ready for pickup tap while the bulk update is pending', () => {
    const handleChangeOrderStatus = jest.fn()
    const screen = renderWithProviders(
      <PreviousOrders
        {...baseProps}
        orders={makeGroupedOrders([{ ...orderWithoutLogo, status: 7 }])}
        handleChangeOrderStatus={handleChangeOrderStatus}
        getOrderStatus={() => 'In Progress'}
      />
    )
    expandOrderGroup(screen)
    fireEvent.press(screen.getByText('Ready for pickup'))
    groupQuestion().accept.onPress()
    fireEvent.press(screen.getByText('Ready for pickup'))
    groupQuestion().accept.onPress()
    expect(handleChangeOrderStatus).toHaveBeenCalledTimes(1)
  })

  it('does not change status while loadingChangeOrder is true', () => {
    const handleChangeOrderStatus = jest.fn()
    const screen = renderWithProviders(
      <PreviousOrders
        {...baseProps}
        orders={makeGroupedOrders([{ ...orderWithoutLogo, status: 7 }])}
        handleChangeOrderStatus={handleChangeOrderStatus}
        getOrderStatus={() => 'In Progress'}
        loadingChangeOrder
      />
    )
    expandOrderGroup(screen)
    fireEvent.press(screen.getByText('Ready for pickup'))
    expect(handleChangeOrderStatus).not.toHaveBeenCalled()
  })

  it('does not open Accept all while loadingChangeOrder is true', () => {
    const onNavigationRedirect = jest.fn()
    const screen = renderWithProviders(
      <PreviousOrders
        {...baseProps}
        orders={makeGroupedOrders([{ ...orderWithoutLogo, status: 0 }])}
        onNavigationRedirect={onNavigationRedirect}
        loadingChangeOrder
      />
    )
    expandOrderGroup(screen)
    fireEvent.press(screen.getByText('Accept all'))
    expect(onNavigationRedirect).not.toHaveBeenCalled()
  })


  it('shows order not ready action when enabled', () => {
    ;(useConfig as jest.Mock).mockReturnValue([{
      configs: { order_not_ready_enabled: { value: '1' } }
    }])
    const onNavigationRedirect = jest.fn()
    const screen = renderWithProviders(
      <PreviousOrders
        {...baseProps}
        orders={makeGroupedOrders([{ ...orderWithoutLogo, status: 3, delivery_type: 1 }])}
        onNavigationRedirect={onNavigationRedirect}
        getOrderStatus={() => 'In Progress'}
      />
    )
    expandOrderGroup(screen)
    fireEvent.press(screen.getByText('Order not ready'))
    expect(onNavigationRedirect).toHaveBeenCalledWith(
      'AcceptOrRejectOrder',
      expect.objectContaining({ action: 'notReady' })
    )
  })

  it('hides the review button of a group with orders.review_order_button', () => {
    const { buildAppTheme, THEME_PRODUCT_TYPE } = require('../../../../../theme/engine')
    const screen = renderWithProviders(
      <PreviousOrders
        {...baseProps}
        orders={makeGroupedOrders([{ ...orderWithoutLogo, status: 1, customer_id: 5 }])}
        getOrderStatus={() => 'Completed'}
        handleSendCustomerReview={jest.fn()}
      />,
      { themeOverrides: buildAppTheme({ version: 2, product_type: THEME_PRODUCT_TYPE, values: { visibility: { 'orders.review_order_button': false } } }) }
    )
    expandOrderGroup(screen)
    expect(screen.queryByText('Review customer')).toBeNull()
  })

  it('shows review customer for completed grouped orders', () => {
    const screen = renderWithProviders(
      <PreviousOrders
        {...baseProps}
        orders={makeGroupedOrders([{ ...orderWithoutLogo, status: 1, customer_id: 5 }])}
        getOrderStatus={() => 'Completed'}
        handleSendCustomerReview={jest.fn()}
      />
    )
    expandOrderGroup(screen)
    fireEvent.press(screen.getByText('Review customer'))
    expect(screen.getByText('Review customer')).toBeTruthy()
  })

  it('renders enterprise timer styling when plan is enabled', () => {
    ;(useConfig as jest.Mock).mockReturnValue([{
      configs: { plan_enterprise: { value: '1' } }
    }])
    const { getByText } = renderWithProviders(
      <PreviousOrders
        {...baseProps}
        currentTabSelected="pending"
        orders={[{
          ...orderWithoutLogo,
          time_status: 'at_risk',
          delivery_datetime_utc: '2099-01-01 12:00:00'
        }]}
      />
    )
    expect(getByText('Store A')).toBeTruthy()
  })

  it('shows pickup actions for delivery app in-progress orders', () => {
    ;(useConfig as jest.Mock).mockReturnValue([{
      configs: {
        failed_pickup_by_driver_enabled: { value: '1' },
        order_not_ready_enabled: { value: '1' },
        reject_orders_enabled: { value: '1' }
      }
    }])
    const screen = renderWithProviders(
      <PreviousOrders
        {...baseProps}
        orders={makeGroupedOrders([{ ...orderWithoutLogo, status: 8 }])}
        getOrderStatus={() => 'In Progress'}
      />
    )
    expandOrderGroup(screen)
    expect(screen.getByText('Pickup complete')).toBeTruthy()
    expect(screen.getByText('Pickup failed')).toBeTruthy()
  })

  it('shows delivery complete actions for delivery app', () => {
    const handleChangeOrderStatus = jest.fn()
    const screen = renderWithProviders(
      <PreviousOrders
        {...baseProps}
        orders={makeGroupedOrders([{ ...orderWithoutLogo, status: 9 }])}
        handleChangeOrderStatus={handleChangeOrderStatus}
        getOrderStatus={() => 'In Progress'}
      />
    )
    expandOrderGroup(screen)
    fireEvent.press(screen.getByText('Delivery complete'))
    expect(handleChangeOrderStatus).not.toHaveBeenCalled()
    groupQuestion().accept.onPress()
    expect(handleChangeOrderStatus).toHaveBeenCalledWith(11, [101])
  })

  it('navigates to logistic order details when logistic order is pressed', () => {
    const onNavigationRedirect = jest.fn()
    const logisticOrder = {
      ...orderWithoutLogo,
      isLogistic: true,
      order: { ...orderWithoutLogo, id: 202 },
      locked: false
    }
    const { getByText } = renderWithProviders(
      <PreviousOrders
        {...baseProps}
        orders={[logisticOrder]}
        isLogisticOrder
        onNavigationRedirect={onNavigationRedirect}
      />
    )
    fireEvent.press(getByText('Store A'))
    expect(onNavigationRedirect).toHaveBeenCalledWith(
      'OrderDetailsLogistic',
      expect.objectContaining({ order: expect.objectContaining({ id: 202 }) })
    )
  })

  describe('asks for the delivery time after accepting a logistic order from the list: a sheet over the list, not a route', () => {
    const request = { ...orderWithoutLogo, id: 909, isLogistic: true, order: { ...orderWithoutLogo, id: 202 }, locked: false }
    const accepted = { error: false, order: { id: 202 }, orderIds: [202], defaultEta: null }
    const renderRequest = (etaAnswer: any) => {
      ;(useConfig as jest.Mock).mockReturnValue([{ configs: { disable_delivery_priority: { value: '1' } } }])
      const onNavigationRedirect = jest.fn()
      const handleClickLogisticOrder = jest.fn().mockResolvedValue(accepted)
      const handleUpdateLogisticOrdersEta = jest.fn().mockResolvedValue(etaAnswer)
      const screen = renderWithProviders(
        <PreviousOrders
          {...baseProps}
          orders={[request]}
          isLogisticOrder
          onNavigationRedirect={onNavigationRedirect}
          handleClickLogisticOrder={handleClickLogisticOrder}
          handleUpdateLogisticOrdersEta={handleUpdateLogisticOrdersEta}
        />
      )
      return { screen, onNavigationRedirect, handleClickLogisticOrder, handleUpdateLogisticOrdersEta }
    }

    it('opens the sheet over the list, with no navigation, and sends the time of the accepted orders once', async () => {
      const { screen, onNavigationRedirect, handleClickLogisticOrder, handleUpdateLogisticOrdersEta } = renderRequest([{ id: 202 }])
      tapPress(screen.getByText('Accept'))
      expect(handleClickLogisticOrder).toHaveBeenCalledWith(1, 909, undefined)
      await waitFor(() => expect(screen.getByTestId('order-sheet')).toBeTruthy())
      expect(onNavigationRedirect).not.toHaveBeenCalled()
      // The list is still behind the sheet.
      expect(screen.getByText('Store A')).toBeTruthy()
      expect(handleUpdateLogisticOrdersEta).not.toHaveBeenCalled()
      fireEvent.press(screen.getByTestId('order-action'))
      await waitFor(() => expect(screen.queryByTestId('order-sheet')).toBeNull(), { timeout: 5000 })
      expect(handleUpdateLogisticOrdersEta).toHaveBeenCalledTimes(1)
      expect(handleUpdateLogisticOrdersEta).toHaveBeenCalledWith([202], expect.any(Number))
      expect(onNavigationRedirect).not.toHaveBeenCalled()
    })

    it('keeps the sheet when the time was not saved', async () => {
      // An answer with fewer saves than orders is a failure (what the group's sheet does too).
      const { screen, handleUpdateLogisticOrdersEta } = renderRequest([])
      tapPress(screen.getByText('Accept'))
      await waitFor(() => expect(screen.getByTestId('order-sheet')).toBeTruthy())
      fireEvent.press(screen.getByTestId('order-action'))
      await waitFor(() => expect(handleUpdateLogisticOrdersEta).toHaveBeenCalledTimes(1), { timeout: 5000 })
      expect(screen.getByTestId('order-sheet')).toBeTruthy()
    })

    it('closes with the Close button and sends nothing: the request is already accepted', async () => {
      const { screen, handleUpdateLogisticOrdersEta } = renderRequest([{ id: 202 }])
      tapPress(screen.getByText('Accept'))
      await waitFor(() => expect(screen.getByTestId('order-sheet')).toBeTruthy())
      fireEvent.press(screen.getByLabelText('Close'))
      expect(screen.queryByTestId('order-sheet')).toBeNull()
      expect(handleUpdateLogisticOrdersEta).not.toHaveBeenCalled()
    })
  })

  it('keeps the single tap accept on projects with a default logistic eta', async () => {
    const onNavigationRedirect = jest.fn()
    const handleClickLogisticOrder = jest.fn().mockResolvedValue({
      error: false,
      order: { id: 202 },
      orderIds: [202],
      defaultEta: 10
    })
    const logisticOrder = {
      ...orderWithoutLogo,
      id: 909,
      isLogistic: true,
      order: { ...orderWithoutLogo, id: 202 },
      locked: false
    }
    const screen = renderWithProviders(
      <PreviousOrders
        {...baseProps}
        orders={[logisticOrder]}
        isLogisticOrder
        onNavigationRedirect={onNavigationRedirect}
        handleClickLogisticOrder={handleClickLogisticOrder}
        handleUpdateLogisticOrdersEta={jest.fn()}
      />
    )
    tapPress(screen.getByText('Accept'))
    await waitFor(() => expect(handleClickLogisticOrder).toHaveBeenCalled())
    // Nothing is asked: no route and no sheet.
    expect(onNavigationRedirect).not.toHaveBeenCalled()
    expect(screen.queryByTestId('order-sheet')).toBeNull()
  })

  it('does not ask for the delivery time when hidden_driver_eta_time is on', async () => {
    ;(useConfig as jest.Mock).mockReturnValue([{
      configs: { hidden_driver_eta_time: { value: '1' } }
    }])
    const onNavigationRedirect = jest.fn()
    const handleClickLogisticOrder = jest.fn().mockResolvedValue({
      error: false,
      order: { id: 202 },
      orderIds: [202],
      defaultEta: null
    })
    const logisticOrder = {
      ...orderWithoutLogo,
      id: 909,
      isLogistic: true,
      order: { ...orderWithoutLogo, id: 202 },
      locked: false
    }
    const screen = renderWithProviders(
      <PreviousOrders
        {...baseProps}
        orders={[logisticOrder]}
        isLogisticOrder
        onNavigationRedirect={onNavigationRedirect}
        handleClickLogisticOrder={handleClickLogisticOrder}
        handleUpdateLogisticOrdersEta={jest.fn()}
      />
    )
    tapPress(screen.getByText('Accept'))
    await waitFor(() => expect(handleClickLogisticOrder).toHaveBeenCalled())
    // Nothing is asked: no route and no sheet.
    expect(onNavigationRedirect).not.toHaveBeenCalled()
    expect(screen.queryByTestId('order-sheet')).toBeNull()
  })

  it('does not ask for the delivery time when rejecting a logistic order', async () => {
    const onNavigationRedirect = jest.fn()
    const handleClickLogisticOrder = jest.fn().mockResolvedValue({ error: false })
    const logisticOrder = {
      ...orderWithoutLogo,
      id: 909,
      isLogistic: true,
      order: { ...orderWithoutLogo, id: 202 },
      locked: false
    }
    const screen = renderWithProviders(
      <PreviousOrders
        {...baseProps}
        orders={[logisticOrder]}
        isLogisticOrder
        onNavigationRedirect={onNavigationRedirect}
        handleClickLogisticOrder={handleClickLogisticOrder}
        handleUpdateLogisticOrdersEta={jest.fn()}
      />
    )
    await holdPress(screen.getByText('Reject'))
    expect(handleClickLogisticOrder).toHaveBeenCalledWith(2, 909, undefined)
    await waitFor(() => expect(handleClickLogisticOrder).toHaveBeenCalled())
    // Nothing is asked: no route and no sheet.
    expect(onNavigationRedirect).not.toHaveBeenCalled()
    expect(screen.queryByTestId('order-sheet')).toBeNull()
  })

  it('skips press when logistic order is locked', () => {
    const handleClickOrder = jest.fn()
    const onNavigationRedirect = jest.fn()
    const logisticOrder = {
      ...orderWithoutLogo,
      isLogistic: true,
      locked: true,
      order: { ...orderWithoutLogo, id: 202, locked: true }
    }
    const { getByText } = renderWithProviders(
      <PreviousOrders
        {...baseProps}
        orders={[logisticOrder]}
        isLogisticOrder
        handleClickOrder={handleClickOrder}
        onNavigationRedirect={onNavigationRedirect}
      />
    )
    fireEvent.press(getByText('Store A'))
    expect(handleClickOrder).not.toHaveBeenCalled()
    expect(onNavigationRedirect).not.toHaveBeenCalled()
  })

  it('shows arrived to business action for status 8', () => {
    const handleChangeOrderStatus = jest.fn()
    const screen = renderWithProviders(
      <PreviousOrders
        {...baseProps}
        orders={makeGroupedOrders([{ ...orderWithoutLogo, status: 8, delivery_type: 1 }])}
        handleChangeOrderStatus={handleChangeOrderStatus}
        getOrderStatus={() => 'In Progress'}
      />
    )
    expandOrderGroup(screen)
    fireEvent.press(screen.getByText('Arrived to business'))
    expect(handleChangeOrderStatus).not.toHaveBeenCalled()
    groupQuestion().accept.onPress()
    expect(handleChangeOrderStatus).toHaveBeenCalledWith(3, [101])
  })

  it('navigates to delivery failed flow from grouped orders', () => {
    const onNavigationRedirect = jest.fn()
    const screen = renderWithProviders(
      <PreviousOrders
        {...baseProps}
        orders={makeGroupedOrders([{ ...orderWithoutLogo, status: 9 }])}
        onNavigationRedirect={onNavigationRedirect}
        getOrderStatus={() => 'In Progress'}
      />
    )
    expandOrderGroup(screen)
    fireEvent.press(screen.getByText('Delivery failed'))
    expect(onNavigationRedirect).toHaveBeenCalledWith(
      'AcceptOrRejectOrder',
      expect.objectContaining({ action: 'deliveryFailed' })
    )
  })

  it('navigates to pickup failed flow from grouped orders', () => {
    ;(useConfig as jest.Mock).mockReturnValue([{
      configs: {
        failed_pickup_by_driver_enabled: { value: '1' },
        order_not_ready_enabled: { value: '1' },
        reject_orders_enabled: { value: '1' }
      }
    }])
    const onNavigationRedirect = jest.fn()
    const screen = renderWithProviders(
      <PreviousOrders
        {...baseProps}
        orders={makeGroupedOrders([{ ...orderWithoutLogo, status: 8 }])}
        onNavigationRedirect={onNavigationRedirect}
        getOrderStatus={() => 'In Progress'}
      />
    )
    expandOrderGroup(screen)
    fireEvent.press(screen.getByText('Pickup failed'))
    expect(onNavigationRedirect).toHaveBeenCalledWith(
      'AcceptOrRejectOrder',
      expect.objectContaining({ action: 'pickupFailed' })
    )
  })

  it('hides reject buttons when reject orders config is disabled', () => {
    ;(useConfig as jest.Mock).mockReturnValue([{
      configs: { reject_orders_enabled: { value: '0' } }
    }])
    const screen = renderWithProviders(
      <PreviousOrders
        {...baseProps}
        orders={makeGroupedOrders([{ ...orderWithoutLogo, status: 0 }])}
      />
    )
    expandOrderGroup(screen)
    expect(screen.queryByText('Reject all')).toBeNull()
    expect(screen.getByText('Accept all')).toBeTruthy()
  })

  it('disables actions when offline and cannot save changes', () => {
    offlineActionsState.isNetConnected = false
    offlineActionsState.canSaveChangesOffline = false
    const screen = renderWithProviders(
      <PreviousOrders
        {...baseProps}
        orders={makeGroupedOrders([{ ...orderWithoutLogo, status: 0 }])}
      />
    )
    expandOrderGroup(screen)
    expect(screen.queryByText('Accept all')).toBeNull()
  })

  it('marks pickup complete for grouped in-progress pickup orders', () => {
    ;(useConfig as jest.Mock).mockReturnValue([{
      configs: { failed_pickup_by_driver_enabled: { value: '1' } }
    }])
    const handleChangeOrderStatus = jest.fn()
    const screen = renderWithProviders(
      <PreviousOrders
        {...baseProps}
        orders={makeGroupedOrders([{ ...orderWithoutLogo, status: 8, delivery_type: 1 }])}
        handleChangeOrderStatus={handleChangeOrderStatus}
        getOrderStatus={() => 'In Progress'}
      />
    )
    expandOrderGroup(screen)
    fireEvent.press(screen.getByText('Pickup complete'))
    expect(handleChangeOrderStatus).not.toHaveBeenCalled()
    groupQuestion().accept.onPress()
    expect(handleChangeOrderStatus).toHaveBeenCalledWith(9, [101])
  })

  it('renders flat non-grouped orders list item', () => {
    const { getByText } = renderWithProviders(
      <PreviousOrders {...baseProps} orders={[orderWithoutLogo]} />
    )
    expect(getByText('Store A')).toBeTruthy()
    expect(getByText('Pending')).toBeTruthy()
  })

  it('shows customer pickup actions for ready orders', () => {
    const handleChangeOrderStatus = jest.fn()
    const screen = renderWithProviders(
      <PreviousOrders
        {...baseProps}
        orders={makeGroupedOrders([{ ...orderWithoutLogo, status: 4, delivery_type: 2 }])}
        handleChangeOrderStatus={handleChangeOrderStatus}
        getOrderStatus={() => 'In Progress'}
      />
    )
    expandOrderGroup(screen)
    fireEvent.press(screen.getByText('Pickup completed by customer'))
    expect(handleChangeOrderStatus).not.toHaveBeenCalled()
    groupQuestion().accept.onPress()
    expect(handleChangeOrderStatus).toHaveBeenCalledWith(15, [101])
  })

  it('marks order not picked up by customer', () => {
    const handleChangeOrderStatus = jest.fn()
    const screen = renderWithProviders(
      <PreviousOrders
        {...baseProps}
        orders={makeGroupedOrders([{ ...orderWithoutLogo, status: 4, delivery_type: 2 }])}
        handleChangeOrderStatus={handleChangeOrderStatus}
        getOrderStatus={() => 'In Progress'}
      />
    )
    expandOrderGroup(screen)
    fireEvent.press(screen.getByText('Order not picked up by customer'))
    expect(handleChangeOrderStatus).not.toHaveBeenCalled()
    groupQuestion().accept.onPress()
    expect(handleChangeOrderStatus).toHaveBeenCalledWith(17, [101])
  })
})

describe('PreviousOrders: the assign requests and the groups', () => {
  const theme = defaultAppTheme()
  const button = theme.native.components.button
  beforeEach(() => {
    ;(useConfig as jest.Mock).mockReturnValue([{ configs: {} }])
  })

  it('has the accept and reject of a request inside its card, under its row', () => {
    const { getByTestId } = renderWithProviders(
      <PreviousOrders {...baseProps} isLogisticOrder handleClickLogisticOrder={jest.fn()} orders={[{ id: 55, isLogistic: true, order: { ...orderWithoutLogo, id: 101 } }]} />
    )
    const card = getByTestId('order-card-101')
    expect(within(card).getByText('Store A')).toBeTruthy()
    expect(within(card).getByText('Accept')).toBeTruthy()
    expect(within(card).getByText('Reject')).toBeTruthy()
  })

  it('opens the request from its row only, and not from the card\'s actions', async () => {
    const onNavigationRedirect = jest.fn()
    const handleClickLogisticOrder = jest.fn()
    const { getByText } = renderWithProviders(
      <PreviousOrders {...baseProps} isLogisticOrder onNavigationRedirect={onNavigationRedirect} handleClickLogisticOrder={handleClickLogisticOrder} orders={[{ id: 55, isLogistic: true, order: { ...orderWithoutLogo, id: 101 } }]} />
    )
    tapPress(getByText('Accept'))
    expect(handleClickLogisticOrder).toHaveBeenCalledWith(1, 55, undefined)
    expect(onNavigationRedirect).not.toHaveBeenCalled()
    fireEvent.press(getByText('Store A'))
    expect(onNavigationRedirect).toHaveBeenCalledWith('OrderDetailsLogistic', expect.anything())
  })

  it('draws a locked request as the locked card: a lock, the reason, no actions and no way in', () => {
    const { queryByText, getByTestId, getByText } = renderWithProviders(
      <PreviousOrders
        {...baseProps}
        isLogisticOrder
        handleClickLogisticOrder={jest.fn()}
        orders={[{ id: 55, isLogistic: true, locked: true, order: { ...orderWithoutLogo, id: 101, locked: true } }]}
      />
    )
    expect(getByTestId('order-card-lock')).toBeTruthy()
    expect(getByText('Locked while another request is open')).toBeTruthy()
    expect(queryByText('Accept')).toBeNull()
    expect(queryByText('Reject')).toBeNull()
    expect(flat(getByTestId('order-card-101')).backgroundColor).toBe(theme.native.tokens.color.surface_alt)
  })

  it('keeps "View order" as the action of a grouped request', () => {
    const onNavigationRedirect = jest.fn()
    const grouped = { ...orderWithoutLogo, id: 101, order_group_id: 7, order_group: { orders: [{ id: 101 }, { id: 102 }] } }
    const { getByText } = renderWithProviders(
      <PreviousOrders {...baseProps} isLogisticOrder onNavigationRedirect={onNavigationRedirect} handleClickLogisticOrder={jest.fn()} orders={[{ id: 55, isLogistic: true, order_group_id: 7, order_group: grouped.order_group, order: grouped }]} />
    )
    fireEvent.press(getByText('View order'))
    expect(onNavigationRedirect).toHaveBeenCalledWith('OrderDetailsLogistic', expect.anything())
  })

  describe('a group of orders', () => {
    const customerOrder = (id: number, name: string, address: string, status = 0) => ({
      ...orderWithoutLogo,
      id,
      status,
      customer: { name, address },
      business: { name: 'Store A', logo: null, address: '214 Harbor St' }
    })

    it('is one card: its head over its orders, each the order\'s card without quick actions, which open the order', () => {
      ;(useConfig as jest.Mock).mockReturnValue([{ configs: { allow_driver_reject_order: { value: '1' } } }])
      const onNavigationRedirect = jest.fn()
      const screen = renderWithProviders(
        <PreviousOrders
          {...baseProps}
          onNavigationRedirect={onNavigationRedirect}
          orders={makeGroupedOrders([customerOrder(1046, 'Ana Torres', '58 Maple Ave'), customerOrder(1047, 'Leo Park', '12 Oak Ln')])}
        />
      )
      expandOrderGroup(screen)
      const group = screen.getByTestId('orders-group-group-1')
      // Each order is the order's card inside the group's: its store over "#number · customer", its stop and its status.
      expect(within(group).getByText('#1046 · Ana Torres')).toBeTruthy()
      expect(within(group).getByText('#1047 · Leo Park')).toBeTruthy()
      expect(within(group).getAllByTestId('order-card-store-name')).toHaveLength(2)
      expect(within(group).getAllByText('Pick up at 214 Harbor St')).toHaveLength(2)
      expect(within(group).getAllByTestId('order-card-status')).toHaveLength(2)
      // The group's buttons are the group's: the orders' own quick actions are not drawn inside it.
      expect(screen.queryByTestId('order-card-1046-actions')).toBeNull()
      expect(screen.queryByTestId('order-card-1047-reject')).toBeNull()
      fireEvent.press(screen.getByText('#1047 · Leo Park'))
      expect(onNavigationRedirect).toHaveBeenCalledWith('OrderDetails', expect.objectContaining({ order: expect.objectContaining({ id: 1047 }) }))
    })

    it('says what its buttons act on, over them, only when it has buttons', () => {
      const pending = renderWithProviders(
        <PreviousOrders {...baseProps} orders={makeGroupedOrders([customerOrder(1, 'A', 'x'), customerOrder(2, 'B', 'y')])} />
      )
      expandOrderGroup(pending)
      expect(pending.getByTestId('orders-group-hint').props.children).toBe('For the 2 orders of the group')
      pending.unmount()
      // Status 1 (completed): the review is the only action, and it is not an order of the group's.
      const done = renderWithProviders(
        <PreviousOrders {...baseProps} orders={makeGroupedOrders([customerOrder(1, 'A', 'x', 11)])} />
      )
      expandOrderGroup(done)
      expect(done.queryByTestId('orders-group-hint')).toBeNull()
    })

    it('puts the pickup\'s two outcomes before "Order not ready", as the mockup', () => {
      ;(useConfig as jest.Mock).mockReturnValue([{ configs: { failed_pickup_by_driver_enabled: { value: '1' }, order_not_ready_enabled: { value: '1' } } }])
      const screen = renderWithProviders(
        <PreviousOrders
          {...baseProps}
          orders={makeGroupedOrders([customerOrder(1, 'A', 'x', 3), customerOrder(2, 'B', 'y', 3)])}
        />
      )
      expandOrderGroup(screen)
      const y = (label: string) => {
        // The row each button is in: the later its position in the tree, the lower it is drawn.
        const all = screen.UNSAFE_root.findAll((node: any) => typeof node.type === 'string')
        return all.findIndex((node: any) => node === screen.getByText(label))
      }
      expect(y('Pickup failed')).toBeLessThan(y('Order not ready'))
      expect(y('Pickup complete')).toBeLessThan(y('Order not ready'))
    })

    it('paints a group\'s buttons as the tonal slots of the cards (small), as an assign request\'s', () => {
      const screen = renderWithProviders(
        <PreviousOrders {...baseProps} orders={makeGroupedOrders([customerOrder(1, 'A', 'x'), customerOrder(2, 'B', 'y')])} />
      )
      expandOrderGroup(screen)
      const box = (label: string) => flat(screen.getByText(label).parent!.parent)
      expect(box('Accept all').backgroundColor).toBe(button.variants.success.tonal.background)
      expect(box('Reject all').backgroundColor).toBe(button.variants.danger.tonal.background)
    })
  })
})

describe('PreviousOrders: the dangerous actions are guarded', () => {
  const second = { ...orderWithoutLogo, id: 102 }
  const group = (status: number, extra: Record<string, any> = {}) =>
    makeGroupedOrders([{ ...orderWithoutLogo, status, ...extra }, { ...second, status, ...extra }])

  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(Alert, 'alert').mockImplementation(jest.fn())
    offlineActionsState.isNetConnected = true
    offlineActionsState.canSaveChangesOffline = false
    ;(useConfig as jest.Mock).mockReturnValue([{ configs: { failed_pickup_by_driver_enabled: { value: '1' }, order_not_ready_enabled: { value: '1' } } }])
  })

  describe('a status change of a whole group asks first', () => {
    const cases: Array<[string, any, number, boolean]> = [
      ['Ready for pickup', { status: 7 }, 4, false],
      ['Arrived to business', { status: 8, delivery_type: 1 }, 3, false],
      ['Pickup complete', { status: 8, delivery_type: 1 }, 9, false],
      ['Pickup completed by customer', { status: 4, delivery_type: 2 }, 15, false],
      ['Order not picked up by customer', { status: 4, delivery_type: 2 }, 17, true],
      ['Delivery complete', { status: 9 }, 11, false]
    ]

    it.each(cases)('%s: a tap sends nothing, the accept button is named after it, accepting sends it once to the whole group', (label, order, status, destructive) => {
      const handleChangeOrderStatus = jest.fn()
      const screen = renderWithProviders(
        <PreviousOrders {...baseProps} handleChangeOrderStatus={handleChangeOrderStatus} orders={group(order.status, order)} getOrderStatus={() => 'In Progress'} />
      )
      expandOrderGroup(screen)
      fireEvent.press(screen.getByText(label))
      expect(handleChangeOrderStatus).not.toHaveBeenCalled()
      expect(Alert.alert).toHaveBeenCalledTimes(1)
      const { title, message, accept, cancel } = groupQuestion()
      expect(title).toBe(label)
      // The question names the group (its number is the key the list groups it by).
      expect(message).toBe('This changes the 2 orders of group No. group-1 at once. Continue?')
      expect(accept.text).toBe(label)
      expect(accept.style).toBe(destructive ? 'destructive' : undefined)
      expect(cancel.text).toBe('Cancel')
      accept.onPress()
      expect(handleChangeOrderStatus).toHaveBeenCalledTimes(1)
      expect(handleChangeOrderStatus).toHaveBeenCalledWith(status, [101, 102])
    })

    it('the question names the group by its number', () => {
      const orders = [[[57, [{ ...orderWithoutLogo, status: 7 }, { ...second, status: 7 }]]]]
      const screen = renderWithProviders(<PreviousOrders {...baseProps} orders={orders} getOrderStatus={() => 'In Progress'} />)
      expandOrderGroup(screen)
      fireEvent.press(screen.getByText('Ready for pickup'))
      expect(groupQuestion().message).toBe('This changes the 2 orders of group No. 57 at once. Continue?')
    })

    it.each([[''], ['null'], ['undefined']])('a group with no number (%p) keeps the question that names no group', (key) => {
      const orders = [[[key, [{ ...orderWithoutLogo, status: 7 }, { ...second, status: 7 }]]]]
      const screen = renderWithProviders(<PreviousOrders {...baseProps} orders={orders} getOrderStatus={() => 'In Progress'} />)
      expandOrderGroup(screen)
      fireEvent.press(screen.getByText('Ready for pickup'))
      expect(groupQuestion().message).toBe('This changes the 2 orders of the group at once. Continue?')
    })

    it('Delivery complete without codes names the group too', () => {
      const orders = [[[57, [{ ...orderWithoutLogo, status: 9 }, { ...second, status: 9 }]]]]
      const screen = renderWithProviders(<PreviousOrders {...baseProps} orders={orders} getOrderStatus={() => 'In Progress'} />)
      expandOrderGroup(screen)
      fireEvent.press(screen.getByText('Delivery complete'))
      expect(groupQuestion().message).toBe('This changes the 2 orders of group No. 57 at once. Continue?')
    })

    it.each(cases)('%s: cancelling sends nothing and leaves the group as it was', (label, order) => {
      const handleChangeOrderStatus = jest.fn()
      const screen = renderWithProviders(
        <PreviousOrders {...baseProps} handleChangeOrderStatus={handleChangeOrderStatus} orders={group(order.status, order)} getOrderStatus={() => 'In Progress'} />
      )
      expandOrderGroup(screen)
      fireEvent.press(screen.getByText(label))
      groupQuestion().cancel.onPress?.()
      expect(handleChangeOrderStatus).not.toHaveBeenCalled()
      // The button is still there, on, and asks again.
      fireEvent.press(screen.getByText(label))
      expect(Alert.alert).toHaveBeenCalledTimes(2)
    })

    it('what already is a second step asks nothing more: a form for a reason (a page), a time or a code (a sheet)', () => {
      const onNavigationRedirect = jest.fn()
      const handleChangeOrderStatus = jest.fn()
      const press = (status: number, extra: Record<string, any>, label: string) => {
        const screen = renderWithProviders(
          <PreviousOrders {...baseProps} onNavigationRedirect={onNavigationRedirect} handleChangeOrderStatus={handleChangeOrderStatus} orders={group(status, extra)} getOrderStatus={() => 'In Progress'} />
        )
        expandOrderGroup(screen)
        fireEvent.press(screen.getByText(label))
        screen.unmount()
      }
      press(0, {}, 'Reject all')
      press(8, { delivery_type: 1 }, 'Pickup failed')
      press(3, { delivery_type: 1 }, 'Order not ready')
      press(9, {}, 'Delivery failed')
      expect(onNavigationRedirect).toHaveBeenCalledTimes(4)
      expect(Alert.alert).not.toHaveBeenCalled()
      expect(handleChangeOrderStatus).not.toHaveBeenCalled()
    })

    it('Accept all opens the time and position sheet and asks nothing before it: accepting stays one tap inside it', () => {
      const screen = renderWithProviders(
        <PreviousOrders {...baseProps} orders={group(0)} />
      )
      expandOrderGroup(screen)
      fireEvent.press(screen.getByText('Accept all'))
      expect(screen.getByTestId('order-sheet')).toBeTruthy()
      expect(Alert.alert).not.toHaveBeenCalled()
    })

    describe('what the group\'s views say and do', () => {
      const orders = () => makeGroupedOrders([
        { ...orderWithoutLogo, status: 0, cart_group_id: 'group-1', customer_id: 1, customer: { name: 'Ana', cellphone: '5551111' } },
        { ...second, status: 0, cart_group_id: 'group-1', customer_id: 2, customer: { name: 'Leo', cellphone: '5552222' } }
      ])

      it('Accept all names the count, the group and its orders; the list stays behind it', () => {
        const screen = renderWithProviders(<PreviousOrders {...baseProps} orders={orders()} />)
        expandOrderGroup(screen)
        fireEvent.press(screen.getByText('Accept all'))
        expect(within(screen.getByTestId('order-sheet')).getByText('Accept 2 orders')).toBeTruthy()
        expect(screen.getByTestId('group-orders-line').props.children).toBe('Group No. group-1 · Orders No. 101, 102')
        expect(screen.getByText('Reject all')).toBeTruthy()
      })

      it('accepting is one tap inside the sheet: the whole group changes at once and the sheet closes', async () => {
        ;(useConfig as jest.Mock).mockReturnValue([{ configs: { disable_delivery_priority: { value: '1' } } }])
        const handleChangeOrderStatus = jest.fn().mockResolvedValue([{}, {}])
        const screen = renderWithProviders(<PreviousOrders {...baseProps} orders={orders()} handleChangeOrderStatus={handleChangeOrderStatus} />)
        expandOrderGroup(screen)
        fireEvent.press(screen.getByText('Accept all'))
        fireEvent.press(screen.getByTestId('order-action'))
        await waitFor(() => expect(screen.queryByTestId('order-sheet')).toBeNull(), { timeout: 5000 })
        expect(handleChangeOrderStatus).toHaveBeenCalledTimes(1)
        // The request is asked for each order's answer (`withDetails`): the failure says what the API said.
        expect(handleChangeOrderStatus).toHaveBeenCalledWith(8, [101, 102], expect.objectContaining({ status: 8, id: 101 }), { withDetails: true })
        expect(Alert.alert).not.toHaveBeenCalled()
      })

      it('the sheet stays when an order of the group did not change', async () => {
        ;(useConfig as jest.Mock).mockReturnValue([{ configs: { disable_delivery_priority: { value: '1' } } }])
        const handleChangeOrderStatus = jest.fn().mockResolvedValue([{}])
        const screen = renderWithProviders(<PreviousOrders {...baseProps} orders={orders()} handleChangeOrderStatus={handleChangeOrderStatus} />)
        expandOrderGroup(screen)
        fireEvent.press(screen.getByText('Accept all'))
        fireEvent.press(screen.getByTestId('order-action'))
        await waitFor(() => expect(handleChangeOrderStatus).toHaveBeenCalled(), { timeout: 5000 })
        expect(screen.getByTestId('order-sheet')).toBeTruthy()
      })

      it('a group where one order did not change: the sheet stays with how many and why, and the next tap sends only that one', async () => {
        ;(useConfig as jest.Mock).mockReturnValue([{ configs: { disable_delivery_priority: { value: '1' } } }])
        const handleChangeOrderStatus = jest.fn()
          .mockResolvedValueOnce([{ id: 101, result: {}, error: false }, { id: 102, result: ['Order not found'], error: true }])
          .mockResolvedValueOnce([{ id: 102, result: {}, error: false }])
        const screen = renderWithProviders(<PreviousOrders {...baseProps} orders={orders()} handleChangeOrderStatus={handleChangeOrderStatus} />)
        expandOrderGroup(screen)
        fireEvent.press(screen.getByText('Accept all'))
        fireEvent.press(screen.getByTestId('order-action'))
        await waitFor(() => expect(screen.getByTestId('order-action-error')).toBeTruthy(), { timeout: 5000 })
        expect(screen.getByText('Orders that did not change: 1 · Order not found')).toBeTruthy()
        expect(screen.getByTestId('order-sheet')).toBeTruthy()
        expect(screen.getByTestId('order-action').props.accessibilityState?.disabled).toBeFalsy()
        fireEvent.press(screen.getByTestId('order-action'))
        await waitFor(() => expect(screen.queryByTestId('order-sheet')).toBeNull(), { timeout: 5000 })
        expect(handleChangeOrderStatus).toHaveBeenCalledTimes(2)
        expect(handleChangeOrderStatus.mock.calls[1][1]).toEqual([102])
      })

      it('Reject all is a page that gets the group: its orders, its number and the ids', () => {
        const onNavigationRedirect = jest.fn()
        const screen = renderWithProviders(<PreviousOrders {...baseProps} orders={orders()} onNavigationRedirect={onNavigationRedirect} />)
        expandOrderGroup(screen)
        fireEvent.press(screen.getByText('Reject all'))
        expect(onNavigationRedirect).toHaveBeenCalledWith('AcceptOrRejectOrder', expect.objectContaining({
          action: 'reject',
          ids: [101, 102],
          groupId: 'group-1',
          orders: expect.arrayContaining([expect.objectContaining({ id: 101 }), expect.objectContaining({ id: 102 })])
        }))
      })

      it('Accept all is off while a change of the group is on its way (no sheet either)', () => {
        const screen = renderWithProviders(<PreviousOrders {...baseProps} orders={orders()} loadingChangeOrder />)
        expandOrderGroup(screen)
        fireEvent.press(screen.getByText('Accept all'))
        expect(screen.queryByTestId('order-sheet')).toBeNull()
      })
    })

    it('Delivery complete of a group that needs a delivery code opens its form (a sheet over the list), with no question', () => {
      ;(useConfig as jest.Mock).mockReturnValue([{ configs: { delivery_pin_enabled: { value: '1' } } }])
      const onNavigationRedirect = jest.fn()
      const handleChangeOrderStatus = jest.fn()
      const screen = renderWithProviders(
        <PreviousOrders
          {...baseProps}
          onNavigationRedirect={onNavigationRedirect}
          handleChangeOrderStatus={handleChangeOrderStatus}
          orders={group(9, { delivery_pin_status: 'requested' })}
          getOrderStatus={() => 'In Progress'}
        />
      )
      expandOrderGroup(screen)
      fireEvent.press(screen.getByText('Delivery complete'))
      expect(onNavigationRedirect).not.toHaveBeenCalled()
      expect(screen.getByTestId('order-sheet')).toBeTruthy()
      expect(screen.getByText('Delivery complete for 2 orders')).toBeTruthy()
      expect(Alert.alert).not.toHaveBeenCalled()
      expect(handleChangeOrderStatus).not.toHaveBeenCalled()
    })

    it('stays off while a change of the group is on its way, and offline without changes saved', () => {
      const busy = renderWithProviders(
        <PreviousOrders {...baseProps} orders={group(7)} loadingChangeOrder getOrderStatus={() => 'In Progress'} />
      )
      expandOrderGroup(busy)
      fireEvent.press(busy.getByText('Ready for pickup'))
      expect(Alert.alert).not.toHaveBeenCalled()
      busy.unmount()

      offlineActionsState.isNetConnected = false
      offlineActionsState.canSaveChangesOffline = false
      const offline = renderWithProviders(<PreviousOrders {...baseProps} orders={group(7)} getOrderStatus={() => 'In Progress'} />)
      expandOrderGroup(offline)
      expect(offline.queryByText('Ready for pickup')).toBeNull()
    })
  })

  describe('an assign request answered from the list: accept is a tap, reject is held', () => {
    const request = { ...orderWithoutLogo, id: 909, isLogistic: true, order: { ...orderWithoutLogo, id: 202 }, locked: false }
    const renderRequest = (props: Record<string, any> = {}) => {
      const handleClickLogisticOrder = jest.fn().mockResolvedValue({ error: true })
      const screen = renderWithProviders(
        <PreviousOrders {...baseProps} orders={[request]} isLogisticOrder handleClickLogisticOrder={handleClickLogisticOrder} handleUpdateLogisticOrdersEta={jest.fn()} {...props} />
      )
      return { screen, handleClickLogisticOrder }
    }
    const holdHint = () => {
      const { useToast } = require('@components')
      return (useToast as jest.Mock).mock.results.some((result: any) => result.value[1].showToast.mock.calls.some((call: any[]) => call[1] === 'Hold to confirm'))
    }

    it('accept: one tap answers once, with no hint', () => {
      const { screen, handleClickLogisticOrder } = renderRequest()
      tapPress(screen.getByText('Accept'))
      expect(handleClickLogisticOrder).toHaveBeenCalledTimes(1)
      expect(handleClickLogisticOrder).toHaveBeenCalledWith(1, 909, undefined)
      expect(holdHint()).toBe(false)
    })

    it('reject: a tap answers nothing, an early release nothing, the hold once', async () => {
      const { screen, handleClickLogisticOrder } = renderRequest()
      tapPress(screen.getByText('Reject'))
      await holdPress(screen.getByText('Reject'), holdMs() - 100)
      expect(handleClickLogisticOrder).not.toHaveBeenCalled()
      await holdPress(screen.getByText('Reject'))
      expect(handleClickLogisticOrder).toHaveBeenCalledTimes(1)
      expect(handleClickLogisticOrder).toHaveBeenCalledWith(2, 909, undefined)
    })

    it('says what to do on a tap of the reject', () => {
      const { screen } = renderRequest()
      tapPress(screen.getByText('Reject'))
      expect(holdHint()).toBe(true)
    })

    it('answers nothing while a change of the order is on its way, a tap or a hold', async () => {
      const { screen, handleClickLogisticOrder } = renderRequest({ loadingChangeOrder: true })
      tapPress(screen.getByText('Accept'))
      await holdPress(screen.getByText('Reject'))
      expect(handleClickLogisticOrder).not.toHaveBeenCalled()
    })

    it('leaves "View order" of a grouped request as a tap: it only opens the request', () => {
      const onNavigationRedirect = jest.fn()
      const grouped = { ...orderWithoutLogo, id: 101, order_group_id: 7, order_group: { orders: [{ id: 101 }, { id: 102 }] } }
      const screen = renderWithProviders(
        <PreviousOrders {...baseProps} isLogisticOrder onNavigationRedirect={onNavigationRedirect} handleClickLogisticOrder={jest.fn()} orders={[{ id: 55, isLogistic: true, order_group_id: 7, order_group: grouped.order_group, order: grouped }]} />
      )
      fireEvent.press(screen.getByText('View order'))
      expect(onNavigationRedirect).toHaveBeenCalledWith('OrderDetailsLogistic', expect.anything())
    })
  })
})


describe('PreviousOrders: a row keeps no old closure', () => {
  const request = (id: number) => ({ ...orderWithoutLogo, id, isLogistic: true, order: { ...orderWithoutLogo, id: id + 1000 }, locked: false })
  const [a, b, c] = [request(901), request(902), request(903)]
  const listProps = { ...baseProps, isLogisticOrder: true, handleUpdateLogisticOrdersEta: jest.fn() }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useConfig as jest.Mock).mockReturnValue([{ configs: {} }])
    offlineActionsState.isNetConnected = true
  })

  it('answers with the latest handler of the list, though its row did not change and was not redrawn (a request arrived meanwhile)', () => {
    const stale = jest.fn().mockResolvedValue({ error: true })
    const latest = jest.fn().mockResolvedValue({ error: true })
    const screen = renderWithProviders(<PreviousOrders {...listProps} orders={[a, b]} handleClickLogisticOrder={stale} />)
    // C arrives: the controller's handler now knows a list of three (it writes whole lists), and A's and B's rows are the same.
    screen.rerender(<PreviousOrders {...listProps} orders={[a, b, c]} handleClickLogisticOrder={latest} />)
    tapPress(screen.getAllByText('Accept')[0])
    expect(latest).toHaveBeenCalledTimes(1)
    expect(latest).toHaveBeenCalledWith(1, 901, undefined)
    expect(stale).not.toHaveBeenCalled()
  })

  it('the held reject too', async () => {
    const stale = jest.fn().mockResolvedValue({ error: true })
    const latest = jest.fn().mockResolvedValue({ error: true })
    const screen = renderWithProviders(<PreviousOrders {...listProps} orders={[a, b]} handleClickLogisticOrder={stale} />)
    screen.rerender(<PreviousOrders {...listProps} orders={[a, b, c]} handleClickLogisticOrder={latest} />)
    await holdPress(screen.getAllByText('Reject')[0])
    expect(latest).toHaveBeenCalledWith(2, 901, undefined)
    expect(stale).not.toHaveBeenCalled()
  })

  it('opens an order with the latest handler of the list', () => {
    const stale = jest.fn()
    const latest = jest.fn()
    const screen = renderWithProviders(<PreviousOrders {...baseProps} orders={[orderWithoutLogo]} handleClickOrder={stale} />)
    screen.rerender(<PreviousOrders {...baseProps} orders={[orderWithoutLogo]} handleClickOrder={latest} />)
    fireEvent.press(screen.getByText('Store A'))
    expect(latest).toHaveBeenCalledTimes(1)
    expect(stale).not.toHaveBeenCalled()
  })

  it('reads the status\'s name with the latest function too', () => {
    const screen = renderWithProviders(<PreviousOrders {...baseProps} orders={[orderWithoutLogo]} getOrderStatus={() => 'Pending'} />)
    expect(screen.getByText('Pending')).toBeTruthy()
    // A new language gives new names with the same order: the row draws them.
    screen.rerender(<PreviousOrders {...baseProps} orders={[{ ...orderWithoutLogo }]} getOrderStatus={() => 'Pendiente'} />)
    expect(screen.getByText('Pendiente')).toBeTruthy()
  })

  it('hands the request\'s own screen a handler that is always the latest, not the one of the render it opened in', async () => {
    const stale = jest.fn().mockResolvedValue({ error: true })
    const latest = jest.fn().mockResolvedValue({ error: true })
    const onNavigationRedirect = jest.fn()
    const screen = renderWithProviders(<PreviousOrders {...listProps} onNavigationRedirect={onNavigationRedirect} orders={[a, b]} handleClickLogisticOrder={stale} />)
    fireEvent.press(screen.getAllByText('Store A')[0])
    const given = onNavigationRedirect.mock.calls[0][1].handleClickLogisticOrder
    screen.rerender(<PreviousOrders {...listProps} onNavigationRedirect={onNavigationRedirect} orders={[a, b, c]} handleClickLogisticOrder={latest} />)
    await given(2, 901)
    expect(latest).toHaveBeenCalledWith(2, 901)
    expect(stale).not.toHaveBeenCalled()
  })
})

describe('PreviousOrders: a group\'s actions follow the rules of the single order', () => {
  const stepTitles = {
    ...orderTitle,
    arrivedToBusiness: { key: 'ARRIVED_TO_BUSINESS', text: 'Arrived to business', btnKey: 'ARRIVED_TO_BUSINESS', btnText: 'Arrived to business' },
    pickupComplete: { key: 'PICKUP_COMPLETE', text: 'Pickup complete', btnKey: 'PICKUP_COMPLETE', btnText: 'Pickup complete' }
  }
  const second = { ...orderWithoutLogo, id: 102 }
  const group = (status: number, extra: Record<string, any> = {}) =>
    makeGroupedOrders([{ ...orderWithoutLogo, status, ...extra }, { ...second, status, ...extra }])
  const configs = (extra: Record<string, any> = {}) => (useConfig as jest.Mock).mockReturnValue([{
    configs: { failed_pickup_by_driver_enabled: { value: '1' }, order_not_ready_enabled: { value: '1' }, disable_delivery_priority: { value: '1' }, ...extra }
  }])
  const open = (orders: any, props: Record<string, any> = {}) => {
    const screen = renderWithProviders(<PreviousOrders {...baseProps} orderTitle={stepTitles} orders={orders} getOrderStatus={() => 'In Progress'} {...props} />)
    expandOrderGroup(screen)
    return screen
  }

  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(Alert, 'alert').mockImplementation(jest.fn())
    offlineActionsState.isNetConnected = true
    offlineActionsState.canSaveChangesOffline = false
    configs()
  })

  describe('a status that asks for a photo is not offered to a group: the list\'s request cannot carry it', () => {
    const cases: Array<[string, number, any, string]> = [
      ['Ready for pickup', 4, { status: 7 }, 'Ready for pickup'],
      ['Arrived to business', 3, { status: 8, delivery_type: 1 }, 'Arrived to business'],
      ['Pickup complete', 9, { status: 8, delivery_type: 1 }, 'Pickup complete'],
      ['Delivery complete', 11, { status: 9 }, 'Delivery complete'],
      ['Pickup completed by customer', 15, { status: 4, delivery_type: 2 }, 'Pickup completed by customer'],
      ['Accept all', 8, { status: 0 }, 'Accept all'],
      ['Reject all', 6, { status: 0 }, 'Reject all'],
      ['Pickup failed', 10, { status: 8, delivery_type: 1 }, 'Pickup failed'],
      ['Delivery failed', 12, { status: 9 }, 'Delivery failed'],
      ['Order not ready', 14, { status: 3, delivery_type: 1 }, 'Order not ready']
    ]

    it.each(cases)('%s (status %i) is hidden when the project asks for a photo on it, and shown when not', (_label, status, order, text) => {
      configs({ states_requiring_image_driver: { value: `${status}` } })
      const hidden = open(group(order.status, order))
      expect(hidden.queryByText(text)).toBeNull()
      hidden.unmount()
      configs({ states_requiring_image_driver: { value: '2' } })
      const shown = open(group(order.status, order))
      expect(shown.getByText(text)).toBeTruthy()
    })

    it('keeps the other button of the row, and draws no row (nor the line that names the group\'s buttons) when none is left', () => {
      configs({ states_requiring_image_driver: { value: '9' } })
      const some = open(group(8, { delivery_type: 1 }))
      expect(some.queryByText('Pickup complete')).toBeNull()
      expect(some.getByText('Pickup failed')).toBeTruthy()
      some.unmount()
      configs({ states_requiring_image_driver: { value: '4' } })
      const none = open(group(7))
      expect(none.queryByText('Ready for pickup')).toBeNull()
      expect(none.queryByTestId('orders-group-hint')).toBeNull()
    })
  })

  describe('a step with a location check opens the view that makes it, for the group', () => {
    const checked = (status: number) => configs({ [`location_validation_enabled_status_${status}`]: { value: '1' } })
    const cases: Array<[string, number, any, string]> = [
      ['Arrived to business', 3, { status: 8, delivery_type: 1 }, 'arrivedToBusiness'],
      ['Pickup complete', 9, { status: 8, delivery_type: 1 }, 'pickupComplete'],
      ['Delivery complete', 11, { status: 9 }, 'deliveryComplete']
    ]

    it.each(cases)('%s: no confirmation and no request from the list, the sheet over it (it checks where the driver is before it sends)', (label, status, order) => {
      checked(status)
      const handleChangeOrderStatus = jest.fn()
      const screen = open(group(order.status, order), { handleChangeOrderStatus })
      fireEvent.press(screen.getByText(label))
      expect(Alert.alert).not.toHaveBeenCalled()
      expect(handleChangeOrderStatus).not.toHaveBeenCalled()
      expect(within(screen.getByTestId('order-sheet')).getAllByText(label).length).toBeGreaterThan(0)
    })

    it.each(cases)('%s with no check keeps the confirmation of the group', (label, status, order) => {
      const handleChangeOrderStatus = jest.fn()
      const screen = open(group(order.status, order), { handleChangeOrderStatus })
      fireEvent.press(screen.getByText(label))
      expect(screen.queryByTestId('order-sheet')).toBeNull()
      expect(Alert.alert).toHaveBeenCalledTimes(1)
      groupQuestion().accept.onPress()
      expect(handleChangeOrderStatus).toHaveBeenCalledWith(status, [101, 102])
    })
  })

  describe('one question at a time', () => {
    it('a second tap on a group\'s button while its question is open asks nothing more', () => {
      const screen = open(group(7))
      fireEvent.press(screen.getByText('Ready for pickup'))
      fireEvent.press(screen.getByText('Ready for pickup'))
      expect(Alert.alert).toHaveBeenCalledTimes(1)
    })

    it('after the way out (Cancel) the question can be asked again', () => {
      const screen = open(group(7))
      fireEvent.press(screen.getByText('Ready for pickup'))
      groupQuestion().cancel.onPress?.()
      fireEvent.press(screen.getByText('Ready for pickup'))
      expect(Alert.alert).toHaveBeenCalledTimes(2)
    })

    it('after the accept the change is sent once, and the question is not asked again by a late tap', () => {
      const handleChangeOrderStatus = jest.fn().mockReturnValue(new Promise(() => {}))
      const screen = open(group(7), { handleChangeOrderStatus })
      fireEvent.press(screen.getByText('Ready for pickup'))
      groupQuestion().accept.onPress()
      fireEvent.press(screen.getByText('Ready for pickup'))
      expect(Alert.alert).toHaveBeenCalledTimes(1)
      expect(handleChangeOrderStatus).toHaveBeenCalledTimes(1)
    })
  })

  describe('the buttons are released by the answer, not by the controller\'s flag', () => {
    it('a request that answers without the flag ever going up (nothing to change, or too fast to render) frees the buttons', async () => {
      const handleChangeOrderStatus = jest.fn().mockResolvedValue([{}, {}])
      const screen = open(group(7), { handleChangeOrderStatus })
      fireEvent.press(screen.getByText('Ready for pickup'))
      await act(async () => { groupQuestion().accept.onPress() })
      fireEvent.press(screen.getByText('Ready for pickup'))
      expect(Alert.alert).toHaveBeenCalledTimes(2)
      await act(async () => { groupQuestion().accept.onPress() })
      expect(handleChangeOrderStatus).toHaveBeenCalledTimes(2)
    })

    it('a request that throws frees them too', async () => {
      const handleChangeOrderStatus = jest.fn().mockRejectedValue(new Error('boom'))
      const screen = open(group(7), { handleChangeOrderStatus })
      fireEvent.press(screen.getByText('Ready for pickup'))
      await act(async () => { groupQuestion().accept.onPress() })
      fireEvent.press(screen.getByText('Ready for pickup'))
      expect(Alert.alert).toHaveBeenCalledTimes(2)
    })

    it('keeps them off while the request has not answered', async () => {
      let answer!: (value: any) => void
      const handleChangeOrderStatus = jest.fn(() => new Promise((resolve) => { answer = resolve }))
      const screen = open(group(7), { handleChangeOrderStatus })
      fireEvent.press(screen.getByText('Ready for pickup'))
      groupQuestion().accept.onPress()
      expect(screen.getByText('Ready for pickup')).toBeTruthy()
      fireEvent.press(screen.getByText('Ready for pickup'))
      expect(Alert.alert).toHaveBeenCalledTimes(1)
      await act(async () => { answer([{}, {}]) })
      fireEvent.press(screen.getByText('Ready for pickup'))
      expect(Alert.alert).toHaveBeenCalledTimes(2)
    })
  })

  describe('the forced-status form follows the rule of the sheets', () => {
    const regression = { ids: [101, 102], body: { status: 4 } }
    const openForm = (props: Record<string, any> = {}) => {
      const clearRegressionRequest = jest.fn()
      const screen = renderWithProviders(
        <PreviousOrders {...baseProps} actions={DRIVER_ACTIONS} orderTitle={DRIVER_ORDER_TITLES} orders={[orderWithoutLogo]} regressionRequest={regression} clearRegressionRequest={clearRegressionRequest} {...props} />
      )
      return screen
    }
    const confirm = async (screen: any) => {
      fireEvent.changeText(screen.getByPlaceholderText('Please type your comments in here'), 'Wrong tap')
      await act(async () => { fireEvent.press(screen.getByTestId('order-action')) })
    }

    it('asks for the reason, and sends it with the status of the request to the orders it names', async () => {
      const handleChangeOrderStatus = jest.fn().mockResolvedValue([{}, {}])
      const screen = openForm({ handleChangeOrderStatus })
      expect(screen.getByText('Reason required')).toBeTruthy()
      await confirm(screen)
      expect(handleChangeOrderStatus).toHaveBeenCalledWith(4, [101, 102], expect.objectContaining({ status: 4, reasons: 'Wrong tap' }), { withDetails: true })
    })

    it('closes only once the answer says every order changed', async () => {
      let answer!: (value: any) => void
      const handleChangeOrderStatus = jest.fn(() => new Promise((resolve) => { answer = resolve }))
      const screen = openForm({ handleChangeOrderStatus })
      await confirm(screen)
      // Not before the answer.
      expect(screen.getByText('Reason required')).toBeTruthy()
      await act(async () => { answer([{}, {}]) })
      expect(screen.queryByText('Reason required')).toBeNull()
    })

    it('stays open with the API\'s message when the change was refused, and sends again only the orders that did not change', async () => {
      const handleChangeOrderStatus = jest.fn()
        .mockResolvedValueOnce([{ id: 101, result: {}, error: false }, { id: 102, result: ['Order not found'], error: true }])
        .mockResolvedValueOnce([{ id: 102, result: {}, error: false }])
      const screen = openForm({ handleChangeOrderStatus })
      await confirm(screen)
      expect(screen.getByText('Reason required')).toBeTruthy()
      expect(screen.getByText('Orders that did not change: 1 · Order not found')).toBeTruthy()
      await act(async () => { fireEvent.press(screen.getByTestId('order-action')) })
      expect(handleChangeOrderStatus.mock.calls[1][1]).toEqual([102])
      expect(screen.queryByText('Reason required')).toBeNull()
    })

    it('does not wipe what the form shows while the request runs', async () => {
      let answer!: (value: any) => void
      const handleChangeOrderStatus = jest.fn(() => new Promise((resolve) => { answer = resolve }))
      const screen = openForm({ handleChangeOrderStatus })
      await confirm(screen)
      expect(screen.getByDisplayValue('Wrong tap')).toBeTruthy()
      await act(async () => { answer([{}, {}]) })
    })
  })
})
