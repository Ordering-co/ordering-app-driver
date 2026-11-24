import {
  createOneSignalPush,
  NOTIFICATION_STATE_KEY,
  ONESIGNAL_IDENTITY_KEY,
  ONESIGNAL_PERMISSION_ASKED_KEY
} from '../oneSignalPush'

jest.mock('react-native-onesignal', () => require('../../../jest/helpers/mockOneSignal'))

const mockOneSignal = require('react-native-onesignal')
const { OneSignal } = mockOneSignal

const identity = {
  appId: 'app-1',
  externalId: 'demo-7',
  email: 'ana@example.test',
  sms: '+573008282222'
}

const deferred = <T>() => {
  let resolve: (value: T) => void = () => {}
  const promise = new Promise<T>((done) => { resolve = done })
  return { promise, resolve }
}

const flush = async () => {
  for (let i = 0; i < 10; i++) {
    await Promise.resolve()
  }
}

const memoryStorage = (initial: Record<string, any> = {}) => {
  const data: Record<string, any> = { ...initial }
  return {
    data,
    get: jest.fn(async (key: string) => data[key]),
    set: jest.fn((key: string, value: any) => { data[key] = value }),
    remove: jest.fn((key: string) => { delete data[key] })
  }
}

const build = (storage = memoryStorage()) => {
  const onState = jest.fn()
  const onNotificationClick = jest.fn()
  const onPermissionGranted = jest.fn()
  const push = createOneSignalPush({
    storage,
    notificationApp: 'deliveryapp',
    onState,
    onNotificationClick,
    onPermissionGranted
  })
  return { push, storage, onState, onNotificationClick, onPermissionGranted }
}

const sdkCalls = (...names: string[]) => mockOneSignal.__calls
  .filter((call: string) => names.some(name => call === name || call.startsWith(`${name}:`)))

const registered = {
  notification_app: 'deliveryapp',
  notification_token: 'sub-1'
}

describe('createOneSignalPush', () => {
  beforeEach(() => {
    mockOneSignal.__reset()
    jest.clearAllMocks()
    jest.spyOn(console, 'log').mockImplementation(() => {})
  })

  describe('setup', () => {
    it('logs verbosely in development only: a release build keeps the user\'s data out of the device log', async () => {
      const dev = (globalThis as any).__DEV__
      try {
        ;(globalThis as any).__DEV__ = true
        await build().push.setup(identity)
        expect(sdkCalls('setLogLevel')).toEqual(['setLogLevel:6'])

        mockOneSignal.__reset()
        ;(globalThis as any).__DEV__ = false
        await build().push.setup(identity)
        expect(sdkCalls('setLogLevel')).toEqual(['setLogLevel:3'])
      } finally {
        ;(globalThis as any).__DEV__ = dev
      }
    })

    it('initializes, logs the user in, then adds the email and the SMS, in that order', async () => {
      const { push } = build()

      await push.setup(identity)

      expect(sdkCalls('initialize', 'login', 'addEmail', 'addSms')).toEqual([
        'initialize:app-1',
        'login:demo-7',
        'addEmail:ana@example.test',
        'addSms:+573008282222'
      ])
    })

    it('adds the listeners after initialize, never before', async () => {
      const { push } = build()

      await push.setup(identity)

      const calls: string[] = mockOneSignal.__calls
      const firstListener = calls.findIndex(call => call.startsWith('addEventListener'))
      expect(firstListener).toBeGreaterThan(calls.indexOf('initialize:app-1'))
      expect(calls.filter(call => call.startsWith('addEventListener'))).toEqual([
        'addEventListener:click',
        'addEventListener:change',
        'addEventListener:permissionChange'
      ])
    })

    it('registers the subscription id of getIdAsync, in the state and in the storage', async () => {
      mockOneSignal.__answers.subscriptionId = 'sub-1'
      const { push, storage, onState } = build()

      await push.setup(identity)

      expect(onState).toHaveBeenCalledWith(registered)
      expect(storage.data[NOTIFICATION_STATE_KEY]).toEqual(registered)
      expect(push.getToken()).toBe('sub-1')
    })

    it('registers the id that arrives through the change event, in the state and in the storage', async () => {
      // A clean install: OneSignal has not created the subscription yet.
      mockOneSignal.__answers.subscriptionId = null
      const { push, storage, onState } = build()
      await push.setup(identity)
      expect(onState).not.toHaveBeenCalled()
      expect(storage.data[NOTIFICATION_STATE_KEY]).toBeUndefined()

      mockOneSignal.__emit('change', { current: { id: 'sub-1', optedIn: true } })

      expect(onState).toHaveBeenCalledWith(registered)
      // LogoutButton reads it: without it the logout does not send the token
      // and the API keeps the row for the user who left.
      expect(storage.data[NOTIFICATION_STATE_KEY]).toEqual(registered)
    })

    it('accepts the change event while the setup is still in flight', async () => {
      const id = deferred<string | null>()
      mockOneSignal.__answers.subscriptionId = () => id.promise
      const { push, storage } = build()
      const setup = push.setup(identity)
      await flush()

      mockOneSignal.__emit('change', { current: { id: 'sub-1', optedIn: true } })
      expect(storage.data[NOTIFICATION_STATE_KEY]).toEqual(registered)

      id.resolve(null)
      await setup
    })

    it('asks OneSignal for the in-app prompt when the subscription is not opted in', async () => {
      const { push } = build()
      await push.setup(identity)

      mockOneSignal.__emit('change', { current: { id: 'sub-1', optedIn: false } })

      expect(OneSignal.InAppMessages.addTrigger).toHaveBeenCalledWith('prompt_ios', 'true')
    })

    it('opts in when the permission is granted, without asking', async () => {
      const { push } = build()

      await push.setup(identity)

      expect(OneSignal.User.pushSubscription.optIn).toHaveBeenCalledTimes(1)
      expect(OneSignal.Notifications.requestPermission).not.toHaveBeenCalled()
    })

    it('does not opt in without the permission: it asks, and opts in when it is granted', async () => {
      mockOneSignal.__answers.permission = false
      const answer = deferred<boolean>()
      mockOneSignal.__answers.requestPermission = () => answer.promise
      const { push, storage } = build()

      await push.setup(identity)

      expect(OneSignal.Notifications.requestPermission).toHaveBeenCalledWith(false)
      expect(storage.data[ONESIGNAL_PERMISSION_ASKED_KEY]).toBe(true)
      expect(OneSignal.User.pushSubscription.optIn).not.toHaveBeenCalled()

      answer.resolve(true)
      await flush()
      expect(OneSignal.User.pushSubscription.optIn).toHaveBeenCalledTimes(1)
    })

    it('does not opt in when the permission is denied', async () => {
      mockOneSignal.__answers.permission = false
      mockOneSignal.__answers.requestPermission = false
      const { push } = build()

      await push.setup(identity)
      await flush()

      expect(OneSignal.User.pushSubscription.optIn).not.toHaveBeenCalled()
    })

    it('does not opt in when the permission is granted after a teardown', async () => {
      mockOneSignal.__answers.permission = false
      const answer = deferred<boolean>()
      mockOneSignal.__answers.requestPermission = () => answer.promise
      const { push } = build()
      await push.setup(identity)

      await push.teardown()
      answer.resolve(true)
      await flush()

      expect(OneSignal.User.pushSubscription.optIn).not.toHaveBeenCalled()
    })

    it('shows the permission dialog once per install', async () => {
      mockOneSignal.__answers.permission = false
      mockOneSignal.__answers.requestPermission = false
      const storage = memoryStorage()
      const first = build(storage)
      await first.push.setup(identity)
      await first.push.setup({ ...identity, email: 'other@example.test' })
      await first.push.teardown()
      await first.push.setup(identity)
      first.push.dispose()

      // The app opened again.
      const second = build(storage)
      await second.push.setup(identity)

      expect(OneSignal.Notifications.requestPermission).toHaveBeenCalledTimes(1)
    })

    it('opts in when the permission is granted later from the settings', async () => {
      mockOneSignal.__answers.permission = false
      mockOneSignal.__answers.requestPermission = false
      const { push } = build()
      await push.setup(identity)

      mockOneSignal.__emit('permissionChange', true)

      expect(OneSignal.User.pushSubscription.optIn).toHaveBeenCalledTimes(1)
    })

    it('does nothing when it runs again with nothing changed (each load of the configs)', async () => {
      mockOneSignal.__answers.subscriptionId = 'sub-1'
      const { push, onState } = build()
      await push.setup(identity)
      const calls = [...mockOneSignal.__calls]

      await push.setup({ ...identity })
      await push.setup({ ...identity })

      expect(mockOneSignal.__calls).toEqual(calls)
      expect(onState).toHaveBeenCalledTimes(1)
    })

    it('does not add the email and the SMS again while the id has not arrived', async () => {
      mockOneSignal.__answers.subscriptionId = null
      const { push } = build()
      await push.setup(identity)

      await push.setup({ ...identity })

      expect(sdkCalls('initialize', 'login', 'addEmail', 'addSms')).toHaveLength(4)
    })

    it('removes the old email and SMS when the user changed them', async () => {
      mockOneSignal.__answers.subscriptionId = 'sub-1'
      const { push } = build()
      await push.setup(identity)
      mockOneSignal.__calls.length = 0

      await push.setup({ ...identity, email: 'new@example.test', sms: '+15551234567' })

      expect(sdkCalls('login', 'removeEmail', 'addEmail', 'removeSms', 'addSms')).toEqual([
        'removeEmail:ana@example.test',
        'addEmail:new@example.test',
        'removeSms:+573008282222',
        'addSms:+15551234567'
      ])
    })

    it('removes the email of the last session when it changed while the app was closed', async () => {
      const storage = memoryStorage({
        [ONESIGNAL_IDENTITY_KEY]: { externalId: 'demo-7', email: 'old@example.test', sms: '+573008282222' }
      })
      const { push } = build(storage)

      await push.setup(identity)

      expect(sdkCalls('removeEmail', 'addEmail', 'removeSms', 'addSms')).toEqual([
        'removeEmail:old@example.test',
        'addEmail:ana@example.test',
        'addSms:+573008282222'
      ])
      expect(storage.data[ONESIGNAL_IDENTITY_KEY]).toEqual({
        externalId: 'demo-7',
        email: 'ana@example.test',
        sms: '+573008282222'
      })
    })

    it('keeps the emails of another user', async () => {
      const storage = memoryStorage({
        [ONESIGNAL_IDENTITY_KEY]: { externalId: 'demo-1', email: 'first@example.test', sms: null }
      })
      const { push } = build(storage)

      await push.setup(identity)

      expect(OneSignal.User.removeEmail).not.toHaveBeenCalled()
    })
  })

  describe('the driver app (what v4 did in RootNavigator)', () => {
    it('tells the app the permission is granted when it already was (the iOS banner style check)', async () => {
      const { push, onPermissionGranted } = build()

      await push.setup(identity)

      expect(onPermissionGranted).toHaveBeenCalledTimes(1)
    })

    it('tells the app only when the driver accepts the dialog, not when the dialog is denied', async () => {
      mockOneSignal.__answers.permission = false
      const answer = deferred<boolean>()
      mockOneSignal.__answers.requestPermission = () => answer.promise
      const { push, onPermissionGranted } = build()
      await push.setup(identity)
      expect(onPermissionGranted).not.toHaveBeenCalled()

      answer.resolve(true)
      await flush()
      expect(onPermissionGranted).toHaveBeenCalledTimes(1)

      mockOneSignal.__reset()
      mockOneSignal.__answers.permission = false
      mockOneSignal.__answers.requestPermission = false
      const denied = build()
      await denied.push.setup(identity)
      await flush()
      expect(denied.onPermissionGranted).not.toHaveBeenCalled()
    })

    it('does not tell the app about a permission answered after a teardown', async () => {
      mockOneSignal.__answers.permission = false
      const answer = deferred<boolean>()
      mockOneSignal.__answers.requestPermission = () => answer.promise
      const { push, onPermissionGranted } = build()
      await push.setup(identity)

      await push.teardown()
      answer.resolve(true)
      await flush()

      expect(onPermissionGranted).not.toHaveBeenCalled()
    })

    it('sets the notification_prompt trigger of v4 before it asks for the permission, once per install', async () => {
      mockOneSignal.__answers.permission = false
      mockOneSignal.__answers.requestPermission = false
      const { push } = build()
      await push.setup(identity)
      await flush()

      expect(sdkCalls('addTrigger')).toEqual(['addTrigger:notification_prompt,true'])
      expect(mockOneSignal.__calls.indexOf('addTrigger:notification_prompt,true'))
        .toBeLessThan(mockOneSignal.__calls.indexOf('requestPermission:false'))
    })

    it('registers the subscription id without a provider: the driver app never sent one for OneSignal', async () => {
      mockOneSignal.__answers.subscriptionId = 'sub-1'
      const { push, storage } = build()

      await push.setup(identity)

      expect(storage.data[NOTIFICATION_STATE_KEY]).toEqual({ notification_app: 'deliveryapp', notification_token: 'sub-1' })
      expect(storage.data[NOTIFICATION_STATE_KEY]).not.toHaveProperty('notification_provider')
    })

    it('logs the driver out of OneSignal when the app logs out, and in as the next driver without the old email', async () => {
      mockOneSignal.__answers.subscriptionId = 'sub-1'
      const { push } = build()
      await push.setup(identity)
      mockOneSignal.__calls.length = 0

      await push.teardown()
      await push.setup({ ...identity, externalId: 'demo-8', email: 'luis@example.test', sms: '' })

      expect(sdkCalls('optOut', 'logout', 'login', 'addEmail', 'addSms', 'optIn')).toEqual([
        'optOut',
        'logout',
        'login:demo-8',
        'addEmail:luis@example.test',
        'optIn'
      ])
    })
  })

  describe('teardown', () => {
    it('opts out, logs out, deletes the token and resets the state and the storage', async () => {
      mockOneSignal.__answers.subscriptionId = 'sub-1'
      const { push, storage, onState } = build()
      await push.setup(identity)
      mockOneSignal.__calls.length = 0
      const unregister = jest.fn(async () => {})

      await push.teardown(unregister)

      expect(sdkCalls('optOut', 'logout')).toEqual(['optOut', 'logout'])
      expect(unregister).toHaveBeenCalledWith('sub-1')
      expect(storage.data[NOTIFICATION_STATE_KEY]).toBeUndefined()
      expect(onState).toHaveBeenLastCalledWith(null)
      expect(push.isActive()).toBe(false)
      expect(push.getToken()).toBeNull()
    })

    it('ignores the events that arrive after it', async () => {
      const { push, storage, onState } = build()
      await push.setup(identity)
      await push.teardown()
      onState.mockClear()

      mockOneSignal.__emit('change', { current: { id: 'sub-1', optedIn: false } })
      mockOneSignal.__emit('permissionChange', true)

      expect(onState).not.toHaveBeenCalled()
      expect(storage.data[NOTIFICATION_STATE_KEY]).toBeUndefined()
      expect(OneSignal.User.pushSubscription.optIn).toHaveBeenCalledTimes(1)
    })

    it('logs in and adds the email again on the next setup', async () => {
      const { push } = build()
      await push.setup(identity)
      await push.teardown()
      mockOneSignal.__calls.length = 0

      await push.setup({ ...identity, externalId: 'demo-8', email: 'eva@example.test', sms: null })

      expect(sdkCalls('initialize', 'login', 'addEmail', 'removeEmail', 'optIn')).toEqual([
        'login:demo-8',
        'addEmail:eva@example.test',
        'optIn'
      ])
    })

    it('leaves the state to a setup that started while the token was being deleted', async () => {
      mockOneSignal.__answers.subscriptionId = 'sub-1'
      const { push, storage, onState } = build()
      await push.setup(identity)
      const deleted = deferred<void>()

      const teardown = push.teardown(() => deleted.promise)
      mockOneSignal.__answers.subscriptionId = 'sub-2'
      await push.setup(identity)
      deleted.resolve()
      await teardown

      expect(onState).toHaveBeenLastCalledWith({ ...registered, notification_token: 'sub-2' })
      expect(storage.data[NOTIFICATION_STATE_KEY]).toEqual({ ...registered, notification_token: 'sub-2' })
    })
  })

  describe('a setup replaced before it ends', () => {
    it('registers nothing after a teardown', async () => {
      const id = deferred<string | null>()
      mockOneSignal.__answers.subscriptionId = () => id.promise
      const { push, storage, onState } = build()
      const setup = push.setup(identity)
      await flush()

      await push.teardown()
      onState.mockClear()
      id.resolve('sub-1')
      await setup

      expect(onState).not.toHaveBeenCalled()
      expect(storage.data[NOTIFICATION_STATE_KEY]).toBeUndefined()
      expect(push.isActive()).toBe(false)
    })

    it('does not mark the newer setup as finished', async () => {
      const firstPermission = deferred<boolean>()
      const secondPermission = deferred<boolean>()
      const permissions = [firstPermission, secondPermission]
      mockOneSignal.__answers.permission = () => permissions.shift()!.promise
      const { push } = build()
      const first = push.setup(identity)
      await flush()
      const second = push.setup({ ...identity, email: 'new@example.test' })
      await flush()

      firstPermission.resolve(true)
      await first

      // The second one is still waiting: the events it gets must count.
      expect(push.isActive()).toBe(true)
      mockOneSignal.__emit('change', { current: { id: 'sub-1', optedIn: true } })
      expect(push.getToken()).toBe('sub-1')

      secondPermission.resolve(true)
      await second
    })
  })

  describe('listeners', () => {
    it('hands the tapped notification over', async () => {
      const { push, onNotificationClick } = build()
      await push.setup(identity)
      const notification = { additionalData: { order_uuid: 'ord-1' } }

      mockOneSignal.__emit('click', { notification, result: {} })

      expect(onNotificationClick).toHaveBeenCalledWith(notification)
    })

    it('adds them once, however many setups run', async () => {
      const { push } = build()
      await push.setup(identity)
      await push.setup({ ...identity, email: 'new@example.test' })
      await push.teardown()
      await push.setup(identity)

      expect(mockOneSignal.__listeners.click.size).toBe(1)
      expect(mockOneSignal.__listeners.change.size).toBe(1)
      expect(mockOneSignal.__listeners.permissionChange.size).toBe(1)
      expect(OneSignal.Notifications.addEventListener).toHaveBeenCalledTimes(2)
      expect(OneSignal.User.pushSubscription.addEventListener).toHaveBeenCalledTimes(1)
    })

    it('leaves one set after the navigator mounts again', async () => {
      mockOneSignal.__answers.subscriptionId = 'sub-1'
      const first = build()
      await first.push.setup(identity)
      first.push.dispose()
      const second = build()
      await second.push.setup(identity)

      expect(mockOneSignal.__listeners.click.size).toBe(1)
      expect(mockOneSignal.__listeners.change.size).toBe(1)
      expect(mockOneSignal.__listeners.permissionChange.size).toBe(1)

      mockOneSignal.__emit('click', { notification: { additionalData: {} }, result: {} })
      expect(first.onNotificationClick).not.toHaveBeenCalled()
      expect(second.onNotificationClick).toHaveBeenCalledTimes(1)
    })

    it('does nothing once disposed', async () => {
      const { push } = build()
      push.dispose()

      await push.setup(identity)
      await push.teardown()

      expect(mockOneSignal.__calls).toEqual([])
    })
  })

  describe('retireStaleSubscription', () => {
    const stale = { notification_app: 'deliveryapp', notification_token: 'player-1' }

    it('initializes, opts out and logs out a OneSignal subscription left in the storage', async () => {
      const storage = memoryStorage({ [NOTIFICATION_STATE_KEY]: stale })
      const { push } = build(storage)
      const unregister = jest.fn(async () => {})

      await push.retireStaleSubscription('app-1', unregister)

      expect(sdkCalls('initialize', 'optOut', 'logout')).toEqual(['initialize:app-1', 'optOut', 'logout'])
      expect(unregister).toHaveBeenCalledWith('player-1')
      expect(storage.data[NOTIFICATION_STATE_KEY]).toBeUndefined()
    })

    it('runs once', async () => {
      const storage = memoryStorage({ [NOTIFICATION_STATE_KEY]: stale })
      const { push } = build(storage)
      await push.retireStaleSubscription('app-1')
      mockOneSignal.__calls.length = 0

      await push.retireStaleSubscription('app-1')

      expect(mockOneSignal.__calls).toEqual([])
    })

    it('leaves a Firebase token, an empty storage and a project without OneSignal alone', async () => {
      const fcm = build(memoryStorage({
        [NOTIFICATION_STATE_KEY]: { ...stale, notification_provider: 'fcm' }
      }))
      await fcm.push.retireStaleSubscription('app-1')
      await build().push.retireStaleSubscription('app-1')
      const withoutApp = build(memoryStorage({ [NOTIFICATION_STATE_KEY]: stale }))
      await withoutApp.push.retireStaleSubscription(undefined)

      expect(mockOneSignal.__calls).toEqual([])
      expect(fcm.storage.remove).not.toHaveBeenCalled()
      expect(withoutApp.storage.remove).not.toHaveBeenCalled()
    })

    it('leaves a live OneSignal setup alone (the switch tears it down)', async () => {
      mockOneSignal.__answers.subscriptionId = 'sub-1'
      const { push, storage } = build()
      await push.setup(identity)
      mockOneSignal.__calls.length = 0

      await push.retireStaleSubscription('app-1')

      expect(mockOneSignal.__calls).toEqual([])
      expect(storage.data[NOTIFICATION_STATE_KEY]).toEqual(registered)
    })
  })
})
