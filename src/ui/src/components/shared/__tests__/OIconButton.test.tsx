import React from 'react'
import { fireEvent } from '@testing-library/react-native'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
const { iconSource, setupSharedComponentHooks } = require('../../../../../../jest/helpers/driverSharedTestSetup')
import OIconButton from '../OIconButton'

setupSharedComponentHooks()

describe('OIconButton', () => {
  it('handles press when enabled', () => {
    const onClick = jest.fn()
    const { getByText } = renderWithProviders(
      <OIconButton title="Share" icon={iconSource} onClick={onClick} color="#000" />
    )
    fireEvent.press(getByText('Share'))
    expect(onClick).toHaveBeenCalled()
  })

  it('renders disabled state', () => {
    const { getByText } = renderWithProviders(
      <OIconButton title="Off" disabled icon={iconSource} />
    )
    expect(getByText('Off')).toBeTruthy()
  })
})
