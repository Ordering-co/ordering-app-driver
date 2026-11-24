import '../../../../../../jest/helpers/uiModuleMocks'
import React from 'react'
import { Keyboard, ScrollView, StyleSheet, TextInput, Modal, TouchableWithoutFeedback } from 'react-native'
import { act, fireEvent, waitFor, within } from '@testing-library/react-native'

import { useConfig, useEvent } from '@components'

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

// The camera: the driver takes a photo as soon as the tile is tapped.
jest.mock('react-native-image-picker', () => ({
  launchCamera: jest.fn((_options: any, callback: any) =>
    callback({ assets: [{ uri: 'file:///photo.jpg', type: 'image/jpeg', fileName: 'photo.jpg' }] }))
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
import { defaultAppTheme } from '../../../../../theme/engine'

const theme = defaultAppTheme()
const button = theme.native.components.button

const orderTitle = {
  ...driverOrderTitle,
  arrivedToBusiness: { key: 'ARRIVED_TO_BUSINESS', text: 'Arrived to business', btnKey: 'ARRIVED_TO_BUSINESS', btnText: 'Arrived to business' },
  pickupComplete: { key: 'PICKUP_COMPLETE', text: 'Pickup complete', btnKey: 'PICKUP_COMPLETE', btnText: 'Pickup complete' },
  deliveryComplete: { key: 'DELIVERY_COMPLETE', text: 'Delivery complete', btnKey: 'DELIVERY_COMPLETE', btnText: 'Delivery complete' }
}

const mockConfigs = (configs: any = {}) =>
  (useConfig as jest.Mock).mockReturnValue([{
    configs: { disable_delivery_priority: { value: '1' }, ...configs }
  }])

const sheetProps = (action: string, props: any = {}) => ({
  action,
  orderTitle,
  appTitle: driverAppTitle,
  customerCellphone: '5551234',
  orderId: 1,
  actions: { accept: 'acceptByDriver' },
  handleUpdateOrder: jest.fn(),
  closeModal: jest.fn(),
  ...props
})

/** The sheet over the order: no page and no modal of the caller around it. */
const renderSheet = (action: string, props: any = {}) =>
  renderWithProviders(<AcceptOrRejectOrder {...sheetProps(action, props) as any} />)

const isDisabled = (screen: any) => screen.getByTestId('order-action').props.accessibilityState.disabled
const withPosition = () => mockConfigs({ disable_delivery_priority: { value: '0' } })
const pinField = (screen: any, orderId: number) => screen.getByTestId(`security-pin-${orderId}-field`)

/** The painted box of the action's button (the view that carries the size's height). */
const paintedBox = (screen: any) => StyleSheet.flatten(screen.getByTestId('order-action').findAll((node: any) =>
  typeof node.type === 'string' && StyleSheet.flatten(node.props.style)?.minHeight !== undefined)[0].props.style)

describe('AcceptOrRejectOrder as a sheet', () => {
  beforeEach(() => {
    const { offlineActionsState } = require('../../../../../../jest/helpers/d3OrdersUiMock')
    offlineActionsState.isNetConnected = true
    offlineActionsState.canSaveChangesOffline = false
    mockConfigs()
  })

  describe('what it is', () => {
    it.each([['accept'], ['arrivedToBusiness'], ['pickupComplete'], ['deliveryComplete']])('is the app\'s sheet with the action\'s title and its close button (%s), not the screen', (action) => {
      const screen = renderSheet(action)
      const title = orderTitle[action as keyof typeof orderTitle].text
      expect(screen.getByTestId('order-sheet')).toBeTruthy()
      expect(screen.getAllByText(title).length).toBeGreaterThan(0)
      expect(screen.getByLabelText('Close')).toBeTruthy()
      // None of the screen's pieces: its bar, its back arrow, its bottom bar and its scroll.
      expect(screen.queryByLabelText('Go back')).toBeNull()
      expect(screen.queryByTestId('order-bottom-bar')).toBeNull()
      expect(screen.UNSAFE_queryByType(ScrollView)).toBeNull()
    })

    it('has the action\'s button at its end, with the test id the bottom bar\'s had', () => {
      const screen = renderSheet('pickupComplete')
      expect(screen.getByTestId('order-action')).toBeTruthy()
      expect(within(screen.getByTestId('order-action')).getByText('Pickup complete')).toBeTruthy()
    })

    it('paints the action as the bottom bar does: accept success, arriving the screen\'s action, in the bar\'s size', () => {
      const accept = renderSheet('accept')
      expect(paintedBox(accept).backgroundColor).toBe(button.variants.success.solid.background)
      expect(paintedBox(accept).minHeight).toBe(button.sizes.lg.height)
      accept.unmount()
      const arrived = renderSheet('arrivedToBusiness')
      expect(paintedBox(arrived).backgroundColor).toBe(button.variants.primary.solid.background)
    })
  })

  describe('closing', () => {
    it('closes with its close button and with the system\'s back, as the screen\'s arrow does', () => {
      const closeModal = jest.fn()
      const screen = renderSheet('pickupComplete', { closeModal })
      fireEvent.press(screen.getByLabelText('Close'))
      expect(closeModal).toHaveBeenLastCalledWith(false)
      fireEvent(screen.UNSAFE_getAllByType(Modal)[0], 'requestClose')
      expect(closeModal).toHaveBeenCalledTimes(2)
    })

    it('closes from the accept sheet whatever was chosen: there is no step to go back to', () => {
      withPosition()
      const closeModal = jest.fn()
      const screen = renderSheet('accept', { closeModal, order: { status: 0 }, activeOrdersCount: 2 })
      fireEvent.press(screen.getByLabelText('Increase'))
      fireEvent.press(screen.getByLabelText('Close'))
      expect(closeModal).toHaveBeenCalledWith(false)
      expect(screen.getByText('Delivery position')).toBeTruthy()
    })
  })

  describe('accept', () => {
    const accept = (props: any = {}) => renderSheet('accept', { order: { status: 0 }, activeOrdersCount: 2, ...props })

    it('has the position and the time on one view, the time under a divider', () => {
      withPosition()
      const screen = accept()
      expect(screen.getByText('Delivery position')).toBeTruthy()
      expect(screen.getByText('In which order will you deliver this order?')).toBeTruthy()
      expect(screen.getByTestId('delivery-priority-stepper')).toBeTruthy()
      // The sheet's title names the action; "Delivery time" is the block under the divider only.
      expect(screen.getByText('Accept order')).toBeTruthy()
      expect(screen.getAllByText('Delivery time')).toHaveLength(1)
      expect(screen.getByTestId('delivery-time-block')).toBeTruthy()
      expect(screen.getByText('Accept')).toBeTruthy()
      // The screen's two steps are one: there is no "Continue".
      expect(screen.queryByText('Continue')).toBeNull()
    })

    it('has only the time when the position is not asked (the setting turns it off)', () => {
      mockConfigs({ disable_delivery_priority: { value: '1' } })
      const screen = accept()
      expect(screen.queryByText('Delivery position')).toBeNull()
      expect(screen.queryByTestId('delivery-priority-stepper')).toBeNull()
      expect(screen.getByTestId('delivery-time-block')).toBeTruthy()
    })

    it('is off until a position is chosen, and nothing is sent while it is', () => {
      withPosition()
      const handleUpdateOrder = jest.fn()
      const screen = accept({ handleUpdateOrder })
      expect(isDisabled(screen)).toBe(true)
      fireEvent.press(screen.getByTestId('order-action'))
      expect(handleUpdateOrder).not.toHaveBeenCalled()
      fireEvent.press(screen.getByLabelText('Increase'))
      expect(isDisabled(screen)).toBe(false)
    })

    it('does not go around the rule with the keyboard: Done only settles the typing, it never sends, with or without a position', () => {
      withPosition()
      const handleUpdateOrder = jest.fn()
      const screen = accept({ handleUpdateOrder })
      fireEvent.press(screen.getByTestId('delivery-time-edit'))
      fireEvent.changeText(screen.getByTestId('delivery-time-input'), '40')
      fireEvent(screen.getByTestId('delivery-time-input'), 'submitEditing')
      expect(screen.getByTestId('delivery-time').props.children).toBe('40 min')
      expect(handleUpdateOrder).not.toHaveBeenCalled()
      // With the position chosen the action is on, and Done still sends nothing.
      fireEvent.press(screen.getByLabelText('Increase'))
      fireEvent.press(screen.getByTestId('delivery-time-edit'))
      fireEvent(screen.getByTestId('delivery-time-input'), 'submitEditing')
      expect(handleUpdateOrder).not.toHaveBeenCalled()
    })

    it('is on at once when no position is asked', () => {
      mockConfigs({ disable_delivery_priority: { value: '1' } })
      const screen = accept()
      expect(isDisabled(screen)).toBe(false)
    })

    it('sends the position and the typed time, in minutes', async () => {
      withPosition()
      const handleUpdateOrder = jest.fn().mockResolvedValue(undefined)
      const screen = accept({ handleUpdateOrder })
      fireEvent.press(screen.getByLabelText('Increase'))
      fireEvent.press(screen.getByLabelText('Increase'))
      fireEvent.press(screen.getByTestId('delivery-time-edit'))
      fireEvent.changeText(screen.getByTestId('delivery-time-input'), '90')
      fireEvent(screen.getByTestId('delivery-time-input'), 'submitEditing')
      expect(screen.getByTestId('delivery-time').props.children).toBe('90 min')
      await act(async () => { fireEvent.press(screen.getByTestId('order-action')) })
      expect(handleUpdateOrder).toHaveBeenCalledWith(
        8,
        expect.objectContaining({ id: 1, status: 8, delivered_in: 90, delivery_position: 2 }),
        undefined
      )
    })

    it('sends the time of the stepper and of a preset, in minutes', async () => {
      mockConfigs({ disable_delivery_priority: { value: '1' } })
      const handleUpdateOrder = jest.fn().mockResolvedValue(undefined)
      const screen = accept({ handleUpdateOrder })
      fireEvent.press(screen.getByTestId('delivery-time-preset-45'))
      fireEvent.press(screen.getByTestId('delivery-time-plus'))
      fireEvent.press(screen.getByTestId('delivery-time-plus'))
      await act(async () => { fireEvent.press(screen.getByTestId('order-action')) })
      expect(handleUpdateOrder).toHaveBeenCalledWith(8, expect.objectContaining({ delivered_in: 55 }), undefined)
    })

    it('settles a number still being typed when Accept is tapped, and sends it with that one tap', async () => {
      mockConfigs({ disable_delivery_priority: { value: '1' } })
      const handleUpdateOrder = jest.fn().mockResolvedValue(undefined)
      const screen = accept({ handleUpdateOrder })
      fireEvent.press(screen.getByTestId('delivery-time-edit'))
      fireEvent.changeText(screen.getByTestId('delivery-time-input'), '25')
      await act(async () => { fireEvent.press(screen.getByTestId('order-action')) })
      expect(handleUpdateOrder).toHaveBeenCalledTimes(1)
      expect(handleUpdateOrder).toHaveBeenCalledWith(8, expect.objectContaining({ delivered_in: 25 }), undefined)
      expect(screen.queryByTestId('delivery-time-input')).toBeNull()
    })

    it('shows the corrected time and waits for the next tap when the typed number had to be brought to a limit', async () => {
      mockConfigs({ disable_delivery_priority: { value: '1' } })
      const handleUpdateOrder = jest.fn().mockResolvedValue(undefined)
      const screen = accept({ handleUpdateOrder })
      fireEvent.press(screen.getByTestId('delivery-time-edit'))
      fireEvent.changeText(screen.getByTestId('delivery-time-input'), '999')
      await act(async () => { fireEvent.press(screen.getByTestId('order-action')) })
      expect(handleUpdateOrder).not.toHaveBeenCalled()
      expect(screen.getByTestId('delivery-time').props.children).toBe('180 min')
      await act(async () => { fireEvent.press(screen.getByTestId('order-action')) })
      expect(handleUpdateOrder).toHaveBeenCalledTimes(1)
      expect(handleUpdateOrder).toHaveBeenCalledWith(8, expect.objectContaining({ delivered_in: 180 }), undefined)
    })

    it('sends 20 minutes of delivery time when none is chosen: the default, with its preset selected', async () => {
      mockConfigs({ disable_delivery_priority: { value: '1' } })
      const handleUpdateOrder = jest.fn().mockResolvedValue(undefined)
      const screen = accept({ handleUpdateOrder })
      expect(screen.getByTestId('delivery-time').props.children).toBe('20 min')
      expect(screen.getByTestId('delivery-time-preset-20').props.accessibilityState.selected).toBe(true)
      await act(async () => { fireEvent.press(screen.getByTestId('order-action')) })
      expect(handleUpdateOrder).toHaveBeenCalledWith(8, expect.objectContaining({ id: 1, status: 8, delivered_in: 20 }), undefined)
    })

    it('ends a number being typed when the position is chosen: the time keeps what was typed', () => {
      withPosition()
      const screen = accept()
      fireEvent.press(screen.getByTestId('delivery-time-edit'))
      fireEvent.changeText(screen.getByTestId('delivery-time-input'), '35')
      fireEvent.press(screen.getByLabelText('Increase'))
      expect(screen.queryByTestId('delivery-time-input')).toBeNull()
      expect(screen.getByTestId('delivery-time').props.children).toBe('35 min')
    })

    describe('a tap that is neither on the field nor on a control ends the typing, as Done does', () => {
      /** A tap on a part of the sheet that no control answers: the touch is released on it (the sheet's blank parts claim it). */
      const tapBlank = (node: any) => fireEvent(node, 'responderRelease')
      const typing = (props: any = {}, text = '35') => {
        mockConfigs({ disable_delivery_priority: { value: '1' } })
        const screen = accept(props)
        fireEvent.press(screen.getByTestId('delivery-time-edit'))
        fireEvent.changeText(screen.getByTestId('delivery-time-input'), text)
        return screen
      }
      afterEach(() => { jest.restoreAllMocks() })

      it('the label, the title row and the sheet\'s padding: a valid number is kept, the keyboard goes away', () => {
        const dismiss = jest.spyOn(Keyboard, 'dismiss')
        for (const blank of [
          (screen: any) => screen.getByText('Delivery time'),
          (screen: any) => screen.getByText('Accept order'),
          (screen: any) => screen.getByTestId('sheet-handle', { includeHiddenElements: true }),
          (screen: any) => screen.getByTestId('sheet-body')
        ]) {
          dismiss.mockClear()
          const screen = typing()
          tapBlank(blank(screen))
          expect(screen.queryByTestId('delivery-time-input')).toBeNull()
          expect(screen.getByTestId('delivery-time').props.children).toBe('35 min')
          expect(dismiss).toHaveBeenCalledTimes(1)
          screen.unmount()
        }
      })

      it('an empty field restores the previous value, as Done does', () => {
        const screen = typing({}, '')
        tapBlank(screen.getByText('Delivery time'))
        expect(screen.queryByTestId('delivery-time-input')).toBeNull()
        expect(screen.getByTestId('delivery-time').props.children).toBe('20 min')
      })

      it('a number outside 5 to 180 is brought to the nearest limit and shown, and nothing is sent', () => {
        const handleUpdateOrder = jest.fn()
        const screen = typing({ handleUpdateOrder }, '999')
        tapBlank(screen.getByText('Delivery time'))
        expect(screen.getByTestId('delivery-time').props.children).toBe('180 min')
        expect(handleUpdateOrder).not.toHaveBeenCalled()
      })

      it('the number typed is what Accept sends after it, with one tap', async () => {
        const handleUpdateOrder = jest.fn().mockResolvedValue(undefined)
        const screen = typing({ handleUpdateOrder }, '25')
        tapBlank(screen.getByText('Delivery time'))
        await act(async () => { fireEvent.press(screen.getByTestId('order-action')) })
        expect(handleUpdateOrder).toHaveBeenCalledTimes(1)
        expect(handleUpdateOrder).toHaveBeenCalledWith(8, expect.objectContaining({ delivered_in: 25 }), undefined)
      })

      it('with nothing being typed it does nothing: no keyboard to put away, the sheet stays', () => {
        const dismiss = jest.spyOn(Keyboard, 'dismiss')
        const closeModal = jest.fn()
        mockConfigs({ disable_delivery_priority: { value: '1' } })
        const screen = accept({ closeModal })
        tapBlank(screen.getByText('Delivery time'))
        expect(dismiss).not.toHaveBeenCalled()
        expect(closeModal).not.toHaveBeenCalled()
        expect(screen.getByTestId('delivery-time').props.children).toBe('20 min')
      })

      it('the sheet\'s blank parts claim the touch only where there is a time to type (accept), and never for a screen reader', () => {
        mockConfigs({ disable_delivery_priority: { value: '1' } })
        const screen = accept()
        const body = screen.getByTestId('sheet-bottom-space')
        expect(body.props.onStartShouldSetResponder()).toBe(true)
        // Not a control for a screen reader: nothing in its props makes it focusable.
        expect(body.props.accessible).toBeUndefined()
        expect(body.props.accessibilityRole).toBeUndefined()
        screen.unmount()
        const other = renderSheet('pickupComplete')
        expect(other.getByTestId('sheet-bottom-space').props.onStartShouldSetResponder).toBeUndefined()
      })

      it('the presets, the stepper and Accept keep their own taps (they end the typing themselves)', async () => {
        const handleUpdateOrder = jest.fn().mockResolvedValue(undefined)
        const screen = typing({ handleUpdateOrder }, '35')
        fireEvent.press(screen.getByTestId('delivery-time-preset-45'))
        expect(screen.queryByTestId('delivery-time-input')).toBeNull()
        expect(screen.getByTestId('delivery-time').props.children).toBe('45 min')
        fireEvent.press(screen.getByTestId('delivery-time-edit'))
        fireEvent.changeText(screen.getByTestId('delivery-time-input'), '50')
        fireEvent.press(screen.getByTestId('delivery-time-plus'))
        expect(screen.getByTestId('delivery-time').props.children).toBe('55 min')
      })
    })

    describe('the dimmed page', () => {
      const backdrop = (screen: any) => screen.UNSAFE_getAllByType(TouchableWithoutFeedback)[0]

      it('only ends the typing while a number is being typed (the sheet stays, the keyboard goes), and the next tap closes the sheet', () => {
        mockConfigs({ disable_delivery_priority: { value: '1' } })
        const dismiss = jest.spyOn(Keyboard, 'dismiss')
        const closeModal = jest.fn()
        const screen = accept({ closeModal })
        fireEvent.press(screen.getByTestId('delivery-time-edit'))
        fireEvent.changeText(screen.getByTestId('delivery-time-input'), '35')
        fireEvent.press(backdrop(screen))
        expect(closeModal).not.toHaveBeenCalled()
        expect(screen.queryByTestId('delivery-time-input')).toBeNull()
        expect(screen.getByTestId('delivery-time').props.children).toBe('35 min')
        expect(dismiss).toHaveBeenCalledTimes(1)
        expect(screen.getByTestId('order-sheet')).toBeTruthy()
        fireEvent.press(backdrop(screen))
        expect(closeModal).toHaveBeenCalledTimes(1)
        expect(closeModal).toHaveBeenCalledWith(false)
        jest.restoreAllMocks()
      })

      it('closes the sheet at the first tap when nothing is being typed', () => {
        mockConfigs({ disable_delivery_priority: { value: '1' } })
        const closeModal = jest.fn()
        const screen = accept({ closeModal })
        fireEvent.press(backdrop(screen))
        expect(closeModal).toHaveBeenCalledTimes(1)
      })

      it('the close button and the system\'s back still close it, whatever is being typed', () => {
        mockConfigs({ disable_delivery_priority: { value: '1' } })
        const closeModal = jest.fn()
        const screen = accept({ closeModal })
        fireEvent.press(screen.getByTestId('delivery-time-edit'))
        fireEvent.press(screen.getByLabelText('Close'))
        expect(closeModal).toHaveBeenCalledTimes(1)
        // (The field is still being typed in: nothing blurred it.)
        fireEvent(screen.UNSAFE_getAllByType(Modal)[0], 'requestClose')
        expect(closeModal).toHaveBeenCalledTimes(2)
      })

      it('closes at the first tap on the other sheets', () => {
        const closeModal = jest.fn()
        const screen = renderSheet('pickupComplete', { closeModal })
        fireEvent.press(backdrop(screen))
        expect(closeModal).toHaveBeenCalledTimes(1)
      })
    })

    it('tells the lists the position changed when it was sent', async () => {
      withPosition()
      // The mock's own events (the same object for every render): what the sheet emits is read from it.
      const [{ emit }] = (useEvent as jest.Mock)()
      emit.mockClear()
      const handleUpdateOrder = jest.fn().mockResolvedValue({ id: 1 })
      const screen = accept({ handleUpdateOrder })
      fireEvent.press(screen.getByLabelText('Increase'))
      await act(async () => { fireEvent.press(screen.getByTestId('order-action')) })
      expect(emit).toHaveBeenCalledWith('delivery_position_updated')
    })

    it('steps the position down with minus and up with plus, from 1 to the active orders plus the pending one', () => {
      withPosition()
      const screen = accept({ activeOrdersCount: 2 })
      const stepper = within(screen.getByTestId('delivery-priority-stepper'))
      // No position yet: a "#", and nothing to lower.
      expect(stepper.getByText('#')).toBeTruthy()
      fireEvent.press(screen.getByLabelText('Increase'))
      expect(stepper.getByText('1')).toBeTruthy()
      fireEvent.press(screen.getByLabelText('Increase'))
      expect(stepper.getByText('2')).toBeTruthy()
      fireEvent.press(screen.getByLabelText('Decrease'))
      expect(stepper.getByText('1')).toBeTruthy()
      // A pending order takes one more place than the orders already active.
      fireEvent.press(screen.getByLabelText('Increase'))
      fireEvent.press(screen.getByLabelText('Increase'))
      fireEvent.press(screen.getByLabelText('Increase'))
      expect(stepper.getByText('3')).toBeTruthy()
      // And it does not go below 1 once chosen.
      fireEvent.press(screen.getByLabelText('Decrease'))
      fireEvent.press(screen.getByLabelText('Decrease'))
      fireEvent.press(screen.getByLabelText('Decrease'))
      expect(stepper.getByText('1')).toBeTruthy()
    })

    it('does not give a place beyond the active orders when the order is not pending', () => {
      withPosition()
      const screen = accept({ order: { status: 8 }, activeOrdersCount: 2 })
      const stepper = within(screen.getByTestId('delivery-priority-stepper'))
      for (let i = 0; i < 5; i++) fireEvent.press(screen.getByLabelText('Increase'))
      expect(stepper.getByText('2')).toBeTruthy()
    })

    it('does not send a second mutation on a double tap', async () => {
      mockConfigs({ disable_delivery_priority: { value: '1' } })
      const handleUpdateOrder = jest.fn()
      const screen = accept({ handleUpdateOrder })
      fireEvent.press(screen.getByTestId('order-action'))
      fireEvent.press(screen.getByTestId('order-action'))
      expect(handleUpdateOrder).toHaveBeenCalledTimes(1)
    })

    it('is off while the order is loading or changing', () => {
      mockConfigs({ disable_delivery_priority: { value: '1' } })
      expect(isDisabled(accept({ isLoadingOrder: true }))).toBe(true)
      expect(isDisabled(accept({ loading: true }))).toBe(true)
    })

    describe('the keyboard', () => {
      beforeEach(() => jest.useFakeTimers())
      afterEach(() => jest.useRealTimers())

      it('does not open by itself: the sheet takes no focus, with or without a position, even after the old 400 ms', () => {
        const focus = TextInput.prototype.focus as jest.Mock
        focus.mockClear()
        for (const setup of [withPosition, () => mockConfigs({ disable_delivery_priority: { value: '1' } })]) {
          setup()
          const screen = accept()
          act(() => { jest.advanceTimersByTime(1000) })
          expect(screen.UNSAFE_queryAllByType(TextInput)).toHaveLength(0)
          expect(focus).not.toHaveBeenCalled()
          expect(TextInput.State.currentlyFocusedInput()).toBeFalsy()
          screen.unmount()
        }
      })

      it('lets the position and the presets be used at once, and no field takes the focus back when one is tapped', () => {
        withPosition()
        const screen = accept()
        fireEvent.press(screen.getByLabelText('Increase'))
        fireEvent.press(screen.getByTestId('delivery-time-preset-30'))
        act(() => { jest.advanceTimersByTime(1000) })
        expect(screen.getByTestId('delivery-time').props.children).toBe('30 min')
        expect(screen.UNSAFE_queryAllByType(TextInput)).toHaveLength(0)
        expect(isDisabled(screen)).toBe(false)
      })

      it('opens the field only on a tap on the figure, and it takes the focus then', () => {
        mockConfigs({ disable_delivery_priority: { value: '1' } })
        const screen = accept()
        fireEvent.press(screen.getByTestId('delivery-time-edit'))
        expect(screen.getByTestId('delivery-time-input').props.autoFocus).toBe(true)
      })
    })
  })

  describe.each([
    ['arrivedToBusiness', 3],
    ['pickupComplete', 9]
  ])('%s (the status photo)', (action, status) => {
    const required = () => mockConfigs({ states_requiring_image_driver: { value: String(status) } })

    it('asks for the photo: the tile, "Image is required", and the action off', () => {
      required()
      const screen = renderSheet(action)
      expect(screen.getByText('Upload status image')).toBeTruthy()
      expect(screen.getByTestId('status-image-picker')).toBeTruthy()
      expect(screen.getByText('Tap to take a photo')).toBeTruthy()
      expect(screen.getByText('Image is required')).toBeTruthy()
      expect(isDisabled(screen)).toBe(true)
    })

    it('shows the photo with "Remove image" once taken, turns the action on, and asks again when it is removed', async () => {
      required()
      const screen = renderSheet(action)
      fireEvent.press(screen.getByTestId('status-image-picker'))
      expect(await screen.findByText('Remove image')).toBeTruthy()
      expect(screen.queryByText('Image is required')).toBeNull()
      expect(screen.queryByTestId('status-image-picker')).toBeNull()
      expect(isDisabled(screen)).toBe(false)
      fireEvent.press(screen.getByText('Remove image'))
      expect(screen.getByText('Image is required')).toBeTruthy()
      expect(isDisabled(screen)).toBe(true)
    })

    it('draws the tile 120 high with its glyph (28) over the text, and the photo row as the board: a 72 thumbnail, "Remove image" 44 high filling the rest', async () => {
      required()
      const { defaultAppTheme } = require('../../../../../theme/engine')
      const { StyleSheet } = require('react-native')
      const request = defaultAppTheme().native.components.order_request.base
      expect(request).toEqual(expect.objectContaining({ photo_size: 72, photo_tile_height: 120, photo_tile_icon_size: 28 }))
      const screen = renderSheet(action)
      const tile = StyleSheet.flatten(screen.getByTestId('status-image-picker').props.style)
      expect(tile).toEqual(expect.objectContaining({ height: request.photo_tile_height, alignItems: 'center', justifyContent: 'center' }))
      expect(tile.flexDirection).toBeUndefined()
      const glyphs = screen.UNSAFE_getAllByProps({ name: 'camera-outline' })
      expect(glyphs[glyphs.length - 1].props.size).toBe(request.photo_tile_icon_size)
      fireEvent.press(screen.getByTestId('status-image-picker'))
      const remove = await screen.findByRole('button', { name: 'Remove image' })
      expect(StyleSheet.flatten(remove.children[0].props.style).minHeight).toBe(44)
      // The button keeps its own 44 (it has no flex of its own that would stretch it to the thumbnail's 72); its holder takes the rest of the row
      // and centers it beside the thumbnail.
      expect(StyleSheet.flatten(remove.children[0].props.style).flex).toBeUndefined()
      expect(StyleSheet.flatten(screen.getByTestId('status-image-remove').props.style)).toEqual(expect.objectContaining({ flex: 1, justifyContent: 'center' }))
      expect(StyleSheet.flatten(screen.getByTestId('status-image-row').props.style)).toEqual(expect.objectContaining({ flexDirection: 'row', alignItems: 'center' }))
      const thumb = screen.UNSAFE_getAllByType(require('react-native').Image).map((node: any) => StyleSheet.flatten(node.props.style)).find((style: any) => style?.width === request.photo_size)
      expect(thumb).toEqual(expect.objectContaining({ width: 72, height: 72 }))
    })

    it('sends the photo with the status', async () => {
      required()
      const handleUpdateOrder = jest.fn().mockResolvedValue(undefined)
      const screen = renderSheet(action, { handleUpdateOrder })
      fireEvent.press(screen.getByTestId('status-image-picker'))
      await screen.findByText('Remove image')
      await act(async () => { fireEvent.press(screen.getByTestId('order-action')) })
      expect(handleUpdateOrder).toHaveBeenCalledTimes(1)
      const [sentStatus, body] = handleUpdateOrder.mock.calls[0]
      expect(sentStatus).toBe(status)
      expect(body).toBeInstanceOf(FormData)
    })

    it('has no photo section, and the action on, when the status asks for none', () => {
      mockConfigs({ states_requiring_image_driver: { value: '99' } })
      const screen = renderSheet(action)
      expect(screen.queryByText('Upload status image')).toBeNull()
      expect(screen.queryByTestId('status-image')).toBeNull()
      expect(isDisabled(screen)).toBe(false)
    })
  })

  describe('the accept sheet and the photo of status 8', () => {
    const asksForTheAcceptPhoto = () => mockConfigs({ states_requiring_image_driver: { value: '8' } })

    it('a sheet that changes the status still asks for the photo and stays off without it', () => {
      asksForTheAcceptPhoto()
      const screen = renderSheet('accept', { order: { status: 0 } })
      expect(screen.getByTestId('status-image')).toBeTruthy()
      expect(screen.getByText('Image is required')).toBeTruthy()
      expect(isDisabled(screen)).toBe(true)
    })

    it('the delivery time of an accepted request has no photo block and submits: it only saves the time', async () => {
      asksForTheAcceptPhoto()
      const handleUpdateOrder = jest.fn().mockResolvedValue(true)
      const screen = renderSheet('accept', { order: { status: 8 }, skipsStatusImage: true, handleUpdateOrder })
      expect(screen.queryByTestId('status-image')).toBeNull()
      expect(screen.queryByText('Upload status image')).toBeNull()
      expect(screen.queryByTestId('status-image-picker')).toBeNull()
      expect(screen.queryByText('Image is required')).toBeNull()
      expect(isDisabled(screen)).toBe(false)
      await act(async () => { fireEvent.press(screen.getByTestId('order-action')) })
      expect(handleUpdateOrder).toHaveBeenCalledTimes(1)
      // A plain body, never a multipart one that the request of the time would drop.
      expect(handleUpdateOrder.mock.calls[0][1]).not.toBeInstanceOf(FormData)
    })

    it('says no connection is needed for a photo it does not ask for: offline it is queued like any other change', async () => {
      const { offlineActionsState, offlineActionsFns } = require('../../../../../../jest/helpers/d3OrdersUiMock')
      offlineActionsState.isNetConnected = false
      offlineActionsState.canSaveChangesOffline = true
      offlineActionsFns.applyOffAction.mockResolvedValue(true)
      asksForTheAcceptPhoto()
      const screen = renderSheet('accept', { order: { status: 8 }, skipsStatusImage: true, handleUpdateOrder: jest.fn().mockResolvedValue([]) })
      await act(async () => { fireEvent.press(screen.getByTestId('order-action')) })
      expect(offlineActionsFns.applyOffAction).toHaveBeenCalledTimes(1)
    })
  })

  describe('deliveryComplete (the code and the photo)', () => {
    const ORDER = {
      id: 1234567,
      delivery_pin_status: 'requested',
      payment_events: [{ event: 'payment', paymethod: { gateway: 'cash', name: 'Cash' } }],
      cash: 50,
      summary: { total: 32.37 }
    }
    const delivery = (props: any = {}, configs: any = {}) => {
      mockConfigs({ delivery_pin_enabled: { value: '1' }, ...configs })
      return renderSheet('deliveryComplete', { order: ORDER, orderId: ORDER.id, ...props })
    }

    it('writes what the driver collects, then the photo, then the code, in that order', () => {
      const screen = delivery({}, { states_requiring_image_driver: { value: '11' } })
      const text = JSON.stringify(screen.toJSON())
      const at = ['Collect in cash', 'Upload status image', 'Security code', 'Delivery complete']
        .map((piece) => text.lastIndexOf(piece))
      expect(at.every((index) => index >= 0)).toBe(true)
      expect([...at].sort((a, b) => a - b)).toEqual(at)
    })

    it('has no recap on the other sheets', () => {
      expect(renderSheet('pickupComplete').queryByTestId('collect-recap')).toBeNull()
      expect(renderSheet('arrivedToBusiness').queryByTestId('collect-recap')).toBeNull()
      expect(renderSheet('accept').queryByTestId('collect-recap')).toBeNull()
    })

    it('asks for the code: the action is off until it is complete', () => {
      const screen = delivery()
      expect(screen.getByText('Security code')).toBeTruthy()
      expect(screen.getByText('Ask the customer for the delivery code')).toBeTruthy()
      expect(isDisabled(screen)).toBe(true)
      fireEvent.changeText(pinField(screen, ORDER.id), '042')
      expect(isDisabled(screen)).toBe(true)
      fireEvent.changeText(pinField(screen, ORDER.id), '0427')
      expect(isDisabled(screen)).toBe(false)
    })

    it('asks for no code when the setting is off', () => {
      const screen = delivery({}, { delivery_pin_enabled: { value: '0' } })
      expect(screen.queryByText('Security code')).toBeNull()
      expect(isDisabled(screen)).toBe(false)
    })

    it('asks for both: the action is off until the photo is taken and the code is complete', async () => {
      const screen = delivery({}, { states_requiring_image_driver: { value: '11' } })
      fireEvent.changeText(pinField(screen, ORDER.id), '0427')
      expect(isDisabled(screen)).toBe(true)
      fireEvent.press(screen.getByTestId('status-image-picker'))
      await screen.findByText('Remove image')
      expect(isDisabled(screen)).toBe(false)
      fireEvent.press(screen.getByText('Remove image'))
      expect(isDisabled(screen)).toBe(true)
    })

    it('sends the code with the status', async () => {
      const handleUpdateOrder = jest.fn()
      const screen = delivery({ handleUpdateOrder })
      fireEvent.changeText(pinField(screen, ORDER.id), '0427')
      await act(async () => { fireEvent.press(screen.getByTestId('order-action')) })
      expect(handleUpdateOrder).toHaveBeenCalledWith(
        11,
        expect.objectContaining({ status: 11, delivery_pin: '0427' }),
        expect.objectContaining({ deliveryPins: { [ORDER.id]: '0427' } })
      )
    })

    it('does not send while the code is incomplete', async () => {
      const handleUpdateOrder = jest.fn()
      const screen = delivery({ handleUpdateOrder })
      fireEvent.changeText(pinField(screen, ORDER.id), '042')
      await act(async () => { fireEvent.press(screen.getByTestId('order-action')) })
      expect(handleUpdateOrder).not.toHaveBeenCalled()
    })

    it('writes the server\'s error under the code, in the sheet', async () => {
      const handleUpdateOrder = jest.fn().mockResolvedValue(null)
      const screen = delivery({ handleUpdateOrder, orderError: ['The delivery PIN does not match.'] })
      fireEvent.changeText(pinField(screen, ORDER.id), '9999')
      await act(async () => { fireEvent.press(screen.getByTestId('order-action')) })
      expect(screen.getByTestId('order-action-error')).toBeTruthy()
      expect(screen.getByText('The delivery PIN does not match.')).toBeTruthy()
      // The error goes when the code changes.
      fireEvent.changeText(pinField(screen, ORDER.id), '999')
      expect(screen.queryByText('The delivery PIN does not match.')).toBeNull()
    })

    it('makes the driver wait the time the server asked for after a rejected code', async () => {
      const handleUpdateOrder = jest.fn().mockResolvedValue(null)
      const screen = delivery({
        handleUpdateOrder,
        orderError: ['The delivery PIN does not match.'],
        orderErrorCodes: ['delivery_pin.invalid'],
        orderRetryAfter: 10
      })
      fireEvent.changeText(pinField(screen, ORDER.id), '9999')
      await act(async () => { fireEvent.press(screen.getByTestId('order-action')) })
      expect(screen.getByText('You can try again in 10 seconds')).toBeTruthy()
      expect(screen.getByText('The code does not match')).toBeTruthy()
      fireEvent.changeText(pinField(screen, ORDER.id), '0427')
      // While it waits the action is off.
      expect(isDisabled(screen)).toBe(true)
    })

    it('says the code needs a connection, and does not queue the delivery', async () => {
      const { offlineActionsState } = require('../../../../../../jest/helpers/d3OrdersUiMock')
      offlineActionsState.isNetConnected = false
      offlineActionsState.canSaveChangesOffline = true
      const handleUpdateOrder = jest.fn()
      const screen = delivery({ handleUpdateOrder })
      expect(screen.getByText('You need an internet connection to validate the delivery code')).toBeTruthy()
      expect(isDisabled(screen)).toBe(true)
      fireEvent.changeText(pinField(screen, ORDER.id), '0427')
      await act(async () => { fireEvent.press(screen.getByTestId('order-action')) })
      expect(handleUpdateOrder).not.toHaveBeenCalled()
    })
  })

  describe('what each action sends', () => {
    it.each([
      ['arrivedToBusiness', 3],
      ['pickupComplete', 9],
      ['deliveryComplete', 11]
    ])('%s sends the status %i with the order id, and no photo or code when none is asked', async (action, status) => {
      const handleUpdateOrder = jest.fn().mockResolvedValue({ id: 1 })
      const screen = renderSheet(action, { handleUpdateOrder, order: { id: 1 } })
      await act(async () => { fireEvent.press(screen.getByTestId('order-action')) })
      expect(handleUpdateOrder).toHaveBeenCalledTimes(1)
      expect(handleUpdateOrder).toHaveBeenCalledWith(status, { id: 1, status }, undefined)
    })

    it('is off while the order is loading or changing, for any action', () => {
      expect(isDisabled(renderSheet('pickupComplete', { isLoadingOrder: true }))).toBe(true)
      expect(isDisabled(renderSheet('arrivedToBusiness', { loading: true }))).toBe(true)
    })

    it('does not send a second mutation on a double tap', () => {
      const handleUpdateOrder = jest.fn()
      const screen = renderSheet('arrivedToBusiness', { handleUpdateOrder })
      fireEvent.press(screen.getByTestId('order-action'))
      fireEvent.press(screen.getByTestId('order-action'))
      expect(handleUpdateOrder).toHaveBeenCalledTimes(1)
    })

    it('writes a failed status change as the field\'s error, at the start when no code is asked', async () => {
      const field = theme.native.components.field.base
      const handleUpdateOrder = jest.fn().mockResolvedValue(null)
      const screen = renderSheet('accept', { handleUpdateOrder, orderError: ['The order changed'] })
      await act(async () => { fireEvent.press(screen.getByTestId('order-action')) })
      const error = StyleSheet.flatten(screen.getByTestId('order-action-error').props.style)
      expect(screen.getByText('The order changed')).toBeTruthy()
      expect(error.color).toBe(field.error_color)
      expect(error.textAlign).toBe('auto')
    })

    it('says the API\'s words for an error code, never the code', async () => {
      const handleUpdateOrder = jest.fn().mockResolvedValue(null)
      const screen = renderSheet('accept', { handleUpdateOrder, orderError: ['ERROR_ORDER_FIND'] })
      await act(async () => { fireEvent.press(screen.getByTestId('order-action')) })
      expect(screen.getByText('Order not found')).toBeTruthy()
      expect(screen.queryByText('ERROR_ORDER_FIND')).toBeNull()
    })

    it('a failed save leaves the action on and a second tap sends it again', async () => {
      const handleUpdateOrder = jest.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true)
      const screen = renderSheet('arrivedToBusiness', { handleUpdateOrder, orderError: 'The change was not saved. Try again.' })
      await act(async () => { fireEvent.press(screen.getByTestId('order-action')) })
      expect(screen.getByText('The change was not saved. Try again.')).toBeTruthy()
      expect(isDisabled(screen)).toBeFalsy()
      await act(async () => { fireEvent.press(screen.getByTestId('order-action')) })
      expect(handleUpdateOrder).toHaveBeenCalledTimes(2)
    })

    it('never closes the view when the request answered that it did not change (the screen that gave the request closes it on success)', async () => {
      const closeModal = jest.fn()
      const screen = renderSheet('arrivedToBusiness', { handleUpdateOrder: jest.fn().mockResolvedValue(false), closeModal })
      await act(async () => { fireEvent.press(screen.getByTestId('order-action')) })
      expect(closeModal).not.toHaveBeenCalled()
    })

    it('a request that throws does not leave the action loading', async () => {
      const handleUpdateOrder = jest.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce(true)
      const screen = renderSheet('arrivedToBusiness', { handleUpdateOrder })
      await act(async () => { await fireEvent.press(screen.getByTestId('order-action')) })
      expect(isDisabled(screen)).toBeFalsy()
      await act(async () => { fireEvent.press(screen.getByTestId('order-action')) })
      expect(handleUpdateOrder).toHaveBeenCalledTimes(2)
    })

    it('shows no error when nothing came with a failure (no "Network Error" of its own)', async () => {
      const screen = renderSheet('accept', { handleUpdateOrder: jest.fn().mockResolvedValue(null) })
      await act(async () => { fireEvent.press(screen.getByTestId('order-action')) })
      expect(screen.queryByTestId('order-action-error')).toBeNull()
      expect(screen.queryByText('Network Error')).toBeNull()
    })

    describe('without connection', () => {
      beforeEach(() => {
        const { offlineActionsState, offlineActionsFns } = require('../../../../../../jest/helpers/d3OrdersUiMock')
        offlineActionsState.isNetConnected = false
        offlineActionsFns.applyOffAction.mockReset()
        offlineActionsFns.registerOffOrder.mockClear()
        // The toasts of a test before are not this one's.
        require('../../../../../../jest/helpers/mockOrdering').useToast()[1].showToast.mockClear()
      })

      it('queues the status change and closes when the changes can be saved offline', async () => {
        const { offlineActionsState, offlineActionsFns } = require('../../../../../../jest/helpers/d3OrdersUiMock')
        offlineActionsState.canSaveChangesOffline = true
        const handleUpdateOrder = jest.fn().mockResolvedValue({ id: 1, status: 9 })
        const closeModal = jest.fn()
        const screen = renderSheet('pickupComplete', { handleUpdateOrder, closeModal })
        await act(async () => { fireEvent.press(screen.getByTestId('order-action')) })
        expect(offlineActionsFns.applyOffAction).toHaveBeenCalledWith([{
          event: 'evt_off_change_order_status',
          data: { orderId: 1, body: { id: 1, status: 9 } }
        }])
        expect(handleUpdateOrder).toHaveBeenCalledWith(9, { id: 1, status: 9 }, { dataToSave: { status: 9, unsync: true } })
        expect(offlineActionsFns.registerOffOrder).toHaveBeenCalledWith({ id: 1, status: 9 })
        expect(closeModal).toHaveBeenCalled()
      })

      it('queues the delivery position chosen in the sheet with the change, and the offline copy carries it', async () => {
        const { offlineActionsState, offlineActionsFns } = require('../../../../../../jest/helpers/d3OrdersUiMock')
        offlineActionsState.canSaveChangesOffline = true
        offlineActionsFns.applyOffAction.mockResolvedValue(true)
        withPosition()
        const handleUpdateOrder = jest.fn().mockResolvedValue({ id: 1, status: 8 })
        const screen = renderSheet('accept', { handleUpdateOrder, activeOrdersCount: 2 })
        fireEvent.press(screen.getByLabelText('Increase'))
        fireEvent.press(screen.getByLabelText('Increase'))
        await act(async () => { fireEvent.press(screen.getByTestId('order-action')) })
        expect(offlineActionsFns.applyOffAction).toHaveBeenCalledWith([{
          event: 'evt_off_change_order_status',
          data: { orderId: 1, body: expect.objectContaining({ id: 1, status: 8, delivery_position: 2 }) }
        }])
        expect(handleUpdateOrder).toHaveBeenCalledWith(8, expect.objectContaining({ delivery_position: 2 }), { dataToSave: { status: 8, unsync: true, delivery_position: 2 } })
      })

      it('registers the order the handler answers with, never its flag: a list handler answers `true` and the store keeps orders', async () => {
        const { offlineActionsState, offlineActionsFns } = require('../../../../../../jest/helpers/d3OrdersUiMock')
        offlineActionsState.canSaveChangesOffline = true
        const closeModal = jest.fn()
        const screen = renderSheet('pickupComplete', { handleUpdateOrder: jest.fn().mockResolvedValue(true), closeModal })
        await act(async () => { fireEvent.press(screen.getByTestId('order-action')) })
        expect(offlineActionsFns.applyOffAction).toHaveBeenCalledTimes(1)
        expect(offlineActionsFns.registerOffOrder).not.toHaveBeenCalled()
        expect(closeModal).toHaveBeenCalledTimes(1)
      })

      it('registers each order a list handler answers with (the offline copies it makes)', async () => {
        const { offlineActionsState, offlineActionsFns } = require('../../../../../../jest/helpers/d3OrdersUiMock')
        offlineActionsState.canSaveChangesOffline = true
        const saved = [{ id: 1, status: 9, oldStatus: 3, unsync: true }]
        const screen = renderSheet('pickupComplete', { handleUpdateOrder: jest.fn().mockResolvedValue(saved) })
        await act(async () => { fireEvent.press(screen.getByTestId('order-action')) })
        expect(offlineActionsFns.registerOffOrder).toHaveBeenCalledTimes(1)
        expect(offlineActionsFns.registerOffOrder).toHaveBeenCalledWith(saved[0])
      })

      it('asks the handler for the offline copy and never sends: the request is not made now and again at the sync', async () => {
        const { offlineActionsState } = require('../../../../../../jest/helpers/d3OrdersUiMock')
        offlineActionsState.canSaveChangesOffline = true
        const handleUpdateOrder = jest.fn().mockResolvedValue([])
        const screen = renderSheet('pickupComplete', { handleUpdateOrder })
        await act(async () => { fireEvent.press(screen.getByTestId('order-action')) })
        expect(handleUpdateOrder).toHaveBeenCalledTimes(1)
        expect(handleUpdateOrder.mock.calls[0][2]).toEqual({ dataToSave: { status: 9, unsync: true } })
      })

      it('does not close, and leaves the action ready again, when the queue throws', async () => {
        const { offlineActionsState, offlineActionsFns } = require('../../../../../../jest/helpers/d3OrdersUiMock')
        offlineActionsState.canSaveChangesOffline = true
        offlineActionsFns.applyOffAction.mockRejectedValueOnce(new Error('disk full'))
        const closeModal = jest.fn()
        const handleUpdateOrder = jest.fn()
        const screen = renderSheet('pickupComplete', { handleUpdateOrder, closeModal })
        await act(async () => { fireEvent.press(screen.getByTestId('order-action')) })
        expect(closeModal).not.toHaveBeenCalled()
        expect(handleUpdateOrder).not.toHaveBeenCalled()
        expect(isDisabled(screen)).toBeFalsy()
        // The failure is told, not silent.
        expect(require('../../../../../../jest/helpers/mockOrdering').useToast()[1].showToast).toHaveBeenCalledWith(expect.anything(), 'The change was not saved. Try again.')
      })

      it('does not close, and leaves the action ready again, when the handler throws', async () => {
        const { offlineActionsState } = require('../../../../../../jest/helpers/d3OrdersUiMock')
        offlineActionsState.canSaveChangesOffline = true
        const closeModal = jest.fn()
        const screen = renderSheet('pickupComplete', { handleUpdateOrder: jest.fn().mockRejectedValue(new Error('boom')), closeModal })
        await act(async () => { fireEvent.press(screen.getByTestId('order-action')) })
        expect(closeModal).not.toHaveBeenCalled()
        expect(isDisabled(screen)).toBeFalsy()
      })

      it('queues a group as one change per order, each with its own id, in one write, and closes', async () => {
        const { offlineActionsState, offlineActionsFns } = require('../../../../../../jest/helpers/d3OrdersUiMock')
        offlineActionsState.canSaveChangesOffline = true
        offlineActionsFns.applyOffAction.mockResolvedValue(true)
        const saved = [{ id: 1, status: 9, oldStatus: 3, unsync: true }, { id: 2, status: 9, oldStatus: 3, unsync: true }]
        const closeModal = jest.fn()
        const handleUpdateOrder = jest.fn().mockResolvedValue(saved)
        const screen = renderSheet('pickupComplete', {
          handleUpdateOrder,
          closeModal,
          orders: [{ id: 1, customer_id: 4 }, { id: 2, customer_id: 4 }]
        })
        await act(async () => { fireEvent.press(screen.getByTestId('order-action')) })
        expect(offlineActionsFns.applyOffAction).toHaveBeenCalledTimes(1)
        expect(offlineActionsFns.applyOffAction).toHaveBeenCalledWith([
          { event: 'evt_off_change_order_status', data: { orderId: 1, body: { id: 1, status: 9 } } },
          { event: 'evt_off_change_order_status', data: { orderId: 2, body: { id: 2, status: 9 } } }
        ])
        // The orders are kept as they will be once synced, each registered once, and nothing is sent now.
        expect(handleUpdateOrder).toHaveBeenCalledTimes(1)
        expect(handleUpdateOrder.mock.calls[0][2]).toEqual({ dataToSave: { status: 9, unsync: true } })
        expect(offlineActionsFns.registerOffOrder).toHaveBeenCalledTimes(2)
        expect(offlineActionsFns.registerOffOrder).toHaveBeenCalledWith(saved[0])
        expect(offlineActionsFns.registerOffOrder).toHaveBeenCalledWith(saved[1])
        expect(closeModal).toHaveBeenCalledTimes(1)
      })

      it('keeps the group\'s sheet, with nothing registered, when the queue does not take it', async () => {
        const { offlineActionsState, offlineActionsFns } = require('../../../../../../jest/helpers/d3OrdersUiMock')
        offlineActionsState.canSaveChangesOffline = true
        offlineActionsFns.applyOffAction.mockResolvedValue(false)
        const closeModal = jest.fn()
        const handleUpdateOrder = jest.fn()
        const screen = renderSheet('pickupComplete', {
          handleUpdateOrder,
          closeModal,
          orders: [{ id: 1, customer_id: 4 }, { id: 2, customer_id: 4 }]
        })
        await act(async () => { fireEvent.press(screen.getByTestId('order-action')) })
        expect(handleUpdateOrder).not.toHaveBeenCalled()
        expect(offlineActionsFns.registerOffOrder).not.toHaveBeenCalled()
        expect(closeModal).not.toHaveBeenCalled()
        expect(isDisabled(screen)).toBeFalsy()
        expect(require('../../../../../../jest/helpers/mockOrdering').useToast()[1].showToast).toHaveBeenCalledWith(expect.anything(), 'The change was not saved. Try again.')
      })

      it('queues nothing for a status that asks for a photo: a photo cannot wait in the queue', async () => {
        const { offlineActionsState, offlineActionsFns } = require('../../../../../../jest/helpers/d3OrdersUiMock')
        offlineActionsState.canSaveChangesOffline = true
        mockConfigs({ states_requiring_image_driver: { value: '9' } })
        const closeModal = jest.fn()
        const handleUpdateOrder = jest.fn()
        const screen = renderSheet('pickupComplete', { handleUpdateOrder, closeModal })
        fireEvent.press(screen.getByTestId('status-image-picker'))
        // The photo is taken (the picker answers a tick later): the action is on, so what stops it is the missing connection.
        await screen.findByText('Remove image')
        await act(async () => { fireEvent.press(screen.getByTestId('order-action')) })
        expect(offlineActionsFns.applyOffAction).not.toHaveBeenCalled()
        expect(handleUpdateOrder).not.toHaveBeenCalled()
        expect(closeModal).not.toHaveBeenCalled()
        // It says what is missing (the photo), not a bare "no internet".
        expect(require('../../../../../../jest/helpers/mockOrdering').useToast()[1].showToast)
          .toHaveBeenCalledWith(expect.anything(), 'You need an internet connection to send the photo')
        expect(screen.getByTestId('status-image-row')).toBeTruthy()
      })

      it('queues nothing for a group whose status asks for a photo either, and says the same', async () => {
        const { offlineActionsState, offlineActionsFns } = require('../../../../../../jest/helpers/d3OrdersUiMock')
        offlineActionsState.canSaveChangesOffline = true
        mockConfigs({ states_requiring_image_driver: { value: '9' } })
        const closeModal = jest.fn()
        const screen = renderSheet('pickupComplete', {
          closeModal,
          handleUpdateOrder: jest.fn(),
          orders: [{ id: 1, customer_id: 4 }, { id: 2, customer_id: 4 }]
        })
        fireEvent.press(screen.getByTestId('status-image-picker'))
        // The photo is taken (the picker answers a tick later): the action is on, so what stops it is the missing connection.
        await screen.findByText('Remove image')
        await act(async () => { fireEvent.press(screen.getByTestId('order-action')) })
        expect(offlineActionsFns.applyOffAction).not.toHaveBeenCalled()
        expect(closeModal).not.toHaveBeenCalled()
        expect(require('../../../../../../jest/helpers/mockOrdering').useToast()[1].showToast)
          .toHaveBeenCalledWith(expect.anything(), 'You need an internet connection to send the photo')
      })

      it('sends it as usual when the changes cannot be saved offline', async () => {
        const { offlineActionsState, offlineActionsFns } = require('../../../../../../jest/helpers/d3OrdersUiMock')
        offlineActionsState.canSaveChangesOffline = false
        const handleUpdateOrder = jest.fn().mockResolvedValue(undefined)
        const screen = renderSheet('pickupComplete', { handleUpdateOrder })
        await act(async () => { fireEvent.press(screen.getByTestId('order-action')) })
        expect(offlineActionsFns.applyOffAction).not.toHaveBeenCalled()
        expect(handleUpdateOrder).toHaveBeenCalledWith(9, { id: 1, status: 9 }, undefined)
      })
    })
  })

  describe('the location requirements', () => {
    const farFromTheStore = () => mockConfigs({
      location_validation_enabled_status_9: { value: '1' },
      location_validation_distance_status_9: { value: '100' }
    })
    const order = { id: 1, status: 3, business: { location: { lat: 0, lng: 0 } } }

    it('keeps a blocked action painted off and answering: it opens the requirements dialog, over the sheet', async () => {
      farFromTheStore()
      const handleUpdateOrder = jest.fn()
      const screen = renderSheet('pickupComplete', { order, handleUpdateOrder })
      const action = () => screen.getByTestId('order-action')
      /** The opacity of the boxes between the button and the sheet: only the blocked wrapper fades. */
      const fade = () => {
        const found: number[] = []
        for (let node: any = action().parent; node && node.props.testID !== 'order-sheet'; node = node.parent) {
          const opacity = typeof node.type === 'string' ? StyleSheet.flatten(node.props.style)?.opacity : undefined
          if (opacity !== undefined) found.push(opacity)
        }
        return found
      }
      await waitFor(() => expect(fade()).toEqual([theme.native.tokens.opacity.disabled]))
      // Blocked is not disabled: the button still takes the tap.
      expect(action().props.accessibilityState.disabled).toBe(false)
      expect(screen.queryByText('Requirements Not Met')).toBeNull()
      fireEvent.press(action())
      expect(await screen.findByText('Requirements Not Met')).toBeTruthy()
      expect(handleUpdateOrder).not.toHaveBeenCalled()
      // Closing the dialog leaves the sheet where it was.
      fireEvent.press(screen.getByText('Close', { exact: true }))
      await waitFor(() => expect(screen.queryByText('Requirements Not Met')).toBeNull())
      expect(screen.getByTestId('order-sheet')).toBeTruthy()
    })

    it('does not fade the action when nothing blocks it', async () => {
      mockConfigs()
      const screen = renderSheet('pickupComplete', { order })
      await act(async () => {})
      const action = screen.getByTestId('order-action')
      for (let node: any = action.parent; node && node.props.testID !== 'order-sheet'; node = node.parent) {
        if (typeof node.type === 'string') expect(StyleSheet.flatten(node.props.style)?.opacity).toBeUndefined()
      }
    })
  })
})
