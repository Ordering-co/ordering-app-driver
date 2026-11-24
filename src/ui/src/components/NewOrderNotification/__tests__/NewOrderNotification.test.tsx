import '../../../../../../jest/helpers/uiModuleMocks'
import React from 'react'
import { act, fireEvent, waitFor, within } from '@testing-library/react-native'
import { AppState, NativeModules } from 'react-native'
import SoundPlayer from 'react-native-sound-player'

import { useApi, useEvent, useSession, useToast, ToastType } from '@components'

jest.mock('react-native-sound-player', () => ({
  loadSoundFile: jest.fn(),
  play: jest.fn(),
  seek: jest.fn(),
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

jest.mock('../../../../../navigators/NavigationRef', () => ({
  navigate: jest.fn(),
  openChatOrderId: jest.fn(() => undefined),
  openOrdersTab: jest.fn(),
  openMessagesTab: jest.fn()
}))

import { NewOrderNotification } from '..'
import { navigate, openChatOrderId, openMessagesTab, openOrdersTab } from '../../../../../navigators/NavigationRef'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { freezeClock, restoreClock } from '../../../../../../jest/helpers/fakeClock'

// The last one registered: the emitter is shared, so a screen rendered after another one has its own listeners last.
const getHandler = (events: any, eventName: string) =>
  [...events.on.mock.calls].reverse().find((call: any[]) => call[0] === eventName)?.[1]

describe('NewOrderNotification', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn().mockResolvedValue({ ok: true })
    Object.defineProperty(AppState, 'currentState', { value: 'active', writable: true })
    NativeModules.RNSoundPlayer = { loadSoundFile: jest.fn() }
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
    const { findByText, queryByText, getByLabelText } = renderWithProviders(
      <NewOrderNotification orderStatus={[0, 7]} />
    )
    const [events] = (useEvent as jest.Mock).mock.results[0].value
    const orderHandler = getHandler(events, 'order_added_notification')
    await act(async () => {
      orderHandler?.({ status: 0, order_id: 99, id: 99 })
    })
    expect(await findByText('New order!!')).toBeTruthy()
    fireEvent.press(getByLabelText('Close'))
    expect(queryByText('New order!!')).toBeNull()
  })

  it('closes from the sheet\'s own close button, and from the system\'s back (decision H5)', async () => {
    const { Modal } = require('react-native')
    const { findByText, getByLabelText, queryByText, UNSAFE_getByType } = renderWithProviders(
      <NewOrderNotification orderStatus={[0, 7]} />
    )
    const [events] = (useEvent as jest.Mock).mock.results[0].value
    const open = () => act(async () => { getHandler(events, 'order_added_notification')?.({ status: 0, order_id: 99, id: 99 }) })
    await open()
    expect(await findByText('New order!!')).toBeTruthy()
    // The sheet's close button (the modal's `close` slot, 44 pt) and no navigation.
    fireEvent.press(getByLabelText('Close'))
    expect(queryByText('New order!!')).toBeNull()
    expect(navigate).not.toHaveBeenCalled()

    await open()
    expect(queryByText('New order!!')).toBeTruthy()
    await act(async () => { UNSAFE_getByType(Modal).props.onRequestClose() })
    expect(queryByText('New order!!')).toBeNull()
  })

  describe('"View order"', () => {
    const open = async (event: string, value: any, props: any = {}) => {
      const view = renderWithProviders(<NewOrderNotification orderStatus={[0, 7]} {...props} />)
      const [events] = (useEvent as jest.Mock).mock.results.at(-1).value
      await act(async () => { getHandler(events, event)?.(value) })
      return view
    }

    it('opens the order\'s details and closes the alert', async () => {
      const { findByText, queryByText } = await open('order_added_notification', { status: 0, order_id: 99, id: 99 })
      fireEvent.press(await findByText('View order'))
      // Opened the way a push notification opens an order: the details fetch it by its id.
      expect(navigate).toHaveBeenCalledWith('OrderDetails', { orderId: 99, isDriverNotification: true, isFromRoot: true })
      expect(queryByText('New order!!')).toBeNull()
    })

    it('is on every alert that is about an order: an update and the messages of an order too', async () => {
      const updated = await open('order_updated_notification', { status: 3, order_id: 77, id: 77 })
      fireEvent.press(await updated.findByText('View order'))
      expect(navigate).toHaveBeenLastCalledWith('OrderDetails', expect.objectContaining({ orderId: 77 }))
      updated.unmount()
      const messages = await open('message_added_notification', { status: 3, order_id: 55, order: { id: 55 } })
      fireEvent.press(await messages.findByText('View order'))
      expect(navigate).toHaveBeenLastCalledWith('OrderDetails', expect.objectContaining({ orderId: 55 }))
    })

    it('stops the sound and the vibration, as closing the alert does', async () => {
      const { Vibration } = require('react-native')
      const cancel = jest.spyOn(Vibration, 'cancel')
      const { findByText } = await open('order_added_notification', { status: 0, order_id: 99, id: 99 })
      fireEvent.press(await findByText('View order'))
      expect(cancel).toHaveBeenCalled()
      expect(SoundPlayer.stop).toHaveBeenCalled()
      cancel.mockRestore()
    })

    it('opens the assign requests\' tab for a request to take an order, which is not the driver\'s order yet', async () => {
      const onOpenRequests = jest.fn()
      const { findByText, queryByText } = await open('request_register_notification', { status: 0, order_id: 88, id: 88 }, { onOpenRequests })
      fireEvent.press(await findByText('View order'))
      expect(onOpenRequests).toHaveBeenCalledTimes(1)
      expect(navigate).not.toHaveBeenCalled()
      expect(queryByText('New order!!')).toBeNull()
    })

    it('has no button for a request when the project has no assign requests\' tab', async () => {
      const { findByText, queryByText } = await open('request_update_notification', { status: 0, order_id: 88, id: 88 })
      expect(await findByText('New orders have been updated!')).toBeTruthy()
      expect(queryByText('View order')).toBeNull()
    })

    it('opens the details of an order assigned to the driver on the spot, even through a request event', async () => {
      freezeClock(Date.parse('2026-01-01T00:00:02Z'))
      const onOpenRequests = jest.fn()
      const { findByText } = renderWithProviders(<NewOrderNotification orderStatus={[0, 7]} onOpenRequests={onOpenRequests} />)
      const [events] = (useEvent as jest.Mock).mock.results.at(-1).value
      // The driver's own order (`author_id`): only the quick assignment opens the alert.
      await act(async () => {
        getHandler(events, 'request_register_notification')?.({ driver: { id: 4 }, author_id: 1, status: 0, order_id: 88, id: 88, last_driver_assigned_at: '2026-01-01T00:00:00Z' })
      })
      fireEvent.press(await findByText('View order'))
      expect(navigate).toHaveBeenCalledWith('OrderDetails', expect.objectContaining({ orderId: 88 }))
      expect(onOpenRequests).not.toHaveBeenCalled()
    })

    // The author of the change is somebody else (a dispatcher assigns the order): the alert is not cut short, and the
    // request flag of the event must not turn the driver's own order into a request to take it.
    it.each(['request_register_notification', 'request_update_notification'])(
      'opens the details of an order assigned to the driver on the spot by somebody else, through %s',
      async (event) => {
        freezeClock(Date.parse('2026-01-01T00:00:02Z'))
        const onOpenRequests = jest.fn()
        const { findByText } = renderWithProviders(<NewOrderNotification orderStatus={[0, 7]} onOpenRequests={onOpenRequests} />)
        const [events] = (useEvent as jest.Mock).mock.results.at(-1).value
        await act(async () => {
          getHandler(events, event)?.({ driver: { id: 4 }, author_id: 9, status: 0, order_id: 88, id: 88, last_driver_assigned_at: '2026-01-01T00:00:00Z' })
        })
        fireEvent.press(await findByText('View order'))
        expect(navigate).toHaveBeenCalledWith('OrderDetails', expect.objectContaining({ orderId: 88 }))
        expect(onOpenRequests).not.toHaveBeenCalled()
      }
    )

    it('opens the details of an order that already carries the driver, through a request event', async () => {
      freezeClock(Date.parse('2026-01-01T01:00:00Z'))
      const onOpenRequests = jest.fn()
      const { findByText } = renderWithProviders(<NewOrderNotification orderStatus={[0, 7]} onOpenRequests={onOpenRequests} />)
      const [events] = (useEvent as jest.Mock).mock.results.at(-1).value
      await act(async () => {
        getHandler(events, 'request_update_notification')?.({ driver: { id: 1 }, author_id: 9, status: 0, order_id: 88, id: 88, last_driver_assigned_at: '2026-01-01T00:00:00Z' })
      })
      fireEvent.press(await findByText('View order'))
      expect(navigate).toHaveBeenCalledWith('OrderDetails', expect.objectContaining({ orderId: 88 }))
      expect(onOpenRequests).not.toHaveBeenCalled()
    })

    it('still opens the requests\' tab when the order carries another driver and was not assigned just now', async () => {
      freezeClock(Date.parse('2026-01-01T01:00:00Z'))
      const onOpenRequests = jest.fn()
      const { findByText } = renderWithProviders(<NewOrderNotification orderStatus={[0, 7]} onOpenRequests={onOpenRequests} />)
      const [events] = (useEvent as jest.Mock).mock.results.at(-1).value
      await act(async () => {
        getHandler(events, 'request_register_notification')?.({ driver: { id: 4 }, author_id: 9, status: 0, order_id: 88, id: 88, last_driver_assigned_at: '2026-01-01T00:00:00Z' })
      })
      fireEvent.press(await findByText('View order'))
      expect(onOpenRequests).toHaveBeenCalledTimes(1)
      expect(navigate).not.toHaveBeenCalled()
    })
  })

  describe('the alert\'s sound is the one the app bundles, never fetched', () => {
    const arrive = async () => {
      const view = renderWithProviders(<NewOrderNotification orderStatus={[0, 7]} />)
      const [events] = (useEvent as jest.Mock).mock.results[0].value
      await act(async () => { getHandler(events, 'order_added_notification')?.({ status: 0, order_id: 99, id: 99 }) })
      return view
    }
    afterEach(() => { jest.useRealTimers() })

    it('plays the bundled file once loaded, from its start, and fetches nothing: not from a URL, not over the network', async () => {
      await arrive()
      expect(SoundPlayer.loadSoundFile).toHaveBeenCalledTimes(1)
      expect(SoundPlayer.loadSoundFile).toHaveBeenCalledWith('order_sound_notification', 'caf')
      expect(SoundPlayer.seek).toHaveBeenCalledWith(0)
      expect(SoundPlayer.play).toHaveBeenCalledTimes(1)
      expect(SoundPlayer.playUrl).not.toHaveBeenCalled()
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('rings with no network at all', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network request failed'))
      await arrive()
      expect(SoundPlayer.play).toHaveBeenCalledTimes(1)
    })

    it('starts it again from its beginning every 2.5 s and never stops it between cycles: only the exit stops it', async () => {
      jest.useFakeTimers()
      const view = await arrive()
      ;(SoundPlayer.stop as jest.Mock).mockClear()
      act(() => { jest.advanceTimersByTime(2500 * 3) })
      expect(SoundPlayer.play).toHaveBeenCalledTimes(4)
      expect(SoundPlayer.seek).toHaveBeenCalledTimes(4)
      expect(SoundPlayer.stop).not.toHaveBeenCalled()
      // One load for the run, none per cycle.
      expect(SoundPlayer.loadSoundFile).toHaveBeenCalledTimes(1)
      fireEvent.press(view.getByLabelText('Close'))
      expect(SoundPlayer.stop).toHaveBeenCalledTimes(1)
      act(() => { jest.advanceTimersByTime(2500 * 3) })
      expect(SoundPlayer.play).toHaveBeenCalledTimes(4)
    })

    it('on Android it is the alarm player, given the bundled resource\'s URI, started again each cycle with no stop between', async () => {
      const { Platform } = require('react-native')
      jest.useFakeTimers()
      const replaced = jest.replaceProperty(Platform, 'OS', 'android')
      const alarm = { start: jest.fn(), stop: jest.fn(), release: jest.fn() }
      NativeModules.AlarmSound = alarm
      try {
        const view = await arrive()
        const uri = 'android.resource://co.ordering.delivery/raw/order_sound_notification'
        expect(alarm.start).toHaveBeenCalledWith(uri)
        act(() => { jest.advanceTimersByTime(2500 * 2) })
        expect(alarm.start).toHaveBeenCalledTimes(3)
        expect(alarm.stop).not.toHaveBeenCalled()
        expect(SoundPlayer.loadSoundFile).not.toHaveBeenCalled()
        fireEvent.press(view.getByLabelText('Close'))
        expect(alarm.stop).toHaveBeenCalledTimes(1)
      } finally {
        delete NativeModules.AlarmSound
        replaced.restore()
      }
    })

    it('on Android without the alarm module it plays the bundled .mp3 through the sound player', async () => {
      const { Platform } = require('react-native')
      const replaced = jest.replaceProperty(Platform, 'OS', 'android')
      try {
        await arrive()
        expect(SoundPlayer.loadSoundFile).toHaveBeenCalledWith('order_sound_notification', 'mp3')
        expect(SoundPlayer.play).toHaveBeenCalled()
      } finally {
        replaced.restore()
      }
    })
  })

  afterEach(() => restoreClock())

  it('shows quick-assign notification after driver location is posted', async () => {
    // The order was assigned to the driver 2 seconds ago.
    freezeClock(Date.parse('2026-01-01T00:00:02Z'))
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
  })

  describe('the quick assignment (assigned less than 5 seconds ago)', () => {
    // The driver's own order (`author_id`): only the quick assignment opens the alert.
    const register = async (clock: string, order: any = {}) => {
      freezeClock(Date.parse(clock))
      const screen = renderWithProviders(<NewOrderNotification orderStatus={[0, 7]} />)
      const [events] = (useEvent as jest.Mock).mock.results.at(-1).value
      await act(async () => {
        getHandler(events, 'request_register_notification')?.({
          driver: { id: 4 },
          author_id: 1,
          status: 0,
          order_id: 88,
          id: 88,
          last_driver_assigned_at: '2026-01-01T00:00:00Z',
          ...order
        })
      })
      return screen
    }

    it('opens the alert 4 seconds after the assignment, read as UTC', async () => {
      const { queryByText } = await register('2026-01-01T00:00:04Z')
      expect(queryByText('New order!!')).toBeTruthy()
    })

    it('does not open it from 5 seconds after, nor from a logistic assignment', async () => {
      expect((await register('2026-01-01T00:00:05Z')).queryByText('New order!!')).toBeNull()
      expect((await register('2026-01-01T00:01:00Z')).queryByText('New order!!')).toBeNull()
      expect((await register('2026-01-01T00:00:01Z', { logistic_status: 1 })).queryByText('New order!!')).toBeNull()
    })
  })

  describe('the alert of the driver\'s own order is never held by the position or the network', () => {
    const { useLocation } = require('@ui')
    const defaultLocation = (useLocation as jest.Mock).getMockImplementation()
    afterEach(() => { (useLocation as jest.Mock).mockImplementation(defaultLocation) })
    const withLocation = (getCurrentLocation: () => Promise<any>) => {
      ;(useLocation as jest.Mock).mockReturnValue({
        userLocation: undefined,
        getCurrentLocation: jest.fn(getCurrentLocation),
        followUserLocation: jest.fn(),
        stopFollowUserLocation: jest.fn()
      })
    }
    const ownOrder = async (view = renderWithProviders(<NewOrderNotification orderStatus={[0, 7]} />)) => {
      const [events] = (useEvent as jest.Mock).mock.results.at(-1).value
      await act(async () => {
        getHandler(events, 'request_register_notification')?.({
          driver: { id: 4 },
          author_id: 9,
          status: 0,
          order_id: 88,
          id: 88,
          last_driver_assigned_at: '2026-01-01T00:00:00Z'
        })
      })
      return view
    }

    it('gathers the alert at once while the position is still being read', async () => {
      withLocation(() => new Promise(() => {}))
      const { queryByText } = await ownOrder()
      expect(queryByText('New order!!')).toBeTruthy()
    })

    it('gathers the alert at once while the post is still on the way, and gives the post a time limit', async () => {
      withLocation(() => Promise.resolve({ latitude: 40.7128, longitude: -74.006, mocked: false }))
      global.fetch = jest.fn(() => new Promise(() => {})) as any
      const { queryByText } = await ownOrder()
      expect(queryByText('New order!!')).toBeTruthy()
      expect(global.fetch).toHaveBeenCalledWith('https://api.test/users/1/locations', expect.objectContaining({ signal: expect.any(Object) }))
    })

    it('gathers the alert when there is no position (no GPS) and tells the driver with the error kind first and the text second', async () => {
      withLocation(() => Promise.resolve(null))
      const { queryByText } = await ownOrder()
      expect(queryByText('New order!!')).toBeTruthy()
      const showToast = (useToast as jest.Mock).mock.results.at(-1)!.value[1].showToast
      await waitFor(() => expect(showToast).toHaveBeenCalledWith(ToastType.Error, 'Error updating coords'))
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('gathers the alert when the position fails or the post is refused', async () => {
      withLocation(() => Promise.reject(new Error('Location permission denied')))
      expect((await ownOrder()).queryByText('New order!!')).toBeTruthy()
      withLocation(() => Promise.resolve({ latitude: 1, longitude: 2 }))
      global.fetch = jest.fn().mockRejectedValue(new Error('Network request failed'))
      expect((await ownOrder(renderWithProviders(<NewOrderNotification orderStatus={[0, 7]} />))).queryAllByText('New order!!').length).toBeGreaterThan(0)
    })

    it('gives up on a position that never comes: the time limit ends the wait, and nothing is posted', async () => {
      jest.useFakeTimers()
      try {
        withLocation(() => new Promise(() => {}))
        await ownOrder()
        await act(async () => { jest.advanceTimersByTime(9000) })
        expect(global.fetch).not.toHaveBeenCalled()
      } finally {
        jest.useRealTimers()
      }
    })
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

  const openAlert = async (themeOverrides?: any) => {
    const view = renderWithProviders(<NewOrderNotification />, themeOverrides ? { themeOverrides } : undefined)
    const [events] = (useEvent as jest.Mock).mock.results[0].value
    await act(async () => {
      await getHandler(events, 'order_added_notification')({ id: 77 })
    })
    return view
  }

  it('draws no bundled picture: an icon in the theme\'s text color, at the alert\'s own icon size (28, as the board), in a round tint, while the theme serves none', async () => {
    const { defaultAppTheme } = require('../../../../../theme/engine')
    const { themeImage } = require('../../../../../theme/helpers')
    const { Image, StyleSheet } = require('react-native')
    const { within } = require('@testing-library/react-native')
    const theme = defaultAppTheme()
    expect(themeImage(theme, 'empty.new_order')).toBeUndefined()
    const { findByTestId, UNSAFE_queryAllByType, queryByTestId } = await openAlert()
    const box = await findByTestId('new-order-alert')
    expect(UNSAFE_queryAllByType(Image)).toHaveLength(0)
    expect(queryByTestId('new-order-image')).toBeNull()
    const glyph = within(box).getByTestId('new-order-icon')
    expect(glyph.props.name).toBe('notifications-outline')
    // Not the empty state\'s 40: the alert has its own (`new_order_alert.base.icon_size`).
    expect(glyph.props.size).toBe(theme.native.components.new_order_alert.base.icon_size)
    expect(glyph.props.size).toBe(28)
    expect(glyph.props.color).toBe(theme.native.tokens.color.primary_text)
    const tile = StyleSheet.flatten(glyph.parent.parent.parent.props.style)
    expect(tile.backgroundColor).toBe(theme.native.tokens.color.primary_subtle)
    expect(tile.borderRadius).toBe(theme.native.tokens.radius.full)
    // The circle is the theme's own size (56 by default, as the mockup), not a control height.
    expect(tile.width).toBe(theme.native.components.new_order_alert.base.icon_box_size)
    expect(tile.width).toBe(56)
    expect(tile.height).toBe(56)
    // The headline, the text and the button are there.
    expect(within(box).getByText('New order!!')).toBeTruthy()
    expect(within(box).getByText(/Order #77/)).toBeTruthy()
    expect(within(box).getByText('View order')).toBeTruthy()
  })

  it('writes the headline and the text in the alert\'s own look (`new_order_alert`), over the sheet\'s', async () => {
    const { defaultAppTheme } = require('../../../../../theme/engine')
    const { StyleSheet } = require('react-native')
    const alert = defaultAppTheme().native.components.new_order_alert.base
    const { findByText } = await openAlert()
    const title = StyleSheet.flatten((await findByText('New order!!')).props.style)
    expect(title.fontSize).toBe(alert.title.fontSize)
    expect(title.color).toBe(alert.title_color)
    const text = StyleSheet.flatten((await findByText(/Order #77/)).props.style)
    expect(text.fontSize).toBe(alert.text.fontSize)
    expect(text.color).toBe(alert.text_color)
  })

  it('takes the icon\'s size and color from the theme', async () => {
    const { buildAppTheme, THEME_PRODUCT_TYPE } = require('../../../../../theme/engine')
    const { within } = require('@testing-library/react-native')
    const custom = buildAppTheme({
      version: 2,
      product_type: THEME_PRODUCT_TYPE,
      values: {
        components: { new_order_alert: { base: { icon_size: 64 } } },
        tokens: { color: { primary_text: '#AA3300' } }
      }
    })
    const { findByTestId } = await openAlert(custom)
    const glyph = within(await findByTestId('new-order-alert')).getByTestId('new-order-icon')
    expect(glyph.props.size).toBe(64)
    expect(glyph.props.color).toBe('#AA3300')
  })

  it('paints the theme\'s illustration, at the alert\'s image size, instead of the icon when it serves one', async () => {
    const { buildAppTheme, defaultAppTheme, THEME_PRODUCT_TYPE } = require('../../../../../theme/engine')
    const { Image, StyleSheet } = require('react-native')
    const served = buildAppTheme({
      version: 2,
      product_type: THEME_PRODUCT_TYPE,
      values: { images: { 'empty.new_order': 'https://example.com/new-order.png' } }
    })
    const { findByTestId, UNSAFE_getByType, queryByTestId, getByText } = await openAlert(served)
    await findByTestId('new-order-alert')
    const image = UNSAFE_getByType(Image)
    expect(image.props.source).toEqual({ uri: 'https://example.com/new-order.png' })
    expect(StyleSheet.flatten(image.props.style).width).toBe(defaultAppTheme().native.components.new_order_alert.base.image_size)
    expect(queryByTestId('new-order-icon')).toBeNull()
    expect(getByText('View order')).toBeTruthy()
  })

  describe('the structure of the alert (the mockup: handle, one row, the button)', () => {
    it('is one row: the tile, the headline over the text, and the close button at its end; then the button', async () => {
      const { defaultAppTheme } = require('../../../../../theme/engine')
      const { StyleSheet } = require('react-native')
      const { within } = require('@testing-library/react-native')
      const alert = defaultAppTheme().native.components.new_order_alert.base
      const { findByTestId } = await openAlert()
      const box = await findByTestId('new-order-alert')
      const row = within(box).getByTestId('new-order-row')
      expect(StyleSheet.flatten(row.props.style).flexDirection).toBe('row')
      // Left to right: the tile, the text column, the close button.
      expect(row.children.map((child: any) => child.props.testID)).toEqual(['new-order-tile', 'new-order-copy', 'new-order-close'])
      // The headline and the text are stacked in the one column.
      const copy = within(box).getByTestId('new-order-copy')
      expect(within(copy).getByText('New order!!')).toBeTruthy()
      expect(within(copy).getByText(/Order #77/)).toBeTruthy()
      // The close button is in the row, not in a row of its own over it, and the action button is under the row.
      expect(within(within(box).getByTestId('new-order-close')).getByLabelText('Close')).toBeTruthy()
      expect(within(box).getAllByTestId(/^new-order-(row|view)$/).map((node: any) => node.props.testID)).toEqual(['new-order-row', 'new-order-view'])
      // The tile is the theme's own size (28 glyph in 56).
      expect(StyleSheet.flatten(within(box).getByTestId('new-order-tile').props.style).width).toBe(alert.icon_box_size)
    })

    it('lets a long headline wrap inside its column: the column shrinks, the tile and the close button never do', async () => {
      const { StyleSheet } = require('react-native')
      const { within } = require('@testing-library/react-native')
      const { findByTestId } = renderWithProviders(<NewOrderNotification />)
      const [events] = (useEvent as jest.Mock).mock.results.at(-1).value
      await act(async () => { getHandler(events, 'order_updated_notification')?.({ status: 3, order_id: 77, id: 77 }) })
      const box = await findByTestId('new-order-alert')
      const copy = StyleSheet.flatten(within(box).getByTestId('new-order-copy').props.style)
      expect(copy.flex).toBe(1)
      expect(copy.minWidth).toBe(0)
      expect(StyleSheet.flatten(within(box).getByTestId('new-order-tile').props.style).flexShrink).toBe(0)
      // The close button keeps its place at the top of the row.
      expect(StyleSheet.flatten(within(box).getByTestId('new-order-close').props.style).alignSelf).toBe('flex-start')
      expect(within(box).getByText('New orders have been updated!')).toBeTruthy()
    })
  })

  describe('what a request says', () => {
    const request = async (value: any, props: any = {}) => {
      const view = renderWithProviders(<NewOrderNotification onOpenRequests={jest.fn()} {...props} />)
      const [events] = (useEvent as jest.Mock).mock.results.at(-1).value
      await act(async () => { getHandler(events, 'request_register_notification')?.(value) })
      return view
    }

    it('names the order of a request for an order, never the request\'s own id', async () => {
      const { findByText, queryByText } = await request({ id: 52, order_id: 3504, order_group_id: null, locked: false })
      expect(await findByText('Order #3504 needs a driver.')).toBeTruthy()
      expect(queryByText(/#52/)).toBeNull()
    })

    it('names the group of a request for a group, with its orders when the packet says, never the request\'s id', async () => {
      const { findByText, queryByText } = await request({
        id: 52, order_id: null, order_group_id: 89, order_group: { id: 89, orders_count: 3 }, locked: false
      })
      expect(await findByText('Group No. 89 (3 orders) needs a driver.')).toBeTruthy()
      expect(queryByText(/52/)).toBeNull()
    })

    it('names the group alone when the packet has no count (and finds the group in its object too)', async () => {
      const { findByText } = await request({ id: 52, order_id: null, order_group: { id: 89 }, locked: false })
      expect(await findByText('Group No. 89 needs a driver.')).toBeTruthy()
    })

    it('says the group in the update of a request for a group too', async () => {
      const view = renderWithProviders(<NewOrderNotification onOpenRequests={jest.fn()} />)
      const [events] = (useEvent as jest.Mock).mock.results.at(-1).value
      await act(async () => {
        getHandler(events, 'request_update_notification')?.({ id: 52, order_id: null, order_group_id: 89, order_group: { id: 89, orders_count: 2 } })
      })
      expect(await view.findByText('Group No. 89 with 2 orders has been updated.')).toBeTruthy()
      expect(view.queryByText(/52/)).toBeNull()
    })

    it('lists a group by its own number among the requests', async () => {
      const view = renderWithProviders(<NewOrderNotification onOpenRequests={jest.fn()} />)
      const [events] = (useEvent as jest.Mock).mock.results.at(-1).value
      const emit = (value: any) => act(async () => { getHandler(events, 'request_register_notification')?.(value) })
      await emit({ id: 52, order_id: 3504 })
      await emit({ id: 53, order_id: null, order_group_id: 89, order_group: { id: 89, orders_count: 3 } })
      expect(await view.findByText('#3504, Group No. 89')).toBeTruthy()
    })
  })

  describe('a message of the chat that is on screen', () => {
    const message = async (orderId: number) => {
      const view = renderWithProviders(<NewOrderNotification orderStatus={[0, 7]} />)
      const [events] = (useEvent as jest.Mock).mock.results.at(-1).value
      await act(async () => { getHandler(events, 'message_added_notification')?.({ status: 3, order_id: orderId, order: { id: orderId } }) })
      return view
    }
    afterEach(() => (openChatOrderId as jest.Mock).mockReturnValue(undefined))

    it('opens no alert: it is read as it arrives', async () => {
      ;(openChatOrderId as jest.Mock).mockReturnValue(55)
      const { queryByTestId } = await message(55)
      expect(queryByTestId('new-order-alert')).toBeNull()
    })

    it('is told over any other screen, and over the chat of another order', async () => {
      expect((await message(55)).queryByText('New messages have been received!')).toBeTruthy()
      ;(openChatOrderId as jest.Mock).mockReturnValue(56)
      expect((await message(55)).queryAllByText('New messages have been received!').length).toBeGreaterThan(0)
    })
  })

  describe('several arrivals while the alert is open: one alert with the count', () => {
    const open = async (props: any = {}) => {
      const view = renderWithProviders(<NewOrderNotification orderStatus={[0, 7]} {...props} />)
      const [events] = (useEvent as jest.Mock).mock.results.at(-1).value
      const emit = (name: string, value: any) => act(async () => { getHandler(events, name)?.(value) })
      const order = (id: number, status = 4) => emit('order_added_notification', { id, status })
      return { ...view, emit, order }
    }

    it('keeps a single order as it is today: the title, its number and "View order" to its details', async () => {
      const { order, getByText, queryByTestId } = await open()
      await order(3504)
      expect(getByText('New order!!')).toBeTruthy()
      expect(getByText('Order #3504 has been assigned to you.')).toBeTruthy()
      expect(getByText('View order')).toBeTruthy()
      expect(queryByTestId('new-order-numbers')).toBeNull()
    })

    it('says "2 new orders" with the two numbers, newest last', async () => {
      const { order, getByText, getByTestId } = await open()
      await order(3504)
      await order(2876)
      expect(getByText('New orders!!')).toBeTruthy()
      expect(getByText('2 new orders')).toBeTruthy()
      expect(within(getByTestId('new-order-numbers')).getByText('#3504, #2876')).toBeTruthy()
      expect(getByText('View orders')).toBeTruthy()
    })

    it('lists exactly three numbers with no "more"', async () => {
      const { order, getByText, queryByText } = await open()
      for (const id of [3504, 2876, 3460]) await order(id)
      expect(getByText('3 new orders')).toBeTruthy()
      expect(getByText('#3504, #2876, #3460')).toBeTruthy()
      expect(queryByText(/more/)).toBeNull()
    })

    it('lists three numbers and "and 1 more" with four orders', async () => {
      const { order, getByText } = await open()
      for (const id of [3504, 2876, 3460, 3458]) await order(id)
      expect(getByText('4 new orders')).toBeTruthy()
      expect(getByText('#3504, #2876, #3460 and 1 more')).toBeTruthy()
    })

    it('lists three numbers and "and 9 more" with twelve orders', async () => {
      const { order, getByText } = await open()
      for (let id = 3500; id < 3512; id++) await order(id)
      expect(getByText('12 new orders')).toBeTruthy()
      expect(getByText('#3500, #3501, #3502 and 9 more')).toBeTruthy()
    })

    it('counts an order that arrives twice once', async () => {
      const { order, getByText } = await open()
      await order(3504)
      await order(3504)
      expect(getByText('New order!!')).toBeTruthy()
    })

    it('"View orders" takes the driver to the list the orders are in, closes the alert and opens no order', async () => {
      const { order, getByText, queryByTestId } = await open()
      await order(3504, 4)
      await order(2876, 4)
      fireEvent.press(getByText('View orders'))
      expect(openOrdersTab).toHaveBeenCalledWith('orders', 4)
      expect(navigate).not.toHaveBeenCalled()
      expect(queryByTestId('new-order-alert')).toBeNull()
    })

    it('masks the numbers as the rest of the app does', async () => {
      // A secure project writes an order's number with its last four digits hidden.
      const secure = [{ root: 'https://api.test', project: 'luisv4plus' }, {}]
      ;(useApi as jest.Mock).mockReturnValue(secure)
      const { order, getByText, getByTestId } = await open()
      await order(3504)
      expect(getByText('Order #**** has been assigned to you.')).toBeTruthy()
      await order(35041)
      expect(within(getByTestId('new-order-numbers')).getByText('#****, #3****')).toBeTruthy()
      ;(useApi as jest.Mock).mockReturnValue([{ root: 'https://api.test', ordering: { root: 'https://api.test' } }, {}])
    })

    it('gathers requests among themselves: "3 new requests" and a button to the requests\' tab', async () => {
      const onOpenRequests = jest.fn()
      const { emit, getByText, getByTestId } = await open({ onOpenRequests })
      for (const [id, order_id] of [[52, 3504], [53, 2876], [54, 3460]]) await emit('request_register_notification', { id, order_id })
      expect(getByText('New requests!!')).toBeTruthy()
      expect(getByText('3 new requests')).toBeTruthy()
      expect(within(getByTestId('new-order-numbers')).getByText('#3504, #2876, #3460')).toBeTruthy()
      fireEvent.press(getByText('View requests'))
      expect(onOpenRequests).toHaveBeenCalledTimes(1)
      expect(openOrdersTab).not.toHaveBeenCalled()
    })

    it('opens the requests\' tab by navigation when the project has it and the alert is not given another way', async () => {
      const { useConfig } = require('@components')
      ;(useConfig as jest.Mock).mockReturnValue([{ configs: { logistic_module: { value: true } } }])
      const { emit, getByText } = await open()
      await emit('request_register_notification', { id: 52, order_id: 3504 })
      fireEvent.press(getByText('View order'))
      expect(openOrdersTab).toHaveBeenCalledWith('requests')
      ;(useConfig as jest.Mock).mockReturnValue([{ configs: {} }])
    })

    it('gathers the updates of requests: the title of an update, "N requests have been updated."', async () => {
      const { emit, getByText } = await open({ onOpenRequests: jest.fn() })
      await emit('request_update_notification', { id: 52, order_id: 3504 })
      await emit('request_update_notification', { id: 53, order_id: 2876 })
      expect(getByText('New orders have been updated!')).toBeTruthy()
      expect(getByText('2 requests have been updated.')).toBeTruthy()
    })

    it('gathers messages of several orders: "2 orders have unread messages." and a button to the Messages tab', async () => {
      const { emit, getByText } = await open()
      await emit('message_added_notification', { order_id: 55, order: { id: 55 } })
      await emit('message_added_notification', { order_id: 56, order: { id: 56 } })
      expect(getByText('2 orders have unread messages.')).toBeTruthy()
      fireEvent.press(getByText('View messages'))
      expect(openMessagesTab).toHaveBeenCalledTimes(1)
    })

    describe('another kind arriving while one is open', () => {
      it('keeps the open kind\'s alert and count, and shows the other when the driver closes it: nothing is lost', async () => {
        const { order, emit, getByText, queryByText, getByLabelText } = await open()
        await order(3504)
        await order(2876)
        await emit('message_added_notification', { order_id: 55, order: { id: 55 } })
        // The orders' alert is still the open one, with its two.
        expect(getByText('2 new orders')).toBeTruthy()
        expect(queryByText('New messages have been received!')).toBeNull()
        // One close per kind.
        fireEvent.press(getByLabelText('Close'))
        expect(queryByText('2 new orders')).toBeNull()
        expect(getByText('New messages have been received!')).toBeTruthy()
        expect(getByText('Order #55 has unread messages.')).toBeTruthy()
        fireEvent.press(getByLabelText('Close'))
        expect(queryByText('New messages have been received!')).toBeNull()
      })

      it('shows the kinds in the order they arrived, each gathering what came for it meanwhile', async () => {
        const onOpenRequests = jest.fn()
        const { order, emit, getByText, queryByText, getByLabelText } = await open({ onOpenRequests })
        await order(3504)
        await emit('request_register_notification', { id: 52, order_id: 1001 })
        await emit('message_added_notification', { order_id: 55, order: { id: 55 } })
        await emit('request_register_notification', { id: 53, order_id: 1002 })
        await order(2876)
        expect(getByText('2 new orders')).toBeTruthy()
        fireEvent.press(getByLabelText('Close'))
        expect(getByText('2 new requests')).toBeTruthy()
        fireEvent.press(getByLabelText('Close'))
        expect(getByText('Order #55 has unread messages.')).toBeTruthy()
        fireEvent.press(getByLabelText('Close'))
        expect(queryByText('Order #55 has unread messages.')).toBeNull()
      })

      it('also opens the next kind after the button of the first', async () => {
        const { order, emit, getByText } = await open()
        await order(3504)
        await emit('message_added_notification', { order_id: 55, order: { id: 55 } })
        fireEvent.press(getByText('View order'))
        expect(navigate).toHaveBeenCalledWith('OrderDetails', expect.objectContaining({ orderId: 3504 }))
        expect(getByText('New messages have been received!')).toBeTruthy()
      })
    })

    describe('the sound and the vibration', () => {
      it('start again on each arrival and stop on close', async () => {
        const { Vibration } = require('react-native')
        const vibrate = jest.spyOn(Vibration, 'vibrate')
        const cancel = jest.spyOn(Vibration, 'cancel')
        const { order, getByLabelText } = await open()
        await order(3504)
        const afterFirst = vibrate.mock.calls.length
        expect(afterFirst).toBeGreaterThan(0)
        await order(2876)
        expect(vibrate.mock.calls.length).toBeGreaterThan(afterFirst)
        cancel.mockClear()
        ;(SoundPlayer.stop as jest.Mock).mockClear()
        fireEvent.press(getByLabelText('Close'))
        expect(cancel).toHaveBeenCalled()
        expect(SoundPlayer.stop).toHaveBeenCalled()
        vibrate.mockRestore()
        cancel.mockRestore()
      })
    })
  })
})
