import React from 'react'

import { renderWithProviders } from '../../../jest/helpers/renderWithProviders'

jest.mock('@ui', () => require('../../../jest/helpers/mockUi'))

import NetworkError from '../NetworkError'

describe('NetworkError', () => {
  it('renders network error screen inside safe area', () => {
    const { getByTestId } = renderWithProviders(<NetworkError />)
    expect(getByTestId('safe-area-container')).toBeTruthy()
    expect(getByTestId('network-error-screen')).toBeTruthy()
  })
})
