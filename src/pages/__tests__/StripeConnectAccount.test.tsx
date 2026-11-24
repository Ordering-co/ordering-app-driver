import React from 'react'

import { renderPage } from '../../../jest/helpers/renderPage'

jest.mock('@ui', () => require('../../../jest/helpers/mockUi'))

import StripeConnectAccount from '../StripeConnectAccount'

describe('StripeConnectAccount', () => {
  it('renders stripe connect account controller', () => {
    const { getByTestId } = renderPage(StripeConnectAccount)
    expect(getByTestId('stripe-connect-account-controller')).toBeTruthy()
    expect(getByTestId('safe-area-layout')).toBeTruthy()
  })
})
