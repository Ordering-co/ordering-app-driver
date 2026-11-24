/* eslint-env jest */
/**
 * Native / third-party mocks for D3 orders UI tests.
 * Import as the first line in each D3 test file that needs them.
 */
jest.mock('react-native-sound-player', () => ({
  playUrl: jest.fn(),
  stop: jest.fn()
}))
