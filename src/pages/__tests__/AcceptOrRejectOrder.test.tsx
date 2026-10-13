import React from 'react'
import { act, fireEvent } from '@testing-library/react-native'

import { renderPage } from '../../../jest/helpers/renderPage'

jest.mock('@ui', () => require('../../../jest/helpers/mockUi'))

import AcceptOrRejectOrder from '../AcceptOrRejectOrder'

describe('AcceptOrRejectOrder', () => {
  it('renders accept/reject controller with route params', () => {
    const { getByTestId } = renderPage(AcceptOrRejectOrder, {
      route: {
        params: {
          action: 'accept',
          ids: [1, 2],
          order: { customer: { cellphone: '5551234' } },
          handleChangeOrderStatus: jest.fn()
        }
      }
    })
    expect(getByTestId('accept-or-reject-order')).toBeTruthy()
    expect(getByTestId('safe-area-container')).toBeTruthy()
  })

  it('goes back after successful status update', async () => {
    const handleChangeOrderStatus = jest.fn().mockResolvedValue([1, 2])
    const { getByTestId, navigation } = renderPage(AcceptOrRejectOrder, {
      route: {
        params: {
          ids: [1, 2],
          handleChangeOrderStatus
        }
      }
    })
    await act(async () => {
      fireEvent.press(getByTestId('accept-reject-update'))
    })
    expect(handleChangeOrderStatus).toHaveBeenCalledWith('accept', [1, 2], { time: 15 })
    expect(navigation.goBack).toHaveBeenCalled()
  })

  it('closes modal via navigation goBack', () => {
    const { getByTestId, navigation } = renderPage(AcceptOrRejectOrder, {
      route: { params: { ids: [1] } }
    })
    fireEvent.press(getByTestId('accept-reject-close'))
    expect(navigation.goBack).toHaveBeenCalled()
  })
})
