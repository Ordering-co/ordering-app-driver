import React from 'react'
import { StyleSheet } from 'react-native'

import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { buildAppTheme, defaultAppTheme, THEME_PRODUCT_TYPE } from '../../../../../theme/engine'
import { nativeBoxStyle } from '../../../../../theme/helpers'

jest.mock('@components', () => {
  const mockOrdering = require('../../../../../../jest/helpers/mockOrdering')
  const { renderUiController } = require('../../../../../../jest/helpers/d1ShellDefaults')
  return { ...mockOrdering, FloatingButton: renderUiController({}) }
})

import { FloatingButton } from '..'

const box = (node: any) => StyleSheet.flatten(node.children[0].props.style)
const theme: any = defaultAppTheme()
const look = (color: string, appearance: string) => nativeBoxStyle(theme.native.components.button.variants[color][appearance])

describe('FloatingButton: the look another component\'s slot gives the first action (`buttonLook`)', () => {
  it('changes nothing without it: the bar\'s own slot paints', () => {
    const { getByRole } = renderWithProviders(<FloatingButton btnText='Continue' firstButtonClick={jest.fn()} />)
    const slot = theme.native.components.bottom_bar.slots.button
    expect(box(getByRole('button'))).toEqual(expect.objectContaining(look(slot.color, slot.appearance)))
    expect(box(getByRole('button')).minHeight).toBe(theme.native.components.button.sizes[slot.size].height)
  })

  it('paints the first action in the color, appearance and size it gives, over the bar\'s slot', () => {
    const { getByRole } = renderWithProviders(
      <FloatingButton btnText='Cancel' buttonLook={{ color: 'neutral', appearance: 'outline', size: 'md' }} firstButtonClick={jest.fn()} />
    )
    expect(box(getByRole('button'))).toEqual(expect.objectContaining(look('neutral', 'outline')))
    expect(box(getByRole('button')).minHeight).toBe(theme.native.components.button.sizes.md.height)
  })

  it('takes the look piece by piece: what it does not say stays the slot\'s', () => {
    const { getByRole } = renderWithProviders(
      <FloatingButton btnText='Cancel' buttonLook={{ appearance: 'tonal' }} firstButtonClick={jest.fn()} />
    )
    const slot = theme.native.components.bottom_bar.slots.button
    expect(box(getByRole('button'))).toEqual(expect.objectContaining(look(slot.color, 'tonal')))
    expect(box(getByRole('button')).minHeight).toBe(theme.native.components.button.sizes[slot.size].height)
  })

  it('leaves the other actions of the bar as they are', () => {
    const custom: any = buildAppTheme({ version: 2, product_type: THEME_PRODUCT_TYPE, values: {} })
    const { getAllByRole } = renderWithProviders(
      <FloatingButton
        btnText='Reject' secondBtnText='Accept' secondButton
        buttonLook={{ color: 'neutral', appearance: 'outline' }}
        firstButtonClick={jest.fn()} secondButtonClick={jest.fn()}
      />,
      { themeOverrides: custom }
    )
    const [accept, reject] = getAllByRole('button')
    expect(box(accept)).toEqual(expect.objectContaining(look('success', 'solid')))
    expect(box(reject)).toEqual(expect.objectContaining(look('neutral', 'outline')))
  })
})
