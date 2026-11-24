import { shouldPromptForPushNotifications, shouldSetupOneSignal, shouldTeardownOneSignal } from '../oneSignalGate'
import { findNotificationTokenId, getNotificationTokensUrl } from '../notificationTokens'

describe('shouldSetupOneSignal', () => {
  const ready = { configsLoading: false, appId: 'onesignal-app', auth: true }

  it('is true when the configs are ready, the project has an app id and the driver is signed in', () => {
    expect(shouldSetupOneSignal(ready)).toBe(true)
  })

  it('is false while the configs load, without an app id or without a session', () => {
    expect(shouldSetupOneSignal({ ...ready, configsLoading: true })).toBe(false)
    expect(shouldSetupOneSignal({ ...ready, appId: '' })).toBe(false)
    expect(shouldSetupOneSignal({ ...ready, auth: false })).toBe(false)
  })
})

describe('shouldTeardownOneSignal', () => {
  it('is true once the configs loaded and the driver left', () => {
    expect(shouldTeardownOneSignal({ configsLoading: false, appId: 'onesignal-app', auth: false })).toBe(true)
  })

  it('is false while the configs load, so a teardown does not race the setup', () => {
    expect(shouldTeardownOneSignal({ configsLoading: true, appId: 'onesignal-app', auth: false })).toBe(false)
  })

  it('is false when the setup should run', () => {
    expect(shouldTeardownOneSignal({ configsLoading: false, appId: 'onesignal-app', auth: true })).toBe(false)
  })
})

describe('shouldPromptForPushNotifications', () => {
  it('prompts only without the permission', () => {
    expect(shouldPromptForPushNotifications({ hasNotificationPermission: false })).toBe(true)
    expect(shouldPromptForPushNotifications({})).toBe(true)
    expect(shouldPromptForPushNotifications(null)).toBe(true)
    expect(shouldPromptForPushNotifications({ hasNotificationPermission: true })).toBe(false)
  })
})

describe('findNotificationTokenId', () => {
  it('finds the row of a token in a list or in a { result } envelope', () => {
    const rows = [{ id: 1, token: 'a' }, { id: 2, token: 'sub-1' }]
    expect(findNotificationTokenId(rows, 'sub-1')).toBe(2)
    expect(findNotificationTokenId({ result: rows }, 'sub-1')).toBe(2)
  })

  it('is null without a token, without a match or on a payload that is not a list', () => {
    expect(findNotificationTokenId([{ id: 1, token: 'a' }], 'b')).toBeNull()
    expect(findNotificationTokenId([{ id: 1, token: 'a' }], null)).toBeNull()
    expect(findNotificationTokenId([{ id: 1, token: 'a' }], '')).toBeNull()
    expect(findNotificationTokenId({ error: true }, 'a')).toBeNull()
    expect(findNotificationTokenId(null, 'a')).toBeNull()
  })
})

describe('getNotificationTokensUrl', () => {
  it('builds the url of the driver\'s notification tokens', () => {
    expect(getNotificationTokensUrl('https://api.test/v400/es/proj', 7)).toBe('https://api.test/v400/es/proj/users/7/notification_tokens')
  })

  it('is null without a root or a user', () => {
    expect(getNotificationTokensUrl('', 7)).toBeNull()
    expect(getNotificationTokensUrl('https://api.test', null)).toBeNull()
    expect(getNotificationTokensUrl('https://api.test', '')).toBeNull()
  })
})
