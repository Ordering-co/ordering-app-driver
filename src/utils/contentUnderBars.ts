import { NativeModules, Platform } from 'react-native'

/**
 * Asks Android to let the content of the screen shown go under the status bar and the navigation
 * bar, or (`false`) to keep it clear of them again as every other screen has it. The activity pads
 * its content by the bars' height (MainActivity), so a screen that is a photo from edge to edge
 * (the welcome screen) cannot reach the screen's edges without it; the screen that asks keeps its
 * own content inside the safe area (`useSafeAreaInsets`, which reports the bars while the padding
 * is off) and puts the request back when it leaves. iOS draws edge to edge already, and a binary
 * without the native method does nothing.
 */
export const setContentUnderBars = (underBars: boolean) => {
  if (Platform.OS !== 'android') return
  NativeModules.WindowBackground?.setContentUnderBars?.(underBars)
}
