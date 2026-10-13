import React from 'react'
import { fireEvent } from '@testing-library/react-native'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
const { iconSource, setupSharedComponentHooks } = require('../../../../../../jest/helpers/driverSharedTestSetup')
import OInput from '../OInput'

setupSharedComponentHooks()

describe('OInput', () => {
  it('handles change, focus, and blur', () => {
    const onChange = jest.fn()
    const onFocus = jest.fn()
    const onBlur = jest.fn()
    const { getByPlaceholderText } = renderWithProviders(
      <OInput
        placeholder="Email"
        name="email"
        icon={iconSource}
        onChange={onChange}
        onFocus={onFocus}
        onBlur={onBlur}
      />
    )
    const input = getByPlaceholderText('Email')
    fireEvent(input, 'focus')
    fireEvent.changeText(input, 'test@example.com')
    fireEvent(input, 'blur')
    expect(onFocus).toHaveBeenCalled()
    expect(onChange).toHaveBeenCalled()
    expect(onBlur).toHaveBeenCalled()
  })
})
