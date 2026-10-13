import React from 'react'
import { fireEvent } from '@testing-library/react-native'
import { openSettings } from 'react-native-permissions'

import { mockPermissions } from '../../../jest/helpers/mockPermissionsContext'
import { renderPage } from '../../../jest/helpers/renderPage'

jest.mock('@ui', () => require('../../../jest/helpers/mockUi'))
jest.mock('../../context/PermissionsContext', () =>
  require('../../../jest/helpers/mockPermissionsContext')
)

import RequestPermissions from '../RequestPermissions'

describe('RequestPermissions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockPermissions.isGrantedPermissions = false
  })

  it('renders permissions error content', () => {
    const { getByTestId } = renderPage(RequestPermissions)
    expect(getByTestId('not-found-source')).toBeTruthy()
    expect(getByTestId('floating-button-text').props.children).toBe('Go to settings')
  })

  it('opens device settings from floating button', () => {
    const { getByTestId } = renderPage(RequestPermissions)
    fireEvent.press(getByTestId('floating-button'))
    expect(openSettings).toHaveBeenCalled()
  })

  it('goes back when permissions are already granted', () => {
    mockPermissions.isGrantedPermissions = true
    const { navigation } = renderPage(RequestPermissions)
    expect(navigation.goBack).toHaveBeenCalled()
  })
})
