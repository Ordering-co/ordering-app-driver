import { useCallback, useRef, useState } from 'react'
import { LayoutChangeEvent, Platform } from 'react-native'

/**
 * How far below the top of the window a screen's root view starts. On Android the activity pads its content by
 * the system bars (MainActivity), so the app's views start under the status bar, while the keyboard's position
 * (`screenY`) is in the window's own coordinates. A `KeyboardAvoidingView` measures against its parent only
 * (`frame.y`): it takes the padded area's top for the window's and falls short of the keyboard by that much.
 * `keyboardVerticalOffset` is the documented way to give the difference: the view measured here is the one to put
 * around it (its own `frame.y` is then 0). iOS draws from the window's top: the offset is 0 there.
 *
 * Screens do not use it directly: `KeyboardScreen` (ui/shared) is the keyboard-avoiding view of every screen and
 * wraps this (a view with `ref` and `onLayout`, the avoiding view inside it with `keyboardVerticalOffset={top}`).
 */
export const useWindowTop = () => {
  // The native view's own methods (`measureInWindow`) are what is asked of it.
  const ref = useRef<any>(null)
  const [top, setTop] = useState(0)
  const onLayout = useCallback((_event?: LayoutChangeEvent) => {
    if (Platform.OS !== 'android') return
    ref.current?.measureInWindow?.((_x: number, y: number) => setTop(Math.max(0, Math.round(y))))
  }, [])
  return { ref, onLayout, top: Platform.OS === 'android' ? top : 0 }
}
