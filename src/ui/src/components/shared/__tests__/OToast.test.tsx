import React from 'react'
import { act } from '@testing-library/react-native'
import { ToastType, useToast } from '@components'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
const { iconSource, setupSharedComponentHooks } = require('../../../../../../jest/helpers/driverSharedTestSetup')
import { Toast } from '../OToast'

setupSharedComponentHooks()

describe('OToast', () => {
  it('renders success toast and hides after duration', () => {
    jest.useFakeTimers()
    const hideToast = jest.fn()
    ;(useToast as jest.Mock).mockReturnValue([
      { type: ToastType.Success, message: 'Saved', duration: 300 },
      { hideToast }
    ])

    const { getByText } = renderWithProviders(<Toast />)
    expect(getByText('Saved')).toBeTruthy()

    act(() => {
      jest.advanceTimersByTime(600)
    })

    expect(hideToast).toHaveBeenCalled()
  })

  it('returns null without toast config', () => {
    ;(useToast as jest.Mock).mockReturnValue([null, { hideToast: jest.fn() }])
    const { toJSON } = renderWithProviders(<Toast />)
    expect(toJSON()).toBeNull()
  })
})
