import React from 'react'
import { StyleSheet, Text } from 'react-native'
import { fireEvent } from '@testing-library/react-native'

import { CardRow, RowsCard } from '../RowsCard'
import { ProfileRow } from '../ProfileRow'
import Icon from '../../shared/Icon'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { defaultAppTheme } from '../../../../../theme/engine'

const flat = (node: any) => StyleSheet.flatten(node.props.style)
const theme: any = defaultAppTheme()
/** The chevrons a row drew (the app's `Icon`, by its glyph). */
const chevrons = (screen: any) => screen.UNSAFE_queryAllByType(Icon).filter((icon: any) => icon.props.name === 'chevron-forward')

describe('RowsCard', () => {
  it('draws the card of the theme with no padding of its own and the list\'s line between two rows only', () => {
    const { getByTestId, UNSAFE_getAllByType } = renderWithProviders(
      <RowsCard testID='card'>
        <CardRow><Text>one</Text></CardRow>
        <CardRow><Text>two</Text></CardRow>
        <CardRow><Text>three</Text></CardRow>
      </RowsCard>
    )
    const card = flat(getByTestId('card'))
    expect(card.borderRadius).toBe(theme.native.components.card.base.radius)
    expect(card.borderWidth).toBe(theme.native.components.card.base.border.borderWidth)
    expect(card.padding).toBe(0)
    const lines = UNSAFE_getAllByType(require('../../shared/ODivider').ODivider)
    expect(lines).toHaveLength(2)
  })

  it('clips the rows inside the card\'s corners without clipping the card\'s own shadow', () => {
    const { getByTestId } = renderWithProviders(
      <RowsCard testID='card'><CardRow><Text>one</Text></CardRow></RowsCard>
    )
    const card = getByTestId('card')
    expect(flat(card).overflow).toBeUndefined()
    const clip = flat(card.children[0] as any)
    expect(clip.overflow).toBe('hidden')
    expect(clip.borderRadius).toBe(theme.native.components.card.base.radius)
  })

  it('draws a trailing row with no line of its own from the card when it is not there', () => {
    const { UNSAFE_queryAllByType } = renderWithProviders(
      <RowsCard trailing={null}><CardRow><Text>one</Text></CardRow></RowsCard>
    )
    expect(UNSAFE_queryAllByType(require('../../shared/ODivider').ODivider)).toHaveLength(0)
  })

  it('paints a highlighted row with the brand\'s light tint, to the card\'s edges', () => {
    const { getByTestId } = renderWithProviders(
      <RowsCard>
        <CardRow highlighted testID='today'><Text>today</Text></CardRow>
        <CardRow testID='other'><Text>other</Text></CardRow>
      </RowsCard>
    )
    expect(flat(getByTestId('today')).backgroundColor).toBe(theme.native.tokens.color.primary_subtle)
    expect(flat(getByTestId('today')).paddingHorizontal).toBe(theme.native.tokens.space.md)
    expect(flat(getByTestId('other')).backgroundColor).toBeUndefined()
  })
})

describe('ProfileRow', () => {
  it('shows its value, muted, before the chevron of a row that opens something', () => {
    const onPress = jest.fn()
    const screen = renderWithProviders(
      <ProfileRow testID='row' title='Language' value='English' onPress={onPress} />
    )
    expect(flat(screen.getByText('English')).color).toBe(theme.native.tokens.color.text_muted)
    expect(chevrons(screen)).toHaveLength(1)
    fireEvent.press(screen.getByTestId('row'))
    expect(onPress).toHaveBeenCalled()
  })

  it('has no chevron and no press for a row that only says something', () => {
    const screen = renderWithProviders(<ProfileRow testID='row' title='Name' value='Ana' />)
    expect(chevrons(screen)).toHaveLength(0)
    expect(screen.getByTestId('row').props.accessibilityRole).not.toBe('button')
  })

  it('keeps the list row\'s own chevron when it has no value', () => {
    const screen = renderWithProviders(<ProfileRow title='Sessions' onPress={jest.fn()} />)
    expect(chevrons(screen)).toHaveLength(1)
  })

  it('draws an action row (log out) in the danger color, without a chevron', () => {
    const screen = renderWithProviders(
      <ProfileRow title='Logout' icon='log-out-outline' danger chevron={false} onPress={jest.fn()} />
    )
    expect(flat(screen.getByText('Logout')).color).toBe(theme.native.tokens.color.danger_text)
    expect(chevrons(screen)).toHaveLength(0)
  })
})
