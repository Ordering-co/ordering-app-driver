import React from 'react'
import { fireEvent } from '@testing-library/react-native'
import RNRestart from 'react-native-restart'

import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'

import { NetworkError } from '..'

describe('NetworkError', () => {
  it('renders offline message and restarts on refresh', () => {
    const { getByText } = renderWithProviders(<NetworkError />)
    expect(getByText('No internet connection')).toBeTruthy()
    expect(getByText('Your connection appears to be off-line. Try to refresh the page')).toBeTruthy()
    fireEvent.press(getByText('Refresh'))
    expect(RNRestart.Restart).toHaveBeenCalled()
  })
})
