import React from 'react'
import { fireEvent } from '@testing-library/react-native'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
const { iconSource, setupSharedComponentHooks } = require('../../../../../../jest/helpers/driverSharedTestSetup')
import OFab from '../OFab'

setupSharedComponentHooks()

describe('OFab', () => {
  it('handles press with ionicon', () => {
    const onPress = jest.fn()
    const { getByRole } = renderWithProviders(
      <OFab iconName="add" onPress={onPress} />
    )
    fireEvent.press(getByRole('button'))
    expect(onPress).toHaveBeenCalled()
  })

  it('renders material icon variant', () => {
    const onPress = jest.fn()
    const { getByRole } = renderWithProviders(
      <OFab iconName="printer" materialIcon onPress={onPress} />
    )
    fireEvent.press(getByRole('button'))
    expect(onPress).toHaveBeenCalled()
  })
})
