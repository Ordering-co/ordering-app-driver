import React from 'react'
import { fireEvent } from '@testing-library/react-native'

import { renderPage } from '../../../jest/helpers/renderPage'

jest.mock('@ui', () => require('../../../jest/helpers/mockUi'))

import Messages from '../Messages'

describe('Messages', () => {
  it('renders messages option inside safe area layout', () => {
    const { getByTestId } = renderPage(Messages)
    expect(getByTestId('messages-option')).toBeTruthy()
    expect(getByTestId('safe-area-layout')).toBeTruthy()
  })

  it('navigates on redirect and skips empty page', () => {
    const { getByTestId, navigation } = renderPage(Messages)
    fireEvent.press(getByTestId('messages-option-nav'))
    expect(navigation.navigate).toHaveBeenCalledWith('OrderMessage', { orderId: 1 })
    fireEvent.press(getByTestId('messages-option-nav-empty'))
    expect(navigation.navigate).toHaveBeenCalledTimes(1)
  })
})
