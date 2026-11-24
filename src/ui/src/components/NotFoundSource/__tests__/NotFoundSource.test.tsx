import React from 'react'
import { Image, StyleSheet, Text, View } from 'react-native'
import { fireEvent, within } from '@testing-library/react-native'
import Ionicons from '@react-native-vector-icons/ionicons/static'

import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { buildAppTheme, defaultAppTheme, THEME_PRODUCT_TYPE } from '../../../../../theme/engine'
import { themeImage } from '../../../../../theme/helpers'

import { NotFoundSource } from '..'

/** A theme built from values, as the app builds it (never a spread). */
const themeWith = (values: any) => buildAppTheme({ version: 2, product_type: THEME_PRODUCT_TYPE, values })
const flat = (node: any) => StyleSheet.flatten(node.props.style)

describe('NotFoundSource', () => {
  it('renders content and handles button press', () => {
    const onClickButton = jest.fn()
    const { getByText, getByRole } = renderWithProviders(
      <NotFoundSource
        content="Page not found"
        btnTitle="Go back"
        onClickButton={onClickButton}
      />
    )
    expect(getByText('Page not found')).toBeTruthy()
    expect(getByText('Go back')).toBeTruthy()
    fireEvent.press(getByRole('button'))
    expect(onClickButton).toHaveBeenCalled()
  })

  it('renders children when button handler is absent', () => {
    const { getByText, queryByRole } = renderWithProviders(
      <NotFoundSource content="Missing">
        <View><Text>Custom child</Text></View>
      </NotFoundSource>
    )
    expect(getByText('Custom child')).toBeTruthy()
    expect(queryByRole('button')).toBeNull()
  })

  it('draws what the caller adds between the message and the action, the action as wide as the box', () => {
    const onClickButton = jest.fn()
    const { getByText, getByRole } = renderWithProviders(
      <NotFoundSource content="Outside the schedule" btnTitle="Go back" onClickButton={onClickButton}>
        <View><Text>Next time: Sunday</Text></View>
      </NotFoundSource>
    )
    expect(getByText('Outside the schedule')).toBeTruthy()
    expect(getByText('Next time: Sunday')).toBeTruthy()
    const button = getByRole('button', { name: 'Go back' })
    // The action's row takes the box's width: the button fills it.
    let row: any = button.parent
    while (row && flat(row)?.width === undefined) row = row.parent
    expect(flat(row).width).toBe('100%')
    expect(flat(row).marginTop).toBe(defaultAppTheme().native.components.empty_state.base.actions_gap)
    fireEvent.press(button)
    expect(onClickButton).toHaveBeenCalledTimes(1)
  })

  it('dims the action and stops its taps while `btnDisabled`', () => {
    const onClickButton = jest.fn()
    const { getByRole } = renderWithProviders(
      <NotFoundSource content="Network Error" btnTitle="Try Again" btnDisabled onClickButton={onClickButton} />
    )
    const button = getByRole('button', { name: 'Try Again' })
    expect(button.props.accessibilityState.disabled).toBe(true)
    fireEvent.press(button)
    expect(onClickButton).not.toHaveBeenCalled()
  })

  it('hides the message of a conditioned empty state', () => {
    const { queryByText } = renderWithProviders(<NotFoundSource content="Missing" conditioned />)
    expect(queryByText('Missing')).toBeNull()
  })

  it('paints no bundled picture: an icon while the theme sets no `empty.not_found`', () => {
    const theme: any = defaultAppTheme()
    expect(themeImage(theme, 'empty.not_found')).toBeUndefined()
    const { UNSAFE_queryAllByType, getByTestId } = renderWithProviders(<NotFoundSource content="Missing" />)
    expect(UNSAFE_queryAllByType(Image)).toHaveLength(0)
    expect(getByTestId('not-found-icon')).toBeTruthy()
  })

  it('draws that icon at the state\'s own `icon_size`, in the brand\'s text color', () => {
    const theme: any = defaultAppTheme()
    const { getByTestId } = renderWithProviders(<NotFoundSource content="Missing" />)
    const glyph = within(getByTestId('not-found-icon')).UNSAFE_getByType(Ionicons as any)
    expect(glyph.props.name).toBe('file-tray-outline')
    expect(glyph.props.size).toBe(theme.native.components.empty_state.base.icon_size)
    expect(glyph.props.color).toBe(theme.native.tokens.color.primary_text)

    const custom = themeWith({
      components: { empty_state: { base: { icon_size: 64 } } },
      tokens: { color: { primary_text: '#AA3300' } }
    })
    const again = renderWithProviders(<NotFoundSource content="Missing" />, { themeOverrides: custom })
    const painted = within(again.getByTestId('not-found-icon')).UNSAFE_getByType(Ionicons as any)
    expect(painted.props.size).toBe(64)
    expect(painted.props.color).toBe('#AA3300')
  })

  it('sits right over its message: the icon\'s own height, the picture\'s gap under it', () => {
    const empty = defaultAppTheme().native.components.empty_state.base
    const { getByTestId } = renderWithProviders(<NotFoundSource content="Missing" />)
    const box = flat(getByTestId('not-found-icon'))
    expect(box).toEqual(expect.objectContaining({
      width: '100%',
      marginBottom: empty.image_gap,
      alignItems: 'center',
      justifyContent: 'center'
    }))
    // Not the picture's room: a small icon in it reads as detached from the message.
    expect(box.height).toBeUndefined()
  })

  it('paints the served picture instead of the icon when the theme sets `empty.not_found`', () => {
    const custom = themeWith({ images: { 'empty.not_found': 'https://example.com/empty.png' } })
    const served = renderWithProviders(<NotFoundSource content="Missing" />, { themeOverrides: custom })
    expect(served.UNSAFE_getByType(Image).props.source).toEqual({ uri: 'https://example.com/empty.png' })
    expect(served.queryByTestId('not-found-icon')).toBeNull()
  })

  it('draws the served picture as a square of `empty_state.base.image_size` (180), rounded as a dialog and centered', () => {
    const empty = defaultAppTheme().native.components.empty_state.base
    expect(empty.image_size).toBe(180)
    const custom = themeWith({ images: { 'empty.not_found': 'https://example.com/empty.png' } })
    const served = renderWithProviders(<NotFoundSource content="Missing" />, { themeOverrides: custom })
    expect(flat(served.UNSAFE_getByType(Image))).toEqual(expect.objectContaining({
      width: empty.image_size,
      height: empty.image_size,
      borderTopLeftRadius: defaultAppTheme().native.tokens.radius.lg,
      borderBottomRightRadius: defaultAppTheme().native.tokens.radius.lg
    }))
  })

  it('paints the caller\'s image over the theme\'s', () => {
    const own = { uri: 'https://example.com/own.png' }
    const { UNSAFE_getByType, queryByTestId } = renderWithProviders(<NotFoundSource image={own} />)
    expect(UNSAFE_getByType(Image).props.source).toBe(own)
    expect(queryByTestId('not-found-icon')).toBeNull()
  })

  it('takes its box and its image size from `components.empty_state`', () => {
    const empty = defaultAppTheme().native.components.empty_state.base
    const own = { uri: 'https://example.com/own.png' }
    const { UNSAFE_getByType, toJSON } = renderWithProviders(<NotFoundSource content="Missing" image={own} />)
    expect(flat(UNSAFE_getByType(Image)).height).toBe(empty.image_size)
    expect(flat(UNSAFE_getByType(Image)).marginBottom).toBe(empty.image_gap)
    expect(flat(toJSON()).paddingVertical).toBe(empty.padding_y)
    expect(flat(toJSON()).marginVertical).toBe(empty.margin)

    const custom = themeWith({ components: { empty_state: { base: { image_size: 120 } } } })
    const again = renderWithProviders(<NotFoundSource content="Missing" image={own} />, { themeOverrides: custom })
    expect(flat(again.UNSAFE_getByType(Image)).height).toBe(120)
  })
})
