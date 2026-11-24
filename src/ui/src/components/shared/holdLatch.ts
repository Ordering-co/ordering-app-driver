import { useRef, useSyncExternalStore } from 'react'

/**
 * Whether a finger is down on a held button whose hold has completed (`HoldToConfirm`), and what waits for it to lift.
 *
 * A held button fires at 0.6 s with the finger still on it, and what it fires (the order's new status, the request
 * leaving the list, the screen going back) can take the pressed element off the screen while the finger is down.
 * The native side then has no view to deliver that touch's end to, so React Native's responder system never hears
 * it end: it keeps the removed button as the responder and ignores the next touch that starts (anywhere on the
 * screen) until a second one clears it. So the pressed element must stay where it is until the finger lifts: what
 * would remove it waits here (`useSettledWhileHeld`, `afterRelease`) and is applied at the release.
 */

/** A finger that never lifts as far as the app can tell (a missed touch end) must not freeze a screen for good. */
const MAX_HELD_MS = 15000

const fingers = new Set<object>()
let safety: ReturnType<typeof setTimeout> | undefined
const listeners = new Set<() => void>()
let waiting: Array<() => void> = []

const emit = () => listeners.forEach((listener) => listener())

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

const isHeld = () => fingers.size > 0

/** Runs what waited for the finger, once it is up. */
const flush = () => {
  const todo = waiting
  waiting = []
  // One that throws does not take the others with it: each ran (a screen going back, a list losing a request), then the
  // first error goes on to whoever lifted the finger.
  let failure: { error: unknown } | undefined
  todo.forEach((run) => {
    try { run() } catch (error) { failure ??= { error } }
  })
  if (failure) throw failure.error
}

/** A finger went down on a held button whose hold has completed. Returns the one call that lifts it (safe to call twice). */
export const holdFinger = () => {
  const finger = {}
  fingers.add(finger)
  clearTimeout(safety)
  safety = setTimeout(() => { fingers.clear(); emit(); flush() }, MAX_HELD_MS)
  if (fingers.size === 1) emit()
  return () => {
    if (!fingers.delete(finger) || fingers.size > 0) return
    clearTimeout(safety)
    safety = undefined
    emit()
    flush()
  }
}

/**
 * `value` as of the last render with no held finger down: while one is, the screen keeps showing what it showed
 * (the pressed button stays mounted), and the latest value is applied the moment the finger lifts.
 */
export const useSettledWhileHeld = <T>(value: T): T => {
  const down = useSyncExternalStore(subscribe, isHeld, isHeld)
  const settled = useRef(value)
  if (!down) settled.current = value
  return settled.current
}

/** Runs `run` now, or when the finger lifts if one is down on a completed hold (a screen going back, so the pressed button is not pulled out from under it). */
export const afterRelease = (run: () => void) => {
  if (isHeld()) waiting.push(run)
  else run()
}

/** For tests: nothing held, nothing waiting. */
export const resetHoldLatch = () => {
  fingers.clear()
  waiting = []
  clearTimeout(safety)
  safety = undefined
  emit()
}
