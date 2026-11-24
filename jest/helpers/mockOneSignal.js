/**
 * react-native-onesignal 5 for tests: every call is recorded in `calls` (in
 * order), the listeners are kept so a test can emit events, and the async
 * getters answer what the test sets.
 *
 *   jest.mock('react-native-onesignal', () => require('<path>/jest/helpers/mockOneSignal'))
 *   const mockOneSignal = require('react-native-onesignal')
 *   mockOneSignal.__reset()
 */
const listeners = { click: new Set(), change: new Set(), permissionChange: new Set() }
const calls = []
const answers = { permission: true, subscriptionId: null, requestPermission: true }

const record = (name) => jest.fn((...args) => {
  calls.push(args.length ? `${name}:${args.join(',')}` : name)
})

const answer = (name, key) => jest.fn((...args) => {
  calls.push(args.length ? `${name}:${args.join(',')}` : name)
  const value = answers[key]
  return typeof value === 'function' ? value() : Promise.resolve(value)
})

const OneSignal = {
  initialize: record('initialize'),
  login: record('login'),
  logout: record('logout'),
  Debug: { setLogLevel: record('setLogLevel') },
  User: {
    addEmail: record('addEmail'),
    removeEmail: record('removeEmail'),
    addSms: record('addSms'),
    removeSms: record('removeSms'),
    pushSubscription: {
      getIdAsync: answer('getIdAsync', 'subscriptionId'),
      optIn: record('optIn'),
      optOut: record('optOut'),
      addEventListener: jest.fn((event, listener) => {
        calls.push(`addEventListener:${event}`)
        listeners[event].add(listener)
      }),
      removeEventListener: jest.fn((event, listener) => {
        listeners[event].delete(listener)
      })
    }
  },
  Notifications: {
    getPermissionAsync: answer('getPermissionAsync', 'permission'),
    requestPermission: answer('requestPermission', 'requestPermission'),
    addEventListener: jest.fn((event, listener) => {
      calls.push(`addEventListener:${event}`)
      listeners[event].add(listener)
    }),
    removeEventListener: jest.fn((event, listener) => {
      listeners[event].delete(listener)
    })
  },
  InAppMessages: { addTrigger: record('addTrigger') }
}

module.exports = {
  LogLevel: { Warn: 3, Verbose: 6 },
  OneSignal,
  __calls: calls,
  __listeners: listeners,
  __answers: answers,
  __emit: (event, payload) => {
    listeners[event].forEach(listener => listener(payload))
  },
  __reset: () => {
    calls.length = 0
    Object.values(listeners).forEach(set => set.clear())
    answers.permission = true
    answers.subscriptionId = null
    answers.requestPermission = true
  }
}
