import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'

/**
 * How many messages the driver has not read, for the Messages tab.
 *
 * The app has no call for a total: each order of the Messages list carries its own `unread_count`
 * and the list (the `Contacts` controller) keeps it fresh from the socket's `message` event. So the
 * total is derived from what that list has loaded and is reported here by the list itself; the tab
 * bar, which lives outside the Messages screen, reads it. The tab bar builds that screen at launch
 * (the one tab that is not lazy), so the list loads, and follows the socket, whichever tab is shown.
 * Until the list has loaded once there is nothing to show (`null`): the tab draws no number it cannot know. `more` says the list has pages
 * it has not loaded, so the total is a lower bound and is written with a "+".
 *
 * Without a provider (a component on its own, a test) a report goes nowhere and nothing is known.
 */
export type UnreadMessages = { total: number, more: boolean }

type Report = (unread: UnreadMessages | null) => void

const UnreadContext = createContext<UnreadMessages | null>(null)
const ReportContext = createContext<Report>(() => {})

export const UnreadMessagesProvider = ({ children }: { children: React.ReactNode }) => {
  const [unread, setUnread] = useState<UnreadMessages | null>(null)
  const report = useCallback<Report>((next) => {
    setUnread((previous) => (previous?.total === next?.total && previous?.more === next?.more ? previous : next))
  }, [])
  return (
    <ReportContext.Provider value={report}>
      <UnreadContext.Provider value={unread}>{children}</UnreadContext.Provider>
    </ReportContext.Provider>
  )
}

/** The unread messages the Messages list knows of; `null` while it knows nothing. */
export const useUnreadMessages = (): UnreadMessages | null => useContext(UnreadContext)

/** What the Messages list counts: the unread messages of the orders it has loaded. */
export const unreadTotal = (orders: Array<{ unread_count?: number | string | null }> | null | undefined): number =>
  (orders ?? []).reduce((total, order) => total + (Number(order?.unread_count) > 0 ? Number(order?.unread_count) : 0), 0)

/** Reports the list's count while it is mounted and takes it back when it leaves. */
export const useReportUnreadMessages = (unread: UnreadMessages | null) => {
  const report = useContext(ReportContext)
  const total = unread?.total
  const more = unread?.more
  useEffect(() => {
    report(total === undefined ? null : { total, more: !!more })
  }, [report, total, more])
  useEffect(() => () => report(null), [report])
}

/**
 * The count as the tab bar and a row of the list write it for a screen reader ("2 unread messages"), with
 * a "+" when the list has more pages than it has loaded. One text per count, each with its own key.
 */
export const unreadMessagesText = (t: (key: string, fallback: string) => string, total: number, more = false): string => {
  const text = total === 1 && !more
    ? t('UNREAD_MESSAGES_COUNT_ONE', ':count: unread message')
    : t('UNREAD_MESSAGES_COUNT', ':count: unread messages')
  return text.replace(':count:', `${total}${more ? '+' : ''}`)
}
