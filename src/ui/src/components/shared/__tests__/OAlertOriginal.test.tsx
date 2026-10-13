import React from 'react'
import { Alert } from 'react-native'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
const { iconSource, setupSharedComponentHooks } = require('../../../../../../jest/helpers/driverSharedTestSetup')
import OAlertOriginal from '../OAlertOriginal'

setupSharedComponentHooks()

describe('OAlertOriginal', () => {
  it('shows alert when open', () => {
    renderWithProviders(
      <OAlertOriginal
        open
        title="Confirm"
        content={['INTERNAL_ERROR']}
        onClose={jest.fn()}
        onAccept={jest.fn()}
      />
    )
    expect(Alert.alert).toHaveBeenCalled()
  })

  it('does not present a dialog when there is nothing to say', () => {
    const onClose = jest.fn()
    renderWithProviders(
      <OAlertOriginal
        open
        title=""
        content={[]}
        onClose={onClose}
        onAccept={jest.fn()}
      />
    )
    expect(Alert.alert).not.toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })
})
