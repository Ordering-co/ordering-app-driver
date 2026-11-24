import React from 'react'
import { act, fireEvent } from '@testing-library/react-native'

import { renderPage } from '../../../jest/helpers/renderPage'

jest.mock('@ui', () => require('../../../jest/helpers/mockUi'))

import AcceptOrRejectOrder from '../AcceptOrRejectOrder'

describe('AcceptOrRejectOrder', () => {
  it('renders accept/reject controller with route params', () => {
    const { getByTestId } = renderPage(AcceptOrRejectOrder, {
      route: {
        params: {
          action: 'accept',
          ids: [1, 2],
          order: { customer: { cellphone: '5551234' } },
          handleChangeOrderStatus: jest.fn()
        }
      }
    })
    expect(getByTestId('accept-or-reject-order')).toBeTruthy()
    expect(getByTestId('safe-area-container')).toBeTruthy()
  })

  it('gives the screen the customer\'s phone with its country code, so the call is dialled with it', () => {
    const { AcceptOrRejectOrder: Screen } = require('@ui')
    const { UNSAFE_getByType } = renderPage(AcceptOrRejectOrder, {
      route: { params: { action: 'reject', ids: [1], order: { customer: { cellphone: '6465550129', country_phone_code: '1' } } } }
    })
    expect(UNSAFE_getByType(Screen).props.customerCellphone).toBe('6465550129')
    expect(UNSAFE_getByType(Screen).props.customerCountryPhoneCode).toBe('1')
  })

  it('leaves the bottom inset to the screen\'s bottom bar: its background reaches the bottom of the screen (harmony H6)', () => {
    const { SafeAreaContainer, AcceptOrRejectOrder: Screen } = require('@ui')
    const { UNSAFE_getByType } = renderPage(AcceptOrRejectOrder, { route: { params: { action: 'accept', ids: [1] } } })
    expect(UNSAFE_getByType(SafeAreaContainer).props.edges).toEqual(['top', 'left', 'right'])
    expect(UNSAFE_getByType(Screen).props.isPage).toBe(true)
  })

  it('gives the screen the group it speaks for: its orders and its number', () => {
    const { AcceptOrRejectOrder: Screen } = require('@ui')
    const orders = [{ id: 1 }, { id: 2 }]
    const { UNSAFE_getByType } = renderPage(AcceptOrRejectOrder, {
      route: { params: { action: 'reject', ids: [1, 2], orders, groupId: 57, order: orders[0] } }
    })
    expect(UNSAFE_getByType(Screen).props.orders).toBe(orders)
    expect(UNSAFE_getByType(Screen).props.groupId).toBe(57)
  })

  it('stays on the screen when an order of the group did not change, and says how many and why', async () => {
    const { AcceptOrRejectOrder: Screen } = require('@ui')
    const handleChangeOrderStatus = jest.fn().mockResolvedValue([{ id: 1, result: {}, error: false }, { id: 2, result: ['Order not found'], error: true }])
    const { getByTestId, navigation, UNSAFE_getByType } = renderPage(AcceptOrRejectOrder, {
      route: { params: { ids: [1, 2], handleChangeOrderStatus } }
    })
    await act(async () => {
      fireEvent.press(getByTestId('accept-reject-update'))
    })
    expect(navigation.goBack).not.toHaveBeenCalled()
    expect(UNSAFE_getByType(Screen).props.orderError).toBe('Orders that did not change: 1 · Order not found')
  })

  it('a failed save keeps the screen with the API\'s words and the next tap sends only the order that failed', async () => {
    const { AcceptOrRejectOrder: Screen } = require('@ui')
    const handleChangeOrderStatus = jest.fn()
      .mockResolvedValueOnce([null, { id: 2, result: {}, error: false }])
      .mockResolvedValueOnce([{ id: 1, result: {}, error: false }])
    const { getByTestId, navigation, UNSAFE_getByType } = renderPage(AcceptOrRejectOrder, {
      route: { params: { ids: [1, 2], handleChangeOrderStatus } }
    })
    await act(async () => { fireEvent.press(getByTestId('accept-reject-update')) })
    expect(UNSAFE_getByType(Screen).props.orderError).toBe('Orders that did not change: 1')
    expect(navigation.goBack).not.toHaveBeenCalled()
    await act(async () => { fireEvent.press(getByTestId('accept-reject-update')) })
    expect(handleChangeOrderStatus.mock.calls[1][1]).toEqual([1])
    expect(navigation.goBack).toHaveBeenCalledTimes(1)
  })

  it('a request that throws keeps the screen, with its message', async () => {
    const { AcceptOrRejectOrder: Screen } = require('@ui')
    const handleChangeOrderStatus = jest.fn().mockRejectedValue(new Error('Network request failed'))
    const { getByTestId, navigation, UNSAFE_getByType } = renderPage(AcceptOrRejectOrder, {
      route: { params: { ids: [1], handleChangeOrderStatus } }
    })
    await act(async () => { fireEvent.press(getByTestId('accept-reject-update')) })
    expect(navigation.goBack).not.toHaveBeenCalled()
    expect(UNSAFE_getByType(Screen).props.orderError).toBe('Network request failed')
  })

  it('goes back after successful status update', async () => {
    const handleChangeOrderStatus = jest.fn().mockResolvedValue([1, 2])
    const { getByTestId, navigation } = renderPage(AcceptOrRejectOrder, {
      route: {
        params: {
          ids: [1, 2],
          handleChangeOrderStatus
        }
      }
    })
    await act(async () => {
      fireEvent.press(getByTestId('accept-reject-update'))
    })
    expect(handleChangeOrderStatus).toHaveBeenCalledWith('accept', [1, 2], { time: 15, status: 'accept' }, { withDetails: true })
    expect(navigation.goBack).toHaveBeenCalled()
  })

  it('closes modal via navigation goBack', () => {
    const { getByTestId, navigation } = renderPage(AcceptOrRejectOrder, {
      route: { params: { ids: [1] } }
    })
    fireEvent.press(getByTestId('accept-reject-close'))
    expect(navigation.goBack).toHaveBeenCalled()
  })
})
