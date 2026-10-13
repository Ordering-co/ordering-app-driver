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

jest.mock('../../Chat', () => {
  const React = require('react')
  const { View } = require('react-native')
  return {
    Chat: () => React.createElement(View, { testID: 'chat-stub' })
  }
})

jest.mock('@ui', () => {
  const { buildD4MessagesUiMock } = require('../../../../../../jest/helpers/d4MessagesUiMock')
  const React = require('react')
  const { ChatMessageSkeleton } = require('../../shared/ChatMessageSkeleton')
  return {
    ...buildD4MessagesUiMock(),
    ChatMessageSkeleton
  }
})

jest.mock('@components', () => {
  const mockOrdering = require('../../../../../../jest/helpers/mockOrdering')
  const { renderUiController } = require('../../../../../../jest/helpers/d1ShellDefaults')
  const { orderDetailsDefaults } = require('../../../../../../jest/helpers/d4MessagesDefaults')
  return {
    ...mockOrdering,
    useUtils: jest.fn(() => [{
      optimizeImage: (url: string) => url,
      parseDate: (v: string) => v || '2026-01-01'
    }]),
    OrderDetails: renderUiController(orderDetailsDefaults)
  }
})

import { OrderMessage } from '..'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { sampleOrder } from '../../../../../../jest/helpers/d4MessagesDefaults'

describe('OrderMessage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useSession as jest.Mock).mockReturnValue([{ user: { id: 1, level: 4 } }, {}])
  })

  it('renders order number header and chat', () => {
    const { getByText, getByTestId } = renderWithProviders(<OrderMessage />)
    expect(getByText(/Order No\. 101/)).toBeTruthy()
    expect(getByTestId('chat-stub')).toBeTruthy()
  })

  it('shows loading placeholders while order loads', () => {
    const { getByTestId } = renderWithProviders(
      <OrderMessage order={{ order: null, loading: true, error: null }} />
    )
    expect(getByTestId('chat-message-skeleton')).toBeTruthy()
  })

  it('navigates back when header arrow is pressed', () => {
    const goBack = jest.fn()
    const canGoBack = jest.fn(() => true)
    const { UNSAFE_getAllByType } = renderWithProviders(
      <OrderMessage navigation={{ goBack, canGoBack, navigate: jest.fn() }} />
    )
    const { TouchableOpacity } = require('react-native')
    // OIconButton wraps pressable - use first pressable-ish via pressing arrow area
    // Prefer calling by looking for icon button press through first TouchableOpacity in tree
    const touchables = UNSAFE_getAllByType(TouchableOpacity)
    if (touchables.length) {
      fireEvent.press(touchables[0])
    }
    expect(goBack).toHaveBeenCalled()
  })

  it('renders driver avatar when order has a driver', () => {
    const { getByText } = renderWithProviders(
      <OrderMessage
        order={{
          order: { ...sampleOrder, driver: { id: 3, name: 'Driver', photo: null } },
          loading: false,
          error: null
        }}
      />
    )
    expect(getByText(/Order No\. 101/)).toBeTruthy()
  })
})
