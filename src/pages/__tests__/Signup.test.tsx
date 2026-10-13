import React from 'react'
import { act, fireEvent } from '@testing-library/react-native'

import { useSession } from '@components'
import { _removeStoreData } from '@ui'
import { renderPage } from '../../../jest/helpers/renderPage'

jest.mock('@ui', () => require('../../../jest/helpers/mockUi'))

import Signup from '../Signup'

describe('Signup', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useSession as jest.Mock).mockReturnValue([
      { auth: false, user: null },
      { login: jest.fn() }
    ])
  })

  it('renders signup form', () => {
    const { getByTestId } = renderPage(Signup)
    expect(getByTestId('signup-form')).toBeTruthy()
  })

  it('logs in driver user after successful signup', async () => {
    const login = jest.fn()
    ;(useSession as jest.Mock).mockReturnValue([
      { auth: false, user: null },
      { login }
    ])
    const { getByTestId } = renderPage(Signup)
    await act(async () => {
      fireEvent.press(getByTestId('signup-success-driver'))
    })
    expect(_removeStoreData).toHaveBeenCalledWith('isGuestUser')
    expect(login).toHaveBeenCalledWith({
      user: { id: 1, level: 4, session: { access_token: 'token' } },
      token: 'token'
    })
  })

  it('goes back when signup level is not driver', async () => {
    const { getByTestId, navigation } = renderPage(Signup)
    await act(async () => {
      fireEvent.press(getByTestId('signup-success-other'))
    })
    expect(_removeStoreData).toHaveBeenCalledWith('isGuestUser')
    expect(navigation.goBack).toHaveBeenCalled()
  })
})
