import React from 'react'
import { Text } from 'react-native'
import { render } from '@testing-library/react-native'

import {
  UnreadMessagesProvider,
  unreadMessagesText,
  unreadTotal,
  useReportUnreadMessages,
  useUnreadMessages,
  type UnreadMessages
} from '../UnreadMessagesContext'

const Probe = () => <Text testID='unread'>{JSON.stringify(useUnreadMessages())}</Text>
const Reporter = ({ unread }: { unread: UnreadMessages | null }) => {
  useReportUnreadMessages(unread)
  return null
}
const known = (view: any) => JSON.parse(view.getByTestId('unread').props.children)

describe('UnreadMessagesContext', () => {
  it('knows nothing until a list reports, and again when it leaves', () => {
    const view = render(<UnreadMessagesProvider><Probe /><Reporter unread={{ total: 3, more: false }} /></UnreadMessagesProvider>)
    expect(known(view)).toEqual({ total: 3, more: false })
    view.rerender(<UnreadMessagesProvider><Probe /></UnreadMessagesProvider>)
    expect(known(view)).toBeNull()
  })

  it('follows what the list reports', () => {
    const view = render(<UnreadMessagesProvider><Probe /><Reporter unread={{ total: 3, more: true }} /></UnreadMessagesProvider>)
    view.rerender(<UnreadMessagesProvider><Probe /><Reporter unread={{ total: 0, more: false }} /></UnreadMessagesProvider>)
    expect(known(view)).toEqual({ total: 0, more: false })
  })

  it('lets a list report without a provider (nothing listens)', () => {
    expect(() => render(<Reporter unread={{ total: 1, more: false }} />)).not.toThrow()
  })

  describe('unreadTotal', () => {
    it('adds the unread messages of the orders', () => {
      expect(unreadTotal([{ unread_count: 2 }, { unread_count: '3' }, { unread_count: 0 }])).toBe(5)
    })

    it('counts nothing for an order that does not say, says a negative or a text', () => {
      expect(unreadTotal([{ unread_count: undefined }, { unread_count: null }, { unread_count: -4 }, { unread_count: 'many' }, {}])).toBe(0)
      expect(unreadTotal(undefined)).toBe(0)
    })
  })

  describe('unreadMessagesText', () => {
    const t = (_key: string, fallback?: string) => fallback ?? ''
    it('writes one in the singular and the rest in the plural, with a plus when more are unloaded', () => {
      expect(unreadMessagesText(t, 1)).toBe('1 unread message')
      expect(unreadMessagesText(t, 2)).toBe('2 unread messages')
      expect(unreadMessagesText(t, 1, true)).toBe('1+ unread messages')
    })
  })
})
