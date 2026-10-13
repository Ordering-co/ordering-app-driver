import React from 'react'

import { renderWithProviders } from '../../../jest/helpers/renderWithProviders'

import Splash from '../Splash'

describe('Splash', () => {
  it('renders splash screen', () => {
    const { toJSON } = renderWithProviders(<Splash />)
    expect(toJSON()).toBeTruthy()
  })
})
