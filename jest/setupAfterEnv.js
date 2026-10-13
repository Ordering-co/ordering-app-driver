/**
 * Runs after the test framework is installed (setupFilesAfterEnv).
 */
/* eslint-env jest */

require('./helpers/mockOrdering')

jest.mock('@components', () => require('./helpers/mockOrdering'))

const { cleanup } = require('@testing-library/react-native')

afterEach(() => {
  cleanup()
  jest.clearAllMocks()
})
