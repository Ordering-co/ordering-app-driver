import { useCallback, useEffect, useRef, useState } from 'react'

import { useEvent } from '@components'

/**
 * How many messages of an order the driver has not read, for the chat button of the order's details.
 *
 * The details load the order's messages once and follow the socket's `message` for new ones, but the chat is a screen
 * of its own with its own copy: reading it did not reach the details, and the button kept its count. The read is the
 * app's one event, `order_message_read` (the Messages list zeroes the order's row and the tab's badge with it), so the
 * count follows it too: what the details know of the order when it comes is read; a message that arrives later
 * counts again. The chat is read when it opens, so opening it from the details clears the count at once.
 */
export const useUnreadMessagesOfOrder = (
  orderId: number | string | undefined,
  messages: any[] | undefined,
  driverId: number | string | undefined,
  /**
   * The messages are still being loaded: a read that comes now (the chat opened at once from a push, the app catching up)
   * covers the ones that arrive with the load, not only the ones already here (none).
   */
  loading?: boolean
): number => {
  const [events] = useEvent()
  // What was read, of which order: message ids are global (the next order's may be smaller), so the mark is the order's own.
  const [read, setRead] = useState<{ orderId: number | string | undefined, upTo: number }>({ orderId, upTo: 0 })
  const readUpTo = Number(read.orderId) === Number(orderId) ? read.upTo : 0
  // The latest messages and loading state, for the event's handler to read when it comes.
  const latest = useRef(messages)
  latest.current = messages
  const stillLoading = useRef(loading)
  stillLoading.current = loading
  // A read that came before the messages had loaded.
  const unreadRead = useRef<number | string | null>(null)

  const markRead = useCallback(() => {
    const newest = Math.max(0, ...(latest.current ?? []).map((message: any) => Number(message?.id) || 0))
    setRead((previous) => ({
      orderId,
      upTo: Math.max(Number(previous.orderId) === Number(orderId) ? previous.upTo : 0, newest)
    }))
  }, [orderId])

  useEffect(() => {
    // A read of the order that was shown before is not this order's.
    unreadRead.current = null
    if (orderId === undefined || orderId === null) return
    const handleRead = (readOrderId: number | string) => {
      if (Number(readOrderId) !== Number(orderId)) return
      if (stillLoading.current) unreadRead.current = orderId
      else markRead()
    }
    events.on('order_message_read', handleRead)
    return () => events.off('order_message_read', handleRead)
  }, [events, orderId, markRead])

  useEffect(() => {
    if (loading || unreadRead.current === null) return
    unreadRead.current = null
    markRead()
  }, [loading, markRead, messages])

  return (messages ?? []).filter((message: any) =>
    message?.author_id !== driverId && !message?.read && !(Number(message?.id) <= readUpTo)
  ).length
}
