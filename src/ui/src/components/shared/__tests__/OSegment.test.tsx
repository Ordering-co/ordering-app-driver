import React from 'react'
import { fireEvent } from '@testing-library/react-native'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
const { iconSource, setupSharedComponentHooks } = require('../../../../../../jest/helpers/driverSharedTestSetup')
import OSegment from '../OSegment'

setupSharedComponentHooks()

describe('OSegment', () => {
  it('selects segment item on press', () => {
    const onSelectItem = jest.fn()
    const items = [
      { text: 'All', image: iconSource },
      { text: 'Open', image: iconSource }
    ]
    const { getByText } = renderWithProviders(
      <OSegment items={items} selectedIdx={0} onSelectItem={onSelectItem} />
    )
    fireEvent.press(getByText('Open'))
    expect(onSelectItem).toHaveBeenCalledWith(1)
  })
})
