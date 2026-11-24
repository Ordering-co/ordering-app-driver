import React from 'react'
import { StyleSheet, Text } from 'react-native'
import { fireEvent } from '@testing-library/react-native'

import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'

const mockSafeAreaInsets = { top: 0, right: 0, bottom: 0, left: 0 }

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: any) => children,
  SafeAreaView: ({ children }: any) => children,
  useSafeAreaInsets: () => mockSafeAreaInsets,
  useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 })
}))

// BottomTabBarHeightContext comes from the global mock in jest/setup.js
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs'

jest.mock('@components', () => {
  const mockOrdering = require('../../../../../../jest/helpers/mockOrdering')
  const { renderUiController } = require('../../../../../../jest/helpers/d1ShellDefaults')
  return {
    ...mockOrdering,
    FloatingButton: renderUiController({})
  }
})

import { FloatingButton } from '..'
import { BottomBarProvider, useBottomBarHeight } from '../../../../../context/BottomBarContext'

describe('FloatingButton', () => {
  beforeEach(() => {
    mockSafeAreaInsets.bottom = 0
  })

  // The bar's own padding and the theme's minimum space under a bottom bar.
  const { defaultAppTheme } = require('../../../../../theme/engine')
  const padding = defaultAppTheme().native.components.bottom_bar.base.padding
  const minimum = defaultAppTheme().native.components.bottom_nav.base.min_bottom_space

  it('clears the home indicator on stack screens', () => {
    mockSafeAreaInsets.bottom = 34
    const { toJSON } = renderWithProviders(
      <FloatingButton btnText="Accept order" firstButtonClick={jest.fn()} />
    )
    expect(StyleSheet.flatten(toJSON().props.style).paddingBottom).toBe(padding + 34)
  })

  it('keeps the theme\'s minimum under the buttons when the system gives no inset', () => {
    mockSafeAreaInsets.bottom = 0
    const { toJSON } = renderWithProviders(
      <FloatingButton btnText="Accept order" firstButtonClick={jest.fn()} />
    )
    expect(minimum).toBeGreaterThan(0)
    expect(StyleSheet.flatten(toJSON().props.style).paddingBottom).toBe(padding + minimum)
  })

  describe('on Android', () => {
    const { Platform } = require('react-native')
    const original = Platform.OS
    beforeEach(() => Object.defineProperty(Platform, 'OS', { configurable: true, get: () => 'android' }))
    afterEach(() => Object.defineProperty(Platform, 'OS', { configurable: true, get: () => original }))

    it('keeps only its own padding in a screen of the stack (the activity pads it by the bars: the inset reads 0), as in a modal', () => {
      // The gap between the button and the navigation area is the bar's padding on every screen: no minimum
      // under it (it put a second space under the bar of Information, the access screens and the order's details).
      mockSafeAreaInsets.bottom = 0
      const { toJSON } = renderWithProviders(<FloatingButton btnText="Update" firstButtonClick={jest.fn()} />)
      expect(StyleSheet.flatten(toJSON().props.style).paddingBottom).toBe(padding)
    })

    it('keeps the inset a modal\'s window reads under its content', () => {
      mockSafeAreaInsets.bottom = 63
      const { toJSON } = renderWithProviders(<FloatingButton btnText="Update" firstButtonClick={jest.fn()} />)
      expect(StyleSheet.flatten(toJSON().props.style).paddingBottom).toBe(padding + 63)
    })
  })

  it('keeps only its own padding while the keyboard is up, and the inset again once it is down', () => {
    const { act } = require('@testing-library/react-native')
    const { Keyboard } = require('react-native')
    const listeners: Record<string, Array<() => void>> = {}
    const add = jest.spyOn(Keyboard, 'addListener').mockImplementation(((event: string, cb: () => void) => {
      (listeners[event] = listeners[event] || []).push(cb)
      return { remove: jest.fn() }
    }) as any)
    const emit = (event: string) => act(() => { (listeners[event] || []).forEach((cb) => cb()) })
    mockSafeAreaInsets.bottom = 34
    const { toJSON } = renderWithProviders(
      <FloatingButton btnText="Accept order" firstButtonClick={jest.fn()} />
    )
    const bottom = () => StyleSheet.flatten(toJSON().props.style).paddingBottom
    expect(bottom()).toBe(padding + 34)
    emit('keyboardWillShow')
    emit('keyboardDidShow')
    expect(bottom()).toBe(padding)
    emit('keyboardWillHide')
    emit('keyboardDidHide')
    expect(bottom()).toBe(padding + 34)
    add.mockRestore()
  })

  it('Android, a floating keyboard (end height 0) leaves the bar at its resting inset; a docked one lifts it to its own padding, and a floating one after it puts it back', () => {
    const { act } = require('@testing-library/react-native')
    const { Keyboard, Platform } = require('react-native')
    const original = Platform.OS
    Object.defineProperty(Platform, 'OS', { configurable: true, get: () => 'android' })
    const listeners: Record<string, Array<(event?: any) => void>> = {}
    const add = jest.spyOn(Keyboard, 'addListener').mockImplementation(((event: string, cb: () => void) => {
      (listeners[event] = listeners[event] || []).push(cb)
      return { remove: jest.fn() }
    }) as any)
    const emit = (height: number) => act(() => { (listeners.keyboardDidShow || []).forEach((cb) => cb({ endCoordinates: { height } })) })
    mockSafeAreaInsets.bottom = 63
    const { toJSON } = renderWithProviders(<FloatingButton btnText="Cancel" firstButtonClick={jest.fn()} />)
    const bottom = () => StyleSheet.flatten(toJSON().props.style).paddingBottom
    expect(bottom()).toBe(padding + 63)
    emit(0)
    expect(bottom()).toBe(padding + 63)
    emit(300)
    expect(bottom()).toBe(padding)
    emit(0)
    expect(bottom()).toBe(padding + 63)
    add.mockRestore()
    Object.defineProperty(Platform, 'OS', { configurable: true, get: () => original })
  })

  it('does not add the inset inside the bottom tabs', () => {
    mockSafeAreaInsets.bottom = 34
    const { toJSON } = renderWithProviders(
      <BottomTabBarHeightContext.Provider value={80}>
        <FloatingButton btnText="Accept order" firstButtonClick={jest.fn()} />
      </BottomTabBarHeightContext.Provider>
    )
    expect(StyleSheet.flatten(toJSON().props.style).paddingBottom).toBe(padding)
  })

  it('keeps the inset inside a modal opened from a tab: the modal covers the tab bar', () => {
    const { default: OModal } = require('../../shared/OModal')
    mockSafeAreaInsets.bottom = 34
    const { getByRole } = renderWithProviders(
      <BottomTabBarHeightContext.Provider value={80}>
        <OModal open entireModal customClose>
          <FloatingButton btnText="Send Review" firstButtonClick={jest.fn()} />
        </OModal>
      </BottomTabBarHeightContext.Provider>
    )
    // The bar is the view pinned to the bottom around the button: no screen resets the tabs' context for it.
    let bar: any = getByRole('button').parent
    while (bar && StyleSheet.flatten(bar.props.style)?.position !== 'absolute') bar = bar.parent
    expect(StyleSheet.flatten(bar.props.style).paddingBottom).toBe(padding + 34)
  })

  it('handles primary button click', () => {
    const firstButtonClick = jest.fn()
    const { getByText } = renderWithProviders(
      <FloatingButton btnText="Accept order" firstButtonClick={firstButtonClick} />
    )
    fireEvent.press(getByText('Accept order'))
    expect(firstButtonClick).toHaveBeenCalled()
  })

  it('renders secondary button when enabled', () => {
    const secondButtonClick = jest.fn()
    const { getByText } = renderWithProviders(
      <FloatingButton
        btnText="Accept"
        secondBtnText="Reject"
        secondButton
        firstButtonClick={jest.fn()}
        secondButtonClick={secondButtonClick}
      />
    )
    fireEvent.press(getByText('Reject'))
    expect(secondButtonClick).toHaveBeenCalled()
  })

  it('hides reject buttons when isHideRejectButtons is true', () => {
    const { queryByText } = renderWithProviders(
      <FloatingButton
        btnText="Hidden"
        isHideRejectButtons
        firstButtonClick={jest.fn()}
      />
    )
    expect(queryByText('Hidden')).toBeNull()
  })

  it('paints one action in the bar\'s button slot, and accept over reject in theirs', () => {
    const { defaultAppTheme } = require('../../../../../theme/engine')
    const button = defaultAppTheme().native.components.button.variants
    const fill = (node: any) => StyleSheet.flatten(node.findByType(require('react-native').View).props.style).backgroundColor
    const one = renderWithProviders(<FloatingButton btnText="Continue" firstButtonClick={jest.fn()} />)
    expect(fill(one.getByRole('button'))).toBe(button.primary.solid.background)
    one.unmount()
    const two = renderWithProviders(
      <FloatingButton btnText="Reject" secondBtnText="Accept" secondButton firstButtonClick={jest.fn()} secondButtonClick={jest.fn()} />
    )
    const [accept, reject] = two.getAllByRole('button')
    expect(fill(accept)).toBe(button.success.solid.background)
    expect(fill(reject)).toBe(button.danger.solid.background)
    two.unmount()
    const alone = renderWithProviders(<FloatingButton btnText="Delivery failed" negative firstButtonClick={jest.fn()} />)
    expect(fill(alone.getByRole('button'))).toBe(button.danger.solid.background)
  })

  describe('a step before the bar\'s two actions (arrived to the business, decision of 2026-11-18)', () => {
    const { defaultAppTheme } = require('../../../../../theme/engine')
    const button = defaultAppTheme().native.components.button.variants
    const fill = (node: any) => StyleSheet.flatten(node.findByType(require('react-native').View).props.style).backgroundColor

    it('is drawn first, in the bar\'s button slot, over accept and reject', () => {
      const onStep = jest.fn()
      const { getAllByRole, getByRole } = renderWithProviders(
        <FloatingButton
          stepBtnText="Arrived to business" stepButtonClick={onStep}
          btnText="Pickup failed" secondBtnText="Pickup complete" secondButton
          firstButtonClick={jest.fn()} secondButtonClick={jest.fn()}
        />
      )
      const [step, accept, reject] = getAllByRole('button')
      expect(step).toBe(getByRole('button', { name: 'Arrived to business' }))
      expect(accept).toBe(getByRole('button', { name: 'Pickup complete' }))
      expect(reject).toBe(getByRole('button', { name: 'Pickup failed' }))
      expect(fill(step)).toBe(button.primary.solid.background)
      expect(fill(accept)).toBe(button.success.solid.background)
      expect(fill(reject)).toBe(button.danger.solid.background)
      fireEvent.press(step)
      expect(onStep).toHaveBeenCalledTimes(1)
    })

    it('stays when the project turns rejecting off, and is disabled with the bar', () => {
      const onStep = jest.fn()
      const { getAllByRole } = renderWithProviders(
        <FloatingButton
          stepBtnText="Arrived to business" stepButtonClick={onStep}
          btnText="Pickup failed" secondBtnText="Pickup complete" secondButton isHideRejectButtons disabled
          firstButtonClick={jest.fn()} secondButtonClick={jest.fn()}
        />
      )
      const buttons = getAllByRole('button')
      expect(buttons).toHaveLength(2)
      expect(buttons[0].props.accessibilityState.disabled).toBe(true)
      fireEvent.press(buttons[0])
      expect(onStep).not.toHaveBeenCalled()
    })

    it('draws a third action between the two, in the reject slot, whatever the switch for rejecting says', () => {
      const onThird = jest.fn()
      const all = renderWithProviders(
        <FloatingButton
          stepBtnText="Arrived to business" stepButtonClick={jest.fn()}
          thirdBtnText="Order not ready" thirdButtonClick={onThird}
          btnText="Pickup failed" secondBtnText="Pickup complete" secondButton
          firstButtonClick={jest.fn()} secondButtonClick={jest.fn()}
        />
      )
      const names = ['Arrived to business', 'Pickup complete', 'Order not ready', 'Pickup failed']
      expect(all.getAllByRole('button')).toEqual(names.map((name) => all.getByRole('button', { name })))
      const third = all.getByRole('button', { name: 'Order not ready' })
      expect(fill(third)).toBe(button.danger.solid.background)
      fireEvent.press(third)
      expect(onThird).toHaveBeenCalledTimes(1)
      all.unmount()

      const noReject = renderWithProviders(
        <FloatingButton
          thirdBtnText="Order not ready" thirdButtonClick={onThird}
          btnText="Pickup failed" secondBtnText="Pickup complete" secondButton isHideRejectButtons
          firstButtonClick={jest.fn()} secondButtonClick={jest.fn()}
        />
      )
      expect(noReject.getAllByRole('button')).toEqual(
        ['Pickup complete', 'Order not ready'].map((name) => noReject.getByRole('button', { name }))
      )
    })

    it('draws no step without its text', () => {
      const { getAllByRole } = renderWithProviders(
        <FloatingButton btnText="Pickup failed" secondBtnText="Pickup complete" secondButton stepButtonClick={jest.fn()} />
      )
      expect(getAllByRole('button')).toHaveLength(2)
    })
  })

  describe('what the accept / reject screen asks of it (harmony H6)', () => {
    const { defaultAppTheme } = require('../../../../../theme/engine')
    const theme = defaultAppTheme()
    const fill = (node: any) => StyleSheet.flatten(node.findByType(require('react-native').View).props.style).backgroundColor
    /** The opacities of the boxes between the button and the bar (the bar itself is not one). */
    const fades = (action: any) => {
      const found: number[] = []
      for (let node: any = action.parent; node && node.props.testID !== 'bar'; node = node.parent) {
        const opacity = typeof node.type === 'string' ? StyleSheet.flatten(node.props.style)?.opacity : undefined
        if (opacity !== undefined) found.push(opacity)
      }
      return found
    }

    it('lets a single action wear the accept slot (success) or the reject one', () => {
      const button = theme.native.components.button.variants
      const accept = renderWithProviders(<FloatingButton btnText="Accept" slot="accept" firstButtonClick={jest.fn()} />)
      expect(fill(accept.getByRole('button'))).toBe(button.success.solid.background)
      accept.unmount()
      const reject = renderWithProviders(<FloatingButton btnText="Reject" slot="reject" firstButtonClick={jest.fn()} />)
      expect(fill(reject.getByRole('button'))).toBe(button.danger.solid.background)
    })

    it('paints a blocked action at the disabled opacity and still answers its tap', () => {
      const onPress = jest.fn()
      const screen = renderWithProviders(<FloatingButton btnText="Accept" blocked testID="bar" buttonTestID="action" firstButtonClick={onPress} />)
      const action = screen.getByTestId('action')
      expect(action.props.accessibilityState.disabled).toBe(false)
      // The wrapper around the button fades; the bar itself never does.
      expect(fades(action)).toEqual([theme.native.tokens.opacity.disabled])
      expect(StyleSheet.flatten(screen.getByTestId('bar').props.style).opacity).toBeUndefined()
      fireEvent.press(action)
      expect(onPress).toHaveBeenCalledTimes(1)
    })

    it('does not fade an action that is not blocked', () => {
      const screen = renderWithProviders(<FloatingButton btnText="Accept" testID="bar" buttonTestID="action" firstButtonClick={jest.fn()} />)
      expect(fades(screen.getByTestId('action'))).toEqual([])
    })

    it('takes no tap while disabled or loading, and says so', () => {
      const onPress = jest.fn()
      const disabled = renderWithProviders(<FloatingButton btnText="Accept" disabled buttonTestID="action" firstButtonClick={onPress} />)
      expect(disabled.getByTestId('action').props.accessibilityState.disabled).toBe(true)
      fireEvent.press(disabled.getByTestId('action'))
      disabled.unmount()
      const loading = renderWithProviders(<FloatingButton btnText="Accept" loading buttonTestID="action" firstButtonClick={onPress} />)
      expect(loading.getByTestId('action').props.accessibilityState.busy).toBe(true)
      fireEvent.press(loading.getByTestId('action'))
      expect(onPress).not.toHaveBeenCalled()
    })

    it('stays in the flow of its screen when inline, and is pinned to the bottom otherwise', () => {
      const pinned = renderWithProviders(<FloatingButton btnText="Accept" testID="bar" firstButtonClick={jest.fn()} />)
      expect(StyleSheet.flatten(pinned.getByTestId('bar').props.style)).toEqual(expect.objectContaining({ position: 'absolute', bottom: 0 }))
      pinned.unmount()
      const inline = renderWithProviders(<FloatingButton btnText="Accept" inline testID="bar" firstButtonClick={jest.fn()} />)
      const style = StyleSheet.flatten(inline.getByTestId('bar').props.style)
      expect(style.position).toBeUndefined()
      expect(style.zIndex).toBeUndefined()
      // Its look is the bar's either way.
      expect(style.backgroundColor).toBe(theme.native.components.bottom_bar.base.background)
    })
  })

  describe('the outline option (the mockups\' milder second action)', () => {
    const { defaultAppTheme } = require('../../../../../theme/engine')
    const { nativeBoxStyle } = require('../../../../../theme/helpers')
    const theme = defaultAppTheme()
    const { slots } = theme.native.components.bottom_bar
    const button = theme.native.components.button
    /** What the theme paints for a slot's color in an appearance. */
    const look = (slot: 'button' | 'accept' | 'reject', appearance: string = slots[slot].appearance) =>
      nativeBoxStyle(button.variants[slots[slot].color][appearance])
    const box = (node: any) => StyleSheet.flatten(node.children[0].props.style)
    const painted = (node: any, expected: any) => expect(box(node)).toEqual(expect.objectContaining(expected))

    describe('without it, every bar paints what it painted (pinned for each caller)', () => {
      it('one action in the button slot, the negative one alone and a chosen slot', () => {
        const one = renderWithProviders(<FloatingButton btnText="Continue" firstButtonClick={jest.fn()} />)
        painted(one.getByRole('button'), look('button'))
        one.unmount()
        const negative = renderWithProviders(<FloatingButton btnText="Failed" negative firstButtonClick={jest.fn()} />)
        painted(negative.getByRole('button'), look('reject'))
        negative.unmount()
        const accept = renderWithProviders(<FloatingButton btnText="Accept" slot="accept" firstButtonClick={jest.fn()} />)
        painted(accept.getByRole('button'), look('accept'))
      })

      it('accept over reject, and the step and the third action around them', () => {
        const two = renderWithProviders(
          <FloatingButton stepBtnText="Arrived" thirdBtnText="Not ready" btnText="Reject" secondBtnText="Accept" secondButton
            firstButtonClick={jest.fn()} secondButtonClick={jest.fn()} stepButtonClick={jest.fn()} thirdButtonClick={jest.fn()} />
        )
        const [step, accept, third, reject] = two.getAllByRole('button')
        painted(step, look('button'))
        painted(accept, look('accept'))
        painted(third, look('reject'))
        painted(reject, look('reject'))
      })

      it('an `outline` that is false changes nothing', () => {
        const screen = renderWithProviders(<FloatingButton btnText="Continue" outline={false} firstButtonClick={jest.fn()} />)
        painted(screen.getByRole('button'), look('button'))
      })
    })

    it('draws the first action in outline, in its slot\'s color and size', () => {
      const alone = renderWithProviders(<FloatingButton btnText="Update" outline firstButtonClick={jest.fn()} />)
      painted(alone.getByRole('button'), look('button', 'outline'))
      expect(box(alone.getByRole('button')).minHeight).toBe(button.sizes[slots.button.size].height)
      expect(box(alone.getByRole('button')).backgroundColor).not.toBe(look('button').backgroundColor)
      alone.unmount()
      const negative = renderWithProviders(<FloatingButton btnText="Delete all" negative outline firstButtonClick={jest.fn()} />)
      painted(negative.getByRole('button'), look('reject', 'outline'))
      negative.unmount()
      const accept = renderWithProviders(<FloatingButton btnText="Keep" slot="accept" outline firstButtonClick={jest.fn()} />)
      painted(accept.getByRole('button'), look('accept', 'outline'))
    })

    it('leaves the step, the second and the third action as they are', () => {
      const screen = renderWithProviders(
        <FloatingButton stepBtnText="Arrived" thirdBtnText="Not ready" btnText="Reject" secondBtnText="Accept" secondButton outline
          firstButtonClick={jest.fn()} secondButtonClick={jest.fn()} stepButtonClick={jest.fn()} thirdButtonClick={jest.fn()} />
      )
      const [step, accept, third, reject] = screen.getAllByRole('button')
      painted(step, look('button'))
      painted(accept, look('accept'))
      painted(third, look('reject'))
      painted(reject, look('reject', 'outline'))
    })

    it('keeps the action\'s behaviour: its tap, its disabled and busy states', () => {
      const onPress = jest.fn()
      const screen = renderWithProviders(<FloatingButton btnText="Update" outline buttonTestID="action" firstButtonClick={onPress} />)
      fireEvent.press(screen.getByTestId('action'))
      expect(onPress).toHaveBeenCalledTimes(1)
      screen.unmount()
      const disabled = renderWithProviders(<FloatingButton btnText="Update" outline disabled buttonTestID="action" firstButtonClick={onPress} />)
      expect(disabled.getByTestId('action').props.accessibilityState.disabled).toBe(true)
      fireEvent.press(disabled.getByTestId('action'))
      disabled.unmount()
      const loading = renderWithProviders(<FloatingButton btnText="Update" outline loading buttonTestID="action" firstButtonClick={onPress} />)
      expect(loading.getByTestId('action').props.accessibilityState.busy).toBe(true)
      expect(onPress).toHaveBeenCalledTimes(1)
    })
  })

  describe('a button that fires on a press and hold', () => {
    const HOLD_MS = require('../../shared/HoldToConfirm').HOLD_MS
    const { act } = require('@testing-library/react-native')
    const { useToast } = require('@components')
    beforeEach(() => jest.useFakeTimers())
    afterEach(() => jest.useRealTimers())

    const bar = (props: Record<string, any> = {}) => {
      const clicks = { step: jest.fn(), second: jest.fn(), third: jest.fn(), first: jest.fn() }
      const screen = renderWithProviders(
        <FloatingButton
          stepBtnText="Arrived to business" stepButtonClick={clicks.step}
          secondBtnText="Pickup complete" secondButtonClick={clicks.second} secondButton
          thirdBtnText="Order not ready" thirdButtonClick={clicks.third}
          btnText="Pickup failed" firstButtonClick={clicks.first}
          {...props}
        />
      )
      const named = (name: string) => screen.getByRole('button', { name })
      return { clicks, screen, named }
    }
    const hold = (node: any, ms = HOLD_MS) => {
      fireEvent(node, 'pressIn')
      act(() => { jest.advanceTimersByTime(ms) })
      fireEvent(node, 'pressOut')
      fireEvent.press(node)
    }

    it.each([
      ['stepButtonHold', 'Arrived to business', 'step'],
      ['secondButtonHold', 'Pickup complete', 'second'],
      ['thirdButtonHold', 'Order not ready', 'third'],
      ['firstButtonHold', 'Pickup failed', 'first'],
    ])('%s: a tap on "%s" fires nothing, the completed hold fires it once, an early release nothing', (flag, name, click) => {
      const { clicks, named } = bar({ [flag]: true })
      fireEvent.press(named(name))
      expect((clicks as any)[click]).not.toHaveBeenCalled()
      hold(named(name), HOLD_MS - 100)
      expect((clicks as any)[click]).not.toHaveBeenCalled()
      hold(named(name))
      expect((clicks as any)[click]).toHaveBeenCalledTimes(1)
      // The other three still fire on a tap, as they did.
      Object.entries(clicks).filter(([key]) => key !== click).forEach(([key, fn]) => {
        const label = { step: 'Arrived to business', second: 'Pickup complete', third: 'Order not ready', first: 'Pickup failed' }[key] as string
        fireEvent.press(named(label))
        expect(fn).toHaveBeenCalledTimes(1)
      })
    })

    it('a bar without the flags fires every button on a tap, as it did', () => {
      const { clicks, named } = bar()
      ;['Arrived to business', 'Pickup complete', 'Order not ready', 'Pickup failed'].forEach((name) => fireEvent.press(named(name)))
      Object.values(clicks).forEach((fn) => expect(fn).toHaveBeenCalledTimes(1))
      expect((useToast as jest.Mock)().at(1).showToast).not.toHaveBeenCalled()
    })

    it('a flag that is false changes nothing', () => {
      const { clicks, named } = bar({ stepButtonHold: false, firstButtonHold: false })
      fireEvent.press(named('Arrived to business'))
      fireEvent.press(named('Pickup failed'))
      expect(clicks.step).toHaveBeenCalledTimes(1)
      expect(clicks.first).toHaveBeenCalledTimes(1)
    })

    it('keeps the bar\'s paint: the held button wears the slot\'s look, the same as without the hold', () => {
      const { screen } = bar()
      const { screen: held } = bar({ stepButtonHold: true, secondButtonHold: true, thirdButtonHold: true, firstButtonHold: true })
      const looks = (tree: any) => tree.getAllByRole('button').map((node: any) => StyleSheet.flatten(node.children[0].props.style))
      expect(looks(held)).toEqual(looks(screen))
    })

    it('a disabled bar takes no hold', () => {
      const { clicks, named } = bar({ stepButtonHold: true, disabled: true })
      hold(named('Arrived to business'), HOLD_MS * 2)
      expect(clicks.step).not.toHaveBeenCalled()
    })

    it('a loading action takes no hold', () => {
      const click = jest.fn()
      const screen = renderWithProviders(<FloatingButton btnText="Accept" loading firstButtonHold firstButtonClick={click} buttonTestID="action" />)
      hold(screen.getByTestId('action'), HOLD_MS * 2)
      expect(click).not.toHaveBeenCalled()
    })
  })

  it('tells the toast its height while it is on screen, so the toast is drawn above it (decision H8)', () => {
    const Height = () => <Text testID='toast-room'>{String(useBottomBarHeight())}</Text>
    const screen = renderWithProviders(
      <BottomBarProvider><Height /><FloatingButton btnText='Accept' firstButtonClick={jest.fn()} testID='bar' /></BottomBarProvider>
    )
    expect(screen.getByTestId('toast-room').props.children).toBe('0')
    fireEvent(screen.getByTestId('bar'), 'layout', { nativeEvent: { layout: { x: 0, y: 700, width: 390, height: 94 } } })
    expect(screen.getByTestId('toast-room').props.children).toBe('94')
    screen.rerender(<BottomBarProvider><Height /></BottomBarProvider>)
    expect(screen.getByTestId('toast-room').props.children).toBe('0')
  })
})
