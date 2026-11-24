import '../../../../../../jest/helpers/uiModuleMocks'
import React from 'react'
import { TextInput } from 'react-native'
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
  { id: 101, cart_group_id: 57, status: 0, customer_id: 11, customer: { id: 11, name: 'Ana' } },
  { id: 102, cart_group_id: 57, status: 0, customer_id: 11, customer: { id: 11, name: 'Ana' } }
]

const mockConfigs = (configs: any = {}) =>
  (useConfig as jest.Mock).mockReturnValue([{ configs: { disable_delivery_priority: { value: '1' }, ...configs } }])

/** The accept sheet of a group as its screen wires it (`useAcceptSheet`): the screen's hook gives the sheet its request. */
const GroupSheet = ({ handleChangeOrderStatus, closeModal, group = orders, ...rest }: any) => {
  const { update, error } = useGroupStatusUpdate({ ids: group.map((order: any) => order.id), orders: group, handleChangeOrderStatus })
  return (
    <AcceptOrRejectOrder
      action='accept'
      orderTitle={driverOrderTitle}
      appTitle={driverAppTitle}
      orderId={group[0].id}
      order={group[0]}
      orders={group}
      groupId={57}
      actions={{ accept: 'acceptByDriver' }}
      orderError={error}
      handleUpdateOrder={update}
      closeModal={closeModal}
      {...rest}
    />
  )
}

const press = async (screen: any, id: string) => { await act(async () => { fireEvent.press(screen.getByTestId(id)) }) }

describe('the delivery time the accept sheet sends', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    offlineActionsState.isNetConnected = true
    offlineActionsState.canSaveChangesOffline = false
    offlineActionsFns.applyOffAction.mockReset().mockResolvedValue(true)
    offlineActionsFns.registerOffOrder.mockReset().mockResolvedValue(undefined)
    mockConfigs()
  })

  describe('a group, online', () => {
    it('is one block of the sheet, and every order of the group gets the same minutes in one request', async () => {
      const handleChangeOrderStatus = jest.fn().mockResolvedValue([{ id: 101 }, { id: 102 }])
      const closeModal = jest.fn()
      const screen = renderWithProviders(<GroupSheet handleChangeOrderStatus={handleChangeOrderStatus} closeModal={closeModal} />)
      expect(screen.getAllByText('Delivery time')).toHaveLength(1)
      fireEvent.press(screen.getByTestId('delivery-time-preset-30'))
      await press(screen, 'delivery-time-plus')
      await press(screen, 'order-action')
      expect(handleChangeOrderStatus).toHaveBeenCalledTimes(1)
      expect(handleChangeOrderStatus).toHaveBeenCalledWith(8, [101, 102], expect.objectContaining({ status: 8, delivered_in: 35 }), { withDetails: true })
      expect(closeModal).not.toHaveBeenCalled()
    })

    it('settles a number typed in the group\'s sheet when Accept is tapped', async () => {
      const handleChangeOrderStatus = jest.fn().mockResolvedValue([{ id: 101 }, { id: 102 }])
      const screen = renderWithProviders(<GroupSheet handleChangeOrderStatus={handleChangeOrderStatus} closeModal={jest.fn()} />)
      fireEvent.press(screen.getByTestId('delivery-time-edit'))
      fireEvent.changeText(screen.getByTestId('delivery-time-input'), '75')
      await press(screen, 'order-action')
      expect(handleChangeOrderStatus).toHaveBeenCalledWith(8, [101, 102], expect.objectContaining({ delivered_in: 75 }), { withDetails: true })
    })

    it('sends the default, 20 minutes, when nothing is chosen, and never 0', async () => {
      const handleChangeOrderStatus = jest.fn().mockResolvedValue([{ id: 101 }, { id: 102 }])
      const screen = renderWithProviders(<GroupSheet handleChangeOrderStatus={handleChangeOrderStatus} closeModal={jest.fn()} />)
      await press(screen, 'order-action')
      expect(handleChangeOrderStatus.mock.calls[0][2].delivered_in).toBe(20)
    })

    it('waits for the next tap when the typed number had to be corrected, sending nothing', async () => {
      const handleChangeOrderStatus = jest.fn().mockResolvedValue([{ id: 101 }, { id: 102 }])
      const screen = renderWithProviders(<GroupSheet handleChangeOrderStatus={handleChangeOrderStatus} closeModal={jest.fn()} />)
      fireEvent.press(screen.getByTestId('delivery-time-edit'))
      fireEvent.changeText(screen.getByTestId('delivery-time-input'), '1')
      await press(screen, 'order-action')
      expect(handleChangeOrderStatus).not.toHaveBeenCalled()
      expect(screen.getByTestId('delivery-time').props.children).toBe('5 min')
      await press(screen, 'order-action')
      expect(handleChangeOrderStatus).toHaveBeenCalledWith(8, [101, 102], expect.objectContaining({ delivered_in: 5 }), { withDetails: true })
    })
  })

  describe('queued without a connection', () => {
    beforeEach(() => {
      offlineActionsState.isNetConnected = false
      offlineActionsState.canSaveChangesOffline = true
    })

    it('a single order: the body that waits carries the minutes, nothing is sent now', async () => {
      const handleUpdateOrder = jest.fn().mockResolvedValue({ id: 1 })
      const closeModal = jest.fn()
      const screen = renderWithProviders(
        <AcceptOrRejectOrder
          action='accept'
          orderTitle={driverOrderTitle}
          appTitle={driverAppTitle}
          orderId={1}
          order={{ id: 1, status: 0 }}
          actions={{ accept: 'acceptByDriver' }}
          handleUpdateOrder={handleUpdateOrder}
          closeModal={closeModal}
        />
      )
      fireEvent.press(screen.getByTestId('delivery-time-preset-45'))
      await press(screen, 'order-action')
      expect(offlineActionsFns.applyOffAction).toHaveBeenCalledWith([
        { event: 'evt_off_change_order_status', data: { orderId: 1, body: expect.objectContaining({ status: 8, delivered_in: 45, id: 1 }) } }
      ])
      expect(handleUpdateOrder).toHaveBeenCalledTimes(1)
      expect(handleUpdateOrder).toHaveBeenCalledWith(8, expect.objectContaining({ delivered_in: 45 }), expect.objectContaining({ dataToSave: expect.objectContaining({ status: 8, unsync: true }) }))
      expect(closeModal).toHaveBeenCalledTimes(1)
    })

    it('a number being typed is settled before it is queued', async () => {
      const handleUpdateOrder = jest.fn().mockResolvedValue({ id: 1 })
      const screen = renderWithProviders(
        <AcceptOrRejectOrder
          action='accept'
          orderTitle={driverOrderTitle}
          appTitle={driverAppTitle}
          orderId={1}
          order={{ id: 1, status: 0 }}
          actions={{ accept: 'acceptByDriver' }}
          handleUpdateOrder={handleUpdateOrder}
          closeModal={jest.fn()}
        />
      )
      fireEvent.press(screen.getByTestId('delivery-time-edit'))
      fireEvent.changeText(screen.getByTestId('delivery-time-input'), '33')
      await press(screen, 'order-action')
      expect(offlineActionsFns.applyOffAction).toHaveBeenCalledWith([
        { event: 'evt_off_change_order_status', data: { orderId: 1, body: expect.objectContaining({ delivered_in: 33 }) } }
      ])
    })

    it('a group: one change per order, each with the same minutes and its own id, in one write', async () => {
      const handleChangeOrderStatus = jest.fn()
      const closeModal = jest.fn()
      const screen = renderWithProviders(<GroupSheet handleChangeOrderStatus={handleChangeOrderStatus} closeModal={closeModal} />)
      await press(screen, 'delivery-time-minus')
      await press(screen, 'order-action')
      await waitFor(() => expect(closeModal).toHaveBeenCalledTimes(1))
      expect(handleChangeOrderStatus).not.toHaveBeenCalled()
      expect(offlineActionsFns.applyOffAction).toHaveBeenCalledTimes(1)
      expect(offlineActionsFns.applyOffAction).toHaveBeenCalledWith([
        { event: 'evt_off_change_order_status', data: { orderId: 101, body: expect.objectContaining({ status: 8, delivered_in: 15, id: 101 }) } },
        { event: 'evt_off_change_order_status', data: { orderId: 102, body: expect.objectContaining({ status: 8, delivered_in: 15, id: 102 }) } }
      ])
    })
  })

  describe('the delivery time of an accepted request (the sheet that only saves the time)', () => {
    it('hands the handler the minutes, with no status photo asked', async () => {
      mockConfigs({ states_requiring_image_driver: { value: '8' } })
      const handleChangeOrderStatus = jest.fn().mockResolvedValue([{ id: 101 }, { id: 102 }])
      const screen = renderWithProviders(<GroupSheet handleChangeOrderStatus={handleChangeOrderStatus} closeModal={jest.fn()} skipsStatusImage />)
      expect(screen.queryByTestId('status-image')).toBeNull()
      fireEvent.press(screen.getByTestId('delivery-time-preset-10'))
      await press(screen, 'order-action')
      expect(handleChangeOrderStatus.mock.calls[0][2].delivered_in).toBe(10)
    })
  })

  describe('what the sheet does not do any more', () => {
    it('never takes the focus on entering, on blur or after a delay, for a single order or a group', () => {
      jest.useFakeTimers()
      const focus = TextInput.prototype.focus as jest.Mock
      focus.mockClear()
      const screen = renderWithProviders(<GroupSheet handleChangeOrderStatus={jest.fn()} closeModal={jest.fn()} />)
      act(() => { jest.advanceTimersByTime(2000) })
      expect(screen.UNSAFE_queryAllByType(TextInput)).toHaveLength(0)
      expect(focus).not.toHaveBeenCalled()
      jest.useRealTimers()
    })
  })
})
