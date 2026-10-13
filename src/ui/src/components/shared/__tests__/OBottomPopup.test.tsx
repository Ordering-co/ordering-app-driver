import React from 'react'
import { Text } from 'react-native'
import { fireEvent } from '@testing-library/react-native'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
const { setupSharedComponentHooks } = require('../../../../../../jest/helpers/driverSharedTestSetup')
import OBottomPopup from '../OBottomPopup'

setupSharedComponentHooks()

describe('OBottomPopup', () => {
  it('renders when open with title', () => {
    const onClose = jest.fn()
    const { getByText } = renderWithProviders(
      <OBottomPopup open containerStyle={{}} title="Popup" onClose={onClose}>
        <Text>Popup content</Text>
      </OBottomPopup>
    )
    expect(getByText('Popup')).toBeTruthy()
    expect(getByText('Popup content')).toBeTruthy()
  })

  it('calls onClose from modal request close', () => {
    const onClose = jest.fn()
    const { UNSAFE_getByType } = renderWithProviders(
      <OBottomPopup open containerStyle={{}} title="Popup" onClose={onClose}>
        <Text>body</Text>
      </OBottomPopup>
    )
    const { Modal } = require('react-native')
    fireEvent(UNSAFE_getByType(Modal), 'requestClose')
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onClose when tapping outside', () => {
    const onClose = jest.fn()
    const { UNSAFE_getAllByType } = renderWithProviders(
      <OBottomPopup open containerStyle={{}} title="Popup" onClose={onClose}>
        <Text>body</Text>
      </OBottomPopup>
    )
    const { TouchableWithoutFeedback } = require('react-native')
    fireEvent.press(UNSAFE_getAllByType(TouchableWithoutFeedback)[0])
    expect(onClose).toHaveBeenCalled()
  })
})
