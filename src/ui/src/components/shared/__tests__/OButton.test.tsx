import React from 'react'
import { fireEvent } from '@testing-library/react-native'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
const { iconSource, setupSharedComponentHooks } = require('../../../../../../jest/helpers/driverSharedTestSetup')
import OButton from '../OButton'

setupSharedComponentHooks()

describe('OButton', () => {
  it('renders and handles press', () => {
    const onClick = jest.fn()
    const { getByText } = renderWithProviders(
      <OButton text="Continue" testID="continue-btn" onClick={onClick} />
    )
    fireEvent.press(getByText('Continue'))
    expect(onClick).toHaveBeenCalled()
  })

  it('renders disabled and loading states', () => {
    const { getByText } = renderWithProviders(
      <>
        <OButton text="Disabled" disabled />
        <OButton text="Loading" loading class="secondary" />
      </>
    )
    expect(getByText('Disabled')).toBeTruthy()
    expect(getByText('Loading')).toBeTruthy()
  })

  it.each(['primary', 'secondary', 'third', 'fourth', 'active', 'mandatory', 'alert'] as const)(
    'renders class %s',
    (buttonClass) => {
      const { getByText } = renderWithProviders(
        <OButton text={buttonClass} class={buttonClass} />
      )
      expect(getByText(buttonClass)).toBeTruthy()
    }
  )
})
