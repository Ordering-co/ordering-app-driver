import React from 'react'
import { fireEvent } from '@testing-library/react-native'

jest.mock('@ui', () => {
  const path = require('path')
  const root = path.join(__dirname, '../../../../../../')
  const { buildD4MessagesUiMock } = require('../../../../../../jest/helpers/d4MessagesUiMock')
  const mock = buildD4MessagesUiMock()
  mock.PreviousMessages = require(path.join(root, 'src/ui/src/components/PreviousMessages')).PreviousMessages
  return mock
})

jest.mock('@components', () => {
  const mockOrdering = require('../../../../../../jest/helpers/mockOrdering')
  const { renderUiController } = require('../../../../../../jest/helpers/d1ShellDefaults')
  const { messagesOptionDefaults } = require('../../../../../../jest/helpers/d4MessagesDefaults')
  return {
    ...mockOrdering,
    useUtils: jest.fn(() => [{
      parseDate: (v: string) => v || '2026-01-01',
      optimizeImage: (url: string) => url
    }]),
    Contacts: renderUiController(messagesOptionDefaults)
  }
})

import { MessagesOption } from '..'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'

describe('MessagesOption', () => {
  it('renders messages header', () => {
    const { getByText } = renderWithProviders(<MessagesOption />)
    expect(getByText('Messages')).toBeTruthy()
  })

  it('renders newest / order number tags', () => {
    const { getByText } = renderWithProviders(<MessagesOption />)
    expect(getByText('Newest')).toBeTruthy()
    expect(getByText('Order number')).toBeTruthy()
  })

  it('switches sort tag to order number', () => {
    const setSortBy = jest.fn()
    const { getByText } = renderWithProviders(<MessagesOption setSortBy={setSortBy} />)
    fireEvent.press(getByText('Order number'))
    expect(setSortBy).toHaveBeenCalledWith({ param: 'id', direction: 'desc' })
  })

  it('shows empty state when there are no orders', () => {
    const { getByText } = renderWithProviders(
      <MessagesOption
        orders={{ loading: false, error: null, data: [] }}
      />
    )
    expect(getByText('Sorry, no results found')).toBeTruthy()
  })

  it('lists previous message orders', () => {
    const { getByText } = renderWithProviders(<MessagesOption />)
    expect(getByText('Message Store')).toBeTruthy()
  })

  it('navigates to order message when a message card is pressed', () => {
    const onNavigationRedirect = jest.fn()
    const { getByText } = renderWithProviders(
      <MessagesOption onNavigationRedirect={onNavigationRedirect} />
    )
    fireEvent.press(getByText('Message Store'))
    expect(onNavigationRedirect).toHaveBeenCalledWith(
      'OrderMessage',
      expect.objectContaining({ orderId: 101 })
    )
  })
})
