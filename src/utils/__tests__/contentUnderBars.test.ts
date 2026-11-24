import { NativeModules, Platform } from 'react-native'
import { setContentUnderBars } from '../contentUnderBars'

describe('setContentUnderBars', () => {
  const native = jest.fn()
  let platform: { restore: () => void } | undefined
  beforeEach(() => {
    native.mockClear()
    NativeModules.WindowBackground = { setContentUnderBars: native }
  })
  afterEach(() => {
    platform?.restore()
    platform = undefined
    delete NativeModules.WindowBackground
  })

  it('passes the request to the Android module, on and off', () => {
    platform = jest.replaceProperty(Platform, 'OS', 'android')
    setContentUnderBars(true)
    setContentUnderBars(false)
    expect(native.mock.calls).toEqual([[true], [false]])
  })

  it('does nothing on iOS', () => {
    platform = jest.replaceProperty(Platform, 'OS', 'ios')
    setContentUnderBars(true)
    expect(native).not.toHaveBeenCalled()
  })

  it('does nothing in a binary without the module or without the method', () => {
    platform = jest.replaceProperty(Platform, 'OS', 'android')
    NativeModules.WindowBackground = {}
    expect(() => setContentUnderBars(true)).not.toThrow()
    delete NativeModules.WindowBackground
    expect(() => setContentUnderBars(true)).not.toThrow()
  })
})
