/**
 * Shared hooks for co-located shared primitive tests.
 * Mocks stay in jest/setup.js / jest/setupAfterEnv.js — not here.
 */
/* eslint-env jest */

const { Alert, Linking, Vibration, Keyboard } = require('react-native')

const iconSource = 1

function setupSharedComponentHooks () {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(Alert, 'alert').mockImplementation(jest.fn())
    jest.spyOn(Vibration, 'vibrate').mockImplementation(jest.fn())
    jest.spyOn(Keyboard, 'addListener').mockImplementation(() => ({ remove: jest.fn() }))
    jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(true)
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined)
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
  })
}

module.exports = {
  iconSource,
  setupSharedComponentHooks
}
