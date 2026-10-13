import React from 'react'
import { fireEvent } from '@testing-library/react-native'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
const { iconSource, setupSharedComponentHooks } = require('../../../../../../jest/helpers/driverSharedTestSetup')
import ODropDown from '../ODropDown'

setupSharedComponentHooks()

describe('ODropDown', () => {
  const options = [
    { value: 'a', name: 'Option A' },
    { value: 'b', name: 'Option B' }
  ]

  it('opens list and selects an option', () => {
    const onSelect = jest.fn()
    const { getByText } = renderWithProviders(
      <ODropDown options={options} defaultValue="a" placeholder="Pick one" onSelect={onSelect} />
    )
    fireEvent.press(getByText('Option A'))
    fireEvent.press(getByText('Option B'))
    expect(onSelect).toHaveBeenCalledWith('Option B')
  })

  it('renders secondary style', () => {
    const { getByText } = renderWithProviders(
      <ODropDown secondary options={options} defaultValue="a" placeholder="Pick one" />
    )
    expect(getByText('Option A')).toBeTruthy()
  })
})
