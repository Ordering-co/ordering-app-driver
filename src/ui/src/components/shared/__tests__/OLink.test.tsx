import React from 'react'
import { Alert, Linking } from 'react-native'
import { act, fireEvent } from '@testing-library/react-native'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
const { iconSource, setupSharedComponentHooks } = require('../../../../../../jest/helpers/driverSharedTestSetup')
const { captureDialogs } = require('../../../../../../jest/helpers/confirmDialogs')
import OLink from '../OLink'

setupSharedComponentHooks()

describe('OLink', () => {
  it('opens supported url on press', async () => {
    const { getByText } = renderWithProviders(
      <OLink url="https://example.com" shorcut="Visit site" />
    )
    await act(async () => {
      fireEvent.press(getByText('Visit site'))
    })
    expect(require('react-native').Linking.canOpenURL).toHaveBeenCalled()
  })

  it('shows alert when url is missing', async () => {
    const { getByText } = renderWithProviders(
      <OLink url={undefined} shorcut="Broken link" />
    )
    await act(async () => {
      fireEvent.press(getByText('Broken link'))
    })
    expect(Alert.alert).toHaveBeenCalled()
  })

  it('shows invalid phone alert for tel links', async () => {
    const { getByText } = renderWithProviders(
      <OLink url="tel:invalid" shorcut="Call" />
    )
    await act(async () => {
      fireEvent.press(getByText('Call'))
    })
    expect(Alert.alert).toHaveBeenCalled()
  })

  it('says a link cannot be opened in the app\'s dialog, a notice with one button (never the system alert)', async () => {
    const dialogs = captureDialogs()
    ;(Alert.alert as jest.Mock).mockClear()
    const { getByText } = renderWithProviders(<OLink url={undefined} shorcut="Broken link" />)
    await act(async () => { fireEvent.press(getByText('Broken link')) })
    expect(Alert.alert).not.toHaveBeenCalled()
    expect(dialogs.last()).toEqual(expect.objectContaining({
      title: 'Error opening the link',
      message: 'Link could not be opened or is not supported',
      notice: true,
      acceptText: 'Ok'
    }))
    const tel = renderWithProviders(<OLink url="tel:invalid" shorcut="Call" />)
    await act(async () => { fireEvent.press(tel.getByText('Call')) })
    expect(dialogs.last()).toEqual(expect.objectContaining({ message: 'Invalid number', notice: true }))
    dialogs.off()
  })

  it.each(['tel:+16465550129', 'mailto:ana@example.com'])('opens %s even when canOpenURL answers false (Android 11+ does for a scheme the manifest does not declare)', async (url) => {
    const canOpen = jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(false)
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true)
    const { getByText } = renderWithProviders(<OLink url={url} shorcut='Open' />)
    await act(async () => { fireEvent.press(getByText('Open')) })
    expect(openURL).toHaveBeenCalledWith(url)
    expect(canOpen).not.toHaveBeenCalled()
    jest.restoreAllMocks()
  })

  it('still asks first for any other scheme, and says it cannot be opened when the answer is false', async () => {
    const dialogs = captureDialogs()
    jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(false)
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true)
    const { getByText } = renderWithProviders(<OLink url='waze://?ll=1,2' shorcut='Open' />)
    await act(async () => { fireEvent.press(getByText('Open')) })
    expect(openURL).not.toHaveBeenCalled()
    expect(dialogs.last()).toEqual(expect.objectContaining({ message: 'Link could not be opened or is not supported' }))
    dialogs.off()
    jest.restoreAllMocks()
  })
})
