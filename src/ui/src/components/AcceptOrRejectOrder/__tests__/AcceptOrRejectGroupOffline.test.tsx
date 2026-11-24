import '../../../../../../jest/helpers/uiModuleMocks'
import React from 'react'
import { act, fireEvent, waitFor } from '@testing-library/react-native'

import { useConfig } from '@components'

jest.mock('@ui', () => {
  const { pickUi } = require('../../../../../../jest/helpers/uiModuleMocks')
  const { buildD3OrdersUiMock } = require('../../../../../../jest/helpers/d3OrdersUiMock')
  return pickUi(buildD3OrdersUiMock(), ['useOfflineActions'])
})

jest.mock('@components', () => ({
  ...require('../../../../../../jest/helpers/mockOrdering'),
  useUtils: jest.fn(() => [{ optimizeImage: (url: string) => url, parsePrice: (value: number) => `$${Number(value ?? 0).toFixed(2)}` }]),
  FloatingButton: require('../../../../../../jest/helpers/d1ShellDefaults').renderUiController({})
}))

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: any) => children,
  SafeAreaView: ({ children }: any) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 })
}))

import { AcceptOrRejectOrder } from '..'
import { useGroupStatusUpdate } from '../../../hooks/useGroupStatusUpdate'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { driverAppTitle, driverOrderTitle } from '../../../../../../jest/helpers/d3OrdersDefaults'
import { offlineActionsFns, offlineActionsState } from '../../../../../../jest/helpers/d3OrdersUiMock'

const orders = [
  { id: 101, cart_group_id: 57, status: 3, customer_id: 11, customer: { id: 11, name: 'Ana' } },
  { id: 102, cart_group_id: 57, status: 3, customer_id: 11, customer: { id: 11, name: 'Ana' } }
]

/** The reason form of a group as its page wires it (`pages/AcceptOrRejectOrder`): the screen's hook gives the form its request. */
const GroupForm = ({ action, handleChangeOrderStatus, closeModal }: any) => {
  const { update, error } = useGroupStatusUpdate({ ids: orders.map((order) => order.id), orders, handleChangeOrderStatus })
  return (
    <AcceptOrRejectOrder
      isPage
      action={action}
      orderTitle={driverOrderTitle}
      appTitle={driverAppTitle}
      orderId={orders[0].id}
      order={orders[0]}
      orders={orders}
      groupId={57}
      actions={{ reject: 'rejectByDriver', pickupFailed: 'pickupFailedByDriver', deliveryFailed: 'deliveryFailedByDriver', notReady: 'orderNotReady' }}
      orderError={error}
      handleUpdateOrder={update}
      closeModal={closeModal}
    />
  )
}

describe('the reason form of a group, without a connection', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    offlineActionsState.isNetConnected = false
    offlineActionsState.canSaveChangesOffline = true
    offlineActionsFns.applyOffAction.mockReset().mockResolvedValue(true)
    offlineActionsFns.registerOffOrder.mockReset().mockResolvedValue(undefined)
    ;(useConfig as jest.Mock).mockReturnValue([{ configs: { disable_delivery_priority: { value: '1' } } }])
  })

  const cases: Array<[string, number]> = [['reject', 6], ['pickupFailed', 10], ['deliveryFailed', 12], ['notReady', 14]]

  it.each(cases)('%s: one change per order in one write, nothing sent, the orders registered as they will be, the form closes', async (action, status) => {
    const handleChangeOrderStatus = jest.fn()
    const closeModal = jest.fn()
    const screen = renderWithProviders(<GroupForm action={action} handleChangeOrderStatus={handleChangeOrderStatus} closeModal={closeModal} />)
    if (action === 'reject') fireEvent.press(screen.getByTestId('reject-reason-very_far_away'))
    fireEvent.changeText(screen.getByPlaceholderText('Please type your comments in here'), 'nobody home')
    await act(async () => { fireEvent.press(screen.getByTestId('order-action')) })
    await waitFor(() => expect(closeModal).toHaveBeenCalledTimes(1))

    expect(handleChangeOrderStatus).not.toHaveBeenCalled()
    expect(offlineActionsFns.applyOffAction).toHaveBeenCalledTimes(1)
    expect(offlineActionsFns.applyOffAction).toHaveBeenCalledWith([
      { event: 'evt_off_change_order_status', data: { orderId: 101, body: expect.objectContaining({ status, reasons: 'nobody home', id: 101 }) } },
      { event: 'evt_off_change_order_status', data: { orderId: 102, body: expect.objectContaining({ status, reasons: 'nobody home', id: 102 }) } }
    ])
    expect(offlineActionsFns.registerOffOrder).toHaveBeenCalledTimes(2)
    expect(offlineActionsFns.registerOffOrder).toHaveBeenCalledWith(expect.objectContaining({ id: 101, status, oldStatus: 3, unsync: true }))
    expect(offlineActionsFns.registerOffOrder).toHaveBeenCalledWith(expect.objectContaining({ id: 102, status, oldStatus: 3, unsync: true }))
  })
})
