import React from 'react'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
const { iconSource, setupSharedComponentHooks } = require('../../../../../../jest/helpers/driverSharedTestSetup')
import OTextarea from '../OTextarea'

setupSharedComponentHooks()

describe('OTextarea', () => {
  it('renders multiline input', () => {
    const { getByPlaceholderText } = renderWithProviders(
      <OTextarea placeholder="Notes" value="Hello" lines={4} />
    )
    expect(getByPlaceholderText('Notes')).toBeTruthy()
  })
})
