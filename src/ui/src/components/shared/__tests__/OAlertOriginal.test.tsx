import React from 'react'
import { Alert } from 'react-native'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
const { iconSource, setupSharedComponentHooks } = require('../../../../../../jest/helpers/driverSharedTestSetup')
import OAlertOriginal from '../OAlertOriginal'

setupSharedComponentHooks()

describe('OAlertOriginal', () => {
  it('shows alert when open', () => {
    renderWithProviders(
      <OAlertOriginal
        open
        title="Confirm"
        content={['INTERNAL_ERROR']}
        onClose={jest.fn()}
        onAccept={jest.fn()}
      />
    )
    expect(Alert.alert).toHaveBeenCalled()
  })

  it('does not present a dialog when there is nothing to say', () => {
    const onClose = jest.fn()
    renderWithProviders(
      <OAlertOriginal
        open
        title=""
        content={[]}
        onClose={onClose}
        onAccept={jest.fn()}
      />
    )
    expect(Alert.alert).not.toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  describe('what its buttons say', () => {
    const buttons = () => (Alert.alert as jest.Mock).mock.calls[0][2]

    it('keeps "Accept" and "Cancel", accept first, when the caller names nothing', () => {
      const onAccept = jest.fn()
      const onClose = jest.fn()
      renderWithProviders(<OAlertOriginal open title="Ordering" content={['Are you sure?']} onClose={onClose} onAccept={onAccept} />)
      expect(buttons()).toEqual([
        { text: 'Accept', onPress: onAccept },
        { text: 'Cancel', onPress: onClose }
      ])
    })

    it('names the accept button after the action and marks it destructive', () => {
      const onAccept = jest.fn()
      renderWithProviders(
        <OAlertOriginal open title="Ordering" content={['Are you sure?']} acceptText="Delete" destructive onClose={jest.fn()} onAccept={onAccept} />
      )
      expect(buttons()[0]).toEqual({ text: 'Delete', style: 'destructive', onPress: onAccept })
      expect(buttons()[1].text).toBe('Cancel')
    })

    it('lets the way out say what it does', () => {
      renderWithProviders(
        <OAlertOriginal open title="Ordering" content={['Discard?']} acceptText="Discard" cancelText="Keep editing" onClose={jest.fn()} onAccept={jest.fn()} />
      )
      expect(buttons().map((button: any) => button.text)).toEqual(['Discard', 'Keep editing'])
    })

    it('a notice has one button, named "Ok", that calls onAccept: no Cancel that also goes back', () => {
      const onAccept = jest.fn()
      const onClose = jest.fn()
      renderWithProviders(<OAlertOriginal open notice title="Warning" content={['Gone']} onClose={onClose} onAccept={onAccept} />)
      expect(buttons()).toEqual([{ text: 'Ok', onPress: onAccept }])
    })
  })
})
