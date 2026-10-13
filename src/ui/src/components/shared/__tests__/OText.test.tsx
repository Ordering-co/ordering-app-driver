import React from 'react'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
const { iconSource, setupSharedComponentHooks } = require('../../../../../../jest/helpers/driverSharedTestSetup')
import OText from '../OText'

setupSharedComponentHooks()

describe('OText', () => {
  it('renders children with size and weight', () => {
    const { getByText } = renderWithProviders(
      <>
        <OText>Body text</OText>
        <OText size={18} weight="700">Title</OText>
      </>
    )
    expect(getByText('Body text')).toBeTruthy()
    expect(getByText('Title')).toBeTruthy()
  })
})
