import React from 'react'
import { Dimensions, Linking } from 'react-native'
import { act, fireEvent } from '@testing-library/react-native'
import { launchImageLibrary } from 'react-native-image-picker'
import Clipboard from '@react-native-clipboard/clipboard'

jest.spyOn(Dimensions, 'addEventListener').mockImplementation(() => ({
  remove: jest.fn()
}) as any)
jest.spyOn(Dimensions, 'get').mockReturnValue({
  width: 390,
  height: 844,
  scale: 2,
  fontScale: 1
} as any)

jest.mock('../../shared', () => {
  const React = require('react')
  const { View, Text, Pressable } = require('react-native')
  return {
    OIcon: () => React.createElement(View, { testID: 'o-icon' }),
    OIconButton: ({ onClick, ...props }: any) =>
      React.createElement(
        Pressable,
        { testID: props.testID || 'o-icon-button', onPress: onClick },
        React.createElement(Text, null, 'icon-btn')
      ),
    OText: ({ children }: any) => React.createElement(Text, null, children),
    OButton: ({ onClick, text, ...props }: any) =>
      React.createElement(
        Pressable,
        { testID: props.testID || `o-button-${text}`, onPress: onClick },
        React.createElement(Text, null, text || 'Button')
      ),
    OBottomPopup: ({ open, children, title }: any) =>
      open
        ? React.createElement(
          View,
          { testID: 'bottom-popup' },
          React.createElement(Text, null, title),
          children
        )
        : null
  }
})

jest.mock('react-native-gifted-chat', () => {
  const React = require('react')
  const { View, Text, Pressable, TextInput } = require('react-native')

  const GiftedChat = (props: any) =>
    React.createElement(
      View,
      { testID: 'gifted-chat' },
      React.createElement(Text, null, 'GiftedChat'),
      props.renderInputToolbar?.({
        key: 'tb',
        text: 'hi',
        onTextChanged: props.onInputTextChanged,
        onSend: props.onSend
      }),
      props.renderComposer?.({ key: 'composer', text: props.text || '' }),
      props.renderSend?.({ key: 'send', text: 'hi', onSend: props.onSend }),
      props.renderBubble?.({
        key: 'bubble',
        currentMessage: { text: 'Call 555-123-4567' }
      }),
      props.renderMessageText?.({
        currentMessage: { text: 'Call 555-123-4567' },
        position: 'left',
        customTextStyle: {},
        textProps: {}
      }),
      React.createElement(
        Pressable,
        {
          testID: 'chat-long-press',
          onPress: () => props.onLongPress?.(null, { text: 'copy me please' })
        },
        React.createElement(Text, null, 'LongPress')
      ),
      React.createElement(TextInput, {
        testID: 'chat-input',
        onChangeText: props.onInputTextChanged
      }),
      React.createElement(
        Pressable,
        {
          testID: 'chat-send',
          onPress: () => props.onSend?.([{ text: 'hello' }], true)
        },
        React.createElement(Text, null, 'Send')
      ),
      (props.messages || []).slice(0, 3).map((m: any) =>
        React.createElement(
          Text,
          { key: String(m._id) },
          typeof m.text === 'string' ? m.text : `msg-${m._id}`
        )
      )
    )

  return {
    GiftedChat,
    Actions: (props: any) =>
      React.createElement(
        View,
        { testID: 'gifted-actions' },
        typeof props.icon === 'function' ? props.icon() : null
      ),
    InputToolbar: (props: any) =>
      React.createElement(
        View,
        { testID: 'gifted-input-toolbar' },
        props.renderAccessory?.()
      ),
    Composer: () => React.createElement(View, { testID: 'gifted-composer' }),
    Send: (props: any) =>
      React.createElement(
        Pressable,
        {
          testID: 'gifted-send',
          onPress: () => props.onSend?.([{ text: props.text || 'hi' }], true)
        },
        React.createElement(Text, null, 'GiftedSend')
      ),
    Bubble: (props: any) =>
      React.createElement(
        Pressable,
        {
          testID: 'chat-bubble-long-press',
          onPress: () =>
            props.onLongPress?.(null, props.currentMessage || { text: 'Call 555-123-4567' })
        },
        React.createElement(Text, null, 'Bubble')
      ),
    Message: () => null,
    MessageImage: () => null
  }
})

jest.mock('react-native-image-picker', () => ({
  launchImageLibrary: jest.fn((_opts, cb) =>
    cb?.({
      assets: [{ uri: 'file://photo.jpg', type: 'image/jpeg', base64: 'abc123' }]
    })
  )
}))

jest.mock('@react-native-documents/picker', () => ({
  pick: jest.fn().mockResolvedValue([]),
  types: { images: 'images', pdf: 'pdf', allFiles: 'allFiles' }
}))

jest.mock('react-native-signature-canvas', () => {
  const React = require('react')
  const { View } = require('react-native')
  return () => React.createElement(View, { testID: 'signature-pad' })
})

jest.mock('react-native-parsed-text', () => {
  const React = require('react')
  const { Text, Pressable, View } = require('react-native')
  return ({ children, parse, ...props }: any) => {
    const phoneRule = (parse || []).find((p: any) => p.type === 'phone')
    return React.createElement(
      View,
      { testID: 'parsed-text' },
      React.createElement(Text, props, children),
      phoneRule?.onPress &&
        React.createElement(
          Pressable,
          {
            testID: 'parsed-phone',
            onPress: () => phoneRule.onPress('555-123-4567')
          },
          React.createElement(Text, null, 'TapPhone')
        )
    )
  }
})

jest.mock('@react-native-clipboard/clipboard', () => ({
  setString: jest.fn()
}))

jest.mock('@components', () => {
  const mockOrdering = require('../../../../../../jest/helpers/mockOrdering')
  const { renderUiController } = require('../../../../../../jest/helpers/d1ShellDefaults')
  const { chatDefaults } = require('../../../../../../jest/helpers/d4MessagesDefaults')
  const sessionState = [{
    user: { id: 1, name: 'Business Owner', level: 4, photo: null }
  }, {}]
  const utilsState = [{
    parseDate: (v) => v || '2026-01-01',
    parseTime: (v) => v || '12:00pm',
    optimizeImage: (url) => url,
    getTimeAgo: () => '1m'
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
import { useConfig, useSession } from '@components'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { sampleOrder } from '../../../../../../jest/helpers/d4MessagesDefaults'

const readyChat = (ui: React.ReactElement) => {
  const screen = renderWithProviders(ui)
  act(() => {
    const wrappers = screen.UNSAFE_root.findAll(
      (node: any) => typeof node.props?.onLayout === 'function'
    )
    wrappers.forEach((node: any) => {
      node.props.onLayout({ nativeEvent: { layout: { height: 600, width: 390 } } })
    })
  })
  return screen
}

describe('Chat', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(Dimensions, 'addEventListener').mockImplementation(() => ({
      remove: jest.fn()
    }) as any)
    ;(useSession as jest.Mock).mockReturnValue([{
      user: { id: 1, name: 'Business Owner', level: 4, photo: null }
    }, {}])
  })

  it('renders gifted chat after layout is ready', () => {
    const { getByTestId, getByText } = readyChat(<Chat />)
    expect(getByTestId('gifted-chat')).toBeTruthy()
    expect(getByText('GiftedChat')).toBeTruthy()
  })

  it('updates message text from input', () => {
    const setMessage = jest.fn()
    const { getByTestId } = readyChat(<Chat setMessage={setMessage} message="" />)
    fireEvent.changeText(getByTestId('chat-input'), 'Hello customer')
    expect(setMessage).toHaveBeenCalled()
  })

  it('sends message via gifted chat send control', () => {
    const handleSend = jest.fn()
    const { getByTestId } = readyChat(
      <Chat handleSend={handleSend} message="hello" />
    )
    fireEvent.press(getByTestId('chat-send'))
    expect(handleSend).toHaveBeenCalled()
  })

  it('renders quick messages and applies them', () => {
    const setMessage = jest.fn()
    const { getByText } = readyChat(
      <Chat setMessage={setMessage} message="" order={{ ...sampleOrder, status: 0 }} />
    )
    expect(getByText('driver_message_1')).toBeTruthy()
    fireEvent.press(getByText('driver_message_1'))
    expect(setMessage).toHaveBeenCalledWith('driver_message_1')
  })

  it('prefixes quick message when composer already has text', () => {
    const setMessage = jest.fn()
    const { getByText } = readyChat(
      <Chat setMessage={setMessage} message="Hi" order={{ ...sampleOrder, status: 0 }} />
    )
    fireEvent.press(getByText('driver_message_2'))
    expect(setMessage).toHaveBeenCalledWith('Hi driver_message_2')
  })

  it('toggles canRead customer filter', () => {
    const setCanRead = jest.fn()
    const { getByText } = readyChat(
      <Chat
        setCanRead={setCanRead}
        canRead={{ business: true, customer: true, driver: true }}
        order={sampleOrder}
      />
    )
    fireEvent.press(getByText('Customer'))
    expect(setCanRead).toHaveBeenCalled()
  })

  it('attaches image from image picker', () => {
    const setImage = jest.fn()
    const { getByTestId } = readyChat(
      <Chat setImage={setImage} image={null} order={{ ...sampleOrder, status: 0 }} />
    )
    fireEvent.press(getByTestId('o-icon-button'))
    expect(launchImageLibrary).toHaveBeenCalled()
    expect(setImage).toHaveBeenCalledWith('data:image/jpeg;base64,abc123')
  })

  it('clears attached image via pen control', () => {
    const setImage = jest.fn()
    const { UNSAFE_getAllByType } = readyChat(
      <Chat
        setImage={setImage}
        image="data:image/jpeg;base64,abc123"
        order={{ ...sampleOrder, status: 0 }}
      />
    )
    const { TouchableOpacity } = require('react-native')
    const pen = UNSAFE_getAllByType(TouchableOpacity)[0]
    fireEvent.press(pen)
    expect(setImage).toHaveBeenCalledWith(null)
  })

  it('shows disabled composer for completed order', () => {
    const { getByText, queryByText } = readyChat(
      <Chat order={{ ...sampleOrder, status: 1 }} />
    )
    expect(getByText(/can\'t send messages because the order has ended/i)).toBeTruthy()
    expect(queryByText('driver_message_1')).toBeNull()
  })

  it('opens copy popup on bubble long press and copies text', () => {
    const { getByTestId } = readyChat(<Chat />)
    fireEvent.press(getByTestId('chat-bubble-long-press'))
    expect(getByTestId('bottom-popup')).toBeTruthy()
    fireEvent.press(getByTestId('o-button-Copy Text'))
    expect(Clipboard.setString).toHaveBeenCalledWith('Call 555-123-4567')
  })

  it('closes copy popup via cancel', () => {
    const { getByTestId, queryByTestId } = readyChat(<Chat />)
    fireEvent.press(getByTestId('chat-bubble-long-press'))
    fireEvent.press(getByTestId('o-button-Cancel'))
    expect(queryByTestId('bottom-popup')).toBeNull()
  })

  it('opens phone popup from bubble long press and calls number', () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as any)
    const { getByTestId, getByText } = readyChat(<Chat />)
    fireEvent.press(getByTestId('chat-bubble-long-press'))
    expect(getByTestId('bottom-popup')).toBeTruthy()
    expect(getByText('Call')).toBeTruthy()
    fireEvent.press(getByTestId('o-button-Call'))
    expect(openURL).toHaveBeenCalled()
    openURL.mockRestore()
  })

  it('sends sms from phone popup', () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as any)
    const { getByTestId } = readyChat(<Chat />)
    fireEvent.press(getByTestId('chat-bubble-long-press'))
    fireEvent.press(getByTestId('o-button-Text'))
    expect(openURL).toHaveBeenCalledWith(expect.stringMatching(/^sms:/))
    openURL.mockRestore()
  })

  it('toggles business filter for driver user', () => {
    const setCanRead = jest.fn()
    const { getByText } = readyChat(
      <Chat
        setCanRead={setCanRead}
        canRead={{ business: true, customer: true, driver: true }}
        order={sampleOrder}
      />
    )
    fireEvent.press(getByText('Business'))
    expect(setCanRead).toHaveBeenCalled()
  })

  it('hides logbook messages when order_logbook_enabled is off', () => {
    ;(useConfig as jest.Mock).mockReturnValue([{
      configs: { order_logbook_enabled: { value: '0' } }
    }])
    const { getByTestId } = readyChat(<Chat />)
    expect(getByTestId('gifted-chat')).toBeTruthy()
  })

  it('ignores image picker when user cancels', () => {
    const setImage = jest.fn()
    ;(launchImageLibrary as jest.Mock).mockImplementationOnce((_opts, cb) => cb?.({ assets: [] }))
    const { getByTestId } = readyChat(
      <Chat setImage={setImage} image={null} order={{ ...sampleOrder, status: 0 }} />
    )
    fireEvent.press(getByTestId('o-icon-button'))
    expect(setImage).not.toHaveBeenCalled()
  })

  it('sends via gifted send control', () => {
    const handleSend = jest.fn()
    const setMessage = jest.fn()
    const setImage = jest.fn()
    const { getByTestId } = readyChat(
      <Chat handleSend={handleSend} setMessage={setMessage} setImage={setImage} message="hi" />
    )
    fireEvent.press(getByTestId('gifted-send'))
    expect(handleSend).toHaveBeenCalled()
    expect(setMessage).toHaveBeenCalledWith('')
    expect(setImage).toHaveBeenCalledWith(null)
  })

  it('renders admin quick messages for admin level', () => {
    ;(useSession as jest.Mock).mockReturnValue([{
      user: { id: 9, name: 'Admin', level: 0, photo: null }
    }, {}])
    const { getByText } = readyChat(<Chat order={{ ...sampleOrder, status: 0 }} />)
    expect(getByText('admin_message_1')).toBeTruthy()
  })

  it('updates canRead when order has no driver', () => {
    const setCanRead = jest.fn()
    const { driver, ...orderWithoutDriver } = sampleOrder as any
    readyChat(
      <Chat
        setCanRead={setCanRead}
        canRead={{ business: true, customer: true, driver: true }}
        order={orderWithoutDriver}
      />
    )
    expect(setCanRead).toHaveBeenCalledWith(expect.objectContaining({ driver: false }))
  })
})
