import React, { useCallback, useMemo, useRef, useState } from 'react'
import {
  FlatList,
  Image,
  Linking,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  View,
} from 'react-native'
import { useTheme } from 'styled-components/native'

import { OFab, OSpinner, OText } from '../shared'
import { ImageViewer } from './ImageViewer'
import { splitLinks } from './linkify'
import {
  nativeBoxStyle,
  themeColor,
  themeGutter,
  themePart,
  themeRadius,
  themeSpace,
  themeText,
} from '@/theme/helpers'

/**
 * The order chat's thread, the app's own (in place of react-native-gifted-chat):
 * an inverted list, newest message at the bottom, with the day over the first
 * message of each day. A person's message is a bubble of `components.chat_bubble`
 * (an image that opens full screen, the text with its web addresses, emails and
 * phones as links, the time) with the sender's name over it and who it was sent
 * to under it, written out ("Sent to: Business, Customer"); an order's own
 * message (it was placed, its status changed) is a notice in the middle, one
 * line of text with its time. A long press on a bubble, or a tap on a phone, is the
 * caller's (`onOptions`). The composer is the caller's too (`footer`).
 *
 * Everything a row paints comes in its message, already written (the day, the
 * time, the sender, the avatars): a row is redrawn only when its message is.
 */
export type ChatMessage = {
  _id: string | number
  /** 0: the order was placed · 1: a change of the order · else a person's message. */
  type?: number
  text?: string
  /** Local, as `YYYY-MM-DD HH:mm:ss`. */
  createdAt?: string | false
  image?: string | null
  /** An order's own message: a notice, not a bubble. */
  system?: boolean
  /** The first message: when the order was placed and through which app, as one line ("Order placed for … · Via …"). */
  placed?: string
  /** The date and the time as the project writes them. */
  day?: string
  time?: string
  /** "Name (role)", over another person's message. */
  sender?: string | null
  /** "Sent to:" and who can read the message ("Business", "Customer"), under a person's message. */
  sentToLabel?: string
  sentTo?: string[]
  user?: { _id?: string | number | null }
}

type ChatThreadProps = {
  messages: ChatMessage[]
  userId?: string | number
  loading?: boolean
  /** `visibility.messages.time`. */
  showTime: boolean
  /** A long press on a bubble, or a tap on a phone of its text (then with that phone). */
  onOptions: (message: ChatMessage, phone?: string) => void
  closeLabel: string
  scrollToBottomLabel: string
  footer: React.ReactNode
}

/** Past this offset (as gifted-chat's 200) the scroll-to-bottom button shows. */
const SCROLL_TO_BOTTOM_OFFSET = 200

const sameDay = (a?: ChatMessage, b?: ChatMessage) =>
  !!a?.createdAt && !!b?.createdAt && String(a.createdAt).slice(0, 10) === String(b.createdAt).slice(0, 10)

const sameColor = (a?: string, b?: string) => !!a && !!b && a.toLowerCase() === b.toLowerCase()

// A link inside a text: OText passes what it does not know to its Text.
const Link = OText as React.ComponentType<any>

const threadStyles = (theme: any) => {
  const bubble = theme.native.components.chat_bubble.base
  const link = themePart(theme, 'link', 'base')
  const body = themeText(theme, 'body')
  const thumb = themePart(theme, 'avatar', 'sizes.xl.size')
  const box = (background: string, tailCorner: 'borderBottomLeftRadius' | 'borderBottomRightRadius') => ({
    flexShrink: 1,
    borderRadius: bubble.radius,
    paddingHorizontal: bubble.padding_x,
    paddingVertical: bubble.padding_y,
    // The tail: the corner at the sender's side is square but for `xxs` (the boards' 2).
    ...(bubble.tail ? { [tailCorner]: themeSpace(theme, 'xxs') } : {}),
    ...nativeBoxStyle({ background, border: bubble.border, shadow: bubble.shadow }),
  })
  // A link is read on its bubble: the theme's link color, or the bubble's own
  // ink where the bubble is painted with that color (mine, by default).
  const linkLook = (ink: string, background: string) => ({
    color: sameColor(link.color, background) ? ink : link.color,
    textDecorationLine: 'underline' as const,
  })
  return StyleSheet.create({
    wrapper: { flex: 1 },
    messages: { flex: 1, backgroundColor: themeColor(theme, 'background') },
    list: { flex: 1 },
    // The list is inverted: its `paddingTop` is under the last message, over
    // the composer, where a short thread starts.
    content: {
      flexGrow: 1,
      paddingTop: themeSpace(theme, 'xs'),
      paddingBottom: themeSpace(theme, 'md'),
      paddingHorizontal: themeGutter(theme),
    },
    loading: { alignSelf: 'center', marginVertical: themeSpace(theme, 'sm') },
    day: { alignItems: 'center', marginTop: themeSpace(theme, 'xs'), marginBottom: themeSpace(theme, 'sm') },
    row: { marginVertical: themeSpace(theme, 'xs') },
    rowMine: { alignItems: 'flex-end', paddingLeft: themeSpace(theme, 'xxxl') },
    rowTheirs: { alignItems: 'flex-start', paddingRight: themeSpace(theme, 'xxxl') },
    rowNotice: { alignItems: 'center' },
    bubbleMine: box(bubble.mine_background, 'borderBottomRightRadius'),
    bubbleTheirs: box(bubble.theirs_background, 'borderBottomLeftRadius'),
    textMine: { ...body, color: bubble.mine_color },
    textTheirs: { ...body, color: bubble.theirs_color },
    sender: { marginBottom: themeSpace(theme, 'xxs') },
    linkMine: linkLook(bubble.mine_color, bubble.mine_background),
    linkTheirs: linkLook(bubble.theirs_color, bubble.theirs_background),
    // As gifted-chat's image (150 × 100): the largest avatar's height, wider by `xxxl`.
    image: {
      width: thumb + themeSpace(theme, 'xxxl'),
      height: thumb,
      borderRadius: themeRadius(theme, 'lg'),
      marginBottom: themeSpace(theme, 'xs'),
    },
    time: { alignSelf: 'flex-end', marginTop: themeSpace(theme, 'xxs') },
    timeMine: { color: bubble.mine_color },
    timeTheirs: { color: themeColor(theme, 'text_muted') },
    notice: {
      alignItems: 'center',
      borderRadius: bubble.radius,
      paddingHorizontal: bubble.padding_x,
      paddingVertical: themeSpace(theme, 'sm'),
      backgroundColor: themeColor(theme, 'surface_alt'),
    },
    sentTo: { marginTop: themeSpace(theme, 'xs') },
    scrollToBottom: { position: 'absolute', right: themeGutter(theme), bottom: themeSpace(theme, 'sm') },
  })
}

type RowProps = {
  item: ChatMessage
  mine: boolean
  showDay: boolean
  showTime: boolean
  styles: ReturnType<typeof threadStyles>
  onOptions: (message: ChatMessage, phone?: string) => void
  onOpenImage: (uri: string) => void
}

const SentTo = ({ item, styles }: Pick<RowProps, 'item' | 'styles'>) => !item.sentTo?.length ? null : (
  <OText preset='caption' color='text_muted' style={styles.sentTo} testID='chat-sent-to'>
    {`${item.sentToLabel} ${item.sentTo.join(', ')}`}
  </OText>
)

const ThreadRow = React.memo(({ item, mine, showDay, showTime, styles, onOptions, onOpenImage }: RowProps) => {
  const image = !!item.image && (
    <Pressable onPress={() => onOpenImage(item.image as string)} accessibilityRole='imagebutton'>
      <Image source={{ uri: item.image as string }} style={styles.image} resizeMode='cover' />
    </Pressable>
  )
  return (
    <View testID='chat-message'>
      {showDay && !!item.day && (
        <View style={styles.day}>
          <OText preset='caption' color='text_muted'>{item.day}</OText>
        </View>
      )}
      {item.system ? (!item.placed && !item.text && !item.image) ? null : (
        <View style={[styles.row, styles.rowNotice]} testID='chat-console'>
          <View style={styles.notice} testID='chat-notice'>
            {/* The order's own messages: one line of text, with its time after it. */}
            <OText preset='body_sm' color='text_muted' align='center' numberOfLines={4}>
              {item.placed ?? [item.text, showTime ? item.time : undefined].filter(Boolean).join(' · ')}
            </OText>
            {image}
          </View>
        </View>
      ) : (
        <View style={[styles.row, mine ? styles.rowMine : styles.rowTheirs]}>
          {!mine && !!item.sender && <OText preset='body_sm' color='text_muted' style={styles.sender}>{item.sender}</OText>}
          <Pressable
            onLongPress={() => onOptions(item)}
            style={mine ? styles.bubbleMine : styles.bubbleTheirs}
            testID='chat-bubble'
          >
            {image}
            {!!item.text && (
              <OText style={mine ? styles.textMine : styles.textTheirs}>
                {splitLinks(item.text).map((part, position) => (part.type === 'text' ? part.text : (
                  <Link
                    key={position}
                    accessibilityRole='link'
                    style={mine ? styles.linkMine : styles.linkTheirs}
                    // A phone asks what to do with it (call, text); the rest opens.
                    // A link nothing on the device opens stays as text.
                    onPress={() => part.type === 'phone' ? onOptions(item, part.text) : Linking.openURL(part.href).catch(() => {})}
                    // The long press of a link is the message's.
                    onLongPress={() => onOptions(item)}
                  >
                    {part.text}
                  </Link>
                )))}
              </OText>
            )}
            {showTime && !!item.time && (
              <OText preset='caption' style={[styles.time, mine ? styles.timeMine : styles.timeTheirs]}>
                {item.time}
              </OText>
            )}
          </Pressable>
          <SentTo item={item} styles={styles} />
        </View>
      )}
    </View>
  )
})

export const ChatThread = (props: ChatThreadProps) => {
  const { messages, userId, loading, showTime, onOptions, closeLabel, scrollToBottomLabel, footer } = props
  const theme: any = useTheme()
  const styles = useMemo(() => threadStyles(theme), [theme])
  const listRef = useRef<FlatList<ChatMessage>>(null)
  const [showScrollToBottom, setShowScrollToBottom] = useState(false)
  const [viewerImage, setViewerImage] = useState<string | null>(null)

  // The caller's handler changes with every render: the rows keep one function.
  const options = useRef(onOptions)
  options.current = onOptions
  const handleOptions = useCallback((message: ChatMessage, phone?: string) => options.current(message, phone), [])
  const openImage = useCallback((uri: string) => setViewerImage(uri), [])

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setShowScrollToBottom(event.nativeEvent.contentOffset.y > SCROLL_TO_BOTTOM_OFFSET)
  }

  const renderItem = useCallback(({ item, index }: { item: ChatMessage, index: number }) => (
    <ThreadRow
      item={item}
      mine={userId !== undefined && item.user?._id === userId}
      showDay={!sameDay(item, messages[index + 1])}
      showTime={showTime}
      styles={styles}
      onOptions={handleOptions}
      onOpenImage={openImage}
    />
  ), [messages, userId, showTime, styles, handleOptions, openImage])

  return (
    <View style={styles.wrapper}>
      <View style={styles.messages}>
        {loading && messages.length === 0 && (
          <OSpinner style={styles.loading} testID='chat-loading' />
        )}
        <FlatList
          ref={listRef}
          testID='chat-list'
          inverted
          data={messages}
          keyExtractor={(item) => String(item._id)}
          renderItem={renderItem}
          keyboardShouldPersistTaps='handled'
          showsVerticalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={100}
          style={styles.list}
          contentContainerStyle={styles.content}
        />
        {showScrollToBottom && (
          <OFab
            iconName='chevron-down'
            onPress={() => listRef.current?.scrollToOffset({ offset: 0, animated: true })}
            accessibilityLabel={scrollToBottomLabel}
            style={styles.scrollToBottom}
          />
        )}
      </View>
      {footer}
      <ImageViewer uri={viewerImage} closeLabel={closeLabel} onClose={() => setViewerImage(null)} />
    </View>
  )
}
