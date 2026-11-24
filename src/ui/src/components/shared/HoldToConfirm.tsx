import React, { useCallback, useEffect, useRef, useState } from 'react'
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from 'react-native'
import { useTheme } from 'styled-components/native'
import { ToastType, useLanguage, useToast } from '@components'
import { themeMotion } from '@/theme/helpers'
import { useConfirm } from './confirmAction'
import { holdFinger } from './holdLatch'

/**
 * How long the finger stays on a held button before it fires (ms). A behaviour constant and not a
 * design value: a theme that turns its motion off (or a driver who asks the system to reduce it) must
 * not turn the hold into a tap, so it is not read from the theme's motion levels.
 */
export const HOLD_MS = 600

/** With reduced motion the fill does not slide: it grows by this many steps, so the state still shows. */
const REDUCED_STEPS = 4

/** How long the "Hold to confirm" hint stays on screen (ms). */
const HINT_MS = 2000

/** What `OButton` needs to draw the hold: the fill's progress and the two presses that drive it. */
export interface HoldLayer {
  holding: boolean
  /** 0 to 1: how much of the hold has gone by. */
  progress: Animated.Value
  /** The press's event: its touch's own timestamp starts the hold's clock (`touchTime`). */
  onPressIn: (event?: any) => void
  onPressOut: (event?: any) => void
  /**
   * A finger left the screen (or the system took the touch). It ends the touch only when no other finger is left on
   * the button: `slop` is the button's touch margin (its hit slop), `view` the pressable, to place the fingers left.
   */
  onTouchEnd: (event?: any, slop?: number) => void
  /** The pressable's view: where the fingers that are left are placed (`touchEnd`). */
  viewRef: React.RefObject<any>
}

/**
 * The moment of a touch event in the touch system's own clock (ms: `UITouch.timestamp` on iOS, `MotionEvent.eventTime` on
 * Android, both read when the finger moved and not when JavaScript got round to the event), or `undefined` when the event
 * has none (a screen reader's activation, a test's bare event). Only two of them are comparable: never against `Date.now()`.
 */
export const touchTime = (event: any): number | undefined => {
  const time = event?.nativeEvent?.timestamp
  return typeof time === 'number' && Number.isFinite(time) && time > 0 ? time : undefined
}

/** Whether any of the fingers still down is on the box (window coordinates, as `measureInWindow` gives it), its touch margin included. */
const fingerOnBox = (touches: any[], box: { x: number, y: number, width: number, height: number }, slop: number) =>
  touches.some((touch) =>
    touch.pageX >= box.x - slop && touch.pageX <= box.x + box.width + slop &&
    touch.pageY >= box.y - slop && touch.pageY <= box.y + box.height + slop)

/** Whether a screen reader (VoiceOver, TalkBack) is on: its activation is a tap, it cannot hold. */
export const useScreenReaderEnabled = () => {
  const [enabled, setEnabled] = useState(false)
  useEffect(() => {
    let alive = true
    // Off is where it starts: only a screen reader that is on changes anything.
    AccessibilityInfo.isScreenReaderEnabled().then((value) => { if (alive && value) setEnabled(true) }).catch(() => {})
    const subscription = AccessibilityInfo.addEventListener('screenReaderChanged', setEnabled)
    return () => { alive = false; subscription.remove() }
  }, [])
  return enabled
}

const fillStyles = StyleSheet.create({
  clip: { overflow: 'hidden' },
  grown: { height: '100%', overflow: 'hidden' },
  full: { height: '100%' },
})

/**
 * The hold's fill: the button's own pressed look (`states.pressed` of its color and appearance) wiping
 * in from the start as the hold goes by, with the button's content drawn again over it in the pressed
 * ink, so the label stays legible on both sides of the edge. It takes no touch and is hidden from the
 * screen reader: the real content is the one it reads.
 */
export const HoldFill = ({ progress, background, radius, children }: {
  progress: Animated.Value
  background: string
  radius: number
  children: React.ReactNode
}) => {
  const [width, setWidth] = useState(0)
  return (
    <View
      pointerEvents='none'
      accessibilityElementsHidden
      importantForAccessibility='no-hide-descendants'
      style={[StyleSheet.absoluteFill, fillStyles.clip, { borderRadius: radius }]}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      testID='hold-fill'
    >
      <Animated.View style={[fillStyles.grown, { backgroundColor: background, width: progress.interpolate({ inputRange: [0, 1], outputRange: [0, width] }) }]}>
        {/* The content keeps the button's width whatever part of the fill is showing. */}
        <View style={[fillStyles.full, { width }]}>{children}</View>
      </Animated.View>
    </View>
  )
}

/**
 * A button that fires after the finger has stayed on it (`hold` of `OButton`): for the irreversible
 * steps of the delivery that a tap in a pocket, on a mount or in the rain must not take. The button
 * shows the progress on itself (the fill), fires when it completes, and does nothing when released
 * early or when the finger leaves it.
 *
 * - A plain tap says what to do ("Hold to confirm", a toast: it takes no room in the screen and moves
 *   nothing) and fires nothing.
 * - With a screen reader on, the activation cannot hold: the button asks for a confirmation dialog
 *   instead (the action's name on the accept button) and fires only when it is accepted.
 * - With reduced motion the fill grows in steps instead of sliding.
 *
 * `Button` is the plain button it draws, so this module needs nothing from it.
 */
export const HoldToConfirm = ({ Button, ...props }: { Button: React.ComponentType<any>, [key: string]: any }) => {
  const { onClick, text, disabled, loading } = props
  const theme: any = useTheme()
  const [, t] = useLanguage()
  const [, { showToast }] = useToast()
  const confirm = useConfirm()
  const screenReader = useScreenReaderEnabled()
  const animated = themeMotion(theme, 'base').duration > 0

  const progress = useRef(new Animated.Value(0)).current
  const [holding, setHolding] = useState(false)
  const timers = useRef<{ done?: ReturnType<typeof setTimeout>, tick?: ReturnType<typeof setInterval>, settle?: ReturnType<typeof setTimeout> }>({})
  // The hold has fired and the finger is still down: the release that follows is not a tap.
  const completed = useRef(false)
  // When the finger went down, in the touch's own clock and in JavaScript's (the fallback): a release is judged by it as well as by the timer, see `release`.
  const startedAt = useRef<{ touch?: number, clock: number }>({ clock: 0 })
  const view = useRef<any>(null)
  const onClickRef = useRef(onClick)
  onClickRef.current = onClick

  const clear = useCallback(() => {
    clearTimeout(timers.current.done)
    clearInterval(timers.current.tick)
    timers.current = {}
    progress.stopAnimation()
    progress.setValue(0)
  }, [progress])

  const stop = useCallback(() => {
    clear()
    setHolding(false)
  }, [clear])

  // The finger of a completed hold, until it lifts (`holdLatch`): the screen keeps the pressed button where it is meanwhile.
  const lift = useRef<(() => void) | null>(null)
  // The latch's finger of this button, let go (idempotent: the latch counts it once).
  const letGo = useCallback(() => {
    lift.current?.()
    lift.current = null
  }, [])
  // A finger leaving ends the touch only if it was the last one on the button: a second finger that lands on it and lifts
  // first must not let the screen replace the button under the one still pressing it (the lost touch the latch is for).
  const liftFinger = useCallback((event?: any, slop = 0) => {
    const left = event?.nativeEvent?.touches
    const measure = view.current?.measureInWindow
    if (!Array.isArray(left) || left.length === 0 || typeof measure !== 'function') {
      letGo()
      return
    }
    // Fingers are still down on the screen: the touch goes on only if one of them is on this button.
    view.current.measureInWindow((x: number, y: number, width: number, height: number) => {
      if (!fingerOnBox(left, { x, y, width, height }, slop)) letGo()
    })
  }, [letGo])

  const complete = useCallback((fingerDown: boolean) => {
    completed.current = true
    stop()
    // The timer fires with the finger still on the button: what the action changes must not take the button away
    // from under it, or the touch's end is lost with it. Taken before the action runs, so nothing it causes beats it.
    // A finger of an earlier hold whose touch end never came (the latch let go of it on its own) is not this one: it is let
    // go and this hold takes its own, so the button of the next hold is held too.
    if (fingerDown) {
      letGo()
      lift.current = holdFinger()
    }
    onClickRef.current?.()
  }, [stop, letGo])

  const start = (event?: any) => {
    // A screen reader's activation is a tap (it asks in a dialog); a button that cannot be pressed takes no hold.
    if (screenReader || disabled || loading) return
    completed.current = false
    startedAt.current = { touch: touchTime(event), clock: Date.now() }
    clear()
    setHolding(true)
    if (animated) {
      Animated.timing(progress, { toValue: 1, duration: HOLD_MS, easing: Easing.linear, useNativeDriver: false }).start()
    } else {
      let step = 0
      timers.current.tick = setInterval(() => {
        step += 1
        progress.setValue(Math.min(step / REDUCED_STEPS, 1))
      }, HOLD_MS / REDUCED_STEPS)
    }
    timers.current.done = setTimeout(() => complete(true), HOLD_MS)
  }

  // The finger went up. The hold is judged by how long the touch lasted and not only by the timer: when the JS thread is busy
  // (a screen re-rendering under the press, the location, the map) the release can be handled before the timer that was due
  // 0.6 s after the press, and a finger that stayed the whole time would have its hold dropped. A hold that lasted is
  // completed here, once (`complete` clears the timer, so it cannot fire twice); any earlier release is the early one it
  // always was. The length is the two touch events' own timestamps: a short tap whose release JavaScript handles late is
  // still short. Only an event with no timestamp (a bare press) falls back to JavaScript's clock.
  const release = (event?: any) => {
    const active = timers.current.done !== undefined
    const down = startedAt.current.touch
    const up = touchTime(event)
    const lasted = down !== undefined && up !== undefined ? up - down : Date.now() - startedAt.current.clock
    if (active && lasted >= HOLD_MS) complete(false)
    else stop()
    // The press that goes with this release comes in the same breath; one that never does (the finger slid off after the
    // hold, the button went off) must not leave the next tap swallowed as the end of this hold.
    if (completed.current) {
      clearTimeout(timers.current.settle)
      timers.current.settle = setTimeout(() => { completed.current = false }, 0)
    }
  }

  const label = typeof text === 'string' ? text : undefined

  // Released: a release after the hold has fired is not a tap; any other is, and a tap does not fire.
  const tap = () => {
    if (completed.current) {
      completed.current = false
      letGo()
      return
    }
    if (screenReader) {
      confirm({
        title: label,
        message: t('CONFIRM_ACTION_QUESTION', 'Do you want to confirm this action?'),
        acceptText: label ?? t('ACCEPT', 'Accept'),
        onAccept: () => onClickRef.current?.()
      })
      return
    }
    showToast(ToastType.Info, t('HOLD_TO_CONFIRM', 'Hold to confirm'), HINT_MS)
  }

  // A hold in progress ends with the button: unmounted, or turned off while the finger is down.
  useEffect(() => { if (disabled || loading) stop() }, [disabled, loading, stop])
  useEffect(() => () => { clearTimeout(timers.current.settle); clear(); letGo() }, [clear, letGo])

  return <Button {...props} onClick={tap} holdLayer={{ holding, progress, onPressIn: start, onPressOut: release, onTouchEnd: liftFinger, viewRef: view }} />
}
