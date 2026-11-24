import { createPushProviderSwitch, getDesiredPushProvider } from '../pushProviderSwitch'

const deferred = () => {
  let resolve: () => void = () => {}
  const promise = new Promise<void>((done) => { resolve = done })
  return { promise, resolve }
}

const flush = async () => {
  for (let i = 0; i < 10; i++) {
    await Promise.resolve()
  }
}

const fakeProvider = (name: string, log: string[]) => {
  let active = false
  const teardownGate = { current: null as null | Promise<void> }
  return {
    teardownGate,
    provider: {
      setup: jest.fn(async () => {
        log.push(`${name}:setup`)
        active = true
      }),
      teardown: jest.fn(async () => {
        log.push(`${name}:teardown:start`)
        active = false
        if (teardownGate.current) {
          await teardownGate.current
        }
        log.push(`${name}:teardown:end`)
      }),
      isActive: () => active
    }
  }
}

describe('getDesiredPushProvider', () => {
  const ready = { configsLoading: false, oneSignalAppId: 'app-1', auth: true }

  it('decides nothing while the configs load', () => {
    expect(getDesiredPushProvider({ ...ready, configsLoading: true })).toBeUndefined()
  })

  it('is Firebase when the project turned it on, else OneSignal with an app id', () => {
    expect(getDesiredPushProvider({ ...ready, firebaseEnabled: true })).toBe('fcm')
    expect(getDesiredPushProvider({ ...ready, firebaseEnabled: false })).toBe('onesignal')
    expect(getDesiredPushProvider({ ...ready, oneSignalAppId: '', firebaseEnabled: false })).toBeNull()
  })

  it('is none without a session', () => {
    expect(getDesiredPushProvider({ ...ready, auth: false })).toBeNull()
    expect(getDesiredPushProvider({ ...ready, firebaseEnabled: true, auth: false })).toBeNull()
  })
})

describe('createPushProviderSwitch', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {})
  })

  const build = () => {
    const log: string[] = []
    const onesignal = fakeProvider('onesignal', log)
    const fcm = fakeProvider('fcm', log)
    const providers = { onesignal: onesignal.provider, fcm: fcm.provider }
    return { log, onesignal, fcm, providers, pushSwitch: createPushProviderSwitch() }
  }

  it('sets up the wanted provider', async () => {
    const { log, providers, pushSwitch } = build()

    await pushSwitch.sync('onesignal', providers)

    expect(log).toEqual(['onesignal:setup'])
  })

  it('from OneSignal to Firebase: Firebase starts when the OneSignal teardown has ended', async () => {
    const { log, onesignal, providers, pushSwitch } = build()
    await pushSwitch.sync('onesignal', providers)
    const deleting = deferred()
    onesignal.teardownGate.current = deleting.promise

    const switched = pushSwitch.sync('fcm', providers)
    await flush()
    // The token is still being deleted: Firebase must not have written its state yet.
    expect(log).toEqual(['onesignal:setup', 'onesignal:teardown:start'])

    deleting.resolve()
    await switched
    expect(log).toEqual(['onesignal:setup', 'onesignal:teardown:start', 'onesignal:teardown:end', 'fcm:setup'])
  })

  it('from Firebase to OneSignal: OneSignal starts when the Firebase teardown has ended', async () => {
    const { log, fcm, providers, pushSwitch } = build()
    await pushSwitch.sync('fcm', providers)
    const deleting = deferred()
    fcm.teardownGate.current = deleting.promise

    const switched = pushSwitch.sync('onesignal', providers)
    await flush()
    expect(log).toEqual(['fcm:setup', 'fcm:teardown:start'])

    deleting.resolve()
    await switched
    expect(log).toEqual(['fcm:setup', 'fcm:teardown:start', 'fcm:teardown:end', 'onesignal:setup'])
  })

  it('tears the active provider down without a session', async () => {
    const { log, providers, pushSwitch } = build()
    await pushSwitch.sync('fcm', providers)

    await pushSwitch.sync(null, providers)

    expect(log).toEqual(['fcm:setup', 'fcm:teardown:start', 'fcm:teardown:end'])
    expect(providers.onesignal.teardown).not.toHaveBeenCalled()
  })

  it('applies the changes in the order they were asked', async () => {
    const { log, onesignal, providers, pushSwitch } = build()
    await pushSwitch.sync('onesignal', providers)
    const deleting = deferred()
    onesignal.teardownGate.current = deleting.promise

    pushSwitch.sync('fcm', providers)
    const last = pushSwitch.sync('onesignal', providers)
    await flush()
    deleting.resolve()
    onesignal.teardownGate.current = null
    await last

    expect(log).toEqual([
      'onesignal:setup',
      'onesignal:teardown:start',
      'onesignal:teardown:end',
      'fcm:setup',
      'fcm:teardown:start',
      'fcm:teardown:end',
      'onesignal:setup'
    ])
  })

  it('goes on after a provider fails', async () => {
    const { log, providers, pushSwitch } = build()
    providers.fcm.setup.mockRejectedValueOnce(new Error('no token'))

    await pushSwitch.sync('fcm', providers)
    await pushSwitch.sync('onesignal', providers)

    expect(log).toEqual(['onesignal:setup'])
  })

  it('runs nothing once stopped', async () => {
    const { log, providers, pushSwitch } = build()
    pushSwitch.stop()

    await pushSwitch.sync('onesignal', providers)

    expect(log).toEqual([])
  })
})
