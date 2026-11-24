import React from 'react'
import { fireEvent } from '@testing-library/react-native'

import { renderPage } from '../../../jest/helpers/renderPage'

jest.mock('@ui', () => require('../../../jest/helpers/mockUi'))

import ForgotPassword from '../ForgotPassword'

describe('ForgotPassword', () => {
  it('renders forgot password form', () => {
    const { getByTestId, queryByTestId } = renderPage(ForgotPassword)
    expect(getByTestId('forgot-password-form')).toBeTruthy()
    // The form lays its own screen (a fixed header over a scroll): the page wraps nothing around it.
    expect(queryByTestId('container')).toBeNull()
  })

  it('calls navigation goBack from form', () => {
    const { getByTestId, navigation } = renderPage(ForgotPassword)
    fireEvent.press(getByTestId('forgot-back'))
    expect(navigation.goBack).toHaveBeenCalled()
  })
})
