import '../../../../../../jest/helpers/uiModuleMocks'
import React from 'react'
import { Image, ScrollView, StyleSheet, Text } from 'react-native'
import { fireEvent } from '@testing-library/react-native'

jest.mock('@ui', () => {
  const { buildD4MessagesUiMock } = require('../../../../../../jest/helpers/d4MessagesUiMock')
  const mock = buildD4MessagesUiMock()
  // The list of messages is the real one (the stub of the fixture is dropped).
  delete mock.PreviousMessages
  return mock
})

jest.mock('@components', () => {
  const mockOrdering = require('../../../../../../jest/helpers/mockOrdering')
  const { renderUiController } = require('../../../../../../jest/helpers/d1ShellDefaults')
  const { messagesOptionDefaults } = require('../../../../../../jest/helpers/d4MessagesDefaults')
  return {
    ...mockOrdering,
    // The list is asked for once there is a session: here there is one, and the API object already wears its token.
    useSession: jest.fn(() => [{ token: 'token', user: { id: 7, level: 4 } }]),
    useApi: jest.fn(() => [{ accessToken: 'token', setAccessToken: jest.fn() }]),
    useUtils: jest.fn(() => [{
      parseDate: (v: string) => v || '2026-01-01',
      optimizeImage: (url: string) => url
    }]),
    // A spy over the controller's stub: what the app hands the controller is part of what these tests pin.
    Contacts: jest.fn(renderUiController(messagesOptionDefaults))
  }
})

import { MessagesOption } from '..'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { buildAppTheme, defaultAppTheme, THEME_PRODUCT_TYPE } from '../../../../../theme/engine'
import { UnreadMessagesProvider, useUnreadMessages } from '../../../../../context/UnreadMessagesContext'
import { sampleOrder } from '../../../../../../jest/helpers/d4MessagesDefaults'

const themeWith = (values: any) => buildAppTheme({ version: 2, product_type: THEME_PRODUCT_TYPE, values })

describe('MessagesOption', () => {
  it('renders messages header', () => {
    const { getByText } = renderWithProviders(<MessagesOption />)
    expect(getByText('Messages')).toBeTruthy()
  })

  it('lays the sort chips out to the screen\'s edges, the gutter on their content (decision H8)', () => {
    const { getByTestId } = renderWithProviders(<MessagesOption />)
    const chips = getByTestId('messages-sort')
    expect(StyleSheet.flatten(chips.props.style).paddingHorizontal).toBeUndefined()
    expect(StyleSheet.flatten(chips.props.contentContainerStyle).paddingHorizontal).toBe(20)
    // `md` between the chips and the first row.
    expect(StyleSheet.flatten(chips.props.style).marginBottom).toBe(15)
  })

  it('renders newest / order number tags', () => {
    const { getByText } = renderWithProviders(<MessagesOption />)
    expect(getByText('Newest')).toBeTruthy()
    expect(getByText('Order number')).toBeTruthy()
  })

  it('switches sort tag to order number', () => {
    const setSortBy = jest.fn()
    const { getByText } = renderWithProviders(<MessagesOption setSortBy={setSortBy} />)
    fireEvent.press(getByText('Order number'))
    expect(setSortBy).toHaveBeenCalledWith({ param: 'id', direction: 'desc' })
  })

  it('says there are no conversations yet, and how to start one, when the list is empty (not "no results")', () => {
    const { getByText, queryByText, getByTestId, UNSAFE_queryAllByType } = renderWithProviders(
      <MessagesOption
        orders={{ loading: false, error: null, data: [] }}
      />
    )
    expect(getByText('No messages yet')).toBeTruthy()
    expect(getByText('Chats with customers and stores appear here. To start one, open an order and tap the chat button.')).toBeTruthy()
    expect(queryByText('Sorry, no results found')).toBeNull()
    // No bundled picture: the empty state's icon, not an image.
    expect(getByTestId('not-found-icon')).toBeTruthy()
    expect(UNSAFE_queryAllByType(Image)).toHaveLength(0)
  })

  it('shows the empty state only once the list has loaded, never over its skeleton', () => {
    const { queryByText } = renderWithProviders(
      <MessagesOption orders={{ loading: true, error: null, data: [] }} />
    )
    expect(queryByText('No messages yet')).toBeNull()
  })

  it('shows an error as the error, not as an empty list', () => {
    const { getByText, queryByText } = renderWithProviders(
      <MessagesOption orders={{ loading: false, error: 'No tienes permiso.', data: [] }} />
    )
    expect(getByText('No tienes permiso.')).toBeTruthy()
    expect(queryByText('No messages yet')).toBeNull()
  })

  describe('what the controller is given so that the tab lists only the orders with direct messages (2026-11-24)', () => {
    const controller = () => (jest.requireMock('@components').Contacts as jest.Mock)
    const lastProps = () => controller().mock.calls[controller().mock.calls.length - 1][0]

    beforeEach(() => controller().mockClear())

    it('asks the server for the orders whose last_direct_message_at is not null (the request\'s `where`)', () => {
      renderWithProviders(<MessagesOption />)
      expect(lastProps().orderConditions).toEqual([
        { attribute: 'last_direct_message_at', value: { condition: '!=', value: null } }
      ])
    })

    it('lets real-time events add an unknown order only when it has a direct message', () => {
      renderWithProviders(<MessagesOption />)
      const { orderFilter } = lastProps()
      expect(orderFilter({ id: 1, last_direct_message_at: '2026-11-24 10:00:00' })).toBe(true)
      expect(orderFilter({ id: 1, last_direct_message_at: null })).toBe(false)
      expect(orderFilter({ id: 1 })).toBe(false)
      expect(orderFilter(undefined)).toBe(false)
    })

    it('hands the controller the same two references on every render ', () => {
      const { getByText } = renderWithProviders(<MessagesOption />)
      const first = controller().mock.calls[0][0]
      // A sort chip changes the screen's own state and renders the controller again.
      fireEvent.press(getByText('Order number'))
      expect(controller().mock.calls.length).toBeGreaterThan(1)
      expect(lastProps().orderConditions).toBe(first.orderConditions)
      expect(lastProps().orderFilter).toBe(first.orderFilter)
    })
  })

  it('lists previous message orders', () => {
    const { getByText } = renderWithProviders(<MessagesOption />)
    expect(getByText('#101 · Message Store')).toBeTruthy()
  })

  it('navigates to order message when a message card is pressed', () => {
    const onNavigationRedirect = jest.fn()
    const { getByText } = renderWithProviders(
      <MessagesOption onNavigationRedirect={onNavigationRedirect} />
    )
    fireEvent.press(getByText('#101 · Message Store'))
    expect(onNavigationRedirect).toHaveBeenCalledWith(
      'OrderMessage',
      expect.objectContaining({ orderId: 101 })
    )
  })

  it('draws the sort options as chips, the chosen one selected', () => {
    const { getByLabelText } = renderWithProviders(<MessagesOption />)
    expect(getByLabelText('Newest').props.accessibilityRole).toBe('button')
    expect(getByLabelText('Newest').props.accessibilityState.selected).toBe(true)
    expect(getByLabelText('Order number').props.accessibilityState.selected).toBe(false)
    fireEvent.press(getByLabelText('Order number'))
    expect(getByLabelText('Order number').props.accessibilityState.selected).toBe(true)
    expect(getByLabelText('Newest').props.accessibilityState.selected).toBe(false)
  })

  it('hides the title with visibility messages.title, and nothing else', () => {
    const { queryByText, getByText } = renderWithProviders(<MessagesOption />, {
      themeOverrides: themeWith({ visibility: { 'messages.title': false } })
    })
    expect(queryByText('Messages')).toBeNull()
    expect(getByText('Newest')).toBeTruthy()
    expect(getByText('#101 · Message Store')).toBeTruthy()
  })

  it('hides the sort chips with visibility messages.sort, and nothing else', () => {
    const { queryByText, queryByTestId, getByText } = renderWithProviders(<MessagesOption />, {
      themeOverrides: themeWith({ visibility: { 'messages.sort': false } })
    })
    expect(queryByText('Newest')).toBeNull()
    expect(queryByText('Order number')).toBeNull()
    // No empty row is left where the chips were.
    expect(queryByTestId('messages-sort')).toBeNull()
    expect(getByText('Messages')).toBeTruthy()
    expect(getByText('#101 · Message Store')).toBeTruthy()
  })

  it('draws the sort chips at the chip\'s `md` size, as tall as a control', () => {
    const { getByLabelText } = renderWithProviders(<MessagesOption />)
    expect(StyleSheet.flatten(getByLabelText('Newest').props.style).height).toBe(defaultAppTheme().native.components.chip.sizes.md.height)
  })

  describe('the unread messages it tells the tab bar of', () => {
    const Probe = () => <Text testID='unread'>{JSON.stringify(useUnreadMessages())}</Text>
    const order = (id: number, unread: number) => ({ ...sampleOrder, id, unread_count: unread, business: { ...sampleOrder.business, name: `Store ${id}` } })
    const render = (props: any = {}) => renderWithProviders(
      <UnreadMessagesProvider>
        <Probe />
        <MessagesOption {...props} />
      </UnreadMessagesProvider>
    )
    const known = (view: any) => JSON.parse(view.getByTestId('unread').props.children)

    it('is the sum of the unread messages of the orders it has loaded, and says there are more pages', () => {
      const view = render({
        orders: { loading: false, error: null, data: [order(1, 2), order(2, 0), order(3, 5)] },
        pagination: { currentPage: 1, totalPages: 3 }
      })
      expect(known(view)).toEqual({ total: 7, more: true })
    })

    it('is exact when every page is loaded', () => {
      const view = render({
        orders: { loading: false, error: null, data: [order(1, 2), order(2, 1)] },
        pagination: { currentPage: 2, totalPages: 2 }
      })
      expect(known(view)).toEqual({ total: 3, more: false })
    })

    it('counts nothing for an order that says nothing of its unread messages', () => {
      const view = render({
        orders: { loading: false, error: null, data: [order(1, 2), { ...order(2, 0), unread_count: undefined }, { ...order(3, 0), unread_count: null }] },
        pagination: { currentPage: 1, totalPages: 1 }
      })
      expect(known(view)).toEqual({ total: 2, more: false })
    })

    it('says nothing while the list loads for the first time, or when it failed: it knows nothing', () => {
      expect(known(render({ orders: { loading: true, error: null, data: [] } }))).toBeNull()
      expect(known(render({ orders: { loading: false, error: ['Network Error'], data: [] } }))).toBeNull()
    })

    it('follows the list as its orders change (a new message, a chat that was read)', () => {
      const view = render({
        orders: { loading: false, error: null, data: [order(1, 2)] },
        pagination: { currentPage: 1, totalPages: 1 }
      })
      expect(known(view).total).toBe(2)
      view.rerender(
        <UnreadMessagesProvider>
          <Probe />
          <MessagesOption orders={{ loading: false, error: null, data: [order(1, 0)] }} pagination={{ currentPage: 1, totalPages: 1 }} />
        </UnreadMessagesProvider>
      )
      expect(known(view)).toEqual({ total: 0, more: false })
    })

    it('keeps what it last knew while it loads another page, and takes it back when the list leaves', () => {
      const view = render({
        orders: { loading: false, error: null, data: [order(1, 2)] },
        pagination: { currentPage: 1, totalPages: 2 }
      })
      view.rerender(
        <UnreadMessagesProvider>
          <Probe />
          <MessagesOption orders={{ loading: true, error: null, data: [order(1, 2)] }} pagination={{ currentPage: 1, totalPages: 2 }} />
        </UnreadMessagesProvider>
      )
      expect(known(view)).toEqual({ total: 2, more: true })
      view.rerender(<UnreadMessagesProvider><Probe /></UnreadMessagesProvider>)
      expect(known(view)).toBeNull()
    })
  })
})
