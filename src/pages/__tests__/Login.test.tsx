import React from 'react'
import { act, fireEvent } from '@testing-library/react-native'
import RNRestart from 'react-native-restart'

import { useSession } from '@components'
import { renderPage } from '../../../jest/helpers/renderPage'

jest.mock('@ui', () => require('../../../jest/helpers/mockUi'))

import Login from '../Login'

describe('Login', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useSession as jest.Mock).mockReturnValue([
      { auth: false, user: null },
      { login: jest.fn() }
    ])
  })

  it('renders login form', () => {
    const { getByTestId } = renderPage(Login)
    expect(getByTestId('login-form')).toBeTruthy()
    expect(getByTestId('container')).toBeTruthy()
  })

  it('redirects through onNavigationRedirect', () => {
    const { getByTestId, navigation } = renderPage(Login)
    fireEvent.press(getByTestId('login-redirect'))
    expect(navigation.navigate).toHaveBeenCalledWith('Signup')
  })

  it('logs in and restarts when projectChanged', async () => {
    const login = jest.fn()
    ;(useSession as jest.Mock).mockReturnValue([
      { auth: false, user: null },
      { login }
    ])
    const { getByTestId } = renderPage(Login, {
      pageProps: { projectChanged: true }
    })
    await act(async () => {
      fireEvent.press(getByTestId('login-success'))
    })
    expect(login).toHaveBeenCalledWith({
      user: { id: 1, level: 4, session: { access_token: 'token' } },
      token: 'token'
    })
    expect(RNRestart.restart).toHaveBeenCalled()
  })

  it('does not restart when the project did not change', async () => {
    const login = jest.fn()
    ;(useSession as jest.Mock).mockReturnValue([
      { auth: false, user: null },
      { login }
    ])
    const { getByTestId } = renderPage(Login)
    await act(async () => {
      fireEvent.press(getByTestId('login-success'))
    })
    expect(login).not.toHaveBeenCalled()
    expect(RNRestart.restart).not.toHaveBeenCalled()
  })
})
