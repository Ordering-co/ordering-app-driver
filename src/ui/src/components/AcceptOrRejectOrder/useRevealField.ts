import { useCallback, useEffect, useRef } from 'react'
import { Keyboard, KeyboardEvent, LayoutChangeEvent } from 'react-native'

import { keyboardTakesRoom } from '@/hooks/useKeyboardVisible'

/**
 * Keeps a form's field in sight while it is typed in: the field's block is brought to the top of what the scroll
 * shows (or, when the block is taller than that, its end, where the typing is), above the pinned bar and the keyboard.
 *
 * The room the scroll shows is only known once the keyboard has finished showing (the screen's keyboard-avoiding
 * padding changes after the field takes focus, and a scroll cannot go further than its content allows until then), so
 * the scroll is made every time one of the things it depends on is final: the focus itself, the keyboard's own
 * show / frame events, the scroll's layout (its room), the content's size and the block's own layout (the field
 * growing as it is typed in). Each uses the last measures, laid out by the views themselves: no asynchronous
 * `measure` that could read a position taken before the keyboard's animation ends.
 */
export const useRevealField = (scrollRef: React.RefObject<any>, inputRef: React.RefObject<any>) => {
  const measures = useRef({ blockY: 0, blockHeight: 0, room: 0 })

  const reveal = useCallback(() => {
    const { blockY, blockHeight, room } = measures.current
    if (!room || !blockHeight || !inputRef.current?.isFocused?.()) return
    const y = blockHeight > room ? blockY + blockHeight - room : blockY
    scrollRef.current?.scrollTo({ x: 0, y: Math.max(0, y), animated: true })
  }, [scrollRef, inputRef])

  useEffect(() => {
    // `keyboardDidChangeFrame` is iOS's: the keyboard changing its height (the suggestions bar, another keyboard).
    // A keyboard that takes no room (a floating Gboard) covers nothing: its events do not move the scroll.
    const subscriptions = ['keyboardDidShow', 'keyboardDidChangeFrame'].map((event) =>
      Keyboard.addListener(event as any, (frame?: KeyboardEvent) => (!frame?.endCoordinates || keyboardTakesRoom(frame.endCoordinates)) && reveal()))
    return () => subscriptions.forEach((subscription) => subscription.remove())
  }, [reveal])

  return {
    /** For the field's block (its label and the field): its position in the scroll's content. */
    onBlockLayout: (event: LayoutChangeEvent) => {
      const { y, height } = event.nativeEvent.layout
      measures.current.blockY = y
      measures.current.blockHeight = height
      reveal()
    },
    /** For the scroll: the room it shows. */
    onScrollLayout: (event: LayoutChangeEvent) => {
      measures.current.room = event.nativeEvent.layout.height
      reveal()
    },
    /** For the scroll: its content grew or shrank (the typing, a message under the field). */
    onContentSizeChange: () => reveal(),
    /** For the field's focus. */
    onFocus: () => reveal(),
  }
}
