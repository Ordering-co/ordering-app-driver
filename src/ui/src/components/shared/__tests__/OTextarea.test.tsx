import React from 'react'
import { Platform, StyleSheet } from 'react-native'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
const { iconSource, setupSharedComponentHooks } = require('../../../../../../jest/helpers/driverSharedTestSetup')
import OTextarea from '../OTextarea'
import { defaultAppTheme } from '../../../../../theme/engine'

setupSharedComponentHooks()

describe('OTextarea', () => {
  it('renders multiline input', () => {
    const { getByPlaceholderText } = renderWithProviders(
      <OTextarea placeholder="Notes" value="Hello" lines={4} />
    )
    expect(getByPlaceholderText('Notes')).toBeTruthy()
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
      const { getByPlaceholderText } = renderWithProviders(<OTextarea placeholder="Notes" value="" lines={4} />)
      const { props } = getByPlaceholderText('Notes')
      expect(props.selectionColor).toBe(color.primary_subtle)
      expect(props.cursorColor).toBe(color.primary)
      expect(props.selectionHandleColor).toBe(color.primary)
    })

    it('are the brand color of the selection on iOS', () => {
      replaced = jest.replaceProperty(Platform, 'OS', 'ios')
      const { getByPlaceholderText } = renderWithProviders(<OTextarea placeholder="Notes" value="" lines={4} />)
      const { props } = getByPlaceholderText('Notes')
      expect(props.selectionColor).toBe(color.primary)
      expect(props.cursorColor).toBeUndefined()
      expect(props.selectionHandleColor).toBeUndefined()
    })
  })

  it('has no side padding on its text', () => {
    const { getByPlaceholderText } = renderWithProviders(<OTextarea placeholder="Notes" value="" lines={4} />)
    expect((StyleSheet.flatten(getByPlaceholderText('Notes').props.style) as any).paddingHorizontal).toBe(0)
  })
})
