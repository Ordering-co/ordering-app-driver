import React from 'react'
import { Text } from 'react-native'
import { act, render } from '@testing-library/react-native'
import { EventEmitter } from 'events'

const mockEvents = new EventEmitter()
jest.mock('@components', () => ({ useEvent: () => [mockEvents] }))

import { useUnreadMessagesOfOrder } from '../useUnreadMessagesOfOrder'

const ME = 4
const Probe = ({ orderId, messages, loading }: { orderId: number, messages: any[], loading?: boolean }) => (
  <Text testID='count'>{useUnreadMessagesOfOrder(orderId, messages, ME, loading)}</Text>
)
const count = (view: any) => Number(view.getByTestId('count').props.children)
const messages = (ids: number[], author = 99) => ids.map((id) => ({ id, author_id: author, read: false }))

describe('useUnreadMessagesOfOrder (the details\' count follows the app\'s one read event)', () => {
  afterEach(() => mockEvents.removeAllListeners())

  it('counts the messages of the others that are not read', () => {
    const view = render(<Probe orderId={7} messages={[...messages([1, 2]), { id: 3, author_id: ME, read: false }, { id: 4, author_id: 99, read: true }]} />)
    expect(count(view)).toBe(2)
  })

  it('clears when the chat of this order is read (`order_message_read`), whatever opened or closed the chat', () => {
    const view = render(<Probe orderId={7} messages={messages([1, 2, 3, 4, 5])} />)
    expect(count(view)).toBe(5)
    act(() => { mockEvents.emit('order_message_read', 7) })
    expect(count(view)).toBe(0)
  })

  it('ignores the read of another order, in whichever form its id comes', () => {
    const view = render(<Probe orderId={7} messages={messages([1, 2])} />)
    act(() => { mockEvents.emit('order_message_read', 8) })
    expect(count(view)).toBe(2)
    act(() => { mockEvents.emit('order_message_read', '7') })
    expect(count(view)).toBe(0)
  })

  it('counts a message that arrives after the read, and clears it with the next read', () => {
    const view = render(<Probe orderId={7} messages={messages([1, 2])} />)
    act(() => { mockEvents.emit('order_message_read', 7) })
    view.rerender(<Probe orderId={7} messages={messages([1, 2, 3])} />)
    expect(count(view)).toBe(1)
    view.rerender(<Probe orderId={7} messages={messages([1, 2, 3, 4])} />)
    expect(count(view)).toBe(2)
    act(() => { mockEvents.emit('order_message_read', 7) })
    expect(count(view)).toBe(0)
  })

  it('reads the messages it has when the event comes, not the ones of the render that subscribed', () => {
    const view = render(<Probe orderId={7} messages={messages([1])} />)
    view.rerender(<Probe orderId={7} messages={messages([1, 2, 3])} />)
    act(() => { mockEvents.emit('order_message_read', 7) })
    expect(count(view)).toBe(0)
  })

  it('does not carry what was read of one order over to the next: message ids are global, a larger one of order A must not hide the messages of order B', () => {
    const view = render(<Probe orderId={7} messages={messages([900, 901])} />)
    act(() => { mockEvents.emit('order_message_read', 7) })
    expect(count(view)).toBe(0)
    // The details are reused for another order whose messages have smaller ids.
    view.rerender(<Probe orderId={8} messages={messages([10, 11, 12])} />)
    expect(count(view)).toBe(3)
    // Its own read clears its own.
    act(() => { mockEvents.emit('order_message_read', 8) })
    expect(count(view)).toBe(0)
  })

  it('a read that comes before the messages have loaded clears the ones that arrive with the load', () => {
    const view = render(<Probe orderId={7} messages={[]} loading />)
    act(() => { mockEvents.emit('order_message_read', 7) })
    view.rerender(<Probe orderId={7} messages={messages([1, 2, 3])} loading={false} />)
    expect(count(view)).toBe(0)
    // And one that arrives after counts again.
    view.rerender(<Probe orderId={7} messages={messages([1, 2, 3, 4])} loading={false} />)
    expect(count(view)).toBe(1)
  })

  it('a read before the load does not outlive the order it was for', () => {
    const view = render(<Probe orderId={7} messages={[]} loading />)
    act(() => { mockEvents.emit('order_message_read', 7) })
    view.rerender(<Probe orderId={8} messages={[]} loading />)
    view.rerender(<Probe orderId={8} messages={messages([5])} loading={false} />)
    expect(count(view)).toBe(1)
  })

  it('stops listening when it leaves', () => {
    const view = render(<Probe orderId={7} messages={messages([1])} />)
    expect(mockEvents.listenerCount('order_message_read')).toBe(1)
    view.unmount()
    expect(mockEvents.listenerCount('order_message_read')).toBe(0)
  })
})
