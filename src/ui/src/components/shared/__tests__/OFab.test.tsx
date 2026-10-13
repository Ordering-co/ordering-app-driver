import React from 'react'
import { fireEvent } from '@testing-library/react-native'
import { TouchableOpacity } from 'react-native'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
const { iconSource, setupSharedComponentHooks } = require('../../../../../../jest/helpers/driverSharedTestSetup')
import OFab from '../OFab'

setupSharedComponentHooks()

describe('OFab', () => {
  it('handles press with ionicon', () => {
    const onPress = jest.fn()
    const { UNSAFE_getByType } = renderWithProviders(
      <OFab iconName="add" onPress={onPress} />
    )
    fireEvent.press(UNSAFE_getByType(TouchableOpacity))
    expect(onPress).toHaveBeenCalled()
  })

  it('renders material icon variant', () => {
    const onPress = jest.fn()
    const { UNSAFE_getByType } = renderWithProviders(
      <OFab iconName="printer" materialIcon onPress={onPress} />
    )
    fireEvent.press(UNSAFE_getByType(TouchableOpacity))
    expect(onPress).toHaveBeenCalled()
  })
})
