import '../../../../../../jest/helpers/uiModuleMocks'
import React from 'react'
import { Image, KeyboardAvoidingView, Linking, ScrollView, StyleSheet, TextInput } from 'react-native'
import { fireEvent, waitFor } from '@testing-library/react-native'

import { useConfig } from '@components'

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

// The camera: the driver takes a photo as soon as the tile is tapped.
jest.mock('react-native-image-picker', () => ({
  launchCamera: jest.fn((_options: any, callback: any) =>
    callback({ assets: [{ uri: 'file:///photo.jpg', type: 'image/jpeg', fileName: 'photo.jpg' }] }))
}))

// The system's insets, as jest/setup.js gives them (none), which a test may change.
const mockSafeAreaInsets = { top: 0, right: 0, bottom: 0, left: 0 }
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: any) => children,
  SafeAreaView: ({ children }: any) => children,
  useSafeAreaInsets: () => mockSafeAreaInsets,
  useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 })
}))

import { AcceptOrRejectOrder } from '..'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { layoutWindowOf, onAndroid } from '../../../../../../jest/helpers/androidWindow'
import { driverAppTitle, driverOrderTitle } from '../../../../../../jest/helpers/d3OrdersDefaults'
import { buildAppTheme, THEME_PRODUCT_TYPE } from '../../../../../theme/engine'

// The accept action is a sheet (see AcceptOrRejectSheet.test.tsx): this suite is about the screens
// that keep the whole screen (a rejection, a failure, "order not ready", a forced status).
describe('AcceptOrRejectOrder, the full screens', () => {
  beforeEach(() => {
    const { offlineActionsState } = require('../../../../../../jest/helpers/d3OrdersUiMock')
    offlineActionsState.isNetConnected = true
    offlineActionsState.canSaveChangesOffline = false
    ;(useConfig as jest.Mock).mockReturnValue([{
      configs: { disable_delivery_priority: { value: '1' } }
    }])
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
    expect(getAllByText('Delivery failed').length).toBeGreaterThan(0)
    const comments = getByPlaceholderText('Please type your comments in here')
    expect(comments).toBeTruthy()
    // The comment field is not focused on entering: the keyboard opens when the driver taps it.
    expect(comments.props.autoFocus).toBeFalsy()
    expect(TextInput.State.currentlyFocusedInput()).toBeFalsy()
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

  describe('the customer\'s phone on the reject flow: one format, and the call always carries the country code', () => {
    const renderReject = (props: any) => renderWithProviders(
      <AcceptOrRejectOrder
        isPage
        action="reject"
        orderTitle={driverOrderTitle}
        appTitle={driverAppTitle}
        orderId={1}
        actions={{ reject: 'rejectByDriver' }}
        handleUpdateOrder={jest.fn()}
        closeModal={jest.fn()}
        {...props}
      />
    )

    beforeEach(() => {
      jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(true)
      jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined)
    })

    afterEach(() => {
      jest.restoreAllMocks()
    })

    it.each([
      ['a US number', '6465550129', '1', '+1 646 555 0129', 'tel:+16465550129'],
      ['a Colombian mobile', '3001234567', '57', '+57 300 1234567', 'tel:+573001234567'],
      ['a Mexican number', '5512345678', '52', '+52 55 1234 5678', 'tel:+525512345678'],
      ['a number with its code already inside', '+16465550129', '1', '+1 646 555 0129', 'tel:+16465550129'],
      ['a number with no code', '6465550129', undefined, '6465550129', 'tel:6465550129']
    ])('%s is shown international and dialled with its country code', async (_name, cellphone, code, shown, dialled) => {
      const { getByText, getByTestId } = renderReject({ customerCellphone: cellphone, customerCountryPhoneCode: code })
      expect(getByText(shown)).toBeTruthy()
      fireEvent.press(getByTestId('customer-phone-button'))
      await waitFor(() => expect(Linking.openURL).toHaveBeenCalledWith(dialled))
    })

    it('a customer saved with no country code takes the project\'s default country (the config\'s `default_country_code`), in the text and in the call', async () => {
      ;(useConfig as jest.Mock).mockReturnValue([{ configs: { default_country_code: { value: 'US' } } }])
      const { getByText, getByTestId } = renderReject({ customerCellphone: '2125550198', customerCountryPhoneCode: null })
      expect(getByText('+1 212 555 0198')).toBeTruthy()
      fireEvent.press(getByTestId('customer-phone-button'))
      await waitFor(() => expect(Linking.openURL).toHaveBeenCalledWith('tel:+12125550198'))
    })

    it('with no default country either, the number is shown and dialled as it is', async () => {
      const { getByText, getByTestId } = renderReject({ customerCellphone: '2125550198', customerCountryPhoneCode: null })
      expect(getByText('2125550198')).toBeTruthy()
      fireEvent.press(getByTestId('customer-phone-button'))
      await waitFor(() => expect(Linking.openURL).toHaveBeenCalledWith('tel:2125550198'))
    })

    it('has no bracketed national form any more', () => {
      const { queryByText } = renderReject({ customerCellphone: '6465550129', customerCountryPhoneCode: '1' })
      expect(queryByText('(646) 5550129')).toBeNull()
    })

    it('says there is no number, and dials nothing, when the customer has none', () => {
      const { getByText, getByTestId } = renderReject({ customerCellphone: undefined, customerCountryPhoneCode: '1' })
      expect(getByText('There\'s not phonenumber.')).toBeTruthy()
      fireEvent.press(getByTestId('customer-phone-button'))
      expect(Linking.openURL).not.toHaveBeenCalled()
    })
  })

  it('lists the reject reasons as choices for the driver app and sends the chosen one', async () => {
    const handleUpdateOrder = jest.fn().mockResolvedValue(undefined)
    const { getByTestId, getAllByRole, getByText, getByPlaceholderText } = renderWithProviders(
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
    expect(getByTestId('reject-reasons')).toBeTruthy()
    expect(getAllByRole('radio')).toHaveLength(5)
    fireEvent.press(getByTestId('reject-reason-very_far_away'))
    expect(getByTestId('reject-reason-very_far_away').props.accessibilityState.checked).toBe(true)
    fireEvent.changeText(getByPlaceholderText('Please type your comments in here'), 'too far')
    fireEvent.press(getByText('Reject'))
    await waitFor(() => expect(handleUpdateOrder).toHaveBeenCalled())
    expect(handleUpdateOrder).toHaveBeenCalledWith(6, expect.objectContaining({ reject_reason: 'very_far_away', reasons: 'too far' }), undefined)
  })

  it('draws the reasons as the board does: rows 44 apart with a divider under each but the last, the radio mark at 20, the chosen one with no box of its own', () => {
    const { getAllByRole, UNSAFE_getAllByType } = renderWithProviders(
      <AcceptOrRejectOrder
        isPage
        action="reject"
        orderTitle={driverOrderTitle}
        appTitle={driverAppTitle}
        orderId={1}
        actions={{ reject: 'rejectByDriver' }}
        handleUpdateOrder={jest.fn()}
        closeModal={jest.fn()}
      />
    )
    const { defaultAppTheme } = require('../../../../../theme/engine')
    const theme = defaultAppTheme()
    const choice = theme.native.components.choice
    const rows = getAllByRole('radio')
    const style = (row: any) => StyleSheet.flatten(typeof row.props.style === 'function' ? row.props.style({ pressed: false }) : row.props.style)
    rows.forEach((row, index) => {
      const own = style(row)
      expect(own.minHeight).toBe(choice.sizes.md.height)
      // No box: no border all around, no radius, no margin between the rows, no side padding.
      expect(own.borderRadius).toBeUndefined()
      expect(own.marginVertical).toBeUndefined()
      expect(own.paddingHorizontal).toBeUndefined()
      expect(own.borderWidth).toBeUndefined()
      expect(own.borderBottomColor).toBe(theme.native.tokens.color.border)
      expect(own.borderBottomWidth).toBe(index === rows.length - 1 ? 0 : require('../../../../../theme/helpers').themeBorderWidth(theme, 'thin'))
    })
    // The mark is the theme's radio at its own size (20), not the options' smaller one: a ring drawn at that size (the
    // glyph's circle filled 0.82 of its box and showed 16.5 where the board draws 20), the selected one with its dot.
    const radio = theme.native.components.radio.base
    const marks = UNSAFE_getAllByType(require('react-native').View)
      .map((node: any) => StyleSheet.flatten(node.props.style))
      .filter((look: any) => look?.width === radio.size && look?.borderRadius === radio.size)
    expect(marks).toHaveLength(rows.length)
    expect(marks[0]).toEqual(expect.objectContaining({ width: radio.size, height: radio.size, borderColor: radio.unchecked }))
    expect(marks.filter((look: any) => look.borderColor === radio.checked)).toHaveLength(0)
    fireEvent.press(rows[3])
    // The chosen one is the ring in the checked color with its dot inside, the same 20.
    const after = UNSAFE_getAllByType(require('react-native').View).map((node: any) => StyleSheet.flatten(node.props.style))
    const chosen = after.filter((look: any) => look?.width === radio.size && look?.borderRadius === radio.size && look.borderColor === radio.checked)
    expect(chosen).toHaveLength(1)
    expect(after.filter((look: any) => look?.flex === 1 && look?.borderRadius === radio.size && look.backgroundColor === radio.checked)).toHaveLength(1)
    expect(style(getAllByRole('radio')[3]).backgroundColor).toBeUndefined()
    expect(style(getAllByRole('radio')[3]).borderWidth).toBeUndefined()
  })

  it('shows the customer phone button on reject, and hides it with confirmation.customer.phone', () => {
    const props = {
      isPage: true,
      action: 'reject',
      orderTitle: driverOrderTitle,
      appTitle: driverAppTitle,
      customerCellphone: '5551234',
      orderId: 1,
      actions: { reject: 'rejectByDriver' },
      handleUpdateOrder: jest.fn(),
      closeModal: jest.fn()
    }
    const shown = renderWithProviders(<AcceptOrRejectOrder {...props} />)
    expect(shown.getByTestId('customer-phone-button')).toBeTruthy()
    expect(shown.getByText(/Call your customer/)).toBeTruthy()
    shown.unmount()

    const hidden = renderWithProviders(<AcceptOrRejectOrder {...props} />, {
      themeOverrides: buildAppTheme({ version: 2, product_type: THEME_PRODUCT_TYPE, values: { visibility: { 'confirmation.customer.phone': false } } })
    })
    expect(hidden.queryByTestId('customer-phone-button')).toBeNull()
    expect(hidden.queryByText(/Call your customer/)).toBeNull()
    // The rest of the reject flow stays.
    expect(hidden.getByText('Mark the order as rejected')).toBeTruthy()
    expect(hidden.getByTestId('reject-reasons')).toBeTruthy()
  })

  it('paints a failure\'s action danger, in the bottom bar\'s size (the accept sheet is painted in the sheet suite)', () => {
    const { StyleSheet } = require('react-native')
    const { defaultAppTheme } = require('../../../../../theme/engine')
    const button = defaultAppTheme().native.components.button
    // The painted box of the action's button (the view that carries the size's height).
    const box = (screen: any) => StyleSheet.flatten(screen.getByTestId('order-action').findAll((node: any) =>
      typeof node.type === 'string' && StyleSheet.flatten(node.props.style)?.minHeight !== undefined)[0].props.style)

    const failed = renderWithProviders(
      <AcceptOrRejectOrder
        isPage
        action='deliveryFailed'
        orderTitle={driverOrderTitle}
        appTitle={driverAppTitle}
        orderId={1}
        actions={{ deliveryFailed: 'deliveryFailedByDriver' }}
        handleUpdateOrder={jest.fn()}
        closeModal={jest.fn()}
      />
    )
    // Disabled until its comment is typed: the disabled look paints over the danger one.
    fireEvent.changeText(failed.getByPlaceholderText('Please type your comments in here'), 'nobody home')
    expect(box(failed).backgroundColor).toBe(button.variants.danger.solid.background)
    expect(box(failed).minHeight).toBe(button.sizes.lg.height)
  })

  describe('the comment field of a reason form', () => {
    const reasonForm = (action = 'pickupFailed') => renderWithProviders(
      <AcceptOrRejectOrder
        isPage
        action={action}
        orderTitle={driverOrderTitle}
        appTitle={driverAppTitle}
        orderId={1}
        actions={{ [action]: 'pickupFailedByDriver' }}
        handleUpdateOrder={jest.fn()}
        closeModal={jest.fn()}
      />
    )
    const layout = (y: number, height: number) => ({ nativeEvent: { layout: { x: 0, y, width: 390, height } } })
    /** The scroll's `scrollTo` and the field's block (its label and the field), laid out at `y` in a room of `room`. */
    const wire = (screen: any, y = 640, room = 300) => {
      const field = screen.getByPlaceholderText('Please type your comments in here')
      // The block the screen keeps in sight holds the "Comments" label and the field: the nearest one up from the field.
      let box = field.parent
      while (box && !(box.props?.onLayout && box.findAll((node: any) => node.props?.children === 'Comments').length)) box = box.parent
      const scroll = screen.UNSAFE_getByType(ScrollView)
      const scrollTo = jest.fn()
      scroll.instance.scrollTo = scrollTo
      fireEvent(scroll, 'layout', layout(0, room))
      fireEvent(box, 'layout', layout(y, 120))
      return { field, scroll, scrollTo, box }
    }
    const typing = (screen: any, on: boolean) => screen.UNSAFE_getByType(TextInput).instance.isFocused.mockReturnValue(on)

    it('scrolls to the field when it takes the focus', () => {
      const screen = reasonForm()
      const { field, scrollTo } = wire(screen)
      typing(screen, true)
      fireEvent(field, 'focus')
      expect(scrollTo).toHaveBeenCalledWith({ x: 0, y: 640, animated: true })
      typing(screen, false)
    })

    it('scrolls again when the scroll is laid out smaller by the keyboard while the field is focused', () => {
      // The focus comes before the keyboard lifts the bar: a long list of reasons left the field far below, and
      // the scroll could not go that far until its room had shrunk.
      const screen = reasonForm()
      const { field, scroll, scrollTo } = wire(screen, 640, 600)
      typing(screen, true)
      fireEvent(field, 'focus')
      scrollTo.mockClear()
      fireEvent(scroll, 'layout', layout(0, 300))
      expect(scrollTo).toHaveBeenCalledWith({ x: 0, y: 640, animated: true })
      typing(screen, false)
    })

    it('scrolls again when the keyboard has finished showing, and when the field grows as it is typed in', () => {
      const { Keyboard } = require('react-native')
      const listeners: Array<() => void> = []
      const add = jest.spyOn(Keyboard, 'addListener').mockImplementation(((event: string, cb: () => void) => {
        if (event === 'keyboardDidShow') listeners.push(cb)
        return { remove: jest.fn() }
      }) as any)
      const screen = reasonForm()
      const { field, box, scrollTo } = wire(screen, 640, 300)
      typing(screen, true)
      fireEvent(field, 'focus')
      scrollTo.mockClear()
      listeners.forEach((cb) => cb())
      expect(scrollTo).toHaveBeenCalledWith({ x: 0, y: 640, animated: true })
      scrollTo.mockClear()
      // The field outgrows the room: its end stays in sight.
      fireEvent(box, 'layout', layout(640, 500))
      expect(scrollTo).toHaveBeenCalledWith({ x: 0, y: 840, animated: true })
      typing(screen, false)
      add.mockRestore()
    })

    it('does not move the scroll when it is laid out while the field is not focused', () => {
      const screen = reasonForm()
      const { scroll, scrollTo } = wire(screen)
      typing(screen, false)
      fireEvent(scroll, 'layout', layout(0, 300))
      expect(scrollTo).not.toHaveBeenCalled()
    })

    // The rule the app had at 4224c69 and keeps: the comment is what the action needs; a reason is picked from
    // the list but not required (the server takes the action without one).
    it('keeps the action off with a reason chosen and no comment', () => {
      const { getByTestId } = reasonForm('reject')
      expect(getByTestId('order-action').props.accessibilityState.disabled).toBe(true)
      fireEvent.press(getByTestId('reject-reason-very_far_away'))
      expect(getByTestId('order-action').props.accessibilityState.disabled).toBe(true)
    })

    it('enables the action with a comment and no reason chosen', () => {
      const { getByPlaceholderText, getByTestId } = reasonForm('reject')
      fireEvent.changeText(getByPlaceholderText('Please type your comments in here'), 'too far')
      expect(getByTestId('order-action').props.accessibilityState.disabled).toBe(false)
    })
  })

  describe('over the keyboard on Android', () => {
    const form = () => renderWithProviders(
      <AcceptOrRejectOrder
        orderTitle={driverOrderTitle}
        appTitle={driverAppTitle}
        orderId={1}
        closeModal={jest.fn()}
        action='pickupFailed'
        actions={{ pickupFailed: 'pickupFailedByDriver' }}
        handleUpdateOrder={jest.fn()}
        isPage
      />
    )

    it.each([[63, 'a stack screen (the activity pads it by the status bar)'], [0, 'a modal (its own window starts at the screen\'s top)']])('gives its avoiding view the window\'s distance, %d for %s', async (top) => {
      const android = onAndroid(top)
      const screen = form()
      await layoutWindowOf(screen.UNSAFE_getByType(KeyboardAvoidingView))
      expect(screen.UNSAFE_getByType(KeyboardAvoidingView).props.keyboardVerticalOffset).toBe(top)
      expect(screen.getByTestId('order-bottom-bar')).toBeTruthy()
      android.restore()
    })
  })

  describe('the bottom bar (harmony H6)', () => {
    const { StyleSheet } = require('react-native')
    const { defaultAppTheme } = require('../../../../../theme/engine')
    const { nativeBoxStyle } = require('../../../../../theme/helpers')
    const theme = defaultAppTheme()
    const bar = theme.native.components.bottom_bar.base
    const minimum = theme.native.components.bottom_nav.base.min_bottom_space
    const base = {
      orderTitle: { ...driverOrderTitle, forcePickUp: { key: 'FORCE_PICKUP', text: 'Force pickup', btnKey: 'CONFIRM', btnText: 'Confirm' } },
      appTitle: driverAppTitle,
      orderId: 1,
      closeModal: jest.fn()
    }
    const failed = (props: any = {}) => renderWithProviders(
      <AcceptOrRejectOrder {...base} action='deliveryFailed' actions={{ deliveryFailed: 'deliveryFailedByDriver' }} handleUpdateOrder={jest.fn()} {...props} />
    )
    const barStyle = (screen: any) => StyleSheet.flatten(screen.getByTestId('order-bottom-bar').props.style)
    afterEach(() => { mockSafeAreaInsets.top = 0; mockSafeAreaInsets.bottom = 0 })

    it('paints the app\'s bottom bar: its background, its top border, its shadow and its padding', () => {
      const style = barStyle(failed({ isPage: true }))
      expect(style).toEqual(expect.objectContaining(nativeBoxStyle({ background: bar.background, shadow: bar.shadow })))
      expect(style.backgroundColor).toBe(bar.background)
      // The bar is flat by default (its top line separates it); a theme with shadows gives it the shadow Identity says.
      expect(style.shadowOpacity ?? 0).toBe(bar.shadow?.shadowOpacity ?? 0)
      expect(style.borderTopWidth).toBe(bar.border_top.borderWidth)
      expect(style.paddingTop).toBe(bar.padding)
    })

    it.each([[true], [false]])('keeps the system\'s inset under its button itself, down to the bottom of the screen (as a page: %s)', (isPage) => {
      mockSafeAreaInsets.bottom = 34
      mockSafeAreaInsets.top = 47
      const screen = failed({ isPage })
      expect(barStyle(screen).paddingBottom).toBe(bar.padding + 34)
    })

    it('keeps the theme\'s minimum under its button when the system gives no inset', () => {
      expect(minimum).toBeGreaterThan(0)
      expect(barStyle(failed({ isPage: true })).paddingBottom).toBe(bar.padding + minimum)
    })

    it('keeps an action the location requirements block painted off and answering: it opens the requirements', async () => {
      ;(useConfig as jest.Mock).mockReturnValue([{
        configs: {
          disable_delivery_priority: { value: '1' },
          location_validation_enabled_status_9: { value: '1' },
          location_validation_distance_status_9: { value: '100' }
        }
      }])
      const handleUpdateOrder = jest.fn()
      // The store is far from where the driver is (the mocked location).
      const order = { id: 1, status: 3, business: { location: { lat: 0, lng: 0 } } }
      const screen = renderWithProviders(
        <AcceptOrRejectOrder {...base} isPage action='forcePickUp' actions={{ forcePickUp: 'forcePickUp' }} order={order} handleUpdateOrder={handleUpdateOrder} />
      )
      // The forced pickup asks for its comment first: the requirements are what blocks it after that.
      fireEvent.changeText(screen.getByPlaceholderText('Please type your comments in here'), 'forgot to complete the location')
      const action = () => screen.getByTestId('order-action')
      /** The opacity of the boxes between the button and the bar: the bar itself is never faded. */
      const fade = () => {
        const found: number[] = []
        for (let node: any = action().parent; node && node.props.testID !== 'order-bottom-bar'; node = node.parent) {
          const opacity = typeof node.type === 'string' ? StyleSheet.flatten(node.props.style)?.opacity : undefined
          if (opacity !== undefined) found.push(opacity)
        }
        return found
      }
      await waitFor(() => expect(fade()).toEqual([theme.native.tokens.opacity.disabled]))
      expect(barStyle(screen).opacity).toBeUndefined()
      // Blocked is not disabled: the button still takes the tap.
      expect(action().props.accessibilityState.disabled).toBe(false)
      fireEvent.press(action())
      expect(await screen.findByText('Requirements Not Met')).toBeTruthy()
      expect(handleUpdateOrder).not.toHaveBeenCalled()
    })
  })

  describe('texts by their role (decision H7)', () => {
    const { StyleSheet } = require('react-native')
    const { defaultAppTheme } = require('../../../../../theme/engine')
    const theme = defaultAppTheme()
    const flat = (node: any) => StyleSheet.flatten(node.props.style)
    const base = {
      isPage: true,
      orderTitle: { ...driverOrderTitle, forceStatus: { key: 'REASON_REQUIRED', text: 'Reason required', btnKey: 'CONFIRM', btnText: 'Confirm' } },
      appTitle: driverAppTitle,
      orderId: 1,
      handleUpdateOrder: jest.fn(),
      closeModal: jest.fn()
    }
    // A rejection (status 6) asks for a photo: its screen has the reasons and the photo, one under the other.
    const withImage = () => (useConfig as jest.Mock).mockReturnValue([{
      configs: { disable_delivery_priority: { value: '1' }, states_requiring_image_driver: { value: '6' } }
    }])
    const rejectScreen = () => renderWithProviders(<AcceptOrRejectOrder {...base} action='reject' actions={{ reject: 'rejectByDriver' }} />)

    it('writes the texts under the screen\'s title as leads: body_lg', () => {
      const lead = theme.native.tokens.typography.body_lg
      const reject = renderWithProviders(
        <AcceptOrRejectOrder {...base} action='reject' customerCellphone='5551234' notShowCustomerPhone={false} actions={{ reject: 'rejectByDriver' }} />
      )
      ;[/Call your customer to resolve the issue/, 'Mark the order as rejected'].forEach((text) => {
        expect(flat(reject.getByText(text)).fontSize).toBe(lead.fontSize)
        expect(flat(reject.getByText(text)).lineHeight).toBe(lead.lineHeight)
      })
      reject.unmount()
      const regression = renderWithProviders(
        <AcceptOrRejectOrder {...base} action='forceStatus' actions={{ forceStatus: 'forceStatus' }} pendingStatusBody={{ status: 3 }} />
      )
      expect(flat(regression.getByText(/Moving an order back to a previous status/)).fontSize).toBe(lead.fontSize)
    })

    it('labels the status image and the reasons as fields: 14 and semibold, as the board draws them (not section titles)', () => {
      withImage()
      const field = theme.native.components.field.base
      const reject = rejectScreen()
      const image = flat(reject.getByText('Upload status image'))
      const reasons = flat(reject.getByText('What happened?'))
      expect(image).toEqual(reasons)
      expect(image.fontSize).toBe(field.label.fontSize)
      expect(image.fontFamily).toBe(field.label.fontFamily)
      expect(image.color).toBe(field.label_color)
    })

    it('puts `xs` from a label to its content on the screen: the image block\'s gap, and the reasons right under theirs', () => {
      withImage()
      const xs = theme.native.tokens.space.xs
      const reject = rejectScreen()
      expect(flat(reject.getByTestId('status-image')).gap).toBe(xs)
      // The first reason\'s own outer margin (`xs`) is the room under the label: no negative margin pulls the list up.
      const firstReason = reject.getByTestId('reject-reasons').findAll((node: any) => node.props?.testID?.startsWith('reject-reason-'))[0]
      let pulled = false
      for (let up = firstReason.parent; up; up = up.parent) if (StyleSheet.flatten(up.props?.style)?.marginTop < 0) pulled = true
      expect(pulled).toBe(false)
    })

    it('draws the camera tile as tall as the thumbnail with the glyph beside its text, on the screen', () => {
      withImage()
      const request = theme.native.components.order_request.base
      const { getByTestId } = rejectScreen()
      const tile = flat(getByTestId('status-image-picker'))
      expect(request.photo_size).toBe(72)
      expect(tile).toEqual(expect.objectContaining({ height: request.photo_size, flexDirection: 'row' }))
    })

    it('draws the taken photo as the sheet does: a 72 thumbnail and "Remove image", 44 high, filling the row', async () => {
      withImage()
      const request = theme.native.components.order_request.base
      const { getByTestId, findByRole, UNSAFE_getAllByType } = rejectScreen()
      fireEvent.press(getByTestId('status-image-picker'))
      const remove = await findByRole('button', { name: 'Remove image' })
      expect(flat(remove.children[0]).minHeight).toBe(44)
      expect(flat(remove.children[0]).flex).toBeUndefined()
      expect(flat(getByTestId('status-image-remove'))).toEqual(expect.objectContaining({ flex: 1, justifyContent: 'center' }))
      expect(flat(getByTestId('status-image-row'))).toEqual(expect.objectContaining({ flexDirection: 'row', alignItems: 'center' }))
      const thumb = UNSAFE_getAllByType(Image).map((node: any) => flat(node)).find((style: any) => style?.width === request.photo_size)
      expect(thumb).toEqual(expect.objectContaining({ width: 72, height: 72 }))
    })

    it('lays its blocks under the bar\'s own `xs`: the content adds no space above itself', () => {
      const { UNSAFE_getByType } = renderWithProviders(<AcceptOrRejectOrder {...base} action='reject' actions={{ reject: 'rejectByDriver' }} />)
      const content = StyleSheet.flatten(UNSAFE_getByType(ScrollView).props.contentContainerStyle)
      expect(content.paddingTop).toBeUndefined()
      expect(content.paddingBottom).toBe(theme.native.tokens.space.md)
      expect(content.gap).toBe(theme.native.tokens.space.md)
    })

    it('writes the missing image as the field\'s error, at the start', () => {
      withImage()
      const field = theme.native.components.field.base
      const { getByTestId } = rejectScreen()
      const error = flat(getByTestId('status-image-error'))
      expect(error.fontSize).toBe(field.error.fontSize)
      expect(error.color).toBe(field.error_color)
      expect(error.marginTop).toBe(field.message_gap)
      expect(error.textAlign).toBe('auto')
    })

    it('writes a failed status change as the field\'s error, at the start when no code is asked', async () => {
      const field = theme.native.components.field.base
      const handleUpdateOrder = jest.fn().mockResolvedValue(null)
      const screen = renderWithProviders(
        <AcceptOrRejectOrder {...base} action='accept' actions={{ accept: 'acceptByDriver' }} handleUpdateOrder={handleUpdateOrder} orderError={['The order changed']} />
      )
      fireEvent.press(screen.getByText('Accept'))
      const error = flat(await screen.findByTestId('order-action-error'))
      expect(screen.getByText('The order changed')).toBeTruthy()
      expect(error.color).toBe(field.error_color)
      expect(error.textAlign).toBe('auto')
    })
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

  it.each([
    ['reject', 'rejectByDriver', 6],
    ['pickupFailed', 'pickupFailedByDriver', 10],
    ['deliveryFailed', 'deliveryFailedByDriver', 12],
    ['notReady', 'orderNotReady', 14],
    ['forcePickUp', 'forcePickUp', 9],
    ['forceDelivery', 'forceDelivery', 11]
  ])('sends the status %s maps to, with the order id, the reason and the comment', async (action, key, status) => {
    const handleUpdateOrder = jest.fn().mockResolvedValue(undefined)
    const screen = renderWithProviders(
      <AcceptOrRejectOrder
        isPage
        action={action}
        orderTitle={driverOrderTitle}
        appTitle={driverAppTitle}
        orderId={7}
        actions={{ [action]: key }}
        handleUpdateOrder={handleUpdateOrder}
        closeModal={jest.fn()}
      />
    )
    // Nothing is sent before the comment is written.
    expect(screen.getByTestId('order-action').props.accessibilityState.disabled).toBe(true)
    fireEvent.press(screen.getByTestId('reject-reason-other'))
    fireEvent.changeText(screen.getByPlaceholderText('Please type your comments in here'), 'a comment')
    fireEvent.press(screen.getByTestId('order-action'))
    await waitFor(() => expect(handleUpdateOrder).toHaveBeenCalledTimes(1))
    expect(handleUpdateOrder).toHaveBeenCalledWith(
      status,
      expect.objectContaining({ id: 7, status, reasons: 'a comment', reject_reason: 'other' }),
      undefined
    )
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
