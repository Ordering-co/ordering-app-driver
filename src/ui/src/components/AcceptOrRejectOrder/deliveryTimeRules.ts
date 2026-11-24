/**
 * The rules of the delivery time the driver gives when accepting (the owner's choice of 2026-11-23, as the business app's
 * preparation time): one number of minutes, from five presets, a stepper or the keyboard. No server config gives presets or
 * limits: `delivered_in` is a free integer of minutes, so these are the app's own. `step` is the stepper's.
 */
export const DELIVERY_TIME = {
  presets: [10, 15, 20, 30, 45],
  step: 5,
  min: 5,
  max: 180,
  default: 20
} as const

/** A number of minutes inside the limits: a whole number from `min` to `max`. */
export const clampMinutes = (value: number): number => {
  const whole = Math.round(Number(value))
  if (!Number.isFinite(whole)) return DELIVERY_TIME.default
  return Math.min(DELIVERY_TIME.max, Math.max(DELIVERY_TIME.min, whole))
}

/** One step of the stepper, up (`1`) or down (`-1`), inside the limits. */
export const stepMinutes = (value: number, direction: 1 | -1): number =>
  clampMinutes(value + direction * DELIVERY_TIME.step)
