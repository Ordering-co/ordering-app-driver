import '../../../../../../jest/helpers/uiModuleMocks'
import React from 'react'
import { AccessibilityInfo, Alert } from 'react-native'
import { act, fireEvent, waitFor } from '@testing-library/react-native'

import { useConfig, useSession } from '@components'

jest.mock('../../OrderDetails/OrderHeaderComponent', () => {
  const React = require('react')
  const { Text, View } = require('react-native')
  return {
    OrderHeaderComponent: ({ order }: any) =>
      React.createElement(View, { testID: 'order-header' },
        React.createElement(Text, null, `Order ${order?.id}`)
      )
  }
})

jest.mock('../../OrderDetails/OrderContentComponent', () => {
  const React = require('react')
  const { Text, View } = require('react-native')
  return {
    OrderContentComponent: ({ order }: any) =>
      React.createElement(View, { testID: 'order-content' },
        React.createElement(Text, null, order?.business?.name || 'content')
      )
  }
})

jest.mock('@ui', () => {
  const React = require('react')
  const { View } = require('react-native')
  const { buildD4MessagesUiMock } = require('../../../../../../jest/helpers/d4MessagesUiMock')
  const mock = buildD4MessagesUiMock()
  // The bar's stand-in keeps its test ids; each button is the app's real one, so the press-and-hold flags the
  // screen passes decide what a tap and a hold do, as in the real bar.
  mock.FloatingButton = ({ firstButtonClick, secondButtonClick, firstButtonHold, secondButtonHold, btnText, secondBtnText, secondButton }: any) => {
    const { OButton } = require('../../shared')
    return React.createElement(
      View,
      { testID: 'floating-button-stub' },
      React.createElement(OButton, { testID: 'floating-first', text: btnText || 'First', onClick: firstButtonClick, hold: firstButtonHold }),
      (secondButton || secondButtonClick) && React.createElement(OButton, { testID: 'floating-second', text: secondBtnText || 'Second', onClick: secondButtonClick, hold: secondButtonHold })
    )
  }
  // The stand-in of the alert shows whether it was raised as a notice (one button) or as a question.
  const alertStub = mock.OAlertOriginal
  mock.OAlertOriginal = (props: any) =>
    React.createElement(View, { testID: 'alert-kind', accessibilityHint: props.notice ? 'notice' : 'question' }, alertStub(props))
  // The sheet that asks the delivery time is the app's real accept view (it needs the offline queue's state).
  delete mock.AcceptOrRejectOrder
  mock.useOfflineActions = jest.fn(() => [
    { isNetConnected: true, canSaveChangesOffline: false, actions: {}, orders: null },
    { applyOffAction: jest.fn(), registerOffOrder: jest.fn(), setState: jest.fn() }
  ])
  return mock
})

jest.mock('@components', () => {
  const mockOrdering = require('../../../../../../jest/helpers/mockOrdering')
  const { renderUiController } = require('../../../../../../jest/helpers/d1ShellDefaults')
  const { orderDetailsDefaults } = require('../../../../../../jest/helpers/d4MessagesDefaults')
  return {
    ...mockOrdering,
    OrderDetails: renderUiController(orderDetailsDefaults),
    // The bottom bar's controller of the accept view's own bar.
    FloatingButton: renderUiController({})
  }
})

// What the screen does when the app has to catch up (the provider's own suite covers when it is told).
let mockReconnect: (() => void) | undefined
jest.mock('../../../../../context/SocketReconnectContext', () => ({
  useOnReconnect: (handler: () => void) => { mockReconnect = handler }
}))

import { OrderDetailsLogistic } from '..'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { sampleOrder } from '../../../../../../jest/helpers/d4MessagesDefaults'
const { holdPress, tapPress, holdMs } = require('../../../../../../jest/helpers/holdPress')

describe('OrderDetailsLogistic', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useConfig as jest.Mock).mockReturnValue([{ configs: {} }])
    ;(useSession as jest.Mock).mockReturnValue([{ user: { id: 1, level: 4 } }, {}])
  })

  it('renders order header and content', () => {
    const { getByTestId, getByText } = renderWithProviders(<OrderDetailsLogistic />)
    expect(getByTestId('order-header')).toBeTruthy()
    expect(getByText('Store A')).toBeTruthy()
  })

  it('loads the request again when the socket comes back', () => {
    const getOrder = jest.fn()
    renderWithProviders(<OrderDetailsLogistic getOrder={getOrder} />)
    mockReconnect!()
    expect(getOrder).toHaveBeenCalledTimes(1)
  })

  it('does not load the request again while it is being answered: the older GET could answer after the PUT', async () => {
    const getOrder = jest.fn()
    let answer: (value?: any) => void = () => {}
    const handleClickLogisticOrder = jest.fn(() => new Promise((resolve) => { answer = resolve }))
    const { getByTestId } = renderWithProviders(
      <OrderDetailsLogistic
        getOrder={getOrder}
        handleClickLogisticOrder={handleClickLogisticOrder}
        navigation={{ goBack: jest.fn(), canGoBack: () => true, navigate: jest.fn() }}
      />
    )
    tapPress(getByTestId('floating-second'))
    expect(handleClickLogisticOrder).toHaveBeenCalledTimes(1)
    mockReconnect!()
    expect(getOrder).not.toHaveBeenCalled()
    await act(async () => { answer({ error: true }) })
    expect(getOrder).toHaveBeenCalledTimes(1)
  })

  it('shows accept and reject floating buttons for pending logistic order', () => {
    const { getByTestId, getByText } = renderWithProviders(<OrderDetailsLogistic />)
    expect(getByTestId('floating-button-stub')).toBeTruthy()
    expect(getByText('Reject')).toBeTruthy()
    expect(getByText('Accept')).toBeTruthy()
  })

  it('hands accept and reject to the bottom bar, on the page gutter and with no colors of its own', () => {
    const { FloatingButton } = require('@ui')
    const { UNSAFE_getByType } = renderWithProviders(<OrderDetailsLogistic />)
    const buttonProps = UNSAFE_getByType(FloatingButton).props
    expect(buttonProps.secondButton).toBe(true)
    expect(buttonProps.isPadding).toBe(true)
    expect(buttonProps.firstColorCustom).toBeUndefined()
    expect(buttonProps.secondColorCustom).toBeUndefined()
  })

  it('leaves the bottom bar\'s room under the order so the buttons do not cover the totals', () => {
    const { ScrollView, StyleSheet } = require('react-native')
    const { defaultAppTheme } = require('../../../../../theme/engine')
    const { bottomBarClearance, themeGutter } = require('../../../../../theme/helpers')
    const theme = defaultAppTheme()
    const { UNSAFE_getByType } = renderWithProviders(<OrderDetailsLogistic />)
    const content = StyleSheet.flatten(UNSAFE_getByType(ScrollView).props.contentContainerStyle)
    // Two buttons (accept over reject), measured from the theme.
    expect(content.paddingBottom).toBe(bottomBarClearance(theme, 0, 2))
    expect(content.paddingHorizontal).toBe(themeGutter(theme))
  })

  it('lays the order\'s sections out as the order\'s details do: the same content style', () => {
    const { ScrollView, StyleSheet } = require('react-native')
    const { defaultAppTheme } = require('../../../../../theme/engine')
    const { bottomBarClearance, themeSpace } = require('../../../../../theme/helpers')
    const { deliveryStyles } = require('../../OrderDetails/styles')
    const theme = defaultAppTheme()
    const { UNSAFE_getByType } = renderWithProviders(<OrderDetailsLogistic />)
    const content = StyleSheet.flatten(UNSAFE_getByType(ScrollView).props.contentContainerStyle)
    expect(content).toEqual(StyleSheet.flatten(deliveryStyles(theme, bottomBarClearance(theme, 0, 2)).content))
    // The sections have no margin of their own: the scroll puts the space between them.
    expect(content.gap).toBe(themeSpace(theme, 'lg'))
  })

  // The bar answers a request the driver can still answer: pending (0), ready for pickup (4), accepted by business (7) or
  // not ready (14). A request whose order is already the driver's (accepted 8, on the way 9, arrived 3 / 26, 23...) is a
  // plain details screen: its actions are the order's own, in its own details, not Accept / Reject of the request.
  it.each([0, 4, 7, 14])('shows Reject and Accept for a request whose order is at status %s', (status) => {
    const { queryByTestId } = renderWithProviders(
      <OrderDetailsLogistic order={{ order: { id: 101, status, business: { name: 'Store A' } }, loading: false, error: null }} />
    )
    expect(queryByTestId('floating-button-stub')).toBeTruthy()
  })

  it.each([3, 8, 9, 11, 23, 26])('shows no Reject / Accept when the order is already past the request (status %s: the driver\'s own)', (status) => {
    const { queryByTestId } = renderWithProviders(
      <OrderDetailsLogistic order={{ order: { id: 101, status, business: { name: 'Store A' } }, loading: false, error: null }} />
    )
    expect(queryByTestId('floating-button-stub')).toBeNull()
  })

  it('leaves the system\'s space under the order when there is no bottom bar', () => {
    const { ScrollView, StyleSheet } = require('react-native')
    const { defaultAppTheme } = require('../../../../../theme/engine')
    const { themeBottomSpace } = require('../../../../../theme/helpers')
    const { UNSAFE_getByType } = renderWithProviders(
      <OrderDetailsLogistic order={{ order: { id: 101, status: 8, business: { name: 'Store A' } }, loading: false, error: null }} />
    )
    const content = StyleSheet.flatten(UNSAFE_getByType(ScrollView).props.contentContainerStyle)
    expect(content.paddingBottom).toBe(themeBottomSpace(defaultAppTheme(), 0))
  })

  it('renders each order of a grouped request, with no layout prop of the old wrapper', () => {
    const { OrderContentComponent } = require('../../OrderDetails/OrderContentComponent')
    const orders = [{ id: 201, business: { name: 'Store B' } }, { id: 202, business: { name: 'Store C' } }]
    const { UNSAFE_getAllByType } = renderWithProviders(
      <OrderDetailsLogistic
        order={{
          order: { id: 101, status: 0, isLogistic: true, order_group_id: 9, order_group: { orders }, business: { name: 'Store A' } },
          loading: false,
          error: null
        }}
      />
    )
    const contents = UNSAFE_getAllByType(OrderContentComponent)
    expect(contents).toHaveLength(2)
    contents.forEach((content: any) => {
      expect(content.props.isOrderGroup).toBe(true)
      expect(content.props).not.toHaveProperty('lastOrder')
    })
  })

  it('leaves one button\'s room when the server turns rejecting off', () => {
    ;(useConfig as jest.Mock).mockReturnValue([{ configs: { reject_orders_enabled: { value: '0' } } }])
    const { ScrollView, StyleSheet } = require('react-native')
    const { defaultAppTheme } = require('../../../../../theme/engine')
    const { bottomBarClearance } = require('../../../../../theme/helpers')
    const { UNSAFE_getByType } = renderWithProviders(<OrderDetailsLogistic />)
    const content = StyleSheet.flatten(UNSAFE_getByType(ScrollView).props.contentContainerStyle)
    expect(content.paddingBottom).toBe(bottomBarClearance(defaultAppTheme(), 0, 1))
  })

  it('has a way back: the bar\'s back button over the order', () => {
    const goBack = jest.fn()
    const { getByLabelText } = renderWithProviders(
      <OrderDetailsLogistic navigation={{ goBack, canGoBack: () => true, navigate: jest.fn() }} />
    )
    fireEvent.press(getByLabelText('Go back'))
    expect(goBack).toHaveBeenCalledTimes(1)
  })

  describe('the bar, the same in every state of the screen (2026-11-17)', () => {
    it('says "Order" and, under it, the order\'s number once there is an order', () => {
      const { getByText } = renderWithProviders(<OrderDetailsLogistic />)
      expect(getByText('Order')).toBeTruthy()
      expect(getByText(/^No\. 101$/)).toBeTruthy()
    })

    it('is the external id when the project shows external ids', () => {
      ;(useConfig as jest.Mock).mockReturnValue([{ configs: { change_order_id: { value: '1' } } }])
      const { getByText } = renderWithProviders(
        <OrderDetailsLogistic order={{ order: { ...sampleOrder, external_id: 'EXT-9' }, loading: false, error: null }} />
      )
      expect(getByText(/^No\. EXT-9$/)).toBeTruthy()
    })

    it('has its back arrow and its title, without a number, while the order loads', () => {
      const { getByLabelText, queryByText } = renderWithProviders(
        <OrderDetailsLogistic order={{ order: {}, loading: true, error: null }} />
      )
      expect(getByLabelText('Go back')).toBeTruthy()
      expect(queryByText('Order')).toBeTruthy()
      expect(queryByText(/No\./)).toBeNull()
    })

    it('has its back arrow over the not-found message, which is not drawn twice or over a bar-less screen', () => {
      const goBack = jest.fn()
      const { getByLabelText, getByText, getAllByText, queryByTestId } = renderWithProviders(
        <OrderDetailsLogistic
          order={{ order: null, loading: false, error: ['Order missing'] }}
          navigation={{ navigate: jest.fn(), popTo: jest.fn(), goBack, canGoBack: () => true }}
        />
      )
      expect(getAllByText('Order missing')).toHaveLength(1)
      expect(getByText('Go to my orders')).toBeTruthy()
      expect(queryByTestId('order-header')).toBeNull()
      fireEvent.press(getByLabelText('Go back'))
      expect(goBack).toHaveBeenCalledTimes(1)
    })

    it('draws the bar once, above the order\'s header, with the order loaded', () => {
      const { getAllByLabelText } = renderWithProviders(<OrderDetailsLogistic />)
      expect(getAllByLabelText('Go back')).toHaveLength(1)
    })
  })

  it('accepts logistic order from floating button', async () => {
    const handleClickLogisticOrder = jest.fn()
    const goBack = jest.fn()
    const { getByTestId } = renderWithProviders(
      <OrderDetailsLogistic
        handleClickLogisticOrder={handleClickLogisticOrder}
        navigation={{ goBack, canGoBack: () => true, navigate: jest.fn() }}
      />
    )
    tapPress(getByTestId('floating-second'))
    expect(handleClickLogisticOrder).toHaveBeenCalledWith(1, 55, expect.objectContaining({ id: 101 }))
    await waitFor(() => expect(goBack).toHaveBeenCalled())
  })

  describe('the lists are told once per answer that took (they do not wait for a socket)', () => {
    /** What the screen announced: the app's event, one entry per change. */
    const announced = () => {
      const { useEvent } = require('@components')
      const [events] = useEvent()
      return events.emit.mock.calls.filter((call: any[]) => call[0] === 'driver_order_changed').map((call: any[]) => call[1])
    }
    const navigation = () => ({ goBack: jest.fn(), canGoBack: () => true, navigate: jest.fn() })

    it('accepted: once, with the orders it brought, and the orders list is asked for too', async () => {
      ;(useConfig as jest.Mock).mockReturnValue([{ configs: { hidden_driver_eta_time: { value: '1' } } }])
      const handleClickLogisticOrder = jest.fn().mockResolvedValue({ error: false, order: { id: 101 }, orderIds: [101, 102], defaultEta: null })
      const { getByTestId } = renderWithProviders(
        <OrderDetailsLogistic handleClickLogisticOrder={handleClickLogisticOrder} navigation={navigation()} />
      )
      tapPress(getByTestId('floating-second'))
      await waitFor(() => expect(announced()).toEqual([{ orderIds: [101, 102], request: true, accepted: true }]))
    })

    it('rejected: once, for the requests only; the answer comes after the screen already went back', async () => {
      let answer: (value?: any) => void = () => {}
      const handleClickLogisticOrder = jest.fn(() => new Promise((resolve) => { answer = resolve }))
      const nav = navigation()
      const screen = renderWithProviders(
        <OrderDetailsLogistic handleClickLogisticOrder={handleClickLogisticOrder} navigation={nav} />
      )
      await holdPress(screen.getByTestId('floating-first'))
      await waitFor(() => expect(nav.goBack).toHaveBeenCalledTimes(1))
      expect(announced()).toEqual([])
      screen.unmount()
      await act(async () => { answer({ error: false }) })
      expect(announced()).toEqual([{ orderIds: [101], request: true, accepted: false }])
    })

    it('an answer that failed, threw or never took tells nothing', async () => {
      const failed = jest.fn().mockResolvedValue({ error: true, result: 'Taken' })
      const first = renderWithProviders(<OrderDetailsLogistic handleClickLogisticOrder={failed} navigation={navigation()} />)
      tapPress(first.getByTestId('floating-second'))
      await waitFor(() => expect(failed).toHaveBeenCalledTimes(1))
      first.unmount()
      const thrown = jest.fn().mockRejectedValue(new Error('down'))
      const second = renderWithProviders(<OrderDetailsLogistic handleClickLogisticOrder={thrown} navigation={navigation()} />)
      await holdPress(second.getByTestId('floating-first'))
      await waitFor(() => expect(thrown).toHaveBeenCalledTimes(1))
      await act(async () => {})
      expect(announced()).toEqual([])
    })

    it('the delivery time saved after the accept is a change of its own: told once for the orders that saved, none when it did not', async () => {
      ;(useConfig as jest.Mock).mockReturnValue([{ configs: { disable_delivery_priority: { value: '1' } } }])
      const handleClickLogisticOrder = jest.fn().mockResolvedValue({ error: false, order: { id: 101 }, orderIds: [101], defaultEta: null })
      const handleUpdateLogisticOrdersEta = jest.fn().mockResolvedValueOnce([null]).mockResolvedValue([{ id: 101 }])
      const screen = renderWithProviders(
        <OrderDetailsLogistic
          handleClickLogisticOrder={handleClickLogisticOrder}
          handleUpdateLogisticOrdersEta={handleUpdateLogisticOrdersEta}
          navigation={navigation()}
        />
      )
      tapPress(screen.getByTestId('floating-second'))
      await waitFor(() => expect(screen.getByTestId('order-sheet')).toBeTruthy())
      // The answer to the request is told as it comes; the time is told on its own.
      expect(announced()).toEqual([{ orderIds: [101], request: true, accepted: true }])
      await act(async () => { fireEvent.press(screen.getByTestId('order-action')) })
      await waitFor(() => expect(handleUpdateLogisticOrdersEta).toHaveBeenCalledTimes(1))
      expect(announced()).toHaveLength(1)
      await act(async () => { fireEvent.press(screen.getByTestId('order-action')) })
      await waitFor(() => expect(handleUpdateLogisticOrdersEta).toHaveBeenCalledTimes(2))
      expect(announced()).toEqual([
        { orderIds: [101], request: true, accepted: true },
        { orderIds: [101] }
      ])
    })
  })

  describe('asks for the delivery time after accepting a logistic order: a sheet over the request, not a route', () => {
    const accepted = { error: false, order: { id: 101 }, orderIds: [101], defaultEta: null }
    const renderAccepted = (etaAnswer: any) => {
      ;(useConfig as jest.Mock).mockReturnValue([{ configs: { disable_delivery_priority: { value: '1' } } }])
      const handleClickLogisticOrder = jest.fn().mockResolvedValue(accepted)
      const handleUpdateLogisticOrdersEta = jest.fn().mockResolvedValue(etaAnswer)
      const navigation = { goBack: jest.fn(), replace: jest.fn(), navigate: jest.fn(), canGoBack: () => true }
      const screen = renderWithProviders(
        <OrderDetailsLogistic
          handleClickLogisticOrder={handleClickLogisticOrder}
          handleUpdateLogisticOrdersEta={handleUpdateLogisticOrdersEta}
          navigation={navigation}
        />
      )
      return { screen, navigation, handleClickLogisticOrder, handleUpdateLogisticOrdersEta }
    }

    it('opens the sheet over the request with no navigation, sends the time once and goes back to the list when it was saved', async () => {
      const { screen, navigation, handleClickLogisticOrder, handleUpdateLogisticOrdersEta } = renderAccepted([{ id: 101 }])
      tapPress(screen.getByTestId('floating-second'))
      expect(handleClickLogisticOrder).toHaveBeenCalledTimes(1)
      await waitFor(() => expect(screen.getByTestId('order-sheet')).toBeTruthy())
      expect(navigation.replace).not.toHaveBeenCalled()
      expect(navigation.navigate).not.toHaveBeenCalled()
      expect(navigation.goBack).not.toHaveBeenCalled()
      // The request is still behind the sheet.
      expect(screen.getByTestId('order-header')).toBeTruthy()
      fireEvent.press(screen.getByTestId('order-action'))
      await waitFor(() => expect(navigation.goBack).toHaveBeenCalledTimes(1))
      expect(screen.queryByTestId('order-sheet')).toBeNull()
      expect(handleUpdateLogisticOrdersEta).toHaveBeenCalledTimes(1)
      expect(handleUpdateLogisticOrdersEta).toHaveBeenCalledWith([101], expect.any(Number))
      expect(navigation.replace).not.toHaveBeenCalled()
    })

    it('keeps the sheet, and stays on the request, when the time was not saved', async () => {
      const { screen, navigation, handleUpdateLogisticOrdersEta } = renderAccepted([])
      tapPress(screen.getByTestId('floating-second'))
      await waitFor(() => expect(screen.getByTestId('order-sheet')).toBeTruthy())
      fireEvent.press(screen.getByTestId('order-action'))
      await waitFor(() => expect(handleUpdateLogisticOrdersEta).toHaveBeenCalledTimes(1))
      expect(screen.getByTestId('order-sheet')).toBeTruthy()
      expect(navigation.goBack).not.toHaveBeenCalled()
    })

    it('a delivery time that did not save keeps the sheet with a sentence, and the next tap saves it and goes back', async () => {
      const { screen, navigation, handleUpdateLogisticOrdersEta } = renderAccepted([null])
      tapPress(screen.getByTestId('floating-second'))
      await waitFor(() => expect(screen.getByTestId('order-sheet')).toBeTruthy())
      fireEvent.press(screen.getByTestId('order-action'))
      await waitFor(() => expect(screen.getByText('The change was not saved. Try again.')).toBeTruthy())
      expect(screen.getByTestId('order-sheet')).toBeTruthy()
      expect(navigation.goBack).not.toHaveBeenCalled()
      handleUpdateLogisticOrdersEta.mockResolvedValueOnce([{ id: 101 }])
      fireEvent.press(screen.getByTestId('order-action'))
      await waitFor(() => expect(navigation.goBack).toHaveBeenCalledTimes(1))
      expect(handleUpdateLogisticOrdersEta).toHaveBeenCalledTimes(2)
      expect(screen.queryByTestId('order-sheet')).toBeNull()
    })

    describe('a request that groups several orders: the sheet speaks for the group', () => {
      const group = {
        error: false,
        order: { id: 101, order_group_id: 9, order_group: { orders: [{ id: 101 }, { id: 102 }] } },
        orderIds: [101, 102],
        defaultEta: null
      }
      const renderGroup = (etaAnswer: any) => {
        ;(useConfig as jest.Mock).mockReturnValue([{ configs: { disable_delivery_priority: { value: '1' } } }])
        const handleUpdateLogisticOrdersEta = jest.fn().mockResolvedValue(etaAnswer)
        const navigation = { goBack: jest.fn(), replace: jest.fn(), navigate: jest.fn(), canGoBack: () => true }
        const screen = renderWithProviders(
          <OrderDetailsLogistic
            handleClickLogisticOrder={jest.fn().mockResolvedValue(group)}
            handleUpdateLogisticOrdersEta={handleUpdateLogisticOrdersEta}
            navigation={navigation}
          />
        )
        return { screen, navigation, handleUpdateLogisticOrdersEta }
      }

      it('says the count in its title, and the group and its orders on one line', async () => {
        const { screen } = renderGroup([{}, {}])
        tapPress(screen.getByTestId('floating-second'))
        await waitFor(() => expect(screen.getByTestId('order-sheet')).toBeTruthy())
        expect(screen.getByText('Accept 2 orders')).toBeTruthy()
        const line = screen.getByTestId('group-orders-line')
        expect(line.props.children).toBe('Group No. 9 · Orders No. 101, 102')
        expect(line.props.numberOfLines).toBe(1)
      })

      it('a time saved for one order only keeps the sheet, says how many did not change and the retry sends only that one', async () => {
        const { screen, navigation, handleUpdateLogisticOrdersEta } = renderGroup([{ id: 101 }, null])
        tapPress(screen.getByTestId('floating-second'))
        await waitFor(() => expect(screen.getByTestId('order-sheet')).toBeTruthy())
        fireEvent.press(screen.getByTestId('order-action'))
        await waitFor(() => expect(screen.getByText('Orders that did not change: 1')).toBeTruthy())
        expect(navigation.goBack).not.toHaveBeenCalled()
        handleUpdateLogisticOrdersEta.mockResolvedValueOnce([{ id: 102 }])
        fireEvent.press(screen.getByTestId('order-action'))
        await waitFor(() => expect(navigation.goBack).toHaveBeenCalledTimes(1))
        expect(handleUpdateLogisticOrdersEta.mock.calls[0][0]).toEqual([101, 102])
        expect(handleUpdateLogisticOrdersEta.mock.calls[1][0]).toEqual([102])
      })
    })

    it('a single request keeps the sheet of one order', async () => {
      const { screen } = renderAccepted([{ id: 101 }])
      tapPress(screen.getByTestId('floating-second'))
      await waitFor(() => expect(screen.getByTestId('order-sheet')).toBeTruthy())
      expect(screen.getByText('Accept order')).toBeTruthy()
      expect(screen.queryByTestId('group-orders-line')).toBeNull()
    })

    it('goes back to the list when the sheet is closed: the request is already accepted', async () => {
      const { screen, navigation, handleUpdateLogisticOrdersEta } = renderAccepted([{ id: 101 }])
      tapPress(screen.getByTestId('floating-second'))
      await waitFor(() => expect(screen.getByTestId('order-sheet')).toBeTruthy())
      fireEvent.press(screen.getByLabelText('Close'))
      expect(screen.queryByTestId('order-sheet')).toBeNull()
      expect(navigation.goBack).toHaveBeenCalledTimes(1)
      expect(handleUpdateLogisticOrdersEta).not.toHaveBeenCalled()
    })
  })

  it('keeps the single tap accept on projects with a default logistic eta', async () => {
    const handleClickLogisticOrder = jest.fn().mockResolvedValue({
      error: false,
      order: { id: 101 },
      orderIds: [101],
      defaultEta: 10
    })
    const replace = jest.fn()
    const goBack = jest.fn()
    const { getByTestId } = renderWithProviders(
      <OrderDetailsLogistic
        handleClickLogisticOrder={handleClickLogisticOrder}
        handleUpdateLogisticOrdersEta={jest.fn()}
        navigation={{ goBack, replace, canGoBack: () => true, navigate: jest.fn() }}
      />
    )
    tapPress(getByTestId('floating-second'))

    await waitFor(() => expect(goBack).toHaveBeenCalled())
    expect(replace).not.toHaveBeenCalled()
  })

  it('goes back without asking for delivery time when accepting fails', async () => {
    const handleClickLogisticOrder = jest.fn().mockResolvedValue({ error: true })
    const handleUpdateLogisticOrdersEta = jest.fn()
    const replace = jest.fn()
    const goBack = jest.fn()
    const { getByTestId } = renderWithProviders(
      <OrderDetailsLogistic
        handleClickLogisticOrder={handleClickLogisticOrder}
        handleUpdateLogisticOrdersEta={handleUpdateLogisticOrdersEta}
        navigation={{ goBack, replace, canGoBack: () => true, navigate: jest.fn() }}
      />
    )
    tapPress(getByTestId('floating-second'))

    await waitFor(() => expect(goBack).toHaveBeenCalled())
    expect(replace).not.toHaveBeenCalled()
  })

  it('rejects logistic order from floating button', async () => {
    const handleClickLogisticOrder = jest.fn()
    const goBack = jest.fn()
    const { getByTestId } = renderWithProviders(
      <OrderDetailsLogistic
        handleClickLogisticOrder={handleClickLogisticOrder}
        navigation={{ goBack, canGoBack: () => true, navigate: jest.fn() }}
      />
    )
    await holdPress(getByTestId('floating-first'))
    expect(handleClickLogisticOrder).toHaveBeenCalledWith(2, 55, expect.objectContaining({ id: 101 }))
  })

  describe('answering the request: accepting is a single tap, rejecting is held', () => {
    const renderRequest = () => {
      const handleClickLogisticOrder = jest.fn().mockResolvedValue({ error: true })
      const goBack = jest.fn()
      const screen = renderWithProviders(
        <OrderDetailsLogistic
          handleClickLogisticOrder={handleClickLogisticOrder}
          navigation={{ goBack, canGoBack: () => true, navigate: jest.fn() }}
        />
      )
      return { screen, handleClickLogisticOrder, goBack }
    }

    it('accept: one tap answers once, with no hint', async () => {
      const { screen, handleClickLogisticOrder, goBack } = renderRequest()
      tapPress(screen.getByTestId('floating-second'))
      await waitFor(() => expect(goBack).toHaveBeenCalled())
      expect(handleClickLogisticOrder).toHaveBeenCalledTimes(1)
      expect(handleClickLogisticOrder).toHaveBeenCalledWith(1, 55, expect.objectContaining({ id: 101 }))
      expect(screen.queryByText('Hold to confirm')).toBeNull()
    })

    it('reject: a tap answers nothing and leaves the screen; the completed hold answers once', async () => {
      const { screen, handleClickLogisticOrder, goBack } = renderRequest()
      tapPress(screen.getByTestId('floating-first'))
      await holdPress(screen.getByTestId('floating-first'), holdMs() - 100)
      expect(handleClickLogisticOrder).not.toHaveBeenCalled()
      expect(goBack).not.toHaveBeenCalled()
      expect(screen.getByTestId('order-content')).toBeTruthy()
      await holdPress(screen.getByTestId('floating-first'))
      expect(handleClickLogisticOrder).toHaveBeenCalledTimes(1)
      expect(handleClickLogisticOrder).toHaveBeenCalledWith(2, 55, expect.objectContaining({ id: 101 }))
    })

    it('reject: leaves the screen when the finger lifts, not under it (the button is still there while it is down)', async () => {
      const { screen, handleClickLogisticOrder, goBack } = renderRequest()
      const reject = screen.getByTestId('floating-first')
      jest.useFakeTimers()
      try {
        fireEvent(reject, 'pressIn')
        await act(async () => { jest.advanceTimersByTime(holdMs()) })
        expect(handleClickLogisticOrder).toHaveBeenCalledTimes(1)
        expect(goBack).not.toHaveBeenCalled()
        fireEvent(reject, 'pressOut')
        fireEvent.press(reject)
      } finally {
        jest.useRealTimers()
      }
      expect(goBack).toHaveBeenCalledTimes(1)
    })

    describe('with a screen reader on', () => {
      beforeEach(() => {
        jest.spyOn(AccessibilityInfo, 'isScreenReaderEnabled').mockResolvedValue(true)
        jest.spyOn(Alert, 'alert').mockImplementation(jest.fn())
      })
      // The platform's mock is one function: put its answer back for the tests that follow.
      afterEach(() => {
        jest.spyOn(AccessibilityInfo, 'isScreenReaderEnabled').mockResolvedValue(false)
      })

      it('reject asks a dialog named "Reject" and answers once when it is accepted', async () => {
        const { screen, handleClickLogisticOrder } = renderRequest()
        await act(async () => {})
        fireEvent.press(screen.getByTestId('floating-first'))
        expect(handleClickLogisticOrder).not.toHaveBeenCalled()
        const buttons = (Alert.alert as jest.Mock).mock.calls[0][2]
        expect(buttons.map((button: any) => button.text)).toEqual(['Reject', 'Cancel'])
        buttons[1].onPress?.()
        expect(handleClickLogisticOrder).not.toHaveBeenCalled()
        buttons[0].onPress()
        expect(handleClickLogisticOrder).toHaveBeenCalledTimes(1)
        expect(handleClickLogisticOrder).toHaveBeenCalledWith(2, 55, expect.objectContaining({ id: 101 }))
      })

      it('accept asks no dialog: its activation answers at once', async () => {
        const { screen, handleClickLogisticOrder } = renderRequest()
        await act(async () => {})
        fireEvent.press(screen.getByTestId('floating-second'))
        expect(Alert.alert).not.toHaveBeenCalled()
        expect(handleClickLogisticOrder).toHaveBeenCalledTimes(1)
        expect(handleClickLogisticOrder).toHaveBeenCalledWith(1, 55, expect.objectContaining({ id: 101 }))
      })
    })
  })

  it('renders not found when order has an error', () => {
    const { getByText } = renderWithProviders(
      <OrderDetailsLogistic
        order={{ order: null, loading: false, error: ['Order missing'] }}
        navigation={{ navigate: jest.fn(), goBack: jest.fn(), canGoBack: () => false }}
      />
    )
    expect(getByText('Order missing')).toBeTruthy()
  })

  it('goes back to the Orders tab of the BottomTab screen from the not found state', () => {
    const navigate = jest.fn()
    const popTo = jest.fn()
    const { getByText } = renderWithProviders(
      <OrderDetailsLogistic
        order={{ order: null, loading: false, error: ['Order missing'] }}
        navigation={{ navigate, popTo, goBack: jest.fn(), canGoBack: () => false }}
      />
    )
    fireEvent.press(getByText('Go to my orders'))
    expect(popTo).toHaveBeenCalledWith('BottomTab', { screen: 'Orders' })
    expect(navigate).not.toHaveBeenCalled()
  })

  it('shows the page-shaped skeleton under the bar when order is empty (the order details\' own)', () => {
    const { getByTestId, getAllByTestId, getByLabelText } = renderWithProviders(
      <OrderDetailsLogistic order={{ order: {}, loading: false, error: null }} />
    )
    expect(getByTestId('order-details-skeleton')).toBeTruthy()
    expect(getAllByTestId('order-details-skeleton-card')).toHaveLength(3)
    expect(getByLabelText('Go back')).toBeTruthy()
  })

  it('alerts driver when removed from order', () => {
    ;(useSession as jest.Mock).mockReturnValue([{ user: { id: 4, level: 4 } }, {}])
    const { getByText } = renderWithProviders(
      <OrderDetailsLogistic
        order={{
          order: { ...sampleOrder, driver: null, status: 0 },
          loading: false,
          error: null
        }}
      />
    )
    expect(getByText('You have been removed from the order')).toBeTruthy()
  })

  it('tells the driver he was removed with a notice (one button), not a question whose Accept and Cancel both go back', () => {
    ;(useSession as jest.Mock).mockReturnValue([{ user: { id: 4, level: 4 } }, {}])
    const { getByTestId } = renderWithProviders(
      <OrderDetailsLogistic order={{ order: { ...sampleOrder, driver: null, status: 0 }, loading: false, error: null }} />
    )
    expect(getByTestId('alert-kind').props.accessibilityHint).toBe('notice')
  })
})
