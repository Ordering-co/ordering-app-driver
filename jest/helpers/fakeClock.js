/**
 * Pins the clock (`new Date()`, `Date.now()`) at an instant and leaves every
 * other timer real: `jest.spyOn(Date, 'now')` moves moment's clock but not
 * dayjs's, which reads `new Date()`. Call `restoreClock` in `afterEach`.
 */
const REAL_TIMERS = [
  'hrtime', 'nextTick', 'performance', 'queueMicrotask', 'requestAnimationFrame',
  'cancelAnimationFrame', 'requestIdleCallback', 'cancelIdleCallback', 'setImmediate',
  'clearImmediate', 'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'
]

const freezeClock = (now) => jest.useFakeTimers({ now, doNotFake: REAL_TIMERS })
const restoreClock = () => jest.useRealTimers()

module.exports = { freezeClock, restoreClock }
