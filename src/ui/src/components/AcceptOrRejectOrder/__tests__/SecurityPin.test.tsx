import '../../../../../../jest/helpers/uiModuleMocks'
import React from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { TextInput } from 'react-native'
import { act, fireEvent } from '@testing-library/react-native'

import { useApi, useConfig } from '@components'

jest.mock('@ui', () => {
  const { pickUi } = require('../../../../../../jest/helpers/uiModuleMocks')
  const { buildD3OrdersUiMock } = require('../../../../../../jest/helpers/d3OrdersUiMock')
  return pickUi(buildD3OrdersUiMock(), ['useOfflineActions'])
})

// The bottom bar's controller: it hands its props to the UI (`FloatingButton`).
jest.mock('@components', () => ({
  ...require('../../../../../../jest/helpers/mockOrdering'),
  // The delivery sheet's recap of what the driver collects writes amounts.
  useUtils: jest.fn(() => [{ optimizeImage: (url: string) => url, parsePrice: (value: number) => `$${Number(value ?? 0).toFixed(2)}` }]),
  FloatingButton: require('../../../../../../jest/helpers/d1ShellDefaults').renderUiController({})
}))

import { AcceptOrRejectOrder } from '..'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { driverAppTitle, driverOrderTitle } from '../../../../../../jest/helpers/d3OrdersDefaults'

const ORDER = { id: 1234567, delivery_pin_status: 'requested' }
const SECOND_ORDER = { id: 1234568, delivery_pin_status: 'requested' }

const orderTitle = {
  ...driverOrderTitle,
  forceDelivery: { key: 'FORCED_MARK_ORDER_AS_DELIVERY', text: 'FORCED_MARK_ORDER_AS_DELIVERY', btnKey: 'MOBILE_DELIVERY_COMPLETE', btnText: 'Delivery Completed' },
  pickupComplete: { key: 'PICKUP_COMPLETE', text: 'Pickup complete', btnKey: 'PICKUP_COMPLETE', btnText: 'Pickup complete' },
  deliveryComplete: { key: 'DELIVERY_COMPLETE', text: 'Delivery complete', btnKey: 'DELIVERY_COMPLETE', btnText: 'Delivery complete' }
}

const mockConfigs = (configs: any = {}) =>
  (useConfig as jest.Mock).mockReturnValue([{
    configs: {
      disable_delivery_priority: { value: '1' },
      delivery_pin_enabled: { value: '1' },
      ...configs
    }
  }])

const renderModal = (props: any = {}) =>
  renderWithProviders(
    <AcceptOrRejectOrder
      isPage
      action="deliveryComplete"
      orderTitle={orderTitle}
      appTitle={driverAppTitle}
      customerCellphone="5551234"
      orderId={ORDER.id}
      order={ORDER}
      actions={{}}
      handleUpdateOrder={jest.fn()}
      closeModal={jest.fn()}
      {...props}
    />
  )

// The code entry (`OOtpInput`) types into one hidden field per order.
const pinField = (utils: any, orderId: number) =>
  utils.getByTestId(`security-pin-${orderId}-field`)

// The action's button, in the sheet of the delivery and on the screen of a forced delivery alike.
const pressConfirm = (utils: any) =>
  fireEvent.press(utils.getByTestId('order-action'))

describe('AcceptOrRejectOrder · delivery security pin', () => {
  beforeEach(async () => {
    const { offlineActionsState } = require('../../../../../../jest/helpers/d3OrdersUiMock')
    offlineActionsState.isNetConnected = true
    offlineActionsState.canSaveChangesOffline = false
    mockConfigs()
    await AsyncStorage.clear()
  })

  it('asks for the pin when completing a delivery', () => {
    const { getByText } = renderModal()
    expect(getByText('Security code')).toBeTruthy()
    expect(getByText('Ask the customer for the delivery code')).toBeTruthy()
  })

  describe('texts by their role (decision H7)', () => {
    const { StyleSheet } = require('react-native')
    const { defaultAppTheme } = require('../../../../../theme/engine')
    const theme = defaultAppTheme()
    const flat = (node: any) => StyleSheet.flatten(node.props.style)
    const field = theme.native.components.field.base

    it('labels the code as a field (14 and semibold), with its help under it in the muted small look (as the sheet board)', () => {
      const { getByText } = renderModal()
      const title = flat(getByText('Security code'))
      expect(title.fontSize).toBe(field.label.fontSize)
      expect(title.fontFamily).toBe(field.label.fontFamily)
      expect(title.color).toBe(field.label_color)
      const help = flat(getByText('Ask the customer for the delivery code'))
      expect(help.fontSize).toBe(theme.native.tokens.typography.body_sm.fontSize)
      expect(help.color).toBe(theme.native.tokens.color.text_muted)
    })

    it('centers the errors of the code under its centered entry, as the field\'s error', async () => {
      const handleUpdateOrder = jest.fn().mockResolvedValue(null)
      const utils = renderModal({ handleUpdateOrder, orderError: ['The delivery PIN does not match.'] })
      fireEvent.changeText(pinField(utils, ORDER.id), '9999')
      await act(async () => { pressConfirm(utils) })
      const error = flat(utils.getByTestId('order-action-error'))
      expect(error.fontSize).toBe(field.error.fontSize)
      expect(error.color).toBe(field.error_color)
      expect(error.textAlign).toBe('center')
    })

    it('centers a wrong code\'s error right under its entry', () => {
      mockConfigs({ delivery_pin_enabled: { value: '0' } })
      ;(useApi as jest.Mock).mockReturnValue([{ project: 'quickiedelivery' }])
      const utils = renderModal()
      fireEvent.changeText(pinField(utils, ORDER.id), '4568')
      const error = flat(utils.getByTestId(`security-pin-${ORDER.id}-error`))
      expect(error.color).toBe(field.error_color)
      expect(error.marginTop).toBe(field.message_gap)
      expect(error.textAlign).toBe('center')
      ;(useApi as jest.Mock).mockReturnValue([{ get: jest.fn(), post: jest.fn() }, {}])
    })

    it('centers the connection and the wait messages of the code too', () => {
      const { offlineActionsState } = require('../../../../../../jest/helpers/d3OrdersUiMock')
      offlineActionsState.isNetConnected = false
      const { getByText } = renderModal()
      const message = flat(getByText('You need an internet connection to validate the delivery code'))
      expect(message.color).toBe(field.error_color)
      expect(message.textAlign).toBe('center')
    })
  })

  it('does not show any digit of the order id', () => {
    const { queryByText } = renderModal()
    expect(queryByText('1')).toBeNull()
    expect(queryByText('123')).toBeNull()
  })

  it('does not ask for the pin when the setting is off', () => {
    mockConfigs({ delivery_pin_enabled: { value: '0' } })
    const { queryByText } = renderModal()
    expect(queryByText('Security code')).toBeNull()
  })

  it('does not ask for the pin when the order has none', () => {
    const { queryByText } = renderModal({ order: { id: ORDER.id, delivery_pin_status: null } })
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

  it('on the screen of a forced delivery, is off until the comment is written and the pin is complete, then sends both', async () => {
    const handleUpdateOrder = jest.fn()
    const utils = renderModal({ action: 'forceDelivery', actions: { forceDelivery: 'forceDelivery' }, handleUpdateOrder })
    const action = () => utils.getByTestId('order-action').props.accessibilityState.disabled
    expect(utils.getByTestId('order-bottom-bar')).toBeTruthy()
    fireEvent.changeText(pinField(utils, ORDER.id), '0427')
    expect(action()).toBe(true)
    fireEvent.changeText(utils.getByPlaceholderText('Please type your comments in here'), 'customer unreachable')
    expect(action()).toBe(false)
    await act(async () => { pressConfirm(utils) })
    expect(handleUpdateOrder).toHaveBeenCalledWith(
      11,
      expect.objectContaining({ status: 11, delivery_pin: '0427', reasons: 'customer unreachable' }),
      expect.objectContaining({ deliveryPins: { [ORDER.id]: '0427' } })
    )
  })

  it('blocks the status change while the pin is empty', () => {
    const handleUpdateOrder = jest.fn()
    const utils = renderModal({ handleUpdateOrder })

    pressConfirm(utils)
    expect(handleUpdateOrder).not.toHaveBeenCalled()
  })

  it('blocks the status change while the pin is incomplete', () => {
    const handleUpdateOrder = jest.fn()
    const utils = renderModal({ handleUpdateOrder })

    fireEvent.changeText(pinField(utils, ORDER.id), '042')
    pressConfirm(utils)
    expect(handleUpdateOrder).not.toHaveBeenCalled()
  })

  it('shows the server error inside the screen when the pin is rejected', async () => {
    const handleUpdateOrder = jest.fn().mockResolvedValue(null)
    const message = 'The delivery PIN does not match. Try again in 10 seconds.'
    const utils = renderModal({ handleUpdateOrder, orderError: [message] })

    fireEvent.changeText(pinField(utils, ORDER.id), '9999')
    await act(async () => { pressConfirm(utils) })
    expect(utils.getByText(message)).toBeTruthy()

    fireEvent.changeText(pinField(utils, ORDER.id), '999')
    expect(utils.queryByText(message)).toBeNull()
  })

  it('makes the driver wait the time the server asked for after a rejected pin', async () => {
    jest.useFakeTimers()
    try {
      const handleUpdateOrder = jest.fn().mockResolvedValue(null)
      const utils = renderModal({
        handleUpdateOrder,
        orderError: ['The delivery PIN does not match.'],
        orderErrorCodes: ['delivery_pin.invalid'],
        orderRetryAfter: 10
      })

      fireEvent.changeText(pinField(utils, ORDER.id), '9999')
      await act(async () => { pressConfirm(utils) })
      expect(utils.getByText('You can try again in 10 seconds')).toBeTruthy()
      expect(utils.getByText('The code does not match')).toBeTruthy()
      expect(utils.queryByText('The delivery PIN does not match.')).toBeNull()
      // The cause comes first and the wait it brought after it.
      const texts = JSON.stringify(utils.toJSON())
      expect(texts.indexOf('The code does not match')).toBeGreaterThan(-1)
      expect(texts.indexOf('The code does not match')).toBeLessThan(texts.indexOf('You can try again in'))

      fireEvent.changeText(pinField(utils, ORDER.id), '0427')
      await act(async () => { pressConfirm(utils) })
      expect(handleUpdateOrder).toHaveBeenCalledTimes(1)

      await act(async () => { jest.advanceTimersByTime(10000) })
      expect(utils.queryByText(/You can try again in/)).toBeNull()
      await act(async () => { pressConfirm(utils) })
      expect(handleUpdateOrder).toHaveBeenCalledTimes(2)
    } finally {
      jest.useRealTimers()
    }
  })

  it('leaves only the countdown when the attempt came during the wait', async () => {
    const handleUpdateOrder = jest.fn().mockResolvedValue(null)
    const message = 'Too many attempts. Try again in 7 seconds.'
    const utils = renderModal({
      handleUpdateOrder,
      orderError: [message],
      orderErrorCodes: ['delivery_pin.too_many_attempts'],
      orderRetryAfter: 7
    })

    fireEvent.changeText(pinField(utils, ORDER.id), '0427')
    await act(async () => { pressConfirm(utils) })
    expect(utils.getByText('You can try again in 7 seconds')).toBeTruthy()
    expect(utils.queryByText(message)).toBeNull()
  })

  it('does not make the driver wait for an error that is not about the pin', async () => {
    const handleUpdateOrder = jest.fn().mockResolvedValue(null)
    const utils = renderModal({
      handleUpdateOrder,
      orderError: ['Driver location is outdated.'],
      orderErrorCodes: ['location.outdated'],
      orderRetryAfter: null
    })

    fireEvent.changeText(pinField(utils, ORDER.id), '0427')
    await act(async () => { pressConfirm(utils) })
    expect(utils.queryByText(/You can try again in/)).toBeNull()
    await act(async () => { pressConfirm(utils) })
    expect(handleUpdateOrder).toHaveBeenCalledTimes(2)
  })

  it('does not touch the stored waits when the setting is off', async () => {
    mockConfigs({ delivery_pin_enabled: { value: '0' } })
    const getItem = jest.spyOn(AsyncStorage, 'getItem')
    renderModal()
    await act(async () => {})
    expect(getItem).not.toHaveBeenCalledWith('delivery_pin_retry_at')
    getItem.mockRestore()
  })

  it('does not make the driver wait once the pin went through', async () => {
    const handleUpdateOrder = jest.fn().mockResolvedValue({ id: ORDER.id, status: 11 })
    const utils = renderModal({ handleUpdateOrder })

    fireEvent.changeText(pinField(utils, ORDER.id), '0427')
    await act(async () => { pressConfirm(utils) })
    expect(utils.queryByText(/You can try again in/)).toBeNull()
  })

  it('only keeps the digits the driver types or pastes', () => {
    const utils = renderModal()

    fireEvent.changeText(pinField(utils, ORDER.id), '0a4-2')
    expect(pinField(utils, ORDER.id).props.value).toBe('042')
  })

  it('leaves checking the pin to the server', () => {
    const utils = renderModal()

    fireEvent.changeText(pinField(utils, ORDER.id), '9999')
    expect(utils.queryByText('The code does not match')).toBeNull()
  })

  describe('pin from the order id while the setting is off (quickiedelivery)', () => {
    const LEGACY_ORDER = { id: 1234567 }

    beforeEach(() => {
      mockConfigs({ delivery_pin_enabled: { value: '0' } })
      ;(useApi as jest.Mock).mockReturnValue([{ project: 'quickiedelivery' }])
    })

    afterEach(() => {
      (useApi as jest.Mock).mockReturnValue([{ get: jest.fn(), post: jest.fn() }, {}])
    })

    it('shows the visible digits of the id and asks for the hidden ones', () => {
      const utils = renderModal({ orderId: LEGACY_ORDER.id, order: LEGACY_ORDER })
      expect(utils.getByText('Security code')).toBeTruthy()
      // The digits the order gives, before the cells of the ones it asks for.
      expect(utils.getByText('123')).toBeTruthy()
      expect(pinField(utils, LEGACY_ORDER.id).props.maxLength).toBe(4)
    })

    it('blocks a wrong code on the phone', async () => {
      const handleUpdateOrder = jest.fn()
      const utils = renderModal({ orderId: LEGACY_ORDER.id, order: LEGACY_ORDER, handleUpdateOrder })

      fireEvent.changeText(pinField(utils, LEGACY_ORDER.id), '4568')
      expect(utils.getByText('The code does not match')).toBeTruthy()
      await act(async () => { pressConfirm(utils) })
      expect(handleUpdateOrder).not.toHaveBeenCalled()
    })

    it('completes the delivery without sending the code to the API', async () => {
      const handleUpdateOrder = jest.fn()
      const utils = renderModal({ orderId: LEGACY_ORDER.id, order: LEGACY_ORDER, handleUpdateOrder })

      fireEvent.changeText(pinField(utils, LEGACY_ORDER.id), '4567')
      await act(async () => { pressConfirm(utils) })
      expect(handleUpdateOrder).toHaveBeenCalledWith(
        11,
        expect.not.objectContaining({ delivery_pin: expect.anything() }),
        undefined
      )
    })

    it('still works without connection', async () => {
      const { offlineActionsState } = require('../../../../../../jest/helpers/d3OrdersUiMock')
      offlineActionsState.isNetConnected = false
      offlineActionsState.canSaveChangesOffline = true
      const handleUpdateOrder = jest.fn()
      const utils = renderModal({ orderId: LEGACY_ORDER.id, order: LEGACY_ORDER, handleUpdateOrder })

      expect(utils.queryByText('You need an internet connection to validate the delivery code')).toBeNull()
      fireEvent.changeText(pinField(utils, LEGACY_ORDER.id), '4567')
      await act(async () => { pressConfirm(utils) })
      expect(handleUpdateOrder).toHaveBeenCalled()
    })

    it('uses the pin from the API once the setting is on', () => {
      mockConfigs({ delivery_pin_enabled: { value: '1' } })
      const utils = renderModal({ orderId: LEGACY_ORDER.id, order: { ...LEGACY_ORDER, delivery_pin_status: 'requested' } })
      expect(utils.queryByText('123')).toBeNull()
      expect(utils.queryByText('1')).toBeNull()
      expect(utils.getByText('Security code')).toBeTruthy()
    })
  })

  describe('without connection', () => {
    beforeEach(() => {
      const { offlineActionsState } = require('../../../../../../jest/helpers/d3OrdersUiMock')
      offlineActionsState.isNetConnected = false
      offlineActionsState.canSaveChangesOffline = true
    })

    it('explains the pin needs a connection', () => {
      const { getByText } = renderModal()
      expect(getByText('You need an internet connection to validate the delivery code')).toBeTruthy()
    })

    it('does not queue the delivery', async () => {
      const handleUpdateOrder = jest.fn()
      const utils = renderModal({ handleUpdateOrder })

      fireEvent.changeText(pinField(utils, ORDER.id), '0427')
      await act(async () => { pressConfirm(utils) })
      expect(handleUpdateOrder).not.toHaveBeenCalled()
    })
  })

  it('sends the pin with the status change once it is complete', async () => {
    const handleUpdateOrder = jest.fn()
    const utils = renderModal({ handleUpdateOrder })

    fireEvent.changeText(pinField(utils, ORDER.id), '0427')
    await act(async () => { pressConfirm(utils) })
    expect(handleUpdateOrder).toHaveBeenCalledWith(
      11,
      expect.objectContaining({ status: 11, delivery_pin: '0427' }),
      expect.objectContaining({ deliveryPins: { [ORDER.id]: '0427' } })
    )
  })

  it('does not send a pin when none is required', async () => {
    mockConfigs({ delivery_pin_enabled: { value: '0' } })
    const handleUpdateOrder = jest.fn()
    const utils = renderModal({ handleUpdateOrder })

    await act(async () => { pressConfirm(utils) })
    expect(handleUpdateOrder).toHaveBeenCalledWith(11, expect.not.objectContaining({ delivery_pin: expect.anything() }), undefined)
  })

  describe('grouped deliveries', () => {
    const groupProps = { orderId: ORDER.id, orders: [ORDER, SECOND_ORDER] }

    it('asks for one pin per order in the group, labelled by order', () => {
      const utils = renderModal(groupProps)
      expect(pinField(utils, ORDER.id)).toBeTruthy()
      expect(pinField(utils, SECOND_ORDER.id)).toBeTruthy()
      expect(utils.getAllByText(/^Order No\./)).toHaveLength(2)
      // Each code is labelled with its order's number, as every screen writes it (decision H2).
      expect(utils.getByText(`Order No. ${ORDER.id}`)).toBeTruthy()
      expect(utils.getByText(`Order No. ${SECOND_ORDER.id}`)).toBeTruthy()
    })

    it('names each code entry with its order number for the screen reader, masked in a secure project', () => {
      const open = renderModal(groupProps)
      expect(open.getByLabelText(`Security code, Order No. ${ORDER.id}`)).toBeTruthy()
      open.unmount()
      ;(useApi as jest.Mock).mockReturnValue([{ project: 'quickiedelivery' }])
      const secure = renderModal(groupProps)
      expect(secure.getAllByText('Order No. 123****')).toHaveLength(2)
      expect(secure.getAllByLabelText('Security code, Order No. 123****')).toHaveLength(2)
      ;(useApi as jest.Mock).mockReturnValue([{ get: jest.fn(), post: jest.fn() }, {}])
    })

    it('only asks for the orders that have a pin', () => {
      const utils = renderModal({ ...groupProps, orders: [ORDER, { id: SECOND_ORDER.id, delivery_pin_status: null }] })
      expect(pinField(utils, ORDER.id)).toBeTruthy()
      expect(utils.queryByTestId(`security-pin-${SECOND_ORDER.id}`)).toBeNull()
    })

    it('blocks the status change while one pin is missing', () => {
      const handleUpdateOrder = jest.fn()
      const utils = renderModal({ ...groupProps, handleUpdateOrder })

      fireEvent.changeText(pinField(utils, ORDER.id), '0427')
      pressConfirm(utils)
      expect(handleUpdateOrder).not.toHaveBeenCalled()
    })

    it('makes the driver wait the longest time the server asked for in the group', async () => {
      const handleUpdateOrder = jest.fn(async (_status: any, _body: any, options: any) => {
        options.onStatusResponses([
          { id: ORDER.id, error: true, errorCodes: ['delivery_pin.invalid'], retryAfter: 15 },
          { id: SECOND_ORDER.id, error: false, result: { id: SECOND_ORDER.id } }
        ])
        return false
      })
      const utils = renderModal({ ...groupProps, handleUpdateOrder })

      fireEvent.changeText(pinField(utils, ORDER.id), '1111')
      fireEvent.changeText(pinField(utils, SECOND_ORDER.id), '9150')
      await act(async () => { pressConfirm(utils) })
      expect(utils.getByText('You can try again in 15 seconds')).toBeTruthy()
    })

    it('passes every pin through once they are all complete', async () => {
      const handleUpdateOrder = jest.fn()
      const utils = renderModal({ ...groupProps, handleUpdateOrder })

      fireEvent.changeText(pinField(utils, ORDER.id), '0427')
      fireEvent.changeText(pinField(utils, SECOND_ORDER.id), '9150')
      await act(async () => { pressConfirm(utils) })
      expect(handleUpdateOrder).toHaveBeenCalledWith(
        11,
        expect.anything(),
        expect.objectContaining({ deliveryPins: { [ORDER.id]: '0427', [SECOND_ORDER.id]: '9150' } })
      )
    })
  })

  describe('soft keyboard', () => {
    /** The focus of a text field (one mock for every field of a test) and the fields it was asked on. */
    const focus = TextInput.prototype.focus as jest.Mock
    const focusedFields = () => focus.mock.contexts.map((field: any) => field.props.testID)

    beforeEach(() => {
      focus.mockClear()
    })

    it('never focuses during mount', () => {
      const utils = renderModal()
      expect(pinField(utils, ORDER.id).props.autoFocus).toBeFalsy()
      expect(focus).not.toHaveBeenCalled()
    })

    it('asks the OS for a numeric keypad', () => {
      const utils = renderModal()
      expect(pinField(utils, ORDER.id).props.keyboardType).toBe('number-pad')
    })

    it('raises the keyboard once the modal window settled', () => {
      jest.useFakeTimers()
      try {
        renderModal()
        act(() => { jest.advanceTimersByTime(499) })
        expect(focus).not.toHaveBeenCalled()
        act(() => { jest.advanceTimersByTime(1) })
        expect(focusedFields()).toEqual([`security-pin-${ORDER.id}-field`])
      } finally {
        jest.useRealTimers()
      }
    })

    it('keeps the field and what was typed when the code takes the focus', () => {
      jest.useFakeTimers()
      try {
        const utils = renderModal()
        const field = pinField(utils, ORDER.id)
        fireEvent.changeText(field, '04')
        act(() => { jest.advanceTimersByTime(500) })
        expect(focusedFields()).toEqual([`security-pin-${ORDER.id}-field`])
        expect(pinField(utils, ORDER.id)).toBe(field)
        expect(pinField(utils, ORDER.id).props.value).toBe('04')
      } finally {
        jest.useRealTimers()
      }
    })

    it('does not steal focus while the evidence photo is still pending', () => {
      mockConfigs({ states_requiring_image_driver: { value: '11' } })
      jest.useFakeTimers()
      try {
        renderModal()
        act(() => { jest.advanceTimersByTime(500) })
        expect(focus).not.toHaveBeenCalled()
      } finally {
        jest.useRealTimers()
      }
    })

    it('focuses only the first order of a grouped delivery', () => {
      jest.useFakeTimers()
      try {
        renderModal({ orderId: ORDER.id, orders: [ORDER, SECOND_ORDER] })
        act(() => { jest.advanceTimersByTime(500) })
        expect(focusedFields()).toEqual([`security-pin-${ORDER.id}-field`])
      } finally {
        jest.useRealTimers()
      }
    })

    it('does not focus the code once the screen is gone', () => {
      jest.useFakeTimers()
      try {
        const utils = renderModal()
        utils.unmount()
        act(() => { jest.advanceTimersByTime(500) })
        expect(focus).not.toHaveBeenCalled()
      } finally {
        jest.useRealTimers()
      }
    })
  })
})
