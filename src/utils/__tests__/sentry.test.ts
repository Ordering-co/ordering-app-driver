const DSN = 'https://public@o0.ingest.sentry.io/1'

function load ({ dsn, dev }: { dsn: string, dev: boolean }) {
  jest.resetModules()
  ;(global as any).__DEV__ = dev
  jest.doMock('../../sentry.json', () => ({ dsn }))
  jest.doMock('@sentry/react-native', () => ({
    init: jest.fn(),
    setTag: jest.fn()
  }))
  jest.doMock('react-native-device-info', () => ({
    getBundleId: jest.fn(() => 'com.ordering.deliveryapp'),
    getVersion: jest.fn(() => '2.4.0'),
    getBuildNumber: jest.fn(() => '57')
  }))
  const { initSentry } = require('../sentry')
  const Sentry = require('@sentry/react-native')
  const { project } = require('../../config.json')
  return { initSentry, Sentry, project }
}

describe('initSentry', () => {
  const originalDev = (global as any).__DEV__

  afterEach(() => {
    ;(global as any).__DEV__ = originalDev
    jest.dontMock('../../sentry.json')
    jest.dontMock('@sentry/react-native')
    jest.dontMock('react-native-device-info')
  })

  it('does not initialize in development builds', () => {
    const { initSentry, Sentry } = load({ dsn: DSN, dev: true })

    initSentry()

    expect(Sentry.init).not.toHaveBeenCalled()
    expect(Sentry.setTag).not.toHaveBeenCalled()
  })

  it('does not initialize when the dsn is empty', () => {
    const { initSentry, Sentry } = load({ dsn: '', dev: false })

    initSentry()

    expect(Sentry.init).not.toHaveBeenCalled()
    expect(Sentry.setTag).not.toHaveBeenCalled()
  })

  it('initializes with the release, dist and tags of the build', () => {
    const { initSentry, Sentry, project } = load({ dsn: DSN, dev: false })

    initSentry()

    expect(Sentry.init).toHaveBeenCalledTimes(1)
    expect(Sentry.init).toHaveBeenCalledWith({
      dsn: DSN,
      environment: 'production',
      release: 'com.ordering.deliveryapp@2.4.0+57',
      dist: '57',
      enableNativeCrashHandling: false,
      enableAppHangTracking: false,
      tracesSampleRate: 0.1
    })
    expect(Sentry.setTag).toHaveBeenCalledWith('app', 'app-driver-26')
    expect(Sentry.setTag).toHaveBeenCalledWith('project', project)
  })

  it('swallows errors thrown while initializing', () => {
    const { initSentry, Sentry } = load({ dsn: DSN, dev: false })
    Sentry.init.mockImplementation(() => {
      throw new Error('native module unavailable')
    })

    expect(() => initSentry()).not.toThrow()
    expect(Sentry.setTag).not.toHaveBeenCalled()
  })
})
