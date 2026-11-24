import React from 'react'
import { StyleSheet } from 'react-native'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { defaultAppTheme } from '../../../../../theme/engine'
import { MessageListSkeleton } from '../MessageListSkeleton'
import { messageListStyles } from '../../PreviousMessages/styles'

const flat = (node: any) => StyleSheet.flatten(node.props.style)
const boneHeights = (row: any) => row
  .findAll((node: any) => typeof node.type === 'string' && flat(node)?.opacity !== undefined && typeof flat(node)?.height === 'number')
  .map((node: any) => flat(node).height)

describe('MessageListSkeleton', () => {
  const theme: any = defaultAppTheme()
  const loaded = messageListStyles(theme)
  const typography = theme.native.tokens.typography

  it('draws as many rows as asked', () => {
    const { getAllByTestId } = renderWithProviders(<MessageListSkeleton count={3} />)
    expect(getAllByTestId('message-row-skeleton')).toHaveLength(3)
  })

  it('is a row of the Messages list: the list\'s own row style, a line between two rows and none after the last', () => {
    const { getAllByTestId, getByTestId } = renderWithProviders(<MessageListSkeleton count={2} />)
    const row = getAllByTestId('message-row-skeleton')[0]
    // The same style as the loaded row, so the pitch is the real one.
    expect(flat(row)).toEqual(StyleSheet.flatten(loaded.row))
    const item = theme.native.components.divider.variants.item
    const lines = getByTestId('message-list-skeleton').children.filter((child: any) => typeof child !== 'string')
    expect(lines).toHaveLength(3)
    expect(flat((lines[1] as any).children[0]).height).toBe(item.line.borderWidth)
  })

  it('gives each piece the height of what it stands for: the logo, the name, the number and date, the status, the timer', () => {
    const { getAllByTestId } = renderWithProviders(<MessageListSkeleton count={1} />)
    expect(boneHeights(getAllByTestId('message-row-skeleton')[0])).toEqual([
      theme.native.components.avatar.sizes.md.size,
      typography.label.lineHeight,
      typography.body_sm.lineHeight,
      theme.native.components.badge.sizes.sm.height,
      typography.body_sm.lineHeight
    ])
  })
})
