import React from 'react'
import { StyleSheet } from 'react-native'

import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { defaultAppTheme } from '../../../../../theme/engine'
import OInput from '../OInput'

describe('OInput: the ink of its label (`labelColor`)', () => {
  const theme: any = defaultAppTheme()

  it('keeps the field\'s own label color by default', () => {
    const { getByText } = renderWithProviders(<OInput scope='account_page' placeholder='Email' onChange={jest.fn()} />)
    expect(StyleSheet.flatten(getByText('Email').props.style).color).toBe(theme.native.components.field.base.label_color)
  })

  it('paints the label above the box in the color it is given (a field over a photo)', () => {
    const { getByText } = renderWithProviders(
      <OInput scope='account_page' placeholder='Email' labelColor='#ABCDEF' onChange={jest.fn()} />
    )
    expect(StyleSheet.flatten(getByText('Email').props.style).color).toBe('#ABCDEF')
  })

  it('does nothing for a field whose label is its placeholder', () => {
    const { queryByText, getByPlaceholderText } = renderWithProviders(
      <OInput placeholder='Email' labelColor='#ABCDEF' onChange={jest.fn()} />
    )
    expect(queryByText('Email')).toBeNull()
    expect(getByPlaceholderText('Email')).toBeTruthy()
  })
})
