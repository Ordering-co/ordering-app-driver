import React from 'react'
import { fireEvent, waitFor } from '@testing-library/react-native'

import { useConfig, useSession } from '@components'

jest.mock('rn-placeholder', () => {
  const { View } = require('react-native')
  return {
    Placeholder: ({ children }: any) => <View testID="placeholder">{children}</View>,
    PlaceholderLine: () => <View testID="placeholder-line" />,
    Fade: {}
  }
})

jest.mock('../../OrderDetails/OrderHeaderComponent', () => {
  const React = require('react')
  const { Text, View } = require('react-native')
  return {
    OrderHeaderComponent: ({ order }: any) =>
      React.createElement(View, { testID: 'order-header' },
        React.createElement(Text, null, `Order ${order?.id}`)
      )
  }
})

jest.mock('../../OrderDetails/OrderContentComponent', () => {
  const React = require('react')
  const { Text, View } = require('react-native')
  return {
    OrderContentComponent: ({ order }: any) =>
      React.createElement(View, { testID: 'order-content' },
        React.createElement(Text, null, order?.business?.name || 'content')
      )
  }
})

jest.mock('@ui', () => {
  const { buildD4MessagesUiMock } = require('../../../../../../jest/helpers/d4MessagesUiMock')
  return buildD4MessagesUiMock()
})

jest.mock('@components', () => {
  const mockOrdering = require('../../../../../../jest/helpers/mockOrdering')
  const { renderUiController } = require('../../../../../../jest/helpers/d1ShellDefaults')
  const { orderDetailsDefaults } = require('../../../../../../jest/helpers/d4MessagesDefaults')
  return {
    ...mockOrdering,
    OrderDetails: renderUiController(orderDetailsDefaults)
  }
})

import { OrderDetailsLogistic } from '..'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { sampleOrder } from '../../../../../../jest/helpers/d4MessagesDefaults'

describe('OrderDetailsLogistic', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useConfig as jest.Mock).mockReturnValue([{ configs: {} }])
    ;(useSession as jest.Mock).mockReturnValue([{ user: { id: 1, level: 4 } }, {}])
  })

  it('renders order header and content', () => {
    const { getByTestId, getByText } = renderWithProviders(<OrderDetailsLogistic />)
    expect(getByTestId('order-header')).toBeTruthy()
    expect(getByText('Store A')).toBeTruthy()
  })

  it('shows accept and reject floating buttons for pending logistic order', () => {
    const { getByTestId, getByText } = renderWithProviders(<OrderDetailsLogistic />)
    expect(getByTestId('floating-button-stub')).toBeTruthy()
    expect(getByText('Reject')).toBeTruthy()
    expect(getByText('Accept')).toBeTruthy()
  })

  it('accepts logistic order from floating button', async () => {
    const handleClickLogisticOrder = jest.fn()
    const goBack = jest.fn()
    const { getByTestId } = renderWithProviders(
      <OrderDetailsLogistic
        handleClickLogisticOrder={handleClickLogisticOrder}
        navigation={{ goBack, canGoBack: () => true, navigate: jest.fn() }}
      />
    )
    fireEvent.press(getByTestId('floating-second'))
    expect(handleClickLogisticOrder).toHaveBeenCalledWith(1, 55, expect.objectContaining({ id: 101 }))
    await waitFor(() => expect(goBack).toHaveBeenCalled())
  })

  it('asks for the delivery time after accepting a logistic order', async () => {
    const handleClickLogisticOrder = jest.fn().mockResolvedValue({
      error: false,
      order: { id: 101 },
      orderIds: [101],
      defaultEta: null
    })
    const handleUpdateLogisticOrdersEta = jest.fn().mockResolvedValue([{ id: 101 }])
    const replace = jest.fn()
    const goBack = jest.fn()
    const { getByTestId } = renderWithProviders(
      <OrderDetailsLogistic
        handleClickLogisticOrder={handleClickLogisticOrder}
        handleUpdateLogisticOrdersEta={handleUpdateLogisticOrdersEta}
        navigation={{ goBack, replace, canGoBack: () => true, navigate: jest.fn() }}
      />
    )
    fireEvent.press(getByTestId('floating-second'))

    await waitFor(() => expect(replace).toHaveBeenCalled())
    const [page, params] = replace.mock.calls[0]
    expect(page).toBe('AcceptOrRejectOrder')
    expect(params).toEqual(expect.objectContaining({ action: 'accept', ids: [101] }))
    expect(goBack).not.toHaveBeenCalled()

    await params.handleChangeOrderStatus(8, [101], { delivered_in: 25, status: 8 })
    expect(handleUpdateLogisticOrdersEta).toHaveBeenCalledWith([101], 25)
  })

  it('keeps the single tap accept on projects with a default logistic eta', async () => {
    const handleClickLogisticOrder = jest.fn().mockResolvedValue({
      error: false,
      order: { id: 101 },
      orderIds: [101],
      defaultEta: 10
    })
    const replace = jest.fn()
    const goBack = jest.fn()
    const { getByTestId } = renderWithProviders(
      <OrderDetailsLogistic
        handleClickLogisticOrder={handleClickLogisticOrder}
        handleUpdateLogisticOrdersEta={jest.fn()}
        navigation={{ goBack, replace, canGoBack: () => true, navigate: jest.fn() }}
      />
    )
    fireEvent.press(getByTestId('floating-second'))

    await waitFor(() => expect(goBack).toHaveBeenCalled())
    expect(replace).not.toHaveBeenCalled()
  })

  it('goes back without asking for delivery time when accepting fails', async () => {
    const handleClickLogisticOrder = jest.fn().mockResolvedValue({ error: true })
    const handleUpdateLogisticOrdersEta = jest.fn()
    const replace = jest.fn()
    const goBack = jest.fn()
    const { getByTestId } = renderWithProviders(
      <OrderDetailsLogistic
        handleClickLogisticOrder={handleClickLogisticOrder}
        handleUpdateLogisticOrdersEta={handleUpdateLogisticOrdersEta}
        navigation={{ goBack, replace, canGoBack: () => true, navigate: jest.fn() }}
      />
    )
    fireEvent.press(getByTestId('floating-second'))

    await waitFor(() => expect(goBack).toHaveBeenCalled())
    expect(replace).not.toHaveBeenCalled()
  })

  it('rejects logistic order from floating button', () => {
    const handleClickLogisticOrder = jest.fn()
    const goBack = jest.fn()
    const { getByTestId } = renderWithProviders(
      <OrderDetailsLogistic
        handleClickLogisticOrder={handleClickLogisticOrder}
        navigation={{ goBack, canGoBack: () => true, navigate: jest.fn() }}
      />
    )
    fireEvent.press(getByTestId('floating-first'))
    expect(handleClickLogisticOrder).toHaveBeenCalledWith(2, 55, expect.objectContaining({ id: 101 }))
  })

  it('renders not found when order has an error', () => {
    const { getByText } = renderWithProviders(
      <OrderDetailsLogistic
        order={{ order: null, loading: false, error: ['Order missing'] }}
        navigation={{ navigate: jest.fn(), goBack: jest.fn(), canGoBack: () => false }}
      />
    )
    expect(getByText('Order missing')).toBeTruthy()
  })

  it('shows loading placeholders when order is empty', () => {
    const { getAllByTestId } = renderWithProviders(
      <OrderDetailsLogistic order={{ order: {}, loading: false, error: null }} />
    )
    expect(getAllByTestId('placeholder-line').length).toBeGreaterThan(0)
  })

  it('alerts driver when removed from order', () => {
    ;(useSession as jest.Mock).mockReturnValue([{ user: { id: 4, level: 4 } }, {}])
    const { getByText } = renderWithProviders(
      <OrderDetailsLogistic
        order={{
          order: { ...sampleOrder, driver: null, status: 0 },
          loading: false,
          error: null
        }}
      />
    )
    expect(getByText('You have been removed from the order')).toBeTruthy()
  })
})
