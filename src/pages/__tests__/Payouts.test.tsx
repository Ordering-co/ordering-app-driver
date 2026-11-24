import React from 'react'

import { renderPage } from '../../../jest/helpers/renderPage'

jest.mock('@ui', () => require('../../../jest/helpers/mockUi'))

import Payouts from '../Payouts'

describe('Payouts', () => {
  it('renders payouts controller', () => {
    const { getByTestId } = renderPage(Payouts)
    expect(getByTestId('payouts-controller')).toBeTruthy()
    expect(getByTestId('safe-area-layout')).toBeTruthy()
  })
})
