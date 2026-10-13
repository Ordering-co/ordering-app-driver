import React from 'react'
import { act, fireEvent, within } from '@testing-library/react-native'

import { useApi, useConfig } from '@components'

jest.mock('react-native-select-dropdown', () => {
  const React = require('react')
  const { View } = require('react-native')
  return () => React.createElement(View, { testID: 'select-dropdown' })
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

const mockFocusField = jest.fn()
const mockOtpProps: any[] = []

jest.mock('@twotalltotems/react-native-otp-input', () => {
  const React = require('react')
  const { TextInput } = require('react-native')
  return React.forwardRef((props: any, ref: any) => {
    mockOtpProps.push(props)
    React.useImperativeHandle(ref, () => ({ focusField: mockFocusField }))
    return React.createElement(TextInput, {
      testID: 'otp-input',
      value: props.code,
      onChangeText: (code: string) => props.onCodeChanged?.(code)
    })
  })
})

jest.mock('@ui', () => {
  const { buildD3OrdersUiMock } = require('../../../../../../jest/helpers/d3OrdersUiMock')
  return buildD3OrdersUiMock()
})

jest.mock('@components', () => require('../../../../../../jest/helpers/mockOrdering'))

import { AcceptOrRejectOrder } from '..'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { driverAppTitle, driverOrderTitle } from '../../../../../../jest/helpers/d3OrdersDefaults'

const SECURE_PROJECT = 'quickiedelivery'

const orderTitle = {
  ...driverOrderTitle,
  forceDelivery: { key: 'FORCED_MARK_ORDER_AS_DELIVERY', text: 'FORCED_MARK_ORDER_AS_DELIVERY', btnKey: 'MOBILE_DELIVERY_COMPLETE', btnText: 'Delivery Completed' },
  pickupComplete: { key: 'PICKUP_COMPLETE', text: 'Pickup complete', btnKey: 'PICKUP_COMPLETE', btnText: 'Pickup complete' },
  deliveryComplete: { key: 'DELIVERY_COMPLETE', text: 'Delivery complete', btnKey: 'DELIVERY_COMPLETE', btnText: 'Delivery complete' }
}

const renderModal = (props: any = {}) =>
  renderWithProviders(
    <AcceptOrRejectOrder
      isPage
      action="deliveryComplete"
      orderTitle={orderTitle}
      appTitle={driverAppTitle}
      customerCellphone="5551234"
      orderId={1234567}
      actions={{}}
      handleUpdateOrder={jest.fn()}
      closeModal={jest.fn()}
      {...props}
    />
  )

const pinField = (utils: any, orderId: number) =>
  within(utils.getByTestId(`security-pin-${orderId}`)).getByTestId('otp-input')

const pressConfirm = (utils: any) =>
  fireEvent.press(utils.getAllByText('Delivery complete').at(-1))

describe('AcceptOrRejectOrder · delivery security pin', () => {
  beforeEach(() => {
    const { offlineActionsState } = require('../../../../../../jest/helpers/d3OrdersUiMock')
    offlineActionsState.isNetConnected = true
    offlineActionsState.canSaveChangesOffline = false
    ;(useConfig as jest.Mock).mockReturnValue([{
      configs: { disable_delivery_priority: { value: '1' } }
    }])
    ;(useApi as jest.Mock).mockReturnValue([{ project: SECURE_PROJECT }])
    mockFocusField.mockClear()
    mockOtpProps.length = 0
  })

  it('asks for the pin when completing a delivery', () => {
    const { getByText } = renderModal()
    expect(getByText('Security code')).toBeTruthy()
    expect(getByText('Ask the customer for the delivery code')).toBeTruthy()
  })

  it('shows the visible prefix so the driver only fills the hidden digits', () => {
    const { getByText } = renderModal()
    expect(getByText('1')).toBeTruthy()
    expect(getByText('2')).toBeTruthy()
    expect(getByText('3')).toBeTruthy()
  })

  it('does not ask for the pin outside the secure projects', () => {
    ;(useApi as jest.Mock).mockReturnValue([{ project: 'a-project-without-secure-ids' }])
    const { queryByText } = renderModal()
    expect(queryByText('Security code')).toBeNull()
  })

  it('does not ask for the pin when the delivery failed', () => {
    const { queryByText } = renderModal({ action: 'deliveryFailed' })
    expect(queryByText('Security code')).toBeNull()
  })

  it('does not ask for the pin when picking up', () => {
    const { queryByText } = renderModal({ action: 'pickupComplete' })
    expect(queryByText('Security code')).toBeNull()
  })

  it('asks for the pin when the delivery is forced', () => {
    const { getByText } = renderModal({ action: 'forceDelivery' })
    expect(getByText('Security code')).toBeTruthy()
  })

  it('blocks the status change while the pin is empty', () => {
    const handleUpdateOrder = jest.fn()
    const utils = renderModal({ handleUpdateOrder })

    pressConfirm(utils)
    expect(handleUpdateOrder).not.toHaveBeenCalled()
  })

  it('blocks the status change when the pin is wrong', () => {
    const handleUpdateOrder = jest.fn()
    const utils = renderModal({ handleUpdateOrder })

    fireEvent.changeText(pinField(utils, 1234567), '4568')
    pressConfirm(utils)
    expect(handleUpdateOrder).not.toHaveBeenCalled()
  })

  it('surfaces an error once a wrong pin is complete', () => {
    const utils = renderModal()
    const { getByText } = utils

    fireEvent.changeText(pinField(utils, 1234567), '4568')
    expect(getByText('The code does not match')).toBeTruthy()
  })

  it('stays quiet while the pin is still being typed', () => {
    const utils = renderModal()
    const { queryByText } = utils

    fireEvent.changeText(pinField(utils, 1234567), '45')
    expect(queryByText('The code does not match')).toBeNull()
  })

  it('lets the status change through once the pin matches', () => {
    const handleUpdateOrder = jest.fn()
    const utils = renderModal({ handleUpdateOrder })

    fireEvent.changeText(pinField(utils, 1234567), '4567')
    pressConfirm(utils)
    expect(handleUpdateOrder).toHaveBeenCalled()
  })

  describe('grouped deliveries', () => {
    const groupProps = { orderId: 1234567, orderIds: [1234567, 1234568] }

    it('asks for one pin per order in the group', () => {
      const utils = renderModal(groupProps)
      expect(pinField(utils, 1234567)).toBeTruthy()
      expect(pinField(utils, 1234568)).toBeTruthy()
    })

    it('blocks the status change when only one pin matches', () => {
      const handleUpdateOrder = jest.fn()
      const utils = renderModal({ ...groupProps, handleUpdateOrder })

      fireEvent.changeText(pinField(utils, 1234567), '4567')
      pressConfirm(utils)
      expect(handleUpdateOrder).not.toHaveBeenCalled()
    })

    it('lets the status change through once every pin matches', () => {
      const handleUpdateOrder = jest.fn()
      const utils = renderModal({ ...groupProps, handleUpdateOrder })

      fireEvent.changeText(pinField(utils, 1234567), '4567')
      fireEvent.changeText(pinField(utils, 1234568), '4568')
      pressConfirm(utils)
      expect(handleUpdateOrder).toHaveBeenCalled()
    })
  })

  describe('soft keyboard', () => {
    const lastOtpProps = () => mockOtpProps[mockOtpProps.length - 1]

    it('never lets the library focus during mount', () => {
      renderModal()
      expect(lastOtpProps().autoFocusOnLoad).toBe(false)
    })

    it('asks the OS for a numeric keypad', () => {
      renderModal()
      expect(lastOtpProps().keyboardType).toBe('number-pad')
    })

    it('raises the keyboard once the modal window settled', () => {
      jest.useFakeTimers()
      try {
        renderModal()
        expect(mockFocusField).not.toHaveBeenCalled()
        act(() => { jest.advanceTimersByTime(500) })
        expect(mockFocusField).toHaveBeenCalledWith(0)
      } finally {
        jest.useRealTimers()
      }
    })

    it('does not steal focus while the evidence photo is still pending', () => {
      ;(useConfig as jest.Mock).mockReturnValue([{
        configs: {
          disable_delivery_priority: { value: '1' },
          states_requiring_image_driver: { value: '11' }
        }
      }])
      jest.useFakeTimers()
      try {
        renderModal()
        act(() => { jest.advanceTimersByTime(500) })
        expect(mockFocusField).not.toHaveBeenCalled()
      } finally {
        jest.useRealTimers()
      }
    })

    it('focuses only the first order of a grouped delivery', () => {
      jest.useFakeTimers()
      try {
        renderModal({ orderId: 1234567, orderIds: [1234567, 1234568] })
        act(() => { jest.advanceTimersByTime(500) })
        expect(mockFocusField).toHaveBeenCalledTimes(1)
      } finally {
        jest.useRealTimers()
      }
    })
  })
})
