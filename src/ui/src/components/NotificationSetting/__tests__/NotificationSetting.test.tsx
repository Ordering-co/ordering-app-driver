import React from 'react'
import { StyleSheet } from 'react-native'
import { act, fireEvent, waitFor } from '@testing-library/react-native'
import { checkNotifications, openSettings } from 'react-native-permissions'

import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { buildAppTheme, THEME_PRODUCT_TYPE } from '../../../../../theme/engine'

import { NotificationSetting } from '..'
import { OBottomPopup } from '../../shared'

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

  it('is a sheet of the theme: the sheet pads its content (sides and bottom), its action the primary button', async () => {
    ;(checkNotifications as jest.Mock).mockResolvedValue({ status: 'blocked' })
    const custom = buildAppTheme({
      version: 2,
      product_type: THEME_PRODUCT_TYPE,
      values: { components: { sheet: { base: { padding: 30 } } }, tokens: { color: { primary: '#123456' } } }
    })
    const setCheckNotificationStatus = jest.fn()
    const { getByTestId, getByRole, UNSAFE_getByType } = renderWithProviders(
      <NotificationSetting
        checkNotificationStatus={{ open: true, checked: false }}
        setCheckNotificationStatus={setCheckNotificationStatus}
      />,
      { themeOverrides: custom }
    )
    await waitFor(() => expect(setCheckNotificationStatus).toHaveBeenCalled())
    // The padding is the sheet's own (decision H5), never the caller's.
    const sheet = UNSAFE_getByType(OBottomPopup)
    expect(sheet.props.padded).toBe(true)
    const padded = sheet.findAll((node: any) => typeof node.type === 'string' && StyleSheet.flatten(node.props.style)?.paddingHorizontal === 30)
    expect(padded.length).toBeGreaterThan(0)
    expect(StyleSheet.flatten(padded[padded.length - 1].props.style).paddingBottom).toBe(30)
    const body = StyleSheet.flatten(getByTestId('notification-setting-body').props.style)
    expect(body.paddingHorizontal).toBeUndefined()
    expect(body.paddingBottom).toBeUndefined()
    expect(body.gap).toBe(custom.native.tokens.space.lg)
    const button = getByRole('button', { name: 'Enable notifications' })
    expect(StyleSheet.flatten(button.children[0].props.style).backgroundColor)
      .toBe(custom.native.components.button.variants.primary.solid.background)
  })
})
