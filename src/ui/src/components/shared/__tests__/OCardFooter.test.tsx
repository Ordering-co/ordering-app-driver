import React from 'react'
import { Pressable, StyleSheet, Text } from 'react-native'
import { fireEvent, within } from '@testing-library/react-native'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'

jest.mock('@components', () => require('../../../../../../jest/helpers/mockOrdering'))

import { defaultAppTheme } from '../../../../../theme/engine'
import { OCard } from '../OCard'

const flat = (node: any) => StyleSheet.flatten(node.props.style)

/** The views above a node that ask to be the responder of a touch (a pressable): the ones a second touch can hand the touch to. */
const responderAncestors = (node: any) => {
  const found: any[] = []
  for (let up = node.parent; up; up = up.parent) {
    if (typeof up.type === 'string' && typeof up.props.onStartShouldSetResponder === 'function') found.push(up)
  }
  return found
}

describe('OCard with a footer: the card\'s buttons beside its pressable, not inside it', () => {
  const card = defaultAppTheme().native.components.card.base

  const drawn = (onPress = jest.fn(), onButton = jest.fn()) => renderWithProviders(
    <OCard testID='card' onPress={onPress} footer={<Pressable testID='button' onPress={onButton}><Text>Go</Text></Pressable>}>
      <Text>body</Text>
    </OCard>
  )

  it('keeps the box (its look, its testID) around both, with the pressable on the body only', () => {
    const { getByTestId, getByText } = drawn()
    expect(flat(getByTestId('card')).padding).toBe(card.padding)
    expect(flat(getByTestId('card')).backgroundColor).toBe(card.background)
    expect(within(getByTestId('card-press')).getByText('body')).toBeTruthy()
    expect(within(getByTestId('card-press')).queryByText('Go')).toBeNull()
    expect(within(getByTestId('card')).getByText('Go')).toBeTruthy()
    expect(getByText('Go')).toBeTruthy()
  })

  it('has no pressable above the footer: a touch on a button has no card to hand the touch to (a second finger, the release)', () => {
    const { getByText } = drawn()
    // Only the button's own pressable asks for it.
    expect(responderAncestors(getByText('Go'))).toHaveLength(1)
    expect(responderAncestors(getByText('Go'))[0].props.testID).toBe('button')
  })

  it('a press of the body opens the card; one of the footer\'s button is the button\'s and never the card\'s', () => {
    const onPress = jest.fn()
    const onButton = jest.fn()
    const { getByText } = drawn(onPress, onButton)
    fireEvent.press(getByText('Go'))
    expect(onButton).toHaveBeenCalledTimes(1)
    expect(onPress).not.toHaveBeenCalled()
    fireEvent.press(getByText('body'))
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it('keeps the box\'s padding as the pressable\'s touch margin, but at the bottom (the footer is there), so the whole card but the footer opens', () => {
    const { getByTestId } = drawn()
    expect(getByTestId('card-press').props.hitSlop).toEqual({ top: card.padding, left: card.padding, right: card.padding })
  })

  it('gives the space between the body and the footer to the pressable (its bottom padding), so a touch there opens the card and only the buttons are outside it', () => {
    const { getByTestId, getByText } = drawn()
    const space = defaultAppTheme().native.tokens.space.sm
    expect(flat(getByTestId('card-press')).paddingBottom).toBe(space)
    // The footer is the pressable's next sibling with no margin of its own: nothing is left between the two that belongs to nobody.
    const box = getByTestId('card')
    const children = box.children as any[]
    expect(children.map((child: any) => child.props?.testID)).toEqual(['card-press', 'button'])
    expect(flat(children[1])?.marginTop ?? 0).toBe(0)
    // The pressable is the only responder above the body, the button the only one above the button (F1).
    expect(responderAncestors(getByText('Go')).map((node: any) => node.props.testID)).toEqual(['button'])
  })

  it('keeps the same space above the footer of a card that does not open, as the footer\'s wrapper margin', () => {
    const { getByText } = renderWithProviders(<OCard testID='still' footer={<Text>foot</Text>}><Text>body</Text></OCard>)
    let wrapper = getByText('foot').parent
    while (wrapper && flat(wrapper)?.marginTop === undefined) wrapper = wrapper.parent
    expect(flat(wrapper).marginTop).toBe(defaultAppTheme().native.tokens.space.sm)
  })

  it('is the plain pressable box without a footer, as before', () => {
    const onPress = jest.fn()
    const { getByTestId, getByText } = renderWithProviders(<OCard testID='card' onPress={onPress}><Text>body</Text></OCard>)
    fireEvent.press(getByText('body'))
    expect(onPress).toHaveBeenCalledTimes(1)
    expect(getByTestId('card').props.hitSlop).toBeUndefined()
  })

  it('draws the footer of a card that does not open (no press), after the body', () => {
    const { getByText, getByTestId } = renderWithProviders(
      <OCard testID='still' footer={<Text>foot</Text>}><Text>body</Text></OCard>
    )
    expect(within(getByTestId('still')).getByText('foot')).toBeTruthy()
    expect(getByText('body')).toBeTruthy()
  })
})
