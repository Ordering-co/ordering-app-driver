import React from 'react'

import { renderPage } from '../../../jest/helpers/renderPage'

jest.mock('@ui', () => require('../../../jest/helpers/mockUi'))

import Sessions from '../Sessions'

describe('Sessions', () => {
  it('renders sessions controller', () => {
    const { getByTestId } = renderPage(Sessions)
    expect(getByTestId('sessions-controller')).toBeTruthy()
    expect(getByTestId('container')).toBeTruthy()
  })
})
