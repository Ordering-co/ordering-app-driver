import React from 'react'
import { act, fireEvent } from '@testing-library/react-native'

import { useSession } from '@components'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'

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

describe('LogoutButton', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useSession as jest.Mock).mockReturnValue([
      { user: { level: 4 } },
      {}
    ])
  })

  it('retrieves notification state and clears storage on successful logout', async () => {
    const setRootState = jest.fn()
    const { getByText } = renderWithProviders(
      <LogoutButton setRootState={setRootState} />
    )
    await act(async () => {
      fireEvent.press(getByText('logout'))
    })
    expect(_retrieveStoreData).toHaveBeenCalledWith('notification_state')
    expect(_clearStoreData).toHaveBeenCalledWith({
      excludedKeys: ['isTutorial', 'language']
    })
    expect(setRootState).toHaveBeenCalledWith({ isAuth: false, token: null })
  })
})
