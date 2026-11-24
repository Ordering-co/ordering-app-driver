import React from 'react'
import { Linking } from 'react-native'
import { act, render } from '@testing-library/react-native'

jest.mock('@components', () => ({
  useLanguage: () => [{}, (_key: string, fallback?: string) => fallback ?? _key]
}))

import { useOpenContact } from '../useOpenContact'
const { captureDialogs } = require('../../../../../jest/helpers/confirmDialogs')

let open: ReturnType<typeof useOpenContact>
const Probe = () => { open = useOpenContact(); return null }

describe('useOpenContact (a phone, an e-mail or a maps link)', () => {
  let canOpen: jest.SpyInstance
  let openURL: jest.SpyInstance
  let dialogs: ReturnType<typeof captureDialogs>

  beforeEach(() => {
    // Android 11+ answers `false` for a scheme the manifest does not declare, although the phone has an app for it.
    canOpen = jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(false)
    openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true)
    dialogs = captureDialogs()
    render(<Probe />)
  })

  afterEach(() => {
    dialogs.off()
    jest.restoreAllMocks()
  })

  it.each(['tel:+16465550129', 'sms:+16465550129', 'mailto:ana@example.com', 'TEL:+16465550129'])(
    'opens %s without asking canOpenURL, even when it would answer false',
    async (url) => {
      await act(async () => { await open(url) })
      expect(canOpen).not.toHaveBeenCalled()
      expect(openURL).toHaveBeenCalledWith(url)
      expect(dialogs.requests).toHaveLength(0)
    }
  )

  it('says so in the app\'s dialog when the system refuses a phone link (no app, no SIM)', async () => {
    openURL.mockRejectedValueOnce(new Error('Unable to open URL'))
    await act(async () => { await open('tel:+16465550129') })
    expect(dialogs.requests).toHaveLength(1)
    expect(dialogs.last()).toEqual(expect.objectContaining({
      title: 'Error opening the link',
      message: 'Link could not be opened or is not supported',
      notice: true
    }))
  })

  it('dials nothing and says "Invalid number" for a number that cannot be dialled', async () => {
    await act(async () => { await open('tel:invalid') })
    expect(openURL).not.toHaveBeenCalled()
    expect(dialogs.last()).toEqual(expect.objectContaining({ message: 'Invalid number', notice: true }))
  })

  it('keeps asking first for any other scheme: a maps app that is not there is told, not tried', async () => {
    await act(async () => { await open('waze://?ll=40.7,-74.0&navigate=yes') })
    expect(canOpen).toHaveBeenCalledWith('waze://?ll=40.7,-74.0&navigate=yes')
    expect(openURL).not.toHaveBeenCalled()
    expect(dialogs.last()).toEqual(expect.objectContaining({ message: 'Link could not be opened or is not supported' }))
  })

  it('opens a link of another scheme once canOpenURL says it can', async () => {
    canOpen.mockResolvedValueOnce(true)
    await act(async () => { await open('https://www.google.com/maps/dir/?api=1') })
    expect(openURL).toHaveBeenCalledWith('https://www.google.com/maps/dir/?api=1')
    expect(dialogs.requests).toHaveLength(0)
  })

  it('tells the driver when a gated link is accepted by canOpenURL and then refused by openURL', async () => {
    canOpen.mockResolvedValueOnce(true)
    openURL.mockRejectedValueOnce(new Error('no'))
    await act(async () => { await open('https://example.com') })
    expect(dialogs.requests).toHaveLength(1)
  })
})
