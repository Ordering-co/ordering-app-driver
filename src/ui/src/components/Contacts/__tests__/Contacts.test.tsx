import React from 'react'
import { fireEvent } from '@testing-library/react-native'

import { useSession } from '@components'

jest.mock('rn-placeholder', () => {
  const { View } = require('react-native')
  return {
    Placeholder: ({ children }: any) => <View testID="placeholder">{children}</View>,
    PlaceholderLine: () => <View testID="placeholder-line" />,
    Fade: {}
  }
})

jest.mock('@ui', () => {
  const { buildD4MessagesUiMock } = require('../../../../../../jest/helpers/d4MessagesUiMock')
  return buildD4MessagesUiMock()
})

jest.mock('@components', () => {
  const mockOrdering = require('../../../../../../jest/helpers/mockOrdering')
  const { renderUiController } = require('../../../../../../jest/helpers/d1ShellDefaults')
  const { contactsDefaults } = require('../../../../../../jest/helpers/d4MessagesDefaults')
  return {
    ...mockOrdering,
    useUtils: jest.fn(() => [{
      parseDate: (v: string) => v || '2026-01-01',
      optimizeImage: (url: string) => url
    }]),
    Contacts: renderUiController(contactsDefaults)
  }
})

import { Contacts } from '..'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'

describe('Contacts', () => {
  beforeEach(() => {
    ;(useSession as jest.Mock)?.mockReturnValue?.([{ user: { id: 1, level: 4 } }, {}])
  })

  it('renders contact names', () => {
    const { getByText } = renderWithProviders(<Contacts />)
    expect(getByText(/Contact One/)).toBeTruthy()
    expect(getByText(/Contact Two/)).toBeTruthy()
  })

  it('shows unread badge for contacts with unread messages', () => {
    const { getByText } = renderWithProviders(<Contacts />)
    expect(getByText('1')).toBeTruthy()
  })

  it('shows load more when pagination allows', () => {
    const loadMore = jest.fn()
    const { getByText } = renderWithProviders(<Contacts loadMore={loadMore} />)
    fireEvent.press(getByText('Load more'))
    expect(loadMore).toHaveBeenCalledWith(2)
  })

  it('shows not found when contact list is empty', () => {
    const { getByText } = renderWithProviders(
      <Contacts
        contacts={{ data: [], loading: false, error: null }}
        pagination={{ currentPage: 1, totalPages: 1 }}
      />
    )
    expect(getByText('Sorry, no results found')).toBeTruthy()
  })

  it('shows loading placeholders while fetching', () => {
    const { getByTestId } = renderWithProviders(
      <Contacts contacts={{ data: [], loading: true, error: null }} />
    )
    expect(getByTestId('order-list-skeleton')).toBeTruthy()
  })

  it('fetches businesses when activeTag is 2', () => {
    const getBusinesses = jest.fn()
    renderWithProviders(
      <Contacts
        activeTag={2}
        getBusinesses={getBusinesses}
        contacts={{ data: [], loading: false, error: null }}
      />
    )
    expect(getBusinesses).toHaveBeenCalled()
  })
})
