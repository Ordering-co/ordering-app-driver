import React from 'react'
import { AccessibilityInfo, Platform, StyleSheet } from 'react-native'
import { fireEvent } from '@testing-library/react-native'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
const { iconSource, setupSharedComponentHooks } = require('../../../../../../jest/helpers/driverSharedTestSetup')
import OButton from '../OButton'
import { TEXT_SCALE_LIMIT } from '../OText'
import { defaultAppTheme } from '../../../../../theme/engine'

setupSharedComponentHooks()

describe('OButton', () => {
  it('grows the touch area of a small button to the theme\'s control height, and scales its label as every text does', () => {
    const base: any = defaultAppTheme()
    const native = { ...base.native, tokens: { ...base.native.tokens, size: { ...base.native.tokens.size, md: 52 } } }
    const height = native.components.button.sizes.xs.height
    const { getByRole, getByText } = renderWithProviders(<OButton text='Small' size='xs' onClick={jest.fn()} />, { themeOverrides: { native } })
    expect(getByRole('button').props.hitSlop).toBe(Math.ceil((52 - height) / 2))
    expect(getByText('Small').props.maxFontSizeMultiplier).toBe(TEXT_SCALE_LIMIT)
  })


  it('renders and handles press', () => {
    const onClick = jest.fn()
    const { getByText } = renderWithProviders(
      <OButton text="Continue" testID="continue-btn" onClick={onClick} />
    )
    fireEvent.press(getByText('Continue'))
    expect(onClick).toHaveBeenCalled()
  })

  it('renders disabled and loading states', () => {
    const { getByText } = renderWithProviders(
      <>
        <OButton text="Disabled" disabled />
        <OButton text="Loading" loading appearance="outline" />
      </>
    )
    expect(getByText('Disabled')).toBeTruthy()
    expect(getByText('Loading')).toBeTruthy()
  })

  it.each(['primary', 'secondary', 'danger', 'success', 'neutral', 'inverse'] as const)(
    'renders color %s in every appearance',
    (color) => {
      const { getAllByText } = renderWithProviders(
        <>
          {(['solid', 'outline', 'tonal', 'ghost'] as const).map((appearance) => (
            <OButton key={appearance} text={color} color={color} appearance={appearance} />
          ))}
        </>
      )
      expect(getAllByText(color)).toHaveLength(4)
    }
  )

  it('paints the theme: the size\'s height, the Identity radius and the color\'s fill', () => {
    const { defaultAppTheme } = require('../../../../../theme/engine')
    const theme = defaultAppTheme()
    const { getByTestId } = renderWithProviders(<OButton text="Go" testID="go" size="lg" color="success" />)
    const { StyleSheet } = require('react-native')
    const box = StyleSheet.flatten(getByTestId('go').findByType(require('react-native').View).props.style)
    expect(box.minHeight).toBe(theme.native.components.button.sizes.lg.height)
    expect(box.borderRadius).toBe(theme.native.components.button.base.radius)
    expect(box.backgroundColor).toBe(theme.native.components.button.variants.success.solid.background)
  })

  it('does not press while disabled or loading', () => {
    const onClick = jest.fn()
    const { getByText } = renderWithProviders(
      <>
        <OButton text="Off" disabled onClick={onClick} />
        <OButton text="Busy" loading onClick={onClick} />
      </>
    )
    fireEvent.press(getByText('Off'))
    fireEvent.press(getByText('Busy'))
    expect(onClick).not.toHaveBeenCalled()
  })
  describe('onDisabledPress: a button painted off that still answers a tap, to say why', () => {
    const ink = (node: any) => StyleSheet.flatten(node.props.style).color

    it('a tap runs onDisabledPress and never onClick', () => {
      const onClick = jest.fn()
      const onDisabledPress = jest.fn()
      const { getByTestId } = renderWithProviders(
        <OButton text='Accept' testID='off' disabled onClick={onClick} onDisabledPress={onDisabledPress} />
      )
      fireEvent.press(getByTestId('off'))
      expect(onDisabledPress).toHaveBeenCalledTimes(1)
      expect(onClick).not.toHaveBeenCalled()
    })

    it('stays painted off and is still disabled for the screen reader', () => {
      const { getByTestId, getByText } = renderWithProviders(
        <>
          <OButton text='Answers' testID='answers' disabled onClick={jest.fn()} onDisabledPress={jest.fn()} />
          <OButton text='Swallows' testID='swallows' disabled onClick={jest.fn()} />
          <OButton text='Enabled' testID='enabled' onClick={jest.fn()} />
        </>
      )
      expect(getByTestId('answers').props.accessibilityState.disabled).toBe(true)
      // The label's ink is the disabled one, the same as a button that swallows the tap, and not the enabled one.
      expect(ink(getByText('Answers'))).toBe(ink(getByText('Swallows')))
      expect(ink(getByText('Answers'))).not.toBe(ink(getByText('Enabled')))
    })

    it('says nothing while the button is enabled: onClick is the press', () => {
      const onClick = jest.fn()
      const onDisabledPress = jest.fn()
      const { getByTestId } = renderWithProviders(<OButton text='Accept' testID='on' onClick={onClick} onDisabledPress={onDisabledPress} />)
      fireEvent.press(getByTestId('on'))
      expect(onClick).toHaveBeenCalledTimes(1)
      expect(onDisabledPress).not.toHaveBeenCalled()
    })

    it('takes no tap while it loads', () => {
      const onDisabledPress = jest.fn()
      const { getByTestId } = renderWithProviders(<OButton text='Accept' testID='busy' disabled loading onClick={jest.fn()} onDisabledPress={onDisabledPress} />)
      fireEvent.press(getByTestId('busy'))
      expect(onDisabledPress).not.toHaveBeenCalled()
    })

    it('a held button that is off answers with onDisabledPress, not with "Hold to confirm", and starts no hold', () => {
      jest.useFakeTimers()
      jest.spyOn(AccessibilityInfo, 'isScreenReaderEnabled').mockResolvedValue(false)
      const { useToast } = require('@components')
      const onClick = jest.fn()
      const onDisabledPress = jest.fn()
      const { getByTestId, queryByTestId } = renderWithProviders(
        <OButton text='Pickup complete' testID='held' hold disabled onClick={onClick} onDisabledPress={onDisabledPress} />
      )
      fireEvent(getByTestId('held'), 'pressIn')
      expect(queryByTestId('hold-fill', { includeHiddenElements: true })).toBeNull()
      fireEvent(getByTestId('held'), 'pressOut')
      fireEvent.press(getByTestId('held'))
      expect(onDisabledPress).toHaveBeenCalledTimes(1)
      expect(onClick).not.toHaveBeenCalled()
      expect(getByTestId('held').props.accessibilityState.disabled).toBe(true)
      const hints = (useToast as jest.Mock).mock.results.flatMap((result: any) => result.value[1].showToast.mock.calls)
      expect(hints).toEqual([])
    })
  })

  describe('the label of a button that fits its text', () => {
    const theme: any = require('../../../../../theme/engine').defaultAppTheme()
    const sizeLine = theme.native.components.button.sizes.md.text.lineHeight
    let replaced: { restore: () => void } | undefined
    afterEach(() => {
      replaced?.restore()
      replaced = undefined
    })
    const labelOf = (platform: 'android' | 'ios', fitText: boolean) => {
      replaced = jest.replaceProperty(Platform, 'OS', platform)
      const { getByText } = renderWithProviders(<OButton text="Go" fitText={fitText} />)
      const label = getByText('Go')
      return { label, style: StyleSheet.flatten(label.props.style) as any }
    }

    it('has no line height, no font padding and a centered text on Android', () => {
      const { label, style } = labelOf('android', true)
      expect(style.lineHeight).toBeUndefined()
      expect(style.includeFontPadding).toBe(false)
      expect(style.textAlignVertical).toBe('center')
      expect(label.props.adjustsFontSizeToFit).toBe(true)
    })

    it('keeps the size\'s line height on iOS', () => {
      const { style } = labelOf('ios', true)
      expect(sizeLine).toBeGreaterThan(0)
      expect(style.lineHeight).toBe(sizeLine)
      expect(style.includeFontPadding).toBeUndefined()
      expect(style.textAlignVertical).toBeUndefined()
    })

    it.each(['android', 'ios'] as const)('changes nothing without fitText on %s', (platform) => {
      const { label, style } = labelOf(platform, false)
      expect(style.lineHeight).toBe(sizeLine)
      expect(style.includeFontPadding).toBeUndefined()
      expect(style.textAlignVertical).toBeUndefined()
      expect(label.props.adjustsFontSizeToFit).toBeUndefined()
    })
  })
})
