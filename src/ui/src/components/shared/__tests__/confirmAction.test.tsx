import React from 'react'
import { Alert } from 'react-native'
import { renderHook } from '@testing-library/react-native'
const { setupSharedComponentHooks } = require('../../../../../../jest/helpers/driverSharedTestSetup')
import { presentConfirm, useConfirm } from '../confirmAction'

setupSharedComponentHooks()

const buttons = () => (Alert.alert as jest.Mock).mock.calls[0][2]

describe('the app\'s confirmation', () => {
  it('asks in the system alert, accept first, and fires nothing until it is accepted', () => {
    const onAccept = jest.fn()
    const onCancel = jest.fn()
    presentConfirm({ title: 'Logout', message: 'Sure?', acceptText: 'Logout', cancelText: 'Cancel', onAccept, onCancel })
    expect(Alert.alert).toHaveBeenCalledWith('Logout', 'Sure?', expect.any(Array))
    expect(onAccept).not.toHaveBeenCalled()
    expect(buttons().map((button: any) => button.text)).toEqual(['Logout', 'Cancel'])
    buttons()[0].onPress()
    expect(onAccept).toHaveBeenCalledTimes(1)
    expect(onCancel).not.toHaveBeenCalled()
  })

  it('cancelling fires only the cancel', () => {
    const onAccept = jest.fn()
    const onCancel = jest.fn()
    presentConfirm({ acceptText: 'Delete', cancelText: 'Cancel', onAccept, onCancel })
    buttons()[1].onPress()
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onAccept).not.toHaveBeenCalled()
  })

  it('draws a destructive accept as the system\'s destructive button, and only then', () => {
    presentConfirm({ acceptText: 'Delete', cancelText: 'Cancel', destructive: true, onAccept: jest.fn() })
    presentConfirm({ acceptText: 'Continue', cancelText: 'Cancel', onAccept: jest.fn() })
    const calls = (Alert.alert as jest.Mock).mock.calls
    expect(calls[0][2][0].style).toBe('destructive')
    expect(calls[1][2][0].style).toBeUndefined()
  })

  describe('useConfirm', () => {
    it('titles the dialog with the app\'s name and cancels with "Cancel" unless told otherwise', () => {
      const { result } = renderHook(() => useConfirm())
      result.current({ message: 'Sure?', acceptText: 'Remove', onAccept: jest.fn() })
      expect(Alert.alert).toHaveBeenCalledWith('Ordering', 'Sure?', expect.any(Array))
      expect(buttons().map((button: any) => button.text)).toEqual(['Remove', 'Cancel'])
    })

    it('takes the call\'s own title and way out', () => {
      const { result } = renderHook(() => useConfirm())
      result.current({ title: 'Unsaved changes', acceptText: 'Discard', cancelText: 'Keep editing', onAccept: jest.fn() })
      expect(Alert.alert).toHaveBeenCalledWith('Unsaved changes', undefined, expect.any(Array))
      expect(buttons().map((button: any) => button.text)).toEqual(['Discard', 'Keep editing'])
    })
  })
})
