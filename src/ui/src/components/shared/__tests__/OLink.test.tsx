import React from 'react'
import { Alert } from 'react-native'
import { act, fireEvent } from '@testing-library/react-native'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
const { iconSource, setupSharedComponentHooks } = require('../../../../../../jest/helpers/driverSharedTestSetup')
import OLink from '../OLink'

setupSharedComponentHooks()

describe('OLink', () => {
  it('opens supported url on press', async () => {
    const { getByText } = renderWithProviders(
      <OLink url="https://example.com" shorcut="Visit site" />
    )
    await act(async () => {
      fireEvent.press(getByText('Visit site'))
    })
    expect(require('react-native').Linking.canOpenURL).toHaveBeenCalled()
  })

  it('shows alert when url is missing', async () => {
    const { getByText } = renderWithProviders(
      <OLink url={undefined} shorcut="Broken link" />
    )
    await act(async () => {
      fireEvent.press(getByText('Broken link'))
    })
    expect(Alert.alert).toHaveBeenCalled()
  })

  it('shows invalid phone alert for tel links', async () => {
    const { getByText } = renderWithProviders(
      <OLink url="tel:invalid" shorcut="Call" />
    )
    await act(async () => {
      fireEvent.press(getByText('Call'))
    })
    expect(Alert.alert).toHaveBeenCalled()
  })
})
