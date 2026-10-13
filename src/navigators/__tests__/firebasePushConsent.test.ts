import {
  isFirebasePushEnabled,
  shouldSetupFirebasePush,
  shouldTeardownFirebasePush,
  getOpenedPushOrderData
} from '../firebasePushConsent'

describe('isFirebasePushEnabled', () => {
  it('is true only when the config value is the string 1', () => {
    expect(isFirebasePushEnabled({ firebase_push_enabled: { value: '1' } })).toBe(true)
  })

  it('is false for disabled, missing, or malformed configs', () => {
    expect(isFirebasePushEnabled({ firebase_push_enabled: { value: '0' } })).toBe(false)
    expect(isFirebasePushEnabled({ firebase_push_enabled: {} })).toBe(false)
    expect(isFirebasePushEnabled({})).toBe(false)
    expect(isFirebasePushEnabled(undefined)).toBe(false)
    expect(isFirebasePushEnabled(null)).toBe(false)
  })
})

describe('shouldSetupFirebasePush', () => {
  const ready = {
    configsLoading: false,
    enabled: true,
    auth: true
  }

  it('is true when configs are ready, the flag is on, and the user is authed', () => {
    expect(shouldSetupFirebasePush(ready)).toBe(true)
  })

  it('is false while configs are loading', () => {
    expect(shouldSetupFirebasePush({ ...ready, configsLoading: true })).toBe(false)
  })

  it('is false without the flag or session', () => {
    expect(shouldSetupFirebasePush({ ...ready, enabled: false })).toBe(false)
    expect(shouldSetupFirebasePush({ ...ready, auth: false })).toBe(false)
  })
})

describe('shouldTeardownFirebasePush', () => {
  it('is true after logout once configs have loaded', () => {
    expect(shouldTeardownFirebasePush({
      configsLoading: false,
      enabled: true,
      auth: false
    })).toBe(true)
  })

  it('is false while configs are loading so teardown does not race setup', () => {
    expect(shouldTeardownFirebasePush({
      configsLoading: true,
      enabled: true,
      auth: false
    })).toBe(false)
  })
})

describe('getOpenedPushOrderData', () => {
  it('maps FCM data keys to the order id state shape', () => {
    expect(getOpenedPushOrderData({
      order_id: '123',
      assign_request_id: '55',
      order_group_id: '9'
    })).toEqual({ id: '123', assignId: '55', group_id: '9' })
  })

  it('treats stringified null and empty values as absent', () => {
    expect(getOpenedPushOrderData({
      order_id: 'null',
      assign_request_id: '',
      order_group_id: undefined
    })).toEqual({ id: null, assignId: null, group_id: null })
  })

  it('handles a missing data object', () => {
    expect(getOpenedPushOrderData(undefined)).toEqual({ id: null, assignId: null, group_id: null })
  })
})
