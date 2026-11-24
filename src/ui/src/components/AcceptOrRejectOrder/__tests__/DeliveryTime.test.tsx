import React, { createRef } from 'react'
import { StyleSheet, TextInput } from 'react-native'
import { act, fireEvent } from '@testing-library/react-native'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'

jest.mock('@components', () => require('../../../../../../jest/helpers/mockOrdering'))

import { defaultAppTheme } from '../../../../../theme/engine'
import { DeliveryTime, DeliveryTimeHandle } from '../DeliveryTime'
import { DELIVERY_TIME, clampMinutes, stepMinutes } from '../deliveryTimeRules'
import { minutesLineHeight } from '../../shared/MinutesValue'

const theme: any = defaultAppTheme()
const flat = (node: any) => StyleSheet.flatten(node.props.style)

/** The block held as the sheet holds it: the minutes in state. */
const Harness = React.forwardRef<DeliveryTimeHandle, any>(({ initial = DELIVERY_TIME.default, onChange, ...rest }, ref) => {
  const [minutes, setMinutes] = React.useState<number>(initial)
  return <DeliveryTime ref={ref} minutes={minutes} onChange={(value) => { setMinutes(value); onChange?.(value) }} {...rest} />
})

const setup = (props: any = {}) => {
  const ref = createRef<DeliveryTimeHandle>()
  const screen = renderWithProviders(<Harness ref={ref} {...props} />)
  return { screen, ref }
}

const press = (screen: any, id: string) => fireEvent.press(screen.getByTestId(id))
const shown = (screen: any) => screen.getByTestId('delivery-time').props.children
const selected = (screen: any, id: string) => screen.getByTestId(id).props.accessibilityState.selected
const open = (screen: any) => press(screen, 'delivery-time-edit')
const type = (screen: any, text: string) => fireEvent.changeText(screen.getByTestId('delivery-time-input'), text)

describe('the delivery time rules', () => {
  it('are five presets, a step of five, from 5 to 180 and a default of 20, as the business app\'s preparation time', () => {
    expect(DELIVERY_TIME).toEqual({ presets: [10, 15, 20, 30, 45], step: 5, min: 5, max: 180, default: 20 })
  })

  it('keep a number whole and inside the limits', () => {
    expect(clampMinutes(0)).toBe(5)
    expect(clampMinutes(4)).toBe(5)
    expect(clampMinutes(37)).toBe(37)
    expect(clampMinutes(181)).toBe(180)
    expect(clampMinutes(12.6)).toBe(13)
    expect(clampMinutes(NaN)).toBe(20)
    expect(stepMinutes(20, 1)).toBe(25)
    expect(stepMinutes(20, -1)).toBe(15)
    expect(stepMinutes(5, -1)).toBe(5)
    expect(stepMinutes(178, 1)).toBe(180)
    expect(stepMinutes(180, 1)).toBe(180)
  })
})

describe('DeliveryTime', () => {
  describe('at rest', () => {
    it('has the label, the five presets and the stepper\'s line, with 20 min and its preset selected', () => {
      const { screen } = setup()
      expect(screen.getByText('Delivery time')).toBeTruthy()
      for (const preset of DELIVERY_TIME.presets) expect(screen.getByTestId(`delivery-time-preset-${preset}`)).toBeTruthy()
      expect(shown(screen)).toBe('20 min')
      expect(selected(screen, 'delivery-time-preset-20')).toBe(true)
      for (const preset of [10, 15, 30, 45]) expect(selected(screen, `delivery-time-preset-${preset}`)).toBe(false)
      // No hours and no minutes columns: the dial is gone.
      expect(screen.queryByText('Hours')).toBeNull()
      expect(screen.queryByText('Minutes')).toBeNull()
      expect(screen.queryByTestId('delivery-time-dial')).toBeNull()
    })

    it('takes no focus: there is no field until the figure is tapped', () => {
      const focus = TextInput.prototype.focus as jest.Mock
      focus.mockClear()
      const { screen } = setup()
      expect(screen.UNSAFE_queryAllByType(TextInput)).toHaveLength(0)
      expect(focus).not.toHaveBeenCalled()
    })
  })

  describe('the three ways of entering the time', () => {
    it('a preset sets the minutes, and only the one equal to the value is selected', () => {
      const onChange = jest.fn()
      const { screen } = setup({ onChange })
      press(screen, 'delivery-time-preset-45')
      expect(shown(screen)).toBe('45 min')
      expect(onChange).toHaveBeenLastCalledWith(45)
      expect(selected(screen, 'delivery-time-preset-45')).toBe(true)
      expect(selected(screen, 'delivery-time-preset-20')).toBe(false)
      press(screen, 'delivery-time-preset-10')
      expect(shown(screen)).toBe('10 min')
    })

    it('the stepper goes five at a time, and the selected preset follows it', () => {
      const { screen } = setup()
      press(screen, 'delivery-time-plus')
      expect(shown(screen)).toBe('25 min')
      expect(DELIVERY_TIME.presets.some((preset) => selected(screen, `delivery-time-preset-${preset}`))).toBe(false)
      press(screen, 'delivery-time-plus')
      expect(shown(screen)).toBe('30 min')
      expect(selected(screen, 'delivery-time-preset-30')).toBe(true)
      press(screen, 'delivery-time-minus')
      press(screen, 'delivery-time-minus')
      press(screen, 'delivery-time-minus')
      expect(shown(screen)).toBe('15 min')
      expect(selected(screen, 'delivery-time-preset-15')).toBe(true)
    })

    it('the stepper stops at 5 and at 180, where its button is off', () => {
      const low = setup({ initial: 5 })
      expect(low.screen.getByTestId('delivery-time-minus').props.accessibilityState.disabled).toBe(true)
      expect(low.screen.getByTestId('delivery-time-plus').props.accessibilityState.disabled).toBe(false)
      low.screen.unmount()
      const high = setup({ initial: 180 })
      expect(high.screen.getByTestId('delivery-time-plus').props.accessibilityState.disabled).toBe(true)
      expect(high.screen.getByTestId('delivery-time-minus').props.accessibilityState.disabled).toBe(false)
      fireEvent.press(high.screen.getByTestId('delivery-time-plus'))
      expect(shown(high.screen)).toBe('180 min')
    })

    it('typing sets the minutes: tap the figure, type, Done', () => {
      const onChange = jest.fn()
      const { screen } = setup({ onChange })
      open(screen)
      type(screen, '37')
      fireEvent(screen.getByTestId('delivery-time-input'), 'submitEditing')
      expect(screen.queryByTestId('delivery-time-input')).toBeNull()
      expect(shown(screen)).toBe('37 min')
      expect(onChange).toHaveBeenLastCalledWith(37)
      // No preset is 37.
      for (const preset of DELIVERY_TIME.presets) expect(selected(screen, `delivery-time-preset-${preset}`)).toBe(false)
    })
  })

  describe('the selected preset follows what is typed', () => {
    it('before the field settles, while the number is inside the limits', () => {
      const { screen } = setup()
      open(screen)
      type(screen, '30')
      expect(selected(screen, 'delivery-time-preset-30')).toBe(true)
      expect(selected(screen, 'delivery-time-preset-20')).toBe(false)
      type(screen, '37')
      for (const preset of DELIVERY_TIME.presets) expect(selected(screen, `delivery-time-preset-${preset}`)).toBe(false)
      // Outside the limits or empty: the last settled time keeps its preset.
      type(screen, '500')
      expect(selected(screen, 'delivery-time-preset-20')).toBe(true)
      type(screen, '')
      expect(selected(screen, 'delivery-time-preset-20')).toBe(true)
    })

    it('and goes back to the settled time when the typing ends empty', () => {
      const { screen } = setup()
      open(screen)
      type(screen, '30')
      type(screen, '')
      fireEvent(screen.getByTestId('delivery-time-input'), 'submitEditing')
      expect(shown(screen)).toBe('20 min')
      expect(selected(screen, 'delivery-time-preset-20')).toBe(true)
      expect(selected(screen, 'delivery-time-preset-30')).toBe(false)
    })
  })

  describe('a tap on a preset or the stepper ends the typing', () => {
    it('a preset wins over what was typed, even the one already chosen', () => {
      const { screen } = setup()
      open(screen)
      type(screen, '37')
      press(screen, 'delivery-time-preset-20')
      expect(screen.queryByTestId('delivery-time-input')).toBeNull()
      expect(shown(screen)).toBe('20 min')
    })

    it('the stepper goes on from the typed number, not from the old value', () => {
      const { screen } = setup()
      open(screen)
      type(screen, '37')
      press(screen, 'delivery-time-plus')
      expect(screen.queryByTestId('delivery-time-input')).toBeNull()
      expect(shown(screen)).toBe('42 min')
      open(screen)
      type(screen, '60')
      press(screen, 'delivery-time-minus')
      expect(shown(screen)).toBe('55 min')
    })

    it('a number outside the limits is corrected first, then the step is taken from the limit', () => {
      const { screen } = setup()
      open(screen)
      type(screen, '999')
      press(screen, 'delivery-time-minus')
      expect(shown(screen)).toBe('175 min')
    })
  })

  describe('limits and correction', () => {
    it('says the range while a number is outside it and brings it to the limit when done', () => {
      const { screen } = setup()
      open(screen)
      type(screen, '500')
      expect(screen.getByTestId('delivery-time-error').props.children).toBe('Enter a time from 5 to 180 minutes')
      fireEvent(screen.getByTestId('delivery-time-input'), 'blur')
      expect(shown(screen)).toBe('180 min')
      open(screen)
      type(screen, '3')
      fireEvent(screen.getByTestId('delivery-time-input'), 'blur')
      expect(shown(screen)).toBe('5 min')
    })

    it('flush settles the typing and says whether the number had to be corrected', () => {
      const { screen, ref } = setup()
      open(screen)
      type(screen, '25')
      let outcome: any
      act(() => { outcome = ref.current!.flush() })
      expect(outcome).toEqual({ value: 25, corrected: false })
      open(screen)
      type(screen, '700')
      act(() => { outcome = ref.current!.flush() })
      expect(outcome).toEqual({ value: 180, corrected: true })
      expect(shown(screen)).toBe('180 min')
      act(() => { outcome = ref.current!.flush() })
      expect(outcome).toEqual({ value: null, corrected: false })
    })
  })

  describe('the stepper\'s line', () => {
    const side = (screen: any, which: 'minus' | 'plus') => flat(screen.getByTestId(`delivery-time-${which}-side`))

    it('gives the minus and the plus a box as tall as the figure\'s line, at rest', () => {
      const { screen } = setup()
      const line = flat(screen.getByTestId('delivery-time-edit')).minHeight
      expect(line).toBe(minutesLineHeight(theme))
      expect(side(screen, 'minus').minHeight).toBe(line)
      expect(side(screen, 'plus').minHeight).toBe(line)
      expect(side(screen, 'minus').justifyContent).toBe('center')
      expect(side(screen, 'plus').justifyContent).toBe('center')
    })

    it('keeps them where they were while typing: the field is the same line, and the row starts its items at the top', () => {
      const { screen } = setup()
      const before = [side(screen, 'minus').minHeight, side(screen, 'plus').minHeight]
      open(screen)
      let wrapper = screen.getByTestId('delivery-time-input').parent
      while (wrapper && flat(wrapper)?.minHeight === undefined) wrapper = wrapper.parent
      expect(flat(wrapper).minHeight).toBe(before[0])
      expect([side(screen, 'minus').minHeight, side(screen, 'plus').minHeight]).toEqual(before)
      // The hint and the error only lengthen the middle column: the buttons are not centred on the whole row.
      expect(flat(screen.getByTestId('delivery-time-line'))).toEqual(expect.objectContaining({ flexDirection: 'row', alignItems: 'flex-start' }))
      type(screen, '999')
      expect(side(screen, 'minus').minHeight).toBe(before[0])
      expect(screen.getByTestId('delivery-time-error')).toBeTruthy()
    })

    it('sits on the soft fill the dial had, with the theme\'s spacing', () => {
      const { screen } = setup()
      const box = flat(screen.getByTestId('delivery-time-box'))
      expect(box.backgroundColor).toBe(theme.native.tokens.color.surface_alt)
      expect(box.padding).toBe(theme.native.tokens.space.md)
      expect(box.borderRadius).toBe(theme.native.tokens.radius.md)
    })

    it('draws the figure in the delivery time\'s color (order_request.base.time_color)', () => {
      const { screen } = setup()
      expect(flat(screen.getByTestId('delivery-time')).color).toBe(theme.native.components.order_request.base.time_color)
    })
  })

  describe('disabled (the request is going)', () => {
    it('answers no tap: presets, stepper and the figure', () => {
      const onChange = jest.fn()
      const { screen } = setup({ disabled: true, onChange })
      for (const id of ['delivery-time-preset-45', 'delivery-time-plus', 'delivery-time-minus']) {
        expect(screen.getByTestId(id).props.accessibilityState.disabled).toBe(true)
        fireEvent.press(screen.getByTestId(id))
      }
      fireEvent.press(screen.getByTestId('delivery-time-edit'))
      expect(screen.queryByTestId('delivery-time-input')).toBeNull()
      expect(onChange).not.toHaveBeenCalled()
    })
  })

  describe('for a screen reader', () => {
    it('the figure is a button that says the minutes and how to type them', () => {
      const { screen } = setup()
      const button = screen.getByTestId('delivery-time-edit')
      expect(button.props.accessibilityRole).toBe('button')
      expect(button.props.accessibilityLabel).toBe('Delivery time, 20 minutes. Tap to type a value')
      press(screen, 'delivery-time-plus')
      expect(screen.getByTestId('delivery-time-edit').props.accessibilityLabel).toBe('Delivery time, 25 minutes. Tap to type a value')
    })

    it('the field is labelled', () => {
      const { screen } = setup()
      open(screen)
      expect(screen.getByTestId('delivery-time-input').props.accessibilityLabel).toBe('Delivery time in minutes')
    })

    it('the presets are a labelled group, each chip says its minutes and the selected one is announced', () => {
      const { screen } = setup()
      const group = screen.getByTestId('delivery-time-presets')
      expect(group.props.accessibilityLabel).toBe('Delivery time presets')
      expect(group.props.accessibilityRole).toBe('radiogroup')
      expect(screen.getByTestId('delivery-time-preset-30').props.accessibilityLabel).toBe('30 min')
      expect(screen.getByTestId('delivery-time-preset-30').props.accessibilityRole).toBe('button')
      expect(selected(screen, 'delivery-time-preset-20')).toBe(true)
      expect(selected(screen, 'delivery-time-preset-30')).toBe(false)
    })

    it('the minus and the plus say what they do, apart from the position\'s "Decrease" and "Increase"', () => {
      const { screen } = setup()
      expect(screen.getByTestId('delivery-time-minus').props.accessibilityLabel).toBe('5 minutes less')
      expect(screen.getByTestId('delivery-time-plus').props.accessibilityLabel).toBe('5 minutes more')
      expect(screen.queryByLabelText('Increase')).toBeNull()
      expect(screen.queryByLabelText('Decrease')).toBeNull()
    })
  })
})
