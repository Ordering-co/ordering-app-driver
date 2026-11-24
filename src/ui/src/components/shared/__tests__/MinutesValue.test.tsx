import React, { createRef } from 'react'
import { Keyboard, StyleSheet, TextInput } from 'react-native'
import { act, fireEvent } from '@testing-library/react-native'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'

jest.mock('@components', () => require('../../../../../../jest/helpers/mockOrdering'))

import { buildAppTheme, defaultAppTheme, THEME_PRODUCT_TYPE } from '../../../../../theme/engine'
import { MinutesValue, digitsOnly, minutesLineHeight } from '../MinutesValue'
import type { MinutesValueHandle } from '../MinutesValue'

const flat = (node: any) => StyleSheet.flatten(node.props.style)
const theme: any = defaultAppTheme()
const stepper = theme.native.components.stepper

const SPOKEN = 'Delivery time, _min_ minutes. Tap to type a value'

/** The value held as a sheet holds it: the minutes in state, what the field commits and says while typing in callbacks. */
const Harness = React.forwardRef<MinutesValueHandle, any>(({ initial = 20, onCommit, onTyping, ...rest }, ref) => {
  const [minutes, setMinutes] = React.useState(initial)
  rest.expose?.(setMinutes)
  return (
    <MinutesValue
      ref={ref}
      minutes={minutes}
      min={5}
      max={180}
      spoken={SPOKEN}
      fieldLabel='Delivery time in minutes'
      onCommit={(value) => { setMinutes(value); onCommit?.(value) }}
      onTyping={onTyping}
      testID='minutes'
      {...rest}
    />
  )
})

const setup = (props: any = {}) => {
  const ref = createRef<MinutesValueHandle>()
  const screen = renderWithProviders(<Harness ref={ref} {...props} />)
  return { screen, ref }
}

const open = (screen: any) => fireEvent.press(screen.getByTestId('minutes-edit'))
const type = (screen: any, text: string) => fireEvent.changeText(screen.getByTestId('minutes-input'), text)
const shown = (screen: any) => screen.getByTestId('minutes').props.children

describe('digitsOnly', () => {
  it('keeps the digits, at most three', () => {
    expect(digitsOnly('3a7')).toBe('37')
    expect(digitsOnly('-4.5')).toBe('45')
    expect(digitsOnly('1,2 3')).toBe('123')
    expect(digitsOnly('12345')).toBe('123')
    expect(digitsOnly('')).toBe('')
    expect(digitsOnly(undefined as any)).toBe('')
  })
})

describe('MinutesValue at rest', () => {
  it('is the stepper\'s figure with the unit after it, and no field: the keyboard is not asked for', () => {
    const focus = TextInput.prototype.focus as jest.Mock
    focus.mockClear()
    const { screen } = setup()
    expect(shown(screen)).toBe('20 min')
    expect(screen.UNSAFE_queryAllByType(TextInput)).toHaveLength(0)
    expect(focus).not.toHaveBeenCalled()
    const figure = flat(screen.getByTestId('minutes'))
    expect(figure).toEqual(expect.objectContaining({
      fontSize: stepper.base.value.fontSize,
      lineHeight: stepper.base.value.lineHeight,
      color: stepper.base.value_color,
      textAlign: 'center'
    }))
  })

  it('takes the ink it is given (the sheet\'s delivery time color) and the stepper\'s otherwise', () => {
    const own = setup({ color: '#123456' })
    expect(flat(own.screen.getByTestId('minutes')).color).toBe('#123456')
  })

  it('is a button the height of the stepper\'s line with its spoken label, and no glyph beside the figure', () => {
    const { screen } = setup()
    const button = screen.getByTestId('minutes-edit')
    expect(button.props.accessibilityRole).toBe('button')
    expect(button.props.accessibilityLabel).toBe('Delivery time, 20 minutes. Tap to type a value')
    expect(flat(button).minHeight).toBe(minutesLineHeight(theme))
    expect(minutesLineHeight(theme)).toBeGreaterThanOrEqual(44)
    // Nothing but the figure inside it.
    expect(screen.UNSAFE_queryAllByProps({ name: 'create-outline' })).toHaveLength(0)
    expect(screen.UNSAFE_queryAllByProps({ name: 'pencil' })).toHaveLength(0)
  })

  it('is the tallest of the field, the buttons and the stepper\'s own height', () => {
    const { input, button } = theme.native.components
    expect(minutesLineHeight(theme)).toBe(Math.max(input.sizes.md.height, button.sizes.md.height, stepper.sizes.md.height))
    const tall = buildAppTheme({ version: 2, product_type: THEME_PRODUCT_TYPE, values: { components: { stepper: { sizes: { md: { height: 60 } } } } } })
    expect(minutesLineHeight(tall)).toBe(60)
  })

  it('is plain text, and opens no field, when disabled or when nothing can be typed', () => {
    const off = setup({ disabled: true })
    expect(off.screen.getByTestId('minutes-edit').props.accessibilityRole).toBe('text')
    fireEvent.press(off.screen.getByTestId('minutes-edit'))
    expect(off.screen.queryByTestId('minutes-input')).toBeNull()
    const empty = setup({ min: 10, max: 5 })
    fireEvent.press(empty.screen.getByTestId('minutes-edit'))
    expect(empty.screen.queryByTestId('minutes-input')).toBeNull()
  })
})

describe('MinutesValue while typing', () => {
  it('opens a labelled numbers field holding the minutes, with the unit after them, no icon and no confirm button', () => {
    const { screen } = setup()
    open(screen)
    const input = screen.getByTestId('minutes-input')
    expect(input.props.keyboardType).toBe('number-pad')
    expect(input.props.value).toBe('20')
    expect(input.props.maxLength).toBe(3)
    expect(input.props.autoFocus).toBe(true)
    expect(input.props.returnKeyType).toBe('done')
    expect(input.props.accessibilityLabel).toBe('Delivery time in minutes')
    expect(screen.getByText('min')).toBeTruthy()
    expect(screen.queryByTestId('minutes-done')).toBeNull()
    expect(screen.queryByTestId('minutes-edit')).toBeNull()
    // The hint under it.
    expect(screen.getByTestId('minutes-caption').props.children).toBe('Minutes, from 5 to 180')
    // The typed digits are the figure's look, in the field's box.
    expect(flat(input)).toEqual(expect.objectContaining({ fontSize: stepper.base.value.fontSize, textAlign: 'center' }))
  })

  it('keeps digits only, and says the number to the sheet while it is inside the limits', () => {
    const onTyping = jest.fn()
    const { screen } = setup({ onTyping })
    open(screen)
    type(screen, '3a7')
    expect(screen.getByTestId('minutes-input').props.value).toBe('37')
    expect(onTyping).toHaveBeenLastCalledWith(37)
    type(screen, '500')
    expect(onTyping).toHaveBeenLastCalledWith(null)
    type(screen, '')
    expect(onTyping).toHaveBeenLastCalledWith(null)
    type(screen, '2')
    expect(onTyping).toHaveBeenLastCalledWith(null)
  })

  it('ends with the keyboard\'s Done: the number is the new value', () => {
    const onCommit = jest.fn()
    const { screen } = setup({ onCommit })
    open(screen)
    type(screen, '37')
    fireEvent(screen.getByTestId('minutes-input'), 'submitEditing')
    expect(screen.queryByTestId('minutes-input')).toBeNull()
    expect(shown(screen)).toBe('37 min')
    expect(onCommit).toHaveBeenCalledWith(37)
  })

  it('ends when the field is left (blur)', () => {
    const { screen } = setup()
    open(screen)
    type(screen, '33')
    fireEvent(screen.getByTestId('minutes-input'), 'blur')
    expect(screen.queryByTestId('minutes-input')).toBeNull()
    expect(shown(screen)).toBe('33 min')
  })

  it('ends when the keyboard is put away (Android back, the iPad key), which blurs nothing', () => {
    const handlers: Record<string, any> = {}
    const spy = jest.spyOn(Keyboard, 'addListener').mockImplementation(((name: string, handler: any) => { handlers[name] = handler; return { remove: jest.fn() } }) as any)
    const { screen } = setup()
    open(screen)
    type(screen, '44')
    act(() => { handlers.keyboardDidHide?.({}) })
    spy.mockRestore()
    expect(screen.queryByTestId('minutes-input')).toBeNull()
    expect(shown(screen)).toBe('44 min')
  })

  it('stops listening to the keyboard once the typing is over', () => {
    const remove = jest.fn()
    const spy = jest.spyOn(Keyboard, 'addListener').mockImplementation((() => ({ remove })) as any)
    const { screen } = setup()
    open(screen)
    expect(spy).toHaveBeenCalledWith('keyboardDidHide', expect.any(Function))
    type(screen, '30')
    fireEvent(screen.getByTestId('minutes-input'), 'submitEditing')
    spy.mockRestore()
    expect(remove).toHaveBeenCalled()
  })

  it('ends when the sheet\'s own buttons ask (flush), and says what it settled on', () => {
    const { screen, ref } = setup()
    open(screen)
    type(screen, '25')
    let outcome: any
    act(() => { outcome = ref.current!.flush() })
    expect(outcome).toEqual({ value: 25, corrected: false })
    expect(screen.queryByTestId('minutes-input')).toBeNull()
    expect(shown(screen)).toBe('25 min')
  })

  it('says nothing when it is asked to settle with nothing being typed', () => {
    const { ref } = setup()
    expect(ref.current!.flush()).toEqual({ value: null, corrected: false })
  })

  it('restores the previous value when the field is left empty, and commits nothing', () => {
    const onCommit = jest.fn()
    const { screen, ref } = setup({ onCommit })
    open(screen)
    type(screen, '')
    fireEvent(screen.getByTestId('minutes-input'), 'submitEditing')
    expect(shown(screen)).toBe('20 min')
    expect(onCommit).not.toHaveBeenCalled()
    open(screen)
    type(screen, '')
    let outcome: any
    act(() => { outcome = ref.current!.flush() })
    expect(outcome).toEqual({ value: null, corrected: false })
  })

  it('says it while a number is outside 5 to 180, and brings it to the nearest limit when done', () => {
    const { screen } = setup()
    open(screen)
    type(screen, '500')
    expect(screen.getByTestId('minutes-error').props.children).toBe('Enter a time from 5 to 180 minutes')
    expect(screen.queryByTestId('minutes-caption')).toBeNull()
    fireEvent(screen.getByTestId('minutes-input'), 'submitEditing')
    expect(shown(screen)).toBe('180 min')
    open(screen)
    type(screen, '2')
    expect(screen.getByTestId('minutes-error')).toBeTruthy()
    fireEvent(screen.getByTestId('minutes-input'), 'submitEditing')
    expect(shown(screen)).toBe('5 min')
    // 0 is outside too: it can no longer be sent.
    open(screen)
    type(screen, '0')
    expect(screen.getByTestId('minutes-error')).toBeTruthy()
    fireEvent(screen.getByTestId('minutes-input'), 'submitEditing')
    expect(shown(screen)).toBe('5 min')
  })

  it('paints the field in its error state while the number is outside, and not inside the limits', () => {
    const { screen } = setup()
    open(screen)
    const border = () => {
      let node = screen.getByTestId('minutes-input').parent
      while (node && flat(node)?.borderColor === undefined) node = node.parent
      return flat(node).borderColor
    }
    const normal = border()
    type(screen, '999')
    expect(border()).not.toBe(normal)
    type(screen, '60')
    expect(border()).toBe(normal)
  })

  it('reports a corrected number when asked to settle, so the sheet can show it before it sends', () => {
    const { screen, ref } = setup()
    open(screen)
    type(screen, '999')
    let outcome: any
    act(() => { outcome = ref.current!.flush() })
    expect(outcome).toEqual({ value: 180, corrected: true })
    expect(shown(screen)).toBe('180 min')
  })

  it('lets a change from outside (a preset, the stepper) win over what is being typed', () => {
    let setMinutes: any
    const onTyping = jest.fn()
    const { screen } = setup({ expose: (set: any) => { setMinutes = set }, onTyping })
    open(screen)
    type(screen, '37')
    act(() => { setMinutes(45) })
    expect(screen.queryByTestId('minutes-input')).toBeNull()
    expect(shown(screen)).toBe('45 min')
    expect(onTyping).toHaveBeenLastCalledWith(null)
  })

  it('does not end the typing because the sheet drew again with new callbacks', () => {
    const { screen } = setup({ onCommit: () => {}, onTyping: () => {} })
    open(screen)
    type(screen, '3')
    screen.rerender(<Harness onCommit={() => {}} onTyping={() => {}} />)
    expect(screen.queryByTestId('minutes-input')).not.toBeNull()
  })

  it('keeps the figure\'s line: the button at rest and the field while typing are the same height, so nothing moves', () => {
    const { screen } = setup()
    const rest = flat(screen.getByTestId('minutes-edit')).minHeight
    open(screen)
    let wrapper = screen.getByTestId('minutes-input').parent
    while (wrapper && flat(wrapper)?.minHeight === undefined) wrapper = wrapper.parent
    expect(flat(wrapper).minHeight).toBe(rest)
    expect(rest).toBe(minutesLineHeight(theme))
  })
})

describe('MinutesValue: the line under the field has one height for its two texts', () => {
  const field = theme.native.components.field.base
  const cells = (screen: any) => screen.getByTestId('minutes-message').findAll((node: any) => typeof node.type === 'string' && flat(node)?.width === '100%')

  it('is one line, the hint and the error side by side and each as wide as the line, clipped to it, so its height is the taller one\'s', () => {
    const { screen } = setup()
    open(screen)
    const line = flat(screen.getByTestId('minutes-message'))
    expect(line).toEqual(expect.objectContaining({ flexDirection: 'row', overflow: 'hidden', alignSelf: 'stretch' }))
    const [hint, error] = cells(screen)
    expect(cells(screen)).toHaveLength(2)
    for (const cell of [hint, error]) {
      expect(flat(cell)).toEqual(expect.objectContaining({ width: '100%', flexShrink: 0, paddingTop: field.message_gap }))
    }
  })

  it('is the same line, in the same place, whether the hint or the error shows: only the hint steps aside', () => {
    const { screen } = setup()
    open(screen)
    const before = flat(screen.getByTestId('minutes-message'))
    const [hint] = cells(screen)
    expect(flat(hint).marginLeft).toBeUndefined()
    type(screen, '999')
    const [hintAfter, errorAfter] = cells(screen)
    expect(flat(screen.getByTestId('minutes-message'))).toEqual(before)
    expect(flat(hintAfter).marginLeft).toBe('-100%')
    expect(flat(errorAfter).marginLeft).toBeUndefined()
    type(screen, '40')
    expect(flat(cells(screen)[0]).marginLeft).toBeUndefined()
  })

  it('keeps both texts in the line and tells a screen reader only the one that shows', () => {
    const { screen } = setup()
    open(screen)
    const [hint, error] = cells(screen)
    expect(hint.props.accessibilityElementsHidden).toBe(false)
    expect(error.props.accessibilityElementsHidden).toBe(true)
    expect(error.props.importantForAccessibility).toBe('no-hide-descendants')
    expect(screen.getByText('Minutes, from 5 to 180')).toBeTruthy()
    // The error is in the line all the time (it gives it its height) but is not there for a screen reader, nor for a query by testID.
    expect(screen.queryByText('Enter a time from 5 to 180 minutes')).toBeNull()
    expect(screen.getByText('Enter a time from 5 to 180 minutes', { includeHiddenElements: true })).toBeTruthy()
    expect(screen.queryByTestId('minutes-error', { includeHiddenElements: true })).toBeNull()
    type(screen, '500')
    const [hintOut, errorOut] = cells(screen)
    expect(hintOut.props.accessibilityElementsHidden).toBe(true)
    expect(hintOut.props.importantForAccessibility).toBe('no-hide-descendants')
    expect(errorOut.props.accessibilityElementsHidden).toBe(false)
    expect(screen.getByText('Enter a time from 5 to 180 minutes')).toBeTruthy()
    expect(screen.queryByText('Minutes, from 5 to 180')).toBeNull()
  })

  it('starts the error where a field\'s error starts (`message_gap` under the field) through the line\'s own padding, not twice', () => {
    const { screen } = setup()
    open(screen)
    type(screen, '500')
    expect(flat(screen.getByTestId('minutes-error')).marginTop).toBe(0)
    expect(flat(cells(screen)[1]).paddingTop).toBe(field.message_gap)
  })
})

describe('MinutesValue: the handle tells whether a number is being typed', () => {
  it('is false at rest, true while the field is open and false once it settled (Done, flush, a blur)', () => {
    const { screen, ref } = setup()
    expect(ref.current!.isEditing()).toBe(false)
    open(screen)
    expect(ref.current!.isEditing()).toBe(true)
    type(screen, '35')
    act(() => { ref.current!.flush() })
    expect(ref.current!.isEditing()).toBe(false)
    open(screen)
    fireEvent(screen.getByTestId('minutes-input'), 'blur')
    expect(ref.current!.isEditing()).toBe(false)
  })
})
