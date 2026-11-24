import React from 'react'
import { Platform, Text } from 'react-native'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
const { iconSource, setupSharedComponentHooks } = require('../../../../../../jest/helpers/driverSharedTestSetup')
import OModal from '../OModal'

setupSharedComponentHooks()

describe('OModal', () => {
  it('renders title, subtitle, and children', () => {
    const onClose = jest.fn()
    const { getByText } = renderWithProviders(
      <OModal open title="Modal title" subtitle="Subtitle" onClose={onClose}>
        <Text>Modal body</Text>
      </OModal>
    )
    expect(getByText('Modal title')).toBeTruthy()
    expect(getByText('Modal body')).toBeTruthy()
  })

  it('renders on ios and android', () => {
    Platform.OS = 'ios'
    const { getByText: getIos } = renderWithProviders(
      <OModal open title="iOS modal" onClose={jest.fn()} />
    )
    expect(getIos('iOS modal')).toBeTruthy()

    Platform.OS = 'android'
    const { getByText: getAndroid } = renderWithProviders(
      <OModal open title="Android modal" onClose={jest.fn()} isTransparent />
    )
    expect(getAndroid('Android modal')).toBeTruthy()
  })
})
