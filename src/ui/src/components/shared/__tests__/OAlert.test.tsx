import React from 'react'
import { Alert, Text } from 'react-native'
import { fireEvent } from '@testing-library/react-native'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
const { iconSource, setupSharedComponentHooks } = require('../../../../../../jest/helpers/driverSharedTestSetup')
import OAlert from '../OAlert'

setupSharedComponentHooks()

describe('OAlert', () => {
  it('shows native alert on press', () => {
    const onAccept = jest.fn()
    const { getByText } = renderWithProviders(
      <OAlert title="Delete?" message="Sure?" onAccept={onAccept}>
        <Text>Delete</Text>
      </OAlert>
    )
    fireEvent.press(getByText('Delete'))
    expect(Alert.alert).toHaveBeenCalled()
  })
})
