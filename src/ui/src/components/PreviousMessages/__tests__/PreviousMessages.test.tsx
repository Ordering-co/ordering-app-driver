import React from 'react'
import { fireEvent } from '@testing-library/react-native'

jest.mock('@components', () => {
  const mockOrdering = require('../../../../../../jest/helpers/mockOrdering')
  return {
    ...mockOrdering,
    useUtils: jest.fn(() => [{
      parseDate: (v: string) => v || '2026-01-01',
      optimizeImage: (url: string) => url
    }])
  }
})

import { PreviousMessages } from '..'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { sampleOrder } from '../../../../../../jest/helpers/d4MessagesDefaults'

const tabs = [{ key: 0, text: 'Orders', tags: [0, 1] }]

describe('PreviousMessages', () => {
  it('renders order message cards', () => {
    const { getByText } = renderWithProviders(
      <PreviousMessages
        orders={[{ ...sampleOrder, business: { ...sampleOrder.business, logo: null } }]}
        tabs={tabs}
        tabsFilter={[0, 1]}
        loading={false}
        reload={false}
        error={null}
        pagination={{ currentPage: 1, totalPages: 1 }}
        getOrders={jest.fn()}
        onNavigationRedirect={jest.fn()}
      />
    )
    expect(getByText('Store A')).toBeTruthy()
    expect(getByText(/Order No\.101/)).toBeTruthy()
    expect(getByText('Pending')).toBeTruthy()
  })

  it('navigates to OrderMessage on press', () => {
    const onNavigationRedirect = jest.fn()
    const setOrders = jest.fn()
    const { getByText } = renderWithProviders(
      <PreviousMessages
        orders={[{ ...sampleOrder, business: { ...sampleOrder.business, logo: null } }]}
        tabs={tabs}
        tabsFilter={[0, 1]}
        loading={false}
        reload={false}
        error={null}
        setOrders={setOrders}
        onNavigationRedirect={onNavigationRedirect}
      />
    )
    fireEvent.press(getByText('Store A'))
    expect(onNavigationRedirect).toHaveBeenCalledWith(
      'OrderMessage',
      expect.objectContaining({ orderId: 101, setOrders })
    )
  })

  it('shows unread badge when unread_count > 0', () => {
    const { getByText } = renderWithProviders(
      <PreviousMessages
        orders={[{ ...sampleOrder, unread_count: 5, business: { ...sampleOrder.business, logo: null } }]}
        tabs={tabs}
        tabsFilter={[0, 1]}
        loading={false}
        reload={false}
        error={null}
      />
    )
    expect(getByText('5')).toBeTruthy()
  })

  it('shows load more button when more pages remain', () => {
    const loadMore = jest.fn()
    const { getByText } = renderWithProviders(
      <PreviousMessages
        orders={[{ ...sampleOrder, business: { ...sampleOrder.business, logo: null } }]}
        tabs={tabs}
        tabsFilter={[0, 1]}
        loading={false}
        reload={false}
        error={null}
        pagination={{ currentPage: 1, totalPages: 3 }}
        loadMore={loadMore}
      />
    )
    fireEvent.press(getByText('Load more orders'))
    expect(loadMore).toHaveBeenCalled()
  })
})
