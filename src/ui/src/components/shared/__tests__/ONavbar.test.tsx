import React from 'react'
import { fireEvent } from '@testing-library/react-native'
import { TouchableOpacity } from 'react-native'

jest.mock('@ui', () => {
  const OText = require('@/ui/src/components/shared/OText').default
  const OIconButton = require('@/ui/src/components/shared/OIconButton').default
  return { OText, OIconButton }
})

import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
const { iconSource, setupSharedComponentHooks } = require('../../../../../../jest/helpers/driverSharedTestSetup')
import ONavbar from '../ONavbar'

setupSharedComponentHooks()

describe('ONavbar', () => {
  it('renders title and back action', () => {
    const onBack = jest.fn()
    const { getByText, UNSAFE_getAllByType } = renderWithProviders(
      <ONavbar title="Orders" onBack={onBack} />
    )
    expect(getByText('Orders')).toBeTruthy()
    fireEvent.press(UNSAFE_getAllByType(TouchableOpacity)[0])
    expect(onBack).toHaveBeenCalled()
  })
})
