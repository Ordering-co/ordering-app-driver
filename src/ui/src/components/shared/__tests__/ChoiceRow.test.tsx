import React from 'react'
import { StyleSheet } from 'react-native'
import { fireEvent } from '@testing-library/react-native'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'

jest.mock('@components', () => require('../../../../../../jest/helpers/mockOrdering'))

import { defaultAppTheme } from '../../../../../theme/engine'
import OText from '../OText'
import ChoiceRow from '../ChoiceRow'

const flat = (node: any) => StyleSheet.flatten(node.props.style)
const choice = defaultAppTheme().native.components.choice

describe('ChoiceRow, the listed variant (the reason forms)', () => {
  it('is as tall as the choice size and centers its mark and text vertically between its dividers', () => {
    const { getByTestId } = renderWithProviders(
      <ChoiceRow kind='radio' selected={false} listed testID='row' onPress={() => undefined}>
        <OText>Very far away</OText>
      </ChoiceRow>
    )
    const style = flat(getByTestId('row'))
    expect(style.minHeight).toBe(choice.sizes.md.height)
    // Without it the content sits at the top of the row, glued to the divider above it.
    expect(style.justifyContent).toBe('center')
  })

  it('keeps its divider on the bottom edge, except the last row', () => {
    const rows = renderWithProviders(
      <>
        <ChoiceRow kind='radio' selected={false} listed testID='first'><OText>A</OText></ChoiceRow>
        <ChoiceRow kind='radio' selected listed last testID='last'><OText>B</OText></ChoiceRow>
      </>
    )
    expect(flat(rows.getByTestId('first')).borderBottomWidth).toBeGreaterThan(0)
    expect(flat(rows.getByTestId('last')).borderBottomWidth).toBe(0)
  })

  it('does not change the boxed option: its padding, not a centered column, makes its room', () => {
    const { getByTestId } = renderWithProviders(
      <ChoiceRow kind='check' selected={false} testID='box'><OText>Extra cheese</OText></ChoiceRow>
    )
    expect(flat(getByTestId('box')).justifyContent).toBeUndefined()
  })

  it('still answers its tap', () => {
    const onPress = jest.fn()
    const { getByTestId } = renderWithProviders(
      <ChoiceRow kind='radio' selected={false} listed testID='row' onPress={onPress}><OText>A</OText></ChoiceRow>
    )
    fireEvent.press(getByTestId('row'))
    expect(onPress).toHaveBeenCalled()
  })
})
