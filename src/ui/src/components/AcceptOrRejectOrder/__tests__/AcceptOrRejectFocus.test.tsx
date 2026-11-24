import '../../../../../../jest/helpers/uiModuleMocks'
import React from 'react'
import { fireEvent, waitFor } from '@testing-library/react-native'

import { useApi, useConfig } from '@components'

jest.mock('@ui', () => {
  const { pickUi } = require('../../../../../../jest/helpers/uiModuleMocks')
  const { buildD3OrdersUiMock } = require('../../../../../../jest/helpers/d3OrdersUiMock')
  return pickUi(buildD3OrdersUiMock(), ['useOfflineActions'])
})

// The bottom bar's controller: it hands its props to the UI (`FloatingButton`).
jest.mock('@components', () => ({
  ...require('../../../../../../jest/helpers/mockOrdering'),
  FloatingButton: require('../../../../../../jest/helpers/d1ShellDefaults').renderUiController({})
}))

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: any) => children,
  SafeAreaView: ({ children }: any) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 })
}))

import { AcceptOrRejectOrder } from '..'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { driverAppTitle, driverOrderTitle } from '../../../../../../jest/helpers/d3OrdersDefaults'

const ORDER = { id: 1042, customer: { name: 'Ana', lastname: 'Torres' } }

const orderTitle = {
  ...driverOrderTitle,
  forceStatus: { key: 'REASON_REQUIRED', text: 'Reason required', btnKey: 'CONFIRM', btnText: 'Confirm' },
  forcePickUp: { key: 'FORCE_PICKUP', text: 'Force pickup', btnKey: 'CONFIRM', btnText: 'Confirm' },
  forceDelivery: { key: 'FORCE_DELIVERY', text: 'Force delivery', btnKey: 'CONFIRM', btnText: 'Confirm' }
}

const screenProps = (action: string, props: any = {}) => ({
  isPage: true,
  action,
  orderTitle,
  appTitle: driverAppTitle,
  customerCellphone: '5551234',
  orderId: ORDER.id,
  order: ORDER,
  actions: { reject: 'rejectByDriver', pickupFailed: 'pickupFailedByDriver', deliveryFailed: 'deliveryFailedByDriver', notReady: 'orderNotReady', forcePickUp: 'forcePickUp', forceDelivery: 'forceDelivery', forceStatus: 'forceStatus' },
  handleUpdateOrder: jest.fn(),
  closeModal: jest.fn(),
  ...props
})

const renderIn = (action: string, props: any = {}) =>
  renderWithProviders(<AcceptOrRejectOrder {...screenProps(action, props) as any} />)

describe('AcceptOrRejectOrder, the screens that keep the whole screen', () => {
  beforeEach(() => {
    const { offlineActionsState } = require('../../../../../../jest/helpers/d3OrdersUiMock')
    offlineActionsState.isNetConnected = true
    offlineActionsState.canSaveChangesOffline = false
    ;(useConfig as jest.Mock).mockReturnValue([{ configs: { disable_delivery_priority: { value: '1' } } }])
  })

  it.each([['reject'], ['pickupFailed'], ['deliveryFailed'], ['notReady']])('names the order and the customer under the title of the bar (%s)', (action) => {
    const screen = renderIn(action)
    expect(screen.getByText('Order No. 1042 · Ana Torres')).toBeTruthy()
  })

  it('names the order on the bar of a forced status too', () => {
    const screen = renderIn('forceStatus', { pendingStatusBody: { status: 3 } })
    expect(screen.getByText('Reason required')).toBeTruthy()
    expect(screen.getByText('Order No. 1042 · Ana Torres')).toBeTruthy()
  })

  it('writes only the number when the customer is not known, and the order\'s id from the screen when the order did not arrive', () => {
    const unknown = renderIn('deliveryFailed', { order: { id: 1042 } })
    expect(unknown.getByText('Order No. 1042')).toBeTruthy()
    unknown.unmount()
    const bare = renderIn('deliveryFailed', { order: undefined, orderId: 77 })
    expect(bare.getByText('Order No. 77')).toBeTruthy()
  })

  it('writes the customer\'s first name alone when there is no last name', () => {
    const screen = renderIn('deliveryFailed', { order: { id: 1042, customer: { name: 'Ana' } } })
    expect(screen.getByText('Order No. 1042 · Ana')).toBeTruthy()
  })

  it('writes nothing under the title when nothing is known of the order', () => {
    const screen = renderIn('deliveryFailed', { order: undefined, orderId: undefined })
    expect(screen.queryByText(/Order No/)).toBeNull()
  })

  it('writes the number as every bar does: masked in a secure project', () => {
    ;(useApi as jest.Mock).mockReturnValue([{ project: 'quickiedelivery' }])
    try {
      const screen = renderIn('deliveryFailed', { order: { id: 1234567, customer: { name: 'Ana' } } })
      expect(screen.getByText('Order No. 123**** · Ana')).toBeTruthy()
      expect(screen.queryByText(/1234567/)).toBeNull()
    } finally {
      ;(useApi as jest.Mock).mockReturnValue([{ get: jest.fn(), post: jest.fn() }, {}])
    }
  })

  it('asks "What happened?" over the reasons, not "Reject reasons"', () => {
    const screen = renderIn('deliveryFailed')
    expect(screen.getByText('What happened?')).toBeTruthy()
    expect(screen.queryByText('Reject reasons')).toBeNull()
    expect(screen.getByTestId('reject-reasons')).toBeTruthy()
  })

  it('puts a visible label "Comments" over the comment field', () => {
    const screen = renderIn('deliveryFailed')
    expect(screen.getByText('Comments')).toBeTruthy()
    const text = JSON.stringify(screen.toJSON())
    expect(text.indexOf('Comments')).toBeGreaterThanOrEqual(0)
    expect(text.indexOf('Comments')).toBeLessThan(text.indexOf('Please type your comments in here'))
  })

  it('labels the comment field of a forced status too, which has no reasons', () => {
    const screen = renderIn('forceStatus', { pendingStatusBody: { status: 3 } })
    expect(screen.getByText('Comments')).toBeTruthy()
    expect(screen.queryByText('What happened?')).toBeNull()
  })

  it('sends the chosen reason and the comment', async () => {
    const handleUpdateOrder = jest.fn().mockResolvedValue(undefined)
    const screen = renderIn('deliveryFailed', { handleUpdateOrder })
    fireEvent.press(screen.getByTestId('reject-reason-very_far_away'))
    fireEvent.changeText(screen.getByPlaceholderText('Please type your comments in here'), 'nobody home')
    fireEvent.press(screen.getAllByText('Delivery failed').pop()!)
    await waitFor(() => expect(handleUpdateOrder).toHaveBeenCalled())
    expect(handleUpdateOrder).toHaveBeenCalledWith(12, expect.objectContaining({ reject_reason: 'very_far_away', reasons: 'nobody home' }), undefined)
  })

  it.each([['reject'], ['pickupFailed'], ['deliveryFailed'], ['notReady'], ['forcePickUp'], ['forceDelivery'], ['forceStatus']])('is the whole screen, not a sheet, with its bar and its bottom bar (%s)', (action) => {
    const screen = renderIn(action, { pendingStatusBody: { status: 3 } })
    expect(screen.getByLabelText('Go back')).toBeTruthy()
    expect(screen.getByTestId('order-bottom-bar')).toBeTruthy()
    expect(screen.queryByTestId('order-sheet')).toBeNull()
  })

  it('goes back with the bar\'s arrow', () => {
    const closeModal = jest.fn()
    const screen = renderIn('deliveryFailed', { closeModal })
    fireEvent.press(screen.getByLabelText('Go back'))
    expect(closeModal).toHaveBeenCalledWith(false)
  })

  it.each([['reject'], ['pickupFailed'], ['deliveryFailed'], ['notReady'], ['forcePickUp'], ['forceDelivery']])('asks "What happened?" and for the comment, and the action is off until the comment is written (%s)', (action) => {
    const screen = renderIn(action)
    expect(screen.getByText('What happened?')).toBeTruthy()
    expect(screen.getByText('Comments')).toBeTruthy()
    expect(screen.getByTestId('order-action').props.accessibilityState.disabled).toBe(true)
    fireEvent.changeText(screen.getByPlaceholderText('Please type your comments in here'), '   ')
    expect(screen.getByTestId('order-action').props.accessibilityState.disabled).toBe(true)
    fireEvent.changeText(screen.getByPlaceholderText('Please type your comments in here'), 'nobody home')
    expect(screen.getByTestId('order-action').props.accessibilityState.disabled).toBe(false)
  })
})
