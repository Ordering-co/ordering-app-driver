import React from 'react'
import { Platform, StyleSheet } from 'react-native'
import { fireEvent } from '@testing-library/react-native'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
const { iconSource, setupSharedComponentHooks } = require('../../../../../../jest/helpers/driverSharedTestSetup')
import OInput from '../OInput'
import { defaultAppTheme } from '../../../../../theme/engine'

setupSharedComponentHooks()

describe('OInput', () => {
  it('handles change, focus, and blur', () => {
    const onChange = jest.fn()
    const onFocus = jest.fn()
    const onBlur = jest.fn()
    const { getByPlaceholderText } = renderWithProviders(
      <OInput
        placeholder="Email"
        name="email"
        icon={iconSource}
        onChange={onChange}
        onFocus={onFocus}
        onBlur={onBlur}
      />
    )
    const input = getByPlaceholderText('Email')
    fireEvent(input, 'focus')
    fireEvent.changeText(input, 'test@example.com')
    fireEvent(input, 'blur')
    expect(onFocus).toHaveBeenCalled()
    expect(onChange).toHaveBeenCalled()
    expect(onBlur).toHaveBeenCalled()
  })

  it('keeps the same border room at rest and in error, so the text never moves', () => {
    const borderOf = (hasError: boolean) => {
      const { getByPlaceholderText, unmount } = renderWithProviders(
        <OInput placeholder="Email" name="email" hasError={hasError} onChange={jest.fn()} />
      )
      const style = StyleSheet.flatten(getByPlaceholderText('Email').parent?.parent?.props.style) as any
      unmount()
      return style
    }
    const rest = borderOf(false)
    const error = borderOf(true)
    expect(error.borderWidth).toBeGreaterThan(0)
    expect(rest.borderWidth).toBe(error.borderWidth)
    // At rest the field draws the theme's own line (a thin strong border by default); in error, the error's.
    const input = (defaultAppTheme() as any).native.components.input
    expect(rest.borderColor).toBe(input.base.border.borderColor)
    expect(error.borderColor).toBe(input.variants.default.states.error.border.borderColor)
    expect(error.borderColor).not.toBe(rest.borderColor)
  })
  describe('the caret and the selection', () => {
    const color = (defaultAppTheme() as any).native.tokens.color
    let replaced: { restore: () => void } | undefined
    afterEach(() => {
      replaced?.restore()
      replaced = undefined
    })

    it('are the theme\'s brand colors on Android', () => {
      replaced = jest.replaceProperty(Platform, 'OS', 'android')
      const { getByPlaceholderText } = renderWithProviders(<OInput placeholder="Email" name="email" onChange={jest.fn()} />)
      const { props } = getByPlaceholderText('Email')
      expect(props.selectionColor).toBe(color.primary_subtle)
      expect(props.cursorColor).toBe(color.primary)
      expect(props.selectionHandleColor).toBe(color.primary)
    })

    it('are the brand color of the selection on iOS', () => {
      replaced = jest.replaceProperty(Platform, 'OS', 'ios')
      const { getByPlaceholderText } = renderWithProviders(<OInput placeholder="Email" name="email" onChange={jest.fn()} />)
      const { props } = getByPlaceholderText('Email')
      expect(props.selectionColor).toBe(color.primary)
      expect(props.cursorColor).toBeUndefined()
      expect(props.selectionHandleColor).toBeUndefined()
    })

    it('leave the caller\'s own selectionColor the winner', () => {
      replaced = jest.replaceProperty(Platform, 'OS', 'android')
      const { getByPlaceholderText } = renderWithProviders(
        <OInput placeholder="Email" name="email" onChange={jest.fn()} selectionColor="#123456" />
      )
      const { props } = getByPlaceholderText('Email')
      expect(props.selectionColor).toBe('#123456')
      expect(props.cursorColor).toBe(color.primary)
    })
  })

  describe('the side padding of its text', () => {
    const textOf = (multiline: boolean) => {
      const { getByPlaceholderText } = renderWithProviders(
        <OInput placeholder="Notes" name="notes" multiline={multiline} onChange={jest.fn()} />
      )
      return StyleSheet.flatten(getByPlaceholderText('Notes').props.style) as any
    }

    it('is none on a one-line field', () => {
      expect(textOf(false).paddingHorizontal).toBe(0)
    })

    it('is none on a text area too (it starts where a one-line field does)', () => {
      expect(textOf(true).paddingHorizontal).toBe(0)
    })
  })

  it('paints the theme\'s focus border on the focused field without moving its text (the default: a thin brand border)', () => {
    const theme: any = require('../../../../../theme/engine').defaultAppTheme()
    const focus = theme.native.components.input.variants.default.states.focus.border
    expect(focus).toMatchObject({ borderWidth: theme.native.tokens.border.thin, borderColor: theme.native.tokens.color.primary })
    const { getByTestId } = renderWithProviders(<OInput testID='focus-field' onChange={jest.fn()} />)
    const boxOf = () => {
      let node: any = getByTestId('focus-field')
      while (node && StyleSheet.flatten(node.props.style)?.borderWidth === undefined) node = node.parent
      return StyleSheet.flatten(node.props.style)
    }
    const resting = boxOf()
    fireEvent(getByTestId('focus-field'), 'focus')
    const focused = boxOf()
    expect(focused.borderColor).toBe(theme.native.tokens.color.primary)
    expect(focused.borderWidth).toBe(resting.borderWidth)
  })
})
