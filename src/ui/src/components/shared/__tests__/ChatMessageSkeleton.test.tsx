import React from 'react'
import { StyleSheet } from 'react-native'
import { fireEvent } from '@testing-library/react-native'

import { ChatMessageSkeleton } from '../ChatMessageSkeleton'
import { chatStyles } from '../../Chat/styles'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { themeRadius } from '../../../../../theme/helpers'
import { buildAppTheme, defaultAppTheme, THEME_PRODUCT_TYPE } from '../../../../../theme/engine'

const themeWith = (values: any) => buildAppTheme({ version: 2, product_type: THEME_PRODUCT_TYPE, values })

/** Every bone of the tree: the views painted with the skeleton's color. */
const bones = (root: any, theme: any) => root
  .findAll((node: any) => typeof node.type === 'string' && StyleSheet.flatten(node.props.style)?.backgroundColor === theme.native.components.skeleton.base.color)
  .map((node: any) => StyleSheet.flatten(node.props.style))

describe('ChatMessageSkeleton', () => {
  const theme: any = defaultAppTheme()
  // A driver, in a project that has texts for the quick messages (`quickMessagesOf`).
  const components = require('@components')
  const project = (dictionary: Record<string, string>) => {
    components.useLanguage.mockReturnValue([{ loading: false, dictionary }, (key: string, fallback?: string) => dictionary[key] ?? fallback ?? key])
    components.useSession.mockReturnValue([{ auth: true, user: { id: 7, level: 4 } }, {}])
  }
  beforeEach(() => project({ DRIVER_MESSAGE_1: 'On my way' }))
  const bubble = theme.native.components.chat_bubble.base
  const typography = theme.native.tokens.typography

  it('is drawn with bones of the theme\'s skeleton, under the app\'s own bar with its back arrow', () => {
    const onBack = jest.fn()
    const { getByTestId, getByLabelText, UNSAFE_root } = renderWithProviders(<ChatMessageSkeleton onBack={onBack} />)
    expect(getByTestId('chat-message-skeleton')).toBeTruthy()
    fireEvent.press(getByLabelText('Go back'))
    expect(onBack).toHaveBeenCalled()
    // The bar (title, subtitle, logo), five bubbles and the composer: "Send to" and two chips, three
    // quick messages, the two buttons, the field and the send button.
    expect(bones(UNSAFE_root, theme)).toHaveLength(3 + 5 + 3 + 3 + 4)
  })

  it('draws the bar as the loaded one: texts one under the other in the bar\'s box, a rounded square for the store\'s logo', () => {
    const { getByTestId, UNSAFE_root } = renderWithProviders(<ChatMessageSkeleton />)
    const all = bones(UNSAFE_root, theme)
    const header = theme.native.components.header.base
    const avatar = theme.native.components.avatar.sizes.sm.size
    // The title's and the subtitle's bones are the lines of the real texts.
    const [title, subtitle, logoBone] = all
    expect(title.height).toBe(header.title.lineHeight)
    expect(subtitle.height).toBe(theme.native.tokens.typography.body_sm.lineHeight)
    // Nothing between the two lines (the loaded bar draws none): the bar does not change when it loads.
    const textBox = (node: any) => {
      for (let up = node.parent; up; up = up.parent) if (StyleSheet.flatten(up.props?.style)?.flex === 1) return StyleSheet.flatten(up.props.style)
      throw new Error('no text box')
    }
    const boneNodes = UNSAFE_root.findAll((node: any) => typeof node.type === 'string' && StyleSheet.flatten(node.props.style)?.backgroundColor === theme.native.components.skeleton.base.color)
    expect(textBox(boneNodes[0]).gap).toBeUndefined()
    expect(textBox(boneNodes[0]).paddingVertical).toBeUndefined()
    // The logo is the avatar's `sm` square with a store's rounded corners, not a circle.
    expect(logoBone).toEqual(expect.objectContaining({ width: avatar, height: avatar, borderRadius: themeRadius(theme, 'sm') }))
    expect(getByTestId('chat-message-skeleton')).toBeTruthy()
  })

  it('gives its bubbles the size and shape of a real one', () => {
    const { UNSAFE_root } = renderWithProviders(<ChatMessageSkeleton />)
    const oneLine = 2 * bubble.padding_y + typography.body.lineHeight + theme.native.tokens.space.xxs + typography.caption.lineHeight
    const bubbles = bones(UNSAFE_root, theme).filter((bone: any) => bone.borderRadius === bubble.radius && (bone.borderBottomLeftRadius === 0 || bone.borderBottomRightRadius === 0))
    expect(bubbles).toHaveLength(5)
    expect(bubbles.filter((bone: any) => bone.height === oneLine)).toHaveLength(4)
    expect(bubbles.filter((bone: any) => bone.height === oneLine + typography.body.lineHeight)).toHaveLength(1)
    // Theirs keep the tail on the left, mine on the right.
    expect(bubbles.filter((bone: any) => bone.borderBottomLeftRadius === 0)).toHaveLength(3)
    expect(bubbles.filter((bone: any) => bone.borderBottomRightRadius === 0)).toHaveLength(2)
  })

  it('draws the composer\'s three rows, laid out with the chat\'s own styles (decision H9)', () => {
    const { getByTestId, UNSAFE_root } = renderWithProviders(<ChatMessageSkeleton />)
    const chat = chatStyles(theme, 0)
    const composer = getByTestId('chat-message-skeleton-composer')
    // The composer is the chat's toolbar: its padding and the gap between its rows.
    const toolbar = StyleSheet.flatten(composer.props.style)
    expect(toolbar.paddingTop).toBe(StyleSheet.flatten(chat.toolbar).paddingTop)
    expect(toolbar.gap).toBe(StyleSheet.flatten(chat.toolbar).gap)
    expect(composer.children).toHaveLength(3)
    const all = bones(UNSAFE_root, theme)
    const input = theme.native.components.input
    const send = theme.native.components.button.sizes[theme.native.components.chat_bubble.slots.send.size].height
    // The recipients and the quick messages are as tall as the chat's chips (`md`).
    expect(all.filter((bone: any) => bone.height === theme.native.components.chip.sizes.md.height && bone.borderRadius === theme.native.components.chip.base.radius)).toHaveLength(2 + 3)
    // The row's two buttons are the chat's ghost icon buttons.
    const button = theme.native.components.button.sizes.md.height
    expect(all.filter((bone: any) => bone.height === button && bone.width === button).length).toBeGreaterThanOrEqual(2)
    expect(all.some((bone: any) => bone.height === input.sizes.md.height && bone.borderRadius === input.base.radius)).toBe(true)
    expect(all.some((bone: any) => bone.height === send && bone.width === send)).toBe(true)
  })

  it('follows the theme: a bubble without the time is shorter, and takes the theme\'s radius', () => {
    const custom: any = themeWith({
      visibility: { 'messages.time': false },
      components: { chat_bubble: { base: { radius: 4, tail: false } } }
    })
    const { UNSAFE_root } = renderWithProviders(<ChatMessageSkeleton />, { themeOverrides: custom })
    const oneLine = 2 * bubble.padding_y + typography.body.lineHeight
    const bubbles = bones(UNSAFE_root, custom).filter((bone: any) => bone.borderRadius === 4 && bone.height >= oneLine && bone.flex === undefined && typeof bone.width === 'string')
    expect(bubbles).toHaveLength(5)
    expect(bubbles.filter((bone: any) => bone.height === oneLine)).toHaveLength(4)
    expect(bubbles.every((bone: any) => bone.borderBottomLeftRadius === undefined && bone.borderBottomRightRadius === undefined)).toBe(true)
  })

  it('leaves out the quick messages row when the theme hides it (a hidden piece draws no view)', () => {
    const custom: any = themeWith({ visibility: { 'messages.quick_messages': false } })
    const { getByTestId } = renderWithProviders(<ChatMessageSkeleton />, { themeOverrides: custom })
    expect(getByTestId('chat-message-skeleton-composer').children).toHaveLength(2)
  })

  it('leaves out the quick messages row when the project has no text for them, as the chat does', () => {
    project({})
    const { getByTestId } = renderWithProviders(<ChatMessageSkeleton />)
    expect(getByTestId('chat-message-skeleton-composer').children).toHaveLength(2)
  })
})
