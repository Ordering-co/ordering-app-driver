import React from 'react'
import { Alert, StyleSheet } from 'react-native'
import { act, fireEvent } from '@testing-library/react-native'

import { useSession } from '@components'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { defaultAppTheme } from '../../../../../theme/engine'

jest.mock('@components', () => {
  const mockOrdering = require('../../../../../../jest/helpers/mockOrdering')
  const { renderUiController, logoutActionDefaults } = require('../../../../../../jest/helpers/d1ShellDefaults')
  return {
    ...mockOrdering,
    LogoutAction: renderUiController(logoutActionDefaults)
  }
})

jest.mock('../../../providers/StoreUtil', () => ({
  _retrieveStoreData: jest.fn().mockResolvedValue('notification-token'),
  _clearStoreData: jest.fn().mockResolvedValue(undefined)
}))

import { _retrieveStoreData, _clearStoreData } from '../../../providers/StoreUtil'
import { LogoutButton } from '..'

const flat = (node: any) => StyleSheet.flatten(node.props.style)

/** The dialog the row asks before it ends the session: its two buttons, accept first. */
const dialog = () => {
  const [title, message, buttons] = (Alert.alert as jest.Mock).mock.calls.at(-1)
  return { title, message, accept: buttons[0], cancel: buttons[1] }
}

describe('LogoutButton', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(Alert, 'alert').mockImplementation(jest.fn())
    ;(useSession as jest.Mock).mockReturnValue([
      { user: { level: 4 } },
      {}
    ])
  })

  it('retrieves notification state and clears storage on successful logout', async () => {
    const setRootState = jest.fn()
    const { getByRole } = renderWithProviders(
      <LogoutButton setRootState={setRootState} />
    )
    fireEvent.press(getByRole('button'))
    await act(async () => {
      dialog().accept.onPress()
    })
    expect(_retrieveStoreData).toHaveBeenCalledWith('notification_state')
    expect(_clearStoreData).toHaveBeenCalledWith({
      excludedKeys: ['isTutorial', 'language']
    })
    expect(setRootState).toHaveBeenCalledWith({ isAuth: false, token: null })
  })

  it('is a list row in the danger look, a control\'s height to touch (decision D7)', () => {
    const theme = defaultAppTheme()
    const { getByRole, getByLabelText, UNSAFE_getByProps, UNSAFE_queryByProps } = renderWithProviders(<LogoutButton />)
    expect(getByLabelText('Logout')).toBe(getByRole('button'))
    // The logout glyph in the danger role; no chevron: the row opens nothing.
    expect(UNSAFE_getByProps({ name: 'log-out-outline', color: 'danger_text' })).toBeTruthy()
    expect(UNSAFE_queryByProps({ name: 'chevron-forward' })).toBeNull()
    expect(flat(getByRole('button')).minHeight).toBeGreaterThanOrEqual(44)
    expect(flat(getByRole('button')).paddingVertical).toBe(theme.native.components.list_row.base.padding_y)
  })

  it('sits in a card of its own, as the profile\'s lists do, with its sides on the card\'s padding', () => {
    const theme = defaultAppTheme()
    const { getByTestId } = renderWithProviders(<LogoutButton />)
    const row = getByTestId('logout')
    let card: any = row.parent
    while (card && StyleSheet.flatten(card.props?.style)?.borderWidth === undefined) card = card.parent
    expect(card).toBeTruthy()
    expect(flat(card).borderWidth).toBe(theme.native.components.card.base.border.borderWidth)
    expect(flat(card).padding).toBe(0)
    let sides: any = row.parent
    while (sides && StyleSheet.flatten(sides.props?.style)?.paddingHorizontal === undefined) sides = sides.parent
    expect(flat(sides).paddingHorizontal).toBe(theme.native.tokens.space.md)
  })

  it('dims and stops answering while the logout is on its way', async () => {
    const theme = defaultAppTheme()
    let finish: (value: boolean) => void = () => {}
    const handleLogoutClick = jest.fn(() => new Promise<boolean>((resolve) => { finish = resolve }))
    const { getByRole } = renderWithProviders(<LogoutButton handleLogoutClick={handleLogoutClick} />)
    fireEvent.press(getByRole('button'))
    await act(async () => {
      dialog().accept.onPress()
    })
    expect(getByRole('button').props.accessibilityState?.disabled ?? getByRole('button').props.disabled).toBeTruthy()
    expect(flat(getByRole('button')).opacity).toBe(theme.native.tokens.opacity.disabled)
    await act(async () => { finish(false) })
    expect(flat(getByRole('button')).opacity).toBeUndefined()
  })

  describe('ending the session asks first', () => {
    it('a tap asks and ends nothing: the accept button is named "Logout" and is destructive', async () => {
      const handleLogoutClick = jest.fn().mockResolvedValue(true)
      const setRootState = jest.fn()
      const { getByRole } = renderWithProviders(<LogoutButton handleLogoutClick={handleLogoutClick} setRootState={setRootState} />)
      await act(async () => {
        fireEvent.press(getByRole('button'))
      })
      expect(Alert.alert).toHaveBeenCalledTimes(1)
      expect(dialog().message).toBe('Are you sure that you want to log out?')
      expect(dialog().accept).toEqual(expect.objectContaining({ text: 'Logout', style: 'destructive' }))
      expect(dialog().cancel.text).toBe('Cancel')
      expect(handleLogoutClick).not.toHaveBeenCalled()
      expect(_clearStoreData).not.toHaveBeenCalled()
      expect(setRootState).not.toHaveBeenCalled()
    })

    it('accepting ends the session once', async () => {
      const handleLogoutClick = jest.fn().mockResolvedValue(true)
      const { getByRole } = renderWithProviders(<LogoutButton handleLogoutClick={handleLogoutClick} />)
      fireEvent.press(getByRole('button'))
      await act(async () => {
        dialog().accept.onPress()
      })
      expect(handleLogoutClick).toHaveBeenCalledTimes(1)
      expect(_clearStoreData).toHaveBeenCalledTimes(1)
    })

    it('cancelling leaves the session and the row as they were', async () => {
      const handleLogoutClick = jest.fn().mockResolvedValue(true)
      const setRootState = jest.fn()
      const { getByRole } = renderWithProviders(<LogoutButton handleLogoutClick={handleLogoutClick} setRootState={setRootState} />)
      fireEvent.press(getByRole('button'))
      await act(async () => {
        dialog().cancel.onPress?.()
      })
      expect(handleLogoutClick).not.toHaveBeenCalled()
      expect(setRootState).not.toHaveBeenCalled()
      expect(flat(getByRole('button')).opacity).toBeUndefined()
    })
  })
})
