import React from 'react'
import { Alert } from 'react-native'
import { fireEvent } from '@testing-library/react-native'

import { useSession, useUtils } from '@components'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'

jest.mock('rn-placeholder', () => {
  const { View } = require('react-native')
  return {
    Placeholder: ({ children }: any) => <View testID="placeholder">{children}</View>,
    PlaceholderLine: () => <View testID="placeholder-line" />,
    Fade: {}
  }
})

jest.mock('@ui', () => {
  const { buildD2AuthUiMock } = require('../../../../../../jest/helpers/d2AuthUiMock')
  return buildD2AuthUiMock()
})

jest.mock('@components', () => {
  const mockOrdering = require('../../../../../../jest/helpers/mockOrdering')
  const { renderUiController } = require('../../../../../../jest/helpers/d1ShellDefaults')
  const { sessionsDefaults } = require('../../../../../../jest/helpers/d2AuthDefaults')
  return {
    ...mockOrdering,
    Sessions: renderUiController(sessionsDefaults)
  }
})

import { Sessions } from '..'

describe('Sessions', () => {
  beforeEach(() => {
    ;(useSession as jest.Mock).mockReturnValue([
      {
        auth: true,
        user: { id: 1, session_strategy: 'jwt_session' }
      },
      { logout: jest.fn() }
    ])
    ;(useUtils as jest.Mock).mockReturnValue([{ parseDate: (value: string) => value }])
  })

  it('renders session list for jwt users', () => {
    const { getByText } = renderWithProviders(<Sessions />)
    expect(getByText('Delete all sessions except current')).toBeTruthy()
  })

  it('opens delete-all confirmation dialog', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_title, _msg, buttons: any) => {
      buttons?.[0]?.onPress?.()
    })
    const handleDeleteAllSessions = jest.fn()
    const { getByText } = renderWithProviders(
      <Sessions handleDeleteAllSessions={handleDeleteAllSessions} />
    )
    fireEvent.press(getByText('Delete all sessions except current'))
    expect(alertSpy).toHaveBeenCalled()
    expect(handleDeleteAllSessions).toHaveBeenCalledWith(false)
    alertSpy.mockRestore()
  })

  it('opens delete-all-sessions confirmation (including current)', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_title, _msg, buttons: any) => {
      buttons?.[0]?.onPress?.()
    })
    const handleDeleteAllSessions = jest.fn()
    const { getByText } = renderWithProviders(
      <Sessions handleDeleteAllSessions={handleDeleteAllSessions} />
    )
    fireEvent.press(getByText('Delete all sessions'))
    expect(alertSpy).toHaveBeenCalled()
    expect(handleDeleteAllSessions).toHaveBeenCalledWith(true)
    alertSpy.mockRestore()
  })

  it('shows enable sessions prompt for non-jwt users', () => {
    ;(useSession as jest.Mock).mockReturnValue([
      { auth: true, user: { id: 1, session_strategy: 'cookie' } },
      { logout: jest.fn() }
    ])
    const { getByText } = renderWithProviders(<Sessions />)
    expect(getByText('Active sessions')).toBeTruthy()
  })

  it('enables sessions for non-jwt users', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_title, _msg, buttons: any) => {
      buttons?.[0]?.onPress?.()
    })
    ;(useSession as jest.Mock).mockReturnValue([
      { auth: true, user: { id: 1, session_strategy: 'cookie' } },
      { logout: jest.fn() }
    ])
    const handleDeleteAllSessions = jest.fn()
    const { getByText } = renderWithProviders(
      <Sessions handleDeleteAllSessions={handleDeleteAllSessions} />
    )
    fireEvent.press(getByText('Active sessions'))
    expect(alertSpy).toHaveBeenCalled()
    expect(handleDeleteAllSessions).toHaveBeenCalledWith(false)
    alertSpy.mockRestore()
  })

  it('renders loading placeholders', () => {
    const { getAllByTestId } = renderWithProviders(
      <Sessions sessionsList={{ loading: true, sessions: [] }} />
    )
    expect(getAllByTestId('placeholder-line').length).toBeGreaterThan(0)
  })

  it('shows empty sessions message', () => {
    const { getByText } = renderWithProviders(
      <Sessions sessionsList={{ loading: false, sessions: [] }} />
    )
    expect(getByText("You don't have any sessions")).toBeTruthy()
  })
})
