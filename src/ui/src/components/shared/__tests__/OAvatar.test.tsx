import React from 'react'
import { Image, StyleSheet } from 'react-native'
import { act } from '@testing-library/react-native'

import { OAvatar } from '../OAvatar'
import Icon from '../Icon'
import { defaultAppTheme } from '../../../../../theme/engine'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'

const failToLoad = (view: any) => act(() => { view.UNSAFE_getByType(Image).props.onError({ nativeEvent: { error: 'unreachable' } }) })

describe('OAvatar when its picture does not load', () => {
  it('paints the picture it was given at once, with no placeholder before it loads', () => {
    const view = renderWithProviders(<OAvatar source='https://example.com/me.jpg' testID='me' />)
    expect(view.UNSAFE_getByType(Image).props.source.uri).toBe('https://example.com/me.jpg')
    expect(view.UNSAFE_queryAllByType(Icon)).toHaveLength(0)
  })

  it('falls back to the person\'s glyph when the picture fails', () => {
    const view = renderWithProviders(<OAvatar source='https://example.com/gone.jpg' />)
    failToLoad(view)
    expect(view.UNSAFE_queryAllByType(Image)).toHaveLength(0)
    expect(view.UNSAFE_getByType(Icon).props.name).toBe('person')
  })

  it('falls back to the store\'s placeholder (the theme\'s image, or the glyph without one) for a logo that fails', () => {
    const placeholder = renderWithProviders(<OAvatar kind='business' />)
    const view = renderWithProviders(<OAvatar kind='business' source='https://example.com/gone.png' />)
    failToLoad(view)
    const expected = placeholder.UNSAFE_queryAllByType(Image)[0]?.props.source
    if (expected === undefined) expect(view.UNSAFE_getByType(Icon).props.name).toBe('storefront')
    else expect(view.UNSAFE_getByType(Image).props.source).toEqual(expected)
    // The placeholder is not asked to report a failure of its own: it cannot loop.
    expect(view.UNSAFE_queryAllByType(Image).every((image) => image.props.onError === undefined)).toBe(true)
  })

  it('tries another picture again after one failed', () => {
    const view = renderWithProviders(<OAvatar source='https://example.com/gone.jpg' />)
    failToLoad(view)
    view.rerender(<OAvatar source='https://example.com/other.jpg' />)
    expect(view.UNSAFE_getByType(Image).props.source.uri).toBe('https://example.com/other.jpg')
  })

  it('does the same for a source given as an address object', () => {
    const view = renderWithProviders(<OAvatar source={{ uri: 'https://example.com/gone.jpg' }} />)
    failToLoad(view)
    expect(view.UNSAFE_getByType(Icon).props.name).toBe('person')
  })

  it('keeps the placeholder when there is no picture, with nothing to fail', () => {
    const view = renderWithProviders(<OAvatar source={null} />)
    expect(view.UNSAFE_getByType(Icon).props.name).toBe('person')
  })
})

describe('OAvatar tone', () => {
  const theme: any = defaultAppTheme()
  const avatar = theme.native.components.avatar
  const box = (view: any, testID: string) => StyleSheet.flatten(view.getByTestId(testID).props.style)

  it('keeps the brand fill and the person glyph by default', () => {
    const view = renderWithProviders(<OAvatar testID='a' size='lg' />)
    expect(box(view, 'a').backgroundColor).toBe(avatar.base.background)
    const glyph = view.UNSAFE_getByType(Icon)
    expect(glyph.props.name).toBe('person')
    expect(glyph.props.color).toBe(avatar.base.color)
  })

  it('paints the neutral placeholder as a disc of the border\'s grey under a muted outline glyph, the avatar\'s size and shape', () => {
    const view = renderWithProviders(<OAvatar testID='a' size='lg' tone='neutral' />)
    expect(box(view, 'a')).toEqual(expect.objectContaining({
      width: avatar.sizes.lg.size,
      height: avatar.sizes.lg.size,
      borderRadius: avatar.base.radius,
      backgroundColor: theme.native.tokens.color.border
    }))
    const glyph = view.UNSAFE_getByType(Icon)
    expect(glyph.props.name).toBe('person-outline')
    expect(glyph.props.color).toBe('text_muted')
    expect(glyph.props.size).toBe(avatar.sizes.lg.icon_size)
  })

  it('draws no picture of the theme\'s in the neutral placeholder', () => {
    const view = renderWithProviders(<OAvatar tone='neutral' />)
    expect(view.UNSAFE_queryAllByType(Image)).toHaveLength(0)
  })

  it('draws a served picture the same in both tones, over the avatar\'s own fill', () => {
    const view = renderWithProviders(<OAvatar testID='a' tone='neutral' source='https://example.com/me.jpg' />)
    expect(view.UNSAFE_getByType(Image).props.source.uri).toBe('https://example.com/me.jpg')
    expect(box(view, 'a').backgroundColor).toBe(avatar.base.background)
    expect(view.UNSAFE_queryAllByType(Icon)).toHaveLength(0)
  })

  it('gives way to the neutral disc when a picture fails', () => {
    const view = renderWithProviders(<OAvatar testID='a' tone='neutral' source='https://example.com/gone.jpg' />)
    failToLoad(view)
    expect(view.UNSAFE_queryAllByType(Image)).toHaveLength(0)
    expect(box(view, 'a').backgroundColor).toBe(theme.native.tokens.color.border)
    expect(view.UNSAFE_getByType(Icon).props.name).toBe('person-outline')
  })

  it('uses the storefront outline for a store\'s neutral placeholder', () => {
    const view = renderWithProviders(<OAvatar kind='business' tone='neutral' />)
    expect(view.UNSAFE_getByType(Icon).props.name).toBe('storefront-outline')
  })
})
