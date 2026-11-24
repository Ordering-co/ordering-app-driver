import { Alert, NativeModules, Platform } from 'react-native'
import { openSettings } from 'react-native-permissions'

const { captureDialogs } = require('../../../jest/helpers/confirmDialogs')
import { isTemporaryBannerStyle, showPersistentNotificationsAlert, warnIfTemporaryBanners } from '../notificationBannerStyle'

const t = (_key: string, fallback: string) => fallback

const nativeModules = NativeModules as any

describe('notificationBannerStyle', () => {
  let getAlertStyle: jest.Mock
  let alert: jest.SpyInstance
  let dialogs: ReturnType<typeof captureDialogs>

  const platform = (os: 'ios' | 'android') => jest.replaceProperty(Platform, 'OS', os)

  beforeEach(() => {
    getAlertStyle = jest.fn(async () => 'persistent')
    nativeModules.NotificationSettings = { getAlertStyle }
    alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {})
    dialogs = captureDialogs()
    jest.spyOn(console, 'log').mockImplementation(() => {})
    platform('ios')
  })

  afterEach(() => {
    dialogs.off()
    delete nativeModules.NotificationSettings
    jest.restoreAllMocks()
  })

  describe('isTemporaryBannerStyle', () => {
    it('is true on iOS when the style is temporary', async () => {
      getAlertStyle.mockResolvedValue('temporary')
      await expect(isTemporaryBannerStyle()).resolves.toBe(true)
    })

    it.each(['persistent', 'none', 'unknown', undefined])('is false on iOS when the style is %s', async (style) => {
      getAlertStyle.mockResolvedValue(style)
      await expect(isTemporaryBannerStyle()).resolves.toBe(false)
    })

    it('asks the module every time: the driver may have changed it in Settings', async () => {
      getAlertStyle.mockResolvedValueOnce('temporary').mockResolvedValueOnce('persistent')
      await expect(isTemporaryBannerStyle()).resolves.toBe(true)
      await expect(isTemporaryBannerStyle()).resolves.toBe(false)
      expect(getAlertStyle).toHaveBeenCalledTimes(2)
    })

    it('is false on Android, without asking the module', async () => {
      platform('android')
      getAlertStyle.mockResolvedValue('temporary')
      await expect(isTemporaryBannerStyle()).resolves.toBe(false)
      expect(getAlertStyle).not.toHaveBeenCalled()
    })

    it('is false on an iOS without the native module', async () => {
      delete nativeModules.NotificationSettings
      await expect(isTemporaryBannerStyle()).resolves.toBe(false)
    })

    it('is false when the module fails', async () => {
      getAlertStyle.mockRejectedValue(new Error('boom'))
      await expect(isTemporaryBannerStyle()).resolves.toBe(false)
    })
  })

  describe('warnIfTemporaryBanners', () => {
    it('shows the alert and answers true while the style is temporary', async () => {
      getAlertStyle.mockResolvedValue('temporary')
      await expect(warnIfTemporaryBanners(t)).resolves.toBe(true)
      expect(dialogs.requests).toHaveLength(1)
      expect(dialogs.requests[0].title).toBe('Enable persistent notifications')
    })

    it('shows nothing and answers false when the style is persistent', async () => {
      await expect(warnIfTemporaryBanners(t)).resolves.toBe(false)
      expect(dialogs.requests).toHaveLength(0)
    })

    it('shows nothing on Android', async () => {
      platform('android')
      getAlertStyle.mockResolvedValue('temporary')
      await expect(warnIfTemporaryBanners(t)).resolves.toBe(false)
      expect(dialogs.requests).toHaveLength(0)
    })
  })

  describe('showPersistentNotificationsAlert', () => {
    it('asks in the app\'s dialog (never the system alert): Go to settings, which opens the system settings, and Later', () => {
      showPersistentNotificationsAlert(t)
      expect(alert).not.toHaveBeenCalled()
      const request = dialogs.last()
      expect(request.title).toBe('Enable persistent notifications')
      expect(request.message).toContain('Persistent')
      expect([request.acceptText, request.cancelText]).toEqual(['Go to settings', 'Later'])
      expect(request.notice).toBeUndefined()
      expect(openSettings).not.toHaveBeenCalled()
      dialogs.accept()
      expect(openSettings).toHaveBeenCalledTimes(1)
    })
  })
})
