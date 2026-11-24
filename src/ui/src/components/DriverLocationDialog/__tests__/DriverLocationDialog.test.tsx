import React from 'react'
import { StyleSheet } from 'react-native'
import { fireEvent } from '@testing-library/react-native'

import { DriverLocationDialog } from '../index'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { defaultAppTheme } from '../../../../../theme/engine'

jest.mock('@components', () => require('../../../../../../jest/helpers/mockOrdering'))

const flat = (node: any) => StyleSheet.flatten(node.props.style)

describe('DriverLocationDialog', () => {
  it('says the location is off, in the modal\'s box, and offers the settings', () => {
    const modal = defaultAppTheme().native.components.modal
    const onOpenSettings = jest.fn()
    const onClose = jest.fn()
    const { getByTestId, getByText, getByRole } = renderWithProviders(
      <DriverLocationDialog kind='services_disabled' onClose={onClose} onOpenSettings={onOpenSettings} testID='location-dialog' />
    )
    expect(flat(getByTestId('location-dialog')).backgroundColor).toBe(modal.base.background)
    expect(getByText('Mobile location off')).toBeTruthy()
    expect(getByText('Enable location for tracking your orders')).toBeTruthy()
    fireEvent.press(getByRole('button', { name: 'Open Settings' }))
    expect(onOpenSettings).toHaveBeenCalledTimes(1)
    fireEvent.press(getByRole('button', { name: 'Cancel' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('says the permission is not enabled when it was lost', () => {
    const { getByText } = renderWithProviders(
      <DriverLocationDialog kind='authorization_changed' onClose={jest.fn()} onOpenSettings={jest.fn()} />
    )
    expect(getByText('Mobile location not enabled')).toBeTruthy()
  })

  it('shows nothing without a kind', () => {
    const { queryByText } = renderWithProviders(
      <DriverLocationDialog kind={null} onClose={jest.fn()} onOpenSettings={jest.fn()} />
    )
    expect(queryByText('Open Settings')).toBeNull()
  })
})
