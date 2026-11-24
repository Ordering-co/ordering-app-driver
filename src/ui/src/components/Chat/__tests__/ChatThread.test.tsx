import React from 'react'
import { ActivityIndicator, Image, Linking, StyleSheet } from 'react-native'
import { act, fireEvent } from '@testing-library/react-native'

import { ChatThread, ChatMessage } from '../ChatThread'
import { OSpinner } from '../../shared'
import { themeColor, themeIconSize, themeSpace, themeText } from '../../../../../theme/helpers'
import { buildAppTheme, defaultAppTheme, THEME_PRODUCT_TYPE } from '../../../../../theme/engine'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'

const theme: any = defaultAppTheme()
const bubble = theme.native.components.chat_bubble.base
const flat = (node: any) => StyleSheet.flatten(node.props.style)

const message = (over: Partial<ChatMessage>): ChatMessage => ({
  _id: 1,
  text: 'Hello',
  createdAt: '2026-07-01 12:05:00',
  day: 'Jul 1',
  time: '12:05',
  user: { _id: 2 },
  ...over,
})

const renderThread = (messages: ChatMessage[], { onOptions = jest.fn(), showTime = true, themeOverrides, loading }: any = {}) => renderWithProviders(
  <ChatThread
    messages={messages}
    userId={7}
    loading={loading}
    showTime={showTime}
    onOptions={onOptions}
    closeLabel='Close'
    scrollToBottomLabel='Scroll to the last message'
    footer={null}
  />,
  { themeOverrides }
)

describe('ChatThread bubbles', () => {
  it('paints my messages and the others\' with the theme\'s chat bubble', () => {
    const { getAllByTestId, getByText } = renderThread([
      message({ _id: 2, text: 'mine', user: { _id: 7 } }),
      message({ _id: 1, text: 'theirs' }),
    ])
    const [mine, theirs] = getAllByTestId('chat-bubble').map(flat)
    expect(mine).toEqual(expect.objectContaining({
      backgroundColor: bubble.mine_background,
      borderRadius: bubble.radius,
      paddingHorizontal: bubble.padding_x,
      paddingVertical: bubble.padding_y,
    }))
    expect(theirs.backgroundColor).toBe(bubble.theirs_background)
    expect(flat(getByText('mine')).color).toBe(bubble.mine_color)
    expect(flat(getByText('theirs')).color).toBe(bubble.theirs_color)
    // The tail: the corner on the sender's side is nearly square (`xxs`, the boards' 2).
    expect(mine.borderBottomRightRadius).toBe(theme.native.tokens.space.xxs)
    expect(theirs.borderBottomLeftRadius).toBe(theme.native.tokens.space.xxs)
  })

  it('follows a theme that changes the bubble', () => {
    const custom = buildAppTheme({
      version: 2,
      product_type: THEME_PRODUCT_TYPE,
      values: { components: { chat_bubble: { base: { mine_background: '#112233', radius: 4, tail: false } } } },
    })
    const { getByTestId } = renderThread([message({ user: { _id: 7 } })], { themeOverrides: custom })
    const mine = flat(getByTestId('chat-bubble'))
    expect(mine.backgroundColor).toBe('#112233')
    expect(mine.borderRadius).toBe(4)
    expect(mine.borderBottomRightRadius).toBeUndefined()
  })

  it('writes the text in the theme\'s body font', () => {
    const { getByText } = renderThread([message({})])
    expect(flat(getByText('Hello'))).toEqual(expect.objectContaining({
      fontFamily: theme.native.tokens.typography.body.fontFamily,
      fontSize: theme.native.tokens.typography.body.fontSize,
    }))
  })

  it('reads its texts through the theme\'s text helper: the message is body, the sender small and muted, without a weight of its own', () => {
    const { getByText } = renderThread([message({ sender: 'Jane (Customer)' })])
    const text = flat(getByText('Hello'))
    const sender = flat(getByText('Jane (Customer)'))
    expect(text).toEqual(expect.objectContaining(themeText(theme, 'body')))
    expect(sender).toEqual(expect.objectContaining(themeText(theme, 'body_sm')))
    expect(sender.color).toBe(themeColor(theme, 'text_muted'))
    expect(text.fontWeight).toBeUndefined()
    expect(sender.fontWeight).toBeUndefined()
  })

  it('writes the sender over another person\'s bubble, outside it, and over none of mine', () => {
    const { getByText, getAllByTestId, queryByText } = renderThread([
      message({ _id: 2, text: 'mine', user: { _id: 7 }, sender: null }),
      message({ _id: 1, sender: 'Jane (Customer)' }),
    ])
    const sender = getByText('Jane (Customer)')
    // Over the bubble, not in it.
    const [, theirs] = getAllByTestId('chat-bubble')
    expect(theirs.findAll((node: any) => node === sender)).toHaveLength(0)
    expect(queryByText('Driver One (Driver)')).toBeNull()
  })

  it('shows the time under a bubble, unless told not to', () => {
    expect(renderThread([message({})]).getByText('12:05')).toBeTruthy()
    expect(renderThread([message({})], { showTime: false }).queryByText('12:05')).toBeNull()
  })

  it('writes the day once, over the first message of each day', () => {
    const { getAllByText } = renderThread([
      message({ _id: 3, createdAt: '2026-07-02 09:00:00', day: 'Jul 2' }),
      message({ _id: 2, createdAt: '2026-07-01 18:00:00', day: 'Jul 1' }),
      message({ _id: 1, createdAt: '2026-07-01 12:05:00', day: 'Jul 1' }),
    ])
    expect(getAllByText('Jul 1')).toHaveLength(1)
    expect(getAllByText('Jul 2')).toHaveLength(1)
  })

  it('writes under a message who it was sent to, in words', () => {
    const { getByTestId } = renderThread([
      message({ sentToLabel: 'Sent to:', sentTo: ['Business', 'Customer'] }),
    ])
    expect(getByTestId('chat-sent-to')).toHaveTextContent('Sent to: Business, Customer')
    const look = flat(getByTestId('chat-sent-to'))
    expect(look).toEqual(expect.objectContaining(themeText(theme, 'caption')))
    expect(look.color).toBe(themeColor(theme, 'text_muted'))
  })

  it('writes nothing under a message nobody can read but the sender\'s side', () => {
    expect(renderThread([message({ sentToLabel: 'Sent to:', sentTo: [] })]).queryByTestId('chat-sent-to')).toBeNull()
    expect(renderThread([message({})]).queryByTestId('chat-sent-to')).toBeNull()
  })

  it('shows a spinner of the theme while an empty thread loads', () => {
    expect(renderThread([], { loading: true }).getByTestId('chat-loading')).toBeTruthy()
    expect(renderThread([message({})], { loading: true }).queryByTestId('chat-loading')).toBeNull()
  })

  it('draws the spinner with the app\'s primitive, centered where the system\'s was', () => {
    const { getByTestId, UNSAFE_getByType } = renderThread([], { loading: true })
    expect(UNSAFE_getByType(OSpinner).props.size).toBeUndefined()
    expect(UNSAFE_getByType(ActivityIndicator).props.color).toBe(theme.native.components.spinner.base.color)
    const box = flat(getByTestId('chat-loading'))
    // The system's small indicator (20 pt), in the middle, with the same space over and under it.
    expect(box.width).toBe(themeIconSize(theme, 'md'))
    expect(box.height).toBe(themeIconSize(theme, 'md'))
    expect(box.alignSelf).toBe('center')
    expect(box.marginVertical).toBe(themeSpace(theme, 'sm'))
  })
})

describe('ChatThread order messages', () => {
  it('writes a change of the order as a notice, not a bubble, with its time after it', () => {
    const { getByTestId, queryByTestId, getByText } = renderThread([
      message({ _id: 5, type: 1, system: true, text: 'Order Status Changed from Pending to Accepted', time: '12:31', user: { _id: 99 } }),
    ])
    expect(getByTestId('chat-console')).toBeTruthy()
    expect(queryByTestId('chat-bubble')).toBeNull()
    const text = getByText('Order Status Changed from Pending to Accepted · 12:31')
    expect(flat(text).textAlign).toBe('center')
    expect(flat(text).color).toBe(themeColor(theme, 'text_muted'))
    expect(flat(getByTestId('chat-notice')).backgroundColor).toBe(theme.native.tokens.color.surface_alt)
  })

  it('leaves the time out of a notice when the theme hides it', () => {
    const { getByText } = renderThread([
      message({ _id: 5, type: 1, system: true, text: 'Order Status Changed', time: '12:31', user: { _id: 99 } }),
    ], { showTime: false })
    expect(getByText('Order Status Changed')).toBeTruthy()
  })

  it('writes when the order was placed and through which app, as one line, with nothing sent to anyone', () => {
    const { getByText, queryByTestId } = renderThread([
      message({
        _id: 0,
        type: 0,
        system: true,
        text: undefined,
        placed: 'Order placed for 2026-07-01 12:00 · Via Ordering',
      }),
    ])
    expect(getByText('Order placed for 2026-07-01 12:00 · Via Ordering')).toBeTruthy()
    expect(queryByTestId('chat-sent-to')).toBeNull()
  })

  it('draws nothing for a change with nothing to say', () => {
    const { queryByTestId } = renderThread([message({ _id: 6, type: 1, system: true, text: undefined })])
    expect(queryByTestId('chat-console')).toBeNull()
  })

  it('does not answer a long press', () => {
    const onOptions = jest.fn()
    const { getByTestId } = renderThread([message({ _id: 5, type: 1, system: true, text: 'Changed' })], { onOptions })
    expect(getByTestId('chat-console').props.onLongPress).toBeUndefined()
    expect(onOptions).not.toHaveBeenCalled()
  })
})

describe('ChatThread links and options', () => {
  let openURL: jest.SpyInstance

  beforeEach(() => {
    openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true as any)
  })
  afterEach(() => openURL.mockRestore())

  it('opens the web address and the email of a message', () => {
    const { getByText } = renderThread([
      message({ text: 'Menu at www.ordering.co or write help@ordering.co today' }),
    ])
    fireEvent.press(getByText('www.ordering.co'))
    expect(openURL).toHaveBeenLastCalledWith('https://www.ordering.co')
    fireEvent.press(getByText('help@ordering.co'))
    expect(openURL).toHaveBeenLastCalledWith('mailto:help@ordering.co')
    expect(openURL).toHaveBeenCalledTimes(2)
  })

  it('asks what to do with a phone instead of dialing it', () => {
    const onOptions = jest.fn()
    const item = message({ text: 'Call +52 55 1234 5678 now' })
    const { getByText } = renderThread([item], { onOptions })
    fireEvent.press(getByText('+52 55 1234 5678'))
    expect(openURL).not.toHaveBeenCalled()
    expect(onOptions).toHaveBeenCalledWith(item, '+52 55 1234 5678')
  })

  it('paints a link with the theme\'s link color, or the bubble\'s ink where the bubble has that color', () => {
    const link = theme.native.components.link.base.color
    const { getByText } = renderThread([
      message({ _id: 1, text: 'theirs https://ordering.co/a' }),
      message({ _id: 2, text: 'mine https://ordering.co/b', user: { _id: 7 } }),
    ])
    const theirs = flat(getByText('https://ordering.co/a'))
    expect(theirs).toEqual(expect.objectContaining({ color: link, textDecorationLine: 'underline' }))
    // My bubble is painted with the link's color: the link takes the bubble's ink.
    expect(bubble.mine_background.toLowerCase()).toBe(link.toLowerCase())
    const mine = flat(getByText('https://ordering.co/b'))
    expect(mine).toEqual(expect.objectContaining({ color: bubble.mine_color, textDecorationLine: 'underline' }))
  })

  it('gives the long press of a bubble, also on a link, to the caller', () => {
    const onOptions = jest.fn()
    const item = message({ text: 'Menu at www.ordering.co' })
    const { getByText, getByTestId } = renderThread([item], { onOptions })
    fireEvent(getByTestId('chat-bubble'), 'longPress')
    expect(onOptions).toHaveBeenLastCalledWith(item, undefined)
    fireEvent(getByText('www.ordering.co'), 'longPress')
    expect(onOptions).toHaveBeenCalledTimes(2)
    expect(openURL).not.toHaveBeenCalled()
  })

  it('leaves a message without links as one text', () => {
    const { getByText } = renderThread([message({ text: 'Order placed for 2026-11-10 12:30:00 Via Ordering app' })])
    fireEvent.press(getByText('Order placed for 2026-11-10 12:30:00 Via Ordering app'))
    expect(openURL).not.toHaveBeenCalled()
  })
})

describe('ChatThread scroll to bottom', () => {
  it('shows a floating button once the thread is scrolled up, and goes back to the last message', () => {
    const { getByTestId, queryByLabelText, getByLabelText } = renderThread([message({})])
    expect(queryByLabelText('Scroll to the last message')).toBeNull()
    const scrollTo = (y: number) => fireEvent.scroll(getByTestId('chat-list'), {
      nativeEvent: { contentOffset: { y }, contentSize: { height: 2000, width: 390 }, layoutMeasurement: { height: 600, width: 390 } },
    })
    scrollTo(400)
    const button = getByLabelText('Scroll to the last message')
    expect(button.props.accessibilityRole).toBe('button')
    fireEvent.press(button)
    scrollTo(0)
    expect(queryByLabelText('Scroll to the last message')).toBeNull()
  })
})

describe('ChatThread image viewer', () => {
  const inverse = theme.native.tokens.color.inverse_surface
  const paintedInverse = (root: any) => root.findAll((node: any) =>
    typeof node.type === 'string' && StyleSheet.flatten(node.props.style)?.backgroundColor === inverse && node.props.testID === 'chat-image-viewer')

  it('opens the image full screen over the inverse surface and closes with its button', () => {
    const { getByRole, getByLabelText, UNSAFE_root, UNSAFE_getAllByType } = renderThread([
      message({ text: '', image: 'https://cdn.test/photo.jpg' }),
    ])
    const shown = () => UNSAFE_getAllByType(Image).filter(image => image.props.source?.uri === 'https://cdn.test/photo.jpg').length
    expect(shown()).toBe(1)
    expect(paintedInverse(UNSAFE_root)).toHaveLength(0)

    fireEvent.press(getByRole('imagebutton'))
    expect(shown()).toBe(2)
    expect(paintedInverse(UNSAFE_root).length).toBeGreaterThan(0)

    // Its close button is named as such (not "Cancel").
    fireEvent.press(getByLabelText('Close'))
    expect(shown()).toBe(1)
  })

  // A finger's drag as the responder system gives it to the viewer.
  const drag = (view: any, dx: number, dy: number) => {
    const touch = (x: number, y: number, time: number, start = false) => ({
      touchActive: true,
      startPageX: 100, startPageY: 200, startTimeStamp: 1000,
      currentPageX: x, currentPageY: y, currentTimeStamp: time,
      previousPageX: start ? x : 100, previousPageY: start ? y : 200, previousTimeStamp: 1000,
    })
    const event = (x: number, y: number, time: number, start = false) => ({
      nativeEvent: { touches: [{}], changedTouches: [{}], identifier: 0, pageX: x, pageY: y, timestamp: time },
      touchHistory: { touchBank: [touch(x, y, time, start)], numberActiveTouches: 1, indexOfSingleActiveTouch: 0, mostRecentTimeStamp: time },
    })
    const handlers = view.getByTestId('chat-image-viewer-drag').props
    // Taken at the touch's start: the Modal's own container takes it otherwise.
    expect(handlers.onStartShouldSetResponder(event(100, 200, 1000, true))).toBe(true)
    act(() => {
      handlers.onResponderGrant(event(100, 200, 1000, true))
      handlers.onResponderMove(event(100 + dx, 200 + dy, 2000))
      handlers.onResponderRelease({ ...event(100 + dx, 200 + dy, 2000), touchHistory: { touchBank: [{ ...touch(100 + dx, 200 + dy, 2000), touchActive: false }], numberActiveTouches: 0, indexOfSingleActiveTouch: -1, mostRecentTimeStamp: 2000 } })
    })
  }

  it('closes when the image is dragged down, not when it is moved a little or sideways', () => {
    const view = renderThread([message({ text: '', image: 'https://cdn.test/photo.jpg' })])
    const open = () => view.UNSAFE_getAllByType(Image).filter(image => image.props.source?.uri === 'https://cdn.test/photo.jpg').length === 2
    fireEvent.press(view.getByRole('imagebutton'))
    expect(open()).toBe(true)

    drag(view, 0, 40)
    expect(open()).toBe(true)
    drag(view, 400, 30)
    expect(open()).toBe(true)
    drag(view, 5, 500)
    expect(open()).toBe(false)
  })

  it('opens the photo of a change of the order too', () => {
    const { getByRole, getByLabelText } = renderThread([
      message({ _id: 5, type: 1, system: true, text: 'Changed', image: 'https://cdn.test/proof.jpg' }),
    ])
    fireEvent.press(getByRole('imagebutton'))
    expect(getByLabelText('Close')).toBeTruthy()
  })
})
