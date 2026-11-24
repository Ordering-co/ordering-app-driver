import React from 'react'
import { KeyboardAvoidingView, KeyboardAvoidingViewProps, Platform, StyleSheet, View } from 'react-native'
import { useWindowTop } from '@/hooks/useWindowTop'
import { useKeyboardFloating } from '@/hooks/useKeyboardVisible'

/**
 * The keyboard-avoiding view of every screen that has a field and an action to keep in sight: the one rule
 * of how a screen rides above the keyboard, so a new screen gets it by using this instead of
 * `KeyboardAvoidingView`.
 *
 * On Android the keyboard's position is in the window's coordinates, and the activity pads the screens of the
 * app by the system bars (MainActivity), so a `KeyboardAvoidingView` that measures its frame against its parent
 * falls short of the keyboard by the screen's distance from the window's top, one bar inset: the pinned bar went
 * that much under the keyboard. The view that wraps it here is measured in the window (`useWindowTop`) and the
 * distance is given as `keyboardVerticalOffset`, so the same view is right in the padded screens of the stack and
 * in a modal, a window of its own that starts at the screen's top (offset 0).
 *
 * iOS draws from the window's top and the avoiding view's own `frame.y` already counts the safe area above it:
 * there nothing is measured and nothing wraps it, the view is exactly `KeyboardAvoidingView` (a wrapper would hide
 * the top inset from its `frame.y`). On Android the wrapper is the one that fills the screen's room (`flex: 1`);
 * `style` is the avoiding view's own (its canvas and its own `flex: 1`), and its `frame.y` is 0 inside it.
 *
 * A keyboard that takes no room (Android's floating Gboard: end height 0, or a frame that does not reach the display's
 * bottom) lifts nothing: the avoiding view is turned off while it is up, so the screen keeps its resting place (it
 * measured the floating keyboard's frame against its own bottom and lifted the pinned bar by the navigation area, or
 * flickered between the two). A docked keyboard leaves the view as it has always been. What "docked" means is
 * `keyboardTakesRoom` (useKeyboardVisible.ts), and it must allow for the system bar the frame stops above: React
 * Native's `height` leaves the bars out, so a docked frame ends 24 dp (gestures), 48 dp (three buttons) or 56 dp
 * (taskbar) above the display's bottom. The limit was once 48 dp, the three-button bar itself, and rounding decided
 * whether a keyboard without its suggestion strip, or the numbers pad, was floating: the avoiding view went off and the
 * pinned bar stayed under the keyboard. On Android 15+ the window never resizes for the keyboard (only its insets
 * change), so this view is the only thing that lifts the screen.
 */
interface Props extends KeyboardAvoidingViewProps {
  /** The test id of the view that is measured on Android (the avoiding view's parent). */
  windowTestID?: string
}

export const KeyboardScreen = ({ windowTestID, children, ...avoiding }: Props) => {
  const { ref, onLayout, top } = useWindowTop()
  const floating = useKeyboardFloating()
  const view = (
    <KeyboardAvoidingView {...avoiding} enabled={(avoiding.enabled ?? true) && !floating} keyboardVerticalOffset={top}>
      {children}
    </KeyboardAvoidingView>
  )
  if (Platform.OS !== 'android') return view
  return (
    <View ref={ref} onLayout={onLayout} style={styles.fill} testID={windowTestID} collapsable={false}>
      {view}
    </View>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
})

export default KeyboardScreen
