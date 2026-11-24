import React from 'react'
import { act, fireEvent } from '@testing-library/react-native'

import { useConfig, useSession } from '@components'
import { renderPage } from '../../../jest/helpers/renderPage'

jest.mock('@ui', () => require('../../../jest/helpers/mockUi'))

/** The tabs navigator the page reads: the focused tab is the one the test sets, and the `state` event comes when the test says so. */
const mockTabs: { focused: string, listeners: Set<() => void> } = { focused: 'Profile', listeners: new Set() }
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation
}))
const mockNavigation: any = {
  navigate: jest.fn(),
  getState: () => ({ routes: [{ name: 'Orders' }, { name: 'Profile' }], index: mockTabs.focused === 'Profile' ? 1 : 0 }),
  addListener: jest.fn((event: string, fn: () => void) => {
    if (event === 'state') mockTabs.listeners.add(fn)
    return () => { mockTabs.listeners.delete(fn) }
  })
}
/** A state event of the tabs navigator, with `tab` in front. */
const stateEvent = (tab: string) => {
  mockTabs.focused = tab
  mockTabs.listeners.forEach((fn) => fn())
}

import Profile from '../Profile'

const mockRefresh = jest.fn()

describe('Profile', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockTabs.focused = 'Profile'
    mockTabs.listeners.clear()
    ;(useSession as jest.Mock).mockReturnValue([
      { user: { id: 7 } },
      { refreshUserInfo: mockRefresh }
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

  describe('refreshing the user (each refresh replaces the session object, so the controllers register their listeners again)', () => {
    it('refreshes once when the tab becomes focused, not on every state event while it stays focused', () => {
      renderPage(Profile)
      expect(mockRefresh).not.toHaveBeenCalled()
      act(() => stateEvent('Profile'))
      expect(mockRefresh).toHaveBeenCalledTimes(1)
      act(() => stateEvent('Profile'))
      act(() => stateEvent('Profile'))
      expect(mockRefresh).toHaveBeenCalledTimes(1)
    })

    it('refreshes again each time it is entered after having been left', () => {
      renderPage(Profile)
      act(() => stateEvent('Profile'))
      act(() => stateEvent('Orders'))
      act(() => stateEvent('Orders'))
      expect(mockRefresh).toHaveBeenCalledTimes(1)
      act(() => stateEvent('Profile'))
      expect(mockRefresh).toHaveBeenCalledTimes(2)
      act(() => stateEvent('Profile'))
      expect(mockRefresh).toHaveBeenCalledTimes(2)
    })

    it('does not refresh for the state events of other tabs, nor without a user, and stops listening on unmount', () => {
      const view = renderPage(Profile)
      act(() => stateEvent('Orders'))
      expect(mockRefresh).not.toHaveBeenCalled()
      view.unmount()
      expect(mockTabs.listeners.size).toBe(0)

      ;(useSession as jest.Mock).mockReturnValue([{ user: null }, { refreshUserInfo: mockRefresh }])
      renderPage(Profile)
      act(() => stateEvent('Profile'))
      expect(mockRefresh).not.toHaveBeenCalled()
    })
  })
})
