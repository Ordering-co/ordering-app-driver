import React from 'react'
import { act, fireEvent } from '@testing-library/react-native'
import { AppState, NativeModules } from 'react-native'
import SoundPlayer from 'react-native-sound-player'

import { useApi, useEvent, useSession } from '@components'

jest.mock('moment', () => {
  let quickAssign = false
  const moment = (value?: string) => ({
    diff: () => (quickAssign ? 1 : 10),
    utc: () => moment(value)
  })
  moment.duration = () => ({ asSeconds: () => (quickAssign ? 2 : 10) })
  moment.utc = (value?: string) => moment(value)
  moment.__setQuickAssign = (value: boolean) => { quickAssign = value }
  return moment
})

jest.mock('react-native-sound-player', () => ({
  playUrl: jest.fn(),
  stop: jest.fn()
}))

jest.mock('@ui', () => {
  const { buildD3OrdersUiMock } = require('../../../../../../jest/helpers/d3OrdersUiMock')
  return buildD3OrdersUiMock()
})

jest.mock('@components', () => {
  const mockOrdering = require('../../../../../../jest/helpers/mockOrdering')
  const { renderUiController } = require('../../../../../../jest/helpers/d1ShellDefaults')
  const { newOrderNotificationDefaults } = require('../../../../../../jest/helpers/d3OrdersDefaults')
  return {
    ...mockOrdering,
    useEvent: jest.fn(() => [newOrderNotificationDefaults.events]),
    useSession: jest.fn(() => [{ user: { id: 1 }, token: 'token' }, {}]),
    useApi: jest.fn(() => [{ root: 'https://api.test', ordering: { root: 'https://api.test' } }, {}]),
    NewOrderNotification: renderUiController(newOrderNotificationDefaults)
  }
})

import { NewOrderNotification } from '..'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'

const getHandler = (events: any, eventName: string) =>
  events.on.mock.calls.find((call: any[]) => call[0] === eventName)?.[1]

describe('NewOrderNotification', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn().mockResolvedValue({ ok: true })
    Object.defineProperty(AppState, 'currentState', { value: 'active', writable: true })
    NativeModules.RNSoundPlayer = { playUrl: jest.fn() }
  })

  it('registers websocket notification listeners', () => {
    renderWithProviders(<NewOrderNotification />)
    const [events] = (useEvent as jest.Mock).mock.results[0].value
    expect(events.on).toHaveBeenCalledWith('message_added_notification', expect.any(Function))
    expect(events.on).toHaveBeenCalledWith('order_added_notification', expect.any(Function))
  })

  it('cleans up listeners on unmount', () => {
    const { unmount } = renderWithProviders(<NewOrderNotification />)
    const [events] = (useEvent as jest.Mock).mock.results[0].value
    unmount()
    expect(events.off).toHaveBeenCalled()
  })

  it('shows new order modal when order is added', async () => {
    const { findByText } = renderWithProviders(<NewOrderNotification orderStatus={[0, 7]} />)
    const [events] = (useEvent as jest.Mock).mock.results[0].value
    const orderHandler = getHandler(events, 'order_added_notification')
    await act(async () => {
      orderHandler?.({ status: 0, order_id: 99, id: 99 })
    })
    expect(await findByText('New order!!')).toBeTruthy()
    expect(await findByText(/Order #99/)).toBeTruthy()
  })

  it('shows message notification modal', async () => {
    const { findByText } = renderWithProviders(<NewOrderNotification orderStatus={[0, 7]} />)
    const [events] = (useEvent as jest.Mock).mock.results[0].value
    const messageHandler = getHandler(events, 'message_added_notification')
    await act(async () => {
      messageHandler?.({ status: 3, order_id: 55, order: { id: 55 } })
    })
    expect(await findByText('New messages have been received!')).toBeTruthy()
  })

  it('shows order updated notification modal', async () => {
    const { findByText } = renderWithProviders(<NewOrderNotification orderStatus={[0, 7]} />)
    const [events] = (useEvent as jest.Mock).mock.results[0].value
    const updateHandler = getHandler(events, 'order_updated_notification')
    await act(async () => {
      updateHandler?.({ status: 3, order_id: 77, id: 77 })
    })
    expect(await findByText('New orders have been updated!')).toBeTruthy()
  })

  it('closes notification modal when dismiss icon is pressed', async () => {
    const { findByText, queryByText, UNSAFE_getAllByType } = renderWithProviders(
      <NewOrderNotification orderStatus={[0, 7]} />
    )
    const [events] = (useEvent as jest.Mock).mock.results[0].value
    const orderHandler = getHandler(events, 'order_added_notification')
    await act(async () => {
      orderHandler?.({ status: 0, order_id: 99, id: 99 })
    })
    expect(await findByText('New order!!')).toBeTruthy()
    const { TouchableOpacity } = require('react-native')
    fireEvent.press(UNSAFE_getAllByType(TouchableOpacity)[0])
    expect(queryByText('New order!!')).toBeNull()
  })

  it('plays notification sound when modal is visible', async () => {
    renderWithProviders(<NewOrderNotification orderStatus={[0, 7]} />)
    const [events] = (useEvent as jest.Mock).mock.results[0].value
    const orderHandler = getHandler(events, 'order_added_notification')
    await act(async () => {
      orderHandler?.({ status: 0, order_id: 99, id: 99 })
    })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    expect(SoundPlayer.playUrl).toHaveBeenCalled()
  })

  it('ignores business order updates outside configured statuses', async () => {
    const { queryByText } = renderWithProviders(
      <NewOrderNotification isBusinessApp orderStatus={[0, 7]} />
    )
    const [events] = (useEvent as jest.Mock).mock.results[0].value
    const updateHandler = getHandler(events, 'order_updated_notification')
    await act(async () => {
      updateHandler?.({ status: 99, order_id: 77, id: 77, author_id: 2 })
    })
    expect(queryByText('New orders have been updated!')).toBeNull()
  })

  it('shows quick-assign notification after driver location is posted', async () => {
    const moment = require('moment')
    moment.__setQuickAssign(true)
    const { findByText } = renderWithProviders(<NewOrderNotification orderStatus={[0, 7]} />)
    const [events] = (useEvent as jest.Mock).mock.results[0].value
    const registerHandler = getHandler(events, 'request_register_notification')
    await act(async () => {
      registerHandler?.({
        driver: { id: 4 },
        status: 0,
        order_id: 88,
        id: 88,
        last_driver_assigned_at: '2026-01-01T00:00:00Z'
      })
    })
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.test/users/1/locations',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          location: JSON.stringify({
            lat: 40.7128,
            lng: -74.006,
            mock: false,
            v: '1.0'
          }),
          driver_id: 1
        }),
        headers: expect.objectContaining({
          Authorization: 'Bearer token'
        })
      })
    )
    expect(await findByText('New order!!')).toBeTruthy()
    moment.__setQuickAssign(false)
  })

  it('does not post driver location without a session token', async () => {
    ;(useSession as jest.Mock).mockReturnValueOnce([{ user: { id: 1 }, token: null }, {}])
    renderWithProviders(<NewOrderNotification orderStatus={[0, 7]} />)
    const [events] = (useEvent as jest.Mock).mock.results.at(-1).value
    const registerHandler = getHandler(events, 'request_register_notification')
    await act(async () => {
      registerHandler?.({
        driver: { id: 4 },
        status: 0,
        order_id: 88,
        id: 88
      })
    })
    expect(global.fetch).not.toHaveBeenCalled()
  })
})
