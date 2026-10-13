import React from 'react'
import { fireEvent } from '@testing-library/react-native'

import { useConfig, useSession } from '@components'
import { renderPage } from '../../../jest/helpers/renderPage'

jest.mock('@ui', () => require('../../../jest/helpers/mockUi'))

import Profile from '../Profile'

describe('Profile', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useSession as jest.Mock).mockReturnValue([
      { user: { id: 7 } },
      { refreshUserInfo: jest.fn() }
    ])
    ;(useConfig as jest.Mock).mockReturnValue([
      { configs: { available_status_enabled: { value: '1' } } }
    ])
  })

  it('renders driver user profile form with status enabled', () => {
    const { getByTestId } = renderPage(Profile)
    expect(getByTestId('user-profile-form')).toBeTruthy()
    expect(getByTestId('user-profile-driver-status').props.children).toBe('show')
    expect(getByTestId('safe-area-layout')).toBeTruthy()
  })

  it('hides driver status when config disables it', () => {
    ;(useConfig as jest.Mock).mockReturnValue([
      { configs: { available_status_enabled: { value: '0' } } }
    ])
    const { getByTestId } = renderPage(Profile)
    expect(getByTestId('user-profile-driver-status').props.children).toBe('hide')
  })

  it('goes back when navigation allows', () => {
    const { getByTestId, navigation } = renderPage(Profile)
    fireEvent.press(getByTestId('user-profile-go-back'))
    expect(navigation.goBack).toHaveBeenCalled()
  })

  it('navigates via onNavigationRedirect', () => {
    const { getByTestId, navigation } = renderPage(Profile)
    fireEvent.press(getByTestId('user-profile-nav'))
    expect(navigation.navigate).toHaveBeenCalledWith('Sessions', {})
  })

  it('skips goBack when navigation cannot go back', () => {
    const { getByTestId, navigation } = renderPage(Profile, {
      navigation: { canGoBack: jest.fn(() => false) }
    })
    fireEvent.press(getByTestId('user-profile-go-back'))
    expect(navigation.goBack).not.toHaveBeenCalled()
  })
})
