import React from 'react'
import { fireEvent } from '@testing-library/react-native'

import { useSession } from '@components'
import { renderPage } from '../../../jest/helpers/renderPage'

jest.mock('@ui', () => require('../../../jest/helpers/mockUi'))

import NotFound from '../NotFound'

describe('NotFound', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useSession as jest.Mock).mockReturnValue([
      { auth: true },
      {}
    ])
  })

  it('navigates authed users to business list', () => {
    const { getByTestId, navigation } = renderPage(NotFound)
    expect(getByTestId('not-found-content').props.children).toBe('Page not found')
    expect(getByTestId('floating-button-text').props.children).toBe('Go to business list')
    fireEvent.press(getByTestId('floating-button'))
    expect(navigation.navigate).toHaveBeenCalledWith('BusinessList')
  })

  it('navigates guests to home', () => {
    ;(useSession as jest.Mock).mockReturnValue([
      { auth: false },
      {}
    ])
    const { getByTestId, navigation } = renderPage(NotFound)
    expect(getByTestId('floating-button-text').props.children).toBe('Go to homepage')
    fireEvent.press(getByTestId('floating-button'))
    expect(navigation.navigate).toHaveBeenCalledWith('Home')
  })
})
