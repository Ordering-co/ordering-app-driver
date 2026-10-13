import React from 'react'
import { fireEvent } from '@testing-library/react-native'

import { renderPage } from '../../../jest/helpers/renderPage'

jest.mock('@ui', () => require('../../../jest/helpers/mockUi'))

import Home from '../Home'

describe('Home', () => {
  it('renders home page and navigates on redirect', () => {
    const { getByTestId, navigation } = renderPage(Home)
    expect(getByTestId('home-page')).toBeTruthy()
    fireEvent.press(getByTestId('home-nav'))
    expect(navigation.navigate).toHaveBeenCalledWith('Login', undefined)
  })

  it('ignores empty navigation redirect', () => {
    const { getByTestId, navigation } = renderPage(Home)
    fireEvent.press(getByTestId('home-nav-empty'))
    expect(navigation.navigate).not.toHaveBeenCalled()
  })
})
