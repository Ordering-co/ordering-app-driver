import React from 'react'
import { fireEvent, waitFor } from '@testing-library/react-native'

import { useConfig } from '@components'

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

jest.mock('@ui', () => {
  const { buildD3OrdersUiMock } = require('../../../../../../jest/helpers/d3OrdersUiMock')
  return buildD3OrdersUiMock()
})

jest.mock('@components', () => require('../../../../../../jest/helpers/mockOrdering'))

import { AcceptOrRejectOrder } from '..'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { driverAppTitle, driverOrderTitle } from '../../../../../../jest/helpers/d3OrdersDefaults'

describe('AcceptOrRejectOrder', () => {
  beforeEach(() => {
    const { offlineActionsState } = require('../../../../../../jest/helpers/d3OrdersUiMock')
    offlineActionsState.isNetConnected = true
    offlineActionsState.canSaveChangesOffline = false
    ;(useConfig as jest.Mock).mockReturnValue([{
      configs: { disable_delivery_priority: { value: '1' } }
    }])
  })

  it('renders accept flow title and button', () => {
    const { getByText } = renderWithProviders(
      <AcceptOrRejectOrder
        isPage
        action="accept"
        orderTitle={driverOrderTitle}
        appTitle={driverAppTitle}
        customerCellphone="5551234"
        orderId={1}
        actions={{ accept: 'acceptByDriver' }}
        handleUpdateOrder={jest.fn()}
        closeModal={jest.fn()}
      />
    )
    expect(getByText('Delivery time')).toBeTruthy()
    expect(getByText('Accept')).toBeTruthy()
  })

  it('calls handleUpdateOrder on accept', () => {
    const handleUpdateOrder = jest.fn()
    const { getByText } = renderWithProviders(
      <AcceptOrRejectOrder
        isPage
        action="accept"
        orderTitle={driverOrderTitle}
        appTitle={driverAppTitle}
        customerCellphone="5551234"
        orderId={1}
        actions={{ accept: 'acceptByDriver' }}
        handleUpdateOrder={handleUpdateOrder}
        closeModal={jest.fn()}
      />
    )
    fireEvent.press(getByText('Accept'))
    expect(handleUpdateOrder).toHaveBeenCalled()
  })

  it('does not send a second mutation on double confirm', () => {
    const handleUpdateOrder = jest.fn()
    const { getByText } = renderWithProviders(
      <AcceptOrRejectOrder
        isPage
        action="accept"
        orderTitle={driverOrderTitle}
        appTitle={driverAppTitle}
        customerCellphone="5551234"
        orderId={1}
        actions={{ accept: 'acceptByDriver' }}
        handleUpdateOrder={handleUpdateOrder}
        closeModal={jest.fn()}
      />
    )
    fireEvent.press(getByText('Accept'))
    fireEvent.press(getByText('Accept'))
    expect(handleUpdateOrder).toHaveBeenCalledTimes(1)
  })

  it('renders reject note when rejecting', () => {
    const { getByText } = renderWithProviders(
      <AcceptOrRejectOrder
        isPage
        action="reject"
        orderTitle={driverOrderTitle}
        appTitle={driverAppTitle}
        customerCellphone="5551234"
        orderId={1}
        actions={{ reject: 'rejectByDriver' }}
        handleUpdateOrder={jest.fn()}
        closeModal={jest.fn()}
      />
    )
    expect(getByText('Reject Order')).toBeTruthy()
    expect(getByText(/Note/)).toBeTruthy()
  })

  it('renders not ready flow for driver app', () => {
    const { getAllByText } = renderWithProviders(
      <AcceptOrRejectOrder
        isPage
        action="notReady"
        orderTitle={driverOrderTitle}
        appTitle={driverAppTitle}
        customerCellphone="5551234"
        orderId={1}
        actions={{ notReady: 'orderNotReady' }}
        handleUpdateOrder={jest.fn()}
        closeModal={jest.fn()}
      />
    )
    expect(getAllByText('Order not ready').length).toBeGreaterThan(0)
  })

  it('renders delivery failed flow with note field', () => {
    const { getAllByText, getByPlaceholderText } = renderWithProviders(
      <AcceptOrRejectOrder
        isPage
        action="deliveryFailed"
        orderTitle={driverOrderTitle}
        appTitle={driverAppTitle}
        customerCellphone="5551234"
        orderId={1}
        actions={{ deliveryFailed: 'deliveryFailedByDriver' }}
        handleUpdateOrder={jest.fn()}
        closeModal={jest.fn()}
      />
    )
    expect(getAllByText('Delivery Failed').length).toBeGreaterThan(0)
    expect(getByPlaceholderText('Please type your comments in here')).toBeTruthy()
  })

  it('renders pickup failed flow with note field', () => {
    const { getAllByText, getByPlaceholderText } = renderWithProviders(
      <AcceptOrRejectOrder
        isPage
        action="pickupFailed"
        orderTitle={driverOrderTitle}
        appTitle={driverAppTitle}
        customerCellphone="5551234"
        orderId={1}
        actions={{ pickupFailed: 'pickupFailedByDriver' }}
        handleUpdateOrder={jest.fn()}
        closeModal={jest.fn()}
      />
    )
    expect(getAllByText('Pickup Failed').length).toBeGreaterThan(0)
    expect(getByPlaceholderText('Please type your comments in here')).toBeTruthy()
  })

  it('shows delivery priority step when enabled', () => {
    ;(useConfig as jest.Mock).mockReturnValue([{
      configs: { disable_delivery_priority: { value: '0' } }
    }])
    const { getByText } = renderWithProviders(
      <AcceptOrRejectOrder
        isPage
        action="accept"
        orderTitle={driverOrderTitle}
        appTitle={driverAppTitle}
        customerCellphone="5551234"
        orderId={1}
        order={{ status: 0 }}
        activeOrdersCount={2}
        actions={{ accept: 'acceptByDriver' }}
        handleUpdateOrder={jest.fn()}
        closeModal={jest.fn()}
      />
    )
    expect(getByText('Continue')).toBeTruthy()
    expect(getByText(/In which order will you deliver/)).toBeTruthy()
  })

  it('advances from priority step to timer on continue', () => {
    ;(useConfig as jest.Mock).mockReturnValue([{
      configs: { disable_delivery_priority: { value: '0' } }
    }])
    const { getByText, getByTestId } = renderWithProviders(
      <AcceptOrRejectOrder
        isPage
        action="accept"
        orderTitle={driverOrderTitle}
        appTitle={driverAppTitle}
        customerCellphone="5551234"
        orderId={1}
        order={{ status: 0 }}
        activeOrdersCount={2}
        actions={{ accept: 'acceptByDriver' }}
        handleUpdateOrder={jest.fn()}
        closeModal={jest.fn()}
      />
    )
    fireEvent.press(getByTestId('feather-plus'))
    fireEvent.press(getByText('Continue'))
    expect(getByText('Delivery time')).toBeTruthy()
  })

  it('renders force pickup flow with custom title', () => {
    const { getByText } = renderWithProviders(
      <AcceptOrRejectOrder
        isPage
        action="forcePickUp"
        orderTitle={{
          ...driverOrderTitle,
          forcePickUp: { key: 'FORCE_PICKUP', text: 'Force pickup', btnKey: 'CONFIRM', btnText: 'Confirm' }
        }}
        appTitle={driverAppTitle}
        customerCellphone="5551234"
        orderId={1}
        actions={{ forcePickUp: 'forcePickUp' }}
        handleUpdateOrder={jest.fn()}
        closeModal={jest.fn()}
      />
    )
    expect(getByText('Force pickup')).toBeTruthy()
    expect(getByText('Confirm')).toBeTruthy()
  })

  it('renders force delivery flow with note field', () => {
    const { getAllByText } = renderWithProviders(
      <AcceptOrRejectOrder
        isPage
        action="forceDelivery"
        orderTitle={{
          ...driverOrderTitle,
          forceDelivery: { key: 'FORCE_DELIVERY', text: 'Force delivery', btnKey: 'CONFIRM', btnText: 'Confirm' }
        }}
        appTitle={driverAppTitle}
        customerCellphone="5551234"
        orderId={1}
        actions={{ forceDelivery: 'forceDelivery' }}
        handleUpdateOrder={jest.fn()}
        closeModal={jest.fn()}
      />
    )
    expect(getAllByText('Force delivery').length).toBeGreaterThan(0)
  })

  it('shows customer phone on reject flow', () => {
    const { getByText } = renderWithProviders(
      <AcceptOrRejectOrder
        isPage
        action="reject"
        orderTitle={driverOrderTitle}
        appTitle={driverAppTitle}
        customerCellphone="5551234567"
        orderId={1}
        actions={{ reject: 'rejectByDriver' }}
        handleUpdateOrder={jest.fn()}
        closeModal={jest.fn()}
      />
    )
    expect(getByText('(555) 1234567')).toBeTruthy()
  })

  it('shows reject reasons dropdown for driver app', () => {
    const { getByTestId } = renderWithProviders(
      <AcceptOrRejectOrder
        isPage
        action="reject"
        orderTitle={driverOrderTitle}
        appTitle={driverAppTitle}
        customerCellphone="5551234"
        orderId={1}
        actions={{ reject: 'rejectByDriver' }}
        handleUpdateOrder={jest.fn()}
        closeModal={jest.fn()}
      />
    )
    expect(getByTestId('select-dropdown')).toBeTruthy()
  })

  it('submits reject with comments', async () => {
    const handleUpdateOrder = jest.fn().mockResolvedValue(undefined)
    const { getByText, getByPlaceholderText } = renderWithProviders(
      <AcceptOrRejectOrder
        isPage
        action="reject"
        orderTitle={driverOrderTitle}
        appTitle={driverAppTitle}
        customerCellphone="5551234"
        orderId={1}
        actions={{ reject: 'rejectByDriver' }}
        handleUpdateOrder={handleUpdateOrder}
        closeModal={jest.fn()}
      />
    )
    fireEvent.changeText(getByPlaceholderText('Please type your comments in here'), 'Too far')
    fireEvent.press(getByText('Reject'))
    await Promise.resolve()
    expect(handleUpdateOrder).toHaveBeenCalled()
  })

  it('decrements delivery priority with minus button', () => {
    ;(useConfig as jest.Mock).mockReturnValue([{
      configs: { disable_delivery_priority: { value: '0' } }
    }])
    const { getByText, getByTestId } = renderWithProviders(
      <AcceptOrRejectOrder
        isPage
        action="accept"
        orderTitle={driverOrderTitle}
        appTitle={driverAppTitle}
        customerCellphone="5551234"
        orderId={1}
        order={{ status: 0 }}
        activeOrdersCount={3}
        actions={{ accept: 'acceptByDriver' }}
        handleUpdateOrder={jest.fn()}
        closeModal={jest.fn()}
      />
    )
    fireEvent.press(getByTestId('feather-plus'))
    fireEvent.press(getByTestId('feather-plus'))
    expect(getByText(/Delivery #2/)).toBeTruthy()
    fireEvent.press(getByTestId('feather-minus'))
    expect(getByText(/Delivery #1/)).toBeTruthy()
  })

  it('submits force delivery with comments', async () => {
    const handleUpdateOrder = jest.fn().mockResolvedValue(undefined)
    const { getByText, getByPlaceholderText } = renderWithProviders(
      <AcceptOrRejectOrder
        isPage
        action="forceDelivery"
        orderTitle={{
          ...driverOrderTitle,
          forceDelivery: { key: 'FORCE_DELIVERY', text: 'Force delivery', btnKey: 'CONFIRM', btnText: 'Confirm' }
        }}
        appTitle={driverAppTitle}
        customerCellphone="5551234"
        orderId={1}
        actions={{ forceDelivery: 'forceDelivery' }}
        handleUpdateOrder={handleUpdateOrder}
        closeModal={jest.fn()}
      />
    )
    fireEvent.changeText(getByPlaceholderText('Please type your comments in here'), 'Customer unavailable')
    fireEvent.press(getByText('Confirm'))
    await Promise.resolve()
    expect(handleUpdateOrder).toHaveBeenCalled()
  })

  it('submits pickup failed with comments', async () => {
    const handleUpdateOrder = jest.fn().mockResolvedValue(undefined)
    const { getByPlaceholderText, getAllByText } = renderWithProviders(
      <AcceptOrRejectOrder
        isPage
        action="pickupFailed"
        orderTitle={driverOrderTitle}
        appTitle={driverAppTitle}
        customerCellphone="5551234"
        orderId={1}
        actions={{ pickupFailed: 'pickupFailedByDriver' }}
        handleUpdateOrder={handleUpdateOrder}
        closeModal={jest.fn()}
      />
    )
    fireEvent.changeText(getByPlaceholderText('Please type your comments in here'), 'Store closed')
    fireEvent.press(getAllByText('Pickup Failed').pop()!)
    await Promise.resolve()
    expect(handleUpdateOrder).toHaveBeenCalled()
  })

  it('submits order not ready with comments', async () => {
    const handleUpdateOrder = jest.fn().mockResolvedValue(undefined)
    const { getByPlaceholderText, getAllByText } = renderWithProviders(
      <AcceptOrRejectOrder
        isPage
        action="notReady"
        orderTitle={driverOrderTitle}
        appTitle={driverAppTitle}
        customerCellphone="5551234"
        orderId={1}
        actions={{ notReady: 'orderNotReady' }}
        handleUpdateOrder={handleUpdateOrder}
        closeModal={jest.fn()}
      />
    )
    fireEvent.changeText(getByPlaceholderText('Please type your comments in here'), 'Still preparing')
    fireEvent.press(getAllByText('Order not ready').pop()!)
    await Promise.resolve()
    expect(handleUpdateOrder).toHaveBeenCalled()
  })

  describe('forceStatus (order status regression)', () => {
    const forceStatusProps = {
      isPage: true,
      action: 'forceStatus',
      orderTitle: {
        ...driverOrderTitle,
        forceStatus: { key: 'REASON_REQUIRED', text: 'Reason required', btnKey: 'CONFIRM', btnText: 'Confirm' }
      },
      appTitle: driverAppTitle,
      customerCellphone: '5551234',
      orderId: 1,
      actions: { forceStatus: 'forceStatus' },
      pendingStatusBody: { status: 8, delivered_in: 15 },
      closeModal: jest.fn()
    }

    it('renders the title, the explanation and the reason field', () => {
      const { getByText, getByPlaceholderText } = renderWithProviders(
        <AcceptOrRejectOrder {...forceStatusProps} handleUpdateOrder={jest.fn()} />
      )
      expect(getByText('Reason required')).toBeTruthy()
      expect(getByText(/requires a reason/)).toBeTruthy()
      expect(getByPlaceholderText('Please type your comments in here')).toBeTruthy()
    })

    it('does not submit while the reason is empty or whitespace', async () => {
      const handleUpdateOrder = jest.fn()
      const { getByText, getByPlaceholderText } = renderWithProviders(
        <AcceptOrRejectOrder {...forceStatusProps} handleUpdateOrder={handleUpdateOrder} />
      )
      fireEvent.press(getByText('Confirm'))
      fireEvent.changeText(getByPlaceholderText('Please type your comments in here'), '   ')
      fireEvent.press(getByText('Confirm'))
      await Promise.resolve()
      expect(handleUpdateOrder).not.toHaveBeenCalled()
    })

    it('resends the pending body with the trimmed reason', async () => {
      const handleUpdateOrder = jest.fn()
      const { getByText, getByPlaceholderText } = renderWithProviders(
        <AcceptOrRejectOrder {...forceStatusProps} handleUpdateOrder={handleUpdateOrder} />
      )
      fireEvent.changeText(getByPlaceholderText('Please type your comments in here'), '  customer asked  ')
      fireEvent.press(getByText('Confirm'))
      await waitFor(() => expect(handleUpdateOrder).toHaveBeenCalled())
      expect(handleUpdateOrder).toHaveBeenCalledWith(
        8,
        expect.objectContaining({ status: 8, delivered_in: 15, reasons: 'customer asked', id: 1 }),
        undefined
      )
    })
  })
})
