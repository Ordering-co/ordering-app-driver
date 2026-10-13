import React from 'react'
import { fireEvent, waitFor } from '@testing-library/react-native'

import { useConfig } from '@components'
import { offlineActionsState } from '../../../../../../jest/helpers/d3OrdersUiMock'

jest.mock('@ui', () => {
  const { buildD3OrdersIntegrationUiMock } = require('../../../../../../jest/helpers/d3OrdersUiMock')
  return buildD3OrdersIntegrationUiMock()
})

jest.mock('@components', () => {
  const { getMock } = require('../../../../../../jest/helpers/d3OrdersComponentsMock')
  return getMock()
})

import { PreviousOrders } from '..'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { makeGroupedOrders, sampleOrder } from '../../../../../../jest/helpers/d3OrdersDefaults'

const baseProps = {
  isBusinessApp: false,
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

const expandOrderGroup = ({ UNSAFE_getAllByType }: { UNSAFE_getAllByType: (type: unknown) => unknown[] }) => {
  const { TouchableOpacity } = require('react-native')
  fireEvent.press(UNSAFE_getAllByType(TouchableOpacity)[0] as never)
}

describe('PreviousOrders', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    offlineActionsState.isNetConnected = true
    offlineActionsState.canSaveChangesOffline = false
    ;(useConfig as jest.Mock).mockReturnValue([{ configs: {} }])
  })

  it('renders nothing when orders list is empty', () => {
    const { queryByText } = renderWithProviders(
      <PreviousOrders orders={[]} isBusinessApp />
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

  it('shows accept and reject all for grouped pending orders', () => {
    const onNavigationRedirect = jest.fn()
    const screen = renderWithProviders(
      <PreviousOrders
        {...baseProps}
        orders={makeGroupedOrders([{ ...orderWithoutLogo, status: 0 }])}
        onNavigationRedirect={onNavigationRedirect}
      />
    )
    expandOrderGroup(screen)
    fireEvent.press(screen.getByText('Accept all'))
    expect(onNavigationRedirect).toHaveBeenCalledWith(
      'AcceptOrRejectOrder',
      expect.objectContaining({ action: 'accept' })
    )
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
    fireEvent.press(screen.getByText('Ready for pickup'))
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

  it('uses handleClickEvent when provided instead of navigation', () => {
    const handleClickEvent = jest.fn()
    const onNavigationRedirect = jest.fn()
    const { getByText } = renderWithProviders(
      <PreviousOrders
        {...baseProps}
        orders={[orderWithoutLogo]}
        handleClickEvent={handleClickEvent}
        onNavigationRedirect={onNavigationRedirect}
      />
    )
    fireEvent.press(getByText('Store A'))
    expect(handleClickEvent).toHaveBeenCalled()
    expect(onNavigationRedirect).not.toHaveBeenCalled()
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

  it('asks for the delivery time after accepting a logistic order from the list', async () => {
    const onNavigationRedirect = jest.fn()
    const handleUpdateLogisticOrdersEta = jest.fn().mockResolvedValue([{ id: 202 }])
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
    const { getByText } = renderWithProviders(
      <PreviousOrders
        {...baseProps}
        orders={[logisticOrder]}
        isLogisticOrder
        onNavigationRedirect={onNavigationRedirect}
        handleClickLogisticOrder={handleClickLogisticOrder}
        handleUpdateLogisticOrdersEta={handleUpdateLogisticOrdersEta}
      />
    )
    fireEvent.press(getByText('Accept'))
    expect(handleClickLogisticOrder).toHaveBeenCalledWith(1, 909, undefined)

    await waitFor(() =>
      expect(onNavigationRedirect).toHaveBeenCalledWith(
        'AcceptOrRejectOrder',
        expect.objectContaining({ action: 'accept', ids: [202] })
      )
    )

    const params = onNavigationRedirect.mock.calls[0][1]
    await params.handleChangeOrderStatus(8, [202], { delivered_in: 45, status: 8 })
    expect(handleUpdateLogisticOrdersEta).toHaveBeenCalledWith([202], 45)
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
    const { getByText } = renderWithProviders(
      <PreviousOrders
        {...baseProps}
        orders={[logisticOrder]}
        isLogisticOrder
        onNavigationRedirect={onNavigationRedirect}
        handleClickLogisticOrder={handleClickLogisticOrder}
        handleUpdateLogisticOrdersEta={jest.fn()}
      />
    )
    fireEvent.press(getByText('Accept'))
    await waitFor(() => expect(handleClickLogisticOrder).toHaveBeenCalled())
    expect(onNavigationRedirect).not.toHaveBeenCalled()
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
    const { getByText } = renderWithProviders(
      <PreviousOrders
        {...baseProps}
        orders={[logisticOrder]}
        isLogisticOrder
        onNavigationRedirect={onNavigationRedirect}
        handleClickLogisticOrder={handleClickLogisticOrder}
        handleUpdateLogisticOrdersEta={jest.fn()}
      />
    )
    fireEvent.press(getByText('Accept'))
    await waitFor(() => expect(handleClickLogisticOrder).toHaveBeenCalled())
    expect(onNavigationRedirect).not.toHaveBeenCalled()
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
    const { getByText } = renderWithProviders(
      <PreviousOrders
        {...baseProps}
        orders={[logisticOrder]}
        isLogisticOrder
        onNavigationRedirect={onNavigationRedirect}
        handleClickLogisticOrder={handleClickLogisticOrder}
        handleUpdateLogisticOrdersEta={jest.fn()}
      />
    )
    fireEvent.press(getByText('Reject'))
    expect(handleClickLogisticOrder).toHaveBeenCalledWith(2, 909, undefined)
    await waitFor(() => expect(handleClickLogisticOrder).toHaveBeenCalled())
    expect(onNavigationRedirect).not.toHaveBeenCalled()
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
    fireEvent.press(screen.getByText('Arrived to bussiness'))
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
    fireEvent.press(screen.getByText('Delivery Failed'))
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
    expect(handleChangeOrderStatus).toHaveBeenCalledWith(17, [101])
  })
})
