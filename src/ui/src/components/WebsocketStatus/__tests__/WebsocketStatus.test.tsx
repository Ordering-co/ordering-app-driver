import React from 'react'
import { fireEvent } from '@testing-library/react-native'
import RNRestart from 'react-native-restart'

import { useUtils } from '@components'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'

jest.mock('@components', () => {
  const mockOrdering = require('../../../../../../jest/helpers/mockOrdering')
  const { renderUiController, websocketStatusDefaults } = require('../../../../../../jest/helpers/d1ShellDefaults')
  return {
    ...mockOrdering,
    WebsocketStatus: renderUiController(websocketStatusDefaults),
    useUtils: jest.fn(() => [{ parseDate: (value: string) => value }])
  }
})

import { WebsocketStatus } from '..'

describe('WebsocketStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useUtils as jest.Mock).mockReturnValue([{ parseDate: (value: string) => value }])
  })

  it('opens connection status modal', () => {
    const { getByText } = renderWithProviders(<WebsocketStatus />)
    fireEvent.press(getByText('Status'))
    expect(getByText('Connection status')).toBeTruthy()
    expect(getByText('Ok')).toBeTruthy()
  })

  it('restarts app from update button', () => {
    const { getByText } = renderWithProviders(
      <WebsocketStatus socketStatus={2} connectedDate="2026-01-01" />
    )
    fireEvent.press(getByText('Status'))
    fireEvent.press(getByText('Update'))
    expect(RNRestart.restart).toHaveBeenCalled()
  })
})
