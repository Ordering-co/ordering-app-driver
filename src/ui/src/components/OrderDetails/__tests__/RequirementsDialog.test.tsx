import React from 'react'
import { Dimensions, ScrollView, StyleSheet, View } from 'react-native'
import { fireEvent } from '@testing-library/react-native'

import { RequirementsDialog } from '../RequirementsDialog'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { defaultAppTheme } from '../../../../../theme/engine'

jest.mock('@components', () => require('../../../../../../jest/helpers/mockOrdering'))

const issues = [
  { message: 'Your location is outdated', action: jest.fn(), actionText: 'Refresh Location' },
  { message: 'You are 2.0 km away from the business', action: null, actionText: null }
]
const flat = (node: any) => StyleSheet.flatten(node.props.style)
/** The painted box of a button found by its role. */
const buttonBox = (button: any) => flat(button.findByType(View))

describe('RequirementsDialog', () => {
  it('draws the requirements in the modal\'s box, under its title', () => {
    const modal = defaultAppTheme().native.components.modal
    const { getByTestId, getByText } = renderWithProviders(
      <RequirementsDialog open issues={issues} onClose={jest.fn()} testID='requirements-dialog' />
    )
    const box = flat(getByTestId('requirements-dialog'))
    expect(box.backgroundColor).toBe(modal.base.background)
    expect(box.borderRadius).toBe(modal.base.radius)
    expect(box.padding).toBe(modal.base.padding)
    expect(box.maxWidth).toBe(modal.sizes.sm.width)
    // The title is the box's own.
    expect(flat(getByText('Requirements Not Met')).fontSize).toBe(modal.base.title.fontSize)
    expect(getByText('Your location is outdated')).toBeTruthy()
    expect(getByText('You are 2.0 km away from the business')).toBeTruthy()
  })

  it('runs the action that solves a requirement and closes from its button', () => {
    const onClose = jest.fn()
    const { getByRole } = renderWithProviders(<RequirementsDialog open issues={issues} onClose={onClose} />)
    fireEvent.press(getByRole('button', { name: 'Refresh Location' }))
    expect(issues[0].action).toHaveBeenCalled()
    fireEvent.press(getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('paints its close button with one look, whoever opens the dialog (decision H5)', () => {
    const button = defaultAppTheme().native.components.button
    // A screen cannot ask for another color: a prop the dialog does not have changes nothing.
    const props: any = { open: true, issues, onClose: jest.fn(), closeColor: 'secondary' }
    const { getByRole } = renderWithProviders(<RequirementsDialog {...props} />)
    const close = buttonBox(getByRole('button', { name: 'Close' }))
    expect(close.backgroundColor).toBe(button.variants.neutral.solid.background)
    expect(close.minHeight).toBe(button.sizes.md.height)
  })

  it('lets its list scroll inside the room the window leaves the box', () => {
    const { UNSAFE_getByType } = renderWithProviders(<RequirementsDialog open issues={issues} onClose={jest.fn()} />)
    const list = flat(UNSAFE_getByType(ScrollView))
    expect(list.flexGrow).toBe(0)
    expect(list.maxHeight).toBeGreaterThan(0)
    // Never as tall as the window: the box's padding, title, gaps and button are taken from it.
    expect(list.maxHeight).toBeLessThan(Dimensions.get('window').height)
  })
})
