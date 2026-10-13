import React from 'react'
import { act, fireEvent, waitFor } from '@testing-library/react-native'
import { checkNotifications, openSettings } from 'react-native-permissions'

import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'

import { NotificationSetting } from '..'

describe('NotificationSetting', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(checkNotifications as jest.Mock).mockResolvedValue({ status: 'granted' })
  })

  it('closes popup when notifications are granted', async () => {
    const setCheckNotificationStatus = jest.fn()
    renderWithProviders(
      <NotificationSetting
        checkNotificationStatus={{ open: false, checked: false }}
        setCheckNotificationStatus={setCheckNotificationStatus}
      />
    )
    await waitFor(() => {
      expect(setCheckNotificationStatus).toHaveBeenCalledWith({
        open: false,
        checked: true
      })
    })
  })

  it('opens settings when notifications are blocked', async () => {
    ;(checkNotifications as jest.Mock).mockResolvedValue({ status: 'blocked' })
    const setCheckNotificationStatus = jest.fn()
    const { getAllByText } = renderWithProviders(
      <NotificationSetting
        checkNotificationStatus={{ open: true, checked: false }}
        setCheckNotificationStatus={setCheckNotificationStatus}
      />
    )
    await waitFor(() => {
      expect(setCheckNotificationStatus).toHaveBeenCalledWith({
        open: true,
        checked: false
      })
    })
    await act(async () => {
      fireEvent.press(getAllByText('Enable notifications')[1])
    })
    expect(openSettings).toHaveBeenCalled()
  })
})
