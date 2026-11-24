const coverageInclude = require('./jest/coverage-include')

module.exports = {
  preset: '@react-native/jest-preset',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  // A whole-screen render takes seconds on a loaded machine or a small CI runner: 15 s a test (the default is 5 s), and the
  // waits of the testing library are 5 s (`jest/setupAfterEnv.js`), so a wait ends before its test does.
  testTimeout: 15000,
  setupFiles: ['<rootDir>/jest/setup.js'],
  setupFilesAfterEnv: ['<rootDir>/jest/setupAfterEnv.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@ui$': '<rootDir>/src/ui/index.tsx',
    '^@ui/(.*)$': '<rootDir>/src/ui/$1',
    '^@components$': '<rootDir>/src/@/components/native/index.js',
    '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/jest/mocks/fileMock.js'
  },
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?@?react-native|@react-native-community|@react-navigation|styled-components|@orderingco/ordering-theme-engine)'
  ],
  testMatch: [
    '<rootDir>/jest/**/*.(test|spec).[jt]s?(x)',
    '<rootDir>/src/**/*.(test|spec).[jt]s?(x)'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/android/',
    '/ios/',
    '<rootDir>/src/@/components/'
  ],
  collectCoverage: false,
  collectCoverageFrom: coverageInclude,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'json'],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/',
    '/jest/',
    '/coverage/',
    '/android/',
    '/ios/'
  ]
}
