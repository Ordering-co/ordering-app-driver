import { Platform, View } from 'react-native'
import { act, fireEvent } from '@testing-library/react-native'

/**
 * Puts the test on Android with the app's window starting `windowTop` pixels under the screen's top (the activity's
 * padding by the status bar): the view a screen measures (`useWindowTop`) answers that. The renderer has no native
 * view, so `measureInWindow` is what stands in for it. Returns what restores the platform.
 */
export const onAndroid = (windowTop = 24) => {
  const original = Platform.OS
  Object.defineProperty(Platform, 'OS', { configurable: true, get: () => 'android' })
  const measureInWindow = jest.fn((callback) => callback(0, windowTop, 390, 800))
  View.prototype.measureInWindow = measureInWindow
  return {
    measureInWindow,
    restore: () => {
      delete View.prototype.measureInWindow
      Object.defineProperty(Platform, 'OS', { configurable: true, get: () => original })
    },
  }
}

/** The view a `KeyboardScreen` measures on Android: its avoiding view's parent. Lays it out, as the system would. */
export const layoutWindowOf = async (avoiding) => {
  let host = avoiding.parent
  while (host && typeof host.type !== 'string') host = host.parent
  await act(async () => {
    fireEvent(host, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 390, height: 800 } } })
  })
  return host
}
