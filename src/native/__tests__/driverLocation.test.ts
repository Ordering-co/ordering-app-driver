/**
 * The wrapper where the native module is not built in (Jest has none): nothing crashes and
 * every call says "disabled".
 */
import * as driverLocation from '../driverLocation'

const options: driverLocation.DriverLocationOptions = {
  url: 'http://localhost:8080/users/7/locations',
  headers: { Authorization: 'Bearer token' },
  extras: { driver_id: 7 },
  distanceFilter: 25,
  interval: 40000,
  fastestInterval: 20000,
  notification: { title: 'Title', text: 'Text' }
}

describe('driverLocation without the native module', () => {
  it('knows the module is absent', () => {
    expect(driverLocation.isDriverLocationAvailable()).toBe(false)
  })

  it('answers every call with the disabled state', async () => {
    await expect(driverLocation.configure(options)).resolves.toEqual(driverLocation.DISABLED_STATE)
    await expect(driverLocation.start()).resolves.toEqual(driverLocation.DISABLED_STATE)
    await expect(driverLocation.stop()).resolves.toEqual(driverLocation.DISABLED_STATE)
    await expect(driverLocation.getState()).resolves.toEqual(driverLocation.DISABLED_STATE)
    await expect(driverLocation.flush()).resolves.toBeUndefined()
    expect(driverLocation.setApiRoot('http://localhost:8080')).toBe(false)
    expect(driverLocation.DISABLED_STATE).toMatchObject({ enabled: false, tracking: false, queued: 0 })
  })

  it('gives subscriptions that can be removed, and never calls back', () => {
    const callback = jest.fn()
    const subscriptions = [
      driverLocation.onLocation(callback),
      driverLocation.onHttp(callback),
      driverLocation.onState(callback)
    ]
    subscriptions.forEach(subscription => {
      expect(() => subscription.remove()).not.toThrow()
    })
    expect(callback).not.toHaveBeenCalled()
  })
})

describe('driverLocation with a native module', () => {
  const load = () => {
    jest.resetModules()
    const native = {
      configure: jest.fn(async () => ({ enabled: true })),
      start: jest.fn(async () => ({ tracking: true })),
      stop: jest.fn(async () => ({ tracking: false })),
      getState: jest.fn(async () => ({ enabled: true })),
      flush: jest.fn(async () => undefined),
      setApiRoot: jest.fn(() => true),
      onLocation: jest.fn(() => ({ remove: jest.fn() })),
      onHttp: jest.fn(() => ({ remove: jest.fn() })),
      onState: jest.fn((callback: (event: { kind: string }) => void) => {
        callback({ kind: 'unauthorized' })
        return { remove: jest.fn() }
      })
    }
    jest.doMock('../NativeDriverLocation', () => ({ __esModule: true, default: native }))
    return { native, wrapper: require('../driverLocation') as typeof driverLocation }
  }

  it('flattens the options to the spec and fills the defaults', async () => {
    const { native, wrapper } = load()
    expect(wrapper.isDriverLocationAvailable()).toBe(true)
    await wrapper.configure(options)
    expect(native.configure).toHaveBeenCalledWith({
      url: options.url,
      headers: options.headers,
      extras: options.extras,
      distanceFilter: 25,
      interval: 40000,
      fastestInterval: 20000,
      notificationTitle: 'Title',
      notificationText: 'Text',
      maxQueue: 500,
      discardOlderOnSuccess: true,
      rejectMock: false,
      minSendIntervalMs: 0,
      sendLocationAt: false
    })
    await wrapper.configure({ ...options, maxQueue: 10, discardOlderOnSuccess: false })
    expect(native.configure).toHaveBeenLastCalledWith(expect.objectContaining({ maxQueue: 10, discardOlderOnSuccess: false }))
  })

  it('passes the minimum send interval and location_at through, and off by default', async () => {
    const { native, wrapper } = load()
    await wrapper.configure({ ...options, minSendIntervalMs: 1500, sendLocationAt: true })
    expect(native.configure).toHaveBeenLastCalledWith(expect.objectContaining({ minSendIntervalMs: 1500, sendLocationAt: true }))
    await wrapper.configure({ ...options, minSendIntervalMs: 0, sendLocationAt: false })
    expect(native.configure).toHaveBeenLastCalledWith(expect.objectContaining({ minSendIntervalMs: 0, sendLocationAt: false }))
    await wrapper.configure(options)
    expect(native.configure).toHaveBeenLastCalledWith(expect.objectContaining({ minSendIntervalMs: 0, sendLocationAt: false }))
  })

  it('passes the events url only when it is given: without it the recorder is off', async () => {
    const { native, wrapper } = load()
    await wrapper.configure(options)
    expect(native.configure.mock.calls[0][0]).not.toHaveProperty('eventsUrl')
    await wrapper.configure({ ...options, eventsUrl: '' })
    expect(native.configure.mock.calls[1][0]).not.toHaveProperty('eventsUrl')
    await wrapper.configure({ ...options, eventsUrl: 'http://localhost:8080/tracking_events' })
    expect(native.configure).toHaveBeenLastCalledWith(expect.objectContaining({ eventsUrl: 'http://localhost:8080/tracking_events' }))
  })

  it('passes the start and stop reasons, and nothing for an older caller', async () => {
    const { native, wrapper } = load()
    await wrapper.start()
    expect(native.start).toHaveBeenLastCalledWith(undefined)
    await wrapper.start('login')
    expect(native.start).toHaveBeenLastCalledWith('login')
    await wrapper.stop()
    expect(native.stop).toHaveBeenLastCalledWith(undefined)
    await wrapper.stop('unavailable')
    expect(native.stop).toHaveBeenLastCalledWith('unavailable')
  })

  it('forwards start, stop, getState and flush', async () => {
    const { native, wrapper } = load()
    await wrapper.start()
    await wrapper.stop()
    await wrapper.getState()
    await wrapper.flush()
    expect(native.start).toHaveBeenCalledTimes(1)
    expect(native.stop).toHaveBeenCalledTimes(1)
    expect(native.getState).toHaveBeenCalledTimes(1)
    expect(native.flush).toHaveBeenCalledTimes(1)
  })

  it('passes the API root to the native side and says whether it was usable; a throwing module is not fatal', () => {
    const { native, wrapper } = load()
    expect(wrapper.setApiRoot('https://apiv4.ordering.co/v400/en/brand')).toBe(true)
    expect(native.setApiRoot).toHaveBeenCalledWith('https://apiv4.ordering.co/v400/en/brand')
    native.setApiRoot.mockReturnValueOnce(false)
    expect(wrapper.setApiRoot('nonsense')).toBe(false)
    native.setApiRoot.mockImplementationOnce(() => { throw new Error('boom') })
    expect(wrapper.setApiRoot('https://x.y')).toBe(false)
  })

  it('hands the state events to the callback as kinds', () => {
    const { native, wrapper } = load()
    const callback = jest.fn()
    wrapper.onState(callback)
    expect(native.onState).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith('unauthorized')
  })
})
