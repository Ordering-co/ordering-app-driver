import React from 'react'
import { fireEvent } from '@testing-library/react-native'

jest.mock('toggle-switch-react-native', () => {
  const React = require('react')
  const { Pressable, Text } = require('react-native')
  return (props: any) =>
    React.createElement(
      Pressable,
      {
        testID: 'toggle-switch',
        onPress: () => props.onToggle?.(!props.isOn)
      },
      React.createElement(Text, null, props.isOn ? 'on' : 'off')
    )
})

jest.mock('@components', () => {
  const mockOrdering = require('../../../../../../jest/helpers/mockOrdering')
  const { renderUiController } = require('../../../../../../jest/helpers/d1ShellDefaults')
  const { businessControllerDefaults } = require('../../../../../../jest/helpers/d5StoresDefaults')
  return {
    ...mockOrdering,
    ToastType: { Info: 'info', Success: 'success', Warning: 'warning', Error: 'error' },
    useUtils: jest.fn(() => [{
      optimizeImage: (url: string) => url
    }]),
    BusinessController: renderUiController(businessControllerDefaults)
  }
})

import { BusinessController } from '..'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { sampleBusiness } from '../../../../../../jest/helpers/d5StoresDefaults'

describe('BusinessController', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders business name address and zipcode', () => {
    const { getByText } = renderWithProviders(<BusinessController />)
    expect(getByText('Store A')).toBeTruthy()
    expect(getByText('123 Main St')).toBeTruthy()
    expect(getByText('10001')).toBeTruthy()
  })

  it('navigates to product listing on press', () => {
    const navigation = {
      navigate: jest.fn(),
      goBack: jest.fn(),
      canGoBack: jest.fn(() => true)
    }
    const { getByText } = renderWithProviders(
      <BusinessController navigation={navigation} />
    )
    fireEvent.press(getByText('Store A'))
    expect(navigation.navigate).toHaveBeenCalledWith('BusinessProductListing', {
      slug: 'store-a'
    })
  })

  it('toggles business enabled state', () => {
    const updateBusiness = jest.fn()
    const setIsUpdateStore = jest.fn()
    const { getByTestId } = renderWithProviders(
      <BusinessController
        updateBusiness={updateBusiness}
        setIsUpdateStore={setIsUpdateStore}
      />
    )
    fireEvent.press(getByTestId('toggle-switch'))
    expect(setIsUpdateStore).toHaveBeenCalledWith(true)
    expect(updateBusiness).toHaveBeenCalledWith(1, { enabled: false })
  })

  it('renders nothing without business', () => {
    const { queryByText } = renderWithProviders(
      <BusinessController
        businessState={{ loading: false, business: null, error: null }}
      />
    )
    expect(queryByText('Store A')).toBeNull()
  })

  it('shows loading indicator while updating store', () => {
    const { queryByTestId } = renderWithProviders(
      <BusinessController
        isUpdateStore
        businessState={{
          loading: true,
          business: sampleBusiness,
          error: null
        }}
      />
    )
    expect(queryByTestId('toggle-switch')).toBeNull()
  })
})
