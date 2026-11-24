import '../../../../../../jest/helpers/uiModuleMocks'
import React from 'react'
import { Image, StyleSheet, View } from 'react-native'
import { fireEvent } from '@testing-library/react-native'

import { useApi, useSession } from '@components'

jest.mock('../../Chat', () => {
  const React = require('react')
  const { View } = require('react-native')
  return {
    Chat: () => React.createElement(View, { testID: 'chat-stub' })
  }
})

jest.mock('@ui', () => {
  const { buildD4MessagesUiMock } = require('../../../../../../jest/helpers/d4MessagesUiMock')
  const React = require('react')
  return buildD4MessagesUiMock()
})

jest.mock('@components', () => {
  const mockOrdering = require('../../../../../../jest/helpers/mockOrdering')
  const { renderUiController } = require('../../../../../../jest/helpers/d1ShellDefaults')
  const { orderDetailsDefaults } = require('../../../../../../jest/helpers/d4MessagesDefaults')
  return {
    ...mockOrdering,
    useUtils: jest.fn(() => [{
      optimizeImage: (url: string) => url,
      parseDate: (v: string) => v || '2026-01-01'
    }]),
    OrderDetails: renderUiController(orderDetailsDefaults)
  }
})

// What the chat does when the app has to catch up (the provider's own suite covers when it is told).
let mockReconnect: (() => void) | undefined
jest.mock('../../../../../context/SocketReconnectContext', () => ({
  useOnReconnect: (handler: () => void) => { mockReconnect = handler }
}))

import { OrderMessage } from '..'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { sampleOrder } from '../../../../../../jest/helpers/d4MessagesDefaults'
import { defaultAppTheme } from '../../../../../theme/engine'
import { themeImage, themeRadius } from '../../../../../theme/helpers'
import { OAvatar } from '../../shared'

const flat = (node: any) => StyleSheet.flatten(node.props.style)

describe('OrderMessage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useSession as jest.Mock).mockReturnValue([{ user: { id: 1, level: 4 } }, {}])
  })

  it('renders order number header and chat', () => {
    const { getByText, getByTestId } = renderWithProviders(<OrderMessage />)
    expect(getByText(/Order No\. 101/)).toBeTruthy()
    expect(getByTestId('chat-stub')).toBeTruthy()
  })

  // The chat marks itself read on opening (not on leaving), so the order controller can announce it on the event
  // bus and the Messages list's count (and the tab's badge) drops for every route, with or without a list's setter.
  it.each([
    ['the order\'s details', { setOrders: jest.fn() }],
    ['the Messages list', { setOrders: jest.fn() }],
    ['a push', {}]
  ])('reads the chat as soon as it is open, opened from %s', (_entry, params) => {
    const readMessages = jest.fn()
    renderWithProviders(<OrderMessage {...params} readMessages={readMessages} messages={{ loading: false, messages: [{ id: 1 }] }} />)
    expect(readMessages).toHaveBeenCalledTimes(1)
  })

  // A message of someone else that arrives while the chat is on screen is read as it arrives, so the order's count (the
  // list's row, the tab's badge, the details' button) never keeps a message the driver is looking at.
  describe('a message that arrives while the chat is open', () => {
    const chat = (messages: any[]) => <OrderMessage readMessages={readMessages} messages={{ loading: false, messages }} />
    const readMessages = jest.fn()
    beforeEach(() => readMessages.mockClear())

    it('is read as it arrives', () => {
      const view = renderWithProviders(chat([{ id: 1, author_id: 99 }]))
      expect(readMessages).toHaveBeenCalledTimes(1)
      view.rerender(chat([{ id: 1, author_id: 99 }, { id: 2, author_id: 99 }]))
      expect(readMessages).toHaveBeenCalledTimes(2)
      view.rerender(chat([{ id: 1, author_id: 99 }, { id: 2, author_id: 99 }, { id: 3, author_id: 99 }]))
      expect(readMessages).toHaveBeenCalledTimes(3)
    })

    it('is not read again for the driver\'s own message, which is read by definition', () => {
      const view = renderWithProviders(chat([{ id: 1, author_id: 99 }]))
      view.rerender(chat([{ id: 1, author_id: 99 }, { id: 2, author_id: 1 }]))
      expect(readMessages).toHaveBeenCalledTimes(1)
    })

    it('is not read again by a render that brought no new message', () => {
      const view = renderWithProviders(chat([{ id: 1, author_id: 99 }]))
      view.rerender(chat([{ id: 1, author_id: 99 }]))
      expect(readMessages).toHaveBeenCalledTimes(1)
    })
  })

  describe('catching up when the socket comes back', () => {
    it('loads the messages again', () => {
      const loadMessages = jest.fn()
      renderWithProviders(<OrderMessage loadMessages={loadMessages} messages={{ loading: false, messages: [] }} />)
      mockReconnect!()
      expect(loadMessages).toHaveBeenCalledTimes(1)
    })
  })

  it('does not read the chat while its messages load', () => {
    const readMessages = jest.fn()
    renderWithProviders(<OrderMessage readMessages={readMessages} messages={{ loading: true, messages: [] }} />)
    expect(readMessages).not.toHaveBeenCalled()
  })

  it('shows loading placeholders while order loads', () => {
    const { getByTestId } = renderWithProviders(
      <OrderMessage order={{ order: null, loading: true, error: null }} />
    )
    expect(getByTestId('chat-message-skeleton')).toBeTruthy()
  })

  it('navigates back when header arrow is pressed', () => {
    const goBack = jest.fn()
    const canGoBack = jest.fn(() => true)
    const { getAllByRole } = renderWithProviders(
      <OrderMessage navigation={{ goBack, canGoBack, navigate: jest.fn() }} />
    )
    // The header's back arrow is the first button of the screen.
    const touchables = getAllByRole('button')
    if (touchables.length) {
      fireEvent.press(touchables[0])
    }
    expect(goBack).toHaveBeenCalled()
  })

  it('renders driver avatar when order has a driver', () => {
    const { getByText } = renderWithProviders(
      <OrderMessage
        order={{
          order: { ...sampleOrder, driver: { id: 3, name: 'Driver', photo: null } },
          loading: false,
          error: null
        }}
      />
    )
    expect(getByText(/Order No\. 101/)).toBeTruthy()
  })

  it('names the screen after the store in the theme\'s top bar, the order under it', () => {
    const theme: any = defaultAppTheme()
    const { getByText } = renderWithProviders(<OrderMessage />)
    expect(flat(getByText('Store A'))).toEqual(expect.objectContaining({
      fontSize: theme.native.components.header.base.title.fontSize,
      color: theme.native.components.header.base.color
    }))
    expect(getByText('Order No. 101 · Pending')).toBeTruthy()
  })

  it('paints the store\'s logo, or the theme\'s placeholder without one', () => {
    const theme: any = defaultAppTheme()
    const without = renderWithProviders(<OrderMessage />)
    expect(without.UNSAFE_getByType(Image).props.source).toBe(themeImage(theme, 'placeholder.business_logo'))
    const withLogo = renderWithProviders(
      <OrderMessage
        order={{
          order: { ...sampleOrder, business: { ...sampleOrder.business, logo: 'https://cdn.test/logo.png' } },
          loading: false,
          error: null
        }}
      />
    )
    expect(withLogo.UNSAFE_getByType(Image).props.source).toEqual({ uri: 'https://cdn.test/logo.png', cache: 'force-cache' })
  })

  it('writes the order\'s status after its number, in the app\'s one list of names (decision H1)', () => {
    const subtitle = (status: number) => renderWithProviders(
      <OrderMessage order={{ order: { ...sampleOrder, status }, loading: false, error: null }} />
    ).queryByText(new RegExp(`^Order No\\. 101 · `))
    expect(subtitle(8)).toHaveTextContent('Order No. 101 · Accepted by driver')
    expect(subtitle(4)).toHaveTextContent('Order No. 101 · Ready for pickup')
    expect(subtitle(5)).toHaveTextContent('Order No. 101 · Rejected by business')
  })

  it('names the screen after the order when its store has no name, and the number is not written twice', () => {
    const { getByText } = renderWithProviders(
      <OrderMessage
        order={{
          order: { ...sampleOrder, business: { ...sampleOrder.business, name: '' } },
          loading: false,
          error: null
        }}
      />
    )
    expect(getByText('Order No. 101')).toBeTruthy()
    expect(getByText('Pending')).toBeTruthy()
  })

  it('masks the order number in a secure project, under the store\'s name and as the title (decision H2)', () => {
    (useApi as jest.Mock).mockReturnValue([{ project: 'luisv4plus' }, {}])
    try {
      const order = { ...sampleOrder, id: 123456 }
      const named = renderWithProviders(<OrderMessage order={{ order, loading: false, error: null }} />)
      expect(named.getByText('Order No. 12**** · Pending')).toBeTruthy()
      expect(named.queryByText(/123456/)).toBeNull()

      const unnamed = renderWithProviders(
        <OrderMessage order={{ order: { ...order, business: { ...order.business, name: '' } }, loading: false, error: null }} />
      )
      expect(unnamed.getByText('Order No. 12****')).toBeTruthy()
      expect(unnamed.queryByText(/123456/)).toBeNull()
    } finally {
      (useApi as jest.Mock).mockReturnValue([{ get: jest.fn(), post: jest.fn() }, {}])
    }
  })

  it('frames the store\'s logo as every store\'s logo of the app: a rounded square', () => {
    const theme: any = defaultAppTheme()
    const avatar = renderWithProviders(<OrderMessage />).UNSAFE_getByType(OAvatar)
    expect(avatar.props.kind).toBe('business')
    expect(avatar.props).not.toHaveProperty('radius')
    expect(flat(avatar.findByType(View)).borderRadius).toBe(themeRadius(theme, 'sm'))
  })

  it('draws the store\'s logo in the bar 32 across, its glyph 18 (`avatar.sizes.sm`, as the board)', () => {
    const theme: any = defaultAppTheme()
    expect(theme.native.components.avatar.sizes.sm.size).toBe(32)
    expect(theme.native.components.avatar.sizes.sm.icon_size).toBe(18)
    const avatar = renderWithProviders(<OrderMessage />).UNSAFE_getByType(OAvatar)
    expect(flat(avatar.findByType(View))).toEqual(expect.objectContaining({ width: 32, height: 32 }))
  })

  it('tells a driver removed from the order, and leaves', () => {
    const goBack = jest.fn()
    const { getByText, getByTestId } = renderWithProviders(
      <OrderMessage
        navigation={{ goBack, canGoBack: () => true, navigate: jest.fn() }}
        order={{ order: { ...sampleOrder, driver: null }, loading: false, error: null }}
      />
    )
    expect(getByText('You have been removed from the order')).toBeTruthy()
    expect(getByTestId('alert-notice')).toBeTruthy()
    fireEvent.press(getByTestId('alert-accept'))
    expect(goBack).toHaveBeenCalled()
  })
})
