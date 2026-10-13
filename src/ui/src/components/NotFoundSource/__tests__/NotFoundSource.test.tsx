import React from 'react'
import { Text, View } from 'react-native'
import { fireEvent } from '@testing-library/react-native'

import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'

import { NotFoundSource } from '..'

describe('NotFoundSource', () => {
  it('renders content and handles button press', () => {
    const onClickButton = jest.fn()
    const { getByText } = renderWithProviders(
      <NotFoundSource
        content="Page not found"
        btnTitle="Go back"
        onClickButton={onClickButton}
      />
    )
    expect(getByText('Page not found')).toBeTruthy()
    fireEvent.press(getByText('Go back'))
    expect(onClickButton).toHaveBeenCalled()
  })

  it('renders children when button handler is absent', () => {
    const { getByText } = renderWithProviders(
      <NotFoundSource content="Missing">
        <View><Text>Custom child</Text></View>
      </NotFoundSource>
    )
    expect(getByText('Custom child')).toBeTruthy()
  })
})
