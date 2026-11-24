import { Platform } from 'react-native'
import { defaultAppTheme } from '../../../../../theme/engine'
import { inputTint, singleLineInput, textAreaInput } from '../singleLineInput'

describe('singleLineInput', () => {
  const theme: any = defaultAppTheme()
  const color = theme.native.tokens.color
  let replaced: { restore: () => void } | undefined

  afterEach(() => {
    replaced?.restore()
    replaced = undefined
  })

  describe('inputTint', () => {
    it('tints the selection subtle and the caret and its handles with the brand color on Android', () => {
      replaced = jest.replaceProperty(Platform, 'OS', 'android')
      expect(inputTint(theme)).toEqual({
        selectionColor: color.primary_subtle,
        cursorColor: color.primary,
        selectionHandleColor: color.primary
      })
    })

    it('tints only the selection, with the brand color, on iOS', () => {
      replaced = jest.replaceProperty(Platform, 'OS', 'ios')
      expect(inputTint(theme)).toEqual({ selectionColor: color.primary })
    })
  })

  it('has no side padding on a one-line field nor on a text area', () => {
    expect(singleLineInput.paddingHorizontal).toBe(0)
    expect(textAreaInput.paddingHorizontal).toBe(0)
  })
})
