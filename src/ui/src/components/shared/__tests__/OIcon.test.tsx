import React from 'react'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
const { iconSource, setupSharedComponentHooks } = require('../../../../../../jest/helpers/driverSharedTestSetup')
import OIcon from '../OIcon'

setupSharedComponentHooks()

describe('OIcon', () => {
  it('renders with src and url sources', () => {
    const { rerender } = renderWithProviders(<OIcon src={iconSource} width={20} height={20} />)
    rerender(<OIcon url="https://example.com/icon.png" color="#000" cover />)
  })
})
