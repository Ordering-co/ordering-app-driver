import React from 'react'
import { fireEvent, waitFor } from '@testing-library/react-native'
import Clipboard from '@react-native-clipboard/clipboard'

import { useConfig } from '@components'

jest.mock('rn-placeholder', () => {
  const { View } = require('react-native')
  return {
    Placeholder: ({ children }: any) => <View testID="placeholder">{children}</View>,
    PlaceholderLine: () => <View testID="placeholder-line" />,
    Fade: {}
  }
})

require('../../../../../../jest/helpers/registerD3OrdersMocks')
require('../../../../../../jest/helpers/registerD4DeliveryMocks')

jest.mock('../../../../../context/PermissionsContext', () =>
  require('../../../../../../jest/helpers/mockPermissionsContext')
)

jest.mock('react-native-select-dropdown', () => {
  const React = require('react')
  const { View, Text, TouchableOpacity } = require('react-native')
  return ({ data, defaultButtonText, onSelect }: any) => (
    <View testID="select-dropdown">
      <Text>{defaultButtonText}</Text>
      {data?.map((item: any, index: number) => (
        <TouchableOpacity key={index} onPress={() => onSelect?.(item, index)}>
          <Text>{item?.content ?? item?.label ?? item?.name ?? String(item?.key ?? index)}</Text>
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
      { testID: `feather-${props.name}`, onPress: props.onPress, disabled: props.disabled },
      React.createElement(Text, null, props.name)
    )
})

jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => {
  const React = require('react')
  const { Pressable, Text } = require('react-native')
  return (props: any) =>
    React.createElement(
      Pressable,
      { testID: `mci-${props.name}`, onPress: props.onPress },
      React.createElement(Text, null, props.name)
    )
})

jest.mock('react-native-vector-icons/SimpleLineIcons', () => 'Icon')

jest.mock('@react-native-clipboard/clipboard', () => ({
  setString: jest.fn()
}))

jest.mock('@ui', () => {
  const React = require('react')
  const { View, Pressable, Text } = require('react-native')
  const { buildD3OrdersUiMock } = require('../../../../../../jest/helpers/d3OrdersUiMock')
  const mock = buildD3OrdersUiMock()

  mock.AcceptOrRejectOrder = require('../../AcceptOrRejectOrder').AcceptOrRejectOrder
  mock.ProductItemAccordion = require('../../ProductItemAccordion').ProductItemAccordion
  mock.FloatingButton = ({
    btnText,
    secondBtnText,
    firstButtonClick,
    secondButtonClick
  }: any) =>
    React.createElement(
      View,
      { testID: 'floating-button' },
      btnText
        ? React.createElement(
          Pressable,
          { testID: `float-${btnText}`, onPress: firstButtonClick },
          React.createElement(Text, null, btnText)
        )
        : null,
      secondBtnText
        ? React.createElement(
          Pressable,
          { testID: `float-${secondBtnText}`, onPress: secondButtonClick },
          React.createElement(Text, null, secondBtnText)
        )
        : null
    )
  mock.DriverMap = ({ testID = 'driver-map-stub' }: any) =>
    React.createElement(View, { testID })
  mock.OAlertOriginal = ({ open, content }: any) =>
    open
      ? React.createElement(Text, { testID: 'delivery-alert' }, content?.[0])
      : null
  mock.OModal = ({ open, children }: any) =>
    open
      ? React.createElement(View, { testID: 'delivery-modal' }, children)
      : null
  mock.OIconButton = ({ onClick }: any) =>
    React.createElement(
      Pressable,
      { testID: 'o-icon-button', onPress: onClick },
      React.createElement(Text, null, 'icon')
    )

  return mock
})

jest.mock('@components', () => {
  const { getMock } = require('../../../../../../jest/helpers/d3OrdersComponentsMock')
  return getMock()
})

import { OrderDetailsDelivery } from '../Delivery'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { driverAppTitle, driverOrderTitle, richSampleOrder, sampleOrder } from '../../../../../../jest/helpers/d3OrdersDefaults'

const { PermissionsContext, mockPermissions } = require('../../../../../../jest/helpers/mockPermissionsContext')

const renderDelivery = (ui: React.ReactElement, permissions = mockPermissions) =>
  renderWithProviders(
    <PermissionsContext.Provider value={permissions}>{ui}</PermissionsContext.Provider>
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

  it('renders loading placeholders when order is empty', () => {
    const { getAllByTestId } = renderDelivery(
      <OrderDetailsDelivery
        {...baseProps}
        order={{ order: {}, loading: false, error: null }}
      />
    )
    expect(getAllByTestId('placeholder').length).toBeGreaterThan(0)
  })

  it('renders not found when order request fails', () => {
    const navigate = jest.fn()
    const { getByText } = renderDelivery(
      <OrderDetailsDelivery
        {...baseProps}
        navigation={{ navigate, goBack: jest.fn() }}
        order={{ order: {}, loading: false, error: ['Order not found'] }}
      />
    )
    expect(getByText('Order not found')).toBeTruthy()
    fireEvent.press(getByText('Go to my orders'))
    expect(navigate).toHaveBeenCalledWith('Orders')
  })

  it('renders order details when order is loaded', () => {
    const { getByText } = renderDelivery(
      <OrderDetailsDelivery
        {...baseProps}
        order={{ order: sampleOrder, loading: false, error: null }}
      />
    )
    expect(getByText(/Order No\. 101/)).toBeTruthy()
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

  it('shows delivery actions for in-progress delivery orders', () => {
    const { getByTestId } = renderDelivery(
      <OrderDetailsDelivery
        {...baseProps}
        order={{ order: { ...sampleOrder, status: 9 }, loading: false, error: null }}
      />
    )
    expect(getByTestId('float-Delivery Failed')).toBeTruthy()
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

  it('offers both pickup steps when the business marks a taken order as ready', () => {
    const { getByTestId, getByText, queryByTestId } = renderDelivery(
      <OrderDetailsDelivery
        {...baseProps}
        order={{
          order: {
            ...sampleOrder,
            status: 4,
            last_driver_assigned_at: '2026-07-27 19:41:30',
            reporting_data: {
              at: {
                'status:7': '2026-07-27 19:41:11',
                'status:8': '2026-07-27 19:41:30',
                'status:3': '2026-07-27 20:05:12'
              }
            }
          },
          loading: false,
          error: null
        }}
      />
    )
    expect(getByText('Arrived to bussiness')).toBeTruthy()
    expect(getByTestId('float-Pickup complete')).toBeTruthy()
    expect(queryByTestId('float-Accept')).toBeNull()
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
    expect(getByText('Arrived to bussiness')).toBeTruthy()
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
    fireEvent.press(getByTestId('float-Delivery Failed'))
    expect((await findAllByText('Delivery Failed')).length).toBeGreaterThan(0)
  })

  it('copies order details for non-pending orders', () => {
    const { getByTestId } = renderDelivery(
      <OrderDetailsDelivery
        {...baseProps}
        order={{ order: { ...sampleOrder, status: 7 }, loading: false, error: null }}
      />
    )
    fireEvent.press(getByTestId('mci-content-copy'))
    expect(Clipboard.setString).toHaveBeenCalled()
  })

  it('shows pending sync banner for unsynced orders', () => {
    const { getByText } = renderDelivery(
      <OrderDetailsDelivery
        {...baseProps}
        order={{ order: { ...sampleOrder, unsync: true }, loading: false, error: null }}
      />
    )
    expect(getByText('Pending sync changes')).toBeTruthy()
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
    fireEvent.press(getByTestId('float-Pickup complete'))
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
      fireEvent.press(getByTestId('float-Pickup complete'))
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
    fireEvent.press(getByTestId('float-Delivery complete'))
    await waitFor(() => expect(handleChangeOrderStatus).toHaveBeenCalled())
  })

  it('copies rich order details to clipboard', () => {
    const { getByTestId } = renderDelivery(
      <OrderDetailsDelivery
        {...baseProps}
        order={{ order: { ...richSampleOrder, status: 7 }, loading: false, error: null }}
      />
    )
    fireEvent.press(getByTestId('mci-content-copy'))
    expect(Clipboard.setString).toHaveBeenCalled()
  })

  it('handles logistic order reject', () => {
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
    fireEvent.press(getByTestId('float-Reject'))
    expect(handleClickLogisticOrder).toHaveBeenCalledWith(2, 55)
  })

  it('handles logistic order accept', () => {
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
    fireEvent.press(getByTestId('float-Accept'))
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
    fireEvent.press(getByTestId('float-Accept'))
    await waitFor(() => expect(handleChangeOrderStatus).toHaveBeenCalled())
  })

  it('navigates to order messages from header', () => {
    const navigate = jest.fn()
    const { getAllByTestId } = renderDelivery(
      <OrderDetailsDelivery
        {...baseProps}
        navigation={{ ...baseProps.navigation, navigate }}
        order={{ order: { ...sampleOrder, status: 7 }, loading: false, error: null }}
      />
    )
    const iconButtons = getAllByTestId('o-icon-button')
    fireEvent.press(iconButtons[iconButtons.length - 1])
    expect(navigate).toHaveBeenCalledWith(
      'OrderMessage',
      expect.objectContaining({ orderId: 101, business: true, driver: false })
    )
  })

  it('opens map modal when map icon is pressed', async () => {
    const { getAllByTestId, findByTestId } = renderDelivery(
      <OrderDetailsDelivery
        {...baseProps}
        order={{ order: orderWithLocations, loading: false, error: null }}
      />
    )
    fireEvent.press(getAllByTestId('o-icon-button')[1])
    expect(await findByTestId('driver-map-stub')).toBeTruthy()
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
})
