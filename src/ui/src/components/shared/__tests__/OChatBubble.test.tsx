import React from 'react'
import { fireEvent } from '@testing-library/react-native'
import { TouchableOpacity } from 'react-native'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
const { iconSource, setupSharedComponentHooks } = require('../../../../../../jest/helpers/driverSharedTestSetup')
import OChatBubble from '../OChatBubble'
import { DIRECTION } from '../../../config/constants'

setupSharedComponentHooks()

describe('OChatBubble', () => {
  it('renders right-side bubble with contents', () => {
    const { getByText } = renderWithProviders(
      <OChatBubble side={DIRECTION.RIGHT} contents="Hello" datetime="12:00" />
    )
    expect(getByText('Hello')).toBeTruthy()
    expect(getByText('12:00')).toBeTruthy()
  })

  it('renders image bubble with click handler', () => {
    const onClick = jest.fn()
    const { UNSAFE_getByType } = renderWithProviders(
      <OChatBubble image="https://example.com/img.png" onClick={onClick} />
    )
    fireEvent.press(UNSAFE_getByType(TouchableOpacity))
    expect(onClick).toHaveBeenCalled()
  })
})
