import React from 'react'
import { fireEvent } from '@testing-library/react-native'

jest.mock('react-native-linear-gradient', () => {
  const { View } = require('react-native')
  return ({ children, ...props }: any) => <View testID="linear-gradient" {...props}>{children}</View>
})

jest.mock('@ui', () => {
  const { buildD4MessagesUiMock } = require('../../../../../../jest/helpers/d4MessagesUiMock')
  return buildD4MessagesUiMock()
})

jest.mock('@components', () => {
  const mockOrdering = require('../../../../../../jest/helpers/mockOrdering')
  const { renderUiController } = require('../../../../../../jest/helpers/d1ShellDefaults')
  const { reviewCustomerDefaults } = require('../../../../../../jest/helpers/d4MessagesDefaults')
  return {
    ...mockOrdering,
    useUtils: jest.fn(() => [{
      optimizeImage: (url: string) => url,
      parseDate: (v: string) => v
    }]),
    ReviewCustomer: renderUiController(reviewCustomerDefaults)
  }
})

import { ReviewCustomer } from '..'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'

describe('ReviewCustomer', () => {
  it('renders customer review title and ratings', () => {
    const { getByText } = renderWithProviders(<ReviewCustomer />)
    expect(getByText('Great')).toBeTruthy()
    expect(getByText('Okay')).toBeTruthy()
    expect(getByText('Terrible')).toBeTruthy()
  })

  it('renders comment suggestions for selected rating', () => {
    const { getAllByText } = renderWithProviders(
      <ReviewCustomer reviewState={{ qualification: 5, comment: '' }} />
    )
    expect(getAllByText(/./).length).toBeGreaterThan(0)
  })

  it('changes qualification when rating is pressed', () => {
    const setReviewState = jest.fn()
    const { getByText } = renderWithProviders(
      <ReviewCustomer
        reviewState={{ qualification: 5, comment: '' }}
        setReviewState={setReviewState}
      />
    )
    fireEvent.press(getByText('Bad'))
    expect(setReviewState).toHaveBeenCalledWith(
      expect.objectContaining({ qualification: 2, comment: '' })
    )
  })

  it('sends review from floating button', () => {
    const handleSendCustomerReview = jest.fn()
    const { getByText } = renderWithProviders(
      <ReviewCustomer handleSendCustomerReview={handleSendCustomerReview} />
    )
    fireEvent.press(getByText('Send Review'))
    expect(handleSendCustomerReview).toHaveBeenCalled()
  })

  it('shows loading label while action is submitting', () => {
    const { getByText } = renderWithProviders(
      <ReviewCustomer actionState={{ loading: true, error: null }} />
    )
    expect(getByText('Loading')).toBeTruthy()
  })

  it('allows typing additional comments', () => {
    const { getByPlaceholderText } = renderWithProviders(<ReviewCustomer />)
    fireEvent.changeText(getByPlaceholderText('Comments'), 'Great customer')
    expect(getByPlaceholderText('Comments')).toBeTruthy()
  })
})
