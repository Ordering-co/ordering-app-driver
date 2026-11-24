/**
 * Presses a held button (`OButton` with `hold`) the way a driver does: the finger goes down, stays
 * for the whole hold, and comes up. The clock is faked only for the hold, so a test that waits on real
 * timers elsewhere is not slowed down or disturbed.
 */
/* eslint-env jest */
const { act, fireEvent } = require('@testing-library/react-native')

// The hold's length: `HOLD_MS` of the button (a behaviour constant, read from it so the two cannot drift).
const holdMs = () => require('../../src/ui/src/components/shared/HoldToConfirm').HOLD_MS

/** Finger down for `ms` (the whole hold by default), then up: a release before the hold ends is a tap. */
const holdPress = async (node, ms = holdMs()) => {
  jest.useFakeTimers()
  try {
    fireEvent(node, 'pressIn')
    await act(async () => { jest.advanceTimersByTime(ms) })
    fireEvent(node, 'pressOut')
    fireEvent.press(node)
  } finally {
    jest.useRealTimers()
  }
}

/** A tap that does not stay: down, up at once. */
const tapPress = (node) => {
  fireEvent(node, 'pressIn')
  fireEvent(node, 'pressOut')
  fireEvent.press(node)
}

module.exports = { holdPress, tapPress, holdMs }
