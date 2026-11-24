/**
 * Runs after the test framework is installed (setupFilesAfterEnv).
 */
/* eslint-env jest */

require('./helpers/mockOrdering')

jest.mock('@components', () => require('./helpers/mockOrdering'))

const { cleanup, configure } = require('@testing-library/react-native')

// Waiting for the screen (`waitFor`, `findBy…`, `waitForElementToBeRemoved`) gives up after 5 s, not the library's 1 s:
// a render of a whole screen takes ~0.25-0.8 s on a quiet machine and several times that on a small CI runner.
// A test that really fails still fails, only later. Pair with `testTimeout` in jest.config.js (15 s): the wait has to end before the test does.
configure({ asyncUtilTimeout: 5000 })

afterEach(() => {
  cleanup()
  jest.clearAllMocks()
})
