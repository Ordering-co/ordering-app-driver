import React from 'react'
import { ActivityIndicator, Keyboard, Linking, Platform, StyleSheet } from 'react-native'
import { act, fireEvent } from '@testing-library/react-native'
import { launchImageLibrary } from 'react-native-image-picker'
import Clipboard from '@react-native-clipboard/clipboard'

jest.mock('react-native-image-picker', () => ({
  launchImageLibrary: jest.fn((_opts, cb) =>
    cb?.({
      assets: [{ uri: 'file://photo.jpg', type: 'image/jpeg', base64: 'abc123' }]
    })
  )
}))

const mockClearSignature = jest.fn()
jest.mock('react-native-signature-canvas', () => {
  const React = require('react')
  const { View } = require('react-native')
  return React.forwardRef((props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({ clearSignature: mockClearSignature, readSignature: jest.fn() }))
    return React.createElement(View, { testID: 'signature-pad', ...props })
  })
})

jest.mock('@react-native-clipboard/clipboard', () => ({
  setString: jest.fn()
}))

const mockParseDate = jest.fn((value: any, options?: any) => options?.outputFormat === 'DAY'
  ? `day ${String(value).slice(0, 10)}`
  : options?.outputFormat === 'TIME'
    ? `time ${String(value).slice(11, 16)}`
    : value || '2026-01-01')

jest.mock('@components', () => {
  const mockOrdering = require('../../../../../../jest/helpers/mockOrdering')
  const { renderUiController } = require('../../../../../../jest/helpers/d1ShellDefaults')
  const { chatDefaults } = require('../../../../../../jest/helpers/d4MessagesDefaults')
  const sessionState = [{
    user: { id: 1, name: 'Driver One', level: 4, photo: null }
  }, {}]
  const utilsState = [{
    parseDate: (value: any, options?: any) => mockParseDate(value, options),
    optimizeImage: (url: string) => url,
    dateFormat: 'DAY',
    timeFormat: 'TIME'
  }]
  const configState = [{ configs: {} }]
  return {
    ...mockOrdering,
    ToastType: { Info: 'info', Success: 'success', Warning: 'warning', Error: 'error' },
    useUtils: jest.fn(() => utilsState),
    useSession: jest.fn(() => sessionState),
    useConfig: jest.fn(() => configState),
    Messages: renderUiController(chatDefaults)
  }
})

import { Chat } from '..'
import { OBottomPopup, OButton, ODivider, OListRow } from '../../shared'
import { useConfig, useSession } from '@components'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { sampleOrder } from '../../../../../../jest/helpers/d4MessagesDefaults'
import { buildAppTheme, defaultAppTheme, THEME_PRODUCT_TYPE } from '../../../../../theme/engine'
import { themeBottomSpace, themeSpace } from '../../../../../theme/helpers'

const themeWith = (values: any) => buildAppTheme({ version: 2, product_type: THEME_PRODUCT_TYPE, values })
const hidden = (key: string) => ({ themeOverrides: themeWith({ visibility: { [key]: false } }) })
const flat = (node: any) => StyleSheet.flatten(node.props.style)

/** A person's message of the order, as the server sends it. */
const said = (over: any = {}) => ({
  id: 10,
  type: 2,
  author: { id: 2, name: 'Jane', level: 3 },
  comment: 'Call me at 555-123-4567',
  created_at: '2026-01-01 12:05:00',
  can_see: '2,3,4',
  order_id: 101,
  ...over
})

/** The order's own messages: it was placed, its status changed. */
const placed = { id: 20, type: 0, created_at: '2026-01-01 12:00:00', order_id: 101 }
const changed = {
  id: 21,
  type: 1,
  author: { id: 99, name: 'System', level: 0 },
  change: { attribute: 'status', old: 0, new: 7 },
  created_at: '2026-01-01 12:06:00',
  can_see: '2,3,4',
  order_id: 101
}
const thread = (...list: any[]) => ({ loading: false, messages: list })

describe('Chat', () => {
  const theme: any = defaultAppTheme()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useSession as jest.Mock).mockReturnValue([{
      user: { id: 1, name: 'Driver One', level: 4, photo: null }
    }, {}])
    ;(useConfig as jest.Mock).mockReturnValue([{ configs: {} }])
  })

  describe('thread', () => {
    it('shows a message of the order in the app\'s own thread', () => {
      const { getByText, getByTestId } = renderWithProviders(<Chat />)
      expect(getByTestId('chat-list')).toBeTruthy()
      expect(getByText('Hello there')).toBeTruthy()
    })

    it('writes who sent another person\'s message, with the role', () => {
      const { getByText, queryByText } = renderWithProviders(
        <Chat messages={thread(said(), said({ id: 11, author: { id: 1, name: 'Driver One', level: 4 }, comment: 'On my way' }))} />
      )
      expect(getByText('Jane (Customer)')).toBeTruthy()
      // Not over my own message.
      expect(queryByText('Driver One (Driver)')).toBeNull()
    })

    it('writes the day and the time with the project\'s date utility and formats', () => {
      const { getByText } = renderWithProviders(<Chat messages={thread(said())} />)
      expect(getByText('day 2026-01-01')).toBeTruthy()
      expect(getByText('time 12:05')).toBeTruthy()
      expect(mockParseDate).toHaveBeenCalledWith('2026-01-01 12:05:00', { outputFormat: 'DAY', utc: false })
      expect(mockParseDate).toHaveBeenCalledWith('2026-01-01 12:05:00', { outputFormat: 'TIME', utc: false })
    })

    it('hides the time under the messages with visibility messages.time, and nothing else', () => {
      const { queryByText, getByText } = renderWithProviders(<Chat messages={thread(said())} />, hidden('messages.time'))
      expect(queryByText('time 12:05')).toBeNull()
      expect(getByText('day 2026-01-01')).toBeTruthy()
      expect(getByText('Jane (Customer)')).toBeTruthy()
    })

    it('writes under a message who it was sent to (never the driver to a driver)', () => {
      const { getByTestId } = renderWithProviders(<Chat messages={thread(said())} />)
      expect(getByTestId('chat-sent-to')).toHaveTextContent('Sent to: Business, Customer')
    })

    it('writes the driver among the readers to a user who is not one, and never the store to the store', () => {
      ;(useSession as jest.Mock).mockReturnValue([{ user: { id: 9, name: 'Admin', level: 0, photo: null } }, {}])
      const admin = renderWithProviders(<Chat messages={thread(said())} />)
      expect(admin.getByTestId('chat-sent-to')).toHaveTextContent('Sent to: Business, Customer, Driver')
      ;(useSession as jest.Mock).mockReturnValue([{ user: { id: 5, name: 'Owner', level: 2, photo: null } }, {}])
      const owner = renderWithProviders(<Chat messages={thread(said())} />)
      expect(owner.getByTestId('chat-sent-to')).toHaveTextContent('Sent to: Customer, Driver')
    })

    it('shows the order\'s own messages: it was placed, and a change of its status', () => {
      const { getByText, getAllByTestId } = renderWithProviders(<Chat messages={thread(placed, changed, said())} />)
      expect(getAllByTestId('chat-console')).toHaveLength(2)
      // One line each: when it was placed and through which app; what changed and when.
      expect(getByText(/^Order placed for .* · Via ordering$/)).toBeTruthy()
      expect(getByText(/^Order Status Changed from Order status pending to Order status accepted by restaurant · time 12:06$/)).toBeTruthy()
    })

    it('words a change with no value on one side, and leaves out one it has no words for (no raw placeholders)', () => {
      const entryOf = (id: number, change: any) => ({ ...changed, id, change })
      const { getByText, queryByText, getAllByTestId } = renderWithProviders(<Chat messages={thread(
        entryOf(31, { attribute: 'delivery_pin_status', old: undefined, new: undefined }),
        entryOf(32, { attribute: 'reject_reason', old: false, new: undefined }),
        entryOf(33, { attribute: 'reject_reason', old: 'Too far', new: undefined }),
        entryOf(34, { attribute: 'delivery_position', old: false, new: 1 }),
        entryOf(35, { attribute: 'status', old: undefined, new: undefined }),
      )} />)
      expect(getAllByTestId('chat-console')).toHaveLength(2)
      expect(getByText(/^Order Reject reason removed · /)).toBeTruthy()
      expect(getByText(/^Order Delivery position set to 1 · /)).toBeTruthy()
      for (const raw of [/undefined/, /null/, /false/, /Delivery pin status/]) expect(queryByText(raw)).toBeNull()
    })

    it('hides them with visibility messages.order_console, and only them', () => {
      const { queryByText, queryAllByTestId, getByText } = renderWithProviders(
        <Chat messages={thread(placed, changed, said())} />,
        hidden('messages.order_console')
      )
      expect(queryAllByTestId('chat-console')).toHaveLength(0)
      expect(queryByText(/Order placed for/)).toBeNull()
      expect(getByText('555-123-4567')).toBeTruthy()
    })

    it('hides them from a driver when the server\'s order_logbook_enabled is off, whatever the theme says', () => {
      ;(useConfig as jest.Mock).mockReturnValue([{
        configs: { order_logbook_enabled: { value: '0' } }
      }])
      const { queryAllByTestId, getByText } = renderWithProviders(<Chat messages={thread(placed, changed, said())} />)
      expect(queryAllByTestId('chat-console')).toHaveLength(0)
      expect(getByText('555-123-4567')).toBeTruthy()
    })

    it('keeps them for other users when the logbook is off', () => {
      ;(useConfig as jest.Mock).mockReturnValue([{
        configs: { order_logbook_enabled: { value: '0' } }
      }])
      ;(useSession as jest.Mock).mockReturnValue([{ user: { id: 9, name: 'Admin', level: 0, photo: null } }, {}])
      const { getAllByTestId } = renderWithProviders(<Chat messages={thread(placed, changed, said())} />)
      expect(getAllByTestId('chat-console')).toHaveLength(2)
    })

    it('shows the app\'s spinner, in the theme\'s color, while the messages load', () => {
      const { getByTestId, UNSAFE_getByType } = renderWithProviders(<Chat messages={{ loading: true, messages: [] }} />)
      expect(getByTestId('chat-loading')).toBeTruthy()
      expect(UNSAFE_getByType(ActivityIndicator).props.color).toBe(theme.native.components.spinner.base.color)
    })
  })

  describe('composer', () => {
    it('updates the message from the field', () => {
      const setMessage = jest.fn()
      const { getByTestId } = renderWithProviders(<Chat setMessage={setMessage} message='' />)
      fireEvent.changeText(getByTestId('chat-input'), 'Hello customer')
      expect(setMessage).toHaveBeenCalledWith('Hello customer')
    })

    it('sends with the send button and clears the composer', () => {
      const handleSend = jest.fn()
      const setMessage = jest.fn()
      const setImage = jest.fn()
      const { getByLabelText } = renderWithProviders(
        <Chat handleSend={handleSend} setMessage={setMessage} setImage={setImage} message='hi' />
      )
      fireEvent.press(getByLabelText('Send'))
      expect(handleSend).toHaveBeenCalled()
      expect(setMessage).toHaveBeenCalledWith('')
      expect(setImage).toHaveBeenCalledWith(null)
    })

    it('draws the send button round, as its slot says (`chat_bubble.slots.send`)', () => {
      const { getByLabelText } = renderWithProviders(<Chat handleSend={jest.fn()} setMessage={jest.fn()} message='hi' />)
      const components = defaultAppTheme().native.components
      expect(components.chat_bubble.slots.send.shape).toBe('round')
      expect(flat(getByLabelText('Send').children[0] as any).borderRadius).toBe(components.button.shapes.round.radius)
    })

    it('draws the composer\'s glyphs as the board does: the tools 22 (the icon-only shape\'s), the send arrow 20', () => {
      const { UNSAFE_getAllByProps } = renderWithProviders(<Chat handleSend={jest.fn()} setMessage={jest.fn()} message='hi' />)
      const components = defaultAppTheme().native.components
      const size = (name: string) => { const nodes = UNSAFE_getAllByProps({ name }); return nodes[nodes.length - 1].props.size }
      expect(size('image-outline')).toBe(components.button.shapes.icon.icon_size)
      expect(size('send')).toBe(defaultAppTheme().native.tokens.icon.md)
    })

    it('sends from the keyboard', () => {
      const handleSend = jest.fn()
      const { getByTestId } = renderWithProviders(<Chat handleSend={handleSend} message='hi' />)
      fireEvent(getByTestId('chat-input'), 'submitEditing')
      expect(handleSend).toHaveBeenCalled()
    })

    it('paints the send button with the theme\'s slot, disabled with nothing to send', () => {
      const slot = theme.native.components.chat_bubble.slots.send
      const look = theme.native.components.button.variants[slot.color][slot.appearance]
      const empty = renderWithProviders(<Chat message='' image={null} />)
      expect(empty.getByLabelText('Send').props.accessibilityState.disabled).toBe(true)
      const ready = renderWithProviders(<Chat message='hi' />)
      const send = ready.getByLabelText('Send')
      expect(send.props.accessibilityState.disabled).toBe(false)
      const box = send.findAll((node: any) => typeof node.type === 'string' && flat(node)?.backgroundColor === look.background)
      expect(box.length).toBeGreaterThan(0)
    })

    describe('the quick messages, in a project that has texts for them', () => {
      // The project's dictionary: two of the driver's four quick messages have a text.
      const dictionary: Record<string, string> = { DRIVER_MESSAGE_1: 'On my way', DRIVER_MESSAGE_2: 'I am outside' }
      const { useLanguage } = require('@components')
      beforeEach(() => {
        useLanguage.mockReturnValue([{ loading: false, dictionary }, (key: string, fallback?: string) => dictionary[key] ?? fallback ?? key])
      })
      afterEach(() => {
        useLanguage.mockReturnValue([{ loading: false, dictionary: {} }, (key: string, fallback?: string) => fallback ?? key])
      })

      it('adds a quick message, a space apart from what is written', () => {
        const setMessage = jest.fn()
        const empty = renderWithProviders(<Chat setMessage={setMessage} message='' />)
        fireEvent.press(empty.getByText('On my way'))
        expect(setMessage).toHaveBeenCalledWith('On my way')
        const written = renderWithProviders(<Chat setMessage={setMessage} message='Hi' />)
        fireEvent.press(written.getByText('I am outside'))
        expect(setMessage).toHaveBeenCalledWith('Hi I am outside')
      })

      it('draws the quick messages as chips of one scrolling row', () => {
        const { getByTestId, getByLabelText } = renderWithProviders(<Chat />)
        expect(getByTestId('chat-quick-messages').props.horizontal).toBe(true)
        expect(getByLabelText('On my way').props.accessibilityRole).toBe('button')
      })

      it('shows only the messages the project has a text for', () => {
        const { getByText, queryByText } = renderWithProviders(<Chat />)
        expect(getByText('On my way')).toBeTruthy()
        expect(getByText('I am outside')).toBeTruthy()
        expect(queryByText('driver_message_3')).toBeNull()
        expect(queryByText('driver_message_4')).toBeNull()
      })

      it('hides them with visibility messages.quick_messages, and nothing else', () => {
        const { queryByText, queryByTestId, getByText, getByTestId } = renderWithProviders(<Chat />, hidden('messages.quick_messages'))
        expect(queryByText('On my way')).toBeNull()
        expect(queryByTestId('chat-quick-messages')).toBeNull()
        expect(getByText('Customer')).toBeTruthy()
        expect(getByTestId('chat-input')).toBeTruthy()
      })
    })

    it('draws no quick message, and no row for them, when the project has no text for any (a key is not a message)', () => {
      const { queryByText, queryByTestId, getByTestId } = renderWithProviders(<Chat />)
      expect(queryByText('driver_message_1')).toBeNull()
      expect(queryByTestId('chat-quick-messages')).toBeNull()
      expect(getByTestId('chat-input')).toBeTruthy()
    })

    it('hides the quick messages with visibility messages.quick_messages, and nothing else', () => {
      const { queryByText, queryByTestId, getByText, getByTestId, getByLabelText } = renderWithProviders(<Chat />, hidden('messages.quick_messages'))
      expect(queryByText('driver_message_1')).toBeNull()
      expect(queryByTestId('chat-quick-messages')).toBeNull()
      expect(getByText('Customer')).toBeTruthy()
      expect(getByTestId('chat-input')).toBeTruthy()
      expect(getByLabelText('Upload image')).toBeTruthy()
      expect(getByLabelText('Signature')).toBeTruthy()
    })

    it('shows the quick messages of the user\'s level', () => {
      ;(useSession as jest.Mock).mockReturnValue([{
        user: { id: 9, name: 'Admin', level: 0, photo: null }
      }, {}])
      const { useLanguage } = require('@components')
      const dictionary: Record<string, string> = { ADMIN_MESSAGE_1: 'We are checking your order', DRIVER_MESSAGE_1: 'On my way' }
      useLanguage.mockReturnValue([{ loading: false, dictionary }, (key: string, fallback?: string) => dictionary[key] ?? fallback ?? key])
      const { getByText, queryByText } = renderWithProviders(<Chat />)
      useLanguage.mockReturnValue([{ loading: false, dictionary: {} }, (key: string, fallback?: string) => fallback ?? key])
      expect(getByText('We are checking your order')).toBeTruthy()
      expect(queryByText('On my way')).toBeNull()
    })

    describe('who receives the message: "Send to" and its chips', () => {
      const chips = (view: any) => ['business', 'customer', 'driver'].map(key => view.queryByTestId(`chat-recipient-${key}`)).filter(Boolean)
      const marked = (chip: any) => chip.props.accessibilityState.selected

      it('draws a chip for the store and the customer of a driver, marked while they receive the message', () => {
        const view = renderWithProviders(<Chat canRead={{ business: true, customer: false, driver: true }} />)
        expect(view.getByText('Send to')).toBeTruthy()
        expect(chips(view).map((chip: any) => chip.props.accessibilityLabel)).toEqual(['Business', 'Customer'])
        expect(chips(view).map(marked)).toEqual([true, false])
        expect(chips(view).every((chip: any) => chip.props.accessibilityRole === 'button')).toBe(true)
      })

      it('is one row that scrolls sideways, as every row of chips', () => {
        const { getByTestId } = renderWithProviders(<Chat />)
        expect(getByTestId('chat-recipients').props.horizontal).toBe(true)
      })

      it('keeps a chip\'s size whether it is marked or not: the mark is always there', () => {
        const mark = (value: boolean) => renderWithProviders(<Chat canRead={{ business: value, customer: value, driver: value }} />)
        const glyphs = (view: any) => view.UNSAFE_getAllByProps({ size: 'sm' })
          .map((icon: any) => icon.props.name).filter((name: string) => ['checkmark-circle', 'ellipse-outline'].includes(name))
        expect(glyphs(mark(true))).toEqual(['checkmark-circle', 'checkmark-circle'])
        expect(glyphs(mark(false))).toEqual(['ellipse-outline', 'ellipse-outline'])
      })

      it('turns a reader on and off with its chip', () => {
        const setCanRead = jest.fn()
        const { getByTestId } = renderWithProviders(
          <Chat setCanRead={setCanRead} canRead={{ business: true, customer: false, driver: true }} />
        )
        setCanRead.mockClear()
        fireEvent.press(getByTestId('chat-recipient-customer'))
        expect(setCanRead).toHaveBeenCalledWith(expect.objectContaining({ customer: true }))
        fireEvent.press(getByTestId('chat-recipient-business'))
        expect(setCanRead).toHaveBeenCalledTimes(2)
      })

      it('keeps the readers\' minimum: a driver of an order with a driver cannot turn the last readers off', () => {
        // The driver writes to someone always: the rule of `handleFilter` is unchanged.
        const setCanRead = jest.fn()
        const { getByTestId } = renderWithProviders(
          <Chat setCanRead={setCanRead} canRead={{ business: true, customer: false, driver: true }} />
        )
        setCanRead.mockClear()
        fireEvent.press(getByTestId('chat-recipient-business'))
        // Turning the store off would leave nobody: the customer is turned on with it.
        expect(setCanRead).toHaveBeenCalledWith(expect.objectContaining({ business: false, customer: true }))
      })

      it('offers the driver to a user who is not one, when the order has one', () => {
        ;(useSession as jest.Mock).mockReturnValue([{ user: { id: 9, name: 'Admin', level: 0, photo: null } }, {}])
        const view = renderWithProviders(<Chat />)
        expect(chips(view).map((chip: any) => chip.props.accessibilityLabel)).toEqual(['Business', 'Customer', 'Driver'])
        const { driver, ...withoutDriver } = sampleOrder as any
        const alone = renderWithProviders(<Chat order={withoutDriver} />)
        expect(chips(alone).map((chip: any) => chip.props.accessibilityLabel)).toEqual(['Business', 'Customer'])
      })

      it('leaves the store out for the store\'s own user', () => {
        ;(useSession as jest.Mock).mockReturnValue([{ user: { id: 5, name: 'Owner', level: 2, photo: null } }, {}])
        const view = renderWithProviders(<Chat />)
        expect(chips(view).map((chip: any) => chip.props.accessibilityLabel)).toEqual(['Customer', 'Driver'])
      })
    })

    it('never hides the recipients: no visibility key of the chat takes them', () => {
      const all = themeWith({
        visibility: {
          'messages.quick_messages': false,
          'messages.image_upload': false,
          'messages.signature': false,
          'messages.order_console': false,
          'messages.time': false
        }
      })
      const { getByText, getByTestId, getByLabelText } = renderWithProviders(<Chat />, { themeOverrides: all })
      expect(getByTestId('chat-recipient-business')).toBeTruthy()
      expect(getByTestId('chat-recipient-customer')).toBeTruthy()
      expect(getByText('Send to')).toBeTruthy()
      expect(getByTestId('chat-input')).toBeTruthy()
      expect(getByLabelText('Send')).toBeTruthy()
    })

    it('turns the driver off as a reader of an order without one', () => {
      const setCanRead = jest.fn()
      const { driver, ...orderWithoutDriver } = sampleOrder as any
      renderWithProviders(
        <Chat
          setCanRead={setCanRead}
          canRead={{ business: true, customer: true, driver: true }}
          order={orderWithoutDriver}
        />
      )
      expect(setCanRead).toHaveBeenCalledWith(expect.objectContaining({ driver: false }))
    })

    it('attaches a photo from the image button, and removes it', () => {
      const setImage = jest.fn()
      const { getByLabelText, queryByLabelText } = renderWithProviders(<Chat setImage={setImage} image={null} />)
      expect(queryByLabelText('Remove')).toBeNull()
      fireEvent.press(getByLabelText('Upload image'))
      expect(launchImageLibrary).toHaveBeenCalled()
      expect((launchImageLibrary as jest.Mock).mock.calls[0][0].saveToPhotos).not.toBe(true)
      expect(setImage).toHaveBeenCalledWith('data:image/jpeg;base64,abc123')
      fireEvent.press(getByLabelText('Remove'))
      expect(setImage).toHaveBeenLastCalledWith(null)
      expect(queryByLabelText('Remove')).toBeNull()
    })

    it('attaches nothing when no photo is picked', () => {
      const setImage = jest.fn()
      ;(launchImageLibrary as jest.Mock).mockImplementationOnce((_opts, cb) => cb?.({ assets: [] }))
      const { getByLabelText } = renderWithProviders(<Chat setImage={setImage} image={null} />)
      fireEvent.press(getByLabelText('Upload image'))
      expect(setImage).not.toHaveBeenCalled()
    })

    it('hides the image button with visibility messages.image_upload, and nothing else', () => {
      const { queryByLabelText, getByLabelText, getByTestId } = renderWithProviders(<Chat />, hidden('messages.image_upload'))
      expect(queryByLabelText('Upload image')).toBeNull()
      expect(getByLabelText('Signature')).toBeTruthy()
      expect(getByTestId('chat-input')).toBeTruthy()
    })

    it('opens the signature pad from its button, clears it and closes it', () => {
      const setImage = jest.fn()
      const { getByLabelText, queryByTestId, getByTestId } = renderWithProviders(
        <Chat setImage={setImage} image='data:image/jpeg;base64,abc123' />
      )
      expect(queryByTestId('chat-signature')).toBeNull()
      fireEvent.press(getByLabelText('Signature'))
      expect(setImage).toHaveBeenCalledWith(null)
      expect(getByTestId('chat-signature')).toBeTruthy()
      expect(getByTestId('signature-pad')).toBeTruthy()
      fireEvent.press(getByLabelText('Clear'))
      expect(mockClearSignature).toHaveBeenCalled()
      fireEvent.press(getByLabelText('Signature'))
      expect(queryByTestId('chat-signature')).toBeNull()
    })

    it('hides the signature button and its pad with visibility messages.signature, and nothing else', () => {
      const { queryByLabelText, queryByTestId, getByLabelText } = renderWithProviders(<Chat />, hidden('messages.signature'))
      expect(queryByLabelText('Signature')).toBeNull()
      expect(queryByTestId('chat-signature')).toBeNull()
      expect(getByLabelText('Upload image')).toBeTruthy()
    })

    it('is a notice, with nothing to write with, once the order has ended', () => {
      const { getByText, queryByText, queryByTestId, queryByLabelText } = renderWithProviders(
        <Chat order={{ ...sampleOrder, status: 1 }} />
      )
      expect(getByText(/can't send messages because the order has ended/i)).toBeTruthy()
      expect(queryByText('driver_message_1')).toBeNull()
      expect(queryByTestId('chat-input')).toBeNull()
      expect(queryByLabelText('Send')).toBeNull()
      expect(queryByTestId('chat-recipients')).toBeNull()
    })

    it.each(['ios', 'android'])(
      'keeps the system\'s bottom inset under the composer, except over the keyboard, on %s',
      async (platform) => {
        const originalOS = Platform.OS
        Object.defineProperty(Platform, 'OS', { configurable: true, value: platform })
        const listeners: Record<string, Function> = {}
        const remove = jest.fn()
        const addListener = jest
          .spyOn(Keyboard, 'addListener')
          .mockImplementation((event, listener) => {
            listeners[event] = listener
            return { remove } as any
          })
        try {
          const { getByTestId, unmount } = renderWithProviders(<Chat />)
          const padding = () => flat(getByTestId('chat-composer')).paddingBottom
          expect(padding()).toBe(themeBottomSpace(theme, 0))

          await act(async () => {
            listeners[platform === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow']({ endCoordinates: { height: 300 } })
          })
          // The gap of a pinned bar over the keyboard (`bottom_bar.base.padding`), not the 5 the composer had.
          expect(padding()).toBe(theme.native.components.bottom_bar.base.padding)
          expect(padding()).not.toBe(themeSpace(theme, 'xs'))

          await act(async () => {
            listeners[platform === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide']({})
          })
          expect(padding()).toBe(themeBottomSpace(theme, 0))
          unmount()
          // Every keyboard listener of the screen (the chat's and its sheet's) is removed.
          expect(remove).toHaveBeenCalledTimes(addListener.mock.calls.length)
        } finally {
          addListener.mockRestore()
          Object.defineProperty(Platform, 'OS', {
            configurable: true,
            value: originalOS,
          })
        }
      },
    )

    it('lays the composer out top to bottom: recipients, quick messages, field', () => {
      const { getByTestId } = renderWithProviders(<Chat />)
      const composer = flat(getByTestId('chat-composer'))
      expect(composer.flexDirection).toBeUndefined()
      expect(composer.backgroundColor).toBe(theme.native.components.chat_bubble.base.composer_background)
    })

    it('puts the signature and image buttons before the field and the send button after it, in one row', () => {
      const { getByTestId } = renderWithProviders(<Chat />)
      const row = getByTestId('chat-composer-row')
      const order = row.findAll((node: any) => ['Signature', 'Upload image', 'Send'].includes(node.props.accessibilityLabel) || node.props.testID === 'chat-input')
        .map((node: any) => node.props.accessibilityLabel ?? node.props.testID)
      expect(order.filter((label: string, index: number) => order.indexOf(label) === index)).toEqual(['Signature', 'Upload image', 'chat-input', 'Send'])
      expect(flat(row).flexDirection).toBe('row')
    })

    it('draws the recipients before the quick messages, over the field', () => {
      const { useLanguage } = require('@components')
      const dictionary: Record<string, string> = { DRIVER_MESSAGE_1: 'On my way' }
      useLanguage.mockReturnValue([{ loading: false, dictionary }, (key: string, fallback?: string) => dictionary[key] ?? fallback ?? key])
      const { getByTestId } = renderWithProviders(<Chat />)
      useLanguage.mockReturnValue([{ loading: false, dictionary: {} }, (key: string, fallback?: string) => fallback ?? key])
      const rows = getByTestId('chat-composer').children as any[]
      const ids = rows.map((row: any) => row.props?.testID)
      expect(ids.indexOf('chat-recipients')).toBeLessThan(ids.indexOf('chat-quick-messages'))
      expect(ids.indexOf('chat-quick-messages')).toBeGreaterThan(-1)
    })

    it('separates the thread from the composer with the app\'s divider, not a border of its own', () => {
      const { getByTestId, UNSAFE_getAllByType } = renderWithProviders(<Chat />)
      const composer = flat(getByTestId('chat-composer'))
      expect(composer.borderTopWidth).toBeUndefined()
      expect(composer.borderTopColor).toBeUndefined()
      const dividers = UNSAFE_getAllByType(ODivider)
      expect(dividers).toHaveLength(1)
      expect(dividers[0].props.variant).toBeUndefined()
      // The line is the one the border drew: the item divider's, with no space of its own by default.
      const item = theme.native.components.divider.variants.item
      const line = flat(dividers[0].findByType('View' as any))
      expect(line.height).toBe(item.line.borderWidth)
      expect(line.backgroundColor).toBe(item.line.borderColor)
      expect(line.marginVertical).toBe(0)
    })
  })

  describe('message options', () => {
    it('opens on a long press of a bubble and copies its text', () => {
      const { getByTestId, getByText, queryByText } = renderWithProviders(<Chat />)
      expect(queryByText('Copy Text')).toBeNull()
      fireEvent(getByTestId('chat-bubble'), 'longPress')
      expect(getByText('Message options')).toBeTruthy()
      fireEvent.press(getByText('Copy Text'))
      expect(Clipboard.setString).toHaveBeenCalledWith('Hello there')
      expect(queryByText('Copy Text')).toBeNull()
    })

    it('closes with Cancel', () => {
      const { getByTestId, getByText, queryByText } = renderWithProviders(<Chat />)
      fireEvent(getByTestId('chat-bubble'), 'longPress')
      fireEvent.press(getByText('Cancel'))
      expect(queryByText('Copy Text')).toBeNull()
    })

    it('is a sheet of list rows, not stacked buttons (decision H5)', () => {
      const { getByTestId, getAllByRole, UNSAFE_getAllByType } = renderWithProviders(<Chat messages={thread(said())} />)
      fireEvent(getByTestId('chat-bubble'), 'longPress')
      const rows = UNSAFE_getAllByType(OListRow).map((row: any) => row.props)
      expect(rows.map((row: any) => row.title)).toEqual(['Copy Text', 'Call', 'Text'])
      // Actions, not destinations: a glyph of the app each, no chevron, a line between them only.
      expect(rows.map((row: any) => row.icon)).toEqual(['copy-outline', 'call', 'chatbubble-ellipses-outline'])
      expect(rows.every((row: any) => row.chevron === false)).toBe(true)
      expect(rows.map((row: any) => !!row.last)).toEqual([false, false, true])
      const row = theme.native.components.list_row.base
      expect(flat(getByTestId('chat-option-copy'))).toEqual(expect.objectContaining({
        backgroundColor: row.background,
        paddingVertical: row.padding_y,
      }))
      // The only button of the sheet is Cancel.
      const sheet = getByTestId('chat-options')
      const buttons = sheet.findAllByType(OButton as any)
      expect(buttons.map((button: any) => button.props.text)).toEqual(['Cancel'])
      expect(getAllByRole('button', { name: 'Copy Text' })).toHaveLength(1)
    })

    it('has one row for a message without a phone, the last of its list', () => {
      const { getByTestId, UNSAFE_getAllByType } = renderWithProviders(<Chat />)
      fireEvent(getByTestId('chat-bubble'), 'longPress')
      const rows = UNSAFE_getAllByType(OListRow).map((row: any) => row.props)
      expect(rows.map((row: any) => row.title)).toEqual(['Copy Text'])
      expect(rows[0].last).toBe(true)
    })

    it('paints Cancel as every Cancel of the app: a neutral outline (decision H5)', () => {
      const { getByTestId, getByRole } = renderWithProviders(<Chat />)
      fireEvent(getByTestId('chat-bubble'), 'longPress')
      const cancel = getByTestId('chat-options').findAllByType(OButton as any)[0]
      expect(cancel.props).toEqual(expect.objectContaining({ color: 'neutral', appearance: 'outline' }))
      expect(cancel.props.size).toBeUndefined()
      const look = theme.native.components.button.variants.neutral.outline
      const box = StyleSheet.flatten(getByRole('button', { name: 'Cancel' }).children[0].props.style)
      expect(box.borderColor).toBe(look.border.borderColor)
      expect(box.backgroundColor).toBe(look.background)
    })

    it('leaves the sheet\'s sides and bottom to the sheet (decision H5)', () => {
      const { getByTestId, UNSAFE_getAllByType } = renderWithProviders(<Chat />)
      fireEvent(getByTestId('chat-bubble'), 'longPress')
      expect(UNSAFE_getAllByType(OBottomPopup)[0].props.padded).toBe(true)
      const body = flat(getByTestId('chat-options'))
      expect(body.paddingHorizontal).toBeUndefined()
      expect(body.paddingBottom).toBeUndefined()
      expect(body.gap).toBe(themeSpace(theme, 'sm'))
    })

    it('offers to call or text the phone of a message', () => {
      const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as any)
      const { getByTestId, getByText, queryByText, getAllByText } = renderWithProviders(<Chat messages={thread(said())} />)
      fireEvent(getByTestId('chat-bubble'), 'longPress')
      // The sheet is named after the phone (also a link of the bubble).
      expect(getAllByText('555-123-4567')).toHaveLength(2)
      fireEvent.press(getByText('Call'))
      expect(openURL).toHaveBeenCalledWith('tel:5551234567')
      expect(queryByText('Call')).toBeNull()

      fireEvent(getByTestId('chat-bubble'), 'longPress')
      fireEvent.press(getByText('Text'))
      expect(openURL).toHaveBeenCalledWith('sms:5551234567')
      openURL.mockRestore()
    })

    it('opens with a tap on a phone of the text, for that phone', () => {
      const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as any)
      const { getByText, queryByText } = renderWithProviders(
        <Chat messages={thread(said({ comment: 'Store 555-000-1111 or me 555-123-4567' }))} />
      )
      expect(queryByText('Call')).toBeNull()
      fireEvent.press(getByText('555-123-4567'))
      // Nothing is dialed before the driver chooses.
      expect(openURL).not.toHaveBeenCalled()
      fireEvent.press(getByText('Call'))
      expect(openURL).toHaveBeenCalledWith('tel:5551234567')
      openURL.mockRestore()
    })

    it('offers no call for a message without a phone', () => {
      const { getByTestId, getByText, queryByText } = renderWithProviders(<Chat />)
      fireEvent(getByTestId('chat-bubble'), 'longPress')
      expect(getByText('Copy Text')).toBeTruthy()
      expect(queryByText('Call')).toBeNull()
      expect(queryByText('Text')).toBeNull()
    })
  })
})
